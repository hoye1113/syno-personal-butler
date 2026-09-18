---
title: "02 · ReAct 与 Planning — Loock AI 全栈应用开发"
tags: ["loock_ai", "coding_agent", "ai_agent"]
legacy_tags: ["loock_ai", "coding_agent", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/mini-coding-agent/02-agent-loop/02-react-and-planning"
description: "把 ReAct 模式完整落地到代码中。模型先规划（Plan）、再执行（Act）、然后观察结果（Ob erve），形成完整的智能循环。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/6-从 0 实现 Coding Agent/6-11 02 · ReAct 与 Planning.md"
source_sha256: "317101dddf535e1c70d71e4a7b7ed356c86a20c60832b47dca7cb7b3881a2752"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第 2 章 · Agent Loop 与任务规划

# 02 · ReAct 与 Planning

把 ReAct 模式完整落地到代码中。模型先规划（Plan）、再执行（Act）、然后观察结果（Observe），形成完整的智能循环。

## [从隐式 ReAct 到显式规划](#从隐式-react-到显式规划)

上一节说，第 1 章的代码已经在做 ReAct 了——模型"想"了一下，调用工具，看到结果，再"想"。只是这个"想"的过程完全藏在模型脑子里，外部看不到。

这一节要做的是：**让模型把自己的思考过程显式化**，通过一个叫"执行计划"的结构展示出来。

为什么需要显式规划？三个原因：

**复杂任务需要拆解。** "帮我修复登录页面的 bug"不是一个工具调用就能搞定的。模型需要先搜索相关文件、理解代码结构、定位 bug、设计修复方案、验证修复效果。如果不提前规划，模型容易东一榔头西一棒子，来回兜圈子。

**规划让过程可观测。** 用户能看到"agent 打算分几步做"，比看到"agent 在忙"要有价值得多。如果规划不合理，用户可以提前介入调整。

**规划支持失败恢复。** 如果第 3 步失败了，模型知道"第 1、2 步已经做完了"，可以针对第 3 步换一种方法，而不是从头来过。

## [Plan-Act-Observe 模式](#plan-act-observe-模式)

ReAct 有一个常见变体：**Plan-Act-Observe**。区别在于增加了一个显式的"规划"阶段：

#\_r\_1\_{margin:1.5rem auto 0;}#\_r\_1\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_1\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_1\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_1\_ .error-icon{fill:#a44141;}#\_r\_1\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_1\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_1\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_1\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_1\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_1\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_1\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_1\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_1\_ .marker.cross{stroke:lightgrey;}#\_r\_1\_ svg{font-family:inherit;font-size:16px;}#\_r\_1\_ p{margin:0;}#\_r\_1\_ .label{font-family:inherit;color:#ccc;}#\_r\_1\_ .cluster-label text{fill:#F9FFFE;}#\_r\_1\_ .cluster-label span{color:#F9FFFE;}#\_r\_1\_ .cluster-label span p{background-color:transparent;}#\_r\_1\_ .label text,#\_r\_1\_ span{fill:#ccc;color:#ccc;}#\_r\_1\_ .node rect,#\_r\_1\_ .node circle,#\_r\_1\_ .node ellipse,#\_r\_1\_ .node polygon,#\_r\_1\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_1\_ .rough-node .label text,#\_r\_1\_ .node .label text,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-anchor:middle;}#\_r\_1\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_1\_ .rough-node .label,#\_r\_1\_ .node .label,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-align:center;}#\_r\_1\_ .node.clickable{cursor:pointer;}#\_r\_1\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_1\_ .arrowheadPath{fill:lightgrey;}#\_r\_1\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_1\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_1\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_1\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_1\_ .cluster text{fill:#F9FFFE;}#\_r\_1\_ .cluster span{color:#F9FFFE;}#\_r\_1\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_1\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_1\_ rect.text{fill:none;stroke-width:0;}#\_r\_1\_ .icon-shape,#\_r\_1\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .icon-shape p,#\_r\_1\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_1\_ .icon-shape rect,#\_r\_1\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_1\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_1\_ :root{--mermaid-font-family:inherit;}

不需要

需要

有

没有

Plan  
模型拆解任务，创建执行步骤

Act  
执行第一个步骤

Observe  
看到第一步的结果

需要调整计划吗？

Act  
执行下一个步骤

Plan  
调整计划

Observe

还有步骤吗？

Done  
汇总结果

在代码里，Plan 由 `create_todos` 工具实现，Act 由各种工具（search、read\_file 等）实现，Observe 就是把工具结果追加到对话历史中。

## [系统提示词的升级](#系统提示词的升级)

要让模型知道"先规划再执行"，最直接的方法是在系统提示词里告诉它：

```
const systemMessage: Message = {
  role: "system",
  content: [
    "你是一个代码仓库助手，运行在用户的本地终端中。",
    "用户会问你关于当前代码仓库的问题，或让你完成开发任务。",
    "",
    "## 工作方式",
    "",
    "对于复杂任务，先用 create_todos 工具创建执行计划，然后按步骤执行。",
    "每开始一个步骤时，用 update_todo 标记为 running。",
    "完成一个步骤时，标记为 completed。",
    "如果某个步骤失败，标记为 failed，然后尝试换一种方法。",
    "",
    "对于简单问题，可以直接使用搜索和读文件工具回答，不需要创建计划。",
    "",
    "## 行为准则",
    "",
    "必须使用提供的工具来搜索和读取文件，基于工具返回的实际内容回答问题。",
    "不要猜测或编造文件内容，始终先用工具获取信息再回答。",
    `工作目录：${state.workingDir}`,
  ].join("\n"),
};
```

和第 1 章相比，核心改动是加了"工作方式"部分。它告诉模型：

**复杂任务先规划。** 用 `create_todos` 拆步骤，然后按步骤执行。

**简单任务直接干。** "入口文件在哪"这种问题不需要建计划，直接搜索就行。避免给每个小问题都搞一堆 overhead。

**失败时换方法。** 这就是 **Repair Loop** 的思路：步骤失败了不是放弃，而是标记为 failed，然后尝试另一种方法。

## [模型怎么"学会"用计划工具](#模型怎么学会用计划工具)

模型不会自动知道怎么用 `create_todos` 和 `update_todo`。它依赖两样东西：

**工具的 description。** 每个工具的 `description` 字段告诉模型这个工具做什么、什么时候该用。写好 description 是引导模型正确使用工具的关键。

**系统提示词中的引导。** "对于复杂任务，先用 create\_todos 工具创建执行计划"这句话直接告诉模型什么时候该建计划。

这两样东西组合起来，模型就能在看到复杂任务时自动创建计划，在简单任务时跳过规划直接执行。

## [Repair Loop：失败了怎么办](#repair-loop失败了怎么办)

步骤执行失败是常态。搜索可能找不到结果，读文件可能路径不对，工具可能超时。关键不是"避免失败"，而是"失败后怎么办"。

我们的做法很简单：**把错误信息原样返回给模型。**

```
const result = await tool.execute(toolCall.arguments, state);
```

如果工具执行失败，`result` 会是类似 `"搜索出错：未找到匹配文件"` 的文本。这段文本被追加到对话历史中，模型在下一轮 Reason 时会看到它，然后可以：

1.  换一个搜索关键词重试
2.  用不同的工具（比如从 search 换成 read\_file）
3.  标记步骤为 failed，跳到下一步
4.  判断当前方案不可行，调整计划

这就是 Repair Loop：**失败 → 观察 → 调整策略 → 重试**。它不需要单独的代码逻辑，而是自然地发生在 ReAct 循环中。

## [这一节做了什么](#这一节做了什么)

-   定义了 Plan-Act-Observe 模式
-   升级了系统提示词，引导模型对复杂任务先规划
-   说明了 Repair Loop 的原理：错误信息回传给模型，模型自行调整

但规划需要数据结构支撑。下一节实现 Todo 机制——定义步骤的类型、状态管理，以及两个让模型操作步骤的工具。

## 相关笔记

- [[3-1 Function Calling 与 Structured Output]]
- [[2-3 Agent Loop 保险丝]]
- [[MOC - 从 0 实现 Coding Agent|从 0 实现 Coding Agent 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
