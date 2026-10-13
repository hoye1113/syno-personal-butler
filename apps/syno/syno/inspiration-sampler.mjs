// 做梦素材仍按近期 2 + 回访 2 混合；反馈只调整第二个回访名额，保留最老的一篇探索。
// KnowledgeStore 没有回访元数据；「久未回访」以灵感仓近 30 天采样历史为准
// （未进采样集合的笔记中 date 最旧优先）。只采 searchable 内容笔记并排除 sensitive；
// 素材少于 2 篇时返回空集，由调用方当日安静跳过（不投递空卡）。
import { FEEDBACK_VALUES, SAMPLED_WINDOW_MS } from "../../../packages/syno-core/inspiration-store.mjs";

function normalizedTags(note) {
  return [...new Set((note.tags || []).map((tag) => String(tag).normalize("NFKC").trim().toLocaleLowerCase("zh-CN")).filter(Boolean))];
}

function feedbackWeights(records, notes, now) {
  const known = new Map(notes.map((note) => [note.path, note]));
  const weights = new Map();
  const cutoff = now.getTime() - SAMPLED_WINDOW_MS;
  for (const record of records) {
    const at = Date.parse(record.feedbackAt);
    const delivered = Date.parse(record.deliveredAt);
    if (record.status !== "feedback" || record.deliveredOwnerKey !== "local-user"
      || !Number.isFinite(at) || at < cutoff || at > now.getTime()
      || !Number.isFinite(delivered) || delivered > at
      || !Array.isArray(record.sampledRefs) || record.sampledRefs.length < 2
      || record.sampledRefs.some((ref) => !known.has(ref))) continue;
    if (!FEEDBACK_VALUES.has(record.feedback)) continue;
    const value = record.feedback === "useful" ? 1 : record.feedback === "not_useful" ? -1 : 0;
    const tags = [...new Set(record.sampledRefs.flatMap((ref) => normalizedTags(known.get(ref))))];
    for (const tag of tags) weights.set(tag, (weights.get(tag) || 0) + value / tags.length);
  }
  return new Map([...weights].map(([tag, weight]) => [tag, Math.max(-3, Math.min(3, weight))]));
}

class InspirationSampler {
  constructor({ knowledge, inspirations, clock = () => new Date(), recentCount = 2, unvisitedCount = 2, unvisitedWindowMs = SAMPLED_WINDOW_MS } = {}) {
    if (!knowledge || !inspirations) throw new Error("InspirationSampler 缺少 knowledge 或 inspirations");
    this.knowledge = knowledge;
    this.inspirations = inspirations;
    this.clock = clock;
    this.recentCount = recentCount;
    this.unvisitedCount = unvisitedCount;
    this.unvisitedWindowMs = unvisitedWindowMs;
  }

  async sample({ now = this.clock() } = {}) {
    const notes = (await this.knowledge.list({ searchable: true })).filter((note) => !note.sensitive);
    if (notes.length < 2) return { notes: [] };
    const visited = await this.inspirations.recentSampledRefs({ now, windowMs: this.unvisitedWindowMs });
    // 两个池都排除近 30 天已采样笔记：做梦永远用新鲜素材，宁可安静跳过也不重复
    const byDateDesc = notes
      .filter((note) => !visited.has(note.path))
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(a.path).localeCompare(String(b.path)));
    const recent = byDateDesc.slice(0, this.recentCount);
    const picked = new Set(recent.map((note) => note.path));
    const remaining = byDateDesc
      .filter((note) => !picked.has(note.path))
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.path).localeCompare(String(b.path)));
    let unvisited = remaining.slice(0, this.unvisitedCount);
    const weights = feedbackWeights(await this.inspirations.list(), notes, now);
    if (weights.size && this.unvisitedCount > 1 && remaining.length > 1) {
      const score = (note) => {
        const tags = normalizedTags(note);
        return tags.length ? tags.reduce((sum, tag) => sum + (weights.get(tag) || 0), 0) / tags.length : 0;
      };
      // 保留最老的一篇探索，仅第二个回访名额按反馈排序；稳定排序保留日期/路径的平分规则。
      const preferred = remaining.slice(1).sort((a, b) => score(b) - score(a))[0];
      unvisited = [remaining[0], preferred, ...remaining.slice(1).filter((note) => note !== preferred)].slice(0, this.unvisitedCount);
    }
    return { notes: [...recent, ...unvisited] };
  }
}

export { InspirationSampler };
