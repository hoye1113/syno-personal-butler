# P4 生产接管 Runbook（P4.3 接线与隔离复演已完成）

> 公开版脱敏说明：真实 Feishu 消息／实例／Job／文档 ID 已替换为占位符；完整证据保留在本地。

- 日期：2026-11-20
- 仓库：`/Users/hoye/Documents/workspace/syno-personal-butler-p0`
- 当前状态：**真实接管与 30 分钟观察已执行，但最终 P4.2 因 after 缺少 event／inbox 而阻断；新 Runtime 已 freeze generation=2 并停止，服务未恢复。** 不得将本轮写成验收通过；修复与后续生产验证见 `P4-PRODUCTION-HANDOFF-20261120.md`。
- 适用范围：本文件只供主 Agent 在 Owner 单独批准具体生产窗口后执行；OpenCode 只负责工具与隔离复演，不触生产。
- 路径约定：文中 `<PRODUCTION_REPO_ROOT>`、`<PRODUCTION_DB>`、`<NEW_UNIFIED_DB>`、`<TAKEOVER_STATIC_DB_COPY>`、`<FINAL_STATIC_DB_COPY>`、`<PRODUCTION_VAULT>`、`<PRODUCTION_LOCK>`、`<SNAPSHOT_ROOT>`、`<EVIDENCE_ROOT>` 均为占位符，由 Owner／主 Agent 在窗口启动时填写真实值，本文件不猜生产路径，不记录 Secret。`<TAKEOVER_STATIC_DB_COPY>` 指第 4.4 节准备的接管前静态副本，仅用于 takeover preflight；`<FINAL_STATIC_DB_COPY>` 指观察期后按第 3.10 节方案重新制备的最终静态副本，二者不得混用。

## 1. 授权与当前边界

1. P4.3 已交付旧入口 freeze 桥、生产配置入口、旧安全事实 import、静态副本工具与全链路隔离复演（A/B/C/D 均已验收提交）；此前 2026-11-20T04:56:31Z 与 09:22:33Z 窗口均在 freeze 前阻断。最新 10:14:56Z 窗口已真实接管，但最终 P4.2 失败，见第 14 节。
2. 后续生产修复验证必须由 Owner **另行明确批准具体窗口**（开始时间、结束时间、停止条件、观察期、回退负责人）。未获批准前不得执行本文任何生产步骤；新窗口前必须复核第 13、14 节证据与新的安全输入。
3. P4 不恢复旧 Task／Workflow／Session 的执行；旧系统只读保留用于回溯。
4. 凭据、App Secret、Cookie、Token、`service.json`、认证缓存和真实生产正文不交给 OpenCode，也不写入证据文件。
5. 更早生产窗口只完成 freeze 前只读预检或部署回退；最新窗口的 freeze、接管、观察与最终失败以第 14 节为准，不能混写为全部未执行或全部通过。

## 2. 角色分工

| 角色 | 职责 | 禁止 |
|---|---|---|
| Owner | 批准窗口、观察期与停止条件；决定回退 | 不把凭据交给 OpenCode |
| 主 Agent | 执行经批准的冻结、停止、启动、快照复制、import、对账、恢复与证据归档 | 不在未批准窗口外操作生产 |
| OpenCode | 交付并维护 preflight／evidence／source-migration／rehearsal 工具与隔离测试；复核 CLI 报告 | 不触生产、不读凭据、不代替主 Agent 做接管决定 |

## 3. 窗口前只读预检（不停止旧消费者，不进入切换）

本节只做窗口前准备与只读核对：**不停止**旧 Host／adapter／Worker，**不复制**生产 DB，**不运行**需要静态输入的数据库 preflight，也不生成切换快照。实际停止、静态副本和快照动作全部在第 4 节 freeze 与旧写者退出后执行。

1. **Owner 授权窗口**：确认 Owner 已明确批准具体窗口、观察期、停止条件与回退负责人；未批准则本节到此为止。
2. **部署候选**：窗口内运行的必须是已验收提交（本轮实际包含 `b467f98a`、`24a631e46`、`fc703543c`、`c276cfae` 与 Provider 修复 `47dee92f`；后续还必须包含普通回复证据链的新修复提交）；不得在窗口内改代码、改测试或临时打补丁。旧 Host 启动时除原有生产配置外，必须同时显式设置：

```text
SYNO_P0_RUNTIME_MODE=production
SYNO_P4_LEGACY_HANDOVER=enabled
SYNO_P0_APP_ID=<PRODUCTION_APP_ID>
SYNO_P0_ROOT=<PRODUCTION_REPO_ROOT>
SYNO_P0_KNOWLEDGE_ROOT=<PRODUCTION_KNOWLEDGE_ROOT>
SYNO_P0_LOCAL_DATA_ROOT=<PRODUCTION_LOCAL_DATA_ROOT>
SYNO_P0_RUNTIME_ROOT=<NEW_RUNTIME_ROOT>
SYNO_LOCAL_DATA=<PRODUCTION_LOCAL_DATA_ROOT>
SYNO_KNOWLEDGE_ROOT=<PRODUCTION_KNOWLEDGE_ROOT>
SYNO_RUNTIME_ROOT=<OLD_HOST_RUNTIME_ROOT>
```

