# Claw 直通 DSH 迁移计划

> 依据 [ADR 0007](../adr/0007-claw-direct-to-dsh.md)。目标：微信通道与 Syno 能力进入 DSH 进程内插件，Syno Host 退为控制面。
> 规则：每阶段独立可交付、可回滚；`pnpm test` + `pnpm run verify` + `git diff --check` 全绿方可进入下一阶段；真实渠道验收不得用测试替身顶替。

## 0. 基线与前置 spike

- 记录执行时基线：`pnpm test` 计数、`pnpm run verify` 计数、8888/3088/微信/主动投递健康。
- Spike A（动手前先做）：在真实 DSH 里验证 `@syno/dsh-plugin` bundle 能挂载新增的最小插件（patch 相对行或 `file:` 依赖链接），并跑通最小回路：`agentPresets.resolve('syno')` + `agents.create` + `followup` + `session/event` 订阅 + `turn/end` 结算。
  - 失败回退：扩展 `ensureSynoDshProfiles`，把 `packages/syno-dsh-*` 逐个链接进 profile `node_modules`。
  - **2026-09-24 结果：通过**。`packages/syno-dsh-capabilities` 以相对行（`./index.mjs`，锚定 patch 文件同目录）挂载；`import { createUserMessage } from '@deepseek-ai/dsh-llm'` 经 DSH 运行时拦截 + 插件自身 `peerDependencies` 解析（无需安装官方包）；`syno` preset 解析并挂载；真实模型回合 `turnEndReason=completed`、`finalText="pong"`、elapsed 1.1s。运行器：`--profile syno --patch <spike.patch.yml>`，scratch `DSH_HOME`，不影响生产。注意：launcher 的 `--patch` 必须在 app 参数（`--host/--port`）之前；桥插件在无 `SYNO_BRIDGE_ORIGIN/TOKEN` 时报警但不致命。
- 决策（Owner 2026-09-24 采纳推荐项）：
  - **D1 凭证路径**：插件经 `runDpapi` 在内存解密；Host 不提供凭据代理。
  - **D2 维护页归属**：Host 保留 `/maintenance/weixin` UI + 插件受控 loopback API。
  - **D3 capture sidecar**：保留 JSON-RPC 隔离进程，工具面改挂 `@syno/dsh-capabilities`。
  - **D4 DSH 生命周期**：Host supervisor 继续管理（非消息路径）。

## 非目标

- 不改 DSH upstream，不给 DSH 增加 per-session channel/participant 抽象。
- 不扩 permission 表、不引入动态 MCP、不改模型链。
- 不合并主动运营与 `@deepseek-ai/dsh-schedule` 的会话内普通提醒。
- 本期只迁微信；飞书按同一通道插件模式后续单独评估。

## 下一步待办（2026-09-24 整理）

按执行顺序；每项完成即跑对应门禁并更新本节状态。

### B2 波次（灵感链路完成 2026-09-24，剩余 today/capture 状态类）

1. ✅ 迁移链到 `packages/syno-core/`：`process-lock.mjs`、`markdown-record.mjs`、`inspiration-store.mjs`（41 处导入改指，import-check 217 文件全解析）。
2. ✅ capabilities 注册 `syno_core_inspiration_record_feedback`：语义对齐 `inspiration-feedback-tool.mjs`（无卡 `recorded:false`、`already_recorded` 只读事实、显式 ID 跨 24h），`recordEvent` 可选。
3. ✅ 单测 `tests/capabilities-inspiration-tools.test.mjs`：无卡/单次落账/幂等/TTL/显式 ID 所有权与回填/非法取值。
4. ✅ **`today.read` 评估结论（2026-09-24）**：`TodayService` 本体只依赖 PriorityEngine/output-lifecycle，但构造依赖 `AgentHost`（JobStore/Policy/GitGuard/OperationExecutor）+ GoalService + PlannerService + SignalSourceRegistry + settingsRegistry，属 B4 规模 → `today.read` 顺延到 B4；下一波（B3）按计划做 `knowledge.fetch_url` 与 `capture.*`。
5. ✅ 门禁：`pnpm test` 764/764 + `pnpm run verify` + 真实 DSH spike（知识三轮），灵感反馈以单测覆盖（live 造卡留给生产验收）。
6. ⏳ spike 场景参数（`SYNO_SPIKE_SCENARIO`）暂未需要；B5 前保持 spike 与生产模块分离（已拆分）。

