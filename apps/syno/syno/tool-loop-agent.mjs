import { serializeForToolMessage } from "./tool-result-serializer.mjs";

const DEFAULT_SYSTEM_PROMPT = `你是 Syno，一个主动但克制的知识闭环私人管家。
你只能使用提供的工具；不能修改源码、配置权限、Provider、Policy 或 ToolRegistry。
知识写入必须创建可审批 Job。AI 生成内容不是用户的学习证据，不能提升掌握度。
只在用户明确要求相关操作时调用工具；连通性测试、问候和闲聊直接简短回复，不自行创建知识、抓取来源或展示工具。
工具失败时解释失败与可行下一步，不使用相同参数无条件重试。
回答要明确下一步，并区分已验证事实、候选证据与推断。`;

function parseArguments(call) {
  try { return JSON.parse(call?.function?.arguments || "{}"); }
  catch {
    const error = new Error(`工具 ${call?.function?.name || "unknown"} arguments 不是合法 JSON`);
    error.code = "TOOL_ARGUMENTS_INVALID_JSON";
    throw error;
  }
}

function repairDanglingToolCalls(messages = []) {
  const repaired = [];
  const pending = new Map();
  const finishPending = () => {
    for (const id of pending.keys()) {
      repaired.push({
        role: "tool",
        tool_call_id: id,
        content: JSON.stringify({
          ok: false,
          error: { code: "TOOL_RESULT_MISSING", message: "上一次工具调用未完成，未重放该操作" },
        }),
      });
    }
    pending.clear();
  };

  for (const message of messages) {
    if (pending.size && message.role !== "tool") finishPending();
    repaired.push(message);
    if (message.role === "assistant") {
      for (const call of message.tool_calls || []) {
        if (call?.id) pending.set(call.id, true);
      }
    } else if (message.role === "tool" && message.tool_call_id) {
      pending.delete(message.tool_call_id);
    }
  }
  if (pending.size) finishPending();
  return repaired;
}

class ToolLoopAgent {
  constructor({ provider, tools, conversations, maxTurns = 8, systemPrompt = DEFAULT_SYSTEM_PROMPT, contextManager = null } = {}) {
    if (!provider || !tools || !conversations) throw new Error("ToolLoopAgent 缺少 Provider、ToolRegistry 或 ConversationStore");
    this.provider = provider;
    this.tools = tools;
    this.conversations = conversations;
    this.maxTurns = maxTurns;
    this.systemPrompt = systemPrompt;
    this.contextManager = contextManager;
  }

  async run(request, { conversationId, channel = "web", ownerId = "local-user", signal } = {}) {
    if (conversationId && typeof this.conversations.runExclusive === "function") {
      return this.conversations.runExclusive(conversationId, () => this.#run(request, { conversationId, channel, ownerId, signal }));
    }
    return this.#run(request, { conversationId, channel, ownerId, signal });
  }

  async #run(request, { conversationId, channel, ownerId, signal }) {
    let conversation = conversationId ? await this.conversations.get(conversationId) : null;
    if (!conversation) conversation = await this.conversations.create({ id: conversationId || undefined, channel, ownerId });
    conversation.status = "active";
    delete conversation.error;
    conversation.messages = repairDanglingToolCalls(conversation.messages);
    const userMessage = { role: "user", content: String(request?.text || request?.message || "") };
    conversation.messages.push(userMessage);
    await this.conversations.save(conversation);

    try {
      const provider = typeof this.provider.bindRun === "function" ? await this.provider.bindRun() : this.provider;
      const runConfig = Number.isFinite(provider?.contextLength) ? { contextLength: provider.contextLength } : null;
      for (let turn = 1; turn <= this.maxTurns; turn += 1) {
        if (signal?.aborted) throw Object.assign(new Error("Agent 已取消"), { code: "AGENT_CANCELED" });

        // Mid-turn 压缩：每 turn 顶部从 conversation.messages 重建，发送前压缩
        let messages = [{ role: "system", content: this.systemPrompt }, ...conversation.messages];
        if (this.contextManager) {
          const compressed = await this.contextManager.compress(messages, { conversationId: conversation.id, runConfig, handoffContext: conversation.handoffContext });
          if (compressed.action === "rotate") {
            return {
              rotate: true,
              handoff: compressed.handoff,
              fromConversationId: conversation.id,
              pendingRequest: request,
              channel, ownerId,
            };
          }
          if (compressed.action !== "none") {
            messages = compressed.messages;
            this.contextManager.applyCompaction(conversation, compressed);
          }
        }

        const completion = await provider.complete(messages, this.tools.list(), { signal });

        if (this.contextManager && completion.usage) {
          this.contextManager.trackUsage(completion.usage, conversation.id, "agent");
        }

        const assistant = completion.message;
        conversation.messages.push(assistant);
        const calls = assistant.tool_calls || [];
        if (!calls.length) {
          conversation.status = "completed";
          conversation.model = completion.model;
          await this.conversations.save(conversation);
          return { text: String(assistant.content || ""), conversationId: conversation.id, turns: turn, usage: completion.usage, model: completion.model };
        }
        for (const call of calls) {
          const name = call?.function?.name;
          let result;
          try {
            result = await this.tools.execute(name, parseArguments(call), { channel, ownerId, allowWrites: false, allowJobSubmission: true, allowAgentSettings: true, conversationId: conversation.id });
          } catch (error) {
            if (signal?.aborted || error.name === "AbortError") throw error;
            result = {
              ok: false,
              error: {
                code: error.code || "TOOL_EXECUTION_FAILED",
                message: String(error.message || "工具执行失败").slice(0, 500),
              },
            };
          }
          if (this.contextManager) {
            result = this.contextManager.truncateToolResult(result, name);
          }
          // 统一经序列化层：脱敏（含错误包装 result 的 message）+ 序列化。
          // 截断已由 contextManager.truncateToolResult 完成；此处不重复截断。
          const toolMessage = { role: "tool", tool_call_id: call.id, content: serializeForToolMessage(result) };
          conversation.messages.push(toolMessage);
        }
        await this.conversations.save(conversation);
      }
      const error = new Error(`Agent 超过最大 ${this.maxTurns} 轮`);
      error.code = "AGENT_TURN_LIMIT";
      throw error;
    } catch (error) {
      conversation.status = "failed";
      conversation.error = { code: error.code || "AGENT_FAILED", message: error.message };
      await this.conversations.save(conversation);
      throw error;
    }
  }
}

export { DEFAULT_SYSTEM_PROMPT, ToolLoopAgent, parseArguments, repairDanglingToolCalls };
