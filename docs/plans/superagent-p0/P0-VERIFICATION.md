# Super Agent P0：事务原型与内核决策

> 公开版脱敏说明：真实 Feishu 消息／实例／Job／文档 ID 已替换为占位符；完整证据保留在本地。

- 日期：2026-11-18。
- 实施方案：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/PLAN.md`。
- autoloop 固定基线：`1b89219558a493d701cb20e2c3b1876576709889`。
- 原型 worktree：`/Users/hoye/Documents/workspace/syno-autoloop-p0`，分支 `syno/p0-transaction-prototype`。
- 本报告保留 P0 的确定性验证与路线判断；独立测试 App、真实 Worker 与测试 vault 的历史证据见第 8、11、12 节，OpenCode 与 P1 原生 Runtime 证据见第 13 节，均不代表正式 vault 或生产切换已验收。
- 最新状态：**2026-11-20T10:14:56Z 窗口已真实接管并完成 30 分钟观察，但最终 P4.2 因 after 缺 event／inbox 而未通过；新 Runtime 已 freeze generation=2 并停止，服务未恢复。** 详见第 27 节；此前各节的“生产未执行”均为当时历史快照。

## 1. 实际部署与能力基线

实际服务从 `/Users/hoye/Documents/workspace/syno-personal-butler` 启动，部署 HEAD 为 `53853fff5383e7791fdd379ace2e970c07051c0d`，不是旧源码审查基线 `e24b91f`。LaunchAgent、Host、DSH chat 的进程和 cwd 已只读核对，Store／Harness／Channels ready，飞书运行且已绑定 Owner。

详细证据：

- `/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/DEPLOYMENT-INVENTORY.md`
- `/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/CAPABILITY-MATRIX.md`

能力矩阵以当时的 26 个业务工具和实际用户工作流为准，源码存在、当前启用和真实端到端验收分开记录。**2026-11-19 Owner 已取消旧能力等价要求**；后续 P4 只核验新架构已启用领域，旧矩阵仅作历史与数据边界参考。

## 2. 既有无费用回归复跑

由独立 subagent 在 `/Users/hoye/Documents/workspace/butler-superagent` 依次执行：

```sh
npm --prefix /Users/hoye/Documents/workspace/butler-superagent run test:v0
npm --prefix /Users/hoye/Documents/workspace/butler-superagent run test:v1
npm --prefix /Users/hoye/Documents/workspace/butler-superagent run test:v2
npm --prefix /Users/hoye/Documents/workspace/butler-superagent run test:v3
npm --prefix /Users/hoye/Documents/workspace/butler-superagent run test:v4
```

结果分别为 5/5、12/12、12/12、1/1、11/11，合计 **41/41，退出码均为 0，无失败、无跳过**。这些测试使用假 CLI、模拟飞书 transport、副本或合成数据，不替代真实模型、真实飞书、公网收录和正式 vault 验收。

## 3. 最小事务原型

原型文件：

- `/Users/hoye/Documents/workspace/syno-autoloop-p0/examples/syno-p0/commands.ts`
- `/Users/hoye/Documents/workspace/syno-autoloop-p0/tests/syno-p0-prototype.test.ts`
- `/Users/hoye/Documents/workspace/syno-autoloop-p0/kernel/evolve.ts`
- `/Users/hoye/Documents/workspace/syno-autoloop-p0/sim/invariants.ts`

实现方式是在通用投影中增加一个 `records` 集合，业务命令位于内核外。`ApplyRoute` 与 `FinalizeTask` 都调用原有 `commitLatest`，对象版本检查、当前 Attempt 检查、验收记录、业务终态和 Outbox 在同一事实日志与 SQLite 事务中提交。没有第二状态库，没有修改 `decide`、通用调度、租约、原生 Worker 回执或重放规则。

`records` 只是 P0 的通用文档投影，不是最终数据模型。P1 必须继续证明它与原生 run、真实进程身份和 Result Lane 的接线，不能把本原型直接当生产 Runtime。

## 4. 原型行为证据

执行：

```sh
node --disable-warning=ExperimentalWarning --test /Users/hoye/Documents/workspace/syno-autoloop-p0/tests/syno-p0-prototype.test.ts
```

当前 **16/16 通过**，覆盖：

1. 两个路由提议使用同一对象旧版本时只有一个生效。
2. 提交后响应丢失，重复命令返回原回执，事实日志条数不增加。
3. 同一应用的入站消息换命令 ID 仍只路由一次；不同应用的相同消息 ID 不互相吞掉，含冒号的二元组也不会碰撞；同一命令 ID 携带不同内容被拒绝。
4. 晚到 Attempt 不结算 Task，也不创建 Outbox。
5. Worker `done` 只结束 Attempt，不能改变 Task 或创建 Outbox。
6. 业务终态与 Outbox 同事务提交；重复结算不能把已接受投递重置为 queued。
7. 投影写入失败时，Task、Outbox 和追加的事实日志一起回滚。
8. 真实子进程在提交后、响应前退出，重放仍只有一个事实和一条逻辑投递。
9. 投影重建和格式指纹升级后，业务记录从事实日志完整重放。
10. 取消已请求后，晚到成功不能完成任务或发送成功通知；迟到取消也不能把已完成 Task 倒退。
11. 验收期望值只来自 Task 的可信验收规范；质量分为 100 但路径、哈希或远端版本错误时，仍无成功终态或通知。
12. 飞书发出后本地回执丢失保持 `unknown/may_send=false`，只读对账后沿用同一逻辑投递。
13. 已接受投递不会被迟到 unknown 倒退；相同平台回执幂等，不同平台编号冲突会被拒绝。

SQLite 事务只覆盖事实日志、投影和 Outbox 记录；vault、Git、飞书及其他外部效果仍需各自提交证据与对账，本原型没有宣称跨系统原子性。

## 5. 上游回归与静态检查

执行：

```sh
npm --prefix /Users/hoye/Documents/workspace/syno-autoloop-p0 test
npm --prefix /Users/hoye/Documents/workspace/syno-autoloop-p0 run typecheck
npm --prefix /Users/hoye/Documents/workspace/syno-autoloop-p0 run format:check
```

结果：**830 项，809 通过、0 失败、21 个平台专属跳过**；类型检查与全仓 Prettier 检查通过。首次全量运行曾因独立重放校验器未认识空 `records` 集合而失败；补齐该校验器后重跑通过，没有修改测试预期来掩盖业务失败。

另执行 `npm --prefix /Users/hoye/Documents/workspace/syno-autoloop-p0 run test:nightly`，深度测试 **2/2 通过**，随后基准脚本正常结束，命令退出码为 0。

新 worktree 未安装依赖；为保持固定基线，只链接了原固定提交工作树已有的 `node_modules` 用于本地检查，没有执行 `npm install` 或访问外部包服务。

## 6. 离线启动与隔离预检

新增：

- `/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/preflight.mjs`
- `/Users/hoye/Documents/workspace/syno-personal-butler-p0/tests/superagent-p0-preflight.test.mjs`

执行 `node --test /Users/hoye/Documents/workspace/syno-personal-butler-p0/tests/superagent-p0-preflight.test.mjs`，**4/4 通过**：生产 App ID／发布目标／数据库／Inbox／Outbox 路径在抢锁和连接前阻断；订阅锁失败不建立连接；只接受白名单测试 Chat 并在关闭时释放租约；Worker 探针框架拒绝“所有动作都允许”的假边界，并要求三项实际拒绝和两项正向路径。

这些测试全部使用合成配置与假执行器，只证明预检框架行为，不能单独证明真实连接或 OS 隔离；对应真实证据另见第 8、11、12 节。

`npm --prefix /Users/hoye/Documents/workspace/syno-personal-butler-p0 run verify` 通过：Repository verification 5117 files，active docs 8 files。

另尝试 `npm --prefix /Users/hoye/Documents/workspace/syno-personal-butler-p0 test`。首次因新 worktree 没有 npm 依赖而失败；链接相同 HEAD 部署目录的现有 `node_modules` 后，结果为 **848 项，680 通过、149 失败、19 跳过**。失败中大量出现缺少 `vendor/deepseek-harness/.../flock.js`，说明新 worktree 没有完整 DSH 子模块内容；还可能包含其他未逐项分类的环境失败。因此这次全仓运行**不是有效业务回归基线**，不据此宣称 Syno 全仓通过，也不把 149 项都归因于单一根因。P0 新增预检的独立 4/4 和仓库 verify 是本轮有效证据。

## 7. P0 路线决策

**建议 P1 继续复用 autoloop 内核，采用“固定上游内核 + 小范围通用 records 投影 + 内核外业务命令”的路线。**

理由：两条业务命令已在同一账本表达，没有第二状态库，没有反复翻译原生结算，也没有改写调度、租约或重放。实际补丁范围限于通用集合注册、独立重放校验器登记和内核外业务命令。

该结论可被 P1 以下证据推翻：必须为当前 Attempt 另建第二权限状态；无法在不绕过原生结算的情况下连接 Result Lane；旧进程或取消竞态仍需修改通用调度；升级重放不能保持既有事实。出现这些情况时停止复用，按同一行为契约切换到单进程 SQLite Runtime。

## 8. 真实基线与阻断条件状态

| 项目 | 当前状态 | 下一步证据 |
|---|---|---|
| 独立飞书测试应用、账号和 Chat 范围 | 独立应用 `1.0.0` 已发布；Secret 经本机隐藏输入进入既有加密 Store；真实 Chat 白名单与 Owner 绑定通过 | 保留独立 App 与测试状态，不接生产消费者 |
| 飞书真实连接 | 固定收发、白名单负路径及真实模型收录通知均通过；本地持久化重放去重探针通过 | 平台主动重复投递未复现，不能宣称 exactly-once |
| Worker OS／受限账户边界 | 限定 macOS `sandbox-exec` 探针通过；独立 OS 账户未验收 | 范围外文件、哨兵凭据和未批准网络均已实际拒绝；仍需更完整默认拒绝文件 profile／受限账户 |
| Worker 正向路径 | 对象输入、Attempt 输出、宿主重读及经回环代理的真实模型路径通过 | 当前对象输入可读、Attempt 输出可写、允许的模型调用成功、宿主可重读产物 |
| 公开文章真实付费收录基线 | 本地收录及“真实飞书消息 → 沙箱 Worker → 测试 vault → Result Lane → 飞书通知”均通过 | 使用已核验公开快照，不是现场联网抓取；Task／Attempt 仍不是原生 autoloop run |
| 正式 vault、生产发布目标与生产切换 | 未触碰 | 分别走后续授权及 P3/P4 门槛 |

真实独立测试闭环已达成，但平台重复投递、完整受限账户、原生 run 与生产接管仍是后续门槛，不能由本轮结果替代。

## 9. 本轮未执行

未安装或运行 Orca；未启动第二生产消费者，只运行了独立测试 App 的唯一客户端，并在实测后停止；未写正式 vault；未重启、停止或切换生产服务；未推送远端。真实模型调用只发生在独立实验和测试 vault，不读取或导出任何凭据。所有开发均在独立 worktree，原部署工作树中的运行数据未修改、暂存或清理。

## 10. 独立审查与已知限制

第一位独立审查 Agent 在原型检查点 `0377879` 上发现 1 项 P0 和 3 项 P1：验收期望值可由调用方自填、迟到取消倒退终态、入站键缺 App 维度、已接受投递可被迟到回执覆盖。第一轮修复保存为 `9ce230b`；第二轮复核又发现 App+message 冒号拼接碰撞，最终修复为 `93602a3`。同一审查 Agent 复跑 16/16 并确认限定范围内**无剩余 P0/P1**，未触发无法收敛护栏。

审查还指出两个不能由本原型单独证明的边界：

- `recordVerification` 是宿主 Result Lane 的进程内接口，真实部署仍须保证 Worker 进程没有数据库或宿主能力；实际文件／Git／远端读取及进程权限属于 P1。
- 原型默认使用 `syno-p0-v1` 格式指纹；与主中台共用数据库时，P1 必须传入宿主同一个格式指纹，避免业务命令和中台命令交替触发全量重放。这是已知 P2 可用性事项，不影响本轮重放正确性结论。

## 11. 真实 Worker 与公开文章基线（2026-11-19）

### 独立飞书应用

已通过 bsk 在开发者后台创建 `Syno SuperAgent P0 实测`，App ID 为 `cli_<redacted>`，添加机器人能力并开通 `im:message` 与单聊事件必需的 `im:message.p2p_msg:readonly`。版本 `1.0.0` 已免审发布，外部共享未开启。Secret 由用户在本机隐藏输入框填写，经既有 `FeishuCredentialStore` 加密保存；没有读取、显示、经聊天传输或提交 Secret。真实客户端、事件、Chat 白名单与通知证据见第 12 节。生产 App／Secret 不能配给新应用；连同生产 App ID 一起复用会形成竞争生产事件的第二消费者，本轮明确未做。

### 实际 OS 与模型路径

新增 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/real-worker-probe.mjs`。它使用 macOS `sandbox-exec`、独立 Attempt cwd/Home、白名单环境和回环固定模型代理。每次真实调用前均执行五项探针：

