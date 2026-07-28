import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { ConversationStore } from "../apps/syno/syno/conversation-store.mjs";
import { executeDomainOperation } from "../apps/syno/syno/domain-operations.mjs";
import { PriorityEngine } from "../apps/syno/syno/priority-engine.mjs";
import { ProactiveOrchestrator, isQuietTime, localMessage } from "../apps/syno/syno/proactive-orchestrator.mjs";
import { ProviderClient, ProviderError, estimateTokens, matchesFixedModel } from "../apps/syno/syno/provider-client.mjs";
import { ProviderCredentialStore, runDpapi } from "../apps/syno/syno/provider-credential-store.mjs";
import { SettingsRegistry } from "../apps/syno/syno/settings-registry.mjs";
import { SignalEngine, localDateKey } from "../apps/syno/syno/signal-engine.mjs";
import { routeSynoApi } from "../apps/syno/syno/runtime.mjs";
import { ToolLoopAgent } from "../apps/syno/syno/tool-loop-agent.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";

test("Provider credentials separate DPAPI token material from public metadata", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-provider-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new ProviderCredentialStore({
    root,
    protect: async (value) => Buffer.from(`protected:${value}`).toString("base64"),
    unprotect: async (value) => Buffer.from(value, "base64").toString("utf8").replace("protected:", ""),
  });
  const status = await store.save({ baseUrl: "https://server.flowyaipc.cn/claw/v1/", token: "super-secret-token", modelId: "fixed-model", contextLength: 128_000 });
  assert.equal(status.configured, true);
  assert.equal(Object.hasOwn(status, "token"), false);
  assert.doesNotMatch(await fs.readFile(store.metadataFile, "utf8"), /super-secret-token/);
  assert.equal((await store.load()).token, "super-secret-token");
});

test("Windows DPAPI adapter protects and restores a UTF-8 value", { skip: process.platform !== "win32" }, async () => {
  const fixture = "syno-dpapi-roundtrip-凭据";
  const encrypted = await runDpapi("protect", fixture);
  assert.notEqual(encrypted, fixture);
  assert.equal(await runDpapi("unprotect", encrypted), fixture);
});

test("ProviderClient uses non-streaming chat completions and native tools", async () => {
  let captured;
  const client = new ProviderClient({
    credentials: { async load() { return { baseUrl: "https://provider.example/v1", token: "secret", modelId: "one-model", contextLength: 64_000 }; } },
    fetchImpl: async (url, init) => {
      captured = { url, init, body: JSON.parse(init.body) };
      return new Response(JSON.stringify({ model: "one-model", choices: [{ message: { role: "assistant", content: "done" } }] }), { status: 200 });
    },
  });
  const result = await client.complete([{ role: "user", content: "hi" }], [{ name: "knowledge.search", description: "search", inputSchema: { type: "object" } }]);
  assert.equal(captured.url, "https://provider.example/v1/chat/completions");
  assert.equal(captured.body.stream, false);
  assert.equal(captured.body.model, "one-model");
  assert.equal(captured.body.tools[0].function.name, "knowledge.search");
  assert.equal(result.message.content, "done");
});

test("Provider errors never expose tokens and mark retryable outages", async () => {
  const client = new ProviderClient({
    credentials: { async load() { return { baseUrl: "https://provider.example/v1", token: "never-leak-me", modelId: "fixed", contextLength: 64_000 }; } },
    fetchImpl: async () => new Response("upstream says token never-leak-me", { status: 503 }),
  });
  await assert.rejects(client.complete([{ role: "user", content: "hi" }]), (error) => {
    assert.equal(error instanceof ProviderError, true);
    assert.equal(error.retryable, true);
    assert.doesNotMatch(error.message, /never-leak-me/);
    return true;
  });
});

test("Provider rejects a response that drifts from the fixed model", async () => {
  const client = new ProviderClient({
    credentials: { async load() { return { baseUrl: "https://provider.example/v1", token: "secret", modelId: "fixed", contextLength: 64_000 }; } },
    fetchImpl: async () => new Response(JSON.stringify({ model: "other-model", choices: [{ message: { role: "assistant", content: "done" } }] }), { status: 200 }),
  });
  await assert.rejects(client.complete([{ role: "user", content: "hi" }]), (error) => {
    assert.equal(error.code, "PROVIDER_MODEL_DRIFT");
    assert.equal(error.retryable, false);
    return true;
  });
});

