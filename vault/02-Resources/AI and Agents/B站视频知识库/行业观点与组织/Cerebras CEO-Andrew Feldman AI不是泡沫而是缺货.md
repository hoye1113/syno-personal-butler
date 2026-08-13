---
title: "Cerebras CEO-Andrew Feldman AI不是泡沫而是缺货"
tags: ["column", "dialogue", "s_tier"]
legacy_tags: ["ai_infra", "cerebras", "inference_cost", "supply", "chip", "column", "dialogue", "s_tier"]
created: "2026-07-13"
source: "B站图文专栏 - Easonlee的AI笔记"
description: "Cerebras 创始人 Andrew Feldman 对话 Harry Stebbings：AI 不是泡沫而是严重供应滞后——250 亿美元积压订单、HBM 内存由三家垄断成长期瓶颈、Cerebras 用 SRAM 避开 HBM 快 15 倍、2025 年推理需求指数爆发、慢速推理市场为零、能源与许可取代技术成核心约束、限制对华售尖端芯片符合美战略。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Cerebras CEO-Andrew Feldman AI不是泡沫而是缺货.md"
source_sha256: "6a2ec53c997937cdccee264843cbffb1b846c93f80ff203cc75aa041efeb4d22"
migration_id: "migration-20260720-64e79771"
ingest_workflow: bilibili_opus_ingest_v2
aliases: [Andrew Feldman Cerebras, Cerebras 半导体IPO, AI 推理成本, HBM 内存短缺, 算力供给]
source_original_date: 2026-07-07
author: "Andrew Feldman（Cerebras 创始人兼 CEO）/ Harry Stebbings（主持人）"
uploader: "Easonlee的AI笔记"
source_type: bilibili_opus
source_url: "https://www.bilibili.com/opus/1222120059228389384"
opus_id: "1222120059228389384"
column_id: "cv51193028"
video_url: "https://www.bilibili.com/video/BV1gXTy6cEPx/"
bv: "BV1gXTy6cEPx"
source_tier: C1
primary_source: column
material_tier: S
source_form: dialogue
content_form: dialogue
dialogue_fidelity: source
question_source: column
voice_basis: direct_speech
factual_status: partial
factual_reviewed: 2026-07-13
verification_scope: column_only
verification_basis:
  - column
---

# Cerebras CEO-Andrew Feldman AI不是泡沫而是缺货

> 来源：B 站专栏（Easonlee 的 AI 笔记转述 Andrew Feldman 与 Harry Stebbings 的英文对谈）。`source_form: dialogue`（嘉宾 Andrew Feldman + 主持人 Harry Stebbings 真实对谈），`dialogue_fidelity: source`，`question_source: column`，`voice_basis: direct_speech`，`verification_scope: column_only`，含大量未独立核验的量化表述（见限制与边界）。未读取图片、未使用 ASR/Recastory/transcript。
>
> **核心主张：AI 不是泡沫而是严重的供应滞后——基础设施建设落后于需求，250 亿美元积压订单、HBM 由三家垄断成长期瓶颈；对难题而言速度的价值没有上限、慢速推理的市场为零；能源与许可正取代技术成为数据中心的核心约束。**

> 慢速搜索的市场是零——没人接受慢速互联网；为什么推理会有所不同？慢速推理的市场也将为零。
> ——Andrew Feldman

## 核心对话

**核心判断：过去的泡沫是「建好了用户会来」，现在的 AI 恰恰相反——基础设施建设滞后于需求；HBM 短缺将长期化，而 Cerebras 用 SRAM 路线避开瓶颈；对难题而言速度的价值没有上限，先赢一个大客户才有资格赢下一个。**

**Harry Stebbings（主持人）：** Cerebras 刚上市，史上最大半导体 IPO，股价 185 涨到 311 美元、募资超 55 亿。一面是泡沫论，一面是黄仁勋说 2030 年前在 AI 基础设施花 3-4 万亿美元——怎么平衡？

**Andrew Feldman（嘉宾）：** 过去的泡沫（90 年代光纤、19 世纪铁路）都是"建好了用户会来"，基建远超需求。现在的 AI 完全相反：**基础设施建设滞后于需求**。我们有 250 亿美元积压订单，英伟达、AMD 也都有。我们不是超前建设，而是落后于需求——这不符合泡沫特征。OpenAI 的优势在于萨姆预见指数增长、提前签电力/数据中心/硬件合同，在指数环境里坚信需求持续增长是一种超能力。

**Harry Stebbings（主持人）：** 大家都说"内存"是短缺，成本因此涨了 4-5 倍，真的吗？

