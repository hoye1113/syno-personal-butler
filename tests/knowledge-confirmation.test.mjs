import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { judgeKnowledgeConfirmation, parseKnowledgeConfirmation } from "../apps/syno/syno/knowledge-confirmation.mjs";

const decisions = [{ id: "decision-only", summary: "删除《样本笔记 A》" }];

function runtimeReturning(text) {
  return { async run() { return { text }; } };
}

test("confirmation is a separate no-tool request and accepts only approve with a preview ID", async () => {
  let request, context;
  const runtime = { async run(r, c) { request = r; context = c; return { text: '{"intent":"approve","approvedId":"decision-only"}' }; } };
  assert.equal(await judgeKnowledgeConfirmation(runtime, { message: "可以，就按刚才的方案办", decisions }), "decision-only");
  assert.deepEqual(context.allowedTools, []);
  assert.equal(context.channel, "confirmation");
  const payload = JSON.parse(request.text);
  assert.equal(payload.ownerMessage, "可以，就按刚才的方案办");
  assert.match(payload.task, /request_confirmation/);
  assert.match(payload.task, /approvedId/);
});

test("requesting confirmation, denying, discussing and ambiguity never authorize, even if an ID is echoed", async () => {
  for (const text of [
    '{"intent":"request_confirmation","approvedId":null}',
    '{"intent":"request_confirmation","approvedId":"decision-only"}',
    '{"intent":"deny","approvedId":"decision-only"}',
    '{"intent":"discuss","approvedId":null}',
    '{"intent":"ambiguous","approvedId":null}',
  ]) {
    assert.equal(await judgeKnowledgeConfirmation(runtimeReturning(text), { message: "请确认删除刚才预览的《样本笔记 A》", decisions }), null, text);
  }
});

test("invalid JSON, unknown intent, missing ID or an ID outside the previews fail closed", async () => {
  for (const text of [
    "not json",
    '{"approvedId":"decision-only"}',
    '{"intent":"confirm","approvedId":"decision-only"}',
    '{"intent":"approve","approvedId":null}',
    '{"intent":"approve","approvedId":"invented"}',
  ]) {
    assert.equal(await judgeKnowledgeConfirmation(runtimeReturning(text), { message: "可以", decisions }), null, text);
  }
  assert.throws(() => parseKnowledgeConfirmation("not json", decisions), { code: "CONFIRMATION_INVALID_JSON" });
  assert.throws(() => parseKnowledgeConfirmation('{"intent":"confirm","approvedId":null}', decisions), { code: "CONFIRMATION_INVALID_INTENT" });
  assert.throws(() => parseKnowledgeConfirmation('{"intent":"approve","approvedId":null}', decisions), { code: "CONFIRMATION_MISSING_ID" });
  assert.throws(() => parseKnowledgeConfirmation('{"intent":"approve","approvedId":"invented"}', decisions), { code: "CONFIRMATION_INVALID_ID" });
  assert.deepEqual(
    parseKnowledgeConfirmation('{"intent":"request_confirmation","approvedId":"decision-only"}', decisions),
    { intent: "request_confirmation", approvedId: null },
  );
});

test("natural approvals still pass through the shared parser", async () => {
  for (const message of ["可以，就按刚才的方案办", "确认 Anthropic 那条", "批准这次合并"]) {
    const runtime = runtimeReturning('{"intent":"approve","approvedId":"decision-only"}');
    assert.equal(await judgeKnowledgeConfirmation(runtime, { message, decisions }), "decision-only", message);
  }
});

test("confirmation persona and request prompt keep the same intent rules", async () => {
  const persona = await fs.readFile(path.resolve(import.meta.dirname, "../config/deepseek-harness/syno-confirmation-agent.md"), "utf8");
  for (const marker of ["approve", "request_confirmation", "deny", "discuss", "ambiguous", "approvedId", "引用", "假设", "附件"]) {
    assert.match(persona, new RegExp(marker));
  }
});