test("Provider accepts only the deterministic AIPC response-model normalization", async () => {
  assert.equal(matchesFixedModel("AIPC-deepseek-v4-flash", "deepseek-v4-flash"), true);
  assert.equal(matchesFixedModel("AIPC-deepseek-v4-flash", "MiniMax/MiniMax-M2.7"), false);
  const client = new ProviderClient({
    credentials: { async load() { return { baseUrl: "https://provider.example/v1", token: "secret", modelId: "AIPC-deepseek-v4-flash", contextLength: 64_000 }; } },
    fetchImpl: async () => new Response(JSON.stringify({ model: "deepseek-v4-flash", choices: [{ message: { role: "assistant", content: "done" } }] }), { status: 200 }),
  });
  assert.equal((await client.complete([{ role: "user", content: "hi" }])).model, "AIPC-deepseek-v4-flash");
});

test("Provider enforces the configured context budget before network access", async () => {
  let called = false;
  const client = new ProviderClient({
    credentials: { async load() { return { baseUrl: "https://provider.example/v1", token: "secret", modelId: "fixed", contextLength: 4_096 }; } },
    fetchImpl: async () => { called = true; return new Response("{}"); },
  });
  assert.ok(estimateTokens([{ role: "user", content: "x".repeat(20_000) }]) > 4_096);
  await assert.rejects(client.complete([{ role: "user", content: "x".repeat(20_000) }]), (error) => error.code === "PROVIDER_CONTEXT_LIMIT" && error.retryable === false);
  assert.equal(called, false);
});

test("ToolLoopAgent completes a bounded native tool-call loop", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-conversation-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const responses = [
    { message: { role: "assistant", content: null, tool_calls: [{ id: "call-1", type: "function", function: { name: "knowledge.search", arguments: "{\"query\":\"agent\"}" } }] }, model: "fixed" },
    { message: { role: "assistant", content: "找到一条知识。" }, model: "fixed", usage: { total_tokens: 20 } },
  ];
  const provider = { async complete() { return responses.shift(); } };
  const tools = new ToolRegistry([{ name: "knowledge.search", description: "search", risk: "read", permission: "syno-read", retry: "safe", version: "1", inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string", minLength: 1 } }, additionalProperties: false }, outputSchema: { type: "array", items: { type: "object" } }, execute: async ({ query }) => [{ path: "vault/a.md", query }] }]);
  const conversations = new ConversationStore({ root });
  const agent = new ToolLoopAgent({ provider, tools, conversations, maxTurns: 4 });
  const result = await agent.run({ text: "查找 agent" });
  assert.equal(result.text, "找到一条知识。");
  assert.equal(result.turns, 2);
  assert.equal((await conversations.get(result.conversationId)).status, "completed");
});

test("ToolLoopAgent records a failed tool result and keeps the conversation usable", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-tool-error-conversation-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const responses = [
    { message: { role: "assistant", content: null, tool_calls: [{ id: "call-failed", type: "function", function: { name: "evidence.source_read", arguments: "{\"url\":\"https://example.com\"}" } }] }, model: "fixed" },
    { message: { role: "assistant", content: "来源读取失败，但对话仍可继续。" }, model: "fixed" },
  ];
  const provider = { async complete() { return responses.shift(); } };
  const tools = new ToolRegistry([{
    name: "evidence.source_read", description: "read", risk: "read", permission: "syno-read", retry: "safe", version: "1",
    inputSchema: { type: "object", required: ["url"], properties: { url: { type: "string" } }, additionalProperties: false },
    outputSchema: { type: "object" }, execute: async () => { throw Object.assign(new Error("URL 解析到本机、内网或保留地址"), { code: "SOURCE_URL_BLOCKED" }); },
  }]);
  const conversations = new ConversationStore({ root });
  const agent = new ToolLoopAgent({ provider, tools, conversations, maxTurns: 3 });
  const result = await agent.run({ text: "检查来源" }, { conversationId: "conversation-tool-error" });
  assert.equal(result.text, "来源读取失败，但对话仍可继续。");
  const stored = await conversations.get("conversation-tool-error");
  assert.equal(stored.status, "completed");
  const failedTool = stored.messages.find((message) => message.role === "tool" && message.tool_call_id === "call-failed");
  assert.deepEqual(JSON.parse(failedTool.content), { ok: false, error: { code: "SOURCE_URL_BLOCKED", message: "URL 解析到本机、内网或保留地址" } });
});

test("ToolLoopAgent repairs a legacy dangling tool call before the next user turn", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-dangling-tool-conversation-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const conversations = new ConversationStore({ root });
  await conversations.create({
    id: "conversation-dangling-tool",
    messages: [
      { role: "user", content: "旧请求" },
      { role: "assistant", content: null, tool_calls: [{ id: "legacy-call", type: "function", function: { name: "evidence.source_read", arguments: "{\"url\":\"https://example.com\"}" } }] },
    ],
  });
  const provider = {
    async complete(messages) {
      const toolIndex = messages.findIndex((message) => message.role === "tool" && message.tool_call_id === "legacy-call");
      const newUserIndex = messages.findIndex((message) => message.role === "user" && message.content === "新请求");
      assert.ok(toolIndex > 0 && toolIndex < newUserIndex);
      return { message: { role: "assistant", content: "已恢复" }, model: "fixed" };
    },
  };
  const agent = new ToolLoopAgent({ provider, tools: new ToolRegistry(), conversations });
  assert.equal((await agent.run({ text: "新请求" }, { conversationId: "conversation-dangling-tool" })).text, "已恢复");
  const repaired = await conversations.get("conversation-dangling-tool");
  assert.deepEqual(JSON.parse(repaired.messages.find((message) => message.tool_call_id === "legacy-call").content), {
    ok: false,
    error: { code: "TOOL_RESULT_MISSING", message: "上一次工具调用未完成，未重放该操作" },
  });
});

