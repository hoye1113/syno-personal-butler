# Syno 执行语义与移动可靠交付交接（2026-07-29）

## 当前实施入口

- 审查基线：`567f23d2d9b423a98d0e88868c6cc2eb3859d16f`。
- 当前实施分支：`codex/exec-p10-r6-seal`。
- 已提交阶段 HEAD：PR-04A0 `3c8fae5`、PR-04A `ad187cb`、PR-04B `3df84cd`、PR-04C/04D `7f094c4`、PR-05/06 `b813764`、PR-07A `e63b5e9`、PR-07B `043d3ba`、PR-08 `fd34708`、PR-09 `f9d9206`。
- 微信、飞书是主要日常入口；AcceptedRequest、ChannelDeliveryOutbox、Effect Receipt、Unknown Case、Decision、Ephemeral Capture 和持久 Chunk 已实现，PR-04A/04B 已接入受门控的 `legacy/shadow/v2` runtime seam，但生产切换与 Owner 实测仍未完成。
- PR-10 只生成 Owner 验收模板和只读 readiness；未取得 Owner 手机、真实渠道和 Windows 冷启动证据前，不切换移动生产路径、不删除 Legacy、不标记 Goal complete。
- 执行语义见 `docs/adr/0003-execution-semantics.md`，移动交付见 `docs/adr/0004-mobile-delivery-contract.md`，迁移规则见 `docs/adr/0005-schema-migration-policy.md`。

## 当前 Goal 状态

- Goal：按 `docs/TODO-EXECUTION-PLAN.md` 实施 PR-00～PR-10。
- 当前状态：PR-10 R6 门禁准备中；Owner 真实微信/飞书、跨渠道连续性、Unknown/Decision、PDF/DOCX、Windows 下次登录仍是不可由自动化替代的门槛。
- 不修改 `vault/` 内容或原始 Obsidian 仓库；每个 PR 精确暂存，不 Push。
- 最新自动回归：Node 519/519、Repository verify 1460 files、active docs 7；R6 readiness 仍因 Owner 验收和 Windows 冷启动未通过而保持 blocked。

## 新对话第一句话

> 完整读取根 `AGENTS.md`、`NEXT_SESSION.md` 和 `docs/TODO-EXECUTION-PLAN.md`。先核对分支、HEAD、工作树与真实测试，再从当前 OpenCode 重构断点继续。保留两项主人知识变更；不要修改原 Obsidian 库，不要 reset，不要 `git add -A`，不要 Push。

## 当前基线

- 分支：`codex/round3-remediation`
- 本轮固定起点：`f0333f3`
- 已完成实现提交：`5890dad`
- OpenCode CLI：`1.18.2`
- OpenCode 实际二进制：
  `%LOCALAPPDATA%\mise\installs\node\24.13.0\node_modules\opencode-ai\bin\opencode.exe`
- OpenCode 子进程端口：`127.0.0.1:4318`
- 当前可信执行 HEAD：以 `git log` 为准；本轮 PR-10 分支从 `f9d9206` 派生，尚未提交 R6 模板。
- mise shim 后台启动会递归，禁止作为生产启动目标。
- Windows 计划任务 XML 加固前的 OpenCode 自动验证：Node 370/370、vault pytest 57/57、Repository verify 1358 files。
- Windows 计划任务 XML 加固后的基线验证：Node 375/375、vault pytest 57/57、Repository verify 1359 files、`git diff --check` 通过。
- OpenCode 启动死锁与运行日志修复后的历史验证：Node 381/381、vault pytest 57/57、Repository verify 1365 files、`git diff --check` 通过。
- 当前工作树 P4.0–P4.6 自动门禁：Node 454/454、vault pytest 57/57、Repository verify 1396 files、`git diff --check` 通过。
- 最近只读运行态（2026-07-28 约 22:26 CST 复核）：Syno Host `/api/syno/health` 返回 `ok=true`（监听进程 PID 14368，20:05:47 起的手动启动 Host，非活动任务实例托管）；Windows 任务 `Syno` 当前 `State=Ready`、未运行，`LastRunTime=2026-07-28 20:31:19`、`LastTaskResult=3221225786`（0xC000013A 控制中断退出），`scripts/manage-windows-task.ps1 -Action Status` 报告 `running=False`；OpenCode supervisor 健康（pid 26144、`127.0.0.1:4318`、1.18.2、凭据 configured、`healthy=true`）。
- 当前差异 fresh clone `.runtime/p3-fresh-final-1785229932`：Node 433/433、vault 57/57、Repository verify 1378 files；按锁文件安装成功，排除了两项主人知识变更。
- 真实无模型 OpenCode 探针已通过 1.18.2、loopback、Basic Auth、Session create/abort/delete、静态 `syno` MCP 和禁止内置工具不可调用。
- 主人已明确授权将全局 OpenCode 配置中的可用凭据一次性迁入 Syno DPAPI；产品运行时不会自动读取或依赖全局 `auth.json`。
- 真实免费模型、渠道与 Windows 登录恢复仍由主人验收，不能把凭据已配置、Fake/无模型探针或 XML 单元测试表述为真实产品验收。Windows 任务的真实安装、状态和受控重启已由本轮验证通过；下次登录冷启动仍未验证。

