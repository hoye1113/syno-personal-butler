import { fetchUrlForChat } from "../../../../packages/syno-core/fetch-url-tool.mjs";
import { BrowserCaptureAdapter } from "../../../../packages/syno-core/browser-capture-adapter.mjs";
import { chatReadContext } from "./chat-session.mjs";

const FETCH_URL_TOOL_NAME = "syno_core_knowledge_fetch_url";

let sharedBrowserCapture;

// 浏览器适配器懒构造：构造本身不 spawn 进程，BSK 缺席/daemon 不可用时由共享库如实降级成
// browser_unavailable 文案（不抛、不假装读到正文）。测试可注入替身。
function browserCaptureFor(override) {
  if (override !== undefined) return override;
  if (!sharedBrowserCapture) sharedBrowserCapture = new BrowserCaptureAdapter();
  return sharedBrowserCapture;
}

async function fetchKnowledgeUrl({ url, maxChars, fetcher = null, sessionId = null, browserCapture, recordEvent = null } = {}) {
  // 活聊天会话才带浏览器升级与续抓身份；其余（主动运营、未知会话）保持旧行为：只直抓。
  const liveChat = chatReadContext(sessionId);
  try {
    const result = await fetchUrlForChat({
      url: String(url || ""),
      ...(maxChars ? { maxChars } : {}),
      ...(fetcher ? { fetcher } : {}),
      ...(liveChat ? { browserCapture: browserCaptureFor(browserCapture), context: liveChat } : {}),
      ...(recordEvent ? { recordEvent } : {}),
    });
    return JSON.stringify(result);
  } catch (error) {
    if (error?.code === "SOURCE_URL_RESERVED_ADDRESS") {
      throw Object.assign(
        new Error("该网址指向受保护地址，读取已拒绝；本次未保存续办，稍后可重新发送链接重试。"),
        { code: error.code, retryable: true },
      );
    }
    throw error;
  }
}

export { FETCH_URL_TOOL_NAME, fetchKnowledgeUrl };
