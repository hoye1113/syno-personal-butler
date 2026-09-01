// D12（2026-09-01）：做梦素材采样——近期收录与久未回访按 2+2 混合。
// KnowledgeStore 没有回访元数据；「久未回访」以灵感仓近 30 天采样历史为准
// （未进采样集合的笔记中 date 最旧优先）。只采 searchable 内容笔记并排除 sensitive；
// 素材少于 2 篇时返回空集，由调用方当日安静跳过（不投递空卡）。
class InspirationSampler {
  constructor({ knowledge, inspirations, clock = () => new Date(), recentCount = 2, unvisitedCount = 2, unvisitedWindowMs = 30 * 24 * 60 * 60 * 1000 } = {}) {
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
    const unvisited = byDateDesc
      .filter((note) => !picked.has(note.path))
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.path).localeCompare(String(b.path)))
      .slice(0, this.unvisitedCount);
    return { notes: [...recent, ...unvisited] };
  }
}

export { InspirationSampler };
