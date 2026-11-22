import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyExplicitPreference,
  ensurePreferences,
  loadPreferences,
  rankEntries,
  recordFeedback,
  seedPreferences,
} from "../experiments/superagent-p0/p5-radar/preferences.mjs";
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
