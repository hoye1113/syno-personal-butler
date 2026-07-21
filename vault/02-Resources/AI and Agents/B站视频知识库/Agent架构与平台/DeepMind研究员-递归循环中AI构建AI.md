---
title: "DeepMind 研究员：递归循环中 AI 构建 AI"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation", "multi_agent", "context_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation", "multi_agent", "context_engineering"]
created: "2026-07-07"
source: "B站视频 - Easonlee的AI笔记"
description: "Mostafa Dehghani：RSI 已在实验室发生、形式验证闭合循环、持续学习对抗权重冻结、ViT 规模效应、NanoBanana 交错生成与长周期 agent 可靠性数学。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/DeepMind研究员-递归循环中AI构建AI.md"
source_sha256: "6a556b9d3bc8f37c65dbfac740b86476ea341028211f855c1c0993f5cc77bc88"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1xXDjBUE8S/"
column_url: "https://www.bilibili.com/read/cv47609447/"
host_name: "Matt Turk"
guest_name: "Mostafa Dehghani"
guest_title: "Google DeepMind 研究员 · ViT/Gemini 核心"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1xXDjBUE8S/ingest"
speaker: "Matt / Mostafa"
duration: "~75:00"
saved: 2026-07-07
updated: 2026-07-07
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1xXDjBUE8S/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1xXDjBUE8S/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column Matt's Podcast"
speaker_confidence: high
concepts:
  - id: rsi_in_labs
    zh: 实验室 RSI
    en: RSI in labs
    one_line: 新模型 largely 用旧模型构建
  - id: formal_verification_loop
    zh: 形式验证闭环
    en: formal verification loop
    one_line: 代码/数学可证，模糊域需诚实反馈
  - id: continual_learning
    zh: 持续学习
    en: continual learning
    one_line: 对抗权重冻结与灾难性遗忘
  - id: vit_scale
    zh: ViT 规模效应
    en: ViT scaling
    one_line: 16×16 切块 + Transformer 即可
  - id: long_horizon_reliability
    zh: 长周期可靠性
    en: long-horizon reliability
    one_line: 100 步×95% 成功率 <1% 完成率
author:
  - "[[Mostafa Dehghani]]"
---

# DeepMind 研究员：递归循环中 AI 构建 AI

