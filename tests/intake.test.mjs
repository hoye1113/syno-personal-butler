import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { classifyUrl, IntakeService, validatePublicUrl } from "../apps/syno/syno/intake.mjs";

test("intake accepts public URLs and only a single Bilibili opus/cv", () => {
  assert.equal(classifyUrl(validatePublicUrl("https://www.bilibili.com/opus/123")), "bilibili-opus");
  assert.equal(classifyUrl(validatePublicUrl("https://www.bilibili.com/read/cv456")), "bilibili-opus");
  assert.throws(() => classifyUrl(validatePublicUrl("https://space.bilibili.com/123")), /单篇/);
  assert.throws(() => validatePublicUrl("http://127.0.0.1/private"), /内网/);
});

test("PDF intake validates magic bytes and size before quarantine", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-intake-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new IntakeService({ runtimeRoot: root });
  await assert.rejects(service.prepare({ kind: "pdf", base64: Buffer.from("not pdf").toString("base64") }), /有效 PDF/);
  const request = await service.prepare({ kind: "pdf", name: "paper.pdf", base64: Buffer.from("%PDF-1.7\nmock").toString("base64") });
  assert.equal(request.intent, "curate_note");
  assert.match(request.attachment, /paper\.pdf$/);
  assert.equal((await fs.stat(request.attachment)).size, 13);
});
