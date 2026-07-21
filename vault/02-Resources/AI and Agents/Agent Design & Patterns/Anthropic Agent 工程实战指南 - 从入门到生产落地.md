---
title: "Anthropic Agent 工程实战指南：从入门到生产落地"
tags: ["ai_agent", "anthropic"]
legacy_tags: ["ai_agent", "anthropic", "agent_engineering"]
created: "2026-06-11"
source: "D:\\AllDownload\\2026-06\\Anthropic Agent 工程实战指南：从入门到生产落地.md"
description: "基于 Anthropic 官方 15 篇 Agent 工程核心技术博客的系统化梳理与翻译，按\"入门-进阶-核心-高级-生产\"路径，覆盖 Agent 基础架构、工具调用、上下文管理、长任务执行、多 Agent 协作、生产环境评测与安全"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/Anthropic Agent 工程实战指南 - 从入门到生产落地.md"
source_sha256: "6aba9e0fc64a3996e7cdae78df62d322898fb749a3f9ac65b7e4981dfd58a01e"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Anthropic 官方]]"
published: unknown
---

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本书内容全部基于 Anthropic 官方发布的 15 篇 Agent 工程核心技术博客，系统梳理了从 Agent 基础概念、架构设计、工具开发、上下文管理，到长任务执行、多智能体协作、生产环境评测与安全防护的全流程知识体系，所有经验均来自 Anthropic 生产环境的实战沉淀，旨在帮助开发者从零到一构建高效、可靠、可落地的 AI Agent 系统。</font>

## <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">前言</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">随着大语言模型（LLM）技术的快速发展，AI Agent（智能体）已经成为 LLM 从对话交互走向复杂任务自动化的核心载体。Anthropic 作为全球领先的大模型研发企业，在 Claude 系列模型的 Agent 工程化落地中积累了大量一线实战经验，从基础架构设计到生产环境的安全、评测、故障治理，形成了一套完整的方法论。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本书将 Anthropic 官方发布的 15 篇 Agent 工程核心文章进行系统化梳理、翻译与整合，按照「入门 - 进阶 - 核心 - 高级 - 生产」的学习路径，拆解 Agent 开发全流程的核心知识点与最佳实践。无论是刚接触 Agent 的入门开发者，还是需要将 Agent 落地到生产环境的资深工程师，都能从本书中获得可直接复用的架构设计、工程方法与避坑指南。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"></font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/686258/1772372691239-7f8d2bf1-8f38-4023-ab9c-7eeed69251c3.png)

## <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">目录</font>
### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模块一：Agent 基础架构（入门篇）</font>
1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 1 章 Agent 架构入门：从单轮对话到自主代理</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 2 章 用 Claude Agent SDK 构建你的第一个 Agent</font>

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模块二：工具与能力扩展（进阶篇）</font>
1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 3 章 Agent 高级工具调用：并行、嵌套与错误处理</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 4 章 如何为 Agent 设计好用的工具</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 5 章 Think Tool：让 Agent 学会 "停下来想一想"</font>
4. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 6 章 Agent Skills：让 Agent 具备真实世界能力</font>

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模块三：上下文与记忆管理（核心篇）</font>
1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 7 章 上下文工程：Agent 的 "记忆" 与 "注意力" 管理</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 8 章 Contextual Retrieval：让 RAG 更懂上下文</font>

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模块四：长任务与多 Agent（高级篇）</font>
1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 9 章 长时间运行的 Agent：如何设计可靠的执行框架</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 10 章 多 Agent 协作系统：Anthropic 的实战经验</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 11 章 MCP 代码执行：构建更高效的 Agent</font>

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模块五：安全、评测与工程化（生产篇）</font>
1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 12 章 Agent 评测体系全解</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 13 章 Agent 安全：从权限提示到沙箱隔离</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 14 章 Coding Agent 工程化最佳实践</font>
4. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 15 章 Agent 故障复盘：三个真实生产案例分析</font>

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">附录：核心术语表</font>
---

## <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模块一：Agent 基础架构（入门篇）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本模块是 Agent 开发的入门基础，将帮你厘清 Agent 的核心定义、架构边界，掌握从简单工作流到自主 Agent 的演进路径，并通过 Claude Agent SDK 完成第一个 Agent 的实战搭建。</font>

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 1 章 Agent 架构入门：从单轮对话到自主代理</font>
**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">原文链接</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>[<font style="color:rgb(0, 102, 255);background-color:rgba(0, 0, 0, 0);">https://www.anthropic.com/engineering/building-effective-agents</font>](https://www.anthropic.com/engineering/building-effective-agents)**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本章核心价值</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：厘清 Agent 与工作流的核心定义，掌握 Agent 系统的 6 种基础构建模式，理解构建有效 Agent 的核心原则，建立对 Agent 架构的完整认知。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">1.1 什么是 Agent 与智能体系统</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在行业中，"Agent" 的定义存在诸多差异：有人将其定义为可长期独立运行、通过各类工具完成复杂任务的完全自治系统；也有人用它描述遵循预定义工作流的指令式系统。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在 Anthropic 的架构体系中，我们将上述所有变体统称为</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">智能体系统（agentic systems）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，并对其中两个核心概念做了关键的架构区分：</font>

+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工作流（Workflows）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：通过预定义的代码路径，对大语言模型和工具进行编排的系统，执行路径是固定的、可预判的。</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent（智能体）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：由大语言模型动态自主地主导执行流程与工具使用，全程自主掌控任务的完成方式，执行路径是非固定的、动态决策的。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">成功的 Agent 落地项目，普遍采用简单、可组合的模式，而非复杂的框架与黑盒封装。这也是本书贯穿始终的核心设计理念。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">1.2 何时使用（以及何时不使用）Agent</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">基于 LLM 构建应用时，我们始终推荐优先选择最简单的可行方案，仅在必要时提升系统复杂度 —— 这意味着很多场景下，你完全不需要构建智能体系统。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">智能体系统往往会用</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">延迟和成本</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">换取更优的任务表现，你需要先判断这笔交易是否值得：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">无需智能体的场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：对于绝大多数场景，通过检索增强、上下文示例优化单轮 LLM 调用，就足以满足需求。</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">优先选择工作流的场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：对于边界清晰、定义明确的任务，工作流能提供可预测性与一致性，是更优选择。</font>
3. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">适合使用 Agent 的场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：当任务需要大规模的灵活性、模型驱动的动态决策，且无法通过固定路径硬编码实现时，Agent 才是最佳选择。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">1.3 框架的使用原则</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">市面上有大量框架可以简化智能体系统的实现，包括 LangChain 旗下的 LangGraph、Amazon Bedrock 的 AI Agent 框架、可视化工具 Rivet 与 Vellum 等。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这些框架能简化 LLM 调用、工具定义与解析、调用链编排等底层标准化任务，降低上手门槛。但同时，它们往往会增加额外的抽象层，掩盖底层的提示词与响应细节，提升调试难度；还会诱使开发者在简单方案足够的场景下，过度增加系统复杂度。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的核心建议是：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">开发者应从直接调用 LLM API 起步，很多模式仅需几行代码即可实现。</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">如果你选择使用框架，必须先理解其底层代码逻辑 —— 对框架底层的错误假设，是开发者最常见的错误来源。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">1.4 智能体系统的核心构建模块</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本节我们将从最基础的构建单元出发，逐步提升复杂度，讲解从简单可组合工作流到自主 Agent 的全量核心模式。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">1.4.1 基础模块：增强型大语言模型</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">智能体系统的基础构建单元，是通过</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">检索、工具、记忆</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">等能力增强的大语言模型。当前的 Claude 系列模型已经可以主动使用这些能力：自主生成搜索查询、选择合适的工具、决定需要留存的信息。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在实现中，我们建议重点关注两个核心维度：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">针对你的具体业务场景，对这些增强能力做定制化适配；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">为 LLM 提供简单、文档完善的调用接口。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们发布的</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模型上下文协议（Model Context Protocol, MCP）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，就是实现这一目标的核心方案，开发者只需简单的客户端实现，即可让 LLM 接入不断增长的第三方工具生态。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">1.4.2 工作流模式 1：提示词链（Prompt chaining）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">提示词链将一个完整任务拆解为一系列连续步骤，每一次 LLM 调用都处理前一步的输出，你还可以在任意中间步骤添加程序化校验（"门控"），确保流程始终在正确的轨道上。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">适用场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：任务可以被清晰、干净地拆解为固定子任务，核心目标是通过降低单次 LLM 调用的任务难度，用延迟换取更高的准确率。</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">典型示例</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">生成营销文案，再将其翻译为其他语言；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">先编写文档大纲，校验大纲符合要求后，再基于大纲完成完整文档写作。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">1.4.3 工作流模式 2：路由（Routing）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">路由模式先对用户输入做分类，再将其分发到专门的后续任务中。这种模式实现了关注点分离，支持构建更具针对性的专用提示词，避免针对某一类输入的优化影响其他输入的表现。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">适用场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：复杂任务中存在明显的类别区分，不同类别需要分开处理，且分类环节可以通过 LLM 或传统分类模型 / 算法精准实现。</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">典型示例</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">将不同类型的客服咨询（通用问题、退款申请、技术支持）分发到不同的下游流程、提示词与工具中；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">将简单 / 常见问题路由到轻量模型（如 Claude 3.5 Haiku），复杂 / 特殊问题路由到能力更强的模型（如 Claude 3.5 Sonnet），实现成本与速度的优化。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">1.4.4 工作流模式 3：并行化（Parallelization）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">大语言模型可以同时并行处理一个任务的多个分支，再通过程序化方式聚合输出结果。这种模式主要有两种核心变体：</font>

+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">分块执行</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：将任务拆解为多个独立的子任务，并行执行；</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">投票机制</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：对同一个任务多次运行，获取多样化的输出，再做聚合决策。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">适用场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：需要通过并行化提升任务执行速度，或需要多个视角 / 多次尝试来获得高置信度结果的场景。对于多维度考量的复杂任务，让单次 LLM 调用单独处理一个维度，通常比单次调用处理所有维度表现更优。</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">典型示例</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">分块执行：实现内容安全护栏时，一个模型实例处理用户查询，另一个实例同步筛查不当内容，比单模型同时处理两项任务表现更优；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">投票机制：代码漏洞审查时，通过多个不同的提示词分别审查代码并标记问题，提升漏洞检出率。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">1.4.5 工作流模式 4：编排器 - 工作节点（Orchestrator-workers）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在编排器 - 工作节点工作流中，一个中心 LLM 动态拆解任务，将子任务委派给多个工作节点 LLM，最终合成所有工作节点的结果。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">它与并行化模式的核心区别是</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">灵活性</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：并行化的子任务是预定义的，而编排器 - 工作节点模式的子任务，由编排器根据具体输入动态决定，无法提前预判。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">适用场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：无法提前预判所需子任务的复杂场景。</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">典型示例</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">每次需要对多个文件做复杂修改的编码产品；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">需要从多个来源收集、分析信息的搜索任务。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">1.4.6 工作流模式 5：评估器 - 优化器（Evaluator-optimizer）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">评估器 - 优化器工作流中，一个 LLM 调用负责生成响应，另一个 LLM 调用在循环中提供评估与反馈，驱动生成结果的持续迭代优化。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">适用场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：拥有清晰的评估标准，且迭代优化能带来可量化的价值提升。两个核心适配信号：一是当人工给出反馈时，LLM 的响应能得到显著优化；二是 LLM 本身能够给出有效的同类反馈。</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">典型示例</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">文学翻译：翻译 LLM 可能无法一次性捕捉所有细节 nuances，而评估 LLM 可以给出有效的优化建议；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">复杂搜索任务：需要多轮搜索与分析来收集全面信息，评估器负责判断是否需要继续搜索。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">1.5 自主 Agent 的核心设计</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">随着大语言模型在复杂输入理解、推理规划、工具可靠使用、错误恢复等核心能力的成熟，Agent 也逐步在生产环境中落地。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 的核心执行逻辑是：从用户指令或交互式对话中明确任务目标后，自主规划并独立执行，过程中可随时向用户请求更多信息或决策判断。执行的每一步，Agent 都必须从环境中获取 "真实结果"（如工具调用返回、代码执行结果）来评估进度，可在检查点或遇到阻塞时暂停并请求人工反馈，同时必须设置停止条件（如最大迭代次数）保证系统可控。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 可以处理高度复杂的任务，但其实现往往非常简单 —— 通常只是 LLM 在循环中，基于环境反馈使用工具。因此，工具集的设计、文档的清晰完善，是 Agent 落地的重中之重。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">适用场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：无法预判所需步骤数量、无法硬编码固定执行路径的开放式问题，且你对模型的决策能力有一定信任度。Agent 的自治性，使其非常适合在可信环境中做规模化任务处理。</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">典型示例</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">解决 SWE-bench 任务的编码 Agent，可基于任务描述对多个文件进行编辑；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Claude 的 "计算机使用" 参考实现，让 Claude 操作电脑完成各类任务。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">同时必须注意：Agent 的自治性也意味着更高的成本，以及错误累积的潜在风险。我们强烈建议在沙箱环境中进行充分测试，并搭建完善的护栏机制。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">1.6 模式的组合与定制</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上述所有构建模块都不是硬性规定，而是开发者可以根据业务场景灵活塑造、组合的通用模式。成功的核心，是持续度量系统表现，并基于结果迭代实现方案 —— 再次强调，</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">仅当复杂度能带来可证明的效果提升时，才应该增加系统复杂度</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">1.7 构建有效 Agent 的三大核心原则</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在 Agent 实现中，我们始终遵循三大核心原则：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">保持 Agent 设计的简洁性</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：拒绝不必要的复杂度，从最简单的可行方案起步，逐步迭代；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">优先保障透明度</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：通过显式展示 Agent 的规划步骤，让其决策过程可追溯、可调试；</font>
3. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">精心设计 Agent - 计算机交互接口（ACI）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：通过完善的工具文档与充分的测试，让 Agent 能清晰、无歧义地使用工具。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">框架可以帮你快速起步，但在推向生产环境时，不要犹豫减少抽象层，基于基础组件直接构建。遵循这些原则，你才能构建出不仅强大，更可靠、可维护、被用户信任的 Agent 系统。</font>

---

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 2 章 用 Claude Agent SDK 构建你的第一个 Agent</font>
**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">原文链接</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>[<font style="color:rgb(0, 102, 255);background-color:rgba(0, 0, 0, 0);">https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk</font>](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本章核心价值</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：理解 Claude Agent SDK 的设计理念，掌握 Agent 核心循环的实现方法，从零搭建一个具备上下文管理、工具调用、结果验证能力的完整 Agent。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.1 Claude Agent SDK 设计核心理念</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">去年，我们分享了与客户合作沉淀的有效 Agent 构建经验，同期发布了 Claude Code—— 一个最初为提升 Anthropic 内部开发者效率打造的智能编码解决方案。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">过去几个月，Claude Code 早已超越编码工具的范畴，我们内部用它完成深度研究、视频创作、笔记整理等无数非编码场景，它甚至已经成为我们绝大多数核心 Agent 循环的底层支撑。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">换句话说，支撑 Claude Code 的智能体框架（Claude Code SDK），完全可以支撑更多类型的 Agent 构建。为了体现这一更广阔的定位，我们将其正式更名为 </font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Claude Agent SDK</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Claude Agent SDK 的核心设计原则非常简单：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">给你的 Agent 一台计算机，让它能像人类一样完成工作</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。就像程序员需要电脑、终端、文件系统、各类开发工具来完成工作一样，Agent 也需要同等的能力，才能高效、可靠地完成复杂任务。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">基于这一理念，Claude Agent SDK 可以帮你构建各类场景的 Agent，包括但不限于：</font>

