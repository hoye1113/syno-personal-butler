---
title: "状态管理与 Reducers — Loock AI 全栈应用开发"
tags: ["loock_ai", "langgraphjs_tutorial", "ai_agent"]
legacy_tags: ["loock_ai", "langgraphjs-tutorial", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/langgraphjs/03-components/02-state-management"
description: "详解 Annotation 的使用、状态更新机制以及如何编写自定义 Reducer"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/2-LangGraph.js 教程/2-5 状态管理与 Reducers.md"
source_sha256: "feafa287d28fd9edad99810d161a09135d3abd95032975885bb4f8dd1af12951"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

核心组件详解

# 状态管理与 Reducers

详解 Annotation 的使用、状态更新机制以及如何编写自定义 Reducer

## [📚 学习目标](#-学习目标)

学完这篇文章后，你将能够：

-   熟练使用 `Annotation.Root` 定义复杂状态
-   理解 LangGraph 的状态更新机制（Immutable）
-   编写自定义 `Reducer` 处理特定的状态合并逻辑
-   辨析 `messagesStateReducer` 的特殊用途

## [前置知识](#前置知识)

在开始学习之前，建议先阅读：

-   [01-graph-structure](./01-graph-structure)

你需要了解：

-   JavaScript 对象展开语法 (`...obj`)
-   纯函数（Pure Function）概念

* * *

## [引言](#引言)

在 LangGraphJS 中，**状态（State）** 是图的核心数据结构，它代表了应用在任何时刻的完整快照。如果你熟悉前端开发，可以将状态理解为：

-   **React 的 State** + **Context** 的组合
-   **Redux Store** 的全局状态管理
-   **Vuex/Pinia** 的状态存储

状态在 LangGraph 中扮演着"数据总线"���角色，所有节点都可以读取和修改状态，实现节点间的数据共享和通信。

**💡 与前端开发的类比**

-   **状态定义** ≈ TypeScript 接口定义 + Redux Store Schema
-   **Annotation** ≈ React PropTypes + TypeScript 类型定义
-   **Reducer** ≈ Redux Reducers函数
-   **状态更新** ≈ setState() 或 dispatch(action)

### [状态的核心特性](#状态的核心特性)

**📊 共享数据结构**

-   所有节点都可以访问完整的状态
-   节点可以读取任何状态字段
-   节点可以更新部分或全部状态字段

**🔄 快照机制**

-   状态代表应用在特定时刻的完整快照
-   每次状态更新都会创建新的快照
-   支持状态的持久化和恢复

**🛠️ 类型安全**

-   完全支持 TypeScript 类型推导
-   编译时类型检查
-   运行时类型验证

* * *

## [1 状态定义：Annotation](#1-状态定义annotation)

`Annotation` 是定义图状态 Schema 的标准方式。它不仅定义了类型，还定义了**如何更新**该字段。

### [基础语法](#基础语法)

```
import { Annotation } from '@langchain/langgraph';
const StateAnnotation = Annotation.Root({
  // 简单字段：新值覆盖旧值
  query: Annotation<string>(),
  // 带默认值的字段
  steps: Annotation<number>(),
});
```

* * *

## [2 Reducer：控制状态合并](#2-reducer控制状态合并)

默认情况下，LangGraph 的状态更新是**覆盖式**的（这也是为什么默认字段叫 `Annotation<Type>()`）。但有时我们需要**追加**或**合并**数据，这就需要 **Reducer**。

### [什么是 Reducer？](#什么是-reducer)

Reducers是一个函数 `(oldValue, newValue) => mergedValue`。

### [常见 Reducers模式](#常见-reducer-模式)

#### [1\. 数组追加（Append）](#1-数组追加append)

```
const StateAnnotation = Annotation.Root({
  // 每次节点返回 errors，都会追加到数组末尾
  errors: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
});
```

#### [2\. 对象合并（Merge）](#2-对象合并merge)

```
const StateAnnotation = Annotation.Root({
  // 合并部分属性，而不是整个对象替换
  userProfile: Annotation<Record<string, any>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),
});
```

#### [3\. 数学运算](#3-数学运算)

```
const StateAnnotation = Annotation.Root({
  // 累加器
  totalTokenUsage: Annotation<number>({
    reducer: (a, b) => a + b,
    default: () => 0,
  }),
});
```

* * *

## [3 内置工具：messagesStateReducer](#3-内置工具messagesstatereducer)

处理对话历史是 LangGraph 最常见的场景，因此官方提供了优化过的 `messagesStateReducer`。

### [特性](#特性)

-   **自动去重**：基于消息的 `id` 属性
-   **保持顺序**：确保消息按时间排序
-   **支持删除**：通过特殊标记删除消息
-   **智能合并**：自动处理消息数组的合并逻辑

```
import { Annotation, messagesStateReducers} from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});
```

**ℹ️ 为什么使用 messagesStateReducer？**

在构建聊天机器人时，`messagesStateReducer` 提供了开箱即用的消息管理功能，包括去重、排序和删除支持，大大简化了对话历史的管理。

* * *

## [4 状态结构怎么设计：让状态“最小、清晰、可演进”](#4-状态结构怎么设计让状态最小清晰可演进)

状态设计的目标不是“字段越多越好”，而是：

-   **图能跑**（节点需要的数据都在 state 里）
-   **能维护**（你能解释每个字段的来源与用途）
-   **可扩展**（加新节点/新分支时不把 state 搞成一锅粥）

### [1\. 最小化：只存储不可推导的信息](#1-最小化只存储不可推导的信息)

```
import { Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
// ❌ 反例：冗余字段很多（可从 messages 推导）
const BadState = Annotation.Root({
  messageCount: Annotation<number>(),
  lastMessage: Annotation<string>(),
  hasMessages: Annotation<boolean>(),
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
});
// ✅ 更好的做法：最小化 + 用工具函数推导
const MinimalState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
  userId: Annotation<string>(),
  status: Annotation<'idle' | 'thinking' | 'tool_calling'>({
    default: () => 'idle',
  }),
});
export function getLastMessage(state: typeof MinimalState.State) {
  return state.messages.length
    ? state.messages[state.messages.length - 1]
    : null;
}
```

### [2\. 规范化：把“深层嵌套对象”拆成可合并的数据](#2-规范化把深层嵌套对象拆成可合并的数据)

如果你在 state 里塞了一个很深的对象（profile/settings/flags...），通常需要一个对象合并 reducer：

```
const State = Annotation.Root({
  profile: Annotation<Record<string, unknown>>({
    reducer: (a, b) => ({ ...a, ...b }),
    default: () => ({}),
  }),
});
```

* * *

## [5 状态更新流](#5-状态更新流)

理解状态是如何在图中流动的至关重要。

1.  **节点执行**：`inputNode` 返回 `{ key: "newValue" }`。
2.  **应用 Reducer**：系统查找 `key` 对应的 reducer，执行 `reducer(oldValue, "newValue")`。
3.  **生成新快照**：更新后的状态成为下一节点的输入。

### [⚠️ 重要提示：部分更新](#️-重要提示部分更新)

节点**不需要**返回完整的状态对象，只需要返回**想更新的字段**。

```
// ✅ 正确：只返回变更字段
const node = (state) => {
  return { step: state.step + 1 };
};
// ❌ 错误：手动所有字段（除非你想覆盖）
const node = (state) => {
  return { ...state, step: state.step + 1 };
};
```

* * *

## [💡 练习题](#-练习题)

### [1\. 代码题](#1-代码题)

定义一个状态，包含一个 `logs` 字段，要求每次更新都会在前面加上时间戳，并追加到数组中。

点击查看答案

```
const StateAnnotation = Annotation.Root({
  logs: Annotation<Array<{ time?: number; msg: string }>>({
    reducer: (current, update) => [
      ...current,
      ...update.map((msg) => ({
        time: Date.now(),
        msg: typeof msg === 'string' ? msg : msg.msg,
      })),
    ],
    default: () => [],
  }),
});
// 使用示例
const node = (state) => {
  return {
    logs: [{ msg: '处理完成' }],
  };
};
```

### [2\. 纠错题](#2-纠错题)

如果一个节点返回 `{ count: 1 }`，而 `count` 字段定义的 reducer 是 `(a, b) => a + b`，且当前值为 5，那么更新后的值是多少？

点击查看答案

**答案：6**

解释：

-   当前值（a）= 5
-   更新值（b）= 1
-   Reducers执行：`5 + 1 = 6`

这就是累加型 Reducers的工作方式，它会将新值累加到旧值上，而不是直接覆盖。

### [3\. 思考题](#3-思考题)

为什么节点只需要返回"增量"更新，而不需要返回完整的状态对象？

点击查看答案

**原因有以下几点：**

1.  **简化节点逻辑**：节点只需关注自己要修改的字段，无需了解整个状态结构
2.  **提高可维护性**：当状态结构变化时，只有真正使用该字段的节点需要更新
3.  **避免意外覆盖**：如果返回完整状态，可能会意外覆盖其他节点设置的字段
4.  **性能优化**：只传递变更的数据，减少不必要的数据**示例对比：**

```
// ✅ 推荐：增量更新
const node = (state) => {
  return { step: state.step + 1 }; // 只更新 step
};
// ❌ 不推荐：完整状态
const node = (state) => {
  return {
    ...state, // 所有字段
    step: state.step + 1,
  };
};
```

LangGraph 会自动将增量更新与现有状态合并（通过 Reducer），这是框架的核心设计之一。

* * *

## [✅ 总结](#-总结)

**本章要点**：

-   状态是图中所有节点的共享数据结构
-   `Annotation` 对象提供了强大的状态定义能力
-   Reducers决定了状态"如何变"——默认覆盖，数组追加，对象合并
-   `messagesStateReducer` 为聊天场景提供了开箱即用的消息管理
-   节点只需返回"增量"更新，LangGraph 会自动处理合并

**最佳实践**：

-   保持状态最小化，只存储不可推导的信息
-   合理使用 Reducers处理复杂的状态合并逻辑
-   避免深层嵌套对象，使用扁平化设计
-   为需要累加的字段（计数器、日志）定义合适的 Reducer

**下一步**：掌握了状态，我们来看看如何编写处理这些状态的**节点**。

## 相关笔记

- [[2-3 Agent Loop 保险丝]]
- [[3-6 生产级权限系统的四层防线]]
- [[MOC - LangGraph.js 教程|LangGraph.js 教程 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
