---
title: "一、LangGraph 基础概念 — 前端 Agent 面试题锦集 — Loock AI 全栈应用开发"
tags: ["loock_ai", "frontend_agent_interview", "interview", "ai_agent"]
legacy_tags: ["loock_ai", "frontend_agent_interview", "interview", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/langgraphjs-frontend-agent-interview/interview"
description: "Loock AI 前端 Agent 面试题：一、LangGraph 基础概念"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/5-前端 Agent 面试题/5-1 一、LangGraph 基础概念.md"
source_sha256: "5a5c9eb810cf41759ce6d9be6cdb421cccd86521913be75fab2f853dea02624c"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---


# 一、LangGraph 基础概念

### [1\. LangGraph.js 是什么？它解决了什么问题？](#1-langgraphjs-是什么它解决了什么问题)

**参考答案：**

LangGraph.js 是面向 LLM/Agent 的有状态图工作流框架。它把“多步推理、工具调用、分支循环、人工中断、恢复执行”显式建模成图。

在工程上，它主要解决三类问题：

-   复杂流程可编排：不再局限于单次请求-响应或线性链路。
-   运行过程可恢复：借助 checkpoint 支持断点续跑。
-   行为可观测：能追踪每个节点的输入、输出和状态演进。

### [2\. StateGraph 和 State 的区别是什么？](#2-stategraph-和-state-的区别是什么)

**参考答案：**

StateGraph 是“流程定义层”，描述节点、边和路由规则；State 是“运行时数据层”，承载上下文和中间结果。

可以把它理解为：

-   StateGraph = 结构（执行蓝图）
-   State = 数据（执行现场）

**TypeScript 示例：**

```
// StateGraph = 流程定义
import { StateGraph, Annotation, END } from "@langchain/langgraph";
const StateAnnotation = Annotation.Root({
  messages: Annotation<string[]>({ default: () => [] })
});
const workflow = new StateGraph(StateAnnotation)
  .addNode("nodeA", (state) => ({ messages: [...state.messages, "A"] }))
  .addEdge("nodeA", END);
// State = 运行时数据
const result = await workflow.compile().invoke({ messages: [] });
console.log(result.messages); // ["A"]
```

### [3\. 什么是 Node 和 Edge？](#3-什么是-node-和-edge)

**参考答案：**

Node 是执行单元，例如：LLM 推理、工具调用、校验、数据转换；Edge 是流转规则，决定下一步去哪。

实战里重点是：

-   节点尽量单一职责，方便复用和测试。
-   边的条件要可解释，避免“隐式跳转”难排障。

### [4\. LangGraph.js 的核心组件有哪些？](#4-langgraphjs-的核心组件有哪些)

**参考答案：**

常见核心组件包括：

-   `StateGraph`（图定义）
-   `Annotation.Root` / `MessagesAnnotation`（状态定义与类型推导）
-   `START` / `END`（特殊节点标识）
-   Node / Edge（执行单元与流转）
-   Reducer（并发状态合并）
-   Checkpointer（检查点持久化，如 `MemorySaver`、`SqliteSaver`、`PostgresSaver`）
-   `interrupt()` / `Command`（人机中断与恢复）
-   `.compile()`（图编译与配置）

### [5\. 在 LangGraph.js 中，`messages` 字段为什么要配置 reducer（如 `messagesStateReducer`）？它如何处理“追加”和“更新”？](#5-在-langgraphjs-中messages-字段为什么要配置-reducer如-messagesstatereducer它如何处理追加和更新)

**参考答案：**

`messagesStateReducer` 是 `messages` 字段的状态合并规则，核心目标是“安全地维护消息历史”。

它的行为可以概括为两点：

-   追加：新消息默认追加到已有消息列表，而不是覆盖整个历史。
-   更新：若新旧消息 `id` 相同，会按 `id` 做替换/更新，避免重复脏数据。

它的工程价值在于：多轮对话历史可持续累积，并发分支回写更可控，且能降低消息状态被误覆盖或重复写入的风险。

**代码示例：**

```
import { MessagesAnnotation } from "@langchain/langgraph";
// MessagesAnnotation 内置 messagesStateReducer
const workflow = new StateGraph(MessagesAnnotation);
// 追加行为
const state1 = { messages: [{ role: "user", content: "Hi" }] };
const update1 = { messages: [{ role: "assistant", content: "Hello" }] };
// 结果: [user msg, assistant msg] ✅ 追加
// 更新行为（相同 ID）
const state2 = { messages: [{ id: "msg1", role: "user", content: "Hi" }] };
const update2 = { messages: [{ id: "msg1", role: "user", content: "Hello" }] };
// 结果: [{ id: "msg1", content: "Hello" }] ✅ 替换
```

### [6\. 什么是 `thread_id`？为什么它很关键？](#6-什么是-thread_id为什么它很关键)

**参考答案：**

`thread_id` 是线程级会话标识，用于把同一条执行链路关联起来。

没有它会直接影响：

-   中断后的恢复（resume 找不到上下文）
-   多轮记忆关联
-   审计与问题回放

**代码示例：**

```
// 标准 thread_id 传递格式
await app.invoke(
  { messages: [{ role: "user", content: "Hello" }] },
  { 
    configurable: { 
      thread_id: "user-123-session-456" 
    } 
  }
);
// 流式调用同样需要 thread_id
for await (const event of app.stream(input, { 
  configurable: { thread_id: "user-123-session-456" } 
})) {
  console.log(event);
}
```

### [7\. 什么是 `checkpoint`？](#7-什么是-checkpoint)

**参考答案：**

`checkpoint` 是某一步执行后的状态快照（如 values、next、metadata 等）。

典型用途：

-   故障恢复与断点续跑
-   时间旅行调试（回放历史状态）
-   人工中断后的安全恢复

### [8\. 短期记忆和长期记忆有什么区别？](#8-短期记忆和长期记忆有什么区别)

**参考答案：**

短期记忆通常是线程级（thread-scoped），围绕当前会话；长期记忆是跨线程共享的稳定信息（如用户偏好、账号画像）。

常见实现：

-   短期记忆：依赖 checkpointer。
-   长期记忆：放在独立 store，并做 namespace 隔离。

### [9\. LangGraph.js 与 LCEL 相比有什么优势？](#9-langgraphjs-与-lcel-相比有什么优势)

**参考答案：**

LCEL 更适合线性或轻量编排；LangGraph 更适合包含循环、条件路由、持久化和 HITL 的复杂 Agent。

一句话概括：LCEL 偏“链式表达”，LangGraph 偏“状态化流程控制”。

### [10\. LangGraph.js 相比通用工作流框架（如 Temporal）有什么特点？](#10-langgraphjs-相比通用工作流框架如-temporal有什么特点)

**参考答案：**

LangGraph 是围绕 Agent 场景原生设计的，天然支持工具调用语义、对话状态、流式交互和中断恢复。

Temporal 等框架通用性强，但需要额外建模才能贴近 LLM/Agent 语义。

## 相关笔记

- [[4-9 Agent 的记忆系统]]
- [[3-1 Function Calling 与 Structured Output]]
- [[2-1 流式响应工程真相]]
- [[3-6 生产级权限系统的四层防线]]
- [[1-8 人机交互|人机交互（参见 Loock AI 1-8）]]
- [[MOC - 前端 Agent 面试题|前端 Agent 面试题 章节索引]]
