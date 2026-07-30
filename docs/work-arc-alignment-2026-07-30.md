# 人机协作工作流对齐方案（知识闭环自主推进）

> 依据文章：《AI 额度没用完就重置了？四个心得，打满又打好》（皿然 / 皿然观照，2026-07-20）
> 链接：https://mp.weixin.qq.com/s/AqWd8BqPIiKfPKBUmjUtCQ
> 本文档是**执行依据**。现状断言均已实测核对，核实基线：`codex/exec-p10a-proactive-reliability` @ 2026-07-30。
> **版本说明（2026-07-30 v2）**：经与 Owner 讨论并拍板，P0 由初稿的「Job 任务依赖编排」**重新定位为「知识闭环自主推进」**；原依赖编排下移为阶段二。

---

## 0. 一句话

文章要的不是"薅额度技巧"，而是**把人机协作工作流设计成：AI 能脱离人的即时参与而高质量自主推进，人只做高杠杆指挥**。落到 Syno（本地、单主人、知识闭环管家），这不是"软件项目并行流水线"，而是：**把已有的"收录→学习→复习→创作→维护"依赖边接线，让管家主动把「不依赖你」的准备类工作做掉，把「依赖你」的产出类工作打包成待办推给你。**

---

## 1. Owner 已拍板的三个决策（2026-07-30）

1. **P0 定位 = 知识闭环自主推进**：接线已有依赖边，管家主动推进；最小切口 = 接线已建模的 `post-ingest-candidates` 候选库。
2. **自主边界 = 准备类自动，产出类等你**：收录整理/调研/建 claim/digest 自动；复习 teach-back、创作原始输出、验收等**产出署名内容的环节等你**。
3. **微信形态 = 主动推待办 + 回标签**：管家主动推文本待办快照（🚧等你/🔎已自动/🟢进行/✅完成），你回短标签 steer；微信是主输入口，你也可直接在微信里交付原创内容（teach-back ≥20 字）。

---

## 2. 文章四心得 → Syno 的映射

| 心得 | 文章机制 | Syno 现状 | 判定 |
|---|---|---|---|
| 一、点子储备+编织 | inbox→自动调研→需求雏形→fabric 依赖 | 收录双轨成熟；但无"点子→调研→需求雏形→依赖编织"深化管线 | 🟡 半成品 |
| 二、多项目并行+外置上下文 | 每项目一帖、跨帖引用、备份检索、多 Agent | **压缩/精华外置/handoff 是强项**；但 threadKey 生产侧固定 `main`，无项目空间、单 Agent | 🟡 外置强/组织缺 |
| 三、工作弧线+自主并行+节拍器+卡片 | 依赖图、任务三分、调速、置顶卡片 | **自主推进+决策分级+事后核验+定时唤醒都有**；但无依赖图/优先级队列/fan-out，Channel 只有纯文本 | 🔴 缺口最大 |
| 四、增强人脑指挥 | 外置记忆、eval/survey、事后核验、反问 | **外置记忆+事后核验接近理想态**；但无 survey/eval 调研工具、无语义检索 | 🟡 事后强/事前缺 |

**关键认知**：文章的"工作弧线"是软件项目的并行流水线（烧额度高吞吐）；Syno 的真实工作域是**知识闭环**（收录→整理→学习→复习→创作→维护），当前痛点**不是"不够并行"，而是"提醒了没人干活 + 依赖边没接线"**。

---

## 3. 已核实的关键事实（情况属实）

