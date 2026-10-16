// 2026-09-03 #21 实证摘除（约 115 个生产会话轮次审计）：workflow.context / capture.status /
// capture.list_pending / jobs.list / jobs.submit 零调用，且 capture 待办有确定性路由
// （pendingDecisions）兜底，jobs 管理走 CLI/ops。摘除只收窄聊天面——ToolRegistry 注册不动，
// 收录 workflow 的显式 allowedTools 与降级目录 FALLBACK_TOOLS（capture cordis toolSet=all）不受影响。
// 2026-09-04 P1：+inspiration.record_feedback——灵感反馈路由 LLM 化（替代 handler 确定性口令拦截）。
// 6 件 = 知识三件套（search/read_snippet/fetch_url）+ 今日快照 + 收录入口 + 灵感反馈。
// 注意：这份名单只约束 bridge 面（回滚 tab）；默认聊天面是 capabilities 插件注册的 10 件 canonical
// 工具（含 capture.status/list_pending 与 jobs.*），两者不是同一种东西。
// 2026-10-16 摘除 image.read：B5 之后它不在任何模型面（插件 10 件不含它、bridge 默认静默），
// 提示词却仍指向它；主人确认模型自身可看图，图片收录仍由 handler 的 visionClient 承担。
const CORE_CHAT_TOOL_NAMES = Object.freeze([
  "knowledge.search",
  "knowledge.read_snippet",
  "knowledge.fetch_url",
  "today.read",
  "capture.start",
  "inspiration.record_feedback",
]);

const CORE_CHAT_BRIDGE_TOOL_NAMES = Object.freeze(
  CORE_CHAT_TOOL_NAMES.map((name) => name.replaceAll(".", "_").replaceAll("-", "_")),
);

function canonicalBridgeToolName(name) {
  let value = String(name || "").trim();
  if (value.startsWith("syno_")) value = value.slice("syno_".length);
  return value.replaceAll(".", "_").replaceAll("-", "_");
}

function isCoreChatToolName(name) {
  return CORE_CHAT_BRIDGE_TOOL_NAMES.includes(canonicalBridgeToolName(name));
}

export {
  CORE_CHAT_BRIDGE_TOOL_NAMES,
  CORE_CHAT_TOOL_NAMES,
  canonicalBridgeToolName,
  isCoreChatToolName,
};
