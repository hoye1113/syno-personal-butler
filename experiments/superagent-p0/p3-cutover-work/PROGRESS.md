# P3.4 确定性内核实施记录

> 公开版脱敏说明：真实 Feishu 消息／实例／Job／文档 ID 已替换为占位符；完整证据保留在本地。

日期：2026-11-20
仓库：`/Users/hoye/Documents/workspace/syno-personal-butler-p0`
范围：P3.4 生产候选与切换演练的确定性内核 + 真实隔离演练实施史。
当前状态：**真实隔离切换演练已完成并通过**（2026-11-20，见文末「真实隔离演练验收」）；机器断电与 macOS 登录冷启动仍 `not_performed`。代码已按上述 4 笔提交，文档尚待主 Agent 精确提交；未推送。未触生产 App／DB／正式 vault。下方「仅代码／静态自检」段落是当时快照，保留作实施与返工史。

## 修改文件

- 新增 `experiments/superagent-p0/host-operations.mjs`
- 新增 `experiments/superagent-p0/host-handover.mjs`
- 最小修改 `experiments/superagent-p0/native-butler-runtime.mjs`：只新增 `handover`／`operations`／`status()`／`migrationSnapshot()` 暴露，不改既有路由和 Specialist 状态语义。
- 新增 `tests/superagent-p3-cutover.test.mjs`
- 新增本目录 `PROGRESS.md`、`BLOCKED.md`

白名单外文件未修改。

## 实现

### 1. 统一状态视图

`host-operations.mjs` 的 `buildHostStatus` 只读共享事实账本：

- capture／knowledge／idea／project／memory 五领域分别给出 active Task 与 queued。
- active Task 字段：`taskId`、`contextId`、`contextVersion`、`attemptId`、`runId`、`state`。
- queued 由 `run_events`／`runs`／`events` 推导，保留 `messageId`、`nativeRunId`、`objectId`／`contextId`、`appId`、`chatId`、`ownerId`、`worker`、`action`；不包含 Worker prompt、正文或记忆值。
- pending Decision 只读记录中 `status === "pending"` 的项，输出 `decisionId`、`kind`、`originMessageId`、`expiresAt`，不调用会懒过期写库的 `decisions.get()`。
- delivery 分为 `queued` 与 `unknown`。`unknown` 强制 `may_send=false`、`claimable=false`；两者保留 `deliveryKey`、`taskId`、`may_send`、`not_before`。
- `handover` 状态来自 `host-handover.mjs`，同时汇总 `reconciliation.deliveryUnknown` 与 `reconciliation.handoverHolds`，并给出 `blocking`。
- 两次状态查询不新增 fact，且快照可直接 JSON 序列化；测试对两次查询做 `deepEqual`。

### 2. 通知退避与 unknown

`openHostOperations` 提供：

- `scheduleDeliveryRetry`：只有 `attempted === false` 的 `unknown`／`claimed` 记录可重新排队；设置 `not_before`、有界 `retry_count`（上限 3）、脱敏 reason、命令回执与命令记录。延迟上限 5 分钟。
- 相同 `commandId` 幂等返回原回执；不同命令在已 queued 时返回 `already_queued`，不增加计数。
- accepted、already queued、缺 `attempted`、`attempted=true`、存在稳定 `provider_message_id`、超过重试上限均不产生可发送效果。
- `claimDueDelivery`：`now < not_before` 直接返回 `not_due`，不调用底层 claim；到期后调用现有 `claimDelivery`，原子 claim 仍由底层完成；重复调用不会二次 claim。
- 不伪造 `provider_message_id`；unknown 保持 `may_send=false` 并进入对账视图。

### 3. 冻结队列与独占接管

`host-handover.mjs` 在同一个 SQLite 事实日志中持久化 `handover_control`、`handover_spool`、`handover_reply`：

- freeze 控制含 `frozen`、`generation`、`reason`、`updatedAt`；重复 freeze／unfreeze 幂等，只有状态转换才增加 generation。
- `intake` 与 freeze gate 在同一事务内判断：未冻结返回 `immediate`，冻结中写入 `frozen` spool；同消息同内容重放零新增 fact，同 ID 不同内容冲突。
- spool 保留 `appId`／`messageId`／`chatId`／`ownerId`／`worker`／`text`，初始 `frozen`；`drainFrozen` 原子 claim 为 `dispatching`，只有显式接管回执（见 R1）才标记 `forwarded`，其余一律 `hold`。
- `dispatching`／`hold`／`forwarded` 不会被 drain 自动重放；`dispatching` 与 reply 的 `sending` 由 `recoverInterrupted` 显式转为人工对账 `hold`，不假设外部副作用未发生。
- 文本回复先持久化 `sending`，再调用 `deliver`；只有显式 accepted 才进入终态，抛错或进程退出时保持 `sending`／`hold`。
- `status`／`pending`／`holds` 提供队列计数与人工对账清单，状态视图不输出 spool／reply 正文。
- `acquireHandoverLock` 仅薄封装现有 `ProcessFileLock`，未新增文件锁实现。

