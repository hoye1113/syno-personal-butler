---
title: "DeepMind研究总监：AI时代的 天气预报"
tags: ["ai_agent","bilibili","interview","dialogue","ai_native","agent_architecture","multi_agent"]
created: 2026-09-16
source: "https://www.bilibili.com/opus/1247508469860270113"
description: "DeepMind研究总监：AI时代的 天气预报 摘要 重点速览 01 飓风梅丽莎与提前预警 02 AI为何能改进天气预测 03 天气为何越来越难预测 04 从数值天气预报到GraphCast 05 概率模型与多种未来情景 06 WeatherNext 3 与天气树 07 能源、农业与模型性能 08 极端天气、未来方向与跨领域启发 DeepMind研究总监：A"
knowledge_state: captured
link_status: connected
ingest_workflow: bilibili_opus_ingest_v2
source_type: bilibili_opus
opus_id: "1247508469860270113"
column_id: "cv52975164"
uploader: "Easonlee的AI笔记"
primary_source: column
source_tier: C2
material_tier: A
source_form: dialogue
content_form: dialogue
dialogue_fidelity: source
question_source: column
voice_basis: direct_speech
factual_status: partial
factual_reviewed: 2026-09-17
verification_scope: column_only
verification_basis: ["column"]
source_kind: url
source_reliability: unverified
source_verification: unverified
source_url: "https://www.bilibili.com/opus/1247508469860270113"
source_content_sha256: 3669174b5f26e39f10d76cb5534d77b027a3903b2164da5011b09a2a5ee8648f
---

# DeepMind研究总监：AI时代的 天气预报

> 这篇专栏记录 Google DeepMind 高级研究总监 Peter Battaglia 对 AI 天气预报的解释：WeatherNext、GraphCast 一类模型的价值，不只是把预测分数做高，而是让政府、能源和农业获得更早、更有依据的决策窗口。
>
> **核心主张：** AI 不能消除天气的不确定性，但可以从历史观测中学习微弱线索，以概率化的多种未来情景把“不确定”转化为可行动的准备时间。

> 预报多一天，可能就是危机与灾难的差别。
> ——专栏整理

## 开场

对谈从飓风梅丽莎开始：在风暴尚未发展成热带风暴时，模型已经给出迅速增强的概率信号。专栏随后把这个案例放回天气预测的物理上限、模型架构和实际决策中，强调评估模型时不能只看平均误差，还要看它是否让人更早做出正确准备。

## 01 飓风梅丽莎：模型输出如何变成提前决策

**核心判断：** AI 预报的直接价值是争取决策时间，而不是提供一个看似确定的单一答案。

**Hannah Fry（主持人）：** 当飓风逼近陆地时，多一天预警可以疏通道路、腾空医院、开放避难所；梅丽莎这个案例如何体现 AI 的作用？

**Peter Battaglia（嘉宾）：** 模型在风暴尚未成为强热带风暴时，就逐步提高了其发展为五级飓风的概率判断，最终为国家飓风中心的预报员提供了额外信心。专栏提到概率大约达到 80%，但官方预报仍由气象业务机构结合多种信息作出，模型不是替代决策者。

## 02 AI 为什么能改进天气预测

**核心判断：** 天气预测的过去与未来遵循同一套物理规律，AI 的优势在于从长期历史观测中学习复杂而细微的输入—输出关系。

**Hannah Fry（主持人）：** 天气具有蝴蝶效应，传统方法已经使用超级计算机求解流体方程，AI 的新增价值是什么？

**Peter Battaglia（嘉宾）：** 只要拥有足够历史证据，模型就可以学习过去状态与未来天气之间的复杂联系。关键不在于宣称 AI“理解了天气”，而在于数据、建模、评估和处理都能更有效地提取可用于预测的线索。

## 03 蝴蝶效应是边界，不是停止学习的理由

**核心判断：** 未观测到的微小扰动构成物理上的可预测性边界，但不代表所有有用的中长期信号都消失。

