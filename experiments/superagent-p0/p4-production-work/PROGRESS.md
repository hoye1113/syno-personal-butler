# P4 准备阶段实施记录

> 公开版脱敏说明：真实 Feishu 消息／实例／Job／文档 ID 已替换为占位符；完整证据保留在本地。

日期：2026-11-20
仓库：`/Users/hoye/Documents/workspace/syno-personal-butler-p0`
基线 HEAD：`662ca7bced34a9c5703db68602c2ace606a7a75a`（首轮起点）；P4.2 起点 `077dc762b8cc6c01a3ff33c955e82a4c0685c530`
已提交：`0a7643ea92253653cd389178fa1a758a16d24a69 feat: 增加 P4 入窗与接管门禁`；`077dc762b8cc6c01a3ff33c955e82a4c0685c530 docs: 记录 P4 接管门禁验收`；`6a501001030c1d1f5b939eded5987ccea6636581 feat: 增加 P4.2 只读证据采集与独立验收`；P4.3：`b467f98a309311e1b3fb7f42b9aec79dcada66c4`、`24a631e46f472f57535695d1bfca56c79f823ac1`、`fc703543c694e4ea85ce58dd6f917b7950402dd9`、`c276cfaeacc5f93279a062e4a5bc8f00ff1b008d`
执行者：OpenCode CLI（`opencode-go/deepseek-v4.1-flash`）
状态：**2026-11-20T10:14:56Z 窗口已执行真实接管与 30 分钟观察，但最终 P4.2 因 after 缺 event／inbox 而未通过。** Provider 的 `MISSING_CREDENTIAL` 已由 `47dee92f119e702ce53e585637015727845fbfc2` 修复，两个失败 Job 均正常 completed。新 Runtime 当前 freeze generation=2、Host／adapter stopped，未恢复服务；未修改 expectation 或生产业务事实，未重跑 drain。下一 Agent 从 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/P4-PRODUCTION-HANDOFF-20261120.md` 接续；未推送，P5 未启动。

## 修改文件（仅白名单 5 个）

1. 新增 `experiments/superagent-p0/production-handover-preflight.mjs`
2. 新增 `tests/superagent-p4-production-handover.test.mjs`
3. 新增 `docs/plans/superagent-p0/P4-PRODUCTION-HANDOVER-RUNBOOK.md`
4. 新增 `experiments/superagent-p0/p4-production-work/PROGRESS.md`（本文件）
5. 新增 `experiments/superagent-p0/p4-production-work/BLOCKED.md`

`host-operations.mjs`、`host-handover.mjs`、`migration-rehearsal.mjs`、P3.4 测试、package、gate、CI、`real-feishu-client.mjs`、vendor 均未修改。

## 实现

### 1. 复用既有能力

- `buildHostStatus`：五领域 active Task／queued、other active、pending Decision、delivery queued／unknown、handover 与 reconciliation。
- `openHostHandover().status()`：handover pending／hold；只读调用，不 freeze／drain／recover。
- `buildMigrationSnapshot` + `planMigration`：迁移快照与逐项 action，未改其语义。
- `ProcessFileLock` 未被本工具调用；生产窗口由主 Agent 按既有锁语义执行。

### 2. 纯判定函数

导出 `evaluateDatabasePreflight({ hostStatus, migrationPlan })`，输出 schema `syno-p4-production-handover-preflight-v1`：

- `ready` 布尔值、按 code 排序的 `blockers[{code,count}]`、稳定 `counts` 与 `migration.actions`。
- 通过条件：五领域与 `otherActiveTasks` 无 active Task；五领域 queued 为空；pending Decision 为空；delivery queued／unknown 为空；handover pending／hold 为空且 `reconciliation.blocking=false`；`cutoverBlocked=false`；`externalEffects=0`；action 仅限 `dedupe_only`、`history_only`、`dedupe_no_resend`、`mapping_only`、`copy_versioned`。
- 失败关闭策略（测试与 Runbook 已固定）：
  - 缺字段、错误类型、active Task 拆分不一致 → 抛 `PreflightInputError`（CLI 退出码 2）；
  - 未知 host status schema、未知迁移计划 schema、未知 action → 明确 blocker，`ready=false`；
  - 五类恢复／重排／领取／对账 action 各自产生 `migration_action_<action>` blocker；未知 action 产生 `migration_action_unknown`；
  - `handover` 缺失（null）产生 `handover_unobserved`，不把“未观测”当空。
- 输出只含计数、code、action 名与 schema；不输出 Task／Decision／delivery 正文、Memory 值、候选动作或 Secret。

### 3. 窄 CLI

- 参数仅 `--database <绝对路径>`、可选 `--output <绝对路径>`、`--help`。
- 数据库必须已存在且为普通文件；`new DatabaseSync(path, { readOnly: true })` 只读打开，不创建数据库。
- 从同一共享 DB 构造 host status、handover status 与 migration snapshot／plan，输出同一纯判定报告。
- 默认 JSON 写 stdout；`--output` 用 `wx` 排他新建，父目录必须存在，禁止覆盖。
- 退出码：`0` ready；`3` not ready；`2` 参数／读取／输入结构错误。
- 不访问网络、不写 DB、不启动服务；除指定 output 外不写文件。

### 4. 隔离测试

`tests/superagent-p4-production-handover.test.mjs` 使用临时目录、合成 fixture 和临时 SQLite；不启动 Host、飞书、Worker 或模型。

## 需求与测试对照

| 任务书要求 | 测试证据 |
|---|---|
| 1. 干净状态通过，action 符合只读归档 | 「干净数据库事实通过，迁移动作全部属于只读归档策略」 |
| 2. active Task／五领域 queued／other active／pending Decision／queued delivery／unknown delivery／handover pending／hold 分别阻断 | 「active Task、五领域 queued、pending Decision、delivery 与 handover 分别阻断」（五领域参数化，含聚合计数） |
| 3. 五类禁止 action、未知 action、externalEffects 非零阻断；不放宽旧 planner | 「恢复执行类与未知迁移动作全部阻断，externalEffects 非零阻断」＋「既有 planMigration 未被放宽」 |
| 4. 缺字段／坏 schema 失败关闭；输出可序列化、重复一致、无私有值 | 「缺字段与错误类型抛出清晰参数错误，未知 schema 失败关闭」＋「报告可序列化、重复调用一致且不含私有正文或 Memory 值」 |
| 5. CLI 拒绝相对路径、缺失 DB、未知参数、output 覆盖；退出码 | 「CLI 对干净数据库退出 0…」＋「CLI 对未完成数据库退出 3…」＋「CLI 拒绝相对路径…」 |
| 6. 前后 SHA-256 与 facts 数不变，不创建其他文件 | 上述 CLI 测试中的 `sha256File`／`factsCount`／`readdirSync` 断言 |
| 7. 不启动 Host／飞书／Worker／模型 | 测试只导入 preflight 与既有只读模块；另断言 CLI 源码不含 Host／飞书／网络引用 |

## 原始自检结果

```text
node --check experiments/superagent-p0/production-handover-preflight.mjs
# 无输出，退出码 0

