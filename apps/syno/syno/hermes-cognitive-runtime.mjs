import { randomUUID } from "node:crypto";

import { assertCognitiveCapabilities } from "./cognitive-runtime.mjs";

const CONTROL_COMMAND = /^\s*\/(?:model|fallback|yolo|reload-mcp|update|memory|skills|background|rollback)\b/iu;

function deniedControlCommand() {
  const error = new Error("Syno 不向认知运行时暴露模型、权限、记忆、Skill 或更新控制命令");
  error.code = "RUNTIME_CONTROL_COMMAND_DENIED";
  return error;
}

class HermesCognitiveRuntime {
  constructor({ bridge, tools, fixedModelId } = {}) {
    if (!bridge || !tools || !fixedModelId) throw new Error("HermesCognitiveRuntime 缺少 Bridge、ToolRegistry 或固定 Model ID");
    this.bridge = bridge;
    this.tools = tools;
    this.fixedModelId = fixedModelId;
    this.name = "hermes-sidecar";
    this.runs = new Map();
    this.capabilityReport = null;
  }

  async initialize() {
    const expectedTools = this.tools.list().map((tool) => tool.name);
    this.capabilityReport = assertCognitiveCapabilities(await this.bridge.capabilities(), { expectedTools });
    return this.capabilityReport;
  }

  capabilities() {
    if (!this.capabilityReport) throw new Error("HermesCognitiveRuntime 尚未通过能力握手");
    return this.capabilityReport;
  }

  async health() {
    const health = await this.bridge.health();
    return { ...health, ready: health?.ready === true && Boolean(this.capabilityReport), adapter: this.name };
  }

  inspect(runId) {
    const run = this.runs.get(runId);
    return run ? { ...run } : null;
  }

  cancel(runId) {
    const run = this.runs.get(runId);
    if (!run || run.status !== "running") return false;
    this.bridge.cancel(runId);
    run.status = "canceling";
    return true;
  }

  async run(request, context = {}) {
    if (!this.capabilityReport) await this.initialize();
    const text = String(request?.text || request?.message || "");
    if (CONTROL_COMMAND.test(text)) throw deniedControlCommand();
    const runId = `hermes-${randomUUID()}`;
    const events = [];
    const emit = (event) => {
      const normalized = { runId, at: new Date().toISOString(), ...event };
      events.push(normalized);
      context.onEvent?.(normalized);
    };
    this.runs.set(runId, { status: "running" });
    await context.onStart?.(runId);
    emit({ type: "run.started", data: { adapter: this.name } });
    try {
      const result = await this.bridge.run({
        runId,
        message: text,
        conversationId: context.conversationId,
        channel: context.channel || "web",
        ownerId: context.ownerId || "local-user",
        modelId: this.fixedModelId,
        tools: this.tools.list(),
      }, {
        signal: context.signal,
        onEvent: emit,
        onToolCall: async ({ name, arguments: input }) => this.tools.execute(name, input || {}, {
          channel: context.channel || "web", ownerId: context.ownerId || "local-user",
          conversationId: context.conversationId, allowWrites: false,
          allowJobSubmission: true, allowAgentSettings: true,
        }),
      });
      if (result?.model !== this.fixedModelId) {
        const error = new Error("Hermes 返回了非固定 Model ID");
        error.code = "RUNTIME_MODEL_CHANGED";
        throw error;
      }
      const final = { runId, executor: this.name, events, ...result };
      this.runs.set(runId, { status: "completed", result: final });
      emit({ type: "run.completed", data: { conversationId: result.conversationId } });
      return final;
    } catch (error) {
      this.runs.set(runId, { status: "failed", error: { code: error.code || "HERMES_RUNTIME_FAILED", message: error.message, retryable: error.retryable === true } });
      emit({ type: "run.failed", data: { code: error.code || "HERMES_RUNTIME_FAILED", retryable: error.retryable === true } });
      throw error;
    }
  }
}

export { CONTROL_COMMAND, HermesCognitiveRuntime };
