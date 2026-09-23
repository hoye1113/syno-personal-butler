import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";

import { isAllowedSynoApiPath } from "../apps/syno/syno/server-api-allowlist.mjs";
import { CHANNELS_API_PATH, getRunningChannelStatus } from "../scripts/live-channel-probe-runtime.mjs";
import { main as runFeishuProbe, parseOptions as parseFeishuOptions, summarizeFeishu } from "../scripts/probe-feishu.mjs";
import { main as runWeixinProbe, parseOptions as parseWeixinOptions, summarizeWeixin } from "../scripts/probe-weixin.mjs";

test("live channel probes require confirmation and reject command-line secrets", () => {
  assert.throws(() => parseWeixinOptions([]), (error) => error.code === "LIVE_CHANNEL_CONFIRMATION_REQUIRED");
  assert.throws(() => parseWeixinOptions(["--confirm-live", "--qrcode", "secret"]), (error) => error.code === "LIVE_CHANNEL_SECRET_ARGUMENT_DENIED");
  assert.throws(() => parseFeishuOptions([]), (error) => error.code === "LIVE_CHANNEL_CONFIRMATION_REQUIRED");
  assert.throws(() => parseFeishuOptions(["--confirm-live", "--app-secret", "secret"]), (error) => error.code === "LIVE_CHANNEL_SECRET_ARGUMENT_DENIED");
  assert.deepEqual(parseWeixinOptions(["--confirm-live", "--duration-ms", "2000"]), { durationMs: 2000 });
  assert.deepEqual(parseFeishuOptions(["--confirm-live"]), {});
});

test("live channel reports expose only operational booleans and generic error codes", () => {
  assert.deepEqual(summarizeWeixin({ running: true, available: true, ownerBound: true, lastError: null }, 1500), {
    ok: true, channel: "weixin", configured: true, ownerBound: true, connected: true, durationMs: 1500, errorCode: null,
  });
  assert.deepEqual(summarizeFeishu({ running: false, lastError: "secret-bearing transport detail" }, { configured: true, ownerBound: true }), {
    ok: false, channel: "feishu", configured: true, ownerBound: true, connected: false, errorCode: "FEISHU_CHANNEL_ERROR",
  });
});

test("Weixin live probe reuses a healthy running Worker instead of competing for its process lock", async () => {
  let adapterStarted = false;
  const report = await runWeixinProbe(["--confirm-live", "--duration-ms", "2000"], {
    adapter: {
      async start() { adapterStarted = true; throw new Error("must not start a second poller"); },
      async stop() {},
    },
    runningWorker: async () => ({ running: true, available: true, ownerBound: true, lastError: null }),
    write: () => {},
  });
  assert.equal(adapterStarted, false);
  assert.equal(report.ok, true);
  assert.equal(report.source, "running_worker");
});

test("running Worker channel status endpoint stays inside the Host API allowlist", () => {
  // 2026-09-23 生产实证：该端点漏出 allowlist 时，探针读不到运行中 Worker 状态，
  // 永远退回独立 Adapter（启动第二条微信轮询/飞书长连接），"复用 Worker" 契约失效。
  assert.equal(isAllowedSynoApiPath(CHANNELS_API_PATH), true);
});

test("getRunningChannelStatus reads the allowlisted endpoint and only accepts a running channel", async (t) => {
  let payload = { channels: { weixin: { running: true, available: true, ownerBound: true, lastError: null } } };
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push(req.url);
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(payload));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const port = server.address().port;
  const running = await getRunningChannelStatus("weixin", { port });
  assert.equal(running.running, true);
  assert.deepEqual(seen, [CHANNELS_API_PATH]);
  payload = { channels: { weixin: { running: false, available: true, ownerBound: true, lastError: "x" } } };
  assert.equal(await getRunningChannelStatus("weixin", { port }), null);
});

test("Feishu live probe reuses a healthy running Worker instead of opening a second long connection", async () => {
  let adapterStarted = false;
  const report = await runFeishuProbe(["--confirm-live"], {
    credentials: { async status() { throw new Error("running Worker status is authoritative"); } },
    adapter: {
      async start() { adapterStarted = true; throw new Error("must not open a second long connection"); },
      async stop() {},
    },
    runningWorker: async () => ({ running: true, available: true, ownerBound: true, lastError: null }),
    write: () => {},
  });
  assert.equal(adapterStarted, false);
  assert.equal(report.ok, true);
  assert.equal(report.source, "running_worker");
});
