import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { hasSourceNoise } from "../apps/syno/syno/source-fetcher.mjs";
import { IngestService } from "../apps/syno/syno/ingest-service.mjs";

const RULE = ".wp-grid{display:grid;grid-template-columns:repeat(4,1fr);column-gap:1.5rem;row-gap:1.5rem;align-items:start;justify-content:center}";
const LEAK = `Skip to content
Blog
Changelog
${RULE}
.wp-grid > *{justify-content:center;align-items:center;min-height:48px;padding:12px 16px;border-radius:8px;background-color:rgba(0,0,0,.9);overflow:hidden;position:relative}
@keyframes slide-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
@media only screen and (max-width:781px){.wp-grid{grid-template-columns:repeat(2,1fr);gap:1rem}}
${Array.from({ length: 6 }, (_, i) => `.wp-lightbox-overlay-${i}{box-sizing:border-box;cursor:zoom-out;height:100vh;overflow:hidden;position:fixed;z-index:100000;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;width:100%;inset:0;transition:opacity .2s ease}`).join("\n")}
.wp-lightbox-form button{cursor:pointer;outline:none;border:0;background:none}
.wp-lightbox-overlay img{max-width:100vw;max-height:100vh;object-fit:contain;width:auto;height:auto;border:0}
`.replace(/\n/g, "") + "\n\nNews & Insights\n";

function longCss(lines = 40) {
  const rule = ".wp-thing{display:flex;align-items:center;justify-content:center;min-height:48px;padding:12px 16px;border-radius:8px;background-color:rgba(0,0,0,.9);position:relative;z-index:1;overflow:hidden}";
  return "News\nInsights\nEngineering\n" + Array.from({ length: lines }, () => rule).join("");
}

test("hasSourceNoise: 检测泄漏的 WP 样式表（长行 + 特征标记）", () => {
  assert.equal(hasSourceNoise(LEAK), true);
  assert.equal(hasSourceNoise(longCss(40)), true);
});

test("hasSourceNoise: 正常正文与格式化教程不误报", () => {
  const prose = "这是一篇关于 JavaScript 的普通文章。\n".repeat(80);
  assert.equal(hasSourceNoise(prose), false);

  const tutorial = "# CSS Grid 指南\n\n" +
    "Grid 很强大，列与行轨道、gap 间距、按行号放置元素。\n\n" +
    Array.from({ length: 20 }, () =>
      "```css\n.wp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem}\n```\n\n" +
      "媒体查询按视口重建列数，对齐用 justify 与 align 属性。\n\n",
    ).join("");
  assert.equal(hasSourceNoise(tutorial), false);
});

test("hasSourceNoise: 短文本与无特征文本不判定", () => {
  assert.equal(hasSourceNoise("hello world"), false);
  assert.equal(hasSourceNoise(""), false);
});

test("applyBrowserSnapshot: 浏览器快照的 CSS 噪声二次门被拒并给出专用错误码", async (t) => {
  const root = path.join(await fs.mkdtemp(path.join(tmpdir(), "syno-noise-")), "ingest");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const state = {
    payload: { kind: "url", value: "https://example.com/css-leak" },
    status: "received", created: "2026-08-07T00:00:00.000Z",
  };
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, "artifact-noise.json"), JSON.stringify(state), "utf8");
  const ingest = new IngestService({ knowledge: { async search() { return []; } }, stateRoot: root });
  await assert.rejects(
    () => ingest.applyBrowserSnapshot("artifact-noise", { content: LEAK, finalUrl: "https://example.com/css-leak" }),
    (error) => error.code === "INGEST_BROWSER_CONTENT_NOISE",
  );
  await assert.doesNotReject(() => ingest.applyBrowserSnapshot("artifact-noise", { content: "正常浏览器渲染正文\n".repeat(40), finalUrl: "https://example.com/css-leak" }));
});
