import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { PendingDecisionStore, decisionVersion } from "../packages/syno-core/pending-decision.mjs";
import { RecentInteractionView } from "../packages/syno-core/recent-interaction.mjs";

test("RecentInteractionView asks for an index when a recent reference has multiple candidates", async () => {
  const view = new RecentInteractionView({
    core: { host: { async list() { return [
      { id: "job-2", ownerKey: "owner", channel: "weixin", threadKey: "main", status: "running", created: "2026-07-29T00:02:00.000Z", updated: "2026-07-29T00:02:00.000Z" },
      { id: "job-1", ownerKey: "owner", channel: "weixin", threadKey: "main", status: "pending", created: "2026-07-29T00:01:00.000Z", updated: "2026-07-29T00:01:00.000Z" },
    ]; } } },
  });
  const result = await view.resolve({ action: "cancel" }, { ownerKey: "owner", channel: "weixin" });
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
  const result = await view.resolve({ action: "cancel" }, { ownerKey: "owner", channel: "feishu" });
  assert.equal(result.kind, "resolved");
  assert.deepEqual(canceled, ["job-2"]);
});

test("RecentInteractionView resolves one Unknown Case from mobile without retrying its effect", async () => {
  const resolutions = [];
  const view = new RecentInteractionView({
    core: { host: { async list() { return []; } } },
    reconciliationCases: {
      async list() { return [{ caseId: "case-unknown-1", toolName: "settings.adjust", status: "open", createdAt: "2026-07-29T00:01:00.000Z", updatedAt: "2026-07-29T00:01:00.000Z" }]; },
      async resolveOwner(id, resolution) { resolutions.push({ id, resolution }); return { caseId: id, ownerResolution: { source: "owner", ...resolution } }; },
    },
  });
  const result = await view.resolve({ action: "resolve_unknown", result: "confirmed_not_started" }, { ownerKey: "owner", channel: "weixin" });
  assert.equal(result.kind, "resolved");
  assert.match(result.text, /重新发起新请求/);
  assert.deepEqual(resolutions, [{ id: "case-unknown-1", resolution: { result: "confirmed_not_started", resolvedBy: "owner", channel: "weixin" } }]);
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
  const resolved = await store.reserve(second.id, { ownerKey: "owner", threadKey: "main", version: decisionVersion(second) });
  assert.equal(resolved.id, second.id);
});
