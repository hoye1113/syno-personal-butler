---
title: "Databricks：企业级 Agent 生产实践"
tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering", "ai_evaluation", "multi_agent"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering", "ai_evaluation", "multi_agent"]
created: "2026-07-02"
source: "B站视频 - Easonlee的AI笔记"
description: "Sandy 用两年客户现场经验提出五支柱 playbook：先 eval 再 trace 再数据，第七周才选模型；零售银行 chatbot 案例说明 demo 漂亮、上线翻车的典型死法。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Databricks-企业级Agent生产实践.md"
source_sha256: "93e77811258ca42b439fc0acbf989aab74ae742e3ac216602cd4923fd920d565"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1o4TL6sExw/"
source_original_date: 2026-06-18
host_name: "编者问"
guest_name: "Sandy"
guest_title: "Databricks 数据 AI 技术负责人（前 AWS 首席数据 AI 架构师）"
material_tier: B
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1o4TL6sExw/ingest"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Editorially reconstructed dialogue (column primary)
speaker_inference: "column_article + video_description（主题演讲，编者重构过渡问）"
speaker_confidence: medium
factual_status: unverified
factual_reviewed: 2026-07-13
verification_basis:
  - column
  - description
unresolved_facts:
  - "当前 Recastory BV 目录未发现 ASR；数字、原话与 Sandy 的完整身份不能作为已核验引用。"
duration: 37:06
saved: 2026-07-03
updated: 2026-07-03
concepts:
  - id: living_golden_dataset
    zh: 活体黄金测试集
    en: living golden dataset
    one_line: 生产失败与差评持续回流进 eval set
  - id: behavioral_eval
    zh: 行为层评估
    en: behavioral evaluation
    one_line: 查 tool 重复调用、死循环等隐性成本
  - id: five_pillars
    zh: 五支柱框架
    en: five pillars framework
    one_line: eval → observability → data → orchestration → governance
---

# Databricks：企业级 Agent 生产实践

