// 契约测试：用 OpenCode 实际安装的 zod 复刻其「tool result → LLM 对话消息」层校验
// structuredContent 的 schema，从 schema 层证明修复后不再触发 invalid_type。
//
// 背景（fact-check 核实）：MCP CallToolResult 层接受任意 structuredContent；真正抛 invalid_type
// 的是 OpenCode 把工具结果转对话消息时 tool_result.structuredContent = z.object({}).loose().optional()
// （要求顶层 object 或缺省，数组/null/标量被以 invalid_type 拒绝）。本测试用同一份 zod v4 复刻该校验。
//
// zod 取自 opencode profile（仓库无本地 zod）：仅在路径存在时实跑；否则整组 skip，
// 不影响无此安装的环境。

import assert from "node:assert/strict";
import test from "node:test";

import { SynoToolBridge } from "../apps/syno/syno/syno-tool-bridge.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";

const ZOD_URL = "file:///C:/Users/38788/AppData/Local/Syno/opencode/profile/config/opencode/node_modules/zod/index.js";
let z = null;
try { z = (await import(ZOD_URL)).z; } catch { z = null; }

// 与 OpenCode tool_result.structuredContent 同构：顶层 object 或缺省。
const structuredContentSchema = z ? z.object({}).loose().optional() : null;
const SKIP = !z;

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

test("OpenCode zod schema 以 invalid_type 拒绝裸数组（复现原 bug，证明本测试有意义）", { skip: SKIP }, () => {
  assert.throws(
    () => structuredContentSchema.parse([{ a: 1 }]),
    (error) => error?.issues?.[0]?.code === "invalid_type",
  );
});

test("OpenCode zod schema 接受 object 与缺省（undefined）", { skip: SKIP }, () => {
  structuredContentSchema.parse({ available: true }); // 不抛
  structuredContentSchema.parse(undefined); // 不抛
});

for (const [name, stub] of ARRAY_TOOLS) {
  test(`数组工具 ${name}：bridge 输出通过 zod schema（不再 invalid_type）`, { skip: SKIP }, async () => {
    const out = await callTool({ name, outputSchema: { type: "array", items: { type: "object" } }, stub });
    assert.equal("structuredContent" in out.result, false); // 数组结果不产 structuredContent
    structuredContentSchema.parse(out.result.structuredContent); // 不抛即通过 = OpenCode 不会再回灌 invalid_type
    assert.ok(Array.isArray(JSON.parse(out.result.content[0].text))); // 完整数组仍走 content text
  });
}

test("object 工具 browser.status：bridge 输出通过 zod schema", { skip: SKIP }, async () => {
  const out = await callTool({ name: "browser.status", outputSchema: { type: "object" }, stub: { available: true } });
  structuredContentSchema.parse(out.result.structuredContent);
  assert.deepEqual(out.result.structuredContent, { available: true });
});
