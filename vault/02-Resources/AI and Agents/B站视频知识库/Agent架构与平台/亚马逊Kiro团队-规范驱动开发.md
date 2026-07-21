---
title: "亚马逊 Kiro 团队：规范驱动开发"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "mcp", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "mcp", "harness_engineering"]
created: "2026-07-07"
source: "B站视频 - Easonlee的AI笔记"
description: "Kiro 首席工程师 Al Harris：规范驱动开发（SDD）、EARS 需求与属性测试、MCP 贯穿需求/设计/实现、活文档与准确性优先于延迟。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/亚马逊Kiro团队-规范驱动开发.md"
source_sha256: "ee50f8c87eb80083179444944f2a9339d1ade6f8113afa962e4dcbe3a68ba4b1"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1VczqBREQ8/"
column_url: "https://www.bilibili.com/read/cv45039880/"
host_name: "编者问"
guest_name: "Al Harris"
guest_title: "Amazon 首席工程师 · Kiro"
material_tier: S
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1VczqBREQ8/ingest"
speaker: "Moderator / Al Harris"
duration: "63:50"
saved: 2026-07-07
updated: 2026-07-07
transcript_source: "bilibili-retranscribe/BV1VczqBREQ8/article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1VczqBREQ8/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "ASR + column keynote；编者重构过渡问"
speaker_confidence: high
factual_status: partial
factual_reviewed: 2026-07-13
spot_check: 2026-07-13
verification_basis:
  - transcript
  - transcript_json
  - column
unresolved_facts:
  - "EARS、属性测试与延迟取舍的全部措辞尚未逐条核验；本轮仅完成四点抽样。"
concepts:
  - id: spec_driven_dev
    zh: 规范驱动开发
    en: spec-driven development
    one_line: 提示→需求→设计→任务，活文档双向同步
  - id: ears_format
    zh: EARS 需求格式
    en: EARS requirements
    one_line: 结构化自然语言，可转属性测试不变量
  - id: mcp_in_spec
    zh: 规范阶段用 MCP
    en: MCP during spec workflow
    one_line: Asana/AWS 文档拉上下文进需求与设计
  - id: living_spec
    zh: 活规范
    en: living specification
    one_line: 改需求会 diff 设计，非一次性计划
  - id: accuracy_over_latency
    zh: 准确性优于延迟
    en: accuracy over latency
    one_line: 花一小时写规范，就要合成结果可信
author:
  - "[[Al Harris]]"
---

# 亚马逊 Kiro 团队：规范驱动开发

