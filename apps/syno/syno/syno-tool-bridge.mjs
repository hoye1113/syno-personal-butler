import { createHash, timingSafeEqual } from "node:crypto";
import { inspectRemoteContent } from "./sensitive-content.mjs";
import { serializeForMcp } from "./tool-result-serializer.mjs";

function toolInvocationKey({ ownerKey, threadKey, messageId, toolName }) {
  return createHash("sha256")
    .update(`${ownerKey}\0${threadKey}\0${messageId}\0${toolName}`, "utf8")
    .digest("hex");
}

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

function normalizeAllowedToolName(name) {
  const value = String(name);
  return value.startsWith("syno_") ? value.slice("syno_".length) : value;
}

function normalizeExposedToolName(name) {
  const value = String(name || "").trim();
  if (!value) return "";
  return value.startsWith("syno_")
    ? value.slice("syno_".length)
    : bridgeName(value);
}

const BRIDGE_TOOL_NAMES = new Set([
  "workflow.context",
  "knowledge.search",
  "knowledge.read_snippet",
  "knowledge.fetch_url",
  "today.read",
  "capture.start",
  "capture.status",
  "capture.list_pending",
  "learning.due",
  "learning.teach_back",
  "learning.submit",
  "goals.list",
  "projects.list",
  "projects.create",
  "projects.update_status",
  "claims.propose",
  "evidence.source_read",
  "evidence.propose",
  "jobs.list",
  "jobs.submit",
  "settings.adjust",
  "image.read",
  "browser.status",
  "browser.navigate",
  "browser.snapshot",
  "browser.list_tabs",
  "browser.close_session",
]);

class SynoToolBridge {
  constructor({ tools, token, exposedToolNames = null, ownerKey = "local-user", onResult = async () => {}, isRuntimeReady = () => true, effectReceipts = null, reconciliationCases = null, charLimit = null } = {}) {
    if (!tools || !token) throw new Error("SynoToolBridge 缺少 ToolRegistry 或进程级 Token");
    this.tools = tools;
    this.charLimit = charLimit;
    this.token = token;
    this.ownerKey = ownerKey;
    this.onResult = onResult;
    this.isRuntimeReady = isRuntimeReady;
    this.effectReceipts = effectReceipts;
    this.reconciliationCases = reconciliationCases;
    this.effectCounter = 0;
    this.activeContext = null;
    this.idempotentResults = new Map();
    const exposedNames = Array.isArray(exposedToolNames)
      ? new Set(exposedToolNames.map(normalizeExposedToolName).filter(Boolean))
      : null;
    this.exposed = new Map(tools.list()
      .filter((tool) => BRIDGE_TOOL_NAMES.has(tool.name))
      .filter((tool) => !exposedNames || exposedNames.has(bridgeName(tool.name)))
      .map((tool) => [bridgeName(tool.name), tool]));
  }

  effectVersion() { return this.effectCounter; }

