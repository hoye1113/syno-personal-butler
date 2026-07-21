---
title: "Manus创始人：深度干货！上下文工程的最佳实践"
tags: ["ai_agent", "video_transcript", "bilibili", "context_engineering", "multi_agent", "mcp", "memory"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "context_engineering", "multi_agent", "mcp", "memory"]
created: "2026-06-09"
source: "B站视频 - LangChain × Manus Webinar（Easonlee 转载）"
description: "LangChain Lance 铺垫 context 五主题；Manus Pe 讲 compaction/summarize 区分、communicate vs share-memory、三层 action space、反 over-engineering 与模型切换 eval。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Manus创始人-深度干货-上下文工程的最佳实践.md"
source_sha256: "ebbd1b42cbd2221e164c7211b657c75f88df78bd8ea2246169d0383146d35d22"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV12x1xB8E7b/"
speaker: "Lance Martin（LangChain）/ Pe（Yichao Ji，Manus 联合创始人 & 首席科学家）"
host_name: "Lance Martin"
guest_name: "Yichao \"Pe\" Ji"
guest_title: "Manus 联合创始人 & 首席科学家"
duration: 60:48
saved: 2026-07-02
updated: 2026-07-03
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV12x1xB8E7b/ingest"
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV12x1xB8E7b/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Host-Guest canonical (ASR primary)
speaker_inference: "asr_v2 Speaker1=Lance Speaker2=Pe + video_description"
speaker_confidence: high
asr_version: v2
spot_check: 2026-07-02
concepts:
  - id: context_rot
    zh: 上下文腐烂
    en: context rot
    one_line: context 变长后质量/速度下降
  - id: compaction
    zh: 可逆压缩
    en: compaction
    one_line: 只留 path/query，内容可重建
  - id: share_memory
    zh: 共享上下文子智能体
    en: share-memory subagent
    one_line: 子 agent 看见完整 tool 历史
  - id: action_space
    zh: 三层动作空间
    en: layered action space
    one_line: function call → sandbox CLI → Python/API
---

# Manus 创始人：上下文工程的最佳实践

