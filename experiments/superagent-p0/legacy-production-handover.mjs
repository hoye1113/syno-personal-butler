// P4.3-B: default-off bridge for the legacy Host during a P4 cutover.
// The bridge never owns business state: it reuses the shared handover log and host status view.
import { randomUUID } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { applyRoute, executeNative, openBusinessView } from "../../packages/syno-autoloop/examples/syno-p0/commands.ts";
import { parseRules } from "../../packages/syno-autoloop/protocol/rules.ts";
import { buildHostStatus } from "./host-operations.mjs";
import { openHostHandover } from "./host-handover.mjs";
import { resolveRealFeishuConfig } from "./real-feishu-config.mjs";

export const LEGACY_HANDOVER_ERROR = Object.freeze({
  MODE_REQUIRED: "P43B_LEGACY_HANDOVER_MODE_REQUIRED",
  DISABLED: "P43B_LEGACY_HANDOVER_DISABLED",
  MISSING_DATABASE: "P43B_LEGACY_HANDOVER_MISSING_DATABASE",
  MISSING_STATUS: "P43B_LEGACY_HANDOVER_MISSING_STATUS",
  MISSING_APP_ID: "P43B_LEGACY_HANDOVER_MISSING_APP_ID",
  LOCAL_DATA_MISMATCH: "P43B_LEGACY_HANDOVER_LOCAL_DATA_MISMATCH",
  KNOWLEDGE_MISMATCH: "P43B_LEGACY_HANDOVER_KNOWLEDGE_MISMATCH",
  SHUTDOWN_FAILED: "HOST_SHUTDOWN_FAILED",
});

export const LEGACY_HANDOVER_FLAG = "SYNO_P4_LEGACY_HANDOVER";
export const LEGACY_HANDOVER_ENABLED = "enabled";
// Same copy the Feishu adapter uses when a handler returns no text.
export const LEGACY_DEFAULT_REPLY_TEXT = "任务已记录，请在 Syno 查看状态。";
// Reserved history identity: no business rule subscribes to this source, so recording a before reply can
// never enqueue a Worker/Task. The type keeps the event readable next to other reply traffic.
export const LEGACY_REPLY_SOURCE = "legacy-handover";
export const LEGACY_REPLY_TYPE = "reply.request";
const LEGACY_REPLY_SUMMARY = "旧 Host 普通文本回复";
const LEGACY_REPLY_ENVIRONMENT = { secret: "syno-p43b-legacy-reply", publicUrl: "" };
const LEGACY_REPLY_CONTEXT_PREFIX = "capture:legacy_reply_";
const legacyReplyContextId = (messageId) => `${LEGACY_REPLY_CONTEXT_PREFIX}${messageId}`;
const LEGACY_BASELINE_TIMEZONE = "Asia/Shanghai";
const LEGACY_BASELINE_RULES = Object.freeze({
  timezone: LEGACY_BASELINE_TIMEZONE,
  sources: {},
  agents: {},
  rules: [],
});

export class LegacyHandoverError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = "LegacyHandoverError";
    this.code = code;
  }
}

const requiredString = (value, code, field) => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new LegacyHandoverError(code, `${field} 必须是非空字符串`);
  }
  return value;
};