- **`post-ingest-candidates.mjs:6-100`**：`record()` 为每个 committed 的 ingest workflow 落一份 JSON（`runtime.mjs:644` onCommitted 调用），含 `learningCandidate`/`reviewOpportunity`(dueAt=+24h)/`outputOpportunity`/`evidenceCandidates`。**但只有 record/list、无状态推进、无消费方**——候选 status 恒为 `"candidate"`，死库存。**这是最小切口的落点。**
- **`capture-chunk-scheduler.mjs`**：进程内**纯内存**优先级队列，无持久化、无依赖图、调度一次性 run 函数——**不能直接当工作弧线调度器**（修正初稿"泛化它"的说法；持久化调度器留阶段二）。
- **`job-store.mjs`**：Job 持久化+状态机，但无 `depends_on/priority/arcId`（全词无匹配），创建即执行无队列。
- **`conversation-router.mjs:7/21/37`**：routeKey/resolve/rotate 是**通用 threadKey**，测试已用 `project-hermes`/`project-a` 跑通——项目空间地基在，缺生产侧接入（阶段二）。
- **`feishu-channel.mjs:209/216`**：只发纯 markdown，无交互卡片。
- 单 Agent 硬约束：`opencode-cognitive-runtime.mjs:429`、`cognitive-runtime.mjs:15` 均 `agentCount:1`。

---

## 4. 不重复造的强项（方案中保持不动）

1. **可恢复可审计的收录流水线**（11 阶段状态机+幂等+分块并行+冲突自动暂停+diffHash 防伪）。
2. **端到端可靠交付+事后核验**（ChannelDeliveryOutbox 六类响应+EffectReceipt 两段式回执+拒自证对账+Owner 移动端裁决）——心得四"事后核验"理想态，已落地。
3. **上下文压缩与跨会话延续**（四层压缩+幻觉护栏+handoff 载体+archive 外置）。
4. **决策三层分级（trust-but-clarify）**：自动/审计/阻塞澄清，与心得三"🟢/🔎/🚧"结构同构。`approval 恒 none` 是长期方向，方案**绝不往回加审批闸门**。

---

## 5. 关键认知：作者模式 ≠ Syno 模式

| 维度 | 作者 | Syno | 对方案的影响 |
|---|---|---|---|
| 协作载体 | Discord 帖+置顶可编辑卡片 | 微信/飞书纯文本+Web 面板 | 卡片体验落 Web 面板；微信=文本快照+回标签，飞书可做真卡片（辅） |
| 节奏源 | 订阅额度（5h/7d 重置） | 本地 OpenCode，无订阅桶 | 调速按 context window+本地资源（阶段二），非额度桶 |
| 并行方式 | 多 Agent（Claude/Codex/Pi） | 单 OpenCode（agentCount:1） | 并行靠 fan-out 子任务+多 session，非多厂商 Agent |

---

## 6. P0 = 知识闭环自主推进（当前实施）

### 阶段一（MVP）：第一条弧线「收录 → +24h 复习提醒 → 微信 teach-back → 判分入复习曲线」

**一条具象的工作弧线**：
```
你微信收录一篇文章
  └─ 收录（已有，11 阶段状态机）committed
       ├─【自动·准备类】整理 + 建 claim + 证据复核     ← 管家做，不烦你
       ├─【等你·产出类】+24h："用自己的话讲讲《XX》的要点"
       │     └─ 微信推你 → 你直接回一段话（teach-back ≥20字）
       │           → 管家判分、记入复习曲线 [1,3,7,14,30,60]（已有）
       └─【等你·产出类】掌握后："这篇能写成输出了，推进吗？"（阶段二）
```

**数据流**（已逐接线点验证）：
1. 收录 committed → onCommitted（runtime.mjs:644）→ `record()` → reviewOpportunity{dueAt:+24h, status:candidate}（现状不变）。
2. proactive tick 60s → signalSources.collect → ReviewReminderSource.due → 到点候选 → 信号 `review-due:<workflowId>`（priority 85）。
3. SignalEngine 预算/安静时段 → bundle → ChannelDeliveryOutbox → 微信待办。送达 → `#applyBundleDelivered` → onSignalsDelivered → markReviewPresented。
4. 主人回话 → teach-back 门（runtime.run 正前方，presented 且 72h 内命中）→ appendSystemEvent 软引导 → runtime.run 进模型。
5. 模型判 teach-back → `learning.submit`（isReview=true）→ `learning.record` → 判分入曲线 → 回复判分+下次复习日期。
6. Job committed → 完成钩子 → 候选 done + learningCandidate "learning"。
7. 后续复习由 LearningState.nextReviewAt 驱动（候选管首教前，LearningState 管首教后）。
8. 「跳过复习」→ skip_review → dismissed。

