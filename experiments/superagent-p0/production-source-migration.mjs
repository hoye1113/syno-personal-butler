// P4.3-C: import legacy safety facts into the unified DB and prepare a non-WAL static copy.
// It never reads or writes the legacy SQLite business store, and never migrates old Task/Workflow/Session.
// Old Feishu state contributes only dedupe watermarks; bodies, resources and credentials stay out of every output.
import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  copyFileSync,
  existsSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { FORMAT, openBusinessView } from "../../packages/syno-autoloop/examples/syno-p0/commands.ts";
import { rows } from "../../packages/syno-autoloop/kernel/evolve.ts";
import { commitLatest } from "../../packages/syno-autoloop/kernel/store.ts";
import { inventoryTree } from "./migration-rehearsal.mjs";
import { buildHostStatus, buildMigrationSnapshot } from "./host-operations.mjs";
import { openHostHandover } from "./host-handover.mjs";
import { planMigration } from "./migration-rehearsal.mjs";
import { assertStaticDatabase, evaluateDatabasePreflight } from "./production-handover-preflight.mjs";

export const IMPORT_SCHEMA = "syno-p4-legacy-safety-import-v1";
export const STATIC_COPY_SCHEMA = "syno-p4-static-database-copy-v1";

export const EXIT_OK = 0;
export const EXIT_BLOCKED = 3;
export const EXIT_ERROR = 2;

// Only these four explicitly registered legacy effects may be carried as enabled mappings.
// Anything else is treated as an unregistered external effect and fails closed.
export const REGISTERED_PUBLISHING_EFFECTS = Object.freeze([
  "knowledge.publish",
  "knowledge.publish.wiki",
  "knowledge.publish.images",
  "knowledge.publish.catalog",
]);

export const LEGACY_SAFETY_FIELDS = Object.freeze([
  "activeJobs",
  "activeWorkflows",
  "pendingDecisions",
  "unknownEffects",
  "enabledExternalEffectsWithoutMapping",
]);

export const IMPORT_SCOPE = Object.freeze({
  includes: [
    "legacy Feishu dedupe watermarks",
    "explicit zero legacy safety facts",
    "enabled succeeded versioned publishing mappings",
    "vault Markdown path and SHA-256 inventory",
    "safe Owner binding booleans and app ID",
  ],
  excludes: [
    "legacy Task, Workflow and Session execution",
    "message bodies, resources, ownerOpenId and credentials",
    "running processes, ports, locks and consumer exclusivity",
    "real notification delivery and external effect reconciliation",
  ],
});

const SIDECAR_SUFFIXES = ["-wal", "-shm", "-journal"];
const SQLITE_HEADER = Buffer.from("SQLite format 3\u0000", "latin1");
const MESSAGE_ID_RE = /^[A-Za-z0-9_.:-]{1,200}$/u;
const OWNER_STATUS_KEYS = ["appId", "configured", "ownerBound"];
const REGISTERED_EFFECTS = new Set(REGISTERED_PUBLISHING_EFFECTS);

export class SourceMigrationInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "SourceMigrationInputError";
    this.code = "P43C_SOURCE_MIGRATION_INPUT_INVALID";
  }
}

class ImportConflictError extends Error {
  constructor(code, detail) {
    super(detail);
    this.name = "ImportConflictError";
    this.code = code;
  }
}

