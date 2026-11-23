# Syno 当前架构

> 架构基线：2026-11-23。当前生产是 macOS 上的 P3 native Host，日常入口只有已绑定 Owner 的飞书私聊。DSH 运行时、旧 8888 服务与 DSH 插件已经退役；旧文档只用于历史追溯，不是当前架构契约。

## 1. 设计目标与边界

Syno 对 Owner 只呈现一个管家。管家负责理解请求、选择领域、绑定对象、保存事实、调度 Worker、复核结果并回执；Owner 不管理 Worker 进程、Session 或内部任务。

核心约束：

- **Butler Runtime 是唯一业务事实源。** Worker、模型 CLI、插件和飞书返回都不是第二套业务账本。
- **三层路由。** Root Router 选择领域，Domain Specialist 执行业务规则，Object Context 隔离每篇文章、想法、项目或记忆对象。
- **Worker 可替换。** Pi 与 OpenCode Go 是受控执行器，不是主 Runtime，不持有业务最终状态。
- **结果必须复核。** Worker 自报成功只结算 Attempt；候选结果经 Result Lane 和 Host 独立校验后，才能结算业务 Task。
- **外部效果按不确定性处理。** 至少一次执行不等于外部副作用只发生一次；未知发送结果先对账，禁止盲目重发。
- **本地知识仓保留。** `vault/` 保存长期知识，`ops/` 保存任务、事件与审计资料；运行数据库和凭据不进入公开代码提交。
- **不隐式扩大权限。** 产品运行时不能修改源码、执行通用终端或控制系统；开发、部署与重启属于独立授权流程。

## 2. 总体结构

```text
Owner
  │
  ▼
Feishu Adapter（Owner 绑定、消息接收、回复发送）
  │
  ▼
P3 native Host / Butler Runtime
  ├── Inbox、幂等与 Handover freeze/spool
  ├── Root Router
  │     ├── Capture Specialist
  │     ├── Knowledge Specialist
  │     ├── Idea Specialist
  │     ├── Project Specialist
  │     └── Memory Specialist
  ├── Object Context、Decision Lane
  ├── Task / Attempt / Candidate / Result Lane
  ├── Delivery Lane
  ├── P5 信息雷达与插件注册表
  └── SQLite 统一业务事实日志
          │
          ├── Pi / OpenCode Go Worker（受控模型执行）
          ├── 本地 vault / ops（知识与审计）
          └── Feishu Wiki / 消息（经核验的外部效果）
```

生产入口是 `experiments/superagent-p0/real-feishu-client.mjs`。P3 组合根位于 `experiments/superagent-p0/native-butler-runtime.mjs`；它打开统一数据库、配置路由规则、创建五个 Specialist，并接入手交与运维状态。

## 3. 路由与对象隔离

### 3.1 Root Router

Root Router 只做确定性分流，不让模型自行选择 Provider、Worker 或业务事实目标。请求可进入：

- `capture`：公开资料收录；
- `knowledge`：围绕明确对象的知识查询；
- `idea`：想法候选与后续处理；
- `project`：项目对象与步骤；
- `memory`：记忆候选、确认、纠正和遗忘；
- P5 雷达命令：由 Host 直接识别并转交雷达模块；
- 普通回复：记录必要证据，不伪造业务 Task。

多个对象都能匹配时，Host 创建 `route.select` Decision 并返回候选，不擅自挑选。Decision 绑定 Owner、来源消息、候选对象和预期版本，只能由后续真实 Owner 消息一次性消费。 queued 消息不提前推进 Object Context。

### 3.2 Domain Specialist

Specialist 负责一个领域的业务不变量，包括对象定位、版本检查、任务创建、候选验收和事实写入。它可以调用 Worker 生成候选，但不能把 Worker 的 `done` 直接当成业务完成。

### 3.3 Object Context

Context 以具体业务对象为边界。不同文章、想法、项目和记忆对象不得共用正文、Session、Task、Attempt、结果或通知。同一对象的操作按 lane 串行；不同对象可以并行，但仍共享同一事实日志与全局安全约束。

## 4. 业务事实与执行闭环

### 4.1 主链路

```text
event → inbox/context → task → attempt → candidate
      → Result Lane 独立复核 → task completed → delivery
```

- **Event / Inbox**：保存来源消息与处理幂等证据。
- **Context**：保存对象身份与版本，防止把结果写到另一对象或旧版本。
- **Task**：表达 Owner 可见的业务目标，只有 Host 能结算。
- **Attempt**：表达一次具体执行尝试；失败、超时或 Worker 完成只影响 Attempt。
- **Candidate**：Worker 产出的待验收结果，不直接成为最终事实。
- **Result Lane**：校验对象、版本、引用、内容哈希及领域约束，再提交业务结果。
- **Delivery**：保存待发送回复及其状态，和模型执行解耦。

### 4.2 SQLite 与本地文件

P3 Host 使用 `node:sqlite` 打开统一业务数据库，并启用 WAL、`synchronous=FULL` 和忙等待。数据库保存 Event、Inbox、Context、Task、Attempt、Candidate、Decision、Delivery、Handover 与状态证据。

