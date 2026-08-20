import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { assertCognitiveCapabilities } from "../apps/syno/syno/cognitive-runtime.mjs";
import {
  DeepSeekHarnessCognitiveRuntime,
  DeepSeekHarnessSessionBindingStore,
  HARNESS_ADAPTER,
  HARNESS_MODEL_CHAIN,
  parseHarnessModel,
  profileFor,
  retryableFailure,
} from "../apps/syno/syno/deepseek-harness-cognitive-runtime.mjs";

async function temporaryFile(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-harness-binding-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return path.join(root, "bindings.json");
}

function fakeSupervisor({ replies = ["ok"], failCodes = [] } = {}) {
  let index = 0;
  const stops = [];
  return {
    stops,
    async health() { return { healthy: true }; },
    async ensure(profile, route) {
      return {
        initialized: true,
        profile,
        route,
        async runTurn(sessionId, blocks) {
          const code = failCodes[index];
          const text = replies[Math.min(index, replies.length - 1)];
          index += 1;
          if (code) throw Object.assign(new Error(code), { code, retryable: true });
          return { sessionId, finalResponse: text, events: [], notifications: [], prompt: blocks };
        },
      };
    },
    async stop(profile) {
      stops.push(profile);
      return { state: "stopped" };
    },
  };
}

function bridgeTools() {
  const calls = [];
  return {
    calls,
    list: () => [{ name: "knowledge.search" }, { name: "jobs.submit" }],
    effectVersion: () => 0,
    bindContext: (context) => {
      calls.push({ type: "bind", allowedTools: [...context.allowedTools] });
      return () => { calls.push({ type: "release" }); };
    },
  };
}

test("parseHarnessModel maps deepseek/* onto the official Harness route", () => {
  assert.deepEqual(parseHarnessModel("deepseek/deepseek-v4-flash"), {
    provider: "deepseek-official",
    model: "deepseek-v4-flash",
    qualified: "deepseek/deepseek-v4-flash",
  });
  assert.throws(() => parseHarnessModel("opencode/mimo-v2.5-free"), /只允许 DeepSeek/);
});

test("DeepSeekHarnessCognitiveRuntime declares locked v3 capabilities", () => {
  const runtime = new DeepSeekHarnessCognitiveRuntime({
    supervisor: fakeSupervisor(),
    bindings: {},
    tools: bridgeTools(),
  });
  const report = runtime.capabilities();
  assert.equal(report.version, 3);
  assert.equal(report.adapter, HARNESS_ADAPTER);
  assert.deepEqual(report.models, [...HARNESS_MODEL_CHAIN]);
  assert.equal(report.terminal, true);
  assert.equal(report.directFileAccess, true);
  assert.equal(report.sourceWrite, false);
  assert.equal(report.dynamicMcp, false);
  assert.equal(report.agentSelectableModel, false);
  assert.equal(assertCognitiveCapabilities(report).version, 3);
  assert.throws(() => assertCognitiveCapabilities({ ...report, sourceWrite: true }), /sourceWrite/);
  assert.throws(() => assertCognitiveCapabilities({ ...report, adapter: "opencode-cli-server" }), /v3/);
});

test("v3 still rejects OpenCode-style free-tier models", () => {
  const report = {
    version: 3,
    adapter: HARNESS_ADAPTER,
    agentCount: 1,
    provider: "deepseek",
    models: ["deepseek/deepseek-v4-flash", "opencode/mimo-v2.5-free"],
    agentSelectableModel: false,
    providerFallback: false,
    dynamicMcp: false,
    sourceWrite: false,
    memoryWrite: false,
    yolo: false,
    skillMutation: false,
    tools: [],
  };
  assert.throws(() => assertCognitiveCapabilities(report), /模型链/);
});

test("capture runs use the capture profile so ingest analysis cannot bash", () => {
  assert.equal(profileFor({ ephemeralSession: true }), "capture");
  assert.equal(profileFor({ channel: "capture" }), "capture");
  assert.equal(profileFor({ threadKey: "capture:artifact" }), "capture");
  assert.equal(profileFor({ threadKey: "main" }), "chat");
});

