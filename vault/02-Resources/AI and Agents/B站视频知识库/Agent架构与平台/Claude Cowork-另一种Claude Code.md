---
title: "Claude Cowork：另一种 Claude Code"
tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "harness_engineering"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Every vibe check：Dan×Karen×Anthony——Cowork 异步任务队列；Chrome 当 MCP；agent-native 四原则；黄灯执行绿灯理念。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Cowork-另一种Claude Code.md"
source_sha256: "2a20f46a16b6ce8386e6315fad6bd0e2c7e7f3be08f0ad0a1c7642aaff85f673"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1xEzqBVEeb/"
host_name: "Dan Shipper"
guest_name: "Anthony Morris"
guest_title: "Anthropic · Cowork 相关"
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1xEzqBVEeb/ingest"
speaker: "Dan Shipper / Karen / Anthony Morris"
duration: 92:45
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1xEzqBVEeb/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Host-Guest canonical (ASR primary)
speaker_inference: "asr_heuristic（Every vibe check live；Karen 共主持；Anthony Morris Anthropic）"
speaker_confidence: high
asr_version: v2
spot_check: 2026-07-06
concepts:
  - id: async_tasks
    zh: 异步任务
    en: async tasks / queue
    one_line: 丢出去再回来，不是一问一答锁死
  - id: agent_native
    zh: Agent 原生架构
    en: agent-native architectures
    one_line: UI 能做的 agent 也能做；工具低层可组合
  - id: yellow_green
    zh: 黄绿评级
    en: yellow / green vibe rating
    one_line: 执行黄、理念绿——值得继续实验
---

# Claude Cowork：另一种 Claude Code

**Host：** Dan Shipper（Every）· Karen  
**Guest：** Anthony Morris（Anthropic）  
**形态：** Host-Guest canonical v3.2（**ASR 主源**）  
**B 站：** [BV1xEzqBVEeb](https://www.bilibili.com/video/BV1xEzqBVEeb/) · **时长** ~93 min

---

## 开场

Anthropic 丢出 Cowork——「给非技术人的 Claude Code」。Every 抢先 vibe check：Dan 演示竞品研究、日历审计、PostHog 点按钮；Anthony 从产品侧接招。核心心智：**异步任务 + 队列**，不是聊天锁死。

五章：**三 C 与异步** → **现场用例** → **Agent-native 原则** → **工具粒度摩擦** → **黄绿评级**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 任务 vs 聊天 | tasks vs chats | 长跑可排队 |
| Agent 原生 | agent-native | agent 在底，功能是 prompt |
| 对等 | parity | UI 能做 agent 也能做 |
| 粒度 | granularity | 工具偏底层，功能在 prompt/skill |
| 涌现 | emerging capabilities | 用户干出你没想到的 |

---

## 01 心智切换：从几分钟回复到丢任务

**Dan Shipper：** 非技术用户习惯：发 prompt，几分钟内拿回复；那一轮占着，你不能再跟这个 AI 干别的。Cowork 为 **异步** 建：任务、队列、进度、artifacts。

桌面仍是三 C：Chat / **Cowork** / Code。文案像「敲掉待办」——建文件、啃数据、原型、发消息、整理文件。Karen：更像长跑工作，接近 Claude Code 的 plan / ultra think，但面向日常办公。

**小结：** Cowork 是「能跑很久的 chat + 电脑权限」。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 异步工作 | async agent work | 丢出去再回来 |
| 任务队列 | message queue | 跑着还能加指令 |

---

## 02 Demo：竞品、日历、PostHog、Chrome

**Dan：** 让它上 every.to 找五个竞品并分析定位——多分钟循环，像 Claude Code。Gmail 连接器 beta 不稳时，仍能起草「晚宴致辞回复」，语气像他。日历审计跑了约一小时：过去一个月是否对齐目标。

PostHog：没配 MCP，**Chrome 已登录**，agent 自己点——「Chat with Claude」按钮约 **4000** 次点击。Karen：多 tab 并行控制浏览器。研究文档「不惊艳但更穷尽」——深度靠跑得久，不靠另一个 magics 模型。

**小结：** MVP 集成 = 已登录的 Chrome；长任务是产品差异。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Chrome 当手 | Chrome connector | 没 MCP 也能逛 |
| 长跑研究 | long-running research | 迭代次数拉开差距 |

---

## 03 Agent 原生：对等、粒度、可组合、涌现能力

**Dan（对 Anthony）：** Every 的 agent-native 原则——**用户能在 UI 做的，agent 也要能做**（文件选择器可被 agent 代点）；**工具粒度低于功能**，功能活在 prompt/skill 里，才能组合出没预见到的路径；于是 **涌现能力**——用户干出你没设计的用例，再回头产品化。

**Anthony Morris：** 很共鸣。把工具压到通用空间，越可组合越吃模型智力红利——模型 tool-use 进步往往快过你堆新工具教用户。Slack 教训：你做了「更好」的独立表面，人仍回聊天。Excel 教训：通用工具里长出工作流，不必每件事拆成独立 SaaS。

**Karen：** 摩擦在 meta 层——skills 像 JIT prompt，旧世界「五个邮件 tool」vs「一个 execute + skills」之间扭着。

**小结：** 可组合底层工具 > 一堆有主见的端到端按钮。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 对等 | parity | UI 能力 = agent 能力 |
| 粒度 | granularity | 工具低、功能在 prompt |
| 涌现 | emerging capabilities | 用户发明用法 |

---

## 04 Tab 该不该拆：Excel vs 搜索框

**Karen / Dan：** 多一个 Tab 要先想去哪，烦。也可能像工程师从粘贴 ChatGPT → Cursor → 不看代码——知识工作也会从「盯着浏览器」变成「丢给 agent」。Anthony：Google 曾每个产品一个搜索框，后来统一；也有 Excel 永不拆的反例——深度熟悉压过边际 UX。

**小结：** 入口可能合并；深度工作流可能仍要专用表面。

---

## 05 黄灯执行、绿灯理念

**Dan：** 红黄绿/金牌？Opus 4.5 他们给过范式转移。Cowork？

**Karen：** **执行黄**（有点精灵灯、毛刺），**理念绿**——该让更多普通人感到「把事交给 agent」的范式。没见别家这么做。Anthony 已因直播反馈提 PR。Dan：这就是 Anthropic 的脉搏——自己用、听反馈、快迭代。

**小结：** 值得用；别当成品，当研究预览。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 黄绿评级 | yellow / green | 执行黄、理念绿 |
| 听反馈迭代 | ship and listen | 直播当场改产品 |

---

## 总结

1. **Cowork 的产品心智是异步任务**，不是同步聊天。  
2. **Chrome + 长跑** 已能做研究、分析、起草。  
3. **Agent-native：对等、低层工具、涌现**。  
4. Every 评级：**执行黄、理念绿**——继续实验。

---

## 附录

**Spot check（≥45 min）** 2026-07-06：对照 ASR 开场 async 定义、中段 PostHog/Chrome demo、Anthony 谈 composable tools、结尾黄绿评级与 agent-native guide；与视频简介「另一种 Claude Code」对齐。

**素材路径**

- ASR：`…/BV1xEzqBVEeb/article.md`
- ingest：`…/BV1xEzqBVEeb/ingest/`

**相关阅读**

- [[Claude Code之父-亲自讲解Cowork]]
- [[Cowork负责人-揭秘Cowork与Mythos]]
- [[Claude设计主管-Cowork揭秘40分钟教程]]
- [[MOC - Agent Theory and Design]]
- [[MOC - Harness Engineering]]
