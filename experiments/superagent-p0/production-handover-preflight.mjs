// P4 preparation: read-only, fail-closed database gate before a production handover window.
// It answers only one question: do the shared-database facts allow entering the cutover window?
// It does not verify processes, files, vault contents, Owner binding or external effects.
import { closeSync, existsSync, openSync, readSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { STATUS_SCHEMA, buildHostStatus, buildMigrationSnapshot } from "./host-operations.mjs";
import { HANDOVER_SCHEMA, openHostHandover } from "./host-handover.mjs";
import { planMigration } from "./migration-rehearsal.mjs";

export const PREFLIGHT_SCHEMA = "syno-p4-production-handover-preflight-v1";

// Stable exit codes. 0 and 3 are the normal gate outcomes; 2 covers every invocation/read failure.
export const EXIT_READY = 0;
export const EXIT_NOT_READY = 3;
export const EXIT_ERROR = 2;

export const DOMAINS = ["capture", "knowledge", "idea", "project", "memory"];

// P4 archives old Tasks/Workflows/Sessions read-only. Only these migration actions are inert enough.
export const ALLOWED_MIGRATION_ACTIONS = [
  "copy_versioned",
  "dedupe_no_resend",
  "dedupe_only",
  "history_only",
  "mapping_only",
];
// These actions would resume, requeue, re-claim or hold for reconciliation; P4 must not accept them.
export const FORBIDDEN_MIGRATION_ACTIONS = [
  "hold_for_reconciliation",
  "migrate_claimable",
  "migrate_exact_version",
  "requeue_after_cutover",
  "resume_after_verification",
];

const ALLOWED = new Set(ALLOWED_MIGRATION_ACTIONS);
const FORBIDDEN = new Set(FORBIDDEN_MIGRATION_ACTIONS);

export const PREFLIGHT_SCOPE = Object.freeze({
  databaseGateOnly: true,
  includes: [
    "five-domain active Tasks and queued events",
    "other active Tasks outside the five domains",
    "pending Decisions",
    "queued and unknown deliveries",
    "handover pending and hold rows",
    "migration cutoverBlocked, externalEffects and per-item actions",
  ],
  excludes: [
    "running processes, ports and consumer exclusivity",
    "vault files, Markdown content and snapshots",
    "Owner binding and credentials",
    "external effect reconciliation",
    "real notification delivery",
  ],
});

/** Structural input problems throw; unknown schema/status/action values become blockers. */
export class PreflightInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "PreflightInputError";
    this.code = "PREFLIGHT_INPUT_INVALID";
  }
}

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

function booleanAt(value, label) {
  if (typeof value !== "boolean") fail(`${label} 必须是布尔值`);
  return value;
}

