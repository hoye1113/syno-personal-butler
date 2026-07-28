# Codex 新对话交接（2026-07-24 历史快照）

## 新对话第一句话

> 完整读取根 `AGENTS.md`、`NEXT_SESSION.md` 和 `docs/TODO-EXECUTION-PLAN.md`。先核对分支、HEAD、工作树、Host、渠道和 Windows 登录任务，再从 TODO 的当前断点继续。不要修改原 Obsidian 库，不要预创建 LearningState，不要绕过 Policy，不要 reset，不要 Push。

## ⚠️ 2026-07-24 更新（M1 + 端口修复，读此优先）

后续会话（2026-07-24）已完成 **M1 上下文管理**（HANDOFF/STORE/OBS）+ **host 端口 4317→8888 单一来源**修复：均本地提交（`ddd28b9` code+tests / `6071aec` docs / `eabbbe6` port）、上线、`pnpm test` **298/298**。（本文件下方「240/240」为 07-21 旧值，已过时；分支仍 `codex/round3-remediation`、未 Push。）

**Windows 常驻验收已通过（2026-07-24）**——重启后登录自启确认（task 起 `10:53:43` → node 起 `10:53:58`，ownership `.runtime/syno-host.pid` mode=owned）；但登录时 wrapper（`start-syno.ps1`）以 `0xC000013A` 一次性中断、node 沦为孤儿（父进程已退），故 `health ok` 而 `windows:status running=false`。`pnpm windows:restart` 恢复后 task=`Running`、`lastTaskResult=267009`（= `0x41301` 运行中态）、wrapper 存活、60s 轮询稳定。自愈链确认工作。根因（登录会话初始化竞态）未完全定位，不阻塞。**当前无立即在途动作**；下一个里程碑是 M2（需新会话）。**完整待办见 `docs/OUTSTANDING-WORK.md`**——M2 记忆保真、审批即时反馈+多格式收录（**Phase 1 已实现 `2dc77b8`**、待端到端验收）、deferred 小项都在里头，且全部基于已核实事实。新会话优先读那份。

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
- 当前验证：Node 240/240（含渠道容错 + P4 proactive + backlog 推进 6 例）、vault pytest 57/57、Repository verify 1139 files。
- Host 端口改为 8888（原 4317→6666→8888，6666 被 Chrome unsafe-port 拦截）；Provider 已配置；微信和飞书均显示 running、available、ownerBound。
- Windows 登录任务 "Syno"：LogonTrigger、start-syno.ps1、崩溃重启 999 次/1 分钟、无电池限制；配置正确，**常驻验收已通过（2026-07-24）**——登录时 wrapper 一次性 `0xC000013A`（node 成孤儿），`pnpm windows:restart` 恢复后 task=`Running`、`lastResult=267009`、wrapper 存活、60s 稳定、health ok；自愈链确认工作。**预防加固（2026-07-24）**：LogonTrigger 已加 `Delay=PT30S`（登录后延迟 30s 启动 wrapper，避开会话初始化竞态）——`manage-windows-task.ps1` 用注册后 CIM `Set-ScheduledTask` 注入并已验证持久化；实际效果待下次重启/登录确认。详见 `docs/OUTSTANDING-WORK.md` §2。
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

1. P5：主人裁决、~~Windows 常驻验收~~（已通过 2026-07-24，见顶部更新 + `docs/OUTSTANDING-WORK.md` §2）、浏览器、真实渠道和备份恢复。（三轮审查已完成，见下；fresh clone 见阶段三）
2. ~~全局 Goal 需通过 goals.create Job + 审批创建~~ 已创建：`goal-643fb7fc`（focusAreas 校准为 vault 实际 snake_case tag：ai_coding/coding_agent/harness/context/loop_engineering/ai_philosophy/ai_career/ai_evaluation；title 曾因 curl 中文编码乱码已直接修文件）。planner 已引用并选中 AI Agent Development 笔记（plan/today 验证通过）。
3. ~~fresh clone 本地回归验证~~ 已完成（阶段三）：本地路径 clone 到 `D:\tmp\syno-clone-test`（HEAD `d90b503` 与原仓库一致，未 push），`pnpm install --frozen-lockfile` 81 包 833ms，`pnpm verify` 1131 files，Node test 233/233，`pytest vault/tests` 57 passed，`node --check` planner/today/profile 通过。证据证明提交后 HEAD 可干净复现。

