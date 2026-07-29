---
status: accepted
review_baseline: 567f23d2d9b423a98d0e88868c6cc2eb3859d16f
---

# Syno 执行语义

OpenCode 负责模型调用、Agent Loop 和 Session 上下文；Syno 负责身份、调度、工具授权、Job/Workflow、直接副作用事实、恢复、决策、审计和渠道交付。

四类对象不得混用：

- OpenCode Session：多轮模型上下文。
- Syno Run：一次进程内编排，默认不持久。
- Job/Workflow：必须跨重启恢复的业务任务。
- Direct Effect：一次工具调用直接造成、可由现有事实源确认的效果。

系统保护以下不变量：

1. 任意时刻只有一个生产 Host。
2. 同一 OpenCode Session 任意时刻只有一个 writer。
3. 工具调用唯一归属于一个 Syno Run。
4. 同一持久 invocation identity 最多产生一次直接副作用。
5. `unknown` 只允许只读 reconcile，不允许盲目重试。

`committed` 只描述直接效果。例如 `jobs.submit` committed 表示 Job 已可靠创建，不表示该 Job 的知识写入已经完成。明确、合法、无歧义的写入自动执行；重复、多个合理方案或信息不足进入 `PendingDecision`；越权、关闭的自修改/系统控制和源码 scope creep 继续拒绝。
