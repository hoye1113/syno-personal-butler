# Syno 执行语义与移动可靠交付：权威执行计划

更新日期：2026-07-29（Asia/Shanghai）

本文是当前唯一详细执行入口。OpenCode P4 历史、知识闭环 P0–P5 和既有验收记录继续保留在本文后续章节与 `docs/archive/`，但不得覆盖本节的新执行顺序。

## 0. 新执行计划（review baseline `567f23d`）

```yaml
reviewBaseline:
  repository: hoye1113/syno-personal-butler
  branch: main
  commit: 567f23d2d9b423a98d0e88868c6cc2eb3859d16f
  reviewedAt: 2026-07-29

implementation:
  branch: codex/exec-p03-session-lifecycle
  baseCommit: 41ebf1c
  headCommit: pending
```

已完成：PR-00 `codex/exec-p00-contracts`，`567f23d` → `41a324d`，文档、ADR 与迁移策略门禁通过。

已完成：PR-01 `codex/exec-p01-bootstrap-host`，`41a324d` → `5b12fd8`，Host Lock、Bootstrap HTTP、生命周期与 doctor 门禁通过。

已完成：PR-02 `codex/exec-p02-cancellable-scheduler`，`5b12fd8` → `41ebf1c`，可取消 Session/Bridge Scheduler 门禁通过。

进行中：PR-03 `codex/exec-p03-session-lifecycle`，Binding mutation 与 Session 生命周期。

后续每个 PR 必须从前一个已验收 PR 的实际 HEAD 建分支，并独立记录 `baseCommit/headCommit`。执行顺序：

1. PR-00：文档、ADR、基线和迁移策略。
2. PR-01～PR-03：Host Bootstrap、可取消双层 Scheduler、Binding/Session 生命周期。
3. PR-04A0～PR-04D：真实身份能力验证、AcceptedRequest、ChannelDeliveryOutbox、原子 Effect Receipt、Unknown Case。
4. PR-05～PR-06：移动状态、原渠道可靠交付和 Decision 消歧。
5. PR-07～PR-09：OpenCode Session 安全与 Capture。
6. PR-10：真实 Owner 验收、Schema 封板和 Legacy 清理。

硬门禁：

- 微信/飞书用户可见 ACK 前，请求和最小 DPAPI 加密恢复载荷必须进入 `%LOCALAPPDATA%\Syno\state`。
- 同一 OpenCode Session 只有一个 writer；Session Scheduler → Session Lease → Bridge Scheduler 的顺序不可反转。
- Direct Effect `unknown` 只允许只读 reconcile，不允许重复写。
- 最终结果默认回到原始渠道；跨渠道 fallback 默认关闭。
- 自动测试、探针、真实运行和 Owner 验收不能互相替代。

详细不可变边界见 ADR 0003–0005。PR-00～PR-03 完整回归和真实本机门禁通过前，不进入移动生产路径切换。

## 当前执行状态（2026-07-28）

- P4.0–P4.6 的实现、自动测试、三轴复审和 Windows 任务安装/受控重启已完成。
- 当前 Goal 状态为 `blocked`：剩余 P4.7 门槛需要主人真实操作，不能用 Fake、探针或单元测试替代。
- 最近证据（2026-07-28 约 22:26 CST 本次复核）：Node 454/454、vault pytest 57/57、Repository verify 1396 files、`git diff --check` 通过；Syno Host 在 8888 返回 `health ok`（监听进程 PID 14368 为更早手动启动，非当前活动任务实例托管），OpenCode supervisor 健康（pid 26144、`127.0.0.1:4318`、1.18.2、凭据 configured、`healthy=true`）。
- Windows `Syno` 计划任务当前 `State=Ready`（**未运行**）：`LastRunTime=2026-07-28 20:31:19`、`LastTaskResult=3221225786`（0xC000013A 控制中断退出）、`NextRunTime` 空、`legacyTaskDetected=false`。任务安装与受控重启在本轮历史中确已成功（曾等待 8 秒仍为 `Running` 并留有启动器日志），但当前实例已回落未运行且上次退出码异常；不得把当前 Host 存活当作任务 `Running` 或下次登录冷启动恢复证据，退出根因需主人在冷启动验收中确认。
- 工作树仍包含本轮未提交实现和两项主人知识变更；本次同步只修改文档，不暂存、不提交、不 Push。
- 不得批准或删除本轮探针留下的待审批/失败 Workflow；其 ID 与处理边界记录在 `NEXT_SESSION.md`。

## 1. 当前可信基线

- 仓库：`D:\workSpace\syno-personal-butler`
- 分支：`codex/round3-remediation`
- 本轮固定起点：`f0333f3`
- OpenCode 重构实现提交：`5890dad`
- 当前 HEAD：`f38ab18e6a2e2e09d4e7250ff8b98fc380f8510d`
- OpenCode CLI 锁定版本：`1.18.2`
- 真实二进制：
  `%LOCALAPPDATA%\mise\installs\node\24.13.0\node_modules\opencode-ai\bin\opencode.exe`
