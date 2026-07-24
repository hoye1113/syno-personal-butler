# Syno 上下文管理长期路线图（执行计划）

> 版本：v1（已落地）之后的**前瞻执行计划**。与 [`CONTEXT-MANAGEMENT-PLAN.md`](./CONTEXT-MANAGEMENT-PLAN.md)（v1 的设计文档，分层压缩 + rotate + Phase 4 提取，已实现）是「v2+」关系：本文不重复 v1，只定义「长期主义」下要做、要补、要正名的事。

---

## 0. 文档定位与阅读对象

- **这是什么**：一份可执行的长期路线图。每个工作项给出 *问题 → 现状（带文件引用）→ 目标 → 步骤 → 验收 → 依赖 → 风险 → 工作量*。
- **谁读**：未来接手上下文管理的自己 / 协作者；评审人据此排期与切块。
- **不是什么**：不是即时代码实现清单。除标注「可立即落地」的 Tier 1 外，多数项需要独立设计确认后再开工。
- **与约束的关系**：本路线图完全遵循 v1 既定安全约束（见 [§9](#9-安全约束与既定不变性)），任何项都不得突破。

---

## 1. 锚点：为什么是这套优先级（长期主义的判断）

对「知识管家」而言，**上下文压缩不是成本控制功能，而是「系统替用户决定记住什么 / 忘掉什么」的记忆边界**。Layer3 摘要、handoff、Phase 4 提取——这些 LLM 产出会被**持久化、跨轮转传播、当成事实复用**。这决定了长期主义的两根锚：

1. **系统必须能被证明在变好**（需要可观测性 + eval，否则所有阈值 / 策略调优都是盲调）。
2. **系统绝不能悄悄腐蚀用户的记忆**（摘要幻觉 / 跨轮转漂移 / 注入沉淀 = 比不压缩更糟）。

因此排序逻辑是：**复利型债务（越晚越贵）> 产品立身（记忆保真）> 战略演进 > 运维完备**。

---

## 2. 全景一览

| 编号 | 工作项 | Tier | 类型 | 工作量 | 依赖 |
|---|---|---|---|---|---|
| 3.1 OBS | 压缩可观测性 + 阈值可调 | T1 复利债务 | 基建 | M | — |
| 3.2 STORE | conversation.json 膨胀治理 | T1 复利债务 | 存储 | M | — |
| 3.3 HANDOFF | handoff 语义正名 | T1 复利债务 | 表示 | S–M | — |
| 4.1 FIDELITY | 持久化 LLM 产出完整性治理 | T2 产品立身 | 保真 | L | OBS |
| 4.2 DRIFT | 跨轮转上下文漂移测量 | T2 产品立身 | 保真 | M | HANDOFF |
| 5.1 DISTILL | 压缩即知识蒸馏边界 | T3 战略演进 | 演进 | L | FIDELITY、COST |
| 5.2 COST | 成本核算 per feature | T3 战略演进 | 演进 | M | OBS |
| 5.3 UNIFY | Native / Hermes 收敛契约 | T3 战略演进 | 演进 | L | HANDOFF |
| 6.1 RECOVER | 恢复工具 | T4 运维完备 | 运维 | M | STORE |
| 6.2 CONCUR | 并发模型正名 | T4 运维完备 | 运维 | M | — |

**推荐 MVP（第一里程碑 M1）**：OBS（3.1）+ STORE（3.2）+ HANDOFF（3.3）。三者都动「消息 / 存储」表示，合批改一次最省；且分别带来 *可观测、有界存储、干净语义* 三重基础收益，风险最低、复利价值最高。详见 [§7](#7-推荐执行序与里程碑)。

---

## 3. Tier 1 — 复利型技术债（越晚做越贵，最该先做）

### 3.1 OBS — 压缩可观测性 + 阈值可调

**问题与动机**
v1 的阈值（light 0.60 / moderate 0.75 / heavy 0.85 / overflow 0.95）是按直觉拍的魔法数，全系统对「哪层多常触发、压缩前后 token 比趋势、rotate 频率、handoff 后新对话是否立刻又超限、anti-thrash 命中、Provider 兜底命中」**零感知**。没有数据，未来换模型（1M→200k/10M）、调阈值都是猜。这是后续一切决策的地基，低成本、复利回报最高。

**现状**
- `context-manager.mjs`：`Archiver.applyCompaction`（:131-160）每次压缩写 `compactionLog`（:153，记录 `action/beforeTokens/afterTokens/ratio`）。
- `TokenTracker.trackUsage`（:31）存了每对话最近一次真实 `prompt_tokens`，但**从未用于校准**（v1 review 标记为 FYI）。
- `anti-thrash`（:193-199、:397）的 `failures/cooldown` 状态**纯内存**，进程重启即丢。
- `#fireExtraction`（:415）即发即忘，提取是否成功、被拒多少**不可见**。
- 无聚合、无端点、无时序。

**目标 / Definition of Done**
- 压缩相关事件有结构化遥测：动作分布（none/layer1/2/3/rotate）、rotate 次数、提取 propose 次数、before→after token delta、anti-thrash 冷却触发、handoff→新对话首次压缩间隔。
- 阈值可经配置（settings）调整，无需改代码。
- 暴露只读查询端点。

**执行步骤**
1. 在 `context-manager.mjs` 新增 `#stats` 累加器（内存环形缓冲 + 定期 flush 到 `PATHS.stateRoot/context-stats.json`），在 `compress()` 返回点（:304）、rotate 块（:250）、`#fireExtraction`（:415）、`#trackThrash`（:397）埋点上报。
2. 阈值外部化：把 `DEFAULT_THRESHOLDS`（:9）与 `tailMessages/antiThrashThreshold/cooldownMs/singleToolLimit/handoffTokenCap` 接到 `settings-registry.mjs`（已有），通过 `options` 注入（沿用 v1 O8 冻结 runConfig 路径：每 run 冻结，不得绕过 `bindRun`）。
3. 在 `runtime.mjs` 路由表（:342+）加 `GET /api/syno/context/stats`，镜像 `/api/syno/health`（:343）的返回模式，返回聚合 JSON。
4. 可选：在 `reports.mjs` 加一行人类可读摘要，便于排障。

**验收标准**
- 单测：构造多次 `compress`（覆盖 none/layer1/2/3/rotate）后，`stats` 各字段计数正确；anti-thrash 冷却被记录。
- 阈值从 settings 注入的测试：改 settings 后阈值生效，且仍受 frozen runConfig 约束。
- 端点测试：`GET /api/syno/context/stats` 返回非空 JSON，且不泄露 provider token。

**依赖 / 阻塞**：无。是 COST（5.2）的基建。

**风险与缓解**：stats 文件自身膨胀 → 环形缓冲 + 固定上限；端点只读、不含敏感字段。

**工作量**：M。

---

### 3.2 STORE — conversation.json 膨胀治理

**问题与动机**
每个对话是一个 JSON 文件（`conversation-store.mjs:33`），内含 `messages + archive + summaries + compactionLog + handoffContext` 全部内联。`prune()`（:100）只裁 `archive`（30 天）并按状态删旧对话，**从不裁 `compactionLog` / `summaries`**——它们对活跃对话**永不收敛**。conversation-835badd2 已是 12MB；一个高频压缩的长对话数月后 `compactionLog` 单独就能撑大文件，拖慢每次 `get()`/`save()`。数据越多迁移越痛，**现在改成本最低**。

**现状**
- `conversation-store.mjs`：`RETENTION`（:8）只有 `archivedDays` 等，无 log/summary 上限。
- `prune()`（:100-140）处理 archive 与对话删除，未触及 `compactionLog`/`summaries`。
- `archive`（:115）内联主文件 → `get()`（:50）每次读全量（含历史归档），热文件被冷数据拖大。

**目标 / DoD**
- `compactionLog` / `summaries` 有滚动上限，长对话的元数据有界。
- `archive` 外置为独立文件，热对话文件只留索引；`get()` 默认不加载 archive。

**执行步骤**
1. `RETENTION`（:8）新增 `compactionLogMax`（建议 200）、`summariesMax`（建议 50）。
2. 在 `prune()`（或新增 `#compactMetadata()`）裁 `compactionLog` 到最近 N 条、`summaries` 到最近 N 条；保留最早一条 summary 作锚（可选）。
3. `archive` 外置：`save()` 时若 `archive.length > 阈值`，溢写到 `<id>.archive.json`（懒加载），主文件只留 `{ archiveCount, archiveFile }` 索引；新增 `getArchive(id)` 按需读取。
4. `get()`（:50）默认**不**读 archive 文件；RECOVER（6.1）按需读。
5. 保持 `#normalize()`（:55）向后兼容（无索引字段时回退内联 archive）。

**验收标准**
- 测试：构造 `compactionLog` 超 cap 的对话 → prune 后裁到 cap；`summaries` 同理。
- 测试：archive 外置后，`get()` 返回对象不含内联 archive（或仅索引），`getArchive(id)` 按需加载且内容完整。
- 既有 `conversation-store` 测试全绿（向后兼容回退路径）。

**依赖 / 阻塞**：无；RECOVER（6.1）依赖本项的外置 archive。

**风险与缓解**：外置文件与主文件一致性 → 复用既有 `atomicJson`（:11）原子写；索引缺失时回退内联，避免破坏存量数据。

**工作量**：M（archive 外置是较大的一半）。

---

### 3.3 HANDOFF — handoff 语义正名

**问题与动机**
`rotateConversation`（`tool-loop-executor.mjs:17`）把前情提要 push 成 `{role:"user", content: handoff}`。后果会**复利**：
1. 模型可能把它当**请求**回应，而非背景上下文；
2. `extractValuable`（`context-manager.mjs:227`）过滤 `role==="user"` → handoff 正文（"## 用户近期意图… 决定…"）命中提取正则 → **把自己的前情再提取一遍入知识库（自污染）**；
3. 未来任何「读消息」的功能（搜索、展示、RAG）都得特判这条伪 user。

消息表示是底层契约，错了所有上层都得打补丁。

**现状**
- `tool-loop-executor.mjs:15-19`：handoff 同时写 `fresh.handoffContext` 与 push 为 `role:"user"`。
- `context-manager.mjs:224-235`：`extractValuable` 只收 `role==="user"`，正则含 `决定|结论|记住|待办|…` → handoff 正文极易命中。

**目标 / DoD**
- handoff 以**语义正确的载体**注入（非伪 user），且明确不被提取、不被当真实用户轮次计入 tail/prune。
- 既有 rotate 流程与移交质量不变。

**执行步骤**
1. `rotateConversation`（`tool-loop-executor.mjs:17`）改为注入 `{role:"system", content: handoff, _syno:{kind:"handoff", generatedAt}}`（保留 `fresh.handoffContext` 字段）。Layer3 已有「system 摘要消息」先例（`context-manager.mjs:353`），表示层支持无障碍。
2. `extractValuable`（:224）：显式跳过 `_syno?.kind==="handoff"`（双保险，即便 role 被误改也不提取）。
3. `HandoffGen`（:97）与 tail/prune 逻辑：handoff 消息不计入 `tailMessages` 的「真实用户轮次」（避免漂移测量被污染，见 4.2）。
4. 更新 `tests/context-manager.test.mjs` 与 rotate 相关断言。

**验收标准**
- 测试：轮转后新对话的首条 handoff 为 `role:"system"` 且带 `_syno.kind==="handoff"`；`extractValuable` 对其返回 0 条。
- 既有 rotate / 移交 / tail 测试全绿。

**依赖 / 阻塞**：无；DRIFT（4.2）、UNIFY（5.3）共享 handoff 格式，先正名后受益。

**风险与缓解**：个别 provider 对中段 `system` 消息处理差异 → 已有 Layer3 system 摘要先例可参照；如必要回退为 `role:"user"` + `_syno.kind` 标记（提取跳过仍生效），但首选 system。

**工作量**：S–M。

---

## 4. Tier 2 — 产品立身之本（记忆保真与完整性）

### 4.1 FIDELITY — 持久化 LLM 产出完整性治理

**问题与动机**
这是知识管家**最生死攸关**的一条。Layer3 摘要（`context-manager.mjs:357`）、LLM judge（:441）、handoff 都是 LLM 产出，会被当事实复用。两类长期风险：
- **幻觉摘要成为「真相」**：摘要若编造，比丢消息更危险——用户基于错误记忆决策。
- **注入跨轮转沉淀**：对话里的不可信内容（URL / 工具结果）若被压进摘要 / handoff，恶意指令会**持久化并跨轮转传播**。Phase 4 提取走了 `<untrusted>` 包裹，但摘要 / handoff 注入新对话时**没有不可信标记**。

**现状**
- `#summarize`（:357）：try/catch → `#ruleBasedSummary`（:386）降级；**无忠实度校验**，无低置信逃生阀（返回乱码也会物化）。
- `#judgeValuable`（:441）：解析失败返回 `[]`（安全）。
- 持久化的 summary（:353）/ handoff 注入新对话时无 `factualStatus` 标记。

**目标 / DoD**
- 摘要有**忠实度护栏**：低置信时**保留原始 tail 不压**（宁可不压，不可压错）。
- 持久化 LLM 上下文（summary / handoff）统一打 `factual_status:"unverified"` 语义，与 ingest 的 `<untrusted>` 对齐。
- 有可周期运行的**忠实度 eval 集**，量化摘要质量回归。

**执行步骤**
1. **摘要护栏**：`#summarize`（:357）产出后加一次廉价校验（如：源 tail 与摘要的实体 / 数字一致性检查，或一次 LLM 自检 pass）；低置信 → 不物化 summary，保留原始 tail（`compress` 对该次返回 `action` 降级，不写 summary）。
2. **完整性标记**：物化 summary（:353）与 handoff（3.3）加 `_syno:{factualStatus:"unverified", generatedAt}`；下游（DISTILL 提取、未来 RAG）据此降权 / 包裹。
3. **Eval 集**：新增 `tests/eval/summary-faithfulness.eval.mjs`，黄金对话 → 期望要点；先 on-demand 跑（暂不进 CI gate），用 OBS（3.1）追踪长期趋势。

**验收标准**
- 测试：注入返回**矛盾摘要**的 mock provider → 断言 Layer3 **保留原始 tail 不物化**（逃生阀生效）。
- 测试：物化的 summary / handoff 带 `factualStatus:"unverified"`。
- Eval 产出一个可比较的忠实度分数。

**依赖 / 阻塞**：依赖 OBS（3.1）长期观测摘要是否可信。

**风险与缓解**：护栏过严 → 长期不压缩（可接受，保真优先于压缩率）；护栏 LLM 成本 → 纳入 COST（5.2）核算。

**工作量**：L（护栏 + eval 偏研究性）。

---

### 4.2 DRIFT — 跨轮转上下文漂移测量

**问题与动机**
长对话会多次 rotate。每次 handoff 从「含上次 handoff 的对话」再生成 → handoff-of-handoff-of-handoff。信息逐级流失是否可控？现在**完全未知**。若漂移不可控，长期对话会静默丢失地基，而用户察觉不到。

**现状**
- `HandoffGen.generateHandoff`（`context-manager.mjs:103`）每次从全量 messages（含历史 handoff user 消息）规则提取 → 复利压缩。

**目标 / DoD**
- 有可运行的 N 轮漂移 eval，给出「锚定事实存活率 vs 轮转次数」曲线。
- 设一道质量门（如 depth 2 时存活率 ≥ 80%）；不达标则触发 handoff 策略改造。

**执行步骤**
1. 新增 `tests/eval/handoff-drift.eval.mjs`：种子对话注入若干「锚定事实」（决策 / id / 待办），模拟 N 次 rotate，检测第 N 次 handoff 中各锚定事实的存活。
2. 跑出基线漂移曲线。
3. 若漂移高：改 handoff 策略为**从 archive 稳定摘要继承**（携带一份稳定 summary 前传），而非 handoff-of-handoff 复利（依赖 3.2 的 archive 与 3.3 的 handoff 正名）。

**验收标准**
- Eval 产出漂移曲线 + 存活率；设阈值门。
- 如改策略：测试新策略在 depth N 的存活率优于旧策略。

**依赖 / 阻塞**：依赖 HANDOFF（3.3）正名后的干净 handoff 语义；与 FIDELITY（4.1）同源（持久化 LLM 产出保真）。

**风险与缓解**：漂移可能本就高 → 这正是要测的目的；测量结果直接驱动是否做策略改造。

**工作量**：M（eval + 可能的 handoff 策略改造）。

---

## 5. Tier 3 — 战略演进方向

### 5.1 DISTILL — 压缩即知识蒸馏边界（Phase 4 的长期形态）

**问题与动机**
Phase 4 提取是「关键词正则预筛 → 二元 keep/reject」。长期看，压缩 / 轮转应是**主要的知识入口**——用户在对话里学到、决定的，最自然的捕获时机就是内容离开活跃上下文那一刻。现在提取偏置「决定 / 结论 / 记住 / 待办」这类显式措辞，漏掉所有隐式学习。这是知识管家区别于通用聊天的地方。

**现状**
- `extractValuable`（:224）正则预筛（中文决策词）。
- `#judgeValuable`（:441）二元 keep/reject。
- runtime `onExtractValuable` → `ingest.receive + propose`（审批门控，不写 vault）。

**目标 / DoD**
- 提取从二元判定升级为**结构化分类 + 图谱链接 + 真·去重**，且**始终走审批门**（receive + propose，永不直接写 vault）。
- Eval 证明召回率优于正则基线。

**执行步骤**
1. 用 LLM 提取替代正则预筛，返回结构化 `{type∈decision/fact/preference/todo/resource, content, confidence, links}`。
2. 去重升级：propose 前查 `knowledge-store` 做语义重叠检测（不只 in-conversation hash + ingest title 搜索）。
3. 链接：提取项关联现有图谱 / `goal-service` 目标。
4. 保持审批门不变；提取内容仍 `<untrusted>` 包裹。

**验收标准**
- Eval：召回率 vs 正则基线提升；去重测试（与已有知识重叠时不重复 propose）；端到端仍审批门控、不写 vault。

**依赖 / 阻塞**：FIDELITY（提取是 LLM 产出 → 必须 unverified / 门控）、COST（5.2，更多 LLM 调用）。

**风险与缓解**：LLM 提取成本 / 噪声 → COST 核算 + confidence 阈值；安全门（审批）始终兜底。

**工作量**：L。

---

### 5.2 COST — 成本核算 per feature

**问题与动机**
Phase 4 的 LLM judge、Layer3 摘要、Mid-turn 估算都加 token 成本。v1 选了 LLM judge，但**没有测量证明它比规则值**。长期需要 per-feature 成本 / 收益账，才能做「保留 / 降级 / 砍掉」的明智决策，而不是凭直觉。

**现状**
- `provider.complete` 在 `#summarize`（:357）、`#judgeValuable`（:441）、cognitive-runtime 等多处调用，**无 feature 归因**。
- `trackUsage`（:31）存 `prompt_tokens` 但不按 feature 分账。

**目标 / DoD**
- 每个 feature（summary / judge / handoff-check / cognitive-run…）的 token 开销可归因、可聚合、可查。
- 暴露在 OBS stats 端点。

**执行步骤**
1. `provider.complete(..., { _feature })` 加归因标签；新增成本账本按 feature / 日聚合。
2. 接入 OBS（3.1）stats 端点。
3. 用账本驱动 keep/kill 决策（如：LLM-judge 的边际成本 vs 收益）。

**验收标准**
- 测试：各 feature 调用的 token 正确归因；端点暴露分账数据。

**依赖 / 阻塞**：依赖 OBS（3.1）共用 stats 基建。

**风险与缓解**：归因标签侵入调用点 → 集中在一个薄封装层。

**工作量**：M。

---

### 5.3 UNIFY — Native / Hermes 收敛契约

**问题与动机**
只覆盖 Native。Hermes（`hermes-cognitive-runtime.mjs`，经 `hermes-sidecar-bridge.mjs` 委托给外部 sidecar 进程）**在 Node 进程内无任何压缩 / 上下文逻辑**（grep 确认无 compress/context/token/summary/handoff 引用）。两套上下文系统会各自漂移——用户切 runtime 行为不一致，维护两套演进。

**目标 / DoD**
- 明确两 runtime 的上下文边界，并二选一：收敛到一套策略，或正式定义「上下文契约」+ 一致性测试。
- 决策有文档记录、有取舍说明。

**执行步骤**
1. 文档化当前边界（Native 用 ContextManager；Hermes 在 sidecar 内自理）。
2. 定义 **Context Contract**：两端须共同遵守的可观测语义——archive 形状、handoff 格式、rotate 信号、提取→ingest 交接、retiredIds。
3. 决策：Hermes 采纳 ContextManager（统一），或仅立契约 + 一致性测试。
4. 若收敛：把 Hermes 路由进同一 `ToolLoopExecutor` rotate 路径。

**验收标准**
- 契约文档 +（契约路径下）两端通过的一致性测试集。

**依赖 / 阻塞**：无硬依赖；受益于 HANDOFF（3.3）的共享 handoff 格式。

**风险与缓解**：收敛改动面大 → 可先立契约、后渐进收敛；保留 sidecar 作为 Hermes 内部实现细节。

**工作量**：L（研究 / 决策为主）。

---

## 6. Tier 4 — 运维完备（让原则成真）

### 6.1 RECOVER — 恢复工具

**问题与动机**
v1 原则「压缩可恢复」（CONTEXT-MANAGEMENT-PLAN §7.9）只在**存储层**被遵守（archive / compactionLog 存在），但**没有任何恢复路径**——没有「从 archive 还原一次压缩」、没有给用户看 compactionLog 的入口。原则停留在存储，没到运维。

**现状**
- archive（内联或经 STORE 外置）、`compactionLog`（:153）存在但不可操作。

**目标 / DoD**
- 可查看压缩历史；可对单次压缩做「撤销」式还原。

**执行步骤**
1. `GET /api/syno/conversations/:id/compaction-log`——查看压缩历史。
2. `POST /api/syno/conversations/:id/restore-compaction`——按 compactionLog 条目从 archive 还原消息（撤销单次压缩，标记条目为 restored）。
3. 最小 UI（或 CLI）浏览 archive 并还原。

**验收标准**
- 测试：一次压缩可被撤销（archived 消息重新注入，compactionLog 条目标记 restored）；还原不破坏活跃上下文一致性。

**依赖 / 阻塞**：依赖 STORE（3.2）外置 archive。

**风险与缓解**：还原后超限 → 还原前校验 token，超限则拒绝并提示。

**工作量**：M。

---

### 6.2 CONCUR — 并发模型正名

**问题与动机**
`retiredIds`（`conversation-router.mjs:25/44/54`）+ `ConversationStore.runExclusive`（文件锁 per id，`conversation-store.mjs:38`）+ router 的 `#serialized`（:60）是**补丁**，不是契约。WeChat `onMessage` 可能未按 owner 序列化 → v1 review 标记的「良性双轮转」。长期看「良性竞态」会逐年累积成难复现 bug。

**目标 / DoD**
- 定义并实现 per-owner（或 per-routeKey）消息处理契约：进入 runtime.execute 前按 routeKey 序列化。
- retiredIds 降级为 defense-in-depth（安全网），而非主机制。

**执行步骤**
1. 在 handler 接缝（web + weixin + feishu）加 per-routeKey 队列，序列化 intake。
2. 保留 retiredIds 作兜底，文档化其定位。
3. 检查 WeChat `onMessage`（`weixin-message-handler.mjs`）是否已序列化；未序列化则补。

**验收标准**
- 测试：同一 owner 两条并发消息**不能**触发双轮转；并发测试通过。

**依赖 / 阻塞**：无。

**风险与缓解**：序列化给话痨用户加延迟 → 文档化取舍，可按 owner 配置开关。

**工作量**：M。

---

## 7. 推荐执行序与里程碑

每个里程碑结束的门禁：`node --test apps/syno/tests/*.test.mjs tests/*.test.mjs` 全绿 + `node scripts/verify-repository.mjs` 通过 + 本地**不 push** + 相关文档同步。

### M1 — 基础债务（建议先做，合批最省）
- **OBS（3.1）+ STORE（3.2）+ HANDOFF（3.3）**。
- 理由：三者都动「消息 / 存储」表示，合批改一次最省；带来 *可观测、有界存储、干净语义* 三重基础收益，风险最低、复利价值最高。
- 出口：压缩可见、长对话文件有界、handoff 不再自污染。

### M2 — 记忆保真
- **FIDELITY（4.1）护栏 + DRIFT（4.2）eval**；**COST（5.2）** 随 OBS 落地。
- 理由：保护产品立身之本（记忆完整性），防止幻觉 / 漂移 / 注入沉淀这些「比不压更糟」的失败。

### M3 — 战略演进
- **DISTILL（5.1）深化 + UNIFY（5.3）契约**。
- 理由：把压缩升级为知识蒸馏主入口；统一 Native / Hermes 行为，避免两套系统长期分叉。

### M4 — 运维完备
- **RECOVER（6.1）+ CONCUR（6.2）**。
- 理由：让「可恢复」原则成真；把并发竞态从「可接受」变「不可能」。

> **若资源受限只做三件**：OBS（3.1）→ FIDELITY（4.1）→ STORE（3.2）。即「看清健康 → 防记忆腐蚀 → 治理膨胀」。HANDOFF（3.3）建议随 STORE 同批（都改消息 / 存储结构）。

---

## 8. 待决开放问题

1. **OBS 阈值外部化**与 frozen runConfig（O8）的接缝：阈值在 bindRun 前注入还是运行中读取？需确认不破坏「每 run 冻结」语义（初步：构造期注入 + 每 run 冻结快照）。
2. **摘要护栏**的校验器选型：规则一致性检查 vs LLM 自检——成本 / 准确率权衡，待 COST 数据辅助决策。
3. **DRIFT 策略改造**是否必要：取决于 eval 基线，可能无需改 handoff 策略（先测后定）。
4. **UNIFY 走收敛还是契约**：影响 M3 工作量量级，需一次专项设计确认。
5. **archive 外置**的存量迁移：现有内联 archive 对话如何平滑过渡到外置（依赖 `#normalize` 回退路径）。

---

## 9. 安全约束与既定不变性

本路线图所有工作项**严格遵循** v1 既定约束，任何实现不得突破：

- **原 Obsidian vault 永久只读**，无双向同步；知识写入必须创建**可审批 Job**（DISTILL 必须保持 receive + propose 审批门，永不直接写 vault）。
- **不 push 到远端**；当前分支 `codex/round3-remediation`。
- **不绕过 Policy**，不 reset，不预创建 LearningState。
- **Provider token 不泄露**（OBS / COST 端点与账本只暴露聚合指标，不含凭证）。
- **不可信内容隔离**：摘要 / handoff / 提取内容按 unverified / `<untrusted>` 对待（FIDELITY）。
- **Frozen runConfig（O8）**：任何配置外部化（OBS 阈值）必须经 `ProviderClient.bindRun` 冻结路径，不得运行中热改绕过。

---

## 10. 与现有文档的关系

- [`CONTEXT-MANAGEMENT-PLAN.md`](./CONTEXT-MANAGEMENT-PLAN.md)：v1 设计（已实现）。**已知偏差**（v1 review 标记）：§6.1 / Phase 4（O11）描述 `extractValuable` 为「纯规则」+ `kind:"markdown"`，而实现是 **LLM 判断 + `kind:"text"`**；§6.4 代码示例为过时的双重消息跟踪；§6.6 称 `rotateConversation` 在 `runtime.mjs`，实际在 `tool-loop-executor.mjs`。**M1 顺带订正这些偏差**。
- 本文（ROADMAP）：v2+ 前瞻，覆盖 v1 未触及的长期维度。
- `NEXT_SESSION.md`：每次里程碑结束后更新进度指针。
