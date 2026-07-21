---
title: "arc创始人：只靠 Scaling Law 到不了 AGI"
tags: ["ai_agent", "ai_coding", "ai_safety", "video_transcript", "bilibili"]
legacy_tags: ["ai_agent", "ai_coding", "ai_safety", "video_transcript", "bilibili"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1tSDtBnE2k/"
description: "Keras 创始人、Endia 实验室负责人 François Chollet 深入探讨 AGI 的本质定义及当前深度学习路径的局限性：仅靠 Scaling Law 无法实现真正的流体智能；程序合成与符号下降是新范式；AGI 核心引擎可能不到一万行代码。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/arc创始人-只靠Scaling Law到不了AGI.md"
source_sha256: "b888d59db7a6c3c0669ab1470435b96f2f33c8b04949ea3500fc17cf3e127961"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1tSDtBnE2k/"
column_url: "https://www.bilibili.com/read/cv44836072/"
column_source: "Easonlee的AI笔记"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1tSDtBnE2k/ingest"
duration: "55:40"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
host_name: "LCA（Latent Space 播客）"
guest_name: "François Chollet"
guest_title: "Keras 创始人、Endia 实验室负责人、ARC-AGI 创始人"
speaker_inference: "column_article + video_description + distill"
speaker_confidence: high
author:
  - "[[François Chollet]]"
concepts:
  - id: fluid_intelligence
    zh: 流体智能
    en: fluid intelligence
    one_line: 面对全新问题时高效探索和学习的能力，而非记忆已知模式
  - id: symbolic_descent
    zh: 符号下降
    en: symbolic descent
    one_line: 用符号模型替代参数曲线，在符号空间中搜索最简洁解释
  - id: verifiable_reward
    zh: 可验证奖励
    en: verifiable reward
    one_line: 代码和数学等有正式验证环境的领域，AI 可通过试错获得真实反馈
  - id: skill_acquisition_efficiency
    zh: 技能获取效率
    en: skill acquisition efficiency
    one_line: AGI 的核心衡量标准——以人类水平的效率掌握新领域的能力
---

# arc创始人：只靠 Scaling Law 到不了 AGI

**Host：** LCA（Latent Space 播客）  
**Guest：** François Chollet（Keras 创始人、Endia 实验室负责人、ARC-AGI 创始人）  
**形态：** Host-Guest canonical v3.2  
**B 站：** [BV1tSDtBnE2k](https://www.bilibili.com/video/BV1tSDtBnE2k/) · **时长** ~55 min

---

## 开场

François Chollet——Keras 的创建者、ARC-AGI 的发起人——坐下来和 LCA 深度对话，对当前 LLM 堆栈提出了最根本的质疑：**梯度下降无法找到可泛化的程序**。他正在用"符号下降"替代梯度下降，用最简洁的符号模型解释数据。ARC-AGI v3 转向衡量代理智能——在迷你视频游戏中高效探索和自主设定目标。他的预测：**AGI 的核心引擎可能不到一万行代码，80 年代的计算机就能运行。**

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 流体智能 | fluid intelligence | 面对全新问题时高效探索和学习的能力 |
| 符号下降 | symbolic descent | 在符号空间中搜索最简洁的解释模型 |
| 可验证奖励 | verifiable reward | 代码/数学等有正式验证的信号 |
| 技能获取效率 | skill acquisition efficiency | AGI 的核心衡量标准 |
| 参数曲线拟合 | parameter curve fitting | 深度学习的本质——用梯度下降拟合参数 |
| 符号压缩 | symbolic compression | 科学的本质——将海量观测压缩为简洁规则 |
| 最小描述长度 | minimum description length | 最短的模型最可能泛化 |
| 复合改进 | compound improvement | 系统能力提升时提升速度也在加快 |

---

## 01 深度学习的本质：参数曲线拟合，不是科学发现

**Host：** Endia 到底是什么？你们想实现什么？

**François Chollet：** 我们正在尝试建立一个全新的机器学习分支，它将比深度学习更接近"最优"。在深度学习中，你的模型是一个参数曲线，你试图通过梯度下降来拟合曲线的参数。我们用一个符号模型替换了参数曲线——用最简洁的模型来解释数据。

**问题不在于深度学习不完整，问题在于梯度下降。梯度下降无法找到可泛化的程序，它反而会过度拟合输入令牌序列上的模式匹配。** 最小描述 length 原则认为，最有可能泛化的数据模型是最短的。科学从根本上说是一个符号压缩过程——你观察海量的观测数据，然后将其压缩成一个非常简单的符号规则。

> **金句 · François Chollet**
> **中文：** 梯度下降无法找到可泛化的程序——它只会过度拟合输入序列上的模式匹配。
> **原文：** Gradient descent cannot find generalizable programs — it just overfits to pattern matching on input token sequences.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 参数学习 | parameter learning | 深度学习的核心——拟合曲线参数 |
| 符号模型 | symbolic model | 最简洁的规则解释数据 |
| 科学压缩 | scientific compression | 将观测简化为方程的过程 |

**本章小结**

- 深度学习是曲线拟合，不是科学发现
- 梯度下降无法找到泛化程序
- 科学 = 符号压缩，AI 也应该如此

---

## 02 编码代理的成功：可验证奖励而非智力飞跃

**Host：** 编码代理的成功是否让你感到惊讶？

**François Chollet：** 编码代理运行得如此顺畅，是因为代码提供了**可验证的奖励信号**。任何问题，只要你提出的解决方案可以被正式验证，并且你可以信任那个奖励信号，那么任何这样的领域，都可以用当前的技术实现完全自动化。

**代码是第一个"沦陷"的领域，但未来还会有很多其他领域。** 对于撰写论文这类不可验证的领域，推理模型的进展会非常缓慢，甚至可能停滞不前。模型并没有更高的流体智能，或者说智商没有变高，只是它们训练得更好了——通过试错法在具有真实奖励信号的环境中训练。

> **金句 · François Chollet**
> **中文：** 代码沦陷了，因为它是可验证的；写论文不会沦陷，因为它不可验证。
> **原文：** Code fell because it's verifiable; essay writing won't fall because it's not.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 可验证奖励 | verifiable reward | 有正式验证环境的信号 |
| 后训练范式 | post-training paradigm | 在可验证环境中强化学习 |
| 智力 vs 知识 | intelligence vs knowledge | 更好的训练可以弥补智力不足 |

**本章小结**

- 编码代理的成功来自可验证奖励，不是智力提升
- 不可验证领域（写作）的 LLM 进展将停滞
- 模型没变聪明，但变得更有用了

---

## 03 AGI 的定义：技能获取的样本效率

**Host：** 你如何定义 AGI？

**François Chollet：** 行业里很多人说 AGI 是能自动化大多数经济任务的系统。对我来说，这个定义是关于"自动化"，不是关于"智能"。我的定义是：**AGI 是一个能够处理任何新问题、新任务、新领域，并能理解、建模、熟练掌握它，且效率与人类相当的系统。**

它需要与人类相当的训练数据量和训练算力。由于人类的学习效率非常高，所以通用智能就是在人类可能学习的任务范围内，达到人类水平的技能获取效率。ARC-AGI V1 和 V2 测试的就是这种能力——结果是：**将模型规模扩大五万倍，若不引入推理机制，也无法解决从未见过的简单逻辑任务。**

> **金句 · François Chollet**
> **中文：** AGI 的核心不是能做什么，而是学新东西的效率——你用多少数据掌握一个新领域？
> **原文：** AGI isn't about what you can do — it's about how efficiently you can learn a new domain.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自动化定义 | automation definition | 行业流行的 AGI 定义（经济任务） |
| 智能定义 | intelligence definition | Chollet 的 AGI 定义（学习效率） |
| Scaling Law 天花板 | scaling law ceiling | 5万倍规模扩大仍无法突破的证据 |

**本章小结**

- AGI 不是"能自动化什么"，而是"学新东西多快"
- Scaling Law 有天花板：规模扩大 5 万倍仍不行
- 流体智能 ≠ 训练数据和算力的堆叠

---

## 04 ARC-AGI v3：衡量代理智能

**Host：** V3 将衡量什么？

**François Chollet：** V1 和 V2 关注的是根据给定模式生成因果模型的能力——数据是现成提供给你的，是静态、被动的。**V3 完全不同，我们正在尝试衡量"代理智能"。**

它是交互式的、主动的，数据不是直接给你的，你必须自己去获取。你的代理会被投入到一个全新的环境中，就像一个迷你视频游戏。它得不到任何指示，没人告诉它该做什么，甚至连目标或控制方式都不知道。它必须通过试错法自己弄清楚一切。**我们不仅在衡量建模能力，还在关注探索效率、自主获取目标的能力，以及通过环境模型进行规划并执行的能力。**

我们知道 V3 中的所有测试环境都可以由未经培训的人类解决——人类非常擅长高效探索和理解新事物。而当今的前沿模型在这些任务上表现并不好。

> **金句 · François Chollet**
> **中文：** V3 衡量的不是你见过什么，而是你第一次见到新东西时多快能搞懂——这才是流体智能。
> **原文：** V3 measures not what you've seen, but how quickly you figure out something new — that's fluid intelligence.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理智能 | agentic intelligence | 探索、目标设定、规划的综合能力 |
| 流体智能测试 | fluid intelligence test | 从未见过的全新环境 |
| 效率评分 | efficiency score | 每一步探索都计入效率 |

**本章小结**

- V3 从被动建模转向主动探索
- 在全新迷你游戏中衡量流体智能
- 抗针对优化：私有环境与公共环境显著不同

---

## 05 AGI 引擎：不到一万行代码

**Host：** 如果存在一个理想的模型来实现 AGI，它能装进一张软盘里吗？

**François Chollet：** 有两种东西要分开看。**流体智能引擎，它会是一个非常小的代码库，配合一套非常小的模型——可能只有几兆字节。** 然后是知识库，它分层在流体智能引擎之下，会占用更多空间。

我确实相信，当你回过头来看 AGI 时，会发现它是一个代码行数少于 10,000 行的代码库。如果你在 1980 年代就知道它，当时就可以利用那时的计算机资源实现 AGI。真正的挑战在于如何构建这个能自我改进、且改进速度随能力复合增长的系统。**AGI 不应依赖人类持续喂养数据，而应像科学方法论一样自动进行符号压缩。**

> **金句 · François Chollet**
> **中文：** AGI 的核心引擎可能不到一万行代码——事后看来，它可能在我们眼皮底下隐藏了 40 年。
> **原文：** The core engine of AGI might be under 10,000 lines of code — in hindsight, it may have been hiding in plain sight for 40 years.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 流体智能引擎 | fluid intelligence engine | 核心代码库，极其简洁 |
| 知识库 | knowledge base | 分层在引擎之下的数据 |
| 复合改进 | compound improvement | 系统能力提升时提升速度也在加快 |

**本章小结**

- AGI 核心引擎极其小巧，可能不到一万行代码
- 真正挑战是构建自我改进且复合增长的系统
- 知识库与流体智能引擎需要分开

---

## 06 避开共识陷阱：探索非主流路径

**Host：** 还有其他你认为有前景但自己没时间探索的方法吗？

**François Chollet：** 如果每个人都在做同样的事情，你就会抛弃那些实际上非常有前途的想法。大约 20 年前，我们也曾坍缩到支持向量机这一种方法上。在 90 年代，神经网络被认为是一种失败的方法。

如果你将同样规模的投资投入到遗传算法、状态空间模型或符号学习等"非主流"路径，你也同样会看到极其令人兴奋的结果。**你希望从一开始就将递归自我改进融入其中，将人类从改进循环中移除。** 你不希望系统的每一次能力提升都需要人类工程师介入。我们想要的是一个自我改进、且改进是复合的系统。

如果你有一个宏大的想法，虽然成功的机会很低，但如果成功了意义将是巨大的，而且如果没有你，没有人会去做——**那就值得去做。**

> **金句 · François Chollet**
> **中文：** 如果你不做，可能就没人做了——这通常不是一件受欢迎的事情，但如果你处于这种境地，你就应该去做。
> **原文：** If you don't do it, no one else will — it's usually not a popular thing, but if you're in that position, you should go for it.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 共识陷阱 | consensus trap | 全行业只做一种方法导致机会浪费 |
| 改进曲线解耦 | decouple improvement from humans | 系统自我改进不依赖人类工程师 |
| 复合堆栈 | compound stack | 可重用基础层层叠加 |

**本章小结**

- 全行业只做 LLM 堆栈是适得其反的
- 遗传算法、状态空间模型等值得探索
- 关键是将人类从改进循环中移除

---

## 总结

| 维度 | 要点 |
|------|------|
| 本质 | 深度学习是曲线拟合，不是科学发现 |
| 局限 | 梯度下降无法找到泛化程序 |
| 衡量 | AGI = 技能获取的样本效率，不是自动化经济任务 |
| v3 | 代理智能：在全新环境中高效探索和自主设定目标 |
| 引擎 | 核心代码可能不到一万行，80 年代计算机就能运行 |
| 路径 | 避开共识陷阱，探索符号下降等非主流路径 |

> **金句 · François Chollet（封底）**
> **中文：** 科学是符号压缩——将海量观测压缩为简洁规则。AI 的未来不是更大的参数曲线，而是更小、更优雅的符号模型。
> **原文：** Science is symbolic compression — reducing vast observations into concise rules. The future of AI isn't bigger parameter curves, but smaller, more elegant symbolic models.

---

## 概念索引

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| fluid_intelligence | 流体智能 | fluid intelligence | 面对全新问题时高效学习的能力 |
| symbolic_descent | 符号下降 | symbolic descent | 在符号空间中搜索最简洁解释 |
| verifiable_reward | 可验证奖励 | verifiable reward | 代码/数学等有正式验证的信号 |
| skill_acquisition_efficiency | 技能获取效率 | skill acquisition efficiency | AGI 的核心衡量标准 |

---

## 附录

### 章节时间戳（B 站简介）

| 时间 | 主题 |
|------|------|
| 06:42 | 深度学习的本质是参数曲线拟合 |
| 12:15 | 编码代理的成功源于可验证奖励 |
| 15:30 | AGI 的核心衡量标准是技能获取效率 |
| 26:18 | ARC-AGI v3 转向代理智能 |
| 36:45 | AGI 核心引擎可能不到一万行代码 |
| 45:12 | 避开共识陷阱是实现突破的唯一路径 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1tSDtBnE2k/ingest`
- **column_article**：`column_article.md`
- **B 站**：[BV1tSDtBnE2k](https://www.bilibili.com/video/BV1tSDtBnE2k/)
- **时长**：~55 min

### 相关阅读

- [[DeepMind CEO-AGI倒计时2030年见分晓]] — AGI 时间线的另一种视角  
- [[DeepMind CEO-为什么AGI比工业革命大10倍]] — AGI 影响力论述  
- [[Anthropic联创-AI影响比工业革命大10倍快10倍]] — Anthropic 视角  
- [[MOC - Agent Theory and Design]] — Agent 理论索引  
- [[MOC - Harness Engineering]] — Harness 工程横切  
