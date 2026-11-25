import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyExplicitPreference,
  applyRadarReactions,
  ensurePreferences,
  loadRadarReactions,
  loadPreferences,
  rankEntries,
  recordFeedback,
  seedPreferences,
} from "../experiments/superagent-p0/p5-radar/preferences.mjs";
import { buildDailyDoc } from "../experiments/superagent-p0/p5-radar/daily-doc.mjs";
import { openStore } from "../experiments/superagent-p0/p5-radar/store.mjs";

function tempRoot() {
  return mkdtempSync(path.join(os.tmpdir(), "p5-preferences-"));
}

function entry(itemId, topics, sourceId, score, publishedAt) {
  return {
    item: {
      item_id: itemId,
      source_id: sourceId,
      source_name: sourceId,
      topics,
      score,
      published_at: publishedAt,
      title: `item ${itemId}`,
      kind: "article",
      url: `https://example.com/${itemId}`,
    },
    summary: { titleZh: `条目 ${itemId}`, summaryZh: "摘要", points: [], sourceStatus: "feed-translation" },
  };
}

test("seeds topic/source preferences from followed and ignored items", async () => {
  const root = tempRoot();
  const store = openStore({ file: path.join(root, "radar.db") });
  try {
    store.seedSources([{ id: "s1", name: "S1", kind: "rss", url: "https://example.com/feed", tier: "T1", weight: 1 }]);
    const insert = (id) => store.insertItem({ sourceId: "s1", externalId: id, title: id, url: `https://example.com/${id}` });
    const followed = insert("followed");
    const ignored = insert("ignored");
    store.saveScore(followed.id, { score: 80, reason: "x", topics: ["Harness / Agent 工程"], excluded: false, sourceWeight: 1 });
    store.saveScore(ignored.id, { score: 30, reason: "x", topics: ["模型 / 前沿"], excluded: false, sourceWeight: 1 });
    store.upsertCandidate(followed.id);
    store.markCandidate(followed.id, "followed");
    store.upsertCandidate(ignored.id);
    store.markCandidate(ignored.id, "ignored");
    const preferences = await seedPreferences({ store, home: root });
    assert.equal(preferences.topics["Harness / Agent 工程"], 1);
    assert.equal(preferences.topics["模型 / 前沿"], -1);
    assert.equal(preferences.sources.s1, 0);
    assert.ok(preferences.seededAt);
    assert.deepEqual(await loadPreferences(root), preferences);
    await ensurePreferences({ store, home: root });
    assert.equal((await loadPreferences(root)).topics["Harness / Agent 工程"], 1);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("feedback and explicit preference update weights without filtering", () => {
  const preferences = { topics: {}, sources: {}, explicit: [], seededAt: null };
  recordFeedback({
    preferences,
    item: { source_id: "s1", topics: ["AI Coding / 工程"] },
    action: "follow",
  });
  assert.equal(preferences.topics["AI Coding / 工程"], 1);
  assert.equal(preferences.sources.s1, 0.5);
  const result = applyExplicitPreference({ preferences, text: "更关注 sandbox 和 agent 工程" });
  assert.ok(result.matched.includes("Harness / Agent 工程"));
  assert.ok(preferences.topics["Harness / Agent 工程"] >= 2);
  assert.equal(applyExplicitPreference({ preferences, text: "随便聊聊" }).matched.length, 0);
  const naturalNegative = applyExplicitPreference({ preferences, text: "别给我推模型新闻了" });
  assert.deepEqual(naturalNegative.matched, ["模型 / 前沿"]);
  assert.equal(naturalNegative.negative, true);
  assert.equal(preferences.topics["模型 / 前沿"], -2);
  const lessRecommended = applyExplicitPreference({ preferences, text: "以后少推 coding 内容" });
  assert.equal(lessRecommended.negative, true);
  assert.equal(preferences.topics["AI Coding / 工程"], 1);
});

test("reaction overlays affect the next ranking without cumulative writes or filtering", async () => {
  const root = tempRoot();
  const store = openStore({ file: path.join(root, "radar.db") });
  try {
    store.seedSources([
      { id: "s1", name: "S1", kind: "rss" },
      { id: "s2", name: "S2", kind: "rss" },
    ]);
    const liked = store.insertItem({ sourceId: "s1", externalId: "liked", title: "Liked", url: "https://example.com/liked" });
    const disliked = store.insertItem({ sourceId: "s2", externalId: "disliked", title: "Disliked", url: "https://example.com/disliked" });
    store.saveScore(liked.id, { score: 60, reason: "x", topics: ["AI Coding / 工程"], excluded: false, sourceWeight: 1 });
    store.saveScore(disliked.id, { score: 60, reason: "x", topics: ["模型 / 前沿"], excluded: false, sourceWeight: 1 });
    const reactions = { schema: 1, items: {
      [liked.id]: { itemId: liked.id, reaction: "like" },
      [disliked.id]: { itemId: disliked.id, reaction: "dislike" },
    } };
    writeFileSync(path.join(root, "radar-reactions.json"), JSON.stringify(reactions));
    const preferences = { topics: {}, sources: {}, explicit: [], seededAt: "x" };
    applyRadarReactions({ preferences, reactions: await loadRadarReactions(root), store });
    assert.equal(preferences.topics["AI Coding / 工程"], 1);
    assert.equal(preferences.topics["模型 / 前沿"], -1);
    assert.equal(preferences.sources.s1, 0.5);
    assert.equal(preferences.sources.s2, -0.5);
    const entries = [
      entry(100, ["AI Coding / 工程"], "s1", 60, "2026-11-25T00:00:00Z"),
      entry(101, ["模型 / 前沿"], "s2", 60, "2026-11-24T00:00:00Z"),
    ];
    const ranked = rankEntries(entries, preferences);
    assert.equal(ranked[0].item.item_id, 100);
    assert.equal(ranked.length, 2);
    assert.deepEqual((await loadPreferences(root)).topics, {}, "reaction overlays never rewrite Host preferences");
    const codingFuture = store.insertItem({ sourceId: "s1", externalId: "coding-future", title: "Coding future", url: "https://example.com/coding-future", publishedAt: "2026-11-25T01:00:00Z" });
    const modelFuture = store.insertItem({ sourceId: "s2", externalId: "model-future", title: "Model future", url: "https://example.com/model-future", publishedAt: "2026-11-25T01:00:00Z" });
    store.saveScore(codingFuture.id, { score: 60, reason: "x", topics: ["AI Coding / 工程"], excluded: false, sourceWeight: 1 });
    store.saveScore(modelFuture.id, { score: 60, reason: "x", topics: ["模型 / 前沿"], excluded: false, sourceWeight: 1 });
    for (const item of [codingFuture, modelFuture]) {
      store.saveArticleSummary(item.id, { model: "fixture", titleZh: item.title, summaryZh: "这是一段足够长且无需外部模型的真实隔离摘要。", points: [], whyZh: "", sourceStatus: "article" });
    }
    writeFileSync(path.join(root, "daily-doc-2026-11-24.json"), JSON.stringify({ date: "2026-11-24", items: [{ itemId: liked.id }, { itemId: disliked.id }] }));
    const daily = await buildDailyDoc({ store, home: root, date: "2026-11-25", renderOnly: true });
    assert.deepEqual(daily.entries.map((entry) => entry.item.item_id), [codingFuture.id, modelFuture.id], "the real daily-doc chain applies reaction overlays");
    reactions.items[liked.id].reaction = "dislike";
    writeFileSync(path.join(root, "radar-reactions.json"), JSON.stringify(reactions));
    const switched = { topics: {}, sources: {}, explicit: [], seededAt: "x" };
    applyRadarReactions({ preferences: switched, reactions: await loadRadarReactions(root), store });
    assert.equal(switched.topics["AI Coding / 工程"], -1, "switching reaction reverses the old signal without accumulation");
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("ranking keeps every entry, raises preferred, and reserves exploration", () => {
  const entries = [
    entry(1, ["Harness / Agent 工程"], "s1", 60, "2026-11-22T00:00:00Z"),
    entry(2, ["Harness / Agent 工程"], "s2", 50, "2026-11-21T00:00:00Z"),
    entry(3, ["模型 / 前沿"], "s3", 80, "2026-11-20T00:00:00Z"),
    entry(4, ["产品 / 组织"], "s4", 20, "2026-11-19T00:00:00Z"),
    entry(5, ["研究 / 评测 / 安全"], "s5", 40, "2026-11-18T00:00:00Z"),
  ];
  const preferences = { topics: { "Harness / Agent 工程": 3 }, sources: {}, explicit: [], seededAt: "x" };
  const ranked = rankEntries(entries, preferences, { preferredLimit: 2, exploreRatio: 0.2 });
  assert.equal(ranked.length, entries.length);
  assert.deepEqual(new Set(ranked.map((item) => item.item.item_id)), new Set([1, 2, 3, 4, 5]));
  assert.deepEqual(ranked.slice(0, 2).map((item) => item.group), ["preferred", "preferred"]);
  assert.ok(ranked.some((item) => item.group === "explore"));
  assert.ok(ranked.some((item) => item.group === "rest"));
  assert.equal(ranked.filter((item) => item.group === "preferred").length, 2);
  const capped = rankEntries(entries, preferences, { maxItems: 3, preferredLimit: 2, exploreRatio: 0.15 });
  assert.equal(capped.length, 3);
  assert.equal(new Set(capped.map((item) => item.item.item_id)).size, 3);
});