+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">金融 Agent</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：理解你的投资组合与目标，通过外部 API 获取数据、运行代码完成计算，辅助投资评估；</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">个人助理 Agent</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：对接你的内部数据源，管理日历、预订差旅、安排会议、整理简报；</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">客服 Agent</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：处理高模糊度的用户请求，收集查看用户数据、对接外部 API、回复用户，必要时升级人工处理；</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">深度研究 Agent</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：在海量文档集合中完成全面研究，搜索文件系统、多源信息合成、交叉验证数据、生成详细报告。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.2 Agent 核心循环：上下文收集→执行动作→验证工作→循环往复</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在 Claude Code 中，Claude 始终遵循一个特定的反馈循环运行，这也是 Claude Agent SDK 中所有 Agent 的核心执行范式：</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上下文收集（gather context）→ 执行动作（take action）→ 验证工作（verify work）→ 重复循环（repeat）</font>**

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这个循环是构建所有 Agent 的基础，无论你的 Agent 面向什么场景，都可以基于这个核心循环，拆解为三个核心环节的能力设计。接下来，我们将以一个「邮件管理 Agent」为例，完整讲解每个环节的实现方法。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.3 上下文收集能力设计</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">开发 Agent 时，你需要给它的不只是一条提示词，更要让它能自主获取、更新自己的上下文。Claude Agent SDK 提供了完整的能力体系，帮 Agent 高效完成上下文收集。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.3.1 智能体搜索与文件系统</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">文件系统是 Agent 上下文的核心载体，文件夹与文件结构本身，就是一种上下文工程。当 Claude 遇到日志、用户上传的大文件时，会自主决定通过 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">grep</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">、</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">tail</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 等 bash 命令，只加载需要的内容到上下文，而非全量读取。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如我们的邮件 Agent，可以将历史对话存储在 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Conversations</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 文件夹中，当用户询问相关历史时，Agent 会自主搜索该文件夹，获取对应的上下文。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.3.2 语义搜索</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">语义搜索是另一种常见的上下文获取方式，它通常比智能体搜索速度更快，但准确率更低、维护成本更高、透明度更差。它需要先将上下文分块、向量化，再通过向量查询匹配相关内容。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的建议是：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">优先从智能体搜索起步，仅当你需要更快的速度或更多样化的结果时，再补充语义搜索</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.3.3 子 Agent（Subagents）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Claude Agent SDK 默认支持子 Agent 能力，它主要解决两个核心问题：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">并行化执行</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：可以启动多个子 Agent，同时并行处理不同的子任务；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上下文管理</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：子 Agent 使用独立的上下文窗口，仅将相关信息返回给主编排器，而非全量上下文，非常适合需要从海量信息中筛选有效内容的场景。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如邮件 Agent 可以内置「搜索子 Agent」能力，并行启动多个子 Agent，用不同的查询条件检索邮件历史，最终只返回相关的邮件片段，而非完整的邮件线程。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.3.4 上下文压缩（Compaction）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">当 Agent 长时间运行时，上下文维护会成为核心瓶颈。Claude Agent SDK 的压缩功能，会在上下文接近窗口上限时，自动总结之前的对话内容，避免 Agent 因上下文溢出而中断运行。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.4 动作执行能力设计</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">完成上下文收集后，你需要给 Agent 提供灵活的动作执行能力，Claude Agent SDK 提供了完整的执行层能力支持。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.4.1 工具（Tools）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具是 Agent 执行动作的核心基础模块，它会被优先展示在 Claude 的上下文窗口中，是 Claude 决策时优先考虑的执行方式。因此，你需要针对性地设计工具，让其覆盖 Agent 最核心、最高频的动作。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">对于邮件 Agent，我们可以定义 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">fetchInbox</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">（获取收件箱）、</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">searchEmails</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">（搜索邮件）等核心工具，作为 Agent 的高频执行动作。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.4.2 Bash 与脚本执行</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Bash 是一个通用型工具，能让 Agent 通过计算机完成灵活的工作。比如邮件 Agent 遇到用户附件中的重要信息时，可以通过编写代码下载 PDF、转换为文本、检索关键信息，全程通过 bash 执行完成。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.4.3 代码生成</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Claude Agent SDK 在代码生成上的能力极为突出。代码具备精确、可组合、无限复用的特性，是需要可靠执行复杂操作的 Agent 的理想输出形式。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如 Claude.AI 的文件创建功能，完全基于代码生成实现：Claude 编写 Python 脚本，创建 Excel、PPT、Word 文档，确保格式统一、功能复杂，这是其他方式难以实现的。对于邮件 Agent，我们可以让用户通过自然语言定义邮件规则，Agent 自动生成对应的执行代码，实现邮件的自动化处理。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.4.4 模型上下文协议（MCP）集成</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">MCP 提供了外部服务的标准化集成方案，自动处理认证与 API 调用。这意味着你无需编写自定义集成代码、管理 OAuth 流程，即可让 Agent 对接 Slack、GitHub、Google Drive、Asana 等工具。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">对于邮件 Agent，我们可以通过 MCP 快速集成 Slack 消息搜索、Asana 任务查看能力，让 Agent 结合团队上下文，更精准地处理邮件。而不断增长的 MCP 生态，也能让你快速为 Agent 新增能力。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.5 工作验证的三大核心方法</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 循环的最后一环，是对自己的工作进行验证。能够自查、优化自身输出的 Agent，本质上更可靠 —— 它们能在错误累积前发现问题，发生偏移时自我修正，通过迭代持续优化结果。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">核心是给 Claude 提供具体的结果评估方式，我们沉淀了三种最有效的验证方法：</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.5.1 规则定义</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">最好的反馈形式，是为输出定义清晰的规则，再向 Agent 说明哪些规则未通过、失败的原因。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如代码的 lint 检查，就是典型的规则化反馈。对于邮件 Agent，我们可以定义规则：校验邮箱地址有效性、校验是否曾向该地址发送过邮件，不满足则抛出对应的错误 / 警告。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.5.2 视觉反馈</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">当 Agent 完成 UI 生成、测试等可视化任务时，截图、渲染结果形式的视觉反馈非常有效。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如邮件 Agent 发送 HTML 格式邮件时，可以对生成的邮件截图，返回给模型做视觉校验，检查布局、样式、内容层级是否符合预期，再做迭代优化。通过 Playwright 等 MCP 服务，你可以将这个视觉反馈循环完全自动化。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.5.3 LLM 作为裁判</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">你也可以用另一个大语言模型，基于模糊规则对 Agent 的输出做 "裁判"。这种方法通常鲁棒性不强，且会带来显著的延迟开销，但对于性能提升的价值超过成本的场景，仍然非常有帮助。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如邮件 Agent，可以用一个独立的子 Agent 作为裁判，校验草稿的语气风格，是否与用户过往的邮件风格匹配。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.6 Agent 测试与优化方法</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">完成 Agent 循环的基础搭建后，你需要对 Agent 进行测试与持续优化。最好的优化方式，是仔细查看 Agent 的输出，尤其是失败的场景，站在 Agent 的视角思考：它是否拥有完成任务的正确工具？</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们总结了几个核心的优化自检问题：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">如果 Agent 误解了任务，是否是因为缺失了关键信息？能否调整搜索 API 的结构，让它更容易找到所需内容？</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">如果 Agent 反复在某个任务上失败，能否在工具调用中添加正式规则，识别并修复失败问题？</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">如果 Agent 无法修正错误，能否给它提供更有用、更创新的工具，换一种方式解决问题？</font>
4. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">如果 Agent 的表现随着功能新增出现波动，能否基于用户使用场景，构建有代表性的测试集，做程序化的效果评估？</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2.7 快速上手指南</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Claude Agent SDK 为 Agent 提供了访问计算机的能力，支持文件编写、命令执行、工作迭代，大幅降低了自治 Agent 的构建门槛。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">只要你围绕「上下文收集 - 执行动作 - 验证工作」的核心循环设计，就能构建出易于部署、易于迭代的可靠 Agent。你可以直接通过官方文档，快速上手 Claude Agent SDK，对于已经基于旧版 SDK 开发的开发者，官方也提供了完整的版本迁移指南。</font>

---

## <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模块二：工具与能力扩展（进阶篇）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具是 Agent 与真实世界交互的核心桥梁，也是 Agent 从对话能力走向任务执行能力的关键。本模块将深入讲解 Agent 工具调用的进阶技巧、工具设计的核心原则，以及通过 Think Tool、Agent Skills 扩展 Agent 能力的完整方法，帮你打造能力边界更宽、执行更稳定的 Agent。</font>

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 3 章 Agent 高级工具调用：并行、嵌套与错误处理</font>
**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">原文链接</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>[<font style="color:rgb(0, 102, 255);background-color:rgba(0, 0, 0, 0);">https://www.anthropic.com/engineering/advanced-tool-use</font>](https://www.anthropic.com/engineering/advanced-tool-use)**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本章核心价值</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：掌握三大高级工具调用特性的实现与最佳实践，解决大规模工具集的上下文溢出、多工具调用的效率瓶颈、参数使用的准确率问题，实现 Agent 工具调用的规模化、高效化、高准确率落地。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.1 高级工具调用的核心背景</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">AI Agent 的未来，是能无缝跨数百、数千个工具完成工作的智能系统：IDE 助手需要集成 git 操作、文件处理、包管理、测试框架、部署流水线；运营协调 Agent 需要对接 Slack、GitHub、Google Drive、Jira、企业数据库与数十个 MCP 服务。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">但传统的工具调用模式，在规模化落地中遇到了三大核心瓶颈：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上下文窗口溢出</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：将所有工具定义一次性塞入上下文，会带来极高的 token 开销。我们在生产中见过，工具定义在优化前就消耗了 13.4 万 token，严重挤压了任务本身的上下文空间；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">执行效率低下</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：传统自然语言工具调用，每次调用都需要一次完整的模型推理，中间结果无论是否有用，都会堆积在上下文中，带来严重的延迟与上下文污染；</font>
3. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">调用准确率不足</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：JSON Schema 只能定义结构合法性，无法表达使用规范、参数组合、业务约定，导致模型频繁出现参数错误、工具选错的问题。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">为了解决这些问题，我们正式发布了三大高级工具调用特性：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具搜索工具（Tool Search Tool）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">、</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">程序化工具调用（Programmatic Tool Calling）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">、</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具使用示例（Tool Use Examples）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。内部测试显示，这些特性让我们实现了很多传统工具调用模式无法完成的能力。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.2 工具搜索工具（Tool Search Tool）</font>
##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.2.1 核心解决的问题</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">随着接入的 MCP 服务越来越多，工具定义的 token 开销会呈指数级增长：5 个常用 MCP 服务的 58 个工具，就会消耗约 5.5 万 token；再接入 Jira 等服务，很快就会突破 10 万 token 开销。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">同时，工具数量越多，模型选错工具、传错参数的概率就越高，尤其是名称相似的工具（如 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">notification-send-user</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 与 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">notification-send-channel</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">），错误率会显著上升。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.2.2 实现方案</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具搜索工具的核心逻辑是：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">不再提前加载所有工具定义，而是让 Claude 按需动态发现、加载工具</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。初始上下文仅加载工具搜索工具本身（约 500 token），以及你指定的高频核心工具；当 Claude 需要特定能力时，先通过搜索工具找到相关工具，再将匹配的工具完整定义加载到上下文。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这种模式带来了极致的 token 优化：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">传统模式：50+ MCP 工具，提前加载约 7.2 万 token，任务开始前总上下文消耗约 7.7 万 token；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具搜索工具模式：仅加载搜索工具，按需加载 3-5 个相关工具（约 3000 token），总上下文消耗约 8700 token，</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">节省了 95% 的上下文空间，token 用量减少 85%</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">同时，工具搜索工具还带来了显著的准确率提升：内部测试中，Opus 4 在大规模工具集的 MCP 评估中，准确率从 49% 提升至 74%；Opus 4.5 从 79.5% 提升至 88.1%。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.2.3 实现代码示例</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">基础实现方式如下，你可以将工具标记为 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">defer_loading: true</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，实现按需加载：</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">json</font>

```plain
{
  "tools": [
    // 内置正则/BM25工具搜索工具，也可实现自定义向量搜索
    {"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"},

    // 标记工具为延迟加载，按需发现
    {
      "name": "github.createPullRequest",
      "description": "Create a pull request",
      "input_schema": {...},
      "defer_loading": true
    }
    // 数百个延迟加载的工具
  ]
}
```

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">对于 MCP 服务，你可以整服务延迟加载，仅保留高频工具常驻：</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">json</font>

```plain
{
  "type": "mcp_toolset",
  "mcp_server_name": "google-drive",
  "default_config": {"defer_loading": true}, // 整服务延迟加载
  "configs": {
    "search_files": {
      "defer_loading": false // 高频工具常驻上下文
    }
  }
}
```

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.2.4 适用场景与最佳实践</font>
**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">推荐使用的场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具定义总消耗超过 1 万 token；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具选择准确率存在问题；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">基于多 MCP 服务构建的系统；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">可用工具数量超过 10 个。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">不推荐使用的场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具库很小（<10 个工具）；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">所有工具在每次会话中都会高频使用；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具定义本身非常精简。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">核心最佳实践</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具名称与描述要清晰、具象，避免模糊的命名（如用 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">search_customer_orders</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 替代 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">query_db_orders</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">），提升搜索匹配准确率；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在系统提示中，告知 Claude 可用的工具大类，引导它正确使用搜索能力；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3-5 个最常用的工具设置为常驻加载，其余全部延迟加载，平衡响应速度与上下文开销。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.3 程序化工具调用（Programmatic Tool Calling, PTC）</font>
##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.3.1 核心解决的问题</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">传统工具调用存在两个致命的效率问题：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">中间结果导致的上下文污染</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：比如分析 10MB 日志文件的错误模式，整个文件都会进入上下文，哪怕 Claude 只需要错误频率的汇总结果；多表查询客户数据时，所有记录都会堆积在上下文，无论是否相关。</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">推理开销与手动合成的误差</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：每次工具调用都需要一次完整的模型推理，5 步工作流就需要 5 次推理，同时 Claude 需要手动解析、合成多个工具的结果，既慢又容易出错。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.3.2 实现方案</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">程序化工具调用的核心逻辑是：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">让 Claude 通过代码编排工具调用，而非通过单次 API 往返逐个调用工具</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。Claude 编写 Python 代码，在代码执行沙箱中调用多个工具、处理工具输出、控制哪些信息最终进入上下文窗口。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具调用的完整流程变为：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">你将工具标记为允许从代码执行环境调用；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">API 自动将这些工具转换为 Claude 可调用的 Python 函数；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Claude 生成编排代码，通过代码执行工具发起调用；</font>
4. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">代码执行时，工具调用请求会发送给你的服务，结果直接返回沙箱处理，不进入 Claude 上下文；</font>
5. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">代码执行完成后，仅最终输出结果进入 Claude 上下文。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">以「Q3 差旅预算超支人员排查」任务为例，传统模式需要 20 + 次工具调用，2000 + 条消费明细全部进入上下文，token 消耗极高；而程序化工具调用模式下，Claude 仅需编写一段代码，最终只有超支人员的汇总结果进入上下文，token 消耗从 200KB 降至 1KB。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.3.3 核心收益</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">内部测试显示，程序化工具调用带来了全方位的性能提升：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">token 用量显著降低</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：复杂研究任务中，平均 token 用量从 43588 降至 27297，减少 37%；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">延迟大幅优化</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：20 + 次工具调用的工作流，可减少 19 + 次模型推理，耗时从小时级降至分钟级；</font>
3. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">准确率明显提升</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：内部知识检索任务准确率从 25.6% 提升至 28.5%，GIA 基准测试从 46.5% 提升至 51.2%。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.3.4 实现代码示例</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第一步，标记工具允许从代码执行环境调用：</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">json</font>

```plain
{
  "tools": [
    {
      "type": "code_execution_20250825",
      "name": "code_execution"
    },
    {
      "name": "get_team_members",
      "description": "Get all members of a department...",
      "input_schema": {...},
      "allowed_callers": ["code_execution_20250825"] // 开启程序化调用
    },
    {
      "name": "get_expenses",
      "description": "Retrieve expense line items for a user...",
      "input_schema": {...},
      "allowed_callers": ["code_execution_20250825"]
    }
  ]
}
```

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第二步，Claude 会自动生成编排代码，完成多工具的并行调用、数据处理：</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">python</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">运行</font>

```plain
team = await get_team_members("engineering")

# 并行获取所有职级的预算
levels = list(set(m["level"] for m in team))
budget_results = await asyncio.gather(*[
    get_budget_by_level(level) for level in levels
])
budgets = {level: budget for level, budget in zip(levels, budget_results)}

# 并行获取所有人员的消费数据
expenses = await asyncio.gather(*[
    get_expenses(m["id"], "Q3") for m in team
])

# 筛选超支人员
exceeded = []
for member, exp in zip(team, expenses):
    budget = budgets[member["level"]]
    total = sum(e["amount"] for e in exp)
    if total > budget["travel_limit"]:
        exceeded.append({
            "name": member["name"],
            "spent": total,
            "limit": budget["travel_limit"]
        })

print(json.dumps(exceeded))
```

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.3.5 适用场景与最佳实践</font>
**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">推荐使用的场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">处理大数据集，仅需聚合 / 汇总结果；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">包含 3 个及以上依赖工具调用的多步工作流；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">需要对工具结果做过滤、排序、转换后再给模型处理；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">中间数据不应该影响模型推理的场景；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">需要跨大量条目并行执行的操作（如检查 50 个接口可用性）。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">不推荐使用的场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">简单的单工具调用；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">任务需要 Claude 查看并推理所有中间结果；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">小响应的快速查询场景。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.4 工具使用示例（Tool Use Examples）</font>
##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.4.1 核心解决的问题</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">JSON Schema 只能定义 "什么结构是合法的"，但无法回答业务使用中的关键问题：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">日期格式应该用 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">2024-11-06</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">、</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Nov 6, 2024</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 还是 ISO 格式？</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">可选参数在什么场景下需要传入？</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">参数之间有什么关联关系？</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">业务约定的 ID 命名规范是什么？</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这些歧义，会直接导致工具调用的参数错误、格式错误、业务逻辑错误。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.4.2 实现方案</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具使用示例，允许你在工具定义中直接提供工具调用的样例，通过具体示例，让 Claude 理解工具的使用规范、参数约定、业务场景，而非仅靠 Schema 定义。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">示例如下：</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">json</font>

```plain
{
    "name": "create_ticket",
    "input_schema": { /* 原有的JSON Schema定义 */ },
    "input_examples": [
      {
        "title": "登录页面返回500错误",
        "priority": "critical",
        "labels": ["bug", "authentication", "production"],
        "reporter": {
          "id": "USR-12345",
          "name": "Jane Smith",
          "contact": {
            "email": "jane@acme.com",
            "phone": "+1-555-0123"
          }
        },
        "due_date": "2024-11-06",
        "escalation": {
          "level": 2,
          "notify_manager": true,
          "sla_hours": 4
        }
      },
      {
        "title": "新增深色模式支持",
        "labels": ["feature-request", "ui"],
        "reporter": {
          "id": "USR-67890",
          "name": "Alex Chen"
        }
      }
    ]
  }
```

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">通过 3 个示例，Claude 可以快速学习到：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">日期格式使用 YYYY-MM-DD，用户 ID 遵循 USR-XXXXX 规范；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">严重故障需要填写完整的联系人信息、升级配置与 SLA，而功能需求仅需基础信息；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">可选参数的使用场景与组合逻辑。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">内部测试显示，工具使用示例让复杂参数处理的准确率从 72% 提升至 90%。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.4.3 适用场景与最佳实践</font>
**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">推荐使用的场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">复杂的嵌套结构，合法 JSON 不代表正确的业务使用；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">包含大量可选参数，且参数的传入有明确的场景规律；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">API 有 Schema 无法覆盖的领域特定约定；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">存在多个相似工具，需要通过示例区分使用场景。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">不推荐使用的场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">单参数、用法明确的简单工具；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Claude 已经熟知的标准格式（如 URL、邮箱）；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">可以通过 JSON Schema 约束解决的校验问题。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">核心最佳实践</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">使用真实的业务数据，而非 "string"、"value" 这类占位符；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">展示多样性：覆盖极简、部分、完整参数的使用模式；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">保持精简：每个工具 1-5 个示例即可，仅针对 Schema 无法覆盖的歧义点；</font>
4. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">聚焦核心歧义，不要重复 Schema 已经明确的内容。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">3.5 三大特性的组合使用策略</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这三个特性并非互斥，而是互补的，你可以根据业务的核心瓶颈，分层叠加使用：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">先解决核心瓶颈：工具定义导致的上下文膨胀 → 工具搜索工具；中间结果导致的上下文污染 → 程序化工具调用；参数错误 → 工具使用示例；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">再叠加其他特性，形成完整的高级工具调用体系：工具搜索工具确保找到正确的工具，程序化工具调用确保高效执行，工具使用示例确保正确调用。</font>

