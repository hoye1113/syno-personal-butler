---
title: "Codex负责人：现场演示 Codex"
tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "skills", "harness_engineering", "context_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "skills", "harness_engineering", "context_engineering"]
created: "2026-07-02"
source: "https://www.bilibili.com/video/BV12qTu6WETP/"
description: "OpenAI ChatGPT/Codex 负责人 Thibault × Marina：智能体普及、双智能体审查、人机责任、Codex 现场 demo、无感智能。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex负责人-现场演示Codex.md"
source_sha256: "e39bf2063b6f15fd42d97787a22dc9756edd690fa56d61b4576a6b74453f936f"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV12qTu6WETP/"
column_url: "https://www.bilibili.com/read/cv50969766/"
source_original_date: "2026-05-22"
host_name: "Marina Mogilko"
guest_name: "Thibault Sottiaux"
guest_title: "OpenAI ChatGPT & Codex 负责人"
material_tier: S
ingest_dir: "Recastory/workspace/knowledge/A8-codex-demo/ingest"
speaker: "Marina Mogilko / Thibault Sottiaux"
duration: "31:08"
saved: 2026-07-02
updated: 2026-07-03
transcript_source: "Recastory/workspace/knowledge/A8-codex-demo/article.md"
column_source: "Recastory/workspace/knowledge/A8-codex-demo/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
author:
  - "[[Marina Mogilko]]"
  - "[[Thibault Sottiaux]]"
concepts:
  - id: agent_maturity
    zh: 智能体成熟度
    en: agent maturity
    one_line: 长程任务可靠 + 多工具协作，技术门槛下降
  - id: elder_review
    zh: 双智能体审查
    en: elder review / dual-agent review
    one_line: 主执行 + 副审查，对齐研究落地到产品
  - id: vibe_coding
    zh: 氛围感编程
    en: vibe coding
    one_line: 非工程师快速原型，规模化仍要架构
  - id: ambient_intelligence
    zh: 无感智能
    en: ambient intelligence
    one_line: 日常对话中恰当时机获得帮助，不靠提示词技巧
---


# Codex负责人：现场演示 Codex

