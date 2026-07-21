---
title: "PlanetScale：Agent 时代的基础设施"
tags: ["ai_agent", "video_transcript", "bilibili", "cursor", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "cursor", "harness_engineering"]
created: "2026-07-02"
source: "B站视频 - Easonlee的AI笔记"
description: "Sam Lambert 在 Cursor Compile 讲 Agent 基础设施：live demo 优化/拦截/Rewind/分片；infra 必须 safe by default，narrow tools 封装 DBA 经验。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/PlanetScale-Agent时代的基础设施.md"
source_sha256: "c7970c8fc91144922c292a32faae57493611d25723ad0a35f41535a72687d349"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1ZWTL64Erg/"
source_original: "https://cursor.com/compile"
source_original_date: 2026-06-24
duration: 25:40
saved: 2026-07-03
updated: 2026-07-03
material_tier: A
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1ZWTL64Erg/ingest"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: "Editorially reconstructed dialogue (column primary)"
host_name: "编者问"
guest_name: "Sam Lambert"
guest_title: "PlanetScale CEO"
speaker_inference: "column_article + video_description + Cursor Compile 官方议程（主题演讲，编者重构提问）"
speaker_confidence: medium
factual_status: unverified
factual_reviewed: 2026-07-13
verification_basis:
  - column
  - description
  - original_page
unresolved_facts:
  - "当前 Recastory BV 目录未发现 ASR；演讲细节、数字与措辞仍需回看原视频。"
concepts:
  - id: deploy_request
    zh: 部署请求
    en: deploy request
    one_line: 数据库 schema 的 PR，可 review diff
  - id: schema_rewind
    zh: 模式回滚
    en: schema rewind
    one_line: 长窗口内 flip 旧 schema，保留中间写入
  - id: scatter_gather
    zh: 分散-聚集查询
    en: scatter-gather query
    one_line: 查所有 shard 再聚合，应 refactor 避掉
  - id: small_sharp_tools
    zh: 精简原语
    en: small sharp tools
    one_line: 窄接口高内聚，替 Agent 做复杂决策
---

# PlanetScale：Agent 时代的基础设施

