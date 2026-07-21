---
title: "马斯克：xAI内部复盘与规划"
tags: ["ai_agent", "video_transcript", "bilibili"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "xai", "grok", "coding_ai", "video_generation", "orbital_computing"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1LvZTBREby/"
description: "xAI全体会议：两年半崛起历程、Grok核心模型、编码递归自改进、Imagine图像视频、Macro Hard数字模拟、X平台整合与太空计算愿景"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/马斯克-xAI内部复盘与规划.md"
source_sha256: "e91ffe0c0d9e7e406a8e85f56273ee22e6fef408c78d0b63efc408df48ee501c"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1LvZTBREby/"
column_url: "https://www.bilibili.com/read/cv45886875/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1LvZTBREby/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1LvZTBREby/ingest"
duration: "~60 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "xAI Internal Host"
guest_name: "Elon Musk"
guest_title: "CEO of xAI, Tesla, SpaceX"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Elon Musk]]"
concepts:
  - id: recursive_self_improvement
    zh: 递归自改进
    en: Recursive Self-Improvement
    one_line: 当前一代Grok代码训练下一代Grok代码，实现指数级生产力提升
  - id: macro_hard
    zh: Macro Hard
    en: Macro Hard
    one_line: 构建功能齐全的数字实时人类模拟器，可完全复制产出为数字化的公司
  - id: imagine
    zh: Imagine图像视频生成
    en: Imagine Image/Video Generation
    one_line: xAI图像视频生成系统，六个月内从零做到超越所有竞争对手总和
  - id: grokopedia
    zh: Grokopedia
    en: Grokopedia
    one_line: 目标成为《银河百科全书》，在全面性、准确性上远超维基百科
---

# 马斯克：xAI的速度无人能望其项背，Macro Hard将模拟整个数字公司

> 对谈：xAI Internal Host × Elon Musk（xAI/Tesla/SpaceX CEO）| 来源：xAI全体会议 | 2026

---

## 开场：为什么现在聊这个

xAI成立仅两年半，但已经在语音、图像、视频生成和预测领域超越了成立更久的竞争对手。这是一场xAI内部全体会议，马斯克带领四个产品线负责人逐一展示进展：Grok主模型、编码递归自改进、Imagine图像视频生成、Macro Hard数字模拟器，以及X平台整合和SpaceX太空计算愿景。整场会议的核心信息只有一个：速度和加速度才是竞争力，而xAI比任何公司都快。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 递归自改进 | Recursive Self-Improvement | AI训练AI，一代比一代强 |
| Macro Hard | Macro Hard | 用AI模拟整个公司的运作，产出和真人一样 |
| Imagine | Imagine | xAI的图像视频生成系统 |
| Grokopedia | Grokopedia | AI版维基百科，目标是《银河百科全书》 |
| 质量驱动器 | Mass Driver | 用电磁力把卫星射入轨道的装置，不用火箭 |
| 轨道数据中心 | Orbital Data Center | 放在太空中的AI训练设施 |
| PUE | PUE (Power Usage Effectiveness) | 电力使用效率，越低越节能 |
| H100 | H100 | 英伟达的高性能AI训练GPU |

---

## 01 两年半从零到第一：速度就是竞争力

**主持人A：** 欢迎来到xAI全体会议。我们将回顾xAI团队在短短两年半时间里取得的惊人进展。请记住xAI才成立两年半，基本上还是个蹒跚学步的孩子，但我们却在很短的时间内取得了令人难以置信的成就。我们的竞争对手有的成立了5年、10年，甚至有些长达20年。他们拥有更大的团队，起步时资源也多得多，但即便如此，我们仍在短短几年内在许多领域取得了第一。

**Elon Musk（或团队代表）：** 我们在语音、图像和视频生成方面都取得了第一。根据最新数据，我们现在生成的图像和视频数量，实际上已经超过了所有竞争对手的总和。我们在预测方面也取得了胜利，Grok 420预测模型在预测方面击败了所有其他AI。

