---
status: accepted
review_baseline: 567f23d2d9b423a98d0e88868c6cc2eb3859d16f
---

# Schema 迁移与回滚

每个持久 Schema PR 必须声明：

```text
旧版本读取期限
新版本开始写入的 commit
迁移触发点
迁移完成标记
旧字段停止写入和删除门槛
旧程序能否回滚读取
```

迁移器必须版本化、可重入、支持中途崩溃后继续，并在写入前建立可验证备份。读路径先双读，写路径只在同批测试和恢复门禁通过后切换到新版本。活动迁移不得静默丢弃未知字段或无法解密的 payload；这类记录进入明确的恢复失败状态。

移动可靠交付切换前保留 legacy 入站路径，但 shadow 路径不得发送第二份回复。Outbox v1 双读保留到 R6；Decision 磁盘状态在 PR-06 继续写 `awaiting_approval`，只在 API/UI 映射为 `awaiting_decision`，最终破坏性迁移等待 R6 Owner 验收。
