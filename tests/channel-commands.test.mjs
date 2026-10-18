import test from "node:test";
import assert from "node:assert/strict";

import { ChannelConversationHandler } from "../packages/syno-core/channel-conversation-handler.mjs";

function makeHandler({ runtime = {}, continuations = null } = {}) {
  const calls = [];
  const handler = new ChannelConversationHandler({
    runtime: {
      async run(request) { calls.push({ kind: "run", text: request.text }); return { text: "model-reply" }; },
      async cancel(id) { calls.push({ kind: "cancel", id }); },
      async newConversation(input) { calls.push({ kind: "newConversation", input }); },
      ...runtime,
    },
    core: {},
    channelContinuations: continuations,
  });
  return { handler, calls };
}

test("/new is the only fixed command: it cancels the active run and starts a fresh session", async () => {
  const settled = [];
  const { handler, calls } = makeHandler({
    continuations: {
      async resolve() { return { id: "continuation-1" }; },
      async settle(id) { settled.push(id); },
    },
  });
  const result = await handler.handle({ id: "fs-new", ownerKey: "owner", threadKey: "main", channel: "feishu", text: "/new" });
  assert.equal(result.text, "已开启新对话。");
  assert.deepEqual(calls.map((item) => item.kind), ["newConversation"]);
  assert.deepEqual(settled, ["continuation-1"]);
});

test("confirmations and choices now go to the model, the handler never guesses", async () => {
  for (const text of ["确认", "拒绝", "分开保存", "追加来源", "仅关联", "丢弃"]) {
    const { handler, calls } = makeHandler();
    const result = await handler.handle({ id: `fs-${text}`, ownerKey: "owner", threadKey: "main", channel: "feishu", text });
    assert.equal(result.text, "model-reply", `${text} 必须交给模型`);
    assert.deepEqual(calls.map((item) => item.kind), ["run"], `${text} 不允许 Handler 直接执行`);
  }
});
