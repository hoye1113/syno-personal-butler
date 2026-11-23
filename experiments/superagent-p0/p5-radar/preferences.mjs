import { promises as fs } from "node:fs";
import path from "node:path";

export const PREFERENCES_VERSION = 1;

const TOPIC_HINTS = [
  {
    topic: "Harness / Agent 工程",
    patterns: [/harness/iu, /\bagent\b/iu, /context/iu, /memory/iu, /\brag\b/iu, /\bmcp\b/iu, /skills?/iu, /sandbox/iu, /安全/iu],
  },
  {
    topic: "AI Coding / 工程",
    patterns: [/coding/iu, /codex/iu, /claude code/iu, /cursor/iu, /openclaw/iu, /代码/iu, /工程/iu],
  },
  {
    topic: "模型 / 前沿",
    patterns: [/模型/iu, /\bmodels?\b/iu, /gpt/iu, /claude/iu, /gemini/iu, /deepseek/iu, /kimi/iu, /qwen/iu],
  },
  {
    topic: "研究 / 评测 / 安全",
    patterns: [/研究/iu, /论文/iu, /评测/iu, /eval/iu, /safety/iu, /对齐/iu],
  },
  {
    topic: "产品 / 组织",
    patterns: [/产品/iu, /组织/iu, /团队/iu, /startup/iu],
  },
];

function nowIso(now = () => new Date()) {
  return now().toISOString();
}

export function emptyPreferences() {
  return {
    version: PREFERENCES_VERSION,
    updatedAt: null,
    seededAt: null,
    topics: {},
    sources: {},
    explicit: [],
  };
}

export async function loadPreferences(home) {
  try {
    const parsed = JSON.parse(await fs.readFile(path.join(home, "preferences.json"), "utf8"));
    return {
      ...emptyPreferences(),
      ...parsed,
      topics: parsed.topics && typeof parsed.topics === "object" ? parsed.topics : {},
      sources: parsed.sources && typeof parsed.sources === "object" ? parsed.sources : {},
      explicit: Array.isArray(parsed.explicit) ? parsed.explicit : [],
    };
  } catch (error) {
    if (error.code === "ENOENT") return emptyPreferences();
    throw error;
  }
}

