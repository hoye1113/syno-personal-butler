import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { IngestService } from "../apps/syno/syno/ingest-service.mjs";
import { ClaimEvidenceService } from "../apps/syno/syno/claim-evidence-service.mjs";
import { GoalService } from "../apps/syno/syno/goal-service.mjs";
import { LearningService, calibrationFor, reviewIntervalDays } from "../apps/syno/syno/learning-service.mjs";
import { OutputService } from "../apps/syno/syno/output-service.mjs";
import { TodayService } from "../apps/syno/syno/today-service.mjs";

test("ingest returns an immediate Artifact then builds an additive proposal", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-ingest-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new IngestService({
    intake: { async prepare(payload) { return { sourceType: payload.kind, text: `受控正文：${payload.value}` }; } },
    knowledge: { async search() { return []; } },
    opsRoot: path.join(root, "ops"), stateRoot: path.join(root, "state"),
    clock: () => new Date("2026-07-17T08:00:00.000Z"),
  });
  const receipt = await service.receive({ kind: "text", value: "Agent Harness 的关键是反馈回路" });
  assert.match(receipt.artifact.id, /^artifact-/);
  assert.equal(receipt.proposalPending, true);
  assert.equal((await service.status(receipt.artifact.id)).status, "received");
  const { proposal } = await service.propose(receipt.artifact.id);
  assert.equal(proposal.risk, "additive");
  assert.match(proposal.suggestedPath, /^vault\/00-Inbox\//);
  const applied = await service.apply(receipt.artifact.id, { workspace: root });
  assert.equal(applied.applied, true);
  assert.match(await fs.readFile(path.join(root, applied.path), "utf8"), /factual_status: unverified/);
});

test("dedupe matches force merge review instead of silent overwrite", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-ingest-dedupe-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new IngestService({
    intake: { async prepare() { return { sourceType: "text", text: "重复素材" }; } },
    knowledge: { async search() { return [{ path: "vault/existing.md" }]; } },
    opsRoot: path.join(root, "ops"), stateRoot: path.join(root, "state"),
  });
  const receipt = await service.receive({ kind: "text", value: "重复素材" });
  const { proposal } = await service.propose(receipt.artifact.id);
  assert.equal(proposal.risk, "merge");
  await assert.rejects(service.apply(receipt.artifact.id, { workspace: root }), /纯新增/);
});

test("ingest failures are durable and additive proposals support one approved batch", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-ingest-batch-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let fail = true;
  const service = new IngestService({
    intake: { async prepare(payload) { if (fail) throw Object.assign(new Error("source unavailable"), { retryable: true }); return { sourceType: "text", content: payload.value, text: payload.value }; } },
    knowledge: { async search() { return []; } }, opsRoot: path.join(root, "ops"), stateRoot: path.join(root, "state"),
  });
  const failed = await service.receive({ kind: "text", value: "first" });
  await assert.rejects(service.propose(failed.artifact.id), /source unavailable/);
  assert.deepEqual((await service.status(failed.artifact.id)).error, { code: "INGEST_PROPOSAL_FAILED", message: "source unavailable", retryable: true });
  fail = false;
  await service.propose(failed.artifact.id);
  const second = await service.receive({ kind: "text", value: "second" });
  await service.propose(second.artifact.id);
  const batch = await service.applyBatch([failed.artifact.id, second.artifact.id], { workspace: root });
  assert.equal(batch.applied, 2);
  assert.equal(batch.changedPaths.length, 2);
});

