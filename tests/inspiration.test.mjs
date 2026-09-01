import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ChannelDeliveryOutbox } from "../apps/syno/syno/channel-delivery-outbox.mjs";
import { ChannelConversationHandler } from "../apps/syno/syno/channel-conversation-handler.mjs";
import { InspirationSampler } from "../apps/syno/syno/inspiration-sampler.mjs";
import { InspirationStore } from "../apps/syno/syno/inspiration-store.mjs";
import { ProactiveOrchestrator } from "../apps/syno/syno/proactive-orchestrator.mjs";
import { SignalEngine } from "../apps/syno/syno/signal-engine.mjs";

async function tempRoot(t, prefix) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

function fakeKnowledge(notes) {
  return { async list({ searchable } = {}) { return notes.filter((note) => searchable === undefined || note.searchable === searchable); } };
}

function note(pathSuffix, date, extra = {}) {
  return { path: `vault/02-Resources/${pathSuffix}.md`, title: pathSuffix, excerpt: `${pathSuffix} 摘要`, tags: [], date, searchable: true, sensitive: false, ...extra };
}

// ---------- InspirationStore ----------

test("InspirationStore round-trips a generated card through the contract and rejects invalid records", async (t) => {
  const root = await tempRoot(t, "syno-inspiration-store-");
  const store = new InspirationStore({ opsRoot: root });
  const record = await store.create({ date: "2026-09-01", sampledRefs: ["vault/a.md", "vault/b.md"], text: "A 与 B 其实讲的是同一件事", attempts: 2 });
  assert.match(record.id, /^inspiration-20260901-[a-f0-9]{8}$/);
  assert.equal(record.status, "generated");
  const listed = await store.list();
  assert.equal(listed.length, 1);
  assert.deepEqual(listed[0].sampledRefs, ["vault/a.md", "vault/b.md"]);
  assert.equal(listed[0].attempts, 2);
  await assert.rejects(
    store.create({ date: "2026-09-01", sampledRefs: ["vault/a.md"], text: "只有一篇" }),
    /sampledRefs/,
  );
  // 空正文违反契约 minLength；未知输入字段不入记录（仓层白名单构造）
  await assert.rejects(
    store.create({ date: "2026-09-01", sampledRefs: ["vault/a.md", "vault/b.md"], text: "" }),
    /text/,
  );
  const withExtra = await store.create({ date: "2026-09-01", sampledRefs: ["vault/c.md", "vault/d.md"], text: "正常卡", unexpected: true });
  assert.equal("unexpected" in withExtra, false);
});

test("InspirationStore feedback lifecycle: deliver first, feedback once, TTL gates the deterministic route", async (t) => {
  const root = await tempRoot(t, "syno-inspiration-feedback-");
  let now = new Date("2026-09-01T16:35:00.000Z");
  const store = new InspirationStore({ opsRoot: root, clock: () => now });
  const record = await store.create({ date: "2026-09-01", sampledRefs: ["vault/a.md", "vault/b.md"], text: "串联" });
  await assert.rejects(store.recordFeedback(record.id, "useful"), /尚未投递/);
  assert.equal(await store.latestAwaitingFeedback({ now }), null);

  await store.markDelivered(record.id, "event-1");
  const awaiting = await store.latestAwaitingFeedback({ now });
  assert.equal(awaiting.id, record.id);
  assert.equal(awaiting.deliveryEventId, "event-1");

  const updated = await store.recordFeedback(record.id, "not_useful");
  assert.equal(updated.status, "feedback");
  assert.equal(updated.feedback, "not_useful");
  assert.equal(await store.latestAwaitingFeedback({ now }), null);

  const second = await store.create({ date: "2026-09-02", sampledRefs: ["vault/c.md", "vault/d.md"], text: "另一张卡" });
  await store.markDelivered(second.id, "event-2");
  now = new Date("2026-09-04T16:36:00.000Z"); // 超出 24h TTL
  assert.equal(await store.latestAwaitingFeedback({ now }), null);
  await assert.rejects(store.recordFeedback(second.id, "meh"), /取值无效/);
});

