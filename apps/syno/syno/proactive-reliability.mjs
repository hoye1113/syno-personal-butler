import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";
import { ProcessFileLock } from "./process-lock.mjs";
import { runDpapi } from "./provider-credential-store.mjs";

const PROACTIVE_STATE_VERSION = 2;
const PROACTIVE_RESPONSE_KIND = "proactive";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function localDateKey(now) {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

function selectedBusinessFields(signal) {
  const event = {
    ...(signal?.ref || {}),
    ...(signal?.event?.ref || {}),
    ...(signal?.event || {}),
  };
  return {
    kind: signal?.kind || event.kind || "event",
    priority: signal?.priority ?? event.priority ?? null,
    status: event.status ?? null,
    stage: event.stage ?? null,
    state: event.state ?? null,
    severity: event.severity ?? null,
    risk: event.risk ?? null,
    dueAt: event.dueAt ?? null,
    expiresAt: event.expiresAt ?? null,
    deadline: event.deadline ?? null,
    businessVersion: event.businessVersion ?? null,
    version: event.version ?? null,
    updatedAt: event.updatedAt ?? null,
    sourceSummaryVersion: event.sourceSummaryVersion ?? null,
    proposalDigest: event.proposalDigest ?? null,
    sourceDigest: event.sourceDigest ?? null,
  };
}

function signalIdentity(signal, previous = {}) {
  const subjectKey = String(signal?.id || signal?.key || "");
  if (!subjectKey) throw new Error("主动信号缺少稳定 id/key");
  const prior = previous[subjectKey] || {};
  const episode = Math.max(1, Number(prior.episode) || 1) + (prior.active === false ? 1 : 0);
  const businessVersion = `v1:${digest(selectedBusinessFields(signal))}`;
  return { subjectKey, businessVersion, episode };
}

function compareSignals(a, b) {
  return Number(b.priority || 0) - Number(a.priority || 0)
    || String(a.dueAt || a.ref?.dueAt || "9999").localeCompare(String(b.dueAt || b.ref?.dueAt || "9999"))
    || String(a.id || a.key).localeCompare(String(b.id || b.key));
}

function bundleId(_now, identities, slot = "tick") {
  return `proactive-${slot}-${digest(identities).slice(0, 16)}`;
}

function buildProactiveBundle(signals, { now = new Date(), slot = "tick" } = {}) {
  const ordered = [...signals].sort(compareSignals);
  const identities = ordered.map((signal) => signal.identity);
  const visible = ordered.slice(0, 3).map((signal) => ({
    subjectKey: signal.identity.subjectKey,
    title: String(signal.title || signal.ref?.title || signal.id || signal.key),
    action: String(signal.action || "请确认下一步处理"),
    priority: Number(signal.priority || 0),
  }));
  return {
    bundleId: bundleId(now, identities, slot),
    signalVersions: identities,
    signalKinds: ordered.map((signal) => ({ subjectKey: signal.identity.subjectKey, kind: signal.kind, key: signal.key })),
    items: visible,
    remainingCount: Math.max(0, ordered.length - visible.length),
    slot,
    createdAt: now.toISOString(),
  };
}

function normalizeState(value = { version: PROACTIVE_STATE_VERSION }) {
  const sourceVersion = Number.isInteger(value.version) ? Number(value.version) : 1;
  const needsMigration = sourceVersion < PROACTIVE_STATE_VERSION;
  return {
    ...value,
    version: PROACTIVE_STATE_VERSION,
    date: String(value.date || ""),
    notificationsToday: Number(value.notificationsToday) || 0,
    lastRuns: { ...(value.lastRuns || {}) },
    subjects: { ...(value.subjects || {}) },
    pendingBundles: { ...(value.pendingBundles || {}) },
    pending: { ...(value.pending || {}) },
    recoveryFailures: { ...(value.recoveryFailures || {}) },
    lastPruned: value.lastPruned || "",
    lastEligibleSignals: Number(value.lastEligibleSignals) || 0,
    migratedFrom: needsMigration ? sourceVersion : value.migratedFrom,
    migration: needsMigration
      ? { fromVersion: sourceVersion, status: "pending" }
      : value.migration,
  };
}

async function atomicWriteText(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, String(value), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, file);
  await fs.chmod(file, 0o600).catch(() => {});
}

async function atomicWriteJson(file, value) {
  await atomicWriteText(file, `${JSON.stringify(value, null, 2)}\n`);
}

