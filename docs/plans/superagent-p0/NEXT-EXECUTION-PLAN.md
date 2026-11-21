# Syno Super Agent：新架构下一步执行 Plan

> 公开版脱敏说明：真实 Feishu 消息／实例／Job／文档 ID 已替换为占位符；完整证据保留在本地。

- 日期：2026-11-19（2026-11-20 更新 P3.4、P4 准备阶段、P4.2、实际窗口、P4.3 与真实接管最终阻断）。
- 状态：**P3.0–P3.4、P4 准备阶段、P4.2 工具、P4.3 与 P4.2 生产修复已完成；2026-11-21 新生产窗口 `verify.ok=true`，服务已恢复。** 2026-11-20 首次窗口的 after 缺 event／inbox 失败现场保留；2026-11-21 新 after 的 event=1、inbox=1、accepted reply=1，P4.2 生产验收通过。P5 主动发现仍未启动。
- 已替代：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/P3-MIGRATION-PLAN.md` 中的旧能力等价与旧 Runtime 迁移路线。
- 保留证据：P0–P2 真实链路，以及此前 M1–M4 的合成迁移测试；它们只作为内核与故障语义证据，不再决定产品能力范围。

## 1. Owner 决策与边界

1. **不做旧能力等价，不迁移旧工作流。** 旧 Runtime 的待办、记忆、附件、卡片、发布等实现不构成新产品的必做清单。
2. 新能力必须服从 **Root Router → Domain Specialist → Object Context**；不得为了补齐旧功能绕开对象路由，直接把工具堆回单 Agent。
3. **保留本地 Markdown vault 与必要数据安全事实。** 旧业务正文不因代码重构删除；旧 Job／Workflow／Session 只读归档，不在新 Runtime 中恢复执行。
4. 用户只面对一个管家。OpenCode、Pi、DSH、Claude Code 均是可替换 Worker，不是主 Runtime，不向用户暴露 Worker 管理。
5. 每个领域仍走 `event → context → task → attempt → candidate → Result Lane → delivery`。Worker 自报成功不能直接结算业务 Task。
6. 继续使用独立测试 App、测试账本和测试 vault；真实模型测试只用 OpenCode Go DS 4.1 Flash 或同订阅 Pi，不消耗 Claude Code Worker 测试额度。
7. 不触生产切换、正式 vault 写入或自动推送；生产接管必须后续单独授权。

## 2. 新产品能力地图

| 层／领域 | 职责 | 不允许混入 |
|---|---|---|
| Root Router | 识别继续／新建／切换／追问；选择领域和对象；持久化路由决定 | 不生成领域正文，不直接调用 Worker |
| Knowledge Specialist | 公开资料收录、对象知识查询、引用与版本复核 | 不把文章 A 的正文、引用或 Session 注入文章 B |
| Idea Specialist | 新建想法、连续讨论、比较与沉淀想法候选 | 不继承某篇文章或项目的控制会话 |
| Project Specialist | 项目目标、计划、执行 Attempt、产物与状态 | 不把项目任务写进文章或想法对象 |
| Decision Lane | 多候选追问、受保护动作确认、精确 ID/version | 不自动猜对象，不用旧 Attempt 确认新动作 |
| Memory Specialist | 明确长期偏好的提出、后续确认、召回与失效 | 未确认候选不得成为高信任事实 |
| Runtime Host | 唯一业务事实源、调度、验收、效果对账与投递 | Worker 状态不得成为第二权威 |
| Proactive Discovery | P5 的公开来源订阅、变化检测与静默候选 | 不直接写正式知识或自动启动未授权执行 |

待办、附件、Wiki／图片／目录发布等不再因“旧系统曾经有”而成为阻断项。以后只有新产品明确需要时才按同一领域规范增加；启用发布时必须另接受控测试目标验收。

## 3. 执行顺序

### P3.0：统一 Runtime 与 Root Router 收敛（已完成）

**目标：** 在增加新领域前，把当前 capture／knowledge 两个实验入口收敛为一个宿主、一个 Root Router、一个 Specialist Registry、一个 SQLite 事实账本和一个测试 vault。

工作项：

1. 建立统一 Runtime 入口和 Specialist 注册契约；收录与知识查询改为注册领域，不由飞书客户端硬编码分散持有生命周期。
2. 保持现有原生 ApplyRoute、Task／Attempt、Result Lane 和原子 delivery，不建立第二状态库。
3. 补同对象 queued 事件的自动唤醒：前序 Task 结算后按原事件领取下一 run；不得提前推进 Context，不得重复调用模型。
4. 统一超时、取消、恢复、unknown 对账和通知出口；补 Host 重启后的 queued／claimed 状态视图。
5. 用真实测试飞书复跑公开收录、A/B 知识查询、同对象续接、歧义和同来源并发。

验收：

- 一个宿主进程能同时路由收录与知识查询，两个领域共用事实账本但对象隔离。
- 同对象两个请求最终顺序完成，中间无需用户重发；两个产物独立，Context 为 1→2。
- 重放已处理消息不新增 Task、模型调用或通知；unknown 仍禁止自动重试。
- 现有 P1／P2 回归和全量门禁 0 失败；拆分提交并保存真实消息与文件哈希证据。

完成记录（2026-11-19）：

- 统一入口为 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/native-butler-runtime.mjs`，纯 Root Router 为 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/experiments/superagent-p0/root-router.mjs`；capture／knowledge 从同一 Registry 获取并共享 SQLite 与测试 vault。
- P1／P2／P3.0 定向测试 **14/14 通过**（P1 6 + P2 6 + P3.0 2）。真实飞书最终账本中两条收录的 Context 为 1→2，第二条先以 `queued` 持久化且无 Task／Context 推进，前序完成后按原消息身份自动续接；知识 A1／B1／A2 的 Context 分别为 1／1／2。
- 独立只读审计确认 5 个 Task／Attempt／原生 run 全完成、5 个 delivery 全 accepted，所有产物 SHA-256 与验收记录一致；歧义查询事实数保持 51→51。证据为 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-runtime-final-audit.json` 和 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-runtime-final-queued-snapshot.json`。
- 全量门禁 **868 项，849 通过、19 跳过、0 失败**；Repository 5135 files、active docs 8 files 检查通过。早期 Worker 失败账本与测试客户端调度修复过程均保留，没有手工改写状态或盲目重放。
- **未做真实 Host 重启后的 queued 恢复验收**；本轮只证明同进程自动唤醒和规则配置重启幂等。Host 重启、queued 自动唤醒与 unknown 对账的联合演练仍按第 P3.4 节执行，不以本轮单元测试冒充。
- 详细验证记录见 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/P0-VERIFICATION.md` 第 16 节，机器证据见 `/Users/hoye/Documents/workspace/syno-p0-real-test/real-feishu-evidence.json`。

