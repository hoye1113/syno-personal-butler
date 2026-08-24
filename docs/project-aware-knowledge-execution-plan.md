# Syno Project-aware Knowledge MVP 执行计划

状态：IN_PROGRESS  
更新日期：2026-08-24（Asia/Hong_Kong）  
执行分支：`feat/project-aware-knowledge-mvp`  
基线提交：`f4997ab`  
Push / merge：本轮禁止自动执行

## 1. 本轮目标与范围

本轮只实现一条可以验证的最小闭环：

```text
创建 Project
→ 用户显式指定 Project
→ Job 绑定 projectRef
→ Capture / Ingest 继承 Project
→ 新 Knowledge Note 保存 project_refs
→ KnowledgeStore 对同项目知识加权
→ 真实 DSH 验证召回质量改善
```

本轮不实现完整 PARA、Session 自动继承、Usage、Knowledge Health、Today/Planner 项目化或 Project UI；也不批量迁移旧 Goal/Vault。

## 2. 当前事实源与执行约束

- `vault/` 是长期知识事实源；`ops/` 是 Job、Action、Artifact、Proposal、Event 和 Project 等运行事实源。
- `contracts/` 是机器校验契约；`.runtime/` 只能保存可重建缓存和运行状态，禁止提交。
- 产品认知运行时是 `DeepSeekHarnessCognitiveRuntime`；DSH Session 只保存 Owner/thread/Session 元数据，不保存 Project 自动继承关系。
- 普通写入必须经 ToolRegistry、Policy、Job、隔离 worktree、validator 和 GitGuard；Project 写入同样不能绕过 Job。
- `/project <projectRef>` 是服务端显式入口。projectRef 由服务端校验并注入 execution context，模型不可生成、猜测或覆盖。
- 提交只暂存 Job 声明的精确路径；禁止 `git add -A`、`git add .`、自动 Push 和自动 merge。

## 3. 冻结决策

### Project 语义

Project 是具有明确 Outcome 和 Done Condition、需要跨多个 Job、对话或知识记录保持共同上下文的工作上下文。它不是 PARA 目录、Area、Goal 的强制父节点、DSH Session、任务树或项目管理 UI。

Goal 与 Project 只保持单向关联：`Goal 0..1 → Project`。Goal 可以独立存在；Project 可以没有 Goal；Project 完成不级联关闭 Goal，只产生后续 review candidate。

### Project 记录与生命周期

记录路径为 `ops/projects/<projectRef>.md`，固定字段为：

```yaml
projectRef:
ownerKey:
title:
status:
objective:
doneCondition:
createdAt:
updatedAt:
```

projectRef 格式为 `project-YYYYMMDD-xxxxxxxx`，后缀来自 `randomUUID()` 的 8 位小写十六进制字符。状态只有 `active`、`paused`、`completed`、`abandoned`；四种状态都允许历史 Note 引用，只有 `active` 可绑定新普通 Job。MVP 不提供删除，也不提供终态 reopen。隔离唯一性边界为 `(ownerKey, projectRef)`。

### 显式入口与传播

- 指令必须位于消息首个非空行，且必须有正文：`/project <projectRef>`。
- 只接受已存在的稳定 projectRef；不存在、格式错误、缺少正文、Owner 不匹配或 Project 不可绑定时返回确定性错误，不启动普通模型工作流。
- 服务端移除指令后才把正文交给模型；不支持 title matching、alias、fuzzy matching、embedding 或 confidence。
- 不修改 `DeepSeekHarnessSessionBindingStore`，不做跨消息、跨 Session、跨渠道自动继承。

传播链固定为：

```text
/project <ref>
→ shared chat ingress
→ runtime.run(context.projectRef)
→ DSH Tool Bridge activeContext.projectRef
→ ToolRegistry execution context
→ AgentHost.receive(context.projectRef)
→ Job.projectRef
→ IngestWorkflow / Proposal / Note
```

### Note 与检索

新 canonical Note 只使用 inline scalar array：

```yaml
project_refs: ["project-20260824-a1b2c3d4"]
```

