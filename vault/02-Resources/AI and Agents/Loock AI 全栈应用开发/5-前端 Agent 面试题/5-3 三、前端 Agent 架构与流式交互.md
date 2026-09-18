---
title: "三、前端 Agent 架构与流式交互 — 前端 Agent 面试题锦集 — Loock AI 全栈应用开发"
tags: ["loock_ai", "frontend_agent_interview", "interview", "ai_agent"]
legacy_tags: ["loock_ai", "frontend_agent_interview", "interview", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/langgraphjs-frontend-agent-interview/interview"
description: "Loock AI 前端 Agent 面试题：三、前端 Agent 架构与流式交互"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/5-前端 Agent 面试题/5-3 三、前端 Agent 架构与流式交互.md"
source_sha256: "c00bfbea9d385c43748ec3a6fa49bf262e893b72ff391b48912ed2a27d1b26cb"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---


# 三、前端 Agent 架构与流式交互

### [20\. 前端 Agent 为什么推荐“前端 UI + 后端 Runtime”分层？](#20-前端-agent-为什么推荐前端-ui--后端-runtime分层)

**参考答案：**

因为安全和稳定边界不同：密钥、数据库写操作、私有 API、权限控制都应在后端；前端负责交互与可视化。

这会带来三个收益：

-   减少敏感信息暴露
-   更易做统一审计与鉴权
-   前端渲染可独立迭代

### [21\. 为什么说“Agent 不是前端组件，而是状态机/工作流系统”？](#21-为什么说agent-不是前端组件而是状态机工作流系统)

**参考答案：**

前端组件解决的是视图问题；Agent 解决的是决策和执行问题。

把 Agent 建模成状态机后，才有能力系统化处理：重试、回滚、中断恢复、并行分支和观测。

### [22\. 前端只做聊天窗口会有哪些短板？](#22-前端只做聊天窗口会有哪些短板)

**参考答案：**

纯消息 UI 往往看不到“过程”，用户只能看到结果。

缺失项通常包括：

-   工具调用状态
-   步骤级进度
-   错误定位与人工接管入口
-   历史回放与审计视图

### [23\. 如何设计“可中断审批”的前端体验？](#23-如何设计可中断审批的前端体验)

**参考答案：**

**重要**：`interrupt()` 必须在服务端节点中调用，浏览器环境不支持。

后端在关键节点触发 `interrupt()` 并持久化状态；前端通过流式事件监听到中断信号后渲染审批面板；用户提交后向服务端发送恢复请求，服务端使用同一 `thread_id` 调用 `Command({ resume: userInput })`。

**代码示例：**

```
// ❌ 错误：浏览器中无法直接使用 interrupt
// const result = await interrupt("审批"); 
// ✅ 正确：服务端节点
const approvalNode = async (state) => {
  const userDecision = await interrupt({ 
    type: "approval", 
    data: state.draftOrder 
  });
  return { approved: userDecision };
};
// 前端恢复（发送到 API 路由）
await fetch("/api/agent/resume", {
  method: "POST",
  body: JSON.stringify({ 
    thread_id: "user-123", 
    resume_value: "approved" 
  })
});
```

要点是"线程不变、状态延续、审批有审计、服务端执行"。

### [24\. 为什么要区分“服务端工具”和“客户端工具”？](#24-为什么要区分服务端工具和客户端工具)

**参考答案：**

服务端工具处理高风险与高权限操作，客户端工具处理本地能力与轻交互（如浏览器 API、位置、确认弹窗）。

这是一种安全边界和体验边界的折中设计。

### [25\. LangGraph.js 常见 `streamMode` 有哪些？](#25-langgraphjs-常见-streammode-有哪些)

**参考答案：**

常用模式包括：

-   `updates`：状态增量
-   `values`：状态全量
-   `messages`：token 级输出与元数据
-   `debug` / `custom`：调试或自定义事件

### [26\. 什么时候用 `updates`，什么时候用 `messages`？](#26-什么时候用-updates什么时候用-messages)

**参考答案：**

`updates` 用于展示流程推进（节点完成、状态变化）；`messages` 用于实时文本流。

实战里通常“双流并行”：

-   内容区消费 `messages`
-   步骤区消费 `updates`

### [27\. 前端如何避免流式渲染性能抖动？](#27-前端如何避免流式渲染性能抖动)

**参考答案：**

典型做法：

-   token 更新节流（throttle/debounce）
-   批量刷新而非逐 token 重绘
-   虚拟列表 + 分区渲染（消息区/步骤区分离）

目标是避免频繁重排（reflow）和滚动抖动。

### [28\. 前端如何同时展示“内容流”和“步骤流”？](#28-前端如何同时展示内容流和步骤流)

**参考答案：**

建议把展示层拆成两条通道：

-   主聊天区：token 内容流
-   侧栏/时间线：步骤与工具状态

这样用户既知道“模型在说什么”，也知道“系统正在做什么”。

### [29\. 客户端工具状态机该如何设计？](#29-客户端工具状态机该如何设计)

**参考答案：**

至少覆盖以下状态：`pending -> running -> success | error | denied | timeout`。

同时要保证两点：

-   工具完成后必须回填 tool output
-   异常状态必须可见、可重试、可追踪

## 相关笔记

- [[3-1 Function Calling 与 Structured Output]]
- [[2-1 流式响应工程真相]]
- [[3-6 生产级权限系统的四层防线]]
- [[1-8 人机交互|人机交互（参见 Loock AI 1-8）]]
- [[MOC - 前端 Agent 面试题|前端 Agent 面试题 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
