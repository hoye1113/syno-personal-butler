# P3.3 真实 Memory Worker 与飞书接线（第 2 轮实现 + 第 3 轮真实执行验收）

> 公开版脱敏说明：真实 Feishu 消息／实例／Job／文档 ID 已替换为占位符；完整证据保留在本地。

基线：`d04a815c feat: 增加 Decision Lane 与 Memory 确定性内核`。开工时工作树干净。

> 第 3 轮已在同一代码检查点完成真实模型、真实飞书、独立审计与全量门禁，见文末「第 3 轮：真实执行与验收」。下文第 1／2 轮与 R1／R2 段落保留原记录。

本轮目标：实现真实 Memory Worker 合约、Memory 候选的原生 Task 路径、独立飞书测试客户端接线和确定性测试／本地烟测脚本。**未调用真实模型、未启动飞书、未提交或推送。**

## 实际文件

新增：

- `experiments/superagent-p0/memory-worker-contract.mjs`
- `experiments/superagent-p0/memory-worker-smoke.mjs`

修改：

- `experiments/superagent-p0/native-memory-runtime.mjs`
- `experiments/superagent-p0/real-worker-probe.mjs`
- `experiments/superagent-p0/real-feishu-client.mjs`
- `tests/superagent-p3-decision-memory.test.mjs`
- `experiments/superagent-p0/p3-decision-memory-work/PROGRESS.md`
- `experiments/superagent-p0/p3-decision-memory-work/BLOCKED.md`

## 实现要点

### Memory proposal 原生路径

- `beginProposal(message)`：
  - 复用安全 `messageId`、Owner、`OpenCode`／`Pi` 白名单、`parseMemoryScope`、作用域对象存在性校验。
  - `memoryId = appId:messageId`，Context=`memory:<memoryId>`，候选版本 v1。
  - 在 ingest 前冻结 `sourceText`（上限 4000）、scope、owner、worker、`inputSha256` 与 `recall({ownerId,contextId:scope})` 当次返回的 active 记忆（ID／version／scope／preference／value SHA，最多 20 条、每条 500 字符）。
  - ingest `memory.request`（action=`propose`）→ ApplyRoute → claim → createTask；Task acceptance 指向 `memoryVersionFile(...v1-messageId.json)` 并绑定 `inputSha256`。
  - 同消息重放从既有事件恢复冻结输入，不重新召回；冻结输入同时绑定 `chatId`，恢复时逐项核对 App／Chat／Owner／Worker／sourceText／inputSha；同对象 queued 只入队，不提前推进 Context／建 Task。
  - 在 Result Lane 前不创建 `memory_index`，也不创建 activate Decision。
- `completeProposal(execution, workerResult)`：
  - 只接受严格 `{preference}` 或等价 JSON；trim 后 1–500 字符，拒绝额外字段、空值、异常结构。
  - 独立核对 execution 与冻结 input 的 messageId／taskId／attemptId／memoryId／owner／scope／sourceText／inputSha256／worker／recalled；召回条目逐条对历史版本做 Owner／scope／value SHA 校验。
  - 宿主生成规范候选 JSON（schema、memoryId、ownerId、scope、operation=propose、version=1、preference、valueSha256、sourceText、冻结 recalled、messageId／taskId／attemptId／inputSha256），`wx` 写盘；已存在必须字节一致。
  - 独立重读文件、逐字段核对并计算文件 SHA；随后 `reportWorkerDone`（仅结束 Attempt）→ finish → recordVerification → finalizeTask。
  - Result Lane 通过后才创建 activate Decision 与 pending Memory v1；Decision 绑定后续 activate 的精确 value SHA。
  - 已完成 Task 重放从候选文件恢复，不重复写 Decision／index／delivery；写盘后子进程退出可用同消息恢复原 Attempt。
- `trace` 增加 proposal 字段：event、pending、memoryStatus、worker、sourceTextSha256、recalled、Decision ID；completed 重放不会重新打开已激活记忆的 pending 指针。
- `queued()`／`drainQueued()` 同时识别 proposal 与 confirmation：proposal 恢复原事件／run／冻结召回，confirmation 保持第 1 轮 live／stale 语义。

