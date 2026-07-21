---
title: "Claude Code 负责人：创造内幕"
tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "harness_engineering"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Pragmatic Engineer × Boris：side project 到产品；100% AI 写码与 20–30 PR/天；瑞士奶酪安全；agentic search 淘汰 RAG；印刷机类比与通才年。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code负责人-创造内幕.md"
source_sha256: "c2b738d879a310d29f5fef440935b0363e2b18b2c21a1d3c143d483db928d76b"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1SJ93B2EBo/"
host_name: "Gergely Orosz"
guest_name: "Boris Cherny"
guest_title: "Claude Code 创造者 · Anthropic Member of Technical Staff"
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1SJ93B2EBo/ingest"
speaker: "Gergely Orosz / Boris Cherny"
duration: 97:59
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1SJ93B2EBo/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Host-Guest canonical (ASR primary)
speaker_inference: "asr_heuristic + sponsor_pragmatic + youtube_style_match（The Pragmatic Engineer）"
speaker_confidence: medium
asr_version: v2
spot_check: 2026-07-06
concepts:
  - id: printing_press
    zh: 印刷机类比
    en: printing press analogy
    one_line: 抄写员没消失，市场膨胀成作者
  - id: swiss_cheese_safety
    zh: 瑞士奶酪安全
    en: Swiss cheese safety
    one_line: 多层防护叠概率，不靠单点完美
  - id: agentic_search
    zh: 智能体搜索
    en: agentic search
    one_line: Glob + Grep 胜过早期本地 RAG
---

# Claude Code 负责人：创造内幕