**Hannah Fry（主持人）：** 如果无法知道每一处初始状态，天气预测为什么仍然值得继续改进？

**Peter Battaglia（嘉宾）：** 天气系统确实对初始条件敏感，模型不能把不确定性变成确定性；但大尺度演化会留下可从历史数据中学习的结构。正确的目标是表达预测范围、概率和置信度，而不是承诺永远精确。

## 04 从数值天气预报到 GraphCast 与 WeatherNext

**核心判断：** WeatherNext 等系统代表的不是简单替换物理模型，而是用新的学习式预测路径降低生成预报的成本并扩大覆盖范围。

**Hannah Fry（主持人）：** 从早期用卫星图像预测短期降雨，到 GraphCast 和 WeatherNext，模型路线发生了什么变化？

**Peter Battaglia（嘉宾）：** DeepMind 先从具体降雨和气旋任务积累经验，再把模型推进到全球、逐小时的天气预报。模型可以快速生成结果，也可以与传统业务流程和观测资料结合；实际部署仍需要业务机构、数据管线和专业人员共同承担责任。

## 05 概率模型与“天气树”：把多个未来交给决策者

**核心判断：** 单一确定性预报不足以覆盖天气的多种可能，概率模型和多情景分支更适合指导资源调度。

**Hannah Fry（主持人）：** 为什么要生成多种未来，而不是只公布一条最可能的天气路径？

**Peter Battaglia（嘉宾）：** WeatherNext 3 一类系统可以把未来表示成一棵逐步展开的情景树，让用户看到可能路径、分支概率和随新观测更新的变化。这样预测不再只是“会不会下雨”，而是帮助人判断不同风险下该准备多少资源。

## 06 能源、农业与极端天气：用影响而非榜单评估

**核心判断：** AI 天气模型的最终评价应落在能源、农业、交通和灾害准备的实际影响，而不是只落在一个模型排行榜上的误差数字。

**Hannah Fry（主持人）：** 当模型更快、更便宜、更会表达概率后，哪些领域最先得到收益？

**Peter Battaglia（嘉宾）：** 风能和太阳能调度、农业灌溉、航运与极端天气预警都需要把预测转成行动。模型性能只有在能支持这些决策、让机构提前准备并减少损失时，才真正产生社会价值。这个案例也说明，AI 进入科学领域时，可靠性来自模型、观测、专家流程和责任边界的共同闭环。

## 限制与边界

- 本笔记只读取 B 站专栏正文和页面元数据，没有读取原始视频、音频、图片、ASR、Recastory、Google DeepMind 官方论文或 WeatherNext 原始页面。
- 飓风梅丽莎的时间、概率、等级、伤亡和模型性能均按专栏叙述保留，未独立核验；数字不应脱离原始时间点作外部事实引用。
- “天气树”、GraphCast、WeatherNext 3 的机制在本文中是专栏级概括，不替代官方技术文档或论文。

## 知识连接

- **补充** [[02-Resources/AI and Agents/Frontier Models & Physical AI/DeepMind研究员-递归循环中AI构建AI]]：既有笔记讨论 DeepMind 在递归研究、形式验证和长周期 Agent 中如何处理可靠性；本篇补充 AI 在物理世界预测中的不确定性表达与决策闭环。

## 来源说明

- 来源：B 站专栏《DeepMind研究总监：AI时代的 天气预报》。
- 专栏地址：https://www.bilibili.com/opus/1247508469860270113；专栏 ID：cv52975164；上传者：Easonlee的AI笔记；页面日期：2026-09-13。
- 收录工作流：bilibili_opus_ingest_v2；来源等级 C2；事实状态 partial；仅以 column 为核验范围。

## 关系状态

- 补充：[[02-Resources/AI and Agents/Frontier Models & Physical AI/DeepMind研究员-递归循环中AI构建AI]] — 在既有 DeepMind 研究与递归可靠性讨论之外，补充 AI 在天气这一高不确定性物理系统中的概率预测、决策窗口和影响评估。
