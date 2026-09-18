---
title: "01 · Harne ：模型之外的工程 — Loock AI 全栈应用开发"
tags: ["loock_ai", "coding_agent", "ai_agent", "harness_engineering"]
legacy_tags: ["loock_ai", "coding_agent", "ai_agent", "harness_engineering"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/mini-coding-agent/00-intro/01-harness"
description: "理解 Agent Harne  的概念，看懂 2026 年行业趋势从\\\"做模型\\\"到\\\"造底盘\\\"的转向，以及本课程 12 章如何对应一个完整 Harne  的构建过程。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/6-从 0 实现 Coding Agent/6-1 01 · Harness - 模型之外的工程.md"
source_sha256: "eced5723581cdddd6300c5bf132e5b47785b559d485d22022c57fcc6f12f9316"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第 0 章 · 建立全局认知

# 01 · Harness：模型之外的工程

理解 Agent Harness 的概念，看懂 2026 年行业趋势从"做模型"到"造底盘"的转向，以及本课程 12 章如何对应一个完整 Harness 的构建过程。

## [2026 年的关键词：不再只是 Agent](#2026-年的关键词不再只是-agent)

2025 年，所有人都在做 Agent。2026 年，行业里出现了一个更精确的概念：**Harness**。

2026 年 2 月，OpenAI 发表了一篇文章 [Harness Engineering: Leveraging Codex in an Agent-First World](https://openai.com/index/harness-engineering/)，描述了一个用 Codex 从零构建完整产品的过程——零行手写代码，全部由 Agent 完成。文章的核心洞察不是"模型多厉害"，而是：**让模型真正能干活，需要围绕它搭一套完整的工程基础设施。**

> Early progress was slower than we expected, not because Codex was incapable, but because the environment was underspecified. The agent lacked the tools, abstractions, and internal structure required to make progress toward high-level goals. The primary job of our engineering team became enabling the agents to do useful work. —— [Harness Engineering, OpenAI 2026](https://openai.com/index/harness-engineering/)

这段话点明了一个关键事实：Agent 能力不足，往往不是模型不行，而是围绕模型的工程环境不够完善。这个洞察把行业的注意力从"模型的推理能力"转移到了"模型外面的那一层壳"。这层壳，就是 Harness。

## [什么是 Harness](#什么是-harness)

一个类比：模型是发动机，Harness 是整辆���。

发动机再强，没有方向盘你转不了弯，没有刹车你停不下来，没有仪表盘你不知道速度，没有油箱你跑不了长途。Harness 就是方向盘、刹车、仪表盘、油箱——以及把这些零件组装在一起的底盘。

用技术语言描述：**Harness 是围绕 AI 模型搭建的一层工程基础设施，负责管理执行流程、工具访问、权限控制、错误恢复和子 Agent 协调。**

OpenAI 的 Harness 工程实践揭示了几个反复出现的主题，每个主题对应 Harness 中一组具体的工程能力。下面逐一展开。

## [主题一：人掌方向，Agent 执行](#主题一人掌方向agent-执行)

> Humans steer. Agents execute. —— [Harness Engineering, OpenAI 2026](https://openai.com/index/harness-engineering/)

OpenAI 的 Harness 实践中，人不写代码。人的工作是设定目标、拆解任务、定义验收标准、验证结果。Agent 的工作是写代码、跑测试、开 PR、处理反馈。

这改变了工程师的角色：从"写代码的人"变成"设计环境和反馈循环的人"。当 Agent 遇到困难时，工程师的任务不是亲自上手写代码，而是问自己一个问题——"系统里缺少了什么能力，让 Agent 无法完成这个任务？"

> When something failed, the fix was almost never "try harder." Because the only way to make progress was to get Codex to do the work, human engineers always stepped into the task and asked: "what capability is missing, and how do we make it both legible and enforceable for the agent?" —— [Harness Engineering, OpenAI 2026](https://openai.com/index/harness-engineering/)

对应到课程：**第 4 章 Permissions** 解决"哪些操作需要人确认"，**第 5 章 Streaming** 解决"怎么让人实时看到 Agent 在做什么"。两者配合，构成完整的人机交互界面。

## [主题二：给地图，不给手册](#主题二给地图不给手册)

> Give Codex a map, not a 1,000-page instruction manual. —— [Harness Engineering, OpenAI 2026](https://openai.com/index/harness-engineering/)

OpenAI 发现，把所有指令塞进一个巨大的配置文件，效果反而更差。原因有四个：

1.  **上下文是稀缺资源。** 巨大的指令文件挤占了任务描述、代码和相关文档的空间。
2.  **过多指导等于没有指导。** 当所有东西都"重要"时，Agent 会迷失在局部模式匹配中。
3.  **文档腐烂。** 庞大的手册变成过时规则的墓地——Agent 分不清哪些规则还有效。
4.  **难以验证。** 单一大文件无法做自动化检查（覆盖率、时效性、交叉引用）。

OpenAI 的做法是**渐进式披露（Progressive Disclosure）**：Agent 从一个简短的入口文件（`AGENTS.md`，约 100 行）开始，里面是指向更深层知识库的指针。Agent 知道去哪里找信息，而不是一次性被所有信息淹没。

对应到课程：**第 6 章 Memory** 实现上下文的选择与压缩，**第 7 章 Skills** 把大 prompt 拆成按场景自动加载的能力模块。

## [主题三：约束边界，不约束实现](#主题三约束边界不约束实现)

> By enforcing invariants, not micromanaging implementations, we let agents ship fast without undermining the foundation. —— [Harness Engineering, OpenAI 2026](https://openai.com/index/harness-engineering/)

OpenAI 的 Harness 不是靠详细指令控制 Agent 的每一步，而是定义清晰的边界和规则，在边界之内给 Agent 充分的自由。

具体做法：每个业务域分为固定的层次结构（Types → Config → Repo → Service → Runtime → UI），层与层之间的依赖方向严格校验，跨域访问只能通过显式接口。这些约束不是写在文档里靠人遵守的——而是通过自定义 linter 和结构测试**机械性地强制执行**。

> In a human-first workflow, these rules might feel pedantic or constraining. With agents, they become multipliers: once encoded, they apply everywhere at once. —— [Harness Engineering, OpenAI 2026](https://openai.com/index/harness-engineering/)

这个思路的核心是：约束不是限制 Agent 的能力，而是让 Agent 的行为可预测。在明确的边界内，Agent 可以自由选择实现方式；但边界本身不能被逾越。

对应到课程：**第 4 章 Permissions** 建立执行边界，**第 8 章 Hooks** 在关键时机注入拦截与增强逻辑。

## [主题四：持续清理技术债务](#主题四持续清理技术债务)

OpenAI 的团队最初每周花 20% 的时间人工清理"AI slop"——Agent 生成的不一致代码模式。这种方式不可扩展。

他们的解决方案是把团队偏好编码成**可机械执行的规则**（他们称为 "golden principles"），然后让 Agent 自己定期扫描偏差、更新质量评分、开启重构 PR。大部分重构 PR 可以在一分钟内审阅并自动合并。

> Technical debt is like a high-interest loan: it's almost always better to pay it down continuously in small increments than to let it compound and tackle it in painful bursts. —— [Harness Engineering, OpenAI 2026](https://openai.com/index/harness-engineering/)

这种"持续垃圾回收"的思路，让 Harness 能在 Agent 高产出的节奏下保持代码库的健康。

对应到课程：**第 8 章 Hooks** 提供了在关键时机自动执行检查和修复的机制。

## [主题五：工具和可观测性](#主题五工具和可观测性)

OpenAI 发现，随着代码产出量增长，瓶颈变成了人工 QA 的容量。为此，他们做了两件事：

1.  **让应用可启动。** 每个 git worktree 都能独立启动一个应用实例，Agent 可以实际运行和操作应用。
2.  **让可观测性对 Agent 可读。** 日志、指标、链路追踪通过本地可观测性栈暴露给 Agent。Agent 可以用 LogQL 查询日志、用 PromQL 查询指标。

> Prompts like "ensure service startup completes in under 800ms" or "no span in these four critical user journeys exceeds two seconds" become tractable. —— [Harness Engineering, OpenAI 2026](https://openai.com/index/harness-engineering/)

这意味着 Agent 不只能改代码，还能验证自己的改动在运行时是否正确。工具层和可观测性层的建设，让 Agent 从"盲写代码"进化到"有反馈循环的自主执行"。

对应到课程：**第 3 章 Tools** 定义工具注册和执行层，**第 9 章 MCP** 扩展外部工具接入，**第 10 章 Multi-Agent** 实现多角色协作。

## [课程十二章到 Harness 能力的映射](#课程十二章到-harness-能力的映射)

这门课的 12 章不是随机排列的。从 Harness 的视角看，它们对应了一个完整 Harness 从基础到成熟的构建过程：

#\_r\_1\_{margin:1.5rem auto 0;}#\_r\_1\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_1\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_1\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_1\_ .error-icon{fill:#a44141;}#\_r\_1\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_1\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_1\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_1\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_1\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_1\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_1\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_1\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_1\_ .marker.cross{stroke:lightgrey;}#\_r\_1\_ svg{font-family:inherit;font-size:16px;}#\_r\_1\_ p{margin:0;}#\_r\_1\_ .label{font-family:inherit;color:#ccc;}#\_r\_1\_ .cluster-label text{fill:#F9FFFE;}#\_r\_1\_ .cluster-label span{color:#F9FFFE;}#\_r\_1\_ .cluster-label span p{background-color:transparent;}#\_r\_1\_ .label text,#\_r\_1\_ span{fill:#ccc;color:#ccc;}#\_r\_1\_ .node rect,#\_r\_1\_ .node circle,#\_r\_1\_ .node ellipse,#\_r\_1\_ .node polygon,#\_r\_1\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_1\_ .rough-node .label text,#\_r\_1\_ .node .label text,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-anchor:middle;}#\_r\_1\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_1\_ .rough-node .label,#\_r\_1\_ .node .label,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-align:center;}#\_r\_1\_ .node.clickable{cursor:pointer;}#\_r\_1\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_1\_ .arrowheadPath{fill:lightgrey;}#\_r\_1\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_1\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_1\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_1\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_1\_ .cluster text{fill:#F9FFFE;}#\_r\_1\_ .cluster span{color:#F9FFFE;}#\_r\_1\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_1\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_1\_ rect.text{fill:none;stroke-width:0;}#\_r\_1\_ .icon-shape,#\_r\_1\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .icon-shape p,#\_r\_1\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_1\_ .icon-shape rect,#\_r\_1\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_1\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_1\_ :root{--mermaid-font-family:inherit;}

课程章节

Harness 核心能力

对应

对应

对应

对应

对应

对应

对应

对应

对应

对应

人机协作

上下文管理

边界与约束

工具与可观测性

能力模块化

第 2 章  
Agent Loop

第 3 章  
Tools

第 4 章  
Permissions

第 5 章  
Streaming

第 6 章  
Memory

第 7 章  
Skills

第 8 章  
Hooks

第 9 章  
MCP

第 10 章  
Multi-Agent

还有一些章节没有直接映射到某个 Harness 主题，但它们是 Harness 正常运行的基础：第 1 章搭骨架、第 2 章实现执行循环、第 11 章做产品化收尾。它们是"造车"过程中不可缺少的工序，只是不直接对应某个独立主题。

## [为什么理解 Harness 对这门课重要](#为什么理解-harness-对这门课重要)

如果你把这门课理解为"学会调用模型 API"，那课程做到第 2 章就够了。但 Coding Agent 的核心挑战从来不在模型调用——任何工程师花半小时都能写出一个能跟模型对话的脚本。

真正的挑战在模型之外：怎么让 Agent 安全地操作你的文件系统？怎么让它在多步骤任务中不跑偏？怎么让它的行为可预测、可审计、可扩展？这些问题，都是 Harness 工程要回答的。

OpenAI 的 Harness 实践给出了一个有力的验证：一个三人团队用五个月构建了百万行代码级别的产品，平均每个工程师每天产出 3.5 个 PR。这不是因为模型突然变聪明了，而是因为他们围绕模型搭建了足够完善的工程基础设施。

> Building software still demands discipline, but the discipline shows up more in the scaffolding rather than the code. —— [Harness Engineering, OpenAI 2026](https://openai.com/index/harness-engineering/)

2026 年的行业共识正在从"谁的模型更强"转向"谁的 Harness 更好"。Claude Code、Codex CLI、Gemini CLI 的差异，不在它们用了什么模型，而在它们围绕模型搭建的 Harness 工程做得怎么样。理解 Harness，你就能看懂这些产品的设计选择，也能理解这门课为什么要按这个顺序、讲这些内容。

这门课教你的不是"怎么调 API"，而是"怎么造一辆车"。

下一节，我们来看 Coding Agent 的精确定义和核心闭环。

## 相关笔记

- [[3-4 MCP 的工程真相]]
- [[4-6 RAG 全流程]]
- [[4-9 Agent 的记忆系统]]
- [[3-5 Skills - Agent 时代的知识分发系统]]
- [[2-3 Agent Loop 保险丝]]
- [[2-1 流式响应工程真相]]