3. **旧 Host 环境一致性（不满足即启动失败）**：
   - `SYNO_LOCAL_DATA` 必须与 `SYNO_P0_LOCAL_DATA_ROOT` 解析到同一目录（凭据、`state/feishu-channel.json` 与旧 `${stateFile}.lock` 都由它派生）；
   - `SYNO_KNOWLEDGE_ROOT` 必须与 `SYNO_P0_KNOWLEDGE_ROOT` 解析到同一目录；
   - `SYNO_RUNTIME_ROOT` 必须指向旧 Host 原 `.runtime`，**不得**强行等于新 `SYNO_P0_RUNTIME_ROOT`；桥只使用新 Runtime 的 DB 与 host-status，旧写者仍写自己的 `.runtime`；
   - 生产 App 不得等于隔离测试 App；`SYNO_P0_RUNTIME_ROOT` 必须位于 `SYNO_P0_ROOT` 内。
   任一不满足时旧 Host 在获取租约／监听端口前失败关闭（稳定错误码），**不得**回退为“无桥消费者”继续运行，也不得手工放宽断言。
4. **现有只读状态**：从现有状态文件或已核验的只读视图记录五领域 active／queued、pending Decision、delivery queued／unknown、handover pending／hold 的基线；不为此新开活跃生产 DB 连接，不调用会推进状态、冻结或写库的操作。
5. **工具与证据目录**：确认 preflight、evidence、source-migration、rehearsal CLI、Runbook、Node 版本和 `<EVIDENCE_ROOT>` 可用；列出第 9 节证据的保存位置与命名。
6. **vault 核验方式**：确认 `<PRODUCTION_VAULT>` 的 Markdown 范围、排除项、文件数与 SHA-256 算法；实际基线在第 4 节 freeze 后生成。
7. **Owner 绑定核验方式**：确认生产 App 与 Owner 标识的核对方式；只导出 `appId`、`configured`、`ownerBound` 等安全布尔值，不导出凭据。
8. **入站去重水位核验方式**：确认去重文件／水位位置与哈希算法；切换后不得重放已处理消息。
9. **已启用外部效果映射范围**：确认只迁移已启用映射；未启用或未知映射保持未启用，不新建发布效果。
10. **静态副本与快照方案**：确认旧写者退出后的 takeover 副本、观察期后的最终副本、checkpoint／经核验副本做法、非 WAL 文件头要求、目标目录与拒绝覆盖策略；本节不执行。

任一项无法确认即停止。**数据库 preflight 不在本节运行**：它要求无活跃写者、无 `-wal`／`-shm`／`-journal` sidecar、且文件头非 WAL 的静态一致副本，统一在第 4 节旧写者退出后执行。默认 entry 模式（不传 `--takeover-freeze-generation`）继续要求 handover pending=0，只适用于不接管 frozen spool 的检查；生产切换窗口内不得在活跃数据库上运行，也不以 entry 结果替代 takeover 门禁。本节完成本身不构成切换授权；只有 Owner 窗口批准且第 4 节顺序完整执行才可接管。

## 4. 切换顺序（严格串行）

1. **freeze**：先冻结入站；随后消息只进入 frozen spool，不创建 Task、不推进 Context。不得先停止旧消费者再 freeze。旧 Host 通过真实 `SIGUSR1` 冻结；`SIGUSR2` 只刷新状态，不能代替 freeze。
2. **旧消费者退出确认**：确认旧 Host／adapter／Worker 确实退出、`<PRODUCTION_LOCK>` 已释放、无第二消费者；记录 PID、退出码、时间与进程表。旧 Host 关闭顺序固定为 runtime → freeze 桥（写 stopped 状态并关闭 DB）→ HTTP → host 租约，任一步失败都以 `HOST_SHUTDOWN_FAILED` 报错，不静默忽略。
3. **正式 C import（旧安全事实）**：旧写者退出后，把旧 Feishu 去重水位、显式安全清单和已启用发布映射写入新统一 DB。**所有输入安全核验通过才写统一 DB**：spool 内消息 ID 从 seen／pending 排除；非 spool pending／active／unknown／未登记外部效果一律阻断（退出码 3）；不导入旧 Task／Workflow／Session、正文、ownerOpenId 或凭据；报告含 before／after DB SHA-256 与源文件 SHA-256，源文件哈希必须不变。命令占位（全部绝对路径，`--output` 排他新建）：

```bash
node <PRODUCTION_REPO_ROOT>/experiments/superagent-p0/production-source-migration.mjs import \
  --database <NEW_UNIFIED_DB> \
  --state <PRODUCTION_LOCAL_DATA_ROOT>/state/feishu-channel.json \
  --app-id <PRODUCTION_APP_ID> \
  --safety <LEGACY_SAFETY_JSON> \
  --mappings <PUBLISHING_MAPPINGS_JSON> \
  --vault <PRODUCTION_VAULT> \
  --owner-status <OWNER_STATUS_JSON> \
  --output <EVIDENCE_ROOT>/p4-import-report.json
```

   退出码 `0` 才继续；`3` 表示业务阻断，按第 7 节停止；`2` 表示参数／路径／读取／结构错误。`--safety`／`--mappings`／`--owner-status` 由主 Agent 从旧只读事实导出，字段范围见第 5 节，工具不猜、不补写。
4. **准备 takeover 静态一致 DB 副本**：写者已停止后，用 static-copy 把 `<NEW_UNIFIED_DB>` 复制为 `<TAKEOVER_STATIC_DB_COPY>`。只处理停止写者后的源与排他新建目标，输出非 WAL、通过 `integrity_check`，源哈希不变，拒绝覆盖既有目标：

