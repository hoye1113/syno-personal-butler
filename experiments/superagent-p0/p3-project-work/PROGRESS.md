# P3.2 Project 确定性内核与真实接线进度（已完成）

> 公开版脱敏说明：真实 Feishu 消息／实例／Job／文档 ID 已替换为占位符；完整证据保留在本地。

目标：在统一 Runtime 中增加 `project:<projectId>` 对象，固定 `markdown-brief-v1` 三步计划，保持原生事件、Task／Attempt、Result Lane 与 delivery 的单一事实源。
顺序：0 基线核对 → 1 project 对象／路由／manifest → 2 原生执行与步骤账本 → 3 确定性测试 → 4 门禁与报告 → 5 真实 Worker／测试客户端接线与实测。
约束：只在仓库内；不改生产 `apps/`、不接生产飞书、不写入正式 vault、不提交推送。
基线：`c02f3b474`；代码检查点 `3f9508627`（确定性内核）、`1e3dd8835`（真实 Worker 与测试客户端）；均未推送。文档提交未发生，本文不声称文档提交 hash。

当前状态：P3.2 纵向切片已通过并停手；无剩余 P0／P1 阻塞。真实 Host 重启后的 queued 恢复归 P3.4。

## 实际文件

- 新增 `experiments/superagent-p0/project-object.mjs`：项目 ID／Context／索引／输入／步骤 key，固定三步计划，版本化相对路径，正文安全校验，`resolveProjectRequest`，规范化 manifest 构建与解析。
- 新增 `experiments/superagent-p0/native-project-runtime.mjs`：ingest→claim→ApplyRoute→createTask，冻结输入与前一计划，`wx` 写盘与崩溃对齐，步骤状态／依赖入账，Result Lane 复核，索引与 delivery API。
- 新增 `experiments/superagent-p0/project-worker-contract.mjs`：固定模型 `opencode-go/deepseek-v4.1-flash`，请求绑定 messageId／taskId／attemptId／projectId／action／goal／revision／planVersion／inputSha256／worker／model；new 要求 previous=null，revise 校验内核冻结的上一计划 manifest 与三步产物哈希及固定相对路径；`buildProjectPrompt` 把目标、修订和历史产物全部标为不可信素材并禁止工具／联网／写产物；`parseProjectModelResponse` 只接受 `outline`、`deliverable` 两个非空正文，复用 `assertStepBody` 拒绝路径注入与跨项目引用，并拒绝仅复制旧版的修订。
- 新增 `experiments/superagent-p0/project-worker-smoke.mjs`：独立临时账本／vault／项目根；OpenCode 覆盖一次 new，Pi 先用确定性合成 v1 再真实修订 v2；宿主调用 probe 后完成三步与 Result Lane，独立重读并核对 request／Task／Attempt／run／planVersion／inputSha／previous／全部 SHA256，claim+accept 本地 delivery；`result.json` 记录 `modelCalls=1`、`feishuCalls=0`。每个进程最多一次真实模型调用，失败也留 result。
- 修改 `experiments/superagent-p0/real-worker-probe.mjs`：新增互斥的 `--project-request` 与只读 `--project-root`；调用前由宿主重读冻结 previous 并核对哈希；模型只返回两段正文，probe 不写 outline／deliverable／manifest，只写宿主指定 evidence，`resultLane=delegated_to_host`，usage／cost 未返回记 `not_returned`。
- 修改 `experiments/superagent-p0/real-feishu-client.mjs`：数据库改为 `syno-p0-real-test/runtime/p3-project.db`，项目产物根为独立 `runtime/p3-project-artifacts`；复用统一 Registry 与同一 Root Router；`projectFromFeishu` 后台执行、同对象 queued 不提前推进 Context／建 Task、复用 `drainQueue` 持续 drain、不同项目并行、启动自动 drain、stop 等待项目后台与 drain；marker／request／evidence 分文件，已有证据或产物时按原 Attempt 恢复，证据不足只对账不重跑模型；成功通知前独立重读 manifest 与步骤产物，delivery 先 claim，accepted 用 `provider_message_id=null`、`at_least_once`，异常标记 unknown 且不盲目重发。测试故障注入点 `SYNO_P3_PROJECT_TEST_CRASH_AFTER_WORKER` 已接入，真实飞书本轮未触发。
- 新增 `tests/superagent-p3-project.test.mjs`：13 项内核确定性测试 + 4 项 Worker 合约测试（请求绑定／固定模型、严格 JSON 与正文拒绝、冻结 previous 哈希与固定路径、prompt 的不可信与无工具边界）。
- 最小修改 `experiments/superagent-p0/native-butler-runtime.mjs`：注册 `project` Specialist、规则与索引输入；`projectRoot` 选项。
- 最小修改 `experiments/superagent-p0/root-router.mjs`：只对两种项目指令路由，未识别文本保持 unsupported。
- 返工（主 Agent 在 P3.2 已授权范围内批准的最小返工，仅一轮）：`tests/superagent-p3-runtime.test.mjs:43` 的 Specialist Registry 预期由 `["capture","knowledge","idea"]` 更新为 `["capture","knowledge","idea","project"]`，语义未变，仅同步 P3.2 新增领域。此后无 P0／P1 返工。

