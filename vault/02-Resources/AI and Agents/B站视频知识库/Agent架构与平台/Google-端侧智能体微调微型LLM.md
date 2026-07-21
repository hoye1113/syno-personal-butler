---
title: "Google：端侧智能体微调微型 LLM"
tags: ["ai_agent", "video_transcript", "bilibili", "skills"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "foundation_models_on_device", "skills"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Cormac Brick：系统级 Gemini Nano vs 应用内 TLM；Gemma 技能框架与 load_skill；Function Gemma 2.7B 微调函数调用 46%→90%；离线 ASR+润色串联。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Google-端侧智能体微调微型LLM.md"
source_sha256: "19c077dc007673c42240943b817c9c5e84c89f9ece0bb7f7acd314d35b8b417b"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV13fGm6HETj/"
column_url: "https://www.bilibili.com/read/cv49801631/"
host_name: "Moderator"
guest_name: "Cormac Brick"
guest_title: "Google AI Edge 技术负责人"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV13fGm6HETj/ingest"
speaker: "Moderator / Cormac Brick"
duration: "21:01"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV13fGm6HETj/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV13fGm6HETj/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column solo keynote"
speaker_confidence: high
concepts:
  - id: system_vs_in_app_ai
    zh: 系统级 vs 应用内 AI
    en: system-level vs in-app AI
    one_line: Nano 预装省体积；TLM 随 app 定制
  - id: on_device_skills
    zh: 端侧技能框架
    en: on-device skills framework
    one_line: load_skill 动态加载，非预载全部
  - id: narrow_finetune_tlm
    zh: 微型模型窄域微调
    en: narrow finetune for TLM
    one_line: 1–2 亿参数必须合成数据专精
  - id: function_gemma_90
    zh: Function Gemma 90%+
    en: Function Gemma 90%+ tool success
    one_line: 2.7B 微调后函数调用超提示词大模型
author:
  - "[[Cormac Brick]]"
---

# Google：从 46% 到 90%——端侧智能体微调微型 LLM

**Host：** Moderator（Google AI Edge 现场）  
**Guest：** Cormac Brick（Google AI Edge 技术负责人）  
**形态：** Host-Guest v3.2（**专栏主源**）  
**B 站：** [BV13fGm6HETj](https://www.bilibili.com/video/BV13fGm6HETj/) · **时长** ~21 min

---

## 开场

端侧 Agent 要低延迟、隐私、离线、可靠。Cormac 带 **AI Edge 栈**（MediaPipe、LiteRT LLM、LiteRT runtime，27 亿+设备）。两条路：**系统级 Gemini Nano（AI Core）** vs **应用内微型 LLM（TLM）**；再加 **Gemma 技能框架** 与 **Function Gemma 微调**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| TLM | tiny LLM | 通常 <1B，可打进 app |
| AI Core | AI Core / Gemini Nano | 系统预装小模型 |
| LiteRT | LiteRT (ex-TFLite) | 跨平台模型运行时 |
| 技能 | skills | 按需 load_skill 的插件 |
| Function Gemma | Function Gemma | 2.7B 函数调用专精模型 |
| 合成数据微调 | synthetic finetune | Flash 生成数据集再训 |

---

## 01 系统级 Nano vs 应用内 TLM

**Cormac：** **系统级**：设备预装 Gemini Nano（摘要 API 等），高度优化、**不增大 app 体积**——能覆盖就用。**应用内**：LiteRT LLM 随 app 下载模型，**高度定制**、跨平台，但要自己集成。Edge 优势：低延迟、隐私、离线、省云成本（视场景）。

**小结：** 先问 Nano 够不够；不够再上 TLM 定制。

---

## 02 Gemma 技能：load_skill 而非预载一切

**Cormac：** **Google AI Edge Gallery** 开源 demo：在 AI Core 上跑 Gemma。技能例子——「餐厅轮盘」「地图导航」：系统提示 + 技能描述，模型内置 **load_skill** 工具调用；问办公室位置→加载地图技能→ **Show JS** 在 app 内嵌 JS UI。团队用 Gemini CLI **写了 80 个技能**；社区可从 URL/GitHub 加载自定义技能。

> **金句：** 几行提示 + 工具调用，就能在 Gemma 上搭可靠 Agent 框架。

**小结：** 技能 = 延迟加载的能力包，不是把所有工具塞进 context。

---

## 03 微型模型必须窄而深：合成微调

**Cormac：** 参数降到 **2 亿–1 亿**，通用能力塌缩——必须 **极窄任务 + 合成数据微调**。Function Gemma（**2.7B**，基于 Gemma 2）专精函数调用；旧机 Pixel 7 仍可达 ~2000 tok/s 预填充。

**App Intents 实验**：纯提示 **~46%** 成功率；用 **Flash 合成七函数数据集** 微调后，**10 个函数里 8 个 ≥90%**，另 2 个 ~80%。比给大模型写 system prompt **多几步活**，但 app 内可 **大规模可靠发布**。

**小结：** 端侧 tool calling：提示不够，微调来凑。

---

## 04 离线串联：ASR + 润色微型模型

**Cormac：** 另一 app：**ASR 引擎 + 文本润色引擎**（均几亿参数）串联，完全离线去口癖、识个人词典——证明 **多微型模型组合** 可打生产场景。

**小结：** 端侧 Agent 不必一个大模型包办。

---

## 总结

| 维度 | 要点 |
|------|------|
| 部署 | 系统 Nano 优先；定制用 TLM + LiteRT |
| 技能 | load_skill 动态加载 + 可选 JS UI |
| 微调 | 小模型窄任务；合成数据 |
| 数字 | Function Gemma 46%→90%+ |
| 组合 | ASR + 润色离线流水线 |

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 03:15 | 系统级 vs 应用内 |
| 06:42 | Gemma 技能框架 |
| 11:05 | TLM 窄域微调 |
| 13:50 | 46%→90% 函数调用 |
| 15:45 | 离线 ASR+润色 |

### 相关阅读

- [[Together AI-语音Agent延迟质量与规模]] — 云端实时语音 Agent 延迟预算
- [[OpenClaw创始人-我是如何使用OpenClaw的]] — CLI/技能链端侧对照
- [[MOC - Agent Theory and Design]]
