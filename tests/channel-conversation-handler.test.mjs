import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ChannelConversationHandler } from "../apps/syno/syno/channel-conversation-handler.mjs";
import { InspirationStore } from "../apps/syno/syno/inspiration-store.mjs";
import { IsolatedImageStore } from "../apps/syno/syno/isolated-image-store.mjs";
import { createGlyphPng } from "../apps/syno/syno/image-png.mjs";

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

test("ChannelConversationHandler handles a bare continue through the scoped link continuation", async () => {
  const calls = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run(request, context) { calls.push({ request, context }); return { text: "链接已重试" }; } }, core: {}, ingest: {}, pendingDecisions: {},
    channelContinuations: { async resolve(context) { return context.type === "link_read" ? { id: "c-1", payload: { url: "https://example.test/a" } } : null; } },
  });
  assert.deepEqual(await handler.handle({ id: "wx-continue", ownerKey: "owner", channel: "weixin", text: "继续" }), { text: "链接已重试" });
  assert.match(calls[0].request.text, /https:\/\/example\.test\/a/);
  assert.match(calls[0].request.text, /不得要求主人打开网页/);
});

// 灵感反馈直达回执（2026-09-22）：精确的「有用/没用/一般」由 handler 出固定回执，
// 重复评价只读事实不覆盖；显式 ID 指代旧卡不受 24h 续办窗口限制；泛谈不拦截。
async function feedbackFixture(t, { ownerKey = "owner" } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "syno-handler-feedback-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const inspirationStore = new InspirationStore({ opsRoot: root, clock: () => new Date("2026-09-22T08:00:00.000Z") });
  const card = await inspirationStore.create({ date: "2026-09-22", sampledRefs: ["vault/a.md", "vault/b.md"], text: "串联" });
  await inspirationStore.markDelivered(card.id, "event-1", { ownerKey, channel: "weixin", threadKey: "main" });
  return { inspirationStore, card };
}

function fakeContinuations(current) {
  return {
    current, settled: [],
    async resolve() { return this.current; },
    async settle(id, options) { this.settled.push({ id, ...options }); return { id, ...options }; },
  };
}

test("ChannelConversationHandler receipts an exact feedback reply and never overwrites a recorded card", async (t) => {
  const { inspirationStore, card } = await feedbackFixture(t);
  const continuations = fakeContinuations({ id: "c-fb", payload: { inspirationId: card.id } });
  const runs = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run(request) { runs.push(request); return { text: "模型回复" }; } },
    core: {}, ingest: {}, pendingDecisions: {},
    channelContinuations: continuations,
    inspirationStore,
  });
  assert.deepEqual(await handler.handle({ id: "wx-fb-1", ownerKey: "owner", channel: "weixin", text: "没用" }), { text: "已记下：这张灵感卡标为没用。" });
  assert.deepEqual(continuations.settled, [{ id: "c-fb", status: "resolved" }]);
  assert.equal((await inspirationStore.list()).find((item) => item.id === card.id).feedback, "not_useful");
  // 续办尚未结案时同一卡被再次评价：只返回既有事实，不覆盖、不结案第二次、不落模型。
  assert.deepEqual(await handler.handle({ id: "wx-fb-2", ownerKey: "owner", channel: "weixin", text: "有用" }), { text: "这张灵感卡已经标记为没用，没有覆盖原记录。" });
  assert.equal((await inspirationStore.list()).find((item) => item.id === card.id).feedback, "not_useful");
  assert.equal(runs.length, 0);
});

test("ChannelConversationHandler backfills an explicitly referenced old card beyond the 24h continuation window", async (t) => {
  const { inspirationStore, card } = await feedbackFixture(t);
  const continuations = fakeContinuations(null); // 24h 续办已过期
  const handler = new ChannelConversationHandler({
    runtime: { async run() { return { text: "模型回复" }; } },
    core: {}, ingest: {}, pendingDecisions: {},
    channelContinuations: continuations,
    inspirationStore,
  });
  assert.deepEqual(
    await handler.handle({ id: "wx-fb-old", ownerKey: "owner", channel: "weixin", text: `${card.id} 一般` }),
    { text: "已记下：这张灵感卡标为一般。" },
  );
  assert.equal((await inspirationStore.list()).find((item) => item.id === card.id).feedback, "neutral");
  // 他人名下的卡不可被当前 Owner 回填。
  const foreign = await inspirationStore.create({ date: "2026-09-22", sampledRefs: ["vault/c.md", "vault/d.md"], text: "别人的卡" });
  await inspirationStore.markDelivered(foreign.id, "event-2", { ownerKey: "someone-else", channel: "weixin", threadKey: "main" });
  assert.deepEqual(
    await handler.handle({ id: "wx-fb-foreign", ownerKey: "owner", channel: "weixin", text: `${foreign.id} 有用` }),
    { text: "这张灵感卡当前不能回填反馈；我没有改动任何历史记录。" },
  );
  assert.equal((await inspirationStore.list()).find((item) => item.id === foreign.id).feedback, undefined);
});

