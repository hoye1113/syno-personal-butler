---
title: "B站 enrich partial 清单"
created: 2026-07-03
tags: [audit, bilibili]
description: "17 条 A 级讲义无 column_article；Recastory enrich 已跑但 UP 评论无专栏链"
---

# B站 enrich partial（2026-07-03）

> **结论**：WebBridge 可用 return 200，backfill 可跑；17 条仍为 `partial` 因 **UP 主评论/opus 无 cv 专栏 URL**，非 vault 阻塞项。

## 汇总

| 指标 | 数值 |
|------|------|
| manifest 总数 | 32 |
| enrich ok（有 column） | 15（S 级） |
| enrich partial | **17**（A 级） |
| 可自动升 S | 0（除非手补 column） |

## 17 条清单

| BV | 讲义 | partial 原因 |
|----|------|-------------|
| BV12x1xB8E7b | Manus创始人-深度干货-上下文工程的最佳实践 | UP 评论仅章节时间戳，无 http 链接 |
| BV14nrMBKENb | OpenAI员工-上下文工程和Agent记忆 | 同上 |
| BV174GU6AEZY | 5次创业者-AI智能体独自经营初创公司 | 同上 |
| BV18bjG6fEi7 | WorkOS-创建和使用Skills方法论 | 同上 |
| BV19MzXBNESV | OpenAI官方-Codex新手教程 | 同上 |
| BV1EwK96AEyU | OpenAI评估团队-不再低估模型 | 同上 |
| BV1Mpf9B5Egk | Claude Code实战-构建一个AI数据分析师 | 未找到 UP 主评论 |
| BV1NpAHzZEcc | Karpathy爆火项目-AutoResearch解读与启发 | 同上 |
| BV1PnQfBvEs3 | Agent实战-打造一个AI Agent的完整教程 | 同上 |
| BV1UajG6oEvj | a16z-AI并非泡沫 | 同上 |
| BV1WnctziEac | OpenClaw创始人-我是如何使用OpenClaw的 | opus 页未解析出 cv 链 |
| BV1cVjN6oEwx | Loop-Agent Loop到底是什么 | UP 评论无 http |
| BV1eyBgB2EbX | Claude Code负责人-AI原生团队如何使用AI | 同上 |
| BV1ixKX6oEzK | DeepMind团队-当数百万Agent相遇 | 同上 |
| BV1kWctzeEYK | 30分钟精通OpenClaw | 同上 |
| BV1o4TL6sExw | Databricks-企业级Agent生产实践 | 同上 |
| BV1ZWTL64Erg | PlanetScale-Agent时代的基础设施 | 同上 |

## 已验证

```bash
# WebBridge 可用（2026-07-03）
cd Recastory
python -m tools.ingest.bilibili_backfill --bv BV12x1xB8E7b --force
# → partial warnings=1（仍无 column）

# vault 侧批量列出 / 重跑 partial（2026-07-03 已跑 17/17，仍 partial）
python 99-System/scripts/bilibili-partial-enrich-run.py --list
python 99-System/scripts/bilibili-partial-enrich-run.py --run --force  # 需 WebBridge
```

## 解除 partial 的三条路

1. **手补 column_url**：在 Recastory `ingest/metadata.json` 写入 cv 链后 `--force` 拉 column
2. **修 enrich 解析**：`BV1WnctziEac` opus→cv 跳转（`bilibili_enrich.py`）
3. **维持 A 级**：讲义 v3 + ASR spot-check 已够用，不升 S

## 相关

- [[bilibili-ingest-reconcile-2026-07-03]] — Phase 0 对账
- [[bilibili-v3-rollout-2026-07-03]] — vault rollout 总进度
