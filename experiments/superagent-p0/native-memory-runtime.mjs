// P3.3 Memory Specialist: versioned protected memory in the one fact log, driven by Decision consumption.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  FORMAT,
  acceptDelivery,
  applyRoute,
  claimDelivery,
  createTask,
  executeNative,
  finalizeTask,
  markDeliveryUnknown,
  openBusinessView,
  recordVerification,
  reportWorkerDone,
  requestCancel,
} from "../../../syno-autoloop-p0/examples/syno-p0/commands.ts";
import { rows } from "../../../syno-autoloop-p0/kernel/evolve.ts";
import { commitLatest } from "../../../syno-autoloop-p0/kernel/store.ts";
import { parseRules } from "../../../syno-autoloop-p0/protocol/rules.ts";
import { DECISION_ID, decisionIdForMessage, sha256 } from "./decision-object.mjs";
import {
  MEMORY_ID,
  MEMORY_SNAPSHOT_SCHEMA,
  assertMemoryId,
  canonicalMemorySnapshot,
  memoryAppliedKey,
  memoryContextId,
  memoryIdForMessage,
  memoryIndexKey,
  memoryInputKey,
  memoryScopeMatches,
  memorySnapshot,
  memoryValueSha256,
  memoryVersionFile,
  parseMemoryScope,
  parseMemorySnapshot,
  recallableMemories,
} from "./memory-object.mjs";
import {
  MODEL_LABEL as MEMORY_MODEL,
  PREFERENCE_LIMIT,
  RECALLED_LIMIT,
  SOURCE_TEXT_LIMIT,
  canonicalMemoryProposal,
  memoryProposalCandidate,
  memorySourceSha256,
  parseMemoryProposalCandidate,
  parseMemoryWorkerResult,
} from "./memory-worker-contract.mjs";

const ENVIRONMENT = { secret: "syno-p3-memory-isolated-test", publicUrl: "" };
const RULE = "记忆状态变更";
const AGENT = "syno-p3-memory";
const GROUP = "syno-p3-memory";
const PARALLEL = 3;
const SOURCE_MATERIAL = "memory-version-v1";
const OPERATIONS = ["activate", "correct", "forget"];
const WORKERS = ["OpenCode", "Pi"];

const inputShaOf = ({ operation, memoryId, decisionId, expectedVersion, targetVersion, preference, expectedValueSha256, valueSha256, ownerId, scope }) =>
  sha256(JSON.stringify({ operation, memoryId, decisionId, expectedVersion, targetVersion, preference, expectedValueSha256, valueSha256, ownerId, scope }));
const deliveryKeyOf = (taskId) => `delivery:${taskId}:result`;
const proposalInputShaOf = ({ appId, messageId, chatId, ownerId, worker, scope, sourceText, recalled }) =>
  sha256(JSON.stringify({ action: "propose", appId, messageId, chatId, ownerId, worker, scope, sourceText, recalled }));
const proposalTaskId = (messageId) => `task-${messageId}`;
const proposalInputFields = [
  "appId", "chatId", "inputSha256", "kind", "memoryId", "messageId", "mode", "ownerId",
  "recalled", "scope", "sourceText", "sourceTextSha256", "taskId", "worker",
];
const proposalCandidateFields = [
  "attemptId", "inputSha256", "memoryId", "messageId", "operation", "ownerId", "preference",
  "recalled", "schema", "scope", "sourceText", "taskId", "valueSha256", "version",
];
const recalledFields = ["memoryId", "preference", "scope", "valueSha256", "version"];

