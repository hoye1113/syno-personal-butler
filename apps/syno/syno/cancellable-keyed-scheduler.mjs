class SchedulerCancellationError extends Error {
  constructor(message = "调度任务已取消") {
    super(message);
    this.name = "SchedulerCancellationError";
    this.code = "SCHEDULER_CANCELED";
  }
}

class CancellableKeyedScheduler {
  constructor({ name = "scheduler" } = {}) {
    this.name = name;
    this.queues = new Map();
    this.active = new Set();
    this.blocked = new Map();
  }

  enqueue(key, operation) {
    const normalizedKey = String(key);
    if (this.blocked.has(normalizedKey)) {
      const error = this.#blockedError(normalizedKey);
      return { promise: Promise.reject(error), cancel: () => false, state: () => "blocked" };
    }
    let resolvePromise;
    let rejectPromise;
    const entry = {
      state: "queued",
      operation,
      promise: new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      }),
      resolve: (value) => {
        if (entry.state === "completed" || entry.state === "canceled") return;
        entry.state = "completed";
        resolvePromise(value);
      },
      reject: (error) => {
        if (entry.state === "completed" || entry.state === "canceled") return;
        entry.state = error?.code === "SCHEDULER_CANCELED" ? "canceled" : "completed";
        rejectPromise(error);
      },
    };
    const queue = this.queues.get(normalizedKey) || [];
    queue.push(entry);
    this.queues.set(normalizedKey, queue);
    this.#drain(normalizedKey);
    return {
      promise: entry.promise,
      cancel: (reason) => {
        if (entry.state !== "queued") return false;
        entry.reject(reason instanceof Error ? reason : new SchedulerCancellationError());
        this.#drain(normalizedKey);
        return true;
      },
      state: () => entry.state,
    };
  }

  block(key, reason = "调度键状态未知") {
    const normalizedKey = String(key);
    this.blocked.set(normalizedKey, String(reason));
    const error = this.#blockedError(normalizedKey);
    for (const entry of this.queues.get(normalizedKey) || []) {
      if (entry.state === "queued") entry.reject(error);
    }
    this.#drain(normalizedKey);
  }

  unblock(key) {
    const normalizedKey = String(key);
    const removed = this.blocked.delete(normalizedKey);
    if (removed) this.#drain(normalizedKey);
    return removed;
  }

  status(key) {
    const normalizedKey = String(key);
    return {
      active: this.active.has(normalizedKey),
      queued: (this.queues.get(normalizedKey) || []).filter((entry) => entry.state === "queued").length,
      blocked: this.blocked.get(normalizedKey) || null,
    };
  }

  #blockedError(key) {
    return Object.assign(new Error(`${this.name} 已阻止 ${key}：${this.blocked.get(key)}`), {
      code: "SCHEDULER_KEY_BLOCKED",
      scheduler: this.name,
      key,
    });
  }

  #drain(key) {
    if (this.active.has(key) || this.blocked.has(key)) return;
    const queue = this.queues.get(key) || [];
    while (queue.length && queue[0].state !== "queued") queue.shift();
    if (!queue.length) {
      this.queues.delete(key);
      return;
    }
    const entry = queue.shift();
    entry.state = "acquired";
    this.active.add(key);
    Promise.resolve()
      .then(entry.operation)
      .then(entry.resolve, entry.reject)
      .finally(() => {
        this.active.delete(key);
        this.#drain(key);
      });
  }
}

export { CancellableKeyedScheduler, SchedulerCancellationError };
