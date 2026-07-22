import test from "node:test";
import assert from "node:assert/strict";

import { IntakeService } from "../apps/syno/syno/intake.mjs";

test("HTML intake extracts readable text and wraps in untrusted-source", async () => {
  const service = new IntakeService({
    htmlExtractor: (bytes) => ({ text: bytes.toString("utf8").replace(/<[^>]+>/g, "").trim() }),
  });
  const html = Buffer.from("<html><body><h1>Title</h1><p>Paragraph</p></body></html>");
  const request = await service.prepare({ kind: "html", name: "page.html", base64: html.toString("base64") });
  assert.equal(request.intent, "curate_note");
  assert.equal(request.sourceType, "html");
  assert.equal(request.artifact.mime, "text/html");
  assert.match(request.text, /<untrusted-source>/);
  assert.match(request.text, /Title/);
  assert.equal(request.attachment, undefined);
});

test("HTML intake rejects empty text", async () => {
  const service = new IntakeService({ htmlExtractor: () => ({ text: "" }) });
  await assert.rejects(
    service.prepare({ kind: "html", base64: Buffer.from("<html></html>").toString("base64") }),
    /没有可提取的文本/,
  );
});

test("HTML intake rejects files over 1 MB", async () => {
  const service = new IntakeService();
  const big = Buffer.alloc(1024 * 1024 + 1, 0x41);
  await assert.rejects(
    service.prepare({ kind: "html", base64: big.toString("base64") }),
    /1 MB/,
  );
});

test("HTML default extractor strips scripts and preserves readable text", async () => {
  const service = new IntakeService();
  const html = Buffer.from("<html><body><main>Hi<script>attack()</script><p>World</p></main></body></html>");
  const request = await service.prepare({ kind: "html", name: "test.html", base64: html.toString("base64") });
  assert.equal(request.content, "Hi\nWorld");
});