export async function savePreferences(home, preferences) {
  await fs.mkdir(home, { recursive: true });
  const temporary = path.join(home, `preferences.json.${process.pid}.tmp`);
  await fs.writeFile(temporary, JSON.stringify(preferences, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, path.join(home, "preferences.json"));
}

function increment(map, key, delta) {
  if (!key) return;
  map[key] = Number((map[key] || 0) + delta);
}

export async function seedPreferences({ store, home, preferences, now = () => new Date() } = {}) {
  if (!store || !home) throw new Error("seedPreferences 缺少 store 或 home");
  const current = preferences || await loadPreferences(home);
  if (current.seededAt) return current;
  const followed = store.listCandidates({ limit: 1000, state: "followed" });
  const ignored = store.listCandidates({ limit: 1000, state: "ignored" });
  for (const row of followed) {
    for (const topic of row.topics || []) increment(current.topics, topic, 1);
    increment(current.sources, row.source_id, 0.5);
  }
  for (const row of ignored) {
    for (const topic of row.topics || []) increment(current.topics, topic, -1);
    increment(current.sources, row.source_id, -0.5);
  }
  if (followed.length || ignored.length) {
    current.seededAt = nowIso(now);
    current.updatedAt = nowIso(now);
    await savePreferences(home, current);
  }
  return current;
}

export async function ensurePreferences({ store, home, now = () => new Date() } = {}) {
  const preferences = await loadPreferences(home);
  if (preferences.seededAt) return preferences;
  return seedPreferences({ store, home, preferences, now });
}

export function recordFeedback({ preferences, item, score, action, now = () => new Date() }) {
  if (!preferences) throw new Error("recordFeedback 缺少 preferences");
  if (!["follow", "ignore"].includes(action)) throw new Error("feedback action 必须是 follow 或 ignore");
  const delta = action === "follow" ? 1 : -1;
  const topics = item?.topics?.length ? item.topics : score?.topics || [];
  for (const topic of topics) increment(preferences.topics, topic, delta);
  increment(preferences.sources, item?.source_id, delta * 0.5);
  preferences.updatedAt = nowIso(now);
  return preferences;
}

export function applyExplicitPreference({ preferences, text, now = () => new Date() }) {
  if (!preferences) throw new Error("applyExplicitPreference 缺少 preferences");
  const value = String(text || "").trim();
  const negative = /(少看|少推|不看|降低|减少|不再(?:关注|看|推|推荐)|别(?:再)?(?:给我)?(?:推|推荐)|不要(?:再)?(?:给我)?(?:推|推荐))/u.test(value);
  const matched = [];
  for (const rule of TOPIC_HINTS) {
    if (rule.patterns.some((pattern) => pattern.test(value))) {
      matched.push(rule.topic);
      increment(preferences.topics, rule.topic, negative ? -2 : 2);
    }
  }
  if (matched.length) {
    preferences.updatedAt = nowIso(now);
    preferences.explicit.push({ text: value.slice(0, 500), topics: matched, delta: negative ? -2 : 2, at: preferences.updatedAt });
    preferences.explicit = preferences.explicit.slice(-50);
  }
  return {
    matched,
    negative,
    message: matched.length
      ? `${negative ? "已降低" : "已提高"}这些主题权重：${matched.join("、")}`
      : "没有识别到可更新的主题；可以试试“更关注 harness / sandbox / coding”。",
  };
}

export function preferenceAffinity(item, preferences) {
  if (!preferences) return 0;
  const topicScore = (item.topics || []).reduce((sum, topic) => sum + Number(preferences.topics?.[topic] || 0), 0);
  const sourceScore = Number(preferences.sources?.[item.source_id] || 0);
  return topicScore * 6 + sourceScore * 4;
}

function latestMs(item) {
  return Date.parse(item.published_at || item.fetched_at || "") || 0;
}

/**
 * All entries stay in the document. Preferred rises to the top; a bounded
 * exploration block prevents a pure filter bubble; the rest remains visible.
 */
export function rankEntries(entries, preferences, {
  preferredLimit = 25,
  exploreRatio = 0.15,
  maxItems = Infinity,
} = {}) {
  const cap = Number.isFinite(Number(maxItems)) ? Math.max(0, Math.floor(Number(maxItems))) : entries.length;
  const ranked = entries.map((entry) => ({
    ...entry,
    preferenceScore: Number(entry.item.score || 0) + preferenceAffinity(entry.item, preferences),
  })).sort((left, right) => right.preferenceScore - left.preferenceScore || latestMs(right.item) - latestMs(left.item));
  const preferred = ranked.slice(0, Math.min(preferredLimit, cap, ranked.length));
  const preferredIds = new Set(preferred.map((entry) => entry.item.item_id));
  const remaining = ranked
    .filter((entry) => !preferredIds.has(entry.item.item_id))
    .sort((left, right) => latestMs(right.item) - latestMs(left.item));
  const exploreLimit = Math.min(remaining.length, Math.max(1, Math.round(cap * exploreRatio)), Math.max(0, cap - preferred.length));
  const bySource = new Map();
  for (const entry of remaining) {
    const source = entry.item.source_id || "unknown";
    if (!bySource.has(source)) bySource.set(source, []);
    bySource.get(source).push(entry);
  }
  const explore = [];
  const queues = [...bySource.values()];
  while (explore.length < exploreLimit && queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      const entry = queue.shift();
      if (entry) explore.push(entry);
      if (explore.length >= exploreLimit) break;
    }
  }
  const exploreIds = new Set(explore.map((entry) => entry.item.item_id));
  const rest = remaining
    .filter((entry) => !exploreIds.has(entry.item.item_id))
    .slice(0, Math.max(0, cap - preferred.length - explore.length));
  const mark = (entry, group, groupReason) => ({ ...entry, group, groupReason });
  return [
    ...preferred.map((entry) => mark(entry, "preferred", entry.preferenceScore > Number(entry.item.score || 0)
      ? `为你优先：偏好加权；${(entry.item.topics || []).join("、") || "来源偏好"}`
      : "为你优先：高分条目")),
    ...explore.map((entry) => mark(entry, "explore", "圈外探索：非偏好优先、来源多样、配额保留")),
    ...rest.map((entry) => mark(entry, "rest", "其余条目：未进入优先，但仍保留")),
  ];
}

export function preferenceSummary(preferences) {
  const topics = Object.entries(preferences?.topics || {})
    .filter(([, weight]) => Number(weight) !== 0)
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
    .slice(0, 8)
    .map(([topic, weight]) => `${topic}:${Number(weight) > 0 ? "+" : ""}${weight}`);
  return topics.length ? topics.join(" | ") : "暂无偏好权重";
}