node --test tests/superagent-p4-production-handover.test.mjs \
  tests/superagent-p3-cutover.test.mjs \
  tests/superagent-p3-migration.test.mjs
# tests 24 / pass 24 / fail 0 / cancelled 0 / skipped 0 / todo 0

npm run verify
# Repository verification passed (5169 files).
# Active documentation check passed (8 files).

git diff --check
# 无输出，退出码 0
```

未运行全量 gate；由主 Agent 独立运行与审查。

## 未做事项

- 未读取／写入任何生产 App、生产数据库、生产 vault、Inbox／Outbox 或发布目标。
- 未启动／停止任何 Host、飞书 adapter、Worker、模型业务链或第二消费者。
- 未读取或导出 Token、Cookie、App Secret、凭据库、`service.json` 或认证缓存。
- 未执行真实生产切换、冻结、快照复制、drain、对账或通知。
- 未提交、未推送、未安装依赖、未做额外重构。
- 机器级断电与 macOS 登录冷启动仍未验证，且不得用本工具或单元测试冒充。

OpenCode 自报成功不代替主 Agent 的独立审查与验收。

## R1 返工（2026-11-20）：WAL 只读语义

本轮只修主 Agent 审查的 P1，不扩大范围。首轮实施记录与自检结果原样保留于上方，未改写。

### 审查 P1

【P1】`production-handover-preflight.mjs` 的 `DatabaseSync(..., { readOnly: true })` 在活跃 WAL 数据库上会改写 `-shm`；首轮测试只覆盖 rollback-journal 临时库。CLI 契约“除 output 外不写文件”被破坏，且可能在忽略 WAL 的情况下返回 `ready=true`。

### 独立复现

使用首轮基线副本 `/Users/hoye/Documents/workspace/syno-p0-real-test/p4-preflight-r1-baseline/production-handover-preflight.mjs`（复制到临时目录并链接既有只读模块），对一个保持 writer 连接开启的临时 WAL DB 运行：

```json
{
  "status": 0,
  "stdoutReady": true,
  "before": {
    "shared.db": "97e8d54f8a7255106f66cf1b213c4a4d7b558d21310b1c2bfedc3d0d526dddda",
    "shared.db-shm": "9670ea1227fa8a39aa30c02716511e235b8a5f0f3205b655f82d608f5d9767ce",
    "shared.db-wal": "fea920cc8e7d8309ed7194fe85a6fbfe905f403f13a12e984db2d0cba347ca1a"
  },
  "after": {
    "shared.db": "97e8d54f8a7255106f66cf1b213c4a4d7b558d21310b1c2bfedc3d0d526dddda",
    "shared.db-shm": "d29cfa7402cf64e3e188927a056119050fa5dda4386cf87e99c3666c9cd53b76",
    "shared.db-wal": "fea920cc8e7d8309ed7194fe85a6fbfe905f403f13a12e984db2d0cba347ca1a"
  },
  "unchanged": false
}
```

另确认：WAL 模式数据库即使已干净关闭、无 sidecar，只读打开仍会创建 `-wal` 与 `-shm`。

### 修复

- 新增 `assertStaticDatabase(file)`，在 `new DatabaseSync` **之前**执行：
  1. 存在 `${db}-wal`／`${db}-shm`／`${db}-journal` 任一 sidecar → `PreflightInputError`，CLI 退出码 2；
  2. 读取 SQLite 文件头第 18／19 字节；为 `2`（WAL 模式）→ 同样失败关闭，即使当前没有 sidecar。
- 未引入 `immutable`、临时库、备份写入、新依赖或锁；未改变业务判定、迁移 action 策略、ready／not-ready 退出码。
- CLI 帮助与 Runbook 明确输入前提：无活跃写者、无 sidecar 的静态一致 DB 或经核验副本。

### 新增回归（existing 24 项断言未删改）

1. 活跃 WAL（writer 连接保持开启）：断言 `-wal`／`-shm` 存在，CLI 退出码 2、stdout 为空，主 DB／WAL／SHM 哈希与目录清单完全不变。
2. 干净关闭的 WAL 模式 DB（无 sidecar）：断言 CLI 退出码 2，且不再创建 `-wal`／`-shm`，主 DB 哈希不变。
3. 模拟 `-journal` sidecar：断言 CLI 退出码 2、数据库与 journal 哈希不变；测试注明这是前置守卫，不是真实崩溃恢复。

### R1 自检结果

```text
node --check experiments/superagent-p0/production-handover-preflight.mjs
# 无输出，退出码 0

