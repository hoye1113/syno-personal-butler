import test from "node:test";
import assert from "node:assert/strict";

import { ExecutorRouter, FakeExecutor, extractOpenCodeText } from "../apps/syno/syno/executors.mjs";

test("Fake Executor implements submit, inspect and cancel", async () => {
  const fake = new FakeExecutor({ responder: async () => ({ text: "ok", changedPaths: ["ops/a.md"] }) });
  const result = await fake.submit({ id: "job-test" });
  assert.equal(result.executor, "fake");
  assert.equal(fake.inspect(result.runId).status, "completed");
  assert.equal(fake.cancel(result.runId), true);
  assert.equal(fake.inspect(result.runId), null);
});

test("Executor Router only escalates after all OpenCode models fail", async () => {
  const calls = [];
  const opencode = {
    async submit() { calls.push("opencode"); throw Object.assign(new Error("all failed"), { failureCode: "all_models_failed", failures: ["x"] }); },
    inspect() { return null; }, cancel() { return false; },
  };
  const claude = {
    async submit() { calls.push("claude"); return { runId: "claude-1", executor: "claude", text: "done" }; },
    inspect() { return null; }, cancel() { return false; },
  };
  const router = new ExecutorRouter({ opencode, claude });
  const result = await router.submit({ decision: { executor: "opencode" } });
  assert.deepEqual(calls, ["opencode", "claude"]);
  assert.equal(result.escalatedFrom, "opencode");
});

test("Executor Router does not hide ordinary process failures", async () => {
  const failure = Object.assign(new Error("bad request"), { failureCode: "process_error" });
  const router = new ExecutorRouter({
    opencode: { submit: async () => { throw failure; }, inspect: () => null, cancel: () => false },
    claude: { submit: async () => { throw new Error("must not run"); }, inspect: () => null, cancel: () => false },
  });
  await assert.rejects(router.submit({ decision: { executor: "opencode" } }), /bad request/);
});

test("OpenCode JSON event output extracts the final text", () => {
  const raw = [JSON.stringify({ part: { text: "first" } }), JSON.stringify({ text: "final" })].join("\n");
  assert.equal(extractOpenCodeText(raw), "final");
});
