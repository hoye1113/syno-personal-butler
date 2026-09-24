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