我们是第一个实现10万小时H100 GPU训练集群的公司，现在我们即将实现第一个100万H100 GPU等效训练。在很短的时间内完成了如此大量的工作，真是令人难以置信。对于任何科技公司的竞争力而言，重要的是你的速度和加速度，而不是在任何特定时间点所处的位置。如果你在任何特定技术领域都比其他人移动得更快，你就会成为领导者。而xAI的速度比任何其他公司都快，没人能望其项背。

我们的竞争对手在2024年9月推出了可以与之对话的先进语音模式产品，而我们当时什么都没有。在那之后，我们从零开始，在短短六个月内内部开发了模型，并在六个月内推出了超越OpenAI的产品。快进六个月，现在Grok已经搭载在超过200万辆特斯拉汽车上。在一年之内，我们从一无所有发展成为行业领导者。这种事情只有在像xAI这样的地方才可能发生。

我们有小团队，专注使命，拥有大量计算资源。我们预计，在接下来的几个月里，所有知识工作者能够产出的工作量将增加十倍。

> **金句 · xAI团队**
> **中文：** 对于任何科技公司的竞争力而言，重要的是你的速度和加速度，而不是在任何特定时间点所处的位置。
> **原文：** For any tech company's competitiveness, what matters is your speed and acceleration, not where you are at any specific point in time.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 速度与加速度 | Speed and Acceleration | 比当前位置更重要的是迭代速度 |
| 10万H100集群 | 100K H100 Cluster | 全球首个10万张H100 GPU训练集群 |
| 100万H100等效 | 1M H100 Equivalent | 即将达成的下一代算力里程碑 |

**本章小结**
- xAI用两年半走完了对手5-20年的路，核心竞争力是速度和加速度——不是拥有多少资源，而是多快能把资源转化为能力。

---

## 02 编码的递归自改进：AI训练AI的指数级增长

**主持人A：** 随着公司发展壮大，公司主要分为四个应用领域：Grok主模型和语音、编码、图像和视频（Imagine）、Macro Hard。然后还有基础设施层。

**Macro（编码负责人）：** 最近在编码方面世界发生了很大变化。我总是抱怨人们试图说服我使用编码模型，当时试用了一下，但并没有真正被说服。但最近这些模型确实能生成质量不错、合格的代码。你仍然需要审查并提供反馈，但很容易看出它们能大大加速你的工作。现在当我描述一个问题时，我只需要像对一个已经看过代码库的同事工程师那样措辞，这是一个巨大的变化。以前你就像牵着一个蹒跚学步的孩子才能做出改变。

它们不仅能编写你的代码，还能调试你的代码。现在我们让Grok代码连续运行数小时，以确保对训练系统更复杂的更改在生产环境中实际有效。我们很容易看到，这不仅是关于加速我们自己、编写代码并使我们的生产力提高十倍，我们更是在递归自改进的道路上——当前一代的Grok代码正在训练下一代的Grok代码。我们看到这条指数级增长的道路，这条道路将继续下去。因此我们正在加倍投入编码工作，使其成为公司最高优先级的任务之一。

**Godon（编码合作者）：** 对我们来说越来越明显的是，我们一直走在通往奇点的道路上，至少在代码方面是这样。所以我们决定让公司里最优秀的工程师Macro来领导编码工作，我们将为所有人构建最好的编码模型。主要的限制因素可能是计算和能源。现在与SpaceX，我们是一个团队，我们将在计算方面取得胜利。如果你正在编写内核、编写编译器，请思考一下这是否仍然值得。也许你应该加入我们的编码工作，让自己自动化一点，加快速度。我已经能感受到AGI，至少在编码方面能感受到AGI。

**Elon Musk（或团队代表）：** 我认为实际上到今年年底，情况可能会发展到你甚至不需要费心去编码的地步。AI可以直接创建二进制文件，而且AI可以创建比任何编译器都更高效的二进制文件。你只需说为这个特定结果创建优化过的二进制文件，你甚至可以绕过传统的编码过程。这是一个中间步骤，到今年年底可能就不再需要了。我们确实预计Grok代码将在两到三个月内达到最先进水平。

