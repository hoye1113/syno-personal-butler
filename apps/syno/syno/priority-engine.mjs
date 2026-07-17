const KIND_WEIGHT = Object.freeze({ goal: 500, commitment: 400, review: 300, news: 200, exploration: 100 });
const WORK_MIX = Object.freeze({ digest: 0.6, ingest: 0.25, maintenance: 0.15 });

class PriorityEngine {
  rank(items = [], { now = new Date() } = {}) {
    return [...items].map((item) => {
      const overdue = item.dueAt && new Date(item.dueAt) <= now ? 50 : 0;
      const explicit = Math.max(0, Math.min(100, Number(item.priority || 0)));
      return { ...item, score: (KIND_WEIGHT[item.kind] || 0) + overdue + explicit };
    }).sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
  }

  allocate(total) {
    const count = Math.max(0, Math.floor(Number(total) || 0));
    const digest = Math.round(count * WORK_MIX.digest);
    const ingest = Math.round(count * WORK_MIX.ingest);
    return { digest, ingest, maintenance: Math.max(0, count - digest - ingest) };
  }
}

export { KIND_WEIGHT, PriorityEngine, WORK_MIX };
