// P2 TaskWorkspace: real temp Git repository through the P3 Host/project Specialist seam.
// Proves isolated candidate writes, Result-Lane pinned-commit merge, crash recovery without a second worktree
// or duplicate merge, and that out-of-path/unverified/wrong-version candidates never reach the repository.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { GitGuard } from "../packages/syno-core/git-guard.mjs";
import { TaskWorkspaceManager } from "../packages/syno-core/task-workspace.mjs";
import { openNativeButlerRuntime } from "../experiments/superagent-p0/native-butler-runtime.mjs";
import { readFrozenPrevious } from "../experiments/superagent-p0/project-worker-contract.mjs";
import {
  projectStepPath,
  projectStepRelativePath,
  projectWorkspaceTaskId,
  sha256,
} from "../experiments/superagent-p0/project-object.mjs";

const SOURCE = "P2 task workspace fixture\n";
const PROJECT_DIR = "vault/04-Projects";

function git(cwd, ...args) {
  return execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd, encoding: "utf8" }).trim();
}

function gitRepository(root) {
  const repo = path.join(root, "knowledge");
  mkdirSync(path.join(repo, PROJECT_DIR), { recursive: true });
  writeFileSync(path.join(repo, PROJECT_DIR, ".gitkeep"), "");
  git(repo, "init", "-b", "main");
  git(repo, "config", "user.name", "Syno Test");
  git(repo, "config", "user.email", "syno-test@example.invalid");
  git(repo, "add", "--", PROJECT_DIR);
  git(repo, "commit", "-m", "init");
  return repo;
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-project-workspace-"));
  const repo = gitRepository(root);
  const vaultRoot = path.join(repo, "vault");
  const sourcePath = path.join(root, "source.txt");
  writeFileSync(sourcePath, SOURCE);
  const options = {
    databasePath: path.join(root, "runtime", "native.db"),
    vaultRoot,
    sourcePath,
    sourceUrl: "https://code.claude.com/docs/en/best-practices",
    indexFile: path.join(root, "runtime", "knowledge-index.json"),
    resultRoot: path.join(root, "results"),
    ideaRoot: path.join(root, "ideas"),
    projectRoot: path.join(repo, PROJECT_DIR),
    memoryRoot: path.join(root, "memory"),
    repoRoot: repo,
    worktreeRoot: path.join(root, "worktrees"),
  };
  return { root, repo, options };
}

function openHost(options) {
  return openNativeButlerRuntime(options);
}

function message(id) {
  return { appId: "cli_test", messageId: id, chatId: "oc_test", ownerId: "ou_test" };
}

async function beginProject(runtime, id, text) {
  const routed = runtime.route(text);
  assert.equal(routed.status, "routed", JSON.stringify(routed));
  assert.equal(routed.domain, "project");
  return runtime.specialist("project").begin({
    ...message(id),
    action: routed.action,
    ...(routed.projectId ? { projectId: routed.projectId } : {}),
    ...(routed.goal ? { goal: routed.goal } : {}),
    ...(routed.revision ? { revision: routed.revision } : {}),
  });
}

function writeCandidates(project, execution, { outline = "WORKSPACE-OUTLINE", deliverable = "WORKSPACE-BODY" } = {}) {
  project.writeStep(execution, "outline", outline);
  project.completeStep(execution, "outline");
  project.writeStep(execution, "deliverable", deliverable);
  project.completeStep(execution, "deliverable");
  project.writeManifest(execution);
  project.completeStep(execution, "manifest");
}

const fileSha = (file) => sha256(readFileSync(file));
const countCommits = (repo) => Number(git(repo, "rev-list", "--count", "HEAD"));
const countMerges = (repo) => Number(git(repo, "rev-list", "--count", "--merges", "HEAD"));
const worktreePaths = (repo) => git(repo, "worktree", "list", "--porcelain")
  .split(/\r?\n/u)
  .filter((line) => line.startsWith("worktree "))
  .map((line) => path.resolve(line.slice("worktree ".length)));

const moduleUrl = (relative) => new URL(relative, import.meta.url).href;
const RUNTIME_URL = moduleUrl("../experiments/superagent-p0/native-butler-runtime.mjs");
const GUARD_URL = moduleUrl("../packages/syno-core/git-guard.mjs");
const WORKSPACE_URL = moduleUrl("../packages/syno-core/task-workspace.mjs");

const expectedWorkspace = (options, taskId) => {
  const derived = projectWorkspaceTaskId(taskId);
  return {
    directory: path.join(options.worktreeRoot, `syno-job-${derived}`),
    branch: `syno/job/${derived}`,
  };
};

function runChild(script) {
  return spawnSync(process.execPath, ["--disable-warning=ExperimentalWarning", "--input-type=module", "-e", script], { encoding: "utf8" });
}

function deliveryCount(options, deliveryKey) {
  const db = new DatabaseSync(options.databasePath);
  try {
    return Number(db.prepare("SELECT COUNT(*) AS count FROM projections WHERE collection='records' AND key=?").get(deliveryKey).count);
  } finally {
    db.close();
  }
}

