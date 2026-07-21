---
title: "Every CEO-AI越强大工作也越多"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_career", "ai_coding"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_career", "ai_coding"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1Jo7R6eEGi/"
description: "Every CEO Dan Shipper基于全员AI化实战经验预判：个人代理将退场公司级超级代理成主流、AI不再是SaaS插件而是运行环境、自动化悖论导致监督工作更多、产品经理和全栈设计师迎来黄金期。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Every CEO-AI越强大工作也越多.md"
source_sha256: "db63fa8cff4d732bb1f62bfedce944ebc3bd4ad82ac23781b4c1c9a5b9058762"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1Jo7R6eEGi/"
column_url: "https://www.bilibili.com/read/cv42014856/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1Jo7R6eEGi/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1Jo7R6eEGi/ingest"
duration: "~75 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Lenny Rachitsky"
guest_name: "Dan Shipper"
guest_title: "Every CEO兼创始人"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Easonlee的AI笔记]]"
concepts:
  - id: super_agent
    zh: 公司级超级代理
    en: company-level super agent
    one_line: 个人代理维护成本高且易崩溃，未来趋势是公司统一运行一个由驻场工程师维护的超级代理
  - id: saas_as_environment
    zh: SaaS运行环境化
    en: SaaS as runtime environment
    one_line: 未来不在SaaS里用AI，而是在Codex/Claude Code等代理环境中运行SaaS
  - id: automation_paradox_deep
    zh: 自动化悖论
    en: automation paradox
    one_line: AI越强人类监督工作越多，每个代理都需要人类"照看"
  - id: ai_native_docs
    zh: AI原生文档
    en: AI-native documents
    one_line: 对AI生成内容的厌恶将消失，AI写的文档比人随手写的更好
  - id: pm_golden_age
    zh: 产品经理黄金期
    en: PM golden age
    one_line: AI抹平实现层门槛，懂用户懂业务的产品经理能直接交付产品
  - id: ride_the_model
    zh: 驾驭模型
    en: ride the model
    one_line: 保持玩乐心态测试新模型边界，在真实业务结合点发现AI妙用
---

# 自动化是一个谎言：AI越强大，人类需要投入的监督工作越多

> 对谈：Lenny Rachitsky × Dan Shipper（Every CEO）| 来源：Lenny's Podcast

---

## 开场：为什么现在聊这个

Dan Shipper 的Every是目前最AI领先的初创公司之一——全员使用Codex/Claude Code/Cowork完成大部分工作，团队从15人翻倍到30人还在招人。他上次来预测Claude Code会被所有人使用，结果完全应验。这次他做出更多大胆预测：一年后回看，大部分会变得非常明显。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 超级代理 | super agent | 全公司统一运行一个AI代理，由驻场工程师维护 |
| 运行环境 | runtime environment | AI代理的工作空间，用户带着自己的算力和模型去使用工具 |
| 自动化悖论 | automation paradox | AI越强大，人类需要投入的监督工作反而越多 |
| 驾驭模型 | ride the model | 保持玩乐心态测试新模型，发现AI在特定场景的妙用 |
| 前线部署工程师 | field deployment engineer | 专职维护和调优AI代理的人，确保代理为全公司正常运作 |
| 伸手测试 | reach test | 早上醒来你是否自然而然地去拿这个工具——衡量真实采纳的指标 |
| 内在动机 | intrinsic motivation | 不需要外部指令就想去做的驱动力，AI没有而人有 |

---

## 01 个人代理将退场，公司级超级代理成为主流

**Lenny：** 你对未来一年我们的工作方式有什么预测？

**Dan：** 我预测工作将以两种主要方式分化。第一，你将拥有像OpenClaw那样的个人代理，可以在Slack或任何地方委托任务。其次，你大部分的工作将在Codex或Claude Code这样的环境中完成——它成为你所有工作的操作系统。

OpenClaw发布时，Every内部每个人都采用了它，我当时确信每个人都会有自己的代理。但我现在已经完全改变了看法。**目前的模式将是超级代理——整个公司只有一个代理。**Shopify有River，Ramp也有一个。

原因是：为了让AI代理现在有用，它确实需要一个关心它的人类。一旦你切断这种联系，代理就不再那么有用了。所以我们看到的趋势是：安排一名驻场工程师负责确保代理为全公司正常运作。随着模型变得更加独立，这种情况会改变，个人代理会增多。但目前的最佳实践是：公司级超级代理+专人维护。