### Worker 合约与 probe

- `memory-worker-contract.mjs`：
  - 固定模型 `opencode-go/deepseek-v4.1-flash`；校验 request 的消息／Task／Attempt／记忆 ID、Owner、scope、sourceText、inputSha、worker、model 与冻结 recalled。
  - `buildMemoryPrompt` 只含 sourceText 与冻结 recalled；明确不可信素材、无工具／网络／文件读写，只输出 preference；scope 由宿主固定。
  - `memoryResponseSchema`／`parseMemoryModelResponse`／`parseMemoryWorkerResult` 严格只允许 `{preference}`。
  - 规范候选 JSON 构建／解析与 `sourceText` SHA。
- `real-worker-probe.mjs`：
  - 新增互斥 `--memory-request`；调用前执行 `assertMemoryRequest`。
  - 仅把模型 `preference` 放入证据；不写 Memory 业务候选文件。
  - 证据含 request IDs／版本／scope／sourceText SHA／冻结 recalled（含 preference 与 value SHA）／preference／prompt SHA／沙箱 probes／固定模型／usage／cost／`resultLane=delegated_to_host`。
- `memory-worker-smoke.mjs`：
  - 独立临时 DB／roots，每进程最多一次真实模型调用，`feishuCalls=0`。
  - 确定性准备 owner active、idea:A active、idea:A pending candidate、idea:A pending correction、idea:A revoked、project:B active、另一 Owner active。
  - 调用真实 Pi 前断言 request／prompt 只含授权值，排除 pending／pending correction／revoked／project:B／其他 Owner canary。
  - probe 后宿主 `completeProposal`，独立核对 pending v1、activate Decision、Task／Attempt／run、文件 SHA、delivery accepted，并验证确认前 recall 不含新候选。
  - 失败也写 `result.json` 与 probe 输出，不盲目重跑。

### 飞书测试客户端接线

- 复用统一 `butler`／Root Router，未新增第二事实源。
- Idea／Project 多候选：`butler.createRouteDecision`，回复 decisionId、candidateId→对象 ID、预期版本；无领域 Task／Worker。
- `选择 <decisionId>：<candidateId>`：`butler.selectRoute`；同消息重放恢复，不同消息 `already_consumed` 等只回复说明；选中的 Idea／Project 仍走原真实 Worker 与 Result Lane。
- `记忆候选`：异步 Memory proposal，调用真实 Worker，通知 pending memoryId／decisionId／task／attempt／run／SHA／Result Lane；确认前不写 active。
- `确认 <decisionId>`：Memory begin → 宿主写确定性 activate／correct／forget 快照 → complete → delivery 先 claim；accepted `provider_message_id=null`、`at_least_once`；异常 unknown 不重发。
- `纠正记忆`／`遗忘记忆`：只创建精确版本 Decision 并回复，确认后才生效。
- 同进程 Memory drain 使用 `memory.drainQueued()`；live 继续原消息流程，stale 明确回复失效；启动时也执行 drain。
- 恢复时先对账 request／evidence／artifact；证据不足不自动重跑模型。
- 新增故障点 `SYNO_P3_MEMORY_TEST_CRASH_AFTER_WORKER=1`（本轮未默认触发）。
- stop 等待 Memory 后台与 drain；现有 capture／knowledge／idea／project 行为未改。
- 独立 DB 改为 `runtime/p3-decision-memory.db`，Memory 根为 `runtime/p3-memory-artifacts`。

## 验证命令与结果（本轮）

