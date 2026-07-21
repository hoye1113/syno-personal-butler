---
title: "Snorkel：小模型 RL 超越大模型"
tags: ["ai_agent", "ai_evaluation", "video_transcript", "bilibili"]
legacy_tags: ["ai_agent", "ai_evaluation", "video_transcript", "bilibili"]
created: "2026-07-02"
source: "B站视频 - Easonlee的AI笔记"
description: "Snorkel × Berkeley RLLM：专家在环数据 + GRPO，4B 在金融 FinQA 工具使用上 pass@1 约 2× 超越 235B；瓶颈在 tool discipline 而非 reasoning，单次 RL ~$500。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/AI评估与研究/Snorkel-小模型RL超越大模型.md"
source_sha256: "71cb89484c0b634980eedaded7cbcff8569ee2b287fc0d8b4df2e98840d9e8a6"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1JvjP6XE1k/"
speaker: "Koby Crawford (Snorkel AI)"
saved: 2026-07-02
transcript_source: "bilibili-retranscribe/BV1JvjP6XE1k/article.md"
material_tier: S
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1JvjP6XE1k/ingest"
column_url: "https://www.bilibili.com/read/cv50592898/"
source_original_date: "2026-06-11"
host_name: "Host"
guest_name: "Kobie Crawford"
guest_title: "Snorkel AI 开发者倡导者"
speaker_inference: "column_article monologue → synthetic Host Q&A"
speaker_confidence: "high"
factual_status: partial
factual_reviewed: 2026-07-13
verification_basis:
  - transcript
  - transcript_json
  - column
unresolved_facts:
  - "4B/235B、成本与训练时长等数字尚未逐条对照原视频。"
author:
  - "[[Kobie Crawford]]"
concepts:
  - id: tool_discipline
    zh: 工具纪律
    en: tool discipline
    one_line: 先发现环境、读 schema 再查 SQL，而非瞎猜表名
  - id: grpo
    zh: 组相对策略优化
    en: GRPO
    one_line: 本次 RL 算法；单次 run ~$500、~21h
  - id: finqa
    zh: 金融问答环境
    en: FINQA environment
    one_line: 自包含金融 tool-use RL 评测环境，290 + 79 多表样本
  - id: rubrics
    zh: 评估标准
    en: rubrics
    one_line: 把响应拆成多条可评行为，定位该补哪类训练数据
column_source: "Recastory/workspace/bilibili-retranscribe/BV1JvjP6XE1k/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
updated: 2026-07-03
---
# Snorkel Kobie Crawford：小模型 RL 超越大模型

