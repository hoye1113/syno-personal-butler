import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { ConversationStore } from "../apps/syno/syno/conversation-store.mjs";
import { executeDomainOperation } from "../packages/syno-core/domain-operations.mjs";
import { PriorityEngine } from "../packages/syno-core/priority-engine.mjs";
import { ProviderClient, ProviderError, estimateTokens, matchesFixedModel } from "../apps/syno/syno/provider-client.mjs";
import { ProviderCredentialStore, runDpapi } from "../packages/syno-core/provider-credential-store.mjs";
import { SettingsRegistry } from "../packages/syno-core/settings-registry.mjs";
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
  // Long multi-line Chinese + emoji + Windows path + URL: must round-trip byte-exact through the
  // PowerShell DPAPI bridge on a zh-CN (GBK/ACP=936) host. Regression net for the [Console]
  // GBK-transcoding bug that corrupted non-ASCII payloads and broke morning reminder delivery.
  const fixture = "syno-dpapi-roundtrip-凭据\n晨间计划：今日首要任务是处理「主动通道」编码问题。\nevening line with emoji 🎉 and a Windows path C:\\Users\\syno and a url https://example.cn/x?y=1";
  const encrypted = await runDpapi("protect", fixture);
  assert.notEqual(encrypted, fixture);
  // protect output must be pure Base64 (ASCII) — the codepage-immune transport contract.
  assert.match(encrypted, /^[A-Za-z0-9+/]+={0,2}$/);
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

test("ToolLoopAgent redacts a secret-bearing tool result before re-injecting it (native serializer wiring)", async (t) => {
  // 锁定 tool-loop-agent.mjs:139 的 serializeForToolMessage 接线：
  // native 路径工具结果原样回灌 provider 的旧缺口已由 serializer 接管——
  // 含密结果必须换成 REMOTE_TOOL_RESULT_BLOCKED 串回灌给模型，不中断 turn、不外泄。
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-native-redact-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const responses = [
    { message: { role: "assistant", content: null, tool_calls: [{ id: "call-secret", type: "function", function: { name: "evidence.source_read", arguments: "{\"url\":\"https://example.com\"}" } }] }, model: "fixed" },
    { message: { role: "assistant", content: "来源读取被阻止。" }, model: "fixed" },
  ];
  const provider = { async complete() { return responses.shift(); } };
  const tools = new ToolRegistry([{
    name: "evidence.source_read", description: "read", risk: "read", permission: "syno-read", retry: "safe", version: "1",
    inputSchema: { type: "object", required: ["url"], properties: { url: { type: "string" } }, additionalProperties: false },
    outputSchema: { type: "object" },
    execute: async () => ({ content: "Authorization: Bearer abcdefghijklmnop" }),
  }]);
  const conversations = new ConversationStore({ root });
  const agent = new ToolLoopAgent({ provider, tools, conversations, maxTurns: 3 });
  const result = await agent.run({ text: "检查来源" }, { conversationId: "conversation-native-redact" });
  assert.equal(result.text, "来源读取被阻止。");
  const stored = await conversations.get("conversation-native-redact");
  const toolMessage = stored.messages.find((message) => message.role === "tool" && message.tool_call_id === "call-secret");
  const parsed = JSON.parse(toolMessage.content);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error.code, "REMOTE_TOOL_RESULT_BLOCKED");
  assert.doesNotMatch(toolMessage.content, /abcdefghijklmnop|Authorization|Bearer/);
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

test("SettingsRegistry persists only valid Agent-adjustable preferences", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-settings-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const registry = new SettingsRegistry({ stateFile: path.join(root, "settings.json"), clock: () => new Date("2026-07-17T08:00:00.000Z") });
  assert.equal(registry.assertChange("ui.displayOrder", { actor: "agent" }), "agentAdjustable");
  assert.throws(() => registry.assertChange("provider.modelId", { actor: "agent", confirmed: true }), /用户确认/);
  assert.throws(() => registry.assertChange("provider.token", { actor: "agent" }), /不得修改/);
  await registry.set("ui.preferences", { reducedDensity: true }, { actor: "agent" });
  assert.deepEqual(await registry.get("ui.preferences"), { reducedDensity: true });
  await assert.rejects(registry.set("ui.preferences", "compact", { actor: "agent" }), /界面偏好/);
  // D6：学习子系统键已移除，不再是 agentAdjustable
  assert.equal(registry.classify("learning.dailyReviewCount"), "immutable");
  await assert.rejects(registry.set("channels", ["weixin"], { actor: "agent", confirmed: true }), /用户确认/);
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