```bash
node <PRODUCTION_REPO_ROOT>/experiments/superagent-p0/production-source-migration.mjs static-copy \
  --source <NEW_UNIFIED_DB> \
  --target <TAKEOVER_STATIC_DB_COPY> \
  --output <EVIDENCE_ROOT>/p4-static-copy-report.json
```

   该副本只用于 preflight 与证据，**不是**把旧 SQLite 业务库迁入新 Runtime；takeover 副本与 final 副本必须分别生成，不得混用。无法准备则保持停止，不启动新 Runtime。
5. **对 takeover 静态副本运行门禁**：使用 `--takeover-freeze-generation <当前批准 generation>` 对 `<TAKEOVER_STATIC_DB_COPY>` 运行第 10 节 CLI。当前 generation 的 frozen spool 允许接管，数量写入证据；旧 generation、dispatching／hold、unknown、queued delivery、领域 queued、pending Decision 等仍失败。必须 `ready=true`（退出码 0）；失败、sidecar、WAL 文件头或退出码非 0 一律保持停止，不进入新 Runtime。`ready=true` 只表示允许唯一新 Runtime 接管并按既有流程 drain，不表示全部消息已结算。
6. **生成并复制已核验数据快照**：旧写者已停止后，核对 Markdown vault、Owner 绑定、入站去重水位、已启用外部效果映射及 SHA-256，并把快照复制到 `<SNAPSHOT_ROOT>`；旧 Task／Workflow／Session 只读归档。复制前后重算哈希，拒绝覆盖既有副本。
7. **唯一新 Runtime 持锁**：新 Runtime 获取 `<PRODUCTION_LOCK>`；竞争实例必须失败关闭，不修改在役状态文件。
8. **recover**：只把中断的 `dispatching`／`sending` 转为人工对账 `hold`，不自动重放；无法证明外部未发生的保持 unknown。
9. **drain frozen 至 pending=0**：drain 数量必须与第 4.5 步 takeover 报告的可接管 frozen spool 数量一致；分批 drain，每批后核对 `pendingCount`；只有显式接管回执才标记 forwarded，`hold`／`forwarded` 不计入 pending，也不得为清空 pending 而重放。drain 后必须 `pendingCount=0`，逐项核对 forwarded／hold 与 Task／delivery；任何缺口或数量不一致立即停止。
10. **unfreeze**：仅在 `pendingCount=0` 且 hold 已有明确处置后解冻。已知 spool 在 unfreeze 后仍不得走 immediate，adapter 恢复的 pending 与 drain／forward 共享防重，不允许同一消息二次执行。
11. **ready**：放行 immediate 入站；确认服务、锁、状态文件与数据库连接均为唯一实例。
12. **领域 queued drain**：只处理接管后按既有规则形成的 queued；不得提前推进 Context、不得重复调用模型，也不恢复旧 Task／Workflow／Session。观察期结束后，按第 11 节在 Owner 批准的收尾步骤中制备 `<FINAL_STATIC_DB_COPY>`，再采集 P4.2 evidence 并运行 verify；不得用第 4.4 节旧副本冒充最终证据。

## 5. 迁移范围

只迁移：

1. Markdown vault 内容；
2. Owner 绑定（仅安全布尔值与 appId）；
3. 入站去重水位；
4. 已启用的外部效果映射；
5. 旧安全清单：`activeJobs`／`activeWorkflows`／`pendingDecisions`／`unknownEffects`／`enabledExternalEffectsWithoutMapping` 必须显式为 0。

旧 Task／Workflow／Session **只读归档**，不进入新 Runtime 执行。迁移动作只允许：`dedupe_only`、`history_only`、`dedupe_no_resend`、`mapping_only`、`copy_versioned`。任何 `requeue_after_cutover`、`resume_after_verification`、`migrate_exact_version`、`migrate_claimable`、`hold_for_reconciliation` 或未知动作都必须阻断切换。

C import 的额外约束：

- `mapping_only` 只适用于四个已登记发布效果：`knowledge.publish`、`knowledge.publish.wiki`、`knowledge.publish.images`、`knowledge.publish.catalog`；其他效果按“未登记外部效果”阻断。
- spool 内消息 ID 从 seen／pending 排除，不重复登记；非 spool 的 pending、active、unknown 或未登记外部效果全部阻断。
- 同一消息已有冻结 spool 时，adapter 恢复的 pending 仍必须与之匹配（generation、frozen 状态）；已知 spool 优先于当前 control，unfreeze 后也不得转为 immediate。

## 6. 观察期模板

Owner 填写：

```text
窗口编号：
开始时间（含时区）：
结束时间（含时区）：
主动检查间隔与总时长：
被动观察时长（不主动发消息）：
观察负责人：
停止决策人：
回退决策人：
```

观察项：

1. **unknown**：是否出现新的 delivery unknown；是否已人工对账；是否误重发。
2. **重复通知**：同一消息是否收到多次通知；`provider_message_id` 是否被伪造。
3. **queued backlog**：各领域 queued 是否下降；是否存在长期不前移的同一对象队列。
4. **跨对象路由**：Idea／Project／Knowledge／Memory 的 Context、产物与通知是否串对象。
5. **恢复延迟**：从消息入站到 accepted 的时延分布；重启后 queued 是否自动续接。
6. **accepted ≠ 已读**：accepted 只表示投递被接受，不代表 Owner 已阅读；重复投递语义仍是 `at_least_once`。

## 7. 停止条件（出现任一即冻结并停止）

