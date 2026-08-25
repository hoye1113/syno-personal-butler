// 轮转编排：归档旧对话 + 切路由（退役旧 id）+ 创建新对话注入前情提要。
// 顺序刻意为先切路由再归档（R6）：路由切换后，窗口期内到达的并发消息 resolve 到旧 id 时
// 因旧 id 已在 retiredIds 而触发新建，不会被 #run 的 status="active" 复活到超限旧对话。
// 跨 rotate 稳定摘要载体的累积上限（字符）默认值。滚动窗口：超限丢最旧（尾部），保最新（头部）。
// 实际上限由 ConversationStore.retention.handoffContextCharsMax 注入（与 summariesMax 等同源外置）。
const HANDOFF_CONTEXT_CAP = 8000;

// 累积各段对话的摘要/前情：新摘要前置 + 旧载体续接，超上限截头部保最新。
// rotateConversation 用它把「上一段对话的最新 summary（无则退回 handoff）」拼进新对话的 handoffContext，
// 让早期决策跨多次 rotate 存活（修 M2b 实测的 0% depth≥2 遗忘）。
function accumulateDigest(prev, digest, cap = HANDOFF_CONTEXT_CAP) {
  const limit = Number(cap) > 0 ? Number(cap) : HANDOFF_CONTEXT_CAP;
  const next = digest + (prev ? `\n---\n${prev}` : "");
  return next.length > limit ? next.slice(0, limit) : next;
}

async function rotateConversation({ conversations, conversationRouter, ownerKey, threadKey = "default", oldConversationId, handoff, channel, ownerId }) {
  const fresh = await conversations.create({ channel: channel || "web", ownerId: ownerId || "local-user" });
  await conversationRouter.rotate({ ownerKey: ownerKey || "local-user", threadKey, newConversationId: fresh.id });
  // 累积上限外置自 store.retention（默认 8000，见 HANDOFF_CONTEXT_CAP），与 summariesMax 等同源可调。
  const handoffCap = conversations?.retention?.handoffContextCharsMax ?? HANDOFF_CONTEXT_CAP;
  let old = null;
  if (oldConversationId) {
    old = await conversations.get(oldConversationId).catch(() => null);
    if (old) {
      old.status = "archived";
      old.rotatedTo = fresh.id;
      await conversations.save(old);
    }
  }
  if (handoff) {
    // 稳定摘要载体：优先取旧对话最新 summary（layer3 产物，高保真）；无则退回本次 handoff。
    // 回退用「handoff（含上轮前情 preamble）」而非 preamble-free 精简 digest 是刻意的——
    // 把累积前情再渲染进新 digest 头部，使滚动窗口「保头部」时旧决策始终位于头端而存活。
    // 实测：改 preamble-free 精简 digest 会在 depth≥3 回退存活（probe 验证 d3/d5 ✗），故保持 re-injection。
    const digest = old?.summaries?.slice(-1)[0]?.summary || handoff;
    fresh.handoffContext = accumulateDigest(old?.handoffContext, digest, handoffCap);
    // 注入为语义正确的前情载体（system + _syno.kind），而非伪 user：
    // 避免 (a) 模型把它当请求回应、(b) extractValuable 把前情当真实用户陈述再提取（自污染）。
    fresh.messages.push({ role: "system", content: handoff, _syno: { kind: "handoff", factualStatus: "unverified" } });
    await conversations.save(fresh);
  }
  return fresh.id;
}

class ToolLoopExecutor {
  constructor({ runtime, conversations = null, conversationRouter = null, rotateMaxDepth = 2 } = {}) {
    if (!runtime) throw new Error("ToolLoopExecutor 缺少 CognitiveRuntime");
    this.runtime = runtime;
    this.conversations = conversations;
    this.conversationRouter = conversationRouter;
    this.rotateMaxDepth = rotateMaxDepth;
  }

  async submit(job, options = {}) {
    const baseContext = {
      conversationId: job.conversationId || job.request?.conversationId,
      channel: job.channel,
      ownerId: job.senderId,
      ownerKey: job.ownerKey || "local-user",
      threadKey: job.threadKey || "main",
      messageId: job.requestKey || job.id,
      ...(job.projectRef ? { projectRef: String(job.projectRef) } : {}),
      workspace: options.workspace,
      onStart: options.onStart,
      onEvent: options.onEvent,
    };
    let result = await this.runtime.run(job.request, baseContext);
    let depth = 0;
    // 捕获 rotate 信号 → 轮转 → 用新 conversationId 重跑（R1）；rotateMaxDepth 防死循环（R7）
    while (result?.rotate && depth < this.rotateMaxDepth && this.conversations && this.conversationRouter) {
      depth += 1;
      const newId = await rotateConversation({
        conversations: this.conversations,
        conversationRouter: this.conversationRouter,
        ownerKey: job.ownerKey || "local-user",
        oldConversationId: result.fromConversationId,
        handoff: result.handoff,
        channel: result.channel || job.channel,
        ownerId: result.ownerId || job.senderId,
      });
      result = await this.runtime.run(result.pendingRequest || job.request, { ...baseContext, conversationId: newId });
    }
    if (result?.rotate) {
      // 超过深度上限：降级确定性兜底，保证用户总能收到回复
      return {
        runId: result.runId,
        executor: this.runtime.name,
        text: "（对话已过长，已开启新对话并延续前情。请重新发送您的请求。）",
        rotateCapped: true,
      };
    }
    return result;
  }

  inspect(runId) { return this.runtime.inspect(runId); }
  cancel(runId) { return this.runtime.cancel(runId); }
}

export { ToolLoopExecutor, rotateConversation, accumulateDigest };
