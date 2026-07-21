---
title: "Nebius联创：AI基建无泡沫 全栈交付是关键"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_career"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_career"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1F8Ju6VEbp/"
description: "Nebius联创Roman Chernin：AI基建非泡沫，编程是第一个大规模成功用例才刚出现几个月；四层产品堆栈从兆瓦卖到Token再到代理工作流；全栈集成是对抗超大规模厂商的唯一出路。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Nebius联创-AI基建无泡沫.md"
source_sha256: "ba948bf1fb0659facc2663385f1a919d6a1c7eec60c12a1d484cb65a4ec9b25d"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1F8Ju6VEbp/"
column_url: "https://www.bilibili.com/read/cv50566051/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1F8Ju6VEbp/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1F8Ju6VEbp/ingest"
duration: "~45 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Harry Stebbings"
guest_name: "Roman Chernin"
guest_title: "Nebius Co-founder"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Easonlee的AI笔记]]"
concepts:
  - id: ai_infra_no_bubble
    zh: AI基建非泡沫
    en: AI infrastructure is not a bubble
    one_line: 第一个大规模成功用例（编程）才出现几个月，需求远未饱和
  - id: four_layer_stack
    zh: 四层产品堆栈
    en: four-layer product stack
    one_line: 容量→托管云→托管推理→代理工作流，堆栈越高客户越广
  - id: managed_inference
    zh: 托管推理平台
    en: managed inference platform
    one_line: 开发者不关心GPU型号，只关心Token成本和端到端任务执行
  - id: full_stack_integration
    zh: 全栈集成
    en: full-stack integration
    one_line: 向下控制数据中心和服务器，向上覆盖产品和代理工作流
  - id: jevons_paradox
    zh: 杰文斯悖论
    en: Jevons paradox
    one_line: 单位智能成本降低，总需求反而因更多复杂任务变得经济可行而指数增长
---

# AI基建无泡沫：编程是第一个成功用例，才刚刚开始

> 对谈：Harry Stebbings × Roman Chernin（Nebius 联合创始人）| 来源：The Twenty Minute VC | 2026-06-05

---

## 开场：为什么现在聊这个

AI 基础设施赛道的资本支出从未如此之高，Nebius 市值已达 660 亿美元，正与超大规模厂商正面竞争。很多人看到资本涌入就喊"泡沫"，但 Roman Chernin 持相反判断：编程作为第一个大规模成功用例，几个月前才真正奏效，全球绝大多数企业的 AI 应用占比极低，基建需求才刚起步。

Roman 在对谈中拆解了四个核心议题：为什么基建不是泡沫、开源模型如何重塑客户选择、Nebius 的四层产品堆栈逻辑、以及面对超大规模厂商 8-10 倍资本优势时的护城河到底是什么。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 推理 | inference | 模型接收输入后生成输出的过程，训练完部署后持续消耗算力 |
| 微调 | fine-tuning | 在预训练模型上用自己的数据继续训练，让模型适配特定场景 |
| 杰文斯悖论 | Jevons paradox | 技术效率提升导致单位成本下降，总需求反而暴涨 |
| 托管推理 | managed inference | 平台帮你搞定模型部署和优化，你只管调接口 |
| 总拥有成本 | total cost of ownership (TCO) | 不只看GPU单价，还包括运维、优化、停机等全部开销 |
| 代理工作流 | agentic workflow | 多个AI Agent协作完成端到端任务，不再只调单次模型 |

---

## 01 AI基建不是泡沫，编程用例才刚出现几个月

**Harry：** 很多人看到资本不断涌入 AI 基建就认为这是泡沫，你怎么看？

**Roman：** 不，我不认为这是泡沫。首先得定义什么是泡沫。我是否相信我们需要投入数十倍甚至数百倍的资源来建设基础设施？我完全相信。我们正处于这个激动人心时刻的开端，黄仁勋称之为"有用的AI"，我们才刚刚开始真正的应用。

说实话，在众多用例中，我们可能只有一个用例是真正成功的——编程。每个人都在谈论编程，但这个用例可能也只是几个月前才开始真正见效。距离第一个大规模成功的用例出现并开始广泛应用，才仅仅过了几个月。未来我们将看到更多用例，也将看到更广泛的应用。

如果你审视世界上每一家公司，除了那些发展最快的初创公司，绝大多数公司在 AI 的应用上，无论是应用数量还是用例深度，都只占了很小一部分。即便是一些技术相当先进的大公司，也才刚刚起步。我们才刚刚开始。

