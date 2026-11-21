# P4 真实生产接管交接（2026-11-20）

> 公开版脱敏说明：真实 Feishu 消息／实例／Job／文档 ID 已替换为占位符；完整证据保留在本地。

> 用途：交给下一位 Agent 接续最终阻断修复、隔离验收与后续生产验证。
> 本文使用绝对路径。全程中文汇报。不要推送，不启动 P5，不重发本轮 before／during／after。
>
> **2026-11-21 更新：** 普通回复 event／inbox 缺失已修复（提交 `fcac7c3f0`）。新的生产修复窗口已完成：新 after `om_<redacted>` 的 event=1、inbox=1、accepted reply=1，P4.2 `verify.ok=true`，服务已恢复（PID 85264，generation=3）。详见第 13 节。

## 1. 当前结论（P4.2 生产修复窗口已通过，服务已恢复）

**当前状态：P4.2 生产验收通过，服务已恢复。** 2026-11-20 首次窗口的 after 缺 event／inbox 失败现场保留；2026-11-21 新窗口用新 after 验证通过，`verification.ok=true`、blockers 空。机器阻断记录 `final-blocked.json` 仅作为历史失败证据，不再是当前状态。

- 原始授权窗口：`2026-11-20T10:14:56.045Z` 至 `2026-11-20T11:44:56.045Z`。
- 观察期：新 Runtime 接管后 30 分钟，从 `2026-11-20T11:10:36.705Z` 至 `2026-11-20T11:40:36.705Z`。
- 真实接管已经执行：旧消费者已退出，新 Runtime 已 recover→drain→unfreeze→ready。
- during 恰好 1 条，`forwarded=1`、`attempts=1`、`pending=0`、`hold=0`。
- after 已由同一个新 Runtime 回复，accepted 不代表用户已读。
- 竞争实例已实测以 `FEISHU_PROCESS_LOCKED` 失败，在役 Host 未受影响。
- 2026-11-20 首次窗口的新 Runtime：PID `89526`，instance `<redacted-uuid>`；该进程已停止，仅保留历史证据。
- 当前无 unknown、hold、queued backlog、active Task 或 pending Decision。
- **2026-11-21 最终结果：** 新窗口复用旧 before 1／2，新增 after `om_<redacted>`；after event=1、inbox=1、accepted reply=1；`verification.ok=true`、blockers 空。服务已恢复：PID `85264`、instance `<redacted-uuid>`、generation=3、launchd running。详见第 13 节。

机器证据根：

```text
/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z
```

候选代码仓：

```text
/Users/hoye/Documents/workspace/syno-personal-butler-p0
```

## 2. 不可违反的边界

1. 不推送、不启动 P5、不读取／复制／打印 Token、Cookie、App Secret、API Key、凭据数据库或加密载荷。
2. 不再要求用户发送第三条 before、during 或 after；真实消息 ID 已全部固定。
3. 不盲目重试 unknown、不重放 spool、不手工伪造 Task／delivery／Job 终态。
4. accepted 只表示投递被接受，不表示已读。
5. 旧 Task／Workflow／Session 只读归档，不恢复执行。
6. 最终 P4.2 必须使用观察期后新制备的 `final-static.db`，不得复用 `takeover-static.db`。
7. final 静态副本制备前必须停止唯一新 Runtime，确保无活跃写者和 sidecar；不得直接读取活跃 DB 代替静态副本。
8. 自动提交只能暂存明确声明的精确路径；禁止 `git add -A`。
9. 同一目录同一时间只允许一个 AI 工作；不要另派 OpenCode 或其他 Worker 触生产。
10. 若 P4.2 collect／verify 失败，保留现场并停止，不为了变绿盲目重启、重 drain 或改写事实。

## 3. 已完成的 Provider 修复

两条 before 最初都失败为 `waiting_provider / HARNESS_ATTEMPTS_EXHAUSTED`，DSH 原始 `turn/end` 错误为 `MISSING_CREDENTIAL`。根因是候选 Host 固定读取候选仓库 `.env`，没有加载既有生产 `.env`，不是模型额度或飞书投递故障。

最小修复已提交：

```text
47dee92f119e702ce53e585637015727845fbfc2 fix: 支持显式指定本机凭据文件
```

