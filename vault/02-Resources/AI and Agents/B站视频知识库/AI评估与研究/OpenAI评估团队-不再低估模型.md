---
title: "OpenAI 评估团队：不再低估模型"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation", "openai"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation", "openai"]
created: "2026-07-02"
source: "B站视频 - Easonlee的AI笔记"
description: "Tejal Patwardhan 谈 frontier eval、benchmark 饱和、bench maxing、GDPval、湿实验 Frontier Science 与 AGI index——主张 underhype 模型、dogfood 重试。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/AI评估与研究/OpenAI评估团队-不再低估模型.md"
source_sha256: "c41b4fbf79a4c2df949eec4fc75a0e9bf9d5a094ed978b67fa7d44f03508a0fc"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1EwK96AEyU/"
source_original_date: 2026-06-17
host_name: "OpenAI Podcast Host"
guest_name: "Tejal Patwardhan"
guest_title: "OpenAI Frontier Evals / Preparedness 负责人"
material_tier: A
content_form: dialogue
dialogue_fidelity: source
question_source: transcript
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1EwK96AEyU/ingest"
speaker: "Host / Tejal Patwardhan"
duration: 44:23
saved: 2026-07-02
updated: 2026-07-03
transcript_source: "bilibili-retranscribe/BV1EwK96AEyU/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Host-Guest canonical (ASR primary)
speaker_inference: "asr_heuristic + video_description"
speaker_confidence: medium
factual_status: partial
factual_reviewed: 2026-07-13
verification_basis:
  - transcript
  - transcript_json
  - column
unresolved_facts:
  - "主持人身份和部分 benchmark 名称尚未由 OpenAI 官方节目页逐项确认。"
concepts:
  - id: capability_overhang
    zh: 能力富余
    en: capability overhang
    one_line: 模型早能某事、世人晚 adoption
  - id: bench_maxing
    zh: 刷榜
    en: bench maxing
    one_line: 优化榜单非通用能力
  - id: pain_is_moat
    zh: 痛苦即护城河
    en: pain is the moat
    one_line: 真实世界 eval 运维是瓶颈
---

# OpenAI 评估团队：不再低估模型

