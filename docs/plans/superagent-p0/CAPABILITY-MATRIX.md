# Superagent P0：当前用户工作流能力矩阵（历史基线）

> **2026-11-19 起仅用于说明旧系统与数据边界，不再作为新 Runtime 的等价迁移清单。** Owner 已决定旧能力不保留，后续按 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/NEXT-EXECUTION-PLAN.md` 重建新领域。

- 快照日期：2026-11-18。
- 对照基线：`53853fff5383e7791fdd379ace2e970c07051c0d`。
- 实际部署：`/Users/hoye/Documents/workspace/syno-personal-butler`；P0 对照源码：`/Users/hoye/Documents/workspace/syno-personal-butler-p0`。两者 HEAD 相同。
- 部署证据见 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/DEPLOYMENT-INVENTORY.md`。

## 1. 判定口径

本矩阵刻意分开四件事：

- **源码存在**：当前基线有实现及入口接线。
- **当前启用**：相同 HEAD 的实际部署在线，相关业务工具出现在 Host 在线清单，且必要组件 ready；发布另核对非敏感 `mode=production`。
- **真实端到端**：必须由真实 Owner 消息、模型工具调用、本地／远端结果共同证明。本轮禁止这些写入，因此均未在本轮补验。
- **待验**：源码存在但当前运行面没有足够只读证据，或故障／恢复／云端效果需要专项验收。

“已启用（E2E 待验）”表示用户入口已经接线并在线，不表示本轮真实业务操作已成功。“Host 已注册”也不等于所有工具都向普通聊天开放：浏览器五件工具只允许 capture Session。

在线只读证据：Store／Harness／Channels ready，飞书 running/available/ownerBound/home；Host 返回 34 个 `syno_*` 工具，即 26 个业务工具、3 个知识读取工具和 5 个 capture 浏览器工具。旧 README 与运维文档仍写“25 个业务工具”，与当前 `BUSINESS_TOOL_SPECS` 及在线清单不一致；本矩阵以当前源码和在线清单为准。

## 2. 用户可用工作流矩阵

