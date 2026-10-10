---
title: MOC - Agent 架构与工程
description: Agent 架构与原理横切 MOC——架构/记忆/上下文/multi-agent/生产实践，从原 Agent Theory MOC D·L架构段迁入；Harness 见专门 MOC。
created: 2026-07-15
updated: 2026-07-15
tags:
  - ai_agent
  - moc
source: vault_initiative - moc - split from Agent Theory and Design
---
# MOC - Agent 架构与工程

> Agent 本身的架构、记忆、上下文工程、multi-agent 与企业生产实践。从原 [[MOC - Agent Theory and Design]] 拆分。
>
> **Harness / Loop 工程**已收录于 [[MOC - Harness Engineering]]（42 篇），本 MOC 不重复，仅覆盖通用 Agent 架构。

## Agent 架构与原理

> Agent 本身的架构、记忆、上下文工程、multi-agent 与企业生产实践。

| 文章 | 核心主题 |
|------|---------|
| [[OpenAI官方-GPT-5.6 提示词指南]] | OpenAI 官方一手文档：减法范式、结果优先、自主性边界、PTC、检索预算、迁移一次只改一处 |
| [[AI Agent 和 Skill 测评方案及落地实践 - martinskxu]] | Agent/Skill 测评四场景法、评分规则设计、基线管理、稳定性评估、TPerf 实战案例 |
| [[Fable 5 订阅权限又续了 5 天 - 花叔]] | OpenSquilla 多模型集成：4 个国产模型组队跑平 Fable 5，账单只有 1/3 |
| [[一个业务 Agent 到底长啥样 - 沐洒]] | 沐洒业务 Agent 系统拆解：10 要素（目标/模型/上下文/工具/知识/状态/工作流/约束/人工节点/评估）+ 任务流动 + 规则/模型/人工三问 + 失败暴露缺口；最小闭环优先于组件齐全 |
| [[WorkBuddy团队-从模型到可用Agent的Harness工程]] | 腾讯 WorkBuddy 五层 Harness：Context Engineering + 前馈/反馈/权限/验证/可观测（**Harness 详见 [[MOC - Harness Engineering]]**） |

---

## Agent 架构与平台（S-tier）

| 文章 | 核心主题 |
|------|---------|
| 微软Agent-多模态对齐与组合（待收录） | 微软：多模态对齐和组合（对话 Amy Boyd & Nitya Narasimhan）|
| OpenClaw教程-实战完整指南（待收录） | OpenClaw 教程：实战完整指南 |
| OpenClaw养虾指南-打造数字员工（待收录） | OpenClaw 实战：养虾指南！打造你的数字员工 |
| AI编程工具-2026年趋势与Vibe Code（待收录） | AI 编程工具：2026 年趋势与 Vibe Code |
| Brex CEO-打造全公司共用AI型CEO（待收录） | Brex CEO：打造全公司共用的 AI 型 CEO |
| Logical CEO-用好LLM的关键方法论（待收录） | Logical CEO：用好 LLM 的关键方法论 |

## 跨 MOC

| 横切主题 | MOC |
|---|---|
| 全库导航 | [[MOC - 知识库导航]] |
| Agent 理论总览 | [[MOC - Agent Theory and Design]] |
| Harness 工程 | [[MOC - Harness Engineering]] |
| 职业与组织 | [[MOC - AI 时代个人发展与组织]] |

---

## 迁移收录（2026-10-08 · 知识库合并）

> 以下为 2026-10-08 两库合并时按来源管道成组挂载的笔记，保证 MOC 可达，后续策展融入上方结构。

- [[Claude Code成员Tariq-40分钟讲清楚Loop Engineering|Claude Code成员Tariq-40分钟讲清楚Loop Engineering]]
- [[Cognition的Jared-智能体构建原则与云端异步协同|Cognition的Jared-智能体构建原则与云端异步协同]]
- [[Together AI Rishabh-实时语音智能体的架构与工程权衡|Together AI Rishabh-实时语音智能体的架构与工程权衡]]
- [[langchain-ceo-何时构建自己的agent框架-哔哩哔哩-1e149996|LangChain CEO：何时构建自己的Agent框架？ - 哔哩哔哩]]
- [[linear团队-构建生产级别agent的5条规则-哔哩哔哩-72c13f86|Linear团队：构建生产级别Agent的5条规则 - 哔哩哔哩]]
- [[每家公司即将构建的ai智能体-vercel首席执行官guillermo-ra-哔哩-c9dc516b|每家公司即将构建的AI智能体 | Vercel首席执行官Guillermo Ra - 哔哩哔哩]]
