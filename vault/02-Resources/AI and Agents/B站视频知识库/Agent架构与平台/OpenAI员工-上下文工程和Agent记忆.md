---
title: "OpenAI员工：上下文工程和Agent记忆"
tags: ["ai_agent", "video_transcript", "bilibili", "openai", "context_engineering", "memory", "mcp"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "openai", "context_engineering", "memory", "mcp"]
created: "2026-06-09"
source: "B站视频 - Easonlee的AI笔记"
description: "OpenAI Build Hour：Micah × Emory 讲上下文工程三大策略、四种 failure mode、trim/compact/summarize 现场 demo 与跨会话记忆护栏。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI员工-上下文工程和Agent记忆.md"
source_sha256: "39f55a84b87c04e763842128f0f6297cc2c77fd53d5a433e46d9d35da60a9f76"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV14nrMBKENb/"
duration: 57:43
saved: 2026-07-02
updated: 2026-07-03
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV14nrMBKENb/ingest"
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV14nrMBKENb/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: "Host-Guest canonical (ASR primary)"
host_name: "Micah"
guest_name: "Emory"
guest_title: "OpenAI Solution Architect"
speaker_inference: "asr_v2 Speaker1=Micah Speaker2=Emory + video_description"
speaker_confidence: high
asr_version: v2
spot_check: 2026-07-02
concepts:
  - id: context_engineering
    zh: 上下文工程
    en: context engineering
    one_line: 统筹 prompt、RAG、memory、tool 的上下文优化
  - id: reshape_fit
    zh: 重塑适配
    en: reshape & fit
    one_line: trim/compact/summarize 把对话塞进 budget
  - id: context_burst
    zh: 上下文爆发
    en: context burst
    one_line: 单 turn tool 输出导致 token 尖峰
  - id: cross_session
    zh: 跨会话注入
    en: cross-session injection
    one_line: 上 session summary 写入新 session system prompt
---

# OpenAI 员工：上下文工程和 Agent 记忆

