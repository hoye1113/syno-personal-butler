import assert from "node:assert/strict";
import test from "node:test";

import { clip, formatWx, stripMarkdown } from "../apps/syno/syno/weixin-text-format.mjs";

test("formatWx 用空行分节、emoji 锚点成块", () => {
  const out = formatWx({
    title: "📥 收录方案待确认",
    sections: [
      { icon: "📝", heading: "内容要点", lines: ["《某文》", "摘要…"] },
      { icon: "📂", heading: "保存位置", lines: ["vault/00-Inbox/xx.md"] },
    ],
    footer: "——————\n回复「确认」",
  });
  // 标题 / 两节 / 页脚之间各一个空行
  assert.equal(out, [
    "📥 收录方案待确认",
    "📝 内容要点\n《某文》\n摘要…",
    "📂 保存位置\nvault/00-Inbox/xx.md",
    "——————\n回复「确认」",
  ].join("\n\n"));
  // 恰好 3 个空行分隔符
  assert.equal((out.match(/\n\n/g) || []).length, 3);
});

test("formatWx 省略空节与空行，heading-only 节也成立", () => {
  const out = formatWx({
    title: "标题",
    sections: [
      { icon: "✅", heading: "无额外待确认事项", lines: [] }, // heading-only
      { icon: "⚠️", heading: "", lines: [] },                 // 全空 → 省略
      { lines: ["🔎 来源　high/verified", "🔁 相似　2 个"] },   // 无标题节
    ],
  });
  assert.equal(out, "标题\n\n✅ 无额外待确认事项\n\n🔎 来源　high/verified\n🔁 相似　2 个");
});

test("formatWx 无 title/footer 也能渲染", () => {
  assert.equal(formatWx({ sections: [{ lines: ["只有一行"] }] }), "只有一行");
  assert.equal(formatWx({}), "");
});

test("stripMarkdown 去掉微信不渲染的标记", () => {
  assert.equal(stripMarkdown("**重要**结论"), "重要结论");
  assert.equal(stripMarkdown("# 标题一"), "标题一");
  assert.equal(stripMarkdown("## 二级 标题"), "二级 标题");
  assert.equal(stripMarkdown("`inline`代码"), "inline代码");
  assert.equal(stripMarkdown("[点我](https://x.com)"), "点我（https://x.com）");
  assert.equal(stripMarkdown("> 引用块"), "引用块");
});

test("stripMarkdown 代码围栏去围栏保内容、列表符号转 ·、多余空行压一", () => {
  assert.equal(stripMarkdown("```js\nconst a = 1;\nconst b = 2;\n```"), "const a = 1;\nconst b = 2;");
  assert.equal(stripMarkdown("- 第一项\n* 第二项\n+ 第三项"), "· 第一项\n· 第二项\n· 第三项");
  assert.equal(stripMarkdown("第一行\n\n\n\n第二行"), "第一行\n\n第二行");
});

test("stripMarkdown 保留换行、不误伤数字列表与乘号", () => {
  assert.equal(stripMarkdown("1. 第一\n2. 第二"), "1. 第一\n2. 第二");
  assert.equal(stripMarkdown("价格 5*3=15"), "价格 5*3=15");
  // 段落换行保留（不因清洗丢结构）
  assert.equal(stripMarkdown("段一\n\n段二"), "段一\n\n段二");
});

test("clip 截断到指定字数并加省略号，短文本原样、空白压缩", () => {
  assert.equal(clip("短文本", 10), "短文本");
  assert.equal(clip("多余   空白\n压缩", 50), "多余 空白 压缩");
  const long = "一".repeat(200);
  const out = clip(long, 120);
  assert.equal(out.length, 121); // 120 字 + 省略号
  assert.ok(out.endsWith("…"));
});