- `apps/syno/syno/syno-key-loader.mjs` 新增 `SYNO_SECRET_ENV_FILE` 选择路径。
- launchd 指向既有 `/Users/hoye/Documents/workspace/syno-personal-butler/.env`；未复制或输出密钥。
- 36 项定向测试通过：`provider-fix-tests.log`。
- 两个 Job 已正常 completed：
  - `job_<redacted>`
  - `job_<redacted>`
- 修复证据：`provider-remediation.json`、`provider-remediation-pre-restart.json`、`provider-remediation-post-restart.json`。

## 4. 真实消息与 owner 对应关系

expectation 已写好：

```text
/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z/expectation.json
```

| 角色 | messageId | 预期证据 |
|---|---|---|
| before 1 | `om_<redacted>` | 旧 owner 的 event／inbox／accepted reply，无 domain chain／spool |
| before 2 | `om_<redacted>` | 同上；第二次真实发送不得删除或掩盖 |
| during | `om_<redacted>` | generation=1 forwarded spool + 完整 Knowledge domain chain |
| after | `om_<redacted>` | 新 owner 的 event／inbox／accepted reply，无 domain chain／spool |

owner：

- before：`<redacted-uuid>`。
- during／after：`<redacted-uuid>`。

during 对象：

```text
contextId=knowledge:doc_<redacted>
contextVersion=1
taskId=task-om_<redacted>
attemptId=attempt-1-1
runId=1
read_status=not_found
```

during artifact：

```text
/Users/hoye/Documents/workspace/syno-personal-butler/.runtime-p0/p3-knowledge-results/om_<redacted>.json
SHA-256=084fd9350f3966d62a67a3633ff43a5364da23f54d454f051434caeaa34c796a
```

## 5. 已完成的切换证据

以下文件都位于第 1 节证据根：

- `window.json`：原授权范围与截止时间。
- `launchd-new-runtime.plist`：当前新 Runtime launchd 配置。
- `freeze-before-during.json`：generation=1、spool=0。
- `freeze-with-during.json`：generation=1、frozen spool=1。
- `legacy-consumer-retired.json`：旧 PID 退出、无 8888 listener；旧 Host SIGTERM 后遗留，已核实 PID 后 SIGKILL。
- `preparation-provider-fixed/legacy-safety.json`：五项安全计数全零。
- `preparation-provider-fixed/mappings.json`：792 条版本化映射。
- `preparation-provider-fixed/owner-status.json`：只含安全布尔值与 appId。
- `p4-import-report.json`：`ok=true`，dedupe_only=211、mapping_only=792。
- `takeover-static.db`、`p4-static-copy-report.json`：接管专用非 WAL 静态副本。
- `p4-takeover-report.json`：`ready=true`、`drainRequired=true`、`takeoverFrozenSpools=1`、无 blockers。
- `snapshot/`、`p4-snapshot-report.json`：814 个 vault 文件（其中 338 个 Markdown）逐项哈希一致，去重水位一致。
- `p4-rollback-delta-pre-takeover.json`：added／deleted／changed 均为空。
- `host-status-after-takeover.json`：新 Runtime startup-takeover 后的状态。
- `lock-competition.log`：竞争实例 `FEISHU_PROCESS_LOCKED`，退出码 1；主 Host 仍存活。
- `observation.jsonl`、`observation-driver.log`：观察期样本。
- `observation-complete.json`：观察结束时生成；必须确认 `ok=true`、`observedMinutes>=30`。

旧生产仓库／vault：

```text
/Users/hoye/Documents/workspace/syno-personal-butler
/Users/hoye/Documents/workspace/syno-personal-butler/vault
```

新统一 DB：

```text
/Users/hoye/Documents/workspace/syno-personal-butler/.runtime-p0/p3-decision-memory.db
```

生产锁：

```text
/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/state/feishu-channel.json.lock
```

## 6. 观察期后台任务（已完成，仅供追溯）

原主会话后台任务 ID：`bq0zvrudi`，已生成 `observation-complete.json`，不要重跑。驱动脚本与日志：

```text
/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z/observe-window.mjs
/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z/observation-driver.log
```

换 Agent 后不要依赖原会话通知，直接检查 `observation-complete.json` 是否存在且 `ok=true`。如果尚未到 `2026-11-20T11:40:36.705Z`，等待，不压缩观察期。不要重新运行 `observe-window.mjs`，避免覆盖／混淆本轮证据。

## 7. 本轮观察后最终验收步骤（已执行，禁止重跑）

### 7.1 停止唯一新 Runtime