node --test tests/superagent-p4-production-handover.test.mjs \
  tests/superagent-p3-cutover.test.mjs \
  tests/superagent-p3-migration.test.mjs
# tests 27 / pass 27 / fail 0 / cancelled 0 / skipped 0 / todo 0

npm run verify
# Repository verification passed (5169 files).
# Active documentation check passed (8 files).

git diff --check
# 无输出，退出码 0
```

未运行全量 gate。未触生产、未提交、未推送。

## R2 返工（2026-11-20）：恢复 freeze 优先的 Runbook 顺序

本轮只修文档 P1，未改 `production-handover-preflight.mjs`、测试或其他代码；未触生产、未提交、未推送。

### 审查 P1

R1 为静态 DB preflight 把“旧消费者与写者停止”放进第 3 节，而第 4 节第 1 步才 freeze；第 3 节又要求全部通过才进入第 4 节，实际形成 stop→freeze 的未冻结入站空窗，可能丢消息，违反既定 freeze→旧消费者退出→新 Host 接管要求。

主 Agent 已独立验证 R1 WAL 修复：原探针退出码 2、stdout 为空、DB／WAL／SHM 哈希全不变，相关 27/27 通过。**本轮按要求未重跑代码测试，也不声称重跑。**

### 修复

- 第 3 节改为“窗口前只读预检”：只核对 Owner 授权、现有只读状态、工具／证据目录、vault／Owner 绑定／去重水位／外部效果映射的范围与核验方式、静态副本与快照方案；明确不停止旧消费者、不复制生产 DB、不运行 preflight、不生成切换快照。
- 第 4 节按任务书恢复为 11 步严格串行：freeze → 旧消费者退出确认 → 静态一致 DB 副本 → 对副本运行 preflight → 生成并复制已核验数据快照 → 唯一新 Runtime 持锁 → recover → drain frozen 至 pending=0 → unfreeze → ready → 领域 queued drain。
- 保留崩溃 hold、显式接管回执、unknown 不自动重放、旧 Task／Workflow／Session 只读归档等约束。
- CLI 示例改为 `<STATIC_DB_COPY>`，并注明不得指向活跃 `<PRODUCTION_DB>`；删除“旧消费者停止后进入 freeze”和第 3.2／3.7 等失效引用。

### R2 自检结果（仅文档）

```text
npm run verify
# Repository verification passed (5169 files).
# Active documentation check passed (8 files).

git diff --check
# 无输出，退出码 0
```

全量 gate 由主 Agent 运行；R2 未运行代码测试。

## 方案 A 实施（2026-11-20）：entry 与 takeover 门禁分离

Owner 已明确选择无法收敛报告中的方案 A。本轮是新规格实施，只改工具、隔离测试与文档；未执行生产接管。

### 未收敛 P1

- 默认 preflight 把任何 `handover.pending` 作为 `handover_pending` blocker，freeze 后正常 frozen spool 无法通过。
- Runbook 第 4.4 步要求 preflight ready，第 4.8 步却要求新 Runtime drain frozen，形成流程矛盾；正常冻结窗口流量会使切换无法完成。

### 实现

- **entry 模式（默认）**：不传新参数时保持原语义，任何 handover pending 都阻断；报告 `mode="entry"`、`drainRequired=false`。
- **takeover 模式**：CLI 新增且仅新增 `--takeover-freeze-generation <正整数>`；出现即 takeover。缺值、0、负数、非整数、重复指定均退出码 2。不新增布尔开关，不自动猜测 generation。
- takeover 放行 frozen spool 的必要条件：
  - host status、handover、control 全部 `frozen`；
  - observed generation 与 expected 一致，且顶层与 control generation 不矛盾；
  - 每个 pending 项 `state="frozen"`、`freezeGeneration=expected`、`needsReconciliation=false`、`autoReplay=false`；
  - `pendingCount`、`spool.counts.frozen`、`holdCount` 与实际数组一致；
  - hold／dispatching、active Task、领域 queued、pending Decision、delivery queued／unknown、reconciliation blocking、禁止 migration action 仍全部阻断。
- 报告新增 `mode`、`expectedFreezeGeneration`、`observedFreezeGeneration`、`drainRequired` 与 `counts.takeoverFrozenSpools`；`ready=true + drainRequired=true` 仅表示允许接管并必须按既有流程 drain，不表示全部消息已结算。
- 新增稳定 blocker codes：`handover_schema_unknown`、`handover_not_frozen`、`handover_generation_conflict`、`handover_generation_mismatch`、`handover_pending_not_frozen`、`handover_pending_generation_mismatch`、`handover_pending_needs_reconciliation`、`handover_pending_auto_replay`、`handover_status_inconsistent`。
- 未修改 `host-handover.mjs`、`host-operations.mjs`、P3.4 测试或迁移 planner。

### 新增测试

- entry 对当前 generation frozen spool 仍阻断。
- takeover 0 条与多条 frozen spool：`ready=true`；0 条 `drainRequired=false`，多条 `drainRequired=true` 且数量正确。
- takeover 下 active／queued／pending Decision／unknown／hold／禁止 migration action 仍分别阻断。
- 旧 generation、未冻结、generation 矛盾、state 非 frozen、needsReconciliation、autoReplay、未知 handover schema、计数不一致、结构缺字段与非法 expected generation 全部失败关闭。
- CLI 真实临时 SQLite（generation=6、两条 frozen spool）：entry 退出 3；`--takeover-freeze-generation 6` 退出 0、`ready=true`、`drainRequired=true`、数量 2；generation 5 退出 3；输出无 `PRIVATE_*` 正文；DB 哈希与 facts 不变、目录无额外文件。
- CLI 新参数缺值、0、负数、非整数、重复指定退出 2；活跃 WAL 在 entry 与 takeover 下均退出 2 且 DB／WAL／SHM 哈希不变。

### 自检结果

```text
node --check experiments/superagent-p0/production-handover-preflight.mjs
# 无输出，退出码 0

