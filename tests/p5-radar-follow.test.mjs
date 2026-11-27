import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { openNativeButlerRuntime } from "../experiments/superagent-p0/native-butler-runtime.mjs";
import { parseRadarCommand } from "../experiments/superagent-p0/p5-radar/command.mjs";
import { prepareRadarCaptureSource, recoverableRadarFollows, resolveRadarCandidates, resolveRadarMarkedFollows } from "../experiments/superagent-p0/p5-radar/follow.mjs";
import { createRadarSiteStore } from "../experiments/superagent-p0/p5-radar/site-store.mjs";
import { openStore } from "../experiments/superagent-p0/p5-radar/store.mjs";
import { publishRadarSiteDigest } from "../experiments/superagent-p0/p5-radar/site-digest.mjs";
import { buildDocumentAst } from "../experiments/superagent-p0/p5-radar/document-model.mjs";

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-follow-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

const sha256 = (text) => createHash("sha256").update(text).digest("hex");

test("dated radar commands resolve only that date and never fall back to latest numbering", async (t) => {
  const home = await fixture(t);
  assert.deepEqual(parseRadarCommand("跟进 2026-11-22 4"), { action: "follow", date: "2026-11-22", numbers: ["4"] });
  await fs.writeFile(path.join(home, "digest-2026-11-22.json"), JSON.stringify({ date: "2026-11-22", items: [{ itemId: 42, index: 4 }] }));
  await fs.writeFile(path.join(home, "digest-2026-11-24.json"), JSON.stringify({ date: "2026-11-24", items: [{ itemId: 99, index: 4 }] }));
  assert.equal((await resolveRadarCandidates({ home, date: "2026-11-22", numbers: ["4"] }))[0].itemId, 42);
  await assert.rejects(() => resolveRadarCandidates({ home, date: "2026-11-21", numbers: ["4"] }), /找不到 2026-11-21/u);
});

test("marked website intents select existing dated follow commands without creating Tasks while choosing", async (t) => {
  const home = await fixture(t);
  const stateHome = path.join(home, "site-state");
  const items = [{ itemId: 42, index: 4, title: "First" }, { itemId: 43, index: 5, title: "Second" }];
  await fs.writeFile(path.join(home, "radar-day-2026-11-24.json"), JSON.stringify({ schema: 1, date: "2026-11-24", items }));
  await fs.writeFile(path.join(home, "digest-2026-11-24.json"), JSON.stringify({ date: "2026-11-24", items }));
  const site = createRadarSiteStore({ home, stateHome });
  await site.markFollow(42, true);
  await site.markFollow(43, true);
  assert.deepEqual(parseRadarCommand("处理我在网站上标记的跟进"), { action: "followMarked", all: false, numbers: [] });
  assert.deepEqual(parseRadarCommand("处理网站跟进 全部"), { action: "followMarked", all: true, numbers: [] });
  const waiting = await resolveRadarMarkedFollows({ home, stateHome });
  assert.equal(waiting.marked.length, 2);
  assert.deepEqual(waiting.selected, [], "multiple marks must wait for an explicit choice");
  const chosen = await resolveRadarMarkedFollows({ home, stateHome, numbers: ["2"] });
  assert.equal(chosen.selected[0].itemId, 43);
  const candidates = await resolveRadarCandidates({ home, date: chosen.selected[0].date, numbers: [String(chosen.selected[0].index)] });
  assert.equal(candidates[0].itemId, 43);
  assert.equal((await site.follow(43)).taskId, undefined);
  assert.equal((await resolveRadarMarkedFollows({ home, stateHome, all: true })).selected.length, 2);
  await assert.rejects(() => resolveRadarMarkedFollows({ home, stateHome, numbers: ["1", "2"] }), /每次选择一条/u);
  await site.markFollow(42, false);
  const single = await resolveRadarMarkedFollows({ home, stateHome });
  assert.equal(single.selected[0].itemId, 43);
  await site.setFollow(43, { ...single.selected[0], status: "pending", taskId: "task-43", sourcePath: "/fixture/source.md" });
  assert.deepEqual(await site.markedFollows(), []);
  const recovery = recoverableRadarFollows({ items: { marked: { status: "marked", itemId: 99 }, task: await site.follow(43) } });
  assert.deepEqual(recovery.map((item) => item.taskId), ["task-43"], "pure marks are never executed as crash recovery");
});

