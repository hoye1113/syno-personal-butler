import test from "node:test";
import assert from "node:assert/strict";

import { FakeExecutor } from "../apps/syno/syno/executors.mjs";
import { OperationExecutor } from "../apps/syno/syno/operation-executor.mjs";

test("Fake Executor implements submit, inspect and cancel", async () => {
  const fake = new FakeExecutor({ responder: async () => ({ text: "ok", changedPaths: ["ops/a.md"] }) });
  const result = await fake.submit({ id: "job-test" });
  assert.equal(result.executor, "fake");
  assert.equal(fake.inspect(result.runId).status, "completed");
  assert.equal(fake.cancel(result.runId), true);
  assert.equal(fake.inspect(result.runId), null);
});

test("Operation Executor handles only declared deterministic operations", async () => {
  const fallbackCalls = [];
  const fallback = {
    async submit(job) { fallbackCalls.push(job.id); return { runId: `fallback-${job.id}` }; },
    inspect() { return null; },
    cancel() { return false; },
  };
  const executor = new OperationExecutor({
    operations: ["reports.create"],
    fallback,
    execute: async (operation, payload) => ({ operation, payload }),
  });
  const handled = await executor.submit({
    id: "one",
    intent: "create_report",
    decision: { intent: "create_report" },
    request: { kind: "syno-operation", operation: "reports.create", intent: "create_report", payload: { ok: true } },
  });
  assert.equal(handled.executor, "syno-operation");
  assert.deepEqual(handled.operationResult.payload, { ok: true });
  assert.equal((await executor.submit({ id: "two", request: { kind: "syno-operation", operation: "other" } })).runId, "fallback-two");
  assert.equal((await executor.submit({ id: "three", request: { text: "chat" } })).runId, "fallback-three");
  assert.deepEqual(fallbackCalls, ["two", "three"]);
});
