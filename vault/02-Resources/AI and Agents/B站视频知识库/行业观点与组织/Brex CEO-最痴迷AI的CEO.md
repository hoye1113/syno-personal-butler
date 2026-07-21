---
title: "Brex CEO：最痴迷AI的CEO"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_philosophy", "ai_safety", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_philosophy", "ai_safety", "harness_engineering", "enterprise_ai", "startup"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1jrjP6UEe3/"
description: "Brex 联合创始人 Pedro Franceschi 深度访谈：CEO 必须成为首席 AI 官，摆脱富士康工厂模式解放 Agent 自主性，重新设计流程而非贴 AI，建立梦想循环让 Agent 自进化。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Brex CEO-最痴迷AI的CEO.md"
source_sha256: "8c12428824a75769293b7ae16884171fde2d5fa2da02a0dbab2c0cb4cca7b1eb"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1jrjP6UEe3/"
column_url: "https://www.bilibili.com/read/cv48237223/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1jrjP6UEe3/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1jrjP6UEe3/ingest"
duration: "~50 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Gary Tan"
guest_name: "Pedro Franceschi"
guest_title: "Brex 联合创始人兼 CEO"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Pedro Franceschi]]"
concepts:
  - id: foxconn_factory
    zh: 富士康工厂模式
    en: foxconn factory model
    one_line: 把 Agent 当流水线工人严格控制，反而限制了自主性
  - id: claw
    zh: 爪子
    en: the claw
    one_line: Agent 的自主执行能力，要解放而不是束缚
  - id: electricity_analogy
    zh: 电力类比
    en: electricity analogy
    one_line: AI 就像刚发明六个月的电力，短期 ROI 差但长期改变一切
  - id: surface_area
    zh: 最小化表面积
    en: minimize surface area
    one_line: 伟大想法都能写在餐巾纸上，AI 压缩复杂性
  - id: hidden_signals
    zh: 模型之外的低语
    en: signals outside the model
    one_line: 客户未言明的需求，创始人独有的超额收益来源
  - id: crabtrap
    zh: 网络层审计
    en: crabtrap
    one_line: 通过网络流量审计而非代码限制来保障 Agent 安全
  - id: dream_loop
    zh: 梦想循环
    en: dream loop
    one_line: 每次人机交互都变成评估案例，触发代码库自动修改
  - id: token_maximizer
    zh: 代币最大化者
    en: token maximizer
    one_line: 疯狂消耗 Token 的工程师，是 AI 采纳的最深层用户
---

# Brex CEO：最痴迷AI的CEO