test("ChannelConversationHandler leaves generic usefulness talk to the model", async (t) => {
  const { inspirationStore, card } = await feedbackFixture(t);
  const runs = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run(request) { runs.push(request); return { text: "模型回复" }; } },
    core: {}, ingest: {}, pendingDecisions: {},
    channelContinuations: fakeContinuations({ id: "c-fb", payload: { inspirationId: card.id } }),
    inspirationStore,
  });
  assert.deepEqual(await handler.handle({ id: "wx-fb-talk", ownerKey: "owner", channel: "weixin", text: "这篇文章有用吗" }), { text: "模型回复" });
  assert.equal(runs.length, 1);
  assert.equal((await inspirationStore.list()).find((item) => item.id === card.id).feedback, undefined);
});

// 并发重放（恢复 worker 与实时消息同卡竞争）：recordFeedback 撞终态时复查事实，
// 回报既有记录而非把冲突误讲成「尚未投递」。
test("ChannelConversationHandler reports the recorded fact when a concurrent path wins the feedback race", async () => {
  let targetCalls = 0;
  const inspirationStore = {
    async feedbackTarget(id) {
      targetCalls += 1;
      if (targetCalls === 1) return { found: true, alreadyRecorded: false, record: { id } };
      return { found: true, alreadyRecorded: true, record: { id, feedback: "not_useful" } };
    },
    async recordFeedback() { throw new Error("灵感卡片尚未投递，不能回填反馈"); },
  };
  const handler = new ChannelConversationHandler({
    runtime: { async run() { return { text: "模型回复" }; } },
    core: {}, ingest: {}, pendingDecisions: {},
    channelContinuations: fakeContinuations({ id: "c-fb", payload: { inspirationId: "inspiration-20260922-abcdef12" } }),
    inspirationStore,
  });
  assert.deepEqual(
    await handler.handle({ id: "wx-fb-race", ownerKey: "owner", channel: "weixin", text: "也没用" }),
    { text: "这张灵感卡已经标记为没用，没有覆盖原记录。" },
  );
});

// settle 是附属动作：反馈已落账时结案失败只记观测，回执仍是成功事实。
test("ChannelConversationHandler receipts the recorded feedback even when settling the continuation fails", async (t) => {
  const { inspirationStore, card } = await feedbackFixture(t);
  const continuations = fakeContinuations({ id: "c-fb", payload: { inspirationId: card.id } });
  continuations.settle = async () => { throw new Error("state dir read-only"); };
  const journal = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run() { return { text: "模型回复" }; } },
    core: {}, ingest: {}, pendingDecisions: {},
    journal: { async record(event, data, settings) { journal.push({ event, data, level: settings?.level }); return true; } },
    channelContinuations: continuations,
    inspirationStore,
  });
  assert.deepEqual(await handler.handle({ id: "wx-fb-settle", ownerKey: "owner", channel: "weixin", text: "一般" }), { text: "已记下：这张灵感卡标为一般。" });
  assert.equal((await inspirationStore.list()).find((item) => item.id === card.id).feedback, "neutral");
  assert.equal(journal.some((entry) => entry.event === "channel.continuation.settle_failed" && entry.level === "warning"), true);
  assert.equal(journal.some((entry) => entry.event === "inspiration.feedback.recorded"), true);
});