确认当前时间仍在授权窗口内、观察报告 `ok=true`，并先核对 PID 89526 仍是上述 instance：

```bash
kill -USR2 89526
# 读取 host-status，确认 instance 未变化、无 unknown／hold／active／queued。
kill -TERM 89526
```

新 Runtime 的 SIGTERM 会先 freeze（generation 从 1 变为 2）、停止 adapter、关闭 DB，然后退出 0；launchd `KeepAlive.SuccessfulExit=false`，不会自动重启。必须确认进程实际退出，不能只相信 launchd 状态。若进程卡死，先保留证据；只有确认精确 PID 与命令行后才可以按既有 Runbook 清理，绝不能出现双消费者。

状态文件：

```text
/Users/hoye/Documents/workspace/syno-personal-butler/.runtime-p0/host-status.json
```

### 7.2 制备 final 静态副本

旧写者完全退出后执行：

```bash
node /Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/production-source-migration.mjs static-copy \
  --source /Users/hoye/Documents/workspace/syno-personal-butler/.runtime-p0/p3-decision-memory.db \
  --target /Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z/final-static.db \
  --output /Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z/p4-final-static-copy-report.json
```

目标与报告均为排他新建；若已存在，先读取，不要覆盖。静态副本与 takeover 副本的 hash 合法不同；不能用 takeover 副本代替 final。

### 7.3 P4.2 collect 与独立 verify

```bash
node /Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/production-handover-evidence.mjs collect \
  --database /Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z/final-static.db \
  --expect /Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z/expectation.json \
  --output /Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z/evidence.json

node /Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/production-handover-evidence.mjs verify \
  --expect /Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z/expectation.json \
  --evidence /Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z/evidence.json \
  --takeover-report /Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z/p4-takeover-report.json \
  --output /Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z/verification.json
```

必须 `verification.ok=true` 且 blockers 为空。重点独立核对：

- messages=4、before=2、during=1、after=1。
- before owner 相同；during／after owner 相同；新旧 owner 不同。
- during 的 generation／N／attempts／Context／Task／Attempt／run／delivery 全匹配。
- 最终 active／queued／pending Decision／unknown／handover pending／hold 全零。
- artifact 实际 SHA-256 与 expectation 一致。
- evidence.databaseSha256 等于 final-static.db 的实际 SHA-256。

### 7.4 验证通过后恢复服务

只在 verify 通过后恢复：

```bash
launchctl kickstart gui/$(id -u)/com.syno.butler.host
```

确认新进程持锁、generation=2 的 recover／drain 完成、unfreeze、pending=0、hold=0、adapter running／available。恢复后 instance／PID 会变，这是正常的新进程；不要因此重跑 P4.2，也不要重发 after。将最终状态保存为证据根下 `final-host-status.json`（排他新建）。

若 kickstart 报服务未加载，先 `launchctl print gui/$(id -u)/com.syno.butler.host` 只读检查；不要并行 bootstrap 第二个实例。实际 plist 为：

```text
/Users/hoye/Library/LaunchAgents/com.syno.butler.host.plist
```

当前 ProgramArguments 必须仍指向：

```text
/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/real-feishu-client.mjs
```

## 8. 文档收尾与提交

需要把旧文档中“生产未接管／not_performed”的当前状态改为真实结果，同时保留第一窗口阻断与本窗口两次 Provider 失败的历史，不掩盖。

应更新：

```text
/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/NEXT-EXECUTION-PLAN.md
/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/P0-VERIFICATION.md
/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/P4-PRODUCTION-HANDOVER-RUNBOOK.md
/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/p4-production-work/PROGRESS.md
/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/P4-PRODUCTION-HANDOFF-20261120.md
```

至少写入：真实窗口起止、Provider 根因与修复提交、两条 before 失败及最终 completed、generation=1、真实消息 ID、import／takeover／snapshot／锁证据、30 分钟观察、final DB hash、P4.2 verification 失败、最终 stopped／generation=2 的 Host 状态、accepted≠已读、未覆盖断电／冷启动、未推送、P5 未启动。

验证：

```bash
cd /Users/hoye/Documents/workspace/syno-personal-butler-p0
npm run verify > /Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z/final-docs-verify.log 2>&1
git diff --check -- docs/plans/superagent-p0/NEXT-EXECUTION-PLAN.md docs/plans/superagent-p0/P0-VERIFICATION.md docs/plans/superagent-p0/P4-PRODUCTION-HANDOVER-RUNBOOK.md docs/plans/superagent-p0/P4-PRODUCTION-HANDOFF-20261120.md experiments/superagent-p0/p4-production-work/PROGRESS.md
```

