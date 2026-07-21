---
title: "Claude Code 实战：用 AI 实现生活自动化"
tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "mcp", "skills"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "mcp", "skills"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV1oZ536AE4T/"
description: "Peter Yang × Moritz Kremb：OpenClaw vs Claude Code 选幕僚长；Claudia 文件夹 OS、MCP/CLI/Google Workspace、心跳与例程、短视频内容机器与渐进式技能堆叠。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code实战-用AI实现生活自动化.md"
source_sha256: "c5d234d1894a2f8119e732157194bae420fc03c8575effc68c19f50d55a710a7"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1oZ536AE4T/"
column_url: "https://www.bilibili.com/read/cv49005434/"
source_original_date: "2026-05-09"
host_name: "Peter Yang"
guest_name: "Moritz Kremb"
guest_title: "Claude OS / Claudia 实践者 · OpenClaw 与 Claude Code 双栈用户"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1oZ536AE4T/ingest"
speaker: "Peter Yang / Moritz Kremb"
duration: "40:00"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1oZ536AE4T/article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1oZ536AE4T/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article Host/Guest 标注；Host 为 Peter Yang"
speaker_confidence: high
author:
  - "[[Moritz Kremb]]"
concepts:
  - id: claude_os
    zh: Claude OS
    en: Claude OS / Claudia
    one_line: 用文件夹+技能+工具清单把 Claude Code 搭成个人操作系统
  - id: heartbeat
    zh: 心跳
    en: Heartbeat
    one_line: OpenClaw 默认约每 30 分钟上线执行 Heartbeat.md 里的例行工作
  - id: tools_md
    zh: 工具清单
    en: "1tools.md"
    one_line: 每加 MCP/CLI 就写入清单，会话才能稳定知道能调什么
  - id: memory_loop
    zh: 记忆循环
    en: "memory loop / dream"
    one_line: 每日记忆落盘，夜间例程压缩进长期记忆
  - id: content_machine
    zh: 内容机器
    en: "content machine"
    one_line: 灵感捕捉→周计划→脚本→拍摄→分发的半自动短视频线
  - id: progressive_skills
    zh: 渐进式技能
    en: "progressive skills"
    one_line: 先搭骨架，再挑最耗时重复环节逐个做成 skill
---

# Claude Code 实战：用 AI 实现生活自动化

