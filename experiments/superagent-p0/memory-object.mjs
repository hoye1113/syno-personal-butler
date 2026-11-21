// P3.3 memory objects: owner/object scopes, version snapshots and a body-free command parser.
import path from "node:path";
import { IDEA_ID } from "./idea-object.mjs";
import { PROJECT_ID } from "./project-object.mjs";
import { sha256 } from "./decision-object.mjs";

export const MEMORY_ID = /^memory-[a-f0-9]{16}$/u;
export const MEMORY_CONTEXT_PREFIX = "memory:";
export const MEMORY_INDEX_PREFIX = "memory-index:";
export const MEMORY_INPUT_PREFIX = "memory-input:";
export const MEMORY_APPLIED_PREFIX = "memory-apply:";
export const MEMORY_SNAPSHOT_SCHEMA = "syno-memory-version-v1";

/** A new memory's ID is bound to the inbound message, so replay and crash recovery resolve the same object. */
export const memoryIdForMessage = ({ appId, messageId }) =>
  `memory-${sha256(`${appId}:${messageId}`).slice(0, 16)}`;

export const memoryContextId = (memoryId) => `${MEMORY_CONTEXT_PREFIX}${memoryId}`;
export const memoryIndexKey = (memoryId) => `${MEMORY_INDEX_PREFIX}${memoryId}`;
export const memoryInputKey = (taskId) => `${MEMORY_INPUT_PREFIX}${taskId}`;
export const memoryAppliedKey = (decisionId) => `${MEMORY_APPLIED_PREFIX}${decisionId}`;

export const memoryValueSha256 = (preference) => sha256(String(preference));
export const memoryVersionFile = (root, memoryId, version, messageId) =>
  path.join(root, memoryId, `v${version}-${messageId}.json`);

export function assertMemoryId(memoryId) {
  if (!MEMORY_ID.test(String(memoryId))) throw new Error(`非法记忆 ID：${memoryId}`);
  return memoryId;
}

/** Scope is always parsed by the host; a model may never choose or widen it. */
export function parseMemoryScope(scope) {
  const text = String(scope ?? "").trim();
  if (text === "owner") return { scope: "owner", kind: "owner", objectId: null };
  const idea = /^idea:(idea-[a-f0-9]{16})$/u.exec(text);
  if (idea && IDEA_ID.test(idea[1])) return { scope: text, kind: "idea", objectId: idea[1] };
  const project = /^project:(project-[a-f0-9]{16})$/u.exec(text);
  if (project && PROJECT_ID.test(project[1])) return { scope: text, kind: "project", objectId: project[1] };
  return null;
}

export function memoryScopeMatches(scope, contextId) {
  if (scope === "owner") return true;
  return Boolean(contextId) && scope === contextId;
}

/** `记忆候选 <scope>：<sourceText>`, `纠正记忆 <memoryId>：v<n>：<value>` and `遗忘记忆 <memoryId>：v<n>`. */
export function resolveMemoryCommand(text) {
  const normalized = String(text).trim();
  const propose = /^记忆候选\s+(\S+)\s*[：:]\s*(\S[\s\S]*)$/u.exec(normalized);
  if (propose) {
    return { status: "resolved", action: "propose", scope: propose[1], sourceText: propose[2].trim() };
  }
  const correct = /^纠正记忆\s+(memory-[a-f0-9]{16})\s*[：:]\s*v(\d+)\s*[：:]\s*(\S[\s\S]*)$/u.exec(normalized);
  if (correct) {
    return {
      status: "resolved", action: "correct", memoryId: correct[1],
      expectedVersion: Number(correct[2]), preference: correct[3].trim(),
    };
  }
  const forget = /^遗忘记忆\s+(memory-[a-f0-9]{16})\s*[：:]\s*v(\d+)\s*$/u.exec(normalized);
  if (forget) {
    return { status: "resolved", action: "forget", memoryId: forget[1], expectedVersion: Number(forget[2]) };
  }
  if (/^(?:记忆候选|纠正记忆|遗忘记忆)/u.test(normalized)) {
    return { status: "ambiguous", reason: "malformed-memory-command" };
  }
  return { status: "unsupported" };
}

/**
 * The snapshot is the only thing a Worker may hand back for a memory transition. It records the frozen IDs,
 * expected version and value hashes; the host rebuilds and compares it byte-for-byte.
 */
export function memorySnapshot({
  memoryId, ownerId, scope, operation, decisionId, expectedVersion, version,
  preference, expectedValueSha256, valueSha256, sourceMessageId, taskId, attemptId, inputSha256,
}) {
  return {
    schema: MEMORY_SNAPSHOT_SCHEMA,
    memoryId,
    ownerId,
    scope,
    operation,
    decisionId,
    expectedVersion,
    version,
    preference: operation === "forget" ? null : preference,
    expectedValueSha256,
    valueSha256,
    sourceMessageId,
    taskId,
    attemptId,
    inputSha256,
  };
}

export const canonicalMemorySnapshot = (snapshot) => `${JSON.stringify(snapshot, null, 2)}\n`;

export function parseMemorySnapshot(text) {
  let snapshot;
  try {
    snapshot = JSON.parse(text);
  } catch {
    throw new Error("记忆候选快照不是合法 JSON");
  }
  if (snapshot?.schema !== MEMORY_SNAPSHOT_SCHEMA) throw new Error("记忆候选快照 schema 非法");
  return snapshot;
}

/** Recall only returns the currently active, authorized value; it never exposes other object bodies. */
export function recallableMemories(indexes, { ownerId, contextId }) {
  return indexes
    .filter((index) => index.kind === "memory_index" && index.ownerId === ownerId && index.status === "active")
    .filter((index) => memoryScopeMatches(index.scope, contextId))
    .map((index) => {
      const current = index.versions.find((version) => version.version === index.currentVersion);
      if (!current || current.status !== "active") return null;
      return {
        memoryId: index.memoryId,
        version: current.version,
        scope: index.scope,
        preference: current.preference,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.memoryId.localeCompare(right.memoryId));
}
