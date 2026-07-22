# Codex 新对话交接（2026-07-21）

## 新对话第一句话

> 完整读取根 `AGENTS.md`、`NEXT_SESSION.md` 和 `docs/TODO-EXECUTION-PLAN.md`。先核对分支、HEAD、工作树、Host、渠道和 Windows 登录任务，再从 TODO 的当前断点继续。不要修改原 Obsidian 库，不要预创建 LearningState，不要绕过 Policy，不要 reset，不要 Push。

## 权威入口

- 下一阶段唯一详细计划：`docs/TODO-EXECUTION-PLAN.md`
- 长期产品目标、架构边界和迁移摘要：`docs/HANDOFF-EXECUTION-PLAN.md`
- 若本文与 TODO 的下一阶段任务冲突，以 TODO 为准；本文只记录当前断点。

## 当前可信状态

- 仓库：当前 checkout 根目录
- 分支：`codex/round3-remediation`
- 固定起点：`b79d2e5 chore(vault): remove LangGraph.js tutorial series (32 files)`
- 当前工作树 clean：P0–P4 实现 + 三轮审查修复已按精确路径分提交（基线 `b79d2e5` 之上）。新会话必须重新运行 `git status --short --branch` 与 `git log --oneline -8`，不得把本文状态当作永久事实。
- 本轮未 Push（遵循约束）。
- Syno `vault/`：512 个受 Git 跟踪的 Markdown。
- 原库：555 个受 Git 跟踪的 Markdown，HEAD `883fbf5c457156805b9e9b53358175ce84940b59`，已有 19 项用户修改；永久只读。
- 当前验证：Node 239/239（含渠道容错 + P4 proactive + backlog 推进 5 例）、vault pytest 57/57、Repository verify 1139 files。
- 4317 Host 健康；Provider 已配置；微信和飞书均显示 running、available、ownerBound。
- Windows 登录任务：installed=true、startup=at_logon、running=false、lastTaskResult=4294967295，尚未通过常驻验收。
- 未 Push。

## 已完成

- R3-0 可信基线、Policy、审批、GitGuard、固定 Provider、Native CognitiveRuntime、Web 五区、微信和飞书渠道已完成首轮实现与多轮加固。
- 原知识库 content 迁移已由 `job-20260720-01b25db9` 完成并合并为 `1631c23`。
- integration 迁移已由 `job-20260721-f9be2d0b` 完成并合并为 `824a317`。
- 后续迁移 `job-20260721-c0f18eba`、`job-20260721-eb7deddc` 已完成；`job-20260721-e4501b3d` 保留失败审计。
- GitGuard 的 Windows 长路径与非 ASCII pathspec 问题已修复，关键提交包括 `e8cc714`、`a614605`。
- Claim Job `job-20260720-3168722f` 已完成；对应 Claim 仍缺少 Evidence，保持候选而非已验证事实。
- 32 篇 LangGraph.js 教程已由 `b79d2e5` 主动移除。

### P0–P4 本轮完成

- P0：知识画像重构为 inspect/latest/persist 三接口，v2 契约含 scope/excludedSystemNotes，API 返回 freshness。
- P1：DailyKnowledgePlan + DailyAction 契约，KnowledgeLoopPlanner.planDay() 实现，GET /api/syno/learning/plan/today 端点。
- P2：TodayService 集成 planner，所有 item 含 typed action (area/intent)，Goal=0 引导提示，suggestedLearning/dueReviews 分离。
- P3：KnowledgeMaintenanceSource 增强——vault fingerprint 缓存键、7 天冷却、主题轮换、每日最多 1 个维护、周摘要。
- P4：planner 集成 OutputOpportunity；ProactiveOrchestrator 主动渠道核心补全（weekly→weeklySummary、渠道定向含微信/飞书、allocation bug 修复），详见「本次会话补全」。

## 尚未完成

