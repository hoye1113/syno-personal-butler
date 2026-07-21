---
title: "ACP 接入方案的多样性与局限性 — 实践踩坑备忘"
tags: ["ai_agent", "ai_coding", "notes"]
legacy_tags: ["ai_agent", "ai_coding", "notes"]
created: "2026-05-21"
source: "manual - ai_coding - acp - notes"
description: "Hermes Agent Ultra 与 FlowyClaw / AI_Router ACP 协议集成踩坑——ACP"
knowledge_state: captured
link_status: connected
source_path: "01-Areas/Programming and Engineering/ACP集成问题与踩坑经验.md"
source_sha256: "c3ba7735954fee5ac28c156ad4e46165e86a6f9246290c14ecae44ddbddd2f5f"
migration_id: "migration-20260720-64e79771"
author:
  - "[[vault 主人]]"
---

# ACP 接入方案的多样性与局限性 — 实践踩坑备忘

> **文档目的**：汇总 Hermes Agent Ultra 与 FlowyClaw / AI_Router（樱桃）相关讨论及上游踩坑经验，供后续接入 ACP（含 IDE、桌宠、外部 LLM）时对照，避免重复踩坑。  
> **撰写日期**：2026-05-21  
> **状态**：经验总结（非已实现规格）；实现状态以代码为准。  
> **主要参考**：  
> - FlowyClaw：`D:\workSpace\git_clone_test\FlowyClaw\docs\acp\AI_Router\`  
>   - `acp-protocol-communication.md`  
>   - `acp-responsibility-boundary.md`  
>   - `acp-agent-server-issues.md`  
>   - `acp-connection-troubleshooting.md`  
> - 本仓库：`crates/hermes-acp/`、`crates/hermes-cli/src/commands.rs`（`handle_cli_acp`）  
> - 站点文档：`website/docs/user-guide/features/acp.md`、`website/docs/developer-guide/acp-internals.md`

---

## 1. 核心结论（先读这段）

1. **ACP 是协议（JSON-RPC + NDJSON），不是某一种传输方式。** 同一套方法可以跑在 stdio、WebSocket、未来的 HTTP+SSE 上。  
2. **`spawn` 与 `stdin/stdout` 不是二选一**：spawn 解决「谁创建子进程」；stdio 解决「父子进程怎么传字节」。樱桃场景往往 **既不 spawn 对方，也不用 stdio**。  
3. **Hermes 仓库里已有两套「ACP」用法，角色相反**：  
   - **对外**：`hermes acp start` — Hermes 当 **Agent（Server）**，IDE 当 Client，**stdio**。  
   - **对内**：`copilot-acp` — Hermes 当 **Client**，spawn Copilot 当 **Agent**，**stdio**。  
4. **樱桃 / FlowyClaw 用的是第三条路**：两个独立桌面应用，**WebSocket + 发现文件**，与 `hermes acp start` **不能直接互通**。  
5. **端口在 LISTENING ≠ ACP 可用**（FlowyClaw acpx 时代血泪教训）。  
6. **RPC 返回 ≠ 业务完成**；流式与 `stopReason` 必须靠事件驱动（或明确的延迟 result 语义）。

---

## 2. 概念辨析：spawn、stdio、WebSocket、SSE

### 2.1 各是什么

| 概念 | 含义 | 典型用途 |
|------|------|----------|
| **spawn** | 父进程创建子进程，建立父子生命周期绑定 | IDE 启动 `hermes acp`；Hermes 启动 `copilot --acp --stdio` |
| **stdin / stdout / stderr** | 操作系统为父子进程连接的管道；stderr 常专用于日志 | ACP NDJSON 走 stdin/stdout；日志走 stderr |
| **WebSocket** | 本机或网络上的全双工长连接，**不要求**父子关系 | FlowyClaw ACP Agent Server ↔ 樱桃 |
| **HTTP + SSE** | 客户端 POST 上行 + SSE 下行（单向推流） | ACP 官方 Streamable HTTP 展望；企业防火墙友好 |

### 2.2 关系图

```text
                    ┌─────────────────────────────────────┐
                    │     ACP 协议层（JSON-RPC 2.0）       │
                    │  initialize / session/* / prompt …   │
                    │  + session/update 通知               │
                    └─────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
   spawn + stdio                 WebSocket                    HTTP + SSE
   (父子管道)                  (独立进程连端口)              (POST + EventSource)
          │                           │                           │
   IDE↔Hermes                  樱桃↔FlowyClaw                 未来 / 新 Client
   Hermes↔Copilot
```

### 2.3 常见误解

| 误解 | 事实 |
|------|------|
| 「stdio 不用回传结果」 | 必须回传：stdout 上既有 **result**，也有 **notification**（`session/update`） |
| 「WS 比 stdio 高级所以替代 stdio」 | 载荷可相同；选型看 **进程关系** 与 **Client 形态**，不是协议高低 |
| 「改 SSE 就不用改樱桃」 | 除非 **WS 与 SSE 并存** 且樱桃仍用 WS；仅 SSE 会迫使樱桃改连接层 |
| 「spawn 和 WS 是两种 ACP」 | 是两种 **部署拓扑**；协议方法名应保持一致（但存在 `prompt` vs `session/prompt` 别名问题） |

---

## 3. 三种典型拓扑（实践中最常遇到）

### 3.1 拓扑 A：IDE ↔ Hermes（子进程 + stdio）

```text
┌──────────────┐  spawn("hermes", ["acp","start"])   ┌─────────────────┐
│ VS Code / Zed │ ─────────────────────────────────► │ Hermes 子进程    │
│ (ACP Client)  │                                    │ (ACP Agent)      │
└──────────────┘                                    └─────────────────┘
        │ write stdin  / read stdout  (NDJSON)              │
        └──────────────────────────────────────────────────┘
```

**特点**：

- 编辑器 **负责启动与监控** Hermes；子进程退出即会话结束。  
- 配置方式：`command` + `args`（见 `website/docs/user-guide/features/acp.md`）。  
- **Hermes Ultra 现状**：`crates/hermes-acp` + `hermes acp start`，已实现。

**局限**：

- 仅适用于 **能 spawn 子进程** 的 Client（IDE、部分 CLI 宿主）。  
- **樱桃桌宠** 通常 **不会** spawn Hermes，故不适用。  
- 默认 **不监听端口**，无 `acp-port.json` 发现机制。

---

### 3.2 拓扑 B：Hermes ↔ Copilot CLI（反向 spawn + stdio）

```text
┌─────────────────┐  spawn("copilot", ["--acp","--stdio"])  ┌──────────────────┐
│ Hermes 主进程    │ ───────────────────────────────────────► │ Copilot 子进程  │
│ (ACP Client)    │                                         │ (ACP Agent)      │
└─────────────────┘                                         └──────────────────┘
```

**特点**：

- **角色与拓扑 A 对调**：Hermes 要 LLM 能力，把 Copilot 当 **推理后端**。  
- 配置：`copilot-acp`、`acp_command` / `acp_args`（`agent_loop.rs` 中 `resolve_runtime_command_args`）。  
- 环境变量：`HERMES_COPILOT_ACP_COMMAND`、`HERMES_COPILOT_ACP_ARGS`（默认 `--acp --stdio`）。

**局限**：

- 与「编辑器集成」无关；不能替代 `hermes acp start`。  
- 依赖本机安装 Copilot CLI；路径与版本需运维关注。

---

### 3.3 拓扑 C：樱桃（AI_Router）↔ FlowyClaw（独立进程 + WebSocket）

```text
┌─────────────┐     ws://127.0.0.1:38792      ┌──────────────────────────────┐
│ AI_Router   │ ◄──── NDJSON JSON-RPC ──────► │ FlowyClaw Electron 主进程     │
│ (ACP Client)│                               │ AcpAgentServer（独立 WS）       │
└─────────────┘                               │ 桥接 → Gateway chat.send       │
      ▲                                       │ 共享 main session              │
      │ 读 ~/.flowyclaw/acp_config/AI_Router/  └──────────────────────────────┘
      │     acp-token.json / acp-port.json
```

**特点**（FlowyClaw v2.0+）：

- **不依赖 acpx 插件**；固定端口 **38792**（可回退 38793–38795）。  
- **发现文件**：`acp-token.json`、`acp-port.json`。  
- **共享会话**：`agent:main:main`，GUI 与语音输入同一上下文。  
- **prompt 只带当前句**；历史由 Server 从 main session 组装。

**Hermes Ultra 现状**：**未实现** 拓扑 C（无 WS Server、无 token/port 桥、无 `session/prompt` 别名等）。

---

## 4. 传输方式对比：stdio / WebSocket / SSE

| 维度 | stdio（spawn） | WebSocket | HTTP + SSE |
|------|----------------|-----------|------------|
| 进程关系 | 必须父子 | 独立进程即可 | 独立进程即可 |
| 双向通信 | 天然双向 | 单连接双向 | POST 上行 + SSE 下行 |
| 发现机制 | 编辑器配置 command | port/token 文件 | base URL + 会话 id |
| 重连 | 通常需父进程 respawn | Client 指数退避重连 | SSE 重连 + 会话状态对齐 |
| 调试 | 较难直接抓管道 | `netstat`、WS 客户端 | curl POST + 看 SSE |
| 防火墙 | 无端口暴露 | 本机 loopback 一般无感 | 企业 HTTP 友好 |
| FlowyClaw 结论 | acpx+stdio 已废弃 | **当前生产路径** | 等官方 Streamable HTTP 稳定后再加 |
| Hermes 结论 | IDE 路径已实现 | 接樱桃需新增 | 不建议首版替代 WS |

FlowyClaw 文档建议：**WebSocket 与 HTTP+SSE 双端点共存**（未来），樱桃继续用 WS，新 Client 可选用 SSE。

---

## 5. Hermes Agent Ultra 当前 ACP 实现清单

### 5.1 Crate 结构（`hermes-acp`）

| 模块 | 职责 |
|------|------|
| `server.rs` | NDJSON 循环；`run()` = stdin/stdout；`run_on()` 可注入读写端 |
| `handler.rs` | `HermesAcpHandler`：协议方法分发、`prompt` 执行、slash 拦截 |
| `session.rs` | 内存会话：id、cwd、history、phase、usage；可选 `with_persist_callback` |
| `events.rs` | `EventSink`、`AcpEvent`（thinking、tool、message_delta 等） |
| `permissions.rs` | 终端危险操作审批桥 |
| `protocol.rs` | 类型与方法枚举 |

### 5.2 已实现的方法（节选）

- 生命周期：`initialize`、`authenticate`（**当前为直接成功，无 token 校验**）  
- 会话：`session/new`、`session/load`、`session/resume`、`session/fork`、`session/list`、`session/cancel`  
- 对话：**`prompt`**（注意：非 `session/prompt`）  
- 配置：`session/set_model`、`session/set_mode`、`session/set_config`  
- 遗留：`conversation.create`、`message.send` 等  

### 5.3 CLI 集成（`hermes acp start`）

- 加载配置，注册工具 / cron / skills。  
- `CliAcpPromptExecutor` → `AgentLoop::run()`（**非** `run_stream`）。  
- 结束后 `EventSink` 推送 `message_delta` / `message_complete`，再返回 `{ stop_reason: end_turn }`。

### 5.4 与 FlowyClaw / 樱桃的差异（兼容性缺口）

| 项目 | FlowyClaw / 樱桃 | Hermes 现状 |
|------|------------------|-------------|
| 传输 | WebSocket | 仅 stdio |
| 方法名 | `session/prompt`、`session/ping` | `prompt`；无 `session/ping` |
| 认证 | token 校验，失败 -32001 | `authenticate` 恒成功 |
| `session/update` 格式 | `{ sessionId, update: { sessionUpdate, content } }` | `params` 多为内部 `AcpEvent` 形状 |
| 流式 | Gateway 事件驱动，result 延迟 | 整轮 `run()` 后批量推送 |
| 发现文件 | `~/.flowyclaw/acp_config/AI_Router/` | 无 |
| 主会话共享 | `agent:main:main` | ACP 独立 `SessionManager` |
| `session/cancel` | ACP 清理 +（建议）Gateway abort | 主要改 phase，未接 interrupt |

---

## 6. FlowyClaw 踩坑实录（宝贵经验）

> 以下整理自 `acp-connection-troubleshooting.md`、`acp-agent-server-issues.md`、`acp-protocol-communication.md` §10–11。

### 6.1 旧方案 acpx 失败的三根因（历史但仍需警惕）

| # | 根因 | 现象 | 教训 |
|---|------|------|------|
| 1 | acpx 不认 `args` 键 | 插件启动失败 | 外部插件配置 schema 必须对齐；不要假设「多写个字段没事」 |
| 2 | `acp.defaultAgent` 与 `acpx.config.agents` ID 不一致 | 端口在听但无 ACP 处理 | **三处 agent ID 必须一致** |
| 3 | `sanitizeOpenClawConfig()` 把 `acpx` 从 allowlist 删掉 | 启动早期不写 token 文件 | 配置消毒顺序会影响 **isAcpxEnabled** 一类开关 |

**核心教训**：`netstat` 看到 **LISTENING ≠ ACP 服务可用**；樱桃表现为 `ws_error`、约 7s 超时、无 `ws_open`。

### 6.2 v2.0 独立 ACP Agent Server 的关键决策

- 端口 **38792** 与 Gateway **38789** 分离。  
- **不依赖 acpx**；主进程内 WS Server + `chat.send` RPC + notification 桥接。  
- **共享 main session**，语音与 GUI 上下文一致。  
- **事件驱动完成**：`session/prompt` 的 RPC result 以 `state:final` / lifecycle `end` 为主，`chat.send` resolve 仅表示入队。

### 6.3 实现边界问题清单（P0–P3 摘要）

| 级别 | 问题 | 建议 |
|------|------|------|
| P0 | `authenticate` 异步竞态，可双响应 | `authenticating` 中间态或锁 |
| P0 | v2 事件解析 fall-through 到 legacy，重复 `session/update` | `stream` 存在则不走 legacy |
| P0 | `sessionKey` 过滤用 truthy 判断，漏过滤 | 仅放行明确匹配 main session 的事件 |
| P1 | `session/cancel` 不中止 Gateway agent | 调用 `chat.abort` 等等效 RPC |
| P1 | `deliver: false` 导致 GUI 只见回复不见用户句 | 产品决策：deliver 或 UI 标注来源 |
| P2 | 崩溃残留 token/port | 启动时先清理再写入 |
| P2 | 端口占用无回退 | 38792–38795 写入实际 port |
| P2 | WS `bufferedAmount` 背压 | 高频 chunk 时节流或合并 |

### 6.4 可复用模式（不限于 ACP）

1. **事件驱动完成**：异步「已接受」≠「已完成」。  
2. **Cleanup 闭包 + completed 标志**：多路径终止（完成/取消/超时/断连）幂等清理。  
3. **Legacy 格式兼容**：新格式优先 + 旧格式 fallback，避免静默丢事件。  
4. **显式状态机**：非法转换返回 -32600，而非进入不确定态。

### 6.5 官方 SDK 结论（FlowyClaw 文档 §11）

- SDK 提供方法分发与 `ndJsonStream()` 等，**不提供** WebSocket/HTTP Server。  
- **传输层需自研**；Hermes 若接樱桃，应在 Rust 侧实现 WS + 发现文件，而非等待 SDK 带 Server。

---

## 7. 为什么樱桃不用 stdio 连 Hermes？

| 原因 | 说明 |
|------|------|
| 无 spawn 关系 | 樱桃与 Hermes 是用户分别启动的桌面应用 |
| 需要重连 | 桌宠需指数退避、ping/pong；stdio 随子进程死亡 |
| 需要发现 | 读 `acp-port.json` / `acp-token.json`，而非编辑器里的 command 配置 |
| 需要共享宿主会话 | 与 FlowyClaw GUI 共用 main session；stdio 子进程模型默认隔离 |
| 产品已按 WS 实现 | 改 Hermes 为仅 SSE/stdio 而不改樱桃则无法互通 |

**结论**：接樱桃应做 **FlowyClaw 兼容的 WS Agent Server**，而不是让樱桃 spawn `hermes acp start`。

---

## 8. SSE 是否值得做、对樱桃的影响

### 8.1 潜在好处

- HTTP/SSE 更易过企业防火墙；curl 调试方便；浏览器 Client 更简单。

### 8.2 局限

- ACP 双向：SSE 仅负责下行，上行仍需 POST；会话绑定与重连更复杂。  
- ACP Streamable HTTP **规范未稳定**；过早实现易成「方言」。  
- **樱桃当前仅 WS**：只上 SSE 必须改樱桃连接层。

### 8.3 建议

- **首版接樱桃**：WebSocket + 与 FlowyClaw 对齐的 NDJSON 与方法名。  
- **SSE**：作为第二条传输，与 WS **共存**，待规范与 SDK 成熟后再上。

---

## 9. 接入方案选型矩阵

| 你的目标 | 推荐拓扑 | Hermes 现状 | 缺口 |
|----------|----------|-------------|------|
| VS Code / Zed 插件 | A：stdio spawn | `hermes acp start` | 流式、`session/update` 格式与 IDE SDK 对齐 |
| GitHub Copilot 账号推理 | B：spawn Copilot | `copilot-acp` | 运维 CLI 路径 |
| 樱桃 / AI_Router | C：WS + 发现文件 | 未实现 | WS Server、token/port、`session/prompt`、事件桥、可选 main session |
| 浏览器-only Client | HTTP+SSE（未来） | 未实现 | 规范 + 双传输 |

---

## 10. Hermes 接樱桃的推荐实施顺序（规格级，非承诺排期）

### Phase 0 — 对齐清单

- 对照 FlowyClaw `acp-agent-server.ts` 列出方法、错误码、`_meta`、心跳。  
- 明确 cherry 读取路径：兼容 `~/.flowyclaw/acp_config/AI_Router/` 或扩展 `~/.hermes-agent-ultra/acp_config/`。

### Phase 1 — 最小可联调（P0）

- `hermes-ultra acp serve --ws`（`127.0.0.1:38792`，端口回退）。  
- 写 token/port；`authenticate`；`session/prompt` 别名；`session/ping`。  
- `session/update` 使用 `{ sessionId, update: { sessionUpdate, content: { type, text } } }`。  
- 串行 prompt；authenticate 防重入。

### Phase 2 — 体验

- `CliAcpPromptExecutor` → `run_stream`；`session/cancel` → interrupt。  
- 事件驱动 `stopReason`（不要 `run()` 立即 result）。

### Phase 3 — 产品化

- 可选共享 `sessions.db` 主会话；`doctor` 检查 ACP；parity fixtures。

---

## 11. 联调与排障检查表

### 11.1 FlowyClaw / 樱桃侧（摘自上游文档）

```powershell
# 端口
netstat -ano | findstr "38792"

# 发现文件
Get-Content $env:USERPROFILE\.flowyclaw\acp_config\AI_Router\acp-port.json
Get-Content $env:USERPROFILE\.flowyclaw\acp_config\AI_Router\acp-token.json

# 樱桃日志（路径以 AI_Router 安装为准）
# %APPDATA%\ai-router\logs\acp\acp-YYYY-MM-DD.log
# 关注：ws_open / ws_error / connection_failed
```

### 11.2 Hermes IDE stdio 侧

```powershell
# 前台启动（stdout 勿重定向到文件时再跑别的测试）
hermes-ultra acp start

# 配置与凭证
hermes-ultra doctor
hermes-ultra model
```

### 11.3 端到端成功信号

1. `initialize` → `authenticate` → `session/new` 返回 `sessionId`  
2. `session/prompt` 或 `prompt` 期间多条 `session/update`  
3. 最后收到 result `{ stopReason: "end_turn" }`（或 `tool_use` 等）  
4. 同一 `sessionId` 第二轮对话能带上文（若启用 shared session）

---

## 12. 职责边界（Hermes 版，对照 FlowyClaw 三方文档）

| 角色 | 职责 |
|------|------|
| **ACP Agent Server**（Hermes 扩展） | 协议、认证、会话映射、流式桥接、心跳 |
| **AgentLoop + tools + memory** | 实际推理与工具（等同 FlowyClaw Gateway agent） |
| **ACP Client**（IDE / 樱桃） | 连接、重连、权限 UI、`requestPermission` |
| **CLI TUI / Gateway**（可选） | 展示外部 Client 状态；共享主会话 |

错误域分离：

- **进程级**：端口占用、spawn 失败 → CLI / 安装文档。  
- **会话级**：认证失败、并发 prompt → ACP Server 返回 -32001 / -32603。  
- **RPC 级**：`chat.send` 失败 → 映射为 ACP internal error，勿与「端口在听」混淆。

---

## 13. 术语表

| 术语 | 含义 |
|------|------|
| ACP | Agent Client Protocol；Agent 与 Client 间 JSON-RPC 协议 |
| Agent（Server） | 提供 `initialize`、`session/*`、`prompt` 的一方（Hermes 在 `acp start`） |
| Client | 发起连接的一方（IDE、樱桃、或 Hermes 在 copilot-acp） |
| NDJSON | 每行一个 JSON 对象，LF 结尾 |
| acpx | OpenClaw 内置 ACP 插件（FlowyClaw 已弃用） |
| main session | FlowyClaw `agent:main:main`；GUI 与樱桃共享 |
| spawn | 创建子进程；与传输载体正交 |
| 事件驱动完成 | 以流式事件 `final` / lifecycle `end` 作为 prompt 结束信号 |

---

## 14. 文档维护

| 日期 | 变更 |
|------|------|
| 2026-05-21 | 初版：汇总对话上下文 + FlowyClaw AI_Router 四篇文档踩坑经验 |

**代码变更后请同步更新**：§5 Hermes 实现清单、§9 选型矩阵、§10 实施顺序。

---

## 15. 延伸阅读（本仓库）

- [README_QUICKSTART.md](../../README_QUICKSTART.md) — `hermes-ultra` 启动与 doctor  
- [AGENTS.md](../../AGENTS.md) — 移植与 parity 约定  
- [website/docs/user-guide/features/acp.md](../../website/docs/user-guide/features/acp.md) — IDE 集成（偏 Python 叙述，Rust 以 `hermes acp start` 为准）  
- [website/docs/developer-guide/acp-internals.md](../../website/docs/developer-guide/acp-internals.md) — 协议内部结构  

**外部参考（FlowyClaw，只读路径）**：

- `FlowyClaw/docs/acp/AI_Router/acp-protocol-communication.md`  
- `FlowyClaw/docs/acp/AI_Router/acp-responsibility-boundary.md`  
- `FlowyClaw/docs/acp/AI_Router/acp-agent-server-issues.md`  
- `FlowyClaw/docs/acp/AI_Router/acp-connection-troubleshooting.md`


## 相关阅读

- [[MOC - Loock AI 全栈课程]] — Loock AI 全栈课程（含 LangGraph.js 实战）