- `outside_file=denied`（退出 1）、`sentinel_credential=denied`（退出 1）、`unapproved_network=denied`（curl 退出 6）。
- `object_input=allowed`、`attempt_output=allowed`，宿主随后独立重读 Attempt 产物并逐字核对。
- 另显式拒绝读取用户配置、OpenCode 本地数据、Claude 数据、Keychains 和生产部署目录；写入只允许 Attempt 目录，公网只允许回环模型代理。

这证明上述路径上的真实 OS 拒绝，不是提示词或假执行器。当前 profile 仍允许读取未列入拒绝集合的其他文件，也未创建独立 OS 账户，因此不能宣称完整受限账户或全面默认拒绝文件边界已通过。

模型代理由宿主运行 Claude Code `2.1.325`，Worker 沙箱只访问 loopback；Claude 使用 `-p --tools "" --no-session-persistence --permission-prompts none`，凭据由既有 CLI 内部使用。简单 `OK` 探针通过，耗时 2751ms，模型为 `anthropic/claude-haiku-5-5`，CLI 回报费用 0.00019792 美元。两次直接 CLI／Node spawn 对照也成功，回报费用分别为 0.00030936、0.00019352 美元；连同下方收录，本轮有明确回执的费用合计 0.00235 美元。没有核验任何订阅控制台的实际扣费渠道。

早期 OpenCode／Claude 回环代理三次超时是测试程序的 `spawnSync` 阻塞同一进程内 HTTP 代理事件循环所致；代理无法处理请求，不是模型服务错误。改为异步等待后通过。失败记录不冒充成功，也不据此评估模型稳定性。

### 公开文章收录

公开来源为 `https://www.anthropic.com/engineering/claude-code-best-practices`，实际跳转到 `https://code.claude.com/docs/en/best-practices`。直抓网络超时后，使用 bsk 后台浏览器提取 `main` 正文，没有登录、绕过验证或读取私有内容。正文快照为 `/Users/hoye/Documents/workspace/syno-p0-real-test/public-article.txt`。

实际命令：

```sh
node /Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/real-worker-probe.mjs \
  --capture /Users/hoye/Documents/workspace/syno-p0-real-test/public-article.txt
```

结果：五项 OS 探针再次通过；真实模型生成中文摘要与 5 个要点，宿主 Result Lane 校验 JSON 结构、来源相关性、原文 SHA-256，并在写入后重读最终 Markdown。证据为 `/Users/hoye/Documents/workspace/syno-p0-real-test/real-capture-evidence.json`：

- 合成消息 ID：`local-browser-public-5dea25a3c4c605c6`；不是飞书消息 ID。
- Task／Attempt：`task-capture-5dea25a3c4c605c69c5a1be9`／`attempt-37697`；是实验标识，不是原生 autoloop run。
- 产物：`/Users/hoye/Documents/workspace/syno-p0-real-test/vault/02-Resources/capture-5dea25a3c4c605c69c5a1be9.md`。
- 原文 SHA-256：`5dea25a3c4c605c69c5a1be911fbe99102406f6ac02742ddc848ba9805767448`；最终文件 SHA-256：`a856d1581022d88dab3131bec784720c8553c32fda369478e867388299e62e83`。
- 耗时 15179ms；输入 12197 Token、输出 859 Token，无缓存读取；CLI 回报费用 0.0016492 美元。
- 回执仅为本地复核通过，没有发送飞书通知，不代表用户已读。

复跑离线预检 **4/4** 和 `npm --prefix /Users/hoye/Documents/workspace/syno-personal-butler-p0 run verify` 均通过（Repository 5118 files，active docs 8 files）。本小节只记录使用合成消息 ID 的本地收录基线；真实飞书闭环见第 12 节。两轮都未接原生 run，也未达到完整 P1 或生产接管条件。

## 12. 真实飞书固定收发与模型收录闭环（2026-11-19）

真实客户端为 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/real-feishu-client.mjs`，只连接独立测试 App，使用独立 Inbox、状态库和 `/Users/hoye/Documents/workspace/syno-p0-real-test/vault`。汇总证据为 `/Users/hoye/Documents/workspace/syno-p0-real-test/real-feishu-evidence.json`。

### 固定收发、白名单与去重

- `P0-REAL-001`、`P0-REAL-002` 已在浏览器发送，但没有事件或回复；事件权限页证明缺少 `im:message.p2p_msg:readonly`。单纯重连未修复，也未盲目补发或伪造回执。
- 开通该免审权限并重连后，`P0-REAL-003` 的真实消息 ID 为 `om_<redacted>`，Chat 为 `oc_<redacted>`，Owner 为 `ou_<redacted>`；事件只落盘一次，飞书实际显示“本次未调用模型”的固定回复。
- `P0-REAL-004` 期间临时把白名单指向哨兵 Chat，真实消息 `om_<redacted>` 被回复“非白名单测试 Chat，未处理”，固定事件文件没有新增；随后恢复真实白名单。
- 对 `P0-REAL-003` 做本地持久化 `reserve` 重放，第二次接受结果为 `false`。这是本地去重探针，不是飞书平台主动重复推送的复现。
- 视觉证据保留在 `/Users/hoye/Documents/workspace/syno-p0-real-test/feishu-p0-real-003.png` 和 `/Users/hoye/Documents/workspace/syno-p0-real-test/feishu-p0-real-004-rejected.png`，含会话侧栏，不提交仓库。

### 公开文章真实模型闭环

向独立测试机器人发送精确 URL `https://code.claude.com/docs/en/best-practices`，客户端使用此前已核验的公开浏览器快照，没有现场联网抓取。链路为“真实飞书消息 → 沙箱 Worker → 独立测试 vault → Result Lane → 通知前独立重读 → 飞书通知”。

- 真实消息 ID：`om_<redacted>`。
- Task／Attempt：`task-capture-5dea25a3c4c605c69c5a1be9-om_<redacted>`／`attempt-28641`；仍只是实验标识，不是原生 autoloop run。
- 产物：`/Users/hoye/Documents/workspace/syno-p0-real-test/vault/02-Resources/capture-5dea25a3c4c605c69c5a1be9-om_<redacted>.md`。
- 原文 SHA-256：`5dea25a3c4c605c69c5a1be911fbe99102406f6ac02742ddc848ba9805767448`；产物 SHA-256：`4194d2953ee0418b13bbb9e3715ecee781a9385b312a131fcdc82691e535074e`。
- Claude Code `2.1.325`，模型 `anthropic/claude-haiku-5-5`；耗时 21051ms，输入 12195 Token、输出 642 Token，CLI 回报费用 0.0015405 美元。没有核验订阅控制台实际扣费渠道。
- 五项真实 OS 探针再次全部符合预期。Result Lane 校验通过后，客户端在通知前重新读取产物并重算哈希；随后另一次独立命令再次验证原文哈希、产物哈希、完整原文包含关系、消息完成状态及 pending 为空，全部通过。
- 飞书页面实际显示 Result Lane、Task／Attempt、产物绝对路径、文件版本、耗时和费用。截图为 `/Users/hoye/Documents/workspace/syno-p0-real-test/feishu-capture-om_<redacted>.png`；送达不代表用户已读。
- 详细机器证据：`/Users/hoye/Documents/workspace/syno-p0-real-test/inbox/capture-om_<redacted>-evidence.json` 和 `/Users/hoye/Documents/workspace/syno-p0-real-test/inbox/capture-events.jsonl`。

客户端按真实消息 ID 写一次性执行标记；已有成功证据时只复核既有产物，有执行标记但无成功证据时不自动重跑模型，避免回执丢失导致盲目重复收费。Worker 以不可覆盖的硬链接提交临时产物，飞书普通回复仍是 `at_least_once`，不宣称平台或通知 exactly-once。测试结束后已停止唯一测试客户端并关闭 bsk 会话。

最终无费用回归：两个真实实验脚本 `node --check` 通过，离线预检 **4/4**，`git diff --check` 通过，`npm --prefix /Users/hoye/Documents/workspace/syno-personal-butler-p0 run verify` 通过（Repository 5120 files，active docs 8 files）。

## 13. OpenCode Worker 与 P1 原生 Runtime 闭环（2026-11-19）

### Worker 额度约束与迁移

用户明确要求后续 Worker 测试改用 OpenCode Go 订阅的 `opencode-go/deepseek-v4.1-flash`，不再消耗 Claude Code 测试额度；也可让 Pi Agent 接同一 Go 订阅。本轮随后所有真实 Worker 调用均使用固定 OpenCode 模型，没有再用 Claude Code 做 Worker 测试。第 11、12 节的 Claude 结果只保留为历史基线，不改写历史事实。

`/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/real-worker-probe.mjs` 改为调用宿主 `opencode serve` 的 `/api/experimental/generate` 文本接口。沙箱 Worker 只能访问另一个回环代理，不使用可调用宿主工具的 Agent 模式；OpenCode Server 的随机密码仅存在进程内，没有写入证据或报告，也没有读取、导出或复制 OpenCode 凭据。

直接 `opencode run --standalone --model opencode-go/deepseek-v4.1-flash --format json` 探针真实返回 `OK`，运行时版本为 `opencode v2.0.29`。第一次完整收录因模型额外返回未声明的 `titleNote` 字段而被 Result Lane 拒绝，没有产物或成功证据；没有放宽 Schema。收紧“只允许 Schema 字段、严格禁止额外字段”的提示后，第二次通过：

- 证据：`/Users/hoye/Documents/workspace/syno-p0-real-test/opencode-capture-r2-evidence.json`。
- 产物：`/Users/hoye/Documents/workspace/syno-p0-real-test/vault/02-Resources/capture-5dea25a3c4c605c69c5a1be9-opencode-v2029-p1-r2.md`。
- 产物 SHA-256：`86797c988a522fa0d18037e20078e08012d7f78d7c7a365740500de89d91d213`；耗时 15737ms。
- OpenCode generate 没有返回 Token 或按次费用，证据均写为 `not_returned`；这不表示费用为零，也没有冒充已核验 Go 控制台扣费。

### 原生事务与确定性验证

autoloop 提交 `85bad30` 为业务命令增加原生 `claimed` run 绑定、真实文件哈希和无稳定平台消息 ID 的 accepted delivery；管家提交 `c15100cd` 新增 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/native-capture-runtime.mjs` 与 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/tests/superagent-p1-native.test.mjs`。

P1 的原生 Event／Run 和业务 Context／Task／Attempt／verification／delivery 共用 `/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p1-native.db` 的同一事实日志与投影事务，没有第二状态库。原生规则使用 `tell: "never"`；Worker 候选生成结束只结算原生 run，必须经过宿主 Result Lane 才能结算业务 Task 和创建通知。真实产物由宿主重读并计算 SHA-256，飞书接受但没有稳定平台 ID 时记录 `provider_message_id=null`、`capability=at_least_once`、`may_send=false`。

P1 定向测试 **3/3 通过**，与离线预检合跑 **7/7**：

1. 两次独立输入与一次重放保持完整追踪，Context 版本从 1 到 2，两个不同原生 run 和产物。
2. 高质量但伪造路径的证据不能完成 Task 或创建通知。
3. 真实子进程写入后退出 92，重新打开同一 SQLite 后沿用同一 claimed run／Attempt 恢复，只保留一个产物。

重放测试最初发现“同一命令编号携带更晚对象版本”的确定性错误；修复为从原 Inbox 回执推导原 `expectedVersion` 后通过，没有绕过命令冲突检查。

### 两次真实飞书原生收录

真实客户端提交 `0db7cb9f`，只连接独立测试 App，仍使用已核验公开快照和测试 vault。两次分别发送相同公开 URL，形成两条独立真实消息，而不是同一事件重放：

| 真实消息 ID | 原生 Run／Attempt | 业务 Task／Attempt | Context 版本 | 产物 SHA-256 | 耗时 |
|---|---|---|---|---:|---:|
| `om_<redacted>` | `1`／`1` | `task-om_<redacted>`／`attempt-1-1` | 1 | `3022e148fdc0faa367cfccfa58d1052324be47d8019a72eb1300bfcd67a3f93f` | 18303ms |
| `om_<redacted>` | `2`／`1` | `task-om_<redacted>`／`attempt-2-1` | 2 | `b0d2b5c19b14c2fb6fe72f289a3f7c541a78f94c217de2aeb66a7b36c7c0eab7` | 15996ms |

两条消息均完成 `native-result-lane-passed` 和 `delivery-accepted`，业务 Task 与原生 run 分别为 `completed`／`done`，飞书页面实际显示对应 Event／Run、Task、Attempt、产物、文件 SHA 和模型。两次投递均为 `accepted`、`may_send=false`、`provider_message_id=null`；送达不代表已读。第二条截图为 `/Users/hoye/Documents/workspace/syno-p0-real-test/feishu-p1-native-om_<redacted>.png`，含会话侧栏，不提交仓库。

