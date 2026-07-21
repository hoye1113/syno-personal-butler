---
title: "DHH：编写代码的新方式"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "ai_career"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "ai_career"]
created: "2026-07-07"
source: "https://www.bilibili.com/video/BV1FzQhBUETs/"
description: "DHH：六个月从 AI 怀疑到代理优先；美即真理；资深监督代理 10x；程序员黄金时代见顶；探索成本降雄心升；Rails/Linux 省 token。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/DHH-编写代码的新方式.md"
source_sha256: "2acf066c2ce250831c23a98ba6e731209a9e360a08e17a6a1b3a87fab51a28a0"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1FzQhBUETs/"
column_url: "https://www.bilibili.com/read/cv47775159/"
host_name: "Lenny Rachitsky"
guest_name: "David Heinemeier Hansson"
guest_title: "Ruby on Rails 创始人 · 37signals"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1FzQhBUETs/ingest"
speaker: "Lenny Rachitsky / DHH"
duration: "1:47:21"
saved: 2026-07-07
updated: 2026-07-07
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1FzQhBUETs/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1FzQhBUETs/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column 主持人A ≈ Lenny 播客"
speaker_confidence: medium
concepts:
  - id: beauty_is_truth_code
    zh: 美即真理（代码）
    en: beauty is truth in software
    one_line: 优雅结构是正确性的嗅觉标准
  - id: agent_supervision_10x
    zh: 监督代理十倍速
    en: 10x via agent supervision
    one_line: 资深验证输出，一小时百 PR
  - id: coder_golden_age_peak
    zh: 程序员黄金时代见顶
    en: peak of coder golden age
    one_line: 实施趋零，纯编码高薪难续
  - id: exploration_cost_drop
    zh: 探索成本骤降
    en: exploration cost collapse
    one_line: 验证模糊想法便宜千倍，P1 优化也敢做
author:
  - "[[David Heinemeier Hansson]]"
---

# DHH：编写代码的新方式

**Host：** Lenny Rachitsky  
**Guest：** David Heinemeier Hansson（DHH）  
**形态：** Host-Guest v3.2（专栏主源）  
**B 站：** [BV1FzQhBUETs](https://www.bilibili.com/video/BV1FzQhBUETs/) · **时长** ~107 min

---

## 开场

六个月前 DHH 在 Lex Fridman **抨击** AI 编码；寒假几周后 **180° 转代理优先**。37signals 现在用代理的方式，比任何时候都**更有野心**——同时他仍说：**程序员的黄金时代可能已经过了顶峰**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理优先 | agent-first | 默认让代理执行多步工程任务 |
| Omarchy | Omarchy Linux | DHH 自研 Arch/Hyprland 发行版 |
| 氛围感编程 | vibe coding | 非工程师快速原型（DHH 仍警惕规模化） |

---

## 01 美即真理：工艺在 AI 时代更值钱

**Lenny：** 你把软件当手艺——美学跟 AI 什么关系？

**DHH：** **美即真理**。数学、物理如此，代码的结构与交互也应优雅。我选 Ruby 因美感；AI 时代这非但没贬值，更是**高级工程师 vs AI 搬运工**的分水岭。37signals 最积极的加速者 Jeremy 说：我们要做 **P1——最快 1% 请求的优化**——以前 ROI 不够，现在敢做。

**本章小结：** 品味与工艺是验证 AI 输出的门槛，不是装饰。

---

## 02 从讨厌 Copilot 到代理突破

**DHH：** 字符级自动补全**打断心流**、错误频发，我极度反感。直到 Claude 3.5/4：**能自主 bash、端到端任务**，才从量变到质变。Rails 正在复兴——**对代理最省 token 的 Web 栈之一**。我还在做 **Omarchy** Linux：7000 种发行版里仍有空间，「想法都被想过」不重要，**你的独特品味**才重要。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 结对程序员 | pair programmer | 旧式补全像坐旁边猜字 |
| 代理 | agent | 自主多步执行 |

**本章小结：** 讨厌补全≠讨厌 AI；代理形态才配得上「工程同事」。

---

## 03 资深 10x：监督而非手写

**DHH：** AI 红利主要流向**资深开发者**——能验证、能.redirect 错误。我一小时能处理**上百个 PR**，像穿超级机甲；从实施里解放出来盯架构。反过来：**仅靠编码技能拿高薪的时代在结束**——软件从成本中心变价值中心，要产品同理心与商业嗅觉。

**Lenny：** 初级程序员呢？

**DHH：** 实施成本趋零时，市场不需要大量只会写代码的劳动力。蛋糕在变大——**探索成本降千倍**，团队用同样人力挑战更野的功能边界。

> **金句 · DHH**
> **中文：** 当你能如此高效地监督代理、产生这么大影响时，真的会陶醉——得提醒自己别像限时促销。
> **原文：** When you can supervise agents this efficiently, it's intoxicating — you have to remember it's not a limited-time offer.

**本章小结：** 10x 属于能鉴赏质量的人；纯码农路径变窄，野心路径变宽。

---

## 04 热爱计算机：抵御焦虑

**DHH：** 2030 不确定——**回归对创造的热爱**比空想财富重要。用 AI 省下的精力去学新系统、磨手艺。Linux、Rails、Kamal 都是「先解决自己痛点再开源」同一现象。

---

## 总结

| 维度 | 要点 |
|------|------|
| 态度 | 怀疑→代理优先，但保留审美标准 |
| 工具 | 代理非补全；Rails/Linux 适配代理 |
| 职业 | 资深监督 10x；纯编码黄金时代见顶 |
| 业务 | 探索便宜→敢做 P1 与野功能 |
| 心态 | 热爱创造 > 焦虑炒作 |

### 相关阅读

- [[Claude Code之父-编程已被解决接下来发展]] — 编程终结论对照
- [[Karpathy-从Vibe Code到Agentic Code]] — vibe vs agentic
- [[MOC - AI 时代个人发展与组织]]

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 15:42 | 美即真理 |
| 20:15 | 补全→代理 |
| 35:50 | 资深 10x |
| 48:12 | 黄金时代见顶 |
| 55:30 | 探索成本 |
| 62:10 | 热爱计算机 |

### ingest 路径

`Recastory/workspace/bilibili-retranscribe/BV1FzQhBUETs/ingest/column_article.md`

**spot_check：** ≥45 min，建议抽 35:50 / 48:12。
