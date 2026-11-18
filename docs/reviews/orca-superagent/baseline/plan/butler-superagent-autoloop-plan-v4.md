# 管家 Super Agent + autoloop 重构 Plan v4

- 日期：2026-11-17
- 状态：对抗复核通过；仅可进入阶段 0a 隔离实验，不代表已获实施授权或生产就绪
- 审查记录：`/Users/hoye/Documents/workspace/plan/butler-superagent-autoloop-plan-v4-adversarial-review.md`
- 基础版本：`/Users/hoye/Documents/workspace/plan/butler-superagent-autoloop-plan-v3.md`
- 核心定位：**Super Agent 是产品形态与智能层，autoloop 是持久编排内核；Claude Code、OpenCode、DSH 都是可替换 Worker，本地 Markdown 知识库继续作为正式知识事实源。**

## 一、背景、目标与非目标

### 1.1 为什么重构

现有管家以单 Agent、同步等待和单一长会话为主，难以同时满足：后台任务不阻塞聊天、多个对象并行推进、不同领域使用专业工作规范、重启后恢复，以及主动获取知识。

本版不再以 DSH 为主 Runtime，也不保留旧 Syno JobStore/Outbox 作为第二套任务账本。DSH 只是知识 Worker 之一。需要保留的是 `vault/` 正式知识，以及审核后迁移的个人目标、确认记忆和决策；旧 Job/Workflow 只读归档。

### 1.2 产品目标

1. **统一身份**：用户只面对一个管家，不管理进程、Worker 和 Session。
2. **持续运行**：事件驱动唤醒；等待时不运行模型，不靠常驻 LLM 死循环。
3. **持续执行**：任务可排队、恢复、取消、追问、复查和通知，聊天不被长任务阻塞。
4. **上下文隔离**：同一领域共享专业规范，不同文章、想法和项目不共享原始正文与具体会话。
5. **主动但有边界**：围绕明确目标和订阅发现候选；自动发现不自动获得信任、推送或正式知识写入权限。
6. **本地事实**：正式知识、个人事实和可信检查点留在本地；运行时任务事实只在 autoloop。

### 1.3 非目标

本 Plan 不直接实施多租户、群聊授权、多机调度、插件市场、Worker 私下互派、自动修改规则/Skill/高信任记忆，以及发布、删除、停服、付款、对外发消息等高风险动作；不在第一阶段引入完整 AIHOT/PostgreSQL，不在未验收前切换生产飞书监听或写入。

## 二、总体架构

```text
Owner 飞书私聊             cron / GitHub / RSS / Webhook / 文件变化
      │                                  │
      ▼                                  ▼
Feishu Inbound Adapter             Source / command Adapter
验证 Owner、稳定消息 ID             稳定事件 ID、来源与信任级别
      │                                  │
      └───────────────┬──────────────────┘
                      ▼
             agent-autoloop Hub
       唯一运行时任务与事件事实源
 SQLite 日志 / 去重 / 静态规则 / 队列 / 租约
 轮次 / 恢复 / 取消 / 审批 / 通知 / 跳数熔断
                      │
                 owner.chat
                      ▼
        Root Router（Claude Code，默认新 Session）
  读取全局偏好 + 当前路由快照；只判断继续/切换/新建/追问
                      │ 结构化路由提议
                      ▼
          确定性 Context Adapter / Router Wrapper
 校验 Owner、context_id、domain、对象与允许操作；生成可信事件类型
                      │
          context.<domain>.message
          subject = context_id
                      ▼
        autoloop 静态规则选择 Domain Specialist
  Specialist = 固定 prompt / Skill / Agent / cwd / access / 输出标准
                      │
             Object Context Control Lane
       只接 Owner 授权的控制消息；按对象排队、续接与检查点恢复
               │                       │
               │ 可直接回答            │ 需要后台执行
               │                       ▼
               │              白名单 task.* 事件
               │                       ▼
               │        Claude Code / OpenCode / DSH / command Worker
               │                       │
               │              task.result（确定性关联）
               │                       ▼
               │        Object Context Result Lane
               │  默认新 Session；可信检查点 + 明确标记的不可信结果
               └───────────┬───────────┘
                           ▼
                 唯一 Feishu Bot / 卡片
```

Supervisor 不是与 Root Router 并列的另一个 Agent，而是整个管家产品层的统称：统一人格、目标、个人记忆、Root Router、Specialist 配置、上下文检查点和结果表达共同构成 Supervisor。

