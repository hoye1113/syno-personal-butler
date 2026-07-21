---
title: "OpenAI 评估团队：AI 编程评估集 历史、现状与未来"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation", "ai_coding"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation", "ai_coding"]
created: "2026-07-07"
source: "B站视频 - Easonlee的AI笔记"
description: "OpenAI Frontier Evals：SWE-bench Verified 饱和与污染、人类三重审核成本、SWE-bench Pro 与 GDPval 路线，以及 preparedness 框架下编码 eval 的未来。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/AI评估与研究/OpenAI评估团队-AI编程评估集历史现状与未来.md"
source_sha256: "4b2eee65e6b6cd3aa9b30870932e46ed3a4cc1b55b6474ba79920aa495e51aad"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1Ltw8zYErt/"
host_name: "swyx"
guest_name: "Mia / Olivia"
guest_title: "OpenAI Codex VP · Frontier Evals"
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1Ltw8zYErt/ingest"
speaker: "swyx / Mia / Olivia"
duration: "27:10"
saved: 2026-07-07
updated: 2026-07-07
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1Ltw8zYErt/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Host-Guest canonical (ASR primary)
speaker_inference: "ASR names + video_description OpenAI eval podcast"
speaker_confidence: high
concepts:
  - id: bench_saturation
    zh: 基准饱和
    en: benchmark saturation
    one_line: 80%+ 后 0.1% 提升失去意义
  - id: contamination
    zh: 基准污染
    en: benchmark contamination
    one_line: 开源仓库进预训练，模型「记得」答案
  - id: narrow_tests
    zh: 过窄测试
    en: overly narrow tests
    one_line: 未说明的函数名/实现细节导致误判
  - id: swe_bench_pro
    zh: SWE-bench Pro
    en: SWE-bench Pro
    one_line: 更难、更多样、污染更少的长任务集
  - id: real_world_metrics
    zh: 真实世界指标
    en: real-world impact metrics
    one_line: 端到端产品与岗位替代/增效数据
author:
  - "[[Olivia]]"
  - "[[Mia]]"
---

# OpenAI 评估团队：AI 编程评估集 历史、现状与未来

