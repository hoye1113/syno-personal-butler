# 修复浏览器图片资源闭环（BSK 已取得 HTML，但收录后无图）

- 日期：2026-11-09
- 状态：已实施（本地验证完成；生产部署与飞书验收未执行）
- 类型：下一轮源码执行计划
- 核查基线：`main@668f42b565699b7bbbeb958cd46812f97bcce840`
- 上位计划：`docs/plans/2026-11-05-butler-reliability-remediation.md` B 部分；本文件是其执行细化，不同时实施同步与 MOC 项

## 背景

BSK 已经能通过 `get-html` 取得微信 HTML，`htmlImageReferences()` 也已经优先读取 `data-src`。当前无图的主断点是：HTML 正文提取被判为 JS 垃圾后，`BrowserCaptureAdapter` 改用 VOM/a11y 正文；VOM 只剩 `image "图片"`，而 HTML 中发现的图片 URL 没有回写正文。后续 `SourceResources.apply()` 只替换已有 Markdown 图片地址，因此即使资源清单有 URL，也无法完成正文嵌入。

另有一个确定性缺口：`applyBrowserSnapshot()` 会把适配器返回的 `resourceDiscoveryComplete:false` 覆盖成 `true`。Referer 是通用下载兼容项，但是否必需必须由真实文章验证，不能预设为本次根因。

## 2026-11-09 真实文章实测

链接：`https://mp.weixin.qq.com/s/QbtWTr7acjDTULCOvA77aA`。

- BSK `observe` 成功，返回 11 个 `image "图片"` 占位；这些节点不全属于正文。
- BSK `get-html` 成功，完整 HTML 为 4,728,535 字节；当前 2,000,000 字节调用明确返回 `truncated=true`。
- 只读 DOM 查询确认 `#js_content` 内有 6 张正文图片，每张都有真实 `data-src`。全页 HTML 的 20 个 `<img>` 还包含正文外头像、二维码等，不能全部与 VOM 占位按序配对。
- 第一张正文图片无 Referer 和带 `https://mp.weixin.qq.com/` Referer 均返回 HTTP 200、`image/png`、772,610 字节，文件签名均为 PNG。因此本文已证明“BSK 能取得地址且图片能下载”，Referer 不是本文的下载阻断原因。
- 修复必须先限定正文容器，再恢复 VOM 图片引用；仅按全页 `body_image` 数量配对会误嵌正文外图片。

## 目标

1. 对 HTML 中确有 `data-src/src` 的公开文章，VOM 回退后仍保留正文图片的位置、URL 和资源清单。
2. 图片可经现有下载、本地缓存、Markdown 替换和飞书发布链路处理；微信常见 Referer 防盗链差异得到覆盖。
3. 图片位置无法可靠对应、HTML 截断或 CDN 下载失败时，明确保留不完整状态，不猜图、不伪报完整图文。
4. 不改变正常 HTML 正文提取、验证墙 fail-closed、SSRF 和远端发布保护。

## 实施步骤

### 1. 先补失败回归，锁定当前断点

修改 `tests/browser-capture-adapter.test.mjs` 中现有微信 VOM 回退夹具，并新增正文容器用例：

- 构造带 `#js_content` 的微信式 HTML：正文内放两个 `data-src` 图片，正文外放头像、二维码和 JS；VOM 保留正文及正文外图片占位。
- 修复前确认：全页提取受 JS 干扰，正文图片 Markdown 丢失，且全页图片清单混入正文外资源。
- 修复后断言：只提取正文容器内的两张图片，位置、Markdown 与资源清单一致，正文无 JS 垃圾，正文外图片不混入。

新增保守边界用例：

- 装饰图和 `inline:` 资源不占正文图片序号。
- 找不到可靠正文容器、容器提取仍有垃圾或图片位置无法确认时，不猜位置并令 `resourceDiscoveryComplete=false`。
- 正常非微信 HTML 提取路径不变，不产生重复图片；无图文章和验证墙行为不变。