另用只读 SQLite 查询直接核对两个 Task、run、verification 和 delivery 投影，并用独立 Python 重读两个产物重算 SHA-256，均与账本一致。对第一条消息做本地原生重放后，事实数保持 **20 → 20**，沿用 `run=1`／`attempt-1-1`，没有新增 Task、产物或模型调用；这不是飞书平台主动重复投递的证据。汇总机器证据已写入 `/Users/hoye/Documents/workspace/syno-p0-real-test/real-feishu-evidence.json`，逐项事件仍在 `/Users/hoye/Documents/workspace/syno-p0-real-test/inbox/capture-events.jsonl`。

### 真实链路恢复与重复通知修复

为覆盖真实付费验收中的恢复场景，实验客户端增加仅用于隔离测试的 `SYNO_P1_TEST_CRASH_AFTER_WORKER=1` 故障注入和 `--replay-message-id` 恢复入口。真实消息在 Worker 产物与证据持久化后、Result Lane 前退出 92；恢复时按原消息和执行标记沿用同一 claimed run，不重新调用模型。

第一次使用消息 `om_<redacted>`／`run=3`／`attempt-3-1`。退出后只读 SQLite 证明 Task 仍为 `running`、run 为 `claimed`、delivery 不存在，产物与证据存在。重启时飞书补投与显式恢复同时进入，两个入口都先读到 `queued/may_send=true`，实际产生两条成功通知和两条 `delivery-accepted` 事件。本次结果明确记为失败，截图为 `/Users/hoye/Documents/workspace/syno-p0-real-test/p1-recovery-duplicate-delivery.png`；业务产物仍只有一个，但不能据此掩盖重复通知。

修复提交 `aa946b8` 新增原子 `claimDelivery`：只有当前为 `queued/may_send=true` 的调用者能认领，并在发送前同事务持久化为 `unknown/may_send=false`；其他并发或恢复入口不得发送。认领后崩溃或回执丢失会保留 unknown，等待对账而非盲目重发。定向 autoloop **18/18**、管家 **7/7** 通过，覆盖同一投递第二次认领失败。

修复后用新真实消息 `om_<redacted>` 重跑：退出前为 `run=4`／`attempt-4-1`，恢复后 Task `completed`、run `done`、Context 版本 4，产物 SHA-256 为 `2a6778cb158a303c83241bbfb46c3e150cf2ff41ab56061dd12e13e611b162d4`。恢复过程没有再次调用模型，只有一条 `delivery-accepted`，飞书实际显示一条对应通知。截图为 `/Users/hoye/Documents/workspace/syno-p0-real-test/feishu-p1-recovery-fixed-om_<redacted>.png`。这证明注入进程退出后的真实链路恢复，不等于机器断电或全面平台故障证明。

### 全量回归与仍存限制

- autoloop 全量 **832 项，811 通过、0 失败、21 个平台专属跳过**；类型检查与全仓 Prettier 检查通过。
- 管家全仓 **851 项，832 通过、0 失败、19 跳过**；`npm run verify` 通过（Repository 5122 files，active docs 8 files），`git diff --check` 通过。
- 真实飞书链路的进程退出恢复已通过；首次恢复暴露的重复通知已用原子投递认领修复并重测。该证据不等于机器断电或所有平台故障场景均已覆盖。
- 飞书补投在恢复场景实际出现；普通发送仍是 `at_least_once`，本地重放不能替代其他平台重复投递场景。
- macOS `sandbox-exec` 仍是限定 profile，不是独立 OS 账户或全面默认拒绝文件系统证明；公开收录使用固定快照，不是现场联网抓取。
- 没有写正式 vault、使用生产 App／数据库／Inbox／Outbox、切换生产或推送远端。

## 14. P2 对象隔离与 Worker 替换切片（通过）

### 对象知识查询

新增 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/knowledge-query.mjs` 与 `native-knowledge-runtime.mjs`，用原生 `knowledge.query` 事件、`knowledge:<documentId>` Context 和独立候选 JSON 实现只读对象知识查询。Result Lane 独立重读源文档并校验对象、路径、SHA-256、引用编号、Unicode offset 与答案全文；候选不写 vault。规则显式 `parallel: 2`，避免慢对象 A 占住全局串行队列后阻断对象 B。

定向测试 **4/4 通过**：A 慢时 B 可完成且正文／引用／Context／delivery 不跨对象；同对象续接版本递增、重放零新增事实、歧义零任务副作用；跨对象引用和源文档变更后的旧候选均被拒绝。首次测试因原生规则默认并发 1 失败，修复规则并发后通过，没有放宽验收。

### 第二种真实 Worker

新增沙箱内 Pi Agent Core 1.5.2 Worker，经宿主回环代理调用同一固定模型 `opencode-go/deepseek-v4.1-flash`。OpenCode Server 使用随机进程内密码；Pi 无工具，实测 `providerRequests=1`、`toolEvents=0`，证据中的 `usage`／`costUsd` 为 `not_returned`，不把内部协议占位值冒充真实零用量或零费用。

同一隔离 SQLite 账本先执行 OpenCode、再执行 Pi 的真实收录均通过 Result Lane：Context `capture:421f24f787b49bb0` 从版本 1 续到 2；run 1／2、Attempt `attempt-1-1`／`attempt-2-1`、Task 和产物彼此独立。产物 SHA-256 分别为 `807c2a47446faf82a9aadcf17af4d9991c8bbc4e7052a3f81914d04ba6f3eaa4` 与 `7f4ffe754e66a013c30ca4a90ca8d01a7eb7178b1e74794d0ab15a6177193908`，两个本地 delivery 均为 `accepted/may_send=false`，没有外部通知。机器证据为 `/Users/hoye/Documents/workspace/syno-p0-real-test/p2-worker-switch-wvoha7/worker-switch-evidence.json`，独立只读 SQLite 与 `shasum` 复核一致。

首次双 Worker 运行因探针忽略新隔离 vault 根目录、仍写默认测试 vault 而失败，Result Lane 拒绝结算且没有外部通知；保留 `/Users/hoye/Documents/workspace/syno-p0-real-test/p2-worker-switch-ryujM3` 现场。补上显式 `--vault-root` 后用全新账本重跑通过。

### 真实飞书对象知识查询

独立测试 App、测试账本和测试 vault 已完成真实请求：歧义消息 `om_<redacted>` 的 factCount 前后均为 1，没有创建 Task 或调用 Worker。对象 A 第一轮 `om_<redacted>` 使用 `knowledge:doc_<redacted>` 版本 1／run 1；对象 B `om_<redacted>` 使用独立 Context 版本 1／run 2；A 第二轮 `om_<redacted>` 续到同 Context 版本 2／run 3。三条 delivery 均为 `accepted/may_send=false/provider_message_id=null`，知识查询未调用模型。

候选 SHA-256 依次为 `d7ee4aea9906a6a572240dd174bc92d5b17287d3254887b9ce5819425b0c3ae1`、`0163bc34c0ede1e77fa398d3a95caa8ad6f9964898596f5f27df0fe9a503f22f`、`a54edf55d6108779de955d2ec6c6f9fc47dfd95e50ae0ba79cb556668b99fcd6`。独立只读 SQLite 投影与 `shasum` 复核了 Task／Attempt／run／delivery 状态及源文档、候选哈希。截图为 `/Users/hoye/Documents/workspace/syno-p0-real-test/feishu-p2-knowledge-ab-continuation.png`，机器证据为 `/Users/hoye/Documents/workspace/syno-p0-real-test/real-feishu-evidence.json`。

### 故障注入与同来源并发

P1 native 与 P2 knowledge 定向测试合计 **12/12 通过**：覆盖慢 A 不阻断 B、取消后有效迟到候选仍被拒绝且无 delivery、Worker 子进程超时后保留 running Task／claimed run 且无产物或 delivery、收录和知识候选写盘后的进程退出 92 恢复，以及同来源双宿主串行收录。恢复均沿用原 run／Attempt，不重新生成产物。

并发测试先暴露真实缺陷：第二个请求在领取 run 前推进 Context，导致第一个 Task 结算时因旧 Context 版本被拒绝。修复为新事件先 ingest，只有实际 claim 成功后才 ApplyRoute 和 createTask；lane 忙碌时只保留 queued 事件，不提前推进 Context 或创建 Task。前序完成后，第二宿主用原事件领取 run 2、推进到 Context 2，两个 Task 均 completed，产物独立且不覆盖。真实客户端对 queued 做显式提示，不 trace 不存在的 Task；本切片不自动唤醒 queued 事件，需在前序完成后按原事件对账续接。

**P2 规定的纵向切片退出条件均已满足**；这不是生产切换或全面机器断电容错证明。 queued 自动唤醒、Pi 的真实飞书入站链路和生产能力等价不属于本次已通过范围。

本轮最终 `npm run gate` 通过：管家全仓 **860 项，841 通过、0 失败、19 跳过**；Repository 5126 files、active docs 8 files 校验和 `git diff --check` 均通过。首次全量运行缺少既有 npm 依赖，恢复后又发现 DSH Git 子模块未初始化；按固定提交初始化并构建 POSIX flock 后通过，没有修改依赖版本或生产 Runtime。

## 15. P3 旧迁移实验（已停止，留档）

> 2026-11-19 Owner 已决定不做旧能力等价或迁移。本节只保留此前内核、故障和零副作用证据，不再代表当前 P3 路线。新执行计划见 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/NEXT-EXECUTION-PLAN.md`。

P3 只读刷新确认生产仍为 `main@53853fff5383e7791fdd379ace2e970c07051c0d`，LaunchAgent、Host、Store／Harness／Channels 与飞书 Owner 绑定正常；未停止、重启或修改生产。更新后的能力矩阵明确：P2 只证明纵向切片，旧工作流尚无任何一项可仅凭 P2 标为完整等价。完整清单见 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/P3-MIGRATION-PLAN.md`。

新增 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/migration-rehearsal.mjs` 和 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/tests/superagent-p3-migration.test.mjs`，定向 **3/3 通过**：合成源快照迁移前后哈希不变；副本清单一致；unknown Task／Delivery 阻断复制；重复迁移键与跨对象映射失败关闭；回退增量能识别新增、修改和删除，任何增量都要求复核，不能直接自动回退。

当前通过范围仅为 M1–M2 及 M3 的文件副本／回退增量。尚未把旧业务记录导入原生账本，未执行真实三端发布、切换窗口或旧消费者接管演练，**P3 尚未通过**。本轮全量门禁为 **863 项，844 通过、0 失败、19 跳过**；Repository 5129 files、active docs 8 files 和 `git diff --check` 均通过。

随后新增 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/native-migration.mjs`，完成 M3 的合成公开收录原生导入，定向 **2/2**、P1／P2 共 12 项与 P3 迁移 5 项合计 **17 项通过**。导入复用原生命令与 Result Lane：完成／恢复记录的产物 SHA-256 与源一致，Context 版本 1→2→3，Task 状态为 completed／completed／running；accepted delivery 为 `may_send=false`，queued delivery 保留 `may_send=true`。第二次完整导入新增事实为 0，模型调用与外部效果均为 0；伪造正文被 Result Lane 拒绝。持久证据为 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-native-migration-fcIo3V/native-migration-evidence.json`，独立 SQLite 与 `shasum` 复核一致。

该结果仅覆盖合成公开收录，不覆盖其他旧业务、独立历史入站、真实发布或生产接管。本轮最终全量门禁为 **865 项，846 通过、0 失败、19 跳过**；Repository 5131 files、active docs 8 files 和 `git diff --check` 均通过。

M4 合成故障注入已补：结果未知 Task、投递 unknown、部分发布成功和缺少恢复检查点均在创建新数据库／vault 前阻断；未派发、可恢复和待投递正向路径沿用 M3 证据。这里验证的是迁移预检与公开收录适配器，不是真实远端发布恢复或生产接管。本轮全量门禁为 **866 项，847 通过、0 失败、19 跳过**；Repository 5131 files、active docs 8 files 和 `git diff --check` 均通过。

## 16. P3.0 统一 Runtime 与 Root Router（通过）

### 统一宿主、Registry 与事实账本

新增 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/native-butler-runtime.mjs` 和 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/root-router.mjs`。统一宿主只创建一个 `DatabaseSync`、安装一份合并规则并注册 capture／knowledge 两个 Specialist；两个领域共享同一 SQLite 事实日志、投影事务与测试 vault。Root Router 只返回领域、对象或歧义候选，不生成领域正文，也不直接调用 Worker。

`/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/native-capture-runtime.mjs` 与 `native-knowledge-runtime.mjs` 支持注入共享数据库及关闭独立规则安装；共享模式下不各自关闭数据库。相同规则配置在 Runtime 重启时幂等，不重复追加事实。收录 queued 事件保留原始 `appId/chatId/ownerId/worker`，`queued()` 可从原生 run 与事件 detail 恢复原消息身份。

`/Users/hoye/Documents/workspace/syno-personal-butler-p0/tests/superagent-p3-runtime.test.mjs` 新增 **2/2** 测试，与 P1 native、P2 knowledge 定向回归合计 **14/14 通过**（P1 6 + P2 6 + P3.0 2）：两个领域规则不互相覆盖；收录 A 未完成时知识 B 可完成；同来源第二事件保持 queued 且无 Task／Context 推进；前序结算后按原事件进入 Context 2；两个收录产物与两个知识结果独立；歧义零新增事实；相同规则重启零新增事实。

### 真实飞书同来源 queued 自动唤醒

真实客户端 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/real-feishu-client.mjs` 已从统一 Registry 获取两个 Specialist，最终账本为 `/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-runtime-final.db`。两条真实公开收录结果如下：

