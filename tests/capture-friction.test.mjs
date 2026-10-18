import test from "node:test";
import assert from "node:assert/strict";

import { captureHasBlockingConflict, captureTargetExists, shouldNotifyWorkflowEvent } from "../packages/syno-core/capture-conflict.mjs";

test("only same-source or same-content duplicates block capture", () => {
  assert.equal(captureHasBlockingConflict({ duplicateAssessment: { sameSource: true } }), true);
  assert.equal(captureHasBlockingConflict({ duplicateAssessment: { updateStatus: "same" } }), true);
  assert.equal(captureHasBlockingConflict({ duplicateAssessment: { updateStatus: "updated" } }), true);
  assert.equal(captureHasBlockingConflict({
    risk: "merge",
    unresolved: ["关系候选均为弱关联", "新标签候选：ai"],
    duplicateAssessment: { sameSource: false, updateStatus: "new", matches: ["a", "b", "c"] },
  }), false, "弱关联不再强制主人澄清");
  assert.equal(captureHasBlockingConflict({}), false);
});

test("retryable workflow failures are not announced as failures", () => {
  assert.equal(shouldNotifyWorkflowEvent("workflow.failed", { stage: "failed_retryable" }, { retryable: true }), false);
  assert.equal(shouldNotifyWorkflowEvent("workflow.failed", { stage: "failed_terminal" }, { retryable: false }), true);
  assert.equal(shouldNotifyWorkflowEvent("workflow.reported", { stage: "reported" }), true);
  assert.equal(shouldNotifyWorkflowEvent("workflow.proposed", {}), false);
});

test("an existing suggested target path is a conflict", () => {
  const notes = [{ path: "vault/02-Resources/A/n.md" }];
  assert.equal(captureTargetExists(notes, "vault/02-Resources/A/n.md"), true);
  assert.equal(captureTargetExists(notes, "vault/02-Resources/A/other.md"), false);
  assert.equal(captureTargetExists(notes, ""), false);
});
