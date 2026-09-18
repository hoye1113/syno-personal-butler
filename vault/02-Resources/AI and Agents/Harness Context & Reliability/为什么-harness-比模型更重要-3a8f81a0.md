---
title: "为什么 Harness 比模型更重要"
tags: ["ai_agent","bilibili","article","harness_engineering","context_engineering","multi_agent","memory"]
created: 2026-09-17
source: "https://www.bilibili.com/opus/1248838208927563782"
description: "YC Paper Club 汇集 Prime Agent、Open Jarvis 与 QM 作者，解释 Harness 如何通过循环、工具、状态、上下文编译和治理，把同一模型的潜力变成可运行的智能体系统。"
knowledge_state: captured
link_status: connected
collection_priority: P0
source_original_date: "2026-09-17"
source_published_at: "2026-09-17 08:50"
ingest_workflow: bilibili_opus_ingest_v2
source_type: bilibili_opus
opus_id: "1248838208927563782"
column_id: "cv53021124"
uploader: "Easonlee的AI笔记"
primary_source: column
source_tier: C2
material_tier: A
source_form: roundtable
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
voice_basis: attributed_paraphrase
factual_status: partial
factual_reviewed: 2026-09-17
verification_scope: column_only
verification_basis: ["column"]
source_kind: url
source_reliability: unverified
source_verification: unverified
source_url: "https://www.bilibili.com/opus/1248838208927563782"
source_content_sha256: 3a8f81a046fbcf3af15ecbe2783b00dd6d6b5535cfa2ee264bc5787e3a262625
bv: "BV1HyeH6HErm"
---

# 为什么 Harness 比模型更重要

> 这篇专栏整理 YC Paper Club 对 Prime Agent、Open Jarvis 与 QM 的分享，核心问题不是“哪个模型更强”，而是模型被放进了什么样的运行系统。
>
> **核心主张：** 工具、状态、上下文、循环和权限的组织方式，会把同一模型的能力拉开数量级；Harness 的价值在于扩大模型可观察、可行动和可验证的空间。

> 模型之外，工具、状态、上下文和权限的组织方式，往往决定智能体能做到什么。
> ——专栏整理

## 开场

专栏由主持人串起多个项目的分享，涉及 ARC-AGI、自动研究、Prime Agent、Open Jarvis 与 QM。下文把不同发言重构为问题驱动的知识笔记；回答均是专栏整理，不把数字、项目定位或演示效果写成独立核验的事实。

## 01 Harness 不是“提示词外壳”，而是测试时能力

**核心判断：** 评价模型时不能只看冻结权重的基准分数，还要看 Harness 能否让它利用测试时经验、工具和反馈。

**编者问：** 为什么一层看起来像脚手架的东西，会显著改变 ARC-AGI 等任务的结果？

**专栏整理：** 分享者把模型视为能力底座，把 Harness 视为组织行动的系统。专栏举例称，同一模型在私有 ARC-AGI 测试上的成绩，可因不同 Harness 从约 30% 提升到 95%，并提到 NVIDIA AVO 达到 100%。这些数字只代表专栏中的口径；可复用的判断是，测试时如何产生、保留和利用经验，已经成为模型能力之外的重要变量。

## 02 从 V0 到 V1：循环、工具预算与上下文编译

**核心判断：** 一个可用 Harness 的最小骨架，是受控循环加上工具、技能、子智能体和上下文编译，而不是一套写死的“计划—执行—反思”脚本。

**编者问：** V1 相比最初的语言模型循环，到底增加了什么？

**专栏整理：** 早期系统只有生成直到结束的循环；随后 Few-shot、思维链、工具调用、可读写记忆和技能逐步扩大了上下文、输出与动作空间。V1 需要明确允许的轮数、工具调用次数、工具列表、技能列表和子智能体列表，再把模型动作与工具结果不断编译回上下文。定时任务、会话管理和可观测驾驶舱让同一个循环能被持续触发，但预算仍是边界，不应允许无限运行。

## 03 自我改进的 Harness 把系统本身变成状态

