# P3.4 已完成事项与剩余限制

日期：2026-11-20
状态：**P3.4 真实隔离切换演练已完成并通过**。以下「明确未做」「真实接线后仍未执行」「R1 返工后仍然未做」等段落均为当时尚未执行时的历史快照，保留追溯，已被 2026-11-20 真实验收 **supersede**，不再代表当前阻断。

## 当前剩余限制（2026-11-20 最终）

已完成项不再列为阻断；当前只余以下未声称覆盖或需 Owner 决策的事项：

1. **P4 生产接管未授权**：P4／P5 均未开始，必须等 Owner 单独明确授权窗口后才能启动。
2. **机器断电与 macOS 登录冷启动均为 `not_performed`**：本轮只验证真实 Host 进程退出／新进程恢复，不得与机器级断电或登录冷启动混淆。
3. **`accepted` 不等于已读**：投递语义仍是 `at_least_once`，`provider_message_id=null`。
4. **usage／cost=`not_returned`**：不等于 0，也未核验 OpenCode Go 控制台扣费。
5. 未声称覆盖：多批 **>100** 条 frozen spool 的真实 drain、平台侧主动重复投递、SIGUSR2 状态刷新单独投递，以及 ready gate 在真实 freeze 失败后的端到端主机对账。真实 SIGUSR1 freeze 与 SIGTERM 停止已验证。

## 历史快照：明确未做（已被 2026-11-20 真实验收 supersede）

- 未接真实飞书客户端，未发送任何真实通知；`drainFrozen` 的 forward 回调与 `sendReply` 的 deliver 回调都是注入接口，真实 Result Lane／delivery 接线留给后续主 Agent。
- 未启动 Host、模型、Worker、飞书客户端或任何后台服务；未调用真实模型业务链。
- 未做真实旧消费者退出／新消费者独占接管演练；只做同一 SQLite 上双实例 claim 与 `ProcessFileLock` fail-closed 的确定性测试。
- 未做真实 Host 重启、生产 DB 复制、机器断电、macOS 登录冷启动验收。子进程退出测试只证明 spool／dispatching／sending 的确定性恢复语义。
- 未触生产 App／DB／正式 vault，未提交、未推送。
- 未启用发布，未创建 publishing 映射；快照中的 `publishing` 为空不是遗漏，而是本实验不虚构外部效果。

## 已知设计限制

1. `ProcessFileLock` 只提供薄封装 `acquireHandoverLock`；真实 Host 必须在 recovery／drain 前显式持有该锁。`recoverInterrupted` 假定调用方已经独占，否则可能把另一个活跃实例的 `dispatching`／`sending` 行标成 hold。
2. schema=1 的 planner 每个 Decision 只有一个数值版本。多候选 route.select 若候选版本不同，快照省略 `version` 并 hold，不能自动迁移；需人工对账或后续 schema 扩展。
3. 统一状态中的 queued 是从共享事实日志的 `runs`／`run_events`／`events` 推导，不调用 Specialist 的 `queued()`。这避免状态查询推进任何状态，但若未来新增领域事件规则，需要同步 `host-operations.mjs` 的规则映射。
4. 文本回复的 `deliver` 返回值契约：`true`、`{accepted:true}` 或 `{status:"accepted"}` 才算 accepted；其他结果一律 hold，不假设通知已送达。
5. 冻结 spool 的 `forward` 返回值契约与第 4 条相同（R1 已修正，见下）：`true`／`{accepted:true}`／`{status:"accepted"}` 才是接管回执；`undefined`、`null`、`{}`、`false`、`{accepted:false}`、hold／unknown／rejected 及任何未知形状都转 hold 并进入人工对账，不会被标记为 `forwarded`。
6. 状态视图不输出 pending Decision 的候选动作／正文、spool／reply 正文或记忆值；需要排障时应使用受控审计，而不是把私有正文塞回统一状态。
7. 真实飞书 accepted 仍不代表已读；真实 Host／飞书切换验收已于 2026-11-20 完成，机器级断电和 macOS 登录冷启动仍需后续单列证据。

