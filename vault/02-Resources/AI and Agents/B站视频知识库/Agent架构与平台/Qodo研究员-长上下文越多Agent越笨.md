---
title: "Qodo研究员：长上下文越多Agent越笨"
tags: ["ai_agent", "context_engineering", "bilibili"]
legacy_tags: ["ai_agent", "context_engineering", "bilibili"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Nupur Sharma（Qodo）：长上下文 U 形曲线让 Agent 丢中间信息；分层摘要/迭代检索/80/20 混合架构/裁判代理，把代理式代码审查从「塞满窗口」改成「上下文架构」。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Qodo研究员-长上下文越多Agent越笨.md"
source_sha256: "1c257a4ad54a599872e3bb43ef6172e80d4424003ab713ca97568943777361dc"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1TwjN6NEuA/"
source_original: "https://www.youtube.com/watch?v=EcqMYoIV57A"
duration: "26:27"
saved: 2026-07-06
updated: 2026-07-06
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1TwjN6NEuA/ingest"
column_url: "https://www.bilibili.com/read/cv50591092/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1TwjN6NEuA/ingest/column_article.md"
source_original_date: "2026-06-08"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Moderator（AI Engineer 现场）"
guest_name: "Nupur Sharma"
guest_title: "Qodo 研究员 · 代理式审查"
speaker_inference: "column_article S-tier + AI Engineer 原视频"
speaker_confidence: high
author:
  - "[[Nupur Sharma]]"
concepts:
  - id: u_curve
    zh: U 形注意力曲线
    en: U-shaped attention curve
    one_line: 模型盯开头和结尾，中间 Jira/MCP 等业务上下文常被静默丢弃
  - id: context_engine
    zh: 上下文引擎
    en: context engine
    one_line: 像保镖一样给任务做检索排序，只喂高信号片段
  - id: orchestration_paradox
    zh: 编排悖论
    en: orchestration paradox
    one_line: 模型越聪明越爱「找最佳方法」，Token 烧在研究循环里
  - id: hybrid_8020
    zh: 80/20 混合架构
    en: 80/20 hybrid architecture
    one_line: 80% 高推理做探索，20% 小模型做确定性验证与门控
  - id: referee_agent
    zh: 裁判代理
    en: referee agent
    one_line: 收齐专家代理输出，对照 PR 历史做二次精炼
  - id: agent_mixture
    zh: 专家代理混编
    en: agent mixture / mixture of experts
    one_line: 多个窄域小代理并行，替代一个巨型全能代理
---

# Qodo 研究员：长上下文越多 Agent 越笨

**Host：** Moderator（AI Engineer 现场）  
**Guest：** Nupur Sharma（Qodo 研究员 · 代理式审查 · DevSecOps 背景）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV1TwjN6NEuA](https://www.bilibili.com/video/BV1TwjN6NEuA/) · **时长** ~26 min · **专栏** [cv50591092](https://www.bilibili.com/read/cv50591092/) · **原视频** [AI Engineer](https://www.youtube.com/watch?v=EcqMYoIV57A)

---

## 开场

行业默认逻辑很简单：上下文窗口越大，Agent 越聪明——把整个代码库、Jira 线程、工具输出全塞进去，模型该「看见一切」。Qodo 做 **代理式代码审查**，Nupur Sharma 用内部基准测试打了脸：**模型往往只认真处理开头和结尾，中间信息被静默丢掉**，形成 U 形注意力曲线。窗口从 4K 涨到百万 token，失败模式从「塞不下」变成「塞满了但看不全」。

Nupur 的 DevSecOps 背景让她对 **确定性** 有洁癖——管道要么跑通要么崩；Agent 却是概率性的。她过去几年专门盯 Agent **在哪失败、怎么失败**，今天把代理式审查里的上下文架构经验摊开：五种优化路径、编排悖论、80/20 混合、专家代理 + 裁判代理，以及 Qodo 生产架构怎么落地。

五章预告：**U 形曲线与审查演变** → **五种上下文优化** → **编排悖论** → **80/20 混合** → **裁判代理与 Qodo 架构**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理式审查 | agentic review | 多步、多工具、多代理协作的自动化 PR 审查 |
| U 形注意力曲线 | U-shaped attention curve | 长上下文里首尾敏感、中间被模型「清理掉」 |
| 上下文引擎 | context engine | 检索+排序层，像保镖筛什么该进 prompt |
| 分层摘要 | layered summarization | 给文件/文件夹预生成摘要，代理先读摘要再决定是否深挖 |
| 迭代检索 | iterative retrieval | 像图书馆借书卡：按主题索引，相关再下钻代码 |
| 编排悖论 | orchestration paradox | 高推理模型不停换工具/换方案，Token 耗在「找路」 |
| 80/20 混合架构 | 80/20 hybrid architecture | 探索用 frontier，验证/总结用确定性小模型 |
| 专家代理混编 | agent mixture | 安全/架构/Jira 各一个小代理，不做全能巨代理 |
| 裁判代理 | referee agent | 收齐专家输出，对照 PR 历史做全局一致精炼 |

---

## 01 长上下文陷阱：U 形曲线与 Agent 式审查的演变 [05:12]

**Moderator：** 你在 Qodo 做代理式审查。DevSecOps 出身的人进 Agent 世界，最先撞墙的是什么？上下文窗口一路变大，为什么反而更不可靠？

**Nupur Sharma：** 我是 Nupur，在 Qodo 做 **代理式审查**。DevSecOps 里一切都是确定性的——管道跑，然后崩；崩了就去修。Agent 不是这套逻辑。过去几年我专门看 Agent **在哪失败、怎么失败**，今天把经验摊开。

如果你看 Agent 怎么演化的：一开始是 **静态提示**，上下文只有 4K。你得自己判断什么重要、塞进 prompt；给错了输入，结果就歪。后来窗口变大，大家想「能塞更多，应该更好吧」，于是上 **单代理工作流**——给搜索工具，在文档里搜、跑命令、再看结果再操作。这又是一个循环，但工具不知道什么时候该停，总觉得自己还缺输入，来回转。

再往后 **多代理架构** 火了：安全代理找漏洞、审查代理跑工具、编码代理修问题。代理越多，麻烦也越多——彼此理解不一致，输出冲突，理想结果拿不到。教训是什么？**上下文本身不是敌人**；模型天天更新，你能灌海量数据进去。问题是：**灌进去之后，模型真的「聪明到能决定什么重要」吗？**

我们 benchmark 自己的审查代理，每次 PR 都试：能不能把 **整个代码库** 全给进去？结果发现一个稳定模式——**U 形曲线**。模型认真看 **最开始的提示/目标**，也看 **你最后塞进去的东西**；**中间** 的 Jira 信息、MCP 工具结果、业务逻辑，它倾向于自行「清理掉」，让输出看起来连贯。开头和结尾在焦点上，中间被过滤。这不是窗口不够大，是 **注意力分配** 出了问题。对复杂审查来说，中间往往才是「这条 PR 到底要满足什么业务要求」——丢了中间，Agent 就在错误目标上跑得很自信。

> **金句 · Nupur Sharma**
> **中文：** 窗口越大，你越容易把整库扔进去；模型却只盯开头和结尾，中间的业务要求被悄悄抹掉。
> **原文：** Agents look at the starting point, end point and try to provide you the results. This is like a U curve — whatever you are providing in between, that is not taken up.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 静态提示 | static prompting | 4K 时代人工挑上下文，无工具循环 |
| 单代理工作流 | single-agent workflow | 一代理+工具链，易陷入「还要更多输入」循环 |
| 多代理架构 | multi-agent architecture | 专域代理并行，但缺编排会输出冲突 |
| U 形注意力曲线 | U-shaped attention curve | 长上下文首尾敏感、中间丢失的实测模式 |
| 中间丢失 | lost-in-the-middle | 业务/Jira/MCP 等中段上下文被模型忽略 |

**本章小结**

- Agent 演化路径（静态 → 单代理循环 → 多代理）每步都换失败模式，但 **长上下文的 U 形曲线** 是当下审查场景的主因。
- 「塞满窗口」不等于「看见一切」；Jira、MCP 等 **中间上下文** 最容易被静默丢弃。
- 瓶颈从 **容量** 转向 **架构**：怎么喂、喂谁、谁精炼。

---

## 02 别把整个代码库往里塞：五种上下文优化路径 [07:45]

**Moderator：** 既然全量输入会触发 U 形曲线，你们实际怎么优化上下文？「上下文引擎」这个词人人都在讲，落地代价是什么？

**Nupur Sharma：** 我们的做法是 **战略性上下文优化**——不是把一切都扔给模型让它自己猜重要性，而是先想清楚：**什么信息、以什么形态、在什么时候** 进入哪个代理。

现在市面上几条路，我按真实成本说。

**上下文引擎** 很流行——像保镖坐在高速行驶的车里，告诉你哪些信息更关键。大且乱的代码库特别适合：建搜索模式、排名逻辑，任务来了查排名再喂片段。难点在 **索引与扩展**：600、700 个仓库以上，映射变慢、行为难预测；你不是专职做上下文引擎的团队，很难做漂亮。

**分层摘要** 是另一条路：不给全量遍历，而是给每个文件、每个文件夹预生成摘要。代理先读摘要，判断「这块要不要深挖」。好处是检索精准；代价是 **前期 LLM 处理贵**——文件一改就要重新映射，维护成本高。

**知识图谱** 复杂但有效：文件 A 影响 B、B 影响 C，用图数据库托管逻辑依赖。初始搭建对开发要求高、耗时长；如果你有 **跨仓库的复杂逻辑依赖**，它值。

对我个人，大多数 **内部流程、非产品公司** 的场景，**迭代检索** 最好用。不用预建全套摘要，而是建 **索引**——像图书馆借书卡：告诉代理主题，相关再下钻查代码。LLM 调用次数会上去，但开发人员 **初始投入低**，输入门槛也低，结果往往更好。

还有 **自我纠正**：代理跑完任务，加一个 **评论节点** 对照初始目标检查输出是否跑偏；偏了就让代理重跑。延迟会增加，但不用前期搭复杂基础设施。

这几条路没有银弹——上下文引擎适合规模可控的排名检索；分层摘要和知识图谱吃前期成本；迭代检索和自我纠正更「轻启动」，适合团队自己搭审查流。

> **金句 · Nupur Sharma**
> **中文：** 迭代检索像借书卡——先按主题找索引，相关再钻进代码，比把整个库倒给模型靠谱得多。
> **原文：** It is like a library card — you give it to the agent with a topic, and if it's relevant, the agent can go deep into the code and look for results.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 战略性上下文优化 | strategic context optimization | 主动设计喂什么，而非迷信大窗口 |
| 分层摘要 | layered summarization | 文件/目录级摘要，代理先扫摘要再决定深挖 |
| 知识图谱 | knowledge graph | 用图数据库存逻辑依赖，适合跨文件/跨仓 |
| 迭代检索 | iterative retrieval | 主题索引 + 按需下钻，轻量启动 |
| 自我纠正 | self-correction | 评论节点对照目标，跑偏则重跑 |
| 排名逻辑 | ranking logic | 上下文引擎给片段打分，只喂高信号部分 |

**本章小结**

- 五条路径对应不同 **前期成本 vs 运行时噪音**：引擎/图谱重索引，分层摘要重 LLM 预处理，迭代检索/自纠正偏轻量。
- 600–700+ 仓库规模下，纯上下文引擎 **扩展性** 会成瓶颈。
- 核心思想一致：**少喂、精喂、按任务喂**，别赌模型会从垃圾山里自己淘金。

---

## 03 编排悖论：高推理模型为何在研究里空转 [11:30]

**Moderator：** 上下文优化之外，你们还提到「编排悖论」——模型越聪明，越容易不干活、光研究。这怎么发生的？

**Nupur Sharma：** 这是我在帮客户搭代理时最常看到的第二类坑，我叫它 **编排悖论**。

LLM 越来越聪明，你给它任务，它第一反应是：「我该用哪个工具？能不能做得更好？要不再研究一下？」于是进入循环——**不是在解决问题，是在找解决问题的方法**。从一种方法跳到另一种，大量 API Token 烧在 **选路** 上，而不是 **执行** 上。你用最新的高推理模型，它特别容易进 **研究模式**：不断挑战自己的方案——「也许不是这个，换另一种，再换一种」——卡在「试图做某事」和「实际去做」之间。

这跟 U 形曲线是不同维度的失败：U 形曲线是 **看得不全**；编排悖论是 **看得太多、想太多、动太少**。

> **金句 · Nupur Sharma**
> **中文：** 高推理模型最擅长的是研究「最佳做法」，不是按时交活——Token 往往死在找路上。
> **原文：** Most of the API tokens are wasted in finding the method, not in actually executing. It goes into research mode instead of actually solving the problem.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 编排悖论 | orchestration paradox | 高自由度 + 高推理 → 无限「找最佳路径」循环 |
| 研究模式 | research mode | 模型反复换工具/换方案，不交付当前最优结果 |
| 选路开销 | method-selection overhead | Token 消耗在规划而非执行 |

**本章小结**

- 编排悖论与高推理模型 **正相关**：Opus 级模型尤其爱自我挑战。
- 症状是 Token 曲线陡峭但 **交付物迟迟不出**。
- 解法方向：给探索段 **上限**（计数器/超时），把「必须交卷」变成硬约束——下一章的 80/20 展开。

---

## 04 80/20 混合：探索型与确定性任务分开跑 [13:15]

**Moderator：** 怎么打断这种无限研究循环？你提到的 80/20 混合，具体怎么切任务？

**Nupur Sharma：** **80/20 混合方法** 是我见过最稳的结果之一。

**80%** 的时间交给最新、最强的高推理模型/代理做 **动态研究**——你给目标：「尽你所能去做。」探索、规划、选工具、找上下文，这段 **允许自由**。

**20%** 留给 **总结、验证、门控**——不自由流动，门槛更硬：「如果我得到 X，我要 Y。」这段要 **确定性**，把 80% 探索段带来的噪音压下去。

你也许会问：80% 那段还是会无限循环吧？我们有闸刀——**计数器**：四五次尝试后 **必须用最后一次结果**；或者 **超时**：五分钟到，不管最后一个工具调用是什么，先拿它往下走，不好再回头。总之 **限制探索段**，而不是期待模型自己停。

任务类型也要分：**发现、规划、看该用哪个工具** → 80% 研究模型表现很好；**写摘要、从研究里抽结论、评论节点对照目标** → 20% 确定性小模型足够，而且更便宜。20% 段你其实在 **告诉它要什么**，不需要它再研究「最佳写法是什么」。

下一步该找什么、往哪挖——仍可由 80% 的动态模型驱动；**用户真正要的正确结果是什么**——交给 20% 的 gate 决定。这和 [[OpenAI员工-上下文工程和Agent记忆]] 里 trim/compact/summarize 的分工同向：探索可以 messy，**出口必须干净**。

> **金句 · Nupur Sharma**
> **中文：** 八成算力给前沿高推理模型去探索，两成给小模型做硬门槛验证——探索可以乱，交付必须准。
> **原文：** Give the latest, best models 80% of the time for research — but the final validation and summarization, the 20%, is more restricted with stricter gates.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 80/20 混合架构 | 80/20 hybrid architecture | 探索/规划 vs 验证/总结的算力与模型切分 |
| 确定性门控 | deterministic gating | 20% 段硬规则：X→Y，不允许自由发挥 |
| 计数器机制 | attempt counter | N 次尝试后强制采用最后结果 |
| 超时闸刀 | timeout cutoff | 时间到必须交卷，防止研究死循环 |
| 评论节点 | critic / review node | 对照初始目标检查输出，属 20% 确定性段 |

**本章小结**

- 80/20 把 **编排悖论** 关进笼子：探索自由，出口 deterministic。
- 高推理模型 **只该出现在需要选路和发现的地方**；摘要/验证/门控用小模型更划算。
- 计数器 + 超时是生产必备，别赌模型自觉停。

---

## 05 裁判代理与 Qodo 代码审查架构 [16:40]

**Moderator：** 上下文和编排都谈了，Qodo 生产里怎么串起来？多代理协作时，怎么避免「酒店在希腊、航班飞葡萄牙」这种割裂输出？

**Nupur Sharma：** 窗口变大后，很多团队想：**一个代理干所有事**——测试、审查、修复全塞一个 prompt。上下文虽同，代理往前走会被信息淹没，**丢最初任务目标**。你给四个任务，跑到一半可能只剩两个还在焦点上——那两个做得很好，另外两个悄悄丢了。

我们的解法是 **专家代理混编**：不做巨型全能代理，而是 **问题专家**——安全代理找漏洞、差异代理读 code diff、Jira 代理对需求、编码代理试修复。各干窄域，单域质量高。

但每个专家都会给你 **自己觉得有趣的结果**，怎么拼成对开发者有用的整体？度假例子：一个代理找最好酒店，一个找最好地点，一个找最好航班——酒店在希腊，航班阿姆斯特丹飞葡萄牙，拼一起没意义。

所以需要 **裁判代理**。它收齐所有专家输出，看能不能 **组合成自洽的建议**；再回 **上下文引擎** 和 **PR 本体**，对照「这 10 条里几条真的跟当前 PR 相关」，二次精炼，才交给开发者。

**Qodo 架构** 就是这样跑的：PR 进来 → **上下文收集器** 从 PR、上下文引擎、工具拉片段（不全量灌入）→ **分叉** 给各专家代理 → 专家并行反馈 → **裁判代理** 精炼 → 输出。

**通信机制**：底层用 LangChain 搭基础设施。一个代理的结果，给下一个代理 **重写 prompt**；多环节时还有专门代理 **收集所有结果、写更精炼的下游 prompt**——本质是把上游输出塞进下游上下文，但由编排层控制 **喂什么、喂多少**，对抗 U 形曲线。

**校准与权重** 也是架构一部分。LLM 最初不知道 **你的团队什么算重要**——同样 Java 框架，医疗/零售/金融关注点完全不同。我们几条路：

- **PR 历史索引**：查类似问题上次什么时候出现、审阅员和开发者怎么评；信息 **两次** 进入上下文——一次给子代理找问题，一次给裁判代理决定建议值不值得给。
- **合规/架构门户**：架构师、合规在门户里写 **指导方针**，代理对照验证。
- **规则 vs Bug**：客户把条目标成 **规则** 就必突出；标成 Bug 是「你可能有问题」的提醒。
- **接受/拒绝反馈循环**：开发者接受某类建议，下次权重升；连续拒绝，审阅者或该类建议权重降。历史发生过 ≠ 历史正确——规则和指导原则可以覆盖「坏习惯被重复」的模式。

有人担心：每个代理只拿 **局部上下文**，会不会没有全局视角？老代码审查也是分工的——资深工程师看习惯、安全看注入和密钥、合规看 SOC2 记录。全局一致性靠 **裁判层 + PR 历史 + 规则权重**，不是让一个代理吞全库。

> **金句 · Nupur Sharma**
> **中文：** 专家代理各抒己见，裁判代理对照 PR 历史问一句——有趣吗？对你这份 PR 真相关吗？
> **原文：** A judge agent looks at the results and says — these are interesting enough, but is it relevant to you? It can go back to the context engine and refine out of the 10 things which actually make sense for your PR.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 上下文收集器 | context collector | PR 入口，从引擎/工具拉片段而非全库灌入 |
| 专家代理混编 | agent mixture | 安全/差异/Jira 等窄域代理并行 |
| 裁判代理 | referee agent | 收齐输出、对照 PR 做全局一致精炼 |
| PR 历史索引 | PR history indexing | 组织记忆：过去怎么审、怎么修、怎么争论 |
| 规则与 Bug 分级 | rules vs bugs | 规则硬突出，Bug 软提醒，权重可学习 |
| 反馈权重 | acceptance-weighted ranking | 开发者接受/拒绝驱动建议类型权重 |

**本章小结**

- 单巨代理多任务 → **目标丢失**；专家混编 + 裁判 → **局部深度 + 全局一致**。
- 通信靠编排层 **控 prompt 拼接**，不是让每个代理互读全量上下文。
- PR 历史、合规门户、接受率权重是 **校准** 三件套；历史是来源之一，不是唯一真理。

---

## 总结：瓶颈是上下文架构，不是窗口大小

| 维度 | 要点 |
|------|------|
| 诊断 | 长上下文 U 形曲线：首尾敏感、中间丢失；全库灌入让 Jira/MCP 等业务要求静默失效 |
| 优化 | 五条路径（引擎/分层摘要/知识图谱/迭代检索/自纠正）按规模与前期成本选型 |
| 编排 | 编排悖论：高推理模型 Token 烧在选路；计数器/超时 + 80/20 混合切断死循环 |
| 架构 | 专家代理混编 + 裁判代理；上下文收集器控喂入，PR 历史与规则权重做校准 |
| 生产 | LangChain 编排 prompt 链；探索 80% frontier，验证 20% 确定性小模型 |

### 对构建 Agent 工作流的人

- 别用 **窗口大小** 当 KPI；用 **中间信息是否进决策** 做 benchmark——跟 [[OpenAI员工-上下文工程和Agent记忆]] 的 failure mode 对照着测。
- 内部审查/合规类 Agent：优先 **迭代检索 + 裁判精炼**，全库灌入只适合演示。
- 多代理必须配 **确定性出口**（20% gate）和 **全局裁判**，否则专家输出会拼成希腊酒店 + 葡萄牙航班。

### 对团队与产品的启示

- 600+ 仓库规模要早想 **索引扩展性**，纯上下文引擎会拖慢 unpredictable。
- 客户不上传合规/架构指南可以 **开箱即用**，但个性化靠 PR 历史——预期管理要说清楚。
- 权重学习（接受/拒绝）要防 **坏习惯强化**；规则级条目需硬性覆盖。

### 仍待验证

- 各前沿模型 U 形曲线严重程度是否随版本快速变化——专栏 benchmark 未给跨模型表。
- 知识图谱 vs 迭代检索在 **单一仓库** 的投入产出交叉点——Nupur 偏内部流程场景，产品公司可能不同。

> **金句 · Nupur Sharma（封底）**
> **中文：** 上下文不是问题了——问题是模型并不会因为窗口大就更智能地决定什么重要；架构得你来建。
> **原文：** Context is not the problem. Day by day models let you dump a lot of context — but does that make sure the results are smart enough to decide what's important?

---

## 附录

### 章节时间戳（B 站简介 / 专栏导读）

| 章节 | 时间 | 主题 |
|------|------|------|
| 01 | [05:12] | U 形曲线与 Agent 式审查演变 |
| 02 | [07:45] | 五种上下文优化路径 |
| 03 | [11:30] | 编排悖论 |
| 04 | [13:15] | 80/20 混合架构 |
| 05 | [16:40] | 裁判代理与 Qodo 代码审查架构 |

### Ingest 路径

| 字段 | 路径 |
|------|------|
| ingest_dir | `Recastory/workspace/bilibili-retranscribe/BV1TwjN6NEuA/ingest` |
| column_source | `.../ingest/column_article.md` |
| column_url | https://www.bilibili.com/read/cv50591092/ |
| BV | https://www.bilibili.com/video/BV1TwjN6NEuA/ |
| 原视频 | https://www.youtube.com/watch?v=EcqMYoIV57A |

### 相关阅读

- [[OpenAI员工-上下文工程和Agent记忆]] — trim/compact/summarize 与跨会话记忆；本篇补 **长上下文 U 形曲线 + 多代理审查架构**
- [[MOC - Harness Engineering]] — 横切索引；80/20 混合与裁判门控可视为 harness 层的编排策略
