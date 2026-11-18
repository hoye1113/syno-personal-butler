# 管家借鉴 Orca 机制的后续验证 Plan（讨论稿）

- 日期：2026-11-18
- 状态：仅供讨论，未授权执行
- 探索对象：`https://github.com/stablyai/orca`
- 固定提交：`44243be42221b6946c482aab39dfc0bc51ce06aa`
- 只读源码副本：`/tmp/orca-explore-3YuXyA/orca`
- 证据边界：已读文档与源码；未安装依赖、未运行 Orca、未运行其测试，不声称其运行时稳定性已获验证

## 一、背景

管家已经确定采用“Super Agent 产品层 + autoloop 持久编排内核 + Root Router / Domain Specialist / Object Context + 可替换 Worker + Result Lane + 本地 Markdown vault”。

Orca 同时包含两类可借鉴机制：

1. Bot 产品层：Bot Home、SOUL/MEMORY、长期 Home Chat、对象式会话、Items、Owner/Member、连接器、Look around、Tidy-up。
2. 执行控制层：Run/Task/Dispatch/Message/Decision gate、Session Adapter、进程所有权、自动化 precheck、worktree 与远程执行。

不能因功能相似就引入第二套 Runtime 或第二套事实源。

## 二、目标

1. 只吸收能被管家现有架构容纳的机制，不整体替换 autoloop。
2. 优先增强既定 V5 的主动知识、低打扰和 Owner 反馈闭环。
3. 查重后补齐 Worker 尝试身份、进程所有权、Session 能力和未知结果的契约缺口。
4. 保留 Result Lane、对象隔离、本地 vault 和单一管家身份。
5. 如需验证 Orca 整体，仅作为隔离代码 Worker 后端候选，不作为主 Runtime。

## 三、非目标

- 不安装或运行 Orca，不接入其云连接器，不切换生产。
- 不引入 Codex 作为本机依赖。
- 不把 Orca AI Vault 当作管家知识 vault；前者是 Agent Session History。
- 不把 git worktree 当系统安全沙箱，不复制默认全自主权限参数。
- 不让 Bot/Worker 自报成功直接成为对用户的最终事实。
- 不让多个 Specialist 变成用户必须管理的多个机器人身份。

## 四、已形成的架构约束

1. autoloop 是任务、事件、轮次、恢复、审批和通知的唯一持久编排事实源。
2. Orca 的 Run/Task/Item 若未来出现，只能是 Worker 私有执行状态或可重建投影。
3. `worker_done=succeeded` 只代表一次 Dispatch 的合法报告，不代表结果已被独立验证。
4. `MEMORY.md` 类个人记忆与正式知识 vault 必须分层；二者均不得由外部内容直接写入。
5. 对象上下文可以共享经过授权的索引和决策引用，不自动注入其他对象正文或最近回复。
6. 主动巡视默认只读、只产生候选；Owner 显式跟进后才进入既有收录或执行链路。

## 五、分阶段步骤

### A. 无安装契约查重与差距表

只读对照当前 autoloop、Worker Contract 和 Session 实现，逐项标记“已有等价物／缺失／不适用”：

- `task_id` 之外的 `attempt_id`／Dispatch 身份。
- 进程 incarnation、启动 token、旧 Worker 完成新重试的拒绝。
- `accepted / admitted / rejected / unknown` 输入结果与未决不自动重发。
- 声明能力必须有 Adapter 实现，实时 Session 只能收窄能力。
- Decision gate 与 Worker 普通提问的边界。
- 自动化的无模型 precheck、missed-run grace、fresh/reuse Session。

产出：一页差距表和对应现有代码位置。没有证据的“缺口”不得进入开发。

验收：每项均有管家文件与 Orca 文件双向引用；不修改代码。

### B. 将 Look around 机制并入既定 V5

在现有 V5“无模型轮询 → 去重预筛 → 候选/简报 → Owner 反馈 → 显式跟进”上补充：

- 巡视与执行分离；巡视只读，只创建 Suggestion，不直接写正式 vault。
- 工具层和命令层双重允许列表，不能只靠提示词声明只读。
- 每轮候选数量、总预算、频率和超时上限。
- 有用／无用／跟进反馈； dismissed 候选冷却，重复候选保留原身份和年龄。
- 无价值结果静默；失败有界，连续失败自动暂停并说明原因。
- 睡眠或停机后的补跑有 grace，不无限追赶历史槽位。
- Owner 点击跟进后才进入 V4 收录或对应任务链路。

验收：使用合成来源覆盖重复转载、热门无关、低热高值、提示注入、来源撤回、无新候选、超预算和停机恢复；正式 vault 零写入，未获授权的推送和外部副作用为零。

### C. Worker 结果与重试敌意验证

仅在 A 证明存在缺口后，设计最小契约修正与合成测试：

1. 旧 attempt 的 `worker_done` 不得完成新 attempt。
2. 非当前进程不得报告、提问或关闭任务。
3. Worker 自报成功但预期产物不存在时，Result Lane 必须给出未验证/失败，不得通知成功。
4. 输入结果未知时不得盲目重放副作用。
5. 晚到 heartbeat、失败或取消不得改写已终态的新 attempt。
6. 重启后只能由可证明的当前所有者恢复 Session。

验收：全部使用合成 Worker 和合成文件；至少一次执行不被误写为副作用只执行一次；既有无费用回归保持通过。

### D. 记忆整理机制单独评审（不在 V5 默认范围）

只有 Owner 长期偏好和决策确实出现维护成本后才启动：

- 模型在无工具会话中只生成结构化整理草案。
- 宿主校验行数、增删上限、路径、并发版本和来源后才写入。
- 水位线只在成功应用后前进；失败保留待处理输入。
- 每次变更可追踪、可撤销，退役内容进入归档而非静默消失。
- 只从 Owner 明确发言和经确认的决策提炼；外部消息、网页、附件和 Worker 输出不作为个人指令来源。
- 个人记忆与正式 vault 不互相冒充事实源。

验收：注入、并发修改、中途崩溃、错误草案和 Undo 均不丢事实、不越权写入。

### E. Orca 整体隔离 RC（可选，需单独授权）

仅在确有代码 Worker 后端需求时考虑：

- 新空目录、合成仓库、合成账号与假凭据；不连接真实飞书、真实 vault 或生产仓库。
- 遥测关闭；权限最小化；不用 Orca 默认全自主启动参数。
- autoloop 在外部保持唯一任务权威，Result Lane 独立读取合成产物。
- 不启用移动推送、云连接器或 `.worktreeinclude` 秘密复制。

停止条件：必须引入双事实源、绕开 Result Lane、扩大私有数据出口，或为一个 Worker 适配而重写既有路由/通知/vault。任一出现即停止整体接入，只保留机制借鉴。

## 六、最便宜的最小练习

不安装 Orca，用现有合成 Worker 做一次“假成功 + 旧重试”演练：

1. attempt 1 启动后失去所有权，attempt 2 接替。
2. attempt 1 上报成功，但没有写入约定产物。
3. 断言旧 attempt 无权完成 attempt 2，且 Result Lane 不向 Owner 宣告成功。
4. 再让 attempt 2 写入正确产物，独立复核后才允许通知。

通过标准：同时挡住“旧身份越权”和“假成功误导”，不依赖 Worker 自述。

## 七、当前建议

先讨论并决定是否启动 A；B 属于既定 V5 的设计补强，C 依赖 A 的查重结果。D 和 E 不随本轮自动启动。当前不修改管家实现，不开始 V5，不切换生产。
