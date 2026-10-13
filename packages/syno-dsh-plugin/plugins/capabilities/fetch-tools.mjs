import { fetchUrlForChat } from "../../../../packages/syno-core/fetch-url-tool.mjs";

const FETCH_URL_TOOL_NAME = "syno_core_knowledge_fetch_url";

async function fetchKnowledgeUrl({ url, maxChars, fetcher = null } = {}) {
  try {
    const result = await fetchUrlForChat({
      url: String(url || ""),
      ...(maxChars ? { maxChars } : {}),
      ...(fetcher ? { fetcher } : {}),
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