### 4. 数据安全快照

`buildMigrationSnapshot` 从传入的共享 DB 生成 schema=1 纯数据：

- inbox：processed 仅 dedupe，保留 appId／messageId／对象映射。
- Task：completed→history；queued→requeue；running 仅在显式 `checkpoint`＋`sourceSha256` 时 resume，否则 hold。
- Decision：pending 仅在存在单一精确版本时 `migrate_exact_version`；consumed→只读历史（schema 中映射为 accepted 并保留 sourceState）；cancelled／expired→只读历史（映射为 rejected）；其余 hold。
- delivery：accepted→dedupe_no_resend；queued→migrate_claimable；unknown→hold。
- Idea／Project／Memory index：只带 ID、对象、状态和当前版本做 `copy_versioned`，不复制私有记忆正文。
- 仅收集已有 `enabled === true` 的 external effect／publishing 映射；本实验为空，不虚构发布。
- 不读取旧生产数据，不恢复旧 Task／Workflow／Session。

## 自检命令与结果（首轮，R1 前）

> 下列计数为 R1 前的首轮结果（cutover 10 项）。R1 增补回归后以本文「R1 返工」一节的实跑结果为准。

```text
node --test tests/superagent-p3-cutover.test.mjs
# tests 10 / pass 10 / fail 0 / cancelled 0 / skipped 0 / todo 0
```

```text
node --test tests/superagent-p3-runtime.test.mjs \
  tests/superagent-p3-idea.test.mjs \
  tests/superagent-p3-project.test.mjs \
  tests/superagent-p3-decision-memory.test.mjs \
  tests/superagent-p3-migration.test.mjs \
  tests/superagent-p3-native-migration.test.mjs \
  tests/superagent-p3-cutover.test.mjs
# tests 81 / pass 81 / fail 0 / cancelled 0 / skipped 0 / todo 0
```

```text
node --check experiments/superagent-p0/host-operations.mjs
node --check experiments/superagent-p0/host-handover.mjs
node --check experiments/superagent-p0/native-butler-runtime.mjs
node --check tests/superagent-p3-cutover.test.mjs
git diff --check
# 全部通过
```

```text
npm run gate
# tests 941 / pass 922 / fail 0 / cancelled 0 / skipped 19 / todo 0
# Repository verification passed (5164 files).
# Active documentation check passed (8 files).
```

## R1 返工（2026-11-20）

### 原因

主 Agent 复审反例：`forward: async () => undefined` 被判定为成功，结果为
`{"outcome":"forwarded","forwarded":1,"holds":0}`。原 `forwardAccepted` 采用「非 false／非拒绝即成功」的放行式判断，
把 `undefined`、`null`、`{}` 以及未知状态都当成原 Specialist 已接管，`drainFrozen` 随后把 spool 标为 `forwarded`，
会掩盖真实任务缺口，违反「deferred 业务被原 Specialist 接管后才 forwarded」。

### 修复

- `experiments/superagent-p0/host-handover.mjs`：`forwardAccepted` 改为白名单，仅
  `result === true`、`result?.accepted === true`、`result?.status === "accepted"` 进入 `forwarded`；
  其余（`undefined`／`null`／`{}`／`false`／`{accepted:false}`／hold／unknown／rejected／任何未知形状）一律 `hold`，
  `holdReason` 取回调的脱敏 `reason`，缺省 `dispatch_not_accepted`。与 `sendReply` 的 `deliver` 回执契约保持一致。
- 未改动状态机、claim 事务、`dispatching` 崩溃语义、锁、迁移与 Specialist；dispatch 抛错仍 `hold` 且不自动重放。
- `tests/superagent-p3-cutover.test.mjs`：新增回归「a spool is forwarded only on an explicit takeover receipt and never replayed from a hold」，
  覆盖 11 种回执形状：仅 `true`／`{accepted:true}`／`{status:"accepted"}` 为 `forwarded`（3 条），其余 8 条为 `hold`；
  每个 spool 只 forward 一次；hold 后再次 drain 不调用 forward、不新增 fact；hold 项 `needsReconciliation=true`、`autoReplay=false`。