test("InspirationStore recentSampledRefs only covers the 30-day sampling memory window", async (t) => {
  const root = await tempRoot(t, "syno-inspiration-memory-");
  let now = new Date("2026-09-01T08:00:00.000Z");
  const store = new InspirationStore({ opsRoot: root, clock: () => now });
  await store.create({ date: "2026-09-01", sampledRefs: ["vault/new.md", "vault/old.md"], text: "x" });
  now = new Date("2026-07-01T08:00:00.000Z");
  await store.create({ date: "2026-07-01", sampledRefs: ["vault/ancient.md", "vault/older.md"], text: "y" });
  now = new Date("2026-09-02T08:00:00.000Z");
  const refs = await store.recentSampledRefs({ now });
  assert.equal(refs.has("vault/new.md"), true);
  assert.equal(refs.has("vault/ancient.md"), false);
});

// ---------- InspirationSampler ----------

test("InspirationSampler mixes 2 recent captures with 2 long-unvisited notes and excludes sensitive ones", async (t) => {
  const root = await tempRoot(t, "syno-inspiration-sample-");
  const store = new InspirationStore({ opsRoot: root });
  const knowledge = fakeKnowledge([
    note("new-2", "2026-08-31"),
    note("new-1", "2026-09-01"),
    note("secret", "2026-08-30", { sensitive: true }),
    note("mid", "2026-06-15"),
    note("old-1", "2026-01-01"),
    note("old-2", "2026-02-01"),
  ]);
  const sampler = new InspirationSampler({ knowledge, inspirations: store, clock: () => new Date("2026-09-01T16:00:00.000Z") });
  const { notes } = await sampler.sample();
  assert.deepEqual(notes.map((item) => item.title), ["new-1", "new-2", "old-1", "old-2"]);
  assert.equal(notes.some((item) => item.sensitive), false);
});

test("InspirationSampler treats recently sampled notes as visited and reports insufficient material", async (t) => {
  const root = await tempRoot(t, "syno-inspiration-visited-");
  const store = new InspirationStore({ opsRoot: root, clock: () => new Date("2026-08-30T16:00:00.000Z") });
  await store.create({ date: "2026-08-30", sampledRefs: ["vault/02-Resources/old-1.md", "vault/02-Resources/old-2.md"], text: "昨天的梦" });
  const knowledge = fakeKnowledge([note("new-1", "2026-09-01"), note("old-1", "2026-01-01"), note("old-2", "2026-02-01")]);
  const sampler = new InspirationSampler({ knowledge, inspirations: store, clock: () => new Date("2026-09-01T16:00:00.000Z") });
  const { notes } = await sampler.sample();
  assert.deepEqual(notes.map((item) => item.title), ["new-1"]);

  const empty = await new InspirationSampler({ knowledge: fakeKnowledge([note("only", "2026-09-01")]), inspirations: store }).sample();
  assert.deepEqual(empty.notes, []);
});

// ---------- SignalEngine ----------

test("SignalEngine emits the daily inspiration signal after 16:00 and dedups per day", () => {
  const engine = new SignalEngine();
  const before = engine.collect({ now: new Date("2026-09-01T15:59:00+08:00"), lastRuns: {}, highValueEvents: [], notificationsToday: 0, maxDailyNotifications: 3 });
  assert.equal(before.some((signal) => signal.kind === "inspiration"), false);
  const at = engine.collect({ now: new Date("2026-09-01T16:00:00+08:00"), lastRuns: {}, highValueEvents: [], notificationsToday: 0, maxDailyNotifications: 3 });
  assert.deepEqual(at.filter((signal) => signal.kind === "inspiration").map((signal) => signal.key), ["inspiration:2026-09-01"]);
  const alreadyRan = engine.collect({ now: new Date("2026-09-01T17:00:00+08:00"), lastRuns: { "inspiration:2026-09-01": "2026-09-01" }, highValueEvents: [], notificationsToday: 1, maxDailyNotifications: 3 });
  assert.equal(alreadyRan.some((signal) => signal.kind === "inspiration"), false);
  const budgetSpent = engine.collect({ now: new Date("2026-09-01T16:00:00+08:00"), lastRuns: {}, highValueEvents: [], notificationsToday: 3, maxDailyNotifications: 3 });
  assert.equal(budgetSpent.length, 0);
});

// ---------- ProactiveOrchestrator × 灵感分支 ----------

