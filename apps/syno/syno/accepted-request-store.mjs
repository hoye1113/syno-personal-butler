import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { ProcessFileLock } from "./process-lock.mjs";
import { PATHS } from "./paths.mjs";
import { runDpapi } from "./provider-credential-store.mjs";

const ACCEPTED_REQUEST_VERSION = 1;
const TERMINAL_STATUSES = new Set(["delivered", "canceled", "failed_terminal"]);
const CLAIMABLE_STATUSES = new Set(["accepted", "failed_retryable", "waiting_provider"]);

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

function requestId(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 17);
  return `request-${stamp}-${randomUUID().slice(0, 8)}`;
}

function defaultMessageDedupKey({ ownerKey, originChannel, platformMessageId }) {
  return digest({ ownerKey, originChannel, platformMessageId });
}

function metadataFile(root, id) {
  return path.join(root, `${id}.json`);
}

function payloadFile(root, id) {
  return path.join(root, `${id}.dpapi`);
}

class AcceptedRequestStore {
  constructor({
    root = path.join(PATHS.stateRoot, "accepted-requests"),
    payloadRoot = path.join(PATHS.stateRoot, "accepted-request-payloads"),
    lockFile = path.join(PATHS.stateRoot, "locks", "accepted-requests.lock"),
    leaseMs = 5 * 60 * 1_000,
    clock = () => new Date(),
    protect = (value) => runDpapi("protect", value),
    unprotect = (value) => runDpapi("unprotect", value),
    processLock,
  } = {}) {
    this.root = path.resolve(root);
    this.payloadRoot = path.resolve(payloadRoot);
    this.leaseMs = Math.max(30_000, Number(leaseMs) || 5 * 60 * 1_000);
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

  async #listMetadataUnlocked() {
    await this.#ensureRoots();
    const names = (await fs.readdir(this.root)).filter((name) => name.endsWith(".json"));
    const records = [];
    for (const name of names) {
      try {
        const record = JSON.parse(await fs.readFile(path.join(this.root, name), "utf8"));
        if (record?.version === ACCEPTED_REQUEST_VERSION && record.requestId) records.push(record);
      } catch {
        // A torn or manually edited record is ignored by reads and surfaced by diagnostics.
      }
    }
    return records.sort((a, b) => String(a.receivedAt).localeCompare(String(b.receivedAt)));
  }

