# 飞书 SDK 1.64.0 投递身份研究

日期：2026-07-29（Asia/Shanghai）

## 当前实现事实

- 依赖为 `@larksuiteoapi/node-sdk` `1.64.0`，使用 `createLarkChannel()` WebSocket 接收和 `channel.send()` 发送。
- 当前 Adapter 的发送调用为 `channel.send(chatId, { markdown }, replyOptions)`；reply target 可传入，但没有从 Syno Outbox 传入稳定 delivery key 的参数。
- 入站消息保存 `messageId`、`chatId`、`senderId` 和 message content；Feishu pending 以本地 message identity 做恢复和去重。
- 直接检查 `node_modules/@larksuiteoapi/node-sdk/es/index.js` 的 `OutboundSender.rawSend()`：普通出站消息调用 `im.v1.message.create` 或 `im.v1.message.reply`，请求 payload 只有 `receive_id`、`msg_type`、`content`（回复另含 `reply_in_thread`），没有调用方可控的 idempotency 字段。
- SDK 类型中的 `idempotent_id` / `idempotency_key` 属于其他 API，不能推断为消息发送幂等承诺；`uuid` 仅出现在卡片流更新等不同 API。
- 当前 SDK/Adapter 组合没有在 Syno 发送接口中暴露发送超时后的最终状态查询。

## 能力矩阵

| 能力 | 结果 | 证据边界 |
| --- | --- | --- |
| Owner 绑定与 WebSocket 连接 | verified | 2026-07-29 `/api/syno/channels`，running/available/ownerBound 全 true |
| 入站 uuid/message identity 可读取 | verified | Adapter 接收与 pending recovery 单测 |
| 出站稳定 idempotency key | unsupported | 已检查 SDK 1.64.0 的 `OutboundSender.rawSend()` 与类型；消息 create/reply 无调用方幂等字段 |
| 相同 uuid 重发 exactly-once | unknown | 需要在官方 SDK/原生 OpenAPI 层实测，不能由类型声明推断 |
| 发送超时后查询最终状态 | unknown | 当前 Adapter 没有查询路径 |
| 回复与主动消息共用幂等机制 | unknown | 尚未有统一 ChannelDeliveryOutbox |

## 结论

飞书在 PR-04A0 验证完成前按 at-least-once 处理。发送成功但本地 delivered 写入前崩溃时保留 `delivery_unknown`，后续只使用已验证的稳定平台身份；不能假装 SDK 的 message uuid 等于出站幂等键。
