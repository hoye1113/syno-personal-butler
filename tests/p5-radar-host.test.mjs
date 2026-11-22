import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseCandidateNumbers, parseRadarCommand } from "../experiments/superagent-p0/p5-radar/command.mjs";
import { createP5Scheduler } from "../experiments/superagent-p0/p5-radar/host.mjs";
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
  assert.match(text, /跟进 1/);
});

test("P5 scheduler collects at 07:30, sends digest at 08:00, and is same-day idempotent", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-host-scheduler-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const calls = [];
  const deliveries = [];
  let current = new Date("2026-11-21T07:29:00+08:00");
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
  current = new Date("2026-11-21T07:30:00+08:00");
  await scheduler.tick();
  assert.deepEqual(calls, ["collect"]);
  current = new Date("2026-11-21T08:00:00+08:00");
  await scheduler.tick();
  assert.deepEqual(calls, ["collect", "digest"]);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].chatId, "oc_owner");
  assert.match(deliveries[0].text, /P5 日报/);
  await scheduler.tick();
  assert.equal(deliveries.length, 1);
  current = new Date("2026-11-22T07:30:00+08:00");
  await scheduler.tick();
  assert.deepEqual(calls, ["collect", "digest", "collect"]);
  scheduler.stop();
});

test("P5 scheduler sends the short daily-doc link instead of the full digest when available", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-host-doc-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const deliveries = [];
  const current = new Date("2026-11-21T08:00:00+08:00");
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

test("P5 scheduler waits for a bound chat and retries after a failed send", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-host-retry-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let chat = null;
  let current = new Date("2026-11-21T08:00:00+08:00");
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
  current = new Date("2026-11-21T08:11:00+08:00");
  await scheduler.tick();
  assert.equal(sends, 1);
  scheduler.stop();
});
