import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { FORMAT } from "../packages/syno-autoloop/examples/syno-p0/commands.ts";
import { commitLatest } from "../packages/syno-autoloop/kernel/store.ts";
import { planMigration } from "../experiments/superagent-p0/migration-rehearsal.mjs";
import {
  ALLOWED_MIGRATION_ACTIONS,
  EXIT_ERROR,
  EXIT_NOT_READY,
  EXIT_READY,
  FORBIDDEN_MIGRATION_ACTIONS,
  PREFLIGHT_SCHEMA,
  PreflightInputError,
  evaluateDatabasePreflight,
} from "../experiments/superagent-p0/production-handover-preflight.mjs";

const CLI = fileURLToPath(new URL("../experiments/superagent-p0/production-handover-preflight.mjs", import.meta.url));
const DOMAINS = ["capture", "knowledge", "idea", "project", "memory"];

// ---------------------------------------------------------------------------
// Plain-data fixtures. No Host, Feishu client, Worker or model is started.
// ---------------------------------------------------------------------------

function cleanHostStatus() {
  return {
    schema: "syno-host-status-v1",
    frozen: false,
    domains: Object.fromEntries(DOMAINS.map((domain) => [domain, { activeTasks: [], queued: [] }])),
    activeTasks: [],
    otherActiveTasks: [],
    queued: Object.fromEntries(DOMAINS.map((domain) => [domain, []])),
    decisions: { pending: [] },
    deliveries: { queued: [], unknown: [], acceptedCount: 0 },
    handover: {
      schema: "syno-handover-status-v1",
      control: { frozen: false, generation: 0, reason: null, updatedAt: null },
      frozen: false,
      generation: 0,
      spool: { counts: { frozen: 0, dispatching: 0, forwarded: 0, hold: 0 } },
      replies: { counts: { sending: 0, accepted: 0, hold: 0 } },
      pending: [],
      holds: [],
      pendingCount: 0,
      holdCount: 0,
    },
    reconciliation: { deliveryUnknown: [], handoverHolds: [], blocking: false },
  };
}

function cleanMigrationPlan() {
  return {
    schema: 1,
    items: [
      { kind: "inbox", id: "om_done", objectId: "capture:a", targetKey: "inbox:om_done", action: "dedupe_only" },
      { kind: "task", id: "done", objectId: "capture:a", targetKey: "task:done", action: "history_only" },
      {
        kind: "delivery", id: "sent", objectId: "capture:a", targetKey: "delivery:sent", action: "dedupe_no_resend",
      },
      { kind: "publishing", id: "note", objectId: "capture:a", targetKey: "publishing:note", action: "mapping_only" },
      { kind: "domain", id: "memory", objectId: "owner", targetKey: "domain:memory", action: "copy_versioned" },
    ],
    cutoverBlocked: false,
    externalEffects: 0,
  };
}

const evaluate = (hostStatus = cleanHostStatus(), migrationPlan = cleanMigrationPlan(), expectedFreezeGeneration) => (
  evaluateDatabasePreflight({
    hostStatus,
    migrationPlan,
    ...(expectedFreezeGeneration === undefined ? {} : { expectedFreezeGeneration }),
  })
);

function frozenSpool(id, generation = 6, overrides = {}) {
  return {
    id: `handover:spool:${id}`,
    state: "frozen",
    freezeGeneration: generation,
    needsReconciliation: false,
    autoReplay: false,
    ...overrides,
  };
}

// Mirrors the shape produced by buildHostStatus + openHostHandover.status().
function frozenHostStatus({
  generation = 6,
  pending = [],
  holds = [],
  hostFrozen = true,
  handoverFrozen = true,
  controlFrozen = true,
} = {}) {
  const status = cleanHostStatus();
  status.frozen = hostFrozen;
  status.handover = {
    schema: "syno-handover-status-v1",
    control: { frozen: controlFrozen, generation, reason: "cutover", updatedAt: 1 },
    frozen: handoverFrozen,
    generation,
    spool: { counts: { frozen: pending.length, dispatching: 0, forwarded: 0, hold: holds.length } },
    replies: { counts: { sending: 0, accepted: 0, hold: 0 } },
    pending,
    holds,
    pendingCount: pending.length,
    holdCount: holds.length,
  };
  status.reconciliation.handoverHolds = holds.map((item) => item.id);
  status.reconciliation.blocking = holds.length > 0;
  return status;
}

function blockerOf(report, code) {
  return report.blockers.find((blocker) => blocker.code === code);
}

function assertBlocked(report, code, count, label = code) {
  assert.equal(report.ready, false, `${label} 必须阻断`);
  const blocker = blockerOf(report, code);
  assert.ok(blocker, `${label} 缺少阻断码 ${code}；实际 ${JSON.stringify(report.blockers)}`);
  assert.equal(blocker.count, count, `${label} 的 ${code} 计数`);
}

// ---------------------------------------------------------------------------
// 1. Clean state passes; only the inert P4 archive actions are present.
// ---------------------------------------------------------------------------

