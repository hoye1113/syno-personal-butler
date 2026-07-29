# OpenCode 1.18.2 Session/Fallback 能力研究

日期：2026-07-29（Asia/Shanghai）

## 当前可验证事实

- 本机 `opencode-runtime.mjs status` 报告 OpenCode `1.18.2`、健康状态 `ready=true`、固定三模型链和单一 `opencode-cli-server` Runtime。
- 现有 `OpenCodeHttpClient` 只封装 health、create/get/send、prompt_async、abort、delete；没有读取历史消息、fork 或 clone 的调用 seam。
- 因此当前版本不能把“服务端支持 fork/clone”当作已验证能力，也不能在 fallback 时复制未经筛选的 Session 历史。
- `OpenCodeCognitiveRuntime` 现在把每次失败后的 Session 状态分为 `clean`、`unknown`、`dirty`：观察到工具效果或直接副作用后为 `dirty`；尚未确认远端 abort 前为 `unknown`；服务端确认 abort 后才恢复为 `clean`。

## 条件策略

| 条件 | 处理 |
| --- | --- |
| `sessionStateKnown=clean` 且 `abortConfirmed=true` 且没有不可逆效果 | 才允许按固定顺序进入下一模型 Attempt |
| abort 返回错误或超时 | `cancel_unknown`，冻结 Session；不 fallback、不释放顺序权 |
| Tool Bridge effect counter 增长或工具明确提交副作用 | `dirty`，停止 fallback，进入原有 Receipt/Unknown 处理 |
| 未来提供 read/fork/clone seam | 只允许复制 user/assistant text；丢弃 tool-call、tool-result 和 opaque metadata |

## 未完成真实能力

- `toolCallId`、assistant message id、网络重投 id 的跨 Host 稳定性仍不能由客户端类型或字段名推断。
- 真实 fork/clone 和 abort 后迟到工具调用尚未完成 Owner 操作和受控故障注入；本次不停止当前健康 OpenCode 进程，也不向真实业务工具发送写入。
- `scripts/probe-opencode-server.mjs` 本轮因端口 4318 已由未知进程占用而 fail closed（`OPENCODE_PORT_OCCUPIED`）；已通过只读 status 命令确认当前受管 Host 健康，不以此冒充 fork/clone 验收。

## 实施边界

本研究只固化保守 fallback 条件和受控消息过滤函数，不改变固定模型链、不引入其他 Runtime、不自动重试 Unknown，也不宣称 exactly-once。
