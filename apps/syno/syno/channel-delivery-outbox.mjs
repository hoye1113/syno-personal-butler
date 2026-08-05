import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { ProcessFileLock } from "./process-lock.mjs";
import { PATHS } from "./paths.mjs";
import { runDpapi } from "./provider-credential-store.mjs";

const CHANNEL_DELIVERY_OUTBOX_VERSION = 2;
const DELIVERY_STATUSES = new Set(["pending", "claimed", "delivered", "failed_retryable", "failed_terminal", "delivery_unknown", "superseded"]);
const RESPONSE_KINDS = new Set(["ack", "progress", "decision", "final", "recovery", "proactive"]);

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

// 聚合主动通道连续投递失败。records 须已按 createdAt desc 排序、且已限定到目标 channel/sourceType
// （用 list({sourceType,targetChannel,order:"desc"}) 取）。从最新向前累加连续失败态事件的 attempts，遇到
// 首个非失败态即停——与 runtime 进程级计数器同口径（每次失败 settle 既 +1 计数器又 +1 attempts，故 Σattempts == 计数器）。
const DELIVERY_FAILING_STATUS = new Set(["failed_retryable", "failed_terminal", "delivery_unknown"]);
function aggregateDeliveryFailures(records) {
  let consecutiveFailures = 0;
  let lastDeliveryError = null;
  for (const item of records || []) {
    if (!DELIVERY_FAILING_STATUS.has(item.status)) break;
    consecutiveFailures += Number(item.attempts || 0);
    if (!lastDeliveryError && item.lastErrorCode) lastDeliveryError = item.lastErrorCode;
  }
  return { consecutiveFailures, lastDeliveryError };
}

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
    beforeClaimCommit,
  } = {}) {
    this.root = path.resolve(root);
    this.payloadRoot = path.resolve(payloadRoot);
    this.leaseMs = Math.max(30_000, Number(leaseMs) || 5 * 60_000);
    this.retryBaseMs = Math.max(1_000, Number(retryBaseMs) || 30_000);
    this.clock = clock;
    this.protect = protect;
    this.unprotect = unprotect;
    this.processLock = processLock || new ProcessFileLock({ file: lockFile, timeoutMs: 30_000 });
    this.beforeClaimCommit = beforeClaimCommit;
    this.frozenProactiveTargets = new Set();
    this.inFlightProactiveTargets = new Map();
    this.inFlightWaiters = new Map();
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
    shouldEnqueue = () => true,
    exclusiveActivePrefix = null,
  } = {}) {
    if (!sourceId || !ownerKey || !targetChannel || !deliveryKey) throw new Error("ChannelDeliveryOutbox 缺少 sourceId/ownerKey/targetChannel/deliveryKey");
    if (!RESPONSE_KINDS.has(responseKind)) throw new Error(`未知响应类型：${responseKind}`);
    const normalizedPayload = canonicalize(payload && typeof payload === "object" ? payload : { text: String(payload || "") });
    const payloadDigest = digest(normalizedPayload);
    const id = String(requestedEventId || eventId());
    return this.processLock.run(async () => {
      if (!await shouldEnqueue()) return { created: false, event: null, skipped: true };
      const records = await this.#listUnlocked();
      const sameKey = records.find((item) => item.deliveryKey === deliveryKey);
      if (sameKey) {
        if (sameKey.payloadDigest !== payloadDigest) throw Object.assign(new Error("delivery key 对应不同 payload"), { code: "DELIVERY_IDENTITY_CONFLICT" });
        return { created: false, event: sameKey };
      }
      if (exclusiveActivePrefix) {
        const conflicting = records.find((item) => item.ownerKey === ownerKey
          && item.targetChannel === targetChannel
          && String(item.deliveryKey || "").startsWith(exclusiveActivePrefix)
          && ["pending", "claimed", "failed_retryable", "delivery_unknown"].includes(item.status));
        if (conflicting) {
          throw Object.assign(new Error("已有同组投递事件处于非终态"), {
            code: "DELIVERY_EXCLUSIVE_GROUP_CONFLICT",
            conflictingEventId: conflicting.eventId,
          });
        }
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
        projectionAttempts: 0,
        projectedAt: null,
        nextProjectionAt: null,
        projectionErrorCode: null,
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
    const deliveryTarget = payload.deliveryTargetRef || null;
    const body = { ...payload };
    delete body.deliveryTargetRef;
    if (digest(body) !== record.payloadDigest) throw Object.assign(new Error("ChannelDeliveryOutbox payload digest 不匹配"), { code: "DELIVERY_PAYLOAD_TAMPERED" });
    return { ...record, payload: body, deliveryTarget };
  }

  async list({ sourceId, sourceType, targetChannel, status, dueBefore, limit = 100, order = "asc" } = {}) {
    const records = await this.#listUnlocked();
    const dueMs = dueBefore ? new Date(dueBefore).getTime() : Infinity;
    // sourceType/targetChannel 过滤在切片前完成：诊断（seed、deliveryHealth）按这两个维度限定后再取
    // 最新 N 条，避免被其它类型的海量事件挤出 limit 窗口导致假绿。
    const filtered = records.filter((item) => (!sourceId || item.sourceId === sourceId)
      && (!sourceType || item.sourceType === sourceType)
      && (!targetChannel || item.targetChannel === targetChannel)
      && (!status || item.status === status)
      && (!dueBefore || new Date(item.dueAt).getTime() <= dueMs));
    // #listUnlocked returns oldest-first; "desc" re-sorts newest-first BEFORE slicing so a small
    // limit returns the newest records (not the oldest) — diagnostics (seed, deliveryHealth) rely on it.
    const sorted = order === "desc"
      ? filtered.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      : filtered;
    return sorted.slice(0, Math.max(1, Number(limit) || 100));
  }

  // Bounded retention (R7): terminal records (delivered/failed_terminal/superseded) are never
  // re-delivered, so evicting the oldest of them keeps the outbox directory small — otherwise every
  // drain tick re-reads+parses every file, and diagnostics that slice a small limit go stale (R2).
  // Safe under concurrency: deliverDue's candidate filter excludes these statuses and #listUnlocked
  // fail-closes on missing/malformed files.
  async retain({ now = this.clock(), maxAgeMs = 14 * 24 * 60 * 60 * 1000, limit = 200 } = {}) {
    const terminal = new Set(["delivered", "failed_terminal", "superseded"]);
    const cutoff = new Date(now).getTime() - Math.max(0, Number(maxAgeMs) || 0);
    const records = await this.#listUnlocked();
    let removed = 0;
    for (const record of records) {
      if (removed >= limit) break;
      if (!terminal.has(record.status)) continue;
      const ts = new Date(record.updatedAt || record.deliveredAt || record.createdAt).getTime();
      if (!Number.isFinite(ts) || ts > cutoff) continue;
      await this.processLock.run(async () => {
        try { await fs.rm(eventFile(this.root, record.eventId), { force: true }); } catch {}
        try { if (record.payloadRef) await fs.rm(payloadFile(this.payloadRoot, record.payloadRef), { force: true }); } catch {}
      });
      removed += 1;
    }
    return { removed };
  }

  async findActiveProactiveTest(ownerKey, targetChannel) {
    const active = new Set(["pending", "claimed", "failed_retryable", "delivery_unknown"]);
    const records = await this.#listUnlocked();
    return records
      .filter((item) => item.sourceType === "proactive_bundle"
        && item.ownerKey === ownerKey
        && item.targetChannel === targetChannel
        && String(item.deliveryKey || "").startsWith("proactive-test:")
        && active.has(item.status))
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))[0] || null;
  }

  async supersedeProactiveTarget(ownerKey, targetChannel) {
    const active = new Set(["pending", "claimed", "failed_retryable", "delivery_unknown"]);
    return this.processLock.run(async () => {
      const records = await this.#listUnlocked();
      const matches = records.filter((item) => item.sourceType === "proactive_bundle"
        && item.ownerKey === ownerKey
        && item.targetChannel === targetChannel
        && active.has(item.status));
      for (const item of matches) {
        await this.#updateUnlocked(item.eventId, { status: "superseded", claim: null });
      }
      return matches.length;
    });
  }

  #targetKey(ownerKey, targetChannel) {
    return `${ownerKey}\u0000${targetChannel}`;
  }

  #incrementInFlight(key) {
    this.inFlightProactiveTargets.set(key, (this.inFlightProactiveTargets.get(key) || 0) + 1);
  }

  #decrementInFlight(key) {
    const next = Math.max(0, (this.inFlightProactiveTargets.get(key) || 0) - 1);
    if (next) this.inFlightProactiveTargets.set(key, next);
    else {
      this.inFlightProactiveTargets.delete(key);
      for (const resolve of this.inFlightWaiters.get(key) || []) resolve();
      this.inFlightWaiters.delete(key);
    }
  }

  async beginProactiveTargetCutover(ownerKey, targetChannel, { timeoutMs = 30_000 } = {}) {
    const key = this.#targetKey(ownerKey, targetChannel);
    this.frozenProactiveTargets.add(key);
    try {
      if ((this.inFlightProactiveTargets.get(key) || 0) > 0) {
        await new Promise((resolve, reject) => {
          const waiters = this.inFlightWaiters.get(key) || [];
          waiters.push(resolve);
          this.inFlightWaiters.set(key, waiters);
          const timer = setTimeout(() => reject(Object.assign(new Error("旧 Home 主动投递仍在发送"), { code: "PROACTIVE_TARGET_CUTOVER_TIMEOUT" })), timeoutMs);
          timer.unref?.();
          waiters[waiters.length - 1] = () => {
            clearTimeout(timer);
            resolve();
          };
        });
      }
      await this.supersedeProactiveTarget(ownerKey, targetChannel);
      let released = false;
      return {
        release: () => {
          if (released) return;
          released = true;
          this.frozenProactiveTargets.delete(key);
        },
      };
    } catch (error) {
      this.frozenProactiveTargets.delete(key);
      throw error;
    }
  }

  async #settleClaim(id, lease, patch) {
    return this.processLock.run(async () => {
      const current = JSON.parse(await fs.readFile(eventFile(this.root, id), "utf8"));
      if (current.status !== "claimed" || current.claim?.leaseId !== lease.leaseId) return null;
      return this.#updateUnlocked(id, patch);
    });
  }

  async #commitClaim(candidate, lease) {
    return this.processLock.run(async () => {
      const current = JSON.parse(await fs.readFile(eventFile(this.root, candidate.eventId), "utf8"));
      const eligible = ["pending", "delivery_unknown", "failed_retryable"].includes(current.status)
        || (current.status === "claimed" && new Date(current.claim?.leaseExpiresAt || 0).getTime() <= this.clock().getTime());
      if (!eligible) return null;
      const proactiveTargetKey = current.sourceType === "proactive_bundle"
        ? this.#targetKey(current.ownerKey, current.targetChannel)
        : null;
      if (proactiveTargetKey && this.frozenProactiveTargets.has(proactiveTargetKey)) return null;
      if (proactiveTargetKey) this.#incrementInFlight(proactiveTargetKey);
      try {
        const claimed = await this.#updateUnlocked(candidate.eventId, {
          status: "claimed",
          claim: lease,
          attempts: Number(current.attempts || 0) + 1,
        });
        return { claimed, proactiveTargetKey };
      } catch (error) {
        if (proactiveTargetKey) this.#decrementInFlight(proactiveTargetKey);
        throw error;
      }
    });
  }

  async wakeTarget(ownerKey, targetChannel, { now = this.clock() } = {}) {
    if (!ownerKey || !targetChannel) return 0;
    return this.processLock.run(async () => {
      const records = await this.#listUnlocked();
      const blocked = records.filter((item) =>
        item.sourceType === "proactive_bundle"
        && item.ownerKey === ownerKey
        && item.targetChannel === targetChannel
        && item.status === "failed_retryable"
        && ["CHANNEL_TARGET_MISSING", "CHANNEL_TARGET_UNAVAILABLE"].includes(item.lastErrorCode));
      for (const record of blocked) {
        await this.#updateUnlocked(record.eventId, {
          status: "pending",
          dueAt: new Date(now).toISOString(),
          nextAttemptAt: null,
          lastErrorCode: null,
        });
      }
      return blocked.length;
    });
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
    // Order later versions behind in-flight or genuinely-uncertain earlier events. A
    // failed_retryable event is known NOT to have delivered and keeps retrying on its own
    // backoff, so it must not indefinitely suppress a later Final/Decision — otherwise one
    // persistently failing ACK would starve the substantive reply forever. delivery_unknown
    // stays blocking because its delivery state is genuinely uncertain (duplicate risk).
    return records.some((item) => item.sourceId === record.sourceId
      && item.targetChannel === record.targetChannel
      && Number(item.responseVersion) < Number(record.responseVersion)
      && ["pending", "claimed", "delivery_unknown"].includes(item.status));
  }

  async deliverDue(send, { now = this.clock(), limit = 100, onDelivered, onDeliveryUnknown, onFailedRetryable, onFailedTerminal, shouldDeliver } = {}) {
    if (typeof send !== "function") throw new Error("ChannelDeliveryOutbox.deliverDue 需要发送函数");
    const max = Math.max(1, Number(limit) || 100);
    const report = { scanned: 0, delivered: 0, retryable: 0, terminal: 0, unknown: 0, superseded: 0, projected: 0, projectionFailed: 0 };
    while (report.scanned < max) {
      const records = await this.#listUnlocked();
      const projection = typeof onDelivered === "function"
        ? records
          .filter((item) => item.status === "delivered" && !item.projectedAt
            && new Date(item.nextProjectionAt || 0).getTime() <= new Date(now).getTime())
          .sort((a, b) => String(a.deliveredAt || a.updatedAt).localeCompare(String(b.deliveredAt || b.updatedAt)))[0]
        : null;
      if (projection) {
        report.scanned += 1;
        const projectionAttempts = Number(projection.projectionAttempts || 0) + 1;
        try {
          await onDelivered(projection);
          await this.processLock.run(() => this.#updateUnlocked(projection.eventId, {
            projectionAttempts,
            projectedAt: this.clock().toISOString(),
            nextProjectionAt: null,
            projectionErrorCode: null,
          }));
          report.projected += 1;
        } catch (error) {
          await this.processLock.run(() => this.#updateUnlocked(projection.eventId, {
            projectionAttempts,
            nextProjectionAt: new Date(this.clock().getTime() + backoff(projectionAttempts, this.retryBaseMs)).toISOString(),
            projectionErrorCode: error?.code || "DELIVERY_PROJECTION_FAILED",
          }));
          report.projectionFailed += 1;
        }
        continue;
      }
      const candidates = records
        .filter((item) => (["pending", "delivery_unknown", "failed_retryable"].includes(item.status)
            || (item.status === "claimed" && new Date(item.claim?.leaseExpiresAt || 0).getTime() <= new Date(now).getTime()))
          && new Date(item.nextAttemptAt || item.dueAt).getTime() <= new Date(now).getTime()
          && !(item.sourceType === "proactive_bundle" && this.frozenProactiveTargets.has(this.#targetKey(item.ownerKey, item.targetChannel)))
          && !this.#blockedByEarlier(item, records))
        .sort((a, b) => Number(a.responseVersion) - Number(b.responseVersion) || String(a.createdAt).localeCompare(String(b.createdAt)));
      let candidate = null;
      for (const item of candidates) {
        if (typeof shouldDeliver !== "function" || await shouldDeliver(item)) {
          candidate = item;
          break;
        }
      }
      if (!candidate) break;
      report.scanned += 1;
      const lease = await this.#claimLease(candidate.eventId, new Date(now));
      if (!lease) continue;
      let proactiveTargetKey = null;
      try {
        await this.beforeClaimCommit?.(candidate, lease);
        const committedClaim = await this.#commitClaim(candidate, lease);
        if (!committedClaim) continue;
        const { claimed } = committedClaim;
        proactiveTargetKey = committedClaim.proactiveTargetKey;
        let payload;
        try {
          payload = await this.get(candidate.eventId, { includePayload: true });
        } catch (error) {
          // payload 加载失败按「结构 vs 瞬时」二分，避免把瞬时 IO 错误判为永久 → 消息丢失：
          //   结构性（digest 篡改 / JSON 解码失败 / payload 文件缺失）：磁盘字节固定，重试永不成功 → failed_terminal。
          //   瞬时（IO 冲突 EBUSY/EACCES/EIO、DPAPI 临时失败、payload 文件被临时占用）：→ failed_retryable + 退避，
          //   与 send 侧 retryable 分支（:530）同形，经 onFailedRetryable 可观测，到期可再次投递。
          const structural = error?.code === "DELIVERY_PAYLOAD_TAMPERED"
            || error instanceof SyntaxError
            || error?.code === "ENOENT";
          const lastErrorCode = error?.code === "DELIVERY_PAYLOAD_TAMPERED" ? "DELIVERY_PAYLOAD_TAMPERED"
            : error instanceof SyntaxError ? "DELIVERY_PAYLOAD_DECODE_FAILED"
            : (error?.code === "ENOENT" ? "DELIVERY_PAYLOAD_MISSING" : "DELIVERY_PAYLOAD_UNAVAILABLE");
          if (structural) {
            const settled = await this.#settleClaim(candidate.eventId, lease, { status: "failed_terminal", claim: null, lastErrorCode });
            if (settled) { try { await onFailedTerminal?.(settled); } catch { /* best-effort：settle 已持久，勿中断批次 */ } report.terminal += 1; }
            else report.superseded += 1;
          } else {
            const settled = await this.#settleClaim(candidate.eventId, lease, { status: "failed_retryable", claim: null, dueAt: new Date(this.clock().getTime() + backoff(claimed.attempts, this.retryBaseMs)).toISOString(), lastErrorCode });
            if (settled) { try { await onFailedRetryable?.(settled); } catch { /* best-effort：settle 已持久，勿中断批次 */ } report.retryable += 1; }
            else report.superseded += 1;
          }
          continue; // finally 仍会执行 #decrementInFlight + #releaseLease，#settleClaim 已置 claim:null，无孤儿 lease
        }
        let result;
        try { result = await send(payload.payload, { ...claimed, deliveryTarget: payload.deliveryTarget }); }
        catch (error) {
          result = error?.deliveryUnknown === true ? { deliveryUnknown: true, reason: error.code || "DELIVERY_UNKNOWN" } : { retryable: error?.retryable !== false, reason: error.code || "DELIVERY_FAILED" };
        }
        if (result?.delivered === true) {
          const settled = await this.#settleClaim(candidate.eventId, lease, { status: "delivered", claim: null, deliveredAt: this.clock().toISOString() });
          if (settled) report.delivered += 1;
          else report.superseded += 1;
        } else if (result?.deliveryUnknown === true) {
          const unknown = await this.#settleClaim(candidate.eventId, lease, { status: "delivery_unknown", claim: null, nextAttemptAt: new Date(this.clock().getTime() + backoff(claimed.attempts, this.retryBaseMs)).toISOString(), lastErrorCode: result.reason || "DELIVERY_UNKNOWN" });
          if (unknown) {
            try { await onDeliveryUnknown?.(unknown); } catch { /* best-effort: settle is durable, don't abort the batch */ }
            report.unknown += 1;
          } else report.superseded += 1;
        } else if (result?.retryable !== false) {
          const settled = await this.#settleClaim(candidate.eventId, lease, { status: "failed_retryable", claim: null, dueAt: new Date(this.clock().getTime() + backoff(claimed.attempts, this.retryBaseMs)).toISOString(), lastErrorCode: result?.reason || "DELIVERY_RETRYABLE" });
          if (settled) { try { await onFailedRetryable?.(settled); } catch { /* best-effort: settle is durable, don't abort the batch */ } report.retryable += 1; }
          else report.superseded += 1;
        } else {
          const settled = await this.#settleClaim(candidate.eventId, lease, { status: "failed_terminal", claim: null, lastErrorCode: result?.reason || "DELIVERY_TERMINAL" });
          if (settled) { try { await onFailedTerminal?.(settled); } catch { /* best-effort: settle is durable, don't abort the batch */ } report.terminal += 1; }
          else report.superseded += 1;
        }
      } finally {
        if (proactiveTargetKey) this.#decrementInFlight(proactiveTargetKey);
        await this.#releaseLease(lease);
      }
    }
    return report;
  }
}

export { CHANNEL_DELIVERY_OUTBOX_VERSION, ChannelDeliveryOutbox, aggregateDeliveryFailures, canonicalize, digest };
