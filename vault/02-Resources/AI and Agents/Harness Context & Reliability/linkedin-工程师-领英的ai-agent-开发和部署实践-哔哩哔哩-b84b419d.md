---
title: "LinkedIn 工程师：领英的AI Agent 开发和部署实践 - 哔哩哔哩"
tags: ["ai_agent","context_engineering","mcp","harness_engineering","bilibili"]
created: 2026-09-16
source: "https://www.bilibili.com/opus/1248096025733759001"
description: "摘要 导读： LinkedIn 软件工程师 Ajay Prakash 讲述团队如何用 MCP、Playbook 和内部工具，让编码智能体真正理解企业系统。最值得带走的是：模型能力之外，决定智能体能否可靠完成工作的，是可发现、可执行、可持续更新的上下文基础设施。 企业智能体失败常因不懂内部系统 [02:10] 通用模型熟悉开源代码，却不了解 LinkedIn "
knowledge_state: captured
link_status: connected
ingest_workflow: bilibili_opus_ingest_v2
source_type: bilibili_opus
opus_id: "1248096025733759001"
primary_source: column
source_tier: C2
material_tier: A
source_form: lecture
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
voice_basis: direct_speech
factual_status: partial
factual_reviewed: 2026-09-16
verification_scope: column_only
verification_basis: ["column"]
source_kind: url
source_reliability: unverified
source_verification: unverified
source_url: "https://www.bilibili.com/opus/1248096025733759001"
source_content_sha256: 1dc1317a49aba35e0dac5798357645f49bf0a3e9e7e7c78b261faea10d923df5
---

# LinkedIn 工程师：领英的AI Agent 开发和部署实践 - 哔哩哔哩

# LinkedIn 工程师：企业编码智能体的上下文基础设施

> 讲者：Ajay Prakash，LinkedIn 软件工程师。主题：LinkedIn 如何通过上下文工程让编码智能体真正理解企业内部系统。
>
> 全篇围绕一个判断展开：模型能力之外，决定智能体能否可靠完成工作的，是可发现、可执行、可持续更新的上下文基础设施。
>
> **核心主张：** 企业智能体失败常因不懂内部系统；工具让智能体找到内部做法，Playbook 让经验变成可调用的操作说明，用后提交 PR 让知识库保持新鲜。

> 仅仅给所有工程师提供最新、最先进的工具和模型，是远远不够的。如果不构建让智能体能够在企业内部运行的正确基础设施，这些工具和模型就不会真正高效。
> ——Ajay Prakash

## 开场

讲者用一个值班场景开场。某项服务的错误数激增，工程师把告警链接交给 Claude Code 或 GitHub Copilot 这类编码智能体，智能体在后台取来公司内部关于该问题的调试说明，据此判断告警对应的具体服务，取来处理该服务所需的上下文，抓取日志与指标，定位根因，找出缓解步骤，汇总反馈给工程师。得到确认后它代为执行缓解操作，再把错误指标与监控面板写入事件管理系统，检出代码并创建修复根因的 PR。整个过程几分钟，人工通常要几小时。

这一流程依托 LinkedIn 自建系统 CCA，即 Code, Contextual Agent, Playbooks and Tools。讲者说明今天要讲的是为什么建、怎么建、学到了什么。

## 01 企业智能体为什么在内部环境失效

**核心判断：** 编码智能体在 LinkedIn 这类大型企业里不奏效，根因是训练数据来自公开开源仓库，模型不了解内部框架与定制基础设施。

**编者问：** 大型企业内部用编码智能体，最先卡在哪一步？

**讲者：** 编码智能体或大语言模型都在公开的开源代码仓库上训练，因此不了解 LinkedIn 成熟代码库的情况，也不了解内部框架和内部系统。结果工程师尝试氛围编程时，智能体因为缺乏上下文而出现三类失败：产生幻觉、卡在中途，以及更危险的——编造错误的内容。

