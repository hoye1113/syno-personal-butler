# 加固：浏览器通道验证页漏判（空标题 + JS 残留被当正文）

- 日期：2026-10-21
- 状态：待启动（handoff）
- 关联：`docs/adr/0006-bsk-unattended-browser-capture.md`、`packages/syno-core/source-validity.mjs`

## 背景

管家通过 bsk 读微信公众号文章时，页面命中微信「环境异常」人机验证页。
`sourceValidity`（`source-validity.mjs:7-13`）依赖标题含「环境异常/安全验证」等文案、
或正文含「当前环境异常，完成验证后即可继续访问」来识别验证页；但 bsk observe 通道
在验证页上拿到的是**空标题 + 压缩 JS 残留正文**（颜色库/渲染器脚本），两类正则均不匹配，
且 JS 残留长度超过 `body.length < 1200` 的门槛 → 漏判为有效，JS 被当正文返回给主人。

2026-10-21 实测：daemon 修复后同一链接（mp.weixin.qq.com/s/-EFXGnoQEXrLvo8oAglXJA）
已正常渲染，observe/get-html 均拿到真实标题与正文，说明验证为暂时性拦截。

## 目标

验证页在「空标题 + 脚本残留正文」形态下也被判为 `SOURCE_VERIFICATION_REQUIRED`
（走 `BROWSER_BLOCKED_UNATTENDED` + keepSessionOnBlock 等人过验证），不再把 JS 当正文交出。

## 步骤

1. 在 `source-validity.mjs` 增加一类判定：标题为空且正文脚本特征占比高
   （如 `<script`/`function`/`=>` 密度、可读者字符占比低、无中文/自然语言句子）→ 判 invalid。
2. `browser-capture-adapter.mjs:144` 的 observe 预检与 `#snapshot` 的 html 分支共用同一判定，
   确认两条路径都覆盖（observe 文本与 extractReadableText 结果）。
3. 补测试：`tests/browser-capture-adapter.test.mjs` 加用例——
   空标题 + JS 残留 → `BROWSER_BLOCKED_UNATTENDED`；正常文章页不受影响。

## 验收标准

- 新用例通过：空标题 + 脚本残留正文 → 返回 blocked，不再 status=completed。
- 现有测试全绿（`pnpm test` 或对应测试命令）。
- 真人文章页（有标题有正文）判定不回归。
