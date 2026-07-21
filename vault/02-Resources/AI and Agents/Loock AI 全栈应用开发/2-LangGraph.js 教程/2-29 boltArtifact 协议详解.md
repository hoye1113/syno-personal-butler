---
title: "boltArtifact 协议详解 — Loock AI 全栈应用开发"
tags: ["loock_ai", "langgraphjs_tutorial", "ai_agent"]
legacy_tags: ["loock_ai", "langgraphjs-tutorial", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/langgraphjs/10-ecosystem/01-bolt-artifact-protocol"
description: "深入解析 AI 代码生成的流式交互协议：设计动机、解析流程与工程实践"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/2-LangGraph.js 教程/2-29 boltArtifact 协议详解.md"
source_sha256: "5b5af221315439f77e0eedb10d6f87265788fbed56d2de5797dec24c2311aa1e"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

生态与协议

# boltArtifact 协议详解

深入解析 AI 代码生成的流式交互协议：设计动机、解析流程与工程实践

## [📚 学习目标](#-学习目标)

学完这篇文章后，你将能够：

-   理解 boltArtifact 协议在 AI 代码生成中的定位
-   掌握 `boltArtifact` / `boltAction` 的协议结构与约束
-   设计一个可流式解析、可执行、可扩展的前端处理链路
-   知道它和 Function Calling、Markdown 代码块方案的差异

* * *

## [1 什么是 boltArtifact 协议？](#1-什么是-boltartifact-协议)

`boltArtifact` 是 bolt.new 使用的一套 **XML 风格标签协议**，用于在模型流式输出中嵌入“可执行的结构化操作”。

它的目标不是“只展示代码”，而是把 AI 输出升级为一组可落地动作：

-   创建/更新文件
-   执行 shell 命令
-   驱动前端实时更新文件树与执行状态

最小示例：

```
<boltArtifact id="my-project" title="My React App">
  <boltAction type="file" filePath="package.json">
    { "name": "my-app" }
  </boltAction>
  <boltAction type="shell">
    npm install
  </boltAction>
</boltArtifact>
```

* * *

## [2 为什么是 XML 风格，而不是 JSON？](#2-为什么是-xml-风格而不是-json)

核心不是“XML 更先进”，而是它更适配 **LLM 流式输出 + 前端实时解析** 的场景。

维度

XML 标签

JSON

Markdown 代码块

流式解析

✅ 友好

❌ 难（依赖完整闭合）

⚠️ 一般

文本混排

✅ 自然

❌ 需要额外分隔

✅ 自然

属性表达

✅ 原生支持

✅ 支持

❌ 需要约定

LLM 稳定性

✅ 较高

⚠️ 易缺逗号/引号

✅ 较高

三个关键收益：

1.  **边生成边解析**：遇到开标签即可进入状态机处理。
2.  **语义更明确**：`type="file"` / `filePath="..."` 让动作语义自解释。
3.  **容错空间更大**：局部格式问题通常不至于让全段不可用。

* * *

## [3 协议规范](#3-协议规范)

### [3.1 boltArtifact 容器](#31-boltartifact-容器)

```
<boltArtifact id="unique-id" title="Artifact Title">
  <!-- boltAction 列表 -->
</boltArtifact>
```

属性

必需

说明

`id`

✅

唯一标识，建议 kebab-case，后续更新尽量复用

`title`

✅

人类可读标题，用于 UI 展示

### [3.2 boltAction 原子操作](#32-boltaction-原子操作)

#### [`type="file"`](#typefile)

```
<boltAction type="file" filePath="src/App.tsx">
export default function App() {
  return <div>Hello</div>;
}
</boltAction>
```

属性

必需

说明

`type`

✅

固定为 `file`

`filePath`

✅

相对工作目录的路径

#### [`type="shell"`](#typeshell)

```
<boltAction type="shell">
npm install && npm run dev
</boltAction>
```

属性

必需

说明

`type`

✅

固定为 `shell`

### [3.3 对应类型定义（建议）](#33-对应类型定义建议)

```
export interface BoltArtifactData {
  id: string;
  title: string;
}
export type ActionType = 'file' | 'shell';
export interface FileAction {
  type: 'file';
  filePath: string;
  content: string;
}
export interface ShellAction {
  type: 'shell';
  content: string;
}
export type BoltAction = FileAction | ShellAction;
```

* * *

## [4 Prompt 工程：如何让模型稳定输出协议](#4-prompt-工程如何让模型稳定输出协议)

如果你只告诉模型“请输出 XML”，稳定性通常不够。关键在于 **强约束 + 顺序约束 + 反例约束**。

### [4.1 必须强调的约束](#41-必须强调的约束)

1.  **格式约束**：必须使用 `<boltArtifact>` 包裹，内部只放 `<boltAction>`。
2.  **属性约束**：`id` 使用 kebab-case；更新任务优先复用旧 id。
3.  **顺序约束**：先文件、后命令；先依赖安装、后运行。
4.  **完整性约束**：禁止占位符，必须输出完整文件内容。
5.  **负面约束**：明确禁止 `...`、`TODO`、`rest unchanged` 这类省略。

### [4.2 可复用的约束片段](#42-可复用的约束片段)

```
- Use <boltArtifact id="..." title="..."> as the top-level container.
- Use <boltAction type="file" filePath="..."> for files.
- Use <boltAction type="shell"> for commands.
- Action order is critical: create files before running dependent commands.
- Always output full file contents. No placeholders, no truncation.
```

### [4.3 为什么顺序约束很重要](#43-为什么顺序约束很重要)

在代码生成流程里，动作顺序本身就是依赖关系：

-   先写 `package.json` 再 `npm install`
-   先创建入口文件再执行构建/运行命令

顺序错了，即使语法正确，也会导致执行失败。

* * *

## [5 前端处理流程（流式解析到组件渲染）](#5-前端处理流程流式解析到组件渲染)

### [5.1 总体链路](#51-总体链路)

```
LLM 流式输出
  -> StreamingMessageParser（状态机解析标签）
  -> 回调事件（onArtifactOpen / onActionClose ...）
  -> Markdown AST 节点替换
  -> Artifact React 组件（文件树、代码预览、执行状态）
```

### [5.2 流式解析器（核心思路）](#52-流式解析器核心思路)

```
export class StreamingMessageParser {
  parse(messageId: string, input: string) {
    // 核心状态：insideArtifact / insideAction
    // 核心行为：识别开闭标签，持续累积 action 内容
    // 核心输出：返回“去协议标签后的纯文本”，并触发回调
  }
}
```

在工程上，你至少需要这些回调：

```
interface ParserCallbacks {
  onArtifactOpen?: (data: { id: string; title: string }) => void;
  onArtifactClose?: (data: { id: string }) => void;
  onActionOpen?: (data: { type: string; filePath?: string }) => void;
  onActionClose?: (data: {
    type: string;
    content: string;
    filePath?: string;
  }) => void;
}
```

### [5.3 转成 React 组件](#53-转成-react-组件)

常见做法是先把 artifact 标签映射成占位元素，再在 Markdown 渲染层替换成 `<Artifact />` 组件。

```
const components = {
  div: ({ className, node, children }) => {
    if (className?.includes('__boltArtifact__')) {
      const messageId = node?.properties?.dataMessageId as string;
      return <Artifact messageId={messageId} />;
    }
    return <div>{children}</div>;
  },
};
```

这样可以把“解析逻辑”和“展示逻辑”解耦。

* * *

## [6 与其他方案对比](#6-与其他方案对比)

### [6.1 对比 Anthropic Artifacts](#61-对比-anthropic-artifacts)

维度

boltArtifact

Anthropic Artifacts

多动作编排

✅ 支持多个 action

⚠️ 侧重单 artifact 表达

Shell 执行

✅ 原生

❌ 不以此为目标

多文件操作

✅ 强

⚠️ 需额外机制

### [6.2 对比 Function Calling](#62-对比-function-calling)

维度

boltArtifact

Function Calling

流式可见性

✅ 可边生成边展示

❌ 往往等结构化参数完整

人类可读性

✅ 高（文本和动作同屏）

⚠️ 偏机器调用

混排能力

✅ 强

❌ 需要额外协议层

### [6.3 对比纯 Markdown 代码块](#63-对比纯-markdown-代码块)

维度

boltArtifact

Markdown 代码块

元数据表达

✅ 属性明确

❌ 缺少结构属性

自动执行能力

✅ 可回调触发

❌ 主要用于展示

动作语义

✅ 清晰 (`file/shell`)

⚠️ 需自定义约定

* * *

## [7 协议扩展思路](#7-协议扩展思路)

当你需要支持更多交互动作时，可按“类型扩展 -> 解析器扩展 -> Prompt 扩展”三步走。

```
export type ActionType = 'file' | 'shell' | 'browser';
export interface BrowserAction {
  type: 'browser';
  url: string;
}
```

扩展原则：

1.  新 action 必须有清晰语义和最小属性集。
2.  解析器与执行器要一起升级，避免“能解析不能执行”。
3.  Prompt 必须同步新增示例，否则模型不会稳定产出新类型。

* * *

## [8 最佳实践](#8-最佳实践)

1.  **保持 artifact id 稳定**：更新同一项目时复用 id，便于追踪。
2.  **严格动作顺序**：文件 -> 安装 -> 运行，减少执行失败。
3.  **输出完整文件**：不要让模型返回片段或占位符。
4.  **控制 shell 粒度**：相关命令合并，不相关命令拆分。
5.  **做好容错**：解析器应支持“部分可恢复”，而不是一次错误全盘中断。

* * *

## [💡 练习题](#-练习题)

1.  **设计题**：你要新增 `type="patch"`（增量修改文件）动作，会定义哪些属性？
    
    点击查看答案
    
    建议最少包含：`filePath`、`patchFormat`、`baseHash`、`patch`、`applyMode`。 其中 `baseHash` 用于并发冲突检测，`applyMode` 控制严格/宽松应用策略。
    
2.  **实现题**：实现 `parseAiActions(streamChunk)`，支持流式输入和残片缓存。
    
    点击查看答案
    
    状态机建议：`idle -> artifact -> action -> close`，并维护 `bufferTail`。 每次仅消费完整标签，未闭合部分保留到下一 chunk。
    
3.  **Prompt 题**：写 5 条约束，降低模型输出不完整文件的概率。
    
    点击查看答案
    
    示例：必须输出完整文件；禁止占位符；禁止省略号；先文件后命令；每个 shell 步骤必须可执行。
    

* * *

## [📚 参考资源](#-参考资源)

### [项目与协议](#项目与协议)

-   [stackblitz/bolt.new](https://github.com/stackblitz/bolt.new)

* * *

## [✅ 总结](#-总结)

**本章要点**：

-   boltArtifact 的核心价值是“可流式解析的结构化动作协议”。
-   协议成功落地依赖三件事：稳定 Prompt、健壮解析器、清晰执行器。
-   在代码生成场景里，它通常比纯 JSON/代码块更利于实时交互与工程编排。

**下一步**：继续学习如何设计更通用的 UI 协议：[自定义渲染协议](./02-custom-render-protocol)。

## 相关笔记

- [[3-1 Function Calling 与 Structured Output]]
- [[2-3 Agent Loop 保险丝]]
- [[2-1 流式响应工程真相]]
- [[4-4 Cache 全解与成本控制]]
- [[MOC - LangGraph.js 教程|LangGraph.js 教程 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
