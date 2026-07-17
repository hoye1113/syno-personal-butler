import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { IngestService } from "../apps/syno/syno/ingest-service.mjs";
import { GoalService } from "../apps/syno/syno/goal-service.mjs";
import { LearningService, reviewIntervalDays } from "../apps/syno/syno/learning-service.mjs";
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

test("only user-produced practice updates mastery and schedules repetition", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-learning-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new LearningService({ opsRoot: path.join(root, "ops"), clock: () => new Date("2026-07-17T08:00:00.000Z") });
  await assert.rejects(service.record({ producer: "ai" }), /主人亲自输出/);
  const result = await service.record({
    producer: "user", knowledgeRef: "vault/agent-loop.md", inputMode: "teach-back",
    rawArtifactRef: "local-state://voice/answer-1", assistedLevel: "prompted", rubricScore: 0.9,
    misconceptions: ["忽略了失败恢复"],
  });
  assert.equal(result.state.stage, "expressed");
  assert.equal(result.evidence.rubricScore, 0.81);
  assert.equal(reviewIntervalDays(result.evidence.rubricScore), 14);
  const due = await service.due({ now: new Date("2026-08-01T08:00:00.000Z") });
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