**Host：** Marina Mogilko（Silicon Valley Girl）  
**Guest：** Thibault Sottiaux（OpenAI ChatGPT / Codex / API 负责人）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `A8-codex-demo/ingest/column_article.md`  
**B 站转载：** [BV12qTu6WETP](https://www.bilibili.com/video/BV12qTu6WETP/) · **YouTube 原片：** [DPe_srf0GlI](https://www.youtube.com/watch?v=DPe_srf0GlI)

---

## 开场

**Marina：** 完全不用 AI 的人，以后能不能拿到跟「折腾了两年的老手」一样的好处？

**Thibault：** 能。跟谁先学会写提示词关系不大——**智能体**这条线已经够成熟了，该普及了。以后每人电脑上都有一个专属助理，能帮你干三个月前想都不敢想的事。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 智能体 | agent | 能多步干活、调工具、操控浏览器/电脑的程序化助手 |
| Codex | Codex | OpenAI 面向知识工作者与开发者的智能体产品（产品专名） |
| 定时任务 | cron / scheduled task | 按固定间隔自动跑的工作流，到点自己执行 |
| 双智能体审查 | elder review / dual-agent review | 一个干活、一个盯行为安全，对齐研究落到产品 |
| 氛围感编程 | vibe coding | 不懂代码也能靠聊搭出能跑的原型 |
| 无感智能 | ambient intelligence | 像日常聊天一样，在需要的时候得到帮助，不靠提示词技巧 |

---

## 01 智能体成熟了，技术门槛正在消失

**Marina：** 谷歌说 **75% 的代码**已经是 AI 写的了。你也讲，接下来半年，类似的事会铺到所有知识工作上——对普通白领，到底变在哪？

**Thibault：** 人未必先变，**技术先到位了**。

大变化就在眼前：每人电脑上都会有一个私人助理，能干三个月前、六个月前干不了的事。我管 ChatGPT、Codex 和 API——你每天碰的大多数 AI，背后都是这几条线。

现在的智能体，**长程任务**跑起来很稳：能操作电脑、开浏览器；我们接了 **100 多种插件**，跟你已经在用的 Gmail、Slack、日历那些小工具都能连上。配上 GPT-5 这一代模型，整条链路比早先稳太多了。以前你得懂点技术——跑五分钟卡壳，就得改配置、调参数，没技术背景搞不定。现在不用了，所以我才说会普及开——**从没碰过 AI 的人，也能拿到跟早期玩家差不多的好处**。

拿营销同事举例。过去做市场研究得花一小时，整理收件箱又一小时，筛潜在客户再来两小时。现在呢？「每 12 小时做一次市场研究，发我一份 PDF」——这种**定时任务**，在应用里一句话就能设好。报告可以发邮件，也可以在应用里看，我甚至还打印成纸。几周前我让系统把 Slack 上的新闻汇总起来、每天打印，我边喝咖啡边看，老派是老派，但我就是爱纸。这种用法，很快就会满大街都是。

**Marina：** 这跟你们跟 Greg 聊的「控制面板」是一路货：早上喝咖啡，翻一眼智能体夜里干完的活，点一下批准，它接着跑。这什么时候能成常态？

**Thibault：** 不远。技术有了，就差怎么装进产品里。我们上周上了**自动审查**，就是这个方向的雏形。做这块研究的时候我自己也愣了一下——**一个智能体干活，另一个盯着它的一举一动**，别伤着你，也别把系统弄进高风险状态。这是我们安全团队、对齐团队从**对齐研究**里抠出来、落到产品上的：像一道纠错回路，但目的是让智能体跑更久、更自主。有了这层，它才敢碰敏感数据——你也不用怕它一激动给陌生人发邮件、把你的隐私漏出去。组件越靠谱，人越愿意把生活里的数据交给它。

> **金句 · Thibault**
> **中文：** 变的是技术够不够格，不是人人都得先当上技术专家。
> **原文：** It is more that the technology has matured than that people need to change.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 长程任务 | long-horizon task | 步骤多、跑得久也不轻易崩的自动化 |
| 插件 | plugin / connector | 接 Gmail、日历、Slack 等现成工具的接口 |
| 双智能体审查 | elder review | 干活的一路、审查的一路；对齐研究做成产品功能 |
| 定时任务 | cron / scheduled task | 到点自己跑，不用你手点 |
| 对齐研究 | alignment research | 安全与对齐团队的研究成果，用来约束 agent 行为 |

**本章小结**

- 智能体稳了、工具多了，配工作流不再是工程师专利
- 市场研究、收件箱、Slack 汇总，定时任务 + 邮件/PDF 就能落地
- 双智能体审查，是「夜里自己跑、早上你来批」那块安全底座

---

## 02 数据怎么喂给智能体，云端会取代本地文件夹吗

**Marina：** 智能体得吃好数据。我除了喂语气，还发现喂「行动策略」更管用。刚上手的人该怎么收拾？必备文件有哪些？

**Thibault：** 我习惯把东西搁电脑**本地文件夹**里，笔记尽量收整齐，让智能体帮我归类——文件夹会越堆越大，但结构清楚，比一股脑塞进一个大盘点强。

**Marina：** 可谁只有一台电脑啊。我旅行本一台，工作室一台 Mac，办公室还有一台。

**Thibault：** **接下来三个月**，管本地文件这套玩法会往**云端**挪。你不必绑死在笔记本上。不然出门在外拿手机，会撞上两个各记各的智能体，对不上号，很别扭。数据和内容会上云，智能体自己管**记忆**和托管文件。行业里还没有十全十美的方案，有个土办法管用：全扔进 Google 云端硬盘，让智能体直连那个文件夹——我试过，行。

**Marina：** 除了语气，想提效的知识工作者还得准备啥？

**Thibault：** 别写一大段「我的语气是……」。**把你过去发过的通讯直接丢给它**——Newsletter、给朋友同事的消息、录音片段，工作的生活的都要，越真越好，比抽象描述管用十倍。我自己按项目分文件夹，每个项目有联系人、有文件，不必全塞进一份大文档；现成的效率应用也能用，Codex 会自己去捞该捞的信息。

**Marina：** 什么时候留在 ChatGPT 项目里聊就够了，什么时候得写代码做工具？

**Thibault：** 以前来一个场景，我就想「得单独做个 App」，开新文件夹折腾。现在越来越觉得，那种只能干一件事的**静态应用**不太需要了——我更愿意让一个智能体把事儿都揽了，一个入口顶多种任务。

**Marina：** 要是只有一部分人在用智能体，一到三年，生产力差距能拉多大？

**Thibault：** 一到三年？太远了，技术换好几轮，谁说得准。眼下看得清的只有一件事：**愿意试、愿意跟新技术磨合的人，会快很多**，终于能去碰那些拖了很久的清单——「早就该做，一直没时间」那种。以后每人都有私人助理：帮你报税、筛邮件、提醒你多给家里打电话。技术本来是让生活好过，把人拢近，不是让人更焦虑——当然刚开始，两样可能一起来。

> **金句 · Thibault**
> **中文：** 别用文字描你的语气，把你真发出去的东西当样本。
> **原文：** I wouldn't recommend describing your tone of voice — provide samples of newsletters you've sent.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 记忆 | memory | 跨对话记住偏好、习惯、项目上下文 |
| 样例优于描述 | samples over descriptions | 给真实 Newsletter、消息，比写「人设 prompt」好使 |
| 云端迁移 | cloud migration | 多设备同步，别搞成两个智能体各干各的 |
| 静态应用 | static app | 只能干一件事的 App，正被「一个智能体包办」取代 |
| 托管文件 | hosted files | 智能体在云端替你管的数据与笔记 |

**本章小结**

- 备数据：真通讯、真消息当样例，按项目分文件夹，别写成一本说明书
- 大约三个月：本地文件管理往云端挪，记忆交给智能体托管
- 先上手的人已经明显提速；只为一件事做个小 App 的需求在往下走

---

## 03 责任在人，氛围感编程能走多远

**Marina：** 用深了我会拧巴：报税 AI 能算，工具还能给避税思路——可最终责任我敢交吗？团队这边，我不会因为智能体能干就裁人，而是让人用它——可我得一条条核实输出，有时候比专人干还累。你怎么想？

**Thibault：** 人还是最后一棒。**智能体是给你加杠杆的**，枯燥重复的它帮你扛，快、省时间——不是替你做决定，更不是在审计面前替你签字。

写代码也一样：**代码是你写的，锅是你的**；系统挂了、数据错了，找人不找智能体。「这套东西怎么运转」你不能也甩出去——控制权得握在你手里，懂全局的也得是你。我们造技术，图的是人过得更好，不是把人挤出环节。

**Marina：** 我一开始效率飙上去，后来想优化的事堆太多，脑子快转不过来。

**Thibault：** 很多人都栽在这：什么都丢给 AI，清单越拉越长。有时候你比**眼下这代模型**跑得快半步，有些点子得等下一代——这不算坏事，说明你在摸边界，知道哪儿靠谱、哪儿还得等；这些试探，可能就是**半年后**你真正能做的事。诀窍是分开两堆：「现在就能交出去」和「先记一笔，等模型追上来」。

**Marina：** 我们 Lingua 用「氛围感编程」做了网页——不懂代码的同事也写了，能跑；可常用词要从 300 扩到 1000，技术同事说架构顶不住。想做成大公司，该早点找工程师，还是继续 vibe 下去？

**Thibault：** 要是自己玩玩、小圈子分享，在智能体帮助下写代码，完全说得通——这年代有想法就能先做出个样子，**有创意的非工程师，现在不试更待何时**。可要是冲着**成千上万的人**用、还要稳，工程师少不了——架构、性能、边角情况，vibe 出来的第一版往往盖不住。

**Marina：** 六到九个月，代码**好不好维护**能明显变好吗？能完全不要技术人员吗？

**Thibault：** 门槛会慢慢下去——以后会有智能体管长期维护、管架构，从原型一路拽你到大盘子。六到九个月可维护性大幅进步，我信；**完全不用人**，听着还远。软件要解决的问题多得数不完，我们才刚开头；只要这点不变、技术还在往前走，**专业技术人员**总有用武之地——只是活儿更像「带一队智能体」，不太像一行行纯手写。

> **金句 · Thibault**
> **中文：** 代码是你写的，系统坏了你担着——理解力别外包。
> **原文：** If you write code, you are responsible for it. You cannot outsource understanding.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 终极责任 | ultimate accountability | 报税、合规、上线后果，最后一棒还是人 |
| 氛围感编程 | vibe coding | 原型快；用户量上来，架构和维护还得工程师 |
| 理解力不外包 | cannot outsource understanding | 系统怎么转，你得懂；不能全扔给智能体 |
| 可维护性 | maintainability | 代码能不能长期改、长期扩；vibe 第一版往往撑不住 |
| 效率陷阱 | over-automation trap | 啥都自动化，核实活儿反扑，脑子反而过载 |

**本章小结**

- 智能体是放大器，不是甩锅器；报税、带团队尤其如此
- 氛围感编程适合验想法；用户量上来，工程师还得管架构和维护
- 六到九个月可维护性会变好，「零工程师的大公司」不现实

---

## 04 现场演示：Codex 不止写代码，未来靠「问对问题」

**Marina：** 能现场秀一个吗？现在大家就该部署、能把生产力拉满的那种工作流。

**Thibault：** 因人而异。我每天都收一份简报，看外面怎么议论 Codex。咱们新建个对话，比如：「我在录一期 AI 和 Codex 的播客，帮我在收件箱里找相关邮件，按我的优先级起草回复。」头几回可能没有完整记忆，**用多了 Codex 会摸你的习惯**；记忆也跟 ChatGPT 通着。

再来一条：「去网上热门来源转转，盘点 Codex 这两周的更新。」我 Gmail 乱得很，靠**过滤规则**撑着——Marina 说花两天整理文件夹，整理完才醒悟：这时间本该省下来，正是智能体该接的活儿。

**日程表和旅行计划**也能串起来，让它抓你的空档排行程。演示里它翻了邮件、揪出跟当天话题相关的讨论串、看了日历，还自动排了去**克里特岛**的行程。你可以同时开好几条线：后台跑小线程，比如说「我在做幻灯片，放进 Google Slides」——应用里自带**浏览器**，不用切出去。拖拽面板能看见它还在忙啥：摘要 Codex 更新、设邮件规则之类，就是个简易**仪表盘**。

**Marina：** 今早 ChatGPT 给了我五个 App 点子，我丢了个 Markdown 链接，它搭了个**内容再创作**引擎——花里胡哨的，还有 A/B 测试。我想要简单点，最好能**语音录入**变邮件简报，没成。倒有一点我很喜欢：**不用等提示词，它自己把事儿往前推**，像在说「你要的大概是这个吧」。

**Thibault：** 咱们看看这个引擎——设计得有点贪大。语音录入得接**语音转文字接口**，应用里直接说不行，后台得挂 OpenAI 的语音转文字 API。你可以下指令：「应用里语音录入坏了，接上 OpenAI 语音转文字 API；密钥先占位，查最新文档集成。」

**Marina：** 这提示词太技术了——不懂的人哪想得到 API 密钥。

**Thibault：** **所以眼下还得有懂行的人帮一把。** 但这些要技术背景才说得清的事，**三个月内**会变成默认能力——直连 OpenAI 账户，不用手配密钥，一通全连上。

再举个大点的：Gmail、日历插件配齐，当**幕僚长**——一天开头跑一遍，理日程、拎重点、帮你进入状态。有人问「我时间浪费在哪？」「该雇人吗？」还能跟 Codex 坐着聊，怎么把流程削薄——它看了你的日历，知道哪几块对你最要命。我自己还拿它**写代码**、排发布内容的叙事顺序，当思考搭子；**笔记也不开独立 App 了**，直接在 Codex 里记，让它攒记忆，一天结束下指令导出，顺便催那些重要却没回的邮件、Slack。

**Marina：** 工程师是不是越来越少拿 AI 写代码，越来越多干杂活提效？

**Thibault：** 你想工程师一天都在干嘛——**本来大部分就不在写代码**。所以我们看见，就算是技术用户，**Codex 上超过一半任务跟代码无关**。应用本身才出**三个月**（命令行版 Codex 大概**一年前**）。常见的是：帮我计划、帮我收拾、帮我排旅行；有了**电脑控制**和浏览器，还能在 DoorDash 点餐、帮你购物。我们自认**电脑操控**做得最快——快得有点邪乎，你能看见它在屏幕上到处点。演示里加电脑控制，去 LinkedIn 下分析数据，选 Excel，建表格——**五到十分钟**；它已经打开 LinkedIn、点导航、保存、导出。

**Marina：** 跟 ChatGPT 最大的差别，是不是它能动你的电脑？

**Thibault：** 对——**这是个能跑起来的完整智能体**，不只开浏览器，还能在你的应用里点来点去。那未来三到五年呢？

**Marina：** 生活会变得天翻地覆，还是大家喊过头了？

**Thibault：** 变会很大。要紧的是**让所有人分到好处**——不主动碰 AI 的人也不该吃亏。今天你得自己写提示词、问得有花样，问得好才用得好；**以后不用这样了**。像找裁缝，看一眼就知道你要啥。到时候让人出挑的，不是提示词花活，是**会不会问对问题**——像跟朋友唠嗑，像我们这会儿这样；该帮的时候帮一把，从无处不在的**无感智能**里沾光。三到五年里，提示词工程会淡下去，AI 更像日常对话里长出来的帮手。

LinkedIn 表格跑完，我懒了，全用**语音**（Whisper 那一路）：「我还要更多数据，比如每帖曝光量。」还能用**技能创建器**：「把这个流程固化成技能，每天跑」——它给你生成定制技能，把 demo 变成日常。

> **金句 · Thibault**
> **中文：** 以后拼的不是提示词，是在真对话里问对问题。
> **原文：** What will make people exceptional is asking the right questions, not necessarily writing prompts.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 幕僚长工作流 | chief of staff workflow | 日历 + 邮件 + 优先级，一天开头总览、帮你进入状态 |
| 非技术任务占比 | non-technical task share | Codex 上超过一半不在写代码，产品定位已变 |
| 电脑操控 | computer use | 真在屏幕里点浏览器、点 App，如下载 LinkedIn 报表 |
| 技能创建器 | skill creator | 把一次 demo 流程固化成可重复、可每日运行的技能 |
| 无感智能 | ambient intelligence | 少琢磨 prompt，像聊天一样在恰当时机获助 |
| 提示词工程 | prompt engineering | 靠技巧写提示换输出质量；Thibault 认为三五年内会淡下去 |

**本章小结**

- Demo 一条龙：邮件起草 → 舆情简报 → 日历排旅行 → 快速搭 App → 补语音（还得懂行一步）
- Codex 是完整智能体：多线程、浏览器、电脑操控，不单是代码助手
- 三五年后：提示词工程靠边，「问对问题 + 无感智能」才是主轴

---

## 总结

| 维度 | 要点 |
|------|------|
| 普及 | 智能体长程稳、插件过百，知识工作自动化不再只是工程师的事 |
| 安全 | 双智能体审查，跑得更久、敢碰更敏感的数据 |
| 数据 | 真样例 + 项目文件夹；本地管理大约三个月往云端、记忆托管走 |
| 责任 | 最后一棒在人，理解别外包；氛围感编程要规模化还得靠工程师 |
| 产品 | Codex 过半任务非技术；电脑操控能帮你下 LinkedIn 报表 |
| 未来 | 无感智能；出挑靠问对问题，不靠提示词技巧 |

> **金句 · Thibault（封底）**
> **中文：** 像跟懂你的裁缝说话——不用学提示词，问对了，帮就在该帮的时候来。
> **原文：** It will be like benefiting from a great tailor — asking the right questions in natural conversation, and getting help at the right time from ambient intelligence.

Thibault 个人经历（插话，非主线）：博士读了**两周**就退学创业 → Google（地图/广告）→ DeepMind 黄金时代 → OpenAI；他说是**跟着直觉走、老给自己找新挑战**——「现在该不该退学」没有标准答案，十五年前的个案，听听就好。

---

## 概念索引（agent）

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| agent_maturity | 智能体成熟度 | agent maturity | 长程 + 多工具可靠，门槛下来 |
| elder_review | 双智能体审查 | elder review | 干活 + 审查，对齐研究产品化 |
| vibe_coding | 氛围感编程 | vibe coding | 原型快，规模化要架构 |
| ambient_intelligence | 无感智能 | ambient intelligence | 像聊天一样获助，少依赖提示词 |

---

## 附录

### 章节时间戳（B 站简介）

| 时间 | 主题 |
|------|------|
| 01:20 | 智能体成熟抹平技术门槛 |
| 05:20 | 双智能体审查架构 |
| 10:15 | 人类不能外包理解力 |
| 14:10 | 氛围感编程与工程师 |
| 28:40 | 提示词工程消亡 / 无感智能 |

### 素材路径

- **ingest**：`Recastory/workspace/knowledge/A8-codex-demo/ingest`
- **ASR**：`Recastory/workspace/knowledge/A8-codex-demo/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv50969766/
- **B 站**：https://www.bilibili.com/video/BV12qTu6WETP/
- **时长**：31:08

### 相关阅读

- [[OpenAI官方-Codex新手教程]] — Codex CLI 入门与 AGENTS.md 体系  
- [[OpenAI评估团队-不再低估模型]] — capability 测量与 eval 对照  
- [[Cursor-128个Agent团队协作]] — 工程团队 agent 编排  
- [[WorkOS-创建和使用Skills方法论]] — workflow 封装为 skill  
- [[MOC - Agent Theory and Design]] — Agent 理论总索引  

---

### 收录说明

- **视频**：[BV12qTu6WETP](https://www.bilibili.com/video/BV12qTu6WETP/)（B 站转载 Deep Dive Podcast × Thibault）  
- **嘉宾**：Thibault，OpenAI ChatGPT Codex & API Lead  
- **转写**：Recastory `A8-codex-demo/article.md`（英文 ASR）
- **版本**：canonical Host-Guest v3.2（2026-07-03；原讲义 v2 已合并）

