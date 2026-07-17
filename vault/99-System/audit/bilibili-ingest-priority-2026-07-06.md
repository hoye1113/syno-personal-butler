---
title: B站下一批收录优先级
created: 2026-07-06
tags: [audit, bilibili]
description: 从 Recastory 175 条 ASR 就绪中筛出 P0/P1 收录清单
---

# B站下一批收录优先级（2026-07-06）

> 数据源：`Recastory/workspace/bilibili/manifest.json`
> 方法：主题加权（Harness/Eval/Multi-Agent/Codex/Claude Code）+ 去重 vault 32 篇 + 排除创业清单类

## 汇总

| 池子 | 数量 |
|------|------|
| ASR 就绪未收录 | 175 |
| 评分 >0（可收录候选） | 144 |
| 排除/降权 | 31 |
| **P0 建议首批** | **15** |
| P1 第二批 | 20 |

## P0 首批收录（15）

| # | BV | 预估轨 | 主题 | 标题 |
|---|-----|--------|------|------|
| 1 | [BV1QM5G6xEdB](https://www.bilibili.com/video/BV1QM5G6xEdB/) | S | harness_engineering, anthropic | # Anthropic团队：解析Claude Agent平台内幕 |
| 2 | [BV1Qh7R6HEf5](https://www.bilibili.com/video/BV1Qh7R6HEf5/) | S | ai_evaluation, deepmind | # DeepMind团队：AI评估应走向 规划化和民主化 |
| 3 | [BV161o1BBERH](https://www.bilibili.com/video/BV161o1BBERH/) | S | harness_engineering, openai | # OpenAI研究员：Harness工程,软件开发新范式 |
| 4 | [BV1HTXFBAE68](https://www.bilibili.com/video/BV1HTXFBAE68/) | S | harness_engineering, loop_engineering | # Agent工程：从第一性原理 讲解Ralph Loop |
| 5 | [BV1H59yBFECR](https://www.bilibili.com/video/BV1H59yBFECR/) | S | harness_engineering, loop_engineering | # 大神Geoff：Ralph Loops的 基础设施 |
| 6 | [BV1ADobBcECX](https://www.bilibili.com/video/BV1ADobBcECX/) | S | harness_engineering | # Cloudflare专家：如何用Sandbox 确保AI代码安全 |
| 7 | [BV17AQhBVEje](https://www.bilibili.com/video/BV17AQhBVEje/) | S | ai_evaluation | # Agenta CEO：如何构建真正 有效的AI评估 |
| 8 | [BV1UqGd6BEzj](https://www.bilibili.com/video/BV1UqGd6BEzj/) | S | codex, openai | # OpenAI播客：用Codex 处理日常工作 |
| 9 | [BV1NMJx6aEci](https://www.bilibili.com/video/BV1NMJx6aEci/) | S | ai_evaluation | # 微软CEO：AI竞争的终局 企业私有评估 |
| 10 | [BV19V5t6ME6c](https://www.bilibili.com/video/BV19V5t6ME6c/) | S | claude_code | # Claude Code之父：编程已被解决 接下来的发展 |
| 11 | [BV1tR9zB4Ezv](https://www.bilibili.com/video/BV1tR9zB4Ezv/) | S | claude_code | # Claude Code实战：Gstack讲解 把AI变成一个团队 |
| 12 | [BV1ohDzBwEJN](https://www.bilibili.com/video/BV1ohDzBwEJN/) | S | claude_code | # Claude设计主管：Cowork揭秘，40分钟教程 |
| 13 | [BV1iKdvBhEYJ](https://www.bilibili.com/video/BV1iKdvBhEYJ/) | S | codex | # Codex产品负责人：Codex团队如何用Codex |
| 14 | [BV1jPQhBkEvz](https://www.bilibili.com/video/BV1jPQhBkEvz/) | S | claude_code | # Cowork负责人：揭秘Cowork 与Mythos |
| 15 | [BV18QE56zEVr](https://www.bilibili.com/video/BV18QE56zEVr/) | S | codex | # Every增长主管：Codex成为 知识工作的OS |

## P1 第二批（20）

| # | BV | 预估轨 | score | 标题 |
|---|-----|--------|-------|------|
| 1 | BV18o526DEFr | S | 70 | # Anthropic CPO：Claude团队 为什么迭代这么快？ |
| 2 | BV19sGH6UECj | S | 70 | # Anthropic团队：如何构建运行 数小时的Agent |
| 3 | BV1uDLz6iEX3 | S | 70 | # Anthropic团队：我们如何打造 下一代Claude |
| 4 | BV1txdABtEWF | S | 70 | # Anthropic联创：AI 的影响比工业革命“大 10 倍，快 10 倍” |
| 5 | BV1CpQfBAE5N | S | 70 | # OpenAI健康团队：AI在医疗领域 的进展 |
| 6 | BV1tV7Q6TEcf | S | 70 | # OpenAI团队：FDE工程师 的未来 |
| 7 | BV1itEh6FEUW | S | 68 | # Cognition CPO：Devin的80%时刻 后台Agent |
| 8 | BV1yWRmBCEDc | S | 68 | # DeepMind CEO：AGI倒计时 2030年见分晓 |
| 9 | BV1CnDXBjEmH | S | 68 | # DeepMind CEO：为什么AGI 比工业革命大10倍 |
| 10 | BV1QSzzBfELB | S | 68 | # 【附文稿】DeepMind CEO：AI的未来，未来10年的科学和技术发展 |
| 11 | BV1TwjN6NEuA | S | 66 | # Qodo研究员：长下文越多Agent越笨? 解决方案 |
| 12 | BV1oZ536AE4T | S | 62 | # Claude Code实战：40分钟！用AI 实现生活自动化 |
| 13 | BV1HwdjBHENb | S | 62 | # Claude Code实战：鲜为人知的 Claude Code 工作流 |
| 14 | BV1j15A6gEcL | S | 62 | # Codex实战：100分钟！ Codex完整教程 |
| 15 | BV1bpdAB8Ejp | S | 62 | # Codex实战：30分钟掌握 Codex 95% 的核心功能 |
| 16 | BV16e526iENH | S | 62 | # Codex实战：演示开发 一个手机App |
| 17 | BV1ik526cEsp | S | 62 | # Codex实战：用AI颠覆 视频剪辑流程 |
| 18 | BV1G9Gm6REdy | S | 58 | # Anthropic 刚以 3 亿美元收购了一家开发工具初创公司。以下是其创始人告诉我的内容。 |
| 19 | BV1CdGU6GE6m | S | 58 | # OpenAI 的 Yann Dubois：为什么 AI 的进步突然变得如此真实 |
| 20 | BV1zKDbBzEeT | S | 58 | # OpenAI前副总裁：AI走出比特世界 重构物理世界 |

## 收录口令（每 BV）

```bash
# Recastory 仓（已 ingest 可跳过 backfill）
python 99-System/scripts/bilibili-ingest-reconcile.py  # 对新 BV 需先写入 manifest vault_path
# vault 侧
# → ASR 分轨 SUBDOC → write dialogue 或九段 → gap-check
python 99-System/scripts/bilibili-v3-gap-check.py
```

## 已排除样例（勿重复收录）

- BV1Dj93BUEXU：OpenClaw 已收 3+1 篇 — # OpenClaw实战：Every团队演示使用Case
- BV1EJjN6XETy：低优先级形态: Dan Koe — # Dan Koe：把多重兴趣 变成一人公司
- BV1FNDbBgEkn：低优先级形态: AI创业思路 — # AI创业思路：23 个让我彻夜 难眠的AI趋势
- BV1G2Gn61E9b：低优先级形态: C\+\+之父 — # C++之父：贝尔实验室往事 AI代码的局限性
- BV1KQPyzcEwj：与 vault 32 篇角度重叠: a16z — # a16z合伙人：如何成为一名 伟大的创始人?
- BV1Ltw8zYErt：与 vault 32 篇角度重叠: openai评估 — # OpenAI评估团队：AI编程评估集 历史、现状与未来
- BV1NK5m61ErG：已有 OpenAI Codex 新手教程 — # Codex实战：AI编程2026 新手教程
- BV1NiooB5ESW：与 vault 32 篇角度重叠: openclaw创始人 — # OpenClaw创始人：Claw的现状报告，软件开发的逻辑变了
- BV1NscRzUEia：OpenClaw 已收 3+1 篇 — # OpenClaw实战：养虾指南！ 打造你的数字员工
- BV1T6Gd6qEyS：低优先级形态: AI创业思路 — # AI创业思路：9个最大的 AI创业点子