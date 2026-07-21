---
title: "01 · Tool Calling 的本质 — Loock AI 全栈应用开发"
tags: ["loock_ai", "coding_agent", "ai_agent"]
legacy_tags: ["loock_ai", "coding_agent", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/mini-coding-agent/03-tools/01-tool-calling"
description: "理解为什么 Coding Agent 的核心不是模型本身，而是模型调用的工具。工具是 agent 行为的真实落点。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/6-从 0 实现 Coding Agent/6-15 01 · Tool Calling 的本质.md"
source_sha256: "c54ca6b6f2bf1e16cf953b227c5c441fae45403e0da64e6c6c77bf52b1890d84"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第 3 章 · Tool Calling 与工具系统

# 01 · Tool Calling 的本质

理解为什么 Coding Agent 的核心不是模型本身，而是模型调用的工具。工具是 agent 行为的真实落点。

## [模型能想，但不能动手](#模型能想但不能动手)

上一章搭建了 Agent Loop，agent 已经能多步执行任务了。但它能做的事情还很少——只能搜索代码和读文件。这一章要做的，是给 agent 装上一套完整的工具箱。

在动手写工具之前，先理解一个根本问题：**为什么 agent 一定要有工具？**

大语言模型本质上是一个文本生成器。给它一段输入，它预测下一段文本。这个能力非常强大——它能理解代码、分析架构、给出建议。但不管它多么聪明，它都只能**生成文本**。

它不能直接打开文件、不能执行命令、不能修改代码。模型说"你应该在 `index.ts` 的第 42 行加一个参数"，但它没法真的帮你加上。

**Tool Calling 就是连接"想"和"做"的桥梁。**

## [Tool Calling：模型说"我需要动手"](#tool-calling模型说我需要动手)

Tool Calling 的工作方式很简单：

1.  你告诉模型"你有这些工具可用"（名称、描述、参数格式）
2.  模型在推理时决定"我需要调用某个工具"
3.  你的代码执行这个工具，把结果返回给模型
4.  模型拿到结果后继续推理

这个过程不是什么黑魔法。从 API 的角度看，模型返回的不再是纯文本，而是一个结构化的 JSON 对象，里面写着"我想调用 `search` 工具，参数是 `query: 'main 函数'`"。你的代码解析这个 JSON，执行对应的工具，把结果拼回对话历史，再调用模型。

```
/** 模型发起的一次工具调用 */
interface ToolCall {
  id: string;
  name: string;
  /** API 返回的是 JSON 字符串，解析后存为对象 */
  arguments: Record<string, unknown>;
}
/** 模型的响应可能是文本回复，也可能是工具调用（或两者都有） */
interface ModelResponse {
  content: string;
  toolCalls?: ToolCall[];
}
```

关键在于：**模型不执行工具，它只是决定调用什么。** 执行是你的代码负责的。这个分离很重要——它意味着你可以完全控制 agent 能做什么、不能做什么。

## [每个工具 = 一种能力](#每个工具--一种能力)

把工具理解为 agent 的"能力单元"。每增加一个工具，agent 就多一种能力：

工具

能力

解决的问题

`search`

全文搜索

"这个函数在哪"

`glob`

按模式列文件

"项目里有哪些测试文件"

`read_file`

读取文件

"这段代码怎么写的"

`write_file`

创建/覆写文件

"创建一个新文件"

`patch_file`

精确修改文件

"改掉第 42 行的那个 bug"

`run_command`

执行命令

"跑一下测试"

`git_status`

查看 Git 状态

"改了哪些文件"

`git_diff`

查看差异

"具体改了什么"

每个工具只做一件事，做好一件事。这比做一个万能工具要好——模型更容易选择，实现更容易测试，出问题更容易定位。

## [Tool 接口：四个字段](#tool-接口四个字段)

在我们的项目中，每个工具都遵循同一个 `Tool` 接口：

```
/**
 * 工具定义
 *
 * name 和 description 是给模型看的，帮助模型决定何时调用哪个工具。
 * parameters 是 JSON Schema 格式，直接传给模型 API。
 */
interface Tool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
  /** 执行工具逻辑，返回结果文本 */
  execute: (
    args: Record<string, unknown>,
    state: AgentState,
  ) => Promise<string>;
}
```

四个字段各有分工：

**`name`**：工具的标识符。模型用它来指定要调用哪个工具。命名要简洁明确，比如 `search`、`read_file`、`patch_file`。不要用缩写或含糊的名字。

**`description`**：告诉模型这个工具能做什么、适合什么场景。这个字段的重要性经常被低估——模型主要就是靠 description 来决定什么时候该用哪个工具。写得好，模型选择就准；写得差，模型就会在不该用的时候用了，或者该用的时候没用。

**`parameters`**：JSON Schema 格式的参数定义。它告诉模型这个工具需要什么参数、每个参数是什么类型。API 会把这个结构直接传给模型，模型据此生成调用参数。

**`execute`**：实际的执行逻辑。接收模型传来的参数和当前的 agent 状态，返回一段文本作为执行结果。这段文本会被追加到对话历史中，成为模型下一步决策的依据。

看一个具体的例子——搜索工具的定义：

```
export const searchTool: Tool = {
  name: "search",
  description:
    "在项目目录中搜索包含指定关键词的文件。" +
    "返回匹配的文件路径、行号和匹配行的内容。" +
    "适合用来定位某个函数、变量或关键词在哪些文件中出现。",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "搜索关键词或正则表达式",
      },
      maxResults: {
        type: "number",
        description: "最多返回多少条结果，默认 20",
      },
    },
    required: ["query"],
  },
  async execute(args, state) {
    /** 实际执行逻辑 ... */
  },
};
```

注意 description 写了三句话：第一句说这个工具**做什么**（搜索包含关键词的文件），第二句说**返回什么**（文件路径、行号、匹配内容），第三句说**适合什么场景**（定位函数、变量、关键词）。这三层信息帮助模型准确判断"现在该不该用这个工具"。

## [description 是最被低估的字段](#description-是最被低估的字段)

模型怎么决定调用哪个工具？它看不到你的代码，也理解不了你的架构。它做决策的依据就是每个工具的 `name` 和 `description`。

写好 description 有几个实用原则：

**说清楚工具做什么。** 不要写"搜索工具"这种废话，要写"在项目目录中搜索包含指定关键词的文件"。模型不需要你起名字，它需要知道功能。

**说清楚返回什么。** 模型需要根据返回值做后续决策。告诉它返回的是文件路径 + 行号 + 匹配内容，它就知道可以继续用 `read_file` 去读具体文件。

**说清楚适用场景。** "适合用来定位某个函数、变量或关键词在哪些文件中出现"——这句暗示了使用场景，帮助模型区分"什么时候用 search，什么时候用 glob"。

**说清楚局限性。** `write_file` 的 description 里写了"如果要修改文件的一小部分，优先使用 patch\_file"。这直接影响了模型的选择：创建新文件用 `write_file`，修改已有文件用 `patch_file`。

## [工具注册表：集中管理所有工具](#工具注册表集中管理所有工具)

所有工具集中注册在一个文件中：

```
// src/tools/index.ts
import type { Tool } from "../types";
import type { TodoManager } from "../todo";
import { readFileTool } from "./read-file";
import { searchTool } from "./search";
import { globTool } from "./glob";
import { writeFileTool } from "./write-file";
import { patchFileTool } from "./patch-file";
import { runCommandTool } from "./run-command";
import { gitStatusTool } from "./git-status";
import { gitDiffTool } from "./git-diff";
import { createTodosTool } from "./create-todos";
import { updateTodoTool } from "./update-todo";
/** 基础工具集（搜索和文件读写） */
export const tools: Tool[] = [
  searchTool,
  globTool,
  readFileTool,
  writeFileTool,
  patchFileTool,
  runCommandTool,
  gitStatusTool,
  gitDiffTool,
];
/**
 * 创建完整的工具集，包含基础工具和计划管理工具
 *
 * 计划工具通过闭包捕获 todoManager，这样工具执行时可以直接操作计划数据，
 * 而不需要通过 AgentState 传递。
 */
export function createAllTools(todoManager: TodoManager): Tool[] {
  return [
    ...tools,
    createTodosTool(todoManager),
    updateTodoTool(todoManager),
  ];
}
```

这个注册表模式的好处：

**一处定义，处处使用。** Agent 初始化时只需要引入 `tools` 数组，不需要关心每个工具的具体实现。

**增删工具只改一个文件。** 新增工具只需要写一个新的 `.ts` 文件，然后在这里加一行 import 和一个数组元素。

**基础工具和扩展工具分层。** `tools` 数组是基础工具集，`createAllTools` 在此基础上追加计划管理工具。这种分层让不同场景可以按需组合工具集。

## [execute 的返回值是给模型看的](#execute-的返回值是给模型看的)

每个工具的 `execute` 方法返回一个字符串。这个字符串不是给人看的终端输出，而是给模型看的"工具执行结果"。模型会根据这个结果决定下一步做什么。

这意味着：

**返回值要信息密度高。** 搜索工具返回的是 `文件路径:行号: 匹配内容`，一行就包含了位置信息和上下文信息。模型拿到这个结果，既知道在哪个文件，又知道周围的代码长什么样。

**错误信息要有指导性。** `patch_file` 在找不到匹配内容时会返回："未找到完全匹配的内容。但第一行 xxx 在第 42 行附近有部分匹配。请使用 read\_file 读取该位置附近的代码。"模型读到这个提示，会真的去调用 `read_file` 查看代码，而不是盲目重试。

**空结果也要有明确说明。** 搜索不到结果时返回"未找到包含 xxx 的文件"，而不是空字符串。空字符串会让模型困惑——是搜索出错了，还是确实没有结果？

## [这一章要做什么](#这一章要做什么)

这一章会依次实现以下工具：

1.  **搜索工具（glob）**：按文件路径模式列文件，和已有的 `search` 互补
2.  **写文件工具（write\_file）**：创建或覆写整个文件
3.  **Patch 工具（patch\_file）**：对已有文件做精确的局部修改
4.  **命令工具（run\_command）**：执行终端命令
5.  **Git 工具（git\_status / git\_diff）**：查看仓库状态和变更

每一节会讲解一个工具的设计思路、实现细节和关键设计决策。代码全部来自项目实际源码，没有简化。

## 相关笔记

- [[3-1 Function Calling 与 Structured Output]]
- [[2-3 Agent Loop 保险丝]]
- [[3-2 一次工具调用背后经历了什么]]
- [[MOC - 从 0 实现 Coding Agent|从 0 实现 Coding Agent 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