### P3.1：Idea Specialist 纵向切片

**目标：** 解决“文章还没消化，新的想法又要讨论”的对象混杂问题，验证新架构不是只能做收录。

工作项：

1. 定义 `idea:<ideaId>`、对象索引、版本化候选格式和本地 Markdown 保存规则。
2. 支持“新建想法”“继续想法 <id>”“比较想法 A/B”；多候选或无明确对象时只追问，不创建执行任务。
3. 用真实 Worker 生成想法候选，Result Lane 独立核对 ideaId、输入版本、正文引用和产物哈希。
4. 验证 Idea A 多轮续接时，Idea B、文章 C、项目 D 的 Context、Session、产物和通知均不串联。
5. 验证 Worker 超时、取消、写盘后崩溃恢复、旧 Attempt 晚到和重放。

验收：

- 真实飞书完成两个独立想法及其中一个的第二轮续接。
- A/B 正文、引用、Context、Attempt 和 delivery 无交叉；歧义零任务副作用。
- 更换 OpenCode／Pi 后同想法历史连续，Worker 不需要成为长期 Session 权威。
- 本地候选可重读，Result Lane 不通过时没有成功通知。

完成记录（2026-11-19）：

- 代码检查点：`bbe0cffe6 feat: 增加 Idea Specialist 确定性内核`、`5f7298b01 feat: 接入 Idea 真实 Worker 与测试客户端`；未推送。文档提交尚未发生，本文不声称文档提交 hash。
- 确定性验收：Idea 定向 **18/18**；P1／P2／P3.0／P3.1 合跑 **32/32**，0 fail／0 skipped；`node --check`、`npm run verify`、`git diff --check` 通过。全量 gate **886 项，867 通过、19 跳过、0 失败**；Repository 5143 files、active docs 8 files。
- 真实飞书使用独立测试 App、`/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-idea.db` 和测试 vault，共 **6 个 Task**：ALPHA `idea-3c8bfc6ccb9f95aa` new v1 → continue v2／v3／v4；BETA `idea-e017648029516808` new v1；A/B compare 使 ALPHA Context 进入 v5。BETA 一直 `latestVersion=1`。全部 Task／Attempt／run 完成、Result Lane passed、delivery accepted（`may_send=false`、`provider_message_id=null`）；prompt、generatedText、冻结输入、引用 offset／end／excerpt 与文件 SHA-256 均独立核验。独立审计为 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-idea-real-audit.json`。
- 真实 queued：第四条 ALPHA continue（v4，`om_<redacted>`）在第三轮执行时持久化为 `queued`，当时未创建 Task、未推进 Context；前序完成后同进程自动 drain 完成。真实飞书只有这一条 queued 证据；“同对象两条 queued 连续自动 drain”是确定性回归覆盖，不是真实飞书两条。
- 歧义与未知各一次（`om_<redacted>`、`om_<redacted>`）：只追问，业务 factCount 均保持 **74→74**，无 Task／Worker。比较截图 `/Users/hoye/Documents/workspace/syno-p0-real-test/feishu-p3-idea-compare.png`；未知追问截图 `/Users/hoye/Documents/workspace/syno-p0-real-test/feishu-p3-idea.png`。
- Worker 切换：停止独立测试客户端后，本地使用同一 `p3-idea.db`，同一 ALPHA 由 OpenCode v4 续接到 Pi v6（比较已占 v5）。Pi `providerRequests=1`、Result Lane passed、本地 delivery accepted、`feishuCalls=0`、usage／cost=`not_returned`。首次烟测脚本误预期 v5；没有重跑模型，依据既有请求、证据与 SQLite 对账为正确 v6。Pi 的 generatedText 自称 v5，但权威 Context、候选元数据和路径均为 v6，正文标签不作为业务事实。证据为 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-idea-worker-switch/2026-11-19T10-57-42-778Z/result.json`。
- 确定性覆盖继续包括：A/B、知识 C、合成 `project:d` 隔离；重放、取消、Worker timeout、写盘后退出恢复、旧 Attempt、Worker done 不结算 Task、空正文、跨对象／伪造引用。**真实 Host 重启后的 queued 恢复仍 `not_performed`，归入 P3.4。**
- delivery accepted 不代表已读；usage／cost 未返回不等于 0 或扣费已核验。P3.0 两份失败账本继续保留，不描述为成功账本。P3.1 真实客户端与 bsk 会话均已停止；未触生产 App／DB／正式 vault，未推送。
- 详细记录见 `P0-VERIFICATION.md` 第 17 节；机器汇总见 `real-feishu-evidence.json` 的 `p3.ideaSpecialist`。

### P3.2：Project Specialist 纵向切片（已完成）

**目标：** 验证项目目标与多步执行可以和文章、想法一样被独立路由，而不是共享一个总聊天上下文。

工作项：

1. 定义 `project:<projectId>`、项目目标、计划版本、Task 依赖和产物清单。
2. 先只支持一个明确、可沙箱执行的小型项目任务；不开放通用终端或生产源码写入。
3. 项目计划变化必须产生新版本；旧 Attempt 不能覆盖新计划。
4. 验证项目 A 慢时项目 B、想法 C 可完成；取消只影响指定项目 Task。
5. 验证执行结果经 Result Lane 后才生成用户回执。