test("ToolLoopAgent pins one Provider configuration for the entire tool loop", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-fixed-provider-run-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let loads = 0;
  const requestedModels = [];
  const client = new ProviderClient({
    credentials: { async load() {
      loads += 1;
      return { baseUrl: "https://provider.example/v1", token: "secret", modelId: loads === 1 ? "fixed" : "changed", contextLength: 64_000 };
    } },
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body);
      requestedModels.push(body.model);
      const message = requestedModels.length === 1
        ? { role: "assistant", content: null, tool_calls: [{ id: "call-1", type: "function", function: { name: "knowledge.search", arguments: "{\"query\":\"agent\"}" } }] }
        : { role: "assistant", content: "done" };
      return new Response(JSON.stringify({ model: "fixed", choices: [{ message }] }), { status: 200 });
    },
  });
  const tools = new ToolRegistry([{
    name: "knowledge.search", description: "search", risk: "read", permission: "syno-read", retry: "safe", version: "1",
    inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string" } }, additionalProperties: false },
    outputSchema: { type: "array", items: { type: "object" } }, execute: async () => [{ ok: true }],
  }]);
  const agent = new ToolLoopAgent({ provider: client, tools, conversations: new ConversationStore({ root }) });
  const result = await agent.run({ text: "search" });
  assert.equal(result.model, "fixed");
  assert.equal(loads, 1);
  assert.deepEqual(requestedModels, ["fixed", "fixed"]);
});

test("ToolLoopAgent reuses the routed conversation across messages", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-conversation-continuity-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const observed = [];
  const provider = { async bindRun() { return { async complete(messages) { observed.push(messages.filter((item) => item.role === "user").map((item) => item.content)); return { message: { role: "assistant", content: "ok" }, model: "fixed" }; } }; } };
  const agent = new ToolLoopAgent({ provider, tools: new ToolRegistry(), conversations: new ConversationStore({ root }) });
  await agent.run({ text: "第一条" }, { conversationId: "conversation-owner" });
  await agent.run({ text: "追问" }, { conversationId: "conversation-owner", channel: "weixin" });
  assert.deepEqual(observed, [["第一条"], ["第一条", "追问"]]);
  assert.equal((await agent.conversations.get("conversation-owner")).channel, "web");
});