1. P5：主人裁决、Windows 常驻验收、浏览器、真实渠道和备份恢复。（三轮审查已完成，见下；fresh clone 见阶段三）
2. ~~全局 Goal 需通过 goals.create Job + 审批创建~~ 已创建：`goal-643fb7fc`（focusAreas 校准为 vault 实际 snake_case tag：ai_coding/coding_agent/harness/context/loop_engineering/ai_philosophy/ai_career/ai_evaluation；title 曾因 curl 中文编码乱码已直接修文件）。planner 已引用并选中 AI Agent Development 笔记（plan/today 验证通过）。
3. ~~fresh clone 本地回归验证~~ 已完成（阶段三）：本地路径 clone 到 `D:\tmp\syno-clone-test`（HEAD `d90b503` 与原仓库一致，未 push），`pnpm install --frozen-lockfile` 81 包 833ms，`pnpm verify` 1131 files，Node test 233/233，`pytest vault/tests` 57 passed，`node --check` planner/today/profile 通过。证据证明提交后 HEAD 可干净复现。

## 三轮审查（阶段二，已完成）

- 第 1 轮（Profile/Planner/契约，deep/architecture）：[Required] inspect 把全部 notes(含 searchable=false 系统笔记)传入 topics/sources/stability/reliability/deadLinks，违反约束 2 → 已修(inspect 改用 searchableWithMarkdown；deadLinks from 用 searchable、existing 用全部避免误报；summary mocCount/tags 用 searchable；notes 字段保留总数作对比) + 防回归测试。提交 ba98cc4。
- 第 2 轮（Today/Capture/维护，deep/general）：[Required] items(priorities) 把 claim-review/ingest-pending/output-opportunity 信号统一映射为 news，违反约束 3.3，且 ACTION_MAP 缺 claim → 已修(SIGNAL_KIND_TO_ACTION 映射 signal.kind 到 ACTION_MAP key；ACTION_MAP 补 claim→knowledge/review-claim) + 防回归测试。提交 ecc4846。
- 第 3 轮（Standards/安全/运行/交付，deep/security）：0 Required。pnpm verify 1131 files、.runtime 入 gitignore、文档未虚假宣称 build/typecheck、Provider 无 fallback 未改、路径遍历/注入/错误降级均通过。

### [Optional] backlog（未阻塞，后续可处理）

> 2026-07-22 已完成 6 项：planner allocation 语义文档化、loadExistingPlan 取最新、planner profile 死依赖删除、weeklySummary 缓存复用、recordRecommendation 去重、morning/evening 内容分化。详见「本次会话补全（backlog 推进）」。

- **DailyAction `$ref` 去重**（已评估，需独立工单）：`daily-knowledge-plan.schema.json` 的 items 与独立 `daily-action.schema.json` 字段重复。但 `schema-registry.mjs` 的 `validateValue`（L15-46）是手写递归校验器，**不解析 `$ref`**——若 items 改 `$ref`，会被当成无 type/properties 的空 schema 跳过校验，导致 items **静默失校验**。正确做法需先给 registry 加 `$ref` 解析 + loadContract 依赖预加载，作为独立工单。
- profile `#withMarkdown` 依赖全局 PATHS.repoRoot，建议注入 repoRoot 与 opsRoot 对齐。
- cadence 默认 balanced=2，周日 morning+evening+weekly 三任务会撞限额（考虑固定日程走独立配额）。
- SignalEngine 时间阈值（≥8/≥21）vs 精确 8:30/22:00；weekly 无小时门槛。

## 本次会话补全（渠道容错 + P4 主动渠道 + dead config 清理 + Goal）

- **渠道容错**（`c4f0027`）：`initialize` 的 `channels.start()` 改后台运行 + `ChannelHub.start` 用 `Promise.allSettled`，渠道（微信/飞书）WebSocket 握手超时不再阻塞 `synoReady`/Web API——`/api/syno/*` 在渠道离线时仍可用，`channelRecoveryTimer` 周期重试。
- **P4 主动渠道核心补全**（`4445c05`）：weekly signal 调 `maintenance.weeklySummary()`（之前 0 引用）；`channels.send` 定向含微信/飞书；`localMessage` 加 `text` 字段（微信/飞书丢弃 title）；修 `allocation.capture→ingest` bug。
- **dead config / 死模块清理**（`8a3c3d3` + `dc7b000`）：删 `config/channels.json`、`config/executors.json`、`config/schedule.json`（全 0 引用）+ `scheduler.mjs`（legacy 死模块）+ ARCHITECTURE legacy 声明 + Scheduler 测试。
- **全局 Goal 创建**：`goal-643fb7fc`（见上）。

