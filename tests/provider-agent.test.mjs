import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { ConversationStore } from "../apps/syno/syno/conversation-store.mjs";
import { executeDomainOperation } from "../apps/syno/syno/domain-operations.mjs";
import { PriorityEngine } from "../apps/syno/syno/priority-engine.mjs";
import { ProviderClient, ProviderError } from "../apps/syno/syno/provider-client.mjs";
import { ProviderCredentialStore } from "../apps/syno/syno/provider-credential-store.mjs";
import { SettingsRegistry } from "../apps/syno/syno/settings-registry.mjs";
import { SignalEngine } from "../apps/syno/syno/signal-engine.mjs";
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

test("ToolLoopAgent completes a bounded native tool-call loop", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-conversation-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const responses = [
    { message: { role: "assistant", content: null, tool_calls: [{ id: "call-1", type: "function", function: { name: "knowledge.search", arguments: "{\"query\":\"agent\"}" } }] }, model: "fixed" },
    { message: { role: "assistant", content: "找到一条知识。" }, model: "fixed", usage: { total_tokens: 20 } },
  ];
  const provider = { async complete() { return responses.shift(); } };
  const tools = new ToolRegistry([{ name: "knowledge.search", description: "search", risk: "read", permission: "syno-read", retry: "safe", version: "1", inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string", minLength: 1 } }, additionalProperties: false }, execute: async ({ query }) => [{ path: "vault/a.md", query }] }]);
  const conversations = new ConversationStore({ root });
  const agent = new ToolLoopAgent({ provider, tools, conversations, maxTurns: 4 });
  const result = await agent.run({ text: "查找 agent" });
  assert.equal(result.text, "找到一条知识。");
  assert.equal(result.turns, 2);
  assert.equal((await conversations.get(result.conversationId)).status, "completed");
});

test("ToolRegistry denies non-whitelisted and unapproved write tools", async () => {
  const registry = new ToolRegistry([{ name: "jobs.create", description: "create", risk: "low", permission: "syno-ops", retry: "idempotent", version: "1", inputSchema: { type: "object", properties: {}, additionalProperties: false }, execute: async () => ({ ok: true }) }]);
  await assert.rejects(registry.execute("source.edit", {}), /不在白名单/);
  await assert.rejects(registry.execute("jobs.create", {}), /审批入口/);
});

test("Signal and Priority engines are deterministic and notification-bounded", () => {
  const priority = new PriorityEngine();
  assert.deepEqual(priority.rank([{ id: "n", kind: "news" }, { id: "g", kind: "goal" }]).map((item) => item.id), ["g", "n"]);
  assert.deepEqual(priority.allocate(20), { digest: 12, ingest: 5, maintenance: 3 });
  const signal = new SignalEngine({ schedule: { morningHour: 8, eveningHour: 20, weeklyDay: 0, maxDailyNotifications: 3 } });
  const now = new Date("2026-07-19T21:00:00+08:00");
  assert.equal(signal.collect({ now, notificationsToday: 2, highValueEvents: [{ id: "e1" }] }).length, 1);
  assert.deepEqual(signal.collect({ now, notificationsToday: 3 }), []);
});

test("SettingsRegistry prevents Agent authority escalation", () => {
  const registry = new SettingsRegistry();
  assert.equal(registry.assertChange("notifications.quietHours", { actor: "agent" }), "agentAdjustable");
  assert.throws(() => registry.assertChange("provider.modelId", { actor: "agent", confirmed: true }), /用户确认/);
  assert.throws(() => registry.assertChange("provider.token", { actor: "agent" }), /不得修改/);
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