- OpenCode 子进程固定监听 `127.0.0.1:4318`；Syno Host 当前监听端口由现有配置决定。
- mise shim 在后台启动时曾产生递归进程风暴，生产环境永久禁止直接启动 shim、`.cmd` 或 `.bat`。
- 本轮开始前 Node 测试 316/316、Repository verify 1326 files。
- `5890dad` 完成后：Node 370/370、vault pytest 57/57、Repository verify 1358 files。
- Windows 计划任务 XML 加固后：Node 375/375、vault pytest 57/57、Repository verify 1359 files、`git diff --check` 通过。
- OpenCode 启动死锁与运行日志修复后：Node 381/381、vault pytest 57/57、Repository verify 1365 files、`git diff --check` 通过。
- `C:\tmp\syno-fresh-863bcca` 从文档提交前的 `863bcca` 克隆并按锁文件安装：Node 370/370、vault 57/57、Repository verify 1356 files；安装未改变锁文件。
- 当前工作树全量门禁（2026-07-28）：Node 454/454、vault pytest 57/57、Repository verify 1396 files、`git diff --check` 通过。
- 2026-07-28 真实直抓回归修复：Node 24 的 pinned DNS `lookup` 回调在 `all` 模式返回数组，OpenRouter 公共页面已成功抓取；新增本地回归测试，避免再次出现 `ERR_INVALID_IP_ADDRESS`。
- 2026-07-28 真实 WebBridge 复验修复：Kimi `/command` 的 `{ ok, data }` envelope 已在适配器解包；公开知乎 403 页面已验证 `http_forbidden → kimi_webbridge → snapshot_received → awaiting_decision`，真实日志包含 `usedActions: [navigate, snapshot]`。
- 2026-07-28 Windows 真实任务已完成安装与受控重启：`Syno` 使用真实 `C:\Users\38788\AppData\Local\mise\installs\node\24.13.0\node.exe`（不再使用 mise shim），任务状态在等待 8 秒后仍为 `Running`，Host 健康、PID 所有权记录存在，`legacyTaskDetected=false`；启动器脱敏日志已记录 `launcher.started/health_ok/adopted`。下次 Windows 登录后的冷启动恢复仍待主人验收。
- 2026-07-28 运行态复核快照（约 22:26 CST）：`Get-ScheduledTask Syno` 当前 `State=Ready`（未运行），`LastRunTime=2026-07-28 20:31:19`、`LastTaskResult=3221225786`（0xC000013A 控制中断退出），`scripts/manage-windows-task.ps1 -Action Status` 同样报告 `running=False`（`installed=true`、`legacyTaskDetected=false`）；8888 上存活的是更早（20:05:47）手动启动的 Host 进程（PID 14368），并非活动任务实例托管。`0xC000013A` 疑似受控重启停止旧实例或任务实例撞上 8888 已被既有 Host 占用所致，根因需主人在冷启动验收中确认；当前 Host 存活 ≠ 任务托管 ≠ 登录恢复。
- 当前差异 fresh clone `.runtime/p3-fresh-final-1785229932`：Node 433/433、vault pytest 57/57、Repository verify 1378 files；按锁文件安装成功，未包含两项主人知识变更。
- 工作树中有两项主人知识变更，不属于本轮，禁止覆盖或暂存：
  - `vault/02-Resources/AI and Agents/MOC - Agent 架构与工程.md`
  - `vault/02-Resources/AI and Agents/Agent Design & Patterns/当编码不再是瓶颈 - Berkeley RDI 软件自主开发三级框架.md`
- 主人已明确授权将全局 OpenCode 配置中的可用凭据一次性迁入 Syno DPAPI；产品运行时不会自动读取或依赖全局 `auth.json`。真实免费模型、真实跨渠道对话和真实写入与澄清计数仍未验收。
- R4.1–R4.7 当前实现位于未提交工作树中；拒绝意图持久化与恢复崩溃窗口已修复，并完成当前差异的全量自动门禁与三轴复审。
- P1–P3 自动封闭已经完成。P4.0–P4.6 的自然语言路由、项目 Skill、受限 Kimi WebBridge、自动回退、日志/Doctor 和自动测试已经实现并通过本地门禁；P4.7 的真实渠道、浏览器交互、登录后冷启动仍由主人执行。Windows 任务的安装、状态和受控重启已由本轮完成并留有日志证据。

## 2. 目标架构

```text
微信 / 飞书 / Web
  → ChannelConversationHandler
  → OpenCode Session
  → 静态 Syno Tool Bridge
  → ToolRegistry / Policy / Approval / GitGuard
  → vault / ops
```

职责边界：

- OpenCode 负责对话上下文、压缩、意图理解、Skill 选择和工具规划。
- Syno 负责 Owner 身份、渠道去重、来源、任务、决策、权限、受控写入和事实源。
- Web 是可选控制台，不是普通收录、询问或决策的强制入口。
- OpenCode 不得直接读取仓库、写文件、执行 Shell/Git、修改源码、分享会话、启动子 Agent 或动态加载 MCP。
- 任意写入仍必须经过 ToolRegistry、Policy、Job、隔离 worktree、validators 和 GitGuard。

## 3. 不可变运行契约

### 3.1 唯一运行时

- 产品运行时目标是唯一启用 `OpenCodeCognitiveRuntime`。
- 原生 `ToolLoopAgent` 只在 R6 真实验收前作为非活动迁移回滚实现，绝不自动回退。
- Hermes、旧 OpenCode/Claude Executor 不得进入产品对话路径。
- OpenCode 失败后，自由对话和 LLM Job 等待；本地收录回执、决策解析、搜索和状态查询继续工作。

### 3.2 模型链

固定顺序：

1. `opencode/mimo-v2.5-free`
2. `opencode/deepseek-v4-flash-free`
3. `opencode/laguna-s-2.1-free`

只有不可用、限流、连接失败、超时、5xx、空响应或契约失败，且本次尝试未产生不可逆副作用时，Syno 才可确定性尝试下一模型。模型不能选择模型、Provider 或回退目标；全部失败进入 `waiting_provider`。