node --test tests/superagent-p4-production-handover.test.mjs \
  tests/superagent-p3-cutover.test.mjs \
  tests/superagent-p3-migration.test.mjs
# tests 32 / pass 32 / fail 0 / cancelled 0 / skipped 0 / todo 0

npm run verify
# Repository verification passed (5169 files).
# Active documentation check passed (8 files).

git diff --check
# 无输出，退出码 0
```

P4 单文件 18 项；P3.4 既有测试未改。未运行全量 gate，未触生产、未提交、未推送。

## 主 Agent 独立验收（2026-11-20，最终）

主 Agent 已完成只读审查、方案 A 独立测试、WAL 探针与全量门禁，并完成代码精确提交：

- 代码提交：`0a7643ea92253653cd389178fa1a758a16d24a69 feat: 增加 P4 入窗与接管门禁`，只含 preflight 工具、P4 测试与 Runbook；已提交、未推送。
- 方案 A 相关定向测试：**32 tests／32 pass／0 fail**；日志 `/Users/hoye/Documents/workspace/syno-p0-real-test/p4-takeover-targeted-tests.log`。
- 全量门禁：**960 tests／941 pass／19 skipped／0 fail／0 cancelled／0 todo**；Repository verification **5169 files**；Active documentation check **8 files**；`git diff --check` 通过；日志 `/Users/hoye/Documents/workspace/syno-p0-real-test/p4-takeover-full-gate.log`。
- WAL 原探针：退出码 2、stdout／ready 报告为空、主 DB／WAL／SHM 哈希完全不变；证据 `/Users/hoye/Documents/workspace/syno-p0-real-test/p4-takeover-wal-probe.json`。
- 综合证据：`/Users/hoye/Documents/workspace/syno-p0-real-test/p4-preflight-final-verification.json`（`ok=true`）。
- 本轮 4 份收尾文档（`NEXT-EXECUTION-PLAN.md`、`P0-VERIFICATION.md`、本文件、`BLOCKED.md`）待主 Agent 精确提交；未推送。

实际生产接管仍为 `not_authorized / not_performed`；上文的“未运行全量 gate”“未提交”等表述均为各轮历史快照，保留不改写。

## P4.2 只读证据采集器与独立验收器（2026-11-20）

本轮只新增 P4.2 窗口工具、隔离测试与文档；未执行生产切换，未提交、未推送。

### 修改文件（白名单 6 个）

- `experiments/superagent-p0/production-handover-preflight.mjs`：只把既有 `assertStaticDatabase` 加 `export`，逻辑、API、CLI、报告与退出码未变。
- 新增 `experiments/superagent-p0/production-handover-evidence.mjs`。
- 新增 `tests/superagent-p4-handover-evidence.test.mjs`。
- `docs/plans/superagent-p0/P4-PRODUCTION-HANDOVER-RUNBOOK.md`：新增第 11 节。
- 本文件与 `BLOCKED.md`。

### 实现

- `collect`：读取 expectation manifest + 静态 DB 副本；打开 SQLite 前复用 `assertStaticDatabase`，之后 `DatabaseSync(...,{readOnly:true})` + `openBusinessView`／`rows`；输出 DB SHA-256、全局脱敏计数、每条消息的 event／inbox／Task／Attempt／run／delivery／spool／reply 安全字段与 artifact hash；排他新建 evidence JSON；stdout 仅短摘要，不给 `ok`。
- `verify`：不信任 evidence 的任何 `ok`／`passed`，从安全原始事实子集重算：event／inbox 唯一已处理；domain 单 Task／Attempt／run／delivery；during 单 forwarded spool（generation、attempts=1、owner、needsReconciliation／autoReplay）；reply 单 accepted 且无 domain 链；before／after owner 不同；稳定 ID 不跨消息借用；takeover ready／mode／generation／N 对账；全局计数归零；artifact 存在且 hash 匹配。输出仅 `{schema,ok,blockers,counts}`。
- CLI 退出码：collect 成功 0；verify `ok=true` 0、`ok=false` 3；参数／读取／JSON／结构错误 2。所有 output 用 `wx`，父目录必须存在，禁止覆盖。
- 隐私：不输出 spool／reply 正文、消息正文、artifact 内容、Memory 值、候选动作、prompt 或 Secret；测试用 `PRIVATE_*` canary 验证。

### 隔离测试

- 完整 before reply + during domain + after reply 通过；多条 during／多对象独立通过。
- event／inbox／Task／Attempt／run／delivery／spool／reply 缺失、重复、状态、generation、attempts、owner、reconciliation、autoReplay、跨消息稳定 ID 等注入全部阻断。
- takeover 非 ready／entry／generation／N 少／N 多；最终 active、queued、Decision、unknown、pending、hold、reconciliation 分别阻断。
- artifact 缺失／目录冒充／hash 错误；expectation／evidence／takeover 缺字段、错误类型、未知 schema、坏 JSON；相对路径、重复参数、未知参数、output 覆盖。
- 活跃 WAL 与无 sidecar WAL：collect 退出 2，DB／WAL／SHM 哈希与目录不变，不生成 evidence。
- 完整 evidence、verify stdout／output 均不含 `PRIVATE_*`；同一输入重复采集／验收结果确定。
- 既有 P4 preflight 测试未改并继续通过。

### 真实自检

```text
node --check experiments/superagent-p0/production-handover-evidence.mjs
# 通过（日志 p42-opencode-check.log）

