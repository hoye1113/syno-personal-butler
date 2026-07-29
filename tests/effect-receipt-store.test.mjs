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
