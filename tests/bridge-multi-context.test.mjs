import test from "node:test";
import assert from "node:assert/strict";

import { SynoToolBridge } from "../apps/syno/syno/syno-tool-bridge.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";

const inputSchema = { type: "object", properties: {}, additionalProperties: false };
const outputSchema = { type: "object" };

function makeBridge() {
  const tools = new ToolRegistry([
    {
      name: "knowledge.search", description: "search", risk: "read", permission: "syno-read", retry: "safe", version: "1",
      inputSchema, outputSchema,
      execute: async (_args, context) => ({ ownerKey: context.ownerKey, messageId: context.messageId, channel: context.channel }),
    },
  ]);
  return new SynoToolBridge({
    tools,
    token: "test",
    memoryStore: { context: async () => "" },
    recordEvent: async () => {},
  });
}

function bind(bridge, { session, message, channel = "feishu", privateConversation = true }) {
  return bridge.bindContext({
    ownerKey: "owner", threadKey: "main", channel, messageId: message, harnessSessionId: session,
    privateConversation, allowedTools: ["knowledge_search"],
  });
}

async function search(bridge, session) {
  return bridge.handle({
    authorization: "Bearer test",
    body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "knowledge_search", arguments: {}, sessionId: session } },
  });
}

test("chat and capture sessions can bind the bridge at the same time and keep their own context", async () => {
  const bridge = makeBridge();
  const releaseChat = bind(bridge, { session: "syno-main-chat", message: "chat-1", channel: "feishu" });
  const releaseCapture = bind(bridge, { session: "syno-capture-1", message: "capture:workflow-1:1:1", channel: "capture", privateConversation: false });

  const chat = await search(bridge, "syno-main-chat");
  const capture = await search(bridge, "syno-capture-1");
  assert.equal(chat.error, undefined, JSON.stringify(chat));
  assert.equal(capture.error, undefined, JSON.stringify(capture));
  // 工具执行上下文里的 messageId 是调用身份（含工具名与参数摘要），只断言前缀即可。
  assert.match(chat.result.structuredContent.messageId, /^chat-1:/);
  assert.match(capture.result.structuredContent.messageId, /^capture:workflow-1:1:1:/);
  assert.equal(chat.result.structuredContent.channel, "feishu");
  assert.equal(capture.result.structuredContent.channel, "capture");

  // Releasing one session must not tear down the other (the release closure belongs to its own bind).
  releaseChat();
  const afterRelease = await search(bridge, "syno-capture-1");
  assert.equal(afterRelease.error, undefined, JSON.stringify(afterRelease));
  assert.equal(afterRelease.result.structuredContent.channel, "capture");
  releaseCapture();
});

test("the same session cannot bind twice, and a stale release does not evict a newer bind", async () => {
  const bridge = makeBridge();
  const releaseFirst = bind(bridge, { session: "syno-main-chat", message: "chat-1" });
  assert.throws(() => bind(bridge, { session: "syno-main-chat", message: "chat-2" }), /正在处理另一个会话/);
  releaseFirst();
  const releaseSecond = bind(bridge, { session: "syno-main-chat", message: "chat-3" });
  releaseFirst();
  const stillBound = await search(bridge, "syno-main-chat");
  assert.match(stillBound.result.structuredContent.messageId, /^chat-3:/);
  releaseSecond();
});

test("two capture sessions can run concurrently (capture concurrency is 2)", async () => {
  const bridge = makeBridge();
  const releaseA = bind(bridge, { session: "syno-capture-a", message: "capture:a", channel: "capture", privateConversation: false });
  const releaseB = bind(bridge, { session: "syno-capture-b", message: "capture:b", channel: "capture", privateConversation: false });
  assert.match((await search(bridge, "syno-capture-a")).result.structuredContent.messageId, /^capture:a:/);
  assert.match((await search(bridge, "syno-capture-b")).result.structuredContent.messageId, /^capture:b:/);
  releaseA();
  releaseB();
});