## 三、核心组件与职责

### 3.1 autoloop：只负责持久编排，不冒充完整智能层

已核查只读克隆 `/Users/hoye/Documents/workspace/plan/source-review/agent-autoloop`，提交 `1b89219558a493d701cb20e2c3b1876576709889`。它提供事件日志、去重、轮次、租约、恢复、取消、重试、审批、通知和 Worker 插件；但没有个人目标、长期记忆、语义路由和知识策展。

因此不另写 JobStore，也不把 autoloop 当作完整 Super Agent。当前克隆是 main 提交而非已选 Release，实施前必须固定官方 Release/SHA 和 Node 版本。

### 3.2 Root Router：路由消息，不保存所有对话

- 每次由 `owner.chat` 唤醒，默认 `resume:false`；输入是全局偏好、本轮全部来源消息和带日志水位的紧凑路由快照，不把所有文章正文累积进一个根 Session。
- **必须按批处理**：autoloop 会把排队或失败重试期间的同 lane 事件合并进一个 Job。Router 输出是与输入一一对齐的决定数组，每项包含 `owner_event_id`、`continue/switch/create/ask/reject`、目标对象和快照水位；禁止只返回一个决定覆盖整批消息。
- Router 不能输出 Agent、cwd、access、Hub 密钥或通知权限。`ask/reject` 也是显式结果，不能丢弃未决定消息。
- “刚才那个”“接着聊”等存在多个候选时必须追问，不能仅按最近更新猜测。追问由 `pending_id` 关联原消息；回答必须解析该 pending，仍有歧义则继续追问。
- 路由快照由可信包装从 Hub 上下文事件追平生成；本地 Registry 只供检视，不进入一致性关键路径。

### 3.3 Context Adapter：把模型提议变成受控事实

薄确定性包装负责：

1. 从 Job context 枚举本轮全部 `owner_event_id`；模型输出漏项、重复或含未知 ID 时，整批不得发出任何 context 事件，只能显式失败并重试/通知，不能部分提交后让剩余消息静默丢失；
2. 校验每条决定的 Owner、消息 ID、目标 context_id、允许 domain 和对象引用；每条输入最终必须有且仅有一个路由、追问或拒绝结果；
3. 为新对象生成稳定 ID，为每条输入生成确定性事件 ID（如 `ctxmsg:<owner_event_id>`），使整轮回放和至少一次提交不创建重复上下文；拒绝伪造、跨 Owner、archived 写入和未允许操作；
4. 将 domain 编码进可信事件类型，例如 `context.capture.message`、`context.knowledge.message`、`context.idea.message`；
5. 固定 `subject=context_id`，并写入来源消息、路由动作和检查点引用；
6. 只提交白名单事件，不让模型文字直接修改路由表；
7. 在调用模型前记录路由快照的 Hub 日志水位和每个相关 context 的版本，提交前追平并再次校验。生产路径必须提供 `expected_context_version` 条件提交或等效的同事务校验；stale 决定只能刷新后重试或追问，不能按旧快照创建、继续或归档。若上游没有条件提交接口，阶段 0 可用单写入串行原型验证协议，但在证明租约竞争和崩溃重放安全前不得通过生产一致性门。

这是必要的，因为已核查的 autoloop 规则只按 `source + types` 匹配，不按事件 payload 中的 `domain` 选择规则；事件合并与至少一次执行也不会替业务层保证逐消息归属和快照新鲜度。

### 3.4 Domain Specialist：共享规范，不共享对象正文

Specialist 是静态配置与能力包，不是一个跨对象共享的长期 Session。首批只保留：

| Specialist | 职责 | 默认权限 |
|---|---|---|
| 知识收录 | 获取、去重、提炼、收录候选 | 公开资料读取；vault 仅经知识写入路径 |
| 知识讨论 | 基于已保存知识与引用讨论 | 本地知识只读；新外部材料走 Worker |
| 想法讨论 | 澄清、推演、整理想法 | 默认只读，不自动收录 |
| 调研 | 围绕明确问题检索与核验 | 独立只读 Worker，结果不可信 |
| 代码 | 后续按独立 Plan 扩展 | 隔离 worktree，另行授权 |

同一个 Specialist 可服务多个对象，但每个对象拥有独立 Control Lane、Result Lane、Session 引用和检查点。

### 3.5 Object Context：上下文身份，不等于无限长 Session