| 真实事件 | 原生 Run／业务 Attempt | Context 版本 | 产物 SHA-256 |
|---|---|---:|---|
| `om_<redacted>` | `1`／`attempt-1-1` | 1 | `ba0b99980ab05338344e78a2743f04c9ef16fda695c9ceb8012cb7387dd9523f` |
| `om_<redacted>` | `2`／`attempt-2-1` | 2 | `2e8af944f9d3781e30ae39e7bd12e5951b5ff7c489af86b949d02ff1145a2db3` |

真实 queued 时刻快照 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-runtime-final-queued-snapshot.json` 记录于 `2026-11-19T07:21:00.545105+00:00`：第一条为 `claimed`、Task `running`、Context 1；第二条为 `queued`、`taskId=null`、`contextVersion=null`。第一条完成后，drain 按第二条原事件身份自动领取 run 2，生成独立产物并进入 Context 2，最终 Task `completed`、Attempt／run `done`、delivery `accepted`；用户没有重发第二条消息。飞书截图 `/Users/hoye/Documents/workspace/syno-p0-real-test/feishu-p3-capture-knowledge.png` 显示第二条自动完成回执。

飞书适配器自身串行等待入站处理器，初版测试客户端又在处理器内等待长 Worker，导致第二条无法及时 ingest。修复为测试客户端把收录放入受跟踪的后台 Promise 并立即 deferred delivery；原生对象 lane 仍串行，第二条只保留 queued。客户端停止时先等待后台收录，再停止适配器并关闭统一 Runtime。queued 结果不会递归触发重复 drain。

### 同一账本中的知识 A/B、续接与歧义

| 真实事件 | 对象 | Context 版本 | 原生 Run／业务 Attempt |
|---|---|---:|---|
| `om_<redacted>` | `doc_<redacted>`（A1） | 1 | `3`／`attempt-3-1` |
| `om_<redacted>` | `doc_<redacted>`（B1） | 1 | `4`／`attempt-4-1` |
| `om_<redacted>` | `doc_<redacted>`（A2） | 2 | `5`／`attempt-5-1` |

三条知识结果与两条收录共用最终账本。A 的回答与引用只指向 `vault/02-Resources/p2-object-a.md`，不含 B 的 BETA 事实；B 只指向 `vault/02-Resources/p2-object-b.md`，不含 A 的 ALPHA 事实。多候选“继续查询”消息 `om_<redacted>` 返回 15 个候选，事实数保持 **51→51**，没有创建 Task 或调用 Worker；截图为 `/Users/hoye/Documents/workspace/syno-p0-real-test/feishu-p3-unified-runtime.png`。

独立只读审计 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-runtime-final-audit.json` 核对最终 **5 个 Task、5 个 Attempt、5 个原生 run 全部完成，5 个 delivery 全部 accepted**；独立重算所有产物 SHA-256，均与 `verification.file_hash` 一致。汇总机器证据为 `/Users/hoye/Documents/workspace/syno-p0-real-test/real-feishu-evidence.json`。

### 失败现场、全量门禁与未覆盖项

- 初始 `/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-native.db` 中第一条真实收录成功，第二条 Worker 未取得成功回执；没有自动重放，claimed lane 保留。第二阶段 `/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-runtime-validation.db` 证明 queued 事件可自动领取到 Context 4，但该 Worker 也失败；账本同样保留，没有手工修状态或把失败现场描述成最终成功账本。Worker 错误证据改为优先保留 stderr 末尾，最终验收使用新的隔离账本且两条 Worker 均成功。
- 一次过快的浏览器脚本把两个 URL 合并成一条 unsupported 消息；Root Router 正确保持零 capture 事实、零 Task。最终改为两个独立浏览器事务，才形成真实 queued。
- 最终 `npm --prefix /Users/hoye/Documents/workspace/syno-personal-butler-p0 run gate` 退出码 0：**868 项，849 通过、19 跳过、0 失败**；Repository verification 通过（5135 files），active documentation check 通过（8 files），`git diff --check` 通过。
- **未做真实 Host 重启后的 queued 恢复验收。** 本轮证明的是同进程 queued 自动唤醒与规则配置重启幂等，不能拿后者冒充 Host 重启证明；Host 重启、queued 自动唤醒和 unknown 对账的联合演练保留到 P3.4。
- 全程只使用独立测试 App、测试账本和测试 vault；没有生产切换、正式 vault 写入或远端推送。OpenCode／Pi 固定模型仍为 `opencode-go/deepseek-v4.1-flash`，未返回的 Token 与费用继续记录为 `not_returned`。

## 17. P3.1 Idea Specialist 纵向切片（通过）

### 代码检查点与验收范围

- 代码检查点：`bbe0cffe6 feat: 增加 Idea Specialist 确定性内核`、`5f7298b01 feat: 接入 Idea 真实 Worker 与测试客户端`；未推送。文档提交尚未发生，本节不声称文档提交 hash。
- Idea 定向 **18/18**；P1／P2／P3.0／P3.1 合跑 **32/32**，0 fail／0 skipped。`node --check`（real-worker-probe、real-feishu-client、idea-worker-contract、idea-worker-smoke、idea-worker-drain）、`npm run verify`、`git diff --check` 均通过。
- 全量 gate：**886 项，867 通过、19 跳过、0 失败**；Repository verification 5143 files；active documentation check 8 files。
- 本轮只使用独立测试 App、`/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-idea.db` 与测试 vault；未触生产 App／DB／正式 vault，未推送。

### 对象、版本与 Result Lane

Idea Specialist 定义稳定 `ideaId`、`idea:<ideaId>` Context、对象索引与版本化 Markdown；新建、续接、比较分别绑定 message／task／attempt／idea／contextVersion／inputSha256／worker／model。候选 Markdown 分开保存本轮 prompt、Worker 生成的 `generatedText` 与固定历史引用。Result Lane 独立重算文件 SHA-256，核对 prompt、generatedText、冻结输入版本、路径、SHA-256、offset／end／excerpt，并拒绝空正文、跨对象引用、伪造路径、旧输入、旧 Attempt、取消后迟到候选。

真实客户端从统一 Registry 获取 Idea Specialist；同对象 queued 不提前推进 Context 或创建 Task，前序完成后自动 drain。新增 `idea-worker-drain.mjs` 纯控制流修复“同对象多条 queued”闭环：本批有推进或收到新请求就继续取队列，直到空队列或完全无推进。不同对象同批并行，失败不盲目重跑，stop 等待后台 Idea 与 drain。该“多条 queued”闭环由确定性回归证明，不是真实飞书两条。

### 真实飞书 6 个 Task

真实飞书使用独立测试 App 与测试账本，ALPHA=`idea-3c8bfc6ccb9f95aa`，BETA=`idea-e017648029516808`，共 6 个 Task：

| 真实事件 | 对象／动作 | Context | Task／Attempt／run | 产物 SHA-256 |
|---|---|---:|---|---|
| `om_<redacted>` | ALPHA new | 1 | `task-om_<redacted>`／`attempt-1-1`／1 | `5b156c3e004ce45826c37a311367ecdbc3a2fa8da91a14a8da9831299332bf86` |
| `om_<redacted>` | BETA new | 1 | `task-om_<redacted>`／`attempt-2-1`／2 | `c863a6a5b2e1102a9296636900bdc07d51d43a043764d82fbb4b43ff049ef2d4` |
| `om_<redacted>` | ALPHA continue | 2 | `task-om_<redacted>`／`attempt-3-1`／3 | `9bf43caec6b091faef4d83ba8acfb5ffc49b758a728e013ab3ce9659e029850d` |
| `om_<redacted>` | ALPHA continue | 3 | `task-om_<redacted>`／`attempt-4-1`／4 | `4ab5f050cb047a640d12370207954141b3b22a1c1800dcf78147db090d564ec2` |
| `om_<redacted>` | ALPHA continue | 4 | `task-om_<redacted>`／`attempt-5-1`／5 | `677703401f9c0f6352f46939ce8954715bd4b203415df20bff5cc152f779a5ee` |
| `om_<redacted>` | ALPHA／BETA compare | 5 | `task-om_<redacted>`／`attempt-6-1`／6 | `9b28e9f708ab0ae5c4c84fb5f82f9d6d5593abc44d3b2c00df36740b91dba871` |

- 6 个 Task／Attempt／原生 run 全部完成；6 个 delivery 全部 accepted，`may_send=false`、`provider_message_id=null`、capability=`at_least_once`。
- 独立审计逐项核对 prompt、generatedText、冻结输入、引用 offset／end／excerpt 和文件 SHA-256，`allTaskChecksPassed=true`；审计为 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-idea-real-audit.json`。
- ALPHA 的比较引用固定输入 A v4 与 B v1，使 ALPHA Context 进入 v5；BETA 的 `latestVersion` 始终为 1，未被比较推进。比较截图 `/Users/hoye/Documents/workspace/syno-p0-real-test/feishu-p3-idea-compare.png`。
- 真实 queued 只有一条：第四条 v4（`om_<redacted>`）在第三轮执行时持久化为 `queued`，当时无 Task、Context 未提前推进；前序完成后同进程自动 drain 完成，最终 Context 4。没有把确定性“两条 queued”回归写成真实飞书两条。
- 歧义 `om_<redacted>`（missing-idea-id）与未知 `om_<redacted>`（`idea-0000000000000000`）各一次：只追问，业务 factCount 均 **74→74**，无 Task／Worker。未知追问截图 `/Users/hoye/Documents/workspace/syno-p0-real-test/feishu-p3-idea.png`。

### OpenCode → Pi 真实 Worker 切换

停止独立测试客户端后，本地使用同一 `p3-idea.db`，同一 ALPHA 从 OpenCode v4 续接到 Pi：

- 前序 OpenCode v4：`677703401f9c0f6352f46939ce8954715bd4b203415df20bff5cc152f779a5ee`。
- Pi v6：`/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-idea-artifacts/idea-3c8bfc6ccb9f95aa/v6-om_p31_pi_switch_1857.md`，SHA-256 `c33493b5652ede5ac96eeec6d47d465bd938483c6c0f1aeb58aa03bb539e6012`。
- `task-om_p31_pi_switch_1857`／`attempt-7-1`／run 7：Task completed、Attempt done、run done、Result Lane passed、本地 delivery accepted、`feishuCalls=0`、Pi `providerRequests=1`、usage／cost=`not_returned`。证据为 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-idea-worker-switch/2026-11-19T10-57-42-778Z/result.json`。
- 首次烟测脚本误预期下一版本为 v5；实际比较已占 v5，Pi 续接正确落为 v6。没有重跑模型，主 Agent 依据既有请求、证据与 SQLite 对账为正确 v6。Pi 的 generatedText 自称 v5，但权威 Context、候选元数据和路径均为 v6，正文标签不改业务事实。

### 确定性覆盖、失败现场与未完成项

- 确定性覆盖：A／B 新建与 A 续接；知识 C；合成 `project:d` 隔离；比较引用精确且 B 不变；歧义零副作用；重放零新增与变更重放拒绝；同对象多条 queued 自动 drain；不同对象并行；取消与旧 Attempt；Worker timeout；写盘后退出恢复；Worker done 不结算 Task；空正文；跨对象／伪造引用；旧输入。
- **真实 Host 重启后的 queued 恢复仍 `not_performed`，归入 P3.4**；同进程自动唤醒、规则重启幂等和确定性回归不能冒充 Host 重启证明。
- delivery accepted 不是已读；`provider_message_id=null`。usage／cost 未返回，不写成 0，也不声称已核验 Go 控制台扣费。
- P3.0 两份失败账本（`p3-native.db`、`p3-runtime-validation.db`）继续保留，不删除、不描述成成功账本。
- P3.1 真实客户端与 bsk 会话均已停止；未触生产 App／DB／正式 vault，未推送。真实飞书只声称对象独立与单条 queued；“不同对象并行”“两条 queued”均为确定性覆盖。
- 机器汇总见 `/Users/hoye/Documents/workspace/syno-p0-real-test/real-feishu-evidence.json` 的 `p3.ideaSpecialist`。

## 18. P3.2 Project Specialist 纵向切片（通过）

### 代码检查点与验收范围

