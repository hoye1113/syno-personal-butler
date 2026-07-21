---
title: "Claude Code实战：结合Obsidian打造第二大脑"
tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "context_engineering", "memory", "multi_agent"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "context_engineering", "memory", "multi_agent"]
created: "2026-06-09"
source: "B站视频 - Easonlee的AI笔记"
description: "Noah 展示 Obsidian vault + Git + 地下室 mini PC（Tailscale）+ 手机 Termius 跑 Claude Code；thinking 模式、Interviewer 子 agent、跨 vault 检索与 tacit 跨 repo 抄作业，主张 AI 的读强于写。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code实战-结合Obsidian打造第二大脑.md"
source_sha256: "51bfe2e443a55dd80878542981daef6f00e2257598ebaacabf0a9a7826b93622"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1s2Gd6aEF7/"
speaker: "Noah Breyer（Aethic / Alephic 创始人，前 Percolate 联创）"
duration: "70:01"
saved: 2026-07-02
spot_check: 2026-07-02
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1s2Gd6aEF7/article.md"
asr_version: v2
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1s2Gd6aEF7/ingest"
column_url: "https://www.bilibili.com/read/cv49624631/"
source_original_date: "2026-05-13"
host_name: "Dan Shipper"
guest_name: "Noah Brier"
guest_title: "Every 创始人 / Alephic 创始人，BRXND 大会主办"
speaker_inference: "column_article 明确标注 Dan（主持人）/ Noah Brier（嘉宾）"
speaker_confidence: "high"
author:
  - "[[Dan Shipper]]"
  - "[[Noah Brier]]"
concepts:
  - id: thinking_mode
    zh: 思考模式
    en: thinking mode
    one_line: 只收集组织思考，禁止代写大纲/讲稿/任何终稿
  - id: thinking_partner
    zh: 思考伙伴
    en: thinking partner / sub-agent
    one_line: 子代理只提问、记 running log，不 jump to artifact
  - id: vault_root_claude
    zh: 库根起 Claude
    en: vault-root Claude Code
    one_line: 在 Obsidian 根目录启动以访问全库 PARA 子目录检索
  - id: tacit_code_sharing
    zh: 隐性代码共享
    en: tacit code sharing
    one_line: 跨 repo 让 Claude 读他库实现再移植，不必模块化抽象
  - id: positional_encoding
    zh: 位置编码
    en: positional encoding
    one_line: 官僚主义隐喻——AI 作模糊接口渗入组织缝隙，不必统一工具栈
column_source: "Recastory/workspace/bilibili-retranscribe/BV1s2Gd6aEF7/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
updated: 2026-07-03
---
# Noah Brier：读比写更重要——Claude Code 当 Obsidian 第二大脑

> 对谈：Dan Shipper × Noah Brier（Every 创始人 / Alephic 创始人）| 来源：AI & I 播客 / B 站 Easonlee 专栏 | 2026

---

## 开场：为什么现在聊这个

Noah Brier 可能是把 **Claude Code** 当「第二大脑」用得最狠的人之一——地下室一台 mini PC，**Obsidian** 笔记库跑在上面，手机 **Termius** 连进去，碎片时间也能做研究和改代码。他从 Evernote 时代起就痴迷思维工具，现在是 Every 创始人、Alephic AI 战略咨询、**BRXND** 大会主办。

这期要压测四件事：**Claude Code 第一用法为什么是跟笔记说话**？**思考模式**怎么拦住模型急着交稿？**AI 作模糊接口**能否绕过组织里的工具战争？**指尖感觉**怎么在概率计算机时代重新建立？

**Dan：** 诺亚，你的 Claude Code 设置可能是我见过最酷的——地下室服务器、Obsidian、手机端深工。今天带我们走一遍？

