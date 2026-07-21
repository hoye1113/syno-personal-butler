---
title: "Codex 实战：构建个人操作系统"
tags: ["ai_agent", "video_transcript", "bilibili", "skills", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "skills", "harness_engineering"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Marina × Peter：自我改进 skills；Substack 嗅探内部 API；AI 采纳五层；原则 Google Doc；Hermes 当参谋长。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-构建个人操作系统.md"
source_sha256: "d3e17d2a5da2a665732ce92aede23cfe9701bdbfa76b35a5ea5b8736cbc58e78"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1BHKX68Ee5/"
host_name: "Marina Mogilko"
guest_name: "Peter Yang"
guest_title: "创作者 · 前 Reddit/Meta 产品 · 14 万订阅 newsletter"
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1BHKX68Ee5/ingest"
speaker: "Marina Mogilko / Peter Yang"
duration: 29:34
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1BHKX68Ee5/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Host-Guest canonical (ASR primary)
speaker_inference: "asr_heuristic + Future Proof newsletter（Silicon Valley Girl / Marina）"
speaker_confidence: medium
asr_version: v2
concepts:
  - id: self_improving_skills
    zh: 自我改进技能
    en: self-improving skills
    one_line: 对话后让 AI 更新 skill，人审
  - id: five_layers
    zh: AI 采纳五层
    en: five layers of AI adoption
    one_line: 问答→日常工作→原型→App→个人 agent
  - id: personal_os
    zh: 个人操作系统
    en: personal OS folder
    one_line: Codex/Claude Code 下的 skills 目录
---

# Codex 实战：构建个人操作系统

**Host：** Marina Mogilko（speaker_confidence: medium）  
**Guest：** Peter Yang  
**形态：** Host-Guest canonical v3.2（**ASR 主源**）  
**B 站：** [BV1BHKX68Ee5](https://www.bilibili.com/video/BV1BHKX68Ee5/) · **时长** ~30 min

---

## 开场

Peter 十年产品（Reddit / Meta），现在一人 newsletter 约 14 万订阅，几乎全靠 AI。「员工不会离职，还指数变强。」Marina 要实操：自我改进 skills、个人 OS、五层采纳、Hermes 参谋长。

四章：**自我改进** → **创作者工作流** → **五层与 Personal OS** → **参谋长与一周行动**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自我改进技能 | self-improving skills | 用完再改 skill 文本 |
| 个人 OS | personal OS | 一个文件夹 + 一堆 skill |
| 原则文档 | principles Google Doc | 目标/原则/能量源 |
| Hermes | Hermes | IM 里的个人代理 |
| 最后 10% | last 10% human touch | 人味别 slop 掉 |

---

## 01 自我改进：用完就改 skill

**Marina：** 人人在谈 self-improving——普通人能用吗？

**Peter Yang：** Skill 就是一堆说明的文本文件。播客、newsletter 都有 skill。用完一轮（几乎从不一枪打中）就说：根据刚才对话，**更新 skill，争取下次更快一枪**。它改一堆，你审一遍。集成进工作后像作弊；也怕飞机上没网就不会干活了。

**小结：** 自我改进 = 反馈写回 skill，不是魔法在线学习。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自我改进技能 | self-improving skills | 对话→改 skill→人审 |
| learnings.md | learnings.md | 会话后沉淀短句 |

---

## 02 创作者流水线：嗅 API 与四平台同发

**Marina：** 今年最提效的三件事？

**Peter：** 取消会议一天，对 Codex **脑暴全部手工流程**。播客前后期、newsletter 编辑、社媒分发；顾问 skill 挂 Google Doc 商业信息。Substack Notes 没开放 API——让 Codex **浏览器嗅内部 API**，现在 X / LinkedIn / Threads / Substack 可同发；LinkedIn 打 tag 等细节写进 skill。仍草稿人审，不自动裸奔。分析：LinkedIn 多链接合集往往比单链好——他自己以前不知道。

Newsletter：散步脑暴 → Superwhisper 十分钟 → 贴进 Codex（怕直录 10 分钟搞懵上下文）→ 对照爆款例改 → 语音反馈 → **最后 10% 手改**。周报：收入、30 天内容、竞品频道——Substack 无 API 就 browser use。

**小结：** 一天清空会议 + 脑暴工作流，比再读十条推特管用。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 嗅内部 API | sniff internal APIs | 浏览器摸出发帖接口 |
| 最后 10% | human touch | 防 slop |

---

## 03 五层采纳与 Personal OS 文件夹

**Marina：** 五层是什么？

**Peter：** ① 日常问答 ChatGPT/Claude ② 项目里做日常工作（仍复制粘贴）③ 产品原型（截图→Lovable/Codex）④ 做 App ⑤ **个人 agent 自动化**。最实用一步：别再只开 ChatGPT/Claude 网页——上 **Codex 或 Claude Code**，建 `personal OS` 文件夹，问它能管哪些工作流。Newsletter skill 链：粗笔记→近三日研究→去 AI 腔→社媒改写。Podcast：调研嘉宾、缩略图标题测试、后期、赞助排期。Skill 尽量 **一页内**，另有「skill 清洁工」去重、去 slop。

**小结：** Level 5 入口是换工具 + 一个文件夹，不是再上一门课。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 五层采纳 | five layers | 问答→agent |
| Personal OS | personal OS folder | skills 集合 |

---

## 04 原则文档与 Hermes 参谋长

**Marina：** 战略顾问 skill？

**Peter：** Google Doc 一页：目标、原则（「主线就是主线」——少接会、少写书冲动）、财务、**什么给能量/耗能量**。顾问 skill 引用它。他用 **Hermes**（比 OpenClaw 稳一点）挂 Telegram——战略决策发生在 Zoom/Telegram，想让 AI 学决策风格。有人周日扫 Slack 找卡住的交付——输入输出想清楚再 hook。

一年后：solopreneur 时代，agent 干不想干的，留下有能量的；怕孩子跳过基础思维——激进想法是让孩子多失败、多造。行动：买 20 刀档、下 Codex，**从消费模式切到建造模式**；系统要先种一天才结果，耐心反馈进 skill。

**小结：** 原则文档是所有 agent 的北极星；Hermes 是入口之一。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 原则文档 | principles doc | 决策约束 |
| AI 参谋长 | AI chief of staff | 跨 Slack/会议盯进度 |

---

## 总结

1. **自我改进 = 对话后改 skill 文件**。  
2. **Personal OS** = Codex/Claude Code 下的 skills 树。  
3. **五层**里，换 agent 工具是最大跃迁。  
4. **原则 Google Doc + 最后 10% 人味** 防 slop 与失焦。

---

## 附录

**素材路径**

- ASR：`…/BV1BHKX68Ee5/article.md`
- ingest：`…/BV1BHKX68Ee5/ingest/`

**相关阅读**

- [[Hermes Agent-新OpenClaw体验]]
- [[Codex实战-30分钟掌握95%核心功能]]
- [[OpenClaw创始人-我是如何使用OpenClaw的]]
- [[MOC - Agent Theory and Design]]
