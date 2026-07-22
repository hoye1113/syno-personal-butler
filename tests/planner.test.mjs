import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";

import { KnowledgeStore } from "../apps/syno/syno/knowledge-store.mjs";
import { KnowledgeMaintenanceSource } from "../apps/syno/syno/knowledge-maintenance-source.mjs";
import { ClaimEvidenceService } from "../apps/syno/syno/claim-evidence-service.mjs";
import { LearningService } from "../apps/syno/syno/learning-service.mjs";
import { GoalService } from "../apps/syno/syno/goal-service.mjs";
import { KnowledgeProfileService } from "../apps/syno/syno/knowledge-profile-service.mjs";
import { PlannerService } from "../apps/syno/syno/planner-service.mjs";
import { parseRecord, writeRecord } from "../apps/syno/syno/markdown-record.mjs";
import { validateContractRecord } from "../apps/syno/syno/schema-registry.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const FIXED_NOW = new Date("2026-07-21T08:00:00.000Z");

async function setup(t, notes = {}, { goals: goalInputs = [], learningStates = [] } = {}) {
  const testRoot = path.join(REPO_ROOT, ".runtime", "tests");
  await fs.mkdir(testRoot, { recursive: true });
  const tempRoot = await fs.mkdtemp(path.join(testRoot, "syno-planner-"));
  // vault 必须在 vault/ 子目录下，使 relativeToRepo 生成 vault/ 前缀路径，isContentNote 才能识别
  const vaultRoot = path.join(tempRoot, "vault");
  await fs.mkdir(vaultRoot, { recursive: true });
  const opsRoot = path.join(tempRoot, "ops");
  await fs.mkdir(opsRoot, { recursive: true });
  const runtimeRoot = path.join(tempRoot, ".runtime");
  await fs.mkdir(runtimeRoot, { recursive: true });
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(notes)) {
    await fs.mkdir(path.dirname(path.join(vaultRoot, name)), { recursive: true });
    await fs.writeFile(path.join(vaultRoot, name), content, "utf8");
  }
  const knowledge = new KnowledgeStore({ vaultRoot, indexFile: path.join(vaultRoot, ".index.json") });
  const maintenance = new KnowledgeMaintenanceSource({ vaultRoot, clock: () => FIXED_NOW });
  const claims = new ClaimEvidenceService({ opsRoot, clock: () => FIXED_NOW });
  const learning = new LearningService({ opsRoot, clock: () => FIXED_NOW });
  const goals = new GoalService({ opsRoot, clock: () => FIXED_NOW });
  const profile = new KnowledgeProfileService({ knowledge, maintenance, claims, learning, opsRoot, clock: () => FIXED_NOW });
  const planner = new PlannerService({ knowledge, goals, learning, claims, ingest: null, maintenance, profile, opsRoot, runtimeRoot, clock: () => FIXED_NOW });

  // 创建目标
  for (const goalInput of goalInputs) {
    await goals.create(goalInput, { opsRoot });
  }

  // 创建学习状态
  for (const state of learningStates) {
    const stateDir = path.join(opsRoot, "reviews", "learning", "states");
    await fs.mkdir(stateDir, { recursive: true });
    const stateId = `learning-${state.knowledgeRef.replace(/[^a-z0-9]/gi, "").slice(0, 12)}`;
    const record = {
      id: stateId,
      knowledgeRef: state.knowledgeRef,
      stage: state.stage || "captured",
      mastery: state.mastery || 0,
      evidenceRefs: [],
      reviewCount: state.reviewCount || 0,
      reviewIntervalDays: state.reviewIntervalDays || 1,
      calibrationFlags: [],
      lastTestedAt: state.lastTestedAt || FIXED_NOW.toISOString(),
      nextReviewAt: state.nextReviewAt || FIXED_NOW.toISOString(),
      updated: FIXED_NOW.toISOString(),
    };
    await writeRecord(path.join(stateDir, `${stateId}.md`), record, {
      schema: "learning-state",
      title: `Learning state: ${state.knowledgeRef}`,
      summaryKeys: ["id", "knowledgeRef", "stage", "mastery", "reviewCount", "reviewIntervalDays", "lastTestedAt", "nextReviewAt", "updated"],
    });
  }

  return { vaultRoot, opsRoot, runtimeRoot, knowledge, maintenance, claims, learning, goals, profile, planner };
}

test("planDay returns a schema-conformant DailyKnowledgePlan", async (t) => {
  const { planner } = await setup(t, {
    "agent.md": "---\ntitle: Agent\ntags: [AI, Agent]\nstability: practice\nupdated: 2026-07-01\n---\n# Agent\n\n反馈闭环。",
  });
  const plan = await planner.planDay();
  await validateContractRecord("daily-knowledge-plan", plan);
  assert.equal(plan.localDate, "2026-07-21");
  assert.ok(plan.id.startsWith("plan-2026-07-21-"));
  assert.ok(plan.vaultFingerprint.length > 0);
  assert.ok(Array.isArray(plan.items));
  assert.ok(plan.capacity > 0);
  assert.ok(typeof plan.allocation === "object");
});

test("planDay is idempotent for same localDate and vaultFingerprint", async (t) => {
  const { planner } = await setup(t, {
    "note.md": "---\ntitle: Note\ntags: [AI]\nstability: practice\nupdated: 2026-07-01\n---\n# Note",
  });
  const first = await planner.planDay();
  const second = await planner.planDay();
  assert.equal(first.id, second.id);
  assert.deepEqual(first.items, second.items);
});

