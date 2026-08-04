// 契约测试：从 schema 层证明 bridge 序列化输出永远不触发 MCP 的 invalid_type。
//
// 拒绝点（fact-check + MCP SDK 1.30 实测核实）：MCP SDK 的 CallToolResultSchema.structuredContent
// 定义为 z.record(z.string(), z.unknown()).optional()（@modelcontextprotocol/sdk/types.js）。
// 数组传入 → safeParse 以 invalid_type 拒绝（"Invalid input: expected record, received array"，
// path=["structuredContent"]）。这就是管家微信搜文章时 OpenCode 回灌 invalid_type / 「应为对象却收到数组」的根因。
//
// 早期分析曾误定位为 OpenCode chat-message 层的 z.object({}).loose()；实测 MCP SDK 的 z.record 即拒绝点
// （两者对数组同样报 invalid_type，但真值是 MCP SDK 层）。本测试用真实 CallToolResultSchema 做端到端验证，
// 并保留一份显式 z.record 复刻（不依赖 SDK 内部实现，锁定「structuredContent 形态 = record」这一论断）。
//
// 依赖通过 devDependencies 提供（zod + @modelcontextprotocol/sdk），bare import 可移植，无本机绝对路径。

import assert from "node:assert/strict";
import test from "node:test";

import { z } from "zod";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

import { SynoToolBridge } from "../apps/syno/syno/syno-tool-bridge.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";

// 显式复刻 MCP SDK structuredContent 字段形态（z.record），锁定论断；与上方真实 schema 同构。
const structuredContentField = z.record(z.string(), z.unknown()).optional();

function bridgeName(name) {
  return name.replaceAll(".", "_").replaceAll("-", "_");
}

async function callTool({ name, outputSchema, stub }) {
  const tools = new ToolRegistry([{
    name,
    description: "contract probe",
    risk: "read",
    permission: "syno-read",
    retry: "safe",
    version: "1",
    inputSchema: { type: "object", additionalProperties: false },
    outputSchema,
    execute: async () => stub,
  }]);
  const bridge = new SynoToolBridge({ tools, token: "contract-secret" });
  const bn = bridgeName(name);
  const release = bridge.bindContext({ ownerKey: "owner", threadKey: "main", messageId: "contract-1", allowedTools: [bn] });
  const out = await bridge.handle({
    authorization: "Bearer contract-secret",
    body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: bn, arguments: {} } },
  });
  release();
  return out;
}

const ARRAY_TOOLS = [
  ["knowledge.search", [{ path: "vault/n.md", score: 0.9 }]],
  ["learning.due", [{ itemId: "x", due: "2026-08-04" }]],
  ["capture.list_pending", [{ artifactId: "a" }]],
  ["goals.list", [{ goalId: "g" }]],
  ["jobs.list", [{ jobId: "j" }]],
];

test("复刻 z.record schema 以 invalid_type 拒绝裸数组（复现原 bug，证明校验有效）", () => {
  assert.throws(
    () => structuredContentField.parse([{ a: 1 }]),
    (error) => error?.issues?.[0]?.code === "invalid_type",
  );
});

test("复刻 z.record schema 接受 object 与缺省（undefined）", () => {
  structuredContentField.parse({ available: true }); // 不抛
  structuredContentField.parse(undefined); // 不抛
});

test("真实 CallToolResultSchema 以 invalid_type 拒绝数组 structuredContent（锁定拒绝点 = MCP SDK 层）", () => {
  // 这条直接复现管家搜文章时的报错：数组 structuredContent 被 MCP SDK 拒，path 命中 structuredContent。
  const parsed = CallToolResultSchema.safeParse({ content: [{ type: "text", text: "x" }], structuredContent: [{ a: 1 }] });
  assert.equal(parsed.success, false);
  assert.equal(parsed.error.issues[0].code, "invalid_type");
  assert.deepEqual(parsed.error.issues[0].path, ["structuredContent"]);
});

for (const [name, stub] of ARRAY_TOOLS) {
  test(`数组工具 ${name}：bridge 输出通过真实 CallToolResultSchema（端到端，不再 invalid_type）`, async () => {
    const out = await callTool({ name, outputSchema: { type: "array", items: { type: "object" } }, stub });
    assert.equal("structuredContent" in out.result, false); // 数组结果不产 structuredContent
    // 端到端：bridge 全响应（含 directEffect/businessOutcome 额外字段）经真实 MCP schema 校验通过。
    const parsed = CallToolResultSchema.safeParse(out.result);
    assert.equal(parsed.success, true, JSON.stringify(parsed.error?.issues));
    assert.ok(Array.isArray(JSON.parse(out.result.content[0].text))); // 完整数组仍走 content text，LLM 读到的内容不变
  });
}

test("object 工具 browser.status：bridge 输出通过真实 CallToolResultSchema", async () => {
  const out = await callTool({ name: "browser.status", outputSchema: { type: "object" }, stub: { available: true } });
  assert.deepEqual(out.result.structuredContent, { available: true });
  const parsed = CallToolResultSchema.safeParse(out.result);
  assert.equal(parsed.success, true, JSON.stringify(parsed.error?.issues));
});