---

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 4 章 如何为 Agent 设计好用的工具</font>
**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">原文链接</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>[<font style="color:rgb(0, 102, 255);background-color:rgba(0, 0, 0, 0);">https://www.anthropic.com/engineering/writing-tools-for-agents</font>](https://www.anthropic.com/engineering/writing-tools-for-agents)**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本章核心价值</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：掌握面向 Agent 的工具设计核心原则，从原型搭建、效果评测到持续优化的全流程方法，打造让 Agent 用得对、用得好、用得高效的工具集。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">4.1 面向 Agent 的工具设计，到底有什么不同？</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在传统软件开发中，工具是确定性系统之间的契约，一个函数 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">getWeather("NYC")</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 每次调用都会以完全相同的方式获取纽约天气。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">但面向 Agent 的工具，是</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">确定性系统与非确定性 Agent 之间的契约</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。当用户问 "今天我需要带伞吗？"，Agent 可能会调用天气工具，可能会用通用知识回答，也可能先询问用户的位置。偶尔，Agent 还会出现幻觉，甚至无法理解工具的使用方式。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这意味着，我们不能用给开发者写 API、写函数的思路，来给 Agent 设计工具。我们需要站在 Agent 的视角，重新思考工具的设计逻辑。而我们的实战经验表明：对 Agent 来说 "好用" 的工具，对人类来说也同样直观、易懂。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">4.2 工具设计的全流程方法</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们沉淀了一套从原型到落地的完整工具设计流程，同时可以借助 Claude 本身，完成工具的优化与迭代。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">4.2.1 第一步：搭建快速原型</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">不实际使用，你永远无法预判 Agent 对工具的适配度。首先要做的，是快速搭建工具原型：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">如果你用 Claude 编写工具，需要给它提供依赖的软件库、API、SDK 的完整文档，尤其是 LLM 友好的纯文本说明；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">将工具封装到本地 MCP 服务或桌面扩展中，即可在 Claude Code 或 Claude 桌面应用中连接测试；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">先亲自测试工具，找出明显的粗糙边缘，再收集用户反馈，建立对工具核心使用场景的认知。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">4.2.2 第二步：构建评测体系</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">要衡量工具的效果，必须搭建一套完整的评测体系，核心是生成贴合真实场景的评测任务：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">任务设计</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：基于真实使用场景设计任务，避免过于简单的 "沙箱" 场景。好的任务通常需要多次工具调用，甚至数十次，比如 "安排下周和 Jane 的会议，附上上次项目规划会议的笔记，预订会议室"，而非 "给 jane@acme.corp 安排一个会议"。</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">结果校验</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：每个评测任务，都需要配套可验证的结果或输出标准。校验器可以是简单的字符串匹配，也可以是 LLM 裁判，注意避免过于严格的校验，拒绝因格式、标点等非核心差异导致的正确结果。</font>
3. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">指标收集</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：除了核心的任务准确率，还要收集工具调用总次数、token 总消耗、工具错误率、单任务耗时等指标，定位工具的问题。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">4.2.3 第三步：与 Agent 协作，持续优化工具</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">你完全可以让 Claude 帮你优化工具：将评测中的 Agent 执行日志粘贴到 Claude Code 中，Claude 可以精准分析工具的问题，一次性重构优化大量工具，确保工具的实现与描述自洽。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">事实上，本文中绝大多数的最佳实践，都来自我们用 Claude Code 反复优化内部工具实现的过程。甚至在 SWE-bench 基准测试中，我们优化工具描述的时间，比优化整体提示词的时间还要多。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">4.2.4 第四步：结果分析与迭代</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">观察 Agent 在哪些场景会卡住、会困惑，重点关注三个维度：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">阅读 Agent 的推理过程与执行日志，找出理解偏差的根源；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">分析工具调用指标：大量冗余调用，可能需要优化分页、token 限制参数；大量参数错误，可能需要优化工具描述或补充示例；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">关注 Agent 没说出口的内容：它没有调用的工具、没有提及的逻辑，往往比它输出的内容更重要。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">4.3 工具设计的八大核心原则</font>
##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">4.3.1 原则一：选对要实现的工具，宁缺毋滥</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">更多工具不代表更好的效果。一个常见的错误，是不加选择地将现有软件功能、API 端点直接封装为工具，完全不考虑是否适合 Agent 使用。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 的上下文是有限的宝贵资源，我们应该构建少数几个针对高价值工作流的、经过深思熟虑的工具，而非大量零散的、无差别的工具。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">核心设计方法</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">优先实现面向任务的高阶工具，而非面向操作的低阶工具。比如实现 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">schedule_event</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">（查找可用时间并安排会议），而非 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">list_users</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">、</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">list_events</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">、</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">create_event</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 三个独立工具；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具必须能减少中间输出的上下文消耗。比如实现 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">search_logs</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">（仅返回相关日志行与上下文），而非 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">read_logs</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">（返回全量日志）；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">合并高频链式调用的多个操作，封装为一个工具。比如实现 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">get_customer_context</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，一次性返回客户的近期全量相关信息，而非分开查询客户信息、交易记录、服务备注。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">每个工具都必须有清晰、独立的用途，让 Agent 能像人类一样拆解任务，同时减少上下文消耗。过多的工具、功能重叠的工具，会让 Agent 分心，无法选择高效的执行策略。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">4.3.2 原则二：通过命名空间，明确工具边界</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">当 Agent 接入数十个 MCP 服务、数百个工具时，功能重叠、名称模糊的工具，会让 Agent 频繁选错。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">命名空间（将相关工具归类到统一前缀下），可以帮 Agent 清晰区分工具边界。比如按服务分类（</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">asana_search</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">、</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">jira_search</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">），再按资源细分（</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">asana_projects_search</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">、</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">asana_users_search</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">）。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的实战经验表明，命名空间的命名方案，会对工具调用的准确率产生显著影响，建议你通过评测，选择最适合自己业务的命名方式。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">4.3.3 原则三：返回高信号内容，而非全量数据</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具的返回结果，应该只给 Agent 提供高信号、高相关度的信息，优先保证上下文相关性，而非灵活性。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">核心设计方法</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">优先返回自然语言名称、业务语义字段，而非底层技术 ID（如 UUID）。我们的实战显示，将无意义的 UUID 转换为有语义的语言标识，能显著减少 Claude 的幻觉，提升检索任务的准确率；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">提供响应格式控制，让 Agent 自主选择返回结果的详细程度。比如通过 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">response_format</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 参数，支持 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">concise</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">（精简）与 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">detailed</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">（详细）两种模式，默认返回精简结果，仅当 Agent 需要后续工具调用的 ID 等信息时，再返回详细结果；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">避免返回低价值的技术字段，比如 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">mime_type</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">、</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">256px_image_url</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 等，除非 Agent 明确需要。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">4.3.4 原则四：优化返回结果的 token 效率</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上下文是 Agent 的宝贵资源，必须对工具返回结果做 token 效率优化。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">核心设计方法</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">对可能返回大量内容的工具，实现分页、范围选择、过滤、截断能力，并设置合理的默认值。我们在 Claude Code 中，默认限制工具返回结果不超过 2.5 万 token；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">如果对结果做了截断，必须给 Agent 明确的提示，引导它使用更精准的搜索、分页能力，而非单次宽泛查询；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具的错误响应，必须清晰、可行动，而非不透明的错误码或堆栈信息。明确告诉 Agent 哪里错了、应该怎么修正，而非只说 "调用失败"。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">4.3.5 原则五：像写提示词一样，打磨工具描述与参数定义</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具描述与参数定义，会被加载到 Agent 的上下文中，直接决定 Agent 能否正确使用工具，需要像优化提示词一样，精心打磨。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">核心设计方法</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">像给团队新员工讲解工具一样，写工具描述。把你默认掌握的上下文 —— 专业术语定义、特殊查询格式、底层资源的关联关系 —— 全部明确写出来；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">参数命名必须无歧义。比如用 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">user_id</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，而非模糊的 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">user</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">明确描述输入输出的格式要求、业务约定，避免歧义；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">即使是微小的描述优化，也可能带来效果的巨大提升。Claude Sonnet 3.5 能在 SWE-bench Verified 上达到 SOTA 效果，核心原因之一就是我们对工具描述做了精准优化，大幅降低了错误率。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">4.3.6 原则六：防错设计（Poka-yoke），让 Agent 难以犯错</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在工具设计中，要主动修改参数、流程，让 Agent 难以犯常见错误。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如我们在 SWE-bench 的 Agent 开发中，发现 Agent 离开根目录后，使用相对路径会频繁出错。我们直接修改工具，强制要求必须使用绝对文件路径，之后模型就再也没有出现过这类错误。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">4.3.7 原则七：给工具补充使用示例</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">正如上一章所讲，在工具定义中补充真实的使用示例，能让 Agent 快速理解工具的使用规范，大幅提升调用准确率。尤其是对于复杂嵌套结构、有业务约定的工具，示例的效果远胜于纯文字描述。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">4.3.8 原则八：站在模型的视角，测试工具的使用</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具设计完成后，问自己一个问题：基于描述和参数定义，我能一眼看明白这个工具怎么用吗？如果不行，那模型大概率也不行。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">同时，必须在工作台上运行大量示例输入，观察模型使用工具时会犯哪些错误，基于错误持续迭代优化。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">4.4 工具设计的安全与隐私考量</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">当工具能访问敏感数据、执行修改操作时，必须做好安全与隐私防护：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">最小权限原则：工具仅开放完成任务所需的最小权限，禁止过度授权；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">操作可审计：所有工具调用都必须留下完整日志，支持事后追溯；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">破坏性操作二次确认：对于删除、修改等破坏性操作，必须设置二次确认机制；</font>
4. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">隐私数据隔离：通过代码执行沙箱，实现敏感数据的 "端到端流转"，避免敏感数据进入模型上下文。比如客户的 PII 数据，从一个系统通过代码沙箱流转到另一个系统，全程不进入 Claude 的上下文。</font>

---

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 5 章 Think Tool：让 Agent 学会 "停下来想一想"</font>
**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">原文链接</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>[<font style="color:rgb(0, 102, 255);background-color:rgba(0, 0, 0, 0);">https://www.anthropic.com/engineering/claude-think-tool</font>](https://www.anthropic.com/engineering/claude-think-tool)**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本章核心价值</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：理解 Think Tool 的核心作用与适用场景，掌握其实现方法与提示词优化技巧，大幅提升 Agent 在复杂推理、多步工具调用、政策合规场景的表现。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">5.1 什么是 Think Tool？</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在持续优化 Claude 复杂问题解决能力的过程中，我们发现了一个极其有效的方法：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Think Tool（思考工具）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">—— 它为 Claude 在复杂任务中，创造了一个专属的结构化思考空间，带来了显著的效果提升。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">很多人会把它和 Claude 的 "扩展思考（extended thinking）" 能力混淆，但二者有着本质的区别：</font>

+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">扩展思考</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：是 Claude 在开始生成响应之前，做的深度思考与方案迭代，发生在响应生成之前；</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Think Tool</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：是 Claude 在生成响应的过程中，专门增加的一个思考步骤，让它停下来，判断自己是否拥有推进任务所需的全部信息。尤其适合长链条工具调用、需要处理工具返回的外部信息、需要严格遵循复杂政策的场景。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">简单来说，扩展思考适合单轮、非顺序的工具调用，或无需工具的编码、数学、物理任务；而 Think Tool 更适合复杂工具调用、长链条多步决策、政策密集型的高风险场景。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">5.2 Think Tool 的基础实现</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Think Tool 的实现极其简单，仅需在工具列表中增加如下定义，即可完成接入：</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">json</font>

```plain
{
  "name": "think",
  "description": "使用该工具进行思考。它不会获取新信息，也不会修改数据库，仅会将思考内容追加到日志中。当需要复杂推理或缓存记忆时使用该工具。",
  "input_schema": {
    "type": "object",
    "properties": {
      "thought": {
        "type": "string",
        "description": "需要思考的内容。"
      }
    },
    "required": ["thought"]
  }
}
```

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这个工具不会产生任何外部交互，也不会修改任何状态，仅会将 Claude 的思考内容记录下来，给它一个专属的 "草稿纸"，让它在行动前，先把思路理清楚。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">5.3 Think Tool 的效果验证</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们通过行业标准的 Agent 基准测试，充分验证了 Think Tool 的效果提升。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">5.3.1 τ-Bench 基准测试结果</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">τ-Bench（tau-bench）是一个全面的客服场景 Agent 基准测试，核心评估模型在真实客服场景中，遵循复杂政策、使用工具、多轮对话交互的能力。它使用 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">pass^k</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 作为核心指标，衡量 k 次独立测试全部成功的概率，重点评估 Agent 的一致性与可靠性 —— 这对客服场景至关重要。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">测试结果显示：</font>

+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">航空客服领域</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：搭配优化提示词的 Think Tool，</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">pass^1</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 指标达到 0.570，相比无 Think Tool 的基线 0.370，</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">相对提升 54%</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">；</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">零售客服领域</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：即使没有额外的提示词优化，仅增加 Think Tool，</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">pass^1</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 指标就从 0.783 提升至 0.812，超过了单独使用扩展思考的效果。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">更关键的是，这种提升在 k=5 时依然保持稳定，说明 Think Tool 不仅提升了单次成功率，更让 Agent 能更有效地处理边缘案例与异常场景。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">5.3.2 SWE-bench 基准测试结果</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们在 Claude 3.7 Sonnet 的 SWE-bench 测试中，也加入了适配的 Think Tool，最终帮助模型达到了 0.623 的 SOTA 分数。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">隔离实验显示，仅增加 Think Tool，就带来了</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">平均 1.6% 的性能提升</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，且统计结果具备极高的显著性（p < .001）。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">5.4 Think Tool 的提示词优化</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">仅把 Think Tool 加入工具列表，能带来一定的效果提升，但要发挥它的最大价值，必须搭配针对性的提示词优化，明确告诉 Claude 何时、如何使用 Think Tool。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">以下是我们在航空客服场景中，经过验证的最优提示词模板，你可以直接适配到自己的业务场景中：</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">markdown</font>

```plain
## Think Tool 使用规范
在收到工具返回结果后，采取任何行动或回复用户之前，必须先使用 think 工具作为草稿纸，完成以下思考：
1. 列出当前请求适用的具体规则
2. 检查是否已经收集到所有必填信息
3. 验证计划执行的操作是否完全符合所有政策要求
4. 对工具返回结果进行正确性校验

以下是使用 think 工具的示例，你需要严格遵循这种思考模式：

<think_tool_example_1>
用户想要取消 ABC123 航班
- 需要核验：用户ID、预订ID、取消原因
- 检查取消规则：
  * 是否在预订后24小时内？
  * 若不在，检查机票舱位与保险情况
- 核验所有航段均未起飞，且未过期
- 计划：收集缺失信息→核验规则→获取用户确认
</think_tool_example_1>

<think_tool_example_2>
用户想要预订3张去纽约的机票，每人2件托运行李
- 需要用户ID，用于核验：
  * 会员等级对应的行李额度
  * 账户内可用的支付方式
- 行李费用计算：
  * 经济舱 × 3名乘客
  * 普通会员：每人1件免费行李 → 3件额外行李 = 150美元
  * 银卡会员：每人2件免费行李 → 0额外费用
  * 金卡会员：每人3件免费行李 → 0额外费用
- 支付规则核验：
  * 最多使用1张旅行券、1张信用卡、3张礼品卡
  * 所有支付方式必须已在账户中绑定
  * 旅行券余额不找零
- 计划：
1. 获取用户ID
2. 核验会员等级，计算行李费用
3. 检查账户内可用的支付方式，确认组合是否合规
4. 计算总费用：机票价格+行李费用
5. 获取用户的明确预订确认
</think_tool_example_2>
```

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的测试显示，提示词优化是 Think Tool 效果最大化的核心。在高复杂度的航空客服场景中，仅增加 Think Tool 而不做提示词优化，效果与单独使用扩展思考接近；而搭配优化后的提示词，效果实现了质的飞跃。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">5.5 Think Tool 的适用场景</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">基于大量的测试与实战经验，我们总结了 Think Tool 能带来最大价值的三大核心场景：</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">5.5.1 工具输出分析场景</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">当 Claude 需要仔细处理前序工具调用的输出，再决定下一步行动，甚至可能需要回溯调整方案时，Think Tool 能给它一个结构化的空间，完成对工具结果的深度分析，避免遗漏关键信息、误判结果。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如日志分析、多源数据聚合、代码执行结果调试等场景，Think Tool 能显著提升 Agent 对结果的理解深度与决策准确率。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">5.5.2 政策密集型环境</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">当 Claude 需要严格遵循详细的业务规则、合规政策，且必须验证每一步操作的合规性时，Think Tool 能强制它停下来，逐条核对规则，避免因 "跳步" 导致的合规风险。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如金融合规、客服退款、保险理赔、医疗咨询等强规则场景，Think Tool 能大幅提升 Agent 的政策遵循率，降低违规风险。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">5.5.3 序列决策场景</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">当每一步行动都建立在前序步骤的基础上，一旦犯错就会带来高昂成本的多步决策场景，Think Tool 能让 Agent 在每一步行动前，先复盘前序步骤、规划后续路径，避免错误累积。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如代码开发、自动化运维、多步交易操作等场景，Think Tool 能显著降低 Agent 的错误率，提升长链条任务的完成率。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">5.6 实现最佳实践与避坑指南</font>
##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">5.6.1 核心最佳实践</font>
1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">领域专属的提示词与示例</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：最有效的方式，是在系统提示词中，明确说明 Think Tool 的使用时机与方法，并提供贴合你的业务场景的示例。</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">复杂规则放入系统提示词</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：当 Think Tool 的使用规则较长、较复杂时，放入系统提示词的效果，远好于放在工具描述中。系统提示词能提供更完整的上下文，让模型更好地将思考过程融入整体行为。</font>
3. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">适配场景的工具描述</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：针对不同的业务场景，调整工具描述。比如编码场景，重点强调 "方案 brainstorming、bug 修复思路梳理"；客服场景，重点强调 "政策核对、信息完整性校验"。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">5.6.2 不适用的场景</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Think Tool 并非万能的，在以下场景中，它不会带来任何效果提升，反而会增加不必要的 prompt 长度与输出 token 消耗：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">非序列的单工具调用</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：如果 Claude 仅需单次工具调用，或多个并行工具调用即可完成任务，无需思考步骤；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">简单的指令遵循场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：任务没有太多约束，模型的默认行为已经能满足需求，无需额外的思考步骤。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">5.6.3 关键注意事项</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Think Tool 的接入成本极低，几乎没有负面风险：它不会改变 Agent 的外部行为，除非 Claude 主动决定使用它，也不会干扰你现有的工具与工作流。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们建议你先从 Agent 最头疼的高复杂度场景入手，增加 Think Tool 与适配的提示词，测试效果后，再逐步推广到全场景。</font>