- 代码检查点：`3f9508627 feat: 增加 Project Specialist 确定性内核`、`1e3dd8835 feat: 接入 Project 真实 Worker 与测试客户端`；均未推送。本文不预写文档提交 hash。
- 本轮只有一轮旧断言最小返工：`tests/superagent-p3-runtime.test.mjs:43` 的 Specialist Registry 预期由 `["capture","knowledge","idea"]` 同步为 `["capture","knowledge","idea","project"]`，测试其余语义未变；此后没有 P0／P1 返工。
- 代码审查、真实模型烟测、真实飞书独立审计与全量门禁由主 Agent 完成；本节的数字全部来自机器证据，不覆盖 P3.0／P3.1 的历史事实。

### 确定性与门禁

- Project 定向 **17/17** 通过（13 项内核 + 4 项 Worker 合约）。
- P1／P2／P3.0／P3.1／P3.2 五文件合跑 **49/49**，0 fail／0 skipped。
- 最终 `npm run gate` 通过：**903 项，884 通过、0 失败、0 cancelled、19 跳过、0 todo**；Repository verification **5150 files**，active documentation check **8 files**，`git diff --check` 通过。证据为 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-final-gate.json` 与 `p3-project-final-gate.log`。

### 本地真实 Worker（不接飞书）

两个烟测都在独立临时账本与项目根内执行，`feishuCalls=0`、`modelCalls=1`、`usage`／`costUsd=not_returned`：

| 场景 | 对象 | 版本 | manifest SHA-256 | 结果 |
|---|---|---:|---|---|
| OpenCode new | `project-451c24e949b7ba1b` | v1 | `eb26ba480e084bedb1669e8376be957976503923463094b75fdf016dce9a8c22` | Result Lane passed，delivery accepted |
| Pi revise | `project-f237daf1187a31e2` | v1→v2 | `6368eed4c811b0b89a664b1f67cedde0a56e2a6719c5ded34edc1b371313a708` | Result Lane passed，delivery accepted；v1 哈希未变 |

- 证据：`/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-worker-smoke/opencode-2026-11-19T11-57-59-814Z/result.json`、`/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-worker-smoke/pi-2026-11-19T11-59-55-351Z/result.json`。
- Pi 的 Worker evidence 记录 `pi.providerRequests=1`、`toolEvents=0`，pi 未使用工具。
- 探针只返回两段正文，`resultLane=delegated_to_host`；三步落盘、manifest 规范化和 Result Lane 由宿主完成。

### 真实飞书：两个项目与一个想法

使用独立测试 App、独立数据库 `/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-project.db` 与项目根 `/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-project-artifacts`。

| 对象 | 版本 | 真实消息 ID | Task／Attempt／run | manifest SHA-256 |
|---|---|---|---|---|
| ALPHA `project-8a5a1b3c61f28bc7` | v1 | `om_<redacted>` | `task-om_<redacted>`／`attempt-1-1`／1 | `73ead5b9bb779e8c7a5b59ba18fdf48aa47fe3402ea1e70f7f91c2520f8a02ed` |
| ALPHA | v2 | `om_<redacted>` | `task-om_<redacted>`／`attempt-4-1`／4 | `481d8d1918449abcd5302dd49b149368ed8371a69fb36cd6cedda7abbf70ea6d` |
| ALPHA | v3 | `om_<redacted>` | `task-om_<redacted>`／`attempt-5-1`／5 | `f20bb9feed4ad79c3667ca0efb83d74dd209013b02b1ac66bdd17e6cc73041ac` |
| BETA `project-7db58ebce60250b6` | v1 | `om_<redacted>` | `task-om_<redacted>`／`attempt-2-1`／2 | `d4dce687cb3fb839459113d7804d1b177acd3f7a048c8126ae30231ccbbbf938` |
| 想法 C `idea-8c738ac2620a34a8` | v1 | `om_<redacted>` | `task-om_<redacted>`／`attempt-3-1`／3 | —（Context=1，独立结算） |

- ALPHA `versions=[1,2,3]`、`latestVersion=3`、Context=3；BETA 仅 v1、`latestVersion=1`。
- 四个项目 Task 与想法 Task 均 `completed`，Attempt 与原生 run 均 `done`，Result Lane passed，delivery 全部 `accepted`、`may_send=false`、`provider_message_id=null`、capability=`at_least_once`。
- 全部项目 outline／deliverable／manifest 已独立重读并核对路径、依赖、字节数与 SHA256；v3 冻结的 previous 逐项指向 v2 全部产物，旧版未被改写。
- 独立审计为 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-real-audit.json`：`ok=true`、6 组检查全部通过、`factCount=88`。

### 真实 queued 与同进程 drain

- 快照 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-real-queued-snapshot.json` 记录于 `2026-11-19T12:07:11.948Z`：ALPHA v2 为 `running`，v3 的 run 5 为 `queued`，`v3Task=null`、冻结输入为 `null`，ALPHA 索引 `latestVersion=1`，`factCount=58`。
- v2 于 `2026-11-19T12:07:18.390Z` 完成，v3 于 `12:07:19.116Z` 才被 claim，并于 `12:08:32.853Z` 完成；最终 `factCount=88`。
- 只声称**同进程自动 drain**。真实 Host 重启后的 queued 恢复仍为 `not_performed`，归 P3.4；真实飞书 crash 注入本轮未触发，故障恢复证据来自确定性进程退出与同一 SQLite 重开，不冒充真实 Host 重启。

### 歧义与未知

- 歧义消息 `om_<redacted>`（`multiple-projects`，候选 BETA／ALPHA）：业务 factCount **75→75**。
- 未知消息使用单独补发的 `P32-UNKNOWN-2015-R2`，消息 ID `om_<redacted>`，标识 `project-0000000000000000`：factCount **88→88**。
- 两者均未创建 Task、未产生 Worker evidence、未改变项目索引、未推进 Context。首轮页面两条消息的回复归属不一致，因此未知对象用 R2 单独重发，审计只采用消费者日志中的独立 unknown 事件；根因未确认，不写成已确认代码缺陷。

### 页面证据

- `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-v3-notification.html`：含 v3 Task／Attempt、manifest 绝对路径、上述 SHA 和 Result Lane passed。
- `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-real-v3-complete.png`
- `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-real-ambiguous.png`
- `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-real-clarifications.png`

### 限制与未覆盖项

- `accepted` 不代表已读；普通发送仍是 `at_least_once`。
- usage／cost 未返回记 `not_returned`，不等于 0，也未核验 Go 控制台扣费。
- 独立飞书客户端已正常停止（status `running=false`），无第二个测试消费者；bsk 会话已停止。
- **真实 Host 重启后的 queued 恢复仍归 P3.4**；本轮只证明同进程自动 drain 与确定性进程退出／重开恢复。
- 未触生产 App／DB／正式 vault，未推送远端。

## 19. P3.3 Decision Lane 与 Memory Specialist 纵向切片（通过）

### 代码检查点与验收范围

- 代码检查点：`d04a815cc feat: 增加 Decision Lane 与 Memory 确定性内核`、`00d631dc3 feat: 接入 Memory 真实 Worker 与测试客户端`；两笔代码提交均已完成，正式文档尚未提交，未推送。本文不预写文档提交 hash。
- 确定性验收：P3.3 定向 **28/28** 通过；P1／P2／P3.0／P3.1／P3.2／P3.3 六文件合跑 **77/77**，0 fail／0 skipped。本轮新增／修改的 JS 全部 `node --check` 通过。
- 最终 `npm run gate` 通过：**931 项，912 通过、0 失败、0 cancelled、19 跳过、0 todo**；Repository verification **5159 files**，active documentation check **8 files**，`git diff --check` 通过。
- 本轮使用独立测试 App `cli_<redacted>`、`/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-decision-memory.db` 与 `runtime/p3-memory-artifacts`；未触生产 App／DB／正式 vault，未推送。
- 返工只保留既有两轮，未另起：R1 修复 completed Task 快路径绕过业务对账，以及 recalled memory 在 Worker 运行期间被纠正／遗忘／撤销／替代后仍被结算；R2 只修烟测脚本 `messageId` 超出 48 字符上限。逐项记录见 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/p3-decision-memory-work/PROGRESS.md`。

### 真实 Pi Memory 烟测（不接飞书）

结果文件 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-memory-worker-smoke/pi-2026-11-19T15-51-22-774Z/result.json`：

- `ok=true`；Pi Agent Core `1.5.2` + `opencode v2.0.29`，固定模型 `opencode-go/deepseek-v4.1-flash`。
- `modelCalls=1`、`providerRequests=1`、`feishuCalls=0`、`toolEvents=0`。
- Memory `memory-a370104024f4b799`，Decision `decision-a370104024f4b799`，scope `idea:idea-e4636573441ffce8`。
- 召回 owner active 1 条 + 精确 idea scope active 2 条，共 **3 条**；pending／旧版本／revoked／其他 Owner／其他对象 canary 均被排除。
- Result Lane passed，候选为 pending v1，本地 delivery accepted，`providerMessageId=null`。
- 候选文件 SHA-256 `241661ed5197f1a1451a673efc35d8cd179bbaab392f772420d38ac1aae9c492`，宿主重读一致。
- `usage`／`costUsd=not_returned`，不写 0，也不声称已核验 Go 控制台扣费。

### 真实飞书 Decision Lane

- Idea A `idea-82e425fd3e0ee887`：初始 v1（消息 `om_<redacted>`）；选择 Decision 后推进到 v2（选择消息 `om_<redacted>`），v2 文件 SHA-256 `3119d127636b4d96b257c5625ce013987967275ef2f72be6983021b90d0fdf78`。
- Idea B `idea-9910ed53a0fdd38b`：消息 `om_<redacted>`，始终 `latestVersion=1`，未被 A 的选择推进。
- 多候选原消息 `om_<redacted>`，Decision `decision-8c286f4d29659f6b`；candidate-1 指向 A、预期 v1，candidate-2 指向 B、预期 v1。该追问只新增 Decision 事实，factCount **27→28**，没有领域 Task／Worker。
- candidate-1 被后续真实 Owner 消息消费，只推进 A 到 v2；随后用不同消息选择 candidate-2，飞书如实回复该 Decision 已被原消息消费、本次未执行任何业务，没有第二次副作用。

### 真实飞书 Memory 全链路

四条真实 OpenCode Memory proposal 全部走固定模型、Result Lane 与 accepted delivery，`usage`／`cost=not_returned`；activate／correct／forget 不调用模型。

1. owner 记忆 `memory-6908bdaca5c4dd53`／`decision-6908bdaca5c4dd53`：proposal 消息 `om_<redacted>` 为 pending v1、`recalled=[]`；后续不同真实 Owner 消息 `om_<redacted>` 确认后 active v2。
2. Idea A 记忆 `memory-0853828b126341eb`：proposal `om_<redacted>` 为 pending v1，只召回 owner v2；确认消息 `om_<redacted>` 后 active v2。随后对精确 v2 发起纠正 Decision `decision-1e0de77b6764d385`，确认消息 `om_<redacted>` 得到 active v3，v2 superseded，pending v1 保留历史；v3 正文为 `P33-IDEA-A-CORRECTED-0031 我偏好先列风险，再讨论一个设计方案。`
3. Idea B 记忆 `memory-6d1515c53167159d`：proposal `om_<redacted>` 为 pending v1，只召回 owner v2，不含 A 的 pending；确认消息 `om_<redacted>` 后 active v2。随后对精确 v2 发起遗忘 Decision `decision-9bbd6bf46424f685`，确认消息 `om_<redacted>` 得到 revoked v3，v2 superseded。
4. 最终 Idea A 记忆 `memory-e32ee0b11adba87a`：proposal `om_<redacted>` 为 pending v1；Worker request 只含 owner active v2 与 A corrected active v3，明确不含 A 旧值、A pending、B revoked canary 或其他对象正文。确认消息 `om_<redacted>` 后 active v2。
- 再用不同真实消息重复确认同一 Decision，飞书回复“已被消费、本次未执行任何业务”；SQLite facts／events／records／runs／run_events 全部零增长，facts **181→181**。
- 期间曾误发一条非协议文本“记录想法偏好 …”，客户端只回复已收到且未调用模型；随后按正式“记忆候选 idea:…”命令完成。该误发不作为成功业务路径，也不记为产品缺陷。

### 独立审计与现场清理

独立审计 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-decision-memory-real-audit.json` 为 `ok=true`：

- **13** Task／**13** Attempt／**13** 原生 run 全部 `completed`／`done`。
- **13** 条 verification 全部为 `host_result_lane` passed。
- **13** 条 delivery 全部 `accepted`、`may_send=false`、`provider_message_id=null`、`at_least_once`。
- **13** 份验收产物全部独立重读，文件 SHA-256 全部匹配。
- **7** 个 Decision：1 个 `route.select` + 4 个 activate + 1 个 correct + 1 个 forget；**6** 条 `memory_apply`。
- **4** 个 Memory index、**10** 个 Memory 版本文件与 SQLite 的对象、scope、版本、操作、消息 ID、preference SHA 全部一致。
- 四组 OpenCode request／evidence 配对一致，沙箱拒绝与模型正向路径核验通过。

