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

3. 主人发送唯一私聊文本，确认只回复一次。
4. 验证陌生人和群聊不进入 Agent、重复 message ID 不重复处理。
5. 授权目标日历，验证创建、重复事件、乱序回执、权限拒绝、断网降级和恢复；飞书不得成为知识事实源。

## 记录格式

| 项目 | 时间 | 结果 | 脱敏错误码/说明 |
| --- | --- | --- | --- |
| 微信连接健康 | 待验收 | pending | 不记录二维码或 Bot Token |
| 微信 Owner/去重/恢复 | 待验收 | pending | 仅记录不可逆消息摘要 |
| 飞书连接健康 | 待验收 | pending | 不记录 App ID/App Secret |
| 飞书 Owner/日历/恢复 | 待验收 | pending | 仅记录日历别名和脱敏事件摘要 |

全部通过后，把结果摘要同步到 `docs/FINAL-ACCEPTANCE.md` 和 `docs/CUTOVER-CHECKLIST.md`。
