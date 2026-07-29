import assert from "node:assert/strict";
import test from "node:test";

import { assessR6Readiness } from "../scripts/r6-readiness.mjs";

function pending() {
  return { status: "pending_owner", performedBy: "", result: "pending", checks: [{ performedBy: "", result: "pending", evidenceRef: "" }] };
}

test("R6 readiness blocks legacy cleanup until Owner evidence is complete", async () => {
  const report = await assessR6Readiness({ acceptance: pending(), clean: true });
  assert.equal(report.ready, false);
  assert.equal(report.legacyCleanup, "blocked");
  assert.deepEqual(report.blockers, ["OWNER_ACCEPTANCE_PENDING"]);
});

test("R6 readiness requires every check to carry Owner evidence and a clean worktree", async () => {
  const acceptance = { status: "owner_passed", performedBy: "owner", result: "passed", checks: [{ performedBy: "owner", result: "passed", evidenceRef: "ops/acceptance/r6-run/events.jsonl" }] };
  const dirty = await assessR6Readiness({ acceptance, clean: false });
  assert.equal(dirty.ready, false);
  assert.deepEqual(dirty.blockers, ["WORKTREE_NOT_CLEAN"]);
  const ready = await assessR6Readiness({ acceptance, clean: true });
  assert.equal(ready.ready, true);
  assert.equal(ready.legacyCleanup, "authorized_by_gates");
});
