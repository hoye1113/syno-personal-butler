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

async function tempState(t, prefix) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return path.join(root, "proactive.json");
}

function makeProactive(t, { messages, homeChannel = "weixin", signalSources, agentText, signalEngine, eventsLog, notifications } = {}) {
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
  await proactive.tick({
    now: new Date("2026-07-30T08:30:00+08:00"),
    highValueEvents: [{ id: "ingest-pending:legacy", kind: "ingest-pending", title: "旧待办", priority: 75, ref: { status: "pending" } }],
  });
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
  await proactive.tick({
    now: new Date("2026-07-30T08:30:00+08:00"),
    highValueEvents: [{ id: "ingest-pending:audit", kind: "ingest-pending", title: "审计中已有", priority: 75, ref: { status: "pending" } }],
  });
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
