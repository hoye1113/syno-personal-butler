import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

import { createSynoRuntime, routeSynoApi } from "./syno/runtime.mjs";
import { isAllowedSynoApiPath } from "./syno/server-api-allowlist.mjs";
import { DEFAULT_WEB_PORT, PATHS } from "../../packages/syno-core/paths.mjs";
import { ProcessFileLock } from "../../packages/syno-core/process-lock.mjs";
import { readinessHttpStatus } from "./syno/server-readiness.mjs";

const PORT = Number(process.env.PORT || DEFAULT_WEB_PORT);
const fingerprint = createHash("sha256").update(path.resolve(PATHS.repoRoot).toLocaleLowerCase("en-US"), "utf8").digest("hex").slice(0, 16);
const hostLease = await new ProcessFileLock({
  file: path.join(PATHS.stateRoot, "locks", "syno-host.lock"), failFast: true,
  metadata: { instanceId: randomUUID(), repoFingerprint: fingerprint, entrypoint: "apps/syno/server.mjs" },
}).acquire();
const runtime = createSynoRuntime();

function isLoopback(req) { return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(String(req.socket.remoteAddress || "")); }
// DNS 重绑定防御：浏览器可能被诱导入以 attacker.com 的 Host 访问 127.0.0.1，此时
// remoteAddress 仍是 loopback。Host 白名单与旧工作台的 assertLocalRequest 对齐。
const HOST_WHITELIST = /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/;
function isLocalHostHeader(req) { return HOST_WHITELIST.test(String(req.headers?.host || "").toLowerCase()); }
async function readJson(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  if (!body) return {};
  try { return JSON.parse(body); } catch { throw Object.assign(new Error("JSON 请求体无效"), { statusCode: 400 }); }
}
function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'" });
  res.end(body);
}

// 维护页脚本与样式走同源静态路由：CSP 的 script-src/style-src 'self' 会阻止任何
// inline 块，内联进 HTML 等于让页面自锁（按钮无响应），因此保持外链。
const QR_PAGE = `<!doctype html><meta charset="utf-8"><title>Syno 微信重绑</title><link rel="stylesheet" href="/maintenance/weixin.css"><h1>微信重绑</h1><p id="state">仅用于扫码绑定；完成后请关闭此页。</p><button id="start">开始扫码</button><p><img id="qr" hidden alt="微信扫码二维码"></p><script src="/maintenance/weixin.js" defer></script>`;
const QR_CSS = "body{font:16px system-ui;max-width:420px;margin:48px auto;padding:0 18px}img{max-width:320px}button{padding:9px 14px}";
const QR_JS = `const state = document.querySelector("#state");
const qr = document.querySelector("#qr");
let timer;
async function call(path) {
  const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  return response.json();
}
document.querySelector("#start").onclick = async () => {
  try {
    const started = await call("/maintenance/weixin/start");
    qr.src = started.imageUrl;
    qr.hidden = false;
    state.textContent = "请用微信扫码确认。";
    timer = setInterval(async () => {
      const polled = await call("/maintenance/weixin/poll");
      state.textContent = polled.status === "confirmed" ? "已连接，可关闭此页。" : ("等待确认：" + polled.status);
      if (polled.status === "confirmed") { clearInterval(timer); await call("/maintenance/weixin/connect"); }
    }, 2000);
  } catch { state.textContent = "重绑未开始，请稍后重试。"; }
};
`;

const maintenance = Object.freeze({ "/maintenance/weixin/start": "/api/syno/weixin/login/start", "/maintenance/weixin/poll": "/api/syno/weixin/login/poll", "/maintenance/weixin/connect": "/api/syno/weixin/connect" });
const server = createServer(async (req, res) => {
  try {
    if (!isLoopback(req) || !isLocalHostHeader(req)) return send(res, 403, JSON.stringify({ error: "loopback_only" }));
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/maintenance/weixin") return send(res, 200, QR_PAGE, "text/html; charset=utf-8");
    if (req.method === "GET" && url.pathname === "/maintenance/weixin.css") return send(res, 200, QR_CSS, "text/css; charset=utf-8");
    if (req.method === "GET" && url.pathname === "/maintenance/weixin.js") return send(res, 200, QR_JS, "text/javascript; charset=utf-8");
    const routed = maintenance[url.pathname] || url.pathname;
    if (!isAllowedSynoApiPath(routed)) return send(res, 404, JSON.stringify({ error: "not_found" }));
    const apiUrl = new URL(routed, url);
    const value = await routeSynoApi(runtime, req, apiUrl, readJson);
    return send(res, routed === "/api/syno/readiness" ? readinessHttpStatus(runtime.lifecycle().state) : 200, JSON.stringify(value));
  } catch (error) { return send(res, error.statusCode || (error.code === "SYNO_BRIDGE_UNAUTHORIZED" ? 401 : 500), JSON.stringify({ error: error.code || "host_error", message: error.message })); }
});
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(PORT, "127.0.0.1", resolve); }).catch(async (error) => { await runtime.close().catch(() => {}); await hostLease.release(); throw error; });
console.log(`Syno headless Host listening on 127.0.0.1:${PORT}`);
const ready = runtime.initialize({ worker: true });
ready.catch(async (error) => { console.error("[syno] Runtime 初始化失败:", String(error?.message || error)); await shutdown(); process.exitCode = 1; });
let closing = null;
async function shutdown() { if (closing) return closing; closing = (async () => { await new Promise((resolve) => server.close(resolve)); await runtime.close(); await hostLease.release(); })(); return closing; }
process.once("SIGINT", shutdown); process.once("SIGTERM", shutdown);