**核心判断：** 自我改进的关键不是让模型口头反思，而是让提示词、Harness 代码、记忆类别和智能体档案成为可评估、可修改的长期状态。

**编者问：** DSPy、Darwin Gödel Machine 与 Continual Harness 分别改变了什么？

**专栏整理：** DSPy 可以根据示例和评估结果搜索更好的系统提示词；Darwin Gödel Machine 则把可修改范围扩大到 Harness 代码本身。进一步的持续化框架会保存智能体档案、历史和记忆分类，让系统在运行、评估、修改、再运行之间形成闭环。这里的“自我改进”仍依赖适应度函数、回归检查和权限边界，不能把能改代码等同于必然变聪明。

## 04 好框架扩大表达力，而不是规定唯一流程

**核心判断：** 对长任务而言，Harness 最重要的能力是让模型能够编程、管理状态并协调子智能体，而不是替模型预先写死所有步骤。

**编者问：** 为什么 Prime Agent 把 REPL、压缩和持久化子智能体交给模型控制？

**专栏整理：** Prime Agent 用 REPL 让模型先做低成本实验，再决定下一步；持久化子智能体和消息机制则把并行研究、递归调用与上下文压缩纳入可编程空间。对于自动研究和编程任务，真正有效的外循环往往是“提出假设—运行实验—检查结果—继续尝试”，而非单纯增加 token 预算。框架应提供可组合原语，同时允许模型在任务中选择合适的组合。

## 05 Open Jarvis 与 QM：个人能力、公司资源和治理

**核心判断：** 当智能体开始接触真实数据和组织资源，运行环境的选择权必须与隐私、权限、审核和协作语境一起设计。

**编者问：** Open Jarvis 和 QM 如何把 Harness 从个人实验推进到可部署系统？

**专栏整理：** Open Jarvis 尝试把模型、推理引擎、智能体逻辑、工具、记忆、学习和硬件组合成本地个人 AI 技术栈，以降低费用、延迟和隐私暴露。QM 则把会话集中到 Postgres，把沙箱视为可选择的资源，并通过公司 CLI、对象存储和内部应用连接工作流。专栏同时承认，自动修复容易只优化局部，社交语境和机密信息需要细粒度权限，人类审核仍是系统边界的一部分。

## 限制与边界

- 本笔记只读取 B 站专栏正文和页面元数据，没有读取原始视频、音频、图片、ASR、Recastory 或项目原始代码。
- ARC-AGI 成绩、项目规模、模型比较和“同模型拉开数量级”等数字均为专栏口径，未独立核验；应作为讨论线索，不作为已验证基准。
- 原文包含多位分享者和主持串场；本笔记将问题重构为“编者问”，回答统一标为专栏整理，避免把第三方整理稿伪装成逐字对谈。

## 知识连接

- **补充** [[MOC - Harness Engineering]]：为已有 Harness 六模块地图补充 YC Paper Club 对测试时经验、可编程循环、自我修改和治理的多项目案例。
- **补充** [[Karpathy-Code Agent与Auto Research]]：两篇都把自动研究看作“实验外循环”；本篇进一步比较循环运行时与模型本身的分工。

## 来源说明

- 来源：B 站专栏《为什么 Harness 比模型更重要》；专栏地址：https://www.bilibili.com/opus/1248838208927563782。
- 专栏 ID：cv53021124；关联视频：BV1HyeH6HErm；上传者：Easonlee的AI笔记；页面发布时间：2026-09-17 08:50。
- 收录工作流：bilibili_opus_ingest_v2；来源等级 C2；事实状态 partial；仅以 column 为核验范围。图片、ASR、Recastory、transcript 与 Spot Check 均跳过。

## 关系状态

- 补充：[[MOC - Harness Engineering]] — 将 Harness 的测试时适应、可编程循环、自我改进和企业治理纳入现有主题地图。
- 补充：[[Karpathy-Code Agent与Auto Research]] — 以自动研究的实验外循环补充本篇的 Harness V1 与 RLM 讨论。
