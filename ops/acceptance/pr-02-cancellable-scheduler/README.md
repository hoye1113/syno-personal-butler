# PR-02 Cancellable Scheduler 验证记录

日期：2026-07-29（Asia/Shanghai）

## 范围

- implementation base：`5b12fd8`
- branch：`codex/exec-p02-cancellable-scheduler`
- head：提交时补录
- 不含真实 OpenCode Session 或 Owner 渠道验收。

## 自动语义证据

- Node：473/473 passed。
- Vault：57/57 passed。
- Repository verify：1411 files，active documentation 7 files passed。
- `git diff --check`：passed。
- Run 在进入 Session 队列前创建，初始状态为 `queued`。
- 同 Session 的纯模型与工具请求严格串行。
- 不同 Session 的纯模型请求并行。
- Tool Bridge 请求全局串行；等待 Bridge 的 Session 不阻塞其他 Session 的纯模型请求。
- queued 与 acquired 的取消竞态只有一个获胜。
- queued 和 `waiting_bridge` 取消不会调用 OpenCode message。
- 运行中取消只有在 OpenCode abort 确认后成为 `canceled`。
- abort 未确认时成为 `cancel_unknown`，对应 Session key 被阻止，后续请求不能写入旧 Session。

## 证据边界

- Scheduler 与 OpenCode Client 使用可控测试替身验证，并非真实 OpenCode 1.18.2 探针。
- 真实 abort、迟到 tool call 和 Session 污染能力仍由 PR-07A 验证。
- Owner 验收：未执行。