`vault/` 与 `ops/` 仍是长期知识和审计资料的重要组成；SQLite 不替代本地 Markdown vault。数据库快照、静态副本和发布状态必须分别核验，不能凭单个文件存在就认定业务闭环完成。

### 4.3 Delivery 与未知结果

Delivery 发送前必须原子 claim。普通飞书发送按 `at_least_once` 语义处理：

- 明确的提供方接受结果可记为 `accepted`；它不代表 Owner 已读。
- 没有稳定提供方消息 ID 时，`provider_message_id=null`。
- 进程在 `dispatching`／`sending` 阶段崩溃，或发送结果无法确定时，状态保持 `unknown`、`may_send=false`。
- `unknown` 必须人工或只读对账，不能自动重发制造重复消息。

## 5. Handover 与恢复

Host 的冻结、排空和接管由统一事实日志协调。冻结期间，新消息先原子写入持久 spool；只有新 Runtime 明确接管并取得转发回执后，条目才能进入 `forwarded`。`dispatching` 崩溃条目进入 hold，不能假定没有发生外部效果。

生产接管顺序为：

```text
freeze → 旧消费者退出 → 安全事实导入 → 静态一致 DB 副本
→ takeover preflight → 数据快照 → 唯一新 Runtime 持锁
→ recover → drain frozen → unfreeze → ready → 领域 queued drain
```

关键边界：

- takeover 必须显式指定正整数 freeze generation；
- before 属于旧 Runtime，during drain 与 after 必须属于同一个新 Runtime；
- SQLite 静态副本必须无活跃写者、无 sidecar，且文件头不是 WAL；`readOnly:true` 本身不足以保证不修改 `-shm`；
- launchd 状态不能替代实际进程退出检查；任何时候只允许一个真实消费者处理生产消息。

P4 旧 Task、Workflow 与 Session 只读归档，不因接管而恢复执行。

## 6. Worker 与模型边界

当前 Specialist／Worker 模型固定为 `opencode-go/deepseek-v4.1-flash`。Pi 1.5.2 通过仓库内固定依赖加载；OpenCode 通过既有受控客户端使用 Go 订阅。二者都只是可替换 Worker。

Worker 不得：

- 自行选择 Provider 或切换模型；
- 读取生产凭据、私有 Memory 值或无关 vault 正文；
- 直接操作生产数据库、发布目标或 launchd；
- 以自身 Session 状态覆盖 Host 的 Task／Attempt 事实；
- 把“请求返回 OK”冒充订阅扣费、业务写入或外部投递已核验。

真实 vault 正文发送给外部模型需要单独确认。普通测试不得使用生产 App、生产数据库或生产 Inbox／Outbox。

## 7. P5 信息雷达与插件

P5 是 Host 内的信息雷达模块，契约名为 `syno.p5-radar/1`。它负责采集、候选评分、偏好与反馈、日报 AST 及 Wiki 正文生成；飞书聊天只返回短链接和简短状态。

默认每日展示 50 条，其中 25 条偏好优先、8 条圈外探索、17 条其余；未展示条目仍保留在库。当前确定性命令包括 `雷达`、`雷达状态`、`雷达设置 N`、`偏好：...`、`跟进 N`、`忽略 N` 和 `雷达帮助`。

插件发布采用不可变版本快照与 active 注册表：

```text
候选版本 → canary 真实渲染与校验 → approve → active
                                      └→ rollback 到保留版本
```

canary 通过不等于已批准，active 切换不等于 Host 已重启。插件失败时的兼容回退只负责维持既有能力，不得绕过结果校验或伪造新版本验收。

## 8. 部署架构

当前生产由 macOS launchd 管理，代码与运行数据分离：

- 代码：`/Users/hoye/Documents/workspace/syno-personal-butler-prod`；
- 运行数据：`/Users/hoye/Documents/workspace/syno-personal-butler/.local-data`；
- 运行时状态：`/Users/hoye/Documents/workspace/syno-personal-butler/.runtime-p0`；
- 服务：`com.syno.butler.host`。

仓库已具备固定 Node 24.21.0、pnpm 12.11.2、冻结锁文件、CI gate 和不可变 release／current 切换工具。release 制备、current 激活与 Host 重启是三个独立动作；工具的存在不表示生产已经切换到该布局。实际启用状态见 `docs/OPERATIONS.md` 与 `NEXT_SESSION.md`。

## 9. 验证原则

- 单元与集成测试证明代码路径，不自动证明真实生产效果。
- 真实验收必须保留消息 ID、Task／Attempt、Result Lane、Delivery 与外部状态的脱敏证据。
- 观察期后的最终验收必须使用重新制备的 final 静态副本，不能复用观察前数据库。
- 测试失败、证据缺失或结果未知时保持阻断，不修改 expectation、不补写生产事实来制造通过。
- 历史 DSH、Windows、3088／8888 和旧 Harness 记录只用于追溯；当前运行与排障以 P3 native Host 为准。
