---
title: "Every CEO-全员AI后员工数翻3倍"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_career"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_career"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1De7R6JELZ/"
description: "Every CEO Dan Shipper：AI让昨日专家能力廉价化，平庸内容泛滥反而增加专家需求；代理离人类越远价值越低；缺乏能动性是AI与人类的根本鸿沟；顺应模型是应对职业焦虑的唯一解法。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Every CEO-全员AI后员工数翻3倍.md"
source_sha256: "6712cb38c79d47c80202e0aabdc4f4a025ecea7ad484cb156afdaeb789ff5298"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1De7R6JELZ/"
column_url: "https://www.bilibili.com/read/cv50500162/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1De7R6JELZ/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1De7R6JELZ/ingest"
duration: "~30 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Brandon Gell"
guest_name: "Dan Shipper"
guest_title: "Every CEO"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Easonlee的AI笔记]]"
concepts:
  - id: expert_cheapening
    zh: 专家能力廉价化
    en: expert capability cheapening
    one_line: AI让昨天只有专家能做的事，现在任何人都能做
  - id: automation_paradox
    zh: 自动化悖论
    en: automation paradox
    one_line: 平庸内容泛滥反而增加对能定义标准的专家的需求
  - id: agent_human_gap
    zh: 代理与人类的能动性鸿沟
    en: agency gap between agents and humans
    one_line: AI总是回头问"接下来做什么"，缺乏内在动机和拒绝指令的能力
  - id: follow_the_model
    zh: 顺应模型
    en: follow the model
    one_line: 保持对新工具的敏感度，学会与模型共生
---

# 全员AI后我们团队从4人涨到30人，代理离人类越远价值越低

> 对谈：Brandon Gell × Dan Shipper（Every CEO）| 来源：AI and I Podcast | 2026-05-21

---

## 开场：为什么现在聊这个

Dan Shipper 刚发表了一篇万字长文《自动化之后》，核心论点让很多人意外：AI普及不会消灭工作，反而会让专家更值钱。他用Every自己的数据说话——全员使用AI工具，团队反而从4人涨到了30人，而且还在招人。

这期的核心矛盾是：AI能做所有事情，但做完之后它会回头看着你问"接下来做什么"。这种对人类判断的依赖，构成了AI与人类之间难以逾越的鸿沟。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理 | agent | 能自主执行任务的AI，但缺乏内在动机 |
| 能动性 | agency | 自主决定做什么的能力，包括拒绝指令 |
| 顺应模型 | follow the model | 保持对新AI工具的敏感度并快速适应 |
| 拉取请求 | pull request (PR) | 向代码库提交代码变更的请求 |
| 提示词 | prompt | 给AI的指令文本 |

---

## 01 AI让昨日的专家能力变得廉价

**Brandon：** 你写了《自动化之后》这篇文章，核心论点是什么？

**Dan：** 基本的想法是：AI的工作方式及其在职场中的功能，是让"昨天的专家能力"变得廉价。AI是根据我们人类所有的输出进行训练的——所有的代码、写作、设计、决策以及所有曾被记录下来的东西。它正以极低的成本向所有人提供这些能力。

所以现在任何人只要有一个提示词，就可以利用昨天的能力来解决编程问题、构建应用程序，或者写文章、写报告，甚至制作YouTube缩略图。当专家能力变得廉价时，它就会被广泛采用。

我们在公司内部也看到了这一点，每个人都在提交拉取请求，大家都在感叹"天哪，这太疯狂了"。就像我正在提交PR，运营人员也在提交PR，工程师们则在写文章。基本上，非专家正在跨界做专家过去做的事情。

有趣的地方在于，因为这些工具是根据昨天的输出数据进行训练的，它们生成的成果往往带有"默认"属性。在默认提示下，它们做出来的事情都大同小异，虽然对当前情况来说大体正确，但实际上并不完全精准。你相当于用大量"接近但不完全正确"的东西淹没了这个领域。

> **金句 · Dan**
> **中文：** AI让昨天的专家能力变得廉价——现在每个人都能做专家做的事，但做出来的都差不多。
> **原文：** AI cheapens yesterday's expert capabilities — now everyone can do what experts used to do, but it all looks the same.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 默认属性 | default attributes | AI用通用数据训练，生成的内容带有"标准模板"的感觉 |
| 粗糙原料 | rough material | AI产出的"接近但不完全正确"的内容，需要专家打磨 |

**本章小结**
- AI让专家能力廉价化，非专家开始跨界做专家的事
- 但AI产出高度同质化且不完全精准，价值立即大幅降低
- 专家从"亲手操作"变成"定义标准和打磨成果"

---

## 02 自动化悖论：平庸内容泛滥反而增加专家需求

