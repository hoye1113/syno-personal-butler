import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  ExecutorRouter,
  FakeExecutor,
  claudeProfileTools,
  extractOpenCodeText,
  openCodeProfileConfig,
} from "../apps/syno/syno/executors.mjs";
import { OperationExecutor } from "../apps/syno/syno/operation-executor.mjs";
import { PATHS } from "../apps/syno/syno/paths.mjs";

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

test("Executor profiles are enforced as deny-by-default capability maps", () => {
  const opsJob = { profile: "syno-ops", decision: { allowedRoots: ["ops"] } };
  const openCode = openCodeProfileConfig(opsJob);
  assert.equal(openCode.permission["*"], "deny");
  assert.equal(openCode.permission.read["vault/**"], "allow");
  assert.equal(openCode.permission.edit["ops/**"], "allow");
  assert.equal(openCode.permission.edit["vault/**"], undefined);
  assert.equal(openCode.permission.bash, "deny");
  assert.equal(openCode.permission.external_directory, "deny");

  const claude = claudeProfileTools(opsJob);
  assert.ok(claude.allowed.includes("Read(vault/**)"));
  assert.ok(claude.allowed.includes("Edit(ops/**)"));
  assert.ok(claude.allowed.includes("Write(ops/**)"));
  assert.ok(claude.disallowed.includes("Bash"));
  assert.ok(!claude.allowed.some((tool) => tool.includes("vault/**") && /Edit|Write/.test(tool)));
});

test("only quarantined intake attachments become extra read capabilities", () => {
  const outside = { profile: "syno-curate", decision: { allowedRoots: ["vault", "ops"] }, request: { attachment: "C:\\Windows\\System32\\config\\SAM" } };
  assert.equal(openCodeProfileConfig(outside).permission.read["C:\\Windows\\System32\\config\\SAM"], undefined);
  const attachment = path.join(PATHS.runtimeRoot, "uploads", "paper.pdf");
  const inside = { ...outside, request: { attachment } };
  assert.equal(openCodeProfileConfig(inside).permission.read[attachment], "allow");
});

test("Operation Executor handles only declared deterministic operations", async () => {
  const fallbackCalls = [];
  const fallback = {
    async submit(job) { fallbackCalls.push(job.id); return { runId: `fallback-${job.id}` }; },
    inspect() { return null; },
    cancel() { return false; },
  };
  const executor = new OperationExecutor({
    operations: ["known"],
    fallback,
    execute: async (operation, payload) => ({ operation, payload }),
  });
  const handled = await executor.submit({ id: "one", request: { kind: "syno-operation", operation: "known", payload: { ok: true } } });
  assert.equal(handled.executor, "syno-operation");
  assert.deepEqual(handled.operationResult.payload, { ok: true });
  assert.equal((await executor.submit({ id: "two", request: { kind: "syno-operation", operation: "other" } })).runId, "fallback-two");
  assert.equal((await executor.submit({ id: "three", request: { text: "chat" } })).runId, "fallback-three");
  assert.deepEqual(fallbackCalls, ["two", "three"]);
});