**Host：** Gary Tan（YC 总裁）  
**Guest：** Pedro Franceschi（Brex 联合创始人兼 CEO）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `BV1jrjP6UEe3/ingest/column_article.md`  
**B 站：** [BV1jrjP6UEe3](https://www.bilibili.com/video/BV1jrjP6UEe3/)

---

## 开场

Pedro Franceschi 在 YC 2017 冬季批次创立了 Brex，把它打造成过去十年最重要的金融科技公司之一。他来到 YC 吃午饭时，因为他的 AI 设置太引人注目，整个团队陷入了某种「自我构建」的狂热。Pedro 的核心洞察是：大多数人把 Agent 当成珍贵且严格控制的工具，关进「富士康工厂」里——而真正的突破在于解放「爪子」，给它自由度。Brex 在 AI 领域的投入比我们所知的任何企业都要深入，从 Crabtrap 网络层审计到「梦想循环」自学习系统，这家金融科技公司正在重新定义企业 AI 的样子。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 爪子 | the claw | Agent 的自主执行能力 |
| 富士康工厂模式 | foxconn factory model | 严格控制 Agent 每一步，像流水线工人 |
| 电力类比 | electricity analogy | AI 就像刚发明六个月的电力 |
| 最小化表面积 | minimize surface area | 伟大想法都能写在餐巾纸上 |
| 模型之外的低语 | signals outside the model | 客户未言明的隐性需求 |
| 网络层审计 | crabtrap | 通过分析 HTTP 流量而非限制代码来保障安全 |
| 梦想循环 | dream loop | 人机交互变成评估案例，触发自动修改 |
| 代币最大化者 | token maximizer | 疯狂消耗 Token 的深度用户 |
| 虚拟员工 | virtual employee | 在 Slack 上、有邮件、能参会的 AI 助手 |
| 知识诅咒 | curse of knowledge | 专家不知道自己知道什么，导致盲区 |

---

## 01 CEO需要成为首席AI官

**Gary：** 你说过一句话——「你生活中遇到的任何问题，为什么不能用 AI 来解决呢？」这句话背后的逻辑是什么？

**Pedro：** CEO 需要成为首席 AI 官。这不是工程团队或产品团队的事情，你必须比任何人都更了解技术的边界。衡量如何分配时间的一个好方法是：问自己有哪些事情是只有你能做、而模型做不到的。你必须重新定义公司核心竞争力的概念。

我在疫情期间拿到 GPT-3 的 API，玩了一下觉得这东西可能有特别的东西，但当时更像谷歌以前发布的研究项目——玩十分钟就停了。后来 ChatGPT 出来了，每个人都产生了兴趣。但真正改变一切的是推理模型，然后是工具。直到去年十二月，我认为电力被发明了。对我来说，电力就是 Opus 4.5。

想象一下，现在是电力刚被发明六个月的时候，大多数人还在玩蜡烛，质疑蜡烛和火能做什么，问「谁需要光」。所有这些灯笼，你能用它们做什么？蒸汽机可能还要二十年才问世，但电力已经存在了。

**Gary：** 你说电力刚被发明六个月——这个类比很有力。但 CEO 怎么在日常工作中落地这个判断？

**Pedro：** 我的试金石是：生活中出现任何问题时，你是否会首先想到 AI？从机械角度你可以做到，但总有一天它会成为第二天性，然后你的整个大脑都会被重新编程，你无法以不同的方式思考。

我仍然有点惊讶，当你和很多人谈论一个问题时，深入理解这个问题的边界是如此简单，你为什么还没有这样做，并带着对问题更深入的理解来找我呢？这就是 CEO 需要做到的——不是让团队去用 AI，而是自己先被 AI「洗脑」。

> **金句 · Pedro Franceschi**
> **中文：** CEO 需要成为首席 AI 官——你必须比任何人都更了解技术的边界，除非你每天真正体验到技术的局限性。
> **原文：** The CEO needs to be the chief AI officer. You have to understand the boundaries of the technology more than anyone unless you truly experience the limitations every day.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 首席 AI 官 | chief AI officer | CEO 亲自掌控 AI 技术边界，不只是让团队去做 |
| 电力类比 | electricity analogy | AI 就像刚发明六个月的电力，短期 ROI 差但长期改变一切 |
| 试金石 | litmus test | 遇到问题时是否首先想到用 AI 解决 |

**本章小结**

- CEO 需要成为首席 AI 官，亲自体验技术边界，不是让团队去用 AI
- AI 就像刚发明六个月的电力——短期 ROI 差但长期改变一切，不能被会计逻辑束缚
- 试金石：遇到问题时是否首先想到 AI，如果是说明你的大脑已经被重新编程

---

## 02 摆脱富士康工厂模式，解放Agent自主性

**Gary：** 你之前在午餐会上提到了「爪子」这个概念——「解放爪子，给它代币」——能展开说说吗？

**Pedro：** 那五十万行 Rails 代码对我来说就是这样。我不停地想：不不不，我需要控制 LLM 看到什么，因为它的成本很高，我只想要这里的上下文，然后写下所有的 if 语句来完成任务。这就像是富士康的工程师，早上六点醒来，如果不这样做就会被电击。这真的是对 Agent 做的一件可怕的事情。

结果就是，你必须把 Agent 字面意义上地放进「富士康工厂」里。每个人，包括我们的安全团队，最初都说「我们不能这样做」。但我花了四周时间去解决最难的问题——安全。

我们意识到，唯一能真正解决这个问题的方法是在网络层做些什么。如果你把 Agent 当作有自己意愿和欲望的个体，让他们去「埃萨伦学院」而不是「富士康工厂」，他们可能会在网络边界做出一些不正确的事情。所以我们构建了一个叫 Crabtrap 的工具——通过分析 HTTP 流量来审计 Agent 的行为，而不是限制代码。

因为这些模型是在数千亿个网络文档上训练的，HTTP 流量实际上是模型推理方式的主要依据。模型观察数千个请求并理解发生了什么的能力，比我们预期的要高得多。我们在 Brex 将其投入生产，在你记录一个 Agent 运行一天的流量后，可以建立一个相当好的策略。对于确定的事情自动批准，对于不确定的事情，用另一个 LLM 作为判断者。我们在 Brex 有一个招聘代理叫 Jim，98% 的请求自动通过，只有 2% 需要 LLM 介入判断。

**Gary：** 所以你不是在限制 Agent 能做什么，而是在网络层审计它做了什么？

**Pedro：** 对。我们不是在做 HTTP 代理的生意，我们是在 AI 领域走在前沿的生意。为了达到前沿，我们需要构建这个 Agent 基础设施。这就是我们这样做的原因。希望有人能建立一家专门做这个的 YC 公司，构建一个更好的版本，然后我们就可以直接使用了。

> **金句 · Pedro Franceschi**
> **中文：** 我们把 Agent 放进富士康工厂——不给它选择，不给它自由——结果就是，它表现得像一个流水线工人。
> **原文：** We put agents in a foxconn factory — no choices, no freedom — and then they perform like factory workers.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 富士康工厂模式 | foxconn factory model | 严格控制 Agent 每一步，像流水线工人 |
| 爪子 | the claw | Agent 的自主执行能力 |
| 网络层审计 | network-level audit | 分析 HTTP 流量而非限制代码来保障安全 |
| LLM 判断者 | LLM as judge | 用另一个 LLM 判断 Agent 行为是否合规 |

**本章小结**

- 把 Agent 关进富士康工厂（严格控制每一步）反而限制了它的表现
- Crabtrap 通过网络层审计 HTTP 流量来保障安全，比代码限制更有效
- 98% 的请求自动通过，只有 2% 需要 LLM 判断——安全和效率可以兼得

---

## 03 AI处于电力发明后的前六个月

**Gary：** 你说我们正站在两百年的历史面前——这个判断听起来很宏大，但具体意味着什么？

**Pedro：** 我无法停止思考那个电力的类比。你正站在人类历史两百年的时间线上。电力刚发明六个月时，它表现很糟。但如果你预知了电力的未来，知道数据中心和 AI 会如何消耗能源，你会做出什么不同的选择？

很多人对代币成本非常谨慎。但我一直在想象，如果我在十二或十四岁刚开始学习编程时，就拥有现在的技术，我会以最便宜的方式实现代币最大化。现在确实有人在这样做——比如中国的模型，表现得相当不错。有一个庞大的业余爱好者社区，他们会组装游戏设备，尝试构建本地 LLM。那是一种完全合理的方式。

成本是一方面，但即使抛开成本不谈，第一个迹象是应该有更多人抱怨最大计划限制。你看看 Twitter 上大概有多少比例的人在抱怨这个？只有 0.1%。所以我们可能还处于早期阶段。

有一个数据：地球上三十二亿人中，84% 从未使用过 AI；16% 至少用过一次免费聊天机器人；只有 0.3% 每月支付二十美元使用 AI；而在两千五百个方块中，只有一个方块实际使用了各种 Agent。这就是支持长期推断的论据——这只是一个开始。

**Gary：** 那对于那些正在犹豫要不要投入 AI 的公司，你有什么建议？

**Pedro：** 我跟一家大型上市公司的 CFO 聊过。她告诉我，他们看到了大量的代币消耗，正在尝试衡量产品速度，看到更多的代码行被推送。所以也许这是衡量投资回报率的方法，但它真的存在吗？毕竟人们在代币上花了这么多钱。

我认为这种分析虽然重要，但忽略了一个事实：你正站在历史的时间线上，而这距离「电力」发明才六个月。想象一下在十九世纪，有人说：「我的电费现在这么高，天哪，少用一点吧，让我们把蒸汽机推迟二十年再问世。」

为了节省成本而推迟是不对的。当然，不要因为代币费让公司破产。但最终，代币可能会变得像免费一样——就像现在我们不会考虑日常电费成本，除非你在经营数据中心。

> **金句 · Pedro Franceschi**
> **中文：** 你正站在人类历史两百年的时间线上——电力刚发明六个月，大多数人还在玩蜡烛。
> **原文：** You are standing on a two-hundred-year timeline of human history. Electricity was invented six months ago, and most people are still playing with candles.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 电力类比 | electricity analogy | AI 就像刚发明六个月的电力，短期 ROI 差但长期改变一切 |
| 代币最大化 | token maximization | 疯狂消耗 Token 以获得最大价值 |
| 长期推断 | long-term inference | AI 使用量会持续指数增长的判断 |

**本章小结**

- AI 就像刚发明六个月的电力——短期 ROI 差但长期改变一切，不能被会计逻辑束缚
- 全球只有 0.3% 的人每月付费使用 AI，实际用 Agent 的更少——我们还处于最早期
- 为了节省代币成本而推迟 AI 投入，就像在十九世纪为了省电费而推迟蒸汽机

---

## 04 最小化表面积是AI时代产品设计的核心

**Gary：** Brex 的 MVP 没有网页 UI，只有命令行界面。现在 AI 这么强，还需要做简单 MVP 吗？

**Pedro：** 我观察那些成功的公司模式，发现一个非常有趣的规律——最小化表面积。Stripe 早期就是一个 API；Brex 早期没有 UI，只是命令行界面；Airbnb 的网站初期就是一个表格；早期的 DoorDash 也是类似的情况。与客户的接触面非常小，而创始人的大部分精力和智慧都花在了完善这一个单一的交互模式上。

AI 的风险在于让「选择的自主性」消失了。你在解决什么问题上会缺乏纪律性。人们倾向于相信可以尝试很多事情，但这并不能阻止你真正去选择重要的事情。我总是告诉人们，如果你不能最小化你的表面积，并以非常清晰的边界解决问题，那么你还没有找到正确的问题。

智能就是压缩。当有人来向我推销想法时，我会说，它必须能写在一张餐巾纸上。伟大的想法都能写在餐巾纸上。你的餐巾纸是什么？如果有人拿着一叠纸过来，我会说，我不知道你在哪里买的餐巾纸，但我家里的不是这个尺寸。

**Gary：** 那在 AI 时代，怎么找到真正值得解决的核心问题？

**Pedro：** 创始人最重要的工作是与客户交谈——不仅是对话，而是如何从对话中提取那种未言明的信号。模型没有训练过这些信号。当你和一个人交谈，他们告诉你遇到的问题时，他们不会给你一个可以直接输入到 LLM 中的提示。LLM 也不会直接输出一个能成为十亿美元公司的产品。

选择的智慧仍然是目前缺失的瓶颈。对我来说，这都来自于模型中没有的信号。衡量如何利用时间的一个好方法是：只有你能做的事情是什么？即使在只有一人的公司里，模型不能做、只有你能做的事情是什么？

> **金句 · Pedro Franceschi**
> **中文：** 伟大的想法都能写在餐巾纸上——如果有人拿着一叠纸过来，我不知道他在哪里买的餐巾纸。
> **原文：** Great ideas can be written on a napkin. If someone comes with a stack of papers, I don't know what size napkins they have at their house.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 最小化表面积 | minimize surface area | 与客户的接触面越小，创始人的智慧越集中 |
| 选择的自主性 | autonomy of choice | AI 让你什么都能做，但选择做什么是你的纪律 |
| 模型之外的低语 | signals outside the model | 客户未言明的隐性需求，创始人独有的超额收益 |

**本章小结**

- 伟大的想法都能写在餐巾纸上——AI 的风险是让你失去聚焦的纪律性
- 创始人独有的超额收益来自模型中没有的信号——客户未言明的隐性需求
- 只有你能做的事情是什么？这是衡量时间分配的最好方法

---

## 05 重新设计流程而非在旧系统上贴AI

**Gary：** Brex 在 AI 转型中做过的最大突破是什么？

**Pedro：** 一个有趣的例子是 KYC 流程。每当我们招募客户时，都必须进行这些检查。KYC 在历史上可以自动化大约 80%，20% 是手动的。最初的动力是「让我们构建一个 Agent 来完成它」，这当然可以做到。但我们决定重新设计整个端到端流程，甚至重新设计了整个入职流程。

当你重新设计入职流程时，会发现在漏斗开始阶段有一件非常重要的事情——交易资格审查。这个客户是否具备成为 Brex 客户的资格？当你能以极低成本获得 KYC 能力时，你就可以对潜在客户进行 KYC。所以你开始在漏斗前端建立风险导向，这改变了你瞄准的对象，因为你预先知道谁会符合资格。

很多竞争对手的方法是：我有这个完整的旧流程，让我把 AI「附加」上去。但我们经历过的最大突破是：把旧方式放在一边，如果我们今天从零开始创建公司，我们会如何设计它？然后就这么去做。

**Gary：** 这需要创始人的精力，对吧？大多数人不会愿意做这种彻底的改变。

**Pedro：** 是的。我告诉人们，系统中的升级路径需要「去敏感化」。公司会产生「抗体」来对抗任何对社会凝聚力的干扰。我认为应该加快决策速度，明确说：「我们要尝试这个，我理解并愿意承担这个风险。」因为最大的风险是不承担风险。

CEO 打破常规比高管容易十倍，高管又比员工容易十倍。很多时候有人来找我，说想尝试某个 AI 应用，但有人说不行，因为没测试过。我就会问：「你想做什么？了解风险和防护措施吗？」如果答案是肯定的，我解决这个问题只需要十秒钟。而其他人则需要十个小时去开会、升级审批，最后结论可能是「永远不能做」。

> **金句 · Pedro Franceschi**
> **中文：** 最大的突破不是在旧流程上贴 AI，而是把旧方式放在一边，问自己：如果今天从零开始，我们会怎么设计？
> **原文：** The biggest breakthrough is not attaching AI to the old process, but setting the old way aside and asking: if we started from scratch today, how would we design it?

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| KYC | know your customer | 了解客户背景的合规检查流程 |
| 漏斗前端 | top of funnel | 获客阶段，最早接触潜在客户的地方 |
| 去敏感化 | desensitize | 打破公司对变革的本能抵制 |
| 流程重设计 | process reengineering | 从零开始设计新流程，而不是在旧流程上贴 AI |

**本章小结**

- Brex 重新设计了 KYC 全流程，把风险评估前置到获客阶段，改变了业务边界
- 最大突破是「从零开始」思维——不是在旧流程上贴 AI，而是重新设计整个流程
- CEO 打破常规比高管容易十倍——最大的风险是不承担风险

---

## 06 建立梦想循环让Agent实现自进化

**Gary：** 你提到过「梦想循环」——让 Agent 自我进化——这是怎么实现的？

**Pedro：** 我们正在做的一件事，就是如何让公司中的每一次人机交互都成为一个评估案例。例如，入职 Agent 在处理任务，如果出现了它无法解决的 KYC 异常，需要人工介入，那么这次手动交互就会自动变成一个评估案例。

在 Brex，我们有一个费用代理。每当有人与代理对话并标记出错误，或者感觉不顺畅时，系统就会创建一个错误记录，触发另一个代理去修改代码库和提示词，以使该评估通过。如果自动化无法解决，工程师才会介入。最终目标是让整个系统成为一个自学习系统。

我认为很多公司花大量时间让 Agent 跑起来，却从不考虑如何让它每天进步。你需要一个「梦想循环」——每晚都能回顾一切，问：那里发生了什么？有规律吗？我该如何改进？

**Gary：** 这跟我们之前聊的「梦想」功能有什么关系？

**Pedro：** 本质上是一样的。我们的销售团队现在运行在「客户世界模型」上。我们试图获取客户与我们接触的每一个点——从他们在仪表板上点击按钮的次数，到他们在电子邮件或电话里说了什么。整合这些信息后，我们去分析：这个客户接下来需要我们做什么？他们应该考虑什么？他们将面临但尚未察觉的问题是什么？

这本质上也是一个分布问题。只要内存或上下文有限制，工作就会存在。我不认为会有一个模型拥有足够多的参数，能包含你可能需要的所有分布信息。宇宙中没有那么多原子。这本质上是一个建模问题。

我们需要重新定义公司自我认同的核心概念，以及职能和成就感是如何构建的。人工智能在我们内部讨论时分为三块：产品 AI、运营 AI 和企业 AI。这三个议程都很重要，人们有时会局限在其中之一，但实际上你必须退后一步，从全局去解决问题。

> **金句 · Pedro Franceschi**
> **中文：** 你需要一个梦想循环——每晚都能回顾一切，问自己：那里发生了什么？有规律吗？我该如何改进？
> **原文：** You need a dream loop — every night, review everything and ask: what happened? Are there patterns? How can I improve?

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 梦想循环 | dream loop | 每次人机交互都变成评估案例，触发自动修改 |
| 评估案例 | eval case | Agent 出错时自动记录，用于改进代码和提示词 |
| 客户世界模型 | customer world model | 整合所有客户触点，预测客户下一步需求 |
| 自学习系统 | self-learning system | 从每一次交互中学习并自动改进 |

**本章小结**

- 每次人机交互都变成评估案例，触发另一个 Agent 修改代码和提示词
- 梦想循环让 Agent 每晚回顾一切，找规律、找改进点
- 产品 AI、运营 AI、企业 AI 三个议程都要做，不能只局限在其中之一

---

## 总结：CEO 亲自下场，从零开始设计

| 维度 | 要点 |
|------|------|
| CEO 角色 | CEO 必须成为首席 AI 官，亲自体验技术边界 |
| 安全策略 | 用网络层审计（Crabtrap）替代代码限制，解放 Agent 自主性 |
| 时间判断 | AI 是刚发明六个月的电力，不能被短期会计逻辑束缚 |
| 产品设计 | 最小化表面积——伟大想法都能写在餐巾纸上 |
| 流程重设计 | 不要在旧流程上贴 AI，从零开始设计 |
| 自进化 | 梦想循环——每次交互都变成评估案例，Agent 每天进步 |
| 创始人壁垒 | 模型之外的低语——客户未言明的需求是超额收益来源 |

> **金句 · Pedro Franceschi（封底）**
> **中文：** 你正站在人类历史两百年的时间线上——惊叹于我们此刻所处的可能性。
> **原文：** You are standing on a two-hundred-year timeline of human history — marvel at the possibilities we have at this moment.

---

## 相关阅读

- [[OpenAI首席科学家-超越代码的强化学习]]
- [[Anthropic团队-如何构建运行数小时的Agent]]
- [[OpenAI员工-上下文工程和Agent记忆]]
