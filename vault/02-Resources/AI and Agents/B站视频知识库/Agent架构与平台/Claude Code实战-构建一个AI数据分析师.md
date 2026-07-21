---
title: "Claude Code实战：构建一个AI数据分析师"
tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "claude", "mcp", "context_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "claude", "mcp", "context_engineering"]
created: "2026-06-09"
source: "B站视频 - Easonlee的AI笔记"
description: "Brex 数据主管演示用 Claude Code + Snowflake MCP 复刻数据分析师四步循环（监控-调查-故事-影响），强调查询结果 token 爆炸、窄语义层与 data analysis Skills 护栏。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code实战-构建一个AI数据分析师.md"
source_sha256: "26fd86c76451d91980aa78bde07a3adb8ecfef1c311e6e519886dcee6d13b814"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1Mpf9B5Egk/"
speaker: "Sumeet（Brex 数据主管）/ Peter（主持人）"
duration: 51:46
saved: 2026-07-02
updated: 2026-07-03
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1Mpf9B5Egk/ingest"
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1Mpf9B5Egk/article.md"
curate_method: "vskill-vault-curate v3-ingest（讲义 v3）"
spot_check: 2026-07-02
asr_version: v2
---

# Claude Code 实战：构建一个 AI 数据分析师

## 先搞懂这一期

**这是什么节目？**  
**Brex** 数据主管 **Sumeet** 的 **~52 分钟实操对谈 + 现场 demo**。不是 SQL 教程，是用 **Claude Code 搭「像数据科学家一样想问题」的 Agent**——含 Snowflake MCP 从零生成、公开融资数据集问答、Brex 真实支出 benchmark 解读。

**这期在回答哪三个问题？**

1. **AI 能帮数据分析师干什么，不能干什么？** 监控、调查、讲故事、推动实验，哪几步已可用？  
2. **为什么数据分析 Agent 要单独做 MCP，还要管 context？** 和「写代码的 Claude」有何不同？  
3. **PM 自助查数会不会干掉数据岗？** Brex 内部实际发生了什么？

**用一条线串起来：**

八个月前 AI 只会 debug SQL，现在能写 **boilerplate + 进阶分析**；客户支出已选出 **Cursor 是 coding tool 首选**。  
**分析师四循环**：① **监控**已有 dashboard / query；② **调查**异常（下钻客户 / 交易 + Slack / Linear）；③ **故事化**给业务（需人教「好故事」）；④ **影响**——改按钮、跑实验、再循环（端到端尚未完全自动）。  
**Demo 主线**：公开 **startup funding** 数据集 → 从 Snowflake query history / dashboard **反推 3 条种子 SQL** → planning mode 生成 **Startup Funding MCP**（query tool + analyze tool + eval + token 护栏）→ 问「谁最可能 Series B」「哪个 AI coding tool momentum 最高」→ Cursor 排第一。  
**坑**：一条 query 可 **200 万行炸 context**；8 种客户分段全给会 **每次选不同字段**；用 **data analysis Skill**（limit 50、timeout 2–3 分钟、join 披露）。  
**起步三板斧**：挑 core queries、写 domain context、接到 Claude Code 或 Hex 等 BI。

---

## 背景：这期在 AI Agent 大图里的位置

| 你可能已有的认识 | 这期补上的那一块 |
|----------------|-----------------|
| Claude Code = 写应用代码 | **数据域 MCP + Skills** = 分析师 harness |
| RAG / BI 自带 AI | 仍要 **人定 queries 与语义层**；AI 不会凭空懂表结构 |
| 上下文工程 = prompt 技巧 | 数据分析特有：**结果集 token 爆炸**、窄 segmentation |
| MCP 连数据库即可 | 要 **从 Snowflake 历史 query / dashboard 反推** 种子 SQL |

---

## 分话题讲

### 1. 数据分析师四步循环：AI 能接哪几棒

