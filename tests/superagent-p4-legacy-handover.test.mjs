// P4.3-B: isolated contract tests for the legacy Host freeze/reply bridge.
// No Feishu connection, Host, Worker or model is started here.
process.env.NODE_ENV = "test";

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import {
  applyRoute,
  acceptDelivery,
  claimDelivery,
  createTask,
  executeNative,
  finalizeTask,
  openBusinessView,
  recordVerification,
  reportWorkerDone,
} from "../../syno-autoloop-p0/examples/syno-p0/commands.ts";
import { rows } from "../../syno-autoloop-p0/kernel/evolve.ts";
import { parseRules } from "../../syno-autoloop-p0/protocol/rules.ts";
import { createSynoRuntime } from "../apps/syno/syno/runtime.mjs";
import {
  CONFIG_ERROR,
  RealFeishuConfigError,
} from "../experiments/superagent-p0/real-feishu-config.mjs";
import {
  LEGACY_DEFAULT_REPLY_TEXT,
  LEGACY_HANDOVER_ERROR,
  LEGACY_REPLY_SOURCE,
  LEGACY_REPLY_TYPE,
  LegacyHandoverError,
  assertLegacyHandoverPaths,
  createLegacyHandoverShutdown,
  installLegacyHandoverSignals,
  openLegacyProductionHandover,
  resolveLegacyHandoverStartup,
} from "../experiments/superagent-p0/legacy-production-handover.mjs";
import { openHostHandover } from "../experiments/superagent-p0/host-handover.mjs";
import { buildHostStatus, buildMigrationSnapshot } from "../experiments/superagent-p0/host-operations.mjs";
import { planMigration } from "../experiments/superagent-p0/migration-rehearsal.mjs";
import { evaluateDatabasePreflight } from "../experiments/superagent-p0/production-handover-preflight.mjs";
import {
  EXPECTATION_SCHEMA,
  collectHandoverEvidence,
  verifyHandoverEvidence,
} from "../experiments/superagent-p0/production-handover-evidence.mjs";

const APP_ID = "cli_test";
const CHAT_ID = "oc_test";
const OWNER_ID = "ou_test";
const ENV = { secret: "syno-p43b-isolated-test", publicUrl: "" };
const NOW = 1000;
const SERVER = fileURLToPath(new URL("../apps/syno/server.mjs", import.meta.url));

function temporaryRoot() {
  return mkdtempSync(path.join(tmpdir(), "syno-p43b-legacy-"));
}

function pathsFor(root) {
  return {
    databasePath: path.join(root, "runtime", "p3-decision-memory.db"),
    statusFile: path.join(root, "runtime", "host-status.json"),
  };
}

function openDatabase(file) {
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  openBusinessView(db);
  return db;
}

// The evidence tool refuses WAL files; after every writer is closed, convert the copy in place.
function makeStatic(file) {
  const db = new DatabaseSync(file);
  try {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE;");
  } finally {
    db.close();
  }
}

function readRecords(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return rows(openBusinessView(db), "records");
  } finally {
    db.close();
  }
}

function readEvents(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return rows(openBusinessView(db), "events");
  } finally {
    db.close();
  }
}

function readContext(file, contextId) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return openBusinessView(db).get("records", `context:${contextId}`) ?? null;
  } finally {
    db.close();
  }
}

function readRuns(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return rows(openBusinessView(db), "runs");
  } finally {
    db.close();
  }
}

const eventsOf = (file, messageId) => readEvents(file).filter((event) => event.key === messageId);
const inboxesOf = (file, messageId) => readRecords(file)
  .filter((row) => row.kind === "inbox" && row.id === messageId);

function factCount(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return Number(db.prepare("SELECT COUNT(*) AS count FROM facts").get().count);
  } finally {
    db.close();
  }
}

const replyOf = (file, messageId) => readRecords(file)
  .filter((row) => row.kind === "handover_reply" && row.messageId === messageId);

const spoolsOf = (file, messageId = null) => readRecords(file)
  .filter((row) => row.kind === "handover_spool" && (messageId === null || row.messageId === messageId));

const message = (id, overrides = {}) => ({
  channel: "feishu",
  id,
  senderId: OWNER_ID,
  chatId: CHAT_ID,
  text: `PRIVATE_TEXT_${id}`,
  ...overrides,
});

function factory(root, instanceId) {
  // No fixture pre-configuration: a fresh DB only gets openBusinessView, exactly like a real first boot.
  return openLegacyProductionHandover({ ...pathsFor(root), appId: APP_ID, instanceId, pid: 4242, now: () => NOW });
}

// ---------------------------------------------------------------------------
// 1. Runtime wiring
// ---------------------------------------------------------------------------

test("默认 Runtime 的飞书 onMessage 仍直接调用旧 handler", async () => {
  const seen = [];
  const runtime = createSynoRuntime({
    channelConversationHandler: { handle: async (incoming) => { seen.push(incoming); return { text: "legacy-default" }; } },
  });
  assert.equal(typeof runtime.feishu.onMessage, "function");
  const result = await runtime.feishu.onMessage(message("om_default"));
  assert.deepEqual(result, { text: "legacy-default" });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].channel, "feishu");
  assert.equal(seen[0].ownerKey, "local-user");
  assert.equal(seen[0].threadKey, "main");
  assert.equal(seen[0].text, "PRIVATE_TEXT_om_default");
});

