---
title: "杨植麟-Kimi K2.5研发内幕"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "multi_agent", "memory"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "multi_agent", "memory"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1AwXCBxEBk/"
description: "杨植麟GTC演讲：Muon优化器提升token效率两倍、Kimi-Linear线性注意力架构、Agent Swarms代理群范式"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/杨植麟-Kimi K2.5研发内幕.md"
source_sha256: "7afdbfe513fd20d11de1a66ebed2dc2dd1d5d3c7bfe5d65c428cbbe681ed3b4e"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1AwXCBxEBk/"
column_url: "https://www.bilibili.com/read/cv45392536/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1AwXCBxEBk/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1AwXCBxEBk/ingest"
duration: "~40 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "GTC主持人"
guest_name: "杨植麟"
guest_title: "Moonshot AI / Kimi创始人"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[杨植麟]]"
concepts:
  - id: muon_optimizer
    zh: Muon优化器
    en: Muon optimizer
    one_line: 二阶优化器通过正交化梯度更新，使模型在相同数据量下获得双倍智能增益
  - id: token_efficiency
    zh: Token效率
    en: Token efficiency
    one_line: 不是扩展数据量，而是让每个token学到更多东西
  - id: kimi_linear
    zh: Kimi-Linear架构
    en: Kimi-Linear architecture
    one_line: 线性注意力变体，细粒度衰减因子控制每个通道的记忆保留
  - id: agent_swarm
    zh: 代理群
    en: Agent Swarm
    one_line: 协调器+子代理并行协作模式，解决单代理无法处理的复杂任务
  - id: qk_clip
    zh: QK裁剪技术
    en: QK clip
    one_line: 裁剪查询和键的最大值防止训练不稳定
  - id: early_fusion
    zh: 早期融合
    en: Early fusion
    one_line: 从预训练第一天就合并视觉和文本模态，而非后期添加
  - id: attention_residual
    zh: 注意力残差
    en: Attention Residual
    one_line: 将残差连接升级为注意力机制，跨层聚合隐藏状态
---

# Token效率翻倍：Muon优化器背后的数学直觉

> 对谈：GTC主持人 × 杨植麟（Moonshot AI / Kimi创始人）| 来源：GTC 2026 | 2026年

---

## 开场：为什么现在聊这个

杨植麟在GTC 2026的演讲系统阐述了Kimi K2.5如何在三个维度实现突破：Token效率、长上下文和智能体集群。开放模型正在迅速缩小与专有前沿模型的差距，而杨植麟认为关键不在于堆数据量，而在于让每个token学到更多东西。这次演讲揭示了Moonshot AI过去一年的核心技术路径——从Muon优化器的工程落地到Agent Swarms的范式创新。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| Muon优化器 | Muon optimizer | 梯度更新正交化，每个token学到两倍 |
| Token效率 | Token efficiency | 相同数据量下学到更多智能 |
| QK裁剪 | QK clip | 防止训练爆炸的数值稳定技术 |
| Kimi-Linear | Kimi-Linear | 线性注意力+全注意力混合架构 |
| 代理群 | Agent Swarm | 多个子代理并行完成复杂任务 |
| 早期融合 | Early fusion | 视觉和文本从第一天一起训练 |
| 注意力残差 | Attention Residual | 深度维度上用注意力替代简单残差 |

---

## 01 开放模型正在接近前沿

**主持人：** 欢迎来到GTC。你认为开放模型目前处于什么水平？

**杨植麟：** 我们的一项主要追求是构建更好的开放模型，我们相信智能的民主化。有了开放模型，你可以在任何地方部署——本地服务器、云端，可以访问模型中的每一个权重，而不仅仅是使用一个黑箱。正如Jensen今年早些时候在CES上演示的，开放模型正在迅速缩小与专有模型的差距，并正在达到前沿水平。我们相信，随着开放模型做得越好，我们将使世界各地、每个角落的人们都能更容易地获得智能。但开放模型不能仅仅是开放的，它们也必须是优秀的。

> **金句 · 杨植麟**
> **中文：** 开放模型不能仅仅是开放的，它们也必须是优秀的。
> **原文：** Open models can't just be open. They also have to be great.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 智能民主化 | Democratization of intelligence | 让每个人都能获取高质量AI |
| 开放权重 | Open weights | 公开模型参数供下载使用 |
| 黑箱 | Black box | 只能调用API但看不到内部 |

**本章小结**
- 开放模型正在接近前沿水平
- 但仅有开放不够，必须同时优秀
- 智能民主化是核心追求

---

## 02 三个扩展维度：效率、上下文、代理

**主持人：** 扩展是所有AI进展的核心驱动力，你怎么看不同的扩展维度？

