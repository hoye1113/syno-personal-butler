import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";

import { KnowledgeStore } from "../packages/syno-core/knowledge-store.mjs";
import { KnowledgeMaintenanceSource } from "../apps/syno/syno/knowledge-maintenance-source.mjs";
import { ClaimEvidenceService } from "../apps/syno/syno/claim-evidence-service.mjs";
import { GoalService } from "../apps/syno/syno/goal-service.mjs";
import { KnowledgeProfileService } from "../apps/syno/syno/knowledge-profile-service.mjs";
import { PlannerService } from "../apps/syno/syno/planner-service.mjs";
import { parseRecord, writeRecord } from "../apps/syno/syno/markdown-record.mjs";
import { validateContractRecord } from "../packages/syno-core/schema-registry.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const FIXED_NOW = new Date("2026-07-21T08:00:00.000Z");

// D6（2026-09-01）：学习子系统已移除，Planner 只产出 digest/ingest/maintenance/output 建议。
async function setup(t, notes = {}, { goals: goalInputs = [] } = {}) {
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
  const goals = new GoalService({ opsRoot, clock: () => FIXED_NOW });
  const profile = new KnowledgeProfileService({ knowledge, maintenance, claims, opsRoot, clock: () => FIXED_NOW });
  const planner = new PlannerService({ knowledge, goals, claims, ingest: null, maintenance, opsRoot, runtimeRoot, clock: () => FIXED_NOW });

  // 创建目标
  for (const goalInput of goalInputs) {
    await goals.create(goalInput, { opsRoot });
  }

  return { vaultRoot, opsRoot, runtimeRoot, knowledge, maintenance, claims, goals, profile, planner };
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

test("planDay never emits review-kind items (learning subsystem removed, D6)", async (t) => {
  const { planner, opsRoot } = await setup(t, {
    "note.md": "---\ntitle: Note\ntags: [AI]\nstability: practice\nupdated: 2026-07-01\n---\n# Note",
  });
  const plan = await planner.planDay();
  assert.equal(plan.items.some((item) => item.kind === "review"), false);
  assert.equal(plan.items.some((item) => item.area === "learn"), false);
  // 学习状态目录不再被任何链路创建
  const statesDir = path.join(opsRoot, "reviews", "learning", "states");
  await assert.rejects(() => fs.readdir(statesDir), { code: "ENOENT" });
});

test("active goals drive digest selection", async (t) => {
  const { planner, knowledge, vaultRoot } = await setup(t, {
    "ai.md": "---\ntitle: AI\ntags: [AI]\nstability: practice\nupdated: 2026-07-01\n---\n# AI",
    "cooking.md": "---\ntitle: Cooking\ntags: [Food]\nstability: practice\nupdated: 2026-07-01\n---\n# Cooking",
  }, {
    goals: [{ title: "掌握 AI", priority: 100, focusAreas: ["AI"] }],
  });
  const notes = await knowledge.list();
  const expectedAiPath = path.relative(path.dirname(vaultRoot), path.join(vaultRoot, "ai.md")).replace(/\\/g, "/");
  const aiNote = notes.find((n) => n.path === expectedAiPath);
  assert.ok(aiNote, `ai.md should be indexed at ${expectedAiPath}, got: ${JSON.stringify(notes.map(n => n.path))}`);
  assert.ok(aiNote.searchable, "ai.md should be searchable");
  assert.ok(aiNote.tags.includes("AI"), "ai.md should have tag AI");
  const plan = await planner.planDay();
  const aiAction = plan.items.find((i) => i.ref === expectedAiPath);
  assert.ok(aiAction, `AI note should be selected, got items: ${JSON.stringify(plan.items.map(i => i.ref))}`);
  assert.equal(aiAction.kind, "digest");
  assert.equal(aiAction.area, "knowledge");
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

test("loadExistingPlan returns the most recently generated plan for the day", async (t) => {
  const { planner, runtimeRoot } = await setup(t, {
    "note.md": "---\ntitle: Note\ntags: [AI]\nstability: practice\nupdated: 2026-07-01\n---\n# Note",
  });
  const plansRoot = path.join(runtimeRoot, "plans");
  const real = await planner.planDay();
  // 手动写一个更旧的同 fingerprint 同日计划，验证不依赖 readdir 顺序返回最新
  await writeRecord(path.join(plansRoot, "plan-2026-07-21-stale.md"), {
    id: "plan-2026-07-21-stale",
    ownerId: "local-user",
    localDate: "2026-07-21",
    generatedAt: "2026-07-21T00:00:00.000Z",
    vaultFingerprint: real.vaultFingerprint,
    goalRefs: [],
    capacity: 5,
    allocation: { digest: 0, ingest: 0, maintenance: 0 },
    items: [],
  }, { schema: "daily-knowledge-plan", title: "每日计划 2026-07-21", summaryKeys: ["id", "localDate", "generatedAt", "vaultFingerprint"] });
  const loaded = await planner.planDay();
  assert.equal(loaded.id, real.id, "should return the newest plan (generatedAt 08:00 > 00:00), not the stale one");
});
