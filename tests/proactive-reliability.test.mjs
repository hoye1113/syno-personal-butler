import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { ProactiveOrchestrator } from "../apps/syno/syno/proactive-orchestrator.mjs";
import { SignalEngine } from "../apps/syno/syno/signal-engine.mjs";
import { ChannelDeliveryOutbox } from "../apps/syno/syno/channel-delivery-outbox.mjs";
import { OwnerChannelTargetStore } from "../apps/syno/syno/proactive-reliability.mjs";
import { IngestWorkflowCoordinator, IngestWorkflowStore } from "../apps/syno/syno/ingest-workflow-coordinator.mjs";
import { WorkflowOutbox } from "../apps/syno/syno/workflow-outbox.mjs";
import { createSynoRuntime, routeSynoApi } from "../apps/syno/syno/runtime.mjs";

async function tempState(t, prefix) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return path.join(root, "proactive.json");
}

function makeProactive(t, { messages, homeChannel = "weixin", signalSources, agentText, signalEngine, eventsLog, notifications, onSignalsDelivered } = {}) {
  return tempState(t, "syno-proactive-reliability-").then((stateFile) => {
    const root = path.dirname(stateFile);
    const channels = {
      homeChannel,
      async send(message, targets) { messages.push({ message, targets }); return { [homeChannel]: { delivered: true } }; },
    };
    const outbox = new ChannelDeliveryOutbox({
      root: path.join(root, "outbox"),
      payloadRoot: path.join(root, "payloads"),
      lockFile: path.join(root, "outbox.lock"),
      protect: async (value) => value,
      unprotect: async (value) => value,
    });
    let proactive;
    proactive = new ProactiveOrchestrator({
      host: { async receive() { return agentText ? { job: { id: "agent", status: "completed", result: { text: agentText } } } : { job: { id: "unused", status: "waiting_provider" } }; } },
      today: { async snapshot() { return { priorities: [], allocation: { digest: 1, ingest: 1, maintenance: 1 } }; } },
      channels,
      signalSources,
      channelDeliveryOutbox: outbox,
      notifications,
      recordEvent: eventsLog ? async (name, data) => eventsLog.push({ name, data }) : undefined,
      onSignalsDelivered,
      wakeDelivery: () => outbox.deliverDue(
        async (payload, event) => (await channels.send(payload, [event.targetChannel]))[event.targetChannel],
        { onDelivered: (event) => proactive.markBundleDelivered(event.sourceId, event.eventId) },
      ),
      signalEngine: signalEngine || new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
      stateFile,
      quietHours: { start: "23:00", end: "07:00" },
    });
    return proactive;
  });
}

test("unchanged proactive event is not sent again after the local date changes", async (t) => {
  const messages = [];
  const proactive = await makeProactive(t, { messages });
  const event = { id: "ingest-pending:artifact-1", kind: "ingest-pending", title: "处理收录候选：方案 A", priority: 75, ref: { status: "pending", updatedAt: "2026-07-30" } };
  await proactive.tick({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: [event] });
  await proactive.tick({ now: new Date("2026-07-31T08:30:00+08:00"), highValueEvents: [event] });
  assert.equal(messages.length, 1);
});

test("a material event version change creates one new summary on the same date", async (t) => {
  const messages = [];
  const proactive = await makeProactive(t, { messages });
  const first = { id: "claim-review:versioned", kind: "claim-review", title: "复核主张：版本一", priority: 95, ref: { status: "due", updatedAt: "v1" } };
  const changed = { ...first, title: "复核主张：版本二", ref: { status: "due", updatedAt: "v2" } };
  await proactive.tick({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: [first] });
  await proactive.tick({ now: new Date("2026-07-30T08:35:00+08:00"), highValueEvents: [changed] });
  assert.equal(messages.length, 2);
  assert.match(messages[1].message.body, /版本二/);
});

test("S1: a bundle whose body carries a credential shape is sanitized before delivery and records blocked_sensitive", async (t) => {
  // local-only 收录的凭据形标题会原样进 bundleMessage → 入微信；#deliverBundle 的 detectStrictCredential 门
  // 命中即降级为回退文案（仍投递，保留 bundle 身份），并记一次 proactive.bundle.blocked_sensitive。
  const messages = [];
  const eventsLog = [];
  const proactive = await makeProactive(t, { messages, eventsLog });
  const event = {
    id: "leak:artifact-1",
    kind: "ingest-pending",
    title: "处理收录：Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456",
    priority: 75,
    ref: { status: "pending", updatedAt: "2026-08-05" },
  };
  await proactive.tick({ now: new Date("2026-08-05T08:30:00+08:00"), highValueEvents: [event] });

  // 仍投递一条（降级文案，不阻断），但凭据字样不得出现在任何投递字段。
  assert.equal(messages.length, 1);
  const delivered = messages.map((m) => `${m.message.title || ""}\n${m.message.body || ""}\n${m.message.text || ""}`).join("\n");
  assert.doesNotMatch(delivered, /Authorization|Bearer|abcdefghijklmnopqrstuvwxyz123456/);
  assert.match(delivered, /因疑似包含凭据已暂缓自动推送/);
  // 命中记一次观测事件，理由为高精度 authorization_header。
  const blocked = eventsLog.filter((e) => e.name === "proactive.bundle.blocked_sensitive");
  assert.equal(blocked.length, 1);
  assert.equal(blocked[0].data.reason, "authorization_header");
});

test("a cosmetic title change does not create a new proactive business version", async (t) => {
  const messages = [];
  const proactive = await makeProactive(t, { messages });
  const first = { id: "claim-review:cosmetic", kind: "claim-review", title: "复核主张", priority: 95, ref: { status: "due", businessVersion: "7" } };
  const renamed = { ...first, title: "【重要】复核主张" };
  await proactive.tick({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: [first] });
  await proactive.tick({ now: new Date("2026-07-30T08:35:00+08:00"), highValueEvents: [renamed] });
  assert.equal(messages.length, 1);
});

test("an event that disappears and reappears starts a new episode", async (t) => {
  const messages = [];
  const proactive = await makeProactive(t, { messages });
  const event = { id: "ingest-pending:episode", kind: "ingest-pending", title: "处理收录候选：重新出现", priority: 75, ref: { status: "pending" } };
  await proactive.tick({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: [event] });
  await proactive.tick({ now: new Date("2026-07-30T08:31:00+08:00"), highValueEvents: [] });
  await proactive.tick({ now: new Date("2026-07-30T08:32:00+08:00"), highValueEvents: [event] });
  assert.equal(messages.length, 2);
});

test("one tick aggregates multiple high-value events into one Home Channel summary", async (t) => {
  const messages = [];
  const proactive = await makeProactive(t, { messages });
  const events = [
    { id: "claim-review:1", kind: "claim-review", title: "复核时效主张：A", priority: 95, ref: { status: "due" } },
    { id: "ingest-pending:2", kind: "ingest-pending", title: "处理收录候选：B", priority: 75, ref: { status: "pending" } },
  ];
  await proactive.tick({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: events });
  assert.equal(messages.length, 1);
  assert.deepEqual(messages[0].targets, ["weixin"]);
  assert.match(messages[0].message.body, /A/);
  assert.match(messages[0].message.body, /B/);
  assert.equal((await proactive.getDiagnostics()).eligibleSignals, 2);
});

