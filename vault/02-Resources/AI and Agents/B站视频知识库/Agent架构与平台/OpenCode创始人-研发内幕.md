---
title: "OpenCode创始人：OpenCode的研发内幕"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "harness_engineering"]
created: "2026-07-07"
source: "https://www.bilibili.com/video/BV1xC7R6VEWv/"
description: "Dax Raad：千万 MAU 开源编码代理；AI 未让交付变快；痛感消失堆技术债；24–29 岁工程师；B2C 体验与中立开源杠杆。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenCode创始人-研发内幕.md"
source_sha256: "3924f3da71550a1b34a37dca60db6614f7ab8d28d94d00cb204146c3aad5faba"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1xC7R6VEWv/"
column_url: "https://www.bilibili.com/read/cv50500159/"
host_name: "Latent Space 主持"
guest_name: "Dax Raad"
guest_title: "OpenCode 联合创始人"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1xC7R6VEWv/ingest"
speaker: "Latent Space / Dax Raad"
duration: "1:21:02"
saved: 2026-07-07
updated: 2026-07-07
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1xC7R6VEWv/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1xC7R6VEWv/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column unknown 主持 + Dax 播客"
speaker_confidence: medium
concepts:
  - id: ai_anesthesia_judgment
    zh: AI 麻醉工程判断
    en: AI anesthesia on engineering judgment
    one_line: 脏活代理代劳，地雷还在但人不疼了
  - id: devtools_as_b2c
    zh: 开发工具即 B2C
    en: devtools as B2C
    one_line: 自下而上靠个人偏好，体验是壁垒
  - id: neutral_open_source_leverage
    zh: 中立开源杠杆
    en: neutral open-source leverage
    one_line: 团结模型商竞争对手对抗临时恶人
  - id: slow_down_to_go_fast
    zh: 放慢才能更快
    en: slow down to go fast
    one_line: PMF 后别用 AI 刷一千个功能
author:
  - "[[Dax Raad]]"
---

# OpenCode创始人：OpenCode的研发内幕

**Host：** Latent Space 主持  
**Guest：** Dax Raad（OpenCode 联合创始人）  
**形态：** Host-Guest v3.2（专栏主源）  
**B 站：** [BV1xC7R6VEWv](https://www.bilibili.com/video/BV1xC7R6VEWv/) · **时长** ~81 min

---

## 开场

OpenCode 不到一年冲到近 **千万 MAU**，Dax 却给团队写备忘录：**我们发太多功能、堆太多 hack，AI 并没让我们发展更快**。编码客观上变容易了，他仍像以前一样苦想——PMF 后最大的难题是**怎么让所有人慢下来**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 编码代理 | coding agent | 多步改代码跑命令的 AI 助手 |
| 产品市场契合 | PMF | 有人愿意付钱/持续用 |
| 领域驱动设计 | DDD | 冗长但给 AI 护栏的建模方式 |
| 间接提示注入 | indirect prompt injection | 不可信内容 hijack 代理目标 |

---

## 01 AI 没让软件更快：弗兰克斯坦产品

**Host：** 你们做最流行的 AI 工程工具之一，却说这不足以做出更好软件——矛盾在哪？

**Dax：** PMF 前 AI 帮不大——你在想**该做什么**，多思考比多尝试重要。PMF 后问题是方向太多：用户要的、竞品做的、显而易见的——**提示代理就能做完**，加起来像发布一千个功能，产品变**弗兰克斯坦**。发布就得永远支持，以后每个功能都要跟它交互。

**Dax：** 客观编码更容易，但我**和以前一样努力思考**。决策者以为编码曾是瓶颈，现在该全盘加速——并没有。我们领域竞品都懂 AI，**没人用 AI 好到把别人打垮**。

**本章小结：** 产能≠好主意；AI 放大的是发布冲动，不是产品判断力。

---

## 02 开源中立：选坏人、团结对手

**Host：** 为什么开源空白这么大？

**Dax：** 2025 夏发布；二月份公司收支平衡才有空做 AI。定位：**唯一大声说「我们是开源选项」的编码代理**。模型商混战——Anthropic 晚上 9 点禁第三方用 Claude 订阅接 OpenCode，用户炸锅；我们消息 OpenAI：**明天大家都会恨 Anthropic，你们正式支持我们就是公关赢**。当天 OpenAI 集成上线。

**Dax：** 老策略——**选一个暂时的坏人，团结所有竞争对手**。Open Next 时对 Vercel 也这么干过。小公司只要在生态位站对，能撬动十亿美元公司。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自下而上采用 | bottom-up adoption | 个人先用，再渗透企业 |
| 终端渲染框架 | terminal rendering framework | OpenCode 自研 TUI 体验 |

**本章小结：** 开源+多模型中立是杠杆；体验先行，.harness 先够用再迭代。

---

## 03 痛感消失：AI 麻醉工程判断

**Host：** 工程师写 hack 时以前的「刺痛」呢？

**Dax：** 以前写权宜之计会不舒服，反馈循环练判断力。代理干脏活，**地雷还在，痛感没了**——团队容易发不该发的功能，**看似很快、实则平庸**。24–29 岁工程师最值钱：有 AI 前原则，又有 AI 后速度。

**Dax：** 质量是初创对抗巨头的**非理性武器**——大厂理性逻辑导向平庸腐烂。软件未来会回归「无聊」的企业模式：DDD、厚重设计模式给 **24 小时高产白痴代理**上护栏。

> **金句 · Dax**
> **中文：** 我现在的困境是：怎么让所有人慢下来，并承认——流程可以看起来很不一样，但应该看起来很不一样吗？
> **原文：** How do I get everyone to slow down and understand — yes our process can look very different, but should it?

**本章小结：** 快写≠快交付；刻意保留痛感与审查。

---

## 04 B2C 思维与增长数据

**Host：** 跟 Claude Code 差在哪？

**Dax：** 程序员做 B2C 通常很烂——**开发工具本质是 B2C**。我们重写终端渲染，打开瞬间就不一样；减摩擦、企业锁机场景也优化。前五月 harness 只是中等，先赢用量再回头做聪明 harness——别人反过来。

增长：6 月发布；12 月 **65 万 MAU**；1 月 **250 万**；近期冲 **800 万+** 奔向千万。假期通常低谷，那年假期仍在涨。

**本章小结：** 消费品级 onboarding + 逆向 harness 策略；规模带来「小 bug 闪瞎几百万人」的新问题。

---

## 总结

| 维度 | 要点 |
|------|------|
| 交付 | AI 加速编码，不自动加速好产品 |
| 策略 | 开源中立、临时恶人、体验优先 |
| 风险 | 痛感消失→技术债与弗兰克斯坦 |
| 人才 | 24–29 岁原则+速度 |
| 工程 | 无聊企业模式回潮给代理护栏 |

### 相关阅读

- [[PlanetScale-Agent时代的基础设施]] — 代理时代基础设施观
- [[Jeff-AGENTS.md历史与最佳实践]] — harness 轻量化
- [[MOC - Harness Engineering]]

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 15:42 | 开发工具即 B2C |
| 18:50 | 开源中立杠杆 |
| 28:15 | 工程判断麻醉 |
| 34:20 | 24–29 岁工程师 |
| 39:45 | 非理性质量 |
| 42:10 | DDD 回潮 |

### ingest 路径

`Recastory/workspace/bilibili-retranscribe/BV1xC7R6VEWv/ingest/column_article.md`

**spot_check：** ≥45 min，建议抽 28:15 / 42:10 段核对数字与专名。
