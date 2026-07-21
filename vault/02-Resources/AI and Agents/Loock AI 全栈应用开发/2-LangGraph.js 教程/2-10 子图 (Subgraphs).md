---
title: "子图 (Subgraphs) — Loock AI 全栈应用开发"
tags: ["loock_ai", "langgraphjs_tutorial", "ai_agent"]
legacy_tags: ["loock_ai", "langgraphjs-tutorial", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/langgraphjs/04-architecture/03-subgraphs"
description: "使用子图实现逻辑封装和状态隔离，构建可复用的复杂系统"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/2-LangGraph.js 教程/2-10 子图 (Subgraphs).md"
source_sha256: "dbc1cdabf22961730caf91507f75e68fbb8205d6f1e5e0bc34d4d795365e6aec"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

架构模式

# 子图 (Subgraphs)

使用子图实现逻辑封装和状态隔离，构建可复用的复杂系统

## [📚 学习目标](#-学习目标)

学完这篇文章后，你将能够：

-   理解子图在系统解耦中的作用
-   学会创建并嵌套 `StateGraph`
-   掌握父图与子图之间的状态传递机制
-   解决多代理系统中的状态污染问题

## [前置知识](#前置知识)

在开始学习之前，建议先阅读：

-   [02-multi-agent-systems](./02-multi-agent-systems)

你需要了解：

-   软件工程中的模块化/封装概念

* * *

## [1 什么是子图？](#1-什么是子图)

**子图** 本质上就是一个普通的 Graph，但它被当作另一个 Graph 的**节点**来使用。

### [为什么要用子图？](#为什么要用子图)

1.  **封装性**：父图不需要知道子图的内部细节，只关心输入输出。
2.  **状态隔离**：子图可以有自己的 Schema，避免与父图或其他子图的状态冲突。
3.  **复用性**：定义一次子图，可以在多个地方引用。

* * *

## [子图的典型使用场景](#子图的典型使用场景)

-   **检索子流程**：把“检索 + 过滤 + 重排序”封装成子图
-   **评估子流程**：把“多维评分 + 结论输出”封装成子图
-   **多代理隔离**：每个 agent 维护自己的消息历史

**💡 直觉类比**

如果父图像“页面路由”，子图就像“页面组件”。父图负责调度，子图负责细节。

## [子图可以嵌套多层](#子图可以嵌套多层)

当业务更复杂时，子图还可以嵌套子图：

#\_r\_1\_{margin:1.5rem auto 0;}#\_r\_1\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_1\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_1\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_1\_ .error-icon{fill:#a44141;}#\_r\_1\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_1\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_1\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_1\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_1\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_1\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_1\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_1\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_1\_ .marker.cross{stroke:lightgrey;}#\_r\_1\_ svg{font-family:inherit;font-size:16px;}#\_r\_1\_ p{margin:0;}#\_r\_1\_ .label{font-family:inherit;color:#ccc;}#\_r\_1\_ .cluster-label text{fill:#F9FFFE;}#\_r\_1\_ .cluster-label span{color:#F9FFFE;}#\_r\_1\_ .cluster-label span p{background-color:transparent;}#\_r\_1\_ .label text,#\_r\_1\_ span{fill:#ccc;color:#ccc;}#\_r\_1\_ .node rect,#\_r\_1\_ .node circle,#\_r\_1\_ .node ellipse,#\_r\_1\_ .node polygon,#\_r\_1\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_1\_ .rough-node .label text,#\_r\_1\_ .node .label text,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-anchor:middle;}#\_r\_1\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_1\_ .rough-node .label,#\_r\_1\_ .node .label,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-align:center;}#\_r\_1\_ .node.clickable{cursor:pointer;}#\_r\_1\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_1\_ .arrowheadPath{fill:lightgrey;}#\_r\_1\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_1\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_1\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_1\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_1\_ .cluster text{fill:#F9FFFE;}#\_r\_1\_ .cluster span{color:#F9FFFE;}#\_r\_1\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_1\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_1\_ rect.text{fill:none;stroke-width:0;}#\_r\_1\_ .icon-shape,#\_r\_1\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .icon-shape p,#\_r\_1\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_1\_ .icon-shape rect,#\_r\_1\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_1\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_1\_ :root{--mermaid-font-family:inherit;}

父图

子图 A

子图 B

子图 A1

子图 A2

子图 B1

**⚠️ 注意**

多层嵌套虽然强大，但要控制子图之间的输入/输出契约，否则维护成本会迅速上升。

* * *

## [2 创建与使用子图](#2-创建与使用子图)

### [步骤 1：定义子图](#步骤-1定义子图)

这就和定义普通 Graph 一模一样。

```
import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
const childState = Annotation.Root({
  input: Annotation<string>(),
  localResult: Annotation<string>({
    default: () => '',
  }),
});
const childProcess = async (state: typeof childState.State) => {
  return { localResult: `child processed: ${state.input}` };
};
// 子图编译后就是一个 runnable
const childGraph = new StateGraph(childState)
  .addNode('child_process', childProcess)
  .addEdge(START, 'child_process')
  .addEdge('child_process', END)
  .compile();
```

### [步骤 2：在父图中使用](#步骤-2在父图中使用)

将编译好的子图直接作为 `addNode` 的第二个参数。

```
const parentState = Annotation.Root({
  globalInput: Annotation<string>(),
  result: Annotation<string>({
    default: () => '',
  }),
});
// 关键点：如果父 state 与子 state 字段不匹配，直接挂 subgraph 往往不够
// 这里我们用一个 bridge node 做转换（更明确、更可控）
const bridgeNode = async (state: typeof parentState.State) => {
  const childOut = await childGraph.invoke({ input: state.globalInput });
  return { result: childOut.localResult };
};
export const parentGraph = new StateGraph(parentState)
  .addNode('run_child', bridgeNode)
  .addEdge(START, 'run_child')
  .addEdge('run_child', END)
  .compile();
```

**💡 设计建议**

如果父子状态差异较大，优先使用 bridge 节点，而不是直接把子图挂上去。

**代码解析**：

1.  子图编译后是 runnable，父图里可以用 `invoke()` 调用。
2.  用 bridge node 的最大好处：你可以显式定义“父输入 -> 子输入”和“子输出 -> 父更新”。

* * *

## [3 状态传递与转换](#3-状态传递与转换)

父图和子图的状态 Schema 通常不同，LangGraph 如何处理数据流动？

### [情况 A：Schema 包含关系](#情况-aschema-包含关系)

如果子图需要的字段，父图都有，LangGraph 会自动透传。

### [情况 B：显式转换 (Wrapper Node)](#情况-b显式转换-wrapper-node)

如果 Schema 完全不同，建议包裹一层函数节点来做转换。

```
const bridgeNode = async (state) => {
  // 1. 转换父状态 -> 子输入
  const childInput = { localResult: state.globalInput };
  
  // 2. 调用子图
  const childOutput = await childGraph.invoke(childInput);
  
  // 3. 转换子输出 -> 父状态更新
  return { globalInput: childOutput.localResult + " processed" };
};
// 父图添加的是 bridgeNode，而不是直接添加 childGraph
parentGraph.addNode("bridge", bridgeNode);
```

* * *

## [3.1 字段映射表（让契约更清晰）](#31-字段映射表让契约更清晰)

当父子状态差异较大时，建议先画一张“字段映射表”：

父图字段

子图字段

说明

`globalInput`

`input`

父图输入转子图输入

`result`

`localResult`

子图输出回写父图

**💡 设计建议**

在 bridge 节点里显式做映射，避免“隐式透传”带来的耦合。

## [3.2 子图复用（一次定义，多处调用）](#32-子图复用一次定义多处调用)

同一个子图可以被多个父图复用：

```
const childGraph = new StateGraph(childState)
  .addNode('child_process', childProcess)
  .addEdge(START, 'child_process')
  .addEdge('child_process', END)
  .compile();
const parentA = new StateGraph(parentState)
  .addNode('run_child', async (state) => ({
    result: (await childGraph.invoke({ input: state.globalInput })).localResult,
  }))
  .addEdge(START, 'run_child')
  .addEdge('run_child', END)
  .compile();
const parentB = new StateGraph(parentState)
  .addNode('run_child', async (state) => ({
    result: (await childGraph.invoke({ input: state.globalInput })).localResult,
  }))
  .addEdge(START, 'run_child')
  .addEdge('run_child', END)
  .compile();
```

**ℹ️ 说明**

复用时保持子图输入/输出稳定，可以降低后期维护成本。

* * *

## [4 什么时候用子图？一个判断清单](#4-什么时候用子图一个判断清单)

✅ **推荐用子图**：

-   你想把一段复杂流程封装成“黑盒模块”（例如：检索子流程、评估子流程）
-   你需要隔离状态（尤其是 messages）
-   你想复用同一套流程（多处调用）

❌ **不一定要用子图**：

-   只是 2-3 个节点的直线流程
-   你没有复用需求，且 state 非常简单

* * *

## [5 多代理状态隔离示例](#5-多代理状态隔离示例)

在多代理系统中，每个代理都有自己的 `messages` 历史。如果公用一个状态，Agent A 的思考过程会污染 Agent B 的上下文。

**解决方案：** 将每个 Agent 封装为子图，它们各自维护 `messages`，只向父图返回最终结论。

#\_r\_2\_{margin:1.5rem auto 0;}#\_r\_2\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_2\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_2\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_2\_ .error-icon{fill:#a44141;}#\_r\_2\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_2\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_2\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_2\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_2\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_2\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_2\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_2\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_2\_ .marker.cross{stroke:lightgrey;}#\_r\_2\_ svg{font-family:inherit;font-size:16px;}#\_r\_2\_ p{margin:0;}#\_r\_2\_ .label{font-family:inherit;color:#ccc;}#\_r\_2\_ .cluster-label text{fill:#F9FFFE;}#\_r\_2\_ .cluster-label span{color:#F9FFFE;}#\_r\_2\_ .cluster-label span p{background-color:transparent;}#\_r\_2\_ .label text,#\_r\_2\_ span{fill:#ccc;color:#ccc;}#\_r\_2\_ .node rect,#\_r\_2\_ .node circle,#\_r\_2\_ .node ellipse,#\_r\_2\_ .node polygon,#\_r\_2\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_2\_ .rough-node .label text,#\_r\_2\_ .node .label text,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-anchor:middle;}#\_r\_2\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_2\_ .rough-node .label,#\_r\_2\_ .node .label,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-align:center;}#\_r\_2\_ .node.clickable{cursor:pointer;}#\_r\_2\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_2\_ .arrowheadPath{fill:lightgrey;}#\_r\_2\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_2\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_2\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_2\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_2\_ .cluster text{fill:#F9FFFE;}#\_r\_2\_ .cluster span{color:#F9FFFE;}#\_r\_2\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_2\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_2\_ rect.text{fill:none;stroke-width:0;}#\_r\_2\_ .icon-shape,#\_r\_2\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .icon-shape p,#\_r\_2\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_2\_ .icon-shape rect,#\_r\_2\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_2\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_2\_ :root{--mermaid-font-family:inherit;}

父图: 只保留共享结果

Agent A 子图

Agent B 子图

* * *

## [6 异常隔离与降级](#6-异常隔离与降级)

子图失败时，父图可以选择“中止”或“降级”。下面是一个简化的异常隔离示例：

```
const safeBridgeNode = async (state: typeof parentState.State) => {
  try {
    const childOut = await childGraph.invoke({ input: state.globalInput });
    return { result: childOut.localResult, status: 'ok' };
  } catch (error) {
    return { result: '子图失败，已降级', status: 'degraded' };
  }
};
```

**ℹ️ 说明**

对于“可容错”子流程（如推荐/排序），降级比直接失败更适合生产系统。

* * *

## [7 子图调试与观测](#7-子图调试与观测)

子图也是图，所以可以像普通图一样可视化：

```
const mermaid = childGraph.getGraph().drawMermaid();
console.log(mermaid);
```

**💡 调试建议**

-   先单独运行子图，确认输入输出契约正确。
-   再把子图接入父图，观察父子状态映射是否一致。

## [8 子图作为节点 vs 手动调用](#8-子图作为节点-vs-手动调用)

两种方式差异如下：

方式

优点

适用场景

直接添加子图

代码简洁

状态字段一致，结构简单

bridge 调用子图

控制力强

状态字段不同、需要转换

**ℹ️ 说明**

当你需要“日志、校验、降级”等能力时，bridge 更灵活。

* * *

## [9 子图在多代理中的复用](#9-子图在多代理中的复用)

一个常见做法是把“检索/分析/评估”做成子图，让不同代理共享：

```
const retrievalSubgraphs= new StateGraph(SharedState)
  .addNode('retrieve', retrieveNode)
  .addEdge(START, 'retrieve')
  .addEdge('retrieve', END)
  .compile();
const analystNode = async (state: typeof ParentStateAnnotation.State) => {
  const { docs } = await retrievalSubgraph.invoke({ query: state.userInput });
  return { processedData: docs.join('\n') };
};
```

**💡 思路**

让“通用流程”变成子图，多个代理直接复用，能显著减少重复代码。

* * *

## [💡 练习题](#-练习题)

1.  **代码题**：创建一个“研究员子图”（负责生成长文）和一个“编辑子图”（负责润色），然后在一个“主编父图”中串联它们。尝试直接添加子图和通过 bridge node 添加两种方式。
    
    点击查看答案
    
    直接添加适用于状态字段兼容；如果字段不同，需要 bridge 节点显式转换输入/输出。
    
2.  **思考题**：如果子图抛出异常，父图会发生什么？如何隔离故障？
    
    点击查看答案
    
    未捕获异常会导致父图执行失败。可在 bridge 节点捕获异常并降级返回。
    
3.  **操作题**：让父图同时调用两个子图，并合并结果输出。
    
    点击查看答案
    
    可以在父图中增加两个 bridge 节点分别调用子图，再用一个 merge 节点整合结果。
    
4.  **思考题**：什么时候不适合使用子图？
    
    点击查看答案
    
    当流程很短、没有复用需求或状态极其简单时，子图会增加不必要的复杂度。
    
5.  **操作题**：设计一个“检索子图”，返回结构化输出并被父图消费。
    
    点击查看答案
    
    在子图中输出 `{ docs, score }`，父图在 bridge 节点里将其映射到自身状态字段。
    

* * *

## [✅ 总结](#-总结)

**本章要点**：

-   子图是 LangGraph 实现模块化的核心机制。
-   编译后的 Graph 就是一个 Runnable，可以像普通函数一样被调用。
-   通过子图可以有效解决 Context 污染问题。
-   bridge 节点能让父子状态映射更清晰、更可控。

**下一步**：如何让多个节点或子图同时跑起来？学习**并行处理**。

## 相关笔记

- [[4-6 RAG 全流程]]
- [[MOC - LangGraph.js 教程|LangGraph.js 教程 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
