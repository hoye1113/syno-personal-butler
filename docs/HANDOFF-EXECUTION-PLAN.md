# Syno 主动式知识闭环管家：长期执行纲要

> **SUPERSEDED（2026-08-24）**：本文是旧长期执行纲要，不是当前 Project-aware Knowledge MVP 的执行入口。请先阅读 [`docs/project-aware-knowledge-execution-plan.md`](project-aware-knowledge-execution-plan.md)、[`docs/INDEX.md`](INDEX.md) 和根目录 [`NEXT_SESSION.md`](../NEXT_SESSION.md)。本文后续内容仅作历史追溯。

更新日期：2026-07-28（Asia/Shanghai）

本文维护长期产品目标、架构边界和迁移历史摘要。OpenCode 重构的唯一详细任务、公共接口、R0–R6 阶段顺序和验收门槛位于 `docs/TODO-EXECUTION-PLAN.md`；当前执行断点位于根目录 `NEXT_SESSION.md`。旧 P0–P5 计划仅保存在 `docs/archive/`。

> 当前执行状态以 `docs/TODO-EXECUTION-PLAN.md` 与根 `NEXT_SESSION.md` 为准；历史验收不替代 OpenCode R5 的真实模型、渠道和 Windows 恢复证据。

## 当前交接状态（2026-07-28）

- 当前 Goal 状态：`blocked`。
- 阻塞是外部验收门槛，不是实现崩溃：需要主人完成真实微信/飞书消息、自动执行与澄清验收、跨渠道连续性、OpenCode/Workflow 重启恢复和下次 Windows 登录冷启动。
- 本次同步为文档更新，不改变执行代码、原始 Obsidian 仓库、主人知识变更或运行事实源；不暂存、不提交、不 Push。
- 恢复入口：完整读取 `NEXT_SESSION.md` 与 `docs/TODO-EXECUTION-PLAN.md`，收集主人实测记录后，再将 Goal 恢复为 active 并逐项修复失败项。

## 产品目标

Syno 是 Windows 本地、单用户、主动式且可审计的知识闭环私人管家：

`输入收录 → 整理关联 → 理解学习 → 复习实践 → 创作输出 → 反馈更新`

Syno 负责降低整理成本、维护知识库、发现学习缺口、安排复习并推动输出，但不能替主人假装掌握。只有主人亲自口述、打字、答题或实践形成的 `LearningEvidence` 才能提高掌握度；AI 草稿只能提供脚手架、提纲、追问和反馈。

## 当前阶段

- 原知识库单向迁移已经完成，迁移管道、受控执行、GitGuard 和审计记录已落地。
- OpenCode 重构固定起点为 `f0333f3`，实现提交为 `5890dad`。
- R0–R4 的已提交基线接缝已经完成。当前 HEAD 为 `f38ab18`，R4.1–R4.7 的稳定收录实现位于未提交工作树；P1 自动封闭、P2 三轴复审和 P3 自动门禁已完成，当前等待主人 P4 真实验收。
- 主人已授权将全局 OpenCode 配置中的可用凭据一次性迁入 Syno DPAPI，产品不会自动读取全局 `auth.json`。当前产品尚未封板：真实模型提示注入、跨渠道计数、OpenCode 重启恢复和 Windows 登录恢复仍属 R5 门槛。Windows 任务的真实安装、状态与受控重启在本轮历史中已通过；本次复核（2026-07-28 约 22:26 CST）发现任务已回落至 `State=Ready`、未运行（`LastRunTime=2026-07-28 20:31:19`、`LastTaskResult=3221225786` 即 0xC000013A 控制中断退出）。下次登录冷启动尚未验收。
- 主人初步实测确认微信对话可用，但暴露了自然语言会话控制与受限网页抓取缺口。浏览器整合采用项目级 `syno-web-capture` Skill 引导 OpenCode，并通过受限 `syno_browser_*` Tool Bridge 调用 Kimi WebBridge；Workflow、授权、决策和写入仍由 Syno 控制。当前后续阶段固定为：主人确认新增计划 → TODO 的 P4.0–P4.6 自动实现与复审 → P4.7 主人真实验收 → P5/R6 清理与最终封板。详细范围只维护在 TODO，本文不复制。
- R6 删除旧实现严格未开始；主人真实验收是进入 R6 的必要条件。

## 迁移历史摘要

- 原库 inventory HEAD：`883fbf5c457156805b9e9b53358175ce84940b59`，inventory 前后保持 19 个 dirty entries；原库未被 Syno 写入。
- content Job `job-20260720-01b25db9` 成功，合并提交 `1631c23`。
- integration Job `job-20260721-f9be2d0b` 成功，合并提交 `824a317`。
- 后续 `job-20260721-c0f18eba`、`job-20260721-eb7deddc` 已完成；`job-20260721-e4501b3d` 保留失败审计。
- Windows ENAMETOOLONG 和非 ASCII pathspec 问题已通过 stdin NUL pathspec 与确定性 porcelain 解析修复，不得退回长命令行暂存。
- 32 篇 LangGraph.js 教程由 `b79d2e5` 主动移除。
- 4 个同路径冲突固定 keep-syno，只保留 Proposal；5 个敏感或缺失项固定排除，除非主人明确重新提交。
- 两个相同 SHA-256 的 Anthropic 收录候选仍等待主人裁决，不得自动重复收录。
- 当前运行态还保留本轮本地探针产生的两条待审批 Workflow（`workflow-6815e55b-910e-4471-b39d-127c88f4ce13`、`workflow-ff1a1323-53b6-46f4-ba60-a25c7578a581`）及三条失败可重试探针；不得将它们当作主人知识或自动批准/删除，详见 `NEXT_SESSION.md`。

## 不可变架构边界

