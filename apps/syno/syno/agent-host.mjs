import { evaluate } from "./policy.mjs";
import { PATHS } from "./paths.mjs";
import { validateRepositoryChange } from "./validator.mjs";

const SYSTEM_PREFIXES = ["ops/jobs/", "ops/events/"];

function isSystemPath(value) {
  return SYSTEM_PREFIXES.some((prefix) => String(value).replace(/\\/g, "/").startsWith(prefix));
}

class AgentHost {
  constructor({ store, executor, gitGuard, policy = evaluate, validator = validateRepositoryChange } = {}) {
    if (!store || !executor || !gitGuard) throw new Error("AgentHost 缺少必要 Adapter");
    this.store = store;
    this.executor = executor;
    this.gitGuard = gitGuard;
    this.policy = policy;
    this.validator = validator;
    this.activeRuns = new Map();
  }

  async receive(request, context = {}) {
    const decision = this.policy(request, context);
    const job = await this.store.create({
      request,
      decision,
      channel: context.channel || "web",
      senderId: context.senderId || "local-user",
    });
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
    const job = await this.#requiredJob(jobId);
    const { ready } = await this.store.approve(job, approval);
    if (!ready) return { job, requiresApproval: true };
    if (job.phase === "merge") return this.#merge(job);
    return this.#execute(job);
  }

  async reject(jobId, reason) {
    const job = await this.store.reject(await this.#requiredJob(jobId), reason);
    await this.#commitSystemRecords(job, `syno: reject ${job.id}`);
    return { job };
  }

  async cancel(jobId) {
    const job = await this.#requiredJob(jobId);
    if (["completed", "failed", "rejected", "canceled"].includes(job.status)) return { job };
    if (job.runId) this.executor.cancel(job.runId);
    const cleanup = await this.#cleanupWorktree(job);
    await this.store.transition(job, "canceled", { cleanup });
    await this.#commitSystemRecords(job, `syno: cancel ${job.id}`);
    return { job };
  }

  async #execute(job) {
    let workspace = PATHS.repoRoot;
    try {
      const dirtyBefore = await this.gitGuard.changedPaths(PATHS.repoRoot);
      const unrelated = dirtyBefore.filter((item) => !isSystemPath(item));
      if (unrelated.length) throw new Error(`主工作区有未受管变更，拒绝执行：${unrelated.join(", ")}`);

      if (job.decision.needsWorktree) {
        job.worktree = await this.gitGuard.prepareWorktree(job.id);
        workspace = job.worktree.directory;
      }
      if (job.status !== "running") await this.store.transition(job, "running");
      const execution = await this.executor.submit(job, { workspace });
      job.runId = execution.runId;
      this.activeRuns.set(job.id, execution.runId);
      await this.store.transition(job, "validating", { execution });

      const changed = await this.gitGuard.changedPaths(workspace);
      const executorPaths = changed.filter((item) => !isSystemPath(item));
      const validation = await this.validator({ repoRoot: workspace, changedPaths: executorPaths, decision: job.decision });
      job.changedPaths = validation.changedPaths;

      if (job.decision.needsWorktree) {
        const commit = await this.gitGuard.commitPaths(job.changedPaths, `syno: execute ${job.id}`, workspace);
        const preview = await this.gitGuard.branchDiff(job.worktree.branch);
        await this.store.transition(job, "awaiting_approval", {
          phase: "merge",
          approvalsReceived: 0,
          result: { ...execution, validation, commit, preview },
        });
        await this.#commitSystemRecords(job, `syno: await merge approval ${job.id}`);
        return { job, requiresApproval: true, diff: preview };
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
      if (!["failed", "canceled"].includes(job.status) && ["running", "validating"].includes(job.status)) {
        await this.store.transition(job, "failed", {
          error: { code: error.code || error.failureCode || "EXECUTION_FAILED", message: error.message },
        });
        job.cleanup = await this.#cleanupWorktree(job);
        await this.store.save(job);
        await this.#commitSystemRecords(job, `syno: fail ${job.id}`).catch(() => {});
      }
      return { job, error: job.error || { code: "EXECUTION_FAILED", message: error.message } };
    } finally {
      this.activeRuns.delete(job.id);
    }
  }

  async #merge(job) {
    try {
      await this.#commitSystemRecords(job, `syno: approve merge ${job.id}`);
      const merge = await this.gitGuard.mergeWorktree(job.worktree);
      let cleanup = { removed: true };
      try {
        await this.gitGuard.removeWorktree(job.worktree);
      } catch (error) {
        cleanup = { removed: false, warning: error.message };
      }
      await this.store.transition(job, "completed", { result: { ...job.result, merge, cleanup } });
      await this.#commitSystemRecords(job, `syno: merged ${job.id}`);
      return { job };
    } catch (error) {
      return { job, error: { code: "MERGE_FAILED", message: error.message } };
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
}

export { AgentHost, isSystemPath };
