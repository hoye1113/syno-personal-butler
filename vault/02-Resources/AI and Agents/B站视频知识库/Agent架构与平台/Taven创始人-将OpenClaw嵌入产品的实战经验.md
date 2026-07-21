---
title: "Taven创始人：将OpenClaw嵌入产品的实战经验"
tags: ["ai_agent", "video_transcript", "bilibili", "skills", "harness_engineering", "context_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "skills", "harness_engineering", "context_engineering"]
created: "2026-06-09"
source: "B站视频 - Easonlee的AI笔记"
description: "Tablen AI 创始人讲 Pi/OpenClaw 企业嵌入：Agent=Goals+Context+Tools 循环；Excel Skill 用小 CLI 组合；一客户一 Agent+AGENTS.md 处理 RFP 邮件。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Taven创始人-将OpenClaw嵌入产品的实战经验.md"
source_sha256: "5775636047a8ff9f253fa7332725220bac89f92291fb1e1b3bd6d4776b360383"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1dZLS66E3m/"
speaker: "Tablen AI 创始人（欧洲小型 Agent 公司）"
duration: "20:31"
saved: 2026-07-02
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1dZLS66E3m/article.md"
asr_version: v2
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1dZLS66E3m/ingest"
column_url: "https://www.bilibili.com/read/cv49366476/"
source_original_date: "2026-05-12"
host_name: "大会主持人"
guest_name: "Matthias Luebken"
guest_title: "Taven AI 创始人"
speaker_inference: "column_monologue + topic_transition"
speaker_confidence: "high"
author:
  - "[[Matthias Luebken]]"
concepts:
  - id: agent_loop
    zh: 智能体循环
    en: agent loop
    one_line: 目标 + 上下文 + 工具调用，循环跑
  - id: coding_agent
    zh: 编码智能体
    en: coding agent
    one_line: 核心循环 + 运行时 + Shell，能调本地命令
  - id: extension_api
    zh: 扩展接口
    en: extension API
    one_line: 会话事件与 UI 交互，斜杠命令驱动界面
  - id: one_agent_per_customer
    zh: 一客户一智能体
    en: one agent per customer
    one_line: AGENTS.md 定角色，customer.md 定客户上下文
column_source: "Recastory/workspace/bilibili-retranscribe/BV1dZLS66E3m/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
updated: 2026-07-03
---
# Taven 创始人 Matthias：编码智能体是软件系统的核心积木

**Host：** 大会主持人（Pi / OpenClaw 社区 meetup）  
**Guest：** Matthias Luebken（Taven AI 创始人）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `BV1dZLS66E3m/ingest/column_article.md`  
**B 站视频：** [BV1dZLS66E3m](https://www.bilibili.com/video/BV1dZLS66E3m/)

---

## 开场：为什么现在聊这个

Pi / OpenClaw 社区 meetup 上，Taven AI 创始人 Matthias Luebken 带来一场约 **20 分钟**的 field notes：不是产品发布，是「我们怎么用 Pi 内核给企业做 Agent」。

核心问题有四块：**编码智能体还在边做边学，能不能先动手？** Agent 本体到底有多薄？**Shell 和扩展接口**差在哪？OpenClaw 多通道怎么嵌进 **B2B 销售收件箱**？

Matthias 的判断很直：**编码智能体会是软件系统的核心构建模块**——别等大框架定稿，用 Pi 拆开 tinkering 比读十篇综述有用。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| Pi | Pi | Mario 做的极简开源智能体 / 编码智能体内核（TypeScript） |
| OpenClaw | OpenClaw | 基于 Pi 的多通道个人 / 团队智能体平台 |
| 编码智能体 | coding agent | 核心循环 + 运行时 + Shell，能跑 bash、调本地工具 |
| 智能体循环 | agent loop | 定目标、给上下文、调工具、拿结果，再循环 |
| 扩展接口 | extension API | 会话事件、UI 交互、斜杠命令等可插拔能力 |
| 技能 | skill | 小工具集打包（如 Excel 用 pandas / openpyxl CLI） |
| 钩子 | hook | 工具调用前后注入逻辑，如权限校验 |
| 一客户一智能体 | one agent per customer | 每个客户独立 Agent + 专属上下文文档 |
| 多通道 | multichannel | 多线程、多 Agent、网关路由并存 |

---

## 01 还在边做边学，小工具组合比大而全靠谱

**Host：** 编码智能体这么火，你们 Taven 到底在干什么？这领域有没有定型的套路可以抄？

**Matthias：** 我办 Taven AI，给组织做代理，欧洲小公司，刚起步。我是研究 OpenClaw 时摸到 Pi 的——当时有个会，大家在聊 OpenClaw 各种玩法，我对那些「疯狂用法」兴趣不大，更想搞懂**背后怎么转**。研究 Pi 之后，我才看见它能搭出来的整个世界。

Mario 早上有句话我特喜欢：**我们还在编码智能体的「边做边学」阶段**。我今天讲的，全是眼下认知；几周后再讲，八成全变。Mario 做了编码智能体的**最小集合**，供大家随意使用——我鼓励大家就这么干，别等权威教材。你不需要先读完一门课才动手；最小集合就是给你拆、给你试的。

编码智能体为啥让人兴奋？Ken Thompson 说过：**写只做一件事、并把这件事做好的程序**。这对代理设计太有用了——别堆大而全，把一件事拆清楚。我们后面会看 CRM、看销售邮件，但设计原则先钉在这句上。

Co-Work 桌面端是个好例子——他们把编码智能体绑到非 IDE 场景。跟财务工具一起用时，用户老碰 Excel。他们没让代理「直接跟 Excel 对话」，而是拿 **pandas、openpyxl、LibreOffice 命令行** 这些小工具，**打包成一个 Excel 技能**。跑起来就是一套 CLI，不是魔法读写 xlsx。说实话，这类集成反响不错——用户本来就要碰 Excel，Skill 把 Agent 擅长的东西（跑命令、调脚本）接上去就行。它并非直接操作表格文件，而是绕一圈，用 Agent 真正会的那套。

昨天我跟 Ivan 聊，有个架构苗头很宽：**让编码智能体用起来简单**。但别把它做复杂——先问，编码智能体**擅长什么**？你的系统怎么让它**好访问**？我接下来十分钟左右的例子，都围着这个问题转。

Pi 本身开源、极简，入门门槛低。Mario 做得非常棒，他要去 Arendelle 了——一群优秀的人凑一起，我替他们高兴。幻灯片已经上网了，我就两张，不赘述。再次强调：**打开 Pi，让它帮你搭你想搭的东西**。效果常常让人愣住——很多其实是 Mario 那套系统提示词在撑。扩展插件都能自己写或下载，值得深挖。这里有很多东西值得探索。

这类书现在没人写得出来——**模式还没定**。编码领域有些苗头，各种编码智能体冒出来，但没有权威资源。所以：**先行动起来**，比等最佳实践定稿强。我写过书吗？没有。现在也没人能写——因为还没有固定的模式。我们需要共同摸索。

Co-Work 那个例子还能再挖一层：他们把编码智能体**捆绑**到他们认为更适用的场景里——不是换了个聊天窗口，是换了个**任务上下文**。财务同事打开桌面端，Agent 已经知道你可能要碰 Excel，Skill 就在旁边等着。这种「场景 + 小工具集」的组合，比做一个万能助手现实得多。你回去也可以问自己：我的用户反复碰的「老大难集成」是什么？能不能拆成三个 CLI，打包成一个 Skill？

> **金句 · Matthias**
> **中文：** 编码智能体还在边做边学——几周后再讲，内容很可能全变。
> **原文：** We are in the fuck around and find out phase for coding agents.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 边做边学 | fuck around and find out | 模式未定，鼓励 tinkering 而非等教材 |
| 单一职责 | do one thing well | Ken Thompson 原则；Skill 拆小 CLI 而非大而全 |
| 技能 | skill | 小工具集打包，如 Excel 用 pandas / openpyxl |
| Co-Work | Co-Work / Claude Desktop | 把编码智能体绑到桌面非 IDE 场景的产品形态 |
| 最小集合 | minimal set | Mario 的 Pi 内核，可拆可组装 |

**本章小结**

- 编码智能体没有定型套路；Pi 最小内核是给 tinkering 用的
- Excel 案例：小 CLI 打包成 Skill，比逼模型直接操作复杂格式靠谱
- Ken Thompson「只做一件事」是 Agent 产品设计的硬约束

---

## 02 智能体本体很薄：目标、上下文、工具，循环

**Host：** 抛开 hype，Agent 底下到底是什么？你们从哪儿入手的？

**Matthias：** 今天不只想聊编码智能体写代码——**还能用它干什么**。我建议大家先看**核心智能体**，别一上来就套编码智能体那层壳。市面上别的 SDK 也有，既然聊 Pi，就以 Pi 为例。请揭开面纱，动手玩玩——别被「Agent 框架」吓住。这次演讲主题不是编码代理本身——虽然你可以拿它做日常开发——我们更想探讨：还能用它做什么？

智能体是什么？**大模型在循环里跑工具**。你定一些目标，给上下文，它在很多场景下会调工具、拿结果，再调、再拿，循环。就这些，没更复杂的。剩下像「魔法」，其实是**怎么包进你的特定用例**——别的场景也一样，换的是工具和上下文，不是循环本身。Goals、Context、Tools——三样东西，循环转。

Pi 的 Agent Core 全是 TypeScript：一个 **Agent 类**，你可以调各种信息，用不同**提示词**引导它。还有**事件系统**——订阅它，实时了解正在发生什么。这对企业落地特别关键：你不只想看最终结果，还想在工具调用前后**插逻辑**。Agent Core 长什么样？就是 Agent Class，TypeScript 代码，你能调整各种信息。

我入门用 CRM 潜客筛选——经典用例，我个人就从 CRM 开始试的。终端里一个小程序，**三个 TypeScript 文件**，非常简单。跑命令：显示所有潜客、给他们打分。操作过程就是：列出潜客、评分。幕后你能看见助手调工具、拿结果、再调、再输入——虽然现在看起来事情不少，但我就是写代码把它跑通的，很好的学习练习。关于系统提示词，你可以想象它怎么选不同工具、怎么执行任务——如果你正在搭一个代理，一切其实都非常简单。

透明，可观测，可改。这是一个关于如何**注入逻辑**的例子：工具调用时，我们关联并调用特定工具。企业里常要在调用前**插一手**，典型做法是用**钩子**——比如更新联系人前，先检查权限，不想没校验就改数据。任何权限访问控制、企业级功能都能挂在这里。工具调用前还有一个事件触发；流里你可能看见一个小勾号——工具调用正常，结果返回。我们再次订阅事件，全程清晰简单。**务必自己试一遍**——比读十页架构图管用。

跟别的 Agent SDK 比，Pi 的优势之一是**透明度**：你不是在黑盒里猜它干嘛，事件流里每一步都看得见。做企业功能时，这几乎是刚需——审计、合规、调试，都靠这个。所以我才说：别跳过 Core Agent，直接上编码智能体那层。把循环吃透了，后面加 Shell、加 Extension，你才知道多出来的每一层在解决什么问题。

> **金句 · Matthias**
> **中文：** 智能体就是大模型在循环里跑工具——就这些，没更复杂的。
> **原文：** An agent is actually just an LM agent that runs tools in a loop... That's it. There's not much more.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 核心智能体 | core agent / Agent Core | Pi 最底层：LM + 工具循环，无 Shell |
| 智能体循环 | agent loop | 目标 → 上下文 → 工具调用 → 结果 → 再循环 |
| 事件系统 | event system | 订阅工具调用前后事件，实时可见 |
| 钩子 | hook | 工具调用前注入 RBAC、校验等企业逻辑 |
| 系统提示词 | system prompt | 编排工具选择与任务执行规则 |

**本章小结**

- Agent 三要素：Goals + Context + Tools，循环；magic 在 use case 包装
- CRM 三文件 demo：CLI 暴露能力 + hook 做权限，比堆抽象框架上手快
- 事件系统让 Agent 行为可观测、可干预——企业落地的第一道门

---

## 03 有了 Shell，外面像学会；Extension 让 Agent 能选 UI

**Host：** 编码智能体和刚才说的核心智能体，差在哪？OpenClaw 那层「魔力」从哪来？

**Matthias：** 编码智能体**原理一样**——循环里跑工具，和刚才说的普通代理没两样。多出来的是**运行时**和 **Shell**，大家基本都用 Bash。有了 Shell 能执行命令，事情才有趣，OpenClaw 的魔力也在这——不是多了一层神秘框架，是多了一个能跑本地命令的口子。

Peter 演示过：给 OpenClaw 发**语音消息**，当时没有语音插件。它自己创建并使用了不同工具，最终调本地 **FFMPEG** 处理音频。外面看像「学会了」，里面就是**又一次工具调用**。这就是为什么这些技术有意思——别被「自主进化」吓到，拆开看都是工具链。

再说**扩展接口**——例子看起来有点复杂，核心就两块，网上有文档：**会话事件**和 **UI 交互**。这才是扩展真正长出来的地方。编码智能体里很多事你可以直接问它生成；我们看 CRM 那段 TypeScript：和前面同一个例子，加一个叫 `pipeline` 的**斜杠命令**。有斜杠命令、加了 pipeline，就能加载所有上下文。步骤 1 下面那行——看见了吗？**上下文 UI 的选择**。

突然之间，你不只跟后端系统和会话打交道，还在**跟 UI 交互、做选择**。这让我开始想：有了这条命令，仍然只是编码智能体的能力——不是核心 Agent 类那层，但你不下载编码智能体的话，这就是你加载 Pi 的方式。有了新扩展，Pi 里就能开始选东西：简单选择，还有下拉菜单。

这些都是扩展。Pi 框架眼下偏编码智能体用例，要扩到其他类型应用还得做——但我希望你能看见愿景。现在全在终端里，你问 Web 端什么样？我让 Pi 搭网页界面，**同样的命令、同样的选择、同一套扩展机制**——目前直接实现还不完美，但如果是网页，它搭出来的也是网页，命令和选择机制一致。我们在重构，让它更好访问、更清晰。

OpenClaw 是 Pi 的**多通道**版：不只编码环境里一个 Agent、一个会话，而是**多线程、多 Agent 并行**，内容更丰富。这也是我起步的地方——查 Pi 核心包，OpenClaw 全在用。有个函数叫**运行嵌入式 Pi 代理**，建会话；Pi 本身会话支持很好，建会话代理、流式回传所有信息。还有 Agent Core、编码智能体、**Pi AI**（统一大模型抽象）、终端 UI。OpenClaw 自研**插件**——用例不同，要求不同：多通道路由、不同提供商编排、子代理、网关支持等等。你通过 OpenClaw 认识到的这些，**底下都是 Pi 核心机制**。

> **金句 · Matthias**
> **中文：** 外面看像学会了，里面就是又一次工具调用。
> **原文：** From the outside it looks like learning, but inside it's actually just another tool call.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 运行时 | runtime | 执行命令的环境，编码智能体增量组件 |
| Shell | shell / bash | 终端命令入口，Agent 调 FFMPEG 等本地工具靠它 |
| 扩展接口 | extension API | 斜杠命令、会话事件、UI 交互的可插拔层 |
| 斜杠命令 | slash command | 如 `/pipeline`，触发加载上下文与 UI 选择 |
| 多通道 | multichannel | 多线程多 Agent；OpenClaw 在 Pi 上的增量 |
| 嵌入式 Pi 代理 | runEmbeddedPiAgent | OpenClaw 创建 Pi 会话并流式回传的入口函数 |

**本章小结**

- Coding Agent = Core Agent + runtime + Shell；FFMPEG 语音案例是「工具调用伪装成学习」
- Extension API 让 Agent 驱动 UI 选择，终端与 Web 同一机制
- OpenClaw 复用 Pi 内核包，自研 plugin 做多通道与子代理编排

---

## 04 一客户一 Agent，输出草稿，人留在收件箱里改

**Host：** 抛开 demo，你们给客户做的真实业务长什么样？

**Matthias：** 最想讲的是销售流程——这是我们给客户做的应用。用例很具体：收到**提案请求邮件**，对方想订他们卖的另一个系统部件。我们**抛开编码智能体那套壳**，用全新思维方式从头审视这个过程。编码智能体是积木，业务流是你要搭的房子。

邮件进来，我们监控那个收件箱，设**网关**——因为要转发给不同代理。这里我有多个 Agent，结构是**一客户一 Agent**。每个 Agent 有一份通用的 **AGENTS.md** 作示例；你也可以用不同代理描述，帮助理解角色——这份文档说明怎么用系统、对某些输入输出怎么反应。

另一份是 **customer.md**。我们向代理解释：这个客户可能有特定习惯、特定访问权限、特定折扣等等。我特别喜欢用**会话**——每个案例创建并重用现有会话，之前聊过的能追溯。邮件进来，查收件箱，路由到这些不同 Agent。

现在我们有了工具，对吧？不同工具跟 **CRM、ERP** 对话，从系统拉正确信息——这样 Agent 表现才专业，能掌握最新联系人信息。我们再次强调：**让代理易于访问**。目前方法是用**命令行界面**暴露后端——我们的 Agent 非常擅长 CLI，所以就用 CLI。同时数据安全：自有**沙盒**，然后再创建草稿。整个系统逻辑上希望你已经跟上了——实际长什么样？

沙盒老实说我们才刚开始。英伟达 OpenClaw 公告里的策略，以及 **OpenShell**，真的很有意思——保护 Agent 的一种路子。我们在研究，也请你们关注。

界面可能相当无聊——就是**邮件收件箱**。邮件进来，众多邮件里大多数忽略；但这一封，比如 DLM 电话说「我对这个感兴趣」，关联到一个**案例**，上面能看见案例。案例背后又是一个 Agent 会话——找到会话、关联、**创建草稿**。中间很多调用，我稍后可以展示；输出就是一封草稿邮件，用户直接能用。

想法很简单：**让用户留在电子邮件界面**，收件箱、草稿箱，不必做很多额外的事。Dashboard 更像管理界面。他们可以留在邮件里，输出是生成的草稿。背后呢？不同会话、不同线程，其实都一样——助手执行不同工具调用、拿结果、循环，直到最终结果。对用户：看收件箱，新邮件，关联案例，新草稿，**自由编辑**；幕后所有 Agent 在跑。

幻灯片网上有。请记住：**编码智能体是、也将成为你软件系统的核心构建模块**。我深信不疑，很多人也是。Pi 非常适合 tinkering——精简，你能拆开再装回去。去动手试吧。

> **金句 · Matthias**
> **中文：** 编码智能体是、也将是你软件系统的核心构建模块。
> **原文：** Coding agents are and will be a core building block for your software systems.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 一客户一智能体 | one agent per customer | 每客户独立 Agent + AGENTS.md + customer.md |
| 角色文档 | AGENTS.md | 定 Agent 角色、系统用法、输入输出规范 |
| 客户文档 | customer.md | 该客户 workflow、折扣、权限等专属上下文 |
| 命令行优先 | CLI-first integration | 用 CLI 暴露 CRM/ERP，Agent 最熟终端 |
| 草稿输出 | draft output | 自动化止于草稿，人在邮箱里审、改、发 |
| 沙盒 | sandbox / OpenShell | 数据隔离与 Agent 保护；NVidia OpenShell 值得跟 |

**本章小结**

- 企业 RFP 模板：监控 inbox → 网关路由 → 一客户一 Agent + 分层 harness 文档
- CLI 暴露 CRM/ERP + 沙盒 + 草稿输出；人留在熟悉工具（邮箱）里拍板
- Pi 精简可拆——不管喜不喜欢，适合 tinkering；去动手试

---

## 总结：编码智能体是核心积木，Pi 是给 tinkering 的最小集合

| 维度 | 要点 |
|------|------|
| 阶段 | 编码智能体边做边学；无权威 pattern 书，先 tinkering |
| 本体 | Agent = 目标 + 上下文 + 工具循环；企业用 hook + 事件系统干预 |
| 增量 | Coding Agent 加 runtime + Shell；Extension 驱动 UI，OpenClaw 加多通道 |
| 产品 | Excel Skill 示范「小 CLI 打包」；别逼 LLM 直接操作复杂格式 |
| 企业 | 一客户一 Agent；AGENTS.md / customer.md 分层；CLI 暴露后端；draft 让人留在邮箱 |
| 方向 | 编码智能体是软件系统核心积木；关注 OpenShell 等 sandbox 策略 |

### 对个人的启示

- Clone Pi，改 extension：三文件 CRM demo 比读架构图上手快
- 找一个「Excel 级」痛点：拆小 CLI，打包成 Skill

### 对团队 / 产品的启示

- 设计系统先画 core loop，再决定要不要 Shell、extension、多通道
- B2B 自动化：文档 harness + CLI 工具 + 每案 session + 人审 draft
- 嵌 OpenClaw/Pi：内核复用，外围 plugin 自研

> **金句 · Matthias（封底）**
> **中文：** Pi 很精简，你能拆开再装回去——完美适合 tinkering，去动手试。
> **原文：** Pi is perfect for tinkering — you can take things apart and put them back together. Just go try it.

---

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 04:12 | 采用极简主义框架 Pi 降低 Agent 开发门槛 |
| 06:45 | 编码智能体的本质是带运行时的工具循环 |
| 08:30 | 扩展 UI 交互能力让 Agent 具备视觉与选择权 |
| 10:15 | 多通道架构是处理复杂业务逻辑的必然选择 |
| 11:40 | 实战案例：基于 Agent 的销售邮件自动化处理流 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1dZLS66E3m/ingest`
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV1dZLS66E3m/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv49366476/
- **B 站**：https://www.bilibili.com/video/BV1dZLS66E3m/
- **时长**：20:31

### 相关阅读

- [[WorkOS-创建和使用Skills方法论]] — Skills 原子单元与 harness 设计  
- [[IBM团队-Harness工程详解]] — verify、guardrails 等企业 harness  
- [[30分钟精通OpenClaw]] — OpenClaw 个人助理设置与安全  
- [[OpenClaw创始人-我是如何使用OpenClaw的？]] — 创始人视角  
- [[Loop-Agent Loop到底是什么]] — Agent loop 与 harness 分层  

---

### 收录说明

- **视频**：[BV1dZLS66E3m](https://www.bilibili.com/video/BV1dZLS66E3m/)（B 站 *Easonlee的AI笔记*）  
- **讲者**：Tablen AI 创始人（欧洲小型 Agent 公司）  
- **时长**：~20:31  
- **转写**：Recastory `bilibili-retranscribe/BV1dZLS66E3m/`（FunASR SenseVoice + cam++，**asr v2** 14 段）  
- **版本**：canonical Host-Guest v3.2（2026-07-03；原讲义已合并）