| 阶段 | Agent 能力 | 人的角色 |
|------|-----------|----------|
| **监控** | 代跑 query、读 trend、摘要 dashboard | 定监控什么 |
| **调查** | 下钻 + Slack / Linear 等 **外部上下文** | 定 investigation 方向 |
| **故事化** | 侧向深挖、补 Google Doc 评论里的洞 | **教什么是好故事** |
| **影响** | 查 codebase 历史实验、估 impact | 批准改产品 / 跑实验 |

**现场说法（~01:32–04:23）：**  
多数分析师不是从零建数，而是 **已有 4–5 个 dashboard + 一批在跑 query**。Claude 第一步就是 **替你跑这些 query、读趋势、判断要不要调查**。LLM 能自己 interpret 趋势，比人手动扫每个 cell 省时间——Brex 内部很多人先从这里搭 **monitoring agent**。  
看到异常后，Claude 会 **下钻到 customer / transaction 层**，同时拉 **Slack thread、Linear ticket** 补上下文——这才是数据人日常。  
故事化阶段需要你用 prompt **定义「好故事」长什么样**；Craft 过程中发现缺口，可让 Claude 快速补 Google Doc 里的 comment 对应分析。  
影响阶段（改按钮、跑实验、再监控）Sumeet **还没见过 Claude 端到端跑通**，但各步已在被 augment。

**PM 自助的真实形态（~05:31）：**  
Bx PM 把现有 dashboard 的 **全部 query 扔进 Claude Code，每天 / 每周自动跑**。数据人被「cut out」，但 PM **问题更好**，数据人终于有时间做更深分析。

**和你何干：**  
别指望一个 prompt 端到端；**先自动化最烦的监控与 boilerplate SQL**。

---

### 2. 周报 vs Dashboard：为什么「有人读」 matters

**说法（~05:58–08:07）：**  
传统周一邮件 / charts：有人扫一眼，有人 ignore。Claude 版两点更强：

1. **按职能定制**——只看某产品线用户、某角色关心的 metric。  
2. **「Claude 总会读、总会提 follow-up 问题」**——甚至尝试 **自己答** 那些问题。

Sumeet 设过很多 dashboard，**职业生涯里它们最终都会被 ignore**；Claude 至少保证「有人读」。

**跨源案例：**  
weekly review 里 metric 异常，Claude 去 **Slack 搜到 data incident**——pipeline 坏了，不是客户流失。省掉周一早上 panic + 逐个客户排查。

**和你何干：**  
Agent 监控的价值 = **interpretation + 跨源关联**，不是多一张静态图。

---

### 3. 为什么用 MCP：Rails 给所有人同一起点

**第一性原理（~13:34–14:30）：**  
没有 MCP：每人扔 ad-hoc SQL，**没有数据团队文档化的 join 模式**。  
MCP = **结构化、可重复** 地连 Snowflake，让 PM / 工程师 **从同一套 rails 起跑**，再偏离。

**Demo 数据集（~08:54）：**  
选 **startup funding rounds** 公开集—— mimics Brex 交易数据（VC → startup 资金流）。

**三条种子 query（~09:58–11:50，从 Snowflake history 反推，非手搓）：**

| # | 内容 | 教学目的 |
|---|------|----------|
| Q1 | **Monthly startup funding trends by industry and stage** | 教 plot code、典型 join（domain name）、表文档 |
| Q2 | **Top investors ranking** + 近年投资频率 | 展示第二表、join 模式、关键字段 |
| Q3 | **Startup ecosystem health score / funding velocity** | 稍复杂分析型 query，作 MCP 起点 |

表结构要点：`funding_rounds` + `startups` 两表；`Series_A` 等命名规范要写进文档。

**反推流程：**  
在 Snowflake instance 里 **搜这些表正在被跑什么 query** → 从 dashboard / query history **scrape** → 再让 Claude **document** 那些生产里没人写的注释。

**生成 MCP 的 prompt 要素（~11:50–13:34，现场口述拼写）：**

```
Create a Startup Funding MCP.
Don't use the existing one — use these queries.
Do some research online about how to set up MCP.
Dataset overview: funding rounds for startups, investors, transaction details.
Why we care: understand what funding rounds are happening — helps engage customers who just raised.
Use cases: weekly recurring reporting, deep dive analysis, monitor trends within startups.
Create 3 eval questions to test.
→ 进入 planning mode
```