### 2. 优先按正文容器提取，避免全页 HTML 噪声

修改 `packages/syno-core/browser-capture-adapter.mjs` 的 `#snapshot()`：

- 微信页面先定位 `#js_content`，将正文 HTML 限定到该容器，再复用现有 `htmlImageReferences()` 和 `extractReadableText()`；图片由同一段正文 HTML 直接产生，天然保留位置，不做全页 VOM 图片配对。
- 容器提取得到干净正文时，不再回退到全页 VOM；标题、来源 URL、安全校验和现有完整性状态继续保留。
- 只有容器提取仍失败、且 VOM 与正文图片边界都能可靠确认时，才考虑按位置恢复 Markdown；无法确认就保留不完整状态，不在文末批量补图，不按 alt 模糊猜测。
- 非微信页面没有等价可靠容器时保持现有正文路径，不新增猜测性配对。
- 在最终正文确定之后计算 `content`、`truncated` 和 `contentDigest`，避免正文与摘要不一致。
- 最终 `resourceDiscoveryComplete` 同时受 HTML 截断和正文资源提取结果约束。

### 3. 为微信图片下载补固定 Referer

修改：

- `packages/syno-core/source-fetcher.mjs`
- `packages/syno-core/source-resources.mjs`

最小接口只增加受控的 `referer` 选项，不开放任意请求头：

- `requestOnce()`、`requestViaProxy()` 在直连、HTTP 代理 absolute-form、HTTPS CONNECT 后的 TLS 请求三处合并同一 Referer。
- `fetchImage()` 仅对当前请求主机为 `mmbiz.qpic.cn` 时传 `Referer: https://mp.weixin.qq.com/`；跳转到其他主机时不继续携带。
- 其他图片主机默认不传 Referer，现有 User-Agent、大小限制、重定向上限、公网地址校验、MIME 与魔数校验不变。
- 不读取或发送 Cookie、浏览器凭据、完整文章 URL，不绕过登录或验证码。

在 `tests/source-fetcher.test.mjs`／`tests/source-resources.test.mjs` 覆盖：

- 直连收到且只收到指定固定 Referer。
- HTTP 代理与 HTTPS 请求构造使用相同规则；非微信主机不携带。
- 重定向到非微信主机后移除 Referer。
- 403、超时、非法 MIME 仍进入既有 `downloadStatus=failed`，不伪造成功。

### 4. 保留资源发现不完整状态

修改 `packages/syno-core/ingest-service.mjs` 的 `applyBrowserSnapshot()`：

- `snapshot.resourceDiscoveryComplete === false` 必须原样保留为 false。
- 只有兼容旧调用方且该字段未提供时，才根据 resources 是否为数组采用既有默认值。
- 在 `tests/source-noise.test.mjs` 或最贴近的 ingest 测试中增加断言：不完整标志进入 `browserSnapshot`，后续资源清单和 `completionStatus` 不得显示完整。

### 5. 复核 HTML 截断与实际入口，再决定是否扩大范围

先复现，不预先改协议：

- 实测文章完整 HTML 为 4.73 MB，2 MB 截断会让 `applyBrowserSnapshot()` 拒绝收录；已将浏览器 HTML 上限调为 8 MB，并复验该文 `truncated=false`。超过上限的页面仍必须标记不完整。
- 若失败文章来自“聊天读取 → 模型整理 → 文本收录”，确认图片 Markdown 是否在整理时再次丢失。若确认发生，再补原 URL／资源元数据绑定；不让模型承担手工保留资源清单的责任。
- 本轮不新增 BSK `evaluate`、滚动或资源监听动作；只有 HTML 根本不含地址时才另开能力方案。

## 验证与交付顺序

1. 新回归先在未修代码上复现失败，再实施至通过。
2. 运行：
   - `node --test tests/browser-capture-adapter.test.mjs tests/source-resources.test.mjs tests/source-fetcher.test.mjs tests/source-noise.test.mjs`
   - `npm test`
   - `npm run verify`
   - `git diff --check`
