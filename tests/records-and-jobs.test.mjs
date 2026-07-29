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

test("AgentHost auto-executes read and write intents and audits high-risk diffs", async (t) => {
  const opsRoot = path.join(PATHS.runtimeRoot, "tests", `jobs-${Date.now()}`);
  t.after(() => fs.rm(opsRoot, { recursive: true, force: true }));
  const store = new JobStore({ opsRoot });
  assert.equal(store.payloadRoot.startsWith(path.dirname(opsRoot)), true);
  let currentChanges = [];
  const git = {
    commits: [], merges: [], removals: [],
    async changedPaths() { return []; },
    async changes() { return currentChanges; },
    async commitPaths(paths, message) { this.commits.push({ paths, message }); return { committed: Boolean(paths.length), commit: "work-1", paths }; },
    async prepareWorktree(id) { return { branch: `syno/job/${id}`, directory: path.join(PATHS.runtimeRoot, "fake-worktree"), base: "base-1" }; },
    async pinWorktree() { return { commit: "work-1", diffHash: "hash-1", preview: "diff preview", changes: currentChanges }; },
    async mergeWorktree(value) { this.merges.push(value); return { merged: true, commit: "merge-1" }; },
    async removeWorktree(value) { this.removals.push(value); },
  };
  const host = new AgentHost({
    store,
    executor: new FakeExecutor(),
    gitGuard: git,
    validator: async ({ changedPaths }) => ({ ok: true, changedPaths }),
  });
  assert.equal(host.processLockRoot.startsWith(path.dirname(opsRoot)), true);

  // 只读直接完成
  const read = await host.receive({ intent: "search", text: "查找知识" });
  assert.equal(read.job.status, "completed");

  // 普通写入默认自动执行（approval:none，不再 awaiting_approval）
  currentChanges = [{ status: "??", path: "ops/content/new.md", kind: "added" }];
  const idea = await host.receive({ intent: "create_content_idea", text: "创建选题" });
  assert.equal(idea.job.approval, "none");
  assert.equal(idea.job.status, "completed");

  // 高风险（delete）也默认自动执行：实际 diff 修改既有事实 → 仅审计后合并，不再二次审批
  currentChanges = [{ status: "D", path: "vault/old.md", kind: "existing" }];
  const high = await host.receive({ intent: "delete", text: "删除一篇笔记" });
  assert.equal(high.job.approval, "none");
  assert.equal(high.job.status, "completed");
  assert.equal(git.merges.length, 2);
  assert.equal(git.removals.length, 2);
});

test("bound channel clarification no longer requires a six-digit code across channels", async (t) => {
  const opsRoot = path.join(PATHS.runtimeRoot, "tests", `weixin-approval-${Date.now()}`);
  t.after(() => fs.rm(opsRoot, { recursive: true, force: true }));
  const store = new JobStore({ opsRoot });
  // 直接造一个 awaiting_approval 的澄清 Job（模拟系统歧义暂停；approval 字段保留兼容）
  const decision = { intent: "delete", profile: "syno-curate", approval: "single", risk: "high", allowed: true, allowedRoots: ["vault"], needsWorktree: true };
  const job = await store.create({ request: { text: "delete" }, decision, channel: "weixin", senderId: "owner" });
  // trust-but-clarify：weixin/feishu 与 web 同权限，已绑定 Owner 即可确认，不再校验六位码
  const approved = await store.approve(job, { channel: "weixin", senderId: "owner", code: "BAD999" });
  assert.equal(approved.ready, true);
});

test("failed auto-executed jobs remove their isolated worktree", async (t) => {
  const opsRoot = path.join(PATHS.runtimeRoot, "tests", `cleanup-${Date.now()}`);
  t.after(() => fs.rm(opsRoot, { recursive: true, force: true }));
  const store = new JobStore({ opsRoot });
  const removals = [];
  const git = {
    async changedPaths() { return []; },
    async commitPaths() { return { committed: false }; },
    async prepareWorktree(id) { return { branch: `syno/job/${id}`, directory: path.join(PATHS.runtimeRoot, "cleanup-worktree") }; },
    async removeWorktree(value) { removals.push(value); },
  };
  const executor = { async submit() { throw new Error("forced failure"); }, inspect() { return null; }, cancel() { return false; } };
  const host = new AgentHost({ store, executor, gitGuard: git });
  // delete 默认自动执行：receive 即触发 #execute，失败时清理 worktree
  const failed = await host.receive({ intent: "delete", text: "delete" });
  assert.equal(failed.job.status, "failed");
  assert.equal(failed.job.cleanup.removed, true);
  assert.equal(removals.length, 1);
});