- `node --test tests/superagent-p3-decision-memory.test.mjs`：**25/25 通过，0 失败，0 跳过**（既有 19 项 + 新增 6 项）。
- `node --test tests/superagent-p1-native.test.mjs tests/superagent-p2-knowledge.test.mjs tests/superagent-p3-runtime.test.mjs tests/superagent-p3-idea.test.mjs tests/superagent-p3-project.test.mjs tests/superagent-p3-decision-memory.test.mjs`：**74/74 通过，0 失败，0 跳过**。
- 新增覆盖：
  1. beginProposal 只冻结授权 active 召回；pending／pending correction／revoked／其他对象／其他 Owner canary 不进入 request／prompt。
  2. Result Lane 前无 index／Decision；完成后只有 pending v1 + activate Decision，后续 Owner 确认才 active；激活后重放不重开 pending 指针。
  3. 严格 preference JSON、长度、额外字段、伪造 scope／recalled／ID／hash 拒绝；宿主保留 scope。
  4. 同消息重放同 Task／Attempt／Decision／delivery；真实 `node` 子进程只写候选文件后退出，父进程用同消息恢复并只结算一次，无第二次业务效果。
  5. 取消、旧 Attempt、Worker done、Result Lane 失败不产生 pending index／activate Decision／成功 delivery；proposal 在 Result Lane 前没有 Decision，Decision TTL timeout 由既有确认回归覆盖，Worker 中断／超时按“无证据不自动重跑”处理。
  6. 不同 proposal 独立结算；同消息重放无第二 delivery；既有 queued／stale confirmation 回归继续通过。
  7. prompt／request canary 精确包含与排除，而非只断言“调用了模型”。
- `node --check`：上述新增／修改 JS 全部通过。
- `git diff --check`：通过。

## 未实测项（第 2 轮记录；第 3 轮已补真实执行，见文末）

- 未运行 `real-worker-probe.mjs --memory-request` 或 `memory-worker-smoke.mjs`：真实模型调用留给主 Agent 审查后执行。
- 未启动 `real-feishu-client.mjs`：未连接飞书、未验证真实入站命令、`选择`／`确认`／Memory drain 的真机行为。
- 未触发 `SYNO_P3_MEMORY_TEST_CRASH_AFTER_WORKER=1`；该故障点只实现未实测。
- 未验证真实 Host／生产进程重启、生产 App／DB／正式 vault；未运行全量 gate。
- 飞书 delivery accepted 不代表已读；真实 usage／cost 在真实调用前为 `not_returned` 预期。

## 第 1 轮 P1 返工（R1）

审查前副本：`/Users/hoye/Documents/workspace/syno-p0-real-test/p3-memory-worker-review-r1/`。本轮只修两项 P1，白名单未扩大；未调用真实模型、未启动飞书、未提交。

### P1-1：completed Task 投递前业务对账

- `real-feishu-client.mjs` 的 confirmation completed 快路径不再直接投递：先调用幂等 `memory.complete(execution)` 补齐 `applyTransition`，再用 `assertMemoryConfirmationReconciled` 断言当前 `memory_apply` 的 Decision／版本／状态与 operation 一致、index／当前版本与目标一致，之后才允许 `deliver()`。缺业务效果时返回“未发送成功通知”，不发送成功通知。
- proposal completed 快路径同样先调用幂等 `memory.completeProposal(execution, COMPLETED_PROPOSAL_PLACEHOLDER)`：原生 completed 分支从持久化候选文件重读，占位结果不参与验收；随后 `assertMemoryProposalReconciled` 断言 pending index 绑定同一 Decision（若已被后续确认则仅允许 active／revoked 的后续状态）、Decision 类型／Owner／activate 绑定与 v1 值哈希一致，再允许投递。
- `native-memory-runtime.mjs` 的 `trace` 新增 `appliedDecisionId／appliedVersion／appliedStatus`，供客户端和测试核对 `memory_apply`。
- completed 对账失败只记录 `memory-confirm-reconcile-rejected` 或 `memory-proposal-reconcile-rejected` 事件并回复，不 claim、不发送成功通知；对账成功后投递仍先 claim，零新增 Task／Decision／delivery。

### P1-2：recalled 中途失效复核

