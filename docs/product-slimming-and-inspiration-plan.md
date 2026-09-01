# Syno 产品精简与今日灵感执行计划

状态：IN_PROGRESS（Owner 2026-09-01 经 /goal 批准并指示一次性执行完全部任务）
创建：2026-09-01（Asia/Shanghai）

## 1. 方向与范围

Owner 2026-09-01 决策：产品范围收敛为**搜索、收录、深度探索分析、知识库查找、今日灵感**（整合知识库文章产出串联/新观点的"做梦"功能）。学习系统与项目管理不在范围内；`/project` 显式指令被明确认为对主人不好理解，目标是单一自然语言入口。

**保留（产品面）**：搜索/知识库查找（`knowledge.search`/`read_snippet`/`fetch_url`）、完整收录管线、深度探索分析（chat 多轮工具循环 + `web_search`，本期不扩建）、今日工作台 `today.read`（暂留，Phase D 评估是否与灵感合并）、`image.read`、主动推送设施。

**保留（承重结构，不因精简删除）**：Job/PendingDecision 治理链（`jobs.submit` 是唯一受控写入口，`jobs.list` 保留为唯一通用只读运行视图）、ToolRegistry/Policy/GitGuard、Outbox、AcceptedRequest、渠道层与 ChannelConversationHandler 其余职能、DSH 运行时、Settings、claims/evidence 隐藏工具、goals（内部使用）。

**移除（先摘牌、后物理删）**：学习系统（`learning.*`、复习提醒、teach-back）、项目管理（`projects.*`、`/project` 指令、检索 `PROJECT_BOOST`、projectRef 传播）。

## 2. 冻结决策

- **D1 摘牌方式**：只改 `config/deepseek-harness/syno-tool-sets.mjs` 的 `CORE_CHAT_TOOL_NAMES`，移除 `learning.due`、`learning.teach_back`、`learning.submit`、`projects.list`、`projects.create`、`projects.update_status`；源码、schema、vault/ops 历史数据全部保留，完全可逆。
- **D2 学习休眠**：Phase A 同时停止装配 `ReviewReminderSource`（runtime 传入 null；`channel-conversation-handler.mjs` 已验证 null 时回落普通对话），复习提醒与 teach-back 软门随之休眠。不删文件。
- **D3 分支处置**：`feat/project-aware-dsh-phase5` 领先 `main` 34 个提交且 `main` 是其祖先（可 ff，2026-09-01 实测）。Owner 批准后**本地 ff-merge 到 main**（携带 host 自动提交的 ops 运行记录，不丢 Job 事实源），随后各阶段在 `main` 上进行。沿用现规：不 Push。
- **D4 Phase 5 处置**：project-aware 计划的 Phase 5 标记 `SUPERSEDED`（产品方向变更，Owner 主观召回观察不再回填）；`ops/acceptance/project-aware-knowledge-mvp/` 证据原样保留为历史记录。
- **D5 观察期**：摘牌合并后起算 2~4 周（最迟 2026-09-29 复盘）。复盘三选一：物理删除（进 Phase C）/ 恢复暴露 / 部分保留。**只有 Owner 明确复盘结论才允许进 Phase C。**
- **D6 物理移除范围（Phase C，观察期通过后）**：`learning-service.mjs`、`review-reminder-source.mjs`、teach-back 软门与「跳过复习」出口、R4.7 的 LearningCandidate/ReviewOpportunity 生成、learning 相关 Skill 章节；`projects.*` 工具、`project-directive.mjs` 与 handler 内 `/project` 链路、`project-service.mjs` 与 schema、KnowledgeStore `PROJECT_BOOST`、Job/Workflow/Proposal 的 projectRef 传播。vault/ops 历史记录（含 `ops/projects/*.md`）保留只读不删。**同步更新 `scripts/check-active-docs.mjs` 的 required 锚点**（当前强制 `docs/ARCHITECTURE.md`、`docs/POLICY.md` 含 `projects.*`）及这两份文档本身。
- **D7 今日灵感边界**：新 signal source 接入既有 ProactiveOrchestrator（安静时间 22:30–07:30、每日预算 minimal/balanced/active=1/2/3 条不变）；采样=近期收录+久未回访笔记混合；生成走 DSH proactive Session（不占 main Session）；灵感卡片持久化优先复用 OutputOpportunity store 加 `kind` 区分，schema 不兼容则独立 `ops/content/inspirations/` 并在任务 #9 记录决策；Owner 反馈入口为「有用/没用」确定性路由（不过模型）；生成失败遵守终态三件套（终态 + maxAttempts + recordEvent），禁止静默无限重试；不新造调度轮子。
- **D8 停止条件**：任一阶段若需要删除 Job 治理链、改动渠道去重/Outbox 语义、批量改写 vault 历史笔记、或未复盘就物理删除，立即记录 `BLOCKED_SCOPE_DEVIATION` 并暂停回 Owner。
- **D9 用户入口边界加固（Owner 2026-09-01 追加，无需观察期直接执行）**：用户入口只允许更改知识库。物理删除 `code_change` 意图、`policy.allowSelfModify`/`policy.allowSystemControl` 开关与 `windows.service.install/uninstall` 操作注册；Policy 无条件拒绝触及源码根（apps/contracts/config/scripts/tests）的 diff；SettingsRegistry 相关条目同步清除。删除后不存在任何配置能让聊天入口改代码或控制系统。本约束只管产品用户入口，不影响开发 Agent 的人工开发流程。
- **D10 写入根与提交闸门**：Job 中模型可声明的写入路径只允许 `vault/**`；`ops/` 收窄为系统内部固定记录器写入（Job/Workflow/事件记录），不接受模型声明路径。自动提交路径增加结构性硬闸门：只准暂存 `vault/**`、`ops/**`，源码根永不可被产品路径暂存；维持永不自动 Push。
- **D11 仓库拆分（方向已定：拆，Phase E 独立执行）**：代码、知识库、运行记录共用仓库的模糊已实际发作（host 把 ops 记录自动提交到功能分支）。长期主义决策：`vault/` + `ops/` 整体迁出为独立知识仓库，管家只碰知识仓库；代码仓库只留 apps/contracts/config/scripts/tests/docs。Phase E 设计点：vault+ops 合一仓库（最简迁移）；git 历史倾向新起点+旧历史归档 bundle（filter-repo 为备选）；Windows 下 junction 保持 vault 原位透明；cutover 需短暂停 host 冻结写入。因牵动 PATHS/备份/verify/fresh clone/文档，排在摘牌与拆墙完成之后；D10 的提交闸门保留为永久双保险。