**Noah：** 荣幸。咱们从通用部分聊起，手机端只是延伸。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 第二大脑 | second brain | 外部笔记系统 + AI，帮你想、记、串，不是替你写终稿 |
| 思考模式 | thinking mode | 只收集组织材料，禁止大纲/讲稿/任何成品 |
| 思考伙伴 | thinking partner / sub-agent | 子代理：提问、记 log，不代写 |
| 库根起 Claude | vault-root Claude Code | 在 Obsidian 根目录启动，可读全库 PARA 子文件夹 |
| 每日进展 | daily progress | 按日汇总项目学到什么、推进了什么 |
| 追上进度 | catch me up | 中断后按日期读项目内新文件恢复上下文 |
| 隐性代码共享 | tacit code sharing | 跨 repo 让 Claude 读实现再移植，不必抽象成共享库 |
| 指尖感觉 | Fingerspitzengefühl | 德语「指尖感」——用出来直觉，不靠旧软件集成经验推理 |
| 模糊接口 | fuzzy interface | AI 适配各团队数据结构，不必强迫统一 Jira/Asana |

---

## 01 读比写更重要：Claude Code 第一用法是跟笔记说话

**Dan：** 你搭了一整套「氛围编码」——能先讲 Obsidian 里 Claude Code 怎么当第二大脑吗？很多人谈 AI 只谈生成，你好像反着来。

**Noah：** 我不太确定「氛围编码」这词准不准——我这套 **Claude Code** 大部分时候**不是写代码**。从「超级组织者」时代起，我跟很多人一样从 Evernote 换到 **Obsidian**。它其实就是一堆 **Markdown 文件和文件夹**，能跟 **Git** 同步，还能加 **package.json** 跑自定义命令。所以 **Claude Code 第一用法**，是跟笔记交互。

我在 **Obsidian 库根目录** 启动 Claude Code——它有沙盒机制，不能随意跑根目录外的命令，但**能读所有子文件夹**。这样它有权访问我整个库，里面按 **PARA** 整理。最近我痴迷在家搭服务器，手机上也能用 Claude Code——这改变太大了。

以前手机绝对不是写代码、做深研的最佳场所。我大部分工作是写作或编码，研究和思考也总觉得得坐电脑前——所以我才一直记笔记。现在变了：Claude Code 配 Obsidian，或者配代码库，手机也能高效干活。外面发现问题，手机登录，让 Claude Code 推个小更新——体验太棒。我还经常用 **Grok 语音模式**——特斯拉里内置了，长途开车能做多轮研究，跟 ChatGPT 语音比，**工具调用**强太多；送女儿去新罕布什尔夏令营，五小时车程里大约两小时在车里完成一篇文章调研。手机一直有用，深工不行；现在真变了——周二送完孩子，早餐两小时，我**只靠手机**为 BRXND 大会演讲做研究和整理——没有这套栈，这类工作根本做不成。

**Dan：** 等等——你在 vault 根起 Claude，不是单项目子文件夹？扫全库 **1500+** 笔记，它找的东西真相关吗？

**Noah：** 相关性在这案例里比较简单。我不是让它做概念大跳跃，而是找我已经思考过的主题——比如「简单破坏现场手册」、OSS、官僚主义。它用搜索把相关笔记拉进来，帮我找回最初触发想法的那几条。泛化「找相关笔记」确实常牵强；**先有人类策展的主题**，再让 agent 扫库，别期待它替你做大跨度联想。

