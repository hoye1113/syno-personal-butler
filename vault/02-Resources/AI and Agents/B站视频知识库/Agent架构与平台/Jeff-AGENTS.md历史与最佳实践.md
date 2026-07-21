---
title: "Jeff：AGENTS.md 的历史与最佳实践"
tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering", "context_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering", "context_engineering"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Jeff：Agents.md 命名战争与 OpenAI 买域名；GPT-5 胆怯 vs Claude 要大吼；AGENTS.md 像 slot-1 Malloc；70 行原则、潜在空间触发、Skills 延迟加载。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Jeff-AGENTS.md历史与最佳实践.md"
source_sha256: "33d1140f9fb583df2e214e5348f1b67ceee77eb9a736ca43302966136141d4bf"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1W39yBwEhp/"
column_url: "https://www.bilibili.com/read/cv48295672/"
host_name: "Jeff"
guest_name: "Jeff"
guest_title: "Loom / Geoffrey Huntley 生态 · Agents.md RFC 发起者"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1W39yBwEhp/ingest"
speaker: "Jeff"
duration: "22:36"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1W39yBwEhp/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1W39yBwEhp/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "solo_educational monologue as Host"
speaker_confidence: high
concepts:
  - id: agents_md_malloc
    zh: AGENTS.md 像 slot-1 分配
    en: AGENTS.md as slot-1 malloc
    one_line: 总在上下文首位，臃肿=挤占工作区
  - id: seventy_line_rule
    zh: 70 行原则
    en: seventy-line rule
    one_line: 定期割草，只留 build/test/布局
  - id: latent_space_trigger
    zh: 潜在空间触发
    en: latent space trigger
    one_line: 说 journald 即可，不必写死 systemctl
  - id: lazy_load_skills
    zh: Skills 延迟加载
    en: lazy-loaded skills
    one_line: 部署逻辑放 Skill MD，主循环保持轻
author:
  - "[[Jeff]]"
---

# Jeff：AGENTS.md 的历史与最佳实践