function payloadFile(root, ref) {
  if (!/^[a-f0-9]{64}-[a-f0-9-]{36}$/i.test(String(ref || ""))) {
    throw Object.assign(new Error("渠道目标 payloadRef 非法"), { code: "CHANNEL_TARGET_METADATA_INVALID" });
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, `${ref}.dpapi`);
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw Object.assign(new Error("渠道目标 payloadRef 越界"), { code: "CHANNEL_TARGET_METADATA_INVALID" });
  }
  return resolved;
}
function metadataFile(root, ownerKey, channel) { return path.join(root, `${digest({ ownerKey, channel })}.json`); }

class OwnerChannelTargetStore {
  constructor({ root = path.join(PATHS.stateRoot, "owner-channel-targets"), payloadRoot = path.join(PATHS.stateRoot, "owner-channel-target-payloads"), protect = (value) => runDpapi("protect", value), unprotect = (value) => runDpapi("unprotect", value), processLock, clock = () => new Date() } = {}) {
    this.root = path.resolve(root);
    this.payloadRoot = path.resolve(payloadRoot);
    this.protect = protect;
    this.unprotect = unprotect;
    this.processLock = processLock || new ProcessFileLock({ file: path.join(this.root, ".targets.lock"), timeoutMs: 30_000 });
    this.clock = clock;
  }

  async set(ownerKey, channel, target) {
    if (!ownerKey || !channel || !target || typeof target !== "object") throw new Error("OwnerChannelTargetStore 缺少身份或目标");
    const allowed = channel === "weixin" ? ["toUserId", "contextToken"] : channel === "feishu" ? ["chatId"] : [];
    if (!allowed.length || allowed.some((key) => !String(target[key] || ""))) throw new Error("渠道目标不完整");
    return this.processLock.run(async () => {
      const metadataPath = metadataFile(this.root, ownerKey, channel);
      let prior = null;
      try { prior = JSON.parse(await fs.readFile(metadataPath, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
      if (prior?.payloadRef) payloadFile(this.payloadRoot, prior.payloadRef);
      const payloadRef = `${digest({ ownerKey, channel })}-${randomUUID()}`;
      const updatedAt = this.clock().toISOString();
      await fs.mkdir(this.payloadRoot, { recursive: true });
      await atomicWriteText(payloadFile(this.payloadRoot, payloadRef), await this.protect(JSON.stringify(Object.fromEntries(allowed.map((key) => [key, String(target[key])])))));
      await atomicWriteJson(metadataPath, {
        version: 1,
        ownerKey: String(ownerKey),
        channel: String(channel),
        payloadRef,
        updatedAt,
      });
      if (prior?.payloadRef && prior.payloadRef !== payloadRef) {
        await fs.rm(payloadFile(this.payloadRoot, prior.payloadRef), { force: true }).catch(() => {});
      }
      return { ownerKey: String(ownerKey), channel: String(channel), updatedAt };
    });
  }

  async get(ownerKey, channel) {
    return this.processLock.run(async () => {
      try {
        const metadata = JSON.parse(await fs.readFile(metadataFile(this.root, ownerKey, channel), "utf8"));
        const plaintext = await this.unprotect(await fs.readFile(payloadFile(this.payloadRoot, metadata.payloadRef), "utf8"));
        return JSON.parse(plaintext);
      } catch (error) {
        if (error.code === "ENOENT") return null;
        if (error.code === "CHANNEL_TARGET_METADATA_INVALID") throw error;
        throw Object.assign(new Error("渠道目标无法解密"), { code: "CHANNEL_TARGET_UNAVAILABLE", cause: error });
      }
    });
  }

  // 只读 metadata，不触发 DPAPI 解密；供 deliveryHealth 推算 token 年龄等诊断字段。
  async meta(ownerKey, channel) {
    return this.processLock.run(async () => {
      try {
        const metadata = JSON.parse(await fs.readFile(metadataFile(this.root, ownerKey, channel), "utf8"));
        return { ownerKey: metadata.ownerKey, channel: metadata.channel, updatedAt: metadata.updatedAt || null };
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
    });
  }
}

export {
  PROACTIVE_RESPONSE_KIND,
  PROACTIVE_STATE_VERSION,
  OwnerChannelTargetStore,
  buildProactiveBundle,
  canonicalize,
  digest,
  localDateKey,
  normalizeState,
  selectedBusinessFields,
  signalIdentity,
};