### B3 波次（完成 2026-09-24）

- ✅ 迁入 syno-core：`source-fetcher`、`source-descriptor`、`process-runner`、`canonical-tags`、`intake`、`ingest-service`、`ingest-workflow-coordinator`、`browser-capture-adapter`、`fetch-url-tool`（18 处导入改指，import-check 221 文件全解析）。
- ✅ plugin 工具：`syno_core_knowledge_fetch_url`、`syno_core_capture_start`/`status`/`list_pending` + 单测；门禁 `pnpm test` 768/768、verify、spike 7 工具激活。
- ⏳ 延后：浏览器升级/续办（Phase C 通道上下文）、收录分析 sidecar（B5）。

### B4 波次（主体完成 2026-09-24）

- ✅ 模块迁移：`policy`/`operation-registry`/`operation-executor`/`git-guard`/`agent-host`/`job-store`/`session-safety`/`claim-evidence-service`/`goal-service`/`output-lifecycle`/`output-service`/`planner-service`/`priority-engine`/`signal-source-registry`/`settings-registry`/`today-service`/`domain-operations`/`reports`/`knowledge-maintenance-source` 迁入 syno-core；`remoteSafeJobSummary` 抽到 `packages/syno-core/job-summary.mjs`。
- ✅ 工具：`syno_core_jobs_list`/`syno_core_jobs_submit`/`syno_core_today_read`；写路径仍走 AgentHost → Policy → Job → Validator → GitGuard 精确路径（`createOpsRuntime` 装配，`OperationExecutor` 支持 actions/memory/report/output 四类 operation）。
- ✅ 单测：job 生成/审计路径（fake git）、非法 mode/缺 text 拒绝、today 快照。
- ⏳ 延后：hidden 工具面（claims/evidence/settings）是否纳入插件（B5 决策）；真实 DSH 写审计（会在真实知识仓产生 Job/提交，留 Owner/生产验收）；effect receipt 随 B5 评估。
- 门禁：`pnpm test` 773/773 + verify + spike 10 工具激活绿。

### B5 波次（切换开关完成 2026-09-24）

- 切换开关已落地：`SYNO_CHAT_TOOLS=plugin` 双轨（bridge 静默 + canonical 名）；默认 bridge 不变；双模式 spike 绿。
- ⏳ 待 Owner 验收后执行删除清单（见 Phase B 的 B5 条目）；切换前确认索引双写策略（Host 与 DSH 是否共用 `SYNO_RUNTIME_ROOT`，已原子写但需决定单写者或独立文件）。

### 其他发现（独立于迁移）

- ~~`tests/process-lock.test.mjs` 并发接管用例竞态~~：**已修（2026-09-24）**。根因两类：`process-lock.mjs` 创建/接管写入非原子（改 `temp + fs.link` 原子发布，failFast 对空文件做有界重试）；PowerShell 身份读取在负载下超时（首个预算失败后带更长预算重试一次）。并发用例改为「赢家先持有并打标、输家再启动」的确定性握手。6 并发复现 6/6 绿。
- ~~`tests/proactive-reliability.test.mjs:1096` 投递等待超时~~：**已修（2026-09-24）**。`waitForWorkflowDuplicate` 由 400×5ms=2s 改为 15s deadline 轮询（快速路径仍首轮命中）。

## Phase A：共享核心与插件骨架（行为不变）

