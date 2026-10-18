import test from "node:test";
import assert from "node:assert/strict";

import { ChannelConversationHandler } from "../packages/syno-core/channel-conversation-handler.mjs";

function makeHandler({ decisions = [], privateConversation = true, memories = [] } = {}) {
  const calls = [];
  const updates = [];
  const memoryOps = [];
  let modelRuns = 0;
  const handler = new ChannelConversationHandler({
    runtime: { async run() { modelRuns += 1; return { text: "model-reply" }; } },
    core: { async execute(request, context) { memoryOps.push({ request, context }); return { job: { id: "job-memory", status: "completed" } }; } },
    memoryStore: { async records() { return memories; } },
    pendingDecisions: {
      async list() { return decisions.map((item) => ({ expiresAt: new Date(Date.now() + 3_600_000).toISOString(), ...item })); },
      async update(id, patch) { updates.push({ id, patch }); },
    },
    ingestWorkflows: {
      async status(id) { return { id, stage: "awaiting_decision" }; },
      async decide(id, decision, context) {
        calls.push({ id, decision, context });
        return { workflow: { id }, result: { job: { id: "job-1", status: "completed" } } };
      },
    },
  });
  return { handler, calls, updates, memoryOps, modelRuns: () => modelRuns };
}

test("a plain 确认 resolves the single capture decision without the model", async () => {
  const { handler, calls, updates, modelRuns } = makeHandler({
    decisions: [{ id: "decision-1", kind: "single", artifactId: "artifact-1", approvalCode: "ABC123", diffDigest: "digest-1" }],
  });
  const result = await handler.handle({ id: "fs-1", ownerKey: "owner", threadKey: "main", channel: "feishu", privateConversation: true, text: "确认" });
  assert.equal(modelRuns(), 0, "快路径不得进入模型回合");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].decision.action, "approve");
  assert.equal(calls[0].decision.code, "ABC123");
  assert.match(result.text, /已确认收录/);
  assert.equal(updates.length, 1, "确认为一次性消费");
  assert.ok(updates[0].patch.consumedAt);
});

test("分开保存 maps to approve (the current plan) instead of a revision", async () => {
  const { handler, calls, modelRuns } = makeHandler({
    decisions: [{ id: "decision-1", kind: "single", artifactId: "artifact-1", approvalCode: "ABC123" }],
  });
  await handler.handle({ id: "fs-2", ownerKey: "owner", threadKey: "main", channel: "feishu", privateConversation: true, text: "分开保存" });
  assert.equal(modelRuns(), 0);
  assert.equal(calls[0].decision.action, "approve");
});

test("multiple pending decisions never fall through to a guessing model", async () => {
  const { handler, calls, modelRuns } = makeHandler({
    decisions: [
      { id: "decision-1", kind: "single", artifactId: "artifact-1", summary: "收录 A" },
      { id: "decision-2", kind: "single", artifactId: "artifact-2", summary: "收录 B" },
    ],
  });
  const result = await handler.handle({ id: "fs-3", ownerKey: "owner", threadKey: "main", channel: "feishu", privateConversation: true, text: "确认" });
  assert.equal(modelRuns(), 0);
  assert.equal(calls.length, 0, "多条时不能猜");
  assert.match(result.text, /2 项待确认/);
  assert.match(result.text, /收录 A/);
  assert.match(result.text, /收录 B/);
});

test("group chats and knowledge (delete/merge) decisions never use the fast path", async () => {
  const knowledge = makeHandler({
    decisions: [{ id: "decision-k", kind: "knowledge", plan: {}, summary: "删除 A", artifactId: "artifact-k" }],
  });
  assert.equal((await knowledge.handler.handle({ id: "fs-4", ownerKey: "owner", threadKey: "main", channel: "feishu", privateConversation: true, text: "确认" })).text, "model-reply");
  const group = makeHandler({ decisions: [{ id: "decision-1", kind: "single", artifactId: "artifact-1" }], privateConversation: false });
  assert.equal((await group.handler.handle({ id: "fs-5", ownerKey: "owner", threadKey: "main", channel: "feishu", privateConversation: false, text: "确认" })).text, "model-reply");
});

test("a plain 确认 promotes the single memory candidate without the model", async () => {
  const { handler, memoryOps, modelRuns } = makeHandler({
    memories: [{ record: { id: "memory-1", schemaVersion: 2, status: "proposed" }, version: "v1" }],
  });
  const result = await handler.handle({ id: "fs-mem-1", ownerKey: "owner", threadKey: "main", channel: "feishu", privateConversation: true, text: "确认" });
  assert.equal(modelRuns(), 0, "记忆确认不再依赖模型");
  assert.equal(memoryOps.length, 1);
  assert.equal(memoryOps[0].request.operation, "memory.promote");
  assert.equal(memoryOps[0].request.payload.confirmationMessageId, "fs-mem-1");
  assert.match(result.text, /已确认长期记忆 memory-1/);
});

test("丢弃 rejects the single memory candidate deterministically", async () => {
  const { handler, memoryOps, modelRuns } = makeHandler({
    memories: [{ record: { id: "memory-2", schemaVersion: 2, status: "proposed" }, version: "v2" }],
  });
  const result = await handler.handle({ id: "fs-mem-2", ownerKey: "owner", threadKey: "main", channel: "feishu", privateConversation: true, text: "丢弃" });
  assert.equal(modelRuns(), 0);
  assert.equal(memoryOps[0].request.operation, "memory.reject");
  assert.match(result.text, /已丢弃记忆候选 memory-2/);
});

test("one capture decision + one memory candidate: 确认 never guesses, lists both", async () => {
  const { handler, calls, memoryOps, modelRuns } = makeHandler({
    decisions: [{ id: "decision-1", kind: "single", artifactId: "artifact-1", summary: "收录《Anthropic 调查》" }],
    memories: [{ record: { id: "memory-1", schemaVersion: 2, status: "proposed", statement: "以后用中文回答" }, version: "v1" }],
  });
  const result = await handler.handle({ id: "fs-multi-1", ownerKey: "owner", threadKey: "main", channel: "feishu", privateConversation: true, text: "确认" });
  assert.equal(modelRuns(), 0);
  assert.equal(calls.length, 0, "不能猜收录");
  assert.equal(memoryOps.length, 0, "不能猜记忆");
  assert.match(result.text, /2 项待确认/);
  assert.match(result.text, /Anthropic/);
  assert.match(result.text, /中文回答/);
});