3. 用一篇此前失败的公开微信文章做本地端到端验证：浏览器快照、资源清单、下载字节、本地 Markdown 引用逐项一致。
4. 经主人相应授权后，再验证飞书原生图片发布；云端仍拒绝时保留失败证据，不改成 succeeded。
5. 汇报修改文件、测试数字、真实文章结果和剩余边界；不自动提交、推送、合并或重启生产服务。

## 验收标准

- 微信式 VOM 回退文章中的可确认正文图片不再丢失，图片位置、Markdown 与资源清单一一对应。
- 微信 CDN 请求在直连和代理路径均使用限定 Referer，其他主机不携带。
- 占位无法匹配、HTML 截断、下载失败均能被 completeness／manifest／completionStatus 正确表达。
- 现有正文提取、X JavaScript 壳、验证墙、SSRF、图片去重与本地化测试不回归。
- 至少一篇真实公开微信文章完成本地图文闭环；飞书验收结果单独列证据。

## 非目标

- 不处理本计划之外的发布注册对账和 MOC 收尾。
- 不保证已删除、过期、需登录或带额外签名校验的图片可获取。
- 不新增通用浏览器自动化能力，不放宽安全校验，不自动处理存量文章；存量回补在代码验收后另行决定。

## 执行记录（2026-11-09）

- 开发分支：`fix/browser-image-resource-pipeline-20261109`。未提交、推送、合并或重启生产服务。
- 源码修改：`browser-capture-adapter.mjs` 增加微信 `#js_content` 容器提取并将 HTML 上限调为 8 MB；`ingest-service.mjs` 保留资源发现不完整状态；`source-fetcher.mjs`／`source-resources.mjs` 增加限定微信 CDN 的固定 Referer，跨主机重定向移除。审查返工中通过等长掩码排除注释、脚本、样式和 textarea 内的假正文容器。
- 测试修改：新增正文图片与正文外资源隔离、非内容元素模板容器、资源发现状态、直连／代理／跨主机重定向 Referer 回归。
- 相关测试：44/44 通过。
- 真实文章：修复后 `BrowserCaptureAdapter.capture()` 返回 6 个正文图片 Markdown、6 个正文图片资源，`truncated=false`、`resourceDiscoveryComplete=true`；真实快照通过 `IngestService.applyBrowserSnapshot()`。
- 本地下载：6/6 正文 PNG 下载成功并写成本地附件，正文产生 6 个本地图片引用。页面另有 5 个不支持的 inline SVG，资源清单按既有规则保持 `complete=false`，未伪报完整。
- 全量测试：842 项，822 通过、1 失败、19 跳过。失败为 `tests/business-tools-transaction.test.mjs:26` 的恢复用例，错误是临时目录下 `ops/actions/2026/10` 不存在；本轮差异未触及该测试及事务恢复代码。
- `npm run verify` 通过（59,969 files；active docs 8）；`git diff --check` 通过。
- 未执行：飞书云端图片发布、生产重启、存量文章回补。

## 复审与交付（2026-11-11）

- 原修复已 squash 合并到 `main`（`34867aa5126ff31b1fae9211e9e500310b6fb42a`）；本轮容器语义返工位于 `fix/browser-container-dom-semantics-20261111`，尚未提交或重启生产服务。
- 二次审查复现大写 `JS_CONTENT` 与 `noscript` 假容器误选；修复为标签名／属性名保持 HTML 大小写不敏感、ID 值精确匹配，并将 `noscript` 纳入等长掩码与容器深度扫描。
- 公共 `capture()` 回归分别验证大写 ID、大写真实标签和 noscript 模板；两个用例均先红后绿。
- 图片相关测试：45/45 通过。全量测试：844 项，825 通过、0 失败、19 跳过。
- `npm run verify` 通过（60,134 files；active docs 8）；`git diff --check` 通过。
