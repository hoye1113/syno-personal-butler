import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { createSynoRuntime, routeSynoApi } from "./syno/runtime.mjs";
import { isAllowedSynoApiPath } from "./syno/server-api-allowlist.mjs";
import { DEFAULT_WEB_PORT, PATHS } from "../../packages/syno-core/paths.mjs";
import { ProcessFileLock } from "../../packages/syno-core/process-lock.mjs";
import { repoFingerprintFor } from "../../packages/syno-core/repo-fingerprint.mjs";
import { readinessHttpStatus } from "./syno/server-readiness.mjs";

const PORT = Number(process.env.PORT || DEFAULT_WEB_PORT);
const fingerprint = repoFingerprintFor(PATHS.repoRoot);
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

const server = createServer(async (req, res) => {
  try {
    if (!isLoopback(req) || !isLocalHostHeader(req)) return send(res, 403, JSON.stringify({ error: "loopback_only" }));
    const url = new URL(req.url || "/", "http://127.0.0.1");
    // 微信重绑维护页已随微信通道栈删除（2026-10-16）；飞书注册走 /api/syno/feishu/register/*。
    const routed = url.pathname;
    if (!isAllowedSynoApiPath(routed)) return send(res, 404, JSON.stringify({ error: "not_found" }));
    const apiUrl = new URL(routed, url);
    const value = await routeSynoApi(runtime, req, apiUrl, readJson);
    return send(res, routed === "/api/syno/readiness" ? readinessHttpStatus(runtime.lifecycle().state) : 200, JSON.stringify(value));
  } catch (error) { return send(res, error.statusCode || (error.code === "SYNO_BRIDGE_UNAUTHORIZED" ? 401 : 500), JSON.stringify({ error: error.code || "host_error", message: error.message })); }
});
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(PORT, "127.0.0.1", resolve); }).catch(async (error) => { await runtime.close().catch(() => {}); await hostLease.release(); throw error; });
console.log(`Syno headless Host listening on 127.0.0.1:${PORT}`);
const ready = runtime.initialize({ worker: true });
ready.catch(async (error) => { console.error("[syno] Runtime 初始化失败:", String(error?.message || error)); try { await shutdown(); process.exitCode = 1; } catch (shutdownError) { console.error("[syno] shutdown failed:", shutdownError.code || "HOST_SHUTDOWN_FAILED"); } });
let closing = null;
async function shutdown() { if (closing) return closing; closing = (async () => { await runtime.close(); await new Promise((resolve) => server.close(resolve)); await hostLease.release(); })().catch((error) => { closing = null; throw error; }); return closing; }
const shutdownOnSignal = () => { void shutdown().catch((error) => { console.error("[syno] shutdown failed:", error.code || "HOST_SHUTDOWN_FAILED"); }); };
process.on("SIGINT", shutdownOnSignal); process.on("SIGTERM", shutdownOnSignal);
