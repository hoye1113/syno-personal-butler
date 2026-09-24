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
        new Error("当前本机网络把该网址解析为受保护地址，读取被拒绝；续办重试随通道迁移接入。"),
        { code: error.code, retryable: true },
      );
    }
    throw error;
  }
}

export { FETCH_URL_TOOL_NAME, fetchKnowledgeUrl };