1. 出现双消费者，或锁被两个实例同时持有。
2. 任一跨对象污染：正文、引用、Context、产物或通知落入错误对象。
3. 无法解释的消息、Task 或通知缺口。
4. unknown 无法对账，或无法证明外部效果是否发生。
5. 源快照／vault／去重水位被意外改写。
6. 锁、哈希、数据库或状态文件异常。
7. takeover 报告的可接管数量与 drain 实际处理数量不一致，或 forwarded／hold 与 Task／delivery 对不上。
8. Owner 宣布停止。

停止后不删除证据，不手工改写业务状态，不重放未对账消息。

## 8. 回退

1. 先对账切换后产生的增量：新增／修改／删除文件、去重水位与外部效果。
2. 增量可安全吸收时，按既有 `rollbackDelta` 语义前向修复并重新验收。
3. 不能安全吸收时，保持停止并前向修复；**绝不**为了让旧系统继续服务而并行运行双消费者。
4. 旧系统只读保留，不恢复旧工作流，不把新能力迁回旧架构。
5. 回退过程本身同样需要证据：命令、时间、哈希、增量清单与最终状态。

## 9. 证据清单与提交纪律

窗口内至少保存：

1. 数据库 preflight 原始 JSON 与退出码（含 mode、expected／observed generation、可接管 frozen spool 数量）；
2. 五领域状态、handover 状态与迁移计划（不含私有正文）；
3. 旧消费者退出证据（PID、退出码、进程表、时间）；
4. 旧桥 before 回复证据：before 是 freeze 前的普通 immediate 回复，按 B 与 P4.2 语义只由旧桥自身产生 `legacy-handover` event／inbox／reply，owner 为旧 instance，**没有** domain Task／Attempt／delivery，也**没有** handover spool；冻结后才生成 spool。during 的当前 generation spool／forwarded 与新 owner 证据另行单独采集（可与本项并列归档，但必须分清 before 与 during），禁止用测试 fixture、脚本或运维手工补写；
5. 锁获取／竞争失败证据；
6. C import 报告（before／after DB SHA-256、源文件 SHA-256、排除的 spool ID 计数、pending 分类与 blocker codes、`externalEffects`）；
7. static-copy 报告（源／目标 SHA-256、非 WAL 与 integrity_check 结果、拒绝覆盖记录）；
8. 快照源／目标文件清单与 SHA-256；
9. frozen spool 的 pending／forwarded／hold 计数与 drain 批次；
10. 观察期日志、页面截图或等价证据；
11. unknown 对账记录与 provider 回执（如存在）；
12. 最终 `host-status` 与 accepted 计数；
13. P4.2 `evidence.json`、`verification.json`、expectation manifest 与 takeover 报告；
14. takeover 副本与 final 副本各自的 SHA-256、文件清单与归档位置，二者分开记录。

纪律：

- 只提交本轮明确声明的精确路径；禁止 `git add -A`。
- 不自动推送；推送、合并与生产重启按 Owner 授权执行。
- 失败现场原样保留，不用“重跑一次成功”覆盖首次失败记录。

**机器级断电与 macOS 登录冷启动必须单列证据**：不得用 Host 进程退出／重启测试冒充，也不得用单元测试结论代替。

## 10. 数据库 preflight CLI

### 用法

entry 模式（默认，任何 handover pending 都阻断）：

```bash
node <PRODUCTION_REPO_ROOT>/experiments/superagent-p0/production-handover-preflight.mjs \
  --database <TAKEOVER_STATIC_DB_COPY>
```

takeover 模式（仅允许显式批准的 freeze generation 的 frozen spool）：

```bash
node <PRODUCTION_REPO_ROOT>/experiments/superagent-p0/production-handover-preflight.mjs \
  --database <TAKEOVER_STATIC_DB_COPY> \
  --takeover-freeze-generation <CURRENT_APPROVED_GENERATION> \
  --output <EVIDENCE_ROOT>/p4-takeover-report.json
```

`<TAKEOVER_STATIC_DB_COPY>` 是第 4.4 节准备的接管前静态副本，只用于 takeover preflight；不得指向活跃 `<PRODUCTION_DB>`。`<CURRENT_APPROVED_GENERATION>` 是 freeze 后从统一状态观测并由 Owner／主 Agent 批准的当前 generation，必须与静态副本中的 handover generation 完全一致。

- 参数只允许 `--database <绝对路径>`、可选 `--output <绝对路径>`、可选 `--takeover-freeze-generation <正整数>`、`--help`。
- 不传 takeover 参数即 entry 模式：任何 handover pending 都产生 `handover_pending` blocker，`mode="entry"`、`drainRequired=false`。
- 传入 takeover 参数即 takeover 模式：只允许该 generation 的 `state="frozen"`、`freezeGeneration` 匹配、`needsReconciliation=false`、`autoReplay=false` 的 spool；旧 generation、未冻结、矛盾 generation、hold／dispatching、unknown、queued 等仍阻断。参数缺值、0、负数、非整数或重复指定均退出码 2。
- **输入前提**：数据库必须已存在，且是无活跃写者、无 `-wal`／`-shm`／`-journal` sidecar 的静态一致 DB 或经核验副本。活跃 WAL 必须先在批准窗口内停止写者并准备一致副本；本工具不写快照、不做 WAL 恢复。
- 打开 SQLite 前先检查 sidecar 与 SQLite 文件头：存在任一 sidecar、或文件头标记 WAL 模式时，直接退出码 2，不打开数据库、不输出报告。WAL 模式即使暂无 sidecar 也会被拒绝，因为只读打开仍可能创建 `-shm`／`-wal`。
- 数据库以 `node:sqlite` 只读方式打开，不创建数据库。
- 默认把 JSON 报告写到 stdout；指定 `--output` 时以排他新建（`wx`）写入，父目录必须已存在，禁止覆盖。
- 不访问网络，不写数据库，不启动 Host／飞书／Worker／模型。