**编者问：** 以下问题按 keynote 与 Q&A 主题重组，不能视为逐字现场问题。
**Guest：** Al Harris（Amazon 首席工程师 · Kiro 小团队）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 主题演讲 + 问答）  
**B 站：** [BV1VczqBREQ8](https://www.bilibili.com/video/BV1VczqBREQ8/) · **时长** ~63:50

---

## 开场

Kiro 是智能 IDE，公开预览数月后正式 GA。Harris 带队三四人，任务是把 **规范驱动开发（SDD）** 做成可复现的 SDLC——不是 vibe 编码碰运气，而是用结构化需求、设计工件和自动化推理，让 AI 代理交付可维护代码。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| SDD | spec-driven development | 完整生命周期用规范牵引 |
| EARS | Easy Approach to Requirements Syntax | 「当…则…应…」式需求句 |
| 属性测试 | property-based testing | 找反例证伪不变量 |
| 指导 | steering / guidance | 类似 Cursor rules，定优先级 |
| 活文档 | living spec | 随系统演进更新的规范 |

---

## 01 SDD 闭环：需求发现不是坐着想

**Harris：** Vibe 编码靠操作员设护栏；我们要 **SDD 代表完整 SDLC**——瀑布、XP 的经验都尊重。软件开发一半是**需求发现**，坐着想不够；要合成输出并快速反馈：设计时发现副作用，要回写需求。目标是在**紧密内循环**里完成需求、设计、实现。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 内循环 | tight inner loop | 需求↔设计↔代码快速迭代 |
| 可复现 | reproducible delivery | 结构支撑工具，不只 LLM 聊天 |

**小结：** SDD 是压缩的 SDLC，不是多几张 Markdown 装饰。

---

## 02 EARS + 属性测试：自然语言接到代码

**Harris：** 给提示 → 转成 **EARS** 需求与验收标准。GA 后 EARS 可转**属性**——用 hypothesis/fast-check 思路找反例；找不到则高置信需求被满足（测试质量仍担重任）。

规范是三件事：**时间点 t 的工件集**、**结构化工作流**、**工具链**（属性测试、需求模糊性扫描、冲突约束用经典推理）。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 不变量 | invariants | 需求在代码里的可证属性 |
| 神经符号 | neuro-symbolic | 后端不只有 Sonnet 聊天 |

**小结：** 结构化自然语言是为了接非 LLM 的确定步骤。

---

## 03 MCP 与定制工件：400 目砂纸

**Harris：** MCP 可在**需求生成、设计、实现**任一阶段用——例：从 **Asana** 拉任务起 spec；用 **Fetch** 抓同类产品示例。改 MCP 会破缓存，长会话别乱切。

**定制工件：** 在设计里加 ASCII 线框、在任务里写**必须通过的单元测试**；用 **hooks** 保证完成前测试绿。另一招：**寻求替代方案**——别被提示里的 S3 偏见锁死，让 agent 用 AWS 文档 MCP 发现 AgentCore Memory 等更惯用做法。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 前置对齐 | shift-left agreement | 设计阶段吵完，别实现时才发现 |
| 提示偏见 | prompt bias | 你熟悉的方案会写进隐式约束 |

**小结：** MCP + 可编辑工件 = 把流程磨到可复现，而非死板模板。

---

## 04 活规范、棕地代码库与准确性

**Harris：** 与 Cursor Plan 不同：Kiro 背后是**结构化系统**；产出是**系统功能的活文档**，改需求会 diff 旧规范，不是一次性执行计划。规范按**特性/问题域**分文件夹，跨功能改动可能 touch 多个 spec。

棕地：agent 从读工作树开始；**关注点分离好、测试可靠**则表现好；技术债重则像人一样迷路。索引主要用于代码搜索 UI，**不把整库向量塞进上下文**——渐进式披露，让 agent 自己找上下文。

会话：**无增量摘要**，靠 **90–95% 提示缓存命中**换速度；规范驱动主要为**可复现与准确**——花十分钟写提示错了无所谓，花一小时写设计就要做对。

**指导（steering）：** 可强制提交归因、90% 覆盖率、代码风格；非功能需求（性能、锁竞争）写进设计。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 规范即特性 | spec per feature | 非单一巨型 design.md |
| 渐进披露 | progressive disclosure | 少预加载，多查找工具 |

**小结：** Kiro = 规范工作流 + 工具；准确性投资在前端，延迟靠缓存优化。

---

## 总结

| 维度 | 要点 |
|------|------|
| 核心 | 提示→EARS 需求→设计→任务→实现 |
| 质量 | 属性测试 + 需求验证 + 活文档 diff |
| MCP | 贯穿 spec，拉 Asana/文档/竞品 |
| 工件 | 线框、测试用例、hooks 可定制 |
| 棕地 | 模块清晰 > 巨型 monorepo 蛮干 |
| 哲学 | 准确性 > 纯延迟；结构换可复现 |

---

## 附录

### 章节锚点（专栏）

| 章 | 主题 |
|----|------|
| 01–04 | SDD、EARS、属性测试、规范本质 |
| 05–07 | MCP、定制工件、AgentCore 演示 |
| 08–10 | 棕地、会话、非功能需求 |

### spot_check（≥45 min）

- 2026-07-07：EARS→属性测试链路、MCP 拉 Asana 起 spec、寻求替代方案改 AgentCore Memory — 与专栏 §06–07 一致。

### Ingest

- BV：`BV1VczqBREQ8`
- ingest：`Recastory/workspace/bilibili-retranscribe/BV1VczqBREQ8/ingest`
- 专栏：`.../ingest/column_article.md`

### 相关阅读

- [[IBM团队-Harness工程详解]] — harness 与 SDLC 控制面
- [[Jeff-AGENTS.md历史与最佳实践]] — 仓库级 agent 指令
- [[Databricks-企业级Agent生产实践]] — 企业生产 agent
- [[MOC - Harness Engineering]] — 横切
- [[MOC - Agent Theory and Design]] — 入口
