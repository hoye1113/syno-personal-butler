import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_SOURCES, fetchSource } from "../experiments/superagent-p0/p5-radar/sources.mjs";

test("Hacker News 通过现有采集入口返回 Top 30 快照及站内热度证据", async () => {
  const stories = new Map([
    [101, { id: 101, type: "story", title: "Agent harness release", url: "https://example.com/agent?utm_source=hn", by: "alice", time: 1795660000, score: 321, descendants: 45 }],
    [102, { id: 102, type: "story", title: "Ask HN: How do you evaluate agents?", by: "bob", time: 1795650000, score: 120, descendants: 80 }],
    [103, { id: 103, type: "story", title: "Deleted story", deleted: true }],
    [104, { id: 104, type: "story", title: "Malformed URL", url: "http://[", time: 1795640000 }],
  ]);
  const calls = [];
  const result = await fetchSource({
    id: "hn-top",
    kind: "hackernews",
    url: "https://hacker-news.firebaseio.com/v0/topstories.json",
    config: { limit: 4 },
  }, {
    curlJsonImpl: async (url) => {
      calls.push(url);
      if (url.endsWith("/topstories.json")) return [101, 102, 103, 104];
      const id = Number(url.match(/\/item\/(\d+)\.json$/u)?.[1]);
      return stories.get(id);
    },
  });

  assert.equal(result.items.length, 3);
  assert.deepEqual(result.items.map((item) => item.externalId), ["101", "102", "104"]);
  assert.equal(result.items[0].title, "Agent harness release");
  assert.equal(result.items[0].url, "https://example.com/agent?utm_source=hn");
  assert.equal(result.items[0].publishedAt, "2026-11-26T02:26:40.000Z");
  assert.equal(result.items[0].raw.hnRank, 1);
  assert.equal(result.items[0].raw.hnScore, 321);
  assert.equal(result.items[0].raw.hnComments, 45);
  assert.equal(result.items[1].url, "https://news.ycombinator.com/item?id=102");
  assert.equal(result.items[1].raw.hnRank, 2);
  assert.equal(result.items[2].url, "https://news.ycombinator.com/item?id=104");
  assert.equal(calls.length, 5);
});

test("AI News Radar 精选 JSON 保留多源证据并拒绝陈旧快照", async () => {
  const document = {
    generated_at: "2026-11-26T01:30:00Z",
    items: [{
      story_id: "story-agent-1",
      title: "Agent runtime ships trace viewer",
      title_zh: "Agent 运行时发布追踪查看器",
      url: "https://example.com/agent-trace",
      summary: "The release adds deterministic replay and trace inspection.",
      published_at: "2026-11-25T23:00:00Z",
      source_name: "Example Engineering",
      source_count: 2,
      source_tier_rank: 0,
      source_tier_label: "官方一手源",
      importance_score: 88,
      importance_label: "重要",
      ai_label: "agent_workflow",
      persona_review: "这条上游主观评论不应进入摘要",
      sources: [
        { title: "Official release", url: "https://example.com/agent-trace", source_name: "Example Engineering" },
        { title: "Independent report", url: "https://news.example.org/agent-trace", source_name: "Example News" },
      ],
    }],
  };
  const result = await fetchSource({
    id: "ai-news-radar",
    kind: "ai-news-radar",
    url: "https://learnprompt.github.io/ai-news-radar/data/daily-brief.json",
  }, {
    now: () => new Date("2026-11-26T02:00:00Z"),
    curlJsonImpl: async () => document,
  });

  assert.equal(result.items.length, 1);
  const [item] = result.items;
  assert.equal(item.externalId, "story-agent-1");
  assert.equal(item.title, "Agent runtime ships trace viewer");
  assert.equal(item.url, "https://example.com/agent-trace");
  assert.equal(item.summary, "The release adds deterministic replay and trace inspection.");
  assert.equal(item.raw.sourceCount, 2);
  assert.equal(item.raw.sourceTierRank, 0);
  assert.equal(item.raw.relatedSources.length, 2);
  assert.equal(item.raw.personaReview, undefined);
  assert.doesNotMatch(JSON.stringify(item), /主观评论/u);

  await assert.rejects(() => fetchSource({
    kind: "ai-news-radar",
    url: "https://learnprompt.github.io/ai-news-radar/data/daily-brief.json",
  }, {
    now: () => new Date("2026-11-26T02:00:00Z"),
    curlJsonImpl: async () => ({ ...document, generated_at: "2026-11-23T01:00:00Z" }),
  }), /超过 48 小时/u);

  const nullable = await fetchSource({
    kind: "ai-news-radar",
    url: "https://learnprompt.github.io/ai-news-radar/data/daily-brief.json",
  }, {
    now: () => new Date("2026-11-26T02:00:00Z"),
    curlJsonImpl: async () => ({
      generated_at: document.generated_at,
      items: [{
        ...document.items[0], published_at: null, source_count: null, source_tier_rank: null, importance_score: null,
        sources: [{ ...document.items[0].sources[0], published_at: "2026-11-25T23:00:00Z" }, document.items[0].sources[1]],
      }],
    }),
  });
  assert.equal(nullable.items[0].raw.sourceCount, 2);
  assert.equal(nullable.items[0].raw.sourceTierRank, null);
  assert.equal(nullable.items[0].raw.importanceScore, null);
  assert.equal(nullable.items[0].publishedAt, "2026-11-25T23:00:00.000Z");
});

test("融合日报默认启用 HN 与 AI News Radar，但不把聚合源当作官方一手源", () => {
  const hn = DEFAULT_SOURCES.find((source) => source.id === "hackernews-top");
  const radar = DEFAULT_SOURCES.find((source) => source.id === "ai-news-radar");
  assert.equal(hn.kind, "hackernews");
  assert.equal(hn.config.limit, 30);
  assert.equal(hn.tier, "T2");
  assert.equal(radar.kind, "ai-news-radar");
  assert.equal(radar.url, "https://learnprompt.github.io/ai-news-radar/data/daily-brief.json");
  assert.equal(radar.tier, "T1.5");
  assert.ok(hn.weight < 1);
  assert.ok(radar.weight < 1);
});
