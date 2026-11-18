# 管家 Super Agent 纵向测试与执行切片 v4

- 日期：2026-11-17
- 架构基线：`/Users/hoye/Documents/workspace/plan/butler-superagent-autoloop-plan-v4.md`
- 对抗审查：`/Users/hoye/Documents/workspace/plan/butler-superagent-autoloop-plan-v4-adversarial-review.md`
- 本文作用：不重改架构，重排实施与测试顺序；先跑通最小完整链路，再逐片扩展能力
- 状态：V0、V1、V2、V3、V4.1 与 V4.2 均已完成实验验收；V1 两条真实 Claude 完整流程、真实 Session resume 已完成；V2 假模型敌意测试 12/12，并通过真实 OpenCode 四对象五任务完整链路；V3 真实飞书 Owner 私聊四入站、四结果卡片、真实按钮关闭、重启去重通过，旧 Runtime 已恢复为唯一消费者；V4.1 合成 vault 只读链路、V4.2 本地合成来源副本收录和真实 DSH `0.2.2-rc.3` 可替换 Worker 均通过，DSH 退出后知识 Worker 继续运行。另有 Pi `1.5.2` 候选 Worker 经 loopback OpenCode Server 使用固定 Go 模型完成收录、Result Lane 复核及退出后知识查询，全量无费用回归 **41/41**。DSH 仅为独立目录 RC 预发布验收，Pi 仅为单次纵向候选验证；均未切换统一生产 Runtime，未升级 Syno 生产 vendor；真实 URL、正式 vault 写入和全量生产切换仍需逐阶段确认
- V0 证据：`/Users/hoye/Documents/workspace/butler-superagent/v0/VERIFICATION.md`
- V1 执行方案：`/Users/hoye/Documents/workspace/butler-superagent/v1/PLAN.md`
- V1 验证报告：`/Users/hoye/Documents/workspace/butler-superagent/v1/VERIFICATION.md`
- V2 执行方案：`/Users/hoye/Documents/workspace/butler-superagent/v2/PLAN.md`
- V2 验证报告：`/Users/hoye/Documents/workspace/butler-superagent/v2/VERIFICATION.md`
- V3 执行方案：`/Users/hoye/Documents/workspace/butler-superagent/v3/PLAN.md`
- V3 验证报告：`/Users/hoye/Documents/workspace/butler-superagent/v3/VERIFICATION.md`
- V4.1 执行方案：`/Users/hoye/Documents/workspace/butler-superagent/v4/PLAN.md`
- V4.1 验证报告：`/Users/hoye/Documents/workspace/butler-superagent/v4/VERIFICATION.md`
- V4.2 阶段验证报告：`/Users/hoye/Documents/workspace/butler-superagent/v4/V42-VERIFICATION.md`
- Pi 候选 Worker 验证：`/Users/hoye/Documents/workspace/butler-superagent/v4/PI-VERIFICATION.md`

## 一、纵向切片原则

1. 每片必须走通 `入口 → 路由 → 执行 → 结果 → 通知`，不能只交付一个孤立模块。
2. 每片同时验证成功、失败/取消、重复提交和重启恢复； happy path 通过不算完成。
3. 每片只引入一个主要变量，先隔离语义，再接真实模型，再接真实通道和私有数据。
4. 后续切片必须重跑此前全部端到端回归；模块优化不能破坏已跑通的完整链路。
5. 真实模型前必须有隔离与预算门；真实 vault 前必须有单写入与回退门；生产飞书切换始终最后进行。
6. 每片产出一份证据报告：实际命令、通过/失败/跳过、事件追踪、故障注入结果和遗留限制。

## 二、前置基线（不算功能切片）

- 固定 autoloop Release/SHA 与 Node 版本，记录与调研提交 `1b89219558a493d701cb20e2c3b1876576709889` 的差异。
- 在独立实验目录运行上游 typecheck、协议、模拟和崩溃测试。
- 准备隔离 Hub Home、测试 SQLite、假 Feishu Channel、假 Agent 和合成输入；不读取生产凭据，不写真实 vault。

**准入门**：上游基线可重复运行，实验目录与生产完全分开。

## 三、V0：合成数据的最小完整闭环

### 新增范围

使用**真实 Hub + 真实薄 Adapter + 假 Router/Worker/Feishu**，只支持一个 `research:demo` 上下文和一种 `task.research`。Root Router 先用确定性脚本输出决定，不调用模型；Registry 先用可重放内存投影。