推荐键：`capture:<document_id>`、`knowledge:<document_id>`、`idea:<idea_id>`、`research:<task_id>`、`project:<project_id>`。

每个 Object Context 由四部分组成：

1. **Control Lane**：只接 Owner 授权的控制消息，可按对象 `resume`；Owner 指令可信不等于其中粘贴的网页、附件和引用内容可信。
2. **Result Lane**：接 Worker、网页和外部资料，默认 `resume:false`；从可信检查点恢复必要背景，原始结果始终标记不可信。
3. **可信检查点**：由唯一确定性 Checkpoint Writer 写入，字段分区保存：
   - `confirmed`：Owner 明确确认的偏好、结论和对象关系，只能来自可信 Control 事件；
   - `operational`：context/task/event 引用和路由状态，只能来自 Hub 事实；
   - `untrusted_working`：Worker 摘要、外部主张和待核验候选，始终带来源并作为数据处理。
   Result Lane 只能提交不可信候选，不能直接提升为已确认结论、用户偏好或对象关系；提升必须有 Owner 确认或另一条可信控制路径。检查点记录已确认结论、待办和对象关系，不复制整段外部原文；空闲后归档并新开会话。
4. **不可信资料引用**：网页、Worker 原文和附件保存在受限资料区，按引用读取，不自动进入高信任记忆或 Skill。

讨论新网页或新外部材料时，Control Lane 发任务，由 Result Lane 处理资料；不得为了“续接同一对象”而把原始不可信结果重新灌入长期 Control Session。

### 3.6 Context Registry：只是投影，不是第二事实源

Hub 的 `context.*` 事件是上下文创建、路由、归档和检查点引用的事实源。Owner 当前所在上下文、pending 追问和对象版本也由这些事件派生。本地 Context Registry 可保存为便于检视的 Markdown/JSON 投影，内容包括 context_id、domain、对象引用、可信摘要、Session 引用、active/archived 和时间，但必须能从 Hub 事件与检查点文件重建，不参与任务状态机，不与 Hub 双写成两个真相。

Router 使用的快照必须带 Hub 日志水位和相关 context 版本；可信包装在调用前追平，Adapter 在提交前再校验。异步展示投影可以滞后，但滞后快照不得用于创建、继续或归档。首刀不要求持久化 Markdown Registry，可先用可从 Hub 重放的内存投影证明协议。

检查点文件采用内容寻址或哈希引用：先写不可变文件，再提交引用事件；孤立文件可忽略，引用缺失则停止恢复并显式报错，不静默换上下文。

## 四、端到端数据流

### 4.1 Owner 消息与路由

1. Feishu Inbound 验证 Owner，为每条消息生成稳定 `owner.chat` 事件；事件不能携带 Agent、cwd、access。
2. Hub 可能把多条消息合并进同一个 Root Job。可信包装枚举全部输入并生成带水位的路由快照，Root Router 为每条消息分别输出决定。
3. Context Adapter 校验决定数组的完整性与快照版本，以确定性事件 ID 为每条输入提交 `context.<domain>.message`、`subject=context_id`，或建立可追踪的 pending 追问/显式拒绝；不得整批共用一个目标。
4. 静态规则选择 Specialist、实际 Agent、目录、权限、并发和 emits。对象规则必须配置 `parallel`，使 subject 真正对应独立 lane；同组规则的 parallel 配置必须一致。
5. 同对象消息进入同一 lane；不同对象可并行。Object Control 同样从 Job context 处理本轮全部消息，不假设每轮只有一条。某对象执行或排队不阻塞其他对象。

### 4.2 任务与结果

需要执行时，Object Control Lane 只能发白名单 `task.*`。每个任务由确定性任务包装生成关联 envelope，至少包含：逻辑 task_id、来源 owner_event_id/run/event、Owner、context_id、domain、结果 event ID、状态和资料引用。字段由 Job context 复制并校验，不相信模型自觉填写。

Worker 成功才发 `task.result`；结果进入对应 Object Result Lane，由同一管家身份汇总、追问或建议。失败回执中的 events 会被 autoloop 拒绝，因此失败、取消和连续失败由 Hub 原生重试、状态和系统卡片闭环，不伪造成功结果。

所有链路受 8 跳熔断约束；长期跟进用同事项的 `ask/later`，不得伪造新根事件绕过。

### 4.3 典型场景