test("radar capture source freezes real stored content and is reused without refetch", async (t) => {
  const home = await fixture(t);
  const store = openStore({ file: path.join(home, "p5-radar.db") });
  store.seedSources([{ id: "test", name: "Test", kind: "rss" }]);
  const inserted = store.insertItem({ sourceId: "test", externalId: "one", title: "Real", url: "https://example.com/real", content: "真实正文 ".repeat(110) });
  store.close();
  let fetches = 0;
  const first = await prepareRadarCaptureSource({ home, itemId: inserted.id, fetchArticle: async () => { fetches += 1; throw new Error("must not fetch"); } });
  const second = await prepareRadarCaptureSource({ home, itemId: inserted.id, fetchArticle: async () => { fetches += 1; } });
  assert.equal(first.sourceUrl, "https://example.com/real");
  assert.equal(second.sourcePath, first.sourcePath);
  assert.equal(fetches, 0);
  assert.match(await fs.readFile(first.sourcePath, "utf8"), /真实正文/u);
});

test("dynamic radar source uses the native Task and Result Lane with item idempotency", async (t) => {
  const root = await fixture(t);
  const defaultSource = path.join(root, "default.md");
  const radarSource = path.join(root, "radar.md");
  await fs.writeFile(defaultSource, "default source");
  await fs.writeFile(radarSource, "radar public source ".repeat(30));
  const butler = openNativeButlerRuntime({
    databasePath: path.join(root, "facts.db"), vaultRoot: path.join(root, "vault"),
    sourcePath: defaultSource, sourceUrl: "https://example.com/default",
    indexFile: path.join(root, "index.json"), resultRoot: path.join(root, "results"),
  });
  t.after(() => butler.close());
  const capture = butler.captureSource({ sourcePath: radarSource, sourceUrl: "https://example.com/radar", sourceMaterial: "verified-public-radar-snapshot" });
  const message = { appId: "cli_test", messageId: "radar7", chatId: "chat", ownerId: "owner", worker: "OpenCode" };
  const execution = capture.begin(message);
  const source = await fs.readFile(radarSource, "utf8");
  await fs.writeFile(execution.artifactPath, `---\nsource_url: "https://example.com/radar"\nsource_content_sha256: ${sha256(source)}\nworker: OpenCode\nmodel: opencode-go/deepseek-v4.1-flash\n---\n${source}`);
  const trace = capture.complete(execution);
  assert.equal(trace.taskState, "completed");
  assert.equal(trace.nativeRunState, "done");
  assert.ok(trace.fileVersion);
  const duplicate = capture.begin(message);
  assert.equal(duplicate.taskId, execution.taskId);
  assert.equal(duplicate.attemptId, execution.attemptId);
});

test("site digest publishes snapshot and numbering before returning a sendable link", async (t) => {
  const home = await fixture(t);
  const ast = buildDocumentAst({ date: "2026-11-24", entries: [{
    item: { item_id: 7, title: "Real", url: "https://example.com/7", source_name: "Source", kind: "article" },
    summary: { titleZh: "真实", summaryZh: "摘要", points: [], whyZh: "" },
  }] });
  const result = await publishRadarSiteDigest({ home, publicOrigin: "https://radar.example.com", ast });
  assert.match(result.message, /新增 1 条/u);
  assert.match(result.message, /https:\/\/radar\.example\.com\/\?date=2026-11-24/u);
  const manifest = JSON.parse(await fs.readFile(path.join(home, "daily-doc-2026-11-24.json"), "utf8"));
  const snapshot = JSON.parse(await fs.readFile(path.join(home, "radar-day-2026-11-24.json"), "utf8"));
  assert.equal(manifest.items[0].itemId, 7);
  assert.equal(snapshot.items[0].itemId, 7);
  assert.equal(snapshot.items[0].index, manifest.items[0].index);
});

test("site digest derives follow numbering from details when redundant items are stale", async (t) => {
  const home = await fixture(t);
  const ast = buildDocumentAst({ date: "2026-11-24", entries: [{
    item: { item_id: 7, title: "Real", url: "https://example.com/7", source_name: "Source", kind: "article" },
    summary: { titleZh: "真实", summaryZh: "摘要", points: [], whyZh: "" },
  }] });
  ast.items = [{ itemId: 999, index: 99 }];
  const result = await publishRadarSiteDigest({ home, publicOrigin: "https://radar.example.com", ast });
  assert.equal(result.manifest.items[0].itemId, 7);
  assert.equal(result.manifest.items[0].index, 1);
  const snapshot = JSON.parse(await fs.readFile(path.join(home, "radar-day-2026-11-24.json"), "utf8"));
  assert.equal(snapshot.items[0].itemId, result.manifest.items[0].itemId);
  assert.equal(snapshot.items[0].index, result.manifest.items[0].index);
});

test("site digest rejects nonsequential detail numbering before writing a snapshot", async (t) => {
  const home = await fixture(t);
  const ast = buildDocumentAst({ date: "2026-11-24", entries: [] });
  ast.details = [{ itemId: 1, index: 2 }];
  await assert.rejects(() => publishRadarSiteDigest({ home, publicOrigin: "https://radar.example.com", ast }), /拒绝发布/u);
  await assert.rejects(() => fs.access(path.join(home, "radar-day-2026-11-24.json")));
});
