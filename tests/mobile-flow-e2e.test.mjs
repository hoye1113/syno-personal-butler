import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { ChannelConversationHandler } from "../apps/syno/syno/channel-conversation-handler.mjs";
import { JobStore } from "../apps/syno/syno/job-store.mjs";
import { PATHS } from "../apps/syno/syno/paths.mjs";
import { evaluate } from "../apps/syno/syno/policy.mjs";

// 移动端（微信 iLink / 飞书）trust-but-clarify 端到端。这里用**真实**的 policy.evaluate
// 与**真实**的 JobStore 状态机（非桩），证明三条腿都成立，且两通道同权限同行为：
//   (1) 只读：普通文本走 runtime.run，微信/飞书都进同一 Owner 主会话；
//   (2) 写入自动执行：写意图 approval 恒为 none、allowed:true，Job 直入 pending（不经
//       awaiting_approval）；code_change/system_control 开关默认关 → rejected；
//   (3) 冲突澄清：收录冲突暂停的 Job 经私聊「可以」回复，被 canonical 状态机推到
//       completed，无二次审批闸门——微信与飞书结果一致。

async function withStore(fn) {
  // opsRoot 必须落在仓库内（relativeToRepo 拒绝越界路径），与 records-and-jobs 测试同模式。
  const opsRoot = path.join(PATHS.runtimeRoot, "tests", `mobile-e2e-${randomUUID()}`);
  const store = new JobStore({ opsRoot });
  try {
    return await fn(store);
  } finally {
    await fs.rm(opsRoot, { recursive: true, force: true });
  }
}

test("mobile read leg: ordinary text routes to one Owner main session for both channels", async () => {
  const runs = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run(request, context) { runs.push({ text: request.text, context }); return { text: `reply:${request.text}` }; } },
    core: {},
    ingest: {},
    pendingDecisions: { async parse() { throw new Error("not called"); } },
  });
  const wx = await handler.handle({ id: "wx-1", ownerKey: "owner", senderId: "wx-owner", channel: "weixin", text: "解释一下第一性原理" });
  const fs2 = await handler.handle({ id: "fs-1", ownerKey: "owner", senderId: "fs-owner", channel: "feishu", text: "继续讲" });
  assert.deepEqual(wx, { text: "reply:解释一下第一性原理" });
  assert.deepEqual(fs2, { text: "reply:继续讲" });
  // 两通道都落到同一个 Owner 主会话——渠道无关、同权限。
  assert.deepEqual(runs.map((item) => [item.context.ownerKey, item.context.threadKey]), [["owner", "main"], ["owner", "main"]]);
});

test("mobile write leg: write intents auto-execute (pending, approval none) and self-modify stays denied by default", async () => {
  await withStore(async (store) => {
    const writeIntents = ["create_action", "create_content_idea", "delete", "move", "overwrite_note", "curate_note"];
    for (const intent of writeIntents) {
      const decision = evaluate({ intent });
      assert.equal(decision.approval, "none", `${intent} 应恒为 none`);
      assert.equal(decision.allowed, true, `${intent} 应被允许`);
      const job = await store.create({ request: { intent, text: `主人指令：${intent}` }, decision, channel: "weixin", senderId: "wx-owner", ownerKey: "owner", threadKey: "main" });
      // 关键不变式：写指令直入 pending，不经 awaiting_approval（无审批闸门）。
      assert.equal(job.status, "pending", `${intent} 应自动入队 pending，而非 awaiting_approval`);
      assert.equal(job.error, null, `${intent} 不应有 POLICY_DENIED`);
    }
    // 安全开关默认关：管家改自身源码默认拒绝——即便从移动端发起。
    const denied = evaluate({ intent: "code_change" });
    assert.equal(denied.allowed, false);
    assert.match(denied.reason, /allowSelfModify/);
    const rejected = await store.create({ request: { intent: "code_change", text: "改管家源码" }, decision: denied, channel: "feishu", senderId: "fs-owner", ownerKey: "owner", threadKey: "main" });
    assert.equal(rejected.status, "rejected");
    assert.equal(rejected.error.code, "POLICY_DENIED");
  });
});

test("mobile clarification leg: private-chat confirmation drives the canonical Job to completed with no second gate, identically for weixin and feishu", async () => {
  await withStore(async (store) => {
    const decision = evaluate({ intent: "curate_note" });

    // core.approve 把 canonical 状态机一路推到 completed（模拟 agent-host 收到确认后执行 worktree commit）。
    const driveToCompleted = async (jobId, input) => {
      const live = await store.get(jobId);
      await store.approve(live, { channel: input.channel, senderId: input.senderId });
      await store.transition(live, "running", { approvalActors: [`${input.channel}:${input.senderId}`], approvalsReceived: 1 });
      await store.transition(live, "validating", { result: { merged: true } });
      await store.transition(live, "completed", { result: { merged: true } });
      return { job: live, requiresApproval: false };
    };

    for (const channel of ["weixin", "feishu"]) {
      // 每个通道各自一条冲突澄清 Job（现实里每次澄清本就是独立 Job）。
      const job = await store.create({ request: { intent: "curate_note", text: `收录一条撞重的链接-${channel}` }, decision, channel, senderId: `${channel}-owner`, ownerKey: "owner", threadKey: "main" });
      // 收录冲突暂停的 Job：写意图先入 pending，再被收录层按系统歧义推到 awaiting_approval。
      await store.transition(job, "awaiting_approval", { phase: "clarification" });
      assert.equal(job.status, "awaiting_approval");

      const handler = new ChannelConversationHandler({
        runtime: { async run() { throw new Error("model must not parse confirmations"); } },
        core: { approve: driveToCompleted },
        ingest: {},
        pendingDecisions: { async parse(text, ctx) { assert.equal(ctx.threadKey, "main"); return { action: "approve", code: "ABC123", decision: { jobId: job.id, id: `dec-${channel}` } }; }, async update() {} },
      });
      const reply = await handler.handle({ id: `${channel}-confirm`, ownerKey: "owner", senderId: `${channel}-owner`, channel, text: "可以", privateConversation: true });
      // trust-but-clarify：确认后任务已完成，不会回到「仍需澄清」二次闸门。
      assert.match(reply.text, /已确认任务/);
      assert.match(reply.text, /completed/);
      assert.doesNotMatch(reply.text, /仍需澄清/);
      const finished = await store.get(job.id);
      assert.equal(finished.status, "completed");
      assert.ok(finished.approvalActors.some((actor) => actor.startsWith(`${channel}:`)), `${channel} 应记入审批主体`);
    }
  });
});

test("mobile clarification leg never resolves outside an explicit private conversation on either channel", async () => {
  for (const channel of ["weixin", "feishu"]) {
    let parsed = false;
    const handler = new ChannelConversationHandler({
      runtime: { async run() { throw new Error("model must not run"); } },
      core: {},
      ingest: {},
      pendingDecisions: { async parse() { parsed = true; } },
    });
    const reply = await handler.handle({ ownerKey: "owner", senderId: `${channel}-owner`, channel, text: "可以", privateConversation: false });
    assert.match(reply.text, /明确私聊/);
    assert.equal(parsed, false);
  }
});
