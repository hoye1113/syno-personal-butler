---
title: "Shopify CTO：AI 时代的 CI 范式重构"
tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering", "ai_coding", "ai_evaluation"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering", "ai_coding", "ai_evaluation"]
created: "2026-07-07"
source: "B站视频 - Easonlee的AI笔记"
description: "Mikhail Parakhin：代理批评循环、River 与 CLI 工具相变、PR 全局互斥锁、Tangle/Tangent 自动研究、SimGym 客户模拟与 Liquid 低延迟搜索。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Shopify CTO-AI时代CI范式重构.md"
source_sha256: "8725c3c460487fc0c16595678b432b48215c9d71ec9bbbd22f3462a9440725e0"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1dC5268Ei1/"
column_url: "https://www.bilibili.com/read/cv49269955/"
host_name: "swyx"
guest_name: "Mikhail Parakhin"
guest_title: "Shopify CTO · 前微软 Bing/Windows CEO"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1dC5268Ei1/ingest"
speaker: "swyx / Mikhail"
duration: "74:33"
saved: 2026-07-07
updated: 2026-07-07
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1dC5268Ei1/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1dC5268Ei1/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column Host/Guest"
speaker_confidence: high
concepts:
  - id: critique_loop
    zh: 代理批评循环
    en: agent critique loop
    one_line: 一生成一评，慢但错少
  - id: pr_global_mutex
    zh: PR 全局互斥锁
    en: PR as global mutex
    one_line: 机器写码速度让合并成瓶颈
  - id: tangle_cache
    zh: Tangle 内容哈希
    en: Tangle content hashing
    one_line: 同输出不重算，跨人实验共享
  - id: sim_gym
    zh: SimGym 客户模拟
    en: SimGym simulation
    one_line: 十年交易数据校准，非真空 prompt
  - id: liquid_inference
    zh: Liquid 低延迟推理
    en: Liquid low-latency inference
    one_line: ~300M 参数 30ms 搜索意图树
author:
  - "[[Mikhail Parakhin]]"
---

# Shopify CTO：AI 时代的 CI 范式重构

