import assert from "node:assert/strict";
import test from "node:test";

import { NativeCognitiveRuntime, assertCognitiveCapabilities, baseCapabilities } from "../apps/syno/syno/cognitive-runtime.mjs";
import { ToolLoopExecutor } from "../apps/syno/syno/tool-loop-executor.mjs";

test("CognitiveRuntime v3 allows sandboxed terminal write but still forbids sourceWrite and dynamic MCP", () => {
  const report = {
    version: 3,
    adapter: "deepseek-harness-sdk",
    agentCount: 1,
    provider: "deepseek",
    models: ["deepseek/deepseek-v4-flash", "deepseek/deepseek-chat"],
    agentSelectableModel: false,
    providerFallback: false,
    dynamicMcp: false,
    sourceWrite: false,
    memoryWrite: false,
    yolo: false,
    skillMutation: false,
    terminal: true,
    directFileAccess: true,
    tools: ["syno_knowledge_search"],
  };
  assert.equal(assertCognitiveCapabilities(report, { expectedTools: ["syno_knowledge_search"] }).adapter, "deepseek-harness-sdk");
  assert.throws(() => assertCognitiveCapabilities({ ...report, dynamicMcp: true }), /dynamicMcp/);
  assert.throws(() => assertCognitiveCapabilities({ ...report, sourceWrite: true }), /sourceWrite/);
  assert.throws(() => assertCognitiveCapabilities({ ...report, models: ["deepseek/deepseek-v4-flash", "opencode/mimo-v2.5-free"] }), /模型链/);
  assert.throws(() => assertCognitiveCapabilities({
    version: 2,
    adapter: "opencode-cli-server",
    agentCount: 1,
    provider: "opencode",
    models: ["deepseek/deepseek-v4-flash"],
    agentSelectableModel: false,
    providerFallback: false,
    dynamicMcp: false,
    sourceWrite: false,
    tools: [],
  }), /v2/);
});

test("CognitiveRuntime rejects every forbidden control or direct-I/O capability", () => {
  const safe = baseCapabilities({ adapter: "native-tool-loop", tools: ["knowledge.search"] });
  assert.equal(assertCognitiveCapabilities(safe, { expectedTools: ["knowledge.search"] }).providerFixed, true);
  for (const key of ["terminal", "fileWrite", "memoryWrite", "skillMutation", "modelSwitch", "modelFallback", "yolo", "dynamicMcp", "cron", "delegate", "browser", "gateway", "sourceWrite"]) {
    assert.throws(() => assertCognitiveCapabilities({ ...safe, [key]: true }), new RegExp(key));
  }
});

test("NativeCognitiveRuntime streams lifecycle events", async () => {
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