> **金句 · xAI团队**
> **中文：** 当前一代的Grok代码正在训练下一代Grok代码——我们看到了指数级增长的道路。
> **原文：** Current generation Grok code is training the next generation of Grok code — we see the path of exponential growth.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 递归自改进 | Recursive Self-Improvement | AI自己生成训练数据来训练下一代AI |
| 编码奇点 | Coding Singularity | AI在编码能力上超越人类并自我加速的临界点 |
| 二进制直出 | Direct Binary Generation | AI跳过源代码，直接生成优化的机器码 |

**本章小结**
- 编码是xAI最高优先级；递归自改进（AI训练AI）正在发生，Grok代码两三个月内将达最先进水平；年底可能直接跳过编码生成二进制文件。

---

## 03 Imagine：六个月从零到图像视频生成量超越所有对手总和

**Imagine团队负责人：** 大家好，随着我们不断扩展模型能力，构建与现实无异的视觉世界，我们也在构建能够解锁比现在更多可能性的系统。我们的Imagine团队大约六个月前几乎是从零开始的，我们决定必须做图像生成，也会做视频生成。

看看我们今天取得了什么成就——两周前我们发布了Imagine V1，我们在许多排行榜上名列前茅。我们的增长速度非常非常快，这得益于我们迭代的速度。我们每天进行多次产品更新，每隔一周进行模型更新。这导致现在用户每天使用Imagine生成近5000万个视频。据我们所知，这比所有其他提供商的总和还要多。在过去的30天里，我们还生成了60亿张图片。谷歌最近发布说在30天内生成了10亿张图片，所以他们是我们的六分之一。

**Hatin（Imagine视频负责人）：** 随着我们不断扩展模型能力，我们正在构建能够解锁更多可能性的系统。它们将能够生成比我们现在更长的视频，带有故事或你想象中的灵魂。到今年年底，我们很可能会拥有能够让你一次性生成10分钟或20分钟视频的模型，无需任何干预。你只需要发挥你的想象力，我们的模型和代理就会为你完成。此外，我们还将允许实时渲染这些视频。我们已经是视频生成速度最快的，我们将继续挑战极限，实时渲染这些视频，你将能够想象、构建并与你自己的世界互动，世界将实时回应你。

**Elon Musk（或团队代表）：** 我的预测是，大部分AI计算将用于实时视频理解和实时视频生成。我们期望成为这方面的领导者。值得强调的是，六个月前我们在这方面几乎一无所有，但在六个月内跃居第一，生成的视频和图像比其他所有公司加起来还要多。Imagine的目标是把你所能想象的一切变成现实。

> **金句 · xAI团队**
> **中文：** Imagine的目标是把你所能想象的一切变成现实。
> **原文：** Imagine's goal is to turn everything you can imagine into reality.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 扩散模型 | Diffusion Model | 从噪声中逐步还原图像的AI模型 |
| 实时渲染 | Real-time Rendering | 视频生成速度快到可以即时播放 |
| 10-20分钟视频 | 10-20 min Video | 年底目标：一次性生成10-20分钟完整视频 |

**本章小结**
- Imagine六个月从零做到日生成5000万视频、月60亿张图片，超越所有对手总和；年底目标是10-20分钟视频实时生成，内容产业面临革命。

---

## 04 Macro Hard：用AI模拟整个数字公司

**Toby（Macro Hard负责人）：** 大家好，我负责Macro Hard，这是所有产品名称中最严肃的一个。把电脑交给人类是个好主意，所以我们正在为AI做同样的事情。这有点像《盗梦空间》，我们正在把电脑交给电脑。Macro Hard正在构建一个功能齐全的数字实时人类模拟器。它能够在计算机上完成人类所能做的一切，包括使用工程和医学领域的先进工具。所以应该会有完全由AI设计的火箭发动机。从某种意义上说，这是AI在某些方面明显不如人类的少数几个剩余领域之一，这也是为什么我认为它是最令人兴奋的领域之一。