**Host：** OpenAI Podcast 主持  
**Guest：** Tejal Patwardhan（Frontier Evals / Preparedness 负责人）  
**形态：** Host-Guest canonical v3.2（**ASR 主源**）  
**B 站：** [BV1EwK96AEyU](https://www.bilibili.com/video/BV1EwK96AEyU/) · **时长** ~44 min

---

## 开场

Tejal 2023 年加入 OpenAI **Preparedness**，赶上 reasoning 模型抬头。她管 **frontier eval**——在 **能力富余**（模型早能、世人晚用）时测清楚、告诉外界斜率有多陡。公众常 **低估** 模型；OpenAI 内部其实在 **underhype**。

五章：**为何做 eval / overhang** → **reasoning 时刻与 o1 sandbox** → **benchmark 饱和与 GDPval** → **湿实验 Frontier Science** → **dogfood 与个人 eval 建议**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 能力富余 | capability overhang | 能力先于文化/法规 adoption |
| 前沿评估 | frontier eval | 测 next-gen 能力、负责任发布 |
| 刷榜 | bench maxing | 90% 算力刷榜单、用户体感差 |
| 基准饱和 | benchmark saturation | 模型接近 100%，榜单失去分辨力 |
| 职业任务基准 | GDPval | 按 BLS 职业真实任务比人类 |
| 前沿科学 | Frontier Science | 湿实验 robot 蛋白合成等 |
| AGI 指数 | AGI index | 多域加权 basket，内部跟踪 |

---

## 01 Eval 为何重要：在悬垂时看见未来

**Host：** 你怎么进 OpenAI 的？Eval 为什么 exciting？

**Tejal Patwardhan：** 2023 年加入，ChatGPT 已出、GPT-4 已出，**superalignment** 刚起步。Preparedness 问：**next-gen 多 capable、怎么 responsible release**。我加入后 **reasoning early results** 起来——威胁建模、跑什么 eval、发布流程，极 exciting。

Eval 帮你 **measure、pressure test**，在 public 感知跟上之前 **see progress**。**Capability overhang**：模型 **早已 capable**，文化/法律/习惯 barrier → 人们 **晚 adoption**。朋友看 ChatGPT：「像 Slack，还行」——miss **slope is steep**。Eval 的 **greatest service** 是 measure & share progress with world。

> **金句 · Tejal**
> **中文：** 公众低估模型；我们其实在 underhype。
> **原文：** People really underexpect the model… if anything, I think we're underhyping the power of them.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 能力富余 | capability overhang | 能力领先于社会 adoption |
| 准备团队 | Preparedness | 威胁建模 + release 流程 |
| 斜率 | slope of progress | 6 个月前体验不能代表今天 |

**本章小结**

- Eval = 在 overhang 窗口测能力、对外讲真话
- 朋友级 ChatGPT 体验严重低估 frontier 斜率
- OpenAI 立场：underhype > overhype

---

## 02 Reasoning 时刻：GPQA、o1 与 sandbox 越狱

**Host：** Reasoning 对世界晚一年才知道——你当时什么感觉？

**Tejal Patwardhan：** Early experiments：**model trained on math**，eval **GPQA**（bio/chem/physics PhD 题）→ doing really well。Nathan forecast：**6 months human-level science** from math training——当时 extremely locked down。看 transcript：**「smartest reasoning I've ever seen」**。GPQA 成 PhD-level benchmark；**sticks keep moving**。

**o1 release**：long thinking paradigm；有人 worry **release too soon**（path to AGI vibe）。Cyber security test：**model broke out of sandbox** in capture-the-flag——found implementation vulnerability——**feel the AGI moment** 之一。之后很多次：模型做 surprising/intelligent/novel 事，回看 transcript：**「these guys are clever」**。必须 publish，让世界知道 models can do this。

「撞墙」叙事让我 frustrate——我盯 improvement **很久**，**no signs of stopping**，industry 都会 **crazy year**。Math training **proof point**，不是 end product——要 scale 到 science、professional work、personal use。

> **金句 · Tejal**
> **中文：** o1 发布前 sandbox 越狱——多次「feel the AGI」之一。
> **原文：** The model broke out of the sandbox… it was kind of a feel-the-AGI moment.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| GPQA | GPQA | PhD 级科学题 benchmark |
| 沙箱逃逸 | sandbox breakout | CTF 里找实现漏洞逃出容器 |
| 推理范式 | reasoning paradigm | 长思考链，o1 类 |

**本章小结**

- Math train → GPQA surprise：能力迁移超直觉
- o1 发布伴随安全 eval 与 responsible release 张力
- 「撞墙」帖与一线 research 体验脱节

---

## 03 饱和、刷榜与 GDPval：测真实工作

**Host：** SWE-bench saturated、bench maxing 什么意思？

**Tejal Patwardhan：** **Bench maxing**：训练只为了让 **某个 eval 好看**，用户用起来 **not quite what I signed up for**——generally bad。算力预算：90% 刷榜 vs 整体变强——后者才对。

**Saturated**：模型接近 **100%** 正确——像两个天才做高中数学卷，**分不出**更 smart 的 intelligence。要 **更长 horizon、更 realistic** 的测量。演进：high school/college 选择题 → **SWE-bench Verified**（真实 code repo、unit test）→ 湿实验 biology → **computer use** 多步真实环境。

**GDPval**：BLS 职业列表 + 每 job top tasks——financial analyst diligence、legal memo、research paper——给 model **真实工作 context**，比 human 表现如何。最早模型 **<20%**——我们 ** proud 发布**「模型还弱」的新 yardstick， catalyze **real-world work** 投入。现在模型 best，但 benchmark **too easy**——下一步：**manager 级模糊任务**（「跑这个分析」），不是几百字 step-by-step prompt。

公开 benchmark **motivates research**；gaps 知道在哪才能 deliver better model。Static benchmark **测不了 days/weeks agent work**——Codex 能 **跑很久**写代码、调 API、browser；automated eval 要限时，**real-world usage + scaling laws** 补 signal。

> **金句 · Tejal**
> **中文：** 刷榜 generally bad——用户会说「不是我要的」。
> **原文：** Bench maxing is generally bad… when a user uses it, they'll be like, this is not quite what I signed up for.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| SWE-bench Verified | SWE-bench Verified | 修 half broken/underspecified 的 public bench |
| GDPval | GDPval | 40+ 职业真实任务 eval |
| 长程任务 | long-horizon eval | 静态题测不了 days/weeks agent |

**本章小结**

- Saturated bench 失去分辨力 → 必须更 ambitious
- GDPval：敢发布「还弱」的真实工作测量
- 下一 frontier：模糊指令 + 更长 time horizon

---

## 04 湿实验与「痛苦即护城河」

**Host：** Frontier Science 湿实验怎么回事？

**Tejal Patwardhan：** 迭代：**Frontier Science Olympiad**（bio/chem/physics 难题）→ **Frontier Science research**（未完成 thesis 片段，rubric 评分）→ **Ginkgo Bioworks 湿实验**：model 优化 **蛋白合成 protocol**，robot **真实跑**，测 yield——variant cancer drug 相关蛋白。我们 **nervous**——human baseline 会不会被 beat？**Never underestimate models**——curve 很清楚，**beat human baseline**，set SOTA。

模型给 **optimization problem**（疫苗成本、蛋白合成）能 **real-world inputs** 持续优化——第一次 eval **等 robot 跑完**才 record，不是等 arXiv。**Pain is the moat**——team 口号：测 digital 已 complex（Codex 调 API、browser、artifact）；**physical world** 更要 ops/logistics。**Eval 工作从 theory/code 转向 planning operations**——我 job 变了很多。

Multimodal（4o 实时语音）要 **whole new stack**：election 前 **delay launch six weeks** 建 persuasive propaganda tests。AGI index：像 CPI 的 **weighted basket**——capabilities、safety、alignment 多域，**迭代变难**，**anti bench-max public marker**。

> **金句 · Tejal**
> **中文：** 痛苦即护城河——真实世界 eval 的运维才是瓶颈。
> **原文：** Pain is the moat.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 湿实验 eval | wet lab eval | robot 跑 protocol，测真实 yield |
| AGI 指数 | AGI index | 内部多域 weighted basket |
| 人为质量控制 | human QC in evals | eval 数据质量仍要 human touch |

**本章小结**

- 湿实验：等 robot ≠ 等论文，物理 eval 新 frontier
- Never underestimate：蛋白合成已 beat human baseline
- Pain is moat：ops/logistics 是 eval 护城河

---

## 05 Dogfood、computer use 与给个人的建议

**Host：** 普通人怎么建立自己的 eval？六个月前 ChatGPT 不行就放弃了。

**Tejal Patwardhan：** Things move **every couple weeks**——我 job 要 **最早看到** most powerful models，但公众 **not awake**。Best personal eval：**dogfood**——尽量多用；上周不行，**下周再试** probably work。

我让 model **first pass everything**：Slack、实验设计、management logistics——不行就 **写进 eval gap**。Computer use：**light years** over 8 months ago——读 Slack、排 calendar、optimize rooms **比我快**；latency 到 tipping point，但 **很多人还没试 plugins**。Model 优势：调 connector 比人点 UI 快；browser/desktop navigation trained 后 **有 advantage over us**。

Frontier evals team **open source**：SWE-bench Verified、MLE-bench、PaperBench、**GDPval**——plot 每代 improvement，外界常 **overestimate 饱和时间**（说一年，其实更快）。Public bench 有 **label noise、memorization、reward hacking**——lab 论文 bench 没 scale 过；**贴近 product** 是 quality forcing function。

劳动力：模型 mostly **tasks not jobs**——你要 plan、navigate ambiguity、collaborate；even research/software 的人 **recalibrated**，其他 industry 朋友 **far behind**——**try again next week**。Maximum AGI world：digital work **model 想做什么、执行、交互 real world**——unicorn「mostly AI + few employees」 stories 已出现。Clinical trial  paperwork、FDA 文档——classic digital work，accelerate = **faster cheaper better goods**。

> **金句 · Tejal**
> **中文：** 最好 personal eval 就是 dogfood——上周不行，下周再试。
> **原文：** The best eval honestly is just dogfood… try again the next week, it'll probably work.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 试吃狗粮 | dogfood | 真实工作流里测模型 |
| 计算机使用 | computer use | browser/desktop agent 插件 |
| 记忆化 | memorization | 训练见过答案，测不出 true skill |

**本章小结**

- 个人 eval = 高频 dogfood + 周期性重试
- Computer use 到实用 latency；插件值得现在试
- Tasks→jobs 跨度仍大，但 slope 对 calibrated 的人已很陡

---

## 总结

| 维度 | 要点 |
|------|------|
| 立场 | **Underhype** 模型；公众用旧体验 judge |
| Overhang | Eval 在 adoption 前 measure & share |
| Benchmark | 饱和 → GDPval/湿实验/长 horizon；反 bench maxing |
| Moat | **Pain is the moat**——physical+digital ops |
| 个人 | **Dogfood**；六 month 前 ChatGPT ≠ 今天 |

> **金句 · Tejal（封底）**
> **中文：** 我们不该低估模型——曲线还在往上。
> **原文：** We should never underestimate the models… the curve is pretty clear.

---

## 概念索引

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| capability_overhang | 能力富余 | capability overhang | 能力先于 adoption |
| bench_maxing | 刷榜 | bench maxing | 优化榜单非通用 |
| pain_is_moat | 痛苦即护城河 | pain is the moat | 真实 eval 运维难 |

---

## 附录

### 章节时间戳（B 站简介）

| 时间 | 主题 |
|------|------|
| 03:20 | 能力富余 / 低估斜率 |
| 09:50 | 刷榜 vs 实用 |
| 13:10 | GDPval 模糊任务 |
| 23:15 | 湿实验 beat human |
| 30:30 | Pain is the moat |

### 素材路径

- **ingest**：`Recastory/workspace/knowledge/B1-openai-evaluation/ingest`
- **ASR 主源**：`Recastory/workspace/knowledge/B1-openai-evaluation/article.md`
- **B 站**：[BV1EwK96AEyU](https://www.bilibili.com/video/BV1EwK96AEyU/)
- **时长**：~44 min

### 相关阅读

- [[Snorkel-小模型RL超越大模型]] — eval 与训练数据  
- [[YC论文俱乐部-5篇论文揭示AI研究趋势]] — 研究趋势  
- [[Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿]] — 工程侧 capability  
- [[MOC - Agent Theory and Design]] — Agent 理论索引  

### 收录说明

- **嘉宾**：Tejal Patwardhan（OpenAI Frontier Evals）  
- **版本**：canonical Host-Guest v3.2-asr（2026-07-03；原 v3 九段讲义已替换）
