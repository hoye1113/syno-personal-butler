---
title: "八、LangChain 专项 — 前端 Agent 面试题锦集 — Loock AI 全栈应用开发"
tags: ["loock_ai", "frontend_agent_interview", "interview", "ai_agent"]
legacy_tags: ["loock_ai", "frontend_agent_interview", "interview", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/langgraphjs-frontend-agent-interview/interview"
description: "Loock AI 前端 Agent 面试题：八、LangChain 专项"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/5-前端 Agent 面试题/5-8 八、LangChain 专项.md"
source_sha256: "377ecb2ed3373a863757ed3c5b6fb34112f849b5748177c6301eb87f1f2e5760"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---


# 八、LangChain 专项

### [63\. LangGraph.js 与 LangChain.js 的关系和差异是什么？](#63-langgraphjs-与-langchainjs-的关系和差异是什么)

**参考答案：**

LangChain.js 偏模型与工具生态封装；LangGraph.js 偏流程编排与状态运行时。

常见组合是：用 LangChain 提供模型/工具抽象，用 LangGraph 管理复杂执行流程。

### [64\. 为什么 LangChain 生态要引入 LangGraph 的图式编排？](#64-为什么-langchain-生态要引入-langgraph-的图式编排)

**参考答案：**

因为真实业务普遍存在分支、循环、人工介入和恢复需求，线性链路难以表达。

图式编排能显著提升可控性、可调试性和可审计性。

### [65\. `createAgent()` 和 LangGraph 是什么关系？](#65-createagent-和-langgraph-是什么关系)

**参考答案：**

在 LangChain JS 体系中，`createAgent()` 底层通常运行在 LangGraph 的图运行时之上。

也就是说，很多“看似简单的 Agent 调用”背后本质是图执行循环。

**LangGraph.js 1.0 说明：**

在 LangGraph.js 1.0 中，`createAgent()` 是正确的预构建 API（不是 `createReactAgent`）。它会自动创建包含工具调用循环的 `StateGraph`。

**代码示例：**

```
import { createAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
const model = new ChatOpenAI({ model: "gpt-4" });
const tools = [weatherTool, calculatorTool];
// createAgent 会自动创建包含工具调用循环的 StateGraph
const agent = createAgent({
  llm: model,
  tools,
  checkpointer: new MemorySaver()
});
// 等价于手动构建以下 StateGraph:
// const workflow = new StateGraph(MessagesAnnotation)
//   .addNode("model", modelNode)
//   .addNode("tools", toolsNode)
//   .addConditionalEdges("model", shouldContinue, { 
//     continue: "tools", 
//     end: END 
//   })
//   .addEdge("tools", "model");
```

**优势：**

-   快速启动，无需手动构建图结构
-   自动处理工具调用循环逻辑
-   支持 checkpointer、interrupt 等高级功能

**何时手动构建 StateGraph：**

-   需要自定义节点执行逻辑
-   需要复杂的条件路由（非标准工具调用循环）
-   需要多 Agent 协作

### [66\. LangChain 的 Components 和 Chains 分别是什么？](#66-langchain-的-components-和-chains-分别是什么)

**参考答案：**

`Components` 是可复用构建块（模型、提示词、检索器、解析器等）；`Chains` 是把这些组件组合成可执行流程。

前者偏“零件”，后者偏“装配后的流水线”。

### [67\. LangChain Agent 的执行闭环通常如何描述？](#67-langchain-agent-的执行闭环通常如何描述)

**参考答案：**

可概括为：接收任务 -> 推理决策 -> 调用工具 -> 接收反馈 -> 继续决策，直到满足停止条件。

面试里建议补一句：停止条件应显式化，避免无限循环。

### [68\. LangChain 中 Embedding + Vector Store 的标准流程是什么？](#68-langchain-中-embedding--vector-store-的标准流程是什么)

**参考答案：**

离线：文档切块并向量化入库；在线：query 向量化后 top-k 检索，再与问题一起送入模型生成。

实践里通常会加 rerank、过滤和缓存来提升稳定性。

### [69\. PromptTemplate 在工程里最常见的坑是什么？](#69-prompttemplate-在工程里最常见的坑是什么)

**参考答案：**

最常见是模板变量和 `input_variables` 不一致，导致运行时缺参。

建议把模板变量做静态检查，并为关键模板补单测。

### [70\. LangChain 如何实现多轮对话？](#70-langchain-如何实现多轮对话)

**参考答案：**

通常通过 memory 组件维护历史上下文，再注入后续调用。

为了控制成本和噪声，常采用“最近窗口 + 历史摘要”的混合策略。

### [71\. MCP 和 Function Calling 的区别怎么答？](#71-mcp-和-function-calling-的区别怎么答)

**参考答案：**

Function Calling 是模型输出函数调用的机制；MCP 是模型与外部工具系统之间的标准化协议。

前者回答“怎么调函数”，后者回答“如何统一接入工具生态”。

* * *

## 相关笔记

- [[3-4 MCP 的工程真相]]
- [[4-6 RAG 全流程]]
- [[4-9 Agent 的记忆系统]]
- [[3-1 Function Calling 与 Structured Output]]
- [[2-3 Agent Loop 保险丝]]
- [[1-8 人机交互|人机交互（参见 Loock AI 1-8）]]