### 退出码

| 退出码 | 含义 |
|---|---|
| `0` | `ready=true`，当前模式门禁通过 |
| `3` | `ready=false`，报告仍会输出，含 blocker codes 与计数 |
| `2` | 参数、路径、读取或输入结构错误，或存在 WAL／SHM／hot-journal sidecar／WAL 模式文件头；不产生报告文件 |

### 输出 scope

报告 schema 为 `syno-p4-production-handover-preflight-v1`，只覆盖数据库事实：

- `mode`（`entry`／`takeover`）、`expectedFreezeGeneration`、`observedFreezeGeneration`；
- `drainRequired` 与 `counts.takeoverFrozenSpools`；
- 五领域 active Task 与 queued 事件；
- `otherActiveTasks`；
- pending Decision；
- delivery queued／unknown；
- handover pending／hold 与 reconciliation blocking；
- migration `cutoverBlocked`、`externalEffects` 与逐项 action。

**`ready=true` + `drainRequired=true` 只表示“允许唯一新 Runtime 接管，并必须按第 4.9 步 drain 当前 generation 的 frozen spool”，不表示全部消息已结算。** entry 模式不得出现 `drainRequired=true`；takeover 未 ready 时 `drainRequired` 必为 `false`。

报告不包含 spool 正文、Memory 值、候选动作、Token 或 Secret，也不逐个输出 pending 项；只给出计数、mode、generation 与 blocker codes。报告也不证明进程、端口、文件、vault 内容、Owner 绑定、锁、外部效果或通知已验收。

### Blocker codes

| code | 含义 |
|---|---|
| `host_status_schema_unknown` | host status schema 未知 |
| `active_task` | 仍存在 active Task（含五领域与 other） |
| `queued_event` | 五领域仍有 queued 事件 |
| `pending_decision` | 仍有 pending Decision |
| `queued_delivery` | 仍有 queued delivery |
| `unknown_delivery` | 仍有 unknown delivery |
| `handover_unobserved` | 未提供 handover 状态，无法证明 frozen／空 |
| `handover_pending` | entry 模式下仍有 pending spool |
| `handover_hold` | handover 仍有 hold／dispatching／sending |
| `handover_schema_unknown` | takeover 模式下 handover schema 未知 |
| `handover_not_frozen` | host／handover／control 未全部处于 frozen |
| `handover_generation_conflict` | handover 顶层 generation 与 control generation 不一致 |
| `handover_generation_mismatch` | observed generation 与显式 expected 不一致 |
| `handover_pending_not_frozen` | pending 项 state 不是 `frozen` |
| `handover_pending_generation_mismatch` | pending 项 freezeGeneration 与 expected 不一致 |
| `handover_pending_needs_reconciliation` | pending 项需要人工对账 |
| `handover_pending_auto_replay` | pending 项允许自动重放 |
| `handover_status_inconsistent` | pendingCount／spool frozen count／holdCount 与实际不一致 |
| `reconciliation_blocking` | 统一状态标记需对账 |
| `migration_plan_schema_unknown` | 迁移计划 schema 未知 |
| `migration_action_<action>` | 出现禁止的迁移动作 |
| `migration_action_unknown` | 出现未知迁移动作 |
| `migration_cutover_blocked` | 迁移计划自身 `cutoverBlocked=true` |
| `external_effects` | 迁移计划 `externalEffects != 0` |

### 限制

1. 这是**数据库门禁**，不能替代第 3 节的其他检查。
2. 结构缺字段／错误类型会以退出码 2 失败关闭；未知 schema／动作以 blocker 失败关闭。
3. sidecar／WAL 文件头守卫是**打开 SQLite 前**的前置检查；若守卫后、读取期间出现新写者，仍可能产生 race。生产前提是无活跃写者，出现并发写者即视为窗口异常并停止。
4. 干净关闭的 WAL 模式数据库同样被拒绝，因为只读打开仍可能创建 sidecar；需由主 Agent 准备静态一致副本。
5. 退出码 0 不表示 P4 已批准、进程已切换、通知已送达或外部效果已对账。
6. 机器断电、登录冷启动、平台主动重复投递等仍未由本工具覆盖。

## 11. P4.2 窗口证据采集与独立验收（只读工具）

工具：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/production-handover-evidence.mjs`。它只读取静态 DB 副本与 manifest，不执行 freeze／unfreeze／recover／drain／claim／send，不启动 Host／飞书／Worker／模型。最终 evidence 必须使用观察期后重新制备的 `<FINAL_STATIC_DB_COPY>`，不得复用第 4.4 节 `<TAKEOVER_STATIC_DB_COPY>`。

### 命令

```bash
node <PRODUCTION_REPO_ROOT>/experiments/superagent-p0/production-handover-evidence.mjs collect \
  --database <FINAL_STATIC_DB_COPY> --expect <EXPECT_JSON> --output <EVIDENCE_JSON>

node <PRODUCTION_REPO_ROOT>/experiments/superagent-p0/production-handover-evidence.mjs verify \
  --expect <EXPECT_JSON> --evidence <EVIDENCE_JSON> \
  --takeover-report <TAKEOVER_REPORT_JSON> [--output <VERIFY_JSON>]