## 三轮审查（阶段二，已完成）

- 第 1 轮（Profile/Planner/契约，deep/architecture）：[Required] inspect 把全部 notes(含 searchable=false 系统笔记)传入 topics/sources/stability/reliability/deadLinks，违反约束 2 → 已修(inspect 改用 searchableWithMarkdown；deadLinks from 用 searchable、existing 用全部避免误报；summary mocCount/tags 用 searchable；notes 字段保留总数作对比) + 防回归测试。提交 ba98cc4。
- 第 2 轮（Today/Capture/维护，deep/general）：[Required] items(priorities) 把 claim-review/ingest-pending/output-opportunity 信号统一映射为 news，违反约束 3.3，且 ACTION_MAP 缺 claim → 已修(SIGNAL_KIND_TO_ACTION 映射 signal.kind 到 ACTION_MAP key；ACTION_MAP 补 claim→knowledge/review-claim) + 防回归测试。提交 ecc4846。
- 第 3 轮（Standards/安全/运行/交付，deep/security）：0 Required。pnpm verify 1131 files、.runtime 入 gitignore、文档未虚假宣称 build/typecheck、Provider 无 fallback 未改、路径遍历/注入/错误降级均通过。

### [Optional] backlog（未阻塞，后续可处理）

> 2026-07-22 已完成 8 项：planner allocation 语义文档化、loadExistingPlan 取最新、planner profile 死依赖删除、weeklySummary 缓存复用、recordRecommendation 去重、morning/evening 内容分化、profile repoRoot 注入、cadence weekly 独立配额。详见「本次会话补全」两轮。

- **DailyAction `$ref` 去重**（已评估，需独立工单）：`daily-knowledge-plan.schema.json` 的 items 与独立 `daily-action.schema.json` 字段重复。但 `schema-registry.mjs` 的 `validateValue`（L15-46）是手写递归校验器，**不解析 `$ref`**——若 items 改 `$ref`，会被当成无 type/properties 的空 schema 跳过校验，导致 items **静默失校验**。正确做法需先给 registry 加 `$ref` 解析 + loadContract 依赖预加载，作为独立工单。
- ~~SignalEngine 时间精度~~（已评估，**非 bug**）：≥hour 阈值（morning≥8、evening≥21）配合 lastRuns 去重每天只触发一次，是合理设计；weekly 无小时门槛但受 quietHours（22:30-07:30）约束实际只在白天触发。保持现状，不改动。

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

## 本次会话补全（backlog 第二轮：profile 注入 + weekly 配额修复）

- **profile repoRoot 注入**（`340542c`）：`#withMarkdown` 改用注入的 `this.repoRoot`（与 opsRoot 对称）。注意 note.path 基准仍是全局 relativeToRepo，故 repoRoot 默认必须 = PATHS.repoRoot；此改动为对称性 + 未来 KnowledgeStore 注入铺路，行为零变更。
- **cadence weekly 独立配额**（`bee2f34`，**真 bug 修复**）：周日 balanced=2 时 weekly 占日常配额挤掉 evening。`SignalEngine.collect` 把 weekly 排出日常 slice、独立返回；`ProactiveOrchestrator.tick` 里 weekly 不计 notificationsToday、不触发配额 break。新增回归测试。
- **时间精度保持现状**（评估后非 bug）：≥hour 阈值 + lastRuns 去重每天触发一次，合理设计；weekly 受 quietHours 约束只在白天触发。不改动。
- 全量 240/240，verify 1139 files，未 push。

