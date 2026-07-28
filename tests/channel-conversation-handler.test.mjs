import assert from "node:assert/strict";
import test from "node:test";

import { ChannelConversationHandler } from "../apps/syno/syno/channel-conversation-handler.mjs";

test("ChannelConversationHandler routes ordinary cross-channel messages to one Owner main session", async () => {
  const runs = [];
  const handler = new ChannelConversationHandler({
    runtime: {
      async run(request, context) { runs.push({ request, context }); return { text: `reply:${request.text}` }; },
      async newConversation() { return { openCodeSessionId: "new-session" }; },
    },
    core: {},
    ingest: {},
    pendingDecisions: { async parse() { throw new Error("not called"); } },
  });
  assert.deepEqual(await handler.handle({ id: "wx-1", ownerKey: "owner", senderId: "wx-owner", channel: "weixin", text: "你好" }), { text: "reply:你好" });
  assert.deepEqual(await handler.handle({ id: "fs-1", ownerKey: "owner", senderId: "fs-owner", channel: "feishu", text: "继续" }), { text: "reply:继续" });
  assert.deepEqual(runs.map((item) => [item.context.ownerKey, item.context.threadKey]), [["owner", "main"], ["owner", "main"]]);
});

test("ChannelConversationHandler receives URL before invoking the model and records source message identity", async () => {
  const received = [];
  const proposed = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run() { throw new Error("model must not run"); } },
    core: {},
    ingest: {
      async receive(payload, context) { received.push({ payload, context }); return { artifact: { id: "artifact-1" }, proposalPending: true }; },
      async propose(id) { proposed.push(id); },
    },
    pendingDecisions: {},
  });
  const response = await handler.handle({ id: "wx-url", ownerKey: "owner", senderId: "owner", channel: "weixin", text: "https://example.com/post" });
  assert.match(response.text, /artifact-1/);
  assert.equal(received[0].context.messageId, "wx-url");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(proposed, ["artifact-1"]);
});

test("ChannelConversationHandler resolves natural approval before OpenCode and binds it to Owner thread", async () => {
  const approvals = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run() { throw new Error("model must not parse approvals"); } },
    core: {
      async approve(jobId, input) { approvals.push({ jobId, input }); return { job: { id: jobId, status: "running" } }; },
      async reject() { throw new Error("not called"); },
    },
    ingest: {},
    pendingDecisions: {
      async parse(text, context) {
        assert.equal(text, "可以");
        assert.equal(context.ownerKey, "owner");
        assert.equal(context.threadKey, "main");
        assert.equal(context.diffDigest, undefined);
        assert.equal(context.getDiffDigest, undefined);
        return { action: "approve", code: "ABC123", decision: { jobId: "job-20260728-12345678" } };
      },
      async update() {},
    },
  });
  const response = await handler.handle({ id: "fs-approve", ownerKey: "owner", senderId: "feishu-owner", channel: "feishu", text: "可以", privateConversation: true });
  assert.match(response.text, /已确认/);
  assert.equal(approvals[0].input.channel, "feishu");
  assert.equal(approvals[0].input.code, "ABC123");
});

test("ChannelConversationHandler verifies final approval against the authoritative current Job digest", async () => {
  let digestResolver;
  const approvals = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run() { throw new Error("model must not parse approvals"); } },
    core: {
      async inspect(jobId) {
        assert.equal(jobId, "job-20260728-87654321");
        return { result: { diffHash: "digest-current" } };
      },
      async approve(jobId, input) {
        approvals.push({ jobId, input });
        return { job: { id: jobId, status: "completed" } };
      },
    },
    ingest: {},
    pendingDecisions: {
      async parse(text, context) {
        assert.equal(text, "确认应用 ABC123");
        digestResolver = context.getDiffDigest;
        assert.equal(await digestResolver("job-20260728-87654321"), "digest-current");
        return {
          action: "approve",
          code: "ABC123",
          decision: { jobId: "job-20260728-87654321", diffDigest: "digest-current" },
        };
      },
      async update() {},
    },
  });

  const response = await handler.handle({
    id: "wx-final",
    ownerKey: "owner",
    senderId: "weixin-owner",
    channel: "weixin",
    text: "确认应用 ABC123",
    privateConversation: true,
  });
  assert.match(response.text, /已确认任务/);
  assert.equal(approvals[0].input.diffDigest, "digest-current");
});

test("ChannelConversationHandler supports deterministic new conversation without asking OpenCode", async () => {
  let created;
  const handler = new ChannelConversationHandler({
    runtime: {
      async run() { throw new Error("not called"); },
      async newConversation(context) { created = context; return { openCodeSessionId: "new-session" }; },
    },
    core: {},
    ingest: {},
    pendingDecisions: {},
  });
  assert.deepEqual(await handler.handle({ ownerKey: "owner", channel: "weixin", text: "/新对话" }), { text: "已开启新对话。" });
  assert.deepEqual(created, { ownerKey: "owner", threadKey: "main" });
});