test("干净数据库事实通过，迁移动作全部属于只读归档策略", () => {
  const report = evaluate();
  assert.equal(report.schema, PREFLIGHT_SCHEMA);
  assert.equal(report.ready, true);
  assert.deepEqual(report.blockers, []);
  assert.equal(report.counts.activeTasks, 0);
  assert.equal(report.counts.otherActiveTasks, 0);
  assert.equal(report.counts.queuedEvents, 0);
  assert.equal(report.counts.pendingDecisions, 0);
  assert.equal(report.counts.queuedDeliveries, 0);
  assert.equal(report.counts.unknownDeliveries, 0);
  assert.equal(report.counts.handoverPending, 0);
  assert.equal(report.counts.handoverHolds, 0);
  assert.equal(report.counts.reconciliationBlocking, false);
  assert.equal(report.counts.externalEffects, 0);
  assert.equal(report.migration.cutoverBlocked, false);
  assert.equal(report.scope.databaseGateOnly, true);
  for (const action of Object.keys(report.migration.actions)) {
    assert.ok(ALLOWED_MIGRATION_ACTIONS.includes(action), `非只读归档动作：${action}`);
  }
  assert.deepEqual(Object.keys(report.migration.actions), [
    "copy_versioned", "dedupe_no_resend", "dedupe_only", "history_only", "mapping_only",
  ]);
  assert.equal(report.migration.actions.history_only, 1);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(report)));
});

// ---------------------------------------------------------------------------
// 2. Each blocked host category has evidence; the five domains are parameterized.
// ---------------------------------------------------------------------------

test("active Task、五领域 queued、pending Decision、delivery 与 handover 分别阻断", () => {
  const cases = [
    ...DOMAINS.flatMap((domain) => [
      {
        label: `${domain} active task`,
        mutate: (status) => {
          const task = { taskId: `task-${domain}` };
          status.domains[domain].activeTasks.push(task);
          status.activeTasks.push(task);
        },
        code: "active_task",
        count: 1,
      },
      {
        label: `${domain} queued event`,
        mutate: (status) => {
          status.domains[domain].queued.push({ messageId: `om-${domain}` });
        },
        code: "queued_event",
        count: 1,
      },
    ]),
    {
      label: "other active task",
      mutate: (status) => {
        const task = { taskId: "task-other" };
        status.otherActiveTasks.push(task);
        status.activeTasks.push(task);
      },
      code: "active_task",
      count: 1,
    },
    {
      label: "pending decision",
      mutate: (status) => { status.decisions.pending.push({ decisionId: "decision-1" }); },
      code: "pending_decision",
      count: 1,
    },
    {
      label: "queued delivery",
      mutate: (status) => { status.deliveries.queued.push({ deliveryKey: "delivery:queued" }); },
      code: "queued_delivery",
      count: 1,
    },
    {
      label: "unknown delivery",
      mutate: (status) => {
        status.deliveries.unknown.push({ deliveryKey: "delivery:unknown" });
        status.reconciliation.deliveryUnknown.push("delivery:unknown");
        status.reconciliation.blocking = true;
      },
      code: "unknown_delivery",
      count: 1,
    },
    {
      label: "handover pending",
      mutate: (status) => {
        status.handover.pending.push({ id: "spool:1" });
        status.handover.pendingCount = 1;
      },
      code: "handover_pending",
      count: 1,
    },
    {
      label: "handover hold",
      mutate: (status) => {
        status.handover.holds.push({ id: "reply:1" });
        status.handover.holdCount = 1;
        status.reconciliation.handoverHolds.push("reply:1");
        status.reconciliation.blocking = true;
      },
      code: "handover_hold",
      count: 1,
    },
    {
      label: "handover unobserved",
      mutate: (status) => { status.handover = null; },
      code: "handover_unobserved",
      count: 1,
    },
    {
      label: "reconciliation blocking",
      mutate: (status) => { status.reconciliation.blocking = true; },
      code: "reconciliation_blocking",
      count: 1,
    },
  ];

  for (const item of cases) {
    const status = cleanHostStatus();
    item.mutate(status);
    const report = evaluate(status);
    assertBlocked(report, item.code, item.count, item.label);
  }

  // Counts aggregate across domains instead of hiding behind a boolean.
  const mixed = cleanHostStatus();
  const captureTask = { taskId: "task-capture" };
  const ideaTask = { taskId: "task-idea" };
  mixed.domains.capture.activeTasks.push(captureTask);
  mixed.domains.idea.activeTasks.push(ideaTask);
  mixed.activeTasks.push(captureTask, ideaTask);
  mixed.domains.project.queued.push({ messageId: "om-project" });
  mixed.domains.memory.queued.push({ messageId: "om-memory" });
  const report = evaluate(mixed);
  assertBlocked(report, "active_task", 2, "two domain tasks");
  assertBlocked(report, "queued_event", 2, "two domain queued events");
  assert.equal(report.counts.domains.project.queued, 1);
  assert.equal(report.counts.domains.memory.queued, 1);
});

test("entry 模式仍阻断当前 generation 的 frozen spool", () => {
  const status = frozenHostStatus({ pending: [frozenSpool("a"), frozenSpool("b")] });
  const report = evaluate(status);
  assert.equal(report.mode, "entry");
  assert.equal(report.expectedFreezeGeneration, null);
  assert.equal(report.observedFreezeGeneration, 6);
  assert.equal(report.drainRequired, false);
  assertBlocked(report, "handover_pending", 2, "entry frozen spool");
  assert.equal(report.counts.takeoverFrozenSpools, 0);
});