**John（Macro Hard推理负责人）：** 我们正在构建这些强大的推理模型，它们现在将控制我们的命令行界面。我们每天都在积极使用这些模型，它们对整个团队来说是巨大的生产力提升。但世界上80%到95%的软件都有图形用户界面，所以为了真正让人们的生活更轻松，我们需要开发能够解决图形界面上日常任务的模型。Macro Hard将模拟一家公司，其产出是数字化的。这是代理的下一个明显步骤。Macro Hard将实现桌面上的真正端到端编排，并将带来巨大的经济繁荣。

我们正在进入一个需要解决最棘手技术问题的时代，但为了解决这个问题我们需要招聘最优秀的人才。想想你合作过的最聪明的人，并推荐他们来这里工作。我们需要优化三个特性：他们聪明吗？能解决难题吗？他们有动力吗？有抱负吗？想赢吗？他们是好人吗？你真的想和他们一起工作吗？

**Elon Musk（或团队代表）：** 当你看到世界上最有价值的公司时，它们的产出是数字化的，它们实际上不制造硬件。因此完全模拟任何产出是数字化的公司应该是可行的，这将开启一个我们目前难以想象的繁荣时代。苹果并不制造硬件——他们设计硬件，然后将设计方案送到台湾或中国。英伟达也是如此，他们设计芯片，但不制造任何东西。理论上如果Macro Hard成功，它可以复制像苹果、英伟达、微软、谷歌这样的公司。大多数公司的产出都是数字化的。未来Macro Hard将拥有一家专门设计火箭的公司，另一家设计AI芯片，另一家从事物理研究，还有客户服务。Macro Hard项目随着时间的推移，可能会成为我们最重要的项目。

> **金句 · xAI团队**
> **中文：** Macro Hard正在构建一个功能齐全的数字实时人类模拟器——把电脑交给电脑。
> **原文：** Macro Hard is building a fully functional digital real-time human simulator — giving the computer to the computer.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Macro Hard | Macro Hard | 用AI模拟整个公司的运作 |
| 数字人类模拟器 | Digital Human Simulator | AI能在电脑上完成人类能做的一切工作 |
| 端到端编排 | End-to-End Orchestration | AI在桌面环境中自动完成完整工作流 |

**本章小结**
- Macro Hard是xAI最重要的项目——用AI模拟整个数字公司；苹果和英伟达的设计产出都是数字化的，理论上都可以被AI模拟，这将开启难以想象的经济繁荣。

---

## 05 X平台与太空计算：从社交到星辰大海

**Nikita（X平台负责人）：** 我们的应用家族覆盖了超过十亿人。每次新闻爆发都清楚地表明这是我们时代最重要的沟通工具。首次下载量每月增长超过50%，新用户现在每天在应用中花费的时间比六个月前增加了55%。我们重建了算法、通知、网页浏览器、X聊天——应用的每个界面都经过重建。文章发布量增长了10倍，文章阅读量增长了17倍。我们刚刚在订阅服务中实现了超过10亿美元的年度经常性收入。

我们已经将旧的Twitter私信系统发展成一个完全加密的消息系统，允许音频和视频通话，拥有阅后即焚消息、截图阻止。我们将在未来几个月内开源其代码。Grok聊天也将是开源的。我们将在未来几个月内发布一款独立的X Chat应用。我们已经在公司内部进行了X Money的封闭测试，预计未来一两个月将推出有限的外部测试版，然后向所有X用户全球发布。X Money旨在成为所有资金的中心，所有金融交易的来源。这将彻底改变游戏规则。

**太空计算团队：** 为了理解宇宙，你必须探索宇宙。仅仅在地球上使用望远镜和对撞机，你所能学到的东西是有限的。这就是SpaceX和xAI结合的动机，旨在加速人类理解宇宙的未来，并将意识之光延伸到星辰。

