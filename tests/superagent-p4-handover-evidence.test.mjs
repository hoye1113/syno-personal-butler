import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
import { parseRules } from "../../syno-autoloop-p0/protocol/rules.ts";
import { openHostHandover } from "../experiments/superagent-p0/host-handover.mjs";
import { buildHostStatus, buildMigrationSnapshot } from "../experiments/superagent-p0/host-operations.mjs";
import { planMigration } from "../experiments/superagent-p0/migration-rehearsal.mjs";
import { evaluateDatabasePreflight } from "../experiments/superagent-p0/production-handover-preflight.mjs";
import {
  EVIDENCE_SCHEMA,
  EXPECTATION_SCHEMA,
  EXIT_BLOCKED,
  EXIT_ERROR,
  EXIT_OK,
  VERIFICATION_SCHEMA,
  collectHandoverEvidence,
  verifyHandoverEvidence,
} from "../experiments/superagent-p0/production-handover-evidence.mjs";

const CLI = fileURLToPath(new URL("../experiments/superagent-p0/production-handover-evidence.mjs", import.meta.url));
const APP_ID = "cli_test";
const CHAT_ID = "oc_test";
const OWNER_ID = "ou_test";
const ENV = { secret: "syno-p42-isolated-test", publicUrl: "" };
const NOW = 1000;

const sha256File = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const digest = (text) => createHash("sha256").update(text).digest("hex");

function temporaryRoot() {
  return mkdtempSync(path.join(tmpdir(), "syno-p42-evidence-"));
}

