---
title: "Agent（智能代理）概念 — Loock AI 全栈应用开发"
tags: ["loock_ai", "langgraphjs_tutorial", "ai_agent"]
legacy_tags: ["loock_ai", "langgraphjs-tutorial", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/langgraphjs/02-core-concepts/03-agent-concepts"
description: "深入理解智能代理的核心概念、架构类型和在 LangGraph 中的实现方式"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/2-LangGraph.js 教程/2-2 Agent（智能代理）概念.md"
source_sha256: "e31a341f799ae6cf71b81c916d058b1fc35b597ef5a9e57cc6b4ebc52f1dff43"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

基础概念

# Agent（智能代理）概念

深入理解智能代理的核心概念、架构类型和在 LangGraph 中的实现方式

## [引言](#引言)

在人工智能的发展历程中，我们从简单的规则系统发展到了能够自主决策的智能代理。Agent 代表了 AI 应用的重要进化方向：让系统能够**自主选择执行路径**，而不是被动地遵循预定义流程。

本节将深入探讨 Agent 的核心概念、不同架构类型，以及它们在 LangGraph 中的实现思路。

## [📚 学习目标](#-学习目标)

学完这篇文章后，你将能够：

-   理解 Agent 与传统固定流程应用的核心区别
-   掌握三种主要的 Agent 架构（路由器、工具调用、ReAct）
-   学会在 LangGraph 中实现基本的 Agent 逻辑
-   了解 Human-in-the-Loop（人机交互）模式

## [前置知识](#前置知识)

在开始学习之前，建议先阅读：

-   [02-core-concepts](./02-core-concepts)

你需要了解：

-   基本的图结构和节点定义
-   LLM 的基本能力（推理、生成）

* * *

## [1 什么是 Agent？](#1-什么是-agent)

**Agent（智能代理）** 是一个使用 LLM 来决定应用控制流的系统。

### [核心能力](#核心能力)

-   **自主决策**：根据当前情况选择下一步行动
-   **动态适应**：根据环境变化调整策略
-   **工具使用**：选择和使用各种外部工具
-   **学习记忆**：从历史经验中学习和改进

#\_r\_5\_{margin:1.5rem auto 0;}#\_r\_5\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_5\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_5\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_5\_ .error-icon{fill:#a44141;}#\_r\_5\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_5\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_5\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_5\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_5\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_5\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_5\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_5\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_5\_ .marker.cross{stroke:lightgrey;}#\_r\_5\_ svg{font-family:inherit;font-size:16px;}#\_r\_5\_ p{margin:0;}#\_r\_5\_ .label{font-family:inherit;color:#ccc;}#\_r\_5\_ .cluster-label text{fill:#F9FFFE;}#\_r\_5\_ .cluster-label span{color:#F9FFFE;}#\_r\_5\_ .cluster-label span p{background-color:transparent;}#\_r\_5\_ .label text,#\_r\_5\_ span{fill:#ccc;color:#ccc;}#\_r\_5\_ .node rect,#\_r\_5\_ .node circle,#\_r\_5\_ .node ellipse,#\_r\_5\_ .node polygon,#\_r\_5\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_5\_ .rough-node .label text,#\_r\_5\_ .node .label text,#\_r\_5\_ .image-shape .label,#\_r\_5\_ .icon-shape .label{text-anchor:middle;}#\_r\_5\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_5\_ .rough-node .label,#\_r\_5\_ .node .label,#\_r\_5\_ .image-shape .label,#\_r\_5\_ .icon-shape .label{text-align:center;}#\_r\_5\_ .node.clickable{cursor:pointer;}#\_r\_5\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_5\_ .arrowheadPath{fill:lightgrey;}#\_r\_5\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_5\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_5\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_5\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_5\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_5\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_5\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_5\_ .cluster text{fill:#F9FFFE;}#\_r\_5\_ .cluster span{color:#F9FFFE;}#\_r\_5\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_5\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_5\_ rect.text{fill:none;stroke-width:0;}#\_r\_5\_ .icon-shape,#\_r\_5\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_5\_ .icon-shape p,#\_r\_5\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_5\_ .icon-shape rect,#\_r\_5\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_5\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_5\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_5\_ :root{--mermaid-font-family:inherit;}

用户输入

Agent 分析

决策中心

选择工具A

选择工具B

直接回答

需要更多信息

执行并观察结果

收集信息

任务完成?

继续执行

输出结果

### [Agent vs 传统应用](#agent-vs-传统应用)

特性

传统应用

Agent 应用

**流程**

固定（预处理 -> LLM -> 后处理）

动态循环（感知 -> 决策 -> 行动 -> 观察）

**灵活性**

低，路径预定义

高，路径运行时决定

**复杂度**

低

高

**传统应用的特点**：高效、可预测、易于调试，但难以处理复杂场景。

**Agent 应用的特点**：灵活、智能、可处理复杂任务，但执行路径不确定，设计成本更高。

* * *

## [2 Agent 架构类型](#2-agent-架构类型)

### [1\. 路由器（Router）](#1-路由器router)

最简单的 Agent 类型，从预定义的多个路径中选择一条。

#\_r\_7\_{margin:1.5rem auto 0;}#\_r\_7\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_7\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_7\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_7\_ .error-icon{fill:#a44141;}#\_r\_7\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_7\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_7\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_7\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_7\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_7\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_7\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_7\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_7\_ .marker.cross{stroke:lightgrey;}#\_r\_7\_ svg{font-family:inherit;font-size:16px;}#\_r\_7\_ p{margin:0;}#\_r\_7\_ .label{font-family:inherit;color:#ccc;}#\_r\_7\_ .cluster-label text{fill:#F9FFFE;}#\_r\_7\_ .cluster-label span{color:#F9FFFE;}#\_r\_7\_ .cluster-label span p{background-color:transparent;}#\_r\_7\_ .label text,#\_r\_7\_ span{fill:#ccc;color:#ccc;}#\_r\_7\_ .node rect,#\_r\_7\_ .node circle,#\_r\_7\_ .node ellipse,#\_r\_7\_ .node polygon,#\_r\_7\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_7\_ .rough-node .label text,#\_r\_7\_ .node .label text,#\_r\_7\_ .image-shape .label,#\_r\_7\_ .icon-shape .label{text-anchor:middle;}#\_r\_7\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_7\_ .rough-node .label,#\_r\_7\_ .node .label,#\_r\_7\_ .image-shape .label,#\_r\_7\_ .icon-shape .label{text-align:center;}#\_r\_7\_ .node.clickable{cursor:pointer;}#\_r\_7\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_7\_ .arrowheadPath{fill:lightgrey;}#\_r\_7\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_7\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_7\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_7\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_7\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_7\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_7\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_7\_ .cluster text{fill:#F9FFFE;}#\_r\_7\_ .cluster span{color:#F9FFFE;}#\_r\_7\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_7\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_7\_ rect.text{fill:none;stroke-width:0;}#\_r\_7\_ .icon-shape,#\_r\_7\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_7\_ .icon-shape p,#\_r\_7\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_7\_ .icon-shape rect,#\_r\_7\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_7\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_7\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_7\_ :root{--mermaid-font-family:inherit;}

售后

技术

用户查询

路由器分析

决策

售后处理

技术支持

**实现要点**：使用 `addConditionalEdges` 根据分类结果路由到不同节点。

**特点**：

-   ✅ 简单可靠、易于理解和调试
-   ❌ 控制能力有限、只能做单次决策

### [2\. 工具调用代理（Tool Calling Agent）](#2-工具调用代理tool-calling-agent)

能够分析需求并自主调用工具。

**工作流程**：

1.  LLM 分析用户需求。
2.  LLM 决定是否调用工具，以及调用哪个工具。
3.  执行工具，将结果返回给 LLM。
4.  LLM 根据工具结果生成最终回答。

**代码示例**：

```
const searchTool = tool(async ({ query }) => '搜索结果...', {
  name: 'search',
  description: '搜索相关信息',
  schema: z.object({ query: z.string() }),
});
// LLM 会根据 description 决定何时调用
```

**实现要点**：

-   使用 `@langchain/core/tools` 的 `tool` 定义工具
-   工具需要清晰的 `name`、`description`、`schema`
-   LLM 根据工具描述自动选择合适的工具

### [3\. ReAct 架构](#3-react-架构)

**ReAct** = **Re**asoning（推理）+ **Act**ing（行动）。

#\_r\_a\_{margin:1.5rem auto 0;}#\_r\_a\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_a\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_a\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_a\_ .error-icon{fill:#a44141;}#\_r\_a\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_a\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_a\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_a\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_a\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_a\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_a\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_a\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_a\_ .marker.cross{stroke:lightgrey;}#\_r\_a\_ svg{font-family:inherit;font-size:16px;}#\_r\_a\_ p{margin:0;}#\_r\_a\_ .label{font-family:inherit;color:#ccc;}#\_r\_a\_ .cluster-label text{fill:#F9FFFE;}#\_r\_a\_ .cluster-label span{color:#F9FFFE;}#\_r\_a\_ .cluster-label span p{background-color:transparent;}#\_r\_a\_ .label text,#\_r\_a\_ span{fill:#ccc;color:#ccc;}#\_r\_a\_ .node rect,#\_r\_a\_ .node circle,#\_r\_a\_ .node ellipse,#\_r\_a\_ .node polygon,#\_r\_a\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_a\_ .rough-node .label text,#\_r\_a\_ .node .label text,#\_r\_a\_ .image-shape .label,#\_r\_a\_ .icon-shape .label{text-anchor:middle;}#\_r\_a\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_a\_ .rough-node .label,#\_r\_a\_ .node .label,#\_r\_a\_ .image-shape .label,#\_r\_a\_ .icon-shape .label{text-align:center;}#\_r\_a\_ .node.clickable{cursor:pointer;}#\_r\_a\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_a\_ .arrowheadPath{fill:lightgrey;}#\_r\_a\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_a\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_a\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_a\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_a\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_a\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_a\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_a\_ .cluster text{fill:#F9FFFE;}#\_r\_a\_ .cluster span{color:#F9FFFE;}#\_r\_a\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_a\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_a\_ rect.text{fill:none;stroke-width:0;}#\_r\_a\_ .icon-shape,#\_r\_a\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_a\_ .icon-shape p,#\_r\_a\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_a\_ .icon-shape rect,#\_r\_a\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_a\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_a\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_a\_ :root{--mermaid-font-family:inherit;}

完成

Agent/LLM

推理

行动: 调用工具

观察: 工具结果

输出

它让 Agent 在每一步都能“思考-行动-观察”，从而解决复杂问题。

**在 LangGraph 中的实现思路**：

-   `reasoning` 节点：分析状态，生成思考过程
-   `action` 节点：根据推理结果选择工具
-   `tool_execution` 节点：执行选定的工具
-   `observation` 节点：处理和记录工具结果
-   条件边决定继续循环还是结束

* * *

## [3 Agent 的核心组件](#3-agent-的核心组件)

### [工具调用（Tool Calling）](#工具调用tool-calling)

Agent 的手和脚。通过清晰的 `description` 和 `schema`，让 LLM 能够准确使用外部能力。

```
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
const searchTool = tool(async ({ query }) => `搜索 "${query}" 的结果...`, {
  name: 'search',
  description: '搜索相关信息',
  schema: z.object({
    query: z.string().describe('搜索查询'),
  }),
});
```

### [记忆管理（Memory）](#记忆管理memory)

-   **短期记忆**：对话历史（Messages），通过状态传递。
-   **长期记忆**：用户偏好、知识库，通过持久化存储。

### [规划能力（Planning）](#规划能力planning)

对于复杂任务，Agent 需要先分解任务，再逐个执行。

规划能力的常见步骤：

1.  接收复杂任务后先进行任务分析
2.  将大任务分解为可执行的子任务
3.  按顺序或并行执行子任务
4.  根据执行结果动态调整计划
5.  最终整合所有结果

* * *

## [4 自定义 Agent 架构](#4-自定义-agent-架构)

### [人机协作（Human-in-the-Loop）](#人机协作human-in-the-loop)

在关键节点（如转账、敏感操作）暂停，等待人工确认。LangGraph 提供了 `interrupt` 机制来实现这一点。

### [多代理系统](#多代理系统)

多个专业 Agent（如“研究员”、“撰稿人”、“审核员”）协作完成任务。

#\_r\_e\_{margin:1.5rem auto 0;}#\_r\_e\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_e\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_e\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_e\_ .error-icon{fill:#a44141;}#\_r\_e\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_e\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_e\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_e\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_e\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_e\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_e\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_e\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_e\_ .marker.cross{stroke:lightgrey;}#\_r\_e\_ svg{font-family:inherit;font-size:16px;}#\_r\_e\_ p{margin:0;}#\_r\_e\_ .label{font-family:inherit;color:#ccc;}#\_r\_e\_ .cluster-label text{fill:#F9FFFE;}#\_r\_e\_ .cluster-label span{color:#F9FFFE;}#\_r\_e\_ .cluster-label span p{background-color:transparent;}#\_r\_e\_ .label text,#\_r\_e\_ span{fill:#ccc;color:#ccc;}#\_r\_e\_ .node rect,#\_r\_e\_ .node circle,#\_r\_e\_ .node ellipse,#\_r\_e\_ .node polygon,#\_r\_e\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_e\_ .rough-node .label text,#\_r\_e\_ .node .label text,#\_r\_e\_ .image-shape .label,#\_r\_e\_ .icon-shape .label{text-anchor:middle;}#\_r\_e\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_e\_ .rough-node .label,#\_r\_e\_ .node .label,#\_r\_e\_ .image-shape .label,#\_r\_e\_ .icon-shape .label{text-align:center;}#\_r\_e\_ .node.clickable{cursor:pointer;}#\_r\_e\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_e\_ .arrowheadPath{fill:lightgrey;}#\_r\_e\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_e\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_e\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_e\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_e\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_e\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_e\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_e\_ .cluster text{fill:#F9FFFE;}#\_r\_e\_ .cluster span{color:#F9FFFE;}#\_r\_e\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_e\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_e\_ rect.text{fill:none;stroke-width:0;}#\_r\_e\_ .icon-shape,#\_r\_e\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_e\_ .icon-shape p,#\_r\_e\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_e\_ .icon-shape rect,#\_r\_e\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_e\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_e\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_e\_ :root{--mermaid-font-family:inherit;}

用户请求

协调器 Agent

分析师 Agent

执行者 Agent

审核者 Agent

需求分析

任务执行

质量检查

结果整合

最终输出

* * *

## [💡 练习题](#-练习题)

1.  **选择题**：以下哪种架构最适合处理“根据用户问题类型，转发给不同部门”的场景？
    
    -   A. ReAct 架构
    -   B. 路由器架构
    -   C. 工具调用架构
    -   D. 纯 LLM 生成
    
    点击查看答案
    
    正确答案是 **B. 路由器架构**。该场景核心是“分类后分发”，路由器模式最直接、可控。
    
2.  **分析题**：为什么工具的 `description` 对于 Tool Calling Agent 至关重要？如果描述不清晰会发生什么？
    
    点击查看答案
    
    `description` 是模型选择工具的主要语义依据，决定“何时调用、调用哪个、传什么参数”。 若描述含糊，常见问题是误选工具、漏调工具或参数构造错误，导致结果不稳定。
    

* * *

## [🧭 实践指导](#-实践指导)

### [选择合适的 Agent 架构](#选择合适的-agent-架构)

架构类型

适用场景

优点

缺点

路由器

明确分类任务、有限选项

简单可靠

控制有限

工具调用代理

需要外部 API、多步骤任务

灵活强大

需要好的工具设计

ReAct

复杂推理、多轮交互

透明可解释

可能较慢

### [Agent 设计最佳实践](#agent-设计最佳实践)

1.  **明确定义职责范围**：Agent 应该有清晰的能力边界
2.  **设计清晰的工具接口**：工具描述要准确，参数要明确
3.  **实现有效的错误处理**：预期可能的失败场景
4.  **建立合适的记忆策略**：根据需要选择短期或长期记忆
5.  **设置安全边界**：限制 Agent 的操作权限

**⚠️ 安全考虑**

在设计 Agent 时，必须考虑安全性：

-   **输入验证**：严格验证所有用户输入
-   **权限控制**：限制 Agent 的操作权限
-   **恶意防护**：防止恶意提示注入
-   **操作日志**：记录所有关键操作
-   **异常处理**：优雅处理错误和异常情况

* * *

## [📚 参考资源](#-参考资源)

### [官方文档](#官方文档)

-   [Agent 架构设计指南](https://blog.langchain.dev/what-is-a-cognitive-architecture/)
-   [ReAct 论文原文](https://arxiv.org/abs/2210.03629)

* * *

## [✅ 总结](#-总结)

**本章要点**：

-   Agent 的核心在于利用 LLM 进行动态决策。
-   从简单的路由到复杂的 ReAct 循环，架构的选择取决于业务复杂度。
-   工具调用和记忆管理是构建强大 Agent 的两大基石。

**下一步**：掌握了理论，我们需要动手实践了。下一章《环境搭建》将带你准备好开发环境。

## 相关笔记

- [[4-9 Agent 的记忆系统]]
- [[3-1 Function Calling 与 Structured Output]]
- [[2-3 Agent Loop 保险丝]]
- [[3-6 生产级权限系统的四层防线]]
- [[1-8 人机交互|人机交互（参见 Loock AI 1-8）]]
- [[MOC - LangGraph.js 教程|LangGraph.js 教程 章节索引]]
