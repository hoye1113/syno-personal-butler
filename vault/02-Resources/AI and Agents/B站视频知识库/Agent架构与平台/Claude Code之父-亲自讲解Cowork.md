---
title: "Claude Code 之父：亲自讲解 Cowork"
tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "skills"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "skills"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Greg × Boris：Cowork=同一 Claude agent 的 UI；文件夹 opt-in、VM、反向征求；技能后置；CLAUDE.md / plan mode / 可验证输出。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code之父-亲自讲解Cowork.md"
source_sha256: "c7dcf8d29e3e7c1b6b202d7f996d438b43eacf88106f9c2ee7bd09af81921514"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV19uzXBeEMp/"
host_name: "Greg Isenberg"
guest_name: "Boris Cherny"
guest_title: "Claude Code 创造者 · Cowork 共创"
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV19uzXBeEMp/ingest"
speaker: "Greg Isenberg / Boris Cherny"
duration: 42:08
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV19uzXBeEMp/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Host-Guest canonical (ASR primary)
speaker_inference: "asr_heuristic（Greg / Startup Ideas；Boris 自报）"
speaker_confidence: high
asr_version: v2
concepts:
  - id: cowork_is_agent
    zh: Cowork 即 Claude agent
    en: Cowork is Claude agent under UI
    one_line: 桌面里的 Claude Code，面向所有人
  - id: reverse_solicitation
    zh: 反向征求
    en: reverse solicitation
    one_line: 不确定就问人，不瞎猜
  - id: verify_output
    zh: 可验证输出
    en: give a way to verify
    one_line: 浏览器/测试当眼睛，别蒙眼画画
---

# Claude Code 之父：亲自讲解 Cowork

**Host：** Greg Isenberg（Startup Ideas）  
**Guest：** Boris Cherny  
**形态：** Host-Guest canonical v3.2（**ASR 主源**）  
**B 站：** [BV19uzXBeEMp](https://www.bilibili.com/video/BV19uzXBeEMp/) · **时长** ~42 min

---

## 开场

Claude Code 火了，但终端劝退爸妈。Cowork 把同一套 agent 放进桌面 UI。Greg 请 Boris 现场 demo：收据重命名、表格、浏览器；后半段拆他那条爆款推文——CLAUDE.md、plan mode、给模型验证手段。

四章：**Cowork 是什么** → **文件与安全** → **技能与简单优先** → **Claude Code 工作流金句**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| Cowork | Claude Cowork | 非技术向的 Claude agent UI |
| Claude Agent SDK | Claude Agent SDK | 同一 agent，可编程 |
| 反向征求 | reverse solicitation | 不确定就问 |
| 虚拟机 | VM under the hood | 动作隔离 |
| CLAUDE.md | CLAUDE.md | 团队知识库文本 |

---

## 01 桌面三 Tab：Chat / Cowork / Code

**Greg Isenberg：** 这集结束听众能带走什么？

**Boris Cherny：** 更多用法灵感——最好推特告诉我，我好学他们真正想要什么。Claude Code 一开始不是产品；以为人只用来写码，结果被滥用成各种事。Cowork 也一样，他只有假设。

桌面 App（先 Mac，Windows 随后）：Chat、**Cowork**、Code。**Cowork 底层就是 Claude Code**——同一 Claude agent，也以 SDK 形式给公司二次开发。Agent 的意思被用滥了：真正差别是**能行动**——用电脑上的工具，不只聊天和搜网页。Anthropic 从模型还弱时就押 coding、tool use、computer use。

**小结：** Cowork = 同一 agent 的「人人可用」皮肤。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 同一 Agent | same Claude agent | Code / Cowork / SDK 同源 |
| 能行动 | take action | 文件、MCP、Chrome |

---

## 02 收据 Demo：opt-in 文件夹与反向征求

**Greg：** 它是不是像操作系统？

**Boris：** 默认**看不见任何文件夹**，你 opt-in 指定目录。他给桌面 `Receipts`：按收据日期重命名。一张缺日期——模型问：其余改不改？他选「你定」和「这张别改」。这叫 **reverse solicitation**：不确定就问，不瞎猜。

下一步：做成表格、再做成 Google Sheet——**Chrome 接管**，权限可 once / always / deny。早期 Sonnet 订菠萝披萨要一小时；现在仍慢，但在迭代。并行：一个任务跑着，再开新任务。

安全：对齐与可解释、**底层 VM**、删除保护、注入防护——不完美，所以早发，要在野外学。

**小结：** 心智模型是「操作系统级队友」，不是聊天框。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 文件夹选择 | folder opt-in | 默认零可见 |
| 反向征求 | reverse solicitation | 不确定就问 |
| 计算机使用 | computer use | 浏览器当手 |

---

## 03 技能：先简单，卡住再写

**Greg：** 扩展、技能还要先配吗？

**Boris：** 工程师爱 hack——Claude Code 有 skills、hooks、权限、海量设置。Cowork **反着来：先极简**。装好 + Chrome 扩展通常够用。某软件 Cowork 不熟时再写 skill（AutoCAD、销售工具……）。第一周增长已是 Claude Code 首周的数倍。一年后什么样？他只敢按周规划——指数难用肉脑线性外推。他自己近两个月 **100% 代码由 Claude Code 写**，手没写一行——这是中期就押过的指数曲线。

**小结：** Cowork 入门别定制；技能是「卡住再写」。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 简单优先 | start simple | 先用，再写 skill |
| 指数难规划 | exponential planning | 一周时间线 |

---

## 04 爆款推文：CLAUDE.md、Plan、可验证

**Greg：** 那条九万收藏的 setup 帖？

**Boris：** 团队共享一份 **CLAUDE.md** 进 git，错一次就补一条——「别再犯」。纯文本，无特殊格式。Code review 里 `@claude` 让 GitHub Action 改 PR / 补 MD——他叫这是 Dan Shipper 式 **compound engineering**（推文里拼写还写错过）。多数会话从 **plan mode** 开始，计划满意再 auto-accept。性能三件套：**Opus + thinking**、好 CLAUDE.md、**给验证手段**（Chrome 看自己的站、跑测试）——蒙眼画家画不好写实。

**小结：** 知识库 + 计划 + 眼睛，比换模型玄学更管用。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 团队 CLAUDE.md | shared CLAUDE.md | 错一次写一次 |
| 计划模式 | plan mode | 先谈计划再动手 |
| 可验证输出 | verify output | 浏览器/测试当眼睛 |

---

## 总结

1. **Cowork = Claude Agent 的桌面形态**，不是另一套模型。  
2. **文件夹 opt-in + VM + 反向征求** 是安全与体验的核心。  
3. **先简单**；技能与定制后置。  
4. Claude Code 侧：**CLAUDE.md、Plan、可验证** 仍是 Boris 的三板斧。

---

## 附录

**素材路径**

- ASR：`…/BV19uzXBeEMp/article.md`
- ingest：`…/BV19uzXBeEMp/ingest/`

**相关阅读**

- [[Claude Code负责人-创造内幕]]
- [[Claude Cowork-另一种Claude Code]]
- [[Cowork负责人-揭秘Cowork与Mythos]]
- [[MOC - Agent Theory and Design]]
