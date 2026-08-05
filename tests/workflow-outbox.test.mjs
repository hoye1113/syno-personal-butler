import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { WorkflowOutbox } from "../apps/syno/syno/workflow-outbox.mjs";

test("WorkflowOutbox is idempotent and retries undelivered workflow events", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-workflow-outbox-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let now = new Date("2026-07-28T00:00:00.000Z");
  const outbox = new WorkflowOutbox({ root, clock: () => now });

  const first = await outbox.enqueue({
    workflowId: "workflow-1",
    eventType: "proposal.ready",
    ownerKey: "owner",
    targetChannel: "weixin",
    threadKey: "main",
    redactedPayload: { text: "方案已准备好" },
    idempotencyKey: "workflow-1:proposal:abc",
  });
  const duplicate = await outbox.enqueue({
    workflowId: "workflow-1",
    eventType: "proposal.ready",
    ownerKey: "owner",
    targetChannel: "weixin",
    threadKey: "main",
    redactedPayload: { text: "方案已准备好" },
    idempotencyKey: "workflow-1:proposal:abc",
  });
  assert.equal(duplicate.eventId, first.eventId);

  const failed = await outbox.deliverDue(async () => ({ delivered: false, reason: "offline" }));
  assert.equal(failed.retryable, 1);
  assert.equal((await outbox.list())[0].status, "failed_retryable");
  assert.equal((await outbox.list())[0].attempts, 1);

  now = new Date("2026-07-28T00:01:00.000Z");
  const delivered = await outbox.deliverDue(async () => ({ delivered: true }));
  assert.equal(delivered.delivered, 1);
  assert.equal((await outbox.list({ includeDelivered: false })).length, 0);
});

test("WorkflowOutbox settles a non-retryable delivery as failed_terminal and never re-attempts it", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-workflow-terminal-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let now = new Date("2026-07-28T00:00:00.000Z");
  const outbox = new WorkflowOutbox({ root, clock: () => now });
  await outbox.enqueue({
    workflowId: "workflow-terminal", eventType: "proposal.ready", ownerKey: "owner", targetChannel: "weixin",
    redactedPayload: { text: "终态" }, idempotencyKey: "workflow-terminal:proposal:1",
  });
  const terminalEvents = [];
  const report = await outbox.deliverDue(
    async () => ({ delivered: false, retryable: false, reason: "channel_missing" }),
    { onFailedTerminal: async (event) => terminalEvents.push(event) },
  );
  assert.equal(report.terminal, 1);
  assert.equal(report.retryable, 0);
  const record = (await outbox.list())[0];
  assert.equal(record.status, "failed_terminal");
  assert.equal(record.lastError.code, "channel_missing");
  assert.equal(terminalEvents.length, 1);

  // A terminal record is filtered out of the next drain — never re-attempted.
  let sends = 0;
  const again = await outbox.deliverDue(async () => { sends += 1; return { delivered: true }; });
  assert.equal(sends, 0);
  assert.equal(again.processed, 0);
});

test("WorkflowOutbox treats a thrown deliver without retryable as failed_retryable", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-workflow-throw-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let now = new Date("2026-07-28T00:00:00.000Z");
  const outbox = new WorkflowOutbox({ root, clock: () => now });
  await outbox.enqueue({
    workflowId: "workflow-throw", eventType: "proposal.ready", ownerKey: "owner", targetChannel: "weixin",
    redactedPayload: { text: "抛错" }, idempotencyKey: "workflow-throw:proposal:1",
  });
  const report = await outbox.deliverDue(async () => { throw new Error("transient boom"); });
  assert.equal(report.retryable, 1);
  assert.equal((await outbox.list())[0].status, "failed_retryable");
});

test("WorkflowOutbox accepts only a bounded redacted text payload", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-outbox-safe-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const outbox = new WorkflowOutbox({ root });
  const base = {
    workflowId: "workflow-safe",
    eventType: "proposal.ready",
    ownerKey: "owner",
    targetChannel: "weixin",
    redactedPayload: { text: "方案已准备" },
  };
  await outbox.enqueue(base);
  await assert.rejects(
    outbox.enqueue({ ...base, idempotencyKey: "raw", redactedPayload: { text: "ok", sourceBody: "secret" } }),
    /redactedPayload/,
  );
  const redacted = await outbox.enqueue({ ...base, idempotencyKey: "secret", redactedPayload: { text: "api_key = super-secret" } });
  assert.doesNotMatch(redacted.redactedPayload.text, /super-secret/);
});

test("WorkflowOutbox grants one durable delivery lease across instances", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-outbox-lease-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const first = new WorkflowOutbox({ root });
  const second = new WorkflowOutbox({ root });
  await first.enqueue({
    workflowId: "workflow-lease",
    eventType: "proposal.ready",
    ownerKey: "owner",
    targetChannel: "weixin",
    redactedPayload: { text: "方案已准备" },
  });

  let releaseFirst;
  const release = new Promise((resolve) => { releaseFirst = resolve; });
  let firstStarted;
  const started = new Promise((resolve) => { firstStarted = resolve; });
  const deliveredEvents = [];
  const firstDrain = first.deliverDue(async (event) => {
    deliveredEvents.push(event.eventId);
    firstStarted();
    await release;
    return { delivered: true };
  });
  await started;

  const secondResult = await second.deliverDue(async (event) => {
    deliveredEvents.push(event.eventId);
    return { delivered: true };
  });
  releaseFirst();
  await firstDrain;

  assert.equal(secondResult.processed, 0);
  assert.equal(deliveredEvents.length, 1);
});

