import { PriorityEngine } from "./priority-engine.mjs";
import { isActionableOutput } from "./output-lifecycle.mjs";

const JOB_TITLES = Object.freeze({
  "claims.create": "确认一条观点与证据",
  "ingest.apply": "确认一份收录建议",
  "ingest.apply-batch": "确认一批收录建议",
  "learning.evidence.record": "记录一次学习复盘",
  "outputs.opportunity.create": "确认一个创作机会",
  "outputs.opportunity.progress": "推进一个创作输出",
});

// 固定 area/intent 映射
const ACTION_MAP = Object.freeze({
  goal: { area: "today", intent: "view-goal" },
  commitment: { area: "approvals", intent: "view-job" },
  approval: { area: "approvals", intent: "view-job" },
  review: { area: "learn", intent: "start-review" },
  digest: { area: "learn", intent: "start-review" },
  ingest: { area: "capture", intent: "review-ingest" },
  "output-opportunity": { area: "create", intent: "continue-output" },
  "knowledge-maintenance": { area: "knowledge", intent: "review-maintenance" },
  exploration: { area: "knowledge", intent: "review-maintenance" },
  news: { area: "knowledge", intent: "review-maintenance" },
});

function jobTitle(job) {
  const summary = String(job.request?.summary || "");
  return (!summary.startsWith("Syno operation:") && summary)
    || JOB_TITLES[job.request?.operation]
    || JOB_TITLES[job.intent]
    || "处理一项待确认任务";
}

function typedAction(kind, id, title, ref, extra = {}) {
  const mapping = ACTION_MAP[kind] || { area: "today", intent: "view-goal" };
  return {
    id,
    kind,
    title,
    area: extra.area || mapping.area,
    intent: extra.intent || mapping.intent,
    ref,
    ...extra,
  };
}

class TodayService {
  constructor({ goals, learning, host, settingsRegistry, signalSources, planner, priority = new PriorityEngine(), clock = () => new Date() } = {}) {
    this.goals = goals;
    this.learning = learning;
    this.host = host;
    this.settingsRegistry = settingsRegistry;
    this.signalSources = signalSources;
    this.planner = planner;
    this.priority = priority;
    this.clock = clock;
  }

  async snapshot({ capacity = 10 } = {}) {
    const now = this.clock();
    const reviewLimit = await this.settingsRegistry?.get("learning.dailyReviewCount") || 20;
    const [goals, reviews, jobs, signals] = await Promise.all([
      this.goals.list({ status: "active" }),
      this.learning.due({ now, limit: reviewLimit }),
      this.host.list({ limit: 100 }),
      this.signalSources?.collect({ now }) || [],
    ]);

    // 获取每日计划（如果 planner 可用）
    let plan = null;
    if (this.planner) {
      try { plan = await this.planner.planDay({ now }); } catch { /* planner 离线时降级 */ }
    }

    const commitments = jobs.filter((job) => !["completed", "failed", "rejected", "canceled"].includes(job.status));

    // 构建 typed action 列表
    const items = [
      ...goals.map((goal) => typedAction("goal", goal.id, goal.title, goal, { priority: goal.priority, dueAt: goal.dueAt })),
      ...commitments.map((job) => typedAction("commitment", job.id, jobTitle(job), job, { priority: job.risk === "high" ? 80 : 60 })),
      ...reviews.map((review) => typedAction("review", review.id, `复习：${review.knowledgeRef}`, review, {
        priority: Math.round((1 - review.mastery) * 100),
        dueAt: review.nextReviewAt,
      })),
      ...signals.map((signal) => {
        const kind = signal.kind === "knowledge-maintenance" ? "exploration" : "news";
        return typedAction(kind, signal.id, signal.title, signal.ref, { priority: signal.priority });
      }),
    ];

    const priorities = this.priority.rank(items, { now }).slice(0, capacity);
    const today = now.toISOString().slice(0, 10);
    const todaysJobs = jobs.filter((job) => (job.updated || job.created || "").startsWith(today));

    // needsYou: 所有待主人操作的 typed action
    const needsYou = [
      ...jobs
        .filter((job) => job.status === "awaiting_approval")
        .map((job) => typedAction("approval", job.id, jobTitle(job), job, { status: job.status })),
      ...reviews.map((review) => typedAction("review", review.id, `复习：${review.knowledgeRef}`, review, {
        status: "due",
        dueAt: review.nextReviewAt,
      })),
      ...signals
        .filter((signal) => signal.kind === "output-opportunity" && isActionableOutput(signal.ref) && signal.ref?.status !== "suggested")
        .map((signal) => typedAction("output-opportunity", signal.ref.id, signal.title, signal.ref, { status: signal.ref.status })),
    ];

    // recentIntake: 待确认收录
    const recentIntake = signals
      .filter((signal) => signal.kind === "ingest-pending" && signal.ref?.id)
      .slice(0, 5)
      .map((signal) => typedAction("ingest", signal.ref.id, signal.ref.title || signal.title, signal.ref, { status: signal.ref.status }));

    // 建议学习（来自 planner）与到期复习分离
    const suggestedLearning = plan?.items
      ?.filter((item) => item.kind === "digest" || item.kind === "output")
      .map((item) => typedAction(item.kind, item.id, item.title, item.ref, {
        reason: item.reason,
        priority: item.priority,
        planItemId: item.id,
      })) || [];

    const dueReviews = plan?.items
      ?.filter((item) => item.kind === "review")
      .map((item) => typedAction("review", item.id, item.title, item.ref, {
        reason: item.reason,
        priority: item.priority,
        dueAt: item.dueAt,
        planItemId: item.id,
      })) || [];

    return {
      generatedAt: now.toISOString(),
      // Goal 为 0 时的引导提示
      guidance: goals.length === 0 ? "告诉 Syno 你最近最想掌握什么，我来帮你制定学习计划" : null,
      priorities,
      primary: priorities[0] || null,
      needsYou,
      recentIntake,
      // 分开展示
      suggestedLearning,
      dueReviews,
      plan: plan ? { id: plan.id, localDate: plan.localDate, capacity: plan.capacity, allocation: plan.allocation } : null,
      progress: {
        completed: todaysJobs.filter((job) => job.status === "completed").length,
        waiting: todaysJobs.filter((job) => ["queued", "running", "awaiting_approval", "waiting_provider"].includes(job.status)).length,
        failed: todaysJobs.filter((job) => job.status === "failed").length,
      },
      allocation: this.priority.allocate(capacity),
      counts: { goals: goals.length, commitments: commitments.length, reviews: reviews.length, signals: signals.length },
    };
  }
}

export { TodayService };