**Host：** Matt Turk  
**Guest：** Mostafa Dehghani（DeepMind · Universal Transformer / ViT / Gemini 多模态）  
**形态：** Host-Guest canonical v3.2（**专栏主源**）  
**B 站：** [BV1xXDjBUE8S](https://www.bilibili.com/video/BV1xXDjBUE8S/) · **时长** ~75 min

---

## 开场

「循环」是前沿热词：推理时加计算（思维链、磁带读写、参数重用），更高层是**开发循环的自我改进**——每去掉一层人类判断，就去掉一个瓶颈。Dehghani 参与的路径从拒绝 Transformer 实习，到 ViT、Gemini 原生多模态，再到谈 **RSI 其实已在发生**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| RSI | recursive self-improvement | AI 构建下一代 AI |
| 持续学习 | continual learning | 权重随世界更新 |
| ViT | Vision Transformer | 图像切块当 token |
| 交错生成 | interleaved generation | 文本-图像-文本规划 |
| 参差不齐智能 | jagged intelligence | 强推理弱数数 |

---

## 01 循环与自我改进：已在发生

**Mostafa：** 自我改进不是全新故事——从手工特征到深度学习到数据驱动，一直在**去人类瓶颈**。宏观上，各实验室**新一代模型 largely 用上一代模型构建**；缺的是长周期与全自动化，但方向极快。完全自动化后，瓶颈主要是**算力**，人会再迎一次跃迁。

Karpathy 自动研究是早期信号——研究里靠直觉的「黄金部分」正进入开发循环。不会说明天取代所有天才研究员，但几年前不敢想的已在发生。

**Matt：** 这是「AI 自动改自己权重」——进展会加速？

**Mostafa：** 方向对，但 fully automated 仍有很多难题；**难，但 plausible**。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 开发循环 | development loop | 训练/数据/架构由 AI 参与 |
| 人力瓶颈 | human bottleneck | 每次改模型都要人介入 |

**小结：** RSI 是特征工程故事的续集；已部分发生，未完全闭合。

---

## 02 评估、形式验证与模型崩溃

**Mostafa：** 你只能改进可衡量的；**自我改进进度连 eval 都缺标准**。难在：复杂 agent 环境、安全沙箱、长程任务基础设施。数学/代码上**形式验证**最强——证明过不过；医生建议是模糊域，要把形式方法扩展到「脏世界」的诚实反馈环。

**模型崩溃：** 闭环无外部信号、模型自言自语会崩；有强验证器或真实奖励锚定则 AI 生成数据可很强大。风险存在，非主障碍。

泛化 vs 专业化：用户不在乎任务类别——**通才是终极目标**；短期可先极致专业化（如编码）再扩圈。后训练像找局部最优，多目标会互相拉扯（编码↑ 数学略降）。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 地面真值 | grounding | 传感器/环境喂给自改进 |
| 灾难性遗忘 | catastrophic forgetting | 学新忘旧 |

**小结：** 闭合循环靠 eval + 接地；模糊域是下一片硬土。

---

## 03 持续学习、ViT 与原生多模态

**Mostafa：** **持续学习**对抗**权重冻结**——今天模型截止训练日，靠 RAG 补丁；理想是新闻进权重。研究未到「标准配方可上生产」；DeepMind 进展快但尚无全员拍板的单一方案。RAG 不会原样消失——上下文权重信息仍不同，长尾或仍要 RAG。

**ViT 故事：** 问「为何视觉最大才一亿参数？」——试 **16×16 切块当词**，大规模训练，最简单想法奏效，为 Gemini **原生多模态**铺路：单架构同时吃文本/图/音/视频。

**跨模态正向迁移：** 语言有**报告偏差**（香蕉沙发会被说，普通沙发不会）；视觉世界模型更高效。**学生成模态 = 学懂模态**。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 权重冻结 | frozen weights | RAG/微调都建在此假设上 |
| 报告偏差 | reporting bias | 文本欠采样平凡事实 |

**小结：** 持续学习会改数据管道假设；ViT 证明统一架构可行。

---

## 04 NanoBanana、长周期任务与 Hot Takes

**Mostafa：** 图像生成不是「文本翻译器」——**交错文本-像素思考**：先大物体再小物体，规划每步难度，不被单次 50 细节上限卡住。NanoBanana 2 更快：Flash 规模 + 蒸馏 + 服务优化（工程师随口「快 10 倍」）。

**参差不齐智能：** 能证难题却在数字母上翻车——不是补 system prompt 就行，是**学习结构的缺陷**。

**被低估：** **持续学习**该进利用阶段了。**过于自信：** 只推技术就够——治理、信任、分配比技术难，且**社会吸收速度跟不上**。

**长周期自动化：** 100 步、每步 95% 成功 → 全成概率 **<1%**；人要的是失败体验，不是平均性能。建议：做**接地、健壮、长周期可靠**的基础问题；重新定义**智能**以便衡量进展。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 增量生成 | incremental generation | 分步降难度 |
| 失败权重 | failure salience | 一次蠢错毁信任 |

**小结：** 产品热点在生成；研究前沿在闭合循环、持续学习与可靠长 agent。

---

## 总结

| 维度 | 要点 |
|------|------|
| RSI | 实验室已用旧模型造新模型；自动化待闭合 |
| Eval | 形式验证强；模糊域需新反馈 |
| 持续学习 | 终结权重冻结；RAG 演变 |
| ViT/Gemini | 简单切块 + 统一架构 |
| 生成 | 交错规划 > 一次翻译 |
| Agent | 长周期可靠性是残酷数学 |

---

## 附录

### 章节时间戳（视频简介）

| 时间 | 主题 |
|------|------|
| 07:15 | RSI 已在发生 |
| 13:42 | 形式验证 |
| 26:10 | 持续学习 |
| 38:50 | ViT 规模 |
| 48:30 | 图像交错生成 |
| 58:20 | 长周期可靠性 |

### Ingest

- BV：`BV1xXDjBUE8S`
- ingest：`Recastory/workspace/bilibili-retranscribe/BV1xXDjBUE8S/ingest`
- 专栏：`.../ingest/column_article.md`

### 相关阅读

- [[DeepMind团队-AI评估规划化与民主化]] — 评估民主化对照
- [[OpenAI评估团队-AI编程评估集历史现状与未来]] — 编码 eval 退役与继任
- [[Anthropic团队-如何构建运行数小时的Agent]] — 长时 agent
- [[MOC - Harness Engineering]] — 长周期 harness
- [[MOC - Agent Theory and Design]] — 入口
