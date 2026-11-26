import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseCandidateNumbers, parseRadarCommand } from "../experiments/superagent-p0/p5-radar/command.mjs";
import { createP5HostRunner, createP5Scheduler } from "../experiments/superagent-p0/p5-radar/host.mjs";
import { parseArticleJson, summarizeVideoDoc } from "../experiments/superagent-p0/p5-radar/article.mjs";
import { renderDailyDocBlocks } from "../experiments/superagent-p0/p5-radar/feishu-doc.mjs";
import { routeRoot } from "../experiments/superagent-p0/root-router.mjs";

test("P5 radar commands route digest, status and numbered follow/ignore", () => {
  assert.deepEqual(parseRadarCommand("雷达"), { action: "digest" });
  assert.deepEqual(parseRadarCommand("雷达日报"), { action: "digest" });
  assert.deepEqual(parseRadarCommand("信息雷达状态"), { action: "status" });
  assert.deepEqual(parseRadarCommand("雷达帮助"), { action: "help" });
  assert.deepEqual(parseRadarCommand("跟进 1、4"), { action: "follow", numbers: ["1", "4"] });
  assert.deepEqual(parseRadarCommand("忽略第8条, 9"), { action: "ignore", numbers: ["8", "9"] });
  assert.deepEqual(parseRadarCommand("雷达跟进 2"), { action: "follow", numbers: ["2"] });
  assert.deepEqual(parseRadarCommand("雷达设置 50"), { action: "setLimit", maxItems: 50 });
  assert.deepEqual(parseRadarCommand("偏好：更关注 sandbox 和 agent 工程"), { action: "preference", text: "更关注 sandbox 和 agent 工程" });
  assert.deepEqual(parseRadarCommand("兴趣: 多看 coding"), { action: "preference", text: "多看 coding" });
  assert.equal(parseRadarCommand("跟进项目 A"), null);
  assert.equal(parseRadarCommand("普通聊天"), null);
  assert.deepEqual(parseRadarCommand("以后多关注 Agent 和 MCP"), {
    action: "preference", text: "以后多关注 Agent 和 MCP",
  });
  assert.deepEqual(parseRadarCommand("我想更关注 context engineering"), {
    action: "preference", text: "我想更关注 context engineering",
  });
  assert.deepEqual(parseRadarCommand("别给我推模型新闻了"), {
    action: "preference", text: "别给我推模型新闻了",
  });
  assert.deepEqual(routeRoot({ text: "以后多关注 Agent 和 MCP" }), {
    status: "routed", domain: "radar", action: "preference", text: "以后多关注 Agent 和 MCP",
  });
  assert.equal(parseRadarCommand("我想看项目 A"), null);
  assert.equal(parseRadarCommand("新建项目：多关注 Agent"), null);
  assert.equal(parseRadarCommand("继续想法：别给我推模型"), null);
  assert.deepEqual(parseCandidateNumbers("第 1 条、#2，3"), ["1", "2", "3"]);
  assert.deepEqual(routeRoot({ text: "跟进 1、4" }), {
    status: "routed", domain: "radar", action: "follow", numbers: ["1", "4"],
  });
});

test("article parser accepts fenced JSON and preserves Chinese fields", () => {
  const parsed = parseArticleJson('```json\n{"title_zh":"中文标题","summary_zh":"中文结论","key_points":["要点一","要点二"],"why_zh":"相关"}\n```');
  assert.deepEqual(parsed, {
    titleZh: "中文标题",
    summaryZh: "中文结论",
    points: ["要点一", "要点二"],
    whyZh: "相关",
  });
  assert.equal(parseArticleJson("not json"), null);
});

test("video document summary keeps real timestamp citations", async () => {
  let promptSeen = "";
  const client = {
    async generate({ prompt }) {
      promptSeen = prompt;
      return {
        text: JSON.stringify({
          title_zh: "视频中文标题",
          summary_zh: "视频结论",
          key_points: ["[00:12] 关键观点"],
          why_zh: "与 Agent 工程相关",
        }),
      };
    },
  };
  const transcript = `[00:12] ${"Agent harness and context engineering. ".repeat(12)}`;
  const result = await summarizeVideoDoc({
    item: { title: "Talk", url: "https://www.youtube.com/watch?v=x", source_name: "Latent Space", published_at: "2026-11-21" },
    transcript,
    client,
  });
  assert.equal(result.sourceStatus, "transcript-timed");
  assert.equal(result.titleZh, "视频中文标题");
  assert.deepEqual(result.points, ["[00:12] 关键观点"]);
  assert.match(promptSeen, /不能编造/);
  assert.match(promptSeen, /\[00:12\]/);
});