Planning mode 会反问：四条 query 还是三条？本地还是 production？要不要 alerting？Sumeet 选 **locally、skip alerting**——「unanswered questions 回来反而更放心 plan 靠谱」。

**Snowflake 连接（~15:53）：**  
`snowflake CLI` + **PAT token** 写入 env，Claude 才能查表、验证 MCP。

**和你何干：**  
数据 MCP 的第一性原理：**capabilities（能问什么）**，不是自然语言问题列表。

---

### 4. 数据分析 Agent 特有问题：Context 管理

| 问题 | 原因 | 对策 |
|------|------|------|
| **Token 爆炸** | 一条 query 1 万～**200 万行**进 context | 指令写 **LIMIT**、分步分析 |
| **limit 幻觉** | 上条 query 带 limit，Agent 当全表 | **提醒「上条有 limit ≠ 全表」** |
| **分段混淆** | 8 种 customer segmentation 全给 | **Tight semantic context**：一次只暴露一种 |
| **字段歧义** | 列名 / doc 不清；同义不同名 | 显式命名、**synonym**、表文档 |
| **只有数没有事** | 缺 Slack / Jira 等 | 接 **Glean MCP**；**每个连接建 subagent** |

**和写代码 Claude 的差异（~17:24）：**  
navigate codebase / 写 doc 很少一步炸窗；**数据分析第一步就可能返回百万行**。在 MCP instructions 里写清 token 管理 + limit 提醒，才能 unlock **chain of analysis**。

**窄语义层（~18:31–20:17）：**  
Brex core data 有 **8 种客户分段**；全给则 **每次 run 随机选一种**。`tight semantic context` = 语义层只暴露 **一种 segmentation + 字段定义 + use case**。多 domain（card、banking…）时更要收紧，否则 exploration 跑偏。

**表文档新用途（~20:38）：**  
列名 Agent 会直接 match；**documentation + synonym**（motion vs grouping）帮 NL query 选对字段；但 **两个都叫 grouping 就会乱**。

**Glean MCP + subagent（~22:52）：**  
Slack / Drive 经 **Glean MCP** 接入 Claude Code。Sumeet 建议 **每个连接建 subagent**，否则 Claude 不知道何时该调 Glean Slack——有 subagent 后「去 project channel 看新 feature 进展，写监控 dashboard query」做得很好。

**和你何干：**  
写 doc / navigate codebase 的 Claude 套路 **不能直接 copy** 到 analytics。

---

### 5. Live Demo：MCP 产物、Series B 与 Cursor momentum

**MCP 建好后暴露的工具（~23:50–24:52）：**

| 工具 | 作用 |
|------|------|
| **query** | 表 → SQL，**最常用** |
| **analyze startup trends** | 分析型 tool，定义 **分析序列 rails** |
| （context 护栏） | 防炸窗、每步分析结束 **report token 表现** |

**问法一：Series B 预测（~24:52–27:05）**

```
Which recent Series A companies are most likely to get Series B?
```

Claude 先列最近 Series A（例：Glu AI $20M、Pal Surgical $10M），再 **rank + 解释 rationale**。判断依据：

- **行业历史转化率**：healthcare Series A → Series B **61%**，AI **73%**  
- **median funding size** 通向 Series B 约 **$20M** → Glu AI 排第一  
- 医疗「周期长」有数据支撑，非纯 hallucination

数据集回溯到 **2016+**（曾含 Amazon funding 噪声，已清洗）。

**问法二：AI coding tool momentum（~27:05–30:30）**

```
Which AI coding tool has the most momentum? Use the data. Explain why.
```

基于三条种子 query 的 rails，结果：

| 排名 | 工具 | 信号 |
|------|------|------|
| 1 | **Cursor** | 大额 Series A、A16Z、客户支出已验证（估值 ASR 里 400M 滞后，实际更高） |
| 2 | Replit | — |
| 3 | Codeium / Windsurf / Cognition | 数据集局限：改名、被收购会 **丢 thread** |