test("takeover 仅放行显式 generation 的 frozen spool，并报告 drainRequired", () => {
  const empty = evaluate(frozenHostStatus({}), cleanMigrationPlan(), 6);
  assert.equal(empty.mode, "takeover");
  assert.equal(empty.expectedFreezeGeneration, 6);
  assert.equal(empty.observedFreezeGeneration, 6);
  assert.equal(empty.ready, true);
  assert.deepEqual(empty.blockers, []);
  assert.equal(empty.drainRequired, false);
  assert.equal(empty.counts.takeoverFrozenSpools, 0);

  const multiple = evaluate(
    frozenHostStatus({ pending: [frozenSpool("a"), frozenSpool("b")] }),
    cleanMigrationPlan(),
    6,
  );
  assert.equal(multiple.ready, true);
  assert.deepEqual(multiple.blockers, []);
  assert.equal(multiple.drainRequired, true);
  assert.equal(multiple.counts.handoverPending, 2);
  assert.equal(multiple.counts.takeoverFrozenSpools, 2);
});

test("takeover 下 active／queued／pending Decision／unknown／hold／禁止 action 仍分别阻断", () => {
  const base = () => frozenHostStatus({ pending: [frozenSpool("a"), frozenSpool("b")] });
  const cases = [
    {
      label: "active task",
      mutate: (status) => {
        const task = { taskId: "task-active" };
        status.domains.capture.activeTasks.push(task);
        status.activeTasks.push(task);
      },
      code: "active_task",
    },
    {
      label: "domain queued",
      mutate: (status) => { status.domains.project.queued.push({ messageId: "om-project" }); },
      code: "queued_event",
    },
    {
      label: "pending decision",
      mutate: (status) => { status.decisions.pending.push({ decisionId: "decision-1" }); },
      code: "pending_decision",
    },
    {
      label: "unknown delivery",
      mutate: (status) => {
        status.deliveries.unknown.push({ deliveryKey: "delivery:unknown" });
        status.reconciliation.deliveryUnknown.push("delivery:unknown");
        status.reconciliation.blocking = true;
      },
      code: "unknown_delivery",
    },
    {
      label: "handover hold",
      mutate: (status) => {
        const hold = { id: "handover:reply:1", state: "hold" };
        status.handover.holds.push(hold);
        status.handover.holdCount = 1;
        status.reconciliation.handoverHolds.push(hold.id);
        status.reconciliation.blocking = true;
      },
      code: "handover_hold",
    },
    {
      label: "forbidden migration action",
      mutate: (status) => {},
      plan: (plan) => {
        plan.items.push({
          kind: "task", id: "task-requeue", objectId: "capture:a", targetKey: "task:requeue", action: "requeue_after_cutover",
        });
      },
      code: "migration_action_requeue_after_cutover",
    },
  ];

  for (const item of cases) {
    const status = base();
    item.mutate(status);
    const plan = cleanMigrationPlan();
    item.plan?.(plan);
    const report = evaluate(status, plan, 6);
    assert.equal(report.ready, false, item.label);
    assert.equal(report.drainRequired, false, `${item.label} 未 ready 不得报告可 drain`);
    assert.ok(blockerOf(report, item.code), `${item.label} 缺少 ${item.code}`);
  }
});

test("takeover 对旧 generation、未冻结、矛盾与不可接管 pending 失败关闭", () => {
  const cases = [
    {
      label: "old generation",
      status: () => frozenHostStatus({ pending: [frozenSpool("a", 6)] }),
      generation: 5,
      codes: ["handover_generation_mismatch", "handover_pending_generation_mismatch"],
    },
    {
      label: "not frozen",
      status: () => frozenHostStatus({ hostFrozen: false }),
      generation: 6,
      codes: ["handover_not_frozen"],
    },
    {
      label: "generation conflict",
      status: () => {
        const status = frozenHostStatus({});
        status.handover.control.generation = 7;
        return status;
      },
      generation: 6,
      codes: ["handover_generation_conflict"],
    },
    {
      label: "pending not frozen",
      status: () => frozenHostStatus({ pending: [frozenSpool("a", 6, { state: "dispatching" })] }),
      generation: 6,
      codes: ["handover_pending_not_frozen"],
    },
    {
      label: "needs reconciliation",
      status: () => frozenHostStatus({ pending: [frozenSpool("a", 6, { needsReconciliation: true })] }),
      generation: 6,
      codes: ["handover_pending_needs_reconciliation"],
    },
    {
      label: "auto replay",
      status: () => frozenHostStatus({ pending: [frozenSpool("a", 6, { autoReplay: true })] }),
      generation: 6,
      codes: ["handover_pending_auto_replay"],
    },
    {
      label: "unknown handover schema",
      status: () => {
        const status = frozenHostStatus({ pending: [frozenSpool("a")] });
        status.handover.schema = "syno-handover-status-v99";
        return status;
      },
      generation: 6,
      codes: ["handover_schema_unknown"],
    },
    {
      label: "pending count mismatch",
      status: () => {
        const status = frozenHostStatus({ pending: [frozenSpool("a"), frozenSpool("b")] });
        status.handover.pendingCount = 1;
        status.handover.spool.counts.frozen = 1;
        return status;
      },
      generation: 6,
      codes: ["handover_status_inconsistent"],
    },
    {
      label: "frozen spool count mismatch",
      status: () => {
        const status = frozenHostStatus({ pending: [frozenSpool("a"), frozenSpool("b")] });
        status.handover.spool.counts.frozen = 1;
        return status;
      },
      generation: 6,
      codes: ["handover_status_inconsistent"],
    },
    {
      label: "dispatching without a hold row",
      status: () => {
        const status = frozenHostStatus({ pending: [frozenSpool("a")] });
        status.handover.spool.counts.dispatching = 1;
        return status;
      },
      generation: 6,
      codes: ["handover_status_inconsistent"],
    },
  ];

  for (const item of cases) {
    const report = evaluate(item.status(), cleanMigrationPlan(), item.generation);
    assert.equal(report.ready, false, item.label);
    assert.equal(report.drainRequired, false, `${item.label} 不得报告可 drain`);
    for (const code of item.codes) assert.ok(blockerOf(report, code), `${item.label} 缺少 ${code}`);
  }
});

