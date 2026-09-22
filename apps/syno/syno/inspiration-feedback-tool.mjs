// P1（2026-09-04，#17）：今日灵感反馈路由 LLM 化——替代 channel-conversation-handler 的确定性口令拦截。
// 工具常驻（DSH 工具列表启动即冻结，做不到「有卡才暴露」的列表级开关），约束全收 execute 内部：
// - 无 24h 内已投递且未反馈的卡 → recorded:false，模型如实告知主人（不落账、不报错）；
// - 取值枚举由 inputSchema 硬闸（useful/neutral/not_useful），模型负责把「有用/有启发」等措辞映射进枚举；
// - 直写灵感档案走 agentAdjustableBoundary（与 settings.adjust 同模式）：桥/agent 聊天上下文放行，
//   无边界上下文的直接调用被 ToolRegistry 拒（TOOL_APPROVAL_REQUIRED）。
// 幂等白嫖效应收据：同 messageId 同工具的重复调用由桥层幂等键只执行一次。

function createInspirationFeedbackTool({ inspirationStore, recordEvent } = {}) {
  if (!inspirationStore) throw new Error("inspiration.record_feedback 缺少 InspirationStore");
  return {
    name: "inspiration.record_feedback",
    description: [
      "记录主人对最近一张「今日灵感」卡片的评价。仅当主人明确评价这张卡（如「有用」「有启发」「没用」「不对味」「一般」）时调用一次：",
      "有用/有启发/不错 → useful；一般/还行/凑合 → neutral；没用/不对味/无感 → not_useful。",
      "泛谈某篇文章或笔记「有用吗」「怎么样」不要调用——本工具只绑定最新一张待反馈灵感卡。",
      "返回 recorded:false 表示当前没有待反馈的卡，如实告诉主人即可，不要编造已记录。",
    ].join(""),
    risk: "low",
    permission: "syno-inspiration",
    retry: "idempotent",
    version: "1",
    agentAdjustableBoundary: true,
    inputSchema: {
      type: "object",
      required: ["feedback"],
      properties: { feedback: { enum: ["useful", "neutral", "not_useful"] }, inspirationId: { type: "string", minLength: 1 } },
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      required: ["recorded"],
      properties: {
        recorded: { type: "boolean" },
        reason: { type: "string" },
        inspirationId: { type: "string" },
        feedback: { enum: ["useful", "neutral", "not_useful"] },
      },
      additionalProperties: false,
    },
    execute: async ({ feedback, inspirationId }, context = {}) => {
      if (inspirationId) {
        const exact = await inspirationStore.feedbackTarget(inspirationId, { ownerKey: context.ownerId });
        if (!exact.found) return { recorded: false, reason: exact.reason, inspirationId: String(inspirationId) };
        if (exact.alreadyRecorded) return { recorded: false, reason: "already_recorded", inspirationId: exact.record.id, feedback: exact.record.feedback };
        const updated = await inspirationStore.recordFeedback(exact.record.id, feedback);
        await recordEvent?.("inspiration.feedback.recorded", { inspirationId: updated.id, feedback: updated.feedback, channel: context.channel || null })?.catch(() => {});
        return { recorded: true, inspirationId: updated.id, feedback: updated.feedback };
      }
      const card = await inspirationStore.latestAwaitingFeedback();
      if (!card) return { recorded: false, reason: "no_card_awaiting" };
      const updated = await inspirationStore.recordFeedback(card.id, feedback);
      // 落账先于观测；journal 故障不回滚已记反馈（与 fetch_url 升级上报同口径的 fail-safe）
      await recordEvent?.("inspiration.feedback.recorded", {
        inspirationId: card.id,
        feedback: updated.feedback,
        channel: context.channel || null,
      })?.catch(() => {});
      return { recorded: true, inspirationId: card.id, feedback: updated.feedback };
    },
  };
}

export { createInspirationFeedbackTool };