---

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 6 章 Agent Skills：让 Agent 具备真实世界能力</font>
**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">原文链接</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>[<font style="color:rgb(0, 102, 255);background-color:rgba(0, 0, 0, 0);">https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills</font>](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本章核心价值</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：理解 Agent Skills 的设计理念与核心架构，掌握技能的开发、封装、复用方法，让通用 Agent 快速具备领域专属能力，适配真实世界的复杂业务场景。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">6.1 为什么需要 Agent Skills？</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">随着 Claude 模型能力的提升，我们已经可以构建能访问完整计算环境的通用 Agent，比如 Claude Code 就能通过本地代码执行与文件系统，完成跨领域的复杂任务。但随着 Agent 能力越来越强，我们需要一种可组合、可扩展、可移植的方式，给 Agent 注入领域专属的专业知识与流程规范。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这就是我们打造 </font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent Skills</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 的核心原因：它是一套由指令、脚本、资源组成的结构化文件夹，Agent 可以动态发现、按需加载，从而在特定任务上获得更优的表现。Skills 可以将你的专业知识，封装为 Agent 可复用的能力，让通用 Agent 快速转变为适配你业务的专属 Agent。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">构建一个 Skill，就像给新员工做入职指引。你无需为每个场景从零构建定制化的 Agent，只需通过 Skills，将你的流程知识封装为可组合的能力，即可让 Agent 快速掌握。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">6.2 Agent Skills 的核心架构与渐进式披露设计</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">一个 Skill 的核心，是一个包含 YAML 前言的 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">SKILL.md</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 文件，以及配套的文件夹、脚本、资源文件。它的核心设计原则是</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">渐进式披露</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，就像一本结构清晰的手册，从目录到章节再到附录，让 Agent 仅在需要时，才加载对应的信息，最大化节省上下文空间。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Skill 的架构分为三层，层层递进，按需加载：</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">6.2.1 第一层：元数据（预加载）</font>
`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">SKILL.md</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 文件开头的 YAML 前言，必须包含 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">name</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">（技能名称）与 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">description</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">（技能描述）两个必填元数据。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 启动时，会将所有已安装 Skill 的元数据，预加载到系统提示词中。这一层仅提供最精简的信息，让 Agent 知道每个 Skill 的用途，判断何时应该使用这个 Skill，而不会加载完整内容，占用上下文空间。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">示例：</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">markdown</font>

```plain
---
name: pdf
description: 全面的PDF处理工具集，支持文本与表格提取、文档合并拆分、表单填写等功能。
---
```

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">6.2.2 第二层：核心说明（按需加载）</font>
`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">SKILL.md</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 的正文内容，是 Skill 的核心说明文档。当 Agent 判断这个 Skill 与当前任务相关时，才会主动读取 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">SKILL.md</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 的完整内容，加载到上下文中。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这里可以包含技能的核心使用方法、快速入门示例、核心流程规范，是 Agent 使用这个 Skill 的核心指引。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">6.2.3 第三层：扩展资源（按需导航）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">当 Skill 变得复杂，单一 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">SKILL.md</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 无法容纳全部内容，或部分内容仅在特定场景下需要时，可以将额外的说明、脚本、资源，打包到 Skill 目录下的其他文件中，在 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">SKILL.md</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 中通过文件名引用。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 仅在需要时，才会主动读取这些关联文件。比如 PDF 处理 Skill 中，我们将表单填写的详细说明放到 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">forms.md</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 中，将高级参考文档放到 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">reference.md</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 中，Agent 仅在需要处理 PDF 表单时，才会读取 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">forms.md</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，不会提前加载无关内容。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这种渐进式披露的设计，让 Skill 能承载的上下文容量几乎没有上限，同时不会对 Agent 的基础上下文造成负担。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">6.3 Agent Skills 的核心能力</font>
##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">6.3.1 代码执行能力封装</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Skills 不仅可以包含说明文档，还可以封装可执行的代码，让 Agent 按需调用执行。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">大语言模型擅长很多任务，但有些操作更适合传统代码执行：比如列表排序，通过 token 生成的成本远高于直接运行排序算法；除了效率，代码还能提供确定性的、可重复的执行结果。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如 PDF 处理 Skill 中，我们封装了预写好的 Python 脚本，用于读取 PDF 并提取所有表单字段。Claude 可以直接运行这个脚本，无需将脚本或 PDF 加载到上下文，同时保证执行的一致性与稳定性。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">6.3.2 跨会话的能力复用</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Skills 是标准化的目录结构，可以轻松分享、安装、复用。你可以为团队的业务场景，构建一套标准化的 Skill 库，所有团队成员的 Agent 都可以安装使用，确保业务流程的一致性。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">同时，Agent 可以在使用过程中，将自己成功的执行方法、常见错误规避方案，沉淀到 Skill 中，形成持续的能力迭代。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">6.4 Skill 开发的最佳实践</font>
##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">6.4.1 从评测出发，找准能力缺口</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Skill 开发的起点，应该是 Agent 能力的缺口。先让 Agent 在你的代表性业务任务上运行，观察它在哪些场景会卡住、表现不佳、需要额外的上下文，再针对性地构建 Skill，填补这些缺口。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">不要凭空设计 Skill，必须基于真实的业务场景与 Agent 的实际表现，确保 Skill 能解决真实的问题。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">6.4.2 为规模化做结构设计</font>
1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">当 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">SKILL.md</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 变得臃肿时，及时将内容拆分到独立文件中，通过引用关联。如果不同场景的内容互斥、很少同时使用，分开存放能显著降低 token 消耗；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">明确区分代码的用途：哪些是 Agent 应该直接运行的脚本，哪些是仅作为参考文档读取的代码，避免歧义；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">保持目录结构的清晰，让 Agent 能轻松导航到需要的内容。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">6.4.3 站在 Agent 的视角设计</font>
1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">重点打磨 Skill 的 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">name</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 与 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">description</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，这是 Agent 判断是否使用该 Skill 的核心依据，必须清晰、准确地描述 Skill 的核心用途；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">持续监控 Agent 对 Skill 的实际使用情况，观察它是否会在正确的场景触发 Skill，是否会遗漏关键的关联文件，是否会误解 Skill 的使用方法，基于观察持续迭代；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">让 Agent 参与 Skill 的迭代：当 Agent 使用 Skill 出现偏差时，直接问它 "哪里不清楚、需要补充什么说明"，让它自己提出优化方案；当 Agent 用 Skill 成功完成复杂任务时，让它把成功的方法沉淀到 Skill 中。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">6.4.4 迭代式开发，小步快跑</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Skill 开发不是一劳永逸的，你可以先从一个最小可用的 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">SKILL.md</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 起步，基于 Agent 的使用反馈，持续补充内容、优化结构，逐步完善 Skill 的能力。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">6.5 Skill 的安全考量</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Skills 能通过指令与代码，给 Agent 赋予新的能力，这也带来了对应的安全风险：恶意的 Skill 可能会引入环境漏洞，引导 Agent 泄露数据、执行非预期操作。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的核心安全建议：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">仅从可信来源安装 Skill；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">安装非可信来源的 Skill 前，必须完整审计文件夹内的所有文件，重点关注代码依赖、外部网络请求、资源文件；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">对于包含外部网络连接的 Skill，必须严格审计其访问的地址，避免数据泄露风险。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">6.6 落地与未来规划</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">目前，Agent Skills 已经在 Claude.ai、Claude Code、Claude Agent SDK、Claude 开发者平台全量支持。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">未来，我们会持续完善 Skill 的全生命周期能力，包括创建、编辑、发现、分享、使用的全流程支持，同时探索 Skill 与 MCP 服务的深度结合，让 Agent 能通过 Skill，掌握涉及外部工具与软件的复杂工作流。更长远来看，我们希望让 Agent 能自主创建、编辑、评估 Skill，将自己的行为模式，沉淀为可复用的能力。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Skill 的核心魅力在于它的极简设计，正是这种简单的格式，让企业、开发者、终端用户，都能轻松构建定制化的 Agent，给它们赋予全新的能力。</font>

---

## <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模块三：上下文与记忆管理（核心篇）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上下文是 Agent 的 "记忆" 与 "注意力"，是决定 Agent 长任务表现、多轮对话一致性、复杂推理能力的核心。本模块将深入讲解上下文工程的完整方法论，以及 Contextual Retrieval 这一检索增强的新范式，帮你解决 Agent 的长上下文遗忘、关键信息丢失、检索准确率不足等核心痛点。</font>

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 7 章 上下文工程：Agent 的 "记忆" 与 "注意力" 管理</font>
**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">原文链接</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>[<font style="color:rgb(0, 102, 255);background-color:rgba(0, 0, 0, 0);">https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents</font>](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本章核心价值</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：理解上下文工程的核心定义与底层逻辑，掌握上下文管理的全流程方法，解决长对话、长任务中的上下文衰减、注意力分散、窗口溢出等核心问题。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">7.1 什么是上下文工程？</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">过去几年，提示词工程是应用 AI 领域的核心焦点，但现在，行业的重心已经转向</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上下文工程</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。基于大语言模型的应用开发，已经不再是 "找到合适的提示词"，而是要回答一个更核心的问题：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">什么样的上下文配置，最有可能让模型生成我们期望的行为？</font>**

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们对上下文工程的定义是：</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上下文工程，是在大语言模型推理时，对进入上下文窗口的 token 集合（信息）进行 curated 与持续管理的全套策略，包括提示词之外的所有可能进入上下文的信息。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">提示词工程，聚焦于如何写出高效的提示词，尤其是系统提示词；而上下文工程，是更广义的体系，它要管理整个上下文状态 —— 包括系统指令、工具、MCP、外部数据、对话历史等，在多轮推理的过程中，持续优化上下文的内容。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">对于单轮任务，提示词工程就足够了；但对于需要多轮推理、长时间运行的 Agent，上下文工程才是核心。Agent 在循环中会不断生成新的数据，这些数据都可能成为下一轮推理的相关上下文，必须持续地、循环地对其进行精炼。上下文工程，就是从不断变化的信息宇宙中，筛选出最应该进入有限上下文窗口的内容的艺术与科学。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">7.2 为什么上下文工程对 Agent 至关重要？</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">尽管模型的上下文窗口越来越大，但我们的研究与实战都发现：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">随着上下文窗口中的 token 数量增加，模型从上下文中准确召回信息的能力会下降，这就是 "上下文衰减（context rot）" 现象</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这种现象，本质上源于大语言模型的架构底层约束：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Transformer 架构中，每个 token 都要与上下文里的其他所有 token 做注意力计算，n 个 token 会产生 n² 组两两关系。随着上下文长度增加，模型捕捉这些关系的能力会被稀释，自然产生了 "注意力预算" 的约束；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模型的训练数据中，短序列远多于长序列，模型对长上下文的依赖关系处理，天生缺乏足够的训练；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">即使通过位置编码插值让模型支持更长的序列，也会带来 token 位置理解的性能衰减。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这意味着，上下文不是越多越好，而是要把它当作一种</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">收益递减的有限资源</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。就像人类的工作记忆容量有限一样，LLM 的 "注意力预算" 也是有限的，每新增一个 token，都会消耗一部分预算。上下文工程的核心目标，就是找到</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">最小的高信号 token 集合，最大化期望结果的出现概率</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">7.3 有效上下文的核心构成</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上下文工程的第一步，是把上下文的各个组成部分，都做到高信号、低冗余。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">7.3.1 系统提示词：找到 "刚刚好" 的抽象层级</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">系统提示词是上下文的核心骨架，必须用简洁、直接的语言，在合适的抽象层级上，给 Agent 明确的指引。这里有两个常见的失败极端：</font>

+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">过度具体</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：在提示词中硬编码复杂、脆弱的 if-else 逻辑，要求 Agent 严格遵循固定步骤，导致系统脆弱、维护成本极高；</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">过度模糊</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：只给出空泛的高层指引，没有给模型具体的行为信号，错误地假设模型能理解你默认的上下文。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">最优的系统提示词，必须在二者之间找到平衡：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">足够具体，能有效引导行为；足够灵活，能给模型提供强启发式规则，适配未预见的场景</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的核心建议：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">用 XML 标签或 Markdown 标题，将提示词分为不同的模块（如背景信息、核心指令、工具指引、输出规范），提升可读性；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">从最小可用的提示词起步，用最好的模型测试基础表现，再基于失败场景，逐步补充清晰的指令与示例；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">避免堆砌大量边缘案例，而是精选多样化的、典型的示例，覆盖核心行为模式。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">7.3.2 工具：促进高效，而非制造混乱</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具定义了 Agent 与信息、动作空间的契约，会直接占用上下文窗口，必须遵循两个核心原则：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">最小可用工具集</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：避免臃肿的工具集，工具之间不能有功能重叠。如果人类工程师都无法明确判断某个场景该用哪个工具，Agent 也做不到。工具应该像设计良好的代码库函数一样，自包含、容错性强、用途清晰；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">参数与描述无歧义</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：输入参数的命名必须描述性强、无歧义，工具描述必须清晰说明用途、输入输出、适用场景，避免模糊的表述。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">7.3.3 示例：少而精，而非多而杂</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">少样本提示（few-shot prompting）是提升模型表现的经典方法，但很多团队会在提示词中堆砌大量边缘案例，试图覆盖所有规则，这反而会稀释核心信号，让模型抓不住重点。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的建议是：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">精心筛选一组多样化的、典型的规范示例，清晰地展示 Agent 的预期行为</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。对 LLM 来说，一个好的示例，胜过千言万语的规则描述。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">7.4 上下文检索：从预检索到 "即时" 动态加载</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在《Building effective agents》一文中，我们明确了 Agent 的核心定义：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">LLM 在循环中自主使用工具</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。随着行业的发展，Agent 的上下文设计，也正在发生核心转变：从 "预推理时间的嵌入检索"，转向 **"即时" 上下文策略（just in time）**。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">传统的 RAG 方案，会在推理前，对所有相关数据做预处理，向量化后存入向量数据库，推理时一次性检索出相关内容，塞入上下文。而 "即时" 策略的核心，是让 Agent 维护轻量级的标识符（文件路径、存储的查询、网页链接等），在运行时通过工具，动态地将数据加载到上下文。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如 Claude Code 就是用这种方式，对大型数据库做复杂的数据分析：模型编写针对性的查询，存储结果，通过 head、tail 等 bash 命令分析大量数据，全程不会将完整的数据对象加载到上下文。这和人类的认知模式完全一致：我们不会记住整个知识库，而是通过文件系统、收件箱、书签等外部索引系统，按需检索相关信息。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这种 "即时" 动态加载的优势：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上下文效率最大化</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：仅加载当前步骤真正需要的内容，避免无关信息占用注意力预算；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">渐进式信息发现</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：Agent 可以通过探索，逐层构建对任务的理解，每一步交互得到的上下文，都会指导下一步的决策，而非一次性塞入所有信息；</font>
3. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">避免索引过时</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：无需提前构建、维护向量索引，直接访问最新的原始数据，避免索引与原始数据不一致的问题。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">当然，这种模式也有取舍：运行时探索比预检索更慢，需要精心设计工具与启发式规则，确保 Agent 能高效地导航信息空间。在很多场景中，</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">混合策略</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">是最优解：提前检索部分高频核心数据保证速度，同时给 Agent 保留自主探索的能力，按需加载更多内容。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">7.5 长周期任务的上下文工程</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">对于需要跨数十分钟、甚至数小时的长周期任务，token 数量会远超模型的上下文窗口，必须通过专门的技术，保证 Agent 的连贯性与目标一致性。我们沉淀了三大核心技术，解决长周期任务的上下文管理难题。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">7.5.1 上下文压缩（Compaction）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">压缩，是指当对话接近上下文窗口上限时，对对话内容进行总结，用总结后的内容重新初始化上下文窗口。它的核心，是高保真地提炼上下文窗口中的核心内容，保留架构决策、未解决的问题、实现细节，丢弃冗余的工具输出与重复信息，让 Agent 能在性能衰减最小的情况下，持续运行。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如在 Claude Code 中，我们的实现方式是：将消息历史传给模型做总结压缩，保留最关键的细节，再加上最近访问的 5 个文件，作为新的上下文窗口。用户获得了对话的连续性，完全无需担心上下文窗口溢出。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">压缩的核心艺术，在于 "保留什么、丢弃什么" 的选择。过度激进的压缩，会导致后续才会凸显重要性的细节丢失。我们的建议是：先最大化召回率，确保压缩提示词能捕捉到 trace 中的所有相关信息，再逐步迭代提升精准度，剔除多余内容。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">其中，最安全、最轻量的压缩方式，是</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具结果清理</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：对于对话历史深处的工具调用，一旦任务完成，就可以清理掉原始的工具返回结果，仅保留核心结论，这能大幅减少上下文冗余，几乎不会有信息丢失的风险。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">7.5.2 结构化笔记（Agentic Memory）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">结构化笔记（也叫 Agent 记忆），是指让 Agent 定期将笔记写入上下文窗口之外的持久化存储中，在后续需要时，再拉回上下文窗口。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这种策略，用极小的开销，提供了持久化的记忆能力。就像 Claude Code 会创建待办清单，玩宝可梦的 Agent 会记录探索过的区域地图、战斗策略、训练进度，即使上下文重置，Agent 也能通过读取自己的笔记，继续执行数小时的长周期任务，保持策略的连贯性。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">为了简化这种模式的实现，我们在 Claude 开发者平台，发布了公测版的记忆工具，通过基于文件的系统，让 Agent 可以轻松地在上下文之外存储、查询信息，跨会话维护项目状态、构建知识库。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">7.5.3 子 Agent 架构</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">子 Agent 架构，是另一种突破上下文限制的核心方案。不再用一个 Agent 维护整个项目的全量状态，而是用专门的子 Agent，在干净的上下文窗口中处理聚焦的子任务。主 Agent 用高层计划做协调，子 Agent 完成深度的技术工作或信息检索，最终仅将精简的、提炼后的结果返回给主 Agent（通常仅 1000-2000 token），而详细的搜索、探索上下文，都隔离在子 Agent 内部。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这种模式实现了清晰的关注点分离，在复杂的研究任务中，相比单 Agent 系统，带来了显著的性能提升。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">7.5.4 技术选型指南</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">三种技术适用于不同的场景：</font>

