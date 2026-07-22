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
- 当前工作树不是 clean：本文档和多个源码文件已修改，新文件已创建。
- 当前文档任务不暂存、不提交、不 Push；新会话必须重新运行 `git status --short --branch`，不得把本文状态当作永久事实。
- Syno `vault/`：512 个受 Git 跟踪的 Markdown。
- 原库：555 个受 Git 跟踪的 Markdown，HEAD `883fbf5c457156805b9e9b53358175ce84940b59`，已有 19 项用户修改；永久只读。
- 当前验证：Node 228/231（3 个 calendar-sync 因工作树未提交失败）、vault pytest 57/57、Repository verify 1131 files。
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
- P4：planner 集成 OutputOpportunity，检查已有活跃输出或基于 Goal 自动生成。

## 尚未完成

1. P5：三轮审查、主人裁决、Windows 常驻验收、fresh clone、浏览器、真实渠道和备份恢复。
2. 全局 Goal 需通过 `goals.create` Job + 审批创建。
3. 3 个 calendar-sync 测试因工作树未提交失败（GitGuard 拒绝执行），提交后应恢复。

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