test("reject and cancel persist their terminal audit records", async (t) => {
  const opsRoot = path.join(PATHS.runtimeRoot, "tests", `terminal-${Date.now()}`);
  t.after(() => fs.rm(opsRoot, { recursive: true, force: true }));
  const store = new JobStore({ opsRoot });
  const commits = [];
  const git = {
    async changedPaths() { return ["ops/jobs/2026/07/job.md", "ops/events/2026/07/event.md"]; },
    async commitPaths(paths, message) { commits.push({ paths, message }); return { committed: true }; },
  };
  const host = new AgentHost({ store, executor: new FakeExecutor(), gitGuard: git });
  // 写入现在自动执行，故直接用 store.create 造 awaiting_approval 澄清 Job 来测 reject/cancel
  const decision = { intent: "curate_note", profile: "syno-curate", approval: "single", risk: "low", allowed: true, allowedRoots: ["vault", "ops"], needsWorktree: true };
  const rejected = await store.create({ request: { text: "one" }, decision });
  await host.reject(rejected.id, "no");
  const canceled = await store.create({ request: { text: "two" }, decision });
  await host.cancel(canceled.id);
  assert.equal(commits.length, 2);
  assert.match(commits[0].message, /reject/);
  assert.match(commits[1].message, /cancel/);
});