test("ChannelConversationHandler shadow-persists mobile text before model execution without changing reply flow", async () => {
  const accepted = [];
  const runs = [];
  const targets = [];
  const targetWakeups = [];
  let wakes = 0;
  const handler = new ChannelConversationHandler({
    runtime: { async run(request) { runs.push(request); return { text: "shadow-reply" }; } },
    core: {},
    ingest: {},
    pendingDecisions: {},
    acceptedRequests: { async accept(input) { accepted.push(input); return { created: true, request: { requestId: "request-1" } }; } },
    ownerChannelTargets: { async set(ownerKey, channel, target) { targets.push({ ownerKey, channel, target }); } },
    channelDeliveryOutbox: { async wakeTarget(ownerKey, channel) { targetWakeups.push({ ownerKey, channel }); } },
    wakeDelivery: async () => { wakes += 1; },
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
  assert.deepEqual(targets, [{ ownerKey: "owner", channel: "weixin", target: { toUserId: "owner", contextToken: "context-token" } }]);
  assert.deepEqual(targetWakeups, [{ ownerKey: "owner", channel: "weixin" }]);
  assert.equal(wakes, 1);
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


test("ChannelConversationHandler deterministically captures an embedded URL with explicit intent or read-link phrases", async () => {
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
  // 二次修订（2026-07-30）：「解释 <url> 的观点」这类读链接短语 → 不收录，注入提示让模型用 fetch_url 读正文回答
  const readLink = await handler.handle({ id: "chat-1", ownerKey: "owner", channel: "weixin", text: "解释 https://example.com/a 的观点" });
  assert.deepEqual(readLink, { text: "ordinary" });
  assert.equal(calls.length, 1);
  assert.equal(model.length, 1);
  assert.match(model[0], /^解释 https:\/\/example\.com\/a 的观点/);
  assert.match(model[0], /knowledge\.fetch_url/);
  assert.match(model[0], /不要主动调用收录/);
});

test("ChannelConversationHandler returns the existing Workflow status for a duplicate URL without invoking the model", async () => {
  let modelRuns = 0;
  let receives = 0;
  const targets = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run() { modelRuns += 1; throw new Error("duplicate capture must not invoke the model"); } },
    core: {},
    ingestWorkflows: {
      async receive() {
        receives += 1;
        return {
          artifact: { id: "artifact-existing" },
          workflow: { id: "workflow-existing", stage: "rejected" },
          duplicate: true,
        };
      },
    },
    ownerChannelTargets: { async set(ownerKey, channel, target) { targets.push({ ownerKey, channel, target }); } },
    pendingDecisions: {},
  });

  const response = await handler.handle({
    id: "capture-duplicate-1",
    ownerKey: "owner",
    senderId: "owner",
    contextToken: "current-context",
    channel: "weixin",
    text: "https://example.com/already-captured",
  });

  assert.equal(receives, 1);
  assert.equal(modelRuns, 0);
  assert.deepEqual(targets, [{ ownerKey: "owner", channel: "weixin", target: { toUserId: "owner", contextToken: "current-context" } }]);
  assert.equal(response.text, "已存在收录编号：workflow-existing。当前状态：已拒收。");
  assert.doesNotMatch(response.text, /正在后台安全提取/);
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

test("ChannelConversationHandler never claims a failed chat Job was saved for later", async () => {
  const handler = new ChannelConversationHandler({
    runtime: {
      async run() {
        throw Object.assign(new Error("provider offline"), { code: "HARNESS_ATTEMPTS_EXHAUSTED", retryable: true });
      },
    },
    core: {
      async execute() {
        return {
          job: {
            id: "job-chat-failed",
            status: "failed",
            error: { code: "EXECUTION_FAILED", message: "product commit is restricted to main" },
          },
        };
      },
    },
    ingest: {},
    pendingDecisions: {},
  });

  const response = await handler.handle({
    id: "wx-chat-failed",
    ownerKey: "owner",
    senderId: "weixin-owner",
    channel: "weixin",
    text: "在吗",
  });

  assert.match(response.text, /处理失败/);
  assert.match(response.text, /job-chat-failed/);
  assert.doesNotMatch(response.text, /已保存为任务/);
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

test("read-link phrases read via fetch_url without entering the capture pipeline", async () => {
  const calls = [];
  const model = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run(request) { model.push(request.text); return { text: "能读到，这是概要" }; } },
    core: {},
    ingestWorkflows: {
      async receive(payload) {
        calls.push(payload);
        return { artifact: { id: "artifact-new" }, workflow: { id: "workflow-new" }, duplicate: false };
      },
    },
    pendingDecisions: {},
  });
  // 主人 2026-07-30 的真实句式
  const response = await handler.handle({
    id: "wx-read-1", ownerKey: "owner", channel: "weixin",
    text: "你能访问获取到内容吗：https://openrouter.ai/blog/insights/evaluate-llm-provider-performance/#how-to-read-provider-benchmarks-without-getting-fooled",
  });
  assert.deepEqual(response, { text: "能读到，这是概要" });
  assert.equal(calls.length, 0);
  assert.equal(model.length, 1);
  assert.match(model[0], /knowledge\.fetch_url/);
  assert.match(model[0], /不要主动调用收录/);
});

test("URL glued to Chinese text is not treated as a bare URL", async () => {
  // 2026-07-30 事故回归：「<url>；帮我读一下讲了什么」曾被 \S+ 整串当裸链接走进收录管线，
  // 且当时动词表缺「读一下」，两边都没接住。现在应走只读不收录的读链接路径。
  const calls = [];
  const model = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run(request) { model.push(request.text); return { text: "读完了" }; } },
    core: {},
    ingestWorkflows: {
      async receive(payload) {
        calls.push(payload);
        return { artifact: { id: "artifact-new" }, workflow: { id: "workflow-new" }, duplicate: false };
      },
    },
    pendingDecisions: {},
  });
  const response = await handler.handle({
    id: "wx-glue-1", ownerKey: "owner", channel: "weixin",
    text: "https://openrouter.ai/blog/insights/evaluate-llm-provider-performance/#how-to-read-provider-benchmarks-without-getting-fooled；帮我读一下讲了什么",
  });
  assert.deepEqual(response, { text: "读完了" });
  assert.equal(calls.length, 0);
  assert.equal(model.length, 1);
  assert.match(model[0], /knowledge\.fetch_url/);
  // 裸链接带尾随中文标点仍算裸链接（且提交的是干净链接，不带标点）
  const bare = await handler.handle({ id: "wx-bare-1", ownerKey: "owner", channel: "weixin", text: "https://example.com/a。" });
  assert.match(bare.text, /workflow-new/);
  assert.deepEqual(calls.map((item) => item.value), ["https://example.com/a"]);
});