### 3.3 凭据与隐私

- Zen Token 使用 Windows DPAPI 独立保存在 `%LOCALAPPDATA%\Syno\credentials`。
- 不读取、复制或依赖用户全局 OpenCode `auth.json`。
- Token 只通过子进程环境提供，并由内联配置的环境变量引用；不进入命令行、仓库、状态元数据、日志或 OpenCode profile。
- 免费模型默认只接收当前任务必要的限长知识片段；敏感笔记不出本机。

## 4. 阶段状态

### R0：规格固化与 Doctor — 自动化与本机 Doctor 已完成

已实现：

- `pnpm opencode:doctor/status/restart/configure`
- 真实二进制发现、shim 拒绝、版本锁定、项目 Agent/Skills 检查和脱敏凭据状态。
- 根 `AGENTS.md` 已切换为三模型固定链与无 Claude/原生回退规则。

验收：

- Doctor 不读取或输出 Token。
- 路径失效或版本不是 1.18.2 时进入 `setup_required`。
- 不把凭据已配置误报为真实模型或产品验收已完成。
- 2026-07-28 本机 Doctor 已确认真实 exe 与 1.18.2；主人随后授权完成一次性凭据迁移，下一步由主人重新运行 Doctor 并执行真实模型探针。

### R1：Supervisor 与 Server 接缝 — 自动化与真实无模型探针已完成

已实现：

- `OpenCodeSupervisor.start/stop/restart/health/status/configure`。
- loopback、4318、Basic Auth、随机进程密码、独立 profile、固定启动参数。
- 只终止自有 PID 树；未知进程占端口时拒绝启动。
- OpenCode 配置显式关闭内置文件、Shell、任务、网络、分享、插件、LSP、formatter 和动态 MCP。
- 真实二进制探针覆盖健康、Session 创建、中止、删除与端口释放。
- `pnpm start:test` 会在测试环境联启 Syno Host 与 Fake OpenCode；生产环境无法启用 Fake Supervisor。
- 2026-07-28 真实探针确认：认证成功、Session create/abort/delete 成功、`syno` MCP connected、禁止内置工具可调用数为 0。
- Windows 安装器通过 `Syno.WindowsTaskXml.psm1` 对导出的 Task Scheduler XML 做保护与闭环验证：只允许一个登录触发器，固定 `PT30S` 延迟，并锁定执行身份、命令、参数、工作目录、单实例、隐藏、无限执行和每分钟重启。重注册后必须再次导出验证，既有健康任务也只有在同一 XML 契约通过后才能复用。
- 已修复 Host 初始化与 OpenCode MCP 的循环等待：只有 `/api/syno/opencode/mcp` 可在 bootstrap 阶段绕过 `synoReady`，其他 Syno API 仍等待完整初始化。
- 运行日志写入 `%LOCALAPPDATA%\Syno\logs`：按日 JSONL、14 天保留、字段递归脱敏、不记录消息正文，覆盖初始化、OpenCode、渠道与消息工作流阶段。
- 2026-07-28 真实复验确认 Host 8888、OpenCode 4318、1.18.2、凭据、静态 MCP、微信和飞书启动健康；真实模型回答内容仍由主人验收。

剩余：

- 在 Windows 登录任务场景下复验 Syno Host 与 OpenCode 子进程共同恢复。

### R2：CognitiveRuntime 与 Session — 自动化完成，真实模型待验收

已实现：

- Capability v2。
- Owner 的微信、飞书、Web 共用 `main` Session；主动任务使用独立 `proactive` Session。
- 每个 Session 串行、取消、30 天保留清理、`/新对话`。
- 只持久化 Session binding 元数据，不保存第二份完整对话。
- 每次消息显式固定 Agent、Model 和允许工具，禁止模型扩大能力。
- 切换前活跃对话仅迁移脱敏摘要与最近用户消息；工具输出、assistant/system、private/sensitive 内容和密钥模式全部排除。
- Provider 恢复任务每 60 秒检查一次到期 `waiting_provider`；手动与后台重试通过同一 Job 锁原子取得执行权，禁止重复执行。

剩余：

- 验证 OpenCode 重启后的上下文恢复与 30 天清理。

### R3：Skills 与 Tool Bridge — 已实现，提示注入实测待完成

已实现：

- `.opencode/agents/syno.md`。
- 六个薄 Skills：capture、knowledge、learn、review、create、maintain。
- 唯一静态 MCP `syno`，底层工具名由 Bridge 映射为最终 `syno_*`。
- `syno_workflow_context` 从 canonical Skill 读取规则，不复制第二套知识语义。
- Bridge 调用继续经过 ToolRegistry Schema、Policy 和固定 Owner 上下文。
- 知识读取为限长 snippet，敏感 frontmatter 默认拒绝。

剩余：

- 使用真实模型执行提示注入探针，证明 Shell、文件、Git、分享、模型切换、子 Agent 和动态 MCP 不可调用。

### R4：渠道澄清与来源闭环 — 已实现核心接缝，真实渠道待验收

已实现：