## 命令与产物格式

- 新建：`新建项目：<goal>`；修订：`修订项目 <projectId>：<revision>`；缺 goal／id 或存在多候选只追问，未知 ID 零业务副作用。
- projectId = `sha256(appId:messageId)` 前 16 hex；Context = `project:<projectId>`。
- 固定步骤：`outline` → `deliverable`（依赖 outline）→ `manifest`（依赖 outline、deliverable）。
- 产物根由宿主配置（测试默认 `vault/04-Projects`），相对路径固定为 `<projectId>/v<planVersion>/outline.md`、`deliverable.md`、`manifest.json`。
- manifest 为宿主生成的规范 JSON，字段：`schema`、`projectType`、`projectId`、`planVersion`、`action`、`goal`、`revision`、`inputSha256`、`previous{planVersion,manifestPath,manifestSha256}`、`steps[{id,dependsOn,taskId,attemptId,runId,runAttempt,path,sha256,bytes}]`；manifest 步骤自身 `sha256`／`bytes` 为 `null`。
- Task acceptance 绑定 manifest 绝对路径与 `inputSha256`；Attempt 绑定原生 run／attempt；delivery key 为 `delivery:<taskId>:result`。
- Worker 请求：`{messageId,taskId,attemptId,projectId,action,goal,revision,planVersion,inputSha256,worker,model,previous}`；previous 只含冻结的 `<projectId>/v<上一版>/...` 相对路径与 SHA256，绝对项目根由宿主以 `--project-root` 传入。
- Worker evidence：只含 request IDs、版本、冻结 previous／哈希、sandbox probes、两段正文、usage／cost 与 `resultLane=delegated_to_host`，不含新产物路径或哈希。

## 本机验证结果

