// P3.1 idea host: native runs, business Tasks and versioned Markdown in the one isolated fact log.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
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
} from "../../packages/syno-autoloop/examples/syno-p0/commands.ts";
import { rows } from "../../packages/syno-autoloop/kernel/evolve.ts";
import { commitLatest } from "../../packages/syno-autoloop/kernel/store.ts";
import { parseRules } from "../../packages/syno-autoloop/protocol/rules.ts";
import {
  IDEA_ID,
  ideaComparePath,
  ideaContextId,
  ideaIdForMessage,
  ideaIndexKey,
  ideaInputKey,
  ideaTitle,
  ideaVersionPath,
  parseCandidateMarkdown,
  renderCitationBlock,
  sha256,
} from "./idea-object.mjs";

const MODEL = "opencode-go/deepseek-v4.1-flash";
const SOURCE_MATERIAL = "idea-markdown-v1";
const ENVIRONMENT = { secret: "syno-p3-idea-isolated-test", publicUrl: "" };
const RULE = "想法对象处理";
const AGENT = "syno-p3-idea";
const GROUP = "syno-p3-idea";
const PARALLEL = 4;
const ACTIONS = ["new", "continue", "compare"];
const WORKERS = ["OpenCode", "Pi"];

const inputSha = (action, prompt, inputs) => sha256(JSON.stringify({ action, prompt, inputs }));
const deliveryKeyOf = (taskId) => `delivery:${taskId}:result`;

