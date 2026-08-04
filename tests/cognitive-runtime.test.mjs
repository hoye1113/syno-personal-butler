import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";

import { AgentHost } from "../apps/syno/syno/agent-host.mjs";
import { NativeCognitiveRuntime, assertCognitiveCapabilities, baseCapabilities } from "../apps/syno/syno/cognitive-runtime.mjs";
import { FakeExecutor } from "../apps/syno/syno/executors.mjs";
import { HermesCognitiveRuntime } from "../apps/syno/syno/hermes-cognitive-runtime.mjs";
import { JobStore } from "../apps/syno/syno/job-store.mjs";
import { PATHS } from "../apps/syno/syno/paths.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";
import { ToolLoopExecutor } from "../apps/syno/syno/tool-loop-executor.mjs";

test("CognitiveRuntime rejects every forbidden control or direct-I/O capability", () => {
  const safe = baseCapabilities({ adapter: "hermes-spike", tools: ["knowledge.search"] });
  assert.equal(assertCognitiveCapabilities(safe, { expectedTools: ["knowledge.search"] }).providerFixed, true);
  for (const key of ["terminal", "fileWrite", "memoryWrite", "skillMutation", "modelSwitch", "modelFallback", "yolo", "dynamicMcp", "cron", "delegate", "browser", "gateway", "sourceWrite"]) {
    assert.throws(() => assertCognitiveCapabilities({ ...safe, [key]: true }), new RegExp(key));
  }
});

test("NativeCognitiveRuntime is the single active adapter and streams lifecycle events", async () => {
  let signal;
  const agent = { async run(request, context) { signal = context.signal; return { text: request.text, conversationId: "conversation-one", turns: 1 }; } };
  const tools = { list() { return [{ name: "knowledge.search" }, { name: "jobs.submit" }]; } };
  const runtime = new NativeCognitiveRuntime({ agent, tools });
  const events = [];
  let started;
  const result = await runtime.run({ text: "hello" }, { onStart: (id) => { started = id; }, onEvent: (event) => events.push(event) });
  assert.equal(result.runId, started);
  assert.equal(result.executor, "native-tool-loop");
  assert.equal(signal.aborted, false);
  assert.deepEqual(events.map((event) => event.type), ["run.started", "run.completed"]);
  assert.deepEqual(runtime.capabilities().tools, ["jobs.submit", "knowledge.search"]);
  assert.equal(runtime.health().activeRuns, 0);
});

test("ToolLoopExecutor delegates only through the CognitiveRuntime seam", async () => {
  const calls = [];
  const runtime = {
    async run(request, context) { calls.push({ request, context }); await context.onStart("runtime-1"); return { runId: "runtime-1", executor: "fake-runtime", text: "done" }; },
    inspect(id) { return { id, status: "completed" }; },
    cancel(id) { return id === "runtime-1"; },
  };
  const executor = new ToolLoopExecutor({ runtime });
  let started;
  const result = await executor.submit({ id: "job-1", request: { text: "go", conversationId: "c1" }, channel: "web", senderId: "owner" }, { workspace: "x", onStart: (id) => { started = id; } });
  assert.equal(result.runId, "runtime-1");
  assert.equal(started, "runtime-1");
  assert.deepEqual({ conversationId: calls[0].context.conversationId, channel: calls[0].context.channel, ownerId: calls[0].context.ownerId }, { conversationId: "c1", channel: "web", ownerId: "owner" });
  assert.equal(executor.cancel("runtime-1"), true);
});

