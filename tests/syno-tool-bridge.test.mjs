import assert from "node:assert/strict";
import test from "node:test";

import { SynoToolBridge } from "../apps/syno/syno/syno-tool-bridge.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";
import { createBrowserCaptureTools } from "../apps/syno/syno/browser-capture-tools.mjs";

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

  const release = bridge.bindContext({
    ownerKey: "owner",
    threadKey: "main",
    channel: "web",
    messageId: "message-1",
    allowedTools: ["knowledge_search"],
  });
  const called = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "knowledge_search", arguments: { query: "agent" } } },
  });
  release();
  assert.deepEqual(called.result.structuredContent, [{ path: "vault/note.md", query: "agent" }]);
});

test("SynoToolBridge accepts the OpenCode namespaced run capability for its internal MCP name", async () => {
  const bridge = new SynoToolBridge({ tools: registry(), token: "bridge-secret" });
  const release = bridge.bindContext({
    ownerKey: "owner",
    threadKey: "main",
    messageId: "message-namespaced",
    allowedTools: ["syno_knowledge_search"],
  });
  const called = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "knowledge_search", arguments: { query: "agent" } },
    },
  });
  release();
  assert.deepEqual(called.result.structuredContent, [{ path: "vault/note.md", query: "agent" }]);
});

test("SynoToolBridge blocks a secret-bearing ToolRegistry result before MCP serialization", async () => {
  const tools = new ToolRegistry([{
    name: "evidence.source_read",
    description: "Read public evidence",
    risk: "read",
    permission: "syno-read",
    retry: "safe",
    version: "1",
    inputSchema: { type: "object", additionalProperties: false },
    outputSchema: { type: "object" },
    execute: async () => ({ content: "Authorization: Bearer abcdefghijklmnop" }),
  }]);
  const bridge = new SynoToolBridge({ tools, token: "bridge-secret" });
  const release = bridge.bindContext({
    ownerKey: "owner",
    threadKey: "main",
    messageId: "message-secret-result",
    allowedTools: ["syno_evidence_source_read"],
  });
  const called = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "evidence_source_read", arguments: {} } },
  });
  release();
  const serialized = JSON.stringify(called);
  assert.equal(called.result.isError, true);
  assert.match(serialized, /REMOTE_TOOL_RESULT_BLOCKED/);
  assert.doesNotMatch(serialized, /abcdefghijklmnop|Authorization|Bearer/);
  assert.equal("structuredContent" in called.result, false);
});

test("SynoToolBridge redacts secret-bearing tool errors before returning MCP content", async () => {
  const tools = new ToolRegistry([{
    name: "evidence.source_read",
    description: "Read public evidence",
    risk: "read",
    permission: "syno-read",
    retry: "safe",
    version: "1",
    inputSchema: { type: "object", additionalProperties: false },
    outputSchema: { type: "object" },
    execute: async () => { throw new Error("Authorization: Bearer abcdefghijklmnop"); },
  }]);
  const bridge = new SynoToolBridge({ tools, token: "bridge-secret" });
  const release = bridge.bindContext({
    ownerKey: "owner",
    threadKey: "main",
    messageId: "message-secret-error",
    allowedTools: ["syno_evidence_source_read"],
  });
  const called = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "evidence_source_read", arguments: {} } },
  });
  release();
  const serialized = JSON.stringify(called);
  assert.match(serialized, /REMOTE_TOOL_ERROR_REDACTED/);
  assert.doesNotMatch(serialized, /abcdefghijklmnop|Authorization|Bearer/);
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

  const release = bridge.bindContext({
    ownerKey: "owner",
    threadKey: "main",
    channel: "web",
    messageId: "message-2",
    allowedTools: ["knowledge_search"],
  });
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

test("SynoToolBridge rejects a valid tool omitted from the run-scoped capability", async () => {
  const bridge = new SynoToolBridge({ tools: registry(), token: "bridge-secret" });
  const release = bridge.bindContext({
    ownerKey: "owner",
    threadKey: "capture:artifact-1",
    channel: "capture",
    messageId: "capture-1",
    allowedTools: ["workflow_context"],
  });
  const response = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "knowledge_search", arguments: { query: "私人笔记" } } },
  });
  release();
  assert.equal(response.error.code, -32003);
  assert.match(response.error.message, /TOOL_NOT_ALLOWED/);
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
  const release = bridge.bindContext({
    ownerKey: "owner-1",
    threadKey: "project-a",
    channel: "feishu",
    messageId: "fs-99",
    allowedTools: ["settings_adjust"],
  });
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
  const release = bridge.bindContext({
    ownerKey: "owner",
    threadKey: "main",
    channel: "web",
    messageId: "message-write",
    allowedTools: ["settings_adjust"],
  });
  const response = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "settings_adjust", arguments: { key: "quiet" } } },
  });
  release();
  assert.equal(response.result.isError, true);
  assert.equal(bridge.effectVersion(), 1);
});

test("SynoToolBridge passes browser Workflow context and blocks it outside capture", async () => {
  let received;
  const tools = new ToolRegistry(createBrowserCaptureTools({
    async status(input) { received = input; return { available: true }; },
  }));
  const bridge = new SynoToolBridge({ tools, token: "bridge-secret" });
  const mainRelease = bridge.bindContext({ ownerKey: "owner", threadKey: "main", messageId: "main-1", allowedTools: ["browser_status"], browserWorkflowId: "workflow-1" });
  const denied = await bridge.handle({ authorization: "Bearer bridge-secret", body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "browser_status", arguments: {} } } });
  mainRelease();
  assert.equal(denied.result.isError, true);
  const captureRelease = bridge.bindContext({ ownerKey: "owner", threadKey: "capture:artifact-1", messageId: "capture-1", allowedTools: ["browser_status"], browserWorkflowId: "workflow-1" });
  const allowed = await bridge.handle({ authorization: "Bearer bridge-secret", body: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "browser_status", arguments: {} } } });
  captureRelease();
  assert.deepEqual(allowed.result.structuredContent, { available: true });
  assert.deepEqual(received, { workflowId: "workflow-1" });
});
