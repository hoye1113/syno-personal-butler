# 微信 iLink 投递身份研究

日期：2026-07-29（Asia/Shanghai）

## 当前实现事实

- 依赖为微信 iLink HTTP 接口；发送路径为 `ilink/bot/sendmessage`。
- 当前 Adapter 在每次 `sendText()` 内生成 `client_id = syno-<randomUUID>`。
- `to_user_id`、`context_token` 和正文随消息发送；当前发送方法不接受由 Outbox 传入的稳定 delivery key。
- 当前客户端没有“发送后按 client_id 查询最终状态”的只读接口。
- getupdates 的入站 message identity 使用平台 `message_id`，缺失时才退回 `client_id` 或 sender/seq/time 组合；这只能用于入站去重，不能证明出站 exactly-once。

## 能力矩阵

| 能力 | 结果 | 证据边界 |
| --- | --- | --- |
| Owner 绑定与长连接 | verified | 2026-07-29 `/api/syno/channels`，running/available/ownerBound 全 true |
| 入站 message identity 可读取 | verified | Adapter normalizer 与现有单测 |
| 出站稳定 idempotency key | unsupported | 当前 Adapter 每次随机生成 client_id，未暴露覆盖入口 |
| 相同 client_id 重发 exactly-once | unknown | 需要受控真实发送和 Owner 手机计数 |
| 发送超时后查询最终状态 | unsupported | 当前客户端没有状态查询路径 |
| 主动消息与回复共用幂等机制 | unknown | 当前两类路径没有统一 Outbox delivery key |

## 结论

在 PR-04A0 真实探针完成前，微信只能按可观测 at-least-once 设计，不能承诺 exactly-once。任何发送超时都必须进入 `delivery_unknown`，禁止因为 HTTP 未返回就自动用新的随机 client_id 重发。