### 反例回归证据

```text
node <临时探针，直接调用 openHostHandover().drainFrozen>
{"label":"() => undefined","outcome":"hold","forwarded":0,"holds":1}
{"label":"() => null","outcome":"hold","forwarded":0,"holds":1}
{"label":"() => ({})","outcome":"hold","forwarded":0,"holds":1}
{"label":"() => false","outcome":"hold","forwarded":0,"holds":1}
{"label":"() => ({ accepted: false })","outcome":"hold","forwarded":0,"holds":1}
{"label":"() => true","outcome":"forwarded","forwarded":1,"holds":0}
{"label":"() => ({ accepted: true })","outcome":"forwarded","forwarded":1,"holds":0}
```

### 自检命令与结果（R1 实跑）

```text
node --test tests/superagent-p3-cutover.test.mjs
# tests 11 / pass 11 / fail 0 / cancelled 0 / skipped 0 / todo 0

node --test tests/superagent-p3-runtime.test.mjs \
  tests/superagent-p3-idea.test.mjs \
  tests/superagent-p3-project.test.mjs \
  tests/superagent-p3-decision-memory.test.mjs \
  tests/superagent-p3-migration.test.mjs \
  tests/superagent-p3-native-migration.test.mjs \
  tests/superagent-p3-cutover.test.mjs
# tests 82 / pass 82 / fail 0 / cancelled 0 / skipped 0 / todo 0

node --check experiments/superagent-p0/host-handover.mjs   # 通过
node --check tests/superagent-p3-cutover.test.mjs          # 通过
git diff --check                                           # 通过
```

以上只是确定性单元／进程测试通过，不代表真实 Host、飞书接管或生产切换验收。

## 测试覆盖对照

1. 统一状态完整、只读、可 JSON 序列化，未知与 queued 分离，状态视图不含私有正文。
2. freeze 前／中／后归属；冻结中只 spool；新 Host drain 仅执行一次；同消息重放零新增业务。
3. 真实 `node` 子进程写入 spool 后退出；父进程重开 SQLite 只 dispatch 一次。
4. 子进程在 `dispatching`／`sending` 退出；父进程不自动重放，显式恢复为 hold 后仍不重放。
5. Runtime 关闭重开后 queued 仍在，前序完成后继续并保持 Context 1→2。
6. 退避、提前 claim 拒绝、到期仅 claim 一次、attempted 边界、unknown、accepted 终态、重试上限。
7. 快照复制、dedupe、精确版本、源哈希不变、外部效果 0、回退新增／修改／删除增量复核、拒绝覆盖副本。
8. P3.0–P3.3 相关测试合跑 81/81 通过，无回归。

## 设计限制

- schema=1 的迁移 planner 每个 Decision 只有一个数值版本。多候选 route.select 若各候选版本不同，快照会省略 version 并进入 hold，而不是用任一候选版本近似；这是安全失败。
- reproduction 只证明确定性进程恢复，不冒充真实 Host、飞书、机器断电或 macOS 冷启动验收。详见 `BLOCKED.md`。

## P3.4 真实 Host／飞书接线（2026-11-20，仅代码）

范围：只改真实测试客户端接线与工作记录。未启动 Host、飞书、Worker 或模型业务链，未读取／输出凭据，未触生产，未提交、未推送。未新增业务数据库，未改 Feishu SDK／channel adapter，未新增文件锁实现。

### 修改文件

- `experiments/superagent-p0/real-feishu-client.mjs`（唯一代码改动）
- 本目录 `PROGRESS.md`、`BLOCKED.md`

### 1. 共享路由与 freeze intake

- `handleMessage`：原 adapter `onMessage` 业务主体原样抽出。正常入站与冻结 drain 都只经 `dispatchMessage → handleMessage`，不存在第二套路由。
- `dispatchMessage`：
  - `{deferredDelivery:true}` 原样返回，业务通知仍由原 Specialist Result Lane／delivery 发送。
  - 立即文本调用 `butler.handover.sendReply`：先持久化 `sending`；`deliver` 内使用 `adapter.send`；只有 `delivered === true` 才映射 accepted；`providerMessageId` 只取真实回执字段，缺失为 `null`。
  - accepted／hold 都写脱敏事件（`handover-reply-accepted`／`handover-reply-hold`，不含正文），并统一返回 `{deferredDelivery:true}`，防止 adapter fallback 二次发送；hold 当且仅当 hold，不冒充 accepted。
  - 无 text 且非 deferred 时沿用原 adapter 缺省文本「任务已记录，请在 Syno 查看状态。」
