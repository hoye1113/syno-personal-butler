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
import { TodayService } from "../apps/syno/syno/today-service.mjs";
import { SignalSourceRegistry } from "../apps/syno/syno/signal-source-registry.mjs";
import { writeRecord } from "../apps/syno/syno/markdown-record.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const FIXED_NOW = new Date("2026-07-21T08:00:00.000Z");

// 简单的 Host mock
class MockHost {
  constructor(jobs = []) { this.jobs = jobs; }
  async list({ limit = 100 } = {}) { return this.jobs.slice(0, limit); }
}

// 简单的 SettingsRegistry mock
class MockSettings {
  constructor(values = {}) { this.values = values; }
  async get(key) { return this.values[key]; }
}

async function setup(t, notes = {}, { goals: goalInputs = [], learningStates = [], jobs = [], settings = {} } = {}) {
  const testRoot = path.join(REPO_ROOT, ".runtime", "tests");
  await fs.mkdir(testRoot, { recursive: true });
  const tempRoot = await fs.mkdtemp(path.join(testRoot, "syno-today-"));
  const vaultRoot = path.join(tempRoot, "vault");
  await fs.mkdir(vaultRoot, { recursive: true });
  const opsRoot = path.join(tempRoot, "ops");
  await fs.mkdir(opsRoot, { recursive: true });
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
  const planner = new PlannerService({ knowledge, goals, learning, claims, ingest: null, maintenance, profile, opsRoot, clock: () => FIXED_NOW });
  const signalSources = new SignalSourceRegistry({ claims, ingest: { pending: async () => [] }, outputs: { list: async () => [] }, maintenance });
  const host = new MockHost(jobs);
  const settingsRegistry = new MockSettings(settings);

  for (const goalInput of goalInputs) {
    await goals.create(goalInput, { opsRoot });
  }

  for (const state of learningStates) {
    const stateDir = path.join(opsRoot, "reviews", "learning", "states");
    await fs.mkdir(stateDir, { recursive: true });
    const stateId = `learning-${state.knowledgeRef.replace(/[^a-z0-9]/gi, "").slice(0, 12)}`;
    await writeRecord(path.join(stateDir, `${stateId}.md`), {
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
    }, { schema: "learning-state", title: `Learning state: ${state.knowledgeRef}`, summaryKeys: ["id", "knowledgeRef", "stage", "mastery", "reviewCount", "reviewIntervalDays", "lastTestedAt", "nextReviewAt", "updated"] });
  }

  const today = new TodayService({ goals, learning, host, settingsRegistry, signalSources, planner, clock: () => FIXED_NOW });
  return { today, goals, learning, planner, opsRoot };
}

test("snapshot returns typed actions with area and intent", async (t) => {
  const { today } = await setup(t, {
    "note.md": "---\ntitle: Note\ntags: [AI]\nstability: practice\nupdated: 2026-07-01\n---\n# Note",
  }, {
    goals: [{ title: "掌握 AI", priority: 100, focusAreas: ["AI"] }],
  });
  const snapshot = await today.snapshot();
  // 所有 priorities 项都应有 area 和 intent
  for (const item of snapshot.priorities) {
    assert.ok(item.area, `item ${item.id} should have area`);
    assert.ok(item.intent, `item ${item.id} should have intent`);
  }
});

test("snapshot shows guidance when no goals exist", async (t) => {
  const { today } = await setup(t, {});
  const snapshot = await today.snapshot();
  assert.ok(snapshot.guidance, "should show guidance when no goals");
  assert.ok(snapshot.guidance.includes("告诉 Syno"), "guidance should prompt user");
});

test("snapshot has no guidance when goals exist", async (t) => {
  const { today } = await setup(t, {}, {
    goals: [{ title: "掌握 AI", priority: 100, focusAreas: ["AI"] }],
  });
  const snapshot = await today.snapshot();
  assert.equal(snapshot.guidance, null);
});

test("snapshot includes suggestedLearning and dueReviews from plan", async (t) => {
  const { today } = await setup(t, {
    "ai.md": "---\ntitle: AI\ntags: [AI]\nstability: practice\nupdated: 2026-07-01\n---\n# AI",
  }, {
    goals: [{ title: "掌握 AI", priority: 100, focusAreas: ["AI"] }],
  });
  const snapshot = await today.snapshot();
  assert.ok(Array.isArray(snapshot.suggestedLearning), "should have suggestedLearning");
  assert.ok(Array.isArray(snapshot.dueReviews), "should have dueReviews");
  assert.ok(snapshot.plan, "should have plan summary");
  assert.ok(snapshot.plan.id, "plan should have id");
});

test("snapshot needsYou items have typed actions", async (t) => {
  const { today } = await setup(t, {
    "note.md": "---\ntitle: Note\ntags: [AI]\nstability: practice\nupdated: 2026-07-01\n---\n# Note",
  });
  const snapshot = await today.snapshot();
  for (const item of snapshot.needsYou) {
    assert.ok(item.area, `needsYou item ${item.id} should have area`);
    assert.ok(item.intent, `needsYou item ${item.id} should have intent`);
  }
});

test("snapshot recentIntake items have typed actions", async (t) => {
  const { today } = await setup(t, {});
  const snapshot = await today.snapshot();
  assert.ok(Array.isArray(snapshot.recentIntake), "should have recentIntake");
  for (const item of snapshot.recentIntake) {
    assert.ok(item.area, `recentIntake item ${item.id} should have area`);
    assert.ok(item.intent, `recentIntake item ${item.id} should have intent`);
  }
});

test("snapshot maps each signal kind to its canonical area and intent", async () => {
  const signalSources = {
    async collect() {
      return [
        { id: "s-claim", kind: "claim-review", title: "复核观点", ref: { id: "claim-1" }, priority: 40 },
        { id: "s-ingest", kind: "ingest-pending", title: "收录", ref: { id: "a-1" }, priority: 40 },
        { id: "s-output", kind: "output-opportunity", title: "输出", ref: { id: "o-1" }, priority: 40 },
        { id: "s-maint", kind: "knowledge-maintenance", title: "维护", ref: { id: "m-1" }, priority: 40 },
      ];
    },
  };
  const today = new TodayService({
    goals: { async list() { return []; } },
    learning: { async due() { return []; } },
    host: { async list() { return []; } },
    signalSources,
    clock: () => FIXED_NOW,
  });
  const snapshot = await today.snapshot({ capacity: 10 });
  const byKind = new Map(snapshot.priorities.map((item) => [item.kind, item]));
  assert.equal(byKind.get("claim").area, "knowledge");
  assert.equal(byKind.get("claim").intent, "review-claim");
  assert.equal(byKind.get("ingest").area, "capture");
  assert.equal(byKind.get("ingest").intent, "review-ingest");
  assert.equal(byKind.get("output-opportunity").area, "create");
  assert.equal(byKind.get("output-opportunity").intent, "continue-output");
  assert.equal(byKind.get("knowledge-maintenance").area, "knowledge");
  assert.equal(byKind.get("knowledge-maintenance").intent, "review-maintenance");
});