- 新增 `assertRecalledStillCurrent`：逐项要求 recalled memory 仍属于同 Owner、授权 scope，index 仍为 `active` 且 `currentVersion` 等于冻结版本，当前 version `status=active`，value SHA 与冻结值一致。
- 运行中的 `completeProposal` 在写候选文件、结束 Worker／Attempt、`finalizeTask` 之前执行该复核；运行期间发生 correct／forget／revoke／supersede 时拒绝，Task 保持 `running`、无候选产物、无 pending index／activate Decision／delivery，也不会触发模型重跑。
- completed 但因进程在 `finalizeTask` 与 `finalizeProposal` 之间退出时，completed 重放同样在创建 pending index／Decision 前复核，失效则拒绝且不投递。
- 未变化的当前 active recalled 仍正常结算。

### R1 验证

- `node --test tests/superagent-p3-decision-memory.test.mjs`：**28/28 通过，0 失败，0 跳过**（既有 25 项 + R1 新增 3 项）。
- 六文件合跑（p1-native／p2-knowledge／p3-runtime／p3-idea／p3-project／p3-decision-memory）：**77/77 通过，0 失败，0 跳过**。
- R1 新增测试：
  1. 模拟 `finalizeTask` 后、`applyTransition` 前退出：completed 再 `complete` 补齐 v3 active 与 `memory_apply`，第二次 complete 事实数不增、delivery 仍为 queued／provider_message_id=null。
  2. mid-flight correction 与 mid-flight forget 均拒绝，Task 保持 running、无候选文件／index／Decision／delivery；未变化的当前 active recalled 正常通过。
  3. 静态断言飞书客户端 confirmation／proposal 的 completed 分支必须先对账（`memory.complete`／`memory.completeProposal`＋reconcile 断言）再 `deliver()`，不得绕过。
- 六个本轮 JS `node --check` 通过；`git diff --check` 通过。

### R1 未实测／限制

- 仍未调用真实模型、未启动飞书、未触发真实 Host 重启；completed 对账与 mid-flight 失效均在确定性 SQLite／内存运行态中验证。
- completed 投递前的对账分支仅由静态断言与运行态单测覆盖，未做真实飞书端到端投递。

## 第 2 轮 P1 返工（R2）：仅烟测脚本的消息 ID 有界生成

审查前副本：`/Users/hoye/Documents/workspace/syno-p0-real-test/p3-memory-worker-review-r2/`。本轮只改 `memory-worker-smoke.mjs`，白名单未扩大；**未调用真实模型、未启动飞书、未提交或推送**。

### P1：烟测 messageId 超过 48 字符

- 原实现 `nextId` 拼接 `om_smoke_<worker>_<label>_<时间戳>_<序号>`，`om_smoke_pi_activate_idea_correction_base_mwnpudbv_1` 为 52 字符，超出 `memory-worker-contract` 与原生消息边界的 `^[A-Za-z0-9_-]{1,48}$`，`activate({label:"idea_correction_base"})` 在种子准备阶段即失败（尚未调用真实模型）。
- 修复只改 ID 生成方式，未放宽 48 字符产品校验：
  - 新增 `buildMessageId(workerName, label, sequenceNumber, now)`：按 `48 - prefix - suffix - 2` 计算 label 预算，超长时只截断 label 片段（并去掉截断后的尾随 `_`），完整保留 worker 前缀、36 进制时间戳与自增序号，因此同进程唯一、字符集合法、仍可看出 worker／label 前缀／运行时刻／序号。
  - `nextId` 改为 `buildMessageId(worker, label, sequence += 1, Date.now())`，序号位数变化时预算随之变化。
  - `buildMessageId` 内保留最终 ID 断言：`^[A-Za-z0-9_-]{1,48}$`，并断言 label 预算不足以至小于 8 时直接失败，避免以后新增长 label 静默复发。
- 新增确定性自检入口 `--check-message-ids`：在创建任何目录、打开任何运行时、调用任何模型之前退出，只从本文件源码提取全部 `nextId("…")` 字面量与 `nextId(\`<前缀>_${label}\`)` 前缀＋`label:` 值，逐一在 Pi／OpenCode 下按序号 1 与 99 生成最终 ID 并断言长度与字符集。

### R2 验证

