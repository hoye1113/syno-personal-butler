// P2 knowledge queries use native runs and business Tasks in one isolated fact log.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
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
import { parseRules } from "../../../syno-autoloop-p0/protocol/rules.ts";
import { readKnowledgeDocument, verifyKnowledgeAnswer } from "./knowledge-query.mjs";

const SOURCE_MATERIAL = "knowledge-read-only-v1";
const ENVIRONMENT = { secret: "syno-p2-isolated-native-test", publicUrl: "" };
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

export function openNativeKnowledgeRuntime({ databasePath, vaultRoot, indexFile, resultRoot, now = () => Date.now(), db: sharedDb = null, configureRules = true }) {
  const documents = { vaultRoot, indexFile };
  mkdirSync(resultRoot, { recursive: true });
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
      agents: { knowledge: { name: "本地知识查询", worker: "syno-p2", use: "command", command: ["true"] } },
      rules: [{
        name: "对象知识查询",
        when: { source: "feishu-test", types: ["knowledge.query"] },
        to: "knowledge",
        cwd: vaultRoot,
        prompt: "只读 Worker 生成候选；宿主独立复核引用后结算",
        group: "syno-p2-knowledge",
        parallel: 2,
        tell: "never",
      }],
    }), now(), "Asia/Shanghai");
    const currentRules = view().get("config", "rules");
    if (!currentRules || JSON.stringify(currentRules.value) !== JSON.stringify(rules)) act("rules", [rules]);
  }

  function trace(taskId) {
    const current = view();
    const task = current.get("records", `task:${taskId}`);
    assert.ok(task, `缺少 Task：${taskId}`);
    const attempt = current.get("records", `attempt:${task.current_attempt}`);
    const verification = task.verification_id ? current.get("records", `verification:${task.verification_id}`) : null;
    const delivery = current.get("records", `delivery:${taskId}:result`);
    const eventLink = rows(current, "run_events", { run_id: task.run_id })[0];
    const event = eventLink ? current.get("events", eventLink.event_id) : null;
    return {
      eventId: event?.key ?? null,
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
      sourceSha256: task.acceptance.hash,
      fileVersion: verification?.file_hash ?? null,
      deliveryKey: delivery?.key ?? null,
      deliveryState: delivery?.state ?? null,
      maySend: delivery?.may_send ?? null,
      providerMessageId: delivery?.provider_message_id ?? null,
    };
  }

  async function begin(message) {
    assert.match(message.messageId, /^[A-Za-z0-9_-]{1,48}$/, "消息 ID 不符合隔离实验约束");
    const document = await readKnowledgeDocument(documents, message.documentId);
    const taskId = `task-${message.messageId}`;
    const contextId = `knowledge:${message.documentId}`;
    const eventDetail = JSON.stringify({
      documentId: message.documentId, query: message.query,
      sourcePath: document.path, sourceSha256: document.sha256, sourceMaterial: SOURCE_MATERIAL,
    });
    const current = view();
    const context = current.get("records", `context:${contextId}`);
    const priorInbox = current.get("records", `inbox:${JSON.stringify([message.appId, message.messageId])}`);
    const originalVersion = priorInbox ? (priorInbox.receipt.version === 1 ? null : priorInbox.receipt.version - 1) : null;
    const routed = applyRoute(db, {
      commandId: `route-${message.appId}-${message.messageId}`,
      appId: message.appId,
      messageId: message.messageId,
      contextId,
      expectedVersion: priorInbox ? originalVersion : (context?.version ?? null),
      ownerId: message.ownerId,
      replyTo: message.chatId,
      now: now(),
    });
    act("ingest", ["feishu-test", {
      id: message.messageId,
      type: "knowledge.query",
      subject: contextId,
      summary: "对象知识查询",
      detail: eventDetail,
    }]);
    const existing = view().get("records", `task:${taskId}`);
    if (existing) {
      const eventLink = rows(view(), "run_events", { run_id: existing.run_id })[0];
      const originalEvent = eventLink ? view().get("events", eventLink.event_id) : null;
      assert.equal(originalEvent?.detail, eventDetail, "同一消息不能更换文档、查询或来源版本");
      const run = view().get("runs", existing.run_id);
      const job = run?.state === "claimed" ? act("claimNext", ["syno-p2", `claim-${message.messageId}`]) : null;
      assert.equal(job?.run ?? existing.run_id, existing.run_id, "恢复时不能换原生 run");
      return {
        taskId, messageId: message.messageId, documentId: message.documentId, query: message.query,
        attemptId: existing.current_attempt, runId: existing.run_id, runAttempt: existing.run_attempt,
        contextId, contextVersion: existing.context_version, artifactPath: existing.acceptance.path,
        sourceSha256: existing.acceptance.hash, job, state: existing.state,
        deliveryKey: `delivery:${taskId}:result`,
      };
    }
    const job = act("claimNext", ["syno-p2", `claim-${message.messageId}`]);
    assert.ok(job, "原生 Runtime 没有返回当前消息的 claimed run");
    const attemptId = `attempt-${job.run}-${job.attempt}`;
    const artifactPath = path.join(resultRoot, `${message.messageId}.json`);
    createTask(db, {
      taskId, contextId, attemptId, runId: job.run, runAttempt: job.attempt,
      acceptance: { path: artifactPath, hash: document.sha256, remoteVersion: SOURCE_MATERIAL },
      now: now(),
    });
    return {
      taskId, messageId: message.messageId, documentId: message.documentId, query: message.query,
      attemptId, runId: job.run, runAttempt: job.attempt, contextId,
      contextVersion: routed.receipt.version, artifactPath, sourceSha256: document.sha256,
      job, state: "running", deliveryKey: `delivery:${taskId}:result`,
    };
  }

  async function complete(execution) {
    const current = view();
    const task = current.get("records", `task:${execution.taskId}`);
    assert.ok(task && task.current_attempt === execution.attemptId, "完成时必须仍是当前 Attempt");
    if (task.state === "completed") return trace(execution.taskId);
    const persisted = readFileSync(execution.artifactPath, "utf8");
    const answer = JSON.parse(persisted);
    assert.equal(answer.messageId, execution.messageId, "答案消息不匹配");
    assert.equal(answer.taskId, execution.taskId, "答案 Task 不匹配");
    assert.equal(answer.attemptId, execution.attemptId, "答案 Attempt 不匹配");
    const document = await readKnowledgeDocument(documents, execution.documentId);
    assert.equal(document.sha256, execution.sourceSha256, "文档版本已变化，请重新执行");
    await verifyKnowledgeAnswer(documents, answer, execution.documentId);
    const fileHash = sha256(persisted);
    const attempt = current.get("records", `attempt:${execution.attemptId}`);
    if (attempt?.state === "running") reportWorkerDone(db, { taskId: execution.taskId, attemptId: execution.attemptId, now: now() });
    const run = view().get("runs", execution.runId);
    if (run?.state === "claimed") {
      assert.ok(execution.job?.token, "当前 claimed run 缺少原生执行令牌");
      act("finish", [execution.runId, execution.job.token, { outcome: "done", summary: "只读候选已生成，等待 Result Lane" }]);
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
        actualPath: execution.artifactPath, actualHash: execution.sourceSha256,
        actualRemoteVersion: SOURCE_MATERIAL, actualFileHash: fileHash, qualityScore: 100, now: now(),
      });
    }
    finalizeTask(db, {
      commandId: `finalize-${execution.taskId}`, taskId: execution.taskId,
      attemptId: execution.attemptId, contextVersion: execution.contextVersion,
      verificationId, now: now(),
    });
    return trace(execution.taskId);
  }

  return {
    begin,
    complete,
    trace,
    answer: (taskId) => JSON.parse(readFileSync(trace(taskId).path, "utf8")),
    claim: (deliveryKey) => claimDelivery(db, { deliveryKey, now: now() }),
    accept: (deliveryKey) => acceptDelivery(db, { deliveryKey, providerMessageId: null, capability: "at_least_once", now: now() }),
    unknown: (deliveryKey) => markDeliveryUnknown(db, { deliveryKey, now: now() }),
    factCount: () => Number(db.prepare("SELECT COUNT(*) AS count FROM facts").get().count),
    cancel: (taskId) => requestCancel(db, { taskId, now: now() }),
    close: () => { if (!sharedDb) db.close(); },
  };
}
