---
title: "Databricks专家：如何构建有效的 Agent 架构"
tags: ["ai_agent", "video_transcript", "bilibili", "multi_agent", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "multi_agent", "harness_engineering"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Sandipan Bhaumik：多 Agent 不是加功能而是分布式系统；编排 vs 调度、不可变状态快照、契约校验、断路器与 Saga、LangGraph+Delta Lake 生产参考架构。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Databricks专家-如何构建有效的Agent架构.md"
source_sha256: "60288428fb530b24652afcee5aa382df220fe8645ae1e9c0a6866419e2d5c2fb"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1jhogBwEzo/"
column_url: "https://www.bilibili.com/read/cv48113155/"
host_name: "Moderator"
guest_name: "Sandipan Bhaumik"
guest_title: "Databricks 资深工程师 · 18 年分布式数据系统"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1jhogBwEzo/ingest"
speaker: "Moderator / Sandipan Bhaumik"
duration: "26:29"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1jhogBwEzo/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1jhogBwEzo/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article Host-Guest markers"
speaker_confidence: high
concepts:
  - id: multi_agent_is_distributed
    zh: 多 Agent 即分布式系统
    en: multi-agent as distributed system
    one_line: 5 个 Agent 协调复杂度约 25×，不是 5×
  - id: choreography_vs_orchestration
    zh: 编排与调度
    en: choreography vs orchestration
    one_line: 事件驱动自主 vs 中央 DAG 调度
  - id: immutable_state_snapshot
    zh: 不可变状态快照
    en: immutable state snapshot
    one_line: 版本 N→N+1 仅追加，消灭竞态
  - id: circuit_breaker_saga
    zh: 断路器与 Saga
    en: circuit breaker and saga
    one_line: 快速失败 + execute/compensate 回滚
author:
  - "[[Sandipan Bhaumik]]"
---

# Databricks 专家：真正有效的多 Agent 架构

**Host：** Moderator（AI Builder 大会）  
**Guest：** Sandipan Bhaumik（Databricks 资深工程师）  
**形态：** Host-Guest v3.2（**专栏主源**）  
**B 站：** [BV1jhogBwEzo](https://www.bilibili.com/video/BV1jhogBwEzo/) · **时长** ~26 min

---

## 开场

单 Agent demo 领导爱、团队爽。产品说「再加五个 Agent」——你以为复制粘贴，结果协调爆炸：**A 写 B 读、C 等 A 和 B、D 改共享状态、E 崩溃拖死全局**。Sandipan 在 AWS 和 Databricks 做了 18 年分布式数据系统，过去两年盯多 Agent 上生产。他见过杰出工程师反复踩同一坑：**加 Agent ≠ 加功能，是在建分布式系统**。

六章：**复杂性陷阱** → **编排 vs 调度** → **不可变状态** → **契约与校验** → **断路器与 Saga** → **Databricks 参考架构**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 编排 | choreography | 事件总线，Agent 自主订阅发布 |
| 调度 | orchestration | 中央协调器管 DAG 与重试 |
| 竞态条件 | race condition | 并发读写同一状态出岔子 |
| 不可变快照 | immutable snapshot | 只追加版本，不改旧行 |
| 数据契约 | data contract | Agent 边界 schema + 置信度门槛 |
| 断路器 | circuit breaker | 连续失败则快速失败，防级联 |
| Saga 补偿 | saga / compensate | 每步 execute + compensate 可回滚 |

---

## 01 从 1 到 5：复杂性不是线性

**Moderator：** 第一个 Agent 完美，加五个为什么崩？

**Sandipan：** 金融客户信用决策：评分 Agent 两周零问题，三天内又上了收入验证、风险、欺诈、终审四个。**20% 批准结果风险评级错**——该拦的没拦。根因：评分 Agent 写 PostgreSQL 750 分，500ms 后风险 Agent 读缓存仍是 680。**缓存没失效**，不是模型错，是架构错。五个 Agent 之间至少 **10 条潜在连接**，每条都是故障点、竞态或同步问题——难度不是 ×5，协调接近 **×25**。

> **金句：** 多 Agent 项目失败，往往不是因为 AI 烂，而是因为架构没按分布式系统想。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 缓存失效 | cache invalidation | 写库成功但读层仍过期 |
| 指数协调 | exponential coordination | N 个 Agent 的连接组合爆炸 |

**小结：** 第一个生产故事：共享缓存 + 多 Agent = 经典分布式 bug。

---

## 02 编排还是调度？

**Moderator：** 协调模式怎么选？

**Sandipan：** **编排（Choreography）**：研究 Agent 发「研究完成」事件，分析 Agent 订阅并回发「分析就绪」，报告 Agent 再接——无中央大脑，松散耦合，加 Agent 只订阅新事件。噩梦是 **调试**：谁没发事件？重复消费？没有强可观测性别选编排。

**调度（Orchestration）**：工作流调度器依次/并行调 Agent，B、C 从不互调，状态与重试全在调度器。金融几乎只用调度——要 **审计、回滚、看清顺序和数据**。Databricks 侧常用 **LangGraph** 当调度器接 Agent 框架。

决策轴：**工作流复杂度 × 自主性需求**。简单+高自主→编排；复杂+低自主→调度；又要复杂又要自主→混合（如 Saga 编排）。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 单一事实来源 | single source of truth | 调度器掌握全图状态 |
| DAG | directed acyclic graph | 有向无环工作流图 |

**小结：** 编排要可观测；调度要控制与回滚——按行业选，别凭「感觉更智能」。

---

## 03 别共享可变状态：版本 N→N+1

**Moderator：** Agent 之间怎么传数据才不打架？

**Sandipan：** 共享可变记录：A、B 同时读 680，A 写 750、B 写 720，**最后写入者赢**，A 的更新丢了。团队常假设数据库默认隔离够用——不够。

**不可变状态快照**：Agent A 产出 **版本 1**，密封追加进日志；Agent B 校验 schema 和契约，产出 **版本 2** 新行，永不改版本 1。失败回滚到版本 2；调试从版本 1 追到 N。**Python frozen dataclass + 版本号 + 创建者**；交接时三事：验契约、版本 +1、执行下一 Agent。Unity Catalog 可集中注册各 Agent 的 I/O schema。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 仅追加 | append-only | 只 INSERT 不 UPDATE |
| 数据血缘 | data lineage | 每版谁产、从哪来 |

**小结：** 状态管理占一半，契约占另一半——边界拦截垃圾，别等三个 Agent 后才发现。

---

## 04 契约、断路器与 Saga

**Moderator：** Agent 会挂，生产怎么设计容错？

**Sandipan：** **契约**：研究 Agent 承诺输出、置信度、来源、时间戳；分析 Agent 声明输入类型，**置信度 <0.7 拒收**。

**断路器**：A 调 B 包一层；B 连失败五次，断路器 **打开**，快速失败不拖死全局；冷却后半开试探。每个 Agent 调用都该有——Databricks 模型服务 / AI 网关可统一策略。

**Saga 补偿**：每个 Agent **execute + compensate**。C 失败则逆序：B.compensate()、A.compensate()，回到初始态。分布式事务语义，金融标配。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 快速失败 | fail fast | 断路器开时不傻等超时 |
| 补偿事务 | compensating transaction | 撤销已完成的步骤 |

**小结：** 假设 Agent 必失败；断路器防级联，Saga 给回滚。

---

## 05 Databricks 生产参考架构

**Moderator：** 这些模式合在一起长什么样？

**Sandipan：** 左侧 **协调器**（LangGraph + Mosaic AI Agent Framework）是唯一入口：调 Agent A→状态 v1 写 Delta；并行 B、C 读 v1→v2/v3；再调 D 合并。**Agent 永不互调**。每个 Agent 是 **Unity Catalog 函数或注册模型**，组织内可发现、可版本化；模型服务层挂断路器、重试、限流（AI 网关）。

**Delta Lake** 存状态版本与客户数据——每版一行，不原地更新。**MLflow** 绑每次调用延迟、I/O、Token；**AgentBreaks** 等打包常见多 Agent 编排，少重复造轮。C 失败→LangGraph 触发补偿链。目标：**数十亿事务、24/7**。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Unity Catalog | Unity Catalog | 数据与 Agent 资产治理 |
| LLM-as-judge | LLM-as-a-judge | MLflow 开箱评估 |

**小结：** AI 能力塞进工业级数据平台——调度、状态、治理、可观测一条龙。

---

## 总结

| 维度 | 要点 |
|------|------|
| 心智 | 多 Agent = 分布式系统，非功能叠加 |
| 协调 | 编排要可观测；金融偏调度 + 审计 |
| 状态 | 不可变版本 + 契约校验 |
| 容错 | 断路器 + Saga execute/compensate |
| 落地 | LangGraph + Unity Catalog + Delta + MLflow |

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 04:15 | 1→5 复杂性爆炸 |
| 06:42 | 编排 vs 调度 |
| 11:55 | 不可变状态快照 |
| 15:10 | 契约与边界校验 |
| 17:28 | 断路器与 Saga |
| 22:10 | Databricks 参考架构 |

### Ingest

- BV：`BV1jhogBwEzo` · 专栏 [cv48113155](https://www.bilibili.com/read/cv48113155/)
- ingest：`Recastory/workspace/bilibili-retranscribe/BV1jhogBwEzo/ingest`

### 相关阅读

- [[Databricks-企业级Agent生产实践]] — 五支柱 playbook（eval/观测/编排）
- [[DeepMind团队-当数百万Agent相遇]] — multi-agent 经济与安全
- [[Together AI-语音Agent延迟质量与规模]] — 实时 Agent 另一极：延迟预算
- [[MOC - Agent Theory and Design]]