**Host：** Lance Martin（LangChain 创始工程师）  
**Guest：** Pe（Yichao "Peak" Ji，Manus 联合创始人 & 首席科学家）  
**形态：** Webinar + Q&A · Host-Guest canonical v3.2（**ASR 主源**）  
**B 站：** [BV12x1xB8E7b](https://www.bilibili.com/video/BV12x1xB8E7b/) · **时长** ~61 min

---

## 开场

Agent 年里最热的词之一是 **context engineering**。LangChain × Manus 这场 webinar：Lance 先用 industry 共识（offload / reduce / retrieve / isolate / cache）搭台，Pe 再讲 Manus **production 里 battle-tested 的非共识**——尤其 Lance 幻灯片 **discourage** 那一列。

Pe 说 July 写的 Manus 博客大多还成立，今天**不重复博客**，专挖「当时没讲透 / 没讲」的部分。下面四章：**为何是 context engineering 而不是早 fine-tune** → **compaction vs summarization** → **isolation 双模式 + 三层 action space** → **别 over-engineer + 随模型删脚手架**。

---

## 01 为什么 Context Engineering：agent 让 context 无界膨胀

**Lance：** 时间线上，**prompt engineering** 跟着 ChatGPT（2022.12）起来；**context engineering** 今年——尤其 **year of agents**——才真正爆发。根因是什么？

**Pe：** 你建 agent = **LLM + tools + loop**。每调一次 tool，**observation 追加进 message list**——Manus 典型任务 **~50 次** tool call，Anthropic 说生产 agent 能 **数百 turn**。Context **无界膨胀**，而 **context rot** 现象明确：**越长越差**——重复、变慢、决策质量掉。Karpathy 那句定义 still 准：**delicate art of filling the window with just what's needed for the next step**。

**Lance：** Industry 常见五招——我快速过，Pe 后面会对着 Manus 深化。

**Offload：** 重 payload（web search 等）**写入文件系统 / 外部 state**，回给 agent 的只是一行 **path 或指针**——Claude Code、Manus、open deep research 都这么做。

**Reduce：** Prune 旧 tool call；Claude 4.5 SDK 已内置；Claude Code **compaction** 到 context 比例阈值；cognition 在 agent handoff 时 summarize。

**Retrieve：** 经典辩论——Cursor Lee Robinson：**语义索引 + grep**；Claude Code / Manus session sandbox：**glob/grep，不建 index DB**（session 太新，来不及 index）。

**Isolate：** Subagent **各自 context window**——deep agents、open deep research、Claude subagents 皆然。

**Cache：** **KV cache** 极重要——但 share-memory subagent 因 system prompt / action space 不同 **无法复用 KV**，prefill 全价。

**Pe：** 更大问题——**为何不用 fine-tune 搞定？** 我做过十年 NLP、训过小模型——迭代速度被 **训练周期锁死**，PMF 未定却在刷 benchmark。创业应 **尽量久靠 general model + context engineering**。MCP  launch **一夜改 action space**，on-policy RL 假设崩塌——**application 与 model 的分界线，就是 context engineering**。

> **金句 · Pe**
> **中文：** 应用和模型之间，context engineering 是最清晰、最实用的边界。
> **原文：** Context engineering is the clearest and most practical boundary between application and model.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 上下文工程 | context engineering | 为下一步精确填充 context window |
| 上下文腐烂 | context rot | 变长后推理变慢、质量掉 |
| 上下文卸载 | context offloading | 重 payload 落盘，窗口里留指针 |
| KV 缓存 | KV cache | 长 input prefill 成本；subagent 难共享 |

**本章小结**

- Agent loop 让 message 无界涨——rot 是 production 真问题
- 五主题（offload/reduce/retrieve/isolate/cache）是 industry 共识骨架
- 早 fine-tune / 固定 action space RL 在 MCP 时代很危险

---

## 02 Compaction vs Summarization：可逆与不可逆

**Pe：** Context reduction 里我们**强制区分两种操作**：

**Compaction（可逆）：** 每个 tool call/result 有 **full** 与 **compact** 两格式。例：`write_file` 返回后文件已在 sandbox，compact 版**只留 path，drop 长 content**——信息 **externalized 未丢失**，10 步后某旧 action 可能突然重要。

**Summarization（不可逆）：** 真丢信息。Summarize **前** 必须把关键块 **offload 到文件 / log**，以便 grep 找回。

**触发策略：**
- 标称 1M context，**rot 常从 ~128k–200k 开始**——用 eval 定 **rot threshold**
- **先 compaction**（如最旧 50% tool calls compact，新的保持 full 作 few-shot），不够再 summarization
- Summarize 时用 **full 版**数据，且 **保留最近几条 full tool result**，否则 summarize 后模型 **换风格、换 tone**

**Lance：** Summarization prompt 怎么写才不丢关键信息？

**Pe：** 别 free-form 让模型「随便总结」。用 **schema 表单**——字段如：改过的文件、用户目标、我停在哪。**Structured fill** 比 creative summary **稳得多**。

**Lance：** Search tool 那种 token 爆炸——先全量返回再 compact，还是 subagent？

**Pe：** 复杂多 query search → **agent-as-tool**（`advanced_search`），内部 subagent/workflow + **固定 output schema**；简单 Google 搜索 → full detail 进 context，靠 compaction；同时 instruct 模型把 **中间 insight 写进文件**，防 compaction 早于预期。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 可逆压缩 | compaction | path/query 保留，内容可重建 |
| 不可逆摘要 | summarization | 真丢信息，需 schema + 预先 offload |
| 模式驱动摘要 | schema-driven summary | 表单字段填摘要，非自由发挥 |
| 智能体即工具 | agent-as-tool | 主 agent 调函数，内层跑 subagent |

**本章小结**

- Compaction 可逆、summarization 不可逆——**顺序必须先 compaction**
- Rot threshold 用 eval 测，别信标称 1M
- Summarize 用 schema；search 重活走 agent-as-tool

---

## 03 Isolation 双模式 + 三层 Action Space

**Pe：** Cognition 警告 multi-agent **同步信息是噩梦**——但 isolation 仍必要。Go 谚语借来：**communicate by sharing memory vs share memory by communicating**——翻译成 agent：

**Communicate 模式（经典 subagent）：** 主 agent 写 prompt → subagent **context 只有这条指令** → 只回 **最终结果**。适合「搜 code snippet」类 **短、清晰** 任务——Claude Code **Task tool** 即此。

**Share-memory 模式：** Subagent **看见完整 tool 历史**，自有 system prompt / action space。适合 **deep research**——中间搜索、笔记都影响终稿；全塞文件再让 subagent 读 **浪费 latency + token**。代价：**prefill 贵、KV 不能复用**。

**Context offloading 第二层——工具本身也占 context：** MCP 工具太多 → **context confusion**，调错或调不存在的 tool。常见 dynamic RAG load tools 会 **重置 KV**（tool 定义在 context 前部），且 **删 tool 的 past call 仍在 history**。

**Manus 三层 action space（实验中）：**
1. **Function calling**——~10–20 **atomic** 函数（读写文件、shell、搜索、浏览器）；schema 清晰、可 constrained decoding
2. **Sandbox utilities**——预装 CLI（格式转换、语音识别、**Manus 版 MCP 全走 shell 不进 function 层**）；大输出写文件，用 `less`/`grep` 处理
3. **Packages & APIs**——Python 调预授权 API（3D、金融等）；**算在 runtime，不把整年股价塞进 context**

Hybrid：**纯 CodeAct 无法用 constrained decoding**——Manus 试过全 CodeAct，**会错**；大数据用 code 跑内存，**只回 summary**。

**Lance：** Subagent 通信用 **schema 契约**？

**Pe：** Wide Research / **agent map-reduce**：共享 **同一 sandbox 文件系统**，传 **path** 不传全文。Spawn subagent 时主 agent **定义 output schema**；subagent 用 **Submit Result** + **constrained decoding** 交卷——像生成 **spreadsheet**，列由 schema 约束。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 通信式隔离 | communicate pattern | 子 agent 只吃一条指令 |
| 共享上下文隔离 | share-memory pattern | 子 agent 看全 tool 历史 |
| 三层动作空间 | layered action space | 函数 → shell 工具 → 代码/API |
| 约束解码 | constrained decoding | schema 锁输出，防 subagent 乱格式 |

**本章小结**

- 短任务 communicate；长链 research share-memory——**别一刀切 multi-agent**
- MCP 工具膨胀用 sandbox CLI 卸载，别堆 function definitions
- Subagent 输出用 schema + constrained decoding 当「契约」

---

## 04 别 Over-engineer：简化才是最大跃迁

**Pe：** 五维（offload / reduce / retrieve / isolate / cache）**互相牵制**——isolation 减 rot 频率但伤 cache；engineering 是在**冲突目标间找平衡**。

但最想留的一句是：**avoid context over-engineering**。Manus 上线以来**最大 leap 不是**加 fancy context 层或 clever retrieval——而是 **simplifying、删 trick、少 frustrate 模型**。每次简化架构 → **更快、更稳、更聪明**。Context engineering 的目标是 **让模型 job 更简单，不是更难**。

**Lance：** 模型变强后删脚手架——你 **five times refactor** 了？

**Pe：** Manus 3 月 launch 到 10 月 **已 refactor 5 次**。模型不 only 变强，**行为也变**。我们 internal eval：**固定 architecture，切换 weak ↔ strong model**——若 weak→strong **gain 大**，架构更 future-proof，因为 **明天 weak 可能 ≈ 今天 strong**。每 **1–2 月** reveal；用开源 / early access **提前适配下一代**。

**Lance：** 长期 memory？Vector index？

**Pe：** Session sandbox **不建 index DB**——像 Claude Code，**glob/grep**；企业知识库 / 长期 memory 才需要 **external vector index**。**Knowledge** 功能：用户 **explicit confirm** 才写入（如「交付要 Excel」）；也在探索 **用户 correction 的 collective feedback**（如 CJK 字体问题）做 parameter-free 自改进。

**Lance：** 开源模型？

**Pe：** Manus 规模下 **KV cache + 全球 distributed infra**，frontier API **有时比自托管开源更便宜**。Task-level / step-level **model routing**——coding 用 Claude，multimodal 用 Gemini，math 用 OpenAI；**Anthropic input caching** 等 provider 特性要算进账。

**Lance：** 工具数量上限？

**Pe：** Rule of thumb：**原生 function 不超过 ~30**；Manus general agent 只暴露 **~10–20 atomic functions**，其余 **shell + 图灵完备**——computer + shell + editor **理论上够 junior intern 能做的事**。

> **金句 · Pe**
> **中文：** 最大进步来自简化，不是加层。
> **原文：** The biggest leaps didn't come from adding fancy context management — they came from simplifying.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 上下文过度工程 | context over-engineering | 层太多反而让模型更难 |
| 弱强模型切换评估 | weak/strong model switch eval | 测 architecture 未来寿命 |
| 显式记忆 | explicit knowledge | 用户确认才写入的 Manus Knowledge |
| 任务级路由 | task-level routing | 按子任务选不同 frontier 模型 |

**本章小结**

- 删脚手架 > 加 clever hack；模型越强越要敢 simplify
- Weak/strong 切换 eval 预测 architecture 是否需要改
- Atomic functions 少而精；复杂能力走 sandbox / code

---

## 总结

| 维度 | 要点 |
|------|------|
| 边界 | Context engineering = application vs model  Practical 分界线 |
| Reduce | **Compaction 先于 summarization**；summarize 用 schema |
| Isolate | Communicate（短任务）vs share-memory（deep research） |
| Offload | 文件系统 + **三层 action space** 卸载 MCP 膨胀 |
| 反模式 | Over-engineering；最大 gain 来自 **简化** |
| Eval | 固定架构切换 weak/strong model 测 future-proof |

> **金句 · Pe（封底）**
> **中文：** 让模型干得更简单，不是更难——敢 simplify。
> **原文：** The goal of context engineering is to make the model's job simple — not harder.

---

## 概念索引

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| context_rot | 上下文腐烂 | context rot | 越长越差 |
| compaction | 可逆压缩 | compaction | path 留、内容可重建 |
| share_memory | 共享上下文 | share-memory subagent | 全 history 给子 agent |
| action_space | 三层动作空间 | layered action space | function → CLI → API |

---

## 附录

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV12x1xB8E7b/ingest`
- **ASR 主源**：`Recastory/workspace/bilibili-retranscribe/BV12x1xB8E7b/article.md`（FunASR v2 · 49 段 · Speaker1=Lance / Speaker2=Pe）
- **video_description**：`{ingest}/video_description.md`（导读较薄，无专栏链）
- **B 站**：[BV12x1xB8E7b](https://www.bilibili.com/video/BV12x1xB8E7b/)
- **参考**：Manus context engineering 博客（2025-07）；Lance 幻灯片（webinar 共享）
- **时长**：60:48

### 相关阅读

- [[OpenAI员工-上下文工程和Agent记忆]] — OpenAI trim/compact/summarize 框架  
- [[Agent实战-打造一个AI Agent的完整教程]] — agents.md、MCP、Skills 入门栈  
- [[WorkOS-创建和使用Skills方法论]] — Skills 与 context 分工  
- [[IBM团队-Harness工程详解]] — harness 与 context 并列  
- [[DeepMind-模型将吞噬Harness]] — scaffolding 会否被模型吞掉  
- [[MOC - Harness Engineering]] — Harness / context 横切索引  

### 收录说明

- **讲者**：Lance Martin（LangChain）· Pe（Manus 联合创始人 & 首席科学家）  
- **主源**：英文 ASR v2；无 UP 专栏图稿（A 级 partial）  
- **版本**：canonical Host-Guest v3.2-asr（2026-07-03；原 v3 九段讲义已替换）
