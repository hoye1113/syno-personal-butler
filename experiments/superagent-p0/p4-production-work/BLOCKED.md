# P4 准备阶段阻断与限制

> 公开版脱敏说明：真实 Feishu 消息／实例／Job／文档 ID 已替换为占位符；完整证据保留在本地。

日期：2026-11-20
状态：**P4.3 接线与隔离复演、P4.2 普通回复证据链修复及 2026-11-21 生产修复窗口均已通过；P4.2 生产验收完成，服务已恢复。** P4 接管门禁工具已由 `0a7643ea92253653cd389178fa1a758a16d24a69` 提交；P4.2 已由 `6a501001030c1d1f5b939eded5987ccea6636581` 提交；P4.3 由 `b467f98a`／`24a631e46`／`fc703543c`／`c276cfae` 提交；普通回复证据链由 `fcac7c3f0` 提交；均未推送。P5 主动发现未启动。

## 阻断

1. **已批准的实际窗口在 freeze 前阻断。**
   Owner 已批准 `2026-11-20T04:56:31Z` 起 60 分钟、30 分钟观察、Runbook 全部停止条件及主 Agent 回退。只读预检发现旧生产缺少 P4 freeze／handover spool、统一 SQLite 事实库和可生产启动的新客户端，故未进入切换；旧服务保持运行。后续新窗口仍需 Owner 另行批准。

## 未覆盖（不得写成已完成）

2. 数据库 preflight 只回答“数据库事实是否允许进入切换窗口”，不验证：
   - 进程、端口与消费者独占；
   - vault 文件、Markdown 内容与快照；
   - Owner 绑定与凭据；
   - 外部效果对账与真实通知送达。
3. 机器级断电与 macOS 登录冷启动均 `not_performed`；不能用 Host 进程退出／重启测试或单元测试冒充。
4. `accepted` 不等于已读；投递语义仍是 `at_least_once`，`provider_message_id` 可能为 `null`。
5. 本工具未对真实生产数据库运行；所有 CLI 证据来自临时合成 fixture。
6. 未知 host status schema／迁移计划 schema 会失败关闭，但不会自动解释新版 schema；需要主 Agent 人工判定。

## 决策记录（已固定）

- 结构缺字段／错误类型：抛 `PreflightInputError`（CLI 退出码 2）。
- 未知 schema／未知 action：输出 blocker，`ready=false`（CLI 退出码 3）。
- 恢复执行类 action 一律阻断，不放宽旧 `planMigration` 语义。

## R1 追加限制（2026-11-20）

7. **WAL 模式数据库一律拒绝**，包括已干净关闭、当前无 `-wal`／`-shm` 的库：经验证，只读打开仍会创建 sidecar。主 Agent 必须先停止写者并准备静态一致副本，再运行 CLI。
8. sidecar／WAL 文件头检查发生在打开 SQLite 之前；若检查后、读取期间出现新写者，仍存在 race。生产前提是无活跃写者，出现并发写者按窗口异常停止。
9. `-journal` 拒绝测试是前置 sidecar 守卫，不是真实 hot journal 崩溃恢复验证；本工具不执行 WAL 恢复或快照写入。
10. 本轮仍未由 Owner 批准生产窗口；生产接管继续保持 `not_authorized / not_performed`。

## R2 追加说明（2026-11-20）

11. R2 只修 Runbook 顺序：恢复 freeze 优先，第 3 节只做窗口前只读预检，数据库 preflight 与静态副本移到第 4 节旧写者退出后。**未修改代码或测试。**
12. WAL 限制、sidecar race、静态副本需由主 Agent 准备、hot journal 守卫不等于崩溃恢复等事项均未因 R2 解决。
13. 文档不再包含 stop→freeze 的切换指令；数据库 preflight 仍只是其中一个门禁，不能替代退出确认、快照核验、锁、recover、drain 与观察期检查。

## 方案 A 实施后的剩余限制（2026-11-20）

14. **生产接管仍未授权**：P4 继续保持 `not_authorized / not_performed`；方案 A 只交付工具、隔离测试与 Runbook。
15. takeover 的 `ready=true` 只表示允许唯一新 Runtime 接管并 drain 当前 generation 的 frozen spool，不表示全部消息已结算；drain 后仍需 pending=0、forwarded／hold 与 Task／delivery 对账。
16. expected generation 必须由 Owner／主 Agent 从冻结后的统一状态人工确认并显式传入；工具不猜测 generation，也不接受自动选择。
17. entry 模式仍阻断任何 pending spool；它不能替代 takeover 门禁，也不能在活跃 WAL 或活跃生产 DB 上直接运行。
18. WAL 模式拒绝、sidecar race、静态副本需由主 Agent 准备、hot journal 守卫不等于崩溃恢复等限制未因方案 A 改变。

