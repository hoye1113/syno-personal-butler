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

## PR-10A：Proactive Ledger v2

| 声明项 | 约束 |
| --- | --- |
| 旧版本读取期限 | versionless/v1 `proactive.json` 与 `lastRuns.morning/evening/weekly` 双读保留到 PR-10B Owner R6 验收和回滚检查点通过。 |
| 新版本开始写入的 commit | `09b015e3261507bb7a73e2a987514fba3b54a22d`。 |
| 迁移触发点 | 显式 `POST /api/syno/proactive/migrate`，不是首次读取自动完成；普通 tick 不可静默完成旧 Ledger 迁移，生产启用前先暂停主动调度并执行只读 dry-run。 |
| 迁移完成标记 | `proactive.json.migration-v2.json`，包含版本、完成时间和 v1 原始字节的 SHA-256 `backupDigest`。 |
| 可验证备份 | 写 v2 前创建 `proactive.json.v1-backup`；marker 的 `backupDigest` 必须与该文件原始字节一致。 |
| 旧字段停止写入 | PR-10A 新写只写 v2 subject/pending Bundle；兼容 `lastRuns` 继续维护到 PR-10B。 |
| 旧字段删除门槛 | Owner R6 主动通知实测通过、移动 v2 切换通过、旧版本回滚边界验证完成后才允许删除。 |
| 旧程序回滚读取 | 旧程序不能安全恢复 v2 Bundle/Outbox 投影语义。回滚前必须暂停主动调度、归档 stateRoot，并恢复经摘要核验的 v1 backup；无法确认时保持主动通知关闭。 |
| 控制面 mutation lock | Home 切换、`confirm-test` 与主动通知 `enable/disable` 由 `ae6de1deda0fd9a622c249c2cf9bbb2b7069f7ce` 引入的共享 mutation lock 串行化；每次进入临界区重读当前 Home、release evidence、test event 与 enabled，消除 enable-vs-switch、switch-vs-switch 交错。 |
| Outbox cutover barrier | Home 切换冻结旧目标、排空 in-flight、在 Outbox process lock 内 supersede pending event，并用 claim lease CAS 保护终态；`#commitClaim` 在同一锁内重读状态、拒绝 frozen 目标后再提交。 |
| TEST 精确授权 | `notifications.proactiveTestEventId` 只授权一个精确 TEST Outbox event 跨重启重试；TEST 为原子 exclusive group，已 delivered 的 TEST 不重新授权、不 wake。`confirm-test`/`enable` 按 `eventId` 直读 Outbox，不受 1000 条 list 截断影响。 |
| Owner 发布证据 | `notifications.proactiveReleaseEvidence` 持久保存 Owner 手机确认（可见条数、顺序、result）；`enabled=true` 必须存在 `homeChannel===channels.homeChannel` 的有效证据与已 delivered 的 TEST event，否则抛 `PROACTIVE_TEST_REQUIRED`。 |
| Settings additive overlay | `notifications.proactive*` 新字段经 additive overlay 在 read 时呈现，不 read-write 改写老文件；非法 Home 请求不先清空有效发布证据。 |

迁移保留未知字段；已有 Web 审计可证明已通知的当前版本会被抑制。无法确认是否送达的旧事件记录为迁移歧义，默认不重发，等待下一次实质业务版本变化。无法解密或读取的 Outbox payload 进入明确恢复失败，不伪造 delivered。

`OwnerChannelTargetStore` 是新增的 DPAPI 密文状态，旧 Runtime 忽略它；Outbox 的 projection 字段为向后兼容的可选字段。它们均不得作为回滚到四渠道直接发送的理由。

主动通知发布闸门恒为显式 migrate → controlled TEST → Owner 手机确认 → live enable：`enabled=true` 的不变式由控制面 mutation lock 与 Outbox cutover barrier 共同维护，Home 切换永久失效旧 Home 证据与 TEST 授权；回滚或任何失败都保持主动调度关闭，不得恢复四渠道直接 fanout。
