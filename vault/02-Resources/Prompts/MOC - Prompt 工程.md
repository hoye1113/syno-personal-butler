---
title: "MOC - Prompt 工程"
tags: ["moc", "ai_agent", "prompting", "skills"]
legacy_tags: ["moc", "ai_agent", "prompting", "skills"]
created: "2026-06-11"
source: "local://02-Resources/Prompts/"
description: "Prompt 工程主题横切 MOC——跨 02-Resources/Prompts/、01-Areas/AI Agent Development/、B站视频知识库 三大子目录"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/Prompts/MOC - Prompt 工程.md"
source_sha256: "9578c0c9db3b42f6b7f1e695afbf5498493085d0549fa59fb08a64c78680e619"
migration_id: "migration-20260720-64e79771"
updated: 2026-06-11
---

# MOC - Prompt 工程

> **横切 MOC**：跨 `02-Resources/Prompts/`、`01-Areas/AI Agent Development/`、`02-Resources/AI and Agents/B站视频知识库/` 的 Prompt / Skills / 上下文工程相关笔记。
>
> **核心范围**：从"具体的 Prompt 模板"到"Skills 体系设计"到"上下文工程理论"——3 个层次。

---

## A. 具体 Prompt 模板（13 个）

> 来自 `02-Resources/Prompts/` 子目录，按用途分类：

### 内容创作（5 个）

| Prompt | 用途 |
|--------|------|
| [[Rewrite as tweet]] | 长文转 tweet |
| [[Rewrite as tweet thread]] | 长文转 tweet 串 |
| [[Generate table of contents]] | 生成文章目录 |
| [[Generate glossary]] | 生成术语表 |
| [[Emojify]] | 加 emoji |

### 文本润色（6 个）

| Prompt | 用途 |
|--------|------|
| [[Translate to Chinese]] | 英译中 |
| [[Summarize]] | 摘要 |
| [[Simplify]] | 简化 |
| [[Remove URLs]] | 移除 URL |
| [[Make shorter]] | 缩短 |
| [[Make longer]] | 加长 |
| [[Fix grammar and spelling]] | 修语法/拼写 |
| [[Explain like I am 5]] | 通俗解释 |

### Web 抓取（2 个）

| Prompt | 用途 |
|--------|------|
| [[Clip YouTube Transcript]] | 抓 YouTube 转录 |
| [[Clip Web Page]] | 抓网页生成笔记 |

---

## B. Skills 体系（2 篇核心 + 1 实战）

> 围绕 "Agent Skills" 这一概念展开。

| 笔记 | 来源 | 视角 |
|------|------|------|
| [[3-5 Skills - Agent 时代的知识分发系统]] | Sitor AI 课程 | **理论 + 实践**：Skills 作为 .md 文件的设计哲学 |
| [[Codex 自我改进 Prompt]] | 公众号 | **改进循环**：OpenAI agent improvement loop，从 traces 到 Skill/Automation 的固化 |
| [[Codex实战-构建全能AI营销团队]] | B站视频 | **实战案例**：Codex 7 大 Skills、Grounding、YouTube 接地 |

---

## C. 上下文工程（4 篇）

> Prompt 的"系统级"升级版——不只管 prompt 本身，而是管 prompt 周围的所有上下文。

| 笔记 | 来源 | 核心 |
|------|------|------|
| [[OpenAI官方-GPT-5.6 提示词指南]] | OpenAI 官方文档 | 一手权威：减法范式、结果优先、自主性边界、PTC、检索预算、迁移一次只改一处 |
| [[Manus创始人-深度干货-上下文工程的最佳实践]] | B站视频 | Context Engineering 范式、Context Offloading 策略 |
| [[OpenAI员工-上下文工程和Agent记忆]] | B站视频 | 3 大记忆模式（Reshape & Fit, Isolate & Route, Extract & Retrieve）|
| [[Anthropic Agent 工程实战指南 - 从入门到生产落地#第 7 章 上下文工程]] | 公众号 | Anthropic 的 Context Engineering 体系化梳理 |

---

## D. Prompt 工程的演进史（路径理解）

> 来自 [[2026 年 Agent 最重要的工程概念 Harness Engineering]] 译者导读：

```
2024 — 提示词工程（教模型听懂话）
   ↓
2025 — 上下文工程（让模型看到全貌）
   ↓
2026 — Harness Engineering（给 Agent 搭整套工作环境）
```

**Prompt 工程是 Harness 的"子集"**——harness 包括 system prompt、记忆、压缩、权限、反馈循环。Prompt 工程是 harness 里的"system prompt + 用户输入"那一层。

---

## 跨 MOC 链接

| 横切主题 | MOC |
|----------|-----|
| Agent 理论与实践总览 | [[MOC - Agent Theory and Design]] |
| Harness 工程（含 system prompt 设计）| [[MOC - Harness Engineering]] |

### 关联 Areas
- [[AI Agent Development]] — sanyuan 的系统课程（3-5 Skills 在此）

---

## 维护

- **总笔记数**：13 Prompt 模板 + 4 Skills/Context 笔记 = 17 核心
- **最后更新**：2026-07-15（新增 [[OpenAI官方-GPT-5.6 提示词指南]]）
- **入选标准**：笔记主题直接讨论"Prompt 设计 / Skills 体系 / 上下文工程"——不收录单纯的"Agent 实现细节"或"模型架构"