> **金句 · Roman**
> **中文：** 距离第一个大规模成功的用例出现并开始广泛应用，才仅仅过了几个月。
> **原文：** It has only been a few months since the first large-scale successful use case appeared and started to be widely adopted.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 杰文斯悖论 | Jevons paradox | 模型变便宜了，大家不是少花钱，而是花更多钱解决更复杂的问题 |
| 有用AI | useful AI | 黄仁勋说的，AI从演示阶段进入真正创造商业价值的阶段 |

**本章小结**
- 编程是目前唯一经过验证的大规模成功AI用例，且才出现几个月
- 全球绝大多数企业的AI应用占比极低，需求远未饱和
- 单位智能成本降低后，杰文斯悖论会让总需求指数增长

---

## 02 客户从闭源模型转向开源，因为要微调和提效

**Harry：** 编程过去六到十二个月开始奏效，但会不会有一种趋势——客户转向本地托管的开源模型？这对 OpenAI、Anthropic 和 Nebius 会造成什么影响？

**Roman：** 这不是未来，它已经存在于当下。当客户的产品达到一定规模，他们会开始寻找提高经济效益或加速增长的方法。目前最好的构建方式是基于 OpenAI、Anthropic、Google 等提供商的前沿模型，因为它们提供了世界上最强大的能力。但当你理清了用例、开始看到实际应用并拥有了客户数据循环时，你可以找到更便宜、甚至不只是更便宜，而是更高质量的方式来服务相同的用例。

你可能不需要世界上最好的通用模型，而是可以创建一个专门的模型，在你的特定场景下表现得更好。这就是为什么需要从前沿封闭模型转向开源模型——这些模型最重要的特点不仅是开源，而是它们可微调、可训练。你可以拿来做后期训练，创建专门的模型，使其在特定情况下表现得更出色。

为什么它不会伤害 Anthropic 和 OpenAI？因为他们正在迈向下一个前沿。还有很多尚未解决的任务，或者那些预算有限但仍需解决的任务。每次我们发现更有效解决某些任务的方法，我们就会同时开始尝试更复杂的任务。我相信这是一个持续的旅程。

我最喜欢的一个轶事发生在大约15个月前的 DeepSeek 时刻。Nebius 的股价在一周内下跌了 40% 左右。但有趣的是，就在同一周，我们创造了公司历史上最好的销售周。因为很多人发现他们可以用 DeepSeek 在生产工作负载中运行推理，而且经济效益可行。客户开始成长，他们是第一批真正受益于为编程等任务调整模型的人。

> **金句 · Roman**
> **中文：** DeepSeek 那周我们股价跌了40%，但公司历史最好的销售周也发生在同一周。
> **原文：** Our stock dropped 40% in a week during the DeepSeek moment, but that same week we had the best sales week in company history.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 微调 | fine-tuning | 用自己的数据继续训练开源模型，让它更懂你的业务 |
| 后期训练 | post-training | 预训练之后的微调、强化学习等阶段，让模型适配特定任务 |
| DeepSeek时刻 | DeepSeek moment | DeepSeek 发布低成本高效模型，冲击了整个AI基建估值逻辑 |

**本章小结**
- 客户达到规模后会自然转向开源模型，核心原因是微调能力和经济效益
- 闭源前沿模型不会被取代，因为总有更多复杂任务需要推动前沿
- DeepSeek 时刻证明：模型变便宜反而让基建公司销售暴涨

---

## 03 四层产品堆栈：从兆瓦卖到Token再到代理

**Harry：** 你提到四个维度——容量、产品、客户、资本。展开讲讲产品堆栈的四层逻辑？

**Roman：** 当我们思考如何建立公司时，会从四个维度讨论。第一是容量——部署了多少兆瓦和 GPU。我们是基础设施公司，必须具备庞大的规模。但启动新的数据中心需要处理供应链、监管、消防、供水，现实世界中的一切复杂情况都在阻碍进度。

第二是产品。我们最初从构建基础模型的人开始——OpenAI、超大规模公司和大型实验室。他们需要的仅仅是纯粹的基础设施，这是第一层，以"兆瓦"为单位。

第二层是多租户云，面向研究密集型团队。他们不想处理物理基础设施，而是想要托管基础设施，经典的"基础设施即服务"。你登录后集群就配置好了，可以开始训练或运行推理。这层以"GPU小时"为单位。

第三层是托管推理。开发者不想以 GPU 小时来衡量，不想研究 B200、H200、B300 中哪个更适合特定工作负载，不想自己管理 vLLM 或 SGLang 部署。我们的产品 Nebius AI Studio 就是托管推理平台。这层以 Token 为单位——你不是为 GPU 小时付费，而是按 Token 消耗付费。

