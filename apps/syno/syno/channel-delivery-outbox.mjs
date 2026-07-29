import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { ProcessFileLock } from "./process-lock.mjs";
import { PATHS } from "./paths.mjs";
import { runDpapi } from "./provider-credential-store.mjs";

const CHANNEL_DELIVERY_OUTBOX_VERSION = 2;
const DELIVERY_STATUSES = new Set(["pending", "claimed", "delivered", "failed_retryable", "failed_terminal", "delivery_unknown", "superseded"]);
const RESPONSE_KINDS = new Set(["ack", "progress", "decision", "final", "recovery"]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

async function atomicWrite(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, value, { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
  await fs.chmod(file, 0o600).catch(() => {});
}

function eventId() {
  return `outbox-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 17)}-${randomUUID().slice(0, 8)}`;
}

function backoff(attempts, baseMs) {
  return Math.min(15 * 60_000, baseMs * (2 ** Math.min(8, Math.max(0, attempts - 1))));
}

function eventFile(root, id) { return path.join(root, `${id}.json`); }
function payloadFile(root, ref) { return path.join(root, `${ref}.dpapi`); }
function leaseFile(root, id) { return path.join(root, `${id}.lease`); }

class ChannelDeliveryOutbox {
  constructor({
    root = path.join(PATHS.stateRoot, "channel-outbox"),
    payloadRoot = path.join(PATHS.stateRoot, "channel-outbox-payloads"),
    lockFile = path.join(PATHS.stateRoot, "locks", "channel-outbox.lock"),
    leaseMs = 5 * 60_000,
    retryBaseMs = 30_000,
    clock = () => new Date(),
    protect = (value) => runDpapi("protect", value),
    unprotect = (value) => runDpapi("unprotect", value),
    processLock,
  } = {}) {
    this.root = path.resolve(root);
    this.payloadRoot = path.resolve(payloadRoot);
    this.leaseMs = Math.max(30_000, Number(leaseMs) || 5 * 60_000);
    this.retryBaseMs = Math.max(1_000, Number(retryBaseMs) || 30_000);
    this.clock = clock;
    this.protect = protect;
    this.unprotect = unprotect;
    this.processLock = processLock || new ProcessFileLock({ file: lockFile, timeoutMs: 30_000 });
  }

  async #ensureRoots() {
    await Promise.all([
      fs.mkdir(this.root, { recursive: true }),
      fs.mkdir(this.payloadRoot, { recursive: true }),
    ]);
  }

  async #listUnlocked() {
    await this.#ensureRoots();
    const names = (await fs.readdir(this.root)).filter((name) => name.endsWith(".json"));
    const records = [];
    for (const name of names) {
      try {
        const record = JSON.parse(await fs.readFile(path.join(this.root, name), "utf8"));
        if (record?.version === CHANNEL_DELIVERY_OUTBOX_VERSION && DELIVERY_STATUSES.has(record.status)) records.push(record);
      } catch {
        // Diagnostics report malformed records; delivery ignores them fail-closed.
      }
    }
    return records.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  }

  #defaultDueAt(responseKind, now, records, sourceId) {
    const nowMs = now.getTime();
    if (responseKind === "ack") return new Date(nowMs + 750).toISOString();
    if (responseKind === "progress") {
      const last = records.filter((item) => item.sourceId === sourceId && item.responseKind === "progress")
        .map((item) => new Date(item.dueAt || item.createdAt).getTime()).filter(Number.isFinite).sort((a, b) => b - a)[0];
      return new Date(Math.max(nowMs + 10_000, (last || 0) + 60_000)).toISOString();
    }
    return now.toISOString();
  }

  async enqueue({
    eventId: requestedEventId,
    sourceType = "accepted_request",
    sourceId,
    ownerKey,
    targetChannel,
    deliveryTargetRef = null,
    responseKind,
    responseVersion,
    businessVersion = 1,
    payload,
    deliveryKey,
    dueAt,
    supersedesEventId = null,
    createdAt = this.clock().toISOString(),
  } = {}) {
    if (!sourceId || !ownerKey || !targetChannel || !deliveryKey) throw new Error("ChannelDeliveryOutbox 缺少 sourceId/ownerKey/targetChannel/deliveryKey");
    if (!RESPONSE_KINDS.has(responseKind)) throw new Error(`未知响应类型：${responseKind}`);
    const normalizedPayload = canonicalize(payload && typeof payload === "object" ? payload : { text: String(payload || "") });
    const payloadDigest = digest(normalizedPayload);
    const id = String(requestedEventId || eventId());
    return this.processLock.run(async () => {
      const records = await this.#listUnlocked();
      const sameKey = records.find((item) => item.deliveryKey === deliveryKey);
      if (sameKey) {
        if (sameKey.payloadDigest !== payloadDigest) throw Object.assign(new Error("delivery key 对应不同 payload"), { code: "DELIVERY_IDENTITY_CONFLICT" });
        return { created: false, event: sameKey };
      }
      const now = new Date(createdAt);
      const sameSource = records.filter((item) => item.sourceId === sourceId && item.targetChannel === targetChannel);
      const maxVersion = sameSource.reduce((max, item) => Math.max(max, Number(item.responseVersion) || 0), 0);
      const version = Number.isInteger(responseVersion) && responseVersion > 0 ? responseVersion : maxVersion + 1;
      const ref = id;
      await atomicWrite(payloadFile(this.payloadRoot, ref), await this.protect(JSON.stringify({ ...normalizedPayload, deliveryTargetRef })));
      const record = {
        version: CHANNEL_DELIVERY_OUTBOX_VERSION,
        eventId: id,
        sourceType: String(sourceType),
        sourceId: String(sourceId),
        ownerKey: String(ownerKey),
        targetChannel: String(targetChannel),
        deliveryTargetRef: deliveryTargetRef && typeof deliveryTargetRef === "object" ? "encrypted-payload" : null,
        responseKind,
        responseVersion: version,
        businessVersion: Number(businessVersion) || 1,
        payloadRef: ref,
        payloadDigest,
        deliveryKey: String(deliveryKey),
        status: "pending",
        dueAt: dueAt || this.#defaultDueAt(responseKind, now, records, sourceId),
        attempts: 0,
        claim: null,
        supersedesEventId: supersedesEventId || null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      if (responseKind === "final" || responseKind === "decision" || responseKind === "recovery") {
        for (const older of sameSource.filter((item) => ["ack", "progress"].includes(item.responseKind) && ["pending", "claimed", "delivery_unknown"].includes(item.status))) {
          await this.#updateUnlocked(older.eventId, { status: "superseded", supersedesEventId: id, claim: null });
        }
      }
      const handle = await fs.open(eventFile(this.root, id), "wx", 0o600);
      try { await handle.writeFile(`${JSON.stringify(record, null, 2)}\n`, "utf8"); }
      finally { await handle.close(); }
      return { created: true, event: record };
    });
  }

  async #updateUnlocked(id, patch) {
    const file = eventFile(this.root, id);
    const current = JSON.parse(await fs.readFile(file, "utf8"));
    const next = { ...current, ...patch, eventId: current.eventId, version: CHANNEL_DELIVERY_OUTBOX_VERSION, updatedAt: this.clock().toISOString() };
    await atomicWrite(file, `${JSON.stringify(next, null, 2)}\n`);
    return next;
  }

  async get(id, { includePayload = false } = {}) {
    const record = JSON.parse(await fs.readFile(eventFile(this.root, id), "utf8"));
    if (!includePayload) return record;
    const encrypted = await fs.readFile(payloadFile(this.payloadRoot, record.payloadRef), "utf8");
    const payload = JSON.parse(await this.unprotect(encrypted));
    const body = { ...payload };
    delete body.deliveryTargetRef;
    if (digest(body) !== record.payloadDigest) throw Object.assign(new Error("ChannelDeliveryOutbox payload digest 不匹配"), { code: "DELIVERY_PAYLOAD_TAMPERED" });
    return { ...record, payload };
  }

  async list({ sourceId, status, dueBefore, limit = 100 } = {}) {
    const records = await this.#listUnlocked();
    const dueMs = dueBefore ? new Date(dueBefore).getTime() : Infinity;
    return records.filter((item) => (!sourceId || item.sourceId === sourceId)
      && (!status || item.status === status)
      && (!dueBefore || new Date(item.dueAt).getTime() <= dueMs)).slice(0, Math.max(1, Number(limit) || 100));
  }

  async #claimLease(id, now) {
    await this.#ensureRoots();
    const file = leaseFile(this.root, id);
    try {
      const handle = await fs.open(file, "wx", 0o600);
      const claim = { leaseId: randomUUID(), workerId: `outbox-${process.pid}`, claimedAt: now.toISOString(), leaseExpiresAt: new Date(now.getTime() + this.leaseMs).toISOString() };
      await handle.writeFile(`${JSON.stringify(claim)}\n`, "utf8");
      await handle.close();
      return { file, ...claim };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      try {
        const existing = JSON.parse(await fs.readFile(file, "utf8"));
        if (new Date(existing.leaseExpiresAt).getTime() <= now.getTime()) {
          await fs.rm(file, { force: true });
          return this.#claimLease(id, now);
        }
      } catch {}
      return null;
    }
  }

  async #releaseLease(lease) {
    if (!lease) return;
    try {
      const current = JSON.parse(await fs.readFile(lease.file, "utf8"));
      if (current.leaseId === lease.leaseId) await fs.rm(lease.file, { force: true });
    } catch {}
  }

  #blockedByEarlier(record, records) {
    return records.some((item) => item.sourceId === record.sourceId
      && item.targetChannel === record.targetChannel
      && Number(item.responseVersion) < Number(record.responseVersion)
      && ["pending", "claimed", "delivery_unknown", "failed_retryable"].includes(item.status));
  }

  async deliverDue(send, { now = this.clock(), limit = 100 } = {}) {
    if (typeof send !== "function") throw new Error("ChannelDeliveryOutbox.deliverDue 需要发送函数");
    const max = Math.max(1, Number(limit) || 100);
    const report = { scanned: 0, delivered: 0, retryable: 0, terminal: 0, unknown: 0, superseded: 0 };
    while (report.scanned < max) {
      const records = await this.#listUnlocked();
      const candidate = records
        .filter((item) => ["pending", "delivery_unknown", "failed_retryable"].includes(item.status)
          && new Date(item.nextAttemptAt || item.dueAt).getTime() <= new Date(now).getTime()
          && !this.#blockedByEarlier(item, records))
        .sort((a, b) => Number(a.responseVersion) - Number(b.responseVersion) || String(a.createdAt).localeCompare(String(b.createdAt)))[0];
      if (!candidate) break;
      report.scanned += 1;
      const lease = await this.#claimLease(candidate.eventId, new Date(now));
      if (!lease) continue;
      try {
        const claimed = await this.processLock.run(() => this.#updateUnlocked(candidate.eventId, { status: "claimed", claim: lease, attempts: Number(candidate.attempts || 0) + 1 }));
        const payload = await this.get(candidate.eventId, { includePayload: true });
        let result;
        try { result = await send(payload.payload, claimed); }
        catch (error) {
          result = error?.deliveryUnknown === true ? { deliveryUnknown: true, reason: error.code || "DELIVERY_UNKNOWN" } : { retryable: error?.retryable !== false, reason: error.code || "DELIVERY_FAILED" };
        }
        if (result?.delivered === true) {
          await this.processLock.run(() => this.#updateUnlocked(candidate.eventId, { status: "delivered", claim: null, deliveredAt: this.clock().toISOString() }));
          report.delivered += 1;
        } else if (result?.deliveryUnknown === true) {
          await this.processLock.run(() => this.#updateUnlocked(candidate.eventId, { status: "delivery_unknown", claim: null, nextAttemptAt: new Date(this.clock().getTime() + backoff(claimed.attempts, this.retryBaseMs)).toISOString(), lastErrorCode: result.reason || "DELIVERY_UNKNOWN" }));
          report.unknown += 1;
        } else if (result?.retryable !== false) {
          await this.processLock.run(() => this.#updateUnlocked(candidate.eventId, { status: "failed_retryable", claim: null, dueAt: new Date(this.clock().getTime() + backoff(claimed.attempts, this.retryBaseMs)).toISOString(), lastErrorCode: result?.reason || "DELIVERY_RETRYABLE" }));
          report.retryable += 1;
        } else {
          await this.processLock.run(() => this.#updateUnlocked(candidate.eventId, { status: "failed_terminal", claim: null, lastErrorCode: result?.reason || "DELIVERY_TERMINAL" }));
          report.terminal += 1;
        }
      } finally {
        await this.#releaseLease(lease);
      }
    }
    return report;
  }
}

export { CHANNEL_DELIVERY_OUTBOX_VERSION, ChannelDeliveryOutbox, canonicalize, digest };