```

- 所有路径必须是绝对路径；`collect` 的 `--output` 必填；所有 output 用 `wx` 排他新建，父目录必须已存在，禁止覆盖。
- `collect` 在打开 SQLite 前复用静态守卫：活跃 WAL、`-wal`／`-shm`／`-journal` sidecar 或 WAL 模式文件头均退出 2，且不生成 evidence。
- 退出码：`0` collect 成功或 verify `ok=true`；`3` verify `ok=false`（业务不满足，报告仍输出）；`2` 参数／读取／JSON／结构错误。
- `collect` stdout 只打印短摘要（DB SHA-256、message／artifact 数、output 路径），不输出 `ok`。

### Expectation manifest（`syno-p4-handover-expectation-v1`）

```json
{
  "schema": "syno-p4-handover-expectation-v1",
  "freezeGeneration": 6,
  "messages": [
    { "messageId": "om_<id>", "role": "before", "kind": "reply" },
    { "messageId": "om_<id>", "role": "during", "kind": "domain", "contextId": "capture:<id>", "contextVersion": 1 },
    { "messageId": "om_<id>", "role": "after", "kind": "reply" }
  ],
  "artifacts": [
    { "path": "<ABSOLUTE_ARTIFACT_PATH>", "expectedSha256": "<64-lowercase-hex>" }
  ]
}
```

- `freezeGeneration` 必须是正整数，并与 takeover 报告的 expected／observed generation 一致。
- `messages` 非空、messageId 唯一；角色只能是 `before`／`during`／`after`，类型只能是 `reply`／`domain`。
- domain 项必须有 `contextId` 与正整数 `contextVersion`；reply 项不得带 context 字段。
- `during` 必须是 domain，表示冻结窗口内应由当前 generation 唯一接管的消息。
- `artifacts` 可为空；每项必须是绝对路径 + lowercase SHA-256，路径唯一。manifest 由主 Agent 按实际发送与产物清单编写，工具不猜测。

### 独立验收与对账

`verify` 不信任 evidence 中任何预计算 `ok`／`passed`，从安全原始事实子集重算：

1. 每条 message 恰好一条 event、一条已处理 inbox；缺失／重复／未处理阻断。
2. domain 消息恰好一条 Task、一个 Attempt／run、一条 delivery：Task `state="completed"`、`attempt.id===task.attemptId`；inbox.messageId 等于当前消息，domain 的 inbox context／version 与 manifest 一致；Task context／version 与 manifest 一致，Attempt／run 已完成且 lane 不串对象，delivery `accepted` 且 `may_send=false`。accepted 不代表已读。
3. during 消息恰好一条 `forwarded` spool：generation 与 manifest 一致、`attempts=1`、owner 存在、`needsReconciliation=false`、`autoReplay=false`，并有且只有一条 domain 业务链。
4. reply 消息恰好一条 accepted handover reply，无 domain Task／Attempt／run／delivery／spool；同一阶段多个 reply 的 owner 必须唯一。before 与 after 都有 reply 时 owner 必须存在且不同；有 during 时其 owner 必须全部相同，且 during 与 after 的新 Runtime owner 集合必须完全相同；before owner 不得与 during／after 新 owner 相同。
5. Task／Attempt／delivery／spool／reply 的稳定 ID 不得跨消息重复借用。
6. **N 对账**：`manifest during 数 = takeoverReport.counts.takeoverFrozenSpools = evidence 中当前 generation 且 forwarded 的 during spool 数`。drain 后这些 spool 不得仍处于 pending。
7. 最终全局 active Task（含 other）、领域 queued、pending Decision、delivery queued／unknown、handover pending／hold、reconciliation blocking 必须全为 0／false；unknown 永远不得称为“待重发”。
8. artifact 必须存在、是普通文件且 actual SHA-256 与 expected 完全一致。

verify 输出只含 `schema`／`ok`／稳定排序的 `blockers`／安全计数，不包含 evidence 全文、spool 正文、Memory 值或 artifact 内容。

### 最终静态副本与归档

- 观察期结束后，由主 Agent 在 Owner 批准的收尾步骤中，按第 3.10 节已确认的副本方案重新制备 `<FINAL_STATIC_DB_COPY>`：无活跃写者、无 `-wal`／`-shm`／`-journal` sidecar、文件头非 WAL。若必须先 freeze／停止唯一新 Runtime 才能满足，按第 7 节停止条件与批准流程执行。
- 未获批准或无法制备最终静态副本时，最终验收保持 blocked；不得直接读取活跃生产 DB，不得复用 `<TAKEOVER_STATIC_DB_COPY>` 冒充最终证据。
- `evidence.databaseSha256` 必须与 `<FINAL_STATIC_DB_COPY>` 的实际 SHA-256 一致。takeover 副本 hash／preflight 报告与最终 evidence／verification 分开归档，不得混称。

### 失败即停止

- `collect` 退出 2、`verify` 退出 2 或 `ok=false` 时，按第 7 节停止／freeze 唯一新 Runtime、保留现场并进入对账；此时新 Runtime 已在运行，不是“不要启动新 Runtime”。
- 不得为重跑验收而重复 drain、盲目重启或手工改写业务状态；unknown 永远不得重发。
- N、generation、artifact hash、event／inbox、业务链、owner 归属任一不一致均停止；不能用“重跑一次成功”覆盖首次失败。
- 本工具不验证进程锁／端口、Owner 绑定、真实已读或外部效果；最终静态副本与 expectation 由主 Agent 制备，实际生产窗口仍需 Owner 单独批准。

## 12. P4.3 工具与隔离复演（不构成生产授权）

### 工具清单（均已验收提交，未推送）

| 环节 | 提交 | 工具 | 作用 |
|---|---|---|---|
| A | `b467f98a` | `experiments/superagent-p0/real-feishu-config.mjs`、`real-feishu-client.mjs` | 生产／隔离配置分离；生产模式必填 App、root、knowledge、localData、runtime 且路径绝对；隔离测试 App 在生产模式 fail-closed；生产锁固定为旧 adapter 的 `${stateFile}.lock`。 |
| B | `24a631e46` | `experiments/superagent-p0/legacy-production-handover.mjs`、`apps/syno/server.mjs`、`apps/syno/syno/runtime.mjs` | 旧 Host 桥默认关闭，仅 `production` + `SYNO_P4_LEGACY_HANDOVER=enabled` 时启用；`SIGUSR1` freeze、`SIGUSR2` 仅刷新状态；普通回复写旧 owner event／inbox／reply 证据；静态 `PATHS` 与 P0 localData／knowledge 必须同根，runtimeRoot 不强制统一；固定 shutdown 顺序；空库一次性最小 rules 幂等初始化。 |
| C | `fc703543c` | `experiments/superagent-p0/production-source-migration.mjs`、`host-handover.mjs` | 正式 `import`／`static-copy` CLI；spool ID 排除、pending 分类、已知 spool 在 unfreeze 后仍禁止 immediate 的共享防重、真实 adapter pending 恢复防重、before／after DB hash、源 hash 不变、`mapping_only`、vault／Owner 安全清单、非 WAL 副本。 |
| D | `c276cfae` | `experiments/superagent-p0/production-rehearsal.mjs`、`tests/superagent-p4-production-rehearsal.test.mjs` | 全链路隔离复演与失败分支断言。 |

### 复演 CLI

```bash
node <PRODUCTION_REPO_ROOT>/experiments/superagent-p0/production-rehearsal.mjs \
  run --output-root <绝对且不存在的新目录>