test("a scheduled morning signal and events share one Bundle and one visible message", async (t) => {
  const messages = [];
  const proactive = await makeProactive(t, {
    messages,
    signalEngine: new SignalEngine({ schedule: { morningHour: 8, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
  });
  await proactive.tick({
    now: new Date("2026-07-30T08:30:00+08:00"),
    highValueEvents: [{ id: "ingest-pending:morning-bundle", kind: "ingest-pending", title: "晨间待办事项", priority: 75, ref: { status: "pending" } }],
  });
  assert.equal(messages.length, 1);
  assert.match(messages[0].message.body, /晨间待办事项/);
  assert.match(messages[0].message.body, /晨间计划/);
});

test("a proactive Bundle targets only a Feishu Home Channel when configured", async (t) => {
  const messages = [];
  const proactive = await makeProactive(t, { messages, homeChannel: "feishu" });
  await proactive.tick({
    now: new Date("2026-07-30T08:30:00+08:00"),
    highValueEvents: [{ id: "ingest-pending:feishu-home", kind: "ingest-pending", title: "飞书事项", priority: 75, ref: { status: "pending" } }],
  });
  assert.deepEqual(messages.map((item) => item.targets), [["feishu"]]);
});

test("proactive Bundle lifecycle emits redacted created, enqueued, and delivered audit events", async (t) => {
  const messages = [];
  const eventsLog = [];
  const notices = new Map();
  const notifications = {
    async add(input) { notices.set(input.data.idempotencyKey, structuredClone(input)); return input; },
    async updateDeliveryStatus(key, patch) {
      const notice = notices.get(key);
      if (!notice) return null;
      notice.data = { ...notice.data, ...patch };
      return notice;
    },
  };
  const proactive = await makeProactive(t, { messages, eventsLog, notifications });
  await proactive.tick({
    now: new Date("2026-07-30T08:30:00+08:00"),
    highValueEvents: [{ id: "ingest-pending:audit-events", kind: "ingest-pending", title: "PRIVATE TITLE", priority: 75, ref: { status: "pending" } }],
  });
  assert.deepEqual(eventsLog.map((item) => item.name), [
    "proactive.bundle.created",
    "proactive.bundle.enqueued",
    "proactive.bundle.delivered",
  ]);
  assert.doesNotMatch(JSON.stringify(eventsLog), /PRIVATE TITLE/);
  const [notice] = notices.values();
  assert.equal(notice.data.status, "delivered");
  assert.match(notice.data.outboxEventId, /^outbox-/);
});

test("model prose cannot replace deterministic Bundle item identities and actions", async (t) => {
  const messages = [];
  const proactive = await makeProactive(t, { messages, agentText: "建议尽快处理。" });
  await proactive.tick({
    now: new Date("2026-07-30T08:30:00+08:00"),
    highValueEvents: [{ id: "ingest-pending:identified", kind: "ingest-pending", title: "处理收录候选：明确事项", action: "选择收录方案", priority: 75, ref: { status: "pending" } }],
  });
  assert.match(messages[0].message.body, /处理收录候选：明确事项/);
  assert.match(messages[0].message.body, /选择收录方案/);
  assert.match(messages[0].message.body, /建议尽快处理/);
});

test("four events remain one summary with three visible items and a remainder count", async (t) => {
  const messages = [];
  const proactive = await makeProactive(t, { messages });
  const events = [1, 2, 3, 4].map((id) => ({
    id: `ingest-pending:${id}`,
    kind: "ingest-pending",
    title: `处理收录候选：${id}`,
    priority: 70 + id,
    ref: { status: "pending" },
  }));
  await proactive.tick({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: events });
  assert.equal(messages.length, 1);
  assert.match(messages[0].message.body, /处理收录候选：4/);
  assert.match(messages[0].message.body, /处理收录候选：3/);
  assert.match(messages[0].message.body, /处理收录候选：2/);
  assert.doesNotMatch(messages[0].message.body, /处理收录候选：1/);
  assert.match(messages[0].message.body, /另有 1 项/);
});

test("proactive delivery is persisted in one Outbox event and survives a second tick", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-proactive-outbox-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateFile = path.join(root, "proactive.json");
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const channels = { homeChannel: "weixin", async send() { throw new Error("must drain through Outbox"); } };
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { return { job: { id: "unused", status: "waiting_provider" } }; } },
    today: { async snapshot() { return { priorities: [] }; } },
    channels,
    channelDeliveryOutbox: outbox,
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile,
  });
  const event = { id: "ingest-pending:outbox", kind: "ingest-pending", title: "处理收录候选：Outbox", priority: 75, ref: { status: "pending" } };
  const first = await proactive.tick({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: [event] });
  const second = await proactive.tick({ now: new Date("2026-07-30T08:31:00+08:00"), highValueEvents: [event] });
  assert.equal(first[0].deliveryStatus, "pending");
  assert.deepEqual(second, []);
  const records = await outbox.list({ sourceId: first[0].bundleId });
  assert.equal(records.length, 1);
  assert.equal(records[0].responseKind, "proactive");
  assert.equal(records[0].targetChannel, "weixin");
});

test("OwnerChannelTargetStore keeps mobile targets encrypted and restores them", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-channel-target-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new OwnerChannelTargetStore({
    root,
    payloadRoot: path.join(root, "payloads"),
    protect: async (value) => Buffer.from(value, "utf8").toString("base64"),
    unprotect: async (value) => {
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error("invalid DPAPI ciphertext");
      return Buffer.from(value, "base64").toString("utf8");
    },
  });
  await store.set("local-user", "feishu", { chatId: "chat-private-1" });
  const metadataName = (await fs.readdir(root)).find((name) => name.endsWith(".json"));
  const metadata = await fs.readFile(path.join(root, metadataName), "utf8");
  assert.doesNotMatch(metadata, /chat-private-1/);
  assert.deepEqual(await store.get("local-user", "feishu"), { chatId: "chat-private-1" });
  const metadataPath = path.join(root, metadataName);
  const tampered = JSON.parse(await fs.readFile(metadataPath, "utf8"));
  tampered.payloadRef = "../outside";
  await fs.writeFile(metadataPath, JSON.stringify(tampered));
  await assert.rejects(store.get("local-user", "feishu"), { code: "CHANNEL_TARGET_METADATA_INVALID" });
});

test("versionless proactive ledger migrates a previously notified event without repeating it", async (t) => {
  const stateFile = await tempState(t, "syno-proactive-v1-migration-");
  const messages = [];
  await fs.writeFile(stateFile, JSON.stringify({
    date: "2026-07-29",
    notificationsToday: 1,
    lastRuns: { "event:ingest-pending:legacy": "2026-07-29" },
    pending: {},
    legacyExtension: { keep: true },
  }));
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { return { job: { status: "waiting_provider" } }; } },
    today: { async snapshot() { return { priorities: [] }; } },
    channels: {
      homeChannel: "weixin",
      async send(message, targets) { messages.push({ message, targets }); return { weixin: { delivered: true } }; },
    },
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile,
  });
  const legacyEvents = [{ id: "ingest-pending:legacy", kind: "ingest-pending", title: "旧待办", priority: 75, ref: { status: "pending" } }];
  await proactive.migrateLedger({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: legacyEvents });
  await proactive.tick({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: legacyEvents });
  assert.equal(messages.length, 0);
  const migrated = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.equal(migrated.version, 2);
  assert.equal(migrated.migration?.status, "complete");
  assert.deepEqual(migrated.legacyExtension, { keep: true });
  const backup = await fs.readFile(`${stateFile}.v1-backup`, "utf8");
  assert.equal(JSON.parse(backup).version, undefined);
  const marker = JSON.parse(await fs.readFile(`${stateFile}.migration-v2.json`, "utf8"));
  assert.equal(marker.status, "complete");
  assert.equal(marker.backupDigest, createHash("sha256").update(backup).digest("hex"));
});

