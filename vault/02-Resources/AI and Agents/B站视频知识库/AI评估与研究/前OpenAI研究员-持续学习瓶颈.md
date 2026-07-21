---
title: "前OpenAI研究员：当前AI的瓶颈需要持续学习"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation", "codex", "openai"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation", "codex", "openai"]
created: "2026-07-07"
source: "https://www.bilibili.com/video/BV1SfXxBpExT/"
description: "Jerry Tworek：扩展仍有效但泛化慢；奖励难域；AGI=摆脱绝望的持续学习；实验室探索/利用困境；编码代理改抽象层；反主流研究勇气。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/AI评估与研究/前OpenAI研究员-持续学习瓶颈.md"
source_sha256: "f3b41bc746cb7db2f2899358d7309826a8c9ed982ec343d5dc128ad965996134"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1SfXxBpExT/"
column_url: "https://www.bilibili.com/read/cv47196355"
host_name: "Jacob Effron"
guest_name: "Jerry Tworek"
guest_title: "OpenAI 前研究副总裁 · o1/Codex"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1SfXxBpExT/ingest"
speaker: "Jacob Effron / Jerry Tworek"
duration: "1:03:00"
saved: 2026-07-07
updated: 2026-07-07
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1SfXxBpExT/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1SfXxBpExT/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column 主持人A=Jacob Effron"
speaker_confidence: high
concepts:
  - id: scaling_generalization_gap
    zh: 扩展与泛化裂缝
    en: scaling vs generalization gap
    one_line: 训什么强什么，未见领域仍弱
  - id: reward_hard_domains
    zh: 奖励难域
    en: hard-to-reward domains
    one_line: 写书/创业反馈慢，RL 信号稀
  - id: continual_learning_agi
    zh: 持续学习通向 AGI
    en: continual learning for AGI
    one_line: 失败后要能更新信念，非死循环
  - id: explore_exploit_labs
    zh: 实验室探索-利用困境
    en: explore-exploit in labs
    one_line: 份额压力导致趋同，少范式冒险
author:
  - "[[Jerry Tworek]]"
---

# 前OpenAI研究员：当前AI的瓶颈需要持续学习

**Host：** Jacob Effron（《无监督学习》）  
**Guest：** Jerry Tworek（OpenAI 前研究副总裁）  
**形态：** Host-Guest v3.2（专栏主源）  
**B 站：** [BV1SfXxBpExT](https://www.bilibili.com/video/BV1SfXxBpExT/) · **时长** ~63 min

---

## 开场

Jerry 参与 **o1、o3、Codex** 等推理与 RL 扩展，刚离开 OpenAI 做实验室里难做的方向。核心判断：**扩展在已训练技能上几乎无上限，但泛化与持续学习仍是 AGI 门前硬仗**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 扩展法则 | scaling laws | 加数据算力可预测变强 |
| 可验证空间 | verifiable domains | 数学/代码等易自动判对错 |
| 持续学习 | continual learning | 失败后更新内部知识 |
| 下一 token 预测 | next-token prediction | 预训练目标 |

---

## 01 扩展还能走多远：训什么得什么

**Jacob：** 纯靠预训练+RL 扩展，能到哪？

**Jerry：** 扩展**真实、可预测、令人愉悦**——加大预训练，世界模型更好；对特定技能做 RL，该技能就极强。**瓶颈在泛化**：未见知识、未 RL 过的任务仍弱。进步循环是：每季度加数据，**专补上一版模型差的领域**——有效但**慢**。开放问题是：能否用更少数据换更多泛化？

**本章小结：** 扩展解决「你会训的」；剩余是「你没训的」与数据效率。

---

## 02 奖励函数决定边界：易验证 vs 难反馈

**Jacob：** 编程/数学像一类，写书/创业像另一类？

**Jerry：** 关键在**质量信号多难拿到**。OpenAI 在「好作家」上也有 RL 进展，但写书要等数年才知道好坏，创业早期更难归因运气。**医学、会计**若有明确规则+经理能判好坏，就能训——外科医生成功标准甚至是「病人活下来」。

难域不是永远不可能，但需要**足够时间与打破规则的能力**才达专家级——人类也一样难说怎么学会写好書。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 稀疏反馈 | sparse feedback | 很久以后才知的奖励 |
| 易验证 | easy-to-verify | 自动判分领域 |

**本章小结：** RL 版图=能稳定拿到反馈的任务；难反馈域要靠新范式或持续学习。

---

## 03 AGI 标志：摆脱绝望感

**Jacob：** 你怎么更新 AGI 时间线？

**Jerry：** 当前模型遇障碍**不会根据失败更新信念**——反复犯错或死循环，缺人类的「困境出路感」。**除非自主持续学习**，否则仍是受人监督的工具——这是我离开后要攻的方向之一。

**本章小结：** AGI 不是更会考试，而是**失败后可改写自己**。

---

## 04 实验室政治与编码代理未来

**Jacob：** 基础模型竞争像在探索-利用囚徒困境？

**Jerry：** 经济压力逼大家**利用已知路径**优化份额，模型趋同；领先有累积效应，但过度消费产品可能分散科研专注力（如编码）。

**Jacob：** 软件工程会怎样？

**Jerry：** 人直接写代码会大减，角色像**初级工程经理**；应用公司长期可能要**向下训练自有模型**筑护城河——大厂有算力，但垂直数据深挖仍可能局部领先。

> **金句 · Jerry**
> **中文：** 如果一百个研究员想法完全一致，你们本质上只有一个研究员。
> **原文：** If 100 researchers think exactly the same, you essentially have one researcher.

**本章小结：** 伟大研究者=系统工程+理论+**反主流勇气**。

---

## 总结

| 维度 | 要点 |
|------|------|
| 扩展 | 强但慢，补弱项循环 |
| RL | 易验证域爆发，难反馈域卡奖励 |
| AGI | 持续学习、摆脱绝望 |
| 产业 | 探索不足、趋同竞争 |
| 工程 | 人管代理；应用下沉训模 |

### 相关阅读

- [[Transformer作者-AI泛化与类人学习]] — 泛化与数据效率
- [[Deepset工程师-小模型领域微调]] — 可验证 RL 实践
- [[OpenAI研究员-Harness工程软件开发新范式]] — 编码代理范式
- [[MOC - Agent Theory and Design]]

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 05:12 | 扩展与泛化 |
| 09:45 | 奖励函数边界 |
| 15:30 | AGI 与持续学习 |
| 22:15 | 实验室探索-利用 |
| 35:40 | 编码代理抽象层 |
| 48:20 | 研究者勇气 |

### ingest 路径

`Recastory/workspace/bilibili-retranscribe/BV1SfXxBpExT/ingest/column_article.md`

**spot_check：** ≥45 min，建议抽 15:30 / 35:40。
