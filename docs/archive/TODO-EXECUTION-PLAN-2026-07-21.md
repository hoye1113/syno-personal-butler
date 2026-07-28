# Syno 主动知识闭环：P0–P5 历史执行计划

更新日期：2026-07-21（Asia/Shanghai）

本文是迁移完成后的 P0–P5 执行计划的**历史归档（2026-07-21 快照）**。`NEXT_SESSION.md` 维护当前执行入口，`docs/OUTSTANDING-WORK.md` 维护 2026-07-24 起的现状与断点，`docs/HANDOFF-EXECUTION-PLAN.md` 维护长期目标、架构边界和历史摘要。

> ⚠️ **状态指针（2026-07-24 补）**：本文 §1 的数字均为 **07-21 快照，已被超越**——Node `205/205`→`298/298`、verify `1125`→`1227`、`Goal 0`→已建 `goal-643fb7fc`、画像"539 篇过期"→已 v2 重构、Windows `running=false`/`4294967295`/`4317`→常驻验收已过（`8888`、`running=true`、`lastResult=267009`）、"两个 SHA 相同的 Anthropic 候选"→已删剩 1 个（且"SHA 相同"已证伪）、P2 Capture L166 同源已删。**冲突时以 `docs/OUTSTANDING-WORK.md` + `git log` 实跑为准，不再以本文为准。** P0–P5 正文保留作执行计划档案与设计意图参考。

## 1. 当前可信基线

- 仓库：`D:\workSpace\syno-personal-butler`
- 分支：`codex/round3-remediation`
- 固定起点：`b79d2e5 chore(vault): remove LangGraph.js tutorial series (32 files)`
- 当前工作树不是 clean：`NEXT_SESSION.md`、`docs/HANDOFF-EXECUTION-PLAN.md` 已修改，本文为未跟踪文件；这些是计划文档工作，不得丢弃。
- 当前 Syno `vault/` 有 512 个受 Git 跟踪的 Markdown；原库有 555 个受 Git 跟踪的 Markdown；差值为 43。
- 原库 HEAD：`883fbf5c457156805b9e9b53358175ce84940b59`，已有 19 项用户修改；原库永久只读。
- 当前验证：Node 205/205、vault pytest 57/57、Repository verify 1125 files。
- Provider 已配置为固定 `AIPC-deepseek-v4-flash`；微信和飞书均显示 running、available、ownerBound。
- Windows 登录任务显示 installed=true、startup=at_logon，但 running=false、lastTaskResult=4294967295；当前 4317 Host 健康不等于登录任务验收通过。
- 当前领域数据：Goal 0、LearningState 0、LearningEvidence 0、OutputOpportunity 0。
- 当前待处理数据：两个正文 SHA-256 相同的 Anthropic 收录候选；4 个 keep-syno 冲突 Proposal；5 个固定排除项；1 个无证据 Claim。
- 最新持久化知识画像已过期：仍统计 539 篇并包含已删除的 LangGraph 系列，禁止直接用于学习或输出初始化。

迁移本身已经完成；当前未完成的是“目标驱动的每日规划、用户学习证据、复习、输出、维护轮换和主动渠道”组成的产品闭环。

## 2. 已完成且不得回退

- content 迁移：`job-20260720-01b25db9`，合并提交 `1631c23`。
- integration 迁移：`job-20260721-f9be2d0b`，合并提交 `824a317`。
- 后续迁移 Job：`job-20260721-c0f18eba`、`job-20260721-eb7deddc` 已完成；`job-20260721-e4501b3d` 保持失败审计。
- GitGuard 已使用 stdin NUL pathspec 处理 Windows 大批长路径；不得退回命令行拼接所有路径。
- 原始 Obsidian 仓库永久只读，不写缓存、不格式化、不清理、不提交、不双向同步。
- `vault/` 是唯一可写知识事实源，`ops/` 是任务、证据和产物事实源，`.runtime/` 只保存可删除重建的状态。
- 原生 `ToolLoopAgent` 是唯一活动 `CognitiveRuntime`；Hermes 不进入当前产品运行时。
- 固定单一 Provider 和 Model ID，无自动 Provider/模型切换或 fallback。
- AI 草稿不能提高掌握度；只有主人自己的口述、打字、答题或实践可以成为 `LearningEvidence`。
- Syno 不能修改自身源码，只能调整 `SettingsRegistry` 白名单配置并生成 BugReport/ImprovementProposal。
- 禁止 `git add -A`、自动 Push、重置整改分支或丢弃用户修改。