现场清理：页面证据 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-decision-memory-real-final.png`；消费者日志 `/Users/hoye/Documents/workspace/syno-p0-real-test/inbox/capture-events.jsonl`。测试客户端已正常停止，`runtime/feishu-client-status.json` 为 `running=false`、`available=false`、`stoppedAt=2026-11-19T16:18:04.390Z`；无第二个测试消费者，bsk `zwnx` 已停止。

### 限制与未覆盖项

- `accepted` 不代表已读；普通发送仍是 `at_least_once`，`provider_message_id=null`。
- `usage`／`cost` 未返回记 `not_returned`，不等于 0，也未核验 Go 控制台扣费。
- **真实 Host 重启后的 queued 恢复仍 `not_performed`，归 P3.4**；真实客户端 crash 注入未触发，不得写成已完成；现有进程恢复证据只来自确定性测试。
- 未触生产 App／DB／正式 vault，未推送远端。

## 20. P3.4 生产候选与隔离切换演练（通过）

### 代码检查点与修复范围

- 代码检查点：`9fac4c519154e452e2cddbe30531ed68f518aac8 feat: 增加 P3.4 切换与恢复确定性内核`、`7751be381cb1618ed2acdcf63af2fee74151ed6e feat: 接入 P3.4 真实 Host 切换控制`、`a4cfda931 fix: 明确 Idea 引用必须唯一`、`cd4e0d4f2 feat: 支持 Idea 同消息恢复重放`；均已提交，未推送。本文不声称文档提交 hash。
- 统一隔离 DB 为 `/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-decision-memory.db`，真实测试 App 为 `cli_<redacted>`；未触生产 App／DB／正式 vault。
- A 的真实 OpenCode Go Worker 最初连续两次因 quote 不唯一在写 artifact／evidence 前失败；没有第三次盲目重试、没有清库或伪造候选。`a4cfda931` 只补 prompt 唯一性约束，未放宽宿主确定性校验；随后用同一冻结输入、Task、Attempt 做一次有代码依据的恢复，生成合法 artifact／evidence，usage／cost=`not_returned`，未声称 Go 扣费已核验。证据为 `p34-a-quote-fix-worker-result.json`、`inbox/idea-om_<redacted>-evidence.json`、`p34-a-after-worker-recovery-audit.json`。
- `cd4e0d4f2` 新增真实 Idea 同消息恢复入口，复用 existing Task／run、`finishIdea` 和原 Result Lane；初审发现首版缺后序 drain，一轮返工补 `requestIdeaDrain()`，主 Agent 独立 **82/82** 通过后才启动真实 Host。

### 真实 Host queued 恢复与 unknown 对账

- Host A 在前序 Idea 已结算、后序仍 queued、真正 drain 前真实 `exit 95`；原始输出 `/private/tmp/claude-501/-Users-hoye-Documents-workspace/<redacted-uuid>/tasks/bhd0703xf.output`。恢复后 A `om_<redacted>` 为 Context v3、Attempt `attempt-14-1`、run 14、v3 SHA-256 `cb05faa7994b544d64947dea025edd39bd7e804c86079ff929a79600e1129455`。
- 另一新 Host B 自动 drain 后序 B `om_<redacted>`，生成 Context v4／Attempt `attempt-15-1`／run 15、v4 SHA-256 `a5a9b206e2d1f968aa840eee79e0dbe5307abbf70d29bd45573553bb6c792c3b`，并真实发送通知；在真实 `adapter.send` delivered 后、`idea.accept` 前注入故障，保持 unknown／`may_send=false`／`provider_message_id=null`。Host C 重启不重发；页面人工对账后才 accept。证据：`p34-after-exit95-audit.json`、`p34-host-b-unknown-audit.json`、`p34-host-c-reconciled-audit.json`、`p34-host-c-page-observation-2.txt`、`p34-host-c-unknown-page.png`、`p34-b-unknown-manual-accept.json`。
- Idea A 最终 v6（v6 SHA-256 `41a6453b76b91ef965c4d94ebbf58ee852fe13f23dc9d20192605e513aefbbe9`）；跨对象 Idea B `idea-9910ed53a0fdd38b` 始终 v1，SHA-256 `dbef477049a98a43539b837a56c8538dae6f3e545e507ecb87c888474820aba2`。主 Agent 已独立重算 A v1–v6 与 B v1 的全部产物 SHA256，均匹配账本。

### 通知退避

- 故障点是 claim 已写 unknown、transport 尚未调用；只有明确 `attempted:false` 才允许 15 秒退避。
- 第一条消息 `om_<redacted>`（Context v5，run 16）的首次独立 `not_due` 观察迟到，工具读取时已 accepted，原样保留失败记录 `p34-backoff-first-not-due-attempt.txt`，不计为通过。
- 第二条消息 `om_<redacted>`（Context v6，run 17）用独立 watcher 获得有效 `status=not_due`、facts **240→240**（`p34-backoff-not-due.json`）。两条最终均 accepted、`retry_count=1`、provider=null；`p34-backoff-final-audit.json` 记录 facts=242、17 Task 全 completed、17 delivery 全 accepted。页面证据 `p34-backoff-page.png`／`p34-backoff-page-observation.txt`。

### 冻结窗口、独占接管与竞争实例

- 主 Agent 对旧 Host PID 6708、instance `<redacted-uuid>` 投递真实 SIGUSR1 完成 freeze，旧 instance 处理 before `om_<redacted>` 并 reply accepted 后由真实 SIGTERM 正常停止；during `om_<redacted>` 在 freeze generation 6 下只写 spool，无 Task／delivery／processed inbox。
- 新 instance `<redacted-uuid>` 持锁后按 recover→drain frozen 至 pending=0→unfreeze→ready 顺序接管；spool forwarded、attempts=1；知识 Context v1、Attempt `attempt-18-1`、run 18、delivery accepted。after `om_<redacted>` 由新 instance reply accepted。证据 `p34-cutover-old-frozen-audit.json`、`p34-cutover-three-windows-audit.json`、`p34-cutover-three-windows-page.png`。
- 竞争 Host 同时启动时退出码 **1**、`FEISHU_PROCESS_LOCKED`；Host 状态文件 SHA256 完全不变，facts 保持 **263**。证据 `p34-pre-competitor-host-status.json`、`p34-pre-competitor-feishu-status.json`、`p34-competitor-output.txt`、`p34-competitor-exit-code.txt`、`p34-post-competitor-audit.json`。

### 数据快照与真实增量回退对账

- 快照：**63** 个文件，actionCounts 为 dedupe_only=18、history_only=25、dedupe_no_resend=18、copy_versioned=6；externalEffects=0；源／目标哈希一致、源不变；未包含凭据、Session、Worker request／attempt 或数据库；旧 Task／Workflow／Session 只读归档，不恢复执行。证据 `p34-pre-migration-status.json`、`p34-migration-candidate/`、`p34-migration-prepare-output.json`、`p34-migration-independent-hash-audit.json`。
- 快照后真实知识增量 `om_<redacted>` 最初只在页面出现，未重发、未伪造 messageId／artifact、未把内部 feed ID 当 provider ID；原消息随后自行补达并完成。最终停止唯一 Host 后 channel pending=[]、seenCount=74。增量 Context v2、Attempt `attempt-19-1`、run 19、Result Lane passed、delivery accepted；产物 SHA-256 `5131d30ac320212d399e7dd2c26d2b6f9fda94b3ed1f72137cf8634b0c00022b`（`p34-increment-audit.json`、`p34-increment-final.png`）。
- 回退输出 `p34-rollback-output.json` 与 `p34-migration-candidate/rollback-reconciliation.json`：delta added=`domain/knowledge/om_<redacted>.json`、changed=`feishu-dedupe.json`、`requiresIncrementReview=true`；旧快照直接复制被拒绝且增量副本不变；`sourceOverwritten=false`、`targetConsumerStarted=false`、`rollbackExecutedAgainstLiveRuntime=false`。结论：保持停止并前向修复，不强行吸收增量，不双消费者运行。
- 两条知识查询（during 与增量）都返回“该文档中没有找到匹配内容”，未调用模型；只声称本地只读查询与 Result Lane 闭环通过，**不**写成生成了最佳实践摘要。

### 独立审计、门禁与限制

- 最终独立审计 `/Users/hoye/Documents/workspace/syno-p0-real-test/p34-final-independent-audit.json`：facts=**278**、累计 **19** 个 Task 全 completed、**19** 个 delivery 全 accepted，active Task=0、queued=0、delivery queued=0、unknown=0、pending Decision=0、handover hold=0；`accepted` 不代表已读，`provider_message_id=null`，capability=`at_least_once`。
- 主 Agent 独立运行 `npm run gate`，原始日志 `p34-final-gate.log`：tests=**942**、pass=**923**、fail=**0**、cancelled=**0**、skipped=**19**、todo=**0**；Repository verification **5164 files**；active documentation check **8 files**；`git diff --check` 通过。P3.4 相关七文件合跑此前独立 **82/82** 通过。最终综合断言 `/Users/hoye/Documents/workspace/syno-p0-real-test/p34-final-verification.json` 为 `ok=true`，覆盖 6 个领域消息＋2 个立即回复、9 份产物哈希、63 个源文件不变、8 个本轮消息去重，以及 pending／active／queued／unknown／pendingDecision／hold／残留消费者均为 0。
- 最终 Host 已正常停止：`runtime/host-status.json` 的 `host.running=false`、`adapter.running=false`、`stoppedAt=2026-11-20T02:11:33.696Z`；`pgrep -fl 'real-feishu-client\.mjs'` 无匹配，`p34-final-consumer-processes.txt` 为空；bsk `cwxu` 已停止，无第二测试消费者。
- 限制：机器断电与 macOS 登录冷启动均为 `not_performed`，不得与真实 Host 进程退出／新进程恢复混淆；`accepted` 不等于已读；usage／cost=`not_returned`，不等于 0 且未核验 Go 控制台扣费；真实 SIGUSR1 freeze 与 SIGTERM 停止已验证，SIGUSR2 状态刷新未单独投递；多批 >100 frozen drain、平台主动重复投递未声称覆盖。未触生产 App／DB／正式 vault，未自动推送。

## 21. P4 生产接管准备（通过，生产未执行）

### 任务边界与白名单

- 本轮只做工具、隔离测试与文档，白名单为 `experiments/superagent-p0/production-handover-preflight.mjs`、`tests/superagent-p4-production-handover.test.mjs`、`docs/plans/superagent-p0/P4-PRODUCTION-HANDOVER-RUNBOOK.md`、`experiments/superagent-p0/p4-production-work/PROGRESS.md`、`experiments/superagent-p0/p4-production-work/BLOCKED.md`。
- 未读取／写入生产 App、生产数据库、生产 vault、Inbox／Outbox 或发布目标；未启动／停止 Host、飞书 adapter、Worker、模型链或第二消费者；未读取凭据；未执行生产冻结、快照复制、drain 或对账。
- 代码与 Runbook 由 `0a7643ea92253653cd389178fa1a758a16d24a69 feat: 增加 P4 入窗与接管门禁` 提交，未推送；收尾文档由主 Agent 精确提交。

### 返工历史（保留，不掩盖）

1. **首轮 WAL P1**：`DatabaseSync(..., { readOnly: true })` 在活跃 WAL 数据库上改写 `-shm`，违反“除 output 外不写文件”。独立复现为主 DB／WAL 哈希不变、`-shm` 哈希改变且仍返回 `ready=true`。
2. **R1 修复**：打开 SQLite 前检查 `-wal`／`-shm`／`-journal` sidecar，并读取 SQLite 文件头拒绝 WAL 模式；不使用 `immutable`、临时库或备份写入。活跃 WAL 探针最终退出码 2、stdout／ready 报告为空、主 DB／WAL／SHM 哈希完全不变。
3. **R1 文档 P1**：为静态 DB preflight 把“停止旧消费者”放进第 3 节，而 freeze 在第 4 节，实际形成 stop→freeze 空窗。
4. **R2**：恢复 freeze 优先顺序，但随后暴露 `handover.pending` 与正常 frozen spool drain 的流程矛盾：preflight 把任何 pending 阻断，第 4.4 与 4.8 步无法同时满足。
5. **方案 A**：两轮返工后仍未收敛，主 Agent 停止并交 Owner；Owner 明确选择方案 A，通过 entry／takeover 分离解决，未删除 `handover_pending` blocker，也未放宽旧 generation、hold 或 unknown。

历史证据：`/Users/hoye/Documents/workspace/syno-p0-real-test/p4-preflight-unconverged.md`。

### 最终契约

- **entry（默认）**：不传 `--takeover-freeze-generation`；任何 handover pending 仍产生 `handover_pending`，`mode="entry"`、`drainRequired=false`。
- **takeover（显式）**：仅传正整数 `--takeover-freeze-generation` 时启用；只允许 host／handover／control 均 frozen、generation 一致且不矛盾、每个 pending 项为 `state="frozen"`、`freezeGeneration` 匹配、`needsReconciliation=false`、`autoReplay=false` 的 frozen spool。旧 generation、dispatching／hold、unknown、queued delivery、领域 queued、pending Decision、禁止 migration action、计数不一致等仍阻断。
- `ready=true + drainRequired=true` 只表示允许唯一新 Runtime 接管并必须按 Runbook drain 当前 generation 的 frozen spool，**不表示全部消息已结算**；drain 后仍须 pending=0 并核对 forwarded／hold 与 Task／delivery。
- 报告只输出 mode、generation、计数与 blocker codes，不输出 spool 正文、Memory 值或候选动作。

### 验证与证据

- P4 相关定向测试：**32 tests／32 pass／0 fail**（P4 18 项＋P3.4 既有 14 项）；日志 `/Users/hoye/Documents/workspace/syno-p0-real-test/p4-takeover-targeted-tests.log`。
- WAL 探针：`/Users/hoye/Documents/workspace/syno-p0-real-test/p4-takeover-wal-probe.json`。
- 主 Agent 独立全量门禁：**960 tests／941 pass／19 skipped／0 fail／0 cancelled／0 todo**；Repository verification **5169 files**；Active documentation check **8 files**；`git diff --check` 通过；日志 `/Users/hoye/Documents/workspace/syno-p0-real-test/p4-takeover-full-gate.log`。
- 综合证据：`/Users/hoye/Documents/workspace/syno-p0-real-test/p4-preflight-final-verification.json`（`ok=true`）。
- Runbook：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/P4-PRODUCTION-HANDOVER-RUNBOOK.md`。

