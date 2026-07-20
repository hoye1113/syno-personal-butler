import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

import { NotificationStore } from "../apps/syno/syno/notification-store.mjs";

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
