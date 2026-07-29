class EffectReconciliationWorker {
  constructor({ store, reconcileReadOnly, workerId = `reconcile-${process.pid}`, intervalMs = 60_000, limit = 20 } = {}) {
    if (!store || typeof reconcileReadOnly !== "function") throw new Error("EffectReconciliationWorker 缺少 Store 或只读 reconcile 函数");
    this.store = store;
    this.reconcileReadOnly = reconcileReadOnly;
    this.workerId = workerId;
    this.intervalMs = Math.max(1_000, Number(intervalMs) || 60_000);
    this.limit = Math.max(1, Number(limit) || 20);
    this.timer = null;
    this.running = false;
  }

  async runOnce() {
    await this.store.recoverExpired();
    const cases = await this.store.list({ status: "open", limit: this.limit });
    const outcomes = [];
    for (const candidate of cases) {
      const claimed = await this.store.claim(candidate.caseId, { workerId: this.workerId });
      if (!claimed.claimed) continue;
      try {
        const outcome = await this.reconcileReadOnly(claimed.case);
        if (outcome?.resolved) await this.store.resolveSystem(claimed.case.caseId, { result: outcome.result || "resolved", details: outcome.details || null });
        else await this.store.recordFailure(claimed.case.caseId, { workerId: this.workerId, errorCode: outcome?.errorCode || "RECONCILE_UNRESOLVED", nextReconcileAt: outcome?.nextReconcileAt });
        outcomes.push({ caseId: claimed.case.caseId, ...outcome });
      } catch (error) {
        await this.store.recordFailure(claimed.case.caseId, { workerId: this.workerId, errorCode: error.code || "RECONCILE_FAILED" });
        outcomes.push({ caseId: claimed.case.caseId, resolved: false, errorCode: error.code || "RECONCILE_FAILED" });
      }
    }
    return outcomes;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.runOnce().catch(() => {}), this.intervalMs);
    this.timer.unref?.();
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
  }
}

export { EffectReconciliationWorker };