function writeStatusAtomic(file, payload) {
  const directory = path.dirname(file);
  mkdirSync(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`);
  writeFileSync(temporary, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  renameSync(temporary, file);
}

/**
 * Pure startup gate. `null` keeps the legacy Host untouched; any half-configured production
 * consumer fails closed instead of silently degrading to a bridge-less Host.
 */
export function resolveLegacyHandoverStartup(env = process.env) {
  const mode = env.SYNO_P0_RUNTIME_MODE;
  const flag = env[LEGACY_HANDOVER_FLAG];
  const flagExplicit = typeof flag === "string" && flag.trim() !== "";
  if (!flagExplicit && mode !== "production") return null;
  if (mode !== "production") {
    throw new LegacyHandoverError(LEGACY_HANDOVER_ERROR.MODE_REQUIRED, `${LEGACY_HANDOVER_FLAG} 只能在 production 模式启用`);
  }
  if (flag !== LEGACY_HANDOVER_ENABLED) {
    throw new LegacyHandoverError(LEGACY_HANDOVER_ERROR.DISABLED, `production 模式必须显式设置 ${LEGACY_HANDOVER_FLAG}=enabled`);
  }
  // Reuses P4.3-A validation for the same production App, roots and derived paths.
  return resolveRealFeishuConfig(env);
}

const samePath = (left, right) => typeof left === "string" && typeof right === "string"
  && path.resolve(left) === path.resolve(right);

/**
 * Pure path-consistency gate for the production bridge. The legacy adapter derives its credential
 * store, `feishu-channel.json` and exclusive lock from the static `PATHS`; the new Runtime derives
 * the same files from the P4.3-A config. Both must resolve to one root, otherwise two consumers
 * would hold different locks over split state. `runtimeRoot` is deliberately not compared: the old
 * Host keeps its own `.runtime`, only the bridge/DB use `config.runtimeRoot`. A `null` config
 * (isolated mode or bridge disabled) adds no constraint. Messages stay stable and secret-free.
 */
export function assertLegacyHandoverPaths({ config, paths } = {}) {
  if (!config) return null;
  if (!paths) {
    throw new LegacyHandoverError(LEGACY_HANDOVER_ERROR.LOCAL_DATA_MISMATCH, "缺少旧 PATHS，无法核对生产配置");
  }
  if (!samePath(paths.localDataRoot, config.localDataRoot)) {
    throw new LegacyHandoverError(
      LEGACY_HANDOVER_ERROR.LOCAL_DATA_MISMATCH,
      "旧 SYNO_LOCAL_DATA 必须与 SYNO_P0_LOCAL_DATA_ROOT 指向同一目录（凭据、feishu-channel.json 与锁文件）",
    );
  }
  if (!samePath(paths.knowledgeRoot, config.knowledgeRoot)) {
    throw new LegacyHandoverError(
      LEGACY_HANDOVER_ERROR.KNOWLEDGE_MISMATCH,
      "旧 SYNO_KNOWLEDGE_ROOT 必须与 SYNO_P0_KNOWLEDGE_ROOT 指向同一目录",
    );
  }
  return config;
}

/**
 * A fresh unified DB has no rules yet; the real old Host never had one either. The reserved reply source
 * needs a rules view to ingest against (it matches no business rule), so the bridge seeds the minimal empty
 * configuration exactly once. Existing rules belong to the owner and are never overwritten.
 */
function ensureLegacyRulesBaseline(db, at) {
  if (openBusinessView(db).get("config", "rules")) return false;
  const rules = parseRules(JSON.stringify(LEGACY_BASELINE_RULES), at, LEGACY_BASELINE_TIMEZONE);
  executeNative(db, "rules", [rules], at, LEGACY_REPLY_ENVIRONMENT);
  return true;
}

export function openLegacyProductionHandover({
  databasePath,
  statusFile,
  appId,
  instanceId = randomUUID(),
  pid = process.pid,
  now = () => Date.now(),
} = {}) {
  requiredString(databasePath, LEGACY_HANDOVER_ERROR.MISSING_DATABASE, "databasePath");
  requiredString(statusFile, LEGACY_HANDOVER_ERROR.MISSING_STATUS, "statusFile");
  requiredString(appId, LEGACY_HANDOVER_ERROR.MISSING_APP_ID, "appId");

  mkdirSync(path.dirname(databasePath), { recursive: true });
  // Same durability posture as the existing native Runtime sharing this file.
  const db = new DatabaseSync(databasePath);
  let handover;
  try {
    db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
    openBusinessView(db);
    ensureLegacyRulesBaseline(db, now());
    handover = openHostHandover({ db, now, instanceId });
  } catch (error) {
    db.close();
    throw error;
  }

  let closed = false;

  function refreshStatus(extra = {}) {
    const snapshot = buildHostStatus({ db, now, handover });
    const payload = {
      ...snapshot,
      ...extra,
      schema: snapshot.schema,
      instanceId,
      pid,
      appId,
      running: extra.running ?? true,
      observedAt: now(),
    };
    writeStatusAtomic(statusFile, payload);
    return payload;
  }

  async function handleMessage(message, delegate, deliver) {
    if (typeof delegate !== "function") throw new Error("legacy handover 需要旧 delegate 回调");
    if (typeof deliver !== "function") throw new Error("legacy handover 需要旧 deliver 回调");
    const messageId = message?.id ?? message?.messageId;
    const ownerId = message?.senderId ?? message?.ownerId;
    const intake = handover.intake({
      appId,
      messageId,
      chatId: message?.chatId,
      ownerId,
      worker: message?.worker || "OpenCode",
      text: message?.text,
    });
    if (intake.status === "spooled") return { deferredDelivery: true };

    // A throwing legacy delegate must reach the old adapter unchanged so its pending/retry stays authoritative.
    const result = await delegate(message);
    if (result?.deferredDelivery === true) return result;

    // P4.2 verifies exactly one event and one processed inbox for every before reply. Record that read-only
    // history before the external send, so an accepted reply can never outlive missing before evidence.
    // The reserved source cannot match a business rule, and the unique per-message context keeps the
    // route receipt idempotent without touching any Task/Attempt/delivery.
    const contextId = legacyReplyContextId(messageId);
    const at = now();
    executeNative(db, "ingest", [LEGACY_REPLY_SOURCE, {
      id: messageId,
      type: LEGACY_REPLY_TYPE,
      subject: contextId,
      summary: LEGACY_REPLY_SUMMARY,
      detail: JSON.stringify({ appId, chatId: message?.chatId, ownerId }),
    }], at, LEGACY_REPLY_ENVIRONMENT);
    applyRoute(db, {
      commandId: `route:legacy-reply:${JSON.stringify([appId, messageId])}`,
      appId,
      messageId,
      contextId,
      expectedVersion: null,
      ownerId,
      replyTo: message.chatId,
      now: at,
    });

    const text = typeof result?.text === "string" && result.text ? result.text : LEGACY_DEFAULT_REPLY_TEXT;
    await handover.sendReply({
      appId,
      messageId,
      chatId: message.chatId,
      ownerId,
      text,
      deliver: async () => {
        const delivered = await deliver({ appId, messageId, chatId: message.chatId, ownerId, text });
        if (delivered === true) return { accepted: true, providerMessageId: null };
        if (delivered?.delivered === true) {
          return {
            accepted: true,
            providerMessageId: typeof delivered.providerMessageId === "string" ? delivered.providerMessageId : null,
          };
        }
        return { accepted: false, reason: delivered?.reason ?? "delivery_not_accepted" };
      },
    });
    // The bridge already sent (or held) the reply; the adapter must not send a second one.
    return { deferredDelivery: true };
  }

  function freeze(reason = "legacy-handover") {
    const outcome = handover.freeze({ reason });
    refreshStatus();
    return outcome;
  }

  function close() {
    if (closed) return;
    let failure = null;
    try {
      refreshStatus({ running: false, lifecycle: "stopped", stoppedAt: now() });
    } catch (error) {
      failure = error;
    }
    try {
      db.close();
    } catch (error) {
      failure ??= error;
    }
    closed = true;
    if (failure) throw failure;
  }

  return {
    databasePath,
    statusFile,
    instanceId,
    pid,
    appId,
    handover,
    handleMessage,
    freeze,
    refreshStatus,
    close,
  };
}

/** SIGUSR1 freezes; SIGUSR2 only refreshes. Failures are logged with stable codes, never silently accepted. */
export function installLegacyHandoverSignals({ target = process, bridge, logger = console } = {}) {
  if (!bridge) throw new Error("安装 legacy handover 信号需要 bridge");
  const report = (stage) => (error) => {
    const detail = error?.code || error?.message || "unknown";
    logger.error?.(`[syno] legacy handover ${stage} failed: ${detail}`);
  };
  const onFreeze = () => {
    try {
      bridge.freeze("sigusr1-freeze");
    } catch (error) {
      report("freeze")(error);
    }
  };
  const onRefresh = () => {
    try {
      bridge.refreshStatus({ signal: "sigusr2" });
    } catch (error) {
      report("status")(error);
    }
  };
  target.on("SIGUSR1", onFreeze);
  target.on("SIGUSR2", onRefresh);
  return () => {
    target.off?.("SIGUSR1", onFreeze);
    target.off?.("SIGUSR2", onRefresh);
  };
}

/**
 * One shutdown ladder: stop the legacy adapter/timers first, then close the bridge, then release
 * exclusivity. Every attempted step is visible; the first failure is rethrown after cleanup.
 */
export function createLegacyHandoverShutdown({ runtime, bridge, hostLease, stopHttp } = {}) {
  let closing = null;
  const attempt = async (task) => {
    try {
      await task?.();
      return null;
    } catch (error) {
      return error;
    }
  };
  return () => {
    if (closing) return closing;
    closing = (async () => {
      const failures = [];
      for (const task of [
        () => runtime?.close?.(),
        () => bridge?.close?.(),
        () => stopHttp?.(),
        () => hostLease?.release?.(),
      ]) {
        const failure = await attempt(task);
        if (failure) failures.push(failure);
      }
      if (failures.length) {
        throw Object.assign(new Error("legacy Host shutdown failed"), {
          code: LEGACY_HANDOVER_ERROR.SHUTDOWN_FAILED,
          errors: failures,
        });
      }
    })().catch((error) => {
      closing = null;
      throw error;
    });
    return closing;
  };
}