**文件改动（1 新建 / 7 修改）**：
- 改 `post-ingest-candidates.mjs`：候选状态机（candidate→presented→done|dismissed），加 #mutateRecord/markReviewPresented/completeReviewByKnowledgeRef/dismissReview/dueReviews/findActiveReviews，向后兼容旧 JSON。
- 新建 `review-reminder-source.mjs`：查询/策略层（due/acknowledgeDelivered/active/dismissLatest），与 knowledge-maintenance-source 同构。
- 改 `signal-source-registry.mjs`：第五类 review-due 信号（priority 85，ref 只含稳定字段保证只推一次）。
- 改 `proactive-orchestrator.mjs`（约 6 行）：加 onSignalsDelivered 送达回调（#applyBundleDelivered return true 前 fire-and-forget）。
- 改 `channel-intent-router.mjs`：加 skip_review 短标签。
- 改 `channel-conversation-handler.mjs`：teach-back 门（runtime.run 前 appendSystemEvent 软引导）+ skip_review 确定性分支 + buildTeachBackPriming 纯函数；reviewReminders=null 时现状逐字节一致。
- 改 `runtime.mjs`：装配 reviewReminders（构造/registry/orchestrator/handler/onCommitted 完成钩子/返回对象）。
- 改 `today-service.mjs`：SIGNAL_KIND_TO_ACTION 加 "review-due":"review"。

**三个设计难点解法**：
- (a) teach-back 识别 = 确定性门 + 模型判分（不做确定性语义判定）：确定性协议先行、确定性出口（跳过复习）、软引导而非改写、门条件收敛（presented+72h+最多3条）。防误判。
- (b) +24h 触发 = 挂信号源体系（复用安静时段/预算/去重/Outbox 幂等/#markInactive），不建独立扫描器。
- (c) 状态机 = candidate→presented→done|dismissed，不复用 LearningState（候选=推进投影，LearningState=掌握度事实，knowledgeRef 链接；候选不存 mastery/interval/rubric）。

**微信待办快照**：
```
Syno · 主动提醒
1. 复习「Context Engineering」：用自己的话讲讲它（≥20字直接回复即可）；不想现在复习回「跳过复习」
另有 1 项待处理。
```

### 阶段二（后续，不在本次实施）
- **依赖模型**：job-store 加 depends_on/priority/arcId；capture-chunk-scheduler 泛化为**持久化**通用调度器。
- **更多弧线**（复用"source+状态机+送达回调"三件套）：创作弧（outputOpportunity→自动创建→推送→主人 progress 交付→done）、证据弧（evidenceCandidates→自动建 claim 候选→主人验收）、复习后段弧（LearningService.due 接信号源，与候选首段在 done 点衔接）。
- **项目空间**：启用 projectRef，threadKey 支持 project:<id>（router 底层已支持）。
- **待办卡片聚合 + Web 看板 + steer 扩展**；**节奏器**按 context window+本地资源调速。
- **事前调研**（eval/survey 工具 + 点子深化管线），补"事前"一头与已有"事后核验"闭环。

---

## 7. 约束与红线（不可违反）

- `policy.allowSelfModify`（默认关）管自治 Syno agent 的 code_change；Owner 驱动的 Claude Code 开发是独立信任边界。
- 不破坏 §4 强项；**不新增审批/确认闸门**（approval 恒 none 是长期方向）。
- 一切写入仍走 Job+隔离 worktree+契约校验；副作用走两段式回执（可审计基因不丢）。
- 不动 `vault/`；不提交 `.runtime/`；commit 不带 `Co-Authored-By`；不 push（除非另行授权）。
- 不发明新微信协议（阶段一只加 skip_review 一个短标签进现有 intent router）。
- 凡文档涉及"运行态/计数"，用带时间戳快照，落盘前实测核对。

---

## 8. 详细实施 plan

见 `~/.claude/plans/clever-spinning-firefly.md`（2026-07-30 已批准）：阶段一 8 个文件改动的精确数据模型/函数签名/测试点/实施顺序/端到端验证。
