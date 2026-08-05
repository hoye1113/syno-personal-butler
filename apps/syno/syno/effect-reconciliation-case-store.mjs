import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { ProcessFileLock } from "./process-lock.mjs";
import { PATHS } from "./paths.mjs";

const EFFECT_CASE_VERSION = 1;

async function atomicWrite(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, value, { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
  await fs.chmod(file, 0o600).catch(() => {});
}

function caseKey(toolInvocationKey) { return createHash("sha256").update(String(toolInvocationKey), "utf8").digest("hex"); }
function metadataFile(root, key) { return path.join(root, `${key}.json`); }

class EffectReconciliationCaseStore {
  constructor({ root = path.join(PATHS.stateRoot, "effect-cases"), lockFile = path.join(PATHS.stateRoot, "locks", "effect-cases.lock"), leaseMs = 5 * 60 * 1_000, clock = () => new Date(), processLock, maxAttempts = 8 } = {}) {
    this.root = path.resolve(root);
    this.leaseMs = Math.max(30_000, Number(leaseMs) || 5 * 60 * 1_000);
    this.clock = clock;
    this.processLock = processLock || new ProcessFileLock({ file: lockFile, timeoutMs: 30_000 });
    this.maxAttempts = Math.max(1, Number(maxAttempts) || 8);
  }

  async #ensureRoot() { await fs.mkdir(this.root, { recursive: true }); }
  async #readUnlocked(key) {
    try { return JSON.parse(await fs.readFile(metadataFile(this.root, key), "utf8")); }
    catch (error) { if (error.code === "ENOENT") return null; throw error; }
  }
  async #updateUnlocked(key, patch) {
    const current = await this.#readUnlocked(key);
    if (!current) throw Object.assign(new Error("Unknown Case 不存在"), { code: "EFFECT_CASE_NOT_FOUND" });
    const next = { ...current, ...patch, caseId: current.caseId, version: EFFECT_CASE_VERSION, updatedAt: this.clock().toISOString() };
    await atomicWrite(metadataFile(this.root, key), `${JSON.stringify(next, null, 2)}\n`);
    return next;
  }

  async open({ toolInvocationKey, toolName, ownerKey = "local-user", sourceType = "tool", sourceId = null, lastErrorCode = "EFFECT_UNKNOWN" } = {}) {
    if (!toolInvocationKey || !toolName) throw new Error("Unknown Case 缺少 toolInvocationKey/toolName");
    const key = caseKey(toolInvocationKey);
    return this.processLock.run(async () => {
      await this.#ensureRoot();
      const existing = await this.#readUnlocked(key);
      if (existing) return { created: false, case: existing };
      const now = this.clock().toISOString();
      const record = {
        version: EFFECT_CASE_VERSION,
        caseId: `case-${key.slice(0, 24)}`,
        ownerKey: String(ownerKey || "local-user"),
        toolInvocationKey: String(toolInvocationKey),
        toolName: String(toolName),
        sourceType: String(sourceType || "tool"),
        sourceId: sourceId ? String(sourceId) : null,
        status: "open",
        attempts: 0,
        failureCount: 0,
        nextReconcileAt: now,
        claim: null,
        lastErrorCode: String(lastErrorCode || "EFFECT_UNKNOWN"),
        ownerResolution: null,
        systemResolution: null,
        createdAt: now,
        updatedAt: now,
      };
      await atomicWrite(metadataFile(this.root, key), `${JSON.stringify(record, null, 2)}\n`);
      return { created: true, case: record };
    });
  }

  async get(caseIdOrInvocation) {
    const key = String(caseIdOrInvocation || "").startsWith("case-")
      ? String(caseIdOrInvocation).slice("case-".length)
      : caseKey(caseIdOrInvocation);
    // caseId contains only a prefix for display; resolve the full filename by scanning if necessary.
    if (key.length !== 64) {
      const records = await this.list({ limit: 10_000 });
      return records.find((item) => item.caseId === caseIdOrInvocation) || null;
    }
    return this.#readUnlocked(key);
  }

  async list({ status, ownerKey, limit = 100 } = {}) {
    await this.#ensureRoot();
    const names = (await fs.readdir(this.root)).filter((name) => name.endsWith(".json"));
    const records = [];
    for (const name of names) {
      try {
        const record = JSON.parse(await fs.readFile(path.join(this.root, name), "utf8"));
        if (record?.version === EFFECT_CASE_VERSION && (!status || record.status === status) && (!ownerKey || record.ownerKey === ownerKey)) records.push(record);
      } catch {}
    }
    return records.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))).slice(-Math.max(1, Number(limit) || 100));
  }

  async claim(caseIdOrInvocation, { workerId = `worker-${process.pid}`, now = this.clock() } = {}) {
    return this.processLock.run(async () => {
      const current = await this.get(caseIdOrInvocation);
      if (!current) throw Object.assign(new Error("Unknown Case 不存在"), { code: "EFFECT_CASE_NOT_FOUND" });
      const active = current.claim && new Date(current.claim.leaseExpiresAt).getTime() > new Date(now).getTime();
      const due = !current.nextReconcileAt || new Date(current.nextReconcileAt).getTime() <= new Date(now).getTime();
      if (active || !due || current.status !== "open") return { claimed: false, case: current };
      const claim = { workerId: String(workerId), claimedAt: new Date(now).toISOString(), leaseExpiresAt: new Date(new Date(now).getTime() + this.leaseMs).toISOString() };
      return { claimed: true, case: await this.#updateUnlocked(caseKey(current.toolInvocationKey), { status: "claimed", claim, attempts: Number(current.attempts || 0) + 1 }) };
    });
  }

  async renewClaim(caseIdOrInvocation, { workerId, now = this.clock() } = {}) {
    return this.processLock.run(async () => {
      const current = await this.get(caseIdOrInvocation);
      if (!current || current.status !== "claimed" || current.claim?.workerId !== workerId) return { renewed: false, case: current };
      const claim = { ...current.claim, leaseExpiresAt: new Date(new Date(now).getTime() + this.leaseMs).toISOString() };
      return { renewed: true, case: await this.#updateUnlocked(caseKey(current.toolInvocationKey), { claim }) };
    });
  }

  async resolveSystem(caseIdOrInvocation, resolution = {}) {
    return this.processLock.run(async () => {
      const current = await this.get(caseIdOrInvocation);
      return this.#updateUnlocked(caseKey(current.toolInvocationKey), { status: "resolved", claim: null, systemResolution: { source: "system", ...resolution, resolvedAt: resolution.resolvedAt || this.clock().toISOString() } });
    });
  }

  async resolveOwner(caseIdOrInvocation, resolution = {}) {
    return this.processLock.run(async () => {
      const current = await this.get(caseIdOrInvocation);
      return this.#updateUnlocked(caseKey(current.toolInvocationKey), { status: current.status === "claimed" ? "open" : current.status, claim: null, ownerResolution: { source: "owner", ...resolution, resolvedAt: resolution.resolvedAt || this.clock().toISOString() } });
    });
  }

  async recordFailure(caseIdOrInvocation, { workerId, errorCode = "RECONCILE_UNRESOLVED", nextReconcileAt } = {}) {
    return this.processLock.run(async () => {
      const current = await this.get(caseIdOrInvocation);
      // C5：用独立的 failureCount 判 max（attempts 是 claim 认领数，含并发空认领，判 max 不准）。
      // 达 maxAttempts 转终态——claim 前置 status!=="open" 天然阻止终态复用，失败 case 不再永远循环。
      const failureCount = Number(current.failureCount || 0) + 1;
      const common = { claim: null, failureCount, lastErrorCode: String(errorCode), ...(workerId ? { lastWorkerId: String(workerId) } : {}) };
      if (failureCount >= this.maxAttempts) {
        return this.#updateUnlocked(caseKey(current.toolInvocationKey), { status: "failed_terminal", ...common });
      }
      const next = nextReconcileAt || new Date(this.clock().getTime() + Math.min(60 * 60_000, Math.max(5_000, (2 ** Math.min(8, Number(current.attempts || 1))) * 1_000))).toISOString();
      return this.#updateUnlocked(caseKey(current.toolInvocationKey), { status: "open", nextReconcileAt: next, ...common });
    });
  }

  async recoverExpired({ now = this.clock() } = {}) {
    return this.processLock.run(async () => {
      const records = await this.list({ status: "claimed", limit: 10_000 });
      const recovered = [];
      for (const record of records) {
        if (!record.claim || new Date(record.claim.leaseExpiresAt).getTime() > new Date(now).getTime()) continue;
        recovered.push(await this.#updateUnlocked(caseKey(record.toolInvocationKey), { status: "open", claim: null, nextReconcileAt: new Date(now).toISOString() }));
      }
      return recovered;
    });
  }
}

export { EFFECT_CASE_VERSION, EffectReconciliationCaseStore, caseKey };