test("only user-produced practice updates mastery and schedules repetition", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-learning-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new LearningService({ opsRoot: path.join(root, "ops"), clock: () => new Date("2026-07-17T08:00:00.000Z") });
  await assert.rejects(service.record({ producer: "ai" }), /主人亲自输出/);
  const result = await service.record({
    producer: "user", knowledgeRef: "vault/agent-loop.md", inputMode: "teach-back",
    rawArtifactRef: "local-state://voice/answer-1", assistedLevel: "prompted",
    rubric: { accurate: 1, explained: 1, applied: 1, discriminated: 1 }, selfAssessment: "mostly", isReview: false,
    misconceptions: ["忽略了失败恢复"],
  });
  assert.equal(result.state.stage, "expressed");
  assert.equal(result.evidence.rubricScore, 0.9);
  assert.equal(result.evidence.calibration, "aligned");
  assert.equal(result.state.reviewIntervalDays, 1);
  const reviewed = await service.record({
    producer: "user", knowledgeRef: "vault/agent-loop.md", inputMode: "quiz",
    rawArtifactRef: "local-state://typed/review-1", assistedLevel: "none",
    rubric: { accurate: 1, explained: 1, applied: 1, discriminated: 0 }, selfAssessment: "solid", isReview: true,
    misconceptions: [],
  });
  assert.equal(reviewed.state.reviewCount, 1);
  assert.equal(reviewed.state.reviewIntervalDays, 3);
  assert.equal(calibrationFor("solid", 0.5), "fluency-illusion");
  assert.equal(reviewIntervalDays({ passed: false, isReview: true, reviewCount: 5 }), 1);
  const due = await service.due({ now: new Date("2026-07-21T08:00:00.000Z") });
  assert.equal(due[0].knowledgeRef, "vault/agent-loop.md");
});

test("output opportunities and teach-back prompts make output a mastery mechanism", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-output-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new OutputService({ opsRoot: path.join(root, "ops"), clock: () => new Date("2026-07-17T08:00:00.000Z") });
  const prompt = service.teachBackPrompt({ title: "Tool Loop Agent", claims: ["claim-1"] });
  assert.equal(prompt.questions.length, 4);
  assert.match(prompt.evidenceRule, /主人亲自/);
  const { opportunity } = await service.createOpportunity({
    title: "为什么 Harness 比模型排行榜更重要", format: "deep-article", goalRefs: ["goal-1"],
    knowledgeRefs: ["vault/harness.md"], reason: "当前目标相关且缺少可教给小白的完整论证", priority: 90,
  });
  assert.equal(opportunity.status, "suggested");
  assert.equal(opportunity.priority, 90);
});

test("time-sensitive claims keep supporting and conflicting evidence side by side", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-evidence-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new ClaimEvidenceService({ opsRoot: path.join(root, "ops"), clock: () => new Date("2026-07-17T08:00:00.000Z") });
  const { claim } = await service.createClaim({ statement: "某模型当前支持原生工具调用", stability: "volatile", reviewAfter: "2026-07-24T08:00:00.000Z" });
  const support = await service.createEvidenceCandidate({ claimId: claim.id, sourceRef: "https://vendor.example/docs", sourceTier: "first-party", stance: "supports", excerpt: "官方文档列出 tools。" });
  const conflict = await service.createEvidenceCandidate({ claimId: claim.id, sourceRef: "https://vendor.example/status", sourceTier: "first-party", stance: "contradicts", excerpt: "状态页说明该能力暂时关闭。" });
  const first = await service.approveCandidate({ candidateId: support.candidate.id });
  const second = await service.approveCandidate({ candidateId: conflict.candidate.id });
  assert.notEqual(first.evidence.id, second.evidence.id);
  assert.equal(first.evidence.stance, "supports");
  assert.equal(second.evidence.stance, "contradicts");
  assert.equal((await fs.readdir(path.join(root, "ops", "evidence", "records"))).length, 2);
});

test("Today ranks goals before commitments and reviews with the fixed work mix", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-today-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const goals = new GoalService({ opsRoot: path.join(root, "ops"), clock: () => new Date("2026-07-17T08:00:00.000Z") });
  await goals.create({ title: "完成主动知识闭环", priority: 90, focusAreas: ["AI Agent"] });
  const today = new TodayService({
    goals,
    learning: { async due() { return [{ id: "review-1", knowledgeRef: "vault/harness.md", mastery: 0.4, nextReviewAt: "2026-07-17T07:00:00.000Z" }]; } },
    host: { async list() { return [{ id: "job-1", intent: "create_action", status: "awaiting_approval", risk: "low", request: { summary: "复习" } }]; } },
    clock: () => new Date("2026-07-17T08:00:00.000Z"),
  });
  const snapshot = await today.snapshot({ capacity: 20 });
  assert.equal(snapshot.priorities[0].kind, "goal");
  assert.deepEqual(snapshot.allocation, { digest: 12, ingest: 5, maintenance: 3 });
  assert.deepEqual(snapshot.counts, { goals: 1, commitments: 1, reviews: 1 });
});
