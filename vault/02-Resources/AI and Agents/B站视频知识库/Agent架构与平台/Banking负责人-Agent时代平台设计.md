---
title: "Banking负责人：Agent 时代的平台如何设计"
tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering", "mcp"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering", "mcp"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Banking Circle Juan：Agent 放大 IDP 痛点；真自助服务、API/MCP 优先、本地验证闭环、AGENTS.md 机器可读文档；借 AI 热潮推工程最佳实践。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Banking负责人-Agent时代平台设计.md"
source_sha256: "eaf1fd6edc82a8f0a6101bcfcfc0f921061ca94267fc6ac70e18b7fefb4428d7"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1MM9xBHEsQ/"
column_url: "https://www.bilibili.com/read/cv48335227/"
host_name: "Juan Herreros Elorza"
guest_name: "Juan Herreros Elorza"
guest_title: "Banking Circle 云原生技术负责人"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1MM9xBHEsQ/ingest"
speaker: "Juan Herreros Elorza"
duration: "21:15"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1MM9xBHEsQ/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1MM9xBHEsQ/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "solo_keynote column markers"
speaker_confidence: high
concepts:
  - id: agent_exposes_idp_gaps
    zh: Agent 暴露 IDP 缺口
    en: agents expose IDP gaps
    one_line: 人不能上楼找同事，Agent 更不能
  - id: true_self_service
    zh: 真自助服务
    en: true self-service
    one_line: 人从关键路径移除，无审批等待
  - id: api_first_for_agents
    zh: API/MCP 优先
    en: API-first for agents
    one_line: Agent 调 schema 清晰的 API 非 GUI
  - id: shift_left_validation
    zh: 左移验证
    en: shift-left validation
    one_line: 本地 API 化日志/指标，别推到 CI 才报错
author:
  - "[[Juan Herreros Elorza]]"
---

# Banking Circle：Agent 时代的平台如何设计

**Host：** Juan Herreros Elorza（Banking Circle 云原生负责人）  
**形态：** Host-Guest v3.2（**专栏主源** · 主题演讲）  
**B 站：** [BV1MM9xBHEsQ](https://www.bilibili.com/video/BV1MM9xBHEsQ/) · **时长** ~21 min

---

## 开场

Banking Circle 年处理 **>1 万亿欧元** 跨境支付，700+ 受监管金融机构客户，250+ 工程师。内部平台 **Atlas** 抽象 K8s、消息、可观测性。Juan 讲一个虚构但真实的新同事故事：代码写完，**部署去哪、流水线抄谁、找 infra 同事、等下周数据库**——人类还能上楼问，**Coding Agent 不会**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| IDP | internal developer platform | 内部开发平台 |
| 自助服务 | self-service | 无需找人审批 |
| MCP | Model Context Protocol | Agent 发现/调用平台能力 |
| 左移 | shift left | 错误越早发现越好 |
| AGENTS.md | AGENTS.md | 仓库旁机器可读规范 |

---

## 01 Agent 放大原本就存在的痛点

**Juan：** 依赖同事口述部署、跨团队协调、文档缺失——**从来就不理想**，只是人类能 workaround。Agent 把摩擦 **放大到无法容忍**：流水线报错它不能「去二楼找 infra」。最佳实践 **始终是最佳实践**；AI 时代只是 **更痛、更显眼**。

**小结：** 限制 Agent 生产力的，往往是平台流程，不是模型。

---

## 02 真自助：人从关键路径消失

**Juan：** 我要平台资源或操作，**自己完成**；我的 Agent 也要 **自动触发**，不跟特定人聊天、不等审批。若「自助」还要在五个地方拼组件——对 Agent 就不是自助。**全流程自动化** 是 AI 协作前提。

**小结：** 五个地方拼凑 ≠ self-service。

---

## 03 API / MCP 优先：Agent 不点 GUI

**Juan：** Agent 擅长 **定义良好的 API**：schema 验证、身份认证、可发现。平台暴露 **REST/gRPC 或 MCP 服务器**，Agent 在边界内 **请求-响应-自修正**，直到部署/配置达标。GUI 对人类友好，对 Agent 是噪声。

**小结：** 可发现 + 可验证的 API = Agent 的「手」。

---

## 04 本地闭环：别推到 VCS 才报错

**Juan：** 别让 Agent 把错推上 Git 才在流水线炸。平台应支持 **本地验证**，并提供 **API 化的日志、指标、trace**。Agent 读结构化反馈，完成 **执行→验证→迭代** 闭环——左移。

**小结：** 可观测性也要 API 化，Agent 才能在本地修。

---

## 05 AGENTS.md：机器可读文档是新标准

**Juan：** HTML 文档对 Agent 噪声大。在代码旁放 **AGENTS.md / skills.md**：部署规范、测试命令、平台技能——**针对 LLM 的上下文注入**，降幻觉、提成功率。

**Juan：** 很多组织早该 API 优先、文档规范，一直推不动。现在借 **「为 Agent 就绪」** 向高层要资源——最终 **人类开发者也受益**。

**小结：** 用 AI 热潮当杠杆，推一直正确的事。

---

## 总结

| 维度 | 要点 |
|------|------|
| 问题 | Agent 暴露 IDP 破碎流程 |
| 自助 | 无人工卡点 |
| 接口 | API/MCP 优先于 GUI |
| 反馈 | 本地可观测 + 左移 |
| 文档 | AGENTS.md 机器可读 |

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 05:42 | Agent 放大低效 |
| 07:15 | 真自助服务 |
| 08:30 | API 优先 |
| 10:15 | 本地闭环 |
| 12:45 | AGENTS.md |
| 18:30 | AI 杠杆推最佳实践 |

### 相关阅读

- [[Jeff-AGENTS.md历史与最佳实践]] — AGENTS.md 写法与 70 行原则
- [[PlanetScale-Agent时代的基础设施]] — Agent 优化基础设施
- [[Databricks-企业级Agent生产实践]] — 企业 Agent 五支柱
- [[MOC - Harness Engineering]]