test("Hermes adapter exposes only Syno tools and rejects control commands or model drift", async () => {
  const tools = new ToolRegistry([{ name: "knowledge.search", description: "search", risk: "read", permission: "syno-read", retry: "safe", version: "1", inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string" } }, additionalProperties: false }, outputSchema: { type: "array", items: { type: "object" } }, execute: async ({ query }) => [{ query }] }]);
  const safeReport = baseCapabilities({ adapter: "hermes-sidecar", tools: ["knowledge.search"] });
  let canceled;
  const bridge = {
    async capabilities() { return safeReport; },
    async health() { return { ready: true }; },
    cancel(id) { canceled = id; },
    async run(payload, callbacks) {
      assert.equal(payload.modelId, "fixed-model");
      assert.deepEqual(payload.tools.map((tool) => tool.name), ["knowledge.search"]);
      assert.deepEqual(await callbacks.onToolCall({ name: "knowledge.search", arguments: { query: "agent" } }), [{ query: "agent" }]);
      return { text: "done", model: "fixed-model", conversationId: "conversation-hermes" };
    },
  };
  const runtime = new HermesCognitiveRuntime({ bridge, tools, fixedModelId: "fixed-model" });
  await runtime.initialize();
  assert.equal((await runtime.run({ text: "search" })).text, "done");
  for (const command of ["/model other", "/terminal whoami", "/config set", "/mcp add", "/unknown-control"] ) {
    await assert.rejects(runtime.run({ text: command }), (error) => error.code === "RUNTIME_CONTROL_COMMAND_DENIED");
  }
  runtime.runs.set("running-one", { status: "running" });
  assert.equal(runtime.cancel("running-one"), true);
  assert.equal(canceled, "running-one");

  const drifting = new HermesCognitiveRuntime({ bridge: { ...bridge, async run() { return { text: "bad", model: "other" }; } }, tools, fixedModelId: "fixed-model" });
  await drifting.initialize();
  await assert.rejects(drifting.run({ text: "hello" }), (error) => error.code === "RUNTIME_MODEL_CHANGED");
});

test("Hermes onToolCall redacts a secret-bearing tool result (redactResultObject wiring)", async () => {
  // 锁定 hermes-cognitive-runtime.mjs:87 的 redactResultObject 接线：
  // sidecar 请求工具执行时，含密 execute 结果必须换成 {ok:false,error} stub 返回给外层 adapter——
  // 保对象契约、不 throw、不把凭据递给 sidecar 子进程。
  const tools = new ToolRegistry([{
    name: "evidence.source_read", description: "read", risk: "read", permission: "syno-read", retry: "safe", version: "1",
    inputSchema: { type: "object", additionalProperties: false }, outputSchema: { type: "object" },
    execute: async () => ({ content: "Authorization: Bearer abcdefghijklmnop" }),
  }]);
  const safeReport = baseCapabilities({ adapter: "hermes-sidecar", tools: ["evidence.source_read"] });
  const bridge = {
    async capabilities() { return safeReport; },
    async health() { return { ready: true }; },
    cancel() { return false; },
    async run(_payload, callbacks) {
      const proposal = await callbacks.onToolCall({ name: "evidence.source_read", arguments: {} });
      return { text: "done", model: "fixed-model", conversationId: "conversation-hermes-redact", proposal };
    },
  };
  const runtime = new HermesCognitiveRuntime({ bridge, tools, fixedModelId: "fixed-model" });
  await runtime.initialize();
  const result = await runtime.run({ text: "read" });
  assert.equal(result.proposal.ok, false);
  assert.equal(result.proposal.error.code, "REMOTE_TOOL_RESULT_BLOCKED");
  assert.doesNotMatch(JSON.stringify(result.proposal), /abcdefghijklmnop|Authorization|Bearer/);
});

test("Hermes adapter fails closed when the bridge advertises a forbidden capability", async () => {
  const tools = { list() { return []; } };
  const bridge = { async capabilities() { return { ...baseCapabilities({ adapter: "hermes-sidecar", tools: [] }), terminal: true }; } };
  await assert.rejects(new HermesCognitiveRuntime({ bridge, tools, fixedModelId: "fixed" }).initialize(), /terminal/);
});

test("Hermes can create only an approval Job and cannot turn a direct write into authority", async (t) => {
  const opsRoot = path.join(PATHS.runtimeRoot, "tests", `hermes-approval-${Date.now()}`);
  t.after(() => fs.rm(opsRoot, { recursive: true, force: true }));
  const host = new AgentHost({
    store: new JobStore({ opsRoot }),
    executor: new FakeExecutor(),
    gitGuard: {
      async changedPaths() { return []; },
      async changes() { return []; },
      async commitPaths() { return { committed: false }; },
      async prepareWorktree(id) { return { branch: `syno/job/${id}`, directory: path.join(PATHS.runtimeRoot, "hermes-worktree"), base: "base-1" }; },
      async removeWorktree() {},
    },
  });
  const tools = new ToolRegistry([
    {
      name: "jobs.submit", description: "submit", risk: "low", permission: "syno-ops", retry: "idempotent", version: "1", approvalBoundary: true,
      inputSchema: { type: "object", required: ["text"], properties: { text: { type: "string" } }, additionalProperties: false },
      outputSchema: { type: "object", required: ["id", "status", "requiresApproval"], properties: { id: { type: "string" }, status: { type: "string" }, requiresApproval: { type: "boolean" } } },
      execute: async ({ text }) => {
        const result = await host.receive({ intent: "create_content_idea", text });
        return { id: result.job.id, status: result.job.status, requiresApproval: result.requiresApproval === true };
      },
    },
    {
      name: "knowledge.write", description: "never direct", risk: "low", permission: "syno-write", retry: "none", version: "1",
      inputSchema: { type: "object", properties: {}, additionalProperties: false }, outputSchema: { type: "object" }, execute: async () => ({ written: true }),
    },
  ]);
  const bridge = {
    async capabilities() { return baseCapabilities({ adapter: "hermes-sidecar", tools: tools.list().map((tool) => tool.name) }); },
    async health() { return { ready: true }; }, cancel() { return false; },
    async run(_payload, callbacks) {
      const proposal = await callbacks.onToolCall({ name: "jobs.submit", arguments: { text: "Create evidence-backed article" } });
      let directWriteCode;
      try { await callbacks.onToolCall({ name: "knowledge.write", arguments: {} }); } catch (error) { directWriteCode = error.code; }
      return { text: "queued", model: "fixed-model", proposal, directWriteCode };
    },
  };
  const result = await new HermesCognitiveRuntime({ bridge, tools, fixedModelId: "fixed-model" }).run({ text: "create" });
  // trust-but-clarify：jobs.submit 走 Policy 后写入默认自动执行（approval 恒为 none），不再 awaiting_approval。
  assert.equal(result.proposal.status, "completed");
  assert.equal(result.proposal.requiresApproval, false);
  // 但直写工具（knowledge.write，无 approvalBoundary）仍被工具沙箱拒绝——不可绕过 Job 入口建立权威。
  assert.equal(result.directWriteCode, "TOOL_APPROVAL_REQUIRED");
  assert.equal((await host.list()).length, 1);
});