test("running jobs publish runId early enough to be canceled safely", async (t) => {
  const opsRoot = path.join(PATHS.runtimeRoot, "tests", `cancel-running-${Date.now()}`);
  t.after(() => fs.rm(opsRoot, { recursive: true, force: true }));
  const store = new JobStore({ opsRoot });
  let rejectRun;
  let capturedJobId;
  const executor = {
    async submit(job, options) {
      capturedJobId = job.id;
      await options.onStart("run-cancel-me");
      return new Promise((_resolve, reject) => { rejectRun = reject; });
    },
    cancel(id) {
      if (id !== "run-cancel-me") return false;
      rejectRun(Object.assign(new Error("canceled"), { failureCode: "canceled" }));
      return true;
    },
    inspect() { return { status: "running" }; },
  };
  const git = {
    async changedPaths() { return []; },
    async commitPaths() { return { committed: false }; },
    async prepareWorktree(id) { return { branch: `syno/job/${id}`, directory: path.join(PATHS.runtimeRoot, "cancel-worktree"), base: "base" }; },
    async removeWorktree() {},
  };
  const host = new AgentHost({ store, executor, gitGuard: git });
  // create_action 默认自动执行：receive 即触发 #execute（不 await，让它在后台运行）
  const running = host.receive({ intent: "create_action", text: "cancel me" });
  for (let index = 0; index < 50; index += 1) {
    if (capturedJobId && (await host.inspect(capturedJobId))?.runId) break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const canceled = await host.cancel(capturedJobId);
  assert.equal(canceled.job.status, "canceled");
  assert.equal((await running).job.status, "canceled");
});

test("channel message request keys deduplicate retried jobs", async (t) => {
  const opsRoot = path.join(PATHS.runtimeRoot, "tests", `dedupe-${Date.now()}`);
  t.after(() => fs.rm(opsRoot, { recursive: true, force: true }));
  const store = new JobStore({ opsRoot });
  const git = { async changedPaths() { return []; }, async changes() { return []; }, async commitPaths() { return { committed: false }; } };
  const host = new AgentHost({ store, executor: new FakeExecutor(), gitGuard: git });
  const context = { channel: "weixin", senderId: "owner", messageId: "message-one" };
  const first = await host.receive({ intent: "search", text: "hello" }, context);
  const second = await host.receive({ intent: "search", text: "hello" }, context);
  assert.equal(second.deduplicated, true);
  assert.equal(second.job.id, first.job.id);
});

test("requesting a proposal modification invalidates the original approvable Job", async (t) => {
  const opsRoot = path.join(PATHS.runtimeRoot, "tests", `job-revision-${Date.now()}`);
  t.after(() => fs.rm(opsRoot, { recursive: true, force: true }));
  const store = new JobStore({ opsRoot });
  const job = await store.create({
    request: { intent: "curate_note", text: "收录原方案" },
    decision: {
      intent: "curate_note", allowed: true, approval: "single", risk: "low",
      profile: "syno-curate", needsWorktree: true, allowedRoots: ["vault", "ops"],
      validators: ["changed-paths", "ops-contracts", "markdown", "vault-contract"],
    },
  });
  const revised = await store.requestModification(job, "调整标题");
  assert.equal(revised.status, "canceled");
  assert.equal(revised.error.code, "PROPOSAL_REVISION_REQUESTED");
  await assert.rejects(store.approve(revised), /不等待审批/);
});

test("read-only channel jobs preserve unrelated developer changes", async (t) => {
  const opsRoot = path.join(PATHS.runtimeRoot, "tests", `dirty-read-${Date.now()}`);
  t.after(() => fs.rm(opsRoot, { recursive: true, force: true }));
  const store = new JobStore({ opsRoot });
  const commits = [];
  const git = {
    async changedPaths() { return ["apps/syno/public/syno.js"]; },
    async changes() { return [{ status: " M", path: "apps/syno/public/syno.js", kind: "existing" }]; },
    async commitPaths(paths) { commits.push(paths); return { committed: false }; },
  };
  const host = new AgentHost({ store, executor: new FakeExecutor(), gitGuard: git });

  const first = await host.receive({ intent: "chat", text: "first" }, { channel: "weixin", senderId: "owner", messageId: "dirty-1" });
  const second = await host.receive({ intent: "chat", text: "second" }, { channel: "weixin", senderId: "owner", messageId: "dirty-2" });

  assert.equal(first.job.status, "completed");
  assert.equal(second.job.status, "completed");
  assert.deepEqual(first.job.changedPaths, []);
  assert.deepEqual(second.job.changedPaths, []);
  assert.equal(commits.flat().includes("apps/syno/public/syno.js"), false);
});

test("read-only jobs reject mutations hidden behind an already-dirty path", async (t) => {
  const opsRoot = path.join(PATHS.runtimeRoot, "tests", `dirty-read-mutation-${Date.now()}`);
  t.after(() => fs.rm(opsRoot, { recursive: true, force: true }));
  const store = new JobStore({ opsRoot });
  let snapshots = 0;
  const git = {
    async changedPaths() { return ["apps/syno/public/syno.js"]; },
    async changeSnapshot() {
      snapshots += 1;
      return [{ status: " M", path: "apps/syno/public/syno.js", kind: "existing", fingerprint: snapshots === 1 ? "before" : "after" }];
    },
    async commitPaths() { return { committed: false }; },
  };
  const host = new AgentHost({ store, executor: new FakeExecutor(), gitGuard: git });

  const result = await host.receive({ intent: "chat", text: "must stay read-only" });

  assert.equal(result.job.status, "failed");
  assert.match(result.job.error.message, /只读 Profile 产生了文件变更/);
});

test("retryable Provider failures stay durable without switching executors", async (t) => {
  const opsRoot = path.join(PATHS.runtimeRoot, "tests", `provider-wait-${Date.now()}`);
  t.after(() => fs.rm(opsRoot, { recursive: true, force: true }));
  const store = new JobStore({ opsRoot });
  let attempts = 0;
  const executor = {
    async submit() {
      attempts += 1;
      if (attempts === 1) throw Object.assign(new Error("Provider 当前不可用"), { code: "PROVIDER_UNAVAILABLE", retryable: true });
      return { runId: "provider-retry", executor: "tool-loop-agent", text: "恢复完成" };
    },
    inspect() { return null; }, cancel() { return false; },
  };
  const git = { async changedPaths() { return []; }, async commitPaths() { return { committed: false }; } };
  const host = new AgentHost({ store, executor, gitGuard: git });
  const deferred = await host.receive({ intent: "search", text: "需要模型" });
  assert.equal(deferred.job.status, "waiting_provider");
  assert.equal(deferred.job.error.retryable, true);
  const recovery = await host.retryWaitingProvider({ now: new Date(Date.now() + 61_000) });
  assert.equal(recovery.length, 1);
  assert.equal(recovery[0].jobId, deferred.job.id);
  assert.equal(recovery[0].result.job.status, "completed");
  assert.equal(recovery[0].result.job.error, null);
  assert.equal(recovery[0].result.job.nextRetryAt, null);
  assert.equal(attempts, 2);
});

test("concurrent Provider retries acquire one execution lease", async (t) => {
  const opsRoot = path.join(PATHS.runtimeRoot, "tests", `provider-retry-lock-${Date.now()}`);
  t.after(() => fs.rm(opsRoot, { recursive: true, force: true }));
  const store = new JobStore({ opsRoot });
  let attempts = 0;
  let releaseRetry;
  const retryGate = new Promise((resolve) => { releaseRetry = resolve; });
  const executor = {
    async submit() {
      attempts += 1;
      if (attempts === 1) {
        throw Object.assign(new Error("Provider 当前不可用"), { code: "PROVIDER_UNAVAILABLE", retryable: true });
      }
      await retryGate;
      return { runId: "provider-retry-once", executor: "tool-loop-agent", text: "恢复完成" };
    },
    inspect() { return null; }, cancel() { return false; },
  };
  const git = { async changedPaths() { return []; }, async commitPaths() { return { committed: false }; } };
  const host = new AgentHost({ store, executor, gitGuard: git });
  const deferred = await host.receive({ intent: "search", text: "需要模型" });
  assert.equal(deferred.job.status, "waiting_provider");

  const first = host.retry(deferred.job.id);
  const second = host.retry(deferred.job.id);
  await assert.rejects(second, /当前不等待 Provider 重试/);
  releaseRetry();
  const recovered = await first;

  assert.equal(recovered.job.status, "completed");
  assert.equal(attempts, 2);
});
