// 2026-10-17 工具面重设计（主人：全部删除，重新设计）：
// 聊天只保留受控知识三件套——搜索、读片段、读网页（含反爬浏览器升级）。
// 收录、任务/审批、今日快照、灵感反馈都不再作为模型工具：收录与状态走确定性路由，
// 待审批项由 pending decision 主动推送，今日快照由主动运营投递。
// 这份名单同时约束 bridge 面（回滚开关 SYNO_CHAT_TOOLS=bridge）。
const CORE_CHAT_TOOL_NAMES = Object.freeze([
  "knowledge.search",
  "knowledge.read_snippet",
  "knowledge.fetch_url",
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
