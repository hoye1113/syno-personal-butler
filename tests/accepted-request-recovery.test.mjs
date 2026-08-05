import assert from "node:assert/strict";
import test from "node:test";

import { AcceptedRequestRecoveryWorker } from "../apps/syno/syno/accepted-request-recovery.mjs";

// 守护 O7：accepted_request 不能转 terminal（会孤儿回执），故持续重试；
// 但 retries 命中阈值时触发一次升级告警，让“静默无限重试”变可观测。

function mockStore({ attempts }) {
  return {
    lastPatch: null,
    async recoverExpired() { return []; },
    // 忽略 status 过滤，统一返回同一条卡住的请求；worker 内部 seen 去重保证只处理一次。
    async list() { return [{ requestId: "req-stuck", status: "failed_retryable" }]; },
    async claim() { return { claimed: true, request: { requestId: "req-stuck", attempts, ownerKey: "owner", originChannel: "weixin", lastErrorCode: "PROVIDER_DOWN" } }; },
    async get() { return { requestId: "req-stuck" }; },
    async update(requestId, patch) { this.lastPatch = { requestId, ...patch }; return this.lastPatch; },
  };
}

test("recovery escalates exactly at the attempt threshold without going terminal (O7)", async () => {
  const escalated = [];
  const worker = (attempts) => new AcceptedRequestRecoveryWorker({
    store: mockStore({ attempts }),
    processRequest: async () => ({ status: "failed_retryable", nextAttemptAt: "2026-08-02T00:01:00.000Z", lastErrorCode: "PROVIDER_DOWN" }),
    clock: () => new Date("2026-08-02T00:00:00.000Z"),
    onEscalation: async (request) => { escalated.push(request); },
    escalationThreshold: 3,
  });

  // 未到阈值：不升级。
  const below = worker(2);
  await below.runOnce();
  assert.equal(escalated.length, 0);

  // 命中阈值：升级一次。
  const at = worker(3);
  const report = await at.runOnce();
  assert.equal(escalated.length, 1);
  assert.equal(escalated[0].requestId, "req-stuck");
  assert.equal(escalated[0].attempts, 3);
  // 仍保持重试（retryable），绝不转 terminal——不孤儿。
  assert.equal(report.retryable, 1);
  assert.notEqual(at.store.lastPatch?.status, "failed_terminal");

  // 超过阈值（如第 4 次）：不再重复升级（只在精确命中时触发一次）。
  const above = worker(4);
  await above.runOnce();
  assert.equal(escalated.length, 1);
});

test("recovery without an onEscalation hook still retries normally (O7)", async () => {
  const store = mockStore({ attempts: 99 });
  const worker = new AcceptedRequestRecoveryWorker({
    store,
    processRequest: async () => ({ status: "failed_retryable", nextAttemptAt: "2026-08-02T00:01:00.000Z" }),
    clock: () => new Date("2026-08-02T00:00:00.000Z"),
  });
  const report = await worker.runOnce();
  assert.equal(report.retryable, 1);
  assert.notEqual(store.lastPatch?.status, "failed_terminal");
});

test("a tick whose runOnce throws is surfaced via recordEvent, not silently swallowed (R1)", async () => {
  // store.recoverExpired 是 runOnce 的首个 await；让它抛错 → runOnce reject。
  // 此前 start() 的 .catch(()=>{}) 会把恢复静默停滞；R1 改为经 recordEvent 落 journal。
  const throwingStore = Object.assign(Object.create(mockStore({ attempts: 1 })), {
    async recoverExpired() { throw Object.assign(new Error("state dir 权限被撤"), { code: "STORE_RECOVER_IO" }); },
  });
  const events = [];
  const worker = new AcceptedRequestRecoveryWorker({
    store: throwingStore,
    processRequest: async () => ({ status: "waiting_provider" }),
    clock: () => new Date("2026-08-02T00:00:00.000Z"),
    intervalMs: 1_000, // 构造函数下限
    recordEvent: (event, data) => { events.push({ event, data }); },
  });
  worker.start();
  try {
    // 等首个 tick（~1s）触发并落事件，最长等 3s 防卡死。
    const started = Date.now();
    await new Promise((resolve) => {
      const handle = setInterval(() => {
        if (events.length > 0 || Date.now() - started > 3_000) { clearInterval(handle); resolve(); }
      }, 25);
    });
  } finally {
    worker.stop();
  }
  const failed = events.find((e) => e.event === "accepted_request.recovery_failed");
  assert.ok(failed, "runOnce 的异常必须经 recordEvent 落 accepted_request.recovery_failed");
  assert.equal(failed.data.error.code, "STORE_RECOVER_IO");
  // finally 复位 single-flight 标记——下一 tick 仍可运行（未卡死）。
  assert.equal(worker.running, false);
  assert.equal(worker.timer, null); // stop 已清理
});