### 当前限制

- 静态一致 DB 副本必须由主 Agent 在批准窗口内停止写者后准备；本工具不写快照、不做 WAL 恢复、不执行生产切换。
- sidecar／WAL 文件头守卫是打开 SQLite 前的前置检查；守卫后、读取期间出现新写者仍有 race。
- `-journal` 拒绝测试是前置 sidecar 守卫，不是真实 hot journal 崩溃恢复验证。
- 实际生产接管仍 `not_authorized / not_performed`；P5 未启动。

## 22. P4.2 只读证据与独立验收（通过，生产未执行）

### 范围与分工

- 白名单为 preflight 单行 export、`experiments/superagent-p0/production-handover-evidence.mjs`、`tests/superagent-p4-handover-evidence.test.mjs`、Runbook、`PROGRESS.md`、`BLOCKED.md`。OpenCode 只实现工具、隔离测试与文档；主 Agent 完成只读审查、独立反例、定向测试、全量门禁与精确提交。
- 未读取／写入生产 App、DB、vault、Inbox／Outbox 或凭据；未启动 Host／飞书／Worker／模型；未执行 freeze／drain／claim／send。
- 代码提交 `6a501001030c1d1f5b939eded5987ccea6636581 feat: 增加 P4.2 只读证据采集与独立验收`，未推送。

### 工具契约

- `collect --database <静态副本> --expect <manifest> --output <evidence>`：打开 SQLite 前复用 WAL／sidecar 守卫，只读采集 DB SHA-256、全局脱敏计数、每条消息的 event／inbox／Task／Attempt／run／delivery／spool／reply 安全字段与 artifact hash；stdout 只给短摘要，不给出 `ok`。
- `verify --expect --evidence --takeover-report [--output]`：不信任采集器的 `ok`／`passed`，独立重算 event／inbox 唯一已处理、domain 单 Task／Attempt／run／delivery、during forwarded spool、reply accepted 且无 domain 链、before／during／after owner 归属、Task completed 与 Attempt ID、inbox message／context、takeover generation／N／drainRequired、最终全局计数与 artifact hash。
- 退出码：collect 成功 0；verify `ok=true` 0、`ok=false` 3；参数／读取／JSON／结构错误 2。所有 output 用 `wx`，禁止覆盖。

### R1 返工（保留）

1. **owner 连续性**：R1 前 during 与 after 不同 owner、before 与 during 相同 owner 均可错误通过。R1 要求 during owner 全同、同阶段 reply owner 唯一、during／after 新 Runtime owner 集合完全相同、before 不得复用新 owner；通过 fixture 改为旧实例 freeze／intake／before、新实例 drain／unfreeze／after。
2. **Task／Attempt／inbox 链**：R1 前 Task 未 completed、`current_attempt` 与唯一 Attempt 不一致、inbox.messageId 属另一消息均可错误通过。R1 增加 `task_not_completed`、`attempt_id_mismatch`、`inbox_message_mismatch`、domain inbox context／version 校验。
3. **takeover／final 静态副本混用**：R1 前 Runbook 会在观察期后复用 takeover 前旧副本。R1 分离 `<TAKEOVER_STATIC_DB_COPY>` 与 `<FINAL_STATIC_DB_COPY>`，要求最终副本在 Owner 批准收尾步骤中重新制备，DB SHA 与 takeover 副本分开归档；观察期后 verify 失败按停止条件 freeze／对账，不为重跑验收重复 drain 或盲目重启。
- 反例与修复证据：`/Users/hoye/Documents/workspace/syno-p0-real-test/p42-main-contract-probe.json`、`p42-r1-main-original-probe.json`、`p42-r1-main-valid-owner-probe.json`；返工前副本 `p42-r1-baseline/`。

### 验证与证据

- R1 定向：**41 tests／41 pass／0 fail／0 cancelled／0 skipped／0 todo**；日志 `/Users/hoye/Documents/workspace/syno-p0-real-test/p42-r1-main-targeted-tests.log`。
- 主 Agent 独立全量门禁：**972 tests／953 pass／19 skipped／0 fail／0 cancelled／0 todo**；Repository verification **5171 files**；Active documentation check **8 files**；日志 `/Users/hoye/Documents/workspace/syno-p0-real-test/p42-main-full-gate.log`。
- 机器摘要：`/Users/hoye/Documents/workspace/syno-p0-real-test/p42-final-verification.json`（`ok=true`）。

### 当前限制

- 最终静态副本、expectation manifest 与 takeover 报告仍需主 Agent 在 Owner 批准窗口内制备；工具不猜测 message、generation、context、N 或 hash。
- sidecar／WAL 文件头守卫是打开 SQLite 前的前置检查，守卫后出现新写者仍有 race；`-journal` 守卫不等于真实崩溃恢复。
- `accepted` 不等于已读；工具不验证进程锁／端口、Owner 绑定或外部效果。
- 实际生产接管、观察期与真实生产证据均未执行，仍 `not_authorized / not_performed`；P5 未启动。

## 23. P4 实际生产窗口预检（freeze 前阻断，生产未变更）

- Owner 批准窗口为 `2026-11-20T04:56:31Z` 起 60 分钟，接管后观察 30 分钟，采用 Runbook 第 7 节全部停止条件，主 Agent 负责回退决策与执行。
- 只读源码与进程核查发现旧生产没有 P4 freeze／handover spool 接口，旧 adapter 的 pending／seen JSON 不是统一冻结队列；没有识别到 Runbook 所需的统一 SQLite 事实库与 host-status。现有 `real-feishu-client.mjs` 固定隔离测试 App、测试根、测试 DB 和凭据断言，不能直接用于生产接管。
- 证据定位：旧生产 `apps/syno/syno/server-api-allowlist.mjs:1-16`、`apps/syno/syno/runtime.mjs:1451-1455`、`packages/syno-core/feishu-channel.mjs:45-117,426-469`、`scripts/syno-launchd.mjs:303-317`；新候选 `experiments/superagent-p0/real-feishu-client.mjs:9-61`。
- 因无法满足 freeze 优先及完整窗口前预检，未停止旧服务、未创建第二消费者，未执行 DB 副本／checkpoint、preflight、快照、启动、recover、drain、unfreeze、vault 写入、投递或回退；观察期与 P4.2 collect／verify 未开始。
- 2026-11-20T04:59:49Z 旧生产 `com.syno.butler.host` 仍 loaded／running／healthOk；readiness、Store／Harness／Channels 均 ready，飞书 running／available／ownerBound 均为 true。未读取凭据或生产正文，未修改旧生产工作树。
- 机器证据：`/Users/hoye/Documents/workspace/syno-p0-real-test/p4-production-window-20261120T045631Z/preflight-blocked.json`。结论仅为 `authorized / blocked_before_freeze / not_performed`，不得写成 P4 接管或观察验收通过；P5 未启动。

## 24. P4.3 生产接线与隔离复演（通过，生产未切换）

### 范围与提交

- 本轮只补真实旧生产到新 Runtime 的切换入口，并在脱敏／合成的隔离副本上完整复演；未恢复旧 Task／Workflow／Session，未采用 stop→freeze，未触生产 App／DB／vault／凭据。
- 已验收提交（均未推送）：A `b467f98a309311e1b3fb7f42b9aec79dcada66c4`、B `24a631e46f472f57535695d1bfca56c79f823ac1`、C `fc703543c694e4ea85ce58dd6f917b7950402dd9`、D `c276cfaeacc5f93279a062e4a5bc8f00ff1b008d`。
- 最终机器摘要：`/Users/hoye/Documents/workspace/syno-p0-real-test/p43-final-verification.json`，状态 `code_and_isolated_rehearsal_complete`；生产 `switched=false`、`newWindowApproved=false`。

### 代码证据

1. **A 生产入口**：`real-feishu-config.mjs` 分离 `isolated-test` 与 `production`；生产必填 `SYNO_P0_APP_ID`／`ROOT`／`KNOWLEDGE_ROOT`／`LOCAL_DATA_ROOT`／`RUNTIME_ROOT`，路径必须绝对、runtime 必须位于 root 内、App 不得复用隔离测试 App；生产消费者锁为旧 adapter 的 `${stateFile}.lock`，不另建第二把锁。`real-feishu-client.mjs` 改为从该配置派生 DB、vault、状态与锁。
2. **B 旧 Host 桥**：`legacy-production-handover.mjs` 默认关闭，仅 `production` + `SYNO_P4_LEGACY_HANDOVER=enabled` 启用；缺任一配置即稳定错误码失败关闭，不回退无桥消费者。`SIGUSR1` freeze、`SIGUSR2` 只刷新状态；普通回复写旧 owner 的 event／inbox／reply 证据且不创建 domain Task／delivery；静态 `PATHS` 的 localData／knowledge 必须与 P0 配置同根，runtimeRoot 不强制统一；shutdown 固定 runtime → bridge → HTTP → host 租约；空库最小 rules 一次性幂等初始化。
3. **C 安全事实迁移**：`production-source-migration.mjs` 提供 `import`／`static-copy`；只导入去重水位、显式零安全清单、已启用发布映射、vault 哈希清单与 Owner 安全布尔；spool ID 从 seen／pending 排除，非 spool pending／active／unknown／未登记外部效果阻断；已知 spool 在 unfreeze 后仍禁止 immediate，adapter 恢复 pending 与 drain 共享防重；报告含真实 before／after DB hash 与源 hash（源不变），动作仅 `mapping_only` 等登记集合；副本非 WAL、通过 `integrity_check`、不改源。

### 复演证据

- CLI：`node experiments/superagent-p0/production-rehearsal.mjs run --output-root <绝对且不存在的新目录>`；证据根 `/Users/hoye/Documents/workspace/syno-p0-real-test/p43d-main-rehearsal-20261120-r1`，CLI 日志 `p43d-r1-main-rehearsal-cli.log`。
- 12 个阶段全 `ok`：before（旧 instance 普通回复）→ freeze（2 条 frozen spool、0 Task）→ retire → import（dedupeOnly=1、mappingOnly=1、seenExcludedSpool=2、blockedPending=0）→ takeover（ready、drainRequired、2 条）→ snapshot → lock（唯一 owner）→ drain（forwarded=2、pending=0）→ unfreeze（after accepted）→ queued（Context 1→2、remainingQueued=0）→ final（P4.2 verify）→ rollback（added=2、changed=0、deleted=0、externalEffects=0）。
- 5 个失败分支全 `blocked`：竞争锁（`PROCESS_LOCK_HELD`，状态文件不变）、dispatching／sending 只转 hold、delivery unknown、generation／N 不一致、跨对象／artifact 哈希。
- before 为旧 instance，during 与 after 为同一新 instance；全部持久化 JSON 已脱敏，不含 `PRIVATE_`、合成 Owner ID 或 Secret，无 DB sidecar。
- P4.2 独立 verify：`ok=true`、blockers 为空，messages=4、domainMessages=2、replyMessages=2、duringMessages=2、artifacts=5；报告 `p43d-r1-main-independent-verification.json`。

### 测试与门禁

| 提交 | 定向 | 全量 gate |
|---|---|---|
| A `b467f98a` | — | 985 tests／966 pass／19 skipped／0 fail |
| B `24a631e46` | 74/74 | 1005 tests／986 pass／19 skipped／0 fail |
| C `fc703543c` | 75/75 | 1019 tests／1000 pass／19 skipped／0 fail |
| D `c276cfae` | 77/77（R1） | 1021 tests／1002 pass／19 skipped／0 fail |

Repository verification **5179 files**、active docs **8 files**；日志绝对路径见最终机器摘要。

### 返工

