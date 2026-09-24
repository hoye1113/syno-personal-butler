# ADR 0007：Claw 直通 DSH——通道与能力内嵌

## 状态

提议（Proposed），待 Owner 批准后实施。触发：Owner 2026-09-24 方向决策——微信 Claw 直接接入 DSH，取消 Syno Host 在消息与工具路径上的中介层；范围＝通道与能力都搬进 DSH 插件，Host 退为控制面。分期与门禁见 [Claw 直通 DSH 迁移计划](../plans/claw-direct-to-dsh-migration.md)。

## 背景

现状分层（见 `docs/ARCHITECTURE.md`）：

```text
微信 Claw → Syno Host（iLink 轮询 / ChannelConversationHandler / 自持会话编排与结算）
          → deepseek-harness-web-client（HTTP RPC + /api/remote.mux WS）→ DSH 会话（3088）
DSH 模型 → MCP Tool Bridge（syno_* + bind/release HTTP）→ Syno Host 能力
```

Syno 在 DSH 之外又实现了一层「会话循环 + 事件结算 + 工具上下文」，生产已兑现多类信息错误：

- `#19` turn 结算竞态：工具轮次只投递 step-1 预告文本、step-2 最终答案被丢弃（`NEXT_SESSION.md`）；
- `e9a0c0b`：turn 事件抢跑 prompt 响应，产生假超时；
- `SYNO_BRIDGE_CONTEXT_REQUIRED` / `SYNO_BRIDGE_CONTEXT_BUSY`（`apps/syno/syno/syno-tool-bridge.mjs:161-167`）：MCP 调用缺少 bind 的 owner/thread 上下文或被并发占用；
- 微信 ACK/失败回执需跨 Host 与 DSH 两层去重（`docs/plans/claw-only-headless-remediation.md` 遗留追溯项）。

根因：任何一层跨进程协议翻译都会丢信息。而 DSH 已提供原生 seam，无需修改 upstream：

- 会话与消息：`ctx.sessions`、`ctx.agents.create/resume/get`、`agent.followup/steer`、`createUserMessage`（`source` 可按插件扩展）；
- 事件：`ctx.on('session/event', {global:true})`、`agent/inbox/claimed`（消息↔回合关联）、`turn/end`、`agent/assistant-stream`、`ctx.sessions.flush`；
- 工具：`ctx.tools.register(defineTool(...))`，handler 原生携带 `exec.agent`（会话上下文）；
- 定时：`@deepseek-ai/dsh-schedule` 已在 syno profile 挂载（`packages/syno-dsh-plugin/cordis.patch.yml:81-82`），模式为 timer + `agent.runMaintenance` + `followup`；
- 挂载：Syno 自有 bundle patch + profile `node_modules` 链接（`apps/syno/syno/syno-dsh-profile.mjs`），生产 profile 禁 marketplace 插件。

DSH 没有 per-session channel/participant 抽象，也不提供 webhook 回复通道；微信通道需按 ACP 的既有范式（订阅事件 + `inbox/claimed` 关联 + `turn/end` 结算）在插件内自持，这属于插件本地设计，不需要 upstream 改动。

## 决策

1. **微信通道内嵌**：新插件 `@syno/dsh-channel-weixin` 在 DSH 进程内持有 iLink 客户端、轮询、扫码绑定、去重、typing/ACK、`ChannelDeliveryOutbox`、Owner 目标与续办存储。入站以 `createUserMessage`（新增 `source.kind:"weixin"`）经 `agent.followup/steer` 进入 `syno` preset 会话；出站以 `agent/inbox/claimed` 关联、`turn/end` 结算、`assistant/message` 取最终文本，只投递 source=weixin 的回合。确定性路由（决策门、链接续读、灵感反馈、意图路由）迁入通道插件，调用共享核心库的领域服务。
2. **能力内嵌**：新插件 `@syno/dsh-capabilities` 以 `defineTool` 注册现有 core 工具集（`knowledge.search/read_snippet/fetch_url`、`today.read`、`capture.start/status/list_pending`、`jobs.list/submit`、`image.read`、`inspiration.record_feedback`）；会话与渠道上下文从 `exec.agent.session.id` 原生取得。删除 MCP Tool Bridge、bind/release、`FALLBACK_TOOLS` 与全部 `SYNO_BRIDGE_CONTEXT_*`。
3. **写入治理下沉为共享核心库** `packages/syno-core`：Policy → Job → 隔离 worktree → Validator → GitGuard → 精确路径提交，语义不变；由插件进程内调用，Host 不再代执行写路径。
4. **主动运营内嵌**：新插件 `@syno/dsh-proactive` 保留 `SignalEngine`/`PriorityEngine`/`ProactiveOrchestrator`/Outbox 语义与 `ProcessFileLock`，经通道插件投递；不与 `@deepseek-ai/dsh-schedule` 的会话内普通提醒混用（维持 `docs/OPERATIONS.md` 现有判据）。
5. **Host 退为控制面**：保留 DPAPI 凭据、`/maintenance/weixin` 扫码页、provider/settings 配置入口与诊断审计、DSH 子进程生命周期（supervisor/profile 生成）。不再承载微信轮询、会话结算、工具桥与主动编排；消息与工具路径不经 Host。
6. **收录分析 sidecar 保留隔离**：无 bash/fs/web 的 JSON-RPC 进程维持（安全边界不变），工具面改挂 `@syno/dsh-capabilities`（workflow 授权经现有存储解析），不并入生产会话。

