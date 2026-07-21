---
title: "Alex Wang：加入Meta 10个月 幕后故事"
tags: ["ai_agent", "article", "bilibili"]
legacy_tags: ["ai_agent", "article", "bilibili"]
created: "2026-07-09"
source: "https://www.bilibili.com/video/BV1EfGd6WEzK/"
description: "Meta超智能实验室负责人Alex Wang首次深度披露加入Meta 10个月的幕后故事：从Llama 4未达预期到重建MSL，从Muse Spark到智能体经济与物理超级智能的路线图。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Alex Wang-加入Meta10个月幕后故事.md"
source_sha256: "d914e6b2e2be57279f11aea344696c0b8b02b15ec69416b099e7ca8209eac4ef"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Easonlee的AI笔记]]"
moc: "[[MOC - Agent Theory and Design]]"
dialogue_version: v3.2
material_tier: S
host_name:
  - Ashlee Vance
  - Kylie Robison
guest_name:
  - Alex Wang
speaker_inference: "Ashlee Vance与Kylie Robison共同主持；Alex Wang为唯一嘉宾"
ingest_dir: "02-Resources/AI and Agents/B站视频知识库/"
transcript_source: column_article
---

## 概念

- **Meta超智能实验室（MSL）**：Alex Wang加入后成立的新组织，由TBD（大型模型研究实验室）、PAR（产品和应用研究，Nat Friedman负责）、FAIR三部分构成。核心前提：认真对待超智能，围绕"超智能即将到来且非常接近"重建所有假设。
- **个人超智能**：Meta的AI愿景——通过WhatsApp、眼镜等硬件，为数十亿用户提供代理式智能，赋能个人与小企业。
- **代理经济（Agentic Economy）**：数据中心里由AI代理调节供需的经济形态，对标Anthropic的"天才之国"概念。
- **物理超级智能**：数字超级智能+世界建模+物理感知，通过收购ARI（Assured Robot Intelligence）布局机器人能力。
- **令牌效率（Token Efficiency）**：Muse Spark展现的核心优势——用更少计算步骤达成同等智能，源于干净堆栈的系统性优势。
- **模型福利（Model Welfare）**：Alex Wang提出的反直觉议题——随着模型能力增强，社会应讨论是否需要善待模型。
- **Tribe V2**：Meta正在研究的大脑预测基础模型，实现"零样本泛化"——无需个体大脑数据即可预测其对图像/视频/音频的响应。

## 金句

> Llama 4 当时的轨迹并没有达到公司继续进行这些投资所需的水平。所以我们当时在非常高的层面上讨论如何更紧密地合作。

> 每个研究人员拥有更高的计算能力。建立一个更专注、成员更少但人均算力更高的团队，进展会更快。

> 研究人员只是为了钱是一个错误的假设，实际上他们留在原公司的财务前景也非常好。主要动机是能从零开始构建，拥有大量算力，并追求雄心勃勃的研究方向。

> 一个每个人都很出色的小团队，总是比责任分散的大组织行动更快。

> Muse Spark 有点像"开胃菜"，我们正在开发更大的模型，我们对更大模型的期待远超 Muse Spark。

> 如果我们不将其与世界建模和物理智能的努力相结合，那几乎是一种浪费。

> 我们很高兴能在数据中心里建立一个"代理经济"。如果你从根本上改变了经济中供需的运作方式，并且它是由代理来调节的，我认为那会是非常令人兴奋的事情。

> 我一直在思考如何建立"地球上的天堂"，而超级智能是实现这一目标的关键里程碑。

## 章节

### 01 - Meta AI部门的重建与愿景
**[06:45] 彻底重组Meta AI实验室**

Alex Wang加入后发现Llama 4未达前沿，决定重建MSL。组织架构：TBD（研究实验室）、PAR（产品应用，Nat Friedman领导）、FAIR（探索性前沿研究）。Daniel Gross领导Meta Compute负责长期基础设施规划。

重建MSL的三个原则：认真对待超智能、技术声音最大、科学严谨。加速迭代的三条路径：人均更高算力、更高人才密度、更激进的研究赌注。

**[11:20] 算力储备成为科技公司新等级标准**