async function makeInspirationProactive(t, { sample, agentRun, eventsLog = [] } = {}) {
  const root = await tempRoot(t, "syno-inspiration-orch-");
  const messages = [];
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
  const store = new InspirationStore({ opsRoot: path.join(root, "ops") });
  const agentCalls = [];
  let proactive;
  proactive = new ProactiveOrchestrator({
    host: { async receive() { throw new Error("灵感生成不应落回 host.receive"); } },
    today: { async snapshot() { return { priorities: [] }; } },
    channels,
    signalSources: { async collect() { return []; } },
    cognitiveRuntime: {
      async run(request) { agentCalls.push(request); return agentRun(request); },
      async appendSystemEvent() {},
    },
    channelDeliveryOutbox: outbox,
    recordEvent: async (name, data) => eventsLog.push({ name, data }),
    inspirationStore: store,
    inspirationSampler: { async sample() { return sample; } },
    wakeDelivery: () => outbox.deliverDue(
      async (payload) => { await channels.send(payload); return { delivered: true }; },
      { onDelivered: (event) => proactive.markBundleDelivered(event.sourceId, event.eventId) },
    ),
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, inspirationHour: 16, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile: path.join(root, "proactive.json"),
    quietHours: { start: "23:00", end: "07:00" },
  });
  return { proactive, store, messages, agentCalls, eventsLog };
}

const SAMPLE = {
  notes: [
    { path: "vault/02-Resources/a.md", title: "笔记甲", tags: ["agent"], excerpt: "甲的摘要" },
    { path: "vault/02-Resources/b.md", title: "笔记乙", tags: [], excerpt: "乙的摘要" },
  ],
};

test("orchestrator generates and delivers the daily inspiration card, then marks the record delivered", async (t) => {
  const { proactive, store, messages, agentCalls } = await makeInspirationProactive(t, {
    sample: SAMPLE,
    agentRun: async () => ({ text: "笔记甲与笔记乙合起来看，是一个被忽视的组合。" }),
  });
  const delivered = await proactive.tick({ now: new Date("2026-09-01T16:30:00+08:00") });
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].deliveryStatus, "pending"); // enqueue 时为 pending；wakeDelivery 同步 drain 后才落定
  assert.equal(agentCalls.length, 1);
  assert.match(agentCalls[0].text, /今日灵感/);
  assert.match(agentCalls[0].text, /笔记甲/);
  assert.equal(messages.length, 1);
  assert.match(messages[0].text, /Syno · 今日灵感/);
  assert.match(messages[0].text, /笔记甲与笔记乙/);
  assert.match(messages[0].text, /涉及笔记/);
  assert.match(messages[0].text, /回复「有用」或「没用」/);
  const cards = await store.list();
  assert.equal(cards.length, 1);
  assert.equal(cards[0].status, "delivered");
  assert.deepEqual(cards[0].sampledRefs, ["vault/02-Resources/a.md", "vault/02-Resources/b.md"]);
  // 当日不再重发
  assert.deepEqual(await proactive.tick({ now: new Date("2026-09-01T16:45:00+08:00") }), []);
  assert.equal(agentCalls.length, 1);
});

test("generation failure delivers no empty card, retries, and settles terminally at the daily cap", async (t) => {
  const eventsLog = [];
  const { proactive, store, messages, agentCalls } = await makeInspirationProactive(t, {
    sample: SAMPLE,
    agentRun: async () => { throw new Error("HARNESS_TURN_TIMEOUT"); },
    eventsLog,
  });
  const now = () => new Date("2026-09-01T16:30:00+08:00");
  for (let index = 0; index < 8; index += 1) await proactive.tick({ now: now() });
  assert.equal(agentCalls.length, 8);
  assert.equal(messages.length, 0);
  assert.equal((await store.list()).length, 0);
  assert.equal(eventsLog.filter((event) => event.name === "inspiration.generate.failed").length, 8);
  // 第 9 次 tick：到达当日上限，终态落定，不再调用模型
  await proactive.tick({ now: now() });
  assert.equal(agentCalls.length, 8);
  assert.equal(eventsLog.filter((event) => event.name === "inspiration.generate.failed_terminal").length, 1);
  // 次日重新 eligible
  await proactive.tick({ now: new Date("2026-09-02T16:30:00+08:00") });
  assert.equal(agentCalls.length, 9);
});

test("insufficient sampling material skips the day quietly with a terminal mark", async (t) => {
  const eventsLog = [];
  const { proactive, messages, agentCalls } = await makeInspirationProactive(t, {
    sample: { notes: [SAMPLE.notes[0]] },
    agentRun: async () => ({ text: "不应被调用" }),
    eventsLog,
  });
  const delivered = await proactive.tick({ now: new Date("2026-09-01T16:30:00+08:00") });
  assert.deepEqual(delivered, []);
  assert.equal(agentCalls.length, 0);
  assert.equal(messages.length, 0);
  assert.equal(eventsLog.filter((event) => event.name === "inspiration.sample.insufficient").length, 1);
  assert.deepEqual(await proactive.tick({ now: new Date("2026-09-01T16:50:00+08:00") }), []);
  assert.equal(eventsLog.filter((event) => event.name === "inspiration.sample.insufficient").length, 1);
});