**杨植麟：** 我们讨论三个扩展维度。第一个是token效率——不仅是扩展训练token数量，还要提高效率，让曲线向左移动，相同数据量下实现更低损失。这可以通过优化架构和优化器实现。第二个是上下文长度——增加上下文长度可以提高模型完成更复杂任务的能力。第三个是代理数量——我们引入代理群学习范式，协调一群代理并行完成子任务。

Token效率关乎提高智能的上限。假设你有50万亿个高质量token，应用Muon优化器后token效率提高两倍，这几乎像魔法一样，你获得了相当于100万亿个token的效果。如今我们正步入数据战，高质量数据数量有限。如果数据量恒定，提高token效率意味着从中获得更好的智能。这不仅是基础设施效率的提升，更是更好的智能。

长上下文是增加运行时间更长的代理的关键，它可能运行数天、数周甚至数月来完成更多复杂任务。代理群是另一个维度——每个代理具有超长上下文，每个代理都具有非常强的先验，在完整的代理强化学习系统中进行搜索。

> **金句 · 杨植麟**
> **中文：** Token效率提高两倍，就像魔法一样——50万亿token变成100万亿的效果。
> **原文：** Doubling token efficiency is like magic — 50 trillion tokens become 100 trillion in effect.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 扩展定律 | Scaling Laws | 更多数据/参数/计算=更低损失 |
| Token效率 | Token efficiency | 让每个训练token学到更多 |
| 代理群 | Agent Swarm | 多代理并行协作完成任务 |

**本章小结**
- 三个扩展维度：token效率、上下文长度、代理数量
- Token效率不只是省钱，是提高智能上限
- 高质量数据有限，效率比数量更重要

---

## 03 Muon优化器：二阶优化的工程落地

**主持人：** Muon优化器的核心原理是什么？

**杨植麟：** 这是机器学习史上最经典的图表之一，来自Kaplan等人的研究。它说明按比例扩展训练token数量、模型参数和计算量可以获得越来越低的损失。但我们感兴趣的是token效率。Muon是一个二阶优化器，每个梯度更新以一种方式转换，使得每个条目都相互正交。这与传统的Adam优化器非常不同。如果我们正确实现这个优化器，可以获得两倍的token效率提升。我们是第一个证明Muon优化器可用于LLM训练的工作。

我们采用两个关键技术使其在大规模训练中有效。权重衰减对扩展到更大模型至关重要。我们还确保与Adam相比RMS更新保持一致——对每次更新应用可调系数，使最终RMS与Adam相当。为了在所有Nvidia GPU集群中内存高效，我们开发了分布式Muon优化器实现，将状态分配到数据并行组中。

但当我们试图扩展到万亿参数模型时，遇到了训练不稳定性问题。最大logits迅速爆炸超过1000（典型值约50）。训练出现发散——损失下降一点但最终爆炸。解决方法是QK裁剪技术：在前向传播中计算每个注意力头的最大logits，计算除法因子应用于每个键和查询投影，裁剪最大值限制在给定范围内。这是机器学习史上大规模Muon训练的第一个例子。

> **金句 · 杨植麟**
> **中文：** 这是机器学习史上大规模Muon训练的第一个例子。
> **原文：** This is the first example of large-scale Muon training in machine learning history.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Muon优化器 | Muon optimizer | 梯度正交化，每个token学到两倍 |
| QK裁剪 | QK clip | 防止查询和键值爆炸的稳定技术 |
| 分布式训练 | Distributed training | 将状态分配到多个GPU并行 |
| 权重衰减 | Weight Decay | 防止参数过大正则化技术 |

**本章小结**
- Muon通过梯度正交化实现2倍token效率
- 关键工程挑战是万亿参数下的训练稳定性
- QK裁剪解决了logits爆炸问题，不影响收敛

---

## 04 Kimi-Linear：线性注意力的记忆革命

**主持人：** Kimi-Linear架构解决了什么问题？

**杨植麟：** Transformer在整个上下文中持续改进——token索引增加，训练损失大幅下降。但LSTM在一定数量token后就饱和了。这就是Transformer成为事实架构的原因。在智能体时代，任务越来越难，需要越来越长的上下文，所以我们开发了Kimi-Linear。

Kimi-Linear包含Kimi Delta Attention——一种新型线性注意力变体，通过改进循环记忆优化原始的门控delta规则。原始线性注意力中内存是全局的，只有一个标量衰减因子。这意味着只有两种极端：要么忘记一切，要么保留几乎所有信息。我们引入细粒度衰减因子，不再是标量而是对角矩阵，控制每个通道的衰减率。某些通道衰减缓慢保留长上下文信息，其他通道快速忘记过去信息以便刷新观察新信息。