+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上下文压缩</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：适合需要大量来回交互、需要保持对话流连贯性的任务；</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">结构化笔记</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：适合有明确里程碑的迭代式开发任务；</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">子 Agent 架构</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：适合需要并行探索的复杂研究、分析任务。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">7.6 上下文工程的核心原则总结</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上下文工程，代表了基于 LLM 构建应用的底层范式转变。随着模型能力越来越强，挑战不再是写出完美的提示词，而是在每一步推理中，精心筛选进入模型有限注意力预算的信息。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">无论你是为长周期任务实现压缩机制，设计 token 高效的工具，还是让 Agent 按需探索环境，核心指导原则始终不变：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">找到最小的高信号 token 集合，最大化期望结果的出现概率</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">即使模型能力持续提升，上下文窗口不断扩大，"将上下文当作宝贵的有限资源"，依然是构建可靠、高效 Agent 的核心准则。</font>

---

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 8 章 Contextual Retrieval：让 RAG 更懂上下文</font>
**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">原文链接</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>[<font style="color:rgb(0, 102, 255);background-color:rgba(0, 0, 0, 0);">https://www.anthropic.com/engineering/contextual-retrieval</font>](https://www.anthropic.com/engineering/contextual-retrieval)**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本章核心价值</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：理解传统 RAG 的核心痛点，掌握 Contextual Retrieval 的实现方法与优化技巧，大幅提升检索准确率，让 RAG 系统真正理解上下文语义。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">8.1 传统 RAG 的核心痛点</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">要让 AI 模型在特定场景中发挥作用，通常需要给它接入专属的背景知识。检索增强生成（RAG）是目前最主流的方案：它将知识库拆分为小块文本，转化为向量嵌入存入向量数据库，用户提问时，检索出语义相关的文本块，追加到提示词中，让模型基于专属知识生成回答。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">但传统 RAG 有一个致命的缺陷：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在分块编码时，破坏了原文的上下文</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，这直接导致系统经常无法检索到真正相关的信息。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">举个最典型的例子：</font><font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在美股 SEC filings 的知识库中，一个文本块的内容是 "该公司营收较上一季度增长了 3%"。但这个块本身，没有说明是哪家公司、哪个季度的营收，脱离了原文的上下文，它就成了无意义的信息。当用户问 "ACME 公司 2023 年 Q2 的营收增速是多少？" 时，传统 RAG 很难将这个块与用户的问题匹配上，因为块本身没有 "ACME 公司"、"2023 年 Q2" 这些关键上下文信息。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这就是传统 RAG 最核心的 "上下文困境"：分块会丢失上下文，而不分块，又无法实现高效的检索与长文本处理。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">8.2 什么是 Contextual Retrieval？</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Contextual Retrieval（上下文检索），是我们为了解决传统 RAG 的上下文丢失问题，提出的新一代检索范式。它的核心逻辑非常简单：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在对每个文本块做嵌入和 BM25 索引之前，先给这个块前置一段基于全文生成的、块专属的解释性上下文</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，让每个文本块都自带完整的语境信息，不再是脱离原文的孤立片段。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">还是以上面的 SEC filings 为例，Contextual Retrieval 会将原始块转化为：</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">该片段来自 ACME 公司 2023 年 Q2 业绩的 SEC 备案文件，上一季度营收为 3.14 亿美元。该公司营收较上一季度增长了 3%。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这样一来，文本块就包含了完整的上下文信息，当用户查询相关问题时，无论是语义嵌入匹配，还是关键词匹配，都能精准地找到这个相关块，彻底解决了上下文丢失的问题。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的实验显示，Contextual Retrieval 能将检索失败率降低 49%；如果再搭配重排序，检索失败率能降低 67%，这是检索准确率的量级式提升，会直接转化为下游生成任务的效果提升。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">8.3 Contextual Retrieval 的完整实现方法</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">手动给数百万个文本块添加上下文是不现实的，我们可以通过 Claude，自动化完成上下文的生成。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">8.3.1 核心提示词模板</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们使用 Claude 3 Haiku 来生成每个块的上下文，提示词模板如下，你可以直接复用：</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">markdown</font>

```plain
<document> 
{{WHOLE_DOCUMENT}} 
</document> 
这里是我们需要放在完整文档上下文中的文本块：
<chunk> 
{{CHUNK_CONTENT}} 
</chunk> 
请给出一段简短、简洁的上下文，将这个文本块放在完整文档的语境中，目的是提升该文本块的搜索检索效果。仅输出这段简洁的上下文，不要输出其他任何内容。
```

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">生成的上下文通常在 50-100 token，我们会将它前置到原始文本块之前，再对这个 "上下文 + 原始块" 的完整内容，做嵌入生成与 BM25 索引。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">8.3.2 成本优化：提示词缓存</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">给每个文本块生成上下文，需要重复传入完整的原始文档，这会带来较高的成本。而 Claude 的提示词缓存功能，完美解决了这个问题：你只需将完整文档加载到缓存中一次，后续所有块的上下文生成，都可以直接引用缓存的内容，无需重复传入。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们测算过，假设文档为 8000 token，每个块 800 token，上下文指令 50 token，每个块生成 100 token 的上下文，那么生成上下文的单次成本，仅为每百万文档 token 1.02 美元，几乎可以忽略不计。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">8.3.3 两大核心实现分支</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Contextual Retrieval 包含两个互补的核心技术，二者结合能实现最优效果：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上下文嵌入（Contextual Embeddings）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：给每个块前置上下文后，再生成向量嵌入，解决语义匹配的上下文丢失问题；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上下文 BM25（Contextual BM25）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：给每个块前置上下文后，再构建 BM25 索引，解决关键词匹配的上下文丢失问题。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的实验数据显示：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">仅上下文嵌入，就能将 top20 块的检索失败率从 5.7% 降至 3.7%，相对降低 35%；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上下文嵌入 + 上下文 BM25，能将失败率降至 2.9%，相对降低 49%。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">8.4 搭配重排序，实现效果最大化</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在 Contextual Retrieval 的基础上，我们可以再增加重排序（Reranking）环节，进一步提升检索准确率。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">传统 RAG 的检索环节，通常会返回数百个潜在相关的块，其中大部分相关性很低。重排序的核心逻辑，是用专门的重排序模型，给初始检索返回的块，基于与用户查询的相关性打分，筛选出 top-K 个最相关的块，再传给生成模型。这既能提升回答的准确率，又能减少传给模型的 token 数量，降低成本与延迟。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">完整的流程变为：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">用 Contextual Embeddings + Contextual BM25，做初始检索，返回 top150 个潜在相关块；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">用重排序模型，基于用户查询，给每个块打分；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">筛选出 top20 个高分块，传给大语言模型生成最终回答。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的实验显示，</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">重排序 + Contextual Embeddings+Contextual BM25</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，能将 top20 块的检索失败率从 5.7% 降至 1.9%，相对降低 67%，实现了检索准确率的极致提升。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">当然，重排序会带来少量的延迟增加，你需要在效果与延迟之间，找到适合自己业务的平衡。我们建议先从 Contextual Retrieval 起步，再逐步增加重排序环节。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">8.5 实现的关键注意事项与优化技巧</font>
##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">8.5.1 分块策略优化</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">文本块的拆分方式（块大小、块边界、块重叠），会直接影响 Contextual Retrieval 的效果。我们建议根据文档的类型，选择合适的分块策略：对于结构化文档，优先按章节、段落边界拆分；对于非结构化文档，选择合适的块大小（通常 200-800 token），并保留少量重叠，避免关键信息被拆分到两个块中。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">8.5.2 嵌入模型选型</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Contextual Retrieval 能在所有嵌入模型上带来效果提升，但不同模型的收益幅度不同。我们的测试中，Gemini 与 Voyage 的嵌入模型，配合 Contextual Retrieval 能实现最优的效果。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">8.5.3 自定义上下文生成提示词</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上面的通用提示词模板，能适配绝大多数场景。但对于特定的垂直领域，你可以定制专属的提示词，比如加入领域术语表、文档的背景信息，进一步提升上下文生成的精准度。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">8.5.4 检索块数量选择</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的测试显示，传入 top20 个块给模型，效果优于 top10 或 top5。当然，你需要基于自己的业务场景，测试不同的块数量，找到效果与成本的平衡点。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">8.5.5 生成环节的上下文区分</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在生成最终回答时，建议明确区分 "前置上下文" 与 "原始文本块"，让模型清晰地知道哪些是语境说明，哪些是原文的核心内容，避免模型将上下文说明当作原文事实引用。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">8.6 核心效果总结</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们在代码库、小说、ArXiv 论文、科学论文等多个知识领域，做了全面的测试，最终总结出 RAG 系统的效果优化优先级：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">嵌入 + BM25 的组合，优于单独使用嵌入；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Voyage 与 Gemini 是目前表现最优的嵌入模型；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">给模型传入 top20 个块，效果优于更少的数量；</font>
4. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">给文本块添加上下文，能大幅提升检索准确率；</font>
5. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">增加重排序环节，能进一步优化效果；</font>
6. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">所有优化是可叠加的：要实现最大化的效果提升，需要将 Contextual Embeddings、Contextual BM25、重排序三者结合。</font>

---

## <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模块四：长任务与多 Agent（高级篇）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">当 Agent 需要处理跨小时、跨天的长周期任务，或是需要并行完成复杂的研究、分析工作时，单 Agent、单循环的架构已经无法满足需求。本模块将讲解长运行 Agent 的可靠执行框架设计、多 Agent 协作系统的架构实战，以及通过 MCP 代码执行提升 Agent 效率的核心方法，帮你构建能处理企业级复杂任务的 Agent 系统。</font>

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 9 章 长时间运行的 Agent：如何设计可靠的执行框架</font>
**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">原文链接</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>[<font style="color:rgb(0, 102, 255);background-color:rgba(0, 0, 0, 0);">https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents</font>](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本章核心价值</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：理解长运行 Agent 的核心痛点与失败模式，掌握 Anthropic 沉淀的双 Agent 执行框架设计，实现任务中断恢复、状态持久化、增量迭代，让 Agent 能稳定完成跨会话、长周期的复杂任务。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">9.1 长运行 Agent 的核心挑战</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">随着 AI Agent 能力的提升，开发者开始让它们承担需要数小时、甚至数天才能完成的复杂任务。但让 Agent 跨多个上下文窗口、持续稳定地完成长周期任务，依然是行业的核心难题。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">长运行 Agent 的核心痛点，在于它必须在离散的会话中工作，每个新会话开始时，都没有上一轮的记忆。这就像一个软件项目，工程师轮班工作，每个新到岗的工程师，都完全不记得上一班做了什么。即使有上下文压缩能力，也无法完全解决这个问题 —— 压缩后的摘要，经常会丢失关键的实现细节、未解决的问题，导致下一轮的 Agent 无法承接，甚至把已经完成的工作推翻重来。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在 Claude Agent SDK 的测试中，我们发现，即使是 Opus 4.5 这样的前沿模型，仅靠一个高等级的提示词（比如 "构建一个 claude.ai 的克隆版"），也无法稳定完成长周期的应用开发任务，核心会出现两大致命失败模式：</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">9.1.1 失败模式一：贪多嚼不烂，一次性尝试完成所有任务</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 会试图一次性完成整个应用的开发，而不是分步骤迭代。这通常会导致它在实现过程中耗尽上下文窗口，留下一个半完成、无文档、甚至无法运行的功能。下一轮会话的 Agent，需要先猜测上一轮的实现思路，花大量时间修复基础问题，才能继续推进，甚至会直接推翻重来，导致任务完全无法推进。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">9.1.2 失败模式二：过早宣告胜利，任务未完成就终止</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在部分功能完成后，后续的 Agent 实例查看代码库，看到已经有了一些进展，就直接宣告任务完成，忽略了大量未实现的功能、未修复的 bug。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这两个失败模式，本质上都源于同一个问题：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 没有跨会话的、清晰的任务目标、进度追踪、状态同步机制</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">9.2 解决方案：双 Agent 执行框架</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">为了解决长运行 Agent 的核心痛点，我们开发了一套双 Agent 执行框架，这也是 Claude Agent SDK 中长运行任务的核心支撑架构。它的核心逻辑，是用两个职责完全分离的 Agent，分别负责项目初始化与增量迭代，配合标准化的状态持久化机制，实现跨会话的任务连续性。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">9.2.1 初始化器 Agent（Initializer Agent）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第一个会话，我们会使用专门的初始化器 Agent，它的核心职责是搭建项目的初始环境，为后续的迭代 Agent 铺平道路。它的核心输出包括：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">项目初始化脚本（init.sh）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：包含项目环境搭建、依赖安装、开发服务启动、测试执行的标准化脚本，让后续的 Agent 无需摸索项目的运行方式，一键启动环境；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">全量功能清单（feature_list.json）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：基于用户的初始需求，拆解为结构化的、可验证的功能点列表，每个功能点包含分类、描述、测试步骤、完成状态（初始为 false）。比如 "用户可以点击新建聊天按钮，创建一个全新的对话"，并配套完整的验证步骤。这从根本上解决了 "过早宣告胜利" 的问题，Agent 必须完成所有功能点，并通过验证，才能标记任务完成；</font>
3. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">进度追踪文件（claude-progress.txt）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：用于记录每一轮迭代的完成内容、遇到的问题、下一步计划，实现跨会话的进度同步；</font>
4. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">初始化 Git 仓库</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：创建初始的 Git 提交，记录项目的初始状态，让后续的 Agent 可以通过 Git 历史，清晰地看到项目的变更过程，实现错误回滚。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">初始化器 Agent 从根本上解决了长周期任务的目标模糊问题：它把用户模糊的需求，拆解为可量化、可验证、可追踪的功能清单，给后续的迭代 Agent 提供了清晰的 "路线图" 与 "验收标准"。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">9.2.2 编码 Agent（Coding Agent）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">从第二个会话开始，所有的迭代都由编码 Agent 完成。它的核心职责，是基于初始化器搭建的环境，做</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">单功能、增量式的迭代</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，并在每一轮会话结束时，留下干净、可运行、有文档的代码环境。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">编码 Agent 的核心执行流程，是每一轮会话都必须严格遵循的标准化步骤：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">环境感知</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：运行 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">pwd</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 确认工作目录，读取 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">claude-progress.txt</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 与 Git 提交日志，快速了解项目的当前进度与状态；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">功能选择</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：读取 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">feature_list.json</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，选择优先级最高的、未完成的单个功能，作为本轮会话的唯一目标；</font>
3. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">环境验证</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：执行 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">init.sh</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 脚本，启动开发服务，运行基础的端到端测试，确认项目当前处于可运行状态，先修复已存在的 bug，再开始新功能的开发；</font>
4. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">功能实现</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：完成选中的单个功能的开发，配套对应的测试；</font>
5. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">结果验证</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：通过端到端测试，验证功能完全符合要求，比如通过 Puppeteer 等工具，模拟用户操作，验证功能的实际表现；</font>
6. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">状态更新</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：将功能标记为已完成，提交带有清晰描述的 Git 记录，更新 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">claude-progress.txt</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，记录本轮的完成内容、遇到的问题、下一步计划，确保下一轮的 Agent 能无缝承接。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这个流程的核心，是</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">单功能增量迭代</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：每一轮会话，Agent 只专注于完成一个功能，确保每一轮结束时，项目都处于干净、可运行的状态，不会留下半完成的功能、无法运行的代码。这从根本上解决了 "贪多嚼不烂" 的失败模式。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">9.3 核心失败模式与对应解决方案</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们将长运行 Agent 的四大核心失败模式，与对应的解决方案，总结为下表：</font>

| **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">核心问题</font>** | **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">初始化器 Agent 解决方案</font>** | **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">编码 Agent 解决方案</font>** |
| :--- | :--- | :--- |
| <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 过早宣告整个项目完成</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">基于用户需求，搭建结构化的全量功能清单文件，明确每个功能的验收标准</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">会话开始时必须读取功能清单，仅选择单个未完成功能推进，仅当功能通过完整测试后，才能标记为已完成</font> |
| <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 留下带 bug、无文档的半完成进度，导致后续会话无法承接</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">编写初始化 Git 仓库与进度记录文件</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">会话开始时读取进度文件与 Git 日志，运行基础测试验证环境可用性；会话结束时提交 Git 记录，更新进度文档，确保项目处于可运行状态</font> |
| <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 未经验证就标记功能完成</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">功能清单中明确每个功能的测试步骤</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">必须完成端到端测试验证，才能标记功能为 "已通过"</font> |
| <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 每次都需要摸索项目的运行方式</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">编写 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">init.sh</font>`<br/><font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 脚本，包含环境启动、测试执行的标准化命令</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">会话开始时必须读取 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">init.sh</font>`<br/><font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，通过脚本标准化启动环境</font> |