## R1 返工说明（2026-11-20）

- 已确认缺陷：R1 前 `forwardAccepted` 采用放行式判断，`forward: async () => undefined` 会得到
  `{"outcome":"forwarded","forwarded":1,"holds":0}`，把「没有接管回执」误记为已接管。
- 修复：`forwardAccepted` 改为白名单（`true`／`{accepted:true}`／`{status:"accepted"}`），其余结果一律 `hold`；
  新增 11 种回执形状的回归测试。崩溃语义、claim 事务、锁与迁移未改。
- 该修复当时只由确定性单元／进程测试验证，**不代表**真实 Host 或飞书已完成接管验收；后续 2026-11-20 真实隔离演练已完成接管验收，见文末「最终结论」。

## 历史快照：P3.4 真实接线后仍未执行（2026-11-20，已被后续真实验收 supersede）

本 Worker 只完成 `experiments/superagent-p0/real-feishu-client.mjs` 的代码接线与工作记录，以下均未执行：

- 未连接真实飞书，未收发任何真实消息；`handleMessage`／`dispatchMessage`／`drainFrozen` 的真实适配器行为未验证。
- 未启动真实 Host、Worker、模型业务链；`SYNO_P34_TEST_BACKOFF_MESSAGE_ID`、`SYNO_P34_TEST_UNKNOWN_MESSAGE_ID`、`SYNO_P34_TEST_CRASH_BEFORE_IDEA_DRAIN` 三个故障注入点只完成代码路径，未在真实进程触发。
- 未做真实 Host 重启：`process.exit(95)` 之后的冷启动续接、`recoverInterrupted` 对真实 `dispatching`／`sending` 行的处理未验证。
- 未做旧消费者退出／新消费者独占接管与冻结窗口切换：`SIGUSR1`／`SIGUSR2` 只在进程内注册，未做真实信号投递。
- 未做人工 unknown 对账：`SYNO_P34_TEST_UNKNOWN_MESSAGE_ID` 的真实 provider 回执、页面证据与人工对账未执行；代码只保证不伪造 ID、不自动 accept、不自动重发。
- 未做快照回退演练：`migrationSnapshot` 的真实复制、回退增量复核与拒绝覆盖未在本轮执行。
- 未真实生成 `runtime/host-status.json`；该文件只在真实客户端启动后产生，本轮仅静态确认写入路径与元数据不含正文／凭据。
- 机器断电与 macOS 登录冷启动仍单列，不能用进程内退出或单元测试替代。

以上完成前，不得把 P3.4 视为真实切换验收通过。

## 历史快照：R1 返工后仍然未做（2026-11-20，已被后续真实验收 supersede）

R1 只修改 `real-feishu-client.mjs` 与 `PROGRESS.md`／`BLOCKED.md`，完成的是代码与静态自检：

- 未做真实消费者锁竞争：第二个实例在在役 Host 持锁时的启动失败、`handover` frozen 状态与 `instanceId`／PID 状态文件不被改写，只有代码路径与所有权判断，未在真实进程验证。
- 未做真实多批 frozen spool（>100 条）drain，未验证 `pendingCount` 归零后才 unfreeze。
- 三个故障钩子的 `1`／`*` 动态模式只完成代码路径，未在真实飞书消息、真实 `adapter.send` 或真实重启中触发；事件里的实际 messageId 未做真实回读。
- 未做 SIGUSR1／SIGUSR2 真实信号投递与非 owner 拒绝验证。
- 未验证 ready gate 在真实 freeze 失败时抛错后 adapter pending 与后续主机对账的端到端行为。

`node --check`、既有 82 项确定性测试与 `git diff --check` 是静态／确定性自检，不是真实验收。以上真实演练完成前，P3.4 不得视为真实切换验收通过。

## 最终结论

本阶段计划要求的真实隔离演练项目均已完成；历史段中的额外未覆盖项仍以当前剩余限制为准。最终状态与证据见 `PROGRESS.md`「真实隔离演练验收」及 `/Users/hoye/Documents/workspace/syno-p0-real-test/p34-final-independent-audit.json`。
