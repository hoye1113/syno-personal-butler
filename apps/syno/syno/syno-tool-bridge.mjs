import { createHash, timingSafeEqual } from "node:crypto";

function bridgeError(code, message) {
  return Object.assign(new Error(message), { code });
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

function bridgeName(toolName) {
  return toolName.replaceAll(".", "_").replaceAll("-", "_");
}

const BRIDGE_TOOL_NAMES = new Set([
  "workflow.context",
  "knowledge.search",
  "knowledge.read_snippet",
  "today.read",
  "capture.receive",
  "capture.status",
  "capture.prepare",
  "learning.due",
  "learning.teach_back",
  "learning.submit",
  "goals.list",
  "claims.propose",
  "evidence.source_read",
  "evidence.propose",
  "jobs.list",
  "jobs.submit",
  "settings.adjust",
]);

class SynoToolBridge {
  constructor({ tools, token, ownerKey = "local-user", onResult = async () => {} } = {}) {
    if (!tools || !token) throw new Error("SynoToolBridge 缺少 ToolRegistry 或进程级 Token");
    this.tools = tools;
    this.token = token;
    this.ownerKey = ownerKey;
    this.onResult = onResult;
    this.effectCounter = 0;
    this.activeContext = null;
    this.idempotentResults = new Map();
    this.exposed = new Map(tools.list().filter((tool) => BRIDGE_TOOL_NAMES.has(tool.name)).map((tool) => [bridgeName(tool.name), tool]));
  }

  effectVersion() { return this.effectCounter; }

  bindContext(context) {
    if (this.activeContext) throw bridgeError("SYNO_BRIDGE_CONTEXT_BUSY", "Syno Tool Bridge 正在处理另一个会话");
    this.activeContext = Object.freeze({
      ownerKey: String(context.ownerKey || this.ownerKey),
      threadKey: String(context.threadKey || "main"),
      channel: String(context.channel || "opencode"),
      messageId: String(context.messageId || context.runId || ""),
    });
    return () => { this.activeContext = null; };
  }

  definitions() {
    return [...this.exposed.entries()].map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: {
        readOnlyHint: tool.risk === "read",
        destructiveHint: false,
        idempotentHint: ["safe", "idempotent"].includes(tool.retry),
      },
    }));
  }

  list() {
    return this.definitions().map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
  }

  async handle({ authorization, body } = {}) {
    if (!safeEqual(authorization, `Bearer ${this.token}`)) {
      throw bridgeError("SYNO_BRIDGE_UNAUTHORIZED", "Syno Tool Bridge 认证失败");
    }
    const request = body || {};
    const response = { jsonrpc: "2.0", id: request.id ?? null };
    if (request.method === "notifications/initialized") return null;
    if (request.method === "initialize") {
      return {
        ...response,
        result: {
          protocolVersion: "2025-03-26",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "syno-tool-bridge", version: "1.0.0" },
        },
      };
    }
    if (request.method === "ping") return { ...response, result: {} };
    if (request.method === "tools/list") return { ...response, result: { tools: this.definitions() } };
    if (request.method !== "tools/call") {
      return { ...response, error: { code: -32601, message: "Method not found" } };
    }
    const name = String(request.params?.name || "");
    const definition = this.exposed.get(name);
    if (!definition) return { ...response, error: { code: -32601, message: "Tool not found" } };
    if (!this.activeContext) {
      return {
        ...response,
        error: { code: -32001, message: "SYNO_BRIDGE_CONTEXT_REQUIRED: 工具调用没有绑定 Syno 会话" },
      };
    }
    const active = this.activeContext;
    const idempotencyKey = definition.retry === "idempotent" && active.messageId
      ? `${active.ownerKey}\0${active.threadKey}\0${active.messageId}\0${name}\0${JSON.stringify(request.params?.arguments || {})}`
      : "";
    if (idempotencyKey && this.idempotentResults.has(idempotencyKey)) return this.idempotentResults.get(idempotencyKey);
    try {
      const toolArguments = request.params?.arguments || {};
      this.tools.validateInput(definition.name, toolArguments);
      const argumentsDigest = createHash("sha256").update(JSON.stringify(request.params?.arguments || {})).digest("hex").slice(0, 16);
      const requestIdentity = active.messageId ? `${active.messageId}:${name}:${argumentsDigest}` : "";
      // A mutating tool may complete its write before output validation or transport fails.
      // Mark the attempt up front so the cognitive runtime never retries another model
      // after a potentially irreversible side effect.
      if (definition.risk !== "read") this.effectCounter += 1;
      const result = await this.tools.execute(definition.name, toolArguments, {
        channel: active.channel,
        ownerId: active.ownerKey,
        conversationId: requestIdentity,
        allowJobSubmission: true,
        allowAgentSettings: true,
        allowWrites: false,
      });
      await this.onResult({ tool: definition, result, ...active });
      const success = {
        ...response,
        result: {
          content: [{ type: "text", text: JSON.stringify(result) }],
          structuredContent: result,
          isError: false,
        },
      };
      if (idempotencyKey) {
        this.idempotentResults.set(idempotencyKey, success);
        if (this.idempotentResults.size > 1_000) this.idempotentResults.delete(this.idempotentResults.keys().next().value);
      }
      return success;
    } catch (error) {
      const invalid = ["TOOL_INPUT_INVALID", "TOOL_NOT_ALLOWED"].includes(error.code);
      if (invalid) return { ...response, error: { code: invalid ? -32602 : -32000, message: error.message } };
      return {
        ...response,
        result: {
          content: [{ type: "text", text: `${error.code || "TOOL_FAILED"}: ${error.message}` }],
          isError: true,
        },
      };
    }
  }
}

export { BRIDGE_TOOL_NAMES, SynoToolBridge, bridgeName };
