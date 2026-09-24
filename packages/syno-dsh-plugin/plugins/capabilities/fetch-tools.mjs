import { fetchUrlForChat } from "../../../../packages/syno-core/fetch-url-tool.mjs";

const FETCH_URL_TOOL_NAME = "syno_core_knowledge_fetch_url";

async function fetchKnowledgeUrl({ url, maxChars, fetcher = null, browserCapture = null } = {}) {
  const result = await fetchUrlForChat({
    url: String(url || ""),
    ...(maxChars ? { maxChars } : {}),
    ...(fetcher ? { fetcher } : {}),
    ...(browserCapture ? { browserCapture } : {}),
  });
  return JSON.stringify(result);
}

export { FETCH_URL_TOOL_NAME, fetchKnowledgeUrl };
