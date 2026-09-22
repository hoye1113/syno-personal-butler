import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { fetchSourceText, requestOnce, resolvePublicAddress } from "../apps/syno/syno/source-fetcher.mjs";

test("requestOnce supports Node all-address lookup callbacks", async (t) => {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("source body");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const { port } = server.address();
  const result = await requestOnce(
    new URL(`http://example.com:${port}/article`),
    { address: "127.0.0.1", family: 4 },
  );

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.toString("utf8"), "source body");
});

// 生产形态（2026-09）：本机代理把 x.com 等公开域名 DNS 重写进 198.18.0.0/15 Fake-IP 段。
// 该错误必须结构化（code + retryable + diagnostic），聊天层才能把它讲成「本机解析异常，回复继续可重试」，
// 而不是笼统抓取失败；同时它绝不能被当作反爬墙去触发浏览器升级（SSRF 判定不可绕过）。
test("resolvePublicAddress structures Fake-IP DNS rewrites as a retryable diagnostic", async () => {
  const fakeLookup = async () => [{ address: "198.18.0.15", family: 4 }];
  await assert.rejects(
    resolvePublicAddress(new URL("https://x.com/someone/status/1"), fakeLookup),
    (error) => {
      assert.equal(error.code, "SOURCE_URL_RESERVED_ADDRESS");
      assert.equal(error.retryable, true);
      assert.equal(error.diagnostic, "dns_reserved_address");
      return true;
    },
  );
});

test("resolvePublicAddress rejects literal private and loopback IPs without a lookup", async () => {
  let lookups = 0;
  const spyLookup = async () => { lookups += 1; return [{ address: "93.184.216.34", family: 4 }]; };
  for (const literal of ["http://192.168.1.10/a", "http://127.0.0.1:8888/", "http://[::1]/x"]) {
    await assert.rejects(
      resolvePublicAddress(new URL(literal), spyLookup),
      (error) => error.code === "SOURCE_URL_RESERVED_ADDRESS" && error.retryable === true,
    );
  }
  assert.equal(lookups, 0);
});

test("resolvePublicAddress accepts publicly resolving hosts and mixed-record rejection stays safe", async () => {
  const publicOnly = await resolvePublicAddress(
    new URL("https://example.com/a"),
    async () => [{ address: "93.184.216.34", family: 4 }],
  );
  assert.equal(publicOnly.address, "93.184.216.34");
  // 任一记录落私网即整体拒绝：不能让攻击者用「公网+私网」混合解析夹带内网地址。
  await assert.rejects(
    resolvePublicAddress(new URL("https://example.com/a"), async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.7", family: 4 },
    ]),
    (error) => error.code === "SOURCE_URL_RESERVED_ADDRESS",
  );
});

test("fetchSourceText surfaces the reserved-address code before any network request", async () => {
  await assert.rejects(
    fetchSourceText("http://198.18.0.20/proxied"),
    (error) => error.code === "SOURCE_URL_RESERVED_ADDRESS" && error.retryable === true,
  );
});
