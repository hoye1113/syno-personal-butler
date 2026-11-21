// P3.2 project host: native runs, business Tasks, auditable steps and a versioned Markdown brief in the one fact log.
import assert from "node:assert/strict";
import { lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
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
import {
  PROJECT_TYPE,
  STEP_IDS,
  STEPS,
  assertPlanVersion,
  assertProjectId,
  assertStepBody,
  buildManifest,
  canonicalManifest,
  parseManifest,
  projectContextId,
  projectIdForMessage,
  projectIndexKey,
  projectInputKey,
  projectStepKey,
  projectStepRelativePath,
  projectStepPath,
  sha256,
  stepById,
} from "./project-object.mjs";

const ENVIRONMENT = { secret: "syno-p3-project-isolated-test", publicUrl: "" };
const RULE = "项目执行";
const AGENT = "syno-p3-project";
const GROUP = "syno-p3-project";
const PARALLEL = 3;
const ACTIONS = ["new", "revise"];
const WORKERS = ["OpenCode", "Pi"];

const inputShaOf = ({ action, projectId, goal, revision, previous }) =>
  sha256(JSON.stringify({ action, projectId, goal, revision: revision ?? null, previous: previous ?? null }));
const deliveryKeyOf = (taskId) => `delivery:${taskId}:result`;

function readStableFile(file) {
  const stat = lstatSync(file);
  if (stat.isSymbolicLink()) throw new Error("项目产物不能是符号链接");
  return readFileSync(file);
}

export function openNativeProjectRuntime({
  databasePath,
  vaultRoot,
  projectRoot = path.join(vaultRoot, "04-Projects"),
  now = () => Date.now(),
  db: sharedDb = null,
  configureRules = true,
}) {
  mkdirSync(projectRoot, { recursive: true });
  const realProjectRoot = realpathSync(projectRoot);
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
      agents: { project: { name: "项目执行 Worker", worker: AGENT, use: "command", command: ["true"] } },
      rules: [{
        name: RULE,
        when: { source: "feishu-test", types: ["project.request"] },
        to: "project",
        cwd: vaultRoot,
        prompt: "Worker 只生成项目步骤正文；宿主独立复核步骤依赖与 manifest 后结算",
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

  function assertInside(file) {
    const realDirectory = realpathSync(path.dirname(file));
    const prefix = `${realProjectRoot}${path.sep}`;
    if (realDirectory !== realProjectRoot && !realDirectory.startsWith(prefix)) {
      throw new Error("项目产物路径逃逸出受控目录");
    }
  }

  /** Non-overwrite write: an existing file may only be re-adopted when its bytes already match. */
  function writeStable(file, text) {
    mkdirSync(path.dirname(file), { recursive: true });
    assertInside(file);
    const buffer = Buffer.from(text, "utf8");
    try {
      const existing = readStableFile(file);
      if (!existing.equals(buffer)) throw new Error("候选文件已存在且内容不同，不能覆盖");
      return { sha256: sha256(existing), bytes: existing.length };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    try {
      writeFileSync(file, buffer, { flag: "wx" });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const existing = readStableFile(file);
      if (!existing.equals(buffer)) throw new Error("候选文件已存在且内容不同，不能覆盖");
      return { sha256: sha256(existing), bytes: existing.length };
    }
    const written = readStableFile(file);
    return { sha256: sha256(written), bytes: written.length };
  }

  function indexPath(projectId) {
    return projectIndexKey(projectId);
  }

  function indexOf(projectId) {
    return view().get("records", indexPath(projectId)) ?? null;
  }

  function requireIndex(projectId) {
    const index = indexOf(projectId);
    assert.ok(index, `未知项目：${projectId}`);
    return index;
  }

  function ensureIndex({ projectId, contextId, goal }) {
    commit("syno.project_index", (current) => {
      const key = indexPath(projectId);
      const prior = current.get("records", key);
      if (prior) {
        assert.equal(prior.goal, goal, "同一项目不能更换目标");
        return [];
      }
      return [{
        table: "records",
        key,
        row: {
          key, kind: "project_index", projectId, contextId, goal,
          versions: [], latestVersion: null, createdAt: now(), updatedAt: now(),
        },
      }];
    });
  }

  function recordPlan(projectId, entry) {
    commit("syno.project_plan", (current) => {
      const key = indexPath(projectId);
      const index = current.get("records", key);
      assert.ok(index, `缺少项目索引：${projectId}`);
      const prior = index.versions.find((version) => version.planVersion === entry.planVersion);
      if (prior) {
        assert.equal(prior.manifestPath, entry.manifestPath, "同一计划不能更换 manifest");
        assert.equal(prior.manifestSha256, entry.manifestSha256, "同一计划不能更换 manifest 内容");
        assert.equal(prior.taskId, entry.taskId, "同一计划不能更换 Task");
        assert.equal(prior.attemptId, entry.attemptId, "同一计划不能更换 Attempt");
        return [];
      }
      const versions = [...index.versions, entry].sort((left, right) => left.planVersion - right.planVersion);
      return [{
        table: "records",
        key,
        row: { ...index, versions, latestVersion: versions.at(-1).planVersion, updatedAt: now() },
      }];
    });
  }

  function inputRecord(taskId) {
    return view().get("records", projectInputKey(taskId)) ?? null;
  }

  function writeInputRecord(record) {
    commit("syno.project_input", (current) => {
      const key = projectInputKey(record.taskId);
      const prior = current.get("records", key);
      if (prior) {
        assert.equal(prior.input_sha256, record.input_sha256, "同一消息不能更换输入版本");
        assert.equal(prior.action, record.action, "同一消息不能更换动作");
        assert.equal(prior.projectId, record.projectId, "同一消息不能更换项目对象");
        assert.equal(prior.revision, record.revision, "同一消息不能更换修订输入");
        return [];
      }
      return [{ table: "records", key, row: record }];
    });
  }

  function freezePrevious(projectId) {
    const index = requireIndex(projectId);
    const entry = index.versions.find((version) => version.planVersion === index.latestVersion);
    assert.ok(entry, `项目 ${projectId} 还没有已完成的计划`);
    const manifestFile = projectStepPath(projectRoot, projectId, entry.planVersion, "manifest");
    assert.equal(sha256(readStableFile(manifestFile)), entry.manifestSha256, "前一计划的 manifest 已变化");
    const artifacts = entry.artifacts.map((artifact) => {
      const file = path.join(projectRoot, artifact.path);
      assert.equal(sha256(readStableFile(file)), artifact.sha256, `前一计划产物已变化：${artifact.stepId}`);
      return { ...artifact };
    });
    return {
      planVersion: entry.planVersion,
      manifestPath: entry.manifestPath,
      manifestSha256: entry.manifestSha256,
      artifacts,
    };
  }

  function stepRecord(taskId, stepId) {
    return view().get("records", projectStepKey(taskId, stepId)) ?? null;
  }

  function writeStepRecord({ task, input, stepId, state, sha256: fileHash, bytes }) {
    const step = stepById(stepId);
    assert.ok(step, `未知项目步骤：${stepId}`);
    const key = projectStepKey(task.id, stepId);
    const relativePath = projectStepRelativePath(input.projectId, task.context_version, stepId);
    commit("syno.project_step", (current) => {
      const prior = current.get("records", key);
      if (prior) {
        assert.equal(prior.path, relativePath, "同一项目步骤不能更换路径");
        assert.equal(prior.sha256, fileHash, "同一项目步骤不能更换内容");
        if (prior.state === "completed" || state === "ready") return [];
        return [{ table: "records", key, row: { ...prior, state, completedAt: now(), updatedAt: now() } }];
      }
      return [{
        table: "records",
        key,
        row: {
          key, kind: "project_step", projectId: input.projectId, planVersion: task.context_version,
          taskId: task.id, attemptId: task.current_attempt, runId: task.run_id, runAttempt: task.run_attempt,
          stepId, dependsOn: [...step.dependsOn], state, path: relativePath, sha256: fileHash, bytes,
          createdAt: now(), updatedAt: now(),
        },
      }];
    });
  }

  function activeTask(contextId) {
    return rows(view(), "records").find(
      (row) => row.kind === "task" && row.context_id === contextId
        && (row.state === "running" || row.state === "cancel_requested"),
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

  function eventOf(task) {
    const link = rows(view(), "run_events", { run_id: task.run_id })[0];
    return link ? view().get("events", link.event_id) : null;
  }

  function trace(taskId) {
    const current = view();
    const task = current.get("records", `task:${taskId}`);
    assert.ok(task, `缺少 Task：${taskId}`);
    const event = eventOf(task);
    const input = inputRecord(taskId);
    const attempt = current.get("records", `attempt:${task.current_attempt}`);
    const verification = task.verification_id ? current.get("records", `verification:${task.verification_id}`) : null;
    const delivery = current.get("records", deliveryKeyOf(taskId));
    const steps = STEP_IDS
      .map((stepId) => current.get("records", projectStepKey(taskId, stepId)))
      .filter(Boolean)
      .map((step) => ({
        stepId: step.stepId, state: step.state, dependsOn: [...step.dependsOn],
        path: step.path, sha256: step.sha256, bytes: step.bytes,
      }));
    return {
      eventId: event?.key ?? null,
      nativeEventId: event?.id ?? null,
      projectId: String(task.context_id).slice("project:".length),
      contextId: task.context_id,
      contextVersion: task.context_version,
      planVersion: task.context_version,
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
      action: input?.action ?? null,
      goal: input?.goal ?? null,
      revision: input?.revision ?? null,
      previous: input?.previous ?? null,
      steps,
      deliveryKey: delivery?.key ?? null,
      deliveryState: delivery?.state ?? null,
      maySend: delivery?.may_send ?? null,
      providerMessageId: delivery?.provider_message_id ?? null,
    };
  }

  function executionOf(task, { messageId, action, projectId, goal, revision, worker, job = null, inputSha256 }) {
    const record = inputRecord(task.id);
    return {
      taskId: task.id,
      messageId,
      projectId,
      action,
      goal,
      revision: revision ?? null,
      planVersion: task.context_version,
      attemptId: task.current_attempt,
      runId: task.run_id,
      runAttempt: task.run_attempt,
      contextId: task.context_id,
      contextVersion: task.context_version,
      manifestPath: task.acceptance.path,
      inputSha256: inputSha256 ?? task.acceptance.hash,
      worker,
      job,
      state: task.state,
      paths: {
        outline: projectStepPath(projectRoot, projectId, task.context_version, "outline"),
        deliverable: projectStepPath(projectRoot, projectId, task.context_version, "deliverable"),
        manifest: task.acceptance.path,
      },
      frozen: record?.previous ?? null,
      deliveryKey: deliveryKeyOf(task.id),
    };
  }

  function begin(message) {
    assert.match(message.messageId, /^[A-Za-z0-9_-]{1,48}$/u, "消息 ID 不符合隔离实验约束");
    const worker = message.worker || "OpenCode";
    assert.ok(WORKERS.includes(worker), "未知项目 Worker");
    const action = message.action;
    assert.ok(ACTIONS.includes(action), "未知项目动作");
    const revision = action === "revise" ? String(message.revision ?? "").trim() : null;
    if (action === "revise") assert.ok(revision, "修订请求缺少正文");
    const projectId = action === "new"
      ? projectIdForMessage(message)
      : assertProjectId(message.projectId ?? "");
    const contextId = projectContextId(projectId);
    const taskId = `task-${message.messageId}`;
    const detailFor = (goal) => JSON.stringify({
      action, projectId, goal, revision: revision ?? null, worker,
      appId: message.appId, chatId: message.chatId, ownerId: message.ownerId,
    });
    const ingest = (detail) => act("ingest", ["feishu-test", {
      id: message.messageId,
      type: "project.request",
      subject: contextId,
      summary: action === "new" ? "新建项目" : "修订项目",
      detail,
    }]);

    const index = action === "revise" ? requireIndex(projectId) : indexOf(projectId);
    const goal = action === "new" ? String(message.goal ?? "").trim() : index.goal;
    if (action === "new") assert.ok(goal, "项目请求缺少目标");
    const detail = detailFor(goal);

    const existing = view().get("records", `task:${taskId}`);
    if (existing) {
      route(message, contextId);
      const frozen = inputRecord(taskId);
      assert.ok(frozen, "缺少已冻结的项目输入记录");
      ingest(detail);
      assert.equal(eventOf(existing)?.detail, detail, "同一消息不能更换动作、对象、目标或正文");
      const run = view().get("runs", existing.run_id);
      const job = run?.state === "claimed" ? act("claimNext", [AGENT, `claim-${message.messageId}`]) : null;
      assert.equal(job?.run ?? existing.run_id, existing.run_id, "恢复时不能换原生 run");
      if (action === "new") ensureIndex({ projectId, contextId, goal });
      return executionOf(existing, {
        messageId: message.messageId, action, projectId, goal, revision, worker, job,
      });
    }

    if (activeTask(contextId)) {
      ingest(detail);
      return { state: "queued", messageId: message.messageId, projectId, action, goal, revision, contextId, worker };
    }

    ingest(detail);
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
    if (queued) return { state: "queued", messageId: message.messageId, projectId, action, goal, revision, contextId, worker };

    const routed = route(message, contextId);
    const planVersion = routed.receipt.version;
    assertPlanVersion(planVersion);
    let frozen = inputRecord(taskId);
    if (!frozen) {
      const previous = action === "revise" ? freezePrevious(projectId) : null;
      const record = {
        key: projectInputKey(taskId),
        kind: "project_input",
        taskId,
        projectId,
        planVersion,
        action,
        goal,
        revision: revision ?? null,
        previous,
        input_sha256: inputShaOf({ action, projectId, goal, revision, previous }),
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
      assert.equal(frozen.projectId, projectId, "同一消息不能更换项目对象");
      assert.equal(frozen.revision, revision ?? null, "同一消息不能更换修订输入");
      assert.equal(frozen.planVersion, planVersion, "恢复时计划版本不一致");
    }
    const manifestPath = projectStepPath(projectRoot, projectId, planVersion, "manifest");
    mkdirSync(path.dirname(manifestPath), { recursive: true });
    const attemptId = `attempt-${job.run}-${job.attempt}`;
    createTask(db, {
      taskId, contextId, attemptId, runId: job.run, runAttempt: job.attempt,
      acceptance: { path: manifestPath, hash: frozen.input_sha256, remoteVersion: PROJECT_TYPE },
      now: now(),
    });
    if (action === "new") ensureIndex({ projectId, contextId, goal });
    const task = view().get("records", `task:${taskId}`);
    return executionOf(task, {
      messageId: message.messageId, action, projectId, goal, revision, worker, job,
      inputSha256: frozen.input_sha256,
    });
  }

  function requireExecution(execution) {
    const current = view();
    const task = current.get("records", `task:${execution.taskId}`);
    assert.ok(task, `缺少 Task：${execution.taskId}`);
    assert.equal(task.current_attempt, execution.attemptId, "执行记录 Attempt 不是当前 Attempt");
    const input = inputRecord(execution.taskId);
    assert.ok(input, "缺少冻结的项目输入记录");
    assert.equal(input.planVersion, task.context_version, "冻结输入计划版本与 Task 不一致");
    assert.equal(input.input_sha256, task.acceptance.hash, "Task 验收输入与冻结记录不一致");
    assert.equal(execution.planVersion ?? task.context_version, task.context_version, "执行记录计划版本已过期");
    return { current, task, input };
  }

  function fileOfStep(input, task, stepId) {
    assert.equal(
      task.acceptance.path,
      projectStepPath(projectRoot, input.projectId, task.context_version, "manifest"),
      "Task 验收路径不是项目 manifest 路径",
    );
    return projectStepPath(projectRoot, input.projectId, task.context_version, stepId);
  }

  function writeStep(execution, stepId, body) {
    const { task, input } = requireExecution(execution);
    assert.ok(STEP_IDS.includes(stepId) && stepId !== "manifest", `未知或不可写入的项目步骤：${stepId}`);
    if (task.state === "completed") {
      const prior = stepRecord(task.id, stepId);
      assert.ok(prior, `步骤没有已记录产物：${stepId}`);
      const file = fileOfStep(input, task, stepId);
      assert.equal(sha256(readStableFile(file)), prior.sha256, "已完成步骤的产物已变化");
      return { stepId, path: file, relativePath: prior.path, sha256: prior.sha256, bytes: prior.bytes };
    }
    if (task.cancel_requested || task.state !== "running") throw new Error("项目任务已取消或不允许写入候选");
    const text = assertStepBody(body, { projectId: input.projectId });
    const file = fileOfStep(input, task, stepId);
    const written = writeStable(file, text);
    writeStepRecord({ task, input, stepId, state: "ready", ...written });
    return { stepId, path: file, relativePath: projectStepRelativePath(input.projectId, task.context_version, stepId), ...written };
  }

  function assertDependencies(task, input, stepId) {
    const step = stepById(stepId);
    for (const dependency of step.dependsOn) {
      const record = stepRecord(task.id, dependency);
      assert.ok(record?.state === "completed", `步骤 ${stepId} 的依赖 ${dependency} 尚未完成`);
      const file = fileOfStep(input, task, dependency);
      assert.equal(sha256(readStableFile(file)), record.sha256, `依赖步骤 ${dependency} 的产物已变化`);
    }
  }

  function expectedManifest(task, input) {
    const steps = STEPS.map((step) => {
      const record = stepRecord(task.id, step.id);
      if (!record) {
        if (step.id !== "manifest") throw new Error(`manifest 缺少步骤记录：${step.id}`);
        return {
          stepId: step.id,
          taskId: task.id,
          attemptId: task.current_attempt,
          runId: task.run_id,
          runAttempt: task.run_attempt,
          path: projectStepRelativePath(input.projectId, task.context_version, step.id),
          sha256: null,
          bytes: null,
        };
      }
      return {
        stepId: step.id,
        taskId: record.taskId,
        attemptId: record.attemptId,
        runId: record.runId,
        runAttempt: record.runAttempt,
        path: record.path,
        sha256: record.sha256,
        bytes: record.bytes,
      };
    });
    return buildManifest({
      projectId: input.projectId,
      planVersion: task.context_version,
      action: input.action,
      goal: input.goal,
      revision: input.revision,
      inputSha256: input.input_sha256,
      previous: input.previous,
      steps,
    });
  }

  function assertManifestText(task, input, text) {
    const outline = stepRecord(task.id, "outline");
    const deliverable = stepRecord(task.id, "deliverable");
    assert.ok(outline?.state === "completed" && deliverable?.state === "completed", "manifest 依赖的步骤尚未完成");
    const parsed = parseManifest(text);
    const expected = expectedManifest(task, input);
    if (canonicalManifest(parsed) !== canonicalManifest(expected) || text !== canonicalManifest(expected)) {
      throw new Error("manifest 规范字段、冻结输入或步骤记录不一致");
    }
    return expected;
  }

  function writeManifest(execution) {
    const { task, input } = requireExecution(execution);
    if (task.state === "completed") {
      const file = fileOfStep(input, task, "manifest");
      const prior = stepRecord(task.id, "manifest");
      assert.ok(prior, "缺少已记录的 manifest 步骤");
      assert.equal(sha256(readStableFile(file)), prior.sha256, "已完成 manifest 已变化");
      return { stepId: "manifest", path: file, relativePath: prior.path, sha256: prior.sha256, bytes: prior.bytes };
    }
    if (task.cancel_requested || task.state !== "running") throw new Error("项目任务已取消或不允许写入 manifest");
    assertDependencies(task, input, "manifest");
    const text = canonicalManifest(expectedManifest(task, input));
    const file = fileOfStep(input, task, "manifest");
    const written = writeStable(file, text);
    writeStepRecord({ task, input, stepId: "manifest", state: "ready", ...written });
    return { stepId: "manifest", path: file, relativePath: projectStepRelativePath(input.projectId, task.context_version, "manifest"), ...written };
  }

  function completeStep(execution, stepId) {
    const { task, input } = requireExecution(execution);
    assert.ok(STEP_IDS.includes(stepId), `未知项目步骤：${stepId}`);
    if (task.cancel_requested) throw new Error("取消已请求，迟到步骤不能结算");
    const prior = stepRecord(task.id, stepId);
    if (!prior) throw new Error(`缺少步骤候选记录：${stepId}`);
    assertDependencies(task, input, stepId);
    const file = fileOfStep(input, task, stepId);
    const persisted = readStableFile(file);
    if (stepId === "manifest") assertManifestText(task, input, persisted.toString("utf8"));
    else assertStepBody(persisted.toString("utf8"), { projectId: input.projectId });
    assert.equal(sha256(persisted), prior.sha256, `步骤 ${stepId} 的候选文件已变化`);
    assert.equal(persisted.length, prior.bytes, `步骤 ${stepId} 的候选文件长度不一致`);
    writeStepRecord({ task, input, stepId, state: "completed", sha256: prior.sha256, bytes: prior.bytes });
    return { stepId, state: "completed", path: file, sha256: prior.sha256, bytes: prior.bytes };
  }

  function assertPreviousUnchanged(input) {
    if (!input.previous) return;
    const manifestFile = projectStepPath(projectRoot, input.projectId, input.previous.planVersion, "manifest");
    assert.equal(sha256(readStableFile(manifestFile)), input.previous.manifestSha256, "修订冻结的前一计划 manifest 已变化");
    for (const artifact of input.previous.artifacts) {
      const file = path.join(projectRoot, artifact.path);
      assert.equal(sha256(readStableFile(file)), artifact.sha256, `修订冻结的前一计划产物已变化：${artifact.stepId}`);
    }
  }

  function assertStepsComplete(task, input) {
    const records = STEPS.map((step) => {
      const record = stepRecord(task.id, step.id);
      assert.ok(record, `缺少步骤记录：${step.id}`);
      assert.equal(record.state, "completed", `步骤未完成：${step.id}`);
      assert.deepEqual(record.dependsOn, step.dependsOn, `步骤 ${step.id} 的依赖不一致`);
      assert.equal(record.planVersion, task.context_version, `步骤 ${step.id} 的计划版本不一致`);
      assert.equal(record.taskId, task.id, `步骤 ${step.id} 的 Task 不一致`);
      assert.equal(record.attemptId, task.current_attempt, `步骤 ${step.id} 的 Attempt 不一致`);
      assert.equal(record.path, projectStepRelativePath(input.projectId, task.context_version, step.id), `步骤 ${step.id} 的路径不是固定项目路径`);
      const file = fileOfStep(input, task, step.id);
      const persisted = readStableFile(file);
      assert.equal(sha256(persisted), record.sha256, `步骤 ${step.id} 的产物哈希不一致`);
      assert.equal(persisted.length, record.bytes, `步骤 ${step.id} 的产物长度不一致`);
      return { ...record, text: persisted.toString("utf8") };
    });
    const completed = new Set(records.map((record) => record.stepId));
    for (const record of records) {
      for (const dependency of record.dependsOn) assert.ok(completed.has(dependency), `步骤依赖倒置：${record.stepId}`);
    }
    const outline = records.find((record) => record.stepId === "outline");
    const deliverable = records.find((record) => record.stepId === "deliverable");
    assertStepBody(outline.text, { projectId: input.projectId });
    assertStepBody(deliverable.text, { projectId: input.projectId });
    return records;
  }

  function complete(execution) {
    const { current, task, input } = requireExecution(execution);
    if (task.state === "completed") {
      recordPlan(input.projectId, planEntry(task, input, current.get("records", `verification:${task.verification_id}`)));
      return trace(execution.taskId);
    }
    if (task.cancel_requested || task.state === "cancel_requested") throw new Error("取消已请求，迟到候选不能结算");
    assert.equal(task.state, "running", "任务状态不允许结算");
    assert.equal(task.context_version, execution.planVersion, "执行记录计划版本已过期");
    assert.equal(input.planVersion, execution.planVersion, "冻结输入计划版本不一致");
    assert.equal(input.input_sha256, execution.inputSha256, "执行记录输入版本不一致");

    const event = eventOf(task);
    const eventDetail = JSON.parse(event?.detail || "{}");
    assert.equal(eventDetail.action, input.action, "原生事件动作与冻结记录不一致");
    assert.equal(eventDetail.projectId, input.projectId, "原生事件项目与冻结记录不一致");
    assert.equal(eventDetail.goal, input.goal, "原生事件目标与冻结记录不一致");
    assert.equal(eventDetail.revision, input.revision, "原生事件修订输入与冻结记录不一致");
    assert.equal(eventDetail.worker, execution.worker, "执行记录 Worker 与原生事件不匹配");
    assert.equal(input.worker, execution.worker, "冻结记录 Worker 与执行记录不匹配");
    assert.equal(
      task.acceptance.remoteVersion, PROJECT_TYPE,
      "Task 验收项目类型不匹配",
    );
    assert.equal(
      task.acceptance.hash, inputShaOf({
        action: input.action, projectId: input.projectId, goal: input.goal,
        revision: input.revision, previous: input.previous,
      }),
      "Task 验收输入哈希与冻结输入不一致",
    );
    assertPreviousUnchanged(input);

    const records = assertStepsComplete(task, input);
    const manifestText = records.find((record) => record.stepId === "manifest").text;
    const expected = assertManifestText(task, input, manifestText);
    const manifestRecord = records.find((record) => record.stepId === "manifest");
    const fileHash = manifestRecord.sha256;

    const attempt = current.get("records", `attempt:${execution.attemptId}`);
    if (attempt?.state === "running") reportWorkerDone(db, { taskId: execution.taskId, attemptId: execution.attemptId, now: now() });
    const run = view().get("runs", execution.runId);
    if (run?.state === "claimed") {
      assert.ok(execution.job?.token, "当前 claimed run 缺少原生执行令牌");
      act("finish", [execution.runId, execution.job.token, { outcome: "done", summary: "项目步骤候选已生成，等待 Result Lane" }]);
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
        actualPath: execution.manifestPath, actualHash: input.input_sha256,
        actualRemoteVersion: PROJECT_TYPE, actualFileHash: fileHash, qualityScore: 100, now: now(),
      });
    }
    finalizeTask(db, {
      commandId: `finalize-${execution.taskId}`, taskId: execution.taskId,
      attemptId: execution.attemptId, contextVersion: execution.planVersion,
      verificationId, now: now(),
    });
    recordPlan(input.projectId, planEntry(task, input, view().get("records", `verification:${verificationId}`)));
    return trace(execution.taskId);
  }

  function planEntry(task, input, verification) {
    const artifacts = STEPS.map((step) => {
      const record = stepRecord(task.id, step.id);
      assert.ok(record?.state === "completed", `项目计划缺少已完成步骤：${step.id}`);
      return { stepId: step.id, path: record.path, sha256: record.sha256 };
    });
    return {
      planVersion: task.context_version,
      action: input.action,
      goal: input.goal,
      revision: input.revision,
      inputSha256: input.input_sha256,
      previous: input.previous
        ? { planVersion: input.previous.planVersion, manifestSha256: input.previous.manifestSha256 }
        : null,
      taskId: task.id,
      attemptId: task.current_attempt,
      runId: task.run_id,
      runAttempt: task.run_attempt,
      manifestPath: projectStepRelativePath(input.projectId, task.context_version, "manifest"),
      manifestSha256: verification?.file_hash ?? null,
      artifacts,
      completedAt: now(),
    };
  }

  function queued() {
    const current = view();
    const messages = [];
    for (const link of rows(current, "run_events")) {
      const run = current.get("runs", link.run_id);
      if (run?.state !== "queued" || run.rule !== RULE) continue;
      const event = current.get("events", link.event_id);
      if (event?.type !== "project.request") continue;
      const detail = JSON.parse(event.detail);
      messages.push({
        appId: detail.appId, messageId: event.key, chatId: detail.chatId, ownerId: detail.ownerId,
        worker: detail.worker, action: detail.action, projectId: detail.projectId,
        goal: detail.goal, revision: detail.revision, nativeRunId: run.id,
      });
    }
    return messages.sort((left, right) => left.nativeRunId - right.nativeRunId || left.messageId.localeCompare(right.messageId));
  }

  function projects() {
    return rows(view(), "records")
      .filter((row) => row.kind === "project_index")
      .map((row) => ({ ...row }))
      .sort((left, right) => left.projectId.localeCompare(right.projectId));
  }

  return {
    begin,
    writeStep,
    completeStep,
    writeManifest,
    complete,
    trace,
    steps: (taskId) => STEPS.map((step) => stepRecord(taskId, step.id)).filter(Boolean),
    queued,
    projects,
    index: (projectId) => indexOf(projectId),
    claim: (deliveryKey) => claimDelivery(db, { deliveryKey, now: now() }),
    accept: (deliveryKey) => acceptDelivery(db, { deliveryKey, providerMessageId: null, capability: "at_least_once", now: now() }),
    unknown: (deliveryKey) => markDeliveryUnknown(db, { deliveryKey, now: now() }),
    cancel: (taskId) => requestCancel(db, { taskId, now: now() }),
    factCount: () => Number(db.prepare("SELECT COUNT(*) AS count FROM facts").get().count),
    close: () => { if (!sharedDb) db.close(); },
  };
}
