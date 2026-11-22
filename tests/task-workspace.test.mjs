import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  TASK_WORKSPACE_POLICIES,
  TaskWorkspaceManager,
  normalizeTaskDescriptor,
} from "../packages/syno-core/task-workspace.mjs";

function fakeGitGuard() {
  const calls = [];
  return {
    calls,
    async prepareWorktree(taskId) {
      calls.push(["prepare", taskId]);
      return { branch: `syno/job/${taskId}`, directory: path.join("/tmp/.worktrees", `syno-job-${taskId}`), base: "base-1" };
    },
    async removeWorktree(value) { calls.push(["remove", value]); },
    async mergeWorktree(value) { calls.push(["merge", value]); return { merged: true, commit: "merged-1" }; },
  };
}

test("read-only tasks share the knowledge root and never create a worktree", async () => {
  const git = fakeGitGuard();
  const manager = new TaskWorkspaceManager({ gitGuard: git, sharedRoot: "/tmp/knowledge" });
  const workspace = await manager.prepare({ taskId: "read-1", ownerKey: "owner", threadKey: "main" });
  assert.equal(workspace.policy, "shared-readonly");
  assert.equal(workspace.isolated, false);
  assert.equal(workspace.directory, "/tmp/knowledge");
  assert.deepEqual(git.calls, []);
});

test("write tasks automatically get an isolated GitGuard worktree", async () => {
  const git = fakeGitGuard();
  const manager = new TaskWorkspaceManager({ gitGuard: git });
  const workspace = await manager.prepare({ taskId: "write-1", kind: "code_change" });
  assert.equal(workspace.policy, "isolated-write");
  assert.equal(workspace.isolated, true);
  assert.match(workspace.directory, /syno-job-write-1$/u);
  assert.deepEqual(git.calls, [["prepare", "write-1"]]);
});

test("explicit writePaths also isolate, while invalid policy or task id is rejected", () => {
  assert.equal(normalizeTaskDescriptor({ taskId: "t1", writePaths: ["src/a.mjs"] }).policy, "isolated-write");
  assert.throws(() => normalizeTaskDescriptor({ taskId: "t1", policy: "shared" }), /未知 workspace policy/u);
  assert.throws(() => normalizeTaskDescriptor({ taskId: "../escape" }), /taskId/u);
  assert.deepEqual([...TASK_WORKSPACE_POLICIES], ["shared-readonly", "isolated-write"]);
});

test("write worktrees are discarded explicitly or merged only with a pinned commit", async () => {
  const git = fakeGitGuard();
  const manager = new TaskWorkspaceManager({ gitGuard: git });
  const workspace = await manager.prepare({ taskId: "write-2", write: true });
  assert.deepEqual(await manager.discard(workspace), { removed: true });
  assert.equal(git.calls.at(-1)[0], "remove");
  await assert.rejects(() => manager.finalize(workspace, { merge: true }), /commit/u);
  const merged = await manager.finalize(workspace, { merge: true, commit: "abc123" });
  assert.equal(merged.merged, true);
  assert.deepEqual(git.calls.at(-1), ["merge", { branch: "syno/job/write-2", base: "base-1", commit: "abc123" }]);
});
