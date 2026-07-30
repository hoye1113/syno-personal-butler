# PR-10A Proactive Reliability

日期：2026-07-30（Asia/Shanghai）

## 当前结论

主动通知可靠性实现与自动门禁已通过，生产主动通知切换和 Owner 手机端验收尚未执行。该目录不构成真实渠道验收通过证明。

实现提交：

- 移动 v2 受控切换能力：`4af218b`
- 主动通知去重、单 Bundle、Home Channel Outbox、加密目标恢复：`09b015e3261507bb7a73e2a987514fba3b54a22d`
- 控制面共享 mutation lock、Outbox cutover barrier、TEST 精确授权与发布闸门并发回归：`ae6de1deda0fd9a622c249c2cf9bbb2b7069f7ce`

## 已验证的自动语义

- 未变化事项跨日期只产生一个 Delivery Event；实质业务版本变化只新增一次。
- 一个 tick 只建立一个 Bundle，最多展示 3 项并报告剩余数量。
- 晨间信号与事件信号可合并；通知预算按 Bundle 计算。
- 主动消息只进入 Home Channel，不再生产式四渠道 fanout，也不跨渠道 fallback。
- Outbox 先于发送持久化；delivered 投影失败只重做投影，不重复发送。
- `delivery_unknown` 保持同一个 Bundle 与 Outbox event，不重新调用模型生成业务事件。
- Owner 渠道目标使用 Windows DPAPI 密文，目标恢复失败保持 retryable。
- Proactive Ledger v1→v2 有原始备份、SHA-256 摘要、完成 marker 和歧义抑制。
- 启动器保持 5 秒健康检查；24 小时模拟中健康与接管心跳各 24 条，错误事件不受限流。
- Home 切换、`confirm-test` 与 `enable/disable` 由共享 mutation lock 串行化；enable-vs-switch、switch-vs-switch 并发回归通过，Home 切换永久失效旧 Home 证据与 TEST 授权。

## 证据边界

- 主工作区 Node、verify、Vault 与 diff 门禁通过。
- detached clean worktree 在实现提交上重复通过 Node、verify、Vault 和 clean 状态。
- DPAPI 探针只证明本机 round-trip 和静态文件无明文，不证明渠道投递。
- 微信/飞书可见条数、顺序、重复情况、受控崩溃窗口和 Home Channel 切换仍需 Owner 实测。
- 未读取、记录或提交消息正文、Chat ID、context token、Token、Cookie、PID 或本机路径。

## 尚未通过

1. 暂停生产主动调度并执行 v1→v2 Ledger dry-run。
2. 启用主动 Outbox 后发送受控 `[Syno TEST <runId>]` 事件。
3. Owner 在手机确认 Home Channel 的条数、顺序和无跨渠道 fanout。
4. 完成 enqueue 后、发送前、发送后未记账三个真实恢复窗口。
5. PR-10B 的 AcceptedRequest 清理选择、移动 v2 切换、R6 Owner 验收与 Legacy 清理。
