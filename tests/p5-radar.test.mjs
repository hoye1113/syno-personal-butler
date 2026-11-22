import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { collectSources } from "../experiments/superagent-p0/p5-radar/collect.mjs";
import { formatDigest } from "../experiments/superagent-p0/p5-radar/format.mjs";
import { CANDIDATE_THRESHOLD, isCandidate, scoreItem } from "../experiments/superagent-p0/p5-radar/score.mjs";
import { canonicalizeUrl, openStore, titleFingerprint } from "../experiments/superagent-p0/p5-radar/store.mjs";
import { parseFeed, parseYouTubeFeed } from "../experiments/superagent-p0/p5-radar/sources.mjs";
import { MAX_TRANSCRIPT_CHARS, buildVideoSummaryPrompt, summarizeTranscript } from "../experiments/superagent-p0/p5-radar/summarize.mjs";
import { cleanSrt, cleanTimed, cleanVtt } from "../experiments/superagent-p0/p5-radar/youtube.mjs";

function temporaryRoot() {
  return mkdtempSync(path.join(tmpdir(), "p5-radar-test-"));
}

test("RSS 解析：CDATA、HTML 摘要、guid、发布时间", () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item>
      <title><![CDATA[Agent Harness 实践]]></title>
      <link>https://example.com/posts/1?utm_source=x</link>
      <description><![CDATA[<p>如何构建 <b>Agent Loop</b> 与 Context Engineering。</p>]]></description>
      <pubDate>Fri, 21 Nov 2026 08:00:00 GMT</pubDate>
      <guid>post-1</guid>
    </item>
    <item>
      <title>没有链接的条目</title>
    </item>
  </channel></rss>`;
  const items = parseFeed(xml, { source: { url: "https://example.com/feed.xml" } });
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Agent Harness 实践");
  assert.equal(items[0].externalId, "post-1");
  assert.match(items[0].summary, /Agent Loop/);
  assert.equal(items[0].publishedAt, "2026-11-21T08:00:00.000Z");
});

test("Atom 解析：link href、summary、updated、id", () => {
  const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
    <entry>
      <title>Memory and RAG</title>
      <link rel="alternate" href="https://example.com/memory"/>
      <summary type="html">&lt;p&gt;Memory systems for agents.&lt;/p&gt;</summary>
      <updated>2026-11-20T10:00:00Z</updated>
      <id>tag:example.com,2026:memory</id>
    </entry>
  </feed>`;
  const items = parseFeed(xml, { source: { url: "https://example.com/feed.xml" } });
  assert.equal(items.length, 1);
  assert.equal(items[0].url, "https://example.com/memory");
  assert.equal(items[0].externalId, "tag:example.com,2026:memory");
  assert.match(items[0].summary, /Memory systems/);
});

test("YouTube Atom 解析：videoId、watch URL、description", () => {
  const xml = `<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
    <entry>
      <yt:videoId>abc123</yt:videoId>
      <title>Agent engineering talk</title>
      <link rel="alternate" href="https://www.youtube.com/watch?v=abc123"/>
      <published>2026-11-20T00:00:00+00:00</published>
      <media:description>Deep dive into harnesses.</media:description>
    </entry>
  </feed>`;
  const items = parseYouTubeFeed(xml, { channelId: "UC123", channelName: "@test" });
  assert.equal(items.length, 1);
  assert.equal(items[0].externalId, "abc123");
  assert.equal(items[0].url, "https://www.youtube.com/watch?v=abc123");
  assert.equal(items[0].kind, "video");
});

test("URL 规范化与标题指纹", () => {
  assert.equal(canonicalizeUrl("https://example.com/a?utm_source=x&b=2&a=1#x"), "https://example.com/a?a=1&b=2");
  assert.equal(canonicalizeUrl("https://www.youtube.com/watch?v=abc&t=10&list=x"), "https://www.youtube.com/watch?v=abc");
  assert.equal(titleFingerprint(" Agent   Harness！"), titleFingerprint("agent harness"));
  assert.notEqual(titleFingerprint("agent harness"), titleFingerprint("agent memory"));
});

test("评分：核心主题高分，融资噪声排除，官方源加分", () => {
  const core = scoreItem({
    title: "Building an agent harness with MCP, memory and evals",
    summary: "A practical guide to context engineering and tool use.",
  }, { name: "OpenAI News", kind: "rss", tier: "T1", weight: 1 });
  assert.equal(core.excluded, false);
  assert.ok(core.score >= CANDIDATE_THRESHOLD, `${core.score}`);
  assert.ok(core.topics.includes("Harness / Agent 工程"));
  assert.equal(isCandidate(core), true);

  const funding = scoreItem({
    title: "AI startup raises $500M at $10B valuation after IPO",
    summary: "Investors bet on revenue growth.",
  }, { name: "Media", kind: "rss", tier: "T2", weight: 0.6 });
  assert.equal(funding.excluded, true);
  assert.equal(isCandidate(funding), false);

  const official = scoreItem({
    title: "New agent harness for tool use",
    summary: "Context engineering and evals.",
  }, { name: "Official", kind: "rss", tier: "T1", weight: 1 });
  const aggregator = scoreItem({
    title: "New agent harness for tool use",
    summary: "Context engineering and evals.",
  }, { name: "Aggregator", kind: "aihot", tier: "T2", weight: 0.4 });
  assert.ok(official.score > aggregator.score);
});

