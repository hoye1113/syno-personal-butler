// P3.4 deterministic handover: persistent freeze spool and a one-way reply state machine in the shared fact log.
import { randomUUID } from "node:crypto";
import { FORMAT, applyRoute, executeNative, openBusinessView } from "../../packages/syno-autoloop/examples/syno-p0/commands.ts";
import { rows } from "../../packages/syno-autoloop/kernel/evolve.ts";
import { commitLatest } from "../../packages/syno-autoloop/kernel/store.ts";
import { ProcessFileLock } from "../../packages/syno-core/process-lock.mjs";

export const HANDOVER_SCHEMA = "syno-handover-status-v1";
const CONTROL_KEY = "handover:control";
const SPOOL_PREFIX = "handover:spool:";
const REPLY_PREFIX = "handover:reply:";

// Reserved history identity matching the legacy bridge. No business rule subscribes to this source, so
// recording an ordinary reply can never enqueue a Task/Attempt/delivery.
const REPLY_EVIDENCE_SOURCE = "legacy-handover";
const REPLY_EVIDENCE_TYPE = "reply.request";
const REPLY_EVIDENCE_SUMMARY = "普通文本回复";
const REPLY_EVIDENCE_ENVIRONMENT = Object.freeze({ secret: "syno-p43b-legacy-reply", publicUrl: "" });
const REPLY_EVIDENCE_CONTEXT_PREFIX = "capture:legacy_reply_";
const replyEvidenceContextId = (messageId) => `${REPLY_EVIDENCE_CONTEXT_PREFIX}${messageId}`;

const spoolKey = (appId, messageId) => `${SPOOL_PREFIX}${JSON.stringify([appId, messageId])}`;
const replyKey = (appId, messageId) => `${REPLY_PREFIX}${JSON.stringify([appId, messageId])}`;

function sanitizeReason(value, fallback = "unspecified") {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return text ? text.slice(0, 160) : fallback;
}

function validateMessage(message) {
  for (const field of ["appId", "messageId", "chatId", "ownerId", "worker"]) {
    if (typeof message?.[field] !== "string" || !message[field]) {
      throw new Error(`冻结 spool 缺少 ${field}`);
    }
  }
  if (typeof message.text !== "string") throw new Error("冻结 spool 缺少 text");
  return message;
}

function sameSpoolContent(row, message) {
  return row.appId === message.appId
    && row.messageId === message.messageId
    && row.chatId === message.chatId
    && row.ownerId === message.ownerId
    && row.worker === message.worker
    && row.text === message.text;
}

/**
 * Persist the read-only event + processed inbox pair for an ordinary reply. This is the same reserved
 * history the legacy bridge writes before its reply; it deliberately creates no Task/Attempt/delivery.
 * If both records already exist (legacy path, fixture or replay), this is a no-op. A partial pair is
 * refused so an accepted reply can never outlive a missing event or inbox.
 */
export function recordReplyEvidence({
  db, appId, messageId, chatId, ownerId, summary = REPLY_EVIDENCE_SUMMARY, at = Date.now(),
}) {
  for (const [field, value] of Object.entries({ appId, messageId, chatId, ownerId })) {
    if (typeof value !== "string" || !value) throw new Error(`回复证据缺少 ${field}`);
  }
  const view = openBusinessView(db);
  const event = rows(view, "events").find((row) => row.key === messageId);
  const inbox = view.get("records", `inbox:${JSON.stringify([appId, messageId])}`);
  if (event && inbox) {
    return { status: "recorded", duplicate: true, contextId: inbox.receipt?.contextId ?? event.subject ?? null };
  }
  if (event || inbox) throw new Error("回复证据不完整：event 与 processed inbox 必须同时存在");

  const contextId = replyEvidenceContextId(messageId);
  executeNative(db, "ingest", [REPLY_EVIDENCE_SOURCE, {
    id: messageId,
    type: REPLY_EVIDENCE_TYPE,
    subject: contextId,
    summary,
    detail: JSON.stringify({ appId, chatId, ownerId }),
  }], at, REPLY_EVIDENCE_ENVIRONMENT);
  applyRoute(db, {
    commandId: `route:legacy-reply:${JSON.stringify([appId, messageId])}`,
    appId,
    messageId,
    contextId,
    expectedVersion: null,
    ownerId,
    replyTo: chatId,
    now: at,
  });
  return { status: "recorded", duplicate: false, contextId };
}

