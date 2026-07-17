class OperationExecutor {
  constructor({ execute, fallback, operations = null } = {}) {
    if (typeof execute !== "function" || !fallback) throw new Error("OperationExecutor 缺少执行 seam");
    this.execute = execute;
    this.fallback = fallback;
    this.operations = operations ? new Set(operations) : null;
    this.runs = new Map();
  }

  async submit(job, options = {}) {
    if (job.request?.kind !== "syno-operation" || (this.operations && !this.operations.has(job.request.operation))) {
      return this.fallback.submit(job, options);
    }
    const runId = `operation-${job.id}`;
    this.runs.set(runId, { status: "running", operation: job.request.operation });
    try {
      const operationResult = await this.execute(job.request.operation, job.request.payload || {}, { job, ...options });
      const result = {
        runId,
        executor: "syno-operation",
        text: `确定性操作 ${job.request.operation} 已执行`,
        operationResult,
      };
      this.runs.set(runId, { status: "completed", result });
      return result;
    } catch (error) {
      this.runs.set(runId, { status: "failed", error: { message: error.message, code: error.code } });
      throw error;
    }
  }

  inspect(runId) {
    return this.runs.get(runId) || this.fallback.inspect(runId);
  }

  cancel(runId) {
    if (this.runs.has(runId)) {
      const run = this.runs.get(runId);
      if (run.status !== "running") return false;
      this.runs.set(runId, { ...run, status: "canceled" });
      return true;
    }
    return this.fallback.cancel(runId);
  }
}

export { OperationExecutor };
