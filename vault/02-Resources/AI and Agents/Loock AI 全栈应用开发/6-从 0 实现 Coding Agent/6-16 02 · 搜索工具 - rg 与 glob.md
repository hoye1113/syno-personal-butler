---
title: "02 · 搜索工具：rg 与 glob — Loock AI 全栈应用开发"
tags: ["loock_ai", "coding_agent", "ai_agent"]
legacy_tags: ["loock_ai", "coding_agent", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/mini-coding-agent/03-tools/02-search-tools"
description: "两种互补的搜索方式： earch 在文件内容中找关键词，glob 按路径模式列出文件。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/6-从 0 实现 Coding Agent/6-16 02 · 搜索工具 - rg 与 glob.md"
source_sha256: "149ddc10ab30d48a20cd2ade0f3264db5b403e1716f2c692ebbf15cc159a49bd"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第 3 章 · Tool Calling 与工具系统

# 02 · 搜索工具：rg 与 glob

两种互补的搜索方式：search 在文件内容中找关键词，glob 按路径模式列出文件。

## [两种"找东西"的方式](#两种找东西的方式)

在代码仓库里找东西，有两种典型的场景：

-   **"runAgent 函数在哪定义的？"** —— 你关心的是文件**内容**，要在所有文件里找到包含这段文本的位置
-   **"项目里有哪些测试文件？"** —— 你关心的是文件**路径**，想按名称模式把文件列出来

第 1 章实现的 `search` 工具解决的是第一种场景。这一节新增 `glob` 工具来解决第二种。两个工具互补，覆盖 agent 在代码仓库中"找东西"的全部需求。

用一个表格说清楚它们的分工：

search

glob

**搜索什么**

文件内容

文件路径

**底层实现**

`rg` (ripgrep)

`fs.readdir`

**典型问题**

"哪个文件里有 runAgent"

"有哪些 .test.ts 文件"

**输出格式**

`路径:行号: 匹配内容`

`相对路径`

## [search：在内容中找关键词](#search在内容中找关键词)

`search` 工具在第 1 章已经实现。这一节快速回顾它的核心设计，为和 `glob` 对比做准备。

```
// src/tools/search.ts
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { AgentState, Tool } from "../types";
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
  async execute(
    args: Record<string, unknown>,
    state: AgentState,
  ): Promise<string> {
    const query = String(args.query);
    const maxResults = Number(args.maxResults) || 20;
    try {
      /**
       * 使用 ripgrep 而非 Node.js 原生遍历：
       * 1. rg 比纯 JS 实现快一个数量级
       * 2. rg 默认遵守 .gitignore，不会搜索 node_modules 等目录
       * --line-number 输出格式为 "文件路径:行号:匹配内容"
       */
      const { stdout } = await execAsync(
        `rg --line-number --max-count ${maxResults} -- "${escapeShell(query)}" "${state.workingDir}"`,
        { maxBuffer: 1024 * 1024 },
      );
      if (!stdout.trim()) {
        return `未找到包含 "${query}" 的文件。`;
      }
      const lines = stdout.trim().split("\n");
      const results = lines.slice(0, maxResults).map(formatMatchLine);
      /** 搜索结果可能很长，超过 maxResults 时提示模型结果被截断 */
      const truncated =
        lines.length > maxResults
          ? `\n\n... 共 ${lines.length} 条结果，仅显示前 ${maxResults} 条`
          : "";
      return results.join("\n") + truncated;
    } catch (error: unknown) {
      /** rg 在没有匹配时返回 exit code 1，这不是错误，需要特殊处理 */
      if (isExecError(error) && error.code === 1) {
        return `未找到包含 "${query}" 的文件。`;
      }
      return `搜索出错：${String(error)}`;
    }
  },
};
```

三个关键细节：

**shell 参数转义。** `escapeShell` 函数把查询字符串中的双引号转义，防止命令注入。这是调用外部命令时的基本安全措施：

```
function escapeShell(str: string): string {
  return str.replace(/"/g, '\\"');
}
```

**exit code 1 不是错误。** ripgrep 在没有匹配结果时返回 exit code 1。`child_process.exec` 会把非零退出码当作错误抛出。所以需要在 catch 中检查 `error.code === 1`，把它转成"未找到"的友好提示，而不是返回"搜索出错"。

**输出格式化。** `formatMatchLine` 把 rg 的原始输出 `路径:行号:内容` 解析出来，去掉工作目录前缀，返回更简洁的相对路径格式：

```
function formatMatchLine(line: string): string {
  const match = line.match(/^(.+?):(\d+):(.*)$/);
  if (!match) return line;
  const [, filePath, lineNum, content] = match;
  return `${filePath}:${lineNum}: ${content.trim()}`;
}
```

## [glob：按路径模式列文件](#glob按路径模式列文件)

`search` 回答"内容里有没有"，`glob` 回答"路径上有没有"。两个问题的答案不同，工具也不同。

```
// src/tools/glob.ts
import { readdir } from "node:fs/promises";
import type { AgentState, Tool } from "../types";
/**
 * glob 工具：按模式列出文件路径
 *
 * 和 search 工具的区别：
 * - search：在文件内容中搜索关键词（rg）
 * - glob：按文件路径/名称模式列出文件
 *
 * 两种搜索互补。例如：
 * - "哪个文件里有 runAgent 函数" -> search
 * - "项目里有哪些 .test.ts 文件" -> glob
 *
 * 使用 Node.js 内置 fs 实现，不依赖外部命令或第三方库，
 * 在 Windows / Linux / macOS 上都能运行。
 */
export const globTool: Tool = {
  name: "glob",
  description:
    "按文件路径模式列出项目中的文件。" +
    "支持 glob 模式，如 **/*.ts、src/**/*.test.ts。" +
    "适合用来查看项目结构、找到特定类型的文件。",
  parameters: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "glob 模式，如 **/*.ts 或 src/**/*.test.ts",
      },
      maxResults: {
        type: "number",
        description: "最多返回多少条结果，默认 50",
      },
    },
    required: ["pattern"],
  },
  async execute(
    args: Record<string, unknown>,
    state: AgentState,
  ): Promise<string> {
    const pattern = String(args.pattern);
    const maxResults = Number(args.maxResults) || 50;
    try {
      /** 排除的目录，不需要搜索 */
      const ignore = new Set(["node_modules", ".git"]);
      /** 递归读取目录下的所有文件路径 */
      const allFiles = await readdir(state.workingDir, {
        recursive: true,
      }).then((entries) =>
        (entries as string[]).filter(
          (entry) =>
            !entry.split("/").some((segment) => ignore.has(segment)),
        ),
      );
      /** 将 glob 模式转为正则：* → [^/]*, ** → .*, ? → [^/] */
      const regex = globToRegex(pattern);
      const matched = allFiles.filter((f) => regex.test(f));
      if (matched.length === 0) {
        return `未找到匹配 "${pattern}" 的文件。`;
      }
      const results = matched.slice(0, maxResults);
      const truncated =
        matched.length > maxResults
          ? `\n\n... 共 ${matched.length} 个文件，仅显示前 ${maxResults} 个`
          : "";
      return results.join("\n") + truncated;
    } catch (error: unknown) {
      return `列出文件出错：${String(error)}`;
    }
  },
};
/**
 * 将简易 glob 模式转为正则表达式
 *
 * 支持的模式：
 * - ** 匹配任意层级目录（包括零层）
 * - *  匹配除 / 外的任意字符
 * - ?  匹配单个字符（除 /）
 * - 其他字符原样匹配
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");
  return new RegExp(`^${escaped}$`);
}
```

几个设计决策：

**为什么用 `fs.readdir` 而不是 `find` 命令？** `find` 是 Unix 命令，Windows 上不可用。`fs.readdir` 的 `{ recursive: true }` 是 Node.js 内置能力，零依赖，全平台支持。glob 模式匹配通过一个简单的 `globToRegex` 函数实现，不需要引入第三方 glob 库。

**为什么排除 `node_modules` 和 `.git`？** 这两个目录通常包含大量文件，和源码无关。glob 工具是帮模型理解项目结构的，不是帮它翻依赖包的。

**为什么默认返回 50 条而不是 search 的 20 条？** 文件列表的信息密度比搜索结果低——一行就是一个路径。50 条路径占用的 token 大概等于 20 条搜索结果。所以 glob 可以返回更多条。

**为什么要转成相对路径？** 绝对路径包含完整的工作目录路径，既长又不必要。相对路径更短，模型也更容易理解 `src/tools/search.ts` 比 `/Users/x/project/src/tools/search.ts` 代表什么。

## [什么时候用 search，什么时候用 glob](#什么时候用-search什么时候用-glob)

这不是一个理论问题，而是模型在每一步都要做的实际决策。两个工具的 `description` 就是用来帮模型做这个判断的。

举几个具体的例子：

**"找到 `AgentState` 类型的定义"** —— 用 `search`。因为你要找的是文件内容中的 `interface AgentState` 或 `type AgentState`，关键词在内容里。

**"列出所有工具文件"** —— 用 `glob`。因为你要找的是 `src/tools/*.ts` 路径模式下的文件，关键词在路径里。

**"找到测试文件中有哪些测试用例"** —— 先 `glob **/*.test.ts` 列出测试文件，再 `search` 在这些文件中搜索 `test(` 或 `it(` 找到测试用例。两步组合。

**"找到配置文件"** —— 取决于你知道什么。如果知道文件名大概是 `tsconfig.json`，用 `glob **/tsconfig.json`。如果只知道配置里有 `"target": "ES2022"` 这个值，用 `search`。

模型在实际运行时也是这样组合使用的。比如用户问"项目里有哪些测试，它们在测什么？"模型会先用 `glob` 列出测试文件，再用 `read_file` 逐个读取，综合信息后回答。

## [注册 glob 工具](#注册-glob-工具)

把 `glob` 工具加到工具注册表中：

```
// src/tools/index.ts
import { searchTool } from "./search";
import { globTool } from "./glob";
import { readFileTool } from "./read-file";
// ... 其他工具的 import
/** 基础工具集 */
export const tools: Tool[] = [
  searchTool,
  globTool,
  readFileTool,
  // ... 其他工具
];
```

`glob` 紧跟在 `search` 后面，因为它们是互补的一对——模型经常在搜索和列文件之间切换，放在一起便于维护和测试。

## [搜索工具的设计原则](#搜索工具的设计原则)

做完两个搜索工具，可以总结出几个通用的设计原则：

**优先使用成熟工具，但注意跨平台。** `rg` 是搜索内容的最佳选择——性能远超手写代码。但 `find` 命令在 Windows 上不可用，这时用 Node.js 内置 API（如 `fs.readdir`）是更好的选择。每加一个工具都要问：它在目标平台上能用吗？

**控制输出量比提高输出质量更重要。** 搜索结果可能非常多。不管是 `search` 的 20 条限制还是 `glob` 的 50 条限制，目的都是防止输出太长，占用模型的上下文窗口。模型看不完的结果等于没有结果。

**无结果也是一种信息。** 搜索返回"未找到"不是失败——它告诉模型"这个方向没有内容，换个方向"。工具要清晰地区分"找到了 0 条结果"和"搜索出错了"两种情况。

## 相关笔记

- [[3-1 Function Calling 与 Structured Output]]
- [[3-6 生产级权限系统的四层防线]]
- [[MOC - 从 0 实现 Coding Agent|从 0 实现 Coding Agent 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