// ---------------------------------------------------------------------------
// 3. Migration actions: every resume/requeue/claim/hold action blocks, as does anything unknown.
// ---------------------------------------------------------------------------
test("恢复执行类与未知迁移动作全部阻断，externalEffects 非零阻断", () => {
  for (const action of FORBIDDEN_MIGRATION_ACTIONS) {
    const plan = cleanMigrationPlan();
    plan.items.push({ kind: "task", id: `task-${action}`, objectId: "capture:a", targetKey: `task:${action}`, action });
    if (action === "hold_for_reconciliation") plan.cutoverBlocked = true;
    const report = evaluate(cleanHostStatus(), plan);
    assertBlocked(report, `migration_action_${action}`, 1, action);
    assert.equal(report.counts.migrationForbiddenActions, 1);
  }

  const unknown = cleanMigrationPlan();
  unknown.items.push({
    kind: "task", id: "task-unknown", objectId: "capture:a", targetKey: "task:unknown", action: "replay_forever",
  });
  const unknownReport = evaluate(cleanHostStatus(), unknown);
  assertBlocked(unknownReport, "migration_action_unknown", 1, "unknown action");
  assert.equal(unknownReport.counts.migrationUnknownActions, 1);

  const malformedAction = cleanMigrationPlan();
  malformedAction.items.push({ kind: "task", id: "task-malformed", objectId: "capture:a", targetKey: "task:x", action: 42 });
  assertBlocked(evaluate(cleanHostStatus(), malformedAction), "migration_action_unknown", 1, "non-string action");

  const duplicateForbidden = cleanMigrationPlan();
  duplicateForbidden.items.push(
    { kind: "task", id: "task-r1", objectId: "capture:a", targetKey: "task:r1", action: "requeue_after_cutover" },
    { kind: "task", id: "task-r2", objectId: "capture:a", targetKey: "task:r2", action: "requeue_after_cutover" },
  );
  const duplicateReport = evaluate(cleanHostStatus(), duplicateForbidden);
  assertBlocked(duplicateReport, "migration_action_requeue_after_cutover", 2, "duplicate forbidden action");
  assert.equal(duplicateReport.blockers.filter((blocker) => blocker.code === "migration_action_requeue_after_cutover").length, 1);
  assert.equal(duplicateReport.counts.migrationForbiddenActions, 2);

  const effects = cleanMigrationPlan();
  effects.externalEffects = 2;
  assertBlocked(evaluate(cleanHostStatus(), effects), "external_effects", 2, "external effects");

  const blocked = cleanMigrationPlan();
  blocked.cutoverBlocked = true;
  assertBlocked(evaluate(cleanHostStatus(), blocked), "migration_cutover_blocked", 1, "cutover blocked");
});

test("既有 planMigration 未被放宽：真实 queued／checkpoint／pending／delivery 动作仍被门禁阻断", () => {
  const snapshot = {
    schema: 1,
    inbox: [{ id: "om_done", objectId: "capture:a", state: "processed" }],
    tasks: [
      { id: "queued", objectId: "capture:a", state: "queued" },
      { id: "resumable", objectId: "capture:a", state: "running", checkpoint: "candidate-written", sourceSha256: "a".repeat(64) },
    ],
    decisions: [{ id: "pending", objectId: "capture:a", state: "pending", version: 3 }],
    deliveries: [{ id: "queued", objectId: "capture:a", state: "queued" }],
    publishing: [],
    domainRecords: [],
  };
  const plan = planMigration(snapshot);
  // The shared planner keeps its P3.4 semantics; the P4 gate is what rejects them.
  assert.deepEqual(
    plan.items.filter((item) => item.kind === "task").map((item) => item.action),
    ["requeue_after_cutover", "resume_after_verification"],
  );
  assert.equal(plan.cutoverBlocked, false);
  const report = evaluate(cleanHostStatus(), plan);
  assertBlocked(report, "migration_action_requeue_after_cutover", 1, "queued task");
  assertBlocked(report, "migration_action_resume_after_verification", 1, "resumable task");
  assertBlocked(report, "migration_action_migrate_exact_version", 1, "pending decision");
  assertBlocked(report, "migration_action_migrate_claimable", 1, "queued delivery");
});

// ---------------------------------------------------------------------------
// 4. Missing fields/bad types fail closed by exception; unknown schema fails closed by blocker.
// 12. Output is stable, serializable and contains no private canaries.
// ---------------------------------------------------------------------------

