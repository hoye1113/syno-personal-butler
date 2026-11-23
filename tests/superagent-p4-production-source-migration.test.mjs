// P4.3-C: isolated contract tests for legacy safety import and non-WAL static copies.
// No Host, Feishu connection, Worker, model or real production data is touched here.
process.env.NODE_ENV = "test";

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import {
  applyRoute,
  claimDelivery,
  acceptDelivery,
  createTask,
  executeNative,
  finalizeTask,
  openBusinessView,
  recordVerification,
  reportWorkerDone,
} from "../packages/syno-autoloop/examples/syno-p0/commands.ts";
import { rows } from "../packages/syno-autoloop/kernel/evolve.ts";
import { commitLatest } from "../packages/syno-autoloop/kernel/store.ts";
import { FORMAT } from "../packages/syno-autoloop/examples/syno-p0/commands.ts";
import { parseRules } from "../packages/syno-autoloop/protocol/rules.ts";
import { openHostHandover } from "../experiments/superagent-p0/host-handover.mjs";
import { FeishuChannelAdapter, FeishuStateStore } from "../packages/syno-core/feishu-channel.mjs";
import { buildHostStatus, buildMigrationSnapshot } from "../experiments/superagent-p0/host-operations.mjs";
import { planMigration } from "../experiments/superagent-p0/migration-rehearsal.mjs";
import { evaluateDatabasePreflight } from "../experiments/superagent-p0/production-handover-preflight.mjs";
import {
  EXPECTATION_SCHEMA,
  collectHandoverEvidence,
  verifyHandoverEvidence,
} from "../experiments/superagent-p0/production-handover-evidence.mjs";
import {
  EXIT_BLOCKED,
  EXIT_ERROR,
  EXIT_OK,
  SourceMigrationInputError,
  importLegacySafetyFacts,
  prepareStaticDatabaseCopy,
  validateLegacySafety,
  validatePublishingMappings,
  validateSafeOwnerStatus,
} from "../experiments/superagent-p0/production-source-migration.mjs";

const CLI = fileURLToPath(new URL("../experiments/superagent-p0/production-source-migration.mjs", import.meta.url));
const PREFLIGHT_CLI = fileURLToPath(
  new URL("../experiments/superagent-p0/production-handover-preflight.mjs", import.meta.url),
);
const APP_ID = "cli_test";
const OTHER_APP_ID = "other_app";
const CHAT_ID = "oc_test";
const OWNER_ID = "ou_test";
const ENV = { secret: "syno-p43c-isolated-test", publicUrl: "" };
const NOW = 1_700_000_000_000;
const PRIVATE = "PRIVATE_";

