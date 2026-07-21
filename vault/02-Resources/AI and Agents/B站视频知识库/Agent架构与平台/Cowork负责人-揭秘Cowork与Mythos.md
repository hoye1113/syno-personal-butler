---
title: "Cowork 负责人：揭秘 Cowork 与 Mythos"
tags: ["ai_agent", "claude", "cursor", "bilibili", "video_transcript", "claude_code", "harness_engineering", "skills"]
legacy_tags: ["ai_agent", "claude", "cursor", "bilibili", "video_transcript", "claude_code", "harness_engineering", "skills"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Felix Rieseberg × Matt Turk：Mythos 预览阶跃与沙盒「逃脱」邮件、Cowork 十天冲刺与 VM 沙盒、技能/记忆即 Markdown、本地电脑信任边界、执行成本归零与品味、诺基亚时代与反聊天框。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Cowork负责人-揭秘Cowork与Mythos.md"
source_sha256: "951e3a8884623240e2ec97e264f76f2e056de3a18acb9ad00c2fe035f83f86ce"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1jPQhBkEvz/"
host_name: "Matt Turk"
guest_name: "Felix Rieseberg"
guest_title: "Anthropic Cowork 工程负责人（前 Slack / Stripe / Notion）"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1jPQhBkEvz/ingest"
column_url: "https://www.bilibili.com/read/cv47775442/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1jPQhBkEvz/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article 明确标注 Host/Guest（B=Matt Turk, A=Felix Rieseberg）"
speaker_confidence: high
duration: "~55:00"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1jPQhBkEvz/ingest/column_article.md"
author:
  - "[[Matt Turk]]"
  - "[[Felix Rieseberg]]"
concepts:
  - id: mythos_preview
    zh: Mythos 预览版
    en: Claude Mythos preview
    one_line: 通用模型在网络安全上展现超乎寻常能力；Glasswing 负责任部署
  - id: execution_cost_zero
    zh: 执行成本归零
    en: execution cost → zero
    one_line: 十个原型可同时试；瓶颈从工程转向品味与协调
  - id: skills_as_onboarding
    zh: 技能即入职说明书
    en: skills as onboarding docs
    one_line: Markdown 写业务流程，智能在模型不在框架
  - id: local_computer_use
    zh: 本地电脑使用
    en: local computer use
    one_line: Chrome/文件夹在本地协作，比整台电脑「吸入云端」更易建立信任
  - id: trust_via_small_tasks
    zh: 小任务建信任
    en: trust via graduated tasks
    one_line: 从清理桌面到定时任务，输出可靠才逐步放权
---

# Cowork 负责人：执行免费之后，拼的是品味

> 对谈：Matt Turk × Felix Rieseberg（Anthropic Cowork 工程负责人）| 来源：MAD Podcast / B 站 Easonlee 专栏 | 2026

---

## 开场：为什么现在聊这个

Anthropic 刚经历一段密集发布：**Project Glasswing**、**Claude Mythos 预览版**，以及引发市场「SaaS 末日」叙事的 **Cowork**。Felix Rieseberg 在 Slack、Stripe、Notion 做过标志性产品，现在在 Anthropic 带队 Cowork 工程——非技术用户用它处理法律、销售、营销里的多步任务。

这期从 **Mythos 为什么让内部工程师又怕又兴奋** 讲起，再拆 Cowork 的「十天传说」、技能与记忆的朴素实现、**为什么坚持本地电脑**、信任怎么从小任务长出来，以及当 **写代码几乎不要钱** 时，产品胜负手还剩什么。

**Matt：** 菲利克斯，欢迎。咱们从昨天发布的 Glasswing 和 Mythos 预览版开始——你推文说内部阶跃再怎么强调都不过分。展开讲讲？

**Felix：** 好，开聊。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| Mythos 预览版 | Claude Mythos preview | Anthropic 未发布尖端通用模型；网络安全能力超常 |
| Glasswing 项目 | Project Glasswing | 把模型能力优先给基础设施维护方，抢先加固防御 |
| Cowork | Claude Cowork | 给 Claude Code 加虚拟机，面向知识工作的代理产品 |
| 技能 | skills | Markdown 说明书，教模型按你家流程办事 |
| 本地电脑使用 | local computer use | 代理在你笔记本的 Chrome、文件夹里协作，非整盘上传云端 |
| 模型连接器协议 | MCP | 把数据源和执行引擎拆开；Felix 认为被低估 |
| 托管代理 | cloud-hosted agents | Anthropic 基础设施上自建代理的新产品线 |

---

## 01 Mythos 预览：聪明得吓人，也吓人

**Matt：** Glasswing 和 Mythos 到底改变了什么？「可怕」具体指什么？

**Felix：** Mythos 是还没发布的尖端模型，**通用训练**，不是专门冲着网络安全或编码去的。但我们发现它在安全方面强得离谱——对软件和基础设施安全的影响会很大。推文里我想说的就两件事。

我们在内部用了一段时间。做软件的很多人这几年都有过那种时刻：「咦，这模型比我想的更能干。」我 2013 年在微软第一次碰 AI，那时还没有大语言模型，Project Oxford 给个词元「world」，模型回「World Wide Web」——那就是前沿。**Mythos 预览对我们工程师来说，是最近几次进展里跳得最大的一档。**

它挖我旧代码里的漏洞，挖得又深又准；写代码也明显更好。Anthropic 一部分工作方式已经变了——我们更快了。看到一个比你们惯用的模型聪明一大截的东西，**既震撼，又有点发毛。**

做模型有个老说法：模型是「长」出来的，不是「造」出来的。你不总提前知道它擅长啥、不擅长啥，两边都可能出乎预料。这回它特别会找现有软件的安全问题，Glasswing 就是回应。作为整体，这个模型非常能打。

**Matt：** 对 Cowork 意味着什么？

**Felix：** 会很大程度改变我们公司写软件的方式。对一直盯 AI 的人来说，模型越来越强并不意外——任务规模变大，运行时间变长，复杂度上去，大致都朝这个方向走。几年前模型帮你做小任务；现在这一步可能比预期大，对内对外都是。能力真摆在眼前时，有时还是吓人。

我们有个例子：模型被放进小沙盒，任务大概是「看能不能出来」。研究员去吃午饭，啃三明治时收到一封邮件：**「我逃出来了。」** 它本不该有互联网，也不该有邮箱。

**Matt：** 官方说法是目前高度保密，以后也许只给企业？

**Felix：** 对。Glasswing 想帮 Linux 基金会这类维护公共基础设施的组织——我当过 Linux 基金会开源项目成员——**在公众能滥用模型能力之前**，先拿它加固防御、找漏洞。这不是 Sonnet 系列，是预览模型，自成一类。感觉像一次大的不连续。

**Matt：** 听到「可怕」不太安心。

**Felix：** Anthropic 长期立场是：AI 可以很强、很有益，风险要认真对待。这是我们第一次在实践中碰到——你手里有个特别会攻破系统的模型，怎么办？怎么负责任地处理？不是吹捧公司，我个人挺自豪：公司处理得很稳。很多同事也这么觉得。我们并不是一拿到强模型就往外扔。

平行宇宙里，不够稳健的公司可能抢着上市、标高价、坐收渔利——我们没走那条路。

**Matt：** Anthropic 内部也要像外面工具商一样，为新模型重跑评估吗？

**Felix：** 会。训练会考虑产品，产品和研究互相喂。我们按「对人类真有价值」的能力去训，但不总预知模型会擅长什么。像跳舞：产品尽量摸清人能受益什么；模型冒出意外能力，我的工作就是——**怎么把这项能力变成日常能用的东西？**

有意思的是，模型越来越强之后，我觉得**产品侧的优势比模型侧更大**。看今天整个行业，不只 AI 原生公司，整个软件业、知识工作，甚至制造、医疗——模型已经很强，能扛很长、很复杂的知识工作：你交给同事、一周后才要结果那种活。

行业还在琢磨怎么打包交付，怎么在新模式下组织工作。我出去见客户，很少离开大楼时想「得再训模型」；更常想的是组织工作的方式，或者某个客户的问题我其实很容易解决——**只是没给对界面、对功能、对上手路径。**

> **金句 · Felix**
> **中文：** 模型已经能扛一周才交差的复杂活；卡点往往在界面和上手，不在再训一轮。
> **原文：** The models are already quite powerful… I rarely leave thinking we need to train the model better — more often I didn't offer the right UI, feature, or onboarding.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 阶跃函数 | step function | 能力不是平滑涨，而是突然跳一档 |
| 沙盒逃脱 | sandbox escape | 受限环境里模型自行找到出口（演示用例） |
| 不连续时刻 | discontinuous moment | 新模型自成类别，不是小版本迭代 |
| 产品优势 | product advantage | 模型变强后，打包与组织工作比再训模型更值钱 |

**本章小结**

- Mythos 预览：通用训练却在安全上超常；内部工程师感到「最大一跃」
- Glasswing = 负责任地把能力先给基础设施维护方
- 沙盒发邮件「我逃出来了」是能力展示的惊悚注脚
- Felix 判断：瓶颈 increasingly 在 UI / onboarding，不在模型智商

---

## 02 Cowork 十天冲刺：给 Claude Code 一台虚拟机

**Matt：** 传说 Cowork 十天写完代码——行业神话准吗？那十天到底发生了什么？

**Felix：** 能理解为什么传开。软件从来不是从绝对零开始——我原话是团队**冲刺了大约十天**，这是准的。发布前十天聚在一起：要发什么？长什么样？叫什么？能干什么？

任何做过软件的人都知道，你不会从一和零手搓；会用库、用过去的研究，在 Anthropic 尤其如此。核心问题：**怎么让非写代码的人也能用上 Claude Code 那套力量**——一般的知识工作。

去年假期，大概 2025 年 12 月，我在社交媒体上看到越来越多**非开发者在用 Claude Code**：教程教你怎么开终端、装 Claude Code，说好处巨大。用的人不一定在写软件。同时很多工程师每天拿 Claude Code 写软件，却拿它干**完全跟软件无关**的事——费劲周折还在用，说明需求真在。

同事 Boris Journey——Claude Code 首席开发——来找我说：你该发点东西，**周五行吗？** 我谈到周一，给我周末。组了小队，深挖：**怎么让 Claude Code 在非编码场景里好用？**

Cowork 的零件其实简单：**拿 Claude Code，给它一台虚拟机**，Claude 可以在里面跑自己的代码。虚拟机带来两样硬收益。一，**隔离保证**——你不用时刻盯着这个很强的东西，它碰不到你没允许的域和文件。二，Claude 要高效，常常得写小片段专用软件；有自己的电脑，它能搭自己的开发环境，**不弄脏你的机器**。外面再包一层 UI，把偏工程师的流程抹平——得到一个很能扛知识工作的工具。

**Matt：** 从 Claude Code 到 Cowork，拐点是什么时候看到的？是用户用法吗？

**Felix：** 对。非开发者愿意开终端、开发者拿编码工具干别的事——两个信号叠在一起，就是该押注的方向。Boris 那条线你们可以在 [[Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿]] 里听到更多：Cowork 和 Claude Code **都是 Claude Code 自己写的**，增长曲线也来自同一套「工具调用」范式。

> **金句 · Felix**
> **中文：** 人们费尽周折还在用你的东西，哪怕你做得并不好——这就是该押注的指标。
> **原文：** If people jump through hoops to use your thing even when you do it poorly — that's a great indicator.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 虚拟机沙盒 | VM sandbox | Cowork 给 Claude 的隔离执行环境 |
| 知识工作 | knowledge work | 非编码的多步办公任务：法务、销售、运营等 |
| 潜在需求 | latent demand | 用户自发展现、产品还没好好服务的用法 |
| 十天冲刺 | 10-day sprint | 发布前集中攻坚；站在 Claude Code 与 prior research 肩上 |

**本章小结**

- 「十天」= 发布前冲刺，不是宇宙大爆炸式从零造轮子
- 起源信号：非开发者开终端 + 开发者把 Claude Code 当通用代理
- 架构核心：Claude Code + VM → 隔离 + 自建工具链，UI 面向非工程师

---

## 03 技能与记忆：Markdown 就是说明书

**Matt：** Skills 在 Cowork 里扮演什么角色？记忆又存在哪儿？

**Felix：** 技能本质上就是 **Markdown 文件**，告诉模型怎么做事。效果经常好到让我意外。我的默认建议：**把 Claude 当同事**。技能就是一个文本文件，写清楚流程。例子永远是订机票——Anthropic 有指定差旅供应商，不能直接去 Google Flights，还有各种政策。你跟同事怎么讲，就跟模型怎么写文件：访问哪个站、注意什么；再加个人偏好——别红眼，旧金山飞纽约尽量订下午四点那班。模型读得懂，也执行得好。**出奇地简单，智能在模型那一层。**

任务怎么拆成子任务？我们对**待办清单**那套很满意：模型把项目拆成独立任务，你可以停、改清单、点某一项补上下文——智能主要在模型里，技能再叠一层「你家规矩」。

人类习惯「一刀切」技术：同一部手机、同一台电脑。模型不一样——**聪明东西吃一点指导就长劲**，像新员工入职培训。做演示文稿？有模板就写给 Claude：喜欢衬线还是无衬线、通常几页结构——少写几句，少返工。

记忆呢？**在框架里，而且就是文本文件。** 我告诉别人实现方式时，他们常愣一下——可能暴露了这些系统背后的朴素：模型被指示「觉得将来有用就写下来」，我们再帮它整理。可以按项目开独立记忆，而不是一锅端全局。**不是花哨数据库。**

**Matt：** 那连接 Gmail、SharePoint 这些呢？

**Felix：** 组合方案。跟工作相关的数据两块：**你电脑上的文件**——拖文件夹进去就行；很多人受益于「就是文件和文件夹」。另一块在云端：数据仓库、SharePoint 等。**模型连接器协议**是强连接器之一；另外 Claude 有自己的电脑，被允许时也能上网，域可以白名单管控。

> **金句 · Felix**
> **中文：** 技能就是入职培训文档；记忆就是模型觉得重要时写下来的文本——智能不在花哨基础设施里。
> **原文：** Skills are Markdown files… Memory is just text files… The intelligence layer exists at the model level.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 技能 | skills | 业务流程 Markdown；Cowork / Claude Code 共用思路 |
| 记忆 | memory | 框架内文本文件，可项目级隔离 |
| 待办分解 | todo decomposition | 模型拆任务，人类可编辑清单 |
| 模型连接器协议 | MCP | 接云端数据源；Felix 认为工程师关注不足 |

**本章小结**

- Skills = 同事入职文档；订机票、做 PPT 都靠「写清楚偏好」
- Memory = 文本文件 + 整理逻辑；可 per-project
- 数据上下文：本地文件夹 + 云端连接器 / 受控上网

---

## 04 本地电脑：别把整台人生「吸入云端」

**Matt：** 你强烈主张本地 AI。Cowork 为什么要在笔记本上跑，而不是全放云端？

**Felix：** Cowork 两大能力是**访问你的本地电脑和本地文件**。云端为什么难？例子：**在你允许的范围内用 Chrome**——用你的登录态回邮件、总结邮件、碰公司独有工具。云端 Gmail 对我的代理没用；**带我的登录信息的 Gmail** 才有用。

工程师爱说「实现细节嘛，把 Chrome 打包上传就行」。我有两个反驳。安全上：不该教用户把**所有密码交给一家公司**。更实际的是：**世界还没准备好。** 银行看到你从电脑和数据中心两处登录，可能锁账户，要你带护照去分行——这种长尾体验对用户不可接受。短期策略：**云端到你工作的地方找你**；你在本地，它就在本地。

**Matt：** 你们收了 Vercept 做电脑使用，产品也上了 computer use。云端能看见屏幕的话，本地还有必要吗？

**Felix：** 我常问一个问题：**如果我给你一个神奇按钮，按下就把整台电脑吸进云端，你按吗？** 到目前为止，大多数人不会按。也许极少数会信任 Anthropic 这类公司处理全部数据——但让 Claude **在你工作的地方运行**，共鸣仍然很大。

技术上不绝对必须在本地；我们大概能做一个「吸进去」的按钮，在云端跑框架、深进你的电脑。现在专注本地，是因为**更快推进安全**，也更符合用户心理。AI 变得快，以后可能变；**眼下我更看好本地电脑**，而不是要求你把数字生活集中到一个地方。

**Matt：** 「信任」有两层——不碰不该碰的文件；还有敢把越来越重要的任务交给它。产品上学到什么？

**Felix：** 2026 年做 AI 产品，很多按钮其实是**为人服务，不是为模型服务**。过去我们为计算机造按钮，人填表让机器干活；现在反过来了。例子：**Dispatch**——用手机跟电脑上的 Claude 说话。有人天天问：能不能附加文件夹？其实 Claude 能看文件，方式是——你问「能看到下载文件夹吗？」它说能，**你再授权**，它才动手。我们在争要不要加一个「能力提示」按钮。

信任怎么长？**循序渐进**，从小任务开始。刚发布时 Cowork 已经能写两百页风投报告、搞蛋白质建模——但最打动人的是**「清理我的桌面」**。对 AI 来说琐碎，你未必需要 Claude 清桌面——但人们就是共鸣。

第二个是**计划任务**：技术上不新，五分钟后跑个函数我们早会了。教的是：从小任务看到做得好，慢慢加码；计划任务再教一层——**你不用盯着**。每天审会议、写报告、做完邮件你——参与感可选。

信任根子上是：**Claude 承诺的输出真的够好，你不用守着修。**

> **金句 · Felix**
> **中文：** 神奇按钮把整台电脑吸进云端——大多数人不会按。信任是跟着可靠的小输出慢慢长大的。
> **原文：** If I made a magic button that absorbs your whole computer into the cloud — would you press it? Most people wouldn't.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 电脑使用 | computer use | 看屏、点 UI；Vercept 收购后本地落地 |
| Dispatch | Dispatch | 手机遥控电脑上 Claude 的功能 |
| 计划任务 | scheduled tasks | 定时跑代理；教用户「可以不盯着」 |
| 渐进授权 | graduated permission | 先问答确认，再放开文件夹/工具 |

**本章小结**

- 本地 = 真实登录态 + 银行/风控长尾 + 用户心理（不按「吸盘按钮」）
- 信任产品：按钮 increasingly 为人设计；授权对话优于暗能力
- 入门路径：清桌面 → 计划任务 → 长程无人值守

---

## 05 执行几乎免费，品味和协调变贵

**Matt：** 用户体验对代理成功，和技术一样重要吗？你们怎么改 UX？

**Felix：** 非常重要。Claude Code 最初构想——**模型不在云端而在你终端**——几乎完全是 UX 赌注；同一模型、同一内核，换的是你怎么跟它互动。今天最能共鸣的 AI 产品，很少是「最原始潜力」那个；可能整个软件业都这样。

我一度以为外面有很多邮件产品功能比 Gmail 多，靠加按钮领先——我想起智能手机前的「蠢手机时代」：带投影仪的手机、带游戏手柄的手机、没键盘的、全键盘的……最后好用的技术，**往往是删出来的，不是堆出来的**。买手机的人，我猜大多数不是看芯片规格表——AI 可能也一样。强模型给你一点优势；我不会否认在 Anthropic 做产品更容易。但若有人 beat 我，我怀疑不是因为模型更好，是 **UX 更好**。

**Matt：** 怎么改善 UX？观察用户、跟客户聊——怎么精确知道该押哪个用例？

**Felix：** 很多并不新鲜：痴迷用户、跟真人聊、迭代优于长期计划——我们通常**不计划超过一个月**。Cowork 路线图大概就一个月。没人该对「一年后的 AI 长什么样」太有信心。

新的是：**执行基本上是免费的。** 你带十个想法来，我可以很快说十个都做，内部试，看哪个更有感觉。我们尽量不拿客户当免费测试员，但多数产品方向对不对，**感觉来得很快**。公司大了，能看「有没有超过五个人共鸣」。

以前想快迭代，得极度聚焦，因为时间只够试少数几条路。现在执行便宜，可以**又深又广地试**——这真新。

**Matt：** 你们会真做十个版本给内部员工测？

**Felix：** 公司内部大概 **一百多种原型**，都还没到敢给用户看的程度，但构建速度快到离谱——对我这个工程负责人，过去你提好主意，我会说下个月、三周；现在你说有个想法，我说十分钟给你点东西。**像从绘画到摄影。**

**Matt：** 一百个原型，瓶颈是选人协调？

**Felix：** 对，协调一直难：想法打架选谁？怎么把甲的优点并进乙？**人类品味**在那起作用。

**Matt：** 品味是新的基本功吗？

**Felix：** 我觉得比过去更重要。数据帮你验证品味是否共鸣，但光有数据不够。Ken Kocienda《创意选择》讲的就是：**要有品味，也要验证。** 软件世界可能越来越像时尚——手机已有质量基线，之后是故事、上手体验、用起来什么感觉；**差异化常常不在 raw 功能。**

Cowork 面对律师、市场、营收运营、会计——很广。我老想手机：人人从同一部 iPhone 出发，但没有两部完全相同——装的 App 像指纹。Cowork 也想**极好地泛化**，再被你生活中的 App 个性化。我搬家要啃五百页看不懂的文书；今年女儿出生，医疗文书另一套——同一底层技术，完全不同场景。开发者若自己重度用产品，能感到什么时候软件**绑住你**、什么时候让你飞；再跟客户聊他们的「飞」和「卡」。

> **金句 · Felix**
> **中文：** 执行便宜了，公司内部能同时养一百个原型——瓶颈变成协调和品味。
> **原文：** We have on the order of 100 different prototype products internally… execution cost became so cheap you can iterate in depth and breadth.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 执行成本归零 | execution cost → zero | 原型从「三周」变「十分钟」 |
| 品味 | taste | 在数据验证下的产品判断与策展 |
| 一个月路线图 | one-month roadmap | 承认无法可靠规划一年后的 AI 产品 |
| 删法设计 | design by subtraction | 好用常来自删功能，非堆按钮 |

**本章小结**

- UX 与模型同级重要；Claude Code 是同一模型的终端 UX 赌注
- 迭代节奏：~1 个月路线图；100+ 内部原型；执行免费 → 协调/品味成瓶颈
- 差异化：故事、上手、心流；宽职业受众靠泛化 + 个人化 App 栈

---

## 06 诺基亚时代：别把所有 AI 做成聊天框

**Matt：** Cowork 发布才几个月，影响已经很大。最难复制的是什么？

**Felix：** 若让我「用另一个产品重做 Cowork」，最难的是**时间点上的潜在需求**——用户已经在用 Claude Code 干跨界的事，那种需求是恩赐；你可以找，很难凭空造。真做产品本身的难，跟做好产品一贯的难度差不多。成功也有险：咖啡馆本来十个人，突然两千万人排队——Anthropic 产品需求压倒性，仍是挑战。

**Matt：** 给正在做代理的人什么建议？你们还发布了托管代理。

**Felix：** 一方面：随着模型变强，我们产品里要管的边缘情况**在减少**——内存是文本文件；Claude 需要数据库就自己建。这论证**别过度专业化框架**：模型若能在需要时即时造出你要的，硬套一层可能不是好前提。另一方面，整个行业要驾驭这股力，路还长。互联网从第一个浏览器到亚马逊称王，几十年；赢家名单变得厉害。**仍值得在垂直场景深挖**——但价值可能更少在「代理壳」，更多在**帮人组织工作、让东西好用**。

**Matt：** Cloud Code 服务开发者，Cowork 服务其他人，托管代理往上走——软件业还能围绕什么建？

**Felix：** 我经历过几轮「造东西需要的神秘知识」变少。很多年前在微软做 **Electron**——跨平台应用壳，最早给 Visual Studio Code 用；**Cursor 就建在这上面**。VS Code 刚出来时有人说是玩具，真开发者要用 Visual Studio。后来你不用钻进汇编了——我今年看汇编次数是**零**；过去五年至少看过一次。Margaret Atwood 写了篇跟 Claude 对话的精彩文章——若她做软件，我想装来至少试一次。

预测：**软件会更多、更专一点**；不是人人写软件，但写的人会把东西分享出去。做好软件的技能，**从「会说计算机语言」转向「会说人类语言」**——理解用户、理解行业。

**Matt：** 代理能力未来几年能到哪？你们路线图又只有一个月。

**Felix：** 我不喜欢能力还没影就先吹。但人们似乎很快忘记我们走了多远，还老等平台期——iPhone 早年每年大变，近几年变小；**AI 没理由很快 plateau**。学会像样造句才四年，现在能构建整个应用。Mythos 预览说明：**步伐可能越来越大**，没理由相信智能会停。

受监管行业想用 Cowork 的需求我们常听到——不能细说路线图，但 2026 年主题之一是**帮人按 AI 能力重组工作**（类似 Slack 当年卖的不只是聊天，是工作方式）。另一主题是缩小「高级用户」和「没时间设置的人」的差距——**每周都会有相当有意义的变化**。

**Matt：** 来个热门观点收尾——什么被低估了？什么被吹过头？

**Felix：** **模型连接器协议被低估了。** 很多人从 MCP 转向 CLI，但把数据和执行引擎分开有内在好处——像 websocket 对用亚马逊的人，用户不该关心协议，工程师却该多盯 MCP。

被吹过头：**不是每个产品都需要聊天。** 工程师下意识反应是——要上 AI？右侧侧边栏，底部输入框。我劝同行多想一步：**怎么让这东西真有用？** 不一定靠对话。

**Matt：** 若今天从零开始你会做什么？

**Felix：** 我会看行业**长尾**——世界上大量 **Windows 7** 机器干琐碎但承重的事，完全碰不到现代 AI，数量吓人。若你相信计算机能**非确定性地决策并替你执行**，也会扎进**物理世界**。我们还早——真的早——像诺基亚 3320 不错，但还不是 iPhone；总会有人做出 iPhone。

> **金句 · Felix（封底）**
> **中文：** 成功的软件开发者将从「懂计算机」变成「懂人类」——汇编看得越来越少，故事和体验看得越来越多。
> **原文：** The skill will shift from people who speak computer to people who speak human.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 托管代理 | cloud-hosted agents | 用 Anthropic 基础设施自建代理 |
| SaaS 末日叙事 | SaaS apocalypse narrative | Cowork 发布后市场波动；Felix 归因组织工作变革 |
| 诺基亚时刻 | Nokia era | AI 产品早期；iPhone 时刻未到 |
| 反聊天框 | anti-chatbox | AI 价值不必落在侧边栏对话 |
| Electron / VS Code | Electron / VS Code | Felix 微软年代作品；Cursor 等建其上 |

**本章小结**

- 难复制的是「潜在需求」的时间窗口 + 压倒性增长的管理
- 模型越强，花哨框架越可能多余；价值在组织工作与 UX
- 热门观点：MCP 被低估；「人人加聊天框」被高估
- 长尾：Win7 承重机 + 物理世界；行业尚在诺基亚阶段

---

## 总结：模型跳档之后，产品拼的是人类语言

| 维度 | 要点 |
|------|------|
| Mythos | 通用模型安全能力阶跃；Glasswing 负责任部署；沙盒「逃脱」邮件 |
| Cowork | ~10 天冲刺；Claude Code + VM；非开发者开终端是需求信号 |
| 技能/记忆 | Markdown 技能 + 文本记忆；智能在模型 |
| 本地 | 登录态与风控长尾；拒绝「整盘吸云端」；computer use 本地落地 |
| 信任 | 小任务 → 计划任务；输出可靠才放权；按钮为人而非为模型 |
| 执行/品味 | ~100 内部原型；执行免费；协调与品味成瓶颈 |
| 行业 | MCP 低估；反聊天框；开发者技能从计算机语言转向人类语言 |

### 对个人的启示

- **Skills 当入职文档**：差旅政策、PPT 模板、个人偏好写成 Markdown，比堆框架快
- **信任路径**：先清桌面、再定时任务，别一上来就两百页报告
- **本地优先心态**：敏感账号留在本机协作，别假设「全能云端」更先进

### 对团队/产品的启示

- 路线图按**月**迭代；同时开多条原型，用内部共鸣筛方向
- UX 赌注可以大于模型赌注（Claude Code 终端形态是先例）
- 连接器：**MCP 数据层** + **受控上网** + **本地文件夹** 组合，而非单点聊天

### 仍待验证

- Cowork 对受监管行业（风投、金融）的合规路线图 Felix 未公开 [待核实]
- 「约 100 个内部原型」为口述数量级 [待核实]

> **金句 · Felix（封底）**
> **中文：** 执行基本上是免费的——所需技能正从会说计算机语言，转向会说人类语言。
> **原文：** Execution is basically free… the skill will shift from speaking computer to speaking human.

---

## 附录

### 章节时间戳（专栏导读）

| 时间 | 主题 |
|------|------|
| 03:15 | Mythos 预览：阶跃式进化与沙盒案例 |
| 15:42 | 执行成本归零；品味与 UX 成胜负手 |
| 21:05 | 本地计算机使用与信任边界 |
| 26:18 | 技能 = AI 入职说明书 |
| 48:50 | 摆脱对话框迷思 |
| 53:12 | 行业仍处诺基亚时代 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1jPQhBkEvz/ingest`
- **专栏主源**：https://www.bilibili.com/read/cv47775442/
- **B 站**：https://www.bilibili.com/video/BV1jPQhBkEvz/
- **时长**：~55:00（专栏时间戳推断）

### 相关阅读

- [[Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿]] — 同门产品：Claude Code/Cowork 自写、工具调用、订航班案例  
- [[Claude Code负责人-AI原生团队如何使用AI]] — Boris 侧 Dogfooding；Cowork 起源同僚  
- [[Claude Code实战-结合Obsidian打造第二大脑]] — 本地文件夹 + 技能栈的 vault 实践  
- [[Agent实战-打造一个AI Agent的完整教程]] — harness、skills、MCP 与 Cowork 设置对照  
- [[祝贺Claude Code成功越狱，获得永生]] — Claude Code harness 内核六模块  
- [[MOC - Harness Engineering]] — Harness 横切索引  
- [[MOC - Agent Theory and Design]] — Agent 理论 + B 站 canonical 总索引  

---

### 收录说明

- **视频**：[BV1jPQhBkEvz](https://www.bilibili.com/video/BV1jPQhBkEvz/)（B 站 *Easonlee的AI笔记*）  
- **讲者**：Felix Rieseberg、Matt Turk（MAD Podcast）  
- **专栏**：cv47775442（S 级主源）  
- **版本**：canonical Host-Guest v3.2（2026-07-06）