test("a delivered Outbox event rebuilds a missing Ledger without creating a next-day duplicate", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-proactive-outbox-reconcile-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateFile = path.join(root, "proactive.json");
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const channels = { homeChannel: "weixin", async send() { throw new Error("direct delivery is forbidden"); } };
  const common = {
    host: { async receive() { return { job: { status: "waiting_provider" } }; } },
    today: { async snapshot() { return { priorities: [] }; } },
    channels,
    channelDeliveryOutbox: outbox,
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile,
  };
  const event = { id: "ingest-pending:reconcile", kind: "ingest-pending", title: "待恢复事项", priority: 75, ref: { status: "pending", updatedAt: "v1" } };
  const first = new ProactiveOrchestrator(common);
  await first.tick({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: [event] });
  await outbox.deliverDue(async () => ({ delivered: true }));
  await fs.rm(stateFile, { force: true });

  const recoveredAudits = [];
  const recovered = new ProactiveOrchestrator({
    ...common,
    notifications: {
      async add(input) { recoveredAudits.push(structuredClone(input)); return input; },
      async updateDeliveryStatus(_key, patch) {
        recoveredAudits[0].data = { ...recoveredAudits[0].data, ...patch };
        return recoveredAudits[0];
      },
    },
  });
  const result = await recovered.tick({ now: new Date("2026-07-31T08:30:00+08:00"), highValueEvents: [event] });

  assert.deepEqual(result, []);
  assert.equal((await outbox.list({ limit: 100 })).length, 1);
  const ledger = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.equal(ledger.subjects[event.id].lastDeliveredEventId, (await outbox.list({ limit: 1 }))[0].eventId);
  assert.equal(recoveredAudits.length, 1);
  assert.equal(recoveredAudits[0].data.status, "delivered");
});

test("delivery_unknown keeps one Bundle and does not regenerate model prose", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-proactive-delivery-unknown-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let modelRuns = 0;
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    retryBaseMs: 1_000,
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { modelRuns += 1; return { job: { id: "agent", status: "completed", result: { text: "一次生成" } } }; } },
    today: { async snapshot() { return { priorities: [] }; } },
    channels: { homeChannel: "feishu", async send() { throw new Error("drain is controlled by the test"); } },
    channelDeliveryOutbox: outbox,
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile: path.join(root, "proactive.json"),
  });
  const event = { id: "ingest-pending:unknown", kind: "ingest-pending", title: "未知投递事项", priority: 75, ref: { status: "pending", updatedAt: "v1" } };
  await proactive.tick({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: [event] });
  await outbox.deliverDue(async () => ({ deliveryUnknown: true, reason: "SEND_TIMEOUT" }));
  await proactive.tick({ now: new Date("2026-07-31T08:30:00+08:00"), highValueEvents: [event] });
  assert.equal(modelRuns, 1);
  const records = await outbox.list({ limit: 100 });
  assert.equal(records.length, 1);
  assert.equal(records[0].status, "delivery_unknown");
});

test("an unreadable proactive Outbox payload becomes an explicit recovery failure", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-proactive-payload-recovery-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateFile = path.join(root, "proactive.json");
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { return { job: { status: "waiting_provider" } }; } },
    today: { async snapshot() { return { priorities: [] }; } },
    channels: { homeChannel: "weixin", async send() { throw new Error("no direct delivery"); } },
    channelDeliveryOutbox: outbox,
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile,
  });
  await proactive.tick({
    now: new Date("2026-07-30T08:30:00+08:00"),
    highValueEvents: [{ id: "ingest-pending:corrupt", kind: "ingest-pending", title: "损坏载荷", priority: 75, ref: { status: "pending" } }],
  });
  const [record] = await outbox.list({ limit: 1 });
  await fs.writeFile(path.join(root, "payloads", `${record.payloadRef}.dpapi`), "not-json");
  await proactive.tick({ now: new Date("2026-07-30T08:35:00+08:00"), highValueEvents: [] });
  const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.equal(state.recoveryFailures[record.eventId].code, "PROACTIVE_OUTBOX_PAYLOAD_UNAVAILABLE");
});

test("a failed_terminal proactive Outbox event is excluded from reconcile and never spams recoveryFailures", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-proactive-terminal-reconcile-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateFile = path.join(root, "proactive.json");
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { return { job: { status: "waiting_provider" } }; } },
    today: { async snapshot() { return { priorities: [] }; } },
    channels: { homeChannel: "weixin", async send() { throw new Error("no direct delivery"); } },
    channelDeliveryOutbox: outbox,
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile,
  });
  await proactive.tick({
    now: new Date("2026-07-30T08:30:00+08:00"),
    highValueEvents: [{ id: "ingest-pending:terminal", kind: "ingest-pending", title: "已终态", priority: 75, ref: { status: "pending" } }],
  });
  const [record] = await outbox.list({ limit: 1 });
  // 终态事件：直接落 failed_terminal（模拟重试耗尽/结构性失败后的状态），并损坏 payload（最坏情况）。
  const eventPath = path.join(root, "outbox", `${record.eventId}.json`);
  const settled = JSON.parse(await fs.readFile(eventPath, "utf8"));
  await fs.writeFile(eventPath, JSON.stringify({ ...settled, status: "failed_terminal" }, null, 2), "utf8");
  await fs.writeFile(path.join(root, "payloads", `${record.payloadRef}.dpapi`), "not-json");

  await proactive.tick({ now: new Date("2026-07-30T08:35:00+08:00"), highValueEvents: [] });
  const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
  // C6：failed_terminal 不进 reconcile，即便 payload 损坏也不刷 recoveryFailures（根治 f1b29459 噪音）。
  assert.equal(state.recoveryFailures?.[record.eventId], undefined);
});

test("legacy Web audit suppresses a migrated current event when lastRuns is incomplete", async (t) => {
  const stateFile = await tempState(t, "syno-proactive-web-audit-migration-");
  await fs.writeFile(stateFile, JSON.stringify({ date: "2026-07-29", notificationsToday: 0, lastRuns: {}, pending: {} }));
  const root = path.dirname(stateFile);
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { return { job: { status: "waiting_provider" } }; } },
    today: { async snapshot() { return { priorities: [] }; } },
    channels: { homeChannel: "weixin", async send() { throw new Error("direct delivery is forbidden"); } },
    channelDeliveryOutbox: outbox,
    notifications: {
      async list() {
        return [{ source: "proactive", data: { idempotencyKey: "proactive:event:ingest-pending:audit" } }];
      },
    },
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile,
  });
  const auditedEvents = [{ id: "ingest-pending:audit", kind: "ingest-pending", title: "审计中已有", priority: 75, ref: { status: "pending" } }];
  await proactive.migrateLedger({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: auditedEvents });
  await proactive.tick({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: auditedEvents });
  assert.equal((await outbox.list({ limit: 10 })).length, 0);
  const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.equal(state.subjects["ingest-pending:audit"].migrationSuppressed, true);
});

test("an unconfirmed legacy event is migration-ambiguous and waits for a material version change", async (t) => {
  const stateFile = await tempState(t, "syno-proactive-ambiguous-migration-");
  await fs.writeFile(stateFile, JSON.stringify({ date: "2026-07-29", notificationsToday: 0, lastRuns: {}, pending: {} }));
  const root = path.dirname(stateFile);
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { return { job: { status: "waiting_provider" } }; } },
    today: { async snapshot() { return { priorities: [] }; } },
    channels: { homeChannel: "weixin", async send() { throw new Error("direct delivery is forbidden"); } },
    notifications: { async list() { return []; } },
    channelDeliveryOutbox: outbox,
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile,
  });
  const current = { id: "ingest-pending:ambiguous", kind: "ingest-pending", title: "迁移歧义", priority: 75, ref: { status: "pending", businessVersion: "1" } };
  await proactive.migrateLedger({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: [current] });
  await proactive.tick({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: [current] });
  assert.equal((await outbox.list({ limit: 10 })).length, 0);
  const migrated = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.equal(migrated.subjects[current.id].migrationAmbiguous, true);

  await proactive.tick({
    now: new Date("2026-07-30T08:35:00+08:00"),
    highValueEvents: [{ ...current, ref: { status: "pending", businessVersion: "2" } }],
  });
  assert.equal((await outbox.list({ limit: 10 })).length, 1);
});