test("a mixed evening bundle consumes inspiration as a plain line (D12 degradation); the card comes next day", async (t) => {
  const root = await tempRoot(t, "syno-inspiration-slot-");
  const messages = [];
  const channels = { homeChannel: "weixin", async send(message) { messages.push(message); return { weixin: { delivered: true } }; } };
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"), payloadRoot: path.join(root, "payloads"), lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value, unprotect: async (value) => value,
  });
  const store = new InspirationStore({ opsRoot: path.join(root, "ops") });
  let proactive;
  proactive = new ProactiveOrchestrator({
    host: { async receive() { return { job: { id: "agent", status: "waiting_provider" } }; } },
    today: { async snapshot() { return { priorities: [{ title: "写月报" }] }; } },
    channels,
    signalSources: { async collect() { return []; } },
    cognitiveRuntime: {
      async run(request) { return { text: /今日灵感/.test(request.text) ? "晚间以后的灵感正文。" : "晚间建议。" }; },
      async appendSystemEvent() {},
    },
    channelDeliveryOutbox: outbox,
    inspirationStore: store,
    inspirationSampler: { async sample() { return SAMPLE; } },
    recordEvent: async () => {},
    wakeDelivery: () => outbox.deliverDue(async (payload) => { await channels.send(payload); return { delivered: true }; }, { onDelivered: (event) => proactive.markBundleDelivered(event.sourceId, event.eventId) }),
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 21, inspirationHour: 16, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile: path.join(root, "proactive.json"),
    quietHours: { start: "23:00", end: "07:00" },
  });
  // 宿主白天停机、21:30 才醒来：evening 与 inspiration 同时 eligible，evening 在前赢得 slot
  const first = await proactive.tick({ now: new Date("2026-09-01T21:30:00+08:00") });
  assert.equal(first.length, 1);
  assert.match(messages[0].text, /Syno · 主动提醒|Syno · 行动摘要/);
  assert.match(messages[0].text, /今日灵感：并入本次摘要/); // 降级为普通行动行，不产空卡
  assert.equal((await store.list()).length, 0);
  // 当日灵感已被消费，后续 tick 不再出卡
  assert.deepEqual(await proactive.tick({ now: new Date("2026-09-01T21:40:00+08:00") }), []);
  assert.equal((await store.list()).length, 0);
  // 次日 16:00 后重新 eligible，正常出卡
  const nextDay = await proactive.tick({ now: new Date("2026-09-02T16:30:00+08:00") });
  assert.equal(nextDay.length, 1);
  assert.match(messages[1].text, /Syno · 今日灵感/);
  assert.equal((await store.list()).length, 1);
});

// ---------- 反馈确定性路由 ----------

test("handler records inspiration feedback deterministically and never hijacks ordinary chat", async (t) => {
  const root = await tempRoot(t, "syno-inspiration-route-");
  const store = new InspirationStore({ opsRoot: root });
  const card = await store.create({ date: "2026-09-01", sampledRefs: ["vault/a.md", "vault/b.md"], text: "串联" });
  await store.markDelivered(card.id, "event-1");
  const runs = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run(request) { runs.push(request); return { text: `reply:${request.text}` }; } },
    core: {},
    ingest: {},
    pendingDecisions: {},
    inspirationStore: store,
  });
  const feedbackReply = await handler.handle({ id: "wx-fb-1", ownerKey: "owner", senderId: "owner", channel: "weixin", text: "没用！" });
  assert.match(feedbackReply.text, /不对味/);
  assert.equal(runs.length, 0);
  const updated = (await store.list())[0];
  assert.equal(updated.status, "feedback");
  assert.equal(updated.feedback, "not_useful");

  // 反馈已回填后，同样的口令落入正常对话
  const normal = await handler.handle({ id: "wx-fb-2", ownerKey: "owner", senderId: "owner", channel: "weixin", text: "没用" });
  assert.equal(normal.text, "reply:没用");
  assert.equal(runs.length, 1);

  // 非口令文本从不触发反馈路由
  const chat = await handler.handle({ id: "wx-fb-3", ownerKey: "owner", senderId: "owner", channel: "weixin", text: "这篇文章有用吗" });
  assert.equal(chat.text, "reply:这篇文章有用吗");
  assert.equal((await store.list()).length, 1);
});
