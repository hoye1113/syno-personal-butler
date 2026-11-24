// P1 capture host: native autoloop runs and business records share one isolated fact log.
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
} from "../../packages/syno-autoloop/examples/syno-p0/commands.ts";
import { rows } from "../../packages/syno-autoloop/kernel/evolve.ts";
import { parseRules } from "../../packages/syno-autoloop/protocol/rules.ts";
import { assertWorkerBoundaryProbes } from "./preflight.mjs";

const MODEL = "opencode-go/deepseek-v4.1-flash";
const SOURCE_MATERIAL = "verified-public-browser-snapshot";
const ENVIRONMENT = { secret: "syno-p1-isolated-native-test", publicUrl: "" };
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

export function openNativeCaptureRuntime({ databasePath, vaultRoot, sourcePath, sourceUrl, sourceMaterial = SOURCE_MATERIAL, now = () => Date.now(), db: sharedDb = null, configureRules = true }) {
  const source = readFileSync(sourcePath, "utf8");
  const sourceSha256 = sha256(source);
  const contextId = `capture:${sourceSha256.slice(0, 16)}`;
  const vaultDirectory = path.join(vaultRoot, "02-Resources");
  mkdirSync(vaultDirectory, { recursive: true });
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
      agents: { capture: { name: "OpenCode 收录", worker: "syno-p1", use: "command", command: ["true"] } },
      rules: [{
        name: "公开文章收录",
        when: { source: "feishu-test", types: ["capture.request"] },
        to: "capture",
        cwd: vaultRoot,
        prompt: "由宿主沙箱 Worker 执行；原生 done 不结算业务 Task",
        group: "syno-p1-capture",
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
      nativeEventId: event?.id ?? null,
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

  function begin(message) {
    assert.match(message.messageId, /^[A-Za-z0-9_-]{1,48}$/, "消息 ID 不符合隔离实验约束");
    const worker = message.worker || "OpenCode";
    assert.ok(["OpenCode", "Pi"].includes(worker), "未知收录 Worker");
    const taskId = `task-${message.messageId}`;
    const detail = JSON.stringify({ sourceUrl, sourceSha256, sourceMaterial, worker, appId: message.appId, chatId: message.chatId, ownerId: message.ownerId });
    const route = () => {
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
    };
    const existing = view().get("records", `task:${taskId}`);
    if (existing) {
      route();
      act("ingest", ["feishu-test", { id: message.messageId, type: "capture.request", subject: contextId, summary: "公开文章收录", detail }]);
      const eventLink = rows(view(), "run_events", { run_id: existing.run_id })[0];
      const originalEvent = eventLink ? view().get("events", eventLink.event_id) : null;
      assert.equal(originalEvent?.detail, detail, "同一消息不能更换来源或 Worker");
      const run = view().get("runs", existing.run_id);
      const job = run?.state === "claimed" ? act("claimNext", ["syno-p1", `claim-${message.messageId}`]) : null;
      assert.equal(job?.run ?? existing.run_id, existing.run_id, "恢复时不能换原生 run");
      return {
        taskId, messageId: message.messageId, attemptId: existing.current_attempt,
        runId: existing.run_id, runAttempt: existing.run_attempt, contextId,
        contextVersion: existing.context_version, artifactPath: existing.acceptance.path,
        worker, job, state: existing.state, deliveryKey: `delivery:${taskId}:result`,
      };
    }
    act("ingest", ["feishu-test", { id: message.messageId, type: "capture.request", subject: contextId, summary: "公开文章收录", detail }]);
    const job = act("claimNext", ["syno-p1", `claim-${message.messageId}`]);
    assert.ok(job, "同对象前序任务仍占用原生 lane；当前事件保持 queued，尚未推进 Context 或创建 Task");
    const routed = route();
    const attemptId = `attempt-${job.run}-${job.attempt}`;
    const artifactPath = path.join(vaultDirectory, `capture-${sourceSha256.slice(0, 24)}-${message.messageId}.md`);
    createTask(db, {
      taskId, contextId, attemptId, runId: job.run, runAttempt: job.attempt,
      acceptance: { path: artifactPath, hash: sourceSha256, remoteVersion: sourceMaterial }, now: now(),
    });
    return {
      taskId, messageId: message.messageId, attemptId, runId: job.run, runAttempt: job.attempt, contextId,
      contextVersion: routed.receipt.version, artifactPath, worker, job, state: "running", deliveryKey: `delivery:${taskId}:result`,
    };
  }

  function complete(execution, evidence = null) {
    const current = view();
    const task = current.get("records", `task:${execution.taskId}`);
    assert.ok(task && task.current_attempt === execution.attemptId, "完成时必须仍是当前 Attempt");
    if (task.state === "completed") return trace(execution.taskId);
    const eventLink = rows(current, "run_events", { run_id: task.run_id })[0];
    const event = eventLink ? current.get("events", eventLink.event_id) : null;
    const worker = JSON.parse(event?.detail || "{}").worker;
    assert.ok(["OpenCode", "Pi"].includes(worker), "原生事件缺少合法 Worker 绑定");
    assert.equal(execution.worker, worker, "执行记录 Worker 与原生事件不匹配");
    const persisted = readFileSync(execution.artifactPath, "utf8");
    const fileHash = sha256(persisted);
    assert.ok(persisted.includes(source.trim()), "Result Lane 未找到完整公开原文");
    assert.ok(persisted.includes(`source_content_sha256: ${sourceSha256}`), "Result Lane 来源版本不匹配");
    assert.ok(persisted.includes(`source_url: "${sourceUrl}"`), "Result Lane 来源 URL 不匹配");
    assert.ok(persisted.includes(`worker: ${worker}\nmodel: ${MODEL}\n`), "Result Lane Worker／模型不匹配");
    if (evidence) {
      assert.equal(evidence.complete, true, "Worker 证据不完整");
      assert.equal(evidence.worker, worker, "Worker 证据身份不匹配");
      assert.equal(evidence.workerModelPath?.model, MODEL, "Worker 使用了未批准模型");
      if (worker === "Pi") {
        assert.equal(evidence.pi?.version, "1.5.2", "Pi 版本不符合锁定要求");
        assert.equal(evidence.pi?.providerRequests, 1, "Pi 模型请求次数不是一次");
        assert.equal(evidence.pi?.toolEvents, 0, "Pi Worker 不得执行工具");
      }
      assertWorkerBoundaryProbes(evidence.probes);
      assert.equal(evidence.capture?.messageId, execution.messageId, "证据消息不匹配");
      assert.equal(evidence.capture?.taskId, execution.taskId, "证据 Task 不匹配");
      assert.equal(evidence.capture?.attemptId, execution.attemptId, "证据 Attempt 不匹配");
      assert.equal(evidence.capture?.path, execution.artifactPath, "证据路径不匹配");
      assert.equal(evidence.capture?.sourceSha256, sourceSha256, "证据原文版本不匹配");
      assert.equal(evidence.capture?.fileVersion, fileHash, "证据文件版本不匹配");
      assert.equal(evidence.capture?.sourceMaterial, sourceMaterial, "证据来源材料不匹配");
      assert.equal(evidence.capture?.resultLane, "passed", "Worker 自报复核未通过");
    }
    const attempt = current.get("records", `attempt:${execution.attemptId}`);
    if (attempt?.state === "running") reportWorkerDone(db, { taskId: execution.taskId, attemptId: execution.attemptId, now: now() });
    const run = view().get("runs", execution.runId);
    if (run?.state === "claimed") {
      assert.ok(execution.job?.token, "当前 claimed run 缺少原生执行令牌");
      act("finish", [execution.runId, execution.job.token, { outcome: "done", summary: "Worker 候选已生成，等待 Result Lane" }]);
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
        verificationId,
        taskId: execution.taskId,
        attemptId: execution.attemptId,
        actualPath: execution.artifactPath,
        actualHash: sourceSha256,
        actualRemoteVersion: sourceMaterial,
        actualFileHash: fileHash,
        qualityScore: 100,
        now: now(),
      });
    }
    finalizeTask(db, {
      commandId: `finalize-${execution.taskId}`,
      taskId: execution.taskId,
      attemptId: execution.attemptId,
      contextVersion: execution.contextVersion,
      verificationId,
      now: now(),
    });
    return trace(execution.taskId);
  }

  function queued() {
    const current = view();
    const messages = [];
    for (const link of rows(current, "run_events")) {
      const run = current.get("runs", link.run_id);
      if (run?.state !== "queued" || run.rule !== "公开文章收录") continue;
      const event = current.get("events", link.event_id);
      if (event?.type !== "capture.request") continue;
      const detail = JSON.parse(event.detail);
      messages.push({
        appId: detail.appId, messageId: event.key, chatId: detail.chatId, ownerId: detail.ownerId,
        worker: detail.worker, nativeRunId: run.id,
      });
    }
    return messages.sort((a, b) => a.nativeRunId - b.nativeRunId || a.messageId.localeCompare(b.messageId));
  }

  return {
    begin,
    complete,
    trace,
    queued,
    claim: (deliveryKey) => claimDelivery(db, { deliveryKey, now: now() }),
    accept: (deliveryKey) => acceptDelivery(db, { deliveryKey, providerMessageId: null, capability: "at_least_once", now: now() }),
    unknown: (deliveryKey) => markDeliveryUnknown(db, { deliveryKey, now: now() }),
    factCount: () => Number(db.prepare("SELECT COUNT(*) AS count FROM facts").get().count),
    close: () => { if (!sharedDb) db.close(); },
  };
}
