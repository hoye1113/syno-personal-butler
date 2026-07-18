import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { NativeCognitiveRuntime } from "../apps/syno/syno/cognitive-runtime.mjs";
import { ConversationStore } from "../apps/syno/syno/conversation-store.mjs";
import { ProviderClient } from "../apps/syno/syno/provider-client.mjs";
import { ProviderCredentialStore } from "../apps/syno/syno/provider-credential-store.mjs";
import { ToolLoopAgent } from "../apps/syno/syno/tool-loop-agent.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";

const EXPECTED_BASE_URL = "https://server.flowyaipc.cn/claw/v1";
const PROBE_PROMPT = "这是 Provider 验收。必须先调用 knowledge.search，query 必须是 runtime-probe；拿到结果后只回复 done。";

function valueOf(argv, name, fallback = "") {
  const index = argv.indexOf(name);
  return index >= 0 ? String(argv[index + 1] || "") : fallback;
}

function parseOptions(argv) {
  for (const forbidden of ["--token", "--api-key", "--secret"]) {
    if (argv.includes(forbidden)) {
      const error = new Error("真实探针禁止通过命令行传递凭据");
      error.code = "LIVE_PROBE_SECRET_ARGUMENT_DENIED";
      throw error;
    }
  }
  if (!argv.includes("--confirm-live")) {
    const error = new Error("真实探针必须显式传入 --confirm-live");
    error.code = "LIVE_PROBE_CONFIRMATION_REQUIRED";
    throw error;
  }
  const trials = Number(valueOf(argv, "--trials", "5"));
  if (!Number.isInteger(trials) || trials < 1 || trials > 20) {
    const error = new Error("trials 必须为 1–20 的整数");
    error.code = "LIVE_PROBE_TRIALS_INVALID";
    throw error;
  }
  return { trials };
}

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

function summarizeTrials(trials) {
  const successes = trials.filter((trial) => trial.success).length;
  const latencies = trials.map((trial) => trial.latencyMs);
  return {
    attempts: trials.length,
    successes,
    successRate: trials.length ? successes / trials.length : 0,
    latencyMs: { p50: percentile(latencies, 0.5), p95: percentile(latencies, 0.95) },
    trials,
  };
}

function createProbeTools(counter) {
  return new ToolRegistry([{
    name: "knowledge.search",
    description: "Search one synthetic Provider-probe record; no real knowledge is exposed",
    risk: "read", permission: "syno-read", retry: "safe", version: "1",
    inputSchema: {
      type: "object", required: ["query"],
      properties: { query: { type: "string", enum: ["runtime-probe"] } }, additionalProperties: false,
    },
    outputSchema: {
      type: "array", items: { type: "object", required: ["id", "status"], properties: { id: { type: "string" }, status: { type: "string" } } },
    },
    execute: async () => {
      counter.count += 1;
      return [{ id: "synthetic-runtime-probe", status: "verified" }];
    },
  }]);
}

async function captureProviderGate(client, expectedCode, messages) {
  try {
    await client.complete(messages);
    return { passed: false, errorCode: "EXPECTED_FAILURE_MISSING", retryable: false };
  } catch (error) {
    return { passed: error.code === expectedCode, errorCode: error.code || "PROVIDER_GATE_FAILED", retryable: error.retryable === true };
  }
}

async function runLocalFaultGates(credentials) {
  const credentialAdapter = { load: async () => credentials };
  let contextNetworkCalls = 0;
  const contextCharacters = Math.ceil(Math.max(4_096, credentials.contextLength) * 3.3);
  const context = await captureProviderGate(new ProviderClient({
    credentials: credentialAdapter,
    fetchImpl: async () => { contextNetworkCalls += 1; throw new Error("context gate reached network"); },
  }), "PROVIDER_CONTEXT_LIMIT", [{ role: "user", content: "x".repeat(contextCharacters) }]);
  context.networkCalls = contextNetworkCalls;
  context.passed = context.passed && contextNetworkCalls === 0 && context.retryable === false;

  const timeout = await captureProviderGate(new ProviderClient({
    credentials: credentialAdapter,
    timeoutMs: 10,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(options.signal.reason || new Error("aborted")), { once: true });
    }),
  }), "PROVIDER_TIMEOUT", [{ role: "user", content: "timeout-probe" }]);
  timeout.passed = timeout.passed && timeout.retryable === true;

  const offline = await captureProviderGate(new ProviderClient({
    credentials: credentialAdapter,
    fetchImpl: async () => { throw new Error("synthetic offline"); },
  }), "PROVIDER_UNAVAILABLE", [{ role: "user", content: "offline-probe" }]);
  offline.passed = offline.passed && offline.retryable === true;

  return { allPassed: context.passed && timeout.passed && offline.passed, context, timeout, offline };
}

async function runTrials(runtime, counter, count, fixedModelId) {
  const trials = [];
  for (let index = 0; index < count; index += 1) {
    const before = counter.count;
    const startedAt = performance.now();
    try {
      const result = await runtime.run({ text: PROBE_PROMPT }, { conversationId: `real-provider-probe-${index}` });
      const toolCalls = counter.count - before;
      const modelFixed = result.model === fixedModelId;
      trials.push({ index: index + 1, success: toolCalls > 0 && modelFixed && Boolean(result.text), toolCalls, modelFixed, latencyMs: Math.round(performance.now() - startedAt) });
    } catch (error) {
      trials.push({ index: index + 1, success: false, toolCalls: counter.count - before, modelFixed: false, latencyMs: Math.round(performance.now() - startedAt), errorCode: error.code || "PROVIDER_PROBE_FAILED", retryable: error.retryable === true });
    }
  }
  return summarizeTrials(trials);
}

async function main(argv = process.argv.slice(2)) {
  const options = parseOptions(argv);
  const credentials = await new ProviderCredentialStore().load();
  if (credentials.baseUrl !== EXPECTED_BASE_URL) {
    const error = new Error("真实采用门只允许既定 token-cloud Base URL");
    error.code = "LIVE_PROBE_BASE_URL_MISMATCH";
    throw error;
  }
  const temporaryRoot = await fs.mkdtemp(path.join(tmpdir(), "syno-real-provider-probe-"));
  try {
    const counter = { count: 0 };
    const tools = createProbeTools(counter);
    const localFaultInjection = await runLocalFaultGates(credentials);
    const provider = new ProviderClient({ credentials: { load: async () => credentials } });
    const agent = new ToolLoopAgent({ provider, tools, conversations: new ConversationStore({ root: path.join(temporaryRoot, "conversations") }), maxTurns: 4 });
    const runtime = new NativeCognitiveRuntime({ agent, tools });
    const native = await runTrials(runtime, counter, options.trials, credentials.modelId);
    const report = {
      ok: localFaultInjection.allPassed && native.attempts > 0 && native.successes === native.attempts,
      provider: { baseUrl: credentials.baseUrl, modelId: credentials.modelId, contextLength: credentials.contextLength },
      runtime: "native-tool-loop",
      syntheticDataOnly: true,
      localFaultInjection,
      recoveredToLiveFixedModel: localFaultInjection.allPassed && native.successes === native.attempts,
      native,
    };
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 2;
    return report;
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

const isDirect = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isDirect) {
  main().catch((error) => {
    console.error(JSON.stringify({ ok: false, code: error.code || "LIVE_PROBE_FAILED", retryable: error.retryable === true }));
    process.exitCode = 1;
  });
}

export { EXPECTED_BASE_URL, main, parseOptions, runLocalFaultGates, runTrials, summarizeTrials };
