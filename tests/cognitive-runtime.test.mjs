import assert from "node:assert/strict";
import test from "node:test";

import { NativeCognitiveRuntime, assertCognitiveCapabilities, baseCapabilities } from "../apps/syno/syno/cognitive-runtime.mjs";
import { HermesCognitiveRuntime } from "../apps/syno/syno/hermes-cognitive-runtime.mjs";
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

test("Hermes adapter fails closed when the bridge advertises a forbidden capability", async () => {
  const tools = { list() { return []; } };
  const bridge = { async capabilities() { return { ...baseCapabilities({ adapter: "hermes-sidecar", tools: [] }), terminal: true }; } };
  await assert.rejects(new HermesCognitiveRuntime({ bridge, tools, fixedModelId: "fixed" }).initialize(), /terminal/);
});