- 微信、飞书统一使用 `ChannelConversationHandler`。
- 渠道顺序固定为：身份/去重 → 附件 → PendingDecision → 快捷命令 → OpenCode → 回复。
- `PendingDecision` 支持单一自然澄清、多个决定编号、TTL、重放保护、Owner/thread 绑定。
- 高风险写入（覆盖/删除/移动/新 MOC/新 tag）在隔离工作区自动执行，绑定 changed paths 和 diff digest，冲突时暂停澄清。
- `SourceDescriptor` 支持 URL、文件、个人观点和未知来源；Note 初始为 `knowledge_state: captured`。
- 收录完成回执包含路径、来源可靠性、重复/关联、候选和未验证事项。
- `修改：……` 会生成新版 Proposal，并把旧 Job 终结为 `canceled`，旧决策无法从 Web 或渠道继续应用。
- 附件在写入语义之前隔离处理；正文中的“确认”不能被解释为 Owner 写入指令。

剩余：

- 补足 HTML/转发内容的明确提取支持边界。
- 真实验证 URL、文本、Markdown、TXT、PDF 至少三种来源类型。
- 真实验证微信和飞书的多待办、跨渠道、过期、重放与冲突澄清。

### R4.1–R4.7：稳定收录与编译上下文 — 自动封闭完成，待主人真实验收

当前未提交实现已经覆盖：

1. **R4.1 术语与架构**：`CONTEXT.md` 与 ADR 固定 ConversationSession、IngestWorkflow、Artifact、IngestProposal、PendingDecision、KnowledgeRecord，以及“薄 OpenCode Skill + Syno 编译 canonical 上下文”。
2. **R4.2 持久 Workflow**：具备持久状态机、幂等接收、重启恢复、重试、规则变更 supersede 和终态保留接缝。
3. **R4.3 Context Compiler**：使用固定 allowlist 编译带 digest 的 WorkflowContextBundle，包含来源适配、上下文预算、长内容分块和远程前 DLP。
4. **R4.4 Capture Session**：复杂收录使用隔离 capture Session；普通语义分析继续采用最小权限配置，浏览器兜底阶段按上下文启用 `syno-web-capture` 与受限浏览器工具，全文不进入 main Session。
5. **R4.5 渠道与 Outbox**：统一渠道状态查询、确定性受控执行、持久 Outbox、选项解析和重启后重新投递。
6. **R4.6 Proposal 与写入**：具备 canonical 标签与关系、来源/内容摘要、来源更新检测、风险升级、受控写入和完整完成回执。
7. **R4.7 知识闭环**：生成可重建的 LearningCandidate、ReviewOpportunity、OutputOpportunity 和 EvidenceCandidate，不更新掌握度事实。

当前自动封闭证据：

- 来源去重、内容更新、最终回执、EvidenceCandidate、DLP、规则 supersede、HTML/DOCX/PDF/URL/Markdown/TXT/personal/local-only 适配均有组合测试；当前 Node 全量 454/454 通过。
- Outbox 已采用 5 分钟可恢复租约、稳定 eventId/idempotencyKey 和接收方幂等边界；仍保持 durable at-least-once 语义，极窄崩溃窗口的重复通知是已记录的产品限制，不会重复写入或重复触发澄清。
- Bilibili canonical 规则与来源报告已按保守语义实现；未完成语义审阅时明确保持 incomplete，不伪报 verified。
- Standards、Spec、Security 最新复审均未发现未解决 P0/P1。
- 当前工作树包含两项主人知识变更，任何测试、暂存和提交都必须继续排除它们。

自动封闭已完成；R5/R6 的真实模型、跨渠道、Windows 登录恢复和旧实现删除仍必须等待主人 P4 实测。

### R5：唯一运行时切换 — 代码默认已切换，产品验收未完成

当前代码默认选择 OpenCode Runtime，原生 Runtime 不参与自动回退。Web 已提供：

- OpenCode 健康、当前尝试和凭据状态。
- Zen Token 配置入口。
- OpenCode 重启入口。
- Provider 不可用时 LLM Job 持久化为 `waiting_provider`，到期后由后台确定性恢复；本地回执、决策解析与状态查询继续可用。

仍需：

1. 主人运行 `pnpm opencode:doctor`，确认一次性迁移后的凭据状态。
2. 主人运行 `pnpm start`，用非敏感内容完成真实模型与提示注入探针。
3. 已完成 `pnpm windows:install`、`pnpm windows:status` 和 `pnpm windows:restart` 的真实验收：任务定义固定、真实 node.exe、健康与持续 Running 均通过；仅保留下次登录冷启动验证。
4. 完成微信、飞书、Web 跨渠道上下文和工具调用验收。
5. 复验下次 Windows 登录后 Syno Host 与 OpenCode 子进程共同恢复（当前仍未完成）。

### R6：删除重复实现与封板 — 严格未开始

只有以下真实证据全部满足后才能删除旧实现：

- 30 条真实跨渠道消息。
- 10 组多轮追问。
- 5 次 ToolRegistry 调用。
- 3 次明确写入自动执行（含高风险：删除/覆盖/移动/新 MOC/新 tag）。
- 3 次系统歧义澄清（收录撞重/多方案/信息不足）。
- 1 次收录多方案澄清。
- 1 次源码越界硬拒绝。
- 1 次自我修改开关（allowSelfModify）关闭拒绝。
- 1 次系统控制开关（allowSystemControl）关闭拒绝。
- 3 次副作用恢复/对账（对应 S1 Effect Receipt，待 S1 落地后补验）。
- 3 种来源类型的收录。
- OpenCode 重启后上下文与 PendingDecision 恢复。

满足后才删除原生 `ProviderClient`、`ToolLoopAgent`、`ContextManager`、重复 `ConversationStore`、旧 ExecutorRouter 和非活动 Hermes 代码。删除前后各运行一次完整回归；历史架构决定只留文档。

## 5. 自动测试与安全验收

每阶段必须覆盖：