从宏观来看，当我们审视地球文明实际使用的能量时，我们目前只使用了地球潜在能量的大约1%。如果我们想使用太阳能量的百万分之一，那也大约是文明目前使用能量的百万倍。获取那种能量的唯一方法就是超越地球。超越地球数据中心的下一步是我们的地球轨道数据中心。我们将与SpaceX合作，每年发射100到200吉瓦的轨道数据中心，不是累计，是每年。最终我们看到一条道路，每年从地球发射高达1太瓦的计算能力。

但如果你想超越每年区区1太瓦呢？你必须去月球。通过在月球上建立工厂，建造AI卫星，并拥有一个质量驱动器——这是一种你通常只在科幻小说中读到的东西，但我们将把它变为现实。可以将规模扩大几个数量级，每年达到一千吉瓦甚至更多。很难想象那种规模的智能会思考什么，但看到它发生将是令人难以置信的兴奋。

> **金句 · xAI团队**
> **中文：** SpaceX和xAI结合的动机，是加速人类理解宇宙的未来，并将意识之光延伸到星辰。
> **原文：** The motivation for combining SpaceX and xAI is to accelerate humanity's understanding of the universe and extend the light of consciousness to the stars.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| X Money | X Money | X平台的金融系统，目标是所有资金的中心 |
| 轨道数据中心 | Orbital Data Center | 放在地球轨道上的AI训练设施 |
| 质量驱动器 | Mass Driver | 月球上的电磁发射装置，把卫星射入轨道 |
| 意识之光 | Light of Consciousness | 马斯克对人类智能向宇宙扩展的比喻 |

**本章小结**
- X平台正在变成通信+金融中心（X Chat+X Money），目标10亿+日活；xAI+SpaceX的终极目标是把AI计算扩展到太空——轨道数据中心→月球质量驱动器→火星。

---

## 总结：速度是唯一壁垒，xAI正在所有赛道同时冲刺

| 维度 | 要点 |
|------|------|
| 速度壁垒 | 两年半走完对手5-20年的路，速度和加速度是唯一真正的竞争力 |
| 编码 | 递归自改进正在发生，Grok代码2-3个月内达最先进，年底可能直出二进制 |
| Imagine | 六个月从零到日5000万视频，年底10-20分钟视频实时生成 |
| Macro Hard | 模拟整个数字公司——苹果、英伟达的设计产出理论上都能被AI复制 |
| X平台 | 10亿+用户，X Chat+X Money = 通信+金融中心 |
| 太空计算 | 轨道数据中心→月球质量驱动器→火星，每年200吉瓦起步 |

> **金句 · xAI团队（封底）**
> **中文：** 如果你还没注意到，整个演示都是一次大规模的招聘活动——来加入我们，解决难题，但影响巨大。
> **原文：** If you haven't noticed, this entire presentation is a massive recruitment event — come join us, solve hard problems, but with massive impact.

---

## 附录

**章节时间戳**
- 00:00 开场：xAI全体会议
- 01:00 01 两年半从零到第一
- 05:00 02 组织架构与Grok核心模型
- 12:00 03 编码递归自改进
- 22:00 04 Imagine图像视频生成
- 30:00 05 Macro Hard数字模拟
- 38:00 06 大规模ML系统优化
- 45:00 07 孟菲斯超级计算机集群
- 52:00 08 X平台生态：X Chat + X Money
- 58:00 09 xAI与SpaceX：太空计算

**Ingest 信息**
- column_source: Recastory/workspace/bilibili-retranscribe/BV1LvZTBREby/ingest/column_article.md
- asr_status: asr_ready

**相关阅读**
- [[MOC - Agent Theory and Design]] — Agent时代行业观点入口
- [[黄仁勋-从生成到代理计算]] — 英伟达CEO对同一场AI革命的外部视角
- [[MOC - Harness Engineering]] — AI工程实践
