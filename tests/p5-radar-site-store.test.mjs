import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

import { freshDailyEntries } from "../experiments/superagent-p0/p5-radar/exposure.mjs";
import { buildDocumentAst } from "../experiments/superagent-p0/p5-radar/document-model.mjs";
import { createRadarSiteStore } from "../experiments/superagent-p0/p5-radar/site-store.mjs";

const execFileAsync = promisify(execFile);

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
  assert.deepEqual((await store.items()).map((item) => item.itemId), [8, 7], "a fresh load stably places read items after unread items");
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

test("reactions are persistent, idempotent and imply read without creating follow state", async (t) => {
  const home = await fixture(t);
  let now = new Date("2026-11-25T02:00:00Z");
  const store = createRadarSiteStore({ home, now: () => now });
  await store.publish(buildDocumentAst({ date: "2026-11-25", entries: [entry(7), entry(8)] }));
  const liked = await store.setReaction(7, "like");
  assert.equal(liked.reaction, "like");
  assert.equal(liked.readAt, "2026-11-25T02:00:00.000Z");
  const firstRecord = JSON.parse(await fs.readFile(path.join(home, "radar-reactions.json"), "utf8")).items["7"];
  now = new Date("2026-11-25T02:01:00Z");
  await store.setReaction(7, "like");
  const duplicateRecord = JSON.parse(await fs.readFile(path.join(home, "radar-reactions.json"), "utf8")).items["7"];
  assert.equal(duplicateRecord.reactedAt, firstRecord.reactedAt);
  assert.equal(duplicateRecord.updatedAt, firstRecord.updatedAt);
  assert.deepEqual((await store.items()).map((item) => item.itemId), [8, 7]);
  await store.setReaction(7, "dislike");
  const disliked = (await store.items({ view: "read" }))[0];
  assert.equal(disliked.reaction, "dislike");
  assert.equal(disliked.readAt, liked.readAt);
  assert.equal(disliked.follow.status, "none");
  now = new Date("2026-11-25T02:02:00Z");
  const cancelled = await store.setReaction(7, null);
  assert.equal(cancelled.reaction, null);
  assert.equal(cancelled.readAt, liked.readAt, "cancelling a reaction never creates unread debt");
  assert.equal((await store.items({ view: "read" }))[0].reaction, null);
  const reactionsBeforeNeutralRead = await fs.readFile(path.join(home, "radar-reactions.json"), "utf8");
  await store.setRead([8], true);
  const neutral = (await store.items({ view: "all" })).find((item) => item.itemId === 8);
  assert.ok(neutral.readAt);
  assert.equal(neutral.reaction, null);
  assert.equal(await fs.readFile(path.join(home, "radar-reactions.json"), "utf8"), reactionsBeforeNeutralRead, "neutral read never writes reactions");
  await store.setRead([8], false);
  assert.equal((await store.items({ view: "unread" }))[0].reaction, null, "neutral unread also leaves reactions untouched");
  await assert.rejects(() => store.setReaction(7, "love"), /reaction 参数无效/u);
  await assert.rejects(() => store.setReaction(999, "like"), /不存在/u);
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

test("web marks use the shared stateHome and become executable only through an existing Task mapping", async (t) => {
  const home = await fixture(t);
  const stateHome = path.join(home, "site-state");
  const store = createRadarSiteStore({ home, stateHome });
  const ast = buildDocumentAst({ date: "2026-11-24", entries: [entry(7), entry(8)] });
  await store.publish(ast);
  await store.setFollow(7, { status: "captured", taskId: "task-old", itemId: 7, date: "2026-11-24", index: 1 });
  const marked = await store.markFollow(8, true);
  assert.equal(marked.status, "marked");
  assert.equal(marked.date, "2026-11-24");
  assert.equal(marked.index, 2);
  assert.deepEqual((await store.markedFollows()).map((item) => item.itemId), [8]);
  assert.equal((await store.follow(7)).taskId, "task-old");
  assert.deepEqual(await store.markFollow(7, false), await store.follow(7));
  await store.setFollow(8, { ...marked, status: "pending", taskId: "task-new" });
  assert.equal((await store.follow(8)).markedAt, marked.markedAt);
  assert.deepEqual(await store.markedFollows(), []);
  assert.equal((await store.markFollow(8, false)).taskId, "task-new");
  const persisted = JSON.parse(await fs.readFile(path.join(stateHome, "radar-follow-state.json"), "utf8"));
  assert.equal(persisted.items["7"].taskId, "task-old");
  assert.equal(persisted.items["8"].taskId, "task-new");
});

test("separate Host and website processes serialize writes without losing existing Tasks", async (t) => {
  const home = await fixture(t);
  const stateHome = path.join(home, "shared-state");
  await fs.mkdir(stateHome);
  await fs.writeFile(path.join(home, "radar-day-2026-11-24.json"), JSON.stringify({
    schema: 1, date: "2026-11-24", items: [1, 2, 3, 4].map((itemId) => ({ itemId, index: itemId, title: `Item ${itemId}` })),
  }));
  await fs.writeFile(path.join(stateHome, "radar-follow-state.json"), JSON.stringify({ schema: 1, items: { 99: { itemId: 99, status: "captured", taskId: "task-preserved" } } }));
  const moduleUrl = pathToFileURL(path.resolve("experiments/superagent-p0/p5-radar/site-store.mjs")).href;
  const script = `import { createRadarSiteStore } from ${JSON.stringify(moduleUrl)}; await createRadarSiteStore({ home: ${JSON.stringify(home)}, stateHome: ${JSON.stringify(stateHome)} }).markFollow(Number(process.argv[1]), true);`;
  await Promise.all([1, 2, 3, 4].map((itemId) => execFileAsync(process.execPath, ["--input-type=module", "--eval", script, String(itemId)], { timeout: 15_000 })));
  const state = JSON.parse(await fs.readFile(path.join(stateHome, "radar-follow-state.json"), "utf8"));
  assert.deepEqual(Object.keys(state.items).sort(), ["1", "2", "3", "4", "99"]);
  assert.equal(state.items["99"].taskId, "task-preserved");
  for (const itemId of [1, 2, 3, 4]) assert.equal(state.items[String(itemId)].status, "marked");
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
