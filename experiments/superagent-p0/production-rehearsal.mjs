// P4.3-D: full sanitized/synthetic cutover rehearsal over the official A/B/C, P3.4, P4 and P4.2 tools.
// It never connects Feishu, never calls a model, never touches the repository or a real production database.
// Every artifact is created exclusively inside a brand-new output root; failures keep the scene intact.
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import {
  acceptDelivery,
  applyRoute,
  claimDelivery,
  createTask,
  executeNative,
  finalizeTask,
  openBusinessView,
  recordVerification,
  reportWorkerDone,
} from "../../../syno-autoloop-p0/examples/syno-p0/commands.ts";
import { rows } from "../../../syno-autoloop-p0/kernel/evolve.ts";
import { parseRules } from "../../../syno-autoloop-p0/protocol/rules.ts";
import { FeishuChannelAdapter, FeishuStateStore } from "../../packages/syno-core/feishu-channel.mjs";
import { ProcessFileLock } from "../../packages/syno-core/process-lock.mjs";
import { openHostHandover } from "./host-handover.mjs";
import { buildHostStatus, buildMigrationSnapshot } from "./host-operations.mjs";
import { openLegacyProductionHandover } from "./legacy-production-handover.mjs";
import { inventoryTree, planMigration, rollbackDelta } from "./migration-rehearsal.mjs";
import { openNativeButlerRuntime } from "./native-butler-runtime.mjs";
import { collectHandoverEvidence, verifyHandoverEvidence, EXPECTATION_SCHEMA } from "./production-handover-evidence.mjs";
import { evaluateDatabasePreflight } from "./production-handover-preflight.mjs";
import { importLegacySafetyFacts, prepareStaticDatabaseCopy } from "./production-source-migration.mjs";

export const REHEARSAL_SCHEMA = "syno-p43-production-rehearsal-v1";
export const EXIT_OK = 0;
export const EXIT_BLOCKED = 3;
export const EXIT_ERROR = 2;

const EVIDENCE_CLI = fileURLToPath(new URL("./production-handover-evidence.mjs", import.meta.url));
const PREFLIGHT_CLI = fileURLToPath(new URL("./production-handover-preflight.mjs", import.meta.url));
const CANARY = "PRIVATE_";
const SOURCE_URL = "https://example.invalid/p43d-synthetic-source";
const SOURCE_TEXT = "P4.3-D synthetic source material.\nNo network, model or real production path is used.\n";
const CAPTURE_MODEL = "opencode-go/deepseek-v4.1-flash";
const ENV = { secret: "syno-p43d-isolated-rehearsal", publicUrl: "" };
const ADAPTER_SECRET = "synthetic-unused-secret";
const SYNTHETIC_SECRETS = [ENV.secret, ADAPTER_SECRET];
const OWNER_ID_KEY = /^(owner_?id|owner_?open_?id|sender_?id)$/iu;
const REDACTED_OWNER_ID = "<redacted-owner-id>";
const BASE_TIME = Date.parse("2026-11-20T00:00:00.000Z");
const SIDECARS = ["-wal", "-shm", "-journal"];
const ZERO_SAFETY = Object.freeze({
  activeJobs: 0,
  activeWorkflows: 0,
  pendingDecisions: 0,
  unknownEffects: 0,
  enabledExternalEffectsWithoutMapping: 0,
});

export class RehearsalError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = "RehearsalError";
    this.code = code;
  }
}

const ensure = (condition, code, detail) => {
  if (!condition) throw new RehearsalError(code, detail);
};

const sha256Bytes = (bytes) => createHash("sha256").update(bytes).digest("hex");
const shaFile = (file) => sha256Bytes(readFileSync(file));
const digest = (value) => sha256Bytes(Buffer.from(value, "utf8"));

function redact(value) {
  return String(value ?? "")
    .replace(new RegExp(`${CANARY}[A-Za-z0-9_-]*`, "gu"), `${CANARY}<redacted>`)
    .replace(/(appSecret|ownerOpenId|secret)\s*[=:]\s*\S+/giu, "$1=<redacted>");
}

/**
 * Recursively drops Owner IDs from a persisted status document while keeping every other field
 * (stopped state, pending spools, generation, instance) untouched. Values are replaced by a stable
 * placeholder so no unredacted copy has to stay on disk for hashing or comparison.
 */
function scrubOwnerIds(value, ownerId) {
  const scrub = (entry) => {
    if (Array.isArray(entry)) return entry.map(scrub);
    if (entry && typeof entry === "object") {
      return Object.fromEntries(Object.entries(entry).map(([key, item]) => [
        key,
        OWNER_ID_KEY.test(key) || (typeof item === "string" && ownerId && item.includes(ownerId))
          ? REDACTED_OWNER_ID
          : scrub(item),
      ]));
    }
    return entry;
  };
  return scrub(value);
}

function makeClock(now) {
  if (typeof now === "function") return now;
  let tick = 0;
  return () => BASE_TIME + tick++ * 1_000;
}

function writeExclusive(file, text) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text, { encoding: "utf8", flag: "wx" });
}

