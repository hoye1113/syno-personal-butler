import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Readable } from "node:stream";

import { mimeForAttachment, sniffMime } from "../packages/syno-core/attachment-mime.mjs";
import { quarantineFeishuResources } from "../packages/syno-core/feishu-attachments.mjs";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02, 0x03]);
const PDF = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from("x".repeat(32))]);

test("sniffMime recognizes the formats both channels accept", () => {
  assert.equal(sniffMime(PNG), "image/png");
  assert.equal(sniffMime(PDF), "application/pdf");
  assert.equal(sniffMime(Buffer.from("PK\x03\x04rest")), "application/zip");
  assert.equal(sniffMime(Buffer.from("plain text\n")), "text/plain");
  assert.equal(sniffMime(Buffer.from([0x00, 0x01, 0x02, 0x03])), "");
});

test("mimeForAttachment prefers content sniffing and only falls back to the file name", () => {
  assert.equal(mimeForAttachment({ fileName: "shot.bin", bytes: PNG }), "image/png");
  assert.equal(mimeForAttachment({ fileName: "doc.pdf", bytes: PDF }), "application/pdf");
  assert.equal(mimeForAttachment({ fileName: "报告.docx", bytes: Buffer.concat([Buffer.from("PK\x03\x04"), Buffer.alloc(8)]) }), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.equal(mimeForAttachment({ fileName: "note.md", bytes: Buffer.from("# 标题\n") }), "text/markdown");
  assert.equal(mimeForAttachment({ fileName: "page.html", bytes: Buffer.from("<html></html>") }), "text/html");
  assert.equal(mimeForAttachment({ fileName: "x.txt", bytes: Buffer.from("hello") }), "text/plain");
  assert.equal(mimeForAttachment({ fileName: "mystery.bin", bytes: Buffer.from([0x00, 0x01]) }), "");
});

test("quarantineFeishuResources downloads image and file resources into the quarantine root", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-feishu-attach-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const requested = [];
  const artifacts = await quarantineFeishuResources({
    messageId: "om_1",
    quarantineRoot: root,
    resources: [
      { type: "image", fileKey: "img_key_1" },
      { type: "file", fileKey: "file_key_1", fileName: "报告.docx" },
      { type: "sticker", fileKey: "sticker_1" },
    ],
    loadResource: async ({ type, fileKey }) => {
      requested.push({ type, fileKey });
      const bytes = type === "image" ? PNG : Buffer.concat([Buffer.from("PK\x03\x04"), Buffer.alloc(16)]);
      return { getReadableStream: () => Readable.from([bytes]) };
    },
  });
  assert.deepEqual(requested, [{ type: "image", fileKey: "img_key_1" }, { type: "file", fileKey: "file_key_1" }]);
  assert.equal(artifacts.length, 3);
  const [image, doc, sticker] = artifacts;
  assert.equal(image.mime, "image/png");
  assert.equal(image.isolated, true);
  assert.equal(image.autoRead, false);
  assert.equal(image.size, PNG.length);
  assert.ok(image.path.startsWith(root), "必须落在隔离区目录内");
  assert.deepEqual(await fs.readFile(image.path), PNG, "落盘内容与下载字节一致");
  assert.equal(doc.mime, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.match(path.basename(doc.path), /报告\.docx$/u);
  assert.equal(sticker.rejected, true, "暂不支持的资源类型必须如实拒绝");
  assert.match(sticker.reason, /暂不支持/);
});

test("quarantineFeishuResources caps size and reports rejected artifacts honestly", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-feishu-attach-cap-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const artifacts = await quarantineFeishuResources({
    messageId: "om_2",
    quarantineRoot: root,
    maxBytes: 8,
    resources: [{ type: "file", fileKey: "big", fileName: "big.pdf" }],
    loadResource: async () => ({ getReadableStream: () => Readable.from([PDF]) }),
  });
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].rejected, true);
  assert.match(artifacts[0].reason, /上限/);
  assert.deepEqual(await fs.readdir(root).catch(() => []), [], "超限文件不得落盘");

  const unreadable = await quarantineFeishuResources({
    messageId: "om_3",
    quarantineRoot: root,
    resources: [{ type: "file", fileKey: "x", fileName: "x.bin" }],
    loadResource: async () => ({ getReadableStream: () => Readable.from([Buffer.from([0, 1, 2, 3])]) }),
  });
  assert.equal(unreadable[0].rejected, true);
  assert.match(unreadable[0].reason, /无法识别/);
});

test("Feishu adapter passes quarantined attachments to the conversation handler", async (t) => {
  const { FeishuChannelAdapter, FeishuStateStore } = await import("../packages/syno-core/feishu-channel.mjs");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-feishu-adapter-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const handlers = new Map();
  const received = [];
  const channel = {
    on(name, handler) { handlers.set(name, handler); },
    async connect() {},
    async disconnect() {},
    async send() { return { messageId: "sent-1" }; },
    async updateCard() {},
    async recallMessage() {},
  };
  const adapter = new FeishuChannelAdapter({
    typingIndicator: false,
    credentials: { async load() { return { appId: "cli_test", appSecret: "secret", ownerOpenId: "owner" }; } },
    stateStore: new FeishuStateStore({ file: path.join(root, "state.json") }),
    channelFactory: () => channel,
    retryDelayMs: 60_000,
    quarantineRoot: root,
    quarantineResources: async ({ resources, messageId }) => {
      assert.equal(messageId, "om_img");
      assert.equal(resources.length, 1);
      return [{ path: path.join(root, "downloaded.png"), size: PNG.length, mime: "image/png", isolated: true, autoRead: false }];
    },
    onMessage: async (message) => { received.push(message); return { text: "收到图" }; },
  });
  await adapter.start();
  const deliver = (message) => handlers.get("message")({ chatType: "p2p", senderId: "owner", ...message });
  const wait = async (predicate) => {
    for (let i = 0; i < 40 && !predicate(); i += 1) await new Promise((resolve) => setTimeout(resolve, 5));
    assert.ok(predicate(), "等待超时");
  };

  deliver({ messageId: "om_text", chatId: "c1", content: "普通文字" });
  await wait(() => received.length === 1);
  assert.equal(received[0].artifacts, undefined, "纯文本消息不带 artifacts");

  deliver({ messageId: "om_img", chatId: "c1", rawContentType: "image", content: "", resources: [{ type: "image", fileKey: "k1" }] });
  await wait(() => received.length === 2);
  assert.equal(received[1].artifacts.length, 1);
  assert.equal(received[1].artifacts[0].mime, "image/png");
  assert.equal(received[1].artifacts[0].isolated, true);
});