```

- 输出根必须由工具排他新建，已存在即拒绝，禁止覆盖上一次现场；不联网、不调用业务模型、不启动生产、不触碰真实 DB／vault／凭据。
- 退出码：`0` 复演通过；`3` 复演断言失败（输出 `ok=false` 与脱敏错误，现场保留）；`2` 参数错误。
- 复演按 Runbook 顺序串行：合成旧 JSON／vault／DB → 旧桥 before 回复 → freeze during spool → 旧消费者退出 → C import → static-copy → takeover preflight → 快照 → 唯一锁 → recover → drain → unfreeze／adapter 恢复 → ready → after 回复 → 领域 queued → final 静态副本与 P4.2 collect／verify → 回退增量。

### 证据解释（2026-11-20 主 Agent 独立复演）

- 证据根：`/Users/hoye/Documents/workspace/syno-p0-real-test/p43d-main-rehearsal-20261120-r1`；CLI 日志：`/Users/hoye/Documents/workspace/syno-p0-real-test/p43d-r1-main-rehearsal-cli.log`；机器摘要 `rehearsal-summary.json` 为 `ok=true`、`synthetic=true`、`generation=1`。
- 12 个阶段全部 `ok`：`01-before`（旧 instance 普通回复）、`02-freeze`（2 条 frozen spool、0 Task）、`03-retire`（旧消费者退出后 spool 不变）、`04-import`（dedupeOnly=1、mappingOnly=1、seenExcludedSpool=2、blockedPending=0、externalEffects=0）、`05-takeover`（ready=1、drainRequired=1、2 条可接管 spool）、`06-snapshot`（vault 2 文件＋安全清单 3 文件）、`07-lock`（唯一 owner）、`08-drain`（forwarded=2、pending=0）、`09-unfreeze`（新 adapter 恢复 2 条已知 spool，after reply accepted）、`10-queued`（1 条 queued 串行恢复，Context 1→2，remainingQueued=0）、`11-final`（4 条消息、2 domain、2 reply、5 artifacts、0 blockers）、`12-rollback`（added=2、changed=0、deleted=0、externalEffects=0）。
- 5 个失败分支全部 `blocked`：竞争锁（`PROCESS_LOCK_HELD`，状态文件哈希不变）、dispatching／sending 中断（只转 hold，verify 报 `handover_hold` 等）、delivery unknown（`unknown_delivery`）、generation／N 不一致（`handover_generation_mismatch`、`takeover_count_mismatch`）、跨对象／artifact（`context_object_mismatch`、`artifact_hash_mismatch`）。
- before／during／after owner：before 为旧 instance；during 与 after 为同一新 instance。全部持久化 JSON 不含 `PRIVATE_`、合成 Owner ID 或合成 Secret，无 DB sidecar。
- P4.2 最终独立 verify：`ok=true`、blockers 为空，counts 为 messages=4、domainMessages=2、replyMessages=2、duringMessages=2、artifacts=5；报告 `/Users/hoye/Documents/workspace/syno-p0-real-test/p43d-r1-main-independent-verification.json`。

### 不构成生产授权

- 复演使用脱敏／合成输入，**不构成生产授权**，也**不证明**生产已接管、真实消息已读、真实断电或 macOS 登录冷启动。
- 复演通过只证明工具链与门禁顺序在合成场景下可失败关闭并通过验收；真实生产的 before 证据必须来自旧桥真实 event／inbox／reply，不能用复演或测试 fixture 冒充。
- 生产 freeze／停止／启动／回退仍只能由主 Agent 在 Owner 新批准窗口内执行；OpenCode 不触生产。

## 13. 2026-11-20 真实窗口：freeze 前阻断与回退

- 授权窗口：`2026-11-20T09:22:33Z` 至 `2026-11-20T10:22:33Z`，接管后观察 30 分钟，主 Agent 负责停止与回退。机器证据：`/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T092233Z/incident.json`。
- 候选 plist 通过 `plutil -lint` 与配置路径门禁后，launchd 切换出现 I/O 错误及 bootout 后旧 server 遗留；最终带桥 Host 启动成功，飞书 running／available／ownerBound 均为 true，但 Harness 因 P0 vendor 缺少多个 `lib/typert.host.js` 构建产物持续 degraded。未在窗口内改代码或 vendor。
- 只读安全清单发现 `activeWorkflows=2`、`terminalWorkflows=21`；`pendingDecisions=0`、`consumedDecisions=7`。Runbook 第 5 节要求 activeWorkflows 显式为 0，因此未猜零、未修改旧事实、未 freeze。activeJobs／unknownEffects／未映射外部效果未得到完整证明，也未按零处理。
- 阻断确认时剩余时间不足以完成接管及 30 分钟观察，故执行回退。最终 launchd 恢复原仓库与 plist，P0 Host 进程为 0；旧 Host 的 Store／Harness／Channels 全 ready，飞书 running／available／ownerBound 均为 true。
- 本窗口未发送 before／during／after，未 freeze／import／static-copy／takeover preflight／启动新 Runtime／观察／P4.2 验收，未推送，P5 未启动。候选 `.runtime-p0` 和失败证据保留，不删除。

### 后续非生产 remediation（2026-11-20）

- 两个无 `terminalAt` 的旧 Workflow 实际均为 `failed_terminal`；按 `ingest-workflow-coordinator.mjs` 的 `TERMINAL_STAGES`，23 条全部终态，active=0。不得再用 terminalAt 缺失单独推断活跃，也不需改写旧事实。
- 候选 DSH 子模块仍为 `5badb150`，使用项目指定 pnpm 11.7.0 离线构建成功，记录 355 个 client artifacts；缺失的 typert host 产物已存在。日志：`/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T092233Z/dsh-candidate-build-r2.log`。
- 全量 JobStore 只读核验五类活跃 Job 均为 0；pending Decision=0，unknown effect=0。264 个发布对象的 wiki/images/catalog 均同版本 succeeded，生成 792 条映射；完整旧 sourceVersion SHA-256 保留在 `mapping.id`，迁移表示 `version=1`。三份输入均通过 C 的现有校验器。
- 输入根：`/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T092233Z/preparation-r3`；机器汇总：`next-window-readiness.json`。during 只读消息为 `查询 doc_<redacted>：P4_READ_ONLY_NO_MATCH_20261120`，预期 not_found，避免把 vault 正文发送到飞书或外部模型。
- 这些准备不构成新生产授权；带桥 Host 尚未在新构建后重启。下一窗口建议至少 90 分钟。

## 14. 2026-11-20T10:14:56Z 真实接管与最终 P4.2 阻断

- 授权窗口至 `2026-11-20T11:44:56.045Z`，证据根为 `/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z`。Provider 的 `MISSING_CREDENTIAL` 根因由 `47dee92f119e702ce53e585637015727845fbfc2` 修复；两个失败 Job 均正常 completed，未读取或复制密钥。
- 真实 generation=1：during `om_<redacted>` 进入 frozen spool；旧消费者退出后 import、takeover 静态副本和 preflight 均通过，`ready=true`、`takeoverFrozenSpools=1`。814 个 vault 文件（其中 338 个 Markdown）及去重水位快照哈希一致。
- 新 instance `<redacted-uuid>` 完成 recover→drain→unfreeze→ready，during `forwarded=1`、`attempts=1`；after `om_<redacted>` 普通回复 accepted。竞争实例以 `FEISHU_PROCESS_LOCKED` 失败。
- 30 分钟观察 `ok=true`，无 unknown／hold／双消费者。观察后停止新 Runtime 并制备独立 final 静态副本，SHA-256 为 `9d070fe465c9937e052c8bf940049875c12642db5eda5a5efd2983a44e45a763`。
- **最终 P4.2 未通过**：after 有 accepted reply，但 event／inbox 均为 0；`verification.json` 为 `ok=false`，blocker 仅 `event_missing=1`、`inbox_missing=1`。before 与 during 证据完整，owner／generation／N／Task／Attempt／delivery／artifact 无其他 blocker。
- 按失败即停止，新 Runtime 当前 freeze generation=2、Host／adapter stopped，未 kickstart 恢复；未改 expectation、未补写业务事实、未重跑 drain。完整交接与代码根因入口：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/P4-PRODUCTION-HANDOFF-20261120.md`。
- **2026-11-21 修复更新**：普通回复 event／inbox 缺失已在隔离环境修复（提交 `fcac7c3f0`），P4.2 隔离复演 `ok=true`。
- **2026-11-21 生产修复窗口（通过）**：新 after `om_<redacted>` 的 event=1、inbox=1、accepted reply=1，30 分钟观察 `ok=true`，P4.2 `verify.ok=true`、blockers 空；服务已恢复（PID `85264`、generation=3、launchd running）。证据根 `/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-repair-window-20261120T163628Z`；完整记录见交接文档第 13 节与 P0-VERIFICATION 第 29 节。
