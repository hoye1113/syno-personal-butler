---
title: "Transformer作者：AI泛化瓶颈需要类人学习"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation", "codex", "claude"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation", "codex", "claude"]
created: "2026-07-07"
source: "https://www.bilibili.com/video/BV1tzJc6PE82/"
description: "Lukasz Kaiser：穷尽式泛化 vs 人类少样本；Waymo 施工区；Codex 5–10x 研究生产力；RL 进模糊域；5090 单卡时代；闭源开源长期差距。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/AI评估与研究/Transformer作者-AI泛化与类人学习.md"
source_sha256: "53065bd9fbd6d00d57cfc823aa12c739185f3609586750b2d7e6dbc1863c5557"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1tzJc6PE82/"
column_url: "https://www.bilibili.com/read/cv50528477/"
host_name: "Jacob Effron"
guest_name: "Lukasz Kaiser"
guest_title: "Transformer 论文合著者 · OpenAI 前研究员"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1tzJc6PE82/ingest"
speaker: "Jacob Effron / Lukasz Kaiser"
duration: "1:13:34"
saved: 2026-07-07
updated: 2026-07-07
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1tzJc6PE82/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1tzJc6PE82/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column Jacob/Lukasz 对话"
speaker_confidence: high
concepts:
  - id: exhaustive_generalization
    zh: 穷尽式泛化
    en: exhaustive generalization
    one_line: 万亿 token 试完表层才学概念
  - id: physical_world_gap
    zh: 物理世界泛化裂缝
    en: physical world generalization gap
    one_line: 施工区路况人类一次过、模型百万英里仍卡
  - id: codex_research_10x
    zh: Codex 研究 5–10x
    en: 5-10x research productivity with Codex
    one_line: 三周复现论文缩到两天
  - id: post_transformer_bets
    zh: 后 Transformer 赌注
    en: post-Transformer research bets
    one_line: 生物式少样本学习仍值得赌
author:
  - "[[Lukasz Kaiser]]"
---

# Transformer作者：AI泛化瓶颈需要类人学习

**Host：** Jacob Effron  
**Guest：** Lukasz Kaiser（Transformer 合著者）  
**形态：** Host-Guest v3.2（专栏主源）  
**B 站：** [BV1tzJc6PE82](https://www.bilibili.com/video/BV1tzJc6PE82/) · **时长** ~74 min

---

## 开场

推理+工具让代理每天能干惊人小事，但 Lukasz 仍觉得**跟我们不像**：人类从极少数据跃迁概念，大模型像「**穷尽所有错误选项才做对**」。他是 Transformer 作者，却在谈**后 Transformer** 与类人数据效率。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 后 Transformer | post-Transformer | 探索非当前主流架构 |
| 机制可解释性 | mechanistic interpretability | 找神经元/回路因果 |
| 思维链 | chain-of-thought | 推理中间步骤 |
| 蒸馏 | distillation | 大模型→小模型能力转移 |

---

## 01 穷尽式学习 vs 人类少样本

**Jacob：** 去年你说「推理够泛化吗，还是要别的？」半年过去怎么看？

**Lukasz：** 进步巨大——我天天跟 **Codex** 聊研究难题，它真懂能实现。但总不对劲：**美国人穷尽所有选项才做正确的事，LLM 也这样**——要万亿 token 扫完表层才学核心概念。人类从少量样本抽概念，有时还自创（虽不完美）。

每次觉得「该有新范式了」，Transformer 又追上来——**两边一起在涨**：模型更强，对「别的东西」的需求也更强烈。SF 派对上的直觉+LeCun 旧论点：**大脑式学习用更少数据做更多事**，这是根本问题，不只是感觉。

**本章小结：** 数据不受限问题会被扩展吃掉；**物理世界与少样本**仍卡数据效率。

---

## 02 物理世界：Waymo 与施工区

**Jacob：** Waymo 刚因施工区停高速——百万英里仍不行，青少年一次过。

**Lukasz：** 模拟/互联网文本补不全**具身反馈**。机器人硬件上没法像虚拟世界那样无限扩数据——**数据效率瓶颈会剩给所有「要碰现实世界」的问题**。药物研发等本就数据稀缺域同理。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自我中心视频 | egocentric video | 廉价物理经验来源之一 |
| 泛化 | generalization | 分布外仍表现 |

**本章小结：** Transformer 在文本/代码惊艳，**物理泛化**暴露架构上限。

---

## 03 Codex 5–10x 与 Anthropic 押编码

**Jacob：** Anthropic 为何率先在编码爆发？

**Lukasz：** **专注编码是明智决定**——当时硬做 ChatGPT 式路线难竞争。我个人：**三周复现论文代码→现在两天**，不是省时间而已，是从类名调试里解放，**高层「精神控制」ML 逻辑**。

**本章小结：** 编码是 RL+可验证反馈的甜蜜点；代理已改研究者工作方式。

---

## 04 RL 进模糊域与单卡研究黄金时代

**Jacob：** RL 能进法律、诗歌吗？

**Lukasz：** 靠**人类偏好稀疏信号**在学品味与文化典故——投够经验数据，很多「不可验证」漏洞能堵。硬件上**桌下 5090** 算力抵几年前小集群——个人/大学几天模拟人类十年处理量，能探索**脱离当前范式**的架构，不必等大厂算力。

**Jacob：** 闭源 vs 开源差距？

**Lukasz：** 长期存在但**不会断层**——主权模型、行业需求养活开源；蒸馏永不及原版深，但会「足够好」。

> **金句 · Lukasz**
> **中文：** 我们还没真正弄清楚这种学习方式——它在学，但要海量数据与算力，说明没到点子上。
> **原文：** We haven't really figured out this way of learning — it learns, but needs massive data and compute.

---

## 总结

| 维度 | 要点 |
|------|------|
| 泛化 | 穷尽式 vs 人类少样本 |
| 物理 | 施工区=数据效率试金石 |
| 工具 | Codex 5–10x 研究复现 |
| RL | 向模糊域渗透 |
| 生态 | 后 Transformer 与个人算力赌局 |
| 开源 | 差距常驻但不灭 |

### 相关阅读

- [[前OpenAI研究员-持续学习瓶颈]] — 持续学习与 AGI
- [[DeepMind-模型将吞噬Harness]] — 架构与 harness 张力
- [[MOC - Agent Theory and Design]]

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 04:15 | 穷尽式泛化 |
| 09:42 | 物理世界短板 |
| 16:20 | Codex 研究生产力 |
| 24:15 | RL 进模糊域 |
| 32:40 | 单卡研究时代 |
| 40:15 | 闭源开源差距 |

### ingest 路径

`Recastory/workspace/bilibili-retranscribe/BV1tzJc6PE82/ingest/column_article.md`

**spot_check：** ≥45 min，建议抽 09:42 / 16:20。