test("read-link rule stays off for long residuals, multiple URLs and local-only mode", async () => {
  const calls = [];
  const model = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run(request) { model.push(request.text); return { text: "ordinary" }; } },
    core: {},
    ingestWorkflows: {
      async receive(payload) {
        calls.push(payload);
        return { artifact: { id: "artifact-new" }, workflow: { id: "workflow-new" }, duplicate: false };
      },
    },
    pendingDecisions: {},
  });
  // 剩余文字 >30 字：真正的对话，不触发自动收录（模型仍可用 fetch_url 工具）
  assert.deepEqual(await handler.handle({
    id: "wx-read-2", ownerKey: "owner", channel: "weixin",
    text: "把 https://example.com/a 的核心观点和我们知识库里的 Context Engineering 笔记做个详细对比，列出三点异同并给出你的评价",
  }), { text: "ordinary" });
  // 多链接不触发
  assert.deepEqual(await handler.handle({
    id: "wx-read-3", ownerKey: "owner", channel: "weixin",
    text: "看看 https://example.com/a 和 https://example.com/b",
  }), { text: "ordinary" });
  // 仅本地模式不自动抓取远端
  assert.deepEqual(await handler.handle({
    id: "wx-read-4", ownerKey: "owner", channel: "weixin",
    text: "仅本地 看看 https://example.com/a",
  }), { text: "ordinary" });
  assert.equal(calls.length, 0);
  assert.equal(model.length, 3);
});

test("ChannelConversationHandler sends images to chat vision instead of ingest", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "syno-channel-image-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const png = createGlyphPng("SYNO42");
  const file = path.join(root, "shot.png");
  await writeFile(file, png);
  const runs = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run(request) { runs.push(request); return { text: "图是绿色字母" }; } },
    core: {},
    ingest: { async receive() { throw new Error("image must not ingest"); }, async propose() {} },
    pendingDecisions: {},
    attachmentToPayload: async () => { throw new Error("image must not convert to intake"); },
    imageStore: new IsolatedImageStore({ quarantineRoots: [root] }),
    visionClient: { async read() { throw new Error("Flash should call syno_image_read, not the handler"); } },
  });
  const response = await handler.handle({
    id: "wx-img-1",
    ownerKey: "owner",
    senderId: "owner",
    channel: "weixin",
    text: "这是什么",
    artifacts: [{ path: file, mime: "image/png", isolated: true, autoRead: false, size: png.length }],
  });
  assert.equal(response.text, "图是绿色字母");
  assert.equal(runs.length, 1);
  assert.match(runs[0].text, /syno_image_read/);
  assert.match(runs[0].text, /artifactId/);
});

