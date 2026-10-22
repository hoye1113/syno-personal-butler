# 修复：浏览器通道正文提取失效（extractReadableText 对微信 HTML 产出 JS 垃圾）

- 日期：2026-10-21
- 状态：待启动
- 关联：`docs/plans/harden-verification-page-detection.md`（已实施，fail-closed 保留作纵深防御）

## 背景（2026-10-21 实证）

管家读微信文章连续失败的真正根因**不是验证墙**：

1. 浏览器里页面一直渲染正常（同日 bsk 手动 5/5 次拿到完整标题+正文）。
2. `bsk observe --json` 返回 `{text, next_cursor}`，**没有 title 字段**
   → `browser-capture-adapter.mjs:318` 的 `firstString(result, ["title",...])` 恒为 `""`（「标题未知」）。
3. 页面有图 → `#snapshot` 走 `extractReadableText(images.html)`（`source-fetcher.mjs:211`）。
   其 `<script>` 剥离正则对微信 HTML 失效：4.47MB 完整 HTML 下产出 86k 字符、
   开头仍是压缩 JS（`key:"watch",value:function...`），正文虽在但埋在 JS 垃圾里。
4. 加固前：requiresInteraction 漏判 → JS 当正文交给主人。
   加固后：scriptResidue 判 blocked → 管家误报「验证墙」，引导主人去过一个不存在的验证。

## 目标

微信文章经 bsk 通道拿到「真实标题 + 干净正文」；提取垃圾时降级到 VOM 文本而非误判验证墙。

## 步骤

1. `browser-capture-adapter.mjs` `#snapshot`：
   - title：observe 无 title 字段时，从 get-html 的 `<title>` 解析。
   - content：extractReadableText 产出物先过 sanity（`scriptResidue` / `hasSourceNoise` 级别），
     命中则降级用 observe 的 VOM 文本（`flattenSnapshotTree(raw)`，本就是无图时的既有兜底路径）；
     两者皆垃圾才维持 blocked。
2.  sanity 判定复用 `source-validity.mjs` 的 scriptResidue（导出）与 source-fetcher 的 hasSourceNoise。
3. 测试（`tests/browser-capture-adapter.test.mjs`）：
   - observe 返回真实形态 `{text: "@vom…RootWebArea…"}`（无 title）+ get-html 返回微信式 HTML
     （extractReadableText 产出 JS）→ 期望 status=completed、content=正文、title 来自 `<title>`。
   - 真验证墙（VOM 为「环境异常…」短文）→ 仍 BROWSER_BLOCKED_UNATTENDED。
   - 无图文章页 → 既有行为不回归。

## 验收标准

- 新测试全绿 + 全套 `node scripts/run-tests.mjs` 0 失败。
- 实证：重启管家后用它重读 `https://mp.weixin.qq.com/s/-EFXGnoQEXrLvo8oAglXJA`，
  拿到标题《Agent 写得更快以后，时间花在了哪里？》与正文，而非 JS 或验证墙误报。