第四层是代理工作流。当你构建端到端的 Agent 应用时，你甚至不会考虑特定的模型或 Token 数量。你只希望端到端任务能够高效执行并提供预期结果。平台会为你思考在特定调用中哪个模型更合适——你需要使用更智能的模型，还是可以在相同预算下进行两次查询？

> **金句 · Roman**
> **中文：** 堆栈越高，我们能服务的客户群体就越广——裸机十几家，托管云数百家，推理数千家，代理层成千上万。
> **原文：** The higher the stack, the broader the customer base we can serve — from a dozen at bare metal to thousands at the agentic layer.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 兆瓦 | megawatt | 数据中心的电力容量单位，衡量物理基建规模 |
| GPU小时 | GPU-hour | 一张GPU跑一小时的计费单位，托管云层的销售单位 |
| Token | token | 模型处理文本的基本单位，托管推理层按Token计费 |
| 代理工作流 | agentic workflow | 多个Agent协作完成任务，开发者只关心端到端结果 |

**本章小结**
- 四层堆栈从物理基建到代理工作流，每升一层客户数量级扩大
- 托管推理层让开发者不用关心底层GPU型号，专注业务逻辑
- 代理层是下一个增长点，平台自动选择最优模型和推理预算

---

## 04 Token Factory：让推理成本降低70%的秘密

**Harry：** 你说通过优化可以将推理成本降低多达70%。怎么让一个 Token 变得更便宜？

**Roman：** 没什么魔法。你拿一个模型，比如某个基线模型，然后针对你特定的场景进行优化。你可以做模型蒸馏，制作一个质量相同但更小的模型；你可以做推测解码，可以优化缓存，等等。你实际上是构建了一个系统，在你的特定情况下满足要求，并优化了经济效益。

使用托管平台也很重要，因为模型每周、每月都在变化。今天可能发布了 MiniMax 3，或者 Nemotron Ultra。每隔几周就有新模型发布，每次发布新模型时，它可能在某些基准测试中表现更好。你希望拥有灵活性，希望有人支持你进行实验，并实际采用最适合你用例的新模型。

我们有个客户 Revolut，最初 99% 的推理预算都花在 OpenAI 的封闭模型上。他们开始解决一些用例，但其中一些在经济上并不划算。他们转向开源模型，但进展不快，因为他们必须在公司内部构建整个引擎。他们首先专注于评估——我认为这是人们低估的一点，建立改进和实验引擎的基础有多重要。当你需要明白什么对你有利时，你需要有指标、评估机制，需要为 AI 开发建立 CI/CD 流程。

当他们解决了这些基础问题后，就开始呈指数级增长。我预计我们将在 Revolut、Shopify、Prosus、Booking.com 这样的公司中看到大量的爆炸性增长。

> **金句 · Roman**
> **中文：** 建立改进和实验引擎的基础有多重要——这是人们低估的一点。
> **原文：** How important it is to build the foundation for improvement and experimentation engines — this is one thing people underestimate.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 模型蒸馏 | knowledge distillation | 把大模型的知识压缩到小模型里，效果接近但推理成本低很多 |
| 推测解码 | speculative decoding | 用小模型先猜，大模型验证，加速推理同时保持质量 |
| CI/CD | continuous integration/continuous deployment | 持续集成和持续部署，AI开发也需要自动化测试和发布流程 |

**本章小结**
- Token Factory 通过蒸馏、推测解码、缓存优化等技术降低70%推理成本
- 模型迭代极快，平台帮客户自动跟进最新模型并平滑切换
- Revolut案例证明：企业AI采用的瓶颈不在模型能力，而在评估和实验基础设施

---

## 05 做好你的工作是唯一护城河

**Harry：** 面对超大规模厂商 8-10 倍的资本支出优势，Nebius 的护城河在哪里？

**Roman：** 我们以非常简单的方式看待这个问题。英伟达最令人着迷的地方在于，它在很大程度上仍然是一家工程师驱动的公司。要赢得英伟达的尊重，最好的方式是如果英伟达的工程师尊重你的工程师，你就会拥有正确的关系基础。我们在硬件层面、软件层面、推理平台层面都建立了深厚的工程师关系。

我们今年的资本支出计划是 200 亿到 250 亿美元，而超大规模厂商是我们的 8 到 10 倍。在接下来的六个月里，资本帮不上太大的忙——你手头有什么就必须交付什么。但在 24 个月的时间跨度内，资本能解锁很多东西。我们不是在建造单个数据中心，而是在构建一个容量组合。先确保电力和土地，然后建造数据中心，再用 GPU 填充它们。每一个后续阶段都需要更多的资本，但我们会提前做好准备。

