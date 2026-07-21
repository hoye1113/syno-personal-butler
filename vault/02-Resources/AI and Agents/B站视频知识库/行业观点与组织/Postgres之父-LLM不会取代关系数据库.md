---
title: "Postgres之父-LLM不会取代关系数据库"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1rh526BEjY/"
description: "Postgres之父Mike Stonebraker：OLTP不需要花哨优化只管写日志；MapReduce是开倒车；DBOS用数据库重构操作系统；LLM永远做不了数据库的活；万物皆SQL。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Postgres之父-LLM不会取代关系数据库.md"
source_sha256: "b88da148bb53bd7a0fc46189ea0577cfe8969e95ede588c35e8fbc4b86bc310b"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1rh526BEjY/"
column_url: "https://www.bilibili.com/read/cv49158391/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1rh526BEjY/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1rh526BEjY/ingest"
duration: "~45 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Ryan Peterman"
guest_name: "Mike Stonebraker"
guest_title: "Postgres 创造者 / 图灵奖得主"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Easonlee的AI笔记]]"
concepts:
  - id: oltp_write_ahead
    zh: OLTP只管写日志
    en: OLTP just write the log
    one_line: 在OLTP场景下，任何花哨的优化还不如直接写日志等机器更快
  - id: mapreduce_regression
    zh: MapReduce是开倒车
    en: MapReduce is a step backward
    one_line: 70年代就有的连接算法，MapReduce重新发明了一遍还不能做theta连接
  - id: dbos
    zh: DBOS用数据库重构操作系统
    en: DBOS: rearchitecting OS with a database
    one_line: 把操作系统建立在数据库之上，用事务管理一切
  - id: llm_zero_percent
    zh: LLM对数据库的贡献是0%
    en: LLM's contribution to databases is zero percent
    one_line: LLM是通用概率引擎，数据库需要精确正确，两者根本不兼容
  - id: everything_is_sql
    zh: 万物皆SQL
    en: everything is SQL
    one_line: SQL是声明式语言的典范，所有东西最终都会走向SQL化
---

# LLM的贡献是0%——它们是概率引擎，数据库需要的是精确正确

> 对谈：Ryan Peterman × Mike Stonebraker（Postgres 创造者 / 图灵奖得主）| 来源：Ryan Peterman Podcast | 2026

---

## 开场：为什么现在聊这个

Mike Stonebraker 今年79岁，从70年代至今几乎参与了数据库领域的每一次重大变革——Ingres、Postgres、C-Store、H-Store、DBOS。他用一生证明了一件事：学术研究和产业落地之间没有鸿沟，好的论文就应该是论文加代码。

但这期最震撼的论点是：LLM对数据库领域的贡献是零。不是"还没到"，是"永远不可能"。LLM是概率性的通用引擎，而数据库的底线是精确正确。当你让ChatGPT给你一个查询结果，它可能给你正确答案，也可能胡说八道——这两种结果对用户来说没有区别。而数据库绝不允许这种事发生。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| OLTP | online transaction processing | 在线事务处理，处理大量小事务（如银行转账） |
| OLAP | online analytical processing | 在线分析处理，对海量数据做复杂聚合分析 |
| MapReduce | MapReduce | Google 2004年提出的分布式计算框架 |
| DBMS | database management system | 数据库管理系统 |
| 日志 | write-ahead log (WAL) | 先写日志再修改数据，保证崩溃后能恢复 |
| 事务 | transaction | 一组操作要么全部成功，要么全部失败 |
| 声明式 | declarative | 告诉计算机"要什么"而不是"怎么做" |
| 函数依赖 | functional dependency | 数据库理论中描述属性间依赖关系的概念 |

---

## 01 OLTP不需要花哨优化，直接写日志等机器更快

**Ryan：** OLTP领域有什么新鲜事？

**Mike：** OLTP的现状是：没有什么需要优化的。你只需要一个非常快的日志系统，因为OLTP就是一个写日志。每次有人做一个更新，你就把更新写到日志里。如果有人做一个删除，你就把删除写到日志里。如果有人做插入，你就把插入写到日志里。