## 3. 关键设计修正

### 3.1 每日推荐与掌握状态分离

`LearningState` 表示主人接受过真实测试后的掌握事实，契约要求 `lastTestedAt` 和 evidence refs。迁移笔记尚未测试，不能为了进入队列而伪造掌握状态。

新增可重建的 `DailyKnowledgePlan` 和 `DailyAction`：

- 每日计划只说明“今天建议做什么、为什么、从哪里进入”。
- 每日计划保存在 `.runtime/`，不写入 mastery、lastTestedAt 或虚构 evidence。
- 主人完成输出并通过审批后，现有 `LearningService.record()` 才创建 LearningEvidence、LearningState 和下一次复习时间。

### 3.2 画像计算与画像持久化分离

- `inspect()`：只读计算当前画像，不写文件。
- `latest()`：读取最近一次持久化画像并返回 fresh/stale。
- `persist()`：通过既有 `knowledge.profile.generate` Job 和审批写入 `ops/knowledge/profiles/`。
- Profile v2 只统计可搜索的个人知识；协议、审计、测试和 Skill 模板不得污染主题、来源、稳定性、可靠性、死链或过期统计。

### 3.3 Today 返回可执行动作

后端必须返回明确的 `area + intent + ref`，前端不再把多种信号压成通用 `news` 后猜测跳转位置。

固定映射：

| 信号 | area | intent |
|---|---|---|
| ingest-pending | capture | review-ingest |
| claim-review | knowledge | review-claim |
| output-opportunity | create | continue-output |
| knowledge-maintenance | knowledge | review-maintenance |
| review | learn | start-review |
| goal | today | view-goal |
| commitment / approval | approvals | view-job |

## 4. 固定执行顺序

`P0 可信基线 → P1 Goal/Planner → P2 Today/Capture/Learn → P3 维护/周复盘 → P4 Create/主动渠道 → P5 封板`

每阶段先写失败测试，再实现最小闭环，再运行针对性测试；阶段完成后才进入下一阶段。需要审批时输出精确差异和 changed paths，批准后从断点继续。

## 5. P0：恢复可信产品基线

### 实施

1. 修正文档和运行状态中的数量、HEAD、工作树、画像 freshness 与 Windows 状态。
2. 将知识画像重构为 inspect/latest/persist 三个语义接口。
3. 扩展知识画像契约为 v2：标记 `scope: personal-knowledge`，保留个人笔记数、可搜索数和被排除系统笔记数。
4. `GET /api/syno/knowledge/profile/latest` 返回 `profile`、`fresh`、`currentVaultFingerprint`、`excludedSystemNotes`。
5. fingerprint 不一致时，Web 显示“画像需要重新生成”，Planner 拒绝消费旧画像。
6. 对 43 个源库/目标库差异形成确定清单：32 个主动删除、5 个固定排除、4 个 keep-syno 冲突和剩余差异，不再使用“其他”作为长期描述。
7. 对 Windows 登录任务执行只读诊断，输出任务定义、PID/launcher、last result 和 4317 进程归属；本阶段不修改 Task Scheduler。

### 验收

- 新画像不包含已删除的 LangGraph 系列。
- 系统协议、审计和 Skill 模板不进入个人质量统计。
- latest 能区分 fresh/stale，旧画像仍可审计但不能驱动计划。
- 文档、Git、Profile 和运行 API 的数字一致。
- 原始 Obsidian 仓库 HEAD、dirty entries 和文件哈希未变化。

## 6. P1：全局 Goal 与 KnowledgeLoopPlanner

### 全局 Goal

通过现有 `goals.create` Job 和一次审批创建：