test("ToolRegistry denies non-whitelisted and unapproved write tools", async () => {
  const registry = new ToolRegistry([{ name: "jobs.create", description: "create", risk: "low", permission: "syno-ops", retry: "idempotent", version: "1", inputSchema: { type: "object", properties: {}, additionalProperties: false }, outputSchema: { type: "object", required: ["ok"], properties: { ok: { type: "boolean" } } }, execute: async () => ({ ok: true }) }]);
  await assert.rejects(registry.execute("source.edit", {}), /不在白名单/);
  await assert.rejects(registry.execute("jobs.create", {}), /审批入口/);
  assert.throws(() => new ToolRegistry([{ name: "bad.tool", risk: "read", permission: "syno-read", retry: "safe", version: "1", execute: async () => ({}) }]), /输出 Schema/);
});

test("Signal and Priority engines are deterministic and notification-bounded", () => {
  const priority = new PriorityEngine();
  assert.deepEqual(priority.rank([{ id: "n", kind: "news" }, { id: "g", kind: "goal" }]).map((item) => item.id), ["g", "n"]);
  assert.deepEqual(priority.allocate(20), { digest: 12, ingest: 5, maintenance: 3 });
  const signal = new SignalEngine({ schedule: { morningHour: 8, eveningHour: 20, weeklyDay: 0, maxDailyNotifications: 3 } });
  const now = new Date("2026-07-19T21:00:00+08:00");
  assert.equal(signal.collect({ now, notificationsToday: 2, highValueEvents: [{ id: "e1" }] }).length, 2); // daily slice 1 + weekly 独立 1
  // 日常配额满时仍返回 weekly（周度复盘独立于日常配额）
  assert.deepEqual(signal.collect({ now, notificationsToday: 3 }), [{ kind: "weekly", key: "weekly:2026-07-19" }]);
  assert.match(localDateKey(now), /^2026-07-/);
});

test("ProactiveOrchestrator drives the single Agent but keeps local fallback and budget", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-proactive-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const messages = [];
  const host = { async receive(request, context) {
    assert.equal(request.intent, "chat");
    assert.equal(context.senderId, "syno-worker");
    return { job: { id: `job-${context.messageId.replaceAll(":", "-")}`, status: "waiting_provider" } };
  } };
  const today = { async snapshot() { return { priorities: [{ title: "复习 Tool Loop" }], allocation: { digest: 6, ingest: 3, maintenance: 1 } }; } };
  const channels = { async send(message) { messages.push(message); return { web: { delivered: true } }; } };
  const conversations = { async prune() { return []; } };
  const proactive = new ProactiveOrchestrator({
    host, today, channels, conversations,
    signalEngine: new SignalEngine({ schedule: { morningHour: 8, eveningHour: 20, weeklyDay: 0, maxDailyNotifications: 1 } }),
    stateFile: path.join(root, "state.json"), quietHours: { start: "23:00", end: "07:00" },
  });
  const first = await proactive.tick({ now: new Date("2026-07-20T08:30:00+08:00") });
  assert.equal(first.length, 1);
  assert.equal(first[0].localFallback, true);
  assert.match(messages[0].body, /复习 Tool Loop/);
  assert.deepEqual(await proactive.tick({ now: new Date("2026-07-20T20:30:00+08:00") }), []);
  assert.equal(isQuietTime(new Date("2026-07-20T23:30:00+08:00"), { start: "23:00", end: "07:00" }), true);
});

