import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { ReportService } from "../apps/syno/syno/reports.mjs";

test("reports expose exact changed paths and defer commits inside an approved job", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-reports-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const commits = [];
  const service = new ReportService({
    opsRoot: root,
    pathResolver: (file) => path.relative(root, file).replace(/\\/g, "/"),
    clock: () => new Date("2026-07-17T08:30:00.000Z"),
    host: { async list() { return []; } },
    knowledge: { async rebuild() { return { notes: 12 }; } },
    notifications: {},
    channels: { async send() { return { web: { recordPath: "notifications/notice.md" } }; } },
    gitGuard: { async commitPaths(paths, message) { commits.push({ paths, message }); return { committed: true }; } },
  });
  const deferred = await service.create("morning", { commit: false });
  assert.deepEqual(deferred.changedPaths, ["reviews/2026/07/report-morning-2026-07-17.md", "notifications/notice.md"]);
  assert.equal(commits.length, 0);
  await service.create("weekly");
  assert.equal(commits.length, 1);
  assert.deepEqual(commits[0].paths, ["reviews/2026/07/report-weekly-2026-07-17.md", "notifications/notice.md"]);
});