如果你有一个每秒百万事务的工作负载，你写日志大概每秒100MB。现在的机器有TB级的内存，磁盘速度越来越快，网络也很快。你写日志永远不会超过磁盘的速度，而这个速度在不断提升。

真正需要优化的领域是OLAP。比如有人想分析1亿行的保险数据，找出所有年龄在55到65岁之间、没有心脏病史、住在这个邮编区域的投保人，然后为他们推出一款新产品。这需要连接三张表并应用复杂条件。这里没有简单的扫描，你需要各种连接和过滤。这是性能调优有影响的地方。

OLAP之所以是热点，是因为数据量在疯狂增长，而商业智能、数据挖掘、AI等都建立在OLAP之上。你的数据仓库越大，你的分析越有价值。数据量每翻一倍，你就能发现以前看不到的模式。这推动了OLAP领域的所有创新。

> **金句 · Mike**
> **中文：** OLTP就是写日志，没什么可优化的。你永远不会超过磁盘速度，而磁盘在变快。
> **原文：** OLTP is just writing logs, there's nothing to optimize. You'll never exceed disk speed, and disks are getting faster.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 列式存储 | columnar storage | 按列而非按行存储数据，分析查询快几十倍 |
| 物化视图 | materialized view | 预先算好并存储的查询结果，避免重复计算 |
| 增量维护 | incremental maintenance | 新数据到来时只更新受影响的部分，不重算全部 |
| Theta连接 | theta join | 任意条件的连接操作，不只是等值连接 |

**本章小结**
- OLTP就是写日志，磁盘在变快，花哨优化不如等硬件升级
- OLAP才是需要优化的战场：数据量爆炸、连接条件复杂、分析需求多样
- 列式存储加物化视图加增量维护，是解决大规模分析的核心路径

---

## 02 MapReduce是开倒车：70年代的东西重新发明了一遍

**Ryan：** 回到MapReduce的故事，你当时写了那篇著名的文章说它是倒退。

**Mike：** 确实如此。Jeff Ullman（斯坦福退休教授）曾这样描述MapReduce：它是一个重命名连接（rename join）。70年代以来连接算法有很多种，比如hash join、sort merge join、nested loop join。MapReduce相当于又发明了一个连接算法，但不能做theta join——不能说"A的值大于B的值"这样的条件。

当我和Jeff Dean辩论时，Jeff Dean说MapReduce的目标是容错。在拥有数千台机器的大集群中，机器故障是常态。但问题在于：MapReduce处理容错的方式是把所有中间数据写到磁盘，然后重启任务。这意味着你为了处理1%的故障概率，让100%的查询都付出了写磁盘的代价。这就像为了防止下雨，让每个人都24小时打伞。

而且现在有了虚拟内存，你根本不需要担心某台机器崩溃。把数据保存在内存里，换一台机器就能继续处理。MapReduce的问题在于它不支持交互式查询——一个查询跑完要20分钟，你根本没法做数据分析。

真正的进步来自Vertica和ParAccel这样的列式数据库。它们在商业智能场景下比MapReduce快100倍。后来的Spark也是很好的系统，它把MapReduce中好的部分拿过来，去掉写磁盘的部分，变成了一个内存系统。

> **金句 · Mike**
> **中文：** 为了处理1%的故障概率，让100%的查询都付出写磁盘的代价——这不是优化，这是开倒车。
> **原文：** To handle a 1% failure probability, you make 100% of queries pay the cost of writing to disk — that's not optimization, that's a step backward.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| hash join | hash join | 把一张表建哈希表，另一张表逐行探测，最常用的连接算法之一 |
| sort merge join | sort merge join | 两张表分别排序后合并，适合大数据集 |
| 列式数据库 | columnar database | 按列存储数据，分析查询时只读需要的列，快几十倍 |
| 商业智能 | business intelligence (BI) | 对企业数据做分析和可视化，辅助决策 |