## 架构发现（避免下次重复探索）

- **定时调度由 `ProactiveOrchestrator` + `SignalEngine` 承担**（`runtime.mjs` L263 实例化、L308 worker 模式 `start`），**不是 `Scheduler` 类**（已删）。`runtime.scheduler` 字段是 `proactive` 的别名，与 Scheduler 类无关。晨间/晚间/周复盘主动通知已在 web/windows 触发；本次补全让 weekly 调 weeklySummary + 渠道含微信/飞书。
- **`config/` 目录只有 `vault-contract.json` 是活的**（`validator.mjs:103` 读）。`channels.json`/`executors.json`/`schedule.json` 都曾是无引用死配置（已删）。PATHS 无 configRoot，config 不被遍历加载。
- **渠道发送**：`ChannelHub.send` 默认 `targets=[web, windows, homeChannel]`（不含微信/飞书）；微信/飞书 adapter 用 `text||body`（丢弃 title），故主动消息须带 `text` 字段自包含。
- **allocation 字段**：`PriorityEngine.allocate` 返回 `{digest, ingest, maintenance}`（无 capture）。
- **KnowledgeStore 默认 indexFile 在 `.runtime/knowledge-index-v1.json`**（非 `vault/.index.json`）；测试/脚本若误用 `vault/.index.json` 会污染工作树触发 GitGuard。
- **渠道间歇超时**：微信/飞书 WebSocket 握手对网络/服务波动敏感，偶发 15s 超时；非持久故障，Host 已容错（渠道降级、API 不阻塞）。

## 当前待主人裁决

- ~~Anthropic 候选~~ 已删除（仅剩 1 个 `artifact-20260720-ef20760f`，非官方原文，同类已有一篇被拒绝；NEXT_SESSION 旧文声称"两个 SHA-256 相同"已证伪——dedupeKey 不同，另一个已 rejected）。
- 4 个同路径冲突继续搁置（keep-syno，不阻塞功能）：
  1. `vault/01-Areas/AI Agent Development/04-Context Engineering/4-5 Just-In-Time Context.md`
  2. `vault/02-Resources/AI and Agents/Agent Design & Patterns/Spec Kit vs OpenSpec vs Superpowers - CCC.md`
  3. `vault/02-Resources/AI and Agents/Authors/CCC.md`
  4. `vault/02-Resources/AI and Agents/Authors/ConardLi.md`
- 5 个固定排除项继续保持排除：两篇敏感凭据课程、两篇敏感凭据资源、一个源工作区缺失附件；精确路径保存在迁移 Manifest 和审计记录中。
- 1 个无证据 Claim（`claim-4f0ba8ac`，JIT Context 策略原则）：保持 candidate，不降级——principle 级声明确定性高，等 KnowledgeMaintenanceSource 自动发现 evidence gap。
- ~~Windows 常驻验收：搁置~~ **已通过（2026-07-24）**：重启后登录自启确认；登录时 wrapper 一次性 `0xC000013A`（STATUS_CONTROL_C_EXIT，进程被 Ctrl+C 终止，node 成孤儿），`pnpm windows:restart` 恢复后 task=`Running`、`lastResult=267009`（= `0x41301` 运行中态，非失败）、wrapper 存活、60s 轮询稳定。根因未完全定位，不阻塞。**残留风险**：若某次登录复现 `0xC000013A`，node 会再变孤儿丢自愈；可选加固（wrapper 跑 PowerShell 自身加 `-WindowStyle Hidden`/分离控制台，或加轻量 watchdog 任务周期确认 wrapper 存在），非必须。任务名 "Syno"，配置已确认正确（LogonTrigger、start-syno.ps1、崩溃重启 999 次/1 分钟、无电池限制）。

## 完成定义

