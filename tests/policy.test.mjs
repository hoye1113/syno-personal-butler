import test from "node:test";
import assert from "node:assert/strict";

import { evaluate } from "../packages/syno-core/policy.mjs";
import { validateChangedPaths } from "../packages/syno-core/validator.mjs";

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
  // D9（2026-09-01）：code_change / system_control 是结构性禁区——无条件拒绝，
  // 不存在开关；历史上可放权的 context 字段不再有任何作用。
  assert.equal(evaluate({ intent: "code_change" }).allowed, false);
  assert.equal(evaluate({ intent: "code_change" }, { allowSelfModify: true }).allowed, false);
  assert.match(evaluate({ intent: "code_change" }).reason, /不修改项目代码/);
  const systemControl = evaluate({ intent: "system_control" });
  assert.equal(systemControl.profile, "syno-read");
  assert.equal(systemControl.approval, "none");
  assert.equal(systemControl.allowed, false);
  assert.equal(systemControl.needsWorktree, false);
  assert.deepEqual(systemControl.allowedRoots, []);
  assert.match(systemControl.reason, /不做本机生命周期控制/);
  assert.equal(evaluate({ intent: "system_control" }, { allowSystemControl: true }).allowed, false);
});

test("changed path validator enforces Profile roots", () => {
  assert.deepEqual(validateChangedPaths(["ops/content/a.md", "ops/content/a.md"], evaluate({ intent: "create_content_idea" })), ["ops/content/a.md"]);
  assert.throws(() => validateChangedPaths(["vault/a.md"], evaluate({ intent: "create_content_idea" })), /允许范围/);
  assert.throws(() => validateChangedPaths(["ops/a.md"], evaluate({ intent: "search" })), /只读/);
  assert.throws(() => validateChangedPaths(["../secret"], evaluate({ intent: "delete" })), /禁止/);
  // D10：即使 curate profile（含 vault+ops），源码根/仓库根也被结构性拒绝。
  assert.throws(() => validateChangedPaths(["apps/syno/x.mjs"], evaluate({ intent: "curate_note" })), /允许根/);
  assert.throws(() => validateChangedPaths(["AGENTS.md"], evaluate({ intent: "curate_note" })), /允许根/);
});