function configureRules(db, cwd) {
  const rules = parseRules(JSON.stringify({
    timezone: "Asia/Shanghai",
    sources: { "feishu-test": { name: "独立测试" } },
    agents: {
      specialist: { name: "Specialist", worker: "syno-test", use: "command", command: ["true"] },
    },
    rules: [{
      name: "domain-task",
      when: { source: "feishu-test", types: ["domain.request"] },
      to: "specialist",
      cwd,
      prompt: "P4.2 isolated evidence fixture",
      group: "p42",
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
    summary: "P4.2 fixture",
    detail: JSON.stringify({ appId: APP_ID, chatId: CHAT_ID, ownerId: OWNER_ID }),
    ...(contextId ? { subject: contextId } : {}),
  };
  executeNative(db, "ingest", ["feishu-test", event], NOW, ENV);
}

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
  createTask(db, {
    taskId, contextId, attemptId, runId: job.run, runAttempt: job.attempt, acceptance, now: NOW,
  });
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

async function acceptedReply(handover, messageId) {
  const outcome = await handover.sendReply({
    appId: APP_ID,
    messageId,
    chatId: CHAT_ID,
    ownerId: OWNER_ID,
    text: `PRIVATE_REPLY_${messageId}`,
    deliver: async () => ({ accepted: true, providerMessageId: null }),
  });
  assert.equal(outcome.status, "accepted");
}

function buildTakeoverReport(db, freezeGeneration) {
  const hostStatus = buildHostStatus({ db, handover: openHostHandover({ db }) });
  const migrationPlan = planMigration(buildMigrationSnapshot({ db }));
  return evaluateDatabasePreflight({ hostStatus, migrationPlan, expectedFreezeGeneration: freezeGeneration });
}

async function buildScenario({
  during = [{ messageId: "om_during", contextId: "capture:during", contextVersion: 1 }],
  before = true,
  after = true,
  beforeMessages = ["om_before"],
  afterMessages = ["om_after"],
  artifact = true,
  expectedArtifactSha256 = null,
  freezeGeneration = 1,
} = {}) {
  const root = temporaryRoot();
  const file = path.join(root, "shared.db");
  const db = new DatabaseSync(file);
  openBusinessView(db);
  configureRules(db, root);

  // before replies belong to the old instance; during drain and after replies belong to the new one.
  const oldHandover = openHostHandover({ db, now: () => NOW, instanceId: "host-old" });
  if (before) {
    for (const messageId of beforeMessages) {
      createReplyMessage(db, messageId);
      await acceptedReply(oldHandover, messageId);
    }
  }
  for (const item of during) createDomainMessage(db, item);

  assert.equal(oldHandover.freeze({ reason: "cutover" }).status, "frozen");
  for (const item of during) {
    const intake = oldHandover.intake({
      appId: APP_ID,
      messageId: item.messageId,
      chatId: CHAT_ID,
      ownerId: OWNER_ID,
      worker: "OpenCode",
      text: `PRIVATE_SPOOL_${item.messageId}`,
    });
    assert.equal(intake.status, "spooled");
  }
  const takeover = buildTakeoverReport(db, freezeGeneration);
  const newHandover = openHostHandover({ db, now: () => NOW, instanceId: "host-new" });
  await newHandover.drainFrozen({ forward: async () => ({ accepted: true, receipt: "p42-forwarded" }) });
  newHandover.unfreeze();

  if (after) {
    for (const messageId of afterMessages) {
      createReplyMessage(db, messageId);
      await acceptedReply(newHandover, messageId);
    }
  }

  let artifactEntry = null;
  if (artifact) {
    const artifactPath = path.join(root, "artifact.txt");
    writeFileSync(artifactPath, "PRIVATE_ARTIFACT_BODY");
    artifactEntry = {
      path: artifactPath,
      expectedSha256: expectedArtifactSha256 ?? sha256File(artifactPath),
    };
  }

  const messages = [];
  if (before) {
    for (const messageId of beforeMessages) messages.push({ messageId, role: "before", kind: "reply" });
  }
  for (const item of during) {
    messages.push({
      messageId: item.messageId,
      role: "during",
      kind: "domain",
      contextId: item.contextId,
      contextVersion: item.contextVersion,
    });
  }
  if (after) {
    for (const messageId of afterMessages) messages.push({ messageId, role: "after", kind: "reply" });
  }

  const expectation = {
    schema: EXPECTATION_SCHEMA,
    freezeGeneration,
    messages,
    artifacts: artifactEntry ? [artifactEntry] : [],
  };
  db.close();
  const evidence = collectHandoverEvidence({ databasePath: file, expectation });
  return { root, file, expectation, evidence, takeover, artifact: artifactEntry };
}

function cleanup(scenario) {
  if (scenario?.root) rmSync(scenario.root, { recursive: true, force: true });
}

const codes = (result) => result.blockers.map((blocker) => blocker.code);

function assertBlocker(result, code) {
  assert.equal(result.ok, false);
  assert.ok(codes(result).includes(code), `缺少 ${code}；实际 ${JSON.stringify(result.blockers)}`);
}

function messageOf(evidence, messageId) {
  return evidence.messages.find((message) => message.messageId === messageId);
}

function verify(scenario, evidence = scenario.evidence, takeoverReport = scenario.takeover) {
  return verifyHandoverEvidence({
    expectation: scenario.expectation,
    evidence,
    takeoverReport,
  });
}

function runCli(args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

// ---------------------------------------------------------------------------
// Complete pass chains
// ---------------------------------------------------------------------------

test("before reply + during domain + after reply 完整通过，证据不含私有正文", async () => {
  const scenario = await buildScenario();
  try {
    assert.equal(scenario.takeover.ready, true);
    assert.equal(scenario.takeover.drainRequired, true);
    assert.equal(scenario.takeover.counts.takeoverFrozenSpools, 1);
    assert.equal(scenario.evidence.schema, EVIDENCE_SCHEMA);
    assert.equal(scenario.evidence.messages.length, 3);
    assert.deepEqual(scenario.evidence.messages.map((message) => message.messageId), ["om_after", "om_before", "om_during"]);

    const result = verify(scenario);
    assert.equal(result.ok, true, JSON.stringify(result.blockers));
    assert.equal(result.schema, VERIFICATION_SCHEMA);
    assert.deepEqual(result.blockers, []);
    assert.equal(result.counts.duringMessages, 1);
    assert.equal(result.counts.artifacts, 1);

    const beforeOwner = messageOf(scenario.evidence, "om_before").replies[0].ownerInstanceId;
    const duringOwner = messageOf(scenario.evidence, "om_during").spools[0].ownerInstanceId;
    const afterOwner = messageOf(scenario.evidence, "om_after").replies[0].ownerInstanceId;
    assert.equal(duringOwner, "host-new");
    assert.equal(afterOwner, "host-new");
    assert.notEqual(beforeOwner, duringOwner);

    const evidenceText = JSON.stringify(scenario.evidence);
    const resultText = JSON.stringify(result);
    for (const text of [evidenceText, resultText]) {
      assert.equal(text.includes("PRIVATE_"), false);
    }
    assert.deepEqual(
      collectHandoverEvidence({ databasePath: scenario.file, expectation: scenario.expectation }),
      scenario.evidence,
      "同一静态输入重复采集必须确定",
    );
  } finally {
    cleanup(scenario);
  }
});

test("多条 during 与多个对象独立通过，N 与 forwarded 数量一致", async () => {
  const scenario = await buildScenario({
    during: [
      { messageId: "om_during_a", contextId: "capture:a", contextVersion: 1 },
      { messageId: "om_during_b", contextId: "idea:b", contextVersion: 1 },
    ],
  });
  try {
    assert.equal(scenario.takeover.counts.takeoverFrozenSpools, 2);
    const result = verify(scenario);
    assert.equal(result.ok, true, JSON.stringify(result.blockers));
    assert.equal(result.counts.duringMessages, 2);
    const duringA = messageOf(scenario.evidence, "om_during_a");
    const duringB = messageOf(scenario.evidence, "om_during_b");
    assert.equal(duringA.tasks[0].contextId, "capture:a");
    assert.equal(duringB.tasks[0].contextId, "idea:b");
    assert.equal(duringA.spools[0].ownerInstanceId, duringB.spools[0].ownerInstanceId);
  } finally {
    cleanup(scenario);
  }
});

test("多个 during／after 的 owner 冲突分别阻断，基线同新实例通过", async () => {
  const scenario = await buildScenario({
    during: [
      { messageId: "om_during_a", contextId: "capture:a", contextVersion: 1 },
      { messageId: "om_during_b", contextId: "idea:b", contextVersion: 1 },
    ],
    afterMessages: ["om_after_1", "om_after_2"],
  });
  try {
    assert.equal(verify(scenario).ok, true, JSON.stringify(verify(scenario).blockers));

    const duringConflict = structuredClone(scenario.evidence);
    messageOf(duringConflict, "om_during_b").spools[0].ownerInstanceId = "host-other";
    assertBlocker(verify(scenario, duringConflict), "spool_owner_instance_conflict");

    const afterConflict = structuredClone(scenario.evidence);
    messageOf(afterConflict, "om_after_2").replies[0].ownerInstanceId = "host-other";
    assertBlocker(verify(scenario, afterConflict), "reply_owner_instance_conflict");
  } finally {
    cleanup(scenario);
  }
});

// ---------------------------------------------------------------------------
// Evidence-level business blockers
// ---------------------------------------------------------------------------

test("event／inbox／Task／Attempt／run／delivery／spool／reply 的注入缺陷均阻断", async () => {
  const scenario = await buildScenario();
  try {
    const cases = [
      ["event missing", (e) => { messageOf(e, "om_during").events = []; }, "event_missing"],
      ["event duplicate", (e) => {
        const message = messageOf(e, "om_during");
        message.events.push({ ...message.events[0], key: `${message.messageId}:1` });
      }, "event_duplicate"],
      ["inbox missing", (e) => { messageOf(e, "om_during").inboxes = []; }, "inbox_missing"],
      ["inbox duplicate", (e) => {
        const message = messageOf(e, "om_during");
        message.inboxes.push({ ...message.inboxes[0], key: `${message.inboxes[0].key}:dup` });
      }, "inbox_duplicate"],
      ["inbox not processed", (e) => { messageOf(e, "om_during").inboxes[0].processed = false; }, "inbox_not_processed"],
      ["task missing", (e) => { messageOf(e, "om_during").tasks = []; }, "task_missing"],
      ["task duplicate", (e) => {
        const message = messageOf(e, "om_during");
        message.tasks.push({ ...message.tasks[0], id: `${message.tasks[0].id}-dup` });
      }, "task_duplicate"],
      ["attempt missing", (e) => { messageOf(e, "om_during").attempts = []; }, "attempt_missing"],
      ["attempt duplicate", (e) => {
        const message = messageOf(e, "om_during");
        message.attempts.push({ ...message.attempts[0], id: `${message.attempts[0].id}-dup` });
      }, "attempt_duplicate"],
      ["attempt not done", (e) => { messageOf(e, "om_during").attempts[0].state = "running"; }, "attempt_not_done"],
      ["run not done", (e) => { messageOf(e, "om_during").runs[0].state = "queued"; }, "run_not_done"],
      ["run lane mismatch", (e) => { messageOf(e, "om_during").runs[0].lane = "capture:other"; }, "run_lane_mismatch"],
      ["task not completed", (e) => { messageOf(e, "om_during").tasks[0].state = "running"; }, "task_not_completed"],
      ["attempt id mismatch", (e) => { messageOf(e, "om_during").attempts[0].id = "attempt-other"; }, "attempt_id_mismatch"],
      ["inbox message mismatch", (e) => { messageOf(e, "om_during").inboxes[0].messageId = "om_other"; }, "inbox_message_mismatch"],
      ["inbox context mismatch", (e) => { messageOf(e, "om_during").inboxes[0].contextId = "capture:other"; }, "inbox_context_mismatch"],
      ["inbox version mismatch", (e) => { messageOf(e, "om_during").inboxes[0].version = 2; }, "inbox_context_mismatch"],
      ["task context mismatch", (e) => { messageOf(e, "om_during").tasks[0].contextId = "capture:other"; }, "task_context_mismatch"],
      ["task context version", (e) => { messageOf(e, "om_during").tasks[0].contextVersion = 2; }, "task_context_version_mismatch"],
      ["context version", (e) => { messageOf(e, "om_during").context.version = 2; }, "context_version_mismatch"],
      ["delivery not accepted", (e) => { messageOf(e, "om_during").deliveries[0].state = "unknown"; }, "delivery_not_accepted"],
      ["delivery may send", (e) => { messageOf(e, "om_during").deliveries[0].maySend = true; }, "delivery_may_send"],
      ["delivery task mismatch", (e) => { messageOf(e, "om_during").deliveries[0].taskId = "task-other"; }, "delivery_task_mismatch"],
      ["spool not forwarded", (e) => { messageOf(e, "om_during").spools[0].state = "frozen"; }, "spool_not_forwarded"],
      ["spool generation", (e) => { messageOf(e, "om_during").spools[0].freezeGeneration = 0; }, "spool_generation_mismatch"],
      ["spool attempts", (e) => { messageOf(e, "om_during").spools[0].attempts = 2; }, "spool_attempts_invalid"],
      ["spool owner", (e) => { messageOf(e, "om_during").spools[0].ownerInstanceId = null; }, "spool_owner_instance_missing"],
      ["spool reconciliation", (e) => { messageOf(e, "om_during").spools[0].needsReconciliation = true; }, "spool_needs_reconciliation"],
      ["spool auto replay", (e) => { messageOf(e, "om_during").spools[0].autoReplay = true; }, "spool_auto_replay"],
      ["reply not accepted", (e) => { messageOf(e, "om_after").replies[0].state = "hold"; }, "reply_not_accepted"],
      ["reply owner", (e) => { messageOf(e, "om_after").replies[0].ownerInstanceId = null; }, "reply_owner_instance_missing"],
      ["reply reconciliation", (e) => { messageOf(e, "om_after").replies[0].needsReconciliation = true; }, "reply_needs_reconciliation"],
      ["reply auto replay", (e) => { messageOf(e, "om_after").replies[0].autoReplay = true; }, "reply_auto_replay"],
      ["reply domain chain", (e) => {
        const after = messageOf(e, "om_after");
        after.deliveries.push({ ...messageOf(e, "om_during").deliveries[0] });
      }, "reply_has_domain_chain"],
      ["same before after owner", (e) => {
        messageOf(e, "om_after").replies[0].ownerInstanceId = messageOf(e, "om_before").replies[0].ownerInstanceId;
      }, "reply_owner_instance_same"],
      ["during after different owner", (e) => {
        messageOf(e, "om_after").replies[0].ownerInstanceId = "host-other";
      }, "runtime_owner_mismatch"],
      ["during equals before owner", (e) => {
        messageOf(e, "om_during").spools[0].ownerInstanceId = messageOf(e, "om_before").replies[0].ownerInstanceId;
      }, "before_owner_instance_reused"],
      ["stable id reused", (e) => {
        messageOf(e, "om_after").replies[0].id = messageOf(e, "om_before").replies[0].id;
      }, "stable_id_reused"],
    ];

    for (const [label, mutate, code] of cases) {
      const evidence = structuredClone(scenario.evidence);
      mutate(evidence);
      const result = verify(scenario, evidence);
      assertBlocker(result, code);
      assert.equal(JSON.stringify(result).includes("PRIVATE_"), false, label);
    }
  } finally {
    cleanup(scenario);
  }
});

test("takeover 模式／generation／N 与最终全局计数分别阻断", async () => {
  const scenario = await buildScenario();
  try {
    const takeoverCases = [
      ["not ready", (report) => { report.ready = false; }, "takeover_not_ready"],
      ["entry mode", (report) => { report.mode = "entry"; }, "takeover_mode_invalid"],
      ["expected generation", (report) => { report.expectedFreezeGeneration = 2; }, "takeover_generation_mismatch"],
      ["observed generation", (report) => { report.observedFreezeGeneration = 2; }, "takeover_generation_mismatch"],
      ["count zero", (report) => { report.counts.takeoverFrozenSpools = 0; }, "takeover_count_mismatch"],
      ["count too many", (report) => { report.counts.takeoverFrozenSpools = 2; }, "takeover_count_mismatch"],
      ["drain flag false", (report) => { report.drainRequired = false; }, "takeover_drain_flag_mismatch"],
      ["drain flag true with zero", (report) => {
        report.counts.takeoverFrozenSpools = 0;
        report.drainRequired = true;
      }, "takeover_drain_flag_mismatch"],
    ];
    for (const [label, mutate, code] of takeoverCases) {
      const report = structuredClone(scenario.takeover);
      mutate(report);
      const result = verify(scenario, scenario.evidence, report);
      assertBlocker(result, code);
      assert.equal(JSON.stringify(result).includes("PRIVATE_"), false, label);
    }

    const globalCases = [
      ["active task", (global) => { global.activeTasks = 1; }, "active_task"],
      ["other active task", (global) => { global.otherActiveTasks = 1; }, "other_active_task"],
      ["queued event", (global) => { global.queuedEvents = 1; }, "queued_event"],
      ["pending decision", (global) => { global.pendingDecisions = 1; }, "pending_decision"],
      ["queued delivery", (global) => { global.queuedDeliveries = 1; }, "queued_delivery"],
      ["unknown delivery", (global) => { global.unknownDeliveries = 1; }, "unknown_delivery"],
      ["handover pending", (global) => { global.handoverPending = 1; }, "handover_pending"],
      ["handover hold", (global) => { global.handoverHolds = 1; }, "handover_hold"],
      ["reconciliation", (global) => { global.reconciliationBlocking = true; }, "reconciliation_blocking"],
    ];
    for (const [label, mutate, code] of globalCases) {
      const evidence = structuredClone(scenario.evidence);
      mutate(evidence.global);
      const result = verify(scenario, evidence);
      assertBlocker(result, code);
      assert.equal(JSON.stringify(result).includes("PRIVATE_"), false, label);
    }

    const evidence = structuredClone(scenario.evidence);
    evidence.freezeGeneration = 2;
    assertBlocker(verify(scenario, evidence), "evidence_generation_mismatch");
  } finally {
    cleanup(scenario);
  }
});

test("artifact 缺失、目录冒充文件与 hash 不一致均阻断", async () => {
  for (const kind of ["missing", "directory", "hash"]) {
    const scenario = kind === "hash"
      ? await buildScenario({ expectedArtifactSha256: "0".repeat(64) })
      : await buildScenario();
    try {
      if (kind === "missing") rmSync(scenario.artifact.path);
      if (kind === "directory") {
        rmSync(scenario.artifact.path);
        mkdirSync(scenario.artifact.path);
      }
      const evidence = kind === "hash"
        ? scenario.evidence
        : collectHandoverEvidence({ databasePath: scenario.file, expectation: scenario.expectation });
      const result = verify(scenario, evidence);
      const expectedCode = kind === "missing" ? "artifact_missing"
        : kind === "directory" ? "artifact_not_regular" : "artifact_hash_mismatch";
      assertBlocker(result, expectedCode);
    } finally {
      cleanup(scenario);
    }
  }
});

// ---------------------------------------------------------------------------
// Structural failures
// ---------------------------------------------------------------------------

test("expectation／evidence／takeover 缺字段、错误类型与未知 schema 失败关闭", async () => {
  const scenario = await buildScenario();
  try {
    const badExpectations = [
      (value) => { delete value.messages; },
      (value) => { value.schema = "unknown"; },
      (value) => { value.messages[0].role = "during"; value.messages[0].kind = "reply"; },
      (value) => { value.messages.push({ ...value.messages[0] }); },
      (value) => { value.messages[0].contextId = "/private/context"; value.messages[0].contextVersion = 0; },
      (value) => { value.artifacts[0].expectedSha256 = "ABC"; },
      (value) => { value.artifacts[0].path = "relative.txt"; },
    ];
    for (const mutate of badExpectations) {
      const expectation = structuredClone(scenario.expectation);
      mutate(expectation);
      assert.throws(
        () => verifyHandoverEvidence({ expectation, evidence: scenario.evidence, takeoverReport: scenario.takeover }),
        (error) => error?.code === "PREFLIGHT_INPUT_INVALID",
      );
    }

    const badEvidence = [
      (value) => { delete value.messages[0].events; },
      (value) => {
        value.messages.find((message) => message.messageId === "om_during").spools[0].needsReconciliation = "no";
      },
      (value) => { value.schema = "unknown"; },
      (value) => { value.artifacts[0].actualSha256 = "not-a-hash"; },
      (value) => { value.messages.pop(); },
    ];
    for (const mutate of badEvidence) {
      const evidence = structuredClone(scenario.evidence);
      mutate(evidence);
      assert.throws(
        () => verifyHandoverEvidence({ expectation: scenario.expectation, evidence, takeoverReport: scenario.takeover }),
        (error) => error?.code === "PREFLIGHT_INPUT_INVALID",
      );
    }

    const badTakeovers = [
      (value) => { delete value.counts; },
      (value) => { value.schema = "unknown"; },
      (value) => { value.ready = "yes"; },
      (value) => { value.expectedFreezeGeneration = 0; },
    ];
    for (const mutate of badTakeovers) {
      const takeoverReport = structuredClone(scenario.takeover);
      mutate(takeoverReport);
      assert.throws(
        () => verifyHandoverEvidence({ expectation: scenario.expectation, evidence: scenario.evidence, takeoverReport }),
        (error) => error?.code === "PREFLIGHT_INPUT_INVALID",
      );
    }
  } finally {
    cleanup(scenario);
  }
});

// ---------------------------------------------------------------------------
// CLI: collect / verify, exit codes, exclusivity, WAL guard
// ---------------------------------------------------------------------------

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

test("CLI collect／verify 通过、输出确定且不写其他文件", async () => {
  const scenario = await buildScenario();
  try {
    const expectPath = path.join(scenario.root, "expect.json");
    const evidencePath = path.join(scenario.root, "evidence.json");
    const takeoverPath = path.join(scenario.root, "takeover.json");
    const verifyPath = path.join(scenario.root, "verify.json");
    writeJson(expectPath, scenario.expectation);
    writeJson(takeoverPath, scenario.takeover);
    const beforeHash = sha256File(scenario.file);

    const collect = runCli(["collect", "--database", scenario.file, "--expect", expectPath, "--output", evidencePath]);
    assert.equal(collect.status, EXIT_OK, collect.stderr);
    const summary = JSON.parse(collect.stdout);
    assert.equal(summary.messages, 3);
    assert.equal(summary.artifacts, 1);
    assert.equal(summary.databaseSha256, beforeHash);
    assert.equal(Object.hasOwn(summary, "ok"), false);
    assert.equal(JSON.stringify(summary).includes("PRIVATE_"), false);
    const evidenceText = readFileSync(evidencePath, "utf8");
    assert.equal(evidenceText.includes("PRIVATE_"), false);

    const verify = runCli([
      "verify", "--expect", expectPath, "--evidence", evidencePath,
      "--takeover-report", takeoverPath, "--output", verifyPath,
    ]);
    assert.equal(verify.status, EXIT_OK, verify.stderr);
    assert.equal(verify.stdout, "");
    const result = JSON.parse(readFileSync(verifyPath, "utf8"));
    assert.equal(result.ok, true);
    assert.deepEqual(Object.keys(result).sort(), ["blockers", "counts", "ok", "schema"]);
    assert.equal(JSON.stringify(result).includes("PRIVATE_"), false);

    const repeated = runCli([
      "verify", "--expect", expectPath, "--evidence", evidencePath, "--takeover-report", takeoverPath,
    ]);
    assert.equal(repeated.status, EXIT_OK, repeated.stderr);
    assert.deepEqual(JSON.parse(repeated.stdout), result);

    assert.equal(sha256File(scenario.file), beforeHash);
    assert.deepEqual(
      readdirSync(scenario.root).sort(),
      ["artifact.txt", "evidence.json", "expect.json", "shared.db", "takeover.json", "verify.json"],
    );
    assert.equal(existsSync(path.join(scenario.root, "shared.db-wal")), false);
  } finally {
    cleanup(scenario);
  }
});

test("CLI verify 业务失败退出 3，结构错误退出 2", async () => {
  const scenario = await buildScenario();
  try {
    const expectPath = path.join(scenario.root, "expect.json");
    const evidencePath = path.join(scenario.root, "evidence.json");
    const takeoverPath = path.join(scenario.root, "takeover.json");
    writeJson(expectPath, scenario.expectation);
    writeJson(takeoverPath, scenario.takeover);

    const blockedEvidence = structuredClone(scenario.evidence);
    blockedEvidence.global.activeTasks = 1;
    writeJson(evidencePath, blockedEvidence);
    const blocked = runCli([
      "verify", "--expect", expectPath, "--evidence", evidencePath, "--takeover-report", takeoverPath,
    ]);
    assert.equal(blocked.status, EXIT_BLOCKED, blocked.stderr);
    const blockedResult = JSON.parse(blocked.stdout);
    assert.equal(blockedResult.ok, false);
    assert.ok(codes(blockedResult).includes("active_task"));

    writeFileSync(path.join(scenario.root, "bad.json"), "{not json", { flag: "wx" });
    const badJson = runCli([
      "verify", "--expect", path.join(scenario.root, "bad.json"),
      "--evidence", evidencePath, "--takeover-report", takeoverPath,
    ]);
    assert.equal(badJson.status, EXIT_ERROR);
    assert.equal(badJson.stdout, "");
    assert.equal(badJson.stderr.length > 0, true);

    const missingFieldEvidence = structuredClone(scenario.evidence);
    delete missingFieldEvidence.global;
    const missingPath = path.join(scenario.root, "missing.json");
    writeJson(missingPath, missingFieldEvidence);
    const badShape = runCli([
      "verify", "--expect", expectPath, "--evidence", missingPath, "--takeover-report", takeoverPath,
    ]);
    assert.equal(badShape.status, EXIT_ERROR);
  } finally {
    cleanup(scenario);
  }
});

test("CLI 拒绝相对路径、重复参数、未知参数与 output 覆盖", async () => {
  const scenario = await buildScenario({ artifact: false });
  try {
    const expectPath = path.join(scenario.root, "expect.json");
    const takeoverPath = path.join(scenario.root, "takeover.json");
    const evidencePath = path.join(scenario.root, "evidence.json");
    writeJson(expectPath, scenario.expectation);
    writeJson(takeoverPath, scenario.takeover);
    writeJson(evidencePath, scenario.evidence);
    const existing = path.join(scenario.root, "existing.json");
    writeFileSync(existing, "keep-me\n", { flag: "wx" });
    const badExpectPath = path.join(scenario.root, "bad-expect.json");
    writeFileSync(badExpectPath, "{not json", { flag: "wx" });
    const missingParentOutput = path.join(scenario.root, "missing-dir", "evidence.json");

    const cases = [
      ["unknown command", ["bogus"]],
      ["missing collect output", ["collect", "--database", scenario.file, "--expect", expectPath]],
      ["relative database", ["collect", "--database", "shared.db", "--expect", expectPath, "--output", path.join(scenario.root, "o1.json")]],
      ["relative expect", ["collect", "--database", scenario.file, "--expect", "expect.json", "--output", path.join(scenario.root, "o2.json")]],
      ["duplicate flag", ["collect", "--database", scenario.file, "--database", scenario.file, "--expect", expectPath, "--output", path.join(scenario.root, "o3.json")]],
      ["unknown flag", ["collect", "--database", scenario.file, "--expect", expectPath, "--output", path.join(scenario.root, "o4.json"), "--bogus"]],
      ["output exists", ["collect", "--database", scenario.file, "--expect", expectPath, "--output", existing]],
      ["bad expect", ["collect", "--database", scenario.file, "--expect", badExpectPath, "--output", path.join(scenario.root, "o5.json")]],
      ["missing output parent", ["collect", "--database", scenario.file, "--expect", expectPath, "--output", missingParentOutput]],
      ["missing verify flag", ["verify", "--expect", expectPath, "--evidence", existing]],
      ["relative verify evidence", ["verify", "--expect", expectPath, "--evidence", "evidence.json", "--takeover-report", takeoverPath]],
      ["verify output exists", [
        "verify", "--expect", expectPath, "--evidence", evidencePath,
        "--takeover-report", takeoverPath, "--output", existing,
      ]],
    ];
    for (const [label, args] of cases) {
      const result = runCli(args);
      assert.equal(result.status, EXIT_ERROR, `${label}: ${result.stdout}${result.stderr}`);
      assert.equal(result.stdout, "", label);
      assert.equal(result.stderr.length > 0, true, label);
    }
    assert.equal(readFileSync(existing, "utf8"), "keep-me\n");
    assert.equal(existsSync(path.join(scenario.root, "o5.json")), false);
    assert.equal(existsSync(missingParentOutput), false);
  } finally {
    cleanup(scenario);
  }
});

test("collect 对活跃 WAL 与无 sidecar WAL 失败关闭且不改变文件", async () => {
  const root = temporaryRoot();
  const expectPath = path.join(root, "expect.json");
  writeJson(expectPath, {
    schema: EXPECTATION_SCHEMA,
    freezeGeneration: 1,
    messages: [{ messageId: "om_wal", role: "during", kind: "domain", contextId: "capture:wal", contextVersion: 1 }],
    artifacts: [],
  });
  try {
    const active = path.join(root, "active.db");
    const writer = new DatabaseSync(active);
    writer.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
    openBusinessView(writer);
    assert.equal(existsSync(`${active}-wal`), true);
    assert.equal(existsSync(`${active}-shm`), true);
    const before = Object.fromEntries(readdirSync(root).sort().map((name) => [name, sha256File(path.join(root, name))]));
    const activeOutput = path.join(root, "active-evidence.json");
    const activeResult = runCli(["collect", "--database", active, "--expect", expectPath, "--output", activeOutput]);
    assert.equal(activeResult.status, EXIT_ERROR, activeResult.stdout);
    assert.equal(activeResult.stdout, "");
    assert.equal(existsSync(activeOutput), false);
    assert.deepEqual(
      Object.fromEntries(readdirSync(root).sort().map((name) => [name, sha256File(path.join(root, name))])),
      before,
    );
    writer.close();

    const cleanWal = path.join(root, "clean-wal.db");
    const cleanWriter = new DatabaseSync(cleanWal);
    cleanWriter.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
    openBusinessView(cleanWriter);
    cleanWriter.close();
    assert.equal(existsSync(`${cleanWal}-wal`), false);
    assert.equal(existsSync(`${cleanWal}-shm`), false);
    const cleanHash = sha256File(cleanWal);
    const listing = readdirSync(root).sort();
    const cleanOutput = path.join(root, "clean-evidence.json");
    const cleanResult = runCli(["collect", "--database", cleanWal, "--expect", expectPath, "--output", cleanOutput]);
    assert.equal(cleanResult.status, EXIT_ERROR, cleanResult.stdout);
    assert.equal(cleanResult.stdout, "");
    assert.equal(existsSync(cleanOutput), false);
    assert.deepEqual(readdirSync(root).sort(), listing);
    assert.equal(sha256File(cleanWal), cleanHash);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI help 只打印用法且不创建文件", () => {
  const root = temporaryRoot();
  try {
    const result = runCli(["--help"]);
    assert.equal(result.status, EXIT_OK);
    assert.match(result.stdout, /collect/);
    assert.match(result.stdout, /verify/);
    assert.deepEqual(readdirSync(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