| 工作流 | 用户能做什么 | 源码存在 | 当前启用判定 | 真实验收状态与关键边界 |
|---|---|---|---|---|
| 飞书私聊与会话控制 | 绑定 Owner 通过飞书私聊使用自然语言；`/new` 新会话、`/stop` 停止当前处理 | S1、S2 | **已启用（E2E 待验）**：飞书在线且 OwnerBound；Harness chat ready | 本轮未发消息。只限 Owner 私聊；不支持群聊授权、不读取个人聊天历史。自然语言业务依赖模型，Provider 故障时没有完整确定性兜底 |
| 工作概览 | 查询真实待办、待决策、后台 Job 与未完成收录 | S3（`work.overview`） | **已启用（E2E 待验）**：工具在 core 与在线清单 | 只读、按需查询；不生成每日计划，不主动推送 |
| 链接读取与收录 | 读取受控 URL；明确要求后收录 URL、文本、Markdown、HTML、个人观点；Bilibili 有专门来源处理 | S3（`knowledge.fetch_url`、`capture.submit`）、S4、S5 | **已启用（E2E 待验）**：读取与收录工具在 core 和在线清单，chat ready | 裸链接不代表收录意图；`received` 不等于入库。受 SSRF、来源质量、验证页、大小与正文完整性限制。反爬浏览器升级只服务授权收录，不保证绕过登录或验证码 |
| 附件读取与收录 | 临时分段读取当前会话附件；明确要求后收录 PDF、DOCX、文本、Markdown、HTML；图片可直看并在明确收录时转写 | S3（`attachments.read`、`capture.submit`）、S4、S6 | **已启用（E2E 待验）**：飞书渠道与相关工具在线 | 附件不会仅因发送就自动入库。飞书下载上限 25MB；PDF/DOCX 10MB，文本/HTML 等 1MB；聊天图片原始上限 3MB。PDF/DOCX 只保证提取文字，扫描 PDF 不自动 OCR |
| 收录查询、决策与恢复 | 查询未完成收录或指定 ID 的真实状态；对可重试项恢复；浏览器等待交互时按流程继续 | S3（`capture.list/get/resume`）、S7 | **已启用（E2E 待验）**：工具在 core 与在线清单；capture profile bootable | 本轮未创建或恢复 Workflow。`capture.resume` 只接受规定状态，不重复已完成操作。当前 `workflowSummary()` 对 committed/reported 的云端文案有已知误报，须看 `sync` 或 `knowledge.sync_status`，见 S8 |
| 知识查询与续读 | 本地搜索、按片段续读、受控网页读取 | S1、S3（`knowledge.search/read_snippet/fetch_url`） | **已启用（E2E 待验）**：知识三件套在 core 与在线清单 | 本地搜索是词项检索和确定性排序，不等于全库语义搜索或长期多轮记忆；敏感内容、来源完整性与网页安全策略仍生效 |
| 知识修改与分类 | 按准确 ID/version 修改正文或白名单元数据；移动到 PARA 分类；登记已批准标签 | S3（`knowledge.update/move/tags_register`） | **已启用（E2E 待验）**：工具在 core 与在线清单，Store ready | 本轮未写入。版本变化后必须重新查询；本地完成不自动等于云端当前版本完成 |
| 知识删除、合并与巡检 | 生成删除／合并预览，后续真实消息确认；只读检查重复、来源、链接和孤岛等维护问题 | S3（`knowledge.delete/merge/maintenance`）、S9 | **已启用（E2E 待验）**：工具在 core 与在线清单 | 删除与合并不是调用一次就直接执行；必须绑定具体版本预览和后续 Owner 确认。维护只报告，不自动清理 |
| 待办读写 | 创建、查询、修改、完成、归档待办；记录排期 | S3（`actions.create/list/update`） | **已启用（E2E 待验）**：工具在 core 与在线清单，Store ready | 本轮未读写待办。更新需要准确 ID/version；排期只记录时间，**没有主动提醒** |
| 个人记忆提出与确认 | 对明确长期偏好、背景或长期约定提出候选；用后续消息批准／拒绝；查询已确认记忆 | S3（`memory.propose/search/get`、`decisions.list/resolve`）、S10 | **已启用（E2E 待验）**：工具在 core 与在线清单，Store ready | 候选不能在生成它的同一消息自动批准。只在 `ops/memory/` 生效，不进入普通知识检索或云端发布；召回是有限规则／词项匹配，不承诺任意语义记忆 |
| 个人记忆纠正与遗忘 | 对指定记忆提出替换候选并后续确认；明确遗忘指定记忆 | S3（`memory.correct/forget`）、S10 | **已启用（E2E 待验）**：工具在 core 与在线清单 | 纠正生效前旧事实仍有效；普通遗忘清理当前正文及可读载荷，不擦除 Git、聊天、备份或云端历史 |
| 待决卡片与多对象选择 | 列出当前会话的收录方案、知识预览、长期记忆候选；确认、拒绝、修改或选择收录方式 | S3（`decisions.list/resolve`）、S9、S11 | **已启用（E2E 待验）**：决策工具在线，运行时有 `pendingDecisions.present` 接线 | 本轮未生成真实卡片，卡片渲染与多条选择待验。必须精确 ID/version；多对象先澄清，知识删除／合并和记忆确认要求后续真实 Owner 消息 |
| Wiki／图片／目录发布 | 只读检查发布；按 ID/version 登记已有笔记；查询三端状态；仅补失败端；冲突先看差异与覆盖预览 | S3（`feishu.publishing_check`、`knowledge.sync_start/status/retry`）、S12 | **配置启用（E2E 待验）**：非敏感配置 `mode=production`，相关工具在线 | 只有 Wiki、images、catalog 均对应当前版本 succeeded 才是 synced。历史 756 个目标 succeeded 不是本轮云端复核；本轮未发布、未重试、未覆盖冲突。个人记忆、不完整内容或资源无发布资格 |
| 收录结果通知与重试 | 用户已发起的收录可收到方案、完成、拒收或失败回执；瞬时失败退避重试并留诊断 | S11、S13、S14 | **机制已接入；真实通知恢复待验**：Host 已初始化且飞书在线 | Outbox 有幂等键、租约、退避、上限和终态；delivered 只代表渠道接受，不代表用户已读。没有主动推送，也不补发历史聊天崩溃回复 |
| 收录与发布运维恢复 | 启动时恢复 Job/chunk/Workflow；运行中定期重试收录和发布；未知远端效果先对账 | S7、S12、S14 | **机制已接入；故障恢复待验**：当前 Host ready 且运行初始化代码 | 本轮未重启或制造故障。登录冷启动、锁超时、断网、进程死亡、远端冲突与 unknown 对账仍需分别验收；不可据 ready 宣称恢复矩阵通过 |
| 联网搜索 | 源码配置存在 `web_search` 搜索链与受控回退 | S15 | **待验**：本轮 Harness 能力投影只列出 Syno 工具，未证明普通 chat 当前实际暴露或成功调用 `web_search` | 未做真实模型或网络调用；不能用历史 smoke 代替当前搜索可用性。通用 `web_fetch` 已关闭，网页读取走受控 `knowledge.fetch_url` |

