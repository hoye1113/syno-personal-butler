// 收录澄清顾问：trust-but-clarify 下，awaiting_approval 仅由"系统歧义"（收录撞重复/多方案/
// 信息不足）触发。为这类 Job 生成「这是什么 / 管家说明 / 理由」，帮主人在冲突选项间决策。
//
// 设计：确定性底座（读取 artifact 真实字段：标题/来源/路径/查重命中）+ LLM 增强
// （用管家口吻产出自然语言理由）。LLM 失败/离线 → 回退确定性底座（via:"fallback"），
// 保证澄清卡片永不为空，符合「Provider 离线时本地继续」。
//
// 约束：不创建 Job、不动 git、不起 tool-loop；固定单一 Provider（漂移由 ProviderClient 拒绝），
// 无模型 fallback；说明始终对齐提交方意图，仅在内容信号冲突时填 caveat（去重命中、唯一内容
// 却要丢弃等），管家不越权改判动作——reject 永远是主人的可选项。

const ACTION_LABELS = Object.freeze({
  create: "收录",
  reject: "丢弃",
  "append-source": "追加来源",
  "link-only": "仅链接",
  "keep-separate": "保持分开",
});

const ADVISOR_SYSTEM =
  "你是 Syno 收录澄清顾问。主人正在确认一篇需要澄清的收录候选（可能撞重复、多方案或信息不足）。请用不超过 100 字客观说明：这是什么内容、覆盖了什么、来源与质量如何、对个人知识管理是否有价值。只描述和评价内容本身；不要替主人决定收录或丢弃，也不要建议改用其他动作（如何处理由主人决定）。语气克制、可靠、温暖，用大白话。只输出一段话，不要改写主人原文，不要使用列表符号或标题。";

function actionLabel(action) {
  return ACTION_LABELS[action] || "处理";
}

function sourceLabel(source) {
  if (!source) return "未知来源";
  try {
    const url = new URL(source);
    if (/weixin\.qq\.com/.test(url.hostname)) return "微信";
    if (/feishu|larksuite/.test(url.hostname)) return "飞书";
    return url.hostname;
  } catch {
    return source.length > 24 ? `${source.slice(0, 24)}…` : source;
  }
}

// 微信等抓取常把文件名当标题（带 digest 前缀、下划线、.md 后缀）。仅对明显的文件名标题做清洗，
// 干净标题原样返回。避免在「这是什么」里显示一串技术性文件名。
function cleanTitle(title) {
  const raw = String(title || "").trim();
  if (!raw || !/\.(md|markdown)$/i.test(raw)) return raw;
  return raw.replace(/\.(md|markdown)$/i, "").replace(/^[0-9a-f]{6,}-[0-9a-z]{1,3}-/i, "").replace(/_/g, " ").replace(/\s+/g, " ").trim() || raw;
}

function wordCountLabel(count) {
  return count >= 10000 ? `${(count / 10000).toFixed(1)} 万字` : `${count} 字`;
}

// 纯函数兜底建议：不读 artifact、不调 LLM。用于非收录类任务、artifact 缺失、端点降级。
function minimalAdvice(job) {
  const operation = job?.request?.operation || "";
  const intent = job?.intent || operation || "操作";
  const whatIsIt = operation === "ingest.apply" ? "一篇待确认的收录候选（存在需要澄清的冲突）。" : `一个待确认的${intent}任务。`;
  return {
    whatIsIt,
    recommendation: "approve",
    recommendationLabel: "请主人审阅后确认",
    reason: job?.decision?.reason || "请求需要主人确认如何处理。",
    caveat: "",
    detail: { operation },
    generatedAt: null,
    via: "minimal",
  };
}

class ApprovalAdvisor {
  constructor({ provider, ingest, clock = () => new Date() } = {}) {
    if (!provider || !ingest) throw new Error("ApprovalAdvisor 缺少 provider 或 ingest");
    this.provider = provider;
    this.ingest = ingest;
    this.clock = clock;
  }

  minimalAdvice(job) { return minimalAdvice(job); }