面对公众对数据中心的抵触——每 100 个数据中心就有 40 个在规划和审批过程中未能建成——我们的做法是把这看作项目组合，确保某种程度上的"超额认购"。如果一个数据中心延迟了，我们仍然能向客户提供足够的容量。我们在美国新建容量的 70% 到 75%，积极与当地社区沟通。

> **金句 · Roman**
> **中文：** 说白了就是做好你的工作。我们还能做什么呢？
> **原文：** It basically comes down to doing your job well. What else can we do?

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 工程师驱动 | engineer-driven | 公司决策由工程师专业判断主导，不是销售或管理层 |
| FDE | front-deploy engineer | 驻场工程师，到客户现场帮他们用好产品 |
| 超额认购 | over-subscribed | 多规划几个数据中心，抵消个别项目延迟的风险 |

**本章小结**
- 工程师层面的相互尊重是与英伟达等巨头合作的基础
- 资本在不同时间尺度上发挥作用：6个月帮不上，24个月能大幅加速
- 做好交付是唯一的护城河——每次签合同、每次融资都是交付机会

---

## 06 世界过度整合是最大威胁

**Harry：** 对 Nebius 最大的威胁不是竞争，而是——

**Roman：** 而是普遍的整合。Nebius 作为一家企业面临的主要威胁是世界将过度整合。如果你最终生活在一个由三五个超级模型、超级公司或超级帝国控制的世界里，像 Nebius 这样的公司将沦为仅仅帮助他们满足物理层面需求的角色。世界越民主化、越多样化，我们作为企业就越被需要。

我认为这对人类也更好。有很多人想独立地创造一些东西，有很多人需要尝试和创造新事物，这自然会产生压力，创造一个更加多元化的世界。

关于未来，我认为正在发生的一件事是"开发者身份"的普及——我们每个人都可以成为开发者。我所说的开发者，是指将想法转化为某种数字资产的能力。构建的民主化让每个人都能成为构建者，这将开启许多我们甚至无法想象的机会。

但挑战在于教育将如何改变。当人们不需要思考那么多的时候，你如何真正训练他们思考？如何教人们不断改变？我告诉我的两个女儿，有两件事是必需的：一是能够与人沟通，带着同理心进行沟通；二是创造力。十年前我觉得硬技能很重要，比如数学和工程，但现在我早已摆脱了这种观念。

> **金句 · Roman**
> **中文：** 整合是我们主要的威胁。世界越民主化、越多样化，我们作为企业就越被需要。
> **原文：** Consolidation is our main threat. The more democratized and diverse the world is, the more we as a company are needed.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 构建民主化 | democratization of building | AI让每个人都能把想法变成产品，不用先学编程 |
| 同理心沟通 | empathetic communication | 理解他人感受和需求的能力，AI时代最稀缺的软技能 |

**本章小结**
- 世界过度整合是Nebius的最大威胁，多样性越强对Nebius越有利
- 构建民主化让每个人成为开发者，但教育体系需要跟上
- 同理心和创造力是AI时代最稀缺的能力，比硬技能更重要

---

## 总结：AI基建需求才刚起步，全栈交付是唯一护城河

| 维度 | 要点 |
|------|------|
| 市场判断 | AI基建非泡沫，编程用例才刚出现几个月，全球企业AI应用占比极低 |
| 模型趋势 | 客户到规模后转向开源微调，闭源前沿模型仍有广阔未开发市场 |
| 产品策略 | 四层堆栈从兆瓦到Token到代理，堆栈越高客户越广 |
| 竞争壁垒 | 全栈集成——向下控制数据中心，向上覆盖代理工作流 |
| 资本节奏 | 6个月靠执行力，24个月资本才能真正加速 |
| 最大威胁 | 世界过度整合，多样性降低会削弱Nebius的定位 |

> **金句 · Roman（封底）**
> **中文：** 鲨鱼只有在移动时才活着。我们必须前进。
> **原文：** Sharks are alive only when they are moving. We have to keep going.

---

## 附录

**章节时间戳**
- 00:00 开场
- 03:15 AI基建非泡沫，编程是第一个成功用例
- 06:42 客户从闭源转向开源模型
- 11:50 四层产品堆栈逻辑
- 24:15 托管推理与Token Factory
- 35:40 资本支出与护城河
- 41:10 世界过度整合是最大威胁

**Ingest 信息**
- column_source: Recastory/workspace/bilibili-retranscribe/BV1F8Ju6VEbp/ingest/column_article.md
- asr_status: asr_ready

**相关阅读**
- [[MOC - Agent Theory and Design]] — 入口
- [[MOC - Harness Engineering]] — AI基建与智能体基础设施
