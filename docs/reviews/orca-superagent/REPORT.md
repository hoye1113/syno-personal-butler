# 管家 Super Agent 整体重构与 Orca 开源借鉴评估报告

- 日期：2026-11-18
- 用途：供用户及其他 Agent 独立评审架构方向，不是已批准的实施计划
- 当前状态：只写报告；未修改管家代码，未安装或运行 Orca，未开始 V5，未切换生产
- Orca 仓库：`https://github.com/stablyai/orca`
- 固定提交：`44243be42221b6946c482aab39dfc0bc51ce06aa`
- 随附证据快照：`evidence/orca/`（复制自上述固定提交，保留上游相对路径）
- 探索时版本：`1.4.214`；License：MIT

> 证据标记：**[事实]** 表示直接来自已读代码、文档或既有验证报告；**[推论]** 表示由事实推导的架构判断；**[建议]** 表示待评审选择。README 宣传不作为运行可靠性的证明。

---

## 一、背景

用户要的不是一个能偶尔回答问题的聊天机器人，而是一个可以长期运行、主动获取知识、处理多个上下文、路由不同任务、调用可替换 Worker，并对结果负责的“管家”。

现有系统已经过多轮纵向验证，但也暴露出架构问题：如果继续把路由、知识、Worker、记忆和开源项目功能逐项叠加，而没有先统一事实模型，容易形成多个状态中心、多个完成语义和多个上下文入口，即用户担心的“四不像”。

用户已明确表示：允许推翻当前 autoloop 的具体实现并整体重构；只要做好拆分提交、测试验证和回退，最终目标仍是一个完整闭环的管家。

因此，本报告不再把“保留当前 autoloop 代码”当前提，而把它作为可替换实现来评估。

## 二、目标、硬约束与完整闭环定义

### 2.1 产品目标

1. 用户只面对一个管家身份，不需要管理 Worker、进程和 Session。
2. 管家能区分不同文章、想法、项目和任务，将请求路由到正确的 Specialist 与 Object Context。
3. Claude Code、OpenCode、DSH、Pi 等均为可替换 Worker，不成为主 Runtime。
4. 本地 Markdown `vault/` 保留，知识可读取、收录、追溯、去重、回滚。
5. 管家能从事件和定时任务中主动发现候选知识或待办，但默认低打扰，并由 Owner 决定是否跟进。
6. 任务、审批、恢复、通知、副作用和知识结果形成完整闭环。

### 2.2 不可因重构而丢失的硬约束

1. **唯一事实源**：任务、事件、审批、恢复和通知只能有一个持久权威。
2. **三层路由与隔离**：Root Router / Domain Specialist / Object Context 的逻辑边界保留。
3. **对象不混杂**：多候选指代必须追问；不同对象的正文、Session、结果和通知不得自动混合。
4. **Worker 可替换**：Worker 只实现契约，不拥有主任务事实。
5. **Result Lane 独立复核**：Worker 自报成功不等于结果真实完成。
6. **未知结果不盲目重放**：至少一次执行不代表外部副作用只发生一次。
7. **本地知识与私有数据边界**：真实 vault 正文、附件和凭据不得未经单独授权发给外部服务。
8. **可迁移与可回退**：生产切换前保持单写入、单飞书消费者和可验证回退点。
9. **本机依赖现实**：本机没有 Codex，不得将 Codex 方案当成本地依赖。

### 2.3 “完整闭环”的验收含义

```text
Owner 请求 / 外部事件 / 定时触发
  → 入口去重与身份确认
  → Root Router
  → Specialist + Object Context
  → 持久 Task 与一次执行 Attempt
  → Worker 执行
  → 产物 / 外部副作用 / 知识候选
  → Result Lane 独立重读与核验
  → 审批或失败恢复（如需要）
  → 原 Object Context 的通知与任务视图
  → 重启后可恢复、可解释、可对账
```

只返回一段模型文本、只写入数据库、只显示 Worker 成功，均不算完整闭环。

## 三、当前管家的既有基础

**[事实]** 已完成以下验证：

