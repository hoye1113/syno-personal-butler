import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { FeishuChannelAdapter, FeishuStateStore, optimizeFeishuCardMarkdown } from "../packages/syno-core/feishu-channel.mjs";

async function fixture(t, { onMessage, typingIndicator = true, fail = {} } = {}) {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-feishu-typing-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const handlers = new Map();
  const calls = [];
  const channel = {
    on(name, handler) { handlers.set(name, handler); },
    async connect() {},
    async disconnect() {},
    async send(chatId, body, options) {
      calls.push({ kind: "send", chatId, body, options });
      if (body?.card && fail.cardSend) throw new Error("card send failed");
      return { messageId: `m-${calls.length}` };
    },
    async updateCard(messageId, card) {
      calls.push({ kind: "updateCard", messageId, card });
      if (fail.updateCard) throw new Error("card update failed");
    },
    async recallMessage(messageId) {
      calls.push({ kind: "recall", messageId });
      if (fail.recall) throw new Error("recall failed");
    },
  };
  const stateStore = new FeishuStateStore({ file: path.join(root, "state.json") });
  const adapter = new FeishuChannelAdapter({
    typingIndicator,
    credentials: { async load() { return { appId: "cli_test", appSecret: "secret", ownerOpenId: "owner" }; } },
    stateStore,
    channelFactory: () => channel,
    retryDelayMs: 60_000,
    onMessage,
  });
  await adapter.start();
  return {
    adapter,
    calls,
    stateStore,
    deliver: (message) => handlers.get("message")({ chatType: "p2p", senderId: "owner", ...message }),
    waitFor: async (predicate, attempts = 40) => {
      for (let index = 0; index < attempts && !predicate(); index += 1) await new Promise((resolve) => setTimeout(resolve, 5));
      assert.ok(predicate(), "waitFor timed out");
    },
  };
}

const textOf = (card) => String(card?.body?.elements?.[0]?.content ?? "");

test("Feishu shows a replying card and updates it in place with the final answer", async (t) => {
  let sawPlaceholderBeforeModel = false;
  const { adapter, calls, deliver, waitFor } = await fixture(t, {
    onMessage: async () => {
      sawPlaceholderBeforeModel = calls.length === 1 && Boolean(calls[0].body?.card);
      return { text: "最终答复 **加粗**" };
    },
  });
  deliver({ messageId: "m1", chatId: "c1", content: "你好" });
  await waitFor(() => calls.some((call) => call.kind === "updateCard"));
  await waitFor(() => calls.some((call) => call.kind === "updateCard"));

  assert.equal(sawPlaceholderBeforeModel, true, "占位卡必须先于模型处理发出");
  const [cardSend] = calls;
  assert.equal(cardSend.kind, "send");
  assert.equal(cardSend.chatId, "c1");
  assert.deepEqual(cardSend.options, { replyTo: "m1" });
  assert.equal(cardSend.body.card.schema, "2.0");
  assert.equal(cardSend.body.card.config.update_multi, true);
  assert.match(textOf(cardSend.body.card), /正在回复中/);

  const update = calls.find((call) => call.kind === "updateCard");
  assert.equal(update.messageId, "m-1");
  assert.match(textOf(update.card), /最终答复 \*\*加粗\*\*/);
  assert.equal(calls.filter((call) => call.kind === "send").length, 1, "成功后不应再发第二条消息");
  await adapter.stop();
});

test("Feishu recalls the placeholder and sends normally when the card update fails", async (t) => {
  const { adapter, calls, deliver, waitFor } = await fixture(t, {
    fail: { updateCard: true },
    onMessage: async () => ({ text: "兜底答复" }),
  });
  deliver({ messageId: "m2", chatId: "c2", content: "你好" });
  await waitFor(() => calls.some((call) => call.kind === "recall"));
  await waitFor(() => calls.some((call) => call.kind === "send" && call.body?.markdown));

  const fallback = calls.find((call) => call.kind === "send" && call.body?.markdown);
  assert.equal(fallback.body.markdown, "兜底答复");
  assert.deepEqual(fallback.options, { replyTo: "m2" });
  await adapter.stop();
});