test("SQLite 存储：判重、评分、候选、跟进、状态", () => {
  const root = temporaryRoot();
  const store = openStore({ file: path.join(root, "radar.db") });
  try {
    store.seedSources([{
      id: "test-source", name: "Test", kind: "rss", url: "https://example.com/feed.xml",
      tier: "T1", weight: 1,
    }]);
    const first = store.insertItem({
      sourceId: "test-source", externalId: "post-1", title: "Agent harness",
      url: "https://example.com/posts/1?utm_source=x", summary: "MCP and memory.",
    });
    assert.equal(first.inserted, true);
    const duplicate = store.insertItem({
      sourceId: "test-source", externalId: "post-1", title: "Agent harness changed",
      url: "https://example.com/posts/1?utm_source=y", summary: "duplicate.",
    });
    assert.equal(duplicate.inserted, false);
    assert.equal(duplicate.id, first.id);

    store.saveScore(first.id, { score: 88, reason: "核心主题", topics: ["Agent / Harness"], excluded: false, sourceWeight: 1 });
    store.upsertCandidate(first.id);
    const candidates = store.listCandidates({ limit: 10 });
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].score, 88);
    assert.equal(candidates[0].source_name, "Test");

    assert.equal(store.markCandidate(first.id, "followed"), true);
    assert.equal(store.listCandidates({ limit: 10, state: "new" }).length, 0);
    assert.equal(store.listCandidates({ limit: 10, state: "followed" }).length, 1);
    const status = store.status();
    assert.equal(status.items, 1);
    assert.equal(status.new_candidates, 0);
    assert.equal(status.followed, 1);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("collectSources 通过注入 fetcher 完成采集、评分和 run 收尾", async () => {
  const root = temporaryRoot();
  const store = openStore({ file: path.join(root, "radar.db") });
  try {
    store.seedSources([{
      id: "test-rss", name: "Test RSS", kind: "rss", url: "https://example.com/feed.xml",
      tier: "T1", weight: 1,
    }]);
    const summary = await collectSources({
      store,
      only: "test-rss",
      fetchSourceImpl: async () => ({
        items: [{
          externalId: "agent-1",
          title: "Agent harness context engineering",
          url: "https://example.com/agent-1",
          summary: "MCP and memory for coding agents.",
          publishedAt: new Date().toISOString(),
          kind: "article",
        }],
      }),
    });
    assert.equal(summary.fetched, 1);
    assert.equal(summary.inserted, 1);
    assert.equal(summary.scored, 1);
    assert.equal(summary.errors.length, 0);
    assert.ok(summary.runId > 0);
    assert.equal(store.listSources().find((source) => source.id === "test-rss").last_error, null);
    assert.equal(store.listItemsForDoc({ limit: 10 }).length, 1);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("摘要格式：候选与空状态", () => {
  const markdown = formatDigest([{
    item_id: 1, title: "Agent harness", url: "https://example.com", source_name: "OpenAI",
    source_id: "openai", score: 88, reason: "命中：Agent / Harness",
  }], { date: "2026-11-21" });
  assert.match(markdown, /P5 信息雷达/);
  assert.match(markdown, /Agent harness/);
  assert.match(markdown, /88 分/);
  assert.match(markdown, /跟进 N/);
  assert.match(formatDigest([], { date: "2026-11-21" }), /没有达到门槛/);
});

test("字幕清洗：VTT/SRT 头、时间戳、标签和重复行", () => {
  const vtt = `WEBVTT

00:00:00.000 --> 00:00:02.000
<v>Hello</v> world

00:00:02.000 --> 00:00:04.000
Hello world
Agent harness
`;
  assert.equal(cleanVtt(vtt), "Hello world Agent harness");
  assert.equal(cleanTimed(vtt), "[00:00] Hello world\n[00:02] Agent harness");
  const srt = `1
00:00:00,000 --> 00:00:02,000
Memory and RAG

2
00:00:02,000 --> 00:00:04,000
Memory and RAG
`;
  assert.equal(cleanSrt(srt), "Memory and RAG");
  assert.equal(cleanTimed(srt), "[00:00] Memory and RAG");
});

test("视频摘要提示词把字幕标为不可信，并保留视频元信息", () => {
  const prompt = buildVideoSummaryPrompt({
    title: "Agent harness talk",
    channel: "Latent Space",
    url: "https://www.youtube.com/watch?v=abc",
    publishedAt: "2026-11-21T00:00:00Z",
    transcript: "Agent harness transcript.",
  });
  assert.match(prompt, /Agent harness talk/);
  assert.match(prompt, /Latent Space/);
  assert.match(prompt, /<untrusted-transcript>/);
  assert.match(prompt, /时间戳/);
  assert.match(prompt, /绝不能编造/);
});

test("视频深读按 60k 字符截断，并只调用一次模型", async () => {
  const calls = [];
  const client = {
    async generate({ prompt }) {
      calls.push(prompt);
      return { text: "摘要结果" };
    },
  };
  const result = await summarizeTranscript({
    item: { title: "Long talk", author: "Test", url: "https://www.youtube.com/watch?v=abc", publishedAt: null },
    transcript: "a".repeat(MAX_TRANSCRIPT_CHARS + 5000),
    client,
  });
  assert.equal(calls.length, 1);
  assert.equal(result.text, "摘要结果");
  assert.equal(result.transcriptChars, MAX_TRANSCRIPT_CHARS + 5000);
  assert.equal(result.clippedChars, MAX_TRANSCRIPT_CHARS);
  assert.match(calls[0], /已截断/);
});