## P4.2 追加限制（2026-11-20）

19. **P4.2 已通过主 Agent 独立验收**：代码提交 `6a501001030c1d1f5b939eded5987ccea6636581`，未推送；生产接管仍 `not_authorized / not_performed`。
20. 证据工具只读取静态 DB 副本，不执行 freeze／unfreeze／recover／drain／claim／send，不启动 Host／飞书／Worker／模型，不写业务 DB。
21. 静态副本、expectation manifest 与 takeover 报告由主 Agent 准备；工具不猜测 message、generation、context、N 或 hash。Task 归属按 `task-<messageId>` 约定采集，偏离该约定的历史数据需要人工核对。
22. `verify ok=true` 只证明 expectation 所列消息、业务链、N／generation、全局计数与 artifact hash 通过；不证明进程锁／端口、Owner 绑定、真实已读或外部效果。
23. 采集前 WAL／sidecar 守卫仍是打开 SQLite 前的前置检查；守卫后出现新写者仍有 race。活跃 WAL 必须先由主 Agent 停止写者并准备一致静态副本。
24. unknown 永远不得称为“待重发”；观察期后 verify 失败或结构错误时，按第 29 条停止／freeze 已运行的新 Runtime、保留现场并进入对账，不得重复 drain、盲目重启或手工改写业务状态。
25. 实际生产窗口与观察期仍未由 Owner 单独批准，P4 生产接管继续 `not_authorized / not_performed`。

## P4.2 R1 追加限制（2026-11-20）

26. **最终静态副本仍需主 Agent 在批准窗口内制备**：观察期结束后按 Runbook 第 3.8 方案重新生成 `<FINAL_STATIC_DB_COPY>`；若需 freeze／停止新 Runtime，先按第 7 节停止条件与批准流程执行。未获批准或无法制备时最终验收保持 blocked，不得直接读活跃 DB，也不得复用 takeover 副本。
27. 最终 evidence 的 DB SHA-256 必须属于该新副本；takeover 副本 hash／preflight 报告与最终 evidence／verification 分开归档，不得混称。
28. R1 只补齐既有验收链：during／after 归属、Task completed、Attempt ID、inbox message／context、drain flag。它不验证进程锁／端口、Owner 绑定、真实已读或外部效果。
29. 观察期后 verify 失败时，新 Runtime 已在运行：应按第 7 节停止／freeze、保留现场并进入对账，不得为重跑验收重复 drain、盲目重启或手工改写业务状态；unknown 永远不得重发。
30. P4.2 R1 已由主 Agent 独立验收（R1 定向 41/41；全量 972／953／19／0），代码提交 `6a501001030c1d1f5b939eded5987ccea6636581`；未推送。生产接管保持 `not_authorized / not_performed`。

## 实际生产窗口追加阻断（2026-11-20）

31. 第 1–30 条中的“未授权”是各轮历史快照；本次窗口已获 Owner 明确授权，但状态为 `authorized / blocked_before_freeze / not_performed`。授权不消除技术门禁，也不自动延伸到下一次窗口。
32. 旧生产没有 P4 freeze／handover spool，只有 disconnect 和旧 pending／seen JSON；没有识别到 Runbook 统一 SQLite 事实库与 host-status；真实客户端固定隔离测试 App／root／DB。不能用停止服务、直接连生产凭据或手工改状态替代缺失接线。
33. 本次未执行任何生产变更、观察、P4.2 collect／verify 或回退；旧服务保持 running／ready。证据：`/Users/hoye/Documents/workspace/syno-p0-real-test/p4-production-window-20261120T045631Z/preflight-blocked.json`。
34. 下一步 P4.3 必须先完成旧入口 freeze 桥、生产配置／launcher、真实来源到新统一 DB 的迁移入口及隔离复演；完成前不得申请“直接重试”生产接管，P5 不启动。

## P4.3 收尾后的当前阻断（2026-11-20）