提交只能精确暂存以上五份文档，不提交生产证据目录、vault、`.env`、runtime 或 launchd 文件。提交末尾同时加入：

```text
Co-Authored-By: Kimi <noreply@moonshot.cn>
Co-Authored-By: Claude Code <noreply@anthropic.com>
```

不要推送。

## 10. 最终阻断现场（2026-11-20T11:42:32Z，接手从这里开始）

- 30 分钟观察 `ok=true`、`observedMinutes=30`，七轮采样没有 unknown／hold／双消费者。
- 新 Runtime 已正常 SIGTERM 停止，停止时 freeze generation=2；`host.running=false`、adapter stopped、无 active／queued／unknown／hold。
- final 静态副本已独立制备：`final-static.db`，SHA-256 `9d070fe465c9937e052c8bf940049875c12642db5eda5a5efd2983a44e45a763`；报告 `p4-final-static-copy-report.json`。
- P4.2 `collect` 成功生成 `evidence.json`，messages=4、artifacts=1；独立 `verify` 生成 `verification.json`，结果为 `ok=false`，只有 `event_missing=1`、`inbox_missing=1`。
- 逐消息证据确认：两条 before 与 during 的 event／inbox 均完整；after `om_<redacted>` 有且只有新 owner 的 accepted reply，但 event=0、inbox=0。其余 owner／generation／N／Task／Attempt／delivery／artifact 未出现 blocker。
- 未修改 expectation、未补写 after 事实、未重跑 drain、未恢复服务。汇总：`final-blocked.json`。

### 代码根因入口（2026-11-21 已修复，见第 12 节）

`real-feishu-client.mjs:1610-1623` 的普通 `dispatchMessage` 直接调用 `handleMessage`，随后 `butler.handover.sendReply`，没有像旧桥一样为普通回复记录保留 event／processed inbox。旧桥的正确参照在 `legacy-production-handover.mjs:192-214`：保留源 `legacy-handover` 不命中业务规则，先 `executeNative(...,"ingest",...)` 与 `applyRoute(...)` 写幂等历史，再发送回复，不创建 Task／Attempt／delivery。

当时的下一步要求是先写能复现“普通 immediate reply 有 accepted reply 但 event／inbox 缺失”的红灯测试，在共享的普通回复路径做最小修复，覆盖 before／after 与重放防重，再跑 P4.3 隔离复演和全量门禁。**该项已于 2026-11-21 完成隔离修复，见第 12 节。** 不得直接对生产 DB 补 event／inbox；本轮 after 失败证据必须保留。新生产验证需要新的 Owner 窗口和一条新的 after，不得复用本轮消息冒充修复后证据。

### 当前运维状态与恢复门槛

- launchd label `com.syno.butler.host` 当前 `active count=0 / state=not running`，ProgramArguments 仍指向新 Runtime。
- 因为最终 verify 失败，**没有执行** `launchctl kickstart`，飞书管家当前不可用是刻意的安全停止，不是未知崩溃。
- 代码修复与 P4.3 隔离复演已完成；生产恢复仍需新的 Owner 窗口和一条新的 after，不得为了消除停机而绕过 P4.2 直接重启。

## 11. 已知限制与后续（不属于本窗口）

- 本窗口不是机器断电或 macOS 登录冷启动验收。
- 未证明用户已读，只证明 accepted。
- 旧 Host 两次 SIGTERM 后遗留是已知运维问题；后续可单独立项诊断，不在本窗口扩大代码修改。
- P5 主动发现保持未开始。
- 最终生产事实以机器证据与 `verification.json` 为准，不能以本文“当前结论”替代最后验收。

## 12. 普通回复 event／inbox 修复（2026-11-21，隔离通过，生产未验证）

