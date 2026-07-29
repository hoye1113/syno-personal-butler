import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { ProcessFileLock } from "./process-lock.mjs";
import { PATHS } from "./paths.mjs";
import { runDpapi } from "./provider-credential-store.mjs";

const EFFECT_RECEIPT_VERSION = 1;

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

function fileKey(toolInvocationKey) {
  return createHash("sha256").update(String(toolInvocationKey), "utf8").digest("hex");
}

function metadataFile(root, key) { return path.join(root, `${key}.json`); }
function payloadFile(root, key) { return path.join(root, `${key}.dpapi`); }

class EffectReceiptStore {
  constructor({
    root = path.join(PATHS.stateRoot, "effect-receipts"),
    payloadRoot = path.join(PATHS.stateRoot, "effect-receipt-payloads"),
    lockFile = path.join(PATHS.stateRoot, "locks", "effect-receipts.lock"),
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

  async #ensureRoots() {
    await Promise.all([fs.mkdir(this.root, { recursive: true }), fs.mkdir(this.payloadRoot, { recursive: true })]);
  }

  async #readByKeyUnlocked(key) {
    try {
      return JSON.parse(await fs.readFile(metadataFile(this.root, key), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }

  async #writePayload(key, payload) {
    const body = canonicalize(payload);
    await atomicWrite(payloadFile(this.payloadRoot, key), await this.protect(JSON.stringify(body)));
    return digest(body);
  }

  async #readPayload(record) {
    const encrypted = await fs.readFile(payloadFile(this.payloadRoot, record.payloadRef), "utf8");
    const payload = JSON.parse(await this.unprotect(encrypted));
    if (digest(payload) !== record.payloadDigest) throw Object.assign(new Error("Effect Receipt payload digest 不匹配"), { code: "EFFECT_RECEIPT_PAYLOAD_TAMPERED" });
    return payload;
  }

  async begin({ toolInvocationKey, toolName, ownerKey = "local-user", argumentsDigest } = {}) {
    const key = fileKey(toolInvocationKey);
    if (!toolInvocationKey || !toolName || !argumentsDigest) throw new Error("Effect Receipt 缺少 toolInvocationKey/toolName/argumentsDigest");
    return this.processLock.run(async () => {
      await this.#ensureRoots();
      const existing = await this.#readByKeyUnlocked(key);
      if (existing) {
        if (existing.toolInvocationKey !== String(toolInvocationKey)) throw Object.assign(new Error("Effect Receipt identity collision"), { code: "TOOL_INVOCATION_IDENTITY_CONFLICT" });
        if (existing.argumentsDigest !== String(argumentsDigest)) throw Object.assign(new Error("Tool Invocation 参数与既有事实不一致"), { code: "TOOL_INVOCATION_IDENTITY_CONFLICT" });
        return { created: false, receipt: existing };
      }
      const now = this.clock().toISOString();
      const record = {
        version: EFFECT_RECEIPT_VERSION,
        receiptId: `effect-${key.slice(0, 24)}`,
        ownerKey: String(ownerKey || "local-user"),
        toolName: String(toolName),
        toolInvocationKey: String(toolInvocationKey),
        argumentsDigest: String(argumentsDigest),
        status: "pending",
        directEffect: { status: "pending", toolInvocationKey: String(toolInvocationKey), occurredAt: null },
        businessOutcome: { status: "pending" },
        payloadRef: key,
        payloadDigest: null,
        createdAt: now,
        updatedAt: now,
      };
      await atomicWrite(metadataFile(this.root, key), `${JSON.stringify(record, null, 2)}\n`);
      return { created: true, receipt: record };
    });
  }

  async commit({ toolInvocationKey, toolName, ownerKey, argumentsDigest, result, directEffect, businessOutcome } = {}) {
    const key = fileKey(toolInvocationKey);
    return this.processLock.run(async () => {
      const current = await this.#readByKeyUnlocked(key);
      if (!current) throw Object.assign(new Error("Effect Receipt 尚未 begin"), { code: "EFFECT_RECEIPT_MISSING" });
      if (current.argumentsDigest !== String(argumentsDigest)) throw Object.assign(new Error("Tool Invocation 参数与既有事实不一致"), { code: "TOOL_INVOCATION_IDENTITY_CONFLICT" });
      if (current.status === "committed") return { created: false, receipt: current, payload: await this.#readPayload(current) };
      const payload = { result, directEffect, businessOutcome };
      const payloadDigest = await this.#writePayload(key, payload);
      const next = {
        ...current,
        ownerKey: String(ownerKey || current.ownerKey),
        toolName: String(toolName || current.toolName),
        status: "committed",
        directEffect,
        businessOutcome,
        payloadDigest,
        updatedAt: this.clock().toISOString(),
      };
      await atomicWrite(metadataFile(this.root, key), `${JSON.stringify(next, null, 2)}\n`);
      return { created: true, receipt: next, payload };
    });
  }

  async get(toolInvocationKey, { includePayload = false } = {}) {
    const key = fileKey(toolInvocationKey);
    const record = await this.#readByKeyUnlocked(key);
    if (!record) return null;
    if (!includePayload || !record.payloadDigest) return record;
    return { ...record, payload: await this.#readPayload(record) };
  }

  async list({ status, limit = 100 } = {}) {
    await this.#ensureRoots();
    const names = (await fs.readdir(this.root)).filter((name) => name.endsWith(".json"));
    const records = [];
    for (const name of names) {
      try {
        const record = JSON.parse(await fs.readFile(path.join(this.root, name), "utf8"));
        if (record?.version === EFFECT_RECEIPT_VERSION && (!status || record.status === status)) records.push(record);
      } catch {}
    }
    return records.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))).slice(-Math.max(1, Number(limit) || 100));
  }
}

export { EFFECT_RECEIPT_VERSION, EffectReceiptStore, canonicalize, digest };
