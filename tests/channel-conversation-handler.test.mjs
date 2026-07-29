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

test("ChannelConversationHandler shadow-persists mobile text before model execution without changing reply flow", async () => {
  const accepted = [];
  const runs = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run(request) { runs.push(request); return { text: "shadow-reply" }; } },
    core: {},
    ingest: {},
    pendingDecisions: {},
    acceptedRequests: { async accept(input) { accepted.push(input); return { created: true, request: { requestId: "request-1" } }; } },
  });
  const response = await handler.handle({
    id: "wx-shadow-1",
    ownerKey: "owner",
    senderId: "owner",
    contextToken: "context-token",
    channel: "weixin",
    text: "移动 shadow 测试",
  });
  assert.deepEqual(response, { text: "shadow-reply" });
  assert.equal(runs.length, 1);
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].originChannel, "weixin");
  assert.equal(accepted[0].platformMessageId, "wx-shadow-1");
  assert.deepEqual(accepted[0].payload, { text: "移动 shadow 测试", attachments: [] });
  assert.deepEqual(accepted[0].deliveryTarget, { toUserId: "owner", contextToken: "context-token" });
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

test("ChannelConversationHandler deterministically captures an embedded URL only with explicit intent", async () => {
  const calls = [];
  const model = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run(request) { model.push(request.text); return { text: "ordinary" }; } },
    core: {},
    ingestWorkflows: {
      async receive(payload, context) {
        calls.push({ payload, context });
        return { artifact: { id: "artifact-new" }, workflow: { id: "workflow-new" }, duplicate: false };
      },
    },
    pendingDecisions: {},
  });

  assert.match((await handler.handle({ id: "capture-1", ownerKey: "owner", channel: "weixin", text: "请收录 https://example.com/a" })).text, /workflow-new/);
  assert.equal(calls[0].payload.kind, "url");
  assert.equal(model.length, 0);
  assert.deepEqual(await handler.handle({ id: "chat-1", ownerKey: "owner", channel: "weixin", text: "解释 https://example.com/a 的观点" }), { text: "ordinary" });
  assert.equal(model.length, 1);
});

test("ChannelConversationHandler supports local-only personal capture and deterministic status", async () => {
  const calls = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run() { throw new Error("model must not run"); } },
    core: {},
    ingestWorkflows: {
      async receive(payload) {
        calls.push(payload);
        return { artifact: { id: "artifact-personal" }, workflow: { id: "workflow-personal" }, duplicate: false };
      },
      async listPending() { return [{ id: "workflow-personal", stage: "classifying" }]; },
    },
    pendingDecisions: {},
  });

  assert.match((await handler.handle({ id: "personal-1", ownerKey: "owner", channel: "feishu", text: "仅本地 收录我的想法：第一性原理" })).text, /workflow-personal/);
  assert.equal(calls[0].kind, "personal");
  assert.equal(calls[0].analysisMode, "local-only");
  assert.match((await handler.handle({ ownerKey: "owner", channel: "feishu", text: "收录进度" })).text, /正在整理来源/);
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

test("ChannelConversationHandler verifies a bound diff digest against the authoritative current Job on confirmation", async () => {
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
        assert.equal(text, "可以");
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
    text: "可以",
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

test("ChannelConversationHandler supports natural-language new conversation and capability summary", async () => {
  let created;
  const handler = new ChannelConversationHandler({
    runtime: {
      async run() { throw new Error("not called"); },
      async newConversation(context) { created = context; return { openCodeSessionId: "new-session" }; },
      capabilities() { return { tools: ["syno_capture_start"] }; },
      async health() { return { ready: true }; },
    },
    core: {},
    ingestWorkflows: { async listPending() { return [{ id: "workflow-1" }]; } },
    pendingDecisions: {},
  });
  assert.deepEqual(await handler.handle({ ownerKey: "owner", channel: "weixin", text: "重新开个对话" }), { text: "已开启新对话。" });
  assert.deepEqual(created, { ownerKey: "owner", threadKey: "main" });
  const capabilities = await handler.handle({ ownerKey: "owner", channel: "weixin", text: "你能做什么" });
  assert.match(capabilities.text, /当前有 1 项收录/);
  assert.doesNotMatch(capabilities.text, /syno_capture_start/);
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

test("ChannelConversationHandler journals workflow stages without persisting message text", async () => {
  const events = [];
  const handler = new ChannelConversationHandler({
    runtime: {
      async run() {
        throw Object.assign(new Error("OpenCode 尚未运行"), { code: "OPENCODE_NOT_RUNNING" });
      },
    },
    core: {},
    ingest: {},
    pendingDecisions: {},
    journal: { async record(event, data, options) { events.push({ event, data, options }); } },
  });

  const response = await handler.handle({
    id: "wx-log",
    ownerKey: "owner",
    senderId: "weixin-owner",
    channel: "weixin",
    text: "这段原文不能进入日志",
  });

  assert.match(response.text, /OpenCode 尚未运行/);
  assert.deepEqual(events.map((item) => item.event), [
    "channel.message.received",
    "channel.runtime.requested",
    "channel.message.failed",
  ]);
  assert.doesNotMatch(JSON.stringify(events), /这段原文不能进入日志/);
  assert.equal(events.at(-1).data.error.code, "OPENCODE_NOT_RUNNING");
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
