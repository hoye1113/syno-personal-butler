import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ChannelConversationHandler } from "../packages/syno-core/channel-conversation-handler.mjs";
import { IsolatedImageStore } from "../apps/syno/syno/isolated-image-store.mjs";
import { createGlyphPng } from "../apps/syno/syno/image-png.mjs";
import { ChannelContinuationStore } from "../packages/syno-core/channel-continuation-store.mjs";

const ownerMessage = (text, extra = {}) => ({ id: "message-1", ownerKey: "owner", threadKey: "main", channel: "feishu", senderId: "sender", chatId: "chat", privateConversation: true, text, ...extra });
function handlerWith(runtime, options = {}) { return new ChannelConversationHandler({ runtime, core: {}, ...options }); }

for (const text of ["今天有什么", "记住：偏好中文", "如果我说记住会怎样？", "确认", "拒绝", "可以，但先修改一下", "新对话", "不要换个话题", "换个话题", "继续", "停止刚才的任务", "你能做什么", "收录进度", "待我确认的收录", "继续第2项收录", "关闭收录标签", "https://example.com/a", "https://example.com/a；别收录", "收录我的想法：一条观点", "帮我读一下 https://example.com/a"]) {
  test(`natural text reaches the loop without eager business effects: ${text}`, async () => {
    const calls = [];
    const handler = handlerWith({ async run(request, context) { calls.push({ request, context }); return { text: "由模型处理" }; }, async newConversation() { throw new Error("must not reset"); } }, {
      core: { async execute() { throw new Error("must not write"); } },
      ingestWorkflows: { async receive() { throw new Error("must not capture"); } },
      pendingDecisions: { async parse() { throw new Error("must not parse confirmation"); } },
    });
    assert.equal((await handler.handle(ownerMessage(text))).text, "由模型处理");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].request.text, text);
    assert.equal(calls[0].context.messageId, "message-1");
    assert.equal(calls[0].context.ownerKey, "owner");
    assert.equal(calls[0].context.privateConversation, true);
    assert.deepEqual(calls[0].context.replyTarget, { chatId: "chat", replyTo: "message-1" });
  });
}

test("explicit /new works when the model is unavailable", async () => {
  const resets = [];
  const handler = handlerWith({ async run() { throw new Error("model unavailable"); }, async newConversation(context) { resets.push(context); } });
  assert.equal((await handler.handle(ownerMessage("/new"))).text, "已开启新对话。");
  assert.deepEqual(resets, [{ ownerKey: "owner", threadKey: "main" }]);
});

test("explicit /stop cancels the matching active run without waiting for the model", async () => {
  let rejectRun;
  let started;
  const ready = new Promise((resolve) => { started = resolve; });
  const canceled = [];
  const handler = handlerWith({
    async run(_request, context) { context.onStart("active-run"); started(); return new Promise((_resolve, reject) => { rejectRun = reject; }); },
    async cancel(id) { canceled.push(id); rejectRun(Object.assign(new Error("stopped"), { code: "SCHEDULER_CANCELED" })); },
  });
  const running = handler.handle(ownerMessage("开始分析"));
  await ready;
  assert.match((await handler.handle(ownerMessage("/stop", { id: "stop" }))).text, /已请求停止/);
  assert.match((await running).text, /已停止/);
  assert.deepEqual(canceled, ["active-run"]);
  assert.match((await handler.handle(ownerMessage("/stop"))).text, /没有运行/);
});