工程师不得不手动提示智能体做正确的事，反而比直接手写代码花的时间更多。于是很多人回到了手动编码，智能体既没能有效理解问题，也没能提供更多视角。

规模可以说明这个断层有多大：

- LinkedIn 有超过一千个代码仓库，构成数千个微服务和应用
- 这些应用和服务大多建立在各种内部框架和库之上
- 还有大量定制开发的基础设施，例如自研数据库、实验与追踪平台，以及完全内部使用的配置管理系统
- 新工程师入职时，公司会安排为期一周的训练营，专门用来熟悉这些系统

讲者提出的问题是：怎样才能让 Cursor、Claude Code 或 GitHub Copilot 这样的编码智能体充分理解 LinkedIn 的内部系统，交付工程师可以信赖的代码——不仅是正确，质量也要达到真正工程师编写的水平。

## 02 MCP 工具先让智能体找到内部做法

**核心判断：** 用 MCP 把内部能力暴露给智能体，第一个工具是代码搜索，之后每接入一个内部工具，系统价值呈复利增长。

**编者问：** 让智能体理解内部系统，第一步做了什么？

**讲者：** 2025 年初 Anthropic 发布 MCP，很快成为业界构建智能体工具的标准。LinkedIn 很早就在 MCP 之上构建了自己的内部 MCP，第一个工具是代码搜索。

LinkedIn 的代码搜索系统本身很先进，支持关键词、自定义过滤器等方式在数千个代码仓库中检索。通过 MCP 把它提供给编码智能体后，工程师不再需要手动摸索如何搜索：直接问智能体“我该如何配置某项功能”，智能体就能用代码搜索找到内部正确实现，据此回答或直接完成实现。

随后接入的工具依次是：

- 文档
- Jira
- Slack
- 所有数据平台
- 功能开关

每增加一个内部 MCP 工具，系统就创造更多价值，形成复利效应。工程师可以把产品需求文档、设计文档和处于不同上下文的 Jira 任务一起交给智能体，自动化或辅助完成编码工作。

## 03 工具齐全仍不足以完成复杂工作流

**核心判断：** 只连工具不够，复杂工作流还缺三样东西——集中可取的内部经验、可控的上下文占用、以及跨会话的持久记忆。

**编者问：** 工具接得足够多，智能体就能端到端完成任务了吗？

**讲者：** 不够。即使只是稍微复杂的工作流，智能体也往往完成不好。它能回答问题、回答一些基础问题、找到代码示例，但无法可靠地端到端完成一项完整工作。

要具体完整地完成任务，它需要大量只有内部人才掌握的经验，例如如何修复某种错误、如何配置系统、如何调试某条错误日志。这些知识可以通过工具访问，但散落在许多地方：

- 文档
- Wiki
- Slack 对话
- 各团队的口头传承

而且很多时候文档和 Wiki 已经过时，或者存在重复文档。即使智能体能访问这些工具，也还是会迷失。

第二个问题是上下文过载。智能体使用的工具越多，上下文越容易过载。每个工具的输出都占用上下文空间，最终迫使智能体在工作中途压缩上下文，导致部分信息丢失，然后又得从头开始。

第三个问题是无法保留经验。即使智能体弄清了所有细节，也没有持久记忆。每次工程师让它执行某项任务，都得从头开始。

## 04 Playbook：把经验变成可调用的操作说明

**核心判断：** 把任务说明与提示词本身也作为 MCP 可调用资源提供给智能体，让组织知识从人手临场转述变成执行链路的一部分。

**编者问：** 这三个问题怎么解？

**讲者：** 答案是立即把说明提供给智能体。LinkedIn 在 2025 年初构建并发明了一套名为 Playbooks 的系统。它不仅通过 MCP 向智能体提供工具，还允许智能体通过 MCP 访问说明和提示词。