test("ChannelConversationHandler still ingests PDF/text attachments", async () => {
  const received = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run() { throw new Error("model must not run"); } },
    core: {},
    ingest: {
      async receive(payload) { received.push(payload); return { artifact: { id: "pdf-1" } }; },
      async propose() {},
    },
    pendingDecisions: {},
    attachmentToPayload: async () => ({ kind: "pdf", name: "a.pdf" }),
  });
  const response = await handler.handle({
    id: "wx-pdf",
    ownerKey: "owner",
    senderId: "owner",
    channel: "weixin",
    text: "看这个",
    artifacts: [{ mime: "application/pdf", isolated: true, autoRead: false, path: "doc.pdf" }],
  });
  assert.match(response.text, /pdf-1/);
  assert.equal(received[0].kind, "pdf");
});

test("ChannelConversationHandler turns explicit 收录 plus image into text intake", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "syno-channel-vision-ingest-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const png = createGlyphPng("SYNO42");
  const file = path.join(root, "shot.png");
  await writeFile(file, png);
  const received = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run() { throw new Error("model must not run for ingest"); } },
    core: {},
    ingest: {
      async receive(payload) { received.push(payload); return { artifact: { id: "vision-text-1" } }; },
      async propose() {},
    },
    pendingDecisions: {},
    attachmentToPayload: async () => { throw new Error("must not use binary image intake"); },
    imageStore: new IsolatedImageStore({ quarantineRoots: [root] }),
    visionClient: {
      async read({ question }) {
        assert.match(question, /收录/);
        return { ocr: "SYNO42", layout: "row", summary: "green", answer: "green", uncertain: [] };
      },
    },
  });
  const response = await handler.handle({
    id: "wx-img-ingest",
    ownerKey: "owner",
    senderId: "owner",
    channel: "weixin",
    text: "收录这张图",
    artifacts: [{ path: file, mime: "image/png", isolated: true, autoRead: false, size: png.length }],
  });
  assert.match(response.text, /vision-text-1/);
  assert.equal(received[0].kind, "text");
  assert.match(received[0].value, /<untrusted-vision>/);
  assert.match(received[0].value, /SYNO42/);
});

test("ChannelConversationHandler reports retryable vision failure without inventing pixels", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "syno-channel-vision-fail-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const png = createGlyphPng("SYNO42");
  const file = path.join(root, "shot.png");
  await writeFile(file, png);
  const received = [];
  const queued = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run() { throw new Error("model must not run"); } },
    core: {
      async execute(request, context) {
        queued.push({ request, context });
        return { job: { id: "job-vision-retry", status: "waiting_provider" } };
      },
    },
    ingest: { async receive(payload) { received.push(payload); return { artifact: { id: "nope" } }; }, async propose() {} },
    pendingDecisions: {},
    attachmentToPayload: async () => { throw new Error("no"); },
    imageStore: new IsolatedImageStore({ quarantineRoots: [root] }),
    visionClient: {
      async read() {
        throw Object.assign(new Error("timeout"), { code: "VISION_TIMEOUT", retryable: true });
      },
    },
  });
  const response = await handler.handle({
    id: "wx-img-timeout",
    ownerKey: "owner",
    senderId: "owner",
    channel: "weixin",
    text: "收录这张图",
    artifacts: [{ path: file, mime: "image/png", isolated: true, autoRead: false, size: png.length }],
  });
  assert.equal(received.length, 0);
  assert.equal(queued.length, 1);
  assert.equal(queued[0].request.intent, "chat");
  assert.match(response.text, /识图暂时失败，已排队重试：job-vision-retry/);
});

test("ChannelConversationHandler does not treat image captions as approval replies", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "syno-channel-image-approve-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const png = createGlyphPng("SYNO42");
  const file = path.join(root, "shot.png");
  await writeFile(file, png);
  let parsed = false;
  const runs = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run(request) { runs.push(request); return { text: "已看图" }; } },
    core: { async approve() { throw new Error("must not approve"); } },
    ingest: { async receive() { throw new Error("image must not ingest"); }, async propose() {} },
    pendingDecisions: { async parse() { parsed = true; throw new Error("must not parse"); } },
    attachmentToPayload: async () => { throw new Error("image must not convert to intake"); },
    imageStore: new IsolatedImageStore({ quarantineRoots: [root] }),
    visionClient: { async read() { throw new Error("Flash should call syno_image_read"); } },
  });
  const response = await handler.handle({
    id: "wx-img-approve",
    ownerKey: "owner",
    senderId: "owner",
    channel: "weixin",
    text: "可以",
    privateConversation: true,
    artifacts: [{ path: file, mime: "image/png", isolated: true, autoRead: false, size: png.length }],
  });
  assert.equal(parsed, false);
  assert.equal(response.text, "已看图");
  assert.equal(runs.length, 1);
  assert.match(runs[0].text, /syno_image_read/);
});
