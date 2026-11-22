export const CANDIDATE_THRESHOLD = 62;

const TOPIC_RULES = [
  {
    topic: "Harness / Agent 工程",
    weight: 30,
    patterns: [
      /\bharness\b/iu, /\bagent loop\b/iu, /context engineering/iu,
      /\bmcp\b/iu, /\bskills?\b/iu, /agent memory|memory (system|layer|management|for agents)/iu, /\brag\b/iu,
      /multi[- ]?agent/iu, /\bevals?\b/iu, /\bbenchmark/iu, /langgraph/iu,
      /openclaw/iu, /claude code/iu, /codex/iu, /cursor/iu, /gemini cli/iu,
      /agent (framework|runtime|architecture|engineering|pipeline|workflow|factory|automation)/iu,
      /coding agents?/iu, /browser[- ]use/iu, /computer[- ]use/iu, /agent sandbox/iu,
    ],
  },
  {
    topic: "Agent（泛）",
    weight: 6,
    patterns: [/\bagents?\b/iu],
  },
  {
    topic: "模型 / Agentic",
    weight: 16,
    patterns: [
      /agentic/iu, /tool use/iu, /function calling/iu,
      /agent model/iu, /coding model/iu, /computer use/iu,
    ],
  },
  {
    topic: "模型 / 前沿",
    weight: 10,
    patterns: [
      /\bmodels?\b/iu, /\bgpt-?[0-9]/iu, /claude/iu, /gemini/iu, /deepseek/iu,
      /kimi/iu, /qwen/iu, /llama/iu, /mistral/iu, /open weights/iu,
      /context window/iu, /reasoning/iu,
    ],
  },
  {
    topic: "AI Coding / 工程",
    weight: 18,
    patterns: [
      /\bcoding\b/iu, /\bdeveloper/iu, /\bide\b/iu, /\bcli\b/iu, /vibe coding/iu,
      /software engineering/iu, /\bcode review\b/iu, /pull request/iu, /\bpr\b/iu,
    ],
  },
  {
    topic: "研究 / 评测 / 安全",
    weight: 12,
    patterns: [
      /\bpapers?\b/iu, /\bresearch\b/iu, /\bsafety\b/iu, /alignment/iu,
      /evaluation/iu, /\barc\b/iu, /benchmark/iu,
    ],
  },
  {
    topic: "产品 / 组织",
    weight: 4,
    patterns: [
      /\bproducts?\b/iu, /\bstartups?\b/iu, /\blaunch/iu, /\bpricing/iu,
      /\bapi\b/iu, /\borganization/iu, /\bteams?\b/iu,
    ],
  },
];

