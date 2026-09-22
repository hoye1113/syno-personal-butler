import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";
import { ProcessFileLock } from "./process-lock.mjs";
import { runDpapi } from "./provider-credential-store.mjs";

// Only "open" records may be picked up by resolve().  Every outcome of a continuation —
// resolved (feedback recorded), completed (link re-read succeeded), settled (generic close)
// and expired — is terminal and must never match again.
const ACTIVE = new Set(["open"]);

async function atomicWrite(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, value, { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
  await fs.chmod(file, 0o600).catch(() => {});
}

function metadataFile(root, id) { return path.join(root, `${id}.json`); }
function payloadFile(root, id) { return path.join(root, `${id}.dpapi`); }

// Continuations deliberately separate searchable routing facts from opaque content.  In
// particular, URLs (which can contain tokens) never appear in the metadata directory.
class ChannelContinuationStore {
  constructor({
    root = path.join(PATHS.stateRoot, "channel-continuations"),
    payloadRoot = path.join(PATHS.stateRoot, "channel-continuation-payloads"),
    lockFile = path.join(PATHS.stateRoot, "locks", "channel-continuations.lock"),
    clock = () => new Date(),
    protect = (value) => runDpapi("protect", value),
    unprotect = (value) => runDpapi("unprotect", value),
    processLock,
  } = {}) {
    this.root = path.resolve(root);
    this.payloadRoot = path.resolve(payloadRoot);
    this.clock = clock;
    this.protect = protect;
    this.unprotect = unprotect;
    this.processLock = processLock || new ProcessFileLock({ file: lockFile, timeoutMs: 30_000 });
  }

  async #listUnlocked() {
    await fs.mkdir(this.root, { recursive: true });
    const names = await fs.readdir(this.root);
    const records = await Promise.all(names.filter((name) => name.endsWith(".json")).map(async (name) => {
      try { return JSON.parse(await fs.readFile(path.join(this.root, name), "utf8")); } catch { return null; }
    }));
    return records.filter(Boolean);
  }

  async #write(record) { await atomicWrite(metadataFile(this.root, record.id), `${JSON.stringify(record, null, 2)}\n`); }

  async open({ ownerKey, channel, threadKey = "main", type, correlationId = null, expiresAt, payload = {} } = {}) {
    if (!type || !expiresAt) throw new Error("ChannelContinuation 缺少 type 或 expiresAt");
    const now = this.clock().toISOString();
    const id = `continuation-${randomUUID()}`;
    const record = {
      version: 1, id, ownerKey: String(ownerKey || "local-user"), channel: String(channel || ""),
      threadKey: String(threadKey || "main"), type: String(type), status: "open",
      correlationId: correlationId ? String(correlationId) : null, expiresAt: new Date(expiresAt).toISOString(),
      createdAt: now, updatedAt: now,
    };
    return this.processLock.run(async () => {
      await fs.mkdir(this.payloadRoot, { recursive: true });
      await atomicWrite(payloadFile(this.payloadRoot, id), await this.protect(JSON.stringify(payload)));
      await this.#write(record);
      return record;
    });
  }

  async resolve({ ownerKey, channel, threadKey = "main", type } = {}) {
    const now = this.clock().getTime();
    return this.processLock.run(async () => {
      const matches = (await this.#listUnlocked())
        .filter((item) => item.ownerKey === String(ownerKey || "local-user")
          && item.channel === String(channel || "") && item.threadKey === String(threadKey || "main")
          && (!type || item.type === type) && ACTIVE.has(item.status))
        .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
      const record = matches[0] || null;
      if (!record) return null;
      if (Date.parse(record.expiresAt) <= now) {
        record.status = "expired";
        record.updatedAt = this.clock().toISOString();
        await this.#write(record);
        return null;
      }
      const encrypted = await fs.readFile(payloadFile(this.payloadRoot, record.id), "utf8");
      return { ...record, payload: JSON.parse(await this.unprotect(encrypted)) };
    });
  }

  async settle(id, { status = "settled" } = {}) {
    return this.processLock.run(async () => {
      const file = metadataFile(this.root, String(id));
      const current = JSON.parse(await fs.readFile(file, "utf8"));
      const next = { ...current, status: String(status), updatedAt: this.clock().toISOString() };
      await this.#write(next);
      return next;
    });
  }
}

export { ChannelContinuationStore };