**编者问：** 以下问题由编者按单人分享的论点重构。
**Guest：** Kobie Crawford（Snorkel AI 开发者倡导者）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `B2-snorkel-rl/ingest/column_article.md`  
**B 站视频：** [BV1JvjP6XE1k](https://www.bilibili.com/video/BV1JvjP6XE1k/)

---

## 开场：为什么现在聊这个

Conference 末场，Kobie Crawford 来自 Snorkel——一家自称「前沿 AI 数据实验室」的团队，核心卖点是**专家在环**的高质量数据集。这期不是产品 demo，是他们研究团队和加州大学伯克利 RLLM（Agentica）合作的一条硬结果：**40 亿参数模型，在金融分析的工具使用任务上，跑赢了 2350 亿参数的推理模型**。

企业里最常见的解法你大概见过：性能不够 → 换更大的模型。Kobie 要挑战的就是这条默认路径。他的判断很直：**很多生产瓶颈不在推理深度，而在模型会不会按纪律用工具**——先摸清环境、读表结构、错了能改，而不是凭空猜表名然后 hallucinate 一个答案。

下面四章分别聊：为什么「大锤砸核桃」常是错路、235B 和 4B 在同题上的行为差在哪、反直觉的单表训练 ablation、以及 Rubrics 怎么帮你决定该生成什么数据。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 工具纪律 | tool discipline | 先 list 表、读 schema 再写 SQL，不瞎猜 |
| 组相对策略优化 | GRPO | 本次 RL 算法；Group Relative Policy Optimization |
| 金融问答环境 | FINQA environment | 自包含金融 tool-use 评测环境，无外部依赖 |
| 专家在环 | expert-in-the-loop | 金融等领域专家参与数据生成与验证 |
| 陶哲轩效应 | Terrance Tao effect | 通才 brilliance 不等于窄岗位所需行为 |
| 评估标准 | rubrics | 把回答拆成多条可评维度，定位行为缺口 |
| 通过率 | pass@1 | 单次采样答对的比率 |
| 消融实验 | ablation study | 只改训练数据成分，看哪档 uplift 最大 |
| 概念验证 | PoC | 先用大模型跑通 demo，再考虑生产部署 |

---

## 01 换大模型常常是错锤子

**编者问：** 企业里 FinQA、金融分析这类任务 performance 不够，第一反应往往是「换更大的模型」。你们为什么说这常常是错锤子？

**Kobie：** 我先交代一下我们到底在干什么。Snorkel 从成立起就在啃数据质量——现在重点是交付**有质量下限保证**的数据集，全程拉专家进来。博士、行业里泡了很多年的分析师，金融任务就找金融的人。顶级 lab 拿我们的数据做性能爬坡，这是 Snorkel 的主业。我们把自己定义成前沿 AI 数据实验室，研究支持一直是底色；这次演讲就是我们研究团队的一条硬结果。

这次是我们和伯克利 RLLM 团队合作完成的——他们实验室的 Agentica 项目跟我们一起做了这个用例。目标写得很硬：**让 40 亿参数的模型，在金融分析的工具使用上，超过 2350 亿参数的模型**。标题叫「停止让模型变得更大」——不是说模型永远不该做大，而是说，**用对数据打对问题**，有时收益比堆参数大得多。我们会从研究目标讲起，迭代讲方法，最后给结果——很高兴地说，我们拿到了预期结果，值得展开讲。

企业场景有几个背景你得记住。个人助理爆发很快，但进企业就要加很多限制：安全、合规、数据不能出域。金融、医疗尤其敏感——你得想能不能 on-prem 部署，能不能自己控服务，别依赖外部 API 把数据导出去。这些是客户真正优先的事项，不是 PPT 上的摆设。

于是出现一条很常见的路径：PoC 阶段大家爱用大模型，效果惊艳，全员欢呼。一到「怎么上生产」，成本、延迟、部署压力全来了。性能还差一点？很多人的本能是：**再换一个更大的**。大模型更聪明、推理更强嘛，规模上去性能跟着涨——**有时真是这样，有时完全不是**。这会带来额外负担和更高推理成本，在某些 narrow task 上可能根本不是正确答案。

我们问的是：能不能拿一个小模型，配上**强化学习**和**正确的数据**，拿到你要的应用能力？小模型在成本、速度、安全上有天然优势。PoC 用大模型跑通没问题，生产未必该继续扛那个体量——尤其是你得把东西放在本地、自己跑服务的时候。

这里有个 RLLM 团队的说法，叫**陶哲轩效应**。陶哲轩那种数学家，什么数学都能碰，才华是通才型的。金融分析师不需要这个。他不必懂所有算法，不必为了跑一条 SQL、拿个数、做个加减法，就去研究高深数论。**岗位要的是窄而可靠的工作流，不是通才 brilliance。**

换更大模型，有时就像**大锤砸核桃**——你多买了一堆用不上的能力，还付了更高的推理账单。我们挑战的就是：你是不是非得要「更智能、推理更深」才能把活干好？**很多时候，你要的是行为对了，不是参数多了。** 强化学习在这里特别合适——你改的是**行为模式**，不是往模型里硬塞更多核心知识。这是我们处理这个问题的直觉。

> **金句 · Kobie**
> **中文：** 别一味做大模型——用对数据打对问题，有时比堆参数回报大得多。
> **原文：** Stop making models bigger... sometimes we find great wins with the right data applied to the right problem statement.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 陶哲轩效应 | Terrance Tao effect | 通才大模型 vs 窄任务所需 tool workflow |
| 大锤砸核桃 | sledgehammer on a walnut | 用大模型解决只需行为修复的窄任务 |
| 专家在环 | expert-in-the-loop | 金融 HD 级专家生成并验证训练数据 |
| 概念验证 | PoC | 大模型 demo 跑通 ≠ 生产该继续用大模型 |
| 行为修复 | behavior fix | RL 改的是怎么用工具，不是塞更多知识 |
| 本地部署 | on-prem deployment | 数据不出域；小模型更易满足 |

**本章小结**

- 企业 performance 瓶颈常被误判为「推理不够」；金融 tool-use 更常缺 **tool discipline**
- PoC 大模型 → 生产换更大模型，是常见但未必正确的路径
- **陶哲轩效应**：通才 brilliance 不等于岗位所需；小模型 + RL + 对数据可能是更优解

---

## 02 2350 亿缺 tool discipline，40 亿靠自我纠错赢

**编者问：** 同一条 YouTube 广告收入同比题，2350 亿和 40 亿到底差在哪？能一步步走一遍吗？

**Kobie：** 可以，这是我们环境里最有说服力的对比。环境叫 **FINQA**，我们自建的，专门测金融场景下的工具使用。里面有一套固定工具，全部内置，没有外部依赖——你部署时是自包含的发布版，不会出现依赖项躺在某个远程数据中心、你访问不了的情况。熟悉 OpenAI Gym 或 Harbor 的人会觉得很像。代码在 GitHub OpenAI Gym 仓库，PyTorch 团队和 Hugging Face 团队合作，在 Hugging Face Spaces 里托管；Prime Intellect 基础设施也能加载。**想自己试强化学习，门槛比几年前低多了。**

数据集分两块：**290 个**常规样本，外加 **79 个**更难的 **Finque Reasoning**——要多表联查，我们把它标成更难一档的基准。环境里实际上建了两层基准，简单集和推理集分开看涨幅。

先看 **2350 亿**的 Coin 3 推理模型。问题：「YouTube 广告从 23 年到 24 年的同比增长率是多少？」它的思路是：发起查询找数值。但它**没先摸清环境**，没去看工具里到底有哪些表可以查，直接查了一个**根本不存在的表**。查不到，再猜一次，还是空。两次失败后，它**退回去凭空编了一个答案**——松散幻觉，完全不可用。你不知道权重里到底告诉了它什么，但结果就是没用。

讽刺的是，环境里明明有 **`get_table_names`** 这类工具，2350 亿模型**有权限用，就是没选**。推理更强，**需要动手用工具的时候，强推理帮不上忙**。它缺的是纪律——先摸清有什么，再动手查。说白了：**大模型推理极强，工具使用却缺纪律。**

我们这边怎么训 40 亿？Snorkel 侧先产**高质量数据集**——专家在环，内部平台生成和处理数据，金融分析就找金融专家。每条任务做验证：能不能查、答案能不能核对、是否真匹配目标。我们希望问题和答案确实能帮助模型学习「什么才重要」。数据质量对我们至关重要——验证过关才进强化学习。

算法用 **GRPO**，从 40 亿参数基座出发，环境接 RLLM 框架。整次训练 **21 小时内跑完，成本不到 500 美元**——强化学习不必是非常昂贵的事，也能拿到非凡的性能提升。Karpathy 之类的大佬可能对小模型持怀疑态度——**但这条路径非常可行**，你自己托管模型、已经在研究怎么改进模型的人，完全可以动手。这也是个行动号召：你完全能让想用的模型达到所需性能水平。

训完的 **40 亿**答同一道 YouTube 题，行为完全两样：

1. 先调 **`get_table_names`**，列出环境里真有哪些表——2350 亿也有这工具，没用；40 亿第一步就用了，这本身就已经是一个胜利。  
2. 再 **`get_table_info`** 读表结构，知道列叫什么，再写 SQL。  
3. 跑查询，碰到列名错了——它请求了「收入」列，表里根本没有。  
4. **读报错、改查询**，换对的列，拿到正确答案。

你看到的是 **发现表 → 读结构 → 查数 → 自我纠正** 一整条链。500 美元的训练循环，单次通过率**基本上是之前的两倍**——解题百分比翻了一档。**40 亿跑赢了 2350 亿**，靠的不是更深的数学，是**工具纪律加错误纠正**。这两样行为，才是成功回答这些问题的真正关键。

> **金句 · Kobie**
> **中文：** 问题不在推理，在工具怎么用——大模型有工具不用，小模型学会先摸环境再动手。
> **原文：** It wasn't the reasoning that was the issue. It was the tool use.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 获取表名 | get_table_names | 先发现环境有哪些表，再写 SQL |
| 获取表结构 | get_table_info | 读 schema，避免列名瞎猜 |
| 自我纠正 | self-correction | 读 error message，改查询重试 |
| 组相对策略优化 | GRPO | 本次 RL；单次 ~$500、~21h |
| 通过率 | pass@1 | 4B 训后约 2× 235B |
| 幻觉式兜底 | loose hallucination | 查失败后编造答案，235B 典型失败模式 |

**本章小结**

- 235B 典型失败链：不摸清环境 → 查不存在表 → 空结果 → 幻觉编造；**有工具不用**
- 4B + 专家数据 + GRPO 学会发现 → 读结构 → 纠正；**单次通过率 ~2×**
- 强化学习不必天价：**~$500/次** 级即可在窄生产任务上 beat 前沿巨型模型

---

## 03 只训单表，多表也跟着涨

**编者问：** 训练数据里既有单表也有多表。你们做消融实验之后，哪档涨幅最大？这听起来有点反直觉。

**Kobie：** 确实反直觉，但这是这次研究里我最想让人带走的一点。

一开始我们的训练集里**单表和多表问题都有**。研究员做消融实验，好奇几件事：如果只训单表会怎样？如果只训混合全集？如果做**课程学习**——先单表把模型拉起来，再逐步加多表——曲线长什么样？

结果很干脆：**只训单表的那档，涨幅最大。** 完整混合集有提升，课程学习一般，**仅单表训练拔得头筹**。这是令人惊喜的发现——你直觉会觉得多表数据对多表基准更重要，但数据告诉我们另一套故事。另一个惊讶点是：尽管单表-only 是最佳方案，模型在更难的多表基准上，性能提升百分比也类似。

更狠的在后面。虽然最佳方案是单表训练，更难的 **Finque Reasoning** 多表基准涨幅同样漂亮——从 **13.9% 跳到 26.6%**，又是大约 **翻倍**。也就是说，你在简单子集上修好了核心故障模式，**难集上的泛化跟着来了**，百分比 uplift 类似。多表问答需要更多推理才能跨表取信息，我们事先标成更难的任务——训完一样看到跳跃式增长。

这说明什么？模型挂掉，往往不是因为「多表推理不会」，而是因为**根本没用对工具**——不知道先列有哪些表，不知道读表结构，不会在报错后改 SQL。这些毛病在单表题里就能练出来、能验证。**核心故障模式修好了，改进会自动推广到更难的问题集。**

我们刻意把训练聚焦在**修复工具纪律这一步**，没有堆花哨课程，也没有靠更复杂的混合训练方案赢。现实是：模型需要学的是**如何使用工具**，还有一些伴随而来的有趣现象——对现在的情况非常有用。工具纪律，比任何别的东西都更能决定模型在特定领域能不能把任务做完。结果证明，问题不在推理本身，在工具使用——我们只专注把单步操作训到最佳，修好那个核心故障模式就够了。

对做企业智能体的人，实操含义很具体：别一上来就造最复杂的多表工作流数据集。先找**最底层的工具故障模式**，用简单子集打强化学习，可能比一口气上全集更有效。既然核心故障修好了，模型在改进方面就能泛化到其他问题集——这是我们最想让人带走的一点。

如果你在做金融分析 agent 的 eval，建议把「会不会先 list 表、读 schema、处理报错」拆成独立打分项——这和下一章要聊的评估标准是一条线上的事。单表训练能赢，不是因为简单题本身有什么魔法，是因为**故障模式足够基础、足够普遍**，修一次，到处受益。研究员自己也说，这有点反直觉，但数据就摆在那，别人也能复现。

> **金句 · Kobie**
> **中文：** 只训单表 uplift 反而最大——修好了工具纪律，多表难题跟着涨。
> **原文：** Single-table-only training was actually the one that yielded the greatest uplift.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 消融实验 | ablation study | 对比单表 / 混合 / curriculum 训练 regime |
| 单表训练 | single-table-only training | 只用简单子集训 RL，本次 uplift 最大 |
| 课程学习 | curriculum learning | 先易后难加数据；本次不如单表-only |
| 多表推理 | multi-table reasoning | Finque Reasoning 79 样本；13.9%→26.6% |
| 核心故障模式 | core failure mode | tool discipline 缺口；fix 后可泛化 |
| 泛化 | generalization | 简单子集训出的行为修复迁移到难 benchmark |

**本章小结**

- **仅单表训练** ablation 涨幅最大；课程学习和全混合集均不如
- 难多表基准同步 ~2×——泛化来自行为修复，非堆复杂训练集
- 投资顺序：**先修工具故障模式**，再考虑堆参数或加推理数据

---

## 04 Rubrics 定位行为缺口，五百美元够跑一轮 GRPO

**编者问：** 企业团队读完会觉得：道理懂了，下一步具体怎么落地？评估标准和数据生成怎么衔接？

**Kobie：** 最后一块是我们 Snorkel 研究线最近在推的——把 **评估标准**嵌进评估流程。这也是从这次工作里反推出来的方法论：你得找到**对应特定行为的真正问题**，而不只是知道「模型错了」。

很多人评估模型，只看最终结果对错：过还是不过。对强化学习来说，标量奖励够用——GRPO 就吃一个值，这是它工作的方式之一，你用它跑实际的训练循环。但**只知道「错了」不够**，你得知道**错在哪一步**——否则你不知道下一批专家数据该长什么样。

评估标准的做法是：把一次响应拆成**一系列可单独回答的子问题**——有没有先列有哪些表？表结构读对了吗？SQL 语法对吗？遇到报错有没有纠正？每条子问题单独审视，**行为缺口一目了然**。你可以在所有可能的领域里，直观地定位实际问题在哪。

然后数据投资就有方向了：标准告诉你缺的是「发现表」还是「读表结构」还是「报错处理」，你就**针对性生成那一类高质量数据**，再喂给强化学习。也就是说，你根据标准提供的更细颗粒度反馈，来决定需要哪些数据集、想用哪些数据。训练循环仍然用标量奖励跑 GRPO——算法层不变——但**数据从哪来、补哪条行为**，标准帮你做分析。

这和「性能不够就换大模型」形成对照：**先用标准定位具体行为，再决定是堆参数还是做强化学习。** 经常答案是后者，而且 **500 美元以内** 就能跑一轮有意义的实验。我们觉得这结果很有意思——**解决正确的问题**，机会确实很大。回到 Snorkel 日常：我们非常、非常、非常在意高质量——专家在环不是口号，是每条数据进训练前的硬门槛。

FINQA 环境已经开源、自包含——金融团队可以 fork 成自家评测。专家在环加验证，是 Snorkel 认为投资回报率最高的路径之一：**窄生产任务上，对的数据 + 对的行为训练，能 beat 换巨型模型。** 博客链接在我们研究文章里，伯克利 Agentica 团队合作文也有额外细节，欢迎点进去看。

给还在观望的团队一句实话：如果你已经在概念验证阶段用大模型跑通了金融分析 demo，别默认生产继续扛 2350 亿。**先用评估标准看行为链哪一步断了**，再决定是砸钱换模型，还是花五百美元训一轮 40 亿。Snorkel 研究团队最近一直在讨论：把评估标准嵌进评测流水线，是下一波数据实验室工作的主轴之一。我们对高质量非常较真——这话听起来像口号，但对想改进模型的实验室来说，是实打实的交付承诺。

我们 Conference 上时间掐得紧，没问答环节——有后续问题可以在外面聊。感谢大家的时间。

> **金句 · Kobie**
> **中文：** 找到真正出问题的那条具体行为——rubric 告诉你该生成什么数据，而不是盲目换大模型。
> **原文：** Find the specific behavior that's really the problem.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 评估标准 | rubrics | 响应拆成多条可评维度；定位 behavior gap |
| 标量奖励 | scalar reward | GRPO 仍用单一 reward 值驱动 RL |
| 行为缺口 | behavior gap | rubric 子项失败点 → 决定补哪类训练数据 |
| 针对性生成 | targeted data generation | 按 rubric 反馈产 expert 数据，非盲目扩集 |
| 开源环境 | open FINQA env | GitHub / Hugging Face Spaces 可 fork |
| 行动号召 | call to action | ~$500 GRPO run 可自托管复现 |

**本章小结**

- **Rubrics** 从 pass/fail 下沉到逐步行为诊断，指导数据生成投资
- GRPO 吃 scalar reward，但 rubric 决定「生成什么数据补哪条行为」
- 落地路径：rubric 定位 gap → expert data + verification → ~$500 RL run；FINQA 可 fork

---

## 总结：瓶颈常在 tool discipline，不在参数规模

| 维度 | 要点 |
|------|------|
| 核心判断 | 金融 tool-use 上 **4B + expert data + GRPO** 可 **pass@1 ~2× 超越 235B** |
| 失败根因 | **Tool discipline** 缺口（不 inspect 环境、hallucinate），非 reasoning 深度 |
| 训练策略 | **Single-table-only** ablation uplift 最大；行为修复可泛化到多表 |
| 评估方法 | **Rubrics** 定位 specific behavior → 针对性生成数据 |
| 成本可行性 | 单次 RL **~$500、~21h**；on-prem 小模型路径 actionable |
| 企业误区 | 「性能不够换大模型」= **大锤砸核桃**；**陶哲轩效应** 不适用窄岗位 |

### 对个人的启示

做 agent eval 或 tool-use 任务，**别只看 final answer**。检查模型有没有 **discover schema、读 error、自修正**——235B 和 4B 的分野常在这里，不在「会不会推理」。

### 对团队 / 产品的启示

1. **Rubric 先定位 behavior gap**，再决定 scale 参数还是上 RL。  
2. **Simple subset 训练** 可能 beat 复杂 curriculum——fix core tool failure first。  
3. **Expert data + verification** ROI 常高于盲目换 frontier model。  
4. **FINQA / OpenEnv** 可 fork 做自家 financial agent eval baseline。

### 仍待验证

- Pass@1 具体数值与 benchmark 划分以 Snorkel / Agentica 博客为准 `[待核实精确百分比]`  
- Coin 3 235B 是否为当时最新 checkpoint `[待核实版本号]`

> **金句 · Kobie（封底）**
> **中文：** 四十亿参数跑赢了二千三百五十亿——对的 dataset，对的 RL，窄任务上小模型能 beat giant。
> **原文：** Four billion parameter model performs better than the two hundred and thirty five billion parameter model.

---

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 05:12 | 盲目增加模型参数无法解决企业生产中的可靠性瓶颈 |
| 08:45 | 强化学习是改变模型行为而非知识储备的最佳手段 |
| 12:30 | 4B 模型通过自我纠错在金融分析任务中超越 235B 模型 |
| 15:50 | 单表任务训练产生的性能增益具有极强的泛化能力 |
| 18:15 | 利用评估标准（Rubrics）精准定位数据生成的需求 |

### 素材路径

- **ingest**：`Recastory/workspace/knowledge/B2-snorkel-rl/ingest`
- **ASR**：`Recastory/workspace/knowledge/B2-snorkel-rl/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv50592898/
- **B 站**：https://www.bilibili.com/video/BV1JvjP6XE1k/

### 相关阅读

- [[OpenAI评估团队-不再低估模型]] — eval 方法论：找 specific gap、dogfood  
- [[Databricks-企业级Agent生产实践]] — 企业三层 eval 与 behavioral 层  
- [[YC论文俱乐部-5篇论文揭示AI研究趋势]] — 研究趋势与 eval 交叉  
- [[MOC - Agent Theory and Design]] — Agent 理论总索引  

---

### 收录说明

- **视频**：[BV1JvjP6XE1k](https://www.bilibili.com/video/BV1JvjP6XE1k/)（B 站转载 Easonlee的AI笔记 × Snorkel AI Koby Crawford）  
- **嘉宾**：Koby Crawford，Snorkel AI  
- **转写**：Recastory `B2-snorkel-rl/article.md`（英文 ASR，收录时已人工整理叙事）  
- **版本**：canonical Host-Guest v3.2（2026-07-03；原讲义已合并）