  async generate(job, { loadRequest } = {}) {
    if (!job) throw new Error("ApprovalAdvisor.generate 缺少 job");
    const operation = job?.request?.operation;
    // 非收录类：确定性兜底，不调 LLM。
    if (operation !== "ingest.apply") return { ...minimalAdvice(job), generatedAt: this.clock().toISOString() };

    let payload = {};
    try {
      payload = loadRequest ? await loadRequest(job) : (job?.request || {});
    } catch {
      payload = {};
    }
    const action = payload?.payload?.decision?.action || payload?.decision?.action || job?.decision?.action || "";
    const artifactId = payload?.payload?.artifactId || payload?.artifactId;

    if (!artifactId) return { ...minimalAdvice(job), generatedAt: this.clock().toISOString() };

    let art;
    try {
      art = await this.ingest.readArtifact(artifactId);
    } catch (error) {
      return {
        ...minimalAdvice(job),
        whatIsIt: `一篇待${actionLabel(action)}的收录候选（原始素材已不在本地状态）。`,
        reason: error?.code === "ARTIFACT_MISSING"
          ? "原始收录素材已不在本地，无法读取正文；如确需处理请重新收录。"
          : (job?.decision?.reason || "读取收录素材失败。"),
        detail: { operation: "ingest.apply", action, artifactId, error: error?.code },
        generatedAt: this.clock().toISOString(),
        via: "fallback",
      };
    }

    const base = this.#baseAdvice(job, art, action);
    const enhanced = await this.#enhance(art, action).catch(() => null);
    return {
      whatIsIt: base.whatIsIt,
      recommendation: base.recommendation,
      recommendationLabel: base.recommendationLabel,
      reason: enhanced?.reason || base.fallbackReason,
      caveat: base.caveat,
      detail: base.detail,
      generatedAt: this.clock().toISOString(),
      via: enhanced ? "butler" : "fallback",
    };
  }

  #baseAdvice(job, art, action) {
    const title = cleanTitle(art.title) || "待整理收录";
    const wordCount = art.body ? art.body.replace(/\s+/g, "").length : 0;
    const sourcePart = art.source ? `来自 ${sourceLabel(art.source)}，` : "";
    return {
      whatIsIt: `《${title}》${sourcePart}正文约 ${wordCountLabel(wordCount)}。`,
      recommendation: "approve",
      recommendationLabel: `可确认${actionLabel(action)}`,
      fallbackReason: job?.decision?.reason || "内容已就绪，等待主人确认如何处理。",
      caveat: this.#caveat(action, art),
      detail: {
        operation: "ingest.apply",
        action,
        artifactId: art.id,
        title: art.title || "",
        source: art.source || "",
        proposedPath: art.proposedPath || "",
        risk: art.risk || "",
        dedupeMatches: art.dedupeMatches || [],
        bodyPreview: art.body ? art.body.replace(/\s+/g, " ").trim().slice(0, 240) : "",
      },
    };
  }

  #caveat(action, art) {
    const dupes = art.dedupeMatches || [];
    if (action === "create" && dupes.length) return `与已有笔记查重命中（${dupes.length} 篇），收录前请确认不是重复。`;
    if (action === "reject" && !dupes.length) return "未命中查重，这篇看起来并非重复，丢弃前请再确认。";
    return "";
  }

  async #enhance(art, action) {
    const user = [
      `标题：${art.title || "（无标题）"}`,
      `来源：${art.source || "未知"}`,
      `拟动作：${actionLabel(action)}`,
      ...(art.dedupeMatches?.length ? [`查重命中已有笔记：${art.dedupeMatches.length} 篇`] : []),
      `正文片段：${(art.body || "").replace(/\s+/g, " ").trim().slice(0, 1200)}`,
    ].join("\n");
    const result = await this.provider.complete(
      [{ role: "system", content: ADVISOR_SYSTEM }, { role: "user", content: user }],
      [],
    );
    const reason = String(result?.message?.content || "").trim();
    return reason ? { reason } : null;
  }
}

export { ApprovalAdvisor, minimalAdvice, ACTION_LABELS, actionLabel };