旧 Note 不批量改写；已有 append/link 行为保持不变，并记录 `DEFERRED_EXISTING_NOTE_PROJECT_LINK`。检索保持原有 `baseScore`，仅在当前可信 Project 与 Note 的 `project_refs` 相交时加固定 `PROJECT_BOOST = 3`；不 hard filter、不惩罚其他项目、不改变无 Project 查询，也不把 projectRef 加入模型可见的 `knowledge.search` 输入契约。

## 4. Phase 状态

| Phase | 状态 | 退出条件 |
|---|---|---|
| Phase 0：Repository Truth & Interface Freeze | DONE | 调用链、契约、分数和停止条件已记录；基线测试与 verify 通过 |
| Phase 1：Minimal Project Domain | DONE | Project schema/service、Goal 兼容、Project tools 和契约测试完成 |
| Phase 2：Explicit Project → Job Propagation | DONE | 指令解析、可信上下文、Job/Workflow 传播和隔离测试完成 |
| Phase 3：Knowledge `project_refs` Round-trip | DONE | Workflow → Proposal → Apply → Markdown → reload 全链路完成 |
| Phase 4：Project-aware Retrieval | DONE | 固定 boost、无 Project 回归、跨 Project 隔离和 Tool Bridge 注入完成 |
| Phase 5：Real DSH MVP Acceptance | DEFERRED | 仅使用真实 DSH/Owner 证据记录召回改善，不用自动化测试冒充验收 |

`DONE` 的统一定义是：代码完成、契约测试通过、全量测试通过、verify 通过、文档同步、阶段验收完成。

## 5. Phase 0 核查结果（2026-08-24）

已核查的真实模块：

- 契约：`contracts/goal.schema.json`、`job.schema.json`、`ingest-workflow.schema.json`、`ingest-proposal.schema.json`、`note.schema.json`。
- 入口与执行：`channel-conversation-handler.mjs`、`runtime.mjs`、`deepseek-harness-cognitive-runtime.mjs`、`syno-tool-bridge.mjs`、`tool-registry.mjs`、`agent-host.mjs`、`job-store.mjs`。
- 收录与检索：`ingest-workflow-coordinator.mjs`、`ingest-service.mjs`、`knowledge-store.mjs`、`validator.mjs`、`markdown-record.mjs`。
- Policy 与确定性操作：`policy.mjs`、`operation-registry.mjs`、`operation-executor.mjs`、`domain-operations.mjs`、Goal Service、DSH tool set/plugin mapping 和 agent instructions。

已确认的当前接缝：

1. 统一聊天入口在 `ChannelConversationHandler` 中最终调用 `runtime.run({ text }, context)`；因此指令解析可以放在送入 runtime 前的确定性协议段。
2. `DeepSeekHarnessCognitiveRuntime` 会调用 `SynoToolBridge.bindContext()`；Bridge 再把 active context 传给 `ToolRegistry.execute()`，适合作为 server-owned projectRef 的可信传播 seam。
3. `AgentHost.receive()` 是 Job 落盘前的统一入口；`JobStore.create()` 当前把 Owner、thread、requestKey 持久化到 Job，可增加正式 optional `projectRef`。
4. `capture.start` 直接调用 `IngestWorkflowCoordinator.receive()`；Workflow 已持久化 `ownerKey`、thread 和 idempotency 信息，可增加 projectRef。收录 Job 在 `runtime` 的 `onProposed` 中创建。
5. `IngestService.apply()` 新建 Note 时手工生成 frontmatter；`markdown-record` 与 `validator.frontmatterData` 已支持 inline 数组，不能依赖 multiline nested YAML。
6. `KnowledgeStore` 已将 frontmatter 解析成 metadata 并按 title/tag/source/body 做词法计分；可在内部 option 中追加固定 Project boost。
7. `ops` Profile 已允许 `ops/`，但 `validator.contractForPath()` 还没有 `ops/projects/*.md` 映射；新增 Project contract 时需要补齐。
8. 当前 Goal schema 已有可选 `projectRef`，但没有 `ownerKey`；Goal Service 没有 Project 校验，需要向新建路径加 Owner 和引用校验，同时保持旧记录可读。

当前没有发现需要重写 DSH Session Store、全局 activeProject、整个 frontmatter parser、全局信任边界或批量迁移旧 Goal/Vault 的必要性。

