---
title: "B站专栏 v2 五篇只读 Dry-run"
tags: [notes, skills, ai_agent]
created: 2026-07-13
source: vault_initiative - bilibili_opus_v2_forward_test
description: "用五篇真实专栏验证 v2 路由、声音归属、查重和 Agent 入口一致性。"
---

# B站专栏 v2 五篇只读 Dry-run

## 方法

五篇均只读取专栏文字和页面元数据，不读取图片、ASR、Recastory 或 transcript。第一篇由三个独立 Agent 重复运行，用来检查入口和分类一致性；其余四篇覆盖真实对谈、多人发布会和 S级演讲重构。

## 结果

| opus | 内容 | MATCH | 路由 | 声音结论 |
|---|---|---|---|---|
| 1224198797632995337 | Together AI 语音 Agent | duplicate | C1 / A / lecture -> lecture / none-none | mixed；末尾 Q&A 不改变整篇字段 |
| 1219939938135441409 | DeepMind 数百万 Agent | duplicate | C1 / S / dialogue -> dialogue / source-column | direct_speech；专栏仍是第三方整理 |
| 1220790337315799046 | Cursor 云端 Agent 发布会 | duplicate | C1 / A / roundtable -> roundtable / source-column | direct_speech；Michael 不应机械标 Host |
| 1222346069005828103 | OpenAI PM 使用 Codex | no canonical | C1 / S / dialogue -> dialogue / source-column | direct_speech；删除赞助与编辑摘要 |
| 1222491144375500806 | Rely AI 持续学习 | no canonical | C1 / S / lecture -> dialogue / reconstructed-editorial | attributed_paraphrase；人名、品牌和数字有冲突 |

## 独立运行一致性

Together AI 的三次运行都正确发现 v2、命中 duplicate，并判断为 C1、A、source lecture、mixed voice。一次运行把末尾 Q&A 误映射成 note-level `question_source: column`；协议已补充为：字段描述整篇最终形态，`content_form: lecture` 必须使用 `none/none`，现场问答只在正文保留。

## 反哺

- 将 Together AI fixture 从 S-reconstructed 修正为 A-lecture。
- 将 Cursor fixture 从 S 修正为 A-roundtable。
- 将 DeepMind fixture 更新为真实 `source/column` 和 partial。
- 增加 Rely AI 的真实 S-reconstructed fixture。
- 保留技术步骤和 editorial-summary 两个合成边界 fixture，用于稳定测试不适合依赖实时网页的失败条件。

## 结论

所有运行都能从 AGENTS、Router、curate adapter、canonical Skill 自然进入专栏 v2，没有加载 Legacy 路线。MATCH 能阻止覆盖已有 canonical；来源形态与最终呈现分离后，A lecture、A roundtable、S source dialogue 和 S reconstructed dialogue 均能稳定表达。

## 相关阅读

- [[MOC - Agent Theory and Design]] — 本次工作流服务的 Agent 知识组织入口。