## 必须保留的主人变更

以下两项不属于 OpenCode 重构，禁止覆盖、暂存或提交：

- `vault/02-Resources/AI and Agents/MOC - Agent 架构与工程.md`
- `vault/02-Resources/AI and Agents/Agent Design & Patterns/当编码不再是瓶颈 - Berkeley RDI 软件自主开发三级框架.md`

## 已实现（本轮新增）

- AcceptedRequest + DPAPI 恢复载荷、ChannelDeliveryOutbox、Effect Receipt/Unknown Case、RecentInteraction/Decision presentation。
- OpenCode Session 状态可知性、abort unknown 冻结、保守 fallback 和过滤消息复制策略。
- Capture ephemeral Session、持久 Chunk Manifest、重启恢复、策略失效、coverage、优先级/Aging/Provider/预算门控。

## 已实现（历史）

- OpenCode Supervisor、真实二进制解析、版本锁定、Basic Auth、loopback、独立 profile、自有 PID 树。
- `opencode:doctor/status/restart/configure` 与真实 Server 探针。
- `OpenCodeCognitiveRuntime` Capability v2、Session binding、跨渠道 main Session、主动 proactive Session、串行、取消、保留清理和固定三模型链。
- 项目级 `syno` Agent 与 capture/knowledge/learn/review/create/maintain 六个 Skills。
- 静态 Syno MCP Tool Bridge；OpenCode 只能调用 ToolRegistry 允许的 `syno_*` 工具。
- 统一渠道处理器、受控执行（含冲突澄清）与 Owner/thread/TTL/digest/replay 边界。
- SourceDescriptor 与 URL/文件/个人观点/未知来源收录追溯。
- Web OpenCode 状态、独立 Zen Token 配置和重启入口。
- 根 `AGENTS.md` 已移除 `hy3-free` 与 Claude 自动升级规则。
- Token 由 DPAPI 保存，并通过内联配置引用子进程环境变量，不进入参数或状态元数据。
- 活跃旧会话迁移只保留脱敏摘要和最近用户消息；私密内容、工具输出和密钥不进入 OpenCode。
- `waiting_provider` 有周期恢复；并发后台/手动重试只能有一个调用取得 Job 执行权。
- Proposal 修改会取消旧 Job；附件正文不能触发写入。
- 当前差异已完成 Standards / Spec / Security 最终复审，均为 P0 0、P1 0。
- Windows 安装器已改为通过 `Syno.WindowsTaskXml.psm1` 保护并验证任务 XML：固定单一登录触发器、30 秒延迟、执行身份、命令、参数、工作目录、单实例、隐藏运行、无限执行和每分钟重启。现有健康任务只有在导出 XML 通过同一契约后才可复用。
- 2026-07-28 修复 Syno/OpenCode 启动循环等待：OpenCode MCP bootstrap 路由不再等待正在依赖它完成的 `synoReady`。真实 Host 已验证 8888 健康、OpenCode 1.18.2 在 4318 `ready/healthy=true`，微信/飞书恢复连接。
- 新增 `%LOCALAPPDATA%\Syno\logs\syno-runtime-YYYY-MM-DD.jsonl` 脱敏运行日志，按天写入、保留 14 天；不记录对话正文。OpenCode 不可用现在按可重试 Provider 故障持久排队，不再只返回“尚未运行”。

## 当前断点

1. PR-00～PR-09 的自动门禁已分阶段通过；PR-04A/04B 生产切换、P4.7/R6 真实验收仍待主人执行。
2. 可信提交基线为 HEAD `f38ab18`；当前未提交差异已完成 454/454 全量回归，不把提交基线冒充为当前实现证据。
3. R4.1–R4.7 的主要代码已经位于未提交工作树：持久 Workflow、Context Compiler、capture Session、Outbox、统一渠道、canonical Proposal、受控写入和闭环候选均已实现。
4. 复审中发现的 P1 已修复：拒绝意图先落盘；恢复先核对 Job 状态，已拒绝 Job 不重发 Proposal。
5. P3 浏览器 CLI/本地 4329 页面受当前 Codex 浏览器安全策略拒绝，未将桌面、390×844、控制台或真实冷启动表述为通过；UI 静态测试和 fresh clone 自动门禁已通过，真实页面与设备验收移交 P4。
6. `docs/TODO-EXECUTION-PLAN.md` 的 P4.0–P4.6 已执行：自然语言意图路由、动态能力说明、项目级 `syno-web-capture` Skill、受限 `syno_browser_*` Tool Bridge、Coordinator 自动指派、可观察性与 Doctor；Node 24 pinned DNS `lookup` 和 Kimi `/command` envelope 兼容性已修复，并用真实 OpenRouter 直抓、知乎 403 WebBridge 兜底复验。
7. Windows 任务已真实注册并通过安装/状态/受控重启：使用真实 `node.exe`，等待 8 秒仍为 `Running`，Host 健康，启动器日志已落盘。本次复核补充：任务现已回落至 `State=Ready`、未运行，`LastRunTime=2026-07-28 20:31:19` 以 `0xC000013A`（控制中断）退出；不要把当前 8888 上存活的手动启动 Host（PID 14368）当作任务 `Running` 或下次登录恢复证据，退出根因需在冷启动验收中确认。
8. 架构已根据主人反馈修正：OpenCode 会真实加载项目 Skill 并完成多步浏览器抓取；Syno 仍持有授权、URL/动作边界、Workflow 状态、决策和写入控制。全局 `kimi-webbridge` 仅作为上游方法与版本参照，不作为隔离运行时的隐式依赖。
9. OpenCode fork/clone/read 真实能力未验证，当前策略为 `retain_current_session`；不得据客户端类型声明升级。
10. PR-10 `ops/acceptance/pr-10-r6-seal/owner-acceptance.json` 仍为 `pending_owner`；主人完成全部门槛前不得删除旧实现。