**Host：** Micah（OpenAI Startup Marketing）  
**Guest：** Emory（OpenAI Solution Architect）  
**形态：** Build Hour · Host-Guest canonical v3.2（**ASR 主源** · 中文口语化）  
**B 站：** [BV14nrMBKENb](https://www.bilibili.com/video/BV14nrMBKENb/) · **时长** ~58 min

---

## 开场

OpenAI **Build Hour** 系列第三期：前两期是 Responses API、Agent RFT，这期专讲 **Agent Memory Patterns**。Emory 带 live demo——Next.js 双 Agent 并排，左无记忆、右有记忆，现场看 trim、compact、summarize 和跨会话注入。

五章预告：**上下文工程是什么** → **短长记忆与四种 failure mode** → **trim / compact / summarize** → **跨会话记忆与护栏** → **isolate / extract + eval 与规模化**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 上下文工程 | context engineering | 比 prompt 宽：统筹 RAG、state、memory、tool |
| 重塑适配 | reshape & fit | trim、compact、summarize 塞进 context window |
| 隔离路由 | isolate & route | 子智能体分流工具与 context |
| 抽取检索 | extract & retrieve | 记忆工具、状态对象、向量检索 |
| 上下文爆发 | context burst | 一次 tool dump 让 token 从几百涨到三千+ |
| 回合块 | turn block | 从 user 消息到下一条 user 消息的不可分割单元 |
| 跨会话注入 | cross-session injection | 上 session 摘要写进新 session system prompt |
| 记忆范围 | memory scope | global 用户事实 vs session 临时偏好 |

---

## 01 上下文工程：艺术 + 科学，North Star 是最小高信号

**Micah：** 很多 builder 把 prompt engineering 和 RAG 分开想——你这期想先把「上下文工程」框起来。Karpathy 那句定义，你怎么落地？

**Emory：** 上下文工程既是**艺术**也是**科学**。艺术：每一步推理、每一次 action，你得判断**什么最重要**——这是判断。科学：有可重复的模式、可测的影响——reshape、isolate、extract 这些。

现代大模型**不只靠模型质量**，更靠**你给的 context**。prompt engineering、结构化输出、RAG、session state、memory tools——全在「上下文工程」这个大球里。memory 是持久或半持久存储：文件、数据库、memory tool，用来上传和取回关键信息。

**North Star** 就一句：**最小高信号 context**，最大化你想要的结果。

三大策略：
- **重塑适配**：trim、compact、summarize
- **隔离路由**：把 context 和 tools 分给特定子智能体
- **抽取检索**：memory extraction、state management、retrieval

还有 **prompt / tool hygiene**：system prompt 要瘦、要清楚；工具集要小、别重叠；例子别堆太多。

> **金句 · Emory**
> **中文：** 现代大模型的表现，取决于你给它的 context，不只取决于模型本身。
> **原文：** Modern LLMs perform based on the context you give them.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 上下文工程 | context engineering | 统筹各层 context 优化，比 prompt 宽 |
| 高信号上下文 | high-signal context | 每 token 都该推动目标 outcome |
| 工具卫生 | tool hygiene | 小工具集、清晰边界、少重叠定义 |
| 结构化输出 | structured output | 约束模型返回格式，减解析歧义 |

**本章小结**

- 上下文工程 = prompt + RAG + state + memory + tool 的统一学科
- 三大策略（reshape / isolate / extract）生产里常组合用，非单选
- North Star：最小高信号 context

---

## 02 短长记忆分家，四种 failure mode 把坑讲透

**Micah：** 短记忆和长记忆解决的不是一回事——先划这条线。然后 demo 里左 Agent 多轮后重问 WiFi 过热，右 Agent 还记得 OS 更新——差别从哪来？

**Emory：** **短记忆** = session 内技巧，把 context window 用到极致。**长记忆** = 跨 session，从多次对话收集信息，下次取回。

长运行智能体的瓶颈：**context 有限**。system 指令、对话历史、tool 输出——全抢同一个 token budget。

**有记忆 vs 无记忆**（IT 故障场景）：
- 左：用户说过 WiFi、过热，多轮后 Agent **重问**已经给过的信息
- 右：记得 OS 更新、background sync，能接着上一轮往下排

四种 **failure mode**：

**① 上下文爆发**——一次 `get_refund` tool 把整份 policy 塞进 context。turn 2 大概三四百 token，turn 3 **飙到三千+**。对策：控制 tool 返回字段，只 inject 高信号内容。

**② 上下文冲突**——system 写「无 warrant 不退款」，tool 又说「VIP 可退」，Agent 最后承诺全额退款。prompt 和 tool 别互打架。

**③ 上下文中毒**——幻觉写进 summary，跨 turn 传播。自由发挥的 note 累积、旧摘要覆盖新事实，都会 poison。

**④ 上下文噪声**——太多相似 tool definition，模型选错工具。

> **金句 · Emory**
> **中文：** 没开 memory 时，Agent 会重问用户已经说过的信息。
> **原文：** With memory off, it falls back to re-asking information the user already gave.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 会话内记忆 | in-session / short-term memory | 活跃对话窗口内的技巧 |
| 跨会话记忆 | cross-session / long-term memory | 多 session 连续性与个性化 |
| 上下文冲突 | context conflict | 互斥指令同时出现在 context |
| 上下文中毒 | context poisoning | 错误信息写入 summary 并传播 |

**本章小结**

- 短记忆撑满 window；长记忆建跨 session 连续性
- burst / conflict / poisoning / noise 四类坑要单独防
- demo 左无记忆重问、右有记忆接茬——stateful 是长运行 Agent 地基

---

## 03 Trim、Compact、Summarize：三种 reshape 怎么选

**Micah：** 解决方案落在 reshape 上——trim、compact、summarize 听起来都像「删旧的」，差别在哪？现场参数怎么设？

**Emory：** 三种技术，trade-off 不同：

**Trim（修剪）**：丢最旧 turn，留最近 N 个。快、无额外 latency；代价是**真丢历史**。适合 tool-heavy、短工作流。

**Compact（压缩）**：只丢旧 **tool result**，message 骨架和 placeholder 留着。tool-heavy Agent 首选。

**Summarize（摘要）**：旧 turn 压成**结构化 summary**，inject 回 context。信息密度保留得好；多一次 model call，有 latency 和 cost。

**启发式：**
- 分析生产 session snapshot，看 token 从哪涨
- **别 mid-turn trim**——turn = 一条 user 消息到**下一条** user 消息之前的一切；打断 turn 块容易丢线
- **40% / 80% 阈值** proactive 触发，别等撞 hard limit
- 独立任务链 → trim；跨 turn 依赖 → summarize

**Demo 参数例**：
- trim：trigger turn 6，keep recent 3
- compact：trigger turn 4，类似 trim 但只剥 tool output
- summarize：trigger turn 5，keep recent 3 → 出现橙色 **memory** 条

**Summarize prompt（IT 场景）** 要结构化：product、environment、reporting issues、what worked/didn't、identifiers、timeline、next steps；加 **temporal ordering** 和 **hallucination control**——矛盾检测、别编。

> **金句 · Emory**
> **中文：** 别在 turn 中间 trim，会打断回合块。
> **原文：** Do not trim mid-turn and break turn blocks.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 上下文修剪 | context trimming | 丢最旧 turn，留最近 N 个 |
| 上下文压缩 | context compaction | 只丢旧 tool result，留对话骨架 |
| 上下文摘要 | context summarization | 旧消息压成结构化 summary 再 inject |
| 主动阈值 | proactive threshold | 40%/80% 窗口用量时提前触发压缩 |

**本章小结**

- trim 最快但丢信息；compact 适合 tool-heavy；summarize 保密度但有成本
- turn 边界神圣；用阈值 proactive 触发，别撞墙才救
- summarize prompt 要 schema + 幻觉/矛盾控制，别 free-form

---

## 04 跨会话注入：summary 进 system prompt，memory 不是权威

**Micah：** turn 5 生成 summary 之后 reset session——右 Agent 一开口就问你 MacBook Sequoia 网还断吗。cross-session 怎么接？guardrails 写啥？

**Emory：** 开启 **cross-session injection**：上一轮 summary **写进 system prompt**。新 session 你说「hi」，右 Agent：**「MacBook 网还在 Sequoia 更新后出问题吗？」**——因为 memory 组件带着设备、试过的步骤、时序。

**Memory 指令要点**（inject 进 system prompt 时）：
- memory **非权威**——可能 stale、不完整
- **勿 over-weight memory**——别把旧摘要当唯一真相
- **不存 secrets**；防 injection 攻击

**Memory scope** 分两桶：
- **global**：用户常住美国、偏好友好语气——跨 session 稳定事实
- **session**：这次要 window seat——临时偏好；多次重复可 **graduate 到 global**

旅行 concierge：window seat 说几次 → 升格 global。life coach 则 memory pool 膨胀快几个数量级——设计要想清楚。

> **金句 · Emory**
> **中文：** Memory 不是权威——当作可能过时或不完整。
> **原文：** Memory is not authoritative — treat as potentially stale.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 跨会话注入 | cross-session injection | 上 session summary 写入新 session system prompt |
| 记忆护栏 | memory guardrails | stale、secrets、over-weight 的显式规则 |
| 记忆升格 | memory graduation | session 偏好多次出现后升为 global |
| 结构化摘要 | structured summary | 表单字段式摘要，非自由发挥 |

**本章小结**

- cross-session = 结构化 summary → system prompt inject
- guardrails：非权威、勿过度加权、不存秘密
- global vs session scope；重复偏好可升格

---

## 05 Isolate、Extract、Eval：子智能体分流与记忆规模化

**Micah：** reshape 讲完了——isolate、extract 怎么接？Q&A 里大家问 eval、分层 context、记忆 prune、多用户 scale——你快速过一遍。

**Emory：** **Isolate & Route**：tool offloading 到 subagent——主 Agent fresh context，减 conflict 和 poisoning。

**Extract & Retrieve**：
- **Memory tool**：live term 存一两句 JSON/markdown note
- **State object**：goal 等字段，周期性 inject 回 system prompt
- **Retrieval**：store → search/filter/rank → inject，类似 RAG

记忆形状从简单 evolve：先结构化小 note，再段落式 memory；优先记**人类客服自然会记**的东西。

**Eval 三桶**：
1. 常规 eval **with vs without memory**，看 uplift
2. **memory-specific eval**：summary 质量、inject 时机、long-running golden set（~50 例）
3. 调参启发式：trim/compact 平衡点

任务不够长、没碰 context 阈值 → memory 可能**零 uplift**，先测再开。

**Hierarchical context**：可以——项目级 + 任务级，看 use case。

**Prune stale memory**：
- **temporal tag**：两个月前说喜欢狗，今天说喜欢猫——模型能分辨新旧
- **weight decay**：降权旧记忆；或 consolidation 覆盖

**多用户 scale** 分两路：
- 检索式 long-term memory → 向量库 sharding、embedding 优化
- 纯 persist 文本 → 磁盘/DB 存储管理

建议 **pilot**：小流量 subgroup 开 memory，看 pool 怎么演化——travel concierge vs life coach 信息量差几个数量级。

**库**：OpenAI **Agents SDK** 起步，session 里实现 trim/compact/summarize 很顺；生态还在快速演化。

> **金句 · Emory（封底）**
> **中文：** 设计 Agent 记忆，就想清三件事：记什么、怎么记、怎么忘。
> **原文：** Better understanding what your agent should remember, how it should remember, and how it should forget.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 工具卸载 | tool offloading | 重 tool 上下文分给 subagent |
| 记忆工具 | memory tool | Agent 主动写入/读取记忆片段 |
| 时间戳标注 | temporal tag | 记忆带来源时间，助新旧覆盖 |
| 权重衰减 | weight decay | 旧记忆降权，防 pool 过载 |

**本章小结**

- isolate 减 conflict；extract/retrieve 管长期记忆形状
- eval：with/without memory + memory-specific golden set
- prune 靠 temporal tag 或 weight decay；scale 分检索 vs 纯存储两路

---

## 总结

| 维度 | 要点 |
|------|------|
| 学科定位 | 上下文工程统筹 prompt、RAG、memory、tool；North Star = 最小高信号 |
| 短 vs 长 | session 内 reshape；跨 session 靠结构化 summary + guardrails |
| Failure mode | burst / conflict / poisoning / noise——tool 设计和 prompt 要对着防 |
| Reshape 选型 | trim 快但丢；compact 剥 tool；summarize 保密度；别 mid-turn 截 |
| 生产落地 | Agents SDK + 40/80% 阈值 + eval uplift；pilot 小流量看 memory 演化 |
| 与 vault | 接 [[Manus创始人-深度干货-上下文工程的最佳实践]]、[[OpenAI官方-Codex新手教程]] |

> **金句 · Emory（封底）**
> **中文：** 目标是最小的高信号 context。
> **原文：** Aiming for the smallest high-signal context.

---

## 概念索引

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| context_engineering | 上下文工程 | context engineering | 统筹各层 context 优化 |
| reshape_fit | 重塑适配 | reshape & fit | trim/compact/summarize |
| context_burst | 上下文爆发 | context burst | 单 turn tool dump 尖峰 |
| cross_session | 跨会话注入 | cross-session injection | summary 写入新 session system prompt |
| memory_scope | 记忆范围 | memory scope | global 事实 vs session 偏好 |
| context_poisoning | 上下文中毒 | context poisoning | 幻觉 summary 跨 turn 传播 |

---

## 附录

### 章节时间戳（ASR 话题转折）

| 时间 | 主题 |
|------|------|
| ~01:36 | 上下文工程定义与 North Star |
| ~04:28 | 短长记忆 + 四种 failure mode |
| ~09:05 | IT 双 Agent live demo（burst 可视化） |
| ~15:57 | trim / compact / summarize 技术对比 |
| ~22:08 | demo：trim turn 6、summarize turn 5 |
| ~29:05 | cross-session injection + memory guardrails |
| ~31:59 | isolate / extract / retrieve |
| ~34:42 | Q&A：SDK、eval、scope、prune、scale |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV14nrMBKENb/ingest`
- **ASR 主源**：`Recastory/workspace/bilibili-retranscribe/BV14nrMBKENb/article.md`
- **video_description**：`{ingest}/video_description.md`
- **B 站**：[BV14nrMBKENb](https://www.bilibili.com/video/BV14nrMBKENb/)（*Easonlee的AI笔记*）
- **节目**：OpenAI Build Hour · Agent Memory Patterns
- **嘉宾**：Emory（Solution Architect）、Micah（主持）、Brian（虚拟 Q&A）
- **时长**：57:43 · **ASR**：FunASR SenseVoice + cam++，v2，39 段
- **资源**：Context Engineering Cookbook、Agents Python SDK、Build Hours GitHub

### 相关阅读

- [[Manus创始人-深度干货-上下文工程的最佳实践]] — compaction vs summarization 生产视角  
- [[Claude Code实战-构建一个AI数据分析师]] — 数据分析场景 context 爆炸  
- [[IBM团队-Harness工程详解]] — guardrails、verify、harness 视角  
- [[MOC - Agent Theory and Design]] — Agent 理论横切索引  

### 收录说明

- **speaker_inference**：`asr_v2 Speaker1=Micah Speaker2=Emory + video_description`  
- **版本**：canonical Host-Guest v3.2-asr（2026-07-03；原 v3 九段讲义已替换）