- A1 抽 `packages/syno-core`：移入无 Host 耦合的领域与治理模块（`knowledge-store`、`fetch-url-tool`/`source-fetcher`、`ingest-service`、`job-store`、`agent-host`、`policy`、`validator`、`git-guard`、`operation-*`、`today-service`、`inspiration-store`、`paths` 的知识根派生等）。`apps/syno` 改为引用；现有测试原样通过。
- A2 骨架：`@syno/dsh-plugin` bundle 内挂载 capabilities 插件（实现位于 `packages/syno-dsh-plugin/plugins/capabilities/`），首个只读工具受环境开关控制；MCP 路径保留为 shadow 对照（不改变输出）。
- **进度（2026-09-24）**
  - A1 完成 knowledge 读取切片：`paths.mjs`、`validator.mjs`、`knowledge-store.mjs`、`sensitive-content.mjs`、`knowledge-path-policy.mjs`、`schema-registry.mjs` 迁入 `packages/syno-core/`（`REPO_ROOT`/`CONTRACT_ROOT` 改为按新位置派生）；全仓导入改指新路径；`pnpm test` 756/756、`pnpm run verify` 2249 files、`git diff --check` 通过。
  - A2 骨架达成：`plugins/capabilities/index.mjs` 在 `SYNO_CAPABILITIES_TOOLS=1` 时注册试用工具 `syno_core_knowledge_search`（不占用 canonical 名，B5 接管），实现 `plugins/capabilities/knowledge-tools.mjs` 由 `tests/capabilities-knowledge-tools.test.mjs` 覆盖。
  - Spike 复核：真实 `syno` profile 内，模型两轮回合（`pong` → 调用 `syno_core_knowledge_search` 返回真实 vault 命中），`turnEndReason=completed`。
  - 解析机制：官方包不安装、不 vendoring；capabilities 实现位于 linked root `packages/syno-dsh-plugin/` 内，由该包 `peerDependencies` + DSH 运行时拦截解析。
- 门禁：真实 DSH 中两路只读结果一致；`pnpm test`、`pnpm run verify`、`git diff --check`。

## Phase B：能力内嵌（替换 Tool Bridge，分波次）

