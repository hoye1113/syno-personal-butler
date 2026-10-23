# 修复知识同步管道死锁（note-artifact-20261022-bfaf6b86）

日期：2026-10-23　关联待办：action-20261023-3d12a18b（根因需修正）、action-20261022-af48e32f（可关闭）

## 背景

发布记录 791b3dba….json 自 2026-10-22T14:51:39Z 冻结：wiki 已成功（03f5359d），images `running`/1 次，catalog `pending`/0 次。笔记后被移动+编辑至 df882834。

死锁机制（代码证据）：
- `knowledge-publisher.mjs:150`：版本不符直接返回 `stale`，永远到不了 159 行的 running→unknown 对账；
- `knowledge-publisher.mjs:79`：`queue()` 见任一 target 为 running/unknown 即抛 `SYNC_OUTCOME_UNKNOWN`，拒绝按新版本重建映射；
- 结果：retry 空转、queue 被拒，记录永久冻结。昨天 14:51 的直接诱因是 job-dd61b9a4「隔离分支在审批后发生变化，拒绝合并」，留下 6 个未提交残留文件至今挂在主工作区。

## 目标

1. 收编 6 个残留 job/event 文件，消除「未受管变更」守卫隐患。
2. 修 `queue()` 安全闸：版本升级时，running/unknown 的 **images**（效果锚定 wiki 文档，随 wiki 重发被整体取代）与 **有 remoteId 的 catalog**（走更新路径，无重复建行风险）允许重置为 pending；wiki 与无 remoteId 的 catalog 仍阻断（create 唯一性风险）。
3. 修 `retry()` 自愈：`run()` 返回 stale 时用当前笔记重新 `queue()` 再 `run()`，无需人工干预。
4. 补测试：stale+images running 可自愈；wiki running 仍拒绝；catalog 无 remoteId 拒绝、有 remoteId 放行。
5. 全量测试绿 → 提交推送 → 重启管家 → 触发 bfaf6b86 的 sync_retry 并验证 wiki/images/catalog 全部 succeeded 且 appliedVersion = df882834。
6. 修正 3d12a18b 根因描述并按验证结果关闭；关闭 af48e32f（B1/B2 已上线）。

## 非目标

- 不合并 2-2/2-3 同源重复笔记（须主人在管家对话里走合并预览确认）。
- 不动 MOC 存量死链（主人另行安排大扫除）。

## 验收标准

- `node scripts/run-tests.mjs` 0 失败。
- publish-map 791b3dba….json：三端 succeeded、appliedVersion = df882834…、updatedAt 刷新。
- `git status` 无残留未管文件；管家重启后 healthOk。
