---
title: "09 · 模型切换与 Provider — Loock AI 全栈应用开发"
tags: ["loock_ai", "chatbot", "ai_agent"]
legacy_tags: ["loock_ai", "chatbot", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/chat-bot-course/04-models-and-multimodal/09-model-switching-and-provider"
description: "把模型选择、工具选择和线程记忆统一进同一条真实工作流，支持多模型和多 provider 切换。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/4-Chat Bot 实战/4-9 09 · 模型切换与 Provider.md"
source_sha256: "c085d367c1952bd19403bec7f6a14e907d74065d06334e3a1f02ebec9c7100f1"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第四阶段 · 模型与多模态扩展

# 09 · 模型切换与 Provider

把模型选择、工具选择和线程记忆统一进同一条真实工作流，支持多模型和多 provider 切换。

## [课时资源](#课时资源)

-   [查看本课源码](https://github.com/loock-ai/chat-bot-course-code/tree/main/phase-04-models-and-multimodal/lesson-09-model-switching-and-provider)

## [一、学习目标](#一学习目标)

本课所在阶段：`第四阶段 · 模型与多模态扩展`。

学完这一课后，你应该能够：

-   理解为什么模型选择不能写死在 Agent 里
-   看懂 `modelId`、`toolIds`、`threadId` 怎样从前端一路流到后端工作流
-   明白 `MemorySaver`、`bindTools(...)`、`ToolNode` 在这一课里分别扮演什么角色
-   知道这一课已经开始接真实模型，而不是继续用教学模板回复

## [二、问题背景](#二问题背景)

到了这个阶段，聊天应用已经不能只满足于"能聊天、能记忆、能调工具"。真实项目里你很快会遇到两个新问题：

-   同一个页面可能要切不同模型，比如 `qwen-plus`、`qwen-turbo`、`gemini-2.5-flash`
-   同一条消息未必总要绑定全部工具，工具启用范围也应该跟着请求变化

如果没有这一课，后面会越来越难演进：

-   前端看不到当前到底使用了哪个模型
-   后端没法根据 `modelId` 创建不同 provider 的模型实例
-   第八课已经建立的统一工具配置，也还没和模型切换真正合并成一条可运行链路

这一课真正要解决的，不是"做一个下拉框"，而是把模型选择、工具选择和线程记忆统一进同一条真实工作流。

## [三、核心概念](#三核心概念)

这一课最重要的不是 UI，而是三条输入链路第一次同时进入 Agent：

1.  `modelId` 决定这轮消息到底用哪个模型、哪个 provider
2.  `toolIds` 决定这轮消息到底允许绑定哪些工具
3.  `threadId` 决定这轮消息要续接哪条历史线程

你可以把它理解成：从这一课开始，聊天工作流真正进入"参数化运行"阶段。工作流不再只依赖消息文本本身，而是同时依赖模型、工具和线程上下文。

### [这一课相对第 08 课的核心增量](#这一课相对第-08-课的核心增量)

维度

第 08 课

第 09 课

模型来源

隐式固定模型

显式 `modelId`

provider 适配

不对用户暴露

开始支持 OpenAI 兼容和 Google provider

工作流缓存 key

只跟工具组合相关

跟 `modelId::toolIds` 组合相关

前端状态

会话 + 工具选择

会话 + 工具选择 + 模型选择

事件流

`session.start`、`tool.call`、文本事件

额外新增 `model.selected`

## [四、整体流程](#四整体流程)

#\_r\_1\_{margin:1.5rem auto 0;}#\_r\_1\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_1\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_1\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_1\_ .error-icon{fill:#a44141;}#\_r\_1\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_1\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_1\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_1\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_1\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_1\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_1\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_1\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_1\_ .marker.cross{stroke:lightgrey;}#\_r\_1\_ svg{font-family:inherit;font-size:16px;}#\_r\_1\_ p{margin:0;}#\_r\_1\_ .label{font-family:inherit;color:#ccc;}#\_r\_1\_ .cluster-label text{fill:#F9FFFE;}#\_r\_1\_ .cluster-label span{color:#F9FFFE;}#\_r\_1\_ .cluster-label span p{background-color:transparent;}#\_r\_1\_ .label text,#\_r\_1\_ span{fill:#ccc;color:#ccc;}#\_r\_1\_ .node rect,#\_r\_1\_ .node circle,#\_r\_1\_ .node ellipse,#\_r\_1\_ .node polygon,#\_r\_1\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_1\_ .rough-node .label text,#\_r\_1\_ .node .label text,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-anchor:middle;}#\_r\_1\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_1\_ .rough-node .label,#\_r\_1\_ .node .label,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-align:center;}#\_r\_1\_ .node.clickable{cursor:pointer;}#\_r\_1\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_1\_ .arrowheadPath{fill:lightgrey;}#\_r\_1\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_1\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_1\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_1\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_1\_ .cluster text{fill:#F9FFFE;}#\_r\_1\_ .cluster span{color:#F9FFFE;}#\_r\_1\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_1\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_1\_ rect.text{fill:none;stroke-width:0;}#\_r\_1\_ .icon-shape,#\_r\_1\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .icon-shape p,#\_r\_1\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_1\_ .icon-shape rect,#\_r\_1\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_1\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_1\_ :root{--mermaid-font-family:inherit;}

业务逻辑层

API 路由层

前端层

输入区选择模型和工具  
ChatInput

发送请求  
message + threadId + modelId + toolIds

接收 model.selected  
更新当前模型标签

聊天请求  
POST api/chat

解析请求参数  
chat.service.ts

发出 SSE 事件  
model.selected + tool.call + message.delta

解析模型  
resolveModel(modelId)

创建模型实例  
createModel(modelId)

创建工具集合  
createLangChainTools(toolIds)

构建或复用工作流  
getChatApp(modelId, toolIds)

## [五、运行过程](#五运行过程)

### [1\. 前端同时管理模型和工具](#1-前端同时管理模型和工具)

这一课里，`page.tsx` 已经不只维护 `selectedToolIds`，还新增了：

-   `modelId`
-   `activeModelLabel`

所以从这里开始，输入区已经同时控制两类选择：

1.  这轮用哪个模型
2.  这轮允许哪些工具

### [2\. 请求体开始携带四个关键字段](#2-请求体开始携带四个关键字段)

前端发送请求时，已经变成：

```
body: JSON.stringify({ message: content, threadId, modelId, toolIds: selectedToolIds })
```

这四个字段分别控制：

-   `message`：当前用户输入
-   `threadId`：续接哪条会话
-   `modelId`：本轮用哪个模型
-   `toolIds`：本轮启用哪些工具

### [3\. 服务层先解析模型，再发 `model.selected`](#3-服务层先解析模型再发-modelselected)

`streamChatResponse` 在正式输出文本前，会先发：

```
yield { event: 'model.selected', data: resolveModel(modelId) };
```

这一步的作用是让前端在第一段文本出现前，就知道当前实际选中的是哪个模型，并把侧边栏 footer 或页面标签及时更新。

### [4\. Agent 按模型和工具组合构建工作流](#4-agent-按模型和工具组合构建工作流)

第八课的缓存 key 只和工具组合有关；第九课升级成：

```
return `${modelKey}::${toolKey}`;
```

这意味着"同一组工具但不同模型"不再共用一套工作流实例，而是明确区分为不同运行配置。

### [5\. 工作流内部仍然保留记忆和工具调用](#5-工作流内部仍然保留记忆和工具调用)

这一课并没有抛弃前面两课建立的能力，而是把它们全部保留下来：

-   记忆：继续由 `MemorySaver` 负责
-   工具调用：继续由 `bindTools(...) + ToolNode` 负责
-   模型切换：新增加在最外层模型工厂上

所以这节课本质上是在做能力叠加，而不是推翻前面结构。

## [六、关键代码解析](#六关键代码解析)

**[app/agent/config/models.config.ts](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-04-models-and-multimodal/lesson-09-model-switching-and-provider/app/agent/config/models.config.ts)** - 定义这一课可选的模型列表，并通过 `resolveModel` 解析默认模型。

关键代码：

```
export function resolveModel(modelId?: string) {
  return modelOptions.find((option) => option.id === modelId) ?? modelOptions[0];
}
```

代码解析：

前端传来的 `modelId` 并不一定总是有效，比如：

-   初次加载时还没选
-   某个旧值已经不在当前模型列表里

这一层解析能保证服务端始终回退到一个稳定默认模型，而不是把非法值直接带进模型创建流程。

1.  前端可能传一个已删除的模型 ID，或者空字符串
2.  `find` 找不到时，回退到 `modelOptions[0]` 作为默认值
3.  这样模型选择层就有了一层安全兜底，不会因为非法 ID 导致整个请求失败

**[app/agent/chatbot.ts](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-04-models-and-multimodal/lesson-09-model-switching-and-provider/app/agent/chatbot.ts)** - 本课最关键的后端入口。它按 `modelId` 和 `toolIds` 动态构建工作流，并缓存不同组合对应的 app。

关键代码 1：工作流缓存 key 要同时包含模型和工具

```
function getWorkflowKey(modelId?: string, toolIds?: string[]) {
  const modelKey = modelId || resolveModel().id;
  const toolKey = !toolIds || toolIds.length === 0 ? '__no_tools__' : [...new Set(toolIds)].sort().join(',');
  return `${modelKey}::${toolKey}`;
}
```

代码解析：

如果这里只按 `toolIds` 做缓存，那么切换模型时就会错误复用旧模型对应的工作流实例。这一课新增 `modelKey`，正是为了把"模型差异"提升为工作流配置的一部分。

1.  `modelKey` 默认用当前选择的 `modelId`，没有时用解析出的默认值
2.  `toolKey` 对工具 ID 去重、排序，保证组合唯一性
3.  双重 key 确保不同模型、不同工具组合都有各自的工作流实例
4.  切换模型后不会误用之前缓存的旧模型工作流

关键代码 2：动态构建带模型的工作流

```
function buildChatApp(modelId?: string, toolIds?: string[]) {
  const tools = createLangChainTools(toolIds);
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode('chatbot', async (state) => {
      const model = createModel(modelId);
      const modelMessages = toModelMessages(state.messages);
      const response = tools.length > 0 ? await model.bindTools(tools).invoke(modelMessages) : await model.invoke(modelMessages);
      return { messages: [response] };
    })
    .addNode('tools', new ToolNode(tools))
    .addEdge(START, 'chatbot')
    .addConditionalEdges('chatbot', shouldContinue, {
      tools: 'tools',
      [END]: END,
    })
    .addEdge('tools', 'chatbot');
  return workflow.compile({ checkpointer });
}
```

代码解析：

1.  `modelId` 第一次进入工作流构建函数，不再是隐式固定值
2.  `createModel(modelId)` 根据模型 ID 创建对应 provider 的模型实例
3.  工具绑定逻辑保持不变，只是现在工具和模型都成了可配置参数
4.  相同的 `modelId::toolIds` 组合会复用已缓存的工作流实例

**[app/services/chat.service.ts](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-04-models-and-multimodal/lesson-09-model-switching-and-provider/app/services/chat.service.ts)** - 负责解析 `modelId`、`toolIds`，并在流开始前发出 `model.selected` 事件。

关键代码：

```
yield { event: 'model.selected', data: resolveModel(modelId) };
```

代码解析：

前端不能只根据本地 `modelId` 猜测当前模型名称，因为真正生效的是服务端 `resolveModel(modelId)` 后的结果。通过事件把最终解析结果推回前端，页面状态和服务端执行状态才会一致。

1.  前端选择的 `modelId` 可能是无效值
2.  服务端通过 `resolveModel` 确定最终使用的模型
3.  `model.selected` 事件把最终模型的 `name` 推回前端
4.  前端据此更新 `activeModelLabel`，让用户看到真正生效的模型

**[app/page.tsx](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-04-models-and-multimodal/lesson-09-model-switching-and-provider/app/page.tsx)** - 维护 `modelId`、`selectedToolIds`、`activeModelLabel` 等状态，并把这些选择发送给后端。

关键代码：

```
// 用户切换模型
onModelChange={(value) => {
  setModelId(value);
  const nextModel = modelOptions.find((option) => option.id === value);
  if (nextModel) setActiveModelLabel(nextModel.name);
}}
// 发送消息
body: JSON.stringify({ message: content, threadId, modelId, toolIds: selectedToolIds })
```

代码解析：

1.  用户在 `ModelSelector` 里切换模型，`page.tsx` 更新 `modelId`
2.  发送消息时，`modelId` 和 `toolIds` 一起作为请求参数
3.  服务端通过 `resolveModel` 确定最终模型，并通过事件推回前端
4.  `chatbot.ts` 用 `modelId` 创建对应 provider 的模型实例

**[app/components/ModelSelector.tsx](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-04-models-and-multimodal/lesson-09-model-switching-and-provider/app/components/ModelSelector.tsx)** - 承接模型切换 UI，让模型选择真正进入输入区交互。

**[app/api/chat/route.ts](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-04-models-and-multimodal/lesson-09-model-switching-and-provider/app/api/chat/route.ts)** - 除了聊天和历史恢复，还通过 `getChatBootstrap()` 为前端返回初始 `sessions + tools`。

## [七、常见问题](#七常见问题)

### [为什么这一课已经有模型切换，但还保留工具面板？](#为什么这一课已经有模型切换但还保留工具面板)

因为真实项目里模型和工具不是两套彼此独立的系统。它们都会共同影响这轮 Agent 调用。

### [为什么这里继续用 `MemorySaver`？](#为什么这里继续用-memorysaver)

因为这一课的重点不是数据库，而是让"模型选择 + 工具选择 + 会话记忆"三条链路先跑通。`MemorySaver` 仍然是当前最合适的中间版本。

### [默认为什么优先是 OpenAI 兼容模式？](#默认为什么优先是-openai-兼容模式)

因为当前课程环境已经接好了 DashScope 的 OpenAI 兼容端点，这能让你先把真实模型跑起来，再理解 provider 差异。

### [这一课和下一课多模态上传是什么关系？](#这一课和下一课多模态上传是什么关系)

这一课解决"模型选择"，下一课解决"图片附件"。两者是独立的扩展方向：一个在输入类型上扩展（文本 -> 多模态），一个在模型能力上扩展（单一模型 -> 多模型）。

## [八、练习题](#八练习题)

1.  解释 `modelId`、`toolIds`、`threadId` 这三个字段分别控制什么。
2.  如果你只想让这一轮消息启用 `current_time`，前端和后端各会发生什么变化？
3.  为什么工作流缓存 key 不能只看 `toolIds`，还必须包含 `modelId`？
4.  说明 `model.selected` 事件和本地 `setModelId(...)` 的职责有什么不同。
5.  假设要新增一个 Anthropic provider 模型，最少需要修改哪几个文件？

## [九、总结](#九总结)

这一课真正建立的是：把模型选择、工具选择和会话记忆统一进一条真实工作流。

只要你已经能说清 `ChatInput -> page.tsx -> chat.service.ts -> chatbot.ts` 这条链路，以及 `modelId`、`toolIds`、`threadId` 分别怎样参与调用，这一课就掌握了。

## 相关笔记

- [[4-9 Agent 的记忆系统]]
- [[3-1 Function Calling 与 Structured Output]]
- [[2-1 流式响应工程真相]]
- [[3-6 生产级权限系统的四层防线]]
- [[4-4 Cache 全解与成本控制]]
- [[MOC - Chat Bot 实战|Chat Bot 实战 章节索引]]
