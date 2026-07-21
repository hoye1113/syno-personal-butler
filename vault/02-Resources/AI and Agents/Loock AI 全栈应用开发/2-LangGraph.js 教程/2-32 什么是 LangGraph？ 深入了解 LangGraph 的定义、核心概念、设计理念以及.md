---
title: "什么是 LangGraph？ — Loock AI 全栈应用开发"
tags: ["loock_ai", "langgraphjs_tutorial", "ai_agent"]
legacy_tags: ["loock_ai", "langgraphjs-tutorial", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/langgraphjs/01-introduction/02-why-langgraph"
description: "深入了解 LangGraph 的定义、核心概念、设计理念以及它解决的核心问题"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/2-LangGraph.js 教程/2-32 什么是 LangGraph？ 深入了解 LangGraph 的定义、核心概念、设计理念以及它解决的核心问题.md"
source_sha256: "6e6a0533c8222f84b0f9c6f63ac36cc064641a2ad90da9dfcd3df179b2e578ff"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

前言

# 什么是 LangGraph？

深入了解 LangGraph 的定义、核心概念、设计理念以及它解决的核心问题

## [📚 学习目标](#-学习目标)

学完这篇文章后，你将能够：

-   理解 LangGraph 的定义和核心理念
-   理解传统 LLM 应用面临的挑战
-   掌握 LangGraph 的核心构建块（状态、节点、边、图）
-   掌握 LangGraph 的核心优势（可控性、持久化等）
-   对比 LangGraph 架构与传统链式架构的区别
-   识别适合使用 LangGraph 的实际场景

## [前置知识](#前置知识)

在开始学习之前，建议先阅读：

-   [01-ai-apps-and-langgraphjs](./01-ai-apps-and-langgraphjs)

你需要了解：

-   LLM（大语言模型）的基本工作原理
-   基本的编程逻辑和流程控制
-   基本的 JavaScript/TypeScript 语法

* * *

## [1 LangGraph 的定义](#1-langgraph-的定义)

### [引言](#引言)

在构建智能应用的过程中，我们经常需要让 AI 系统能够自主决策、动态调整执行路径。传统的链式结构虽然可靠，但缺乏灵活性。LangGraph 正是为了解决这一问题而诞生的框架。

### [核心概念](#核心概念)

**LangGraph** 是一个用于构建智能代理（Agent）应用的 JavaScript/TypeScript 框架。它将 LLM 应用的控制流程建模为**图结构**，其中：

-   **节点（Nodes）** 代表不同的功能组件
-   **边（Edges）** 代表信息流和控制流
-   **状态（State）** 代表应用的当前快照

**💡 核心理念**

LangGraph 的核心理念是让 LLM 能够**自主决定**应用的执行路径，而不是按照预定义的固定步骤执行。

### [核心构建块](#核心构建块)

#### [1\. 状态（State）](#1-状态state)

状态是贯穿整个图执行过程的数据容器。它记录了：

-   用户输入
-   对话历史
-   工具调用结果
-   中间计算结果

```
// 定义状态结构
import { Annotation } from '@langchain/langgraph';
const StateAnnotation = Annotation.Root({
  messages: Annotation<string[]>({
    reducer: (prev, next) => [...prev, ...next],
  }),
  userQuery: Annotation<string>(),
  toolResults: Annotation<any[]>({
    reducer: (prev, next) => [...prev, ...next],
  }),
});
```

> \[!NOTE\] 状态在整个图的执行过程中被持久化维护，这是实现多轮对话和复杂逻辑的关键。

#### [2\. 节点（Nodes）](#2-节点nodes)

节点是执行具体逻辑的函数单元。每个节点：

-   接收当前状态作为输入
-   执行特定逻辑（如调用 LLM、调用工具）
-   返回状态更新

```
// 示例：分析用户查询的节点
async function analyzeQuery(state: typeof StateAnnotation.State) {
  const { userQuery } = state;
  // 调用 LLM 分析用户意图
  const analysis = await llm.invoke([
    { role: 'system', content: '分析用户查询的复杂度' },
    { role: 'user', content: userQuery },
  ]);
  // 返回状态更新
  return {
    messages: [analysis.content],
    complexity: analysis.metadata?.complexity || 'simple',
  };
}
// 示例：处理简单查询的节点
async function handleSimpleQuery(state: typeof StateAnnotation.State) {
  const { userQuery } = state;
  const response = await llm.invoke([{ role: 'user', content: userQuery }]);
  return {
    messages: [response.content],
  };
}
```

#### [3\. 边（Edges）](#3-边edges)

边定义了节点之间的连接关系，分为两种：

**普通边（Normal Edges）**：固定的连接关系

```
graph.addEdge('nodeA', 'nodeB'); // nodeA 执行完后总是进入 nodeB
```

**条件边（Conditional Edges）**：基于状态动态决定下一步

```
// 路由函数：根据复杂度决定下一个节点
function routeBasedOnComplexity(state: typeof StateAnnotation.State) {
  if (state.complexity === 'simple') {
    return 'simple_responder';
  } else if (state.complexity === 'tool_required') {
    return 'tool_caller';
  } else {
    return 'complex_reasoner';
  }
}
graph.addConditionalEdges('analyzer', routeBasedOnComplexity);
```

#### [4\. 图（Graph）](#4-图graph)

图是所有组件的容器，负责编排执行流程。

```
import { StateGraph, START, END } from '@langchain/langgraph';
const graph = new StateGraph(StateAnnotation)
  // 添加节点
  .addNode('analyzer', analyzeQuery)
  .addNode('simple_responder', handleSimpleQuery)
  .addNode('tool_caller', callExternalTool)
  .addNode('complex_reasoner', handleComplexReasoning)
  // 定义边
  .addEdge(START, 'analyzer')
  .addConditionalEdges('analyzer', routeBasedOnComplexity)
  .addEdge('simple_responder', END)
  .addEdge('tool_caller', END)
  .addEdge('complex_reasoner', END)
  // 编译成可执行的应用
  .compile();
// 执行
const result = await graph.invoke({
  userQuery: '什么是 LangGraph？',
});
```

* * *

## [2 传统 LLM 应用的挑战](#2-传统-llm-应用的挑战)

随着 LLM 技术的快速发展，开发者们发现传统的应用架构已经无法满足智能应用的复杂需求。

### [控制流固化问题](#控制流固化问题)

传统的 LLM 应用通常采用链式结构，执行路径是预先定义的：

#\_r\_4\_{margin:1.5rem auto 0;}#\_r\_4\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_4\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_4\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_4\_ .error-icon{fill:#a44141;}#\_r\_4\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_4\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_4\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_4\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_4\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_4\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_4\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_4\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_4\_ .marker.cross{stroke:lightgrey;}#\_r\_4\_ svg{font-family:inherit;font-size:16px;}#\_r\_4\_ p{margin:0;}#\_r\_4\_ .label{font-family:inherit;color:#ccc;}#\_r\_4\_ .cluster-label text{fill:#F9FFFE;}#\_r\_4\_ .cluster-label span{color:#F9FFFE;}#\_r\_4\_ .cluster-label span p{background-color:transparent;}#\_r\_4\_ .label text,#\_r\_4\_ span{fill:#ccc;color:#ccc;}#\_r\_4\_ .node rect,#\_r\_4\_ .node circle,#\_r\_4\_ .node ellipse,#\_r\_4\_ .node polygon,#\_r\_4\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_4\_ .rough-node .label text,#\_r\_4\_ .node .label text,#\_r\_4\_ .image-shape .label,#\_r\_4\_ .icon-shape .label{text-anchor:middle;}#\_r\_4\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_4\_ .rough-node .label,#\_r\_4\_ .node .label,#\_r\_4\_ .image-shape .label,#\_r\_4\_ .icon-shape .label{text-align:center;}#\_r\_4\_ .node.clickable{cursor:pointer;}#\_r\_4\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_4\_ .arrowheadPath{fill:lightgrey;}#\_r\_4\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_4\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_4\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_4\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_4\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_4\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_4\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_4\_ .cluster text{fill:#F9FFFE;}#\_r\_4\_ .cluster span{color:#F9FFFE;}#\_r\_4\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_4\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_4\_ rect.text{fill:none;stroke-width:0;}#\_r\_4\_ .icon-shape,#\_r\_4\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_4\_ .icon-shape p,#\_r\_4\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_4\_ .icon-shape rect,#\_r\_4\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_4\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_4\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_4\_ :root{--mermaid-font-family:inherit;}

用户输入

预处理

LLM 调用

后处理

输出结果

**问题表现：**

-   🔒 **路径固定**：无论用户输入什么，都按相同步骤执行
-   🚫 **缺乏适应性**：无法根据上下文动态调整策略
-   ⚡ **效率低下**：即使简单问题也要走完整流程
-   🔄 **难以扩展**：添加新功能需要重构整个流程

### [复杂任务处理困难](#复杂任务处理困难)

现实世界的任务往往需要多步骤协调：

#### [传统方式的问题](#传统方式的问题)

```
// 传统链式处理复杂任务的问题
async function traditionalApproach(userQuery: string) {
  // 步骤1：总是先调用 LLM
  const analysis = await llm.invoke(userQuery);
  // 步骤2：总是尝试工具调用（即使不需要）
  const toolResult = await callTool(analysis);
  // 步骤3：总是进行最终处理
  const finalResult = await llm.invoke(`${analysis} ${toolResult}`);
  return finalResult;
}
```

**问题：**

-   浪费资源在不必要的步骤上
-   无法处理需要多轮交互的复杂任务
-   错误处理困难

#### [LangGraph 的解决方案](#langgraph-的解决方案)

```
// LangGraph 动态处理复杂任务
const smartAgent = new StateGraph(StateAnnotation)
  .addNode('analyzer', analyzeQuery)
  .addNode('simple_responder', handleSimpleQuery)
  .addNode('tool_caller', callExternalTool)
  .addNode('complex_reasoner', handleComplexReasoning)
  .addConditionalEdges('analyzer', routeBasedOnComplexity)
  .compile();
```

**优势：**

-   根据任务复杂度选择合适路径
-   支持多轮交互和状态维护
-   优雅的错误处理和恢复

### [状态管理缺失](#状态管理缺失)

传统应用难以维护对话历史和上下文，容易导致“状态丢失”，使得多轮对话变得困难，且无法准确基于之前的交互进行推理。

* * *

## [3 LangGraph 的核心优势](#3-langgraph-的核心优势)

### [1\. 可控性（Controllability）](#1-可控性controllability)

LangGraph 让开发者能够精确控制应用流程：

#\_r\_6\_{margin:1.5rem auto 0;}#\_r\_6\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_6\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_6\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_6\_ .error-icon{fill:#a44141;}#\_r\_6\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_6\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_6\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_6\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_6\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_6\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_6\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_6\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_6\_ .marker.cross{stroke:lightgrey;}#\_r\_6\_ svg{font-family:inherit;font-size:16px;}#\_r\_6\_ p{margin:0;}#\_r\_6\_ .label{font-family:inherit;color:#ccc;}#\_r\_6\_ .cluster-label text{fill:#F9FFFE;}#\_r\_6\_ .cluster-label span{color:#F9FFFE;}#\_r\_6\_ .cluster-label span p{background-color:transparent;}#\_r\_6\_ .label text,#\_r\_6\_ span{fill:#ccc;color:#ccc;}#\_r\_6\_ .node rect,#\_r\_6\_ .node circle,#\_r\_6\_ .node ellipse,#\_r\_6\_ .node polygon,#\_r\_6\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_6\_ .rough-node .label text,#\_r\_6\_ .node .label text,#\_r\_6\_ .image-shape .label,#\_r\_6\_ .icon-shape .label{text-anchor:middle;}#\_r\_6\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_6\_ .rough-node .label,#\_r\_6\_ .node .label,#\_r\_6\_ .image-shape .label,#\_r\_6\_ .icon-shape .label{text-align:center;}#\_r\_6\_ .node.clickable{cursor:pointer;}#\_r\_6\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_6\_ .arrowheadPath{fill:lightgrey;}#\_r\_6\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_6\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_6\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_6\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_6\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_6\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_6\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_6\_ .cluster text{fill:#F9FFFE;}#\_r\_6\_ .cluster span{color:#F9FFFE;}#\_r\_6\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_6\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_6\_ rect.text{fill:none;stroke-width:0;}#\_r\_6\_ .icon-shape,#\_r\_6\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_6\_ .icon-shape p,#\_r\_6\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_6\_ .icon-shape rect,#\_r\_6\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_6\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_6\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_6\_ :root{--mermaid-font-family:inherit;}

用户输入

智能路由

任务类型判断

简单问答路径

工具调用路径

复杂推理路径

快速响应

工具执行

多步推理

结果整合

最终输出

**关键特性：**

-   🎛️ **精确控制**：开发者定义每个节点的行为
-   🔀 **灵活路由**：基于状态和条件的动态路径选择
-   🛡️ **错误处理**：内置的异常处理和恢复机制

### [2\. 持久化（Persistence）](#2-持久化persistence)

支持状态保存和恢复，实现真正的记忆能力。

> \[!NOTE\] 想象一个客服机器人，它能记住用户的历史问题、偏好以及当前的上下文，这就是持久化带来的威力！

**(代码示例省略，请在后续章节查看详细实现)**

### [3\. 人机交互（Human-in-the-Loop）](#3-人机交互human-in-the-loop)

支持在关键决策点暂停，等待人工干预。这对于敏感操作或需要人工确认的场景至关重要。

### [4\. 流式处理（Streaming）](#4-流式处理streaming)

实时输出和响应，提升用户体验，避免用户长时间等待完整响应。

* * *

## [4 执行流程可视化](#4-执行流程可视化)

下面的序列图展示了 LangGraph 应用的典型执行流程：

工具LLMLangGraph用户工具LLMLangGraph用户#\_r\_9\_{margin:1.5rem auto 0;}#\_r\_9\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_9\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_9\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_9\_ .error-icon{fill:#a44141;}#\_r\_9\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_9\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_9\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_9\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_9\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_9\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_9\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_9\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_9\_ .marker.cross{stroke:lightgrey;}#\_r\_9\_ svg{font-family:inherit;font-size:16px;}#\_r\_9\_ p{margin:0;}#\_r\_9\_ .actor{stroke:#ccc;fill:#1f2020;}#\_r\_9\_ text.actor>tspan{fill:lightgrey;stroke:none;}#\_r\_9\_ .actor-line{stroke:#ccc;}#\_r\_9\_ .innerArc{stroke-width:1.5;stroke-dasharray:none;}#\_r\_9\_ .messageLine0{stroke-width:1.5;stroke-dasharray:none;stroke:lightgrey;}#\_r\_9\_ .messageLine1{stroke-width:1.5;stroke-dasharray:2,2;stroke:lightgrey;}#\_r\_9\_ #arrowhead path{fill:lightgrey;stroke:lightgrey;}#\_r\_9\_ .sequenceNumber{fill:black;}#\_r\_9\_ #sequencenumber{fill:lightgrey;}#\_r\_9\_ #crosshead path{fill:lightgrey;stroke:lightgrey;}#\_r\_9\_ .messageText{fill:lightgrey;stroke:none;}#\_r\_9\_ .labelBox{stroke:#ccc;fill:#1f2020;}#\_r\_9\_ .labelText,#\_r\_9\_ .labelText>tspan{fill:lightgrey;stroke:none;}#\_r\_9\_ .loopText,#\_r\_9\_ .loopText>tspan{fill:lightgrey;stroke:none;}#\_r\_9\_ .loopLine{stroke-width:2px;stroke-dasharray:2,2;stroke:#ccc;fill:#ccc;}#\_r\_9\_ .note{stroke:hsl(180, 0%, 18.3529411765%);fill:hsl(180, 1.5873015873%, 28.3529411765%);}#\_r\_9\_ .noteText,#\_r\_9\_ .noteText>tspan{fill:rgb(183.8476190475, 181.5523809523, 181.5523809523);stroke:none;}#\_r\_9\_ .activation0{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:#ccc;}#\_r\_9\_ .activation1{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:#ccc;}#\_r\_9\_ .activation2{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:#ccc;}#\_r\_9\_ .actorPopupMenu{position:absolute;}#\_r\_9\_ .actorPopupMenuPanel{position:absolute;fill:#1f2020;box-shadow:0px 8px 16px 0px rgba(0,0,0,0.2);filter:drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4));}#\_r\_9\_ .actor-man line{stroke:#ccc;fill:#1f2020;}#\_r\_9\_ .actor-man circle,#\_r\_9\_ line{stroke:#ccc;fill:#1f2020;stroke-width:2px;}#\_r\_9\_ :root{--mermaid-font-family:inherit;}alt\[需要工具调用\]\[直接回答\]整个过程中维护状态输入查询分析用户意图返回分析结果执行工具调用返回工具结果基于工具结果生成回答返回最终回答直接生成回答返回回答返回结果

关键点：

-   状态在整个执行过程中被维护和传递
-   LLM 可以在决策节点决定执行路径
-   循环和分支都是自然支持的

* * *

## [5 架构对比分析](#5-架构对比分析)

### [传统架构 vs LangGraph 架构](#传统架构-vs-langgraph-架构)

特性

传统链式架构

LangGraph 架构

**控制流**

固定、线性

动态、图状

**决策能力**

预定义逻辑

LLM 自主决策

**状态管理**

无状态或简单状态

复杂状态管理

**错误处理**

基础异常处理

智能错误恢复

**扩展性**

难以扩展

高度可扩展

**调试能力**

有限

强大的可视化调试

* * *

## [6 实际应用场景与实践指导](#6-实际应用场景与实践指导)

### [典型场景](#典型场景)

-   **智能客服系统**：处理复杂多变的用户请求，支持多轮对话和状态记忆。
-   **代码生成助手**：理解需求、生成代码、自我审查和优化。

### [何时选择 LangGraph？](#何时选择-langgraph)

**适合使用 LangGraph 的场景：**

-   ✅ 需要动态决策的应用
-   ✅ 复杂的多步骤任务
-   ✅ 需要状态管理的对话系统
-   ✅ 人机协作的工作流
-   ✅ 需要工具调用的智能代理

**继续使用传统方式的场景：**

-   ✅ 简单的单步处理任务
-   ✅ 高度可预测的业务流程
-   ✅ 对性能要求极高的场景

* * *

## [💡 练习题](#-练习题)

1.  **选择题**：LangGraph 中的节点函数通常返回什么？
    
    -   A. 完整的全新状态对象
    -   B. 部分状态更新对象
    -   C. 布尔值
    -   D. 空值
    
    点击查看答案
    
    正确答案是 **B. 部分状态更新对象**。 节点通常返回增量更新，再由 reducer 合并进全局状态。
    
2.  **选择题**：LangGraph 相比传统链式架构的优势不包括：
    
    -   A. 动态控制流
    -   B. 内置的 AI 模型训练功能
    -   C. 状态持久化
    -   D. 人机交互支持
    
    点击查看答案
    
    正确答案是 **B. 内置的 AI 模型训练功能**。 LangGraph 关注编排与执行，不负责训练基础模型。
    
3.  **思考题**：如果你的应用只是简单地将用户输入发送给 LLM 并直接返回结果，是否需要使用 LangGraph？为什么？
    
    点击查看答案
    
    通常不需要。单轮问答用直接 LLM 调用更轻量。 当你需要多步骤流程、状态管理、重试/中断/持久化时，再引入 LangGraph 更合适。
    
4.  **分析题**：在上面的"执行流程可视化"流程图中，状态是在哪里被维护的？这与无状态的 API 调用有什么本质区别？
    
    点击查看答案
    
    状态由 Graph 的 State + reducer 维护，并可跨节点、跨轮次持续存在。 无状态 API 每次请求互相独立，不会天然继承上一次执行上下文。
    

* * *

## [📚 参考资源](#-参考资源)

### [官方文档](#官方文档)

-   [LangGraph JS 官方文档](https://langchain-ai.github.io/langgraphjs/)

### [示例代码](#示例代码)

-   [LangGraph Examples](https://github.com/langchain-ai/langgraphjs/tree/main/examples)

* * *

## [✅ 总结](#-总结)

**本章要点**：

-   **LangGraph 的核心概念**：将应用流程建模为图结构（状态、节点、边、图），提供了比传统链式结构更高的灵活性。
-   **传统架构的挑战**：控制流固化、状态管理缺失、复杂任务处理困难。
-   **LangGraph 的核心优势**：可控性、持久化、人机交互和流式处理。
-   **架构对比**：灵活性 vs 可预测性，动态控制流 vs 固定路径。
-   **技术选型**：选择架构时应根据任务的复杂度和需求进行权衡。

**下一步**：在下一篇文章中，我们将详细拆解《核心概念》，深入每个组件的具体用法。

## 相关笔记

- [[4-9 Agent 的记忆系统]]
- [[3-1 Function Calling 与 Structured Output]]
- [[2-1 流式响应工程真相]]
- [[1-8 人机交互|人机交互（参见 Loock AI 1-8）]]
- [[MOC - LangGraph.js 教程|LangGraph.js 教程 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