目标数据流（消息与工具在单进程内闭环）：

```text
微信 iLink ⇄ @syno/dsh-channel-weixin（DSH 进程内）
                 │ followup(createUserMessage, source=weixin)
                 ▼
           DSH 会话（syno preset；与 3088 Web 同一会话）
                 ▼
           @syno/dsh-capabilities → packages/syno-core
                 ▼
    Policy → Job → worktree → Validator → GitGuard → vault/ops
```

## 不变量

- DSH upstream 不修改、不 vendoring；只经 Syno 自有 bundle patch 与 profile `node_modules` 链接。
- permission 表保持 `workspace-write` + `approval: never`；禁止 `danger-full-access`；不引入动态 MCP；模型链不变。
- vault/ops 写入仍走 Job/Validator/GitGuard 精确路径提交；源码根（`apps/contracts/config/scripts/tests`）硬拒绝；`code_change`/`system_control` 无条件拒绝。
- 凭据不出现在 DSH 配置、子进程环境、日志与工具输出；微信凭据仍为 `%LOCALAPPDATA%\Syno\credentials` 下 DPAPI 密文，插件经既有 `runDpapi` 助手在内存解密（待决项 D1）。
- 单一通道 owner：微信 poller 进程锁保证同一时刻仅一个进程收发；迁移期 Host/DSH 二选一，禁止双投递。
- 用户可见 ACK 仅在请求进入可恢复事实源后发送；最终结果默认回原始渠道；typing/ACK/final 由插件独占（禁止双 ACK）。
- `http://127.0.0.1:3088` 仍是特权会话面（`docs/OPERATIONS.md:127`）；本迁移不放宽控制面与维护页权限。

## 被替代与删除（迁移完成后）

| 现状 | 归宿 |
| --- | --- |
| `deepseek-harness-web-client.mjs`（chat 结算） | 删除，由通道插件事件订阅替代 |
| `syno-tool-bridge.mjs`、`syno-tool-bridge-plugin.mjs`、`/api/syno/bridge/mcp`、`FALLBACK_TOOLS` | 删除，由 in-process 工具替代 |
| `channel-conversation-handler.mjs` 的 cognitive-runtime 调用 | 确定性路由迁入通道插件/核心库 |
| Host 微信轮询与回复接线（`runtime.mjs`） | 迁入通道插件 |
| `proactive-orchestrator` 与 outbox drain 的 Host 接线 | 迁入主动插件 |
| `deepseek-harness-jsonrpc-client` 的 chat 回退 | Phase E 逐项评审（capture 保留） |
| 空包 `packages/syno-dsh-client`、Web 工作台残留 | 删除 |

## 兼容性与回滚

- 迁移期 env 双轨：`SYNO_CHANNEL_OWNER=host|dsh`、`SYNO_CHAT_TOOLS=bridge|plugin`；任何时刻恰好一个 owner，shadow 阶段禁止第二份回复（沿用 claw-only 计划的约束）。
- 持久状态（Outbox、Session 绑定、Proactive Ledger、AcceptedRequest）格式不变；插件复用现有 store，AD005 迁移政策适用。
- 回滚 = 切回 env + 重启；插件必须释放进程锁、停止轮询，Host 恢复旧路径。
- 完成定义：相关错误码在生产代码零引用（静态断言）；真实微信收发、扫码重绑、主动投递、写入 Job 审计全部通过。

## 后果

- 正面：消息与工具上下文不再跨进程翻译；结算竞态、假超时、`SYNO_BRIDGE_CONTEXT_*` 的机制消失；通道与能力直接使用 DSH 官方事件与工具契约。
- 负面/风险：DSH 进程将持有微信凭据（内存）与 Git 写能力，爆炸半径增加，需专项安全审查；插件绑定 Cordis/DSH API，升级需契约测试并固定 `SYNO_DSH_ROOT`；Host/DSH 职责重新划界，需要一次性文档迁移。
