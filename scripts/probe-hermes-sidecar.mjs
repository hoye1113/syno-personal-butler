import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";

import { HermesCognitiveRuntime } from "../apps/syno/syno/hermes-cognitive-runtime.mjs";
import { HermesSidecarBridge } from "../apps/syno/syno/hermes-sidecar-bridge.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";

const EXPECTED_COMMIT = "0f102fa4dc04b7dfdab048169aaaa640d09d7523";
const value = (name, fallback = "") => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || "" : fallback;
};
const sourceRoot = path.resolve(value("--source", process.env.HERMES_SOURCE_ROOT));
const python = value("--python", process.env.SYNO_HERMES_PYTHON || "python");
const dependencies = value("--deps", process.env.HERMES_PROBE_DEPS || "");
if (!sourceRoot) throw new Error("需要 --source <Hermes 源码根目录>");

const observed = [];
let completionCount = 0;
const server = createServer((request, response) => {
  let body = "";
  request.on("data", (chunk) => { body += chunk; });
  request.on("end", () => {
    const payload = JSON.parse(body || "{}");
    const systemPrompt = (payload.messages || []).find((message) => message.role === "system")?.content || "";
    const systemPromptSafe = request.url !== "/v1/chat/completions" || (systemPrompt.startsWith("You are Syno's constrained cognitive runtime.") && !/Hermes Agent|User home directory|terminal tool/iu.test(systemPrompt));
    observed.push({ method: request.method, url: request.url, model: payload.model, stream: payload.stream ?? "omitted", tools: (payload.tools || []).map((tool) => tool.function?.name), systemPromptSafe });
    if (request.url !== "/v1/chat/completions" || payload.model !== "fixed-model" || payload.stream === true || observed.at(-1).tools.join() !== "knowledge.search") {
      response.writeHead(404);
      return response.end();
    }
    const userText = [...(payload.messages || [])].reverse().find((message) => message.role === "user")?.content || "";
    if (userText.includes("[error-429]")) {
      response.writeHead(429, { "content-type": "application/json" });
      return response.end(JSON.stringify({ error: { message: "rate limited", type: "rate_limit_error", code: "rate_limit" } }));
    }
    if (userText.includes("[invalid-json]")) {
      response.writeHead(200, { "content-type": "application/json" });
      return response.end("not-json");
    }
    if (userText.includes("[hang]")) return;
    completionCount += 1;
    const message = completionCount === 1
      ? { role: "assistant", content: null, tool_calls: [{ id: "call-one", type: "function", function: { name: "knowledge.search", arguments: "{\"query\":\"agent\"}" } }] }
      : { role: "assistant", content: "sidecar complete" };
    const result = { id: `completion-${completionCount}`, object: "chat.completion", created: 1, model: "fixed-model", choices: [{ index: 0, message, finish_reason: completionCount === 1 ? "tool_calls" : "stop" }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
    const encoded = JSON.stringify(result);
    response.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(encoded) });
    response.end(encoded);
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const tools = new ToolRegistry([{
  name: "knowledge.search", description: "search", risk: "read", permission: "syno-read", retry: "safe", version: "1",
  inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string" } }, additionalProperties: false },
  outputSchema: { type: "array", items: { type: "object" } },
  execute: async ({ query }) => [{ path: "vault/probe.md", query }],
}]);
const probeHome = path.join(process.env.TEMP || ".runtime", `syno-hermes-production-probe-${process.pid}`);
const bridge = new HermesSidecarBridge({
  command: python,
  args: [path.resolve(import.meta.dirname, "sidecars", "hermes_runtime.py")],
  cwd: process.env.TEMP || process.cwd(),
  env: {
    HERMES_SOURCE_ROOT: sourceRoot,
    HERMES_EXPECTED_COMMIT: EXPECTED_COMMIT,
    HERMES_HOME: probeHome,
    PYTHONDONTWRITEBYTECODE: "1",
    HERMES_YOLO_MODE: "0",
    ...(dependencies ? { PYTHONPATH: dependencies } : {}),
  },
  tools: tools.list(),
  getProvider: async () => ({ baseUrl: `http://127.0.0.1:${server.address().port}/v1`, apiKey: "fake-sidecar-token", modelId: "fixed-model", contextLength: 128_000 }),
  requestTimeoutMs: 30_000,
});

try {
  const runtime = new HermesCognitiveRuntime({ bridge, tools, fixedModelId: "fixed-model" });
  const capabilities = await runtime.initialize();
  const health = await runtime.health();
  const result = await runtime.run({ text: "Search for agent", conversationId: "probe-conversation" });
  const failures = [];
  for (const [text, expectedRetryable] of [["[error-429]", true], ["[invalid-json]", true]]) {
    try {
      await runtime.run({ text, conversationId: `probe-${failures.length}` });
      failures.push({ text, unexpectedSuccess: true });
    } catch (error) {
      failures.push({ text, code: error.code, retryable: error.retryable === true, expectedRetryable });
    }
  }
  const failuresOk = failures.every((item) => item.code === "PROVIDER_REQUEST_FAILED" && item.retryable === item.expectedRetryable);
  let cancelRunId;
  const canceling = runtime.run({ text: "[hang]", conversationId: "probe-cancel" }, { onStart: (runId) => { cancelRunId = runId; } });
  await new Promise((resolve) => setTimeout(resolve, 500));
  const cancelSent = runtime.cancel(cancelRunId);
  let cancellation;
  try {
    await canceling;
    cancellation = { unexpectedSuccess: true };
  } catch (error) {
    cancellation = { code: error.code, retryable: error.retryable === true };
  }
  const cancellationOk = cancelSent && cancellation.code === "AGENT_CANCELED" && cancellation.retryable === false;
  const requestDumps = (await fs.readdir(probeHome, { recursive: true }).catch(() => [])).filter((name) => /request_dump_/u.test(String(name)));
  const promptsSafe = observed.every((item) => item.systemPromptSafe !== false);
  const providerSurfaceSafe = observed.every((item) => item.method === "POST" && item.url === "/v1/chat/completions");
  const report = { ok: result.text === "sidecar complete" && completionCount === 2 && failuresOk && cancellationOk && promptsSafe && providerSurfaceSafe && requestDumps.length === 0, capabilities, health, result: { text: result.text, model: result.model }, failures, cancellation, promptsSafe, providerSurfaceSafe, requestDumps, providerRequests: observed };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 2;
} finally {
  await bridge.close();
  await new Promise((resolve) => server.close(resolve));
}
