import path from "node:path";
import { pathToFileURL } from "node:url";

import { WeixinIlinkAdapter } from "../apps/syno/syno/weixin-ilink.mjs";

function valueOf(argv, name, fallback = "") {
  const index = argv.indexOf(name);
  return index >= 0 ? String(argv[index + 1] || "") : fallback;
}

function parseOptions(argv) {
  for (const forbidden of ["--token", "--cookie", "--secret", "--qrcode", "--qr-url"]) {
    if (argv.includes(forbidden)) {
      const error = new Error("微信真实探针禁止通过命令行传递凭据或二维码材料");
      error.code = "LIVE_CHANNEL_SECRET_ARGUMENT_DENIED";
      throw error;
    }
  }
  if (!argv.includes("--confirm-live")) {
    const error = new Error("微信真实探针必须显式传入 --confirm-live");
    error.code = "LIVE_CHANNEL_CONFIRMATION_REQUIRED";
    throw error;
  }
  const durationMs = Number(valueOf(argv, "--duration-ms", "1500"));
  if (!Number.isInteger(durationMs) || durationMs < 500 || durationMs > 10_000) {
    const error = new Error("duration-ms 必须为 500–10000 的整数");
    error.code = "LIVE_CHANNEL_DURATION_INVALID";
    throw error;
  }
  return { durationMs };
}

function summarizeWeixin(status, durationMs) {
  const errorCode = status.lastError ? "WEIXIN_CHANNEL_ERROR" : null;
  return {
    ok: status.running === true && status.available === true && status.ownerBound === true && !errorCode,
    channel: "weixin",
    configured: status.available === true,
    ownerBound: status.ownerBound === true,
    connected: status.running === true,
    durationMs,
    errorCode,
  };
}

async function main(argv = process.argv.slice(2), { adapter = new WeixinIlinkAdapter(), wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)) } = {}) {
  const { durationMs } = parseOptions(argv);
  try {
    const started = await adapter.start();
    if (!started.available) {
      const error = new Error("请先在 Syno Web 扫码并绑定微信 Owner");
      error.code = "WEIXIN_NOT_CONFIGURED";
      throw error;
    }
    await wait(durationMs);
    const report = summarizeWeixin(adapter.status(), durationMs);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 2;
    return report;
  } finally {
    await adapter.stop().catch(() => {});
  }
}

const isDirect = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isDirect) {
  main().catch((error) => {
    console.error(JSON.stringify({ ok: false, channel: "weixin", code: error.code || "WEIXIN_LIVE_PROBE_FAILED" }));
    process.exitCode = 1;
  });
}

export { main, parseOptions, summarizeWeixin };
