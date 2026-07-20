import path from "node:path";
import { pathToFileURL } from "node:url";

import { FeishuChannelAdapter, FeishuCredentialStore } from "../apps/syno/syno/feishu-channel.mjs";
import { getRunningChannelStatus } from "./live-channel-probe-runtime.mjs";

function parseOptions(argv) {
  for (const forbidden of ["--app-id", "--app-secret", "--token", "--cookie", "--secret"]) {
    if (argv.includes(forbidden)) {
      const error = new Error("飞书真实探针禁止通过命令行传递凭据");
      error.code = "LIVE_CHANNEL_SECRET_ARGUMENT_DENIED";
      throw error;
    }
  }
  if (!argv.includes("--confirm-live")) {
    const error = new Error("飞书真实探针必须显式传入 --confirm-live");
    error.code = "LIVE_CHANNEL_CONFIRMATION_REQUIRED";
    throw error;
  }
  return {};
}

function summarizeFeishu(status, credentialStatus) {
  const errorCode = status.lastError ? "FEISHU_CHANNEL_ERROR" : null;
  return {
    ok: credentialStatus.configured === true && credentialStatus.ownerBound === true && status.running === true && !errorCode,
    channel: "feishu",
    configured: credentialStatus.configured === true,
    ownerBound: credentialStatus.ownerBound === true,
    connected: status.running === true,
    errorCode,
  };
}

async function main(argv = process.argv.slice(2), {
  credentials = new FeishuCredentialStore(),
  adapter,
  runningWorker = () => getRunningChannelStatus("feishu"),
  write = (value) => console.log(JSON.stringify(value, null, 2)),
} = {}) {
  parseOptions(argv);
  const workerStatus = await runningWorker().catch(() => null);
  if (workerStatus) {
    const report = {
      ...summarizeFeishu(workerStatus, { configured: workerStatus.available === true, ownerBound: workerStatus.ownerBound === true }),
      source: "running_worker",
    };
    write(report);
    if (!report.ok) process.exitCode = 2;
    return report;
  }
  const credentialStatus = await credentials.status();
  if (!credentialStatus.configured) {
    const error = new Error("请先在 Syno Web 完成飞书扫码注册和 Owner 绑定");
    error.code = "FEISHU_NOT_CONFIGURED";
    throw error;
  }
  const channel = adapter || new FeishuChannelAdapter({ credentials });
  try {
    const status = await channel.start();
    const report = { ...summarizeFeishu(status, credentialStatus), source: "standalone_probe" };
    write(report);
    if (!report.ok) process.exitCode = 2;
    return report;
  } finally {
    await channel.stop().catch(() => {});
  }
}

const isDirect = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isDirect) {
  main().catch((error) => {
    console.error(JSON.stringify({ ok: false, channel: "feishu", code: error.code || "FEISHU_LIVE_PROBE_FAILED" }));
    process.exitCode = 1;
  });
}

export { main, parseOptions, summarizeFeishu };