function writeJsonExclusive(file, value) {
  writeExclusive(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonAtomic(file, value) {
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  renameSync(temporary, file);
}

function copyTreeExclusive(source, target) {
  ensure(!existsSync(target), "REHEARSAL_COPY_TARGET_EXISTS", target);
  cpSync(source, target, { recursive: true, force: false, errorOnExist: true });
}

function sameInventory(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertNoSidecars(databasePath) {
  for (const suffix of SIDECARS) {
    ensure(!existsSync(`${databasePath}${suffix}`), "REHEARSAL_STRAY_SIDECAR", `${databasePath}${suffix}`);
  }
}

function openBusinessDb(file) {
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  openBusinessView(db);
  return db;
}

function ensureEmptyRules(db, clock) {
  if (openBusinessView(db).get("config", "rules")) return;
  const rules = parseRules(JSON.stringify({
    timezone: "Asia/Shanghai",
    sources: {},
    agents: {},
    rules: [],
  }), clock(), "Asia/Shanghai");
  executeNative(db, "rules", [rules], clock(), ENV);
}

/** Bind the capture lane explicitly (`parallel: 1`) so the official P4.2 verifier can prove run.lane. */
function ensureCaptureLaneBinding(databasePath, clock) {
  withDb(databasePath, (db) => {
    const current = openBusinessView(db).get("config", "rules");
    ensure(current?.value?.rules, "REHEARSAL_RULES_MISSING", "Runtime 必须已建立 rules");
    const rule = current.value.rules.find((item) => item.name === "公开文章收录");
    ensure(rule, "REHEARSAL_RULE_MISSING", "缺少公开文章收录规则");
    if (rule.parallel === 1) return;
    const next = structuredClone(current.value);
    next.rules.find((item) => item.name === "公开文章收录").parallel = 1;
    executeNative(db, "rules", [next], clock(), ENV);
  });
}

function withDb(file, operation) {
  const db = new DatabaseSync(file);
  try {
    db.exec("PRAGMA busy_timeout=5000;");
    openBusinessView(db);
    return operation(db);
  } finally {
    db.close();
  }
}

const recordsOf = (db) => rows(openBusinessView(db), "records");
const countFacts = (db) => Number(db.prepare("SELECT COUNT(*) AS count FROM facts").get().count);

function replyOf(db, messageId) {
  return recordsOf(db).filter((row) => row.kind === "handover_reply" && row.messageId === messageId);
}

function spoolsOf(db) {
  return recordsOf(db).filter((row) => row.kind === "handover_spool");
}

function inboxesOf(db, messageId) {
  return recordsOf(db).filter((row) => row.kind === "inbox" && row.id === messageId);
}

function eventsOf(db, messageId) {
  return rows(openBusinessView(db), "events").filter((row) => row.key === messageId);
}

function factKinds(db) {
  const records = recordsOf(db);
  const byKind = (kind) => records.filter((row) => row.kind === kind);
  return {
    inbox: byKind("inbox").length,
    task: byKind("task").length,
    attempt: byKind("attempt").length,
    delivery: byKind("delivery").length,
    spool: byKind("handover_spool").length,
    reply: byKind("handover_reply").length,
  };
}

function captureMarkdown(source, sourceSha256) {
  return [
    "---",
    `source_url: "${SOURCE_URL}"`,
    `source_content_sha256: ${sourceSha256}`,
    "worker: OpenCode",
    `model: ${CAPTURE_MODEL}`,
    "---",
    "# Synthetic capture",
    "",
    source.trim(),
    "",
  ].join("\n");
}

/**
 * The real unified domain chain: ingest -> native claim -> route -> Task -> Attempt -> Result Lane
 * verification -> native finish -> finalize -> delivery claim accepted. Each message owns a distinct
 * context object, matching the P4.2 evidence contract (context/version stays stable per message).
 */
function forwardDrainMessage({ db, item, sourceText, sourceSha256, artifactPath, clock }) {
  const contextId = `capture:${item.messageId}`;
  const taskId = `task-${item.messageId}`;
  mkdirSync(path.dirname(artifactPath), { recursive: true });
  const detail = JSON.stringify({
    sourceUrl: SOURCE_URL,
    sourceSha256,
    sourceMaterial: "p43d-synthetic-content",
    worker: item.worker,
    appId: item.appId,
    chatId: item.chatId,
    ownerId: item.ownerId,
  });
  executeNative(db, "ingest", ["feishu-test", {
    id: item.messageId,
    type: "capture.request",
    subject: contextId,
    summary: "P4.3-D 合成收录",
    detail,
  }], clock(), ENV);
  const job = executeNative(db, "claimNext", ["syno-p1", `claim-${item.messageId}`], clock(), ENV).value;
  ensure(job?.run && job?.token, "REHEARSAL_DRAIN_CLAIM", "真实 claim 未返回原生 run");
  const routed = applyRoute(db, {
    commandId: `route:${item.appId}:${item.messageId}`,
    appId: item.appId,
    messageId: item.messageId,
    contextId,
    expectedVersion: null,
    ownerId: item.ownerId,
    replyTo: item.chatId,
    now: clock(),
  });
  const attemptId = `attempt-${job.run}-${job.attempt}`;
  createTask(db, {
    taskId,
    contextId,
    attemptId,
    runId: job.run,
    runAttempt: job.attempt,
    acceptance: { path: artifactPath, hash: sourceSha256, remoteVersion: "p43d-synthetic-content" },
    now: clock(),
  });
  writeFileSync(artifactPath, captureMarkdown(sourceText, sourceSha256), { encoding: "utf8", flag: "wx" });
  const fileHash = shaFile(artifactPath);
  recordVerification(db, {
    verificationId: `verification-${taskId}`,
    taskId,
    attemptId,
    actualPath: artifactPath,
    actualHash: sourceSha256,
    actualRemoteVersion: "p43d-synthetic-content",
    actualFileHash: fileHash,
    qualityScore: 100,
    now: clock(),
  });
  reportWorkerDone(db, { taskId, attemptId, now: clock() });
  executeNative(db, "finish", [job.run, job.token, { outcome: "done", summary: "Result Lane 已由宿主独立复核" }], clock(), ENV);
  finalizeTask(db, {
    commandId: `finalize-${taskId}`,
    taskId,
    attemptId,
    contextVersion: routed.receipt.version,
    verificationId: `verification-${taskId}`,
    now: clock(),
  });
  const deliveryKey = `delivery:${taskId}:result`;
  const claimed = claimDelivery(db, { deliveryKey, now: clock() });
  ensure(claimed.claimed === true, "REHEARSAL_DRAIN_DELIVERY_CLAIM", "drain delivery 必须被真实 claim");
  acceptDelivery(db, { deliveryKey, providerMessageId: null, capability: "at_least_once", now: clock() });
  const view = openBusinessView(db);
  const task = view.get("records", `task:${taskId}`);
  const delivery = view.get("records", deliveryKey);
  ensure(task?.state === "completed", "REHEARSAL_DRAIN_TASK", "drain Task 必须完成");
  ensure(delivery?.state === "accepted" && delivery.may_send === false, "REHEARSAL_DRAIN_ACCEPTED", "drain delivery 必须 accepted 且不可重发");
  return {
    messageId: item.messageId,
    taskId,
    attemptId,
    runId: job.run,
    contextId,
    contextVersion: task.context_version,
    artifactPath,
    deliveryKey,
  };
}

function runNodeCli(cliFile, args) {
  const result = spawnSync(process.execPath, [cliFile, ...args], {
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function reportFiles(root) {
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSyncSafe(directory)) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && /\.json$/u.test(entry.name)) files.push(absolute);
    }
  };
  walk(root);
  return files;
}

function readdirSyncSafe(directory) {
  try {
    return readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

function assertReportsClean(root, ids) {
  const forbidden = [
    { label: "canary", value: CANARY },
    { label: "synthetic owner id", value: ids.ownerId },
    ...SYNTHETIC_SECRETS.map((value) => ({ label: "synthetic secret", value })),
  ];
  for (const file of reportFiles(root)) {
    const text = readFileSync(file, "utf8");
    for (const { label, value } of forbidden) {
      ensure(!text.includes(value), "REHEARSAL_REPORT_LEAK", `${path.relative(root, file)}: ${label}`);
    }
  }
}

// Every synthetic ID is unique per run and safe for the existing capture runtime regex.
function syntheticIds() {
  const token = randomUUID().replace(/-/gu, "").slice(0, 10);
  return {
    appId: `cli_p43d_${token}`,
    chatId: `oc_p43d_${token}`,
    ownerId: `ou_p43d_${token}`,
    legacySeenId: `om_${token}_legacy_seen`,
    beforeId: `om_${token}_before`,
    duringIds: [`om_${token}_during_a`, `om_${token}_during_b`],
    afterId: `om_${token}_after`,
    oldInstanceId: `host_old_${token}`,
    newLockOwner: `host_new_${token}`,
  };
}

function pendingEntry(messageId, chatId, ownerId, text, createdAt) {
  return {
    messageId,
    chatId,
    chatType: "p2p",
    senderId: ownerId,
    content: text,
    rawContentType: "text",
    resources: [],
    createdAt,
  };
}

// ---------------------------------------------------------------------------
// Official entry
// ---------------------------------------------------------------------------

export async function runProductionRehearsal({ outputRoot, now } = {}) {
  const root = path.resolve(String(outputRoot ?? ""));
  ensure(typeof outputRoot === "string" && outputRoot && path.isAbsolute(outputRoot), "REHEARSAL_OUTPUT_ROOT_REQUIRED", "outputRoot 必须是绝对路径");
  ensure(!existsSync(root), "REHEARSAL_OUTPUT_ROOT_EXISTS", "outputRoot 必须是不存在的新目录");
  const clock = makeClock(now);
  const ids = syntheticIds();
  const layout = {
    stages: path.join(root, "stages"),
    source: path.join(root, "source", "source.txt"),
    vault: path.join(root, "vault"),
    state: path.join(root, "state", "feishu-channel.json"),
    safety: path.join(root, "safety", "legacy-safety.json"),
    mappings: path.join(root, "safety", "mappings.json"),
    ownerStatus: path.join(root, "safety", "owner-status.json"),
    runtime: path.join(root, "runtime"),
    database: path.join(root, "runtime", "unified.db"),
    statusFile: path.join(root, "runtime", "host-status.json"),
    lockFile: path.join(root, "runtime", "syno.lock"),
    copies: path.join(root, "copies"),
    takeoverCopy: path.join(root, "copies", "takeover-static.db"),
    takeoverReport: path.join(root, "copies", "takeover-preflight.json"),
    snapshot: path.join(root, "snapshot"),
    final: path.join(root, "final"),
    finalCopy: path.join(root, "final", "FINAL_STATIC_DB_COPY.db"),
    finalExpectation: path.join(root, "final", "expectation.json"),
    finalEvidence: path.join(root, "final", "evidence.json"),
    finalVerification: path.join(root, "final", "verification.json"),
    rollback: path.join(root, "rollback"),
    failures: path.join(root, "failures"),
    queued: path.join(root, "queued-scenario"),
  };

  mkdirSync(root);
  for (const directory of [
    layout.stages, path.dirname(layout.source), layout.vault, path.dirname(layout.state),
    path.dirname(layout.safety), layout.runtime, layout.copies, layout.snapshot,
    layout.final, layout.rollback, layout.failures, layout.queued,
  ]) {
    mkdirSync(directory, { recursive: true });
  }

  const stages = [];
  const state = {
    ids,
    layout,
    clock,
    stages,
    currentStage: "setup",
  };
  const enterStage = (name) => { state.currentStage = name; };

  function recordStage(name, payload) {
    const file = path.join(layout.stages, `${name}.json`);
    writeJsonExclusive(file, { schema: "syno-p43-production-rehearsal-stage-v1", stage: name, ...payload });
    const record = { name, status: payload.status, hash: shaFile(file), counts: payload.counts ?? {} };
    stages.push(record);
    return record;
  }

  try {
    // -----------------------------------------------------------------------
    // Synthetic inputs.
    // -----------------------------------------------------------------------
    writeExclusive(layout.source, SOURCE_TEXT);
    writeExclusive(path.join(layout.vault, "notes", "overview.md"), "# Synthetic overview\n\nP4.3-D rehearsal note.\n");
    writeExclusive(path.join(layout.vault, "notes", "second.md"), "# Synthetic second note\n\nNo real content.\n");
    writeJsonExclusive(layout.safety, ZERO_SAFETY);
    writeJsonExclusive(layout.mappings, {
      mappings: [
        {
          id: "synthetic-note",
          objectId: "capture:synthetic-note",
          effect: "knowledge.publish.wiki",
          enabled: true,
          state: "succeeded",
          version: 3,
        },
        { id: "disabled-note", objectId: "capture:disabled-note", effect: "knowledge.publish.wiki", enabled: false },
      ],
    });
    writeJsonExclusive(layout.ownerStatus, { configured: true, ownerBound: true, appId: ids.appId });

    // -----------------------------------------------------------------------
    enterStage("01-before");
    // 1. before: the old bridge itself writes event / inbox / accepted reply.
    // -----------------------------------------------------------------------
    const sourceSha256 = shaFile(layout.source);
    const originalSource = readFileSync(layout.source, "utf8");
    let delegateCalls = 0;
    let deliverCalls = 0;
    const beforeMessage = {
      channel: "feishu",
      id: ids.beforeId,
      senderId: ids.ownerId,
      chatId: ids.chatId,
      worker: "OpenCode",
      text: `${CANARY}BEFORE_TEXT`,
    };
    const bridge = openLegacyProductionHandover({
      databasePath: layout.database,
      statusFile: layout.statusFile,
      appId: ids.appId,
      instanceId: ids.oldInstanceId,
      pid: 4242,
      now: clock,
    });
    state.bridge = bridge;

    const beforeResult = await bridge.handleMessage(
      beforeMessage,
      async () => {
        delegateCalls += 1;
        return { text: `${CANARY}BEFORE_REPLY` };
      },
      async () => {
        deliverCalls += 1;
        return { delivered: true, providerMessageId: "pm-synthetic-before" };
      },
    );
    ensure(beforeResult?.deferredDelivery === true, "REHEARSAL_BEFORE_NOT_DEFERRED", "旧桥必须自行完成回复并阻止第二次发送");
    ensure(delegateCalls === 1 && deliverCalls === 1, "REHEARSAL_BEFORE_CALLBACKS", "旧 delegate／deliver 必须各调用一次");
    bridge.refreshStatus();

    const beforeView = withDb(layout.database, (db) => ({
      events: eventsOf(db, ids.beforeId).length,
      inboxes: inboxesOf(db, ids.beforeId).length,
      replies: replyOf(db, ids.beforeId).map((row) => ({
        state: row.state,
        owner: row.ownerInstanceId,
        providerPresent: row.providerMessageId !== null,
      })),
      kinds: factKinds(db),
    }));
    ensure(beforeView.events === 1 && beforeView.inboxes === 1, "REHEARSAL_BEFORE_EVIDENCE", "旧桥必须自行产生一条 event 与 processed inbox");
    ensure(beforeView.replies.length === 1 && beforeView.replies[0].state === "accepted", "REHEARSAL_BEFORE_REPLY", "旧桥必须自行产生 accepted reply");
    ensure(beforeView.replies[0].owner === ids.oldInstanceId, "REHEARSAL_BEFORE_OWNER", "before reply 必须属于旧 instance");
    ensure(beforeView.kinds.task === 0, "REHEARSAL_BEFORE_TASK", "普通回复不得创建 Task");

    recordStage("01-before", {
      status: "ok",
      counts: {
        events: beforeView.events,
        inboxes: beforeView.inboxes,
        replies: beforeView.replies.length,
        tasks: beforeView.kinds.task,
        deliveries: beforeView.kinds.delivery,
      },
      reply: { owner: ids.oldInstanceId, state: "accepted", providerPresent: beforeView.replies[0].providerPresent },
      hashes: { source: sourceSha256, status: shaFile(layout.statusFile) },
    });

    // -----------------------------------------------------------------------
    enterStage("02-freeze");
    // 2. freeze: generation=1, during messages only enter the frozen spool.
    // -----------------------------------------------------------------------
    const frozen = bridge.freeze("p4.3-d-rehearsal");
    ensure(frozen?.control?.generation === 1, "REHEARSAL_GENERATION", "freeze 后 generation 必须为 1");
    let frozenDelegates = 0;
    let frozenDelivers = 0;
    const duringTexts = ids.duringIds.map((id) => `${CANARY}DURING_${id}`);
    for (const [index, messageId] of ids.duringIds.entries()) {
      const result = await bridge.handleMessage(
        { channel: "feishu", id: messageId, senderId: ids.ownerId, chatId: ids.chatId, worker: "OpenCode", text: duringTexts[index] },
        async () => {
          frozenDelegates += 1;
          throw new Error("frozen delegate must not run");
        },
        async () => {
          frozenDelivers += 1;
          throw new Error("frozen deliver must not run");
        },
      );
      ensure(result?.deferredDelivery === true, "REHEARSAL_FREEZE_NOT_DEFERRED", "冻结消息必须只进入 spool");
    }
    ensure(frozenDelegates === 0 && frozenDelivers === 0, "REHEARSAL_FREEZE_CALLBACKS", "冻结后不得调用旧 delegate／deliver");

    // The old adapter state is synthesized: before was already seen, during are both seen and still pending.
    const createdAt = new Date(clock()).toISOString();
    writeJsonExclusive(layout.state, {
      version: 1,
      seenIds: [ids.legacySeenId, ids.beforeId, ...ids.duringIds],
      pending: ids.duringIds.map((messageId, index) => pendingEntry(
        messageId, ids.chatId, ids.ownerId, duringTexts[index], createdAt,
      )),
    });
    const stateShaBeforeImport = shaFile(layout.state);

    const frozenView = withDb(layout.database, (db) => {
      const spools = spoolsOf(db);
      return {
        spools: spools.map((row) => ({ messageId: row.messageId, state: row.state, generation: row.freezeGeneration, attempts: row.attempts })),
        kinds: factKinds(db),
        duringInboxes: ids.duringIds.map((id) => inboxesOf(db, id).length),
        duringEvents: ids.duringIds.map((id) => eventsOf(db, id).length),
      };
    });
    ensure(frozenView.spools.length === 2, "REHEARSAL_FREEZE_SPOOLS", "两条 during 必须进入 spool");
    ensure(frozenView.spools.every((spool) => spool.state === "frozen" && spool.generation === 1 && spool.attempts === 0), "REHEARSAL_FREEZE_STATE", "spool 必须全部 frozen/generation 1/attempts 0");
    ensure(frozenView.kinds.task === 0 && frozenView.kinds.delivery === 0, "REHEARSAL_FREEZE_DOMAIN", "冻结期间不得创建 Task／delivery");
    ensure(frozenView.duringInboxes.every((count) => count === 0) && frozenView.duringEvents.every((count) => count === 0), "REHEARSAL_FREEZE_INBOX", "冻结消息不得产生 event／inbox");

    recordStage("02-freeze", {
      status: "ok",
      counts: {
        frozenSpools: 2,
        generation: 1,
        delegates: frozenDelegates,
        deliveries: frozenDelivers,
        duringEvents: 0,
        duringInboxes: 0,
        tasks: frozenView.kinds.task,
      },
      hashes: { state: stateShaBeforeImport },
    });

    // -----------------------------------------------------------------------
    enterStage("03-retire");
    // 3. Retire the synthetic old consumer; no unfreeze, recover or drain.
    // -----------------------------------------------------------------------
    const stateShaBeforeRetire = shaFile(layout.state);
    bridge.close();
    const stopped = JSON.parse(readFileSync(layout.statusFile, "utf8"));
    ensure(stopped.running === false && stopped.lifecycle === "stopped", "REHEARSAL_RETIRE_STATUS", "旧 owner 状态必须为 stopped");
    ensure(stopped.instanceId === ids.oldInstanceId, "REHEARSAL_RETIRE_INSTANCE", "旧 owner instance 必须一致");
    ensure(shaFile(layout.state) === stateShaBeforeRetire, "REHEARSAL_RETIRE_STATE_CHANGED", "旧 JSON 在退出阶段不得改变");
    // The legacy bridge wrote this stopped status while the frozen spool was still undrained, so it
    // carries the synthetic Owner ID in handover.pending[]. Archive it scrubbed: business evidence
    // (stopped/lifecycle/instance/pending/generation) stays, the Owner ID does not. Every later
    // status hash and the lock no-change check read this archived copy; no unredacted JSON remains.
    const archivedStatus = scrubOwnerIds(stopped, ids.ownerId);
    ensure(archivedStatus.running === false && archivedStatus.lifecycle === "stopped", "REHEARSAL_RETIRE_ARCHIVE_STATUS", "脱敏归档必须保留 stopped 状态");
    ensure(archivedStatus.instanceId === ids.oldInstanceId, "REHEARSAL_RETIRE_ARCHIVE_INSTANCE", "脱敏归档必须保留旧 owner instance");
    ensure(archivedStatus.handover?.pendingCount === 2 && archivedStatus.handover?.generation === 1, "REHEARSAL_RETIRE_ARCHIVE_HANDOVER", "脱敏归档必须保留 pending=2／generation=1");
    writeJsonAtomic(layout.statusFile, archivedStatus);
    const stoppedStatusSha = shaFile(layout.statusFile);
    const retiredView = withDb(layout.database, (db) => ({
      control: openHostHandover({ db, now: clock }).control(),
      spools: spoolsOf(db).map((row) => ({ state: row.state, generation: row.freezeGeneration })),
      kinds: factKinds(db),
    }));
    ensure(retiredView.control.frozen === true && retiredView.control.generation === 1, "REHEARSAL_RETIRE_UNFROZEN", "退出阶段不得 unfreeze");
    ensure(retiredView.spools.every((spool) => spool.state === "frozen"), "REHEARSAL_RETIRE_DRAINED", "退出阶段不得 claim／drain");

    recordStage("03-retire", {
      status: "ok",
      counts: { frozenSpools: retiredView.spools.length, generation: retiredView.control.generation, tasks: retiredView.kinds.task },
      hashes: { state: stateShaBeforeRetire, stoppedStatus: stoppedStatusSha },
    });

    // -----------------------------------------------------------------------
    enterStage("04-import");
    // 4. Import legacy safety facts through the official P4.3-C function.
    // -----------------------------------------------------------------------
    const vaultHashBeforeImport = digest(JSON.stringify(inventoryTree(layout.vault)));
    const importDb = new DatabaseSync(layout.database);
    let importReport;
    try {
      importDb.exec("PRAGMA busy_timeout=5000;");
      openBusinessView(importDb);
      importReport = importLegacySafetyFacts({
        db: importDb,
        databasePath: layout.database,
        stateFile: layout.state,
        appId: ids.appId,
        legacySafety: { ...ZERO_SAFETY },
        mappings: JSON.parse(readFileSync(layout.mappings, "utf8")),
        now: clock,
        vaultRoot: layout.vault,
        ownerStatus: { configured: true, ownerBound: true, appId: ids.appId },
      });
    } finally {
      importDb.close();
    }
    ensure(importReport.ok === true && importReport.blockers.length === 0, "REHEARSAL_IMPORT_BLOCKED", JSON.stringify(importReport.blockers));
    ensure(importReport.actionCounts.dedupe_only === 1, "REHEARSAL_IMPORT_DEDUPE", "历史 seen 必须只导入 1 条 dedupe_only");
    ensure(importReport.actionCounts.mapping_only === 1, "REHEARSAL_IMPORT_MAPPING", "enabled mapping 必须只导入 1 条");
    ensure(importReport.handover.carriedPendingCount === 2 && importReport.handover.blockedPendingCount === 0, "REHEARSAL_IMPORT_PENDING", "pending 必须接续 2 条 spool");
    ensure(importReport.counts.seenExcludedSpool === 2, "REHEARSAL_IMPORT_SPOOL_EXCLUDED", "during seen 必须因 spool 被排除");
    ensure(importReport.counts.seenAlreadyPresent === 1, "REHEARSAL_IMPORT_BEFORE_PRESENT", "before inbox 必须已经存在");
    ensure(importReport.sourceSha256 === stateShaBeforeImport, "REHEARSAL_IMPORT_STATE_HASH", "导入前后旧 JSON 必须不变");
    ensure(digest(JSON.stringify(inventoryTree(layout.vault))) === vaultHashBeforeImport, "REHEARSAL_IMPORT_VAULT_HASH", "导入前后 vault 必须不变");
    const mappingRow = withDb(layout.database, (db) => recordsOf(db)
      .find((row) => row.kind === "publishing_mapping" && row.id === "synthetic-note"));
    ensure(mappingRow?.enabled === true && mappingRow.state === "succeeded" && mappingRow.version === 3, "REHEARSAL_IMPORT_MAPPING_ROW", "mapping 必须是 enabled succeeded versioned");

    writeJsonExclusive(path.join(layout.stages, "04-import.official.json"), importReport);
    recordStage("04-import", {
      status: "ok",
      counts: {
        dedupeOnly: importReport.actionCounts.dedupe_only,
        mappingOnly: importReport.actionCounts.mapping_only,
        seenExcludedSpool: importReport.counts.seenExcludedSpool,
        seenAlreadyPresent: importReport.counts.seenAlreadyPresent,
        carriedPending: importReport.handover.carriedPendingCount,
        blockedPending: importReport.handover.blockedPendingCount,
        externalEffects: 0,
      },
      hashes: {
        state: importReport.sourceSha256,
        vault: vaultHashBeforeImport,
        databaseBefore: importReport.databaseSha256Before,
        official: shaFile(path.join(layout.stages, "04-import.official.json")),
      },
    });

    // -----------------------------------------------------------------------
    enterStage("05-takeover");
    // 5. Takeover static copy + official preflight (function and real CLI).
    // -----------------------------------------------------------------------
    assertNoSidecars(layout.database);
    const takeoverCopy = prepareStaticDatabaseCopy({ source: layout.database, target: layout.takeoverCopy });
    ensure(takeoverCopy.ok === true, "REHEARSAL_TAKEOVER_COPY", JSON.stringify(takeoverCopy.blockers));
    ensure(takeoverCopy.target.walHeader === false, "REHEARSAL_TAKEOVER_WAL", "takeover 副本必须是非 WAL");
    ensure(takeoverCopy.source.sha256Before === takeoverCopy.source.sha256After, "REHEARSAL_TAKEOVER_SOURCE_CHANGED", "复制不得改变源库");

    const preflightFunction = withDb(layout.takeoverCopy, (db) => evaluateDatabasePreflight({
      hostStatus: buildHostStatus({ db, handover: openHostHandover({ db, now: clock }) }),
      migrationPlan: planMigration(buildMigrationSnapshot({ db })),
      expectedFreezeGeneration: 1,
    }));
    ensure(preflightFunction.ready === true, "REHEARSAL_PREFLIGHT_FUNCTION", JSON.stringify(preflightFunction.blockers));
    ensure(preflightFunction.drainRequired === true && preflightFunction.counts.takeoverFrozenSpools === 2, "REHEARSAL_PREFLIGHT_N", "takeover N 必须为 2");
    ensure(preflightFunction.observedFreezeGeneration === 1, "REHEARSAL_PREFLIGHT_GENERATION", "generation 必须为 1");
    ensure(preflightFunction.counts.externalEffects === 0, "REHEARSAL_PREFLIGHT_EXTERNAL_EFFECTS", "externalEffects 必须为 0");

    const preflightCli = runNodeCli(PREFLIGHT_CLI, [
      "--database", layout.takeoverCopy,
      "--takeover-freeze-generation", "1",
      "--output", layout.takeoverReport,
    ]);
    ensure(preflightCli.status === EXIT_OK, "REHEARSAL_PREFLIGHT_CLI", preflightCli.stderr.trim() || `exit ${preflightCli.status}`);
    const takeoverReport = JSON.parse(readFileSync(layout.takeoverReport, "utf8"));
    ensure(takeoverReport.ready === true && takeoverReport.drainRequired === true, "REHEARSAL_PREFLIGHT_CLI_REPORT", "CLI preflight 必须 ready/drainRequired");
    ensure(takeoverReport.counts.takeoverFrozenSpools === 2 && takeoverReport.observedFreezeGeneration === 1, "REHEARSAL_PREFLIGHT_CLI_N", "CLI takeover N/generation 必须为 2/1");

    recordStage("05-takeover", {
      status: "ok",
      counts: {
        takeoverFrozenSpools: takeoverReport.counts.takeoverFrozenSpools,
        generation: takeoverReport.observedFreezeGeneration,
        ready: takeoverReport.ready === true ? 1 : 0,
        drainRequired: takeoverReport.drainRequired === true ? 1 : 0,
        externalEffects: takeoverReport.counts.externalEffects,
      },
      hashes: {
        source: takeoverCopy.source.sha256After,
        takeoverCopy: takeoverCopy.target.sha256,
        preflightCli: shaFile(layout.takeoverReport),
      },
    });

    // -----------------------------------------------------------------------
    enterStage("06-snapshot");
    // 6. Migration snapshot/plan plus an identical vault/safety copy.
    // -----------------------------------------------------------------------
    const snapshotView = withDb(layout.database, (db) => buildMigrationSnapshot({ db }));
    const snapshotPlan = planMigration(snapshotView);
    ensure(snapshotPlan.cutoverBlocked === false, "REHEARSAL_SNAPSHOT_BLOCKED", "迁移计划不得要求人工对账");
    ensure(snapshotPlan.externalEffects === 0, "REHEARSAL_SNAPSHOT_EFFECTS", "迁移计划 externalEffects 必须为 0");
    ensure((snapshotView.tasks ?? []).length === 0, "REHEARSAL_SNAPSHOT_OLD_TASKS", "旧 Task 不得进入迁移执行");
    writeJsonExclusive(path.join(layout.snapshot, "migration-snapshot.json"), snapshotView);
    writeJsonExclusive(path.join(layout.snapshot, "migration-plan.json"), snapshotPlan);
    copyTreeExclusive(layout.vault, path.join(layout.snapshot, "vault"));
    copyTreeExclusive(path.dirname(layout.safety), path.join(layout.snapshot, "safety"));
    const vaultSnapshotSame = sameInventory(inventoryTree(layout.vault), inventoryTree(path.join(layout.snapshot, "vault")));
    const safetySnapshotSame = sameInventory(inventoryTree(path.dirname(layout.safety)), inventoryTree(path.join(layout.snapshot, "safety")));
    ensure(vaultSnapshotSame && safetySnapshotSame, "REHEARSAL_SNAPSHOT_INVENTORY", "快照与源 inventory 必须一致");

    recordStage("06-snapshot", {
      status: "ok",
      counts: {
        planItems: snapshotPlan.items.length,
        vaultFiles: inventoryTree(layout.vault).length,
        safetyFiles: inventoryTree(path.dirname(layout.safety)).length,
        oldTasks: 0,
        externalEffects: 0,
      },
      hashes: {
        snapshot: shaFile(path.join(layout.snapshot, "migration-snapshot.json")),
        plan: shaFile(path.join(layout.snapshot, "migration-plan.json")),
      },
    });

    // -----------------------------------------------------------------------
    enterStage("07-lock");
    // 7. The single new Runtime takes the real synthetic lock.
    // -----------------------------------------------------------------------
    const lockOwner = new ProcessFileLock({
      file: layout.lockFile,
      failFast: true,
      timeoutMs: 0,
      metadata: { instanceId: ids.newLockOwner },
    });
    const lease = await lockOwner.acquire();
    state.lease = lease;
    const statusShaBeforeCompete = shaFile(layout.statusFile);
    const factsBeforeCompete = withDb(layout.database, countFacts);
    let competitorCode = null;
    try {
      await new ProcessFileLock({ file: layout.lockFile, failFast: true, timeoutMs: 0 }).acquire();
    } catch (error) {
      competitorCode = error?.code ?? "UNKNOWN";
    }
    ensure(competitorCode === "PROCESS_LOCK_HELD", "REHEARSAL_LOCK_COMPETITOR", `竞争实例必须失败关闭（${competitorCode}）`);
    ensure(shaFile(layout.statusFile) === statusShaBeforeCompete, "REHEARSAL_LOCK_STATUS_CHANGED", "竞争不得改变 host-status");
    ensure(withDb(layout.database, countFacts) === factsBeforeCompete, "REHEARSAL_LOCK_FACTS_CHANGED", "竞争不得改变 facts");

    recordStage("07-lock", {
      status: "ok",
      counts: { owners: 1, competitors: 0, facts: factsBeforeCompete },
      lock: { competitorCode },
      hashes: { status: statusShaBeforeCompete, facts: digest(String(factsBeforeCompete)) },
    });

    // -----------------------------------------------------------------------
    enterStage("08-drain");
    // 8. recover (no replay) then bounded drain through the real domain chain.
    // -----------------------------------------------------------------------
    const runtime = openNativeButlerRuntime({
      databasePath: layout.database,
      vaultRoot: layout.vault,
      sourcePath: layout.source,
      sourceUrl: SOURCE_URL,
      indexFile: path.join(layout.runtime, "knowledge-index.json"),
      resultRoot: path.join(layout.runtime, "results"),
      now: clock,
    });
    state.runtime = runtime;
    const handover = runtime.handover;
    const newOwner = handover.instanceId;
    ensure(newOwner !== ids.oldInstanceId, "REHEARSAL_NEW_OWNER", "新 owner 不得复用旧 instance");

    // The rehearsal rule set binds the capture lane explicitly (`parallel: 1`), so the existing P4.2
    // verifier can prove run.lane === task.contextId. This is synthetic runtime configuration only.
    ensureCaptureLaneBinding(layout.database, clock);

    const recovered = handover.recoverInterrupted();
    ensure(recovered.spool === 0 && recovered.reply === 0, "REHEARSAL_RECOVER_REPLAYED", "recover 不得重放已中断消息");
    ensure(handover.status().pendingCount === 2, "REHEARSAL_RECOVER_PENDING", "recover 不得自行 drain frozen spool");

    const drainTraces = [];
    const drainBatches = [];
    for (;;) {
      const batch = await handover.drainFrozen({
        limit: 1,
        forward: async (item) => {
          const trace = withDb(layout.database, (db) => forwardDrainMessage({
            db,
            item,
            sourceText: originalSource,
            sourceSha256,
            artifactPath: path.join(layout.vault, "02-Resources", `rehearsal-${item.messageId}.md`),
            clock,
          }));
          drainTraces.push(trace);
          return { accepted: true, receipt: `handover-forward:${item.messageId}` };
        },
      });
      if (batch.length) drainBatches.push(batch.length);
      if (batch.length === 0) break;
    }
    const drainedStatus = handover.status();
    const drainedSpools = withDb(layout.database, (db) => spoolsOf(db).map((row) => ({
      messageId: row.messageId,
      state: row.state,
      generation: row.freezeGeneration,
      attempts: row.attempts,
      owner: row.ownerInstanceId,
    })));
    ensure(drainTraces.length === 2, "REHEARSAL_DRAIN_N", "drain 必须 forward 2 条");
    ensure(drainedStatus.pendingCount === 0, "REHEARSAL_DRAIN_PENDING", "drain 后 pending 必须为 0");
    ensure(drainedSpools.every((spool) => spool.state === "forwarded" && spool.generation === 1 && spool.attempts === 1 && spool.owner === newOwner), "REHEARSAL_DRAIN_SPOOL", "drain 后 spool 必须 forwarded/attempts 1/新 owner");
    ensure(drainedStatus.spool.counts.forwarded === 2, "REHEARSAL_DRAIN_FORWARDED", "forwarded 计数必须为 2");

    recordStage("08-drain", {
      status: "ok",
      counts: {
        recoveredSpools: recovered.spool,
        recoveredReplies: recovered.reply,
        batches: drainBatches.length,
        forwarded: drainedStatus.spool.counts.forwarded,
        attempts: drainedSpools.reduce((sum, spool) => sum + spool.attempts, 0),
        pending: drainedStatus.pendingCount,
      },
      drain: {
        owner: newOwner,
        messages: drainTraces.map((trace) => ({
          messageId: trace.messageId,
          taskId: trace.taskId,
          attemptId: trace.attemptId,
          runId: trace.runId,
          contextId: trace.contextId,
          contextVersion: trace.contextVersion,
        })),
      },
    });

    // -----------------------------------------------------------------------
    enterStage("09-unfreeze");
    // 9. Unfreeze only when clean; the real adapter recovers still-pending JSON.
    // -----------------------------------------------------------------------
    const preUnfreeze = runtime.status();
    const queuedTotal = Object.values(preUnfreeze.domains).reduce((sum, domain) => sum + domain.queued.length, 0);
    ensure(preUnfreeze.handover.holdCount === 0 && preUnfreeze.handover.pendingCount === 0, "REHEARSAL_UNFREEZE_HANDOVER", "存在 hold／pending 时不得 unfreeze");
    ensure(preUnfreeze.deliveries.unknown.length === 0 && preUnfreeze.deliveries.queued.length === 0, "REHEARSAL_UNFREEZE_DELIVERIES", "存在 unknown／queued delivery 时不得 unfreeze");
    ensure(preUnfreeze.decisions.pending.length === 0, "REHEARSAL_UNFREEZE_DECISION", "存在 pending Decision 时不得 unfreeze");
    ensure(queuedTotal === 0, "REHEARSAL_UNFREEZE_QUEUED", "存在 queued event 时不得 unfreeze");
    handover.unfreeze({ reason: "p4.3-d-rehearsal-complete" });
    ensure(handover.control().frozen === false, "REHEARSAL_UNFREEZE_CONTROL", "unfreeze 后 control 必须解冻");

    // A crash-after-reserve view: pending still holds during, but seen no longer does.
    const stateShaBeforeAdapter = shaFile(layout.state);
    writeJsonAtomic(layout.state, {
      version: 1,
      seenIds: [ids.legacySeenId, ids.beforeId],
      pending: ids.duringIds.map((messageId, index) => pendingEntry(
        messageId, ids.chatId, ids.ownerId, duringTexts[index], createdAt,
      )),
    });
    const factsBeforeAdapter = withDb(layout.database, countFacts);
    const sends = [];
    let adapterDispatches = 0;
    const adapter = new FeishuChannelAdapter({
      credentials: {
        async load() { return { appId: ids.appId, appSecret: ADAPTER_SECRET, ownerOpenId: ids.ownerId }; },
        async updateOwner() {},
        async save() {},
      },
      stateStore: new FeishuStateStore({ file: layout.state, clock: () => new Date(clock()) }),
      processLock: { async acquire() { return { async release() {} }; } },
      channelFactory: () => ({
        on() { return this; },
        async connect() {},
        async disconnect() {},
        async send(chatId, payload, options) { sends.push({ chatId, options }); return { messageId: "synthetic-out" }; },
        async recallMessage() {},
      }),
      typingIndicator: false,
      retryDelayMs: 60_000,
      onMessage: async (message) => {
        ensure(handover.control().frozen === false, "REHEARSAL_ADAPTER_EARLY", "adapter 恢复必须发生在 unfreeze 之后");
        const intake = handover.intake({
          appId: ids.appId,
          messageId: message.id,
          chatId: message.chatId,
          ownerId: message.senderId,
          worker: "OpenCode",
          text: message.text,
        });
        ensure(intake.status === "spooled", "REHEARSAL_ADAPTER_DISPATCH", "已知 forwarded spool 不得再次 immediate");
        return { deferredDelivery: true };
      },
    });
    const started = await adapter.start();
    ensure(started.running === true, "REHEARSAL_ADAPTER_START", started.lastError || "adapter 未运行");
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (!adapter.queue.length && !adapter.drainPromise) break;
      if (adapter.drainPromise) await adapter.drainPromise.catch(() => {});
      else await new Promise((resolve) => setTimeout(resolve, 5));
    }
    await adapter.stop();
    const stateAfterAdapter = JSON.parse(readFileSync(layout.state, "utf8"));
    ensure(stateAfterAdapter.pending.length === 0, "REHEARSAL_ADAPTER_PENDING", "adapter 必须 complete 旧 pending");
    ensure(ids.duringIds.every((id) => stateAfterAdapter.seenIds.includes(id)), "REHEARSAL_ADAPTER_SEEN", "adapter 必须写入 seen");
    ensure(sends.length === 0, "REHEARSAL_ADAPTER_SEND", "spooled 消息不得产生第二次发送");
    ensure(withDb(layout.database, countFacts) === factsBeforeAdapter, "REHEARSAL_ADAPTER_FACTS", "adapter 恢复不得追加业务事实");

    const afterText = `${CANARY}AFTER_TEXT`;
    const routed = runtime.route(afterText, []);
    let afterDeliveries = 0;
    const afterOutcome = await handover.sendOrdinaryReply({
      appId: ids.appId,
      messageId: ids.afterId,
      chatId: ids.chatId,
      ownerId: ids.ownerId,
      text: `${CANARY}AFTER_REPLY`,
      deliver: async () => {
        afterDeliveries += 1;
        return { accepted: true, providerMessageId: "pm-synthetic-after" };
      },
    });
    ensure(afterOutcome.status === "accepted" && afterDeliveries === 1, "REHEARSAL_AFTER_REPLY", "after 回复必须由同一 sendOrdinaryReply accepted");
    const afterReplyRow = withDb(layout.database, (db) => replyOf(db, ids.afterId)[0]);
    ensure(afterReplyRow.state === "accepted" && afterReplyRow.ownerInstanceId === newOwner, "REHEARSAL_AFTER_OWNER", "after reply 必须属于新 owner");

    recordStage("09-unfreeze", {
      status: "ok",
      counts: {
        adapterRecovered: ids.duringIds.length,
        adapterSends: sends.length,
        adapterFactsAdded: 0,
        afterDeliveries,
        afterAccepted: 1,
      },
      route: { status: routed.status, domain: routed.domain ?? null },
      adapter: {
        recoveryView: "crash-after-reserve",
        recoverySeenExcluded: ids.duringIds.length,
        completedPending: ids.duringIds.length,
      },
      hashes: { stateBefore: stateShaBeforeAdapter, stateAfter: shaFile(layout.state) },
    });

    // -----------------------------------------------------------------------
    enterStage("10-queued");
    // 10. Real domain queue: same capture object, queued work resumed serially.
    // -----------------------------------------------------------------------
    const mainStatus = runtime.status();
    ensure(mainStatus.activeTasks.length === 0 && mainStatus.handover.pendingCount === 0, "REHEARSAL_MAIN_SETTLED", "主链在进入队列场景前必须无活跃 Task");
    runtime.close();
    state.runtime = null;
    await lease.release();
    state.lease = null;
    assertNoSidecars(layout.database);

    const queuedReport = runQueuedScenario(layout.queued, clock, ids);
    recordStage("10-queued", {
      status: "ok",
      counts: {
        queuedEvents: queuedReport.queuedEvents,
        resumedTasks: queuedReport.resumedTasks,
        workerExecutions: queuedReport.workerExecutions,
        contextVersionBeforeResume: queuedReport.contextVersionBeforeResume,
        contextVersionAfterResume: queuedReport.contextVersionAfterResume,
        remainingQueued: 0,
        activeTasks: 0,
      },
      point: queuedReport.point,
      isolation: "independent synthetic DB so the main capture context stays stable for P4.2 during evidence",
    });

    // -----------------------------------------------------------------------
    enterStage("11-final");
    // 11. Final static copy, expectation, official collect + verify CLI.
    // -----------------------------------------------------------------------
    assertNoSidecars(layout.database);
    const finalCopy = prepareStaticDatabaseCopy({ source: layout.database, target: layout.finalCopy });
    ensure(finalCopy.ok === true, "REHEARSAL_FINAL_COPY", JSON.stringify(finalCopy.blockers));
    ensure(finalCopy.target.walHeader === false, "REHEARSAL_FINAL_WAL", "最终副本必须是非 WAL");
    ensure(finalCopy.target.sha256 !== takeoverCopy.target.sha256, "REHEARSAL_FINAL_DISTINCT", "最终副本与 takeover 副本必须分 hash");

    const expectation = {
      schema: EXPECTATION_SCHEMA,
      freezeGeneration: 1,
      messages: [
        { messageId: ids.beforeId, role: "before", kind: "reply" },
        ...drainTraces.map((trace) => ({
          messageId: trace.messageId,
          role: "during",
          kind: "domain",
          contextId: trace.contextId,
          contextVersion: trace.contextVersion,
        })),
        { messageId: ids.afterId, role: "after", kind: "reply" },
      ],
      artifacts: [
        ...drainTraces.map((trace) => ({ path: trace.artifactPath, expectedSha256: shaFile(trace.artifactPath) })),
        { path: layout.safety, expectedSha256: shaFile(layout.safety) },
        { path: path.join(layout.vault, "notes", "overview.md"), expectedSha256: shaFile(path.join(layout.vault, "notes", "overview.md")) },
        { path: layout.state, expectedSha256: shaFile(layout.state) },
      ],
    };
    writeJsonExclusive(layout.finalExpectation, expectation);

    const collect = runNodeCli(EVIDENCE_CLI, [
      "collect",
      "--database", layout.finalCopy,
      "--expect", layout.finalExpectation,
      "--output", layout.finalEvidence,
    ]);
    ensure(collect.status === EXIT_OK, "REHEARSAL_FINAL_COLLECT", collect.stderr.trim() || `exit ${collect.status}`);
    const verify = runNodeCli(EVIDENCE_CLI, [
      "verify",
      "--expect", layout.finalExpectation,
      "--evidence", layout.finalEvidence,
      "--takeover-report", layout.takeoverReport,
      "--output", layout.finalVerification,
    ]);
    ensure(verify.status === EXIT_OK, "REHEARSAL_FINAL_VERIFY", verify.stderr.trim() || `exit ${verify.status}`);
    const verification = JSON.parse(readFileSync(layout.finalVerification, "utf8"));
    ensure(verification.ok === true && verification.blockers.length === 0, "REHEARSAL_FINAL_BLOCKED", JSON.stringify(verification.blockers));
    const evidence = JSON.parse(readFileSync(layout.finalEvidence, "utf8"));
    const duringEvidence = evidence.messages.filter((message) => message.role === "during");
    ensure(duringEvidence.every((message) => message.spools[0]?.state === "forwarded"), "REHEARSAL_FINAL_SPOOLS", "最终证据必须显示 forwarded spool");

    recordStage("11-final", {
      status: "ok",
      counts: {
        messages: verification.counts.messages,
        domainMessages: verification.counts.domainMessages,
        replyMessages: verification.counts.replyMessages,
        duringMessages: verification.counts.duringMessages,
        artifacts: verification.counts.artifacts,
        blockers: 0,
        tasks: duringEvidence.reduce((sum, message) => sum + message.tasks.length, 0),
        attempts: duringEvidence.reduce((sum, message) => sum + message.attempts.length, 0),
        runs: duringEvidence.reduce((sum, message) => sum + message.runs.length, 0),
        deliveries: duringEvidence.reduce((sum, message) => sum + message.deliveries.length, 0),
      },
      hashes: {
        finalCopy: finalCopy.target.sha256,
        expectation: shaFile(layout.finalExpectation),
        evidence: shaFile(layout.finalEvidence),
        verification: shaFile(layout.finalVerification),
      },
    });

    // -----------------------------------------------------------------------
    enterStage("12-rollback");
    // 12. Rollback delta against the synthetic vault baseline.
    // -----------------------------------------------------------------------
    const baseline = inventoryTree(path.join(layout.snapshot, "vault"));
    const delta = rollbackDelta({ baseline, currentRoot: layout.vault });
    ensure(delta.requiresIncrementReview === true && delta.added.length === 2 && delta.deleted.length === 0, "REHEARSAL_ROLLBACK_DELTA", JSON.stringify(delta));
    const rollbackReport = {
      schema: "syno-p43-rollback-delta-v1",
      status: "ok",
      baseline: "snapshot/vault",
      current: "vault",
      added: delta.added,
      changed: delta.changed,
      deleted: delta.deleted,
      requiresIncrementReview: delta.requiresIncrementReview,
      actions: { delete: 0, parallelConsumers: 0, externalEffects: 0 },
    };
    const rollbackFile = path.join(layout.rollback, "delta.json");
    writeJsonExclusive(rollbackFile, rollbackReport);
    recordStage("12-rollback", {
      status: "ok",
      counts: { added: delta.added.length, changed: delta.changed.length, deleted: delta.deleted.length, externalEffects: 0 },
      hashes: { delta: shaFile(rollbackFile) },
    });

    // -----------------------------------------------------------------------
    // Independent failure branches. None of them may touch the success scene.
    // -----------------------------------------------------------------------
    const failureBranches = await runFailureBranches({
      root: layout.failures,
      clock,
      ids,
      takeoverReport,
      takeoverReportPath: layout.takeoverReport,
      expectation,
      evidencePath: layout.finalEvidence,
      mainTakeoverCopy: layout.takeoverCopy,
    });

    const summary = {
      schema: REHEARSAL_SCHEMA,
      ok: true,
      synthetic: true,
      outputRoot: root,
      generatedAt: new Date(clock()).toISOString(),
      claims: { realProductionSwitched: false, realMessageRead: false, externalEffects: 0 },
      app: { appId: ids.appId, messageIds: { before: ids.beforeId, during: ids.duringIds, after: ids.afterId } },
      generation: 1,
      stages,
      failureBranches,
      counts: {
        beforeReplies: 1,
        duringMessages: ids.duringIds.length,
        afterReplies: 1,
        frozenSpools: 2,
        forwardedSpools: 2,
        spoolAttempts: 2,
        pending: 0,
        tasks: 2,
        attempts: 2,
        runs: 2,
        deliveries: 2,
        acceptedDeliveries: 2,
        dedupeOnly: 1,
        mappingOnly: 1,
        externalEffects: 0,
      },
      checks: {
        beforeEvidenceFromLegacyBridge: true,
        freezeSpoolOnly: true,
        ownerStoppedBeforeImport: true,
        sourceStateUnchangedByImport: true,
        pendingCarriedFromSpool: true,
        takeoverCopySeparateFromFinal: true,
        singleRuntimeLock: true,
        recoveredWithoutReplay: true,
        drainedThroughRealDomainChain: true,
        adapterRecoveredKnownSpools: true,
        afterReplyOwnedByNewRuntime: true,
        queuedWorkResumedSerially: true,
        finalEvidenceVerified: true,
        rollbackDeltaReviewedForward: true,
      },
    };
    assertReportsClean(root, ids);
    writeJsonExclusive(path.join(root, "rehearsal-summary.json"), summary);
    return summary;
  } catch (error) {
    error.stage ??= state.currentStage;
    const failure = {
      schema: REHEARSAL_SCHEMA,
      ok: false,
      synthetic: true,
      outputRoot: root,
      generatedAt: new Date(clock()).toISOString(),
      firstError: {
        stage: error?.stage ?? state.currentStage,
        code: error?.code ?? "REHEARSAL_FAILED",
        message: redact(error?.message ?? error),
      },
      stages,
    };
    try {
      writeJsonExclusive(path.join(root, "rehearsal-summary.json"), failure);
    } catch {
      // The scene may already be partially written; the first error stays the reported one.
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Independent domain queue scenario (same output root, separate synthetic DB).
// ---------------------------------------------------------------------------

function runQueuedScenario(directory, clock, ids) {
  const vaultRoot = path.join(directory, "vault");
  const sourcePath = path.join(directory, "source.txt");
  mkdirSync(vaultRoot, { recursive: true });
  const source = "P4.3-D queued scenario source.\n";
  writeFileSync(sourcePath, source, { encoding: "utf8", flag: "wx" });
  const sourceSha256 = digest(source);
  const appId = `${ids.appId}_q`;
  const chatId = `${ids.chatId}_q`;
  const ownerId = `${ids.ownerId}_q`;
  const message = (suffix) => ({
    appId,
    messageId: `${ids.afterId}_q_${suffix}`,
    chatId,
    ownerId,
    worker: "OpenCode",
  });
  const runtime = openNativeButlerRuntime({
    databasePath: path.join(directory, "runtime", "unified.db"),
    vaultRoot,
    sourcePath,
    sourceUrl: SOURCE_URL,
    indexFile: path.join(directory, "runtime", "knowledge-index.json"),
    resultRoot: path.join(directory, "results"),
    now: clock,
  });
  try {
    const capture = runtime.specialist("capture");
    const first = capture.begin(message("first"));
    let rejected = null;
    try {
      capture.begin(message("second"));
    } catch (error) {
      rejected = error;
    }
    ensure(rejected instanceof Error && rejected.message.includes("queued"), "REHEARSAL_QUEUE_NOT_FORMED", "同对象第二条消息必须进入 queued");
    const queued = runtime.queued("capture");
    ensure(queued.length === 1, "REHEARSAL_QUEUE_LENGTH", "必须恰好有一条 queued");
    const contextBeforeResume = withDb(path.join(directory, "runtime", "unified.db"), (db) => (
      openBusinessView(db).get("records", `context:${first.contextId}`)?.version ?? null
    ));
    ensure(contextBeforeResume === first.contextVersion, "REHEARSAL_QUEUE_CONTEXT_ADVANCED", "queued 消息不得提前推进 Context");
    const tasksBeforeResume = withDb(path.join(directory, "runtime", "unified.db"), (db) => recordsOf(db).filter((row) => row.kind === "task").length);
    ensure(tasksBeforeResume === 1, "REHEARSAL_QUEUE_TASK_EARLY", "queued 消息不得提前创建 Task");

    writeFileSync(first.artifactPath, captureMarkdown(source, sourceSha256), { encoding: "utf8", flag: "wx" });
    const firstTrace = capture.complete(first);
    ensure(firstTrace.taskState === "completed", "REHEARSAL_QUEUE_FIRST", "首条任务必须完成");
    ensure(capture.claim(firstTrace.deliveryKey).claimed === true, "REHEARSAL_QUEUE_CLAIM", "首条 delivery 必须 claim");
    capture.accept(firstTrace.deliveryKey);

    const resumed = capture.begin(runtime.queued("capture")[0]);
    ensure(resumed.contextVersion === first.contextVersion + 1, "REHEARSAL_QUEUE_CONTEXT", "恢复时必须顺序推进一次 Context");
    writeFileSync(resumed.artifactPath, captureMarkdown(source, sourceSha256), { encoding: "utf8", flag: "wx" });
    const resumedTrace = capture.complete(resumed);
    ensure(resumedTrace.taskState === "completed", "REHEARSAL_QUEUE_RESUMED", "queued 任务必须串行完成");
    ensure(capture.claim(resumedTrace.deliveryKey).claimed === true, "REHEARSAL_QUEUE_CLAIM_2", "恢复后 delivery 必须 claim");
    capture.accept(resumedTrace.deliveryKey);

    const status = runtime.status();
    ensure(status.activeTasks.length === 0 && runtime.queued("capture").length === 0, "REHEARSAL_QUEUE_SETTLED", "队列场景必须全部结算");
    return {
      queuedEvents: 1,
      resumedTasks: 1,
      workerExecutions: 2,
      contextVersionBeforeResume: contextBeforeResume,
      contextVersionAfterResume: resumed.contextVersion,
      point: { contextId: first.contextId, tasks: 2, deliveriesAccepted: 2 },
    };
  } finally {
    runtime.close();
  }
}

// ---------------------------------------------------------------------------
// Failure branches: independent copies only.
// ---------------------------------------------------------------------------

async function runFailureBranches({
  root, clock, ids, takeoverReport, takeoverReportPath, expectation, evidencePath, mainTakeoverCopy,
}) {
  const branches = [];

  // 1. Competing lock instance.
  {
    const directory = path.join(root, "competing-lock");
    mkdirSync(directory, { recursive: true });
    const lockFile = path.join(directory, "syno.lock");
    const statusFile = path.join(directory, "host-status.json");
    writeJsonExclusive(statusFile, { schema: "syno-host-status-v1", running: true, synthetic: true });
    const statusSha = shaFile(statusFile);
    const lease = await new ProcessFileLock({ file: lockFile, failFast: true, timeoutMs: 0, metadata: { instanceId: "branch-owner" } }).acquire();
    let code = null;
    try {
      await new ProcessFileLock({ file: lockFile, failFast: true, timeoutMs: 0 }).acquire();
    } catch (error) {
      code = error?.code ?? "UNKNOWN";
    }
    const statusUnchanged = shaFile(statusFile) === statusSha;
    await lease.release();
    ensure(code === "PROCESS_LOCK_HELD" && statusUnchanged, "REHEARSAL_BRANCH_LOCK", `竞争锁未失败关闭（${code}）`);
    const report = {
      schema: "syno-p43-failure-branch-v1",
      name: "competing-lock",
      status: "blocked",
      competitorCode: code,
      statusUnchanged,
    };
    const file = path.join(directory, "report.json");
    writeJsonExclusive(file, report);
    branches.push({ name: report.name, status: report.status, hash: shaFile(file), evidence: { competitorCode: code, statusUnchanged } });
  }

  // 2. dispatching / sending interruption only becomes hold; callbacks do not grow.
  {
    const directory = path.join(root, "interrupted");
    mkdirSync(directory, { recursive: true });
    const database = path.join(directory, "unified.db");
    const spoolId = `${ids.beforeId}_int_spool`;
    const replyId = `${ids.beforeId}_int_reply`;
    let deliverCalls = 0;
    const db = openBusinessDb(database);
    try {
      ensureEmptyRules(db, clock);
      const interrupted = openHostHandover({ db, now: clock, instanceId: "interrupted-old" });
      interrupted.freeze({ reason: "interrupted-fixture" });
      interrupted.spool({
        appId: ids.appId, messageId: spoolId, chatId: ids.chatId, ownerId: ids.ownerId, worker: "OpenCode", text: `${CANARY}INTERRUPT_SPOOL`,
      });
      const claimed = interrupted.claimNextFrozen();
      ensure(claimed?.state === "dispatching", "REHEARSAL_BRANCH_INTERRUPT_CLAIM", "spool 必须停在 dispatching");
      executeNative(db, "ingest", ["feishu-test", {
        id: replyId,
        type: "reply.request",
        subject: `capture:reply_${replyId}`,
        summary: "interrupted reply",
        detail: JSON.stringify({ appId: ids.appId, chatId: ids.chatId }),
      }], clock(), ENV);
      applyRoute(db, {
        commandId: `route:interrupted:${replyId}`,
        appId: ids.appId,
        messageId: replyId,
        contextId: `capture:reply_${replyId}`,
        expectedVersion: null,
        ownerId: ids.ownerId,
        replyTo: ids.chatId,
        now: clock(),
      });
      void interrupted.sendReply({
        appId: ids.appId,
        messageId: replyId,
        chatId: ids.chatId,
        ownerId: ids.ownerId,
        text: `${CANARY}INTERRUPT_REPLY`,
        deliver: async () => {
          deliverCalls += 1;
          return new Promise(() => {});
        },
      });
    } finally {
      db.close();
    }
    const recovered = withDb(database, (db) => {
      const handover = openHostHandover({ db, now: clock, instanceId: "interrupted-new" });
      const result = handover.recoverInterrupted();
      const status = buildHostStatus({ db, now: clock, handover });
      const replies = replyOf(db, replyId);
      const spools = spoolsOf(db).filter((row) => row.messageId === spoolId);
      const preflight = evaluateDatabasePreflight({
        hostStatus: status,
        migrationPlan: planMigration(buildMigrationSnapshot({ db })),
        expectedFreezeGeneration: 1,
      });
      return { result, status, replies, spools, preflight };
    });
    ensure(recovered.result.spool === 1 && recovered.result.reply === 1, "REHEARSAL_BRANCH_INTERRUPT_RECOVER", "recover 必须只把 dispatching/sending 转为 hold");
    ensure(recovered.replies[0]?.state === "hold" && recovered.spools[0]?.state === "hold", "REHEARSAL_BRANCH_INTERRUPT_STATE", "中断记录必须成为 hold");
    ensure(deliverCalls === 1, "REHEARSAL_BRANCH_INTERRUPT_CALLBACK", "recover 不得增加外部 callback 次数");
    ensure(recovered.preflight.ready === false && recovered.preflight.blockers.some((blocker) => blocker.code === "handover_hold"), "REHEARSAL_BRANCH_INTERRUPT_PREFLIGHT", "hold 必须阻断 preflight");

    assertNoSidecars(database);
    const copyPath = path.join(directory, "static.db");
    const copy = prepareStaticDatabaseCopy({ source: database, target: copyPath });
    ensure(copy.ok === true, "REHEARSAL_BRANCH_INTERRUPT_COPY", JSON.stringify(copy.blockers));
    const cli = runNodeCli(PREFLIGHT_CLI, ["--database", copyPath, "--takeover-freeze-generation", "1", "--output", path.join(directory, "preflight.json")]);
    ensure(cli.status === EXIT_BLOCKED, "REHEARSAL_BRANCH_INTERRUPT_CLI", `preflight 必须阻断（exit ${cli.status}）`);
    const cliReport = JSON.parse(readFileSync(path.join(directory, "preflight.json"), "utf8"));
    ensure(cliReport.ready === false && cliReport.blockers.some((blocker) => blocker.code === "handover_hold"), "REHEARSAL_BRANCH_INTERRUPT_CLI_REPORT", "CLI 必须报告 handover_hold");

    const branchExpectation = {
      schema: EXPECTATION_SCHEMA,
      freezeGeneration: 1,
      messages: [{ messageId: replyId, role: "before", kind: "reply" }],
      artifacts: [],
    };
    writeJsonExclusive(path.join(directory, "expectation.json"), branchExpectation);
    const evidence = collectHandoverEvidence({ databasePath: copyPath, expectation: branchExpectation });
    writeJsonExclusive(path.join(directory, "evidence.json"), evidence);
    const verification = verifyHandoverEvidence({ expectation: branchExpectation, evidence, takeoverReport });
    ensure(verification.ok === false, "REHEARSAL_BRANCH_INTERRUPT_VERIFY", "最终验收必须阻断");
    writeJsonExclusive(path.join(directory, "verification.json"), verification);
    const report = {
      schema: "syno-p43-failure-branch-v1",
      name: "dispatching-sending-interruption",
      status: "blocked",
      recovered: recovered.result,
      deliverCalls,
      preflightBlockers: cliReport.blockers.map((blocker) => blocker.code),
      verifyBlockers: verification.blockers.map((blocker) => blocker.code),
    };
    const file = path.join(directory, "report.json");
    writeJsonExclusive(file, report);
    branches.push({ name: report.name, status: report.status, hash: shaFile(file), evidence: { deliverCalls, verifyBlockers: report.verifyBlockers } });
  }

  // 3. Delivery unknown stays unknown, never sendable, and blocks both gates.
  {
    const directory = path.join(root, "delivery-unknown");
    mkdirSync(directory, { recursive: true });
    const vaultRoot = path.join(directory, "vault");
    mkdirSync(vaultRoot, { recursive: true });
    const sourcePath = path.join(directory, "source.txt");
    const source = "P4.3-D unknown delivery source.\n";
    writeFileSync(sourcePath, source, { encoding: "utf8", flag: "wx" });
    const database = path.join(directory, "unified.db");
    const runtime = openNativeButlerRuntime({
      databasePath: database,
      vaultRoot,
      sourcePath,
      sourceUrl: SOURCE_URL,
      indexFile: path.join(directory, "runtime", "knowledge-index.json"),
      resultRoot: path.join(directory, "results"),
      now: clock,
    });
    let trace;
    try {
      ensureCaptureLaneBinding(database, clock);
      const capture = runtime.specialist("capture");
      const execution = capture.begin({
        appId: ids.appId, messageId: `${ids.beforeId}_unknown`, chatId: ids.chatId, ownerId: ids.ownerId, worker: "OpenCode",
      });
      writeFileSync(execution.artifactPath, captureMarkdown(source, digest(source)), { encoding: "utf8", flag: "wx" });
      const completed = capture.complete(execution);
      ensure(capture.claim(completed.deliveryKey).claimed === true, "REHEARSAL_BRANCH_UNKNOWN_CLAIM", "delivery 必须 claim");
      capture.unknown(completed.deliveryKey);
      trace = capture.trace(execution.taskId);
      ensure(trace.deliveryState === "unknown" && trace.maySend === false, "REHEARSAL_BRANCH_UNKNOWN_STATE", "delivery 必须保持 unknown 且 may_send=false");
      const unknownEntry = runtime.status().deliveries.unknown.find((entry) => entry.deliveryKey === completed.deliveryKey);
      ensure(unknownEntry?.may_send === false && unknownEntry?.claimable === false, "REHEARSAL_BRANCH_UNKNOWN_STATUS", "unknown 不得被标为待重发");
    } finally {
      runtime.close();
    }
    assertNoSidecars(database);
    const copyPath = path.join(directory, "static.db");
    const copy = prepareStaticDatabaseCopy({ source: database, target: copyPath });
    ensure(copy.ok === true, "REHEARSAL_BRANCH_UNKNOWN_COPY", JSON.stringify(copy.blockers));
    const cli = runNodeCli(PREFLIGHT_CLI, ["--database", copyPath, "--output", path.join(directory, "preflight.json")]);
    ensure(cli.status === EXIT_BLOCKED, "REHEARSAL_BRANCH_UNKNOWN_CLI", `entry preflight 必须阻断（exit ${cli.status}）`);
    const cliReport = JSON.parse(readFileSync(path.join(directory, "preflight.json"), "utf8"));
    ensure(cliReport.blockers.some((blocker) => blocker.code === "unknown_delivery"), "REHEARSAL_BRANCH_UNKNOWN_PREFLIGHT", "preflight 必须报告 unknown_delivery");

    const branchExpectation = {
      schema: EXPECTATION_SCHEMA,
      freezeGeneration: 1,
      messages: [{
        messageId: trace.messageId ?? `${ids.beforeId}_unknown`,
        role: "after",
        kind: "domain",
        contextId: trace.contextId,
        contextVersion: trace.contextVersion,
      }],
      artifacts: [],
    };
    // The capture trace keys the source message as task-<messageId>; resolve the real inbox id from the DB.
    branchExpectation.messages[0].messageId = withDb(database, (db) => {
      const inbox = recordsOf(db).find((row) => row.kind === "inbox" && row.receipt?.contextId === trace.contextId);
      return inbox?.id ?? branchExpectation.messages[0].messageId;
    });
    writeJsonExclusive(path.join(directory, "expectation.json"), branchExpectation);
    const evidence = collectHandoverEvidence({ databasePath: copyPath, expectation: branchExpectation });
    writeJsonExclusive(path.join(directory, "evidence.json"), evidence);
    const verification = verifyHandoverEvidence({ expectation: branchExpectation, evidence, takeoverReport });
    ensure(verification.ok === false, "REHEARSAL_BRANCH_UNKNOWN_VERIFY", "最终验收必须阻断");
    ensure(verification.blockers.some((blocker) => blocker.code === "unknown_delivery"), "REHEARSAL_BRANCH_UNKNOWN_VERIFY_CODE", "最终验收必须报告 unknown_delivery");
    writeJsonExclusive(path.join(directory, "verification.json"), verification);
    const evidenceUnknown = evidence.global.unknownDeliveries;
    const report = {
      schema: "syno-p43-failure-branch-v1",
      name: "delivery-unknown",
      status: "blocked",
      maySend: trace.maySend === true,
      evidenceUnknown,
      preflightBlockers: cliReport.blockers.map((blocker) => blocker.code),
      verifyBlockers: verification.blockers.map((blocker) => blocker.code),
    };
    const file = path.join(directory, "report.json");
    writeJsonExclusive(file, report);
    branches.push({ name: report.name, status: report.status, hash: shaFile(file), evidence: { evidenceUnknown, verifyBlockers: report.verifyBlockers } });
  }

  // 4. Non-current generation / N mismatch fails closed.
  {
    const directory = path.join(root, "generation-mismatch");
    mkdirSync(directory, { recursive: true });
    const cli = runNodeCli(PREFLIGHT_CLI, [
      "--database", mainTakeoverCopy,
      "--takeover-freeze-generation", "2",
      "--output", path.join(directory, "preflight-generation-2.json"),
    ]);
    ensure(cli.status === EXIT_BLOCKED, "REHEARSAL_BRANCH_GENERATION_CLI", `错误 generation 必须阻断（exit ${cli.status}）`);
    const cliReport = JSON.parse(readFileSync(path.join(directory, "preflight-generation-2.json"), "utf8"));
    ensure(cliReport.ready === false && cliReport.blockers.some((blocker) => blocker.code === "handover_generation_mismatch"), "REHEARSAL_BRANCH_GENERATION_CODE", "必须报告 handover_generation_mismatch");

    const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
    const wrongCount = structuredClone(takeoverReport);
    wrongCount.counts.takeoverFrozenSpools = 1;
    const countVerification = verifyHandoverEvidence({ expectation, evidence, takeoverReport: wrongCount });
    ensure(countVerification.ok === false && countVerification.blockers.some((blocker) => blocker.code === "takeover_count_mismatch"), "REHEARSAL_BRANCH_COUNT", "N 不一致必须阻断");
    const wrongGeneration = structuredClone(expectation);
    wrongGeneration.freezeGeneration = 2;
    const generationVerification = verifyHandoverEvidence({ expectation: wrongGeneration, evidence, takeoverReport });
    ensure(generationVerification.ok === false, "REHEARSAL_BRANCH_GENERATION_VERIFY", "evidence generation 不一致必须阻断");
    writeJsonExclusive(path.join(directory, "verification-count.json"), countVerification);
    writeJsonExclusive(path.join(directory, "verification-generation.json"), generationVerification);
    const report = {
      schema: "syno-p43-failure-branch-v1",
      name: "generation-or-n-mismatch",
      status: "blocked",
      preflightBlockers: cliReport.blockers.map((blocker) => blocker.code),
      countBlockers: countVerification.blockers.map((blocker) => blocker.code),
      generationBlockers: generationVerification.blockers.map((blocker) => blocker.code),
    };
    const file = path.join(directory, "report.json");
    writeJsonExclusive(file, report);
    branches.push({ name: report.name, status: report.status, hash: shaFile(file), evidence: { countBlockers: report.countBlockers } });
  }

  // 5. Cross-object context / artifact hash mismatch blocks the official verifier CLI.
  {
    const directory = path.join(root, "cross-object");
    mkdirSync(directory, { recursive: true });
    const tampered = JSON.parse(readFileSync(evidencePath, "utf8"));
    const during = tampered.messages.find((message) => message.role === "during");
    ensure(during?.context, "REHEARSAL_BRANCH_CROSS_CONTEXT", "证据缺少 during context");
    during.context.contextId = "capture:cross_object_mismatch";
    tampered.artifacts[0].actualSha256 = "0".repeat(64);
    const tamperedPath = path.join(directory, "evidence.json");
    writeJsonExclusive(tamperedPath, tampered);
    const functionVerification = verifyHandoverEvidence({ expectation, evidence: tampered, takeoverReport });
    ensure(functionVerification.ok === false, "REHEARSAL_BRANCH_CROSS_FUNCTION", "错配证据必须阻断");
    const codes = functionVerification.blockers.map((blocker) => blocker.code);
    ensure(codes.includes("context_object_mismatch") && codes.includes("artifact_hash_mismatch"), "REHEARSAL_BRANCH_CROSS_CODES", JSON.stringify(codes));
    const cli = runNodeCli(EVIDENCE_CLI, [
      "verify",
      "--expect", path.join(path.dirname(path.dirname(evidencePath)), "final", "expectation.json"),
      "--evidence", tamperedPath,
      "--takeover-report", takeoverReportPath,
      "--output", path.join(directory, "verification.json"),
    ]);
    ensure(cli.status === EXIT_BLOCKED, "REHEARSAL_BRANCH_CROSS_CLI", `CLI verify 必须阻断（exit ${cli.status}）`);
    const cliVerification = JSON.parse(readFileSync(path.join(directory, "verification.json"), "utf8"));
    ensure(cliVerification.ok === false, "REHEARSAL_BRANCH_CROSS_CLI_REPORT", "CLI verify 必须 ok=false");
    writeJsonExclusive(path.join(directory, "verification-function.json"), functionVerification);
    const report = {
      schema: "syno-p43-failure-branch-v1",
      name: "cross-object-context-artifact",
      status: "blocked",
      functionBlockers: codes,
      cliBlockers: cliVerification.blockers.map((blocker) => blocker.code),
    };
    const file = path.join(directory, "report.json");
    writeJsonExclusive(file, report);
    branches.push({ name: report.name, status: report.status, hash: shaFile(file), evidence: { functionBlockers: codes } });
  }

  return branches;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE = `用法：node production-rehearsal.mjs run --output-root <绝对且不存在的新目录>

在全新目录中串行复演 P4.3 切换：合成旧 JSON／vault／DB、旧桥 before 回复、freeze during spool、
旧消费者退出、P4.3-C 安全事实导入、静态副本与 P4 preflight、迁移快照、唯一新 Runtime 锁、
recover→drain、unfreeze 与新 adapter 恢复、领域 queued 串行、最终静态副本与 P4.2 collect/verify、
回退增量，以及独立失败分支证据。

不联网、不调用业务模型、不启动生产、不触碰真实 DB／vault／凭据。输出根必须由本工具排他新建。`;

function parseRehearsalArguments(argv) {
  if (argv.length === 1 && argv[0] === "--help") return { help: true };
  const [command, ...rest] = argv;
  if (command !== "run") throw new RehearsalError("REHEARSAL_COMMAND", "唯一子命令是 run（或单独使用 --help）");
  let outputRoot = null;
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument !== "--output-root") throw new RehearsalError("REHEARSAL_UNKNOWN_ARGUMENT", `未知参数：${argument}`);
    if (outputRoot !== null) throw new RehearsalError("REHEARSAL_DUPLICATE_ARGUMENT", "--output-root 只能指定一次");
    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) throw new RehearsalError("REHEARSAL_MISSING_VALUE", "--output-root 缺少值");
    outputRoot = value;
    index += 1;
  }
  if (!outputRoot) throw new RehearsalError("REHEARSAL_OUTPUT_ROOT_REQUIRED", "必须指定 --output-root");
  if (!path.isAbsolute(outputRoot)) throw new RehearsalError("REHEARSAL_OUTPUT_ROOT_RELATIVE", "--output-root 必须是绝对路径");
  if (existsSync(outputRoot)) throw new RehearsalError("REHEARSAL_OUTPUT_ROOT_EXISTS", "output-root 已存在，禁止覆盖重跑现场");
  return { help: false, outputRoot };
}

export async function runRehearsalCli(argv, { stdout = process.stdout, stderr = process.stderr } = {}) {
  let parsed;
  try {
    parsed = parseRehearsalArguments(argv);
  } catch (error) {
    stderr.write(`${redact(error?.message ?? error)}\n`);
    return EXIT_ERROR;
  }
  if (parsed.help) {
    stdout.write(`${USAGE}\n`);
    return EXIT_OK;
  }
  try {
    const summary = await runProductionRehearsal({ outputRoot: parsed.outputRoot });
    stdout.write(`${JSON.stringify({
      schema: summary.schema,
      ok: summary.ok,
      outputRoot: summary.outputRoot,
      stages: summary.stages.length,
      failureBranches: summary.failureBranches.length,
      claims: summary.claims,
    })}\n`);
    return EXIT_OK;
  } catch (error) {
    // Keep stable, secret-free failure output even when the first error came from an assertion.
    stdout.write(`${JSON.stringify({
      schema: REHEARSAL_SCHEMA,
      ok: false,
      outputRoot: path.resolve(parsed.outputRoot),
      error: { stage: error?.stage ?? null, code: error?.code ?? "REHEARSAL_FAILED", message: redact(error?.message ?? error) },
    })}\n`);
    return EXIT_BLOCKED;
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
  process.exitCode = await runRehearsalCli(process.argv.slice(2));
}