test("planDay returns fresh plan when vault changes", async (t) => {
  const { planner, knowledge, vaultRoot } = await setup(t, {
    "note.md": "---\ntitle: Note\ntags: [AI]\nstability: practice\nupdated: 2026-07-01\n---\n# Note",
  });
  const first = await planner.planDay();
  // 添加新笔记改变 vault fingerprint
  await fs.writeFile(path.join(vaultRoot, "new.md"), "---\ntitle: New\nstability: fact\n---\n# New\n", "utf8");
  knowledge.invalidate();
  const second = await planner.planDay();
  assert.notEqual(first.id, second.id);
  assert.notEqual(first.vaultFingerprint, second.vaultFingerprint);
});

test("planDay does not create LearningState or LearningEvidence", async (t) => {
  const { planner, opsRoot } = await setup(t, {
    "note.md": "---\ntitle: Note\ntags: [AI]\nstability: practice\nupdated: 2026-07-01\n---\n# Note",
  });
  await planner.planDay();
  // 验证没有创建学习状态或证据
  const statesDir = path.join(opsRoot, "reviews", "learning", "states");
  const evidenceDir = path.join(opsRoot, "reviews", "learning", "evidence");
  await assert.rejects(() => fs.readdir(statesDir), { code: "ENOENT" });
  await assert.rejects(() => fs.readdir(evidenceDir), { code: "ENOENT" });
});

test("due reviews appear first with highest priority", async (t) => {
  const pastDate = new Date("2026-07-20T00:00:00.000Z").toISOString();
  // 先 setup 获取 vaultRoot，再手动创建学习状态
  const { planner, vaultRoot, opsRoot } = await setup(t, {
    "ai.md": "---\ntitle: AI\ntags: [AI]\nstability: practice\nupdated: 2026-07-01\n---\n# AI",
    "agent.md": "---\ntitle: Agent\ntags: [Agent]\nstability: practice\nupdated: 2026-07-01\n---\n# Agent",
  });
  const expectedPath = path.relative(REPO_ROOT, path.join(vaultRoot, "ai.md")).replace(/\\/g, "/");
  // 手动创建学习状态
  const stateDir = path.join(opsRoot, "reviews", "learning", "states");
  await fs.mkdir(stateDir, { recursive: true });
  await writeRecord(path.join(stateDir, "learning-vaultaimd.md"), {
    id: "learning-vaultaimd",
    knowledgeRef: expectedPath,
    stage: "captured",
    mastery: 0.5,
    evidenceRefs: [],
    reviewCount: 0,
    reviewIntervalDays: 1,
    calibrationFlags: [],
    lastTestedAt: FIXED_NOW.toISOString(),
    nextReviewAt: pastDate,
    updated: FIXED_NOW.toISOString(),
  }, { schema: "learning-state", title: `Learning state: ${expectedPath}`, summaryKeys: ["id", "knowledgeRef", "stage", "mastery", "reviewCount", "reviewIntervalDays", "lastTestedAt", "nextReviewAt", "updated"] });
  const plan = await planner.planDay();
  assert.ok(plan.items.length > 0);
  // 到期复习应该是第一项
  assert.equal(plan.items[0].kind, "review");
  assert.equal(plan.items[0].ref, expectedPath);
  assert.ok(plan.items[0].priority >= 90);
});

test("active goals drive digest selection", async (t) => {
  const { planner, knowledge, vaultRoot } = await setup(t, {
    "ai.md": "---\ntitle: AI\ntags: [AI]\nstability: practice\nupdated: 2026-07-01\n---\n# AI",
    "cooking.md": "---\ntitle: Cooking\ntags: [Food]\nstability: practice\nupdated: 2026-07-01\n---\n# Cooking",
  }, {
    goals: [{ title: "掌握 AI", priority: 100, focusAreas: ["AI"] }],
  });
  const notes = await knowledge.list();
  const expectedAiPath = path.relative(REPO_ROOT, path.join(vaultRoot, "ai.md")).replace(/\\/g, "/");
  const aiNote = notes.find((n) => n.path === expectedAiPath);
  assert.ok(aiNote, `ai.md should be indexed at ${expectedAiPath}, got: ${JSON.stringify(notes.map(n => n.path))}`);
  assert.ok(aiNote.searchable, "ai.md should be searchable");
  assert.ok(aiNote.tags.includes("AI"), "ai.md should have tag AI");
  const plan = await planner.planDay();
  const aiAction = plan.items.find((i) => i.ref === expectedAiPath);
  assert.ok(aiAction, `AI note should be selected, got items: ${JSON.stringify(plan.items.map(i => i.ref))}`);
  assert.equal(plan.goalRefs.length, 1);
});

test("empty vault produces a plan with no digest items", async (t) => {
  const { planner } = await setup(t, {});
  const plan = await planner.planDay();
  assert.ok(plan.items.length >= 0);
  assert.equal(plan.allocation.digest, 0);
});

test("plan persists to .runtime/plans/", async (t) => {
  const { planner, runtimeRoot } = await setup(t, {
    "note.md": "---\ntitle: Note\ntags: [AI]\nstability: practice\nupdated: 2026-07-01\n---\n# Note",
  });
  const plan = await planner.planDay();
  const file = path.join(runtimeRoot, "plans", `${plan.id}.md`);
  const content = await fs.readFile(file, "utf8");
  const roundtrip = parseRecord(content);
  assert.equal(roundtrip.id, plan.id);
  assert.equal(roundtrip.localDate, plan.localDate);
});
