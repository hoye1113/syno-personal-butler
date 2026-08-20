import assert from "node:assert/strict";
import test from "node:test";

import { assertCognitiveCapabilities } from "../apps/syno/syno/cognitive-runtime.mjs";
import { HARNESS_ADAPTER } from "../apps/syno/syno/deepseek-harness-cognitive-runtime.mjs";
import { createSynoRuntime, resolveCognitiveRuntimeMode, routeSynoApi } from "../apps/syno/syno/runtime.mjs";

test("SYNO_COGNITIVE_RUNTIME defaults to deepseek-harness and rejects other runtimes", (t) => {
  const saved = process.env.SYNO_COGNITIVE_RUNTIME;
  delete process.env.SYNO_COGNITIVE_RUNTIME;
  t.after(() => {
    if (saved === undefined) delete process.env.SYNO_COGNITIVE_RUNTIME;
    else process.env.SYNO_COGNITIVE_RUNTIME = saved;
  });
  assert.equal(resolveCognitiveRuntimeMode({}), "deepseek-harness");
  assert.equal(resolveCognitiveRuntimeMode({ cognitiveRuntimeMode: "deepseek-harness" }), "deepseek-harness");
  assert.equal(resolveCognitiveRuntimeMode({ cognitiveRuntimeMode: "harness" }), "deepseek-harness");
  assert.equal(resolveCognitiveRuntimeMode({ cognitiveRuntime: {} }), "injected-test");
  process.env.SYNO_COGNITIVE_RUNTIME = "opencode";
  assert.throws(() => resolveCognitiveRuntimeMode({}), /未知/);
  assert.throws(() => resolveCognitiveRuntimeMode({ cognitiveRuntimeMode: "claude" }), /未知/);
});

test("createSynoRuntime uses DeepSeek Harness as the only cognitive adapter", (t) => {
  const saved = process.env.SYNO_COGNITIVE_RUNTIME;
  delete process.env.SYNO_COGNITIVE_RUNTIME;
  t.after(() => {
    if (saved === undefined) delete process.env.SYNO_COGNITIVE_RUNTIME;
    else process.env.SYNO_COGNITIVE_RUNTIME = saved;
  });
  const runtime = createSynoRuntime({});
  assert.equal(runtime.runtimeMode, "deepseek-harness");
  assert.equal(runtime.cognitiveRuntime, runtime.harnessCognitiveRuntime);
  assert.equal(runtime.harnessCognitiveRuntime.capabilities().adapter, HARNESS_ADAPTER);
  assert.equal(runtime.openCodeCognitiveRuntime, undefined);
  assert.equal(Object.hasOwn(runtime.lifecycle().components, "openCode"), false);
});

test("createSynoRuntime selects Harness when SYNO_COGNITIVE_RUNTIME is deepseek-harness", () => {
  const runtime = createSynoRuntime({ cognitiveRuntimeMode: "deepseek-harness" });
  assert.equal(runtime.runtimeMode, "deepseek-harness");
  assert.equal(runtime.cognitiveRuntime, runtime.harnessCognitiveRuntime);
  const report = runtime.cognitiveRuntime.capabilities();
  assert.equal(assertCognitiveCapabilities(report).adapter, HARNESS_ADAPTER);
  assert.equal(report.terminal, true);
  assert.equal(report.sourceWrite, false);
});

test("Harness status and restart endpoints are the only cognitive APIs", async () => {
  const runtime = {
    runtimeMode: "deepseek-harness",
    harnessSupervisor: { async health() { return { healthy: true, state: "running" }; } },
    harnessCognitiveRuntime: {
      lastAttempts: [],
      capabilities() { return { version: 3, adapter: HARNESS_ADAPTER }; },
    },
    async restartHarness() { return { state: "running" }; },
  };
  const harness = await routeSynoApi(runtime, { method: "GET" }, new URL("http://localhost/api/syno/harness"), async () => ({}));
  assert.equal(harness.capabilities.adapter, HARNESS_ADAPTER);
  const restarted = await routeSynoApi(runtime, { method: "POST" }, new URL("http://localhost/api/syno/harness/restart"), async () => ({}));
  assert.equal(restarted.state, "running");
  await assert.rejects(
    routeSynoApi(runtime, { method: "GET" }, new URL("http://localhost/api/syno/opencode"), async () => ({})),
    /未知 Syno API/,
  );
});
