import { PriorityEngine } from "./priority-engine.mjs";

class TodayService {
  constructor({ goals, learning, host, priority = new PriorityEngine(), clock = () => new Date() } = {}) {
    this.goals = goals; this.learning = learning; this.host = host; this.priority = priority; this.clock = clock;
  }

  async snapshot({ capacity = 10 } = {}) {
    const now = this.clock();
    const [goals, reviews, jobs] = await Promise.all([
      this.goals.list({ status: "active" }), this.learning.due({ now }), this.host.list({ limit: 100 }),
    ]);
    const commitments = jobs.filter((job) => !["completed", "failed", "rejected", "canceled"].includes(job.status));
    const items = [
      ...goals.map((goal) => ({ id: goal.id, kind: "goal", title: goal.title, priority: goal.priority, dueAt: goal.dueAt, ref: goal })),
      ...commitments.map((job) => ({ id: job.id, kind: "commitment", title: job.request?.summary || job.intent, priority: job.risk === "high" ? 80 : 60, ref: job })),
      ...reviews.map((review) => ({ id: review.id, kind: "review", title: `复习：${review.knowledgeRef}`, priority: Math.round((1 - review.mastery) * 100), dueAt: review.nextReviewAt, ref: review })),
    ];
    return {
      generatedAt: now.toISOString(), priorities: this.priority.rank(items, { now }).slice(0, capacity),
      allocation: this.priority.allocate(capacity), counts: { goals: goals.length, commitments: commitments.length, reviews: reviews.length },
    };
  }
}

export { TodayService };
