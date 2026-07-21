---
title: "工具调用与 Agent — Loock AI 全栈应用开发"
tags: ["loock_ai", "langgraphjs_quickstart", "ai_agent"]
legacy_tags: ["loock_ai", "langgraphjs-quickstart", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/quick-start/06-tool-calling"
description: "构建真正的智能体：让 LLM 学会使用工具（Tool Calling）"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/1-LangGraph.js 快速开始/1-6 工具调用与 Agent.md"
source_sha256: "bd722d03060e6767eca0ac56dfeb65016cffda90a25608a455b3d05308178568"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

# 工具调用与 Agent

构建真正的智能体：让 LLM 学会使用工具（Tool Calling）

## [📚 学习目标](#-学习目标)

学完这篇文章后，你将能够：

-   使用 `@langchain/core/tools` 定义**自定义工具**
-   使用 `bindTools` 将工具能力赋予 LLM
-   使用预构建的 **ToolNode** 执行工具调用
-   复现经典的 **ReAct**（Reasoning + Acting）Agent 模式

## [前置知识](#前置知识)

在开始学习之前，建议先阅读：

-   [基础图结构](/docs/quick-start/01-basic-graph)
-   [LLM 节点集成](/docs/quick-start/03-llm-integration)

* * *

## [1️⃣ 什么是 Agent？](#1️⃣-什么是-agent)

简单来说，Agent = LLM + Tools + Loop。

1.  **LLM** 负责思考：理解用户意图，决定是否需要使用工具，以及使用哪个工具。
2.  **Tools** 负责行动：执行具体任务（查天气、算数学、搜网页）。
3.  **Loop** 负责循环：思考 → 行动 → 再思考 → 再行动，直到任务完成。

## [2️⃣ 定义工�� (Define Tools)](#2️⃣-定义工具-define-tools)

我们使用 `tool` 函数和 `zod` schema 来定义工具。Schema 非常重要，因为它告诉 LLM 该如何正确调用这个工具。

```
import { tool } from "@langchain/core/tools";
import z from "zod";
// 定义天气查询工具
const getWeather = tool(
    async (input) => {
        // 工具实现的实际逻辑（例如调用 API）
        return `查询结果：${input.city} 今天晴，25°C`;
    },
    {
        name: 'getWeather',
        description: '获取指定城市的天气',
        // 参数 Schema
        schema: z.object({
            city: z.string().describe('城市名称，如北京'),
        })
    }
);
const tools = [getWeather];
```

## [3️⃣ 赋予 LLM 工具能力](#3️⃣-赋予-llm-工具能力)

LangChain 提供了 `bindTools` 方法，将工具定义转换为 LLM 能理解的 JSON Schema 格式。

```
// 1. 实例化 LLM
const llm = new ChatOpenAI({ model: 'qwen3-max' });
// 2. 绑定工具
const llmWithTools = llm.bindTools(tools);
// 3. 节点逻辑
const agentNode = async (state) => {
    // LLM 会智能决定是返回普通文本，还是返回工具调用请求
    const result = await llmWithTools.invoke(state.messages);
    return { messages: [result] };
}
```

## [4️⃣ 执行工具调用 (ToolNode)](#4️⃣-执行工具调用-toolnode)

LangGraph 提供了一个预构建的节点 `ToolNode`，它能自动解析 LLM 的工具调用请求，执行对应的工具，并将结果返回。

```
import { ToolNode } from '@langchain/langgraph/prebuilt';
const toolNode = new ToolNode(tools);
```

## [5️⃣ 构建 ReAct 循环](#5️⃣-构建-react-循环)

我们需要一个条件路由逻辑：

-   如果 LLM 想要调用工具 (`tool_calls`) → 去 `tools` 节点。
-   如果 LLM 只是普通回复 → 结束。

```
// 路由函数
const shouldContinue = (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    
    // 检查是否有工具调用请求
    if (lastMessage.tool_calls?.length) {
        return 'tools';
    }
    return END;
}
// 构建图
const graph = new StateGraph(StateAnnotation)
    .addNode('agent', agentNode)
    .addNode('tools', toolNode)
    
    .addEdge(START, 'agent')
    
    // 条件边
    .addConditionalEdges('agent', shouldContinue, {
        tools: 'tools',
        [END]: END
    })
    
    // 工具执行完后，必须回到 agent 节点，让 LLM 看到结果并继续思考
    .addEdge('tools', 'agent') 
    
    .compile();
```

下面的 Mermaid 图展示了这个经典的循环：

#\_r\_2\_{margin:1.5rem auto 0;}#\_r\_2\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_2\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_2\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_2\_ .error-icon{fill:#a44141;}#\_r\_2\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_2\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_2\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_2\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_2\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_2\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_2\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_2\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_2\_ .marker.cross{stroke:lightgrey;}#\_r\_2\_ svg{font-family:inherit;font-size:16px;}#\_r\_2\_ p{margin:0;}#\_r\_2\_ .label{font-family:inherit;color:#ccc;}#\_r\_2\_ .cluster-label text{fill:#F9FFFE;}#\_r\_2\_ .cluster-label span{color:#F9FFFE;}#\_r\_2\_ .cluster-label span p{background-color:transparent;}#\_r\_2\_ .label text,#\_r\_2\_ span{fill:#ccc;color:#ccc;}#\_r\_2\_ .node rect,#\_r\_2\_ .node circle,#\_r\_2\_ .node ellipse,#\_r\_2\_ .node polygon,#\_r\_2\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_2\_ .rough-node .label text,#\_r\_2\_ .node .label text,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-anchor:middle;}#\_r\_2\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_2\_ .rough-node .label,#\_r\_2\_ .node .label,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-align:center;}#\_r\_2\_ .node.clickable{cursor:pointer;}#\_r\_2\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_2\_ .arrowheadPath{fill:lightgrey;}#\_r\_2\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_2\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_2\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_2\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_2\_ .cluster text{fill:#F9FFFE;}#\_r\_2\_ .cluster span{color:#F9FFFE;}#\_r\_2\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_2\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_2\_ rect.text{fill:none;stroke-width:0;}#\_r\_2\_ .icon-shape,#\_r\_2\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .icon-shape p,#\_r\_2\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_2\_ .icon-shape rect,#\_r\_2\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_2\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_2\_ :root{--mermaid-font-family:inherit;}

Yes

No

START

Agent/LLM

需要工具?

ToolNode

END

## [💡 练习题](#-练习题)

1.  **实操题**：向你的 Agent 添加一个 `calculate` 工具（可以使用 JavaScript 的 `eval` 或 `mathjs`），试着问它："北京的天气怎么样？然后计算 123 \* 456 是多少？"。观察它是否能连续调用两个工具。
2.  **思考**：`ToolNode` 执行完具后，为什么要连回 `agent` 节点？如果连向 `END` 会发生什么？（参考答案：连回 agent 是为了让 LLM 能够基于工具的返回结果生成最终的自然语言回复，或者决定是否需要进行下一步操作。直接连向 END 会导致用户只看到工具的原始输出，而不是 LLM 的解读。）

* * *

## [📚 参考资源](#-参考资源)

### [官方文档](#官方文档)

-   [LangGraph Prebuilt ToolNode](https://langchain-ai.github.io/langgraphjs/reference/classes/prebuilt.ToolNode.html)

### [项目代码](#项目代码)

-   查看本节完整代码：[quick-start/6.tools.ts](https://github.com/loock-ai/langgraphjs-course-code/blob/main/quick-start/6.tools.ts)

* * *

## [✅ 总结](#-总结)

**核心要点**：

-   **Schema** 定义了一切：工具的描述和参数定义决定了 LLM 能否正确使用它。
-   **bindTools** 是链接 LLM 和代码实现的桥梁。
-   **ReAct 循环**（Agent → Tools → Agent）是现代 AI Agent 的基石。

**下一步**：在下一篇文章《记忆与持久化》中，我们将学习如何让 Agent 记住上下文，实现多轮连续对话。

## 相关笔记

- [[4-9 Agent 的记忆系统]]
- [[3-1 Function Calling 与 Structured Output]]
- [[2-3 Agent Loop 保险丝]]
- [[MOC - LangGraph.js 快速开始|LangGraph.js 快速开始 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