test("Outbox wake observes the persisted pending Bundle", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-proactive-wake-order-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateFile = path.join(root, "proactive.json");
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const observed = [];
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { return { job: { status: "waiting_provider" } }; } },
    today: { async snapshot() { return { priorities: [] }; } },
    channels: { homeChannel: "weixin", async send() { throw new Error("direct delivery is forbidden"); } },
    channelDeliveryOutbox: outbox,
    wakeDelivery: async () => {
      const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
      observed.push(Object.keys(state.pendingBundles).length);
    },
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile,
  });
  await proactive.tick({
    now: new Date("2026-07-30T08:30:00+08:00"),
    highValueEvents: [{ id: "ingest-pending:wake", kind: "ingest-pending", title: "唤醒顺序", priority: 75, ref: { status: "pending" } }],
  });
  assert.deepEqual(observed, [1]);
});

test("concurrent ticks create one Bundle result and one Outbox event", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-proactive-concurrent-tick-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { await new Promise((resolve) => setTimeout(resolve, 20)); return { job: { status: "waiting_provider" } }; } },
    today: { async snapshot() { return { priorities: [] }; } },
    channels: { homeChannel: "weixin", async send() { throw new Error("direct delivery is forbidden"); } },
    channelDeliveryOutbox: outbox,
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile: path.join(root, "proactive.json"),
  });
  const event = { id: "ingest-pending:concurrent", kind: "ingest-pending", title: "并发事项", priority: 75, ref: { status: "pending" } };
  const results = await Promise.all([
    proactive.tick({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: [event] }),
    proactive.tick({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: [event] }),
  ]);
  assert.equal(results.flat().length, 1);
  assert.equal((await outbox.list({ limit: 100 })).length, 1);
});

test("resolved proactive subjects are retained for 30 days and then pruned", async (t) => {
  const stateFile = await tempState(t, "syno-proactive-retention-");
  await fs.writeFile(stateFile, JSON.stringify({
    version: 2,
    date: "2026-07-30",
    notificationsToday: 0,
    lastRuns: {},
    subjects: {
      expired: { subjectKey: "expired", active: false, resolvedAt: "2026-06-28T00:00:00.000Z", updatedAt: "2026-06-28T00:00:00.000Z" },
      recent: { subjectKey: "recent", active: false, resolvedAt: "2026-07-15T00:00:00.000Z", updatedAt: "2026-07-15T00:00:00.000Z" },
    },
    pendingBundles: {},
    pending: {},
  }));
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { return { job: { status: "waiting_provider" } }; } },
    today: { async snapshot() { return { priorities: [] }; } },
    channels: { homeChannel: "weixin", async send() { throw new Error("no delivery expected"); } },
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile,
  });
  await proactive.tick({ now: new Date("2026-07-30T08:30:00.000Z"), highValueEvents: [] });
  const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.equal(state.subjects.expired, undefined);
  assert.equal(state.subjects.recent.active, false);
});

test("production start keeps proactive delivery paused until the Owner enables the release gate", async (t) => {
  const stateFile = await tempState(t, "syno-proactive-release-gate-");
  const root = path.dirname(stateFile);
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { throw new Error("paused start must not invoke the model"); } },
    today: { async snapshot() { throw new Error("paused start must not build content"); } },
    channels: { homeChannel: "weixin", async send() { throw new Error("paused start must not send"); } },
    settingsRegistry: { async get(key) { return key === "notifications.proactiveDeliveryEnabled" ? false : undefined; } },
    signalSources: {
      async collect() {
        return [{ id: "ingest-pending:release-gate", kind: "ingest-pending", title: "不得提前发送", priority: 95, ref: { status: "pending" } }];
      },
    },
    channelDeliveryOutbox: outbox,
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    // 固定中午时钟：start() 的即时 tick 走墙钟，安静时段（22:30-07:30）会让 collect 根本不会发生，
    // 2026-07-30 夜间全量回归就因此在 #24 卡死。本组 start/stop 竞态用例一律钉死时钟。
    clock: () => new Date("2026-07-30T12:00:00"),
    stateFile,
  });

  await proactive.start();
  proactive.stop();

  assert.equal((await outbox.list({ limit: 10 })).length, 0);
  await assert.rejects(fs.access(stateFile), { code: "ENOENT" });
});

test("stop wins a race with asynchronous start and prevents a late tick or timer", async (t) => {
  const stateFile = await tempState(t, "syno-proactive-start-stop-race-");
  let releaseSetting;
  const setting = new Promise((resolve) => { releaseSetting = resolve; });
  let collections = 0;
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { throw new Error("stopped start must not invoke the model"); } },
    today: { async snapshot() { throw new Error("stopped start must not build content"); } },
    channels: { homeChannel: "weixin", async send() { throw new Error("stopped start must not send"); } },
    settingsRegistry: { async get(key) { return key === "notifications.proactiveDeliveryEnabled" ? setting : undefined; } },
    signalSources: { async collect() { collections += 1; return []; } },
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    clock: () => new Date("2026-07-30T12:00:00"),
    stateFile,
  });

  const starting = proactive.start();
  proactive.stop();
  releaseSetting(true);
  await starting;
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(collections, 0);
  await assert.rejects(fs.access(stateFile), { code: "ENOENT" });
});

test("stop during the startup tick prevents model work, enqueue and wake", async (t) => {
  const stateFile = await tempState(t, "syno-proactive-stop-during-tick-");
  const root = path.dirname(stateFile);
  let releaseSignals;
  let collectingResolve;
  const collecting = new Promise((resolve) => { collectingResolve = resolve; });
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  let modelCalls = 0;
  let wakes = 0;
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { modelCalls += 1; return { job: { status: "waiting_provider" } }; } },
    today: { async snapshot() { return { priorities: [] }; } },
    channels: { homeChannel: "weixin", async send() { throw new Error("must not send"); } },
    settingsRegistry: { async get(key) { return key === "notifications.proactiveDeliveryEnabled" ? true : undefined; } },
    signalSources: {
      async collect() {
        collectingResolve();
        return new Promise((resolve) => { releaseSignals = resolve; });
      },
    },
    channelDeliveryOutbox: outbox,
    wakeDelivery: async () => { wakes += 1; },
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    clock: () => new Date("2026-07-30T12:00:00"),
    stateFile,
  });

  const starting = proactive.start();
  await collecting;
  proactive.stop();
  releaseSignals([{ id: "ingest-pending:late", kind: "ingest-pending", title: "不得发送", priority: 95, ref: { status: "pending" } }]);
  await starting;

  assert.equal(modelCalls, 0);
  assert.equal(wakes, 0);
  assert.equal((await outbox.list({ limit: 10 })).length, 0);
});

test("stop while enqueue waits on its lock cancels the durable proactive event", async (t) => {
  const stateFile = await tempState(t, "syno-proactive-stop-at-enqueue-");
  let enteredEnqueue;
  let releaseEnqueue;
  const enqueueEntered = new Promise((resolve) => { enteredEnqueue = resolve; });
  const enqueueRelease = new Promise((resolve) => { releaseEnqueue = resolve; });
  let wakes = 0;
  let deliveryEnabled = false;
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { return { job: { status: "waiting_provider" } }; } },
    today: { async snapshot() { return { priorities: [] }; } },
    channels: { homeChannel: "weixin" },
    settingsRegistry: { async get(key) { return key === "notifications.proactiveDeliveryEnabled" ? deliveryEnabled : undefined; } },
    signalSources: {
      async collect() {
        return [{ id: "ingest-pending:enqueue-race", kind: "ingest-pending", title: "不得入队", priority: 95, ref: { status: "pending" } }];
      },
    },
    channelDeliveryOutbox: {
      async list() { return []; },
      async enqueue(options) {
        enteredEnqueue();
        await enqueueRelease;
        if (!await options.shouldEnqueue()) return { created: false, event: null, skipped: true };
        throw new Error("stopped enqueue must not create an event");
      },
    },
    wakeDelivery: async () => { wakes += 1; },
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    clock: () => new Date("2026-07-30T12:00:00"),
    stateFile,
  });

  await proactive.migrateLedger();
  deliveryEnabled = true;
  const starting = proactive.start();
  await enqueueEntered;
  proactive.stop();
  releaseEnqueue();
  await starting;

  assert.equal(wakes, 0);
});

