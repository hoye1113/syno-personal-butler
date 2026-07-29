# OpenCode 1.18.2 身份能力研究

日期：2026-07-29（Asia/Shanghai）

## 结论

- `OpenCodeHttpClient.sendMessage()` 使用 Session ID 作为路径身份；请求体包含固定 `agent`、`model`、`tools` 和消息 parts，没有稳定的业务调用 ID 字段。
- OpenCode 响应可观测 `sessionID`、assistant message `id`、parent message ID 以及 parts ID；这些是服务端消息身份，不等同于 Syno 的 `runId` 或 `toolInvocationKey`。
- Syno 每次 `run()` 生成新的 `opencode-run-<uuid>`；模型 fallback 的每个 attempt 没有跨重启恢复的服务端调用 ID。
- 当前 Tool Bridge 的本地幂等候选由 `ownerKey/threadKey/messageId/toolName/arguments` 组合，结果只保存在进程内 Map，不能作为 PR-04C 的持久 Effect Receipt。
- 批次一真实 Host/Session 演练已验证：重启后 `getSession()` 能确认旧 Session，下一条真实模型请求保持同一 Session identity；这证明 Session continuity，不证明工具副作用 exactly-once。

## 能力矩阵

| 能力 | 结果 | 证据边界 |
| --- | --- | --- |
| Session ID 读取 | verified | 真实 Host 与 OpenCode response |
| assistant/message ID 读取 | verified | 真实 OpenCode response 结构 |
| `runId` 跨重启稳定 | unsupported | Syno 每次运行生成随机 UUID |
| fallback attempt 稳定调用 ID | unknown | 当前客户端没有持久调用 ID |
| MCP JSON-RPC id 跨重试稳定 | unknown | 需要 PR-04C 专门注入重试验证 |
| toolCallId 跨 Host 重启恢复 | unknown | 需要真实工具调用和故障窗口 |

## PR-04C 约束

不得用 Session ID、assistant message ID 或 JSON-RPC id 互相替代。后续必须把持久 `toolInvocationKey`、参数 digest、Direct Effect Receipt 和 reconcile case 分开建模。

