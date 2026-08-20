class FakeExecutor {
  constructor({ responder = async (job) => ({ text: `fake:${job.id}`, changedPaths: [] }) } = {}) {
    this.responder = responder;
    this.runs = new Map();
  }
  async submit(job, options = {}) {
    const runId = `fake-${job.id}`;
    this.runs.set(runId, { status: "running" });
    await options.onStart?.(runId);
    const result = await this.responder(job);
    const response = { runId, executor: "fake", ...result };
    if (options.validate) response.validation = await options.validate(response);
    this.runs.set(runId, { status: "completed", result: response });
    return response;
  }
  inspect(runId) { return this.runs.get(runId) || null; }
  cancel(runId) { return this.runs.delete(runId); }
}

export { FakeExecutor };
