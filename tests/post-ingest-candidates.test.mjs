import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { PostIngestCandidateStore } from "../apps/syno/syno/post-ingest-candidates.mjs";

test("committed ingest creates rebuildable follow-up candidates without mastery facts", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-post-ingest-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new PostIngestCandidateStore({ root, clock: () => new Date("2026-07-28T00:00:00.000Z") });

  const result = await store.record({
    workflow: { id: "workflow-1", artifactId: "artifact-1" },
    commit: { path: "vault/02-Resources/AI and Agents/Context Engineering.md", knowledgeState: "captured" },
    proposal: {
      canonicalTags: ["ai_agent", "context_engineering"],
      unresolved: ["核对时效主张"],
      claimCandidates: [{ statement: "模型上下文会持续变化", stability: "volatile" }],
      evidenceCandidates: [{ statement: "官方文档描述了上下文限制", sourceRef: "https://example.com/official" }],
    },
  });

  assert.equal(result.learningCandidate.knowledgeState, "captured");
  assert.equal(result.learningCandidate.masteryDelta, 0);
  assert.ok(result.reviewOpportunity);
  assert.ok(result.outputOpportunity);
  assert.equal(result.evidenceCandidates.length, 2);
  assert.ok(result.evidenceCandidates.some((item) => item.sourceRef === "https://example.com/official"));
  const persisted = await fs.readFile(path.join(root, "workflow-1.json"), "utf8");
  assert.doesNotMatch(persisted, /LearningState|LearningEvidence/);
});

test("review opportunity transitions candidate→presented idempotently and persists", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-post-ingest-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new PostIngestCandidateStore({ root, clock: () => new Date("2026-07-28T00:00:00.000Z") });
  await store.record({
    workflow: { id: "workflow-1", artifactId: "artifact-1" },
    commit: { path: "vault/02-Resources/AI and Agents/Context Engineering.md" },
    proposal: {},
  });

  const presented = await store.markReviewPresented("workflow-1", { presentedAt: "2026-07-29T00:00:00.000Z" });
  assert.equal(presented.status, "presented");
  assert.equal(presented.presentedAt, "2026-07-29T00:00:00.000Z");

  // 幂等：重复 presented 保留首个 presentedAt
  const again = await store.markReviewPresented("workflow-1", { presentedAt: "2026-07-30T00:00:00.000Z" });
  assert.equal(again.presentedAt, "2026-07-29T00:00:00.000Z");

  const persisted = JSON.parse(await fs.readFile(path.join(root, "workflow-1.json"), "utf8"));
  assert.equal(persisted.reviewOpportunity.status, "presented");
  assert.equal(persisted.reviewOpportunity.presentedAt, "2026-07-29T00:00:00.000Z");

  // 找不到记录返回 null（不抛）
  assert.equal(await store.markReviewPresented("workflow-999"), null);
});

test("completeReviewByKnowledgeRef closes matching candidates and flips learningCandidate", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-post-ingest-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new PostIngestCandidateStore({ root, clock: () => new Date("2026-07-28T00:00:00.000Z") });
  const knowledgeRef = "vault/02-Resources/AI and Agents/Context Engineering.md";
  await store.record({ workflow: { id: "workflow-1", artifactId: "a1" }, commit: { path: knowledgeRef }, proposal: {} });
  await store.record({ workflow: { id: "workflow-2", artifactId: "a2" }, commit: { path: "vault/other/note.md" }, proposal: {} });

  const hits = await store.completeReviewByKnowledgeRef(knowledgeRef, { evidenceId: "ev-1", jobId: "job-1" });
  assert.equal(hits, 1);
  const record = JSON.parse(await fs.readFile(path.join(root, "workflow-1.json"), "utf8"));
  assert.equal(record.reviewOpportunity.status, "done");
  assert.equal(record.reviewOpportunity.evidenceRef, "ev-1");
  assert.equal(record.reviewOpportunity.jobId, "job-1");
  assert.equal(record.learningCandidate.status, "learning");
  const other = JSON.parse(await fs.readFile(path.join(root, "workflow-2.json"), "utf8"));
  assert.equal(other.reviewOpportunity.status, "candidate");

  assert.equal(await store.completeReviewByKnowledgeRef("vault/none.md"), 0);
});

test("dismissReview marks candidate dismissed and keeps it out of due/active", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-post-ingest-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const clockState = { now: new Date("2026-07-28T00:00:00.000Z") };
  const store = new PostIngestCandidateStore({ root, clock: () => clockState.now });
  await store.record({ workflow: { id: "workflow-1", artifactId: "a1" }, commit: { path: "vault/x/note.md" }, proposal: {} });

  clockState.now = new Date("2026-07-29T00:00:00.000Z"); // +24h 到点
  assert.equal((await store.dueReviews({ now: clockState.now })).length, 1);

  const dismissed = await store.dismissReview("workflow-1");
  assert.equal(dismissed.status, "dismissed");
  assert.equal((await store.dueReviews({ now: clockState.now })).length, 0);
});

test("findActiveReviews returns presented within TTL and excludes stale", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-post-ingest-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new PostIngestCandidateStore({ root, clock: () => new Date("2026-07-28T00:00:00.000Z") });
  await store.record({ workflow: { id: "workflow-1", artifactId: "a1" }, commit: { path: "vault/x/note.md" }, proposal: {} });
  await store.markReviewPresented("workflow-1", { presentedAt: "2026-07-29T00:00:00.000Z" });

  assert.equal((await store.findActiveReviews({ now: new Date("2026-07-30T00:00:00.000Z") })).length, 1);
  // 超 72h TTL 不再 active
  assert.equal((await store.findActiveReviews({ now: new Date("2026-08-02T00:00:00.000Z") })).length, 0);
});

test("legacy candidate-only records are still due after the state machine lands", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-post-ingest-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const clockState = { now: new Date("2026-07-28T00:00:00.000Z") };
  const store = new PostIngestCandidateStore({ root, clock: () => clockState.now });
  await store.record({ workflow: { id: "workflow-1", artifactId: "a1" }, commit: { path: "vault/x/note.md" }, proposal: {} });

  clockState.now = new Date("2026-07-29T00:00:00.000Z");
  const due = await store.dueReviews({ now: clockState.now });
  assert.equal(due.length, 1);
  assert.equal(due[0].workflowId, "workflow-1");
  assert.equal(due[0].status, "candidate");
});
