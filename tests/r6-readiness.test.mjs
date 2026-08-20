import assert from "node:assert/strict";
import test from "node:test";

import { assessR6Readiness } from "../scripts/r6-readiness.mjs";

function pending() {
  return { status: "pending_owner", performedBy: "", result: "pending", checks: [{ performedBy: "", result: "pending", evidenceRef: "" }] };
}

function evidence() {
  return {
    automated: {
      nodeTests: { passed: 520, failed: 0 },
      repositoryVerifyFiles: 1463,
      activeDocumentationFiles: 7,
      vaultPython311Unittest: { passed: 57, failed: 0 },
      gitDiffCheck: "passed",
    },
    freshClone: {
      status: "verified",
      nodeTests: { passed: 520, failed: 0 },
      repositoryVerifyFiles: 1461,
      activeDocumentationFiles: 7,
      vaultPython311Unittest: { passed: 57, failed: 0 },
      worktree: "clean",
    },
    runtimeReadOnly: {
      harness: { ready: true, healthy: true },
      weixin: { ok: true },
      feishu: { ok: true },
      windowsTask: { installed: true, running: true },
    },
  };
}

test("R6 readiness blocks legacy cleanup until Owner evidence is complete", async () => {
  const report = await assessR6Readiness({ acceptance: pending(), evidence: evidence(), clean: true });
  assert.equal(report.ready, false);
  assert.equal(report.legacyCleanup, "blocked");
  assert.deepEqual(report.blockers, ["OWNER_ACCEPTANCE_PENDING"]);
});

test("R6 readiness requires every check to carry Owner evidence and a clean worktree", async () => {
  const acceptance = { status: "owner_passed", performedBy: "owner", result: "passed", checks: [{ performedBy: "owner", result: "passed", evidenceRef: "ops/acceptance/r6-run/events.jsonl" }] };
  const dirty = await assessR6Readiness({ acceptance, evidence: evidence(), clean: false });
  assert.equal(dirty.ready, false);
  assert.deepEqual(dirty.blockers, ["WORKTREE_NOT_CLEAN"]);
  const ready = await assessR6Readiness({ acceptance, evidence: evidence(), clean: true });
  assert.equal(ready.ready, true);
  assert.equal(ready.legacyCleanup, "authorized_by_gates");
});

test("R6 readiness cannot be released from Owner JSON when automated or runtime evidence is stale", async () => {
  const acceptance = { status: "owner_passed", performedBy: "owner", result: "passed", checks: [{ performedBy: "owner", result: "passed", evidenceRef: "ops/acceptance/r6.json" }] };
  const stale = evidence();
  stale.freshClone.status = "not_rerun_after_code_commit";
  stale.runtimeReadOnly.windowsTask.running = false;
  const report = await assessR6Readiness({ acceptance, evidence: stale, clean: true });
  assert.equal(report.ready, false);
  assert.deepEqual(report.blockers, ["FRESH_CLONE_EVIDENCE_PENDING", "RUNTIME_PROBE_PENDING"]);
});
