import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildDocumentAst } from "../experiments/superagent-p0/p5-radar/document-model.mjs";
import { createRadarSiteServer } from "../experiments/superagent-p0/p5-radar/site-server.mjs";
import { createRadarSiteStore } from "../experiments/superagent-p0/p5-radar/site-store.mjs";
import { openStore } from "../experiments/superagent-p0/p5-radar/store.mjs";

async function runningServer(t, options = {}) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "p5-site-server-"));
  await fs.writeFile(path.join(home, "radar-day-2026-11-24.json"), JSON.stringify({
    schema: 1, date: "2026-11-24", items: [{ itemId: 1, index: 1, title: "Real title", titleZh: "真实标题", source: "Real source", url: "https://example.com", summary: "真实摘要" }],
  }));
  const server = await createRadarSiteServer({ home, allowInsecure: true, ...options });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(home, { recursive: true, force: true });
  });
  return { home, origin: `http://127.0.0.1:${server.address().port}` };
}

test("radar HTTP serves real data, static assets and persistent read mutations", async (t) => {
  const { origin } = await runningServer(t);
  const page = await fetch(`${origin}/`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-security-policy"), /frame-ancestors 'none'/u);
  const html = await page.text();
  assert.match(html, /P5 信息雷达/u);
  assert.match(html, /data-view="polymarket"/u);
  assert.match(html, /id="detail-evidence"/u);
  assert.match(html, /id="detail-evidence-links"/u);
  assert.match(html, /id="alerts"[\s\S]*id="alerts-list"/u);
  assert.match(html, /id="read-toggle"[\s\S]*id="like-toggle"[\s\S]*id="dislike-toggle"[\s\S]*id="favorite-toggle"/u);
  const initial = await (await fetch(`${origin}/api/items?view=today`)).json();
  assert.equal(initial.items[0].titleZh, "真实标题");
  const read = await fetch(`${origin}/api/read`, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ itemIds: [1], read: true }),
  });
  assert.equal(read.status, 200);
  assert.equal((await (await fetch(`${origin}/api/items?view=read`)).json()).items.length, 1);
  const csrf = await fetch(`${origin}/api/read`, {
    method: "POST", headers: { Origin: "https://attacker.example", "Content-Type": "application/json" }, body: JSON.stringify({ itemIds: [1], read: false }),
  });
  assert.equal(csrf.status, 403);
  assert.equal((await (await fetch(`${origin}/api/items?view=read`)).json()).items.length, 1);
});