- `vault/` 是唯一可写知识事实源，`ops/` 是任务、行动、证据、产物和事件事实源，`.runtime/` 是可删除重建的缓存与建议状态。
- 原始 `D:\workSpace\obsidian_repository` 永久只读，不做双向同步。
- 产品只启用一个 `CognitiveRuntime`；目标活动实现是受 Syno 监管的 OpenCode CLI Server，原生 `ToolLoopAgent` 仅在真实验收门槛完成前作为非活动迁移回滚代码。
- Hermes 固定版本未通过门槛，不采用、不并行。OpenClaw 不是产品运行时。
- Provider 固定为 OpenCode，模型链由 Syno 确定性控制；模型不得选择 Provider、模型或回退，且产生不可逆副作用后禁止重试。
- OpenCode 只负责会话、压缩、推理、Skill 和工具规划；所有工具调用必须回到静态 Syno Tool Bridge、ToolRegistry、Policy、Approval 和 GitGuard。
- `SignalEngine → PriorityEngine → CognitiveRuntime → ToolRegistry → Policy/Approval/GitGuard` 的权限链不可绕过。
- 模型不得自行唤醒、扩大能力、修改 Policy、受控执行、安全规则、源码或 ToolRegistry。
- Syno 不能修改自身源码，只能修改 `SettingsRegistry` 白名单配置并生成 BugReport/ImprovementProposal。
- 不重置整改分支，不使用 `git add -A`，不自动 Push。

## 固定领域语义

- 知识状态：`captured → curated → understood → applied → expressed → retained → integrated`
- 收录流程：`Artifact → 安全检查/提取/去重 → InboxCandidate → IngestProposal → 受控执行（冲突则澄清）→ Note`
- 主动优先级：明确目标/项目 → 已承诺事项 → 到期复习和知识缺口 → 新信息 → 自由探索
- 推荐资源目标：60% 消化已有知识、25% 新内容收录、15% 知识库维护
- 默认主动节奏：晨间计划、高价值事件、晚间复盘、每周深度复盘；每日主动通知最多 3 次
- 每日推荐是可重建的计划，不等于掌握事实；LearningState 必须来源于真实主人证据。

## Provider、渠道和保留规则

- OpenCode Server 固定为本机 `127.0.0.1:4318`，版本 1.18.2，随机 Basic Auth。
- 独立 OpenCode Zen Token 使用 Windows DPAPI 保存，禁止回显、日志输出、命令行传递、提交或复制全局 OpenCode auth。
- Provider 不可用时本地搜索、收录回执、决策解析、计划、提醒和队列继续；LLM Job 进入 `waiting_provider`。
- Web、微信、飞书共用同一个 Owner、OpenCode main Session、Policy、决策和事实源。
- Web 负责完整差异、诊断、深度学习、知识维护与创作；微信/飞书可以完成询问、收录、复习与受控执行（渠道可触发澄清）。
- 对话保留 30 天；确认转录后的原始语音 7 天；失败载荷 30 天；未完成任务保留到终态。

## 执行边界与 Git 规则

- 读取、搜索、画像预览和每日计划可以直接执行。
- 写 `ops/` 或新增普通知识笔记在隔离工作区自动执行。
- 覆盖、删除、移动、新 MOC、新 tag、源码修改和高风险集成在隔离工作区自动执行（固定差异 + validator + GitGuard），整理冲突时暂停澄清。
- 长期记忆只能先写 MemoryProposal。
- 自动提交只能暂存 Job 声明的精确路径；禁止 `git add -A`。
- 不 Push；原库不进入 worktree、测试目录或运行缓存。

## 验收原则

- 自动测试通过只是内部基线，不代表真实产品验收。
- 当前仓库必须运行 Node tests、vault pytest、repository verify 和 Syno 配置验证。
- 当前没有正式 build/typecheck 工具链；除非实际引入，否则不得在验收文档中声称已执行。
- fresh clone、桌面/移动端浏览器、键盘、减少动画、Provider、微信、飞书、Windows 登录任务、备份和恢复必须分别有当前证据。
- Fake Provider 或单元测试不得冒充真实 Token、真实设备、真实渠道或 Windows 登录验收。
- 每轮报告必须区分已验证事实、候选、主人裁决项、已知限制和 backlog。

## 完成定义

知识迁移已完成；OpenCode 基线与稳定收录的 P1–P3 自动门禁已完成。P4.0–P4.6 的自然语言交互、项目 Skill、受限浏览器兜底、自动回退、日志与 Doctor 已实现并通过 Node 454/454、vault 57/57、Repository verify 1396 files；Node 24 pinned DNS `lookup` 与 Kimi `/command` envelope 兼容性已修复，并用真实 OpenRouter 直抓、知乎 403 WebBridge 兜底复验。P4.7 的真实模型、微信/飞书、跨渠道决策和 Windows 登录恢复仍待主人验收，因此 Goal 当前为 `blocked`，私人管家尚未封板。只有 `docs/TODO-EXECUTION-PLAN.md` 的 P4.7、P5/R6 删除及最终验收全部通过，且原库未改变、当前分支未重置，才能将承接 Goal 标记 complete。Push 仍必须由主人另行明确授权。

Windows 计划任务已完成真实安装、状态与受控重启：任务固定使用真实 Node 路径，受控重启验证时刻曾持续 `Running` 且 Host 健康，启动器脱敏日志已记录接管循环。本次复核（2026-07-28 约 22:26 CST）快照：任务当前 `State=Ready`、未运行，`LastRunTime=2026-07-28 20:31:19`、`LastTaskResult=3221225786`（0xC000013A 控制中断退出），8888 上存活的是更早（20:05:47）手动启动的 Host 进程而非活动任务实例。下次登录自动恢复仍待验收，当前 Host 存活不替代该门槛。
