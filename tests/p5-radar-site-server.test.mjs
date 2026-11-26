import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

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

test("radar authentication protects HTML and APIs without exposing credentials", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-site-auth-"));
  const authFile = path.join(root, "auth.json");
  await fs.writeFile(authFile, JSON.stringify({ password: "correct horse" }), { mode: 0o600 });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const { origin } = await runningServer(t, { authFile, allowInsecure: false });
  const anonymous = await fetch(`${origin}/api/items`, { redirect: "manual" });
  assert.equal(anonymous.status, 401);
  assert.equal((await fetch(`${origin}/api/growth?board=github`)).status, 401);
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
