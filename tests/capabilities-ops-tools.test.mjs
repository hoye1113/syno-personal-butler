import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { ClaimEvidenceService } from "../packages/syno-core/claim-evidence-service.mjs";
import { GoalService } from "../packages/syno-core/goal-service.mjs";
import { IngestService } from "../packages/syno-core/ingest-service.mjs";
import { JobStore } from "../packages/syno-core/job-store.mjs";
import { KnowledgeMaintenanceSource } from "../packages/syno-core/knowledge-maintenance-source.mjs";
import { KnowledgeStore } from "../packages/syno-core/knowledge-store.mjs";
import { OutputService } from "../packages/syno-core/output-service.mjs";
import { SettingsRegistry } from "../packages/syno-core/settings-registry.mjs";
import { SignalSourceRegistry } from "../packages/syno-core/signal-source-registry.mjs";
import { createOpsRuntime, createOpsTools } from "../packages/syno-dsh-plugin/plugins/capabilities/ops-tools.mjs";

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-capabilities-ops-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const opsRoot = path.join(root, "ops");
  const vaultRoot = path.join(root, "vault");
  const worktree = path.join(root, "worktree");
  await fs.mkdir(worktree, { recursive: true });
  const knowledge = new KnowledgeStore({ vaultRoot, indexFile: path.join(root, "index.json") });
  const changes = [];
  const gitGuard = {
    async changedPaths() { return []; },
    async changes() { return changes; },
    async prepareWorktree(id) { return { branch: `syno/job/${id}`, directory: worktree, base: "base" }; },
    async commitPaths(paths) { return { committed: paths.length > 0, commit: "work-1", paths }; },
    async pinWorktree() { return { commit: "work-1", diffHash: "hash-1", preview: "", changes }; },
    async mergeWorktree() { return { merged: true, commit: "merge-1" }; },
    async removeWorktree() {},
  };
  const claims = new ClaimEvidenceService({ opsRoot });
  const goals = new GoalService({ opsRoot });
  const outputs = new OutputService({ opsRoot });
  const ingest = new IngestService({ knowledge, opsRoot, stateRoot: path.join(root, "ingest-state") });
  const maintenance = new KnowledgeMaintenanceSource({ vaultRoot, runtimeRoot: path.join(root, "runtime") });
  const signalSources = new SignalSourceRegistry({ claims, ingest, outputs, maintenance });
  const runtime = createOpsRuntime({
    knowledge,
    claims,
    goals,
    outputs,
    ingest,
    maintenance,
    signalSources,
    jobStore: new JobStore({ opsRoot }),
    gitGuard,
    validator: async ({ changedPaths }) => ({ ok: true, changedPaths }),
    reports: { async create() { return { record: { id: "report-test" } }; } },
    planner: { async planDay() { return null; } },
    settingsRegistry: new SettingsRegistry({ stateFile: path.join(root, "settings.json") }),
  });
  return { tools: createOpsTools(runtime), changes };
}

test("capabilities jobs submit/read stay on the Job pipeline", async (t) => {
  const { tools, changes } = await fixture(t);

  assert.deepEqual(JSON.parse(await tools.jobsList()), []);

  changes.push({ status: "??", path: "ops/actions/2026/09/action-x.md", kind: "added" });
  const submitted = JSON.parse(await tools.jobsSubmit({ mode: "action", text: "整理今日待办" }));
  assert.equal(submitted.status, "completed");
  assert.equal(submitted.requiresApproval, false);
  assert.ok(submitted.id);

  const jobs = JSON.parse(await tools.jobsList({ limit: 5 }));
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].intent, "create_action");
  assert.deepEqual(jobs[0].changedPaths, ["ops/actions/2026/09/action-x.md"]);
});

test("capabilities jobs submit rejects unsupported modes and missing text", async (t) => {
  const { tools } = await fixture(t);
  await assert.rejects(tools.jobsSubmit({ mode: "bogus", text: "x" }), (error) => error.code === "TOOL_INPUT_INVALID");
  await assert.rejects(tools.jobsSubmit({ mode: "action" }), (error) => error.code === "TOOL_INPUT_INVALID");
});

test("capabilities today read returns a ranked snapshot", async (t) => {
  const { tools } = await fixture(t);
  const snapshot = JSON.parse(await tools.todayRead());
  assert.equal(Array.isArray(snapshot.priorities), true);
  assert.equal(Array.isArray(snapshot.needsYou), true);
  const bounded = JSON.parse(await tools.todayRead({ capacity: 1 }));
  assert.equal(Array.isArray(bounded.priorities), true);
});
