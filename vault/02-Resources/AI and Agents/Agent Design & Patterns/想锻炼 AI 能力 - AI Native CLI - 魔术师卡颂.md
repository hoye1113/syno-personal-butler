---
title: "想锻炼 AI 能力 - AI Native CLI"
tags: ["ai_agent", "ai_coding", "article", "wechat", "harness_engineering", "skills"]
legacy_tags: ["ai_agent", "ai_coding", "article", "wechat", "harness_engineering", "skills"]
created: "2026-07-02"
source: "obsidian_repository_snapshot"
description: "魔术师卡颂：锻炼驾驭 AI 的好方向是把传统 CLI 改成面向 Agent 的 AI Native CLI——结构化 stdout、可恢复错误、分级权限、内置 Skill 替代文档"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/想锻炼 AI 能力 - AI Native CLI - 魔术师卡颂.md"
source_sha256: "6f8fb03f5fd12630dcc94216760de00de58c941ba0b9029be397cc196bf97e42"
migration_id: "migration-20260720-64e79771"
author:
  - "[[魔术师卡颂]]"
date: 2026-06-26
---

# 想锻炼 AI 能力，当下有个很好的方向

> 作者：@魔术师卡颂 | 公众号「AI 机会」| 2026-06-26

---

## 核心命题

想练**驾驭 AI**，卡颂给一个当下好方向：

**做传统 CLI 的 AI Native 改造**——把「面向人类开发者」的命令行，改成「面向 Agent」的命令行。

**为什么值得做：**

- 活跃 CLI = 需求已被验证
- 面向 Agent 设计 = 更大市场空间
- 比从零造概念更容易拿到正反馈

---

## 什么是 AI Native CLI（自底向上）

### 1. stdout 是协议，不是文案

所有命令返回**结构化数据**，例如：

```json
{ "ok": true, "data": ... }
{ "ok": false, "error": ... }
```

Agent 能读自然语言，但结构化输出让语义**更稳定**。

### 2. 错误可恢复

人类 CLI 报错示例：

```text
Import failed: missing required column: email
```

人懂，去改 CSV。

AI Native 应返回机器可行动的 payload：

```json
{
  "ok": false,
  "error": {
    "code": "missing_required_column",
    "message": "CSV is missing required column: email."
  },
  "hint": "Retry with --map \"Email Address=email\" and use --dry-run first."
}
```

除原因外，用 **hint** 引导 Agent 下一步怎么改——和 [[驾驭 AI - 把不确定问题转化为可控实验 - 魔术师卡颂]] 里的反馈闭环同构。

### 3. 权限设计：默认用户是 Agent

CLI 使用者从「只有人类开发者」变成 **Agent + 人类把关**：

| 级别 | 示例 | 规则 |
|------|------|------|
| 一般 | 读数据 | Agent 直接执行 |
| 中危 | 写数据 | 先 `--dry-run` 看影响 → 确认后再 `--yes` 写入 |
| 高危 | 写重要数据 | Agent 无权限，显式要求开发者接管 |

### 4. 无需文档 → 内置 Skill

人类用 CLI：**有需求 → 查文档 → 串命令**。

AI Native CLI：

- 大流程（如项目内如何初始化）→ CLI **内置 Skill**
- Agent 只需知道「什么场景调哪个内置 Skill」
- 流程卡点 → **自恢复**（结构化错误 + hint）

文档从「给人看」变成「给 Agent 用的 Skill 包」——和 [[WorkOS-创建和使用Skills方法论]] 里「可移植工作单元」一脉。

---

## 实例：docs-harness

卡颂举例：[docs-harness](https://github.com/BetaSu/docs-harness)——**AI Native 项目文档管理工具**，让 Agent 稳定地发现 / 阅读 / 校验 / 维护仓库文档。

可把仓库地址丢给 Agent，对比传统 CLI 设计差异（结构化输出、错误 hint、权限分级等）。

---

## 和卡颂其他文章的关系

| 概念 | 本篇 | 姊妹篇 |
|------|------|--------|
| 留痕 | CLI 返回与错误即可分析协议 | [[遇事留痕 - Loop Engineering 的基础 - 魔术师卡颂]] |
| 可控实验 | `--dry-run` / hint 把修 CSV 变闭环 | [[驾驭 AI - 把不确定问题转化为可控实验 - 魔术师卡颂]] |
| Loop | [[未来的 AI 编程就是 Loop 套 Loop - 魔术师卡颂]] | [[Loop Engineering 橙皮书 - 花叔]] |

---

## 相关阅读

- [[驾驭 AI - 把不确定问题转化为可控实验 - 魔术师卡颂]] — 同一作者；hint + dry-run = 可控实验在 CLI 层的落地
- [[遇事留痕 - Loop Engineering 的基础 - 魔术师卡颂]] — 执行过程留痕；CLI 结构化输出是机器可读留痕
- [[WorkOS-创建和使用Skills方法论]] — Skills 规模化；CLI 内置 Skill 替代人类文档
- [[PlanetScale-Agent时代的基础设施]] — small sharp tools；Agent 时代接口设计
- [[MOC - Harness Engineering]] — Harness 横切入口
