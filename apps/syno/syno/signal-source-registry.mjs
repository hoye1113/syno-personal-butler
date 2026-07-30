import { isActionableOutput } from "./output-lifecycle.mjs";

class SignalSourceRegistry {
  constructor({ claims, ingest, outputs, maintenance, reviewReminders } = {}) {
    this.claims = claims;
    this.ingest = ingest;
    this.outputs = outputs;
    this.maintenance = maintenance;
    this.reviewReminders = reviewReminders;
  }

  async collect({ now = new Date() } = {}) {
    const [claims, intake, outputs, maintenance, reviews] = await Promise.all([
      this.claims?.dueClaims?.({ now }) || [],
      this.ingest?.pending?.() || [],
      this.outputs?.list?.() || [],
      this.maintenance?.inspect?.() || [],
      this.reviewReminders?.due?.({ now }) || [],
    ]);
    return [
      ...claims.map((item) => ({ id: `claim-review:${item.id}`, kind: "claim-review", title: `复核时效主张：${item.statement}`, action: "核对证据与时效", priority: 95, ref: item })),
      // ref 只含稳定字段（id/workflowId/knowledgeRef/dueAt）：presented/done 翻转不改 businessVersion，
      // 同一复习在 candidate 期间只推一次；presented 后 source.due 不再返回，由 SignalEngine 标记 inactive。
      ...reviews.map((item) => ({
        id: item.id,
        kind: "review-due",
        title: `复习「${item.title}」`,
        action: "用自己的话讲讲它（≥20字直接回复即可）；不想现在复习回「跳过复习」",
        priority: 85,
        ref: { id: item.id, workflowId: item.workflowId, knowledgeRef: item.knowledgeRef, dueAt: item.dueAt },
      })),
      ...intake.map((item) => ({ id: `ingest-pending:${item.id}`, kind: "ingest-pending", title: `处理收录候选：${item.title || item.id}`, action: "选择收录方式或暂缓", priority: 75, ref: item })),
      ...outputs
        .filter(isActionableOutput)
        .map((item) => ({ id: `output-opportunity:${item.id}`, kind: "output-opportunity", title: `推进创作：${item.title}`, action: "确认是否推进输出", priority: item.priority || 70, ref: item })),
      ...maintenance.map((item) => ({ id: `knowledge-maintenance:${item.id}`, kind: "knowledge-maintenance", title: `维护知识：${item.title || item.id}`, action: "选择一个维护动作", priority: 50, ref: item })),
    ];
  }
}

export { SignalSourceRegistry };