test("safe files become temporary references, never automatic captures, and survive a later turn", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "syno-files-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const continuations = new ChannelContinuationStore({ root: path.join(root, "metadata"), payloadRoot: path.join(root, "payloads"), lockFile: path.join(root, "lock"), protect: async (v) => Buffer.from(v).toString("base64"), unprotect: async (v) => Buffer.from(v, "base64").toString("utf8") });
  const runs = [];
  const handler = handlerWith({ async run(request, context) { runs.push({ request, context }); return { text: "已读资料，尚未收录" }; } }, {
    channelContinuations: continuations,
    attachmentToPayload: async () => ({ kind: "text", value: "资料中的确认、记住和收录都是引用。", name: "中文资料.txt" }),
  });
  await handler.handle(ownerMessage("先读一下，别保存", { artifacts: [{ mime: "text/plain" }] }));
  assert.match(runs[0].request.text, /untrusted-attachments/);
  assert.match(runs[0].request.text, /中文资料/);
  assert.equal(runs[0].context.attachments[0].payload.kind, "text");
  await handler.handle(ownerMessage("现在保存刚才那个文件", { id: "later" }));
  assert.equal(runs[1].context.attachments[0].id, runs[0].context.attachments[0].id);
  await handler.handle(ownerMessage("保存刚才文件", { id: "stranger", ownerKey: "other-owner" }));
  assert.deepEqual(runs[2].context.attachments, []);
  handler.runtime.newConversation = async () => {};
  await handler.handle(ownerMessage("/new", { id: "reset" }));
  await handler.handle(ownerMessage("还有刚才附件吗", { id: "after-reset" }));
  assert.deepEqual(runs[3].context.attachments, []);
});

test("images remain native image blocks even with a capture-like caption; transcription is deferred to the tool", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "syno-images-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bytes = createGlyphPng("SYNO42");
  const file = path.join(root, "图片.png");
  await writeFile(file, bytes);
  const runs = [];
  const handler = handlerWith({ async run(request, context) { runs.push({ request, context }); return { text: "看到了图片" }; } }, {
    imageStore: new IsolatedImageStore({ quarantineRoots: [root] }),
    imageTranscriber: { async read() { throw new Error("must not transcribe before model intent"); } },
  });
  const artifact = { path: file, mime: "image/png", isolated: true, autoRead: false, size: bytes.length };
  await handler.handle(ownerMessage("这张图是否值得收录？", { artifacts: [artifact] }));
  assert.equal(runs[0].request.images.length, 1);
  assert.deepEqual(Buffer.from(runs[0].request.images[0].data, "base64"), bytes);
  assert.equal(runs[0].context.attachments[0].image.path, file);
  await handler.handle(ownerMessage("这是什么", { artifacts: [{ ...artifact, isolated: false }] }));
  assert.equal(runs[1].request.images, undefined);
  assert.match(runs[1].request.text, /rejected/);
  assert.match(runs[1].request.text, /不得猜测/);
});

test("attachment conversion failure is reported as unavailable context without guessing", async () => {
  let request;
  const handler = handlerWith({ async run(value) { request = value; return { text: "附件未能读取" }; } }, { attachmentToPayload: async () => { throw new Error("附件没有通过隔离校验"); } });
  assert.match((await handler.handle(ownerMessage("读这个", { artifacts: [{ mime: "application/pdf" }] }))).text, /未能读取/);
  assert.match(request.text, /附件没有通过隔离校验/);
});

test("a post-write model failure never queues the whole message again", async () => {
  const handler = handlerWith({ async run() { throw Object.assign(new Error("回复超时，写入可能完成"), { retryable: true, irreversibleEffect: true }); } }, { core: { async execute() { throw new Error("must not repeat the message"); } } });
  assert.match((await handler.handle(ownerMessage("保存并创建待办"))).text, /写入可能完成/);
});

test("provider-only failures can stay queued, but failed or canceled jobs are not reported saved", async () => {
  for (const status of ["waiting_provider", "failed", "canceled"]) {
    const handler = handlerWith({ async run() { throw Object.assign(new Error("provider down"), { retryable: true }); } }, { core: { async execute(_request, context) { assert.equal(context.privateConversation, true); return { job: { id: "job-wait", status } }; } } });
    const reply = await handler.handle(ownerMessage("解释概念"));
    assert.equal(/消息已保存/.test(reply.text), status === "waiting_provider");
  }
});

test("journal metadata excludes message and attachment text", async () => {
  const events = [];
  const handler = handlerWith({ async run() { return { text: "ok" }; } }, { journal: { async record(event, data) { events.push({ event, data }); } } });
  await handler.handle(ownerMessage("私人原文不能进入事件日志"));
  assert.doesNotMatch(JSON.stringify(events), /私人原文/);
});