export function openNativeIdeaRuntime({
  databasePath,
  vaultRoot,
  ideaRoot = path.join(vaultRoot, "03-Ideas"),
  now = () => Date.now(),
  db: sharedDb = null,
  configureRules = true,
}) {
  mkdirSync(ideaRoot, { recursive: true });
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
      agents: { idea: { name: "想法候选 Worker", worker: AGENT, use: "command", command: ["true"] } },
      rules: [{
        name: RULE,
        when: { source: "feishu-test", types: ["idea.request"] },
        to: "idea",
        cwd: vaultRoot,
        prompt: "Worker 只生成想法候选；宿主独立复核版本与引用后结算",
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

  function indexOf(ideaId) {
    return view().get("records", ideaIndexKey(ideaId)) ?? null;
  }

  function requireIndex(ideaId) {
    const index = indexOf(ideaId);
    assert.ok(index, `未知想法：${ideaId}`);
    return index;
  }

  function ensureIndex({ ideaId, contextId, title }) {
    commit("syno.idea_index", (current) => {
      const key = ideaIndexKey(ideaId);
      if (current.get("records", key)) return [];
      return [{
        table: "records",
        key,
        row: {
          key, kind: "idea_index", id: ideaId, ideaId, contextId, title,
          versions: [], latestVersion: null, createdAt: now(), updatedAt: now(),
        },
      }];
    });
  }

  function recordVersion(ideaId, entry) {
    commit("syno.idea_version", (current) => {
      const key = ideaIndexKey(ideaId);
      const index = current.get("records", key);
      assert.ok(index, `缺少想法索引：${ideaId}`);
      const prior = index.versions.find((version) => version.version === entry.version);
      if (prior) {
        assert.equal(prior.path, entry.path, "同一想法版本不能更换文件");
        assert.equal(prior.sha256, entry.sha256, "同一想法版本不能更换内容");
        assert.equal(prior.attemptId, entry.attemptId, "同一想法版本不能更换 Attempt");
        return [];
      }
      const versions = [...index.versions, entry].sort((left, right) => left.version - right.version);
      return [{
        table: "records",
        key,
        row: { ...index, versions, latestVersion: versions.at(-1).version, updatedAt: now() },
      }];
    });
  }

  function inputRecord(taskId) {
    return view().get("records", ideaInputKey(taskId)) ?? null;
  }

  function writeInputRecord(record) {
    commit("syno.idea_input", (current) => {
      const key = ideaInputKey(record.task_id);
      const prior = current.get("records", key);
      if (prior) {
        assert.equal(prior.input_sha256, record.input_sha256, "同一消息不能更换输入版本");
        assert.equal(prior.action, record.action, "同一消息不能更换动作");
        assert.equal(prior.ideaId, record.ideaId, "同一消息不能更换想法对象");
        return [];
      }
      return [{ table: "records", key, row: record }];
    });
  }

  function freezeInputs(action, ideaId, ideaIds) {
    const ids = action === "compare" ? ideaIds : action === "continue" ? [ideaId] : [];
    return ids.map((id) => {
      const index = requireIndex(id);
      const latest = index.versions.find((version) => version.version === index.latestVersion);
      assert.ok(latest, `想法 ${id} 还没有可引用的完成版本`);
      const persisted = readFileSync(latest.path, "utf8");
      assert.equal(sha256(persisted), latest.sha256, `想法 ${id} 的输入版本已变化`);
      return { ideaId: id, version: latest.version, path: latest.path, sha256: latest.sha256 };
    });
  }

  function activeTask(contextId) {
    return rows(view(), "records").find(
      (row) => row.kind === "task" && row.context_id === contextId && (row.state === "running" || row.state === "cancel_requested"),
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

  function route(message, contextId) {
    const current = view();
    const context = current.get("records", `context:${contextId}`);
    const priorInbox = current.get("records", `inbox:${JSON.stringify([message.appId, message.messageId])}`);
    const originalVersion = priorInbox ? (priorInbox.receipt.version === 1 ? null : priorInbox.receipt.version - 1) : null;
    return applyRoute(db, {
      commandId: `route-${message.appId}-${message.messageId}`,
      appId: message.appId,
      messageId: message.messageId,
      contextId,
      expectedVersion: priorInbox ? originalVersion : (context?.version ?? null),
      ownerId: message.ownerId,
      replyTo: message.chatId,
      now: now(),
    });
  }

  function eventOf(task) {
    const link = rows(view(), "run_events", { run_id: task.run_id })[0];
    return link ? view().get("events", link.event_id) : null;
  }

  function trace(taskId) {
    const current = view();
    const task = current.get("records", `task:${taskId}`);
    assert.ok(task, `缺少 Task：${taskId}`);
    const event = eventOf(task);
    const attempt = current.get("records", `attempt:${task.current_attempt}`);
    const verification = task.verification_id ? current.get("records", `verification:${task.verification_id}`) : null;
    const delivery = current.get("records", deliveryKeyOf(taskId));
    return {
      eventId: event?.key ?? null,
      nativeEventId: event?.id ?? null,
      ideaId: String(task.context_id).slice("idea:".length),
      contextId: task.context_id,
      contextVersion: task.context_version,
      taskId,
      taskState: task.state,
      attemptId: task.current_attempt,
      attemptState: attempt?.state ?? null,
      nativeRunId: task.run_id,
      nativeRunAttempt: task.run_attempt,
      nativeRunState: current.get("runs", task.run_id)?.state ?? null,
      path: task.acceptance.path,
      inputSha256: task.acceptance.hash,
      fileVersion: verification?.file_hash ?? null,
      deliveryKey: delivery?.key ?? null,
      deliveryState: delivery?.state ?? null,
      maySend: delivery?.may_send ?? null,
      providerMessageId: delivery?.provider_message_id ?? null,
    };
  }

  function executionOf(task, { messageId, action, ideaId, worker, job = null, inputSha256 }) {
    const record = inputRecord(task.id);
    return {
      taskId: task.id,
      messageId,
      action,
      ideaId,
      ideaIds: record?.ideaIds ?? null,
      prompt: record?.prompt ?? null,
      inputs: record?.inputs ?? [],
      attemptId: task.current_attempt,
      runId: task.run_id,
      runAttempt: task.run_attempt,
      contextId: task.context_id,
      contextVersion: task.context_version,
      artifactPath: task.acceptance.path,
      inputSha256: inputSha256 ?? task.acceptance.hash,
      worker,
      job,
      state: task.state,
      deliveryKey: deliveryKeyOf(task.id),
    };
  }

  function begin(message) {
    assert.match(message.messageId, /^[A-Za-z0-9_-]{1,48}$/u, "消息 ID 不符合隔离实验约束");
    const worker = message.worker || "OpenCode";
    assert.ok(WORKERS.includes(worker), "未知想法 Worker");
    const action = message.action;
    assert.ok(ACTIONS.includes(action), "未知想法动作");
    const prompt = String(message.prompt ?? "").trim();
    assert.ok(prompt, "想法请求缺少正文");
    const pair = action === "compare" ? [...(message.ideaIds ?? [])] : [];
    if (action === "compare") {
      assert.equal(pair.length, 2, "比较必须给出两个想法");
      assert.ok(pair.every((id) => IDEA_ID.test(id)), "比较想法 ID 非法");
      assert.notEqual(pair[0], pair[1], "比较想法 ID 不能相同");
      requireIndex(pair[0]);
      requireIndex(pair[1]);
    }
    const ideaId = action === "new" ? ideaIdForMessage(message) : (action === "compare" ? pair[0] : message.ideaId);
    assert.ok(IDEA_ID.test(ideaId), "想法 ID 非法");
    if (action !== "new") requireIndex(ideaId);
    const contextId = ideaContextId(ideaId);
    const taskId = `task-${message.messageId}`;
    const detail = JSON.stringify({
      action,
      ideaId,
      ideaIds: action === "compare" ? pair : null,
      prompt,
      worker,
      appId: message.appId,
      chatId: message.chatId,
      ownerId: message.ownerId,
    });
    const ingest = () => act("ingest", ["feishu-test", {
      id: message.messageId,
      type: "idea.request",
      subject: contextId,
      summary: action === "compare" ? "比较想法" : action === "continue" ? "继续想法" : "新建想法",
      detail,
    }]);

    const existing = view().get("records", `task:${taskId}`);
    if (existing) {
      route(message, contextId);
      ingest();
      assert.equal(eventOf(existing)?.detail, detail, "同一消息不能更换动作、对象或正文");
      const run = view().get("runs", existing.run_id);
      const job = run?.state === "claimed" ? act("claimNext", [AGENT, `claim-${message.messageId}`]) : null;
      assert.equal(job?.run ?? existing.run_id, existing.run_id, "恢复时不能换原生 run");
      assert.ok(inputRecord(taskId), "缺少已冻结的想法输入记录");
      if (action === "new") {
        ensureIndex({ ideaId, contextId, title: ideaTitle(prompt) });
      }
      return executionOf(existing, { messageId: message.messageId, action, ideaId, worker, job });
    }

    if (activeTask(contextId)) {
      ingest();
      return { state: "queued", messageId: message.messageId, ideaId, action, contextId, worker, prompt };
    }

    ingest();
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
    if (queued) return { state: "queued", messageId: message.messageId, ideaId, action, contextId, worker, prompt };

    const routed = route(message, contextId);
    const version = routed.receipt.version;
    let frozen = inputRecord(taskId);
    if (!frozen) {
      const inputs = freezeInputs(action, ideaId, pair);
      const record = {
        key: ideaInputKey(taskId),
        kind: "idea_input",
        task_id: taskId,
        action,
        ideaId,
        ideaIds: action === "compare" ? pair : null,
        prompt,
        inputs,
        input_sha256: inputSha(action, prompt, inputs),
        worker,
        appId: message.appId,
        messageId: message.messageId,
        chatId: message.chatId,
        ownerId: message.ownerId,
      };
      writeInputRecord(record);
      frozen = record;
    } else {
      assert.equal(frozen.action, action, "同一消息不能更换动作");
      assert.equal(frozen.ideaId, ideaId, "同一消息不能更换想法对象");
    }
    const attemptId = `attempt-${job.run}-${job.attempt}`;
    const artifactPath = action === "compare"
      ? ideaComparePath(ideaRoot, ideaId, pair.map((id) => requireIndex(id).latestVersion), message.messageId)
      : ideaVersionPath(ideaRoot, ideaId, version, message.messageId);
    mkdirSync(path.dirname(artifactPath), { recursive: true });
    createTask(db, {
      taskId, contextId, attemptId, runId: job.run, runAttempt: job.attempt,
      acceptance: { path: artifactPath, hash: frozen.input_sha256, remoteVersion: SOURCE_MATERIAL },
      now: now(),
    });
    if (action === "new") ensureIndex({ ideaId, contextId, title: ideaTitle(prompt) });
    const task = view().get("records", `task:${taskId}`);
    return executionOf(task, {
      messageId: message.messageId, action, ideaId, worker, job, inputSha256: frozen.input_sha256,
    });
  }

  function verifyCitations(record, citations) {
    const allowed = new Map(record.inputs.map((input) => [input.ideaId, input]));
    if (record.action === "new") {
      assert.equal(citations.length, 0, "新建想法不能引用其他对象");
      return;
    }
    assert.ok(citations.length > 0, "续接或比较必须引用固定输入版本");
    const seen = new Set();
    for (const citation of citations) {
      const input = allowed.get(citation.ideaId);
      assert.ok(input, "引用来自其他对象");
      assert.equal(citation.version, input.version, "引用版本不是固定输入版本");
      assert.equal(citation.path, input.path, "引用路径不是固定输入版本");
      const persisted = readFileSync(input.path, "utf8");
      assert.equal(sha256(persisted), input.sha256, "引用输入版本已变化");
      assert.equal(citation.sha256, input.sha256, "引用 SHA256 不一致");
      assert.ok(Number.isSafeInteger(citation.offset) && citation.offset >= 0, "引用 offset 非法");
      assert.ok(Number.isSafeInteger(citation.end), "引用 end 非法");
      assert.equal(citation.end, citation.offset + citation.excerpt.length, "引用长度不一致");
      assert.equal(persisted.slice(citation.offset, citation.end), citation.excerpt, "引用片段或 offset 不一致");
      seen.add(citation.ideaId);
    }
    if (record.action === "continue") assert.equal(seen.size, 1, "续接只能引用同一想法的固定版本");
    if (record.action === "compare") {
      for (const input of record.inputs) assert.ok(seen.has(input.ideaId), "比较必须同时引用两个固定版本");
    }
  }

  function complete(execution) {
    const current = view();
    const task = current.get("records", `task:${execution.taskId}`);
    assert.ok(task && task.current_attempt === execution.attemptId, "完成时必须仍是当前 Attempt");
    if (task.state === "completed") {
      if (execution.action === "new" || execution.action === "continue") {
        const verification = current.get("records", `verification:${task.verification_id}`);
        recordVersion(execution.ideaId, {
          version: task.context_version, path: task.acceptance.path, sha256: verification?.file_hash,
          messageId: execution.messageId, taskId: task.id, attemptId: task.current_attempt,
        });
      }
      return trace(execution.taskId);
    }
    if (task.cancel_requested || task.state === "cancel_requested") throw new Error("取消已请求，迟到候选不能结算");
    assert.equal(task.state, "running", "任务状态不允许结算");
    assert.equal(execution.contextVersion, task.context_version, "执行记录与 Task 版本不一致");

    const record = inputRecord(execution.taskId);
    assert.ok(record, "缺少冻结的想法输入记录");
    assert.equal(record.input_sha256, task.acceptance.hash, "Task 验收输入与冻结记录不一致");
    assert.equal(execution.inputSha256, record.input_sha256, "执行记录输入版本不一致");
    const canonicalEvent = eventOf(task);
    const eventDetail = JSON.parse(canonicalEvent?.detail || "{}");
    assert.equal(eventDetail.action, record.action, "原生事件动作与冻结记录不一致");
    assert.equal(eventDetail.worker, execution.worker, "执行记录 Worker 与原生事件不匹配");
    assert.equal(eventDetail.prompt, record.prompt, "原生事件正文与冻结记录不一致");
    assert.equal(eventDetail.ideaId, execution.ideaId, "执行记录想法与原生事件不匹配");

    assert.equal(execution.artifactPath, task.acceptance.path, "执行记录路径与 Task 不一致");
    const persisted = readFileSync(task.acceptance.path, "utf8");
    const fileHash = sha256(persisted);
    const { metadata, prompt, generatedText, citationsText } = parseCandidateMarkdown(persisted);
    assert.equal(metadata.messageId, execution.messageId, "候选消息不匹配");
    assert.equal(metadata.taskId, execution.taskId, "候选 Task 不匹配");
    assert.equal(metadata.attemptId, execution.attemptId, "候选 Attempt 不匹配");
    assert.equal(metadata.ideaId, execution.ideaId, "候选想法不匹配");
    assert.equal(metadata.contextVersion, task.context_version, "候选 Context 版本不匹配");
    assert.equal(metadata.inputSha256, record.input_sha256, "候选输入版本不匹配");
    assert.equal(metadata.worker, execution.worker, "候选 Worker 不匹配");
    assert.equal(metadata.model, MODEL, "候选模型未获批准");
    assert.equal(metadata.action, record.action, "候选动作不匹配");
    assert.equal(prompt, record.prompt, "候选未精确保留本轮输入");
    assert.equal(metadata.promptSha256, sha256(prompt), "候选本轮输入哈希不匹配");
    assert.ok(generatedText.trim(), "生成正文不能为空");
    assert.equal(metadata.generatedTextSha256, sha256(generatedText), "候选生成正文哈希不匹配");
    assert.ok(Array.isArray(metadata.citations), "候选引用必须是数组");
    verifyCitations(record, metadata.citations);
    assert.equal(citationsText, renderCitationBlock(metadata.citations), "候选引用分区与元数据不一致");

    const attempt = current.get("records", `attempt:${execution.attemptId}`);
    if (attempt?.state === "running") reportWorkerDone(db, { taskId: execution.taskId, attemptId: execution.attemptId, now: now() });
    const run = view().get("runs", execution.runId);
    if (run?.state === "claimed") {
      assert.ok(execution.job?.token, "当前 claimed run 缺少原生执行令牌");
      act("finish", [execution.runId, execution.job.token, { outcome: "done", summary: "想法候选已生成，等待 Result Lane" }]);
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
        actualPath: execution.artifactPath, actualHash: record.input_sha256,
        actualRemoteVersion: SOURCE_MATERIAL, actualFileHash: fileHash, qualityScore: 100, now: now(),
      });
    }
    finalizeTask(db, {
      commandId: `finalize-${execution.taskId}`, taskId: execution.taskId,
      attemptId: execution.attemptId, contextVersion: execution.contextVersion,
      verificationId, now: now(),
    });
    if (record.action === "new" || record.action === "continue") {
      recordVersion(execution.ideaId, {
        version: task.context_version, path: execution.artifactPath, sha256: fileHash,
        messageId: execution.messageId, taskId: execution.taskId, attemptId: execution.attemptId,
      });
    }
    return trace(execution.taskId);
  }

  function queued() {
    const current = view();
    const messages = [];
    for (const link of rows(current, "run_events")) {
      const run = current.get("runs", link.run_id);
      if (run?.state !== "queued" || run.rule !== RULE) continue;
      const event = current.get("events", link.event_id);
      if (event?.type !== "idea.request") continue;
      const detail = JSON.parse(event.detail);
      messages.push({
        appId: detail.appId, messageId: event.key, chatId: detail.chatId, ownerId: detail.ownerId,
        worker: detail.worker, action: detail.action, ideaId: detail.ideaId,
        ...(detail.ideaIds ? { ideaIds: detail.ideaIds } : {}), prompt: detail.prompt,
        nativeRunId: run.id,
      });
    }
    return messages.sort((left, right) => left.nativeRunId - right.nativeRunId || left.messageId.localeCompare(right.messageId));
  }

  function ideas() {
    return rows(view(), "records")
      .filter((row) => row.kind === "idea_index")
      .map((row) => ({ ...row }))
      .sort((left, right) => left.ideaId.localeCompare(right.ideaId));
  }

  return {
    begin,
    complete,
    trace,
    queued,
    ideas,
    index: (ideaId) => indexOf(ideaId),
    claim: (deliveryKey) => claimDelivery(db, { deliveryKey, now: now() }),
    accept: (deliveryKey) => acceptDelivery(db, { deliveryKey, providerMessageId: null, capability: "at_least_once", now: now() }),
    unknown: (deliveryKey) => markDeliveryUnknown(db, { deliveryKey, now: now() }),
    cancel: (taskId) => requestCancel(db, { taskId, now: now() }),
    factCount: () => Number(db.prepare("SELECT COUNT(*) AS count FROM facts").get().count),
    close: () => { if (!sharedDb) db.close(); },
  };
}