**Brandon：** 这在大公司里还成立吗？比如ClickUp解雇了很多人。

**Dan：** 当你用所有这些东西淹没这个领域时，曾经昂贵的专家能力现在变得廉价，而且看起来都一样了，于是价值就贬值了。你得到了大量曾经昂贵且看起来像高质工作的产出，但它们千篇一律，且不完全契合现状。

接下来的情况是，你对专家的需求反而增加了。他们需要介入，处理那些由普通人生产的东西。专家被要求去构建系统，以此来获取那些现在可以由所有人生产的、比较"粗糙"的工作，并将其引导成真正有用的东西。

我们有仓库规则和审查指南之类的东西。这样在威利看到一个PR之前，它会先经过一系列流程，确保它的质量是相当不错的。门槛提高了很多，专家们利用这些工具去制作以前从未能做出来的东西。

即使你实现了自动化，自动化也会产生大量工作。这些工作虽然相当不错，但非常同质化，且不太契合实际情况。这增加了对专家的需求，由他们来使其变得真正优秀、与众不同且契合现状。代理离人类越远，它的价值就越低。而人类与代理的连接，才是真正完成工作的关键。

> **金句 · Dan**
> **中文：** 代理离人类越远，它的价值就越低。人类与代理的连接才是真正完成工作的关键。
> **原文：** The further an agent gets from a human, the less valuable it becomes. The connection between humans and agents is what actually gets work done.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 系统架构师 | system architect | 设计AI工作流和审核机制的专家，不再是亲手操作的工匠 |
| 夹心层 | sandwich layer | 介于AI产出和最终成果之间的人类专家层 |
| 门槛提高 | raised bar | AI普及后，"好"的标准变高了，因为人人都能产出"还行"的东西 |

**本章小结**
- 自动化悖论：AI产出越泛滥，专家的价值反而越高
- 专家的角色从"亲手操作"变成"设计系统+审核打磨"
- 每个AI产出都需要人类判断来决定"这到底对不对"

---

## 03 AI缺乏能动性：它做完后会问你"接下来做什么"

**Brandon：** 你描述了一个很精彩的场景——AI做完之后回头看着你问"接下来做什么"。

**Dan：** 这基本上是论点的核心。因为有人会说："现在它可能会增加对专家的需求，但这些东西会变得足够好，以至于以后就不需要专家了。"

我们来看看基准测试。它们确实在呈指数级改进。但当你仔细观察时，一旦你让一个基准测试达到饱和，就很容易找到一个新的框架，让模型去解决一种稍微更大、更广的特定类型问题，从而让它的表现归零。虽然它正在取得指数级进步，但这并不意味着它等同于人类能力。

最根本的一点是：保持人类和代理之间区别的，是我们正在构建代理来做我们希望它们做的事情，无论它们变得多么强大。所有经济、心理以及技术力量都在推动AI的发展，使其无论做什么，最终都会回头看你，由你决定想要做什么、什么是有价值的。

能够出色完成任务的东西，与拥有"内在动机"的东西是有区别的。Codex写报告可能比以赛亚写得更好，但以赛亚有非常强烈的愿望和需求。如果你用过这些工具，你就会知道它们不是那样设计的。它们没有那种生命力——"我只是想做一些我感兴趣的事情"，这是人类才有的。

> **金句 · Dan**
> **中文：** 你提示AI做某事，它让你大吃一惊。然后它突然停下来，回头看着你问：我接下来该做什么？
> **原文：** You prompt AI to do something, it blows your mind. Then it suddenly stops, looks back at you and asks: What should I do next?

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 内在动机 | intrinsic motivation | 不需要外部指令就想去做的驱动力 |
| 能动性 | agency | 自主决定目标和行动的能力，包括说"不" |
| 基准测试饱和 | benchmark saturation | 模型在某个测试上达到上限后，换个新测试又归零 |

**本章小结**
- AI没有内在动机，它做完后总是等你发指令——这是根本性的鸿沟
- 基准测试的指数进步不等于人类能力，新框架一出就归零
- 即使达到AGI，它也会回头问你"什么是有价值的"——这保持了人类的不可替代性

---

## 04 警惕将裁员归咎于AI：很多公司本来就在走下坡

**Brandon：** ClickUp裁员20%的员工，你怎么看？

**Dan：** 每当你在推特上看到这些言论时，我都很反感。首先，"我们的业务比以往任何时候都好，同时我们解雇了8000人"——这感觉很糟糕。我不喜欢那种"我们会给留下的表现出色的人一百万美元"的姿态。

黄仁勋曾说过：如果你的进步方案只是解雇员工，那么你不是一个很有创造力的CEO。你应该去做更有趣的事情，而不是只想着裁员。

