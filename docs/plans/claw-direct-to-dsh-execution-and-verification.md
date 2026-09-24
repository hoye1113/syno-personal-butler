# Claw 直通 DSH：剩余修复方案与验证方案（B4–E）

> 依据 [ADR 0007](../adr/0007-claw-direct-to-dsh.md) 与 [迁移计划](claw-direct-to-dsh-migration.md)。
> 当前基线：B1–B3 完成（暗发布），HEAD `1b7eadd`，8 个提交未 push。
> 本文件是 B4 之后的**执行与验收规范**；经 Owner 审查通过后，冲突处以本文件为准（并回写迁移计划链接）。

## 1. 通用执行与验证原则

- 每波固定节奏：实现 → L1/L2 自动门禁 → L3 真实 DSH → 提交（精确路径，不 push）。
- 迁移期一切新行为受 env 门控（`SYNO_CAPABILITIES_TOOLS`、`SYNO_CHAT_TOOLS`、`SYNO_CHANNEL_OWNER`）；任何时刻恰好一个 owner，禁止双投递。
- 生产行为只在 B5（工具面切换）与 Phase C（消息路径）改变；每次改变必须带 env 回滚与保留一个版本的旧路径。
- 验证分层：**L1** 单测/契约 → **L2** 静态断言（零引用、导入解析、路由/allowlist） → **L3** 真实 DSH（scratch 或生产 profile，真实模型/真实 vault） → **L4** 真机人工（Owner，按 §9）。

## 2. B4 修复方案：写治理与全量工具面（下一波，风险最高）

### 2.1 模块迁移到 `packages/syno-core/`

- 治理核心：`agent-host`、`job-store`、`policy`、`operation-registry`、`operation-executor`、`git-guard`。
- Today 依赖树：`today-service`、`goal-service`、`planner-service`、`signal-source-registry`、`priority-engine`、`output-lifecycle`、`settings-registry`。
- 其余按 import-check 闭包补齐：`session-safety`、`claim-evidence-service`、`effect-receipt-store`、`effect-reconciliation-case-store`/`worker`。
- 关键重构：把 `runtime.mjs` 中 host/executor 装配块（约 690–760 行）抽为参数化工厂 `createOperationHost({ store, executor, gitGuard, policy, validator, onCommitted, processLockRoot, deps... })`，Host 与 DSH 插件共用同一装配，禁止两套语义。
- 手法沿用 A1/B2/B3 codemod；每迁一批跑一次测试，附带 import-check 与非导入字符串扫描（防 `path.resolve("…")` 类误改）。

### 2.2 工具实现

- 注册 registry 全量面（按 `B4.2` 清单逐项决定 exposed）：`jobs.list`、`jobs.submit`、`today.read`、`knowledge.read`、`goals.list`、`claims.propose`、`evidence.propose`、`evidence.source_read`、`settings.adjust`（hidden 集保持隐藏策略与 Host 一致）。
- owner/allowedTools：Phase C 前用 `DEFAULT_OWNER_KEY="local-user"` + `channel="web"`（与 Host 单 owner 语义一致）；B5 接管时替换为会话映射。
- boundary：凡产生 Job 的调用仍走 `AgentHost.receive`（Policy → Job → worktree → Validator → GitGuard 全程不动）；`agentAdjustableBoundary`/`approvalBoundary` 语义在插件侧按 Host `ToolRegistry.execute` 同口径实现，禁止绕过。
- `today.read` 与 jobs 工具走 `createOperationHost` 实例；状态根（state/ops/worktree）默认 `PATHS`，测试可注入。

### 2.3 安全评审清单（B4 合并前必过）

- 模型可达面 = 已注册工具集合；无任意 shell/fs/git；vault/ops 写入仅经 Job + GitGuard 精确路径；源码根（`apps/contracts/config/scripts/tests`）硬拒绝保持不变。
- 工具输出脱敏：对象经 `tool-result-serializer`/`inspectRemoteContent` 同口径处理，禁止把敏感笔记正文回显。
- 插件进程与 Host 并发的锁边界：Job 锁（`processLockRoot`）、worktree 串行、知识索引原子写（已具备）。
- 评审产出：一份清单化结论（可达面、绕过路径、残余风险），随提交落 `ops/acceptance/`。

### 2.4 验证方案

- L1：新工具单测（读 + 写各 ≥ 2 例）；迁移后既有 job/policy/git/validator 测试全绿。
- L2：生成「registry 全量 vs 插件注册」对照清单，差异必须为零（hidden 白名单除外）。
- L3：真实 DSH 回合（scratch profile）——模型执行一次 `jobs.list` 与一次小改动 `jobs.submit`；Host 侧核对 Job 落库、worktree 隔离、精确路径提交、`diffHash` 与审计链。
- 通过标准：`pnpm test` + verify 绿；Job 审计链完整；无 `TOOL_APPROVAL_REQUIRED` 之外的意外错误。

