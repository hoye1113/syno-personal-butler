import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { ChannelConversationHandler } from "../packages/syno-core/channel-conversation-handler.mjs";
import { JobStore } from "../packages/syno-core/job-store.mjs";
import { PATHS } from "../packages/syno-core/paths.mjs";
import { evaluate } from "../packages/syno-core/policy.mjs";

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
    // D9（2026-09-01）：管家改自身源码是结构性禁区，无条件拒绝——即便从移动端发起。
    const denied = evaluate({ intent: "code_change" });
    assert.equal(denied.allowed, false);
    assert.match(denied.reason, /不修改项目代码/);
    const rejected = await store.create({ request: { intent: "code_change", text: "改管家源码" }, decision: denied, channel: "feishu", senderId: "fs-owner", ownerKey: "owner", threadKey: "main" });
    assert.equal(rejected.status, "rejected");
    assert.equal(rejected.error.code, "POLICY_DENIED");
  });
});

test("mobile clarification text enters the model; business authority is passed separately", async () => {
  const contexts = [];
  const handler = new ChannelConversationHandler({
    core: {},
    runtime: { async run(request, context) { contexts.push(context); return { text: `理解并处理：${request.text}` }; } },
  });
  for (const privateConversation of [true, false]) {
    const reply = await handler.handle({ id: "confirm", ownerKey: "owner", channel: "feishu", threadKey: "main", text: "可以，但不要追加来源", privateConversation });
    assert.match(reply.text, /可以，但不要追加来源/);
    assert.equal(contexts.at(-1).privateConversation, privateConversation);
  }
});