## 6. 基线证据

已执行：

```text
pnpm test       # 714/714 passed, 0 failed
pnpm run verify # Repository verification passed (1631 files); active docs 7 files
```

后续每个阶段还必须执行 targeted tests、`pnpm test`、`pnpm run verify` 和 `git diff --check`。当前 `package.json` 没有独立 lint、typecheck 或 build script，不新增虚假的验证命令。

## 7. 停止条件与 deferred

遇到以下任一情况，停止当前 Phase，并在本文件记录 `BLOCKED_DESIGN_DEVIATION`：必须修改全局 activeProject 或 DSH Session Binding Store；必须让模型提交 projectRef；必须重写 frontmatter parser；必须修改已有 Note 才能完成第一版；无法保证 Owner/projectRef 隔离或 server context 到 Bridge 的传递；无 Project 查询改变现有排序；必须批量迁移旧 Goal/Vault；必须新增 Context/Graph/Usage/Health 大型模块。

以下内容明确 deferred：Session inheritance、Web/微信自动继承、Usage、Learning feedback、Profile/Today/Planner 项目化、Area、PARA UI、Project UI、旧 Note 项目关联、Vault/Goal migration，以及真实 DSH 无法证明价值时的复杂功能补救。

## 8. 阶段交接记录

### 实际修改文件

Phase 0：`docs/INDEX.md`、`docs/project-aware-knowledge-execution-plan.md`。  
Phase 1：`contracts/project.schema.json`、`contracts/goal.schema.json`、`apps/syno/syno/project-service.mjs`、`apps/syno/syno/goal-service.mjs`、`apps/syno/syno/validator.mjs`、`apps/syno/syno/policy.mjs`、`apps/syno/syno/operation-registry.mjs`、`apps/syno/syno/runtime.mjs`、`apps/syno/syno/syno-tool-bridge.mjs`、`config/deepseek-harness/syno-tool-sets.mjs`、`config/deepseek-harness/syno-tool-bridge-plugin.mjs`、`config/deepseek-harness/syno-agent.md`、`tests/project-service.test.mjs`。
Phase 4：`apps/syno/syno/knowledge-store.mjs`、`apps/syno/syno/runtime.mjs`、`tests/project-retrieval.test.mjs`；检索实现提交为 `3362336`。
文档同步：`docs/ARCHITECTURE.md`、`docs/POLICY.md`、`ops/README.md`、`NEXT_SESSION.md`、`docs/HANDOFF-EXECUTION-PLAN.md`、`docs/TODO-EXECUTION-PLAN.md`、`docs/INDEX.md`、`scripts/check-active-docs.mjs`、本执行计划。

### 契约变化

Phase 1 已增加 `project.schema.json`，并为新 Goal 增加 optional `ownerKey`；旧 Goal 仍可读。Project 与 Goal.projectRef 的 Owner 校验由服务端执行。Job、IngestWorkflow、IngestProposal、Note 的 projectRef/project_refs 变化留在后续 Phase。

### 测试、验收与提交

Phase 0 commit：`5c3b8e2`（`docs: freeze project-aware knowledge interfaces`）。  
Phase 1 targeted：`node --test tests/project-service.test.mjs`，5/5 passed；完整回归：719/719 passed、0 failed、0 cancelled。`pnpm run verify` 已通过（1636 files），`git diff --check` 已通过。Phase 5 单独记录真实 DSH、Owner 观察、对照实验和未证明项。

Phase 2 已完成显式 Project 上下文传播：

- 新增 `apps/syno/syno/project-directive.mjs`，只解析消息首个非空行的 `/project <projectRef>`，并在格式错误、缺少正文时确定性拒绝。
- `ChannelConversationHandler` 在进入模型前校验 Owner、Project 存在性和 active 状态，移除指令正文；`runtime.run`、图片/URL/个人想法收录和 provider fallback 均携带可信 projectRef。
- `DeepSeekHarnessCognitiveRuntime` → `SynoToolBridge.activeContext` → `ToolRegistry` 传递 projectRef；`capture.start`、`jobs.submit` 以及 Project/学习/证据写入工具通过现有 Job 入口继承上下文。
- `AgentHost` 在 Job 落盘前再次校验 bindable Project，`JobStore` 持久化 optional `projectRef`；同一请求身份切换 Project 会拒绝。
- `IngestWorkflowCoordinator`、`IngestService` 记录并复验 projectRef；Workflow 的规则替换复制 Project 绑定。Source/idempotency dedupe 以 Project scope 隔离，避免 Project A、Project B 和无 Project 串线。
- 相关契约更新为 `contracts/job.schema.json`、`contracts/ingest-workflow.schema.json`。

