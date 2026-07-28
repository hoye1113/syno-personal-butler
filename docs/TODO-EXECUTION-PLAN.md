# Syno 转换为 OpenCode CLI Agent：权威执行计划

更新日期：2026-07-28（Asia/Shanghai）

本文是当前唯一详细执行入口。旧的知识闭环 P0–P5 计划已归档到
`docs/archive/TODO-EXECUTION-PLAN-2026-07-21.md`；长期产品目标和迁移历史仍见
`docs/HANDOFF-EXECUTION-PLAN.md`。

## 1. 当前可信基线

- 仓库：`D:\workSpace\syno-personal-butler`
- 分支：`codex/round3-remediation`
- 本轮固定起点：`f0333f3`
- OpenCode 重构实现提交：`5890dad`
- OpenCode CLI 锁定版本：`1.18.2`
- 真实二进制：
  `%LOCALAPPDATA%\mise\installs\node\24.13.0\node_modules\opencode-ai\bin\opencode.exe`
- OpenCode 子进程固定监听 `127.0.0.1:4318`；Syno Host 当前监听端口由现有配置决定。
- mise shim 在后台启动时曾产生递归进程风暴，生产环境永久禁止直接启动 shim、`.cmd` 或 `.bat`。
- 本轮开始前 Node 测试 316/316、Repository verify 1326 files。
- `5890dad` 完成后：Node 370/370、vault pytest 57/57、Repository verify 1358 files。
- `C:\tmp\syno-fresh-863bcca` 从文档提交前的 `863bcca` 克隆并按锁文件安装：Node 370/370、vault 57/57、Repository verify 1356 files；安装未改变锁文件。
- 工作树中有两项主人知识变更，不属于本轮，禁止覆盖或暂存：
  - `vault/02-Resources/AI and Agents/MOC - Agent 架构与工程.md`
  - `vault/02-Resources/AI and Agents/Agent Design & Patterns/当编码不再是瓶颈 - Berkeley RDI 软件自主开发三级框架.md`
- 独立 OpenCode Zen 凭据尚未配置，因此真实免费模型、真实跨渠道对话和真实审批计数尚未验收。

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
- Syno 负责 Owner 身份、渠道去重、来源、任务、审批、权限、受控写入和事实源。
- Web 是可选控制台，不是普通收录、询问或审批的强制入口。
- OpenCode 不得直接读取仓库、写文件、执行 Shell/Git、修改源码、分享会话、启动子 Agent 或动态加载 MCP。
- 任意写入仍必须经过 ToolRegistry、Policy、Job、隔离 worktree、validators 和 GitGuard。

## 3. 不可变运行契约

### 3.1 唯一运行时

- 产品运行时目标是唯一启用 `OpenCodeCognitiveRuntime`。
- 原生 `ToolLoopAgent` 只在 R6 真实验收前作为非活动迁移回滚实现，绝不自动回退。
- Hermes、旧 OpenCode/Claude Executor 不得进入产品对话路径。
- OpenCode 失败后，自由对话和 LLM Job 等待；本地收录回执、审批解析、搜索和状态查询继续工作。

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
- 不把真实凭据缺失误报为产品已完成。
- 2026-07-28 本机 Doctor 已确认真实 exe 与 1.18.2；唯一未通过检查是预期中的独立 Zen Token 尚未配置。

### R1：Supervisor 与 Server 接缝 — 自动化与真实无模型探针已完成

已实现：

- `OpenCodeSupervisor.start/stop/restart/health/status/configure`。
- loopback、4318、Basic Auth、随机进程密码、独立 profile、固定启动参数。
- 只终止自有 PID 树；未知进程占端口时拒绝启动。
- OpenCode 配置显式关闭内置文件、Shell、任务、网络、分享、插件、LSP、formatter 和动态 MCP。
- 真实二进制探针覆盖健康、Session 创建、中止、删除与端口释放。
- `pnpm start:test` 会在测试环境联启 Syno Host 与 Fake OpenCode；生产环境无法启用 Fake Supervisor。
- 2026-07-28 真实探针确认：认证成功、Session create/abort/delete 成功、`syno` MCP connected、禁止内置工具可调用数为 0。

剩余：

- 在 Windows 登录任务场景下复验 Syno Host 与 OpenCode 子进程共同恢复。

### R2：CognitiveRuntime 与 Session — 自动化完成，真实 Token 待验收

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

### R4：渠道审批与来源闭环 — 已实现核心接缝，真实渠道待验收

已实现：