test("缺字段与错误类型抛出清晰参数错误，未知 schema 失败关闭", () => {
  const missingDomains = cleanHostStatus();
  delete missingDomains.domains;
  assert.throws(
    () => evaluate(missingDomains),
    (error) => error instanceof PreflightInputError && /hostStatus\.domains/.test(error.message),
  );

  const badQueued = cleanHostStatus();
  badQueued.domains.capture.queued = "not-an-array";
  assert.throws(
    () => evaluate(badQueued),
    (error) => error instanceof PreflightInputError && /hostStatus\.domains\.capture\.queued/.test(error.message),
  );

  const missingDeliveries = cleanHostStatus();
  delete missingDeliveries.deliveries.unknown;
  assert.throws(
    () => evaluate(missingDeliveries),
    (error) => error instanceof PreflightInputError && /hostStatus\.deliveries\.unknown/.test(error.message),
  );

  const badReconciliation = cleanHostStatus();
  badReconciliation.reconciliation.blocking = "no";
  assert.throws(
    () => evaluate(badReconciliation),
    (error) => error instanceof PreflightInputError && /reconciliation\.blocking/.test(error.message),
  );

  const inconsistentTasks = cleanHostStatus();
  inconsistentTasks.domains.capture.activeTasks.push({ taskId: "task-capture" });
  assert.throws(
    () => evaluate(inconsistentTasks),
    (error) => error instanceof PreflightInputError && /activeTasks 必须等于/.test(error.message),
  );

  const badPlanItems = cleanMigrationPlan();
  badPlanItems.items = {};
  assert.throws(
    () => evaluate(cleanHostStatus(), badPlanItems),
    (error) => error instanceof PreflightInputError && /migrationPlan\.items/.test(error.message),
  );

  const badCutover = cleanMigrationPlan();
  delete badCutover.cutoverBlocked;
  assert.throws(
    () => evaluate(cleanHostStatus(), badCutover),
    (error) => error instanceof PreflightInputError && /cutoverBlocked/.test(error.message),
  );

  const badEffects = cleanMigrationPlan();
  badEffects.externalEffects = -1;
  assert.throws(
    () => evaluate(cleanHostStatus(), badEffects),
    (error) => error instanceof PreflightInputError && /externalEffects/.test(error.message),
  );

  const unknownStatusSchema = cleanHostStatus();
  unknownStatusSchema.schema = "syno-host-status-v99";
  assertBlocked(evaluate(unknownStatusSchema), "host_status_schema_unknown", 1, "unknown host schema");

  const unknownPlanSchema = cleanMigrationPlan();
  unknownPlanSchema.schema = 2;
  assertBlocked(evaluate(cleanHostStatus(), unknownPlanSchema), "migration_plan_schema_unknown", 1, "unknown plan schema");

  const missingItemField = frozenHostStatus({ pending: [frozenSpool("a")] });
  delete missingItemField.handover.pending[0].needsReconciliation;
  assert.throws(
    () => evaluate(missingItemField, cleanMigrationPlan(), 6),
    (error) => error instanceof PreflightInputError && /needsReconciliation/.test(error.message),
  );

  const badItemGeneration = frozenHostStatus({ pending: [frozenSpool("a", 6, { freezeGeneration: "6" })] });
  assert.throws(
    () => evaluate(badItemGeneration, cleanMigrationPlan(), 6),
    (error) => error instanceof PreflightInputError && /freezeGeneration/.test(error.message),
  );

  for (const generation of [0, -1, 1.5, "6"]) {
    assert.throws(
      () => evaluate(cleanHostStatus(), cleanMigrationPlan(), generation),
      (error) => error instanceof PreflightInputError && /expectedFreezeGeneration/.test(error.message),
      `expectedFreezeGeneration=${generation}`,
    );
  }
});

test("报告可序列化、重复调用一致且不含私有正文或 Memory 值", () => {
  const status = cleanHostStatus();
  status.decisions.pending.push({ decisionId: "decision-1", candidateText: "PRIVATE_DECISION_TEXT" });
  status.deliveries.queued.push({ deliveryKey: "delivery:1", body: "PRIVATE_DELIVERY_BODY" });
  status.handover.pending.push({ id: "spool:1", text: "PRIVATE_SPOOL_TEXT" });
  status.handover.pendingCount = 1;
  const plan = cleanMigrationPlan();
  plan.items.push({
    kind: "domain",
    id: "memory-1",
    objectId: "memory:memory-1",
    targetKey: "domain:memory-1",
    action: "copy_versioned",
    value: "PRIVATE_MEMORY_VALUE",
  });

  const first = evaluate(status, plan);
  const second = evaluate(status, plan);
  assert.deepEqual(first, second);
  const text = JSON.stringify(first);
  assert.equal(text.includes("PRIVATE_"), false);
  assert.deepEqual(JSON.parse(text), first);
  assert.equal(first.ready, false);

  const clean = JSON.stringify(evaluate());
  assert.equal(clean.includes("PRIVATE_"), false);
});

// ---------------------------------------------------------------------------
// CLI fixtures: a real temporary SQLite database seeded through the existing fact log.
// ---------------------------------------------------------------------------

function temporaryRoot() {
  return mkdtempSync(path.join(tmpdir(), "syno-p4-preflight-"));
}

function seedOpenDatabase(db, rows) {
  commitLatest(db, FORMAT, (current) => [{
    version: 1,
    seq: current.seq + 1,
    at: 1,
    type: "test.p4_preflight_seed",
    changes: rows.map((row) => ({ table: "records", key: row.key, row })),
  }]);
}

