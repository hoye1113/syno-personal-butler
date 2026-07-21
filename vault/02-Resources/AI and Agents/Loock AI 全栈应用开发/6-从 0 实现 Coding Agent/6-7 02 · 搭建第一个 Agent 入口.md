---
title: "02 · 搭建第一个 Agent 入口 — Loock AI 全栈应用开发"
tags: ["loock_ai", "coding_agent", "ai_agent"]
legacy_tags: ["loock_ai", "coding_agent", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/mini-coding-agent/01-minimal-agent/02-agent-entry"
description: "从空目录开始，定义消息类型、封装模型调用、设计工具接口，把五层架构落地成可以运行的代码。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/6-从 0 实现 Coding Agent/6-7 02 · 搭建第一个 Agent 入口.md"
source_sha256: "893cfd90fcc017f7d3ab48ece12d243c9ed57939c767acbc2f86839eedb2e9da"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第 1 章 · 最小可用 Agent

# 02 · 搭建第一个 Agent 入口

从空目录开始，定义消息类型、封装模型调用、设计工具接口，把五层架构落地成可以运行的代码。

## [不再纸上谈兵](#不再纸上谈兵)

上一节把架构拆成了五层。这一节动手写代码，把这五层落地成可以运行的文件。先搭骨架，再逐步填充。

代码组织遵循一个原则：**每个文件对应一个明确的职责。** `types.ts` 管类型定义，`model.ts` 管模型调用，`tools/` 管工具实现，`agent.ts` 管流程串联。后面每一章往这个结构里加新东西，但骨架不变。

## [初始化项目](#初始化项目)

先创建项目目录和基础配置。

```
mkdir mini-coding-agent && cd mini-coding-agent
# 注：项目目录名保持 mini-coding-agent，CLI 命令名用 mca
pnpm init
pnpm add openai dotenv
pnpm add -D typescript @types/node tsx
pnpm tsc --init
```

`tsconfig.json` 中调整几个关键配置：

```
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

使用 `bundler` 模块解析策略，import 路径不需要写扩展名。这是开源 CLI 项目的常见做法，tsx 运行时也能正确处理。

## [第一步：定义消息类型](#第一步定义消息类型)

类型定义是整个项目的基石。后面所有模块都依赖这些类型。

```
// src/types.ts
export type Message =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool_result"; toolCallId: string; result: string };
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}
export interface AgentState {
  messages: Message[];
  task: string;
  workingDir: string;
}
export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
  execute: (args: Record<string, unknown>, state: AgentState) => Promise<string>;
}
export interface ModelResponse {
  content: string;
  toolCalls?: ToolCall[];
}
```

几个设计决策解释一下：

**为什么 `Message` 用联合类型而不是一个统一对象？** 因为不同角色的消息结构不同。`assistant` 消息可能带 `toolCalls`，`tool_result` 消息需要 `toolCallId` 来和原始工具调用对应。联合类型让每条消息的结构更精确，TypeScript 会在使用时帮你做类型收窄。

**为什么工具的 `execute` 方法要接收 `state` 参数？** 因为很多工具需要知道当前工作目录（`state.workingDir`）。比如搜索工具需要在正确的目录下执行 `rg` 命令。把 `state` 传进去，而不是让工具自己维护状态，可以保持工具的无状态性。

**为什么 `parameters` 是手写的 JSON Schema 而不是用 class？** 因为 `parameters` 最终要原样发给模型 API。模型 API 接受的是 JSON Schema 格式的工具定义，用 class 或 TypeScript 装饰器反而需要额外的转换层。直接用 JSON Schema 保持最短路径。

## [第二步：封装模型调用](#第二步封装模型调用)

模型层做一件事：接收消息列表，发给 LLM，返回结构化的响应。

```
// src/model.ts
import OpenAI from "openai";
import type { Message, ModelResponse, Tool, ToolCall } from "./types";
export class Model {
  private client: OpenAI;
  private model: string;
  constructor(options: {
    apiKey: string;
    baseURL?: string;
    model?: string;
  }) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    });
    this.model = options.model ?? "gpt-4o";
  }
  async chat(messages: Message[], tools?: Tool[]): Promise<ModelResponse> {
    const toolDefinitions = tools?.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map(toOpenAIMessage),
      tools: toolDefinitions,
    });
    const choice = response.choices[0];
    const content = choice.message.content ?? "";
    const toolCalls: ToolCall[] = (choice.message.tool_calls ?? []).map(
      (tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      }),
    );
    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}
