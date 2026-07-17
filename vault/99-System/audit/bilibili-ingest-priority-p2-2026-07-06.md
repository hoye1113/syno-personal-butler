---
title: B站 P2 收录优先级（Agent 优先）
created: 2026-07-06
tags: [audit, bilibili]
description: 从 ASR 就绪未收录池筛出偏 Agent 架构/工具/可观测的 P2 清单（约 20 篇）
---

# B站 P2 收录优先级（2026-07-06 · Agent 优先）

> 数据源：`Recastory/workspace/bilibili/manifest.json`  
> 方法：标题关键词加权（agent_core > harness > tooling > voice/eval > lab）+ 排除 P0/P1/已收录/低价值形态  
> 用户偏好：**Agent 类型优先**（架构、可观测、AGENTS.md、多智能体、语音 Agent 等）

## 汇总

| 池子 | 数量 |
|------|------|
| ASR 就绪且无 vault_path | ~143 |
| 评分 >0 候选 | 39 |
| **P2 建议批次** | **20**（Wave A 架构 + Wave B 工具） |
| P2 候补 | 15 |

## P2 Wave A — Agent 架构 / 生产（优先，12）

| # | BV | score | 主题标签 | 标题 | 预估轨 |
|---|-----|-------|----------|------|--------|
| 1 | [BV1jhogBwEzo](https://www.bilibili.com/video/BV1jhogBwEzo/) | 80 | agent_core | Databricks专家：如何构建有效的Agent架构 | S/A |
| 2 | [BV1kt5266EyW](https://www.bilibili.com/video/BV1kt5266EyW/) | 80 | agent_core | Raindrop CEO：打造 Agent可观测性 | S/A |
| 3 | [BV1W39yBwEhp](https://www.bilibili.com/video/BV1W39yBwEhp/) | 80 | agent_core | 大神Jeff：Agent.md的历史与最佳实践 | S/A |
| 4 | [BV1tZw4zLEX8](https://www.bilibili.com/video/BV1tZw4zLEX8/) | 80 | agent_core | 姚顺雨深度访谈：预测性Agent设计 | S/A |
| 5 | [BV11nRmB1EkH](https://www.bilibili.com/video/BV11nRmB1EkH/) | 80 | agent_core | Karpathy：从 Vibe Code 到 Agentic Code | S/A |
| 6 | [BV1dwAczDEXY](https://www.bilibili.com/video/BV1dwAczDEXY/) | 80 | agent_core | Karpathy：Code Agent / Auto Research / 自我循环 | S/A |
| 7 | [BV1mDDzBEEWH](https://www.bilibili.com/video/BV1mDDzBEEWH/) | 80 | agent_core | Turbopuffer CEO：Agent时代 RAG 与检索 | S/A |
| 8 | [BV1sKDdBWETM](https://www.bilibili.com/video/BV1sKDdBWETM/) | 80 | agent_core | Linear CEO：把 AI Agent 当一级员工 | S/A |
| 9 | [BV1MM9xBHEsQ](https://www.bilibili.com/video/BV1MM9xBHEsQ/) | 80 | agent_core | Banking负责人：Agent时代的平台如何设计 | S/A |
| 10 | [BV1FEAVzbEWq](https://www.bilibili.com/video/BV1FEAVzbEWq/) | 80 | agent_core | Notion联合创始人：从工具变成 AI Agent | S/A |
| 11 | [BV13fGm6HETj](https://www.bilibili.com/video/BV13fGm6HETj/) | 80 | agent_core | Google：端侧智能体微调微型 LLM | S/A |
| 12 | [BV1psDXByEwV](https://www.bilibili.com/video/BV1psDXByEwV/) | 80 | agent_core | 给每位员工配备 AI 智能体 | S/A |

## P2 Wave B — Agent 工具链 / 语音（次优先，8）

| # | BV | score | 标签 | 标题 |
|---|-----|-------|------|------|
| 13 | [BV18qTi6uEDX](https://www.bilibili.com/video/BV18qTi6uEDX/) | 110 | agent+tooling | Cursor CEO：云端智能体上线 |
| 14 | [BV1nyo1BuEd9](https://www.bilibili.com/video/BV1nyo1BuEd9/) | 110 | agent+tooling | Hermes Agent / 新 OpenClaw |
| 15 | [BV1SJ93B2EBo](https://www.bilibili.com/video/BV1SJ93B2EBo/) | 30 | tooling | Claude Code负责人：创造内幕 |
| 16 | [BV19uzXBeEMp](https://www.bilibili.com/video/BV19uzXBeEMp/) | 30 | tooling | Claude Code之父：讲解 Cowork |
| 17 | [BV1xEzqBVEeb](https://www.bilibili.com/video/BV1xEzqBVEeb/) | 30 | tooling | Claude Cowork 作为另一种 Claude Code |
| 18 | [BV1BHKX68Ee5](https://www.bilibili.com/video/BV1BHKX68Ee5/) | 30 | tooling | Codex实战：个人操作系统 |
| 19 | [BV12irNBtE7D](https://www.bilibili.com/video/BV12irNBtE7D/) | 25 | voice | ElevenLabs联创：语音AI现状与未来 |
| 20 | [BV1gFGU6DEkW](https://www.bilibili.com/video/BV1gFGU6DEkW/) | 22 | eval | Langfuse：LLM 评估与训练 |

## P2 候补（降权 / 偏商业叙事，需要时再收）

| BV | 标题 | 备注 |
|----|------|------|
| BV1KXDtBEEbV | Polsia CEO：1人 Agent 百万 ARR | 偏增长叙事 |
| BV1SsE368Ea8 | Leyora CEO：法律 Agent 1亿 ARR | 偏商业 |
| BV1psDXByEwV | 已在 Wave A | — |
| OpenClaw 配置/教程多条 | 与已收 OpenClaw 重叠 | 降权 |
| OpenAI 总裁/Image/人才大战 | lab 分低 | 非 Agent 工程 |

## 已排除（勿重复）

- P0/P1 全部 + Together AI `BV1U4Tz6CEzu`（本轮已收）
- 优先级文档「已排除样例」10 条
- 创业清单 / 一人公司 / 与 vault 角度高度重叠的条目

## 收录口令

```bash
# 每 BV：reconcile 定轨 → ASR 分轨 SUBDOC → dialogue 或九段 → gap-check
python 99-System/scripts/bilibili-v3-gap-check.py
```

## 建议落盘路径（Wave A 示意）

| BV | vault_path 建议 |
|----|----------------|
| BV1jhogBwEzo | `Agent架构与平台/Databricks专家-如何构建有效的Agent架构.md` |
| BV1kt5266EyW | `Agent架构与平台/Raindrop CEO-打造Agent可观测性.md` |
| BV1W39yBwEhp | `Agent架构与平台/Jeff-AGENTS.md历史与最佳实践.md` |
| BV1tZw4zLEX8 | `Agent架构与平台/姚顺雨-预测性Agent设计.md` |
| BV11nRmB1EkH | `Agent架构与平台/Karpathy-从Vibe Code到Agentic Code.md` |
| BV1dwAczDEXY | 与上条可能同源，收录前先 reconcile 去重 |
| BV18qTi6uEDX | `Agent架构与平台/Cursor CEO-云端智能体.md` |
| BV12irNBtE7D | `Agent架构与平台/ElevenLabs-语音AI现状与未来.md` |