export function openNativeMemoryRuntime({
  databasePath,
  vaultRoot,
  memoryRoot = path.join(vaultRoot, "05-Memory"),
  now = () => Date.now(),
  db: sharedDb = null,
  configureRules = true,
  decisions,
  scopeObjectExists = null,
}) {
  assert.ok(decisions, "Memory Specialist 必须共享 Decision 服务");
  mkdirSync(memoryRoot, { recursive: true });
  if (!sharedDb) mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = sharedDb ?? new DatabaseSync(databasePath);
  if (!sharedDb) db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  openBusinessView(db);
  const act = (type, args) => executeNative(db, type, args, now(), ENVIRONMENT).value;
  const view = () => openBusinessView(db);

  if (configureRules) {
    const rules = parseRules(JSON.stringify({
      timezone: "Asia/Shanghai",
      sources: { "feishu-test": { name: "独立飞书测试" } },
      agents: { memory: { name: "记忆状态变更 Worker", worker: AGENT, use: "command", command: ["true"] } },
      rules: [{
        name: RULE,
        when: { source: "feishu-test", types: ["memory.request"] },
        to: "memory",
        cwd: vaultRoot,
        prompt: "Worker 只返回记忆候选快照；宿主独立复核版本、Owner、值哈希与 Result Lane 后结算",
        group: GROUP,
        parallel: PARALLEL,
        tell: "never",
      }],
    }), now(), "Asia/Shanghai");
    const currentRules = view().get("config", "rules");
    if (!currentRules || JSON.stringify(currentRules.value) !== JSON.stringify(rules)) act("rules", [rules]);
  }

  function commit(type, produce) {
    return commitLatest(db, FORMAT, (current) => {
      const changes = produce(current);
      if (!changes.length) return [];
      return [{ version: 1, seq: current.seq + 1, at: now(), type, changes }];
    });
  }

  const record = (key, value) => ({ table: "records", key, row: value });

  function indexOf(memoryId) {
    return view().get("records", memoryIndexKey(memoryId)) ?? null;
  }

  function requireIndex(memoryId) {
    const index = indexOf(memoryId);
    assert.ok(index, `未知记忆：${memoryId}`);
    return index;
  }

  function currentVersionOf(index) {
    const current = index.versions.find((version) => version.version === index.currentVersion);
    assert.ok(current, `记忆索引缺少当前版本：${index.memoryId}`);
    return current;
  }

  function assertBindingIn(current, binding, ownerId) {
    const index = current.get("records", memoryIndexKey(binding.memoryId));
    assert.ok(index, `未知记忆：${binding.memoryId}`);
    assert.equal(index.ownerId, ownerId, "记忆 Owner 不符");
    const version = index.versions.find((entry) => entry.version === index.currentVersion);
    assert.ok(version, "记忆索引缺少当前版本");
    assert.equal(index.currentVersion, binding.expectedMemoryVersion, "记忆版本已变化");
    assert.equal(version.valueSha256, binding.expectedValueSha256, "记忆值已变化");
    if (binding.operation === "activate") {
      assert.equal(index.status, "pending", "记忆已不是待激活状态");
    } else {
      assert.equal(index.status, "active", "记忆不是 active 状态");
    }
    return index;
  }

  function assertBindingLive(binding, ownerId) {
    return assertBindingIn(view(), binding, ownerId);
  }

  /** Non-throwing liveness probe: a queued Decision must be settled, not crash the drain loop. */
  function bindingState(binding, ownerId) {
    const current = view();
    try {
      assertBindingIn(current, binding, ownerId);
      return { live: true };
    } catch (error) {
      return { live: false, error: error?.message ?? String(error) };
    }
  }

  /** The host resolves the scope text, then proves the referenced idea/project actually exists. */
  function assertScopeExists(scope) {
    if (scope.kind === "owner") return;
    assert.equal(typeof scopeObjectExists, "function", "宿主必须提供记忆作用域对象存在性校验");
    assert.ok(
      scopeObjectExists({ kind: scope.kind, objectId: scope.objectId }),
      `未知记忆作用域对象：${scope.scope}`,
    );
  }

  function setPendingDecision(memoryId, decisionId) {
    commit("syno.memory_pending_set", (current) => {
      const key = memoryIndexKey(memoryId);
      const fresh = current.get("records", key);
      assert.ok(fresh, `未知记忆：${memoryId}`);
      if (fresh.pendingDecisionId === decisionId) return [];
      if (fresh.pendingDecisionId) {
        const other = current.get("records", `decision-record:${fresh.pendingDecisionId}`);
        if (other?.status === "pending") throw new Error("同一 Memory 已有待确认 Decision");
      }
      return [record(key, { ...fresh, pendingDecisionId: decisionId, updatedAt: now() })];
    });
  }

  function clearPendingDecision(memoryId, decisionId) {
    commit("syno.memory_pending_clear", (current) => {
      const key = memoryIndexKey(memoryId);
      const index = current.get("records", key);
      if (!index || index.pendingDecisionId !== decisionId) return [];
      return [record(key, { ...index, pendingDecisionId: null, updatedAt: now() })];
    });
  }

  function writeProposal({
    memoryId, ownerId, scope, contextId, preference, sourceText, decisionId, sourceMessageId,
    taskId = null, attemptId = null, recalled = null,
  }) {
    const valueSha256 = memoryValueSha256(preference);
    const proposed = {
      key: memoryIndexKey(memoryId),
      kind: "memory_index",
      id: memoryId,
      memoryId,
      ownerId,
      scope,
      contextId,
      status: "pending",
      currentVersion: 1,
      pendingDecisionId: decisionId,
      versions: [{
        version: 1,
        status: "pending",
        operation: "propose",
        preference,
        valueSha256,
        sourceText,
        recalled,
        decisionId,
        sourceMessageId,
        taskId,
        attemptId,
        createdAt: now(),
        supersededAt: null,
        supersededBy: null,
      }],
      createdAt: now(),
      updatedAt: now(),
    };
    commit("syno.memory_proposal", (current) => {
      const prior = current.get("records", proposed.key);
      if (!prior) return [record(proposed.key, proposed)];
      assert.equal(prior.ownerId, ownerId, "同一消息不能更换记忆 Owner");
      assert.equal(prior.scope, scope, "同一消息不能更换记忆作用域");
      assert.equal(prior.versions[0]?.valueSha256, valueSha256, "同一消息不能更换记忆值");
      assert.equal(prior.versions[0]?.taskId ?? null, taskId, "同一消息不能更换记忆候选 Task");
      return [];
    });
    return indexOf(memoryId);
  }

  function routeMessage(message, contextId) {
    const current = view();
    const context = current.get("records", `context:${contextId}`);
    const priorInbox = current.get("records", `inbox:${JSON.stringify([message.appId, message.messageId])}`);
    const originalVersion = priorInbox ? (priorInbox.receipt.version === 1 ? null : priorInbox.receipt.version - 1) : null;
    return applyRoute(db, {
      commandId: `route-${contextId}-${message.appId}-${message.messageId}`,
      appId: message.appId,
      messageId: message.messageId,
      contextId,
      expectedVersion: priorInbox ? originalVersion : (context?.version ?? null),
      ownerId: message.ownerId,
      replyTo: message.chatId,
      now: now(),
    });
  }

  /** A proposal only persists a pending candidate and its activate Decision; it never becomes active by itself. */
  function propose(message) {
    assertMessageId(message);
    assert.ok(message.ownerId, "记忆候选缺少 Owner");
    const scope = parseMemoryScope(message.scope);
    assert.ok(scope, `非法记忆作用域：${message.scope}`);
    assertScopeExists(scope);
    const preference = String(message.preference ?? "").trim();
    assert.ok(preference, "记忆候选缺少经过校验的偏好正文");
    const sourceText = String(message.sourceText ?? preference).trim() || preference;
    const memoryId = memoryIdForMessage(message);
    const contextId = memoryContextId(memoryId);

    const existing = indexOf(memoryId);
    if (existing) {
      assert.equal(existing.ownerId, message.ownerId, "同一消息不能更换记忆 Owner");
      assert.equal(existing.scope, scope.scope, "同一消息不能更换记忆作用域");
      const first = existing.versions.find((version) => version.version === 1);
      assert.equal(first?.valueSha256, memoryValueSha256(preference), "同一消息不能更换记忆值");
      return {
        memoryId, contextId, scope: existing.scope, status: existing.status,
        version: existing.currentVersion, decisionId: existing.pendingDecisionId, proposal: true,
      };
    }

    routeMessage(message, contextId);
    const binding = {
      memoryId,
      expectedMemoryVersion: 1,
      operation: "activate",
      expectedValueSha256: memoryValueSha256(preference),
      pendingValue: preference,
    };
    const decision = decisions.createMemoryDecision({
      ownerId: message.ownerId, appId: message.appId, originMessageId: message.messageId,
      originContext: contextId, binding,
    });
    const index = writeProposal({
      memoryId, ownerId: message.ownerId, scope: scope.scope, contextId,
      preference, sourceText, decisionId: decision.decisionId, sourceMessageId: message.messageId,
    });
    return {
      memoryId, contextId, scope: index.scope, status: index.status,
      version: index.currentVersion, decisionId: index.pendingDecisionId, proposal: true,
    };
  }

  function proposalInputRecord(taskId) {
    const entry = view().get("records", memoryInputKey(taskId));
    return entry?.kind === "memory_proposal_input" ? entry : null;
  }

  function writeProposalInput(input) {
    commit("syno.memory_proposal_input", (current) => {
      const key = memoryInputKey(input.taskId);
      const prior = current.get("records", key);
      if (prior) {
        for (const field of proposalInputFields) {
          assert.equal(
            JSON.stringify(prior[field] ?? null), JSON.stringify(input[field] ?? null),
            `同一消息不能更换记忆候选输入 ${field}`,
          );
        }
        return [];
      }
      return [record(key, input)];
    });
    return proposalInputRecord(input.taskId);
  }

  function assertRecalledAuthorized(recalled, ownerId, scope) {
    assert.ok(Array.isArray(recalled), "记忆候选缺少冻结召回");
    assert.ok(recalled.length <= RECALLED_LIMIT, "记忆候选召回条目超过 20 条");
    const seen = new Set();
    for (const entry of recalled) {
      assert.deepEqual(Object.keys(entry).sort(), recalledFields, "冻结召回条目包含未批准字段");
      assert.ok(MEMORY_ID.test(entry.memoryId), "冻结召回对象非法");
      assert.ok(!seen.has(entry.memoryId), "冻结召回对象重复");
      seen.add(entry.memoryId);
      assert.ok(Number.isSafeInteger(entry.version) && entry.version >= 1, "冻结召回版本非法");
      assert.equal(typeof entry.preference, "string", "冻结召回正文必须是字符串");
      assert.ok(entry.preference.trim(), "冻结召回正文为空");
      assert.ok(entry.preference.length <= PREFERENCE_LIMIT, "冻结召回正文超过 500 字符");
      assert.equal(entry.valueSha256, memoryValueSha256(entry.preference), "冻结召回值哈希不一致");
      const index = requireIndex(entry.memoryId);
      assert.equal(index.ownerId, ownerId, "冻结召回来自其他 Owner");
      assert.equal(entry.scope, index.scope, "冻结召回作用域与对象不一致");
      assert.ok(memoryScopeMatches(index.scope, scope), "冻结召回来自其他对象");
      const version = index.versions.find((candidate) => candidate.version === entry.version);
      assert.ok(version, "冻结召回版本不存在");
      assert.equal(version.valueSha256, entry.valueSha256, "冻结召回版本值已变化");
    }
    return recalled;
  }

  /**
   * Freezing is an audit snapshot, not a promise that the ledger row is still trustworthy. Before the host
   * creates a new candidate it must prove every recalled memory is still the same Owner's authorized current
   * active version. A correction, forget, revoke or supersede during the Worker run invalidates the recall.
   */
  function assertRecalledStillCurrent(recalled, ownerId, scope) {
    for (const entry of recalled) {
      const index = requireIndex(entry.memoryId);
      assert.equal(index.ownerId, ownerId, "冻结召回已不属于当前 Owner");
      assert.equal(entry.scope, index.scope, "冻结召回作用域与对象不一致");
      assert.ok(memoryScopeMatches(index.scope, scope), "冻结召回已不在授权作用域");
      assert.equal(index.status, "active", "冻结召回记忆已不在 active 状态");
      assert.equal(index.currentVersion, entry.version, "冻结召回已不是当前版本");
      const current = currentVersionOf(index);
      assert.equal(current.version, entry.version, "冻结召回版本不是当前版本");
      assert.equal(current.status, "active", "冻结召回当前版本不是 active");
      assert.equal(current.valueSha256, entry.valueSha256, "冻结召回当前值已变化");
      assert.equal(memoryValueSha256(current.preference), entry.valueSha256, "冻结召回当前值哈希不一致");
    }
    return recalled;
  }

  function freezeProposal(message, scope) {
    const sourceText = String(message.sourceText ?? "").trim();
    assert.ok(sourceText, "记忆候选缺少来源正文");
    assert.ok(sourceText.length <= SOURCE_TEXT_LIMIT, "记忆候选来源正文超过 4000 字符");
    const recalled = recall({ ownerId: message.ownerId, contextId: scope.scope }).map((entry) => ({
      memoryId: entry.memoryId,
      version: entry.version,
      scope: entry.scope,
      preference: entry.preference,
      valueSha256: memoryValueSha256(entry.preference),
    }));
    assert.ok(recalled.length <= RECALLED_LIMIT, "记忆候选召回条目超过 20 条");
    for (const entry of recalled) assert.ok(entry.preference.length <= PREFERENCE_LIMIT, "冻结召回正文超过 500 字符");
    assertRecalledAuthorized(recalled, message.ownerId, scope.scope);
    const base = {
      appId: message.appId,
      messageId: message.messageId,
      chatId: message.chatId,
      ownerId: message.ownerId,
      worker: message.worker,
      scope: scope.scope,
      sourceText,
      recalled,
    };
    return {
      key: memoryInputKey(proposalTaskId(message.messageId)),
      kind: "memory_proposal_input",
      mode: "propose",
      taskId: proposalTaskId(message.messageId),
      memoryId: memoryIdForMessage(message),
      ...base,
      sourceTextSha256: memorySourceSha256(sourceText),
      inputSha256: proposalInputShaOf(base),
    };
  }

  function proposalDetailOf(input) {
    return JSON.stringify({
      action: "propose",
      memoryId: input.memoryId,
      ownerId: input.ownerId,
      scope: input.scope,
      sourceText: input.sourceText,
      sourceTextSha256: input.sourceTextSha256,
      recalled: input.recalled,
      inputSha256: input.inputSha256,
      worker: input.worker,
      appId: input.appId,
      messageId: input.messageId,
      chatId: input.chatId,
    });
  }

  function freezeProposalFromEvent(event, message, scope) {
    assert.equal(event.type, "memory.request", "同一消息不能更换事件类型");
    const detail = JSON.parse(event.detail);
    assert.equal(detail.action, "propose", "同一消息不能更换记忆动作");
    assert.equal(detail.messageId, message.messageId, "同一消息不能更换事件消息");
    assert.equal(detail.appId, message.appId, "同一消息不能更换 App");
    assert.equal(detail.ownerId, message.ownerId, "同一消息不能更换记忆 Owner");
    assert.equal(detail.worker, message.worker, "同一消息不能更换记忆 Worker");
    assert.equal(detail.chatId, message.chatId, "同一消息不能更换记忆 Chat");
    assert.equal(detail.scope, scope.scope, "同一消息不能更换记忆作用域");
    const sourceText = String(detail.sourceText ?? "").trim();
    assert.equal(sourceText, String(message.sourceText ?? "").trim(), "同一消息不能更换来源正文");
    const recalled = (detail.recalled ?? []).map((entry) => ({
      memoryId: entry.memoryId,
      version: entry.version,
      scope: entry.scope,
      preference: entry.preference,
      valueSha256: entry.valueSha256,
    }));
    assertRecalledAuthorized(recalled, message.ownerId, scope.scope);
    const input = {
      key: memoryInputKey(proposalTaskId(message.messageId)),
      kind: "memory_proposal_input",
      mode: "propose",
      taskId: proposalTaskId(message.messageId),
      memoryId: memoryIdForMessage(message),
      appId: message.appId,
      messageId: message.messageId,
      chatId: message.chatId,
      ownerId: message.ownerId,
      worker: message.worker,
      scope: scope.scope,
      sourceText,
      sourceTextSha256: memorySourceSha256(sourceText),
      recalled,
    };
    input.inputSha256 = proposalInputShaOf(input);
    assert.equal(detail.inputSha256, input.inputSha256, "同一消息不能更换冻结输入");
    return input;
  }

  function proposalExecutionOf(task, input, { messageId, worker, job = null, recovered = false }) {
    return {
      kind: "proposal",
      taskId: task.id,
      messageId,
      memoryId: input.memoryId,
      ownerId: input.ownerId,
      scope: input.scope,
      sourceText: input.sourceText,
      sourceTextSha256: input.sourceTextSha256,
      recalled: input.recalled,
      inputSha256: input.inputSha256,
      contextId: task.context_id,
      contextVersion: task.context_version,
      attemptId: task.current_attempt,
      runId: task.run_id,
      runAttempt: task.run_attempt,
      artifactPath: task.acceptance.path,
      worker,
      model: MEMORY_MODEL,
      job,
      recovered,
      state: task.state,
      deliveryKey: deliveryKeyOf(task.id),
    };
  }

  function proposalEvent(messageId) {
    return rows(view(), "events", { source: "feishu-test", key: messageId })[0] ?? null;
  }

  function ingestProposal(message, input) {
    return act("ingest", ["feishu-test", {
      id: message.messageId,
      type: "memory.request",
      subject: memoryContextId(input.memoryId),
      summary: "提出记忆候选",
      detail: proposalDetailOf(input),
    }]);
  }

  /**
   * A proposal runs event -> context -> task -> attempt, then a real Worker distils one preference. The host
   * freezes the authorized recall before ingest, so the request can never widen with later state.
   */
  function beginProposal(message) {
    assertMessageId(message);
    assert.ok(message.ownerId, "记忆候选缺少 Owner");
    const worker = message.worker || "OpenCode";
    assert.ok(WORKERS.includes(worker), "未知记忆 Worker");
    const scope = parseMemoryScope(message.scope);
    assert.ok(scope, `非法记忆作用域：${message.scope}`);
    assertScopeExists(scope);
    const sourceText = String(message.sourceText ?? "").trim();
    assert.ok(sourceText, "记忆候选缺少来源正文");
    assert.ok(sourceText.length <= SOURCE_TEXT_LIMIT, "记忆候选来源正文超过 4000 字符");
    const memoryId = memoryIdForMessage(message);
    const contextId = memoryContextId(memoryId);
    const taskId = proposalTaskId(message.messageId);
    const event = proposalEvent(message.messageId);

    const existing = view().get("records", `task:${taskId}`);
    if (existing) {
      let input = proposalInputRecord(taskId);
      if (!input) {
        assert.ok(event, "缺少已冻结的记忆候选事件");
        input = freezeProposalFromEvent(event, { ...message, worker }, scope);
        writeProposalInput(input);
      }
      assert.equal(input.memoryId, memoryId, "同一消息不能更换记忆对象");
      assert.equal(input.appId, message.appId, "同一消息不能更换 App");
      assert.equal(input.chatId, message.chatId, "同一消息不能更换记忆 Chat");
      assert.equal(input.scope, scope.scope, "同一消息不能更换记忆作用域");
      assert.equal(input.sourceText, sourceText, "同一消息不能更换来源正文");
      assert.equal(input.worker, worker, "同一消息不能更换记忆 Worker");
      ingestProposal(message, input);
      routeMessage(message, contextId);
      const run = view().get("runs", existing.run_id);
      const job = run?.state === "claimed" ? act("claimNext", [AGENT, `claim-${message.messageId}`]) : null;
      assert.equal(job?.run ?? existing.run_id, existing.run_id, "恢复时不能换原生 run");
      return proposalExecutionOf(existing, input, {
        messageId: message.messageId, worker, job, recovered: true,
      });
    }

    if (indexOf(memoryId)) throw new Error("该消息已有记忆候选，不能重新运行 Worker");
    const input = event
      ? freezeProposalFromEvent(event, { ...message, worker }, scope)
      : freezeProposal({ ...message, worker }, scope);
    ingestProposal(message, input);

    if (activeTask(contextId)) {
      return {
        status: "queued", messageId: message.messageId, memoryId, scope: scope.scope,
        contextId, worker, sourceText,
      };
    }

    const inLane = rows(view(), "runs", { rule: RULE, lane: contextId });
    const held = inLane.find((run) => run.state === "claimed" && run.claim === `claim-${message.messageId}`);
    let job;
    let queued = false;
    if (held) {
      job = act("claimNext", [AGENT, `claim-${message.messageId}`]);
      assert.equal(job?.run, held.id, "恢复时不能换原生 run");
    } else {
      const next = inLane.filter((run) => run.state === "queued").sort((left, right) => left.id - right.id)[0];
      if (!next || !ownTurn(next.id, contextId)) queued = true;
      else {
        job = act("claimNext", [AGENT, `claim-${message.messageId}`]);
        assert.equal(job?.run, next.id, "原生 Runtime 没有把当前对象的 run 交给本事件");
      }
    }
    if (queued) {
      return {
        status: "queued", messageId: message.messageId, memoryId, scope: scope.scope,
        contextId, worker, sourceText,
      };
    }

    routeMessage(message, contextId);
    writeProposalInput(input);
    const artifactPath = memoryVersionFile(memoryRoot, memoryId, 1, message.messageId);
    assert.ok(path.isAbsolute(artifactPath), "记忆候选路径必须是绝对路径");
    mkdirSync(path.dirname(artifactPath), { recursive: true });
    const attemptId = `attempt-${job.run}-${job.attempt}`;
    createTask(db, {
      taskId, contextId, attemptId, runId: job.run, runAttempt: job.attempt,
      acceptance: { path: artifactPath, hash: input.inputSha256, remoteVersion: SOURCE_MATERIAL },
      now: now(),
    });
    const task = view().get("records", `task:${taskId}`);
    return proposalExecutionOf(task, input, { messageId: message.messageId, worker, job });
  }

  function assertProposalExecution(execution, input) {
    assert.equal(execution.taskId, input.taskId, "执行记录 Task 不一致");
    assert.equal(execution.messageId, input.messageId, "执行记录消息不一致");
    assert.equal(execution.memoryId, input.memoryId, "执行记录记忆对象不一致");
    assert.equal(execution.ownerId, input.ownerId, "执行记录 Owner 不一致");
    assert.equal(execution.scope, input.scope, "执行记录作用域不一致");
    assert.equal(execution.sourceText, input.sourceText, "执行记录来源正文不一致");
    assert.equal(execution.inputSha256, input.inputSha256, "执行记录输入哈希不一致");
    assert.equal(execution.worker, input.worker, "执行记录 Worker 不一致");
    assert.ok(WORKERS.includes(execution.worker), "未知记忆 Worker");
    assert.deepEqual(execution.recalled, input.recalled, "执行记录召回与冻结输入不一致");
    assertRecalledAuthorized(input.recalled, input.ownerId, input.scope);
  }

  function assertProposalEvent(task, input) {
    const detail = JSON.parse(eventOf(task)?.detail || "{}");
    assert.equal(detail.action, "propose", "原生事件动作与冻结记录不一致");
    assert.equal(detail.memoryId, input.memoryId, "原生事件记忆与冻结记录不一致");
    assert.equal(detail.scope, input.scope, "原生事件作用域与冻结记录不一致");
    assert.equal(detail.ownerId, input.ownerId, "原生事件 Owner 与冻结记录不一致");
    assert.equal(detail.sourceText, input.sourceText, "原生事件正文与冻结记录不一致");
    assert.equal(detail.inputSha256, input.inputSha256, "原生事件输入哈希与冻结记录不一致");
    assert.equal(detail.worker, input.worker, "原生事件 Worker 与冻结记录不一致");
    assert.deepEqual(detail.recalled, input.recalled, "原生事件召回与冻结记录不一致");
  }

  function readProposalCandidate(task, input) {
    const persisted = readFileSync(task.acceptance.path, "utf8");
    const candidate = parseMemoryProposalCandidate(persisted);
    assert.deepEqual(Object.keys(candidate).sort(), proposalCandidateFields, "记忆候选文件包含未批准字段");
    assert.equal(candidate.memoryId, input.memoryId, "记忆候选文件对象不一致");
    assert.equal(candidate.ownerId, input.ownerId, "记忆候选文件 Owner 不一致");
    assert.equal(candidate.scope, input.scope, "记忆候选文件作用域不一致");
    assert.equal(candidate.operation, "propose", "记忆候选文件操作非法");
    assert.equal(candidate.version, 1, "记忆候选文件版本非法");
    assert.equal(candidate.sourceText, input.sourceText, "记忆候选文件正文不一致");
    assert.deepEqual(candidate.recalled, input.recalled, "记忆候选文件召回不一致");
    assert.equal(candidate.messageId, input.messageId, "记忆候选文件消息不一致");
    assert.equal(candidate.taskId, input.taskId, "记忆候选文件 Task 不一致");
    assert.equal(candidate.attemptId, task.current_attempt, "记忆候选文件 Attempt 不一致");
    assert.equal(candidate.inputSha256, input.inputSha256, "记忆候选文件输入哈希不一致");
    assert.equal(typeof candidate.preference, "string", "记忆候选文件 preference 非法");
    assert.ok(candidate.preference.trim() && candidate.preference.length <= PREFERENCE_LIMIT, "记忆候选文件 preference 长度非法");
    assert.equal(candidate.valueSha256, memoryValueSha256(candidate.preference), "记忆候选文件值哈希不一致");
    return { candidate, persisted, fileHash: sha256(persisted) };
  }

  /** Pending Memory v1 and its activate Decision exist only after the Result Lane has passed. */
  function finalizeProposal(input, candidate) {
    const decisionId = decisionIdForMessage({ appId: input.appId, messageId: input.messageId });
    const valueSha256 = memoryValueSha256(candidate.preference);
    const priorIndex = indexOf(input.memoryId);
    if (priorIndex) {
      assert.equal(priorIndex.ownerId, input.ownerId, "同一消息不能更换记忆 Owner");
      assert.equal(priorIndex.scope, input.scope, "同一消息不能更换记忆作用域");
      assert.equal(priorIndex.versions[0]?.valueSha256, valueSha256, "同一消息不能更换记忆值");
      assert.equal(priorIndex.versions[0]?.taskId ?? null, input.taskId, "同一消息不能更换记忆候选 Task");
      assert.ok(decisions.get(decisionId), `缺少记忆候选 Decision：${decisionId}`);
      // A completed proposal replayed after activation must never reopen the old pending pointer.
      if (priorIndex.status === "pending" && priorIndex.currentVersion === 1) {
        setPendingDecision(input.memoryId, decisionId);
      }
      return { decisionId, index: priorIndex };
    }
    // A Task completed by a crash before finalizeProposal must still prove its frozen recall is current.
    assertRecalledStillCurrent(input.recalled, input.ownerId, input.scope);
    const binding = {
      memoryId: input.memoryId,
      expectedMemoryVersion: 1,
      operation: "activate",
      expectedValueSha256: valueSha256,
      pendingValue: candidate.preference,
    };
    const decision = decisions.createMemoryDecision({
      ownerId: input.ownerId,
      appId: input.appId,
      originMessageId: input.messageId,
      originContext: memoryContextId(input.memoryId),
      binding,
    });
    assert.equal(decision.decisionId, decisionId, "记忆候选 Decision 与消息不一致");
    const index = writeProposal({
      memoryId: input.memoryId,
      ownerId: input.ownerId,
      scope: input.scope,
      contextId: memoryContextId(input.memoryId),
      preference: candidate.preference,
      sourceText: input.sourceText,
      decisionId,
      sourceMessageId: input.messageId,
      taskId: input.taskId,
      attemptId: candidate.attemptId,
      recalled: input.recalled,
    });
    assert.equal(index.ownerId, input.ownerId, "记忆候选 Owner 不一致");
    assert.equal(index.scope, input.scope, "记忆候选作用域不一致");
    assert.equal(index.versions[0]?.valueSha256, valueSha256, "记忆候选值不一致");
    assert.equal(index.status, "pending", "记忆候选必须保持 pending");
    assert.equal(index.currentVersion, 1, "记忆候选必须是 v1");
    assert.equal(index.pendingDecisionId, decisionId, "记忆候选未绑定激活 Decision");
    setPendingDecision(input.memoryId, decisionId);
    return { decisionId, index };
  }

  function completeProposal(execution, workerResult) {
    const current = view();
    const task = current.get("records", `task:${execution.taskId}`);
    assert.ok(task, `缺少 Task：${execution.taskId}`);
    assert.equal(task.current_attempt, execution.attemptId, "完成时必须仍是当前 Attempt");
    const input = proposalInputRecord(execution.taskId);
    assert.ok(input, "缺少冻结的记忆候选输入记录");
    assertProposalExecution(execution, input);

    if (task.state === "completed") {
      const { candidate } = readProposalCandidate(task, input);
      finalizeProposal(input, candidate);
      return trace(execution.taskId);
    }
    if (task.cancel_requested || task.state === "cancel_requested") throw new Error("取消已请求，迟到候选不能结算");
    assert.equal(task.state, "running", "任务状态不允许结算");
    assert.equal(task.acceptance.hash, input.inputSha256, "Task 验收输入与冻结记录不一致");
    assert.equal(task.acceptance.remoteVersion, SOURCE_MATERIAL, "Task 验收记忆类型不匹配");
    assertProposalEvent(task, input);
    // Check before any candidate write, Worker-done or finalizeTask: a mid-flight correction/forget must
    // leave the Task unsuccessful rather than settle a stale high-trust recall.
    assertRecalledStillCurrent(input.recalled, input.ownerId, input.scope);

    const { preference } = parseMemoryWorkerResult(workerResult);
    const candidate = memoryProposalCandidate({
      memoryId: input.memoryId,
      ownerId: input.ownerId,
      scope: input.scope,
      preference,
      valueSha256: memoryValueSha256(preference),
      sourceText: input.sourceText,
      recalled: input.recalled,
      messageId: input.messageId,
      taskId: input.taskId,
      attemptId: task.current_attempt,
      inputSha256: input.inputSha256,
    });
    const text = canonicalMemoryProposal(candidate);
    assert.deepEqual(Object.keys(candidate).sort(), proposalCandidateFields, "记忆候选包含未批准字段");
    assert.equal(candidate.operation, "propose", "记忆候选操作非法");
    assert.equal(candidate.version, 1, "记忆候选版本非法");
    mkdirSync(path.dirname(task.acceptance.path), { recursive: true });
    try {
      writeFileSync(task.acceptance.path, text, { mode: 0o600, flag: "wx" });
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      assert.equal(readFileSync(task.acceptance.path, "utf8"), text, "已有记忆候选文件与本次结果不一致");
    }
    const { persisted, fileHash } = readProposalCandidate(task, input);
    assert.equal(sha256(persisted), fileHash, "记忆候选文件 SHA 不一致");

    const attempt = current.get("records", `attempt:${execution.attemptId}`);
    if (attempt?.state === "running") reportWorkerDone(db, { taskId: execution.taskId, attemptId: execution.attemptId, now: now() });
    const run = view().get("runs", execution.runId);
    if (run?.state === "claimed") {
      assert.ok(execution.job?.token, "当前 claimed run 缺少原生执行令牌");
      act("finish", [execution.runId, execution.job.token, { outcome: "done", summary: "记忆候选已生成，等待 Result Lane" }]);
    } else {
      assert.equal(run?.state, "done", "原生 run 状态不允许业务复核");
    }

    const verificationId = `verification-${execution.taskId}`;
    const prior = view().get("records", `verification:${verificationId}`);
    if (prior) {
      assert.equal(prior.passed, true, "已有验收记录未通过");
      assert.equal(prior.attempt_id, execution.attemptId, "已有验收 Attempt 不匹配");
      assert.equal(prior.file_hash, fileHash, "已有验收文件版本不匹配");
    } else {
      recordVerification(db, {
        verificationId, taskId: execution.taskId, attemptId: execution.attemptId,
        actualPath: task.acceptance.path, actualHash: input.inputSha256,
        actualRemoteVersion: SOURCE_MATERIAL, actualFileHash: fileHash, qualityScore: 100, now: now(),
      });
    }
    finalizeTask(db, {
      commandId: `finalize-${execution.taskId}`, taskId: execution.taskId,
      attemptId: execution.attemptId, contextVersion: task.context_version,
      verificationId, now: now(),
    });
    finalizeProposal(input, candidate);
    return trace(execution.taskId);
  }

  function requestChange(message, operation) {
    assertMessageId(message);
    assert.ok(message.ownerId, "记忆变更缺少 Owner");
    const memoryId = assertMemoryId(message.memoryId);
    const expectedVersion = message.expectedVersion;
    assert.ok(Number.isSafeInteger(expectedVersion) && expectedVersion >= 1, "记忆变更缺少合法版本");
    let pendingPreference = null;
    if (operation === "correct") {
      pendingPreference = String(message.preference ?? "").trim();
      assert.ok(pendingPreference, "纠正记忆缺少新值");
    }
    const existing = decisions.get(decisionIdForMessage({ appId: message.appId, messageId: message.messageId }));
    if (existing) {
      assert.equal(existing.decisionKind, "memory.confirm", "同一消息不能更换 Decision 类型");
      assert.equal(existing.ownerId, message.ownerId, "同一消息不能更换记忆 Owner");
      assert.equal(existing.binding.memoryId, memoryId, "同一消息不能更换记忆");
      assert.equal(existing.binding.operation, operation, "同一消息不能更换记忆操作");
      assert.equal(existing.binding.expectedMemoryVersion, expectedVersion, "同一消息不能更换期望版本");
      if (operation === "correct") {
        assert.equal(existing.binding.pendingValue, pendingPreference, "同一消息不能更换纠正值");
      }
      const known = requireIndex(memoryId);
      assert.equal(known.ownerId, message.ownerId, "记忆 Owner 不符");
      // A crash between createMemoryDecision and memory_pending_set leaves a valid Decision with no index pointer.
      // Replaying the same message repairs that pointer; a consumed/applied Decision is never rewritten.
      if (existing.status === "pending") {
        assertBindingLive(existing.binding, message.ownerId);
        setPendingDecision(memoryId, existing.decisionId);
      }
      return {
        memoryId, decisionId: existing.decisionId, operation, expectedVersion,
        status: existing.status, scope: known.scope,
      };
    }
    const index = requireIndex(memoryId);
    assert.equal(index.ownerId, message.ownerId, "记忆 Owner 不符");
    assert.equal(index.status, "active", "只有 active 记忆可以纠正或遗忘");
    const current = currentVersionOf(index);
    assert.equal(current.version, expectedVersion, "记忆版本已变化");
    const pendingValue = operation === "correct" ? pendingPreference : null;
    if (index.pendingDecisionId) {
      const pending = decisions.get(index.pendingDecisionId);
      if (pending?.status === "pending") throw new Error("同一 Memory 已有待确认 Decision");
    }
    // Even if the index pointer was lost in a crash window, a live pending Decision still blocks a second one.
    const stranded = decisions.decisions().find((entry) => entry.decisionKind === "memory.confirm"
      && entry.binding?.memoryId === memoryId && entry.status === "pending");
    if (stranded) throw new Error("同一 Memory 已有待确认 Decision");
    const binding = {
      memoryId,
      expectedMemoryVersion: expectedVersion,
      operation,
      expectedValueSha256: current.valueSha256,
      pendingValue,
    };
    const decision = decisions.createMemoryDecision({
      ownerId: message.ownerId, appId: message.appId, originMessageId: message.messageId,
      originContext: index.contextId, binding,
    });
    setPendingDecision(memoryId, decision.decisionId);
    return {
      memoryId, decisionId: decision.decisionId, operation, expectedVersion,
      status: "pending", scope: index.scope,
    };
  }

  function correct(message) {
    return requestChange(message, "correct");
  }

  function forget(message) {
    return requestChange(message, "forget");
  }

  function eventDetail(message, receipt) {
    return JSON.stringify({
      action: receipt.operation,
      memoryId: receipt.memoryId,
      decisionId: receipt.decisionId,
      expectedVersion: receipt.expectedMemoryVersion,
      expectedValueSha256: receipt.expectedValueSha256,
      preference: receipt.pendingValue ?? null,
      appId: message.appId,
      chatId: message.chatId,
      ownerId: message.ownerId,
      worker: message.worker ?? "OpenCode",
    });
  }

  function ingest(message, receipt, contextId) {
    return act("ingest", ["feishu-test", {
      id: message.messageId,
      type: "memory.request",
      subject: contextId,
      summary: receipt.operation === "activate" ? "激活记忆" : receipt.operation === "correct" ? "纠正记忆" : "遗忘记忆",
      detail: eventDetail(message, receipt),
    }]);
  }

  function eventOf(task) {
    const link = rows(view(), "run_events", { run_id: task.run_id })[0];
    return link ? view().get("events", link.event_id) : null;
  }

  function trace(taskId) {
    const current = view();
    const task = current.get("records", `task:${taskId}`);
    assert.ok(task, `缺少 Task：${taskId}`);
    const input = inputRecord(taskId);
    const index = input?.memoryId ? indexOf(input.memoryId) : null;
    const event = eventOf(task);
    const attempt = current.get("records", `attempt:${task.current_attempt}`);
    const verification = task.verification_id ? current.get("records", `verification:${task.verification_id}`) : null;
    const delivery = current.get("records", deliveryKeyOf(taskId));
    const applied = input?.decisionId ? current.get("records", memoryAppliedKey(input.decisionId)) : null;
    return {
      eventId: event?.key ?? null,
      nativeEventId: event?.id ?? null,
      taskId,
      memoryId: input?.memoryId ?? null,
      decisionId: input?.decisionId ?? index?.pendingDecisionId ?? index?.versions?.[0]?.decisionId ?? null,
      operation: input?.operation ?? input?.mode ?? null,
      proposal: input?.mode === "propose",
      worker: input?.worker ?? null,
      expectedVersion: input?.expectedVersion ?? null,
      version: input?.targetVersion ?? (input?.mode === "propose" ? (index?.currentVersion ?? 1) : null),
      scope: input?.scope ?? null,
      worker: input?.worker ?? null,
      sourceTextSha256: input?.sourceTextSha256 ?? null,
      recalled: input?.recalled ?? null,
      pending: index?.status === "pending",
      memoryStatus: index?.status ?? null,
      appliedDecisionId: applied?.decisionId ?? null,
      appliedVersion: applied?.version ?? null,
      appliedStatus: applied?.status ?? null,
      contextId: task.context_id,
      contextVersion: task.context_version,
      taskState: task.state,
      attemptId: task.current_attempt,
      attemptState: attempt?.state ?? null,
      nativeRunId: task.run_id,
      nativeRunAttempt: task.run_attempt,
      nativeRunState: current.get("runs", task.run_id)?.state ?? null,
      artifactPath: task.acceptance.path,
      inputSha256: task.acceptance.hash,
      fileVersion: verification?.file_hash ?? null,
      deliveryKey: delivery?.key ?? null,
      deliveryState: delivery?.state ?? null,
      maySend: delivery?.may_send ?? null,
      providerMessageId: delivery?.provider_message_id ?? null,
    };
  }

  function executionOf(task, extra) {
    const input = inputRecord(task.id);
    return {
      taskId: task.id,
      messageId: extra.messageId,
      ownerId: input?.ownerId ?? extra.ownerId ?? null,
      memoryId: input?.memoryId ?? extra.memoryId,
      decisionId: input?.decisionId ?? extra.decisionId,
      operation: input?.operation ?? extra.operation,
      expectedVersion: input?.expectedVersion ?? extra.expectedVersion,
      targetVersion: input?.targetVersion ?? extra.targetVersion,
      version: input?.targetVersion ?? extra.targetVersion,
      scope: input?.scope ?? extra.scope,
      preference: input?.preference ?? extra.preference ?? null,
      expectedValueSha256: input?.expectedValueSha256 ?? extra.expectedValueSha256 ?? null,
      valueSha256: input?.valueSha256 ?? extra.valueSha256 ?? null,
      contextId: task.context_id,
      contextVersion: task.context_version,
      attemptId: task.current_attempt,
      runId: task.run_id,
      runAttempt: task.run_attempt,
      artifactPath: task.acceptance.path,
      inputSha256: input?.inputSha256 ?? task.acceptance.hash,
      worker: extra.worker,
      job: extra.job ?? null,
      state: task.state,
      deliveryKey: deliveryKeyOf(task.id),
    };
  }

  function inputRecord(taskId) {
    return view().get("records", memoryInputKey(taskId)) ?? null;
  }

  function writeInputRecord(input) {
    commit("syno.memory_input", (current) => {
      const key = memoryInputKey(input.taskId);
      const prior = current.get("records", key);
      if (prior) {
        assert.equal(prior.decisionId, input.decisionId, "同一消息不能更换 Decision");
        assert.equal(prior.memoryId, input.memoryId, "同一消息不能更换记忆");
        assert.equal(prior.operation, input.operation, "同一消息不能更换记忆操作");
        assert.equal(prior.expectedVersion, input.expectedVersion, "同一消息不能更换期望版本");
        assert.equal(prior.targetVersion, input.targetVersion, "同一消息不能更换目标版本");
        assert.equal(prior.valueSha256, input.valueSha256, "同一消息不能更换记忆值");
        return [];
      }
      return [record(key, input)];
    });
    return inputRecord(input.taskId);
  }

  function activeTask(contextId) {
    return rows(view(), "records").find(
      (entry) => entry.kind === "task" && entry.context_id === contextId
        && (entry.state === "running" || entry.state === "cancel_requested"),
    ) ?? null;
  }

  function ownTurn(runId, contextId) {
    const current = view();
    const live = rows(current, "runs", { rule: RULE }).filter((run) => run.state === "queued" || run.state === "claimed");
    const claimed = live.filter((run) => run.state === "claimed");
    if (claimed.some((run) => run.lane === contextId)) return false;
    const first = live
      .filter((run) => run.state === "queued")
      .sort((left, right) => left.id - right.id)
      .find((run) => !claimed.some((other) => other.lane === run.lane) && claimed.filter((other) => other.grp === run.grp).length < PARALLEL);
    return first?.id === runId;
  }

  function assertMessageId(message) {
    assert.match(String(message.messageId ?? ""), /^[A-Za-z0-9_-]{1,48}$/u, "消息 ID 不符合隔离实验约束");
  }

  /**
   * Confirmation is the business-result path: consume the Decision, then ingest, route, claim and create one Task.
   * The receipt is written before ingest so a crash can resume from the same confirmation message.
   */
  function begin(message) {
    assertMessageId(message);
    assert.ok(message.ownerId, "记忆确认缺少 Owner");
    const decisionId = message.decisionId;
    assert.ok(DECISION_ID.test(String(decisionId)), "记忆确认缺少合法 Decision");
    const action = message.action;
    assert.ok(OPERATIONS.includes(action), "未知记忆确认动作");
    const worker = message.worker || "OpenCode";
    assert.ok(WORKERS.includes(worker), "未知记忆 Worker");

    const decision = decisions.get(decisionId);
    assert.ok(decision, `未知 Decision：${decisionId}`);
    assert.equal(decision.decisionKind, "memory.confirm", "不是记忆确认 Decision");
    assert.equal(decision.ownerId, message.ownerId, "记忆 Decision Owner 不符");
    assert.equal(decision.binding.operation, action, "确认动作与 Decision 不一致");
    assert.notEqual(message.messageId, decision.originMessageId, "同一条提出消息不能确认自己");

    const consumed = decisions.consume({
      ownerId: message.ownerId,
      appId: message.appId,
      messageId: message.messageId,
      decisionId,
      precheck: (candidate, current) => assertBindingIn(current, candidate.binding, message.ownerId),
    });
    if (consumed.status !== "consumed") return consumed;
    const receipt = consumed.receipt;
    clearPendingDecision(receipt.memoryId, decisionId);
    return startConsumed({ message, decisionId, receipt, action, worker });
  }

  /** Everything after one Decision is consumed, shared by first delivery, replay and queued drain. */
  function startConsumed({ message, decisionId, receipt, action, worker }) {
    const contextId = memoryContextId(receipt.memoryId);
    const taskId = `task-${message.messageId}`;

    const existing = view().get("records", `task:${taskId}`);
    if (existing) {
      const frozen = inputRecord(taskId);
      assert.ok(frozen, "缺少已冻结的记忆输入记录");
      assert.equal(frozen.decisionId, decisionId, "同一消息不能更换 Decision");
      ingest(message, receipt, contextId);
      routeMessage(message, contextId);
      const run = view().get("runs", existing.run_id);
      const job = run?.state === "claimed" ? act("claimNext", [AGENT, `claim-${message.messageId}`]) : null;
      assert.equal(job?.run ?? existing.run_id, existing.run_id, "恢复时不能换原生 run");
      return executionOf(existing, {
        messageId: message.messageId, worker, job, memoryId: receipt.memoryId,
        decisionId, operation: action, expectedVersion: receipt.expectedMemoryVersion,
        targetVersion: frozen.targetVersion, scope: frozen.scope, preference: frozen.preference,
        expectedValueSha256: frozen.expectedValueSha256, valueSha256: frozen.valueSha256,
      });
    }

    // A consumed Decision whose Task was never created must still be validated against the live memory version.
    assertBindingLive(receipt, message.ownerId);

    if (activeTask(contextId)) {
      ingest(message, receipt, contextId);
      return {
        status: "queued", messageId: message.messageId, memoryId: receipt.memoryId,
        decisionId, operation: action, contextId,
      };
    }

    ingest(message, receipt, contextId);
    const inLane = rows(view(), "runs", { rule: RULE, lane: contextId });
    const held = inLane.find((run) => run.state === "claimed" && run.claim === `claim-${message.messageId}`);
    let job;
    let queued = false;
    if (held) {
      job = act("claimNext", [AGENT, `claim-${message.messageId}`]);
      assert.equal(job?.run, held.id, "恢复时不能换原生 run");
    } else {
      const next = inLane.filter((run) => run.state === "queued").sort((left, right) => left.id - right.id)[0];
      if (!next || !ownTurn(next.id, contextId)) queued = true;
      else {
        job = act("claimNext", [AGENT, `claim-${message.messageId}`]);
        assert.equal(job?.run, next.id, "原生 Runtime 没有把当前对象的 run 交给本事件");
      }
    }
    if (queued) {
      return {
        status: "queued", messageId: message.messageId, memoryId: receipt.memoryId,
        decisionId, operation: action, contextId,
      };
    }

    const routed = routeMessage(message, contextId);
    const contextVersion = routed.receipt.version;
    const expectedVersion = receipt.expectedMemoryVersion;
    const targetVersion = expectedVersion + 1;
    const preference = action === "forget" ? null : (receipt.pendingValue ?? null);
    const valueSha256 = action === "forget" ? null : memoryValueSha256(preference);
    const index = requireIndex(receipt.memoryId);
    const input = {
      key: memoryInputKey(taskId),
      kind: "memory_input",
      taskId,
      memoryId: receipt.memoryId,
      ownerId: message.ownerId,
      scope: index.scope,
      decisionId,
      operation: action,
      expectedVersion,
      targetVersion,
      preference,
      expectedValueSha256: receipt.expectedValueSha256,
      valueSha256,
      sourceMessageId: message.messageId,
      inputSha256: inputShaOf({
        operation: action, memoryId: receipt.memoryId, decisionId, expectedVersion, targetVersion,
        preference, expectedValueSha256: receipt.expectedValueSha256, valueSha256,
        ownerId: message.ownerId, scope: index.scope,
      }),
      worker,
      appId: message.appId,
      messageId: message.messageId,
      chatId: message.chatId,
    };
    writeInputRecord(input);
    const artifactPath = memoryVersionFile(memoryRoot, receipt.memoryId, targetVersion, message.messageId);
    mkdirSync(path.dirname(artifactPath), { recursive: true });
    const attemptId = `attempt-${job.run}-${job.attempt}`;
    createTask(db, {
      taskId, contextId, attemptId, runId: job.run, runAttempt: job.attempt,
      acceptance: { path: artifactPath, hash: input.inputSha256, remoteVersion: SOURCE_MATERIAL },
      now: now(),
    });
    const task = view().get("records", `task:${taskId}`);
    return executionOf(task, {
      messageId: message.messageId, worker, job, memoryId: receipt.memoryId, decisionId,
      operation: action, expectedVersion, targetVersion, scope: index.scope,
      preference, expectedValueSha256: receipt.expectedValueSha256, valueSha256,
    });
  }

  function expectedSnapshot(input, task) {
    return memorySnapshot({
      memoryId: input.memoryId,
      ownerId: input.ownerId,
      scope: input.scope,
      operation: input.operation,
      decisionId: input.decisionId,
      expectedVersion: input.expectedVersion,
      version: input.targetVersion,
      preference: input.preference,
      expectedValueSha256: input.expectedValueSha256,
      valueSha256: input.valueSha256,
      sourceMessageId: input.sourceMessageId,
      taskId: task.id,
      attemptId: task.current_attempt,
      inputSha256: input.inputSha256,
    });
  }

  function verifySnapshot(task, input) {
    const persisted = readFileSync(task.acceptance.path, "utf8");
    const snapshot = parseMemorySnapshot(persisted);
    const expected = expectedSnapshot(input, task);
    assert.equal(canonicalMemorySnapshot(snapshot), canonicalMemorySnapshot(expected), "记忆候选快照与冻结输入不一致");
    assert.equal(snapshot.schema, MEMORY_SNAPSHOT_SCHEMA, "记忆候选快照 schema 非法");
    if (input.operation === "forget") {
      assert.equal(snapshot.preference, null, "遗忘候选不能携带正文");
      assert.equal(input.valueSha256, null, "遗忘候选不能有值哈希");
    } else {
      assert.equal(memoryValueSha256(snapshot.preference), input.valueSha256, "记忆候选值哈希不一致");
    }
    return { persisted, snapshot, fileHash: sha256(persisted) };
  }

  /** The ledger only ever appends versions; old values keep their hashes and status. */
  function applyTransition(taskId) {
    const input = inputRecord(taskId);
    assert.ok(input, "缺少冻结的记忆输入记录");
    commit("syno.memory_transition", (current) => {
      const appliedKey = memoryAppliedKey(input.decisionId);
      const applied = current.get("records", appliedKey);
      if (applied) return [];
      const key = memoryIndexKey(input.memoryId);
      const index = current.get("records", key);
      assert.ok(index, `未知记忆：${input.memoryId}`);
      assert.equal(index.scope, input.scope, "记忆作用域已变化");
      const task = current.get("records", `task:${taskId}`);
      assertBindingIn(current, {
        memoryId: input.memoryId,
        expectedMemoryVersion: input.expectedVersion,
        operation: input.operation,
        expectedValueSha256: input.expectedValueSha256,
      }, input.ownerId);
      const prior = index.versions.find((version) => version.version === input.targetVersion);
      if (prior) {
        assert.equal(prior.valueSha256, input.valueSha256, "同一记忆版本不能更换内容");
      }
      const versions = index.versions.map((version) => {
        if (input.operation !== "activate" && version.status === "active") {
          return { ...version, status: "superseded", supersededAt: now(), supersededBy: input.targetVersion };
        }
        return version;
      });
      if (!prior) {
        versions.push({
          version: input.targetVersion,
          status: input.operation === "forget" ? "revoked" : "active",
          operation: input.operation,
          preference: input.preference,
          valueSha256: input.valueSha256,
          sourceText: null,
          decisionId: input.decisionId,
          sourceMessageId: input.sourceMessageId,
          taskId,
          attemptId: task?.current_attempt ?? null,
          createdAt: now(),
          supersededAt: null,
          supersededBy: null,
        });
      }
      const next = {
        ...index,
        status: input.operation === "forget" ? "revoked" : "active",
        currentVersion: input.targetVersion,
        versions: versions.sort((left, right) => left.version - right.version),
        pendingDecisionId: index.pendingDecisionId === input.decisionId ? null : index.pendingDecisionId,
        updatedAt: now(),
      };
      return [
        record(key, next),
        record(appliedKey, {
          key: appliedKey, kind: "memory_apply", id: input.decisionId, decisionId: input.decisionId,
          memoryId: input.memoryId, version: input.targetVersion, status: next.status,
          taskId, attemptId: current.get("records", `task:${taskId}`)?.current_attempt ?? null,
          appliedAt: now(),
        }),
      ];
    });
  }

  function complete(execution) {
    const current = view();
    const task = current.get("records", `task:${execution.taskId}`);
    assert.ok(task, `缺少 Task：${execution.taskId}`);
    assert.equal(task.current_attempt, execution.attemptId, "完成时必须仍是当前 Attempt");
    if (task.state === "completed") {
      applyTransition(execution.taskId);
      return trace(execution.taskId);
    }
    if (task.cancel_requested || task.state === "cancel_requested") throw new Error("取消已请求，迟到候选不能结算");
    assert.equal(task.state, "running", "任务状态不允许结算");

    const input = inputRecord(execution.taskId);
    assert.ok(input, "缺少冻结的记忆输入记录");
    assert.equal(input.decisionId, execution.decisionId, "执行记录 Decision 不一致");
    assert.equal(input.inputSha256, task.acceptance.hash, "Task 验收输入与冻结记录不一致");
    assert.equal(task.acceptance.remoteVersion, SOURCE_MATERIAL, "Task 验收记忆类型不匹配");
    assert.equal(input.targetVersion, input.expectedVersion + 1, "记忆目标版本不是期望版本的下一版");
    if (input.operation === "forget") {
      assert.equal(input.preference, null, "遗忘输入不能携带正文");
      assert.equal(input.valueSha256, null, "遗忘输入不能有值哈希");
    } else {
      assert.equal(memoryValueSha256(input.preference), input.valueSha256, "输入记忆值哈希不一致");
    }
    const index = requireIndex(input.memoryId);
    assert.equal(index.scope, input.scope, "记忆作用域已变化");
    const decision = decisions.get(input.decisionId);
    assert.ok(decision, `未知 Decision：${input.decisionId}`);
    assert.equal(decision.decisionKind, "memory.confirm", "不是记忆确认 Decision");
    assert.equal(decision.status, "consumed", "记忆 Decision 尚未消费");
    assert.equal(decision.consumedByMessageId, input.messageId, "记忆 Decision 不是由本消息消费");
    assert.equal(decision.binding.memoryId, input.memoryId, "Decision 与冻结记忆不一致");
    assert.equal(decision.binding.expectedMemoryVersion, input.expectedVersion, "Decision 与期望版本不一致");
    assert.equal(decision.binding.operation, input.operation, "Decision 与记忆操作不一致");
    assert.equal(decision.binding.expectedValueSha256, input.expectedValueSha256, "Decision 与旧值哈希不一致");
    assert.equal(decision.binding.pendingValue ?? null, input.preference, "Decision 与待确认值不一致");
    assertBindingLive({
      memoryId: input.memoryId,
      expectedMemoryVersion: input.expectedVersion,
      operation: input.operation,
      expectedValueSha256: input.expectedValueSha256,
    }, input.ownerId);

    const { fileHash } = verifySnapshot(task, input);
    const detail = JSON.parse(eventOf(task)?.detail || "{}");
    assert.equal(detail.action, input.operation, "原生事件动作与冻结记录不一致");
    assert.equal(detail.memoryId, input.memoryId, "原生事件记忆与冻结记录不一致");
    assert.equal(detail.decisionId, input.decisionId, "原生事件 Decision 与冻结记录不一致");
    assert.equal(detail.expectedValueSha256, input.expectedValueSha256, "原生事件值哈希与冻结记录不一致");

    const attempt = current.get("records", `attempt:${execution.attemptId}`);
    if (attempt?.state === "running") reportWorkerDone(db, { taskId: execution.taskId, attemptId: execution.attemptId, now: now() });
    const run = view().get("runs", execution.runId);
    if (run?.state === "claimed") {
      assert.ok(execution.job?.token, "当前 claimed run 缺少原生执行令牌");
      act("finish", [execution.runId, execution.job.token, { outcome: "done", summary: "记忆候选已生成，等待 Result Lane" }]);
    } else {
      assert.equal(run?.state, "done", "原生 run 状态不允许业务复核");
    }

    const verificationId = `verification-${execution.taskId}`;
    const prior = view().get("records", `verification:${verificationId}`);
    if (prior) {
      assert.equal(prior.passed, true, "已有验收记录未通过");
      assert.equal(prior.attempt_id, execution.attemptId, "已有验收 Attempt 不匹配");
      assert.equal(prior.file_hash, fileHash, "已有验收文件版本不匹配");
    } else {
      recordVerification(db, {
        verificationId, taskId: execution.taskId, attemptId: execution.attemptId,
        actualPath: task.acceptance.path, actualHash: input.inputSha256,
        actualRemoteVersion: SOURCE_MATERIAL, actualFileHash: fileHash, qualityScore: 100, now: now(),
      });
    }
    finalizeTask(db, {
      commandId: `finalize-${execution.taskId}`, taskId: execution.taskId,
      attemptId: execution.attemptId, contextVersion: task.context_version,
      verificationId, now: now(),
    });
    applyTransition(execution.taskId);
    return trace(execution.taskId);
  }

  function queued() {
    const current = view();
    const messages = [];
    for (const link of rows(current, "run_events")) {
      const run = current.get("runs", link.run_id);
      if (run?.state !== "queued" || run.rule !== RULE) continue;
      const event = current.get("events", link.event_id);
      if (event?.type !== "memory.request") continue;
      const detail = JSON.parse(event.detail);
      const shared = {
        appId: detail.appId, messageId: detail.messageId ?? event.key, chatId: detail.chatId,
        ownerId: detail.ownerId, action: detail.action, memoryId: detail.memoryId,
        nativeRunId: run.id, worker: detail.worker ?? "OpenCode",
      };
      if (detail.action === "propose") {
        messages.push({
          ...shared, scope: detail.scope, sourceText: detail.sourceText,
          sourceTextSha256: detail.sourceTextSha256,
        });
        continue;
      }
      messages.push({
        ...shared, decisionId: detail.decisionId, expectedVersion: detail.expectedVersion,
      });
    }
    return messages.sort((left, right) => left.nativeRunId - right.nativeRunId || left.messageId.localeCompare(right.messageId));
  }

  /**
   * Host-driven drain of queued memory work. A live confirmation resumes its original message and starts one Task; a
   * stale confirmation settles the Decision, cancels the native run and reports `stale`; a proposal resumes the same
   * frozen event/run and never recomputes its authorized recall. Replay is inert once the run leaves `queued`.
   */
  function drainQueued() {
    const outcomes = [];
    for (const entry of queued()) {
      if (entry.action === "propose") {
        const execution = beginProposal({
          appId: entry.appId, messageId: entry.messageId, chatId: entry.chatId,
          ownerId: entry.ownerId, worker: entry.worker, scope: entry.scope, sourceText: entry.sourceText,
        });
        outcomes.push({
          status: execution.status === "queued" ? "queued" : "claimed",
          action: "propose", appId: entry.appId, chatId: entry.chatId, ownerId: entry.ownerId,
          messageId: entry.messageId, memoryId: entry.memoryId, nativeRunId: entry.nativeRunId,
          execution: execution.status === "queued" ? null : execution,
        });
        continue;
      }
      const decision = decisions.get(entry.decisionId);
      const state = decision?.decisionKind === "memory.confirm"
        ? bindingState(decision.binding, entry.ownerId)
        : { live: false, error: "缺少记忆确认 Decision" };
      if (state.live && decision.status === "consumed"
        && decision.consumedByMessageId === entry.messageId && decision.consumption?.receipt) {
        const execution = startConsumed({
          message: {
            appId: entry.appId, messageId: entry.messageId, chatId: entry.chatId,
            ownerId: entry.ownerId, worker: entry.worker,
          },
          decisionId: entry.decisionId,
          receipt: decision.consumption.receipt,
          action: decision.binding.operation,
          worker: entry.worker,
        });
        outcomes.push({
          status: execution.status === "queued" ? "queued" : "claimed",
          action: "confirm", appId: entry.appId, chatId: entry.chatId, ownerId: entry.ownerId,
          messageId: entry.messageId, decisionId: entry.decisionId, memoryId: entry.memoryId,
          execution: execution.status === "queued" ? null : execution,
        });
        continue;
      }
      if (decision?.decisionKind === "memory.confirm" && decision.status === "consumed"
        && decision.consumedByMessageId === entry.messageId) {
        decisions.settleStale({
          ownerId: entry.ownerId, decisionId: entry.decisionId,
          messageId: entry.messageId, reason: state.error ?? "missing-consumption",
        });
      }
      const run = view().get("runs", entry.nativeRunId);
      if (run?.state === "queued") act("cancel", [entry.nativeRunId]);
      outcomes.push({
        status: "stale", reason: state.error ?? "missing-consumption",
        action: "confirm", appId: entry.appId, chatId: entry.chatId, ownerId: entry.ownerId,
        messageId: entry.messageId, decisionId: entry.decisionId, memoryId: entry.memoryId,
        nativeRunId: entry.nativeRunId,
      });
    }
    return outcomes;
  }

  function memories() {
    return rows(view(), "records")
      .filter((entry) => entry.kind === "memory_index")
      .map((entry) => ({ ...entry }))
      .sort((left, right) => left.memoryId.localeCompare(right.memoryId));
  }

  function recall({ ownerId, contextId = null }) {
    assert.ok(ownerId, "记忆召回缺少 Owner");
    return recallableMemories(rows(view(), "records"), { ownerId, contextId });
  }

  function cancelDecision({ ownerId, decisionId, reason = "cancelled" }) {
    const outcome = decisions.cancel({ ownerId, decisionId, reason });
    const decision = decisions.get(decisionId);
    if (decision?.decisionKind === "memory.confirm") {
      clearPendingDecision(decision.binding.memoryId, decisionId);
    }
    return outcome;
  }

  return {
    propose,
    beginProposal,
    completeProposal,
    correct,
    forget,
    begin,
    complete,
    trace,
    queued,
    drainQueued,
    memories,
    recall,
    index: (memoryId) => indexOf(memoryId),
    version: (memoryId) => {
      const index = indexOf(memoryId);
      return index ? currentVersionOf(index) : null;
    },
    cancelDecision,
    claim: (deliveryKey) => claimDelivery(db, { deliveryKey, now: now() }),
    accept: (deliveryKey) => acceptDelivery(db, { deliveryKey, providerMessageId: null, capability: "at_least_once", now: now() }),
    unknown: (deliveryKey) => markDeliveryUnknown(db, { deliveryKey, now: now() }),
    cancel: (taskId) => requestCancel(db, { taskId, now: now() }),
    factCount: () => Number(db.prepare("SELECT COUNT(*) AS count FROM facts").get().count),
    close: () => { if (!sharedDb) db.close(); },
  };
}