- 新 `onMessage` 只做四步：
  1. `await readyPromise`，等 Host 启动恢复完成。
  2. 用 `appId=TEST_APP_ID`、原 `messageId`／`chatId`／`ownerId`、`worker = message.worker || "OpenCode"`、原 `text` 调 `butler.handover.intake`。
  3. `immediate` → `dispatchMessage`；`spooled` → 只写 `handover-spooled-intake` 脱敏事件与统一状态，返回 `{deferredDelivery:true}`，不路由、不建 Task、不立即回复。
  4. 同消息重放继续由 handover／Specialist 各自幂等约束，未绕过。

### 2. 独占启动、恢复、drain 与停止

- 复用 adapter 既有 `ProcessFileLock`（`runtime/locks/feishu-test-channel.lock`），未新增第二把业务锁；`adapter.start()` 成功并断言 `running` 后才视为持有独占消费者锁。
- 启动顺序：
  1. `await adapter.start()` 并断言 running。
  2. `butler.handover.recoverInterrupted()`：`dispatching`／`sending` 只转 hold，绝不重放；此时 onMessage 仍被 ready gate 挡住。
  3. 循环调用 `butler.handover.drainFrozen`（每批默认上限 100），每批后读 `pendingCount`，直到 `pendingCount === 0`；`forward` 调用同一个 `dispatchMessage`，只有明确返回 deferred 才给 `{accepted:true, receipt:"handover-forward:<messageId>"}`，空结果／异常一律不 forwarded。
  4. 全部 frozen 清空后写 `spool-drain` 统一状态（含批次数与汇总 outcomes），再 `unfreeze`、写 `startup-takeover` 状态，最后 `settleReadyGate("ready")` 放行 onMessage。
  5. 继续原 capture／idea／project／memory queued drain。
- ready gate 在 adapter 构造前建立，只有 `ready`／`aborted` 两种终态且永不 reject；`stop()` 先 freeze 再以 `aborted` 释放 gate，启动失败也走同一 `stop()`，因此 `adapter.stop()` 不会等待一个永远等 ready 的 onMessage。
- 停止顺序：`freeze({reason:"host-stop"})` → `stopping=true` → 以 `aborted` 释放 gate → 清 delivery timer → 等待既有 background／drain → `adapter.stop()` → 写 `running=false` 客户端状态 → 写 `stopped` 统一状态 → `butler.close()`。正常停止保留 frozen，作为下次唯一 Host 接管的安全终态。
- `hostOwnsConsumer` 只在 `adapter.start()` 返回 `running===true` 后置真；未抢到消费者锁的第二个实例即使启动失败进入 `stop()`，也不会 freeze、不会改写活动 Host 的客户端状态或 `host-status.json`。
- 进程内控制信号（均先判 `hostOwnsConsumer`）：
  - `SIGUSR1`：freeze 并写统一状态；异步失败写入 `adapter.lastError` 与脱敏事件，不静默吞掉。
  - `SIGUSR2`：只刷新统一状态文件。

### 3. 统一状态文件

- 新增 `runtime/host-status.json`（真实测试根下即 `/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/host-status.json`），用既有 `writeJson` 写 `butler.status()`。
- 附加非正文元数据：`host.instanceId`、`host.pid`、`host.appId`、`host.observedAt`、`host.adapter.running`、`host.adapter.available`；不写凭据、spool／reply 正文、Memory 值或 Worker prompt。
- 刷新点：`startup-takeover`、`host-stop-frozen`（停止 freeze）、`spool-intake`、`spool-drain`、`sigusr1-freeze`、`sigusr2-refresh`、`stopped`。
- 状态来自只读 `buildHostStatus`，查询本身不推进 Specialist／Decision／delivery。

### 4. delivery 退避与 unknown 故障注入