**Host：** Jeff（教育向 solo 讲解）  
**形态：** Host-Guest v3.2（**专栏主源** · 单人主讲 reframed）  
**B 站：** [BV1W39yBwEhp](https://www.bilibili.com/video/BV1W39yBwEhp/) · **时长** ~23 min

---

## 开场

各工具各搞一份：`Jules.md`、`Claude.md`、Cursor rules——仓库被污染。Jeff 写了一份「像 meme 的 RFC」火遍 HN：**别污染仓库，它就是个被 Malloc 进数组的文本文件**。OpenAI 后来买下 `Agents.md` 域名（之前 Slack 预览会跳到色情站）。今天讲：**历史与坑、分配思维、什么才是好的 AGENTS.md**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| Agents.md | Agents.md / AGENTS.md | 编码 Agent 仓库级指令文件 |
| 分配 | allocation / malloc | 上下文数组里固定占槽 |
| 愚蠢区 | dumb zone | 上下文挤满后模型变蠢 |
| 潜在空间 | latent space | 模型常识联想区 |
| 延迟加载 | lazy load | Skill MD 用时再注入 |
| 调音 | tuning | 像弹吉他试提示 |

---

## 01 命名战争：从 Agent.md 到 Agents.md

**Jeff：** Sourcegraph 买了 `Agent.md` 域名，我也烦各工具乱命名。RFC 说：**标准化一个文件名**。Google/OpenAI 已用 `agents` 复数；`Agents.md` 还被停放商占着。OpenAI 掏钱买域名——谢谢 OpenAI。我们接受失败：`Agent.md` 301 到 `Agents.md`，文档教你怎么 symlink `Claude.md`。回头看，我更喜欢 `Agent.md` 再 `Agents.md`，但历史已定。

**小结：** 行业收敛到 Agents.md，但 **一个文件通吃所有模型** 可能还太早。

---

## 02 单一 AGENTS.md 的坑：GPT-5「胆怯」

**Jeff：** 各模型对 **语气** 反应天差地别。GPT-5 发布时旧金山一圈人聊：表现像 **低睾酮**——在旧金山叫 **胆怯（timid）**。OpenAI 编码提示写：**别用强硬语言**；Anthropic 侧却要 **大写吼「彻底收集信息！」**。同一 AGENTS.md 切模型，社区噪音往往来自 **规则与模型不匹配**，不是模型突然变笨。

> **金句：** 也许该 **每个模型一份** `model-name.md`——现在纠正还不算晚，也可能已经太晚。

**小结：** 硬编码语气 = 给错误模型喂错 harness。

---

## 03 分配思维：slot-0 工具提示，slot-1 AGENTS.md

**Jeff：** 编码 Agent 极简单：数组 **slot-0** 是工具系统提示（Cursor/Claude Code），**slot-1 几乎总是自动注入的 AGENTS.md**——除非 compression（压缩是邪恶的，见 Ralph 视频）。它 **总是被分配**，所以体积 = 永久占用 **昂贵 Token**，挤掉真正干活的空间，增加在 **愚蠢区** 游荡的概率。Ralph/bash 循环的目的就是 **最小化上下文腐烂**。

**小结：** 把 Windows 想成内存很小的 Commodore 64——AGENTS.md 是常驻 RAM。

---

## 04 70 行原则：割草，别养 hidden knowledge

**Jeff：** 好的 AGENTS.md **~70 行**。去 OpenAI Tokenizer 数 Token。见过太多膨胀文件——团队每次改一点，变成 **没人记得为何存在的隐藏知识**。别怕 **拿割草机砍掉** 重建。真正该留的：**怎么测、怎么构建、一点布局**；大多数 Agent 会自动 layout、`make test`。

**Jeff（现场看 Loom）：** 我的也乱——Rust/Web 双构建路径、RALPH 失败信号……理想是 **nix 二进制缓存** 而非 cargo；也许该把 nix 流程拆成 **RALPH 跑完后的独立 raft**，而不是全堆在 AGENTS.md——**最小化 Malloc，少 loop-in-loop**。

**小结：** 看到 bash 测试连失败 = **调音信号**，更新 AGENTS.md，但别写死每一步。

---

## 05 潜在空间：journald 比写死 nginx 强

**Jeff（现场 demo）：** 别说「检查 nginx/caddy 配置路径」——只说 **查 journald**。Claude 会自己 **systemctl**、**journalctl**、**sudo**——你没写 systemctl，但在同一潜在空间里。给错服务器类型（Caddy vs 你装的是 Nginx）它会 **爬山搜索**——那是 **缓存未命中**，要调提示。

> **金句：** 别像对 GPT-3 那样写 cookbook；给 **刚好够触发行为** 的信息，让模型用常识补全。

**小结：** 少即是多；每个 app 问题都要 **弹吉他式试** 出 build/test/lint 配方。

---

## 06 Skills 延迟加载：部署逻辑别常驻数组

**Jeff：** Loom：`git push main` → NixOS 自动部署，10 秒轮询重建。我常问「部署了吗、看日志」——本可写成 **Skill**（就是 Markdown 字符串延迟加载，不是延迟加载 CSS）。固定进 AGENTS.md  vs **用时注入**：后者让主循环轻，高层抽象驱动行为（「给我 Loom 错误日志」就够）。

**小结：** 神奇不在 GitHub 抄来的万能 AGENTS.md，在你 **调音** 出来的那 70 行。

---

## 总结

| 维度 | 要点 |
|------|------|
| 历史 | RFC → OpenAI 买 Agents.md 域名 |
| 坑 | 单文件 + 多模型语气冲突 |
| 分配 | slot-1 常驻，臃肿→愚蠢区 |
| 尺寸 | ~70 行，定期割草 |
| 写法 | 触发潜在空间，Skills 延迟加载 |

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 01:45 | MD 命名与 OpenAI 域名 |
| 04:12 | 语气与 GPT-5 胆怯 |
| 07:30 | Malloc / 分配 |
| 09:15 | 70 行原则 |
| 12:40 | 潜在空间触发 |
| 18:20 | Skills 延迟加载 |

### 相关阅读

- [[Geoff-Ralph Loops的基础设施]] — Ralph 循环与 agent-first 栈
- [[OpenClaw创始人-我是如何使用OpenClaw的]] — Just talk to it，反 orchestrator
- [[2026 年 Agent 最重要的工程概念 Harness Engineering]] — AGENTS.md 当 source of truth
- [[MOC - Harness Engineering]]
