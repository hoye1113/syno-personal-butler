// 环境开关解析（2026-10-16 从 weixin-ilink 抽出，通道无关）。
// 语义：未设置用默认；"0"/"false"/"off"/"no" 关，其它非空值视为开。
function envToggle(rawValue, { defaultOn = false } = {}) {
  const raw = String(rawValue ?? "").trim().toLowerCase();
  if (!raw) return defaultOn;
  return !["0", "false", "off", "no"].includes(raw);
}

export { envToggle };