### 完整链路

```text
假飞书 owner.chat
  → Hub
  → 假 Root Router（每条 owner_event_id 一个决定）
  → Context Adapter
  → context.research.message / subject=research:demo
  → Object Control Lane
  → task.research
  → 假 Worker
  → task.result
  → Object Result Lane
  → 假飞书收到统一回复
```

### 同片故障测试

- 成功结果回到原 context_id；Worker 失败/取消只走 Hub 原生状态、重试和系统通知，不伪造 `task.result`。
- 相同 owner event 重放不新增事项；同 token 同结果重交不重复生效。
- 在 Worker 启动后、结果本地保存后、Hub 接收后分别中断并恢复。
- 合法 Worker 提交错误 context_id/task_id、重复或迟到结果时必须拒绝或进入显式对账。

### 验收门

一条合成消息从入口到回复全程可追踪；成功和失败都有可见终态；事件、任务、结果和通知关联不串线；无需真实模型即可证明整条拓扑成立。

**这片通过后，才证明“最小完整流程”存在，而不只是若干模块分别存在。**

## 四、V1：单上下文真实 Claude Code 闭环

### 只新增

把假 Root Router、调研 Specialist 和调研 Worker 逐步替换为真实 Claude Code；仍使用假飞书、合成公开问题、单对象 `research:demo`，不接 DSH/OpenCode，不读写真实 vault。

### 必须具备的安全门

- Claude 专用配置、工具白名单、独立 Home/cwd、环境允许列表和独立系统账号/容器。
- 每规则重试、并发和预算硬熔断；真实付费调用前由用户确认实验额度。
- 确定性结果 envelope 从 Job context 复制关联字段，不能依赖模型填写。

### 同片测试

- 一条真实模型指令完成路由、后台调研和统一回复；运行期间第二条消息不被 Worker 阻塞。
- Root/Object/Result/Worker/Hub 分别重启；Session 续接失败时停在未知或对账状态，不盲目重跑。
- 取消、超时、连续失败、8 跳熔断、重复结果和通知去重均有证据。

### 验收门

真实 Claude Code 单对象完整闭环可重复；失败不伪造成功；预算到顶即停；未接触真实私有数据。

## 五、V2：多对象上下文与持久恢复闭环

### 只新增

加入知识收录、知识讨论、想法讨论三个最小 Specialist 配置，以及 `capture:A`、`capture:B`、`knowledge:A`、`idea:X` 多对象路由；加入持久检查点和 Context Registry 投影。

### 完整链路

每个对象仍走 V0/V1 的完整路径，不单独测试 Router 后就算完成。先用假模型跑敌意时序，再用少量真实模型样本验证语义路由。

### 同片敌意测试

- 首次 claim 前连续发送“收录 A / 收录 B / 想法 X”；失败重试期间再到达第四条。每条 owner_event_id 必须恰好得到路由、追问或拒绝。
- 暂停投影后执行 `create A → continue A → archive A → message A`；stale 快照不得创建重复对象或复活归档对象。
- A 收录期间并行收录 B；讨论 A 不重复收录；切换和恢复 idea:X 不串正文；歧义指代必须追问。
- 归档后从可信检查点恢复；检查点孤立、引用缺失、事件重放和投影重建不产生双真相。
- 恶意 Worker 结果只能进入 `untrusted_working`，不得未经 Owner/可信控制路径进入 confirmed 字段。

### 验收门

多对象完整链路不串 Session、正文、结果或通知；批量与 stale 敌意时序全部通过；生产一致性仍有条件版本/等效事务、租约竞争和崩溃重放证据。

## 六、V3：现有飞书应用的真实通道闭环

### 只新增

把假飞书替换为**当前管家真实飞书应用**的 Owner 私聊或指定测试会话 inbound 和唯一出站 Channel。用户已于 2026-11-17 明确允许复用真实 Key 测试，不再要求另建隔离测试应用。复用现有连接层、Owner 校验、附件下载和 typing；凭据只通过现有 secrets/环境配置注入，不复制到代码、规则或报告。重构期间同一应用始终只能有一个事件消费者，旧 Runtime 与 autoloop 不得同时监听、重复消费或重复回复。

### 同片测试

