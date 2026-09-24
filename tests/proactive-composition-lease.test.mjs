import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ChannelDeliveryOutbox } from "../packages/syno-core/channel-delivery-outbox.mjs";
import { InspirationStore } from "../packages/syno-core/inspiration-store.mjs";
import { ProactiveOrchestrator } from "../apps/syno/syno/proactive-orchestrator.mjs";
import { SignalEngine } from "../apps/syno/syno/signal-engine.mjs";

// L0b（#17）tick 三段拆分 + 组合租约的新行为测试。语义回归门在 proactive-reliability/inspiration/
// provider-agent 三件套（零改动即绿）；这里只覆盖重构引入的新机制：
// 租约并发抑制、崩溃恢复、commit 双守卫、投递落定不被长生成阻塞、分段观测、attempts 跨重启持久。

const EVENT = (id) => ({
  id,
  kind: "ingest-pending",
  title: `处理收录候选：${id}`,
  priority: 75,
  ref: { status: "pending", updatedAt: "2026-09-04" },
});

async function makeLeaseProactive(t, {
  messages = [],
  eventsLog = [],
  agentRun,
  snapshot,
  sendImpl,
  compositionLeaseMs,
} = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-lease-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateFile = path.join(root, "proactive.json");
  const channels = {
    homeChannel: "weixin",
    async send(message, targets) {
      if (sendImpl) return sendImpl(message, targets);
      messages.push(message);
      return { weixin: { delivered: true } };
    },
  };
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const agentCalls = [];
  // wake 闸门：关闭时 tick 尾部的 wakeDelivery 变 no-op（用于人为制造 pending 包）
  const wakeHolder = { enabled: true };
  let proactive;
  proactive = new ProactiveOrchestrator({
    host: {
      async receive(request) {
        agentCalls.push(request);
        if (agentRun) return agentRun(request);
        return { job: { id: "agent", status: "completed", result: { text: "建议：做点正事" } } };
      },
    },
    today: { async snapshot() { return snapshot ? snapshot() : { priorities: [], allocation: { digest: 1, ingest: 1, maintenance: 1 } }; } },
    channels,
    signalSources: { async collect() { return []; } },
    channelDeliveryOutbox: outbox,
    recordEvent: async (name, data) => eventsLog.push({ name, data }),
    wakeDelivery: () => (wakeHolder.enabled
      ? outbox.deliverDue(
        async (payload, event) => (await channels.send(payload, [event.targetChannel]))[event.targetChannel],
        { onDelivered: (event) => proactive.markBundleDelivered(event.sourceId, event.eventId) },
      )
      : Promise.resolve()),
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile,
    quietHours: { start: "23:00", end: "07:00" },
    ...(compositionLeaseMs ? { compositionLeaseMs } : {}),
  });
  return { proactive, outbox, stateFile, agentCalls, eventsLog, wakeHolder, root };
}

test("L0b lease: a concurrent tick during compose does not generate a second bundle", async (t) => {
  const messages = [];
  let releaseCompose;
  const composeGate = new Promise((resolve) => { releaseCompose = resolve; });
  let markEntered;
  const entered = new Promise((resolve) => { markEntered = resolve; });
  const { proactive, stateFile, agentCalls } = await makeLeaseProactive(t, {
    messages,
    agentRun: async () => {
      markEntered();
      await composeGate;
      return { job: { id: "agent", status: "completed", result: { text: "建议文本" } } };
    },
  });
  const now = new Date("2026-09-04T10:00:00+08:00");
  const tickA = proactive.tick({ now, highValueEvents: [EVENT("artifact-lease")] });
  await entered; // A 已进入 compose（锁外），租约已在盘上
  const tickBResult = await proactive.tick({ now, highValueEvents: [EVENT("artifact-lease")] });
  assert.deepEqual(tickBResult, [], "B 的 decide 看到活租约 → 不重复生成");
  releaseCompose();
  const tickAResult = await tickA;
  assert.equal(tickAResult.length, 1);
  assert.equal(agentCalls.length, 1, "全程只有一次模型生成");
  assert.equal(messages.length, 1, "只投递一份");
  const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.deepEqual(state.pendingCompositions, {}, "commit 后租约已释放");
});