**PM 可用性（~29:22）：**  
Bx 数据 MCP：**author Snowflake connection → 问数据问题 → 写 query + 出结果**；也可自建 agent **按同样 query 跑 recurring dashboard**。

**和你何干：**  
**三条种子 query** 决定 MCP 上限——从 **生产 query history** 挑，带 join + 一点分析，质量 > 数量。

---

### 6. 护栏：Skills 防 PM 拖垮库

**恐惧（~30:57）：**  
PM random query **打挂库** + **token 成本失控**。

**data analysis Skill 内容（~31:07–33:46）：**

| 护栏 | 具体做法 |
|------|----------|
| **行数限制** | join 类 query 强制 **LIMIT 50** |
| **超时** | 2–3 分钟未完成 → **kill + rewrite** |
| **join 披露** | 标出 **leaps**（跨表跳跃），方便数据人 review productionize |
| **计算叙事链** | **computational story mapping**——SQL 当叙事链，非孤立查询 |
| **导出** | CSV export skill，搬数据少折腾 |
| **分析模板** | cohort analysis 等常见类型封装 |

PM 用 Skill → 数据人 review **join leaps** 再上线。

**和你何干：**  
Self-serve analytics = **MCP + Skills 护栏 + 数据人可见的 join 披露**，不是裸 Claude。

---

### 7. Brex 支出 benchmark：真实采用 > 融资 hype

**公开数据（~33:46–38:46，Brex Blog 月度 benchmark）：**

| 观察 | 细节 |
|------|------|
| **Cursor** | startup + enterprise **双杀**，数月 top；pace toward 大额融资轮 |
| **ElevenLabs** | 语音附加 **首选**（客服、voice assistant 嵌入产品） |
| **OpenAI vs Anthropic** | enterprise ChatGPT Pro 渗透强；**startup 产品内嵌 agent 多选 Claude** |
| **Rep** | 曾跌出榜单，靠新 agent 能力重回 top 10 |
| **2024 年 6 月 launch 的 startup** | 某些垂直 agent workflow **log 级增长** |

Sumeet：**实际 spend 比 A 轮数字更能讲清市场故事**。

---

### 8. 入门三步（TL;DR）

**说法（~40:09–41:32）：**

1. 定 domain，挑 **2–3 条真实在用的 core queries**（含 join + 一条稍复杂分析）。  
2. 写 **context**：表含义、为何 business care、common joins、分析组件。  
3. 进 **Claude Code MCP**，或 **同一套 context 灌进 Hex 等 BI**——AI BI 也不会替你做这步。

**capabilities vs questions：**  
三条 query 不是「三个固定问题」，而是 **三种能力**——懂怎么 join、懂 top rounds vs top VCs 怎么桥接；Agent 自己填 gap。

**和你何干：**  
数据团队新 scope：**semantic layer for agents**，和给人看的 dashboard 同等重要。

---

## 关键概念（读完应能解释）

| 中文 | 英文 | 白话 |
|------|------|------|
| 监控代理 | Monitoring agent | 替你把 dashboard 里的 query 跑一遍，看趋势有没有异常 |
| 融资域 MCP | Startup Funding MCP | Demo 里连 Snowflake 的融资数据工具包 |
| 窄语义层 | Tight semantic context | 一次只给 Agent 一种客户分段，别八种全塞 |
| 种子查询 | Seed queries | 从生产 query history 挑出的 MCP 模板 SQL |
| 数据分析技能 | Data analysis Skill | limit / timeout / join 披露的护栏技能包 |
| 企业检索 MCP | Glean MCP | 企业内 Slack / Drive 统一检索接 Claude |
| 计算叙事链 | Computational story mapping | 把 SQL 步骤当叙事链，非孤立查询 |
| 自助分析 | Self-serve analytics | PM 用 MCP + Skill 查数，数据人审 productionize |
| Planning mode | Planning mode | 生成 MCP 前先澄清部署、alerting、query 范围 |
| PAT token | Snowflake PAT | Claude 经 CLI 访问 Snowflake 的凭证 |

---