> **金句 · Dan**
> **中文：** 代理需要关心它们的人。这就是为什么趋势是从个人代理转向公司级超级代理——由专人维护，为全公司服务。
> **原文：** Agents need people who care about them. That's why the trend is from personal agents to company-level super agents — maintained by specialists, serving everyone.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 超级代理 | super agent | 全公司统一的AI代理，而非每人一个 |
| 驻场工程师 | on-site engineer | 专职维护代理的人，确保代理正常运作 |
| 伸手测试 | reach test | 早上醒来是否自然而然去拿这个工具 |
| 个人影子组织 | shadow org chart | 每人一个代理形成的平行组织结构 |

**本章小结**
- 个人代理维护成本高且易崩溃，趋势是公司级超级代理+专人维护
- 代理需要"关心它的人"——人类监督是代理发挥作用的前提
- 从顶层通用代理开始，随使用深入逐渐向下发展专业化

---

## 02 AI不再是SaaS的插件，而是SaaS的运行环境

**Lenny：** 你说AI不是嵌入到SaaS工具中，而是SaaS工具将在Codex或Claude Code中运行？

**Dan：** 是的，这是其中一个非常重要的二阶效应。我在使用Proof或任何网站时，是在我的代理内部使用它。代理可以访问网站，所以它能访问我所能访问的一切。它还可以访问我的整个电脑。当我在那个网站上运行代理时，我使用的是我的令牌，而不是供应商的令牌。

所以它把SaaS放回了它该在的位置。你希望它对代理友好——现在每个人都有一个CLI。HTML真的非常易用，CLI中发生的任何事情都能立即显示给用户。一旦你做到了，你实际上就不需要考虑专门构建一个AI界面了。

任何使用Proof的人，我都不需要支付令牌费用，因为他们是带着自己的AI来的。这改变了你作为SaaS公司构建产品的方式：你现在是为了人类和代理同时使用而构建它。它将你的利润率恢复了，因为你不需要再支付令牌费用，用户会自带AI。

我现在会买SaaS股票。"SaaS末日论"是愚蠢的。代理的作用是增加SaaS的用户数量，而不是淘汰它。

> **金句 · Dan**
> **中文：** 代理的作用是增加SaaS的用户数量，而不是淘汰它。SaaS末日论是愚蠢的。
> **原文：** Agents will increase the number of SaaS users, not kill SaaS. The "SaaS death" narrative is nonsense.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| SaaS运行环境化 | SaaS as runtime | SaaS工具在代理环境中运行，用户自带AI |
| 用户自带令牌 | bring your own tokens | 用户带着自己的AI算力使用SaaS，SaaS公司不用付推理费 |
| 利润率恢复 | margin recovery | 不用为用户支付AI令牌费，利润率回升 |

**本章小结**
- AI不是SaaS的插件，而是SaaS的运行环境——用户在代理中运行SaaS
- 用户自带AI算力，SaaS公司利润率回升——SaaS末日论是错的
- 代理增加SaaS使用量而非淘汰SaaS，B2B SaaS将迎来反弹

---

## 03 自动化悖论：AI越强，人类需要投入的监督工作越多

**Lenny：** 你们公司过去一年员工数量翻了一番，对于一家如此AI领先的公司来说这很意外。

**Dan：** **自动化是一个谎言。** 因为你每次自动化一些东西，为了确保自动化运行良好，你都需要一个人来监督它。

我一直能感觉到一种悖论：我们有了这么多自动化和AI，但我工作得反而更多了。当我建立自己的基准测试时，这个悖论在某种程度上得到了解决。我做了一个"高级工程师基准测试"——对比AI版本与人类工程师的水平。

在GPT-5.5之前，所有模型得分只有30分（满分100），人类高级工程师能得80到90多分。后来GPT-5.5得了62分——一年之内它就能达到高级工程师水平。但当我达到那个点时，我会很容易地改变基准，将当前模型的表现归零。

真正的人类高级工程师会怎么做？他们会查看代码库，然后说："这简直是一堆垃圾，我们必须重写很多代码，这很困难也有风险。我知道你不想听这些，但我们必须这样做。"AI不会主动这样做。有很多激励机制阻碍它这样做。

基准测试是在我们已经明确、可以表达、可以评分的问题上取得进展。而有很多工作在被写下来之前是无法评分的。思考如何描述问题的行为本身无法被衡量。这就是为什么即使基准测试达到饱和，也不代表你完全取代了所有高级工程师。