test("L0b lease: a tick that dies mid-compose leaves a lease; after expiry the next tick regenerates and enqueues exactly once", async (t) => {
  const messages = [];
  const eventsLog = [];
  let failSnapshot = true;
  const { proactive, stateFile, agentCalls } = await makeLeaseProactive(t, {
    messages,
    eventsLog,
    compositionLeaseMs: 60_000,
    snapshot: () => {
      if (failSnapshot) throw new Error("snapshot boom");
      return { priorities: [] };
    },
  });
  const t0 = new Date("2026-09-04T10:00:00+08:00");
  await assert.rejects(proactive.tick({ now: t0, highValueEvents: [EVENT("artifact-crash")] }), /snapshot boom/);
  let state = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.equal(Object.keys(state.pendingCompositions).length, 1, "崩溃遗留租约在盘上");
  assert.equal(messages.length, 0);
  // 租约期内重拍：租约活着，信号被压住，不重复生成
  const withinLease = await proactive.tick({ now: new Date(t0.getTime() + 30_000), highValueEvents: [EVENT("artifact-crash")] });
  assert.deepEqual(withinLease, []);
  assert.equal(agentCalls.length, 0);
  // 过了租约期：decide 清扫 → 重新生成 → enqueue 恰好一次
  failSnapshot = false;
  const recovered = await proactive.tick({ now: new Date(t0.getTime() + 61_000), highValueEvents: [EVENT("artifact-crash")] });
  assert.equal(recovered.length, 1);
  assert.equal(agentCalls.length, 1, "恢复后只重新生成一次");
  assert.equal(messages.length, 1, "恢复后只投递一份");
  assert.equal(eventsLog.filter((entry) => entry.name === "proactive.tick.composition_lease_expired").length, 1);
  state = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.deepEqual(state.pendingCompositions, {});
  // 已落定，再拍不重复
  const after = await proactive.tick({ now: new Date(t0.getTime() + 62_000), highValueEvents: [EVENT("artifact-crash")] });
  assert.deepEqual(after, []);
  assert.equal(messages.length, 1);
});

test("L0b commit guard: lease_lost — lease removed mid-compose discards the composed bundle", async (t) => {
  const messages = [];
  const eventsLog = [];
  let stateFileRef = null;
  const { proactive, stateFile } = await makeLeaseProactive(t, {
    messages,
    eventsLog,
    agentRun: async () => {
      // compose 进行中：外部力量（过期清扫/人工干预）把租约从状态文件抹掉
      const state = JSON.parse(await fs.readFile(stateFileRef, "utf8"));
      state.pendingCompositions = {};
      await fs.writeFile(stateFileRef, `${JSON.stringify(state, null, 2)}\n`);
      return { job: { id: "agent", status: "completed", result: { text: "被丢弃的生成" } } };
    },
  });
  stateFileRef = stateFile;
  const result = await proactive.tick({ now: new Date("2026-09-04T10:00:00+08:00"), highValueEvents: [EVENT("artifact-lost")] });
  assert.deepEqual(result, [], "租约丢失 → 生成物被丢弃，不投递");
  assert.equal(messages.length, 0);
  const aborted = eventsLog.filter((entry) => entry.name === "proactive.tick.commit_aborted");
  assert.equal(aborted.length, 1);
  assert.equal(aborted[0].data.reason, "lease_lost");
});

test("L0b commit guard: signals_settled — all signals settled during compose discards the bundle", async (t) => {
  const messages = [];
  const eventsLog = [];
  let stateFileRef = null;
  const { proactive, stateFile } = await makeLeaseProactive(t, {
    messages,
    eventsLog,
    agentRun: async () => {
      // compose↔commit 间隙：同一批信号经另一路径（如崩溃遗留包对账回补投递）落定
      const state = JSON.parse(await fs.readFile(stateFileRef, "utf8"));
      const lease = Object.values(state.pendingCompositions)[0];
      assert.ok(lease, "compose 期间租约应在盘上");
      for (const identity of lease.signalVersions) {
        state.subjects[identity.subjectKey] = {
          ...(state.subjects[identity.subjectKey] || {}),
          subjectKey: identity.subjectKey,
          episode: identity.episode,
          lastDeliveredVersion: identity.businessVersion,
          lastDeliveredEpisode: identity.episode,
        };
      }
      await fs.writeFile(stateFileRef, `${JSON.stringify(state, null, 2)}\n`);
      return { job: { id: "agent", status: "completed", result: { text: "被放弃的生成" } } };
    },
  });
  stateFileRef = stateFile;
  const result = await proactive.tick({ now: new Date("2026-09-04T10:00:00+08:00"), highValueEvents: [EVENT("artifact-settled")] });
  assert.deepEqual(result, [], "全部信号已落定 → 整包放弃防重发");
  assert.equal(messages.length, 0);
  const aborted = eventsLog.filter((entry) => entry.name === "proactive.tick.commit_aborted");
  assert.equal(aborted.length, 1);
  assert.equal(aborted[0].data.reason, "signals_settled");
});

