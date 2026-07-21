---
title: "数据分析 Agent — Loock AI 全栈应用开发"
tags: ["loock_ai", "langgraphjs_tutorial", "ai_agent"]
legacy_tags: ["loock_ai", "langgraphjs-tutorial", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/langgraphjs/06-common-use-cases/03-data-analysis"
description: "构建能够自动编写和执行代码进行数据分析的智能 Agent"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/2-LangGraph.js 教程/2-24 数据分析 Agent.md"
source_sha256: "8ea756f0ec9ce7fba8979c0ef3cf529d02a07f699aeb21ed936f1977867b0f1f"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

常见用例

# 数据分析 Agent

构建能够自动编写和执行代码进行数据分析的智能 Agent

## [📚 学习目标](#-学习目标)

学完这篇文章后，你将能够：

-   构建一个能够生成 Python/JS 代码的 Agent
-   安全地执行生成的代码（Sandboxing）
-   实现“代码生成 -> 执行 -> 修正”的自我迭代循环

## [前置知识](#前置知识)

在开始学习之前，建议先阅读：

-   [01-chatbots](./01-chatbots)

你需要了解：

-   REPL (Read-Eval-Print Loop) 的概念

* * *

## [1 核心理念：Code Interpreter](#1-核心理念code-interpreter)

数据分析 Agent 的核心是 **Code Interpreter** 模式：让 LLM 不直接“读完所有数据然后回答”，而是像数据分析师一样：

1.  **Analyze**：理解问题与约束（要算什么？要画什么图？要输出什么格式？）
2.  **Plan**：拆解分析步骤（清洗、统计、分组、建模、可视化）
3.  **Code**：生成可执行代码（Python/JS）
4.  **Execute**：在受控环境执行代码，拿到结构化结果
5.  **Refine**：如果报错/结果不对，修复并重试
6.  **Answer**：把结果转成“人能读懂”的洞察

### [循环流程](#循环流程)

#\_r\_1\_{margin:1.5rem auto 0;}#\_r\_1\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_1\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_1\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_1\_ .error-icon{fill:#a44141;}#\_r\_1\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_1\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_1\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_1\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_1\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_1\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_1\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_1\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_1\_ .marker.cross{stroke:lightgrey;}#\_r\_1\_ svg{font-family:inherit;font-size:16px;}#\_r\_1\_ p{margin:0;}#\_r\_1\_ .label{font-family:inherit;color:#ccc;}#\_r\_1\_ .cluster-label text{fill:#F9FFFE;}#\_r\_1\_ .cluster-label span{color:#F9FFFE;}#\_r\_1\_ .cluster-label span p{background-color:transparent;}#\_r\_1\_ .label text,#\_r\_1\_ span{fill:#ccc;color:#ccc;}#\_r\_1\_ .node rect,#\_r\_1\_ .node circle,#\_r\_1\_ .node ellipse,#\_r\_1\_ .node polygon,#\_r\_1\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_1\_ .rough-node .label text,#\_r\_1\_ .node .label text,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-anchor:middle;}#\_r\_1\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_1\_ .rough-node .label,#\_r\_1\_ .node .label,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-align:center;}#\_r\_1\_ .node.clickable{cursor:pointer;}#\_r\_1\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_1\_ .arrowheadPath{fill:lightgrey;}#\_r\_1\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_1\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_1\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_1\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_1\_ .cluster text{fill:#F9FFFE;}#\_r\_1\_ .cluster span{color:#F9FFFE;}#\_r\_1\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_1\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_1\_ rect.text{fill:none;stroke-width:0;}#\_r\_1\_ .icon-shape,#\_r\_1\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .icon-shape p,#\_r\_1\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_1\_ .icon-shape rect,#\_r\_1\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_1\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_1\_ :root{--mermaid-font-family:inherit;}

成功

报错

用户目标

生成分析计划

编写代码

执行代码

结构化结果

修正代码

生成洞察回复

* * *

## [2 实现代码执行节点](#2-实现代码执行节点)

LangGraph 本身不提供沙箱。你需要自己决定“怎么执行代码”，并把它封装成工具。

**⚠️ 注意**

千万别把 LLM 生成的代码直接在生产环境执行。真实项目里，你需要：容器隔离、资源限额、白名单依赖、网络隔离、超时与审计日志。

一个务实的教学实现是：

-   本地/开发环境：用受控的执行器（例如 Docker / 本地子进程 + 超时 + 只读数据目录）
-   线上：用独立的“代码执行服务”（沙箱）承接执行

下面我们用“工具调用”的思路，把执行器包成 Tool。

```
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
export const execPythonTool = tool(
  async ({ code }) => {
    // 伪代码：你需要把这里替换成真实的沙箱执行器
    // - 写入临时文件
    // - 调用 python 解释器/容器
    // - 捕获 stdout/stderr
    return {
      stdout: '...',
      stderr: '',
      exitCode: 0,
    };
  },
  {
    name: 'exec_python',
    description: '在受控环境执行 Python 代码，并返回 stdout/stderr。',
    schema: z.object({
      code: z.string().describe('要执行的 Python 代码（必须可独立运行）'),
    }),
  },
);
```

在 Agent 节点里，System Prompt 需要非常明确：

-   你可以使用 `exec_python` 执行代码
-   每次执行前先解释“你为什么要这么做”
-   如果报错：读取 stderr，修复后重试（不要重复同一段错误代码）

* * *

## [2.1 执行器接口约定](#21-执行器接口约定)

建议给执行器设定统一返回格式：

```
type ExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  artifacts?: string[];
};
```

**💡 说明**

统一格式可以让“总结节点”稳定解析结果。

## [2.2 规划节点示例](#22-规划节点示例)

规划节点输出“分析步骤清单”，再交给 coder：

```
const plannerNode = async (state: typeof AnalysisState.State) => {
  const prompt = `请为以下分析任务输出 3-5 步计划：${state.datasetPath}`;
  const response = await model.invoke([new HumanMessage(prompt)]);
  return { plan: String(response.content) };
};
```

## [2.3 代码修复路由](#23-代码修复路由)

当执行失败时，可以通过路由重试修复：

```
const routeAfterExec = (state: typeof AnalysisState.State) => {
  if (state.error && state.retryCount < 2) return 'fix';
  return 'summarize';
};
```

* * *

## [3 状态设计与输出](#3-状态设计与输出)

对于数据分析，State 中不仅要有 `messages`，还建议有：

-   `dataset`：数据源位置/元信息
-   `plan`：分析计划（可复用、可审计）
-   `artifacts`：图表、临时文件、SQL、代码片段
-   `analysis`：结构化结论（方便 UI 渲染）

```
import { Annotation } from '@langchain/langgraph';
import { MessagesAnnotation } from '@langchain/langgraph';
const AnalysisState = Annotation.Root({
  ...MessagesAnnotation.spec,
  datasetPath: Annotation<string>(),
  plan: Annotation<string>({
    default: () => '',
  }),
  code: Annotation<string>({
    default: () => '',
  }),
  artifacts: Annotation<{ images: string[]; tables: string[] }>({
    reducer: (a, b) => ({
      images: [...(a.images || []), ...(b.images || [])],
      tables: [...(a.tables || []), ...(b.tables || [])],
    }),
    default: () => ({ images: [], tables: [] }),
  }),
  insights: Annotation<string[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
});
```

* * *

## [4 把它串成 Graph：规划 -> 执行 -> 修正](#4-把它串成-graph规划---执行---修正)

你可以复用工具调用章节的 “Agent + ToolNode + conditional edges” 结构：

-   `planner`：让 LLM 输出分析计划（步骤列表）
-   `coder`：根据计划生成代码
-   `tools`：执行代码
-   `summarizer`：把结果转成洞察（避免把 stdout 原样丢给用户）

这类应用的关键不是“代码多”，而是**闭环**：失败能自动修复，成功能给出结构化洞察。

* * *

## [5 安全执行与沙箱设计](#5-安全执行与沙箱设计)

执行器必须有“硬边界”，例如：

-   超时终止
-   只读数据目录
-   禁止网络访问
-   依赖白名单

```
const execWithTimeout = async (code: string) => {
  const result = await sandbox.run(code, { timeoutMs: 3000, readOnly: true });
  return result;
};
```

**💡 提示**

把沙箱封装成工具，避免在 agent 节点直接执行代码。

## [6 自动修复循环](#6-自动修复循环)

让模型根据 stderr 自动修复：

```
const fixNode = async (state: typeof AnalysisState.State) => {
  const prompt = `根据错误信息修复代码：\n${state.code}\n错误：${state.error}`;
  const response = await model.invoke([new HumanMessage(prompt)]);
  return { code: String(response.content), retryCount: state.retryCount + 1 };
};
```

**⚠️ 注意**

建议限制 `retryCount`，避免无限重试。

## [7 结构化输出，便于 UI 展示](#7-结构化输出便于-ui-展示)

数据分析结果最好是结构化的：

-   表格：rows + columns
-   图表：series + labels
-   洞察：bullet list

```
return {
  artifacts: {
    tables: ['summary-table'],
    images: ['chart-1.png'],
  },
  insights: ['增长率在 Q3 提升明显'],
};
```

**ℹ️ 说明**

结构化输出可以直接驱动前端组件，无需再解析文本。

## [8 简单的前端集成思路](#8-简单的前端集成思路)

前端只负责上传数据与展示结果，执行与分析由后端完成：

```
// 前端伪代码
const resp = await fetch('/api/analyze', { method: 'POST', body: file });
const data = await resp.json();
renderCharts(data.artifacts.images);
```

* * *

## [9 结果汇总与报告生成](#9-结果汇总与报告生成)

把执行结果转换成“人能读懂”的报告是关键步骤：

```
const summarizeNode = async (state: typeof AnalysisState.State) => {
  const prompt = `请根据以下结果生成结论：\n${state.insights.join('\n')}`;
  const response = await model.invoke([new HumanMessage(prompt)]);
  return { summary: String(response.content) };
};
```

**💡 输出建议**

-   结论要短、明确、可执行
-   每条结论最好对应一项数据依据

## [10 可视化产物](#10-可视化产物)

如果需要图表，可以让代码生成图片并返回路径：

```
return {
  artifacts: { images: ['chart-sales.png'], tables: ['sales-table'] },
  insights: ['Q3 增长 12%'],
};
```

**ℹ️ 说明**

把图表视为“产物”，再由前端决定如何展示。

* * *

## [11 Python vs JS 执行](#11-python-vs-js-执行)

选择执行语言时可以参考：

-   **Python**：生态丰富（pandas、numpy、matplotlib）
-   **JS**：更易与前端一体化（node + d3）

**💡 建议**

大多数数据分析任务优先用 Python，前端展示用 JS。

* * *

## [💡 练习题](#-练习题)

1.  **场景题**：用户上传了一个包含乱码的 CSV。Agent 第一次尝试读取失败了。在 LangGraph 中，如何设计流程让 Agent 自动尝试不同的编码格式（utf-8, gbk, latin1）？
    
    点击查看答案
    
    在 state 里保存 `retryCount` 与 `encodingCandidates`，失败后切换编码并重试。
    
2.  **操作题**：给执行器增加 3 秒超时与只读目录限制。
    
    点击查看答案
    
    在 sandbox 运行时传入 `timeoutMs` 和 `readOnly` 参数。
    
3.  **思考题**：为什么分析结果要结构化输出，而不是纯文本？
    
    点击查看答案
    
    结构化数据更易渲染、复用和二次分析，减少前端解析成本。
    
4.  **操作题**：为自动修复循环加入 `retryCount` 上限。
    
    点击查看答案
    
    在路由中判断 `retryCount >= maxRetries` 时直接结束或降级。
    
5.  **思考题**：哪些场景不适合让 LLM 自动执行代码？
    
    点击查看答案
    
    涉及敏感数据、生产数据库写入、或安全边界不清晰的场景。
    

* * *

## [📚 参考资源](#-参考资源)

### [官方文档](#官方文档)

### [本项目相关内容](#本项目相关内容)

-   [工具调用与 Agent](/docs/quick-start/06-tool-calling)

* * *

## [✅ 总结](#-总结)

**本章要点**：

-   数据分析 Agent 本质上是一个具备代码执行能力的 ReAct Agent。
-   只有通过“编写代码”才能处理大规模数据，而不是让 LLM 直接“阅读”数据。
-   错误恢复机制（Error Correction）在代码生成场景中尤为重要。

**下一步**：除了分析数据，Agent 还能帮我们写代码吗？继续学习：[代码生成与辅助](./04-code-generation)。

## 相关笔记

- [[3-1 Function Calling 与 Structured Output]]
- [[2-3 Agent Loop 保险丝]]
- [[3-6 生产级权限系统的四层防线]]
- [[4-2 System Prompt 工程化与 Context Rot]]
- [[MOC - LangGraph.js 教程|LangGraph.js 教程 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