function nonNegativeIntegerAt(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${label} 必须是非负整数`);
  return value;
}

function emptyDomainCounts() {
  return Object.fromEntries(DOMAINS.map((domain) => [domain, { activeTasks: 0, queued: 0 }]));
}

function emptyCounts() {
  return {
    domains: emptyDomainCounts(),
    activeTasks: 0,
    otherActiveTasks: 0,
    queuedEvents: 0,
    pendingDecisions: 0,
    queuedDeliveries: 0,
    unknownDeliveries: 0,
    handoverPending: 0,
    handoverHolds: 0,
    takeoverFrozenSpools: 0,
    reconciliationBlocking: false,
    migrationItems: 0,
    migrationForbiddenActions: 0,
    migrationUnknownActions: 0,
    externalEffects: null,
  };
}

function addBlocker(blockers, code, count = 1) {
  if (count > 0) blockers.push({ code, count });
}

function sortBlockers(blockers) {
  return blockers.sort((left, right) => left.code.localeCompare(right.code));
}

function readHostCounts(hostStatus, blockers, counts) {
  objectAt(hostStatus, "hostStatus");
  if (hostStatus.schema !== STATUS_SCHEMA) {
    // An unrecognised status document must never be read as "everything is clean".
    addBlocker(blockers, "host_status_schema_unknown");
    return;
  }

  const domains = objectAt(hostStatus.domains, "hostStatus.domains");
  let domainActiveTasks = 0;
  for (const domain of DOMAINS) {
    const entry = objectAt(domains[domain], `hostStatus.domains.${domain}`);
    const activeTasks = arrayAt(entry.activeTasks, `hostStatus.domains.${domain}.activeTasks`);
    const queued = arrayAt(entry.queued, `hostStatus.domains.${domain}.queued`);
    counts.domains[domain] = { activeTasks: activeTasks.length, queued: queued.length };
    domainActiveTasks += activeTasks.length;
    counts.queuedEvents += queued.length;
  }

  counts.activeTasks = arrayAt(hostStatus.activeTasks, "hostStatus.activeTasks").length;
  counts.otherActiveTasks = arrayAt(hostStatus.otherActiveTasks, "hostStatus.otherActiveTasks").length;
  if (counts.activeTasks !== domainActiveTasks + counts.otherActiveTasks) {
    // A stale or partial status document must not be interpreted as a clean split.
    fail("hostStatus.activeTasks 必须等于五领域与 otherActiveTasks 之和");
  }

  const decisions = objectAt(hostStatus.decisions, "hostStatus.decisions");
  counts.pendingDecisions = arrayAt(decisions.pending, "hostStatus.decisions.pending").length;

  const deliveries = objectAt(hostStatus.deliveries, "hostStatus.deliveries");
  counts.queuedDeliveries = arrayAt(deliveries.queued, "hostStatus.deliveries.queued").length;
  counts.unknownDeliveries = arrayAt(deliveries.unknown, "hostStatus.deliveries.unknown").length;

  const reconciliation = objectAt(hostStatus.reconciliation, "hostStatus.reconciliation");
  counts.reconciliationBlocking = booleanAt(reconciliation.blocking, "hostStatus.reconciliation.blocking");

  addBlocker(blockers, "active_task", counts.activeTasks);
  addBlocker(blockers, "queued_event", counts.queuedEvents);
  addBlocker(blockers, "pending_decision", counts.pendingDecisions);
  addBlocker(blockers, "queued_delivery", counts.queuedDeliveries);
  addBlocker(blockers, "unknown_delivery", counts.unknownDeliveries);
  addBlocker(blockers, "reconciliation_blocking", counts.reconciliationBlocking ? 1 : 0);
}

function expectedGenerationFrom(value) {
  if (value === undefined) return null;
  if (!Number.isSafeInteger(value) || value < 1) fail("expectedFreezeGeneration 必须是正整数");
  return value;
}

/**
 * Entry mode keeps the original semantics: any pending spool blocks.
 * Takeover mode allows only frozen spool rows from the explicitly supplied freeze generation and still
 * requires every unrelated blocker to be empty. It never guesses the generation and never ignores holds.
 */
function readHandoverCounts(hostStatus, blockers, counts, { mode, expectedFreezeGeneration }) {
  if (hostStatus.handover === null) {
    addBlocker(blockers, "handover_unobserved");
    return { observed: null, allowed: 0 };
  }
  const handover = objectAt(hostStatus.handover, "hostStatus.handover");
  const pending = arrayAt(handover.pending, "hostStatus.handover.pending");
  const holds = arrayAt(handover.holds, "hostStatus.handover.holds");
  counts.handoverPending = pending.length;
  counts.handoverHolds = holds.length;
  addBlocker(blockers, "handover_hold", holds.length);

  if (mode === "entry") {
    addBlocker(blockers, "handover_pending", pending.length);
    return {
      observed: Number.isSafeInteger(handover.generation) ? handover.generation : null,
      allowed: 0,
    };
  }

  if (handover.schema !== HANDOVER_SCHEMA) {
    // An unrecognised handover document cannot prove frozen state, generation or pending shape.
    addBlocker(blockers, "handover_schema_unknown");
    return {
      observed: Number.isSafeInteger(handover.generation) ? handover.generation : null,
      allowed: 0,
    };
  }

  const generation = nonNegativeIntegerAt(handover.generation, "hostStatus.handover.generation");
  const control = objectAt(handover.control, "hostStatus.handover.control");
  const controlGeneration = nonNegativeIntegerAt(control.generation, "hostStatus.handover.control.generation");
  const frozenAtHost = booleanAt(hostStatus.frozen, "hostStatus.frozen");
  const frozenAtHandover = booleanAt(handover.frozen, "hostStatus.handover.frozen");
  const frozenAtControl = booleanAt(control.frozen, "hostStatus.handover.control.frozen");
  const pendingCount = nonNegativeIntegerAt(handover.pendingCount, "hostStatus.handover.pendingCount");
  const holdCount = nonNegativeIntegerAt(handover.holdCount, "hostStatus.handover.holdCount");
  const spool = objectAt(handover.spool, "hostStatus.handover.spool");
  const spoolCounts = objectAt(spool.counts, "hostStatus.handover.spool.counts");
  const frozenSpoolCount = nonNegativeIntegerAt(spoolCounts.frozen, "hostStatus.handover.spool.counts.frozen");
  const dispatchingCount = nonNegativeIntegerAt(
    spoolCounts.dispatching,
    "hostStatus.handover.spool.counts.dispatching",
  );

  let consistent = true;
  const frozen = frozenAtHost === true && frozenAtHandover === true && frozenAtControl === true;
  if (!frozen) {
    addBlocker(blockers, "handover_not_frozen");
    consistent = false;
  }
  if (generation !== controlGeneration) {
    addBlocker(blockers, "handover_generation_conflict");
    consistent = false;
  }
  if (generation !== expectedFreezeGeneration) addBlocker(blockers, "handover_generation_mismatch");
  const countsConsistent = pendingCount === pending.length
    && frozenSpoolCount === pending.length
    && holdCount === holds.length
    // Dispatching rows must also appear in holds; a larger count means the status is not trustworthy.
    && dispatchingCount <= holds.length;
  if (!countsConsistent) {
    // Counts are part of the proof that only the approved frozen spool is being taken over.
    addBlocker(blockers, "handover_status_inconsistent");
    consistent = false;
  }

  let allowed = 0;
  pending.forEach((item, index) => {
    objectAt(item, `hostStatus.handover.pending[${index}]`);
    const state = item.state;
    if (typeof state !== "string" || !state) fail(`hostStatus.handover.pending[${index}].state 必须是非空字符串`);
    const itemGeneration = nonNegativeIntegerAt(
      item.freezeGeneration,
      `hostStatus.handover.pending[${index}].freezeGeneration`,
    );
    const needsReconciliation = booleanAt(
      item.needsReconciliation,
      `hostStatus.handover.pending[${index}].needsReconciliation`,
    );
    const autoReplay = booleanAt(item.autoReplay, `hostStatus.handover.pending[${index}].autoReplay`);

    let acceptable = true;
    if (state !== "frozen") {
      addBlocker(blockers, "handover_pending_not_frozen");
      acceptable = false;
    }
    if (itemGeneration !== expectedFreezeGeneration) {
      addBlocker(blockers, "handover_pending_generation_mismatch");
      acceptable = false;
    }
    if (needsReconciliation) {
      addBlocker(blockers, "handover_pending_needs_reconciliation");
      acceptable = false;
    }
    if (autoReplay) {
      addBlocker(blockers, "handover_pending_auto_replay");
      acceptable = false;
    }
    if (acceptable) allowed += 1;
  });

  if (!consistent || generation !== expectedFreezeGeneration) allowed = 0;
  counts.takeoverFrozenSpools = allowed;
  return { observed: generation, allowed };
}

function readMigrationCounts(migrationPlan, blockers, counts) {
  objectAt(migrationPlan, "migrationPlan");
  if (migrationPlan.schema !== 1) {
    addBlocker(blockers, "migration_plan_schema_unknown");
    return { cutoverBlocked: null, actions: {} };
  }

  const items = arrayAt(migrationPlan.items, "migrationPlan.items");
  counts.migrationItems = items.length;
  const actions = new Map();

  items.forEach((item, index) => {
    objectAt(item, `migrationPlan.items[${index}]`);
    const action = item.action;
    if (typeof action !== "string" || !action) {
      counts.migrationUnknownActions += 1;
      return;
    }
    if (ALLOWED.has(action) || FORBIDDEN.has(action)) {
      actions.set(action, (actions.get(action) ?? 0) + 1);
      return;
    }
    // Unknown action values are counted but never echoed into the report.
    counts.migrationUnknownActions += 1;
  });

  for (const [action, count] of actions) {
    if (!FORBIDDEN.has(action)) continue;
    counts.migrationForbiddenActions += count;
    addBlocker(blockers, `migration_action_${action}`, count);
  }
  if (counts.migrationUnknownActions > 0) addBlocker(blockers, "migration_action_unknown", counts.migrationUnknownActions);

  const cutoverBlocked = booleanAt(migrationPlan.cutoverBlocked, "migrationPlan.cutoverBlocked");
  if (cutoverBlocked) addBlocker(blockers, "migration_cutover_blocked");

  const externalEffects = nonNegativeIntegerAt(migrationPlan.externalEffects, "migrationPlan.externalEffects");
  counts.externalEffects = externalEffects;
  addBlocker(blockers, "external_effects", externalEffects);

  return {
    cutoverBlocked,
    actions: Object.fromEntries([...actions.entries()].sort(([left], [right]) => left.localeCompare(right))),
  };
}

/**
 * Pure decision function. Inputs are plain `buildHostStatus` and `planMigration` results.
 * Omitting `expectedFreezeGeneration` means entry mode; supplying it means takeover mode.
 * The output is deterministic, JSON-serializable and contains no bodies, Memory values or secrets.
 */
export function evaluateDatabasePreflight({ hostStatus, migrationPlan, expectedFreezeGeneration } = {}) {
  objectAt(hostStatus, "hostStatus");
  objectAt(migrationPlan, "migrationPlan");
  const expected = expectedGenerationFrom(expectedFreezeGeneration);
  const mode = expected === null ? "entry" : "takeover";

  const blockers = [];
  const counts = emptyCounts();

  readHostCounts(hostStatus, blockers, counts);
  const handover = readHandoverCounts(hostStatus, blockers, counts, {
    mode,
    expectedFreezeGeneration: expected,
  });
  const migration = readMigrationCounts(migrationPlan, blockers, counts);

  sortBlockers(blockers);
  const ready = blockers.length === 0;
  return {
    schema: PREFLIGHT_SCHEMA,
    scope: PREFLIGHT_SCOPE,
    mode,
    expectedFreezeGeneration: expected,
    observedFreezeGeneration: handover.observed,
    // true only when the takeover gate is ready and must drain frozen rows; never means all settled.
    drainRequired: ready && mode === "takeover" && handover.allowed > 0,
    ready,
    blockers,
    counts,
    migration: {
      cutoverBlocked: migration.cutoverBlocked,
      actions: migration.actions,
      allowedActions: [...ALLOWED_MIGRATION_ACTIONS],
      forbiddenActions: [...FORBIDDEN_MIGRATION_ACTIONS],
    },
    inputs: {
      hostStatusSchema: typeof hostStatus.schema === "string" ? hostStatus.schema : null,
      migrationPlanSchema: Number.isSafeInteger(migrationPlan.schema) ? migrationPlan.schema : null,
    },
  };
}

const USAGE = `用法：node production-handover-preflight.mjs --database <绝对路径> [--output <绝对路径>]
       [--takeover-freeze-generation <正整数>]

只读检查共享业务数据库是否允许进入 P4 生产切换窗口。不访问网络、不写数据库、不启动服务。

输入前提：数据库必须是无活跃写者、无 -wal/-shm/-journal sidecar 的静态一致 DB 或经核验副本。
活跃 WAL、WAL 模式文件头或 hot journal 一律在打开 SQLite 前失败关闭（退出码 2）。
请先停止写者并准备静态副本；本工具不写快照、不做 WAL 恢复。

模式：
  默认 entry     任何 handover pending 都阻断；报告 mode="entry"、drainRequired=false。
  takeover       仅当显式提供 --takeover-freeze-generation 时启用。只允许该 generation 的
                 frozen spool，仍拒绝 hold／dispatching、旧 generation、unknown、queued 等。
                 ready=true 且 drainRequired=true 表示“允许唯一新 Runtime 接管并按既有流程
                 drain 这些 frozen spool”，不表示全部消息已结算；接管后必须 drain 至 pending=0。

参数：
  --database <绝对路径>                已存在的共享业务数据库；以 node:sqlite 只读方式打开。
  --output <绝对路径>                  可选。排他新建 JSON 报告；父目录必须已存在，禁止覆盖。
  --takeover-freeze-generation <n>    可选。显式批准的正整数 freeze generation；出现即 takeover 模式。
  --help                               显示本帮助。

退出码：
  0  ready=true，当前模式门禁通过。
  3  ready=false，存在阻断项（报告仍会输出）。
  2  参数、路径、读取／输入结构错误，或存在 WAL／SHM／hot-journal sidecar；不产生报告文件。

退出码 0 只代表数据库事实通过，不代表进程、文件、Owner 绑定、外部效果或 frozen spool 已结算。`;

function parseArguments(argv) {
  const options = { help: false, database: null, output: null, takeover: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") {
      options.help = true;
      continue;
    }
    if (argument === "--takeover-freeze-generation") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) fail("--takeover-freeze-generation 缺少正整数");
      if (options.takeover !== null) fail("--takeover-freeze-generation 只能指定一次");
      if (!/^[1-9][0-9]*$/u.test(value)) fail("--takeover-freeze-generation 必须是正整数");
      const generation = Number(value);
      if (!Number.isSafeInteger(generation)) fail("--takeover-freeze-generation 必须是安全正整数");
      options.takeover = generation;
      index += 1;
      continue;
    }
    if (argument === "--database" || argument === "--output") {
      const field = argument.slice(2);
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) fail(`${argument} 缺少绝对路径`);
      if (options[field] !== null) fail(`${argument} 只能指定一次`);
      options[field] = value;
      index += 1;
      continue;
    }
    fail(`未知参数：${argument}`);
  }
  if (options.help) return options;
  if (options.database === null) fail("必须指定 --database <绝对路径>");
  for (const field of ["database", "output"]) {
    if (options[field] !== null && !path.isAbsolute(options[field])) fail(`--${field} 必须是绝对路径`);
  }
  return options;
}

function assertExistingFile(file, label) {
  let stats;
  try {
    stats = statSync(file);
  } catch {
    fail(`${label} 不存在：${file}`);
  }
  if (!stats.isFile()) fail(`${label} 必须是普通文件：${file}`);
}

const SQLITE_HEADER = Buffer.from("SQLite format 3\u0000", "latin1");
const SIDECAR_SUFFIXES = ["-wal", "-shm", "-journal"];

/**
 * Read-only opening cannot be proven side-effect-free for WAL or hot-journal databases:
 * a read-only connection to a WAL database may still create/update `-shm`/`-wal`.
 * Guard before SQLite is opened; no fallback to `immutable`, no temp copy.
 */
export function assertStaticDatabase(file) {
  for (const suffix of SIDECAR_SUFFIXES) {
    const sidecar = `${file}${suffix}`;
    if (existsSync(sidecar)) {
      fail(`检测到 ${suffix} sidecar（${sidecar}）：拒绝读取活跃或未收敛的数据库；请先停止写者并准备一致静态副本`);
    }
  }
  let descriptor;
  try {
    descriptor = openSync(file, "r");
    const header = Buffer.alloc(20);
    if (readSync(descriptor, header, 0, 20, 0) >= 20 && header.subarray(0, 16).equals(SQLITE_HEADER)) {
      // Bytes 18/19 are the file format read/write versions; 2 marks WAL mode.
      if (header[18] === 2 || header[19] === 2) {
        fail(`数据库为 WAL 模式（${file}）：只读打开仍可能创建 sidecar；请提供经核验的静态一致副本`);
      }
    }
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
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

/** Narrow CLI. It only reads the supplied DB and optionally creates one output file. */
export function runPreflightCli(argv, { stdout = process.stdout, stderr = process.stderr } = {}) {
  let options;
  try {
    options = parseArguments(argv);
    if (options.help) {
      stdout.write(`${USAGE}\n`);
      return EXIT_READY;
    }
    assertExistingFile(options.database, "--database");
    assertStaticDatabase(options.database);

    let db;
    try {
      db = new DatabaseSync(options.database, { readOnly: true });
      const hostStatus = buildHostStatus({ db, handover: openHostHandover({ db }) });
      const migrationPlan = planMigration(buildMigrationSnapshot({ db }));
      const report = evaluateDatabasePreflight({
        hostStatus,
        migrationPlan,
        expectedFreezeGeneration: options.takeover === null ? undefined : options.takeover,
      });
      const text = `${JSON.stringify(report, null, 2)}\n`;
      if (options.output === null) stdout.write(text);
      else writeExclusive(options.output, text);
      return report.ready ? EXIT_READY : EXIT_NOT_READY;
    } finally {
      db?.close();
    }
  } catch (error) {
    const message = error instanceof PreflightInputError
      ? error.message
      : `预检失败：${error?.message ?? error}`;
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
  process.exitCode = runPreflightCli(process.argv.slice(2));
}