node --test tests/superagent-p4-handover-evidence.test.mjs \
  tests/superagent-p4-production-handover.test.mjs \
  tests/superagent-p3-cutover.test.mjs
# tests 40 / pass 40 / fail 0 / cancelled 0 / skipped 0 / todo 0

npm run verify
# Repository verification passed (5171 files).
# Active documentation check passed (8 files).

git diff --check
# 无输出，退出码 0
```

完整输出：`/Users/hoye/Documents/workspace/syno-p0-real-test/p42-opencode-check.log`、`p42-opencode-tests.log`、`p42-opencode-verify.log`、`p42-opencode-diff-check.log`。未运行全量 gate。

### 限制

- 工具只做静态副本上的采集与独立验收，不执行 freeze／unfreeze／recover／drain／claim／send，不验证进程锁／端口、Owner 绑定或真实已读。
- 静态副本、expectation manifest 与 takeover 报告由主 Agent 准备；本工具不猜测 message、generation、context、N 或 hash。
- 实际生产窗口仍未获 Owner 单独批准，生产接管 `not_authorized / not_performed`。

## P4.2 R1 返工（2026-11-20）：归属链与最终静态副本时序

主 Agent 独立反例 `/Users/hoye/Documents/workspace/syno-p0-real-test/p42-main-contract-probe.json` 复现以下错误通过：during／after 不同 owner、Task current_attempt 与 Attempt 不同、Task state 非 completed、inbox.messageId 属于另一条消息。R1 只修这些 P1，不扩功能。

### 修复

- during：forwarded spool owner 必须全部相同；缺失 owner 沿用 `spool_owner_instance_missing`，冲突新增 `spool_owner_instance_conflict`。
- after：同阶段多个 reply owner 必须唯一；冲突新增 `reply_owner_instance_conflict`。during 与 after 同时存在时两个新 Runtime owner 集合必须完全相同，否则 `runtime_owner_mismatch`；before owner 与 during／after 新 owner 重合时 `before_owner_instance_reused`，before 与 after 重合仍保留 `reply_owner_instance_same`。
- Task 必须 `state="completed"`（`task_not_completed`）；唯一 Attempt 必须 `attempt.id === task.attemptId`（`attempt_id_mismatch`）。
- inbox.messageId 必须等于当前消息（`inbox_message_mismatch`）；domain inbox 的 contextId／version 必须与 manifest 一致（`inbox_context_mismatch`）。
- takeover `drainRequired` 必须与 `counts.takeoverFrozenSpools > 0` 一致（`takeover_drain_flag_mismatch`）。
- 通过 fixture 改为真实时序：旧实例 `host-old` freeze／intake／before reply，新实例 `host-new` drain／unfreeze／after reply；during 与 after owner 均为 `host-new`，before 为 `host-old`。
- 新增反例：during≠after、during=before、多个 during owner 冲突、多个 after owner 冲突、Task 非 completed、Attempt ID 不匹配、inbox message／context／version 错误、drain flag 矛盾。
- Runbook 区分 `<TAKEOVER_STATIC_DB_COPY>`（第 4.3，仅 takeover preflight）与 `<FINAL_STATIC_DB_COPY>`（观察期后按第 3.8 方案重新制备）；最终 evidence 必须使用新副本，DB SHA 与 takeover 副本分开归档；观察期后 verify 失败按第 7 节停止／freeze、保留现场并进入对账，不为重跑验收重复 drain 或盲目重启。

### 自检结果

```text
node --check experiments/superagent-p0/production-handover-evidence.mjs
# 通过

node --test tests/superagent-p4-handover-evidence.test.mjs \
  tests/superagent-p4-production-handover.test.mjs \
  tests/superagent-p3-cutover.test.mjs
# tests 41 / pass 41 / fail 0 / cancelled 0 / skipped 0 / todo 0

npm run verify
# Repository verification passed (5171 files).
# Active documentation check passed (8 files).