#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">9.4 工程化最佳实践</font>
##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">9.4.1 强制单功能迭代，禁止贪多</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">编码 Agent 的系统提示词中，必须用强约束明确要求：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">每一轮会话，只能选择并完成一个功能点</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。即使是非常小的功能，也比同时推进多个功能、留下半完成的代码要好。我们的实战经验显示，单功能迭代的成功率，是多功能并行的 5 倍以上。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">9.4.2 可视化验证，确保功能真实可用</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">对于 UI 开发、交互类任务，必须给 Agent 提供截图、浏览器自动化等可视化验证能力。比如 Claude 开发网页应用时，会通过 Puppeteer MCP 服务，对开发的页面截图，验证布局、样式、交互是否符合预期，甚至模拟用户的完整操作流程，做端到端测试。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的实战显示，可视化验证能让 Agent 开发的功能可用性，提升 80% 以上，避免出现 "代码看起来没问题，但实际运行完全不符合预期" 的情况。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">9.4.3 标准化的会话启动流程</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">将编码 Agent 的启动流程，固化到系统提示词中，确保每一轮会话，Agent 都会先完成环境感知、状态同步、可用性验证，再开始功能开发。这能避免 Agent 在项目已经有 bug 的情况下，继续开发新功能，导致问题越积越多，最终完全无法修复。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">9.4.4 可回滚的版本管理</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">强制要求 Agent 每完成一个功能，就做一次独立的 Git 提交，提交信息必须清晰描述变更内容。这样，一旦出现问题，Agent 可以快速回滚到上一个可用的版本，不会因为一次错误的修改，导致整个项目瘫痪。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">9.5 未来的优化方向</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这套双 Agent 框架，已经能稳定支撑长周期的应用开发任务，但依然有可以优化的方向：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">多 Agent 分工细化</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：目前的框架用一个编码 Agent 完成所有工作，未来可以进一步拆分为测试 Agent、代码评审 Agent、质量保障 Agent 等专门的子 Agent，在软件开发生命周期的不同环节，实现更优的效果；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">跨领域泛化</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：目前的框架是针对全栈 Web 应用开发优化的，未来可以将这些经验，泛化到科学研究、金融建模等其他需要长周期任务的领域。</font>

---

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 10 章 多 Agent 协作系统：Anthropic 的实战经验</font>
**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">原文链接</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>[<font style="color:rgb(0, 102, 255);background-color:rgba(0, 0, 0, 0);">https://www.anthropic.com/engineering/multi-agent-research-system</font>](https://www.anthropic.com/engineering/multi-agent-research-system)**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本章核心价值</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：理解多 Agent 系统的核心优势与架构设计，掌握 Anthropic Claude Research 功能的多 Agent 系统实战经验，从提示词设计、评测体系到工程化落地的全流程方法。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.1 为什么需要多 Agent 系统？</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Claude 的 Research 功能，能让 Claude 跨网页、Google Workspace 与各类集成工具，完成复杂的深度研究任务。支撑这个功能的，就是我们自研的多 Agent 协作系统。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">研究类工作，是典型的开放式问题：你无法提前预判完成任务需要的步骤，整个过程是动态的、路径依赖的。就像人类做研究时，会基于中途的发现，持续调整研究方向，跟进新出现的线索。这种不可预测性，让 Agent 成为研究任务的最佳载体，但单 Agent 系统，在处理这类任务时，存在三个无法突破的瓶颈：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">上下文窗口限制</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：复杂的研究任务，需要处理海量的信息，单 Agent 的上下文窗口，无法容纳所有的检索结果、分析内容，很容易出现关键信息丢失、上下文衰减的问题；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">并行能力缺失</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：单 Agent 只能串行执行检索、分析，一个复杂的研究任务，需要数十次甚至上百次检索，串行执行会导致任务耗时从分钟级拉长到小时级，完全无法落地；</font>
3. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">路径依赖问题</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：单 Agent 一旦在研究初期选错了方向，就会沿着错误的路径一直走下去，很难自我纠正，最终无法完成任务。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">而多 Agent 系统，完美解决了这些问题。我们的内部评测显示：以 Claude Opus 4 作为主 Agent，搭配 Claude Sonnet 4 子 Agent 的多 Agent 系统，在内部研究评测中，相比单 Agent 的 Claude Opus 4，</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">性能提升了 90.2%</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">多 Agent 系统的核心优势，本质上来自两个方面：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">并行化的算力扩展</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：子 Agent 可以并行执行，用独立的上下文窗口，同时探索任务的不同维度，最终仅将提炼后的核心结果返回给主 Agent。这相当于给任务增加了近乎无限的 token 处理能力，而不会给主 Agent 的上下文带来负担；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">关注点分离</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：每个子 Agent 都有专门的职责、独立的提示词、独立的工具与探索路径，避免了单 Agent 的路径依赖，能实现更全面、更深入的研究。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的数据分析显示，在 BrowseComp 评测中，token 用量本身就能解释 80% 的性能差异，而多 Agent 架构，正是通过分布式的上下文窗口，实现了 token 用量的规模化扩展，从而带来了性能的量级提升。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">当然，多 Agent 系统也有对应的成本：它的 token 消耗量，通常是普通聊天交互的 15 倍，是单 Agent 系统的 4 倍。因此，它仅适合任务价值足够高，能覆盖额外成本的场景。同时，对于子任务之间有强依赖、需要实时协调的场景（比如大部分编码任务），目前的多 Agent 系统还不是最优选择。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.2 多 Agent 系统的核心架构设计</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的 Research 系统，采用了</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">编排器 - 工作节点（Orchestrator-Workers）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 的经典架构，也就是</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">主 Agent - 子 Agent</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 架构，这也是目前最成熟、最稳定的多 Agent 架构。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.2.1 完整的执行流程</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">整个系统的完整工作流如下：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">任务接收与规划</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：用户提交研究查询后，系统创建主研究 Agent（LeadResearcher），进入迭代研究流程。主 Agent 首先深度思考研究策略，将计划存入持久化内存，避免上下文溢出导致计划丢失；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">子 Agent 分发</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：主 Agent 将研究任务拆解为多个独立的子任务，创建专门的子 Agent（Subagent），给每个子 Agent 分配明确的研究目标、输出格式、工具使用规范、任务边界，并行启动所有子 Agent；</font>
3. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">子 Agent 独立执行</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：每个子 Agent 独立完成自己的研究任务，通过检索工具迭代获取信息，用 interleaved thinking 评估工具返回的结果，最终将提炼后的研究发现，返回给主 Agent；</font>
4. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">结果合成与迭代判断</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：主 Agent 合成所有子 Agent 的返回结果，判断是否已经收集到足够的信息，是否需要进一步的研究。如果需要，它会创建新的子 Agent，或优化研究策略，开启新一轮的研究；如果信息足够，就退出研究循环；</font>
5. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">引用标注与最终输出</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：所有研究内容，会交给专门的引用标注 Agent（CitationAgent），处理文档与研究报告，给所有的论点标注对应的引用来源，确保所有内容都有可靠的出处；</font>
6. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">最终结果返回</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：将完整的、带引用的研究报告，返回给用户。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.2.2 核心架构优势</font>
1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">无限的上下文扩展能力</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：每个子 Agent 都有独立的上下文窗口，能处理海量的检索信息，最终仅将高价值的结论返回给主 Agent，彻底突破了单上下文窗口的限制；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">极致的并行效率</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：主 Agent 可以同时启动数十个子 Agent，并行探索不同的研究方向，将原本需要数小时的串行任务，压缩到几分钟内完成；</font>
3. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">清晰的职责分离</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：主 Agent 专注于整体规划、结果合成、方向把控，子 Agent 专注于深度的信息检索、细节分析，避免了单 Agent 既要做规划又要做执行的注意力分散问题；</font>
4. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">可追溯的研究过程</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：每个子 Agent 的研究过程都是独立、可追溯的，能清晰地看到每个结论的来源与分析过程，便于调试、审计与优化。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.3 多 Agent 系统的提示词设计核心原则</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">多 Agent 系统的协调复杂度，远高于单 Agent 系统。早期的版本中，我们遇到了大量问题：主 Agent 为简单查询启动了 50 个子 Agent，子 Agent 无休止地搜索不存在的信息，多个子 Agent 重复做完全相同的工作，等等。提示词设计，是解决这些问题的核心抓手，我们沉淀了八大核心原则：</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.3.1 站在 Agent 的视角，迭代提示词</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">要优化提示词，首先要理解它带来的实际影响。我们的核心方法，是用控制台搭建模拟环境，用系统完全一致的提示词与工具，一步步观察 Agent 的执行过程。这能让我们立刻发现失败模式：Agent 是否在已经有足够结果的情况下继续搜索，是否使用了过于冗长的查询，是否选错了工具。有效的提示词优化，必须建立在对 Agent 行为的准确理解之上。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.3.2 教会主 Agent 如何正确委派任务</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">主 Agent 的核心能力，是将查询拆解为子任务，并给子 Agent 清晰的指令。每个子 Agent 的任务描述，必须包含：明确的目标、输出格式、可用的工具与数据源、清晰的任务边界。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">如果任务描述过于模糊，子 Agent 就会出现重复工作、职责重叠、遗漏关键信息的问题。比如早期我们让主 Agent 给子 Agent 的指令是 "研究半导体短缺"，结果三个子 Agent 一个研究 2021 年的汽车芯片危机，另外两个都在重复研究 2025 年的供应链，完全没有有效的分工。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的优化方法，是在提示词中明确要求主 Agent：拆解的子任务必须完全独立、无重叠，每个子任务必须有明确的研究范围与输出要求，必须给子 Agent 明确的 "禁止事项"。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.3.3 让资源投入与查询复杂度匹配</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 很难判断不同任务应该投入多少资源，我们必须在提示词中，给它明确的缩放规则：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">简单的事实查询：仅需 1 个 Agent，3-10 次工具调用；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">直接对比类查询：需要 2-4 个子 Agent，每个 10-15 次调用；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">复杂的深度研究：需要 10 个以上的子 Agent，有清晰的职责划分。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这些明确的规则，能避免主 Agent 为简单查询过度投入资源，也能避免为复杂查询投入不足，这是我们早期最常见的失败模式之一。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.3.4 工具设计与选择，是系统的基石</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 与工具的交互接口，和人机交互接口一样重要。用错了工具，任务从一开始就注定失败。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们在提示词中，给 Agent 明确的工具选择启发式规则：比如先检查所有可用工具，将工具使用与用户意图匹配，泛化的外部探索用网页搜索，特定系统的信息用专门的工具，优先使用专用工具而非通用工具。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">同时，每个工具都必须有清晰、无歧义的描述，模糊的工具描述，会让 Agent 完全走错方向。我们甚至专门做了一个工具测试 Agent：给它一个有缺陷的 MCP 工具，让它尝试使用，然后重写工具描述，避免失败。这个过程，让工具的调用准确率提升了 40%，任务完成时间大幅缩短。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.3.5 让 Agent 自己优化自己</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Claude 4 系列模型，本身就是优秀的提示词工程师。给它一个提示词与对应的失败模式，它能精准诊断出问题所在，并给出优化建议。我们大量使用这种方法，优化主 Agent 与子 Agent 的提示词，效果远超人工手动优化。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.3.6 先宽后窄的搜索策略</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 通常会默认使用过长、过于具体的查询，导致返回结果极少，无法覆盖全面的信息。我们在提示词中，明确要求 Agent 遵循人类专家的研究策略：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">先从简短、宽泛的查询起步，评估可用的信息，再逐步缩小聚焦范围</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.3.7 引导思考过程，提升推理质量</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">扩展思考模式，能给 Claude 一个可见的思考草稿本，大幅提升指令遵循、推理与效率。我们要求主 Agent 用扩展思考，完成研究计划的制定，评估工具与任务的匹配度，确定查询复杂度与子 Agent 数量，定义每个子 Agent 的职责；子 Agent 也会在每次工具调用后，用 interleaved thinking 评估结果质量，识别信息缺口，优化下一次查询。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.3.8 并行工具调用，彻底改变速度与性能</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">复杂的研究任务，天然需要探索大量的信息源。早期的 Agent 只能串行执行搜索，速度极慢。我们做了两层并行化优化，让复杂查询的耗时减少了 90%：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">主 Agent 并行启动 3-5 个子 Agent，而非串行创建；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">每个子 Agent 并行调用 3 个以上的工具，同时执行多个检索。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.4 多 Agent 系统的评测体系设计</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">多 Agent 系统的评测，和单 Agent 有本质的区别：传统评测假设 AI 每次都遵循相同的步骤，但多 Agent 系统，即使输入完全相同，也可能采取完全不同的、但都有效的路径，完成任务。我们无法提前预设 "正确的步骤"，只能通过灵活的评测方法，判断 Agent 是否达成了正确的结果，同时遵循了合理的执行过程。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们沉淀了一套多 Agent 系统的评测方法论，核心分为三个部分：</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.4.1 从小样本起步，快速迭代</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">很多团队会延迟搭建评测体系，认为只有数百个测试用例的大评测才有价值。但在 Agent 开发的早期，每次提示词优化，都会带来 30%-80% 的成功率提升，这么大的效果差异，仅需 20 个左右的代表性测试用例，就能清晰地看到。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的建议是：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">立刻从 20-50 个真实场景的小样本起步，搭建评测体系，不要等待</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。早期的小样本评测，能帮你快速验证优化方向，避免在错误的路径上浪费时间。随着系统的成熟，再逐步扩大评测集的规模。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.4.2 LLM 裁判评测，做好校准与设计</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">研究任务的输出是自由文本，很少有唯一的正确答案，很难用程序化的方式校验。LLM 裁判，是这类任务最适合的评测方式。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的实现方法：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">设计清晰的评分 rubric，从多个维度给输出打分：事实准确性（论点是否与来源匹配）、引用准确性（引用是否与论点匹配）、完整性（是否覆盖了用户要求的所有方面）、来源质量（是否优先使用权威的一手来源）、工具效率（是否合理使用工具，调用次数是否合理）；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">用单次 LLM 调用，输出 0.0-1.0 的分数，以及通过 / 不通过的最终判定，这种方式的结果，与人类判断的一致性最高；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">用有明确正确答案的测试用例，做 LLM 裁判的校准，确保它的判断与人类专家一致；</font>
4. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">给 LLM 裁判明确的 "出口"，比如当信息不足时，返回 "未知"，避免幻觉。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的实战经验显示，将不同的评分维度，拆分为独立的 LLM 裁判调用，能进一步提升评分的准确性与稳定性。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.4.3 人工评测，捕捉自动化遗漏的问题</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">自动化评测无法覆盖所有问题，人工测试能发现很多边缘案例：比如异常查询下的幻觉、系统故障、来源选择的偏差。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如我们的人工测试发现，早期的 Agent 会优先选择 SEO 优化的内容农场，而非权威的学术 PDF、个人博客。我们基于这个发现，在提示词中补充了来源质量的启发式规则，解决了这个问题。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">即使在自动化评测非常完善的情况下，人工抽检、用户反馈收集，依然是必不可少的环节。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.5 生产环境的工程化挑战与解决方案</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">多 Agent 系统在生产环境中，会遇到传统软件完全没有的工程化挑战，我们沉淀了对应的核心解决方案：</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.5.1 状态管理与错误恢复</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 是有状态的，且错误会不断累积。它会长时间运行，跨多次工具调用维护状态，这意味着我们必须实现持久化的代码执行，以及过程中的错误处理。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">如果没有有效的恢复机制，一次小的系统故障，就会导致整个任务失败，而从头重启的成本极高，用户体验极差。我们的解决方案：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">实现检查点机制，每完成一个关键步骤，就将 Agent 的状态持久化存储，出现错误时，可以从最近的检查点恢复，而非从头开始；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">结合重试逻辑，与模型的智能容错能力：当工具调用失败时，告知 Agent 错误信息，让它自主调整策略，而非直接终止任务。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.5.2 可观测性与调试能力</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 的决策是动态的，每次运行的行为都可能不同，这让调试变得非常困难。用户反馈 "Agent 找不到明显的信息"，但我们无法知道背后的原因：是用了错误的搜索查询？选了错误的来源？还是工具调用失败了？</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的解决方案，是搭建了全链路的生产 tracing 系统，记录 Agent 的每一步决策、每一次工具调用、每一个中间结果，让我们能系统性地诊断失败原因，修复问题。同时，我们在不监控单会话内容、保护用户隐私的前提下，监控 Agent 的决策模式与交互结构，从宏观层面发现异常行为，定位根因。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.5.3 部署与版本管理</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 系统是有状态的、持续运行的提示词、工具、执行逻辑的集合。这意味着，当我们发布新版本时，可能有大量的 Agent 正处于任务执行的过程中。直接全量更新，会导致正在运行的 Agent 出现行为异常、任务失败。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的解决方案，是采用</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">彩虹部署（Rainbow Deployment）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：同时运行新旧两个版本，逐步将流量从旧版本切换到新版本，不会中断正在运行的 Agent 任务。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.5.4 同步执行的瓶颈</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">目前我们的主 Agent，是同步执行子 Agent 的，需要等待所有子 Agent 完成，才能进行下一步处理。这简化了协调逻辑，但也带来了信息流转的瓶颈：主 Agent 无法实时引导子 Agent，子 Agent 之间无法协同，整个系统会被最慢的一个子 Agent 阻塞。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">未来，我们会探索异步执行的架构，让 Agent 可以并发工作，在需要时创建新的子 Agent，进一步提升系统的并行能力与灵活性。当然，这也会带来结果协调、状态一致性、错误传播的新挑战。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">10.6 核心经验总结</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">从原型到生产，多 Agent 系统的落地，最大的挑战在于 "最后一公里"。能在开发者机器上运行的原型，需要大量的工程化工作，才能变成可靠的生产系统。Agent 系统中，微小的错误会不断累积，传统软件中的小问题，可能会让 Agent 完全偏离轨道，导致不可预测的结果。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">但只要做好提示词设计、工具设计、完善的评测体系、健壮的工程化落地，多 Agent 系统就能在开放式的研究任务中，带来单 Agent 无法实现的效果提升，帮用户完成原本需要数天才能完成的深度研究工作。</font>

