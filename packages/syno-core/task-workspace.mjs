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
    const worktree = await this.gitGuard.prepareWorktree(task.taskId);
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
   * A write task must either be discarded or explicitly merged with a pinned
   * commit. There is no implicit merge of an untested worktree.
   */
  async finalize(workspace, { merge = false, commit = null } = {}) {
    if (!workspace?.isolated) return { merged: false, removed: false, reason: "shared-readonly" };
    if (!merge) return this.discard(workspace);
    if (!commit) throw taskError("TASK_WORKSPACE_COMMIT_REQUIRED", "合并隔离 worktree 前必须提供已测试的 commit");
    if (!this.gitGuard) throw taskError("TASK_WORKSPACE_UNAVAILABLE", "未配置 GitGuard，无法合并 worktree");
    const result = await this.gitGuard.mergeWorktree({
      branch: workspace.branch,
      base: workspace.base,
      commit,
    });
    return { ...result, removed: false };
  }
}
