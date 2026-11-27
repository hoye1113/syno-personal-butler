# P5 Personal 融合日报 Handoff

日期：2026-11-27
状态：HN／AI News Radar、Polymarket 独立板块、代理修复及全项目无效代码清理均已部署；Polymarket 首次失败告警的已认证 UI 已验收，2026-11-27 自然调度仍待验收。

## 已完成

- Hacker News 官方采集时点 Top 30，复用文章采集、去重、评分、日报 AST 和 HTML；详情展示排名、points、评论数和 HN 讨论链接。
- AI News Radar 公开 `daily-brief.json` 最多 20 条；48 小时新鲜度检查，展示官方一手／多源一致／单一来源待核实及相关来源链接，不使用 persona 评论作为事实。
- Polymarket 独立只读快照、Top 10、同日幂等、原始响应 SHA-256、失败保留和 stale；不进入文章 DB，不提供文章操作。
- Polymarket CLI 复用现有 `config.json.proxy`，有代理时走既有 `curlText`，无代理时保留 fetch；代理错误在接口结果和状态文件中脱敏。
- GitHub／Skill 增长榜、信源错误、Polymarket 和 scheduler 异常进入网站异常区；delivery unknown 只提示对账。首次 Polymarket 失败且没有好快照时，也从 scheduler 状态生成告警。
- 项目关联与选题只使用公开文章／字幕的 `why_zh`，不读取或外发真实 vault 正文。
- 全管家项目冗余／死代码审计已完成：删除 10 个无有效引用文件和 7 组未接线局部代码，保留动态、运维、公共与安全边界；报告为 `/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/docs/plans/dead-code-audit-2026-11-27.md`。

## 验证与部署证据

- 代理修复定向回归：25 项，25 pass，0 fail；完整 gate：791 项，785 pass，0 fail，6 skipped，仓库 3607 个文件和 7 个活动文档检查通过。
- 全项目清理定向回归累计 110 项通过；最终 prepare gate 为 791 项、785 pass、0 fail、6 skipped，release 仓库校验 3598 个文件、7 个活动文档检查通过。
- 公开端点隔离 smoke：HN 30 条成功，AI News Radar 20 条成功。Polymarket 直连因 DNS 解析到错误地址而超时，使用现有代理的真实隔离 CLI smoke 成功生成 10 个市场，目录为 `/tmp/p5-polymarket-proxy-smoke.h1EJik`，未写生产状态。
- 隔离浏览器已验收 HN／AI 证据详情和 Polymarket fixture 交互；生产 Owner 登录后实际看到“Polymarket 采集失败”，市场页显示“尚未采集／0 个市场／尚未生成市场快照”，桌面和移动端无明显横向溢出。
- 生产控制台仅有 Cloudflare Insights 被 CSP 拦截的记录；Radar 数据和交互正常，本轮没有为第三方统计脚本放宽 CSP。
- 功能提交 `a0008884088ce8b10d400cf0d6198e7190204802`、首次失败告警修复 `d8de24811fdad0632bfea47a992df5ea52d1e358`、代理修复 `62301bccb6231155e757a1ed0dc092662e50e5fb`、全项目清理 `82616b2ad0baa1a984327e59c2b631b99449da9b` 均已快进推送 main。
- 当前不可变 release：`/Users/hoye/Documents/workspace/syno-personal-butler-releases/20261127T000903054Z-82616b2ad0ba`；`current` 已指向该目录。
- Host PID `81123`、generation `24`，adapter running／available=true，active Task、pending Decision、queued／unknown delivery、handover pending／hold 均为空，reconciliation.blocking=false。phase 为 `startup-takeover`，不仅凭该字段宣称 ready。
- 模块图确认本轮运行代码变更仅被 Host 加载；网站 PID `17766` 与 Tunnel PID `8915` 均未重启，网站继续加载 `P5_RADAR_SCHEDULER_STATE`。
- 生产 scheduler 仍保留 `lastPolymarketDate=2026-11-26 / failed`，尚无 2026-11-27 自然采集结果；未手动补跑、重发日报或反复请求市场接口。

## 本地收口：日报编号与模块入口契约（未提交、未推送、未部署）

