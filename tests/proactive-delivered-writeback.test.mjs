import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ChannelDeliveryOutbox } from "../packages/syno-core/channel-delivery-outbox.mjs";
import { ProactiveOrchestrator } from "../apps/syno/syno/proactive-orchestrator.mjs";
import { PROACTIVE_RESPONSE_KIND } from "../packages/syno-core/proactive-reliability.mjs";
import { SignalEngine } from "../apps/syno/syno/signal-engine.mjs";

// L2（#17）投递成功后回写：compose 不再回写主会话，统一由 #writebackDeliveredBundle 在投递落定后
// 按 outbox 真实 payload 回写（主人所见即所得）。覆盖：恰一次且文本==payload、fallback 分支、
// 失败告警不耦合投递、test 卡不回写、对账回补路径、重调不双写。

const EVENT = (id) => ({
  id,
  kind: "ingest-pending",
  title: `处理收录候选：${id}`,
  priority: 75,
  ref: { status: "pending", updatedAt: "2026-09-04" },
});

async function makeWritebackProactive(t, {
  messages = [],
  eventsLog = [],
  appends = [],
  runResult,
  appendError,
} = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-writeback-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateFile = path.join(root, "proactive.json");
  const channels = {
    homeChannel: "weixin",
    async send(message) { messages.push(message); return { weixin: { delivered: true } }; },
  };
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const wakeHolder = { enabled: true };
  let proactive;
  proactive = new ProactiveOrchestrator({
    host: { async receive() { throw new Error("不应落回 host.receive"); } },
    today: { async snapshot() { return { priorities: [{ title: "复习 Tool Loop" }], allocation: { digest: 1, ingest: 1, maintenance: 1 } }; } },
    channels,
    signalSources: { async collect() { return []; } },
    cognitiveRuntime: {
      async run() { return runResult ?? { text: "模型建议文本" }; },
      async appendSystemEvent(event) {
        if (appendError) throw appendError;
        appends.push(event);
      },
    },
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
  });
  return { proactive, outbox, stateFile, wakeHolder };
}

test("L2: writeback fires exactly once after delivery and the text is the outbox payload", async (t) => {
  const messages = [];
  const appends = [];
  const { proactive, outbox, stateFile } = await makeWritebackProactive(t, { messages, appends });
  await proactive.tick({ now: new Date("2026-09-04T10:00:00+08:00"), highValueEvents: [EVENT("artifact-wb")] });
  assert.equal(messages.length, 1);
  assert.equal(appends.length, 1, "投递成功后回写恰好一次");
  assert.equal(appends[0].ownerKey, "local-user");
  assert.equal(appends[0].threadKey, "main");
  const [record] = await outbox.list({ limit: 1 });
  const stored = await outbox.get(record.eventId, { includePayload: true });
  assert.equal(appends[0].text, stored.payload.text, "回写文本 == 主人所见的投递 payload");
  assert.match(appends[0].text, /模型建议文本/);
  // claim 门：重复触发（projection 重试/重调 markBundleDelivered）不双写
  const again = await proactive.markBundleDelivered(record.sourceId, record.eventId);
  assert.equal(again, false, "已落定的包重复回调直接拒");
  assert.equal(appends.length, 1);
  const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.ok(state.deliveredWritebacks[record.sourceId]?.writebackAt, "台账落 writebackAt");
});

test("L2: local-fallback branch is written back too (payload has no model suffix)", async (t) => {
  const messages = [];
  const appends = [];
  const { proactive, outbox } = await makeWritebackProactive(t, { messages, appends, runResult: { text: "" } });
  const delivered = await proactive.tick({ now: new Date("2026-09-04T10:00:00+08:00"), highValueEvents: [EVENT("artifact-wb-fb")] });
  assert.equal(delivered[0].localFallback, true);
  assert.equal(appends.length, 1, "fallback 文案同样回写");
  const [record] = await outbox.list({ limit: 1 });
  const stored = await outbox.get(record.eventId, { includePayload: true });
  assert.equal(appends[0].text, stored.payload.text);
  assert.doesNotMatch(appends[0].text, /建议：/, "fallback 无模型建议后缀");
});

