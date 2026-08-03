import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { HermesSidecarBridge } from "../apps/syno/syno/hermes-sidecar-bridge.mjs";

const fixture = path.resolve(import.meta.dirname, "fixtures", "fake-hermes-sidecar.mjs");
const tools = [{ name: "knowledge.search", description: "search", risk: "read", version: "1", inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string" } }, additionalProperties: false } }];
const provider = () => ({ baseUrl: "http://127.0.0.1:1/v1", apiKey: "super-secret-token", modelId: "fixed-model", contextLength: 8_000 });

function bridge(mode = "normal", options = {}) {
  return new HermesSidecarBridge({ command: process.execPath, args: [fixture, mode], tools, getProvider: provider, startupTimeoutMs: 2_000, requestTimeoutMs: 2_000, ...options });
}

test("HermesSidecarBridge owns capability, health and tool proxy protocol", async (t) => {
  process.env.SYNO_SECRET_SENTINEL = "must-not-reach-sidecar";
  t.after(() => { delete process.env.SYNO_SECRET_SENTINEL; });
  const target = bridge();
  t.after(() => target.close());
  const capabilities = await target.capabilities();
  assert.deepEqual(capabilities.tools, ["knowledge.search"]);
  const health = await target.health();
  assert.equal(health.ready, true);
  assert.equal(health.leakedParentSecret, false);
  const events = [];
  const result = await target.run({ runId: "run-one", message: "search", modelId: "fixed-model", conversationId: "conversation-one", tools }, {
    onEvent: (event) => events.push(event.type),
    onToolCall: ({ name, arguments: input }) => ({ name, input }),
  });
  assert.equal(result.model, "fixed-model");
  assert.match(result.text, /knowledge\.search/);
  assert.deepEqual(events, ["provider.started"]);
});

test("HermesSidecarBridge rejects arbitrary environment injection", () => {
  assert.throws(() => bridge("normal", { env: { RANDOM_TOKEN: "secret" } }), /环境变量不在白名单/);
});

test("HermesSidecarBridge rejects model drift before sending credentials", async (t) => {
  const target = bridge();
  t.after(() => target.close());
  await assert.rejects(target.run({ runId: "run-drift", modelId: "other", tools }, {}), (error) => error.code === "RUNTIME_MODEL_CHANGED");
});

test("HermesSidecarBridge fails closed on invalid JSON and restarts after process failure", async (t) => {
  const invalid = bridge("invalid-json");
  t.after(() => invalid.close());
  await assert.rejects(invalid.capabilities(), (error) => error.code === "HERMES_PROTOCOL_INVALID_JSON");

  const crashed = bridge("crash");
  t.after(() => crashed.close());
  await assert.rejects(crashed.run({ runId: "run-crash", message: "x", modelId: "fixed-model", tools }, {}), (error) => error.code === "HERMES_PROCESS_EXITED");
  assert.equal((await crashed.health()).ready, true);
});

test("HermesSidecarBridge sends cancellation without changing runtime or model", async (t) => {
  const target = bridge();
  t.after(() => target.close());
  const running = target.run({ runId: "run-cancel", message: "x", modelId: "fixed-model", tools }, { onToolCall: () => new Promise(() => {}) });
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(target.cancel("run-cancel"), true);
  await assert.rejects(running, (error) => error.code === "AGENT_CANCELED");
});

test("HermesSidecarBridge kills a sidecar that invents a forbidden tool", async (t) => {
  const target = bridge("malicious-tool");
  t.after(() => target.close());
  let proxyCalls = 0;
  await assert.rejects(target.run({ runId: "run-malicious", message: "x", modelId: "fixed-model", tools }, { onToolCall: () => { proxyCalls += 1; } }), (error) => error.code === "HERMES_TOOL_NOT_ALLOWED");
  assert.equal(proxyCalls, 0);
});

test("HermesSidecarBridge kills timed-out work and can start a clean process later", async (t) => {
  const target = bridge("hang", { requestTimeoutMs: 50 });
  t.after(() => target.close());
  await assert.rejects(target.run({ runId: "run-timeout", message: "x", modelId: "fixed-model", tools }, {}), (error) => error.code === "HERMES_REQUEST_TIMEOUT");
  assert.equal((await target.health()).ready, true);
});

test("cancel is surgical: cancelling one run does not reject a concurrent run (R4)", async (t) => {
  const target = bridge();
  t.after(() => target.close());
  // run A hangs on its tool call（永不 resolve，保持 pending）；run B 正常完成。
  const runA = target.run({ runId: "run-a", message: "x", modelId: "fixed-model", tools }, {
    onToolCall: () => new Promise(() => {}),
  });
  // 先挂上 runA 的拒绝处理器，避免 cancel 后、await 前出现未处理拒绝。
  const runARejected = assert.rejects(runA, (error) => error.code === "AGENT_CANCELED");
  // run B 的工具调用延迟 resolve，确保取消 run A 时 run B 仍在飞行中。
  const runB = target.run({ runId: "run-b", message: "y", modelId: "fixed-model", tools }, {
    onEvent: () => {},
    onToolCall: ({ name, arguments: input }) => new Promise((resolve) => setTimeout(() => resolve({ name, input }), 100)),
  });
  await new Promise((resolve) => setTimeout(resolve, 60)); // 让两条 run 的 tool_call 都已发出
  assert.equal(target.cancel("run-a"), true);             // 外科手术式：只取消 run A
  const bResult = await runB;                              // run B 仍能完成 → 子进程未被连带杀死
  assert.equal(bResult.model, "fixed-model");
  await runARejected;
});