AI生态已发生阶级划分——拥有大规模算力的公司能进行大胆范式实验，没有算力的公司无法触及前沿。扎克伯格全力投入，将算力转化为研究自由度。

### 02 - 招聘与企业文化
**[15:00] 从Scale到Meta的转变**

Alex Wang与扎克伯格认识多年，一年前开始探讨更紧密合作。扎克伯格越来越相信AGI，准备下大赌注。招聘速度极快——"如果我们要构建出色的模型，昨天就需要团队"。

内部文化被评价为"像早期OpenAI或Anthropic"，成立仅10个月。人加入的动机是人均计算资源高、人才密度高、能从零构建并追求雄心勃勃的研究方向，而非单纯薪资。

### 03 - Muse Spark的技术定位
**[21:15] Muse Spark是扩展阶梯上的早期数据点**

九个月内重建了预训练堆栈、强化学习堆栈和数据工作——整个核心研究堆栈的全面翻新。Muse Spark不是全面领先的模型，但展现了关键优势：
- 令牌效率远超竞品（人工分析中用更少令牌达到相似结果）
- 多模态+智能体编码能力（视觉编码、生成网站/游戏）
- 预训练扩展、强化学习扩展、测试时间扩展均展现可预测性

Muse Spark目前在代理式编程方面尚未达到竞争力，但验证了干净堆栈的优势。下一个模型预期在各方面全面超越。

### 04 - 智能体经济与个人超智能
**[32:40] 代理经济重塑商业版图**

Meta生态独特优势：数十亿用户+数亿小企业（WhatsApp经营、Facebook/Instagram、广告）。愿景——为所有消费者和小企业构建代理，当代理相互协作时形成"数据中心里的代理经济"，从根本上改变供需运作方式。

当前挑战：消费者对AI情绪普遍较低。原因是尚未以真实方式展示AI如何成为个人赋权工具。开发者已完全被改变（Claude Code效应），但这个时刻还没发生在普通消费者身上。

### 05 - 物理智能与机器人布局
**[41:10] 收购ARI实现物理超级智能**

ARI不制造硬件，而是为各种硬件目标开发AI。核心逻辑：如果认真对待超智能，物理超级智能是路线图的自然延续。机器人智能同样受益于规模化，Meta的算力基础设施与物理智能结合才有意义。

### 06 - 脑机接口与模型福利
**[45:50] AI发展的终极前沿**

三个关键技术领域：超智能、机器人、脑机接口。Meta的Tribe V2项目——大脑预测基础模型，实现零样本泛化。

模型福利——反直觉但日益重要的议题：在关心植物和动物的世界里，也应认真思考如何对待模型。已有研究（如Elios）可衡量模型的主观体验。

### 07 - 开源与安全
**[50:00] 安全与开源的平衡**

Muse Spark在测试中触发了一些安全检查（生物化学、网络能力、失控问题），因此当前版本不适合开源。正在开发适合开源的模型版本，预计未来数月分享。Meta承诺继续支持开源生态，但最强大模型必须考虑安全前提。

### 08 - 地缘政治与行业责任
**[55:00] AI竞赛中的立场**

在Scale时期通过《纽约时报》整版广告呼吁美国政府重视AI对国家安全的影响。地缘政治上需区分人才与国家行为——很多才华横溢的中国人值得合作，这与地缘政治判断是两回事。中美AI竞赛中，美国政府现在已非常认真对待AI在国家安全方面的问题。

## 附录

### 关键人物

| 人物 | 角色 |
|------|------|
| Alex Wang | Meta超智能实验室负责人，Scale联合创始人 |
| Ashlee Vance | Core Memory主持人 |
| Kylie Robison | Core Memory主持人 |
| Nat Friedman | PAR负责人，Alex Wang早期天使投资人 |
| Daniel Gross | Meta Compute负责人 |
| 盛夏 | MSL首席科学家 |
| Yann LeCun | Meta AI前负责人，曾公开评论Alex Wang |
| 扎克伯格 | Meta CEO |

### 关联笔记

- [[MOC - Agent Theory and Design]]
- [[MOC - Harness Engineering]]

### 信息来源

- B站专栏：https://www.bilibili.com/read/cv49626013/
- 视频时长：1:23:01
- 类型：Host-Guest对谈（Core Memory播客）