  async accept({
    requestId: requestedId,
    ownerKey,
    originChannel,
    platformMessageId,
    messageDedupKey,
    threadKey = "main",
    payloadKind = "text",
    payload,
    deliveryTarget = null,
    receivedAt = this.clock().toISOString(),
  } = {}) {
    const normalizedOwner = String(ownerKey || "local-user");
    const normalizedChannel = String(originChannel || "");
    const normalizedPlatformId = String(platformMessageId || "");
    if (!normalizedChannel || !normalizedPlatformId) throw new Error("AcceptedRequest 缺少 originChannel 或 platformMessageId");
    const dedupKey = String(messageDedupKey || defaultMessageDedupKey({
      ownerKey: normalizedOwner,
      originChannel: normalizedChannel,
      platformMessageId: normalizedPlatformId,
    }));
    const body = canonicalize({
      ...(payload && typeof payload === "object" ? payload : { text: String(payload || "") }),
      ...(deliveryTarget && typeof deliveryTarget === "object" ? { deliveryTarget } : {}),
    });
    const id = String(requestedId || requestId(this.clock()));
    return this.processLock.run(async () => {
      const existing = (await this.#listMetadataUnlocked()).find((item) => item.messageDedupKey === dedupKey);
      if (existing) return { created: false, request: existing };
      const encrypted = await this.protect(JSON.stringify(body));
      const ref = id;
      await atomicWrite(payloadFile(this.payloadRoot, id), encrypted);
      const record = {
        version: ACCEPTED_REQUEST_VERSION,
        requestId: id,
        ownerKey: normalizedOwner,
        originChannel: normalizedChannel,
        platformMessageId: normalizedPlatformId,
        messageDedupKey: dedupKey,
        threadKey: String(threadKey || "main"),
        payloadRef: ref,
        payloadDigest: digest(body),
        payloadKind: String(payloadKind || "text"),
        status: "accepted",
        route: null,
        ackEventId: null,
        finalEventId: null,
        attempts: 0,
        nextAttemptAt: null,
        claim: null,
        receivedAt: new Date(receivedAt).toISOString(),
        updatedAt: this.clock().toISOString(),
      };
      try {
        const handle = await fs.open(metadataFile(this.root, id), "wx", 0o600);
        try { await handle.writeFile(`${JSON.stringify(record, null, 2)}\n`, "utf8"); }
        finally { await handle.close(); }
      } catch (error) {
        await fs.rm(payloadFile(this.payloadRoot, id), { force: true }).catch(() => {});
        if (error.code === "EEXIST") {
          const collision = (await this.#listMetadataUnlocked()).find((item) => item.requestId === id);
          if (collision) return { created: false, request: collision };
        }
        throw error;
      }
      return { created: true, request: record };
    });
  }

  async get(requestIdValue, { includePayload = false } = {}) {
    const record = JSON.parse(await fs.readFile(metadataFile(this.root, String(requestIdValue)), "utf8"));
    if (!includePayload) return record;
    const encrypted = await fs.readFile(payloadFile(this.payloadRoot, record.payloadRef), "utf8");
    const payload = JSON.parse(await this.unprotect(encrypted));
    if (digest(payload) !== record.payloadDigest) throw Object.assign(new Error("AcceptedRequest payload digest 不匹配"), { code: "ACCEPTED_REQUEST_PAYLOAD_TAMPERED" });
    return { ...record, payload };
  }

  async list({ status, ownerKey, limit = 100 } = {}) {
    const records = await this.#listMetadataUnlocked();
    return records.filter((item) => (!status || item.status === status) && (!ownerKey || item.ownerKey === ownerKey)).slice(-Math.max(1, Number(limit) || 100));
  }

  async #updateUnlocked(requestIdValue, patch) {
    const file = metadataFile(this.root, requestIdValue);
    const current = JSON.parse(await fs.readFile(file, "utf8"));
    const next = { ...current, ...patch, requestId: current.requestId, version: ACCEPTED_REQUEST_VERSION, updatedAt: this.clock().toISOString() };
    await atomicWrite(file, `${JSON.stringify(next, null, 2)}\n`);
    return next;
  }

  async update(requestIdValue, patch = {}) {
    return this.processLock.run(() => this.#updateUnlocked(String(requestIdValue), patch));
  }

  async claim(requestIdValue, { workerId = `worker-${process.pid}`, now = this.clock() } = {}) {
    return this.processLock.run(async () => {
      const current = await this.get(requestIdValue);
      const activeClaim = current.claim && new Date(current.claim.leaseExpiresAt).getTime() > new Date(now).getTime();
      if (activeClaim || TERMINAL_STATUSES.has(current.status) || !CLAIMABLE_STATUSES.has(current.status)) return { claimed: false, request: current };
      const claim = {
        workerId: String(workerId),
        claimedAt: new Date(now).toISOString(),
        leaseExpiresAt: new Date(new Date(now).getTime() + this.leaseMs).toISOString(),
      };
      return { claimed: true, request: await this.#updateUnlocked(String(requestIdValue), { status: "claimed", claim, attempts: Number(current.attempts || 0) + 1, nextAttemptAt: null }) };
    });
  }

  async renewClaim(requestIdValue, { workerId, now = this.clock() } = {}) {
    return this.processLock.run(async () => {
      const current = await this.get(requestIdValue);
      if (current.status !== "claimed" || current.claim?.workerId !== workerId) return { renewed: false, request: current };
      const claim = { ...current.claim, leaseExpiresAt: new Date(new Date(now).getTime() + this.leaseMs).toISOString() };
      return { renewed: true, request: await this.#updateUnlocked(String(requestIdValue), { claim }) };
    });
  }

  async recoverExpired({ now = this.clock() } = {}) {
    return this.processLock.run(async () => {
      const records = await this.#listMetadataUnlocked();
      const recovered = [];
      for (const record of records) {
        if (record.status !== "claimed" || !record.claim || new Date(record.claim.leaseExpiresAt).getTime() > new Date(now).getTime()) continue;
        recovered.push(await this.#updateUnlocked(record.requestId, { status: "accepted", claim: null, nextAttemptAt: new Date(now).toISOString() }));
      }
      return recovered;
    });
  }
}

export { ACCEPTED_REQUEST_VERSION, AcceptedRequestStore, canonicalize, digest };
