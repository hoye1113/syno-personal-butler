---
title: "Claude 设计主管：Cowork 揭秘 40 分钟教程"
tags: ["ai_agent", "claude", "anthropic", "bilibili", "video_transcript"]
legacy_tags: ["ai_agent", "claude", "anthropic", "bilibili", "video_transcript"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Peter Yang × Jenny Wen：Anthropic 设计流程变「松散」、可工作原型取代像素稿、内部 dogfooding 打磨交互、Cowork 垃圾进宝藏出周报、十天冲刺背后一年原型、愿景缩至三至六月交互故事。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude设计主管-Cowork揭秘40分钟教程.md"
source_sha256: "ba08c9f389838a9f7fcbd616e3a2794519287a2773a0257f94bc16fb0801a015"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1ohDzBwEJN/"
host_name: "Peter Yang"
guest_name: "Jenny Wen"
guest_title: "Anthropic 设计主管"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1ohDzBwEJN/ingest"
column_url: "https://www.bilibili.com/read/cv47593826/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1ohDzBwEJN/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article 标注 Host/Guest 角色对调；Peter Yang=Host，Jenny Wen=Guest（video_description + 节目形态核对）"
speaker_confidence: high
duration: "~40:30"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1ohDzBwEJN/ingest/column_article.md"
author:
  - "[[Peter Yang]]"
  - "[[Jenny Wen]]"
concepts:
  - id: working_prototype
    zh: 可工作原型
    en: working prototype
    one_line: 跑在 Claude/Cowork 实例里的真功能，不是静态 Figma 稿
  - id: garbage_in_treasure_out
    zh: 垃圾进宝藏出
    en: garbage in, treasure out
    one_line: 多源杂乱输入，Cowork 筛洞察、出文档和原型
  - id: internal_dogfooding
    zh: 内部试用
    en: internal dogfooding
    one_line: 内部用户推极限、抠 polish；外部用户更关心业务流程
  - id: ten_day_sprint
    zh: 十天冲刺
    en: 10-day sprint
    one_line: 从决定发布到上线约十天；站在一年原型与 Claude Code 势头上
  - id: vision_prototype
    zh: 三至六月愿景原型
    en: 3–6 month vision prototype
    one_line: 年度 PPT 失效；设计用交互原型凝聚多团队方向
---

# Claude 设计主管：设计变松散，Cowork 把反馈压成周一的稿

> 对谈：Peter Yang × Jenny Wen（Anthropic 设计主管）| 来源：Behind the Craft / B 站 Easonlee 专栏 | ~40 分钟

---

## 开场：为什么现在聊这个

Anthropic 现在有三条产品线：**Claude**、**Cowork**、**Claude Code**。设计主管 Jenny Wen 的日常已经不像两年前——少写精美 PRD，多和工程师围着 **可工作原型** 对话；Cowork 把 UXR 文件夹、社交媒体、Slack 收成周一早上的演示稿和功能线框。

这期从 **设计流程怎么变「松散」** 讲起，现场 demo Cowork 的洞察→原型→定时任务链路，再拆 **Cowork 十天冲刺背后的一年原型**，以及 **三至六月的愿景为什么该是交互故事而不是五年 PPT**。

**Peter：** Jenny，欢迎。先说说你典型的一天——有「典型的一天」吗，还是每天都不一样？

**Jenny：** 我花很多时间推动产品上市，但和一两前不同了。现在很大一块是和工程师、产品 **非正式协作**：一起看原型，讨论交互会怎么变；有时我自己也在实现功能、做原型。设计工作变 **松散** 了——听起来不够具体，就是一次次对话、一起协作。我花在单一项目上的时间少了，但同时在给五六个项目当顾问。

**Peter：** 所以是一堆 Artifacts 式原型，你和工程师讨论、用提示词让 AI 改？

**Jenny：** 对，但它们甚至不是传统原型，是 **可工作原型**——我们内部构建、跑在 Claude 或 Cowork 实例里的东西。我会去「推」它，看能到什么程度，形成看法；下一步通常和工程师坐下说「这些地方要改」。Figma 里打磨仍然重要，只是项目多了，这种随意协作更高效。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 可工作原型 | working prototype | 真能跑的功能片段，不是静态稿 |
| Cowork | Claude Cowork | 面向知识工作的代理产品，带任务列表 UI |
| Claude Code | Claude Code | 终端编码代理；Jenny 做生产级代码打磨仍用它 |
| 垃圾进宝藏出 | garbage in, treasure out | 多源输入→筛洞察→出工件 |
| 模型连接器协议 | MCP | 接 Slack 等外部工具；可定时推送频道 |
| 技能 | skills | Markdown 说明书；Jenny 更依赖个人笔记文件夹 |
| 直接负责人 | DRI | Anthropic 月度规划里每项 P0 的 owner |
| 内部试用 | internal dogfooding | 员工把产品推到极限，反馈最硬核 |

---

## 01 设计流程变松散：少写 PRD，多推可工作原型

**Peter：** 你们现在还做规格文档、Figma、规划文档吗？还是大部分时间直接在代码里迭代？

**Jenny：** 我仍然会做 Figma。**规格文档** 现在不常做，或者没那么详细。我们仍做优先级排序、写文档——对移交给安全、法务很有用，让他们知道发布什么——但通常只有几个要点，不是过度设计的精美表格。Figma 也一样。

**Peter：** Anthropic 已有 Claude、Cowork、Claude Code 三个产品。你能展示一下通常怎么用吗？

**Jenny：** 我主要 demo Cowork。秘密是：除了非常细致的生产代码，**我现在大部分事情都用 Cowork**；代码打磨仍用 Claude Code，聊天目的则完全切到 Cowork。这是外部测试账号，任务不多；我实际账号里并行跑着很多会话。

> **金句 · Jenny**
> **中文：** 设计不再追求像素级静态稿，而是和工程师在能跑的原型上对话——功能从几周缩到几天。
> **原文：** Designers no longer pursue pixel-perfect static mocks — they iterate conversationally on AI-generated working prototypes, shrinking feature cycles from weeks to days.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 松散协作 | loose collaboration | 非正式对话取代长周期规格冻结 |
| 可工作原型 | working prototype | 内部构建、跑在 Claude/Cowork 上 |
| 轻量规格 | lightweight specs | 几个要点够法务/安全交接 |
| 并行项目 | parallel projects | 设计师同时顾问五六个方向 |

**本章小结**

- PRD/Figma 仍在，但 **详度大幅下降**；文档服务交接而非冻结设计
- **可工作原型** 取代「只看静态稿」；Jenny 亲自推功能边界再和工程师对齐
- 工具分工：Cowork 管日常协作与洞察，Claude Code 管生产代码打磨

---

## 02 内部试用：比外部 UXR 更抠交互

**Peter：** 实际工作里有每周洞察报告吗？什么工具自动汇总发给你和团队？

**Jenny：** 现在可以用 Cowork 做。我们本来就有研究员发的报告、Slack 自动提醒。但我们 **非常依赖内部用户和核心用户**——内部人极其坦诚，会把产品能力推到极限，跟进也最容易。这有点反直觉，但我们很看重 **内部反馈**。

**Peter：** 大多数公司太孤立了，团队之间不互试产品。Anthropic 似乎很注重这个——Claude Code 也是？

**Jenny：** 对，Claude Code 成功的重要原因之一就是 **听第一线用户**。我们在 Figma 时代也大量内部试用。内部人会深挖 **交互设计和 polish**；外部用户更多问「这适不适合我的业务流程」。反馈维度完全不同。

**Peter：** 市场、PM 都在用 Claude Code。Cowork 内部可用后，人们怎么选 Cowork 还是 Claude Code？

**Jenny：** 类似场景里 **Cowork 整体采用率更高**，包括我称为「前沿用户」的人。开发 Cowork 时几位销售同事参与调研——他们原是 Claude Code 忠实用户，用来生成潜在客户名单、准备电话脚本。我没想到 Claude Code 能干这些。现在他们基本都转向 Cowork，同事也跟进。**有 GUI 很重要**；习惯聊天界面的人，Cowork 比开命令行更贴工作流。

> **金句 · Jenny**
> **中文：** 内部用户会把产品推到极限——在 polish 和交互手感上，比外部 UXR 更有洞察力。
> **原文：** Internal users push the product to its limits — especially on interaction polish, they offer more insightful feedback than external UXR.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 内部试用 | internal dogfooding | 员工硬核反馈，尤其交互细节 |
| 前沿用户 | frontier users | 如销售用代理做名单/脚本的非典型场景 |
| 反馈维度 | feedback dimensions | 内部=polish；外部=业务流程 fit |
| 图形界面 | GUI | Cowork 对非终端用户采用率更高 |

**本章小结**

- **内部 dogfooding** 是 polish 的主反馈源；外部 UXR 补业务流程视角
- Claude Code 的「非编码用法」是 Cowork 需求信号；**UI 降低采用门槛**
- 销售等「前沿用户」从 Claude Code 迁到 Cowork，说明 GUI 代理的泛化

---

## 03 Cowork 演示：垃圾进宝藏出，周一自动交稿

**Jenny：** Cowork 最有用的是我常说的 **「垃圾进，宝藏出」**——从很多来源拿信息，筛精华，效率极高。

我接了一个文件夹——演示里是 Claude 生成的假 UXR 文字记录，真实场景是研究员访谈。团队还通过传统 UXR、内部试用、Slack 反馈频道、社交媒体热心用户保持触觉。这也是我们成功的重要原因：**保持敏锐、快速迭代**。

我要 Claude：查看 UXR 文件夹，搜 X 和 Reddit 上 Cowork 评论，告诉我最大洞察。它会处理大量数据，有时分拆子代理并行搜索，从各源整合。

**Peter：** （赞助段：Replit Agent 4）回到节目——看起来它跑完了。

**Jenny：** 对，总结出了见解——七个主题，每周不同。还创建了 **.docx** 存在文件夹里。接下来我并行两个任务：一个问「基于这些，该构建什么功能？」；另一个说「把见解文档做成演示稿，本周启动会用。」一个线程做 **工件**，一个 **规划下一步**。最终能从这里开启设计——它给功能选项，我可以让 Claude 做线框图，带到 Figma 充实，或到 Claude Code 用真实设计系统实现。

还能变成 **计划任务**：每周一早上 10 点自动跑。周一开工时，演示稿和三个产品创意已经准备好——**极大压缩**从反馈到有形成想法的周期。

**Peter：** 时间压得很紧，帮助更快迭代。一切都关乎迭代。

**Jenny：** 对，我也变懒了——**总让 AI 先做初稿**，再基于初稿反应。现在让我从零起草功能，比以前花更长时间。我把播客笔记放进个人笔记文件夹，让它读笔记、想发言要点；不逐字读，但能理清思路，避免 **空白页** 问题。

假设我想做「分步任务进度 UI」——「我喜欢这个想法，给我交互式原型，几个选项，草图线框风格。」

**Peter：** 你通常用什么技能？有做文档、幻灯片的个人技能吗？

**Jenny：** 我们有内部文档、幻灯片技能，统一品牌。我个人没有专门技能库，大多借用内部技能。有个 **写作技能** 提醒 AI 别写「AI 味」词汇。但随着 Cowork 使用，它通过我存放个人笔记的文件夹 **已经很了解我**，对特定技能的需求在降低——文件夹就像我持续维护的 **记忆库**。技能仍有用处，就我的用例而言需求在降。

**Peter：** 能设置直接和团队分享吗？比如发到 Slack？

**Jenny：** 可以接 **Slack MCP**，直接发送。我喜欢它问澄清问题——会按计划在周一推送；用现成 MCP 插件，每周发到指定频道。

**Peter：** 你什么时候让团队介入？毕竟你在和 AI 讨论访谈见解。

**Jenny：** 实际 UXR 访谈由 PM 或研究员完成。通过这个流程分享成果，大家参与——这可以成为 **团队运作基础**。我们非常 **自下而上、民主**：给洞察和目标，每个人都去做原型、试想法。不是「设计师想出所有主意」，而是「有洞察、有本月目标，我们一起实现？」简单任务让 Claude 开 PR；复杂的再手把手指导。

**Peter：** 很多仍依赖 **判断力**——策划和决定「实际构建什么」。品味和判断力来自大量内外反馈，逐渐形成直觉。

**Jenny：** 对，整天听反馈。线框图会展示不同选项——作为设计师我喜欢看多种选择，即使不是超高保真，也有助定方向。Claude 提选项省了我手动模拟；选一个方向微迭代，或直接做成代码原型继续优化。

> **金句 · Jenny**
> **中文：** 我让 AI 先做初稿再反应——周一早上自动有演示稿和三个产品创意，空白页问题没了。
> **原文：** I always let AI draft first, then react — scheduled every Monday at 10am, I wake up to a deck and three product ideas ready to go.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 垃圾进宝藏出 | garbage in, treasure out | UXR+社媒+Slack→洞察文档 |
| 并行任务 | parallel tasks | 一线程做工件，一线程规划功能 |
| 计划任务 | scheduled tasks | 每周一 10 点自动跑洞察流程 |
| 自下而上 | bottom-up | 给洞察和目标，全员 prototyping |
| 个人笔记文件夹 | personal notes folder | 替代部分 skills 的上下文记忆 |

**本章小结**

- Demo 链路：**文件夹 + 社媒搜索 → 洞察 .docx → 并行（功能规划 + 演示稿）→ 线框/原型**
- **定时任务** 把周期压到「周一上班即有稿」；MCP 可推 Slack 频道
- 团队模式：洞察民主分发，设计师角色从「唯一创意源」转向 **策展与判断力**

---

## 04 Cowork 诞生：一年原型，十天上线

**Peter：** 聊聊 Cowork 怎么诞生的。关于十天完成已经有很多报道，但之前也有很多迭代。

**Jenny：** 对。「十天」是某次采访被引用的 **锚点**，大家都当真了。真实故事是：**协同工作** 这个方向公司一直在想——我加入 Anthropic 一年来，就在想怎么帮用户成为 **思考伙伴**。已有针对代码的工具，但知识工作者的问题是：怎么执行？架构和 UX 是什么？去年有很多不同 **原型**，有些很有野心；大量技术实验，试过不同代理工具，有几个效果不好。实验室和产品侧都有原型。

如果一个想法 **不断出现、每次都有能量**，剩下就是时机和执行——像闪电击中。决定发布时，从「我们应该发布」到「已经发布」，感觉只用 **十天**。很大部分站在 **Claude Code 的势头** 上：假期里大家终于有时间试 Claude Code——非技术用例也进来了，解析播客转录、复杂分析。我们看到代理工具在非技术人员中有早期 **产品市场契合**。内部已有工作原型，原定稍后发，但觉得 **必须抓住时机**——即使产品不完美，好处、实用性和受众窗口 **就在现在**。

非常忙碌的十天，但发布后能从用户那里拿 **怎么用** 的信号，持续迭代。

**Peter：** 所以过去一年 Slack 上分享原型、留反馈，有了可用原型，市场需求来了就冲刺完成？

**Jenny：** 对。原打算几周后发布，感觉 **时机就是现在**，迫使我们更现实地规划范围、投入人力。

**Jenny：** 分享一些早期迭代。今年早些时候有个原型——我和另一位设计师做——试图 **任务/工作流导向**：UI 很结构化，像工作流工具，提示添加输入输出，**聊天放次要**。问题一：当时 Claude **不擅长完全遵循工作流**；二：太结构化，填来源感觉 workload 大——2025 年了，为什么不让 Claude 做？

后来回归 **聊天框**。还试过引导具体结果：分析或文档，每个选项有不同拨盘调长度、类型——备忘录、演示稿等——也 **令人不知所措**。

我们一直在平衡：**强规定用例** vs **聊天框自由**。

几个月前发布版有 **向导式体验**——点进去提示「创建三到五页文档」——展示很多前端 UI，希望和聊天明显区别。但视觉元素 **互相竞争**。随时间 **剥离大部分**，放弃固执己见的 UI——对展示内容没实际帮助。

当前 UI：去掉笨重侧边栏，更像传统聊天框；主页重格式化成 **Claude 的待办列表**——审查、批准、分类任务；日程里看任务。像你和 Claude 之间的 **共享待办**，不是堆满建议的聊天框。

**Peter：** Claude Code 斜杠命令像 Costco 寻宝——对初学者不友好。Cowork 在常规聊天和 Claude Code 之间找中间地带？

**Jenny：** 对。Cowork 仍可用斜杠命令，但不是主要交互。它也是 **专业人士工具**——重度用户以强大方式使用，会学技能、团队分享、速记命令。但 **几乎所有事都应不需学命令** 就能完成；命令是与 Claude 交互的 **次要方式**。

> **金句 · Jenny**
> **中文：** 我们试过把工作流 UI 做满——Claude 跟不住，用户也烦。最后发现自由对话才是 AI 协作的本质。
> **原文：** We tried highly structured workflow UI — Claude couldn't follow it, and it felt like too much work. Free-form conversation is the essence of AI collaboration.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 十天冲刺 | 10-day sprint | 决定发布→上线；非从零造轮子 |
| 工作流 UI | workflow-oriented UI | 结构化输入输出；被证明过重 |
| 聊天框回归 | return to chatbox | 剥离竞争视觉，共享待办列表 |
| 研究预览 | research preview | 早发布换更快学习信号 |
| 斜杠命令 | slash commands | 次要交互；不应是入门门槛 |

**本章小结**

- **一年原型 + 假期 Claude Code 非编码用法** → 十天冲刺发布；锚点叙事掩盖长期积淀
- 产品教训：**结构化工作流 UI 失败**（模型跟不上 + 用户负担）；走向轻量待办 + 自由对话
- Cowork 定位：比 Claude Code 易上手，比纯聊天多 **任务可见性**；命令是进阶而非前提

---

## 05 三至六月愿景：设计把五个团队拧成一条故事

**Peter：** Anthropic 规划怎么做？年度目标还是更偏原型试错？

**Jenny：** 每次规划情况都变。我们团队做 **月度规划**——电子表格里协作部分最多约 **12 项 P0**，每项有 **DRI**，每周查进度。也有季度/半年规划，负责人提大方向，但 **不那么结构化**，不是绝对必须完成；更像给大家 **概览**，知道事情怎么组合。相当松散。

**Peter：** 最具创新力的公司往往少做年度规划表面功夫，多迭代、从用户学。你做过「北极星愿景」演示——那些还有用吗？

**Jenny：** 我去年可能做过。愿景仍有空间——指引方向、明确追求什么。但技术一直在变，新模型层出不穷，越来越快。**不存在一年期愿景**，更别说两年、五年——未知太多。愿景真正有用的是 **让大家朝同一方向努力**，尤其当任何人都能构建任何东西时。

我现在认为的愿景是 **三到六个月**。可以是文档，但 **视觉化更有帮助**——设计仍有巨大力量：**整合事物、使其连贯**，在周期内形成故事。也可以是 **原型**，不一定是静态 PPT；原型更能帮我们。

它常解决的是：五个团队做 **非常相似、冲突或重复** 的事。设计能 **策划、凝聚**，展示通往理想体验的路，而不是五个分散体验。

**Peter：** 审查流程呢？正式审查还是多看原型？

**Jenny：** 仍有审查。不像以前每个功能都审，但 **大项目、高优先级** 会有。不是耗费大量时间的重大事件，主要为 **可见性和反馈**；跨越范围、对公司有重大影响时才做。

**Peter：** 给感觉「脚下大地在移动」的设计师什么建议？从 PR 开始还是别的？

**Jenny：** 大地确实在移动——你必须 **接受、适应**，对质疑现有工作方式 **开放**。现在轮到设计师了——我们处于 **第二层效应**；许多角色已变。工具也在变。有时我感到威胁：工作变化太大，人们不再像以前那样重视我。但看 **工程师同事** 如何适应巨大变化、勇敢克服困难、产出更好更多——我把他们当 **榜样**。如果他们能以谦逊方式做到，我也能。

你可以摆脱很多 **搬箱子** 的繁琐工作，专注更高层次思考，或 **产出更多**。工程师现在 **几天开发出整个功能** 而不是几周——有趣的是你并没有因此更闲，实际上 **工作更努力**。我们都很有抱负——能做这么多、又不用做讨厌的旧活，那就 **做得更多**，这带来更多乐趣。

> **金句 · Jenny（封底）**
> **中文：** 年度规划没意义了——愿景缩到三至六月，最好是一个能凝聚五个团队的交互原型，不是静态 PPT。
> **原文：** There's no such thing as a one-year vision anymore — vision is now three to six months, best expressed as an interactive prototype that unifies five teams' scattered ideas.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 月度 P0 | monthly P0 list | ~12 项，每项 DRI，每周 sync |
| 三至六月愿景 | 3–6 month vision | 取代年度/五年北极星 |
| 设计策展 | design as curation | 把多团队相似/冲突想法拧成连贯体验 |
| 第二层效应 | second-order effects | 工程师先变，设计师角色跟进 |
| 搬箱子 | box-moving work | 繁琐执行层；AI 解放后做更高阶判断 |

**本章小结**

- 规划 **月度 P0 + 松散季度方向**；拒绝年度规划表演
- **愿景 = 3–6 月交互原型**；设计价值是跨团队 **策展与凝聚**
- 给设计师：向已适应的工程师学习；摆脱琐事后 **产出更多而非更闲**

---

## 总结：松散协作 + Cowork Automation = 设计新默认

| 维度 | 要点 |
|------|------|
| 设计流程 | 可工作原型取代重 PRD；Figma 仍在但轻量；Cowork 日常，Claude Code 生产代码 |
| 反馈 | 内部 dogfooding 抠 polish；外部 UXR 补业务 fit；销售等前沿用户驱动 GUI 代理采用 |
| Cowork 工作流 | 垃圾进宝藏出→并行工件/规划→线框→周一计划任务；Slack MCP 推送 |
| 产品起源 | 一年原型实验；十天冲刺抓 Claude Code 非编码 momentum；结构化 UI 失败→待办+聊天 |
| 组织 | 月度 ~12 P0 + DRI；愿景 3–6 月原型；设计策展多团队方向 |
| 设计师 | 接受地面移动；向工程师学适应；AI 初稿→人反应；更高阶判断变核心 |

### 对个人的启示

- **先让 AI 出初稿**：笔记文件夹 + Cowork 记忆，比从零起草快
- **洞察自动化**：URX 文件夹 + 社媒 + 定时任务，把周一从空白页变成「选方向」
- **工具分工**：Cowork 协作与洞察，Claude Code 仅留给要抠的生产代码

### 对团队/产品的启示

- **内部试用** 不是可选项——polish 反馈密度高于外部 UXR
- 发布叙事里的「十天」是 **冲刺窗口**；产品方向靠一年原型否定结构化 UI
- 愿景交付物从 PPT 换成 **可点击原型**，周期压到半年以内

### 仍待验证

- Jenny demo 用 Claude 生成的假 UXR 记录；生产环境数据源组合因团队而异 [待核实]
- 「销售同事从 Claude Code 迁到 Cowork」为内部观察样本 [待核实]

---

## 附录

### 章节时间戳（专栏导读）

| 时间 | 主题 |
|------|------|
| 02:15 | 抛弃过度 Figma/PRD；可工作原型与松散协作 |
| 07:42 | 内部试用打磨交互；Cowork vs Claude Code 采用 |
| 10:50 | 垃圾进宝藏出；并行任务；周一计划任务与 Slack MCP |
| 20:12 | Cowork 十天冲刺与一年原型；UI 从工作流回归聊天 |
| 34:45 | 月度 P0 与三至六月愿景原型；设计师建议 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1ohDzBwEJN/ingest`
- **专栏主源**：https://www.bilibili.com/read/cv47593826/
- **B 站**：https://www.bilibili.com/video/BV1ohDzBwEJN/
- **时长**：~40:30（metadata 2430s）

### 相关阅读

- [[Cowork负责人-揭秘Cowork与Mythos]] — Felix 侧：十天冲刺架构、VM 沙盒、技能/记忆、本地信任；与 Jenny 设计/UI 叙事互补  
- [[Anthropic团队-解析Claude Agent平台内幕]] — 云平台与 harness 原语；Cowork 所在 Agent 平台大图  
- [[Claude Code负责人-AI原生团队如何使用AI]] — Boris 侧 dogfooding；Claude Code 势头是 Cowork 发布窗口之一  
- [[Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿]] — 同门产品线与工具调用范式  
- [[MOC - Harness Engineering]] — Harness 横切索引  
- [[MOC - Agent Theory and Design]] — Agent 理论 + B 站 canonical 总索引  

---

### 收录说明

- **视频**：[BV1ohDzBwEJN](https://www.bilibili.com/video/BV1ohDzBwEJN/)（B 站 *Easonlee的AI笔记*）  
- **讲者**：Peter Yang（Host）、Jenny Wen（Anthropic 设计主管）  
- **专栏**：cv47593826（S 级主源）  
- **版本**：canonical Host-Guest v3.2（2026-07-06）