export function openHostHandover({ db, now = () => Date.now(), instanceId = randomUUID() }) {
  openBusinessView(db);
  const commit = (type, produce) => commitLatest(db, FORMAT, (current) => {
    const changes = produce(current);
    if (!changes.length) return [];
    return [{ version: 1, seq: current.seq + 1, at: now(), type, changes }];
  });
  const record = (key, row) => ({ table: "records", key, row });

  function controlOf(current) {
    return current.get("records", CONTROL_KEY) ?? {
      key: CONTROL_KEY,
      kind: "handover_control",
      frozen: false,
      generation: 0,
      reason: null,
      updatedAt: null,
    };
  }

  function control() {
    return { ...controlOf(openBusinessView(db)) };
  }

  function freeze({ reason = "cutover" } = {}) {
    let outcome = null;
    commit("syno.handover_freeze", (current) => {
      const prior = controlOf(current);
      if (prior.frozen) {
        outcome = { status: "already_frozen", control: { ...prior } };
        return [];
      }
      const next = {
        ...prior,
        key: CONTROL_KEY,
        kind: "handover_control",
        frozen: true,
        generation: (Number.isSafeInteger(prior.generation) ? prior.generation : 0) + 1,
        reason: sanitizeReason(reason, "cutover"),
        updatedAt: now(),
      };
      outcome = { status: "frozen", control: next };
      return [record(CONTROL_KEY, next)];
    });
    return outcome;
  }

  function unfreeze({ reason = "cutover-complete" } = {}) {
    let outcome = null;
    commit("syno.handover_unfreeze", (current) => {
      const prior = controlOf(current);
      if (!prior.frozen) {
        outcome = { status: "already_unfrozen", control: { ...prior } };
        return [];
      }
      const next = {
        ...prior,
        key: CONTROL_KEY,
        kind: "handover_control",
        frozen: false,
        reason: sanitizeReason(reason, "cutover-complete"),
        updatedAt: now(),
      };
      outcome = { status: "unfrozen", control: next };
      return [record(CONTROL_KEY, next)];
    });
    return outcome;
  }

  function ensureSpool(current, message, generation) {
    validateMessage(message);
    const key = spoolKey(message.appId, message.messageId);
    const prior = current.get("records", key);
    if (prior) {
      if (!sameSpoolContent(prior, message)) throw new Error("同一消息的冻结 spool 内容冲突");
      return { changes: [], item: prior, duplicate: true };
    }
    const row = {
      key,
      kind: "handover_spool",
      id: message.messageId,
      appId: message.appId,
      messageId: message.messageId,
      chatId: message.chatId,
      ownerId: message.ownerId,
      worker: message.worker,
      text: message.text,
      state: "frozen",
      freezeGeneration: generation,
      attempts: 0,
      ownerInstanceId: null,
      claimedAt: null,
      holdReason: null,
      forwardedAt: null,
      forwardReceipt: null,
      createdAt: now(),
      updatedAt: now(),
    };
    return { changes: [record(key, row)], item: row, duplicate: false };
  }

  /**
   * Atomic with the freeze gate, so a message cannot land between "not frozen" and a spool write.
   * A known spool always wins over the current control: an adapter pending recovered after unfreeze must never
   * become immediate and race the drain/forward of the same message. Only an unseen message under an unfrozen
   * control is routed immediately.
   */
  function intake(message) {
    let outcome = null;
    commit("syno.handover_intake", (current) => {
      const currentControl = controlOf(current);
      validateMessage(message);
      const key = spoolKey(message.appId, message.messageId);
      const prior = current.get("records", key);
      if (prior) {
        if (prior.kind !== "handover_spool" || !sameSpoolContent(prior, message)) {
          throw new Error("同一消息的冻结 spool 内容冲突");
        }
        outcome = {
          status: "spooled",
          duplicate: true,
          control: { ...currentControl },
          item: { ...prior },
        };
        return [];
      }
      if (!currentControl.frozen) {
        outcome = { status: "immediate", control: { ...currentControl } };
        return [];
      }
      const ensured = ensureSpool(current, message, currentControl.generation);
      outcome = {
        status: "spooled",
        duplicate: ensured.duplicate,
        control: { ...currentControl },
        item: { ...ensured.item },
      };
      return ensured.changes;
    });
    return outcome;
  }

  function spool(message) {
    let outcome = null;
    commit("syno.handover_spool", (current) => {
      const currentControl = controlOf(current);
      if (!currentControl.frozen) throw new Error("Host 未冻结，不能写入冻结 spool");
      const ensured = ensureSpool(current, message, currentControl.generation);
      outcome = { duplicate: ensured.duplicate, item: { ...ensured.item } };
      return ensured.changes;
    });
    return outcome;
  }

  /**
   * Claim one frozen spool inside a single write transaction. A second process sees `dispatching` and cannot
   * claim the same message, even when both started from the same `frozen` read.
   */
  function claimNextFrozen() {
    let item = null;
    commit("syno.handover_claim", (current) => {
      const next = rows(current, "records")
        .filter((row) => row.kind === "handover_spool" && row.state === "frozen")
        .sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0) || left.key.localeCompare(right.key))[0];
      if (!next) return [];
      const claimed = {
        ...next,
        state: "dispatching",
        attempts: (Number.isSafeInteger(next.attempts) ? next.attempts : 0) + 1,
        ownerInstanceId: instanceId,
        claimedAt: now(),
        updatedAt: now(),
      };
      item = claimed;
      return [record(next.key, claimed)];
    });
    return item;
  }

  function markForwarded(key, result) {
    let item = null;
    commit("syno.handover_forwarded", (current) => {
      const prior = current.get("records", key);
      if (!prior || prior.kind !== "handover_spool" || prior.state !== "dispatching"
        || prior.ownerInstanceId !== instanceId) return [];
      const next = {
        ...prior,
        state: "forwarded",
        forwardedAt: now(),
        updatedAt: now(),
        forwardReceipt: typeof result?.receipt === "string" ? result.receipt.slice(0, 160) : null,
      };
      item = next;
      return [record(key, next)];
    });
    return item;
  }

  function markHold(key, reason) {
    let item = null;
    commit("syno.handover_hold", (current) => {
      const prior = current.get("records", key);
      if (!prior || prior.kind !== "handover_spool" || prior.state !== "dispatching"
        || prior.ownerInstanceId !== instanceId) return [];
      const next = {
        ...prior,
        state: "hold",
        holdReason: sanitizeReason(reason, "dispatch_failed"),
        holdAt: now(),
        updatedAt: now(),
      };
      item = next;
      return [record(key, next)];
    });
    return item;
  }

  /** Only an explicit takeover receipt proves the old Specialist accepted the task; a missing/ambiguous reply is a hold. */
  function forwardAccepted(result) {
    return result === true || result?.accepted === true || result?.status === "accepted";
  }

  /** Drain only clearly `frozen` rows. A `dispatching`/`hold` row is never replayed by a new Host. */
  async function drainFrozen({ forward, limit = 100 } = {}) {
    if (typeof forward !== "function") throw new Error("drainFrozen 需要 forward 回调");
    if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("drainFrozen 需要正整数上限");
    const outcomes = [];
    for (let index = 0; index < limit; index += 1) {
      const claimed = claimNextFrozen();
      if (!claimed) break;
      try {
        const result = await forward({
          appId: claimed.appId,
          messageId: claimed.messageId,
          chatId: claimed.chatId,
          ownerId: claimed.ownerId,
          worker: claimed.worker,
          text: claimed.text,
        });
        if (!forwardAccepted(result)) {
          const held = markHold(claimed.key, result?.reason ?? "dispatch_not_accepted");
          outcomes.push({ status: "hold", item: held, reason: result?.reason ?? "dispatch_not_accepted" });
        } else {
          const forwarded = markForwarded(claimed.key, result);
          outcomes.push({ status: "forwarded", item: forwarded });
        }
      } catch (error) {
        const held = markHold(claimed.key, error?.message);
        outcomes.push({ status: "hold", item: held, reason: sanitizeReason(error?.message, "dispatch_failed") });
      }
    }
    return outcomes;
  }

  /**
   * Explicit recovery after the caller has acquired exclusivity. It never replays and never assumes the external
   * side effect did not happen: interrupted dispatch/reply rows become human-reconciliation holds.
   */
  function recoverInterrupted({ reason = "interrupted_before_confirmation" } = {}) {
    const counts = { spool: 0, reply: 0 };
    commit("syno.handover_recover_interrupted", (current) => {
      const changes = [];
      for (const prior of rows(current, "records")) {
        if (prior.kind === "handover_spool" && prior.state === "dispatching") {
          counts.spool += 1;
          changes.push(record(prior.key, {
            ...prior,
            state: "hold",
            holdReason: sanitizeReason(reason, "interrupted_before_confirmation"),
            holdAt: now(),
            updatedAt: now(),
          }));
        }
        if (prior.kind === "handover_reply" && prior.state === "sending") {
          counts.reply += 1;
          changes.push(record(prior.key, {
            ...prior,
            state: "hold",
            holdReason: sanitizeReason(reason, "interrupted_before_confirmation"),
            holdAt: now(),
            updatedAt: now(),
          }));
        }
      }
      return changes;
    });
    return { status: "recovered", ...counts };
  }

  function markReplyHold(key, reason) {
    let item = null;
    commit("syno.handover_reply_hold", (current) => {
      const prior = current.get("records", key);
      if (!prior || prior.kind !== "handover_reply" || prior.state !== "sending") return [];
      const next = {
        ...prior,
        state: "hold",
        holdReason: sanitizeReason(reason, "delivery_failed"),
        holdAt: now(),
        updatedAt: now(),
      };
      item = next;
      return [record(key, next)];
    });
    return item;
  }

  /**
   * Persist `sending` before the external call. Only an explicit accepted result becomes terminal; a throw or a
   * process exit leaves `sending`/`hold`, which no new Host will redeliver.
   */
  async function sendReply(input) {
    const { appId, messageId, chatId, ownerId, text, deliver } = input ?? {};
    for (const [field, value] of Object.entries({ appId, messageId, chatId, ownerId })) {
      if (typeof value !== "string" || !value) throw new Error(`文本回复缺少 ${field}`);
    }
    if (typeof text !== "string") throw new Error("文本回复缺少 text");
    if (typeof deliver !== "function") throw new Error("文本回复需要 deliver 回调");
    const key = replyKey(appId, messageId);
    let outcome = null;
    commit("syno.handover_reply", (current) => {
      const prior = current.get("records", key);
      if (prior) {
        if (prior.appId !== appId || prior.messageId !== messageId || prior.chatId !== chatId
          || prior.ownerId !== ownerId || prior.text !== text) {
          throw new Error("同一消息的文本回复内容冲突");
        }
        if (prior.state === "accepted") {
          outcome = { status: "accepted", duplicate: true, item: { ...prior } };
        } else if (prior.state === "sending") {
          outcome = { status: "hold", duplicate: true, reason: "interrupted_sending", item: { ...prior } };
        } else {
          outcome = { status: "hold", duplicate: true, reason: prior.holdReason ?? "held", item: { ...prior } };
        }
        return [];
      }
      const row = {
        key,
        kind: "handover_reply",
        id: messageId,
        appId,
        messageId,
        chatId,
        ownerId,
        text,
        state: "sending",
        attempted: true,
        ownerInstanceId: instanceId,
        createdAt: now(),
        updatedAt: now(),
        acceptedAt: null,
        providerMessageId: null,
        holdReason: null,
      };
      outcome = { status: "sending", duplicate: false, item: row };
      return [record(key, row)];
    });
    if (outcome.status !== "sending") return outcome;

    try {
      const delivered = await deliver({ appId, messageId, chatId, ownerId, text });
      const accepted = delivered === true || delivered?.accepted === true || delivered?.status === "accepted";
      if (!accepted) {
        const held = markReplyHold(key, delivered?.reason ?? "delivery_not_accepted");
        return { status: "hold", duplicate: false, reason: "delivery_not_accepted", item: held };
      }
      const providerMessageId = typeof delivered?.providerMessageId === "string" ? delivered.providerMessageId : null;
      let acceptedItem = null;
      commit("syno.handover_reply_accepted", (current) => {
        const prior = current.get("records", key);
        if (!prior || prior.state !== "sending") return [];
        acceptedItem = {
          ...prior,
          state: "accepted",
          providerMessageId,
          acceptedAt: now(),
          updatedAt: now(),
        };
        return [record(key, acceptedItem)];
      });
      return { status: "accepted", duplicate: false, item: acceptedItem };
    } catch (error) {
      const held = markReplyHold(key, error?.message);
      return { status: "hold", duplicate: false, reason: sanitizeReason(error?.message, "delivery_failed"), item: held };
    }
  }

  /** Ordinary text replies always carry the same event/inbox evidence as the legacy bridge. */
  async function sendOrdinaryReply(input) {
    const { appId, messageId, chatId, ownerId, summary } = input ?? {};
    if (typeof input?.text !== "string") throw new Error("文本回复缺少 text");
    if (typeof input?.deliver !== "function") throw new Error("文本回复需要 deliver 回调");
    recordReplyEvidence({ db, appId, messageId, chatId, ownerId, summary, at: now() });
    return sendReply(input);
  }

  function publicSpool(row) {
    return {
      id: row.key,
      appId: row.appId,
      messageId: row.messageId,
      chatId: row.chatId,
      ownerId: row.ownerId,
      worker: row.worker,
      state: row.state,
      freezeGeneration: row.freezeGeneration,
      attempts: row.attempts ?? 0,
      claimedAt: row.claimedAt ?? null,
      forwardedAt: row.forwardedAt ?? null,
      holdReason: row.holdReason ?? null,
      needsReconciliation: row.state === "dispatching" || row.state === "hold",
      autoReplay: false,
    };
  }

  function publicReply(row) {
    return {
      id: row.key,
      appId: row.appId,
      messageId: row.messageId,
      chatId: row.chatId,
      ownerId: row.ownerId,
      state: row.state,
      createdAt: row.createdAt ?? null,
      acceptedAt: row.acceptedAt ?? null,
      holdReason: row.holdReason ?? null,
      needsReconciliation: row.state === "sending" || row.state === "hold",
      autoReplay: false,
    };
  }

  function status() {
    const view = openBusinessView(db);
    const records = rows(view, "records");
    const currentControl = controlOf(view);
    const spoolRows = records.filter((row) => row.kind === "handover_spool")
      .sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0) || left.key.localeCompare(right.key));
    const replyRows = records.filter((row) => row.kind === "handover_reply")
      .sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0) || left.key.localeCompare(right.key));
    const count = (list, state) => list.filter((row) => row.state === state).length;
    const pending = spoolRows.filter((row) => row.state === "frozen").map(publicSpool);
    const holds = [
      ...spoolRows.filter((row) => ["dispatching", "hold"].includes(row.state)).map(publicSpool),
      ...replyRows.filter((row) => ["sending", "hold"].includes(row.state)).map(publicReply),
    ].sort((left, right) => left.id.localeCompare(right.id));
    return {
      schema: HANDOVER_SCHEMA,
      control: { ...currentControl },
      frozen: currentControl.frozen,
      generation: currentControl.generation,
      spool: {
        counts: {
          frozen: count(spoolRows, "frozen"),
          dispatching: count(spoolRows, "dispatching"),
          forwarded: count(spoolRows, "forwarded"),
          hold: count(spoolRows, "hold"),
        },
      },
      replies: {
        counts: {
          sending: count(replyRows, "sending"),
          accepted: count(replyRows, "accepted"),
          hold: count(replyRows, "hold"),
        },
      },
      pending,
      holds,
      pendingCount: pending.length,
      holdCount: holds.length,
    };
  }

  return {
    instanceId,
    control,
    freeze,
    unfreeze,
    intake,
    spool,
    claimNextFrozen,
    drainFrozen,
    recoverInterrupted,
    sendReply,
    sendOrdinaryReply,
    status,
    pending: () => status().pending,
    holds: () => status().holds,
  };
}

/** Thin wrapper over the existing cross-process lock; real Host wiring must take this before recovery/drain. */
export async function acquireHandoverLock({ file, instanceId, timeoutMs = 0 } = {}) {
  if (!file) throw new Error("handover 锁需要锁文件路径");
  const lock = new ProcessFileLock({ file, failFast: true, timeoutMs, metadata: { instanceId } });
  return lock.acquire();
}