- **收录 A 后再收录 B**：共用知识收录 Specialist，分别建立 `capture:A`、`capture:B`；A 后台继续，B 可并行，正文不混合。
- **随后讨论 A**：进入 `knowledge:A`；不因存在 URL 再次收录。已保存知识可直接读，新网页材料走 Result Lane。
- **切换想法 X**：创建或恢复 `idea:X`；多个候选都能匹配“刚才的想法”时先追问。
- **把想法整理成知识**：用户显式触发新知识任务，保留 `idea:X ↔ knowledge/task` 引用，不合并上下文。
- **Worker 结果到达**：只回到原 context_id 的 Result Lane；错误关联、伪造或重复结果被拒绝或进入显式对账。

## 五、本机执行器与现有资产

### 5.1 执行器清单

- **Claude Code**：首选 Root Router、Context Specialist、调研 Worker；后续可承担代码 Worker。真实接入前使用专用配置、工具白名单、独立 Home/cwd 和环境允许列表。
- **OpenCode**：通过 ACP 接入的可选 Worker；上游仅记录有限握手/执行证据，多轮问答、续接和恢复必须本机另验，第一阶段不依赖它。
- **DSH**：知识/收录 Worker。内置 adapter 要求 ≥0.2.2，而当前 Syno 固定 0.2.1-alpha.1；需要薄 `syno-dsh` adapter 显式固定版本、profile、Home 和权限。DSH 默认存在向 DeepSeek 上传会话日志的数据出口，接触真实 vault、Owner 指令或个人事实前必须实测关闭，或取得单独授权；否则只处理公开/合成资料。
- **command Worker**：无模型轮询、校验、投影、预算门和确定性适配。

DSH 或 OpenCode 接入失败不得阻塞“Root Router + Claude Code”的首条闭环。Codex 不是本机现有依赖。

### 5.2 Syno 资产处理

| 资产 | 处理 |
|---|---|
| `vault/` | 原样保留；先只读/副本验证，迁移期禁止双写 |
| `ops/memory/` 中确认的记忆、目标、决策 | 审核后迁移为本地 Markdown，保留来源和撤销状态 |
| 旧 Job、Workflow、Outbox | 只读归档，不进入新活动状态 |
| Feishu Owner 校验、附件下载、typing | 抽成 Inbound Adapter 复用，不保留旧主聊天控制面 |
| KnowledgeStore、敏感拒读、摄取校验 | 抽成本地知识服务/库复用 |
| `@syno/dsh-plugin` | 仅作为 DSH Worker 能力包 |
| DeepSeekHarnessCognitiveRuntime、主会话 Scheduler | 从新主控制面退役 |
| 旧生产服务 | 验收与用户授权前保持原状 |

AIHOT 只作为公共只读来源和方法参考，复用判重、来源多样性、预算回执和 SelectBench 思路；不进入本地知识核心。

## 六、数据归属与硬边界

| 数据 | 权威位置 |
|---|---|
| 正式知识 | 本地 `vault/` Markdown |
| 个人目标、确认记忆、决策 | Supervisor 本地 Markdown |
| 上下文生命周期、消息与检查点引用 | autoloop `context.*` 事件 |
| Context Registry | 可重建的本地投影，不是第二事实源 |
| 事件、任务、轮次、审批、重试、卡片 | autoloop SQLite |
| Worker stdout、Session、临时结果 | Worker 私有运行目录 |
| 原始网页和外部资料 | 受限资料区，明确不可信 |
| 规则、权限、Skill | 可信配置，仅人工或独立开发流程修改 |

必须始终满足：

1. `access` 是插件权限映射，不是系统沙箱；真实 Hub、Feishu 或 vault 实验前，Supervisor 与不可信 Worker 使用独立系统账号或容器，只挂载声明目录。当前 Worker 环境会继承多数父环境，必须另做显式允许列表。
2. 指令/数据分离不等于提示注入免疫；网页和 Worker 结果不能改变路由、权限、记忆、Skill 和通知目标。
3. autoloop 是至少一次执行；事件去重不等于模型或副作用绝不重复。副作用需要幂等键或执行前对账，未知执行不得盲目重做。
4. 用量统计不是预算硬熔断；真实付费自动化前必须有每规则重试、并发和预算上限。
5. `askFirst` 不是硬审批；高风险动作以后由确定性门核验真实审批状态。
6. 新旧系统不得同时写 vault、个人记忆、目标或决策；自动发现只写候选。
7. 内置飞书插件主要是卡片通道，普通 Owner 私聊 inbound 需要新增；同一应用不能双监听。
8. SQLite 日志会增长，备份含敏感事件与密钥；需要保留策略、加密备份和恢复演练。
9. 本机 CLI 自动化须遵守服务条款，不把个人订阅当无限后台额度。

