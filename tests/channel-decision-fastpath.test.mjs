import test from "node:test";
import assert from "node:assert/strict";

import { ChannelConversationHandler } from "../packages/syno-core/channel-conversation-handler.mjs";

function makeHandler({ decisions = [], privateConversation = true } = {}) {
  const calls = [];
  let modelRuns = 0;
  const handler = new ChannelConversationHandler({
    runtime: { async run() { modelRuns += 1; return { text: "model-reply" }; } },
    core: {},
    pendingDecisions: { async list() { return decisions.map((item) => ({ expiresAt: new Date(Date.now() + 3_600_000).toISOString(), ...item })); } },
    ingestWorkflows: {
      async status(id) { return { id, stage: "awaiting_decision" }; },
      async decide(id, decision, context) {
        calls.push({ id, decision, context });
        return { workflow: { id }, result: { job: { id: "job-1", status: "completed" } } };
      },
    },
  });
  return { handler, calls, modelRuns: () => modelRuns };
}

test("a plain 确认 resolves the single capture decision without the model", async () => {
  const { handler, calls, modelRuns } = makeHandler({
    decisions: [{ id: "decision-1", kind: "single", artifactId: "artifact-1", approvalCode: "ABC123", diffDigest: "digest-1" }],
  });
  const result = await handler.handle({ id: "fs-1", ownerKey: "owner", threadKey: "main", channel: "feishu", privateConversation: true, text: "确认" });
  assert.equal(modelRuns(), 0, "快路径不得进入模型回合");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].decision.action, "approve");
  assert.equal(calls[0].decision.code, "ABC123");
  assert.match(result.text, /已确认收录/);
});

test("分开保存 maps to approve (the current plan) instead of a revision", async () => {
  const { handler, calls, modelRuns } = makeHandler({
    decisions: [{ id: "decision-1", kind: "single", artifactId: "artifact-1", approvalCode: "ABC123" }],
  });
  await handler.handle({ id: "fs-2", ownerKey: "owner", threadKey: "main", channel: "feishu", privateConversation: true, text: "分开保存" });
  assert.equal(modelRuns(), 0);
  assert.equal(calls[0].decision.action, "approve");
});

test("multiple pending decisions fall through to the model", async () => {
  const { handler, modelRuns } = makeHandler({
    decisions: [
      { id: "decision-1", kind: "single", artifactId: "artifact-1" },
      { id: "decision-2", kind: "single", artifactId: "artifact-2" },
    ],
  });
  const result = await handler.handle({ id: "fs-3", ownerKey: "owner", threadKey: "main", channel: "feishu", privateConversation: true, text: "确认" });
  assert.equal(modelRuns(), 1);
  assert.equal(result.text, "model-reply");
});

test("group chats and knowledge (delete/merge) decisions never use the fast path", async () => {
  const knowledge = makeHandler({ decisions: [{ id: "decision-k", kind: "knowledge", plan: {} }] });
  assert.equal((await knowledge.handler.handle({ id: "fs-4", ownerKey: "owner", threadKey: "main", channel: "feishu", privateConversation: true, text: "确认" })).text, "model-reply");
  const group = makeHandler({ decisions: [{ id: "decision-1", kind: "single", artifactId: "artifact-1" }], privateConversation: false });
  assert.equal((await group.handler.handle({ id: "fs-5", ownerKey: "owner", threadKey: "main", channel: "feishu", privateConversation: false, text: "确认" })).text, "model-reply");
});