test("启用 legacyHandover 时 onMessage 经桥调用旧 handler，deliver 复用同一个 feishu.send", async () => {
  const calls = [];
  const runtime = createSynoRuntime({
    channelConversationHandler: { handle: async (incoming) => ({ text: `旧回复:${incoming.text}` }) },
    legacyHandover: {
      handleMessage: async (...args) => {
        calls.push(args);
        return { deferredDelivery: true };
      },
    },
  });
  const incoming = message("om_wire");
  const result = await runtime.feishu.onMessage(incoming);
  assert.deepEqual(result, { deferredDelivery: true });
  assert.equal(calls.length, 1);
  const [bridged, delegate, deliver] = calls[0];
  assert.equal(bridged, incoming);
  assert.deepEqual(await delegate(incoming), { text: "旧回复:PRIVATE_TEXT_om_wire" });
  const delivered = await deliver({ text: "桥发送" });
  // 未连接的 adapter 只回报 not_connected；重点是不触网且复用同一个 send。
  assert.equal(delivered.delivered, false);
  assert.equal(delivered.reason, "not_connected");
});

// ---------------------------------------------------------------------------
// 2. Immediate replies
// ---------------------------------------------------------------------------

test("immediate 只调旧 delegate／deliver 各一次，自动留下安全历史事实且 reply 属于旧 instance", async () => {
  const root = temporaryRoot();
  const { databasePath } = pathsFor(root);
  let delegates = 0;
  let deliveries = 0;
  let historyAtDelivery = null;
  const bridge = factory(root, "host-old");
  try {
    const result = await bridge.handleMessage(
      message("om_immediate"),
      async () => { delegates += 1; return { text: "legacy-answer" }; },
      async () => {
        deliveries += 1;
        historyAtDelivery = {
          events: eventsOf(databasePath, "om_immediate").length,
          inboxes: inboxesOf(databasePath, "om_immediate").length,
        };
        return { delivered: true, providerMessageId: "pm-1" };
      },
    );
    assert.deepEqual(result, { deferredDelivery: true });
    assert.equal(delegates, 1);
    assert.equal(deliveries, 1);
    // Event/inbox must already be durable before the external send is attempted.
    assert.deepEqual(historyAtDelivery, { events: 1, inboxes: 1 });
    const [reply] = replyOf(databasePath, "om_immediate");
    assert.equal(reply.state, "accepted");
    assert.equal(reply.ownerInstanceId, "host-old");
    assert.equal(reply.providerMessageId, "pm-1");
    assert.equal(reply.text, "legacy-answer");

    // Before evidence comes from the bridge itself: one safe event, one processed inbox, no domain chain.
    const events = eventsOf(databasePath, "om_immediate");
    assert.equal(events.length, 1);
    assert.equal(events[0].source, LEGACY_REPLY_SOURCE);
    assert.equal(events[0].type, LEGACY_REPLY_TYPE);
    assert.equal(events[0].subject, "capture:legacy_reply_om_immediate");
    assert.equal(JSON.stringify(events[0]).includes("PRIVATE"), false);
    assert.equal(JSON.stringify(events[0]).includes("legacy-answer"), false);
    const inboxes = inboxesOf(databasePath, "om_immediate");
    assert.equal(inboxes.length, 1);
    assert.equal(inboxes[0].receipt.contextId, "capture:legacy_reply_om_immediate");
    assert.equal(inboxes[0].receipt.version, 1);
    assert.equal(readContext(databasePath, "capture:legacy_reply_om_immediate").version, 1);
    assert.deepEqual(
      readRecords(databasePath).filter((row) => ["task", "attempt", "delivery"].includes(row.kind)),
      [],
    );
  } finally {
    bridge.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("全新空统一 DB 无需任何测试预配置即可 open 桥并完成 immediate", async () => {
  const root = temporaryRoot();
  const { databasePath, statusFile } = pathsFor(root);
  // 只做 schema/view 初始化：没有 rules、没有手工 event／inbox。
  const db = openDatabase(databasePath);
  const bridge = openLegacyProductionHandover({
    databasePath, statusFile, appId: APP_ID, instanceId: "host-old", pid: 4242, now: () => NOW,
  });
  let deliveries = 0;
  try {
    const baseline = openBusinessView(db).get("config", "rules");
    assert.ok(baseline, "桥必须自行建立最小 rules");
    assert.equal(baseline.value.rules.length, 0);
    assert.deepEqual(Object.keys(baseline.value.sources), ["schedule"]);
    assert.deepEqual(baseline.value.agents, {});

    const result = await bridge.handleMessage(
      message("om_empty_db"),
      async () => ({ text: "fresh answer" }),
      async () => { deliveries += 1; return { delivered: true }; },
    );
    assert.deepEqual(result, { deferredDelivery: true });
    assert.equal(deliveries, 1);

    const events = eventsOf(databasePath, "om_empty_db");
    assert.equal(events.length, 1);
    assert.equal(events[0].source, LEGACY_REPLY_SOURCE);
    assert.equal(events[0].type, LEGACY_REPLY_TYPE);
    assert.equal(JSON.stringify(events[0]).includes("PRIVATE"), false);
    const inboxes = inboxesOf(databasePath, "om_empty_db");
    assert.equal(inboxes.length, 1);
    assert.equal(inboxes[0].receipt.contextId, "capture:legacy_reply_om_empty_db");
    assert.equal(inboxes[0].receipt.version, 1);
    assert.equal(readContext(databasePath, "capture:legacy_reply_om_empty_db").version, 1);
    assert.equal(replyOf(databasePath, "om_empty_db")[0].ownerInstanceId, "host-old");
    assert.deepEqual(
      readRecords(databasePath).filter((row) => ["task", "attempt", "delivery"].includes(row.kind)),
      [],
    );
    assert.deepEqual(readRuns(databasePath), []);
  } finally {
    bridge.close();
    db.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("已有 rules 不被桥的最小基线初始化覆盖", async () => {
  const root = temporaryRoot();
  const { databasePath, statusFile } = pathsFor(root);
  const db = openDatabase(databasePath);
  configureRules(db, root);
  const before = openBusinessView(db).get("config", "rules");
  const facts = factCount(databasePath);
  const bridge = openLegacyProductionHandover({
    databasePath, statusFile, appId: APP_ID, instanceId: "host-old", pid: 4242, now: () => NOW,
  });
  try {
    const after = openBusinessView(db).get("config", "rules");
    assert.equal(after.version, before.version);
    assert.deepEqual(after.value, before.value);
    assert.equal(after.value.rules.some((rule) => rule.name === "domain-task"), true);
    assert.equal(factCount(databasePath), facts);
  } finally {
    bridge.close();
    db.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("旧 delegate 返回缺省文案时沿用 adapter 的同一文案", async () => {
  const root = temporaryRoot();
  const { databasePath } = pathsFor(root);
  const bridge = factory(root, "host-old");
  try {
    await bridge.handleMessage(message("om_default_text"), async () => ({}), async () => ({ delivered: true }));
    assert.equal(replyOf(databasePath, "om_default_text")[0].text, LEGACY_DEFAULT_REPLY_TEXT);
  } finally {
    bridge.close();
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 3. No double send / failures become holds
// ---------------------------------------------------------------------------

test("旧 deferred 不额外发送，旧 delegate 抛错不产生 accepted reply", async () => {
  const root = temporaryRoot();
  const { databasePath } = pathsFor(root);
  const bridge = factory(root, "host-old");
  let deliveries = 0;
  try {
    const deferred = await bridge.handleMessage(
      message("om_deferred"),
      async () => ({ deferredDelivery: true, text: "never send" }),
      async () => { deliveries += 1; return { delivered: true }; },
    );
    assert.equal(deferred.deferredDelivery, true);
    assert.equal(deferred.text, "never send");
    assert.equal(deliveries, 0);
    assert.equal(replyOf(databasePath, "om_deferred").length, 0);
    assert.equal(eventsOf(databasePath, "om_deferred").length, 0);
    assert.equal(inboxesOf(databasePath, "om_deferred").length, 0);

    await assert.rejects(
      bridge.handleMessage(message("om_throw"), async () => { throw new Error("legacy failure"); }, async () => ({ delivered: true })),
      /legacy failure/,
    );
    assert.equal(replyOf(databasePath, "om_throw").length, 0);
    assert.equal(eventsOf(databasePath, "om_throw").length, 0);
    assert.equal(inboxesOf(databasePath, "om_throw").length, 0);
    assert.equal(deliveries, 0);
  } finally {
    bridge.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("delivered false 或 deliver 抛错形成 hold，重复处理不再发送", async () => {
  const root = temporaryRoot();
  const { databasePath } = pathsFor(root);
  const bridge = factory(root, "host-old");
  let falseDeliveries = 0;
  let throwDeliveries = 0;
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await bridge.handleMessage(
        message("om_false"),
        async () => ({ text: "held answer" }),
        async () => { falseDeliveries += 1; return { delivered: false, reason: "not_connected" }; },
      );
      assert.deepEqual(result, { deferredDelivery: true });
    }
    assert.equal(falseDeliveries, 1);
    const [held] = replyOf(databasePath, "om_false");
    assert.equal(held.state, "hold");

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await bridge.handleMessage(
        message("om_deliver_throw"),
        async () => ({ text: "throw answer" }),
        async () => { throwDeliveries += 1; throw new Error("send exploded"); },
      );
      assert.deepEqual(result, { deferredDelivery: true });
    }
    assert.equal(throwDeliveries, 1);
    const [thrown] = replyOf(databasePath, "om_deliver_throw");
    assert.equal(thrown.state, "hold");
    assert.equal(replyOf(databasePath, "om_deliver_throw").length, 1);
  } finally {
    bridge.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("重复 immediate 不新增 event／inbox，也不推进 Context", async () => {
  const root = temporaryRoot();
  const { databasePath } = pathsFor(root);
  const bridge = factory(root, "host-old");
  let deliveries = 0;
  const run = () => bridge.handleMessage(
    message("om_repeat"),
    async () => ({ text: "repeat answer" }),
    async () => { deliveries += 1; return { delivered: true }; },
  );
  try {
    await run();
    const contextId = "capture:legacy_reply_om_repeat";
    const facts = factCount(databasePath);
    assert.equal(readContext(databasePath, contextId).version, 1);

    await run();
    assert.equal(deliveries, 1);
    assert.equal(eventsOf(databasePath, "om_repeat").length, 1);
    assert.equal(inboxesOf(databasePath, "om_repeat").length, 1);
    assert.equal(readContext(databasePath, contextId).version, 1);
    assert.equal(factCount(databasePath), facts);
    assert.equal(replyOf(databasePath, "om_repeat")[0].state, "accepted");
  } finally {
    bridge.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("历史事实写入冲突时失败关闭且不调用外部 deliver", async () => {
  const root = temporaryRoot();
  const { databasePath } = pathsFor(root);
  const db = openDatabase(databasePath);
  const bridge = factory(root, "host-old");
  let deliveries = 0;
  try {
    // 同一 per-message context 已被别的路由推进到 v1，expectedVersion=null 的记录必须冲突。
    inboundEvent(db, "om_conflict_seed", "reply.request", "capture:legacy_reply_om_conflict");
    applyRoute(db, {
      commandId: "route-om_conflict_seed",
      appId: APP_ID,
      messageId: "om_conflict_seed",
      contextId: "capture:legacy_reply_om_conflict",
      expectedVersion: null,
      ownerId: OWNER_ID,
      replyTo: CHAT_ID,
      now: NOW,
    });
    await assert.rejects(bridge.handleMessage(
      message("om_conflict"),
      async () => ({ text: "must not send" }),
      async () => { deliveries += 1; return { delivered: true }; },
    ));
    assert.equal(deliveries, 0);
    assert.equal(replyOf(databasePath, "om_conflict").length, 0);
    assert.equal(inboxesOf(databasePath, "om_conflict").length, 0);
  } finally {
    bridge.close();
    db.close();
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 4. Freeze gate
// ---------------------------------------------------------------------------

test("freeze 后 before 已由旧 owner 完成，during 只 spool 且重复零新增", async () => {
  const root = temporaryRoot();
  const { databasePath } = pathsFor(root);
  const bridge = factory(root, "host-old");
  let delegateCalls = 0;
  let deliverCalls = 0;
  try {
    await bridge.handleMessage(
      message("om_before"),
      async () => { delegateCalls += 1; return { text: "before done" }; },
      async () => { deliverCalls += 1; return { delivered: true }; },
    );
    assert.equal(replyOf(databasePath, "om_before")[0].ownerInstanceId, "host-old");

    const frozen = bridge.freeze("cutover");
    assert.equal(frozen.status, "frozen");
    assert.equal(frozen.control.generation, 1);

    const result = await bridge.handleMessage(
      message("om_during"),
      async () => { delegateCalls += 1; return { text: "must not run" }; },
      async () => { deliverCalls += 1; return { delivered: true }; },
    );
    assert.deepEqual(result, { deferredDelivery: true });
    assert.equal(delegateCalls, 1);
    assert.equal(deliverCalls, 1);
    assert.equal(replyOf(databasePath, "om_during").length, 0);
    const tasks = readRecords(databasePath).filter((row) => row.kind === "task");
    assert.equal(tasks.length, 0);
    const status = bridge.handover.status();
    assert.equal(status.frozen, true);
    assert.equal(status.generation, 1);
    assert.equal(status.spool.counts.frozen, 1);
    assert.equal(status.pending[0].freezeGeneration, 1);

    const facts = factCount(databasePath);
    await bridge.handleMessage(message("om_during"), async () => { throw new Error("no"); }, async () => { throw new Error("no"); });
    assert.equal(factCount(databasePath), facts);
    assert.equal(spoolsOf(databasePath, "om_during").length, 1);
    assert.equal(bridge.handover.status().spool.counts.frozen, 1);
  } finally {
    bridge.close();
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 5. Reopen / close semantics
// ---------------------------------------------------------------------------

test("重开同一 DB 不 unfreeze／recover／drain，旧 close 后 pending spool 保留", async () => {
  const root = temporaryRoot();
  const { databasePath, statusFile } = pathsFor(root);
  const first = factory(root, "host-old");
  try {
    first.freeze("cutover");
    await first.handleMessage(message("om_pending"), async () => { throw new Error("no delegate"); }, async () => { throw new Error("no deliver"); });
    first.close();
  } finally {
    // keep root for reopen
  }
  const closedStatus = JSON.parse(readFileSync(statusFile, "utf8"));
  assert.equal(closedStatus.running, false);
  assert.equal(closedStatus.lifecycle, "stopped");
  assert.equal(closedStatus.frozen, true);

  const second = factory(root, "host-new");
  try {
    const status = second.handover.status();
    assert.equal(status.frozen, true);
    assert.equal(status.generation, 1);
    assert.equal(status.spool.counts.frozen, 1);
    assert.equal(status.spool.counts.forwarded, 0);
    const [spool] = spoolsOf(databasePath, "om_pending");
    assert.equal(spool.state, "frozen");
    assert.equal(spool.attempts, 0);
    assert.equal(spool.ownerInstanceId, null);
    assert.equal(replyOf(databasePath, "om_pending").length, 0);
  } finally {
    second.close();
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 6. Host status
// ---------------------------------------------------------------------------

test("host-status 脱敏、计数与 DB 一致，连续只读刷新不新增事实", async () => {
  const root = temporaryRoot();
  const { databasePath, statusFile } = pathsFor(root);
  const bridge = factory(root, "host-old");
  try {
    await bridge.handleMessage(message("om_status_reply"), async () => ({ text: "PRIVATE_REPLY_BODY" }), async () => ({ delivered: true }));
    bridge.freeze("status");
    await bridge.handleMessage(message("om_status_spool"), async () => { throw new Error("no"); }, async () => { throw new Error("no"); });

    const status = bridge.refreshStatus();
    const persisted = JSON.parse(readFileSync(statusFile, "utf8"));
    assert.deepEqual(persisted, status);
    assert.equal(status.schema, "syno-host-status-v1");
    assert.equal(status.instanceId, "host-old");
    assert.equal(status.pid, 4242);
    assert.equal(status.appId, APP_ID);
    assert.equal(status.running, true);
    assert.equal(status.observedAt, NOW);
    assert.equal(status.frozen, true);
    assert.equal(status.handover.spool.counts.frozen, 1);
    assert.equal(status.handover.replies.counts.accepted, 1);
    assert.equal(status.handover.pendingCount, 1);
    const text = JSON.stringify(status);
    assert.equal(text.includes("PRIVATE_"), false);

    const facts = factCount(databasePath);
    const left = bridge.refreshStatus();
    const right = bridge.refreshStatus();
    assert.deepEqual(left, right);
    assert.equal(factCount(databasePath), facts);

    bridge.close();
    const stopped = JSON.parse(readFileSync(statusFile, "utf8"));
    assert.equal(stopped.running, false);
    assert.equal(stopped.frozen, true);
    assert.equal(JSON.stringify(stopped).includes("PRIVATE_"), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 7. Server startup gate, signals and shutdown order
// ---------------------------------------------------------------------------

const productionEnv = (base) => {
  const root = path.join(base, "runtime-work");
  return {
    SYNO_P0_RUNTIME_MODE: "production",
    SYNO_P4_LEGACY_HANDOVER: "enabled",
    SYNO_P0_APP_ID: "cli_aa1234567890beef",
    SYNO_P0_ROOT: root,
    SYNO_P0_KNOWLEDGE_ROOT: path.join(base, "knowledge"),
    SYNO_P0_LOCAL_DATA_ROOT: path.join(base, "local-data"),
    SYNO_P0_RUNTIME_ROOT: path.join(root, "runtime"),
  };
};

const expectLegacyError = (run, code) => assert.throws(run, (error) => {
  assert.ok(error instanceof LegacyHandoverError, `应为 LegacyHandoverError，实际 ${error?.name}`);
  assert.equal(error.code, code);
  return true;
});

const expectConfigError = (run, code) => assert.throws(run, (error) => {
  assert.ok(error instanceof RealFeishuConfigError, `应为 RealFeishuConfigError，实际 ${error?.name}`);
  assert.equal(error.code, code);
  return true;
});

test("启动门禁：默认/隔离保持旧行为，半配置生产显式开关失败关闭", () => {
  const base = mkdtempSync(path.join(tmpdir(), "syno-p43b-config-"));
  try {
    assert.equal(resolveLegacyHandoverStartup({}), null);
    assert.equal(resolveLegacyHandoverStartup({ SYNO_P0_RUNTIME_MODE: "isolated-test" }), null);
    expectLegacyError(
      () => resolveLegacyHandoverStartup({ SYNO_P0_RUNTIME_MODE: "production" }),
      LEGACY_HANDOVER_ERROR.DISABLED,
    );
    expectLegacyError(
      () => resolveLegacyHandoverStartup({ SYNO_P4_LEGACY_HANDOVER: "enabled" }),
      LEGACY_HANDOVER_ERROR.MODE_REQUIRED,
    );
    expectConfigError(
      () => resolveLegacyHandoverStartup({ ...productionEnv(base), SYNO_P0_APP_ID: "" }),
      CONFIG_ERROR.MISSING_APP_ID,
    );
    expectConfigError(
      () => resolveLegacyHandoverStartup({ ...productionEnv(base), SYNO_P0_APP_ID: "cli_aa77744deff89c02" }),
      CONFIG_ERROR.PRODUCTION_TEST_APP,
    );
    assert.throws(
      () => resolveLegacyHandoverStartup({ ...productionEnv(base), SYNO_P0_RUNTIME_ROOT: "" }),
      (error) => error instanceof RealFeishuConfigError,
    );

    const config = resolveLegacyHandoverStartup(productionEnv(base));
    assert.equal(config.mode, "production");
    assert.equal(config.appId, "cli_aa1234567890beef");
    assert.equal(config.databasePath, path.join(config.runtimeRoot, "p3-decision-memory.db"));
    assert.equal(config.hostStatusFile, path.join(config.runtimeRoot, "host-status.json"));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("路径一致性门禁：localData／knowledge 不一致失败关闭，规范化相等且 runtimeRoot 不同仍允许", () => {
  const base = mkdtempSync(path.join(tmpdir(), "syno-p43b-paths-"));
  try {
    const config = resolveLegacyHandoverStartup(productionEnv(base));
    const matching = {
      localDataRoot: config.localDataRoot,
      knowledgeRoot: config.knowledgeRoot,
      // 旧 Host 的 .runtime 与 config.runtimeRoot 不同是允许的，两个消费者各用各的运行态。
      runtimeRoot: path.join(base, "legacy-runtime", ".runtime"),
    };
    assert.equal(assertLegacyHandoverPaths({ config, paths: matching }), config);
    // 未配置／隔离模式不增加限制。
    assert.equal(assertLegacyHandoverPaths({ config: null, paths: matching }), null);
    // path.resolve 归一：尾部分隔符与 `.`／`..` 段视为同一目录。
    assert.doesNotThrow(() => assertLegacyHandoverPaths({
      config,
      paths: {
        ...matching,
        localDataRoot: `${config.localDataRoot}${path.sep}.`,
        knowledgeRoot: path.join(config.knowledgeRoot, "nested", ".."),
      },
    }));

    expectLegacyError(
      () => assertLegacyHandoverPaths({ config, paths: { ...matching, localDataRoot: path.join(base, "other-local") } }),
      LEGACY_HANDOVER_ERROR.LOCAL_DATA_MISMATCH,
    );
    expectLegacyError(
      () => assertLegacyHandoverPaths({ config, paths: { ...matching, knowledgeRoot: path.join(base, "other-knowledge") } }),
      LEGACY_HANDOVER_ERROR.KNOWLEDGE_MISMATCH,
    );
    // 错误只提示变量名，不回显真实路径。
    const error = (() => {
      try {
        assertLegacyHandoverPaths({ config, paths: { ...matching, localDataRoot: path.join(base, "other-local") } });
      } catch (failure) {
        return failure;
      }
      return null;
    })();
    assert.equal(error instanceof LegacyHandoverError, true);
    assert.equal(error.message.includes(base), false);
    assert.match(error.message, /SYNO_LOCAL_DATA/);
    assert.match(error.message, /SYNO_P0_LOCAL_DATA_ROOT/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("SIGUSR1 只 freeze，SIGUSR2 只刷新；失败以脱敏码记录", () => {
  const calls = [];
  const errors = [];
  const target = new EventEmitter();
  const bridge = {
    freeze: (reason) => { calls.push(`freeze:${reason}`); },
    refreshStatus: (extra) => { calls.push(`refresh:${extra?.signal ?? extra?.running ?? "manual"}`); },
  };
  const uninstall = installLegacyHandoverSignals({ target, bridge, logger: { error: (line) => errors.push(line) } });
  target.emit("SIGUSR1");
  target.emit("SIGUSR2");
  assert.deepEqual(calls, ["freeze:sigusr1-freeze", "refresh:sigusr2"]);
  assert.deepEqual(errors, []);

  const failing = new EventEmitter();
  installLegacyHandoverSignals({
    target: failing,
    bridge: {
      freeze: () => { throw Object.assign(new Error("SECRET_SHOULD_NOT_LEAK"), { code: "P43B_TEST_FREEZE" }); },
      refreshStatus: () => { throw Object.assign(new Error("SECRET_SHOULD_NOT_LEAK"), { code: "P43B_TEST_STATUS" }); },
    },
    logger: { error: (line) => errors.push(line) },
  });
  assert.doesNotThrow(() => failing.emit("SIGUSR1"));
  assert.doesNotThrow(() => failing.emit("SIGUSR2"));
  assert.equal(errors.some((line) => line.includes("P43B_TEST_FREEZE")), true);
  assert.equal(errors.some((line) => line.includes("P43B_TEST_STATUS")), true);
  assert.equal(errors.join("\n").includes("SECRET_SHOULD_NOT_LEAK"), false);
  uninstall();
});

test("shutdown 顺序为 runtime→bridge→HTTP→lease，任一失败仍清理并暴露错误", async () => {
  const order = [];
  const shutdown = createLegacyHandoverShutdown({
    runtime: { close: async () => { order.push("runtime"); } },
    bridge: { close: () => { order.push("bridge"); } },
    stopHttp: async () => { order.push("http"); },
    hostLease: { release: async () => { order.push("lease"); } },
  });
  await shutdown();
  assert.deepEqual(order, ["runtime", "bridge", "http", "lease"]);

  const failedOrder = [];
  const failingShutdown = createLegacyHandoverShutdown({
    runtime: { close: async () => { failedOrder.push("runtime"); throw new Error("runtime close failed"); } },
    bridge: { close: () => { failedOrder.push("bridge"); } },
    stopHttp: async () => { failedOrder.push("http"); },
    hostLease: { release: async () => { failedOrder.push("lease"); } },
  });
  await assert.rejects(failingShutdown(), (error) => {
    assert.equal(error.code, LEGACY_HANDOVER_ERROR.SHUTDOWN_FAILED);
    assert.equal(error.errors.length, 1);
    return true;
  });
  assert.deepEqual(failedOrder, ["runtime", "bridge", "http", "lease"]);
});

test("真实 server 进程在缺开关／缺路径时失败关闭且不监听", () => {
  const run = (extra) => spawnSync(process.execPath, [SERVER], {
    encoding: "utf8",
    timeout: 30_000,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: "test", PORT: "0", ...extra },
  });
  const missingFlag = run({ SYNO_P0_RUNTIME_MODE: "production" });
  assert.notEqual(missingFlag.status, 0);
  assert.match(missingFlag.stderr, /P43B_LEGACY_HANDOVER_DISABLED/);
  assert.equal(missingFlag.stdout.includes("listening"), false);

  const flagOnly = run({ SYNO_P4_LEGACY_HANDOVER: "enabled" });
  assert.notEqual(flagOnly.status, 0);
  assert.match(flagOnly.stderr, /P43B_LEGACY_HANDOVER_MODE_REQUIRED/);
  assert.equal(flagOnly.stdout.includes("listening"), false);
});

test("真实 server 进程在生产桥配置完整但旧 PATHS 不一致时监听前失败关闭", () => {
  const base = mkdtempSync(path.join(tmpdir(), "syno-p43b-server-paths-"));
  try {
    const env = productionEnv(base);
    const run = spawnSync(process.execPath, [SERVER], {
      encoding: "utf8",
      timeout: 30_000,
      // 只给 P0 配置，不给旧 SYNO_LOCAL_DATA／SYNO_KNOWLEDGE_ROOT，旧 PATHS 必然分裂。
      env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: "test", PORT: "0", ...env },
    });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /P43B_LEGACY_HANDOVER_LOCAL_DATA_MISMATCH/);
    assert.match(run.stderr, /SYNO_LOCAL_DATA/);
    assert.equal(run.stdout.includes("listening"), false);
    // 门禁在打开 DB 之前：没有创建任何 runtime 状态。
    assert.equal(existsSync(path.join(env.SYNO_P0_RUNTIME_ROOT, "p3-decision-memory.db")), false);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 8. Full before → freeze → during → new instance → after chain
// ---------------------------------------------------------------------------

function configureRules(db, cwd) {
  const rules = parseRules(JSON.stringify({
    timezone: "Asia/Shanghai",
    sources: { "feishu-test": { name: "独立测试" } },
    agents: { specialist: { name: "Specialist", worker: "syno-test", use: "command", command: ["true"] } },
    rules: [{
      name: "domain-task",
      when: { source: "feishu-test", types: ["domain.request"] },
      to: "specialist",
      cwd,
      prompt: "P4.3-B isolated fixture",
      group: "p43b",
      parallel: 1,
      tell: "never",
    }],
  }), NOW, "Asia/Shanghai");
  executeNative(db, "rules", [rules], NOW, ENV);
}

function inboundEvent(db, messageId, type, contextId = null) {
  const event = {
    id: messageId,
    type,
    summary: "P4.3-B fixture",
    detail: JSON.stringify({ appId: APP_ID, chatId: CHAT_ID, ownerId: OWNER_ID }),
    ...(contextId ? { subject: contextId } : {}),
  };
  executeNative(db, "ingest", ["feishu-test", event], NOW, ENV);
}

const digest = (text) => createHash("sha256").update(text).digest("hex");

function createDomainMessage(db, { messageId, contextId, contextVersion }) {
  inboundEvent(db, messageId, "domain.request", contextId);
  const job = executeNative(db, "claimNext", ["syno-test", `claim-${messageId}`], NOW, ENV).value;
  assert.ok(job, `claim failed for ${messageId}`);
  const routed = applyRoute(db, {
    commandId: `route-${messageId}`,
    appId: APP_ID,
    messageId,
    contextId,
    expectedVersion: null,
    ownerId: OWNER_ID,
    replyTo: CHAT_ID,
    now: NOW,
  });
  assert.equal(routed.receipt.version, contextVersion);
  const taskId = `task-${messageId}`;
  const attemptId = `attempt-${job.run}-${job.attempt}`;
  const acceptance = { path: `/isolated/${messageId}.md`, hash: digest(messageId), remoteVersion: "fixture" };
  createTask(db, { taskId, contextId, attemptId, runId: job.run, runAttempt: job.attempt, acceptance, now: NOW });
  recordVerification(db, {
    verificationId: `verification-${taskId}`,
    taskId,
    attemptId,
    actualPath: acceptance.path,
    actualHash: acceptance.hash,
    actualRemoteVersion: acceptance.remoteVersion,
    actualFileHash: acceptance.hash,
    qualityScore: 100,
    now: NOW,
  });
  reportWorkerDone(db, { taskId, attemptId, now: NOW });
  executeNative(db, "finish", [job.run, job.token, { outcome: "done", summary: "fixture" }], NOW, ENV);
  finalizeTask(db, {
    commandId: `finalize-${taskId}`,
    taskId,
    attemptId,
    contextVersion: routed.receipt.version,
    verificationId: `verification-${taskId}`,
    now: NOW,
  });
  const deliveryKey = `delivery:${taskId}:result`;
  claimDelivery(db, { deliveryKey, now: NOW });
  acceptDelivery(db, { deliveryKey, providerMessageId: null, capability: "at_least_once", now: NOW });
}

function createReplyMessage(db, messageId) {
  inboundEvent(db, messageId, "reply.request");
  applyRoute(db, {
    commandId: `route-${messageId}`,
    appId: APP_ID,
    messageId,
    contextId: `capture:reply_${messageId}`,
    expectedVersion: null,
    ownerId: OWNER_ID,
    replyTo: CHAT_ID,
    now: NOW,
  });
}

test("before 旧 owner → freeze → during spool → 新 instance drain → after 新 owner 通过 P4.2 verify", async () => {
  const root = temporaryRoot();
  const { databasePath, statusFile } = pathsFor(root);
  const db = openDatabase(databasePath);
  try {
    configureRules(db, root);
    const oldBridge = openLegacyProductionHandover({
      databasePath, statusFile, appId: APP_ID, instanceId: "host-old", pid: 1111, now: () => NOW,
    });
    try {
      // 旧 Host 自己的 rules 不能被桥的基线初始化覆盖。
      const configured = openBusinessView(db).get("config", "rules");
      assert.equal(configured.value.rules.some((rule) => rule.name === "domain-task"), true);
      await oldBridge.handleMessage(
        message("om_before"),
        async () => ({ text: "before reply" }),
        async () => ({ delivered: true }),
      );
      // before 的 event/inbox 必须由旧桥自身产生，不能再由测试手工 fixture 补齐。
      const beforeEvents = eventsOf(databasePath, "om_before");
      assert.equal(beforeEvents.length, 1);
      assert.equal(beforeEvents[0].source, LEGACY_REPLY_SOURCE);
      assert.equal(beforeEvents[0].type, LEGACY_REPLY_TYPE);
      assert.equal(JSON.stringify(beforeEvents[0]).includes("PRIVATE"), false);
      const beforeInboxes = inboxesOf(databasePath, "om_before");
      assert.equal(beforeInboxes.length, 1);
      assert.equal(beforeInboxes[0].receipt.contextId, "capture:legacy_reply_om_before");
      assert.equal(beforeInboxes[0].receipt.version, 1);
      assert.equal(readContext(databasePath, "capture:legacy_reply_om_before").version, 1);
      assert.equal(replyOf(databasePath, "om_before")[0].ownerInstanceId, "host-old");
      assert.deepEqual(
        readRecords(databasePath).filter((row) => ["task", "attempt", "delivery"].includes(row.kind)),
        [],
      );

      createDomainMessage(db, { messageId: "om_during", contextId: "capture:during", contextVersion: 1 });
      oldBridge.freeze("cutover");
      const spooled = await oldBridge.handleMessage(
        message("om_during"),
        async () => { throw new Error("during must not delegate"); },
        async () => { throw new Error("during must not deliver"); },
      );
      assert.deepEqual(spooled, { deferredDelivery: true });
      assert.equal(oldBridge.handover.status().spool.counts.frozen, 1);
    } finally {
      oldBridge.close();
    }

    const hostStatus = buildHostStatus({ db, handover: openHostHandover({ db, now: () => NOW, instanceId: "host-new" }) });
    const takeover = evaluateDatabasePreflight({
      hostStatus,
      migrationPlan: planMigration(buildMigrationSnapshot({ db })),
      expectedFreezeGeneration: 1,
    });
    assert.equal(takeover.ready, true);
    assert.equal(takeover.counts.takeoverFrozenSpools, 1);

    const next = openHostHandover({ db, now: () => NOW, instanceId: "host-new" });
    const drained = await next.drainFrozen({ forward: async () => ({ accepted: true, receipt: "p43b-forwarded" }) });
    assert.equal(drained.length, 1);
    assert.equal(drained[0].status, "forwarded");
    next.unfreeze({ reason: "p43b-cutover-complete" });

    createReplyMessage(db, "om_after");
    const reply = await next.sendReply({
      appId: APP_ID,
      messageId: "om_after",
      chatId: CHAT_ID,
      ownerId: OWNER_ID,
      text: "after reply",
      deliver: async () => ({ accepted: true, providerMessageId: null }),
    });
    assert.equal(reply.status, "accepted");
    db.close();
    makeStatic(databasePath);

    const expectation = {
      schema: EXPECTATION_SCHEMA,
      freezeGeneration: 1,
      messages: [
        { messageId: "om_before", role: "before", kind: "reply" },
        { messageId: "om_during", role: "during", kind: "domain", contextId: "capture:during", contextVersion: 1 },
        { messageId: "om_after", role: "after", kind: "reply" },
      ],
      artifacts: [],
    };
    const evidence = collectHandoverEvidence({ databasePath, expectation });
    const before = evidence.messages.find((item) => item.messageId === "om_before");
    const during = evidence.messages.find((item) => item.messageId === "om_during");
    const after = evidence.messages.find((item) => item.messageId === "om_after");
    assert.equal(before.replies[0].ownerInstanceId, "host-old");
    assert.equal(before.events.length, 1);
    assert.equal(before.events[0].key, "om_before");
    assert.equal(before.inboxes.length, 1);
    assert.equal(before.inboxes[0].processed, true);
    assert.deepEqual(before.tasks, []);
    assert.deepEqual(before.attempts, []);
    assert.deepEqual(before.runs, []);
    assert.deepEqual(before.deliveries, []);
    assert.deepEqual(before.spools, []);
    assert.equal(during.spools[0].ownerInstanceId, "host-new");
    assert.equal(during.spools[0].state, "forwarded");
    assert.equal(after.replies[0].ownerInstanceId, "host-new");

    const verified = verifyHandoverEvidence({ expectation, evidence, takeoverReport: takeover });
    assert.equal(verified.ok, true, JSON.stringify(verified.blockers));
    assert.deepEqual(verified.blockers, []);
  } finally {
    try { db.close(); } catch {}
    rmSync(root, { recursive: true, force: true });
  }
});
