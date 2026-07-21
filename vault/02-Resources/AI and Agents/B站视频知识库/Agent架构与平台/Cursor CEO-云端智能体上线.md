---
title: "Cursor CEO：云端智能体上线"
tags: ["ai_agent", "video_transcript", "bilibili", "cursor", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "cursor", "harness_engineering"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Compile 26：Michael 讲 Cursor 从洞穴原型到 Agent-first；云端多智能体、Cursor Mobile、Origin 原生 Git、Composer 10–20× 算力与 SpaceX。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Cursor CEO-云端智能体上线.md"
source_sha256: "aebdf4fa591d0d8f580b1b3711150646105c1c839f9db68552d851ba472bea1d"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV18qTi6uEDX/"
source_original: "https://cursor.com/compile"
host_name: "编者问"
guest_name: "Michael Truell"
guest_title: "Cursor CEO · 联合创始人"
column_url: "https://www.bilibili.com/read/cv51067150/"
material_tier: S
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV18qTi6uEDX/ingest"
speaker: "Moderator / Michael Truell"
duration: 27:01
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "bilibili-retranscribe/BV18qTi6uEDX/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "ASR + column + Cursor Compile 官方页面（keynote；编者重构过渡问）"
speaker_confidence: high
factual_status: partial
factual_reviewed: 2026-07-13
verification_basis:
  - transcript
  - transcript_json
  - column
  - original_page
unresolved_facts:
  - "关键产品数字与直接引语尚未逐条对照原视频。"
asr_version: v2
concepts:
  - id: agent_first
    zh: Agent 优先
    en: agent-first
    one_line: 超九成用户以 Agent 为主力，频次约 Tab 的 5 倍
  - id: cloud_agents
    zh: 云端智能体
    en: cloud agents
    one_line: 本地多 agent 撞算力与同仓冲突，云端专属环境才是终局
  - id: origin_git
    zh: Origin 原生 Git
    en: Origin agent-native Git
    one_line: 为数千 agent 高并发读写与自动解冲突设计
---

# Cursor CEO：云端智能体上线

**编者问：** 以下问题用于重组 keynote，并非现场主持人原话。
**Guest：** Michael Truell（Cursor CEO）  
**形态：** Host-Guest canonical v3.2（**ASR 主源**）  
**B 站：** [BV18qTi6uEDX](https://www.bilibili.com/video/BV18qTi6uEDX/) · **时长** ~27 min

---

## 开场

Compile 26。Michael 从 2022 年「史前」讲起：四个人觉得 AI coding 已被大厂占满，先绕开，年底又忍不住进洞穴写了两周原型——目标只是「自己能忍着当日常 IDE」。今天台上发布的是另一套叙事：**本地不是多智能体的终局**；移动端、Origin、自研模型一起把 Cursor 从补全工具推成云端协作平台。

五章：**起源与洞穴原型** → **Agent-first 数据** → **云端为何必须** → **Mobile + Origin** → **Composer 与通用智能**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| Agent 优先 | agent-first | 主力是 agent，不是 Tab |
| 云端智能体 | cloud agents | 给 agent 专属算力与隔离环境 |
| Origin | Origin | agent 原生代码托管 / Git |
| Cursor Mobile | Cursor Mobile | 看截图、标注、遥控本地/云端 agent |
| Composer | Composer | Cursor 自研模型线，算力大幅加码 |

---

## 01 洞穴两周：先做出自己能用的环境

**编者问：** Cursor 怎么起步的？第一版长什么样？

**Michael Truell：** 我们 2022 年 1 月开始碰这些事。第一版 Cursor 其实 2023 年初才放出来。中间有一段绕路：我们想做开发者工具，但看了一圈——几十家创业公司、大厂、吓人的 lab——觉得没空间。结果年底还是忍不住，因为市场上没有我们真正想用的东西。

四个内向、不太会「做公司」的程序员干了该干的事：钻进洞穴，穿内裤写了大概两周，拼出一版能自己用的环境。最初目标很谦虚：**别比原来的工具慢两倍**。手搓编辑器零件、接语言服务，当时连产品内 autocomplete 都没有，还得接 Copilot。做出能忍的东西后发了带「电影魔术 demo」的邀请名单，亲手 onboard 前 20 个用户。前几个反应冷淡，有人直接 ghost；后来才有人真正用起来。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 洞穴原型 | cave prototype | 先为自己做 IDE，再谈市场 |
| 史前 AI 时间 | prehistoric AI times | 2022–2023 相对今天像史前 |

---

## 02 超九成用户已转向智能体

**编者问：** 现在用户还在用 Tab 吗？

**Michael：** 数据上，**超过 95% 的用户已经把 Agent 当主力**，使用频次大约是 Tab 补全的 **5 倍**。这不是「多一个聊天窗」，而是开发范式从单点补全跨到 **智能体深度协作**。

本地跑多个 agent 看起来浪漫，实际两头堵：算力不够，同一代码库上互相踩脚。项目级、长时间、多 agent 并行，必须给 agent **云端专属计算环境**，而不是在你笔记本上挤。

**小结：** Agent-first 已是事实；本地多 agent 不是终局。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Agent 优先 | agent-first usage | 95%+ 用户主力是 agent |
| 本地瓶颈 | local multi-agent bottleneck | 算力 + 同库冲突 |

---

## 03 移动端：离开电脑也能盯着 agent

**编者问：** 云端跑着，人走开了怎么办？

**Michael：** 发布了 **Cursor Mobile**：能看运行截图、在画面上标注、远程控制本地或云端代理。开发者离开工位时仍能监控、纠偏，让「全天候云端智能体」不至于无人看管地跑偏。

交互空间从「必须坐在 IDE 前」打开——agent 在云里推进，人在手机上当值班工程师。

**小结：** Mobile 不是玩具，是云端 agent 的值班台。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 移动端协作 | Cursor Mobile | 看截图、标注、遥控 |
| 全天候运行 | always-on agents | 人离开，agent 继续 |

---

## 04 Origin：为智能体重做代码托管

**编者问：** 传统 GitHub 扛得住吗？

**Michael：** AI 编程把代码量、提交量推到指数级。传统 Git 协作很难扛 **数千智能体高并发读写**。Origin 是 agent 原生的代码与协作平台：自动处理冲突、缩短 PR 评审周期——按「机器在写、人在审」的节奏设计，而不是把人的 PR 流程硬套到 agent 洪峰上。

**小结：** 工具链下一层（托管与评审）也要 agent-native。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Origin | Origin | agent 原生 Git / 托管 |
| 自动解冲突 | auto conflict resolution | 机器洪峰下的合并策略 |

---

## 05 Composer：十到二十倍算力，走出纯编程

**编者问：** 模型侧你们押什么？

**Michael：** Cursor 正与 **SpaceX** 等合作，投入大约 **过去的 10 到 20 倍算力**，从头训练新的通用智能模型线（Composer 方向）。目标不只写代码：长期规划、界面操作等更通用的智能协作能力。编程是入口，不是天花板。

**小结：** 产品（云端 agent + Mobile + Origin）与模型（算力跃迁）双线推进。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 算力跃迁 | 10–20× compute scale-up | 训练投入数量级变化 |
| 通用协作 | general agentic capability | 规划 + UI 操作，不止补全 |

---

## 总结

1. **Agent-first 已是默认**：95%+ 用户、约 5× Tab 频次。  
2. **本地多 agent 不是终局**：云端专属环境解决算力与同仓冲突。  
3. **Mobile + Origin**：值班与托管都要为 agent 重做。  
4. **Composer 级算力**：模型要走出纯编程，走向通用协作。

---

## 附录

**章节时间戳（视频简介）**

| 时间 | 主题 |
|------|------|
| 05:45 | 超九成用户转向智能体 |
| 08:15 | 本地并非多智能体未来 |
| 12:30 | 移动端打破空间壁垒 |
| 15:50 | Origin 智能体原生托管 |
| 21:10 | 十倍算力与通用模型 |

**素材路径**

- ASR：`Recastory/workspace/bilibili-retranscribe/BV18qTi6uEDX/article.md`
- ingest：`…/BV18qTi6uEDX/ingest/`

**相关阅读**

- [[OpenClaw创始人-我是如何使用OpenClaw的]]
- [[Claude Code负责人-AI原生团队如何使用AI]]
- [[MOC - Agent Theory and Design]]
- [[MOC - Harness Engineering]]
