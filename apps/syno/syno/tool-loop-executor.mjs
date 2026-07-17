import { randomUUID } from "node:crypto";

class ToolLoopExecutor {
  constructor({ agent } = {}) {
    if (!agent) throw new Error("ToolLoopExecutor 缺少 Agent");
    this.agent = agent;
    this.runs = new Map();
  }

  async submit(job, options = {}) {
    const runId = `agent-${randomUUID()}`;
    const controller = new AbortController();
    this.runs.set(runId, { status: "running", controller, jobId: job.id });
    await options.onStart?.(runId);
    try {
      const result = await this.agent.run(job.request, {
        conversationId: job.request?.conversationId,
        channel: job.channel,
        ownerId: job.senderId,
        signal: controller.signal,
      });
      const execution = { runId, executor: "tool-loop-agent", ...result };
      this.runs.set(runId, { status: "completed", result: execution });
      return execution;
    } catch (error) {
      this.runs.set(runId, { status: "failed", error: { code: error.code, message: error.message, retryable: error.retryable === true } });
      throw error;
    }
  }

  inspect(runId) { const value = this.runs.get(runId); return value ? { ...value, controller: undefined } : null; }
  cancel(runId) {
    const run = this.runs.get(runId);
    if (!run || run.status !== "running") return false;
    run.controller.abort(new Error("canceled"));
    return true;
  }
}

export { ToolLoopExecutor };