test("daily document blocks use Chinese headings and per-article sections", () => {
  const blocks = renderDailyDocBlocks({
    date: "2026-11-21",
    items: [{
      item: { title: "English title", source_name: "OpenAI News", score: 83, url: "https://example.com/a" },
      summary: { titleZh: "中文标题", summaryZh: "一句话结论", points: ["要点一"], whyZh: "值得看" },
    }],
  });
  const text = blocks.map((block) => block.text?.elements?.[0]?.text_run?.content
    ?? block.heading2?.elements?.[0]?.text_run?.content
    ?? block.heading3?.elements?.[0]?.text_run?.content
    ?? block.bullet?.elements?.[0]?.text_run?.content
    ?? "").join("\n");
  assert.match(text, /中文标题/);
  assert.match(text, /摘要/);
  assert.match(text, /要点一/);
  assert.match(text, /English title/);
  assert.match(text, /发布：/);
  assert.match(text, /资料范围：源摘要/);
  assert.match(text, /跟进 2026-11-21 1/);
});

test("P5 Host runner invokes growth CLI with the same explicit isolated home", async () => {
  const calls = [];
  const runner = createP5HostRunner({
    cliPath: "/release/experiments/p5-radar.mjs",
    growthCliPath: "/release/experiments/p5-radar-growth.mjs",
    polymarketCliPath: "/release/experiments/p5-radar-polymarket.mjs",
    home: "/isolated/p5-home",
    env: { EXISTING: "kept" },
    execFileImpl: async (executable, args, options) => {
      calls.push({ executable, args, options });
      return { stdout: "{\"ok\":true}\n" };
    },
  });
  await runner.growth();
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, ["/release/experiments/p5-radar-growth.mjs"]);
  assert.equal(calls[0].options.cwd, "/release/experiments");
  assert.equal(calls[0].options.env.P5_RADAR_HOME, "/isolated/p5-home");
  assert.equal(calls[0].options.env.EXISTING, "kept");
  await runner.polymarket();
  assert.deepEqual(calls[1].args, ["/release/experiments/p5-radar-polymarket.mjs"]);
  assert.equal(calls[1].options.env.P5_RADAR_HOME, "/isolated/p5-home");
});

test("P5 growth failure is recorded once and never blocks the daily digest", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-host-growth-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const calls = [];
  const deliveries = [];
  const events = [];
  let current = new Date("2026-11-21T09:30:00+08:00");
  const scheduler = createP5Scheduler({
    runner: {
      async collect() { calls.push("collect"); },
      async growth() { calls.push("growth"); throw new Error("skill upstream failed"); },
      async dailyDoc() { calls.push("digest"); return "今日雷达：https://radar.example.com"; },
    },
    send: async (payload) => { deliveries.push(payload); return { delivered: true }; },
    readChat: async () => ({ chatId: "oc_owner" }),
    stateFile: path.join(root, "p5-scheduler.json"),
    now: () => current,
    logger: (event) => events.push(event),
  });
  const failed = await scheduler.tick();
  assert.equal(failed.lastGrowthStatus, "failed");
  assert.match(failed.lastGrowthError, /skill upstream/u);
  current = new Date("2026-11-21T09:45:00+08:00");
  await scheduler.tick();
  assert.deepEqual(calls, ["collect", "growth"], "不在每次 tick 重试同一来源");
  current = new Date("2026-11-21T10:00:00+08:00");
  const sent = await scheduler.tick();
  assert.equal(sent.lastGrowthStatus, "failed");
  assert.equal(sent.lastDigestDelivery, "accepted");
  assert.equal(deliveries.length, 1);
  assert.deepEqual(calls, ["collect", "growth", "digest"]);
  assert.ok(events.includes("p5-growth-failed"));
  assert.ok(events.includes("p5-digest-sent"));
  scheduler.stop();
});

test("P5 Polymarket failure is isolated from collection and daily delivery", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-host-polymarket-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const calls = [];
  const deliveries = [];
  let current = new Date("2026-11-26T09:30:00+08:00");
  const scheduler = createP5Scheduler({
    runner: {
      async collect() { calls.push("collect"); },
      async polymarket() { calls.push("polymarket"); throw new Error("gamma unavailable"); },
      async dailyDoc() { calls.push("digest"); return "今日雷达：https://radar.example.com"; },
    },
    send: async (payload) => { deliveries.push(payload); return { delivered: true }; },
    readChat: async () => ({ chatId: "oc_owner" }),
    stateFile: path.join(root, "p5-scheduler.json"),
    now: () => current,
  });
  const failed = await scheduler.tick();
  assert.equal(failed.lastPolymarketStatus, "failed");
  assert.match(failed.lastPolymarketError, /gamma unavailable/u);
  current = new Date("2026-11-26T09:45:00+08:00");
  await scheduler.tick();
  assert.deepEqual(calls, ["collect", "polymarket"]);
  current = new Date("2026-11-26T10:00:00+08:00");
  const sent = await scheduler.tick();
  assert.equal(sent.lastDigestDelivery, "accepted");
  assert.equal(deliveries.length, 1);
  assert.deepEqual(calls, ["collect", "polymarket", "digest"]);
  scheduler.stop();
});