Phase 2 targeted：`node --test tests/project-propagation.test.mjs tests/ingest-workflow-coordinator.test.mjs`，34/34 passed；覆盖 directive、wrong-owner、非 active Project、Job 持久化、Artifact/Workflow、跨 Project dedupe、Tool Bridge active context 和 malformed directive 不进入模型。完整回归与 verify 将在后续阶段完成。

Phase 3 已完成新 Note 项目关系往返：

- `contracts/note.schema.json` 增加 `project_refs` unique inline array；`contracts/ingest-proposal.schema.json` 增加 `suggestedProjectRefs` unique array。
- `IngestService` 在 receive、proposal/revision/enrichment 和 apply 重新验证 Owner/Project；canonical 新建或 keep-separate Note 写入 `project_refs: ["<projectRef>"]`。
- completed/abandoned 等终态 Project 仍可作为历史 Note 引用；append-source/link-only 不改已有 Note，保留 `DEFERRED_EXISTING_NOTE_PROJECT_LINK` 范围。
- Proposal 与 Apply 会拒绝被篡改的 Project 关系，不会把 invalid/wrong-owner ref 写入 canonical Vault。

Phase 3 targeted：`node --test tests/project-knowledge.test.mjs`，4/4 passed；覆盖 Note/Proposal contract、invalid/wrong-owner、completed Project、Markdown frontmatter、lifecycle reload 和既有 Note append 行为。Phase 3 代码尚未包含旧 Vault 批量迁移。

Phase 4 已完成 Project-aware Retrieval：

- `KnowledgeStore` 读取既有 frontmatter inline `project_refs`，将其保存在 Note metadata，并只在可信当前 Project 命中时增加固定 `PROJECT_BOOST = 3`。
- `knowledge.search` 的模型可见输入契约不增加 `projectRef`；ToolRegistry execution context 内部注入 Project，并在进入检索前重新校验当前 Owner 的 Project 引用。
- 无 Project 查询继续使用原有结果集合、排序、score 和 matchReasons；其他 Project 不扣分，强通用相关性仍可超过弱同项目相关性。
- 敏感内容过滤和既有 tag/source/stability/date 过滤路径保持不变；旧 Note 没有 `project_refs` 时按空数组处理。

Phase 4 targeted：`node --test tests/project-retrieval.test.mjs`，2/2 passed；覆盖 inline array round-trip、固定加权、Project A/B 隔离、强通用相关性、无 Project baseline 精确回归、模型输入契约隐藏和 wrong-owner 拒绝。真实 DSH 召回质量仍由 Phase 5 现场验收负责。

当前完整回归：Phase 4 后执行 `pnpm test`，731/731 passed、0 failed、0 cancelled。文档同步后的 `pnpm run verify` 已通过：Repository verification 1640 files、active documentation 9 files；`git diff --check` 已通过。`pnpm harness:doctor` 通过 capture/chat bootability、sandbox、Cordis 和动态 MCP 禁用检查，但当前 `deepseek-key.present=false`，因此不能进行真实模型召回对照。

### Owner 验收证据

DEFERRED（不是设计阻塞）。本次执行已验证静态 Tool Bridge/runtime 注入、同项目 boost、无 Project 回归和 wrong-owner 隔离，但没有在真实生产 DSH 上完成 Owner 观察。因此尚未宣称召回质量改善。下一位 Agent/Owner 必须按 Phase 5 使用 Project A、无 Project、Project B 的相同 query 做对照，记录返回排名、`matchReasons`、最终上下文和 Owner 观察；若无法观察到改善，应标记 MVP 未证明价值，不通过新增复杂功能补救。

### BLOCKED_DESIGN_DEVIATION

无。
