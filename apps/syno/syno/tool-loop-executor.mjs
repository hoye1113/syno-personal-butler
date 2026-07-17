class ToolLoopExecutor {
  constructor({ runtime } = {}) {
    if (!runtime) throw new Error("ToolLoopExecutor 缺少 CognitiveRuntime");
    this.runtime = runtime;
  }

  async submit(job, options = {}) {
    return this.runtime.run(job.request, {
      conversationId: job.request?.conversationId,
      channel: job.channel,
      ownerId: job.senderId,
      workspace: options.workspace,
      onStart: options.onStart,
      onEvent: options.onEvent,
    });
  }

  inspect(runId) { return this.runtime.inspect(runId); }
  cancel(runId) { return this.runtime.cancel(runId); }
}

export { ToolLoopExecutor };