test("ChannelConversationHandler releases a consumed decision when the authoritative action fails", async () => {
  const updates = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run() { throw new Error("model must not run"); } },
    core: {
      async approve() { throw new Error("temporary merge failure"); },
      async inspect() { return { status: "awaiting_approval" }; },
    },
    ingest: {},
    pendingDecisions: {
      async parse() { return { action: "approve", code: "ABC123", decision: { id: "decision-1", jobId: "job-1" } }; },
      async update(id, patch) { updates.push({ id, patch }); },
    },
  });
  const response = await handler.handle({ ownerKey: "owner", senderId: "owner", channel: "feishu", text: "可以", privateConversation: true });
  assert.match(response.text, /temporary merge failure/);
  assert.deepEqual(updates, [{ id: "decision-1", patch: { reservedAt: null } }]);
});

test("ChannelConversationHandler isolates attachments before interpreting approval-like text", async () => {
  let parsed = false;
  const received = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run() { throw new Error("model must not run"); } },
    core: {},
    ingest: {
      async receive(payload) { received.push(payload); return { artifact: { id: "artifact-attachment" } }; },
      async propose() {},
    },
    pendingDecisions: { async parse() { parsed = true; } },
    attachmentToPayload: async () => ({ kind: "markdown", value: "# 确认" }),
  });
  const response = await handler.handle({
    id: "attachment-approval",
    ownerKey: "owner",
    senderId: "owner",
    channel: "weixin",
    text: "可以",
    privateConversation: true,
    artifacts: [{ filename: "确认.md" }],
  });
  assert.match(response.text, /artifact-attachment/);
  assert.equal(received.length, 1);
  assert.equal(parsed, false);
});

test("ChannelConversationHandler never accepts an approval outside an explicit private conversation", async () => {
  let parsed = false;
  const handler = new ChannelConversationHandler({
    runtime: { async run() { throw new Error("model must not run"); } },
    core: {},
    ingest: {},
    pendingDecisions: { async parse() { parsed = true; } },
  });
  const response = await handler.handle({
    ownerKey: "owner",
    senderId: "owner",
    channel: "weixin",
    text: "可以",
    privateConversation: false,
  });
  assert.match(response.text, /明确私聊/);
  assert.equal(parsed, false);
});

test("ChannelConversationHandler durably queues a chat when OpenCode is unavailable", async () => {
  const calls = [];
  const handler = new ChannelConversationHandler({
    runtime: {
      async run() {
        throw Object.assign(new Error("provider offline"), { code: "OPENCODE_ATTEMPTS_EXHAUSTED", retryable: true });
      },
    },
    core: {
      async execute(request, context) {
        calls.push({ request, context });
        return { job: { id: "job-waiting", status: "waiting_provider" } };
      },
    },
    ingest: {},
    pendingDecisions: {},
  });
  const response = await handler.handle({
    id: "wx-offline",
    ownerKey: "owner",
    senderId: "weixin-owner",
    channel: "weixin",
    text: "继续讲上一个问题",
  });
  assert.match(response.text, /job-waiting/);
  assert.equal(calls[0].context.ownerKey, "owner");
  assert.equal(calls[0].context.threadKey, "main");
  assert.equal(calls[0].context.messageId, "wx-offline");
});

test("ChannelConversationHandler persists a modification as a revised ingest proposal and invalidates the old approval", async () => {
  const updates = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run() { throw new Error("model must not run"); } },
    core: {
      async requestModification(jobId, modification) {
        assert.equal(jobId, "job-ingest");
        assert.equal(modification, "标题改得更清楚");
        return { job: { id: jobId, status: "awaiting_approval" } };
      },
    },
    ingest: {
      async revise(artifactId, modification) {
        assert.equal(artifactId, "artifact-1");
        assert.equal(modification, "标题改得更清楚");
        return { proposal: { id: "ingest-revised" } };
      },
    },
    pendingDecisions: {
      async parse() {
        return {
          action: "modify",
          modification: "标题改得更清楚",
          decision: { id: "decision-1", jobId: "job-ingest", artifactId: "artifact-1" },
        };
      },
      async update(id, patch) { updates.push({ id, patch }); },
    },
  });
  const response = await handler.handle({
    ownerKey: "owner",
    senderId: "owner",
    channel: "feishu",
    text: "修改：标题改得更清楚",
    privateConversation: true,
  });
  assert.match(response.text, /ingest-revised/);
  assert.equal(updates[0].id, "decision-1");
  assert.ok(updates[0].patch.consumedAt);
});
