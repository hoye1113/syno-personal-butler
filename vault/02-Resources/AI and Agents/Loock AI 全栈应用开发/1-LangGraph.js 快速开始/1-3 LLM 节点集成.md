---
title: "LLM 节点集成 — Loock AI 全栈应用开发"
tags: ["loock_ai", "langgraphjs_quickstart", "ai_agent"]
legacy_tags: ["loock_ai", "langgraphjs-quickstart", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/quick-start/03-llm-integration"
description: "将大语言模型引入你的工作流，构建智能节点"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/1-LangGraph.js 快速开始/1-3 LLM 节点集成.md"
source_sha256: "887ab56f6ac3add72a940fee0932889653a4317212b4a968a39104a6ccb9a987"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

# LLM 节点集成

将大语言模型引入你的工作流，构建智能节点

## [📚 学习目标](#-学习目标)

学完这篇文章后，你将能够：

-   在图节点中实例化和调用 **LLM**（大语言模型）
-   编写 **异步（Async）** 节点函数
-   使用 **LangChain Messages**（HumanMessage, AIMessage）与模型交互
-   实现简单的**内容生成与审核**工作流

## [前置知识](#前置知识)

在开始学习之前，建议先阅读：

-   [状态管理详解](/docs/quick-start/02-state-management)

* * *

## [1️⃣ 引入大脑：实例化 LLM](#1️⃣-引入大脑实例化-llm)

LangGraph 与 LangChain 生态完美集成。我们使用 `ChatOpenAI` 类来连接大模型。

```
import { ChatOpenAI } from '@langchain/openai';
// 实例化模型
// 这里可以使用任何兼容 OpenAI 接口的模型，如 gpt-4, qwen3-max 等
const llm = new ChatOpenAI({
    model: 'qwen3-max', // 或 'gpt-4o'
    apiKey: process.env.OPENAI_API_KEY // 通常从环境变量自动读取
});
```

## [2️⃣ 异步节点（Async Nodes）](#2️⃣-异步节点async-nodes)

调用大模型是一个网络请求过程，因此我们的节点函数必须是**异步**的 (`async/await`)。

```
import { HumanMessage } from '@langchain/core/messages';
/**
 * 输入处理节点：调用 LLM 生成内容
 */
const inputNode = async (state: typeof StateAnnotation.State) => {
    // 1. 构造消息：将输入包装为 HumanMessage
    const messages = [new HumanMessage(state.input)];
    
    // 2. 调用模型：等待响应
    const response = await llm.invoke(messages);
    
    // response.content 包含模型的回复文本
    return {
        output: response.content,
        // ...其他状态更新
    }
}
```

**代码解析**：

-   `HumanMessage`: 代表用户的输入。
-   `llm.invoke()`: 发送消息并等待模型回复。返回的是 `AIMessage` 对象。

## [3️⃣ 多节点协作：生成与审核](#3️⃣-多节点协作生成与审核)

一个常见的模式是将复杂的任务拆分为多个步骤。例如，一个节点负责生成内容，另一个节点负责审核内容。

### [生成节点](#生成节点)

```
const generationNode = async (state: typeof StateAnnotation.State) => {
    const res = await llm.invoke([new HumanMessage(state.input)]);
    return { output: res.content };
}
```

### [审核节点](#审核节点)

审核节点会将上一步的输出 (`state.output`) 作为输入，要求 LLM 进行检查。

```
const validationNode = async (state: typeof StateAnnotation.State) => {
    // 构造 prompt，将待审核内容嵌入其中
    const prompt = `请检查以下内容是否有违禁词，直接回答"有"或"没有"：${state.output}`;
    
    const res = await llm.invoke([new HumanMessage(prompt)]);
    
    return {
        validationResult: res.content
    }
}
```

### [组装图](#组装图)

```
const graph = new StateGraph(StateAnnotation)
    .addNode('generate', generationNode)
    .addNode('validate', validationNode)
    .addEdge(START, 'generate')
    .addEdge('generate', 'validate')
    .addEdge('validate', END)
    .compile();
```

下面的 Mermaid 图展示了这个流程：

#\_r\_2\_{margin:1.5rem auto 0;}#\_r\_2\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_2\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_2\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_2\_ .error-icon{fill:#a44141;}#\_r\_2\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_2\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_2\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_2\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_2\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_2\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_2\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_2\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_2\_ .marker.cross{stroke:lightgrey;}#\_r\_2\_ svg{font-family:inherit;font-size:16px;}#\_r\_2\_ p{margin:0;}#\_r\_2\_ .label{font-family:inherit;color:#ccc;}#\_r\_2\_ .cluster-label text{fill:#F9FFFE;}#\_r\_2\_ .cluster-label span{color:#F9FFFE;}#\_r\_2\_ .cluster-label span p{background-color:transparent;}#\_r\_2\_ .label text,#\_r\_2\_ span{fill:#ccc;color:#ccc;}#\_r\_2\_ .node rect,#\_r\_2\_ .node circle,#\_r\_2\_ .node ellipse,#\_r\_2\_ .node polygon,#\_r\_2\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_2\_ .rough-node .label text,#\_r\_2\_ .node .label text,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-anchor:middle;}#\_r\_2\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_2\_ .rough-node .label,#\_r\_2\_ .node .label,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-align:center;}#\_r\_2\_ .node.clickable{cursor:pointer;}#\_r\_2\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_2\_ .arrowheadPath{fill:lightgrey;}#\_r\_2\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_2\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_2\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_2\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_2\_ .cluster text{fill:#F9FFFE;}#\_r\_2\_ .cluster span{color:#F9FFFE;}#\_r\_2\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_2\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_2\_ rect.text{fill:none;stroke-width:0;}#\_r\_2\_ .icon-shape,#\_r\_2\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .icon-shape p,#\_r\_2\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_2\_ .icon-shape rect,#\_r\_2\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_2\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_2\_ :root{--mermaid-font-family:inherit;}

生成的文本

审核结果

START

生成节点

审核节点

END

## [💡 练习题](#-练习题)

1.  **修改题**：修改 `validationNode`，如果审核通过，在 `output` 后面追加 " \[Verified\]"；如果审核不通过，将其清空。
2.  **思考**：为什么我们要把生成和审核分开成两个节点，而不是在一个节点里做完？（参考答案：模块化、更清晰的逻辑分离、方便独立测试和调试、更好的容错性）。

* * *

## [📚 参考资源](#-参考资源)

### [项目代码](#项目代码)

-   查看本节完整代码：[quick-start/3.nodes.ts](https://github.com/loock-ai/langgraphjs-course-code/blob/main/quick-start/3.nodes.ts)

* * *

## [✅ 总结](#-总结)

**核心要点**：

-   节点函数可以是 `async` 的，这使得网路请求（如 LLM 调用）成为可能。
-   使用 `HumanMessage` 和 `AIMessage` 等结构化对象与模型交互。
-   通过链式组合多个 LLM 节点，可以构建复杂的处理流水线（Pipeline）。

**下一步**：目前的图都是线性执行的。在下一篇文章《流程控制与路由》中，我们将学习如何根据条件让图走不同的路径，甚至实现循环和并行执行。

## 相关笔记

- [[MOC - LangGraph.js 快速开始|LangGraph.js 快速开始 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