- V0：合成完整闭环。
- V1：真实 Claude 单对象流程与 Session resume。
- V2：多对象、多任务、持久恢复与真实 OpenCode 链路。
- V3：真实飞书 Owner 私聊、结果卡片、按钮关闭和重启去重；验证后旧 Runtime 已恢复为唯一消费者。
- V4.1：本地知识只读。
- V4.2：本地合成副本收录、DSH 可替换 Worker 隔离 RC。
- Pi `1.5.2`：通过 Pi Agent Core 与 loopback OpenCode Server 完成一次真实纵向收录、Result Lane 复核和退出后知识查询。
- 全量无费用回归：41/41。
- V5 主动知识、V6 迁移与生产切换尚未完成。

既有验证报告和架构文档：

- `baseline/plan/butler-superagent-autoloop-plan-v4.md`
- `baseline/plan/butler-superagent-autoloop-vertical-slices-v4.md`
- `baseline/plan/butler-superagent-autoloop-plan-v4-adversarial-review.md`
- `baseline/butler-superagent/README.md`
- `baseline/butler-superagent/v4/PI-VERIFICATION.md`

**[建议]** 这些结果应作为重构后的行为回归基准，而不是把当前实现视为不可修改的遗产。

## 四、Orca 的真实组成与反向拆解

### 4.1 一句话定位

**[事实]** Orca 是并行编码 Agent 的桌面、移动和远程控制平面，同时实现了带身份、长期会话、连接器、Items、主动巡视和记忆整理的 Bot 子系统。

**[推论]** 它既包含可借鉴的 Super Agent 产品机制，也包含成熟的 Worker 执行控制细节；但它的默认产品模型并不是用户要求的单管家形态。

### 4.2 主要结构

```text
桌面 / Mobile / Remote / Slack / Linear / GitHub / Automations
                         ↓
              Orca Runtime 与持久记录
                         ↓
          Bot Home：SOUL / MEMORY / Home Chat
                         ↓
         独立 Chat、Items、Look around、Tidy-up
                         ↓
          Run / Task / Dispatch / Message / Gate
                         ↓
       Structured Agent Registry 与各 Agent Adapter
                         ↓
             Claude / OpenCode / Pi 等 Worker
```

### 4.3 它做得好的关键选择

1. 将 Task 与一次执行 Dispatch 分离。
2. 用进程身份、fence、generation 和启动 token 管理 Session 所有权。
3. 将审批门、Worker 提问和邮箱回执分开。
4. 主动巡视只读并只生成建议，而不是直接执行。
5. 记忆整理由无工具模型生成草案，宿主校验、落盘、留史和撤销。
6. Server 拥有运行时状态，远程客户端主要是视图。

## 五、逐项借鉴方案与来源

以下才是本报告的“开源项目借鉴清单”。每一项都写明借什么、怎么借、来源和不借什么。

### 5.1 Task / Dispatch：将任务与执行尝试分开

**来源：**

- `evidence/orca/docs/site/content/docs/cli/orchestration.mdx`
- `evidence/orca/src/main/runtime/orchestration/workers/launch/worker-dispatch-preamble.ts`
- `evidence/orca/src/main/runtime/orchestration/db/dispatch-context/dispatch-completion.ts`
- `evidence/orca/src/main/runtime/orchestration/db/dispatch-context/attempt-task-settlement.ts:128`

**[事实]** Dispatch 是 Task 的一次执行尝试；Worker 完成必须同时携带 `taskId` 和 `dispatchId`；旧 Dispatch 会得到 `stale_dispatch`，不能完成新重试。

**借鉴方案：**

- 在新 Runtime 中明确区分持久 `Task` 与每次 `Attempt`。
- Attempt 绑定 Worker、进程 incarnation、Session、启动时间和当前状态。
- 完成、失败、心跳和提问都验证当前 Attempt 与进程所有权。
- 重试创建新 Attempt，不覆盖旧 Attempt 的证据。

**优点：** 能防止旧 Worker、晚到结果和重试互相覆盖。  
**代价：** 数据模型和恢复逻辑更复杂。  
**前置条件：** 先检查当前 autoloop 是否已有等价机制，避免重复造字段。

### 5.2 进程所有权、Session fence 与输入未知状态

**来源：**

