import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { SynoToolBridge } from "../apps/syno/syno/syno-tool-bridge.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";
import { createBrowserCaptureTools } from "../apps/syno/syno/browser-capture-tools.mjs";
import { createInspirationFeedbackTool } from "../apps/syno/syno/inspiration-feedback-tool.mjs";
import { InspirationStore } from "../packages/syno-core/inspiration-store.mjs";
import { CORE_CHAT_TOOL_NAMES } from "../config/deepseek-harness/syno-tool-sets.mjs";

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
  // 数组型工具结果：MCP structuredContent 必须缺省（chat-message 层要求顶层 object），
  // 完整结果走 content text——LLM 读到的内容不变。
  assert.equal("structuredContent" in called.result, false);
  assert.deepEqual(called.result.content, [{ type: "text", text: JSON.stringify([{ path: "vault/note.md", query: "agent" }]) }]);
});

test("SynoToolBridge exposedToolNames narrows tools/list and blocks hidden direct calls", async () => {
  const tools = new ToolRegistry([
    {
      name: "knowledge.search",
      description: "Search",
      risk: "read",
      permission: "syno-read",
      retry: "safe",
      version: "1",
      inputSchema: { type: "object", additionalProperties: true },
      outputSchema: { type: "object" },
      execute: async () => ({ ok: true }),
    },
    {
      name: "claims.propose",
      description: "Hidden claims",
      risk: "low",
      permission: "syno-ops",
      retry: "safe",
      version: "1",
      inputSchema: { type: "object", additionalProperties: true },
      outputSchema: { type: "object" },
      execute: async () => ({ ok: true }),
    },
  ]);
  const bridge = new SynoToolBridge({ tools, token: "bridge-secret", exposedToolNames: CORE_CHAT_TOOL_NAMES });
  const listed = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 1, method: "tools/list" },
  });
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), ["knowledge_search"]);
  const release = bridge.bindContext({ messageId: "hidden-call", allowedTools: ["claims_propose"] });
  const hidden = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "claims_propose", arguments: {} } },
  });
  release();
  assert.equal(hidden.error.code, -32601);
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
  // 数组型工具结果：MCP structuredContent 必须缺省（chat-message 层要求顶层 object），
  // 完整结果走 content text——LLM 读到的内容不变。
  assert.equal("structuredContent" in called.result, false);
  assert.deepEqual(called.result.content, [{ type: "text", text: JSON.stringify([{ path: "vault/note.md", query: "agent" }]) }]);
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

test("SynoToolBridge marks CONTEXT_BUSY retryable so a transient collision reaches the retry path", async () => {
  const bridge = new SynoToolBridge({ tools: registry(), token: "bridge-secret" });
  const release = bridge.bindContext({ ownerKey: "owner", threadKey: "main", messageId: "holder" });
  let busy;
  try {
    bridge.bindContext({ ownerKey: "owner", threadKey: "main", messageId: "contender" });
  } catch (error) {
    busy = error;
  }
  release();
  // 桥忙是瞬时条件（持有方 release 即恢复）：ingest-workflow-coordinator 主路径只在
  // error.retryable === true 时走 failed_retryable + 60s 退避（maxPrepareAttempts=8 封顶），
  // 否则一次即判 failed_terminal。2026-08-07 生产事故：bridgeError 未挂标记，收录撞槽一次即终态。
  assert.equal(busy?.code, "SYNO_BRIDGE_CONTEXT_BUSY");
  assert.equal(busy?.retryable, true);
  // release 后必须能重新绑上——「忙」确实瞬时，重试有意义。
  const again = bridge.bindContext({ ownerKey: "owner", threadKey: "main", messageId: "after-release" });
  again();
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

// 脱敏 journal（2026-09-22）：bind/release/拒绝必须留痕 runId 与消息关联，
// 供 SYNO_BRIDGE_CONTEXT_REQUIRED 与异常 request 列表的实证追溯（先复现再修，不猜根因）。
test("SynoToolBridge journals context bind, release and rejections with correlation ids", async () => {
  const events = [];
  const recordEvent = async (event, data) => { events.push({ event, data }); };
  const bridge = new SynoToolBridge({ tools: registry(), token: "bridge-secret", recordEvent });

  const unbound = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "knowledge_search", arguments: { query: "agent" } } },
  });
  assert.equal(unbound.error.code, -32001);

  const release = bridge.bindContext({ ownerKey: "owner", threadKey: "main", channel: "weixin", messageId: "msg-7", runId: "run-7", allowedTools: ["workflow_context"] });
  const denied = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "knowledge_search", arguments: { query: "agent" } } },
  });
  assert.equal(denied.error.code, -32003);
  release();

  const byName = Object.fromEntries(events.map(({ event, data }) => [event, data]));
  const rejected = events.filter(({ event }) => event === "bridge.context.rejected").map(({ data }) => data);
  assert.equal(rejected.some((data) => data.reason === "context_required" && !data.runId), true);
  assert.equal(byName["bridge.context.bound"].runId, "run-7");
  assert.equal(byName["bridge.context.bound"].messageId, "msg-7");
  assert.equal(byName["bridge.context.bound"].channel, "weixin");
  assert.equal(byName["bridge.context.released"].runId, "run-7");
  assert.equal(byName["bridge.context.released"].messageId, "msg-7");
  const notAllowed = rejected.find((data) => data.reason === "tool_not_allowed");
  assert.equal(notAllowed.tool, "knowledge_search");
  assert.equal(notAllowed.runId, "run-7");
  // journal 不携带 token、查询正文等敏感载荷。
  assert.doesNotMatch(JSON.stringify(events), /bridge-secret|agent/);
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

