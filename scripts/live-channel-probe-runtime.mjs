import { DEFAULT_WEB_PORT } from "../apps/syno/syno/paths.mjs";

const SUPPORTED_CHANNELS = new Set(["weixin", "feishu"]);
// 探针优先读运行中 Worker 的脱敏渠道状态（docs/OPERATIONS.md「渠道健康 probe」）。
// 该路径必须保持在 Host 控制面 allowlist 内，否则探针会退回独立 Adapter，
// 与真实微信长连接竞争（2026-09-23 实证）。
const CHANNELS_API_PATH = "/api/syno/channels";

async function getRunningChannelStatus(channel, { fetchImpl = fetch, port = process.env.PORT || DEFAULT_WEB_PORT } = {}) {
  if (!SUPPORTED_CHANNELS.has(channel)) throw new Error("未知渠道状态探针");
  const numericPort = Number(port);
  if (!Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65_535) return null;
  const response = await fetchImpl(`http://127.0.0.1:${numericPort}${CHANNELS_API_PATH}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(1_500),
  });
  if (!response.ok) return null;
  const status = (await response.json())?.channels?.[channel];
  return status?.running === true ? status : null;
}

export { CHANNELS_API_PATH, getRunningChannelStatus };