test("proactive preview reports a redacted Bundle without mutating Ledger or Outbox", async (t) => {
  const stateFile = await tempState(t, "syno-proactive-preview-");
  const root = path.dirname(stateFile);
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { throw new Error("preview must not invoke the model"); } },
    today: { async snapshot() { throw new Error("preview must not render user content"); } },
    channels: { homeChannel: "weixin", async send() { throw new Error("preview must not send"); } },
    ownerChannelTargets: { async get() { return { contextToken: "must-not-be-returned" }; } },
    channelDeliveryOutbox: outbox,
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile,
  });
  const preview = await proactive.preview({
    now: new Date("2026-07-30T08:30:00+08:00"),
    highValueEvents: [{ id: "ingest-pending:preview", kind: "ingest-pending", title: "私人标题不得返回", priority: 95, ref: { status: "pending" } }],
  });

  assert.deepEqual(preview, {
    enabled: false,
    homeChannel: "weixin",
    homeTargetAvailable: true,
    deliveryHealth: { homeChannel: "weixin", consecutiveFailures: 0, lastDeliveryError: null, lastSeenAt: null, targetTokenAgeMs: null },
    eligibleSignals: 1,
    bundle: { bundleId: preview.bundle.bundleId, signalCount: 1, remainingCount: 0 },
  });
  assert.doesNotMatch(JSON.stringify(preview), /私人标题/);
  assert.doesNotMatch(JSON.stringify(preview), /must-not-be-returned/);
  assert.equal((await outbox.list({ limit: 10 })).length, 0);
  await assert.rejects(fs.access(stateFile), { code: "ENOENT" });
});

test("Ledger migration is an explicit no-delivery step before any production tick", async (t) => {
  const stateFile = await tempState(t, "syno-proactive-explicit-migration-");
  const root = path.dirname(stateFile);
  await fs.writeFile(stateFile, `${JSON.stringify({
    date: "2026-07-29",
    notificationsToday: 3,
    lastRuns: { morning: "2026-07-29" },
    pending: {},
  })}\n`);
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { throw new Error("migration must not invoke the model"); } },
    today: { async snapshot() { throw new Error("migration must not render content"); } },
    channels: { homeChannel: "weixin", async send() { throw new Error("migration must not send"); } },
    signalSources: {
      async collect() {
        return [{ id: "ingest-pending:migration-current", kind: "ingest-pending", title: "当前旧事项", priority: 95, ref: { status: "pending", businessVersion: "1" } }];
      },
    },
    channelDeliveryOutbox: outbox,
    stateFile,
  });

  const report = await proactive.migrateLedger({ now: new Date("2026-07-30T08:00:00+08:00") });

  assert.equal(report.status, "migrated");
  assert.equal(report.version, 2);
  assert.equal(report.suppressedSignals, 1);
  assert.equal((await outbox.list({ limit: 10 })).length, 0);
  const migrated = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.equal(migrated.migration.status, "complete");
  assert.equal(migrated.subjects["ingest-pending:migration-current"].migrationSuppressed, true);
  await fs.access(`${stateFile}.v1-backup`);
  await fs.access(`${stateFile}.migration-v2.json`);

  await fs.rm(`${stateFile}.migration-v2.json`);
  assert.equal((await proactive.releaseStatus()).migrationComplete, false);
  assert.equal((await proactive.migrateLedger()).status, "marker_repaired");
  await fs.access(`${stateFile}.migration-v2.json`);
  assert.equal((await proactive.releaseStatus()).migrationComplete, true);
});

test("ordinary tick cannot complete or bypass a pending Ledger migration", async (t) => {
  const stateFile = await tempState(t, "syno-proactive-pending-migration-");
  await fs.writeFile(stateFile, `${JSON.stringify({
    date: "2026-07-29",
    notificationsToday: 0,
    lastRuns: {},
    pending: {},
  })}\n`);
  let collections = 0;
  let enqueues = 0;
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { throw new Error("pending migration must not invoke model"); } },
    today: { async snapshot() { throw new Error("pending migration must not render"); } },
    channels: { homeChannel: "weixin" },
    settingsRegistry: { async get() { return true; } },
    signalSources: { async collect() { collections += 1; return []; } },
    channelDeliveryOutbox: {
      async list() { return []; },
      async enqueue() { enqueues += 1; throw new Error("pending migration must not enqueue"); },
    },
    stateFile,
  });

  const delivered = await proactive.tick({ now: new Date("2026-07-30T08:00:00+08:00") });
  const state = JSON.parse(await fs.readFile(stateFile, "utf8"));

  assert.deepEqual(delivered, []);
  assert.equal(collections, 0);
  assert.equal(enqueues, 0);
  assert.equal(state.migration.status, "pending");
});

test("controlled proactive test creates one tagged Outbox event without collecting real signals", async (t) => {
  const stateFile = await tempState(t, "syno-proactive-controlled-test-");
  const root = path.dirname(stateFile);
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  let collections = 0;
  const wakeOptions = [];
  const authorizedEvents = [];
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { throw new Error("controlled test must not invoke the model"); } },
    today: { async snapshot() { throw new Error("controlled test must not render real content"); } },
    channels: { homeChannel: "weixin", async send() { throw new Error("Outbox owns delivery"); } },
    signalSources: { async collect() { collections += 1; return []; } },
    settingsRegistry: {
      async get(key) { return key === "notifications.proactiveDeliveryEnabled" ? false : undefined; },
      async set(key, value, options) {
        assert.equal(key, "notifications.proactiveTestEventId");
        assert.equal(options.proactiveTestAuthorizationVerified, true);
        authorizedEvents.push(value);
      },
    },
    channelDeliveryOutbox: outbox,
    wakeDelivery: async (options) => wakeOptions.push(options),
    stateFile,
  });
  await proactive.migrateLedger({ now: new Date("2026-07-30T08:00:00+08:00") });

  const first = await proactive.triggerTest("release-20260730");
  const duplicate = await proactive.triggerTest("release-20260730");
  const records = await outbox.list({ limit: 10 });
  const payload = (await outbox.get(first.eventId, { includePayload: true })).payload;

  assert.equal(first.eventId, duplicate.eventId);
  assert.equal(records.length, 1);
  assert.match(records[0].deliveryKey, /^proactive-test:release-20260730:/);
  assert.match(payload.text, /\[Syno TEST release-20260730\]/);
  assert.equal(collections, 0, "controlled test must not inspect real signals");
  assert.deepEqual(authorizedEvents, [first.eventId, first.eventId]);
  assert.deepEqual(wakeOptions, [{ allowProactiveEventId: first.eventId }, { allowProactiveEventId: first.eventId }]);
});

test("a second controlled run is rejected while the exact first test remains nonterminal", async (t) => {
  const stateFile = await tempState(t, "syno-proactive-controlled-test-serial-");
  const root = path.dirname(stateFile);
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { throw new Error("controlled test must not invoke model"); } },
    today: { async snapshot() { throw new Error("controlled test must not render"); } },
    channels: { homeChannel: "weixin" },
    settingsRegistry: {
      async get(key) { return key === "notifications.proactiveDeliveryEnabled" ? false : undefined; },
      async set() {},
    },
    channelDeliveryOutbox: outbox,
    stateFile,
  });
  await proactive.migrateLedger();
  const outcomes = await Promise.allSettled([
    proactive.triggerTest("release-first"),
    proactive.triggerTest("release-second"),
  ]);
  assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 1);
  const rejected = outcomes.find((item) => item.status === "rejected");
  assert.equal(rejected.reason.code, "PROACTIVE_TEST_ALREADY_PENDING");
  assert.equal((await outbox.list({ limit: 10 })).length, 1);
});