- 飞书重复投递、乱序、附件失败、Bot 重启和卡片按钮重复点击。
- Owner 校验失败不能进入 Root Router；Worker 不持有飞书或 Hub 管理凭据。
- 长任务运行时新消息仍可路由；结果和失败通知回到正确上下文；投递成功不被误报为用户已读。

### 验收门

使用当前真实飞书应用完成 V1/V2 的完整回归，只开放 Owner 私聊或指定测试会话；同一应用始终单监听。真实 Key 测试已获授权，但全量生产流量切换仍需用户另行明确授权。

## 七、V4：本地知识与可替换 Worker 闭环

### 4.1 先跑知识只读链路

```text
Owner 提问
  → knowledge:<document_id>
  → 本地 vault 只读检索
  → 引用一致的回答
  → 结果通知
```

验证敏感拒读、引用、重启和权限；这一阶段不得发生非声明 vault 写入。

### 4.2 再跑副本收录链路

```text
Owner URL
  → capture:<document_id>
  → 知识 Worker 获取/去重/提炼
  → 候选与质量门
  → 写入 vault 副本
  → 校验和 / 精确路径 / 回滚
  → 原上下文结果通知
```

先用 Claude 知识 Worker 或确定性知识服务证明链路。DSH 作为可替换实现接入：原计划要求 ≥0.2.2；本轮经用户明确授权使用 `0.2.2-rc.3` 做独立 RC 实验，必须使用显式 profile/Home adapter，不冒充稳定版验收。私有数据进入前证明日志上传/遥测关闭或取得单独授权。停止 DSH 后，总管与其他 Worker 仍须运行。

Pi `1.5.2` 另完成一次候选 Worker 纵向验证：通过 loopback OpenCode Server 的直接模型接口复用固定 Go 模型，收录、Result Lane 复核和退出后知识查询均通过。该结果不证明 Pi 长期稳定性或多 Specialist 并发能力，也不代表已统一生产 Runtime。

### 验收门

知识仍只在本地 Markdown；收录可追溯、幂等、可回滚；无未经同意的数据出口；DSH/Pi 都不是主 Runtime。

## 八、V5：主动知识与低打扰闭环

```text
cron
  → command Worker 无模型轮询
  → 新候选去重/预筛
  → 必要时模型评分
  → 静默候选或每日简报
  → Owner 有用/无用/跟进反馈
  → 显式跟进时进入 V4 收录链路
```

同片验证重复转载、热门无关、低热高值、提示注入、来源撤回、预算与频率上限。自动发现默认不直接写正式知识、不直接成为个人记忆，不自动获得生产推送权限。

## 九、V6：迁移、生产切换与后续 Worker

1. 盘点并审核个人记忆、目标和决策；冻结旧写入后做最终增量迁移、数量和校验和核对。
2. 旧 Job/Outbox 完成、明确取消或逐项人工登记，原始文件只读归档。
3. 完成备份、单飞书监听、全部本地事实单写入和回退演练，再由用户决定是否生产切换。
4. OpenCode/Claude 代码 Worker、隔离 worktree、运维 Worker、多模型路由、完整 AIHOT 和多机 Worker 各自另开纵向切片，不做 Big Bang 扩展。

## 十、模块优化如何纳入

最小链路跑通后，优化按所属切片回归，不另起一套脱离业务流程的“优化阶段”：

| 优化项 | 所属回归 |
|---|---|
| 路由准确率、歧义策略、快照性能 | V2 多对象完整链路 |
| 检查点压缩、Session 成本、归档恢复 | V1 + V2 |
| 结果关联、重试、通知去重、可观测性 | V0 + V1 + V3 |
| 知识质量、敏感拒读、收录幂等 | V4 |
| 信源评分、简报频率、预算策略 | V5 |

每次优化必须证明：原端到端链路仍通过、目标指标改善、未扩大权限或事实源范围。没有明确指标和回归证据的抽象不加入。

## 十一、执行顺序与停点

```text
基线 → V0 合成完整闭环
     → V1 真实 Claude 单对象
     → V2 多对象上下文
     → V3 测试飞书
     → V4 本地知识 / 可替换 Worker
     → V5 主动知识
     → V6 迁移与生产切换
```

默认一次只执行一片；每片结束即停，提交证据报告并等待下一片授权。任何 P0/P1 先停线修复，P2/P3 只记录；返工前保留上一版好状态，不自动 Push，不切换生产。