- B1 知识三件套（**完成 2026-09-24**）：`knowledge.search`/`read_snippet` 经 `packages/syno-core/knowledge-read.mjs` + capabilities 插件注册 `syno_core_knowledge_search`、`syno_core_knowledge_read_snippet`（`SYNO_CAPABILITIES_TOOLS=1` 门控，暂不占 canonical 名）。真实 DSH 三轮回合（`pong` → search → read_snippet 链式）通过；`tests/capabilities-knowledge-tools.test.mjs` 覆盖限长、敏感拒读与去敏感字段。审查整改：spike 拆到 `spike.mjs`（生产模块零 `process.exit`、`inject` 收缩为 `tools`）、syno-core `package.json` 收敛到最小字段、`PATHS.appRoot` 死字段删除、知识索引改原子写、补 `truncated:true` 截断测试。
- B2 状态与反馈类（**灵感链路完成 2026-09-24**）：`process-lock`/`markdown-record`/`inspiration-store` 迁入 syno-core；capabilities 注册 `syno_core_inspiration_record_feedback`（无卡 `recorded:false`、`already_recorded` 只读事实、显式 ID 跨 24h，语义与 Host 工具一致），由 `tests/capabilities-inspiration-tools.test.mjs` 覆盖；`process-lock` 获取与接管改 `temp + fs.link` 原子发布，并修掉存量并发 flake。剩余：`today.read` 与 `capture.status`/`list_pending` 状态类排期（见「下一步待办」）。
- B3 抓取与收录（**完成 2026-09-24**）：`source-fetcher`/`source-descriptor`/`process-runner`/`canonical-tags`/`intake`/`ingest-service`/`ingest-workflow-coordinator`/`browser-capture-adapter`/`fetch-url-tool` 迁入 syno-core；capabilities 注册 `syno_core_knowledge_fetch_url`、`syno_core_capture_start`/`status`/`list_pending`（7 个工具全量），由 `tests/capabilities-fetch-tools.test.mjs` 与 `tests/capabilities-capture-tools.test.mjs` 覆盖（直抓包裹、失败如实上抛、workflow 落库/状态/待办/幂等重放）。**延后项**：浏览器升级与「继续」续办依赖通道上下文（Phase C 接入）；收录分析（`analyze`/sidecar）随 B5 的 JSON-RPC sidecar 迁移接入，本波 `capture.start` 只落 `received` 态 workflow。
- B2/B3 审查整改（2026-09-24）：锁文件恢复 `0o600` 且发布路径补保护模型注释；`fetch_url` 工具移除无调用方的 `browserCapture` 参数并给「受保护地址」错误补 retryable 话术；`read_snippet`/`fetch_url` 补入参区间校验对齐 Host 契约（新增 `tool-args.mjs`）；`capture.start` 补 `filename` 参数；`syno-doctor` 增加过期 `.claim`/`.tmp` 清扫；补「旧版慢写空锁」重试测试。
- B4 写治理与全量面（**主体完成 2026-09-24**）：19 个治理模块与 `job-summary` 迁入 syno-core；`syno_core_jobs_list`/`jobs_submit`/`today_read` 注册（写仍走 AgentHost/Policy/GitGuard 精确路径，fake-git 单测覆盖）；剩 hidden 工具面决策与真实写审计（留 Owner）。
- B5 切换与删除（**切换开关完成 2026-09-24**）：`SYNO_CHAT_TOOLS=plugin` 时 bridge 插件静默退出、capabilities 注册 canonical `syno_*` 名（`canonicalToolName`）；默认仍为 bridge（生产不变）。双模式真实 DSH spike 均绿。**删除类操作待 Owner 验收后再执行（保留一个版本）**：删除 `syno-tool-bridge.mjs`、`syno-tool-bridge-plugin.mjs`、`/api/syno/bridge/mcp` 与 allowlist 对应项、`FALLBACK_TOOLS`、`SYNO_BRIDGE_CONTEXT_*` 及相关 journal/测试替身；`syno-tool-sets.mjs` 名单转为插件工具集定义；收录 sidecar 改挂 capabilities（workflow 授权经现有 WorkflowStore 解析）；接管时保留 owner/allowedTools 语义（通道会话映射）、`agentAdjustableBoundary`、`tool-result-serializer` 脱敏与 `toolSet: core|all` 过滤。
- 门禁：每波 `pnpm test` + `pnpm run verify` + 真实 DSH 回合；B5 门禁另加：`tests/syno-tool-bridge.test.mjs` 改写为 in-process 契约测试、全仓 `SYNO_BRIDGE_CONTEXT_REQUIRED` 零引用、真实生产会话工具调用与写审计通过。

## Phase C：微信通道内嵌（Claw 直连）

- **C0 预备（完成 2026-09-24）**：19 个通道/渠道模块迁入 syno-core（`provider-credential-store`/`runtime-journal`/`weixin-text-format`/`weixin-ilink`/`feishu-channel`/`channel-delivery-outbox`/`channel-continuation-store`/`channel-intent-router`/`pending-decision`/`accepted-request-store`/`accepted-request-recovery`/`mobile-delivery-mode`/`proactive-reliability`/`channels`/`channel-conversation-handler`/`capability-presenter`/`recent-interaction`/`image-mime`/`vision-intake`）；全量 775/775 绿，生产行为不变。
- C1 新插件 `@syno/dsh-channel-weixin`：迁移 `weixin-ilink.mjs`（客户端/适配器/QR/poller/quarantine/typing/`formatWx`）、`channel-delivery-outbox.mjs`、`OwnerChannelTargetStore`、`accepted-request-*`、`channel-continuation-store`、`channel-intent-router`、`pending-decision` 渠道部分与 `channel-conversation-handler` 的确定性路由（模型调用替换为 `followup`）。
  - **C1a 完成（2026-09-24）**：in-process 通道核心落地——`session-map.mjs`（owner/thread→session 持久映射，ProcessFileLock）、`session-turn.mjs`（`inbox/claimed` 关联 + `assistant/message` 取文 + `turn/end` 结算 + 超时/订阅清理）、`channel-core.mjs`（`adapter.onMessage` → 会话建/复 + `followup(source=weixin)`）、`index.mjs`（`SYNO_CHANNEL_OWNER=dsh` 门控）。单测 4 条；`SYNO_WEIXIN_SPIKE=1` 真实 DSH + 真实模型经 fake adapter 验证 `pong` 往返。
  - 剩余：ChannelConversationHandler 确定性路由接回（替代内核的最小文本路径）、typing/ACK/Outbox 归位、维护页 C4、真实扫码与 C5 切换。
