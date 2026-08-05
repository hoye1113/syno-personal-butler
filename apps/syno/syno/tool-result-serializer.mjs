// 工具结果序列化层：「工具结果 → 发给 LLM 的内容」的唯一出口。
// 三条认知运行时路径（MCP bridge / Native ToolLoopAgent / Hermes sidecar）共用，
// 集中三件事：脱敏（凭据形状不出本机）、截断（上下文保护）、structuredContent 契约。
//
// 缘起：knowledge.search 等 5 个 list 工具返回顶层数组，bridge 原样塞进 MCP
// structuredContent，而 OpenCode 转对话消息时 tool_result.structuredContent 要求顶层
// object → Zod 抛 invalid_type。本模块让 structuredContent 仅在结果是 plain object 时
// 产生；数组/标量只走 content text（符合 MCP 规范：outputSchema 非 object 则不产 structuredContent）。
//
// 关键不变量：本模块只影响「发给 LLM 的内容」。bridge 的 onResult / effect receipt /
// pending decision 仍接收原始未脱敏 result，保持审计与事实完整性。截断/脱敏绝不回写存储。

import { inspectRemoteContent } from "./sensitive-content.mjs";

// 仅字面量对象（{} / new Object()）或无原型字典（Object.create(null)）算 plain。
// Date/Map/Set/Error/类实例的 prototype 不指向 Object.prototype，不算 plain——
// 避免把带类标签的对象塞进 structuredContent（MCP chat-message schema 要求顶层普通 object）。
// 原先用 typeof+!Array.isArray 会把 Date/Map/Set 误判为 plain（修正点）。
const isPlainObject = (v) => {
  if (v === null || typeof v !== "object") return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

function blockedError(reasons) {
  const error = new Error("工具结果可能包含凭据或敏感信息，已阻止发送到远程模型");
  error.code = "REMOTE_TOOL_RESULT_BLOCKED";
  error.reasons = reasons;
  return error;
}

// 截断标记：与 context-manager ToolTruncator 的语义对齐（超阈砍尾部，保留头部 + 标记）。
function truncateText(text, charLimit) {
  const limit = Number(charLimit);
  if (!limit || text.length <= limit) return { text, truncated: false };
  return { text: `${text.slice(0, limit)}\n…[truncated]`, truncated: true };
}

// MCP 路径（OpenCode bridge）：产出 CallToolResult.result 的 content + 可选 structuredContent。
// redact 失败 → throw REMOTE_TOOL_RESULT_BLOCKED（MCP 路径 fail-closed，保持原有语义）。
// 调用方应在 effect 提交之前调用，使「脱敏门 → commit」顺序成立（不合规结果不落盘）。
function serializeForMcp(result, { redact = true, charLimit = null } = {}) {
  let text = JSON.stringify(result);
  if (redact) {
    const inspection = inspectRemoteContent(text);
    if (!inspection.safe) throw blockedError(inspection.reasons);
  }
  const { text: truncatedText, truncated } = truncateText(text, charLimit);
  return {
    content: [{ type: "text", text: truncatedText }],
    ...(isPlainObject(result) ? { structuredContent: result } : {}),
    ...(truncated ? { truncated: true } : {}),
  };
}

const REDACTED_TOOL_MESSAGE = JSON.stringify({
  ok: false,
  error: { code: "REMOTE_TOOL_RESULT_BLOCKED", message: "工具结果可能包含凭据或敏感信息，已脱敏" },
});

// Native（ToolLoopAgent）role:tool 消息：返回字符串。
// redact 失败不 throw——回灌脱敏错误串给模型，不中断 turn（让模型看到失败并决定下一步）。
// 注意：截断由调用方已通过 contextManager.truncateToolResult 完成；这里默认不重复截断
// （charLimit 传 null），仅做脱敏 + 序列化。
function serializeForToolMessage(result, { redact = true, charLimit = null } = {}) {
  let text = JSON.stringify(result);
  if (redact && !inspectRemoteContent(text).safe) return REDACTED_TOOL_MESSAGE;
  if (charLimit) {
    const { text: truncatedText } = truncateText(text, charLimit);
    text = truncatedText;
  }
  return text;
}

// Hermes sidecar：外层 bridge adapter 期望对象（非字符串）。unsafe 时返回 {ok:false,error}
// stub 对象，不 throw。safe 时原样返回 result 引用——「保对象契约」指 unsafe 分支必返回对象 stub
// （而非 throw）、且外层 tool_result 信封恒为对象；safe 引用本身可是 object/array/scalar，由 sidecar 承载。
function redactResultObject(result) {
  const text = JSON.stringify(result);
  return inspectRemoteContent(text).safe
    ? result
    : { ok: false, error: { code: "REMOTE_TOOL_RESULT_BLOCKED", message: "工具结果可能包含凭据或敏感信息，已脱敏" } };
}

// D1：在【完整、未截断】结果上判定安全性。调用方必须在任何截断之前调用：截断（尤其 truncate-middle
// 砍中段）会把跨边界的凭据模式切成两半，导致截断后的文本不再命中模式而漏检。先过此门，不安全则跳过
// 截断直接走脱敏串；安全则截断不可能凭空创造凭据形状，可安全截断。
function isResultSafe(result) {
  return inspectRemoteContent(JSON.stringify(result ?? {})).safe;
}

export { serializeForMcp, serializeForToolMessage, redactResultObject, isResultSafe, isPlainObject };