## 本次会话补全（backlog 推进，3 批）

- **morning/evening 主动通知分化**（`b44a6cf`）：`localMessage` 按 signal.kind 分化——晨间突出 plan.allocation（消化/收录/维护预算）+ primary；晚间突出 progress（已完成/待确认）+ 前 2 到期复习；event/weekly 保持。缺字段回退优先行动。新增测试 2 例。
- **维护源缓存复用 + 去重**（`b589f27`）：抽取 `#orphansForCurrentVault`，inspect 与 weeklySummary 共享 fingerprint 缓存，跳过重复全量读盘；`recordRecommendation` 按 path 去重（覆盖非追加）防 history 膨胀。新增测试 2 例。
- **planner 正确性 + 清理**（`9a388b6`）：`loadExistingPlan` 按 generatedAt 降序取最新（避免 readdir 顺序返回旧计划）；删 planner profile 死依赖（+ runtime 实例化 + test setup 同步）；allocation 三键语义文档化（注释 + 契约 description）。新增测试 1 例。
- 全量 239/239，verify 1139 files，未 push。

## 架构发现（避免下次重复探索）

- **定时调度由 `ProactiveOrchestrator` + `SignalEngine` 承担**（`runtime.mjs` L263 实例化、L308 worker 模式 `start`），**不是 `Scheduler` 类**（已删）。`runtime.scheduler` 字段是 `proactive` 的别名，与 Scheduler 类无关。晨间/晚间/周复盘主动通知已在 web/windows 触发；本次补全让 weekly 调 weeklySummary + 渠道含微信/飞书。
- **`config/` 目录只有 `vault-contract.json` 是活的**（`validator.mjs:103` 读）。`channels.json`/`executors.json`/`schedule.json` 都曾是无引用死配置（已删）。PATHS 无 configRoot，config 不被遍历加载。
- **渠道发送**：`ChannelHub.send` 默认 `targets=[web, windows, homeChannel]`（不含微信/飞书）；微信/飞书 adapter 用 `text||body`（丢弃 title），故主动消息须带 `text` 字段自包含。
- **allocation 字段**：`PriorityEngine.allocate` 返回 `{digest, ingest, maintenance}`（无 capture）。
- **KnowledgeStore 默认 indexFile 在 `.runtime/knowledge-index-v1.json`**（非 `vault/.index.json`）；测试/脚本若误用 `vault/.index.json` 会污染工作树触发 GitGuard。
- **渠道间歇超时**：微信/飞书 WebSocket 握手对网络/服务波动敏感，偶发 15s 超时；非持久故障，Host 已容错（渠道降级、API 不阻塞）。

## 当前待主人裁决

- 两个正文 SHA-256 相同的 Anthropic MD IngestProposal：保留其一或继续搁置，不自动重复收录。
- 4 个同路径冲突继续 keep-syno：
  1. `vault/01-Areas/AI Agent Development/04-Context Engineering/4-5 Just-In-Time Context.md`
  2. `vault/02-Resources/AI and Agents/Agent Design & Patterns/Spec Kit vs OpenSpec vs Superpowers - CCC.md`
  3. `vault/02-Resources/AI and Agents/Authors/CCC.md`
  4. `vault/02-Resources/AI and Agents/Authors/ConardLi.md`
- 5 个固定排除项继续保持排除：两篇敏感凭据课程、两篇敏感凭据资源、一个源工作区缺失附件；精确路径保存在迁移 Manifest 和审计记录中。
- 1 个无证据 Claim：补证、降级或继续保持 candidate。

## 完成定义

迁移完成不等于产品 Goal 完成。只有 TODO 的 P0–P5 全部完成，并取得当前 checkout 的三轮审查、fresh clone、Web、Provider、微信、飞书、Windows 和备份恢复证据后，才能将全局 Goal 标记 complete。