验收：两个项目独立、计划版本可追踪、产物可重读、故障恢复不重复外部效果。

完成记录（2026-11-19）：

- 代码检查点：`3f9508627 feat: 增加 Project Specialist 确定性内核`、`1e3dd8835 feat: 接入 Project 真实 Worker 与测试客户端`；未推送。本轮只有一轮旧 Registry 断言最小返工（`tests/superagent-p3-runtime.test.mjs:43` 预期数组增加 `project`），此后无 P0／P1 返工；本文不预写文档提交 hash。
- 确定性验收：Project 定向 **17/17**；P1／P2／P3.0／P3.1／P3.2 五文件合跑 **49/49**，0 fail／0 skipped。全量 `npm run gate` 通过：**903 项，884 通过、0 失败、0 cancelled、19 跳过、0 todo**；Repository 5150 files、active docs 8 files，`git diff --check` 通过。
- 本地真实 Worker（不接飞书，`feishuCalls=0`、`modelCalls=1`、usage／cost=`not_returned`）：OpenCode new `project-451c24e949b7ba1b` v1，manifest `eb26ba48…9a8c22`；Pi revise `project-f237daf1187a31e2` v1→v2，manifest `6368eed4…13a708`，v1 哈希未变。两者 Result Lane passed、delivery accepted；Pi evidence 为 `providerRequests=1`、`toolEvents=0`。
- 真实飞书使用独立测试 App 与 `/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-project.db`，项目根为 `runtime/p3-project-artifacts`。ALPHA `project-8a5a1b3c61f28bc7` 版本 `[1,2,3]`、`latestVersion=3`、Context=3；BETA `project-7db58ebce60250b6` 仅 v1；想法 C `idea-8c738ac2620a34a8` 独立结算。四个项目 Task 与想法 Task 全部 completed，Attempt／run done，Result Lane passed，delivery accepted（`may_send=false`、`provider_message_id=null`、`at_least_once`）；全部产物独立重读核对路径、依赖、字节数与 SHA256，v3 冻结 previous 指向 v2 全部产物且旧版未改写。独立审计 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-real-audit.json` 为 `ok=true`、6 组检查通过、`factCount=88`。
- 真实 queued：快照 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-real-queued-snapshot.json` 记录 v2 running、v3 run 5 queued、`v3Task=null`、冻结输入 null、`latestVersion=1`、`factCount=58`；v2 于 `12:07:18.390Z` 完成，v3 于 `12:07:19.116Z` claim、`12:08:32.853Z` 完成，最终 `factCount=88`。仅声称同进程自动 drain；**真实 Host 重启后的 queued 恢复仍 `not_performed`，归 P3.4**。真实飞书 crash 注入未触发，故障恢复证据来自确定性进程退出与同一 SQLite 重开。
- 歧义 `om_<redacted>`（multiple-projects）factCount **75→75**；未知使用单独补发的 `P32-UNKNOWN-2015-R2`（`om_<redacted>`，`project-0000000000000000`）factCount **88→88**。两者均无 Task、Worker evidence、项目索引或 Context 推进。首轮页面回复归属不一致，未知以 R2 单独重发，审计只采用消费者日志中的独立 unknown 事件；不猜测根因或写成已确认代码缺陷。
- 页面证据：`/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-v3-notification.html`、`p3-project-real-v3-complete.png`、`p3-project-real-ambiguous.png`、`p3-project-real-clarifications.png`。accepted 不代表已读；usage／cost 未返回不等于 0，也未核验 Go 控制台扣费。独立飞书客户端已停止（`running=false`），无第二个测试消费者，bsk 会话已停止；未触生产 App／DB／正式 vault，未推送。
- 详细记录见 `P0-VERIFICATION.md` 第 18 节；机器汇总见 `real-feishu-evidence.json` 的 `p3.projectSpecialist`。

### P3.3：Decision Lane 与 Memory Specialist（已完成）

**目标：** 为跨领域追问和长期偏好建立统一规则，而不是每个 Specialist 各自实现一套。

验收：

- 两个以上候选必须追问，回答只消费对应 Decision；重复确认零新增效果。
- 删除、覆盖等受保护动作绑定精确对象与版本。
- 记忆候选必须在后续真实 Owner 消息中确认才生效；未确认记忆不注入 Worker。
- 已确认记忆按授权范围召回，不跨对象泄漏私有正文；纠正和遗忘后不再作为有效高信任事实。

完成记录（2026-11-19）：