test("isolated project write: candidate stays in one worktree, Result Lane merges one pinned commit into the repo", async () => {
  const { root, repo, options } = fixture();
  const runtime = openHost({ ...options });
  try {
    const project = runtime.specialist("project");
    const before = countCommits(repo);
    const mainFiles = () => ["outline", "deliverable", "manifest"].map(
      (stepId) => projectStepPath(options.projectRoot, execution.projectId, 1, stepId),
    );

    const execution = await beginProject(runtime, "om_ws_happy", "新建项目：隔离写入并合回");
    assert.equal(execution.workspace.isolated, true);
    assert.equal(execution.workspace.state, "prepared");
    assert.ok(execution.workspace.directory.startsWith(options.worktreeRoot), execution.workspace.directory);
    assert.equal(execution.writeRoot, path.join(execution.workspace.directory, PROJECT_DIR));
    assert.notEqual(path.resolve(execution.writeRoot), path.resolve(options.projectRoot));
    assert.equal(worktreePaths(repo).length, 2);
    assert.equal(existsSync(execution.writeRoot), true);
    for (const file of mainFiles()) assert.equal(existsSync(file), false, `验收前主仓不应存在 ${file}`);

    writeCandidates(project, execution);

    // Worker candidates exist only in the isolated worktree; the repository is still clean.
    for (const stepId of ["outline", "deliverable", "manifest"]) {
      const candidate = projectStepPath(execution.writeRoot, execution.projectId, 1, stepId);
      assert.equal(existsSync(candidate), true, `候选缺失：${stepId}`);
      assert.equal(existsSync(projectStepPath(options.projectRoot, execution.projectId, 1, stepId)), false);
    }
    assert.equal(git(repo, "status", "--porcelain", "--", "vault/04-Projects"), "");
    assert.equal(countCommits(repo), before);
    assert.equal(project.trace(execution.taskId).deliveryState, null);

    const trace = await project.complete(execution);
    assert.equal(trace.taskState, "completed");
    assert.equal(trace.attemptState, "done");
    assert.equal(trace.deliveryState, "queued");
    assert.equal(trace.workspaceState, "merged");
    assert.match(trace.workspaceCommit, /^[a-f0-9]{40}$/u);
    assert.match(trace.mergeCommit, /^[a-f0-9]{40}$/u);
    assert.equal(git(repo, "merge-base", "--is-ancestor", trace.workspaceCommit, "HEAD") === "", true);

    // Exactly one candidate commit plus one merge commit, and every merged byte matches the Task/Attempt/Context.
    assert.equal(countCommits(repo), before + 2);
    assert.equal(countMerges(repo), 1);
    assert.equal(git(repo, "rev-parse", `${trace.mergeCommit}^2`), trace.workspaceCommit);
    const manifestFile = projectStepPath(options.projectRoot, execution.projectId, 1, "manifest");
    const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
    assert.equal(manifest.projectId, execution.projectId);
    assert.equal(manifest.planVersion, execution.planVersion);
    assert.equal(manifest.inputSha256, execution.inputSha256);
    assert.equal(manifest.action, "new");
    assert.equal(manifest.goal, "隔离写入并合回");
    for (const step of manifest.steps) {
      assert.equal(step.taskId, execution.taskId);
      assert.equal(step.attemptId, execution.attemptId);
      assert.equal(step.runId, execution.runId);
      assert.equal(step.runAttempt, execution.runAttempt);
      assert.equal(step.path, projectStepRelativePath(execution.projectId, execution.planVersion, step.id));
    }
    for (const step of trace.steps) {
      assert.equal(step.state, "completed");
      assert.equal(fileSha(projectStepPath(options.projectRoot, execution.projectId, 1, step.stepId)), step.sha256);
    }
    assert.equal(readFileSync(path.join(options.projectRoot, `${execution.projectId}/v1/deliverable.md`), "utf8"), "WORKSPACE-BODY");
    assert.equal(trace.fileVersion, fileSha(manifestFile));

    const index = project.index(execution.projectId);
    assert.equal(index.latestVersion, 1);
    assert.equal(index.versions[0].taskId, execution.taskId);
    assert.equal(index.versions[0].attemptId, execution.attemptId);
    assert.equal(index.versions[0].manifestSha256, trace.fileVersion);
    assert.equal(index.versions[0].workspace.commit, trace.workspaceCommit);
    assert.equal(index.versions[0].workspace.mergeCommit, trace.mergeCommit);

    // The worktree is released after the merge; the repository is the only remaining copy.
    assert.equal(existsSync(execution.workspace.directory), false);
    assert.equal(git(repo, "branch", "--list", execution.workspace.branch), "");
    assert.equal(worktreePaths(repo).length, 1);
    assert.equal(deliveryCount(options, execution.deliveryKey), 1);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("two projects keep separate worktrees, lanes and versions until each Result Lane merges its own commit", async () => {
  const { root, repo, options } = fixture();
  const runtime = openHost(options);
  try {
    const project = runtime.specialist("project");
    const alpha = await beginProject(runtime, "om_ws_two_a", "新建项目：并行对象甲");
    const beta = await beginProject(runtime, "om_ws_two_b", "新建项目：并行对象乙");
    assert.notEqual(alpha.contextId, beta.contextId);
    assert.notEqual(alpha.projectId, beta.projectId);
    assert.notEqual(alpha.workspace.directory, beta.workspace.directory);
    assert.notEqual(alpha.workspace.branch, beta.workspace.branch);
    assert.notEqual(alpha.writeRoot, beta.writeRoot);

    writeCandidates(project, alpha, { outline: "ALPHA-OUTLINE", deliverable: "ALPHA-BODY" });
    writeCandidates(project, beta, { outline: "BETA-OUTLINE", deliverable: "BETA-BODY" });
    assert.equal(existsSync(projectStepPath(options.projectRoot, alpha.projectId, 1, "deliverable")), false);
    assert.equal(existsSync(projectStepPath(options.projectRoot, beta.projectId, 1, "deliverable")), false);

    const alphaTrace = await project.complete(alpha);
    assert.equal(alphaTrace.taskState, "completed");
    assert.equal(existsSync(projectStepPath(options.projectRoot, alpha.projectId, 1, "deliverable")), true);
    assert.equal(existsSync(projectStepPath(options.projectRoot, beta.projectId, 1, "deliverable")), false);
    assert.equal(project.trace(beta.taskId).taskState, "running");
    assert.equal(project.trace(beta.taskId).deliveryState, null);

    const betaTrace = await project.complete(beta);
    assert.equal(betaTrace.taskState, "completed");
    assert.notEqual(betaTrace.workspaceCommit, alphaTrace.workspaceCommit);
    assert.notEqual(betaTrace.mergeCommit, alphaTrace.mergeCommit);
    assert.match(readFileSync(projectStepPath(options.projectRoot, alpha.projectId, 1, "deliverable"), "utf8"), /ALPHA-BODY/u);
    assert.doesNotMatch(readFileSync(projectStepPath(options.projectRoot, alpha.projectId, 1, "deliverable"), "utf8"), /BETA-BODY/u);
    assert.match(readFileSync(projectStepPath(options.projectRoot, beta.projectId, 1, "deliverable"), "utf8"), /BETA-BODY/u);
    assert.doesNotMatch(readFileSync(projectStepPath(options.projectRoot, beta.projectId, 1, "deliverable"), "utf8"), /ALPHA-BODY/u);
    assert.equal(project.index(alpha.projectId).latestVersion, 1);
    assert.equal(project.index(beta.projectId).latestVersion, 1);
    assert.equal(countMerges(repo), 2);
    assert.equal(worktreePaths(repo).length, 1);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("same-message recovery reuses the persisted workspace, the Task/Attempt and the merge", async () => {
  const { root, repo, options } = fixture();
  let runtime = openHost({ ...options });
  try {
    const project = runtime.specialist("project");
    const first = await beginProject(runtime, "om_ws_recover", "新建项目：恢复不重复建树");
    project.writeStep(first, "outline", "RECOVER-OUTLINE");
    project.completeStep(first, "outline");
    const worktrees = worktreePaths(repo);
    assert.equal(worktrees.length, 2);

    // Simulated Host restart before the Worker finished: the same message must adopt the same workspace.
    runtime.close();
    runtime = openHost({ ...options });
    const recovered = await beginProject(runtime, "om_ws_recover", "新建项目：恢复不重复建树");
    assert.equal(recovered.taskId, first.taskId);
    assert.equal(recovered.attemptId, first.attemptId);
    assert.equal(recovered.runId, first.runId);
    assert.equal(recovered.planVersion, first.planVersion);
    assert.equal(recovered.workspace.directory, first.workspace.directory);
    assert.equal(recovered.workspace.branch, first.workspace.branch);
    assert.equal(recovered.workspace.state, "prepared");
    assert.deepEqual(worktreePaths(repo), worktrees);

    const projectRestarted = runtime.specialist("project");
    assert.equal(projectRestarted.writeStep(recovered, "outline", "RECOVER-OUTLINE").sha256, sha256("RECOVER-OUTLINE"));
    projectRestarted.completeStep(recovered, "outline");
    projectRestarted.writeStep(recovered, "deliverable", "RECOVER-BODY");
    projectRestarted.completeStep(recovered, "deliverable");
    projectRestarted.writeManifest(recovered);
    projectRestarted.completeStep(recovered, "manifest");
    const settled = await projectRestarted.complete(recovered);
    assert.equal(settled.taskState, "completed");
    assert.equal(settled.workspaceState, "merged");
    const afterSettle = { facts: runtime.factCount(), head: git(repo, "rev-parse", "HEAD"), merges: countMerges(repo) };
    assert.equal(afterSettle.merges, 1);
    assert.equal(fileSha(projectStepPath(options.projectRoot, recovered.projectId, 1, "manifest")), settled.fileVersion);

    // A completed message replay is inert: no new worktree, no Task/Attempt change, no second merge.
    const replay = await beginProject(runtime, "om_ws_recover", "新建项目：恢复不重复建树");
    assert.equal(replay.state, "completed");
    assert.equal(replay.attemptId, settled.attemptId);
    assert.equal(replay.runId, recovered.runId);
    assert.equal(replay.workspace.directory, first.workspace.directory);
    assert.equal(projectRestarted.workspace(replay.taskId).state, "merged");
    const again = await projectRestarted.complete(replay);
    assert.equal(again.taskState, "completed");
    assert.equal(runtime.factCount(), afterSettle.facts);
    assert.equal(git(repo, "rev-parse", "HEAD"), afterSettle.head);
    assert.equal(countMerges(repo), 1);
    assert.equal(worktreePaths(repo).length, 1);
    assert.equal(deliveryCount(options, settled.deliveryKey), 1);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a crash after the Result-Lane commit resumes the persisted commit and merges exactly once", async () => {
  const { root, repo, options } = fixture();
  const runtimeUrl = new URL("../experiments/superagent-p0/native-butler-runtime.mjs", import.meta.url).href;
  const guardUrl = new URL("../packages/syno-core/git-guard.mjs", import.meta.url).href;
  const workspaceUrl = new URL("../packages/syno-core/task-workspace.mjs", import.meta.url).href;
  const script = `
    import { openNativeButlerRuntime } from ${JSON.stringify(runtimeUrl)};
    import { GitGuard } from ${JSON.stringify(guardUrl)};
    import { TaskWorkspaceManager } from ${JSON.stringify(workspaceUrl)};
    const options = ${JSON.stringify(options)};
    class CrashAfterCommit extends TaskWorkspaceManager {
      async finalize() { process.exit(92); }
    }
    const manager = new CrashAfterCommit({
      gitGuard: new GitGuard({ repoRoot: options.repoRoot, worktreeRoot: options.worktreeRoot }),
      sharedRoot: options.repoRoot,
      worktreeRoot: options.worktreeRoot,
    });
    const runtime = openNativeButlerRuntime({ ...options, projectWorkspaceManager: manager });
    const routed = runtime.route("新建项目：提交后崩溃恢复");
    const project = runtime.specialist("project");
    const execution = await project.begin({
      appId: "cli_test", messageId: "om_ws_commit_crash", chatId: "oc_test", ownerId: "ou_test",
      action: routed.action, goal: routed.goal, worker: "OpenCode",
    });
    for (const [stepId, body] of [["outline", "COMMIT-CRASH-OUTLINE"], ["deliverable", "COMMIT-CRASH-BODY"]]) {
      project.writeStep(execution, stepId, body);
      project.completeStep(execution, stepId);
    }
    project.writeManifest(execution);
    project.completeStep(execution, "manifest");
    await project.complete(execution);
    throw new Error("crash injection did not fire");
  `;
  try {
    const crashed = spawnSync(process.execPath, ["--disable-warning=ExperimentalWarning", "--input-type=module", "-e", script], { encoding: "utf8" });
    assert.equal(crashed.status, 92, crashed.stderr);

    const runtime = openHost(options);
    try {
      const project = runtime.specialist("project");
      const before = countCommits(repo);
      const recovered = await beginProject(runtime, "om_ws_commit_crash", "新建项目：提交后崩溃恢复");
      const workspace = project.workspace(recovered.taskId);
      assert.equal(workspace.state, "committed");
      assert.match(workspace.commit, /^[a-f0-9]{40}$/u);
      assert.equal(Number(git(repo, "rev-list", "--count", workspace.commit)), before + 1);
      assert.equal(git(repo, "worktree", "list", "--porcelain").includes(workspace.branch), true);
      assert.equal(existsSync(projectStepPath(options.projectRoot, recovered.projectId, 1, "manifest")), false);

      const trace = await project.complete(recovered);
      assert.equal(trace.taskState, "completed");
      assert.equal(trace.workspaceState, "merged");
      assert.equal(trace.workspaceCommit, workspace.commit);
      assert.equal(countCommits(repo), before + 2);
      assert.equal(countMerges(repo), 1);
      assert.equal(existsSync(projectStepPath(options.projectRoot, recovered.projectId, 1, "manifest")), true);
      assert.equal(worktreePaths(repo).length, 1);
    } finally {
      runtime.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("unverified candidates, out-of-scope worktree paths and stale versions never merge", async () => {
  const { root, repo, options } = fixture();
  const runtime = openHost({ ...options });
  try {
    const project = runtime.specialist("project");

    // 1. Missing manifest / unverified steps.
    const unverified = await beginProject(runtime, "om_ws_unverified", "新建项目：未验收不得合并");
    project.writeStep(unverified, "outline", "UNVERIFIED-OUTLINE");
    project.completeStep(unverified, "outline");
    await assert.rejects(async () => project.complete(unverified), /步骤未完成|缺少步骤记录/u);
    assert.equal(existsSync(projectStepPath(options.projectRoot, unverified.projectId, 1, "outline")), false);
    assert.equal(project.trace(unverified.taskId).workspaceState, "prepared");
    assert.equal(deliveryCount(options, unverified.deliveryKey), 0);

    // 2. A candidate that writes outside the declared three paths must not be committed or merged.
    const escaped = await beginProject(runtime, "om_ws_escape", "新建项目：越界候选不得合并");
    writeCandidates(project, escaped);
    writeFileSync(path.join(escaped.writeRoot, "smuggled.md"), "out of plan\n");
    await assert.rejects(() => project.complete(escaped), /未声明路径/u);
    assert.equal(existsSync(projectStepPath(options.projectRoot, escaped.projectId, 1, "outline")), false);
    assert.equal(git(repo, "status", "--porcelain", "--", "vault/04-Projects"), "");
    assert.equal(project.trace(escaped.taskId).taskState, "running");
    assert.equal(project.trace(escaped.taskId).workspaceState, "prepared");

    // 3. Wrong plan version / Attempt on the execution record.
    const mismatched = await beginProject(runtime, "om_ws_version", "新建项目：版本不一致不得合并");
    writeCandidates(project, mismatched);
    await assert.rejects(async () => project.complete({ ...mismatched, planVersion: 2 }), /计划版本已过期/u);
    await assert.rejects(
      async () => project.complete({ ...mismatched, attemptId: "attempt-forged" }),
      /执行记录 Attempt 不是当前 Attempt/u,
    );
    assert.equal(existsSync(projectStepPath(options.projectRoot, mismatched.projectId, 1, "manifest")), false);
    assert.equal(existsSync(projectStepPath(options.projectRoot, escaped.projectId, 1, "manifest")), false);
    assert.equal(git(repo, "status", "--porcelain", "--", "vault/04-Projects"), "");
    assert.equal(countMerges(repo), 0);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("TaskWorkspaceManager rejects a branch changed after pinning and never merges undeclared paths", async () => {
  const { root, repo } = fixture();
  const guard = new GitGuard({ repoRoot: repo, worktreeRoot: path.join(root, "worktrees") });
  const manager = new TaskWorkspaceManager({ gitGuard: guard, sharedRoot: repo, worktreeRoot: path.join(root, "worktrees") });
  try {
    const declared = `${PROJECT_DIR}/project-0123456789abcdef/v1/outline.md`;
    const workspace = await manager.prepare({ taskId: "pin-guard", kind: "code_change", writePaths: [declared] });
    mkdirSync(path.dirname(path.join(workspace.directory, declared)), { recursive: true });
    writeFileSync(path.join(workspace.directory, declared), "PINNED\n");
    const pinned = await manager.commit(workspace, { paths: [declared], message: "candidate" });
    assert.match(pinned.commit, /^[a-f0-9]{40}$/u);

    // Anything dirty outside the declared set blocks the commit entirely.
    writeFileSync(path.join(workspace.directory, `${PROJECT_DIR}/project-0123456789abcdef/v1/extra.md`), "x\n");
    await assert.rejects(
      () => manager.commit(workspace, { paths: [declared], message: "candidate" }),
      /未声明路径/u,
    );
    rmSync(path.join(workspace.directory, `${PROJECT_DIR}/project-0123456789abcdef/v1/extra.md`));

    // The branch moves after proof: the pinned commit is no longer acceptable.
    writeFileSync(path.join(workspace.directory, `${PROJECT_DIR}/project-0123456789abcdef/v1/deliverable.md`), "LATE\n");
    git(workspace.directory, "add", "--", `${PROJECT_DIR}/project-0123456789abcdef/v1/deliverable.md`);
    git(workspace.directory, "commit", "-m", "late change");
    await assert.rejects(
      () => manager.finalize(workspace, { merge: true, commit: pinned.commit, diffHash: pinned.diffHash }),
      /审批后发生变化/u,
    );
    assert.equal(existsSync(path.join(repo, declared)), false);
    await manager.discard(workspace).catch(() => {});
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a crash after worktree creation but before its record adopts the same task-derived tree", async () => {
  const { root, repo, options } = fixture();
  const taskId = "task-om_ws_prepare_crash";
  const expected = expectedWorkspace(options, taskId);
  const script = `
    import { openNativeButlerRuntime } from ${JSON.stringify(RUNTIME_URL)};
    import { GitGuard } from ${JSON.stringify(GUARD_URL)};
    import { TaskWorkspaceManager } from ${JSON.stringify(WORKSPACE_URL)};
    const options = ${JSON.stringify(options)};
    class CrashAfterPrepare extends TaskWorkspaceManager {
      async prepare(input) { await super.prepare(input); process.exit(91); }
    }
    const manager = new CrashAfterPrepare({
      gitGuard: new GitGuard({ repoRoot: options.repoRoot, worktreeRoot: options.worktreeRoot }),
      sharedRoot: options.repoRoot,
      worktreeRoot: options.worktreeRoot,
    });
    const runtime = openNativeButlerRuntime({ ...options, projectWorkspaceManager: manager });
    const routed = runtime.route("新建项目：建树后崩溃恢复");
    await runtime.specialist("project").begin({
      appId: "cli_test", messageId: "om_ws_prepare_crash", chatId: "oc_test", ownerId: "ou_test",
      action: routed.action, goal: routed.goal, worker: "OpenCode",
    });
    throw new Error("crash injection did not fire");
  `;
  try {
    const crashed = runChild(script);
    assert.equal(crashed.status, 91, crashed.stderr);
    // Exactly the prepared tree exists; its identity was never persisted.
    assert.equal(existsSync(expected.directory), true);
    assert.equal(git(repo, "branch", "--list", expected.branch).includes(expected.branch), true);
    assert.equal(worktreePaths(repo).length, 2);
    const inspector = openHost(options);
    try {
      assert.equal(inspector.specialist("project").workspace(taskId), null);
    } finally {
      inspector.close();
    }

    const runtime = openHost(options);
    try {
      const project = runtime.specialist("project");
      const recovered = await beginProject(runtime, "om_ws_prepare_crash", "新建项目：建树后崩溃恢复");
      assert.equal(recovered.taskId, taskId);
      assert.equal(recovered.workspace.directory, path.resolve(expected.directory));
      assert.equal(recovered.workspace.branch, expected.branch);
      assert.equal(recovered.workspace.state, "prepared");
      // Adoption reuses the existing tree: never a second worktree or branch.
      assert.equal(worktreePaths(repo).length, 2);
      assert.equal(git(repo, "branch", "--list", expected.branch).trim().split(/\r?\n/u).length, 1);

      writeCandidates(project, recovered);
      const trace = await project.complete(recovered);
      assert.equal(trace.taskState, "completed");
      assert.equal(trace.workspaceState, "merged");
      assert.equal(countMerges(repo), 1);
      assert.equal(worktreePaths(repo).length, 1);
      assert.equal(existsSync(projectStepPath(options.projectRoot, recovered.projectId, 1, "manifest")), true);
    } finally {
      runtime.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("adoption refuses a dirty task workspace instead of reusing it or creating a second one", async () => {
  const { root, repo, options } = fixture();
  const taskId = "task-om_ws_adopt_dirty";
  const expected = expectedWorkspace(options, taskId);
  const script = `
    import { openNativeButlerRuntime } from ${JSON.stringify(RUNTIME_URL)};
    import { GitGuard } from ${JSON.stringify(GUARD_URL)};
    import { TaskWorkspaceManager } from ${JSON.stringify(WORKSPACE_URL)};
    const options = ${JSON.stringify(options)};
    class CrashAfterPrepare extends TaskWorkspaceManager {
      async prepare(input) { await super.prepare(input); process.exit(92); }
    }
    const manager = new CrashAfterPrepare({
      gitGuard: new GitGuard({ repoRoot: options.repoRoot, worktreeRoot: options.worktreeRoot }),
      sharedRoot: options.repoRoot,
      worktreeRoot: options.worktreeRoot,
    });
    const runtime = openNativeButlerRuntime({ ...options, projectWorkspaceManager: manager });
    const routed = runtime.route("新建项目：脏工作区不得复用");
    await runtime.specialist("project").begin({
      appId: "cli_test", messageId: "om_ws_adopt_dirty", chatId: "oc_test", ownerId: "ou_test",
      action: routed.action, goal: routed.goal, worker: "OpenCode",
    });
    throw new Error("crash injection did not fire");
  `;
  try {
    const crashed = runChild(script);
    assert.equal(crashed.status, 92, crashed.stderr);
    writeFileSync(path.join(expected.directory, PROJECT_DIR, "stray.md"), "undeclared\n");

    const runtime = openHost(options);
    try {
      await assert.rejects(
        () => beginProject(runtime, "om_ws_adopt_dirty", "新建项目：脏工作区不得复用"),
        /未对账改动|拒绝 adopt/u,
      );
      assert.equal(worktreePaths(repo).length, 2);
      assert.equal(runtime.specialist("project").workspace(taskId), null);
    } finally {
      runtime.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("adoption refuses a directory whose branch identity changed and never forks a second worktree", async () => {
  const { root, repo, options } = fixture();
  const taskId = "task-om_ws_adopt_identity";
  const expected = expectedWorkspace(options, taskId);
  const script = `
    import { openNativeButlerRuntime } from ${JSON.stringify(RUNTIME_URL)};
    import { GitGuard } from ${JSON.stringify(GUARD_URL)};
    import { TaskWorkspaceManager } from ${JSON.stringify(WORKSPACE_URL)};
    const options = ${JSON.stringify(options)};
    class CrashAfterPrepare extends TaskWorkspaceManager {
      async prepare(input) { await super.prepare(input); process.exit(93); }
    }
    const manager = new CrashAfterPrepare({
      gitGuard: new GitGuard({ repoRoot: options.repoRoot, worktreeRoot: options.worktreeRoot }),
      sharedRoot: options.repoRoot,
      worktreeRoot: options.worktreeRoot,
    });
    const runtime = openNativeButlerRuntime({ ...options, projectWorkspaceManager: manager });
    const routed = runtime.route("新建项目：身份变化不得复用");
    await runtime.specialist("project").begin({
      appId: "cli_test", messageId: "om_ws_adopt_identity", chatId: "oc_test", ownerId: "ou_test",
      action: routed.action, goal: routed.goal, worker: "OpenCode",
    });
    throw new Error("crash injection did not fire");
  `;
  try {
    const crashed = runChild(script);
    assert.equal(crashed.status, 93, crashed.stderr);
    git(repo, "worktree", "remove", "--force", expected.directory);
    git(repo, "branch", "-D", expected.branch);
    git(repo, "worktree", "add", "--detach", expected.directory, "main");

    const runtime = openHost(options);
    try {
      await assert.rejects(
        () => beginProject(runtime, "om_ws_adopt_identity", "新建项目：身份变化不得复用"),
        /身份不一致|拒绝 adopt/u,
      );
      assert.equal(worktreePaths(repo).length, 2);
      assert.equal(runtime.specialist("project").workspace(taskId), null);
    } finally {
      runtime.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a crash after the merge but before settlement reconciles by ancestry and records the real merge commit", async () => {
  const { root, repo, options } = fixture();
  const script = `
    import { openNativeButlerRuntime } from ${JSON.stringify(RUNTIME_URL)};
    import { GitGuard } from ${JSON.stringify(GUARD_URL)};
    import { TaskWorkspaceManager } from ${JSON.stringify(WORKSPACE_URL)};
    const options = ${JSON.stringify(options)};
    class CrashAfterMerge extends TaskWorkspaceManager {
      async finalize(workspace, input) { await super.finalize(workspace, input); process.exit(94); }
    }
    const manager = new CrashAfterMerge({
      gitGuard: new GitGuard({ repoRoot: options.repoRoot, worktreeRoot: options.worktreeRoot }),
      sharedRoot: options.repoRoot,
      worktreeRoot: options.worktreeRoot,
    });
    const runtime = openNativeButlerRuntime({ ...options, projectWorkspaceManager: manager });
    const routed = runtime.route("新建项目：合并后崩溃恢复");
    const project = runtime.specialist("project");
    const execution = await project.begin({
      appId: "cli_test", messageId: "om_ws_merge_crash", chatId: "oc_test", ownerId: "ou_test",
      action: routed.action, goal: routed.goal, worker: "OpenCode",
    });
    for (const [stepId, body] of [["outline", "MERGE-CRASH-OUTLINE"], ["deliverable", "MERGE-CRASH-BODY"]]) {
      project.writeStep(execution, stepId, body);
      project.completeStep(execution, stepId);
    }
    project.writeManifest(execution);
    project.completeStep(execution, "manifest");
    await project.complete(execution);
    throw new Error("crash injection did not fire");
  `;
  try {
    const crashed = runChild(script);
    assert.equal(crashed.status, 94, crashed.stderr);
    assert.equal(countMerges(repo), 1);

    const runtime = openHost(options);
    try {
      const project = runtime.specialist("project");
      const recovered = await beginProject(runtime, "om_ws_merge_crash", "新建项目：合并后崩溃恢复");
      const workspace = project.workspace(recovered.taskId);
      assert.equal(workspace.state, "committed");
      assert.match(workspace.commit, /^[a-f0-9]{40}$/u);
      assert.equal(git(repo, "merge-base", "--is-ancestor", workspace.commit, "HEAD") === "", true);
      const beforeMerge = git(repo, "log", "--merges", "--format=%H %P", "-1", "HEAD").split(/\s+/u);
      assert.equal(beforeMerge[2], workspace.commit);
      assert.equal(beforeMerge[0], git(repo, "rev-parse", "HEAD"));

      // Another, unrelated merge lands before recovery: HEAD must never be mistaken for this Task's merge.
      git(repo, "checkout", "-b", "side");
      mkdirSync(path.join(repo, "ops"), { recursive: true });
      writeFileSync(path.join(repo, "ops", "side.txt"), "side\n");
      git(repo, "add", "--", "ops/side.txt");
      git(repo, "commit", "-m", "side change");
      git(repo, "checkout", "main");
      git(repo, "merge", "--no-ff", "side", "-m", "side merge");
      assert.equal(countMerges(repo), 2);
      const headBeforeRecovery = git(repo, "rev-parse", "HEAD");
      assert.notEqual(headBeforeRecovery, beforeMerge[0]);

      const trace = await project.complete(recovered);
      assert.equal(trace.taskState, "completed");
      assert.equal(trace.workspaceState, "merged");
      assert.equal(trace.mergeCommit, beforeMerge[0]);
      assert.notEqual(trace.mergeCommit, headBeforeRecovery);
      // No duplicate merge, one settlement, normal delivery.
      assert.equal(countMerges(repo), 2);
      assert.equal(trace.deliveryState, "queued");
      assert.equal(deliveryCount(options, trace.deliveryKey), 1);
      assert.equal(worktreePaths(repo).length, 1);
    } finally {
      runtime.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a crash after the merged record settles exactly once without re-merging", async () => {
  const { root, repo, options } = fixture();
  const script = `
    import { openNativeButlerRuntime } from ${JSON.stringify(RUNTIME_URL)};
    import { GitGuard } from ${JSON.stringify(GUARD_URL)};
    import { TaskWorkspaceManager } from ${JSON.stringify(WORKSPACE_URL)};
    const options = ${JSON.stringify(options)};
    class CrashAfterMergedRecord extends TaskWorkspaceManager {
      async discard() { process.exit(95); }
    }
    const manager = new CrashAfterMergedRecord({
      gitGuard: new GitGuard({ repoRoot: options.repoRoot, worktreeRoot: options.worktreeRoot }),
      sharedRoot: options.repoRoot,
      worktreeRoot: options.worktreeRoot,
    });
    const runtime = openNativeButlerRuntime({ ...options, projectWorkspaceManager: manager });
    const routed = runtime.route("新建项目：已合并未结算恢复");
    const project = runtime.specialist("project");
    const execution = await project.begin({
      appId: "cli_test", messageId: "om_ws_merged_crash", chatId: "oc_test", ownerId: "ou_test",
      action: routed.action, goal: routed.goal, worker: "OpenCode",
    });
    for (const [stepId, body] of [["outline", "MERGED-CRASH-OUTLINE"], ["deliverable", "MERGED-CRASH-BODY"]]) {
      project.writeStep(execution, stepId, body);
      project.completeStep(execution, stepId);
    }
    project.writeManifest(execution);
    project.completeStep(execution, "manifest");
    await project.complete(execution);
    throw new Error("crash injection did not fire");
  `;
  try {
    const crashed = runChild(script);
    assert.equal(crashed.status, 95, crashed.stderr);
    assert.equal(countMerges(repo), 1);

    const runtime = openHost(options);
    try {
      const project = runtime.specialist("project");
      const recovered = await beginProject(runtime, "om_ws_merged_crash", "新建项目：已合并未结算恢复");
      assert.equal(recovered.state, "running");
      const workspace = project.workspace(recovered.taskId);
      assert.equal(workspace.state, "merged");
      assert.match(workspace.mergeCommit, /^[a-f0-9]{40}$/u);
      const head = git(repo, "rev-parse", "HEAD");

      const trace = await project.complete(recovered);
      assert.equal(trace.taskState, "completed");
      assert.equal(trace.workspaceState, "merged");
      assert.equal(trace.mergeCommit, workspace.mergeCommit);
      assert.equal(trace.deliveryState, "queued");
      assert.equal(countMerges(repo), 1);
      assert.equal(git(repo, "rev-parse", "HEAD"), head);
      assert.equal(deliveryCount(options, trace.deliveryKey), 1);
      assert.equal(worktreePaths(repo).length, 1);
    } finally {
      runtime.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("merge evidence only accepts a unique real merge commit, never the current HEAD", async () => {
  const { root, repo } = fixture();
  const guard = new GitGuard({ repoRoot: repo, worktreeRoot: path.join(root, "worktrees") });
  const manager = new TaskWorkspaceManager({ gitGuard: guard, sharedRoot: repo, worktreeRoot: path.join(root, "worktrees") });
  try {
    const declared = `${PROJECT_DIR}/project-0123456789abcdef/v1/outline.md`;
    const workspace = await manager.prepare({ taskId: "merge-proof", kind: "code_change", writePaths: [declared] });
    mkdirSync(path.dirname(path.join(workspace.directory, declared)), { recursive: true });
    writeFileSync(path.join(workspace.directory, declared), "PROOF\n");
    const pinned = await manager.commit(workspace, { paths: [declared], message: "candidate" });
    const merged = await manager.finalize(workspace, { merge: true, commit: pinned.commit, diffHash: pinned.diffHash });
    assert.equal(await manager.mergeCommitFor(pinned.commit), merged.commit);

    // An unrelated commit moves HEAD; the real merge commit remains the only proof.
    mkdirSync(path.join(repo, "ops"), { recursive: true });
    writeFileSync(path.join(repo, "ops", "unrelated.txt"), "unrelated\n");
    git(repo, "add", "--", "ops/unrelated.txt");
    git(repo, "commit", "-m", "unrelated");
    assert.notEqual(git(repo, "rev-parse", "HEAD"), merged.commit);
    assert.equal(await manager.mergeCommitFor(pinned.commit), merged.commit);

    // Two different merges carrying the same second parent prove nothing.
    const head = git(repo, "rev-parse", "HEAD");
    const tree = git(repo, "rev-parse", "HEAD^{tree}");
    const ambiguous = execFileSync("git", ["commit-tree", tree, "-p", head, "-p", pinned.commit], { cwd: repo, encoding: "utf8" }).trim();
    git(repo, "update-ref", "refs/heads/main", ambiguous);
    assert.equal(await manager.mergeCommitFor(pinned.commit), null);
    await manager.discard(workspace).catch(() => {});
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("legacy standalone v1 stays a frozen read-only input while revision v2 is isolated and merged", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-project-legacy-"));
  const repo = gitRepository(root);
  const runtimeRoot = path.join(root, "runtime");
  const legacyRoot = path.join(runtimeRoot, "p3-project-artifacts");
  const sourcePath = path.join(root, "source.txt");
  writeFileSync(sourcePath, SOURCE);
  const base = {
    databasePath: path.join(runtimeRoot, "native.db"),
    vaultRoot: path.join(repo, "vault"),
    sourcePath,
    sourceUrl: "https://code.claude.com/docs/en/best-practices",
    indexFile: path.join(runtimeRoot, "knowledge-index.json"),
    resultRoot: path.join(root, "results"),
    ideaRoot: path.join(root, "ideas"),
    memoryRoot: path.join(root, "memory"),
  };
  let standalone;
  let isolated;
  try {
    // The pre-isolation version writes straight into the runtime artifact directory (no GitGuard, no worktree).
    standalone = openHost({ ...base, projectRoot: legacyRoot });
    const legacyExecutor = standalone.specialist("project");
    const first = await beginProject(standalone, "om_legacy_v1", "新建项目：旧版产物冻结");
    writeCandidates(legacyExecutor, first, { outline: "LEGACY-V1-OUTLINE", deliverable: "LEGACY-V1-BODY" });
    const firstTrace = await legacyExecutor.complete(first);
    assert.equal(firstTrace.taskState, "completed");
    const legacyV1 = Object.fromEntries(["outline", "deliverable", "manifest"].map((stepId) => [
      stepId,
      fileSha(projectStepPath(legacyRoot, first.projectId, 1, stepId)),
    ]));
    assert.equal(countMerges(repo), 0);
    standalone.close();
    standalone = null;

    isolated = openHost({
      ...base,
      projectRoot: path.join(repo, PROJECT_DIR),
      repoRoot: repo,
      worktreeRoot: path.join(root, "worktrees"),
      legacyProjectRoot: legacyRoot,
    });
    const project = isolated.specialist("project");
    const revision = await beginProject(isolated, "om_legacy_v2", `修订项目 ${first.projectId}：补风险`);
    assert.equal(revision.planVersion, 2);
    assert.equal(revision.frozen.planVersion, 1);
    assert.equal(revision.frozen.manifestSha256, legacyV1.manifest);
    assert.equal(revision.previousRoot, path.resolve(legacyRoot));
    assert.equal(revision.writeRoot, path.join(revision.workspace.directory, PROJECT_DIR));
    assert.notEqual(revision.writeRoot, revision.previousRoot);
    // The new candidate root never inherits the legacy version; the frozen previous is read separately.
    assert.equal(existsSync(projectStepPath(revision.writeRoot, first.projectId, 1, "manifest")), false);
    assert.deepEqual(
      readFrozenPrevious({ projectId: first.projectId, previous: revision.frozen }, revision.previousRoot).manifestSha256,
      legacyV1.manifest,
    );

    writeCandidates(project, revision, { outline: "LEGACY-V2-OUTLINE", deliverable: "LEGACY-V2-BODY" });
    assert.equal(existsSync(projectStepPath(revision.writeRoot, first.projectId, 2, "manifest")), true);
    assert.equal(existsSync(projectStepPath(path.join(repo, PROJECT_DIR), first.projectId, 2, "manifest")), false);

    const trace = await project.complete(revision);
    assert.equal(trace.taskState, "completed");
    assert.equal(trace.workspaceState, "merged");
    assert.equal(countMerges(repo), 1);
    // v2 is merged into the repository; v1 remains exactly where the standalone runtime left it.
    const manifest = JSON.parse(readFileSync(projectStepPath(path.join(repo, PROJECT_DIR), first.projectId, 2, "manifest"), "utf8"));
    assert.equal(manifest.action, "revise");
    assert.equal(manifest.previous.planVersion, 1);
    assert.equal(manifest.previous.manifestSha256, legacyV1.manifest);
    assert.equal(existsSync(projectStepPath(path.join(repo, PROJECT_DIR), first.projectId, 1, "manifest")), false);
    for (const [stepId, hash] of Object.entries(legacyV1)) {
      assert.equal(fileSha(projectStepPath(legacyRoot, first.projectId, 1, stepId)), hash, `旧版产物被改写：${stepId}`);
    }
    assert.equal(git(repo, "status", "--porcelain", "--", PROJECT_DIR), "");
  } finally {
    if (standalone) standalone.close();
    if (isolated) isolated.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("the auto-assembled GitGuard refuses to merge project artifacts outside main and recovers after checkout", async () => {
  const { root, repo, options } = fixture();
  git(repo, "checkout", "-b", "feature");
  const runtime = openHost(options);
  try {
    const project = runtime.specialist("project");
    const execution = await beginProject(runtime, "om_ws_product_branch", "新建项目：只合回主分支");
    writeCandidates(project, execution);
    await assert.rejects(() => project.complete(execution), /只允许在 main 分支的主检出/u);
    assert.equal(existsSync(projectStepPath(options.projectRoot, execution.projectId, 1, "manifest")), false);
    assert.equal(project.trace(execution.taskId).workspaceState, "committed");
    assert.equal(countMerges(repo), 0);

    // The pinned candidate is untouched; after the human restores the main check-out the same Task merges once.
    git(repo, "checkout", "main");
    const trace = await project.complete(execution);
    assert.equal(trace.taskState, "completed");
    assert.equal(trace.workspaceState, "merged");
    assert.equal(countMerges(repo), 1);
    assert.equal(existsSync(projectStepPath(options.projectRoot, execution.projectId, 1, "manifest")), true);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});
