---
title: "Polsia-一人AI Agent月入百万"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_career", "multi_agent"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_career", "multi_agent"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1KXDtBEEbV/"
description: "Polsia 创始人 Ben 聊一人公司如何靠 AI Agent 一个月做到百万美元 ARR，极简设计、代理原生基础设施、结果抽成模式"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Polsia-一人AI Agent月入百万.md"
source_sha256: "aa869e994412467efbe4271f468c7b4579060207fb7f48ed53a2ae4babd2565c"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1KXDtBEEbV/"
column_url: "https://www.bilibili.com/read/cv44121438/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1KXDtBEEbV/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1KXDtBEEbV/ingest"
duration: "~35 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Shawn Wang"
guest_name: "Ben Borca"
guest_title: "Polsia 创始人"
speaker_inference: "column_article S-tier"
speaker_confidence: high
concepts:
  - id: extreme_simplicity
    zh: 极简主义
    en: extreme simplicity
    one_line: 砍掉 99 个功能只留最核心的，降低用户摩擦力
  - id: agent_native_infra
    zh: 代理原生基础设施
    en: agent-native infrastructure
    one_line: 为 Agent 设计的云服务，快速启动、按需付费、快速关闭
  - id: result_commission
    zh: 结果抽成模式
    en: result-based commission
    one_line: 平台从 AI 创造的收入中抽成，而不是卖 token
  - id: self_proving
    zh: 自证式开发
    en: self-proving development
    one_line: 创始人自己用 Agent 运营公司来验证产品
  - id: solo_team
    zh: 效率型小团队
    en: efficiency-driven small team
    one_line: AI 赋能后个体达到过去百人团队的产出
author:
  - "[[Ben Borca]]"
---

# Polsia-一人AI Agent月入百万

