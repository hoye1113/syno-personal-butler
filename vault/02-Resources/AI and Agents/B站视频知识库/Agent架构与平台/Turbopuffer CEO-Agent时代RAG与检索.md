---
title: "Turbopuffer CEO：Agent 时代 RAG 与检索仍然重要"
tags: ["ai_agent", "video_transcript", "bilibili", "context_engineering", "memory"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "context_engineering", "memory"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Simon Eskildsen × Latent Space：S3 强一致 + NVMe 分层架构、Cursor 搜索成本降 95%、Agent 高并发查询、P99 工程师标准与全文搜索回归。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Turbopuffer CEO-Agent时代RAG与检索.md"
source_sha256: "e2a3474d9512c1d1b1f7628145a3f834d1d0dff1907e4adca832b6d9be91ac1d"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1mDDzBEEWH/"
duration: "60:32"
saved: 2026-07-06
updated: 2026-07-06
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1mDDzBEEWH/ingest"
column_url: "https://www.bilibili.com/read/cv47594186/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1mDDzBEEWH/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Alessio / Swix"
guest_name: "Simon Eskildsen"
guest_title: "Turbopuffer 创始人 · 前 Shopify 首席工程师"
speaker_inference: "column_article S-tier · Latent Space / Kernel Studio"
speaker_confidence: high
author:
  - "[[Simon Eskildsen]]"
concepts:
  - id: s3_strong_consistency
    zh: S3 强一致性
    en: S3 strong consistency
    one_line: 2020 年 12 月起 S3 读写一致，可省 Zookeeper 共识层
  - id: compare_and_swap
    zh: 比较并交换
    en: compare-and-swap (CAS)
    one_line: S3 元数据原子更新原语，实现无状态数据库
  - id: p99_engineer
    zh: P99 工程师
    en: P99 engineer
    one_line: 让软件逼近硬件第一性原理极限的顶尖工程师
---

# Turbopuffer CEO：Agent 时代 RAG 与检索仍然重要

**Host：** Alessio（Kernelads 创始人）· Swix（*Latent Space* 编辑）  
**Guest：** Simon Eskildsen（Turbopuffer 创始人 · 前 Shopify 十年基础设施）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV1mDDzBEEWH](https://www.bilibili.com/video/BV1mDDzBEEWH/) · **时长** ~61 min · **专栏** [cv47594186](https://www.bilibili.com/read/cv47594186/)

---

## 开场

Turbopuffer 帮 Cursor 把搜索成本 **砍掉 95%**，Notion 也在用。Simon 在 Shopify 十年扛 Elasticsearch——卡戴珊促销每秒 **100 万请求** 那种规模——离开后从 Readwise 一个推荐引擎的 **$5k→$30k/月** 账单里看见缺口：向量搜索贵到 Bootstrapped 公司用不起。

这期五章：**伟大数据库公司的三个条件** → **S3 强一致 + CAS 无状态架构** → **Cursor/Notion 案例与 Agent 并发查询** → **P99 工程师与融资坦诚** → **全文搜索回归与千亿向量规模**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 全文搜索 | full-text search (FTS) | 关键词/前缀匹配，Command+K 那类 |
| 向量搜索 | vector search | 嵌入相似度检索，语义搜 |
| 对象存储 | object storage | S3/GCS 放冷数据，按 TB 月付 |
| 比较并交换 | compare-and-swap (CAS) | 读-改-写，版本未变才成功 |
| 往返次数 | round-trip (RTT) | 一次网络来回；越少越快 |
| 分层膨胀 | tiered inflation | 冷数据在 S3，热数据吹到 NVMe/DRAM |
| P99 工程师 | P99 engineer | 顶尖 1% 性能工程师，逼近硬件极限 |
| 检索增强生成 | RAG | 搜外部知识喂给 LLM |

---

## 01 伟大数据库公司：新工作负载 + 存储代际 + 查询进化

**Swix：** Elasticsearch 不是做过搜索了吗？Turbopuffer 到底算向量库还是搜索引擎？

**Simon Eskildsen：** Turbopuffer **现在是搜索引擎**——全文 + 向量，别的 OLAP 先别来。我另一种讲法：模型权重能压缩「怎么理解世界」，但 **没法把全部知识压进几 TB**；你得用 **完整保真度** 连到外部数据。我们要当 **非结构化数据的搜索引擎**——听起来狂，但这是焦点。

想建 **很大的数据库公司**，条件大概 **15 年出一次**：

**第一，新工作负载。** 雄心是：地球上每家公司都会在你库里存数据多次。Oracle 时代如此，Snowflake/Databricks 也是。现在这一刻：**所有公司数据都要连上 AI 做搜索**——直接或间接。

**第二，底层存储架构换代。** Snowflake 吃到了 **商品化 HDD 集群**；90 年代没有 S3，建不了。今天能做的是 **全面 NVMe SSD**——架构特殊，老库很难改。还有 **更彻底用对象存储**：我们 **关掉所有服务器也不丢数据**，完全靠对象存储，架构极简。

**第三，随时间实现几乎所有查询计划。** 用户数据进库后，会问越来越多类型的问题——不能永远只做一件事，得 **从搜索演进到全能 OLAP**。就这三条。

> **金句 · Simon Eskildsen**
> **中文：** 未来几年，找不到一家公司不直接或间接把所有数据用于搜索并连上 AI。
> **原文：** You won't find a company that doesn't use all their data for search connected to AI.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 工作负载 | workload | 数据库要扛的读写/query 形态 |
| 查询计划 | query plan | SQL/搜索/聚合等访问模式 |
| 非结构化数据 | unstructured data | 文档、代码、日志，非行列 DB |

**本章小结**

- 数据库巨头 = 时代级工作负载 × 存储红利 × 查询面持续扩张
- AI 时代工作负载 = **全量企业数据 ↔ 搜索 ↔ Agent**
- Turbopuffer 自定位为 **搜索专精**，非通用 OLAP

---

## 02 从 Readwise 账单到 S3 优先：NVMe 分层与 CAS 共识

**Alessio：** 离开 Shopify 后那个「啊哈时刻」是什么？

**Simon Eskildsen：** Shopify 十年，2013 起跟基础设施——指标 **年复一年翻倍**，卡戴珊轮流开店 **每秒百万请求**，数据中心迁云、分片……最难搞的就是 **Elasticsearch**：倒排索引本该擅长，我们常 **调不出** 想要的行为，Lucene 功能也 **暴露不全**。不是主业，紧急扩容时碰一下。

离开后做「天使工程」——每三个月帮朋友公司，Readwise 是其中之一。ChatGPT 起来时我在调 Postgres Autovacuum，准备发 Reader。我们想做 **推荐引擎**：最近读的文章 embed 全库，效果惊人——给联合创始人推了 **生孩子** 相关文章，我都不知道他们要当爹了。推荐很好，但 Readwise **全栈 infra 月 $5k**，这一个向量功能 **月 $3 万**——Bootstrapped 公司不可能上。归类「有用但太贵」，等成本降。

这事 **缠着我**。我开 GitHub **Napkin Math** 仓库算带宽：DRAM 25GB/s、SSD 写 5GB/s、S3 每连接多少……想：**为什么没人全放对象存储，用时吹到 NVMe，热数据再吹到 DRAM？** 写延迟几百毫秒，但 **第一次查询半秒** 可接受——十年前做不到，现在可以。数据库要 **最少 RTT**：一次 S3 往返发上千请求，最多三次往返决策。没人这么设计。

我在 Napkin 上画：clusters.json + cluster_N.json，**两次往返** 找最近邻——跟 Turbopuffer v1 差不太多。2023 年初向量库 hype 很大，我啥都不懂，就试小模型、微调，然后 **闷头做**。

**S3 强一致** 是转折点：**2020 年 12 月之前 S3 不一致**，得 Zookeeper/FoundationDB 争 keys。2020 年底一致了—— **直接推 S3**，几百人维护，问题外包。**CAS（比较并交换）** 更晚：metadata.json 一百个节点改，下载-改-写，版本没变才成功，失败就重试。GCP 早就有，S3 **2024 年末** 才有——我们押 S3 迟早会有。真实故事不是天才预见：先在 GCS 起步，Shopify 跑 GCP 我熟。

跟 Notion 谈 POC 时很痛苦——他们全在 AWS，我们 GCP，跨云延迟大。我们 **买俄勒冈 AWS↔GCP 暗光纤**，调 TCP 窗口，就为 **少一次 RTT**。Notion 工程师餐巾纸上画过类似架构：「为什么没人做？」AI 改了 **自建 vs 购买**——问题变成 **有没有时间建**。

> **金句 · Simon Eskildsen**
> **中文：** 你可以关掉我们所有服务器，一条数据都不会丢——架构简单到离谱。
> **原文：** You can turn off all of Turbopuffer's servers and we won't lose any data.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 存算分离 | storage-compute separation | 计算无状态，数据在对象存储 |
| 共识层 | consensus layer | Zookeeper 等协调多节点写 |
| 无状态 | stateless | 节点可随时关，不丢数据 |
| 草稿计算 | napkin math | 纸面估算带宽/QPS 上限 |

**本章小结**

- Readwise **$5k vs $30k** 是 Turbopuffer 原点故事
- **S3 2020 一致 + 2024 CAS** 解锁无共识层架构
- 跨云光纤是为 **RTT 预算**，不是炫技

---

## 03 Cursor 降本 95%：Agent 时代搜索是高频工具调用

**Swix：** Cursor 那边到底发生了什么？

**Simon Eskildsen：** 发布第二天，整个夏天我一个人在写——Justine 还没加入，我没告诉任何人，怕 **谈论和做** 混淆。v1 就是 **单机八核 TMUX 里的 Rust 二进制**；升级看日志、Ctrl+C、换二进制——Shopify 传统：**TMUX 跑到看见 PMF**。

Cursor 联创 Arvid 邮件来—— **纯要点**：多少 QPS、付多少、目标啥。Swale 太平洋时间 **凌晨 4 点** 发邮件「方便电话吗？」东岸我 7 点接。Sales 零基础，但 **必须见团队**。旧金山办公室 Postgres **宕机**，我帮聊 Autovacuum——那晚谈合作，我说 **全力以赴**。

一两周内他们 **全迁过来**，成本 **降 95%**， **每用户经济模型** 才成立。我请 Justine——Shopify 最好的工程师，住两个街区——做联创。接下来几个月 **拼命** 确保永不成瓶颈。

Cursor 工作负载：**embed 整个代码库**，自训 embed 模型公开说 **大库 +25%**；Agent 里你能看见 **语义搜索 + grep 混合**。他们对安全设计漂亮：自训 embed 难逆向、路径混淆、客户密钥加密存我们的 bucket。

**RAG 死没死？** 我不写宏观预测，只收 **案例**。Swale 说像 **缓存计算**——某时刻看某块上下文，定神经网络层状态。

**工作负载变了：** 以前 RAG 想 **8k token 窗口** 塞满，搜一次；现在 **Agent 自主**，LLM 推理 + **大量 tool call**。Notion 每次往返 **海量并行查询**；Cursor Agent 比我见过的 **并发更多**。数据库为 **单次往返最大并发** 设计，Agent 也在干同样的事——热数据上 **一批 query、最少轮次**。

一个 Agent **并行八个搜索**（Cognition 也这样）。多样性怎么保证、别八遍同一请求？ **混合模式**——语义 + 文本 + 正则 + SQL，别押一种。查询价格在 **降 5 倍**，可能还要再降——适应高频 Agent 调用。写读比仍高，但模式在变。

> **金句 · Simon Eskildsen**
> **中文：** AI 时代的搜索不是人偶尔敲几个字，是 Agent 高并发地调工具。
> **原文：** Search in the AI era is not low-frequency human input — it's high-concurrency agent tool calls.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 混合检索 | hybrid retrieval | 向量 + 全文 + grep 并用 |
| 工具调用 | tool call | Agent 调搜索/API 的动作 |
| 每用户经济模型 | per-user unit economics | 云成本 < 客户从服务赚到的钱 |

**本章小结**

- Cursor **95% 降本** = Turbopuffer PMF 转折点
- Agent 搜索 = **单用户多并行 query**，不是一次 RAG
- 案例 > 思想文；Cursor 公开经验是 Simon 最爱

---

## 04 Vibe 定价、Lockie 与 P99 工程师：让软件听指挥

**Alessio：** 定价怎么定？还有你那个「年底没 PMF 就退钱」的故事？

**Simon Eskildsen：** 最初定价 **Vibe**——纸笔算「如果很好大概啥成本 + 一点利润」。Cursor 进来时 GCP 账单 **比他们的付款还高**——Justine 和我 **信用卡扛**，优化到 **5% 毛利**，现在 **盈利** 让风投惊讶。Lockie 投资时我打电话：**年底没 PMF 全退**。Justin 和我 **不做无效的**——摊牌，Lockie 是唯一没慌的，说从没听过。我不知 seed/pre-seed 是啥——选 Lockie 因 **能随时坦诚打电话**，不是 database 专家； **我们懂 DB，他要帮找客户和候选人**——贡献惊人。

**P99 工程师** 是内部术语——人才密集，Cursor 创始人 **第一性原理** 只要 dense team。我有份 **特质清单**，面完对照；默认 **不雇**，要有人 **举双拳说我会为他战斗**。

P99 例子：**按意志改变电脑轨迹**——草稿纸算 100 台机器、多少盘、多少带宽，该多少 QPS；真实系统差 **10 倍**，就让软件 **逼近极限**。首席架构师 Nathan 的 **ANN v3**：**1000 亿向量**，p50 **40ms**、p99 **200ms**，六到八周 **几乎一人** 搞定——这是 **四九** 不是三九。

面试筛 **痴迷**：地图、火车、茶——「武器化自闭症」玩笑，意思是 **深度钻研某物**。P99 还 **画地图式权衡**：Turbopuffer **不能跑高事务 OLTP**，延迟 **100ms**——边界讲清楚。DevRel 也是绘图：地标在哪、路径在哪、啥不做。

> **金句 · Simon Eskildsen**
> **中文：** 默认不雇；要有人愿意押上职业生涯为他站台。
> **原文：** The default should be "we absolutely don't hire this person."

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 近似最近邻 | ANN | 向量近邻搜索算法族 |
| 第一性原理定价 | first-principles pricing | 按硬件成本 + 毛利定价，非竞品对标 |
| 人才密集 | talent-dense | 少而精，非堆人头 |

**本章小结**

- 早期 **Vibe 定价 + 信用卡** 逼出 unit economics 纪律
- P99 = **硬件极限心算 + 软件逼近 + 痴迷特质**
- 投资者价值在 **客户/候选人网络**，不只在 domain 知识

---

## 05 全文搜索回归：beat Lucene，千亿规模，第三幕是 OLAP

**Swix：** 向量在风口，你们为何强调全文搜索？

**Simon Eskildsen：** 阶段一 **向量**；阶段二 **一直是全文**。今天 FTS **相当先进**——不少 query **beat Lucene**，尤其 **LLM 生成长查询** 和 **Common Crawl 级** 数据集。前缀搜「si」——向量可能返回西班牙语「是」；FTS 知道是 **文档前缀**。每月 changelog **加 FTS 功能**，很多人从传统引擎 **迁过来**。

规模：客户要搜 **Common Crawl 级**——千亿向量或文档。刚发 **ANN v3**，在做 v4、v5。Dashboard 还像 **创始人两年前随手写的**——我想找回 **phpMyAdmin 那种** 数据库控制台与引擎 **一体** 的体验。

**第三幕？** 数据库里数据待着，用户还想要 **聚合、连接**——初创 **护城河是专注**，同行 **扩张过度** 会挂。我们年底最可能后悔 **做太多**。候选：**更简单的 OLAP**、追踪日志——但 **主用例不是搜索就别用 Turbopuffer**。Cursor 把 **20TB Postgres** 迁过来，某些 query plan 好， **推迟分片**——我们从客户模式里 **嗅方向**。

图查询？底层是 **KV**，有人用 **并行 query** 做图——路线图：**把 AI 连海量数据**；顺序听 **P99 客户** 要啥。

> **金句 · Simon Eskildsen**
> **中文：** 向量在风口，但 Command+K 那种精确匹配，全文搜索仍然不可替代。
> **原文：** Full-text search remains irreplaceable for exact match and prefix search like Command+K.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Common Crawl | Common Crawl | 公开网页爬取语料，千亿级 |
| Lucene | Apache Lucene | Elasticsearch 底层索引引擎 |
| 键值存储 | KV store | 底层抽象，上层暴露搜索 API |

**本章小结**

- Turbopuffer 路线：**向量 → FTS 全面领先 → 规模/控制台 → 谨慎 OLAP**
- Agent 时代 **RAG/检索不但没死，反而更高频、更混合**
- 专注搜索；客户 **Postgres  offload** 是需求信号，非产品 pivot

---

## 总结：检索是 Agent 连世界的桥

| 维度 | 要点 |
|------|------|
| 架构 | S3 一致 + CAS → 无状态；冷 S3 / 热 NVMe / 更热 DRAM |
| 商业 | Cursor **-95%** 证明 unit economics；Agent 查询量 → 降价 |
| 工作负载 | 单次 RAG → **单 Agent 多并行 search**；混合语义+全文+grep |
| 团队 | P99 = 极限心算 + 软件逼近 + 默认不雇 |
| 路线 | 先 beat Lucene + 千亿 ANN；第三幕 OLAP **听客户，别抢跑** |

### 对 infra / Agent builder

- 别只算 **embed 成本**——Agent **query 频率** 才是账单杀手
- 对象存储 **强一致 + CAS** 值得重新审一遍架构
- 搜索选型看 **混合 query** 与安全（BYOC、加密 bucket）

### 仍待验证

- 写读比会否随 Agent 模式 **进一步倾斜读**
- OLAP 扩张节奏 vs **专注搜索** 护城河

> **金句 · Simon Eskildsen（封底）**
> **中文：** 我们可以压缩怎么理解世界，但没法把所有知识压进权重——搜索是 AI 与海量知识之间的桥。
> **原文：** We can compress how to understand the world into weights, but we can't compress all knowledge — search is the bridge.

---

## 附录

### 章节时间戳

| 章 | 主题 | 时间 |
|----|------|------|
| 01 | 数据库三条件 | [04:12] |
| 02 | S3 强一致 | [15:45] |
| 03 | Cursor 降本 95% | [23:10] |
| 04 | P99 工程师 | [38:45] |
| 05 | 全文搜索未来 | [47:15] |

### ingest 路径

- **专栏主源：** `Recastory/workspace/bilibili-retranscribe/BV1mDDzBEEWH/ingest/column_article.md`
- **ingest_dir：** `Recastory/workspace/bilibili-retranscribe/BV1mDDzBEEWH/ingest`

### 相关阅读

- [[OpenAI员工-上下文工程和Agent记忆]] — RAG、memory 与 context 工程
- [[Every增长主管-Codex成为知识工作的OS]] — 代码库级 Agent 搜索/workflow 对照
- [[Databricks-企业级Agent生产实践]] — 企业数据 + Agent 生产路径