- `node --check experiments/superagent-p0/memory-worker-smoke.mjs`：通过。
- `node experiments/superagent-p0/memory-worker-smoke.mjs --check-message-ids`：`ok=true`，20 个候选 label，序号 1／99，两种 Worker 最长 ID 均为 **48** 字符且匹配 `^[A-Za-z0-9_-]{1,48}$`：
  - Pi：`om_smoke_pi_proposal_idea_correction_<base36 时间戳>_99`（48）
  - OpenCode：`om_smoke_opencode_proposal_idea_activ_<base36 时间戳>_1`（48）
  - 该模式不建目录（默认烟测输出目录未生成）、不打开运行时、不调用模型。
- `node --test tests/superagent-p3-decision-memory.test.mjs`：**28/28 通过，0 失败，0 跳过**。
- 六文件合跑（p1-native／p2-knowledge／p3-runtime／p3-idea／p3-project／p3-decision-memory）：**77/77 通过，0 失败，0 跳过**。
- `git diff --check` 通过；新增未跟踪文件另用 `git diff --no-index --check -- /dev/null <file>` 检查，无空白错误。
- 未运行完整 smoke，未调用真实模型，未启动飞书；真实 Pi 烟测仍由主 Agent 执行。

## 第 3 轮：真实执行与验收（主 Agent）

本节记录确定性内核提交之后的真实模型、真实飞书、独立审计与全量门禁；不改写第 1／2 轮与 R1／R2 的历史记录，也不另起返工轮次。

### 代码状态与确定性

- 代码检查点：`d04a815cc feat: 增加 Decision Lane 与 Memory 确定性内核`、`00d631dc3 feat: 接入 Memory 真实 Worker 与测试客户端`；确定性内核与真实接线均已提交，正式文档尚未提交，未推送。
- `node --test tests/superagent-p3-decision-memory.test.mjs`：**28/28 通过，0 失败**。
- 六文件合跑（p1-native／p2-knowledge／p3-runtime／p3-idea／p3-project／p3-decision-memory）：**77/77 通过，0 失败**。
- 本轮全部 JS `node --check` 通过。
- 最终 `npm run gate`：**931 tests，912 pass，19 skipped，0 fail，0 cancelled，0 todo**；Repository 5159 files；active docs 8 files；`git diff --check` 通过。

### 真实 Pi Memory 烟测

结果：`/Users/hoye/Documents/workspace/syno-p0-real-test/p3-memory-worker-smoke/pi-2026-11-19T15-51-22-774Z/result.json`。

- `ok=true`；Pi Agent Core **1.5.2** + `opencode v2.0.29`，固定模型 `opencode-go/deepseek-v4.1-flash`。
- `modelCalls=1`、`providerRequests=1`、`feishuCalls=0`、`toolEvents=0`。
- Memory `memory-a370104024f4b799`，Decision `decision-a370104024f4b799`，scope `idea:idea-e4636573441ffce8`。
- 召回 owner active 1 条＋精确 idea scope active 2 条，共 **3 条**；pending／旧版本／revoked／其他 Owner／其他对象 canary 均排除。
- Result Lane passed，候选 pending v1，本地 delivery accepted，`providerMessageId=null`。
- 候选文件 SHA-256 `241661ed5197f1a1451a673efc35d8cd179bbaab392f772420d38ac1aae9c492`，宿主重读一致。
- `usage`／`costUsd=not_returned`，不写 0，也不声称已核验扣费。

### 真实飞书 Decision Lane

独立测试 App `cli_<redacted>`，DB `/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-decision-memory.db`，未触生产。

- Idea A `idea-82e425fd3e0ee887`：初始 v1，消息 `om_<redacted>`；选择 Decision 后推进到 v2，选择消息 `om_<redacted>`；v2 文件 SHA-256 `3119d127636b4d96b257c5625ce013987967275ef2f72be6983021b90d0fdf78`。
- Idea B `idea-9910ed53a0fdd38b`：消息 `om_<redacted>`，始终 v1。
- 多候选原消息 `om_<redacted>`，Decision `decision-8c286f4d29659f6b`；candidate-1=A 预期 v1，candidate-2=B 预期 v1。该追问只新增 Decision 事实，factCount **27→28**，无领域 Task／Worker。
- candidate-1 被后续 Owner 消息消费，只推进 A 到 v2；随后用不同消息选择 candidate-2，飞书回复该 Decision 已被原消息消费、本次未执行任何业务。