- `evidence/orca/src/main/runtime/orchestration/workers/reports/worker-report-admission.ts:32`
- `evidence/orca/src/main/native-chat/agent-session-wire/providers/structured-agent-session-adapter.ts`
- `evidence/orca/src/shared/orchestration/orchestration-rpc-contract.ts:86`

**借鉴方案：**

- 每个 Session 有明确宿主、lease、fence 和 generation。
- 只有当前进程可以报告、提问或完成 Attempt。
- 输入结果区分 `accepted / admitted / rejected / unknown`。
- 未决调用先对账，不自动重发可能产生副作用的请求。

**优点：** 重启、接管和重复提交更容易证明正确。  
**代价：** 需要保存更多执行证据，并设计崩溃后的所有权恢复。

### 5.3 Structured Agent Registry：能力必须由 Adapter 证明

**来源：**

- `evidence/orca/src/main/native-chat/agent-session-wire/providers/structured-agent-registry.ts:1`
- `evidence/orca/src/main/native-chat/agent-session-wire/providers/structured-agent-registry.ts:30`
- `evidence/orca/src/main/native-chat/agent-session-wire/providers/structured-agent-registry.ts:66`
- `evidence/orca/src/shared/agent-session/capabilities/agent-session-capabilities.ts:1`

**[事实]** 声明能力若没有 Adapter 方法会注册失败；实时 Session 只能收窄能力，不能扩大。

**借鉴方案：**

- 为 Claude、OpenCode、DSH、Pi 声明统一能力集：发送、排队、取消、恢复、压缩、图片、审批等。
- 不支持的能力不进入通用路径，由 Specialist 或 Runtime 选择替代流程。
- 不用 Agent 名称散落判断能力。

**优点：** Worker 替换不再依赖隐式假设。  
**代价：** 需要维护能力测试，并防止声明与真实行为漂移。

### 5.4 Mailbox、Decision Gate 与回执语义

**来源：**

- `evidence/orca/docs/site/content/docs/cli/orchestration.mdx`
- `evidence/orca/src/shared/orchestration/orchestration-rpc-contract.ts:21`

**借鉴方案：**

- 邮箱发送回执只表示已持久化，不表示已读。
- 默认消费最老未读消息；`peek` 和 `all` 为显式只读。
- Decision Gate 是阻塞 Task 的显式审批，不与普通 Worker 提问混为一体。
- 权限代批必须由 Owner 显式开启。

**优点：** 审批、消息和恢复语义清晰。  
**代价：** 需要防止邮箱消息与 autoloop Outbox 形成第二套通知事实；若借鉴，应并入同一事件模型。

### 5.5 Bot Home / SOUL：身份与能力包分离

**来源：**

- `evidence/orca/src/main/bots/bot-home.ts:145`
- `evidence/orca/src/main/bots/bot-home.ts:181`
- `evidence/orca/src/main/bots/bot-preamble.ts:127`

**[事实]** Bot Home 包含 `SOUL.md`、`MEMORY.md`、`memory/` 和生成的 Agent 指令文件。

**借鉴方案：**

- Specialist 使用版本化的身份、用途、允许工具和输出约束配置。
- SOUL 类文件只描述 Specialist 工作方式，不成为跨对象共享的长期 Session。
- 用户仍只看到一个管家，不复制“多个可见 Bot”的产品管理成本。

**优点：** Specialist 可审查、可版本化、可测试。  
**代价：** 需要防止静态身份配置与个人记忆、正式知识混写。

### 5.6 Home Chat / 独立 Chat / Items：Owner 面向的任务视图

**来源：**

- `evidence/orca/src/main/bots/bot-chat-session.ts:1`
- `evidence/orca/src/main/bots/bot-chat-session.ts:97`
- `evidence/orca/src/shared/bots/bot-items.ts:1`
- `evidence/orca/src/shared/bots/bot-items.ts:160`
- `evidence/orca/src/main/bots/bot-items-link-join.ts:1`

**[事实]** Bot 有一个持续 Home Chat，也有独立线程和自动化 Chat；Item 有 `doneMeans`、状态、Needs you、评论、Snooze、Stale 和 Dispatch/PR/文件链接。

**借鉴方案：**

