---
title: "微软专家：Agent可观测性 生产实践 - 哔哩哔哩"
tags: ["ai_agent","bilibili","ai_evaluation","ai_safety","harness_engineering","multi_agent","agent_architecture","lecture"]
created: 2026-09-16
source: "https://www.bilibili.com/opus/1204900504550768643"
description: "首页 番剧 直播 游戏中心 会员购 漫画 赛事 下载客户端 大会员 消息 1 动态 收藏 历史 创作中心 投稿 目录 微软专家：Agent可观测性 生产实践 摘要 重点速览 01 代理可观测性：关注差距 02 代理构建实战：从零到原型 03 Foundry 控制平面：快速构建与评估 04 代理构建：从门户到代码 05 工作流代理与成本优化 06 追踪与评估 "
knowledge_state: captured
link_status: connected
ingest_workflow: bilibili_opus_ingest_v2
source_type: bilibili_opus
opus_id: "1204900504550768643"
column_id: "cv49418193"
uploader: "Easonlee的AI笔记"
primary_source: column
source_tier: C2
material_tier: A
source_form: lecture
content_form: lecture
dialogue_fidelity: none
question_source: none
voice_basis: direct_speech
factual_status: partial
factual_reviewed: 2026-09-17
verification_scope: column_only
verification_basis: ["column"]
source_kind: url
source_reliability: unverified
source_verification: unverified
source_url: "https://www.bilibili.com/opus/1204900504550768643"
source_content_sha256: b7bf67caabef58f7adb5828eabf30452d3981593a4206e7abb4227f5c5081af0
---

# 微软专家：Agent可观测性 生产实践 - 哔哩哔哩

> 本篇是微软 Foundry 团队关于 Agent 从原型走向生产的研讨会整理，围绕一个问题展开：非确定性的 Agent 如何被持续观察、评估、保护并优化？
>
> **核心主张：** Agent 的生产可靠性不是一次性测试的结果，而是由追踪、任务级评估、持续监控、红队演练和人在回路的优化循环共同建立的。

> 代理是非确定性的。
> ——微软 Foundry 研讨会

## 开场

专栏整理了微软 Foundry 团队 Amy Boyd 与 Nitya Narasimhan 的研讨会。内容从 Agent 与传统软件的差异出发，逐步演示追踪、评估、工作流、多 Agent、红队演练和观察技能。本文只保留专栏正文中的方法与边界，跳过广告、页面 UI 与评论。

## 01 非确定性要求持续闭环

**核心判断：** Agent 不能只在构建完成时测试，因为模型更新、环境变化和新边缘情况会让它逐渐偏离原始需求。

**专栏整理：** 生产中的基本闭环是“评估—监控—优化”。评估关注性能、质量和安全；监控贯穿构建、部署和运行阶段；优化则把运行数据转化为下一轮改进。可观测性不仅是发现错误，也要帮助团队理解需求与实际 Agent 行为之间的差距。

## 02 用 OTEL 追踪 Agent 的完整执行

**核心判断：** 只有把工具调用、消息传递、决策点和工作流步骤串成可检索的 Trace，开发者才能从“结果错了”定位到“哪一步出了问题”。

**专栏整理：** 研讨会介绍了基于 OpenTelemetry 的 Foundry 追踪。它允许不同框架构建的 Agent 接入同一个控制平面，并观察单个 Agent、多 Agent 或跨组织组件的执行过程。追踪还应与 Azure Monitor 等现有云监控连接，让开发者和 IT 管理者分别获得调试与治理视图。

## 03 从模型评分转向任务级评估

**核心判断：** Agent 评估不能停留在一次 LLM 输出的好坏，而要拆开检查意图解析、工具调用、结果质量和任务依从性。

**专栏整理：** 研讨会以旅行 Agent 为例，先确认它是否理解“查询伦敦天气”或旅行需求，再检查它是否选择了正确工具，最后判断是否完成了用户任务。Foundry 提供质量、安全和 Agent 专用评估器，也允许根据业务场景编写自定义评估器。这样可以区分模型推理、工具执行和整体任务完成之间的失败。

