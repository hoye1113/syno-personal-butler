# V2 执行方案：多对象上下文与持久恢复闭环

- 日期：2026-11-17
- 状态：V2 已完成。假模型完整链路与敌意故障测试 12/12；真实 OpenCode CLI + DeepSeek 4.1 Flash 四对象五任务语义闭环通过；尚未进入 V3
- 前置证据：`/Users/hoye/Documents/workspace/butler-superagent/v1/VERIFICATION.md`
- V2 验证证据：`/Users/hoye/Documents/workspace/butler-superagent/v2/VERIFICATION.md`
- 真实 OpenCode 证据：`/Users/hoye/Documents/workspace/butler-superagent/v2/opencode-evidence.json`
- 前置证据：`/Users/hoye/Documents/workspace/butler-superagent/v1/VERIFICATION.md`

## 范围

加入 `capture:A`、`capture:B`、`knowledge:A`、`idea:X`，每个对象都走 `owner.chat → context.<domain>.message → task.<domain> → task.result → notice`。Root、三个 Object Specialist、Worker 和 Result 仍通过真实 HTTP Hub 与独立 Worker 进程运行。

## 权威边界

1. 可信 Context Adapter 服务从 Hub 当前 `context.*` 事实同步重建 Registry；本地 JSON 只是可重建投影。
2. 每次路由提交携带投影版本；提交前重新读取 Hub 并校验。版本不符、重复创建、archived 写入、未知对象和跨 Owner 一律拒绝。
3. Adapter 单写入串行检查并提交，确定性事件 ID 保证崩溃重放不重复创建。该原型验证等效单写入事务，不宣称多写入生产一致性。
4. 唯一 Checkpoint Writer 先写 SHA-256 内容寻址文件，再提交 `context.checkpoint` 引用；孤立文件忽略，引用缺失停止恢复。
5. `confirmed` 只来自 Owner 明确确认；`operational` 只来自 Hub 事实；Worker/外部文本只进入 `untrusted_working`。

## 敌意验收

- 首次 claim 前批量“收录 A / 收录 B / 想法 X”，每条恰好一个结果，A/B/X 正文、Session、任务和通知隔离。
- Root 失败退避期间第四条消息合并，不遗漏、不重复。
- 讨论 A 不重复收录；idea:X 切换恢复不串正文；歧义指代生成追问。
- 旧快照执行 `create A → continue A → archive A → message A` 时，后续 stale 提交全部拒绝，不重复创建或复活归档。
- 两个相同版本的并发路由提交只能一个生效；确定性重放不新增对象。
- 归档后只能从有效可信检查点恢复；孤立检查点忽略，引用缺失显式失败。
- 恶意 Worker 文本不能进入 `confirmed`；只有 Owner 确认可提升。
- A/B 并行、同对象串行，Object/Result Session 不共享；Worker/Hub 重启与通知去重回归。

## 完成门

完整链路、批量/stale/租约竞争、检查点信任与恢复测试全部通过，并重跑 V0/V1。真实语义模型样本如需调用，另行确认额度；不在本切片隐式消耗。
