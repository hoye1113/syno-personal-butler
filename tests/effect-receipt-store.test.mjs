import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { EffectReceiptStore } from "../apps/syno/syno/effect-receipt-store.mjs";
import { SynoToolBridge, toolInvocationKey } from "../apps/syno/syno/syno-tool-bridge.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";

async function cleanup(root) { await fs.rm(root, { recursive: true, force: true }); }

function makeStore(root) {
  return new EffectReceiptStore({
    root: path.join(root, "receipts"),
    payloadRoot: path.join(root, "payloads"),
    lockFile: path.join(root, "receipt.lock"),
    protect: async (value) => Buffer.from(value, "utf8").toString("base64"),
    unprotect: async (value) => Buffer.from(value, "base64").toString("utf8"),
  });
}

test("EffectReceiptStore atomically begins, commits, replays and rejects parameter identity conflicts", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-effect-receipt-"));
  t.after(() => cleanup(root));
  const store = makeStore(root);
  const first = await store.begin({ toolInvocationKey: "invocation-1", toolName: "settings.adjust", ownerKey: "owner", argumentsDigest: "args-1" });
  const duplicate = await store.begin({ toolInvocationKey: "invocation-1", toolName: "settings.adjust", ownerKey: "owner", argumentsDigest: "args-1" });
  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  await assert.rejects(store.begin({ toolInvocationKey: "invocation-1", toolName: "settings.adjust", ownerKey: "owner", argumentsDigest: "args-2" }), { code: "TOOL_INVOCATION_IDENTITY_CONFLICT" });
  const committed = await store.commit({
    toolInvocationKey: "invocation-1", toolName: "settings.adjust", ownerKey: "owner", argumentsDigest: "args-1",
    result: { changed: true },
    directEffect: { status: "committed", type: "setting_updated", sourceType: "settings", sourceId: "quiet", toolInvocationKey: "invocation-1", occurredAt: "2026-07-29T00:00:00.000Z" },
    businessOutcome: { status: "queued" },
  });
  assert.equal(committed.receipt.status, "committed");
  const restored = await store.get("invocation-1", { includePayload: true });
  assert.deepEqual(restored.payload.result, { changed: true });
  assert.equal(restored.businessOutcome.status, "queued");
  const metadata = await fs.readFile((await fs.readdir(path.join(root, "receipts"))).map((name) => path.join(root, "receipts", name)).find((file) => file.endsWith(".json")), "utf8");
  assert.doesNotMatch(metadata, /changed/);
});

test("SynoToolBridge uses durable receipts across bridge instances and never repeats a write", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-effect-bridge-"));
  t.after(() => cleanup(root));
  const store = makeStore(root);
  let executions = 0;
  const tools = new ToolRegistry([{
    name: "settings.adjust", description: "Adjust", risk: "low", permission: "syno-settings", retry: "idempotent", version: "1",
    agentAdjustableBoundary: true, inputSchema: { type: "object", required: ["key"], properties: { key: { type: "string" } }, additionalProperties: false },
    outputSchema: { type: "object", required: ["changed"], properties: { changed: { type: "boolean" } }, additionalProperties: false },
    execute: async () => { executions += 1; return { changed: true }; },
  }]);
  const call = (id, key = "quiet") => ({ authorization: "Bearer secret", body: { jsonrpc: "2.0", id, method: "tools/call", params: { name: "settings_adjust", arguments: { key } } } });
  const makeBridge = () => new SynoToolBridge({ tools, token: "secret", effectReceipts: store });
  const first = makeBridge();
  const release1 = first.bindContext({ ownerKey: "owner", threadKey: "main", messageId: "message-1", allowedTools: ["settings_adjust"] });
  const created = await first.handle(call(1));
  release1();
  assert.equal(created.result.directEffect.status, "committed");
  const second = makeBridge();
  const release2 = second.bindContext({ ownerKey: "owner", threadKey: "main", messageId: "message-1", allowedTools: ["settings_adjust"] });
  const replay = await second.handle(call(2));
  const conflict = await second.handle(call(3, "different"));
  release2();
  assert.deepEqual(replay.result.structuredContent, { changed: true });
  assert.equal(replay.result.businessOutcome.status, "accepted");
  assert.equal(conflict.error.code, -32009);
  assert.equal(executions, 1);
});