## 04 多 Agent 与工作流要看组件级成本

**核心判断：** 将复杂任务拆成航班、酒店等专项 Agent 并不自动带来稳定性，必须用工作流追踪每个子 Agent 的质量、延迟和 Token 成本。

**专栏整理：** 研讨会先展示从门户和 SDK 构建旅行 Agent，再把多个专项 Agent 组织成工作流。多 Agent 追踪比单 Agent 调用更难，因此需要完整的链路视图和组件级评估。只有知道哪一个子 Agent 或工具消耗了成本、降低了质量，团队才能针对性替换，而不是盲目重写整个系统。

## 05 红队演练主动寻找安全缺口

**核心判断：** 静态护栏只能说明正常输入下的预期行为，红队演练要主动验证恶意用户能否操纵 Agent 绕过规则。

**专栏整理：** 红队代理会针对禁止行为、敏感数据泄露、任务依从性等风险类别生成攻击提示。研讨会演示了提示词翻转、leetspeak 和渐强攻击：攻击从看似无害的请求开始，逐步累积上下文，尝试让护栏失效。安全评估和红队演练要分开看，前者观察系统是否按规则工作，后者主动寻找规则被绕过的路径。

## 06 观察技能把优化变成可回放循环

**核心判断：** 编码 Agent 可以自动生成评估数据集、分析失败案例、优化提示词并重新评估，但人仍要决定是否继续、采用哪个版本和何时停止。

**专栏整理：** 观察技能先检查 Agent 元数据，在没有现成评估集时生成数据集，运行基线评估并解释失败原因。随后它可以在“人在回路”下优化指令、建立新版本、重新批量评估并比较结果。如果版本 10 不如版本 5，系统应保留完整尝试历史并回退到最佳版本，而不是把最新版本误当成最优版本。这个过程还可以由技能定义和领域知识约束。

## 07 生产判断：把 Trace 与评估结果连起来

**核心判断：** 真正可用的可观测性视图必须同时呈现执行轨迹和评估变化，才能证明一次提示词、模型或工具改动究竟带来了什么影响。

**专栏整理：** 研讨会最后把生产实践归纳为三点：持续评估与监控偏离，使用编码 Agent 加速数据集与诊断工作，采用 Trace-linked Evaluation 把执行过程与分数变化放在一起。安全上还要同时覆盖正常行为和对抗性行为，并在模型、环境或需求变化后重新启动闭环。

## 限制与边界

- 本笔记只读取 Bilibili 专栏文字和页面元数据，未读取图片、原始视频音频、ASR、transcript 或 Recastory；技术名称、产品能力和演示结果均以专栏整理为准。
- Foundry、Azure Monitor、OTEL、红队策略和观察技能的具体可用性可能随产品版本变化；本文不把研讨会演示当作当前 API 契约。
- 专栏是压缩版研讨会，原始仓库、代码和完整约四小时工作坊没有在本次收录中读取；需要复现实验时应回到来源提供的仓库和文档。

## 知识连接

- **补充** [[galileo联创-ai时代的可观测性-哔哩哔哩-66b5ff96]]：该已有笔记提供 Agent 可观测性或 Harness 语境，本篇补充微软 Foundry 的追踪、任务级评估和红队演练生产闭环。

## 来源说明

- 来源形态：Bilibili 图文专栏（opus 1204900504550768643，column cv49418193），微软 Foundry 研讨会讲义/演示整理。
- 读取范围：column only；source_tier: C2；material_tier: A；source_form: lecture；content_form: lecture；dialogue_fidelity: none；question_source: none；voice_basis: direct_speech。
- factual_status: partial；verification_scope: column_only；verification_basis: [column]。专栏正文通过 Kimi 登录页获取，未读取图片、原始视频或官方原文复核。

## 关系状态

- 补充：[[galileo联创-ai时代的可观测性-哔哩哔哩-66b5ff96]] — 在已有可观测性或 Harness 语境上补充 Agent 生产追踪、任务级评估和主动红队闭环。
