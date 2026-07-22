import assert from "node:assert/strict";
import test from "node:test";

await import("../apps/syno/public/syno-ui-model.js");

test("UI model owns Today navigation and renders only server-allowed output actions", () => {
  const model = globalThis.SynoUiModel;
  assert.equal(model.todayTarget({ kind: "approval" }), "jobs");
  assert.equal(model.todayTarget({ kind: "review" }), "learn");
  assert.equal(model.todayTarget({ kind: "output" }), "create");
  assert.equal(model.todayTarget(null), "knowledge");
  assert.deepEqual(model.outputActions({ status: "published", allowedActions: [] }), []);
  assert.deepEqual(model.outputActions({ status: "suggested", allowedActions: ["accept", "dismiss"] }).map((item) => item.action), ["accept", "dismiss"]);
  assert.deepEqual(model.outputActions({ status: "practiced", allowedActions: ["practice", "publish", "dismiss"] }).map((item) => [item.action, item.needsOutput === true, item.needsFeedback === true]), [
    ["practice", true, false], ["publish", false, true], ["dismiss", false, false],
  ]);
});

test("UI model maps approval advice to outcome-aware buttons", () => {
  const model = globalThis.SynoUiModel;
  assert.equal(model.intentLabel("curate_note"), "收录");
  assert.equal(model.intentLabel("goals_create"), "目标");
  assert.equal(model.intentLabel("unknown_intent"), "unknown_intent");
  const labels = (btns) => btns.map((b) => [b.action, b.label, b.kind]);
  assert.deepEqual(labels(model.adviceButtons({ phase: "merge" })), [["approve", "批准合并", "accent"], ["reject", "拒绝", "ghost"]]);
  assert.deepEqual(labels(model.adviceButtons({ advice: { detail: { action: "create" } } })), [["approve", "收录", "accent"], ["reject", "拒绝收录", "ghost"]]);
  assert.deepEqual(labels(model.adviceButtons({ advice: { detail: { action: "reject" } } })), [["approve", "丢弃", "accent"], ["reject", "保留", "ghost"]]);
  assert.deepEqual(labels(model.adviceButtons({ advice: { detail: { action: "append-source" } } })), [["approve", "批准合并", "accent"], ["reject", "拒绝", "ghost"]]);
  assert.deepEqual(model.adviceButtons({}), []);
  const vm = model.adviceViewModel({ intent: "curate_note", advice: { detail: { action: "create" }, via: "butler", whatIsIt: "X", recommendationLabel: "建议收录", reason: "Y" } });
  assert.equal(vm.loading, false);
  assert.equal(vm.degraded, false);
  assert.equal(vm.intentLabel, "收录");
  assert.equal(vm.buttons.length, 2);
  const pending = model.adviceViewModel({ intent: "curate_note" });
  assert.equal(pending.loading, true);
  assert.equal(pending.buttons.length, 0);
});