## 值得记住的原话

> **"Recreating the way a data scientist actually thinks… not just the data, all the things outside of that."**  
> 复刻数据科学家怎么想——不只有数，还有数外面的东西。

> **"Claude will always read it. Claude will always start to ask questions."**  
> Claude 总会读周报，总会往下追问。

> **"One query might return 2 million rows… blowing up your entire context window."**  
> 一条查询两百万行，整个 context 窗会炸。

> **"If you start to give it all eight segmentations, Claude gets confused."**  
> 八种分段全塞进去，Claude 会乱选。

> **"Those three or four queries… really important… reuse them each time."**  
> 那三四条 query 才是核心——每次都在复用这些模式。

> **"Customers on our platform have already picked it — definitely Cursor."**  
> 我们客户真实支出已经选了——就是 Cursor。

> **"Put a limit 50 on any of those types of joins… queries taking longer than two to three minutes, try to rewrite them."**  
> join 限 50 行；超 2–3 分钟 kill 重写。

---

## 小结

**这期最核心的判断：** Claude Code 做数据分析，harness 核心是 **MCP rails + 窄语义 context + 结果集 token 管理 + Skills 护栏**；Agent 价值在 **监控解读 + Slack 等外源**，不是替代数据科学家讲故事与定实验。

**要点：**
- 四循环里 **监控 / 调查** 最先自动化；故事与实验仍要人。  
- MCP 从 **Snowflake query history** 反推 3 条种子 SQL，planning mode + eval 问题。  
- Live demo：Series B 用 **61% vs 73%** 行业转化率；momentum 问法 Cursor #1。  
- **Skills**：limit 50、timeout 2–3min、join 披露、computational story mapping。  
- Brex spend benchmark：**实际支出 > 融资数字**。

**和 vault 的关系：** Claude Code 实战 + 上下文工程交叉，接 [[OpenAI员工-上下文工程和Agent记忆]]、[[Databricks-企业级Agent生产实践]]。

---

## 行动启示

1. **Scrape 3 条生产 query** 作 MCP 种子（含 join + 一条 velocity / cohort 类分析），别让 Agent 发明没人用的 join。  
2. **Snowflake CLI + PAT** 配好，MCP instructions 写清：大结果集先 LIMIT、注明「带 limit 的结果 ≠ 全表」。  
3. **Planning mode 生成 MCP**，附 3 条 domain eval 问题。  
4. **一次一种 segmentation** 暴露给 Agent；表文档写 synonym，避免两字段同名。  
5. **Glean MCP + 每连接一个 subagent**，调查阶段才像真人分析师。  
6. **Publish data analysis Skill** 给 PM：limit 50、timeout 2–3min、join 说明模板、CSV export。  
7. 同一套 semantic context **同步灌进 Hex 等 BI**，别只锁在 Claude Code。

---

## 相关阅读

- [[OpenAI员工-上下文工程和Agent记忆]] — trim / compact / summarize 与长期记忆模式  
- [[Manus创始人-深度干货-上下文工程的最佳实践]] — Context Engineering 另一视角  
- [[Claude Code负责人-AI原生团队如何使用AI]] — Anthropic 内部 Agent 工作流  
- [[Databricks-企业级Agent生产实践]] — 企业级 Agent 生产  
- [[MOC - Agent Theory and Design]] — Agent 理论横切索引  

---

## 来源

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1Mpf9B5Egk/ingest`
- **video_description**：`{ingest}/video_description.md`
- **视频**：[BV1Mpf9B5Egk](https://www.bilibili.com/video/BV1Mpf9B5Egk/)（B 站 *Easonlee的AI笔记*）  
- **讲者**：Sumeet（Brex 数据主管，Claude Code 团队推荐）  
- **时长**：~51:46  
- **转写**：Recastory `bilibili-retranscribe/BV1Mpf9B5Egk/`（FunASR SenseVoice + cam++，**asr v2** 57 段）  
- **公开数据**：Brex Blog 月度 AI 支出 benchmark（视频中提及）  
- **版本**：v3 读者向讲义加深（2026-07-03）
