# 微信与飞书真实渠道验收

真实渠道验收必须由主人在本机完成，且只记录布尔结果、时间、测试消息 ID 的不可逆摘要和脱敏错误码。

## 共同前置条件

- Web/Worker 使用同一仓库、Policy、ToolRegistry、ConversationStore 和 Owner 配置。
- 不在命令行传 Token、Cookie、二维码、App Secret 或 context token。
- 先备份非凭据状态；测试消息只使用不含私人知识的唯一标识文本。
- 高风险和双审批任务只能回到 Web，不允许渠道消息绕过。

## 微信

按 `docs/WEIXIN-ANDROID-PROBE.md` 完成扫码，再运行：

```powershell
pnpm probe:weixin -- --confirm-live --duration-ms 2000
```

随后验证 Owner 私聊、陌生人/群聊拒绝、重复消息、处理失败不推进 cursor、附件隔离、断网降级和恢复。

## 飞书

1. 在 Syno Web“连接设置”中开始飞书注册，主人扫码授权并绑定 Owner。
2. 连接后运行：

```powershell
pnpm probe:feishu -- --confirm-live
```

若 Syno Worker 已在运行，两个 probe 读取本机 `127.0.0.1` 的脱敏渠道状态并返回 `source: running_worker`，不会抢占微信单实例 poller 或建立第二条飞书长连接；Worker 未运行时才使用独立短探针。

3. 主人发送唯一私聊文本，确认只执行并回复一次；成功去重和失败待处理状态必须跨 Worker 重启保持。
4. 验证陌生人和群聊不进入 Agent、重复 message ID 不重复处理。
5. 授权目标日历，验证创建、重复事件、乱序回执、权限拒绝、断网降级和恢复；飞书不得成为知识事实源。
6. 模拟 Agent 已处理但回复返回 `delivered: false`，确认事件仍为 pending，恢复后只产生一个成功标记。

消息注册/长连接与日历授权当前是两个独立 Feishu Adapter。两者都受 Syno Policy 和 Markdown 事实源约束，但真实验收必须分别完成消息与日历设置。

## 记录格式

| 项目 | 时间 | 结果 | 脱敏错误码/说明 |
| --- | --- | --- | --- |
| 微信连接健康 | 2026-07-18 | passed | 从主人授权的 OpenClaw 本机配置迁入 DPAPI；Owner 已绑定，2 秒真实轮询健康且无错误 |
| 微信自动扫码状态轮询 | 2026-07-19 | passed | Web 自动轮询扫码状态，不再依赖“我已扫码确认”；二维码由受信登录 URL 在本地渲染为内存 PNG |
| 微信 Owner 连续往返 | 2026-07-20 | passed | 两个后续 Owner 消息分别形成完成态 Job；轮询、固定会话、Agent 执行与回复链路持续可用 |
| 微信 Provider 故障恢复 | 2026-07-20 | passed | 同一微信 Job 曾因真实 `PROVIDER_HTTP_ERROR` 进入 `waiting_provider`，重启恢复后由固定模型完成，无 fallback |
| 微信 durable 去重 | 2026-07-20 | passed | 17 个真实 seen ID 跨 Worker 重启保留；恢复后没有重复 Job；自动测试覆盖同 message ID 重放、失败不推进 cursor |
| 微信附件实机 | 待验收 | pending | 附件流式限额、MIME 嗅探和隔离测试已通过；仍需主人发送一份无隐私附件完成实机往返 |
| 飞书连接健康 | 2026-07-20 | passed | 主人扫码创建应用并绑定 Owner；二维码本地渲染，注册确认后自动长连接，重启自动恢复；未记录 App ID/App Secret |
| 飞书 Owner 连续往返 | 2026-07-20 | passed | 4 个真实 Owner 私聊 Job 全部完成、0 failed/0 waiting、同一 Conversation；4 个 durable seen ID 跨重启保留 |
| 飞书真实 ID 重放 | 2026-07-20 | passed | 对一个真实已完成 message ID 做本地恢复重放，`replayAccepted=false`，pending 维持 0，未再次执行 Agent |
| 飞书日历授权与 CRUD | 2026-07-20 | passed | lark-cli 1.0.72 user 身份、Token valid、主日历「Hoye」；真实创建后对同 event ID 更新两次并清理成功，无参会人通知 |
| 飞书权限拒绝与恢复 | 2026-07-20 | passed | 不存在日历的只读请求按预期拒绝、无 Token 泄漏；随后 user 身份主日历读取成功，Worker 重启后仍可用 |
| 运行中 Worker 健康探针 | 2026-07-20 | passed | 微信与飞书均 `ok/configured/ownerBound/connected=true`、`errorCode=null`、`source=running_worker`；不输出凭据 |

全部通过后，把结果摘要同步到 `docs/FINAL-ACCEPTANCE.md` 和 `docs/CUTOVER-CHECKLIST.md`。