- title：`把 AI、Agent、AI Coding、工程实践、人生哲理与未来趋势转化为可解释、可应用、可输出的个人能力`
- status：`active`
- priority：`100`
- focusAreas：`AI`、`Agent`、`AI Coding`、`工程实践`、`人生哲理`、`未来趋势`

### 新深模块

建立唯一规划接口：

```text
KnowledgeLoopPlanner.planDay(context)  -> DailyKnowledgePlan
KnowledgeLoopPlanner.planWeek(context) -> WeeklyKnowledgePlan
```

`DailyKnowledgePlan` 至少包含：

- id、ownerId、localDate、generatedAt、vaultFingerprint
- goalRefs、capacity、allocation、items

`DailyAction` 至少包含：

- id、kind、title、reason、priority
- area、intent、ref、status
- 可选 dueAt

### 选择规则

优先级固定为：

1. 活跃目标和明确项目。
2. 已承诺事项与待审批工作。
3. 到期复习。
4. 与目标相关但尚未验证的知识。
5. 输出所需的知识缺口。
6. 新收录候选。
7. 少量知识维护和自由探索。

- 每日容量默认 5。
- 60% 消化、25% 收录、15% 维护使用滚动 20 个推荐槽实现为 12/5/3；明确目标、承诺和到期复习可覆盖比例。
- 某一类无候选时，空余容量优先回填已有知识消化。
- 相同 owner、localDate、vaultFingerprint、Goal 和设置下结果必须幂等。
- Goal、Vault 或相关设置变化后计划失效并重算。

### 公共接口

- `GET /api/syno/learning/plan/today`
- `GET /api/syno/learning/plan/week`

### 验收

- 同日重复读取结果一致。
- 计划生成不创建 LearningState、LearningEvidence、Goal 或知识笔记。
- 到期复习和活跃 Goal 始终高于自由探索。
- Provider 离线时仍能生成确定性本地计划。

## 7. P2：Today、Capture 与 Learn 动作闭环

### Capture

- 新增 `GET /api/syno/intake/pending`。
- 展示所有待确认 Artifact/Proposal，而不是只轮询刚上传的单个 Artifact ID。
- 两个相同 SHA-256 的 Anthropic Proposal 分组展示，提供“保留其一/暂不处理”的主人决策入口，不自动合并或删除。
- 最近收录中的项目可以打开对应方案详情和审批入口。

### Today

- primary、needsYou、recentIntake 都返回 typed action。
- 每个可操作项目必须可点击并进入对应对象。
- Goal 为 0 时显示“告诉 Syno 你最近最想掌握什么”，而不是用孤岛维护填满首屏。
- 健康状态只在异常时展开，Windows 登录任务异常需要可见但不得覆盖更高优先级承诺。

### Learn

- 分开展示“今天建议学习”和“到期复习”。
- 每项显示推荐原因、关联 Goal、来源与质量状态。
- `开始复习` 打开实际知识内容和 Teach-back/打字/实践入口。
- 主人提交至少 20 字原始输出后，继续使用既有审批、LearningEvidence 和 LearningState 语义。

### 验收

- 所有 Today kind 都进入正确 area 和对象。
- 从 Today 到学习证据审批、状态更新、下一次复习形成端到端闭环。
- AI 提纲和空白提交不能更新 mastery。
- 空、加载、错误、禁用、键盘焦点和 390×844 布局均可用。

## 8. P3：知识维护轮换与周度复盘

### 实施

- KnowledgeMaintenanceSource 使用 vault fingerprint 作为缓存键。
- 同一普通问题 7 天内不重复推荐。
- 按主题轮换，避免固定展示相同的前 N 个孤岛。
- 每日最多一个普通维护行动；安全问题或明确损坏除外。
- 大批孤岛、死链、缺少来源和时效候选进入周度摘要。
- 推荐历史复用 `.runtime` 通知状态，不另建知识或用户记忆事实源。
- 周度摘要默认只读；主人选择保存时才通过一次审批写入 `ops/`。
- 维护候选只提出建议，不自动创建链接、标签、MOC 或覆盖笔记。

### 验收

- 连续 7 天不重复普通维护项。
- 主题可以轮换，重启后冷却语义仍成立。
- 维护项不会压过 Goal、承诺、审批和到期复习。
- 周摘要与当前画像一致且不含系统噪声。

