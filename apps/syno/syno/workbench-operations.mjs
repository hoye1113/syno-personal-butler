class WorkbenchOperations {
  constructor({ workspaceContext, handlers = {} } = {}) {
    if (!workspaceContext?.run) throw new Error("WorkbenchOperations 缺少 workspaceContext");
    this.workspaceContext = workspaceContext;
    this.handlers = new Map(Object.entries(handlers));
  }

  operations() { return [...this.handlers.keys()].sort(); }

  async execute(operation, payload, { workspace } = {}) {
    const handler = this.handlers.get(operation);
    if (!handler) {
      const error = new Error(`未知工作台操作：${operation}`);
      error.code = "UNKNOWN_OPERATION";
      throw error;
    }
    const deferredActions = [];
    const operationResult = await this.workspaceContext.run(
      { workspace, deferExternal: true, deferredActions },
      () => handler(payload),
    );
    return { ...operationResult, deferredActions };
  }
}

export { WorkbenchOperations };
