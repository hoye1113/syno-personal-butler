import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { PendingDecisionStore } from "../apps/syno/syno/pending-decision.mjs";
import { RecentInteractionView, parseRecentReference } from "../apps/syno/syno/recent-interaction.mjs";

test("recent references parse deterministically without asking the model", () => {
  assert.deepEqual(parseRecentReference("刚才那个"), { kind: "recent_reference", action: "inspect", confidence: 1, text: "刚才那个" });
  assert.deepEqual(parseRecentReference("取消刚才的"), { kind: "recent_reference", action: "cancel", confidence: 1, text: "取消刚才的" });
  assert.deepEqual(parseRecentReference("继续第 2 项"), { kind: "recent_reference", action: "continue", confidence: 1, text: "继续第 2 项", index: 2 });
  assert.equal(parseRecentReference("帮我想个标题"), null);
});

test("RecentInteractionView asks for an index when a recent reference has multiple candidates", async () => {
  const view = new RecentInteractionView({
    core: { host: { async list() { return [
      { id: "job-2", ownerKey: "owner", channel: "weixin", threadKey: "main", status: "running", created: "2026-07-29T00:02:00.000Z", updated: "2026-07-29T00:02:00.000Z" },
      { id: "job-1", ownerKey: "owner", channel: "weixin", threadKey: "main", status: "pending", created: "2026-07-29T00:01:00.000Z", updated: "2026-07-29T00:01:00.000Z" },
    ]; } } },
  });
  const result = await view.resolve(parseRecentReference("取消刚才的"), { ownerKey: "owner", channel: "weixin" });
  assert.equal(result.kind, "ambiguous");
  assert.match(result.text, /job-2/);
  assert.match(result.text, /job-1/);
});

test("RecentInteractionView cancels only the explicitly selected recent Job", async () => {
  const canceled = [];
  const view = new RecentInteractionView({
    core: {
      host: { async list() { return [
        { id: "job-2", ownerKey: "owner", channel: "feishu", threadKey: "main", status: "running", created: "2026-07-29T00:02:00.000Z", updated: "2026-07-29T00:02:00.000Z" },
      ]; } },
      async cancel(id) { canceled.push(id); return { job: { id, status: "canceled" } }; },
    },
  });
  const result = await view.resolve(parseRecentReference("取消刚才的"), { ownerKey: "owner", channel: "feishu" });
  assert.equal(result.kind, "resolved");
  assert.deepEqual(canceled, ["job-2"]);
});

test("PendingDecision presentation fixes ordered IDs, channel and version across repeated reads", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-presentation-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new PendingDecisionStore({ file: path.join(root, "pending.json") });
  const first = await store.add({ jobId: "job-1", ownerKey: "owner", threadKey: "main", phase: "clarification", summary: "one" });
  const second = await store.add({ jobId: "job-2", ownerKey: "owner", threadKey: "main", phase: "clarification", summary: "two" });
  const presentation = await store.present({ ownerKey: "owner", threadKey: "main", channel: "weixin", businessVersion: "v1" });
  const repeated = await store.present({ ownerKey: "owner", threadKey: "main", channel: "weixin", businessVersion: "v1" });
  assert.equal(presentation.presentationId, repeated.presentationId);
  assert.deepEqual(presentation.orderedDecisionIds, [first.id, second.id]);
  assert.equal(presentation.channel, "weixin");
  assert.equal(presentation.version, 1);
  const resolved = await store.parse("确认 2", { ownerKey: "owner", threadKey: "main", channel: "weixin", presentationId: presentation.presentationId });
  assert.equal(resolved.decision.id, second.id);
});
