// P3.3 decision objects: deterministic IDs, one confirmation protocol for route.select and memory.confirm.
import { createHash } from "node:crypto";

export const DECISION_ID = /^decision-[a-f0-9]{16}$/u;
export const DECISION_RECORD_PREFIX = "decision-record:";

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

/** A Decision is bound to the inbound message that raised the question, so a replay resolves the same Decision. */
export const decisionIdForMessage = ({ appId, messageId }) =>
  `decision-${sha256(`${appId}:${messageId}`).slice(0, 16)}`;

export const decisionRecordKey = (decisionId) => `${DECISION_RECORD_PREFIX}${decisionId}`;

export function assertDecisionId(decisionId) {
  if (!DECISION_ID.test(String(decisionId))) throw new Error(`非法 Decision ID：${decisionId}`);
  return decisionId;
}

/** `选择 <decisionId>：<candidateId>` and `确认 <decisionId>` are the only two Decision commands. */
export function resolveDecisionCommand(text) {
  const normalized = String(text).trim();
  const select = /^选择\s+(decision-[a-f0-9]{16})\s*[：:]\s*(\S+)$/u.exec(normalized);
  if (select) {
    return { status: "resolved", action: "select", decisionId: select[1], candidateId: select[2] };
  }
  if (/^选择/u.test(normalized)) return { status: "ambiguous", action: "select", reason: "malformed-select" };
  const confirm = /^确认\s+(decision-[a-f0-9]{16})$/u.exec(normalized);
  if (confirm) return { status: "resolved", action: "confirm", decisionId: confirm[1] };
  if (/^确认/u.test(normalized)) return { status: "ambiguous", action: "confirm", reason: "malformed-confirm" };
  return { status: "unsupported" };
}

export function assertRouteCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") throw new Error("route.select 候选必须是对象");
  if (!candidate.candidateId) throw new Error("route.select 候选缺少 candidateId");
  if (candidate.domain !== "idea" && candidate.domain !== "project") {
    throw new Error(`非法候选领域：${candidate.domain}`);
  }
  if (!candidate.objectId) throw new Error("route.select 候选缺少 objectId");
  if (!candidate.contextId) throw new Error("route.select 候选缺少 contextId");
  if (candidate.expectedObjectVersion !== null && !Number.isSafeInteger(candidate.expectedObjectVersion)) {
    throw new Error("route.select 候选对象版本非法");
  }
  if (!["continue", "revise"].includes(candidate.action)) throw new Error("route.select 候选动作非法");
  return candidate;
}

export function assertMemoryBinding(binding) {
  if (!binding || typeof binding !== "object") throw new Error("memory.confirm 必须绑定记忆版本");
  if (!/^memory-[a-f0-9]{16}$/u.test(String(binding.memoryId))) throw new Error("非法记忆 ID");
  if (!Number.isSafeInteger(binding.expectedMemoryVersion) || binding.expectedMemoryVersion < 1) {
    throw new Error("非法记忆版本");
  }
  if (!["activate", "correct", "forget"].includes(binding.operation)) throw new Error("非法记忆操作");
  if (!/^[a-f0-9]{64}$/u.test(String(binding.expectedValueSha256))) throw new Error("非法记忆值哈希");
  if (binding.operation === "forget") {
    if (binding.pendingValue !== null && binding.pendingValue !== undefined) {
      throw new Error("遗忘 Decision 不能携带新值");
    }
    if (binding.pendingValue === undefined) binding.pendingValue = null;
  } else {
    if (typeof binding.pendingValue !== "string" || !binding.pendingValue.trim()) {
      throw new Error("激活或纠正 Decision 必须携带新值");
    }
    // Activation confirms the pending value itself; correction binds the old value hash and a new value.
    if (binding.operation === "activate" && sha256(binding.pendingValue) !== binding.expectedValueSha256) {
      throw new Error("记忆值哈希与待激活值不一致");
    }
  }
  return binding;
}
