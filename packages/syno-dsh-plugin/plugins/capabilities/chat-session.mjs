// DSH 侧的活聊天门禁（2026-10-16 接回浏览器升级用）。
//
// 为什么需要：BSK 浏览器升级只允许发生在「主人正在对话」的入口（原 #20 的通道门禁），
// 但 DSH 插件工具拿不到 Host 的 channel/ownerKey/threadKey——那是 Host 进程的运行时信息。
// 工具执行时能拿到的是会话 id（ToolRunContext.agent.id），而两类活聊天会话的 id 形态是确定的：
//   - Host 路由线程：`syno-<threadKey>-<uuid-hex32>`（deepseek-harness-cognitive-runtime #session；
//     飞书/微信/Web 聊天共用 threadKey=main）
// 主动运营线程是 `syno-proactive-*`，收录 Workflow 走 capture profile（不挂载本插件），
// 二者都落在白名单之外；一切未知形态同样不升级（fail closed）。
// 2026-10-16：微信通道栈已删除，原来放行的 `weixin-*` 会话形态随之移除。

const LIVE_CHAT_SESSION_PATTERNS = Object.freeze([
  /^syno-main-[0-9a-f]{32}$/u,
]);

function isLiveChatSession(sessionId) {
  const id = String(sessionId || "");
  return LIVE_CHAT_SESSION_PATTERNS.some((pattern) => pattern.test(id));
}

// 交给 fetch-url-tool 的上下文；非活聊天返回 null，调用方据此保持「只直抓」的旧行为。
function chatReadContext(sessionId) {
  if (!isLiveChatSession(sessionId)) return null;
  return { channel: "chat", sessionId: String(sessionId) };
}

export { chatReadContext, isLiveChatSession };