git diff --check
# 无输出，退出码 0
```

R1 日志：`/Users/hoye/Documents/workspace/syno-p0-real-test/p42-r1-opencode-check.log`、`p42-r1-opencode-tests.log`、`p42-r1-opencode-verify.log`、`p42-r1-opencode-diff-check.log`。未运行全量 gate；未触生产、未提交、未推送。

## 主 Agent 最终独立验收（P4.2，2026-11-20）

主 Agent 已完成 R1 只读审查、独立反例、定向测试与全量门禁，并精确提交代码：

- 代码提交 `6a501001030c1d1f5b939eded5987ccea6636581 feat: 增加 P4.2 只读证据采集与独立验收`，只含 preflight 单行 export、新 evidence 工具、新测试与 Runbook；未推送。
- R1 定向：**41 tests／41 pass／0 fail／0 cancelled／0 skipped／0 todo**；日志 `/Users/hoye/Documents/workspace/syno-p0-real-test/p42-r1-main-targeted-tests.log`。
- 全量门禁：**972 tests／953 pass／19 skipped／0 fail／0 cancelled／0 todo**；Repository verification **5171 files**；Active documentation check **8 files**；日志 `/Users/hoye/Documents/workspace/syno-p0-real-test/p42-main-full-gate.log`。
- R1 前四个反例错误通过：`p42-main-contract-probe.json`；R1 后原反例全部阻断：`p42-r1-main-original-probe.json`；修正 owner 后有效基线通过、Task／Attempt／inbox 链仍独立阻断：`p42-r1-main-valid-owner-probe.json`。
- 机器摘要 `/Users/hoye/Documents/workspace/syno-p0-real-test/p42-final-verification.json` 为 `ok=true`。
- 当前 4 份收尾文档（`NEXT-EXECUTION-PLAN.md`、`P0-VERIFICATION.md`、本文件、`BLOCKED.md`）待主 Agent 精确提交；未推送。

实际生产接管仍未执行，保持 `not_authorized / not_performed`；上文的“未提交”等表述为各轮历史快照，保留不改写。

## P4 实际生产窗口：freeze 前阻断（2026-11-20）

- Owner 已明确批准：窗口从 `2026-11-20T04:56:31Z` 起 60 分钟；新 Runtime 接管后观察 30 分钟；采用 Runbook 第 7 节全部停止条件；回退由主 Agent 决策执行。
- 主 Agent 只读定位到旧生产仓库 `/Users/hoye/Documents/workspace/syno-personal-butler`、launchd `com.syno.butler.host`、launcher PID 46322、Host PID 46327；旧生产 HEAD 为 `53853fff5383e7791fdd379ace2e970c07051c0d`。未清理或修改其既有工作树。
- **阻断 1：旧生产没有 P4 freeze／handover spool 协议。** 旧 API 只有 disconnect 等控制，旧 adapter 用 pending／seen JSON 完成去重，不会在冻结时写 P4 spool。证据：`apps/syno/syno/server-api-allowlist.mjs:1-16`、`apps/syno/syno/runtime.mjs:1451-1455`、`packages/syno-core/feishu-channel.mjs:45-117,426-469`（均位于旧生产仓库）。
- **阻断 2：没有识别到 Runbook 所需的统一 SQLite 事实库、host-status 与 handover 状态。** 因此无法确认 `<PRODUCTION_DB>`，不能制备 takeover 静态副本或运行门禁；也未猜测 env 覆盖下的 lock／vault 路径。
- **阻断 3：真实客户端仍是隔离测试可执行文件。** `/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/real-feishu-client.mjs:9-61` 固定测试根、测试 App、测试凭据断言、测试状态与 DB，不能直接作为生产 Runtime 启动。
- 按 Runbook 第 3 节“任一项无法确认即停止”和第 4 节 freeze 优先，未执行 freeze、停止、复制、checkpoint、preflight、快照、启动、持锁、recover、drain、unfreeze、vault 写入、外部投递或回退；未开始观察期，未运行 P4.2 collect／verify。
- 2026-11-20T04:59:49Z 旧服务仍 loaded／running／healthOk，readiness 及 Store／Harness／Channels 均 ready，飞书 running／available／ownerBound 均为 true。未读取凭据或生产正文。
- 机器证据：`/Users/hoye/Documents/workspace/syno-p0-real-test/p4-production-window-20261120T045631Z/preflight-blocked.json`；说明：同目录 `README.md`。本轮结论为 `authorized / blocked_before_freeze / not_performed`，不是接管成功，也不是生产故障回退。
- 下一步必须先完成 P4.3 生产接线：旧入口的 freeze-capable 切换桥、真实生产配置／launcher、从旧 JSON／Markdown 安全事实生成新统一 DB 的迁移入口，并在隔离副本重跑完整 Runbook；不得在生产窗口内临时改代码或以 stop→freeze 绕过。

## P4.3 生产接线与隔离复演（2026-11-20，A/B/C/D 已验收）

本轮只补旧生产到新 Runtime 的切换入口，并在脱敏／合成的隔离副本完整复演；未执行生产窗口，未改生产 App／DB／vault／凭据。

### 提交（均未推送）

| 环节 | 提交 | 主题 | 文件数 |
|---|---|---|---|
| A | `b467f98a309311e1b3fb7f42b9aec79dcada66c4` | 配置化 P4.3 真实客户端生产入口 | 3 |
| B | `24a631e46f472f57535695d1bfca56c79f823ac1` | 接通 P4.3 旧 Host 冻结与回复证据 | 4 |
| C | `fc703543c694e4ea85ce58dd6f917b7950402dd9` | 实现 P4.3 旧安全事实迁移与防重 | 3 |
| D | `c276cfaeacc5f93279a062e4a5bc8f00ff1b008d` | 完成 P4.3 全链路隔离切换复演 | 2 |

### 实现要点

- **A**：新增 `real-feishu-config.mjs`，隔离测试与生产配置分离；生产必填 App／root／knowledge／localData／runtime，路径绝对、runtime 在 root 内、App 不得复用隔离测试 App；生产锁等于旧 adapter 的 `${stateFile}.lock`。
- **B**：新增 `legacy-production-handover.mjs`，默认关闭，仅 `production` + `SYNO_P4_LEGACY_HANDOVER=enabled` 启用；`SIGUSR1` freeze、`SIGUSR2` status；普通回复写旧 owner 的真实 event／inbox／reply；静态 `PATHS` 与 P0 localData／knowledge 必须同根，runtimeRoot 不强制统一；shutdown 固定 runtime → bridge → HTTP → host 租约；空库最小 rules 幂等初始化。
- **C**：新增 `production-source-migration.mjs`，`import`／`static-copy` CLI；spool ID 排除、pending 分类、已知 spool 在 unfreeze 后仍禁止 immediate、真实 adapter pending 恢复共享防重、before／after DB hash、源 hash 不变、`mapping_only`、vault／Owner 安全清单、非 WAL 副本；`host-handover.mjs` 增加已知 spool 优先。
- **D**：新增 `production-rehearsal.mjs` 与测试，完整串行 12 阶段并覆盖 5 个失败分支。

### 返工（保留，不掩盖）

- A：无 P0／P1 返工。
- B R1：初版旧 `PATHS` 与 P0 localData／knowledge 可能分裂，造成凭据、状态和锁分裂；增加启动前路径一致性门禁，localData／knowledge 必须一致，runtimeRoot 不强制一致。
- B R2：初版 before event／inbox 由测试手工补数，且空库 rules 一度由 fixture 预配置；改为旧桥自身 ingest／applyRoute 写安全历史，并由旧桥幂等初始化最小空 rules，删除测试替身。B 最终定向 **74/74**、全量 **0 失败**。
- C R1：初版 unfreeze 后已知 spool 的旧 pending 可能再次 immediate；在共享 `host-handover.intake` 根因处让已知 spool 永远优先 spooled／duplicate，并用真实 adapter 合成恢复覆盖 forwarded／frozen／hold／dispatching。另一项是 CLI before DB hash 事后补算；改为事务前显式 `databasePath` 计算 before、关闭后计算 after，不为制造差异 checkpoint。C 最终定向 **75/75**、全量 **0 失败**。
- D R0 P1：持久化 `host-status.json` 含合成 Owner ID，且测试漏扫 runtime 目录。R1 在旧桥停止状态校验后归档脱敏版本（保留 stopped／pending／generation），工具与测试递归扫描全部 JSON。R0 备份：`p43d-r0-backup/`。

### 主 Agent 独立验收

- A 全量 **985 tests／966 pass／19 skipped／0 fail**；B 定向 **74/74**、全量 **1005／986／19／0**；C 定向 **75/75**、全量 **1019／1000／19／0**；D R1 定向 **77/77**、全量 **1021／1002／19／0**；Repository verification **5179 files**、active docs **8 files**。日志绝对路径见 `/Users/hoye/Documents/workspace/syno-p0-real-test/p43-final-verification.json`，此处不复制大日志。
- 隔离复演证据根 `/Users/hoye/Documents/workspace/syno-p0-real-test/p43d-main-rehearsal-20261120-r1`：`rehearsal-summary.json` 为 `ok=true`、`synthetic=true`、`generation=1`；12 阶段全 `ok`，5 个失败分支全 `blocked`；drain forwarded=2／pending=0，queued remaining=0，rollback added=2／changed=0／deleted=0／externalEffects=0。
- P4.2 独立 verify：`ok=true`、blockers 空，messages=4、domain=2、reply=2、during=2、artifacts=5；报告 `p43d-r1-main-independent-verification.json`。
- 最终机器摘要 `/Users/hoye/Documents/workspace/syno-p0-real-test/p43-final-verification.json` 状态 `code_and_isolated_rehearsal_complete`；生产 `switched=false`、`newWindowApproved=false`。

### 本轮文档自检

- 仅改五份白名单文档；只运行 `npm run verify` 与 `git diff --check`，完整输出见 `/Users/hoye/Documents/workspace/syno-p0-real-test/p43-docs-opencode.log`。
- 未改代码／测试，未提交、未推送、未触生产、未启动 P5。

### 限制

- 复演为脱敏／合成输入，不构成生产授权，不证明生产已接管、真实消息已读、真实断电或 macOS 登录冷启动。
- 真实生产 before 证据必须来自旧桥真实 event／inbox／reply；不能用复演或测试 fixture 冒充。
- 新生产窗口仍需 Owner 明确批准；生产 freeze／停止／启动／回退只由主 Agent 执行。

## 真实窗口记录（2026-11-20T09:22:33Z）

- 带桥 Host 部署后飞书渠道正常，但 P0 vendor 缺少 DSH 构建产物，Harness degraded；旧安全清单只读实测 `activeWorkflows=2`，不满足显式零要求。剩余时间也不足以完成 30 分钟观察，故在 freeze 前阻断。
- 已恢复原 launchd 与旧 Host；最终 Store／Harness／Channels ready，飞书 running／available／ownerBound=true，P0 Host 进程为 0。
- 未 freeze、import、static-copy、启动新 Runtime、观察或 P4.2 验收；未推送，P5 未启动。完整证据：`/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T092233Z/incident.json`。

### 非生产 remediation

- 按既有 `TERMINAL_STAGES` 重新核验，23 条 Workflow 全终态，active=0；两个 `failed_terminal` 缺少 terminalAt 不代表活跃，未改生产事实。
- 同版本 DSH 离线构建成功，355 个 client artifacts；日志 `dsh-candidate-build-r2.log`。
- 五项安全清单全部显式为 0；264 个成功发布对象生成 792 条映射，完整 sourceVersion 哈希保留在 mapping.id，迁移表示 version=1。输入位于 `preparation-r3`，均通过现有 C 校验器。
- 汇总：`/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T092233Z/next-window-readiness.json`。尚未重启带桥 Host；下一窗口建议至少 90 分钟，仍需 Owner 明确批准。

## 真实接管窗口（2026-11-20T10:14:56Z，最终 P4.2 阻断）

- Owner 批准 90 分钟，截止 `2026-11-20T11:44:56.045Z`，接管后观察 30 分钟。证据根：`/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z`。
- 两条 before 起初因 DSH `MISSING_CREDENTIAL` 失败为 waiting_provider；`47dee92f119e702ce53e585637015727845fbfc2` 增加 `SYNO_SECRET_ENV_FILE`，36 项定向测试通过。`job_<redacted>` 与 `job_<redacted>` 随后均正常 completed；未读取、复制或输出密钥，失败历史未删除。
- 真实 freeze generation=1，during `om_<redacted>` 先只入 frozen spool。旧消费者退出后 import `ok=true`，dedupe_only=211、mapping_only=792；takeover preflight `ready=true`、`drainRequired=true`、`takeoverFrozenSpools=1`；814 个 vault 文件（其中 338 个 Markdown）哈希一致。
- 新 instance `<redacted-uuid>` 完成 recover→drain→unfreeze→ready，during forwarded=1、attempts=1、pending=0，Task／Attempt／run／delivery／artifact 完整；竞争实例 `FEISHU_PROCESS_LOCKED`。
- after `om_<redacted>` 普通回复 accepted，owner 与 during 相同。两条 before 的 event／inbox／accepted reply 均属旧 owner。`observation-complete.json` 为 `ok=true`、`observedMinutes=30`，无 unknown／hold／双消费者；accepted 不代表已读。
- 观察后新 Runtime 正常停止并 freeze generation=2，final 静态副本 SHA-256=`9d070fe465c9937e052c8bf940049875c12642db5eda5a5efd2983a44e45a763`。P4.2 collect 成功，但 `verification.json` 为 **`ok=false`**，仅 `event_missing=1`、`inbox_missing=1`：after 有 accepted reply，却没有 event／inbox。故 P4 未验收完成。
- 未修改 expectation、未补写生产事实、未重跑 drain、未恢复服务；launchd 当前 not running。失败汇总为 `final-blocked.json`。下一 Agent 必须先按 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/P4-PRODUCTION-HANDOFF-20261120.md` 写红灯测试、最小修复共享普通回复路径并隔离验收，再申请新的 Owner 生产窗口；不得复用本轮 after 冒充修复证据。未推送，P5 未启动。

