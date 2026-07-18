# Android 微信 iLink 验收

## 历史探针

- 2026-07-17 已确认 Android 微信可以从官方 iLink 端点取得二维码。
- 当次使用 `start-only`，没有扫码、Owner 绑定或私聊往返，因此不构成真实渠道验收。

旧 CLI 曾输出二维码 URL/标识并改写本文件。该行为已移除：二维码属于临时认证材料，只能在本机 Syno Web 中显示，不进入终端、日志、Markdown 或 Git。

## 当前安全流程

1. 启动 Syno Web，在“连接设置 → 通知”中获取微信二维码。
2. 主人使用 Android 微信扫码并在手机确认。
3. 页面必须显示 Owner 已绑定；不要截图或复制二维码、Bot Token、context token。
4. 连接后运行只读健康探针：

```powershell
pnpm probe:weixin -- --confirm-live --duration-ms 2000
```

探针不生成二维码、不接受命令行凭据，只输出 `configured / ownerBound / connected / errorCode` 等运行元数据。

## 真实验收用例

- 主人私聊发送唯一文本，Syno 只处理一次并回复。
- 重复投递相同 message ID，不重复执行。
- 陌生人私聊被拒绝，群聊不进入 Agent。
- 制造一次处理失败，cursor 和去重标记不提前推进；恢复后只交付一次。
- 发送受支持附件，文件先进入隔离区且不会自动读取；不受支持来源或 MIME 被拒绝。
- 断网后渠道降级，本地 Web/知识/任务仍可用；恢复后继续同一 Owner、同一事实源。

完成后只在 `docs/FINAL-ACCEPTANCE.md` 记录时间、结果和脱敏错误码，不记录任何二维码或身份凭据。