## 当前运行态探针记录

- 只读审计发现两条由本轮本地探针生成、尚未批准的收录 Workflow：
  - `workflow-6815e55b-910e-4471-b39d-127c88f4ce13` → `job-20260728-b23773b7`，浏览器兜底完成，等待一次审批。
  - `workflow-ff1a1323-53b6-46f4-ba60-a25c7578a581` → `job-20260728-c602fa26`，直抓完成，等待一次审批。
- 另有三条失败可重试探针：`workflow-72291c26-ac63-4efc-9095-44ba5ab403de`、`workflow-63fc7419-a1a8-4781-94f0-f408372d6e76`、`workflow-95428c90-0417-4cb5-a95a-10c9df6e13e5`；以及历史终态失败记录。不得代主人批准、删除或写入 vault，若需清理必须由主人明确决定。
- 2026-07-28 约 22:26 CST 本次复核确认：上述两条待审批 Job 仍为 `awaiting_approval`、`approvalsReceived=0`（`job-20260728-b23773b7` code `4286FE`、`job-20260728-c602fa26` code `23C10B`，均 `channel=web`、`ownerKey=local-user`），`changedPaths=[]`、未写入 vault；运行态与上一轮记录一致。

## 当前未提交实现范围

- 新增领域/运行模块：Workflow Coordinator、Context Compiler、Capture Analysis、Outbox、Runtime Journal、DLP、canonical tags 和 post-ingest candidates。
- 修改渠道、Runtime、OpenCode、审批、收录、知识、来源、操作注册表、契约、Skill 与测试。
- 文档同步与执行代码均位于当前未提交工作树；自动门禁已通过，真实渠道、浏览器交互和 Windows 登录恢复仍未验收。
- 不得覆盖或暂存“必须保留的主人变更”两项知识文件。

## 下一轮执行顺序

1. 重新读取 `AGENTS.md`、本文件和权威 TODO，核对 HEAD/工作树并创建承接 Goal。
2. 已完成 Outbox 语义、来源 Adapter 和组合回归。
3. 已完成 Standards 首轮及 Spec/Security 修复复审，当前 P0/P1 均为 0。
4. 已完成当前差异完整自动门禁和 fresh clone。
5. 主人按 TODO 的 P4.7 清单执行自然语言会话、普通 URL、浏览器兜底、交互恢复、仅本地、跨渠道收录、自动执行/澄清和下次登录冷启动验收；Windows 安装/状态/受控重启已有本轮证据。
6. 记录每次 Artifact/Workflow/Job、日志事件和实际结果；失败项回到对应 P4 子阶段修复。
7. P4.7 全部通过后才规划 P5/R6，删除旧 Runtime 前必须重新三轴审查和完整回归。

## R6 封板门槛

旧 Provider/ToolLoopAgent/ContextManager/ConversationStore/Executor/Hermes 代码尚未删除，且现在不允许删除。必须先完成：

- 30 条真实跨渠道消息
- 10 组多轮追问
- 5 次 ToolRegistry 调用
- 3 次明确写入自动执行（含高风险：删除/覆盖/移动/新 MOC/新 tag）
- 3 次系统歧义澄清（收录撞重/多方案/信息不足）
- 1 次收录多方案澄清
- 1 次源码越界硬拒绝
- 1 次自我修改开关（allowSelfModify）关闭拒绝
- 1 次系统控制开关（allowSystemControl）关闭拒绝
- 3 次副作用恢复/对账（对应 S1 Effect Receipt，待 S1 落地后补验）
- 3 种来源类型收录
- OpenCode 重启后上下文与 PendingDecision 恢复

完整状态、接口、测试矩阵和执行顺序以 `docs/TODO-EXECUTION-PLAN.md` 为准。