- 管家提供一个全局 Owner 会话，同时为每个对象保留独立 Context。
- 任务视图展示：目标、完成条件、当前 Attempt、产物、审批和下一步。
- `doneMeans` 必须能被 Result Lane 检查，而不是仅作展示文本。
- Needs you、Snooze 和 Stale 可作为低打扰交互机制。
- Items 只能是新 Runtime 的查询投影，不另建第二任务数据库。

**优点：** 用户能理解“正在做什么、为什么等待、怎样算完成”。  
**代价：** 若直接照搬 Orca Item 状态，会与 autoloop 任务形成双权威。

### 5.7 Look around：主动但只读的建议通道

**来源：**

- `evidence/orca/src/main/bots/bot-look-around-prompt.ts:17`
- `evidence/orca/src/main/bots/bot-look-around-policy.ts:1`
- `evidence/orca/src/main/bots/bot-look-around-policy.ts:145`
- `evidence/orca/src/main/bots/bot-look-around-runner.ts:39`
- `evidence/orca/src/main/bots/bot-look-around-state.ts:18`
- `evidence/orca/src/shared/bots/bot-look-around.ts:41`

**[事实]** Look around 是独立只读运行；工具、Shell、连接器和 Orchestration 有允许列表；每次最多五条建议；有超时、睡眠恢复、连续失败暂停、 dismissal 冷却和静默标记。

**借鉴方案：**

- 直接并入现有 V5：无模型预检优先，必要时才调用模型。
- Discovery Lane 只能读和生成 Suggestion，不能写正式 vault、发外部消息或启动 Worker。
- Suggestion 包含有用/无用/跟进；跟进后才创建正式 Task。
- 每轮限制数量、预算和频率；无价值结果静默。
- 来源撤回、重复转载、提示注入和低热高值进入对抗测试。

**优点：** 与管家的主动知识目标高度一致，同时控制权限和打扰。  
**代价：** 只读允许列表需要覆盖实际工具，不能只复制提示词。  
**注意：** Orca 源码中 Look around 仅支持 Claude/Codex；本机方案应落在自己的 Worker Contract 上，不引入 Codex 依赖。

### 5.8 Tidy-up：模型提案、宿主写入、历史与 Undo

**来源：**

- `evidence/orca/src/main/bots/bot-memory-tidy-up-runner.ts:1`
- `evidence/orca/src/main/bots/bot-memory-tidy-up.ts:27`
- `evidence/orca/src/main/bots/bot-memory-tidy-up.ts:220`
- `evidence/orca/src/main/bots/bot-memory-tidy-up.ts:297`
- `evidence/orca/src/main/bots/bot-memory-tidy-up-apply.ts:16`
- `evidence/orca/src/main/bots/bot-memory-record.ts:1`

**[事实]** Tidy-up 在无工具会话中读取受限输入并返回结构化草案；宿主检查增删数量、路径、并发变化和格式后写入；有归档、历史、Undo 和成功后水位线。整理输入只选择 Owner 对话及相应 Bot 回复。

**借鉴方案：**

- 仅用于 Owner 偏好、已确认决策和纠正经验的维护。
- 模型没有工具，只能提出变更草案。
- 宿主校验来源、版本、路径、行数、增删上限和秘密特征。
- 成功应用后才推进水位线；每次变更可追踪、可撤销。
- 个人记忆与正式 vault 分开；知识收录仍走 Result Lane 与知识质量门。

**优点：** 避免长期记忆无限增长和模型随意删除。  
**代价：** 增加模型调用、审计和冲突处理；当前并非最紧急能力。

### 5.9 Owner/Member、actsFor 与跨会话可见性

**来源：**

- `evidence/orca/src/shared/bots/bot-acts-for.ts:1`
- `evidence/orca/src/main/runtime/rpc/methods/orchestration/messaging/bot-request-send.ts:205`
- `evidence/orca/src/main/bots/bot-recent-chats.ts:36`
- `evidence/orca/src/main/bots/bot-recent-chats.ts:92`

**[事实]** 请求记录代表谁发起；非 Owner 请求不会进入 Owner 的 Home Chat。另一方面，同一 Owner 的会话会收到其他近期会话的标题、最近回复摘要和 Worker 状态。

