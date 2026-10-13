import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import test from "node:test";

import {
  SearchProviderError,
  createSynoSearchProvider,
  isCjkQuery,
  normalizeDoubao,
  normalizeExa,
  normalizeTavily,
} from "../packages/syno-dsh-plugin/plugins/web-search/adapters.mjs";

const KEYS = Object.freeze({
  DOUBAO_SEARCH_API_KEY: "doubao-test-key",
  TAVILY_API_KEY: "tavily-test-key",
  EXA_API_KEY: "exa-test-key",
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function makeFetch(routes) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url: String(url), init });
    const route = routes.find((candidate) => String(url).startsWith(candidate.match));
    if (!route) throw new Error(`unexpected fetch: ${url}`);
    return typeof route.reply === "function" ? route.reply(url, init) : route.reply;
  };
  return { impl, calls };
}

const DOUBAO_OK = () => jsonResponse({
  Result: {
    ResultCount: 2,
    WebResults: [
      { Title: "豆包标题", Url: "https://doubao.example/a", Snippet: "豆包片段", PublishTime: "2026-10-01T00:00:00+08:00" },
      { Title: "无链接条目" },
    ],
  },
});
const TAVILY_OK = () => jsonResponse({
  results: [
    { title: "Tavily 标题", url: "https://tavily.example/a", content: "Tavily 内容", published_date: "2026-10-02" },
  ],
});
const EXA_OK = () => jsonResponse({
  results: [
    { title: "Exa 标题", url: "https://exa.example/a", highlights: ["Exa 高亮"], publishedDate: "2026-10-03" },
    { title: "无高亮条目", url: "https://exa.example/b", highlights: [] },
  ],
});

test("normalizeDoubao maps Result.WebResults and drops entries without a URL", () => {
  const result = normalizeDoubao({
    Result: {
      WebResults: [
        { Title: "T", Url: "https://a.example", Snippet: "S", PublishTime: "2026-10-01" },
        { Title: "no-url" },
      ],
    },
  });
  assert.deepEqual(result, {
    sources: [{ url: "https://a.example", title: "T", snippet: "S", publishedAt: "2026-10-01" }],
    truncated: false,
  });
});

test("normalizeTavily maps results with content as snippet", () => {
  const result = normalizeTavily({ results: [{ title: "T", url: "https://b.example", content: "C" }] });
  assert.deepEqual(result.sources, [{ url: "https://b.example", title: "T", snippet: "C" }]);
});

test("normalizeExa keeps the first non-blank highlight and drops highlight-less entries", () => {
  const result = normalizeExa({
    results: [
      { title: "T", url: "https://c.example", highlights: [" ", "H"], publishedDate: "2026-10-03" },
      { title: "drop", url: "https://c.example/2", highlights: [] },
    ],
  });
  assert.deepEqual(result.sources, [{ url: "https://c.example", title: "T", snippet: "H", publishedAt: "2026-10-03" }]);
});

test("isCjkQuery distinguishes Chinese from English queries", () => {
  assert.equal(isCjkQuery("今天的 AI 新闻"), true);
  assert.equal(isCjkQuery("latest AI news"), false);
});

test("snippet truncation never splits a surrogate pair", () => {
  const long = `${"a".repeat(999)}😀tail`;
  const result = normalizeExa({ results: [{ title: "T", url: "https://d.example", highlights: [long] }] });
  const snippet = result.sources[0].snippet;
  assert.equal(snippet.length, 999);
  assert.equal(/[\uD800-\uDFFF]/.test(snippet), false);
});

test("plugin entry keeps its DSH import optional for relative-path loading", async () => {
  // JSON-RPC 回退面以相对路径加载本插件，没有 bundle linked-root 的 peer 拦截：
  // 静态 bare import 会让插件整块加载失败（2026-10-12 实测 "failed to import"）。
  const source = await fs.readFile(
    "packages/syno-dsh-plugin/plugins/web-search/index.mjs",
    "utf8",
  );
  assert.doesNotMatch(source, /^import\s[^\n]*from\s+["']@deepseek-ai\//m);
  assert.match(source, /await import\("@deepseek-ai\/dsh-web"\)/);
});

test("provider stays available without keys through its anonymous fallback", async () => {
  const provider = createSynoSearchProvider({ env: {}, fetchImpl: async () => jsonResponse({}) });
  assert.equal(provider.available(), true);
  await assert.rejects(() => provider.search({ query: "x" }), (error) => error.code === "WEB_PROVIDER_ERROR");
});

test("Chinese queries prefer doubao and send the PascalCase request", async () => {
  const { impl, calls } = makeFetch([{ match: "https://open.feedcoopapi.com", reply: DOUBAO_OK }]);
  const provider = createSynoSearchProvider({ env: KEYS, fetchImpl: impl, timeoutMs: 5_000 });
  const result = await provider.search({ query: "今天的 AI 新闻", maxResults: 3 });
  assert.equal(result.sources[0].url, "https://doubao.example/a");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.headers.authorization, "Bearer doubao-test-key");
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body, { Query: "今天的 AI 新闻", SearchType: "web", Count: 3, NeedSummary: true });
});