test("replaying an already delivered controlled run does not reauthorize or redeliver it", async (t) => {
  const stateFile = await tempState(t, "syno-proactive-controlled-test-delivered-");
  const root = path.dirname(stateFile);
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const authorizations = [];
  let wakes = 0;
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { throw new Error("controlled test must not invoke model"); } },
    today: { async snapshot() { throw new Error("controlled test must not render"); } },
    channels: { homeChannel: "weixin" },
    settingsRegistry: {
      async get(key) { return key === "notifications.proactiveDeliveryEnabled" ? false : undefined; },
      async set(_key, value) { authorizations.push(value); },
    },
    channelDeliveryOutbox: outbox,
    wakeDelivery: async () => { wakes += 1; },
    stateFile,
  });
  await proactive.migrateLedger();
  const first = await proactive.triggerTest("release-delivered");
  await outbox.deliverDue(async () => ({ delivered: true }));
  const replay = await proactive.triggerTest("release-delivered");

  assert.equal(replay.eventId, first.eventId);
  assert.equal(replay.status, "delivered");
  assert.deepEqual(authorizations, [first.eventId]);
  assert.equal(wakes, 1);
  const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
  assert.equal(Object.keys(state.pendingBundles).length, 0);
});

test("bundle delivery fires onSignalsDelivered once with the bundle signalVersions", async (t) => {
  const messages = [];
  const delivered = [];
  const proactive = await makeProactive(t, {
    messages,
    onSignalsDelivered: (identities) => { delivered.push(identities); },
  });
  const event = { id: "review-due:workflow-1", kind: "review-due", title: "复习「note」", priority: 85, ref: { workflowId: "workflow-1", knowledgeRef: "vault/x/note.md", dueAt: "2026-07-29T00:00:00.000Z" } };
  await proactive.tick({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: [event] });
  assert.equal(messages.length, 1);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].length, 1);
  assert.equal(delivered[0][0].subjectKey, "review-due:workflow-1");
  assert.ok(delivered[0][0].businessVersion);
});

test("a failing onSignalsDelivered callback does not affect delivery or state", async (t) => {
  const messages = [];
  const proactive = await makeProactive(t, {
    messages,
    onSignalsDelivered: () => { throw new Error("boom"); },
  });
  const event = { id: "review-due:workflow-2", kind: "review-due", title: "复习「other」", priority: 85, ref: { workflowId: "workflow-2", knowledgeRef: "vault/x/other.md", dueAt: "2026-07-29T00:00:00.000Z" } };
  await proactive.tick({ now: new Date("2026-07-30T08:30:00+08:00"), highValueEvents: [event] });
  assert.equal(messages.length, 1);
  // 同步抛错被吞掉：delivered 事实与 state 保存不受影响，同一信号不会重推
  await proactive.tick({ now: new Date("2026-07-30T08:35:00+08:00"), highValueEvents: [event] });
  assert.equal(messages.length, 1);
});

// 构造一个真 runtime（createSynoRuntime，全可注入），用真 drain 闭包（runtime.mjs
// drainChannelDeliveryOutbox）验证「主动通道静默失效 → 有界兜底 + 可观测 + 跨渠道告警」。
// 直接 outbox.enqueue 绕过信号收集，经 runtime.proactive.wakeDelivery() 反复驱动同一事件。
async function buildDrainRuntime(t, { proactiveResult, terminalResult } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-proactive-drain-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const clockState = { now: new Date("2026-08-02T08:00:00.000Z") };
  const recorded = [];
  const sent = [];
  const acceptedUpdates = [];
  const acceptedRequests = { async update(id, patch) { acceptedUpdates.push({ id, patch }); } };
  const channels = {
    homeChannel: "weixin",
    async send(message, targets) {
      sent.push({ source: message.source, level: message.level, deliveryKey: message.deliveryKey, targets });
      const result = {};
      for (const target of targets) {
        if (message.source === "system-health") result[target] = { delivered: true };
        else if (terminalResult && String(message.deliveryKey || "").startsWith("accepted-terminal")) result[target] = terminalResult;
        else result[target] = proactiveResult || { delivered: false, reason: "provider_rejected" };
      }
      return result;
    },
  };
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    clock: () => clockState.now,
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const targets = new OwnerChannelTargetStore({
    root: path.join(root, "targets"),
    payloadRoot: path.join(root, "target-payloads"),
    protect: async (value) => value,
    unprotect: async (value) => value,
    clock: () => clockState.now,
  });
  await targets.set("local-user", "weixin", { toUserId: "owner", contextToken: "ctx" });
  const journal = { async record(event, data, settings) { recorded.push({ event, data, level: settings?.level }); return true; } };
  const settingsRegistry = {
    async get(key) { return key === "notifications.proactiveDeliveryEnabled" ? true : null; },
    async set() {},
  };
  const runtime = createSynoRuntime({ channels, channelDeliveryOutbox: outbox, ownerChannelTargets: targets, acceptedRequests, journal, settingsRegistry });
  return { runtime, outbox, clockState, recorded, sent, acceptedUpdates };
}