## 3. 阶段与退出条件

| Phase | 内容 | 会话任务 | 退出条件 |
|---|---|---|---|
| A 摘牌 | 工具集摘牌 + 学习提醒休眠 + 边界加固（D9/D10）+ 分支 ff-merge + 回归 + 文档同步 | #2~#4、#12、#13 | `pnpm test` 全绿、`pnpm run verify` 通过、NEXT_SESSION/KNOWN-LIMITATIONS/INDEX 同步、Phase 5 关闭记录完成 |
| B 观察 | 2~4 周无学习/项目入口的真实使用，Owner 复盘 | #5 | Owner 明确复盘结论 |
| C 拆墙 | 物理移除学习+项目、`check-active-docs` 锚点更新、三轴复审、封板 | #6~#8 | 全量回归 + fresh clone 通过，Standards/Spec/Security 未解决 P0/P1 为 0，文档封板 |
| D 灵感 | 设计冻结 → 实现 → 真实验收 | #9~#11 | Owner 连续数日收到灵感推送并评价质量后封板 |
| E 拆库 | vault+ops 迁出为独立知识仓库：设计冻结 → 迁移与 cutover → 验证封板 | #14~#16 | 管家全部读写落在知识仓库，代码仓库零产品写入；回归与文档封板 |

`DONE` 定义沿用：代码完成、契约测试通过、全量测试通过、verify 通过、文档同步、阶段验收完成。自动测试、探针与 Owner 真实验收不互相替代。

## 4. 证据与文档规则

- 本计划批准后成为唯一执行事实源；阶段状态、实际修改文件、测试结果、commit hash、Owner 结论与 deferred 只追加到本文件「执行记录」区。
- 每阶段交付必须附：精确暂存路径、`pnpm test` 当轮数字、`pnpm run verify` 当轮输出、`git diff --check` 结果；不沿用历史数字。
- `scripts/check-active-docs.mjs` 的 required 锚点在 Phase C 移除项目时同步更新，不得让 verify 红着进下一阶段。
- 提交按 Job 声明精确路径暂存；禁止 `git add -A`；不自动 Push。

## 5. 执行记录（追加区）

- 2026-09-01：计划起草（DRAFT）。背景：Owner 明确产品方向收敛，学习/项目摘牌待删，Phase 5 Owner 观察 superseded。实证依据：`main` 为 HEAD 祖先（34 commits ahead，可 ff）；`channel-conversation-handler` 的 `reviewReminders=null` 回落路径存在；`check-active-docs.mjs` required 锚点强制 ARCHITECTURE/POLICY 含 `projects.*`；ProactiveOrchestrator 安静时间 22:30–07:30、cadence 预算 1/2/3 条/日。待 Owner 批准。
- 2026-09-01：Owner 追加边界约束（用户入口只允许改知识库；删除 code_change 与自修改开关；写入根收缩；提交硬闸门；知识仓库拆分方向已定），形成 D9~D11 与 Phase E（任务 #12~#16）。
- 2026-09-01：Owner 经 /goal 批准计划并指示**一次性执行完全部任务**。据此：①D5 观察期的复盘结论视为已给出（删除），Phase A 摘牌与 Phase C 拆墙合并为一次物理移除，不再经过"仅摘牌"中间态（奥卡姆：同一子系统不拆两次）；②Phase 5 直接关闭为 SUPERSEDED；③任务 #5 标记为已被 Owner 决策取代。执行顺序调整为：边界加固（#12/#13）→ 移除学习（#6）→ 移除项目（#7，含工具集）→ 封板（#3/#4/#8）→ 灵感（#9~#11）→ 拆库（#14~#16）。