**Host：** swyx（Latent Space）  
**Guest：** Mikhail Parakhin（Shopify CTO）  
**形态：** Host-Guest canonical v3.2（**专栏主源**）  
**B 站：** [BV1dC5268Ei1](https://www.bilibili.com/video/BV1dC5268Ei1/) · **时长** ~74:33

---

## 开场

Shopify 内部 AI 工具采用率近 **100%**；2025 年 12 月模型够好后出现**相变**——CLI/自主代理（River）涨，IDE 插件增速放缓。Parakhin 的核心论点：**代码质量靠批评循环，不靠堆代币**；PR/CI 是人类时代设计的全局锁，机器速度下必须重想。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 批评循环 | critique loop | 不同模型互审再改 |
| Stacked PR | stacked PRs | 与 Graphite 合作缓解合并 |
| Tangle | Tangle | 第三代 ML/数据处理协作平台 |
| Tangent | Tangent | 自动研究循环优化管道 |
| SimGym | SimGym | 用历史商家数据模拟买家 |

---

## 01 代币、批评循环与 PR 审查

**swyx：** 詹森说工程师要花够代币——像用行数评人吗？

**Mikhail：** 詹森方向对，但**反模式**是大量并行、互不通信的代理。更少代理 + **正确批评循环**更高效：一代理做，另一代理（最好不同模型）挑刺，慢但质量高。代码行数爆炸 → **PR 审查必须极严**；好模型单段错误率可低于普通人，但总量大，进生产的绝对错误仍升。关键比率：**生成代码花费 vs 审查用贵模型（GPT Pro / Deep Think）花费**。

自研 PR 审查——市面工具常不够「专业级慢思考」。可容忍审查等一小时，真正痛点是**测试失败与回滚**拖长部署。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 头部偏斜 | head-skewed usage | 前 1% 代币增速更快 |
| 无限代币 | unlimited tokens | 引导用 Opus 4.6 级，劝阻弱模型 |

**小结：** 提效 = 少而精的代理 + 贵审查，不是并行乱枪。

---

## 02 CI/CD 瓶颈：互斥锁与微服务回归？

**Mikhail：** 用 **Stacked PR**（Graphite）。新代理世界里 PR/CI 是**主瓶颈**——人人先稳住现状，再想全新设计。合并冲突像**全局 mutex**；机器写码速度下，**微服务可能卷土重来**——独立发布小模块。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 相变 | phase change | 2025-12 模型质量拐点 |
| River | River | Shopify 内部编码代理 |

**小结：** Git/PR 为人速设计；代理时代需要新协作原语。

---

## 03 Tangle 与 Tangent：终结实验考古

**Mikhail：** **Tangle**（第三代，继 Ether/Nirvana）：协作实验 + **内容哈希**——输出不变则不重算，别人跑过相同预处理你直接「跳步」；一键上生产，无需再移植 Airflow。痛点是 Jupyter 脚本链、六个月後忘了自己做过什么。

**Tangent** = 自动研究循环（Karpathy 带火）：代理改管道、跑实验、最大化目标。搜索 **800→4200 QPS** 同机；HTML/Liquid 延迟、存储去重（发现巨大表只是随机 ID 哈希）。**没有 LLM 前 AutoML 难规模化**，现在像魔杖——但不擅长 OOD 突破；400 次实验命中 1 次也值，因人做要三年。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 内容寻址 | content addressing | 跨团队算力网络效应 |
| 自动研究 | automated research | 测量即可优化 |

**小结：** Tangle 管资产与复现，Tangent 管搜索改进；PM 使用率可超 ML 工程师。

---

## 04 SimGym、Liquid 与平台护城河

**Mikhail：** **SimGym**：无历史数据则代理只听 prompt；Shopify 有数十年「改动→销售」噪声数据，去噪后校准代理，与加购相关性目标 **~0.7**。要真实摩擦（浏览器、视觉——大图常降转化）。小商家没有 A/B，只有现状 → 给反事实建议。与 **HSTU** 更大模拟、优惠券干预时间点一起，做商家级反事实。

**Liquid AI**：非 Transformer，长上下文 + 低延迟；搜索查询 **~300M 参数 30ms** 端到端意图树；离线批处理蒸馏 **7–8 亿**参数也占优。代币爆炸时代，**蒸馏目标**很重要。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 数据护城河 | data moat | 用得越多模拟越准 |
| 中餐馆过程 | Chinese restaurant process | 零售类别聚类复兴 |

**小结：** SimGym + Tangle/Tangent + Liquid 叠成 Shopify 平台级 AI 故事。

---

## 总结

| 维度 | 要点 |
|------|------|
| 采用 | DAU ~100%；CLI/代理 > IDE 增速 |
| 质量 | 批评循环；审查预算要跟得上 |
| CI | PR 是 mutex；Stacked PR；或微服务 |
| 数据 | Tangle 哈希；Tangent 自动研究 |
| 商家 | SimGym 历史校准 + 反事实 |
| 模型 | Liquid 低延迟搜索与蒸馏 |

---

## 附录

### 章节时间戳（视频简介）

| 时间 | 主题 |
|------|------|
| 00:00 | 批评循环 vs 代币量 |
| 06:45 | IDE → 自主代理 |
| 15:20 | CI/CD 与 Stacked PR |
| 22:15 | Tangle / Tangent |
| 38:40 | SimGym |
| 55:10 | Liquid AI |

### spot_check（≥45 min）

- 2026-07-07：批评循环、River 相变、Tangle 内容哈希、SimGym 0.7 相关性、Liquid 30ms 搜索 — 与专栏时间戳一致。

### Ingest

- BV：`BV1dC5268Ei1`
- ingest：`Recastory/workspace/bilibili-retranscribe/BV1dC5268Ei1/ingest`
- 专栏：`.../ingest/column_article.md`

### 相关阅读

- [[微软CEO-AI竞争终局与企业私有评估]] — 企业 eval 与私有数据
- [[Codex负责人-现场演示Codex]] — 编码代理产品对照
- [[MOC - Harness Engineering]] — CI/审查 harness
- [[MOC - AI 时代个人发展与组织]] — 组织与工具采用
- [[MOC - Agent Theory and Design]] — 入口
