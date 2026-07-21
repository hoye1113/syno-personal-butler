---
title: "配置管理与 Configurable — Loock AI 全栈应用开发"
tags: ["loock_ai", "langgraphjs_tutorial", "ai_agent"]
legacy_tags: ["loock_ai", "langgraphjs-tutorial", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/langgraphjs/05-utility-functions/02-configuration"
description: "使用 RunnableConfig 动态控制图的行为，实现参数热更新"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/2-LangGraph.js 教程/2-13 配置管理与 Configurable.md"
source_sha256: "a6883ebdf2234fb454caef75481c5818c3bd2420d127542b75c9e7225e6e847b"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

实用功能

# 配置管理与 Configurable

使用 RunnableConfig 动态控制图的行为，实现参数热更新

## [📚 学习目标](#-学习目标)

学完这篇文章后，你将能够：

-   理解 `RunnableConfig` 对象的作用
-   在节点中访问运行时配置
-   实现可配置的 Agent（如动态切换模型、Prompt）

## [前置知识](#前置知识)

在开始学习之前，建议先阅读：

-   [01-visualization](./01-visualization)

你需要了解：

-   环境变量的基本概念

* * *

## [1 什么是 RunnableConfig？](#1-什么是-runnableconfig)

在调用 `invoke`, `stream`, `batch` 时，LangGraph 允许传入第二个参数：`RunnableConfig`。

```
import { RunnableConfig } from '@langchain/core/runnables';
await app.invoke(inputs, {
  configurable: {
    model: "gpt-4",
    temperature: 0.5
  },
  recursionLimit: 50,
  runName: "MyAgentRun"
});
```

这些配置不仅控制运行时的行为（如递归限制），还可以透传给图中的每个节点。

如果你把它当成一个“运行时上下文对象”会更好理解：

-   `configurable`：你自定义的运行参数（用户ID、模型名、feature flag...）
-   `tags/metadata`：可观测性与追踪用（打标签、记录额外信息）
-   `recursionLimit`：防止循环失控

* * *

## [2 RunnableConfig 里常用的字段](#2-runnableconfig-里常用的字段)

下面是一个“面向教学”的简化心智模型（不同版本字段可能略有差异）：

```
export type ExampleRunnableConfig = {
  configurable?: Record<string, unknown>;
  tags?: string[];
  metadata?: Record<string, unknown>;
  recursionLimit?: number;
  runName?: string;
};
```

* * *

## [3 节点内访问配置](#3-节点内访问配置)

节点函数的第二个参数就是 `config`。

```
const myNode = async (state: State, config: RunnableConfig) => {
  // 1. 获取配置
  const modelName = config.configurable?.model || "gpt-3.5-turbo";
  
  // 2. 使用配置
  const model = new ChatOpenAI({ model: modelName });
  const response = await model.invoke(state.messages);
  
  return { messages: [response] };
};
```

### [为什么这很有用？](#为什么这很有用)

-   **多租户支持**：不同用户使用不同的 prompt 或模型。
-   **A/B 测试**：运行时动态决定使用哪个策略。
-   **安全性**：动态传入 User ID 或 API Token。

**📝 提醒**

不要把明文 API Key 放进 `configurable`。更稳妥的方式是传 `keyId` / `tenantId`，在节点里再去你的密钥系统取真实 key。

* * *

## [4 预置配置项](#4-预置配置项)

LangGraph 有一些内置的配置键：

-   **recursionLimit**: 最大递归深度（默认 25）。防止死循环。
-   **thread\_id**: 用于 Checkpoint 持久化（区分不同会话）。
-   **runName**: 在 LangSmith 追踪中显示的名称。

```
// 防止死循环的保护机制
try {
  await app.invoke(inputs, { recursionLimit: 5 });
} catch (e) {
  console.log("达到递归限制！");
}
```

* * *

## [5 配置继承：子图/节点如何拿到同一套参数](#5-配置继承子图节点如何拿到同一套参数)

当你把一个“编译后的 subgraph”当作节点接入父图时，运行时配置通常会沿调用链传递下去。

#\_r\_1\_{margin:1.5rem auto 0;}#\_r\_1\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_1\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_1\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_1\_ .error-icon{fill:#a44141;}#\_r\_1\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_1\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_1\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_1\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_1\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_1\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_1\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_1\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_1\_ .marker.cross{stroke:lightgrey;}#\_r\_1\_ svg{font-family:inherit;font-size:16px;}#\_r\_1\_ p{margin:0;}#\_r\_1\_ .label{font-family:inherit;color:#ccc;}#\_r\_1\_ .cluster-label text{fill:#F9FFFE;}#\_r\_1\_ .cluster-label span{color:#F9FFFE;}#\_r\_1\_ .cluster-label span p{background-color:transparent;}#\_r\_1\_ .label text,#\_r\_1\_ span{fill:#ccc;color:#ccc;}#\_r\_1\_ .node rect,#\_r\_1\_ .node circle,#\_r\_1\_ .node ellipse,#\_r\_1\_ .node polygon,#\_r\_1\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_1\_ .rough-node .label text,#\_r\_1\_ .node .label text,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-anchor:middle;}#\_r\_1\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_1\_ .rough-node .label,#\_r\_1\_ .node .label,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-align:center;}#\_r\_1\_ .node.clickable{cursor:pointer;}#\_r\_1\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_1\_ .arrowheadPath{fill:lightgrey;}#\_r\_1\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_1\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_1\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_1\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_1\_ .cluster text{fill:#F9FFFE;}#\_r\_1\_ .cluster span{color:#F9FFFE;}#\_r\_1\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_1\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_1\_ rect.text{fill:none;stroke-width:0;}#\_r\_1\_ .icon-shape,#\_r\_1\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .icon-shape p,#\_r\_1\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_1\_ .icon-shape rect,#\_r\_1\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_1\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_1\_ :root{--mermaid-font-family:inherit;}

Graph Invoke Config

父图

子图/子流程

节点

* * *

## [6 配置优先级](#6-配置优先级)

当同一参数在多处定义时，优先级通常是：

1.  **运行时传入**（invoke/stream）
2.  **节点内覆盖**（节点逻辑里手动覆盖）
3.  **默认值**（Annotation/代码默认值）

```
const config = { configurable: { model: 'gpt-4' } };
await app.invoke(inputs, config); // 最高优先级
```

## [7 环境变量 + Configurable 组合](#7-环境变量--configurable-组合)

你可以用环境变量做全局默认，用 configurable 做动态覆盖：

```
const defaultModel = process.env.OPENAI_MODEL_NAME ?? 'gpt-4o-mini';
const modelName = config.configurable?.model ?? defaultModel;
```

**💡 说明**

环境变量适合部署级配置，configurable 适合运行时差异化。

## [8 A/B 测试示例](#8-ab-测试示例)

通过 config 传入实验组：

```
const group = config.configurable?.experiment ?? 'control';
const temperature = group === 'variant' ? 0.7 : 0.2;
```

## [9 类型安全与校验](#9-类型安全与校验)

为了避免运行时出错，建议给 configurable 做简单校验：

```
const ConfigSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
});
const safeConfig = ConfigSchema.parse(config.configurable ?? {});
```

**⚠️ 注意**

校验失败时要有兜底策略，避免直接崩溃。

* * *

## [💡 练习题](#-练习题)

1.  **编码题**：修改你的 ReAct Agent，使其接受一个 `systemPrompt` 配置参数。在运行时动态传入不同的角色设定（如“你是一个海盗” vs “你是一个医生”）。
    
    点击查看答案
    
    在节点中读取 `config.configurable?.systemPrompt`，作为 SystemMessage 注入。
    
2.  **场景题**：如果在 `configurable` 中传入了一个敏感的 API Key，它会被 LangSmith 记录吗？如何避免？
    
    点击查看答案
    
    不建议明文传入；可以传 `keyId` 并在节点内获取真实密钥。
    
3.  **操作题**：为配置添加 `temperature` 校验，超出范围自动回退默认值。
    
    点击查看答案
    
    用 zod 校验并在 catch 中回退默认温度。
    
4.  **思考题**：什么时候应该用环境变量而不是 configurable？
    
    点击查看答案
    
    环境变量适合部署级配置，configurable 适合运行时差异化。
    
5.  **操作题**：实现一个简单的 A/B 测试配置，控制不同温度值。
    
    点击查看答案
    
    根据 `config.configurable?.experiment` 选择温度。
    

* * *

## [✅ 总结](#-总结)

**本章要点**：

-   `configurable` 字段是运行时动态传参的主要通道。
-   节点函数的签名是 `(state, config) => ...`。
-   合理使用配置可以让你的 Graph 更加通用和灵活。

**下一步**：如果运行出错了怎么办？继续学习：[错误处理](./03-error-handling)。

## 相关笔记

- [[4-9 Agent 的记忆系统]]
- [[2-3 Agent Loop 保险丝]]
- [[2-1 流式响应工程真相]]
- [[3-6 生产级权限系统的四层防线]]
- [[MOC - LangGraph.js 教程|LangGraph.js 教程 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
