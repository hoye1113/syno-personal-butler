import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ChannelIntentRouter } from "../packages/syno-core/channel-intent-router.mjs";
import { ChannelConversationHandler } from "../packages/syno-core/channel-conversation-handler.mjs";

const router = new ChannelIntentRouter();

test("今日快照口令整句锚定，不误伤普通对话", () => {
  for (const text of ["今天有什么", "今天要做什么？", "今日安排", "今天干什么!", "今日待办。"]) {
    assert.equal(router.classify(text).kind, "today_snapshot", text);
  }
  for (const text of ["今天这篇文章怎么样", "我记得今天有会", "总结一下今天的新闻"]) {
    assert.equal(router.classify(text).kind, "normal_conversation", text);
  }
});

test("「记住 X」抓取到陈述内容，缺内容时不触发", () => {
  const withColon = router.classify("记住：明天上午十点交周报");
  assert.equal(withColon.kind, "memory_note");
  assert.equal(withColon.statement, "明天上午十点交周报");

  const withSpace = router.classify("记一下 我不喜欢在周末处理工作");
  assert.equal(withSpace.kind, "memory_note");
  assert.equal(withSpace.statement, "我不喜欢在周末处理工作");

  const bare = router.classify("记住我");
  assert.equal(bare.kind, "normal_conversation", "内容太短不当成记忆写入");

  assert.equal(router.classify("帮我记住 偏好：先给结论再给论据").kind, "memory_note");
});

function makeHandler({ today = null, core = null, runtime = null } = {}) {
  return new ChannelConversationHandler({
    runtime: runtime || { async run() { throw new Error("model must not run"); } },
    core: core || {},
    ingest: {},
    pendingDecisions: {},
    today,
  });
}

test("「今天有什么」直接读 TodayService 快照，不调用模型", async () => {
  let modelRuns = 0;
  const handler = makeHandler({
    runtime: { async run() { modelRuns += 1; return { text: "should not happen" }; } },
    today: {
      async snapshot({ capacity }) {
        assert.equal(capacity, 5);
        return {
          primary: { kind: "goal", title: "写完 Syno 工具面重设计" },
          priorities: [
            { kind: "goal", title: "写完 Syno 工具面重设计" },
            { kind: "commitment", title: "回复飞书消息" },
            { kind: "goal", title: "复盘今天的清理" },
            { kind: "goal", title: "第四条不该出现" },
            { kind: "knowledge-maintenance", title: "维护知识：关联孤立笔记：某篇没链接的笔记" },
          ],
          needsYou: [{ id: "a" }, { id: "b" }],
          recentIntake: [{ id: "ingest-1" }],
          progress: { completed: 3, waiting: 2 },
        };
      },
    },
  });
  const response = await handler.handle({ id: "fs-today-1", ownerKey: "owner", chatId: "c1", channel: "feishu", text: "今天有什么" });
  assert.equal(modelRuns, 0, "确定性路由不得调用模型");
  assert.match(response.text, /^今天（\d{4}-\d{2}-\d{2}）/);
  assert.match(response.text, /首要：写完 Syno 工具面重设计/);
  assert.match(response.text, /回复飞书消息/);
  assert.equal(response.text.match(/写完 Syno 工具面重设计/g).length, 1, "首要与待办不重复同一条");
  assert.doesNotMatch(response.text, /第四条不该出现/, "只列前 3 条");
  assert.doesNotMatch(response.text, /孤立笔记|维护知识/, "建议类信号不进快照展示（2026-10-18 主人「不显示」）");
  assert.match(response.text, /待你确认：2 项（含收录 1）/);
  assert.match(response.text, /进度：已完成 3 \/ 待确认 2/);
});

test("「今天有什么」在只剩建议信号时不显示首要/待办，但仍报待确认与进度", async () => {
  const handler = makeHandler({
    today: {
      async snapshot() {
        return {
          primary: { kind: "claim-review", title: "复核时效主张：某条说法到期" },
          priorities: [{ kind: "claim-review", title: "复核时效主张：某条说法到期" }],
          needsYou: [{ id: "a" }],
          recentIntake: [],
          progress: { completed: 0, waiting: 1 },
        };
      },
    },
  });
  const response = await handler.handle({ id: "fs-today-4", ownerKey: "owner", channel: "feishu", text: "今天有什么" });
  assert.doesNotMatch(response.text, /首要|待办|复核时效主张/);
  assert.match(response.text, /待你确认：1 项/);
  assert.match(response.text, /进度：已完成 0 \/ 待确认 1/);
});