**本章小结**
- MapReduce本质上是一个退步的连接算法，不支持theta join，不能做交互式查询
- 为了处理1%的故障让100%的查询写磁盘，是糟糕的设计权衡
- Vertica、ParAccel、Spark等后续系统才代表了真正的进步

---

## 03 DBOS：用数据库重构整个操作系统

**Ryan：** 你最近在做的DBOS项目是什么？

**Mike：** 这是目前我做的最疯狂的事情。DBOS是完全不同的东西。操作系统是所有程序运行的基础，但现代操作系统有很多问题：每个程序有自己的用户认证、日志、监控、存储管理，导致大量重复代码。2021年Log4j漏洞影响了无数系统，根源就是每个应用都在自己处理安全。

DBOS的核心理念是：既然操作系统最重要的功能是为程序提供服务，那就把操作系统建立在数据库之上。具体来说，用PostgreSQL作为内核，管理所有程序的认证、授权、日志、状态、监控。

传统操作系统用文件系统存储日志和状态，每个程序自己解析日志——这极其低效。DBOS用数据库存储一切，每个程序只是一条SQL查询。你问"上个月哪个应用最活跃"，就是一条SQL。你想把日志保留时间从30天改成60天，就是一条SQL。你想看哪些应用正在被积极维护，也是一条SQL。

目前DBOS已经开源，任何人都能用它来构建无服务器应用。它在某些场景下性能提升了70倍，内存消耗减少了200倍。因为所有状态都由操作系统管理，你写的代码少了10到20倍，而且这些代码可以跨应用复用。代码少意味着Bug少，意味着更安全。

> **金句 · Mike**
> **中文：** 每个应用自己管安全、日志、监控——Log4j漏洞的根源就是这种碎片化。DBOS把一切统一到数据库里。
> **原文：** Every app managing its own security, logging, monitoring — the Log4j root cause was this fragmentation. DBOS unifies everything into a database.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 无服务器 | serverless | 开发者不需要管服务器，代码按需运行按需付费 |
| 微内核 | microkernel | 只保留最核心功能的内核，其他功能移到用户空间 |
| 事务性工作流 | transactional workflow | 一系列操作作为原子单元执行，全部成功或全部回滚 |
| 代码生成 | code generation | 让LLM根据描述自动生成应用代码 |

**本章小结**
- DBOS把操作系统建立在数据库之上，统一管理认证、日志、监控、状态
- 每个应用只是一条SQL，代码量减少10-20倍，性能提升最高70倍
- 所有状态在数据库里，天然支持事务一致性、容错、弹性

---

## 04 LLM对数据库的贡献是0%——概率引擎无法保证精确正确

**Ryan：** LLM和数据库之间有什么交集？

**Mike：** 目前没有。我不认为LLM对数据库领域有任何贡献。这是一个概率引擎——你问它一个问题，它给你一个答案。它可能正确，也可能不正确，而用户无法区分。但在数据库中你不能这样做，你需要确切知道谁在什么时候做了什么修改。

我的学生做了一个实验：让ChatGPT对30个基准查询生成SQL，准确率只有40%。我们之前做过一项研究，让AI生成100个不同领域和难度的查询，平均准确率是36%。ChatGPT的40%已经算不错的了。

如果我是CFO，想要查询季度销售数据，我需要100%的准确率。ChatGPT给我50个正确结果和25个错误结果，我根本不知道哪些是错的。这对企业决策是灾难性的。

LLM在自然语言理解方面很强，但它无法理解数据模型的语义——比如外键的含义、数据类型约束、业务规则。这些结构化信息只有数据库元数据里有，LLM的训练数据里根本没有。更糟的是，LLM一旦犯错，你完全无法诊断它为什么犯错——它是概率性的，没有任何解释能力。但数据库的查询计划是可审计的，你可以打开看每一步做了什么。

> **金句 · Mike**
> **中文：** LLM是概率引擎，数据库需要精确正确。两者根本不兼容。
> **原文：** LLMs are probabilistic engines, databases need exact correctness. They're fundamentally incompatible.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 数据模型 | data schema | 数据库中表、列、关系的结构定义 |
| 元数据 | metadata | 描述数据本身的数据，如表结构、约束、权限 |
| 查询计划 | query plan | 数据库执行查询的具体步骤，可审计可优化 |
| 业务规则 | business rules | 公司特定的逻辑，如"VIP客户免运费" |