**Andrew Feldman（嘉宾）：** GPU 用的 HBM 内存只有三家生产（三星、美光、海力士），跟不上需求、价格暴涨，美光毛利率高达 80%-85%，拿到软件级毛利。但**我们不用 HBM**，用 SRAM，不短缺、成本稳定（台积电蚀刻在逻辑芯片里）。我们受益于避开 CoWoS 封装、用 5 纳米避开最紧的 3 纳米节点，目前快 15 倍。产能是"阶跃函数"——建一座 400 亿美元、耗时五年的厂才能扩产，所以若需求持续，未来几年继续内存短缺。

**Andrew Feldman（嘉宾）：** 2025 年上半年模型够智能后，AI 会从"新奇事物"进入大规模**推理**应用期，席卷各年龄层。记住：训练造 AI，推理用 AI。只要前沿模型更智能有用，需求就指数增长。慢速搜索的市场是零——没人接受慢速互联网，同理**慢速推理的市场也将为零**。

**Harry Stebbings（主持人）：** 云提供商最终会商品化成像公用事业，还是有显著护城河？

**Andrew Feldman（嘉宾）：** AWS/Azure 的价值在信誉、合法性、安全（Bedrock、SageMaker、S3 完整软件层）——对大部分企业极有价值；但另一细分只想要便宜算力、不在乎"真皮座椅"。市场是细分的，价值有代价。超大规模的数据中心因软件/安全层有额外成本，对我们反成劣势。谷歌因全栈（TPU 到电力）可能成为成本最低 Token 生产者，但"只卖给自己"会限制硬件销量规模。

**Harry Stebbings（主持人）：** 你跑 Kimi K2 比第二快的 GPU 云快 6.7 倍。速度到底多重要？

**Andrew Feldman（嘉宾）：** 对难题，速度的价值**没有上限**。3 分钟解决别人 20 分钟的问题，竞争对手就会被彻底击败——在编码、agentic workflows、AI 每个部分都如此。慢速搜索市场是零，慢速推理同理。

**Andrew Feldman（嘉宾）：** 关于大客户集中：一年前我和 G42 有 10 亿交易被说集中，一年后带 200 多亿（OpenAI）合同回来，还是被说集中、只是客户变了。要拥有众多大客户，先赢一个、深度学习如何服务顶级客户，才有资格赢下一个。

## 其余要点（据专栏重点速览）

**核心判断：正文对谈之外还有三个补充判断——能源与许可已取代技术成为数据中心核心挑战、限制对华售尖端芯片符合美战略利益、多吉瓦级建设心态已从妄想变为平常。**

- **能源与许可已取代技术成为数据中心核心挑战**：AI 本质是把电力转智能，供电定胜负；需透明化、自建电网/变电站消除社区阻力。
- **限制对华售尖端芯片符合美战略利益**：以台积电、ASML 等关键节点管理瓶颈，借《芯片法案》夺回封装与制造生态优势。
- **行业心态剧变**：20 兆瓦→100 兆瓦→1 吉瓦→多吉瓦级建设，五年前被视为妄想，如今平常。

## 限制与边界

- 本笔记为专栏转述真实对谈，`verification_scope: column_only`，未回核原视频；含大量未独立核验数字：250 亿积压订单、股价 185→311、募资 55 亿、HBM 毛利 80%-85%、快 15 倍/6.7 倍、OpenAI 200 亿合同、Kimi K2 基准等。
- Cerebras 为 Andrew 自家公司，其对 HBM/SRAM 优劣、速度优势的表述具卖方立场，需交叉验证。
- "2025 年推理爆发""慢速推理市场为零"为前瞻性判断，非既定事实。

## 知识连接

- **支持** [[2026 年 Agent 最重要的工程概念 Harness Engineering]]：Andrew 称 agentic workflows 中速度价值无上限、慢速推理市场为零，印证 harness 把速度与单位 Token 成本作为核心不变量。
- **补充** [[OpenAI总裁-聊天与Agent的融合计划]]：本篇从算力/电力/HBM 供给侧解释 Greg Brockman 所述"聊天与 Agent 融合"受供给约束——规模化 Agent 的硬瓶颈在能源与内存。
- **依赖** [[OpenAI员工-上下文工程和Agent记忆]]：大规模推理爆发（2025）使长任务 Agent 的上下文/记忆需求陡增，与 OpenAI 上下文工程议题同源。
- **限制** [[Manus创始人-深度干货-上下文工程的最佳实践]]：本篇侧重供给与速度，未涉及 context offload/compact 等工程侧；Agent 落地同时受"算力成本"与"上下文膨胀"双重约束，见上方限制与边界。

## 来源声明

- 专栏原文：`source_url`（B 站 opus 1222120059228389384），`bv: BV1gXTy6cEPx`，`column_id: cv51193028`，发布于 2026-07-07。
- `material_tier: S`，`source_form: dialogue`，`content_form: dialogue`，`dialogue_fidelity: source`，`question_source: column`，`voice_basis: direct_speech`，`factual_status: partial`，`verification_scope: column_only`。未读取图片、未使用 ASR/Recastory/transcript。
