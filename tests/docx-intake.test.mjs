import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { IntakeService, MAX_ATTACHMENT_BYTES, extractDocxText } from "../apps/syno/syno/intake.mjs";
import { makeMinimalDocx } from "./helpers/minimal-docx.mjs";

test("DOCX intake validates PK magic bytes and size", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-docx-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new IntakeService({
    runtimeRoot: root,
    docxExtractor: async () => ({ text: "Extracted DOCX content" }),
  });
  await assert.rejects(
    service.prepare({ kind: "docx", base64: Buffer.from("not zip").toString("base64") }),
    /有效 DOCX/,
  );
  const pkBytes = Buffer.from("PK\x03\x04mock-docx-content");
  const request = await service.prepare({ kind: "docx", name: "report.docx", base64: pkBytes.toString("base64") });
  assert.equal(request.intent, "curate_note");
  assert.equal(request.sourceType, "docx");
  assert.match(request.attachment, /report\.docx$/);
  assert.equal(path.isAbsolute(request.attachment), false);
  assert.match(request.text, /Extracted DOCX content/);
  assert.match(request.text, /<untrusted-docx>/);
  assert.equal(request.artifact.mime, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.equal((await fs.stat(path.join(root, "uploads", request.attachment))).size, pkBytes.length);
});

test("DOCX intake rejects empty text", async () => {
  const service = new IntakeService({ docxExtractor: async () => ({ text: "" }) });
  const pkBytes = Buffer.from("PK\x03\x04mock");
  await assert.rejects(
    service.prepare({ kind: "docx", base64: pkBytes.toString("base64") }),
    /没有可提取的文本/,
  );
});

test("DOCX intake rejects files over 10 MB", async () => {
  const service = new IntakeService();
  const big = Buffer.alloc(MAX_ATTACHMENT_BYTES + 1, 0x50);
  big[1] = 0x4b;
  await assert.rejects(
    service.prepare({ kind: "docx", base64: big.toString("base64") }),
    /10 MB/,
  );
});

test("DOCX extractor receives a Buffer argument", async () => {
  let receivedArg;
  const service = new IntakeService({
    docxExtractor: async (bytes) => { receivedArg = bytes; return { text: "ok" }; },
  });
  const pkBytes = Buffer.from("PK\x03\x04mock");
  await service.prepare({ kind: "docx", base64: pkBytes.toString("base64") });
  assert.equal(Buffer.isBuffer(receivedArg), true);
});

test("extractDocxText parses a real minimal DOCX via mammoth (default extractor)", async () => {
  // 既有 docx 测试全注入 fake extractor，真实 mammoth.convertToHtml（{buffer} 互操作 +
  // convertImage 丢图）零端到端覆盖——本例补这个盲区，不注入、走默认 extractDocxText。
  const docx = makeMinimalDocx("Hello Syno mammoth integration test 世界");
  assert.equal(docx[0], 0x50, "DOCX 以 PK magic byte 开头");
  assert.equal(docx[1], 0x4b);
  const { text } = await extractDocxText(docx);
  assert.match(text, /Hello Syno mammoth integration test 世界/, "UTF-8 正文经 mammoth 真实解析后保留");
});

test("extractDocxText rejects a DOCX with no extractable text (default extractor)", async () => {
  const docx = makeMinimalDocx("");
  await assert.rejects(() => extractDocxText(docx), /没有可提取的文本/);
});