test("reaction API validates input, marks read and never creates a follow Task", async (t) => {
  const { origin } = await runningServer(t);
  const write = (body, requestOrigin = origin) => fetch(`${origin}/api/reaction`, {
    method: "POST", headers: { Origin: requestOrigin, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  assert.equal((await write({ itemId: 1, reaction: "like" }, "https://attacker.example")).status, 403);
  assert.equal((await write({ itemId: 1, reaction: "love" })).status, 400);
  assert.equal((await write({ itemId: true, reaction: "like" })).status, 400);
  assert.equal((await write({ itemId: 999, reaction: "like" })).status, 404);
  const liked = await (await write({ itemId: 1, reaction: "like" })).json();
  assert.equal(liked.reaction, "like");
  assert.ok(liked.readAt);
  const duplicate = await (await write({ itemId: 1, reaction: "like" })).json();
  assert.equal(duplicate.readAt, liked.readAt);
  const listed = await (await fetch(`${origin}/api/items?view=read`)).json();
  assert.equal(listed.items[0].reaction, "like");
  assert.equal(listed.items[0].follow.status, "none");
  const disliked = await (await write({ itemId: 1, reaction: "dislike" })).json();
  assert.equal(disliked.reaction, "dislike");
  assert.equal(disliked.readAt, liked.readAt);
  const cancelled = await (await write({ itemId: 1, reaction: null })).json();
  assert.equal(cancelled.reaction, null);
  assert.equal(cancelled.readAt, liked.readAt);
});

test("follow API marks intents immediately, reverses only marks and never overwrites a Task", async (t) => {
  const { home, origin } = await runningServer(t);
  const write = (body, requestOrigin = origin) => fetch(`${origin}/api/follow`, {
    method: "POST", headers: { Origin: requestOrigin, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  assert.equal((await write({ itemId: 1, marked: true }, "https://attacker.example")).status, 403);
  assert.equal((await write({ itemId: 1, marked: "yes" })).status, 400);
  assert.equal((await write({ itemId: true, marked: true })).status, 400);
  assert.equal((await write({ itemId: 999, marked: true })).status, 404);
  const first = await (await write({ itemId: 1, marked: true })).json();
  assert.equal(first.follow.status, "marked");
  assert.equal(first.follow.source, "web");
  assert.equal(first.follow.taskId, undefined);
  const duplicate = await (await write({ itemId: 1, marked: true })).json();
  assert.equal(duplicate.follow.markedAt, first.follow.markedAt);
  const listed = await (await fetch(`${origin}/api/items?view=followed`)).json();
  assert.equal(listed.items[0].follow.status, "marked");
  const cancelled = await (await write({ itemId: 1, marked: false })).json();
  assert.equal(cancelled.follow, null);
  assert.equal((await (await fetch(`${origin}/api/items?view=followed`)).json()).items.length, 0);
  await write({ itemId: 1, marked: true });
  const store = createRadarSiteStore({ home });
  const marked = await store.follow(1);
  await store.setFollow(1, { ...marked, status: "pending", taskId: "task-existing" });
  const protectedTask = await (await write({ itemId: 1, marked: false })).json();
  assert.equal(protectedTask.follow.status, "pending");
  assert.equal(protectedTask.follow.taskId, "task-existing");
  assert.equal(protectedTask.follow.markedAt, marked.markedAt);
});

test("legacy manifest filtering happens after read-only source and feedback hydration", async (t) => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "p5-site-legacy-"));
  const databasePath = path.join(home, "p5-radar.db");
  const store = openStore({ file: databasePath });
  store.seedSources([{ id: "source", name: "Unique Source", kind: "rss" }]);
  const inserted = store.insertItem({ sourceId: "source", externalId: "1", title: "Legacy", url: "https://example.com/legacy" });
  store.saveArticleSummary(inserted.id, { model: "test", titleZh: "旧日报", summaryZh: "真实旧摘要", points: [], whyZh: "", sourceStatus: "article" });
  store.markCandidate(inserted.id, "ignored");
  store.close();
  await fs.writeFile(path.join(home, "daily-doc-2026-11-20.json"), JSON.stringify({ date: "2026-11-20", items: [{ itemId: inserted.id, index: 3, title: "Legacy" }] }));
  const server = await createRadarSiteServer({ home, databasePath, allowInsecure: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await fs.rm(home, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const ignored = await (await fetch(`${origin}/api/items?view=ignored`)).json();
  assert.equal(ignored.items.length, 1);
  assert.equal(ignored.items[0].titleZh, "旧日报");
  const searched = await (await fetch(`${origin}/api/items?view=all&q=Unique%20Source`)).json();
  assert.equal(searched.items.length, 1);
  assert.equal(searched.items[0].index, 3);
});

test("日报只读 API 呈现 HN 热度与 AI News Radar 多源核实证据", async (t) => {
  const { home, origin } = await runningServer(t);
  const databasePath = path.join(home, "fusion-evidence.db");
  const store = openStore({ file: databasePath });
  store.seedSources([
    { id: "hackernews-top", name: "Hacker News Top 30", kind: "hackernews" },
    { id: "ai-news-radar", name: "AI News Radar", kind: "ai-news-radar" },
  ]);
  const hnId = store.insertItem({
    sourceId: "hackernews-top", externalId: "101", title: "Agent harness release",
    url: "https://example.com/hn-agent", summary: "HN summary",
    raw: { hnRank: 1, hnScore: 321, hnComments: 45, hnUrl: "https://news.ycombinator.com/item?id=101" },
  }).id;
  const radarId = store.insertItem({
    sourceId: "ai-news-radar", externalId: "story-1", title: "Runtime ships trace viewer",
    url: "https://example.com/radar-agent", summary: "Radar summary",
    raw: {
      aiNewsRadarGeneratedAt: "2026-11-26T01:30:00Z", sourceCount: 2,
      sourceTierRank: 0, sourceTierLabel: "官方一手源", personaReview: "不得展示的主观评论",
      relatedSources: [
        { title: "Official release", url: "https://example.com/radar-agent", sourceName: "Example Engineering" },
        { title: "Independent report", url: "https://news.example.org/agent", sourceName: "Example News" },
      ],
    },
  }).id;
  for (const id of [hnId, radarId]) {
    store.saveArticleSummary(id, { model: "fixture", titleZh: `中文 ${id}`, summaryZh: "摘要", sourceStatus: "feed-summary" });
  }
  const summaries = new Map([hnId, radarId].map((id) => [id, store.getArticleSummary(id)]));
  const items = store.listItemsForDoc({ limit: 10 });
  store.close();
  const ast = buildDocumentAst({
    date: "2026-11-26",
    entries: items.map((item) => ({ item, summary: summaries.get(item.item_id) })),
  });
  await createRadarSiteStore({ home }).publish(ast);

  const response = await fetch(`${origin}/api/items?view=all&date=2026-11-26`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  const hn = payload.items.find((item) => item.itemId === hnId);
  const radar = payload.items.find((item) => item.itemId === radarId);
  assert.equal(hn.sourceEvidence.kind, "hackernews");
  assert.equal(hn.sourceEvidence.rank, 1);
  assert.equal(hn.sourceEvidence.score, 321);
  assert.equal(hn.sourceEvidence.comments, 45);
  assert.match(hn.sourceEvidence.text, /站内热度/u);
  assert.match(hn.sourceEvidence.text, /不代表事实真实性/u);
  assert.equal(hn.sourceEvidence.links[0].url, "https://news.ycombinator.com/item?id=101");
  assert.equal(radar.sourceEvidence.kind, "ai-news-radar");
  assert.equal(radar.sourceEvidence.official, true);
  assert.equal(radar.sourceEvidence.verification, "multi-source");
  assert.equal(radar.sourceEvidence.sourceCount, 2);
  assert.equal(radar.sourceEvidence.links.length, 2);
  assert.equal(radar.sourceEvidence.links[1].url, "https://news.example.org/agent");
  assert.doesNotMatch(JSON.stringify(radar.sourceEvidence), /主观评论/u);
});

test("summary 汇总信源、增长榜、Polymarket 与调度异常，不触发重试", async (t) => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "p5-site-alerts-"));
  const databasePath = path.join(home, "p5-radar.db");
  const schedulerStateFile = path.join(home, "p5-scheduler.json");
  const store = openStore({ file: databasePath });
  store.seedSources([{ id: "hackernews-top", name: "Hacker News Top 30", kind: "hackernews" }]);
  store.setSourceState("hackernews-top", { at: "2026-11-26T01:40:00Z", error: "fixture upstream unavailable" });
  store.close();
  await fs.writeFile(path.join(home, "radar-day-2026-11-26.json"), JSON.stringify({
    schema: 1, date: "2026-11-26", items: [{ itemId: 1, index: 1, title: "Fixture", url: "https://example.com" }],
  }));
  await fs.writeFile(path.join(home, "radar-growth-github-2026-11-26.json"), JSON.stringify({
    schema: 1, board: "github", date: "2026-11-26", generatedAt: "2026-11-26T01:00:00Z", items: [],
  }));
  await fs.writeFile(path.join(home, "radar-growth-status.json"), JSON.stringify({ boards: { github: {
    status: "error", date: "2026-11-26", updatedAt: "2026-11-26T01:45:00Z", error: "GitHub fixture failed",
  } } }));
  await fs.writeFile(path.join(home, "radar-polymarket-2026-11-26.json"), JSON.stringify({
    schema: 1, board: "polymarket", date: "2026-11-26", generatedAt: "2026-11-26T01:00:00Z", items: [],
  }));
  await fs.writeFile(path.join(home, "radar-polymarket-status.json"), JSON.stringify({
    status: "error", updatedAt: "2026-11-26T01:46:00Z", error: "Gamma fixture failed",
  }));
  await fs.writeFile(schedulerStateFile, JSON.stringify({
    lastCollectError: "collect fixture failed", lastCollectAt: "2026-11-26T01:30:00Z",
    lastDigestDelivery: "unknown", lastDigestError: "delivery fixture unknown", lastDigestAt: "2026-11-26T02:00:00Z",
  }));
  const server = await createRadarSiteServer({ home, databasePath, schedulerStateFile, allowInsecure: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await fs.rm(home, { recursive: true, force: true }); });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/summary`);
  assert.equal(response.status, 200);
  const { alerts } = await response.json();
  assert.deepEqual(alerts.map((alert) => alert.kind).sort(), ["growth", "polymarket", "scheduler-collect", "scheduler-digest", "source"]);
  assert.match(alerts.find((alert) => alert.kind === "source").message, /fixture upstream unavailable/u);
  assert.match(alerts.find((alert) => alert.kind === "scheduler-digest").message, /结果未知，先对账/u);
});

test("Polymarket 首次失败且没有好快照时仍显示调度告警", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-site-polymarket-first-error-"));
  const schedulerStateFile = path.join(root, "p5-scheduler.json");
  await fs.writeFile(schedulerStateFile, JSON.stringify({
    lastPolymarketStatus: "failed", lastPolymarketError: "fetch failed", lastPolymarketAt: "2026-11-26T12:09:42Z",
  }));
  const { origin } = await runningServer(t, { schedulerStateFile });
  const { alerts } = await (await fetch(`${origin}/api/summary`)).json();
  const alert = alerts.find((candidate) => candidate.kind === "scheduler-polymarket");
  assert.equal(alert.label, "Polymarket 采集失败");
  assert.match(alert.message, /fetch failed/u);
});

test("growth API serves validated snapshots without read or follow semantics", async (t) => {
  const { home, origin } = await runningServer(t);
  await fs.writeFile(path.join(home, "radar-growth-github-2026-11-25.json"), JSON.stringify({
    schema: 1, board: "github", date: "2026-11-25", generatedAt: "2026-11-25T02:00:00Z", window: "7d",
    coverage: "AI 候选池", attribution: { label: "GitHub Risers", license: "MIT" },
    items: [{ repo: "owner/project", index: 1, gained: 120, stars: 900, analysis: { status: "metadata" } }],
  }));
  const response = await fetch(`${origin}/api/growth?board=github`);
  assert.equal(response.status, 200);
  const value = await response.json();
  assert.equal(value.growth.items[0].repo, "owner/project");
  assert.equal(value.growth.stale, false);
  assert.equal((await (await fetch(`${origin}/api/growth?board=github&date=2026-11-24`)).json()).growth, null);
  for (const query of ["board=other", "board=../secret", "board=github&date=2026-1-1", "board=github&date=2026-02-30"]) {
    assert.equal((await fetch(`${origin}/api/growth?${query}`)).status, 400, query);
  }
});

test("Polymarket API 只读返回快照，校验日期且不暴露文章操作", async (t) => {
  const { home, origin } = await runningServer(t);
  await fs.writeFile(path.join(home, "radar-polymarket-2026-11-26.json"), JSON.stringify({
    schema: 1, board: "polymarket", date: "2026-11-26", generatedAt: "2026-11-26T02:00:00Z",
    coverage: "价格不是事实概率", attribution: { label: "Polymarket Gamma API" },
    items: [{ id: "12", index: 1, question: "Will it happen?", yesPrice: 0.42, volume24hr: 1200, oneDayPriceChange: 0.03, url: "https://polymarket.com/event/test" }],
  }));
  const response = await fetch(`${origin}/api/polymarket`);
  assert.equal(response.status, 200);
  const value = await response.json();
  assert.equal(value.polymarket.items[0].yesPrice, 0.42);
  assert.equal(value.polymarket.stale, false);
  assert.equal((await (await fetch(`${origin}/api/polymarket?date=2026-11-25`)).json()).polymarket, null);
  assert.equal((await fetch(`${origin}/api/polymarket?date=2026-02-30`)).status, 400);
});

test("radar authentication protects HTML and APIs without exposing credentials", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-site-auth-"));
  const authFile = path.join(root, "auth.json");
  await fs.writeFile(authFile, JSON.stringify({ password: "correct horse" }), { mode: 0o600 });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const { origin } = await runningServer(t, { authFile, allowInsecure: false });
  const anonymous = await fetch(`${origin}/api/items`, { redirect: "manual" });
  assert.equal(anonymous.status, 401);
  assert.equal((await fetch(`${origin}/api/growth?board=github`)).status, 401);
  assert.equal((await fetch(`${origin}/api/polymarket`)).status, 401);
  assert.equal((await fetch(`${origin}/api/follow`, { method: "POST", headers: { Origin: origin }, body: JSON.stringify({ itemId: 1, marked: true }) })).status, 401);
  assert.equal((await fetch(`${origin}/api/reaction`, { method: "POST", headers: { Origin: origin }, body: JSON.stringify({ itemId: 1, reaction: "like" }) })).status, 401);
  assert.equal((await fetch(`${origin}/styles.css`)).status, 200, "login stylesheet must be public");
  const denied = await fetch(`${origin}/login`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" }, body: "password=wrong", redirect: "manual" });
  assert.equal(denied.status, 403);
  const opaqueCrossSite = await fetch(`${origin}/login`, {
    method: "POST",
    headers: { Origin: "null", "Sec-Fetch-Site": "cross-site", "Sec-Fetch-Mode": "navigate", "Sec-Fetch-Dest": "document", "Content-Type": "application/x-www-form-urlencoded" },
    body: "password=correct+horse",
    redirect: "manual",
  });
  assert.equal(opaqueCrossSite.status, 403);
  const opaqueLogin = await fetch(`${origin}/login`, {
    method: "POST",
    headers: { Origin: "null", "Sec-Fetch-Site": "same-origin", "Sec-Fetch-Mode": "navigate", "Sec-Fetch-Dest": "document", "Content-Type": "application/x-www-form-urlencoded" },
    body: "password=correct+horse",
    redirect: "manual",
  });
  assert.equal(opaqueLogin.status, 303);
  const login = await fetch(`${origin}/login`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" }, body: "password=correct+horse", redirect: "manual" });
  assert.equal(login.status, 303);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  assert.match(login.headers.get("set-cookie"), /HttpOnly; SameSite=Lax/u);
  const authorized = await fetch(`${origin}/api/items`, { headers: { Cookie: cookie } });
  assert.equal(authorized.status, 200);
  const opaqueMutation = await fetch(`${origin}/api/read`, {
    method: "POST",
    headers: { Cookie: cookie, Origin: "null", "Sec-Fetch-Site": "same-origin", "Sec-Fetch-Mode": "navigate", "Sec-Fetch-Dest": "document", "Content-Type": "application/json" },
    body: JSON.stringify({ itemIds: [1], read: true }),
  });
  assert.equal(opaqueMutation.status, 403);
  const opaqueFollow = await fetch(`${origin}/api/follow`, {
    method: "POST",
    headers: { Cookie: cookie, Origin: "null", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: 1, marked: true }),
  });
  assert.equal(opaqueFollow.status, 403);
  const opaqueReaction = await fetch(`${origin}/api/reaction`, {
    method: "POST",
    headers: { Cookie: cookie, Origin: "null", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: 1, reaction: "like" }),
  });
  assert.equal(opaqueReaction.status, 403);
});
