---
title: "Vercel COO：2026 世界级 GTM 与推广工程师"
tags: ["ai_agent", "video_transcript", "bilibili", "fde", "ai_career", "context_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "fde", "ai_career", "context_engineering"]
created: "2026-07-08"
source: "B站视频 - Easonlee的AI笔记"
description: "Jeanne Grosser：GTM 整合生命周期、市场推广工程师 10x SDR、DealBot 自建代理、GTM 即产品、80% 购买为避痛、细分 XY 轴、销售像产品经理。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Vercel COO-2026世界级GTM与推广工程师.md"
source_sha256: "be616583cc5e6311968a04b135a017966742b6f5c85611a9b300a99507145615"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV14jrKBcEav/"
column_url: "https://www.bilibili.com/read/cv44757109/"
host_name: "Lenny Rachitsky"
guest_name: "Jeanne Grosser"
guest_title: "Vercel COO · 前 Stripe CPO"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV14jrKBcEav/ingest"
speaker: "Jeanne Grosser"
duration: "~90:00"
saved: 2026-07-08
updated: 2026-07-08
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV14jrKBcEav/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV14jrKBcEav/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical (podcast)
speaker_inference: "column keynote"
speaker_confidence: high
concepts:
  - id: gtm_engineer
    zh: 市场推广工程师
    en: GTM engineer
    one_line: 把 GTM 工作流编码为 AI 代理
  - id: gtm_as_product
    zh: GTM 即产品
    en: GTM as product
    one_line: 购买旅程每步独特增值，非交易推销
  - id: dealbot
    zh: DealBot
    en: DealBot / LostBot
    one_line: Gong+Slack 洞察丢单原因与实时交易风险
  - id: pain_avoidance_buying
    zh: 避痛购买
    en: pain/risk avoidance buying
    one_line: ~80% 决策为避免痛苦或降风险
  - id: segmentation_axes
    zh: 细分多轴
    en: multi-axis segmentation
    one_line: 规模 × 增长 × 商业模式 × 流量
author:
  - "[[Jeanne Grosser]]"
---

# Vercel COO：2026 世界级 GTM 与推广工程师

**Host：** Lenny Rachitsky（Lenny's Podcast）  
**Guest：** Jeanne Grosser（Vercel COO · 前 Stripe CPO）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 播客）  
**B 站：** [BV14jrKBcEav](https://www.bilibili.com/video/BV14jrKBcEav/) · **时长** ~90 min

---

## 开场

**Lenny：** Jeanne 管 Vercel 全链路触客——营销、销售、客成、RevOps、现场工程。AI 时代十家公司抢同一机会，**怎么推向市场**比以往更战略。你的销售团队试金石：10 个工程师面前，**10 分钟内看不出你不是产品经理**。

**Jeanne：** 我收到很多 GTM 求助；有了 AI，需求更强烈——**将产品推向市场并与竞争对手区分开来的能力，比以往任何时候都更具战略重要性**。GTM 不再只是矛尖，而是**整合生命周期** + **代理重写工作流**。

**Lenny：** 很多人把 GTM 当产品——卖的是体验，不是功能列表。Jenna Abel 说：别只讲痛点，要讲**如何超越竞争对手**。

**Jeanne：** 我们喜欢谈可能性，但企业买的是**避免下季度不达标的风险**。如果产品在商家层面差异不大，**被销售的体验** increasingly 决定购买——你需要创造**非常独特的购买旅程**。我的超能力：建一个让工程师感觉不像销售部门的销售团队。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| GTM | go-to-market | 触客到收钱的全职能 |
| GTM 工程师 | GTM engineer | 技术背景，工作流→代理 |
| SDR / AE | SDR / AE | 线索开发 vs 成交 |
| PLG | product-led growth | 产品自助获客，有上限 |
| Rosling 计划 | Rosling program | Stripe 时代「公司宇宙」+ 填空邮件 |

---

## 01 GTM 定义与咨询式演进

**Lenny：** 「市场推广」到底指什么？近几年最大变化？

**Jeanne：** 狭义是营销+销售；我指**一切触客或创造收入**的职能——营销、销售、SE、客成、支持、伙伴。过去维恩图各干各：细分框架略不同、目标略不同。现在要**整合成一条生命周期**；GTM 高度专业化出 ~**17 种角色**，很多会**合并**。从认知到五年 LTV，像规划产品一样规划全过程。

**Lenny：** 初创谈 GTM 多半先销售，PLG 公司先营销？

**Jeanne：** 看产品。很多 PLG 起盘，需要销售辅助再 sales-led；或反过来。关键是**全旅程当产品规划**。

**Lenny：** Stripe、Vercel 这些年 GTM 最大变化是什么？

**Jeanne：** 消费型商业模式让 GTM 更**咨询式**——落地只是开始，要深懂客户把需求对齐产品。AI 时代客户知要变，不知变成什么；**前置部署工程**：进你环境并肩干活，反馈给产研——什么该产品化、什么留专业服务。真正融入客户，而不只是成交离场。

**Lenny：** 这和传统交易型销售差在哪？

**Jeanne：** 从交易型转向关系型。你必须更深入了解客户需求，才能把需求与产品对齐——现在每个人都知道要变，但不一定知道变成什么，无论面向客户的产品还是内部工作流。GTM 组织 increasingly 像顾问：探索可能性、最佳实践，帮你思考问题。

> **金句 · Jeanne**
> **中文：** GTM 应成为真正整合的生命周期，而不是重叠的维恩图。
> **原文：** GTM should become a truly integrated lifecycle, not overlapping Venn diagrams.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 前置部署 | forward-deployed | 现场理解再反馈产品 |
| 生命周期 GTM | lifecycle GTM | 获客→扩展一条链 |
| 角色合并 | role consolidation | AI 压缩专岗 |
| 17 种 GTM 角色 | GTM specialization | 高度专业化后回归合并 |

**本章小结**

- GTM = 一切触客/创收职能，非仅营销+销售
- 从维恩图各干各 → 整合生命周期；~17 专岗将合并
- 消费商业模式 + AI 时代 → 咨询式、前置部署工程
- 全旅程当产品规划：认知 → 五年 LTV

---

## 02 市场推广工程师与 10x SDR

**Lenny：** 市场推广工程师做什么？和 2017 Stripe 的 Rosling 有何不同？

**Jeanne：** Stripe 推外展 SDR 时全公司**只有 4 个 SDR**（外面 30 个）。运营原则是效率就是杠杆。我们建 **Rosling**：地球公司数据库，每行公司、每列属性，**填空模板**邮件——知道对方是 marketplace 就推 Connect 等。2017 很难，误报高；现在在 Vercel **重做，真管用**——有数据科学家 + **GTM 工程师**，用 Vercel Workflow 把人工流程编码成**半确定性代理**。

**Lenny：** 2017 做 Rosling 的人现在在干嘛？

**Jeanne：** 有趣——当时做这些事的人在 OpenAI、Anthropic 工作，也在做 GTM 工程。Ben Saltzman 去了 ZoomInfo，最近创 GTM 初创，把公司宇宙产品化 + AI 叠加——观点是未来可能无需外展，AI 自动公司-产品匹配。

**Lenny：** 具体效益？10 SDR 变 1 个怎么回事？

**Jeanne：** GTM 工程师**遍历每个职能的工作流→代理化**。我们从**入站**做起：代理判线索是否 qualified、写什么回复；人审核后发送。10 个 SDR → **1 个代理质检员** + 9 人调外展；**六周**完成，建代理的人只花 25–30% 时间。KPI 不变：线索→商机转化、触达次数、周期——**转化率持平，触达更少、响应更快**（夜间线索不排队）。

**Lenny：** 销售与人时间占比目标？

**Jeanne：** 行业 20 年报告：销售人员**30–40% 时间面对客户**。目标 **70% 与人互动**——研究跟进交给代理。流程：GTM 工程师跟随该职能**表现最好的人**，看七个标签页、LinkedIn、ChatGPT、数据库——然后让代理做判断，人审核发送。在我从事销售的 20 年里，这个比例一直在 30–40%——大部分时间并不在与人交流。我认为我们正达到临界点：引入代理后，销售人员最终能将 **70% 时间用于与人互动**；代理完成更程式化、不需要你全部人类能力的研究和跟进，让你更深入服务客户。

**Lenny：** 六周 10→1，KPI 怎么验证没翻车？

**Jeanne：** 整个过程中跟踪 SD R 负责的所有 KPI：潜在客户→商机转化率、所需接触次数、转化时间。我们**保持转化率不变**——代理表现和人工一样好；实际上**缩短转化时间**，因为响应快得多，避免夜间线索排队无人处理。那就是我们知道可以调走九个人、转外展的时候。构建者只花 25–30% 时间，六周就自信从 10 人缩到 1 人——不是多季度项目，进展非常快。现在让代理经理与代理合作，直到准备好进一步放手。

**Lenny：** 担心收到更多烂邮件吗？

**Jeanne：** 我们的流程**始终有人工参与**。从 GTM 工程师跟随表现最好的人开始——看七个标签页、LinkedIn、读公司信息、ChatGPT 处理、数据库查属性——这样构建初始工作流。入站例：代理判断 qualified 与否、决定说什么；深入研究、从数据库提取信息、撰写回复——**人审核所有内容并点击发送**。我们仍在训练代理：整合被拒绝内容的反馈。尚未到足够频繁自动批准的阶段——要确保符合品牌、有针对性。

**Lenny：** AI SDR 会取代人吗？

**Jeanne：** 重复、可写的潜在客户开发会占一大块；**深度企业**多层级、多 BU 三角定位还要人。没人读大学为了当 SDR——应直接上外展或 SMB 成交，**提升价值链**。

**Lenny：** 很多听众不是销售出身——SDR、AE 到底各干什么？上面还有什么角色？

**Jeanne：** SDR 负责**生成线索**：把潜在客户带到「值得投入销售流程」的程度。两种——**入站 SDR** 接网站填表的人，先做首通确认值不值得更贵的 AE 接手；**出站 SDR** 在你想增长快过入站需求时主动出击，此时你对 PMF 已有看法，去激发原本没主动来的人的兴趣。**AE 是成交者**：把「我有个真问题、对你感兴趣」的人，转化为「我相信你的产品最合适、愿意付费」。AE 按细分从 SMB（单一决策者、偏交易型）做起，往上到 MM（经济买家+技术买家），再到 Enterprise（采购、委员会、10 人参与、帮客户降迁移风险）——协调越来越复杂。

> **金句 · Jeanne**
> **中文：** 入站代理年运行约 1000 美元；之前 SDR 职能薪资超 100 万美元。
> **原文：** The inbound agent runs about $1,000 a year — we were paying over $1 million in SDR salaries.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理经理 | agent manager | 人监督代理输出质量 |
| 入站优先 | inbound-first automation | 流程清晰先自动化 |
| 价值链上移 | move up the value chain | SDR 转外展/AE |
| Rosling 公司宇宙 | company universe DB | 每行公司、每列属性 |

**本章小结**

- GTM 工程师 = 分解工作流 → 半确定性代理；前 SE 转型
- Stripe Rosling 2017 失败 → Vercel 2024+ AI 重做成功
- 6 周 10 SDR→1 质检；转化率持平，响应更快
- 目标：销售 70% 时间面对客户；SDR 价值链上移

---

## 03 自建 DealBot 与 buy vs build

**Lenny：** Gong 上跑 DealBot——丢单分析颠覆认知？

**Jeanne：** **LostBot**：Q2 最大丢单，销售说价格是原因；代理扫 Slack+邮件+Gong——**从未触达经济买家，ROI 对话对方不认同**，根因是价值未量化。现 **DealBot 实时**：Slack 客户频道提示「还没谈 EB」「刚通话语气不对，建议跟进」。迭代极快时代，代理还诊断**异议处理 bug**，像 eng sprint 修 GTM playbook。

**Lenny：** 航空公司例子——支持电话转录找「为什么下周还会打来」？

**Jeanne：** 对。AI 承诺：做我们甚至没想到或做不到的事。大客户谈 AI 支持降本；更有趣的是高管问：转录每个支持电话，**他们为什么打来、怎么让下周更少**——比人工在 CRM 选状态快得多。

**Lenny：** 自建秘诀？市面一堆 GTM AI。

**Jeanne：** **构建不难不贵**——DealBot 初版 **40 小时**；LostBot 两天即兴完成。潜在客户代理 **~1000 美元/年** vs 百万薪资——总成本降低幅度巨大。领域早，**你的上下文与 workflow 才是杠杆**；采购 20 个窄工具 vs 一个内部平台。客户部署 AI 时最大问题往往是**采购流程**——每个人都有 AI 任务，像空白支票；我听说 **ERR（实验性运行率收入）**：试用一年再决定留不留，但要采购 20 种不同东西，因为大多数产品刚起步、问题相对狭窄。

**Lenny：** 什么时候 buy，什么时候 build？

**Jeanne：** 由于工具大量涌现，你会陷入长期问题：20 个工具做 20 项任务，而不是一个集成平台。但**特定工作流程**——你的 Slack 怎么组织、Gong 怎么接、客户频道结构——值得自己 build 一个代理。CIO 将 increasingly 从软件采购者变为**组织内 1000 代理的开发者**。我现在还不确定最终形态，但肯定：**自己试一下有价值**，可能比你想象容易得多，很快获得回报。

**Lenny：** 用什么平台快速 build？

**Jeanne：** 我们的 SE 都有 CS 学位，直接写代码。代理在 Vercel 上构建：AI Gateway 调用不同模型；不受信任代码有 Sandbox；Workflow 构建流程；弹性计算按需使用。Vercel 市场推广工程团队能轻松 build，因为平台让用我们的框架找基础设施、**快速投入生产**变得非常容易——Vercel 用 Vercel 构建 Vercel，找产品缺口或了解客户要什么。

**Lenny：** ideal 第一位 GTM 工程师？

**Jeanne：** 前三位是**技术型 SE**（前端开发转销售）。质检时发现代理学的是「最好 SDR（两年经验）」，**20 年销售的我不会那样写**——要么做过销售懂 best practice，要么恶补销售科学。在 Vercel AI 云、Workflow SDK、AI Gateway、Sandbox 上 **dogfood**——Vercel 用 Vercel 建 Vercel。

> **金句 · Jeanne**
> **中文：** 代理做我们没想到或做不到的事——这才是 AI 的承诺。
> **原文：** AI will do things we didn't even think of or couldn't do — that's the promise.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| ERR | experimental run rate | 试用 AI 工具的采购新常态 |
| 失败机器人 | LostBot → DealBot | 从复盘到实时 coaching |
| Dogfood | eat your own dogfood | Vercel 用 Vercel 建 Vercel |
| 上下文杠杆 | workflow context leverage | 自建因你的数据/流程不可替代 |

**本章小结**

- LostBot 揭穿「丢单因为价格」→ 实为未触达 EB、ROI 未量化
- DealBot 实时 Slack coaching；异议处理像 eng sprint 修 bug
- 自建便宜快：DealBot 40 小时；入站代理 ~$1000/年 vs $1M 薪资
- 理想 GTM 工程师：SE 背景 + 销售 best practice；先 shadow 顶尖再代理化

---

## 04 GTM 即产品：旅程而非推销

**Lenny：** 「把 GTM 当产品」什么意思？

**Jeanne：** Gmail 2004 我入职——技术差一代就能赢；十年后云让软件商品化，**产品差不大时，被销售的体验决定购买**。要**独特购买旅程**。Stripe 第一次会不是电话审问，而是**白板画支付架构**——客户学到自己的栈，离开时有资产、觉得合作方靠谱。Vercel 触客给**网站性能 vs 同行**洞察——买不买都有价值；丢单客户**三四年后再回来**我见过九年。

**Lenny：** 有效策略还有什么？

**Jeanne：** 挖**独特数据洞察**（Core Web Vitals、MCP/AEO 教育）；大客户要**行业 blueprint** 非泛文档——Lyft/DoorDash 用 Stripe，卖 market 要说「market setup 最佳实践」不是「去看 doc」。创始人 sales：**好 discovery**——说话少于一半，五个为什么，别客户一问就跳进解决方案。

**Lenny：** 80% 购买为避痛——对创始人意味着什么？

**Jeanne：** 大概数字：**80% 购买为避免痛苦或降风险**，不是追愿景。初创爱讲可能性；企业要讲**风险**——怕下季度不达标、被竞品超、品牌损。建立一点点担忧：我可能没处于有利位置，而你可以帮我降险。April Dunford 说的职业赌注也对：引入 Stripe/Vercel 级产品，进展不顺会损害职业生涯——很多购买决策是「我只是不想搞砸」。Jenna Abel 说专注如何超越竞争对手——**超额收益叙事 + 降险叙事**可以并存，但企业买单 often 后者更重。

**Lenny：** 创始人 discovery 常犯什么错？

**Jeanne：** 创始人对谈产品非常兴奋——你问一个问题，他们就找切入点「哦我能帮你解决」。优秀销售人员**说话时间远少于一半**，提问、探究，帮客户自己得出结论。学会**五个为什么**深入探究，而不是立即进入解决方案模式。客户提问，你先反问再回答。Stripe 市场团队极擅长：Lyft、Instacart、DoorDash 都用 Stripe——卖 Connect 时别说「去看 doc」，要说「market setup 最佳实践是什么」——每个市场都在用 Stripe，客户要的是**行业 blueprint**，不是泛文档。

**Lenny：** Vercel 的性能洞察、AEO 教育——具体怎么建立信任？

**Jeanne：** Core Web Vitals 任何人可查，但我们帮客户做**与同行基准对比**——一直做得很好。另一块是 MCP 服务器、何时合理使用——流行但人们不知如何在产品中考虑。AEO（答案引擎优化）与 Vercel 有点切线：我们提升性能 → 性能驱动 SEO → SEO 是 AEO 输入；我们深入研究 AEO 并分享见解，AMA 和内容里客户觉得：这家很有洞察力，我可以学习——即使当下不买，也会多关注，等触发点出现再研究 Vercel 某方面。

> **金句 · Jeanne**
> **中文：** 创造让客户感觉非常独特的购买旅程。
> **原文：** Create a buying journey that feels uniquely valuable to the customer.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 白板 discovery | whiteboard session | 第一次会面共创架构 |
| 无论是否购买都增值 | value regardless of close | 信任与延迟转化 |
| 五个为什么 | five whys discovery | 让客户自己得出结论 |
| 80% 避痛购买 | pain/risk avoidance | 降险 > 追愿景（企业） |

**本章小结**

- GTM 产品化 = 旅程每步人性化、独特增值
- Stripe 白板架构、Vercel 性能基准——买不买都有收获
- 行业 blueprint > 泛文档；discovery 说话 <50%
- ~80% 企业购买为避痛/降险，非追愿景

---

## 05 细分、PLG 与销售文化

**Lenny：** 细分市场怎么入门？

**Jeanne：** 划分公司世界以便**不同买法**。经典：SMB（单一决策者）/ MM（小团队）/ Enterprise（委员会、采购、10 人参与）。Stripe 加 **Y 轴增长潜力**（消费业务 200% vs 8% 增长——投更多时间抢 200% 的）；再加**商业模式** B2B/B2C/platform/marketplace——B2B 要商业支付/ACH，B2C 要 Apple Pay，marketplace 要 Connect。Vercel：**Crux 流量排名**（Chrome 数据）——OpenAI ~3000 人仍是 MM 规模，但 Top25 流量→当 Enterprise 打；叠加**工作负载**（电商谈产品列表页/订单管理，crypto 在 AWS 跑八个服务）。

**Lenny：** 用 XY 轴还是五列电子表格？三个属性够吗？

**Jeanne：** X（规模）Y（增长）有值得称道之处——规模在多数购买决策里起作用，消费行为如今普遍。但入职 Vercel 第一件事：和首席数据科学家 Abhi 坐下问「什么驱动 revenue？事前哪些方面判断客户付 **10 万还是 100 万 ACV**？」再做**回归分析**：哪些属性 cluster 反复赢？结论是 Crux 排名 + 工作负载类型很重要。**超过三个属性就太详细**——你不会给五个细分各放一个销售人员。KYC（了解你的客户）是我给每位新员工入职第一周必讲的——**细分是公司级，不是 GTM 独享**；新 PM 构建产品时就该想「这针对企业还是初创」。

**Lenny：** PLG 还 valid 吗？何时加销售？

**Jeanne：** PLG 初期对很多产品仍对；**上限**——自助很难给你 100 万刀。想维持增长、deal 变大，**销售加太晚**会卡——可复制 outbound 引擎要时间。几乎**每家最终都要销售组织**。Vercel 增长主要靠 PLG，Stripe 也是；人们常犯错误是 PLG **有上限**——不会通过自助流程给你一百万美元。某个时点若要维持增长率，交易规模必须越来越大；建立可复制销售流程 takes time，尤其 outbound 转可预测引擎。

**Lenny：** 招第一位销售的常见建议是 ARR ~100 万、有可复制流程再教人——对吗？

**Jeanne：** 差不多对。创始人得先与客户紧密联系、做到某种**可复制性**。有件事不是所有创始人都做对：创始人本身是了不起的销售——说服了 VC、天使投巨资，显然会激励人购买。但如果 ARR 到 100 万而客户群彼此毫无相似，销售仍是**布道式、创始人主导**；只有当你能说「我有 ICP 了——员工少于 100 人、通常构建 SaaS 的初创」这种能写下来的东西，才准备好放手。放手要**真放手**：赋能新人——你的内容是什么、问哪些 discovery 问题、如何处理异议，把知识传承下去。但别完全撒手——你还有大量研发要做，弄清产品下一步在哪引起共鸣、扩张时在哪卡瓶颈。

**Lenny：** 定价策略——像产品一样思考定价？

**Jeanne：** 你必须**像对待产品一样思考定价**。了解客户从哪里获得价值、你的成本在哪里、是否明智结合。很多公司严重**低估价格**，害怕为实际提供的价值收费。Stripe Billings 曾默认免费增值——审视后觉得整合需要工作，做了就会留下，**取消免费试用没有任何负面影响**。Vercel 基于消费：起初 bundled 成 SaaS 样子，功能增加后不再奏效；八月份较大定价调整——企业版 SKU 叫企业版是有原因的，但约一半企业版用户是初创公司，说明 SKU 里有初创需要的功能；我们把很多功能剥离到可在线自助购买，**推动 PLG 漏斗增长**，效率超高且不需人工介入。

**Lenny：** 销售薪酬困扰？招聘画像？

**Jeanne：** 纯绩效激励好，但**提前 12 个月锁指标**缺灵活——今年 plan 时 AI 云还不存在，年中才推出。探索中：如何保留激励又允许 mid-year pivot。招聘**多元化组合**：正经 sales 背景 + 咨询/银行——后者学损益表、TCO，前者学 discovery；互相学习。Kate Jensen 说我超能力是建工程师不像销售部门的销售组织——销售是产品工程**真正合作伙伴**。

**Lenny：** 跳水背景带到销售里的是什么？

**Jeanne：** 大学时跳水队三人里我通常第三——但跳水是精确、重复的运动；平躺落水游到池边，背上起水泡，**百分之百**被迫立刻回跳板再做同样动作。销售关乎可复制性、可预测结果、预测能力——对卓越有执念。销售大师说过：**肯定很好，否定也很好，模棱两可会要了你的命**——如何接受「不」是数据，用它做下一件事。座右铭：我妈说**当事情变得艰难时，强者会迎难而上**；还有**有志者事竟成**——销售总有一季度不达标，你总能选找到前进的路。

> **金句 · Jeanne**
> **中文：** 10 个工程师 10 分钟内应发现不了你不是产品经理。
> **原文：** Put ten engineers in front of you — they shouldn't be able to tell you're not a product manager within ten minutes.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| ICP | ideal customer profile | 可写下「我们擅长谁」 |
| Crux 流量 | Chrome CrUX traffic | 规模≠复杂度 |
| KYC | know your customer | 全员懂细分框架 |
| 多元化销售组合 | diverse sales mix | sales + 咨询/银行背景 |

**本章小结**

- 细分 ≥3 维：规模 × 增长 × 模式 × 流量 × 负载；公司级非 GTM 独享
- PLG 有上限；销售加太晚会卡增长；几乎每家终需销售组织
- 销售 = 产品合作伙伴；深度懂产品，反馈融入 roadmap
- 薪酬：激励 vs 灵活性（AI 云 mid-year 出现）；招聘 sales + 咨询/银行 mix

---

## 专栏硬核摘录

> 摘自 `column_article.md` 摘要/速览/Q&A，对话正文未展开的细节。

- 市场推广（GTM）应整合为统一生命周期，未来GTM角色将更趋合并。
- AI赋能市场推广工程师，能将销售效率提升10倍，大幅减少人工投入。
- 将GTM流程视为产品，关注客户在整个购买旅程中的独特体验和价值。
- 80%的客户购买是为了避免痛苦或降低风险，而非单纯增加收益。
- 市场细分需考虑规模、增长潜力及商业模式，以制定更精准的销售策略。
- 销售团队需深度理解产品，像产品经理一样思考，才能与工程团队高效协作。
- PLG（产品主导增长）有其上限，最终多数公司仍需及时引入销售团队。
- 初期可尝试内部构建AI代理，成本低廉且能更好地匹配特定工作流程。
- 销售薪酬机制应兼顾激励与组织灵活性，适应快速变化的市场环境。
- 招聘销售人员应结合传统销售经验与咨询/银行背景，形成多元化团队。
- Q：市场推广（GTM）到底是什么，以及近几年最大的变化是什么？
- A： GTM是指任何会接触客户或创造收入的职能，包括营销、销售、技术销售、客户成功等，应整合为统一的生命周期。最大的变化是GTM变得更具咨询性，且AI的广泛应用催生了市场推广工程师，将技术实力应用于整个GTM过程以提升效率和个性化。
- Q：市场推广工程师在公司中扮演什么角色，能带来哪些具体效益？
- A： 市场推广工程师负责将GTM中各职能的工作流程分解，并转化为AI代理。例如，自动化外展邮件、潜在客户筛选、交易分析。通过引入代理，销售人员可以将更多时间用于客户互动，而非繁琐研究，从而将效率提升高达10倍。
- Q：AI会最终取代所有销售人员吗？
- A： 在重复性高、流程清晰的潜在客户开发方面，AI可以取代相当一部分工作。然而，销售人员将因此提升价值链，专注于更复杂的企业级销售、多层级沟通和深度客户服务，而非完全被取代。
- Q：如何将市场推广（GTM）视为一个产品来思考？
- A： 将GTM视为产品意味着像产品经理一样，规划客户从初识公司到成为长期客户的整个旅程。目标是让每个接触点都独特、人性化且能增加价值，而非仅仅进行交易。例如，通过白板会议帮助客户梳理架构，或提供网站性能洞察。

## 总结

| 维度 | 要点 |
|------|------|
| GTM 范围 | 全触客职能整合生命周期 |
| GTM 工程师 | 工作流→代理；前 SE 转型 |
| 效率 | 10 SDR→1 质检；~1000$/年代理 |
| 工具 | DealBot/LostBot；Gong+Slack |
| 策略 | GTM=产品旅程；80% 避痛购买 |
| 细分 | 规模×增长×模式×流量×负载 |
| 文化 | 销售懂产品如 PM |

---

## 附录

### 章节时间戳（专栏摘要）

| 时间 | 主题 |
|------|------|
| — | GTM 整合生命周期（全文 Q&A，无分段时间轴） |
| — | 市场推广工程师与 10x SDR |
| — | DealBot 自建与 GTM 工具栈 |
| — | GTM 即产品 · 白板与性能洞察 |
| — | 细分 · PLG 上限 · 销售像 PM |

### Ingest

- BV：`BV14jrKBcEav`
- ingest：`Recastory/workspace/bilibili-retranscribe/BV14jrKBcEav/ingest`
- 专栏：`.../ingest/column_article.md`

### 相关阅读

- [[OpenAI团队-FDE工程师的未来]] — 前置部署与现场工程
- [[Intercom首席-全员AI转型实践]] — 企业 AI 转型对照
- [[MOC - AI 时代个人发展与组织]] — GTM 与组织横切
- [[MOC - Agent Theory and Design]] — 入口
