import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { artifactToIntakePayload } from "../packages/syno-core/attachment-intake.mjs";
import { clip, formatNotice, stripMarkdown } from "../packages/syno-core/text-format.mjs";

test("stripMarkdown removes markers that would leak as literal symbols", () => {
  const text = stripMarkdown([
    "```js",
    "const a = 1;",
    "```",
    "# 标题",
    "**粗体** 与 __另一种粗体__ 与 *斜体*",
    "行内 `code` 与 [文字](https://example.com/x)",
    "- 列表项",
    "> 引用",
  ].join("\n"));
  assert.match(text, /const a = 1;/);
  assert.doesNotMatch(text, /```|^#\s|\*\*|__|`/m);
  assert.match(text, /标题/);
  assert.match(text, /文字（https:\/\/example\.com\/x）/);
  assert.match(text, /· 列表项/);
});

test("clip trims to the requested length and drops dangling punctuation", () => {
  assert.equal(clip("短句", 10), "短句");
  const long = clip("这是一段很长的话，后面还有更多内容，", 8);
  assert.equal(long.endsWith("…"), true);
  assert.ok(long.length <= 9, `实得 ${long}`);
});

test("formatNotice keeps single newlines inside a section (markdown channels render them)", () => {
  const text = formatNotice({
    title: "📥 收录方案待确认",
    sections: [
      { icon: "📝", heading: "内容要点", lines: ["《标题》", "摘要…"] },
      { lines: ["🔎 来源　high / verified"] },
      { icon: "⚠️", heading: "", lines: ["· 待确认项"] },
    ],
    footer: "回复「确认」保存",
  });
  assert.equal(text, [
    "📥 收录方案待确认",
    "📝 内容要点\n《标题》\n摘要…",
    "🔎 来源　high / verified",
    "· 待确认项",
    "回复「确认」保存",
  ].join("\n\n"));
  assert.doesNotMatch(text, /\n\n\n/, "不得出现微信时代的逐行铺空行");
});

test("artifactToIntakePayload converts quarantined files and refuses anything else", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-attachment-intake-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const pdfBytes = Buffer.from("%PDF-1.4 x");
  const pdf = path.join(root, "doc.pdf");
  await fs.writeFile(pdf, pdfBytes);
  const payload = await artifactToIntakePayload({ path: pdf, mime: "application/pdf", size: pdfBytes.length, isolated: true, autoRead: false }, { quarantineRoot: root });
  assert.equal(payload.kind, "pdf");
  assert.equal(payload.name, "doc.pdf");
  assert.ok(payload.base64.length > 0);

  await assert.rejects(
    artifactToIntakePayload({ path: pdf, mime: "application/pdf", isolated: false, autoRead: false }, { quarantineRoot: root }),
    /隔离校验/,
  );
  await assert.rejects(
    artifactToIntakePayload({ path: path.join(os.tmpdir(), "outside.pdf"), mime: "application/pdf", isolated: true, autoRead: false }, { quarantineRoot: root }),
    /超出允许范围/,
  );
  await assert.rejects(
    artifactToIntakePayload({ path: pdf, mime: "application/zip", size: pdfBytes.length, isolated: true, autoRead: false }, { quarantineRoot: root }),
    /暂不支持/,
  );
});
