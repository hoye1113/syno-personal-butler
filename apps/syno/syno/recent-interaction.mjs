const ACTIVE_JOB_STATUSES = new Set(["pending", "awaiting_approval", "running", "waiting_provider", "validating"]);

function normalizeRecentText(value) {
  return String(value || "").trim().replace(/[\u3000\t ]+/gu, " ");
}

function parseRecentReference(value) {
  const text = normalizeRecentText(value);
  if (/^(?:刚才那个|刚才的那个|刚刚那个)(?:吧|呢)?$/u.test(text)) return { kind: "recent_reference", action: "inspect", confidence: 1, text };
  if (/^(?:取消|停止)(?:刚才|刚刚)(?:的)?(?:任务|请求)?(?:吧|呢)?$/u.test(text)) return { kind: "recent_reference", action: "cancel", confidence: 1, text };
  const continuation = /^(?:继续|恢复)\s*(?:(?:刚才|刚刚)(?:的)?)?\s*(?:第\s*)?(\d+)?\s*(?:项|个)?(?:请求|任务|收录)?(?:吧|呢)?$/u.exec(text);
  if (continuation) return { kind: "recent_reference", action: "continue", confidence: 1, text, ...(continuation[1] ? { index: Number(continuation[1]) } : {}) };
  return null;
}

function recentSort(left, right) {
  return String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || ""));
}

class RecentInteractionView {
  constructor({ core, pendingDecisions, ingestWorkflows, acceptedRequests, reconciliationCases, limit = 10 } = {}) {
    this.core = core;
    this.pendingDecisions = pendingDecisions;
    this.ingestWorkflows = ingestWorkflows;
    this.acceptedRequests = acceptedRequests;
    this.reconciliationCases = reconciliationCases;
    this.limit = Math.max(1, Number(limit) || 10);
  }

  async snapshot({ ownerKey = "local-user", channel, threadKey = "main" } = {}) {
    const [decisions, workflows, jobs, accepted, unknown] = await Promise.all([
      this.pendingDecisions?.list({ ownerKey, threadKey }) || [],
      this.ingestWorkflows?.listPending(ownerKey) || [],
      this.core?.host?.list ? this.core.host.list({ limit: this.limit * 3 }) : [],
      this.acceptedRequests?.list ? this.acceptedRequests.list({ ownerKey, limit: this.limit * 3 }) : [],
      this.reconciliationCases?.list ? this.reconciliationCases.list({ ownerKey, status: "open", limit: this.limit * 3 }) : [],
    ]);
    const ownedJobs = (jobs || []).filter((job) => job.ownerKey === ownerKey && (!channel || job.channel === channel) && job.threadKey === threadKey && ACTIVE_JOB_STATUSES.has(job.status));
    const items = [
      ...(decisions || []).map((item) => ({ kind: "decision", id: item.id, status: "awaiting_decision", createdAt: item.createdAt, updatedAt: item.createdAt, presentationId: item.presentationId || null })),
      ...(workflows || []).map((item) => ({ kind: "ingest", id: item.id, status: item.stage, createdAt: item.createdAt, updatedAt: item.updatedAt, browserStatus: item.browserStatus || null })),
      ...ownedJobs.map((item) => ({ kind: "job", id: item.id, status: item.status, createdAt: item.created, updatedAt: item.updated })),
      ...(accepted || []).filter((item) => !["delivered", "canceled", "failed_terminal"].includes(item.status)).map((item) => ({ kind: "accepted_request", id: item.requestId, status: item.status, createdAt: item.receivedAt, updatedAt: item.updatedAt, originChannel: item.originChannel })),
      ...(unknown || []).map((item) => ({ kind: "unknown", id: item.caseId, status: item.status, createdAt: item.createdAt, updatedAt: item.updatedAt, toolName: item.toolName })),
    ].sort(recentSort).slice(0, this.limit);
    return {
      ownerKey: String(ownerKey),
      channel: channel ? String(channel) : null,
      threadKey: String(threadKey),
      generatedAt: new Date().toISOString(),
      currentChannelDecisions: (decisions || []).filter((item) => !channel || item.channel === channel),
      recent: items,
      counts: {
        decisions: (decisions || []).length,
        workflows: (workflows || []).length,
        jobs: ownedJobs.length,
        acceptedRequests: (accepted || []).length,
        unknown: (unknown || []).length,
      },
    };
  }

  async resolve(reference, context = {}) {
    const snapshot = await this.snapshot(context);
    const candidates = snapshot.recent;
    if (!candidates.length) return { kind: "none", text: "当前没有可引用的未完成事项。" };
    if (reference.action === "inspect") {
      if (candidates.length > 1) return { kind: "ambiguous", candidates, text: candidates.slice(0, this.limit).map((item, index) => `${index + 1}. ${item.id}：${item.status}`).join("\n") };
      return { kind: "resolved", item: candidates[0], text: `最近事项 ${candidates[0].id}：${candidates[0].status}。` };
    }
    const selected = reference.index ? candidates[reference.index - 1] : candidates.length === 1 ? candidates[0] : null;
    if (!selected) return { kind: "ambiguous", candidates, text: candidates.slice(0, this.limit).map((item, index) => `${index + 1}. ${item.id}：${item.status}`).join("\n") };
    if (reference.action === "cancel") {
      if (selected.kind !== "job" || typeof this.core?.cancel !== "function") return { kind: "unsupported", item: selected, text: `事项 ${selected.id} 当前不能从移动端取消。` };
      const result = await this.core.cancel(selected.id);
      return { kind: "resolved", item: selected, result, text: `已取消 ${selected.id}。` };
    }
    return { kind: "resolved", item: selected, text: `已定位 ${selected.id}（${selected.status}），请继续提供明确操作。` };
  }
}

export { ACTIVE_JOB_STATUSES, RecentInteractionView, normalizeRecentText, parseRecentReference };
