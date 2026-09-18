---
title: "03 · 让 Agent 学会搜索和读文件 — Loock AI 全栈应用开发"
tags: ["loock_ai", "coding_agent", "ai_agent"]
legacy_tags: ["loock_ai", "coding_agent", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/mini-coding-agent/01-minimal-agent/03-search-and-read"
description: "实现  earch 和 read_file 两个工具，让 agent 真正能\\\"看\\\"到你的代码仓库。讨论工具设计中的长度控制、结果截断和输出格式化。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/6-从 0 实现 Coding Agent/6-8 03 · 让 Agent 学会搜索和读文件.md"
source_sha256: "35d317c4bd6710957a8ec3c97f081b0ddfcdc0f6faf770642dc1e11216f335e9"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第 1 章 · 最小可用 Agent

# 03 · 让 Agent 学会搜索和读文件

实现 search 和 read\_file 两个工具，让 agent 真正能"看"到你的代码仓库。讨论工具设计中的长度控制、结果截断和输出格式化。

## [从占位到真实](#从占位到真实)

上一节搭出了骨架，但工具是占位实现。这一节把 `search` 和 `read_file` 变成真正能用的工具。做完之后，agent 就能在你的代码仓库中搜索关键词、读取文件内容了。

这两个工具的选择不是随意的。搜索解决"在哪"的问题（相关代码在哪个文件），读文件解决"是什么"的问题（代码具体怎么写的）。有了这两个能力，agent 就能回答关于代码仓库的问题。

## [搜索工具：用 ripgrep 做全文搜索](#搜索工具用-ripgrep-做全文搜索)

搜索工具的核心逻辑：接收一个关键词，在项目目录下搜索包含该关键词的文件，返回匹配结果。

```
// src/tools/search.ts
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { Tool, AgentState } from "../types";
const execAsync = promisify(exec);
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
  execute: async (args, state: AgentState) => {
    const query = String(args.query);
    const maxResults = Number(args.maxResults) || 20;
    try {
      const { stdout } = await execAsync(
        `rg --line-number --max-count ${maxResults} -- "${query}" "${state.workingDir}"`,
        { maxBuffer: 1024 * 1024 }
      );
      if (!stdout.trim()) {
        return `未找到包含 "${query}" 的文件。`;
      }
      const lines = stdout.trim().split("\n");
      const results = lines.slice(0, maxResults).map((line) => {
        const match = line.match(/^(.+?):(\d+):(.*)$/);
        if (!match) return line;
        const [, filePath, lineNum, content] = match;
        // 转为相对路径，让输出更简洁
        const relativePath = filePath.replace(state.workingDir + "/", "");
        return `${relativePath}:${lineNum}: ${content.trim()}`;
      });
      const truncated =
        lines.length > maxResults
          ? `\n\n... 共 ${lines.length} 条结果，仅显示前 ${maxResults} 条`
          : "";
      return results.join("\n") + truncated;
    } catch (error: unknown) {
      // rg 在没有匹配时返回 exit code 1，这不是错误
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: number }).code === 1
      ) {
        return `未找到包含 "${query}" 的文件。`;
      }
      return `搜索出错：${String(error)}`;
    }
  },
};
```

几个设计决策：

**为什么选 ripgrep（`rg`）而不是 Node.js 原生遍历？** 两个原因。第一，`rg` 比任何纯 JavaScript 实现都快一个数量级，尤其在大仓库里。第二，`rg` 默认遵守 `.gitignore`，这意味着搜索结果不会包含 `node_modules` 或构建产物。一个 coding agent 搜索的应该是源码，不是依赖。

**为什么要控制返回数量？** 搜索结果可能非常长。把几百行搜索结果全部塞给模型，既浪费 token 又干扰模型判断。默认返回 20 条，让模型先看概览，如果需要更多信息可以再搜索。

**为什么用 `child_process.exec` 而不是 `spawn`？** 因为搜索工具的输出量可控（有 `maxResults` 限制），`exec` 一次性拿到全部输出，代码更简洁。后面做命令执行工具（第 3 章）时会用 `spawn`，因为长时间运行的命令需要流式处理输出。

**路径处理。** 搜索结果中的文件路径转为相对路径，让输出更简洁，也让模型更容易理解。

## [读文件工具：带长度控制的文件读取](#读文件工具带长度控制的文件读取)

读文件工具不只是 `fs.readFile` 的封装。它需要解决一个问题：**文件可能很长，不能无脑全部塞给模型。**

```
// src/tools/read-file.ts
import { readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import type { Tool, AgentState } from "../types";
export const readFileTool: Tool = {
  name: "read_file",
  description:
    "读取指定文件的内容。" +
    "可以指定读取的起始行和结束行，适合读取大文件的特定部分。" +
    "如果文件超过 200 行，建议只读取相关部分。",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "要读取的文件路径（相对于工作目录）",
      },
      startLine: {
        type: "number",
        description: "起始行号（从 1 开始），默认 1",
      },
      endLine: {
        type: "number",
        description: "结束行号，默认读取到文件末尾（最多 200 行）",
      },
    },
    required: ["path"],
  },
  execute: async (args, state: AgentState) => {
    const filePath = resolve(state.workingDir, String(args.path));
    const startLine = Number(args.startLine) || 1;
    const maxLines = 200;
    const endLine = Number(args.endLine) || startLine + maxLines - 1;
    // 安全检查：确保不会读取工作目录之外的文件
    if (!filePath.startsWith(state.workingDir)) {
      return `错误：不能读取工作目录之外的文件。`;
    }
    try {
      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n");
      const totalLines = lines.length;
      const selectedLines = lines.slice(startLine - 1, endLine);
      const numberedLines = selectedLines.map(
        (line, i) => `${startLine + i}: ${line}`
      );
      const header = `文件: ${relative(state.workingDir, filePath)} (${totalLines} 行)`;
      const range =
        endLine < totalLines
          ? `显示第 ${startLine}-${endLine} 行`
          : `显示第 ${startLine}-${totalLines} 行`;
      const truncation =
        endLine < totalLines
          ? `\n\n... 共 ${totalLines} 行，仅显示第 ${startLine}-${endLine} 行。可以使用 startLine 和 endLine 参数读取更多内容。`
          : "";
      return `${header}\n${range}\n\n${numberedLines.join("\n")}${truncation}`;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "ENOENT"
      ) {
        return `错误：文件不存在 ${args.path}`;
      }
      return `读取文件出错：${String(error)}`;
    }
  },
};
```

几个设计决策：

**为什么默认最多读 200 行？** 一个 200 行的文件片段大概对应 2000-3000 个 token。给模型的信息应该是"刚好够理解上下文"，而不是"能塞多少塞多少"。200 行对大多数函数、类、模块的理解足够了。

**为什么要带行号输出？** 行号让模型能精确引用代码位置。比如模型可以说"第 42 行的函数签名需要修改"。也方便用户对照源文件验证模型的回答。

**为什么做路径安全检查？** agent 运行在用户的本地机器上，读文件工具不应该被利用来读取 `/etc/passwd` 这种系统文件。检查文件路径是否在工作目录内是一个基本的安全边界。后面第 4 章会建立更完整的权限系统。

**为什么要支持分页读取？** 大文件不应该一次全部读取。有了 `startLine` 和 `endLine`，模型可以先读文件的前 50 行了解结构，再根据需要读取特定片段。这比一次性加载 1000 行文件高效得多。

## [注册工具并更新入口](#注册工具并更新入口)

把两个工具注册到统一列表中：

```
// src/tools/index.ts
import type { Tool } from "../types";
import { searchTool } from "./search";
import { readFileTool } from "./read-file";
export const tools: Tool[] = [searchTool, readFileTool];
```

更新 `main.ts`，把占位工具替换成真实工具：

```
// src/main.ts
import { Model } from "./model";
import { runAgent } from "./agent";
import { tools } from "./tools/index";
import type { AgentState, Message } from "./types";
const apiKey = process.env.OPENAI_API_KEY!;
const model = new Model(apiKey);
const userMessage: Message = {
  role: "user",
  content: "这个项目的入口文件在哪？",
};
const state: AgentState = {
  messages: [userMessage],
  task: "这个项目的入口文件在哪？",
  workingDir: process.cwd(),
};
const result = await runAgent(state, model, tools);
console.log(result);
```

现在运行 `npx tsx src/main.ts`，agent 会真正搜索你的项目目录，找到相关文件，读取内容，然后给出回答。

## [一个实际运行的例子](#一个实际运行的例子)

假设在 `mini-coding-agent` 项目自身上运行，问"这个项目用到了哪些主要的依赖？"。agent 的执行过程大概是这样的：

```
1. [模型] 收到问题，决定调用 search 工具搜索 "dependencies"
2. [search] 执行 rg --line-number "dependencies" ./mini-coding-agent
   返回:
   package.json:5:  "dependencies": {
   package.json:6:    "openai": "^4.x"
   }
3. [模型] 看到搜索结果，决定调用 read_file 读取 package.json
4. [read_file] 读取 package.json
   返回:
   文件: package.json (18 行)
   显示第 1-18 行
   1: {
   2:   "name": "mini-coding-agent",
   ...
   5:   "dependencies": {
   6:     "openai": "^4.x"
   7:   },
   ...
4. [模型] 根据读取的内容给出回答
输出: 这个项目的主要依赖是 openai（用于调用 LLM API），
      开发依赖有 typescript 和 @types/node。
```

模型先用搜索定位到相关文件，再用读文件获取详细内容，最后综合信息给出回答。这正是上一节架构图中"模型 -> 工具 -> 模型"循环的实际运作方式。

## [工具设计的三个教训](#工具设计的三个教训)

做完这两个工具，有三个值得记住的设计原则：

**控制输出长度比提高输出质量更优先。** 模型的上下文窗口是有限的。一个返回 500 行的工具输出，可能只有 20 行是模型真正需要的。主动截断和分页，比让模型在一大堆信息里大海捞针高效得多。

**工具的错误信息也是给模型看的。** 当搜索找不到结果或文件不存在时，工具返回的错误信息会被模型读到。清晰的错误信息（如"未找到包含 xxx 的文件"）能让模型调整策略（比如换一个关键词搜索），而不是因为一个模糊的错误信息而卡住。

**工具的 description 直接影响模型的工具选择准确率。** `description` 不只是给人类看的文档，更是模型判断"什么时候该用这个工具"的依据。写好 description 是一件被低估的事情。

下一节会让 agent 面对一组真实的仓库问答任务，验证它到底能做到什么程度。

## 相关笔记

- [[2-1 流式响应工程真相]]
- [[3-6 生产级权限系统的四层防线]]
- [[MOC - 从 0 实现 Coding Agent|从 0 实现 Coding Agent 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