为了利用现代GPU，我们必须使用分块公式。但新引入的alpha项是矩阵而非标量，不能被轻易分解。我们将方程重写为三个方程，通过矩阵求逆运算和累积衰减因子并行实现整个过程，不牺牲效率。这不是近似值，是精确的数学等效公式。

这是第一个在所有方面都优于全注意力架构的架构，包括短上下文任务、长输入任务和长输出任务。

> **金句 · 杨植麟**
> **中文：** 这是第一个在所有方面都优于全注意力架构的架构。
> **原文：** This is the first architecture that outperforms full attention in all aspects.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 线性注意力 | Linear attention | 计算量不随序列长度增长的注意力 |
| 细粒度衰减因子 | Fine-grained decay factor | 每个通道独立控制记忆保留率 |
| 分块公式 | Chunking formula | 让线性注意力在GPU上高效并行 |
| 1:3混合比例 | 1:3 mix ratio | 线性注意力层与全注意力层的比例 |

**本章小结**
- LSTM在长上下文会饱和，Transformer能持续改进但计算昂贵
- Kimi-Linear通过细粒度衰减因子控制每个通道的记忆
- 精确数学等效的分块公式实现GPU高效并行
- 第一个全面优于全注意力的架构

---

## 05 Agent Swarms：从单体到集群

**主持人：** 代理群范式如何解决更复杂的任务？

**杨植麟：** 单代理难以应对极高复杂度的任务。我们引入协调器（Main Agent）负责协调任务，它可以选择生成一组子代理并分配任务，从子代理返回中收集结果，迭代执行。最终，与使用单个代理相比，你可以完成更复杂的任务。

这类似于人类社会——建立公司时需要不同角色，CEO分解任务分配给不同角色，整个组织朝同一目标前进。我们可能有AI研究员、Web开发人员、物理研究人员，他们研究不同主题，最终收集结果并汇总成报告。

从技术上讲，我们定义了三个新的目标函数。实例化奖励激励子代理进行实例化，防止"串行崩溃"——我们不希望系统默认只执行单个代理，尤其在训练早期阶段。完成奖励解决有些子任务被创建但从未完成的问题——系统通过生成一堆子代理来"破解"第一项奖励规则。结果奖励衡量整个任务是否最终完成。三项共同添加到强化学习系统中，都采用衰减策略：训练开始时权重较高，结束时衰减到较低水平。

这种范式可以扩展——运行包含100个甚至1000个子代理的代理群，在可容忍时间内完成复杂任务，产生真正的经济价值。我们可以在不同维度扩展：并行下载和阅读数千个来源；并行输出100页文献综述；或大规模对10个不同任务进行数据分析。

> **金句 · 杨植麟**
> **中文：** Agent Swarms就像人类社会——CEO分解任务分配给不同角色，整个组织协同完成。
> **原文：** Agent Swarms are like human society — a CEO decomposes tasks and assigns them to different roles, the whole organization collaborates.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 协调器 | Main Agent | 分配任务和收集结果的核心代理 |
| 实例化奖励 | Instantiation reward | 鼓励子代理被创建 |
| 完成奖励 | Completion reward | 确保子任务真正完成而非被跳过 |
| 串行崩溃 | Serial collapse | 系统退化为只用单个代理 |

**本章小结**
- 单代理无法处理极高复杂度，代理群是解决方案
- 三个奖励函数防止系统退化为串行模式
- 可扩展到100+子代理，产生真正经济价值

---

## 06 K2.5发布与视觉文本融合

**主持人：** K2.5的核心创新是什么？

**杨植麟：** K2.5是我们一个月前发布的新模型，它有几个关键创新。第一个是原生视觉文本联合能力——它是第一个具有这种能力的开放模型。以前的开放模型视觉能力通常在文本基础上后期添加，先训练文本模型20万亿token，再进行2万亿token后期训练添加视觉。但K2.5从第一天起就融合了视觉和文本训练过程，称为"早期融合"。我们从0%进度开始就合并视觉和文本token。

实验表明早期融合优于后期融合。如果你想实现"视觉到代码"，必须将视觉和文本合并到统一模型中，分开就不可能。更有趣的发现是两种模态可以相互增强——长期挑战是添加视觉能力往往损害文本性能，但如果训练得当，两种模态可以互补。视觉改善了文本任务——只使用视觉RL（不涉及文本任务）甚至提高了处理繁重文本任务的性能。文本也改善了视觉——强大文本基础下不需要任何视觉SFT数据就能在视觉任务上实现接近最先进的性能。