- 微信、飞书统一使用 `ChannelConversationHandler`。
- 渠道顺序固定为：身份/去重 → 附件 → PendingDecision → 快捷命令 → OpenCode → 回复。
- `PendingDecision` 支持单一自然确认、多个决定编号、TTL、重放保护、Owner/thread 绑定。
- 高风险双审批支持“确认生成差异”与“确认应用 六位码”，并绑定 changed paths 和 diff digest。
- `SourceDescriptor` 支持 URL、文件、个人观点和未知来源；Note 初始为 `knowledge_state: captured`。
- 收录完成回执包含路径、来源可靠性、重复/关联、候选和未验证事项。
- `修改：……` 会生成新版 Proposal，并把旧 Job 终结为 `canceled`，旧审批无法从 Web 或渠道继续应用。
- 附件在审批语义之前隔离处理；正文中的“确认”不能被解释为 Owner 审批。

剩余：

- 补足 HTML/转发内容的明确提取支持边界。
- 真实验证 URL、文本、Markdown、TXT、PDF 至少三种来源类型。
- 真实验证微信和飞书的多待办、跨渠道、过期、重放与完整双审批。

### R5：唯一运行时切换 — 代码默认已切换，产品验收未完成

当前代码默认选择 OpenCode Runtime，原生 Runtime 不参与自动回退。Web 已提供：

- OpenCode 健康、当前尝试和凭据状态。
- Zen Token 配置入口。
- OpenCode 重启入口。
- Provider 不可用时 LLM Job 持久化为 `waiting_provider`，到期后由后台确定性恢复；本地回执、审批解析与状态查询继续可用。

仍需：

1. 主人通过 `pnpm opencode:configure` 或 Web 设置独立 Zen Token。
2. 用非敏感内容完成真实模型探针。
3. 完成微信、飞书、Web 跨渠道上下文和工具调用验收。
4. 复验 Windows 登录任务恢复 OpenCode 子进程。

### R6：删除重复实现与封板 — 严格未开始

只有以下真实证据全部满足后才能删除旧实现：

- 30 条真实跨渠道消息。
- 10 组多轮追问。
- 5 次 ToolRegistry 调用。
- 3 次普通审批。
- 1 次完整双审批。
- 3 种来源类型的收录。
- OpenCode 重启后上下文与 PendingDecision 恢复。

满足后才删除原生 `ProviderClient`、`ToolLoopAgent`、`ContextManager`、重复 `ConversationStore`、旧 ExecutorRouter 和非活动 Hermes 代码。删除前后各运行一次完整回归；历史架构决定只留文档。

## 5. 自动测试与安全验收

每阶段必须覆盖：

- Binary：shim、`.cmd`、版本漂移、路径失效、空格路径、单进程。
- Server：loopback、401、Session、消息、中止、删除、未知端口占用、自有 PID。
- Runtime：跨渠道连续性、串行、取消、超时、崩溃、固定回退、不可逆副作用。
- 权限：内置工具不可调用，伪造工具名和权限字段被拒绝。
- 审批：单一/多个/重放/过期/跨 Owner/双审批 digest 变化。
- 收录：来源、哈希、重复、失效 URL、恶意正文和完整追溯。
- 隐私：Token 不进入输出、参数、仓库、备份或 profile。
- 完整回归：Node、vault pytest、repository verify、fresh clone、浏览器、真实渠道和 Windows。

三轮审查：

1. Standards：代码遵循仓库约定，模块接口足够深。
2. Spec：逐条对照 R0–R6 和公共契约。
3. Security：权限、凭据、注入、审批、GitGuard 和进程边界。

每轮高优先级发现修复后重审，最终要求 0 个未解决高优先级问题。

2026-07-28 已完成 Standards、Spec、Security 三轴复核。发现的凭据输入回显、工具副作用回退、私密迁移、旧 Proposal 继续可批、Fake Supervisor 边界和并发 Provider 重试等高优先级问题均已修复并重审；当前未解决 P0/P1 为 0。

## 6. 当前执行入口

1. 主人通过 CLI 或 Web 配置独立 Zen Token。
2. 以非敏感内容完成真实模型与提示注入探针。
3. 完成 R5 的微信、飞书、Web、审批、来源和重启恢复计数。
4. 复验 Windows 登录后 Syno Host 与 OpenCode 子进程共同恢复。
5. 只有达到全部门槛后进入 R6 删除、fresh-clone、浏览器与最终封板。

任何时候都不得重置分支、修改原始 Obsidian 仓库、覆盖两项主人知识变更、使用 `git add -A` 或自动 Push。