这种不得体的行为应该让你产生怀疑。我的猜测是，这家公司经营得并不算好。当公司经营不善时，他们就会裁员。Meta也是如此——他们之前错过了AI热门领域，元宇宙没有成功，所以现在冗员很多。

AI确实参与了所有这些事情，但这并不是一个简单的"每个人做着和以前一样的工作，只是换成代理来做"的故事。公司实际上必须彻底改变战略，它需要的人员和结构会完全不同。谈论"AI抢走了工作"要容易得多。

> **金句 · Dan**
> **中文：** 如果你的进步方案只是解雇员工，那你不是一个很有创造力的CEO。
> **原文：** If your plan for progress is just firing people, you're not a very creative CEO.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| EBITDA | earnings before interest, taxes, depreciation and amortization | 税息折旧及摊销前利润，常被用来衡量公司盈利 |
| 组织臃肿 | organizational bloat | 公司人员膨胀但效率低下 |

**本章小结**
- 很多裁员是公司经营不善的结果，AI只是借口
- 真正有创造力的领导者应该用AI探索新业务，而不是裁人
- AI导致的是工作方式和公司结构的重组，不是简单的替代

---

## 05 顺应模型是应对职业焦虑的唯一解法

**Brandon：** 对普通人来说，最重要的行动建议是什么？

**Dan：** 如果你能顺应模型，当新模型发布时，你学会如何将它们用于你所做的事情，无论那是什么，你都会没事的。而且你甚至可能会发现，你可以比以前做更多、更好的工作，感到更加充实。

我认为如果你根本不想使用这些模型，世界上仍然有你的位置。很多人不吃快餐，完全有可能不参与其中。然而，如果你关心过上真正有抱负的生活，比如创业等等，我真的认为这会让更多人实现这些目标。

我用Claude辅助思考、将草稿转为播客进行校对。我一醒来就会对着电脑自言自语，从头到尾梳理论点。每次我这样做的时候，我都会求助于Claude。它会反馈一些话，然后我会说"不，不"或者"对，那就是我想说的"。每天早上，我都会让Codex把最新的草稿变成一个播客，让我在上班路上听。能够边散步边听、边思考，这真的很好。

8000字的文章比400字难10倍。我写了大概四五个版本，每次都觉得不行就扔掉重来。没有AI我不可能写出这篇文章——当你试图表达某种难以言说的东西时，唯一的方法就是一遍又一遍地表达它，直到它奏效。

> **金句 · Dan**
> **中文：** 如果你顺应模型，你就会没事。你会有工作，你会做得很好。
> **原文：** If you follow the model, you'll be fine. You'll have work, you'll do well.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 顺应模型 | follow the model | 每次新模型发布时快速学习并应用到自己的工作中 |
| 有抱负的生活 | ambitious life | 不只是谋生，而是追求自己真正想做的事 |
| 校对播客 | podcast proofreading | 把文章转成音频听，用耳朵检验逻辑连贯性 |

**本章小结**
- 顺应模型：保持对新工具的敏感度，每次新模型发布时快速适应
- AI不是替代你，而是放大你的能力——让一个人做到以前需要团队才能做的事
- 不想用AI也完全可以，但如果你想追求有抱负的生活，AI是最大的杠杆

---

## 总结：自动化不会消灭工作，只会重新定义专家的价值

| 维度 | 要点 |
|------|------|
| 核心悖论 | AI让专家能力廉价化，但平庸内容泛滥反而增加专家需求 |
| 人机鸿沟 | AI缺乏能动性和内在动机，做完后总要问你"接下来做什么" |
| 裁员真相 | 很多裁员是经营不善的结果，AI只是借口 |
| 行动建议 | 顺应模型——保持对新工具的敏感度并快速适应 |
| 未来形态 | 专家从"亲手操作"变成"设计系统+定义标准" |

> **金句 · Dan（封底）**
> **中文：** 代理离人类越远，它的价值就越低。人类与代理的连接，才是真正完成工作的关键。
> **原文：** The further an agent gets from a human, the less valuable it becomes. The connection between humans and agents is what actually gets work done.

---

## 附录

**章节时间戳**
- 00:00 开场
- 05:12 AI让昨日专家能力廉价化
- 07:45 自动化悖论：平庸内容增加专家需求
- 14:20 代理与人类的能动性鸿沟
- 21:30 裁员潮与AI的借口
- 32:15 顺应模型是唯一解法

**Ingest 信息**
- column_source: Recastory/workspace/bilibili-retranscribe/BV1De7R6JELZ/ingest/column_article.md
- asr_status: asr_ready

**相关阅读**
- [[MOC - Agent Theory and Design]] — 入口
- [[MOC - AI 时代个人发展与组织]] — AI时代职业发展