function seedDatabase(file, rows) {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA busy_timeout=5000;");
  try {
    seedOpenDatabase(db, rows);
  } finally {
    db.close();
  }
}

// Active WAL fixture: the writer connection stays open so -wal and -shm exist while the CLI runs.
function walDatabaseFixture(rows = cleanRows()) {
  const root = temporaryRoot();
  const file = path.join(root, "shared.db");
  const writer = new DatabaseSync(file);
  writer.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  seedOpenDatabase(writer, rows);
  return { root, file, writer };
}

function cleanRows() {
  return [
    {
      key: 'inbox:["cli_test","om_done"]',
      kind: "inbox",
      id: "om_done",
      app_id: "cli_test",
      receipt: { contextId: "capture:a", version: 1 },
    },
    {
      key: "task:done",
      kind: "task",
      id: "done",
      context_id: "capture:a",
      context_version: 1,
      current_attempt: "attempt-done",
      run_id: 1,
      state: "completed",
      acceptance: { hash: "a".repeat(64) },
    },
    {
      key: "decision-record:decision-00000000000000aa",
      kind: "decision",
      id: "decision-00000000000000aa",
      decisionId: "decision-00000000000000aa",
      decisionKind: "memory.confirm",
      originContext: "memory:memory-00000000000000bb",
      originMessageId: "om_decision",
      status: "consumed",
      binding: { expectedMemoryVersion: 2 },
    },
    { key: "delivery:done:result", kind: "delivery", task_id: "done", state: "accepted", may_send: false },
    {
      key: "publishing:note",
      kind: "publishing",
      id: "note",
      objectId: "capture:a",
      enabled: true,
      state: "succeeded",
      version: 1,
    },
    {
      key: "idea-index:idea-00000000000000aa",
      kind: "idea_index",
      id: "idea-00000000000000aa",
      ideaId: "idea-00000000000000aa",
      contextId: "idea:idea-00000000000000aa",
      latestVersion: 2,
      versions: [{ version: 1 }, { version: 2 }],
    },
    {
      key: "project-index:project-00000000000000bb",
      kind: "project_index",
      id: "project-00000000000000bb",
      projectId: "project-00000000000000bb",
      contextId: "project:project-00000000000000bb",
      latestVersion: 3,
      versions: [{ planVersion: 3 }],
    },
    {
      key: "memory-index:memory-00000000000000cc",
      kind: "memory_index",
      id: "memory-00000000000000cc",
      memoryId: "memory-00000000000000cc",
      contextId: "memory:memory-00000000000000cc",
      scope: "owner",
      currentVersion: 2,
      versions: [{ preference: "PRIVATE_MEMORY" }, { preference: "PRIVATE_MEMORY" }],
    },
  ];
}

function databaseFixture(rows = cleanRows()) {
  const root = temporaryRoot();
  const file = path.join(root, "shared.db");
  seedDatabase(file, rows);
  return { root, file };
}

const sha256File = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

function snapshotHashes(root) {
  return Object.fromEntries(readdirSync(root).sort().map((name) => [name, sha256File(path.join(root, name))]));
}

function factsCount(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return Number(db.prepare("SELECT COUNT(*) AS count FROM facts").get().count);
  } finally {
    db.close();
  }
}

function runCli(args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
}

function assertDirectoryOnly(root, expected) {
  assert.deepEqual(readdirSync(root).sort(), [...expected].sort());
}