## 3. B5 修复方案：canonical 名切换与 Bridge 删除

### 3.1 切换

- 单一开关 `SYNO_CHAT_TOOLS=bridge|plugin`；默认 bridge，切换后默认 plugin。
- 切换前置：B4 全量工具在真实 DSH 完成 shadow 对照（只读双跑结果一致；写类只执行一次并核对审计）。
- canonical 名接管：插件注册 `syno_*` 原名（去掉 `syno_core_` 前缀），工具集由 `syno-tool-sets.mjs` 清单驱动 `toolSet: core|all` 过滤。

### 3.2 删除清单

- 文件：`apps/syno/syno/syno-tool-bridge.mjs`、`config/deepseek-harness/syno-tool-bridge-plugin.mjs`、`FALLBACK_TOOLS`、`/api/syno/bridge/mcp` 与 `server-api-allowlist` 对应项、`SYNO_BRIDGE_CONTEXT_REQUIRED`/`_BUSY` 错误码与相关 journal、`tests/syno-tool-bridge.test.mjs`（改写为 in-process 契约测试）。
- 保留：ToolRegistry 元数据语义并入插件工具定义；`syno-tool-sets.mjs` 转为插件工具集清单。

### 3.3 capture sidecar

- `syno-capture.cordis.yml` 改挂 capabilities（`toolSet: all`）；workflow 授权经现有 WorkflowStore 解析；`coordinator.configure({ analyze })` 接入收录分析；sidecar 保持无 bash/fs/web 的隔离性。

### 3.4 索引双写策略（待决）

- 选项 A：插件与 Host 复用 `SYNO_RUNTIME_ROOT`（已原子写，接受后写覆盖）；选项 B：DSH 使用独立索引文件。
- 默认 A，切换前做并发重建压测（两进程同时 rebuild，读侧不出现半文件）。

### 3.5 验证方案

- L2：全仓 `SYNO_BRIDGE_CONTEXT_REQUIRED` 零引用；bridge 路由返回 404；allowlist 中 bridge 项消失。
- L3：**真实生产 profile**（非 scratch）完成：知识读、`fetch_url`、`capture.start`（经 sidecar 分析出 proposal）、`jobs.submit` 写审计；断网/限流下失败话术与旧路径一致。
- 回滚演练：`SYNO_CHAT_TOOLS=bridge` 回切 + 旧 bridge 一个版本内可恢复（演练记录随提交）。

## 4. Phase C 修复方案：微信通道内嵌（Claw 真正直连点）

### 4.1 实现

- 迁移（→ 插件或 core）：`weixin-ilink`（客户端/QR/poller/quarantine/typing/formatWx）、`channel-delivery-outbox`、`OwnerChannelTargetStore`、`accepted-request-*`、`channel-continuation-store`、`channel-intent-router`、`pending-decision` 渠道部分、`channel-conversation-handler` 的确定性路由（模型调用替换为 `followup`）。
- 会话接入：owner/thread → `syno` preset 会话（`agentPresets.resolve/acquireScope` + `agents.create` + `mount`）；冷会话 `agents.resume` + retry-once 处理与 Web controller 竞争。
- 出站：`session/event`（global）+ `agent/inbox/claimed` 关联 + `turn/end` 结算 + `assistant/message` 取文本，仅投递 `source.kind==="weixin"` 的回合；typing/ACK/final 插件独占。
- B3 延后项接入：浏览器升级（`BrowserCaptureAdapter`）+ 「继续」续办（`ChannelContinuationStore`）。
- 维护页：按已定 D2，Host 保留 `/maintenance/weixin` UI，插件暴露受控 loopback API。
- 单实例：微信 poller 进程锁；`SYNO_CHANNEL_OWNER=host|dsh` 单 owner 切换，Host 路径保留一个版本。

### 4.2 验证方案

- L1：路由/出站/Outbox/续办/typing 单测；断线重连与重启恢复。
- L3：真实 DSH 内：微信消息进入会话、模型回复仅回微信不串 Web、typing/ACK 无重复。
- L4（Owner，真实微信）：普通对话、多轮工具、链接续读「继续」、灵感卡「有用/没用」、图片（含未就绪降级）、扫码重绑、Host 重启后恢复、Web+微信同会话并发。
- 通过标准：`#19`/假超时错误面无对应机制；无第二份回复；失败回执如实且不重发。

## 5. Phase D 修复方案：主动运营内嵌

