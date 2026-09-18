---
title: "Loop Engineering 橙皮书"
tags: ["ai_agent", "harness_engineering", "course"]
legacy_tags: ["ai_agent", "harness_engineering", "course", "additive_content"]
created: "2026-06-15"
source: "obsidian_repository_snapshot"
description: "别再问我什么是 Loop Engineering — 橙皮书系列，花叔著，4 部分 9 章系统讲解循环工程"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/Loop Engineering 橙皮书 - 花叔.md"
source_sha256: "9a3edb8a81e4de9099ae0e8ad99f2436fd4d395fd0de6bdc00910ad51686b127"
migration_id: "migration-20260720-64e79771"
author:
  - "[[花叔]]"
---

# Loop Engineering 橙皮书

> 别再自己一句句指挥 agent 了，去设计一个替你指挥它的系统。

## 基本信息

- **作者**：花叔（HuaShu）· AI Native Coder · 独立开发者
- **系列**：橙皮书系列（免费 AI 工具指南）
- **版本**：v260615（2026-06-15 首版）
- **许可**：MIT License
- **仓库**：[alchaincyf/loop-engineering-orange-book](https://github.com/alchaincyf/loop-engineering-orange-book)
- **下载**：[huasheng.ai/orange-books](https://www.huasheng.ai/orange-books)

## 内容结构

**4 个部分，9 章：**

| 部分 | 内容 | 章节 |
|------|------|------|
| 一 · 它是什么 | 定义、一周引爆的来龙去脉、prompt → context → harness → loop 四层栈 | §01–02 |
| 二 · 它怎么转 | 一个循环的五个动作、搭它需要的六个零件、为什么写代码的 AI 不能给自己打分 | §03–05 |
| 三 · 它在哪跑、要什么代价 | 三个真实的 loop（Addy 的早间分诊、Stripe 的 Minions、调度的现实），和四笔代价 | §06–07 |
| 四 · 你怎么开始 | 当工程师而不只是按启动键、今天就搭你的第一个 loop | §08–09 |

## 核心概念

### 四层栈

| 层 | 管什么 | 核心问题 |
|---|---|---|
| Prompt engineering | 写好一次的提示词 | 我该告诉模型什么？ |
| Context engineering | 这一刻窗口里放什么 | 检索什么、摘掉什么、清掉什么？ |
| Harness engineering | 单次运行的全套武装 | 给哪些工具、允许哪些动作、什么算完成？ |
| **Loop engineering** | **在 harness 之上调度** | **怎么让它自己一遍遍跑起来？** |

### 一个循环的五个动作

1. **发现（Discovery）** — 让 agent 自己去找活，用 `$skill-name` 而不是硬编码指令
2. **交付（Handoff）** — 切成隔离的小任务，用 git worktree 避免冲突
3. **验证（Verification）** — 换一个 agent 来审，写代码的不能给自己的作业打分
4. **记忆持久化（Memory）** — 结果写进文件，跨轮次保持连续感
5. **调度（Scheduling）** — 定时器让前面四个动作自动循环

### 六个零件

| 零件 | 在 loop 里的工作 |
|---|---|
| **Automations** | 按计划做 discovery + triage |
| **Worktrees** | 隔离并行任务 |
| **Skills** | 把项目知识固化下来 |
| **Plugins / Connectors** | 连接真实工具（Issue tracker、CI、Slack） |
| **Sub-agents** | 一个出主意，一个检查 |
| **State** | 记住做了什么、还剩什么 |

### 四笔代价

1. **验证债**（Verification Debt）— 无人值守的 loop 也是无人值守地犯错
2. **理解腐烂**（Comprehension Debt）— loop 越快交付你没写的代码，理解差距越大
3. **Token 失控** — Sub-agent 和长运行 loop 的 token 消耗可能爆炸
4. **认知投降**（Cognitive Surrender）— loop 自己跑起来后，你不再有意见

## 适合谁读

- 已经在用 Claude Code / Codex / Cursor、但还在一句句手动喂 agent，想往上走一层的人
- 好奇「你不该再 prompt 你的 agent」为什么一周内传疯的 AI 重度用户
- 读过《Harness Engineering》橙皮书、想要那层外循环的人

## 与其他笔记的关系

Loop engineering 坐在 **harness 的上一层楼**：
- [[Harness Engineering]] 负责武装单次 agent 运行
- **Loop engineering** 是它之上那层外壳：在定时器上跑、自己孵化小帮手、验证产出、记下做过什么、决定下一步

---

## 相关阅读

- [[Harness Engineering]] — Loop 的下一层，单次运行的全套武装
- [[Context Engineering]] — Loop 的第二层，窗口里放什么
- [[MOC - Harness Engineering]] — Harness 主题索引
