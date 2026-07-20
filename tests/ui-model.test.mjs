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
});