test("SynoToolBridge keeps bootstrap methods available but rejects tools/call before runtime readiness", async () => {
  const bridge = new SynoToolBridge({
    tools: registry(),
    token: "bridge-secret",
    isRuntimeReady: () => false,
  });
  bridge.bindContext({
    messageId: "starting-run",
    allowedTools: ["knowledge_search"],
  });
  const initialized = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 1, method: "initialize" },
  });
  assert.equal(initialized.result.serverInfo.name, "syno-tool-bridge");
  const listed = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 2, method: "tools/list" },
  });
  assert.ok(listed.result.tools.length > 0);
  const called = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "knowledge_search", arguments: { query: "agent" } },
    },
  });
  assert.match(called.error.message, /^RUNTIME_NOT_READY:/);
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
  assert.match(receivedContext.conversationId, /^fs-99:<none>:settings_adjust:[a-f0-9]{16}$/);
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

test("SynoToolBridge exposes inspiration_record_feedback, executes idempotently per message and returns a receipt", async (t) => {
  // P1：反馈工具桥层行为——tools/list 可见（桥命名 inspiration_record_feedback）、
  // 同 messageId 重复调用只落账一次（桥幂等键）、效应收据版本前进。
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-bridge-fb-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new InspirationStore({ opsRoot: path.join(root, "ops") });
  const card = await store.create({ date: "2026-09-04", sampledRefs: ["vault/a.md", "vault/b.md"], text: "串联" });
  await store.markDelivered(card.id, "event-1");
  const tools = new ToolRegistry([createInspirationFeedbackTool({ inspirationStore: store })]);
  let resultContext;
  const bridge = new SynoToolBridge({
    tools,
    token: "bridge-secret",
    onResult: async (context) => { resultContext = context; },
  });
  const listed = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
  });
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), ["inspiration_record_feedback"]);
  const release = bridge.bindContext({
    ownerKey: "owner",
    threadKey: "main",
    channel: "weixin",
    messageId: "wx-fb-77",
    allowedTools: ["inspiration_record_feedback"],
  });
  const call = {
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "inspiration_record_feedback", arguments: { feedback: "useful" } } },
  };
  const first = await bridge.handle(call);
  const second = await bridge.handle({ ...call, body: { ...call.body, id: 3 } });
  release();
  assert.equal(first.result.isError || false, false);
  assert.equal(first.result.structuredContent.recorded, true);
  assert.equal(second.result.structuredContent.recorded, true, "幂等重放返回同一收据");
  const records = (await store.list()).filter((record) => record.feedback);
  assert.equal(records.length, 1, "同 messageId 重复调用只落账一次");
  assert.equal(records[0].feedback, "useful");
  assert.equal(bridge.effectVersion(), 1, "效应收据只前进一次");
  assert.equal(resultContext.threadKey, "main");
});
