import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { fetchSourceText, proxyRouteForUrl, requestOnce, resolvePublicAddress } from "../apps/syno/syno/source-fetcher.mjs";

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

// ---------- 代理感知（2026-09-22）：TUN/Fake-IP 环境域名交代理远端解析 ----------

test("proxyRouteForUrl picks the scheme proxy, honors NO_PROXY, and ignores unusable values", () => {
  const env = { HTTPS_PROXY: "http://127.0.0.1:7892", HTTP_PROXY: "http://127.0.0.1:7893", NO_PROXY: "localhost,127.0.0.1,::1" };
  assert.equal(proxyRouteForUrl(new URL("https://x.com/a"), env).proxyUrl.port, "7892");
  assert.equal(proxyRouteForUrl(new URL("http://example.com/"), env).proxyUrl.port, "7893");
  assert.equal(proxyRouteForUrl(new URL("https://localhost:8888/"), env).proxied, false);
  assert.equal(proxyRouteForUrl(new URL("https://x.com/"), {}).proxied, false);
  // 坏值与不支持 scheme 按直连处理，不为别的工具导出的变量抛错
  assert.equal(proxyRouteForUrl(new URL("https://x.com/"), { HTTPS_PROXY: "not a url" }).proxied, false);
  assert.equal(proxyRouteForUrl(new URL("https://x.com/"), { HTTPS_PROXY: "socks5://127.0.0.1:1080" }).proxied, false);
  assert.equal(proxyRouteForUrl(new URL("https://x.com/"), { ALL_PROXY: "http://127.0.0.1:7892" }).proxied, true);
  assert.equal(proxyRouteForUrl(new URL("https://x.com/"), { HTTPS_PROXY: "http://127.0.0.1:7892", NO_PROXY: "*" }).proxied, false);
  // 后缀匹配只认点前缀：example.com.evil.com 不得被 .example.com 误杀
  assert.equal(proxyRouteForUrl(new URL("https://api.internal.example/"), { HTTPS_PROXY: "http://127.0.0.1:7892", NO_PROXY: ".internal.example" }).proxied, false);
  assert.equal(proxyRouteForUrl(new URL("https://example.com.evil.example/"), { HTTPS_PROXY: "http://127.0.0.1:7892", NO_PROXY: ".evil.example" }).proxied, false);
  assert.equal(proxyRouteForUrl(new URL("https://evil.example.com/"), { HTTPS_PROXY: "http://127.0.0.1:7892", NO_PROXY: ".example.com" }).proxied, false);
  assert.equal(proxyRouteForUrl(new URL("https://notexample.com/"), { HTTPS_PROXY: "http://127.0.0.1:7892", NO_PROXY: ".example.com" }).proxied, true);
});

test("fetchSourceText routes a proxied hostname through the proxy without any local DNS lookup", async (t) => {
  const target = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("proxied body");
  });
  await new Promise((resolve) => target.listen(0, "127.0.0.1", resolve));
  t.after(() => target.close());

  // fake proxy：absolute-form 进来后固定转发到本地 target，模拟代理的远端解析。
  const received = [];
  const proxy = http.createServer((request, response) => {
    received.push({ url: request.url, host: request.headers.host });
    const upstream = http.request({
      host: "127.0.0.1",
      port: target.address().port,
      path: new URL(request.url).pathname,
      headers: { host: new URL(request.url).host },
    }, (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, { "content-type": upstreamResponse.headers["content-type"] || "text/plain" });
      upstreamResponse.pipe(response);
    });
    upstream.on("error", () => { response.writeHead(502); response.end(); });
    upstream.end();
  });
  await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  t.after(() => proxy.close());

  let lookups = 0;
  const result = await fetchSourceText("http://proxied.example/article", {
    proxyEnv: { HTTP_PROXY: `http://127.0.0.1:${proxy.address().port}` },
    lookup: async () => { lookups += 1; throw new Error("proxied hop must not resolve locally"); },
  });
  assert.equal(result.text, "proxied body");
  assert.equal(result.truncated, false);
  assert.equal(lookups, 0, "proxied 分支不得做本地 DNS");
  assert.equal(received.length, 1);
  assert.equal(received[0].url, "http://proxied.example/article", "代理应收到 absolute-form");
  assert.equal(received[0].host, "proxied.example", "host 头保留原站");
});

test("fetchSourceText never routes a literal private IP to the proxy", async () => {
  // 127.0.0.1:1 不可达：若字面 IP 误入代理分支，拿到的会是 ECONNREFUSED 而非 RESERVED。
  await assert.rejects(
    fetchSourceText("http://192.168.1.10/a", { proxyEnv: { HTTP_PROXY: "http://127.0.0.1:1" } }),
    (error) => error.code === "SOURCE_URL_RESERVED_ADDRESS" && error.retryable === true,
  );
  await assert.rejects(
    fetchSourceText("http://198.18.0.30/proxied-by-dns", { proxyEnv: { HTTP_PROXY: "http://127.0.0.1:1" } }),
    (error) => error.code === "SOURCE_URL_RESERVED_ADDRESS",
  );
});
