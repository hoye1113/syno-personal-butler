---
title: B站 P3 收录优先级
created: 2026-07-07
tags: [audit, bilibili]
description: P2 之后工程向筛选——建议收录 + 候补；排除见 bilibili-ingest-exclude
---

# B站 P3 收录优先级（2026-07-07）

> 数据源：`manifest.json` 未收录 ASR 就绪池（**122**）
> 原则：**Agent / Harness / Eval / 平台工程** 优先；ARR 故事、OpenClaw 重复、创业清单 **不收**
> 已收录 baseline：**88** 篇

## 汇总

| 决策 | 数量 |
|------|------|
| **P3 建议收录（主批次）** | **18** |
| P3 候补（可并入下一批） | 6 |
| 明确排除 | 94 |
| 元数据缺失（暂不收） | 4 |
| skipped_no_link（无 ASR） | 15 |

批次 JSON：`bilibili-p3-batch.json`

## P3 主批次（建议下一步收录）

| # | BV | score | 标签 | 标题 | 建议路径 |
|---|-----|-------|------|------|----------|
| 1 | [BV19GAqzSE9K](https://www.bilibili.com/video/BV19GAqzSE9K/) | 135 | org,org | 圆桌讨论：如何打造世界级AI原生团队？ | `行业观点与组织/圆桌讨论-打造世界级AI原生团队.md` |
| 2 | [BV1Ltw8zYErt](https://www.bilibili.com/video/BV1Ltw8zYErt/) | 110 | eval,eng_kw | OpenAI评估团队：AI编程评估集 历史、现状与未来 | `AI评估与研究/OpenAI评估团队-AI编程评估集历史现状与未来.md` |
| 3 | [BV1VczqBREQ8](https://www.bilibili.com/video/BV1VczqBREQ8/) | 105 | harness,eng_kw | 亚马逊Kiro团队：规范驱动开发 | `Agent架构与平台/亚马逊Kiro团队-规范驱动开发.md` |
| 4 | [BV1dC5268Ei1](https://www.bilibili.com/video/BV1dC5268Ei1/) | 88 | harness | Shopify CTO：AI时代的 CI范式重构 | `Agent架构与平台/Shopify CTO-AI时代CI范式重构.md` |
| 5 | [BV15moTBXEmk](https://www.bilibili.com/video/BV15moTBXEmk/) | 85 | agent_org | Peter Yang：Agent的未来 将消除职场内耗 | `Agent架构与平台/Peter Yang-Agent未来与职场内耗.md` |
| 6 | [BV11mTi6aEiP](https://www.bilibili.com/video/BV11mTi6aEiP/) | 82 | platform | GitHub COO：为什么程序员 还没被替代 | `Agent架构与平台/GitHub COO-为什么程序员还没被替代.md` |
| 7 | [BV1AGJx6fE3A](https://www.bilibili.com/video/BV1AGJx6fE3A/) | 82 | platform | GitHub COO：GitHub的AI革命 应对14倍PR增长 | `Agent架构与平台/GitHub COO-GitHub的AI革命与14倍PR增长.md` |
| 8 | [BV1uiGd6gECC](https://www.bilibili.com/video/BV1uiGd6gECC/) | 80 | org | Intercom首席：我的公司全员AI 转型实践 | `行业观点与组织/Intercom首席-全员AI转型实践.md` |
| 9 | [BV1xXDjBUE8S](https://www.bilibili.com/video/BV1xXDjBUE8S/) | 78 | multi_agent | DeepMind研究员：递归循环中：AI 已经在构建AI | `Agent架构与平台/DeepMind研究员-递归循环中AI构建AI.md` |
| 10 | [BV1Dd9CBGEmK](https://www.bilibili.com/video/BV1Dd9CBGEmK/) | 76 | rag | Neo4J CEO：如何将文档 转化为知识 | `Agent架构与平台/Neo4J CEO-文档转化为知识.md` |
| 11 | [BV1D9ojBzEAd](https://www.bilibili.com/video/BV1D9ojBzEAd/) | 75 | finetune | Deepset工程师：将小模型训练 成特定领域大师 | `Agent架构与平台/Deepset工程师-小模型领域微调.md` |
| 12 | [BV1nWLA6EEv2](https://www.bilibili.com/video/BV1nWLA6EEv2/) | 75 | rag,eng_kw | Notius创始人：AI研究工具 检索专家知识 | `Agent架构与平台/Notius创始人-AI研究工具与检索.md` |
| 13 | [BV1xC7R6VEWv](https://www.bilibili.com/video/BV1xC7R6VEWv/) | 74 | tooling | OpenCode创始人：OpenCode之 路：研发内幕 | `Agent架构与平台/OpenCode创始人-研发内幕.md` |
| 14 | [BV1uBTi6BEfd](https://www.bilibili.com/video/BV1uBTi6BEfd/) | 72 | safety | Gray Swan创始人：Codex之后 AI安全重写 | `Agent架构与平台/Gray Swan创始人-Codex之后AI安全重写.md` |
| 15 | [BV11s526kEAk](https://www.bilibili.com/video/BV11s526kEAk/) | 70 | ai_coding | TypeScript 专家：AI编程 如何写出生产级代码 | `Agent架构与平台/TypeScript专家-AI编程生产级代码.md` |
| 16 | [BV1FzQhBUETs](https://www.bilibili.com/video/BV1FzQhBUETs/) | 68 | ai_coding | DHH 编写代码的新方式 | `Agent架构与平台/DHH-编写代码的新方式.md` |
| 17 | [BV1SfXxBpExT](https://www.bilibili.com/video/BV1SfXxBpExT/) | 65 | research | 前OpenAI研究员：当前AI的瓶颈 需要持续学习 | `AI评估与研究/前OpenAI研究员-持续学习瓶颈.md` |
| 18 | [BV1tzJc6PE82](https://www.bilibili.com/video/BV1tzJc6PE82/) | 65 | research | Transformer作者：AI泛化瓶颈 需要类人学习 | `AI评估与研究/Transformer作者-AI泛化与类人学习.md` |

## P3 候补（工程向但重叠/次优先）

| BV | score | 标题 | 备注 |
|-----|-------|------|------|
| BV1kTo4BQE43 | 62 | Logical CEO：用好LLM的关键方法论 | LLM 方法论 |
| BV1E4DtBKEUN | 58 | Mistral首席科学家：微调比闭源模型 更具竞争优势 | 微调 vs 闭源 |
| BV1467R6LEzm | 55 | YC合伙人：YC内部 如何使用AI | YC 内部 AI 用法 |
| BV1rQf8BKEdA | 52 | Every团队：AI如何重塑工作流 | Every 工作流（轻量，候补） |
| BV1TyTi6eEni | 50 | Hermes实战：打造你的24小时数字员工 | Hermes 实战（已收 Hermes 体验篇） |
| BV1dJEL6JEeR | 50 | Hermes实战：新手配置 真实使用案例 | Hermes 实战（已收 Hermes 体验篇） |

## 收录口令

```bash
python 99-System/scripts/bilibili-ingest-reconcile.py
# → ASR 分轨 SUBDOC → dialogue/九段 → gap-check
python 99-System/scripts/bilibili-v3-gap-check.py
python 99-System/scripts/bilibili-manifest-assign.py --batch 99-System/audit/bilibili-p3-batch.json --apply
```