test("Replay branch routes an array-shaped committed result through the serializer (no structuredContent)", async (t) => {
  // 锁定 bridge 重放分支（syno-tool-bridge.mjs:170 serializeForMcp(cached)）：
  // 跨重启幂等重放时，无论 commit 存了什么形状的 result，都不能回放数组型 structuredContent——
  // 否则 OpenCode chat-message 层 tool_result.structuredContent 再次以 invalid_type 拒绝，
  // 原始 bug 在「同一调用身份二次命中 committed」时间歇复现。
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-effect-replay-array-"));
  t.after(() => cleanup(root));
  const store = makeStore(root);
  let executions = 0;
  const tools = new ToolRegistry([{
    name: "settings.adjust", description: "Adjust", risk: "low", permission: "syno-settings", retry: "idempotent", version: "1",
    agentAdjustableBoundary: true,
    inputSchema: { type: "object", required: ["key"], properties: { key: { type: "string" } }, additionalProperties: false },
    outputSchema: { type: "array", items: { type: "object" } },
    // 故意让写工具返回顶层数组：验证重放分支对任意 result 形状都经 serializeForMcp 正确降级
    // （serializer 以运行时值 isPlainObject(result) 判定，而非声明 outputSchema）。
    execute: async () => { executions += 1; return [{ key: "quiet", changed: true }]; },
  }]);
  const call = (id) => ({ authorization: "Bearer secret", body: { jsonrpc: "2.0", id, method: "tools/call", params: { name: "settings_adjust", arguments: { key: "quiet" } } } });
  const makeBridge = () => new SynoToolBridge({ tools, token: "secret", effectReceipts: store });
  const first = makeBridge();
  const release1 = first.bindContext({ ownerKey: "owner", threadKey: "main", messageId: "message-replay-array", allowedTools: ["settings_adjust"] });
  const committed = await first.handle(call(1));
  release1();
  assert.equal(committed.result.directEffect.status, "committed");
  // 新 bridge 实例（模拟跨重启）：同 toolInvocationKey 命中 committed → 走重放分支。
  const second = makeBridge();
  const release2 = second.bindContext({ ownerKey: "owner", threadKey: "main", messageId: "message-replay-array", allowedTools: ["settings_adjust"] });
  const replay = await second.handle(call(2));
  release2();
  assert.equal(executions, 1); // 重放不重复执行写副作用
  assert.equal(replay.result.isError, false);
  // 数组型 cached → serializeForMcp 不产 structuredContent；完整数组仍走 content text（LLM 读到的内容不变）。
  assert.equal("structuredContent" in replay.result, false);
  assert.equal(replay.result.content[0].type, "text");
  const replayed = JSON.parse(replay.result.content[0].text);
  assert.ok(Array.isArray(replayed));
  // effect store 落盘前 canonicalize 会按字母序排 key；用 deepEqual 比对象（属性序无关）而非比原始字符串。
  assert.deepEqual(replayed, [{ key: "quiet", changed: true }]);
});

test("A pending receipt blocks a retry until reconciliation resolves it", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-effect-pending-"));
  t.after(() => cleanup(root));
  const store = makeStore(root);
  let executions = 0;
  const tools = new ToolRegistry([{
    name: "settings.adjust", description: "Adjust", risk: "low", permission: "syno-settings", retry: "idempotent", version: "1", agentAdjustableBoundary: true,
    inputSchema: { type: "object", additionalProperties: false }, outputSchema: { type: "object" }, execute: async () => { executions += 1; return {}; },
  }]);
  const bridge = new SynoToolBridge({ tools, token: "secret", effectReceipts: store });
  const release = bridge.bindContext({ ownerKey: "owner", threadKey: "main", messageId: "message-pending", allowedTools: ["settings_adjust"] });
  const args = { authorization: "Bearer secret", body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "settings_adjust", arguments: {} } } };
  const invocation = toolInvocationKey({ ownerKey: "owner", threadKey: "main", messageId: "message-pending", toolName: "settings_adjust" });
  const argumentsDigest = createHash("sha256").update(JSON.stringify({})).digest("hex");
  await store.begin({ toolInvocationKey: invocation, toolName: "settings.adjust", ownerKey: "owner", argumentsDigest });
  const response = await bridge.handle(args);
  release();
  assert.equal(response.result.isError, true);
  assert.match(response.result.content[0].text, /TOOL_INVOCATION_PENDING/);
  assert.equal(executions, 0);
});

