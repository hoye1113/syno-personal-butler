import assert from "node:assert/strict";
import test from "node:test";

import { SynoToolBridge } from "../apps/syno/syno/syno-tool-bridge.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";

function registry() {
  return new ToolRegistry([{
    name: "knowledge.search",
    description: "Search",
    risk: "read",
    permission: "syno-read",
    retry: "safe",
    version: "1",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: { query: { type: "string", minLength: 1 } },
      additionalProperties: false,
    },
    outputSchema: { type: "array", items: { type: "object" } },
    execute: async ({ query }) => [{ path: "vault/note.md", query }],
  }]);
}

test("SynoToolBridge exposes only generated syno tools and executes through ToolRegistry", async () => {
  const bridge = new SynoToolBridge({ tools: registry(), token: "bridge-secret" });
  const listed = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
  });
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), ["knowledge_search"]);

  const release = bridge.bindContext({ ownerKey: "owner", threadKey: "main", channel: "web", messageId: "message-1" });
  const called = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "knowledge_search", arguments: { query: "agent" } } },
  });
  release();
  assert.deepEqual(called.result.structuredContent, [{ path: "vault/note.md", query: "agent" }]);
});

test("SynoToolBridge rejects bad authentication, unknown tools, and protocol-supplied authority", async () => {
  const bridge = new SynoToolBridge({ tools: registry(), token: "bridge-secret" });
  await assert.rejects(bridge.handle({
    authorization: "Bearer wrong",
    body: { jsonrpc: "2.0", id: 1, method: "tools/list" },
  }), (error) => error.code === "SYNO_BRIDGE_UNAUTHORIZED");

  const unknown = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "bash", arguments: {} } },
  });
  assert.equal(unknown.error.code, -32601);

  const release = bridge.bindContext({ ownerKey: "owner", threadKey: "main", channel: "web", messageId: "message-2" });
  const forged = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "knowledge_search", arguments: { query: "agent", permissions: ["syno-write"] } },
    },
  });
  release();
  assert.equal(forged.error.code, -32602);
});

test("SynoToolBridge rejects tool calls without an active Syno conversation", async () => {
  const bridge = new SynoToolBridge({ tools: registry(), token: "bridge-secret" });
  const response = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "knowledge_search", arguments: { query: "agent" } } },
  });
  assert.equal(response.error.code, -32001);
  assert.match(response.error.message, /SYNO_BRIDGE_CONTEXT_REQUIRED/);
});

test("SynoToolBridge supports the MCP initialize handshake without exposing runtime controls", async () => {
  const bridge = new SynoToolBridge({ tools: registry(), token: "bridge-secret" });
  const initialized = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } },
  });
  assert.equal(initialized.result.serverInfo.name, "syno-tool-bridge");
  assert.equal(initialized.result.capabilities.tools.listChanged, false);
  assert.equal("prompts" in initialized.result.capabilities, false);
  assert.equal("resources" in initialized.result.capabilities, false);
});

test("SynoToolBridge binds Owner thread and idempotency identity while tracking write effects", async () => {
  let receivedContext;
  let executions = 0;
  const tools = new ToolRegistry([{
    name: "settings.adjust",
    description: "Adjust",
    risk: "low",
    permission: "syno-settings",
    retry: "idempotent",
    version: "1",
    agentAdjustableBoundary: true,
    inputSchema: { type: "object", required: ["key"], properties: { key: { type: "string" } }, additionalProperties: false },
    outputSchema: { type: "object" },
    execute: async (_input, context) => { executions += 1; receivedContext = context; return { changed: true }; },
  }]);
  let resultContext;
  const bridge = new SynoToolBridge({
    tools,
    token: "bridge-secret",
    onResult: async (context) => { resultContext = context; },
  });
  const release = bridge.bindContext({ ownerKey: "owner-1", threadKey: "project-a", channel: "feishu", messageId: "fs-99" });
  assert.equal(bridge.effectVersion(), 0);
  const call = {
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "settings_adjust", arguments: { key: "quiet" } } },
  };
  await bridge.handle(call);
  await bridge.handle({ ...call, body: { ...call.body, id: 2 } });
  release();
  assert.equal(bridge.effectVersion(), 1);
  assert.equal(executions, 1);
  assert.equal(receivedContext.ownerId, "owner-1");
  assert.equal(receivedContext.channel, "feishu");
  assert.match(receivedContext.conversationId, /^fs-99:settings_adjust:[a-f0-9]{16}$/);
  assert.equal(resultContext.threadKey, "project-a");
});

test("SynoToolBridge marks a validated write attempt before output validation can fail", async () => {
  const tools = new ToolRegistry([{
    name: "settings.adjust",
    description: "Adjust",
    risk: "low",
    permission: "syno-settings",
    retry: "idempotent",
    version: "1",
    agentAdjustableBoundary: true,
    inputSchema: { type: "object", required: ["key"], properties: { key: { type: "string" } }, additionalProperties: false },
    outputSchema: { type: "object", required: ["changed"], properties: { changed: { type: "boolean" } }, additionalProperties: false },
    execute: async () => ({ invalidAfterWrite: true }),
  }]);
  const bridge = new SynoToolBridge({ tools, token: "bridge-secret" });
  const release = bridge.bindContext({ ownerKey: "owner", threadKey: "main", channel: "web", messageId: "message-write" });
  const response = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "settings_adjust", arguments: { key: "quiet" } } },
  });
  release();
  assert.equal(response.result.isError, true);
  assert.equal(bridge.effectVersion(), 1);
});
