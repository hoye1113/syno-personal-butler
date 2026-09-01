const INTENTS = Object.freeze([
  "new_conversation",
  "show_capabilities",
  "capture_status",
  "list_pending_capture",
  "continue_browser_capture",
  "close_capture_tabs",
  "normal_conversation",
]);

function normalizeText(value) {
  return String(value || "").trim().replace(/[\u3000\t ]+/gu, " ");
}

class ChannelIntentRouter {
  classify(value) {
    const text = normalizeText(value);
    if (!text) return { kind: "normal_conversation", confidence: 1, text };
    if (/^\/?(?:新对话|新建会话)$/u.test(text)
      || /^(?:请|帮我|那就|现在)?\s*(?:重新开|新建|开启|另开|换个)\s*(?:一个|个)?\s*(?:对话|会话|聊天)(?:吧|呢)?$/u.test(text)
      || /^(?:换个话题|从头聊)(?:吧|呢)?$/u.test(text)
      || /^(?:清空|清除|重置)(?:这段|当前)?(?:上下文|对话)$/u.test(text)) {
      return { kind: "new_conversation", confidence: 1, text };
    }
    if (/^(?:请问)?\s*(?:你能做什么|你会做什么|有哪些能力|怎么用你|如何使用(?:你|Syno))(?:[？?。！!])?$/u.test(text)) {
      return { kind: "show_capabilities", confidence: 1, text };
    }
    if (/^(?:待我确认的收录|有哪些收录待处理)(?:[？?。！!])?$/u.test(text)) {
      return { kind: "list_pending_capture", confidence: 1, text };
    }
    if (/^(?:收录状态|刚才的文件怎么样了|收录进度)(?:[？?。！!])?$/u.test(text)) {
      return { kind: "capture_status", confidence: 1, text };
    }
    const continuation = /^(?:继续|恢复)(?:刚才|这个|上次)?(?:的)?(?:第\s*)?(\d+)?\s*(?:项)?(?:收录|抓取)(?:吧|呢)?$/u.exec(text);
    if (continuation) {
      return {
        kind: "continue_browser_capture",
        confidence: 1,
        text,
        ...(continuation[1] ? { index: Number(continuation[1]) } : {}),
      };
    }
    if (/^(?:请)?\s*(?:关闭|清理)(?:刚才|这个|收录)?\s*(?:的)?\s*(?:浏览器)?标签(?:页)?(?:吧|呢)?$/u.test(text)) {
      return { kind: "close_capture_tabs", confidence: 1, text };
    }
    return { kind: "normal_conversation", confidence: 1, text };
  }
}

export { ChannelIntentRouter, INTENTS, normalizeText };