## 9. P4：Create 输出闭环与主动渠道

### 实施

- 基于 Goal、DailyKnowledgePlan、用户学习证据和知识缺口生成一个首要 OutputOpportunity。
- 首期优先 AI、Agent、AI Coding 和 Harness 深度文章。
- 输出模板固定要求：自己的解释、小白可懂的例子、实际应用、反方观点、适用边界。
- AI 只能生成提纲、追问和反馈，不写入主人原始输出字段。
- 继续使用现有 OutputOpportunity 接受、草稿、演练、发布、反馈状态机。
- 晨间计划、到期复习和晚间复盘使用同一 DailyAction。
- 微信、飞书只发送摘要、提醒和低风险快捷动作；复杂审批与维护回到 Web。
- 每日主动通知最多 3 次并遵守安静时间。
- Provider 离线时本地计划、搜索、提醒继续；LLM Job 进入 waiting_provider，不切换模型。

### 验收

- 一次主人 Teach-back 能同时留下证据、安排复习并推进输出机会。
- Web、微信、飞书引用同一 Goal、Plan、Job 和知识对象。
- 重复消息、乱序回执和重启不会重复创建事实记录。
- 未经主人输出的 AI 内容不提高掌握度。

## 10. P5：审查、Windows 与最终封板

### 主人裁决

- 两个重复 Anthropic Proposal：保留其一或继续搁置。
- 4 个 keep-syno 冲突 Proposal：合并、忽略或后续手工处理。
- 5 个排除项：保持排除，除非主人清理敏感内容后重新提交。
- 无证据 Claim：补证、降级或保持 candidate，不把候选写成事实。

### 三轮审查

1. Profile、Planner、Policy、契约和数据事实源。
2. Today、Capture、Learn、Create 与跨渠道流程。
3. Standards、Spec、安全、运行、恢复和交付复审。

审查范围分开固定：

- 历史：`e8cc714..b79d2e5`
- 新实现：`b79d2e5..最终 HEAD`

每轮高优先级发现修复后必须重审，最终两个轴均为 0 个未解决高优先级问题。

### Windows

真实修改前展示计划任务精确定义并获得审批。最终必须满足：

- installed=true
- running=true
- startup=at_logon
- lastTaskResult=0
- 登录和异常退出后 4317 自动恢复
- 不自动打开浏览器
- 只存在精确的 Syno 任务，不删除 state、vault、ops 或 credentials

### 完整验证

- `pnpm test`
- `python -m pytest vault/tests`
- `pnpm verify`
- `pnpm --dir apps/syno verify`
- 修改过的 JavaScript 使用 `node --check`
- fresh clone 安装、启动和完整回归
- 桌面与 390×844 浏览器流程、键盘、焦点、减少动画、0 console error/warning
- Provider、微信、飞书真实探针
- Windows 登录、重启和异常恢复
- state backup、verify、空目录 restore

当前仓库没有正式 build/typecheck 工具链；文档不得宣称已执行这两项，除非后续确实引入对应工具。

### 交付

- 每阶段只暂存 Job 或计划声明的精确路径，不使用 `git add -A`。
- 每阶段创建独立本地提交，不 Push。
- 最终生成 Git bundle，记录大小和 SHA-256。
- 最终报告区分：已验证、主人已裁决、候选、已知限制和后续 backlog。

## 11. 阶段完成门槛

| 阶段 | 完成门槛 |
|---|---|
| P0 | 当前画像可信、差异可解释、运行状态与文档一致 |
| P1 | Goal 已批准；每日/每周计划幂等且不伪造掌握状态 |
| P2 | Today 到真实 LearningEvidence 的 Web 闭环通过 |
| P3 | 维护冷却、轮换和周摘要不会刷屏 |
| P4 | Learn/Create/主动渠道共用同一事实与动作语义 |
| P5 | 三轮审查、fresh clone、浏览器、真实渠道、Windows、备份恢复全部有当前证据 |

只有 P0–P5 全部完成，才能将“Syno 原知识库迁移与私人管家封板”Goal 标记 complete。