**借鉴方案：**

- 借鉴请求者身份、来源、工作区和权限沿 Task/Attempt 全链传播。
- 外部人员请求与 Owner 私有上下文隔离。
- **不直接借鉴**自动注入其他对象的最近回复；只允许授权后的索引、决策引用或显式跨对象查询。

**优点：** 身份与权限可追踪。  
**风险：** 近期会话共享若照搬，可能违反不同文章和想法不得混合的要求。

### 5.10 Automations：预检、补跑、Session 和参数允许列表

**来源：**

- `evidence/orca/docs/site/content/docs/cli/automations.mdx`
- `evidence/orca/skill-guides/orca-cli/references/bots.md:107`

**借鉴方案：**

- 新自动化可先创建为 disabled。
- 无模型 precheck 优先，失败记录为跳过而不是执行失败。
- missed-run 有 grace，不无限补跑。
- 默认 fresh session；reuse 必须显式选择。
- 额外 Worker 参数采用允许列表，权限、配置、prompt、Session 参数不得任意穿透。
- 高风险任务不复制“Run now 有意绕过 precheck”的语义。

**优点：** 降低自动化误触发、补跑风暴和权限扩张。  
**代价：** 需要调度器、Worker 和审批模型共同支持。

### 5.11 Remote Server、Mobile 与通知

**来源：**

- `evidence/orca/docs/site/content/docs/remote-servers.mdx`
- `evidence/orca/docs/site/content/docs/mobile.mdx`
- `evidence/orca/docs/site/content/docs/notifications.mdx`
- `evidence/orca/docs/site/content/docs/telemetry.mdx`

**借鉴方案：**

- 多个入口连接同一 Runtime；客户端只是视图，不另起 Agent。
- 通知围绕状态变化、Needs you 和未读事项，不为每次后台运行推送。
- 移动配对、推送网关和远程执行分别做权限与内容出口审查。

**优点：** 符合未来多入口而单管家的方向。  
**不借部分：** 不默认接受宽权限配对，也不把私有正文发送到 push gateway/APNs/FCM，除非单独批准。

### 5.12 worktree 与代码 Worker 隔离

**来源：**

- `evidence/orca/docs/site/content/docs/model/worktrees.mdx`
- `evidence/orca/docs/site/content/docs/model/agents-sessions.mdx:61`

**借鉴方案：**

- 每个编码 Attempt 可使用独立 worktree 和分支。
- worktree 只负责代码文件隔离；系统权限仍需独立账号、容器或 VM。
- 不复制 `.env` 等秘密到工作区，不默认启用 `.worktreeinclude`。
- 不复制 Claude `--dangerously-skip-permissions` 等全自主默认参数。

**优点：** 并行编码和 Diff Review 更可控。  
**风险：** 把 worktree 误当安全沙箱会留下严重越权面。

### 5.13 版本化 Skill 指南与稳定命令/RPC

**来源：**

- `evidence/orca/docs/site/content/docs/cli/skills.mdx`
- `evidence/orca/src/shared/orchestration/orchestration-rpc-contract.ts:90`

**借鉴方案：**

- Worker 使用稳定、确定性的命令或 RPC。
- 外部安装短 stub，完整指南与当前 Runtime 版本匹配。
- 不兼容时返回新版指南和零副作用结果，不盲目重试旧命令。
- 支持 dry-run 和计划摘要，但不因此给 Worker 无限制 Shell 权限。

**优点：** 减少 Worker 与 Runtime 版本漂移。  
**代价：** 需要维护契约版本和迁移测试。

### 5.14 AI Vault 与 Pi：明确不作为等价物借入

**来源：**

- `evidence/orca/src/shared/ai-vault/contracts/ai-vault-types.ts:1`
- `evidence/orca/src/shared/ai-vault/contracts/ai-vault-types.ts:113`
- `evidence/orca/src/main/pi/rpc-agent-definition.ts`
- `evidence/orca/src/main/pi/rpc/launch/rpc-launch.ts`

**结论：**