**Host：** Peter Yang  
**Guest：** Moritz Kremb（Claude OS / Claudia 实践者）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文）  
**主源：** Recastory `bilibili-retranscribe/BV1oZ536AE4T/ingest/column_article.md`  
**B 站：** [BV1oZ536AE4T](https://www.bilibili.com/video/BV1oZ536AE4T/) · **专栏：** [cv49005434](https://www.bilibili.com/read/cv49005434/) · **时长** ~40 min

---

## 开场：幕僚长该放 OpenClaw 还是 Claude Code？

第一世界问题：个人幕僚长到底挂在 **OpenClaw** 还是 **Claude Code**？Moritz 两边都跑过——邮件日历还在 OpenClaw，构建与可靠性更信 Claude Code；他甚至在 Claude 里复刻了一套叫 **Claudia** 的 OS。

六章：**OpenClaw 移动端与心跳** → **Claude Code 可靠性与本地 CLI** → **文件夹即 OS** → **MCP/CLI 扩边界** → **内容机器** → **从最耗时任务开始堆技能**。

**Peter Yang：** 你怎么同时用两套，还不把自己绕晕？

**Moritz：** 纠结「选一个」没那么重要。OpenClaw 更像部署在另一台机器上的**员工**；Claude Code 更像主机器上的**增强工具**。OpenClaw 不稳的时候，我就在 Claude 里复刻一套 OpenClaw 式系统——两边并行。

| 中文 | 英文 | 白话 |
|------|------|------|
| 心跳 | Heartbeat | 定时主动醒来执行例行任务（约 30 分钟） |
| 例程 | Routine | Claude Code 的定时自动化（本地或远程） |
| Claude OS | Claude OS / Claudia | 文件夹+指令+工具+记忆组成的个人 OS |
| 工具清单 | 1tools.md | 所有可用 MCP/CLI 的登记表 |
| 记忆循环 | memory loop | 每日摘要 → 压缩进长期记忆 |
| 技能 | Skills | 可复用的工作流封装 |
| 子代理 | Sub-agents | 分离起草与审阅等上下文 |

---

## 01 移动端与心跳：OpenClaw 仍赢的两张牌 [02:15]

**Peter：** OpenClaw 到底还剩什么硬优势？

**Moritz：** 第一是**移动访问**。它天生接 Telegram、Discord、Slack——像在 Telegram 里跟朋友说话。Claude Code 有 Dispatch、Telegram/Discord 插件，能用，但还是编码优先界面，不像发短信。Dispatch 把你锁在他们的 App 里，自由度差一截。

第二是 **心跳**。默认大约每 30 分钟触发，按 Heartbeat.md 干活——始终在线的感觉。Claude Code 有 Loop、例程，但 Loop 大约三天就关，不是为心跳设计的。OpenClaw 适合跑在独立设备或 VPS 上，**cron 也更简单**；Claude Code 的例程分本地和云托管，配置更绕。

**Peter：** 心跳里你放什么？

**Moritz：** 早期 OpenClaw 记忆差，我就让心跳检查会话、写进每日记忆；待办也放进去——它主动看我在干啥，自动划掉完成项。子代理？Twitter 上吹得很凶，多数人其实**不需要**——一个主代理 + 不同群组就够。只有要**硬拆上下文**时才值得，比如起草和审阅分开，避免自评偏见。

**金句：** OpenClaw 像「始终在线的员工」；Claude Code 像「主机器上的增强工具」。

**小结：** 移动端 + 心跳 + 简单 cron，仍是 OpenClaw 的护城河。

---

## 02 Claude Code：可靠性、模型与本地 CLI [08:40]

**Moritz：** 对我来说最大优点是**可靠性**。OpenClaw 还会随机崩、更新后坏、模型突然停。Anthropic 切断部分访问后，很多人转 Claude Code——大家觉得 OpenClaw 爽，很大程度是因为 Opus。

**Peter：** 安全呢？它老让你点批准。

**Moritz：** 更安全，有时也烦人。我把绕过权限设成常开，顺手但更险。关键是：Claude Code 跑在**本地机器**，能直接调本地 CLI；Cowork 每次沙盒，CLI 玩不转。可靠性是我把不少 cron 迁到 Claude Code 的原因。

**金句：**「想开发东西用 Claude Code；想要像员工一样常驻，OpenClaw 更像那条路。」

**小结：** 稳、本地 CLI、可信任访问 G 盘——这是 Moritz 更信 Claude Code 的理由。

---

## 03 结构化文件夹：Claudia 的操作系统骨架 [15:20]

**Moritz：** 实例叫 **Claudia**。UI 层用新桌面 App（侧边多窗、看文件/计划）；深挖文档编辑才切 Cursor / VS Code 扩展——有趣的是，我有段时间几乎**不拿它写代码，当 Obsidian 用**。

骨架照搬 OpenClaw 思路：

- **Claude.md**（对应 OpenClaw 的 Agents.md）——每会话先读，像系统提示，再引用其它文件  
- **身份 / Soul / User.md** — 个性与「关于我」  
- **`1tools.md`** — 每加 MCP/CLI 就写进去  
- **记忆文件夹** — 每日记忆；夜间例程「做梦」：检查每日记忆，写进长期记忆一两行  
- **`.env`** — 密钥我手写进文件，不经聊天框；清单上还有 1Password 独立保险库方案  

**Peter：** Memory.md 不会无限膨胀吗？

**Moritz：** 提示词要求只写一两行。到极限再上 QMD 一类方案。

**金句：**「先有结构，再一个接一个接工具。」

**小结：** OS 不是模型魔法，是**可加载的上下文契约**——指令入口、工具清单、跨会话记忆。

---

## 04 MCP 与 CLI：扩展物理边界 [21:45]

**Peter：** 演示里你怎么从 Instagram 视频直接出脚本进 G 盘？

**Moritz：** **TalkScript** MCP 拿转录 → Claude 写脚本 → Google Workspace 工具写进「Claude 内容系统」文件夹。Google Workspace 是我目前最强工具——我从没完全接受「一切只在本地 Markdown」。云盘手机随时看。

**选型原则：** 找新软件先问有没有 **CLI / MCP / API**，三样至少占一样。技能（Skills）把重复流程固化——比如 `rewe_grocery` 浏览器技能：上周订单再入购物车，再搜新物品，最后等人批准。

**Peter：** OpenClaw 你不敢给整盘，Claude Code 你更敢？

**Moritz：** 对，到目前为止更信任。

**小结：** 连接能力决定 OS 上限；工具清单 + 技能 = 可复用边界。

---

## 05 内容机器：灵感到全平台发布 [28:10]

**Moritz：** 短视频线本质是**一串技能**：

1. **捕捉灵感** — Telegram 子话题；Twitter 私信机器人捞灵感（收藏夹是坟墓，没好 API）  
2. **周计划** — 从想法夹生成周一到周日排期  
3. **写脚本** — 对照历史脚本库，可自动日更草稿  
4. **拍摄** — 手机念稿，UGC 风  
5. **上传工作流** — 一句话创建云盘文件夹（从脚本抽命名）  
6. **分发** — 编辑回链后，CLI（如 Post.news）推 YouTube / Instagram / TikTok  

远程例程例子：**YouTube 监控器**——每周抓竞品频道进表（播放/赞/评），找灵感。

**金句：**「SaaS 很难适配每个创作者的怪癖；有 CLI/API 的 Agent，你就按自己的怪癖搭。」

---

## 06 渐进式构建：先啃最耗时的那块 [38:50]

**Moritz：** 不必一次建成。先搭文件夹骨架，再找日常里**占比最高、最重复**的环节——杂货、文件整理、视频上传——做成技能，织成网。

**Peter：** 给还在观望的人一句？

**Moritz：** 邮件日历可以继续放 OpenClaw；要稳、要本地 CLI、要当「构建面」，用 Claude Code 搭 Claudia。两边可以同时活。

---

## 总结

| 维度 | 要点 |
|------|------|
| OpenClaw 赢 | 移动聊天体验、原生心跳、简单 cron、常驻员工感 |
| Claude Code 赢 | 可靠性、本地 CLI、可信任的文件/云盘操作、桌面 UI |
| OS 骨架 | Claude.md + 1tools.md + 记忆循环 + .env |
| 扩展 | MCP / CLI / API 三选一；Skills 固化重复流 |
| 内容线 | 捕捉→计划→脚本→拍摄→上传→多平台分发 |
| 策略 | 渐进：骨架 → 最痛任务 → 互联网络 |

---

## 附录

### 章节时间戳（专栏导读）

| 时间 | 主题 |
|------|------|
| 02:15 | 移动端与心跳：OpenClaw 优势 |
| 08:40 | Claude Code 可靠性与安全 |
| 15:20 | 结构化文件夹 / Claude OS |
| 21:45 | MCP 与 CLI 扩展边界 |
| 28:10 | 自动化内容机器 |
| 38:50 | 渐进式构建 |

### 路径

- ingest：`Recastory/workspace/bilibili-retranscribe/BV1oZ536AE4T/ingest/`
- 专栏：`column_article.md` · ASR：`article.md`

### 相关阅读

- [[OpenClaw创始人-我是如何使用OpenClaw的]]
- [[Claude Code实战-鲜为人知的Claude Code工作流]]
- [[Claude Code实战-Gstack把AI变成团队]]
- [[Cowork负责人-揭秘Cowork与Mythos]]
- [[MOC - Harness Engineering]]
