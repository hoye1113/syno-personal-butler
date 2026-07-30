import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { PostIngestCandidateStore } from "../apps/syno/syno/post-ingest-candidates.mjs";
import { ReviewReminderSource } from "../apps/syno/syno/review-reminder-source.mjs";
import { SignalSourceRegistry } from "../apps/syno/syno/signal-source-registry.mjs";

async function makeSource(t, clockState) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-review-reminder-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const candidates = new PostIngestCandidateStore({ root, clock: () => clockState.now });
  const source = new ReviewReminderSource({ candidates, clock: () => clockState.now });
  return { source, candidates, root };
}

test("due maps due candidates to reminder items and hides not-yet-due/presented", async (t) => {
  const clockState = { now: new Date("2026-07-28T00:00:00.000Z") };
  const { source, candidates } = await makeSource(t, clockState);
  await candidates.record({
    workflow: { id: "workflow-1", artifactId: "a1" },
    commit: { path: "vault/02-Resources/AI and Agents/Context Engineering.md" },
    proposal: {},
  });
  await candidates.record({ workflow: { id: "workflow-2", artifactId: "a2" }, commit: { path: "vault/x/note.md" }, proposal: {} });

  // 未到点（dueAt = 收录 +24h）不出现
  assert.equal((await source.due({ now: clockState.now })).length, 0);

  clockState.now = new Date("2026-07-29T00:00:01.000Z");
  const due = await source.due({ now: clockState.now });
  assert.equal(due.length, 2);
  assert.equal(due[0].id, "review-due:workflow-1");
  assert.equal(due[0].workflowId, "workflow-1");
  assert.equal(due[0].title, "Context Engineering");
  assert.equal(due[0].knowledgeRef, "vault/02-Resources/AI and Agents/Context Engineering.md");
  assert.ok(due[0].dueAt);

  // presented 之后不再 due（由 SignalEngine 标记 inactive）
  await candidates.markReviewPresented("workflow-1");
  assert.deepEqual((await source.due({ now: clockState.now })).map((item) => item.workflowId), ["workflow-2"]);
});

test("acknowledgeDelivered only accepts review-due: subjects and ignores unknown workflows", async (t) => {
  const clockState = { now: new Date("2026-07-28T00:00:00.000Z") };
  const { source, candidates } = await makeSource(t, clockState);
  await candidates.record({ workflow: { id: "workflow-1", artifactId: "a1" }, commit: { path: "vault/x/note.md" }, proposal: {} });

  const acknowledged = await source.acknowledgeDelivered([
    { subjectKey: "claim-review:claim-1" },
    { subjectKey: "morning:brief" },
    { subjectKey: "review-due:" },
    { subjectKey: "review-due:workflow-999" },
    { subjectKey: "review-due:workflow-1" },
  ]);
  assert.equal(acknowledged, 1);

  const active = await source.active({ now: clockState.now });
  assert.equal(active.length, 1);
  assert.equal(active[0].workflowId, "workflow-1");
  assert.equal(active[0].title, "note");
  assert.ok(active[0].presentedAt);
});

test("acknowledgeDelivered keeps going when a single item fails", async () => {
  const calls = [];
  const source = new ReviewReminderSource({
    candidates: {
      async markReviewPresented(workflowId) {
        calls.push(workflowId);
        if (workflowId === "workflow-bad") throw new Error("boom");
        return { status: "presented" };
      },
    },
  });
  const acknowledged = await source.acknowledgeDelivered([
    { subjectKey: "review-due:workflow-bad" },
    { subjectKey: "review-due:workflow-good" },
  ]);
  assert.deepEqual(calls, ["workflow-bad", "workflow-good"]);
  assert.equal(acknowledged, 1);
});

test("dismissLatest dismisses the most recently presented review and returns null when none", async (t) => {
  const clockState = { now: new Date("2026-07-28T00:00:00.000Z") };
  const { source, candidates } = await makeSource(t, clockState);
  await candidates.record({ workflow: { id: "workflow-1", artifactId: "a1" }, commit: { path: "vault/x/first.md" }, proposal: {} });
  await candidates.record({ workflow: { id: "workflow-2", artifactId: "a2" }, commit: { path: "vault/x/second.md" }, proposal: {} });

  assert.equal(await source.dismissLatest({ now: clockState.now }), null);

  await candidates.markReviewPresented("workflow-1", { presentedAt: "2026-07-29T08:00:00.000Z" });
  await candidates.markReviewPresented("workflow-2", { presentedAt: "2026-07-29T09:00:00.000Z" });

  const skipped = await source.dismissLatest({ now: new Date("2026-07-29T10:00:00.000Z") });
  assert.equal(skipped.workflowId, "workflow-2");
  assert.equal(skipped.title, "second");
  assert.equal(skipped.status, "dismissed");

  // workflow-2 已 dismissed 不再 active，再跳一次轮到 workflow-1
  const next = await source.dismissLatest({ now: new Date("2026-07-29T10:00:00.000Z") });
  assert.equal(next.workflowId, "workflow-1");
  assert.equal(await source.dismissLatest({ now: new Date("2026-07-29T10:00:00.000Z") }), null);
});

test("SignalSourceRegistry exposes review-due signals with stable ref fields", async () => {
  const registry = new SignalSourceRegistry({
    reviewReminders: { async due() { return [
      { id: "review-due:workflow-1", workflowId: "workflow-1", knowledgeRef: "vault/x/note.md", title: "note", dueAt: "2026-07-29T00:00:00.000Z" },
    ]; } },
  });
  const signals = await registry.collect({ now: new Date("2026-07-29T08:00:00.000Z") });
  assert.equal(signals.length, 1);
  assert.deepEqual(signals[0], {
    id: "review-due:workflow-1",
    kind: "review-due",
    title: "复习「note」",
    action: "用自己的话讲讲它（≥20字直接回复即可）；不想现在复习回「跳过复习」",
    priority: 85,
    ref: {
      id: "review-due:workflow-1",
      workflowId: "workflow-1",
      knowledgeRef: "vault/x/note.md",
      dueAt: "2026-07-29T00:00:00.000Z",
    },
  });

  // 不传 reviewReminders 时现状不变（无 review-due 信号）
  const legacy = await new SignalSourceRegistry({}).collect();
  assert.equal(legacy.some((item) => item.kind === "review-due"), false);
});
