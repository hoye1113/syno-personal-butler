# PR-03 Session Lifecycle 验证记录

日期：2026-07-29（Asia/Shanghai）

## 范围

- implementation base：`41ebf1c`
- branch：`codex/exec-p03-session-lifecycle`
- head：提交时补录
- Binding v1 双读；新写 v2。

## 自动语义证据

- Node：480/480 passed。
- Vault：57/57 passed。
- Repository verify：1413 files，active documentation 7 files passed。
- `git diff --check`：passed。
- 4 个 Store 实例并发执行 100 个 mutation，没有丢失 Binding。
- v2 持久 lifecycle 只使用 `available`、`quarantined`、`deleting_unknown`。
- `acquire()` 与 `beginDelete()` 在单 Host 内存队列中原子竞争。
- retention cleanup 不删除 leased Session；长 Lease 只报告告警，不强制释放。
- delete 成功或 404 后删除 Binding；delete 状态不明时进入 `deleting_unknown`。
- `deleting_unknown` 恢复只调用 `getSession` 核对，不重试 delete。
- 重启无法确认旧 Session 时 quarantine；下一次请求创建干净 Session，并在回复中明确说明上下文已重置。
- newConversation 创建后 Binding replace 失败时，旧 Binding 保持 available，新 Session 进入 orphan cleanup。

## 证据边界

- OpenCode Session 生命周期使用 Fake OpenCode/可控 Client 验证，不等于真实 OpenCode 1.18.2 的 Session 行为。
- PR-07A 仍需真实验证 fork、abort 迟到调用和失败响应污染。
- Owner 验收：未执行。