**Host：** Gergely Orosz（The Pragmatic Engineer，speaker_confidence: medium）  
**Guest：** Boris Cherny（Claude Code）  
**形态：** Host-Guest canonical v3.2（**ASR 主源**）  
**B 站：** [BV1SJ93B2EBo](https://www.bilibili.com/video/BV1SJ93B2EBo/) · **时长** ~98 min

---

## 开场

进顶级 AI lab，第一份 PR 被拒——不是代码差，是**手写的**。Boris 七年 Meta（Groups / Instagram 等），TypeScript 书作者，如今 Claude Code 工程负责人。这期覆盖：side project 如何变成最快增长的开发者工具之一；每天 20–30 个 PR、零手写；为何 agentic search 干掉 RAG；印刷机类比与「通才之年」。

五章：**实用主义出身** → **Claude Code 诞生与 dogfooding** → **安全与权限** → **RAG 之死** → **无头衔文化与技能变迁**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 印刷机类比 | printing press | 抄写员→作者，市场膨胀 |
| 瑞士奶酪 | Swiss cheese model | 多层安全叠概率 |
| 智能体搜索 | agentic search | Glob/Grep，不是向量库 |
| 技术职员 | Member of Technical Staff | Anthropic 统一职称 |
| 反向征求 | reverse solicitation | 不确定就问人 |

---

## 01 从 Pokemon 闪烁标签到 Meta

**Host：** 你怎么进软件的？

**Boris Cherny：** 两条线交叉。十三岁在 eBay 卖 Pokemon 卡，发现别人用颜色字体，自己迷上 **blink 标签**——能卖贵一点。中学 TI-83：先把答案写进计算器，再写求解器，再掉到汇编提速；串口线把程序分给全班，全班 A，老师说「一次就好」。大学读经济，辍学做 startup——编码从来是**造有用东西的工具**，不是身份。

YC 早期医疗软件：决策树给医生，IE6 时代写 SVG 渲染。DAU 平的，骑摩托去 UCSF 跟诊——医生五分钟换诊，开机+IE 就没了；改 Android 仍不用，因为**权威感**：不想被看成在玩手机。产品市场契合永远靠假设与 pivot。Meta 七年：Groups 技术负责人，四次晋升；文化从早期黑客变成文档与对齐会议。工程对他一直是**结果导向的通才**，不是语言宗教。

**小结：** 伟大工程师盯 outcome，不盯技术标签。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 跟诊式工程 | shadow the user | 骑摩托去医院看真实使用 |
| 实用主义编码 | coding as means | 造有用的东西 |

---

## 02 Side project：100% AI 代码与每天几十个 PR

**Host：** Claude Code 怎么从内部玩具变成产品？内部吵不吵要不要发？

**Boris：** 一开始不是产品。模型变好后，内部用它写一切。他发帖：Opus 4.5 + Claude Code 写了 **100%** 的 PR，**一行手都没改**；有人说从没觉得自己作为程序员落后这么多——因为模型涨得太快。日常节奏：**一天 20–30 个 PR**，验证靠多层：模型审模型、规则、best-of-n、人审。设计师、数据、财务也能写代码；一个功能可能先堆几十上百个原型再定。

**小结：** 发布争论的另一面是 dogfooding 已不可逆。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 零手写 | 100% AI-written PRs | 人改意图与验证，不改行 |
| 原型洪峰 | dozens of prototypes | 便宜试错 |

---

## 03 瑞士奶酪：权限、对齐、注入

**Host：** 让模型跑 bash，安全团队怎么放行？

**Boris：** 早期内部有人说「不可解，不能发」。和 Ben Mann 等 brainstorm：**不确定就问人**——权限提示从第一版（约 2024.9 内部）就在。运行时分类器、静态分析、allow list；连 `find`/`sed` 都有执行任意代码的冷门路径，默认保守。对齐上 Opus 更抗注入；Web fetch 用 **subagent 摘要**再回主 agent，降低注入面。不是单点魔法，是**瑞士奶酪多层**。

**小结：** 安全是概率叠层 + 人在回路，不是「一次做对」。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 瑞士奶酪 | Swiss cheese model | 多层各堵一点 |
| 权限提示 | ask the human | 不确定就问 |

---

## 04 扔掉本地向量库：Agentic search 赢了

**Host：** 为什么不用 RAG？

**Boris：** 早期按论文做本地向量库 + 云端 embedding，能用但痛：索引漂移、权限谁能看、内部 rogue IT。试过模型递归索引、纯 Glob/Grep。统计上 **agentic search（就是 Glob 和 Grep）全面胜出**。灵感来自 Instagram：跳转定义常坏，工程师用全局搜索 `foo(`——模型也一样。Spinner  alone 迭代上百次，落地十来个——**写得起就扔得起**。

**小结：** 模型够强时，简单工具调用 > 复杂索引。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 智能体搜索 | agentic search | Glob + grep |
| 索引漂移 | index drift | 本地函数还没进库 |

---

## 05 无职称与印刷机

**Host：** 为什么大家都叫 Member of Technical Staff？

**Boris：** 承认大家都在摸索；工作高度通才——设计、用户、需求、研究、基建混着干。他被这种文化吸引。

印刷机类比：中世纪抄写员是稀缺精英，国王常文盲；印刷机来了，抄写员没消失，变成**作者**，文学市场爆炸。软件工程师今天像抄写员——**市场会变大，角色会变，不是单纯消失**。

**小结：** 通才与假设驱动，比语言战争更值钱。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 印刷机 | printing press | 市场膨胀，角色升级 |
| 无职称 | no titles | 通才协作 |

语言战争贬值；假设驱动、跨泳道、管理多 Claude 升值。安全从「不确定」变成他最在意的事。书单：刘慈欣短篇、*Accelerando*、*Functional Programming in Scala*。

---

## 总结

1. **Claude Code 从 dogfooding 长出**，不是 PPT 规划。  
2. **100% AI 写码 + 多层验证** 已是他的日常。  
3. **瑞士奶酪安全 + agentic search** 是工程选择，不是论文跟风。  
4. **印刷机论** 给工程师希望：市场变大，角色变，不是单纯失业。

---

## 附录

**Spot check（≥45 min）** 2026-07-06：对照 ASR 开场印刷机/Statsig 赞助、中段 Swiss cheese 与 agentic search、结尾书单与 host wrap-up；数字 20–30 PR、100% AI 代码、September 2024 内部权限与专栏导读对齐。

**素材路径**

- ASR：`…/BV1SJ93B2EBo/article.md`（根目录）
- ingest：`…/BV1SJ93B2EBo/ingest/`

**相关阅读**

- [[Claude Code负责人-AI原生团队如何使用AI]]
- [[Claude Code之父-亲自讲解Cowork]]
- [[Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿]]
- [[MOC - Agent Theory and Design]]
