import assert from "node:assert/strict";
import test from "node:test";

import { serializeForMcp, serializeForToolMessage, redactResultObject, inferOutputShape, isPlainObject } from "../apps/syno/syno/tool-result-serializer.mjs";

const arrayTool = { name: "knowledge.search", outputSchema: { type: "array", items: { type: "object" } } };
const objectTool = { name: "browser.status", outputSchema: { type: "object" } };
const scalarTool = { name: "today.read", outputSchema: { type: "string" } };

test("serializeForMcp: 数组结果不产 structuredContent，完整结果走 content text", () => {
  const result = [{ path: "vault/note.md", query: "agent" }];
  const out = serializeForMcp(result);
  assert.equal("structuredContent" in out, false);
  assert.deepEqual(out.content, [{ type: "text", text: JSON.stringify(result) }]);
  assert.equal(out.truncated, undefined);
});

test("serializeForMcp: 对象结果保留 structuredContent", () => {
  const result = { available: true };
  const out = serializeForMcp(result);
  assert.deepEqual(out.structuredContent, result);
  assert.deepEqual(out.content, [{ type: "text", text: JSON.stringify(result) }]);
});

test("serializeForMcp: 标量与 null 不产 structuredContent", () => {
  assert.equal("structuredContent" in serializeForMcp("hello"), false);
  assert.equal("structuredContent" in serializeForMcp(null), false);
  assert.equal("structuredContent" in serializeForMcp(42), false);
});

test("serializeForMcp: 含密结果 fail-closed 抛 REMOTE_TOOL_RESULT_BLOCKED", () => {
  const secret = { content: "Authorization: Bearer abcdefghijklmnop" };
  assert.throws(() => serializeForMcp(secret), (error) => error.code === "REMOTE_TOOL_RESULT_BLOCKED");
});

test("serializeForMcp: redact:false 跳过脱敏门（用于信任存储的重放路径）", () => {
  const secret = { content: "Authorization: Bearer abcdefghijklmnop" };
  const out = serializeForMcp(secret, { redact: false });
  assert.deepEqual(out.structuredContent, secret); // 不抛、原样
});

test("serializeForMcp: charLimit 超阈截断 content text 并标记 truncated", () => {
  const big = { body: "x".repeat(500) };
  const out = serializeForMcp(big, { charLimit: 100 });
  assert.equal(out.truncated, true);
  assert.ok(out.content[0].text.length < 500);
  assert.ok(out.content[0].text.endsWith("…[truncated]"));
  assert.deepEqual(out.structuredContent, big); // 截断只作用 content text，structuredContent 不动
});

test("serializeForToolMessage: 返回字符串且数组结果完整", () => {
  const result = [{ a: 1 }];
  assert.equal(serializeForToolMessage(result), JSON.stringify(result));
});

test("serializeForToolMessage: 含密结果回灌脱敏串而非 throw（不中断 turn）", () => {
  const secret = { content: "Authorization: Bearer abcdefghijklmnop" };
  const text = serializeForToolMessage(secret);
  assert.equal(typeof text, "string");
  const parsed = JSON.parse(text);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error.code, "REMOTE_TOOL_RESULT_BLOCKED");
  assert.doesNotMatch(text, /abcdefghijklmnop|Authorization|Bearer/);
});

test("redactResultObject: 安全时原样返回对象引用", () => {
  const result = { available: true };
  assert.equal(redactResultObject(result), result);
});

test("redactResultObject: 含密时返回 {ok:false,error} stub（保对象契约，不 throw）", () => {
  const secret = { content: "Authorization: Bearer abcdefghijklmnop" };
  const out = redactResultObject(secret);
  assert.equal(out.ok, false);
  assert.equal(out.error.code, "REMOTE_TOOL_RESULT_BLOCKED");
  assert.doesNotMatch(JSON.stringify(out), /abcdefghijklmnop|Authorization|Bearer/);
});

test("isPlainObject: 对象为 true，数组/null/原始值 为 false", () => {
  assert.equal(isPlainObject({}), true);
  assert.equal(isPlainObject([]), false);
  assert.equal(isPlainObject(null), false);
  assert.equal(isPlainObject("x"), false);
  assert.equal(isPlainObject(0), false);
});

test("inferOutputShape: 按 outputSchema.type 推断 list/object/scalar", () => {
  assert.equal(inferOutputShape(arrayTool), "list");
  assert.equal(inferOutputShape(objectTool), "object");
  assert.equal(inferOutputShape(scalarTool), "scalar");
  assert.equal(inferOutputShape({ outputSchema: {} }), "scalar");
  assert.equal(inferOutputShape({}), "scalar");
});