test("P5 scheduler collects at 09:30, sends digest at 10:00, and is same-day idempotent", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-host-scheduler-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const calls = [];
  const deliveries = [];
  let current = new Date("2026-11-21T09:29:00+08:00");
  const runner = {
    async collect() { calls.push("collect"); },
    async digest() { calls.push("digest"); return "# P5 日报\n\n1. Test"; },
    async mark() { throw new Error("not used"); },
    async status() { return "status"; },
  };
  const scheduler = createP5Scheduler({
    runner,
    send: async (payload) => { deliveries.push(payload); return { delivered: true }; },
    readChat: async () => ({ chatId: "oc_owner" }),
    stateFile: path.join(root, "p5-scheduler.json"),
    now: () => current,
  });
  await scheduler.tick();
  assert.deepEqual(calls, []);
  current = new Date("2026-11-21T09:30:00+08:00");
  await scheduler.tick();
  assert.deepEqual(calls, ["collect"]);
  current = new Date("2026-11-21T10:00:00+08:00");
  await scheduler.tick();
  assert.deepEqual(calls, ["collect", "digest"]);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].chatId, "oc_owner");
  assert.match(deliveries[0].text, /P5 日报/);
  await scheduler.tick();
  assert.equal(deliveries.length, 1);
  current = new Date("2026-11-22T09:30:00+08:00");
  await scheduler.tick();
  assert.deepEqual(calls, ["collect", "digest", "collect"]);
  scheduler.stop();
});

test("P5 scheduler sends the short daily-doc link instead of the full digest when available", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-host-doc-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const deliveries = [];
  const current = new Date("2026-11-21T10:00:00+08:00");
  const scheduler = createP5Scheduler({
    runner: {
      async collect() {},
      async dailyDoc() { return "今日 P5 信息雷达：https://example.com/wiki/doc"; },
      async digest() { throw new Error("full digest must not be used"); },
      async mark() {},
      async status() { return "status"; },
    },
    send: async (payload) => { deliveries.push(payload); return { delivered: true }; },
    readChat: async () => ({ chatId: "oc_owner" }),
    stateFile: path.join(root, "p5-scheduler.json"),
    now: () => current,
  });
  await scheduler.tick();
  assert.equal(deliveries.length, 1);
  assert.match(deliveries[0].text, /wiki\/doc/);
  scheduler.stop();
});

test("P5 scheduler records transport unknown and never blindly resends that day's link", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-host-unknown-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let current = new Date("2026-11-21T10:00:00+08:00");
  let generated = 0;
  let sends = 0;
  const events = [];
  const scheduler = createP5Scheduler({
    runner: {
      async collect() {},
      async dailyDoc() { generated += 1; return "今日雷达：https://radar.example.com"; },
      async digest() { throw new Error("not used"); },
      async mark() {}, async status() { return "status"; },
    },
    send: async () => { sends += 1; throw new Error("socket closed after write"); },
    readChat: async () => ({ chatId: "oc_owner" }),
    stateFile: path.join(root, "p5-scheduler.json"),
    now: () => current,
    logger: (event) => events.push(event),
  });
  const first = await scheduler.tick();
  assert.equal(first.lastDigestDelivery, "unknown");
  assert.equal(first.lastDigestDate, "2026-11-21");
  current = new Date("2026-11-21T10:11:00+08:00");
  await scheduler.tick();
  assert.equal(generated, 1);
  assert.equal(sends, 1);
  assert.ok(events.includes("p5-digest-unknown-no-retry"));
  assert.ok(!events.includes("p5-digest-sent"));
  scheduler.stop();
});

test("P5 scheduler waits for a bound chat and retries after a failed send", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-host-retry-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let chat = null;
  let current = new Date("2026-11-21T10:00:00+08:00");
  let sends = 0;
  const scheduler = createP5Scheduler({
    runner: {
      async collect() {},
      async digest() { return "digest"; },
      async mark() {},
      async status() { return "status"; },
    },
    send: async () => { sends += 1; return { delivered: true }; },
    readChat: async () => chat,
    stateFile: path.join(root, "p5-scheduler.json"),
    now: () => current,
  });
  await scheduler.tick();
  assert.equal(sends, 0);
  chat = { chatId: "oc_owner" };
  await scheduler.tick();
  assert.equal(sends, 0, "failed/no-chat attempt sets a retry window");
  current = new Date("2026-11-21T10:11:00+08:00");
  await scheduler.tick();
  assert.equal(sends, 1);
  scheduler.stop();
});