test("WorkflowOutbox.list tolerates a corrupt record file without aborting the whole directory", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-workflow-corrupt-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const outbox = new WorkflowOutbox({ root });
  await outbox.enqueue({
    workflowId: "workflow-good", eventType: "proposal.ready", ownerKey: "owner", targetChannel: "weixin",
    redactedPayload: { text: "完好记录" }, idempotencyKey: "workflow-good:proposal:1",
  });
  // 模拟半写/磁盘损坏：合法前缀但内容非法的 .json。此前会让整目录 list() 抛 → 全部事件停滞。
  await fs.writeFile(path.join(root, "outbox-deadbeefdeadbeefdead.json"), "{ not valid json");
  const records = await outbox.list();
  assert.equal(records.length, 1);
  assert.equal(records[0].workflowId, "workflow-good");
  // 损坏文件不阻断投递：good 记录仍可 drain。
  const report = await outbox.deliverDue(async () => ({ delivered: true }));
  assert.equal(report.delivered, 1);
});

test("WorkflowOutbox.retain evicts old terminal records and keeps non-terminal ones (C8)", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-workflow-retain-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let now = new Date("2026-07-28T00:00:00.000Z");
  const outbox = new WorkflowOutbox({ root, clock: () => now });
  const delivered = await outbox.enqueue({ workflowId: "w-delivered", eventType: "proposal.ready", ownerKey: "o", targetChannel: "weixin", redactedPayload: { text: "已送达" }, idempotencyKey: "w-delivered:proposal:1" });
  const terminal = await outbox.enqueue({ workflowId: "w-terminal", eventType: "proposal.ready", ownerKey: "o", targetChannel: "weixin", redactedPayload: { text: "终态" }, idempotencyKey: "w-terminal:proposal:1" });
  const pending = await outbox.enqueue({ workflowId: "w-pending", eventType: "proposal.ready", ownerKey: "o", targetChannel: "weixin", redactedPayload: { text: "待发" }, idempotencyKey: "w-pending:proposal:1" });
  // delivered → 送达（终态）；terminal → 结构终态；pending → 保持非终态（failed_retryable）。
  await outbox.deliverDue(async (event) => {
    if (event.eventId === terminal.eventId) return { delivered: false, retryable: false, reason: "channel_missing" };
    if (event.eventId === delivered.eventId) return { delivered: true };
    return { delivered: false, reason: "later" };
  });
  // 推进时钟超过 14 天保留期。
  now = new Date("2026-08-12T00:00:00.000Z");
  const result = await outbox.retain();
  assert.equal(result.removed, 2); // delivered + failed_terminal 被淘汰
  const left = await outbox.list();
  assert.deepEqual(left.map((r) => r.eventId), [pending.eventId]); // 非终态保留
});

test("R3: a cap-before-send guard terminates a persistently-throwing delivery at the attempt limit (throw path)", async (t) => {
  // 镜像 runtime.drainWorkflowOutbox 的 deliverDue 回调：cap 检查在 channels.send 之前。
  // R3 之前 cap 在 send 之后——一旦 send 抛错，异常逃出回调被 outbox 归为默认 retryable，
  // 事后 cap 结构性不可达 → 事件无限重试。本例用「持续 throw」锁抛错路径（区别于既有「返回未送达」用例），
  // 证明前置 cap 在 send 抛错时仍可达：达上限那一次 drain 根本不调用 send 即返回终态。
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-workflow-r3-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let now = new Date("2026-07-28T00:00:00.000Z");
  const outbox = new WorkflowOutbox({ root, clock: () => now });
  await outbox.enqueue({
    workflowId: "workflow-r3", eventType: "proposal.ready", ownerKey: "owner", targetChannel: "weixin",
    redactedPayload: { text: "R3 抛错路径" }, idempotencyKey: "workflow-r3:proposal:1",
  });

  const MAX = 8; // = runtime WORKFLOW_OUTBOX_MAX_ATTEMPTS
  let sendThrows = 0;
  const deliver = async (event) => {
    // 前置 cap（与 runtime 一致）：达上限即返回 retryable:false，绝不走到下面的 throw。
    if (Number(event.attempts || 0) >= MAX) {
      return { delivered: false, retryable: false, reason: "WORKFLOW_DELIVERY_EXHAUSTED" };
    }
    sendThrows += 1;
    throw Object.assign(new Error("channel send exploded"), { code: "SEND_EXPLODED" });
  };

  let report;
  let drains = 0;
  do {
    report = await outbox.deliverDue(deliver);
    drains += 1;
    now = new Date(now.getTime() + 2 * 3600_000); // 越过最长退避（上限 1h）使事件重新 due
  } while (report.terminal === 0 && drains < MAX + 2);

  // 关键：达上限那次 drain 未调用 send（cap 在 send 前）→ send 只发生了 MAX 次（前 MAX 次），不是 MAX+1。
  assert.equal(sendThrows, MAX);
  assert.equal(report.terminal, 1);
  const record = (await outbox.list())[0];
  assert.equal(record.status, "failed_terminal");
  assert.equal(record.lastError.code, "WORKFLOW_DELIVERY_EXHAUSTED");

  // 终态后不再重投（即使换成会成功的回调也不再被调用）。
  const again = await outbox.deliverDue(async () => { sendThrows += 1; return { delivered: true }; });
  assert.equal(sendThrows, MAX);
  assert.equal(again.processed, 0);
});