每个 Playbook 看起来就像普通工具，有名称和功能描述。智能体可以像调用普通工具一样自主决定调用某个 Playbook。调用后，其中的说明和上下文作为工具输出返回给编码智能体。这样，智能体既拥有工具，也拥有如何使用这些工具来配置或完成任务的说明。

以配置 Airflow DAG 为例，智能体的行为是：

- 判断“我有一个专门用于完成这项任务的 Playbook”
- 先调用该 Playbook 获取信息
- 遵循其中说明，调用相关工具完成任务

## 05 Playbook 的设计原则与自我改进闭环

**核心判断：** Playbook 要自包含、要拆小再引用，才能被正确选择和复用；而知识库保鲜靠把维护变成使用驱动的 PR 闭环。

**编者问：** 当公司里每个人都能建 Playbook 时，怎么保证它们好用？

**讲者：** LinkedIn 的任何人都可以创建一个 Playbook，提交到代码仓库，提供给公司其他人使用。随着 Playbook 数量增长，团队提出了两条创建时必须遵循的原则。

第一条，Playbook 应当自包含，只负责一项非常具体的任务。如果它用于配置 Airflow DAG，那么说明和构建内容都应围绕这一项任务。这样能帮助智能体为正确的任务选择正确的 Playbook。

第二条，把大型 Playbook 拆分成多个更小的 Playbook，然后在大型 Playbook 中引用这些小 Playbook。这条原则有两个好处：

- 可复用性：自包含的小 Playbook 可以被多个 Playbook 复用
- 渐进式发现上下文：智能体只在需要时读取某个小 Playbook，随着任务推进逐步获取信息，而不是一次性读取全部内容

讲者指出这与后来 Skills 的理念一致，但 LinkedIn 在 Skills 出现之前就已经围绕 Playbooks 构建了整套系统。相比之下 Playbooks 更细致，因为它能通过 MCP 无缝纳入组织和服务的全部上下文，几乎不需要额外配置。

**编者问：** 知识库的内容总会过时，怎么保持新鲜？

**讲者：** 这是任何知识库的主要问题之一。LinkedIn 的做法是把智能体也纳入维护——鼓励智能体在使用某个 Playbook 后，于会话结束时总结经验，识别过时信息、矛盾之处或缺失内容，并思考如何改进 Playbook。然后智能体利用这些上下文更新内容、检出代码仓库、创建 PR。PR 合并后 Playbook 就得到更新。

这就形成一个顺畅的自学习飞轮：知识维护从一次性文档劳动，变成使用驱动的改进闭环，合并后的经验会服务下一位使用者。

## 06 MCP 服务器架构

**核心判断：** 用一台预装到所有公司电脑的本地 MCP 服务器统一提供工具与 Playbook，并在中央与仓库本地之间分层，同时集中处理认证与遥测。

**编者问：** 这套系统在工程上怎么部署和分层？

**讲者：** 系统中有一台本地 MCP 服务器，默认自动安装到所有 LinkedIn 笔记本电脑上。员工加入公司拿到电脑时，它已经预装好。MCP 服务器、Playbooks 或工具一旦更新，所有电脑每小时自动更新。

Playbook 分两层：

- 中央 Playbook：具有跨领域性质，可应用于多个代码仓库，而不只是某一个仓库
- 本地 Playbook：专门服务某个代码仓库，可以直接和代码一起提交；只有当编码智能体在该仓库中工作时才会被自动加载

这样就能扩展高度专用于某个仓库的本地 Playbook，而不必担心修改中央仓库。此外，所有 Playbook 和工具都由同一台 MCP 服务器提供服务，便于集中处理身份认证、遥测等事务，并利用这些数据持续改进整个生态系统。

### 07 规模化：元工具与当前体量

**核心判断：** 平铺暴露工具不可扩展，超过三四十个就会拖垮上下文质量；改用搜索、Get Schema、执行三个元工具，才能扩到数千个。

**编者问：** 工具和 Playbook 越堆越多，MCP 本身撑得住吗？

