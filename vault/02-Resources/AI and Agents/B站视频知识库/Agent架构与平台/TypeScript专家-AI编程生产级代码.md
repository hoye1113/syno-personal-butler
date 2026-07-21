---
title: "TypeScript专家：AI编程如何写出生产级代码"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "context_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "context_engineering"]
created: "2026-07-07"
source: "https://www.bilibili.com/video/BV11s526kEAk/"
description: "Matt Pocock 工作坊：智能区/愚蠢区；拷问我技能对齐；垂直切片；TDD 红绿重构；深层模块；白班规划夜班 AFK 并行代理。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/TypeScript专家-AI编程生产级代码.md"
source_sha256: "b97bfd3a90eee626378932eac2b63206904f73ab9f6c9a66767f26b3b702500b"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV11s526kEAk/"
column_url: "https://www.bilibili.com/read/cv49010866/"
host_name: "Matt Pocock"
guest_name: "Matt Pocock"
guest_title: "TypeScript 教育专家 · AI Hero"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV11s526kEAk/ingest"
speaker: "Matt Pocock"
duration: "1:36:33"
saved: 2026-07-07
updated: 2026-07-07
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV11s526kEAk/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV11s526kEAk/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "研讨会单人主讲 reframed"
speaker_confidence: high
concepts:
  - id: smart_dumb_zone
    zh: 智能区与愚蠢区
    en: smart zone vs dumb zone
    one_line: ~10 万 token 后注意力二次方恶化
  - id: torture_me_skill
    zh: 拷问我技能
    en: Torture Me skill
    one_line: 编码前让 AI 盘问计划逼出边界
  - id: vertical_slice
    zh: 垂直切片
    en: vertical slice / tracer bullet
    one_line: 薄功能跨全栈，每步可运行反馈
  - id: day_shift_night_shift
    zh: 白班规划夜班执行
    en: day-shift planning / night-shift AFK
    one_line: 人白天对齐 QA，代理夜间并行实现
author:
  - "[[Matt Pocock]]"
---

# TypeScript专家：AI编程如何写出生产级代码

**Host：** Matt Pocock（研讨会主讲）  
**形态：** Host-Guest v3.2（专栏主源 · 教学 reframed）  
**B 站：** [BV11s526kEAk](https://www.bilibili.com/video/BV11s526kEAk/) · **时长** ~97 min

---

## 开场

AI 是新范式，但**对人类协作管用的软件工程基础，对 AI 同样管用**。Matt 用两小时工作坊证明：不靠「规范即代码」幻想，靠**结构化工作流**把 LLM 留在智能区。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 智能区 | smart zone | 上下文短、决策质量高 |
| 愚蠢区 | dumb zone | token 堆积后变笨 |
| 垂直切片 | vertical slice | 端到端薄功能增量 |
| 深层模块 | deep module | 接口简单、内部厚实 |
| 压缩 | compacting / compression | 把历史挤成摘要（Matt 不喜欢） |

---

## 01 智能区与愚蠢区：别贪大上下文

**Matt：** Dex Hovarth 观点：每加一个 token，注意力关系近似**二次方**增长——大约 **10 万 token** 附近变蠢，跟宣称的百万窗口无关。一直聊→压缩→再聊，沉积物越多越差。多阶段计划本质是循环；Ralph（做一点靠近 PRD）还行，但 Matt 要更多结构。

另一限制：模型像《记忆碎片》——**清上下文就失忆**。理想会话：小 system prompt → 探索 → 实现 → 测试反馈；**盯状态栏 token 数**，知道离愚蠢区多远。Matt **讨厌压缩**，宁愿 ROM 清零重来。

**本章小结：** 任务必须切到智能区能扛的大小；巨型单会话必蠢。

---

## 02 拷问我：编码前先对齐设计概念

**Matt：** 演示 CMS 新功能，第一个技能 **「Torture Me」**——极小，却专治**对齐偏差**：别扔 PRD 就开写，让 AI **无情盘问**计划每个洞（数据回填、边界情况）。异步拷问逼你想清楚，人和模型在编码前共享**设计概念**，不是逐行 spec。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 对齐偏差 | misalignment | 你以为说清了，模型理解另一套 |
| 设计概念 | design concept | 双方认同的架构意图 |

**本章小结：** 拷问式对齐 > 长 PRD 直出代码。

---

## 03 垂直切片与 TDD：给 AI 导航仪

**Matt：** AI 爱按**水平层**写：先 DB、再 API、再前端——反馈滞后。用**示踪弹**：PRD 拆成跨全栈的薄切片，每步结束都能跑集成测试。

**TDD 是代理导航仪**：红-绿-重构，先失败测试再实现，防模型在测试里**作弊**。反馈环质量决定 AI 输出上限；烂测试库→烂 AI 产出。

**深层模块**（《软件设计的哲学》）：浅层模块文件多、依赖杂，AI 难导航；**接口简单、内里厚**，人盯契约，实现委托给代理。

**本章小结：** 垂直切片 + TDD = 可验证小步；架构要 AI 可读。

---

## 04 白班规划、夜班 AFK：并行代理

**Matt：** 人的价值在**白班**：构思、对齐、QA。实现变**夜班**——看板管依赖，Docker 沙盒里**多代理并行**独立分支，人最后做带品味的 Code Review。

> **金句 · Matt**
> **中文：** 没有反馈环的 AI 只能盲目编码。
> **原文：** Without a feedback loop, AI is just coding blind.

---

## 总结

| 维度 | 要点 |
|------|------|
| 上下文 | 智能区工作，拒绝巨型会话 |
| 对齐 | Torture Me 拷问 |
| 切任务 | 垂直切片非水平分层 |
| 质量 | TDD + 深层模块 |
| 流程 | 白班人 / 夜班代理 |

### 相关阅读

- [[Jeff-AGENTS.md历史与最佳实践]] — 上下文槽位与愚蠢区
- [[Geoff-Ralph Loops的基础设施]] — Ralph 循环
- [[MOC - Harness Engineering]]

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 05:40 | 智能区/愚蠢区 |
| 14:15 | 拷问我技能 |
| 45:20 | 垂直切片 |
| 65:10 | TDD |
| 78:45 | 深层模块 |
| 88:30 | 白班/夜班工作流 |

### ingest 路径

`Recastory/workspace/bilibili-retranscribe/BV11s526kEAk/ingest/column_article.md`

**spot_check：** ≥45 min，建议抽 65:10 TDD 演示段。