function temporaryRoot() {
  return mkdtempSync(path.join(tmpdir(), "syno-p43c-"));
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const shaFile = (file) => sha256(readFileSync(file));
const digest = (text) => sha256(text);

function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runCli(args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

function runPreflight(args) {
  return spawnSync(process.execPath, [PREFLIGHT_CLI, ...args], { encoding: "utf8" });
}

function zeroSafety() {
  return {
    activeJobs: 0,
    activeWorkflows: 0,
    pendingDecisions: 0,
    unknownEffects: 0,
    enabledExternalEffectsWithoutMapping: 0,
  };
}

function ownerStatus(overrides = {}) {
  return { configured: true, ownerBound: true, appId: APP_ID, ...overrides };
}

function pendingEntry(messageId, overrides = {}) {
  return {
    messageId,
    chatId: CHAT_ID,
    chatType: "p2p",
    senderId: OWNER_ID,
    content: `${PRIVATE}PENDING_${messageId}`,
    rawContentType: "text",
    resources: [{ type: "image", fileKey: `${PRIVATE}FILE_KEY_${messageId}` }],
    createdAt: new Date(NOW).toISOString(),
    ...overrides,
  };
}

function writeState(root, seenIds, pending = []) {
  const file = path.join(root, "feishu-channel.json");
  writeJson(file, { version: 1, seenIds, pending });
  return file;
}

function writeVault(root, files = { "notes/a.md": "# A\n", "notes/b.md": "# B\n" }) {
  const vault = path.join(root, "vault");
  for (const [relative, text] of Object.entries(files)) {
    const file = path.join(vault, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text, "utf8");
  }
  mkdirSync(vault, { recursive: true });
  return vault;
}

function openUnified(file) {
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  openBusinessView(db);
  return db;
}

function freezeWithSpools(db, spools) {
  const handover = openHostHandover({ db, now: () => NOW, instanceId: "host-old" });
  handover.freeze({ reason: "cutover" });
  for (const messageId of spools) {
    handover.spool({
      appId: APP_ID,
      messageId,
      chatId: CHAT_ID,
      ownerId: OWNER_ID,
      worker: "OpenCode",
      text: `${PRIVATE}SPOOL_${messageId}`,
    });
  }
  return handover;
}

function recordsOf(db) {
  return rows(openBusinessView(db), "records");
}

const inboxesOf = (db, messageId) => recordsOf(db)
  .filter((row) => row.kind === "inbox" && row.id === messageId);
const mappingsOf = (db) => recordsOf(db).filter((row) => row.kind === "publishing_mapping");
const factCount = (db) => Number(db.prepare("SELECT COUNT(*) AS count FROM facts").get().count);

function importInputs(root, db, {
  seenIds = [],
  pending = [],
  safety = zeroSafety(),
  mappings = [],
  vault = writeVault(root),
  owner = ownerStatus(),
} = {}) {
  return {
    db,
    stateFile: writeState(root, seenIds, pending),
    appId: APP_ID,
    legacySafety: safety,
    mappings,
    now: () => NOW,
    vaultRoot: vault,
    ownerStatus: owner,
  };
}

function assertNoPrivate(value, label = "report") {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  assert.equal(text.includes(PRIVATE), false, `${label} 泄露了正文 canary`);
}

function blockerCodes(report) {
  return report.blockers.map((blocker) => blocker.code);
}

// ---------------------------------------------------------------------------
// 1. Complete dedupe import, spool exclusion, pending carry, idempotency, hashes.
// ---------------------------------------------------------------------------

test("seen 去重导入排除 spool、pending 可接续、重复导入幂等且源 hash 不变", () => {
  const root = temporaryRoot();
  const dbPath = path.join(root, "runtime", "unified.db");
  const db = openUnified(dbPath);
  try {
    freezeWithSpools(db, ["om_during"]);
    const mappings = [{
      id: "note-a",
      objectId: "capture:note-a",
      effect: "knowledge.publish.wiki",
      enabled: true,
      state: "succeeded",
      version: 3,
    }];
    const input = importInputs(root, db, {
      seenIds: ["om_a", "om_b", "om_during"],
      pending: [pendingEntry("om_during")],
      mappings,
    });
    const stateHash = shaFile(input.stateFile);
    const factsBefore = factCount(db);

    const report = importLegacySafetyFacts(input);
    assert.equal(report.ok, true, JSON.stringify(report.blockers));
    assert.equal(report.sourceSha256, stateHash);
    assert.equal(report.state.seenIds, 3);
    assert.equal(report.state.pending, 1);
    assert.equal(report.counts.seenImported, 2);
    assert.equal(report.counts.seenExcludedSpool, 1);
    assert.equal(report.counts.carriedPendingCount, 1);
    assert.equal(report.counts.blockedPendingCount, 0);
    assert.deepEqual(report.actionCounts, { dedupe_only: 2, mapping_only: 1 });
    assert.equal(shaFile(input.stateFile), stateHash, "导入不得改写旧 state JSON");
    assert.equal(factCount(db) > factsBefore, true);

    for (const messageId of ["om_a", "om_b"]) {
      const [inbox] = inboxesOf(db, messageId);
      assert.ok(inbox, `${messageId} 应导入 inbox`);
      assert.equal(inbox.app_id, APP_ID);
      assert.deepEqual(inbox.receipt, { contextId: "legacy:dedupe", version: 1, legacyDedupe: true });
    }
    assert.deepEqual(inboxesOf(db, "om_during"), [], "spool messageId 不得提前写 inbox");

    const [mapping] = mappingsOf(db);
    assert.equal(mapping.id, "note-a");
    assert.equal(mapping.objectId, "capture:note-a");
    assert.equal(mapping.enabled, true);
    assert.equal(mapping.state, "succeeded");
    assert.equal(mapping.version, 3);
    const plan = planMigration(buildMigrationSnapshot({ db }));
    assert.equal(plan.externalEffects, 0);
    assert.equal(plan.items.filter((item) => item.kind === "publishing").every((item) => item.action === "mapping_only"), true);
    assert.equal(plan.items.some((item) => item.action === "mapping_only"), true);
    assert.equal(recordsOf(db).some((row) => ["publishing", "external_effect"].includes(row.kind)), false);

    const factsAfterFirst = factCount(db);
    const repeated = importLegacySafetyFacts(input);
    assert.equal(repeated.ok, true, JSON.stringify(repeated.blockers));
    assert.deepEqual(repeated.actionCounts, { dedupe_only: 0, mapping_only: 0 });
    assert.equal(repeated.counts.seenImported, 0);
    assert.equal(repeated.counts.seenAlreadyPresent, 2);
    assert.equal(repeated.counts.seenExcludedSpool, 1);
    assert.equal(repeated.counts.carriedPendingCount, 1);
    assert.equal(repeated.counts.mappingsDuplicate, 1);
    assert.equal(factCount(db), factsAfterFirst, "重复导入不得新增事实");
    assertNoPrivate(report);
  } finally {
    db.close();
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 2. Business blockers and rollback safety.
// ---------------------------------------------------------------------------

test("pending 非 spool、safety 非零、未 frozen、hold、inbox 冲突全部阻断且无部分提交", () => {
  const cases = [
    {
      label: "pending 不在 spool",
      prepare: (db) => freezeWithSpools(db, ["om_during"]),
      input: (root, db) => importInputs(root, db, {
        seenIds: ["om_good"],
        pending: [pendingEntry("om_missing")],
      }),
      code: "pending_without_frozen_spool",
    },
    {
      label: "safety 非零",
      prepare: () => {},
      input: (root, db) => importInputs(root, db, {
        seenIds: ["om_good"],
        safety: { ...zeroSafety(), activeJobs: 2 },
      }),
      code: "legacy_safety_active_jobs",
    },
    {
      label: "handover 未 frozen",
      prepare: () => {},
      input: (root, db) => importInputs(root, db, { seenIds: ["om_good"] }),
      code: "handover_not_frozen",
    },
    {
      label: "hold spool",
      prepare: (db) => {
        const handover = freezeWithSpools(db, ["om_hold"]);
        assert.ok(handover.claimNextFrozen());
      },
      input: (root, db) => importInputs(root, db, {
        seenIds: ["om_good"],
        pending: [pendingEntry("om_hold")],
      }),
      code: "handover_hold",
    },
    {
      label: "unknown spool 状态",
      prepare: (db) => {
        freezeWithSpools(db, ["om_unknown"]);
        const spool = recordsOf(db).find((row) => row.kind === "handover_spool");
        commitLatest(db, FORMAT, (view) => [{
          version: 1,
          seq: view.seq + 1,
          at: NOW,
          type: "fixture_unknown_spool",
          changes: [{ table: "records", key: spool.key, row: { ...spool, state: "unknown" } }],
        }]);
      },
      input: (root, db) => importInputs(root, db, { seenIds: ["om_good"] }),
      code: "handover_spool_state_unknown",
    },
    {
      label: "inbox 冲突",
      prepare: (db) => {
        freezeWithSpools(db, []);
        const key = `inbox:${JSON.stringify([APP_ID, "om_conflict"])}`;
        commitLatest(db, FORMAT, (view) => [{
          version: 1,
          seq: view.seq + 1,
          at: NOW,
          type: "fixture_conflict",
          changes: [{
            table: "records",
            key,
            row: { key, kind: "inbox", id: "om_conflict", app_id: OTHER_APP_ID, receipt: { contextId: "other:x", version: 1 } },
          }],
        }]);
      },
      input: (root, db) => importInputs(root, db, {
        seenIds: ["om_conflict", "om_good"],
      }),
      code: "inbox_conflict",
    },
  ];

  for (const scenario of cases) {
    const root = temporaryRoot();
    const dbPath = path.join(root, "runtime", "unified.db");
    const db = openUnified(dbPath);
    try {
      scenario.prepare(db);
      const factsBefore = factCount(db);
      const input = scenario.input(root, db);
      const report = importLegacySafetyFacts(input);
      assert.equal(report.ok, false, scenario.label);
      assert.ok(blockerCodes(report).includes(scenario.code), `${scenario.label}: ${JSON.stringify(report.blockers)}`);
      assert.equal(JSON.stringify(report).includes(PRIVATE), false, scenario.label);
      assert.deepEqual(inboxesOf(db, "om_good"), [], `${scenario.label} 不得部分导入`);
      assert.equal(factCount(db), factsBefore, `${scenario.label} 不得新增事实`);
    } finally {
      db.close();
      rmSync(root, { recursive: true, force: true });
    }
  }

  assert.throws(() => validateLegacySafety({ ...zeroSafety(), activeJobs: 0, extra: 0 }), SourceMigrationInputError);
  assert.throws(() => validateLegacySafety({
    activeJobs: 0, activeWorkflows: 0, pendingDecisions: 0, unknownEffects: 0,
  }), SourceMigrationInputError);
});

// ---------------------------------------------------------------------------
// 3. During message completion through a real isolated Specialist chain + P4.2 verify.
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
      prompt: "P4.3-C isolated fixture",
      group: "p43c",
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
    summary: "P4.3-C fixture",
    detail: JSON.stringify({ appId: APP_ID, chatId: CHAT_ID, ownerId: OWNER_ID }),
    ...(contextId ? { subject: contextId } : {}),
  };
  executeNative(db, "ingest", ["feishu-test", event], NOW, ENV);
}

function completeDomainChain(db, { messageId, contextId, contextVersion }) {
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

function makeStatic(file) {
  const db = new DatabaseSync(file);
  try {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE;");
  } finally {
    db.close();
  }
}

test("during 完成真实 Specialist 链后不被提前 inbox 阻断，before／during／after verify 通过", async () => {
  const root = temporaryRoot();
  const dbPath = path.join(root, "runtime", "unified.db");
  const db = openUnified(dbPath);
  try {
    configureRules(db, root);
    const oldHandover = openHostHandover({ db, now: () => NOW, instanceId: "host-old" });
    oldHandover.freeze({ reason: "cutover" });
    const spooled = oldHandover.spool({
      appId: APP_ID,
      messageId: "om_during",
      chatId: CHAT_ID,
      ownerId: OWNER_ID,
      worker: "OpenCode",
      text: `${PRIVATE}DURING_SPOOL`,
    });
    assert.equal(spooled.item.state, "frozen");
    // Old adapter completes the reserved message after the bridge reports "spooled".
    const input = importInputs(root, db, { seenIds: ["om_during"] });
    const report = importLegacySafetyFacts(input);
    assert.equal(report.ok, true, JSON.stringify(report.blockers));
    assert.deepEqual(inboxesOf(db, "om_during"), [], "导入不得为 during 写 inbox");

    const takeover = evaluateDatabasePreflight({
      hostStatus: buildHostStatus({
        db,
        now: () => NOW,
        handover: openHostHandover({ db, now: () => NOW, instanceId: "host-new" }),
      }),
      migrationPlan: planMigration(buildMigrationSnapshot({ db })),
      expectedFreezeGeneration: 1,
    });
    assert.equal(takeover.ready, true, JSON.stringify(takeover.blockers));
    assert.equal(takeover.counts.takeoverFrozenSpools, 1);

    const next = openHostHandover({ db, now: () => NOW, instanceId: "host-new" });
    const drained = await next.drainFrozen({ forward: async () => ({ accepted: true, receipt: "p43c-forwarded" }) });
    assert.equal(drained.length, 1);
    assert.equal(drained[0].status, "forwarded");
    next.unfreeze({ reason: "p43c-cutover-complete" });

    // The real chain would now create the inbox/context/task. A premature legacy inbox would make
    // applyRoute return a duplicate and leave the during message without a task.
    completeDomainChain(db, { messageId: "om_during", contextId: "capture:during", contextVersion: 1 });
    const [duringInbox] = inboxesOf(db, "om_during");
    assert.equal(duringInbox.receipt.contextId, "capture:during");

    createReplyMessage(db, "om_after");
    const after = await next.sendReply({
      appId: APP_ID,
      messageId: "om_after",
      chatId: CHAT_ID,
      ownerId: OWNER_ID,
      text: "after reply",
      deliver: async () => ({ accepted: true, providerMessageId: null }),
    });
    assert.equal(after.status, "accepted");

    // A synthetic before reply, owned by the old instance, with its own safe dedupe inbox.
    saveBeforeReply(db);
    db.close();
    makeStatic(dbPath);

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
    const evidence = collectHandoverEvidence({ databasePath: dbPath, expectation });
    const verified = verifyHandoverEvidence({ expectation, evidence, takeoverReport: takeover });
    assert.equal(verified.ok, true, JSON.stringify(verified.blockers));
    const json = JSON.stringify({ report, evidence, verified });
    assertNoPrivate(json, "P4.2 evidence");
  } finally {
    try { db.close(); } catch {}
    rmSync(root, { recursive: true, force: true });
  }
});

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

function saveBeforeReply(db) {
  // Pure fixture shape: one safe reply event/inbox/reply owned by the old instance. It carries no body.
  executeNative(db, "ingest", ["legacy-handover", {
    id: "om_before",
    type: "reply.request",
    subject: "capture:legacy_reply_om_before",
    summary: "旧 Host 普通文本回复",
    detail: JSON.stringify({ appId: APP_ID, chatId: CHAT_ID, ownerId: OWNER_ID }),
  }], NOW, ENV);
  applyRoute(db, {
    commandId: `route:legacy-reply:${JSON.stringify([APP_ID, "om_before"])}`,
    appId: APP_ID,
    messageId: "om_before",
    contextId: "capture:legacy_reply_om_before",
    expectedVersion: null,
    ownerId: OWNER_ID,
    replyTo: CHAT_ID,
    now: NOW,
  });
  commitLatest(db, FORMAT, (view) => [{
    version: 1,
    seq: view.seq + 1,
    at: NOW,
    type: "fixture_before_reply",
    changes: [{
      table: "records",
      key: `handover:reply:${JSON.stringify([APP_ID, "om_before"])}`,
      row: {
        key: `handover:reply:${JSON.stringify([APP_ID, "om_before"])}`,
        kind: "handover_reply",
        id: "om_before",
        appId: APP_ID,
        messageId: "om_before",
        chatId: CHAT_ID,
        ownerId: OWNER_ID,
        text: "before reply",
        state: "accepted",
        ownerInstanceId: "host-old",
        createdAt: NOW,
        updatedAt: NOW,
        acceptedAt: NOW,
        providerMessageId: null,
        holdReason: null,
      },
    }],
  }]);
}

// ---------------------------------------------------------------------------
// 3b. Real adapter pending recovery against a known unified spool after unfreeze.
// ---------------------------------------------------------------------------

function setSpoolState(db, messageId, patch) {
  const row = recordsOf(db).find((entry) => entry.kind === "handover_spool" && entry.messageId === messageId);
  assert.ok(row, `spool ${messageId} missing`);
  commitLatest(db, FORMAT, (view) => [{
    version: 1,
    seq: view.seq + 1,
    at: NOW,
    type: "fixture_spool_state",
    changes: [{ table: "records", key: row.key, row: { ...row, ...patch } }],
  }]);
}

async function seedKnownSpool(db, messageId, state) {
  const handover = openHostHandover({ db, now: () => NOW, instanceId: "host-new" });
  handover.freeze({ reason: "cutover" });
  const text = `${PRIVATE}PENDING_${messageId}`;
  handover.spool({
    appId: APP_ID, messageId, chatId: CHAT_ID, ownerId: OWNER_ID, worker: "OpenCode", text,
  });
  if (state === "forwarded") {
    const outcomes = await handover.drainFrozen({ forward: async () => ({ accepted: true, receipt: "synthetic" }) });
    assert.equal(outcomes[0].status, "forwarded");
  } else if (state === "dispatching" || state === "hold") {
    assert.equal(handover.claimNextFrozen().state, "dispatching");
    if (state === "hold") setSpoolState(db, messageId, { state: "hold", holdReason: "fixture_hold" });
  } else {
    assert.equal(state, "frozen");
  }
  handover.unfreeze({ reason: "cutover-complete" });
  assert.equal(handover.control().frozen, false);
  return text;
}

// Fully synthetic adapter wiring: no real credentials, no network and no project lock file.
function syntheticFeishuAdapter({ stateFile, handler, sends }) {
  const credentials = {
    async load() { return { appId: APP_ID, appSecret: "synthetic-secret", ownerOpenId: OWNER_ID }; },
    async updateOwner() {},
    async save() {},
  };
  const channel = {
    handlers: new Map(),
    on(event, listener) { this.handlers.set(event, listener); return this; },
    async connect() {},
    async disconnect() {},
    async send(chatId, payload, options) {
      sends.push({ chatId, payload, options });
      return { messageId: "synthetic-out" };
    },
    async recallMessage() {},
  };
  const adapter = new FeishuChannelAdapter({
    credentials,
    stateStore: new FeishuStateStore({ file: stateFile }),
    processLock: { async acquire() { return { async release() {} }; } },
    channelFactory: () => channel,
    typingIndicator: false,
    retryDelayMs: 60_000,
    onMessage: handler,
  });
  return { adapter, channel, credentials };
}

test("真实 adapter 恢复的旧 pending 命中已知 spool 绝不再 immediate（forwarded／frozen／hold／dispatching）", async () => {
  for (const state of ["forwarded", "frozen", "hold", "dispatching"]) {
    const root = temporaryRoot();
    const dbPath = path.join(root, "runtime", "unified.db");
    const db = openUnified(dbPath);
    try {
      const messageId = `om_known_${state}`;
      await seedKnownSpool(db, messageId, state);
      const stateFile = writeState(root, ["om_prior_seen"], [pendingEntry(messageId, { createdAt: new Date().toISOString() })]);
      const recordsBefore = JSON.stringify(recordsOf(db));
      const factsBefore = factCount(db);

      const dispatchCalls = [];
      const sends = [];
      let intakeOutcome = null;
      const handover = openHostHandover({ db, now: () => NOW, instanceId: "host-new" });
      const { adapter } = syntheticFeishuAdapter({
        stateFile,
        sends,
        handler: async (message) => {
          // The real client only reaches intake after the ready gate opens, i.e. after unfreeze.
          assert.equal(handover.control().frozen, false, `${state}: control 必须已 unfreeze`);
          const inbound = { ...message, worker: "OpenCode" };
          intakeOutcome = handover.intake({
            appId: APP_ID,
            messageId: inbound.id,
            chatId: inbound.chatId,
            ownerId: inbound.senderId,
            worker: inbound.worker,
            text: inbound.text,
          });
          if (intakeOutcome.status === "immediate") {
            dispatchCalls.push(inbound);
            return { deferredDelivery: true };
          }
          return { deferredDelivery: true };
        },
      });

      const started = await adapter.start();
      assert.equal(started.running, true, `${state}: ${started.lastError}`);
      await adapter.stop();

      assert.equal(dispatchCalls.length, 0, `${state}: 已知 spool 不得触发业务 dispatch`);
      assert.equal(sends.length, 0, `${state}: 不得 deliver 任何回复`);
      assert.equal(intakeOutcome?.status, "spooled", state);
      assert.equal(intakeOutcome?.duplicate, true, state);
      assert.equal(intakeOutcome?.item?.messageId, messageId, state);
      assert.equal(intakeOutcome?.item?.state, state === "frozen" ? "frozen" : state, state);

      const persisted = JSON.parse(readFileSync(stateFile, "utf8"));
      assert.deepEqual(persisted.pending, [], `${state}: deferred 回执应正常 complete 旧 pending`);
      assert.equal(persisted.seenIds.includes(messageId), true, `${state}: seen 必须保留`);
      assert.equal(persisted.seenIds.includes("om_prior_seen"), true, `${state}: 既有 seen 必须保留`);
      assert.equal(adapter.seen.has(messageId), true, state);
      assert.equal(adapter.lastError, "", state);

      assert.equal(JSON.stringify(recordsOf(db)), recordsBefore, `${state}: 不得新增 event／inbox／Task／spool`);
      assert.equal(factCount(db), factsBefore, `${state}: 不得新增事实`);
      assert.deepEqual(inboxesOf(db, messageId), [], `${state}: 不得提前写 inbox`);
      assert.equal(recordsOf(db).filter((row) => row.kind === "task" && row.id === messageId).length, 0, state);
    } finally {
      db.close();
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("真实 adapter 恢复的旧 pending 内容与已知 spool 冲突时失败关闭", async () => {
  const root = temporaryRoot();
  const dbPath = path.join(root, "runtime", "unified.db");
  const db = openUnified(dbPath);
  try {
    const messageId = "om_known_conflict";
    await seedKnownSpool(db, messageId, "forwarded");
    const stateFile = writeState(root, [], [pendingEntry(messageId, {
      content: `${PRIVATE}CONFLICT_BODY`,
      createdAt: new Date().toISOString(),
    })]);
    const recordsBefore = JSON.stringify(recordsOf(db));
    const dispatchCalls = [];
    const sends = [];
    const handover = openHostHandover({ db, now: () => NOW, instanceId: "host-new" });
    const { adapter } = syntheticFeishuAdapter({
      stateFile,
      sends,
      handler: async (message) => {
        const inbound = { ...message, worker: "OpenCode" };
        const outcome = handover.intake({
          appId: APP_ID,
          messageId: inbound.id,
          chatId: inbound.chatId,
          ownerId: inbound.senderId,
          worker: inbound.worker,
          text: inbound.text,
        });
        if (outcome.status === "immediate") dispatchCalls.push(inbound);
        return { deferredDelivery: true };
      },
    });

    const started = await adapter.start();
    assert.equal(started.running, true, started.lastError);
    await adapter.stop();

    assert.equal(dispatchCalls.length, 0);
    assert.equal(sends.length, 0);
    assert.ok(adapter.lastError.includes("内容冲突"), adapter.lastError);
    const persisted = JSON.parse(readFileSync(stateFile, "utf8"));
    assert.equal(persisted.pending.length, 1, "冲突消息必须留在 adapter pending 对账");
    assert.equal(persisted.seenIds.includes(messageId), false);
    assert.equal(JSON.stringify(recordsOf(db)), recordsBefore);
    assert.deepEqual(inboxesOf(db, messageId), []);

    assert.throws(() => handover.intake({
      appId: APP_ID,
      messageId,
      chatId: CHAT_ID,
      ownerId: OWNER_ID,
      worker: "OpenCode",
      text: `${PRIVATE}OTHER_CONFLICT`,
    }), /内容冲突/u);
  } finally {
    db.close();
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 4. Mapping import: mapping_only, no publishing effect.
// ---------------------------------------------------------------------------

function mappingFixture(root, db, mappings) {
  return importInputs(root, db, { seenIds: [], mappings });
}

test("合法 enabled succeeded versioned 映射只写 publishing_mapping／mapping_only，externalEffects=0", () => {
  const root = temporaryRoot();
  const dbPath = path.join(root, "runtime", "unified.db");
  const db = openUnified(dbPath);
  try {
    freezeWithSpools(db, []);
    const report = importLegacySafetyFacts(mappingFixture(root, db, [
      {
        id: "note-a",
        objectId: "capture:note-a",
        effect: "knowledge.publish.wiki",
        enabled: true,
        state: "succeeded",
        version: 7,
      },
      {
        id: "note-disabled",
        objectId: "capture:note-disabled",
        effect: "knowledge.publish.wiki",
        enabled: false,
        state: "pending",
        version: 1,
      },
    ]));
    assert.equal(report.ok, true, JSON.stringify(report.blockers));
    assert.equal(report.counts.mappingsImported, 1);
    assert.equal(report.counts.mappingsDisabled, 1);
    assert.deepEqual(report.actionCounts, { dedupe_only: 0, mapping_only: 1 });
    const snapshot = buildMigrationSnapshot({ db });
    const plan = planMigration(snapshot);
    assert.equal(plan.externalEffects, 0);
    assert.deepEqual(plan.items.filter((item) => item.kind === "publishing").map((item) => item.action), ["mapping_only"]);
    assert.equal(recordsOf(db).filter((row) => row.kind === "publishing_mapping").length, 1);
    assert.equal(recordsOf(db).some((row) => ["publishing", "external_effect"].includes(row.kind)), false);
  } finally {
    db.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("未启用映射忽略；未知 effect、缺 version、未成功状态阻断且不部分导入", () => {
  const invalidVariants = [
    [{ effect: "knowledge.publish.unknown" }, "mapping_effect_unregistered"],
    [{ version: undefined }, "mapping_version_invalid"],
    [{ version: 0 }, "mapping_version_invalid"],
    [{ state: "pending" }, "mapping_state_not_succeeded"],
    [{ effect: undefined }, "mapping_effect_unregistered"],
  ];
  for (const [overrides, code] of invalidVariants) {
    const root = temporaryRoot();
    const dbPath = path.join(root, "runtime", "unified.db");
    const db = openUnified(dbPath);
    try {
      freezeWithSpools(db, []);
      const factsBefore = factCount(db);
      const mapping = {
        id: "note-a",
        objectId: "capture:note-a",
        effect: "knowledge.publish.wiki",
        enabled: true,
        state: "succeeded",
        version: 2,
        ...overrides,
      };
      if (overrides.version === undefined) delete mapping.version;
      if (overrides.effect === undefined) delete mapping.effect;
      const report = importLegacySafetyFacts(mappingFixture(root, db, [
        {
          id: "note-valid",
          objectId: "capture:note-valid",
          effect: "knowledge.publish.wiki",
          enabled: true,
          state: "succeeded",
          version: 1,
        },
        mapping,
      ]));
      assert.equal(report.ok, false, `${code}: ${JSON.stringify(report.blockers)}`);
      assert.ok(blockerCodes(report).includes(code), `${code}: ${JSON.stringify(report.blockers)}`);
      assert.deepEqual(mappingsOf(db), [], `${code} 不得部分导入`);
      assert.equal(factCount(db), factsBefore);
    } finally {
      db.close();
      rmSync(root, { recursive: true, force: true });
    }
  }
  assert.throws(() => validatePublishingMappings({ mappings: "no" }), SourceMigrationInputError);
});

// ---------------------------------------------------------------------------
// 5. Vault inventory and Owner binding.
// ---------------------------------------------------------------------------

test("vault 清单只含路径／hash、源不变；symlink 阻断", () => {
  const root = temporaryRoot();
  const dbPath = path.join(root, "runtime", "unified.db");
  const db = openUnified(dbPath);
  try {
    freezeWithSpools(db, []);
    const vault = writeVault(root, {
      "notes/a.md": `# A\n${PRIVATE}VAULT_BODY_A\n`,
      "notes/b.md": `# B\n${PRIVATE}VAULT_BODY_B\n`,
    });
    const before = Object.fromEntries(readdirSync(path.join(vault, "notes")).map((name) => [name, shaFile(path.join(vault, "notes", name))]));
    const report = importLegacySafetyFacts(importInputs(root, db, { vault }));
    assert.equal(report.ok, true, JSON.stringify(report.blockers));
    assert.equal(report.vault.fileCount, 2);
    assert.deepEqual(report.vault.files.map((file) => file.path), ["notes/a.md", "notes/b.md"]);
    assert.equal(report.vault.files.every((file) => /^[0-9a-f]{64}$/u.test(file.sha256)), true);
    assertNoPrivate(report, "vault report");
    assert.deepEqual(
      Object.fromEntries(readdirSync(path.join(vault, "notes")).map((name) => [name, shaFile(path.join(vault, "notes", name))])),
      before,
    );

    const symlinkRoot = temporaryRoot();
    const symlinkDb = openUnified(path.join(symlinkRoot, "runtime", "unified.db"));
    try {
      freezeWithSpools(symlinkDb, []);
      const linkedVault = path.join(symlinkRoot, "vault");
      mkdirSync(linkedVault, { recursive: true });
      writeFileSync(path.join(linkedVault, "real.md"), "# real\n");
      const outside = path.join(symlinkRoot, "outside.md");
      writeFileSync(outside, "# outside\n");
      symlinkSync(outside, path.join(linkedVault, "link.md"));
      const factsBefore = factCount(symlinkDb);
      const linkedReport = importLegacySafetyFacts(importInputs(symlinkRoot, symlinkDb, { vault: linkedVault }));
      assert.equal(linkedReport.ok, false);
      assert.ok(blockerCodes(linkedReport).includes("vault_symlink"), JSON.stringify(linkedReport.blockers));
      assert.equal(factCount(symlinkDb), factsBefore);
    } finally {
      symlinkDb.close();
      rmSync(symlinkRoot, { recursive: true, force: true });
    }
  } finally {
    db.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("Owner 缺 configured／ownerBound／appId 不匹配阻断，报告无 canary 与 Secret", () => {
  const cases = [
    [{ configured: undefined }, "owner_status_incomplete"],
    [{ configured: false }, "owner_not_configured"],
    [{ ownerBound: false }, "owner_not_bound"],
    [{ appId: "wrong_app" }, "owner_app_id_mismatch"],
  ];
  for (const [overrides, code] of cases) {
    const root = temporaryRoot();
    const dbPath = path.join(root, "runtime", "unified.db");
    const db = openUnified(dbPath);
    try {
      freezeWithSpools(db, []);
      const owner = ownerStatus(overrides);
      if (overrides.configured === undefined) delete owner.configured;
      const report = importLegacySafetyFacts(importInputs(root, db, {
        seenIds: ["om_owner"],
        owner,
      }));
      assert.equal(report.ok, false, code);
      assert.ok(blockerCodes(report).includes(code), `${code}: ${JSON.stringify(report.blockers)}`);
      assert.deepEqual(inboxesOf(db, "om_owner"), []);
      assertNoPrivate(report, code);
      const text = JSON.stringify(report);
      assert.equal(text.includes(OWNER_ID), false);
      assert.equal(text.includes("appSecret"), false);
    } finally {
      db.close();
      rmSync(root, { recursive: true, force: true });
    }
  }
  assert.throws(() => validateSafeOwnerStatus({ ...ownerStatus(), ownerOpenId: OWNER_ID }), SourceMigrationInputError);
});

// ---------------------------------------------------------------------------
// 6. Static copy: WAL source, sidecars, target exclusivity, integrity, relative paths.
// ---------------------------------------------------------------------------

function createWalDatabase(file) {
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  try {
    db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
    openBusinessView(db);
    db.exec(`CREATE TABLE canary(value TEXT); INSERT INTO canary VALUES ('${PRIVATE}CANARY');`);
  } finally {
    db.close();
  }
  return file;
}

function headerWal(file) {
  const bytes = readFileSync(file);
  return bytes[18] === 2 || bytes[19] === 2;
}

test("WAL 源转非 WAL target、preflight ready、源 hash／sidecar 不变", () => {
  const root = temporaryRoot();
  const source = createWalDatabase(path.join(root, "source.db"));
  const target = path.join(root, "target.db");
  try {
    assert.equal(existsSync(`${source}-wal`), false);
    assert.equal(existsSync(`${source}-shm`), false);
    assert.equal(headerWal(source), true);
    const sourceHash = shaFile(source);
    const report = prepareStaticDatabaseCopy({ source, target });
    assert.equal(report.ok, true, JSON.stringify(report.blockers));
    assertNoPrivate(report, "static-copy report");
    assert.equal(report.source.sha256Before, sourceHash);
    assert.equal(report.source.sha256After, sourceHash);
    assert.equal(report.source.walHeader, true);
    assert.equal(report.target.walHeader, false);
    assert.deepEqual(report.target.integrity, ["ok"]);
    assert.deepEqual(report.target.sidecars, []);
    assert.equal(report.files.length, 2);
    assert.equal(shaFile(source), sourceHash);
    assert.deepEqual(readdirSync(root).filter((name) => /\.db-(?:wal|shm|journal)$/u.test(name)), []);

    const preflight = runPreflight(["--database", target]);
    assert.equal(preflight.status, EXIT_OK, preflight.stderr);
    const preflightReport = JSON.parse(preflight.stdout);
    assert.equal(preflightReport.ready, true);
    assert.equal(preflightReport.mode, "entry");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("源 sidecar、target 已存在、integrity 失败、相对路径均失败关闭", () => {
  const root = temporaryRoot();
  const source = createWalDatabase(path.join(root, "source.db"));
  try {
    const sidecarSource = path.join(root, "sidecar.db");
    writeFileSync(sidecarSource, readFileSync(source));
    writeFileSync(`${sidecarSource}-wal`, "");
    const sidecarTarget = path.join(root, "sidecar-target.db");
    const blocked = prepareStaticDatabaseCopy({ source: sidecarSource, target: sidecarTarget });
    assert.equal(blocked.ok, false);
    assert.ok(blockerCodes(blocked).includes("source_sidecar"));
    assert.equal(existsSync(sidecarTarget), false);
    assert.equal(existsSync(`${sidecarSource}-wal`), true);

    const existing = path.join(root, "existing.db");
    writeFileSync(existing, "keep-me");
    assert.throws(() => prepareStaticDatabaseCopy({ source, target: existing }), SourceMigrationInputError);
    assert.equal(readFileSync(existing, "utf8"), "keep-me");

    const corrupt = path.join(root, "corrupt.db");
    writeFileSync(corrupt, readFileSync(source));
    const bytes = readFileSync(corrupt);
    // Corrupt page 2, not page 1: the header/journal-mode conversion must run before integrity_check
    // detects the damaged page, so the failed scene keeps the converted header and the target.
    for (let index = 4096; index < Math.min(bytes.length, 4196); index += 1) bytes[index] = 0xff;
    writeFileSync(corrupt, bytes);
    const corruptTarget = path.join(root, "corrupt-target.db");
    const corruptHash = shaFile(corrupt);
    const corruptReport = prepareStaticDatabaseCopy({ source: corrupt, target: corruptTarget });
    assert.equal(corruptReport.ok, false);
    assert.ok(blockerCodes(corruptReport).includes("target_integrity_failed"), JSON.stringify(corruptReport.blockers));
    assert.equal(corruptReport.firstError, "target_integrity_failed");
    assert.equal(existsSync(corruptTarget), true, "失败现场必须保留");
    assert.equal(shaFile(corrupt), corruptHash);
    assert.equal(headerWal(corruptTarget), false);

    assert.throws(() => prepareStaticDatabaseCopy({ source: "relative.db", target: path.join(root, "x.db") }), SourceMigrationInputError);
    assert.throws(() => prepareStaticDatabaseCopy({ source, target: `${source}-copy/../same.db` }), SourceMigrationInputError);
    assert.throws(() => prepareStaticDatabaseCopy({ source, target: source }), SourceMigrationInputError);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 7/8. CLI contracts: success, blocked (3), structural (2), exclusivity, preflight.
// ---------------------------------------------------------------------------

function prepareCliImport(root, { spoolIds = [], seenIds = [], pending = [], safety = zeroSafety(), mappings = [], owner = ownerStatus() } = {}) {
  const dbPath = path.join(root, "runtime", "unified.db");
  const db = openUnified(dbPath);
  const handover = openHostHandover({ db, now: () => NOW, instanceId: "host-old" });
  handover.freeze({ reason: "cutover" });
  for (const messageId of spoolIds) {
    handover.spool({
      appId: APP_ID, messageId, chatId: CHAT_ID, ownerId: OWNER_ID, worker: "OpenCode", text: `${PRIVATE}CLI_${messageId}`,
    });
  }
  db.close();
  const state = writeState(root, seenIds, pending);
  const safetyPath = path.join(root, "legacy-safety.json");
  const mappingsPath = path.join(root, "mappings.json");
  const ownerPath = path.join(root, "owner-status.json");
  const vault = writeVault(root);
  writeJson(safetyPath, safety);
  writeJson(mappingsPath, mappings);
  writeJson(ownerPath, owner);
  return { dbPath, state, safetyPath, mappingsPath, ownerPath, vault };
}

function cliImportArgs(fixture, output) {
  return [
    "import",
    "--database", fixture.dbPath,
    "--state", fixture.state,
    "--app-id", APP_ID,
    "--safety", fixture.safetyPath,
    "--mappings", fixture.mappingsPath,
    "--vault", fixture.vault,
    "--owner-status", fixture.ownerPath,
    "--output", output,
  ];
}

test("import CLI 成功、业务阻断退出 3、结构错误退出 2，且 output 排他", () => {
  const root = temporaryRoot();
  try {
    const fixture = prepareCliImport(root, {
      spoolIds: ["om_during"],
      seenIds: ["om_a", "om_during"],
      pending: [pendingEntry("om_during")],
      mappings: [{ id: "note-a", objectId: "capture:note-a", effect: "knowledge.publish.wiki", enabled: true, state: "succeeded", version: 2 }],
    });
    const output = path.join(root, "import-report.json");
    const ok = runCli(cliImportArgs(fixture, output));
    assert.equal(ok.status, EXIT_OK, ok.stderr);
    const summary = JSON.parse(ok.stdout);
    assert.equal(summary.ok, true);
    assert.deepEqual(summary.actionCounts, { dedupe_only: 1, mapping_only: 1 });
    assert.equal(existsSync(output), true);
    assertNoPrivate(readFileSync(output, "utf8"), "import output");
    assertNoPrivate(ok.stdout, "import stdout");
    assertNoPrivate(ok.stderr, "import stderr");

    const db = new DatabaseSync(fixture.dbPath, { readOnly: true });
    try {
      assert.equal(inboxesOf(db, "om_a").length, 1);
      assert.equal(inboxesOf(db, "om_during").length, 0);
      assert.equal(mappingsOf(db).length, 1);
    } finally {
      db.close();
    }

    const blockedRoot = temporaryRoot();
    try {
      const blockedFixture = prepareCliImport(blockedRoot, {
        seenIds: ["om_blocked"],
        safety: { ...zeroSafety(), unknownEffects: 1 },
      });
      const blockedOutput = path.join(blockedRoot, "blocked.json");
      const blocked = runCli(cliImportArgs(blockedFixture, blockedOutput));
      assert.equal(blocked.status, EXIT_BLOCKED, blocked.stderr);
      assert.equal(existsSync(blockedOutput), true);
      const blockedReport = JSON.parse(readFileSync(blockedOutput, "utf8"));
      assert.equal(blockedReport.ok, false);
      assert.ok(blockerCodes(blockedReport).includes("legacy_safety_unknown_effects"));
      const blockedDb = new DatabaseSync(blockedFixture.dbPath, { readOnly: true });
      try {
        assert.equal(inboxesOf(blockedDb, "om_blocked").length, 0, "阻断不得部分导入");
      } finally {
        blockedDb.close();
      }
    } finally {
      rmSync(blockedRoot, { recursive: true, force: true });
    }

    const existing = path.join(root, "existing.json");
    writeFileSync(existing, "keep\n");
    const badOwnerPath = path.join(root, "bad-owner.json");
    writeJson(badOwnerPath, { ...ownerStatus(), ownerOpenId: OWNER_ID });
    const structural = [
      ["missing output", [
        "import", "--database", fixture.dbPath, "--state", fixture.state, "--app-id", APP_ID,
        "--safety", fixture.safetyPath, "--mappings", fixture.mappingsPath, "--vault", fixture.vault,
        "--owner-status", fixture.ownerPath,
      ]],
      ["relative state", ["import", "--database", fixture.dbPath, "--state", "feishu-channel.json", "--app-id", APP_ID,
        "--safety", fixture.safetyPath, "--mappings", fixture.mappingsPath, "--vault", fixture.vault,
        "--owner-status", fixture.ownerPath, "--output", path.join(root, "o1.json")]],
      ["duplicate flag", [...cliImportArgs(fixture, path.join(root, "o2.json")), "--app-id", APP_ID]],
      ["unknown flag", [...cliImportArgs(fixture, path.join(root, "o3.json")), "--bogus"]],
      ["output exists", cliImportArgs(fixture, existing)],
      ["owner extra field", [
        "import", "--database", fixture.dbPath, "--state", fixture.state, "--app-id", APP_ID,
        "--safety", fixture.safetyPath, "--mappings", fixture.mappingsPath, "--vault", fixture.vault,
        "--owner-status", badOwnerPath, "--output", path.join(root, "o4.json"),
      ]],
      ["bad state json", ["import", "--database", fixture.dbPath, "--state", path.join(root, "bad-state.json"),
        "--app-id", APP_ID, "--safety", fixture.safetyPath, "--mappings", fixture.mappingsPath, "--vault", fixture.vault,
        "--owner-status", fixture.ownerPath, "--output", path.join(root, "o5.json")]],
    ];
    writeFileSync(path.join(root, "bad-state.json"), "{not json");
    for (const [label, args] of structural) {
      const result = runCli(args);
      assert.equal(result.status, EXIT_ERROR, `${label}: ${result.stdout}${result.stderr}`);
      assert.equal(result.stdout, "", label);
      assert.equal(result.stderr.length > 0, true, label);
    }
    assert.equal(readFileSync(existing, "utf8"), "keep\n");
    assert.equal(existsSync(path.join(root, "o4.json")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("import CLI 报告的 DB before hash 是导入前真实值、after hash 等于导入后实际值", () => {
  const root = temporaryRoot();
  try {
    const fixture = prepareCliImport(root, { seenIds: ["om_hash"] });
    const before = shaFile(fixture.dbPath);
    const output = path.join(root, "hash-report.json");
    const result = runCli(cliImportArgs(fixture, output));
    assert.equal(result.status, EXIT_OK, result.stderr);
    const report = JSON.parse(readFileSync(output, "utf8"));
    const after = shaFile(fixture.dbPath);
    assert.equal(report.ok, true, JSON.stringify(report.blockers));
    assert.equal(report.databaseSha256Before, before, "before 必须是调用前独立保存的真实值");
    assert.equal(report.databaseSha256After, after, "after 必须等于导入后的实际文件 hash");
    assert.notEqual(report.databaseSha256Before, report.databaseSha256After, "导入有变化时前后必须不同");
    assert.equal(JSON.parse(result.stdout).databaseSha256, after);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("static-copy CLI 成功、业务阻断退出 3、结构错误退出 2，且正式 preflight 可读取副本", () => {
  const root = temporaryRoot();
  const source = createWalDatabase(path.join(root, "source.db"));
  const target = path.join(root, "target.db");
  const output = path.join(root, "copy-report.json");
  try {
    const ok = runCli(["static-copy", "--source", source, "--target", target, "--output", output]);
    assert.equal(ok.status, EXIT_OK, ok.stderr);
    const report = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(report.ok, true);
    assertNoPrivate(report, "static-copy CLI report");
    assert.equal(report.target.walHeader, false);
    assert.equal(existsSync(target), true);
    const preflight = runPreflight(["--database", target]);
    assert.equal(preflight.status, EXIT_OK, preflight.stderr);
    assert.equal(JSON.parse(preflight.stdout).ready, true);

    const sidecarSource = path.join(root, "sidecar.db");
    writeFileSync(sidecarSource, readFileSync(source));
    writeFileSync(`${sidecarSource}-shm`, "");
    const blockedTarget = path.join(root, "blocked-target.db");
    const blockedOutput = path.join(root, "blocked.json");
    const blocked = runCli(["static-copy", "--source", sidecarSource, "--target", blockedTarget, "--output", blockedOutput]);
    assert.equal(blocked.status, EXIT_BLOCKED, blocked.stderr);
    assert.equal(existsSync(blockedOutput), true);
    const blockedReport = JSON.parse(readFileSync(blockedOutput, "utf8"));
    assert.equal(blockedReport.ok, false);
    assert.ok(blockerCodes(blockedReport).includes("source_sidecar"));
    assert.equal(existsSync(blockedTarget), false);

    const existingTarget = path.join(root, "existing-target.db");
    writeFileSync(existingTarget, "keep");
    const structural = [
      ["relative source", ["static-copy", "--source", "source.db", "--target", path.join(root, "r1.db"), "--output", path.join(root, "r1.json")]],
      ["target exists", ["static-copy", "--source", source, "--target", existingTarget, "--output", path.join(root, "r2.json")]],
      ["duplicate target", ["static-copy", "--source", source, "--target", path.join(root, "r3.db"),
        "--target", path.join(root, "r3b.db"), "--output", path.join(root, "r3.json")]],
      ["unknown flag", ["static-copy", "--source", source, "--target", path.join(root, "r4.db"),
        "--output", path.join(root, "r4.json"), "--bogus"]],
      ["missing output", ["static-copy", "--source", source, "--target", path.join(root, "r5.db")]],
      ["output exists", ["static-copy", "--source", source, "--target", path.join(root, "r6.db"), "--output", output]],
    ];
    for (const [label, args] of structural) {
      const result = runCli(args);
      assert.equal(result.status, EXIT_ERROR, `${label}: ${result.stdout}${result.stderr}`);
      assert.equal(result.stdout, "", label);
    }
    assert.equal(readFileSync(existingTarget, "utf8"), "keep");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