**编者问：** 以下问题用于整理主题演讲结构，并非现场主持人原话。
**Guest：** Sandy（Databricks 数据 AI 技术负责人）  
**形态：** 编辑重构对谈（**专栏 + 简介主源** · 当前缺 ASR）
**辅源：** B 站简介导读时间戳 · 无专栏主源  
**B 站：** [BV1o4TL6sExw](https://www.bilibili.com/video/BV1o4TL6sExw/)

---

## 开场

企业里 Agent demo 惊艳、上线翻车的故事，这两年听得耳朵起茧。Sandy 在 AWS 干了五年首席数据 AI 架构师，过去两年在 Databricks 陪 B2B 和受监管行业客户把 AI 从 demo 拉到生产。她要分享的不是「该用 GPT 还是 Claude」，而是一份**五支柱 playbook**——动笔写代码之前，先把成功量出来、把决策链看清楚、把问责写明白。

五章预告：**别从选模型开始** → **评估三层与行为防线** → **数据地基占六成时间** → **多智能体编排三模式** → **银行案例：第七周才选模型**。

---

## 01 模型争论不是首要痛点：三大缺口与五支柱

**编者问：** 你这两年跟客户聊，最常见的翻车模式是什么？

**Sandy：** 几乎一个模子。领导催做 AI → 团队先吵该用哪个模型 → 用干净数据做 demo → 领导签字上生产 → 几周后用户问：「AI 到底在干什么？」ROI 落空，钱白花，凌晨三点不知道找谁。

我归纳出三个洞。**可观测性缺口**——看不见 AI 每一步决策，就没法上生产；欧洲监管尤其硬，没 trace 不让 onboard。**评估缺口**——大家嘴上说 accuracy、latency、groundedness，但没写清「对业务到底量什么数字」，也没建持续测量的系统。**治理缺口**——AI 在产线失败了找谁？喂模型的数据谁负责？对客户胡说谁背锅？没有问责。

这三个洞让我搭了**五支柱**：评估、可观测性、数据基础、多智能体编排、治理。理想顺序是 eval → observability → data → orchestration → governance；现实可交错，但**五块不能缺**。动笔写代码、讨论模型和功能之前，先想：**成功长什么样？怎么持续量？**

**编者问：** 所以企业最常犯的错误，是一开始就陷进模型选型？

**Sandy：** 对。两年前市场就在聊模型，每一场对话都从「我们用 GPT 还是 Claude」开场——不怪大家，当时技术叙事就这样。但真正卡生产的，是看不见、量不清、没人负责。框架的意义，是把今天会场里听来的各种技术，对号入座进这五根柱子——你知道自己的 eval 栈、trace 栈、数据策略各放哪。

> **金句 · Sandy**
> **中文：** 碰代码、碰模型之前，先把「成功」定义成数字。
> **原文：** Before touching any code, before discussing any models — think about how you measure success.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 可观测性缺口 | observability gap | 产线里看不见 agent 每步决策 |
| 评估缺口 | evaluation gap | 没把业务成功写成可测数字 |
| 治理缺口 | governance gap | 失败时无人问责、无流程 |
| 五支柱 | five pillars | eval / trace / data / 编排 / 治理 |

**本章小结**

- Demo 翻车根因常不是模型笨，是三大洞没填
- 五支柱是写代码前的规格书，顺序可灵活、块不能少
- 别从模型辩论开场——从「成功量什么」开场

---

## 02 评估是规格书：三层架构与行为防线

**编者问：** 支柱一「评估」具体怎么落地？很多团队停在「要准确」四个字。

**Sandy：** 评估就是 AI 系统的**规格说明书**——成功必须写数字。零售银行 chatbot 一例：主目标是**分流**简单咨询，让人工坐席只接复杂单。你得跟踪 deflection rate——多少 query 被 agent 接住、多少还得转人。不是泛泛说「要准确」，而是「简单 query 分流 60%、准确率 85%」这类业务语言。

第二步是**黄金测试集**。找领域专家，收真实场景——ticket 很乱、用户绕弯子问的那种，不是实验室干净问题。建 pipeline：用户问题 → agent 答 → 对比测试集 → 打分。上线后**线上真实回答也进同一 pipeline**，持续看表现。

评估分三层，是架构决策。**确定性层**——格式、邮箱电话 regex、经典 ML 做 NER/意图/PII，这些我们做了好多年，先清掉。**语义层**——groundedness、相关性，用 **LLM-as-judge**：单独一个 judge 模型评主模型输出，可按 safety、groundedness、相关性打分；Databricks MLflow 等可以对着 trace 自动跑 judge。**行为层**——我最想强调、也最多团队漏掉的：tool 调用对不对？有没有死循环？

举个例子：用户问账户余额，答案对了，trace 里却发现 agent **为同一个答案打了三次数据库 API**——demo 里三次没事，生产里每天成千上万次查询，**重复调用就是烧钱**。行为评估是成本防线。

**编者问：** 行为层为什么最容易被 skip？

**Sandy：** 因为 demo 看起来「答对了」就够了。产线高并发下，duplicate API、无意义重试、tool loop 会把账单撑爆。这层要和前两层一起建，不是锦上添花。

> **金句 · Sandy**
> **中文：** Demo 里调三次 API 没事；生产里这是烧钱操作。
> **原文：** Three API calls in demo is fine — in production, that's an expensive operation.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 黄金测试集 | golden dataset | 专家标注的真实问答对照集 |
| 大模型当裁判 | LLM-as-judge | 用第二个模型评主模型输出质量 |
| 行为层评估 | behavioral evaluation | 查 tool 选择、重复调用、死循环 |
| 分流率 | deflection rate | 简单咨询被 agent 接住、不转人工的比例 |

**本章小结**

- Eval 成功标准必须业务数字化（deflection、accuracy 阈值等）
- 三层 eval：确定性 → 语义 judge → **行为（成本防线）**
- 线上回答回流测试 pipeline，测试集是活系统而非一次性文件

---

## 03 可观测性：每笔决策可回放；数据基础占六成

**编者问：** 支柱二 trace 为什么监管和客户纠纷都离不开？

**Sandy：** 举个真项目：零售银行 chatbot，客户说被收了不该收的透支费，要求减免。Agent 走完整条链——意图分类（耗时、置信度）、连客户库 API、查 RAG 向量库里的透支政策、推理该怎么回、高层 guardrail、最后回复客户。

如果你没有系统把这些步骤**可视化、可回放**，客户来 dispute，你只能两手一摊：「不知道 AI 干了啥，给个折扣息事宁人。」这就是为什么 trace 是 must-have，监管也在推——没有可追溯决策链，就不算生产级系统。

Trace 还能在线发现问题：duplicate API 可以在产线实时监控，触发 fallback——比如最多重试三次，超过就告警或转人工。支柱三**数据基础**，我个人项目里常占 **60% 时间**。分两块：**问答数据**（RAG、训练、检索用的知识）和 **追踪数据**（observability 产生的 trace）。人类看报表发现数错了会找人改；**agent 不原谅脏数据**——错了也自信作答，你还不知道。

企业现在突然要 agent 查数，数据质量、元数据、权限一下子全暴露。在 Databricks 栈里，Delta Lake + Unity Catalog 做表级描述、PII 标签、列级元数据——agent 查表时能带上上下文，审计和发现也集中在一处。Tracing 数据还要跨框架汇聚：客户可能同时用 LangChain、自建栈、多云——需要**统一收集 trace**，给一线支持、运维、LLM judge、漂移监控共用。

**编者问：** 「agent 对错误数据不宽容」这句话有多字面？

**Sandy：** 非常字面。错数进上下文，它照样流畅地给你错误答案——比人类同事还自信。所以数据策略和 trace 策略必须同一套治理语言谈，不能各搞各的。

> **金句 · Sandy**
> **中文：** Agent 不原谅数据漏洞——会自信地答错。
> **原文：** Agents don't forgive gaps — they'll give you the wrong answer confidently.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 全链路追踪 | tracing / observability | 记录 agent 每步决策与 tool 调用 |
| 问答数据 | question data | 服务用户查询的知识与检索源 |
| 追踪数据 | tracking data | observability 产生的可审计日志 |
| 统一目录 | Unity Catalog | 集中权限、元数据、发现的数据治理层 |

**本章小结**

- Trace = 客诉与合规时的「监控录像」，不是可选项
- 数据基础分问答数据 + 追踪数据，常占项目大部分时间
- 跨框架集中 trace，才能服务运维、judge、漂移监控多方

---

## 04 多智能体编排：三种模式各管什么

**编者问：** 什么时候必须从「一个 agent」升级到编排？

**Sandy：** 一个 agent 往往够用；**上到五个**，复杂度指数涨——互相等响应、状态同步、失败传播，全来了。常见三种模式。

**编排器-工人**：中心 orchestrator 派活给专才 agent，请求都过中枢。好处是**集中管控**——出事查 orchestrator 日志就知道发生了什么。**编舞式协同**：各 agent 自治，挂同一消息总线，只听自己关心的事件。适合可并行的场景——房贷申请里，一个 agent 拉客户资料、另一个拉审批信息，**不串行等 orchestrator 来回传**，延迟更低。**人在回路**：置信度低于阈值，自动把工单推给人审。

选模式要想清楚状态管理、容错、规模化——我在同场会议的 online track 有专门视频讲 state、Saga 补偿、熔断等，YouTube 上能看。没有万能模式，只有跟用例匹配的权衡。

**编者问：** 和治理支柱怎么衔接？

**Sandy：** 编排决定「怎么协作」；治理决定「协作出事谁负责」。多 agent 不是炫技——是复杂度到了不得不用。但模式选错，debug 成本比单 agent 高一个数量级。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 编排器模式 | orchestrator-worker | 中心节点派活、集中日志 |
| 编舞式协同 | choreography pattern | 各 agent 自治、事件总线驱动 |
| 人在回路阈值 | HITL confidence threshold | 低置信度自动转人工 |
| 状态管理 | state management | 多步任务间上下文与进度同步 |

**本章小结**

- 多 agent 复杂度指数增长，编排是必选题而非选修
- 三种模式：集中控制 vs 低延迟并行 vs 低置信度人工
- 选型要连同容错、状态、规模化一起设计

---

## 05 治理与银行案例：第七周才选模型

**编者问：** 治理支柱和零售银行案例，能串成一条时间线吗？

**Sandy：** 治理这里不单讲数据治理——那在数据支柱已覆盖。这里讲**监管审计轨迹**：每个 action、每次用户连接、每次请求是否都记下？上线前做 PII 预检、NER、regex——我们一个客户测试阶段就抓到 **47 次 PII 泄露**。还有 **prompt 版本管理**：企业里改 prompt 不能 git commit 就完，要走变更管理，记清「哪次失败导致哪版 prompt」。**模型变更管理**也一样——供应商升级模型，你得在自己的 eval set 上重跑，不能只看公开 benchmark。

银行客户：每月约 **2 万通**客服电话，其中约 **60%** 是简单查询——余额、透支政策之类。先前 POC 花了 **8.5 万美元、6 个月**，上生产后没人说得清为何失败、无法度量、无人问责。我们介入后目标明确：agent 处理 **60%** 简单 query，准确率 **85%**，加上延迟等运营指标。

**8 周 POC 时间线**：第 1–2 周建评估——从真人坐席收 **200 条**真实简单问答，定义成功指标，搭自动 eval pipeline（线上回答也进 pipeline，低分过阈值转人工，修复后**用例入库**）。第 2 周起铺数据基础——API 连接、分布式存储、开始收 trace。测试阶段就抓到 duplicate API，也能解释 CSAT 为何掉。第 **7–8 周才选模型**——有 eval set 后，一周跑完多模型对比，看准确率数字选型。以前能吵几周的模型辩论，有数据后**一周搞定**。

上线六周后出过一次典型事故：央行利率政策变了，App 和邮件通知了客户，但 chatbot 还在读**向量库里过期的政策文档**——用户点踩，CSAT 掉。因为有测量和 trace，我们定位到 embedding 没更新，修掉。没有这套系统，你根本不知道用户在骂什么。

**事故 playbook**：检测（dashboard）→ 诊断（trace）→ 遏制（回滚 prompt、转人工、熔断）→ 用测试库修复 → **失败用例永久入库**。还要接现有 ITSM，凌晨三点告警到对的人。

**编者问：** 明天就能做的第一步？

**Sandy：** 从业务语言定义成功，收十几条「好答案」样例建 mini 数据集，写简单 Python 自动比对。记住三条易踩坑：**测试库要有人 owner、要分类**（安全、日志等）；**prompt 版本要记失败原因**；**CI 跑全量 eval 很贵**——prompt PR 先跑子集，merge main 再跑全量。评估数据集是**活系统**——从 200 条起步，越大越稳。

> **金句 · Sandy（封底）**
> **中文：** 评估数据集是活系统——生产失败必须回流。
> **原文：** Your evaluation dataset is a living system.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 事故响应手册 | production incident playbook | 产线失败检测→诊断→遏制→修复→入库 |
| 模型变更管理 | model change management | 供应商升级后在自己 eval set 上重测 |
| 提示词版本治理 | prompt versioning governance | prompt 变更走企业变更流程并记原因 |
| 第七周选型 | week-seven model selection | 先 eval 与数据，最后才比模型 |

**本章小结**

- 治理 = 审计轨迹 + PII 防线 + prompt/model 变更管理
- 银行案例：200 条真实问答 → 8 周 POC → **第 7 周选模型**
- Living golden dataset + incident playbook 是产线可持续的闭环

---

## 总结

| 维度 | 要点 |
|------|------|
| 核心判断 | 企业 Agent 瓶颈不是选模型，是 eval + trace + data + governance |
| 评估 | 业务数字写进 spec；三层 eval，**行为层**防隐性 API 成本 |
| 数据 | 问答数据 + 追踪数据；agent 对脏数据「自信答错」 |
| 编排 | 五 agent 起复杂度指数涨；orchestrator / choreography / HITL 三选一 |
| 案例 | 银行 POC：**第七周才选模型**；政策过期靠 trace 定位 |
| 与 vault | 接 [[OpenAI评估团队-不再低估模型]]、[[IBM团队-Harness工程详解]]——demo 与生产的工程 gap |

> **金句 · Sandy（封底）**
> **中文：** 碰代码之前，先把成功定义成数字。
> **原文：** Evaluation before touching any code.

---

## 概念索引

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| living_golden_dataset | 活体黄金测试集 | living golden dataset | 产线失败持续回流 |
| behavioral_eval | 行为层评估 | behavioral evaluation | 查 tool 重复与 loop |
| five_pillars | 五支柱 | five pillars | eval→trace→data→编排→治理 |

---

## 附录

### 章节时间戳（B 站简介）

| 时间 | 主题 |
|------|------|
| 02:30 | 模型选择并非首要痛点 |
| 12:15 | 行为评估降低隐性调用成本 |
| 15:40 | 智能体投产的数据挑战 |
| 21:20 | 多智能体协作与编排 |
| 26:15 | 测试数据集需持续迭代 |

### 素材路径

- **ingest**：`Recastory/workspace/knowledge/A2-databricks-agent/ingest`
- **来源限制**：当前 Recastory BV 目录未发现 ASR；正文来自专栏与简介的编辑重构
- **video_description**：`{ingest}/video_description.md`
- **B 站**：[BV1o4TL6sExw](https://www.bilibili.com/video/BV1o4TL6sExw/)
- **时长**：37:06
- **专栏主源**：无（A 级 partial enrich）

### 相关阅读

- [[OpenAI评估团队-不再低估模型]] — eval 方法论互补视角  
- [[IBM团队-Harness工程详解]] — Harness 可靠性与 eval 系统  
- [[Loop-Agent Loop到底是什么]] — 开放式 loop 的 token 成本与评分闭环  
- [[Manus创始人-深度干货-上下文工程的最佳实践]] — 产线 context 与 eval 对照  
- [[MOC - Harness Engineering]] — Harness / eval 横切索引  

### 收录说明

- **讲者**：Sandy（Databricks 数据 AI 技术负责人；主题演讲，Host 为现场过渡提问）  
- **主源**：英文 ASR；无 UP 专栏图稿  
- **版本**：canonical Host-Guest v3.2-asr（2026-07-03；原 v3 九段讲义已替换）
