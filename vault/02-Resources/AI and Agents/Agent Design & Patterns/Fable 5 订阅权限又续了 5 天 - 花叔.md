---
title: "Fable 5 订阅权限又续了 5 天！与其被吊着，我找了个账单只有 1/3 的替代方案"
tags: ["ai_agent", "multi_agent", "harness_engineering", "wechat", "article"]
legacy_tags: ["ai_agent", "multi_agent", "harness_engineering", "wechat", "article"]
created: "2026-07-07"
source: "https://mp.weixin.qq.com/s/WbeRHxfXri_j0rJMoqcnyw"
description: "OpenSquilla 多模型集成协作：用 4 个国产模型组队，在 DRACO 评测中跑平 Fable 5，账单只有 1/3"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/Fable 5 订阅权限又续了 5 天 - 花叔.md"
source_sha256: "df2d719380976e1c18f633db077e26d2f6a3e874429967a0c2945fc3a56c80a9"
migration_id: "migration-20260720-64e79771"
author:
  - "[[花叔]]"
---

# Fable 5 订阅权限又续了 5 天！与其被吊着，我找了个账单只有 1/3 的替代方案

> 作者：花叔 · 2026-07-07

---

## 背景

Fable 5（Claude Opus 5）订阅权限反复延期——太平洋时间 7 月 7 日到期后又延 5 天到 7 月 12 日。五天一续、没准信的用法比一刀切断更难受。

花叔的真实体感：Fable 5 能力极强，跑长任务和深度研究时经常自己闷头干 20 分钟，回来的东西比想的完整且很少有 bug。但三大障碍——账号问题、价格（10 美元/百万输入 token + 50 美元/百万输出 token）、出口管制导致的随时断供。

**最强的模型，正在离普通人越来越远。**

---

## OpenSquilla 多模型集成协作

开源项目 OpenSquilla 发布 0.5.0 Preview，核心思路从"组织技能"升级到"组织模型"：

- **做法**：把 DeepSeek、GLM、Kimi、Qwen 四个国产模型组成队伍
- **流程**：几家并行各交一份方案 → 一个模型聚合为最终输出
- **类比**：以前花大价钱请一位天才，现在开一场会——单拎谁都不是最强，但组织得当的队伍能跟天才掰手腕

配套发布技术报告《Agentic Routing》，代码和报告都在 GitHub，评测用 Perplexity 开源的公开数据集 DRACO。

---

## 评测：DRACO 100 道高难度研究分析任务

DRACO 涵盖金融、医学、法律、学术等十个领域，每道题按事实准确性、完整性、客观性、引用质量打分。

### 核心结果

| 对比项 | OpenSquilla 四模型队伍 | Fable 5 |
|--------|----------------------|---------|
| 平均分 | **60.82** | 59.80 |
| 每道题成本 | **$0.38** | $1.21 |
| Token 消耗/题 | 58 万 | 9.4 万 |

分数打平，**账单只有 1/3**。Fable 5 有 6 道题直接拒答（按 94 道算分）。

换 Brave 搜索源后：64.09 分，比 Opus 4.8 高近 5 分，比 GPT-5.5 高 10+ 分，成本分别低 92.5% 和 85.5%。

对比 Hermes MoA 方案：59.55 vs 60.82，分数咬紧但 MoA 更贵。

### 便宜的逻辑

Token 用量是 Fable 5 的 6 倍，但单价低一个量级——**便宜不是抠出来的，是组织出来的**。核心是"用对"：让什么水平的智力干什么水平的活。

类比算力领域：谷歌用一堆便宜商用服务器组成集群，靠调度和容错的软件层把高端服务器的活干了，价格是零头。赢在组织，不在单机。

---

## 边界

1. **赢的是可并行、可汇总的任务**：研究分析天然适合开会。但 Fable 5 真正离不开的能力是长程执行——一个模糊目标，自己规划、自己干、自己检查 20 分钟。一环扣一环的活没法拆给一队模型并行。
2. **PinchBench 上没提分**：只是用低 18% 成本追平 Opus 4.8。真实价值是把"同样质量"的价格打下来。
3. **每一代新模型发布都会吃掉上一代工程技巧的优势**：但新模型发布第二天就能被编进队伍当队员。组织方法是今天就能上手的杠杆。
4. **时间成本**：一道题跑 535 秒（Fable 5 的 188 秒的近 3 倍）。适合不急、可并行、量大、对账单敏感的场景。

---

## 信号

国产模型自己在快速变好，组织模型的方法也在变好，两条曲线叠着涨。只要国产模型的单价差维持在几倍以上，在这类任务上组队就是理性选择。

**AI 的下一步，未必是继续追更贵的模型，可能是把手里的模型组织得更聪明。**

- OpenSquilla：[opensquilla.ai](https://opensquilla.ai/zh/invite/)
- 技术报告在仓库里，DRACO 数据集在 HuggingFace 上

---

## 相关阅读

- [[Loop Engineering 橙皮书 - 花叔]] — 同一作者的 Loop Engineering 方法论
- [[祝贺Claude Code成功越狱，获得永生]] — 花叔 Claude Code 源码逆向
- [[OpenSquilla MetaSkill 第三块拼图]] — 花叔对 OpenSquilla Skill 组织的早期分析
- [[MOC - Harness Engineering]] — Harness 工程主题索引
