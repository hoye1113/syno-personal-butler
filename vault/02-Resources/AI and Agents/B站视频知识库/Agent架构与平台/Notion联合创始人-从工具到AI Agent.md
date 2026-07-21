---
title: "Notion 联合创始人：从工具到 AI Agent"
tags: ["ai_agent", "video_transcript", "bilibili", "memory", "context_engineering", "skills"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "memory", "context_engineering", "skills"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV1FEAVzbEWq/"
description: "Ivan × Simon Last：2022 墨西哥 GPT-4 时刻、每半年重写 AI harness、Markdown/SQLite Agent API、定制 Agent 与邮件分拣——目标从人类直接干活变成人类管理 Agent。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Notion联合创始人-从工具到AI Agent.md"
source_sha256: "a3a3d44c1aabf8643482540b0a48d6bc1f535da25f84b0f7342503e046fc5e97"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1FEAVzbEWq/"
host_name: "Ivan"
guest_name: "Simon Last"
guest_title: "Notion 联合创始人"
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1FEAVzbEWq/ingest"
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1FEAVzbEWq/article.md"
speaker: "Ivan / Simon Last"
duration: "29:03"
saved: 2026-07-06
updated: 2026-07-06
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: "Host-Guest canonical (ASR primary)"
speaker_inference: "asr_v2 No Priors podcast; Simon Last=Guest; Ivan=Host + tools-for-thought 社区线索"
speaker_confidence: high
asr_version: v2
author:
  - "[[Simon Last]]"
concepts:
  - id: harness_rewrite
    zh: 每半年重写 harness
    en: ~6-month harness rewrite
    one_line: 跟模型能力同步，重写周期在缩短
  - id: agent_api
    zh: Agent 友好 API
    en: agent-convenient APIs
    one_line: Markdown 方言 + SQLite 替 verbose JSON blocks
  - id: custom_agents
    zh: 定制 Agent
    en: custom agents
    one_line: 默认无权限，授权后可 Slack/后台自治
  - id: agent_manager
    zh: Agent 经理
    en: agent manager
    one_line: 人设计任务与验证环，不再手敲代码
---

# Notion 联合创始人：从工具到 AI Agent

**Host：** Ivan（No Priors 主持）  
**Guest：** Simon Last（Notion 联合创始人）  
**形态：** Host-Guest canonical v3.2（**ASR 主源**）  
**B 站：** [BV1FEAVzbEWq](https://www.bilibili.com/video/BV1FEAVzbEWq/) · **时长** 29:03

---

## 开场

Notion 是 tools-for-thought 老派选手里拥抱 AI 最狠的一档：2022 公司 offsite 墨西哥，Simon 和联创第一次摸到 **GPT-4**，当场判定「时间到了」。两年半里从 AI Writer → 全工作区 Q&A → 个人 Agent → **定制 Agent**；工程侧 Simon 自称去年夏天起**不再手敲代码**，角色变成 Agent 经理。

五章：**GPT-4 时刻与双轨 vision** → **产品弧线与索引 craft** → **每半年重写 harness** → **Agent API 与定制 Agent** → **Agent 经理与内部工作流**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 写作助手 | AI writer | 选中文重写/续写，单步任务 |
| 语义索引 | semantic index | 全工作区 embedding， grounding 问答 |
| harness | harness | 模型外的编排、检索、工具与验证环 |
| 定制 Agent | custom agents | 命名、授权、可挂 Slack 后台自治 |
| 自举能力 | bootstrapping capabilities | Agent 自建集成、部署、再使用 |

---

## 01 墨西哥 GPT-4：短轨写作助手，长轨通用助手

**Ivan：** 听说你们 2022 offsite 墨西哥第一次玩 GPT-4—— origin story 是什么？

**Simon Last：** 2022 年我一直在盯技术、什么都试。直到摸到 GPT-4，两件事立刻清楚：第一，**相当聪明**——能跟 reasonably complicated 指令，帮你写、帮你改；第二，**知识范围又深又广**。联创和我当场说：时间到了，只会越来越好，必须想怎么用到 Notion。

**Ivan：** 一开始有明确 vision，还是拉各队试错？

**Simon Last：** 长短轨同时有。**短轨**立刻 obvious：写作助手——文档里选中文字重写、代写、查资料给来源；组 tiger team，两三个月就上线。**长轨**也 obvious：通用助手——给它 Notion 里人类能用的全部工具，自建库、查改文档、织在一起做长程任务。短轨很快 ship；长轨当时还不 work，拖了更久。

> **金句 · Simon Last**
> **中文：** 短轨写作助手几个月就能上；长轨通用助手当时还 work 不了——拖了更久。
> **原文：** The short-term one we shipped very quickly; the long-term one didn't really work yet — that took much longer.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 双轨 vision | short/long-term vision | 先 ship 写作，并行啃通用 Agent |
| tiger team | tiger team | 小团队猛攻 AI 功能 |
| 长程任务 | longer-range task | 多步、跨文档数据库的 Agent 工作 |

**本章小结**

- 2022 GPT-4 = 智力 + 知识广度两个 ah-ha
- AI Writer 2023 初上线；通用 Agent vision 同步启动
- 长轨难在工具链与可靠性，不是缺模型 alone

---

## 02 产品弧线：Q&A、全源索引与 embedding 时代

**Ivan：** 从 AI Writer 到现在，几个关键 learnings？

**Simon Last：** 是多年 slog，很多 learning。时间线：先是 **AI Writer**——单步改写编辑，无检索，裸调模型写文本。接着 **Q&A**：对整个工作区做语义索引，提问给 grounded 答案，2023 年 10 月 GA；beta 更早。那一下 eval 和质量要严肃得多——实时更新索引，不是 plug-and-play。

工作区 index 跑通后 obvious：**别的源也要 index**——Google Drive 等，持续加新连接器。embedding 时代有趣的一点是：工作区怎么组织树结构，AI 不太 care——只要有文本 snippet 能 retrieve。我们现在甚至建议：别过度纠结组织，先 pipe 进来；chunk 策略等仍影响性能，但对用户组织方式部分透明。

**Ivan：** 抢 Google Drive/Slack 的索引——别的产品还没做好，你们凭什么做？

**Simon Last：** 我们内部也常问「我们有什么资格」。多数公司**做不好自己的 index**，有点 baffling。需要一点 **AI native savviness**，但大部分其实是 **craft 和细节**——检索要 empirical、迭代，每个数据源特殊：查 Slack 和查 Drive 完全不是一套 one-size-fits-all。要天天用、试大量 query、不断 tune pipeline。

> **金句 · Simon Last**
> **中文：** 多数公司做不好自己的索引——需要的是 craft 和天天迭代 query，不是魔法。
> **原文：** Mostly companies are pretty bad at making their indexes — it's craft and iterating on queries.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 分块策略 | chunking strategy | 切文档方式，影响检索质量 |
| 多源索引 | multi-source index | 工作区 + Drive/Slack 等统一检索 |
|  grounded 问答 | grounded Q&A | 答案带来源 snippet，非裸生成 |

**本章小结**

- Q&A 比 Writer 难一个数量级：索引 + eval + 实时更新
- embedding 降低「完美文件夹结构」压力，不降低 retrieval craft
- 各数据源需单独 tune，不能一套模板

---

## 03 每半年重写 harness：跟模型一起进化

**Ivan：** 你 rebuild 过几次 Notion？.harness 呢？

**Simon Last：** 几乎是 running joke——**AI harness 大概每半年重写一次**，而且重写时间在缩短，因为进展在加速。很多公司错在「做一版就钉死」。你必须紧盯**当前模型和技术状态**，围绕它 deep 设计产品和系统——意味着**每半年 rewrite**。我觉得挺 fun：重启、重想；我们下一版 harness 一两周内发，已经在想再下一版。

编码 Agent 让「愿意 rewrite harness」 dramatically 上升——Agent 帮你做。Ambition 也爆了：过去不敢想的 build 现在敢想。

**Ivan：** 工程和产品组织因此怎么变？

**Simon Last：** 变化好几轮。编码 Agent 经历 tab 补全 → 插改片段 → 去年初 **Agent 真 work**（我大概 2024 年 4 月用 Claude Code）。大 shift：可以 push Agent **端到端实现、验证、维护**——但要认真想架构和**验证环**；做得好则更 ambitious 也更 robust，做得差全是 slop。

团队规模没太变——仍偏爱 **smallish tiger teams**，小团队 almost always better，以前对现在也对。根本变化是：**个人产出可以高很多**，output 越来越取决于你会不会、愿不愿用工具。中位工程师门槛没变，上限 EXTREMELY 提高——用工具的 100x 和不愿用的差距更大。

内部体感：**更 messy、更 chaotic**，但我喜欢——原型多得多，设计组做了 **Design Playground**，简化版 Notion + UI  primitives + Agent，设计师 spin 高保真部署原型 URL，不再只指 mock。工程侧 PR 更 ambitious；仍 **全 PR review**，敏感/数据丢失风险区一样审。Agent 出的 PR 更大更复杂，但测试 often 更好——我要求 merit 的改动必须 intent test，不再 vibe coding 裸 PR。

> **金句 · Simon Last**
> **中文：** 每半年重写 harness 不是折腾——是跟模型能力对齐的默认节奏。
> **原文：** You really do have to rewrite the harness every six months — design deeply around what the current model is.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 验证环 | verification loop | Agent 端到端实现后如何证明没坏 |
| 设计游乐场 | Design Playground | 设计团队自研高保真原型环境 |
| 100x 工程师 | 100x engineer (with tools) | 愿用 Agent 者的产出上限暴涨 |

**本章小结**

- ~6 个月 rewrite harness；Agent 降低 rewrite 成本、抬高 ambition
- 团队仍小 tiger team；差距在工具熟练度不在人头
- 更乱更多原型；PR 更大但测试要求更高

---

## 04 Agent API、个人 Agent 与定制 Agent

**Ivan：** 通用助手 vision 哪些还 blocked？Notion Agent 下一步？

**Simon Last：** 我们 struggled **好几年**做 Agent——sort of works 但不太有用， largely too early；试了三四次，**去年秋**终于 launch：Notion AI 现在是完整 Agent，能访问 Notion 里几乎所有东西，original vision 很多已经 work。接着上周 ship **custom agents**：起名、默认**零权限**，你 grant 后才能动；授权后可**后台自治**——例如给专属 task 数据库 + 挂 Slack 频道，在 Slack 里回复、建 task；或给周报库 + 搜 web/工作区。

excited 的方向：**极度擅长自举能力**——从 initial kernel  bootstrap，甚至建我们还不支持的 integration、deploy、再用。Coding agent 是 **AGI 的内核**——代码是表示确定性逻辑的超强 primitive；对知识工作 Agent，能 bootstrap 能力是关键：没集成就写，要新数据源就连。

**Ivan：** 跟 Microsoft、labs 拼索引和 Agent——Notion 该赢在哪？

**Simon Last：**  landscape 分 labs、软件平台、基础设施。Labs 侧我们是 **Switzerland for models**——客户不想锁单一模型，每月谁强谁弱，要能随时 switch；开源模型也强，上周刚上了一个中国开源，四个都会上，很多场景更便宜。

我们的角色：**接最好模型 + 做 state-of-the-art Agent 实现 + 协作工作区**让人和 Agent 协调—— tasteful、well executed。需要 index 才能让 Agent 好；要给 Agent 人类在 Notion 里的工具。

**Ivan：** blocks、数据库对 Agent 还有用吗？

**Simon Last：** **极其有用**。新挑战：过去 API 方便人类写代码，现在多一个新客户——**Agent**。默认 block JSON API verbose 到 horrible for Agent；我们做了 **Markdown 方言**（增强 notion blocks，模型很擅长）读写页面；数据库用 **SQLite 方言**，speak SQL lite，也 work 很好。默认不行，当工程 challenge 啃，现在有 extremely convenient APIs。

怎么 figure out？empirical——玩、看哪里 token 太多、哪里笨；加一点 first principles：模型训练 prior、agent loop 怎么转、什么 pattern efficient。用户研究里**用户就是 Agent**—— infinite access，可脚本化 scale。

> **金句 · Simon Last**
> **中文：** 编码 Agent 是 AGI 的内核——代码是能 bootstrap 一切能力的 primitive。
> **原文：** Coding agents are the kernel of AGI — code is a really useful primitive for bootstrapping capability.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Markdown 方言 | Notion markdown dialect | Agent 读写页面的默认格式 |
| SQLite 方言 | SQLite dialect for databases | Agent 查改数据库的轻接口 |
| 模型瑞士 | Switzerland for models | 不锁单一 frontier，随换随用 |

**本章小结**

- 2024 秋 personal Agent GA；2025 定制 Agent 可 Slack 自治
- Agent 是新 API 客户：Markdown/SQLite 替 verbose JSON
- 多模型 + 协作工作区 = Notion 定位，非做 lab

---

## 05 Agent 经理：Simon 不再写代码

**Ivan：** 你个人 daily setup？Notion Agent 工作流？

**Simon Last：** 个人 Agent 天天用——有公司全部上下文；昨晚还在问 custom Agent launch 信号。定制 Agent 里最爱 **邮件分拣**：接 work+personal 邮箱，每天 archive 不需要看的；训练方式是给一封样本邮件 + blank memory 页，让它 interview 你、proposal 哪些该 archive、你纠正，生成 rules——头几天 approval，几周后我 drop approval，它 archive 我真正该看的；**95% 邮件不用看**， inbox 只剩要的。还有 **内部反馈/bug 分拣** Slack 频道 Agent，learn routing rules，上百条 rule 自生长。

非技术团队？workshops、hackathons——一个月前跟 **People 团队** hackathon，他们是 custom Agent 高采纳者，Slack+Notion 手工流 skill 化。 barrier 常是「肯试」——概念 intuitive，越过 prompt/trigger 小门槛后很 human-like。

**Ivan：** tools-for-thought 时代 core conception 变了吗？思考该谁做？

**Simon Last：** 变很大。AI 前：最好工具让人**直接完成工作**；现在：最好工具让人**管理 Agent 完成工作**。fundamental shift，但大部分 **primitive 仍有用**——还要 document（Agent 爱写 markdown）、还要 database（100 个后台 coding Agent 你不能 100 个 chat thread，要结构化协调）。

我个人：**去年夏天起没写过代码**，不 typing code 了。从人全手写 → tab → 小任务 Agent 但人在 inner loop → 现在 **设计端到端任务 + 验证 +  outer verifier**，跑飞才 monitor。我是 **Agent manager**，不是 coder。Bedtime ritual：尽量多开 Agent、给够 task，目标是一觉醒来**还没跑完**——personal record **13 天**不间断，well prompted；Claude Code / Codex CLI，要 WiFi 电源别 block Agent。

> **金句 · Simon Last（封底）**
> **中文：** 目标从「人类直接干活」变成「人类管理 Agent 干活」——primitive 大多还在。
> **原文：** Before AI, best tool for humans to directly perform work; now, best tool for humans to manage agents to do the work.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 邮件分拣 Agent | email triage agent | memory 页 + interview 学偏好 |
| 外部验证者 | outer verifier | 人不在 inner loop，终检 Agent 产出 |
| Agent 经理 | agent manager | 设计任务/验证/deploy，不手敲代码 |

**本章小结**

- custom Agent：邮件/Slack 分拣等；memory 页 + 纠正 → rules
- People 团队等非工程高采纳；hackathon 降门槛
- Simon 个人：零手码；多 Agent 过夜跑；Notion 产品哲学 = 人管 Agent swarm

---

## 总结

| 维度 | 要点 |
|------|------|
| 起点 | 2022 GPT-4 墨西哥；Writer 快 ship，通用 Agent 慢热 |
| 索引 | 多源 retrieval 靠 craft；embedding 降低组织焦虑 |
| harness | **~每半年 rewrite**；Agent 让 rewrite 更敢想 |
| 产品 | personal Agent + **custom agents**；Markdown/SQLite API |
| 定位 | 模型瑞士 + 人机 Agent 协作工作区 |
| 角色 | **Agent 经理**；primitive（doc/db）仍核心 |

---

## 概念索引

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| harness_rewrite | 每半年重写 | ~6-month harness rewrite | 跟模型同步 |
| agent_api | Agent API | agent-convenient APIs | Markdown + SQLite |
| custom_agents | 定制 Agent | custom agents | 授权后自治 |
| agent_manager | Agent 经理 | agent manager | 人管验证环 |

---

## 附录

### 章节时间戳（B 站简介）

| 章 | 主题 | 时间 |
|----|------|------|
| 01 | GPT-4 时刻 · 双轨 vision | ~00:00 |
| 02 | Q&A · 多源索引 | ~08:42 |
| 03 | harness 重写 · 工程组织 | ~14:15 |
| 04 | Agent API · 定制 Agent | ~21:05 |
| 05 | Agent 经理 · 内部 Agent | ~23:18 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1FEAVzbEWq/ingest`
- **ASR 主源**：`Recastory/workspace/bilibili-retranscribe/BV1FEAVzbEWq/article.md`（FunASR v2）
- **B 站**：[BV1FEAVzbEWq](https://www.bilibili.com/video/BV1FEAVzbEWq/)
- **原节目**：No Priors（播客）
- **时长**：29:03

### 相关阅读

- [[Claude Code实战-结合Obsidian打造第二大脑]] — 文档/数据库 primitive 与 Agent 协作  
- [[Linear CEO-把AI Agent当一级员工]] — 组织上下文与共享 Agent 沙盒  
- [[Together AI-语音Agent延迟质量与规模]] — 多模型与生产质量  
- [[Databricks-企业级Agent生产实践]] — 企业 Agent 索引与 eval  
- [[MOC - Agent Theory and Design]] — Agent 实践横切索引  

### 收录说明

- **嘉宾**：Simon Last，Notion 联合创始人  
- **版本**：canonical Host-Guest v3.2-asr（2026-07-06；无专栏，ASR 主源 A 级）