test("「今天有什么」在快照不可用时如实说明", async () => {
  const unavailable = makeHandler({ today: null });
  assert.match((await unavailable.handle({ id: "fs-today-2", ownerKey: "owner", channel: "feishu", text: "今天有什么" })).text, /暂时不可用/);
  const broken = makeHandler({ today: { async snapshot() { throw new Error("store down"); } } });
  assert.match((await broken.handle({ id: "fs-today-3", ownerKey: "owner", channel: "feishu", text: "今天有什么" })).text, /读取失败/);
});

test("「记住 X」生成待确认的记忆候选 Job，并按 messageId 幂等", async () => {
  const calls = [];
  const handler = makeHandler({
    core: {
      async execute(request, context) {
        calls.push({ request, context });
        return { job: { id: "job-mem-1", status: "completed", result: { record: { id: "memory-20261017-abcd1234" } } }, requiresApproval: false };
      },
    },
  });
  const response = await handler.handle({ id: "fs-mem-1", ownerKey: "owner", chatId: "c1", threadKey: "main", channel: "feishu", text: "记住：明天上午十点交周报" });
  assert.match(response.text, /已记录为记忆候选 memory-20261017-abcd1234/);
  assert.match(response.text, /确认后才会进入长期记忆/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].request.operation, "memory.proposals.create");
  assert.equal(calls[0].request.payload.statement, "明天上午十点交周报");
  assert.equal(calls[0].context.messageId, "fs-mem-1", "messageId 必须作为幂等键传给 Host");
});

test("「记住 X」回执引用 operationResult.record.id（真机 Job 结构）", async () => {
  const handler = makeHandler({
    core: {
      async execute() {
        return {
          job: {
            id: "job-mem-9",
            status: "completed",
            result: { operationResult: { record: { id: "memory-20261017-73778c96", status: "proposed" }, changedPaths: ["ops/memory/2026/10/x.md"] } },
          },
          requiresApproval: false,
        };
      },
    },
  });
  const response = await handler.handle({ id: "fs-mem-9", ownerKey: "owner", channel: "feishu", text: "记住 明天上午十点交周报" });
  assert.match(response.text, /已记录为记忆候选 memory-20261017-73778c96/);
  assert.match(response.text, /status=proposed/);
  assert.doesNotMatch(response.text, /job-mem-9/);
});

test("「记住 X」的边界：需要审批、内容过长、写入失败都如实回执", async () => {
  const awaiting = makeHandler({
    core: { async execute() { return { job: { id: "job-mem-2", status: "awaiting_approval" }, requiresApproval: true }; } },
  });
  assert.match((await awaiting.handle({ id: "fs-mem-2", ownerKey: "owner", channel: "feishu", text: "记住 周末不处理工作" })).text, /已提交记忆候选 job-mem-2，待你确认/);

  const tooLong = makeHandler({ core: { async execute() { throw new Error("must not run"); } } });
  assert.match((await tooLong.handle({ id: "fs-mem-3", ownerKey: "owner", channel: "feishu", text: `记住 ${"很长的内容".repeat(120)}` })).text, /内容太长/);

  const failing = makeHandler({ core: { async execute() { throw new Error("policy blocked"); } } });
  const failed = await failing.handle({ id: "fs-mem-4", ownerKey: "owner", channel: "feishu", text: "记住 一条会失败的记忆" });
  assert.match(failed.text, /没能记住：policy blocked/);
  assert.doesNotMatch(failed.text, /已记录|已提交/);
});

test("带链接的「记住 …」仍走收录，而不是只存一行文字", async () => {
  const received = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run() { throw new Error("model must not run"); } },
    core: { async execute() { throw new Error("memory must not run for links"); } },
    ingestWorkflows: {
      async receive(payload) { received.push(payload); return { artifact: { id: "a1" }, workflow: { id: "w1" } }; },
    },
    attachmentToPayload: async () => { throw new Error("unused"); },
    pendingDecisions: {},
  });
  await handler.handle({ id: "fs-mem-link", ownerKey: "owner", chatId: "c1", channel: "feishu", text: "记住 https://example.com/article 这篇" });
  assert.equal(received.length, 1);
  assert.equal(received[0].kind, "url");
});
