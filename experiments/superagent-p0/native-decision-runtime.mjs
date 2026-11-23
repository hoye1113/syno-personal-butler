// P3.3 Decision Lane: one persisted confirmation protocol for route selection and protected memory changes.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { FORMAT, openBusinessView } from "../../packages/syno-autoloop/examples/syno-p0/commands.ts";
import { rows } from "../../packages/syno-autoloop/kernel/evolve.ts";
import { commitLatest } from "../../packages/syno-autoloop/kernel/store.ts";
import {
  DECISION_ID,
  assertDecisionId,
  assertMemoryBinding,
  assertRouteCandidate,
  decisionIdForMessage,
  decisionRecordKey,
} from "./decision-object.mjs";

export function openNativeDecisionRuntime({
  databasePath,
  now = () => Date.now(),
  db: sharedDb = null,
  objectVersion = () => null,
  decisionTtlMs = 24 * 60 * 60 * 1000,
}) {
  if (!sharedDb) mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = sharedDb ?? new DatabaseSync(databasePath);
  if (!sharedDb) db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  openBusinessView(db);
  const view = () => openBusinessView(db);

  function commit(type, produce) {
    return commitLatest(db, FORMAT, (current) => {
      const changes = produce(current);
      if (!changes.length) return [];
      return [{ version: 1, seq: current.seq + 1, at: now(), type, changes }];
    });
  }

  const record = (key, value) => ({ table: "records", key, row: value });

  function raw(decisionId) {
    return view().get("records", decisionRecordKey(decisionId)) ?? null;
  }

  /** Reading is allowed to lazily seal a timed-out Decision, so callers cannot keep selecting it. */
  function get(decisionId) {
    if (!DECISION_ID.test(String(decisionId))) return null;
    let decision = raw(decisionId);
    if (!decision) return null;
    if (decision.status === "pending" && now() >= decision.expiresAt) {
      commit("syno.decision_expired", (current) => {
        const fresh = current.get("records", decisionRecordKey(decisionId));
        if (!fresh || fresh.status !== "pending") return [];
        return [record(decisionRecordKey(decisionId), {
          ...fresh, status: "expired", expiredReason: "timeout", updatedAt: now(),
        })];
      });
      decision = raw(decisionId);
    }
    return decision;
  }

  function requireDecision(decisionId) {
    const decision = get(decisionId);
    assert.ok(decision, `未知 Decision：${decisionId}`);
    return decision;
  }

  function create({ decisionKind, ownerId, appId, originMessageId, originContext, action, candidates, binding, ttlMs }) {
    assert.ok(ownerId, "Decision 缺少 Owner");
    assert.ok(appId, "Decision 缺少 App");
    assert.ok(originMessageId, "Decision 缺少原始消息");
    assert.ok(originContext, "Decision 缺少原始 Context");
    assert.ok(["route.select", "memory.confirm"].includes(decisionKind), "未知 Decision 类型");
    const decisionId = decisionIdForMessage({ appId, messageId: originMessageId });
    assertDecisionId(decisionId);
    const expiresAt = now() + (Number.isSafeInteger(ttlMs) ? ttlMs : decisionTtlMs);
    const proposed = {
      key: decisionRecordKey(decisionId),
      kind: "decision",
      id: decisionId,
      decisionId,
      decisionKind,
      ownerId,
      appId,
      originMessageId,
      originContext,
      action: action ?? null,
      candidates: candidates ?? [],
      binding: binding ?? null,
      status: "pending",
      createdAt: now(),
      updatedAt: now(),
      expiresAt,
      consumedByMessageId: null,
      consumption: null,
      cancelReason: null,
      expiredReason: null,
    };
    commit("syno.decision_created", (current) => {
      const prior = current.get("records", proposed.key);
      if (!prior) return [record(proposed.key, proposed)];
      assert.equal(prior.decisionKind, proposed.decisionKind, "同一消息不能更换 Decision 类型");
      assert.equal(prior.ownerId, proposed.ownerId, "同一消息不能更换 Decision Owner");
      assert.equal(prior.originContext, proposed.originContext, "同一消息不能更换 Decision 原始 Context");
      // Candidates may legitimately be re-snapshotted after another object changed; the frozen Decision wins.
      assert.equal(JSON.stringify(prior.action), JSON.stringify(proposed.action), "同一消息不能更换冻结动作");
      if (proposed.decisionKind === "memory.confirm") {
        assert.equal(JSON.stringify(prior.binding), JSON.stringify(proposed.binding), "同一消息不能更换记忆绑定");
      }
      return [];
    });
    return raw(decisionId);
  }

  function createRouteDecision({ ownerId, appId, originMessageId, originContext, action, candidates, ttlMs }) {
    assert.ok(Array.isArray(candidates) && candidates.length > 0, "route.select 至少需要一个候选");
    candidates.forEach(assertRouteCandidate);
    assert.equal(new Set(candidates.map((candidate) => candidate.candidateId)).size, candidates.length, "候选 ID 不能重复");
    assert.ok(action && typeof action === "object", "route.select 必须冻结原始动作");
    return create({
      decisionKind: "route.select", ownerId, appId, originMessageId, originContext,
      action, candidates, binding: null, ttlMs,
    });
  }

  function createMemoryDecision({ ownerId, appId, originMessageId, originContext, binding, ttlMs }) {
    assertMemoryBinding(binding);
    return create({
      decisionKind: "memory.confirm", ownerId, appId, originMessageId, originContext,
      action: { operation: binding.operation }, candidates: [], binding, ttlMs,
    });
  }

  function receiptOf(decision, candidateId) {
    if (decision.decisionKind === "route.select") {
      const candidate = decision.candidates.find((entry) => entry.candidateId === candidateId);
      return {
        decisionId: decision.decisionId,
        decisionKind: decision.decisionKind,
        ownerId: decision.ownerId,
        originMessageId: decision.originMessageId,
        candidateId: candidate.candidateId,
        domain: candidate.domain,
        objectId: candidate.objectId,
        contextId: candidate.contextId,
        expectedObjectVersion: candidate.expectedObjectVersion,
        action: candidate.action,
        frozen: decision.action,
      };
    }
    return {
      decisionId: decision.decisionId,
      decisionKind: decision.decisionKind,
      ownerId: decision.ownerId,
      originMessageId: decision.originMessageId,
      memoryId: decision.binding.memoryId,
      expectedMemoryVersion: decision.binding.expectedMemoryVersion,
      operation: decision.binding.operation,
      expectedValueSha256: decision.binding.expectedValueSha256,
      pendingValue: decision.binding.pendingValue ?? null,
    };
  }

  /**
   * Consume is the only place a Decision becomes actionable. A precheck runs inside the same transaction, so a
   * stale memory version or a forged candidate cannot burn the Decision or leave a half-written effect.
   */
  function consume({ ownerId, appId, messageId, decisionId, candidateId = null, precheck = null }) {
    assert.ok(ownerId, "确认缺少 Owner");
    assert.ok(appId, "确认缺少 App");
    assert.ok(messageId, "确认缺少消息 ID");
    assertDecisionId(decisionId);
    let outcome = null;
    commit("syno.decision_consumed", (current) => {
      const key = decisionRecordKey(decisionId);
      const decision = current.get("records", key);
      if (!decision) throw new Error(`未知 Decision：${decisionId}`);
      if (decision.ownerId !== ownerId) {
        outcome = { status: "owner_mismatch", decisionId };
        return [];
      }
      // App isolation is checked before any status branch, so a wrong App can never reach a receipt or a duplicate.
      if (decision.appId !== appId) {
        outcome = { status: "app_mismatch", decisionId };
        return [];
      }
      if (messageId === decision.originMessageId) {
        outcome = { status: "self_confirmation", decisionId };
        return [];
      }
      if (decision.status === "cancelled") {
        outcome = { status: "cancelled", decisionId };
        return [];
      }
      if (decision.status === "expired" || (decision.status === "pending" && now() >= decision.expiresAt)) {
        outcome = { status: "expired", decisionId };
        return [];
      }
      if (decision.status === "consumed") {
        if (decision.consumedByMessageId === messageId) {
          if (decision.decisionKind === "route.select" && candidateId
            && decision.consumption?.candidateId !== candidateId) {
            throw new Error("同一确认消息不能更换候选");
          }
          outcome = { status: "consumed", duplicate: true, receipt: decision.consumption.receipt };
          return [];
        }
        outcome = { status: "already_consumed", decisionId, consumedByMessageId: decision.consumedByMessageId };
        return [];
      }

      let receipt;
      if (decision.decisionKind === "route.select") {
        const candidate = decision.candidates.find((entry) => entry.candidateId === candidateId);
        if (!candidate) throw new Error("候选不属于该 Decision");
        const currentVersion = objectVersion ? objectVersion(candidate.contextId) : null;
        if (currentVersion !== candidate.expectedObjectVersion) {
          outcome = { status: "stale", decisionId, currentVersion };
          return [record(key, {
            ...decision, status: "expired", expiredReason: "stale-object-version", updatedAt: now(),
          })];
        }
      } else if (typeof precheck === "function") {
        precheck(decision, current);
      }
      receipt = receiptOf(decision, candidateId);
      outcome = { status: "consumed", duplicate: false, receipt };
      return [record(key, {
        ...decision,
        status: "consumed",
        consumedByMessageId: messageId,
        consumption: { messageId, candidateId, receipt, consumedAt: now() },
        updatedAt: now(),
      })];
    });
    assert.ok(outcome, "Decision 消费没有产生结果");
    return outcome;
  }

  /**
   * A consumed Decision whose queued native run can no longer execute settles into a terminal state, but keeps the
   * original consumption receipt for audit. It is idempotent and never becomes actionable again.
   */
  function settleStale({ ownerId, decisionId, messageId, reason = "queued-expected-version-stale" }) {
    assertDecisionId(decisionId);
    let outcome = null;
    commit("syno.decision_stale", (current) => {
      const key = decisionRecordKey(decisionId);
      const decision = current.get("records", key);
      if (!decision) throw new Error(`未知 Decision：${decisionId}`);
      if (decision.ownerId !== ownerId) {
        outcome = { status: "owner_mismatch", decisionId };
        return [];
      }
      if (decision.status === "expired") {
        outcome = { status: "stale", decisionId, duplicate: true, receipt: decision.consumption?.receipt ?? null };
        return [];
      }
      if (decision.status === "cancelled") {
        outcome = { status: "cancelled", decisionId, duplicate: true };
        return [];
      }
      if (decision.status !== "consumed") {
        outcome = { status: decision.status, decisionId };
        return [];
      }
      if (decision.consumedByMessageId !== messageId) {
        outcome = {
          status: "already_consumed", decisionId, consumedByMessageId: decision.consumedByMessageId,
        };
        return [];
      }
      outcome = { status: "stale", decisionId, duplicate: false, receipt: decision.consumption?.receipt ?? null };
      return [record(key, {
        ...decision,
        status: "expired",
        expiredReason: "stale-queued",
        staleReason: reason,
        updatedAt: now(),
      })];
    });
    assert.ok(outcome, "Decision 终止没有产生结果");
    return outcome;
  }

  function cancel({ ownerId, decisionId, reason = "cancelled" }) {
    assertDecisionId(decisionId);
    let outcome = null;
    commit("syno.decision_cancelled", (current) => {
      const key = decisionRecordKey(decisionId);
      const decision = current.get("records", key);
      if (!decision) throw new Error(`未知 Decision：${decisionId}`);
      if (decision.ownerId !== ownerId) {
        outcome = { status: "owner_mismatch", decisionId };
        return [];
      }
      if (decision.status === "consumed") throw new Error("Decision 已被消费，不能取消");
      if (decision.status === "cancelled") {
        outcome = { status: "cancelled", decisionId, duplicate: true };
        return [];
      }
      if (decision.status === "expired" || (decision.status === "pending" && now() >= decision.expiresAt)) {
        outcome = { status: "expired", decisionId };
        return [];
      }
      outcome = { status: "cancelled", decisionId, duplicate: false };
      return [record(key, { ...decision, status: "cancelled", cancelReason: reason, updatedAt: now() })];
    });
    return outcome;
  }

  return {
    createRouteDecision,
    createMemoryDecision,
    consume,
    cancel,
    settleStale,
    get,
    require: requireDecision,
    decisions: () => rows(view(), "records").filter((entry) => entry.kind === "decision"),
    factCount: () => Number(db.prepare("SELECT COUNT(*) AS count FROM facts").get().count),
    close: () => { if (!sharedDb) db.close(); },
  };
}