- `node --test tests/superagent-p3-project.test.mjs`：**17/17 通过**。
- `node --test tests/superagent-p1-native.test.mjs tests/superagent-p2-knowledge.test.mjs tests/superagent-p3-runtime.test.mjs tests/superagent-p3-idea.test.mjs tests/superagent-p3-project.test.mjs`：返工前 **45 项，44 通过、1 失败**（`tests/superagent-p3-runtime.test.mjs:43` 硬编码 Specialist 列表）；返工后 **45/45**；加入 4 项 Worker 合约测试后 **49/49 通过、0 失败、0 跳过**。
- `node --check`：本轮新增／修改的 5 个 JS 文件全部通过（`project-worker-contract.mjs`、`project-worker-smoke.mjs`、`real-worker-probe.mjs`、`real-feishu-client.mjs`、`tests/superagent-p3-project.test.mjs`）。
- `npm run verify`：通过；Repository 5150 files、active docs 8 files。
- `npm run gate`：**903 项，884 通过、0 失败、0 cancelled、19 跳过、0 todo**；Repository 5150 files、active docs 8 files；`git diff --check` 通过。证据 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-final-gate.json` 与 `p3-project-final-gate.log`。

## 本地真实 Worker 烟测（不接飞书）

两个烟测均在独立临时账本与项目根内执行，`feishuCalls=0`、`modelCalls=1`、`usage`／`costUsd=not_returned`：

- OpenCode new：`project-451c24e949b7ba1b` v1，manifest `eb26ba480e084bedb1669e8376be957976503923463094b75fdf016dce9a8c22`，Result Lane passed，delivery accepted。结果 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-worker-smoke/opencode-2026-11-19T11-57-59-814Z/result.json`。
- Pi revise：`project-f237daf1187a31e2` 同对象 v1→v2，manifest `6368eed4c811b0b89a664b1f67cedde0a56e2a6719c5ded34edc1b371313a708`，v1 哈希未变，Result Lane passed，delivery accepted；evidence 记录 `pi.providerRequests=1`、`toolEvents=0`。结果 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-worker-smoke/pi-2026-11-19T11-59-55-351Z/result.json`。

## 真实飞书验收

独立测试 App、`/Users/hoye/Documents/workspace/syno-p0-real-test/runtime/p3-project.db`、项目根 `runtime/p3-project-artifacts`：

- ALPHA `project-8a5a1b3c61f28bc7`：版本 `[1,2,3]`、`latestVersion=3`、Context=3。v1 `om_<redacted>`／run1／`attempt-1-1`／manifest `73ead5b9bb779e8c7a5b59ba18fdf48aa47fe3402ea1e70f7f91c2520f8a02ed`；v2 `om_<redacted>`／run4／`attempt-4-1`／`481d8d1918449abcd5302dd49b149368ed8371a69fb36cd6cedda7abbf70ea6d`；v3 `om_<redacted>`／run5／`attempt-5-1`／`f20bb9feed4ad79c3667ca0efb83d74dd209013b02b1ac66bdd17e6cc73041ac`。
- BETA `project-7db58ebce60250b6`：仅 v1，`om_<redacted>`／run2／`attempt-2-1`／manifest `d4dce687cb3fb839459113d7804d1b177acd3f7a048c8126ae30231ccbbbf938`。
- 想法 C `idea-8c738ac2620a34a8`：`om_<redacted>`／run3／`attempt-3-1`／Context=1，独立结算。
- 四个项目 Task 与想法 Task 均 completed，Attempt／run done，Result Lane passed，delivery accepted、`may_send=false`、`provider_message_id=null`、`at_least_once`。全部 outline／deliverable／manifest 已独立重读并核对路径、依赖、字节数与 SHA256；v3 冻结 previous 指向 v2 全部产物，旧版未改写。
- 独立审计 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-real-audit.json`：`ok=true`、6 组检查通过、`factCount=88`。
- 真实 queued：快照 `p3-project-real-queued-snapshot.json` 记录 v2 running、v3 run5 queued、`v3Task=null`、冻结输入 null、`latestVersion=1`、`factCount=58`；v2 于 `12:07:18.390Z` 完成，v3 于 `12:07:19.116Z` claim、`12:08:32.853Z` 完成，最终 `factCount=88`。
- 歧义 `om_<redacted>`（multiple-projects）factCount **75→75**；未知经单独补发的 `P32-UNKNOWN-2015-R2`（`om_<redacted>`，`project-0000000000000000`）factCount **88→88**。两者均无 Task、Worker evidence、项目索引或 Context 推进。
- 页面证据：`p3-project-v3-notification.html`、`p3-project-real-v3-complete.png`、`p3-project-real-ambiguous.png`、`p3-project-real-clarifications.png`。

## 覆盖与限制

- 覆盖：项目 A 慢时 B／想法 C 独立完成；v1→v2 重读、依赖与 manifest；旧 Attempt／旧计划迟到不覆盖；取消只影响指定 Task；unknown／ambiguous 零事实；重放零新增、变更重放拒绝、同对象 queued 恢复；Worker timeout／取消／`reportWorkerDone` 不结算 Task；部分写盘后退出并重开同一 SQLite 只结算一次；缺依赖／空正文／路径注入／符号链接逃逸／伪造 planVersion／inputSha／manifest 字段／manifest 篡改均无成功 delivery；delivery 仅在 Result Lane 后出现且 unknown 不盲目重发；Worker 合约的请求绑定、固定模型、严格 JSON、路径／跨项目／额外字段拒绝、previous 哈希与固定路径、prompt 不可信边界。
- 真实链路由主 Agent 独立实测：本地 OpenCode new、Pi revise 与真实飞书两个项目、四个项目计划版本（ALPHA 三个、BETA 一个）／独立想法均已完成；本轮只做文档收尾，不再调用模型或连接飞书。
- **真实 Host 重启后的 queued 恢复 `not_performed`，归 P3.4**；本轮只证明同进程自动 drain，确定性进程退出／同一 SQLite 重开不冒充真实 Host 重启。真实飞书 crash 注入未触发。
- 歧义与未知：首轮页面两条消息的回复归属不一致，未知对象用 R2 单独重发；审计只采用消费者日志中的独立 unknown 事件，不猜测根因，也不写成已确认代码缺陷。
- delivery accepted 不代表已读；`provider_message_id=null`；usage／cost 未返回不等于 0，也未核验 Go 控制台扣费。
- 独立飞书客户端已正常停止（status `running=false`），无第二个测试消费者；bsk 会话已停止；未触生产 App／DB／正式 vault，未推送。
