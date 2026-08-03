class AcceptedRequestRecoveryWorker {
  constructor({ store, processRequest = async () => ({ status: "waiting_provider" }), intervalMs = 60_000, clock = () => new Date(), backoffMs = 30_000, onEscalation = null, escalationThreshold = 10 } = {}) {
    if (!store) throw new Error("AcceptedRequestRecoveryWorker 缺少 AcceptedRequestStore");
    this.store = store;
    this.processRequest = processRequest;
    this.intervalMs = Math.max(1_000, Number(intervalMs) || 60_000);
    this.clock = clock;
    this.backoffMs = Math.max(1_000, Number(backoffMs) || 30_000);
    // O7：accepted_request 不能转 terminal（会孤儿回执），故持续重试；但 retries 超阈值时回调告警，让“静默无限重试”变可观测。
    this.onEscalation = typeof onEscalation === "function" ? onEscalation : null;
    this.escalationThreshold = Math.max(1, Number(escalationThreshold) || 10);
    this.timer = null;
    this.running = false;
  }

  async runOnce() {
    await this.store.recoverExpired({ now: this.clock() });
    const now = this.clock();
    const candidates = [
      ...(await this.store.list({ status: "accepted", limit: 100 })),
      ...(await this.store.list({ status: "failed_retryable", limit: 100 })).filter((item) => !item.nextAttemptAt || new Date(item.nextAttemptAt).getTime() <= now.getTime()),
      ...(await this.store.list({ status: "waiting_provider", limit: 100 })).filter((item) => !item.nextAttemptAt || new Date(item.nextAttemptAt).getTime() <= now.getTime()),
    ];
    const seen = new Set();
    const report = { scanned: candidates.length, claimed: 0, completed: 0, retryable: 0, unavailable: 0 };
    for (const candidate of candidates) {
      if (seen.has(candidate.requestId)) continue;
      seen.add(candidate.requestId);
      const claim = await this.store.claim(candidate.requestId, { workerId: `accepted-recovery-${process.pid}`, now });
      if (!claim.claimed) continue;
      // 命中阈值时触发一次升级告警（best-effort，不阻断恢复循环，也不转 terminal）。
      const attempts = Number(claim.request?.attempts || 0);
      if (this.onEscalation && attempts === this.escalationThreshold) {
        try { await this.onEscalation(claim.request); } catch { /* 升级告警失败不影响恢复 */ }
      }
      report.claimed += 1;
      try {
        const request = await this.store.get(candidate.requestId, { includePayload: true });
        const result = await this.processRequest(request);
        const status = ["waiting_provider", "failed_retryable", "failed_terminal", "canceled", "delivered", "final_pending"].includes(result?.status)
          ? result.status
          : "waiting_provider";
        await this.store.update(candidate.requestId, {
          status,
          claim: null,
          route: result?.route || null,
          ...(result?.nextAttemptAt ? { nextAttemptAt: result.nextAttemptAt } : {}),
          ...(result?.status === "delivered" ? { finalEventId: result.finalEventId || null } : {}),
          ...(result?.lastErrorCode ? { lastErrorCode: result.lastErrorCode } : {}),
        });
        if (status === "delivered") report.completed += 1;
        else if (status === "failed_retryable" || status === "waiting_provider") report.retryable += 1;
      } catch (error) {
        const nextAttemptAt = new Date(now.getTime() + this.backoffMs).toISOString();
        await this.store.update(candidate.requestId, {
          status: "failed_retryable",
          claim: null,
          nextAttemptAt,
          lastErrorCode: error.code || "ACCEPTED_REQUEST_RECOVERY_FAILED",
        });
        report.retryable += 1;
      }
    }
    return report;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      // single-flight：上一轮 runOnce 未结束时跳过本轮，避免长周期叠加并发恢复（O10）。
      if (this.running) return;
      this.running = true;
      this.runOnce().catch(() => {}).finally(() => { this.running = false; });
    }, this.intervalMs);
    this.timer.unref?.();
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
  }
}

export { AcceptedRequestRecoveryWorker };