> **金句 · Dan**
> **中文：** 自动化是一个谎言。每次你自动化一些东西，为了确保它运行良好，你都需要一个人来监督它。
> **原文：** Automation is a lie. Every time you automate something, you need a human to make sure the automation runs well.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自动化悖论 | automation paradox | 自动化越完善，监督和维护工作反而越多 |
| 高级工程师基准 | senior engineer benchmark | 衡量AI能否像人类高级工程师那样做判断和重构 |
| 不可评分的工作 | unscorable work | 在被写下来之前无法衡量的工作——比如发现问题并定义问题 |
| 安慰性前进 | comforting forward motion | 模型在明确任务上进步，但判断力仍需人类 |

**本章小结**
- 自动化悖论：AI越强大，人类监督和维护工作反而越多
- 基准测试的进步不等于替代人类——"发现并定义问题"是不可评分的
- 每个代理都需要人类"照看"，这是短期内不可逾越的现实

---

## 04 内部文档和邮件将全面AI化，且质量优于人类

**Dan：** 我们将阅读更多由AI生成的文档和电子邮件，而且我们会喜欢它。

我们在2025年底做季度规划时，完全使用了Notion代理。我们让公司里的每个人都和代理交谈，代理会询问去年的进展、今年的目标和指标，并根据公司整体理念进行反驳和追问。最后我得到了非常出色的AI生成的战略报告，我只需要进去协调各团队的沟通，并判断报告的质量。

现在大部分邮件都是由GPT-5.5和Codex编写的。我前几天发了一封邮件给投资者，Codex没问我就直接发出去了，我事后去看，发现那正是我会写的内容。

对AI生成内容的厌恶会消失。在良好指导下，AI写的文档比人随意敲出来的要好得多。大多数人的文档写得很糟糕，门槛其实很低。如果一个人制作文档花的时间比我阅读还少，且不为内容负责，那才是问题。

> **金句 · Dan**
> **中文：** 对AI生成内容的厌恶会消失——AI写的文档比人随手敲出来的要好得多。
> **原文：** The aversion to AI-generated content will disappear — AI documents are better than what most people casually type out.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| AI原生文档 | AI-native documents | 由AI生成但人类审核负责的战略报告和邮件 |
| 战略规划代理 | strategy planning agent | 访谈所有团队后生成季度规划报告的AI |
| 内容责任制 | content accountability | AI生成≠人类不负责，最终决策仍由人做 |

**本章小结**
- AI生成的战略报告和邮件质量超过大多数人的随手写作
- 对AI内容的厌恶会消失，"AI生成、人类负责"将成为职业标准
- 但AI生成≠不负责——人类负责审核和最终决策

---

## 05 产品经理和全栈设计师将迎来职业生涯的黄金期

**Lenny：** 你预测谁将在未来取得最大成功？

**Dan：** 我非常看好产品经理。我们团队的马库斯是产品经理出身，此前管理着庞大团队。他完全沉迷于AI，学会了Cursor。现在他交付产品的速度比团队中几乎任何人都快。他能理解用户信息的意义，并将其整合进产品规划。

AI抹平了实现层的门槛，让懂用户、懂业务的产品经理能直接通过Cursor等工具交付产品。他感到了解放，因为他不必再为了实现目标去组织一个完整的团队。这令人印象深刻。

另一群将成为"超级强人"的是全栈设计师。如果你是一名设计师，现在可以直接提交PR。你有很多奇思妙想，想把交互做得非常有趣，而这恰恰是单纯靠AI编码很难做到的——因为AI生成的东西往往千篇一律。设计师可以做出截然不同的东西，而且现在他们真的能把它构建出来。

创造力将从AI垃圾信息中脱颖而出。每个人都用相同的模型，如果你以最默认的方式去使用它，结果看起来都一样。人类的作用就是介入其中，思考如何利用被廉价化的能力去创造一些新的、有趣的东西。

> **金句 · Dan**
> **中文：** 创造力只会越来越有价值——能让你从不断涌现的平庸内容中脱颖而出。
> **原文：** Creativity will only become more valuable — it's what lets you stand out from the flood of mediocre AI-generated content.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 产品经理黄金期 | PM golden age | AI抹平实现层，懂用户的产品经理能直接交付 |
| 全栈设计师 | full-stack designer | 设计师直接提交PR，绕过繁琐的交接流程 |
| 默认属性 | default attributes | 用通用方式使用AI，产出千篇一律 |
| 创造力溢价 | creativity premium | 创造力是从AI平庸内容中脱颖而出的唯一变量 |

