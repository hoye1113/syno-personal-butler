import { DEFAULT_WEB_PORT } from "../apps/syno/syno/paths.mjs";

const SUPPORTED_CHANNELS = new Set(["weixin", "feishu"]);

async function getRunningChannelStatus(channel, { fetchImpl = fetch, port = process.env.PORT || DEFAULT_WEB_PORT } = {}) {
  if (!SUPPORTED_CHANNELS.has(channel)) throw new Error("未知渠道状态探针");
  const numericPort = Number(port);
  if (!Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65_535) return null;
  const response = await fetchImpl(`http://127.0.0.1:${numericPort}/api/syno/channels`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(1_500),
  });
  if (!response.ok) return null;
  const status = (await response.json())?.channels?.[channel];
  return status?.running === true ? status : null;
}

export { getRunningChannelStatus };
