## 结论 (Verdict)

ship — 第一轮两个 P1 与一个 P2 均已在 Plan 层闭环，修订未引入新的 P0/P1；可进入阶段 0a 隔离实验，但不代表生产就绪。

## 事实清单 (Irreducible Facts)

- autoloop 会合并排队或失败重试期间的同 lane 事件，因此逐消息归属必须由 Router/Adapter 协议显式保证。—— convention
- 路由快照与后续提交之间存在并发窗口；只有版本条件提交或等效同事务校验才能防止 stale 决定生效。—— physics
- 至少一次执行可能重放模型调用和事件提交；确定性事件 ID 是防止重复上下文的必要业务约束。—— physics
- 模型输出只是提议，逐消息完整性、Owner、对象版本及 archived 状态必须由确定性代码校验。—— convention
- Worker 摘要即使脱离原始网页，也仍是不可信衍生数据；信任提升需要可信控制路径，而非改写字段名称。—— convention
- 阶段 0a 只证明路由协议；条件版本、竞争和崩溃测试通过不等于结果关联、权限隔离或生产恢复已经验证。—— economics

## 攻击点 (Attack Points, by severity)

无仍存的重要攻击点。本次复核未发现新的 P0/P1，也不为保留攻击点而制造 P2；剩余不确定性已分别落入 0a、0b、0c 的明确实验与阶段门。

## 幸存结论 (What Survives)

- **批量路由已闭合**：`/Users/hoye/Documents/workspace/plan/butler-superagent-autoloop-plan-v4.md:91-94,101-107,154-158` 要求枚举本轮全部 `owner_event_id`，输出一一对齐的决定数组；漏项、重复或未知 ID 整批拒绝，并覆盖路由、追问和拒绝结果。
- **回放幂等已闭合**：确定性 `ctxmsg:<owner_event_id>` 与稳定对象 ID 直接针对至少一次提交，不再依赖模型在新会话中作出相同判断。
- **快照一致性已闭合**：`/Users/hoye/Documents/workspace/plan/butler-superagent-autoloop-plan-v4.md:95,107,144-146` 要求调用前追平、提交前再校验，并要求 `expected_context_version` 或等效同事务校验；stale 决定只能刷新重试或追问。
- **没有伪装上游能力**：方案明确承认上游可能缺少条件提交接口；阶段 0 的单写入串行原型不能通过生产一致性门，避免把原型证据误当生产保证。
- **归档复活与重复对象已进入硬验收**：`/Users/hoye/Documents/workspace/plan/butler-superagent-autoloop-plan-v4.md:235-240,290-291` 覆盖投影暂停、租约竞争、提交后崩溃和整轮回放。
- **检查点信任提升已闭合**：唯一 Checkpoint Writer、`confirmed/operational/untrusted_working` 分区及 Result Lane 只能提交不可信候选，切断了首轮指出的衍生摘要洗白路径。
- **首刀已收窄**：0a 只验证假 Hub、Router/Adapter 和路由协议；0b、0c 分别承担结果关联与检查点信任，不再要求第一轮同时验收完整系统。

## 修改建议 (Changes)

- **第一轮 P1/P2 已闭环**：
  - 第一轮 P1「批量 `owner.chat` 的逐消息路由」已闭环，无需继续返工。
  - 第一轮 P1「路由快照 stale、重复对象、归档复活」已闭环，无需继续返工。
  - 第一轮 P2「检查点信任提升」已闭环，无需继续返工。
- **进入阶段 0a 前必须改文档的阻断项：无。**
- 实施时不得把 0a 的“单写入串行原型”扩展解释为多写入生产可行；生产一致性仍以条件版本或等效事务、租约竞争和崩溃重放证据为准。
- 0a 报告应逐条列出每个 `owner_event_id` 的最终结果、所用快照水位和提交版本，使“一一对齐”与“stale 拒绝”可从测试证据直接核验。
- 0b、0c 仍是后续独立阶段门；本次 ship 不提前放行真实 Worker、真实模型、vault 写入或生产监听。