35. **P4.3 接线缺失已不再是当前阻断。** A（`b467f98a` 生产／隔离配置分离、生产 App fail-closed、生产消费者锁与旧 `${stateFile}.lock` 一致）、B（`24a631e46` 默认关闭的旧 Host 桥、`SIGUSR1` freeze／`SIGUSR2` status、普通回复旧 owner 证据、静态 PATHS 与 P0 localData／knowledge 一致性门禁、runtimeRoot 不强制统一、shutdown 顺序、空库最小 rules 幂等初始化）、C（`fc703543c` 正式 import／static-copy CLI、spool 排除、pending 分类、已知 spool 在 unfreeze 后仍禁止 immediate 的共享防重、真实 adapter pending 恢复防重、before／after DB hash、源 hash 不变、`mapping_only`、vault／Owner 安全清单、非 WAL 副本）、D（`c276cfae` 全链路隔离复演）均已验收提交，未推送。
36. **当前唯一阻断是“Owner 尚未批准新的生产窗口”。** 旧窗口结论仍为 `authorized / blocked_before_freeze / not_performed`：只完成 freeze 前只读预检，未 freeze、未停止、未复制、未启动新 Runtime、未观察、未回退；生产未变更。
37. 隔离复演（证据根 `/Users/hoye/Documents/workspace/syno-p0-real-test/p43d-main-rehearsal-20261120-r1`）12 阶段全 `ok`、5 个失败分支全 `blocked`、P4.2 独立 verify `ok=true`；但它使用脱敏／合成输入，**不构成生产授权**，不证明生产已接管、真实消息已读、真实断电或 macOS 登录冷启动。
38. 真实生产的 before 证据必须来自旧桥真实 event／inbox／reply；禁止用复演、测试 fixture 或运维手工补写冒充。
39. 生产 freeze／停止／启动／回退仍只能由主 Agent 在 Owner 新批准窗口内执行；OpenCode 不触生产。新窗口批准前不重试停止服务，不手工改状态，不启动 P5。

## P4.2 普通回复证据链修复（2026-11-21）

40. 普通 immediate reply 缺 event／inbox 已修复（`fcac7c3f0`）：`host-handover.mjs` 新增 `recordReplyEvidence`／`sendOrdinaryReply`，在 `sendReply` 前写保留源 `legacy-handover` 的 event + processed inbox，复用幂等 `route:legacy-reply`；已有成对证据时 no-op，证据不完整时失败关闭，不创建 Task／Attempt／delivery。`dispatchMessage` 改用 `sendOrdinaryReply`。
41. 红灯测试 `tests/superagent-p4-reply-evidence.test.mjs` 覆盖发送前证据、重复回复不重复投递、已有证据不重复写入、无 domain 链；定向 61/61 通过。P4.3 复演 after 改走同一路径，证据根 `/Users/hoye/Documents/workspace/syno-p0-real-test/p4-reply-evidence-fix-20261121-r1`：12 阶段全 ok、5 个失败分支全 blocked，`final/verification.json` 为 `ok=true`、blockers 空，after event=1、inbox=1、accepted reply=1。
42. 全量 `npm run gate` 通过：1024 tests／1005 pass／19 skipped／0 fail；Repository 5181 files、active docs 8。该隔离阶段结束时生产仍未恢复；随后 2026-11-21 生产修复窗口已通过，见 43–45。

## P4.2 生产修复窗口（2026-11-21，通过，服务已恢复）

43. 窗口 `2026-11-20T16:36:28Z` 至 `2026-11-20T18:06:28Z`，证据根 `/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-repair-window-20261120T163628Z`。窗口前 takeover `ready=true`、`mode=takeover`、`generation=2`、0 个 frozen spool、无 blockers。
44. 新 after `om_<redacted>`（`P4-REPAIR-AFTER-20261121-0040`）由 Owner 授权、通过 bsk 从已登录飞书账号发送；旧 before 1／2 复用，旧 during／domain 证据仍来自首次窗口。30 分钟观察 `ok=true`、`observedMinutes=30`、failures 空。停止后 freeze generation=3，final 静态副本 SHA-256 `f00b7b995815190ee77d9f9f69a6ac9ac5b5455eda606209b21532e7d537f72c`。
45. P4.2 `verify.ok=true`、blockers 空：messages=3、replyMessages=3、duringMessages=0、artifacts=0；after event=1、inbox=1、accepted reply=1。服务已恢复：PID `85264`、instance `<redacted-uuid>`、generation=3；launchd `active count=1 / state=running`，adapter running／available／ownerBound=true。未推送，P5 未启动；断电／冷启动、accepted≠已读、多批 >100 frozen drain 等非阻断限制仍适用。
