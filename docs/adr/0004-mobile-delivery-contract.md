---
status: accepted
review_baseline: 567f23d2d9b423a98d0e88868c6cc2eb3859d16f
---

# 微信与飞书移动可靠交付

微信与飞书是主要日常入口；Web 是配置、诊断、完整审计和桌面接管入口。

用户可见 ACK 是持久化承诺：

```text
验证 Owner 与平台消息身份
→ 持久 AcceptedRequest 和最小 DPAPI 加密 payload
→ 写入唯一 ChannelDeliveryOutbox
→ 发送 ACK
→ 路由并执行
→ 持久业务结果
→ 写入 Final
→ 默认投递到原始渠道
```

同一业务版本只允许 Syno 调度一条 ACK、Decision、Final 或 Recovery。平台支持稳定发送幂等键时可承诺用户可见 exactly-once；未验证或不支持时必须标记为可观测的 at-least-once，不得虚假承诺绝对无重复。

ACK 目标 p95 不超过两秒。快速完成时 Final 可以 supersede 尚未发送的 ACK；长任务只在状态实质变化时发送低频进度。微信使用简短编号文本，飞书卡片只是 `resolveDecision()` 的增强入口，所有普通 Decision 均可在移动端完成。
