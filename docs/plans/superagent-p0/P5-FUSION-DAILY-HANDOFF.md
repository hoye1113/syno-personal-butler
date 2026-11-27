# P5 Personal 融合日报 Handoff

日期：2026-11-27
状态：HN／AI News Radar、Polymarket 独立板块、全项目无效代码清理、日报编号与插件超时修复、模块入口契约均已部署；Cloudflare Web Analytics 已禁用。2026-11-27 自然调度与已认证 UI 已验收，但早于本次 fallback 修复 release，本次修复仍待下一次自然调度验收。

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
- 功能提交 `46c5fbf1dbe1c31fa5a02c694bc64410d3afc41f` 已快进推送 main；当前不可变 release 为 `/Users/hoye/Documents/workspace/syno-personal-butler-releases/20261127T062949493Z-46c5fbf1dbe1`，`current` 已指向该目录。
- Host PID `95039`、generation `25`，adapter running／available=true，active Task、pending Decision、queued／unknown delivery、handover pending／hold 均为空，reconciliation.blocking=false。phase 为 `startup-takeover`，不仅凭该字段宣称 ready。
- active 插件仍为 `2026.11.22.8`，通过当前 release 的共享 `daily-doc.mjs` 获得修复；未修改不可变插件目录。网站 PID `17766` 与 Tunnel PID `8915` 均未重启，网站继续加载 `P5_RADAR_SCHEDULER_STATE`。
- 2026-11-27 自然调度已完成，采集、增长榜、Polymarket 均为 `ok`，日报投递为 `accepted`；详细证据和版本边界见下文。未手动补跑或重发日报。

## 日报编号、插件超时与模块入口契约（已提交、推送并部署）

- 历史生产日志中的 5 次 `p5-plugin-daily-doc-fallback` 已分类并分别处理：3 次为“日报 AST 的编号与网站详情不一致”，2 次为插件未返回 JSON 的超时类失败。两项修复均已部署，但尚未经过部署后的生产自然调度验收。
- `buildDailyDoc()` 新增默认 420 秒内部时间预算，所有模型调用共享剩余时间；耗尽后使用既有公开摘要降级路径，不再等待 Host 在 600 秒强杀。预算为最后一次 120 秒字幕抓取和清理保留 180 秒余量。回归通过真实 `runPluginEntry()` 驱动悬挂模型请求，修复前稳定得到“插件未返回 JSON（exit=null）”，修复后返回合法 JSON、`translation-fallback` 和原始公开摘要。
- `publishRadarSiteDigest()` 现在以 `ast.details` 为网站展示和编号的唯一事实源，网站 snapshot、跟进 manifest 和 digest 均从 `details` 派生；冗余的 `ast.items` 不再参与网站编号映射。非法 itemId 和非连续详情编号仍拒绝发布，旧飞书文档 AST 的 `items` 字段保留。
- `config/module-entrypoints.json` 显式声明两个生产入口和 15 个人工入口／公共契约／安全边界模块；`scripts/audit-module-references.mjs` 将未分类不可达和已接线后的失效保留分开，接入 `verify` 与 `gate`。显式保留只表示不要误删，不表示生产已接线；计算式动态加载、仓外消费者和未记录人工命令仍是静态审计盲区。
- 定向回归：插件、日报、偏好、跟进共 37 项，37 pass，0 fail；其中日报与入口契约共 9 项。模块图为 308 个 `.mjs`、生产可达 59、运维可达 110、含测试可达 290，显式保留 15，未分类不可达和失效保留均为 0。
- 第一轮完整测试为 794 项、788 pass、0 fail、6 skipped；随后仓库卫生检查因清单理由中的 `macOS` 字样命中 `config/` 的既有 Apple 实现引用禁令而失败。已只修改该理由措辞，未放宽任何校验。
- 最终完整 gate：795 项、789 pass、0 fail、6 skipped；仓库 3601 个文件、7 个活动文档、入口审计和 `git diff --check` 全部通过。日志为 `/tmp/syno-plugin-deadline-gate.log`；prepare 再次运行同一 gate 并冻结安装 255 个依赖包成功，日志为 `/tmp/syno-plugin-deadline-prepare.log`。
- Cloudflare：先只读确认 `hoyework.online` 的 Web Analytics 为“启用，排除欧盟的访问者数据”、JS 自动注入，过去 24 小时页面浏览量和访问量均为 0。Owner 明确确认永久关闭后，已将 RUM 改为“禁用”并更新，返回站点列表后持久状态显示“已禁用”。公开 `/login` 未匹配 Insights 注入脚本或 `<script`，CSP 仍保持 self-only；未删除站点，未修改或放宽 CSP。

