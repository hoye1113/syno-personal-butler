function captureContext(context = {}) {
  const workflowId = String(context.browserWorkflowId || "");
  if (!workflowId || !String(context.threadKey || "").startsWith("capture:")) {
    throw Object.assign(new Error("浏览器工具只允许在已授权的 capture Session 使用"), { code: "BROWSER_CONTEXT_REQUIRED" });
  }
  return workflowId;
}

function tool(name, description, execute, extra = {}) {
  return {
    name,
    description,
    risk: "read",
    permission: "syno-read",
    retry: "safe",
    version: "1",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    outputSchema: { type: "object" },
    execute,
    ...extra,
  };
}

function createBrowserCaptureTools(adapter) {
  if (!adapter) throw new Error("浏览器工具缺少 BrowserCaptureAdapter");
  return [
    tool("browser.status", "检查当前收录 Workflow 的浏览器读取能力", async (_input, context) => adapter.status({ workflowId: captureContext(context) })),
    tool("browser.navigate", "打开 Coordinator 已授权的收录地址", async (_input, context) => adapter.navigate({ workflowId: captureContext(context) })),
    tool("browser.snapshot", "读取当前收录标签页的可访问性树", async (_input, context) => adapter.snapshot({ workflowId: captureContext(context) })),
    tool("browser.list_tabs", "列出当前收录 Workflow 创建的标签组", async (_input, context) => adapter.listTabs({ workflowId: captureContext(context) })),
    tool("browser.close_session", "关闭当前收录 Workflow 的标签组", async (_input, context) => {
      const workflowId = captureContext(context);
      if (context.browserCloseAuthorized !== true) {
        throw Object.assign(new Error("关闭收录标签必须由主人明确请求"), { code: "BROWSER_CLOSE_NOT_AUTHORIZED" });
      }
      return adapter.closeSession({ workflowId });
    }),
  ];
}

export { captureContext, createBrowserCaptureTools };
