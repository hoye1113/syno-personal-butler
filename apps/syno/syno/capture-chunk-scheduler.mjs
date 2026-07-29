const PRIORITY_WEIGHT = Object.freeze({
  interactive: 300,
  foreground: 200,
  background: 100,
});

function priorityWeight(priority) {
  return PRIORITY_WEIGHT[priority] ?? PRIORITY_WEIGHT.background;
}

class CaptureChunkScheduler {
  constructor({ concurrency = 2, reservedCapacity = 1, clock = () => new Date(), providerAvailable = () => true, budget = Number.POSITIVE_INFINITY } = {}) {
    this.concurrency = Math.max(1, Number(concurrency) || 1);
    this.reservedCapacity = Math.min(this.concurrency - 1, Math.max(0, Number(reservedCapacity) || 0));
    this.clock = clock;
    this.providerAvailable = providerAvailable;
    this.budget = Number.isFinite(Number(budget)) ? Math.max(0, Number(budget)) : Number.POSITIVE_INFINITY;
    this.queue = [];
    this.active = new Map();
    this.pumpScheduled = false;
  }

  enqueue({ id, priority = "background", cost = 1, run } = {}) {
    if (!id || typeof run !== "function") throw new Error("CaptureChunkScheduler 需要 id 与 run");
    const numericCost = Math.max(0, Number(cost) || 0);
    return new Promise((resolve, reject) => {
      this.queue.push({ id: String(id), priority, cost: numericCost, enqueuedAt: this.clock().getTime(), run, resolve, reject });
      this.#schedulePump();
    });
  }

  snapshot() {
    return {
      queued: this.queue.length,
      active: this.active.size,
      budgetRemaining: this.budget,
      providerAvailable: Boolean(this.providerAvailable()),
    };
  }

  #schedulePump() {
    if (this.pumpScheduled) return;
    this.pumpScheduled = true;
    queueMicrotask(() => {
      this.pumpScheduled = false;
      this.#pump();
    });
  }

  #rank(item, now) {
    const ageMinutes = Math.max(0, now - item.enqueuedAt) / 60_000;
    return priorityWeight(item.priority) + Math.min(1_000, ageMinutes);
  }

  #pick(now) {
    const providerReady = Boolean(this.providerAvailable());
    if (!providerReady) return null;
    const candidates = this.queue.filter((item) => item.cost <= this.budget);
    if (!candidates.length) return null;
    const hasReservedWork = candidates.some((item) => item.priority !== "background");
    const activeBackground = [...this.active.values()].filter((item) => item.priority === "background").length;
    const backgroundLimit = Math.max(0, this.concurrency - this.reservedCapacity);
    const eligible = candidates.filter((item) => item.priority !== "background" || !hasReservedWork || activeBackground < backgroundLimit);
    if (!eligible.length) return null;
    return eligible.sort((left, right) => this.#rank(right, now) - this.#rank(left, now) || left.enqueuedAt - right.enqueuedAt)[0];
  }

  #pump() {
    const overBudget = this.queue.filter((item) => item.cost > this.budget);
    if (overBudget.length) {
      this.queue = this.queue.filter((item) => item.cost <= this.budget);
      for (const item of overBudget) item.reject(Object.assign(new Error("Capture Provider 预算不足"), { code: "CAPTURE_BUDGET_EXCEEDED", retryable: false }));
    }
    while (this.active.size < this.concurrency) {
      const item = this.#pick(this.clock().getTime());
      if (!item) return;
      this.queue = this.queue.filter((candidate) => candidate !== item);
      this.active.set(item.id, item);
      this.budget -= item.cost;
      Promise.resolve().then(item.run).then(item.resolve, item.reject).finally(() => {
        this.active.delete(item.id);
        this.#schedulePump();
      });
    }
  }
}

export { CaptureChunkScheduler, PRIORITY_WEIGHT, priorityWeight };