function toOpenAIMessage(msg: Message): OpenAI.ChatCompletionMessageParam {
  switch (msg.role) {
    case "system":
      return { role: "system", content: msg.content };
    case "user":
      return { role: "user", content: msg.content };
    case "assistant":
      return {
        role: "assistant",
        content: msg.content,
        ...(msg.toolCalls
          ? {
              tool_calls: msg.toolCalls.map((tc) => ({
                id: tc.id,
                type: "function" as const,
                function: {
                  name: tc.name,
                  arguments: JSON.stringify(tc.arguments),
                },
              })),
            }
          : {}),
      };
    case "tool_result":
      return {
        role: "tool",
        tool_call_id: msg.toolCallId,
        content: msg.result,
      };
  }
}
```

这里用 OpenAI 的 SDK 作为模型接口。构造函数接受 `options` 对象，可以传入 `apiKey`、`baseURL` 和 `model`，方便切换不同的模型提供商（如智谱、DeepSeek 等，只要兼容 OpenAI 接口格式即可）。

一个值得注意的细节：`messages` 的格式转换。内部类型用的是 `tool_result` 角色，但 OpenAI API 用的是 `tool` 角色。这层转换封装在 `model.ts` 里的 `toOpenAIMessage` 函数中，其他模块不需要关心 API 的具体格式。

为什么要故意让两边的命名不一样？两个原因：

**语义更清晰。** `tool_result` 一看就知道是"工具的执行结果"，比 `tool` 这个泛化的名字更自描述。在读 `agent.ts` 的代码时，`role: "tool_result"` 比 `role: "tool"` 更容易理解这条消息是什么。

**解耦内部模型和外部 API。** 如果直接用 `tool` 作为 role，所有模块都得跟着 OpenAI 的命名走。将来换成 Anthropic 或其他 API——它们的工具调用格式可能完全不同——改动就扩散到整个项目。现在只有 `model.ts` 里的 `toOpenAIMessage` 一个函数需要知道 API 的具体格式，其他模块完全不关心。

## [第三步：设计工具接口](#第三步设计工具接口)

工具接口已经在 `types.ts` 中定义了。这一步是验证接口设计是否好用，为下一节实现具体工具做准备。

一个工具需要的四样东西：

字段

作用

谁用

`name`

工具的唯一标识

模型用它选择工具

`description`

工具能做什么的自然语言描述

模型用它理解工具的适用场景

`parameters`

参数的 JSON Schema 定义

模型用它构造正确的参数

`execute`

实际执行的函数

Agent 在模型选择工具后调用它

`name` 和 `description` 是给模型看的。模型根据这两个字段判断"用户的问题需要用哪个工具"以及"应该传什么参数"。写好这两个字段直接影响工具调用的准确率。

`parameters` 是给模型和工具双方看的。模型用它知道"搜索工具需要一个 `query` 字符串参数"，工具实现用它做输入校验。

`execute` 是真正的执行逻辑。它接收模型传来的参数，执行操作，返回文本结果。

## [第四步：写执行入口](#第四步写执行入口)

执行入口把五层串起来。这一章的入口逻辑是一个简化版的 Agent Loop：调用一次模型，如果模型要调用工具就执行工具再调用模型，直到模型给出纯文本回复。

```
// src/agent.ts
import type { AgentState, Message, ModelResponse, Tool } from "./types";
import { Model } from "./model";
export async function runAgent(
  state: AgentState,
  model: Model,
  tools: Tool[]
): Promise<string> {
  const systemMessage: Message = {
    role: "system",
    content: [
      "你是一个代码仓库助手，运行在用户的本地终端中。",
      "用户会问你关于当前代码仓库的问题。",
      "你必须使用提供的工具来搜索和读取文件，基于工具返回的实际内容回答问题。",
      "不要猜测或编造文件内容，始终先用工具获取信息再回答。",
      `工作目录：${state.workingDir}`,
    ].join("\n"),
  };
  const allMessages: Message[] = [systemMessage, ...state.messages];
  let response: ModelResponse = await model.chat(allMessages, tools);
  // 简化版循环：最多执行 5 轮工具调用
  for (let i = 0; i < 5; i++) {
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return response.content;
    }
    // 追加 assistant 消息（含工具调用）
    allMessages.push({
      role: "assistant",
      content: response.content,
      toolCalls: response.toolCalls,
    });
    // 执行每个工具调用
    for (const toolCall of response.toolCalls) {
      const tool = tools.find((t) => t.name === toolCall.name);
      if (!tool) {
        allMessages.push({
          role: "tool_result",
          toolCallId: toolCall.id,
          result: `错误：未知工具 ${toolCall.name}`,
        });
        continue;
      }
      const result = await tool.execute(toolCall.arguments, state);
      allMessages.push({
        role: "tool_result",
        toolCallId: toolCall.id,
        result,
      });
    }
    // 再调用模型
    response = await model.chat(allMessages, tools);
  }
  return response.content || "未能完成任务。";
}
```

这个入口做了几件事：

1.  构造系统提示词，告诉模型它是谁、能做什么
2.  调用模型，拿到回复
3.  如果回复包含工具调用，执行工具，把结果追加到对话中，再调用模型
4.  重复直到模型给出纯文本回复，或达到最大轮数

这里有一个硬编码的上限 `5` 轮。这是为了防止模型陷入无限循环（比如反复搜索却找不到结果）。第 2 章会把这个简化循环替换成更健壮的 Agent Loop。

## [跑起来看看](#跑起来看看)

到这里骨架搭完了，但还缺工具实现。用两个占位工具验证一下流程是否通顺：

```
// src/tools/placeholder.ts
import type { Tool } from "../types";
export const placeholderTools: Tool[] = [
  {
    name: "search",
    description: "在项目目录中搜索包含指定关键词的文件",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词" },
      },
      required: ["query"],
    },
    execute: async (args) => {
      return `[占位] 搜索 "${args.query}" — 工具尚未实现`;
    },
  },
  {
    name: "read_file",
    description: "读取指定文件的内容",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "文件路径" },
      },
      required: ["path"],
    },
    execute: async (args) => {
      return `[占位] 读取文件 "${args.path}" — 工具尚未实现`;
    },
  },
];
```

写一个快速测试入口：

```
// src/main.ts
import "dotenv/config";
import { Model } from "./model";
import { runAgent } from "./agent";
import { placeholderTools } from "./tools/placeholder";
import type { AgentState, Message } from "./types";
const apiKey = process.env.OPENAI_API_KEY!;
const model = new Model({
  apiKey,
  baseURL: process.env.OPENAI_BASE_URL,
  model: process.env.MODEL_NAME,
});
const userMessage: Message = {
  role: "user",
  content: "这个项目的入口文件在哪？",
};
const state: AgentState = {
  messages: [userMessage],
  task: "这个项目的入口文件在哪？",
  workingDir: process.cwd(),
};
const result = await runAgent(state, model, placeholderTools);
console.log(result);
```

环境变量通过 `.env` 文件配置，`dotenv` 在启动时自动加载：

```
# .env
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
MODEL_NAME=glm-4-flash
```

运行：

```
pnpm start
```

如果配置正确，你应该能看到模型先尝试调用 `search` 工具（虽然现在只是占位），拿到占位结果后再给出回复。这证明五层之间的串联是通的。

## [骨架完成了，下一步](#骨架完成了下一步)

这一节搭出了项目的骨架：类型定义、模型封装、工具接口、执行入口。骨架可以跑起来，但工具是空的占位实现。下一节开始实现真正的搜索和读文件工具，让 agent 真正能"看"到你的代码仓库。

## 相关笔记

- [[3-1 Function Calling 与 Structured Output]]
- [[2-3 Agent Loop 保险丝]]
- [[3-6 生产级权限系统的四层防线]]
- [[MOC - 从 0 实现 Coding Agent|从 0 实现 Coding Agent 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