- 六处业务 delivery 的 `*.claim(deliveryKey)` 改为 `butler.operations.claimDueDelivery({deliveryKey})`：capture、idea、project、knowledge、memory confirm、memory proposal。保留原 claim 失败、accept、unknown、通知前独立重读逻辑；`not_before` 未到期时 `claimed=false`，不触达 `adapter.send`。
- Idea delivery 两个一次性测试钩子（无环境变量时零行为变化，值可为精确 messageId 或动态 `1`／`*`）：
  - A. `SYNO_P34_TEST_BACKOFF_MESSAGE_ID=<messageId>`，可选 `SYNO_P34_TEST_BACKOFF_DELAY_MS`（非负毫秒，默认 1000）：在 claim 已把 delivery 置 unknown、`adapter.send` 尚未调用处触发一次；调用 `scheduleDeliveryRetry({attempted:false, delayMs, reason:"p34 isolated before-transport backoff", commandId:"p34-backoff:<messageId>"})`；写含 `notBefore`／`retryCount` 的脱敏事件；受 stop 管理的 timer 到期后重入同一 `deliver`；进程内只触发一次，不会循环重排。该路径只证明「明确未发送」后的退避，不冒充发送失败 unknown 的自动重试。
  - B. `SYNO_P34_TEST_UNKNOWN_MESSAGE_ID=<messageId>`：真实 `adapter.send` 返回 delivered 后、`idea.accept` 前一次性抛错，走既有 `idea.unknown`；结果保持 unknown／`may_send=false`／`provider_message_id=null`，不伪造 provider ID、不自动 accept，后续重放或重启不自动重发。

### 5. 真实 Host 重启故障注入

- `SYNO_P34_TEST_CRASH_BEFORE_IDEA_DRAIN=<queued messageId>`（值也可为动态 `1`／`*`）：在 `requestIdeaDrain` 真正创建／执行 drain 前，仅当 `idea.queued()` 中确实存在目标 `messageId`，且该 queued 消息所属 Idea 对象没有未结算 active Task 时，先写脱敏事件 `p34-crash-before-idea-drain`（`messageId`／`queuedMessageId` 写实际 ID、`ideaId`、`taskCreatedForQueuedMessage:false`），再 `process.exit(95)`。
- `queued` 不存在时不会在启动即退出；同一对象前序 Task 尚未结算时不会冒充目标场景；动态 `1`／`*` 只在真正 drain 前选下一个已结算对象下的 queued 项；未添加同进程 drain 替代验收；新进程不设置该变量时由既有启动 `requestIdeaDrain()` 自动续接。

### 6. 自检命令与结果（本轮实跑）

```text
node --check experiments/superagent-p0/real-feishu-client.mjs
# 通过

node --test tests/superagent-p3-runtime.test.mjs \
  tests/superagent-p3-idea.test.mjs \
  tests/superagent-p3-project.test.mjs \
  tests/superagent-p3-decision-memory.test.mjs \
  tests/superagent-p3-migration.test.mjs \
  tests/superagent-p3-native-migration.test.mjs \
  tests/superagent-p3-cutover.test.mjs
# tests 82 / pass 82 / fail 0 / cancelled 0 / skipped 0 / todo 0

git diff --check
# 通过
```

以上仍只是静态与确定性测试，未启动真实客户端；真实飞书、Worker、重启、切换与人工对账仍未由本 Worker 执行（见 `BLOCKED.md`）。

## 真实接线 R1（2026-11-20，仅代码与静态自检）

本轮按 R1 任务书做最小返工，只改 `real-feishu-client.mjs` 与 `PROGRESS.md`／`BLOCKED.md`。未启动真实 Host、飞书、Worker 或模型业务链，未读取／导出凭据，未提交、未推送，未新增路由、业务库或锁实现。

### P1-1 非锁持有者不得干扰在役 Host

- 新增本实例消费锁所有权状态 `hostOwnsConsumer`，仅在 `adapter.start()` 返回 `running===true` 后置真（`real-feishu-client.mjs:1761`）。
- owner-only 操作：启动 `recoverInterrupted`／`drainFrozen`／`unfreeze`（`:1766-1807`）、`stop()` 的 `freeze`／两个状态文件写入（`:1694-1730`）、`SIGUSR1`／`SIGUSR2`（`:1737`／`:1751`）全部先判所有权。
- `writeHostStatus` 自身也加所有权守卫（`:1670-1673`），非 owner 即使调用也不落盘 `host-status.json`；`feishu-client-status.json` 只在 owner 启动成功与 owner 停止时写。
- 非 owner 启动失败走同一 `stop()`，只释放自己的 adapter、delivery timer 与 DB 句柄，不 freeze／recover／drain／unfreeze，不覆盖共享状态文件。
- owner 正常停止仍保持原顺序：freeze → `stopping=true` → 释放 gate → 清 timer → 等待 background／drain → `adapter.stop()` → 写客户端 stopped 状态 → 写统一 `stopped` 状态 → `butler.close()`。

