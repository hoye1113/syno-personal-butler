# token-cloud Provider 真实验收

Provider 只允许 `https://server.flowyaipc.cn/claw/v1`、一个固定 Model ID、非流式原生工具调用。Token 只能由主人在 Syno Settings 中录入，或在主人明确授权后从本机 OpenClaw last-good 认证档案直接迁移到 Windows DPAPI；禁止通过命令行参数、日志或聊天传递。

## 自动采用门

配置完成后运行：

```powershell
pnpm probe:provider-real -- --confirm-live --trials 5
```

探针只使用合成 `knowledge.search` 数据，不读取真实知识笔记。报告包含：

- 五轮真实 token-cloud 工具循环的成功率、延迟、工具调用次数和固定模型校验；
- 本地上下文故障注入：超限必须在网络请求前拒绝；
- 本地超时故障注入：必须得到 retryable `PROVIDER_TIMEOUT`；
- 本地离线故障注入：必须得到 retryable `PROVIDER_UNAVAILABLE`；
- 故障注入后五轮真实请求仍使用原 Model ID 成功，证明无模型/Provider fallback。

报告不输出 Token、响应正文、提示词、真实知识或失败载荷。只有 `localFaultInjection.allPassed=true`、五轮全成功且 `recoveredToLiveFixedModel=true` 才通过自动采用门。

## 真实故障与恢复

故障注入不冒充真实 Provider 故障。若验收期间没有自然故障，主人可在本机按以下步骤制造可控断网：

1. 在 Web 提交一个只读、需要模型的合成请求，记录 Job ID 和固定 Model ID。
2. 临时断开网络后重试该 Job；确认状态进入 `waiting_provider`，本地搜索、任务、提醒和审批仍可用。
3. 恢复网络，通过同一 Job 的重试入口继续；确认完成后 Job ID 未改变、Model ID 未改变、没有 Hermes/OpenCode/其他 Provider 回退。
4. 对一个超过 Settings 上下文长度的合成输入验证 `PROVIDER_CONTEXT_LIMIT`，并确认 Provider 请求计数没有增加。
5. 只记录时间、Job ID、Model ID、状态序列和脱敏错误码；不记录 Token 或响应正文。

若无法安全制造真实超时，可以保留确定性超时故障注入证据，并把“真实网络超时”明确记录为未验收；不得将其标为通过。2026-07-19 至 2026-07-20 已自然出现一次真实 Provider HTTP 故障，因此没有再人为中断整机网络。

## 验收记录

| 项目 | 状态 | 证据 |
| --- | --- | --- |
| 五轮真实工具调用 | passed | 2026-07-18，原生 ToolLoop 5/5 成功，每轮恰好一次合成 `knowledge.search` |
| 固定 Model ID / 无 fallback | passed | 固定请求 `AIPC-deepseek-v4-flash`；仅接受 Provider 确定性的 `deepseek-v4-flash` 响应规范化，其他模型继续拒绝 |
| 本地上下文/超时/离线故障注入 | passed | `PROVIDER_CONTEXT_LIMIT` 未触网；超时和离线均为 retryable，随后五轮恢复成功 |
| 真实 Provider 故障进入 waiting_provider | passed | 微信 Job `job-20260719-461dea5d` 因真实 `PROVIDER_HTTP_ERROR` 进入 `waiting_provider`，状态跨 Worker 重启持久保留 |
| 恢复后同一 Job/模型完成 | passed | 网络/Provider 恢复后同一 Job 由固定 `AIPC-deepseek-v4-flash` 完成，没有切换 Model、Provider、Hermes 或 OpenCode |