**编者问：** 以下问题用于重组主题演讲，并非会议主持人原话。
**Guest：** Sam Lambert（PlanetScale CEO）
**形态：** 主题演讲 + Cursor live demo · 编辑重构问答（专栏与简介主源，当前缺 ASR）
**B 站：** [BV1ZWTL64Erg](https://www.bilibili.com/video/BV1ZWTL64Erg/) · **原片** 2026-06-24 · **时长** 25:40

---

## 开场

PlanetScale 是云数据库（Vitess 分片、Postgres 等），**Cursor 也是客户**——跑非常大的分片库。Sam 这场几乎**完全靠 Cursor Agent 做 live demo**：每次彩排路径不同，但都能到目标；平台还可能**直接 block**危险操作。

论题：**Agent 非确定性，infra 必须 safe by default**——把 DBA 几十年经验封装成 **small sharp tools**（branch、Deploy Request、rewind、traffic control、backpressure），别把整坨 log 丢给模型。Day one 建应用容易，**living production 十年二十年**才是 infra 主战场。

六章预告：**非确定性 + 慢查询优化 demo** → **坏 Agent 被拦** → **Rewind 秒级恢复** → **在线分片 + Cursor refactor** → **长期演进 vs 瞬间创建** → **narrow tools + backpressure**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 部署请求 | deploy request | schema 变更的「PR」，可 diff 再合并 |
| 分支环境 | branch | 生产级副本上试变更 |
| 模式回滚 | schema rewind | 长窗口 flip 旧 schema，中间写入不丢 |
| 分散-聚集查询 | scatter-gather query | 打全 shard 再聚合，慢，应避 |
| VSchema | Vitess schema | 声明 shard 规则 |
| 精简原语 | small sharp tools | 窄工具高可靠，可组合 |
| 反压 | backpressure | replication lag 时平台自动减速 |

---

## 01 Agent 非确定性：彩排每次不同，平台得兜到对的地方

**编者问：** 你说这场 demo 几乎全靠 Agent——非确定性会不会把 DBA 吓跑？

**Sam：** Agent **非确定性**。我练这场 demo，**每次路径都不一样**，但最后都到对的地方。所以我们 building 的系统要**极其安全**——PlanetScale 高可用，它可能直接 **block** 你在干的事，让 Agent 停。行业里数据库 + Agent 的恐怖故事不少；今天看另一面。

demo 电商 **Sam's Sofa**：Cloudflare 托管，PlanetScale 三节点 cluster，query 平均近 **4 秒**，checkout 体验很差。Grafana 上订单在涨，但 query 慢——人 abandon checkout。

我让 Cursor Agent（**Composer 2.5**）读 PlanetScale **insights / recommendations**，生成 schema change（加 index 等）→ **branch** 测试 → **Deploy Request**。每张 graph 上**竖线**标变更时刻，可 drill 到 query 频率变化。最慢 query 大幅加速，站点吞吐上去。

平台给 Agent 的是**结构化 recommendation**——不是 log 海洋。背后有数据仓库分析每秒千万级 query，surface 给 Agent 的是「该加哪个 index」这种窄接口。

> **金句 · Sam**
> **中文：** Agent 非确定性——彩排每次不同，infra 要兜到正确结果。
> **原文：** Agents are non-deterministic. Every time I've practiced this demo, it's done something different, but it gets to the right place.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 洞察建议 | insights / recommendations | 平台生成的索引/慢查询建议 |
| 智能体视图 | agents view | 看谁（哪个 Agent）在改什么 |
| 变更竖线 | change marker on graphs | 每次 schema 变更在监控图上的标记 |
| 非确定性 | non-deterministic | 同 prompt 路径可不同，结果靠 infra 约束 |

**本章小结**

- Agent 路径多变 → infra 默认安全，必要时 block
- insights + Deploy Request 让「好 Agent」能加速优化
- 结构化 recommendation 优于 raw log

---

## 02 分支与 Deploy Request：坏 Agent drop column 被平台 veto

**编者问：** 你说故意塞了「坏 prompt」——平台怎么拦破坏性 schema？

**Sam：** 一个坏 Agent 试图 **drop column**。PlanetScale 扫描**所有 in-flight queries**，发现会破坏活跃查询 → **reject**（除非你 force）。我说：**「我们成功阻止 Agent 打爆生产。」**

**Deploy Request** 像 PR：branch 上试 schema，ready 了再 deploy；diff 看得见。生产变更和 Grafana **竖线**关联——凌晨两点 prod 挂了，你得知道**谁改了什么**。

好 Agent 路径：加 missing index → branch → deploy → 站点变快。**坏 Agent 被拦**这条，是 determinism 的好新闻——平台比模型更懂「这会 break 正在跑的 query」。

Branch 给**生产级环境**试变更，不必每次真上 prod。现代世界会有越来越多 Agent 改 infra——**审计链**不是奢侈品。

> **金句 · Sam**
> **中文：** 我们成功阻止了一个 Agent 打爆生产。
> **原文：** We have successfully stopped an agent from breaking production.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 部署请求 | deploy request | schema 的 PR + diff + review |
| 活跃查询检测 | in-flight query check | deploy 前扫描会不会 break 正在跑的 SQL |
| 分支环境 | branch | 生产级隔离试变更 |
| 强制通过 | force deploy | 人明确承担风险时才 override reject |

**本章小结**

- drop column 类破坏操作 → 平台 scan + reject
- Deploy Request + branch = Agent 时代的数据库 PR 流
- 变更可关联到 graph 竖线，半夜排障靠这个

---

## 03 Schema Rewind：百 TB 表也是同一速度，中间写入不丢

**编者问：** 另一个坏 Agent 你真放进去了——生产挂了之后怎么救？和传统 restore 差在哪？

**Sam：** 那个 Agent **被允许** push 破坏性 schema——生产丢 column 访问，站点挂。传统 DB：restore snapshot，**中间写入可能丢**，服务停很久。

PlanetScale **Rewind**：**长窗口**内 flip 回上一版 schema——**不停机、不丢新写入**。客户常在 **百 TB 级表**上做 schema change，恢复速度一样。我点一下，outage **秒级**撤销。

Safety 的意思是：你可以让 Agent **并行干活**，平台必须能 **diff、reject、undo**。Rewind 比 restore 快一个数量级——living system 要 **undo**，不是 snapshot 考古。

Demo 收尾：坏家伙被 prevent，站点变快，Agents View 里任务都 completed。

> **金句 · Sam**
> **中文：** 组合能扩展智能，不必同比扩展风险。
> **原文：** Composition scales intelligence without increasing risk.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 模式回滚 | schema rewind | 长窗口内 flip 旧 schema 版本 |
| 中间写入保留 | retain interim writes | rewind 不丢变更后的新数据 |
| 撤销而非还原 | undo vs restore | 秒级 flip，非全库 snapshot 恢复 |
| 安全并行 | safe parallelism | 允许多 Agent 跑，平台能 veto/undo |

**本章小结**

- 破坏性变更仍可能发生 → Rewind 秒级恢复 + 保留写入
- 大表同样速度——infra 能力，不是小表特权
- diff / reject / undo 三件套是 Agent 操作 prod 的前提

---

## 04 在线分片 + Cursor：scatter-gather 是应用层噩梦

**编者问：** 流量涨了，垂直扩展到头——分片 demo 里 Cursor 具体干什么？

**Sam：** 三节点 unsharded → **16 shards**，每 shard 独立 primary + replicas 跨 AZ。应用仍连「一个库」——背后是分布式系统。

**Vitess 工作流**（简化）：queue → 跑 binlog → copy data（边复制边写入）→ verify 每行 → 切 read replicas → 切 primaries（可 fail back）→ 完成。**应用全程在跑**。

**应用层难点**：orders join products，unsharded 时简单 SELECT；sharded 后变 **scatter-gather**——打全 shard 再聚合，慢，在 critical path 上作死。

**VSchema** 声明式告诉 Vitess shard 哪张表、hash 哪列——Agent 可读 PlanetScale skills 生成类似配置。shard key 常是 `customer_id` 这类自然键；选错要付几年 refactor 代价。

**Cursor 角色**：审计调用路径、加 shard key、改 query **直打单 shard**——传统公司 **3–4 年**的分片 refactor，Agent 可大幅压缩**代码改造**部分（VSchema 设计仍要懂产品）。

Demo 跑完：query 处理率大涨，Grafana 订单量 spike——sharding done，应用没死。

> **金句 · Sam**
> **中文：** 好 infra 把专家经验变成原语。
> **原文：** Good infrastructure turns expertise into primitives.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 在线分片 | online sharding | 边复制边服务，非停服迁移 |
| 分散-聚集查询 | scatter-gather query | 全 shard 查询再聚合，应 refactor |
| VSchema | Vitess schema | 声明 shard 规则与路由 |
| 分片键 | sharding key | 决定行落在哪个 shard |

**本章小结**

- 分片 = infra 在线迁移 + 应用 query refactor
- scatter-gather 慢且危险 → Cursor 类 Agent 改路径打单 shard
- VSchema 声明式；shard key 要对产品语义

---

## 05 Day one 容易，living production 才是二十年战场

**编者问：** 行业都在 obsession「快速 spin up sandbox」——你跟 Day one 唱反调？

**Sam：** 行业 obsessed **point of creation**——sandbox、秒级建库，Day one 大多能跑。真实软件活 **十年二十年**；我们常见接近 **二十年**的产品。

Agent 要在 **living production** 里持续 **prune、iterate、应对 emergent behavior**——不是一次性造好就完。人类仍是最 flaky 的 agent；我们先为人建 safe infra，再为 AI 建。

**Development 阶段**（行业已热）：isolation、validation、controlled deployment、Agent 并行 queue——平台要 **block 不安全并行**（reshard 时 block schema change）。

**Long-running change** 要 **backpressure**——Agent 不必自己盯 Grafana；平台根据 live traffic **hold off / push back**。

**Monitoring 闭环**：每次变更 → 关联**谁（哪个 Agent）改了什么** → 生产行为成为**下一轮 instruction**；emergent system 里其他 Agent 也能 observe 变更。

> **金句 · Sam**
> **中文：** Day one 很容易；难的是 living system 的持续修剪与维护。
> **原文：** Day one is extremely easy... It's really about continual pruning, evolution and maintenance.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 创建点 | point of creation | 一次性 spin up，行业过度关注 |
| 长期演进 | long-term evolution | 十年二十年维护与修剪 |
| 涌现行为 | emergent behavior | 变更后全栈行为漂移，需追踪 |
| 监控闭环 | monitoring loop | 变更 → 影响 → 下一轮 Agent 指令 |

**本章小结**

- Day one ≠ 主战场；living OS 的持续维护才是
- 平台 block 危险并行；backpressure 解放 Agent 盯盘
- 变更审计 → 下一轮 instruction 的数据源

---

## 06 Small sharp tools：别扔 raw log，traffic control 与反压

**编者问：** 「narrow tools」哲学最后收一下——Postgres traffic control 和 backpressure 给 Agent 什么？

**Sam：** **Small sharp tools** → 少歧义、高可靠、可组合。**Composition scales intelligence without scaling risk.**

工具箱示例：

| 原语 | 干什么 |
|------|--------|
| Branch | 生产级试 schema |
| Deploy Request | 类 PR，diff + insights |
| Rewind | 秒级 undo 破坏性变更 |
| Insights | 索引增删、慢 query 建议 |
| Traffic control | query / credential / tag 级资源隔离 |
| Backpressure | schema change 或 reshard 时 replication lag → 自动减速 |

**Traffic control**（Postgres 新能力）：隔离到 query、credential、tag——Agent 扫数据集**超限可被 kill**，不影响整集群。

背后跑数据仓库 + 流水线分析每秒千万 query，**surface 给 Agent 的是 recommendation**，不是 log 海。小公司有**数百年份的 DBA 经验**封装进系统——通过 Agent 帮客户快建，且 **safe**。

未来不只看更聪明的模型——**即使模型不变**，行业仍要建 narrow primitives 让 Agent 安全操作 living system。我们以前从不替客户写代码；现在可以 **prompt 他们的 Agent 做对的事**，且变更可控。

> **金句 · Sam（封底）**
> **中文：** 组合能扩展智能，不必同比扩展风险。
> **原文：** Composition scales intelligence without increasing risk.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 流量控制 | traffic control | 按 query/credential/tag 限资源 |
| 反压 | backpressure | lag 时自动减速变更 |
| 精简原语 | small sharp tools | 窄接口、可组合、降 Agent 决策负担 |
| 专业知识封装 | expertise distillation | DBA 经验 → 平台可调用的原语 |

**本章小结**

- narrow tools + backpressure > 扔 raw log 给 Agent
- traffic control 让 Agent 扫数据可 kill 越界查询
- 好 infra 是 Agent 操作 living prod 的前提，不只靠更强模型

---

## 总结

| 维度 | 要点 |
|------|------|
| 核心判断 | Agent 非确定性 → infra **safe by default**：branch / diff / reject / rewind / audit |
| Live demo | 好 Agent + insights 加速；坏 Agent 靠 break-query 检测 + Rewind 兜底 |
| 分片 | infra 在线迁移 + Cursor 扛 scatter-gather refactor |
| 时间观 | Day one 容易；二十年 living system 的 prune 才是主战场 |
| 哲学 | small sharp tools；composition 扩展智能不扩展风险 |
| 与 vault | 接 [[IBM团队-Harness工程详解]]、[[Cursor-128个Agent团队协作]] |

> **金句 · Sam（封底）**
> **中文：** 好 infra 把专家经验变成原语。
> **原文：** Good infrastructure turns expertise into primitives.

---

## 概念索引

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| deploy_request | 部署请求 | deploy request | schema PR + diff |
| schema_rewind | 模式回滚 | schema rewind | 长窗口 flip，保留写入 |
| scatter_gather | 分散-聚集查询 | scatter-gather query | 全 shard 聚合，应避 |
| small_sharp_tools | 精简原语 | small sharp tools | 窄工具可组合降风险 |
| backpressure | 反压 | backpressure | lag 时平台自动减速 |
| traffic_control | 流量控制 | traffic control | 按 query/credential 隔离 |

---

## 附录

### 章节时间戳（B 站简介）

| 时间 | 主题 |
|------|------|
| 01:30 | 智能体非确定性需安全环境兜底 |
| 04:30 | 分支与 Deploy Request 防未知故障 |
| 06:40 | 一键无损 Rewind |
| 11:30 | Cursor 高效分片与 scatter-gather refactor |
| 16:30 | 长期系统演进 vs 瞬间创建 |
| 19:40 | 精简原语与反压 |

### 素材路径

- **ingest**：`Recastory/workspace/knowledge/A3-planetscale-agent/ingest`
- **来源限制**：当前 Recastory BV 目录未发现 ASR；正文来自专栏与简介的编辑重构
- **video_description**：`{ingest}/video_description.md`
- **B 站**：[BV1ZWTL64Erg](https://www.bilibili.com/video/BV1ZWTL64Erg/)（*Easonlee的AI笔记*）
- **讲者**：Sam Shank，PlanetScale CEO
- **Demo 工具**：Cursor Agent（Composer 2.5）
- **时长**：25:40

### 相关阅读

- [[Cursor-128个Agent团队协作]] — Cursor 多 Agent 与本场 demo 工具  
- [[IBM团队-Harness工程详解]] — Harness 约束与可靠性第一性原理  
- [[DeepMind-模型将吞噬Harness]] — 模型 vs harness 边界讨论  
- [[OpenAI员工-上下文工程和Agent记忆]] — context 与 long-running agent 对照  
- [[MOC - Agent Theory and Design]] — Agent 理论总索引  

### 收录说明

- **speaker_inference**：`asr_single_speaker_keynote + video_description chapter_reconstruction`（Host 问答为章节边界重构，待核实主持真名）  
- **版本**：canonical Host-Guest v3.2-asr（2026-07-03；原 v3 九段讲义已替换）
