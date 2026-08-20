import { randomUUID } from "node:crypto";

const FORBIDDEN_CAPABILITIES = Object.freeze([
  "browser", "cron", "delegate", "dynamicMcp", "fileWrite", "gateway", "memoryWrite",
  "modelFallback", "modelSwitch", "skillMutation", "sourceWrite", "terminal", "yolo",
]);

function capabilityError(message) {
  const error = new Error(message);
  error.code = "COGNITIVE_CAPABILITY_DENIED";
  return error;
}

function assertCognitiveCapabilities(report, { expectedTools } = {}) {
  if (!report || report.agentCount !== 1) throw capabilityError("CognitiveRuntime 必须声明单一 Agent 的受支持能力清单");
  if (report.version === 2) {
    throw capabilityError("CognitiveRuntime v2（OpenCode）已移除，产品只接受 v3 DeepSeek Harness");
  }
  if (![1, 3].includes(report.version)) throw capabilityError("CognitiveRuntime 必须声明单一 Agent 的受支持能力清单");
  if (report.version === 3) {
    if (report.adapter !== "deepseek-harness-sdk" || typeof report.provider !== "string" || !report.provider) {
      throw capabilityError("CognitiveRuntime v3 必须使用受控 DeepSeek Harness SDK Adapter");
    }
    for (const name of ["agentSelectableModel", "providerFallback", "dynamicMcp", "sourceWrite", "memoryWrite", "yolo", "skillMutation"]) {
      if (report[name] !== false) throw capabilityError(`CognitiveRuntime v3 禁止能力未关闭：${name}`);
    }
    if (!Array.isArray(report.models) || !report.models.length || report.models.some((model) => !/^deepseek\/\S+$/.test(String(model)))) {
      throw capabilityError("CognitiveRuntime v3 模型链必须是 DeepSeek 官方 deepseek/<model>");
    }
    const tools = [...new Set((report.tools || []).map(String))].sort();
    if (expectedTools) {
      const expected = [...new Set(expectedTools.map(String))].sort();
      if (JSON.stringify(tools) !== JSON.stringify(expected)) throw capabilityError(`CognitiveRuntime 工具清单不匹配：${tools.join(", ")}`);
    }
    return Object.freeze({ ...report, models: Object.freeze([...report.models]), tools: Object.freeze(tools) });
  }
  for (const name of FORBIDDEN_CAPABILITIES) {
    if (report[name] !== false) throw capabilityError(`CognitiveRuntime 禁止能力未关闭：${name}`);
  }
  if (report.providerFixed !== true) throw capabilityError("CognitiveRuntime 必须固定 Provider 与 Model ID");
  const tools = [...new Set((report.tools || []).map(String))].sort();
  if (expectedTools) {
    const expected = [...new Set(expectedTools.map(String))].sort();
    if (JSON.stringify(tools) !== JSON.stringify(expected)) throw capabilityError(`CognitiveRuntime 工具清单不匹配：${tools.join(", ")}`);
  }
  return Object.freeze({ ...report, tools: Object.freeze(tools) });
}

function baseCapabilities({ adapter, tools }) {
  return {
    version: 1, adapter, agentCount: 1, providerFixed: true,
    browser: false, cron: false, delegate: false, dynamicMcp: false, fileWrite: false,
    gateway: false, memoryWrite: false, modelFallback: false, modelSwitch: false,
    skillMutation: false, sourceWrite: false, terminal: false, yolo: false,
    tools,
  };
}

class NativeCognitiveRuntime {
  constructor({ agent, tools } = {}) {
    if (!agent || !tools) throw new Error("NativeCognitiveRuntime 缺少 Agent 或 ToolRegistry");
    this.agent = agent;
    this.tools = tools;
    this.name = "native-tool-loop";
    this.runs = new Map();
  }

  capabilities() {
    return assertCognitiveCapabilities(baseCapabilities({ adapter: this.name, tools: this.tools.list().map((tool) => tool.name) }));
  }

  health() {
    return { ready: true, adapter: this.name, activeRuns: [...this.runs.values()].filter((run) => run.status === "running").length };
  }

  inspect(runId) {
    const run = this.runs.get(runId);
    return run ? { ...run, controller: undefined } : null;
  }

  cancel(runId) {
    const run = this.runs.get(runId);
    if (!run || run.status !== "running") return false;
    run.controller.abort(Object.assign(new Error("Agent 已取消"), { code: "AGENT_CANCELED" }));
    return true;
  }

  async run(request, context = {}) {
    const runId = `cognitive-${randomUUID()}`;
    const controller = new AbortController();
    const events = [];
    const emit = (type, data = {}) => {
      const event = { runId, type, at: new Date().toISOString(), data };
      events.push(event);
      context.onEvent?.(event);
    };
    if (context.signal) {
      if (context.signal.aborted) controller.abort(context.signal.reason);
      else context.signal.addEventListener("abort", () => controller.abort(context.signal.reason), { once: true });
    }
    this.runs.set(runId, { status: "running", controller });
    await context.onStart?.(runId);
    emit("run.started", { adapter: this.name });
    try {
      const result = await this.agent.run(request, { ...context, signal: controller.signal, onStart: undefined, onEvent: undefined });
      const final = { runId, executor: this.name, events, ...result };
      this.runs.set(runId, { status: "completed", result: final });
      emit("run.completed", { conversationId: result.conversationId });
      return final;
    } catch (error) {
      this.runs.set(runId, { status: "failed", error: { code: error.code || "COGNITIVE_RUNTIME_FAILED", message: error.message, retryable: error.retryable === true } });
      emit("run.failed", { code: error.code || "COGNITIVE_RUNTIME_FAILED", retryable: error.retryable === true });
      throw error;
    }
  }
}

export { FORBIDDEN_CAPABILITIES, NativeCognitiveRuntime, assertCognitiveCapabilities, baseCapabilities };
