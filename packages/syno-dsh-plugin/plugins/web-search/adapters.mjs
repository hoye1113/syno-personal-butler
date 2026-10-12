// Syno 搜索 provider 适配器：豆包搜索（火山引擎）/ Tavily / Exa。
// 纯数据层，无 DSH 依赖，便于单元测试；错误分类通过注入的 errors 工厂完成
// （生产由 index.mjs 注入 WebError，测试注入本地错误类）。
//
// 路由：查询含 CJK 字符时优先豆包（中文/国内），否则优先 Tavily；失败或空结果
// 按链顺序确定性回退，全部失败抛 provider error，全部空结果返回空 sources。

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RESULTS = 8;
const SNIPPET_MAX_CHARS = 1_000;
const USER_AGENT = "syno-personal-butler/1.0 (local butler web search)";

const DOUBAO_BASE_URL = "https://open.feedcoopapi.com";
const TAVILY_BASE_URL = "https://api.tavily.com";
const EXA_BASE_URL = "https://api.exa.ai";

const CN_FIRST_ORDER = Object.freeze(["doubao", "tavily", "exa"]);
const EN_FIRST_ORDER = Object.freeze(["tavily", "exa", "doubao"]);

class SearchProviderError extends Error {
  constructor(message, code, options) {
    super(message, options);
    this.name = "SearchProviderError";
    this.code = code;
  }
}

const defaultErrors = Object.freeze({
  providerError: (message, cause) => new SearchProviderError(message, "WEB_PROVIDER_ERROR", cause ? { cause } : undefined),
  aborted: (cause) => new SearchProviderError("搜索已取消", "WEB_ABORTED", cause ? { cause } : undefined),
});

function clampCount(value, fallback, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) return fallback;
  return Math.min(Math.floor(number), max);
}

function firstText(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

/** 截断到上限且不切开代理对（避免产生孤立 surrogate）。 */
function truncateSafely(text, maxChars) {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const last = cut.charCodeAt(cut.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}

function snippetOf(...values) {
  const text = firstText(...values);
  if (text === undefined) return undefined;
  return truncateSafely(text.replace(/\s+/g, " "), SNIPPET_MAX_CHARS);
}

async function fetchJson(fetchImpl, url, init, { signal, timeoutMs, provider, errors }) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  let response;
  try {
    response = await fetchImpl(url, { ...init, signal: combined });
  } catch (error) {
    if (signal?.aborted) throw errors.aborted(signal.reason ?? error);
    throw errors.providerError(`${provider} 请求失败：${error?.message ?? error}`, error);
  }
  let text = "";
  try {
    text = await response.text();
  } catch (error) {
    if (signal?.aborted) throw errors.aborted(signal.reason ?? error);
    throw errors.providerError(`${provider} 响应读取失败：${error?.message ?? error}`, error);
  }
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    const detail = firstText(body?.message, body?.error, body?.detail) ?? text.slice(0, 200);
    throw errors.providerError(`${provider} HTTP ${response.status}${detail ? `：${detail}` : ""}`);
  }
  return body;
}

/** 豆包搜索（火山引擎）响应归一化：Result.WebResults[]。 */
function normalizeDoubao(json) {
  const items = Array.isArray(json?.Result?.WebResults) ? json.Result.WebResults : [];
  const sources = [];
  for (const item of items) {
    const url = firstText(item?.Url, item?.url);
    if (url === undefined) continue;
    const title = firstText(item?.Title, item?.title);
    const snippet = snippetOf(item?.Snippet, item?.Summary, item?.Content);
    const publishedAt = firstText(item?.PublishTime, item?.publishTime);
    sources.push({
      url,
      ...title === undefined ? {} : { title },
      ...snippet === undefined ? {} : { snippet },
      ...publishedAt === undefined ? {} : { publishedAt },
    });
  }
  return { sources, truncated: false };
}

/** Tavily 响应归一化：results[]（片段取 content）。 */
function normalizeTavily(json) {
  const items = Array.isArray(json?.results) ? json.results : [];
  const sources = [];
  for (const item of items) {
    const url = firstText(item?.url);
    if (url === undefined) continue;
    const title = firstText(item?.title);
    const snippet = snippetOf(item?.content);
    const publishedAt = firstText(item?.published_date);
    sources.push({
      url,
      ...title === undefined ? {} : { title },
      ...snippet === undefined ? {} : { snippet },
      ...publishedAt === undefined ? {} : { publishedAt },
    });
  }
  return { sources, truncated: false };
}

/** Exa 响应归一化：results[]（片段取第一条非空 highlight，无 highlight 的条目丢弃）。 */
function normalizeExa(json) {
  const items = Array.isArray(json?.results) ? json.results : [];
  const sources = [];
  for (const item of items) {
    const url = firstText(item?.url);
    if (url === undefined) continue;
    const highlight = Array.isArray(item?.highlights)
      ? item.highlights.find((value) => typeof value === "string" && value.trim().length > 0)
      : undefined;
    const snippet = snippetOf(highlight, item?.text);
    if (snippet === undefined) continue;
    const title = firstText(item?.title);
    const publishedAt = firstText(item?.publishedDate);
    sources.push({
      url,
      ...title === undefined ? {} : { title },
      snippet,
      ...publishedAt === undefined ? {} : { publishedAt },
    });
  }
  return { sources, truncated: false };
}