test("Tool output validation failure stores a committed direct-effect receipt", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-effect-invalid-"));
  t.after(() => cleanup(root));
  const store = makeStore(root);
  const tools = new ToolRegistry([{
    name: "settings.adjust", description: "Adjust", risk: "low", permission: "syno-settings", retry: "idempotent", version: "1", agentAdjustableBoundary: true,
    inputSchema: { type: "object", additionalProperties: false }, outputSchema: { type: "object", required: ["changed"], properties: { changed: { type: "boolean" } }, additionalProperties: false },
    execute: async () => ({ invalidAfterWrite: true }),
  }]);
  const bridge = new SynoToolBridge({ tools, token: "secret", effectReceipts: store });
  const release = bridge.bindContext({ ownerKey: "owner", threadKey: "main", messageId: "message-invalid", allowedTools: ["settings_adjust"] });
  const response = await bridge.handle({ authorization: "Bearer secret", body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "settings_adjust", arguments: {} } } });
  release();
  assert.equal(response.result.isError, true);
  assert.equal(response.result.directEffect.status, "committed");
  assert.equal((await store.list({ status: "committed" })).length, 1);
});

test("Error-branch effectOutput bearing a secret is never persisted and the MCP response is redacted", async (t) => {
  // 锁定 bridge 错误分支脱敏门（syno-tool-bridge.mjs :225-240）：
  // 当 execute 的返回既违反 outputSchema 又夹带凭据时，validateValue 抛 TOOL_OUTPUT_INVALID
  // 并把 effectOutput 透传到 bridge 错误分支。修复前该分支直接 structuredContent: result 落盘 + 回灌，
  // 凭据形状既持久化又发回对端。修复后：含密 effectOutput 不 commit、回灌脱敏错误。
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-effect-redact-error-"));
  t.after(() => cleanup(root));
  const store = makeStore(root);
  const tools = new ToolRegistry([{
    name: "settings.adjust", description: "Adjust", risk: "low", permission: "syno-settings", retry: "idempotent", version: "1", agentAdjustableBoundary: true,
    inputSchema: { type: "object", required: ["key"], properties: { key: { type: "string" } }, additionalProperties: false },
    outputSchema: { type: "object", required: ["changed"], properties: { changed: { type: "boolean" } }, additionalProperties: false },
    // 违反 boolean outputSchema 且值夹带凭据：触发 output-validation 失败 + 含密 effectOutput。
    execute: async () => ({ changed: "Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456" }),
  }]);
  const bridge = new SynoToolBridge({ tools, token: "secret", effectReceipts: store });
  const release = bridge.bindContext({ ownerKey: "owner", threadKey: "main", messageId: "message-redact-error", allowedTools: ["settings_adjust"] });
  const response = await bridge.handle({ authorization: "Bearer secret", body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "settings_adjust", arguments: { key: "quiet" } } } });
  release();
  const serialized = JSON.stringify(response);
  assert.equal(response.result.isError, true);
  assert.match(serialized, /REMOTE_TOOL_RESULT_BLOCKED/);
  // 凭据形状绝不发回对端
  assert.doesNotMatch(serialized, /Authorization|Bearer|abcdefghijklmnop/i);
  // 含密 effectOutput 不落盘为 committed（保「redact→commit」不变量）
  const committed = await store.list({ status: "committed" });
  assert.equal(committed.length, 0);
});