## P4.2 普通回复 event／inbox 修复（2026-11-21，隔离通过，生产已通过）

- 提交 `fcac7c3f0 fix: 补齐普通回复的 event/inbox 证据链`，只含 `experiments/superagent-p0/host-handover.mjs`、`experiments/superagent-p0/real-feishu-client.mjs`、`experiments/superagent-p0/production-rehearsal.mjs` 与新增 `tests/superagent-p4-reply-evidence.test.mjs`；未推送。
- 修复：`host-handover.mjs` 新增 `recordReplyEvidence`／`sendOrdinaryReply`；普通回复在 `sendReply` 前写保留源 `legacy-handover` 的 event + processed inbox，复用 `route:legacy-reply:<appId,messageId>` 幂等 route；已有成对证据时 no-op，证据不完整时失败关闭，不创建 Task／Attempt／delivery。`dispatchMessage` 改用 `sendOrdinaryReply`。
- 红灯测试：修复前因无 `sendOrdinaryReply`／无 event、inbox 失败；修复后断言 delivery 前 event=1、processed inbox=1，重复回复不重复投递，已有 event／inbox 不重复写入，普通回复无 domain 链。
- P4.3 隔离复演：删除 after 手工补 event／inbox 的 fixture，改走同一 `sendOrdinaryReply`。证据根 `/Users/hoye/Documents/workspace/syno-p0-real-test/p4-reply-evidence-fix-20261121-r1`：12 阶段全 ok、5 个失败分支全 blocked；`final/verification.json` 为 `ok=true`、blockers 空，after event=1、inbox=1、accepted reply=1。
- 定向测试 61/61；全量 `npm run gate` 通过：1024 tests／1005 pass／19 skipped／0 fail；Repository 5181 files、active docs 8；日志 `.../p4-reply-evidence-fix-20261121-r1/final-full-gate.log`。
- 隔离阶段结束时生产未启动、未恢复、未重跑真实 after；launchd 仍 not running。随后 2026-11-21 生产修复窗口已通过，见下。