test("English queries prefer tavily", async () => {
  const { impl, calls } = makeFetch([
    { match: "https://open.feedcoopapi.com", reply: DOUBAO_OK },
    { match: "https://api.tavily.com", reply: TAVILY_OK },
  ]);
  const provider = createSynoSearchProvider({ env: KEYS, fetchImpl: impl, timeoutMs: 5_000 });
  const result = await provider.search({ query: "latest AI news" });
  assert.equal(result.sources[0].url, "https://tavily.example/a");
  assert.equal(calls[0].url, "https://api.tavily.com/search");
});

test("a failing provider falls through to the next configured provider", async () => {
  const { impl, calls } = makeFetch([
    { match: "https://open.feedcoopapi.com", reply: () => jsonResponse({ message: "额度耗尽" }, 500) },
    { match: "https://api.tavily.com", reply: TAVILY_OK },
  ]);
  const provider = createSynoSearchProvider({ env: KEYS, fetchImpl: impl, timeoutMs: 5_000 });
  const result = await provider.search({ query: "中文查询" });
  assert.equal(result.sources[0].url, "https://tavily.example/a");
  assert.deepEqual(calls.map((call) => new URL(call.url).host), ["open.feedcoopapi.com", "api.tavily.com"]);
});

test("an empty result falls through to the next provider", async () => {
  const { impl } = makeFetch([
    { match: "https://open.feedcoopapi.com", reply: jsonResponse({ Result: { WebResults: [] } }) },
    { match: "https://api.tavily.com", reply: TAVILY_OK },
  ]);
  const provider = createSynoSearchProvider({ env: KEYS, fetchImpl: impl, timeoutMs: 5_000 });
  const result = await provider.search({ query: "中文查询" });
  assert.equal(result.sources[0].url, "https://tavily.example/a");
});

test("all-empty results return an empty source list instead of throwing", async () => {
  const { impl } = makeFetch([
    { match: "https://open.feedcoopapi.com", reply: jsonResponse({ Result: { WebResults: [] } }) },
    { match: "https://api.tavily.com", reply: jsonResponse({ results: [] }) },
    { match: "https://api.exa.ai", reply: jsonResponse({ results: [] }) },
  ]);
  const provider = createSynoSearchProvider({ env: KEYS, fetchImpl: impl, timeoutMs: 5_000 });
  const result = await provider.search({ query: "中文查询" });
  assert.deepEqual(result, { sources: [], truncated: false });
});

test("all-failing providers throw the injected provider error with the last cause", async () => {
  const seen = [];
  const errors = {
    providerError: (message, cause) => {
      seen.push(message);
      return new SearchProviderError(message, "WEB_PROVIDER_ERROR", cause ? { cause } : undefined);
    },
    aborted: (cause) => new SearchProviderError("搜索已取消", "WEB_ABORTED", cause ? { cause } : undefined),
  };
  const { impl } = makeFetch([
    { match: "https://open.feedcoopapi.com", reply: () => jsonResponse({}, 502) },
    { match: "https://api.tavily.com", reply: () => jsonResponse({}, 503) },
    { match: "https://api.exa.ai", reply: () => jsonResponse({}, 504) },
  ]);
  const provider = createSynoSearchProvider({ env: KEYS, fetchImpl: impl, errors, timeoutMs: 5_000 });
  await assert.rejects(
    () => provider.search({ query: "全网查询" }),
    (error) => error.code === "WEB_PROVIDER_ERROR" && /全部搜索 provider 失败/.test(error.message),
  );
  assert.ok(seen.some((message) => /豆包搜索 HTTP 502/.test(message)));
  assert.ok(seen.some((message) => /Tavily HTTP 503/.test(message)));
});

test("a custom chain prefix is tried first", async () => {
  const { impl, calls } = makeFetch([
    { match: "https://api.exa.ai", reply: EXA_OK },
    { match: "https://open.feedcoopapi.com", reply: DOUBAO_OK },
  ]);
  const provider = createSynoSearchProvider({ env: KEYS, fetchImpl: impl, chain: "exa", timeoutMs: 5_000 });
  const result = await provider.search({ query: "中文查询" });
  assert.equal(calls[0].url, "https://api.exa.ai/search");
  assert.equal(result.sources[0].url, "https://exa.example/a");
});

test("an aborted caller signal surfaces as an aborted error", async () => {
  const controller = new AbortController();
  const hanging = (url, init) => new Promise((_, reject) => {
    init.signal.addEventListener("abort", () => reject(init.signal.reason ?? new Error("aborted")), { once: true });
  });
  const provider = createSynoSearchProvider({ env: KEYS, fetchImpl: hanging, timeoutMs: 5_000 });
  const pending = provider.search({ query: "中文查询" }, controller.signal);
  controller.abort();
  await assert.rejects(pending, (error) => error.code === "WEB_ABORTED");
});

test("search that starts aborted never calls a provider", async () => {
  const controller = new AbortController();
  controller.abort();
  const { impl, calls } = makeFetch([{ match: "https://open.feedcoopapi.com", reply: DOUBAO_OK }]);
  const provider = createSynoSearchProvider({ env: KEYS, fetchImpl: impl, timeoutMs: 5_000 });
  await assert.rejects(() => provider.search({ query: "中文查询" }, controller.signal), (error) => error.code === "WEB_ABORTED");
  assert.equal(calls.length, 0);
});
