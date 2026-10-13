# 主动服务只读状态

主人可向本机 Host 请求 `GET http://127.0.0.1:8888/api/syno/proactive/status`（如设置 `PORT`，使用对应端口）。此路径通过现有 loopback 和 Host 白名单；旧 `/api/syno/proactive/preview` 及未知路径返回 404。

接口调用现有 `proactive.preview()`，返回：

- `enabled`：主动投递开关。
- `homeChannel` 与 `homeTargetAvailable`：Home 渠道及其目标是否可用。
- `deliveryHealth`：连续失败次数、最近错误代码、最近事件时间、目标凭据年龄；不包含凭据或目标明文。
- `eligibleSignals`：当前可发送信号数量；安静时段为 0。
- `bundle`：脱敏的 bundle ID、信号数量及剩余数量，或 `null`；不包含消息正文。

查询不会创建会话、生成内容、投递消息、迁移 Ledger、修改设置或保存状态。启用状态不代表目标可用；投递恢复后连续失败计数归零。`lastDeliveryError` 是错误代码，不是原始异常。

HTTP 回归使用临时知识／状态根、Fake Harness 和隔离端口，不连接生产渠道。合并后运行中的 Host 需由主人手动更新；本次不自动重启服务。更新后可先查健康接口及此状态接口，再进行真实对话和主动投递验收。
