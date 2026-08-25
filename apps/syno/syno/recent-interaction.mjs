const ACTIVE_JOB_STATUSES = new Set(["pending", "awaiting_approval", "running", "waiting_provider", "validating"]);

function normalizeRecentText(value) {
  return String(value || "").trim().replace(/[\u3000\t ]+/gu, " ");
}

function parseRecentReference(value) {
  const text = normalizeRecentText(value);
  const unknownResolution = /^(?:确认|确定)(?:该事项|这项|这个)?\s*(未执行|没有执行|已执行|已经执行)(?:\s*(?:第\s*)?(\d+)\s*(?:项|个)?)?$/u.exec(text);
  if (unknownResolution) {
    return {
      kind: "unknown_resolution",
      action: "resolve_unknown",
      result: /未执行|没有执行/u.test(unknownResolution[1]) ? "confirmed_not_started" : "confirmed_committed",
      confidence: 1,
      text,
      ...(unknownResolution[2] ? { index: Number(unknownResolution[2]) } : {}),
    };
  }
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

  async snapshot({ ownerKey = "local-user", channel, threadKey = "main", projectRef } = {}) {
    const projectScope = projectRef === undefined ? {} : { projectRef };
    const [decisions, workflows, jobs, accepted, unknown] = await Promise.all([
      this.pendingDecisions?.list({ ownerKey, threadKey, ...projectScope }) || [],
      this.ingestWorkflows?.listPending(ownerKey, projectScope) || [],
      this.core?.host?.list ? this.core.host.list({ limit: this.limit * 3 }) : [],
      this.acceptedRequests?.list ? this.acceptedRequests.list({ ownerKey, ...projectScope, limit: this.limit * 3 }) : [],
      this.reconciliationCases?.list ? this.reconciliationCases.list({ ownerKey, ...projectScope, status: "open", limit: this.limit * 3 }) : [],
    ]);
    const ownedJobs = (jobs || []).filter((job) => job.ownerKey === ownerKey
      && (!channel || job.channel === channel)
      && job.threadKey === threadKey
      && ACTIVE_JOB_STATUSES.has(job.status)
      && (projectRef === undefined || String(job.projectRef || "") === String(projectRef || "")));
    const items = [
      ...(decisions || []).map((item) => ({ kind: "decision", id: item.id, status: "awaiting_decision", createdAt: item.createdAt, updatedAt: item.createdAt, presentationId: item.presentationId || null, ...(item.projectRef !== undefined ? { projectRef: item.projectRef } : {}) })),
      ...(workflows || []).map((item) => ({ kind: "ingest", id: item.id, status: item.stage, createdAt: item.createdAt, updatedAt: item.updatedAt, browserStatus: item.browserStatus || null, ...(item.projectRef !== undefined ? { projectRef: item.projectRef } : {}) })),
      ...ownedJobs.map((item) => ({ kind: "job", id: item.id, status: item.status, createdAt: item.created, updatedAt: item.updated, ...(item.projectRef !== undefined ? { projectRef: item.projectRef } : {}) })),
      ...(accepted || []).filter((item) => !["delivered", "canceled", "failed_terminal"].includes(item.status)).map((item) => ({ kind: "accepted_request", id: item.requestId, status: item.status, createdAt: item.receivedAt, updatedAt: item.updatedAt, originChannel: item.originChannel, ...(item.projectRef !== undefined ? { projectRef: item.projectRef } : {}) })),
      ...(unknown || []).map((item) => ({ kind: "unknown", id: item.caseId, status: item.status, createdAt: item.createdAt, updatedAt: item.updatedAt, toolName: item.toolName, ...(item.projectRef !== undefined ? { projectRef: item.projectRef } : {}) })),
    ].sort(recentSort).slice(0, this.limit);
    return {
      ownerKey: String(ownerKey),
      channel: channel ? String(channel) : null,
      threadKey: String(threadKey),
      projectRef: projectRef === undefined ? null : String(projectRef || ""),
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
    if (reference.action === "resolve_unknown") {
      const unknowns = candidates.filter((item) => item.kind === "unknown");
      const selected = reference.index ? unknowns[reference.index - 1] : unknowns.length === 1 ? unknowns[0] : null;
      if (!selected) {
        if (!unknowns.length) return { kind: "none", text: "当前没有待核对的 Unknown Case。" };
        return { kind: "ambiguous", candidates: unknowns, text: unknowns.slice(0, this.limit).map((item, index) => `${index + 1}. ${item.id}：${item.toolName || "副作用"}`).join("\n") };
      }
      if (typeof this.reconciliationCases?.resolveOwner !== "function") return { kind: "unsupported", item: selected, text: `事项 ${selected.id} 当前不能从移动端核对。` };
      const resolution = await this.reconciliationCases.resolveOwner(selected.id, {
        result: reference.result,
        resolvedBy: "owner",
        channel: context.channel || null,
      }, {
        ownerKey: context.ownerKey,
        ...(context.projectRef !== undefined ? { projectRef: context.projectRef } : {}),
      });
      const nextStep = reference.result === "confirmed_not_started"
        ? "如需重试，请重新发起新请求；系统不会复用原 Invocation Key。"
        : "系统不会再次执行该副作用。";
      return { kind: "resolved", item: selected, resolution, text: `已记录 ${selected.id}：${reference.result === "confirmed_not_started" ? "确认未执行" : "确认已执行"}。${nextStep}` };
    }
    if (reference.action === "inspect") {
      if (candidates.length > 1) return { kind: "ambiguous", candidates, text: candidates.slice(0, this.limit).map((item, index) => `${index + 1}. ${item.id}：${item.status}`).join("\n") };
      return { kind: "resolved", item: candidates[0], text: `最近事项 ${candidates[0].id}：${candidates[0].status}。` };
    }
    const selected = reference.index ? candidates[reference.index - 1] : candidates.length === 1 ? candidates[0] : null;
    if (!selected) return { kind: "ambiguous", candidates, text: candidates.slice(0, this.limit).map((item, index) => `${index + 1}. ${item.id}：${item.status}`).join("\n") };
    if (reference.action === "cancel") {
      if (selected.kind !== "job" || typeof this.core?.cancel !== "function") return { kind: "unsupported", item: selected, text: `事项 ${selected.id} 当前不能从移动端取消。` };
      const result = await this.core.cancel(selected.id, {
        ownerKey: context.ownerKey,
        ...(context.projectRef !== undefined ? { projectRef: context.projectRef } : {}),
      });
      return { kind: "resolved", item: selected, result, text: `已取消 ${selected.id}。` };
    }
    return { kind: "resolved", item: selected, text: `已定位 ${selected.id}（${selected.status}），请继续提供明确操作。` };
  }
}

export { ACTIVE_JOB_STATUSES, RecentInteractionView, normalizeRecentText, parseRecentReference };
