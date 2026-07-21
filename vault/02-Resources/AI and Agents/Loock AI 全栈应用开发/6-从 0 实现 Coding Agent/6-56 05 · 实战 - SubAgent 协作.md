---
title: "05 · 实战：SubAgent 协作 — Loock AI 全栈应用开发"
tags: ["loock_ai", "coding_agent", "ai_agent"]
legacy_tags: ["loock_ai", "coding_agent", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/mini-coding-agent/10-multi-agent/05-complex-task"
description: "把前面所有能力综合起来，让主 agent 通过 delegate_task  工具协调多个  ubagent 完成复杂任务。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/6-从 0 实现 Coding Agent/6-56 05 · 实战 - SubAgent 协作.md"
source_sha256: "e5cf67c93bc7bf08b9c767caa5cea6fc88c592f5fdf9d7b795b53912381a2a6c"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第 10 章 · SubAgent 协作

# 05 · 实战：SubAgent 协作

把前面所有能力综合起来，让主 agent 通过 delegate\_tasks 工具协调多个 subagent 完成复杂任务。

## [完整流程](#完整流程)

用一个例子走完多 agent 协作的完整流程。

**用户任务：** "项目里有个测试失败了，帮我找到原因并修复"

**主 agent 分析后决定 delegate，调用 delegate\_tasks 工具：**

```
{
  "tasks": [
    {
      "task": "找到失败的测试用例，读取测试文件和相关源文件，分析失败原因",
      "role": "explorer"
    },
    {
      "task": "根据失败原因修复源代码中的 bug",
      "role": "editor"
    },
    {
      "task": "运行修复后的测试，检查代码质量",
      "role": "reviewer"
    }
  ]
}
```

**第一步：explorer subagent 执行**

explorer 收到任务："找到失败的测试用例..."。它搜索测试文件、读取源代码、运行测试命令，返回结构化的分析结果：

```
失败的测试：test/agent.test.ts > "达到最大迭代次数时返回兜底结果"
原因：测试期望 modelCalls 为 4，但实际为 5
相关文件：src/agent.ts（第 98-106 行）
```

**第二步：editor subagent 执行**

editor 收到任务 + explorer 的结果。它读取 `src/agent.ts`，理解问题，修改代码：

```
已修改 src/agent.ts：将初始 modelCalls 计数调整为在第一次调用前不递增
```

**第三步：reviewer subagent 执行**

reviewer 收到任务 + explorer 和 editor 的结果。它读取修改后的文件，运行测试：

```
Critical: 无
Warning: 无
OK: 修改正确，测试全部通过
```

**主 agent 汇总所有结果，返回给用户。**

## [和单 agent 的区别](#和单-agent-的区别)

同一个任务，单 agent 也能做。区别在于：

**单 agent：** 搜索 → 读文件 → 修改 → 跑测试 → 审查。所有信息在一个对话中，上下文越来越长。如果中间某步出了问题，需要在同一个长对话中调整。

**多 agent：** 搜索（explorer） → 修改（editor） → 审查（reviewer）。每个环节独立，上下文干净。如果 editor 改错了，reviewer 发现问题，可以再启动一轮 editor 修正。

多 agent 的优势在**复杂度**和**可靠性**上体现。简单任务用单 agent 更快；复杂任务用多 agent 更稳。

## [成本对比](#成本对比)

多 agent 的成本通常高于单 agent（多次模型调用），但每个 subagent 的上下文更短，单次调用的 token 消耗更少：

单 agent

多 agent

模型调用次数

5-8 次

3 × 2-3 次 = 6-9 次

单次上下文长度

逐渐增长

每次都比较短

总 token 消耗

可能更多（长上下文）

可能更少（短上下文 × 多次）

具体哪个更省 token 取决于任务。但多 agent 的核心价值不是省钱——是**可靠性**。

## [本章回顾](#本章回顾)

第 10 章实现了多 agent 协作：

新增

文件

作用

SubAgent 类型

`src/subagent/types.ts`

角色定义、系统提示词

SubAgent 类

`src/subagent/subagent.ts`

独立 agent 实例

Orchestrator

`src/subagent/orchestrator.ts`

串行编排、结果传递

delegate\_tasks

`src/tools/delegate.ts`

暴露给主 agent 的工具

加上之前章节的测试，整个项目现在有 179 个测试用例。还剩最后一章（第 11 章：CLI 产品化与毕业项目）。

## 相关笔记

- [[MOC - 从 0 实现 Coding Agent|从 0 实现 Coding Agent 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