**Host：** swyx（Latent Space）  
**Guest：** Mia（OpenAI VP Research · Codex / Human Data / Alignment）· Olivia（Frontier Evals）  
**形态：** Host-Guest canonical v3.2（**ASR 主源** · 专栏不可用）  
**B 站：** [BV1Ltw8zYErt](https://www.bilibili.com/video/BV1Ltw8zYErt/) · **时长** ~27:10

---

## 开场

SWE-bench Verified 曾是行业看编码进展的「北极星」。OpenAI 今天的主论：**它已饱和且高度污染**，字段应转向 SWE-bench Pro 等更难基准，并重新思考——我们要量的到底是「猜函数名」还是真实软件工程能力。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| SWE-bench Verified | SWE-bench Verified | ~500 题人工清洗后的 GitHub issue 集 |
| 污染审计 | contamination auditor | 用 agent 探模型是否背过题 |
| Preparedness | preparedness framework | OpenAI 跟踪前沿双用途能力 |
| GDPval | GDPval | 白领多职业、难打分的人类标注 eval |

---

## 01 Verified 诞生：近 100 名工程师三重审核

**swyx：** 当初做 Verified 投入有多大？

**Olivia：** 源自 Princeton 的 SWE-bench：给代码库 + GitHub issue，看测试是否通过。OpenAI 为 preparedness 跟踪时发现很多失败是**题设坏了**，不是模型笨。于是雇了近 **100 名真实软件工程师**，反复审查测试是否公平，筛出约 **500** 道更好的题——常要**三重独立审核**，因为要理解整个仓库上下文。

**Mia：** 业界后来都在「验证一切」——HLE verified、GDPval verified——质量文化是好事。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 人类数据战役 | human data campaign | 专家清洗比自动筛题贵一个数量级 |
| 可自动判分 | auto-gradable | 跑测试即对错，易传播 |

**小结：** Verified 的价值在于「当时够难 + 可复现」；成本是大量专家工时。

---

## 02 饱和、污染与过窄测试

**Olivia：** 进展停滞，因为 **eval 饱和且污染严重**。实验室群聊里大家互抬 0.1%，已不具说服力。题来自开源仓库，**没有 canary**；模型在思维链里会推理「这个 repo 某版本有某参数」——没污染知识几乎过不了。

深度复盘：模型做不对的题里，**过半**有问题——最常见是测试**过窄**（未在描述里要求的具体函数名），或测了**描述里没提的额外功能**。

**Mia：** 80% 时代我们量的不再是「会不会 patch issue」，而是「会不会猜测试想要的命名」——这不是我们关心的能力。

**swyx：** 天花板大概多少？GPT-5.2 曾解出 31 道「无污染应极难」的题。

**Olivia：** 难精确估计；我们**将停止报告 SWE-bench Verified**。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 饱和 | saturation | 头部模型挤在误差带内 |
| 过窄测试 | narrow tests | 好解法因命名不同而失败 |

**小结：** 公开仓库 + 预训练 = 结构性污染；过窄测试让高分失真。

---

## 03 SWE-bench Pro 与下一代能力

**Olivia：** Pro 来自 Scale：**更难**（1–4 小时、4 小时+ 档位）、更多仓库与语言、**尚未饱和**；污染审计下，Verified 上多模型出现复述标准答案、甚至报 task ID，Pro 上轻得多。

**Mia：** 字段要超越「15 分钟小 issue」——**长周期任务**（小时到天）、**设计品味**（代码是否干净、可维护）、开放式设计决策。这些不像跑测试那样便宜。

**Olivia：** 一条路是雇承包商 + 专家 rubric（如 **GDPval** 白领工作）；另一条用 LLM 代理近似，但要小心对齐。

**swyx：** 美元计价、长程 agent eval、研究自动化 eval 要不要并进主流编码榜？

**Mia：** 时间、金钱、复杂度都在量「任务有多难」；研究自动化属 preparedness 里 model autonomy 线，AI 编码数据难开源。更想要：**极难任务**（顶尖工程师数月）、**端到端产品**、以及**真实世界使用率**——替代还是增效。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| SWE-bench Pro | SWE-bench Pro | 更难、更多样的继任基准 |
| 设计品味 | design taste | 难自动判分但用户在乎 |
| 真实影响 | real-world impact | 岗位与生产环境数据 |

**小结：** 下一棒是难 + 多样 + 低污染 + 贴近真实工作；自动判分与质量 rubric 要权衡。

---

## 总结

| 维度 | 要点 |
|------|------|
| 历史 | Verified = 大规模人类清洗的 500 题 |
| 现状 | 饱和 + 污染 + 过窄测试 → 停报 |
| 转向 | SWE-bench Pro；更长、更开放的任务 |
| 方法 | GDPval 式专家 rubric vs LLM 代理 |
| 框架 | Preparedness 跟踪 autonomy / 研究自动化 |
| 呼吁 | 社区共建可共享、难、代表真实影响的 eval |

---

## 附录

### 章节时间戳（视频简介要点）

| 主题 | 说明 |
|------|------|
| Verified 停用 | 饱和与污染 |
| 污染机制 | 开源 repo 进预训练 |
| SWE-bench Pro | 更难、低污染 |
| 理想基准 | 开放设计、长任务、可维护性 |
| Preparedness | 研究自动化与编码能力 |

### Ingest

- BV：`BV1Ltw8zYErt`
- ingest：`Recastory/workspace/bilibili-retranscribe/BV1Ltw8zYErt/ingest`
- ASR：`.../BV1Ltw8zYErt/article.md`
- 专栏：opus 失效，无 `column_article.md`

### 相关阅读

- [[OpenAI评估团队-不再低估模型]] — 同团队 frontier eval 方法论
- [[DeepMind团队-AI评估规划化与民主化]] — 评估规划与民主化
- [[Agenta CEO-构建真正有效的AI评估]] — 企业 eval 实践
- [[MOC - Harness Engineering]] — eval 作为 harness 一环
- [[MOC - Agent Theory and Design]] — 入口