## 七、实施步骤与阶段门

> 纵向执行顺序以 `/Users/hoye/Documents/workspace/plan/butler-superagent-autoloop-vertical-slices-v4.md` 为准：先用合成数据跑通最小完整链路，再逐片增加真实模型、多对象、测试飞书、知识与迁移。本节的 0a/0b/0c 是需要保留的专项测试与能力门，不再理解为必须把所有组件分别做完后才第一次端到端联通。

### 阶段 0：固定基线与敌意原型验证

先固定 autoloop Release/SHA、Node 版本，在独立实验目录运行 typecheck、协议、模拟和崩溃测试。再把阶段 0 拆成三个小实验，避免第一轮同时验收完整通知、迁移、隔离和所有 Specialist：

**0a：假 Hub + Root Router/Adapter，只证明路由协议**

1. 用内存、可重放的 Hub 投影和假 Router 验证批量决定数组、确定性事件 ID、pending 追问与 stale 拒绝；首刀不需要持久 Markdown Registry 或真实 Specialist。
2. 敌意时序必须包括：首次 claim 前连续到达“收录 A / 收录 B / 想法 X”；首条失败重试期间到达第四条；`create A → continue A → archive A → message A` 期间暂停投影。
3. 每条来源消息必须恰好得到一个路由、追问或显式拒绝；A/B/X subject 两两隔离；stale 快照不得创建重复对象或复活归档对象。
4. 实现条件版本提交或等效事务原型，并注入租约竞争、提交后崩溃和整轮回放；做不到时只能保留单写入实验结论，不得通过生产一致性门。

**0b：加入假 Worker + Result Lane，只证明任务和结果关联**

1. 跑通 `context.<domain>.message → task.* → task.result → Object Result Lane` 及失败/取消原生闭环。
2. 负测合法 Worker 提交错误 context_id/task_id、同结果 ID 不同内容、重复和迟到结果；Hub emits 和事件去重不能替代业务关联校验。
3. 为实际 rules 配置验证对象规则 `parallel`、同组配置一致、同对象串行、不同对象并行和 Control/Result Session 隔离。

**0c：加入持久检查点 + Claude 专用配置**

1. 实现唯一 Checkpoint Writer 与 confirmed/operational/untrusted_working 字段分区；恶意合成 Worker 结果不得未经 Owner/可信控制路径进入可信字段。
2. 验证 Registry/投影可从 Hub 重建，检查点孤立、引用缺失和事件重放不造成双真相或静默串线。
3. 制作 Claude 专用 adapter/config：工具白名单、独立 Home/cwd、环境允许列表，无 Hub Owner Key/Feishu 凭据；真实数据前完成系统账号/容器隔离。
4. 盘点 vault、个人记忆、目标、决策和旧在途事项；只读，不复制密钥到计划或日志。

**阶段门**：0a 的批量与一致性敌意用例全部通过，才进入 0b；0b 的关联与失败闭环通过，才进入 0c；0c 的信任、隔离与迁移清单有证据后才接真实模型。未通过则只继续合成数据实验。

### 阶段 1：Claude Code 纵向闭环

1. 实现隔离测试飞书应用或假通道的 Owner inbound，复用 Owner 校验和 typing。
2. 接入 Root Router、知识收录/知识讨论/想法讨论三个最小 Specialist，以及对应 Object Control/Result Lane。
3. 配置一个只读 Claude 调研 Worker；Worker 不直接写 vault，不持有飞书或 Hub 管理凭据。
4. 验证事件重放、Root/Object/Result/Worker/Hub 分别重启、Session 续接失败、同 token 结果重交、取消、超时、跳数和通知去重。
5. 验证 A 收录期间可收录 B，讨论 A 不重复收录，想法切换不串线，Worker 运行时新消息不被阻塞。
6. 真实模型前启用重试、并发和预算硬熔断；否则只用假 Agent 或明确人工限额实验。

**阶段门**：真实 Owner 指令完成路由、后台执行和统一回复；失败/取消可见；不同对象无原始正文或 Session 串线；DSH/OpenCode 不参与也成立。

### 阶段 2：DSH 知识 Worker 与迁移

