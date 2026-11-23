// P4.2 read-only evidence collector and independent verifier for a handover window.
// It only reads a static database copy and manifest; it never freezes, drains, claims, sends or writes business data.
import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { openBusinessView } from "../../packages/syno-autoloop/examples/syno-p0/commands.ts";
import { rows } from "../../packages/syno-autoloop/kernel/evolve.ts";
import { PREFLIGHT_SCHEMA, PreflightInputError, assertStaticDatabase } from "./production-handover-preflight.mjs";
import { buildHostStatus } from "./host-operations.mjs";
import { openHostHandover } from "./host-handover.mjs";

export const EXPECTATION_SCHEMA = "syno-p4-handover-expectation-v1";
export const EVIDENCE_SCHEMA = "syno-p4-handover-evidence-v1";
export const VERIFICATION_SCHEMA = "syno-p4-handover-verification-v1";

export const EXIT_OK = 0;
export const EXIT_BLOCKED = 3;
export const EXIT_ERROR = 2;

const ROLES = new Set(["before", "during", "after"]);
const KINDS = new Set(["reply", "domain"]);
const SHA256_RE = /^[0-9a-f]{64}$/u;
const MESSAGE_ID_RE = /^[A-Za-z0-9_.:-]{1,200}$/u;
const TASK_PREFIX = "task-";

function fail(message) {
  throw new PreflightInputError(message);
}

function objectAt(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(`${label} 必须是对象`);
  return value;
}

function arrayAt(value, label) {
  if (!Array.isArray(value)) fail(`${label} 必须是数组`);
  return value;
}

function stringAt(value, label) {
  if (typeof value !== "string" || !value) fail(`${label} 必须是非空字符串`);
  return value;
}

function nullableStringAt(value, label) {
  if (value === null) return null;
  if (typeof value !== "string") fail(`${label} 必须是字符串或 null`);
  return value;
}

function integerAt(value, label, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) fail(`${label} 必须是 >= ${minimum} 的整数`);
  return value;
}

function nullableIntegerAt(value, label) {
  if (value === null) return null;
  return integerAt(value, label, 0);
}

