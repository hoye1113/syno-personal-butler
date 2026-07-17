const DEFAULT_SYSTEM_PROMPT = `你是 Syno，一个主动但克制的知识闭环私人管家。
你只能使用提供的工具；不能修改源码、配置权限、Provider、Policy 或 ToolRegistry。
知识写入必须创建可审批 Job。AI 生成内容不是用户的学习证据，不能提升掌握度。
回答要明确下一步，并区分已验证事实、候选证据与推断。`;

function parseArguments(call) {
  try { return JSON.parse(call?.function?.arguments || "{}"); }
  catch {
    const error = new Error(`工具 ${call?.function?.name || "unknown"} arguments 不是合法 JSON`);
    error.code = "TOOL_ARGUMENTS_INVALID_JSON";
    throw error;
  }
}

class ToolLoopAgent {
  constructor({ provider, tools, conversations, maxTurns = 8, systemPrompt = DEFAULT_SYSTEM_PROMPT } = {}) {
    if (!provider || !tools || !conversations) throw new Error("ToolLoopAgent 缺少 Provider、ToolRegistry 或 ConversationStore");
    this.provider = provider;
    this.tools = tools;
    this.conversations = conversations;
    this.maxTurns = maxTurns;
    this.systemPrompt = systemPrompt;
  }

  async run(request, { conversationId, channel = "web", ownerId = "local-user", signal } = {}) {
    let conversation = conversationId ? await this.conversations.get(conversationId) : null;
    if (!conversation) conversation = await this.conversations.create({ channel, ownerId });
    const userMessage = { role: "user", content: String(request?.text || request?.message || "") };
    conversation.messages.push(userMessage);
    await this.conversations.save(conversation);
    const messages = [{ role: "system", content: this.systemPrompt }, ...conversation.messages];

    try {
      for (let turn = 1; turn <= this.maxTurns; turn += 1) {
        if (signal?.aborted) throw Object.assign(new Error("Agent 已取消"), { code: "AGENT_CANCELED" });
        const completion = await this.provider.complete(messages, this.tools.list(), { signal });
        const assistant = completion.message;
        messages.push(assistant);
        conversation.messages.push(assistant);
        const calls = assistant.tool_calls || [];
        if (!calls.length) {
          conversation.status = "completed";
          conversation.model = completion.model;
          await this.conversations.save(conversation);
          return { text: String(assistant.content || ""), conversationId: conversation.id, turns: turn, usage: completion.usage };
        }
        for (const call of calls) {
          const name = call?.function?.name;
          const result = await this.tools.execute(name, parseArguments(call), { channel, ownerId, allowWrites: false, allowJobSubmission: true, allowAgentSettings: true, conversationId: conversation.id });
          const toolMessage = { role: "tool", tool_call_id: call.id, content: JSON.stringify(result) };
          messages.push(toolMessage);
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

export { DEFAULT_SYSTEM_PROMPT, ToolLoopAgent, parseArguments };
