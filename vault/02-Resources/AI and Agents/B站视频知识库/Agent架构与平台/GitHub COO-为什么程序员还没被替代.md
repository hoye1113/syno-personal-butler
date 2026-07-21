---
title: "GitHub COO：为什么程序员还没被替代"
tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "harness_engineering", "ai_career"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "harness_engineering", "ai_career"]
created: "2026-07-07"
source: "B站视频 - Easonlee的AI笔记"
description: "Kyle Daigle：开发者身份扩大、代理月创千万 PR、多模型开放生态、爬山微调闭环、模型路由控费与个人 agent 自我迭代。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/GitHub COO-为什么程序员还没被替代.md"
source_sha256: "a6ca521bb849cb216b0c8488146ed5e122849852871b7a0c628dd1910233de6d"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV11mTi6aEiP/"
host_name: "Mike Taylor"
guest_name: "Kyle Daigle"
guest_title: "GitHub COO · 微软开发者 CMO"
column_url: "https://www.bilibili.com/read/cv51066807/"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV11mTi6aEiP/ingest"
speaker: "Mike Taylor / Kyle"
duration: "28:08"
saved: 2026-07-07
updated: 2026-07-07
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV11mTi6aEiP/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "ASR + video_description Every interview"
speaker_confidence: high
concepts:
  - id: developer_broadening
    zh: 开发者身份扩大
    en: broadened developer identity
    one_line: 法务财务也用 Copilot 做小工具
  - id: agent_pr_wave
    zh: 代理 PR 浪潮
    en: agent PR wave
    one_line: 月 1700 万代理 PR，非全垃圾
  - id: open_ecosystem
    zh: 开放多模型生态
    en: open multi-model ecosystem
    one_line: 拒围墙花园，接 Anthropic/OpenAI/Google
  - id: hill_climbing
    zh: 爬山闭环
    en: hill-climbing loop
    one_line: 接受率/情绪反馈每周迭代模型
  - id: model_router
    zh: 模型路由
    en: model router
    one_line: 难任务用大模型，替换用小模型
author:
  - "[[Kyle Daigle]]"
---

# GitHub COO：为什么程序员还没被替代

**Host：** Mike Taylor（Every）  
**Guest：** Kyle Daigle（GitHub COO · 微软开发者首席营销官）  
**形态：** Host-Guest canonical v3.2（**ASR 主源** · 无专栏）  
**B 站：** [BV11mTi6aEiP](https://www.bilibili.com/video/BV11mTi6aEiP/) · **时长** ~28:08

---

## 开场

GitHub 每月收到约 **1700 万**代理创建的 PR——不是超级早期了，是「人 + 多代理」爬山的实用期。Kyle 的立场：**开发者不会被替代**，但「开发者」定义在扩大；关键是开放生态、爬山数据闭环，以及别让 $200/月 订阅变成 $2000。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 非字节开发者 | non-bite-sized developers | 知识工作者用 AI 写小应用 |
| 爬山 | hill climbing | 用使用数据迭代模型 |
| 模型路由 | model router | 按任务自动选模型 |
| 开放选择 | developer choice | 不锁单一 agent/模型 |

---

## 01 谁算开发者？代理 PR 不是垃圾

**Mike：** 开源维护者被 PR 淹没怎么办？

**Kyle：** **Copilot 代码审查**找更多漏洞，评论后 agent 可改；**agent merge** 处理 CI/策略等收尾。开源侧给维护者**工具箱**决定接谁、信谁——不抢先强加标准（如 Mitchell 的 voucher），等社区共识。

**Kyle：** 去年全年约 **10 亿**提交，今年线性外推或 **140 亿**；3 月 **1700 万**代理 PR。不是没人看的 slop——大家在学「Kyle + 一两个端到端代理」怎么协作。代码仍落在 GitHub 协作面上。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 维护者控制 | maintainer control | 接 PR 规则留在社区 |
| 实用期 | pragmatic adoption | 已过纯 hype，未达峰值 |

**小结：** 问题从「有没有代理」变成「怎么审、怎么并」。

---

## 02 商业模式与微软开发者叙事

**Mike：** 人睡觉代理还在跑——计费变用量？

**Kyle：** 尚早。个人免费层 + API 限流是 agent **背压**；要像当年免费私有仓库一样随行业演化。GitHub **为开发者建，不为采购建**；CMO 角色是把同一股「authentic dev love」带到微软全系。Build 今年：**外宾主讲、可动手**，不是纯 pitch。

**Mike：** 竞品最多之一，怎么差异化？

**Kyle：** **开发者选择**——避免无意围墙花园。与 Anthropic、OpenAI、Google 及各家 coding agent **合作接入**；横跨协作、审查、代码生成全链路才是超能力。内部也真用竞品，否则近视。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 鼠夹效应 | mouse-trap affinity | 换工具要新账号的摩擦 |
| dogfood + 竞品 | eat own + compete | 周六在三套 OS 上写码测体验 |

**小结：** 差异化 = 开放 + 全链路，而非单点模型。

---

## 03 爬山、路由与个人 agent 反馈

**Kyle：** **爬山**：点赞、接受率、软硬指标每周看——硬指标升了用户情绪可能崩。目标：给每人一台爬山机器；M365 客户可 **frontier tuning**（曾像魔术，现在太简单不工作反而不信）。

**Mike：** $200→$2000 怎么防？

**Kyle：** 模型更懂你了 + **自动选模型**——GitHub/Microsoft Foundry 都有 router；别每小时换最贵模型。最后一步常是小改（全局替换），应自动降到 haiku 级。

**Mike：** 我做了 AI 版你练采访。

**Kyle：** 我用 **OpenClaw（Baxter）** 读个人邮件/Slack，与工作 claw 隔离；每日 comms 报告——**人更愿意听机器人批评**。七天回溯：agent 说了什么、我有没有做——**人类也要递归自我改进**。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 个性化上下文 | personalization / memory | 行业真问题，非短期噱头 |
| 机器人反馈 | robot criticism | Hubot 时代遗产 |

**小结：** 省钱靠路由；成长靠个人数据闭环——替代的是部分协调，不是「会思考的人」。

---

## 总结

| 维度 | 要点 |
|------|------|
| 身份 | 开发者门槛降低，岗位不消失 |
| 规模 | 代理 PR 指数级，GitHub 仍是枢纽 |
| 生态 | 多模型开放，拒绝锁死 |
| 产品 | 审查、merge、维护者工具 |
| 模型 | 爬山 + frontier tuning + 路由 |
| 个人 | agent 做沟通教练，非只写代码 |

---

## 附录

### 章节时间戳（视频简介）

| 时间 | 主题 |
|------|------|
| 05:30 | 非技术人员成开发者 |
| 11:20 | 代理月创 PR |
| 16:20 | 开放生态 |
| 21:10 | 爬山闭环 |
| 23:00 | 模型路由 |
| 25:20 | 个人 AI 反馈 |

### Ingest

- BV：`BV11mTi6aEiP`
- ingest：`Recastory/workspace/bilibili-retranscribe/BV11mTi6aEiP/ingest`
- ASR：`.../BV11mTi6aEiP/article.md`
- 专栏：无

### 相关阅读

- [[GitHub COO-GitHub的AI革命与14倍PR增长]] — 同嘉宾，基础设施与 14× 增长
- [[Codex负责人-现场演示Codex]] — 编码代理对照
- [[MOC - Harness Engineering]] — 审查与 merge harness
- [[MOC - AI 时代个人发展与组织]] — 开发者身份
- [[MOC - Agent Theory and Design]] — 入口