**讲者：** 这是 MCP 的常见问题。如果工具数量超过三四十个，系统的上下文质量和性能就会下降，难以继续扩展。

因此 LinkedIn 没有通过 MCP 暴露所有 Playbook 和工具，而是用三个元工具替代：

- 搜索：智能体先用关键词和标签搜索相关的工具与 Playbook
- Get Schema：找到合适的工具或 Playbook 后，获取其详细信息
- 执行：调用对应的工具或 Playbook

配套地，团队控制系统指令，每个编码智能体都预先配置系统指令，说明如何使用这些工具以及如何高效搜索。

这套方案让系统扩展到数千个工具和 Playbook。截至讲者分享时：

- 每天有超过 8,000 名用户使用这套系统及其中的工具与 Playbook
- 拥有超过 1,300 个工具和超过 600 个 Playbook
- 使用者不只是工程团队，还有产品经理、设计师和 TPM
- 不同职能的员工都在使用这些工具，并创建自己的 Playbook 来自动化工作流

## 限制与边界

- 讲者自述的三四十个工具阈值是经验判断，来源未给出测量方法与适用边界，不应直接套用到其他规模或组织。
- 1,300+ 工具、600+ Playbook、8,000+ 日活等数字均为讲者口述的当前状态，未提供第三方核验渠道。
- 自我改进闭环只讲了收益，未讨论风险：智能体提交的 PR 由谁审核、错误修改如何回滚、多人同时改同一 Playbook 如何冲突，来源均未涉及。
- 全文语境是 LinkedIn 这家有逾千仓库、自研数据库与配置系统的大型企业；中小团队缺乏对应的内部基础设施，方案不能直接照搬。
- 本笔记依据专栏文字整理，未读取官方原视频页，现场问答与幻灯片内容不在核验范围内。

## 知识连接

- **补充** [[3-4 MCP 的工程真相]]：既有笔记讲 MCP 协议本身的能力与硬伤，本来源补上企业落地层的工程方案——本地服务器预装、中央与本地 Playbook 分层、以及用元工具绕过工具数量上限。
- **应用于** [[6-3 部署与调度]]：既有笔记讨论 Agent 跑在哪、何时跑，本来源给出可对照的实践细节，包括每小时自动更新与随仓库提交的本地 Playbook 自动加载。
- **限制** [[4-2 System Prompt 工程化与 Context Rot]]：本来源为 Context Rot 给出量化边界，工具数超过三四十个上下文质量与性能即下降，因此必须靠元工具和渐进式发现按需加载，而不是把全部说明塞进上下文。

## 来源说明

- 来源形态：B站图文专栏（opus），单一讲者演讲整理，正文含六个带时间标记的要点小节。
- 声音归属：全篇回答均为 Ajay Prakash 直接陈述，标 `direct_speech`；无真实主持人，问题由编者按内容推进组织，标 `reconstructed/editorial`。
- 核验范围：`column_only`。只确认笔记忠实于专栏文字，未读取官方原视频页，外部事实未独立核验。
- 未决事实见报告 `unresolved` 字段；所有数字与阈值在使用时应保留讲者自述的限定。
- 图片未读取、未识别、未保存；未扫描 UP 主空间，未进入 ASR 或 transcript 流程。

## 关系状态

- 补充：[[01-Areas/AI Agent Development/03-Tool System/3-4 MCP 的工程真相]] — Adds the enterprise MCP discovery, Playbook layering, and meta-tool scaling details missing from the protocol-level note.
- 应用于：[[01-Areas/AI Agent Development/06-Harness Engineering/6-3 部署与调度]] — Provides a concrete enterprise deployment pattern: preinstalled local MCP, hourly updates, and repository-local Playbooks.
- 限制：[[01-Areas/AI Agent Development/04-Context Engineering/4-2 System Prompt 工程化与 Context Rot]] — Supplies an operational boundary for context growth: flat exposure beyond roughly 30-40 tools degrades quality, so progressive discovery is required.