- 代码提交：`fcac7c3f0 fix: 补齐普通回复的 event/inbox 证据链`。只改 `experiments/superagent-p0/host-handover.mjs`、`experiments/superagent-p0/real-feishu-client.mjs`、`experiments/superagent-p0/production-rehearsal.mjs` 与新增 `tests/superagent-p4-reply-evidence.test.mjs`；未推送。
- 修复方式：`host-handover.mjs` 新增 `recordReplyEvidence` 与 `sendOrdinaryReply`。普通回复在 `sendReply` 前写入保留源 `legacy-handover` 的 event 与 processed inbox，复用 `route:legacy-reply:<appId,messageId>` 幂等 route；已有成对证据时 no-op，证据不完整时失败关闭。`dispatchMessage` 改用 `sendOrdinaryReply`，不再直接调用 `sendReply`。
- 隔离复演：`production-rehearsal.mjs` 的 after 改为同一 `sendOrdinaryReply` 路径，删除原先手工补 event／inbox 的 fixture。证据根 `/Users/hoye/Documents/workspace/syno-p0-real-test/p4-reply-evidence-fix-20261121-r1`：`rehearsal-summary.json` 为 `ok=true`，12 阶段全 ok，5 个失败分支全 blocked；`final/verification.json` 为 `ok=true`、blockers 空，after 的 event=1、inbox=1、accepted reply=1，无 Task／Attempt／delivery。
- 红灯测试：`tests/superagent-p4-reply-evidence.test.mjs`。修复前 `sendOrdinaryReply` 不存在／无 event／inbox，测试失败；修复后断言 delivery 前 event+inbox 已存在、重复回复不再次投递、不创建 Task／Attempt／delivery，并通过。
- 定向测试：61/61 通过（P3 cutover、P4.2 evidence、P4.3 legacy、migration、rehearsal、新测试）。全量门禁：`npm run gate` 通过，1024 tests／1005 pass／19 skipped／0 fail；Repository 5181 files、active docs 8；日志 `.../p4-reply-evidence-fix-20261121-r1/final-full-gate.log`。
- 生产状态：该隔离阶段结束时未启动、未恢复、未重跑真实 after；launchd 仍为 `active count=0 / state=not running`。**随后 2026-11-21 新生产窗口已通过 P4.2，见第 13 节。** 旧 after `om_<redacted>` 仍只能作为历史失败证据，不得冒充修复后证据。未推送，P5 未启动。

## 13. 2026-11-21 生产修复窗口（通过，服务已恢复）

- 窗口：`2026-11-20T16:36:28Z` 至 `2026-11-20T18:06:28Z`（本地 `2026-11-21 00:36:28` 至 `02:06:28`，90 分钟）。证据根 `/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-repair-window-20261120T163628Z`。
- 窗口前 takeover 报告：`ready=true`、`mode=takeover`、`expected/observed generation=2`、`takeoverFrozenSpools=0`、`drainRequired=false`、blockers 空。
- 新 after：`om_<redacted>`，文本 `P4-REPAIR-AFTER-20261121-0040`，`receivedAt=2026-11-20T16:44:09.245Z`，`acceptedAt=2026-11-20T16:44:09.939Z`。消息由 Owner 授权、通过 bsk 从已登录飞书账号发送，是新的真实入站消息，不是旧 after。
- 新 Runtime：PID `77904`、instance `<redacted-uuid>`。观察期 `16:44:09.939Z` 至 `17:14:09.939Z`，`observation-complete.json` 为 `ok=true`、`observedMinutes=30`、failures 空；7 次采样均无 unknown／hold／active／queued／pending Decision／双消费者。
- 停止：SIGTERM 后 freeze generation=3，Host／adapter stopped，无残留进程或 8888 监听。final 静态副本 `final-static.db` SHA-256 `f00b7b995815190ee77d9f9f69a6ac9ac5b5455eda606209b21532e7d537f72c`；非 WAL、`integrity=ok`、无 sidecar。
- P4.2 `verify.ok=true`、blockers 空：messages=3（before 1／2 + after）、replyMessages=3、duringMessages=0、artifacts=0。after 的 event=1、inbox=1、accepted reply=1，owner 为 `<redacted-uuid>`；两条 before 的 event／inbox／accepted reply 各 1，owner 为旧实例 `<redacted-uuid>`。
- 本窗口是 after 修复验收：旧 during／domain 证据仍来自 2026-11-20 首次窗口，未重跑 domain 链；旧失败 after 证据保留，新 expectation 不包含它。
- 恢复：`launchctl kickstart` 后 PID `85264`、instance `<redacted-uuid>`、generation=3；launchd `active count=1 / state=running`，adapter running／available／ownerBound=true，pending=0、hold=0。最终状态已保存为 `final-host-status.json`。
- 未推送，P5 未启动；机器断电／macOS 登录冷启动、accepted≠已读、多批 >100 frozen drain 等非阻断限制仍适用。