- Binary：shim、`.cmd`、版本漂移、路径失效、空格路径、单进程。
- Server：loopback、401、Session、消息、中止、删除、未知端口占用、自有 PID。
- Runtime：跨渠道连续性、串行、取消、超时、崩溃、固定回退、不可逆副作用。
- 权限：内置工具不可调用，伪造工具名和权限字段被拒绝。
- 澄清/决策：单一/多个/重放/过期/跨 Owner/digest 变化。
- 收录：来源、哈希、重复、失效 URL、恶意正文和完整追溯。
- 隐私：Token 不进入输出、参数、仓库、备份或 profile。
- 完整回归：Node、vault pytest、repository verify、fresh clone、浏览器、真实渠道和 Windows。

三轮审查：

1. Standards：代码遵循仓库约定，模块接口足够深。
2. Spec：逐条对照 R0–R6 和公共契约。
3. Security：权限、凭据、注入、受控执行、GitGuard 和进程边界。

每轮高优先级发现修复后重审，最终要求 0 个未解决高优先级问题。

此前 OpenCode 基线曾完成一次 Standards、Spec、Security 三轴复核；当前差异已重新完成三轴复审，旧结论不再单独作为证据。

当前差异的最终审查状态（2026-07-28）：

- Standards：最终复审通过，P0 0、P1 0。
- Spec：最终复审通过，P0 0、P1 0。
- Security：最终复审通过，P0 0、P1 0。
- 复审中发现的拒绝流程 P1 已修复：拒绝意图先落盘；恢复先核对 Job 状态，已 rejected 不重发 Proposal，awaiting_approval 才幂等重试。

## 6. 当前执行入口

### P0：文档同步与实现冻结 — 已完成

- 以当前 HEAD、工作树、测试和审查证据更新 TODO、NEXT_SESSION、HANDOFF、KNOWN_LIMITATIONS 和 OPERATIONS。
- 本阶段不继续修改执行代码，不暂存、不提交、不 Push。
- 下一轮开始执行前创建承接 Goal，并以本节 P1 为起点。

### P1：R4 自动封闭 — 已完成

1. 为 Outbox 落实可恢复租约与接收方幂等键，或形成经测试、可观察且不影响决策与写入正确性的 at-least-once 明确边界。
2. 逐项复核 Bilibili、HTML、DOCX、PDF、URL、Markdown/TXT 和 personal/local-only 来源适配。
3. 为来源哈希去重、内容更新、最终回执、EvidenceCandidate、DLP 和规则 supersede 补齐组合回归。
4. 修复本轮发现的编译、契约、恢复和错误传播问题；不得用旧 Runtime 回退绕过。

### P2：三轴审查封闭 — 已完成

1. 从固定点 `f38ab18...工作树` 完成 Standards 首轮。
2. 对当前全部修复完成 Spec 与 Security 复审。
3. 修复全部 P0/P1；P2 要么修复，要么在 KNOWN_LIMITATIONS 中记录影响、规避和后续条件。
4. 重审直至当前差异未解决 P0/P1 为 0。

### P3：完整自动门禁 — 自动部分完成，真实界面/设备留给主人

- 运行完整 Node 测试、vault pytest、Repository verify、契约/脚本入口校验与 `git diff --check`。
- 使用包含当前差异的隔离快照做 fresh-clone 复验；不得复用旧 clone冒充当前证据。
- Playwright CLI/浏览器接缝受当前 Codex 浏览器安全策略拒绝（4329 本地验收页不可用），因此本轮不伪称桌面/390×844/控制台实测通过；现有 UI 单元测试已覆盖 Today、响应式、键盘焦点和 reduced-motion 静态契约，真实页面验收移交 P4。
- 只执行 Windows Task Scheduler DryRun/测试适配器；真实安装、登录和设备行为留给主人验收。
- 将精确命令、通过数量、失败和环境限制写回验收文档；本轮证据为主工作树 Node 433/433、vault 57/57、verify 1382 files、fresh clone Node 433/433、vault 57/57、verify 1378 files、`git diff --check` 通过。

### P4：自然交互与 Kimi WebBridge 自动收录补强 — P4.0–P4.6 自动实现完成，P4.7 待主人验收

#### P4.0：规格、边界与失败分类固化

目标是让主人只描述想做什么，不需要记忆斜杠命令、工具名或网页抓取实现。

1. 新增 ADR，固定以下决定：
   - 斜杠命令仅作为兼容逃生口，自然语言是主交互。
   - 会话控制、能力说明、收录状态和标签页关闭等确定性意图在调用 OpenCode 前解析。
   - Kimi WebBridge 采用“项目级 OpenCode Skill + `syno_browser_*` 受限工具桥 + Syno Workflow 控制面”三层整合。
   - OpenCode 负责按照 Skill 完成页面导航、快照读取和必要的多步语义判断；Syno 负责决定何时授权浏览器、限制目标 URL 和动作、持久化 Workflow、校验结果以及推进受控执行。
   - 用户全局 `kimi-webbridge` Skill 是上游方法来源，不直接作为 Syno 运行时事实源。Syno 使用项目级适配 Skill，避免隔离 profile、版本漂移、Shell 示例和全量浏览器能力绕过产品边界。
   - 直接 HTTP 抓取优先；只有确定性失败分类命中时才自动升级 WebBridge。
   - Session 仍不是任务事实源；浏览器回退不得绕过 Artifact、Workflow、Proposal、Policy、Approval 或 GitGuard。
2. 新增失败分类契约：