## 3. 当前明确不开放的能力

以下项目不能因仓库残留适配器或旧文档而列入用户能力：

- 主动提醒、晨报／周报、每日计划、今日灵感、学习、复习和项目管理。
- 群聊授权、微信渠道、读取个人聊天历史。
- 通用终端、源码修改、通用文件系统、动态 MCP、子 Agent、cron／主动调度。
- 自动清理知识维护问题；未经后续确认的删除、合并、记忆激活或云端覆盖。
- Provider 故障时绕过模型执行全部自然语言业务。
- 重启后补发历史聊天回复；保留的是用户已发起异步收录／发布的状态、恢复与结果回执。

依据：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/KNOWN-LIMITATIONS.md:16-22,30-46`，以及在线 Harness 的 `terminal=false`、`sourceWrite=false`、`cron=false`、`delegate=false`。

## 4. 当前最重要的待验清单

1. **飞书真实主路径**：分别用链接、PDF/DOCX、图片完成“明确收录 → 查重／方案 → 待决确认 → 本地完成 → 状态查询”；同时验证裸链接和裸附件不会自动收录。
2. **待办与记忆跨回合**：创建／修改／完成待办；提出记忆后在另一真实消息确认，再验证召回、纠正和遗忘。
3. **多待决卡片**：制造两个合法待决项，验证编号选择、精确版本、过期与冲突处理，不自动猜目标。
4. **三端发布**：选一个获授权样本核对 Wiki、原生图片、目录的当前版本；另验失败端单补、远端人工编辑冲突及覆盖确认。不能用旧映射汇总替代云端读取。
5. **通知与恢复**：在授权测试窗口分别覆盖渠道暂时不可用、Host 重启、Provider 恢复、执行中崩溃与 unknown 对账；记录 Workflow/Job/Event ID，不能为制造通过而重复写入。
6. **macOS 登录冷启动**：注销／重启后确认服务自动拉起、Host/DSH/Feishu ready、未完成 Workflow 与 Outbox 恢复。本轮未执行。
7. **联网搜索现状**：用真实但无写入的模型查询确认当前 Web chat 是否实际暴露 `web_search`，再记录提供方回退；本轮仅标待验。
8. **收录状态文案**：修复前，任何 committed/reported 汇总都应结合 `sync` 或 `knowledge.sync_status`，避免把生产同步误报成“发布未启用”。

## 5. 源码证据索引

| 编号 | 绝对路径与范围 | 证明内容 |
|---|---|---|
| S1 | `/Users/hoye/Documents/workspace/syno-personal-butler-p0/config/deepseek-harness/syno-tool-sets.mjs:3-29` | 普通聊天 core 由知识三件套与全部业务工具组成 |
| S2 | `/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-core/feishu-channel.mjs:179-219,426-464` | 飞书启动、私聊消息处理与回复链；群 allowlist 为空 |
| S3 | `/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-core/business-tools.mjs:16-43,113-237` | 26 个业务工具的名称、参数、确认与执行边界 |
| S4 | `/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-core/intake.mjs:11-12,89-223` | URL、文本、PDF、DOCX、HTML 等 Intake 与大小限制 |
| S5 | `/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-core/source-fetcher.mjs:8-10,235-274` | 受控 URL 获取、重定向、大小与正文截断 |
| S6 | `/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-core/channel-conversation-handler.mjs:7`；`/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-core/feishu-attachments.mjs:16,46` | 图片与飞书附件上限 |
| S7 | `/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-core/ingest-workflow-coordinator.mjs:680-816` | 收录恢复、对账、到期重试与浏览器续办 |
| S8 | `/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-core/business-tools.mjs:46-59`；`/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/KNOWN-LIMITATIONS.md:12-15` | 当前收录摘要的云端状态文案缺陷 |
| S9 | `/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-core/knowledge-changes.mjs:91-106` | 删除／合并预览与后续 Owner 授权绑定 |
| S10 | `/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-core/memory-store.mjs:6-73` | 仅有效已确认记忆参与召回，召回与失效正文边界 |
| S11 | `/Users/hoye/Documents/workspace/syno-personal-butler-p0/apps/syno/syno/runtime.mjs:840-975` | 收录方案呈现、待决项及结果通知入队 |
| S12 | `/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-core/knowledge-publisher.mjs:10-23,38-64,95-159,161-236` | 发布检查、资格、冲突、重试、三端顺序与恢复 |
| S13 | `/Users/hoye/Documents/workspace/syno-personal-butler-p0/apps/syno/syno/workflow-outbox.mjs:138-161,214-281` | 通知幂等、保留、退避、终态与失败回调 |
| S14 | `/Users/hoye/Documents/workspace/syno-personal-butler-p0/apps/syno/syno/runtime.mjs:1059-1115,1186-1254` | 初始化恢复、通知 drain、渠道／Provider／收录／发布定时恢复 |
| S15 | `/Users/hoye/Documents/workspace/syno-personal-butler-p0/config/deepseek-harness/syno-chat.cordis.yml:27-31,53-65`；`/Users/hoye/Documents/workspace/syno-personal-butler-p0/packages/syno-dsh-plugin/plugins/web-search/index.mjs` | 搜索插件源码和 JSON-RPC 回退配置；不证明当前 Web 实际可用 |

## 6. 文档使用边界

`README`、运维手册与 `KNOWN-LIMITATIONS.md` 的主要验证口径日期为 2026-10-20；本矩阵只将它们用于产品边界和历史证据，不把历史通过数当作当前验收。当前在线状态来自 2026-11-18 本机只读接口，当前实现来自上述相同 HEAD 的源码。本轮没有真实飞书、模型、外部写入、服务重启或故障注入。

## 7. P3 新 Runtime 等价状态（2026-11-19 刷新）

生产部署只读刷新仍为 `main@53853fff5383e7791fdd379ace2e970c07051c0d`，LaunchAgent 已加载并运行，健康检查通过；Store／Harness／Channels ready，飞书 running/available/ownerBound/home。没有停止或修改生产服务。新 Runtime 已在 P2 基线 `e6710714` 通过固定公开快照收录、对象精确知识查询、OpenCode／Pi 替换和故障注入，但这些只构成纵向切片证据，**没有任何一行旧工作流可据此直接标为完整等价**。

| 旧工作流 | 新 Runtime 当前证据 | P3 结论 |
|---|---|---|
| 飞书私聊与会话控制 | 独立测试 App 的 Owner 私聊、收录和知识查询已实测；`/new`／`/stop` 未迁移 | 待验 |
| 工作概览 | 无旧数据聚合视图 | 未实现等价 |
| 链接读取与收录 | 固定公开快照收录通过；现场受控读取、查重与完整待决链未迁移 | 部分切片，待验 |
| 附件读取与收录 | 无新 Runtime 附件链 | 未实现等价 |
| 收录查询、决策与恢复 | 原生 Task／Attempt／Result Lane 与进程恢复通过；旧工具语义未迁移 | 部分切片，待验 |
| 知识查询与续读 | 对象精确查询、A/B 隔离和续接通过；旧搜索与片段续读未迁移 | 部分切片，待验 |
| 知识修改与分类 | 无 | 未实现等价 |
| 知识删除、合并与巡检 | 无 | 未实现等价 |
| 待办读写 | 无 | 未实现等价 |
| 个人记忆提出、确认、纠正与遗忘 | 无 | 未实现等价 |
| 待决卡片与多对象选择 | 底层对象与版本校验可复用；旧卡片流程未迁移 | 未实现等价 |
| Wiki／图片／目录发布 | 无受控测试目标的新 Runtime 发布证据 | 未实现等价 |
| 收录结果通知与重试 | 原子 delivery 认领与真实知识通知通过；旧 Outbox 完整语义未迁移 | 部分切片，待验 |
| 收录与发布运维恢复 | 进程退出恢复通过；旧 Workflow／发布／冷启动未迁移 | 部分切片，待验 |
| 联网搜索 | 未迁移 | 待验或由 Owner 决定下线 |

逐项验收步骤、迁移对象和回退阻断规则见 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/P3-MIGRATION-PLAN.md`。P4 入口仍要求每项具备已验收等价证据或 Owner 明确下线批准；当前不满足。