- 迁移：`signal-engine`、`signal-source-registry`、`priority-engine`、`proactive-orchestrator`、outbox drain、`cancellable-keyed-scheduler` → `@syno/dsh-proactive` 插件；定时器与 `ProcessFileLock` 保留；不与 `@deepseek-ai/dsh-schedule` 会话内提醒混用。
- 投递经通道插件（不再走 Host `channels.send`）；settings 发布闸门由核心库读取，控制面只提供配置入口。
- 验证：L1 既有 proactive 测试迁移全绿；L3/L4 晨报（08:30）、晚报（22:00）、灵感卡（12:30）真实到达与反馈落账；投递健康指标与失败重试语义不变。

## 6. Phase E 修复方案：Host 收缩与清理

- Host 仅保留：DPAPI 凭据、维护页、provider/settings 配置入口、诊断/审计、DSH supervisor 与 profile 生成。
- 删除：`deepseek-harness-web-client.mjs`（chat 结算）、JSON-RPC chat 回退（capture 保留）、`mobile-delivery-mode` 等逐项评审；空包与残留清理。
- 文档同步：`ARCHITECTURE.md`、`AGENTS.md`、`README.md`、`OPERATIONS.md`、`NEXT_SESSION.md`、`KNOWN-LIMITATIONS.md`、`docs/INDEX.md`。
- 验证：`pnpm test`/verify/`git diff --check` + 真实渠道验收；回滚分支保留一个版本后经 Owner 批准删除。

## 7. 独立存量问题

- `tests/proactive-reliability.test.mjs:1096` 投递等待超时：`waitForWorkflowDuplicate` 上限 400×5ms=2s，负载下不够。修复：改为 deadline 15s 的轮询（保留快速返回特性）。
- 验证：该文件连跑 3 次 + 全量套件 2 次 + 6 并发复现；全绿且无超时。
- （`process-lock` 并发 flake 已在 `1b7eadd` 修复，不再列入。）

## 8. 验证方案总表

| 层 | 手段 | 命令/入口 | 通过标准 |
|---|---|---|---|
| L1 | 单测/契约 | `pnpm test` | 0 fail，计数随新增只增 |
| L2 | 静态断言 | `node scripts/verify-repository.mjs`、`check-active-docs`、import-check、零引用 grep | 全绿 + 目标字符串零残留 |
| L3 | 真实 DSH | `scripts/spike-capabilities.mjs`（待入仓）+ scratch/生产 profile | 工具调用与事件结算符合预期，无插件激活错误 |
| L4 | 真机人工 | §9 清单 | 见各项期望 |

## 9. Owner 验收清单

| # | 项 | 操作 | 期望 | 失败处置 |
|---|---|---|---|---|
| 1 | 冷启动回归（可选） | 重启/注销后 `pnpm windows:status` | running=true，`/api/syno/health` ready，微信可收发 | `pnpm windows:restart` |
| 2 | B5 工具面切换 | 按发布单设置 `SYNO_CHAT_TOOLS=plugin` 并重启 | 会话工具正常、写审计完整 | 回切 `bridge` |
| 3 | Phase C 微信直连 | 按 §4.2 真实微信矩阵 | 全部通过，无串回复/重复 ACK | 切回 `SYNO_CHANNEL_OWNER=host` |
| 4 | Phase D 主动投递 | 观察晨报/晚报/灵感卡 | 准点到达、反馈可落账 | 关闭主动投递开关 |

## 10. 回滚总表

| 波次 | 回滚开关 | 状态影响 |
|---|---|---|
| B4 | `SYNO_CAPABILITIES_TOOLS` 取消即可（生产面未变） | 无 |
| B5 | `SYNO_CHAT_TOOLS=bridge` + 保留一个版本旧 bridge | 工具面回旧 |
| C | `SYNO_CHANNEL_OWNER=host` + 旧轮询路径保留一个版本 | 消息面回旧（禁止同时开启） |
| D | `notifications.proactiveDeliveryEnabled=false` + Host drain 路径保留一个版本 | 主动停发 |

## 11. 开放决策（请审查时给结论）

1. spike 运行器入仓为 `scripts/spike-capabilities.mjs`（当前在 `%TEMP%`，不入仓则每个会话需重写）。
2. §3.4 索引双写：A（复用 runtime root）vs B（独立索引文件）。
3. B4 的 hidden 工具（`claims/evidence/settings`）是否纳入插件全量面，还是维持仅 Host 内部可达。
4. Phase C 前是否先做一次 D1 凭据路径的安全评审（插件内存解密 vs Host 代理）并出具结论。

## 变更记录

- 2026-09-24：首版，覆盖 B4–E、独立存量问题、验证矩阵、Owner 验收与回滚。
