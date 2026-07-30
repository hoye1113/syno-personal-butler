// 复习提醒查询/策略层（与 KnowledgeMaintenanceSource 同构）：
// PostIngestCandidateStore 保持纯持久化，due/送达确认/活跃查询/跳过策略集中在此。

const REVIEW_ID_PREFIX = "review-due:";
const DEFAULT_TTL_MS = 72 * 60 * 60 * 1_000;

// knowledgeRef（vault 相对路径）→ 人类可读标题：basename 去 .md。
function titleFromKnowledgeRef(knowledgeRef) {
  const base = String(knowledgeRef || "").split("/").pop() || "";
  return base.replace(/\.md$/i, "") || "未命名笔记";
}

class ReviewReminderSource {
  constructor({ candidates, clock = () => new Date(), ttlMs = DEFAULT_TTL_MS } = {}) {
    if (!candidates) throw new Error("复习提醒源缺少候选库");
    this.candidates = candidates;
    this.clock = clock;
    this.ttlMs = ttlMs;
  }

  // 到点待推送的复习候选，映射为信号层可用的提醒项。
  // 只暴露稳定字段（id/workflowId/knowledgeRef/dueAt/title），保证状态翻转不改 businessVersion。
  async due({ now = this.clock(), limit = 10 } = {}) {
    const reviews = await this.candidates.dueReviews({ now, limit });
    return reviews.map((review) => ({
      id: `${REVIEW_ID_PREFIX}${review.workflowId}`,
      workflowId: review.workflowId,
      knowledgeRef: review.knowledgeRef,
      title: titleFromKnowledgeRef(review.knowledgeRef),
      dueAt: review.dueAt,
    }));
  }

  // 真实送达后确认（proactive-orchestrator #applyBundleDelivered 的回调）：
  // 只认 review-due: 前缀的 subjectKey，其他信号种类静默忽略；单项失败不阻塞其余。
  // 返回本轮确认处于 presented 的条数。
  async acknowledgeDelivered(identities = []) {
    let acknowledged = 0;
    for (const identity of identities || []) {
      const subjectKey = String(identity?.subjectKey || "");
      if (!subjectKey.startsWith(REVIEW_ID_PREFIX)) continue;
      const workflowId = subjectKey.slice(REVIEW_ID_PREFIX.length);
      if (!workflowId) continue;
      try {
        const review = await this.candidates.markReviewPresented(workflowId, { presentedAt: this.clock().toISOString() });
        if (review?.status === "presented") acknowledged += 1;
      } catch {
        // 单项失败不阻塞：候选仍是 candidate，下个 tick 重推后仍会被确认
      }
    }
    return acknowledged;
  }

  // teach-back 门用：presented 且 TTL 内的活跃复习（presentedAt 倒序）。
  async active({ now = this.clock(), ttlMs = this.ttlMs, limit = 3 } = {}) {
    const reviews = await this.candidates.findActiveReviews({ now, ttlMs, limit });
    return reviews.map((review) => ({
      workflowId: review.workflowId,
      knowledgeRef: review.knowledgeRef,
      title: titleFromKnowledgeRef(review.knowledgeRef),
      presentedAt: review.presentedAt,
    }));
  }

  // 「跳过复习」：跳过最近一条活跃复习，返回被跳过项；无活跃复习返回 null。
  async dismissLatest({ now = this.clock(), ttlMs = this.ttlMs } = {}) {
    const [latest] = await this.active({ now, ttlMs, limit: 1 });
    if (!latest) return null;
    const dismissed = await this.candidates.dismissReview(latest.workflowId, { dismissedAt: now.toISOString() });
    if (!dismissed) return null;
    return { ...latest, status: dismissed.status, dismissedAt: dismissed.dismissedAt };
  }
}

export { ReviewReminderSource, REVIEW_ID_PREFIX, titleFromKnowledgeRef };