test("Feishu sends one normal reply when the typing card is disabled", async (t) => {
  const { adapter, calls, deliver, waitFor } = await fixture(t, {
    typingIndicator: false,
    onMessage: async () => ({ text: "无占位答复" }),
  });
  deliver({ messageId: "m3", chatId: "c3", content: "你好" });
  await waitFor(() => calls.length === 1);
  assert.equal(calls[0].kind, "send");
  assert.equal(calls[0].body.markdown, "无占位答复");
  assert.equal(calls.some((call) => call.body?.card), false);
  await adapter.stop();
});

test("Feishu recalls the placeholder when delivery is deferred to the outbox", async (t) => {
  const { adapter, calls, stateStore, deliver, waitFor } = await fixture(t, {
    onMessage: async () => ({ deferredDelivery: true, requestId: "request-1" }),
  });
  deliver({ messageId: "m4", chatId: "c4", content: "你好" });
  await waitFor(() => calls.some((call) => call.kind === "recall"));
  assert.equal(calls.some((call) => call.kind === "send" && call.body?.markdown), false);
  assert.equal(calls.some((call) => call.kind === "updateCard"), false);
  for (let index = 0; index < 40 && (await stateStore.snapshot()).pending.length > 0; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.deepEqual((await stateStore.snapshot()).pending, []);
  await adapter.stop();
});

test("Feishu recalls the placeholder and keeps the message pending when processing throws", async (t) => {
  const { adapter, calls, stateStore, deliver, waitFor } = await fixture(t, {
    onMessage: async () => { throw new Error("model exploded"); },
  });
  deliver({ messageId: "m5", chatId: "c5", content: "你好" });
  await waitFor(() => calls.some((call) => call.kind === "recall"));
  assert.match(adapter.lastError, /model exploded/);
  assert.equal((await stateStore.snapshot()).pending[0].messageId, "m5");
  await adapter.stop();
});

test("Feishu still replies normally when the placeholder card cannot be sent", async (t) => {
  const { adapter, calls, deliver, waitFor } = await fixture(t, {
    fail: { cardSend: true },
    onMessage: async () => ({ text: "照常答复" }),
  });
  deliver({ messageId: "m6", chatId: "c6", content: "你好" });
  await waitFor(() => calls.some((call) => call.kind === "send" && call.body?.markdown));
  const fallback = calls.find((call) => call.kind === "send" && call.body?.markdown);
  assert.equal(fallback.body.markdown, "照常答复");
  assert.equal(calls.some((call) => call.kind === "updateCard"), false);
  await adapter.stop();
});

test("card markdown is normalized for visual density: heading demotion, table spacing, code protection", () => {
  const input = [
    "# 大标题",
    "",
    "",
    "",
    "正文第一段。",
    "| 列A | 列B |",
    "| --- | --- |",
    "| 1 | 2 |",
    "```md",
    "# 代码里的标题不动",
    "```",
    "#### 已是小标题",
    "##### 连续小标题",
  ].join("\n");
  const out = optimizeFeishuCardMarkdown(input);
  assert.match(out, /^#### 大标题/m, "H1 降级为 H4");
  assert.ok(!out.includes("\n\n\n"), "三连空行被压缩");
  assert.match(out, /正文第一段。\n\n\| 列A/, "表格前补空行");
  assert.match(out, /```md\n# 代码里的标题不动\n```/, "代码块内标题不受影响");
  assert.match(out, /<br>\n```md/, "代码块前补呼吸位");
  assert.match(out, /#### 已是小标题\n<br>\n##### 连续小标题/, "连续标题间补间隔");
  assert.equal(optimizeFeishuCardMarkdown(null), "");
  assert.equal(optimizeFeishuCardMarkdown("纯文本，没有 markdown"), "纯文本，没有 markdown");
});