- 历史生产日志中的 5 次 `p5-plugin-daily-doc-fallback` 已分类并分别处理：3 次为“日报 AST 的编号与网站详情不一致”，2 次为插件未返回 JSON 的超时类失败。前者修复编号事实源；后者通过内部时间预算和确定性 `exit=null` 回归修复，尚未部署或经过生产自然调度验收。
- `buildDailyDoc()` 新增默认 420 秒内部时间预算，所有模型调用共享剩余时间；耗尽后使用既有公开摘要降级路径，不再等待 Host 在 600 秒强杀。预算为最后一次 120 秒字幕抓取和清理保留 180 秒余量。回归通过真实 `runPluginEntry()` 驱动悬挂模型请求，修复前稳定得到“插件未返回 JSON（exit=null）”，修复后返回合法 JSON、`translation-fallback` 和原始公开摘要。
- `publishRadarSiteDigest()` 现在以 `ast.details` 为网站展示和编号的唯一事实源，网站 snapshot、跟进 manifest 和 digest 均从 `details` 派生；冗余的 `ast.items` 不再参与网站编号映射。非法 itemId 和非连续详情编号仍拒绝发布，旧飞书文档 AST 的 `items` 字段保留。
- `config/module-entrypoints.json` 显式声明两个生产入口和 15 个人工入口／公共契约／安全边界模块；`scripts/audit-module-references.mjs` 将未分类不可达和已接线后的失效保留分开，接入 `verify` 与 `gate`。
- 定向回归：插件、日报、偏好、跟进共 37 项，37 pass，0 fail；其中日报与入口契约共 9 项。模块图为 308 个 `.mjs`、生产可达 59、运维可达 110、含测试可达 290，显式保留 15，未分类不可达和失效保留均为 0。
- 第一轮完整测试为 794 项、788 pass、0 fail、6 skipped；随后仓库卫生检查因清单理由中的 `macOS` 字样命中 `config/` 的既有 Apple 实现引用禁令而失败。已只修改该理由措辞，仓库校验、活动文档、入口审计和 `git diff --check` 随后通过；未放宽任何校验。
- 超时修复后的最终完整 gate：795 项、789 pass、0 fail、6 skipped；仓库 3601 个文件、7 个活动文档、入口审计和 `git diff --check` 全部通过。日志为 `/tmp/syno-plugin-deadline-gate.log`。
- Cloudflare：先只读确认 `hoyework.online` 的 Web Analytics 为“启用，排除欧盟的访问者数据”、JS 自动注入，过去 24 小时页面浏览量和访问量均为 0。Owner 随后明确确认永久关闭；已将 RUM 改为“禁用”并更新，返回站点列表后持久状态显示“已禁用”。未删除站点，未放宽或修改 CSP。

## 下一轮 Plan：2026-11-27 自然调度只读验收

### 目标

确认 HN／AI News Radar 进入真实日报，并验证 Polymarket 代理修复在自然调度中生成真实 Top 10，同时保持既有文章语义和投递边界。

### 步骤

1. Timer `718d2ebd` 于 2026-11-27 10:05 只读核对 09:30 新源采集、增长榜、Polymarket，以及 10:00 日报和投递；不得触发、补跑、重发、修改或重启。
2. 使用现有登录态检查 HN／AI 证据详情和 Polymarket 真实 Top 10；不得读取或导出密码、Cookie、认证文件。
3. Polymarket 若继续失败，只记录 scheduler 和快照状态；有旧好快照时才标 stale，没有好快照时显示采集失败，不伪造数据。若需再次修改网络出口，另立计划。
4. 同时核对 Host／网站／Tunnel 单实例、pending／hold、unknown delivery 与 digest accepted；投递 accepted 不冒充用户已读。

### 验收标准

- HN／AI 新文章进入真实日报，证据链接完整，既有文章编号、已阅、reaction、收藏语义不回归。
- Polymarket 通过现有代理生成真实 Top 10；失败时告警可见，资讯日报和 HTML 短链不受影响。
- 自然调度与已认证 UI 均有生产证据，不能用 fixture、隔离 smoke 或匿名 401 代替。

## 后续待授权 Plan

### 目标

决定是否关闭 Cloudflare Web Analytics，并在获得明确授权后提交、推送和部署本轮本地修复，再通过生产自然调度验收两类日报 fallback 修复。

### 步骤与验收

1. Owner 明确确认不再需要 Web Analytics 后，才把 RUM 改为“禁用”并更新；随后只读核对自动注入消失且 CSP 不放宽。若未确认，保持现状。
2. 获得提交／推送／部署授权后，只暂存本轮声明的精确路径，复核 diff 和 gate，再生成不可变 release；生产验收与自然调度观察分开记录，不补跑、不重发。
3. 部署后的自然调度应不再出现 AST 编号分裂或模型累积耗时导致的 `exit=null`；若出现其他插件错误，保留原始分类并另行诊断。fixture 通过不能代替这项生产证据。