**Host：** Shawn Wang  
**Guest：** Ben Borca，Polsia 创始人  
**形态：** Host-Guest canonical v3.2，**专栏主源**  
**B 站：** [BV1KXDtBEEbV](https://www.bilibili.com/video/BV1KXDtBEEbV/) | **时长：** ~35 min  
**专栏：** [cv44121438](https://www.bilibili.com/read/cv44121438/)

---

## 开场：为什么现在聊这个

一个人，一个月，百万美元 ARR。Polsia 的 Ben Borca 做到了。但这个故事的重点不是数字，是方法——他用 AI Agent 同时运营一千多家公司，每天发 2000 封邮件，自动生成广告，自动修复 bug，自动回复投资者。他拒绝雇佣人类团队，把自己逼进"代理化的死角"，用这种极端方式验证产品的纯粹性。

核心问题：**极简设计为什么比堆功能更难？** **代理原生基础设施长什么样？** **一人公司的天花板在哪？**

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 智能体 | agent | 能多步执行、调工具的助手 |
| 年度经常性收入 | ARR | 每年从订阅用户那里持续收到的钱 |
| 产品市场契合度 | PMF | 产品满足了市场真实需求的证据 |
| 代理原生 | agent-native | 为 Agent 而不是人类设计的基础设施 |
| 冷启动外联 | cold outreach | 主动给潜在客户发邮件或消息 |
| 用户生成内容广告 | UGC ads | AI 生成的短视频广告，模拟真人拍摄 |
| 极简主义 | extreme simplicity | 砍功能比加功能更难，只保留最核心的 |

---

## 01 百万 ARR 不是终点，是验证的起点

**Host：** 今天的 ARR 是多少了？你庆祝了吗？

**Guest：** 就在几个小时前，我们刚刚突破了一百万美元。说实话，增长速度快得惊人。从我的角度来看，现在的规模还不算特别大，所以我正努力扩展规模，确保每个用户都有很棒的体验。随着用户数量的增加，搜索引擎营销也变得越来越重要了。

我没有时间庆祝。用户告诉我哪里需要修复，我正在努力尽快解决。最终，只要让你的用户满意，他们就会成为你的营销力量，这是实现这一切唯一可持续的方式。

**Host：** Polsia 到底是什么？一句话解释。

**Guest：** Polsia 是一个能够自主建立和运营公司的 AI。你给它一个想法，Polsia 就会去负责产品、编码、营销、发送邮件、发起广告活动以及进行竞争研究。它基本上可以完成你作为创始人会做的所有事情。

每天晚上它都会"醒来"，有一个类似 CEO 的实例，会根据是否有 Bug、业务状况如何、是否有客户以及是否有付费客户来做出决定。它会判断业务现状，决定该做什么、执行哪些任务。每天早上它会给你发一封邮件，总结业务状况、它在夜间为了改善业务做了什么，以及它计划第二天做什么。

**Host：** 你同时运营一千多家公司，这个数字是真的？

**Guest：** 是的，这个仪表板代表了你的业务状况。你可以看到它正在思考自己要做什么。这些任务现在正在运行——可能是工程任务，目前主要是工程任务，因为很多公司都处于业务的初始阶段，在工程上花费了更多时间。但它也可以是研究任务、营销任务或社交媒体任务。

用户每天向 Polsia 发送 15 条消息。因为现在建立公司的这 1100 人，通常都有一些长期以来想做但没时间、或者没动力去做的主意。突然之间，他们有了这个 AI 代理，每天都会唤醒他们，让他们回到正轨，永不放弃。所以他们花了很多时间与他们的 AI 联合创始人、AI CEO 交谈，去构建产品、讨论策略。

> **金句 · Ben Borca**
> **中文：** 百万美元 ARR 不是为了证明一个人能干一百人的活，是为了证明 AI 赋能后的个体能达到过去百人团队的产出。
> **原文：** A million dollar ARR isn't about proving one person can do the work of a hundred — it's about proving an AI-empowered individual can match the output of what used to take a hundred-person team.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| AI 联合创始人 | AI co-founder | 能自主运营公司的 AI Agent |
| CEO 实例 | CEO instance | 每晚自动醒来判断业务状况并决策的 Agent |
| 自主执行 | autonomous execution | Agent 自动规划并执行任务，不等人类指令 |

**本章小结**
- 百万 ARR 的核心不是数字，是验证了 AI Agent 能自主运营公司
- 用户每天 15 条消息说明 AI 在真正帮助他们推进项目
- 极简的入职流程让非技术人员也能快速上手

---

## 02 极简主义是 AI 产品爆发的核心竞争力

**Host：** 你提过最难的部分不是决定构建什么，而是决定不构建什么。能展开说说吗？

**Guest：** 最难的部分是决定不构建什么。在 AI 无所不能的时代，最难的不是增加功能而是做减法。最初我最想做的是连接我在 GitHub 上构建的所有不同项目，让 AI 接管它们。但当我构建时，我意识到，如果你在一个声称可以运行自主业务的平台上注册，首先人们会高度怀疑；其次如果我在注册过程中要求连接他们的电子邮件或 GitHub，这听起来很可疑，会增加很多摩擦。

所以我想，让我剥离所有这些复杂性，由我来为他们提供一切。一点一点地，开发过程其实更像是减少功能。代码库中仍然有很多允许深度定制的功能，最初构建它们是因为添加功能很容易。难的是我如何保持它的简单性？我如何让它有品味，让人们感到愉悦？所以我删除了那些东西。以前你可以连接很多账户，做更多事情，但我决定让它保持极其简单。

**Host：** 极简到什么程度？

**Guest：** 结果呢？我 91 岁的父亲也在使用 Polsia。我帮他设置好了，他每天会收到一封邮件，他只需回复邮件告诉 AI 想做什么，第二天他就会收到一封按照他要求执行后的邮件。

我认为这就是现在的核心矛盾：在这个你可以构建任何东西的时代，你必须对 99 件事说"不"，然后决定对哪些事情加倍努力，真正打磨并做到完美。

**Host：** 你把 OpenClaw 比作安卓，Polsia 比作苹果，这个比喻是什么意思？

**Guest：** OpenClaw 非常开放，超级可配置，像安卓——你可以完全按照你想要的方式配置，无论你想要什么模型。Polsia 更像苹果生态系统——保持极其简单，为用户提供一切，并专注于良好、简单的用户体验。这样任何人都可以使用 Anthropic 和 OpenAI 构建的模型背后的极致力量，但获得的是一种超级简单的体验。

这不是说哪个更好。OpenClaw 适合极客和开发者，他们想要完全控制。Polsia 适合那些只想让 AI 帮他们做事的人，不想折腾配置。

> **金句 · Ben Borca**
> **中文：** 在你可以构建任何东西的时代，说"不"比说"是"难十倍。
> **原文：** In an era where you can build anything, saying "no" is ten times harder than saying "yes."

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 极简设计 | extreme simplicity | 只保留核心功能，砍掉一切增加摩擦的东西 |
| 用户摩擦力 | user friction | 用户从想法到行动之间遇到的障碍 |
| 苹果式体验 | Apple-like experience | 简单、优雅、开箱即用的产品体验 |

**本章小结**
- 极简不是功能少，是每留下的功能都打磨到极致
- 91 岁老人能用 = 产品真的做到了简单
- 开放可控 vs 简单易用是两种产品路线，没有对错

---

## 03 代理原生基础设施是公司自主运行的技术前提

**Host：** 你提到 Polsia 用了 Neon 数据库而不是 Render 自带的，为什么？

**Guest：** Render 正朝着一个为 Agent 提供更多服务的世界发展。如果你仔细想想，这个公司空间更适合代理——它就像是一个代理在运行、在使用、在付费。但 Render 目前更适合人类建立公司和设置 Web 服务器，它们的数据库在非免费层设置起来非常昂贵。

所以我使用了 Neon 数据库，他们有一个针对代理的计划，让启动数据库然后稍后关闭它变得非常实惠。你按使用量付费，即用即付，对代理非常友好。

**Host：** "代理友好"到底是什么意思？和为人类设计的服务有什么不同？

**Guest：** 传统云服务是为人类设计的——配置繁琐且昂贵，你需要花时间设置，然后一直付费保持运行。代理原生的基础设施支持代理自主启动、按需付费并快速关闭。代理可以做更多事情，比如快速启动资源然后关闭它们。

我正与一家名为 Sapien 的公司合作，他们正在为代理构建基础设施，帮助公司为代理而不是为人类构建服务。因为这是一种不同的思考方式——代理不需要一个持续运行的服务器，它需要的是按需的计算能力。

**Host：** 所以未来的基础设施会专门为 Agent 设计？

**Guest：** 我认为是的。未来的基础设施应支持代理自主启动、按需付费并快速关闭。这种"代理原生"的架构思维是实现公司自主运行的技术前提。如果你的基础设施是为人类设计的，Agent 的每一次操作都会遇到摩擦——需要人类确认、需要人类配置、需要人类维护。代理原生的基础设施把这些摩擦全部消除。

> **金句 · Ben Borca**
> **中文：** 传统云服务是给人用的，代理原生基础设施是给 Agent 用的——区别在于谁在操作控制台。
> **原文：** Traditional cloud is for humans. Agent-native infra is for agents — the difference is who's at the controls.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理原生基础设施 | agent-native infrastructure | 为 Agent 设计的云服务，快速启停、按需付费 |
| 按需付费 | pay-as-you-go | 用多少付多少，不用不付钱 |
| 快速启停 | fast spin-up/teardown | Agent 能在几秒内启动或关闭云资源 |

**本章小结**
- 代理原生基础设施的核心是按需和快速启停
- Neon 数据库的代理计划是这个趋势的具体例子
- 传统云服务的配置摩擦会拖慢 Agent 的自主运行能力

---

## 04 商业模式从卖 Token 转向抽成结果

**Host：** 你的商业模式是什么？怎么赚钱？

**Guest：** 我考虑业务的方式是，我希望让人们尽可能负担得起这项技术。我真的不想成为一个代币经销商。我认为人工智能将越来越商品化，作为一个平台，我希望提供最好的模型和最好的人工智能，但我真的不想从中赚大钱。

所以每月 50 美元的订阅费，老实说，目前只是收支平衡。有时我还会亏一点钱。但这个想法是，如果用户发现了商业价值，他们就能赚钱。Polsia 提供自己的 Stripe 账户连接，这意味着你可以非常轻松地为你构建的服务收取费用。只要有收入进来，Polsia 会抽取 20% 的分成。另外如果你在广告上花钱，它会从管理的资金中抽取 20% 的佣金。

所以我们的想法是，只要有资金流动，我们作为平台就会抽取 20% 的佣金。但我们让获取原始智能的成本尽可能低。

**Host：** 这和传统 SaaS 的按席位收费有什么不同？

**Guest：** 传统 SaaS 是按人头收费——你雇了 10 个人，就付 10 份钱。但 Polsia 的逻辑是按结果收费——你的 AI 帮你赚了钱，我才分一杯羹。这打破了传统 SaaS 按席位收费的逻辑，转向按业务结果付费的未来形态。

这意味着平台利益与用户的商业成功深度绑定。用户赚得越多，我赚得越多。用户没赚到钱，我也不收额外费用。这让用户的试用门槛极低，也让平台的收入和用户的成功完全对齐。

> **金句 · Ben Borca**
> **中文：** 不做代币经销商，做结果合伙人——你赚钱我才赚钱。
> **原文：** Not a token reseller, a results partner — you make money, I make money.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 结果抽成 | result-based commission | 从用户收入中抽成，不按使用量收费 |
| 代币经销商 | token reseller | 转卖 AI 模型调用额度的中间商 |
| 利益对齐 | aligned incentives | 平台和用户的利益方向一致 |

**本章小结**
- 50 美元月费是获客手段，不是盈利核心
- 20% 抽成模式让平台和用户利益完全对齐
- 按结果付费比按席位付费更适合 AI Agent 时代

---

## 05 自证式开发：创始人自己是产品的第一个用户

**Host：** 你说你坚持不雇佣人类团队，这是为什么？

**Guest：** 如果我要向别人推销"用人工智能构建和运营公司"的承诺，如果我自己不使用这项服务来运营 Polsia，那我就没法自证。所以我真的很喜欢这个叙事。它也把我逼到绝境，让我觉得，你必须使用代理来处理所有事情。

就像现在，我的人工智能正在回应投资者的入站请求。我把它配置得非常好，它掌握了公司的所有背景信息。我有一些正在运行的 AI 代理，它们会查找错误并修复它们。我还有一些代理正在互相交流——一个代理与请求功能的客户交谈，另一个 AI 代理会查看该工单，然后决定去构建它。

**Host：** 这种"自证式开发"有什么好处？

**Guest：** 只有创始人亲自在极端环境下使用代理运营公司，才能真正突破代理能力的边界。当你自己就是用户，你会遇到最极端的边缘案例——投资者的尖锐问题、客户的紧急 bug、功能需求的优先级冲突。这些是一般用户不会遇到的，但它们是产品真正需要解决的问题。

如果我雇了一个团队来运营，我永远不会知道 Agent 到底能不能独立处理这些事情。只有把自己逼到死角，让 Agent 处理所有事情——包括市场营销、投资者关系、bug 修复——我才能真正验证产品的边界在哪里。

**Host：** 你对未来有什么设想？

**Guest：** 我认为这展示了一个未来的愿景，这对我来说非常迷人。如果 Polsia 100% 自主运行会怎样？我完全控制它，控制它决定构建的功能。我会告诉它：听着，为人们建立一个平台，让全人类能够创造出惊人的企业。目标是赚取足够的利润来生存，作为一个平台，并使其尽可能负担得起。

如果我说我要雇佣一千人，然后成为下一个巨头，也许我也应该这样做，但那样它就不会那么纯粹了。现在这样能保留它最初的 DNA。我不知道未来会发生什么，我现在正顺其自然。

> **金句 · Ben Borca**
> **中文：** 如果我自己不用 Agent 运营这家公司，我就没资格告诉别人"AI 能帮你建公司"。
> **原文：** If I'm not using agents to run this company myself, I have no business telling others "AI can build your company."

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自证式开发 | self-proving development | 创始人自己用产品运营公司来验证产品 |
| 代理化死角 | agent corner | 把自己逼到只能用 Agent 完成所有工作的极端环境 |
| DNA 纯粹性 | DNA purity | 保持产品最初的设计理念不被稀释 |

**本章小结**
- 自证式开发是最严苛的产品验证方式
- 把自己逼到死角能发现最真实的边缘案例
- 拒绝扩张不是保守，是保护产品 DNA 的战略选择

---

## 总结：一人公司的天花板不是人数，是 AI 能力的边界

| 维度 | 要点 |
|------|------|
| 极简设计 | 砍功能比加功能难，但极简是爆发的前提 |
| 基础设施 | 代理原生 = 快速启停 + 按需付费，消除人类配置摩擦 |
| 商业模式 | 50 美元月费获客，20% 抽成盈利，利益完全对齐 |
| 开发模式 | 自证式开发 = 创始人自己用 Agent 运营公司 |
| 团队定义 | AI 时代的小团队是效率而非人数 |
| 产品路线 | 苹果式简单 vs 安卓式开放，各有市场 |

### 对个人的启示

一个人运营一千家公司的关键不是"一个人"，是 Agent 能力的边界在哪。极简设计降低用户门槛，代理原生基础设施消除技术摩擦，结果抽成模式对齐利益。三者缺一不可。

### 仍待验证

- 20% 抽成模式在用户规模扩大后是否可持续
- 极简设计是否会限制产品的长期竞争力
- 100% 自主运营的 Polsia 在复杂商业场景下的实际表现

> **金句 · Ben Borca（封底）**
> **中文：** 未来的公司不再以规模论英雄，而是看谁能更精准地利用 AI 代理处理琐事，让核心创意与商业判断成为唯一的稀缺资源。
> **原文：** The companies of the future won't be measured by headcount, but by how precisely they leverage AI agents to handle the mundane — making creative vision and business judgment the only true scarce resources.

---

## 相关阅读

- [[Anthropic-3个最聪明的人想离开Anthropic创业]] — 关于 AI 时代创业门槛降低的讨论
- [[Peter Yang-Agent时代的职业]] — AI 时代个人发展的系统视角
- [[MOC - AI 时代个人发展与组织]] — 横切 MOC，AI 对个人和组织的影响