test("L2: writeback failure records a warning and does not affect delivery settlement", async (t) => {
  const messages = [];
  const eventsLog = [];
  const appends = [];
  const appendError = Object.assign(new Error("dsh down"), { code: "APPEND_DOWN" });
  const { proactive, outbox, stateFile } = await makeWritebackProactive(t, { messages, eventsLog, appends, appendError });
  await proactive.tick({ now: new Date("2026-09-04T10:00:00+08:00"), highValueEvents: [EVENT("artifact-wb-fail")] });
  assert.equal(messages.length, 1, "投递本身成功");
  assert.equal(appends.length, 0, "回写失败没有写入");
  const failed = eventsLog.filter((entry) => entry.name === "proactive.bundle.writeback_failed");
  assert.equal(failed.length, 1);
  assert.equal(failed[0].data.error.code, "APPEND_DOWN");
  const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
  const [record] = await outbox.list({ limit: 1 });
  // 投递落定不受影响：信号已 settled，台账留 lastErrorCode 抓手（吞错不重试）
  const settled = Object.values(state.subjects).filter((subject) => subject.lastDeliveredEventId);
  assert.equal(settled.length, 1);
  assert.equal(state.deliveredWritebacks[record.sourceId]?.lastErrorCode, "APPEND_DOWN");
  assert.equal(state.deliveredWritebacks[record.sourceId]?.writebackAt || null, null);
});

test("L2: signal==='test' cards are not written back but settle the ledger", async (t) => {
  const messages = [];
  const appends = [];
  const { proactive, outbox, stateFile } = await makeWritebackProactive(t, { messages, appends });
  // 模拟 triggerTest 卡：直接 enqueue 一条 signal=test 的包（走 reconcile 重建 pending）
  await outbox.enqueue({
    sourceType: "proactive_bundle",
    sourceId: "proactive-test-wb01",
    ownerKey: "local-user",
    targetChannel: "weixin",
    deliveryTargetRef: null,
    responseKind: PROACTIVE_RESPONSE_KIND,
    businessVersion: 1,
    payload: {
      title: "[Syno TEST wb01]",
      body: "受控测试卡",
      text: "[Syno TEST wb01]\n受控测试卡",
      data: { signal: "test", testRunId: "wb01" },
      signalVersions: [{ subjectKey: "proactive-test:wb01", businessVersion: "v1:test", episode: 1 }],
      signalKinds: [{ subjectKey: "proactive-test:wb01", kind: "event", key: "proactive-test:wb01" }],
    },
    deliveryKey: "proactive-test:wb01:weixin:v1",
  });
  // tick 一次让 reconcile 把 pending 重建出来（空信号，decide 走 idle）
  await proactive.tick({ now: new Date("2026-09-04T10:00:00+08:00"), highValueEvents: [] });
  await proactive.wakeDelivery();
  assert.equal(messages.length, 1, "测试卡照常投递");
  assert.equal(appends.length, 0, "signal=test 不回写主会话");
  const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.ok(state.deliveredWritebacks["proactive-test-wb01"]?.writebackAt, "台账照常落终态");
});

test("L2: reconcile-recovered delivery (crash between send and settle) is written back on the next tick", async (t) => {
  const messages = [];
  const appends = [];
  const { proactive, outbox, wakeHolder } = await makeWritebackProactive(t, { messages, appends });
  // tick 1：wake 关闸 → 包滞留 pending
  wakeHolder.enabled = false;
  await proactive.tick({ now: new Date("2026-09-04T10:00:00+08:00"), highValueEvents: [EVENT("artifact-wb-reconcile")] });
  assert.equal(messages.length, 0);
  // 崩溃模拟：outbox 直接投递成功，但 orchestrator 没收到 onDelivered（state 未落定）
  wakeHolder.enabled = true;
  await outbox.deliverDue(async (payload) => {
    messages.push(payload);
    return { delivered: true };
  });
  assert.equal(messages.length, 1);
  assert.equal(appends.length, 0);
  // tick 2：reconcile 发现已投递 → 落定 + 回写队列 → 锁外回写
  await proactive.tick({ now: new Date("2026-09-04T10:01:00+08:00"), highValueEvents: [EVENT("artifact-wb-reconcile")] });
  assert.equal(appends.length, 1, "对账回补的投递也要回写");
  const [record] = await outbox.list({ limit: 1 });
  const stored = await outbox.get(record.eventId, { includePayload: true });
  assert.equal(appends[0].text, stored.payload.text);
  assert.equal(messages.length, 1, "不重复投递");
});
