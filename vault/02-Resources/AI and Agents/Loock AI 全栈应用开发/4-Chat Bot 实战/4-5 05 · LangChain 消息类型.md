---
title: "05 · LangChain 消息类型 — Loock AI 全栈应用开发"
tags: ["loock_ai", "chatbot", "ai_agent"]
legacy_tags: ["loock_ai", "chatbot", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/chat-bot-course/02-architecture/05-langchain-message-types"
description: "建立前端消息、序列化消息和 LangChain 运行时消息的清晰边界。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/4-Chat Bot 实战/4-5 05 · LangChain 消息类型.md"
source_sha256: "1e48c3c202cb97baa78ad1687a0e26e37e4584971bb39bafde657f3c34874ec9"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第二阶段 · 结构理解与代码组织

# 05 · LangChain 消息类型

建立前端消息、序列化消息和 LangChain 运行时消息的清晰边界。

## [课时资源](#课时资源)

-   [查看本课源码](https://github.com/loock-ai/chat-bot-course-code/tree/main/phase-02-architecture/lesson-05-langchain-message-types)

## [一、学习目标](#一学习目标)

本课所在阶段：`第二阶段 · 结构理解与代码组织`。

学完这一课后，你应该能够：

-   理解为什么前端消息、存储消息、LangChain 运行时消息需要是三种不同的结构
-   看懂 `ChatMessage`、`SerializedMessage`、`BaseMessage` 各自的职责边界
-   明白 `serializeMessages`、`deserializeMessages`、`toLangChainMessages` 三个转换函数各在什么位置被调用
-   知道这一步做完之后，记忆系统和工具调用为什么不需要重新定义消息格式

## [二、问题背景](#二问题背景)

第四课把参数解析和事件组装分到了 service 层，但消息本身还只有一种结构：`{ id, role, content }`。这个结��从前端页面状态、经过 API、到 Agent 全程都是同一份，暂时够用，但它隐藏了一个潜在问题。

随着功能增加，会有三个场景对消息格式提出不同需求：

-   **前端渲染**需要 `role: 'user' | 'assistant'`，直接决定消息气泡的样式
-   **持久化存储**需要一种不依赖前端框架的稳定格式，方便写入数据库和从数据库读出
-   **LangChain 运行时**需要 `HumanMessage`、`AIMessage` 这样的类实例，因为 LangGraph 的 `StateGraph` 只认识这些类型

这三种场景如果共用同一个结构，迟早会出现：把 LangChain 消息实例直接存数据库（序列化失败）、或者 Agent 收到了前端格式的 `{ role: 'user' }` 却不知道怎么变成 `HumanMessage`。

这一课的任务是：**在 service 层里先把三套消息格式的转换路径定清楚，后续课程直接复用。**

## [三、核心概念](#三核心概念)

这一课最重要的概念是：**消息在三个边界上各自有最合适的格式，转换发生在边界处。**

消息类型

类型名

谁持有

特点

前端可渲染消息

`ChatMessage`

页面状态

\`role: 'user'

序列化存储消息

`SerializedMessage`

service / database

\`type: 'human'

LangChain 运行时消息

`BaseMessage`

agent

`HumanMessage` / `AIMessage` 类实例

三个转换函数形成了一条单向链路：

```
ChatMessage → serializeMessages → SerializedMessage → toLangChainMessages → BaseMessage
```

反向恢复（用于从数据库读取后重建页面状态）：

```
SerializedMessage → deserializeMessages → ChatMessage
```

## [四、整体流程](#四整体流程)

#\_r\_1\_{margin:1.5rem auto 0;}#\_r\_1\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_1\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_1\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_1\_ .error-icon{fill:#a44141;}#\_r\_1\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_1\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_1\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_1\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_1\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_1\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_1\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_1\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_1\_ .marker.cross{stroke:lightgrey;}#\_r\_1\_ svg{font-family:inherit;font-size:16px;}#\_r\_1\_ p{margin:0;}#\_r\_1\_ .label{font-family:inherit;color:#ccc;}#\_r\_1\_ .cluster-label text{fill:#F9FFFE;}#\_r\_1\_ .cluster-label span{color:#F9FFFE;}#\_r\_1\_ .cluster-label span p{background-color:transparent;}#\_r\_1\_ .label text,#\_r\_1\_ span{fill:#ccc;color:#ccc;}#\_r\_1\_ .node rect,#\_r\_1\_ .node circle,#\_r\_1\_ .node ellipse,#\_r\_1\_ .node polygon,#\_r\_1\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_1\_ .rough-node .label text,#\_r\_1\_ .node .label text,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-anchor:middle;}#\_r\_1\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_1\_ .rough-node .label,#\_r\_1\_ .node .label,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-align:center;}#\_r\_1\_ .node.clickable{cursor:pointer;}#\_r\_1\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_1\_ .arrowheadPath{fill:lightgrey;}#\_r\_1\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_1\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_1\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_1\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_1\_ .cluster text{fill:#F9FFFE;}#\_r\_1\_ .cluster span{color:#F9FFFE;}#\_r\_1\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_1\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_1\_ rect.text{fill:none;stroke-width:0;}#\_r\_1\_ .icon-shape,#\_r\_1\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .icon-shape p,#\_r\_1\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_1\_ .icon-shape rect,#\_r\_1\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_1\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_1\_ :root{--mermaid-font-family:inherit;}

业务逻辑层

前端层

前端消息  
ChatMessage\[\]

序列化转换  
serializeMessages

存储格式  
SerializedMessage\[\]

运行时转换  
toLangChainMessages

LangChain 消息  
BaseMessage\[\]

工作流执行  
LangGraph StateGraph

反向恢复路径（为后续记忆系统预留）：

#\_r\_2\_{margin:1.5rem auto 0;}#\_r\_2\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_2\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_2\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_2\_ .error-icon{fill:#a44141;}#\_r\_2\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_2\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_2\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_2\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_2\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_2\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_2\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_2\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_2\_ .marker.cross{stroke:lightgrey;}#\_r\_2\_ svg{font-family:inherit;font-size:16px;}#\_r\_2\_ p{margin:0;}#\_r\_2\_ .label{font-family:inherit;color:#ccc;}#\_r\_2\_ .cluster-label text{fill:#F9FFFE;}#\_r\_2\_ .cluster-label span{color:#F9FFFE;}#\_r\_2\_ .cluster-label span p{background-color:transparent;}#\_r\_2\_ .label text,#\_r\_2\_ span{fill:#ccc;color:#ccc;}#\_r\_2\_ .node rect,#\_r\_2\_ .node circle,#\_r\_2\_ .node ellipse,#\_r\_2\_ .node polygon,#\_r\_2\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_2\_ .rough-node .label text,#\_r\_2\_ .node .label text,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-anchor:middle;}#\_r\_2\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_2\_ .rough-node .label,#\_r\_2\_ .node .label,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-align:center;}#\_r\_2\_ .node.clickable{cursor:pointer;}#\_r\_2\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_2\_ .arrowheadPath{fill:lightgrey;}#\_r\_2\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_2\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_2\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_2\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_2\_ .cluster text{fill:#F9FFFE;}#\_r\_2\_ .cluster span{color:#F9FFFE;}#\_r\_2\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_2\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_2\_ rect.text{fill:none;stroke-width:0;}#\_r\_2\_ .icon-shape,#\_r\_2\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .icon-shape p,#\_r\_2\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_2\_ .icon-shape rect,#\_r\_2\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_2\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_2\_ :root{--mermaid-font-family:inherit;}

SerializedMessage\[\]

deserializeMessages

ChatMessage\[\]

第二张图对应的是"会话恢复"场景：用户刷新页面后，从数据库取出 `SerializedMessage[]`，再用 `deserializeMessages` 转成前端可渲染的 `ChatMessage[]`。这一课还没有实现数据库，但这条路径已经设计好了。

## [五、运行过程](#五运行过程)

1.  **前端发出的仍然是 `ChatMessage[]`**
    
    `page.tsx` 的 `messages` 状态还是 `ChatMessage[]`，发给后端的 payload 格式和之前一样，不需要改动。
    
2.  **Service 层在解析时做序列化**
    
    `parseChatRequest` 现在在拼出完整 `messages` 之后，立即调用 `serializeMessages` 转成 `SerializedMessage[]`，并把 `serializedMessages` 连同原始 `messages` 一起返回。
    
3.  **Agent 接受的是 `SerializedMessage[]`**
    
    `streamChatResponse` 把 `serializedMessages` 传给 `streamChat`，Agent 的两个出口函数（`runChat`、`streamChat`）的参数类型从 `ChatMessage[]` 升级为 `SerializedMessage[]`。
    
4.  **Agent 内部用 `toLangChainMessages` 完成最后一次转换**
    
    `workflow.invoke({ messages: toLangChainMessages(messages) })` 把 `SerializedMessage[]` 转成 LangGraph 能识别的 `BaseMessage[]`，再进入状态图执行。
    
5.  **从这一课起，Agent 只依赖 `SerializedMessage`，与前端格式完全解耦**
    
    这意味着：以后 `ChatMessage` 加多模态字段（如 `attachments`），不影响 Agent 输入格式；以后从数据库读出保存的 `SerializedMessage` 恢复对话，Agent 可以直接消费，不需要转换器。
    

## [六、关键代码解析](#六关键代码解析)

**[app/types/chat.ts](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-02-architecture/lesson-05-langchain-message-types/app/types/chat.ts)** - 定义三种消息类型及转换函数

本课最重要的文件。新增了 `SerializedMessage` 类型，以及三个转换函数：`serializeMessages`、`deserializeMessages`、`toLangChainMessages`。

关键代码：

```
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}
export interface SerializedMessage {
  id: string;
  type: 'human' | 'ai';
  content: string;
}
```

代码解析：

1.  `role` 和 `type` 的命名刻意保持不同：`role` 对前端友好（直接决定气泡样式），`type` 对 LangChain 友好（与 `HumanMessage`、`AIMessage` 的内部 `_getType()` 返回值对应）。两个字段含义相近但用途不同，混用容易在后续序列化和反序列化时引入 bug。
2.  `SerializedMessage` 没有 React 组件需要的 `isStreaming`、`toolCallResults` 等字段，也没有 LangChain 运行时的 `additional_kwargs`、`response_metadata` 等字段。它只保留了跨层传递所需的最小结构，让每个层次只持有自己关心的信息。
3.  如果 `ChatMessage` 和 `SerializedMessage` 用同一个类型，很容易在 React 状态里混入 LangChain 类实例（`HumanMessage` / `AIMessage`），导致 `JSON.stringify` 时丢失方法、`===` 比较失效、React 渲染报错。建立清晰的边界是这一课最重要的保护措施。

* * *

**[app/types/chat.ts](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-02-architecture/lesson-05-langchain-message-types/app/types/chat.ts)** - 三段转换函数

关键代码：

```
ChatMessage[] -> SerializedMessage[] -> BaseMessage[]
```

把这条链路拆开后，每一层都只处理自己最擅长的表示方式。数据库不会碰 LangChain 类实例，前端也不用知道 `HumanMessage` 是什么。

```
export function serializeMessages(messages: ChatMessage[]): SerializedMessage[] {
  return messages.map((m) => ({
    id: m.id,
    type: m.role === 'user' ? 'human' : 'ai',
    content: m.content,
  }));
}
export function deserializeMessages(messages: SerializedMessage[]): ChatMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.type === 'human' ? 'user' : 'assistant',
    content: m.content,
  }));
}
export function toLangChainMessages(messages: SerializedMessage[]): BaseMessage[] {
  return messages.map((m) =>
    m.type === 'ai' ? new AIMessage(m.content) : new HumanMessage(m.content)
  );
}
```

代码解析：

1.  三个函数都是纯函数：给定输入，返回新数组，没有副作用。这让它们非常容易单独测试——不需要启动服务器、不需要 mock 任何依赖，直接构造数组输入验证输出即可。
2.  `serializeMessages` 和 `deserializeMessages` 互为反函数：`deserializeMessages(serializeMessages(msgs))` 应该等价于原始 `msgs`（内容上等价，不是引用相同）。这个性质很重要，记忆系统下一课会依赖它来"存入数据库、取出后恢复"。
3.  `toLangChainMessages` 是最后一步：把 `SerializedMessage[]` 转成 LangChain 的类实例。注意它的结果**不应该被序列化存储**——类实例序列化后无法直接反序列化回来。这就是为什么存储层要用 `SerializedMessage` 而不是 `BaseMessage`。
4.  如果省掉 `SerializedMessage` 这一层，直接从 `ChatMessage` 转 `BaseMessage`，那么"从数据库恢复"的路径就无从实现——数据库里存的如果是 LangChain 类实例的 JSON，取出来只能得到一个普通对象，无法直接作为 `HumanMessage` 使用。`SerializedMessage` 这一层的存在，正是为了给数据库层提供一个可以安全序列化/反序列化的标准格式。

* * *

**[app/services/chat.service.ts](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-02-architecture/lesson-05-langchain-message-types/app/services/chat.service.ts)** - 在解析时进行序列化

在 `parseChatRequest` 里新增了序列化这一步，并把 `serializedMessages` 传给下游 Agent。

* * *

**[app/agent/chatbot.ts](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-02-architecture/lesson-05-langchain-message-types/app/agent/chatbot.ts)** - 接收序列化消息并转换为 LangChain 消息

接口从接收 `ChatMessage[]` 升级成接收 `SerializedMessage[]`，内部通过 `toLangChainMessages` 转成 LangGraph 可用的 `BaseMessage[]`。

## [七、常见问题](#七常见问题)

### [为什么不直接把 `HumanMessage` / `AIMessage` 存进数据库？](#为什么不直接把-humanmessage--aimessage-存进数据库)

LangChain 的消息类是有方法的类实例，`JSON.stringify` 会丢失方法（只保留数据字段），也可能包含循环引用（`additional_kwargs` 里有时有复杂对象）。从数据库读出来的是普通 JSON 对象，无法直接当 `HumanMessage` 实例使用。`SerializedMessage` 是一个简单的 POJO，序列化/反序列化完全安全。

### [`deserializeMessages` 这一课为什么还没真正用到？](#deserializemessages-这一课为什么还没真正用到)

这一课还没有用到——因为还没有数据库。它在这里是为第六课（记忆系统）预留的。记忆系统需要从内存 Map 里取出历史消息再渲染到页面，到时候就会用 `deserializeMessages` 把 `SerializedMessage[]` 转回 `ChatMessage[]`。

### [为什么 `SerializedMessage` 的 `type` 字段用 `'human' | 'ai'` 而不是继续用 `'user' | 'assistant'`？](#为什么-serializedmessage-的-type-字段用-human--ai-而不是继续用-user--assistant)

因为 `'human'` 和 `'ai'` 是 LangChain 消息系统的约定用词，和 `HumanMessage`、`AIMessage` 的类名直接对应。用这个命名让转换函数的逻辑更直观，也方便以后直接对照 LangChain 文档。

### [这一课 page.tsx 有没有变化？](#这一课-pagetsx-有没有变化)

没有变化。前端看到的仍然是 `ChatMessage[]`，这一课的所有改动都在后端（service 层 + agent 层 + types 层）。这再一次说明了分层的价值：消息表达方式的演进不需要动前端。

## [八、练习题](#八练习题)

1.  用表格的方式，写出三种消息类型（`ChatMessage`、`SerializedMessage`、`BaseMessage`）的字段对比和主要使用场景。
2.  解释 `serializeMessages` 和 `toLangChainMessages` 的区别：为什么要分成两步，而不是直接从 `ChatMessage[]` 转 `BaseMessage[]`？
3.  在 `app/types/chat.ts` 里加一个测试：对同一组 `ChatMessage[]` 先序列化再反序列化，验证内容是否保持一致。
4.  如果 `ChatMessage` 要加一个 `attachments?: string[]` 字段，`SerializedMessage` 是否需要同步修改？这个选择会影响后面哪些层？说明你的判断依据。

## [九、总结](#九总结)

这一课真正建立的是：**三套消息格式各有各的职责边界，转换在明确的位置发生。**

只要你已经能说清楚三种消息类型分别在哪里出现、三个转换函数各自做什么、为什么 `SerializedMessage` 作为中间层是必要的，这一课就掌握了。

和参考项目相比，这一课只处理了纯文本消息的三层格式。参考项目的完整实现还覆盖了多模态内容、工具调用消息（`ToolMessage`）和从 Supabase 读出的复杂存储格式，但核心的三层边界设计思路是完全一致的。

## 相关笔记

- [[4-9 Agent 的记忆系统]]
- [[3-1 Function Calling 与 Structured Output]]
- [[2-3 Agent Loop 保险丝]]
- [[2-1 流式响应工程真相]]
- [[3-6 生产级权限系统的四层防线]]
- [[MOC - Chat Bot 实战|Chat Bot 实战 章节索引]]