**本章小结**
- LLM是概率引擎，数据库需要精确正确——根本性不兼容
- AI生成SQL平均准确率仅36%，企业决策需要100%
- 数据库有数据模型和元数据，LLM的训练数据里根本没有这些语义信息

---

## 05 万物皆SQL：声明式语言的终极胜利

**Ryan：** 你相信"万物皆SQL"吗？

**Mike：** 是的。SQL是声明式的——你描述想要什么，不描述怎么做。SQL的优化器会自动找出最优执行方式。而MapReduce是命令式的，你得告诉它每一步怎么做。

声明式的威力在于它和硬件解耦。你今天在一台机器上跑，明天硬件变了，你不需要改代码——优化器会自动适应。但MapReduce不行，你必须重写代码。

SQL的另一个巨大优势是优化器。你描述要什么，优化器根据统计信息和代价模型，自动选择最佳执行计划。你写一条SQL，连接三张表，优化器会决定先连哪两张、用什么连接算法、怎么利用索引。人类很难做出比优化器更好的决定。

更关键的是：SQL是数据的语言，而数据是所有现代应用的核心。不管你是做网页、做手机应用、做AI还是做科学计算，你最终都要处理数据。数据处理的最佳语言是SQL，因为它声明式、可优化、可复用。

> **金句 · Mike**
> **中文：** SQL是声明式的——你描述要什么，优化器自动找出最佳方式。这就是它赢的原因。
> **原文：** SQL is declarative — you describe what you want, and the optimizer automatically finds the best way. That's why it wins.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 声明式语言 | declarative language | 只描述"要什么"，不描述"怎么做" |
| 命令式语言 | imperative language | 必须逐步告诉计算机"怎么做" |
| 优化器 | query optimizer | 自动选择最佳查询执行计划的组件 |
| 索引 | index | 加速数据查找的数据结构 |

**本章小结**
- SQL的胜利在于声明式：你描述要什么，优化器自动找出最佳执行方式
- 声明式与硬件解耦——换机器不用改代码，优化器自动适应
- 万物皆SQL因为数据是所有应用的核心，而SQL是处理数据的最佳语言

---

## 总结：数据库领域50年，"研究"和"产品"之间没有鸿沟

| 维度 | 要点 |
|------|------|
| OLTP现状 | 就是写日志，磁盘在变快，花哨优化不如等硬件 |
| MapReduce | 70年代连接算法重新发明了一遍，不支持theta join，不能交互式查询 |
| DBOS | 用数据库重构操作系统，每个应用只是一条SQL |
| LLM局限 | 概率引擎无法保证精确正确，生成SQL准确率仅36% |
| SQL胜利 | 声明式语言与硬件解耦，优化器自动找最佳路径 |
| 研究方法 | 写论文必须同时写代码，真实数据集验证是唯一标准 |

> **金句 · Mike（封底）**
> **中文：** 好的数据库研究不是在真实世界做研究，而是为真实世界做研究——数据集必须公开，代码必须可用，可复现性是唯一标准。
> **原文：** Good database research isn't doing research in the real world — it's doing research for the real world. Datasets must be public, code must be available, reproducibility is the only standard.

---

## 附录

**章节时间戳**
- 00:00 开场
- 02:30 OLTP现状：写日志等机器更快
- 18:12 MapReduce的历史评价与争议
- 31:30 DBOS项目：用数据库重构操作系统
- 50:00 LLM对数据库的贡献是0%
- 62:45 "万物皆SQL"——声明式语言的终极胜利

**Ingest 信息**
- column_source: Recastory/workspace/bilibili-retranscribe/BV1rh526BEjY/ingest/column_article.md
- asr_status: asr_ready

**相关阅读**
- [[MOC - Agent Theory and Design]] — 入口
- [[MOC - Harness Engineering]] — 数据库与工程实践