**本章小结**
- AI抹平实现层门槛，产品经理能直接交付产品——不再需要组织完整团队
- 设计师从"画图"变成"直接提交PR"，创造力是从AI平庸中脱颖而出的唯一变量
- "通才"在AI时代能走得更远，这对小公司来说是巨大的创业机会

---

## 06 驾驭模型是唯一的生存策略，而非躲避竞争

**Lenny：** 普通人应该做什么来保持竞争力？

**Dan：** **驾驭模型。** 这意味着将它们应用到你所做的任何事情中。如果你坚持这样做，并在新模型发布时积极尝试，弄清楚"我现在有了什么新能力，该如何使用它们"，而不是因为恐惧而选择忽略——你就会没事的。

人们认为AI的前沿在旧金山，但我并不这么认为。AI的前沿在于AI与真实的人结合并产生实际行动的地方。旧金山的人在制造AI，但他们并不一定知道如何穷尽它的用途。布鲁克林的人在应用上比旧金山领先很多，因为我们将AI用于一切。

每当新模型发布，你就有机会成为世界上第一批发现其新用途的人。这就像一种新发现。如果你能始终如一地这样做，我认为很难失败。

真正找出AI用法的最佳方式，是去做一些令你感到愉快的事情。很多人是因为害怕才学习AI，但你应该因为有趣而使用它。找到你与AI的"快乐时刻"——那种"哇，不敢相信AI帮我做到了这个"的感觉。

> **金句 · Dan**
> **中文：** AI的前沿不在旧金山的实验室，而在AI与真实的人结合并产生实际行动的地方。
> **原文：** The frontier of AI is not in San Francisco labs — it's where AI meets real people and produces real action.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 驾驭模型 | ride the model | 保持玩乐心态测试新模型边界并快速适应 |
| 快乐时刻 | happy moment | 发现AI妙用时的惊喜感，驱动持续探索 |
| 应用前沿 | application frontier | AI最前沿不是模型实验室，而是真实业务结合点 |
| 玩乐心态 | play mindset | 出于兴趣而非恐惧去探索AI，效果最好 |

**本章小结**
- 驾驭模型：保持玩乐心态，每次新模型发布时积极尝试
- AI前沿不在旧金山，而在真实业务的结合点——普通人也能领先
- 出于兴趣而非恐惧使用AI，找到你与AI的"快乐时刻"

---

## 总结：自动化是谎言，AI越强大人类工作越多

| 维度 | 要点 |
|------|------|
| 代理架构 | 个人代理退场，公司级超级代理+驻场工程师成主流 |
| SaaS未来 | AI不是SaaS插件而是运行环境，SaaS末日论是错的 |
| 自动化悖论 | AI越强大，人类监督和维护工作反而越多 |
| 内部变革 | AI文档和邮件将成职业标准，质量优于人类随手写 |
| 职业趋势 | 产品经理和全栈设计师迎来黄金期，创造力是唯一壁垒 |
| 生存策略 | 驾驭模型——保持玩乐心态，在真实业务中发现AI妙用 |

> **金句 · Dan（封底）**
> **中文：** 自动化是一个谎言。AI越强大，人类需要投入的监督工作越多。但好消息是：驾驭模型的人将成为历史上最强大的个体。
> **原文：** Automation is a lie. The more powerful AI gets, the more human oversight it needs. But the good news: people who ride the model will become the most empowered individuals in history.

---

## 附录

**章节时间戳**
- 10:30 个人代理退场，公司级超级代理成主流
- 18:45 AI不再是SaaS插件，而是SaaS运行环境
- 35:12 自动化悖论：AI越强人类监督工作越多
- 48:20 内部文档和邮件将全面AI化
- 55:10 产品经理和全栈设计师迎来黄金期
- 72:45 驾驭模型是唯一生存策略

**Ingest 信息**
- column_source: Recastory/workspace/bilibili-retranscribe/BV1Jo7R6eEGi/ingest/column_article.md
- asr_status: column_s_tier

**相关阅读**
- [[Every CEO-全员AI后员工数翻3倍]] — 另一期Dan Shipper：自动化之后的专家价值
- [[Speechify CEO-从100位CEO学到经验]] — AI时代的增长套利与组织文化
- [[a16z前合伙人-关于AI最理性简介]] — AI理性分析：任务vs工作，分发护城河