训练曲线是我见过的最美丽的曲线之一。超过15万亿个token训练，整个过程非常稳定，没有出现损失峰值。特别是引入Muon优化器时没有观察到任何峰值。这种平稳稳定的训练产生了非常强大的基础模型。

> **金句 · 杨植麟**
> **中文：** 这是我一生中见过的最美丽的训练曲线——15万亿token训练零损失峰值。
> **原文：** This is the most beautiful training curve I've ever seen — 15 trillion tokens, zero loss spikes.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 早期融合 | Early fusion | 视觉和文本从第一天一起训练 |
| 后期融合 | Late fusion | 先训练文本再添加视觉能力 |
| 视觉到代码 | Visual to code | 看视频然后生成复制它的网站 |
| 零视觉SFT | Zero visual SFT | 不需要专门视觉微调数据 |

**本章小结**
- K2.5是第一个原生视觉文本联合的开放模型
- 早期融合优于后期融合，两种模态互补增强
- 15万亿token训练零损失峰值，证明架构稳定性

---

## 07 注意力残差：下一代架构

**主持人：** 注意力残差（Attention Residual）预示了什么？

**杨植麟：** 2016年何恺明在ICML演讲中介绍ResNet——在ResNet出现之前没人能训练极深的网络。残差连接本质上是LSTM的变体，"旋转了90度"——从上一步获取隐藏状态通过门控机制生成当前状态，在深度维度上残差连接是一样的，只是公式不同。

我们可以考虑在深度维度中使用注意力机制。注意力机制在Transformer时代已被证明非常成功。我们不仅获取上一个隐藏状态，而是考虑之前所有的隐藏状态，用注意力操作组合聚合这些状态来计算当前状态。这就是"旋转了90度"的注意力——残差连接在LSTM类比中的自然泛化。

为了提高效率，我们设计了块注意力残差——将所有层分成多个块（如每块16层），在每个块输出端应用注意力残差，但块内部仍采用标准残差。这大大减少开销，训练精度损失微乎其微。

结果令人印象深刻：token效率提高24%。50万亿token变成超过60万亿token的效果。在GPQA、Math和HumanEval基准测试中，编码、数学和推理密集型任务取得显著改进。

> **金句 · 杨植麟**
> **中文：** 如果把所有增益结合起来——Muon替代Adam、Kimi-Linear替代全注意力、注意力残差替代标准残差——我们得到一个更好的模型。
> **原文：** If we combine all gains — Muon replacing Adam, Kimi-Linear replacing full attention, Attention Residual replacing standard residual — we get a better model.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 注意力残差 | Attention Residual | 深度维度上用注意力聚合所有层 |
| 块注意力残差 | Block Attention Residual | 每隔几层才做一次注意力聚合 |
| 残差连接 | Residual connection | 跳跃连接防止梯度消失 |

**本章小结**
- 残差连接本质是旋转90度的LSTM，可以用注意力替代
- 块注意力残差降低开销同时保持精度
- token效率提升24%，在数学和编码任务上效果显著

---

## 总结：三个维度，一个目标

| 维度 | 要点 |
|------|------|
| Token效率 | Muon优化器使每个token学到两倍，QK裁剪解决万亿参数稳定性 |
| 长上下文 | Kimi-Linear细粒度衰减控制每个通道记忆，1:3混合优于全注意力 |
| 代理群 | 三个奖励函数防止串行崩溃，可扩展到100+子代理并行 |
| 视觉融合 | 早期融合优于后期融合，两种模态互补增强 |
| 下一代架构 | 注意力残差token效率提升24%，三项技术叠加产生更好模型 |

> **金句 · 杨植麟（封底）**
> **中文：** 我们将从不同维度扩展模型，Agent Swarms并非终点——我们很高兴与开源社区一起实现更高水平的智能。
> **原文：** We'll continue expanding our models across different dimensions. Agent Swarms aren't the endpoint — we're excited to work with the open-source community to achieve higher levels of intelligence.

---

## 附录

**章节时间戳**
- 00:00 开场与开放模型愿景
- 03:45 Token效率与Muon优化器
- 08:12 Kimi-Linear长上下文架构
- 13:50 Agent Swarms代理群范式
- 20:15 原生视觉文本早期融合
- 26:40 注意力残差下一代架构
- 32:00 总结与未来展望

**Ingest 信息**
- column_source: Recastory/workspace/bilibili-retranscribe/BV1AwXCBxEBk/ingest/column_article.md
- asr_status: asr_ready

**相关阅读**
- [[MOC - Harness Engineering]] — 模型架构与工程实践
- [[MOC - Agent Theory and Design]] — Agent时代总入口
- [[Lex Fridman-2026年AI现状与展望]] — 开源模型竞争格局