function frozenHandoverRows() {
  const rows = cleanRows();
  rows.push({
    key: "handover:control",
    kind: "handover_control",
    frozen: true,
    generation: 6,
    reason: "p4-test",
    updatedAt: 1,
  });
  for (const [id, text] of [["om_frozen_a", "PRIVATE_SPOOL_BODY_A"], ["om_frozen_b", "PRIVATE_SPOOL_BODY_B"]]) {
    rows.push({
      key: `handover:spool:${JSON.stringify(["cli_test", id])}`,
      kind: "handover_spool",
      id,
      appId: "cli_test",
      messageId: id,
      chatId: "oc_test",
      ownerId: "ou_test",
      worker: "OpenCode",
      text,
      state: "frozen",
      freezeGeneration: 6,
      attempts: 0,
      ownerInstanceId: null,
      claimedAt: null,
      holdReason: null,
      forwardedAt: null,
      forwardReceipt: null,
      createdAt: 1,
      updatedAt: 1,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 5. CLI ready path, determinism, --output exclusivity and read-only proof.
// ---------------------------------------------------------------------------

test("CLI 对干净数据库退出 0，只读且不创建 output 之外的文件", () => {
  const { root, file } = databaseFixture();
  try {
    const beforeHash = sha256File(file);
    const beforeFacts = factsCount(file);
    assertDirectoryOnly(root, ["shared.db"]);

    const first = runCli(["--database", file]);
    assert.equal(first.status, EXIT_READY, first.stderr);
    assert.equal(first.stderr, "");
    const report = JSON.parse(first.stdout);
    assert.equal(report.schema, PREFLIGHT_SCHEMA);
    assert.equal(report.ready, true);
    assert.equal(report.counts.externalEffects, 0);
    assert.equal(report.counts.activeTasks, 0);
    assert.equal(JSON.stringify(report).includes("PRIVATE_MEMORY"), false);

    const second = runCli(["--database", file]);
    assert.equal(second.status, EXIT_READY, second.stderr);
    assert.deepEqual(JSON.parse(second.stdout), report);
    assert.equal(sha256File(file), beforeHash);
    assert.equal(factsCount(file), beforeFacts);
    assertDirectoryOnly(root, ["shared.db"]);

    const output = path.join(root, "preflight-report.json");
    const written = runCli(["--database", file, "--output", output]);
    assert.equal(written.status, EXIT_READY, written.stderr);
    assert.equal(written.stdout, "");
    assert.deepEqual(JSON.parse(readFileSync(output, "utf8")), report);
    assertDirectoryOnly(root, ["shared.db", "preflight-report.json"]);

    const original = readFileSync(output, "utf8");
    const refused = runCli(["--database", file, "--output", output]);
    assert.equal(refused.status, EXIT_ERROR);
    assert.match(refused.stderr, /禁止覆盖/);
    assert.equal(readFileSync(output, "utf8"), original);
    assert.equal(sha256File(file), beforeHash);
    assert.equal(factsCount(file), beforeFacts);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI 对未完成数据库退出 3，报告可机器读取且数据库不变", () => {
  const rows = cleanRows();
  rows.push({
    key: "task:running",
    kind: "task",
    id: "running",
    context_id: "idea:idea-00000000000000aa",
    context_version: 2,
    current_attempt: "attempt-running",
    run_id: 2,
    state: "running",
    acceptance: { hash: "b".repeat(64) },
  });
  const { root, file } = databaseFixture(rows);
  try {
    const beforeHash = sha256File(file);
    const beforeFacts = factsCount(file);
    const result = runCli(["--database", file]);
    assert.equal(result.status, EXIT_NOT_READY, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.ready, false);
    assert.deepEqual(blockerOf(report, "active_task"), { code: "active_task", count: 1 });
    assert.equal(report.counts.domains.idea.activeTasks, 1);
    assert.equal(sha256File(file), beforeHash);
    assert.equal(factsCount(file), beforeFacts);
    assertDirectoryOnly(root, ["shared.db"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 5b. WAL / hot-journal sidecars are rejected before SQLite is opened (R1 P1).
// ---------------------------------------------------------------------------

test("CLI 对活跃 WAL 数据库失败关闭，且 DB／WAL／SHM 哈希和目录清单不变", () => {
  const { root, file, writer } = walDatabaseFixture();
  try {
    assert.equal(existsSync(`${file}-wal`), true, "活跃 writer 必须留下 -wal");
    assert.equal(existsSync(`${file}-shm`), true, "活跃 writer 必须留下 -shm");
    const beforeHashes = snapshotHashes(root);
    const beforeListing = readdirSync(root).sort();

    const result = runCli(["--database", file]);
    assert.equal(result.status, EXIT_ERROR, result.stdout);
    assert.equal(result.stdout, "", "失败时不得输出 ready 报告");
    assert.match(result.stderr, /-wal sidecar|-shm sidecar/);

    assert.deepEqual(readdirSync(root).sort(), beforeListing);
    assert.deepEqual(snapshotHashes(root), beforeHashes, "主 DB／WAL／SHM 任一字节都不得改变");

    const beforeTakeoverHashes = snapshotHashes(root);
    const takeover = runCli(["--database", file, "--takeover-freeze-generation", "6"]);
    assert.equal(takeover.status, EXIT_ERROR, takeover.stdout);
    assert.equal(takeover.stdout, "");
    assert.deepEqual(snapshotHashes(root), beforeTakeoverHashes, "takeover 模式也不得触碰 WAL 数据库");
  } finally {
    writer.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI 拒绝无 sidecar 的 WAL 模式数据库，防止只读打开自行创建 -wal／-shm", () => {
  const root = temporaryRoot();
  const file = path.join(root, "shared.db");
  const writer = new DatabaseSync(file);
  writer.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  seedOpenDatabase(writer, cleanRows());
  writer.close();
  try {
    assert.equal(existsSync(`${file}-wal`), false, "干净关闭后应无 -wal");
    assert.equal(existsSync(`${file}-shm`), false, "干净关闭后应无 -shm");
    const beforeHash = sha256File(file);
    const beforeListing = readdirSync(root).sort();

    const result = runCli(["--database", file]);
    assert.equal(result.status, EXIT_ERROR, result.stdout);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /WAL 模式/);
    assert.deepEqual(readdirSync(root).sort(), beforeListing, "不得创建 -wal／-shm");
    assert.equal(existsSync(`${file}-wal`), false);
    assert.equal(existsSync(`${file}-shm`), false);
    assert.equal(sha256File(file), beforeHash);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI 对 -journal sidecar 失败关闭（前置守卫，不是真实崩溃恢复）", () => {
  const { root, file } = databaseFixture();
  try {
    writeFileSync(`${file}-journal`, "SIMULATED HOT JOURNAL");
    const beforeHashes = snapshotHashes(root);
    const result = runCli(["--database", file]);
    assert.equal(result.status, EXIT_ERROR, result.stdout);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /-journal sidecar/);
    assert.deepEqual(snapshotHashes(root), beforeHashes);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI entry 拒绝 frozen spool，takeover 仅放行显式 generation 并报告 drain", () => {
  const { root, file } = databaseFixture(frozenHandoverRows());
  try {
    const beforeHash = sha256File(file);
    const beforeFacts = factsCount(file);
    assertDirectoryOnly(root, ["shared.db"]);

    const entry = runCli(["--database", file]);
    assert.equal(entry.status, EXIT_NOT_READY, entry.stderr);
    const entryReport = JSON.parse(entry.stdout);
    assert.equal(entryReport.mode, "entry");
    assert.equal(entryReport.drainRequired, false);
    assert.deepEqual(blockerOf(entryReport, "handover_pending"), { code: "handover_pending", count: 2 });

    const takeover = runCli(["--database", file, "--takeover-freeze-generation", "6"]);
    assert.equal(takeover.status, EXIT_READY, takeover.stderr);
    const report = JSON.parse(takeover.stdout);
    assert.equal(report.mode, "takeover");
    assert.equal(report.ready, true);
    assert.equal(report.expectedFreezeGeneration, 6);
    assert.equal(report.observedFreezeGeneration, 6);
    assert.equal(report.drainRequired, true);
    assert.equal(report.counts.takeoverFrozenSpools, 2);
    assert.equal(report.counts.handoverPending, 2);
    assert.equal(JSON.stringify(report).includes("PRIVATE_SPOOL_BODY"), false);

    const old = runCli(["--database", file, "--takeover-freeze-generation", "5"]);
    assert.equal(old.status, EXIT_NOT_READY, old.stderr);
    const oldReport = JSON.parse(old.stdout);
    assert.equal(oldReport.ready, false);
    assert.equal(oldReport.drainRequired, false);
    assert.ok(blockerOf(oldReport, "handover_generation_mismatch"));

    assert.equal(sha256File(file), beforeHash);
    assert.equal(factsCount(file), beforeFacts);
    assertDirectoryOnly(root, ["shared.db"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 6. CLI argument/read failures use the other stable non-zero exit code and never create a DB.
// ---------------------------------------------------------------------------
test("CLI 拒绝相对路径、缺失 DB、未知参数与非法 output，且不创建数据库", () => {
  const { root, file } = databaseFixture();
  try {
    const cases = [
      { label: "relative database", args: ["--database", "shared.db"], pattern: /绝对路径/ },
      { label: "missing database", args: ["--database", path.join(root, "absent.db")], pattern: /不存在/ },
      { label: "unknown option", args: ["--database", file, "--bogus"], pattern: /未知参数/ },
      { label: "extra positional", args: ["--database", file, "extra"], pattern: /未知参数/ },
      { label: "missing value", args: ["--database"], pattern: /缺少绝对路径/ },
      { label: "duplicate database", args: ["--database", file, "--database", file], pattern: /只能指定一次/ },
      { label: "relative output", args: ["--database", file, "--output", "report.json"], pattern: /绝对路径/ },
      {
        label: "missing output parent",
        args: ["--database", file, "--output", path.join(root, "no-such-dir", "report.json")],
        pattern: /父目录不存在/,
      },
      { label: "database is a directory", args: ["--database", root], pattern: /普通文件/ },
      {
        label: "takeover missing value",
        args: ["--database", file, "--takeover-freeze-generation"],
        pattern: /缺少正整数/,
      },
      {
        label: "takeover zero",
        args: ["--database", file, "--takeover-freeze-generation", "0"],
        pattern: /正整数/,
      },
      {
        label: "takeover negative",
        args: ["--database", file, "--takeover-freeze-generation", "-1"],
        pattern: /正整数/,
      },
      {
        label: "takeover non-integer",
        args: ["--database", file, "--takeover-freeze-generation", "1.5"],
        pattern: /正整数/,
      },
      {
        label: "takeover duplicate",
        args: ["--database", file, "--takeover-freeze-generation", "6", "--takeover-freeze-generation", "6"],
        pattern: /只能指定一次/,
      },
      { label: "no arguments", args: [], pattern: /必须指定 --database/ },
    ];
    for (const item of cases) {
      const result = runCli(item.args);
      assert.equal(result.status, EXIT_ERROR, `${item.label}: ${result.stdout}${result.stderr}`);
      assert.match(result.stderr, item.pattern, item.label);
      assert.equal(result.stdout, "", item.label);
    }

    assert.equal(existsSync(path.join(root, "absent.db")), false);
    assertDirectoryOnly(root, ["shared.db"]);

    const help = runCli(["--help"]);
    assert.equal(help.status, EXIT_READY);
    assert.match(help.stdout, /用法/);
    assert.match(help.stdout, /退出码/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI 输出稳定 schema，且模块不引入 Host、飞书或网络能力", () => {
  const { root, file } = databaseFixture();
  try {
    const result = runCli(["--database", file]);
    assert.equal(result.status, EXIT_READY, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.schema, PREFLIGHT_SCHEMA);
    assert.equal(report.mode, "entry");
    assert.equal(report.expectedFreezeGeneration, null);
    assert.equal(report.drainRequired, false);
    assert.equal(report.scope.databaseGateOnly, true);
    assert.equal(report.scope.excludes.length > 0, true);

    const source = readFileSync(CLI, "utf8");
    for (const forbidden of ["real-feishu-client", "native-butler-runtime", "node:http", "node:https", "fetch("]) {
      assert.equal(source.includes(forbidden), false, `CLI 不得包含 ${forbidden}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