- Orca AI Vault 是跨 Agent Session History 的扫描、搜索、恢复和 fork，不是管家的 Markdown 知识 vault。
- 可另评“会话历史检索”，但不接成正式知识事实源。
- Orca 的 Pi 支持走 Pi CLI JSONL RPC，与当前管家 Pi Agent Core `pi-worker.mjs` 不是同一实现。
- 不把 Orca 的 Pi 支持当成当前 Pi Worker 的即插即用替代。

## 六、三条整体路线的优缺点

### 路线 A：继续在现有系统上逐项拼接

**做法：** 保留全部现有实现，把 Orca 的 Dispatch、Items、Memory、Look around 分别加入。

**优点：**

- 初期改动较小。
- 可继续复用当前测试和飞书链路。

**缺点：**

- 最容易形成双任务状态、双记忆和双完成语义。
- 每个模块都可能带有自己的隐含架构假设。
- 长期维护成本和认知负担最高。

**判断：[建议] 不作为战略路线。** 小型缺陷修复仍可渐进，但不能用它承载整体目标。

### 路线 B：自主整体重构 Butler Runtime，系统借鉴 Orca

**做法：** 可以推翻当前 autoloop 代码；先统一领域模型，再按完整闭环纵向迁移。Orca 是参考实现和可选 Worker 后端。

**最强理由：**

- 所有核心概念围绕单管家和唯一事实源设计。
- 飞书、对象隔离、Result Lane、vault 和私有数据边界不需要迎合另一套产品模型。
- 可只实现管家实际需要的 Runtime，避免桌面和云产品负担。

**最大收益：** 长期一致性、可控性和可解释性。  
**最大风险：** 低估 Session、恢复、远程执行和 Worker 兼容的重建成本。  
**最难回答的反对意见：** 可能重造 Orca 已有能力，并失去上游持续维护带来的收益。

**适用条件：** 用户要求核心 Runtime 长期自主，或 Orca 需要深度修改才能满足硬约束。

### 路线 C：以 Orca 为唯一底座整体改造

**做法：** 废弃 autoloop，迁移其事实到 Orca；改造 Orca 的路由、结果、权限、记忆和入口，使其成为唯一 Runtime。

**最强理由：**

- 直接继承 Dispatch、Session fence、邮箱、自动化、远程控制、多 Agent Adapter、Bot 和 worktree。
- 如果大部分实现可以直接保留，可能显著缩短能力落地时间。
- 只使用 Orca、不再运行 autoloop，也可以满足单事实源。

**最大收益：** 复用现成实现和上游维护。  
**最大风险：** 深度 Fork、升级冲突和核心语义改造成本。  
**最难回答的反对意见：** 当结果、路由、记忆、权限、飞书、vault 和交互都要修改时，剩余可复用价值是否仍高于自主 Runtime。

**适用条件：** 用户接受长期依赖 Orca 技术栈和升级体系，且隔离实测证明只需薄适配即可满足全部硬约束。

## 七、当前建议及其可推翻条件

### 7.1 当前建议

**[建议] 优先路线 B：整体重构管家，纵向验证迁移；系统借鉴 Orca，不保留两套 Runtime。**

理由不是“autoloop 不能动”，而是目前 Orca 已证实存在以下核心语义差异：

1. Worker 上报成功可直接完成 Task：`evidence/orca/src/main/runtime/orchestration/db/dispatch-context/attempt-task-settlement.ts:34`。
2. Bot 可自行关闭 Item：`evidence/orca/src/main/bots/bot-items-writes.ts:44`。
3. 同一 Owner 的近期会话摘要会自动进入其他 Chat：`evidence/orca/src/main/bots/bot-recent-chats.ts:92`。
4. 默认全自主权限和 worktree-as-sandbox 不符合管家安全边界：`evidence/orca/docs/site/content/docs/model/agents-sessions.mdx:63`。
5. 多 Bot、桌面和云连接器产品形态与单管家目标不同。

### 7.2 可以推翻该建议的证据

若其他 Agent 或后续隔离实验能够证明：

- Orca 可作为唯一 Runtime，不需要双事实源；
- Result Lane、对象隔离和单管家身份只需薄适配；
- 飞书与本地 vault 不需要重写 Orca 核心；
- 权限和私有数据出口可满足约束；
- 上游升级不会持续破坏改造；