  bindContext(context) {
    // 桥忙是瞬时条件（持有方 release 即恢复）：必须挂 retryable。coordinator 主路径只对
    // retryable === true 走 failed_retryable + 60s 退避（maxPrepareAttempts=8 封顶升终态）；
    // 未挂标记时收录撞槽一次即 failed_terminal（2026-08-07 生产事故）。
    if (this.activeContext) throw Object.assign(bridgeError("SYNO_BRIDGE_CONTEXT_BUSY", "Syno Tool Bridge 正在处理另一个会话"), { retryable: true });
    this.activeContext = Object.freeze({
      ownerKey: String(context.ownerKey || this.ownerKey),
      threadKey: String(context.threadKey || "main"),
      channel: String(context.channel || "harness"),
      messageId: String(context.messageId || context.runId || ""),
      allowedTools: new Set((context.allowedTools || []).map(normalizeAllowedToolName)),
      ...(context.browserWorkflowId ? { browserWorkflowId: String(context.browserWorkflowId) } : {}),
      ...(context.browserCloseAuthorized === true ? { browserCloseAuthorized: true } : {}),
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
    if (!this.isRuntimeReady()) {
      return {
        ...response,
        error: { code: -32004, message: "RUNTIME_NOT_READY: Syno Runtime 尚未就绪" },
      };
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
    if (!active.allowedTools.has(name)) {
      return {
        ...response,
        error: { code: -32003, message: "SYNO_BRIDGE_TOOL_NOT_ALLOWED: 本次运行未授权该工具" },
      };
    }
    const idempotencyKey = definition.retry === "idempotent" && active.messageId
      ? `${active.ownerKey}\0${active.threadKey}\0${active.messageId}\0${name}\0${JSON.stringify(request.params?.arguments || {})}`
      : "";
    if (idempotencyKey && this.idempotentResults.has(idempotencyKey)) return this.idempotentResults.get(idempotencyKey);
    const toolInvocation = active.messageId ? toolInvocationKey({ ownerKey: active.ownerKey, threadKey: active.threadKey, messageId: active.messageId, toolName: name }) : "";
    try {
      const toolArguments = request.params?.arguments || {};
      this.tools.validateInput(definition.name, toolArguments);
      const argumentsDigest = createHash("sha256").update(JSON.stringify(request.params?.arguments || {})).digest("hex");
      const requestIdentity = active.messageId ? `${active.messageId}:${name}:${argumentsDigest.slice(0, 16)}` : "";
      let durableReceipt = null;
      if (this.effectReceipts && toolInvocation && definition.risk !== "read") {
        const begun = await this.effectReceipts.begin({ toolInvocationKey: toolInvocation, toolName: name, ownerKey: active.ownerKey, argumentsDigest });
        durableReceipt = begun.receipt;
        if (!begun.created && durableReceipt.status === "committed") {
          const stored = await this.effectReceipts.get(toolInvocation, { includePayload: true });
          const cached = stored?.payload?.result;
          const replay = {
            ...response,
            result: {
              ...serializeForMcp(cached, { charLimit: this.charLimit }),
              directEffect: stored.directEffect,
              businessOutcome: stored.businessOutcome,
              isError: false,
            },
          };
          return replay;
        }
        if (!begun.created) {
          await this.reconciliationCases?.open({ toolInvocationKey: toolInvocation, toolName: name, ownerKey: active.ownerKey, sourceType: "tool", sourceId: active.messageId, lastErrorCode: "TOOL_INVOCATION_PENDING" });
          return { ...response, result: { content: [{ type: "text", text: "TOOL_INVOCATION_PENDING: 该调用已有未完成事实，请等待对账" }], isError: true } };
        }
      }
      // A mutating tool may complete its write before output validation or transport fails.
      // Mark the attempt up front so the cognitive runtime never retries another model
      // after a potentially irreversible side effect.
      if (definition.risk !== "read") this.effectCounter += 1;
      const result = await this.tools.execute(definition.name, toolArguments, {
        channel: active.channel,
        ownerId: active.ownerKey,
        threadKey: active.threadKey,
        conversationId: requestIdentity,
        ...(active.browserWorkflowId ? { browserWorkflowId: active.browserWorkflowId } : {}),
        ...(active.browserCloseAuthorized ? { browserCloseAuthorized: true } : {}),
        allowJobSubmission: true,
        allowAgentSettings: true,
        allowWrites: false,
      });
      // 序列化（脱敏 + structuredContent 契约）前置到 commit 之前：不合规结果不落盘。
      // onResult / effectReceipts.commit 仍接收原始 result（见不变量）。
      const egress = serializeForMcp(result, { charLimit: this.charLimit });
      await this.onResult({ tool: definition, result, ...active });
      const directEffect = definition.risk === "read"
        ? { status: "no_effect", type: definition.name, sourceType: null, sourceId: null, toolInvocationKey: toolInvocation || null, occurredAt: null }
        : { status: "committed", type: result?.directEffect?.type || definition.name, sourceType: result?.directEffect?.sourceType || (result?.job?.id ? "job" : "tool"), sourceId: result?.directEffect?.sourceId || result?.job?.id || result?.id || null, toolInvocationKey: toolInvocation || null, occurredAt: new Date().toISOString() };
      const businessOutcome = result?.businessOutcome || { status: result?.status || (definition.risk === "read" ? "returned" : "accepted") };
      if (this.effectReceipts && toolInvocation && definition.risk !== "read") await this.effectReceipts.commit({ toolInvocationKey: toolInvocation, toolName: name, ownerKey: active.ownerKey, argumentsDigest, result, directEffect, businessOutcome });
      const success = {
        ...response,
        result: {
          ...egress,
          directEffect,
          businessOutcome,
          isError: false,
        },
      };
      if (idempotencyKey) {
        this.idempotentResults.set(idempotencyKey, success);
        if (this.idempotentResults.size > 1_000) this.idempotentResults.delete(this.idempotentResults.keys().next().value);
      }
      return success;
    } catch (error) {
      if (error.code === "TOOL_INVOCATION_IDENTITY_CONFLICT") {
        return { ...response, error: { code: -32009, message: "TOOL_INVOCATION_IDENTITY_CONFLICT: 同一调用身份的参数与既有事实不一致" } };
      }
      if (this.effectReceipts && toolInvocation && definition.risk !== "read" && error.effectReceipt) {
        const toolArguments = request.params?.arguments || {};
        const argumentsDigest = createHash("sha256").update(JSON.stringify(toolArguments)).digest("hex");
        const directEffect = { ...error.effectReceipt.directEffect, toolInvocationKey: toolInvocation, occurredAt: new Date().toISOString() };
        const businessOutcome = error.effectReceipt.businessOutcome;
        const result = { directEffect, businessOutcome, result: error.effectOutput };
        // 错误分支也走脱敏门：含密的 effectOutput 绝不落盘（保「redact→commit」不变量，
        // 与成功分支 :200 的 serializeForMcp 脱敏门对齐）。开对账 case 让人工介入，
        // 返回脱敏错误——不持久化、不发回对端。
        const effectOutputSafe = inspectRemoteContent(JSON.stringify(result)).safe;
        if (!effectOutputSafe) {
          if (this.reconciliationCases && toolInvocation) {
            await this.reconciliationCases.open({ toolInvocationKey: toolInvocation, toolName: name, ownerKey: active.ownerKey, sourceType: "tool", sourceId: active.messageId, lastErrorCode: "REMOTE_TOOL_RESULT_BLOCKED" }).catch(() => {});
          }
          return { ...response, result: { content: [{ type: "text", text: JSON.stringify({ ok: false, error: { code: "REMOTE_TOOL_RESULT_BLOCKED", message: "工具结果可能包含凭据或敏感信息，已阻止持久化与发送" } }) }], isError: true } };
        }
        await this.effectReceipts.commit({ toolInvocationKey: toolInvocation, toolName: name, ownerKey: active.ownerKey, argumentsDigest, result, directEffect, businessOutcome });
        return { ...response, result: { ...serializeForMcp(result, { redact: false, charLimit: this.charLimit }), directEffect, businessOutcome, isError: true } };
      }
      if (this.reconciliationCases && toolInvocation && definition.risk !== "read" && !["TOOL_INPUT_INVALID", "TOOL_NOT_ALLOWED"].includes(error.code)) {
        await this.reconciliationCases.open({ toolInvocationKey: toolInvocation, toolName: name, ownerKey: active.ownerKey, sourceType: "tool", sourceId: active.messageId, lastErrorCode: error.code || "EFFECT_UNKNOWN" }).catch(() => {});
      }
      const invalid = ["TOOL_INPUT_INVALID", "TOOL_NOT_ALLOWED"].includes(error.code);
      const rawError = `${error.code || "TOOL_FAILED"}: ${error.message}`;
      const safeError = inspectRemoteContent(rawError).safe
        ? rawError
        : "REMOTE_TOOL_ERROR_REDACTED: 工具执行失败，详细错误仅保留本机";
      if (invalid) return { ...response, error: { code: invalid ? -32602 : -32000, message: safeError } };
      return {
        ...response,
        result: {
          content: [{ type: "text", text: safeError }],
          isError: true,
        },
      };
    }
  }
}

export { BRIDGE_TOOL_NAMES, SynoToolBridge, bridgeName, normalizeAllowedToolName, normalizeExposedToolName, toolInvocationKey };