```text
http_unauthorized
http_forbidden
anti_bot_challenge
javascript_shell
empty_or_low_quality
wechat_restriction
network_failure
unsafe_redirect
private_or_sensitive
browser_unavailable
browser_interaction_required
```

3. 更新 `SourceDescriptor`、`IngestWorkflow` 与运行事件契约，记录：

```text
fetchMethod: direct_http | kimi_webbridge | local_only
fallbackReason
requestedUrl
finalUrl
browserSessionId
contentDigest
retrievedAt
```

4. 精确计划范围已按主人授权实施；新增源码仍遵守既有差异审计和不暂存、不 Push 约束。

完成门槛：文档、契约和用户文案对“自动尝试”“需要主人继续操作”“不可抓取”使用同一套术语。

#### P4.1：自然语言意图路由与能力说明

新增深模块：

```text
ChannelIntentRouter.classify(text, context) -> ChannelIntent
CapabilityPresenter.describe(context) -> CapabilitySummary
```

`ChannelIntent` 首版只包含确定性、低歧义意图：

```text
new_conversation
show_capabilities
capture_status
list_pending_capture
continue_browser_capture
close_capture_tabs
normal_conversation
```

实现要求：

- “重新开个对话”“换个话题”“从头聊”“清空这段上下文”创建新的 OpenCode `main` Session。
- `/新对话` 保持兼容；新 Session 成功后返回简短确认，旧 Session 按保留策略留存。
- “你能做什么”“有哪些能力”“怎么用”由 `CapabilityPresenter` 根据当前 Runtime、渠道、ToolRegistry、待办和健康状态生成，不维护一份易漂移的静态工具清单。
- “收录状态”“刚才的文件怎么样了”“待我确认的收录”继续走本地确定性查询，不消耗模型。
- 路由只识别固定高置信模式；含糊表达进入普通对话，不用关键词误杀正常内容。
- Owner 身份、平台去重、PendingDecision 的优先级继续高于意图路由。

完成门槛：主人不使用 `/` 也能新建会话、查看能力、查询收录状态；现有受控执行语义不受影响。已由路由与渠道回归测试覆盖。

#### P4.2：项目级 OpenCode Skill 与引导协议

新增项目 Skill：

```text
.opencode/skills/syno-web-capture/SKILL.md
```

它是全局
`C:\Users\38788\.config\opencode\skills\kimi-webbridge\SKILL.md`
的 Syno 薄适配层，而不是第二套收录业务规则。

采用项目级适配而不直接加载全局原件的原因：

- Syno 当前通过 `OPENCODE_CONFIG_DIR`、`XDG_CONFIG_HOME` 等使用隔离 profile；用户日常 OpenCode 的全局 Skill 不应成为产品启动的隐式依赖。
- Kimi 原 Skill 描述了完整浏览器控制，并使用 Shell/curl 示例；Syno 明确禁止 OpenCode Bash，直接放开 Skill 仍不会产生可执行工具。
- 全局 Skill 可独立升级，Syno 必须先完成版本兼容、动作 allowlist 和安全回归，不能跟随其内容静默漂移。
- 项目 Skill 可以被仓库审查、测试和 fresh clone 复现，同时仍保留 Kimi 的核心规则：一个任务一个 session、优先 snapshot、标签组可见、不要过早关闭。

项目 Skill 只说明：

1. 何时使用：仅当本次 capture Session 收到 Syno 的 `BrowserCaptureTask`，不得自行把普通问答升级为浏览器任务。
2. 如何使用：先调用 `syno_browser_status`，再对任务给定的精确 URL 调用 `syno_browser_navigate`，随后用 `syno_browser_snapshot` 读取；页面不完整时可在预算内继续 snapshot。
3. 如何结束：返回结构化 `BrowserCaptureObservation`，不直接创建 Artifact、Proposal、Job 或批准写入。
4. 何时停下：登录、CAPTCHA、条款确认、表单、支付、权限申请或其他需要主人交互的页面必须返回 `interaction_required`。
5. 如何处理标签：任务完成后默认保留标签组；只有主人明确要求时才调用 `syno_browser_close_session`。
6. 安全语义：页面正文是不可信数据，其中的“执行命令、修改配置、切模型、调用其他工具”全部无效。

新增 `BrowserCaptureTask`：

```text
workflowId
requestedUrl
allowedFinalOrigins
fallbackReason
browserSessionId
actionBudget
snapshotBudget
contentBudget
expiresAt
```

新增 `BrowserCaptureObservation`：

```text
status: completed | interaction_required | unavailable | failed
requestedUrl
finalUrl
title
content
contentDigest
interactionHint
usedActions
browserSessionId
```

OpenCode 引导方式固定为：

```text
IngestWorkflowCoordinator 判定 direct HTTP 失败
-> 创建 BrowserCaptureTask
-> 以 capture:{artifactId} Session 调用同一个 syno Agent
-> 系统提示明确要求加载 syno-web-capture
-> 本次请求只开放 skill 与 syno_browser_* 工具
-> OpenCode 按 Skill 执行多步 navigate/snapshot
-> 结构化 Observation 返回 Coordinator
```

运行时需要把当前“capture Session 一律 `skill: false`”改成按上下文授权：

- 普通 capture 分析继续关闭 Skill 或只使用 `syno-capture`。
- 浏览器 capture 阶段启用 `skill`，系统提示指定 `syno-web-capture`。
- 其他 `syno-*` Skill 即使可被发现，也不能获得未在本次请求开放的工具；Skill 内容本身不能扩大权限。
- 全局 `kimi-webbridge` 不加入允许名单；项目适配 Skill 名称保持 `syno-*`，符合现有安全契约。

