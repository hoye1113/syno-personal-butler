---
title: "B站图文专栏精华收录 dry-run"
tags: [notes, bilibili, ai_agent]
created: 2026-07-13
source: "Easonlee的AI笔记 B站 opus 页面"
description: "五篇真实图文专栏的只读路由实测；未读取图片、ASR或Recastory，未修改正式笔记。"
---

# B站图文专栏精华收录 dry-run

## 方法

只读取五篇公开 opus 的文字 DOM、标题、章节、人物标签和时间锚点。图片、评论、ASR、transcript 和 Recastory 全部跳过。BV 若无法从页面文字 DOM 直接确认，则按 C2 处理，不靠猜测升为 C1。

## 样本结果

| 专栏 | opus | 路由 | 结论 |
|---|---|---|---|
| Together AI：语音Agent 延迟、质量与规模 | `1224198797632995337` | C1 lecture | 01–06 为主题演讲，07–09 才是 Q&A；`unknown` 规范为“现场提问”，不改成 dialogue。BV 可由已有 canonical 映射为 `BV1U4Tz6CEzu`。 |
| DeepMind团队：当数百万 Agent相遇 | `1219939938135441409` | C1 dialogue | Hannah Fry 与 Nenad Tomašev 的真实访谈，八章围绕能力边界、委派、安全和分布式智能推进；BV 为 `BV1ixKX6oEzK`。 |
| Cursor CEO：重构AI编程 云端智能体上线 | `1220790337315799046` | C1 roundtable | Michael Truell、Kevin Niparko、Tomas Reimers 的独立观点与回应构成价值；BV 为 `BV18qTi6uEDX`。 |
| Gray Swan创始人：Codex之后 AI安全重写 | `1220682108464267319` | C1 roundtable | swyx 主持，Zico Kolter 与 Matt Fredrikson 分别提供安全研究立场；BV 为 `BV1uBTi6BEfd`。 |
| OpenAI PM：我如何使用Codex 研发产品 | `1222346069005828103` | C2 dialogue | Peter Yang 与 Rohan Varma 的真实访谈结构完整，但本次只读 DOM 未确认 BV，必须保留 C2，正式收录时补页面播放器元数据。 |

## 提炼观察

- 五篇都重复出现“摘要 + 重点速览 + 正文”，成稿只保留一次导航摘要，事实细节从正文抽取。
- 标题、章节和人物标签足以稳定判断正文形态，不需要按 Speaker 数量猜测。
- Together AI 证明“长演讲 + 末尾 Q&A”仍应保持 lecture。
- 图片没有进入抽取或验收，收录质量不依赖图片识别。
- 页面文字足以完成 Pass 1；只有 BV 或关键身份缺失时降为 C2，不回退 ASR。

## 固化样板

- lecture：Together AI。
- dialogue：DeepMind 团队。
- roundtable：Cursor CEO。

对应最小可验证 `.fixture` 位于 `tests/fixtures/bilibili_opus/`，只用于字段和路由测试，不进入 vault Markdown 审计。
