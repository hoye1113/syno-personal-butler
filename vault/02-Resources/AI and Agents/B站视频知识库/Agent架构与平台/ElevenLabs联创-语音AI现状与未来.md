---
title: "ElevenLabs 联创：语音 AI 现状与未来"
tags: ["ai_agent", "video_transcript", "bilibili"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "No Priors：Sarah × Mati——三年 ~$300M ARR；波兰配音洞察；lab 模式；声音侍酒师；模型商品化后产品与生态护城河。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/ElevenLabs联创-语音AI现状与未来.md"
source_sha256: "2179b9be9c1951ed108cc4c8d30e8c9fbe22c2f366b54d59b462ddbcf5bb06ef"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV12irNBtE7D/"
column_url: "https://www.bilibili.com/read/cv44859957/"
host_name: "Sarah Guo"
guest_name: "Mati Staniszewski"
guest_title: "ElevenLabs 联合创始人兼 CEO"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV12irNBtE7D/ingest"
speaker: "Sarah Guo / Mati Staniszewski"
duration: 41:39
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV12irNBtE7D/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article 主持人/嘉宾（No Priors Ep.143）"
speaker_confidence: high
concepts:
  - id: voice_as_ui
    zh: 语音即界面
    en: voice as ultimate UI
    one_line: 电脑、机器人、沉浸媒体的交互层
  - id: voice_sommelier
    zh: 声音侍酒师
    en: voice sommelier
    one_line: 帮企业按品牌与人群选声
  - id: lab_model
    zh: 实验室模式
    en: lab model
    one_line: 研究与产品并行，快速响应需求
---

# ElevenLabs 联创：语音 AI 现状与未来

**Host：** Sarah Guo（No Priors）  
**Guest：** Mati Staniszewski（ElevenLabs CEO）  
**形态：** Host-Guest canonical v3.2（**专栏主源**）  
**B 站：** [BV12irNBtE7D](https://www.bilibili.com/video/BV12irNBtE7D/) · **时长** ~42 min  
**专栏：** [cv44859957](https://www.bilibili.com/read/cv44859957/)

---

## 开场

成立约三年，**ARR 超 3 亿美元**。Sarah 与 Mati 谈：语音如何改人机互动；研究与产品怎么并行；教育导师、代理政府、模型商品化后护城河在哪。

四章：**公司与市场洞察** → **Lab 与质量** → **场景与界面** → **竞争与护城河**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| ARR | annual recurring revenue | 年化经常性收入 |
| 声音侍酒师 | voice sommelier | 帮选品牌声线 |
| 级联 vs 端到端 | cascade vs speech-to-speech | 企业可靠 vs 更表现力 |
| 代理政府 | agentic government | 公共服务 agent 化 |

---

## 01 三年：350 人与一半自助一半企业

**Sarah Guo：** 重新介绍一下公司？

**Mati Staniszewski：** 做人与技术如何互动、如何无缝创作——建**基础音频模型**：像人的语音、更好理解语音、编排交互，再叠产品。创意平台：有声书、广告、电影配音与多语言；代理平台：客户体验、教育、沉浸媒体。全球约 **350 人**，远程为主（伦敦最大）。**ARR ~$3 亿**：约一半自助订阅与创作者，一半企业销售；创意侧 500 万+ MAU，企业数千家客户。

起源反直觉：投资者会问「谁真想做语音」。波兰电影配音常**一个配音员念所有角色**——难听，学会英语就看原版。洞察是：**高质量支持每种语言，翻译时保留原声、情感、语调**。播客可切西班牙语仍是 Sarah / Mati 的声线。创作侧：配音棚与工具太贵，应让热情新手也能把声音做出来。

**小结：** 市场远大于传统配音；语音是全球内容与交互的基础设施。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 保留声线的翻译 | voice-preserving dubbing | 同声线跨语言 |
| 双引擎收入 | self-serve + enterprise | 创作者 + 销售 |

---

## 02 Lab 模式与声音侍酒师

**Sarah：** 研究与产品怎么同时扛？

**Mati：** 和联合创始人认识 15 年——一人扛研究底座。设 **lab 模式** 快速响应市场，又在 TTS/STT/编排基准上压对手。质量评估仍难：企业常不知道选哪条声——**声音侍酒师**团队按品牌、用例、人群（老人/年轻人）动态调，甚至机械声特殊需求。

选方案时别只看模型分：平台开放性、国际化、用例广度、部署陪跑都算。

**小结：** 质量是服务问题，不只是模型榜。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 实验室模式 | lab model | 研究与产品并行 |
| 声音侍酒师 | voice sommelier | 企业选声顾问 |

---

## 03 语音界面：导师、客服、政府

**Sarah：** 一切都会拟人化吗？

**Mati：** 不。烤箱可以仍呆；机器人、个人助手、**教育导师**会更拟人。代理从被动支持转向主动；全球破语言墙。乌克兰等在探索**代理政府**公共服务框架。客服、内训、销售互动可从工单式变成主动个性化。

**小结：** 语音是终极 UI 之一，但不是每台烤箱都要人格。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 语音界面 | voice as UI | 交互默认层 |
| 主动代理 | proactive agents | 导师/客服不等你问 |

---

## 04 模型会商品化，护城河在产品层

**Sarah：** 怎么和 OpenAI 等基础模型公司打？

**Mati：** 超能力仍是基础音频模型——无缝、人性、可控。但长期看**模型会商品化**；实验室公司不擅长的产品层、集成、生态、先发，才是护城。语音到语音融合可能更有表现力；**级联**在企业场景仍更可靠。

**小结：** 模型是门票；集成与生态是城墙。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 模型商品化 | models commoditize | 分差缩小 |
| 产品护城河 | product / ecosystem moat | 集成与用例 |

---

## 总结

1. **~$300M ARR / 3 年**：创意 + 企业双轮。  
2. **波兰配音痛点** 打开「保留声线的全球内容」市场。  
3. **Lab + 声音侍酒师** 把质量做成可交付服务。  
4. **模型会商品化**——押产品、集成、生态。

---

## 附录

**素材路径**

- 专栏主源：`…/BV12irNBtE7D/ingest/column_article.md`
- 专栏 URL：https://www.bilibili.com/read/cv44859957/

**相关阅读**

- [[Together AI-语音Agent延迟质量与规模]]
- [[MOC - Agent Theory and Design]]
