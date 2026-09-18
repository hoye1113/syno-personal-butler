---
title: "01 · 为什么需要 SubAgent — Loock AI 全栈应用开发"
tags: ["loock_ai", "coding_agent", "ai_agent"]
legacy_tags: ["loock_ai", "coding_agent", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/mini-coding-agent/10-multi-agent/01-why-subagent"
description: "单 agent 面对复杂任务时，上下文膨胀、角色混乱。角色分工是自然的解法。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/6-从 0 实现 Coding Agent/6-52 01 · 为什么需要 SubAgent.md"
source_sha256: "b615d165d940ad0b6926421ecda29d3de4393275033b6357055006e6bad0c0c9"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第 10 章 · SubAgent 协作

# 01 · 为什么需要 SubAgent

单 agent 面对复杂任务时，上下文膨胀、角色混乱。角色分工是自然的解法。

## [单 agent 的瓶颈](#单-agent-的瓶颈)

前 9 章的 agent 是单体的——一个模型实例承担所有角色：搜索信息、规划任务、修改代码、审查结果。对于简单任务，这没问题。但任务变复杂时会出现两个问题：

**上下文膨胀。** 复杂任务需要很多轮工具调用。对话历史越来越长——搜索结果、文件内容、命令输出全在 `allMessages` 里。模型需要在越来越长的上下文中找到关键信息，准确率下降。

**角色混乱。** 模型在同一个对话中既是"搜索者"又是"修改者"又是"审查者"。它刚搜索完代码，就要切换到"修改模式"，然后再切换到"审查模式"。角色切换没有明确的边界，容易互相干扰。

## [解决方案：角色分工](#解决方案角色分工)

人类团队处理复杂项目时，不会让一个人干所有事。项目经理拆解任务，开发写代码，测试验证结果。每个人都专注于自己的角色。

同样的思路可以应用到 agent：**把复杂任务拆分后，分配给不同角色的 subagent 执行。**

```
主 agent（协调者）
  ├── subagent [explorer] → 搜索相关文件、收集信息
  ├── subagent [editor]   → 根据信息修改代码
  └── subagent [reviewer] → 审查修改结果
```

每个 subagent 都是一个独立的 agent 实例，拥有自己的：

-   系统提示词（角色定义）
-   对话历史（只包含自己的任务）
-   迭代次数（受限，避免跑飞）

主 agent 不直接做具体工作——它负责规划和协调。subagent 负责执行。

## [和单 agent 的对比](#和单-agent-的对比)

单 agent

多 agent

上下文

所有信息在一个对话中

每个角色独立上下文

角色切换

隐式，靠系统提示词引导

显式，每个 subagent 有专门提示词

失败隔离

一个环节失败影响全局

一个 subagent 失败不影响其他

成本

单次长对话，token 多

多次短对话，每次 token 少但总次数多

多 agent 不是免费的午餐——它增加了调用次数和复杂度。但对于需要多步骤、多视角的复杂任务，角色分工带来的稳定性提升值得这个成本。

## [实现策略](#实现策略)

在 mini-coding-agent 中，subagent 不是独立进程，而是**同一个 Model 实例的多次调用**。每个 subagent 拥有独立的对话历史和系统提示词，但共享工具集和模型连接。

```
SubAgent(model, tools, role)
  ├── 独立的系统提示词（ROLE_PROMPTS[role]）
  ├── 独立的对话历史（只有当前任务的上下文）
  ├── 共享的 Model 实例（复用 API 连接）
  └── 共享的 Tool 实例（复用工具逻辑）
```

这种设计避免了重复创建模型连接的开销，同时保证了上下文隔离。

下一节定义三个角色。

## 相关笔记

- [[3-1 Function Calling 与 Structured Output]]
- [[MOC - 从 0 实现 Coding Agent|从 0 实现 Coding Agent 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