则路线 C 应重新评估，不能因本报告的当前倾向而被排除。

## 八、推荐目标架构与事实权威

```text
飞书 / 其他入口 / 定时与外部事件
                ↓
         Butler Runtime（唯一事实源）
 OwnerEvent / Task / Attempt / Approval / Outbox
                ↓
      Root Router → Specialist → Object Context
                ↓
             Worker Contract
                ↓
 Claude / OpenCode / DSH / Pi / 可选 Orca 执行后端
                ↓
              Result Lane
    重读产物、外部副作用、知识结果与完成条件
                ↓
  原 Context 通知 / Owner 任务视图 / 后续恢复

正式知识：本地 Markdown vault
个人记忆：Owner 偏好与已确认决策，独立于 vault
```

| 数据 | 唯一权威 |
|---|---|
| 请求、事件去重、Task、Attempt、审批、Outbox | Butler Runtime |
| 对象 Session 关联与检查点 | Butler Runtime；Worker 私有 Session 仅为实现细节 |
| Worker 最终是否可信完成 | Result Lane 核验后写入 Runtime |
| 正式知识正文 | 本地 vault |
| Owner 偏好与已确认决策 | 独立个人记忆存储，可审计、可撤销 |
| Owner 任务列表、Items 式视图 | Runtime 的可重建投影 |
| Orca 内部 Run/Task（若未来使用） | Orca Worker 私有执行状态，不是管家权威 |

## 九、可拆分、可验证、可回退的迁移方式

整体架构一次定清，但实施按纵向闭环拆分，不做 Big Bang：

1. **R0 行为基线**：整理现有 41/41 和 V0～V4 验收为重构后的契约测试。
2. **R1 新 Runtime 合成闭环**：OwnerEvent → Task → Attempt → Result Lane → Outbox，含重启恢复。
3. **R2 路由与对象隔离**：多对象、多候选追问、不同结果不得混合。
4. **R3 可替换 Worker**：Claude/OpenCode 先行，DSH/Pi 按既有证据迁移；测试假成功、旧 Attempt、未知副作用。
5. **R4 本地知识闭环**：只读、收录、去重、回滚和原上下文通知。
6. **R5 飞书迁移**：测试入口验证后，再冻结旧写入、核对增量、保持单消费者并演练回退。
7. **R6 主动知识与记忆整理**：先 Look around 式建议闭环，再决定是否需要 Tidy-up。
8. **R7 可选 Orca 后端**：仅隔离代码任务实验，不影响主 Runtime。

每个切片要求：独立提交、明确文件范围、端到端证据、上一版好状态和可执行回退。生产飞书任何时候不得出现第二个未授权消费者。

## 十、主要风险与评审重点

| 风险 | 影响 | 评审时应要求 |
|---|---|---|
| 自主重写低估成本 | 周期延长、可靠性倒退 | 用既有闭环逐片验收，不一次替换全部能力 |
| Orca 深度 Fork | 上游升级困难 | 统计必须修改的核心模块，而非只看可用功能数 |
| 双事实源 | 恢复和通知互相矛盾 | 明确每类数据唯一写入者 |
| Worker 假成功 | 对用户错误宣称完成 | Result Lane 敌意测试 |
| 跨对象上下文泄漏 | 文章、想法和结果混杂 | A/B 对象相反结论测试 |
| 记忆污染 | 外部指令变长期偏好 | 无工具草案、宿主校验、来源与 Undo |
| 权限过宽 | 仓库外写入、数据出口 | 独立系统边界，禁止默认全权限 |
| 迁移双消费者 | 飞书重复处理 | 单消费者、幂等和回退演练 |

## 十一、请其他 Agent 重点裁决的问题

1. 路线 B 与 C 哪条更符合“长期可维护的完整管家”，理由和反证是什么？
2. 本报告是否把某些当前 autoloop 已有能力误写成新缺口？
3. 有哪些 Orca 可复用模块能在不引入第二事实源的情况下直接依赖，而非只能借鉴设计？
4. Result Lane 与对象隔离若落在 Orca 上，究竟需要薄 Adapter 还是核心改造？
5. 是否应先做一个有时间盒的 Orca 隔离 RC，用现实成本回答路线选择？
6. 用户是否接受核心 Runtime 长期依赖 Orca 技术栈与升级体系？这是路线 C 的产品前提。