## P4.2 生产修复窗口（2026-11-21，通过，服务已恢复）

- 窗口 `2026-11-20T16:36:28Z` 至 `2026-11-20T18:06:28Z`，证据根 `/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-repair-window-20261120T163628Z`。
- 窗口前 takeover：`ready=true`、`mode=takeover`、`generation=2`、0 个 frozen spool、无 blockers。
- 新 after `om_<redacted>`，文本 `P4-REPAIR-AFTER-20261121-0040`，由 Owner 授权、通过 bsk 从已登录飞书账号发送；旧 before 1／2 复用，旧 during／domain 证据仍来自首次窗口。
- 新 Runtime PID `77904`、instance `<redacted-uuid>`；30 分钟观察 `ok=true`、`observedMinutes=30`、failures 空。
- 停止后 freeze generation=3；final 静态副本 `final-static.db` SHA-256 `f00b7b995815190ee77d9f9f69a6ac9ac5b5455eda606209b21532e7d537f72c`，非 WAL、integrity ok、无 sidecar。
- P4.2 `verify.ok=true`、blockers 空：messages=3、replyMessages=3、duringMessages=0、artifacts=0；after event=1、inbox=1、accepted reply=1。
- 服务已恢复：PID `85264`、instance `<redacted-uuid>`、generation=3；launchd `active count=1 / state=running`，adapter running／available／ownerBound=true。
- 未推送，P5 未启动；断电／冷启动、accepted≠已读、多批 >100 frozen drain 等非阻断限制仍适用。
