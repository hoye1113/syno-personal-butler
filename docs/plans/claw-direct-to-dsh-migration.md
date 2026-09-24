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

### B2 波次（下一步立即做）

1. 迁移链到 `packages/syno-core/`（沿用 A1 codemod 手法，逐文件跑测试）：
   - `process-lock.mjs`（standalone；注意其存量 flake，见「其他发现」）；
   - `markdown-record.mjs`（依赖 schema-registry/paths/process-lock）；
   - `inspiration-store.mjs`（依赖 markdown-record/paths）。
2. capabilities 注册 `syno_core_inspiration_record_feedback`：语义对齐 `inspiration-feedback-tool.mjs`（无卡 `recorded:false`、`already_recorded` 只读事实、显式 ID 跨 24h），`recordEvent` 在插件内降级为可选。
3. 单测：无卡返回、重复评价只读既有事实、显式 ID 回填（参考 `tests/inspiration-feedback-tool.test.mjs` 既有断言）。
4. `today.read` 依赖评估：GoalService / AgentHost / SignalSourceRegistry / PlannerService / PriorityEngine；若依赖树过大，先把 `capture.status`/`list_pending`（IngestWorkflowStore 宿主 state）排入 B2，`today.read` 顺延 B3。
5. 门禁：`pnpm test` + `pnpm run verify` + 真实 DSH 回合；spike 可先经 store 造一张已投递灵感卡再让模型调用反馈工具。
6. spike 继续增长时为它加场景参数（如 `SYNO_SPIKE_SCENARIO`），避免单文件膨胀；B5 前把 spike 的进程退出语义彻底移出生产模块（现已拆分）。

### B3 波次

- `knowledge.fetch_url`（`source-fetcher` 的 SSRF/pinning/代理分支 + `BrowserCaptureAdapter` 升级 + `ChannelContinuationStore` 续办）与 `capture.start`/`status`/`list_pending`（`IngestWorkflowCoordinator`/`IngestService`，仍只产生 Workflow/Proposal，不直写 vault）。

### B4 波次

- `jobs.list`/`jobs.submit` + registry 全量面 + `toolSet: core|all` 语义；单独安全评审（写治理、effect receipt、审批边界、owner/allowedTools）。

### B5 波次（切换与删除）

- 按 Phase B 的 B5 条目执行；切换前确认索引双写策略（Host 与 DSH 是否共用 `SYNO_RUNTIME_ROOT`，已原子写但需决定单写者或独立文件）。

### 其他发现（独立于迁移，建议单独修）

- `tests/process-lock.test.mjs` 并发接管用例竞态：6 并发复现 5 失败（`PROCESS_LOCK_IDENTITY_UNKNOWN` 替代 `PROCESS_LOCK_HELD`）；根因是 `process-lock.mjs` 接管写入非原子，可套用 `knowledge-store` 的 tmp+rename 修法。
- `tests/proactive-reliability.test.mjs:1096` 投递等待超时：全量套件负载下偶发、单跑通过；等待窗口对负载敏感，单独会话评估收紧或放宽。

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
- B2 状态与反馈类：`today.read`、`capture.status`/`list_pending`、`inspiration.record_feedback`；需迁 `inspiration-store`/`markdown-record`/`process-lock` 与 Today 依赖树到 syno-core。
- B3 抓取与收录：`knowledge.fetch_url`、`capture.start`（SSRF/代理、浏览器升级、Workflow 授权）。
- B4 写治理与全量面：`jobs.list`/`jobs.submit`、registry 全量、`toolSet: core|all` 语义保持；最大风险项，单独安全评审。
- B5 切换与删除：capabilities 接管 canonical 名并按 `SYNO_CHAT_TOOLS=plugin` 切换，接管时必须保留原 Bridge 的 owner/allowedTools 语义（通道会话映射）、`agentAdjustableBoundary`、`tool-result-serializer` 脱敏与 `toolSet: core|all` 过滤；删除 `syno-tool-bridge.mjs`、`syno-tool-bridge-plugin.mjs`、`/api/syno/bridge/mcp` 与 allowlist 对应项、`FALLBACK_TOOLS`、`SYNO_BRIDGE_CONTEXT_*` 及相关 journal/测试替身；`syno-tool-sets.mjs` 名单转为插件工具集定义；收录 sidecar 改挂 capabilities（workflow 授权经现有 WorkflowStore 解析），若 shadow 证明不可行则保留 capture 专用最小桥并记录偏差。
- 门禁：每波 `pnpm test` + `pnpm run verify` + 真实 DSH 回合；B5 门禁另加：`tests/syno-tool-bridge.test.mjs` 改写为 in-process 契约测试、全仓 `SYNO_BRIDGE_CONTEXT_REQUIRED` 零引用、真实生产会话工具调用与写审计通过。

## Phase C：微信通道内嵌（Claw 直连）

- C1 新插件 `@syno/dsh-channel-weixin`：迁移 `weixin-ilink.mjs`（客户端/适配器/QR/poller/quarantine/typing/`formatWx`）、`channel-delivery-outbox.mjs`、`OwnerChannelTargetStore`、`accepted-request-*`、`channel-continuation-store`、`channel-intent-router`、`pending-decision` 渠道部分与 `channel-conversation-handler` 的确定性路由（模型调用替换为 `followup`）。
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