## 2026-11-27 自然调度与已认证 UI 验收（已完成）

- scheduler 记录 `lastCollectAt=2026-11-27T01:30:52.074Z`，采集、增长榜和 Polymarket 均为 `ok`；`lastDigestAt=2026-11-27T02:22:07.492Z`，即北京时间 09:30 采集、10:22 日报。`lastDigestDelivery=accepted` 只表示提供方接受，不表示用户已读。
- 真实日报共 50 条，49 篇文章、1 个视频，编号连续且 `numberingValid=true`。来源包括 Hacker News Top 30 18 条、AI News Radar 17 条、AIHOT 精选 7 条、Simon Willison 5 条，以及 Hugging Face Blog、Latent Space、YouTube · Latent Space 各 1 条。摘要状态为正文已抓取 43 条、仅源摘要 6 条、标题加已翻译源摘要 1 条。
- 已认证 UI 中，HN 第 10 条详情展示 `NO. 10`、采集时点第 14 位、17 points、0 条评论、HN 讨论与原文链接，跟进命令编号为 10；AI News Radar 第 4 条详情展示“单一来源待核实”、Hugging Face 证据与原文链接，跟进命令编号为 4。两条均显示“标为已阅／点赞／点踩／收藏”及既有语义说明。只核对控件和文案，未点击按钮改写生产状态。
- Polymarket scheduler 为 `ok`、`cached=false`，已认证 UI 显示“9 个市场”，原始快照 `polymarket-sources/2026-11-27/markets.json` 的 `items` 也为 9 条。“按 24 小时成交量排序的 Top 10”表示最多 10 条，不能伪写为实际 10 条。原始响应 SHA-256 为 `40d654c169495269453c1c4630d9a77767633f7e0dcc814292dd7adae0b2c561`。
- Host、网站和 Tunnel 均为单实例，pending／hold、active Task、pending Decision、unknown delivery 均为空，reconciliation.blocking=false。未触发采集、补跑日报、重发通知或修改生产数据。
- 版本边界：这次自然调度发生在 `46c5fbf1dbe1c31fa5a02c694bc64410d3afc41f` 部署之前，只能验收既有融合信源和 Polymarket 代理修复，不能作为本次 AST 编号与内部时间预算修复的生产验证。

## 下一轮 Plan：新 release 自然调度只读验收

### 目标

确认当前 release 在下一次生产自然日报中不再出现 AST 编号分裂或模型累积耗时导致的 `exit=null`，同时保持编号、阅读反馈和投递边界不回归。

### 步骤

1. 下一次自然调度结束后，只读核对 scheduler、脱敏插件日志、daily-doc／digest、网站 snapshot 和跟进 manifest；不得手动触发、补跑、重发、修改或重启。
2. 使用现有登录态抽查详情编号、来源证据和已阅／reaction／收藏操作区；不读取或导出密码、Cookie、认证文件，不为验收点击会改写状态的按钮。
3. 若未出现耗时耗尽场景，只记录“未触发内部预算降级”，不能把无错误等同于该分支已被生产覆盖。若出现其他插件错误，保留原始分类和证据，另行诊断，不盲目重放。
4. 同时核对 Host／网站／Tunnel 单实例、pending／hold、unknown delivery 与 digest accepted；投递 accepted 不冒充用户已读。

### 验收标准

- 验收样本必须来自当前 release 部署后的自然调度，不能用 fixture、隔离 smoke、手动补跑或 2026-11-27 旧版日报代替。
- 不再出现“日报 AST 的编号与网站详情不一致”或模型累积耗时导致的“插件未返回 JSON（exit=null）”；网站详情、manifest 与 digest 的 itemId 和连续编号一致。
- 既有文章详情、已阅、reaction、收藏语义不回归，无 unknown delivery、handover hold 或跨对象数据混合。