function fail(message) {
  throw new SourceMigrationInputError(message);
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
  if (typeof value !== "string" || !value.trim()) fail(`${label} 必须是非空字符串`);
  return value;
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256File(file) {
  return sha256Bytes(readFileSync(file));
}

function safeMessageId(value, label) {
  const text = stringAt(value, label);
  if (!MESSAGE_ID_RE.test(text)) fail(`${label} 含非法字符`);
  return text;
}

function addCount(map, code, count = 1) {
  if (!Number.isSafeInteger(count) || count <= 0) return;
  map.set(code, (map.get(code) ?? 0) + count);
}

function blockerList(map) {
  return [...map.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => ({ code, count }));
}

function fileHeader(file) {
  let descriptor;
  try {
    descriptor = openSync(file, "r");
    const header = Buffer.alloc(20);
    const read = readSync(descriptor, header, 0, 20, 0);
    if (read < 20) return { sqlite: false, wal: false };
    return {
      sqlite: header.subarray(0, 16).equals(SQLITE_HEADER),
      // Bytes 18/19 are the file format read/write versions; 2 marks WAL mode.
      wal: header[18] === 2 || header[19] === 2,
    };
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function existingSidecars(file) {
  return SIDECAR_SUFFIXES.map((suffix) => `${file}${suffix}`).filter((candidate) => existsSync(candidate));
}

function assertExistingRegularFile(file, label) {
  let stats;
  try {
    stats = statSync(file);
  } catch {
    fail(`${label} 不存在：${file}`);
  }
  if (!stats.isFile()) fail(`${label} 必须是普通文件：${file}`);
}

function readJsonInput(file, label) {
  assertExistingRegularFile(file, label);
  const bytes = readFileSync(file);
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(`${label} 不是合法 JSON：${file}`);
  }
  return { value, bytes, sha256: sha256Bytes(bytes) };
}

// ---------------------------------------------------------------------------
// Input validation. Only safe fields leave these functions.
// ---------------------------------------------------------------------------

export function readLegacyChannelState(file) {
  const { value, sha256 } = readJsonInput(file, "旧 feishu-channel.json");
  objectAt(value, "feishu-channel.json");
  if (value.version !== 1) fail("feishu-channel.json version 必须是 1");
  const rawSeen = arrayAt(value.seenIds, "feishu-channel.json.seenIds");
  const seenIds = [];
  const seen = new Set();
  rawSeen.forEach((raw, index) => {
    const messageId = safeMessageId(raw, `feishu-channel.json.seenIds[${index}]`);
    if (seen.has(messageId)) fail(`feishu-channel.json.seenIds 出现重复 messageId（索引 ${index}）`);
    seen.add(messageId);
    seenIds.push(messageId);
  });
  const rawPending = arrayAt(value.pending, "feishu-channel.json.pending");
  const pending = [];
  const pendingIds = new Set();
  rawPending.forEach((raw, index) => {
    objectAt(raw, `feishu-channel.json.pending[${index}]`);
    const messageId = safeMessageId(raw.messageId, `feishu-channel.json.pending[${index}].messageId`);
    for (const field of ["chatId", "chatType", "senderId", "content", "createdAt"]) {
      if (typeof raw[field] !== "string") fail(`feishu-channel.json.pending[${index}].${field} 必须是字符串`);
    }
    if (pendingIds.has(messageId)) fail(`feishu-channel.json.pending 出现重复 messageId（索引 ${index}）`);
    pendingIds.add(messageId);
    // Resources and content are deliberately dropped here; only identity is needed downstream.
    pending.push({ messageId });
  });
  return {
    version: 1,
    seenIds,
    pending,
    sha256,
    counts: { seenIds: seenIds.length, pending: pending.length },
  };
}

export function validateLegacySafety(value) {
  objectAt(value, "legacySafety");
  const keys = Object.keys(value).sort();
  const expected = [...LEGACY_SAFETY_FIELDS].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    fail(`legacySafety 字段必须精确为 ${LEGACY_SAFETY_FIELDS.join("、")}`);
  }
  const safety = {};
  for (const field of LEGACY_SAFETY_FIELDS) {
    if (!Number.isSafeInteger(value[field]) || value[field] < 0) {
      fail(`legacySafety.${field} 必须是非负整数`);
    }
    safety[field] = value[field];
  }
  return safety;
}

function legacySafetyBlockers(safety, blockers) {
  for (const field of LEGACY_SAFETY_FIELDS) {
    if (safety[field] !== 0) addCount(blockers, `legacy_safety_${field.replace(/[A-Z]/gu, (letter) => `_${letter.toLowerCase()}`)}`, safety[field]);
  }
}

function mappingText(value, label) {
  const text = stringAt(value, label);
  if (text.length > 200 || /[\u0000-\u001f\u007f]/u.test(text)) fail(`${label} 含非法字符`);
  return text;
}

/**
 * Enabled mappings are carried only when they are explicit, succeeded, versioned and registered.
 * Disabled entries are ignored, never treated as blockers. Malformed enabled entries become blockers so
 * the caller can report them without importing a partial set.
 */
export function validatePublishingMappings(value) {
  let rawMappings;
  if (Array.isArray(value)) rawMappings = value;
  else {
    objectAt(value, "mappings");
    rawMappings = arrayAt(value.mappings, "mappings.mappings");
  }
  const blockers = new Map();
  const enabled = [];
  const seen = new Set();
  let disabled = 0;
  rawMappings.forEach((raw, index) => {
    objectAt(raw, `mappings[${index}]`);
    if (raw.enabled === false) {
      disabled += 1;
      return;
    }
    if (raw.enabled !== true) {
      addCount(blockers, "mapping_enabled_invalid");
      return;
    }
    let valid = true;
    const require = (condition, code) => {
      if (condition) return;
      addCount(blockers, code);
      valid = false;
    };
    require(typeof raw.id === "string" && raw.id.trim() && raw.id.length <= 200, "mapping_id_missing");
    require(typeof raw.objectId === "string" && raw.objectId.trim() && raw.objectId.length <= 200, "mapping_object_id_missing");
    require(raw.state === "succeeded", "mapping_state_not_succeeded");
    require(Number.isSafeInteger(raw.version) && raw.version >= 1, "mapping_version_invalid");
    require(typeof raw.effect === "string" && REGISTERED_EFFECTS.has(raw.effect), "mapping_effect_unregistered");
    if (!valid) return;
    const id = mappingText(raw.id, `mappings[${index}].id`);
    const objectId = mappingText(raw.objectId, `mappings[${index}].objectId`);
    if (seen.has(id)) {
      addCount(blockers, "mapping_duplicate_id");
      return;
    }
    seen.add(id);
    enabled.push({
      id,
      objectId,
      effect: raw.effect,
      state: "succeeded",
      version: raw.version,
    });
  });
  return { enabled, disabled, blockers };
}

/** Extra keys are a structural error; missing or unsatisfied owner facts are business blockers. */
export function validateSafeOwnerStatus(value) {
  objectAt(value, "ownerStatus");
  const keys = Object.keys(value).sort();
  if (keys.some((key) => !OWNER_STATUS_KEYS.includes(key))) {
    fail("ownerStatus 只能包含 configured、ownerBound、appId");
  }
  const blockers = new Map();
  for (const field of OWNER_STATUS_KEYS) {
    if (!Object.hasOwn(value, field)) {
      addCount(blockers, "owner_status_incomplete");
      continue;
    }
  }
  if (Object.hasOwn(value, "configured") && typeof value.configured !== "boolean") {
    fail("ownerStatus.configured 必须是布尔值");
  }
  if (Object.hasOwn(value, "ownerBound") && typeof value.ownerBound !== "boolean") {
    fail("ownerStatus.ownerBound 必须是布尔值");
  }
  if (Object.hasOwn(value, "appId") && typeof value.appId !== "string") {
    fail("ownerStatus.appId 必须是字符串");
  }
  const owner = {
    configured: value.configured === true,
    ownerBound: value.ownerBound === true,
    appId: typeof value.appId === "string" ? value.appId : null,
  };
  if (!owner.configured) addCount(blockers, "owner_not_configured");
  if (!owner.ownerBound) addCount(blockers, "owner_not_bound");
  return { owner, blockers };
}

function ownerBindingBlockers(ownerStatus, appId, blockers) {
  const { owner, blockers: ownerBlockers } = validateSafeOwnerStatus(ownerStatus);
  for (const [code, count] of ownerBlockers) addCount(blockers, code, count);
  if (owner.appId !== appId) addCount(blockers, "owner_app_id_mismatch");
  return owner;
}

export function inventoryVault(root) {
  let stats;
  try {
    stats = statSync(root);
  } catch {
    fail(`vault 不存在：${root}`);
  }
  if (!stats.isDirectory()) fail(`vault 必须是目录：${root}`);
  let tree;
  try {
    tree = inventoryTree(root);
  } catch (error) {
    // inventoryTree rejects symlinks and non-regular entries before hashing any content.
    const message = String(error?.message ?? "");
    const blocker = message.includes("符号链接") ? "vault_symlink" : "vault_non_regular_file";
    return { files: [], blockers: new Map([[blocker, 1]]) };
  }
  const files = tree
    .filter((entry) => /\.(?:md|markdown)$/iu.test(entry.path))
    .map((entry) => ({ path: entry.path, sha256: entry.sha256 }));
  return { files, blockers: new Map() };
}

function sameInventory(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

function handoverPreflight(db, now) {
  const handover = openHostHandover({ db, now });
  const status = handover.status();
  const base = {
    frozen: status.frozen === true,
    generation: Number.isSafeInteger(status.generation) ? status.generation : null,
    spoolCounts: {
      frozen: status.spool.counts.frozen,
      dispatching: status.spool.counts.dispatching,
      forwarded: status.spool.counts.forwarded,
      hold: status.spool.counts.hold,
    },
    blockers: new Map(),
  };
  if (!base.frozen) {
    addCount(base.blockers, "handover_not_frozen");
    return { ...base, preflight: null };
  }
  const hostStatus = buildHostStatus({ db, now, handover });
  const migrationPlan = planMigration(buildMigrationSnapshot({ db }));
  const preflight = evaluateDatabasePreflight({
    hostStatus,
    migrationPlan,
    expectedFreezeGeneration: base.generation,
  });
  for (const blocker of preflight.blockers) addCount(base.blockers, blocker.code, blocker.count);
  return { ...base, preflight };
}

function spoolRows(db) {
  return rows(openBusinessView(db), "records").filter((row) => row.kind === "handover_spool");
}

function planPending(pending, spools, generation, appId, blockers, counts) {
  const byMessage = new Map();
  for (const spool of spools) {
    if (typeof spool.messageId !== "string") continue;
    const list = byMessage.get(spool.messageId) ?? [];
    list.push(spool);
    byMessage.set(spool.messageId, list);
  }
  let carried = 0;
  let blocked = 0;
  for (const item of pending) {
    const candidates = byMessage.get(item.messageId) ?? [];
    const match = candidates.find((spool) => spool.appId === appId);
    if (!match) {
      blocked += 1;
      addCount(blockers, "pending_without_frozen_spool");
      continue;
    }
    if (match.state !== "frozen") {
      blocked += 1;
      addCount(blockers, "pending_spool_not_frozen");
      continue;
    }
    if (match.freezeGeneration !== generation) {
      blocked += 1;
      addCount(blockers, "pending_spool_generation_mismatch");
      continue;
    }
    carried += 1;
  }
  counts.carriedPendingCount = carried;
  counts.blockedPendingCount = blocked;
}

function inboxKey(appId, messageId) {
  return `inbox:${JSON.stringify([appId, messageId])}`;
}

function mappingKey(appId, id) {
  return `publishing_mapping:${JSON.stringify([appId, id])}`;
}

function planInboxes({ db, appId, seenIds, spools, blockers, counts }) {
  const view = openBusinessView(db);
  const excluded = new Set(spools.map((spool) => spool.messageId).filter((id) => typeof id === "string"));
  const toImport = [];
  let alreadyPresent = 0;
  let excludedSpool = 0;
  for (const messageId of seenIds) {
    const key = inboxKey(appId, messageId);
    const existing = view.get("records", key);
    if (excluded.has(messageId)) {
      excludedSpool += 1;
      if (existing && (existing.kind !== "inbox" || existing.app_id !== appId || existing.id !== messageId)) {
        addCount(blockers, "inbox_conflict");
      }
      continue;
    }
    if (existing) {
      if (existing.kind !== "inbox" || existing.app_id !== appId || existing.id !== messageId) {
        addCount(blockers, "inbox_conflict");
      } else {
        alreadyPresent += 1;
      }
      continue;
    }
    toImport.push({ key, messageId });
  }
  counts.seenImported = toImport.length;
  counts.seenAlreadyPresent = alreadyPresent;
  counts.seenExcludedSpool = excludedSpool;
  return toImport;
}

function planMappings({ db, appId, mappings, blockers, counts }) {
  const view = openBusinessView(db);
  const toImport = [];
  let duplicate = 0;
  for (const mapping of mappings) {
    const key = mappingKey(appId, mapping.id);
    const existing = view.get("records", key);
    if (!existing) {
      toImport.push({ key, mapping });
      continue;
    }
    const same = existing.kind === "publishing_mapping"
      && existing.id === mapping.id
      && existing.objectId === mapping.objectId
      && existing.appId === appId
      && existing.enabled === true
      && existing.state === "succeeded"
      && existing.version === mapping.version
      && existing.effect === mapping.effect;
    if (same) duplicate += 1;
    else addCount(blockers, "publishing_mapping_conflict");
  }
  counts.mappingsImported = toImport.length;
  counts.mappingsDuplicate = duplicate;
  return toImport;
}

function recordChange(key, row) {
  return { table: "records", key, row };
}

function produceImportChanges(view, { appId, inboxPlan, mappingPlan, now }) {
  const changes = [];
  for (const item of inboxPlan) {
    const prior = view.get("records", item.key);
    if (prior) {
      if (prior.kind !== "inbox" || prior.app_id !== appId || prior.id !== item.messageId) {
        throw new ImportConflictError("inbox_conflict", "inbox 冲突");
      }
      continue;
    }
    const row = {
      key: item.key,
      kind: "inbox",
      id: item.messageId,
      app_id: appId,
      receipt: { contextId: "legacy:dedupe", version: 1, legacyDedupe: true },
      importedAt: now,
    };
    changes.push(recordChange(item.key, row));
  }
  for (const item of mappingPlan) {
    const prior = view.get("records", item.key);
    const mapping = item.mapping;
    if (prior) {
      const same = prior.kind === "publishing_mapping"
        && prior.id === mapping.id
        && prior.objectId === mapping.objectId
        && prior.appId === appId
        && prior.enabled === true
        && prior.state === "succeeded"
        && prior.version === mapping.version
        && prior.effect === mapping.effect;
      if (!same) throw new ImportConflictError("publishing_mapping_conflict", "发布映射冲突");
      continue;
    }
    const row = {
      key: item.key,
      kind: "publishing_mapping",
      id: mapping.id,
      objectId: mapping.objectId,
      appId,
      effect: mapping.effect,
      enabled: true,
      state: "succeeded",
      version: mapping.version,
      legacyMapping: true,
      importedAt: now,
    };
    changes.push(recordChange(item.key, row));
  }
  return changes;
}

/**
 * Import only the safe legacy facts. All inputs and hashes are validated before the write transaction.
 * The returned report contains counts, identities, hashes and blocker codes; never bodies, resources,
 * ownerOpenId or secrets.
 */
export function importLegacySafetyFacts({
  db,
  stateFile,
  appId,
  legacySafety,
  mappings,
  now = () => Date.now(),
  vaultRoot = null,
  ownerStatus = null,
  databasePath = null,
}) {
  if (!db) fail("必须提供已打开的统一 DB");
  assertAbsolute(stateFile, "--state");
  if (vaultRoot !== null) assertAbsolute(vaultRoot, "--vault");
  const app = stringAt(appId, "appId");
  if (app.length > 200) fail("appId 过长");
  const at = now();
  const blockers = new Map();
  const counts = {};

  const state = readLegacyChannelState(stateFile);
  const safety = validateLegacySafety(legacySafety);
  legacySafetyBlockers(safety, blockers);
  const mappingResult = validatePublishingMappings(mappings);
  for (const [code, count] of mappingResult.blockers) addCount(blockers, code, count);
  counts.mappingsDisabled = mappingResult.disabled;

  let owner = null;
  if (ownerStatus !== null) owner = ownerBindingBlockers(ownerStatus, app, blockers);

  let vault = null;
  let vaultInventory = null;
  if (vaultRoot !== null) {
    const beforeInventory = inventoryVault(vaultRoot);
    for (const [code, count] of beforeInventory.blockers) addCount(blockers, code, count);
    vaultInventory = beforeInventory.files;
    vault = { root: vaultRoot, fileCount: vaultInventory.length, files: vaultInventory };
  }

  const databaseFile = databasePath !== null ? assertAbsolute(databasePath, "--database") : databaseFrom(db);
  const databaseSha256Before = databaseSha(databaseFile);
  const handover = handoverPreflight(db, now);
  for (const [code, count] of handover.blockers) addCount(blockers, code, count);

  const spools = spoolRows(db);
  const knownSpoolStates = new Set(["frozen", "dispatching", "forwarded", "hold"]);
  for (const spool of spools) {
    if (typeof spool.messageId !== "string" || !spool.messageId) addCount(blockers, "handover_spool_invalid");
    else if (!knownSpoolStates.has(spool.state)) addCount(blockers, "handover_spool_state_unknown");
  }
  if (handover.generation !== null) {
    planPending(state.pending, spools, handover.generation, app, blockers, counts);
  } else {
    counts.carriedPendingCount = 0;
    counts.blockedPendingCount = state.pending.length;
    if (state.pending.length) addCount(blockers, "pending_without_frozen_spool", state.pending.length);
  }
  const inboxPlan = planInboxes({ db, appId: app, seenIds: state.seenIds, spools, blockers, counts });
  const mappingPlan = planMappings({
    db,
    appId: app,
    mappings: mappingResult.enabled,
    blockers,
    counts,
  });

  if (blockers.size) {
    return blockedImportReport({
      app, state, safety, handover, vault, owner, counts, blockers, databaseSha256Before,
    });
  }

  // Re-read the source and the vault immediately before the write transaction. A change here means the
  // window is not stable and must fail closed before any fact is appended.
  const recheck = readLegacyChannelState(stateFile);
  if (recheck.sha256 !== state.sha256) {
    addCount(blockers, "legacy_state_changed_before_import");
    return blockedImportReport({
      app, state, safety, handover, vault, owner, counts, blockers, databaseSha256Before,
    });
  }
  if (vaultInventory !== null) {
    const recheckVault = inventoryVault(vaultRoot);
    if (recheckVault.blockers.size || !sameInventory(recheckVault.files, vaultInventory)) {
      addCount(blockers, "vault_changed_before_import");
      return blockedImportReport({
        app, state, safety, handover, vault, owner, counts, blockers, databaseSha256Before,
      });
    }
  }

  let conflict = null;
  try {
    db.exec("BEGIN IMMEDIATE");
    try {
      const controlRow = openBusinessView(db).get("records", "handover:control");
      if (controlRow?.frozen !== true || controlRow.generation !== handover.generation) {
        throw new ImportConflictError("handover_changed_before_import", "handover 在导入前发生变化");
      }
      commitLatest(db, FORMAT, (view) => {
        const changes = produceImportChanges(view, {
          appId: app,
          inboxPlan,
          mappingPlan,
          now: at,
        });
        if (!changes.length) return [];
        return [{ version: 1, seq: view.seq + 1, at, type: "syno.legacy_safety_import", changes }];
      });
      db.exec("COMMIT");
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK");
      throw error;
    }
  } catch (error) {
    if (!(error instanceof ImportConflictError)) throw error;
    conflict = error;
    addCount(blockers, error.code);
  }

  if (conflict) {
    return blockedImportReport({
      app, state, safety, handover, vault, owner, counts, blockers, databaseSha256Before,
    });
  }

  let sourceShaAfter = state.sha256;
  try {
    sourceShaAfter = sha256File(stateFile);
  } catch {
    addCount(blockers, "legacy_state_unreadable_after_import");
  }
  if (sourceShaAfter !== state.sha256) addCount(blockers, "legacy_state_changed_during_import");
  if (vaultInventory !== null) {
    const afterVault = inventoryVault(vaultRoot);
    if (afterVault.blockers.size || !sameInventory(afterVault.files, vaultInventory)) {
      addCount(blockers, "vault_changed_during_import");
    }
  }

  // WAL is expected: freshly committed rows may still live in the -wal file, so this hash can legitimately
  // equal `databaseSha256Before`. No checkpoint is forced here; the CLI re-reads the closed file for `after`.
  return {
    schema: IMPORT_SCHEMA,
    scope: IMPORT_SCOPE,
    ok: blockers.size === 0,
    appId: app,
    sourceSha256: state.sha256,
    databaseSha256Before,
    databaseSha256After: databaseSha(databaseFile),
    state: {
      version: state.version,
      seenIds: state.counts.seenIds,
      pending: state.counts.pending,
      sha256: state.sha256,
    },
    safety,
    handover: {
      frozen: handover.frozen,
      generation: handover.generation,
      spoolCounts: handover.spoolCounts,
      carriedPendingCount: counts.carriedPendingCount ?? 0,
      blockedPendingCount: counts.blockedPendingCount ?? 0,
    },
    vault,
    owner,
    counts,
    actionCounts: {
      dedupe_only: counts.seenImported ?? 0,
      mapping_only: counts.mappingsImported ?? 0,
    },
    blockers: blockerList(blockers),
  };
}

// The `db` handle does not expose its file. Callers with an absolute DB path (the CLI, and tests that need a
// verifiable baseline) pass `databasePath`; pure callers may hash nothing and get null.
function databaseFrom(db) {
  if (typeof db.location === "function") return db.location();
  if (typeof db.filename === "string") return db.filename;
  return null;
}

function databaseSha(file) {
  return typeof file === "string" && file ? sha256File(file) : null;
}

function blockedImportReport({ app, state, safety, handover, vault, owner, counts, blockers, databaseSha256Before }) {
  return {
    schema: IMPORT_SCHEMA,
    scope: IMPORT_SCOPE,
    ok: false,
    appId: app,
    sourceSha256: state.sha256,
    databaseSha256Before,
    state: { version: state.version, ...state.counts, sha256: state.sha256 },
    safety,
    handover: {
      frozen: handover.frozen,
      generation: handover.generation,
      spoolCounts: handover.spoolCounts,
      carriedPendingCount: counts.carriedPendingCount ?? 0,
      blockedPendingCount: counts.blockedPendingCount ?? 0,
    },
    vault,
    owner,
    // Nothing was written; planned imports are deliberately not reported as imported.
    counts: { ...counts, seenImported: 0, mappingsImported: 0 },
    actionCounts: { dedupe_only: 0, mapping_only: 0 },
    blockers: blockerList(blockers),
  };
}

// ---------------------------------------------------------------------------
// Static copy
// ---------------------------------------------------------------------------

function assertAbsolute(file, label) {
  if (typeof file !== "string" || !path.isAbsolute(file)) fail(`${label} 必须是绝对路径`);
  return file;
}

/**
 * Copy a stopped-writer database to a fresh target and convert it to a non-WAL, integrity-checked file.
 * The source is never opened or modified; sidecars are refused. A failure leaves the copied scene intact.
 */
export function prepareStaticDatabaseCopy({ source, target }) {
  assertAbsolute(source, "--source");
  assertAbsolute(target, "--target");
  assertExistingRegularFile(source, "--source");
  const sourceHeader = fileHeader(source);
  if (!sourceHeader.sqlite) fail("--source 不是 SQLite 数据库");
  if (path.resolve(source) === path.resolve(target)) fail("--target 不得与 --source 相同");
  if (SIDECAR_SUFFIXES.some((suffix) => path.resolve(target) === `${path.resolve(source)}${suffix}`)) {
    fail("--target 不得使用 --source 的 sidecar 路径");
  }
  if (path.resolve(target).startsWith(`${path.resolve(source)}${path.sep}`)
    || path.resolve(source).startsWith(`${path.resolve(target)}${path.sep}`)) {
    fail("--source 与 --target 不得互相包含");
  }
  if (existsSync(target)) fail(`--target 已存在，禁止覆盖：${target}`);
  const parent = path.dirname(target);
  let parentStats;
  try {
    parentStats = statSync(parent);
  } catch {
    fail(`--target 父目录不存在：${parent}`);
  }
  if (!parentStats.isDirectory()) fail(`--target 父目录不是目录：${parent}`);

  const blockers = new Map();
  const sidecars = existingSidecars(source);
  if (sidecars.length) {
    addCount(blockers, "source_sidecar", sidecars.length);
    return staticCopyReport({
      ok: false,
      source,
      target,
      blockers,
      sourceSha256Before: null,
      sourceSha256After: null,
      targetSha256: null,
      sourceHeader,
      targetHeader: null,
      integrity: null,
      firstError: "source_sidecar",
    });
  }

  const sourceSha256Before = sha256File(source);
  try {
    copyFileSync(source, target, fsConstants.COPYFILE_EXCL);
  } catch (error) {
    if (error?.code === "EEXIST") fail(`--target 已存在，禁止覆盖：${target}`);
    throw error;
  }

  let sourceSha256After = sourceSha256Before;
  try {
    sourceSha256After = sha256File(source);
  } catch {
    addCount(blockers, "source_unreadable_after_copy");
  }
  if (sourceSha256After !== sourceSha256Before) addCount(blockers, "source_hash_changed");

  let integrity = null;
  let targetHeader = null;
  let firstError = null;
  let db;
  try {
    db = new DatabaseSync(target);
    const journalMode = db.prepare("PRAGMA journal_mode=DELETE").get();
    const mode = journalMode?.journal_mode ?? journalMode?.journal_mode;
    integrity = db.prepare("PRAGMA integrity_check").all().map((row) => row.integrity_check);
    if (!Array.isArray(integrity) || integrity.length !== 1 || integrity[0] !== "ok") {
      addCount(blockers, "target_integrity_failed");
      firstError = "target_integrity_failed";
    } else if (mode !== "delete") {
      addCount(blockers, "target_journal_mode_not_delete");
      firstError = "target_journal_mode_not_delete";
    }
  } catch {
    // Keep the copied scene exactly as it failed; only the stable code is reported.
    addCount(blockers, "target_integrity_failed");
    firstError = "target_integrity_failed";
  } finally {
    try { db?.close(); } catch { /* preserve the first error */ }
  }

  targetHeader = fileHeader(target);
  const targetSidecars = existingSidecars(target);
  if (targetSidecars.length) addCount(blockers, "target_sidecar", targetSidecars.length);
  if (targetHeader.wal) addCount(blockers, "target_wal_header");
  if (!firstError && blockers.size) firstError = blockerList(blockers)[0].code;
  if (!blockers.size) {
    try {
      assertStaticDatabase(target);
    } catch {
      addCount(blockers, "target_not_static");
      firstError = "target_not_static";
    }
  }
  const targetSha256 = existsSync(target) ? sha256File(target) : null;
  return staticCopyReport({
    ok: blockers.size === 0,
    source,
    target,
    blockers,
    sourceSha256Before,
    sourceSha256After,
    targetSha256,
    sourceHeader,
    targetHeader,
    integrity,
    firstError,
  });
}

function staticCopyReport({
  ok, source, target, blockers, sourceSha256Before, sourceSha256After, targetSha256,
  sourceHeader, targetHeader, integrity, firstError,
}) {
  return {
    schema: STATIC_COPY_SCHEMA,
    ok,
    source: {
      path: source,
      sha256Before: sourceSha256Before,
      sha256After: sourceSha256After,
      walHeader: sourceHeader?.wal ?? null,
      sidecars: existingSidecars(source),
    },
    target: {
      path: target,
      sha256: targetSha256,
      walHeader: targetHeader?.wal ?? null,
      sidecars: existingSidecars(target),
      integrity,
    },
    files: [source, target]
      .filter((file) => typeof file === "string")
      .map((file) => ({ path: file, sha256: file === source ? sourceSha256After : targetSha256, exists: existsSync(file) })),
    firstError,
    blockers: blockerList(blockers),
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE = `用法：
  node production-source-migration.mjs import --database <绝对路径> --state <绝对路径> --app-id <appId> \\
       --safety <绝对路径> --mappings <绝对路径> --vault <绝对路径> --owner-status <绝对路径> --output <绝对路径>
  node production-source-migration.mjs static-copy --source <绝对路径> --target <绝对路径> --output <绝对路径>

import 只把旧 Feishu 去重水位、显式安全清单和已启用映射写入统一 DB；不导入旧 Task／Workflow／Session，
不读取或输出正文、ownerOpenId、Token 或 Secret。所有输入与哈希在写事务前核验。
static-copy 只复制已停止写者的 DB 到排他新建 target，并转换为非 WAL、通过 integrity_check 的静态副本；
不修改 source，不覆盖 target。

退出码：
  0  成功。
  3  业务阻断（报告中包含 blocker codes；报告仍排他输出）。
  2  参数、路径、读取或结构错误；不产生 output 文件。

所有路径必须是绝对路径；--output 使用 wx 排他新建，父目录必须已存在。`;

function parseArguments(argv) {
  if (argv.length === 1 && argv[0] === "--help") return { help: true };
  const [command, ...rest] = argv;
  if (command !== "import" && command !== "static-copy") {
    fail("子命令必须是 import 或 static-copy（或单独使用 --help）");
  }
  const allowed = command === "import"
    ? new Set(["--database", "--state", "--app-id", "--safety", "--mappings", "--vault", "--owner-status", "--output"])
    : new Set(["--source", "--target", "--output"]);
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (!allowed.has(argument)) fail(`未知参数：${argument}`);
    const field = argument.slice(2);
    if (Object.hasOwn(options, field)) fail(`${argument} 只能指定一次`);
    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`${argument} 缺少值`);
    options[field] = value;
    index += 1;
  }
  const required = command === "import"
    ? ["database", "state", "app-id", "safety", "mappings", "vault", "owner-status", "output"]
    : ["source", "target", "output"];
  for (const field of required) if (!options[field]) fail(`缺少 --${field}`);
  for (const field of Object.keys(options)) {
    if (field === "app-id") continue;
    if (!path.isAbsolute(options[field])) fail(`--${field} 必须是绝对路径`);
  }
  if (command === "import" && !options["app-id"].trim()) fail("--app-id 必须是非空字符串");
  return { help: false, command, options };
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

function writeReport(output, report) {
  writeExclusive(output, `${JSON.stringify(report, null, 2)}\n`);
}

function ensureOutputAvailable(output) {
  // Check before any DB mutation; the final write still uses `wx` to close the race.
  if (existsSync(output)) fail(`--output 已存在，禁止覆盖：${output}`);
  const parent = path.dirname(output);
  let parentStats;
  try {
    parentStats = statSync(parent);
  } catch {
    fail(`--output 父目录不存在：${parent}`);
  }
  if (!parentStats.isDirectory()) fail(`--output 父目录不是目录：${parent}`);
}

function openWritableDatabase(file) {
  assertExistingRegularFile(file, "--database");
  const db = new DatabaseSync(file);
  // The unified DB is shared with the new Runtime; WAL is expected. Only the write transaction is guarded.
  db.exec("PRAGMA busy_timeout=5000;");
  return db;
}

export function runSourceMigrationCli(argv, { stdout = process.stdout, stderr = process.stderr } = {}) {
  let options;
  try {
    const parsed = parseArguments(argv);
    if (parsed.help) {
      stdout.write(`${USAGE}\n`);
      return EXIT_OK;
    }
    options = parsed.options;
    ensureOutputAvailable(options.output);

    if (parsed.command === "static-copy") {
      for (const field of ["source", "target"]) {
        if (path.resolve(options.output) === path.resolve(options[field])) {
          fail(`--output 不得与 --${field} 相同`);
        }
      }
      const report = prepareStaticDatabaseCopy({ source: options.source, target: options.target });
      writeReport(options.output, report);
      if (!report.ok) {
        stderr.write(`static-copy blocked: ${report.blockers.map((blocker) => blocker.code).join(",")}\n`);
        return EXIT_BLOCKED;
      }
      stdout.write(`${JSON.stringify({
        schema: report.schema,
        ok: report.ok,
        sourceSha256: report.source.sha256After,
        targetSha256: report.target.sha256,
        output: options.output,
      })}\n`);
      return EXIT_OK;
    }

    const database = options.database;
    readLegacyChannelState(options.state);
    const safety = validateLegacySafety(readJsonInput(options.safety, "--safety").value);
    const mappings = readJsonInput(options.mappings, "--mappings").value;
    validatePublishingMappings(mappings);
    const ownerStatus = readJsonInput(options["owner-status"], "--owner-status").value;
    inventoryVault(options.vault);
    // Validate owner shape and vault structure before opening the DB; the import redoes this as part of
    // its pre-transaction checks so pure callers get the same guarantees.
    validateSafeOwnerStatus(ownerStatus);

    const db = openWritableDatabase(database);
    let report;
    try {
      report = importLegacySafetyFacts({
        db,
        databasePath: database,
        stateFile: options.state,
        appId: options["app-id"],
        legacySafety: safety,
        mappings: mappings,
        now: () => Date.now(),
        vaultRoot: options.vault,
        ownerStatus,
      });
    } finally {
      db.close();
    }
    // The connection is closed (WAL checkpointed) before reporting, so `after` is the exact artifact on disk.
    report.databaseSha256After = sha256File(database);
    writeReport(options.output, report);
    if (!report.ok) {
      stderr.write(`import blocked: ${report.blockers.map((blocker) => blocker.code).join(",")}\n`);
      return EXIT_BLOCKED;
    }
    stdout.write(`${JSON.stringify({
      schema: report.schema,
      ok: report.ok,
      sourceSha256: report.sourceSha256,
      databaseSha256: report.databaseSha256After,
      actionCounts: report.actionCounts,
      output: options.output,
    })}\n`);
    return EXIT_OK;
  } catch (error) {
    const message = error instanceof SourceMigrationInputError
      ? error.message
      : `迁移失败：${error?.message ?? error}`;
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
  process.exitCode = runSourceMigrationCli(process.argv.slice(2));
}
