import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_MODELS } from "../apps/syno/syno/executors.mjs";
import { evaluate } from "../apps/syno/syno/policy.mjs";
import { validateChangedPaths } from "../apps/syno/syno/validator.mjs";

test("Policy routes read, write and high-risk intents deterministically", () => {
  assert.deepEqual(DEFAULT_MODELS, [
    "opencode/mimo-v2.5-free",
    "opencode/hy3-free",
    "opencode/deepseek-v4-flash-free",
  ]);
  assert.deepEqual(evaluate({ intent: "search" }), {
    intent: "search", profile: "syno-read", approval: "none", risk: "read", executor: "opencode",
    allowedRoots: [], needsWorktree: false, autoCommit: false, validators: ["changed-paths"],
    allowed: true, reason: "只读请求可直接执行",
  });
  const idea = evaluate({ intent: "create_content_idea" });
  assert.equal(idea.profile, "syno-ops");
  assert.equal(idea.approval, "single");
  assert.equal(idea.executor, "opencode");
  const deletion = evaluate({ intent: "delete" });
  assert.equal(deletion.approval, "double");
  assert.equal(deletion.executor, "claude");
  assert.equal(deletion.needsWorktree, true);
  assert.equal(evaluate({ intent: "create_report" }, { trustedAutomation: true }).approval, "none");
  assert.equal(evaluate({ intent: "code_change" }).allowed, false);
  assert.equal(evaluate({ intent: "code_change" }, { developmentMode: true }).allowed, true);
});

test("changed path validator enforces Profile roots", () => {
  assert.deepEqual(validateChangedPaths(["ops/content/a.md", "ops/content/a.md"], evaluate({ intent: "create_content_idea" })), ["ops/content/a.md"]);
  assert.throws(() => validateChangedPaths(["vault/a.md"], evaluate({ intent: "create_content_idea" })), /允许范围/);
  assert.throws(() => validateChangedPaths(["ops/a.md"], evaluate({ intent: "search" })), /只读/);
  assert.throws(() => validateChangedPaths(["../secret"], evaluate({ intent: "delete" })), /禁止/);
});
