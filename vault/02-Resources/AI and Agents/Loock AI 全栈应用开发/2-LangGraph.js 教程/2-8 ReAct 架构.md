---
title: "ReAct 架构 — Loock AI 全栈应用开发"
tags: ["loock_ai", "langgraphjs_tutorial", "ai_agent"]
legacy_tags: ["loock_ai", "langgraphjs-tutorial", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/langgraphjs/04-architecture/01-react-architecture"
description: "深入理解 ReAct 架构原理，掌握使用预构建代理和自定义实现的方法"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/2-LangGraph.js 教程/2-8 ReAct 架构.md"
source_sha256: "ed4a2a501cb1f5dad7afe7b7b59aee451b38abf2a3489919d7502bbd07d6348a"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

架构模式

# ReAct 架构

深入理解 ReAct 架构原理，掌握使用预构建代理和自定义实现的方法

## [📚 学习目标](#-学习目标)

学完这篇文章后，你将能够：

-   理解 ReAct (Reasoning and Acting) 的核心设计理念
-   使用 `createAgent` 快速构建智能代理
-   手动构建自定义的 ReAct 循环以获得更细粒度的控制
-   实现具备工具调用能力的流式对话代理

## [前置知识](#前置知识)

在开始学习之前，建议先阅读：

-   [04-edges](../03-components/04-edges)

你需要了解：

-   ReAct 论文(Optionally)的基本概念：LLM 在执行任务时交替进行思考（Reasoning）和行动（Acting）

* * *

## [1 什么是 ReAct？](#1-什么是-react)

**ReAct** = **Re**asoning（推理）+ **Act**ing（行动）。

它解决了纯 LLM 的两个核心问题：

1.  **幻觉**：LLM 可能会编造事实，而 ReAct 允许它通过工具获取真实信息。
2.  **错误传播**：单次推理容易出错，ReAct 允许它观察行动结果并修正计划。

### [执行流程循环](#执行流程循环)

#\_r\_1\_{margin:1.5rem auto 0;}#\_r\_1\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_1\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_1\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_1\_ .error-icon{fill:#a44141;}#\_r\_1\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_1\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_1\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_1\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_1\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_1\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_1\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_1\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_1\_ .marker.cross{stroke:lightgrey;}#\_r\_1\_ svg{font-family:inherit;font-size:16px;}#\_r\_1\_ p{margin:0;}#\_r\_1\_ .label{font-family:inherit;color:#ccc;}#\_r\_1\_ .cluster-label text{fill:#F9FFFE;}#\_r\_1\_ .cluster-label span{color:#F9FFFE;}#\_r\_1\_ .cluster-label span p{background-color:transparent;}#\_r\_1\_ .label text,#\_r\_1\_ span{fill:#ccc;color:#ccc;}#\_r\_1\_ .node rect,#\_r\_1\_ .node circle,#\_r\_1\_ .node ellipse,#\_r\_1\_ .node polygon,#\_r\_1\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_1\_ .rough-node .label text,#\_r\_1\_ .node .label text,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-anchor:middle;}#\_r\_1\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_1\_ .rough-node .label,#\_r\_1\_ .node .label,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-align:center;}#\_r\_1\_ .node.clickable{cursor:pointer;}#\_r\_1\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_1\_ .arrowheadPath{fill:lightgrey;}#\_r\_1\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_1\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_1\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_1\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_1\_ .cluster text{fill:#F9FFFE;}#\_r\_1\_ .cluster span{color:#F9FFFE;}#\_r\_1\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_1\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_1\_ rect.text{fill:none;stroke-width:0;}#\_r\_1\_ .icon-shape,#\_r\_1\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .icon-shape p,#\_r\_1\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_1\_ .icon-shape rect,#\_r\_1\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_1\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_1\_ :root{--mermaid-font-family:inherit;}

是

否

用户输入

思考: 分析问题

需要工具?

行动: 调用工具

观察: 获取结果

回答: 最终结果

结束

### [交互时序（ReAct 循环）](#交互时序react-循环)

下面用时序图更直观地展示“推理→行动→观察”的往复过程：

工具集合语言模型ReAct 代理用户工具集合语言模型ReAct 代理用户#\_r\_2\_{margin:1.5rem auto 0;}#\_r\_2\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_2\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_2\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_2\_ .error-icon{fill:#a44141;}#\_r\_2\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_2\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_2\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_2\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_2\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_2\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_2\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_2\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_2\_ .marker.cross{stroke:lightgrey;}#\_r\_2\_ svg{font-family:inherit;font-size:16px;}#\_r\_2\_ p{margin:0;}#\_r\_2\_ .actor{stroke:#ccc;fill:#1f2020;}#\_r\_2\_ text.actor>tspan{fill:lightgrey;stroke:none;}#\_r\_2\_ .actor-line{stroke:#ccc;}#\_r\_2\_ .innerArc{stroke-width:1.5;stroke-dasharray:none;}#\_r\_2\_ .messageLine0{stroke-width:1.5;stroke-dasharray:none;stroke:lightgrey;}#\_r\_2\_ .messageLine1{stroke-width:1.5;stroke-dasharray:2,2;stroke:lightgrey;}#\_r\_2\_ #arrowhead path{fill:lightgrey;stroke:lightgrey;}#\_r\_2\_ .sequenceNumber{fill:black;}#\_r\_2\_ #sequencenumber{fill:lightgrey;}#\_r\_2\_ #crosshead path{fill:lightgrey;stroke:lightgrey;}#\_r\_2\_ .messageText{fill:lightgrey;stroke:none;}#\_r\_2\_ .labelBox{stroke:#ccc;fill:#1f2020;}#\_r\_2\_ .labelText,#\_r\_2\_ .labelText>tspan{fill:lightgrey;stroke:none;}#\_r\_2\_ .loopText,#\_r\_2\_ .loopText>tspan{fill:lightgrey;stroke:none;}#\_r\_2\_ .loopLine{stroke-width:2px;stroke-dasharray:2,2;stroke:#ccc;fill:#ccc;}#\_r\_2\_ .note{stroke:hsl(180, 0%, 18.3529411765%);fill:hsl(180, 1.5873015873%, 28.3529411765%);}#\_r\_2\_ .noteText,#\_r\_2\_ .noteText>tspan{fill:rgb(183.8476190475, 181.5523809523, 181.5523809523);stroke:none;}#\_r\_2\_ .activation0{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:#ccc;}#\_r\_2\_ .activation1{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:#ccc;}#\_r\_2\_ .activation2{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:#ccc;}#\_r\_2\_ .actorPopupMenu{position:absolute;}#\_r\_2\_ .actorPopupMenuPanel{position:absolute;fill:#1f2020;box-shadow:0px 8px 16px 0px rgba(0,0,0,0.2);filter:drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4));}#\_r\_2\_ .actor-man line{stroke:#ccc;fill:#1f2020;}#\_r\_2\_ .actor-man circle,#\_r\_2\_ line{stroke:#ccc;fill:#1f2020;stroke-width:2px;}#\_r\_2\_ :root{--mermaid-font-family:inherit;}alt\[需要工具\]\[无需工具\]loop\[ReAct 循环\]提出问题发送状态与历史推理结果/工具调用意图调用工具返回结果观察结果并更新状态最终回答

**💡 理解要点**

-   ReAct 的关键不是“调用工具”，而是 **让模型在每一步都有机会纠错**。
-   只要工具输出改变了上下文，就会触发下一轮推理。

* * *

## [2 快速开始：预构建代理](#2-快速开始预构建代理)

LangChain v1 提供了 `createAgent` 函数（取代已废弃的 `createReactAgent`），可以一键创建标准的 ReAct 代理。

> **⚠️ 迁移提示**：`createReactAgent`（来自 `@langchain/langgraph/prebuilt`）已在 LangGraph v1 中被废弃。请使用 `createAgent`（来自 `langchain`）。主要变化：
> 
> -   导入路径：`@langchain/langgraph/prebuilt` → `langchain`
> -   函数名：`createReactAgent` → `createAgent`
> -   参数 `llm` → `model`（支持字符串简写，如 `"gpt-4o"`）
> -   参数 `prompt` → `systemPrompt`
> -   新增 `middleware` 系统，替代 `preModelHook` / `postModelHook`

### [代码示例](#代码示例)

```
import { createAgent } from 'langchain';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
// 1. 定义工具
const magicTool = tool(
  async ({ input }) => {
    return `Magic result for ${input}`;
  },
  {
    name: 'magic_function',
    description: 'A magic tool that does something cool',
    schema: z.object({ input: z.string() }),
  },
);
// 2. 创建代理
const agent = createAgent({
  model: 'gpt-4o', // 支持字符串简写或模型实例
  tools: [magicTool],
  systemPrompt: 'You are a helpful assistant.', // 原 prompt，现改名为 systemPrompt
});
// 3. 运行
const result = await agent.invoke({
  messages: [{ role: 'user', content: "Use the magic tool on 'hello'" }],
});
console.log(result.messages.at(-1).content);
```

**代码解析**：

1.  `tool(...)` 的 `schema` 决定了 LLM 能不能稳定地构造正确参数。
2.  `createAgent` 把"工具调用 + 循环"封装成了一个可直接 `invoke/stream` 的 runnable，底层基于 LangGraph 运行时。
3.  `model` 参数支持字符串简写（如 `"gpt-4o"`、`"claude-sonnet-4-5-20250929"`），也支持传入模型实例。
4.  如果你需要更复杂的控制流（人机交互、子图隔离、并行），就要用自定义图。

### [使用 Middleware 增强代理](#使用-middleware-增强代理)

`createAgent` 的核心新特性是 **middleware 系统**，通过可组合的中间件实现动态提示词、对话摘要、人机审批等场景：

```
import {
  createAgent,
  summarizationMiddleware,
  humanInTheLoopMiddleware,
} from 'langchain';
const agent = createAgent({
  model: 'claude-sonnet-4-5-20250929',
  tools: [readEmail, sendEmail],
  middleware: [
    // 对话过长时自动摘要
    summarizationMiddleware({
      model: 'claude-sonnet-4-5-20250929',
      trigger: { tokens: 1000 },
    }),
    // 敏感操作需人工审批
    humanInTheLoopMiddleware({
      interruptOn: {
        sendEmail: { allowedDecisions: ['approve', 'edit', 'reject'] },
      },
    }),
  ],
});
```

**Middleware 钩子一览**：

钩子

执行时机

典型用途

`beforeAgent`

代理启动前

加载记忆、验证输入

`beforeModel`

每次 LLM 调用前

动态提示词、裁剪消息

`wrapModelCall`

包裹 LLM 调用

拦截/修改请求与响应

`wrapToolCall`

包裹工具调用

工具错误处理

`afterModel`

每次 LLM 响应后

输出验证、护栏

`afterAgent`

代理完成后

保存结果、清理

* * *

## [3 预构建 vs 自定义：怎么选？](#3-预构建-vs-自定义怎么选)

方案

优点

适用场景

代价

`createAgent`

上手快、代码少、middleware 可组合

原型、单一 agent、标准 ReAct、带中间件扩展

超复杂控制流受限

自定义 Graph

控制力最强

审批流、复杂分支、子图隔离、多 agent

代码更多，需要设计 state

* * *

## [4 进阶：自定义 ReAct 实现](#4-进阶自定义-react-实现)

为了完全掌控 ReAct 循环（例如添加人工审批、修改记忆逻辑），我们需要手动构建 Graph。

### [核心组件](#核心组件)

1.  **Agent Node**：负责调用 LLM 进行推理。
2.  **Tools Node**：负责执行 LLM 请求调用的工具。
3.  **Routers**：决定是继续调用工具还是结束对话。

### [实现步骤](#实现步骤)

```
import { StateGraph, START, END } from '@langchain/langgraph';
import { MessagesAnnotation } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
// ... 定义 tool 和 llmWithTools ...
// 1. 定义节点
const agentNode = async (state) => {
  const response = await llmWithTools.invoke(state.messages);
  return { messages: [response] };
};
// 工具执行节点（LangGraph 预置）
const toolsRunner = new ToolNode(tools);
const toolsNode = async (state: typeof ReactState.State) => {
  const result = await toolsRunner.invoke(state);
  return {
    ...result,
    toolCallCount: state.toolCallCount + 1,
    stage: 'observation_complete',
  };
};
// 2. 定义路由
const shouldContinue = (state) => {
  const lastMessage = state.messages[state.messages.length - 1];
  // 如果 LLM 想要调用工具 -> tools
  if (lastMessage.tool_calls?.length) {
    return 'tools';
  }
  // 否则 -> 结束
  return END;
};
// 3. 构建 Graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode('agent', agentNode)
  .addNode('tools', toolsNode)
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', shouldContinue)
  .addEdge('tools', 'agent'); // 行动后回到代理继续思考
const app = workflow.compile();
```

**💡 提示：递归限制**

一旦你有循环边（`tools -> agent`），就建议在调用时设置 `recursionLimit`，避免模型卡在"反复调用工具"的坏循环里。

### [更细粒度的 ReAct 循环（带状态控制）](#更细粒度的-react-循环带状态控制)

当你需要限制工具调用次数、记录阶段信息或输出可观察的执行轨迹时，可以扩展状态：

```
import {
  Annotation,
  StateGraph,
  START,
  END,
  messagesStateReducer,
} from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { BaseMessage } from '@langchain/core/messages';
const ReactState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  toolCallCount: Annotation<number>({
    reducer: (state, update) => update ?? state,
    default: () => 0,
  }),
  maxToolCalls: Annotation<number>({
    reducer: (state, update) => update ?? state,
    default: () => 3,
  }),
  stage: Annotation<string>({
    reducer: (state, update) => update ?? state,
    default: () => 'reasoning',
  }),
});
const agentNode = async (state: typeof ReactState.State) => {
  const response = await llmWithTools.invoke(state.messages);
  return { messages: [response], stage: 'reasoning_complete' };
};
const toolsNode = new ToolNode(tools);
const shouldContinue = (state: typeof ReactState.State) => {
  const last = state.messages[state.messages.length - 1];
  if (state.toolCallCount >= state.maxToolCalls) return END;
  if (last.tool_calls?.length) return 'tools';
  return END;
};
const app = new StateGraph(ReactState)
  .addNode('agent', agentNode)
  .addNode('tools', toolsNode)
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', shouldContinue)
  .addEdge('tools', 'agent')
  .compile();
```

**💡 使用建议**

-   用 `toolCallCount` 控制最坏情况下的循环次数。
-   用 `stage` 记录执行阶段，便于调试和可视化。

### [简化的错误处理与重试](#简化的错误处理与重试)

真实场景中工具可能失败，你可以用“错误消息 + 路由重试”来兜底：

```
import { END } from '@langchain/langgraph';
import { ToolMessage } from '@langchain/core/messages';
const MAX_RETRY = 2;
const safeToolsNode = async (state: typeof ReactState.State) => {
  try {
    return await toolsNode.invoke(state);
  } catch (error) {
    return {
      messages: [
        new ToolMessage({
          content: `错误：${(error as Error).message}`,
          tool_call_id: 'tool_error',
        }),
      ],
    };
  }
};
const shouldRetry = (state: typeof ReactState.State) => {
  const last = state.messages[state.messages.length - 1];
  const isError =
    typeof last?.content === 'string' && last.content.startsWith('错误：');
  if (isError && state.toolCallCount < MAX_RETRY) return 'agent';
  if (isError) return END;
  return 'agent';
};
const appWithRetry = new StateGraph(ReactState)
  .addNode('agent', agentNode)
  .addNode('tools', safeToolsNode)
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', shouldContinue)
  .addConditionalEdges('tools', shouldRetry)
  .compile();
```

**⚠️ 注意**

错误处理建议只保留 1-2 次重试，避免无限自循环。

* * *

## [5 把 ReAct 做成“能用的应用”：流式输出 + 记忆](#5-把-react-做成能用的应用流式输出--记忆)

最贴近真实产品的组合通常是：

-   **流式输出**：用户能边看边等
-   **持久化记忆**：页面刷新/服务重启后仍能继续对话

你不需要在这里一次学完，先记住两件事：

1.  流式输出：用 `stream` / `streamEvents`（见 [流式处理](../08-advanced-features/01-streaming)）
2.  记忆：编译时传 `checkpointer`，调用时带 `thread_id`（见 [持久化](../08-advanced-features/03-persistence)）

* * *

## [💡 练习题](#-练习题)

1.  **思考题**：在 ReAct 循环中，如果 LLM 连续多次调用工具但无法解决问题，会导致什么后果？如何防止这种情况？
    
    点击查看答案
    
    可能进入“工具调用死循环”，导致性能浪费与响应超时。可通过 `recursionLimit` 或状态中的 `maxToolCalls` 限制循环次数。
    
2.  **操作题**：使用 `createAgent` 创建一个 `getCurrentTime` 工具，询问“现在几点了？”。
    
    点击查看答案
    
    ```
    import { createAgent } from 'langchain';
    import { tool } from '@langchain/core/tools';
    import { z } from 'zod';
    const getCurrentTime = tool(async () => new Date().toISOString(), {
      name: 'get_current_time',
      description: '获取当前时间',
      schema: z.object({}),
    });
    const agent = createAgent({
      model: 'gpt-4o',
      tools: [getCurrentTime],
      systemPrompt: '你是一个乐于助人的助手。',
    });
    const result = await agent.invoke({
      messages: [{ role: 'user', content: '现在几点了？' }],
    });
    ```
    
3.  **思考题**：为什么要把工具调用与推理分成两个节点（agent/tools）？
    
    点击查看答案
    
    分离节点可以让每个阶段职责清晰：推理节点只负责“决定是否调用工具”，工具节点只负责“执行与返回结果”。这样便于调试、插入安全检查，并在需要时替换工具执行逻辑。
    
4.  **操作题**：为自定义 ReAct 循环加入 `maxToolCalls` 限制，避免无限重试。
    
    点击查看答案
    
    在状态中添加 `toolCallCount` 与 `maxToolCalls`，在 `shouldContinue` 中判断：
    
    ```
    if (state.toolCallCount >= state.maxToolCalls) return END;
    ```
    
5.  **操作题**：模拟一次工具失败，并让系统自动重试 1 次。
    
    点击查看答案
    
    在工具节点中捕获异常并返回 `ToolMessage`，然后在路由中检测“错误：”前缀并触发一次重试即可。
    

* * *

## [📚 参考资源](#-参考资源)

### [官方文档](#官方文档)

-   [LangChain v1 迁移指南](https://docs.langchain.com/oss/javascript/migrate/langchain-v1)
-   [LangGraph v1 迁移指南](https://docs.langchain.com/oss/javascript/migrate/langgraph-v1)

* * *

## [✅ 总结](#-总结)

**本章要点**：

-   ReAct 是构建智能代理的基石模式。
-   `createAgent`（LangChain v1）适合快速原型开发，通过 middleware 系统提供强大的可扩展性。
-   自定义 Graph 实现提供了无限的扩展能力（如添加 Human-In-The-Loop）。

**下一步**：当一个 Agent 不够用时，我们需要**多代理系统**。

## 相关笔记

- [[4-6 RAG 全流程]]
- [[4-9 Agent 的记忆系统]]
- [[3-1 Function Calling 与 Structured Output]]
- [[2-3 Agent Loop 保险丝]]
- [[2-1 流式响应工程真相]]
- [[3-6 生产级权限系统的四层防线]]
