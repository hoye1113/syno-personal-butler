import { PriorityEngine } from "./priority-engine.mjs";

const JOB_TITLES = Object.freeze({
  "claims.create": "确认一条观点与证据",
  "ingest.apply": "确认一份收录建议",
  "ingest.apply-batch": "确认一批收录建议",
  "learning.evidence.record": "记录一次学习复盘",
  "outputs.opportunity.create": "确认一个创作机会",
  "outputs.opportunity.progress": "推进一个创作输出",
});

function jobTitle(job) {
  const summary = String(job.request?.summary || "");
  return (!summary.startsWith("Syno operation:") && summary)
    || JOB_TITLES[job.request?.operation]
    || JOB_TITLES[job.intent]
    || "处理一项待确认任务";
}

class TodayService {
  constructor({ goals, learning, host, settingsRegistry, signalSources, priority = new PriorityEngine(), clock = () => new Date() } = {}) {
    this.goals = goals; this.learning = learning; this.host = host; this.settingsRegistry = settingsRegistry; this.signalSources = signalSources; this.priority = priority; this.clock = clock;
  }

  async snapshot({ capacity = 10 } = {}) {
    const now = this.clock();
    const reviewLimit = await this.settingsRegistry?.get("learning.dailyReviewCount") || 20;
    const [goals, reviews, jobs, signals] = await Promise.all([
      this.goals.list({ status: "active" }), this.learning.due({ now, limit: reviewLimit }), this.host.list({ limit: 100 }), this.signalSources?.collect({ now }) || [],
    ]);
    const commitments = jobs.filter((job) => !["completed", "failed", "rejected", "canceled"].includes(job.status));
    const items = [
      ...goals.map((goal) => ({ id: goal.id, kind: "goal", title: goal.title, priority: goal.priority, dueAt: goal.dueAt, ref: goal })),
      ...commitments.map((job) => ({ id: job.id, kind: "commitment", title: jobTitle(job), priority: job.risk === "high" ? 80 : 60, ref: job })),
      ...reviews.map((review) => ({ id: review.id, kind: "review", title: `复习：${review.knowledgeRef}`, priority: Math.round((1 - review.mastery) * 100), dueAt: review.nextReviewAt, ref: review })),
      ...signals.map((signal) => ({ id: signal.id, kind: signal.kind === "knowledge-maintenance" ? "exploration" : "news", title: signal.title, priority: signal.priority, ref: signal.ref })),
    ];
    const priorities = this.priority.rank(items, { now }).slice(0, capacity);
    const today = now.toISOString().slice(0, 10);
    const todaysJobs = jobs.filter((job) => (job.updated || job.created || "").startsWith(today));
    const needsYou = [
      ...jobs
        .filter((job) => job.status === "awaiting_approval")
        .map((job) => ({ id: job.id, kind: "approval", title: jobTitle(job), status: job.status, ref: job })),
      ...reviews.map((review) => ({ id: review.id, kind: "review", title: `复习：${review.knowledgeRef}`, status: "due", dueAt: review.nextReviewAt, ref: review })),
      ...signals
        .filter((signal) => signal.kind === "output-opportunity" && ["accepted", "drafting", "practiced"].includes(signal.ref?.status))
        .map((signal) => ({ id: signal.ref.id, kind: "output", title: signal.title, status: signal.ref.status, ref: signal.ref })),
    ];
    const recentIntake = signals
      .filter((signal) => signal.kind === "ingest-pending" && signal.ref?.id)
      .slice(0, 5)
      .map((signal) => ({ id: signal.ref.id, status: signal.ref.status, title: signal.ref.title || signal.title }));
    return {
      generatedAt: now.toISOString(),
      priorities,
      primary: priorities[0] || null,
      needsYou,
      recentIntake,
      progress: {
        completed: todaysJobs.filter((job) => job.status === "completed").length,
        waiting: todaysJobs.filter((job) => ["queued", "running", "awaiting_approval", "waiting_provider"].includes(job.status)).length,
        failed: todaysJobs.filter((job) => job.status === "failed").length,
      },
      allocation: this.priority.allocate(capacity), counts: { goals: goals.length, commitments: commitments.length, reviews: reviews.length, signals: signals.length },
    };
  }
}

export { TodayService };
