import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { openBusinessView, reportWorkerDone } from "../../syno-autoloop-p0/examples/syno-p0/commands.ts";
import { candidateMarkdown } from "../experiments/superagent-p0/idea-object.mjs";
import { openNativeButlerRuntime } from "../experiments/superagent-p0/native-butler-runtime.mjs";
import { openNativeProjectRuntime } from "../experiments/superagent-p0/native-project-runtime.mjs";
import {
  buildManifest,
  canonicalManifest,
  projectStepPath,
  projectStepRelativePath,
  sha256,
} from "../experiments/superagent-p0/project-object.mjs";
import {
  MODEL,
  MODEL_LABEL,
  assertProjectRequest,
  buildProjectPrompt,
  parseProjectModelResponse,
  projectResponseSchema,
  readFrozenPrevious,
} from "../experiments/superagent-p0/project-worker-contract.mjs";

const SOURCE_URL = "https://code.claude.com/docs/en/best-practices";
const SOURCE = "Public unified Runtime fixture\n\nKeep project objects isolated.\n";
const message = (id, extra = {}) => ({ appId: "cli_test", messageId: id, chatId: "oc_test", ownerId: "ou_test", ...extra });

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-project-"));
  const vaultRoot = path.join(root, "vault");
  mkdirSync(vaultRoot, { recursive: true });
  const sourcePath = path.join(root, "source.txt");
  writeFileSync(sourcePath, SOURCE);
  const options = {
    databasePath: path.join(root, "runtime", "native.db"),
    vaultRoot,
    sourcePath,
    sourceUrl: SOURCE_URL,
    indexFile: path.join(root, "runtime", "knowledge-index.json"),
    resultRoot: path.join(root, "results"),
    ideaRoot: path.join(root, "ideas"),
    projectRoot: path.join(root, "projects"),
  };
  return { root, options };
}

function withRuntime(fn) {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    return fn({ root, options, runtime, project: runtime.specialist("project") });
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
}

function routeProject(runtime, text) {
  const routed = runtime.route(text);
  assert.equal(routed.status, "routed", JSON.stringify(routed));
  assert.equal(routed.domain, "project");
  return routed;
}

function beginProject(runtime, id, text, extra = {}) {
  const routed = routeProject(runtime, text);
  const execution = runtime.specialist("project").begin({
    ...message(id),
    action: routed.action,
    ...(routed.projectId ? { projectId: routed.projectId } : {}),
    ...(routed.goal ? { goal: routed.goal } : {}),
    ...(routed.revision ? { revision: routed.revision } : {}),
    ...extra,
  });
  return { routed, execution };
}

function completeProject(runtime, execution, { outline = "# 大纲\n\n- 范围", deliverable = "# 简报\n\n正文" } = {}) {
  const project = runtime.specialist("project");
  project.writeStep(execution, "outline", outline);
  project.completeStep(execution, "outline");
  project.writeStep(execution, "deliverable", deliverable);
  project.completeStep(execution, "deliverable");
  project.writeManifest(execution);
  project.completeStep(execution, "manifest");
  return project.complete(execution);
}

function beginIdea(runtime, id, text) {
  const routed = runtime.route(text);
  assert.equal(routed.status, "routed", JSON.stringify(routed));
  assert.equal(routed.domain, "idea");
  return runtime.specialist("idea").begin({
    ...message(id), action: routed.action, prompt: routed.prompt,
  });
}

function completeIdea(runtime, execution, prompt) {
  writeFileSync(execution.artifactPath, candidateMarkdown({
    ideaId: execution.ideaId,
    version: execution.contextVersion,
    action: execution.action,
    metadata: {
      messageId: execution.messageId, taskId: execution.taskId, attemptId: execution.attemptId,
      ideaId: execution.ideaId, contextVersion: execution.contextVersion,
      inputSha256: execution.inputSha256, worker: execution.worker,
      model: "opencode-go/deepseek-v4.1-flash", action: execution.action,
      promptSha256: sha256(prompt), generatedTextSha256: sha256("合成想法正文。"), citations: [],
    },
    prompt,
    generatedText: "合成想法正文。",
    citations: [],
  }), { flag: "wx" });
  return runtime.specialist("idea").complete(execution);
}

function projectFiles(options) {
  return readdirSync(options.projectRoot, { recursive: true })
    .map((file) => String(file))
    .filter((file) => file.includes("."))
    .sort();
}

function deliveryCount(options, deliveryKey) {
  const db = new DatabaseSync(options.databasePath);
  try {
    const row = db.prepare("SELECT COUNT(*) AS count FROM projections WHERE collection='records' AND key=?").get(deliveryKey);
    return Number(row.count);
  } finally {
    db.close();
  }
}

const fileSha = (file) => sha256(readFileSync(file, "utf8"));