## 十二、结论

Orca 对管家的价值已经不限于编码 Worker：它提供了 Dispatch、Session 所有权、Items、Look around、Tidy-up、Automations 和远程控制等一组完整参考机制。

但“借鉴价值高”不等于“必须以其为底座”。当前建议是：

> **允许并建议按统一领域模型整体重构管家；保留的是已经验证的目标与行为约束，不是旧代码。优先自主 Runtime，逐项吸收 Orca 的机制并以来源和测试约束实现；只有在薄适配证据成立时，才改选 Orca 作为唯一底座。**

无论选择哪条路线，都明确排除“保留两套任务权威、把各项目功能直接拼在一起”的四不像方案。

---

## 附录：固定提交在线证据入口

统一提交：`44243be42221b6946c482aab39dfc0bc51ce06aa`

- [Orca README](https://github.com/stablyai/orca/blob/44243be42221b6946c482aab39dfc0bc51ce06aa/README.md)
- [Orchestration 文档](https://github.com/stablyai/orca/blob/44243be42221b6946c482aab39dfc0bc51ce06aa/docs/site/content/docs/cli/orchestration.mdx)
- [Automations 文档](https://github.com/stablyai/orca/blob/44243be42221b6946c482aab39dfc0bc51ce06aa/docs/site/content/docs/cli/automations.mdx)
- [Worktrees 文档](https://github.com/stablyai/orca/blob/44243be42221b6946c482aab39dfc0bc51ce06aa/docs/site/content/docs/model/worktrees.mdx)
- [Agent 默认权限](https://github.com/stablyai/orca/blob/44243be42221b6946c482aab39dfc0bc51ce06aa/docs/site/content/docs/model/agents-sessions.mdx#L61-L65)
- [Bot Home](https://github.com/stablyai/orca/blob/44243be42221b6946c482aab39dfc0bc51ce06aa/src/main/bots/bot-home.ts#L145-L214)
- [Bot Preamble](https://github.com/stablyai/orca/blob/44243be42221b6946c482aab39dfc0bc51ce06aa/src/main/bots/bot-preamble.ts#L47-L85)
- [Bot Items](https://github.com/stablyai/orca/blob/44243be42221b6946c482aab39dfc0bc51ce06aa/src/shared/bots/bot-items.ts#L1-L69)
- [Look around 只读策略](https://github.com/stablyai/orca/blob/44243be42221b6946c482aab39dfc0bc51ce06aa/src/main/bots/bot-look-around-policy.ts#L1-L43)
- [Tidy-up 输入与草案约束](https://github.com/stablyai/orca/blob/44243be42221b6946c482aab39dfc0bc51ce06aa/src/main/bots/bot-memory-tidy-up.ts#L293-L330)
- [Worker 报告身份校验](https://github.com/stablyai/orca/blob/44243be42221b6946c482aab39dfc0bc51ce06aa/src/main/runtime/orchestration/workers/reports/worker-report-admission.ts#L32-L52)
- [Worker 成功直接完成 Task](https://github.com/stablyai/orca/blob/44243be42221b6946c482aab39dfc0bc51ce06aa/src/main/runtime/orchestration/db/dispatch-context/attempt-task-settlement.ts#L34-L48)
- [Agent 能力与 Adapter 注册](https://github.com/stablyai/orca/blob/44243be42221b6946c482aab39dfc0bc51ce06aa/src/main/native-chat/agent-session-wire/providers/structured-agent-registry.ts#L30-L69)
- [近期会话共享](https://github.com/stablyai/orca/blob/44243be42221b6946c482aab39dfc0bc51ce06aa/src/main/bots/bot-recent-chats.ts#L36-L60)
- [AI Vault 类型](https://github.com/stablyai/orca/blob/44243be42221b6946c482aab39dfc0bc51ce06aa/src/shared/ai-vault/contracts/ai-vault-types.ts#L113-L161)

以上在线链接均由固定提交与已读本地路径构造；本轮证据读取以本地只读副本为准。
