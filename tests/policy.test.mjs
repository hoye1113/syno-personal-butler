import test from "node:test";
import assert from "node:assert/strict";

import { evaluate } from "../apps/syno/syno/policy.mjs";
import { validateChangedPaths } from "../apps/syno/syno/validator.mjs";

test("Policy routes read, write and high-risk intents deterministically", () => {
  assert.deepEqual(evaluate({ intent: "search" }), {
    intent: "search", profile: "syno-read", approval: "none", risk: "read", executor: "cognitive-runtime",
    allowedRoots: [], needsWorktree: false, validators: ["changed-paths"],
    allowed: true, reason: "只读请求可直接执行",
  });
  // trust-but-clarify：所有写入恒为 approval:none（自动执行），不再有 single/double。
  const idea = evaluate({ intent: "create_content_idea" });
  assert.equal(idea.profile, "syno-ops");
  assert.equal(idea.approval, "none");
  assert.equal(idea.allowed, true);
  assert.equal(idea.executor, "cognitive-runtime");
  assert.equal(idea.needsWorktree, true);
  const deletion = evaluate({ intent: "delete" });
  assert.equal(deletion.approval, "none");
  assert.equal(deletion.allowed, true);
  assert.equal(deletion.executor, "cognitive-runtime");
  assert.equal(deletion.needsWorktree, true);
  assert.equal(evaluate({ intent: "create_report" }, { trustedAutomation: true }).approval, "none");
  // code_change 受开关控制，默认关 → 拒绝；翻开 allowSelfModify → 允许。
  assert.equal(evaluate({ intent: "code_change" }).allowed, false);
  assert.equal(evaluate({ intent: "code_change" }, { allowSelfModify: true }).allowed, true);
  // system_control 受开关控制，默认关 → 拒绝；翻开 allowSystemControl → 允许。
  const systemControl = evaluate({ intent: "system_control" });
  assert.equal(systemControl.profile, "syno-read");
  assert.equal(systemControl.approval, "none");
  assert.equal(systemControl.risk, "low");
  assert.equal(systemControl.allowed, false);
  assert.equal(systemControl.needsWorktree, false);
  assert.deepEqual(systemControl.allowedRoots, []);
  assert.match(systemControl.reason, /系统控制开关默认关闭/);
  assert.equal(evaluate({ intent: "system_control" }, { allowSystemControl: true }).allowed, true);
});

test("changed path validator enforces Profile roots", () => {
  assert.deepEqual(validateChangedPaths(["ops/content/a.md", "ops/content/a.md"], evaluate({ intent: "create_content_idea" })), ["ops/content/a.md"]);
  assert.throws(() => validateChangedPaths(["vault/a.md"], evaluate({ intent: "create_content_idea" })), /允许范围/);
  assert.throws(() => validateChangedPaths(["ops/a.md"], evaluate({ intent: "search" })), /只读/);
  assert.throws(() => validateChangedPaths(["../secret"], evaluate({ intent: "delete" })), /禁止/);
});