test("slow project A does not block project B or idea C; contexts, bodies, paths and indexes stay apart", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const { execution: slow } = beginProject(runtime, "om_proj_slow", "新建项目：慢慢展开的阿尔法项目");
    const { execution: fast } = beginProject(runtime, "om_proj_fast", "新建项目：很快完成的贝塔项目");
    const idea = beginIdea(runtime, "om_idea_c", "新建想法：伽马想法");

    const fastTrace = completeProject(runtime, fast, {
      outline: "ALPHA-FREE-OUTLINE 贝塔大纲", deliverable: "ALPHA-FREE-BODY 贝塔简报",
    });
    const ideaTrace = completeIdea(runtime, idea, "伽马想法");
    assert.equal(fastTrace.taskState, "completed");
    assert.equal(ideaTrace.taskState, "completed");
    assert.equal(runtime.specialist("project").trace(slow.taskId).taskState, "running");
    assert.equal(runtime.specialist("project").trace(slow.taskId).deliveryState, null);
    assert.equal(deliveryCount(options, slow.deliveryKey), 0);

    const slowTrace = completeProject(runtime, slow, {
      outline: "SLOW-A-OUTLINE 阿尔法大纲", deliverable: "SLOW-A-BODY 阿尔法简报",
    });
    assert.equal(slowTrace.taskState, "completed");

    assert.notEqual(slow.contextId, fast.contextId);
    assert.notEqual(slow.projectId, fast.projectId);
    assert.match(slow.contextId, /^project:project-[a-f0-9]{16}$/u);
    assert.match(ideaTrace.contextId, /^idea:idea-[a-f0-9]{16}$/u);

    const slowFiles = projectFiles(options).filter((file) => file.startsWith(slow.projectId));
    const fastFiles = projectFiles(options).filter((file) => file.startsWith(fast.projectId));
    assert.equal(slowFiles.length, 3);
    assert.equal(fastFiles.length, 3);
    assert.equal(projectFiles(options).some((file) => file.includes(ideaTrace.ideaId)), false);
    assert.match(readFileSync(slow.paths.deliverable, "utf8"), /SLOW-A-BODY/);
    assert.doesNotMatch(readFileSync(slow.paths.deliverable, "utf8"), /ALPHA-FREE-BODY/);
    assert.match(readFileSync(fast.paths.deliverable, "utf8"), /ALPHA-FREE-BODY/);
    assert.doesNotMatch(readFileSync(fast.paths.deliverable, "utf8"), /SLOW-A-BODY/);

    const projects = runtime.specialist("project").projects();
    assert.equal(projects.length, 2);
    for (const project of projects) {
      assert.equal(project.versions.length, 1);
      assert.equal(project.latestVersion, 1);
    }
    assert.equal(runtime.specialist("idea").ideas().length, 1);
    assert.equal(runtime.queued("project").length, 0);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("project v1 then revision v2 reread with dependencies and manifest; stale Attempt or late old plan cannot override v2", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const { execution: first } = beginProject(runtime, "om_rev_1", "新建项目：可修订的项目目标");
    const v1 = completeProject(runtime, first, { outline: "V1-OUTLINE", deliverable: "V1-BODY" });
    const v1Files = { outline: fileSha(first.paths.outline), deliverable: fileSha(first.paths.deliverable), manifest: fileSha(first.manifestPath) };

    const { execution: second } = beginProject(runtime, "om_rev_2", `修订项目 ${first.projectId}：加一节风险`);
    assert.equal(second.projectId, first.projectId);
    assert.equal(second.planVersion, 2);
    assert.notEqual(second.attemptId, first.attemptId);
    assert.notEqual(second.runId, first.runId);
    assert.equal(second.frozen.planVersion, 1);
    assert.equal(second.frozen.manifestSha256, v1.fileVersion);
    const v2 = completeProject(runtime, second, { outline: "V2-OUTLINE", deliverable: "V2-BODY" });
    assert.equal(v2.planVersion, 2);
    assert.equal(v2.taskState, "completed");

    const manifest = JSON.parse(readFileSync(v2.path, "utf8"));
    assert.equal(manifest.planVersion, 2);
    assert.equal(manifest.action, "revise");
    assert.equal(manifest.revision, "加一节风险");
    assert.equal(manifest.goal, "可修订的项目目标");
    assert.equal(manifest.inputSha256, second.inputSha256);
    assert.equal(manifest.previous.planVersion, 1);
    assert.equal(manifest.previous.manifestSha256, v1.fileVersion);
    assert.deepEqual(manifest.steps.map((step) => step.id), ["outline", "deliverable", "manifest"]);
    assert.deepEqual(manifest.steps.find((step) => step.id === "deliverable").dependsOn, ["outline"]);
    assert.deepEqual(manifest.steps.find((step) => step.id === "manifest").dependsOn, ["outline", "deliverable"]);
    assert.equal(manifest.steps.find((step) => step.id === "manifest").sha256, null);
    assert.equal(manifest.steps.find((step) => step.id === "outline").path, projectStepRelativePath(first.projectId, 2, "outline"));
    assert.equal(manifest.steps.find((step) => step.id === "outline").sha256, fileSha(second.paths.outline));
    assert.equal(manifest.steps.find((step) => step.id === "outline").runId, second.runId);
    assert.equal(manifest.steps.find((step) => step.id === "outline").runAttempt, second.runAttempt);

    const steps = runtime.specialist("project").steps(second.taskId);
    assert.equal(steps.length, 3);
    assert.deepEqual(steps.map((step) => step.state), ["completed", "completed", "completed"]);
    assert.deepEqual(steps.find((step) => step.stepId === "manifest").dependsOn, ["outline", "deliverable"]);

    assert.equal(runtime.specialist("project").index(first.projectId).latestVersion, 2);
    assert.deepEqual(runtime.specialist("project").index(first.projectId).versions.map((version) => version.planVersion), [1, 2]);
    assert.equal(fileSha(first.paths.outline), v1Files.outline);
    assert.equal(fileSha(first.paths.deliverable), v1Files.deliverable);
    assert.equal(fileSha(first.manifestPath), v1Files.manifest);
    assert.match(readFileSync(first.paths.deliverable, "utf8"), /V1-BODY/);
    assert.doesNotMatch(readFileSync(first.paths.deliverable, "utf8"), /V2-BODY/);

    assert.throws(
      () => runtime.specialist("project").completeStep({ ...second, attemptId: first.attemptId }, "outline"),
      /执行记录 Attempt 不是当前 Attempt/,
    );
    assert.throws(
      () => runtime.specialist("project").complete({ ...second, attemptId: first.attemptId }),
      /执行记录 Attempt 不是当前 Attempt/,
    );
    const beforeLate = runtime.factCount();
    const lateOld = runtime.specialist("project").complete(first);
    assert.equal(lateOld.taskState, "completed");
    assert.equal(lateOld.planVersion, 1);
    assert.equal(runtime.factCount(), beforeLate);
    assert.equal(runtime.specialist("project").index(first.projectId).latestVersion, 2);
    assert.equal(fileSha(v2.path), v2.fileVersion);
    assert.equal(fileSha(first.paths.deliverable), v1Files.deliverable);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("cancellation only settles the named project Task while project B still completes", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const { execution: cancelled } = beginProject(runtime, "om_cancel_a", "新建项目：会被取消的项目");
    const { execution: other } = beginProject(runtime, "om_cancel_b", "新建项目：继续完成的项目");
    runtime.specialist("project").cancel(cancelled.taskId);
    assert.equal(runtime.specialist("project").trace(cancelled.taskId).taskState, "cancel_requested");
    assert.equal(runtime.specialist("project").trace(cancelled.taskId).deliveryState, null);
    assert.equal(deliveryCount(options, cancelled.deliveryKey), 0);
    assert.throws(() => runtime.specialist("project").writeStep(cancelled, "outline", "# 迟到候选"), /取消|不允许/);

    const finished = completeProject(runtime, other, { outline: "B-OUTLINE", deliverable: "B-BODY" });
    assert.equal(finished.taskState, "completed");
    assert.equal(finished.planVersion, 1);
    assert.equal(runtime.specialist("project").trace(cancelled.taskId).taskState, "cancel_requested");
    assert.equal(runtime.specialist("project").trace(cancelled.taskId).deliveryState, null);
    assert.equal(deliveryCount(options, cancelled.deliveryKey), 0);
    assert.equal(deliveryCount(options, finished.deliveryKey), 1);
    assert.equal(projectFiles(options).filter((file) => file.startsWith(cancelled.projectId)).length, 0);
    assert.equal(projectFiles(options).filter((file) => file.startsWith(other.projectId)).length, 3);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("unknown and ambiguous project requests produce zero facts, Tasks, indexes, files or Workers", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const first = beginProject(runtime, "om_scope_1", "新建项目：作用域项目甲").execution;
    completeProject(runtime, first);
    const second = beginProject(runtime, "om_scope_2", "新建项目：作用域项目乙").execution;
    completeProject(runtime, second);

    const beforeFacts = runtime.factCount();
    const beforeProjects = runtime.specialist("project").projects().length;
    const beforeFiles = projectFiles(options).length;
    const unknownId = "project-0000000000000000";

    const missingGoal = runtime.route("新建项目：");
    const missingId = runtime.route("修订项目：没有编号的修订");
    const missingColon = runtime.route("修订项目 没有冒号的修订");
    const multiple = runtime.route("修订项目：多个候选");
    const unknown = runtime.route(`修订项目 ${unknownId}：没有这个项目`);
    const unsupported = runtime.route("帮我新建项目：这不该被路由");

    assert.equal(missingGoal.status, "ambiguous");
    assert.equal(missingGoal.domain, "project");
    assert.equal(missingGoal.reason, "missing-project-goal");
    assert.equal(missingId.status, "ambiguous");
    assert.equal(missingId.reason, "multiple-projects");
    assert.equal(missingColon.status, "ambiguous");
    assert.equal(missingColon.reason, "missing-project-id");
    assert.equal(multiple.status, "ambiguous");
    assert.equal(multiple.reason, "multiple-projects");
    assert.equal(multiple.candidates.length, 2);
    assert.equal(unknown.status, "unknown");
    assert.equal(unknown.domain, "project");
    assert.equal(unknown.projectId, unknownId);
    assert.equal(unsupported.status, "unsupported");
    assert.equal(unsupported.domain, null);

    assert.equal(runtime.factCount(), beforeFacts);
    assert.equal(runtime.specialist("project").projects().length, beforeProjects);
    assert.equal(runtime.queued("project").length, 0);
    assert.equal(projectFiles(options).length, beforeFiles);
    assert.equal(runtime.specialist("project").index(unknownId), null);
    assert.throws(() => runtime.specialist("project").trace(`task-${unknownId}`), /缺少 Task/);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("message replay is inert, a changed replay is rejected, and a queued revision resumes once the first plan completes", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const { execution: first } = beginProject(runtime, "om_replay_1", "新建项目：重放项目目标");
    const completed = completeProject(runtime, first, { outline: "REPLAY-OUTLINE", deliverable: "REPLAY-BODY" });
    const beforeFacts = runtime.factCount();
    const beforeFiles = projectFiles(options).length;

    const replay = beginProject(runtime, "om_replay_1", "新建项目：重放项目目标").execution;
    assert.equal(replay.state, "completed");
    assert.equal(replay.runId, first.runId);
    assert.equal(replay.attemptId, first.attemptId);
    assert.equal(replay.planVersion, 1);
    assert.equal(runtime.factCount(), beforeFacts);
    assert.equal(projectFiles(options).length, beforeFiles);

    assert.throws(
      () => beginProject(runtime, "om_replay_1", "新建项目：换了目标的重放"),
      /同一消息不能更换动作、对象、目标或正文/,
    );
    assert.equal(runtime.factCount(), beforeFacts);
    assert.equal(fileSha(completed.path), completed.fileVersion);

    const { execution: queuedFirst } = beginProject(runtime, "om_queue_1", "新建项目：排队项目第一版");
    const { execution: queuedSecond } = beginProject(runtime, "om_queue_2", `修订项目 ${queuedFirst.projectId}：排队修订第二版`);
    assert.equal(queuedSecond.state, "queued");
    assert.equal(queuedSecond.taskId, undefined);
    assert.throws(() => runtime.specialist("project").trace("task-om_queue_2"), /缺少 Task/);
    assert.equal(runtime.queued("project").length, 1);
    const queued = runtime.queued("project")[0];
    assert.equal(queued.messageId, "om_queue_2");
    assert.equal(queued.appId, "cli_test");
    assert.equal(queued.chatId, "oc_test");
    assert.equal(queued.ownerId, "ou_test");
    assert.equal(queued.worker, "OpenCode");
    assert.equal(queued.action, "revise");
    assert.equal(queued.projectId, queuedFirst.projectId);
    assert.equal(queued.goal, "排队项目第一版");
    assert.equal(queued.revision, "排队修订第二版");

    const otherProject = beginProject(runtime, "om_queue_other", "新建项目：排队期间并行项目").execution;
    assert.equal(completeProject(runtime, otherProject).taskState, "completed");

    const firstTrace = completeProject(runtime, queuedFirst, { outline: "Q1-OUTLINE", deliverable: "Q1-BODY" });
    assert.equal(firstTrace.planVersion, 1);
    assert.equal(runtime.queued("project").length, 1);

    const resumed = runtime.specialist("project").begin(queued);
    assert.equal(resumed.planVersion, 2);
    assert.equal(resumed.messageId, "om_queue_2");
    assert.equal(resumed.frozen.planVersion, 1);
    assert.notEqual(resumed.attemptId, queuedFirst.attemptId);
    const resumedTrace = completeProject(runtime, resumed, { outline: "Q2-OUTLINE", deliverable: "Q2-BODY" });
    assert.equal(resumedTrace.planVersion, 2);
    assert.equal(resumedTrace.taskState, "completed");
    assert.equal(runtime.queued("project").length, 0);
    assert.equal(runtime.specialist("project").index(queuedFirst.projectId).latestVersion, 2);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("Worker timeout, cancellation and reportWorkerDone never settle the business Task; stale Attempts are rejected", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const { execution: timedOut } = beginProject(runtime, "om_timeout", "新建项目：超时保留当前 Attempt");
    const worker = spawnSync(process.execPath, ["-e", "setTimeout(() => {}, 10000)"], { timeout: 30 });
    assert.equal(worker.signal, "SIGTERM");
    const timedOutTrace = runtime.specialist("project").trace(timedOut.taskId);
    assert.equal(timedOutTrace.taskState, "running");
    assert.equal(timedOutTrace.attemptId, timedOut.attemptId);
    assert.equal(timedOutTrace.attemptState, "running");
    assert.equal(timedOutTrace.nativeRunState, "claimed");
    assert.equal(timedOutTrace.deliveryState, null);
    assert.equal(projectFiles(options).filter((file) => file.startsWith(timedOut.projectId)).length, 0);

    const { execution: workerDone } = beginProject(runtime, "om_worker_done", "新建项目：Worker done 不结算 Task");
    const db = new DatabaseSync(options.databasePath);
    try {
      db.exec("PRAGMA busy_timeout=5000;");
      openBusinessView(db);
      reportWorkerDone(db, { taskId: workerDone.taskId, attemptId: workerDone.attemptId, now: Date.now() });
    } finally {
      db.close();
    }
    const workerOnly = runtime.specialist("project").trace(workerDone.taskId);
    assert.equal(workerOnly.attemptState, "done");
    assert.equal(workerOnly.taskState, "running");
    assert.equal(workerOnly.nativeRunState, "claimed");
    assert.equal(workerOnly.deliveryState, null);
    assert.equal(deliveryCount(options, workerDone.deliveryKey), 0);

    const settled = completeProject(runtime, workerDone);
    assert.equal(settled.taskState, "completed");
    assert.equal(settled.attemptState, "done");
    assert.equal(settled.nativeRunState, "done");
    assert.equal(settled.deliveryState, "queued");

    const { execution: cancelled } = beginProject(runtime, "om_worker_cancel", "新建项目：取消后迟到候选");
    runtime.specialist("project").cancel(cancelled.taskId);
    assert.throws(() => runtime.specialist("project").complete(cancelled), /取消已请求，迟到候选不能结算/);
    assert.throws(() => runtime.specialist("project").completeStep(cancelled, "outline"), /取消已请求，迟到步骤不能结算/);
    assert.equal(runtime.specialist("project").trace(cancelled.taskId).deliveryState, null);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("exit after partial candidate writes recovers the same Task, Attempt and plan version and settles exactly once", () => {
  const { root, options } = fixture();
  const runtimeUrl = new URL("../experiments/superagent-p0/native-butler-runtime.mjs", import.meta.url).href;
  const script = `
    import { openNativeButlerRuntime } from ${JSON.stringify(runtimeUrl)};
    const runtime = openNativeButlerRuntime(${JSON.stringify(options)});
    const routed = runtime.route("新建项目：写盘后崩溃恢复");
    if (routed.status !== "routed") throw new Error(JSON.stringify(routed));
    const execution = runtime.specialist("project").begin({
      appId: "cli_test", messageId: "om_crash_project", chatId: "oc_test", ownerId: "ou_test",
      action: routed.action, goal: routed.goal, worker: "OpenCode",
    });
    const outline = runtime.specialist("project").writeStep(execution, "outline", "CRASH-OUTLINE 已写盘");
    console.log(JSON.stringify({ execution, outline }));
    process.exit(91);
  `;
  try {
    const crashed = spawnSync(process.execPath, ["--disable-warning=ExperimentalWarning", "--input-type=module", "-e", script], { encoding: "utf8" });
    assert.equal(crashed.status, 91, crashed.stderr);
    const before = JSON.parse(crashed.stdout);
    const beforeFiles = projectFiles(options);
    assert.equal(beforeFiles.length, 1);
    assert.equal(beforeFiles[0], `${before.execution.projectId}/v1/outline.md`);
    assert.equal(fileSha(before.execution.paths.outline), before.outline.sha256);

    const recoveredRuntime = openNativeButlerRuntime(options);
    try {
      const recovered = beginProject(recoveredRuntime, "om_crash_project", "新建项目：写盘后崩溃恢复").execution;
      assert.equal(recovered.runId, before.execution.runId);
      assert.equal(recovered.attemptId, before.execution.attemptId);
      assert.equal(recovered.planVersion, 1);
      assert.ok(recovered.job?.token);
      const project = recoveredRuntime.specialist("project");
      const reused = project.writeStep(recovered, "outline", "CRASH-OUTLINE 已写盘");
      assert.equal(reused.sha256, before.outline.sha256);
      assert.equal(projectFiles(options).length, 1);
      project.completeStep(recovered, "outline");
      project.writeStep(recovered, "deliverable", "CRASH-BODY 已写盘");
      project.completeStep(recovered, "deliverable");
      project.writeManifest(recovered);
      project.completeStep(recovered, "manifest");
      const settled = project.complete(recovered);
      assert.equal(settled.taskState, "completed");
      assert.equal(settled.nativeRunState, "done");
      assert.equal(settled.deliveryState, "queued");
      assert.equal(projectFiles(options).length, 3);
      assert.equal(deliveryCount(options, recovered.deliveryKey), 1);

      const factsAfterSettle = recoveredRuntime.factCount();
      const again = project.complete(recovered);
      assert.equal(again.taskState, "completed");
      assert.equal(recoveredRuntime.factCount(), factsAfterSettle);
      assert.equal(deliveryCount(options, recovered.deliveryKey), 1);
    } finally {
      recoveredRuntime.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("missing dependency, empty body, injected path and symlink escape are rejected without a delivery", () => {
  withRuntime(({ root, options, runtime, project }) => {
    const dependency = beginProject(runtime, "om_guard_dep", "新建项目：依赖顺序").execution;
    project.writeStep(dependency, "deliverable", "提前写的正文");
    assert.throws(() => project.completeStep(dependency, "deliverable"), /依赖 outline 尚未完成/);
    assert.throws(() => project.complete(dependency), /步骤未完成：outline|缺少步骤记录：outline/);
    assert.equal(project.trace(dependency.taskId).taskState, "running");
    assert.equal(project.trace(dependency.taskId).deliveryState, null);
    assert.equal(deliveryCount(options, dependency.deliveryKey), 0);
  });

  withRuntime(({ options, runtime, project }) => {
    const empty = beginProject(runtime, "om_guard_empty", "新建项目：空正文").execution;
    assert.throws(() => project.writeStep(empty, "outline", "   \n\t "), /步骤正文不能为空/);
    assert.equal(projectFiles(options).some((file) => file.startsWith(empty.projectId)), false);
    assert.throws(() => project.complete(empty), /缺少步骤记录：outline/);
    assert.equal(project.trace(empty.taskId).deliveryState, null);
  });

  withRuntime(({ options, runtime, project }) => {
    const injected = beginProject(runtime, "om_guard_inject", "新建项目：路径注入").execution;
    assert.throws(() => project.writeStep(injected, "outline", "# 读这个 /etc/passwd"), /绝对路径/);
    assert.throws(() => project.writeStep(injected, "outline", "# 跳到 ../../逃逸.md"), /上跳路径/);
    assert.throws(() => project.writeStep(injected, "outline", "参考 project-ffffffffffffffff/v1/outline.md"), /其他项目/);
    assert.equal(projectFiles(options).some((file) => file.startsWith(injected.projectId)), false);
    assert.equal(project.trace(injected.taskId).deliveryState, null);
  });

  withRuntime(({ root, runtime, project }) => {
    const escaped = beginProject(runtime, "om_guard_symlink", "新建项目：符号链接逃逸").execution;
    const versionDirectory = path.dirname(escaped.paths.outline);
    const outside = path.join(root, "outside");
    mkdirSync(outside, { recursive: true });
    rmSync(versionDirectory, { recursive: true, force: true });
    symlinkSync(outside, versionDirectory, "dir");
    assert.throws(() => project.writeStep(escaped, "outline", "# 逃逸正文"), /逃逸出受控目录|符号链接/);
    assert.equal(readdirSync(outside).length, 0);
    assert.equal(project.trace(escaped.taskId).deliveryState, null);
  });
});

test("forged plan version, input hash, manifest fields and a tampered manifest are rejected without a delivery", () => {
  const prepare = (runtime, project, id) => {
    const execution = beginProject(runtime, id, `新建项目：伪造校验 ${id}`).execution;
    project.writeStep(execution, "outline", "GUARD-OUTLINE");
    project.completeStep(execution, "outline");
    project.writeStep(execution, "deliverable", "GUARD-BODY");
    project.completeStep(execution, "deliverable");
    project.writeManifest(execution);
    return execution;
  };

  withRuntime(({ options, runtime, project }) => {
    const execution = prepare(runtime, project, "om_forge_plan");
    const manifest = JSON.parse(readFileSync(execution.manifestPath, "utf8"));
    writeFileSync(execution.manifestPath, canonicalManifest({ ...manifest, planVersion: 9 }));
    assert.throws(() => project.completeStep(execution, "manifest"), /manifest 规范字段/);
    assert.throws(() => project.complete(execution), /步骤未完成：manifest/);
    assert.equal(project.trace(execution.taskId).deliveryState, null);
    assert.equal(deliveryCount(options, execution.deliveryKey), 0);
  });

  withRuntime(({ runtime, project }) => {
    const execution = prepare(runtime, project, "om_forge_input");
    const manifest = JSON.parse(readFileSync(execution.manifestPath, "utf8"));
    writeFileSync(execution.manifestPath, canonicalManifest({ ...manifest, inputSha256: "0".repeat(64) }));
    assert.throws(() => project.completeStep(execution, "manifest"), /manifest 规范字段/);
    assert.equal(project.trace(execution.taskId).deliveryState, null);
  });

  withRuntime(({ runtime, project }) => {
    const execution = prepare(runtime, project, "om_forge_task");
    const manifest = JSON.parse(readFileSync(execution.manifestPath, "utf8"));
    writeFileSync(execution.manifestPath, canonicalManifest({
      ...manifest,
      steps: manifest.steps.map((step) => (step.id === "outline" ? { ...step, taskId: "task-forged" } : step)),
    }));
    assert.throws(() => project.completeStep(execution, "manifest"), /manifest 规范字段/);
    assert.equal(project.trace(execution.taskId).deliveryState, null);
  });

  withRuntime(({ options, runtime, project }) => {
    const execution = prepare(runtime, project, "om_forge_manifest");
    project.completeStep(execution, "manifest");
    const manifest = JSON.parse(readFileSync(execution.manifestPath, "utf8"));
    writeFileSync(execution.manifestPath, canonicalManifest({ ...manifest, goal: "被改写的目标" }));
    assert.throws(() => project.complete(execution), /步骤 manifest 的产物哈希不一致/);
    assert.equal(project.trace(execution.taskId).taskState, "running");
    assert.equal(project.trace(execution.taskId).deliveryState, null);
    assert.equal(deliveryCount(options, execution.deliveryKey), 0);
  });

  withRuntime(({ runtime, project }) => {
    const execution = beginProject(runtime, "om_forge_body", "新建项目：篡改产出正文").execution;
    project.writeStep(execution, "outline", "OUTLINE");
    project.completeStep(execution, "outline");
    project.writeStep(execution, "deliverable", "占位正文");
    project.completeStep(execution, "deliverable");
    project.writeManifest(execution);
    project.completeStep(execution, "manifest");
    writeFileSync(execution.paths.deliverable, "   \n");
    assert.throws(() => project.complete(execution), /步骤 deliverable 的产物哈希不一致/);
    assert.equal(project.trace(execution.taskId).deliveryState, null);
  });
});

test("revision freezes the previous plan and rejects a changed old artifact before any delivery", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const project = runtime.specialist("project");
    const { execution: first } = beginProject(runtime, "om_prev_1", "新建项目：冻结旧计划");
    const v1 = completeProject(runtime, first, { outline: "PREV-V1-OUTLINE", deliverable: "PREV-V1-BODY" });
    const { execution: revision } = beginProject(runtime, "om_prev_2", `修订项目 ${first.projectId}：新版本`);
    assert.equal(revision.frozen.planVersion, 1);
    assert.equal(revision.frozen.manifestSha256, v1.fileVersion);

    project.writeStep(revision, "outline", "PREV-V2-OUTLINE");
    project.completeStep(revision, "outline");
    project.writeStep(revision, "deliverable", "PREV-V2-BODY");
    project.completeStep(revision, "deliverable");
    project.writeManifest(revision);
    project.completeStep(revision, "manifest");

    writeFileSync(first.paths.outline, "PREV-V1-OUTLINE 被篡改");
    assert.throws(() => project.complete(revision), /修订冻结的前一计划产物已变化：outline/);
    assert.equal(project.trace(revision.taskId).taskState, "running");
    assert.equal(project.trace(revision.taskId).deliveryState, null);
    assert.equal(deliveryCount(options, revision.deliveryKey), 0);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("delivery appears only after the Result Lane, and unknown reconciliation never resends blindly", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const project = runtime.specialist("project");
    const { execution } = beginProject(runtime, "om_delivery", "新建项目：投递顺序");
    project.writeStep(execution, "outline", "DELIVERY-OUTLINE");
    project.completeStep(execution, "outline");
    project.writeStep(execution, "deliverable", "DELIVERY-BODY");
    project.completeStep(execution, "deliverable");
    project.writeManifest(execution);
    project.completeStep(execution, "manifest");

    assert.equal(project.trace(execution.taskId).deliveryState, null);
    assert.equal(deliveryCount(options, execution.deliveryKey), 0);

    const settled = project.complete(execution);
    assert.equal(settled.deliveryState, "queued");
    assert.equal(settled.maySend, true);
    assert.equal(deliveryCount(options, execution.deliveryKey), 1);

    const claimed = project.claim(execution.deliveryKey);
    assert.equal(claimed.claimed, true);
    const afterClaim = project.trace(execution.taskId);
    assert.equal(afterClaim.deliveryState, "unknown");
    assert.equal(afterClaim.maySend, false);
    assert.equal(project.claim(execution.deliveryKey).claimed, false);

    const beforeUnknown = runtime.factCount();
    project.unknown(execution.deliveryKey);
    assert.equal(runtime.factCount(), beforeUnknown);
    assert.equal(project.trace(execution.taskId).maySend, false);
    assert.equal(project.claim(execution.deliveryKey).claimed, false);

    project.accept(execution.deliveryKey);
    const accepted = project.trace(execution.taskId);
    assert.equal(accepted.deliveryState, "accepted");
    assert.equal(accepted.maySend, false);
    assert.equal(accepted.providerMessageId, null);
    assert.equal(project.claim(execution.deliveryKey).claimed, false);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a standalone project runtime rejects the same unsafe writes without touching other project artifacts", () => {
  const { root, options } = fixture();
  const runtime = openNativeProjectRuntime({ ...options, databasePath: path.join(root, "runtime", "project-only.db") });
  try {
    runtime.begin({
      appId: "cli_test", messageId: "om_standalone", chatId: "oc_test", ownerId: "ou_test",
      action: "new", goal: "独立项目目标", worker: "OpenCode",
    });
    assert.throws(
      () => runtime.begin({ appId: "cli_test", messageId: "om_standalone_unknown", chatId: "oc_test", ownerId: "ou_test", action: "revise", projectId: "project-0000000000000000", revision: "x" }),
      /未知项目/,
    );
    assert.equal(runtime.projects().length, 1);
    assert.equal(runtime.projects()[0].versions.length, 0);
    assert.equal(runtime.factCount() > 0, true);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("project hashes are deterministic per message and independent from the idea namespace", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const first = beginProject(runtime, "om_det_1", "新建项目：确定性目标").execution;
    const expected = `project-${createHash("sha256").update("cli_test:om_det_1").digest("hex").slice(0, 16)}`;
    assert.equal(first.projectId, expected);
    assert.equal(first.contextId, `project:${expected}`);
    assert.equal(first.planVersion, 1);
    assert.equal(first.manifestPath, path.join(options.projectRoot, expected, "v1", "manifest.json"));
    const idea = beginIdea(runtime, "om_det_idea", "新建想法：同消息不同领域");
    assert.notEqual(`idea:${idea.ideaId}`, first.contextId);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

function workerContractFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-project-worker-"));
  const projectId = "project-0123456789abcdef";
  const planVersion = 1;
  const bodies = {
    outline: "V1-OUTLINE\n\n第一版大纲",
    deliverable: "V1-DELIVERABLE\n\n第一版正文",
  };
  for (const stepId of ["outline", "deliverable"]) {
    const file = projectStepPath(root, projectId, planVersion, stepId);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bodies[stepId]);
  }
  const stepEntry = (stepId) => ({
    stepId,
    taskId: "task-old",
    attemptId: "attempt-old",
    runId: 7,
    runAttempt: 1,
    path: projectStepRelativePath(projectId, planVersion, stepId),
    sha256: sha256(bodies[stepId]),
    bytes: Buffer.byteLength(bodies[stepId]),
  });
  const manifest = buildManifest({
    projectId,
    planVersion,
    action: "new",
    goal: "旧项目目标",
    inputSha256: sha256("old-input"),
    previous: null,
    steps: [
      stepEntry("outline"),
      stepEntry("deliverable"),
      {
        stepId: "manifest",
        taskId: "task-old",
        attemptId: "attempt-old",
        runId: 7,
        runAttempt: 1,
        path: projectStepRelativePath(projectId, planVersion, "manifest"),
        sha256: null,
        bytes: null,
      },
    ],
  });
  const manifestText = canonicalManifest(manifest);
  const manifestFile = projectStepPath(root, projectId, planVersion, "manifest");
  writeFileSync(manifestFile, manifestText);
  const previous = {
    planVersion,
    manifestPath: projectStepRelativePath(projectId, planVersion, "manifest"),
    manifestSha256: sha256(manifestText),
    artifacts: [
      { stepId: "outline", path: projectStepRelativePath(projectId, planVersion, "outline"), sha256: sha256(bodies.outline) },
      { stepId: "deliverable", path: projectStepRelativePath(projectId, planVersion, "deliverable"), sha256: sha256(bodies.deliverable) },
      { stepId: "manifest", path: projectStepRelativePath(projectId, planVersion, "manifest"), sha256: sha256(manifestText) },
    ],
  };
  const request = {
    messageId: "om_worker_request",
    taskId: "task-om_worker_request",
    attemptId: "attempt-9-1",
    projectId,
    action: "revise",
    goal: "旧项目目标",
    revision: "补充风险",
    planVersion: 2,
    inputSha256: sha256("new-input"),
    worker: "Pi",
    model: MODEL_LABEL,
    previous,
  };
  return { root, projectId, bodies, manifestFile, previous, request };
}

test("project Worker request binds IDs, fixed model/Worker, plan version and the kernel-frozen previous manifest", () => {
  const fixture = workerContractFixture();
  try {
    assert.equal(MODEL_LABEL, "opencode-go/deepseek-v4.1-flash");
    assert.deepEqual(MODEL, { providerID: "opencode-go", id: "deepseek-v4.1-flash" });
    assert.equal(assertProjectRequest(fixture.request, "Pi"), fixture.request);

    assert.throws(() => assertProjectRequest({ ...fixture.request, worker: "OpenCode" }, "Pi"), /Worker 不匹配/);
    assert.throws(() => assertProjectRequest({ ...fixture.request, model: "openai/gpt" }, "Pi"), /模型未获批准/);
    assert.throws(() => assertProjectRequest({ ...fixture.request, action: "delete" }, "Pi"), /动作非法/);
    assert.throws(() => assertProjectRequest({ ...fixture.request, projectId: "project-zz" }, "Pi"), /对象非法/);
    assert.throws(() => assertProjectRequest({ ...fixture.request, messageId: "bad/id" }, "Pi"), /消息 ID 非法/);
    assert.throws(() => assertProjectRequest({ ...fixture.request, taskId: "" }, "Pi"), /缺少 taskId/);
    assert.throws(() => assertProjectRequest({ ...fixture.request, goal: " " }, "Pi"), /缺少 goal/);
    assert.throws(() => assertProjectRequest({ ...fixture.request, planVersion: 0 }, "Pi"), /计划版本非法/);
    assert.throws(() => assertProjectRequest({ ...fixture.request, inputSha256: "xyz" }, "Pi"), /输入哈希非法/);
    assert.throws(() => assertProjectRequest({ ...fixture.request, action: "new" }, "Pi"), /新建项目不能携带修订正文/);
    assert.throws(() => assertProjectRequest({ ...fixture.request, revision: " " }, "Pi"), /修订请求缺少正文/);
    assert.throws(() => assertProjectRequest({ ...fixture.request, previous: null }, "Pi"), /缺少冻结的 previous/);
    assert.throws(() => assertProjectRequest({ ...fixture.request, planVersion: 3 }, "Pi"), /必须紧邻本轮计划/);
    assert.throws(
      () => assertProjectRequest({
        ...fixture.request,
        previous: { ...fixture.previous, artifacts: fixture.previous.artifacts.filter((artifact) => artifact.stepId !== "outline") },
      }, "Pi"),
      /缺少步骤 outline/,
    );
    assert.throws(
      () => assertProjectRequest({
        ...fixture.request,
        previous: { ...fixture.previous, artifacts: [...fixture.previous.artifacts, fixture.previous.artifacts[0]] },
      }, "Pi"),
      /步骤重复/,
    );
    assert.doesNotThrow(() => assertProjectRequest({
      ...fixture.request, action: "new", revision: null, previous: null, planVersion: 1,
    }, "Pi"));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("project Worker response is strictly outline+deliverable and rejects empty bodies, paths, cross-project ids and copies", () => {
  const projectId = "project-0123456789abcdef";
  const valid = JSON.stringify({ outline: "# 新大纲", deliverable: "# 新正文" });
  assert.deepEqual(parseProjectModelResponse(valid, { projectId }), { outline: "# 新大纲", deliverable: "# 新正文" });
  assert.deepEqual(parseProjectModelResponse(`\`\`\`json\n${valid}\n\`\`\``, { projectId }), { outline: "# 新大纲", deliverable: "# 新正文" });

  assert.throws(() => parseProjectModelResponse("not-json", { projectId }), /不是合法 JSON/);
  assert.throws(
    () => parseProjectModelResponse(JSON.stringify({ outline: "A", deliverable: "B", path: "/tmp/x" }), { projectId }),
    /字段必须严格是 outline 与 deliverable/,
  );
  assert.throws(() => parseProjectModelResponse(JSON.stringify({ outline: "A" }), { projectId }), /字段必须严格是 outline 与 deliverable/);
  assert.throws(() => parseProjectModelResponse(JSON.stringify({ outline: "A", deliverable: "B", manifest: {} }), { projectId }), /字段必须严格/);
  assert.throws(() => parseProjectModelResponse(JSON.stringify({ outline: "  ", deliverable: "B" }), { projectId }), /步骤正文不能为空/);
  assert.throws(() => parseProjectModelResponse(JSON.stringify({ outline: "A", deliverable: "" }), { projectId }), /步骤正文不能为空/);
  assert.throws(() => parseProjectModelResponse(JSON.stringify({ outline: "# 读 /etc/passwd", deliverable: "B" }), { projectId }), /绝对路径/);
  assert.throws(() => parseProjectModelResponse(JSON.stringify({ outline: "A", deliverable: "../../逃逸" }), { projectId }), /上跳路径/);
  assert.throws(
    () => parseProjectModelResponse(JSON.stringify({ outline: "A", deliverable: "见 project-ffffffffffffffff/v1/outline.md" }), { projectId }),
    /其他项目/,
  );
  const previous = [
    { stepId: "outline", content: "# 新大纲" },
    { stepId: "deliverable", content: "# 新正文" },
  ];
  assert.throws(
    () => parseProjectModelResponse(valid, { projectId, action: "revise", previous }),
    /不能仅复制旧版/,
  );
  assert.doesNotThrow(() => parseProjectModelResponse(
    JSON.stringify({ outline: "# 新大纲 v2", deliverable: "# 新正文 v2" }),
    { projectId, action: "revise", previous },
  ));

  const schema = projectResponseSchema();
  assert.deepEqual(schema.required, ["deliverable", "outline"]);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(Object.keys(schema.properties), ["outline", "deliverable"]);
});

test("frozen previous artifacts are re-read from fixed project paths and every hash mismatch aborts before the model", () => {
  const fixture = workerContractFixture();
  try {
    const read = readFrozenPrevious(fixture.request, fixture.root);
    assert.equal(read.manifest.planVersion, 1);
    assert.equal(read.manifestSha256, fixture.previous.manifestSha256);
    assert.equal(read.artifacts.find((artifact) => artifact.stepId === "outline").content, fixture.bodies.outline);
    assert.equal(read.artifacts.find((artifact) => artifact.stepId === "deliverable").content, fixture.bodies.deliverable);

    assert.throws(() => readFrozenPrevious(fixture.request, "relative/root"), /必须是绝对路径/);
    assert.throws(
      () => readFrozenPrevious({
        ...fixture.request,
        previous: {
          ...fixture.previous,
          artifacts: fixture.previous.artifacts.map((artifact) => (
            artifact.stepId === "outline" ? { ...artifact, path: `${fixture.projectId}/v1/other.md` } : artifact
          )),
        },
      }, fixture.root),
      /固定项目路径：outline/,
    );

    writeFileSync(projectStepPath(fixture.root, fixture.projectId, 1, "outline"), "V1-OUTLINE 被篡改");
    assert.throws(() => readFrozenPrevious(fixture.request, fixture.root), /previous 产物已变化：outline/);
    writeFileSync(projectStepPath(fixture.root, fixture.projectId, 1, "outline"), fixture.bodies.outline);

    writeFileSync(fixture.manifestFile, canonicalManifest({ ...read.manifest, goal: "被篡改的目标" }));
    assert.throws(() => readFrozenPrevious(fixture.request, fixture.root), /previous manifest 已变化/);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("project Worker prompt keeps goal and revision while marking history untrusted and tool-free", () => {
  const previous = [{ stepId: "outline", content: "旧版大纲正文" }];
  const revised = buildProjectPrompt({
    action: "revise", goal: "量化项目目标", revision: "补充风险章节", planVersion: 2, previous,
  });
  assert.match(revised, /量化项目目标/);
  assert.match(revised, /补充风险章节/);
  assert.match(revised, /不可信素材/);
  assert.match(revised, /<untrusted-goal>/);
  assert.match(revised, /<untrusted-revision>/);
  assert.match(revised, /<untrusted-previous>/);
  assert.match(revised, /旧版大纲正文/);
  assert.match(revised, /不得使用任何工具/);
  assert.match(revised, /不访问网络/);
  assert.match(revised, /只输出一个 JSON 对象/);
  assert.match(revised, /不能仅复制旧版/);

  const fresh = buildProjectPrompt({ action: "new", goal: "全新目标", planVersion: 1, previous: null });
  assert.match(fresh, /全新目标/);
  assert.match(fresh, /（无）/);
  assert.doesNotMatch(fresh, /不能仅复制旧版/);
});
