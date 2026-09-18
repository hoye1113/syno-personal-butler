import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

import { NotificationStore } from "../apps/syno/syno/notification-store.mjs";
import { routeSynoApi } from "../apps/syno/syno/runtime.mjs";

test("delivery notifications persist only in rebuildable runtime state", async (t) => {
  const root = await fs.mkdtemp(path.join(process.cwd(), ".runtime", "notification-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const runtimeRoot = path.join(root, "runtime");
  const opsRoot = path.join(root, "ops");
  const store = new NotificationStore({ runtimeRoot, opsRoot, clock: () => new Date("2026-07-20T08:00:00.000Z") });
  const notice = await store.add({ title: "晚间复盘", body: "今天完成了什么？", data: { idempotencyKey: "evening:2026-07-20" } });

  assert.equal(notice.recordPath, null);
  assert.match(notice.statePath, /^local-state:\/\/notifications\//);
  assert.deepEqual(await fs.readdir(path.join(runtimeRoot, "notifications", "2026", "07")), [`${notice.id}.md`]);
  await assert.rejects(fs.access(path.join(opsRoot, "notifications")), /ENOENT/);
  assert.equal((await store.list())[0].id, notice.id);
});

test("one proactive Web audit record tracks its unique Outbox event and delivery status", async (t) => {
  const root = await fs.mkdtemp(path.join(process.cwd(), ".runtime", "notification-delivery-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new NotificationStore({ runtimeRoot: path.join(root, "runtime"), clock: () => new Date("2026-07-30T08:00:00.000Z") });
  const key = "proactive-bundle:weixin:v1";
  const notice = await store.add({
    title: "行动摘要",
    body: "本地审计",
    source: "proactive-audit",
    data: { idempotencyKey: key, bundleId: "proactive-bundle", outboxEventId: "outbox-1", status: "pending" },
  });
  const updated = await store.updateDeliveryStatus(key, { status: "delivery_unknown", outboxEventId: "outbox-1" });
  assert.equal(updated.id, notice.id);
  const records = await store.list();
  assert.equal(records.length, 1);
  assert.deepEqual(records[0].data, {
    idempotencyKey: key,
    bundleId: "proactive-bundle",
    outboxEventId: "outbox-1",
    status: "delivery_unknown",
  });
});

test("archived notifications remain idempotent and hidden from the live list", async (t) => {
  const root = await fs.mkdtemp(path.join(process.cwd(), ".runtime", "notification-archive-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let now = new Date("2026-07-31T08:00:00.000Z");
  const store = new NotificationStore({ runtimeRoot: path.join(root, "runtime"), clock: () => now });
  const key = "proactive-summary:2026-07-31";
  const original = await store.add({ title: "原始摘要", body: "只保留一份", data: { idempotencyKey: key } });

  assert.deepEqual(await store.archive({ ids: [original.id] }), { archived: 1, ids: [original.id], failed: [], missing: [] });
  assert.deepEqual(await store.list(), []);

  now = new Date("2026-08-01T08:00:00.000Z");
  const duplicate = await store.add({ title: "不应重新生成", body: "仍返回归档记录", data: { idempotencyKey: key } });
  assert.equal(duplicate.id, original.id);
  assert.equal(duplicate.title, "原始摘要");
  assert.equal(duplicate.created, original.created);
  assert.match(duplicate.statePath, /^local-state:\/\/notifications-archive\//);
  assert.equal((await store.list()).length, 0);
});

test("archiving by cutoff preserves delivery updates in the archive", async (t) => {
  const root = await fs.mkdtemp(path.join(process.cwd(), ".runtime", "notification-cutoff-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let now = new Date("2026-07-31T08:00:00.000Z");
  const store = new NotificationStore({ runtimeRoot: path.join(root, "runtime"), clock: () => now });
  const oldKey = "proactive-old:2026-07-31";
  const oldNotice = await store.add({ title: "旧消息", body: "应归档", data: { idempotencyKey: oldKey } });
  now = new Date("2026-08-02T08:00:00.000Z");
  const current = await store.add({ title: "当前消息", body: "应保留", data: { idempotencyKey: "proactive-current:2026-08-02" } });

  assert.deepEqual(await store.archive({ before: "2026-08-01T00:00:00.000Z" }), { archived: 1, ids: [oldNotice.id], failed: [], missing: [] });
  const updated = await store.updateDeliveryStatus(oldKey, { status: "failed_terminal", outboxEventId: "outbox-old" });
  assert.equal(updated.id, oldNotice.id);
  assert.equal(updated.data.status, "failed_terminal");
  assert.deepEqual((await store.list()).map((item) => item.id), [current.id]);
  await assert.rejects(store.archive({}), { code: "NOTIFICATION_ARCHIVE_SELECTOR_REQUIRED" });
});

test("notification archive endpoint runs through the control mutation path", async (t) => {
  const root = await fs.mkdtemp(path.join(process.cwd(), ".runtime", "notification-route-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new NotificationStore({ runtimeRoot: path.join(root, "runtime"), clock: () => new Date("2026-08-03T08:00:00.000Z") });
  const notice = await store.add({ title: "归档入口", body: "受控", data: { idempotencyKey: "archive-route:2026-08-03" } });
  const calls = [];
  const runtime = {
    notifications: store,
    controlMutationLock: {
      runExclusive(task) {
        calls.push("locked");
        return task();
      },
    },
  };
  const result = await routeSynoApi(
    runtime,
    { method: "POST" },
    new URL("http://localhost/api/syno/notifications/archive"),
    async () => ({ ids: [notice.id] }),
  );
  assert.deepEqual(result, { archived: 1, ids: [notice.id], failed: [], missing: [] });
  assert.deepEqual(calls, ["locked"]);
});

test("settled proactive audit notifications stay out of the live list but remain available to migration", async (t) => {
  const root = await fs.mkdtemp(path.join(process.cwd(), ".runtime", "notification-visibility-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new NotificationStore({ runtimeRoot: path.join(root, "runtime"), clock: () => new Date("2026-08-04T08:00:00.000Z") });
  const delivered = await store.add({
    title: "已送达",
    body: "不应出现在工作台",
    source: "proactive-audit",
    data: { idempotencyKey: "visibility:delivered", status: "delivered" },
  });
  const pending = await store.add({
    title: "待处理",
    body: "应保留",
    source: "proactive-audit",
    data: { idempotencyKey: "visibility:pending", status: "pending" },
  });

  assert.deepEqual((await store.list()).map((item) => item.id), [pending.id]);
  assert.deepEqual(new Set((await store.list({ includeSettled: true })).map((item) => item.id)), new Set([delivered.id, pending.id]));
});

test("legacy dated archive directories migrate before deduplication", async (t) => {
  const root = await fs.mkdtemp(path.join(process.cwd(), ".runtime", "notification-migration-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const runtimeRoot = path.join(root, "runtime");
  const store = new NotificationStore({ runtimeRoot, clock: () => new Date("2026-08-05T08:00:00.000Z") });
  const key = "legacy-archive:2026-08-05";
  const notice = await store.add({ title: "旧归档", body: "迁移", data: { idempotencyKey: key } });
  const relative = path.join("2026", "08", `${notice.id}.md`);
  const legacyFile = path.join(runtimeRoot, "notifications-archive-20260917", relative);
  await fs.mkdir(path.dirname(legacyFile), { recursive: true });
  await fs.rename(path.join(runtimeRoot, "notifications", relative), legacyFile);

  const restored = new NotificationStore({ runtimeRoot, clock: () => new Date("2026-08-06T08:00:00.000Z") });
  const duplicate = await restored.add({ title: "不应重建", body: "使用旧归档", data: { idempotencyKey: key } });
  assert.equal(duplicate.id, notice.id);
  assert.match(duplicate.statePath, /^local-state:\/\/notifications-archive\//);
  await assert.rejects(fs.access(legacyFile), /ENOENT/);
  assert.deepEqual(await fs.readdir(path.join(runtimeRoot, "notifications-archive", "2026", "08")), [`${notice.id}.md`]);
});

test("archiving a live duplicate updates the existing canonical archive without losing status", async (t) => {
  const root = await fs.mkdtemp(path.join(process.cwd(), ".runtime", "notification-archive-duplicate-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const runtimeRoot = path.join(root, "runtime");
  const store = new NotificationStore({ runtimeRoot, clock: () => new Date("2026-08-06T08:00:00.000Z") });
  const key = "archive-duplicate:2026-08-06";
  const notice = await store.add({ title: "旧版本", body: "旧状态", data: { idempotencyKey: key, status: "pending" } });
  const relative = path.join("2026", "08", `${notice.id}.md`);
  const canonical = path.join(runtimeRoot, "notifications-archive", relative);
  await fs.mkdir(path.dirname(canonical), { recursive: true });
  await fs.copyFile(path.join(runtimeRoot, "notifications", relative), canonical);
  await store.updateDeliveryStatus(key, { status: "delivered", outboxEventId: "outbox-duplicate" });

  assert.deepEqual((await store.archive({ ids: [notice.id] })).failed, []);
  const archived = await store.add({ title: "不应重建", body: "读取归档", data: { idempotencyKey: key } });
  assert.equal(archived.data.status, "delivered");
  assert.equal((await store.list({ includeSettled: true })).length, 0);
});

test("notification mutations serialize archive and delivery updates", async (t) => {
  const root = await fs.mkdtemp(path.join(process.cwd(), ".runtime", "notification-lock-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new NotificationStore({ runtimeRoot: path.join(root, "runtime"), clock: () => new Date("2026-08-07T08:00:00.000Z") });
  const key = "lock-race:2026-08-07";
  const notice = await store.add({ title: "并发", body: "归档与状态更新同时发生", data: { idempotencyKey: key } });

  const [archived, updated] = await Promise.all([
    store.archive({ ids: [notice.id] }),
    store.updateDeliveryStatus(key, { status: "delivered", outboxEventId: "outbox-lock" }),
  ]);
  assert.equal(archived.archived, 1);
  assert.equal(updated.id, notice.id);
  assert.deepEqual(await store.list({ includeSettled: true }), []);
  assert.equal((await fs.readdir(path.join(root, "runtime", "notifications-archive", "2026", "08"))).length, 1);
});

test("notification archive input rejects ambiguous and malformed requests", async (t) => {
  const root = await fs.mkdtemp(path.join(process.cwd(), ".runtime", "notification-input-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new NotificationStore({ runtimeRoot: path.join(root, "runtime") });

  await assert.rejects(store.archive(null), { code: "NOTIFICATION_ARCHIVE_INPUT_INVALID", statusCode: 400 });
  await assert.rejects(store.archive({ ids: [123] }), { code: "NOTIFICATION_ARCHIVE_IDS_INVALID", statusCode: 400 });
  await assert.rejects(store.archive({ ids: ["notice-x"], before: "2026-08-01T00:00:00.000Z" }), { code: "NOTIFICATION_ARCHIVE_SELECTOR_AMBIGUOUS", statusCode: 400 });
  await assert.rejects(store.archive({ ids: ["notice-x"], limit: "1" }), { code: "NOTIFICATION_ARCHIVE_LIMIT_INVALID", statusCode: 400 });
  assert.deepEqual(await store.archive({ ids: ["notice-x"] }), { archived: 0, ids: [], failed: [], missing: ["notice-x"] });
});