---

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 11 章 MCP 代码执行：构建更高效的 Agent</font>
**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">原文链接</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>[<font style="color:rgb(0, 102, 255);background-color:rgba(0, 0, 0, 0);">https://www.anthropic.com/engineering/code-execution-with-mcp</font>](https://www.anthropic.com/engineering/code-execution-with-mcp)**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本章核心价值</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：理解传统 MCP 工具调用的核心痛点，掌握代码执行与 MCP 结合的架构设计，实现 Agent 的 token 效率、执行效率、隐私安全的全方位提升。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">11.1 MCP 的发展与核心痛点</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模型上下文协议（Model Context Protocol, MCP），是我们在 2024 年 11 月发布的、用于连接 AI Agent 与外部系统的开放标准。在发布后的一年里，MCP 已经被行业广泛采纳，成为 Agent 连接工具与数据的事实标准：社区已经构建了数千个 MCP 服务器，所有主流编程语言都有对应的 SDK。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">但随着开发者接入的 MCP 服务器越来越多，传统的 MCP 工具调用模式，遇到了两个致命的扩展性问题：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具定义过载上下文窗口</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：大多数 MCP 客户端，会提前将所有工具定义全量加载到上下文窗口中。当接入数十个 MCP 服务器、数千个工具时，工具定义会在任务开始前，就消耗数十万 token。我们见过最极端的案例，工具定义在优化前，就消耗了 13.4 万 token，完全挤压了任务本身的上下文空间；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">中间结果污染上下文</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：传统的 MCP 工具调用，每个工具的返回结果，都会全量进入模型的上下文。比如 "从 Google Drive 下载会议纪要，附加到 Salesforce 的客户线索中" 这个简单任务，会议纪要的全文会在工具返回时进入上下文，在 Agent 写入 Salesforce 时，又会再次进入上下文，一份内容重复消耗两倍的 token。如果是 2 小时的会议纪要，可能会额外消耗 5 万 token，甚至超出上下文窗口的限制，导致任务失败。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这两个问题，已经成为 MCP 规模化落地的核心瓶颈。而我们找到的最优解决方案，就是</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">将代码执行与 MCP 深度结合</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，让 Agent 通过编写代码，来编排 MCP 工具调用，而非通过单次 API 往返逐个调用工具。Cloudflare 也发布了类似的方案，称之为 "Code Mode"，核心逻辑完全一致。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">11.2 代码执行 + MCP 的核心实现架构</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">代码执行与 MCP 结合的核心逻辑，是</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">将 MCP 服务器的工具，封装为代码 API，而非直接的提示词工具定义</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，让 Agent 通过编写代码，来调用、编排 MCP 工具。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">11.2.1 基础实现方式</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的实现，是将所有连接的 MCP 服务器的工具，生成为对应的代码文件树，结构如下：</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">plaintext</font>

```plain
servers
├── google-drive
│   ├── getDocument.ts
│   ├── ... (其他工具)
│   └── index.ts
├── salesforce
│   ├── updateRecord.ts
│   ├── ... (其他工具)
│   └── index.ts
└── ... (其他 MCP 服务器)
```

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">每个工具，对应一个独立的代码文件，比如 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">getDocument.ts</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 的内容如下：</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">typescript</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">运行</font>

```plain
// ./servers/google-drive/getDocument.ts
import { callMCPTool } from "../../../client.js";

interface GetDocumentInput {
  documentId: string;
}

interface GetDocumentResponse {
  content: string;
}

/* 从 Google Drive 读取文档 */
export async function getDocument(input: GetDocumentInput): Promise<GetDocumentResponse> {
  return callMCPTool<GetDocumentResponse>('google_drive__get_document', input);
}
```

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这样一来，Agent 就可以通过导入对应的模块，编写代码来编排 MCP 工具调用。比如前面提到的 "会议纪要同步到 Salesforce" 任务，Agent 会生成如下代码：</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">typescript</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">运行</font>

```plain
// 从 Google Docs 读取会议纪要，添加到 Salesforce 客户线索中
import * as gdrive from './servers/google-drive';
import * as salesforce from './servers/salesforce';

const transcript = (await gdrive.getDocument({ documentId: 'abc123' })).content;
await salesforce.updateRecord({
  objectType: 'SalesMeeting',
  recordId: '00Q5f000001abcXYZ',
  data: { Notes: transcript }
});
```

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">11.2.2 完整的执行流程</font>
1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 启动时，仅会加载 MCP 服务器的目录结构，不会加载任何工具的完整定义，上下文消耗几乎可以忽略不计；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">当 Agent 需要使用某个 MCP 服务器的工具时，会通过文件系统，读取对应工具的代码文件，获取工具的接口定义，仅加载当前任务需要的工具；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 编写编排代码，通过代码执行环境运行；</font>
4. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">代码执行过程中，调用 MCP 工具时，请求会发送给 MCP 客户端，工具返回的结果，直接回到代码执行沙箱中处理，不会进入 Claude 的上下文；</font>
5. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">代码执行完成后，仅最终的执行结果，会进入 Claude 的上下文。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这种模式，带来了极致的 token 效率提升：原本需要 15 万 token 加载的工具定义，现在仅需 2000 token，</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">节省了 98.7% 的 token 消耗</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">11.3 核心优势与能力</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">代码执行与 MCP 结合，不仅带来了 token 效率的提升，更解锁了一系列传统工具调用模式无法实现的能力。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">11.3.1 渐进式披露，按需加载工具</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模型非常擅长导航文件系统，将 MCP 工具封装为代码文件树，让模型可以按需读取工具定义，而非提前全量加载。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">你也可以补充一个 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">search_tools</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 工具，让 Agent 可以搜索相关的 MCP 工具，再加载对应的定义。比如 Agent 需要和 Salesforce 交互时，先搜索 "salesforce"，再加载相关的工具，完全不会加载其他无关的 MCP 服务器的工具定义。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这从根本上解决了 "工具定义过载上下文" 的问题，让 Agent 可以同时接入数百、数千个 MCP 工具，而不会对上下文窗口造成任何负担。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">11.3.2 上下文高效的工具结果处理</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">传统工具调用模式中，工具返回的所有内容，都会进入模型的上下文，哪怕 99% 的内容都是无关的。而代码执行模式，让 Agent 可以在沙箱中，对工具返回的结果做过滤、转换、聚合，仅将最终需要的高信号内容，返回给模型。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如处理 1 万行的销售表格，传统模式会将 1 万行数据全部进入上下文，而代码执行模式，Agent 可以编写代码，仅筛选出待处理的订单，返回前 5 行做校验，模型仅能看到 5 行数据，而非 1 万行。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">类似的，跨多个数据源的关联、聚合、统计，都可以在代码沙箱中完成，模型仅需看到最终的统计结果，无需处理海量的原始数据。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">11.3.3 更强大、更高效的控制流</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">循环、条件判断、错误处理，这些基础的控制流，用代码实现，远比通过多轮 LLM 调用、自然语言编排要高效、可靠得多。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如等待部署完成的通知，用代码可以轻松实现循环检查 + 延迟等待，而传统模式需要多次 LLM 推理、工具调用，既慢又容易出错。同时，代码执行环境会处理条件判断，无需等待模型推理，大幅降低了 "首包时间" 延迟。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">11.3.4 隐私保护的数据流</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">代码执行与 MCP 结合，实现了敏感数据的 "端到端流转"：中间结果默认留在代码执行沙箱中，只有你明确打印、返回的内容，才会进入模型的上下文。这意味着，你不希望分享给模型的敏感数据，可以在工作流中流转，全程不进入模型的上下文。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">更进一步，你可以在 MCP 客户端中，实现自动的敏感数据 token 化：比如客户的 PII 数据，从 Google Sheets 中取出时，自动替换为 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">[EMAIL_1]</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">、</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">[PHONE_1]</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 这类 token，模型只能看到 token 化后的数据，而当数据写入 Salesforce 时，再自动还原为真实数据。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这样一来，客户的敏感数据，从源系统到目标系统，全程不会进入 Claude 的上下文，彻底避免了敏感数据泄露的风险，同时还能实现完整的业务流程。你还可以基于此，定义确定性的安全规则，控制数据的流转范围。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">11.3.5 状态持久化与技能复用</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">代码执行环境自带文件系统访问能力，Agent 可以将中间结果写入文件，实现跨会话的状态持久化，中断后可以随时恢复工作。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">更重要的是，Agent 可以将自己沉淀的、经过验证的代码，保存为可复用的函数，封装为 Agent Skills。比如 Agent 开发了一个 "将 Google Sheet 保存为 CSV" 的功能，就可以将代码保存为 Skill 中的脚本，后续所有任务都可以直接复用，无需重复开发。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这让 Agent 可以不断沉淀自己的能力，构建专属的高阶工具库，持续优化执行效率与准确率。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">11.4 落地的权衡与注意事项</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">代码执行模式，也带来了额外的复杂度：运行 Agent 生成的代码，需要一个安全的沙箱执行环境，配套资源限制、监控告警能力，这会带来额外的运维开销与安全考量，而传统的直接工具调用，不需要这些。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">因此，你需要权衡：代码执行带来的 token 成本降低、延迟优化、能力提升，是否能覆盖对应的实现成本。对于简单的单工具调用场景，传统模式依然是更简单的选择；但对于复杂的多工具编排、大数据量处理、规模化的 MCP 接入场景，代码执行模式，是唯一能实现规模化落地的方案。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">同时，你必须做好代码执行环境的安全隔离：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">用操作系统级的沙箱机制，限制代码执行环境的文件系统、网络访问权限；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">设置严格的资源限制，避免恶意代码消耗过多的系统资源；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">实现完整的执行日志审计，所有代码执行与工具调用，都必须留下可追溯的日志；</font>
4. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">对于生产环境，必须设置代码执行的权限审批机制，尤其是涉及破坏性操作、外部网络访问的场景。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">11.5 总结</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">MCP 给 Agent 提供了连接外部世界的标准化协议，但随着接入的工具越来越多，传统的工具调用模式，已经无法解决 token 消耗与上下文污染的问题。而软件工程中沉淀了数十年的代码执行模式，完美解决了这些问题，让 Agent 可以用熟悉的编程范式，更高效地与 MCP 服务器交互。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们也鼓励所有采用这种模式的开发者，将自己的发现与经验，分享给 MCP 社区，共同推动 MCP 生态的发展。</font>

---

## <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模块五：安全、评测与工程化（生产篇）</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">将 Agent 从原型推向生产环境，核心要解决三个问题：如何衡量 Agent 的效果与稳定性？如何保障 Agent 的执行安全？如何实现 Agent 的工程化、规模化落地？本模块将讲解 Agent 评测体系的完整设计方法、生产环境的安全防护方案、Coding Agent 的最佳实践，以及从真实故障中沉淀的避坑指南，帮你构建可落地、可运维、安全可靠的生产级 Agent 系统。</font>

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 12 章 Agent 评测体系全解</font>
**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">原文链接</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>[<font style="color:rgb(0, 102, 255);background-color:rgba(0, 0, 0, 0);">https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents</font>](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本章核心价值</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：理解 Agent 评测的核心难点与完整方法论，掌握从评测集构建、评分器设计、到生产环境落地的全流程方法，用评测驱动 Agent 的持续迭代。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">12.1 为什么 Agent 评测至关重要？</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">好的评测体系，能让团队更有信心地发布 Agent 迭代。没有评测，你会陷入被动的循环：只能在生产环境中发现问题，修复一个故障，又带来新的问题，完全无法预判变更带来的影响。评测能在变更影响用户之前，就将问题与行为变化暴露出来，它的价值会随着 Agent 的生命周期持续累积。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">正如我们在《Building effective agents》中所说，Agent 的核心特征，是多轮执行、工具调用、环境状态修改、基于中间结果自适应调整。而这些让 Agent 变得有用的能力，恰恰也让它变得难以评测：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">传统的单轮评测，完全无法覆盖 Agent 的多轮执行、状态变更的场景；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 是非确定性的，相同的输入，每次运行可能会采取完全不同的路径，只要能达成正确的结果，都是有效的方案，无法用固定的步骤来校验；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 的错误会累积，一步错步步错，传统的单步校验，无法捕捉这种长链条的失败模式。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">通过与行业内数十个前沿 Agent 开发团队的合作，以及我们内部的 Claude Code、Research 等 Agent 产品的落地经验，我们沉淀了一套完整的、可落地的 Agent 评测方法论，覆盖从原型到生产的全流程。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">12.2 Agent 评测的核心定义</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在开始搭建评测体系之前，我们需要先明确 Agent 评测中的核心术语，确保对概念的理解一致：</font>

+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">评测（Eval）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：一个针对 AI 系统的测试，给 AI 输入指定的任务，通过评分逻辑对输出打分，衡量任务的完成效果。本文聚焦于无需真实用户参与的、可自动化运行的评测。</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">任务（Test Case/Problem）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：单个测试用例，包含定义明确的输入与成功标准，是评测的最小单元。</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">试验（Trial）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：对单个任务的一次执行尝试。因为模型的输出是非确定性的，我们需要对单个任务运行多次试验，才能得到稳定的结果。</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">评分器（Grader）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：对 Agent 的执行结果打分的逻辑，一个任务可以有多个评分器，每个评分器包含多个校验项。</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">执行日志（Transcript/Trace/Trajectory）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：一次试验的完整记录，包括模型的所有输出、工具调用、推理过程、中间结果、所有交互信息，是调试、优化的核心依据。</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">最终状态（Outcome）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：试验结束后，环境的最终状态。比如机票预订 Agent，最终回复 "预订完成" 不算数，核心是环境的数据库中，是否真的生成了有效的预订记录。</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">评测执行框架（Evaluation Harness）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：端到端运行评测的基础设施，负责提供指令与工具、并发运行任务、记录全量执行日志、运行评分器、聚合结果。</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 执行框架（Agent Harness/Scaffold）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：让模型能作为 Agent 运行的系统，负责处理输入、编排工具调用、返回结果。我们评测 "一个 Agent"，本质上是评测 Agent 执行框架与模型的组合效果。</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">评测套件（Evaluation Suite）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：一组任务的集合，用于衡量 Agent 的特定能力或行为，比如客服场景评测套件、编码场景评测套件。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">12.3 三大核心评分器类型与选型</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 评测的核心，是设计合适的评分器，来衡量任务的完成效果。我们将行业内主流的评分器，分为三大类，各有优劣与适用场景，通常需要组合使用。</font>

| **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">评分器类型</font>** | **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">核心实现方法</font>** | **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">优势</font>** | **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">劣势</font>** |
| :--- | :--- | :--- | :--- |
| **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">代码化评分器</font>** | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">字符串匹配、正则校验、静态分析、环境状态校验、工具调用校验、执行日志分析</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">速度快、成本低、客观、可复现、易调试、能精准校验特定条件</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">对符合预期的有效变体兼容性差，缺乏灵活性，不适合主观的、开放式的任务</font> |
| **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模型裁判评分器</font>** | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">基于 rubric 的打分、自然语言校验、成对对比、参考基准校验、多裁判共识</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">灵活性强、可规模化、能捕捉细节 nuances、适合开放式任务、能处理自由格式输出</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">非确定性、比代码化评分器成本高、需要与人类评分校准，才能保证准确率</font> |
| **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">人工评分器</font>** | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">领域专家评审、众包判断、抽检、A/B 测试、标注者一致性校验</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">金标准的质量，与真实用户的判断最匹配，可用于校准模型裁判</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">成本高、速度慢、规模化需要大量的领域专家资源</font> |


**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">核心选型原则</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">优先选择代码化评分器，只要能通过程序化方式校验的结果，就不要用模型裁判；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">对于开放式的、主观的、无法程序化校验的任务，使用模型裁判，必须做好与人类评分的校准；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">人工评分仅用于校准模型裁判、抽检核心场景、处理高度专业的领域任务，不要作为主要的规模化评测方式。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">同时，对于任务的最终判定，你可以选择不同的评分模式：</font>