演示里我在准备一个营销+AI 的演讲，项目文件夹里有 **research/**（文章 PDF）、**chats/**（跟 ChatGPT、Claude、Grok 的完整对话摘录）、**daily progress/**、**conclusions** 片段。演讲从 OSS《简单破坏现场手册》切入——纳粹占领区公民如何悄悄破坏：清洁工把油腻垃圾和烟头放一起，白领则「凡事提交委员会、反复重审旧决定」。我想谈 AI 怎么规避大组织官僚主义；手册是公共领域，我雇设计师印了 **300 本**带新前言，大会现场分发。Claude Code 就运行在这个 Obsidian 项目里——你看到的正是它往 Markdown 里记结论、汇总当天学到什么。每天结束我让 AI 写 **daily progress**：当天出现了什么笔记、推进了什么。中断几天后回来，我问：**「能告诉我过去三天研究进展吗？」** 它按日期读项目内新文件——列文件、按日期筛、读内容，我们知道它做得到。当天最大突破可能是「**官僚主义作为位置编码**」——还在琢磨，但我挺喜欢这说法。最难的是重新进入状态；能一键追上进度，对深工太关键了。我发现很多人现在能做好这类事，是因为**摸清了模型能力边界**，鼓励它在强项范围内干活——别让它做它还不稳的概念跳跃。

> **金句 · Noah**
> **中文：** 大家太关注 AI 的「写」，对「读」关注不够——阅读理解能力日常更有用，我们生成作品的频率远低于思考问题的频率。
> **原文：** There's entirely too much focus on its ability to write and not enough on its ability to read.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 库根起 Claude | vault-root Claude Code | 根目录启动 → 全库 PARA 检索；sandbox 仍限制根外命令 |
| 每日进展 | daily progress | 按日 AI 汇总项目学到什么、推进了什么 |
| 追上进度 | catch me up | 「过去 N 天研究进展？」按日期读项目文件恢复上下文 |
| 读强于写 | read > write | AI 整合已有笔记/材料比急着产出讲稿更值 |
| PARA | PARA method | Projects/Areas/Resources/Archives 笔记组织法 |

**本章小结**

- Claude Code #1 用法是跟 Obsidian 笔记交互，编码多是「已知问题的小修」
- 根目录启动换全 vault 检索；相关性靠人类已策展主题，别期待冷启动发现
- 手机 + 家服延伸深工半径；daily progress + catch-up 对抗中断

---

## 02 思考模式：别让模型急着交稿

**Dan：** 你说现在处于「思考模式」不是「写作模式」——具体怎么卡边界？AI 一给题目就想交稿，这痛点太普遍了。

**Noah：** 新项目从空文件夹开始，我**第一件事**告诉 Claude：**思考模式，不要写任何成品**。给它看我过往演讲样例定风格，给大主题——比如大会要送《简单破坏现场手册》、谈 Transformer 吞噬世界——然后让它**扫全库 1500+ 文件**，把相关材料拉进 research/。

我在提示词里写死：**「诺亚只是在收集原始材料」「绝不希望你尝试去写它」**——字面上：不要创建大纲、草稿或任何演讲稿版本，只收集和组织请求的材料。即便如此，模型还是会越界；你得非常坚定，反复说 no 就是 no。模型公司之间有张力：经济产出靠**生成成果**衡量，所以它们非常「乐于助人」——对我们做深度思考的人，这种过度积极反而是障碍。我希望克制能慢慢融进模型里，现在还靠 frontmatter 和子代理硬卡。

我设了一个叫 **「思考伙伴」** 的**子代理**。定义很简单：协作思考伙伴，职责是促进思考，**基本要求：不要试图写成品**。有了初始素材后我转向它——它进入流程，向我提问，帮我思考。我还让它 review **chats/** 里 ChatGPT、Claude、Grok 的完整对话。比如「Transformer 吞噬世界」线索，是几个月前看时间序列建模时开的一条对话，后来 Tesla 删 30 万行 C++ 等碎片不断往回加——思考伙伴帮我把 OSS「狂野比尔」多诺万、破坏手册、特种部队「边缘赋能个人」这些线慢慢织合。

Wild Bill 那条线：他在 OSS 里追求**赋能个人**，特种部队灵感也来自「边缘有极强操作员、指挥控制层级内却有大自主权」。破坏手册主题是赋能公民破坏者。我往回想：Transformer 把我们从序列模型带到更可并行化的结构——这场 AI 革命咱俩都靠它吃饭——**从顺序处理到并行处理**，跟官僚主义、跟 Wild Bill 在系统内工作却在边缘留自主权，有没有一条线？还没巩固结论，但这就是思考模式下的正常状态——记笔记、问问题、放一边，不急着出成品。

有个操作细节：我会用 **-continue** 标志延续上次 Claude 会话——项目周期长，别每次从零解释。思考伙伴跑起来后，我会让它扫 **chats/** 里几个月前的 Grok 对话：比如 Walter Benjamin《机械复制时代的艺术作品》、本雅明同代人是谁——那些语音探索摘录进 vault 后，子代理能跟 Obsidian 笔记交叉提问。这就是我说的：**阅读整合**比生成讲稿日常得多。即使你非常明确说不要代写，模型还是会越界——所以子代理 + 提示词 + 人工反复 no，三层一起上。

子代理被告知：问问题时**记下问了什么**、**持续记录**正在发现什么、怎么思考的。第二天回来可以说「我想深挖 Wild Bill 的 XYZ」，开新 chat 或继续跟子代理，成为该主题新文件。Dan 你们孵化的 Spiral 是代笔 agent——好代笔人不会你说「想写博客」就直接交稿，得先 interview、理解你、共同塑造想法。**先停下来，让它了解你**——这对想从 AI 获益的人太重要了。我常对人说：大家过于关注 AI 的「写作」能力，对其「阅读」能力的关注不足——我们生成作品的频率，远低于思考问题的频率。

> **金句 · Noah**
> **中文：** 思考模式——不要创建大纲、草稿或任何讲稿版本；只收集和组织材料。
> **原文：** Thinking mode — do not create outline drafts or any versions of talks writing.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 思考模式 | thinking mode | 只 gather & organize；禁止 outline/draft/终稿 |
| 思考伙伴 | thinking partner / sub-agent | Claude Code 子代理：提问 + running log，不代写 |
| 子代理 | sub-agent | Claude Code 内生成的迷你 Claude，独立角色契约 |
| 聊天记录夹 | chats/ folder | 外站 AI 对话 web clip 进 vault，供 review 串线 |
| 代笔陷阱 | jump to artifact | 模型默认 helpful = 急着产出成品，思考任务的大敌 |

**本章小结**

- frontmatter + 思考伙伴子代理，硬对抗「急着写稿」；仍须反复 enforcement
- 好 ghostwriter 模式：先 interview 再共写；AI 读/chat review 强于 AI 写
- running log + chats/ 交叉，长周期主题靠 thread 积累而非单次 prompt

---

## 03 AI 渗入缝隙：不必统一全公司的工具栈

**Dan：** 「官僚主义作为位置编码」——这想法怎么跟 AI 扯上？还有，你们 Every 内部六种产品各用各栈，怎么共享代码？

**Noah：** 我在琢磨：官僚主义通常是负面的，但它对公司运作也是巨大创新——等级、结构、大规模运营需要的东西。过去技术的问题是**强迫你选结构**：新软件往往要求大家采用新流程，所以企业软件项目长期失败——**采用和变更管理**是根本挑战。Percolate 跟大品牌做内容营销，我对此感受太深。

AI 有趣的地方——还早期、有点理论化——是你可以让**每个人继续用各自的方式**。经典内耗：一团队用 Asana，一团队用 Jira，另一团队用 Linear；大项目请来咨询公司，决定**全部集中到一个工具**——公司三分之二的人不高兴，大家都牺牲，处于非常不理想状态。AI 可能让每个人都继续做正在做的事，**中间放模型**——对模型来说都只是数据结构，不必在乎你用什么界面。中心化协调有了，又不必统一工作习惯。我管这叫 **「托马斯英式松饼 AI 理论」**：能渗透到各个角落和缝隙。AI 像**胶状效应**、**模糊接口**，适应任何缝隙，不真正关心输入输出格式——我演讲里还从 OSS《简单破坏现场手册》取灵感：怎么让 AI 规避大组织官僚主义。具体「官僚主义作为位置编码」意味着什么，我演讲前两周还得想明白——但方向是：Transformer 的**位置编码**让模型知道 token 在序列哪，官僚主义像是组织里的「结构位置」——AI 不必拆掉这套结构，也能在缝隙里干活。

**Dan：** 你刚说的隐性共享，我们 Every 内部就是活例子——六种产品、**15 个人**，各用各栈，Sparkle 做文件搜索，Para 是内部法律顾问也要同样能力。历史上得抽象成模块化库，投入产出比很低。现在直接把开发者加进 Sparkle 代码库，「让 Claude Code 弄清楚怎么工作的，自己做你的版本」——每个人都变高效，又不必模块化。你们 Elephic 对客户也这么干？

**Noah：** 对，Elephic 给亚马逊、Meta、PayPal 这类客户做建设，多内部/外部代码库，相同需求反复出现——我用 **GitHub MCP**：在 Cursor 或 Claude Code 里说「去看看 Intelligence 那个代码库，CRM 那套怎么实现的，把最佳实践搬过来」。Intelligence 是我们内部工具包装器，带 CRM 功能，也是实验有趣问题的好场子——**隐性代码共享**验证了这个思路。做抽象模块化往往投入产出比很低——AI 当翻译层，非确定性集成，反而更快。

ChatGPT **插件**规范是我的顿悟时刻——大概两年半前，感觉像 50 年前了。你接触新东西习惯读 API 文档、守契约；插件规范却说：根目录放 manifest JSON，描述怎么收发数据，平台处理其余部分。我当时觉得太棒了，世界就该这么运作——不必总守大公司死板的数据合同。同时它**180° 颠覆**我职业生涯积累的软件集成直觉：从此我一直觉得主题是——这在目前不直观，不是坏事，只是要建立新直觉。

我们跟 Fortune 50 聊，很多人以为被抛在后面；其实空白领域还巨大，登录 ChatGPT 做没人想过的事，你可能发现全新用法。播客和 Every 干的事，很多就是第一次摸索——「哦这会奏效吗？」然后突然你对**非确定性计算机**能干什么有了新直觉。有人觉得我们比实际进展更远，尤其有点怕的人——公平说，模型也没帮普通人轻松上手：上去写首诗，写完就走，没摸到前沿。建立直觉的办法就是**用**——你现在用，就已经在前沿了。

> **金句 · Noah**
> **中文：** 让 Claude Code 看懂他库怎么实现的，再做你的版本——不必先抽象成人人能用的共享库。
> **原文：** Just ask Claude Code to figure out how it works and do your own version.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 位置编码 | positional encoding | Transformer 术语借喻：官僚主义在组织里的「结构位置」 |
| 模糊接口 | fuzzy interface | AI 适配各团队数据结构，不强推统一工具 |
| 托马斯英式松饼理论 | Thomas's English Muffin theory | AI 渗入组织缝隙，像松饼孔里灌黄油 |
| 隐性代码共享 | tacit code sharing | 跨 repo 读实现再移植，跳过模块化抽象 |
| 模型上下文协议 | MCP (Model Context Protocol) | 让 agent 读 GitHub 等他库代码的接口标准 |

**本章小结**

- AI 作中间层：各团队保留习惯，模型读数据结构做衔接——不必咨询公司式「选一工具」
- 多产品多栈：agent 读他库实现 == 低成本 best practice 迁移，不必 monorepo
- 插件 manifest 时刻：概率计算机颠覆确定性集成直觉，需要新 Fingerspitzengefühl

---

## 04 指尖感觉：手机深工与元技能

**Dan：** 好，大家都等这个——手机上怎么把 Claude Code 当第二大脑？还有，你怎么看孩子和教育？

**Noah：** 我打开 **Termius**——就是手机终端。背后是地下室 mini PC，跑 **Tailscale** 私人 VPN，只有授权设备能连。Obsidian 库在 **GitHub 私有仓库**，同步到这台机器，我直接调用 Claude Code。问「最近两天有什么新消息？」、调任何子代理、改笔记——全在 vault 里。conference 网站链接坏了，路边拉代码库、Claude 改、push PR；客户项目要小改动，**坐在池塘边**就搞定——我心里完全知道问题在哪，本可以回电脑开 Cursor，但告诉 Claude Code 去哪查、确认是不是我想的那样、推 PR，完事。我发现自己用 Claude Code 最多的场景，是**「我已知怎么完成」**的工作——我完全知道发生了什么，知道为什么会卡，只是懒得开电脑。

我最近还搞 **Claude Code 助手**帮基础设置：玩 **Omarchy** Linux（DHH 做的发行版）、Mac 上清 Homebrew、**pip 换 uv**——不熟悉命令行时 Claude 当 sysadmin。新盒子登录 Claude Code，它能补齐初始没设好的偏好；我想启动新机器，它会准备好我所有设置。Obsidian **附件清理**小工具：PDF、图片文件名混乱，用 **Gemini Flash** 批量 rename、建 metadata 表、回写链接——有点魔法。我还在用 Simon Willison 的 **LLM 命令行工具**，整合回 Claude Code——命令行工具装越来越多，这是我的快乐源泉。地下室 mini PC 我还帮很多朋友设小分区，让他们也能手机上跑 Claude Code——我太喜欢这套了，最近甚至有点退出 SaaS：也许短期答案就是**一切跑 Linux 上**。

说回直觉。客户会议我常问：你用 AI 的顿悟时刻是什么？很多人——尤其 Fortune 50——觉得被抛在后面；其实登录 ChatGPT 做**没人想过的事**，空白领域还巨大。人们上去让它写首诗，写完就说「好吧它会写诗」——没摸到**身处前沿**那种感觉。根本性新事物，不能只靠没亲身经历过的推理——得**建立直觉**才能判断有没有效。德语 **Fingerspitzengefühl**，指尖感觉。Veritasium 那辆「想左转先锁死左边」的自行车：你没法口头教孩子骑车，得坐上去感受。Philip Ball《Beyond Weird》：量子并不怪，怪的是**词汇**——我们活在牛顿世界，词汇是确定性的；AI 是**概率计算机**，问两次得不同答案、manifest 描述接口就行——都不是一生经历过的正常事。语言模型若成我们用电脑的标准方式，或许能造出新词汇——我们其实擅长处理概率性事物，就像对待其他人；只是启蒙运动以来习惯把确定性和看世界方式绑太紧。

**Dan：** 孩子呢？你让他们接触这些——他们怎么看？

**Noah：** 七岁和十岁，偶尔用语音模型，车里跟 Grok 玩游戏。十岁女儿这个周末第一次强烈想自己搭一个——家庭 Secret Santa 抽签，我给她手机和 **v0**，**75 次**修改，精致的圣诞老人 app；她无意识碰到**数据建模**——大人给大人、孩子给孩子，她悟到用「群组」更通用。10 岁能做出 app，我看不出怎么可能是泡沫。教育：别藏 AI；LA 一所学校请我聊 AI，英语老师问「孩子都用 AI 怎么办」——我说你的工作**是让人想学会写**，写作是一辈子的功课，不是防作弊。NYU 我将开「**代码即论文**」——代码长期把普通人挡在外面，现在是一种新自我表达，像我女儿周末干的事。Tim Harford《真相侦探》教「大脑卫士」：信息让你**太高兴、太吻合**时，更该怀疑——上网和辨 ChatGPT 幻觉同一套媒介素养。NYU 加拉廷答辩：三四位教授三小时，25 本参考书任何一本都可能被问到——AI 没法替你在房间里论证，考察的是**内化了吗**。元技能比背 50 个州更重要；与其测记忆，不如教用 ChatGPT 找 50 州并判断 AI 何时胡说。

> **金句 · Noah**
> **中文：** 手机曾不适合深工——这套栈真的改变了；我周二早餐两小时只靠手机做演讲研究。
> **原文：** The phone is not the best place for deep work… I feel like it's really changed.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Tailscale | Tailscale VPN | 简单私人 VPN，授权设备 SSH 进家服 |
| Termius | Termius | 手机 SSH 终端，连远程 Claude Code CLI |
| 指尖感觉 | Fingerspitzengefühl | 用出来直觉；概率工具不能单靠旧集成经验推理 |
| 代码即论文 | code as essay | 课程理念：代码作自我表达媒介，非仅工程师专利 |
| 元技能 | meta-skills | 判幻觉、媒介素养、内化论证——比记忆题更该教 |

**本章小结**

- 家服 + Tailscale + Git + Termius = 手机深工终端； pond 边 push PR 不是梗
- Fingerspitzengefühl：概率计算机需要新词汇新直觉，用法即前沿
- 10 岁做出 app + 代码即论文 + 大脑卫士——AI 素养重于藏技术

---

## 总结：第二大脑是读、问、记，不是代写

| 维度 | 要点 |
|------|------|
| 栈 | Obsidian（Git markdown PARA）+ Claude Code 库根启动 + 可选家服远程 |
| 模式 | thinking mode frontmatter + 思考伙伴子代理；daily progress + catch-up |
| 组织 | AI 模糊接口渗入缝隙；跨代码库隐性共享 + GitHub MCP |
| 移动 | Tailscale + Termius；Grok voice 作上游 capture（tool calling 强） |
| 认知 | 读强于写；Fingerspitzengefühl；元技能与媒介素养 |

### 对个人的启示

Obsidian vault 接 Git，**库根起 Claude**；新项目 frontmatter 写死 thinking vs writing。建 **思考伙伴**子代理（或 CLAUDE.md 等价规则）：只问只记不写。**daily progress** + 回归 prompt「catch me up N days」。若要手机深工：旧机器 + Tailscale + Termius + private Git sync。附件 chore → 一次性 Claude 小脚本。

### 对团队/产品的启示

不必为复用逼全员统一栈——**让 agent 读他库实现**是低成本对齐。企业软件失败常输在变更管理；AI 中间层可能让各团队保留 Asana/Jira/Linear，模型读数据结构衔接。Spiral 式 ghostwriter 产品：interview 流程是 feature，不是 delay。

### 仍待验证

- 「官僚主义作为位置编码」Noah 自述演讲前两周内要弄明白——vault 内为进行中概念
- Grok voice vs ChatGPT 实时 API 优劣随版本变，需自行 A/B
- 全库 1500+ 扫描的相关性边界：主题已策展时有效，冷启动发现仍弱

> **金句 · Noah（封底）**
> **中文：** 指尖感觉——用概率计算机，你得建立新直觉；这不直观，不是坏事。
> **原文：** You need to build new intuition — it's not intuitive right now, but that's not a bad thing.

---

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 04:15 | 手机端深度工作的范式转移 |
| 11:42 | 思考模式优先于写作模式 |
| 21:05 | 官僚主义作为位置编码的隐喻 |
| 24:30 | 隐性代码共享与翻译 |
| 31:12 | 建立指尖感觉与元技能培养 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1s2Gd6aEF7/ingest`
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV1s2Gd6aEF7/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv49624631/
- **B 站**：https://www.bilibili.com/video/BV1s2Gd6aEF7/
- **时长**：70:01

### 相关阅读

- [[Agent实战-打造一个AI Agent的完整教程]] — agents.md、memory、MCP、Skills 入门  
- [[Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿]] — Claude Code 团队视角  
- [[IBM团队-Harness工程详解]] — harness、verify、context 管理  
- [[Manus创始人-深度干货-上下文工程的最佳实践]] — 长任务 context offload/compact  
- [[Loop Engineering 橙皮书 - 花叔]] — Loop / 留痕与迭代  
- [[MOC - Agent Theory and Design]] — Agent 理论总索引  
- [[拾语隅-给Hermes装个状态灯]] — 都是 Agent 个人助手实战；本篇偏知识库集成，那篇偏状态可视化

---

### 收录说明

- **视频**：[BV1s2Gd6aEF7](https://www.bilibili.com/video/BV1s2Gd6aEF7/)（B 站 *Easonlee的AI笔记*）  
- **嘉宾**：Noah Breyer（Alephic.com / BRXND.ai）  
- **时长**：~70:01  
- **转写**：Recastory `bilibili-retranscribe/BV1s2Gd6aEF7/`（FunASR SenseVoice + cam++，**asr v2** 67 段）  
- **版本**：canonical Host-Guest v3.2（2026-07-03；原讲义已合并）