test("run binds and releases the Tool Bridge around every model attempt", async (t) => {
  const file = await temporaryFile(t);
  const tools = bridgeTools();
  const supervisor = fakeSupervisor({ replies: ["来自 vault"] });
  const runtime = new DeepSeekHarnessCognitiveRuntime({
    supervisor,
    bindings: new DeepSeekHarnessSessionBindingStore({ file }),
    tools,
  });
  const result = await runtime.run({ text: "搜一下 agent" }, { ownerKey: "owner", threadKey: "main" });
  assert.equal(result.executor, HARNESS_ADAPTER);
  assert.equal(result.text, "来自 vault");
  assert.deepEqual(tools.calls.map((item) => item.type), ["bind", "release"]);
  assert.ok(tools.calls[0].allowedTools.includes("syno_knowledge_search"));
});

test("retryable failure shuts down the sidecar then falls back to deepseek-chat", async (t) => {
  const file = await temporaryFile(t);
  const supervisor = fakeSupervisor({
    failCodes: ["HARNESS_RPC_ERROR"],
    replies: ["unused", "fallback-ok"],
  });
  const runtime = new DeepSeekHarnessCognitiveRuntime({
    supervisor,
    bindings: new DeepSeekHarnessSessionBindingStore({ file }),
    tools: bridgeTools(),
  });
  const result = await runtime.run({ text: "hello" }, { ownerKey: "owner" });
  assert.equal(result.text, "fallback-ok");
  assert.deepEqual(result.attempts.map((item) => item.status), ["failed", "completed"]);
  assert.equal(supervisor.stops.includes("chat"), true);
  assert.equal(retryableFailure({ code: "HARNESS_EMPTY_RESPONSE" }), true);
});

test("ephemeral capture sessions do not persist bindings and still bind the Tool Bridge", async (t) => {
  const file = await temporaryFile(t);
  const seen = [];
  const tools = bridgeTools();
  const supervisor = {
    async health() { return { healthy: true }; },
    async ensure(profile) {
      seen.push(profile);
      return {
        initialized: true,
        async runTurn() { return { finalResponse: "{\"ok\":true}", events: [], notifications: [] }; },
      };
    },
    async stop() { return { state: "stopped" }; },
  };
  const bindings = new DeepSeekHarnessSessionBindingStore({ file });
  const runtime = new DeepSeekHarnessCognitiveRuntime({ supervisor, bindings, tools });
  await runtime.run({ text: "analyze" }, {
    ownerKey: "owner",
    threadKey: "capture:a1",
    channel: "capture",
    allowedTools: [],
    ephemeralSession: true,
  });
  assert.deepEqual(seen, ["capture"]);
  assert.equal((await bindings.list()).length, 0);
  assert.deepEqual(tools.calls.map((item) => item.type), ["bind", "release"]);
  assert.deepEqual(tools.calls[0].allowedTools, []);
});

test("session bindings serialize acquire and replace", async (t) => {
  const file = await temporaryFile(t);
  const store = new DeepSeekHarnessSessionBindingStore({ file });
  const first = await store.bind({ ownerKey: "owner", threadKey: "main", harnessSessionId: "sess-1" });
  assert.equal(first.harnessSessionId, "sess-1");
  const lease = await store.acquire("owner", "main");
  assert.equal(lease.binding.harnessSessionId, "sess-1");
  assert.equal(await store.acquire("owner", "main"), null);
  lease.release();
  const replacement = await store.replace({ ownerKey: "owner", threadKey: "main", harnessSessionId: "sess-2" });
  assert.equal(replacement.harnessSessionId, "sess-2");
  const listed = await store.list();
  assert.equal(listed.find((item) => item.harnessSessionId === "sess-1").lifecycle, "quarantined");
  assert.equal(listed.find((item) => item.harnessSessionId === "sess-2").lifecycle, "available");
});

test("cancel shuts down the profile sidecar", async (t) => {
  const file = await temporaryFile(t);
  const stops = [];
  const runtime = new DeepSeekHarnessCognitiveRuntime({
    supervisor: {
      async health() { return { healthy: true }; },
      async ensure() { return { async runTurn() { return { finalResponse: "ok", events: [], notifications: [] }; } }; },
      async stop(profile) { stops.push(profile); return { state: "stopped" }; },
    },
    bindings: new DeepSeekHarnessSessionBindingStore({ file }),
    tools: bridgeTools(),
  });
  runtime.runs.set("run-1", {
    status: "running",
    controller: new AbortController(),
    profile: "chat",
  });
  assert.equal(runtime.cancel("run-1"), true);
  await Promise.resolve();
  assert.deepEqual(stops, ["chat"]);
});