- D 仅 1 轮：R0 的持久化 `host-status.json` 含合成 Owner ID，且测试漏扫 runtime 目录；R1 在旧桥停止状态校验后归档脱敏版本（保留 stopped／pending／generation），工具与测试改为递归扫描全部 JSON。R0 备份保留在 `p43d-r0-backup/`。

### 限制

- 复演使用脱敏／合成输入，**不构成生产授权**，不证明生产已接管、真实消息已读、真实断电或 macOS 登录冷启动。
- 真实生产的 before 证据必须来自旧桥真实 event／inbox／reply；复演或测试 fixture 不能冒充。
- 实际生产窗口、30 分钟观察、回退均未执行，生产仍未变更；未推送，P5 未启动。

## 25. P4 真实生产窗口（freeze 前阻断，已回退）

- 授权窗口为 `2026-11-20T09:22:33Z` 至 `2026-11-20T10:22:33Z`，接管后观察 30 分钟。候选配置 lint 与路径门禁通过；带桥旧 Host 最终启动后飞书渠道正常，但 Harness 因 P0 vendor 缺少多个 `lib/typert.host.js` 构建产物持续 degraded，未在窗口内修改代码或 vendor。
- 旧安全事实只读核验得到 `activeWorkflows=2`、`terminalWorkflows=21`、`pendingDecisions=0`、`consumedDecisions=7`。activeWorkflows 非零直接违反 Runbook 第 5 节，故在 freeze 前阻断；其余未证明项不猜零。
- 部署过程中 launchd bootstrap 出现 I/O 错误，bootout 后旧 server 一度遗留；所有过程与 PID 均保留在机器证据中。回退后 P0 Host 进程为 0，原 Host 的 Store／Harness／Channels 全 ready，飞书 running／available／ownerBound 均为 true。
- 未发送 before／during／after，未 freeze、import、static-copy、takeover preflight、启动新 Runtime、开始观察或运行 P4.2；未推送，P5 未启动。证据：`/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T092233Z/incident.json`。

## 26. P4 窗口阻断的非生产 remediation（通过，未接管）

- 两个疑似活跃 Workflow 实际都是 `failed_terminal`，只是旧迁移记录缺 `terminalAt`；按系统既有 `TERMINAL_STAGES`，23 条全部终态，active=0，无需修改生产事实。
- 候选同版本 DSH 子模块使用指定 pnpm 11.7.0 离线构建成功，355 个 client artifacts，缺失的 typert host 文件已存在；日志为 `dsh-candidate-build-r2.log`。
- JobStore 全量只读统计 pending／awaiting_approval／running／waiting_provider／validating 均为 0；pending Decision、unknown effect、未映射启用外部效果也均为 0。264 个成功发布对象生成 792 条完整版本化映射，三份输入均通过 C 校验器。
- 输入根：`/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T092233Z/preparation-r3`；汇总：`next-window-readiness.json`。选定 during 为显式 documentId 的无匹配只读知识查询，不发送 vault 正文。
- 未重启生产、未 freeze、未接管、未观察；必须另行批准新窗口，建议至少 90 分钟。未推送，P5 未启动。

## 27. P4 真实接管与最终验收（接管及观察已执行，P4.2 未通过）

### 授权、Provider 修复与真实消息

- Owner 批准窗口 `2026-11-20T10:14:56.045Z` 至 `2026-11-20T11:44:56.045Z`，接管后观察 30 分钟，采用 Runbook 全部停止条件，由主 Agent 决策停止与回退。证据根：`/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z`。
- 两条 before 最初均为 `waiting_provider / HARNESS_ATTEMPTS_EXHAUSTED`；DSH 原始 `turn/end` 为 `MISSING_CREDENTIAL`，不是模型额度或飞书投递故障。候选 Host 默认读候选 `.env`，未加载既有生产 `.env`。修复提交 `47dee92f119e702ce53e585637015727845fbfc2` 允许 `SYNO_SECRET_ENV_FILE` 显式选择既有凭据文件；36 项定向测试通过，未复制、读取或输出密钥。重启后 `job_<redacted>`、`job_<redacted>` 均正常 completed，失败现场保留。

| 角色 | messageId | 独立核验结果 |
|---|---|---|
| before 1 | `om_<redacted>` | 旧 owner 的 event=1、inbox=1、accepted reply，无 domain chain |
| before 2 | `om_<redacted>` | 同上；第二次发送及初始失败均保留 |
| during | `om_<redacted>` | generation=1 frozen spool→forwarded，attempts=1；新 owner 的 event／inbox／Task／Attempt／run／delivery／artifact 完整 |
| after | `om_<redacted>` | 新 owner 的 accepted reply=1，但 **event=0、inbox=0** |

- before owner=`<redacted-uuid>`；during／after owner=`<redacted-uuid>`，归属连续且新旧不同。accepted 只表示投递被接受，不证明用户已读。

### 接管、观察与最终独立验收

- generation=1 时 during 先只入 frozen spool；旧消费者实际退出后，`p4-import-report.json` 为 `ok=true`，dedupe_only=211、mapping_only=792。接管静态副本与 takeover preflight 通过，`ready=true`、`drainRequired=true`、`takeoverFrozenSpools=1`。814 个 vault 文件（其中 338 个 Markdown）逐项哈希一致，回退 delta added／deleted／changed 均为空。
- 新 Runtime 唯一持锁并完成 recover→drain→unfreeze→ready；during spool forwarded、pending=0。竞争实例以 `FEISHU_PROCESS_LOCKED` 退出码 1 失败，在役 Host 未受影响。旧 Host SIGTERM 后遗留、核实精确 PID 后 SIGKILL 的过程已记录；新 Host 最终正常 SIGTERM 退出。
- `observation-complete.json` 为 `ok=true`、`observedMinutes=30`、failures 空。观察脚本启动较晚，最初两条样本均为 elapsedMinutes=5；最终覆盖完整 30 分钟，不宣称严格从第 0 分钟采样。各样本无 unknown／hold／active／queued／pending Decision／双消费者。
- 观察后停止唯一新 Runtime，制备独立 `final-static.db`，SHA-256=`9d070fe465c9937e052c8bf940049875c12642db5eda5a5efd2983a44e45a763`。P4.2 collect 生成 `evidence.json`，messages=4、domainMessages=1、replyMessages=3、duringMessages=1、artifacts=1。
- **最终 verify 未通过**：`verification.json` 为 `ok=false`，blockers 仅 `event_missing=1`、`inbox_missing=1`。其余 owner／generation／N／Task／Attempt／delivery／artifact 没有 blocker；不得因观察通过而宣称 P4.2 通过。

### 当前停止状态与后续门槛

- 新 Runtime 已 freeze generation=2，Host／adapter stopped；launchd `com.syno.butler.host` 为 `active count=0 / state=not running`。handover pending=0、hold=0、unknown=0，服务刻意未恢复。
- 未修改 expectation、未补写 after event／inbox、未重跑 drain、未执行 `launchctl kickstart`。机器汇总为 `final-blocked.json`，完整交接为 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/P4-PRODUCTION-HANDOFF-20261120.md`。
- 普通 immediate reply 缺 event／inbox 的红灯测试与最小修复已于 2026-11-21 完成隔离验收，见第 28 节；新生产验证仍需要新的 Owner 窗口与新的 after，不能复用本轮消息冒充修复后证据。机器断电与 macOS 登录冷启动仍未验收；未推送，P5 未启动。

## 28. P4.2 普通回复 event／inbox 修复（2026-11-21，隔离通过，生产未验证）

### 根因与修复

- 根因保持第 27 节定位：`real-feishu-client.mjs:1610-1623` 的 `dispatchMessage` 直接调用 `handleMessage` 后进入 `sendReply`，没有像旧桥 `legacy-production-handover.mjs:192-214` 那样先写 event／processed inbox。
- 修复提交 `fcac7c3f0 fix: 补齐普通回复的 event/inbox 证据链`，只含 `host-handover.mjs`、`real-feishu-client.mjs`、`production-rehearsal.mjs` 与新增 `tests/superagent-p4-reply-evidence.test.mjs`；未推送。
- `host-handover.mjs` 新增 `recordReplyEvidence` 与 `sendOrdinaryReply`：普通回复在 `sendReply` 前写保留源 `legacy-handover` 的 event + processed inbox，复用 `route:legacy-reply:<appId,messageId>` 幂等 route；已有成对证据时 no-op，证据不完整时失败关闭；不创建 Task／Attempt／delivery。
- `real-feishu-client.mjs` 的 `dispatchMessage` 改用 `sendOrdinaryReply`；`production-rehearsal.mjs` 的 after 也走同一路径，删除原先手工补 event／inbox 的 fixture。修复没有改 `sendReply` 的通用状态机，既有 P3 cutover 与 legacy 桥测试未回归。

### 红灯测试

- 新增 `tests/superagent-p4-reply-evidence.test.mjs`：
  - 修复前调用不存在的 `sendOrdinaryReply`／无 event、inbox，测试失败；
  - 修复后断言 `deliver` 执行前 event=1、processed inbox=1、context 为 `capture:legacy_reply_<messageId>`；
  - 重复回复仍只投递一次，event／inbox 不重复；
  - 已有 event／inbox 的 fixture 不被重复写入，context 不被替换；
  - 普通回复不创建 Task／Attempt／delivery。

### 隔离复演与门禁

- P4.3 隔离复演输出根：`/Users/hoye/Documents/workspace/syno-p0-real-test/p4-reply-evidence-fix-20261121-r1`。
- `rehearsal-summary.json` 为 `ok=true`、`synthetic=true`、`generation=1`；12 阶段全 `ok`，5 个失败分支全 `blocked`；`claims` 仍为 `realProductionSwitched=false`、`realMessageRead=false`、`externalEffects=0`。
- `final/verification.json` 为 `ok=true`、blockers 空，messages=4、domainMessages=2、replyMessages=2、duringMessages=2、artifacts=5；after 的 event=1、inbox=1、accepted reply=1，无 Task／Attempt／delivery。
- 定向测试 61/61 通过；`npm run gate` 通过：1024 tests／1005 pass／19 skipped／0 fail／0 cancelled／0 todo；Repository 5181 files、active docs 8；日志 `.../p4-reply-evidence-fix-20261121-r1/final-full-gate.log`。

### 生产状态

- 该隔离阶段结束时未启动、未恢复、未重跑真实 after；launchd 仍为 `active count=0 / state=not running`。
- 该状态已被 2026-11-21 新生产修复窗口取代，见第 29 节；旧 after `om_<redacted>` 仍只能作为历史失败证据。
- 未推送，P5 未启动；机器断电与 macOS 登录冷启动仍未验收。

## 29. P4.2 生产修复窗口（2026-11-21，通过，服务已恢复）

### 窗口与消息

- 窗口 `2026-11-20T16:36:28Z` 至 `2026-11-20T18:06:28Z`，证据根 `/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-repair-window-20261120T163628Z`。
- 窗口前 takeover 报告：`ready=true`、`mode=takeover`、`generation=2`、`takeoverFrozenSpools=0`、`drainRequired=false`、blockers 空。
- 新 after `om_<redacted>`，文本 `P4-REPAIR-AFTER-20261121-0040`，`receivedAt=2026-11-20T16:44:09.245Z`，`acceptedAt=2026-11-20T16:44:09.939Z`。由 Owner 授权、通过 bsk 从已登录飞书账号发送；不是旧 after。
- 复用旧 before 1 `om_<redacted>`、before 2 `om_<redacted>`；旧 during／domain 证据仍来自首次窗口，本窗口不重跑 domain 链。

### 观察与最终验收

- 新 Runtime PID `77904`、instance `<redacted-uuid>`；30 分钟观察 `16:44:09.939Z` 至 `17:14:09.939Z`，`observation-complete.json` 为 `ok=true`、`observedMinutes=30`、failures 空；7 次采样无 unknown／hold／active／queued／pending Decision／双消费者。
- 停止后 freeze generation=3，Host／adapter stopped，无残留进程或 8888 监听。final 静态副本 `final-static.db` SHA-256 `f00b7b995815190ee77d9f9f69a6ac9ac5b5455eda606209b21532e7d537f72c`；非 WAL、`integrity=ok`、无 sidecar。
- `verification.json` 为 `ok=true`、blockers 空：messages=3、replyMessages=3、duringMessages=0、artifacts=0。after event=1、inbox=1、accepted reply=1，owner 为新实例；两条 before event／inbox／accepted reply 各 1，owner 为旧实例。
- 本窗口是 after 修复验收，不重跑旧 domain 链；旧失败 after 证据保留，新 expectation 不包含它。

### 恢复与当前状态

- `launchctl kickstart` 后 PID `85264`、instance `<redacted-uuid>`、generation=3；launchd `active count=1 / state=running`，adapter running／available／ownerBound=true，pending=0、hold=0。最终状态 `final-host-status.json`。
- **P4.2 生产验收通过，服务已恢复。** 未推送，P5 未启动；机器断电／macOS 登录冷启动、accepted≠已读、多批 >100 frozen drain 等非阻断限制仍适用。
