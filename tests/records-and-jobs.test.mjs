import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";

import { AgentHost } from "../apps/syno/syno/agent-host.mjs";
import { FakeExecutor } from "../apps/syno/syno/executors.mjs";
import { JobStore } from "../apps/syno/syno/job-store.mjs";
import { parseRecord, serializeRecord } from "../apps/syno/syno/markdown-record.mjs";
import { PATHS } from "../apps/syno/syno/paths.mjs";

test("Markdown records round-trip without a database", () => {
  const input = { id: "example", status: "pending", tags: ["a", "b"], nested: { ok: true } };
  assert.deepEqual(parseRecord(serializeRecord(input)), input);
});

test("AgentHost enforces no-approval, single-approval and isolated merge states", async (t) => {
  const opsRoot = path.join(PATHS.runtimeRoot, "tests", `jobs-${Date.now()}`);
  t.after(() => fs.rm(opsRoot, { recursive: true, force: true }));
  const store = new JobStore({ opsRoot });
  const git = {
    commits: [], merges: [], removals: [],
    async changedPaths() { return []; },
    async commitPaths(paths, message) { this.commits.push({ paths, message }); return { committed: Boolean(paths.length) }; },
    async prepareWorktree(id) { return { branch: `syno/job/${id}`, directory: path.join(PATHS.runtimeRoot, "fake-worktree") }; },
    async branchDiff() { return "diff preview"; },
    async mergeWorktree(value) { this.merges.push(value); return { merged: true, commit: "merge-1" }; },
    async removeWorktree(value) { this.removals.push(value); },
  };
  const host = new AgentHost({ store, executor: new FakeExecutor(), gitGuard: git });

  const read = await host.receive({ intent: "search", text: "查找知识" });
  assert.equal(read.job.status, "completed");

  const idea = await host.receive({ intent: "create_content_idea", text: "创建选题" });
  assert.equal(idea.job.status, "awaiting_approval");
  const ideaDone = await host.approve(idea.job.id);
  assert.equal(ideaDone.job.status, "completed");

  const high = await host.receive({ intent: "delete", text: "删除一篇笔记" });
  assert.equal(high.job.approval, "double");
  assert.equal((await host.approve(high.job.id)).requiresApproval, true);
  const mergeWait = await host.approve(high.job.id);
  assert.equal(mergeWait.job.phase, "merge");
  assert.equal(mergeWait.job.status, "awaiting_approval");
  const merged = await host.approve(high.job.id);
  assert.equal(merged.job.status, "completed");
  assert.equal(git.merges.length, 1);
  assert.equal(git.removals.length, 1);
});

test("Weixin cannot approve high-risk or double-approval jobs", async (t) => {
  const opsRoot = path.join(PATHS.runtimeRoot, "tests", `weixin-approval-${Date.now()}`);
  t.after(() => fs.rm(opsRoot, { recursive: true, force: true }));
  const store = new JobStore({ opsRoot });
  const decision = { intent: "delete", profile: "syno-curate", approval: "double", risk: "high", allowedRoots: ["vault"], needsWorktree: true };
  const job = await store.create({ request: { text: "delete" }, decision, channel: "weixin", senderId: "owner" });
  await assert.rejects(store.approve(job, { channel: "weixin", senderId: "owner", code: job.approvalCode }), /微信只能批准/);
});
