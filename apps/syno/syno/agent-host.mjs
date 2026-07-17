import { evaluate } from "./policy.mjs";
import { PATHS } from "./paths.mjs";
import { validateRepositoryChange } from "./validator.mjs";

function isSystemPath(value) {
  const normalized = String(value).replace(/\\/g, "/");
  return normalized.startsWith("ops/jobs/")
    || /^ops\/events\/\d{4}\/\d{2}\/event-[^/]+\.md$/.test(normalized);
}

function diffRequiresApproval(decision, changes = []) {
  if (decision.risk === "high") return true;
  const sensitiveRoots = ["apps/", "contracts/", "config/", "scripts/", "tests/"];
  return changes.some((change) => change.kind !== "added"
    || sensitiveRoots.some((root) => change.path.startsWith(root))
    || /^vault\/.*\/MOC\s*-|^vault\/MOC\s*-/i.test(change.path));
}

class AgentHost {
  constructor({ store, executor, gitGuard, policy = evaluate, validator = validateRepositoryChange, onCommitted = async () => {} } = {}) {
    if (!store || !executor || !gitGuard) throw new Error("AgentHost 缺少必要 Adapter");
    this.store = store;
    this.executor = executor;
    this.gitGuard = gitGuard;
    this.policy = policy;
    this.validator = validator;
    this.onCommitted = onCommitted;
    this.activeRuns = new Map();
    this.jobLocks = new Map();
    this.mergeTail = Promise.resolve();
  }

  async receive(request, context = {}) {
    const decision = this.policy(request, context);
    const job = await this.store.create({
      request,
      decision,
      channel: context.channel || "web",
      senderId: context.senderId || "local-user",
      requestKey: context.messageId ? `${context.channel || "web"}:${context.senderId || "local-user"}:${context.messageId}` : "",
    });
    if (job.deduplicated) {
      return { job, deduplicated: true, requiresApproval: job.status === "awaiting_approval" };
    }
    if (decision.allowed === false) {
      await this.#commitSystemRecords(job, `syno: reject denied ${job.id}`).catch(() => {});
      return { job, error: job.error };
    }
    if (job.status === "pending") return this.#execute(job);
    return { job, requiresApproval: true };
  }

  async inspect(jobId) {
    return this.store.get(jobId);
  }

  async list(options) {
    return this.store.list(options);
  }

