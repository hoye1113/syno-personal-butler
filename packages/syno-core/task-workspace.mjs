import path from "node:path";

import { PATHS } from "./paths.mjs";

export const TASK_WORKSPACE_POLICIES = Object.freeze(["shared-readonly", "isolated-write"]);

const SAFE_TASK_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,80}$/u;

function taskError(code, message) {
  return Object.assign(new Error(message), { code });
}

/**
 * Normalize one routed task before any worker can touch a workspace.
 * Writes are isolated by default; read-only tasks share the knowledge root.
 */
export function normalizeTaskDescriptor(input = {}) {
  const taskId = String(input.taskId || "").trim();
  if (!SAFE_TASK_ID.test(taskId)) {
    throw taskError("TASK_ID_INVALID", "taskId 只允许字母、数字、点、下划线和短横线，且不能以符号开头");
  }
  const inferredWrite = input.write === true
    || input.kind === "code_change"
    || (Array.isArray(input.writePaths) && input.writePaths.length > 0);
  const policy = input.policy || (inferredWrite ? "isolated-write" : "shared-readonly");
  if (!TASK_WORKSPACE_POLICIES.includes(policy)) {
    throw taskError("TASK_WORKSPACE_POLICY_INVALID", `未知 workspace policy：${policy}`);
  }
  return Object.freeze({
    taskId,
    policy,
    ownerKey: String(input.ownerKey || "local-user"),
    threadKey: String(input.threadKey || "main"),
    kind: String(input.kind || "task"),
    writePaths: Object.freeze([...(input.writePaths || [])].map(String)),
  });
}

/**
 * Creates a task-scoped workspace. The manager deliberately delegates worktree
 * lifecycle to the existing GitGuard instead of implementing a second one.
 */
export class TaskWorkspaceManager {
  constructor({ gitGuard = null, sharedRoot = PATHS.knowledgeRoot, worktreeRoot = PATHS.worktreeRoot } = {}) {
    this.gitGuard = gitGuard;
    this.sharedRoot = path.resolve(sharedRoot);
    this.worktreeRoot = path.resolve(worktreeRoot);
    // 调用方（项目写路径）需要把逻辑写根映射进 worktree：以 GitGuard 的仓库为唯一基准，
    // 绝不把运行目录里的文件当成隔离写入。
    this.repoRoot = path.resolve(gitGuard?.repoRoot ?? sharedRoot);
  }

  async prepare(input) {
    const task = normalizeTaskDescriptor(input);
    if (task.policy === "shared-readonly") {
      return {
        task,
        policy: task.policy,
        isolated: false,
        directory: this.sharedRoot,
      };
    }
    if (!this.gitGuard) throw taskError("TASK_WORKSPACE_UNAVAILABLE", "该任务需要隔离 worktree，但未配置 GitGuard");
    let worktree;
    try {
      worktree = await this.gitGuard.prepareWorktree(task.taskId);
    } catch (error) {
      // Crash between worktree creation and persistence of its identity: the task-derived workspace already exists.
      // Adoption re-verifies branch/directory identity, pristine base and cleanliness; a stray or dirty tree refuses.
      if (error.code !== "GIT_GUARD_WORKTREE_EXISTS") throw error;
      worktree = await this.gitGuard.adoptWorktree(task.taskId);
    }
    return {
      task,
      policy: task.policy,
      isolated: true,
      directory: path.resolve(worktree.directory),
      branch: worktree.branch,
      base: worktree.base,
    };
  }

  async discard(workspace) {
    if (!workspace?.isolated) return { removed: false, reason: "shared-readonly" };
    if (!this.gitGuard) throw taskError("TASK_WORKSPACE_UNAVAILABLE", "未配置 GitGuard，无法清理 worktree");
    await this.gitGuard.removeWorktree({ directory: workspace.directory, branch: workspace.branch });
    return { removed: true };
  }

  /**
   * Result Lane seam: commit exactly the approved absolute-path set inside the
   * isolated worktree and return the pinned evidence. Any other dirty path in
   * the worktree means the candidate escaped the declared plan, so nothing is
   * committed and the caller cannot merge.
   */
  async commit(workspace, { paths = [], message, expectedPaths = paths } = {}) {
    if (!workspace?.isolated) throw taskError("TASK_WORKSPACE_NOT_ISOLATED", "只有隔离 worktree 才能提交候选");
    if (!this.gitGuard) throw taskError("TASK_WORKSPACE_UNAVAILABLE", "未配置 GitGuard，无法提交候选");
    const declared = [...new Set(paths.map((item) => String(item).replace(/\\/g, "/")))].sort();
    if (!declared.length) throw taskError("TASK_WORKSPACE_PATHS_REQUIRED", "提交候选前必须声明精确路径");
    const changed = (await this.gitGuard.changedPaths(workspace.directory))
      .map((item) => String(item).replace(/\\/g, "/"))
      .sort();
    const unexpected = changed.filter((item) => !declared.includes(item));
    if (unexpected.length) {
      throw taskError("TASK_WORKSPACE_UNEXPECTED_PATHS", `隔离 worktree 出现未声明路径，拒绝提交：${unexpected.join(", ")}`);
    }
    if (changed.length) await this.gitGuard.commitPaths(changed, message, workspace.directory);
    const pinned = await this.gitGuard.pinWorktree({ branch: workspace.branch, base: workspace.base });
    if (!pinned.commit) throw taskError("TASK_WORKSPACE_COMMIT_REQUIRED", "隔离 worktree 还没有可验收的 commit");
    const expected = [...new Set(expectedPaths.map((item) => String(item).replace(/\\/g, "/")))].sort();
    const actual = pinned.changes.map((change) => String(change.path).replace(/\\/g, "/")).sort();
    if (actual.join("\0") !== expected.join("\0")) {
      throw taskError("TASK_WORKSPACE_PATHS_MISMATCH", `隔离分支改动与验收路径不一致：${actual.join(", ")}`);
    }
    if (pinned.changes.some((change) => /[RCD]/u.test(change.status))) {
      throw taskError("TASK_WORKSPACE_PATHS_MISMATCH", "隔离分支不得包含重命名、复制或删除");
    }
    return pinned;
  }

  /** Recovery check: has this exact pinned commit already reached the main check-out? */
  async isMerged(workspace, commit) {
    if (!workspace?.isolated || !commit || !this.gitGuard) return false;
    return this.gitGuard.isAncestor(commit);
  }

  /** Recovery evidence: the real merge commit carrying this pinned commit, or null when it cannot be proved uniquely. */
  async mergeCommitFor(commit) {
    if (!this.gitGuard || !commit) return null;
    return this.gitGuard.findMergeCommit(commit);
  }

  /**
   * A write task must either be discarded or explicitly merged with a pinned
   * commit. There is no implicit merge of an untested worktree.
   */
  async finalize(workspace, { merge = false, commit = null, diffHash = null } = {}) {
    if (!workspace?.isolated) return { merged: false, removed: false, reason: "shared-readonly" };
    if (!merge) return this.discard(workspace);
    if (!commit) throw taskError("TASK_WORKSPACE_COMMIT_REQUIRED", "合并隔离 worktree 前必须提供已测试的 commit");
    if (!this.gitGuard) throw taskError("TASK_WORKSPACE_UNAVAILABLE", "未配置 GitGuard，无法合并 worktree");
    const result = await this.gitGuard.mergeWorktree({
      branch: workspace.branch,
      base: workspace.base,
      commit,
      ...(diffHash ? { diffHash } : {}),
    });
    return { ...result, removed: false };
  }
}
