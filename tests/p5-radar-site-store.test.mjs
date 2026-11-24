import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { freshDailyEntries } from "../experiments/superagent-p0/p5-radar/exposure.mjs";
import { buildDocumentAst } from "../experiments/superagent-p0/p5-radar/document-model.mjs";
import { createRadarSiteStore } from "../experiments/superagent-p0/p5-radar/site-store.mjs";

async function fixture(t) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "p5-site-store-"));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  return home;
}

function entry(itemId, title = `Article ${itemId}`) {
  return {
    item: { item_id: itemId, title, titleZh: title, url: `https://example.com/${itemId}`, source_name: "Example", kind: "article", published_at: "2026-11-24T00:00:00Z" },
    summary: { titleZh: `中文 ${itemId}`, summaryZh: "真实摘要", points: ["要点"], whyZh: "理由", sourceStatus: "article" },
    group: "preferred",
  };
}

test("cross-day exposure excludes previously shown items but same-day regeneration is stable", async (t) => {
  const home = await fixture(t);
  await fs.writeFile(path.join(home, "daily-doc-2026-11-23.json"), JSON.stringify({ date: "2026-11-23", items: [{ itemId: 1, index: 1 }] }));
  assert.deepEqual((await freshDailyEntries({ home, date: "2026-11-24", entries: [entry(1), entry(2)] })).map((value) => value.item.item_id), [2]);
  assert.deepEqual((await freshDailyEntries({ home, date: "2026-11-23", entries: [entry(1)] })).map((value) => value.item.item_id), [1]);
});

test("site snapshot preserves numbering and read state is persistent and reversible", async (t) => {
  const home = await fixture(t);
  let now = new Date("2026-11-24T02:00:00Z");
  const store = createRadarSiteStore({ home, now: () => now, publicOrigin: "https://radar.example.com" });
  const ast = buildDocumentAst({ date: "2026-11-24", entries: [entry(7), entry(8)] });
  await store.publish(ast);
  assert.equal(store.url(ast.date), "https://radar.example.com/?date=2026-11-24");
  assert.deepEqual((await store.items()).map((item) => [item.index, item.itemId, item.titleZh]), [[1, 7, "中文 7"], [2, 8, "中文 8"]]);
  await store.setRead([7], true);
  now = new Date("2026-11-24T02:01:00Z");
  await store.setRead([7], true);
  assert.equal((await store.items({ view: "read" }))[0].readAt, "2026-11-24T02:00:00.000Z");
  assert.equal((await store.items({ view: "unread" })).length, 1);
  await store.setRead([7, 8], true);
  assert.equal((await store.items({ view: "unread" })).length, 0);
  await store.setRead([7], false);
  assert.deepEqual((await store.items({ view: "unread" })).map((item) => item.itemId), [7]);
  assert.equal((await store.summary()).days[0].unreadCount, 1);
});

test("follow state serializes independent Host writers and preserves ignore feedback", async (t) => {
  const home = await fixture(t);
  const first = createRadarSiteStore({ home });
  const second = createRadarSiteStore({ home });
  await Promise.all([
    first.setFollow(1, { status: "pending", taskId: "task-1" }),
    second.setFollow(2, { status: "pending", taskId: "task-2" }),
  ]);
  assert.equal((await first.follow(1)).taskId, "task-1");
  assert.equal((await second.follow(2)).taskId, "task-2");
  await first.setFollow(1, { status: "running", ignoredAt: "2026-11-24T00:00:00Z" });
  await second.setFollow(1, { status: "captured", taskId: "task-1" });
  assert.equal((await first.follow(1)).status, "captured");
  assert.equal((await first.follow(1)).ignoredAt, "2026-11-24T00:00:00Z");
});

test("historical manifests remain searchable and filters never renumber a daily item", async (t) => {
  const home = await fixture(t);
  await fs.writeFile(path.join(home, "daily-doc-2026-11-22.json"), JSON.stringify({ date: "2026-11-22", items: [{ itemId: 3, index: 4, title: "Agent systems", titleZh: "智能体系统" }] }));
  await fs.writeFile(path.join(home, "daily-doc-2026-11-23.json"), JSON.stringify({ date: "2026-11-23", items: [{ itemId: 4, index: 1, title: "Other", titleZh: "其他" }] }));
  const store = createRadarSiteStore({ home });
  assert.equal((await store.items({ view: "unread" })).length, 0, "legacy backfill must not create unread debt");
  assert.equal((await store.summary()).days.reduce((sum, day) => sum + day.unreadCount, 0), 0);
  await store.setRead([3], false);
  assert.deepEqual((await store.items({ view: "unread" })).map((item) => item.itemId), [3], "explicit legacy unread remains supported");
  const found = await store.items({ view: "all", q: "智能体" });
  assert.equal(found.length, 1);
  assert.equal(found[0].index, 4);
  assert.equal(found[0].date, "2026-11-22");
  await assert.rejects(() => store.setRead([999], true), /不存在/u);
});
