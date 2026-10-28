// 聊天读链接与显式收录共用同一套直抓网络故障分类，避免一条链路修复后另一条继续漏判。
function classifyDirectNetworkFailure(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  const signature = `${code} ${message}`;
  if (/来源抓取超时|ETIMEDOUT|超时|timeout/iu.test(signature)) return "network_timeout";
  if (/ECONNRESET/iu.test(signature)) return "network_reset";
  if (/ECONN|ENOTFOUND|fetch failed|network/iu.test(signature)) return "network_failure";
  return null;
}

export { classifyDirectNetworkFailure };
