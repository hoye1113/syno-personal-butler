import { test } from "node:test";
import assert from "node:assert/strict";

import { fetchKnowledgeUrl } from "../packages/syno-dsh-plugin/plugins/capabilities/fetch-tools.mjs";

test("capabilities fetch url wraps the direct fetch result", async () => {
  const result = JSON.parse(await fetchKnowledgeUrl({
    url: "https://example.com/article",
    fetcher: async (target, { maxText } = {}) => ({
      url: String(target),
      contentType: "text/html",
      text: `示例正文内容（上限 ${maxText}）`,
      truncated: false,
    }),
  }));
  assert.equal(result.sourceUrl, "https://example.com/article");
  assert.equal(result.via, "direct");
  assert.equal(result.contentType, "text/html");
  assert.equal(result.truncated, false);
  assert.equal(result.redacted, false);
  assert.match(result.content, /示例正文内容/);
});

test("capabilities fetch url surfaces fetch failures instead of inventing content", async () => {
  await assert.rejects(
    fetchKnowledgeUrl({
      url: "https://example.com/blocked",
      fetcher: async () => { throw Object.assign(new Error("SSRF 拒绝"), { code: "SOURCE_URL_RESERVED_ADDRESS" }); },
    }),
    (error) => error.code === "SOURCE_URL_RESERVED_ADDRESS"
      && error.retryable === true
      && /受保护地址/.test(error.message),
  );
});

test("direct verification pages return a blocker rather than apparent article content", async () => {
  const result = JSON.parse(await fetchKnowledgeUrl({
    url: "https://mp.weixin.qq.com/s/example",
    fetcher: async (url) => ({ url, contentType: "text/html", text: "当前环境异常，完成验证后即可继续访问。去验证 ORIGINAL_WALL", truncated: false }),
  }));
  assert.equal(result.via, "direct");
  assert.equal(result.blocked, "verification_page");
  assert.match(result.content, /未取得.*正文/);
  assert.doesNotMatch(result.content, /ORIGINAL_WALL|回复.*继续/);
});

// ---------- 2026-10-16：浏览器升级接回插件路径（原 #20 能力，B3 迁移时延后） ----------

const WX_WALL = "当前环境异常，完成验证后即可继续访问。去验证";
const chanWallFetcher = async (url) => ({ url, contentType: "text/html", text: WX_WALL, truncated: false });
const LIVE_SESSION = `syno-main-${"a".repeat(32)}`;
const PROACTIVE_SESSION = `syno-proactive-${"b".repeat(32)}`;
const WEIXIN_SESSION = "weixin-local-user-2c1f4f2e-1f5b-4c8b-9a0e-3f6a7b8c9d0e";

function fakeAdapter(behavior = {}) {
  const calls = [];
  return {
    calls,
    observation: () => behavior.observation || null,
    async capture({ workflowId, exactUrl }) {
      calls.push({ workflowId, exactUrl });
      return behavior.capture;
    },
    async continue() {
      calls.push({ workflowId: "continue" });
      return behavior.continue;
    },
  };
}

test("live chat sessions escalate the verification wall to the local browser", async () => {
  const adapter = fakeAdapter({
    capture: { status: "completed", finalUrl: "https://mp.weixin.qq.com/s/abc", title: "吃透 AI Agent 开发", content: "公众号正文全文" },
  });
  const result = JSON.parse(await fetchKnowledgeUrl({
    url: "https://mp.weixin.qq.com/s/abc",
    sessionId: LIVE_SESSION,
    fetcher: chanWallFetcher,
    browserCapture: adapter,
  }));
  assert.equal(result.via, "browser");
  assert.equal(result.title, "吃透 AI Agent 开发");
  assert.match(result.content, /公众号正文全文/);
  assert.equal(adapter.calls.length, 1);
  assert.equal(adapter.calls[0].exactUrl, "https://mp.weixin.qq.com/s/abc");
  assert.match(adapter.calls[0].workflowId, /^workflow-chatread-[0-9a-f]{16}$/);
  // 同会话同 URL 的 workflowId 确定不变（「继续」原地续抓的前提）
  await fetchKnowledgeUrl({ url: "https://mp.weixin.qq.com/s/abc", sessionId: LIVE_SESSION, fetcher: chanWallFetcher, browserCapture: adapter });
  assert.equal(new Set(adapter.calls.map((call) => call.workflowId)).size, 1);
});

test("DSH weixin channel sessions count as live chat too", async () => {
  const adapter = fakeAdapter({ capture: { status: "completed", finalUrl: "https://example.com/a", title: "t", content: "正文" } });
  const result = JSON.parse(await fetchKnowledgeUrl({
    url: "https://example.com/a",
    sessionId: WEIXIN_SESSION,
    fetcher: chanWallFetcher,
    browserCapture: adapter,
  }));
  assert.equal(result.via, "browser");
  assert.equal(adapter.calls.length, 1);
});

test("proactive, job-unknown and missing session ids never open the browser", async () => {
  for (const sessionId of [PROACTIVE_SESSION, "session-1c2d3e", null]) {
    const adapter = fakeAdapter({ capture: { status: "completed", title: "t", content: "不该出现" } });
    const result = JSON.parse(await fetchKnowledgeUrl({
      url: "https://mp.weixin.qq.com/s/abc",
      sessionId,
      fetcher: chanWallFetcher,
      browserCapture: adapter,
    }));
    assert.equal(result.via, "direct", `session=${sessionId} 不得升级`);
    assert.equal(result.blocked, "verification_page");
    assert.equal(adapter.calls.length, 0, `session=${sessionId} 不得调用浏览器`);
    assert.doesNotMatch(result.content, /不该出现/);
  }
});

test("live chat chat degrades honestly when the browser daemon is unavailable", async () => {
  const adapter = fakeAdapter({ capture: { status: "unavailable", error: { code: "BROWSER_DAEMON_UNAVAILABLE", message: "daemon 未运行" } } });
  const result = JSON.parse(await fetchKnowledgeUrl({
    url: "https://mp.weixin.qq.com/s/abc",
    sessionId: LIVE_SESSION,
    fetcher: chanWallFetcher,
    browserCapture: adapter,
  }));
  assert.equal(result.via, "browser");
  assert.equal(result.blocked, "browser_unavailable");
  assert.match(result.content, /daemon 未运行/);
});

test("clean pages stay on the direct path even in a live chat session", async () => {
  const adapter = fakeAdapter({ capture: { status: "completed", title: "t", content: "不该出现" } });
  const result = JSON.parse(await fetchKnowledgeUrl({
    url: "https://example.com/clean",
    sessionId: LIVE_SESSION,
    fetcher: async (url) => ({ url, contentType: "text/html", text: "正常正文内容", truncated: false }),
    browserCapture: adapter,
  }));
  assert.equal(result.via, "direct");
  assert.equal(adapter.calls.length, 0);
  assert.match(result.content, /正常正文内容/);
});