### 真实飞书 Memory 全链路

四条真实 OpenCode Memory proposal 均使用固定模型、Result Lane 与 accepted delivery，`usage`／`cost=not_returned`；activate／correct／forget 不调用模型。

1. owner `memory-6908bdaca5c4dd53`／Decision `decision-6908bdaca5c4dd53`：proposal `om_<redacted>` 为 pending v1、`recalled=[]`；后续不同真实 Owner 消息 `om_<redacted>` 确认，active v2。
2. Idea A `memory-0853828b126341eb`：proposal `om_<redacted>` 为 pending v1，只召回 owner v2；后续确认 `om_<redacted>`，active v2；精确 v2 纠正 Decision `decision-1e0de77b6764d385`，确认消息 `om_<redacted>`，得到 active v3，v2 superseded，pending v1 保留历史；v3 preference 为 `P33-IDEA-A-CORRECTED-0031 我偏好先列风险，再讨论一个设计方案。`
3. Idea B `memory-6d1515c53167159d`：proposal `om_<redacted>` 为 pending v1，只召回 owner v2，不含 A pending；后续确认 `om_<redacted>`，active v2；精确 v2 遗忘 Decision `decision-9bbd6bf46424f685`，确认消息 `om_<redacted>`，得到 revoked v3，v2 superseded。
4. 最终 Idea A `memory-e32ee0b11adba87a`：proposal `om_<redacted>` 为 pending v1；Worker request 只含 owner active v2＋A corrected active v3，明确不含 A 旧值、A pending、B revoked canary 或其他对象正文；后续确认 `om_<redacted>`，active v2。
5. 再用不同真实消息重复确认同一 Decision，飞书回复已消费、未执行任何业务；SQLite facts、events、records、runs、run_events 全部零增长，facts **181→181**。

曾误发一条非协议文本“记录想法偏好 …”，客户端只回复已收到、未调用模型；随后按正式“记忆候选 idea:…”命令完成。该误发不作为成功业务路径，也不记为产品缺陷。

### 独立审计与现场清理

机器审计 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-decision-memory-real-audit.json`，`ok=true`。

- 13 Task／13 Attempt／13 run 全部 completed／done。
- 13 条 verification 全部 `host_result_lane` passed。
- 13 条 delivery 全部 `accepted`、`may_send=false`、`provider_message_id=null`、`at_least_once`。
- 13 份验收产物全部独立重读，文件 SHA-256 全部匹配。
- 7 个 Decision：1 `route.select`＋4 activate＋1 correct＋1 forget；6 条 `memory_apply`。
- 4 个 Memory index、10 个 Memory 版本文件均与 SQLite 的对象、scope、版本、操作、消息 ID、preference SHA 一致。
- 四组 OpenCode request／evidence 配对一致，沙箱与模型路径核验通过。
- 页面证据 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-decision-memory-real-final.png`；消费者日志 `/Users/hoye/Documents/workspace/syno-p0-real-test/inbox/capture-events.jsonl`。
- 测试客户端已正常停止，`runtime/feishu-client-status.json` 为 `running=false`、`available=false`、`stoppedAt=2026-11-19T16:18:04.390Z`；无第二个测试消费者，bsk `zwnx` 已停止。

### 第 3 轮仍未覆盖

- 真实 Host 重启后的 queued 恢复仍 `not_performed`，归 P3.4；真实客户端 crash 注入未触发，不得写成已完成；进程恢复证据只来自确定性测试。
- `accepted` 不代表已读；`provider_message_id=null`、`at_least_once`。
- `usage`／`cost` 未返回不代表 0，也未核验 Go 控制台扣费。
- 未触生产 App／DB／正式 vault，未推送。
