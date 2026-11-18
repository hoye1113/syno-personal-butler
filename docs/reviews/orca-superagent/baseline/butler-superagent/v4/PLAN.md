# V4.1 执行方案：本地知识只读闭环

- 日期：2026-11-17
- 状态：已完成；V4.1 5/5，全量回归 35/35
- 范围：合成 vault、确定性 Router/Specialist/Worker、真实 Hub；不接真实模型、真实 vault、DSH 或生产飞书。

## 目标

跑通 `owner.chat → knowledge:<document_id> → 本地只读检索 → 引用复核 → task.result → notice`，验证敏感拒读、权限拒绝、路径穿越/符号链接、伪造引用、重启恢复、重放去重和 vault 零写入。

## 边界

1. `document_id` 是逻辑路径 `vault/<relative>.md` 的 SHA-256 前 24 位，格式为 `doc-<hex>`；目录内冲突直接拒绝。
2. 复用 `KnowledgeStore` 的 realpath 读取边界、失效知识排除与敏感检测；搜索索引只写 Hub Home，绝不写 vault。
3. Worker 只提交候选引用；Result Lane 独立重读文档并核对路径、文档 ID、SHA-256、精确片段、offset 和引用编号，失败不保存检查点、不投递原答案。
4. 拒读只返回稳定安全文案，不回显敏感正文或底层错误。
5. V4.2 副本收录、真实 vault 写入、DSH 和生产切换不在本片。

## 验收

- 正常问题只有对应对象的一条通知，引用可逐字回溯。
- 敏感、越界、无权限与伪造引用均无可信答案或检查点。
- Worker 强杀、Hub 重开、Owner 重放不重复结果/通知。
- 测试前后合成 vault 文件路径、类型、内容和元数据快照一致。
- V0/V1/V2/V3 全量无费用回归通过。