function createDoubaoAdapter({ apiKey, fetchImpl, baseURL = DOUBAO_BASE_URL, timeoutMs, errors }) {
  return {
    id: "doubao",
    available: () => Boolean(apiKey),
    async search(request, signal) {
      const count = clampCount(request?.maxResults, DEFAULT_RESULTS, 50);
      const body = await fetchJson(fetchImpl, `${baseURL}/search_api/web_search`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
          "user-agent": USER_AGENT,
        },
        body: JSON.stringify({
          // 火山 API 约束：Query 1~100 字符；超长静默截断以防 10400。
          Query: String(request?.query ?? "").slice(0, 100),
          SearchType: "web",
          Count: count,
          NeedSummary: true,
        }),
      }, { signal, timeoutMs, provider: "豆包搜索", errors });
      return normalizeDoubao(body);
    },
  };
}

function createTavilyAdapter({ apiKey, fetchImpl, baseURL = TAVILY_BASE_URL, timeoutMs, errors }) {
  return {
    id: "tavily",
    available: () => Boolean(apiKey),
    async search(request, signal) {
      const maxResults = clampCount(request?.maxResults, DEFAULT_RESULTS, 20);
      const body = await fetchJson(fetchImpl, `${baseURL}/search`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          query: String(request?.query ?? ""),
          max_results: maxResults,
          search_depth: "basic",
        }),
      }, { signal, timeoutMs, provider: "Tavily", errors });
      return normalizeTavily(body);
    },
  };
}

function createExaAdapter({ apiKey, fetchImpl, baseURL = EXA_BASE_URL, timeoutMs, errors }) {
  return {
    id: "exa",
    available: () => Boolean(apiKey),
    async search(request, signal) {
      const numResults = clampCount(request?.maxResults, DEFAULT_RESULTS, 20);
      const body = await fetchJson(fetchImpl, `${baseURL}/search`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "user-agent": USER_AGENT,
        },
        body: JSON.stringify({
          query: String(request?.query ?? ""),
          numResults,
          contents: { highlights: { highlightsPerUrl: 1 } },
        }),
      }, { signal, timeoutMs, provider: "Exa", errors });
      return normalizeExa(body);
    },
  };
}

function isCjkQuery(query) {
  return /[\u3400-\u9FFF\uF900-\uFAFF]/u.test(String(query ?? ""));
}

/** 按查询语言与已配置 provider 解析尝试顺序；自定义链作为前缀，其余按默认顺序补齐。 */
function resolveOrder({ query, configuredIds, customChain }) {
  const preferred = isCjkQuery(query) ? CN_FIRST_ORDER : EN_FIRST_ORDER;
  const base = Array.isArray(customChain) && customChain.length > 0 ? customChain : preferred;
  const order = [];
  for (const id of base) {
    if (configuredIds.has(id) && !order.includes(id)) order.push(id);
  }
  for (const id of preferred) {
    if (configuredIds.has(id) && !order.includes(id)) order.push(id);
  }
  return order;
}

/**
 * 创建 Syno 组合搜索 provider（id `syno-search`）。
 * @param {object} options
 * @param {Record<string, string|undefined>} [options.env] - 读取三个 key 与可选自定义链的环境变量表。
 * @param {Function} [options.fetchImpl] - 注入的 fetch（测试用）。
 * @param {string} [options.chain] - 自定义链（如 "exa,tavily"）；缺省按语言路由。
 * @param {object} [options.errors] - 错误工厂 `{ providerError, aborted }`。
 * @param {number} [options.timeoutMs] - 单次 provider 请求超时（默认 15s）。
 */
function createSynoSearchProvider({ env = process.env, fetchImpl = fetch, chain, errors = defaultErrors, timeoutMs } = {}) {
  const adapters = [
    createDoubaoAdapter({ apiKey: String(env.DOUBAO_SEARCH_API_KEY ?? "").trim(), fetchImpl, timeoutMs, errors }),
    createTavilyAdapter({ apiKey: String(env.TAVILY_API_KEY ?? "").trim(), fetchImpl, timeoutMs, errors }),
    createExaAdapter({ apiKey: String(env.EXA_API_KEY ?? "").trim(), fetchImpl, timeoutMs, errors }),
  ].filter((adapter) => adapter.available());
  const configuredIds = new Set(adapters.map((adapter) => adapter.id));
  const customChain = firstText(chain)?.split(",").map((id) => id.trim()).filter(Boolean);
  const adapterById = new Map(adapters.map((adapter) => [adapter.id, adapter]));

  return {
    id: "syno-search",
    available: () => adapters.length > 0,
    async search(request, signal) {
      const order = resolveOrder({ query: request?.query, configuredIds, customChain });
      if (order.length === 0) {
        throw errors.providerError("未配置任何搜索 provider（DOUBAO_SEARCH_API_KEY / TAVILY_API_KEY / EXA_API_KEY）");
      }
      let lastError;
      let lastEmpty;
      for (const id of order) {
        if (signal?.aborted) throw errors.aborted(signal.reason);
        try {
          const result = await adapterById.get(id).search(request, signal);
          if (result.sources.length > 0) return result;
          lastEmpty = result;
        } catch (error) {
          if (signal?.aborted) throw errors.aborted(signal.reason ?? error);
          lastError = error;
        }
      }
      if (lastEmpty !== undefined) return lastEmpty;
      throw errors.providerError(`全部搜索 provider 失败：${lastError?.message ?? "unknown"}`, lastError);
    },
  };
}

export {
  SearchProviderError,
  createSynoSearchProvider,
  isCjkQuery,
  normalizeDoubao,
  normalizeExa,
  normalizeTavily,
};