test("ProactiveOrchestrator uses a separate OpenCode proactive session and appends the result to main", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-proactive-opencode-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const calls = [];
  const cognitiveRuntime = {
    async run(request, context) {
      calls.push(["run", request.intent, context.ownerKey, context.threadKey, context.messageId]);
      return { text: "先复习 Tool Bridge" };
    },
    async appendSystemEvent(event) {
      calls.push(["append", event.ownerKey, event.threadKey, event.text]);
    },
  };
  const proactive = new ProactiveOrchestrator({
    host: { async receive() { throw new Error("must use CognitiveRuntime directly"); } },
    cognitiveRuntime,
    today: { async snapshot() { return { priorities: [{ title: "复习 Tool Bridge" }] }; } },
    channels: { async send() { return { web: { delivered: true } }; } },
    signalEngine: new SignalEngine({ schedule: { morningHour: 8, eveningHour: 20, weeklyDay: 0, maxDailyNotifications: 1 } }),
    stateFile: path.join(root, "state.json"),
    quietHours: { start: "23:00", end: "07:00" },
  });
  const delivered = await proactive.tick({ now: new Date("2026-07-20T08:30:00+08:00") });
  assert.equal(delivered[0].localFallback, false);
  assert.deepEqual(calls[0].slice(0, 4), ["run", "chat", "local-user", "proactive"]);
  assert.deepEqual(calls[1].slice(0, 3), ["append", "local-user", "main"]);
  assert.match(calls[1][3], /先复习 Tool Bridge/);
});

test("ProactiveOrchestrator weekly signal calls maintenance.weeklySummary and targets all channels", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-proactive-weekly-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sends = [];
  const host = { async receive() { return { job: { id: "job-w", status: "waiting_provider" } }; } };
  const today = { async snapshot() { return { priorities: [], allocation: { digest: 1, ingest: 1, maintenance: 1 } }; } };
  const channels = { async send(message, targets) { sends.push({ message, targets }); return { web: { delivered: true } }; } };
  const conversations = { async prune() { return []; } };
  const maintenance = { async weeklySummary() { return { generatedAt: "x", totalOrphans: 5, topics: [{ topic: "01-Areas", count: 3, items: [] }, { topic: "02-Resources", count: 2, items: [] }] }; } };
  const proactive = new ProactiveOrchestrator({
    host, today, channels, conversations, maintenance,
    signalEngine: new SignalEngine({ schedule: { morningHour: 8, eveningHour: 20, weeklyDay: 0, maxDailyNotifications: 3 } }),
    stateFile: path.join(root, "state.json"), quietHours: { start: "23:00", end: "07:00" },
  });
  // 2026-07-19 周日 09:00 (+08:00)：触发 morning + weekly
  await proactive.tick({ now: new Date("2026-07-19T09:00:00+08:00") });
  const weeklySend = sends.find((entry) => entry.message.data?.signal === "weekly");
  assert.ok(weeklySend, "weekly signal should be sent");
  assert.match(weeklySend.message.body, /5 篇孤岛/);
  assert.match(weeklySend.message.body, /01-Areas/);
  assert.deepEqual(weeklySend.targets, ["web", "windows", "weixin", "feishu"]);
  assert.ok(weeklySend.message.text.includes(weeklySend.message.title), "message should carry self-contained text for weixin/feishu");
});

test("weekly signal is independent of the daily notification budget", () => {
  const signal = new SignalEngine({ schedule: { morningHour: 8, eveningHour: 20, weeklyDay: 0, maxDailyNotifications: 2 } });
  const sunday = new Date("2026-07-19T09:00:00+08:00"); // 周日早晨
  const morning = signal.collect({ now: sunday, notificationsToday: 0, maxDailyNotifications: 2 });
  assert.ok(morning.some((s) => s.kind === "weekly"), "weekly fires on Sunday morning");
  assert.ok(morning.some((s) => s.kind === "morning"), "morning also fires");
  // 晚上日常配额已用 1（morning）；weekly 不占配额，evening 仍可触发（修复 weekly 挤掉 evening 的 bug）
  const evening = signal.collect({
    now: new Date("2026-07-19T21:00:00+08:00"),
    lastRuns: { morning: "2026-07-19", weekly: "2026-07-19" },
    notificationsToday: 1,
    maxDailyNotifications: 2,
  });
  assert.ok(evening.some((s) => s.kind === "evening"), "evening still fires because weekly did not consume daily budget");
});

