// Deterministic P5 radar commands owned by the Host router. No model call is needed
// to route or execute these; the P5 worker process owns scoring and storage.
const NUMBER_SEPARATOR = /[、,，;；\s]+/u;

function normalizeCandidateToken(value) {
  return String(value ?? "")
    .replace(/^#/u, "")
    .replace(/^第/u, "")
    .replace(/条$/u, "")
    .trim();
}

export function parseCandidateNumbers(value) {
  return String(value ?? "")
    .split(NUMBER_SEPARATOR)
    .map(normalizeCandidateToken)
    .filter(Boolean);
}

/**
 * Parse a Feishu message into a P5 action.
 * @param {string} text - raw Owner message.
 * @returns {{action: "digest"|"status"|"help"|"follow"|"ignore", numbers?: string[]}|null}
 */
export function parseRadarCommand(text) {
  const value = String(text ?? "").trim();
  if (!value) return null;
  if (/^(?:雷达|信息雷达|radar)(?:\s*日报)?$/iu.test(value)) return { action: "digest" };
  if (/^(?:雷达|信息雷达|radar)\s*状态$/iu.test(value)) return { action: "status" };
  if (/^(?:雷达|信息雷达|radar)\s*帮助$/iu.test(value)) return { action: "help" };
  const limit = /^(?:(?:雷达|信息雷达|radar)\s*)?(?:设置|条数)\s*[：:]?\s*(\d{1,3})$/u.exec(value);
  if (limit) return { action: "setLimit", maxItems: Number(limit[1]) };
  const preference = /^(?:(?:雷达|信息雷达|radar)\s*)?(?:偏好|兴趣)\s*[：:]\s*(.+)$/u.exec(value);
  if (preference) return { action: "preference", text: preference[1].trim() };
  // Only explicit preference verbs enter this domain from free chat. Ordinary questions and object commands stay
  // with their own routers; the original sentence is preserved so positive/negative weighting sees its intent.
  const naturalPreference = /^(?:(?:以后|接下来|近期|最近)\s*)?(?:请\s*)?(?:我\s*)?(?:(?:想|希望|要)\s*)?(?:多(?:关注|看|推|推荐)|更(?:关注|爱看|喜欢看)|少(?:关注|看|推|推荐)|不看|不再(?:关注|看|推|推荐)|(?:别|不要)(?:再)?(?:给我)?(?:推|推荐))\s*[\s\S]+$/u;
  if (naturalPreference.test(value)) return { action: "preference", text: value };
  const explicit = /^(?:雷达|信息雷达|radar)\s*(跟进|忽略)\s*(.*)$/u.exec(value);
  const bare = /^(跟进|忽略)\s*(.*)$/u.exec(value);
  const marked = explicit ?? bare;
  if (marked) {
    const raw = marked[2].trim();
    // A bare “跟进项目 A” is not a radar command; only numbered candidate commands
    // (or the explicit 雷达 prefix) may enter P5.
    if (!explicit && !/^(?:#|第)?\d/u.test(raw)) return null;
    return {
      action: marked[1] === "跟进" ? "follow" : "ignore",
      numbers: parseCandidateNumbers(raw),
    };
  }
  if (/^(?:雷达|信息雷达|radar)\b/u.test(value)) return { action: "help" };
  return null;
}

export const RADAR_HELP = [
  "雷达命令：",
  "  雷达 / 雷达日报 —— 生成并返回今日候选",
  "  雷达状态 —— 当前信源、候选和最近一次采集",
  "  雷达设置 50 —— 修改每日展示条数",
  "  偏好：更关注 sandbox 和 agent 工程 —— 更新偏好权重",
  "  偏好：少看融资 —— 降低主题权重",
  "  也可直接说：以后多关注 Agent；别给我推模型新闻",
  "  跟进 1、4 —— 标记候选为跟进",
  "  忽略 8、9 —— 标记候选为忽略",
].join("\n");