### P1-2 frozen spool 必须全部 drain 后才能 unfreeze

- 启动流程改为循环调用 `drainFrozen`（`:1771-1804`），逐批累计脱敏 outcomes 与批次数；每批后读 `butler.handover.status().pendingCount`，仅当 `pendingCount===0` 才 `unfreeze`；`unfreeze` 前再校验一次，非 0 直接失败。
- `hold`／`forwarded`／`dispatching` 不计入 `pendingCount`，也不会为了清空 pending 被重放。
- 若仍有 pending 但某批无法 claim 到任何行（无进展），抛错保持 frozen 状态并走失败停止，不 unfreeze、不空转。
- ready gate 在全部 frozen 处理完并 `unfreeze` 之后才 `settleReadyGate("ready")`，期间 immediate 入站不放行。

### P1-3 三个真实故障钩子支持“下一条”模式

- 新增 `isNextMessageHook`／`matchesMessageHook`（`:80-83`）：值为精确 messageId 时行为不变；值为 `1`／`*` 时表示该故障点下一个到达的匹配项。
- `SYNO_P34_TEST_BACKOFF_MESSAGE_ID`（`:382`）与 `SYNO_P34_TEST_UNKNOWN_MESSAGE_ID`（`:418`）复用该判定，仍由一次性布尔守卫保证进程内只触发一次，匹配领域仍是原 Idea delivery 故障点。
- `SYNO_P34_TEST_CRASH_BEFORE_IDEA_DRAIN`（`:817-835`）：精确 ID 保持原行为；`1`／`*` 在真正 drain 前选下一个 `idea.queued()` 中且所属 Idea 无未结算 active Task 的项，前序未结算时继续等待；启动时无 queued 不退出；`messageId`／`queuedMessageId` 写实际 messageId，不写 `1`／`*`；事件新增 `hookMode: "next"|"exact"`。

### P1-4 不得伪造 provider message ID

- 核对 `deliverHandoverReply`（`:1595-1601`）：只接受字符串 `delivery.providerMessageId`，否则 `providerMessageId=null`；工作树在开工时已无 `delivery.messageId` 回退（与初版留档不同），本轮未重新引入。`delivered===true` 才 accepted 的规则不变。

### P1-5 ready gate 的停止／失败路径不得放行 immediate 路由

- gate 仍是无 rejection 的单次 Promise，新增终态 `readyState`：`pending → ready | aborted`（`:87-96`）；`stop()` 与启动失败以 `aborted` 释放（`:1709`），成功接管以 `ready` 释放（`:1807`）。
- `onMessage`（`:1633-1660`）：非 owner 直接抛受控错误，不触 handover；owner 先 `intake`，只有 `immediate` 且 `readyState==="ready"`、非 `stopping` 才 `dispatchMessage`，否则抛受控错误让 adapter 保留 pending 交后续唯一 Host 对账。
- 不变量：只有“已成功完成接管且未 stopping”的 owner 可处理 immediate；未 ready 的等待消息要么已持久化 spool（返回 deferred），要么留在 adapter pending，绝不静默完成或路由。freeze 成功时 `intake` 返回 `spooled`，仍按原逻辑 deferred。

### 自检（本轮实跑原始结果）

```text
node --check experiments/superagent-p0/real-feishu-client.mjs
# 无输出，退出码 0（通过）

node --test tests/superagent-p3-runtime.test.mjs \
  tests/superagent-p3-idea.test.mjs \
  tests/superagent-p3-project.test.mjs \
  tests/superagent-p3-decision-memory.test.mjs \
  tests/superagent-p3-migration.test.mjs \
  tests/superagent-p3-native-migration.test.mjs \
  tests/superagent-p3-cutover.test.mjs
# ℹ tests 82 / suites 0 / pass 82 / fail 0 / cancelled 0 / skipped 0 / todo 0

git diff --check
# 无输出，退出码 0（通过）
```

以上只是语法检查与既有确定性测试，当时未启动真实客户端；真实竞争、真实 drain、真实重启与 SIGUSR1 freeze／SIGTERM 停止随后由文末「真实隔离演练验收」完成，SIGUSR2 状态刷新未单独投递。

## 真实隔离演练验收（2026-11-20，已完成）

本节是 P3.4 的最终验收记录；上方「未接真实飞书／未启动 Host」「仅代码与静态自检」等段落均为当时快照，已被本节真实演练 **supersede**。

