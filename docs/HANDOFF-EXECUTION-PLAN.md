# Syno 主动式知识闭环管家：长期执行纲要

更新日期：2026-07-28（Asia/Shanghai）

本文维护长期产品目标、架构边界和迁移历史摘要。OpenCode 重构的唯一详细任务、公共接口、R0–R6 阶段顺序和验收门槛位于 `docs/TODO-EXECUTION-PLAN.md`；当前执行断点位于根目录 `NEXT_SESSION.md`。旧 P0–P5 计划仅保存在 `docs/archive/`。

> 当前执行状态以 `docs/TODO-EXECUTION-PLAN.md` 与根 `NEXT_SESSION.md` 为准；历史验收不替代 OpenCode R5 的真实模型、渠道和 Windows 恢复证据。

## 产品目标

Syno 是 Windows 本地、单用户、主动式且可审计的知识闭环私人管家：

`输入收录 → 整理关联 → 理解学习 → 复习实践 → 创作输出 → 反馈更新`

Syno 负责降低整理成本、维护知识库、发现学习缺口、安排复习并推动输出，但不能替主人假装掌握。只有主人亲自口述、打字、答题或实践形成的 `LearningEvidence` 才能提高掌握度；AI 草稿只能提供脚手架、提纲、追问和反馈。

## 当前阶段

- 原知识库单向迁移已经完成，迁移管道、审批、GitGuard 和审计记录已落地。
- OpenCode 重构固定起点为 `f0333f3`，实现提交为 `5890dad`。
- R0–R4 的代码与自动化接缝已经完成；Windows 任务 XML 加固后的当前结果为 Node 375/375、vault 57/57、Repository verify 1359 files。
- 主人已授权将全局 OpenCode 配置中的可用凭据一次性迁入 Syno DPAPI，产品不会自动读取全局 `auth.json`。当前产品尚未封板：真实模型提示注入、跨渠道计数、OpenCode 重启恢复和 Windows 登录恢复仍属 R5 门槛。
- R6 删除旧实现严格未开始。

## 迁移历史摘要

- 原库 inventory HEAD：`883fbf5c457156805b9e9b53358175ce84940b59`，inventory 前后保持 19 个 dirty entries；原库未被 Syno 写入。
- content Job `job-20260720-01b25db9` 成功，合并提交 `1631c23`。
- integration Job `job-20260721-f9be2d0b` 成功，合并提交 `824a317`。
- 后续 `job-20260721-c0f18eba`、`job-20260721-eb7deddc` 已完成；`job-20260721-e4501b3d` 保留失败审计。
- Windows ENAMETOOLONG 和非 ASCII pathspec 问题已通过 stdin NUL pathspec 与确定性 porcelain 解析修复，不得退回长命令行暂存。
- 32 篇 LangGraph.js 教程由 `b79d2e5` 主动移除。
- 4 个同路径冲突固定 keep-syno，只保留 Proposal；5 个敏感或缺失项固定排除，除非主人明确重新提交。
- 两个相同 SHA-256 的 Anthropic 收录候选仍等待主人裁决，不得自动重复收录。

## 不可变架构边界

- `vault/` 是唯一可写知识事实源，`ops/` 是任务、行动、证据、产物和事件事实源，`.runtime/` 是可删除重建的缓存与建议状态。
- 原始 `D:\workSpace\obsidian_repository` 永久只读，不做双向同步。
- 产品只启用一个 `CognitiveRuntime`；目标活动实现是受 Syno 监管的 OpenCode CLI Server，原生 `ToolLoopAgent` 仅在真实验收门槛完成前作为非活动迁移回滚代码。
- Hermes 固定版本未通过门槛，不采用、不并行。OpenClaw 不是产品运行时。
- Provider 固定为 OpenCode，模型链由 Syno 确定性控制；模型不得选择 Provider、模型或回退，且产生不可逆副作用后禁止重试。
- OpenCode 只负责会话、压缩、推理、Skill 和工具规划；所有工具调用必须回到静态 Syno Tool Bridge、ToolRegistry、Policy、Approval 和 GitGuard。
- `SignalEngine → PriorityEngine → CognitiveRuntime → ToolRegistry → Policy/Approval/GitGuard` 的权限链不可绕过。
- 模型不得自行唤醒、扩大能力、修改 Policy、审批、安全规则、源码或 ToolRegistry。
- Syno 不能修改自身源码，只能修改 `SettingsRegistry` 白名单配置并生成 BugReport/ImprovementProposal。
- 不重置整改分支，不使用 `git add -A`，不自动 Push。

## 固定领域语义

- 知识状态：`captured → curated → understood → applied → expressed → retained → integrated`
- 收录流程：`Artifact → 安全检查/提取/去重 → InboxCandidate → IngestProposal → 主人批准 → Note`
- 主动优先级：明确目标/项目 → 已承诺事项 → 到期复习和知识缺口 → 新信息 → 自由探索
- 推荐资源目标：60% 消化已有知识、25% 新内容收录、15% 知识库维护
- 默认主动节奏：晨间计划、高价值事件、晚间复盘、每周深度复盘；每日主动通知最多 3 次
- 每日推荐是可重建的计划，不等于掌握事实；LearningState 必须来源于真实主人证据。

## Provider、渠道和保留规则

- OpenCode Server 固定为本机 `127.0.0.1:4318`，版本 1.18.2，随机 Basic Auth。
- 独立 OpenCode Zen Token 使用 Windows DPAPI 保存，禁止回显、日志输出、命令行传递、提交或复制全局 OpenCode auth。
- Provider 不可用时本地搜索、收录回执、审批解析、计划、提醒和队列继续；LLM Job 进入 `waiting_provider`。
- Web、微信、飞书共用同一个 Owner、OpenCode main Session、Policy、审批和事实源。
- Web 负责完整差异、诊断、深度学习、知识维护与创作；微信/飞书可以完成询问、收录、复习以及严格绑定的单/双审批。
- 对话保留 30 天；确认转录后的原始语音 7 天；失败载荷 30 天；未完成任务保留到终态。

## 审批与 Git 规则

- 读取、搜索、画像预览和每日计划可以直接执行。
- 写 `ops/` 或新增普通知识笔记需要一次审批。
- 覆盖、删除、移动、新 MOC、新 tag、源码修改和高风险集成需要固定差异与两次审批。
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

迁移与 OpenCode 自动化重构已完成，但私人管家尚未封板。只有 `docs/TODO-EXECUTION-PLAN.md` 的 R5 真实门槛和 R6 删除/最终验收全部通过，且原库未改变、当前分支未重置、远端未 Push，才能将全局 Goal 标记 complete。