async function buildWorkflowDuplicateRuntime(t, {
  targetAvailable = true,
  deliveryResult = { delivered: true, deliveryCapability: "at_least_once" },
} = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-workflow-duplicate-runtime-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const workflowOutbox = new WorkflowOutbox({ root: path.join(root, "workflow-outbox") });
  const ownerChannelTargets = new OwnerChannelTargetStore({
    root: path.join(root, "targets"),
    payloadRoot: path.join(root, "target-payloads"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  if (targetAvailable) {
    await ownerChannelTargets.set("owner", "weixin", { toUserId: "current-owner", contextToken: "current-context" });
  }
  const store = new IngestWorkflowStore({ root: path.join(root, "workflows") });
  const ingest = {
    async receive(payload) {
      return {
        artifact: { id: "artifact-workflow-duplicate", kind: payload.kind, dedupeKey: payload.value, sourceDescriptor: {} },
        proposalPending: true,
      };
    },
  };
  const coordinator = new IngestWorkflowCoordinator({ ingest, store, schedule: () => {} });
  const sent = [];
  const channels = {
    homeChannel: "weixin",
    async send(message, targets) {
      sent.push({ message, targets });
      return Object.fromEntries(targets.map((target) => [target, deliveryResult]));
    },
  };
  const recorded = [];
  const runtime = createSynoRuntime({
    channels,
    workflowOutbox,
    ownerChannelTargets,
    ingest,
    ingestWorkflows: coordinator,
    cognitiveRuntime: { async appendSystemEvent() {}, async run() { return { text: "unused" }; } },
    channelDeliveryOutbox: null,
    acceptedRequests: null,
    journal: { async record(event, data) { recorded.push({ event, data }); return true; } },
  });
  return { coordinator, workflowOutbox, store, sent, recorded };
}

async function waitForWorkflowDuplicate(condition, message) {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(message);
}

test("duplicate Workflow delivery hydrates the current encrypted Weixin target and does not replay delivered events", async (t) => {
  const { coordinator, workflowOutbox, sent } = await buildWorkflowDuplicateRuntime(t);
  const first = await coordinator.receive(
    { kind: "url", value: "https://example.com/workflow-target" },
    { ownerKey: "owner", channel: "weixin", messageId: "wx-original", replyTarget: { toUserId: "stale-owner" } },
  );
  await workflowOutbox.enqueue({
    workflowId: first.workflow.id,
    eventType: "proposal.ready",
    ownerKey: "owner",
    targetChannel: "weixin",
    threadKey: "main",
    deliveryTarget: { toUserId: "stale-owner" },
    redactedPayload: { text: "方案已准备好" },
    idempotencyKey: `${first.workflow.id}:proposal:ready`,
  });

  await coordinator.receive(
    { kind: "url", value: "https://example.com/workflow-target" },
    { ownerKey: "owner", channel: "weixin", messageId: "wx-duplicate", replyTarget: { toUserId: "stale-owner" } },
  );
  await waitForWorkflowDuplicate(() => sent.length === 1, "duplicate Workflow did not wake its pending Outbox");
  await waitForWorkflowDuplicate(async () => (await workflowOutbox.findLatest({ workflowId: first.workflow.id, targetChannel: "weixin" }))?.status === "delivered", "duplicate Workflow Outbox did not settle as delivered");

  assert.equal(sent.length, 1);
  assert.equal(sent[0].targets[0], "weixin");
  assert.equal(sent[0].message.toUserId, "current-owner");
  assert.equal(sent[0].message.contextToken, "current-context");
  assert.equal((await workflowOutbox.findLatest({ workflowId: first.workflow.id, targetChannel: "weixin" })).status, "delivered");

  await coordinator.receive(
    { kind: "url", value: "https://example.com/workflow-target" },
    { ownerKey: "owner", channel: "weixin", messageId: "wx-duplicate", replyTarget: { toUserId: "stale-owner" } },
  );
  assert.equal(sent.length, 1, "同一微信消息再次进入不能重复发送已确认的最终事件");
});

test("Workflow delivery does not send without a current encrypted Weixin target and remains retryable", async (t) => {
  const { coordinator, workflowOutbox, sent, recorded } = await buildWorkflowDuplicateRuntime(t, { targetAvailable: false });
  const first = await coordinator.receive(
    { kind: "url", value: "https://example.com/workflow-target-missing" },
    { ownerKey: "owner", channel: "weixin", messageId: "wx-missing-original", replyTarget: { toUserId: "stale-owner" } },
  );
  await workflowOutbox.enqueue({
    workflowId: first.workflow.id,
    eventType: "workflow.reported",
    ownerKey: "owner",
    targetChannel: "weixin",
    redactedPayload: { text: "不可空投" },
    idempotencyKey: `${first.workflow.id}:reported:missing-target`,
  });
  await coordinator.receive(
    { kind: "url", value: "https://example.com/workflow-target-missing" },
    { ownerKey: "owner", channel: "weixin", messageId: "wx-missing-duplicate", replyTarget: { toUserId: "stale-owner" } },
  );
  await waitForWorkflowDuplicate(async () => (await workflowOutbox.findLatest({ workflowId: first.workflow.id, targetChannel: "weixin" }))?.status === "failed_retryable", "missing target did not remain retryable");

  assert.equal(sent.length, 0);
  assert.ok(recorded.some((item) => item.event === "ingest.workflow.outbox.target_unavailable" && item.data.status === "target_missing"));
});

test("runtime quality rejection writes notifications before converging the Workflow to rejected", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-quality-rejection-runtime-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const scheduled = [];
  const workflowOutbox = new WorkflowOutbox({ root: path.join(root, "workflow-outbox") });
  const ownerChannelTargets = new OwnerChannelTargetStore({
    root: path.join(root, "targets"),
    payloadRoot: path.join(root, "target-payloads"),
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  await ownerChannelTargets.set("owner", "weixin", { toUserId: "owner", contextToken: "ctx" });
  const store = new IngestWorkflowStore({ root: path.join(root, "workflows") });
  const ingest = {
    async receive(payload) {
      return { artifact: { id: "artifact-quality", kind: payload.kind, dedupeKey: payload.value, sourceDescriptor: {} }, proposalPending: true };
    },
    async propose() {
      return {
        candidate: { id: "candidate-quality" },
        proposal: {
          id: "proposal-quality",
          proposalDigest: "proposal-quality-digest",
          sourceType: "url",
          suggestedPath: "vault/00-Inbox/quality.md",
          quality: { status: "rejected", reasons: ["正文不足，无法形成可靠收录"] },
        },
      };
    },
  };
  const coordinator = new IngestWorkflowCoordinator({ ingest, store, schedule: (work) => scheduled.push(work) });
  const runtime = createSynoRuntime({
    channels: { homeChannel: "weixin", async send() { return { weixin: { delivered: true } }; } },
    workflowOutbox,
    ownerChannelTargets,
    ingest,
    ingestWorkflows: coordinator,
    workflowContextCompiler: { async compile() { return null; } },
    cognitiveRuntime: { async appendSystemEvent() {}, async run() { return { text: "unused" }; } },
    channelDeliveryOutbox: null,
    acceptedRequests: null,
    journal: { async record() { return true; } },
  });
  const receipt = await coordinator.receive(
    { kind: "url", value: "https://example.com/quality-rejection", analysisMode: "local-only" },
    { ownerKey: "owner", channel: "weixin", messageId: "wx-quality", replyTarget: { toUserId: "owner" } },
  );
  await scheduled.shift()();

  const workflow = await store.get(receipt.workflow.id);
  assert.equal(workflow.stage, "rejected");
  assert.equal(workflow.pendingAction, undefined);
  assert.equal(workflow.nextRetryAt, undefined);
  assert.equal(workflow.lastError, undefined);
  assert.equal((await workflowOutbox.findLatest({ workflowId: workflow.id, targetChannel: "weixin" })).status, "pending");
  assert.equal((await workflowOutbox.findLatest({ workflowId: workflow.id, targetChannel: "main-session" })).status, "pending");
  assert.equal((await coordinator.recover()).scheduled, 0);
});

test("duplicate Workflow creates one replay for a terminally failed final event and a safe status event when no final event exists", async (t) => {
  const failedCase = await buildWorkflowDuplicateRuntime(t);
  const failedFirst = await failedCase.coordinator.receive(
    { kind: "url", value: "https://example.com/workflow-terminal-replay" },
    { ownerKey: "owner", channel: "weixin", messageId: "wx-terminal-original", replyTarget: { toUserId: "stale-owner" } },
  );
  const failedEvent = await failedCase.workflowOutbox.enqueue({
    workflowId: failedFirst.workflow.id,
    eventType: "workflow.reported",
    ownerKey: "owner",
    targetChannel: "weixin",
    redactedPayload: { text: "最终结果" },
    idempotencyKey: `${failedFirst.workflow.id}:reported`,
  });
  await failedCase.workflowOutbox.deliverDue(async () => ({ delivered: false, retryable: false, reason: "CHANNEL_PERMANENTLY_UNAVAILABLE" }));
  assert.equal((await failedCase.workflowOutbox.findLatest({ workflowId: failedFirst.workflow.id, targetChannel: "weixin" })).status, "failed_terminal");

  await failedCase.coordinator.receive(
    { kind: "url", value: "https://example.com/workflow-terminal-replay" },
    { ownerKey: "owner", channel: "weixin", messageId: "wx-terminal-replay", replyTarget: { toUserId: "stale-owner" } },
  );
  await waitForWorkflowDuplicate(async () => {
    const records = (await failedCase.workflowOutbox.list()).filter((item) => item.workflowId === failedFirst.workflow.id);
    return records.length === 2 && records.some((item) => item.eventType === "workflow.reported.replay" && item.status === "delivered");
  }, "failed terminal replay was not delivered");
  const replayRecords = (await failedCase.workflowOutbox.list()).filter((item) => item.workflowId === failedFirst.workflow.id);
  assert.equal(replayRecords.length, 2);
  assert.ok(replayRecords.some((item) => item.eventId === failedEvent.eventId && item.status === "failed_terminal"));
  assert.ok(replayRecords.some((item) => item.eventType === "workflow.reported.replay" && item.status === "delivered"));
  assert.equal(failedCase.sent.length, 1);
  assert.equal(failedCase.sent[0].message.text, "最终结果");

  const failedReplayCase = await buildWorkflowDuplicateRuntime(t, {
    deliveryResult: { delivered: false, retryable: false, reason: "CHANNEL_PERMANENTLY_UNAVAILABLE" },
  });
  const failedReplayFirst = await failedReplayCase.coordinator.receive(
    { kind: "url", value: "https://example.com/workflow-terminal-replay-idempotent" },
    { ownerKey: "owner", channel: "weixin", messageId: "wx-terminal-original-2", replyTarget: { toUserId: "stale-owner" } },
  );
  await failedReplayCase.workflowOutbox.enqueue({
    workflowId: failedReplayFirst.workflow.id,
    eventType: "workflow.reported",
    ownerKey: "owner",
    targetChannel: "weixin",
    redactedPayload: { text: "最终结果" },
    idempotencyKey: `${failedReplayFirst.workflow.id}:reported`,
  });
  await failedReplayCase.workflowOutbox.deliverDue(async () => ({ delivered: false, retryable: false, reason: "CHANNEL_PERMANENTLY_UNAVAILABLE" }));
  for (const messageId of ["wx-terminal-replay-2", "wx-terminal-replay-2"]) {
    await failedReplayCase.coordinator.receive(
      { kind: "url", value: "https://example.com/workflow-terminal-replay-idempotent" },
      { ownerKey: "owner", channel: "weixin", messageId, replyTarget: { toUserId: "stale-owner" } },
    );
    await waitForWorkflowDuplicate(async () => {
      const records = (await failedReplayCase.workflowOutbox.list()).filter((item) => item.workflowId === failedReplayFirst.workflow.id);
      return records.length === 2
        && records.some((item) => item.eventType === "workflow.reported.replay" && item.status === "failed_terminal");
    }, "same message replay did not settle exactly once");
  }
  assert.equal(failedReplayCase.sent.length, 1);

  const statusCase = await buildWorkflowDuplicateRuntime(t);
  const statusFirst = await statusCase.coordinator.receive(
    { kind: "url", value: "https://example.com/workflow-status-replay" },
    { ownerKey: "owner", channel: "weixin", messageId: "wx-status-original", replyTarget: { toUserId: "stale-owner" } },
  );
  await statusCase.store.update(statusFirst.workflow.id, { stage: "rejected" });
  await statusCase.coordinator.receive(
    { kind: "url", value: "https://example.com/workflow-status-replay" },
    { ownerKey: "owner", channel: "weixin", messageId: "wx-status-original", replyTarget: { toUserId: "stale-owner" } },
  );
  await waitForWorkflowDuplicate(() => statusCase.sent.length === 1, "terminal status replay was not delivered");
  assert.equal(statusCase.sent.length, 1);
  assert.match(statusCase.sent[0].message.text, /当前状态：已拒收/);
  assert.equal((await statusCase.workflowOutbox.findLatest({ workflowId: statusFirst.workflow.id, targetChannel: "weixin" })).eventType, "workflow.status_replay");
});

test("a persistently rejected proactive bundle exhausts attempts to terminal and raises observable signals", async (t) => {
  const { runtime, outbox, clockState, recorded, sent } = await buildDrainRuntime(t);
  const enqueued = await outbox.enqueue({
    sourceType: "proactive_bundle",
    sourceId: "bundle-exhaust",
    ownerKey: "local-user",
    targetChannel: "weixin",
    responseKind: "proactive",
    deliveryKey: "bundle-exhaust:weixin:v1",
    payload: { signalVersions: [{ kind: "ingest-pending", title: "x" }] },
    dueAt: clockState.now.toISOString(),
  });
  // 推进 8 次投递（每次后把时钟拨过 backoff 上限 15min），第 8 次达上限转 terminal。
  for (let i = 0; i < 8; i += 1) {
    await runtime.proactive.wakeDelivery();
    clockState.now = new Date(clockState.now.getTime() + 20 * 60_000);
  }
  const retryableEvents = recorded.filter((r) => r.event === "proactive.bundle.delivery_failed_retryable");
  const terminalEvents = recorded.filter((r) => r.event === "proactive.bundle.delivery_failed_terminal");
  assert.equal(retryableEvents.length, 7);
  assert.ok(retryableEvents.every((r) => r.level === "warning"), "每次可重试失败记 warning");
  assert.equal(terminalEvents.length, 1);
  assert.equal(terminalEvents[0].level, "error");
  assert.equal((await outbox.get(enqueued.event.eventId)).status, "failed_terminal");

  const alerts = sent.filter((s) => s.source === "system-health");
  assert.ok(alerts.some((s) => s.level === "error"), "达上限应跨渠道弹 error 级告警");

  const health = await routeSynoApi(runtime, { method: "GET" }, new URL("http://localhost/api/syno/health"), async () => ({}));
  assert.equal(health.deliveryConsecutiveFailures, 8);
  assert.equal(health.deliveryOk, false);
});

test("an accepted_request final terminal delivery pushes the request to failed_terminal (no orphan)", async (t) => {
  const { runtime, outbox, clockState, acceptedUpdates } = await buildDrainRuntime(t, { terminalResult: { retryable: false, reason: "REJECTED" } });
  const enqueued = await outbox.enqueue({
    sourceType: "accepted_request",
    sourceId: "request-orphan",
    ownerKey: "local-user",
    targetChannel: "weixin",
    responseKind: "final",
    deliveryKey: "accepted-terminal-1",
    payload: { text: "FINAL" },
    dueAt: clockState.now.toISOString(),
  });
  await runtime.proactive.wakeDelivery();
  assert.equal((await outbox.get(enqueued.event.eventId)).status, "failed_terminal");
  assert.deepEqual(acceptedUpdates, [{ id: "request-orphan", patch: { status: "failed_terminal", claim: null } }]);
});

test("preview deliveryHealth sums consecutive failed attempts and surfaces the newest error", async (t) => {
  const stateFile = await tempState(t, "syno-proactive-health-");
  const root = path.dirname(stateFile);
  const clockState = { now: new Date("2026-08-02T08:00:00.000Z") };
  const outbox = new ChannelDeliveryOutbox({
    root: path.join(root, "outbox"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "outbox.lock"),
    clock: () => clockState.now,
    protect: async (value) => value,
    unprotect: async (value) => value,
  });
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { throw new Error("preview must not invoke the model"); } },
    today: { async snapshot() { throw new Error("preview must not render user content"); } },
    channels: { homeChannel: "weixin", async send() { throw new Error("preview must not send"); } },
    channelDeliveryOutbox: outbox,
    signalEngine: new SignalEngine({ schedule: { morningHour: 99, eveningHour: 99, weeklyDay: 6, maxDailyNotifications: 3 } }),
    stateFile,
  });
  await outbox.enqueue({
    sourceType: "proactive_bundle",
    sourceId: "bundle-health",
    ownerKey: "local-user",
    targetChannel: "weixin",
    responseKind: "proactive",
    deliveryKey: "bundle-health:weixin:v1",
    payload: { signalVersions: [{ kind: "ingest-pending", title: "x" }] },
    dueAt: clockState.now.toISOString(),
  });
  // 同一事件失败 3 次（attempts 累加到 3），deliveryHealth.consecutiveFailures 应为 attempts 累加值（与 health 计数器同口径）。
  for (let i = 0; i < 3; i += 1) {
    await outbox.deliverDue(async () => ({ retryable: true, reason: "provider_rejected" }));
    clockState.now = new Date(clockState.now.getTime() + 20 * 60_000);
  }
  const preview = await proactive.preview({ now: clockState.now, highValueEvents: [] });
  assert.equal(preview.deliveryHealth.homeChannel, "weixin");
  assert.equal(preview.deliveryHealth.consecutiveFailures, 3);
  assert.equal(preview.deliveryHealth.lastDeliveryError, "provider_rejected");
});