### 代码检查点

- `9fac4c519154e452e2cddbe30531ed68f518aac8 feat: 增加 P3.4 切换与恢复确定性内核`
- `7751be381cb1618ed2acdcf63af2fee74151ed6e feat: 接入 P3.4 真实 Host 切换控制`
- `a4cfda931 fix: 明确 Idea 引用必须唯一`
- `cd4e0d4f2 feat: 支持 Idea 同消息恢复重放`

均已提交，未推送。

### 真实链路与最终状态

- 统一隔离 DB：`/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-decision-memory.db`；真实测试 App `cli_<redacted>`；未触生产 App／DB／正式 vault。
- 最终独立审计 `/Users/hoye/Documents/workspace/syno-p0-real-test/p34-final-independent-audit.json`：facts=**278**、累计 **19** 个 Task 全 completed、**19** 个 delivery 全 accepted；active Task=0、queued=0、delivery queued=0、unknown=0、pending Decision=0、handover hold=0。`accepted` 不代表已读，`provider_message_id=null`，capability=`at_least_once`。
- Idea A `idea-82e425fd3e0ee887` 最终 v6，v3／v4／v6 SHA256 分别为 `cb05faa7994b544d64947dea025edd39bd7e804c86079ff929a79600e1129455`／`a5a9b206e2d1f968aa840eee79e0dbe5307abbf70d29bd45573553bb6c792c3b`／`41a6453b76b91ef965c4d94ebbf58ee852fe13f23dc9d20192605e513aefbbe9`；跨对象 Idea B `idea-9910ed53a0fdd38b` 始终 v1，SHA256 `dbef477049a98a43539b837a56c8538dae6f3e545e507ecb87c888474820aba2`。主 Agent 已独立重算 A v1–v6 与 B v1 的全部产物哈希并匹配账本。
- 6 个领域 Task 与 2 个立即 reply 均有唯一消息身份：A `om_<redacted>`（Context v3，`attempt-14-1`，run 14）；B `om_<redacted>`（Context v4，`attempt-15-1`，run 15）；退避 1 `om_<redacted>`（Context v5，run 16）；退避 2 `om_<redacted>`（Context v6，run 17）；before `om_<redacted>`；during `om_<redacted>`（知识 Context v1，run 18）；after `om_<redacted>`；增量 `om_<redacted>`（知识 Context v2，run 19，Result Lane passed）。
- 两条知识查询均返回“该文档中没有找到匹配内容”，未调用模型；只声称本地只读查询与 Result Lane 闭环通过，未声称生成最佳实践摘要。

### 真实 Host 重启、恢复与 unknown

- Host A 在前序 Idea 已结算、后序仍 queued、真正 drain 前真实 `exit 95`；原始输出 `/private/tmp/claude-501/-Users-hoye-Documents-workspace/<redacted-uuid>/tasks/bhd0703xf.output`。A 的 Worker 最初连续两次因 quote 不唯一在写 artifact／evidence 前失败，未做第三次盲目重试、未清库或伪造候选；`a4cfda931` 只补 prompt 唯一性约束，随后用同一冻结输入／Task／Attempt 做一次有代码依据的恢复，usage／cost=`not_returned`。证据 `p34-a-quote-fix-worker-result.json`、`inbox/idea-om_<redacted>-evidence.json`、`p34-a-after-worker-recovery-audit.json`。
- Host B 自动 drain 后序 B，生成 v4／Task／Attempt／run 并真实发送通知；在 `adapter.send` delivered 后、`idea.accept` 前注入故障，保持 unknown／`may_send=false`。Host C 重启不重发，页面人工对账后才 accept，provider=null。证据 `p34-after-exit95-audit.json`、`p34-host-b-unknown-audit.json`、`p34-host-c-reconciled-audit.json`、`p34-host-c-page-observation-2.txt`、`p34-host-c-unknown-page.png`、`p34-b-unknown-manual-accept.json`。
- `cd4e0d4f2` 新增真实 Idea 同消息恢复入口，复用 existing Task／run、`finishIdea` 和原 Result Lane；首版缺后序 drain，一轮返工补 `requestIdeaDrain()`，独立 **82/82** 通过后才启动真实 Host。

### 通知退避