迁移完成不等于产品 Goal 完成。只有 TODO 的 P0–P5 全部完成，并取得当前 checkout 的三轮审查、fresh clone、Web、Provider、微信、飞书、Windows 和备份恢复证据后，才能将全局 Goal 标记 complete。

## 上下文管理 M1（2026-07-23，本会话完成）

- **背景**：Native runtime 对话曾在 `PROVIDER_CONTEXT_LIMIT` 永久失败。v1 已实现 OBSERVE→COMPRESS→STORE→ROTATE 分层压缩；本会话补完推荐方案 M1（HANDOFF + STORE 治理 + OBS 可观测）。长期演进计划见 `docs/CONTEXT-MANAGEMENT-ROADMAP.md`，`docs/CONTEXT-MANAGEMENT-PLAN.md` 顶部已加反向指针。
- **HANDOFF（防自污染）**：rotate 后的 handoff 由 spoofed `user` 消息改为 `{role:"system", _syno:{kind:"handoff"}}`（`tool-loop-executor.mjs`）；`context-manager.extractValuable` 跳过 `_syno.kind==="handoff"`，防前情自污染。测试覆盖。
- **STORE（存储治理）**：`conversation-store.mjs` 新增 `compactionLogMax`(200)/`summariesMax`(50) cap、`archiveExternalThreshold`(100) 外置（`<id>.archive.json` 追加语义 + 懒加载 `getArchive()`）、prune 按 30 天裁 archive、删除会话连外置文件一起清。
- **OBS（可观测）**：`context-manager` 内存 `#stats`（压缩分动作/rotate/抽取计数 + before/after token）+ `stats()` 快照；`GET /api/syno/context/stats` 端点（仅聚合指标，不带 provider 凭证）；`settings-registry` 新增 `context.thresholds`（confirmationRequired 组，校验 light/moderate/heavy/overflow ∈ (0,1) 或 null）；`createSynoRuntime` 注入 `options.contextThresholds` 接缝（构造时同步，避开 sync 构造器的 await）。
- **验证**：Node test 298/298（`apps/syno/tests/*.test.mjs tests/*.test.mjs`），verify 1227 files。未 push。
- **✅ 部署核实（2026-07-24，纠正旧缺口判断）**：曾判断"线上微信是旧打包、M1 需 rebuild/redeploy 才生效"——**已证伪**。核实证据：① 无微信独立打包进程，微信走 host 源码 runtime（唯一 node 进程跑 `apps/syno/server.mjs`）；② 微信对话在 host ConversationStore（routing `local-user\0default`→`conversation-ec193dc2`）；③ 调用链 微信→`core.execute`(`weixin-message-handler:70`)→native-tool-loop(`cognitive-runtime:43`)→`tool-loop-executor`，后者含 M1 的 `rotateConversation`+handoff 正名(`tool-loop-executor:4/15-19`)。**结论：M1 对微信已架构生效，无需 rebuild。** `GET /api/syno/context/stats` 可用但全 0（自 restart 未遇长对话，内存态清零，不证伪）。活体长对话实测为可选，非必须。
- **手动 rotate 微信（按需复用）**：`ConversationStore.create()` 新空会话 → `ConversationRouter.rotate({ownerKey:"local-user"}, newId)`（自动归档当前 active、旧 id 入 retiredIds）→ 路由逐消息解析，无需重启。路由文件 `%LOCALAPPDATA%\Syno\state\conversation-routing.json`。当前 active（本会话 rotate 过去）：`conversation-ec193dc2-f1bc-48be-9fe5-18903ef50fd6`。
- **Deferred（已记录，非阻塞）**：bootstrap 读 `context.thresholds` 注入 createSynoRuntime（受 sync 构造器阻塞，需改 builder async 或 worker.mjs/server.mjs 调用点）；stats 落盘到 `context-stats.json`（anti-thrash 状态同为内存态，保持一致）。