test("localMessage daily fallback uses allocation.ingest (not capture) and carries text", () => {
  const signal = { kind: "morning", key: "morning:2026-07-19" };
  const snapshot = { priorities: [], allocation: { digest: 6, ingest: 3, maintenance: 1 } };
  const msg = localMessage(signal, snapshot);
  assert.match(msg.body, /收录 3/);
  assert.ok(msg.text.includes(msg.title) && msg.text.includes(msg.body));
});

test("localMessage morning surfaces plan allocation and primary action", () => {
  const signal = { kind: "morning", key: "morning:2026-07-20" };
  const snapshot = {
    plan: { allocation: { digest: 7, ingest: 2, maintenance: 1 } },
    primary: { title: "复习：Tool Loop" },
    priorities: [{ title: "复习：Tool Loop" }],
  };
  const msg = localMessage(signal, snapshot);
  assert.match(msg.body, /消化 7/);
  assert.match(msg.body, /收录 2/);
  assert.match(msg.body, /首要：复习：Tool Loop/);
  assert.ok(msg.text.includes(msg.body));
});

test("localMessage evening surfaces progress and top due reviews", () => {
  const signal = { kind: "evening", key: "evening:2026-07-20" };
  const snapshot = {
    progress: { completed: 3, waiting: 2, failed: 1 },
    dueReviews: [{ title: "复习：Context Engineering" }, { title: "复习：Signal Engine" }, { title: "复习：第三条应被截断" }],
    priorities: [],
  };
  const msg = localMessage(signal, snapshot);
  assert.match(msg.body, /已完成 3/);
  assert.match(msg.body, /待确认 2/);
  assert.match(msg.body, /Context Engineering/);
  assert.match(msg.body, /Signal Engine/);
  assert.doesNotMatch(msg.body, /第三条应被截断/);
});

test("SettingsRegistry persists only valid Agent-adjustable preferences", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-settings-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const registry = new SettingsRegistry({ stateFile: path.join(root, "settings.json"), clock: () => new Date("2026-07-17T08:00:00.000Z") });
  assert.equal(registry.assertChange("notifications.quietHours", { actor: "agent" }), "agentAdjustable");
  assert.throws(() => registry.assertChange("provider.modelId", { actor: "agent", confirmed: true }), /用户确认/);
  assert.throws(() => registry.assertChange("provider.token", { actor: "agent" }), /不得修改/);
  await registry.set("learning.dailyReviewCount", 7, { actor: "agent" });
  assert.equal(await registry.get("learning.dailyReviewCount"), 7);
  await assert.rejects(registry.set("learning.dailyReviewCount", 100, { actor: "agent" }), /1–20/);
  await assert.rejects(registry.set("channels", ["weixin"], { actor: "agent", confirmed: true }), /用户确认/);
  await assert.rejects(registry.set("notifications.quietHours", { start: "99:00", end: "07:00" }, { actor: "agent" }), /安静时间/);
});

test("Provider API never returns the submitted token", async () => {
  let saved;
  const runtime = { credentials: {
    async status() { return { configured: false }; },
    async save(value) { saved = value; return { configured: true, baseUrl: value.baseUrl, modelId: value.modelId, contextLength: value.contextLength }; },
  } };
  const response = await routeSynoApi(runtime, { method: "POST" }, new URL("http://localhost/api/syno/provider"), async () => ({ baseUrl: "https://provider.example/v1", token: "secret", modelId: "fixed", contextLength: 64_000 }));
  assert.equal(saved.token, "secret");
  assert.equal(Object.hasOwn(response, "token"), false);
});

test("deterministic domain operations write only canonical approved records", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-domain-operation-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const result = await executeDomainOperation("actions.create", { title: "复习 Tool Loop" }, { workspace: root, clock: () => new Date("2026-07-17T08:00:00.000Z") });
  assert.equal(result.record.status, "pending");
  assert.match(result.changedPaths[0], /^ops\/actions\/2026\/07\/action-/);
  assert.match(await fs.readFile(path.join(root, result.changedPaths[0]), "utf8"), /复习 Tool Loop/);
});