test("L0b: markBundleDelivered settles a pending bundle while a long compose is still running", async (t) => {
  const messages = [];
  let releaseCompose;
  const composeGate = new Promise((resolve) => { releaseCompose = resolve; });
  let markEntered;
  const entered = new Promise((resolve) => { markEntered = resolve; });
  let agentCallCount = 0;
  const { proactive, stateFile, wakeHolder } = await makeLeaseProactive(t, {
    messages,
    agentRun: async () => {
      agentCallCount += 1;
      if (agentCallCount === 2) {
        // 只闸第二次生成（tick 2 的 compose）；tick 1 的生成直接放行
        markEntered();
        await composeGate;
      }
      return { job: { id: "agent", status: "completed", result: { text: "长生成" } } };
    },
  });
  const t0 = new Date("2026-09-04T10:00:00+08:00");
  // tick 1：wake 关闸 → 包 1 enqueue 后滞留 pending（不投递）
  wakeHolder.enabled = false;
  await proactive.tick({ now: t0, highValueEvents: [EVENT("artifact-blocked-1")] });
  let state = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.equal(Object.keys(state.pendingBundles).length, 1, "包 1 滞留 pending");
  assert.equal(messages.length, 0);
  // tick 2：新事件 → compose 长生成抱门（锁外）
  wakeHolder.enabled = true;
  const tick2 = proactive.tick({ now: new Date(t0.getTime() + 1000), highValueEvents: [EVENT("artifact-blocked-2")] });
  await entered;
  // compose 仍阻塞期间 drain：markBundleDelivered 必须能拿到锁并落定包 1
  const drained = await Promise.race([
    proactive.wakeDelivery().then(() => "drained"),
    new Promise((resolve) => setTimeout(() => resolve("timeout"), 5_000)),
  ]);
  assert.equal(drained, "drained", "投递落定不被长生成阻塞（锁外 compose）");
  state = JSON.parse(await fs.readFile(stateFile, "utf8"));
  const settled = Object.values(state.subjects).filter((subject) => subject.lastDeliveredEventId);
  assert.equal(settled.length, 1, "包 1 的信号在 compose 阻塞期间已落定");
  assert.equal(messages.length, 1);
  releaseCompose();
  await tick2;
  assert.equal(messages.length, 2, "包 2 随后正常投递");
  state = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.deepEqual(state.pendingBundles, {});
});

test("L0b observation: a productive tick records segmented timings", async (t) => {
  const eventsLog = [];
  const { proactive } = await makeLeaseProactive(t, { eventsLog });
  const delivered = await proactive.tick({ now: new Date("2026-09-04T10:00:00+08:00"), highValueEvents: [EVENT("artifact-obs")] });
  assert.equal(delivered.length, 1);
  const completed = eventsLog.find((entry) => entry.name === "proactive.tick.completed");
  assert.ok(completed, "有产出的 tick 必须记 tick.completed");
  assert.equal(completed.data.outcome, "enqueued");
  assert.equal(completed.data.deliveredCount, 1);
  for (const field of ["durationMs", "lockWaitMs", "decideMs", "composeMs", "commitMs"]) {
    assert.equal(typeof completed.data[field], "number", `${field} 应为数字`);
    assert.ok(completed.data[field] >= 0, `${field} 非负`);
  }
});

// 灵感 attempts 跨重启持久：实例 A 失败一次（commit 记 attempts=1），实例 B 同 stateFile 接力计到 2。
async function makeInspirationLease(t, { stateFile, root, agentRun }) {
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, `outbox-${Math.random().toString(36).slice(2, 8)}`),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, `outbox-${Math.random().toString(36).slice(2, 8)}.lock`),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const agentCalls = [];
  let proactive;
  proactive = new ProactiveOrchestrator({
    host: { async receive() { throw new Error("灵感生成不应落回 host.receive"); } },
    today: { async snapshot() { return { priorities: [] }; } },
    channels: { homeChannel: "weixin", async send() { return { weixin: { delivered: true } }; } },
    signalSources: { async collect() { return []; } },
    cognitiveRuntime: {
      async run(request) { agentCalls.push(request); return agentRun(request); },
      async appendSystemEvent() {},
    },
    channelDeliveryOutbox: outbox,
    inspirationStore: new InspirationStore({ opsRoot: path.join(root, "ops") }),
    inspirationSampler: {
      async sample() {
        return {
          notes: [
            { path: "vault/02-Resources/a.md", title: "笔记甲", tags: ["agent"], excerpt: "甲的摘要" },
            { path: "vault/02-Resources/b.md", title: "笔记乙", tags: [], excerpt: "乙的摘要" },
          ],
        };
      },
    },
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, inspirationHour: 16, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile,
    quietHours: { start: "23:00", end: "07:00" },
  });
  return { proactive, agentCalls };
}

test("L0b: inspiration attempts accumulate across orchestrator restarts", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-lease-insp-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateFile = path.join(root, "proactive.json");
  const instanceA = await makeInspirationLease(t, { stateFile, root, agentRun: () => ({ text: "   " }) });
  await instanceA.proactive.tick({ now: new Date("2026-09-04T16:30:00+08:00") });
  assert.equal(instanceA.agentCalls.length, 1);
  let state = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.equal(state.inspiration.attempts, 1, "空文本生成在 commit 记 attempts=1");
  // 重启（新实例，同 stateFile）：attempts 不归零，接力到 2
  const instanceB = await makeInspirationLease(t, { stateFile, root, agentRun: () => ({ text: "" }) });
  await instanceB.proactive.tick({ now: new Date("2026-09-04T16:35:00+08:00") });
  assert.equal(instanceB.agentCalls.length, 1);
  state = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.equal(state.inspiration.attempts, 2, "attempts 跨重启累计");
});