  async approve(jobId, approval = {}) {
    const launch = await this.#withJobLock(jobId, async () => {
      const job = await this.#requiredJob(jobId);
      const { ready } = await this.store.approve(job, approval);
      if (!ready) return { job, action: "wait" };
      const action = job.phase === "merge" ? "merge" : "execute";
      await this.store.transition(job, "running", { phase: action === "merge" ? "merging" : "execution" });
      return { job, action };
    });
    if (launch.action === "wait") return { job: launch.job, requiresApproval: true };
    if (launch.action === "merge") return this.#merge(launch.job);
    return this.#execute(launch.job, { alreadyRunning: true });
  }

  async reject(jobId, reason) {
    const job = await this.#withJobLock(jobId, async () => this.store.reject(await this.#requiredJob(jobId), reason));
    await this.#commitSystemRecords(job, `syno: reject ${job.id}`);
    return { job };
  }

  async cancel(jobId) {
    const job = await this.#withJobLock(jobId, async () => {
      const current = await this.#requiredJob(jobId);
      if (["completed", "failed", "rejected", "canceled"].includes(current.status)) return current;
      if (current.runId) this.executor.cancel(current.runId);
      await this.store.transition(current, "canceled", { cleanup: { removed: false, reason: current.runId ? "executor_stopping" : "pending_cleanup" } });
      return current;
    });
    if (!job.runId) {
      job.cleanup = await this.#cleanupWorktree(job);
      await this.store.save(job);
    }
    await this.#commitSystemRecords(job, `syno: cancel ${job.id}`);
    return { job };
  }

  async #execute(job, { alreadyRunning = false } = {}) {
    let workspace = PATHS.repoRoot;
    try {
      if (!alreadyRunning) await this.store.transition(job, "running");
      const dirtyBefore = await this.gitGuard.changedPaths(PATHS.repoRoot);
      const unrelated = dirtyBefore.filter((item) => !isSystemPath(item));
      if (unrelated.length) throw new Error(`主工作区有未受管变更，拒绝执行：${unrelated.join(", ")}`);

      await this.#commitSystemRecords(job, `syno: start ${job.id}`);

      if (job.decision.needsWorktree) {
        job.worktree = await this.gitGuard.prepareWorktree(job.id);
        workspace = job.worktree.directory;
        await this.store.save(job);
        await this.#commitSystemRecords(job, `syno: isolate ${job.id}`);
      }
      const execution = await this.executor.submit(job, {
        workspace,
        onStart: async (runId) => {
          this.activeRuns.set(job.id, runId);
          await this.#withJobLock(job.id, async () => {
            const current = await this.#requiredJob(job.id);
            if (["canceled", "failed", "rejected", "completed"].includes(current.status)) {
              this.executor.cancel(runId);
              return;
            }
            current.runId = runId;
            await this.store.save(current);
          });
          await this.#commitSystemRecords(job, `syno: run ${job.id}`);
        },
      });
      const current = await this.#requiredJob(job.id);
      if (current.status === "canceled") {
        current.cleanup = await this.#cleanupWorktree(current);
        await this.store.save(current);
        await this.#commitSystemRecords(current, `syno: canceled ${job.id}`);
        return { job: current };
      }
      Object.assign(job, current, { runId: execution.runId });
      await this.store.transition(job, "validating", { execution });

      const changes = typeof this.gitGuard.changes === "function"
        ? await this.gitGuard.changes(workspace)
        : (await this.gitGuard.changedPaths(workspace)).map((item) => ({ status: "M", path: item, kind: "existing" }));
      const executorChanges = changes.filter((item) => !isSystemPath(item.path));
      const executorPaths = [...new Set(executorChanges.flatMap((item) => [item.path, item.sourcePath].filter(Boolean)))];
      const validation = await this.validator({ repoRoot: workspace, changedPaths: executorPaths, decision: job.decision });
      job.changedPaths = validation.changedPaths;

      if (job.decision.needsWorktree) {
        const commit = await this.gitGuard.commitPaths(job.changedPaths, `syno: execute ${job.id}`, workspace);
        if (!commit.committed) {
          const cleanup = await this.#cleanupWorktree(job);
          await this.store.transition(job, "completed", { result: { ...execution, validation, commit, cleanup } });
          await this.#commitSystemRecords(job, `syno: complete no-op ${job.id}`);
          return { job };
        }
        const pinned = await this.gitGuard.pinWorktree(job.worktree);
        job.worktree = { ...job.worktree, commit: pinned.commit, diffHash: pinned.diffHash };
        const actualHighRisk = diffRequiresApproval(job.decision, pinned.changes);
        if (actualHighRisk) {
          job.risk = "high";
          job.approval = "double";
          job.decision = { ...job.decision, risk: "high", approval: "double", reason: "实际 diff 修改了既有事实或敏感路径，需要第二次审批" };
          await this.store.transition(job, "awaiting_approval", {
            phase: "merge",
            approvalsReceived: 0,
            result: { ...execution, validation, commit, preview: pinned.preview, diffHash: pinned.diffHash, changes: pinned.changes },
          });
          await this.#commitSystemRecords(job, `syno: await merge approval ${job.id}`);
          return { job, requiresApproval: true, diff: pinned.preview };
        }

        await this.#commitSystemRecords(job, `syno: approve additive merge ${job.id}`);
        const merge = await this.#serializeMerge(() => this.gitGuard.mergeWorktree(job.worktree));
        const cleanup = await this.#cleanupWorktree(job);
        const sideEffects = await this.onCommitted({ job, changedPaths: job.changedPaths, merge, execution });
        await this.store.transition(job, "completed", { result: { ...execution, validation, commit, merge, cleanup, preview: pinned.preview, sideEffects } });
        await this.#commitSystemRecords(job, `syno: complete ${job.id}`);
        return { job };
      }

      await this.store.transition(job, "completed", { result: { ...execution, validation } });
      const allChanged = await this.gitGuard.changedPaths(PATHS.repoRoot);
      const commitPaths = [...new Set([...job.changedPaths, ...allChanged.filter(isSystemPath)])];
      if (commitPaths.length) {
        job.localCommit = await this.gitGuard.commitPaths(commitPaths, `syno: complete ${job.id}`);
        await this.store.save(job);
        await this.#commitSystemRecords(job, `syno: record commit ${job.id}`);
      }
      return { job };
    } catch (error) {
      const current = await this.#withJobLock(job.id, async () => {
        const latest = await this.store.get(job.id).catch(() => null) || job;
        if (!["failed", "canceled"].includes(latest.status) && ["running", "validating"].includes(latest.status)) {
          await this.store.transition(latest, "failed", {
            error: { code: error.code || error.failureCode || "EXECUTION_FAILED", message: error.message },
          });
          latest.cleanup = await this.#cleanupWorktree(latest);
          await this.store.save(latest);
        }
        return latest;
      });
      if (current.status === "failed") await this.#commitSystemRecords(current, `syno: fail ${job.id}`).catch(() => {});
      return { job: current, error: current.error || { code: "EXECUTION_FAILED", message: error.message } };
    } finally {
      this.activeRuns.delete(job.id);
    }
  }

  async #merge(job) {
    try {
      await this.#commitSystemRecords(job, `syno: approve merge ${job.id}`);
      const merge = await this.#serializeMerge(() => this.gitGuard.mergeWorktree(job.worktree));
      await this.store.transition(job, "validating", { phase: "merge" });
      let cleanup = { removed: true };
      try {
        await this.gitGuard.removeWorktree(job.worktree);
      } catch (error) {
        cleanup = { removed: false, warning: error.message };
      }
      const sideEffects = await this.onCommitted({ job, changedPaths: job.changedPaths, merge, execution: job.result });
      await this.store.transition(job, "completed", { result: { ...job.result, merge, cleanup, sideEffects } });
      await this.#commitSystemRecords(job, `syno: merged ${job.id}`);
      return { job };
    } catch (error) {
      const current = await this.#requiredJob(job.id);
      if (current.status === "running" || current.status === "validating") {
        await this.store.transition(current, "failed", { error: { code: "MERGE_FAILED", message: error.message } });
        await this.#commitSystemRecords(current, `syno: fail merge ${job.id}`).catch(() => {});
      }
      return { job: current, error: { code: "MERGE_FAILED", message: error.message } };
    }
  }

  async #commitSystemRecords(job, message) {
    const changed = await this.gitGuard.changedPaths(PATHS.repoRoot);
    const records = changed.filter(isSystemPath);
    return this.gitGuard.commitPaths(records, message, PATHS.repoRoot);
  }

  async #requiredJob(jobId) {
    const job = await this.store.get(jobId);
    if (!job) {
      const error = new Error(`Job 不存在：${jobId}`);
      error.code = "JOB_NOT_FOUND";
      throw error;
    }
    return job;
  }

  async #cleanupWorktree(job) {
    if (!job.worktree) return { removed: false, reason: "no_worktree" };
    try {
      await this.gitGuard.removeWorktree(job.worktree);
      return { removed: true };
    } catch (error) {
      return { removed: false, warning: error.message };
    }
  }

  async #withJobLock(jobId, operation) {
    const previous = this.jobLocks.get(jobId) || Promise.resolve();
    const current = previous.catch(() => {}).then(operation);
    this.jobLocks.set(jobId, current);
    try { return await current; }
    finally { if (this.jobLocks.get(jobId) === current) this.jobLocks.delete(jobId); }
  }

  async #serializeMerge(operation) {
    const current = this.mergeTail.catch(() => {}).then(operation);
    this.mergeTail = current;
    return current;
  }
}

export { AgentHost, diffRequiresApproval, isSystemPath };