function booleanAt(value, label) {
  if (typeof value !== "boolean") fail(`${label} 必须是布尔值`);
  return value;
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256File(file) {
  return sha256Bytes(readFileSync(file));
}

function sortByKey(property) {
  return (left, right) => String(left[property]).localeCompare(String(right[property]));
}

// ---------------------------------------------------------------------------
// Expectation manifest
// ---------------------------------------------------------------------------

export function validateExpectation(value) {
  objectAt(value, "expectation");
  if (value.schema !== EXPECTATION_SCHEMA) fail(`expectation.schema 必须是 ${EXPECTATION_SCHEMA}`);
  const freezeGeneration = integerAt(value.freezeGeneration, "expectation.freezeGeneration", 1);
  const rawMessages = arrayAt(value.messages, "expectation.messages");
  if (!rawMessages.length) fail("expectation.messages 不能为空");

  const seen = new Set();
  const messages = rawMessages.map((raw, index) => {
    objectAt(raw, `expectation.messages[${index}]`);
    const messageId = stringAt(raw.messageId, `expectation.messages[${index}].messageId`);
    if (!MESSAGE_ID_RE.test(messageId)) fail(`expectation.messages[${index}].messageId 含非法字符`);
    if (seen.has(messageId)) fail(`expectation 中出现重复 messageId：${messageId}`);
    seen.add(messageId);
    const role = stringAt(raw.role, `expectation.messages[${index}].role`);
    if (!ROLES.has(role)) fail(`expectation.messages[${index}].role 未知：${role}`);
    const kind = stringAt(raw.kind, `expectation.messages[${index}].kind`);
    if (!KINDS.has(kind)) fail(`expectation.messages[${index}].kind 未知：${kind}`);
    if (role === "during" && kind !== "domain") {
      fail(`expectation.messages[${index}]：during 必须是 domain`);
    }
    if (kind === "reply") {
      if (Object.hasOwn(raw, "contextId") || Object.hasOwn(raw, "contextVersion")) {
        fail(`expectation.messages[${index}]：reply 项不得包含 contextId／contextVersion`);
      }
      return { messageId, role, kind };
    }
    return {
      messageId,
      role,
      kind,
      contextId: stringAt(raw.contextId, `expectation.messages[${index}].contextId`),
      contextVersion: integerAt(raw.contextVersion, `expectation.messages[${index}].contextVersion`, 1),
    };
  }).sort(sortByKey("messageId"));

  const rawArtifacts = arrayAt(value.artifacts, "expectation.artifacts");
  const paths = new Set();
  const artifacts = rawArtifacts.map((raw, index) => {
    objectAt(raw, `expectation.artifacts[${index}]`);
    const file = stringAt(raw.path, `expectation.artifacts[${index}].path`);
    if (!path.isAbsolute(file)) fail(`expectation.artifacts[${index}].path 必须是绝对路径`);
    if (paths.has(file)) fail(`expectation 中出现重复 artifact path：${file}`);
    paths.add(file);
    const expectedSha256 = stringAt(raw.expectedSha256, `expectation.artifacts[${index}].expectedSha256`);
    if (!SHA256_RE.test(expectedSha256)) fail(`expectation.artifacts[${index}].expectedSha256 必须是 64 位 lowercase hex`);
    return { path: file, expectedSha256 };
  }).sort(sortByKey("path"));

  return { schema: EXPECTATION_SCHEMA, freezeGeneration, messages, artifacts };
}

// ---------------------------------------------------------------------------
// Collector
// ---------------------------------------------------------------------------

function isMessageKey(key, messageId) {
  return typeof key === "string" && (key === messageId || new RegExp(`^${messageId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}:\\d+$`, "u").test(key));
}

function routedCount(value) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function collectEvent(row) {
  return {
    key: row.key,
    type: typeof row.type === "string" ? row.type : "",
    subject: typeof row.subject === "string" ? row.subject : "",
    routedCount: routedCount(row.routed),
    receivedAt: typeof row.received_at === "string" ? row.received_at : "",
  };
}

function collectInbox(row) {
  const contextId = typeof row.receipt?.contextId === "string" ? row.receipt.contextId : null;
  return {
    key: row.key,
    appId: typeof row.app_id === "string" ? row.app_id : null,
    messageId: row.id,
    processed: contextId !== null,
    contextId,
    version: Number.isSafeInteger(row.receipt?.version) ? row.receipt.version : null,
  };
}

function collectTask(row) {
  return {
    id: row.id,
    sourceMessageId: typeof row.id === "string" && row.id.startsWith(TASK_PREFIX) ? row.id.slice(TASK_PREFIX.length) : null,
    contextId: typeof row.context_id === "string" ? row.context_id : "",
    contextVersion: Number.isSafeInteger(row.context_version) ? row.context_version : null,
    state: typeof row.state === "string" ? row.state : "",
    attemptId: typeof row.current_attempt === "string" ? row.current_attempt : null,
    runId: Number.isSafeInteger(row.run_id) ? row.run_id : null,
    runAttempt: Number.isSafeInteger(row.run_attempt) ? row.run_attempt : null,
  };
}

function collectAttempt(row) {
  return {
    id: row.id,
    taskId: typeof row.task_id === "string" ? row.task_id : "",
    runId: Number.isSafeInteger(row.run_id) ? row.run_id : null,
    runAttempt: Number.isSafeInteger(row.run_attempt) ? row.run_attempt : null,
    state: typeof row.state === "string" ? row.state : "",
  };
}

function collectRun(row) {
  return {
    id: row.id,
    state: typeof row.state === "string" ? row.state : "",
    rule: typeof row.rule === "string" ? row.rule : "",
    lane: typeof row.lane === "string" ? row.lane : "",
  };
}

function collectDelivery(row) {
  return {
    key: row.key,
    taskId: typeof row.task_id === "string" ? row.task_id : null,
    state: typeof row.state === "string" ? row.state : "",
    maySend: row.may_send === true,
    retryCount: Number.isSafeInteger(row.retry_count) ? row.retry_count : 0,
    hasProviderMessageId: row.provider_message_id !== null && row.provider_message_id !== undefined,
  };
}

function collectSpool(row) {
  const state = typeof row.state === "string" ? row.state : "";
  return {
    id: row.key,
    messageId: row.messageId,
    state,
    freezeGeneration: Number.isSafeInteger(row.freezeGeneration) ? row.freezeGeneration : null,
    attempts: Number.isSafeInteger(row.attempts) ? row.attempts : 0,
    ownerInstanceId: typeof row.ownerInstanceId === "string" ? row.ownerInstanceId : null,
    claimedAt: Number.isSafeInteger(row.claimedAt) ? row.claimedAt : null,
    forwardedAt: Number.isSafeInteger(row.forwardedAt) ? row.forwardedAt : null,
    needsReconciliation: state === "dispatching" || state === "hold",
    autoReplay: false,
  };
}

function collectReply(row) {
  const state = typeof row.state === "string" ? row.state : "";
  return {
    id: row.key,
    messageId: row.messageId,
    state,
    ownerInstanceId: typeof row.ownerInstanceId === "string" ? row.ownerInstanceId : null,
    createdAt: Number.isSafeInteger(row.createdAt) ? row.createdAt : null,
    acceptedAt: Number.isSafeInteger(row.acceptedAt) ? row.acceptedAt : null,
    hasProviderMessageId: row.providerMessageId !== null && row.providerMessageId !== undefined,
    needsReconciliation: state === "sending" || state === "hold",
    autoReplay: false,
  };
}

function collectContext(view, message) {
  if (message.kind !== "domain") return null;
  const row = view.get("records", `context:${message.contextId}`);
  if (!row) return null;
  return {
    contextId: typeof row.id === "string" ? row.id : "",
    version: Number.isSafeInteger(row.version) ? row.version : null,
  };
}

function collectMessage({ view, records, events, message }) {
  const { messageId } = message;
  const inboxes = records.filter((row) => row.kind === "inbox" && row.id === messageId)
    .map(collectInbox).sort(sortByKey("key"));
  const tasks = records.filter((row) => row.kind === "task" && row.id === `${TASK_PREFIX}${messageId}`)
    .map(collectTask).sort(sortByKey("id"));
  const taskIds = new Set(tasks.map((task) => task.id));
  const attempts = records.filter((row) => row.kind === "attempt" && taskIds.has(row.task_id))
    .map(collectAttempt).sort(sortByKey("id"));
  const runIds = [...new Set(tasks.map((task) => task.runId).filter((id) => Number.isSafeInteger(id)))].sort((a, b) => a - b);
  const runs = runIds.map((id) => view.get("runs", id)).filter(Boolean).map(collectRun).sort((a, b) => a.id - b.id);
  const deliveries = records.filter((row) => row.kind === "delivery" && taskIds.has(row.task_id))
    .map(collectDelivery).sort(sortByKey("key"));
  const spools = records.filter((row) => row.kind === "handover_spool" && row.messageId === messageId)
    .map(collectSpool).sort(sortByKey("id"));
  const replies = records.filter((row) => row.kind === "handover_reply" && row.messageId === messageId)
    .map(collectReply).sort(sortByKey("id"));

  return {
    messageId,
    role: message.role,
    kind: message.kind,
    ...(message.kind === "domain"
      ? { contextId: message.contextId, contextVersion: message.contextVersion }
      : {}),
    context: collectContext(view, message),
    events: events.filter((event) => isMessageKey(event.key, messageId)).map(collectEvent)
      .sort((a, b) => String(a.key).localeCompare(String(b.key)) || String(a.receivedAt).localeCompare(String(b.receivedAt))),
    inboxes,
    tasks,
    attempts,
    runs,
    deliveries,
    spools,
    replies,
  };
}

function collectGlobal(hostStatus) {
  const domains = hostStatus.domains ?? {};
  const queuedEvents = Object.values(domains).reduce((sum, domain) => sum + (domain.queued?.length ?? 0), 0);
  return {
    activeTasks: hostStatus.activeTasks?.length ?? 0,
    otherActiveTasks: hostStatus.otherActiveTasks?.length ?? 0,
    queuedEvents,
    pendingDecisions: hostStatus.decisions?.pending?.length ?? 0,
    queuedDeliveries: hostStatus.deliveries?.queued?.length ?? 0,
    unknownDeliveries: hostStatus.deliveries?.unknown?.length ?? 0,
    handoverPending: hostStatus.handover?.pending?.length ?? 0,
    handoverHolds: hostStatus.handover?.holds?.length ?? 0,
    reconciliationBlocking: hostStatus.reconciliation?.blocking === true,
  };
}

function collectArtifact(artifact) {
  let exists = false;
  let regularFile = false;
  let actualSha256 = null;
  try {
    const stats = statSync(artifact.path);
    exists = true;
    regularFile = stats.isFile();
    if (regularFile) actualSha256 = sha256File(artifact.path);
  } catch {
    // Missing paths stay explicit in the evidence instead of being inferred as absent work.
  }
  return {
    path: artifact.path,
    expectedSha256: artifact.expectedSha256,
    actualSha256,
    exists,
    regularFile,
  };
}

/**
 * Read a static DB copy and produce a deterministic, sanitized evidence document.
 * The caller must supply a manifest; nothing about messages, generations or hashes is guessed.
 */
export function collectHandoverEvidence({ databasePath, expectation }) {
  const expected = validateExpectation(expectation);
  assertStaticDatabase(databasePath);
  const databaseSha256 = sha256File(databasePath);
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const view = openBusinessView(db);
    const hostStatus = buildHostStatus({ db, handover: openHostHandover({ db }) });
    const records = rows(view, "records");
    const events = rows(view, "events");
    return {
      schema: EVIDENCE_SCHEMA,
      freezeGeneration: expected.freezeGeneration,
      databaseSha256,
      global: collectGlobal(hostStatus),
      messages: expected.messages.map((message) => collectMessage({ view, records, events, message })),
      artifacts: expected.artifacts.map(collectArtifact).sort(sortByKey("path")),
    };
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// Evidence / takeover structural validation
// ---------------------------------------------------------------------------

function eventShape(value, label) {
  objectAt(value, label);
  stringAt(value.key, `${label}.key`);
  stringAt(value.type, `${label}.type`);
  if (typeof value.subject !== "string") fail(`${label}.subject 必须是字符串`);
  integerAt(value.routedCount, `${label}.routedCount`);
  stringAt(value.receivedAt, `${label}.receivedAt`);
}

function inboxShape(value, label) {
  objectAt(value, label);
  stringAt(value.key, `${label}.key`);
  nullableStringAt(value.appId, `${label}.appId`);
  stringAt(value.messageId, `${label}.messageId`);
  booleanAt(value.processed, `${label}.processed`);
  nullableStringAt(value.contextId, `${label}.contextId`);
  nullableIntegerAt(value.version, `${label}.version`);
}

function taskShape(value, label) {
  objectAt(value, label);
  stringAt(value.id, `${label}.id`);
  nullableStringAt(value.sourceMessageId, `${label}.sourceMessageId`);
  stringAt(value.contextId, `${label}.contextId`);
  nullableIntegerAt(value.contextVersion, `${label}.contextVersion`);
  stringAt(value.state, `${label}.state`);
  nullableStringAt(value.attemptId, `${label}.attemptId`);
  nullableIntegerAt(value.runId, `${label}.runId`);
  nullableIntegerAt(value.runAttempt, `${label}.runAttempt`);
}

function attemptShape(value, label) {
  objectAt(value, label);
  stringAt(value.id, `${label}.id`);
  stringAt(value.taskId, `${label}.taskId`);
  nullableIntegerAt(value.runId, `${label}.runId`);
  nullableIntegerAt(value.runAttempt, `${label}.runAttempt`);
  stringAt(value.state, `${label}.state`);
}

function runShape(value, label) {
  objectAt(value, label);
  integerAt(value.id, `${label}.id`);
  stringAt(value.state, `${label}.state`);
  stringAt(value.rule, `${label}.rule`);
  stringAt(value.lane, `${label}.lane`);
}

function deliveryShape(value, label) {
  objectAt(value, label);
  stringAt(value.key, `${label}.key`);
  nullableStringAt(value.taskId, `${label}.taskId`);
  stringAt(value.state, `${label}.state`);
  booleanAt(value.maySend, `${label}.maySend`);
  integerAt(value.retryCount, `${label}.retryCount`);
  booleanAt(value.hasProviderMessageId, `${label}.hasProviderMessageId`);
}

function spoolShape(value, label) {
  objectAt(value, label);
  stringAt(value.id, `${label}.id`);
  stringAt(value.messageId, `${label}.messageId`);
  stringAt(value.state, `${label}.state`);
  nullableIntegerAt(value.freezeGeneration, `${label}.freezeGeneration`);
  integerAt(value.attempts, `${label}.attempts`);
  nullableStringAt(value.ownerInstanceId, `${label}.ownerInstanceId`);
  nullableIntegerAt(value.claimedAt, `${label}.claimedAt`);
  nullableIntegerAt(value.forwardedAt, `${label}.forwardedAt`);
  booleanAt(value.needsReconciliation, `${label}.needsReconciliation`);
  booleanAt(value.autoReplay, `${label}.autoReplay`);
}

function replyShape(value, label) {
  objectAt(value, label);
  stringAt(value.id, `${label}.id`);
  stringAt(value.messageId, `${label}.messageId`);
  stringAt(value.state, `${label}.state`);
  nullableStringAt(value.ownerInstanceId, `${label}.ownerInstanceId`);
  nullableIntegerAt(value.createdAt, `${label}.createdAt`);
  nullableIntegerAt(value.acceptedAt, `${label}.acceptedAt`);
  booleanAt(value.hasProviderMessageId, `${label}.hasProviderMessageId`);
  booleanAt(value.needsReconciliation, `${label}.needsReconciliation`);
  booleanAt(value.autoReplay, `${label}.autoReplay`);
}

export function validateEvidence(value, expectation) {
  objectAt(value, "evidence");
  if (value.schema !== EVIDENCE_SCHEMA) fail(`evidence.schema 必须是 ${EVIDENCE_SCHEMA}`);
  const freezeGeneration = integerAt(value.freezeGeneration, "evidence.freezeGeneration", 1);
  if (typeof value.databaseSha256 !== "string" || !SHA256_RE.test(value.databaseSha256)) {
    fail("evidence.databaseSha256 必须是 64 位 lowercase hex");
  }

  objectAt(value.global, "evidence.global");
  for (const field of [
    "activeTasks", "otherActiveTasks", "queuedEvents", "pendingDecisions",
    "queuedDeliveries", "unknownDeliveries", "handoverPending", "handoverHolds",
  ]) {
    integerAt(value.global[field], `evidence.global.${field}`);
  }
  booleanAt(value.global.reconciliationBlocking, "evidence.global.reconciliationBlocking");

  const expectedById = new Map(expectation.messages.map((message) => [message.messageId, message]));
  const rawMessages = arrayAt(value.messages, "evidence.messages");
  if (rawMessages.length !== expectation.messages.length) fail("evidence.messages 数量与 expectation 不一致");
  const seen = new Set();
  const messages = rawMessages.map((raw, index) => {
    objectAt(raw, `evidence.messages[${index}]`);
    const messageId = stringAt(raw.messageId, `evidence.messages[${index}].messageId`);
    if (seen.has(messageId)) fail(`evidence 中出现重复 messageId：${messageId}`);
    seen.add(messageId);
    const expected = expectedById.get(messageId);
    if (!expected) fail(`evidence 含 expectation 之外的消息：${messageId}`);
    if (raw.role !== expected.role) fail(`evidence ${messageId}.role 与 expectation 不一致`);
    if (raw.kind !== expected.kind) fail(`evidence ${messageId}.kind 与 expectation 不一致`);
    if (expected.kind === "domain") {
      if (raw.contextId !== expected.contextId || raw.contextVersion !== expected.contextVersion) {
        fail(`evidence ${messageId} 的 context 与 expectation 不一致`);
      }
    } else if (Object.hasOwn(raw, "contextId") || Object.hasOwn(raw, "contextVersion")) {
      fail(`evidence ${messageId}：reply 项不得包含 context`);
    }
    if (raw.context !== null) {
      objectAt(raw.context, `evidence.messages[${index}].context`);
      stringAt(raw.context.contextId, `evidence.messages[${index}].context.contextId`);
      nullableIntegerAt(raw.context.version, `evidence.messages[${index}].context.version`);
    }
    const lists = {
      events: eventShape,
      inboxes: inboxShape,
      tasks: taskShape,
      attempts: attemptShape,
      runs: runShape,
      deliveries: deliveryShape,
      spools: spoolShape,
      replies: replyShape,
    };
    for (const [field, shape] of Object.entries(lists)) {
      arrayAt(raw[field], `evidence.messages[${index}].${field}`)
        .forEach((item, itemIndex) => shape(item, `evidence.messages[${index}].${field}[${itemIndex}]`));
    }
    return raw;
  });
  if (seen.size !== expectedById.size) fail("evidence.messages 未覆盖 expectation 的全部消息");

  const rawArtifacts = arrayAt(value.artifacts, "evidence.artifacts");
  if (rawArtifacts.length !== expectation.artifacts.length) fail("evidence.artifacts 数量与 expectation 不一致");
  const expectedPaths = new Map(expectation.artifacts.map((artifact) => [artifact.path, artifact.expectedSha256]));
  const artifacts = rawArtifacts.map((raw, index) => {
    objectAt(raw, `evidence.artifacts[${index}]`);
    const file = stringAt(raw.path, `evidence.artifacts[${index}].path`);
    if (!expectedPaths.has(file)) fail(`evidence 含 expectation 之外 artifact：${file}`);
    if (raw.expectedSha256 !== expectedPaths.get(file)) fail(`evidence artifact expectedSha256 与 expectation 不一致：${file}`);
    if (raw.actualSha256 !== null && (typeof raw.actualSha256 !== "string" || !SHA256_RE.test(raw.actualSha256))) {
      fail(`evidence artifact actualSha256 非法：${file}`);
    }
    booleanAt(raw.exists, `evidence.artifacts[${index}].exists`);
    booleanAt(raw.regularFile, `evidence.artifacts[${index}].regularFile`);
    return raw;
  });
  if (new Set(artifacts.map((artifact) => artifact.path)).size !== expectedPaths.size) fail("evidence artifact path 重复");

  return { freezeGeneration, messages, artifacts };
}

export function validateTakeoverReport(value) {
  objectAt(value, "takeoverReport");
  if (value.schema !== PREFLIGHT_SCHEMA) fail(`takeoverReport.schema 必须是 ${PREFLIGHT_SCHEMA}`);
  if (value.mode !== "entry" && value.mode !== "takeover") fail("takeoverReport.mode 必须是 entry 或 takeover");
  if (value.expectedFreezeGeneration !== null) integerAt(value.expectedFreezeGeneration, "takeoverReport.expectedFreezeGeneration", 1);
  if (value.observedFreezeGeneration !== null) integerAt(value.observedFreezeGeneration, "takeoverReport.observedFreezeGeneration", 0);
  booleanAt(value.ready, "takeoverReport.ready");
  booleanAt(value.drainRequired, "takeoverReport.drainRequired");
  objectAt(value.counts, "takeoverReport.counts");
  integerAt(value.counts.takeoverFrozenSpools, "takeoverReport.counts.takeoverFrozenSpools");
  arrayAt(value.blockers, "takeoverReport.blockers");
  return value;
}

// ---------------------------------------------------------------------------
// Independent verifier
// ---------------------------------------------------------------------------

function addBlocker(map, code, count = 1) {
  if (count > 0) map.set(code, (map.get(code) ?? 0) + count);
}

function single(map, items, missingCode, duplicateCode) {
  if (items.length === 0) {
    addBlocker(map, missingCode);
    return null;
  }
  if (items.length > 1) addBlocker(map, duplicateCode, items.length - 1);
  return items[0];
}

function verifyDomain(map, message, forwardedState) {
  const task = single(map, message.tasks, "task_missing", "task_duplicate");
  if (task) {
    if (task.id !== `${TASK_PREFIX}${message.messageId}`) addBlocker(map, "task_id_mismatch");
    if (task.sourceMessageId !== message.messageId) addBlocker(map, "task_source_mismatch");
    if (task.state !== "completed") addBlocker(map, "task_not_completed");
    if (task.contextId !== message.contextId) addBlocker(map, "task_context_mismatch");
    if (task.contextVersion !== message.contextVersion) addBlocker(map, "task_context_version_mismatch");
    if (message.context === null) {
      addBlocker(map, "context_missing");
    } else {
      if (message.context.contextId !== message.contextId) addBlocker(map, "context_object_mismatch");
      if (message.context.version !== message.contextVersion) addBlocker(map, "context_version_mismatch");
    }

    const attempt = single(map, message.attempts, "attempt_missing", "attempt_duplicate");
    if (attempt) {
      if (attempt.taskId !== task.id) addBlocker(map, "attempt_task_mismatch");
      if (attempt.id !== task.attemptId) addBlocker(map, "attempt_id_mismatch");
      if (attempt.runId !== task.runId || attempt.runAttempt !== task.runAttempt) addBlocker(map, "attempt_run_mismatch");
      if (attempt.state !== "done") addBlocker(map, "attempt_not_done");
    }

    const run = single(map, message.runs, "run_missing", "run_duplicate");
    if (run) {
      if (run.id !== task.runId) addBlocker(map, "run_task_mismatch");
      if (run.state !== "done") addBlocker(map, "run_not_done");
      if (run.lane !== task.contextId) addBlocker(map, "run_lane_mismatch");
    }

    const delivery = single(map, message.deliveries, "delivery_missing", "delivery_duplicate");
    if (delivery) {
      if (delivery.taskId !== task.id) addBlocker(map, "delivery_task_mismatch");
      if (delivery.state !== "accepted") addBlocker(map, "delivery_not_accepted");
      if (delivery.maySend !== false) addBlocker(map, "delivery_may_send");
    }
  }

  if (message.role === "during") {
    const spool = single(map, message.spools, "spool_missing", "spool_duplicate");
    if (spool) {
      if (spool.state !== "forwarded") addBlocker(map, "spool_not_forwarded");
      if (spool.freezeGeneration !== forwardedState.freezeGeneration) addBlocker(map, "spool_generation_mismatch");
      if (spool.attempts !== 1) addBlocker(map, "spool_attempts_invalid");
      if (!spool.ownerInstanceId) addBlocker(map, "spool_owner_instance_missing");
      if (spool.needsReconciliation !== false) addBlocker(map, "spool_needs_reconciliation");
      if (spool.autoReplay !== false) addBlocker(map, "spool_auto_replay");
    }
    if (message.replies.length > 0) addBlocker(map, "reply_unexpected", message.replies.length);
  } else {
    if (message.spools.length > 0) addBlocker(map, "spool_unexpected", message.spools.length);
    if (message.replies.length > 0) addBlocker(map, "reply_unexpected", message.replies.length);
  }
}

function verifyReply(map, message) {
  const reply = single(map, message.replies, "reply_missing", "reply_duplicate");
  if (reply) {
    if (reply.state !== "accepted") addBlocker(map, "reply_not_accepted");
    if (!reply.ownerInstanceId) addBlocker(map, "reply_owner_instance_missing");
    if (reply.needsReconciliation !== false) addBlocker(map, "reply_needs_reconciliation");
    if (reply.autoReplay !== false) addBlocker(map, "reply_auto_replay");
  }
  if (message.tasks.length || message.attempts.length || message.runs.length
    || message.deliveries.length || message.spools.length) {
    addBlocker(map, "reply_has_domain_chain");
  }
}

function verifyMessage(map, message, expectation) {
  const events = message.events;
  if (events.length === 0) addBlocker(map, "event_missing");
  else {
    if (events.length > 1) addBlocker(map, "event_duplicate", events.length - 1);
    if (events.some((event) => event.key !== message.messageId)) addBlocker(map, "event_key_mismatch");
  }

  const inbox = single(map, message.inboxes, "inbox_missing", "inbox_duplicate");
  if (inbox) {
    if (inbox.processed !== true) addBlocker(map, "inbox_not_processed");
    if (inbox.messageId !== message.messageId) addBlocker(map, "inbox_message_mismatch");
    if (message.kind === "domain"
      && (inbox.contextId !== message.contextId || inbox.version !== message.contextVersion)) {
      addBlocker(map, "inbox_context_mismatch");
    }
  }

  if (message.kind === "domain") verifyDomain(map, message, { freezeGeneration: expectation.freezeGeneration });
  else verifyReply(map, message);
}

export function verifyHandoverEvidence({ expectation, evidence, takeoverReport }) {
  const expected = validateExpectation(expectation);
  const actual = validateEvidence(evidence, expected);
  const takeover = validateTakeoverReport(takeoverReport);
  const blockers = new Map();

  if (actual.freezeGeneration !== expected.freezeGeneration) addBlocker(blockers, "evidence_generation_mismatch");

  const global = evidence.global;
  if (global.activeTasks > 0) addBlocker(blockers, "active_task", global.activeTasks);
  if (global.otherActiveTasks > 0) addBlocker(blockers, "other_active_task", global.otherActiveTasks);
  if (global.queuedEvents > 0) addBlocker(blockers, "queued_event", global.queuedEvents);
  if (global.pendingDecisions > 0) addBlocker(blockers, "pending_decision", global.pendingDecisions);
  if (global.queuedDeliveries > 0) addBlocker(blockers, "queued_delivery", global.queuedDeliveries);
  if (global.unknownDeliveries > 0) addBlocker(blockers, "unknown_delivery", global.unknownDeliveries);
  if (global.handoverPending > 0) addBlocker(blockers, "handover_pending", global.handoverPending);
  if (global.handoverHolds > 0) addBlocker(blockers, "handover_hold", global.handoverHolds);
  if (global.reconciliationBlocking) addBlocker(blockers, "reconciliation_blocking");

  for (const message of actual.messages) verifyMessage(blockers, message, expected);

  // Stable IDs must not be borrowed across messages.
  const owners = new Map();
  for (const message of actual.messages) {
    for (const value of [
      ...message.tasks.map((task) => `task:${task.id}`),
      ...message.attempts.map((attempt) => `attempt:${attempt.id}`),
      ...message.deliveries.map((delivery) => `delivery:${delivery.key}`),
      ...message.spools.map((spool) => `spool:${spool.id}`),
      ...message.replies.map((reply) => `reply:${reply.id}`),
    ]) {
      if (!owners.has(value)) owners.set(value, new Set());
      owners.get(value).add(message.messageId);
    }
  }
  for (const usedBy of owners.values()) if (usedBy.size > 1) addBlocker(blockers, "stable_id_reused");

  const beforeOwners = new Set(actual.messages
    .filter((message) => message.role === "before")
    .flatMap((message) => message.replies.map((reply) => reply.ownerInstanceId))
    .filter(Boolean));
  const afterOwners = new Set(actual.messages
    .filter((message) => message.role === "after")
    .flatMap((message) => message.replies.map((reply) => reply.ownerInstanceId))
    .filter(Boolean));
  const duringOwners = new Set(actual.messages
    .filter((message) => message.role === "during")
    .flatMap((message) => message.spools.map((spool) => spool.ownerInstanceId))
    .filter(Boolean));

  if (beforeOwners.size > 1 || afterOwners.size > 1) addBlocker(blockers, "reply_owner_instance_conflict");
  if (duringOwners.size > 1) addBlocker(blockers, "spool_owner_instance_conflict");
  if (beforeOwners.size && afterOwners.size && [...beforeOwners].some((owner) => afterOwners.has(owner))) {
    addBlocker(blockers, "reply_owner_instance_same");
  }
  if (beforeOwners.size && [...beforeOwners].some((owner) => duringOwners.has(owner) || afterOwners.has(owner))) {
    addBlocker(blockers, "before_owner_instance_reused");
  }
  const sameRuntimeOwners = duringOwners.size === afterOwners.size
    && [...duringOwners].every((owner) => afterOwners.has(owner));
  if (duringOwners.size && afterOwners.size && !sameRuntimeOwners) {
    addBlocker(blockers, "runtime_owner_mismatch");
  }

  const during = expected.messages.filter((message) => message.role === "during");
  if (takeover.ready !== true) addBlocker(blockers, "takeover_not_ready");
  if (takeover.mode !== "takeover") addBlocker(blockers, "takeover_mode_invalid");
  if (takeover.expectedFreezeGeneration !== expected.freezeGeneration
    || takeover.observedFreezeGeneration !== expected.freezeGeneration) {
    addBlocker(blockers, "takeover_generation_mismatch");
  }
  const forwardedDuring = actual.messages.filter((message) => (
    message.role === "during"
    && message.spools.length === 1
    && message.spools[0].state === "forwarded"
    && message.spools[0].freezeGeneration === expected.freezeGeneration
  )).length;
  if (takeover.counts.takeoverFrozenSpools !== during.length || forwardedDuring !== during.length) {
    addBlocker(blockers, "takeover_count_mismatch");
  }
  if (takeover.drainRequired !== (takeover.counts.takeoverFrozenSpools > 0)) {
    addBlocker(blockers, "takeover_drain_flag_mismatch");
  }

  for (const artifact of actual.artifacts) {
    if (!artifact.exists) addBlocker(blockers, "artifact_missing");
    else if (!artifact.regularFile) addBlocker(blockers, "artifact_not_regular");
    else if (artifact.actualSha256 !== artifact.expectedSha256) addBlocker(blockers, "artifact_hash_mismatch");
  }

  const sorted = [...blockers.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => ({ code, count }));
  return {
    schema: VERIFICATION_SCHEMA,
    ok: sorted.length === 0,
    blockers: sorted,
    counts: {
      messages: actual.messages.length,
      domainMessages: expected.messages.filter((message) => message.kind === "domain").length,
      replyMessages: expected.messages.filter((message) => message.kind === "reply").length,
      duringMessages: during.length,
      artifacts: actual.artifacts.length,
    },
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE = `用法：
  node production-handover-evidence.mjs collect --database <绝对路径> --expect <绝对路径> --output <绝对路径>
  node production-handover-evidence.mjs verify --expect <绝对路径> --evidence <绝对路径> \\
       --takeover-report <绝对路径> [--output <绝对路径>]

collect 只读静态 DB 副本与 expectation manifest，排他新建完整脱敏 evidence JSON。
verify 从 expectation／evidence／takeover report 独立重算；stdout 或 output 只含 ok 与稳定 blocker codes。

输入前提：--database 必须是无活跃写者、无 -wal/-shm/-journal sidecar 的静态一致副本；
活跃 WAL 或 WAL 模式文件头在打开 SQLite 前失败关闭（退出码 2）。
不访问网络、不写业务 DB、不执行 freeze／drain／claim／send，不启动 Host／Worker／模型。

退出码：
  0  collect 成功，或 verify ok=true。
  3  verify ok=false（仅业务不满足；报告仍输出）。
  2  参数、读取、JSON 或结构错误；不产生 output 文件。

takeover 报告准备：使用 production-handover-preflight.mjs 的 takeover 模式生成；本工具不猜测 generation。
manifest 的 freezeGeneration／messages／artifacts 由主 Agent 按实际发送与产物清单编写。`;

function parseCli(argv) {
  if (argv.length === 1 && argv[0] === "--help") return { help: true };
  const [command, ...rest] = argv;
  if (command !== "collect" && command !== "verify") fail("子命令必须是 collect 或 verify（或单独使用 --help）");
  const allowed = command === "collect"
    ? new Set(["--database", "--expect", "--output"])
    : new Set(["--expect", "--evidence", "--takeover-report", "--output"]);
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (!allowed.has(argument)) fail(`未知参数：${argument}`);
    const field = argument.slice(2);
    if (Object.hasOwn(options, field)) fail(`${argument} 只能指定一次`);
    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`${argument} 缺少绝对路径`);
    if (!path.isAbsolute(value)) fail(`${argument} 必须是绝对路径`);
    options[field] = value;
    index += 1;
  }
  const required = command === "collect"
    ? ["database", "expect", "output"]
    : ["expect", "evidence", "takeover-report"];
  for (const field of required) if (!options[field]) fail(`缺少 --${field}`);
  return { help: false, command, options };
}

function readJson(file, label) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    fail(`${label} 不存在或不可读：${file}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    fail(`${label} 不是合法 JSON：${file}`);
  }
}

function writeExclusive(output, text) {
  const parent = path.dirname(output);
  let parentStats;
  try {
    parentStats = statSync(parent);
  } catch {
    fail(`--output 父目录不存在：${parent}`);
  }
  if (!parentStats.isDirectory()) fail(`--output 父目录不是目录：${parent}`);
  try {
    writeFileSync(output, text, { flag: "wx" });
  } catch (error) {
    if (error?.code === "EEXIST") fail(`--output 已存在，禁止覆盖：${output}`);
    throw error;
  }
}

export function runEvidenceCli(argv, { stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const parsed = parseCli(argv);
    if (parsed.help) {
      stdout.write(`${USAGE}\n`);
      return EXIT_OK;
    }
    if (parsed.command === "collect") {
      const expectation = readJson(parsed.options.expect, "--expect");
      const evidence = collectHandoverEvidence({ databasePath: parsed.options.database, expectation });
      writeExclusive(parsed.options.output, `${JSON.stringify(evidence, null, 2)}\n`);
      stdout.write(`${JSON.stringify({
        databaseSha256: evidence.databaseSha256,
        messages: evidence.messages.length,
        artifacts: evidence.artifacts.length,
        output: parsed.options.output,
      })}\n`);
      return EXIT_OK;
    }

    const result = verifyHandoverEvidence({
      expectation: readJson(parsed.options.expect, "--expect"),
      evidence: readJson(parsed.options.evidence, "--evidence"),
      takeoverReport: readJson(parsed.options["takeover-report"], "--takeover-report"),
    });
    const text = `${JSON.stringify(result, null, 2)}\n`;
    if (parsed.options.output) writeExclusive(parsed.options.output, text);
    else stdout.write(text);
    return result.ok ? EXIT_OK : EXIT_BLOCKED;
  } catch (error) {
    const message = error instanceof PreflightInputError ? error.message : `证据工具失败：${error?.message ?? error}`;
    stderr.write(`${message}\n`);
    return EXIT_ERROR;
  }
}

const invokedDirectly = (() => {
  if (!process.argv[1]) return false;
  try {
    return path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  process.exitCode = runEvidenceCli(process.argv.slice(2));
}
