---
title: "01 · 最小 Agent 架构 — Loock AI 全栈应用开发"
tags: ["loock_ai", "coding_agent", "ai_agent"]
legacy_tags: ["loock_ai", "coding_agent", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/mini-coding-agent/01-minimal-agent/01-architecture"
description: "拆解一个 Coding Agent 需要哪些基础部件，理解输入、状态、模型、工具、输出五层各自负责什么，为动手搭建建立清晰的心智模型。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/6-从 0 实现 Coding Agent/6-6 01 · 最小 Agent 架构.md"
source_sha256: "8322f77a11a273684eeb0908b4d6b9019cf036b9527203796dd8a98c8efe7867"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第 1 章 · 最小可用 Agent

# 01 · 最小 Agent 架构

拆解一个 Coding Agent 需要哪些基础部件，理解输入、状态、模型、工具、输出五层各自负责什么，为动手搭建建立清晰的心智模型。

## [从零开始，不跳步骤](#从零开始不跳步骤)

第 0 章建立了全局认知，知道了 Coding Agent 是什么、主流产品怎么设计、这门课要做什么。从这一章开始写代码。

但不是一上来就写代码。先把架构想清楚——不是画一张完美的大图，而是搞清楚最小的那几块分别是什么、怎么拼在一起。先想清楚再动手，后面才不会反复拆了重来。

这一节做的事情是：把一个 Coding Agent 拆成五个部件，讲清楚每个部件负责什么、为什么需要它、它和其他部件怎么配合。下一节才开始真正写代码。

## [一个类比：Agent 是一条流水线](#一个类比agent-是一条流水线)

想象一条工厂流水线。原材料从一端进来（用户任务），经过几个工位依次处理，最终从另一端出来（回答或动作结果）。

#\_r\_1\_{margin:1.5rem auto 0;}#\_r\_1\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_1\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_1\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_1\_ .error-icon{fill:#a44141;}#\_r\_1\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_1\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_1\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_1\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_1\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_1\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_1\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_1\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_1\_ .marker.cross{stroke:lightgrey;}#\_r\_1\_ svg{font-family:inherit;font-size:16px;}#\_r\_1\_ p{margin:0;}#\_r\_1\_ .label{font-family:inherit;color:#ccc;}#\_r\_1\_ .cluster-label text{fill:#F9FFFE;}#\_r\_1\_ .cluster-label span{color:#F9FFFE;}#\_r\_1\_ .cluster-label span p{background-color:transparent;}#\_r\_1\_ .label text,#\_r\_1\_ span{fill:#ccc;color:#ccc;}#\_r\_1\_ .node rect,#\_r\_1\_ .node circle,#\_r\_1\_ .node ellipse,#\_r\_1\_ .node polygon,#\_r\_1\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_1\_ .rough-node .label text,#\_r\_1\_ .node .label text,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-anchor:middle;}#\_r\_1\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_1\_ .rough-node .label,#\_r\_1\_ .node .label,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-align:center;}#\_r\_1\_ .node.clickable{cursor:pointer;}#\_r\_1\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_1\_ .arrowheadPath{fill:lightgrey;}#\_r\_1\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_1\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_1\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_1\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_1\_ .cluster text{fill:#F9FFFE;}#\_r\_1\_ .cluster span{color:#F9FFFE;}#\_r\_1\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_1\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_1\_ rect.text{fill:none;stroke-width:0;}#\_r\_1\_ .icon-shape,#\_r\_1\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .icon-shape p,#\_r\_1\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_1\_ .icon-shape rect,#\_r\_1\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_1\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_1\_ :root{--mermaid-font-family:inherit;}

是

否

输入层  
用户任务

状态层  
对话历史

模型层  
LLM 推理

需要工具吗？

工具层  
搜索、读文件

输出层  
最终回答

五个工位对应五个部件。逐个看它们各自做什么。

## [输入层：用户任务进来](#输入层用户任务进来)

输入层是整条流水线的起点。用户告诉 agent 要做什么，可以是自然语言，也可以是一条简短的指令。

```
type UserInput = {
  task: string;       // 任务描述，比如"这个项目的入口文件在哪"
  workingDir: string; // 工作目录，agent 在这个目录下操作
};
```

输入层做的事很简单：把用户的话和当前工作目录打包，传给状态层。这一层不需要理解任务的意思，只需要忠实地传递信息。

但它有一个容易忽略的职责：**记录任务的来源。** 后面如果要做会话记忆（第 6 章），需要知道每个任务是什么时候、在什么上下文下发起的。输入层是这条记录链的起点。

## [状态层：记住发生了什么](#状态层记住发生了什么)

状态层是 agent 的"短期记忆"。它维护一份对话历史，记录了用户说了什么、模型回了什么、工具返回了什么结果。

```
type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }
  | { role: "tool_result"; toolName: string; result: string };
type AgentState = {
  messages: Message[];  // 完整对话历史
  task: string;         // 当前任务
  workingDir: string;   // 工作目录
};
```

为什么需要状态层？因为模型是无状态的。每次调用模型 API，你都需要把完整的对话历史发过去。模型不会"记得"上一次调用时聊了什么，除非你显式地把历史传给它。

状态层的核心工作：

-   **追加新消息。** 用户发了新任务，追加一条 `user` 消息；模型回复了，追加一条 `assistant` 消息；工具执行完了，追加一条 `tool_result` 消息。
-   **构建模型输入。** 每次调用模型时，从状态中提取完整的对话历史，格式化成模型 API 需要的结构。
-   **控制上下文长度。** 对话历史太长会超出模型的上下文窗口。状态层需要在"保留足够信息"和"不超过 token 限制"之间做平衡。这个能力在第 6 章会深入展开。

## [模型层：做决策的大脑](#模型层做决策的大脑)

模型层封装了和 LLM API 的交互。它接收状态层构建的消息，发给模型，拿到回复。

```
type ModelResponse = {
  content: string;      // 模型的文本回复
  toolCalls?: ToolCall[]; // 模型想要调用的工具
};
type ToolCall = {
  name: string;         // 工具名称，比如 "search" 或 "read_file"
  arguments: Record<string, unknown>; // 工具参数
};
```

模型层的关键设计决策：

**用哪个模型。** 这门课不绑定特定的模型提供商。你可以用 OpenAI、Anthropic、Google 或任何提供 tool calling 能力的模型。课程代码会做一层简单的抽象，切换模型只需要改配置。

**什么是 tool calling。** 模型不只是"回答问题"，它还可以说"我需要调用某个工具"。比如用户问"入口文件在哪"，模型不会直接猜答案，而是说"我需要先搜索一下项目结构"，然后触发一个 `search` 工具调用。这个机制是 Coding Agent 和普通聊天机器人的核心区别。

**怎么处理模型回复。** 模型回复有两种情况：纯文本回复（直接展示给用户）和工具调用（交给工具层执行，然后把结果追加到状态中，再调用模型）。这个"判断回复类型 -> 执行对应逻辑 -> 再调用模型"的循环，就是 Agent Loop 的雏形。第 2 章会把这个循环展开。

## [工具层：手脚长在哪里](#工具层手脚长在哪里)

模型能想但不能动手。工具层就是 agent 的"手"——它负责执行具体的操作。

这一章只实现两个最基础的工具：搜索和读文件。后面第 3 章会补齐完整的工具箱。

```
type Tool = {
  name: string;
  description: string;       // 告诉模型这个工具能做什么
  parameters: JSONSchema;    // 参数的结构定义
  execute: (args: Record<string, unknown>) => Promise<string>;
};
const tools: Tool[] = [
  {
    name: "search",
    description: "在项目目录中搜索包含指定关键词的文件",
    parameters: { /* ... */ },
    execute: async (args) => { /* 调用 ripgrep */ }
  },
  {
    name: "read_file",
    description: "读取指定文件的内容",
    parameters: { /* ... */ },
    execute: async (args) => { /* 调用 fs.readFile */ }
  }
];
```

工具层的设计有几个要点：

**每个工具需要告诉模型自己是谁。** `description` 和 `parameters` 会一起发给模型，让模型知道有哪些工具可用、每个工具需要什么参数。模型根据这些信息决定调用哪个工具、传什么参数。

**工具的输出是文本。** 不管工具内部做了什么（搜索、读文件、跑命令），最终都要把结果转成一段文本返回。这段文本会被追加到对话历史中，成为模型下一次决策的依据。

**这一章只做两个工具就够。** 搜索让 agent 能找到相关代码，读文件让 agent 能理解代码内容。有了这两个工具，agent 就能回答关于代码仓库的问题了。更多的工具（写文件、跑命令、Git 操作）留到第 3 章。

## [输出层：把结果交给用户](#输出层把结果交给用户)

输出层是整条流水线的终点。当模型不再需要调用工具、直接给出文本回复时，这条回复就是最终输出。

```
function formatOutput(response: string): void {
  console.log(response);
}
```

这一章的输出层很简单：把模型的文本回复打印到终端。后面第 5 章会把输出层升级成支持 streaming 的状态面板，第 11 章会做成完整的 CLI 输出格式。

## [五层怎么串起来](#五层怎么串起来)

五个部件各自清楚了，接下来看它们怎么配合工作。用一个具体例子走一遍：

用户问："这个项目的入口文件在哪？"

#\_r\_2\_{margin:1.5rem auto 0;}#\_r\_2\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_2\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_2\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_2\_ .error-icon{fill:#a44141;}#\_r\_2\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_2\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_2\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_2\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_2\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_2\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_2\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_2\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_2\_ .marker.cross{stroke:lightgrey;}#\_r\_2\_ svg{font-family:inherit;font-size:16px;}#\_r\_2\_ p{margin:0;}#\_r\_2\_ .label{font-family:inherit;color:#ccc;}#\_r\_2\_ .cluster-label text{fill:#F9FFFE;}#\_r\_2\_ .cluster-label span{color:#F9FFFE;}#\_r\_2\_ .cluster-label span p{background-color:transparent;}#\_r\_2\_ .label text,#\_r\_2\_ span{fill:#ccc;color:#ccc;}#\_r\_2\_ .node rect,#\_r\_2\_ .node circle,#\_r\_2\_ .node ellipse,#\_r\_2\_ .node polygon,#\_r\_2\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_2\_ .rough-node .label text,#\_r\_2\_ .node .label text,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-anchor:middle;}#\_r\_2\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_2\_ .rough-node .label,#\_r\_2\_ .node .label,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-align:center;}#\_r\_2\_ .node.clickable{cursor:pointer;}#\_r\_2\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_2\_ .arrowheadPath{fill:lightgrey;}#\_r\_2\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_2\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_2\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_2\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_2\_ .cluster text{fill:#F9FFFE;}#\_r\_2\_ .cluster span{color:#F9FFFE;}#\_r\_2\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_2\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_2\_ rect.text{fill:none;stroke-width:0;}#\_r\_2\_ .icon-shape,#\_r\_2\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .icon-shape p,#\_r\_2\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_2\_ .icon-shape rect,#\_r\_2\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_2\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_2\_ :root{--mermaid-font-family:inherit;}

工具调用

文本回复

1\. 输入层  
收到用户任务

2\. 状态层  
追加 user 消息

3\. 模型层  
调用 LLM

模型回复类型？

4\. 工具层  
执行 search 工具

5\. 状态层  
追加 tool\_result

6\. 输出层  
展示结果

1.  **输入层**收到任务："这个项目的入口文件在哪？"
2.  **状态层**把任务追加到对话历史中
3.  **模型层**把对话历史发给 LLM，拿到回复。模型说："我需要搜索一下项目中的入口文件配置"，附带一个 `search` 工具调用
4.  **工具层**执行 `search` 工具，搜索包含 `main` 或 `index` 的文件，返回搜索结果
5.  **状态层**把工具结果追加到对话历史中
6.  **模型层**再次调用 LLM，这次模型看到了搜索结果，给出文本回复："这个项目的入口文件是 `src/index.ts`..."
7.  **输出层**把回复展示给用户

注意第 3-5 步形成了一个循环：模型调用工具，工具返回结果，模型拿到新信息后再决策。这个循环可能执行多次——模型可能先搜索，再读文件，再搜索另一个关键词，最后才给出答案。这就是 Agent Loop 的基本形态，第 2 章会把它抽象成一个正式的循环控制结构。

## [这一章的代码长什么样](#这一章的代码长什么样)

这一章结束的时候，项目的目录结构大概是这样的：

```
mini-coding-agent/
├── src/
│   ├── types.ts        # 类型定义（Message, AgentState, Tool, ModelResponse）
│   ├── model.ts        # 模型层（LLM 调用封装）
│   ├── tools/
│   │   ├── search.ts   # 搜索工具
│   │   └── read-file.ts # 读文件工具
│   └── agent.ts        # 执行入口（串联五层）
├── package.json
└── tsconfig.json
```

每个文件对应一个或多个部件。`types.ts` 是状态层和模型层的类型定义，`model.ts` 是模型层实现，`tools/` 下是工具层实现，`agent.ts` 是把五层串起来的入口。

下一节开始写代码。先从类型定义和模型封装入手，搭出最基础的骨架。

## 相关笔记

- [[4-9 Agent 的记忆系统]]
- [[3-1 Function Calling 与 Structured Output]]
- [[2-3 Agent Loop 保险丝]]
- [[2-1 流式响应工程真相]]
- [[MOC - 从 0 实现 Coding Agent|从 0 实现 Coding Agent 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