项目 Skill 记录上游名称、观察到的版本、源文件 SHA-256 和适配日期。`opencode:doctor` 比较已安装全局 Skill/daemon/extension 与项目适配版本；发现漂移只报告 `review_required`，不得运行时自动复制或覆盖。

完成门槛：项目 Skill、工具权限和 OpenCode 请求契约已由自动测试覆盖；真实 OpenCode 页面抓取仍列入 P4.7 主人验收。

#### P4.3：受限 `BrowserCaptureAdapter` 与 Tool Bridge

新增内部接口：

```text
health() -> BrowserCaptureHealth
capture({ workflowId, exactUrl, timeoutMs }) -> BrowserCaptureResult
continue({ workflowId }) -> BrowserCaptureResult
closeSession({ workflowId }) -> CloseResult
```

通过现有静态 Syno MCP 向 OpenCode 暴露：

```text
syno_browser_status
syno_browser_navigate
syno_browser_snapshot
syno_browser_list_tabs
syno_browser_close_session
```

这些是 ToolRegistry 中有 Schema、风险、权限、重试与版本声明的正式工具，不是 OpenCode 内置浏览器、Bash 包装或任意 Kimi `/command` 代理。模型不能传入 action 名称；每个工具在服务端固定映射到一个允许动作。

安全边界：

- 只连接固定回环地址 `http://127.0.0.1:10086`，不得从模型、渠道消息或 Settings 接受替代 endpoint。
- 启动前校验 Kimi daemon 与扩展连接状态，并记录版本；不可用时返回结构化失败，不自行安装、升级、重启或修改全局配置。
- 每个 Workflow 使用独立 WebBridge session/tab group，绑定 `workflowId`，禁止复用任意 active tab。
- `syno_browser_navigate` 不接受任意 URL：只能使用 Coordinator 已签发、未过期 `BrowserCaptureTask` 中的 `requestedUrl` 或校验后的同源重定向。
- Tool Bridge 在每次调用时核对 Owner、capture Session、workflowId、browserSessionId、预算和 Workflow 当前阶段；main/proactive Session 不得调用浏览器工具。
- 首版允许的动作仅为：

```text
status
navigate
snapshot
list_tabs
close_session
```

- 首版禁止：

```text
find_tab(active=true)
click
fill
evaluate
cdp
network
upload
screenshot
save_as_pdf
```

- `close_session` 默认不自动调用；只有主人明确说“关闭收录标签”，或以后经主人确认开启 `browserCapture.autoCloseTabs` 后才允许调用。
- 浏览器返回内容一律视为不可信输入；截断、去脚本化、DLP、密钥扫描、内容大小与编码限制必须在送往模型前重新执行。
- `finalUrl` 必须重新经过协议、DNS/IP、重定向和私网阻断检查；不得因浏览器可访问而绕过 SSRF 规则。

设置边界：

```text
browserCapture.enabled = true
browserCapture.mode = automatic_exact_url
browserCapture.autoCloseTabs = false
```

以上设置不可由 OpenCode Agent 修改；endpoint 与动作 allowlist 为代码级不可变配置。

完成门槛：OpenCode 运行时只看到受限的 `syno_browser_*`，且看不到任意 Kimi action、endpoint、Shell、通用 WebFetch 或用户其他标签页；Tool Bridge 与安全回归已通过。

#### P4.4：接入稳定收录 Coordinator

固定流程升级为：

```text
Artifact 已落盘并立即回执
-> 本地 URL 安全检查
-> direct HTTP 抓取
-> 确定性质量/失败分类
-> 必要时签发 BrowserCaptureTask
-> OpenCode 加载 syno-web-capture 并调用受限 WebBridge 工具
-> 提取、DLP、查重
-> WorkflowContextCompiler
-> capture Session 语义分析
-> IngestProposal + PendingDecision
-> 既有决策与受控写入
```

自动回退条件只允许：

- HTTP 401/403。
- 已识别的反爬或人机验证页。
- 仅有 JavaScript 壳、正文为空或低于确定性质量阈值。
- 微信等已知平台限制。
- 普通网络抓取失败，但 URL 本身通过安全校验。

不得自动回退：

- `analysisMode: local-only`。
- URL 指向 localhost、内网、凭据型 URL 或安全重定向失败。
- 内容命中密钥、Cookie、敏感 frontmatter 等本地阻断。
- 已需登录、CAPTCHA、同意条款、点击展开、下载确认或填写表单。
- 主人未明确要求收录，只是在普通问答中引用 URL。

遇到交互门槛时：

1. Workflow 进入可恢复的 `browser_interaction_required` 状态。
2. 原渠道说明需要主人在浏览器完成什么，不暴露内部动作名。
3. 主人完成后回复“继续刚才的收录”，由确定性路由恢复同一 Workflow。
4. 不创建第二个 Artifact，不丢失原 Proposal/来源链。

完成门槛：HTTP 成功不启动浏览器；HTTP 受限时 Coordinator 自动指派 OpenCode 使用 `syno-web-capture`，无需主人提醒；需人工交互时可暂停和恢复；所有路径仍只有一个 Workflow 事实源。Coordinator 自动回退与恢复测试已通过。

#### P4.5：可观察性、状态回执与 Doctor

- 运行日志新增不含正文的阶段事件：

```text
capture.direct.started
capture.direct.failed
capture.browser.fallback_started
capture.browser.snapshot_received
capture.browser.interaction_required
capture.browser.failed
capture.browser.completed
capture.browser.session_closed
```

