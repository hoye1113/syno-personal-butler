---
title: "DeepMind播客：AlphaGo 10周年 AI的转折点"
tags: ["ai_agent", "article", "bilibili"]
legacy_tags: ["ai_agent", "article", "bilibili"]
created: "2026-07-09"
source: "https://www.bilibili.com/video/BV1oGDbBeEjv"
description: "AlphaGo核心架构师Thore Graepel与DeepMind科学负责人Pushmeet Kohli回顾AlphaGo击败李世石十周年，直觉+搜索方法论迁移至蛋白质折叠、矩阵乘法等科学领域"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/DeepMind播客-AlphaGo10周年AI转折点.md"
source_sha256: "239f9d7ed6374a762be5655add6902974ba3e81318d0a8c38e7dd33cc3739bd7"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Easonlee的AI笔记]]"
moc: "[[MOC - Agent Theory and Design]]"
dialogue_version: "v3.2"
material_tier: "S"
host_name: "Hannah Fry"
guest_name:
  - "Thore Graepel"
  - "Pushmeet Kohli"
speaker_inference: "播客访谈；Hannah Fry主持，Thore Graepel（AlphaGo架构师）× Pushmeet Kohli（DeepMind科学负责人）"
ingest_dir: "BV1oGDbBeEjv"
transcript_source: "column_article"
---

## 概念

- **策略网络**：接收棋盘局面，按职业棋手下棋概率对走法排名——AlphaGo的"快思考"
- **价值网络**：判断对黑方或白方的优势程度
- **AlphaTensor**：将矩阵乘法视为游戏，在算法空间中搜索最快乘法方案
- **AlphaEvolve**：在所有可能程序空间中搜索最优算法的通用智能体
- **猜想与反驳**：卡尔·波普尔的科学方法论；AI产生假设（猜想），验证器筛选错误（反驳）
- **结晶智能**：以文本/数据形式沉淀的人类知识总和；LLM依赖此捷径，但难以产生超越分布的新知识

## 金句

> 这不仅是那场比赛中的一个时刻，我认为也是人工智能整个历史中的一个时刻——这些系统有时会产生我们可能无法辨别的见解。——Pushmeet Kohli

> 它重新发现了人类知识，然后又抛弃了它，因为它发现了更好的下棋方式。——Thore Graepel

> 如果AlphaGo能发生在围棋中，就没有理由不能发生在蛋白质结构预测、核聚变、材料科学中。AlphaGo是转折点。——Pushmeet Kohli

## 章节

### 01 AlphaGo的诞生与围棋的挑战 [00:00]
围棋规则简单但组合复杂度比国际象棋高出好几个数量级（10^170种局面），无法暴力破解。AlphaGo的核心是模拟人类"快思考"（策略网络过滤走法）与"慢思考"（价值网络+搜索树）的结合。

### 02 与李世石的世纪之战 [05:20]
第37手：第五线肩冲，人类职业棋手认为概率万分之一的走法。解说员Michael Redmond一度以为显示错误。这步棋代表了一种全新的权衡——给对手更多即时地盘以换取中心影响力。AI第一次产生超越人类经验分布的原创见解。

第78手：李世石的"神之一手"，不寻常的夹击棋让AlphaGo困惑致连走坏棋认输。最终AlphaGo 4:1获胜。

### 03 AlphaZero：脱离人类数据的智能 [14:45]
AlphaZero完全不使用人类棋谱，仅凭规则自对弈。先重新发现人类定式（验证人类知识正确性），随后抛弃这些定式并演化出更高效的陌生下法。棋步看似反直觉，但30步后一切水到渠成——具备"预见性"。证明AI能产生超越结晶智能的原创知识。

### 04 从游戏到科学发现 [23:10]
AlphaTensor将矩阵乘法视为游戏，找到50年来人类未突破的更快乘法算法。AlphaEvolve扩展到数据中心调度、网络数据包路由等通用算法搜索。关键洞察：围棋经验可迁移至任何大规模组合搜索空间——科学发现的本质就是此类搜索。

### 05 验证器：创新与幻觉的分界线 [31:50]
"猜想与反驳"框架：AI的生成能力提出假设（可能包含幻觉），严格验证器（物理模拟/数学证明/代码测试）筛选。在可验证领域（代码、数学）AI表现出色；开放科学问题则需要实验验证。

### 06 未来科学家的角色转型 [40:15]
AI能自主完成复杂证明时，人类的价值在于准确指定奖励函数与问题框架。数学家更重要而非更边缘——"哪些问题需要解决"仍是人类定义。AlphaProof等系统已能给出可验证的数学证明，即使人类暂时不理解其推理过程。

## 附录

- **原视频**：[BV1oGDbBeEjv](https://www.bilibili.com/video/BV1oGDbBeEjv)
- **专栏图稿**：[cv47657001](https://www.bilibili.com/read/cv47657001/)
- **时长**：53:48
- **播客**：Google DeepMind Podcast

## 相关阅读

- [[杨立昆-世界模型才是未来]]（世界模型理论）
- [[杨立昆-LLM到不了AGI世界模型才能]]（LLM局限性深度辩）
- [[MOC - Agent Theory and Design]] — Agent时代核心理论入口