const EXCLUDE_RULES = [
  { reason: "融资/股价/财报", penalty: 70, pattern: /(funding|raises?|ipo|stock|share price|valuation|market cap|investor|revenue|earnings|acqui(re|sition)|merger|layoff|hiring freeze)/iu },
  { reason: "加密/币圈", penalty: 70, pattern: /(crypto|bitcoin|ethereum|nft|token sale)/iu },
  { reason: "折扣/促销", penalty: 45, pattern: /(discount|coupon|deal|giveaway|free trial|black friday|cyber monday)/iu },
  { reason: "政治/人物八卦", penalty: 55, pattern: /(trump|white house|election|senate|congress|celebrity|gossip)/iu },
  { reason: "企业公关/公益", penalty: 55, pattern: /(partnership|philanthrop|charity|foundation|for chile|healthcare|clinical|king'?s trust|government|public-sector|education program|donat|grant)/iu },
];

const TIER_WEIGHT = { T1: 1, "T1.5": 0.8, T2: 0.6, EXCLUDE_MP: 0.2 };

export const INTEREST_PROFILE = `我是个人 AI Agent / 知识管家 builder。最关心：
1. Agent 工程：Harness、Agent Loop、Context Engineering、Memory/RAG、Tool/MCP/Skills、Eval、可靠性。
2. AI Coding：Claude Code、Codex、OpenClaw、Cursor、Gemini CLI、Agent 框架与工程实践。
3. 模型与产品：与 agentic 能力、上下文、工具调用、价格、本地部署相关的模型发布；AI 原生产品与组织。
4. 个人 AI / 超级个体：单人构建产品、知识管理自动化。
低相关：融资、股价、财报、裁员八卦、政治、crypto、消费级折扣、纯营销稿。
判断标准：这条信息能不能帮我构建/运营更好的个人 AI Agent 或知识管家？`;

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function sourceWeight(source) {
  const configured = Number(source?.weight);
  if (Number.isFinite(configured)) return Math.max(0, Math.min(1, configured));
  return TIER_WEIGHT[source?.tier] ?? 0.6;
}

export function scoreItem(item, source = {}) {
  const text = `${item.title ?? ""}\n${item.summary ?? ""}`;
  const topics = [];
  let topicScore = 0;
  for (const rule of TOPIC_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      topics.push(rule.topic);
      topicScore += rule.weight;
    }
  }
  topicScore = Math.min(45, topicScore);
  const excludes = EXCLUDE_RULES.filter((rule) => rule.pattern.test(text));
  const penalty = Math.min(90, excludes.reduce((sum, rule) => sum + rule.penalty, 0));
  const weight = sourceWeight(source);
  const sourceBonus = Math.round(weight * 15);
  const officialBonus = source?.tier === "T1" ? 5 : source?.tier === "T1.5" ? 3 : 0;
  const originalBonus = source?.kind && source.kind !== "aihot" ? 3 : 0;
  const aihotScore = Number(item?.raw?.aihotScore);
  const aihotBonus = Number.isFinite(aihotScore) ? (aihotScore >= 75 ? 8 : aihotScore >= 60 ? 5 : 0) : 0;
  let score = clamp(Math.round(15 + topicScore + sourceBonus + officialBonus + originalBonus + aihotBonus - penalty));
  const hasCore = topics.includes("Harness / Agent 工程")
    || topics.includes("AI Coding / 工程")
    || topics.includes("模型 / Agentic");
  if (!hasCore) score = Math.min(score, 55);
  const excluded = excludes.length > 0 || score < 25;
  const reasonParts = [];
  if (topics.length) reasonParts.push(`命中：${topics.join("、")}`);
  if (excludes.length) reasonParts.push(`排除：${excludes.map((rule) => rule.reason).join("、")}`);
  if (!topics.length && !excludes.length) reasonParts.push("未命中核心主题");
  reasonParts.push(`来源权重 ${weight.toFixed(1)}`);
  return {
    score,
    excluded,
    topics,
    sourceWeight: weight,
    reason: reasonParts.join("；"),
  };
}

export function isCandidate(score, threshold = CANDIDATE_THRESHOLD) {
  return !score.excluded && score.score >= threshold;
}

export async function scoreItemWithLLM(item, source, { llm, threshold = CANDIDATE_THRESHOLD } = {}) {
  const rules = scoreItem(item, source);
  if (typeof llm !== "function") return rules;
  try {
    const result = await llm({
      system: "你是个人 AI Agent 技术雷达的筛选器。只输出 JSON。",
      prompt: `${INTEREST_PROFILE}\n\n请给下面这条资讯打 0-100 分，并给出 1-2 句中文理由和主题标签。\n标题：${item.title}\n来源：${source.name}\n摘要：${item.summary}\n\n输出 JSON：{"score":number,"reason":string,"topics":string[]}`,
    });
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    if (!Number.isFinite(Number(parsed?.score))) return rules;
    const score = clamp(Math.round(Number(parsed.score)));
    return {
      ...rules,
      score,
      excluded: rules.excluded || score < 25,
      reason: String(parsed.reason ?? rules.reason).slice(0, 500),
      topics: Array.isArray(parsed.topics) ? parsed.topics.map(String).slice(0, 8) : rules.topics,
      threshold,
    };
  } catch {
    return rules;
  }
}