- 每条事件记录 `workflowId`、失败分类、耗时、尝试次数、final URL 的安全摘要、内容 digest 和投递状态；禁止记录正文、Token、Cookie、页面存储或 Basic Auth。
- `syno_capture_status` 和渠道状态回复展示“正在直接抓取 / 正在尝试浏览器 / 等待你完成验证 / 正在生成收录建议 / 等待确认”等人话阶段。
- `pnpm opencode:doctor` 或新增只读诊断项检查项目 `syno-web-capture` 可发现性、全局 Kimi Skill 上游摘要、WebBridge daemon、扩展连接、版本兼容和动作 allowlist，不尝试复制、安装或修复。
- Web 高级诊断页可查看浏览器兜底健康和最近失败分类；Today 正常时不增加技术噪声。
- Outbox 保证 Proposal、交互请求、失败和完成事件最终送回原渠道；同一 eventId 不重复展示。

完成门槛：出现问题时可以从日志还原每一步，但不能还原用户正文或凭据；阶段事件、Doctor、状态文案和 Outbox 已接入，真实日志验收仍由主人执行。

#### P4.6：自动测试与三轴复审

自动测试至少覆盖：

- 自然语言路由：中英文同义表达、歧义、普通聊天误判、决策优先级和 `/新对话` 兼容。
- Session：自然语言新建、旧 Session 保留、跨微信/飞书共用新 main Session、重启后 binding 恢复。
- Skill：项目 Skill 可发现并按需加载；全局 Skill 缺失不影响运行；上游 digest 漂移只告警；Skill 不能扩大本次工具 allowlist。
- WebBridge：健康、扩展离线、版本不兼容、超时、非法动作、任意 endpoint、active tab 劫持和 session 绑定。
- Tool Bridge：main/proactive Session 拒绝、非签发 URL 拒绝、过期任务拒绝、预算耗尽、跨 Owner 与跨 Workflow 冒用。
- 回退：401、403、反爬、JS 壳、低质量正文、微信限制、网络失败、HTTP 成功不回退。
- 安全：SSRF、重定向到私网、凭据 URL、敏感内容、Prompt Injection、超大正文和 `local-only` 零远程请求。
- 恢复：浏览器抓取前后崩溃、`browser_interaction_required` 重启恢复、继续操作幂等和重复投递。
- 标签页：默认不关闭；只有明确主人指令或已确认设置才关闭精确 Workflow session。
- 闭环：WebBridge 只改变提取手段，不改变来源、决策、`knowledge_state: captured` 或掌握度规则。

阶段完成后已执行当前仓库完整 Node 454/454、vault pytest 57/57、Repository verify 1396 files、`git diff --check`；OpenCode Doctor（管理员上下文）、Kimi WebBridge 健康、OpenRouter 直抓和真实知乎 WebBridge 兜底回归已通过。P4 代码差异的 fresh clone、真实渠道和 Windows 登录恢复仍是 P4.7/P5 门禁。自动复审未发现未解决 P0/P1。

#### P4.7：主人真实验收（当前阻塞点）

自动实现和复审全部通过后，主人执行：

1. 用自然语言“重新开个对话”，确认无需 `/` 即创建 OpenCode Session。
2. 询问“你能做什么”，确认回答来自当前能力和健康状态。
3. 微信发送可直接抓取的普通 URL，确认不启动浏览器。
4. 发送一个 direct HTTP 失败但浏览器可读的 URL，确认 Syno 自动让 OpenCode 加载 `syno-web-capture` 并使用 WebBridge，不需要主人提醒工具名。
5. 发送需要登录或 CAPTCHA 的页面，完成浏览器操作后回复“继续刚才的收录”。
6. 发送“关闭收录标签”，确认只关闭对应 Workflow 的标签组。
7. 使用一次“仅本地”，确认没有 direct HTTP、WebBridge 或 OpenCode 远程分析。
8. 微信发送 Markdown，飞书发送 PDF，并验证至少三种来源类型。
9. 修改一次 Proposal，完成三次明确写入自动执行和一次冲突澄清。
10. 在 Proposal 生成前重启一次，并在 PendingDecision 形成后再重启一次。
11. 微信发起后在飞书查询或确认，验证跨渠道 Owner 连续性。
12. 完成 30 条跨渠道消息、10 组多轮追问和 5 次 ToolRegistry 调用。
13. 收录后做一次 teach-back，确认收录本身不提高掌握度。
14. 执行真实 Windows 安装、状态、重启和下次登录恢复。

主人记录每项的时间、渠道、Artifact/Workflow/Job ID、期望、实际结果和日志事件。失败项回到 P4.1–P4.6 修复；全部通过前不进入 R6。

在主人提交上述实测记录前，Goal 保持 `blocked`；不得以当前自动门禁或 Windows 当前 Running 状态替代真实渠道、自动执行/澄清和下次登录证据。

### P5：R6 清理与最终封板

仅在主人明确确认 P4 全部通过后：

- 删除原生 Provider、ToolLoopAgent、ContextManager、重复 ConversationStore、旧 Executor 和非活动 Hermes 代码。
- 再次完成三轴审查、完整回归、当前 fresh clone、浏览器与恢复验证。
- 精确暂存声明路径并创建本地提交；除非主人再次明确要求，否则不 Push。
- 更新最终验收、备份、回滚、已知限制和交接文档，之后才能将产品标记封板。

任何时候都不得重置分支、修改原始 Obsidian 仓库、覆盖两项主人知识变更、使用 `git add -A` 或自动 Push。