1. 用隔离的 DSH ≥0.2.2 和显式 profile/Home adapter 实测问答、resume、工具面和恢复。
2. 私有数据进入前证明上传/遥测关闭，或取得单独授权。
3. 先只读验证 vault 搜索、敏感拒读和引用，再在副本验证收录、幂等、精确路径提交和回滚。
4. 迁移确认后的个人事实；最终切换前冻结旧写入，做最终增量迁移和数量/校验和核对。
5. 旧 Job/Outbox 完成、明确取消或逐项人工登记，原始文件只读保留。
6. 停止 DSH 验证总管仍运行；完成单飞书监听、全部本地事实单写入和回退演练后，再由用户决定是否生产切换。

**阶段门**：DSH 可替换；知识只在本地文件；无双任务账本、双监听、双写入或未经同意的数据出口。

### 阶段 3：主动知识与低打扰简报

用 cron + command Worker 无模型轮询，仅新候选唤醒模型；候选、判重、信源反馈和推荐理由落本地文件。自动发现默认静默试订阅，每日简报最多 5 条，支持有用/无用/跟进。通过重复转载、热门无关、低热高值、提示注入和来源撤回样本评测后，才开启生产主动推送。

### 阶段 4：按真实缺口扩展

OpenCode/Claude 代码 Worker、隔离 worktree、运维 Worker、确定性审批门、多模型成本路由、完整 AIHOT 私有部署和多机 Worker 均另行出 Plan，不由本文自动授权。

## 八、首轮验收标准

1. **形态**：等待不耗模型；Owner、cron 和结果可唤醒；Hub/Worker/各 Lane 重启后事实与检查点可恢复。
2. **路由**：批量合并与失败重试期间，每条 owner_event_id 仍恰好得到一个路由、追问或拒绝；A/B/X 并行不串正文；讨论 A 不重复收录；想法切换与恢复正确；歧义必须追问；归档后可从可信检查点恢复。
3. **一致性与权限**：投影暂停或 stale 快照不得制造重复对象、写入 archived 或覆盖新状态；模型不能覆盖 Agent/cwd/access/Skill；伪造 context_id、domain、subject、task_id、跨 Owner 和 archived 写入被拒绝。
4. **结果**：成功到原 Object Result Lane；失败/取消走 Hub 原生闭环；错误关联、伪造和重复结果不生效。
5. **恢复**：重复事件不新增事项；同 token 同结果不重复生效；未知执行先对账；副作用有幂等或对账。
6. **隔离与信任**：真实数据前证明 Supervisor/Worker 无法读取 Hub 数据、通道凭据和未声明目录；至少 5 条提示注入样本不能改路由、权限、记忆、Skill 或通知目标；恶意 Worker 结果只能进入 untrusted_working，不能未经确认进入 confirmed 偏好、结论或对象关系。
7. **预算**：重试、并发和预算到上限即停止或等待人工，不只记录用量。
8. **知识**：第一阶段 vault 无非声明写入；第二阶段知识变化可追溯到任务、来源、校验和精确路径；DSH 有上传关闭证据或单独授权。
9. **证据**：报告实际通过/失败/跳过，不把 README 当本机验证，不宣称至少一次系统绝对只执行一次。
10. **切换**：备份、旧写入冻结、最终增量校验、旧在途事项处置、单监听、单写入和回退演练全部完成；未获明确授权不碰生产入口。

## 九、回退与止损

实验与生产飞书凭据、vault 写入和旧任务账本隔离。出现重复执行、状态分叉、越权、密钥泄露或通知风暴，立即暂停新规则并停止新 Worker 接单，保留已确认事实对账。生产回退先暂停 autoloop 新事件与写入，再恢复旧 Syno 单监听；不得双边消费或双写。

返工前保存上一版好状态；精确路径暂存，禁止 `git add -A` 和自动 Push。返工上限 2 轮；第 3 轮仍有 P0/P1 则停止并输出无法收敛报告，P2/P3 不触发返工。

## 十、当前结论

架构方向是“Super Agent 产品层 + autoloop 内核 + 三层上下文路由 + 可替换 Worker”，不是 DSH 主 Agent 的补丁。下一步最多是经过对抗审查后进入阶段 0 的隔离实验；Release 基线、真实 inbound、上下文投影、结果关联、隔离、预算、Worker 续接、DSH 数据出口和迁移恢复均仍需本机运行证据。
