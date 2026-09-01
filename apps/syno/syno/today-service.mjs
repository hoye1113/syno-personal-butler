import { PriorityEngine } from "./priority-engine.mjs";
import { isActionableOutput } from "./output-lifecycle.mjs";

const JOB_TITLES = Object.freeze({
  "claims.create": "确认一条观点与证据",
  "ingest.apply": "确认一份收录建议",
  "ingest.apply-batch": "确认一批收录建议",
  "outputs.opportunity.create": "确认一个创作机会",
  "outputs.opportunity.progress": "推进一个创作输出",
});

// 固定 area/intent 映射（2026-09-01 起无复习/学习区：消化重读归入 knowledge 区）
const ACTION_MAP = Object.freeze({
  goal: { area: "today", intent: "view-goal" },
  commitment: { area: "approvals", intent: "view-job" },
  approval: { area: "approvals", intent: "view-job" },
  digest: { area: "knowledge", intent: "read-note" },
  ingest: { area: "capture", intent: "review-ingest" },
  claim: { area: "knowledge", intent: "review-claim" },
  "output-opportunity": { area: "create", intent: "continue-output" },
  "knowledge-maintenance": { area: "knowledge", intent: "review-maintenance" },
  exploration: { area: "knowledge", intent: "review-maintenance" },
  news: { area: "knowledge", intent: "review-maintenance" },
});

// 信号 kind → ACTION_MAP key（约束 3.3 固定映射）
const SIGNAL_KIND_TO_ACTION = Object.freeze({
  "claim-review": "claim",
  "ingest-pending": "ingest",
  "output-opportunity": "output-opportunity",
  "knowledge-maintenance": "knowledge-maintenance",
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
  constructor({ goals, host, settingsRegistry, signalSources, planner, priority = new PriorityEngine(), clock = () => new Date() } = {}) {
    this.goals = goals;
    this.host = host;
    this.settingsRegistry = settingsRegistry;
    this.signalSources = signalSources;
    this.planner = planner;
    this.priority = priority;
    this.clock = clock;
  }

  async snapshot({ capacity = 10 } = {}) {
    const now = this.clock();
    const [goals, jobs, signals] = await Promise.all([
      this.goals.list({ status: "active" }),
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
      ...signals.map((signal) => {
        const kind = SIGNAL_KIND_TO_ACTION[signal.kind] || "news";
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
      ...signals
        .filter((signal) => signal.kind === "output-opportunity" && isActionableOutput(signal.ref) && signal.ref?.status !== "suggested")
        .map((signal) => typedAction("output-opportunity", signal.ref.id, signal.title, signal.ref, { status: signal.ref.status })),
    ];

    // recentIntake: 待确认收录
    const recentIntake = signals
      .filter((signal) => signal.kind === "ingest-pending" && signal.ref?.id)
      .slice(0, 5)
      .map((signal) => typedAction("ingest", signal.ref.id, signal.ref.title || signal.title, signal.ref, { status: signal.ref.status }));

    // 建议重读/创作（来自 planner）
    const suggestedLearning = plan?.items
      ?.filter((item) => item.kind === "digest" || item.kind === "output")
      .map((item) => typedAction(item.kind, item.id, item.title, item.ref, {
        reason: item.reason,
        priority: item.priority,
        planItemId: item.id,
      })) || [];

    return {
      generatedAt: now.toISOString(),
      // Goal 为 0 时的引导提示
      guidance: goals.length === 0 ? "告诉 Syno 你最近最关注什么主题，我来帮你串联知识库" : null,
      priorities,
      primary: priorities[0] || null,
      needsYou,
      recentIntake,
      suggestedLearning,
      plan: plan ? { id: plan.id, localDate: plan.localDate, capacity: plan.capacity, allocation: plan.allocation } : null,
      progress: {
        completed: todaysJobs.filter((job) => job.status === "completed").length,
        waiting: todaysJobs.filter((job) => ["queued", "running", "awaiting_approval", "waiting_provider"].includes(job.status)).length,
        failed: todaysJobs.filter((job) => job.status === "failed").length,
      },
      allocation: this.priority.allocate(capacity),
      counts: { goals: goals.length, commitments: commitments.length, signals: signals.length },
    };
  }
}

export { TodayService };
