---
title: "Hermes Agent：新的 OpenClaw 体验？"
tags: ["ai_agent", "video_transcript", "bilibili", "skills", "memory"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "skills", "memory"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Greg × Imran：Hermes 用 SQLite 记忆压过 OpenClaw；OpenRouter 砍 90% 成本；Termux 安卓常在线；Obsidian 面板；GStack 技能化思维。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Hermes Agent-新OpenClaw体验.md"
source_sha256: "8266d6357380f0eed225b9d9cf6c7c4e49d1cc365c7ac6c956d6de2d177aa29a"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1nyo1BuEd9/"
column_url: "https://www.bilibili.com/read/cv48254873/"
host_name: "Greg Isenberg"
guest_name: "Imran Muthuvappa"
guest_title: "Alif 基金 · Hermes 实践者"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1nyo1BuEd9/ingest"
speaker: "Greg Isenberg / Imran Muthuvappa"
duration: 37:01
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1nyo1BuEd9/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article 主持人/嘉宾标签"
speaker_confidence: high
concepts:
  - id: sqlite_memory
    zh: SQLite 记忆
    en: built-in SQLite memory
    one_line: 任务日志可搜，随用变聪明
  - id: code_not_llm
    zh: 确定性任务写代码
    en: code over LLM loops
    one_line: 能写脚本就别反复烧 token
  - id: skillification
    zh: 技能化
    en: skillification
    one_line: 把生活摩擦点封成 skill
---

# Hermes Agent：新的 OpenClaw 体验？

**Host：** Greg Isenberg  
**Guest：** Imran Muthuvappa（Alif）  
**形态：** Host-Guest canonical v3.2（**专栏主源**）  
**B 站：** [BV1nyo1BuEd9](https://www.bilibili.com/video/BV1nyo1BuEd9/) · **时长** ~37 min  
**专栏：** [cv48254873](https://www.bilibili.com/read/cv48254873/)

---

## 开场

人们管 Hermes 叫「OpenClaw 杀手」。Greg 拉来 Imran 做实操：安装、接 Garry Tan 的 GStack、绑 Obsidian、写技能，甚至安卓。Imran 的立场很硬——**价值不在聊天，而在记忆 + 代码化工作流**，把高频事变成低成本确定性自动化。

五章：**为何离开 OpenClaw** → **OpenRouter 砍成本** → **安卓常驻** → **Obsidian 控制台** → **技能化**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| Hermes Agent | Hermes Agent | 带内置记忆的个人代理 |
| OpenClaw | OpenClaw | IM 前端 + 本地 agent（对照系） |
| OpenRouter | OpenRouter | 按任务切模型、压 token 成本 |
| Termux | Termux | 安卓上跑 Linux 环境 |
| GStack | GStack | Garry Tan 侧创业决策技能栈 |
| 技能化 | skillification | 摩擦点 → skill |

---

## 01 离开 OpenClaw 的三个理由

**Greg Isenberg：** Hermes 是新的 OpenClaw 吗？用最清楚的话讲，听到结束我就能在电脑上跑起来。

**Imran Muthuvappa：** 我用 OpenClaw 撞上三堵墙。一，**没有内置记忆**，同一件事说了一遍又一遍。二，网关老要重启，有一天几乎每小时重启，设置时间比改善生活的时间还多。三，**token 烧得飞起**，还不知道为什么。

后来试过 Nebula——想造 AI 同事可以看它；想要**个性化、会随时间学习**的系统，我押 Hermes。它在三件事上对症：内置记忆（成功任务自动入库）、**标准 SQLite**（可搜历史日志，连曾传过的密钥都能捞）、稳定性（他已一周多没重启）。内置 40+ 工具、预装 Apple Notes / Reminders / iMessage 等技能，不用满世界找包。

**小结：** 选生态别跳来跳去；记忆 + 稳定 + 内置工具是门槛。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 内置记忆 | built-in memory | 成功即写入，可检索 |
| 网关重启地狱 | gateway restart loop | 设置时间 > 使用收益 |

---

## 02 OpenRouter：五天 130 刀砍到 10 刀

**Greg：** 成本怎么压？

**Imran：** 接 **OpenRouter**，按任务复杂度切模型——免费 Nemotron、便宜 Qwen 都行。更关键的方法论：**确定性任务让 agent 写代码执行，别让 LLM 每步都烧**。他的开销从大约 **每五天 130 美元降到 10 美元**，约 **90%** 削减。

**小结：** 路由模型 + 「能写代码就别纯 LLM」是省钱主轴。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 模型路由 | OpenRouter routing | 难用贵模型，易任务用便宜 |
| 代码化工作流 | code over LLM loops | 确定性路径写死 |

---

## 03 Termux：安卓上的低功耗常在线代理

**Greg：** 一定要 Mac Mini 吗？

**Imran：** **Termux 跑在安卓**上：传感器、短信、电池都能碰。比 Mac Mini 便宜，还能做硬件级自动化——比如自动处理双重验证短信。社交媒体脚本在设备端跑，少踩「调 API 被降权」的坑。真正的「始终在线」可以是一部旧手机，不是又一台桌面机。

**小结：** 个人 agent 的「服务器」可以是口袋里的安卓。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Termux 部署 | Termux on Android | 手机当低功耗 agent 主机 |
| 设备端发布 | on-device social scripts | 少走易被限的 API |

---

## 04 Obsidian：从 Telegram 过载到知识面板

**Greg：** 界面怎么不炸？

**Imran：** Telegram 信息会淹。把 Hermes 和 **Obsidian** 绑死：每日摘要、旅行计划、待办用 Markdown 落盘。喂 **7 到 20 天**，agent 开始懂你的生活节奏，主动生成结构化知识库。聊天是入口，**笔记库是控制台**。

**小结：** 个人 OS 的 UI 可以是文件夹，不是对话框。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Obsidian 面板 | Obsidian control plane | Markdown 当任务与知识面 |
| 持续喂养 | 7–20 day priming | 节奏被 agent 学会 |

---

## 05 技能化：把 YC 方法论塞进代理

**Greg：** GStack 是什么？

**Imran：** 接 **Garry Tan 的 GStack**，Hermes 能模拟 YC 级决策流程。AI 时代的竞争力是 **技能化**：发现重复摩擦（财报分析、冰箱配菜），封成 skill，把认知带宽还回来。Agent 的价值不在「会聊」，而在「高频事变成低成本确定性自动化」。

**小结：技能化 = 个人代理的护城河。**

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 技能化 | skillification | 摩擦点 → 可复用 skill |
| GStack | GStack | 创业决策技能包 |

---

## 总结

1. **记忆是分水岭**：SQLite 日志 + 可检索，解决 OpenClaw 式失忆。  
2. **成本靠路由 + 代码化**：130→10 / 5 天量级。  
3. **安卓 Termux** 可做常在线个人机。  
4. **Obsidian + 技能化** 才是个人 OS，不是又一个聊天窗。

---

## 附录

**章节时间戳**

| 时间 | 主题 |
|------|------|
| 03:15 | 记忆系统 vs OpenClaw |
| 10:45 | OpenRouter 与 90% 成本 |
| 16:50 | Termux 安卓部署 |
| 26:40 | Obsidian 控制面板 |
| 34:25 | GStack 与技能化 |

**素材路径**

- 专栏主源：`…/BV1nyo1BuEd9/ingest/column_article.md`
- 专栏 URL：https://www.bilibili.com/read/cv48254873/

**相关阅读**

- [[OpenClaw创始人-我是如何使用OpenClaw的]]
- [[Codex实战-构建个人操作系统]]
- [[MOC - Agent Theory and Design]]
- [[MOC - Harness Engineering]]
- [[拾语隅-给Hermes装个状态灯]] — 同为 Hermes Agent 实战；本篇偏 OpenRouter 降本与 Obsidian 集成，那篇偏状态监控与用户协作思路