- 代码检查点：`d04a815cc feat: 增加 Decision Lane 与 Memory 确定性内核`、`00d631dc3 feat: 接入 Memory 真实 Worker 与测试客户端`；两笔代码提交均已完成，正式文档尚未提交，未推送。本文不预写文档提交 hash。
- 确定性验收：P3.3 定向 **28/28**；P1／P2／P3.0／P3.1／P3.2／P3.3 六文件合跑 **77/77**，0 fail／0 skipped；本轮 JS `node --check` 全部通过。最终 `npm run gate` 通过：**931 项，912 通过、0 失败、0 cancelled、19 跳过、0 todo**；Repository 5159 files、active docs 8 files，`git diff --check` 通过。
- 返工：R1 修复 completed Task 快路径绕过业务对账，以及 recalled memory 在 Worker 运行期间被纠正／遗忘／撤销／替代后仍被结算；R2 只修烟测脚本 `messageId` 超出 48 字符上限。两轮之后未再新增 P0／P1。
- 真实 Pi Memory 烟测（不接飞书）：`modelCalls=1`、`providerRequests=1`、`feishuCalls=0`、`toolEvents=0`；Memory `memory-a370104024f4b799`／Decision `decision-a370104024f4b799`，scope `idea:idea-e4636573441ffce8`；召回 owner 1 条＋精确 idea 2 条（共 3 条 active），pending／旧版／revoked／其他 Owner／其他对象均排除；Result Lane passed、pending v1、delivery accepted、`providerMessageId=null`；候选文件 SHA-256 `241661ed5197f1a1451a673efc35d8cd179bbaab392f772420d38ac1aae9c492`；usage／cost=`not_returned`。证据为 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-memory-worker-smoke/pi-2026-11-19T15-51-22-774Z/result.json`。
- 真实飞书 Decision Lane：Idea A `idea-82e425fd3e0ee887` 初始 v1，选择 Decision 后推进到 v2（选择消息 `om_<redacted>`，v2 SHA-256 `3119d127636b4d96b257c5625ce013987967275ef2f72be6983021b90d0fdf78`）；Idea B `idea-9910ed53a0fdd38b` 始终 v1。多候选 `om_<redacted>` 生成 `decision-8c286f4d29659f6b`（candidate-1=A／candidate-2=B，均预期 v1），追问只新增 Decision 事实，factCount **27→28**，无领域 Task／Worker；candidate-1 被后续消息消费后只推进 A，另一条消息选择 candidate-2 时如实回复该 Decision 已被消费、零业务。
- 真实飞书 Memory：4 条真实 OpenCode proposal（owner、Idea A、Idea B、最终 Idea A）均 Result Lane passed、delivery accepted、usage／cost=`not_returned`；activate／correct／forget 不调用模型。owner `memory-6908bdaca5c4dd53` v1 pending→v2 active；Idea A `memory-0853828b126341eb` v1 pending→v2 active→纠正 v3 active（v2 superseded，pending v1 留史）；Idea B `memory-6d1515c53167159d` v1 pending→v2 active→遗忘 v3 revoked（v2 superseded）；最终 Idea A `memory-e32ee0b11adba87a` v1 pending→v2 active，其 Worker request 只含 owner active v2＋A corrected active v3，不含 A 旧值／A pending／B revoked canary 或其他对象正文。重复确认同一 Decision 时 SQLite facts／events／records／runs／run_events 全部零增长，facts **181→181**。
- 独立审计 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-decision-memory-real-audit.json` 为 `ok=true`：13 Task／13 Attempt／13 原生 run 全部完成，13 条 verification 全为 `host_result_lane` passed，13 条 delivery 全 accepted（`may_send=false`、`provider_message_id=null`、`at_least_once`）；13 份产物独立重读 SHA-256 全部匹配；7 个 Decision（1 route.select＋4 activate＋1 correct＋1 forget）、6 条 `memory_apply`；4 个 Memory index 与 10 个版本文件与 SQLite 一致。
- 页面证据 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-decision-memory-real-final.png`；测试客户端已正常停止（`running=false`、`available=false`、`stoppedAt=2026-11-19T16:18:04.390Z`），无第二个测试消费者，bsk `zwnx` 已停止。未触生产 App／DB／正式 vault，未推送。
- **真实 Host 重启后的 queued 恢复仍 `not_performed`，归 P3.4**；真实客户端 crash 注入未触发，进程恢复证据只来自确定性测试。`accepted` 不代表已读；usage／cost 未返回不等于 0，也未核验 Go 控制台扣费。
- 详细记录见 `P0-VERIFICATION.md` 第 19 节；机器汇总见 `real-feishu-evidence.json` 的 `p3.decisionMemory`。

### P3.4：生产候选与切换演练（已完成）

**目标：** 只验证新架构产品，不再做旧能力迁移。

工作项：

1. 汇总统一状态视图：各领域 active Task、queued、unknown、待决与待投递。
2. 演练冻结新入站 → 旧测试消费者退出 → 新测试消费者独占接管；窗口前／中／后的消息均有唯一归属。
3. 演练 Host 重启、queued 自动唤醒、通知退避和 unknown 对账；机器级断电与 macOS 登录冷启动单列证据。
4. 只迁移数据安全必需品：Markdown vault、Owner 绑定、入站去重水位和已启用外部效果的映射。旧 Task／Workflow／Session 只读归档，不恢复执行。
5. 回退以数据对账为前提；不能安全吸收新期间增量时保持停止并前向修复，不强行双消费者运行。

验收：新产品能力清单逐项通过；无旧能力等价矩阵要求；无双消费者、无跨对象污染、无未解释通知或任务缺口。

完成记录（2026-11-20）：

- 代码检查点：`9fac4c519154e452e2cddbe30531ed68f518aac8 feat: 增加 P3.4 切换与恢复确定性内核`、`7751be381cb1618ed2acdcf63af2fee74151ed6e feat: 接入 P3.4 真实 Host 切换控制`、`a4cfda931 fix: 明确 Idea 引用必须唯一`、`cd4e0d4f2 feat: 支持 Idea 同消息恢复重放`；均已提交，未推送。本文不声称文档提交 hash。
- 统一隔离 DB 为 `/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-decision-memory.db`；最终独立审计 `/Users/hoye/Documents/workspace/syno-p0-real-test/p34-final-independent-audit.json` 记录 facts=**278**、累计 **19** 个 Task 全 completed、**19** 个 delivery 全 accepted，active Task=0、queued=0、delivery queued=0、unknown=0、pending Decision=0、handover hold=0。`accepted` 不代表已读，`provider_message_id=null`，capability=`at_least_once`。
- 本轮 6 个领域 Task 与 2 个立即 reply 均有唯一消息身份：A 恢复 `om_<redacted>`（Context v3，Attempt `attempt-14-1`，run 14）；B 重启恢复 `om_<redacted>`（Context v4，Attempt `attempt-15-1`，run 15）；退避 1 `om_<redacted>`（Context v5，run 16）、退避 2 `om_<redacted>`（Context v6，run 17）；before `om_<redacted>`、during `om_<redacted>`（知识 Context v1，run 18）、after `om_<redacted>`；快照后增量 `om_<redacted>`（知识 Context v2，run 19，Result Lane passed）。
- Idea A `idea-82e425fd3e0ee887` 最终 **v6**，v3 SHA-256 `cb05faa7994b544d64947dea025edd39bd7e804c86079ff929a79600e1129455`，v4 SHA-256 `a5a9b206e2d1f968aa840eee79e0dbe5307abbf70d29bd45573553bb6c792c3b`，v6 SHA-256 `41a6453b76b91ef965c4d94ebbf58ee852fe13f23dc9d20192605e513aefbbe9`；跨对象 Idea B `idea-9910ed53a0fdd38b` 始终 **v1**，SHA-256 `dbef477049a98a43539b837a56c8538dae6f3e545e507ecb87c888474820aba2`。主 Agent 已独立重算 A v1–v6 与 B v1 的全部产物哈希并匹配账本。
- 真实 Host 恢复：Host A 在前序 Idea 已结算、后序仍 queued、真正 drain 前真实 `exit 95`；新 Host B 自动 drain 后序 B、生成 v4／Task／Attempt／run 并真实发送通知，在 `adapter.send` delivered 后、`idea.accept` 前注入故障，保持 unknown／`may_send=false`；Host C 重启不重发，页面人工对账后才 accept，provider=null。证据为 `p34-after-exit95-audit.json`、`p34-host-b-unknown-audit.json`、`p34-host-c-reconciled-audit.json`、`p34-host-c-page-observation-2.txt`、`p34-host-c-unknown-page.png`、`p34-b-unknown-manual-accept.json`。
- 退避：故障点在 claim 已写 unknown、transport 尚未调用；只有明确 `attempted:false` 才允许 15 秒退避。第一条消息的首次独立 `not_due` 观察迟到，原样保留失败记录 `p34-backoff-first-not-due-attempt.txt`；第二条用独立 watcher 获得有效 `status=not_due`、facts **240→240**。两条最终均 accepted、`retry_count=1`、provider=null；证据 `p34-backoff-not-due.json`、`p34-backoff-final-audit.json`、`p34-backoff-page.png`、`p34-backoff-page-observation.txt`。
- freeze／独占接管：主 Agent 对旧 Host PID 6708、instance `<redacted-uuid>` 投递真实 SIGUSR1 完成 freeze；旧 instance 完成 before reply 后由真实 SIGTERM 正常停止；during 冻结 generation 6 时只有 spool，无 Task／delivery／processed inbox；新 instance `<redacted-uuid>` 持锁后按 recover→drain frozen 至 pending=0→unfreeze→ready 顺序接管，走同一 Specialist／Result Lane／delivery，spool forwarded、attempts=1；after 由新 instance 回复 accepted。竞争 Host 退出码 **1**、`FEISHU_PROCESS_LOCKED`，Host 状态文件 SHA-256 完全不变，facts 保持 **263**；证据 `p34-cutover-old-frozen-audit.json`、`p34-cutover-three-windows-audit.json`、`p34-cutover-three-windows-page.png`、`p34-pre-competitor-host-status.json`、`p34-pre-competitor-feishu-status.json`、`p34-competitor-output.txt`、`p34-competitor-exit-code.txt`、`p34-post-competitor-audit.json`。
- 数据快照与真实增量回退对账：快照 **63** 个文件，actionCounts 为 dedupe_only=18、history_only=25、dedupe_no_resend=18、copy_versioned=6；externalEffects=0；源／目标哈希一致、源不变；未包含凭据、Session、Worker request／attempt 或数据库，旧 Task／Workflow／Session 只读归档。快照后真实知识增量先只在页面出现，未重发、未伪造 messageId／artifact，原消息随后自行补达并完成。回退对账 delta added=`domain/knowledge/om_<redacted>.json`、changed=`feishu-dedupe.json`、`requiresIncrementReview=true`；旧快照直接复制被拒绝且增量副本不变，`sourceOverwritten=false`、`targetConsumerStarted=false`、`rollbackExecutedAgainstLiveRuntime=false`。结论：保持停止并前向修复，不强行吸收增量，不双消费者运行。证据 `p34-pre-migration-status.json`、`p34-migration-candidate/`、`p34-migration-prepare-output.json`、`p34-migration-independent-hash-audit.json`、`p34-rollback-output.json`、`p34-increment-final.png`。
- 两条知识查询（during 与增量）都返回“该文档中没有找到匹配内容”，未调用模型；只声称本地只读查询与 Result Lane 闭环通过，**不**写成生成了最佳实践摘要。
- 门禁：主 Agent 独立运行 `npm run gate`（原始日志 `/Users/hoye/Documents/workspace/syno-p0-real-test/p34-final-gate.log`）结果为 tests=**942**、pass=**923**、fail=**0**、cancelled=**0**、skipped=**19**、todo=**0**；Repository verification **5164 files**；active documentation check **8 files**；`git diff --check` 通过。P3.4 相关七文件合跑此前独立 **82/82** 通过。最终综合断言为 `/Users/hoye/Documents/workspace/syno-p0-real-test/p34-final-verification.json`（`ok=true`，覆盖 6 个领域消息＋2 个立即回复、9 份产物哈希、63 个源文件不变、8 个本轮消息去重，pending／active／queued／unknown／pendingDecision／hold／残留消费者均为 0）。
- 清理：最终 Host 已正常停止，`runtime/host-status.json` 的 `host.running=false`、`adapter.running=false`、`stoppedAt=2026-11-20T02:11:33.696Z`；`pgrep -fl 'real-feishu-client\.mjs'` 无匹配，`p34-final-consumer-processes.txt` 为空；bsk `cwxu` 已停止，无第二测试消费者。
- 限制：真实 Host 进程退出／新进程恢复已验证，真实 SIGUSR1 freeze 与 SIGTERM 停止也已验证；但机器断电与 macOS 登录冷启动均为 `not_performed`，不得混为一谈；accepted 不等于已读；usage／cost=`not_returned`（未声称 Go 扣费已核验）；多批 >100 frozen drain、平台主动重复投递和 SIGUSR2 状态刷新未声称覆盖。未触生产 App／DB／正式 vault，未自动推送。

### P4：生产接管与观测（准备与工具已完成；首次实际窗口 freeze 前阻断）

- 仅在 P3.0–P3.4 全部通过、Owner 明确批准窗口后执行。
- 停止旧消费者并确认退出，复制已核验数据快照，由唯一新 Runtime 接管。
- 预先约定观察期与停止条件，重点观察 unknown、重复通知、queued backlog、对象路由错误和恢复延迟。
- 旧系统只读保留用于回溯，不恢复旧工作流，也不要求把新能力迁回旧架构。

准备阶段完成记录（2026-11-20）：

- 代码提交 `0a7643ea92253653cd389178fa1a758a16d24a69 feat: 增加 P4 入窗与接管门禁`，只含 `experiments/superagent-p0/production-handover-preflight.mjs`、`tests/superagent-p4-production-handover.test.mjs`、`docs/plans/superagent-p0/P4-PRODUCTION-HANDOVER-RUNBOOK.md`；已提交、未推送。当前 4 份收尾文档由主 Agent 精确提交。
- entry／takeover 门禁分离：默认 entry 仍阻断任何 handover pending；takeover 必须显式传入 `--takeover-freeze-generation <正整数>`，只放行该 generation 的 frozen spool，旧 generation、dispatching／hold、unknown、queued 等仍阻断。`ready=true + drainRequired=true` 只表示允许唯一新 Runtime 接管并必须按 Runbook drain，**不表示全部消息已结算**。
- WAL 只读防护：打开 SQLite 前拒绝 `-wal`／`-shm`／`-journal` sidecar 与 WAL 模式文件头；活跃 WAL 探针退出码 2、stdout／ready 报告为空、主 DB／WAL／SHM 哈希完全不变。
- 验证：P4 相关定向测试 **32/32 通过**；主 Agent 独立全量门禁 **960 tests／941 pass／19 skipped／0 fail／0 cancelled／0 todo**；Repository verification **5169 files**；Active documentation check **8 files**；`git diff --check` 通过。
- Runbook：`/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/P4-PRODUCTION-HANDOVER-RUNBOOK.md`。综合证据：`/Users/hoye/Documents/workspace/syno-p0-real-test/p4-preflight-final-verification.json`（`ok=true`）；日志 `p4-takeover-full-gate.log`、`p4-takeover-targeted-tests.log`、`p4-takeover-wal-probe.json`。
- 实际生产接管仍为 `not_authorized / not_performed`：未冻结、停止、启动、复制或对账任何生产对象，未读取凭据。

P4.2 完成记录（2026-11-20）：

- 代码提交 `6a501001030c1d1f5b939eded5987ccea6636581 feat: 增加 P4.2 只读证据采集与独立验收`，只含 preflight 单行 export、`experiments/superagent-p0/production-handover-evidence.mjs`、`tests/superagent-p4-handover-evidence.test.mjs` 与 Runbook；已提交、未推送。
- `collect` 只读静态 DB 副本，输出 DB SHA-256、全局脱敏计数与每条消息的 event／inbox／Task／Attempt／run／delivery／spool／reply 安全字段及 artifact hash；`verify` 不信任采集器 `ok`，独立重算 owner 连续性、Task／Attempt／inbox 链、generation／N、最终全局计数与 artifact hash。
- 退出码：collect 成功 0；verify `ok=true` 0、`ok=false` 3；参数／读取／JSON／结构错误 2。活跃 WAL／sidecar 在打开 SQLite 前失败关闭。
- 验证：R1 定向 **41/41 通过**；主 Agent 独立全量门禁 **972 tests／953 pass／19 skipped／0 fail／0 cancelled／0 todo**；Repository verification **5171 files**；Active documentation check **8 files**；`git diff --check` 通过。
- 机器摘要：`/Users/hoye/Documents/workspace/syno-p0-real-test/p42-final-verification.json`（`ok=true`）；反例与修复证据 `p42-main-contract-probe.json`、`p42-r1-main-original-probe.json`、`p42-r1-main-valid-owner-probe.json`。
- 最终静态副本与 expectation manifest 仍需主 Agent 在 Owner 批准窗口内制备；实际生产接管、观察期与真实生产证据均未执行，P5 不启动。

首次实际窗口记录（2026-11-20）：

- Owner 批准 `2026-11-20T04:56:31Z` 起 60 分钟、接管后观察 30 分钟、Runbook 全部停止条件及主 Agent 回退。
- 只读预检发现：旧生产只有 disconnect，没有 P4 freeze／handover spool；未识别到统一 SQLite 事实库与 host-status；`real-feishu-client.mjs` 固定隔离测试 App／root／DB，不能直接生产启动。
- 按 freeze 优先停止推进，未停止旧服务或启动第二消费者，未复制／改写生产数据，未开始观察或 P4.2 采集。旧服务复核仍健康。机器证据为 `/Users/hoye/Documents/workspace/syno-p0-real-test/p4-production-window-20261120T045631Z/preflight-blocked.json`，状态为 `authorized / blocked_before_freeze / not_performed`。

### P4.3：生产切换接线与隔离复演（已完成，生产未切换）

**目标：** 在不恢复旧 Task／Workflow／Session、不采用 stop→freeze 的前提下，补齐真实旧生产到新 Runtime 的切换入口，先在脱敏隔离副本完整复演，再申请新的生产窗口。

工作项与验收：

1. **旧入口 freeze 桥**：复用 `host-handover` 的冻结控制与 spool，在旧入站完成业务路由前接管冻结门；验证 freeze 后消息只入 spool，旧 in-flight 有明确结算／对账，旧消费者退出前不存在未冻结空窗。不得把旧 Workflow 恢复进新 Runtime。
2. **生产配置与 launcher**：把真实客户端的 root、App、DB、vault、状态与锁路径改为显式受控配置，保留测试默认值与生产 App 断言隔离；提供唯一实例启动、freeze、状态刷新和正常停止入口。配置与日志不得输出 Secret。
3. **真实来源迁移入口**：只读盘点旧 JSON 去重水位、Markdown vault、Owner 绑定和已启用外部效果映射，从已核验来源生成新的统一 SQLite 事实库与 host-status；不虚构一个旧 SQLite DB，不读取或提交正文和凭据。
4. **隔离复演**：用脱敏／合成副本跑 freeze→旧消费者退出→静态副本→takeover preflight→快照→唯一新 Runtime→recover→drain→unfreeze→ready→queued drain，覆盖窗口前／中／后消息、竞争实例、unknown 和回退增量。
5. **独立验收**：主 Agent 重算 owner／generation／N、Task／Attempt／delivery、vault／dedupe hash 和进程独占；全量 gate 0 失败后精确提交、不推送。完成这些才可向 Owner 申请新生产窗口，P5 仍不启动。

完成记录（2026-11-20）：

- 提交（均未推送，文档提交尚未发生）：A `b467f98a309311e1b3fb7f42b9aec79dcada66c4`、B `24a631e46f472f57535695d1bfca56c79f823ac1`、C `fc703543c694e4ea85ce58dd6f917b7950402dd9`、D `c276cfaeacc5f93279a062e4a5bc8f00ff1b008d`。机器摘要为 `/Users/hoye/Documents/workspace/syno-p0-real-test/p43-final-verification.json`，状态 `code_and_isolated_rehearsal_complete`。
- **A（生产入口配置化）**：`real-feishu-config.mjs` 分离隔离测试与生产配置；生产模式必须显式提供 App、root、knowledge、localData、runtime 等配置，App 必须合规且不得复用隔离测试 App，路径必须绝对且 runtime 位于 root 内；生产消费者锁固定为旧 adapter 的 `${stateFile}.lock`，隔离测试保留独立锁。
- **B（旧 Host 桥）**：`legacy-production-handover.mjs` 默认关闭，仅 `production` + `SYNO_P4_LEGACY_HANDOVER=enabled` 启用，半配置即失败关闭；`SIGUSR1` 冻结、`SIGUSR2` 仅刷新状态；普通回复写旧 owner 的真实 event／inbox／reply 证据；静态 `PATHS` 的 localData／knowledge 必须与 P0 配置同根，runtimeRoot 不强制统一；shutdown 固定为 runtime → bridge → HTTP → host 租约；空库一次性、幂等地初始化最小 rules。
- **C（安全事实迁移与防重）**：`production-source-migration.mjs` 提供 `import` 与 `static-copy` CLI；只导入去重水位、显式零安全清单、已启用发布映射、vault 哈希清单与 Owner 安全布尔；spool ID 从 seen／pending 排除，非 spool pending／active／unknown／未登记外部效果阻断；已知 spool 在 unfreeze 后仍禁止 immediate，adapter 恢复 pending 与 drain 共享防重；报告含 before／after DB hash 与源 hash（源不变），只允许 `mapping_only` 等登记动作；静态副本非 WAL 且不改源。
- **D（全链路隔离复演）**：`production-rehearsal.mjs` 在全新输出根串行复演 before→freeze→旧退出→import→takeover 静态副本→preflight→快照→唯一锁→recover→drain→unfreeze→ready→queued drain→final 静态副本→P4.2 verify。证据根 `/Users/hoye/Documents/workspace/syno-p0-real-test/p43d-main-rehearsal-20261120-r1`：12 个阶段全 `ok`，5 个失败分支（竞争锁、hold、unknown、generation／N、跨对象／artifact）全 `blocked`；generation=1，drain forwarded=2、pending=0，queued 恢复后 remainingQueued=0，回退 delta added=2／changed=0／deleted=0／externalEffects=0；P4.2 独立 verify `ok=true`、blockers 空、4 条消息／2 domain／2 reply／5 artifacts。D 返工 1 轮：R0 持久化 host-status 含合成 Owner ID 且测试漏扫 runtime，R1 归档脱敏状态并递归扫描全部 JSON。
- 门禁：A 全量 **985 tests／966 pass／19 skipped／0 fail**；B 定向 **74/74**、全量 **1005／986／19／0**；C 定向 **75/75**、全量 **1019／1000／19／0**；D R1 定向 **77/77**、全量 **1021／1002／19／0**；Repository verification **5179 files**、active docs **8 files**。日志绝对路径见最终机器摘要，本文件不复制大日志。
- 限制：复演全部为脱敏／合成隔离输入，**不构成生产授权**，不证明生产已接管、真实消息已读、真实断电或 macOS 登录冷启动；实际生产接管、30 分钟观察、回退均未执行；未推送、未启动 P5。

### P4 真实接管窗口（2026-11-20T10:14:56Z，最终 P4.2 阻断）

- Owner 批准 90 分钟窗口至 `2026-11-20T11:44:56.045Z`，新 Runtime 接管后观察 30 分钟。证据根：`/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-production-window-20261120T101456Z`。
- 两条 before 起初均因 DSH `MISSING_CREDENTIAL` 进入 `waiting_provider`；根因是候选 Host 未加载既有生产 `.env`。`47dee92f119e702ce53e585637015727845fbfc2` 新增显式 `SYNO_SECRET_ENV_FILE`，36 项定向测试通过；重启后 `job_<redacted>` 与 `job_<redacted>` 均正常 completed，未读取、复制或输出密钥。
- 真实 freeze generation=1 后，during `om_<redacted>` 只进入 frozen spool；旧消费者退出后 import、静态副本、takeover preflight 与快照均通过。新 instance `<redacted-uuid>` 持锁后 recover→drain→unfreeze→ready，during `forwarded=1`、`attempts=1`，Task／Attempt／run／delivery／artifact 完整。竞争实例以 `FEISHU_PROCESS_LOCKED` 退出。
- after `om_<redacted>` 的普通回复 accepted，与 during 同属新 owner；两条 before 均属旧 owner。30 分钟观察 `ok=true`、`observedMinutes=30`，无 unknown／hold／双消费者；accepted 不代表已读。
- 观察后新 Runtime 正常停止并 freeze generation=2，独立制备 final 静态副本，SHA-256=`9d070fe465c9937e052c8bf940049875c12642db5eda5a5efd2983a44e45a763`。P4.2 collect 成功，但 verify `ok=false`：after event=0、inbox=0，blockers 仅 `event_missing=1`、`inbox_missing=1`。**因此 P4 未验收完成。**
- 已保留 `verification.json`、`evidence.json`、`final-blocked.json` 等失败现场；未修改 expectation、未补写生产 event／inbox、未重跑 drain、未 kickstart 恢复服务。下一 Agent 从 `/Users/hoye/Documents/workspace/syno-personal-butler-p0/docs/plans/superagent-p0/P4-PRODUCTION-HANDOFF-20261120.md` 接续。

### P4.2 普通回复 event／inbox 修复（2026-11-21，隔离通过，生产已通过）

- 提交 `fcac7c3f0 fix: 补齐普通回复的 event/inbox 证据链`，只含 `host-handover.mjs`、`real-feishu-client.mjs`、`production-rehearsal.mjs` 与新增 `tests/superagent-p4-reply-evidence.test.mjs`；未推送。
- `host-handover.mjs` 新增 `recordReplyEvidence`／`sendOrdinaryReply`：普通回复在 `sendReply` 前写保留源 `legacy-handover` 的 event + processed inbox，复用 `route:legacy-reply:<appId,messageId>` 幂等 route；已有成对证据时 no-op，证据不完整时失败关闭，不创建 Task／Attempt／delivery。
- `dispatchMessage` 改用 `sendOrdinaryReply`；P4.3 复演的 after 也走同一路径，删除手工补 event／inbox 的 fixture。红灯测试覆盖 delivery 前证据、重复回复不重复投递、无 domain 链。
- 定向测试 61/61；P4.3 隔离复演证据根 `/Users/hoye/Documents/workspace/syno-p0-real-test/p4-reply-evidence-fix-20261121-r1`：12 阶段全 ok、5 个失败分支全 blocked，`final/verification.json` 为 `ok=true`、blockers 空，after event=1、inbox=1、accepted reply=1。
- 全量 `npm run gate` 通过：1024 tests／1005 pass／19 skipped／0 fail；Repository 5181 files、active docs 8。
- 隔离阶段结束时生产未启动、未恢复、未重跑真实 after；随后 2026-11-21 生产修复窗口已通过，见下。

### P4.2 生产修复窗口（2026-11-21，通过，服务已恢复）

- 窗口 `2026-11-20T16:36:28Z` 至 `2026-11-20T18:06:28Z`，证据根 `/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p4-handover/p4-repair-window-20261120T163628Z`。
- 窗口前 takeover：`ready=true`、`mode=takeover`、`generation=2`、0 个 frozen spool、无 blockers。
- 新 after `om_<redacted>`，由 Owner 授权、通过 bsk 从已登录飞书账号发送；旧 before 1／2 复用，旧 during／domain 证据仍来自首次窗口。
- 30 分钟观察 `ok=true`、`observedMinutes=30`、failures 空；停止后 freeze generation=3，final 静态副本 SHA-256 `f00b7b995815190ee77d9f9f69a6ac9ac5b5455eda606209b21532e7d537f72c`。
- P4.2 `verify.ok=true`、blockers 空：messages=3、replyMessages=3、duringMessages=0、artifacts=0；after event=1、inbox=1、accepted reply=1。
- 服务已恢复：PID `85264`、instance `<redacted-uuid>`、generation=3；launchd `active count=1 / state=running`，adapter running／available／ownerBound=true。
- 未推送，P5 未启动；断电／冷启动、accepted≠已读、多批 >100 frozen drain 等非阻断限制仍适用。

### P5：主动发现

- 从一个真实公开来源和一个订阅目标开始。
- 无变化零模型调用；重复转载、冷却、睡眠恢复和失败暂停可观测。
- 新内容只生成本地静默候选；用户选择跟进后进入同一 Root Router 和领域任务链。
- 恶意来源不得触发正式 vault 写入或未授权 Worker 执行。

## 4. 每个纵向切片的固定门禁

1. **确定性测试**：A/B、多轮、歧义、重放、取消、超时、进程恢复、旧 Attempt、同对象并发、跨对象伪造。
2. **真实链路**：独立飞书、真实 Worker、公开／合成输入、测试 vault、Result Lane、通知重读。
3. **证据**：消息 ID、Context／版本、Task／Attempt／run、文件 SHA-256、delivery 和脱敏事件轨迹。
4. **费用**：只使用批准的 OpenCode Go DS 4.1 Flash／Pi；未返回的 Token 或费用写 `not_returned`。
5. **提交**：代码、测试、文档按逻辑拆分精确提交；不自动推送，不掩盖失败现场。
6. **停止条件**：P0／P1 缺陷最多返工两轮；第三轮仍不收敛就停止并交 Owner 裁决。

## 5. 当前检查点与下一步

**P3.0–P3.4、P4 准备阶段、P4.2 工具、P4.3 与 P4.2 生产修复已完成；2026-11-21 新生产窗口 `verify.ok=true`，服务已恢复。** 统一宿主和 Specialist Registry 已接管收录／知识领域；Idea、Project、Decision Lane 与 Memory Specialist 均已完成确定性内核、真实 Worker 与独立测试客户端验收。P4.3 已交付生产配置、旧 Host freeze 桥、安全事实迁移及全链路隔离复演。2026-11-20 首次窗口完成真实 during spool drain、after 回复、竞争锁与 30 分钟观察，但 after 缺 event／inbox；2026-11-21 修复普通回复证据链后，新 after 通过 P4.2 生产验收。失败现场完整保留，未推送，P5 未启动。

普通 immediate reply 的 event／inbox 证据链已于 2026-11-21 修复（提交 `fcac7c3f0`），新生产窗口复用旧 before、使用新 after，`verification.ok=true`、blockers 空，服务已恢复（PID `85264`、generation=3）。下一步是 **P5 主动发现**；P5 尚未启动，需另行立项与验收。P4 的非阻断限制（机器断电／macOS 登录冷启动、accepted≠已读、多批 >100 frozen drain 等）仍需单独安排。