- 故障点为 claim 已写 unknown、transport 尚未调用；只有明确 `attempted:false` 才允许 15 秒退避。
- 第一条消息的首次独立 `not_due` 观察迟到，原样保留失败记录 `p34-backoff-first-not-due-attempt.txt`，不计为通过；第二条用独立 watcher 获得有效 `status=not_due`、facts **240→240**（`p34-backoff-not-due.json`）。两条最终均 accepted、`retry_count=1`、provider=null，证据 `p34-backoff-final-audit.json`、`p34-backoff-page.png`、`p34-backoff-page-observation.txt`。

### 冻结窗口、独占接管与竞争实例

- 主 Agent 对旧 Host PID 6708、instance `<redacted-uuid>` 投递真实 SIGUSR1 完成 freeze；旧 instance 完成 before reply 后由真实 SIGTERM 正常停止；during 冻结 generation 6 下只有 spool，无 Task／delivery／processed inbox。
- 新 instance `<redacted-uuid>` 持锁后按 recover→drain frozen 至 pending=0→unfreeze→ready 接管，走同一 Specialist／Result Lane／delivery；spool forwarded、attempts=1；after 由新 instance reply accepted。证据 `p34-cutover-old-frozen-audit.json`、`p34-cutover-three-windows-audit.json`、`p34-cutover-three-windows-page.png`。
- 竞争 Host 退出码 **1**、`FEISHU_PROCESS_LOCKED`，Host 状态文件 SHA256 完全不变，facts 保持 **263**。证据 `p34-pre-competitor-host-status.json`、`p34-pre-competitor-feishu-status.json`、`p34-competitor-output.txt`、`p34-competitor-exit-code.txt`、`p34-post-competitor-audit.json`。

### 数据快照与真实增量回退对账

- 快照 **63** 个文件，actionCounts：dedupe_only=18、history_only=25、dedupe_no_resend=18、copy_versioned=6；externalEffects=0；源／目标哈希一致、源不变；未包含凭据、Session、Worker request／attempt 或数据库；旧 Task／Workflow／Session 只读归档。证据 `p34-pre-migration-status.json`、`p34-migration-candidate/`、`p34-migration-prepare-output.json`、`p34-migration-independent-hash-audit.json`。
- 快照后真实知识增量最初只在页面出现，未重发、未伪造 messageId／artifact、未把内部 feed ID 当 provider ID；原消息随后自行补达并完成。最终停止唯一 Host 后 channel pending=[]、seenCount=74。产物 SHA256 `5131d30ac320212d399e7dd2c26d2b6f9fda94b3ed1f72137cf8634b0c00022b`；证据 `p34-increment-audit.json`、`p34-increment-final.png`。
- 回退对账：delta added=`domain/knowledge/om_<redacted>.json`、changed=`feishu-dedupe.json`、`requiresIncrementReview=true`；旧快照直接复制被拒绝且增量副本不变；`sourceOverwritten=false`、`targetConsumerStarted=false`、`rollbackExecutedAgainstLiveRuntime=false`。结论：保持停止并前向修复，不强行吸收增量，不双消费者运行。证据 `p34-rollback-output.json`、`p34-migration-candidate/rollback-reconciliation.json`。

### 门禁与清理

- 主 Agent 独立 `npm run gate`（日志 `p34-final-gate.log`）：tests=**942**、pass=**923**、fail=**0**、cancelled=**0**、skipped=**19**、todo=**0**；Repository verification **5164 files**；active documentation check **8 files**；`git diff --check` 通过。P3.4 相关七文件合跑此前独立 **82/82** 通过。最终综合断言 `p34-final-verification.json`（`ok=true`）覆盖 6 个领域消息＋2 个立即回复、9 份产物哈希、63 个源文件不变、8 个本轮消息去重，且 pending／active／queued／unknown／pendingDecision／hold／残留消费者均为 0。
- 最终 Host 正常停止：`runtime/host-status.json` 的 `host.running=false`、`adapter.running=false`、`stoppedAt=2026-11-20T02:11:33.696Z`；`pgrep -fl 'real-feishu-client\.mjs'` 无匹配，`p34-final-consumer-processes.txt` 为空；bsk `cwxu` 已停止，无第二测试消费者。
- 限制：机器断电与 macOS 登录冷启动均为 `not_performed`，不得与真实 Host 进程退出／新进程恢复混淆；accepted 不等于已读；usage／cost=`not_returned`；真实 SIGUSR1 freeze 与 SIGTERM 停止已验证，SIGUSR2 状态刷新未单独投递；多批 >100 frozen drain、平台主动重复投递未声称覆盖。未触生产 App／DB／正式 vault，未自动推送。