+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">二进制模式</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：所有评分器都必须通过，任务才算成功；</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">加权模式</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：不同评分器的分数加权求和，达到阈值即为成功；</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">混合模式</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：核心校验项必须全部通过，非核心项采用加权打分。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">12.4 两大核心评测指标：pass@k 与 pass^k</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 行为的非确定性，让单次执行的成功率没有太大意义，我们需要用专门的指标，来衡量 Agent 的真实表现。行业内最主流的两个指标，是 pass@k 与 pass^k，二者在 k=1 时是相同的，但随着 k 增大，会呈现完全相反的趋势，分别适用于不同的产品场景。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">12.4.1 pass@k</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">pass@k 衡量的是：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在 k 次独立试验中，至少有一次成功的概率</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。k 越大，pass@k 的分数越高，因为 "射门次数越多，进球的概率越大"。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如 pass@1=50%，意味着模型在第一次尝试中，就能完成一半的任务。这个指标，适用于 "只要有一次成功就可以" 的场景，比如编码任务，只要 Agent 能写出正确的代码，尝试多少次不重要。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">12.4.2 pass^k</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">pass^k 衡量的是：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">k 次独立试验，全部成功的概率</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。k 越大，pass^k 的分数越低，因为要求所有尝试都成功，是更严格的标准。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如 Agent 单次试验的成功率是 75%，那么 pass^3 = (0.75)³ ≈ 42%。这个指标，核心衡量的是 Agent 的一致性与可靠性，适用于客服、金融等用户期望每次都能得到可靠结果的场景。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">核心选型建议</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具类、编码类任务，优先用 pass@k，衡量 Agent 找到解决方案的能力；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">客户 - facing、高可靠性要求的场景，优先用 pass^k，衡量 Agent 的一致性与稳定性。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">12.5 从零到一：搭建 Agent 评测体系的完整路线图</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">很多团队会延迟搭建评测体系，认为需要数百个测试用例、复杂的基础设施才能起步。但我们的实战经验显示，评测体系应该从 Agent 开发的第一天就开始搭建，从小样本起步，逐步迭代完善。我们沉淀了八步路线图，帮你从零搭建完整的评测体系。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第一步：立刻起步，从小样本开始</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">你不需要数百个测试用例，20-50 个基于真实场景的任务，就足以支撑早期的迭代。在 Agent 开发的早期，每次提示词、工具、架构的优化，都会带来 30%-80% 的成功率提升，这么大的效果差异，小样本就能清晰地验证。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">不要等待完美的评测体系，先从最小可用的版本起步，再逐步完善。等待的时间越长，你就会越难反向从已有的系统中，提炼出清晰的成功标准。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第二步：从你已经在手动测试的内容起步</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">评测任务的来源，应该是你开发过程中，已经在手动校验的场景：每次发布前都会验证的行为、终端用户的高频使用场景。如果你的 Agent 已经上线，就从 bug 跟踪系统、客服队列中，提取用户反馈的问题，转化为测试用例。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">将用户报告的故障，转化为评测任务，能确保你的评测套件，始终覆盖真实的用户使用场景，优先解决对用户影响最大的问题。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第三步：编写无歧义的任务，配套参考解决方案</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">好的任务，是两个领域专家独立执行，能得到一致的通过 / 不通过判定的任务。如果专家都无法通过任务描述，明确知道什么是 "成功"，那任务的定义就是有问题的。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">核心编写规则</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">任务必须是 Agent 能通过正确的指令遵循完成的。如果一个任务，100 次尝试都无法成功，大概率是任务本身有问题，而非 Agent 的能力问题；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">所有评分器校验的内容，必须在任务描述中明确说明，不能让 Agent 因为模糊的需求而 "意外失败"；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">每个任务，都必须配套一个参考解决方案：已知的、能通过所有评分器的正确输出，这能证明任务是可解的，同时验证评分器的配置是正确的。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第四步：构建平衡的测试集</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">你的评测套件，必须同时覆盖 "应该发生的行为" 与 "不应该发生的行为"。单边的评测，会导致单边的优化。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">比如，如果你只测试 "Agent 应该在什么时候搜索"，最终会得到一个几乎所有问题都去搜索的 Agent。你必须同时测试 "Agent 不应该搜索的场景"，才能找到正确的平衡。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们在 Claude 的网页搜索功能优化中，就踩过这个坑。最终我们构建了双向的评测集：一部分是必须搜索的查询，一部分是必须用内置知识回答、不能搜索的查询，才找到了搜索触发的最优平衡点。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第五步：搭建健壮的评测执行框架，保证环境稳定</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">评测的核心前提，是 Agent 在评测环境中的表现，与生产环境完全一致。同时，每次试验都必须从干净的环境起步，避免共享状态导致的结果污染。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">核心要求</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">每次试验的环境都是完全隔离的，不会复用之前试验的文件、缓存、数据，避免试验之间的相互影响；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">环境必须与生产环境完全一致，包括模型版本、工具定义、Agent 执行框架、依赖版本；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">必须有完整的重试逻辑、超时控制，避免基础设施的波动，影响评测结果的准确性。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第六步：精心设计评分器，避免过度刚性</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">评分器设计的核心原则是：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">对结果打分，而非对路径打分</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">很多团队会犯一个错误：要求 Agent 必须遵循特定的步骤、调用特定的工具、按固定的顺序执行，否则就算失败。但 Agent 经常会找到评测设计者没有预想到的、但完全有效的解决方案，过度刚性的评分器，会错误地拒绝这些有效方案，导致评测结果完全失真。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">核心设计规则</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">优先校验最终的环境状态与任务结果，而非中间的执行步骤；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">对于多维度的任务，设计部分得分机制，而非简单的通过 / 不通过。比如客服 Agent，正确识别了问题、核验了用户身份，但最终退款失败，也应该得到对应的分数，而非零分；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模型裁判的 rubric 必须清晰、无歧义，每个评分维度都有明确的定义，避免主观偏差；</font>
4. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">必须给模型裁判明确的 "出口"，比如信息不足时返回 "未知"，避免幻觉导致的错误评分；</font>
5. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">必须用参考解决方案，验证评分器的正确性，确保正确的结果能通过评分器。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第七步：必须阅读执行日志，验证评测的有效性</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">你永远无法知道，你的评分器是否真的在正确工作，除非你大量阅读试验的执行日志与评分结果。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">当一个任务失败时，执行日志会告诉你：是 Agent 真的犯了错误，还是评分器错误地拒绝了有效的解决方案。它还会帮你发现 Agent 的行为模式、失败的根因、提示词与工具的优化方向。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的核心经验是：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在你完整阅读至少 100 条执行日志之前，不要完全相信评测的分数</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。只有通过日志，你才能确认，评测是在衡量真正重要的东西，而非无关的细节。失败必须是 "公平" 的：你能清晰地看到 Agent 哪里错了，为什么错了。如果不是，那就是你的评测体系有问题。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第八步：持续维护评测套件，避免饱和</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">评测套件不是一劳永逸的，它是一个活的产物，需要持续的维护与清晰的所有权。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">核心维护规则</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">监控评测饱和：当一个评测套件的通过率接近 100% 时，它就只能用来做回归测试，无法再衡量能力的提升了。你需要持续补充更难的任务，给 Agent 留下优化的空间；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">持续补充新的测试用例：每次生产环境出现新的故障、新的边缘案例，都要转化为测试用例，加入评测套件；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">实践评测驱动开发：在开发新能力之前，先构建对应的评测任务，定义成功标准，再迭代 Agent，直到达到目标；</font>
4. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">开放贡献：让产品、客服、销售等最接近用户的团队，都能贡献评测任务，确保评测套件始终覆盖真实的用户需求。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">12.6 评测与生产环境的其他监控方法的结合</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">自动化评测，只是理解 Agent 表现的方法之一。完整的质量保障体系，需要多种方法结合，形成多层防护，避免单一方法的盲区。</font>

| **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">方法</font>** | **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">优势</font>** | **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">劣势</font>** | **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">适用阶段</font>** |
| :--- | :--- | :--- | :--- |
| <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">自动化评测</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">迭代速度快、完全可复现、不影响用户、可在每次提交时运行、能规模化测试边缘场景</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">需要前期投入搭建、需要持续维护、可能与真实用户场景脱节</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">预发布、CI/CD 流程</font> |
| <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">生产环境监控</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">能看到真实的用户行为、能捕捉合成评测遗漏的问题、提供生产环境的真实表现</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">被动的，问题先影响用户才能被发现、信号有噪音、需要大量的埋点工作</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">发布后、生产环境</font> |
| <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">A/B 测试</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">衡量真实的用户结果（留存、任务完成率）、能控制混淆因素、可规模化系统化</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">速度慢，需要数天才能得到显著结果、只能测试已经部署的变更、无法解释指标变化的 "为什么"</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">正式发布、灰度放量</font> |
| <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">用户反馈</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">能暴露你完全没有预料到的问题、来自真实的人类用户、与产品目标直接相关</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">稀疏、自选择偏差、偏向严重的问题、很少解释失败的原因</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">全生命周期</font> |
| <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">人工日志抽检</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">能建立对失败模式的直觉、能捕捉自动化检查遗漏的细微质量问题、能校准 "好" 的标准</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">耗时、无法规模化、覆盖不一致、受审核者疲劳影响</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">全生命周期、重点优化阶段</font> |
| <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">系统性人工研究</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">金标准的质量判断、能处理主观的、模糊的任务、能校准模型裁判</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">成本极高、速度慢、需要领域专家</font> | <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">模型裁判校准、核心版本发布前的质量验收</font> |


<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">就像安全工程中的瑞士奶酪模型，没有任何一层能捕捉所有的问题，但多层方法结合，就能让穿过一层的故障，被另一层捕捉到。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">最有效的团队，会将这些方法结合起来：用自动化评测做快速迭代，用生产环境监控做真实场景的兜底，用定期的人工抽检做校准，用 A/B 测试验证重大变更的真实用户价值。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">12.7 主流评测框架选型</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">你不需要从零搭建评测执行框架，市面上有很多成熟的开源与商业框架，能帮你快速起步。我们整理了主流的框架与适用场景：</font>

+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Harbor</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：专为容器化环境中运行 Agent 设计，提供了大规模并发运行试验的基础设施，以及任务与评分器的标准化格式。Terminal-Bench 2.0 等主流基准测试，都通过 Harbor 仓库发布，适合需要运行行业标准基准 + 自定义评测的团队。</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Promptfoo</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：轻量、灵活、开源的框架，专注于声明式的 YAML 配置，支持从字符串匹配到 LLM 裁判的各类断言类型。我们内部的很多产品评测，都用的是 Promptfoo，适合快速起步、轻量级的评测需求。</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Braintrust</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：结合了离线评测与生产环境可观测性、实验跟踪的平台，适合需要同时做开发期迭代与生产环境质量监控的团队，它的 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">autoevals</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 库提供了很多开箱即用的评分器。</font>
+ **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">LangSmith</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：与 LangChain 生态深度集成，提供了追踪、离线 / 在线评测、数据集管理能力。Langfuse 是它的开源自托管替代方案，适合有数据驻留要求的团队。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的建议是：快速选择一个符合你的工作流的框架，把核心精力放在评测任务与评分器的设计上，而非从零搭建基础设施。框架只是工具，高质量的评测任务，才是评测体系的核心。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">12.8 总结</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">没有评测体系的团队，会陷入被动的故障修复循环；而早期就投入评测体系的团队，会发现开发速度越来越快：故障变成了测试用例，测试用例避免了回归，量化的指标替代了主观的猜测。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">评测体系的价值是持续累积的，但只有你把它当作 Agent 开发的核心环节，而非事后补充的内容，才能享受到这种复利。无论你的 Agent 处于哪个开发阶段，现在就是搭建评测体系的最佳时机。</font>

---

### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">第 13 章 Agent 安全：从权限提示到沙箱隔离</font>
**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">原文链接</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>[<font style="color:rgb(0, 102, 255);background-color:rgba(0, 0, 0, 0);">https://www.anthropic.com/engineering/claude-code-sandboxing</font>](https://www.anthropic.com/engineering/claude-code-sandboxing)**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">本章核心价值</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：理解 Agent 安全的核心矛盾，掌握 Claude 沙箱隔离的架构设计与实现方法，在保障安全的前提下，提升 Agent 的自治性与执行效率。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">13.1 Agent 安全的核心矛盾：安全与自治性的平衡</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">在 Claude Code 中，Claude 可以和开发者一起，编写、测试、调试代码，导航代码库，编辑多个文件，运行命令验证自己的工作。但给 Claude 这么大的代码库与文件系统访问权限，天然带来了安全风险，尤其是在提示词注入的场景下。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">传统的解决方案，是基于权限的模型：默认情况下，Claude Code 是只读的，在修改文件、运行命令之前，必须向用户申请权限。只有少数安全的命令（比如 echo、cat）会自动放行，绝大多数操作都需要用户的显式批准。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">但这种模式，带来了两个致命的问题：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">开发效率极低</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：开发者需要不断点击 "批准"，打断了开发流程，拉长了任务执行时间；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">批准疲劳</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：频繁的权限提示，会让用户不再仔细查看批准的内容，直接点击确认，反而让安全机制失去了作用，变得更不安全。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这就是 Agent 安全的核心矛盾：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">过度严格的权限控制，会让 Agent 失去自治性，变得毫无用处；而过度宽松的权限，会带来严重的安全风险</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的解决方案，是</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">沙箱隔离（Sandboxing）</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：通过预定义的边界，让 Claude 可以在边界内自由工作，无需频繁的权限申请，同时从根本上隔离风险，即使发生提示词注入，也不会造成安全危害。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">内部测试显示，沙箱隔离机制，在保障安全的前提下，</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">将权限提示的数量减少了 84%</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">，同时大幅提升了 Agent 的自治性与执行效率。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">13.2 沙箱隔离的核心设计理念</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">沙箱隔离的核心，是通过操作系统级的底层能力，实现两个核心边界的隔离，在边界内，给 Agent 完全的自治权限，边界外，完全禁止访问。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">两个核心隔离边界：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">文件系统隔离</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：确保 Claude 只能访问、修改你指定的目录，完全禁止访问目录外的任何文件，包括系统文件、用户目录、其他项目的文件。这能从根本上防止提示词注入后的恶意文件修改、敏感文件窃取。</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">网络隔离</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：确保 Claude 只能连接你批准的服务器，完全禁止访问未授权的外部网络。这能防止提示词注入后的敏感数据泄露、恶意软件下载。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">必须强调：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">有效的沙箱隔离，必须同时实现文件系统与网络的双重隔离</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。没有网络隔离，被入侵的 Agent 可以将 SSH 密钥等敏感文件外传；没有文件系统隔离，被入侵的 Agent 可以轻松突破沙箱，获取网络访问权限。只有二者结合，才能提供真正安全的、同时具备高自治性的 Agent 执行环境。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">13.3 两大核心沙箱功能实现</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">基于这套隔离理念，我们在 Claude Code 中，发布了两大核心沙箱功能，同时开源了底层的沙箱运行时，供所有开发者集成到自己的 Agent 系统中。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">13.3.1 沙箱化 Bash 工具：安全的命令执行，无需权限提示</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们发布了新的沙箱运行时，目前处于研究预览阶段，它能让你定义 Agent 可以访问的目录与网络主机，无需自己管理容器的创建与运维。它既可以用来沙箱化任意的进程、Agent、MCP 服务器，也可以直接用来给 Claude Code 的 Bash 工具提供沙箱能力。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这个沙箱运行时，是基于 Linux 的 bubblewrap 与 MacOS 的 seatbelt 这两个操作系统级的底层原语实现的，能在操作系统层面，强制执行隔离规则，不仅覆盖 Claude Code 的直接交互，还包括命令启动的所有脚本、程序、子进程。</font>

**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">核心能力</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：</font>

1. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">文件系统隔离</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：默认允许读写当前工作目录，完全禁止修改目录外的任何文件。你可以轻松配置允许 / 禁止的特定文件路径；</font>
2. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">网络隔离</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：仅允许通过 Unix 域套接字，连接到沙箱外的代理服务器，代理服务器会强制执行域名访问限制，对于新的域名请求，会向用户申请确认。你也可以自定义代理，实现任意的出站流量规则；</font>
3. **<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">自动权限放行</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">：在沙箱边界内的所有操作，都会自动放行，无需用户的权限批准；一旦尝试访问边界外的内容，会立即通知用户，由用户决定是否允许。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">这种设计，从根本上解决了权限提示过多的问题，同时实现了极致的安全防护：即使发生了成功的提示词注入，也会被完全隔离在沙箱内，无法修改系统文件、无法窃取敏感数据、无法回连攻击者的服务器。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">你可以直接在 Claude Code 中，运行 </font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">/sandbox</font>`<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);"> 命令，快速开启沙箱，配置隔离规则。同时，我们已经将这个沙箱运行时开源，所有开发者都可以将它集成到自己的 Agent 系统中，提升 Agent 的安全性与自治性。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">13.3.2 网页版 Claude Code：云端安全沙箱运行</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们同时发布了网页版 Claude Code，让用户可以在云端的隔离沙箱中，运行 Claude Code。每个 Claude Code 会话，都会在一个完全隔离的云端沙箱中执行，Claude 在沙箱内拥有完整的服务器访问权限，但整个环境是安全隔离的。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们的核心设计原则是：</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">敏感的凭证，永远不会进入沙箱内</font>**<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">。即使沙箱内运行的代码被完全入侵，用户的安全也不会受到影响。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">最典型的例子，是 Git 集成的设计：</font>

1. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">沙箱内的 Git 客户端，会通过我们自定义的代理服务，进行身份认证；</font>
2. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">代理服务会验证凭证、分支名称、仓库地址，确保操作符合用户的授权；</font>
3. <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">验证通过后，代理才会将用户的真实 Git 认证 token，附加到请求中，发送给 GitHub。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">整个过程中，用户的 Git 凭证，永远不会进入沙箱内，即使沙箱被完全控制，攻击者也无法获取用户的凭证，无法向未授权的仓库推送代码。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">13.4 Agent 安全的核心最佳实践</font>
##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">13.4.1 最小权限原则，是安全的基石</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">无论你是否使用沙箱，最小权限原则，都是 Agent 安全的核心。给 Agent 的权限，必须是完成任务所需的最小权限，绝对不能过度授权。</font>

+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">沙箱目录：仅开放项目所需的工作目录，绝对不要开放根目录、用户主目录；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">网络访问：仅允许任务必须的域名，默认禁止所有外部网络访问；</font>
+ <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">工具权限：仅给 Agent 开放完成任务必须的工具，禁止开放高危的、不必要的工具。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">13.4.2 不可信代码，必须在隔离环境中运行</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 生成的代码，永远属于不可信代码，必须在完全隔离的沙箱中运行，绝对不能在生产环境、开发者的本地环境中，直接运行无隔离的 Agent 生成的代码。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">即使是你自己开发的 Agent，也必须做好隔离：提示词注入、prompt leak 等攻击，都可能让 Agent 生成恶意代码，没有隔离的话，会直接造成严重的安全危害。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">13.4.3 完整的操作审计与日志</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">所有 Agent 的工具调用、代码执行、文件修改、网络访问，都必须留下完整的、可追溯的审计日志。一旦发生安全事件，你需要通过日志，快速定位发生了什么、影响范围有多大、根因是什么。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">13.4.4 破坏性操作，必须二次确认</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">即使在沙箱内，对于删除文件、修改生产环境数据、发送对外消息等破坏性、不可逆的操作，依然必须设置二次确认机制，不能自动放行。这能防止 Agent 的误操作，给用户带来不可逆的损失。</font>

##### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">13.4.5 持续的安全更新与漏洞修复</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">沙箱运行时、代码执行环境、Agent 依赖的所有组件，都必须持续更新，修复最新的安全漏洞。隔离机制的安全性，取决于底层组件的安全性，必须保持持续的维护。</font>

#### <font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">13.5 总结</font>
<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">Agent 安全的核心，不是用无休止的权限提示，给用户带来负担，而是通过底层的隔离机制，从根本上限制风险的影响范围。沙箱隔离，让我们在安全与自治性之间，找到了完美的平衡：在沙箱内，Agent 可以自由地完成工作，无需频繁的权限申请；在沙箱外，用户的系统与数据，得到了完全的安全防护。</font>

<font style="color:rgb(0, 0, 0);background-color:rgba(0, 0, 0, 0);">我们也希望，通过开源沙箱运行时，能推动整个行业的 Agent 安全能力提升，让所有开发者都能构建出既安全、又高效的 Agent 系统。

## 相关笔记

- [[WorkBuddy团队-从模型到可用Agent的Harness工程]] — 腾讯 WorkBuddy 的产品实践；Anthropic 偏理论框架，WorkBuddy 偏产品落地（五层 Harness、Context Engineering、Loop Engineering）</font>