- C2 会话接入：按 owner/thread 建/复 `syno` preset 会话（`agentPresets.resolve/acquireScope` + `agents.create` + `mount`），与 3088 Web 打开同一会话兼容；冷会话按 `agents.resume` + retry-once 处理与 Web controller 的竞争。
- C3 出站与可靠性：`session/event`（`{global:true}`）+ `agent/inbox/claimed` + `turn/end`；typing/ACK/final 由插件独占；失败回执与 Outbox 重试保留。
- C4 维护页：按 D2 决策接线；Host 只做 loopback 转发，无业务入口。
- C5 切换：`SYNO_CHANNEL_OWNER=dsh` 成为默认；Host 轮询与回复路径标记 deprecated，保留一个版本。
- 门禁：真实微信端到端（普通对话、多轮工具、链接续读、灵感反馈、图片、失败回执、扫码重绑）、进程锁单实例、重启恢复、Web 与微信同会话并发语义；`#19` 与假超时错误面无对应机制。

## Phase D：主动运营内嵌

- D1 新插件 `@syno/dsh-proactive`：迁 `signal-engine`、`signal-source-registry`、`priority-engine`、`proactive-orchestrator`、outbox drain、`cancellable-keyed-scheduler`；定时与 `ProcessFileLock` 保留；投递经通道插件。
- D2 Host 删除 proactive 接线；settings 中主动发布闸门由核心库读取，控制面只提供配置入口。
- 门禁：晨报/晚报/灵感卡真实到达与反馈落账；投递健康指标与失败重试语义不变。

## Phase E：Host 收缩与清理

- E1 Host 仅保留：DPAPI 凭据、`/maintenance/weixin`、provider/settings 配置入口、诊断/审计、DSH supervisor 与 profile 生成。
- E2 删除死代码：`deepseek-harness-web-client.mjs`、JSON-RPC chat 回退（capture 保留）、`mobile-delivery-mode` 等逐项评审；删除空包 `packages/syno-dsh-client` 与 Web 工作台残留。
- E3 文档同步：`ARCHITECTURE.md`、`AGENTS.md`、`README.md`、`OPERATIONS.md`「DeepSeek Harness 生产 chat」、`NEXT_SESSION.md`、`KNOWN-LIMITATIONS.md`、`docs/INDEX.md`。
- 门禁：`pnpm test`、`pnpm run verify`、`git diff --check`、真实渠道验收；回滚分支保留一个版本后由 Owner 批准删除。

## 验证命令

`pnpm test` · `pnpm run verify` · `git diff --check` · `pnpm harness:doctor` · 每阶段补充真实微信/DSH 验收清单。

## 风险与对策

- DSH API 漂移：固定 `SYNO_DSH_ROOT` checkout；为插件写契约测试（会话创建、followup、事件、tools.register）。
- 双写知识库：Phase B/C 后 Host 停止写路径；插件单写者 + 既有 Job 锁。
- 同会话并发（Web/微信）：inbox 串行语义测试；source 过滤防串回复。
- 冷会话恢复竞争：插件与 Web controller 的 resume 竞争 → retry-once；锁错误可观测。
- 凭据与 Git 能力进入 DSH 进程：Phase C 前专项安全审查（含 prompt 注入面与工具输出脱敏）。
