---
title: "Codex 产品负责人：Codex 团队如何用 Codex"
tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "harness_engineering", "skills"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "harness_engineering", "skills"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Peter Yang × Alex × Romain Huet：Codex Spark 现场 demo、十要点规范、设计师代码量超工程师、八周冲刺无中期路线图、多代理委托 UX、PM 补位论与招聘看能动性。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex产品负责人-Codex团队如何用Codex.md"
source_sha256: "5bec202113b09b49b96da0cc085f68dc905abbbe975f6922c5fde943a7d50f3a"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1iKdvBhEYJ/"
duration: "43:00"
saved: 2026-07-06
updated: 2026-07-06
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1iKdvBhEYJ/ingest"
column_url: "https://www.bilibili.com/read/cv47878914/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1iKdvBhEYJ/ingest/column_article.md"
source_original: "https://www.youtube.com/watch?v=9qXc-THAvc0"
source_original_date: "2026-04-05"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Peter Yang"
guest_name: "Alex / Romain Huet"
guest_title: "OpenAI Codex 产品负责人 / 开发者体验负责人"
speaker_inference: "column_article S-tier + YouTube Behind the Craft"
speaker_confidence: high
author:
  - "[[Alex Embirico]]"
  - "[[Romain Huet]]"
concepts:
  - id: codex_spark
    zh: Codex Spark
    en: Codex Spark
    one_line: 秒级响应的快速编码模型，灵感迭代用
  - id: plan_mode
    zh: 计划模式
    en: plan mode
    one_line: Shift+Tab 进 brainstorm，先定方案再写码
  - id: task_delegation
    zh: 任务委托
    en: task delegation
    one_line: 开发者从逐行敲码转向并行指挥多个代理
  - id: short_long_planning
    zh: 短长规划
    en: short-and-long planning
    one_line: 只定八周内冲刺 + 一年后模型直觉，不做中期路线图
  - id: talent_stack_collapse
    zh: 人才堆栈崩溃
    en: talent stack collapse
    one_line: 设计/工程/PM 边界模糊，房间里人越少决策越纯
  - id: agency
    zh: 能动性
    en: agency
    one_line: 自发行动、网上发作品——AGI 时代最不可替代的人类品质
---

# Codex 产品负责人：Codex 团队如何用 Codex

**Host：** Peter Yang（*Behind the Craft* / Creator Economy）  
**Guest：** Alex（OpenAI Codex 产品负责人）· Romain Huet（OpenAI 开发者体验负责人）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV1iKdvBhEYJ](https://www.bilibili.com/video/BV1iKdvBhEYJ/) · **时长** ~43 min · **专栏** [cv47878914](https://www.bilibili.com/read/cv47878914/) · **原片** [YouTube](https://www.youtube.com/watch?v=9qXc-THAvc0)

---

## 开场

OpenAI Codex 团队自己怎么用 Codex 建 Codex？Alex 和 Romain 给了一次罕见内景：Romain 用 **Codex Spark** 秒级改 2D 游戏、语音加 NASA 阿尔忒弥斯登月屏；Alex 说规范往往 **只有十个要点**；设计师产出的代码量已经 **超过六个月前的工程师**。

更深一层：OpenAI 内部 **不做中期路线图**——要么八周内可执行的冲刺，要么保持对一年后模型能力的直觉；开发者从写代码转向 **并行委托多个代理**；Alex 认为 **工程师少于 20 人的初创雇专职 PM 是危险信号**；招聘不看简历，看 **网上发了什么、有没有副业**。

六章预告：**Spark 演示与十要点规范** → **设计师写代码比工程师多** → **八周冲刺、拒绝中期规划** → **Codex 应用与技能生态** → **Alex 两套模式与 Peter/OpenClaw** → **人才堆栈崩溃与能动性招聘**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| Codex Spark | Codex Spark | 秒级 token 吞吐的快速模型，灵感爆发时用 |
| 计划模式 | plan mode | 先 brainstorm 方案、看代码库再给计划，再动手 |
| 任务委托 | task delegation | 人不逐行写码，向并行代理下指令 |
| 技能 | skill | 连 Figma、Linear、Vercel 等外部系统的可复用能力包 |
| 子代理 | sub-agent | 用户自配的多代理编排，团队从中学习再产品化 |
| 短长规划 | short-and-long planning | 八周内具体目标 + 长期 AGI 方向，跳过中期路线图 |
| 人才堆栈崩溃 | talent stack collapse | Scott Belsky 说法：职能边界塌缩，人人都是建设者 |
| 能动性 | agency | 自发行动、有作品、敢担未归属的事 |

---

## 01 Codex Spark 现场演示与十要点规范 [00:00]

**Peter Yang：** 先秀一下 Codex 一次性能干啥？Alex，你们团队还写规范吗，还是让 GPT 写？

**Romain Huet：** 我共享屏幕。这是个 iOS 应用——语音说「给 NASA 阿尔忒弥斯登月任务加一个新屏幕」，用 GPT 5.4 发提示，模型就给 iPhone 应用加屏。左边 GPT 5.4 在跑；右边 **Codex Spark**，平均 **每秒 1200 个 token**，快得离谱。

对话开始前我还用 Codex 应用随手搓了个 2D「穿越」小游戏。应用可以 **弹到屏幕上方**——边玩边迭代想法。Peter，你想改啥？

**Peter Yang：** 加点装饰，房屋、树木，让场景活一点。

**Romain Huet：** 发任务，几秒后 Spark 改完，树已经长出来了，继续玩。这就是我对 Codex 兴奋的原因：**GPT 5.4 这类前沿模型**扛复杂活——分析、迁移 **数百万行代码**；你灵感来了就切 **快速模式或 Spark**，思维速度跟得上，啥都能搭。

**Alex：** Codex 团队 **很少写规范**。原则是 **离金属最近的人做最多决定**。只有问题 **塞不进一个人脑子**、要多人协调、或决策特别棘手时才写——而且文档极短，**大概十个要点，就这些**。

**Peter Yang：** 能演示吗？给 Codex 几个要点，它先产出 MVP 需求？

**Romain Huet：** 可以。回到刚才 iOS 应用——你对新功能有模糊想法但不确定怎么做，按 **Shift+Tab** 进 **计划模式**，说「我们该建什么？」Codex 当 **头脑风暴伙伴**：看代码、看进展、提想法，你再引导它定好计划。刚才我没给输入，是自动生成的；Alex 作为产品负责人会 **提前给更多指导**。

**Alex：** 我经常这么干。变化很多：超简单改动直接提示；中等复杂度先想怎么做或要一个具体计划。还有一招——**脑子里还没有具体功能**，只有模糊想法，就直接进 Codex 让它开始想怎么解决问题。它去探索、问我问题。复杂改动我通常 **不用生成的代码**——PM 写代码是话题，但复杂功能我不想承担落地和维护；我会走计划模式 **摸清心智模型**，把 **思考过程** 分享给工程师，不是计划本身。

> **金句 · Alex**
> **中文：** 规范往往只有十个要点；离金属最近的人做最多决定。
> **原文：** We write like ten bullets and that's it—let the people closest to the metal make as many decisions as possible.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Codex Spark | Codex Spark | 高吞吐快速模型，秒级改 UI/游戏 |
| 计划模式 | plan mode | 先规划再编码，PM 可只探索不落地 |
| 十个要点 | ten-bullet spec | 团队写规范的上限，非默认流程 |
| 离金属最近 | closest to the metal | 一线 builder 决策权最大 |

**本章小结**

- 演示双线：**GPT 5.4** 扛重活，**Spark** 扛灵感迭代——同一产品内切换模式
- 规范是 **例外** 不是默认；写也 **极短**，协调成本靠「一个人 + 代理」压低
- PM 可用计划模式 **探索复杂域** 而不必拥有代码维护权

---

## 02 设计师写代码比工程师多：职能边界正在模糊 [08:09]

**Peter Yang：** 设计师现在也在写代码？PM 维护功能代码听起来不太对。

**Alex：** 离题说一句：**Codex 团队设计师产出的代码，比六个月前工程师写的还多**——他们是真高手，工具占很大比重。团队取笑我去年 PR 提交不够多；现在问题不是 **能不能生成代码**（代理很好，任务能委托），而是 **你决定做什么**——大家对这个东西长什么样有没有共识？**产品质量**怎么保证？

有人自豪说整个应用都是 **凭感觉编码**——Codex 也这样，绝大多数代码代理生成，但我们仍花大量精力 **想系统、保高质量**。特别复杂的功能，我会确保有 **更强、更稳定的负责人**；PM 的价值之一是能 **高度分散注意力、四处补位**，所以你不希望 PM **拥有并维护** 那些系统。

**Romain Huet：** 对。工具让 **设计师、PM、工程师** 都能产出可运行原型——不等于你要对十亿用户的功能负责，但你可以 **用构建展示愿景的一瞥**。

**Alex：** 工程师以往不做任务分类或项目管理，因为要花时间编码；现在代理能 **分析反馈、排优先级**，时间空出来了。**每个人都能做一点别人的工作**——Scott Belsky 管这叫 **人才堆栈的崩溃**，我很喜欢，正在发生。

> **金句 · Alex**
> **中文：** 问题不再是能不能生成代码，而是你决定做什么、质量怎么保。
> **原文：** It's no longer about whether you can generate code—the question is what you decide to build and how you ensure quality.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 凭感觉编码 | vibe coding | 大量代码由代理生成，人盯方向与质量 |
| 人才堆栈崩溃 | talent stack collapse | 设计/工程/PM 技能重叠，传统比例失效 |
| 补位 | gap-filling | PM 价值在分散注意力、协调空白，非拥有系统 |

**本章小结**

- **设计师 > 六个月前工程师** 的代码产出——工具拉平，非口号
- 代理解决「能不能写」，人类决策 **做什么 + 质量** 更稀缺
- 职能模糊已在 Codex 团队 **日常发生**，不是远期预测

---

## 03 只规划八周内与一年后，拒绝中期路线图 [15:30]

**Peter Yang：** Codex 应用怎么建出来的？有一年前的年度路线图吗，还是观察市场狂做原型？

**Alex：** 两者都不是。OpenAI 研究员 Andre 给过建议：**要么计划短期，要么计划长期，绝不计划中期**——中期太难。短期 = **从现在起最多八周**，八周是绝对上限；要有 **具体事情** 让团队迅速集结——OpenAI 很擅长围绕目标抱团。

另一头保持 **直觉**：你知道一年后模型更聪明、能做的事更多。往回倒推：未来你不会把电脑 **借** 给模型——一次只能干一件事；你会想要 **无限多模型独立工作、验证、自己部署代码并监控**，甚至不用刻意提示。中间那种 **传统产品路线图** 我们基本没有——**长期方向 + 短期能推进方向的事** 组合。

Codex 应用案例：战略之一是 **与特定 workspace 脱钩**。IDE 如 VS Code 打开时绑一个文件夹、一个 git checkout——CLI 也类似，**一次一件事**。愿景是人与 **云端并行代理** 协作，或由一代理协调多代理。但从云端起步难——工具不在、环境要配、模型只完成一半你要介入。**本地体验** 既要与文件夹协作，又不能被单一 workspace 锁死。

启动时有很多 **深奥想法**，也有工程师 **黑客周原型**——多个独立版本。项目启动时真正写下来的只有 **为什么该做应用**；**没有具体规范**，规范是 **构建过程中长出来的**。当时还有争议：IDE 扩展很火，该不该只做扩展？CLI 呢？应用的意义和方向是什么？

**Romain Huet：** 好在 IDE 扩展已经打磨很久，VS Code、Cursor、Windsurf 都能用；我们 **从扩展吸取经验和代码**，起点就 robust。

**Alex：** 应用与 IDE 扩展、CLI 共享底层——都跟 Rust 写的 **同一开源 Codex 核心** 通信，分层非常 deliberate。

**Peter Yang：** 现在看建应用显然对——比开一堆终端容易。当初是为了新手友好？

**Alex：** 我们思考方式很 **AGI 导向**——未来会滑向哪里。顺序我会 **反过来**：我们知道需要一种界面，让 **委托给多个代理** 感觉自然，因为知道未来会有为此准备好的模型；已经看到人们在代理之间委托了。需要 **能自然扩展到云端、符合人体工程学** 的界面——不应像疯狂想办法怎么委派，而应 **显然就是你想要的工作方式**。

**Romain Huet：** 不只吸引初级开发者——OpenAI **最资深工程师**，从 OpenClaw 的 Peter 到 Greg Brockman，都把 **应用当主要构建方式**。这是 **代理委托愿景** 的落地，最 senior 的人也没留在终端里。

**Alex：** Peter Steinberger 刚加入 OpenAI，我们超兴奋。去年十月我在旧金山梅森堡跟他散步，没直说要做应用，但提了 **让委托更自然的新界面**。他说 **永远不会用这种东西**。上周末他推特说应用其实不错——**地狱结冰了，我现在喜欢了**。他可能两样都在用，谁知道。

> **金句 · Alex**
> **中文：** 要么八周内具体冲刺，要么保持一年后的模型直觉——中期路线图又尴尬又总变。
> **原文：** Plan short and long term, never medium term—medium-term roadmaps are awkward and always changing.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 短长规划 | short-and-long planning | 八周上限 + AGI 方向感，跳过 6–12 月路线图 |
| 工作空间脱钩 | workspace decoupling | 不绑单一文件夹，支持多任务并行 |
| 氛围转变 | vibe shift | Codex 历史上两次产品拐点：云产品偏早、12 月委托愿景回归 |
| 黑客周原型 | hack week prototype | 多版本并行试，规范从构建中长出来 |

**本章小结**

- **无中期路线图**——OpenAI 内部显式策略，Codex 应用是「长期委托 UX + 短期本地体验」叠出来的
- 应用与 CLI/扩展 **共享 Rust 核心**，不是另起炉灶
- 最 hardcore 用户（Peter S.）从拒绝到真香——说明 UX 问题真实，不是只服务新手

---

## 04 Codex 应用与技能：让多代理委托像玩游戏 [19:12]

**Peter Yang：** Codex 用起来简单，但也有技能、自动化这类高级功能——你们内部用吗？

**Romain Huet：** **技能** 是应用界面最有趣的部分。跟用 Figma 的设计师协作，开 **Figma 技能** 直接从文件抽细节——React 组件、变量，Codex 按设计实现。部署到 Vercel、Cloudflare、Render 也有对应技能——告诉 Codex 做什么，它连上 **任务生态系统**。

朋友有很多产品改进想法，让 Codex **全记到 Linear**；用技能录下讨论全过程，最后说：**我要睡了，执行我们刚聊的所有任务并划掉**。醒来 **全完成了**。

**Alex：** 分享我们怎么想 **设计**。开发者爱 **给自己自动化**——自建工具、改代码。产品必须 **超强可配置**：Codex 框架 **开源**，用户会 fork、改未启用功能并在 Twitter 抱怨——说明 **最前沿用户跟我们一起活在未来**，把我们拉向未来。但若 **只服务那 1%**，产品会 **几乎无法理解**，得整天泡 Twitter。

所以我们 **非常小心地对待核心原语**——那是会写进文档、认真思考的地方，不是纯凭感觉。目标：**产品尽量隐形，不干扰模型**；模型越好做得越多，再 **尽可能可配置地打包给高级用户**。例如 **子代理** 实现已被广泛使用、实验——我们 **没在产品里主动触发**，但用户在学习，我们 **观察用法再简化给大众**。

Codex 应用本身是例子：GPT 5.2 Codex 十二月出现，模型 **渐进稳定**，突破 **更长任务可一次性委托**。人们已在终端 **tmux 多并行**——Peter Steinberger 曾 **18 个终端、3 块屏**。我们保证 CLI 委托跑通，但想：**也许只有 1% 顶尖工程师那样工作**——怎么让委托 **直观**？于是做了应用：像聊天框，能工作；然后发现侧边栏、多任务切换、技能标签——**像玩游戏不断发现下一步**。

**Romain Huet：** 我们从一开始就有愿景：**编码将以代理委托方式进行**。大约一年前用 Codex 时就在想工程师 **并行多项任务**——坦率说模型当时还没完全到位。要到 **GPT 5.2 Codex 及更高版本** 拐点，模型才能 **可靠连续工作数小时甚至数天**——那时在终端开多标签跑数小时才显得 **界面奇怪**，需要新界面。时机刚好。

**Alex：** Codex 历史上有两次 **氛围转变**。第一次约 **八月**：Codex 云——好主意、大家兴奋，但 **有点太早**。GPT-5 交互式编码模型出来后，我们回到 **模型现在能解决的问题**，发 CLI 和 IDE 扩展，**几个月增长 20–30 倍**。第二次 **十二、一月**：才真正回到 **把任务委托给模型** 的愿景。

> **金句 · Romain Huet**
> **中文：** 终端开多标签跑数小时——那界面本身就怪；我们需要让委托像玩游戏一样直观。
> **原文：** Having multiple terminal tabs running for hours is a weird interface—we needed delegation to feel like discovering the next level in a game.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 技能 | skill | 连 Figma/Linear/部署平台的可复用集成包 |
| 子代理 | sub-agent | 用户自配多代理，团队观察后产品化 |
| 核心原语 | core primitives | 认真文档化、不可凭感觉的部分 |
| 可配置性 | configurability | 服务 1% 前沿用户，同时不让产品不可理解 |
| 代理委托 | agent delegation | 并行多任务，从 CLI tmux 演进到应用 UX |

**本章小结**

- **技能 = 任务生态入口**——设计稿、工单、部署一条龙；可 **睡前批任务、醒来收工**
- 产品哲学：**核心原语严肃 + 高级可配置 + 对大众渐进披露**
- 应用不是简化版终端，是 **模型能力拐点**（长时可靠委托）后的 **人体工程学答案**

---

## 05 Alex 的两套模式、社区与 Peter/OpenClaw [22:11]

**Peter Yang：** Alex，你曾有一段时间是 Codex **唯一 PM**？团队现在多大？典型一天长什么样？

**Alex：** 大概 **50–100 人** 区间；五月份才 **八个人** 左右，之后增长极快。我最近发现 **很难描述典型一天**——有几种 **操作模式**，不是建议，是个人状态。

**发布前** 是 **直接执行**：痴迷质量、查每个角落、抠细节。大量时间在 Codex 里——用它 **理解 Slack 反馈**、总结、跟进 Linear；理解代码并 **直接改**。小改动发 **经过测试的 PR**，往往比找人沟通、让对方在 **一万件其他事** 里排期 **更快**——我们 **两周内就要发**。

发布临近我 **更常上 Twitter**——如果你看我推特频率，能判断是不是这种态。现在是 **新阶段**：GPT 5.4 很强，应用比预期更受欢迎、**Windows 全覆盖**。该 **回到云端加大投资**——更多时间想 **做什么、了解全局**，协调模式；在 Codex 里 **写代码变少**，更多 **用它沟通**。至少两套模式，可能更多。

**Peter Yang：** 跨职能协调多吗？

**Alex：** Codex 团队内部 **很少跨职能协调**——像 **海盗船**。现在内部也就我和另外两个 PM；大家都向 TiVo 汇报， **凑一起忙活**，没太多条条框框。

构建 Codex 很大一部分是构建 **编码代理**——它对 **非编码工作** 也是极有用的通用工具。OpenAI **绝大多数人** 都在用 Codex 应用，技术组织外也到处见。我们在想：**怎么让非编程人员同样好用**——这需要更多跨职能，还要跟 ChatGPT 整合。

**Romain Huet：** DevEx 团队像 Codex **延伸**——大部分精力在 Codex。模式几种：发布前 **与 Codex 团队一线** 备素材、研究怎么榨干产品；发布后 **教开发者** 多维使用。更广视角：平台上有 **数百万 API 开发者**，图像、Sora、语音各模态——**最好的构建入口已经变成 Codex**。去年夏天 GPT-5 还要写大量 **怎么 prompt** 指南；现在我们教开发者 **用 Codex 和技能** 搞定集成更新。**Codex 是开发者平台一切的基石**——非常跨职能。

**Alex：** 与 Codex 合作最棒的是 **社区**——线上、线下活动。一切围绕社区：**发布时机**、**反馈**——社区什么时候有反馈？解决并传达。我们都 **非常在线**。应用发布时与开发团队协调 **大规模内测**，与用户 **同步构建** 技能与文档。开源让我们对所做 **极其开放**，社区 **积极回报**。许多城市有 **Codex 大使** 组织活动、黑客马拉松——我没法每个城市都去，但热情很高。

**Peter Yang：** OpenClaw 早期用户 here——能记住对话、给我三分钟粗俗励志演讲。Peter 怎么整合进团队？个人代理愿景是 Codex 的一部分吗？

**Alex：** 能分享的有限。第一，他是 **超级 Codex 用户**——OpenClaw ** largely 用 Codex 构建**，用反馈和基础工作 **激励团队改进 Codex**，这是他的「副业」但一直在做。还有些细节暂不能分享——他在帮建 **下一代个人代理**，尝试 **融入 ChatGPT**。

**Romain Huet：** Peter 让我着迷——2025 全年建了 **40 多个开源项目**，都指向同一愿景：**命令行访问日历、推文、Gmail**……Skills 和 CLI 工具今天用于编码代理，**明天会是各类个人代理**。他会全程给出色反馈。

> **金句 · Romain Huet**
> **中文：** 数百万 API 开发者的最佳构建入口，已经变成 Codex。
> **原文：** The best way to build on the OpenAI platform has become Codex as the entry point.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 海盗船团队 | pirate ship team | 低流程、高自治、少跨职能会议 |
| 开发者体验 | developer experience (DevEx) | 教用法、备发布、把 Codex 当平台入口 |
| Codex 大使 | Codex ambassador | 社区自发组织本地活动与教学 |
| 个人代理 | personal agent | OpenClaw 愿景：统一 CLI/技能访问个人数据与服务 |

**本章小结**

- Alex **发布前执行 / 发布后协调** 两套模式——Twitter 频率是状态指示器
- DevEx 把 Codex 定位为 **全平台构建入口**，不只编码工具
- Peter Steinberger：**超级用户 + 下一代个人代理** 双线，OpenClaw 生态反馈回 Codex 产品

---

## 06 人才堆栈崩溃：PM 是补位，招聘看能动性 [32:06]

**Peter Yang：** 热辣观点——大多数团队还需要那么多 PM 吗？我们真的需要产品经理吗？

**Romain Huet：** 工具带来的冲击不只是「要不要 PM」——**几乎所有职业阶梯都在模糊**。以前设计师、工程师、PM 有 **黄金比例**；现在工程师更高效，设计师有 **超能力** 更技术化，PM 以前写策略文档，现在 **直接原型**——不必对十亿用户功能负责，但能用构建 **展示愿景一瞥**。所有职业界限在模糊，我们都是 **一起干活的建设者**。

**Alex：** 我确实在网上说过类似话——**初创公司工程师少于 20 人就有 PM，是危险信号**。角色都在模糊。但工程师通常需要 **专注**；以往不做项目管理，因为要编码——现在代理能 **分析反馈、排优先级**，时间多了，**每个人都能做一点别人的工作**。

**Scott Belsky 的人才堆栈崩溃**——**一个房间里做成任何事需要的人越少，越顺利，每个决定越纯粹**。那 PM 还剩什么？很多 PM 该 **换角色**：一直想当工程师、管理强但工程弱——有编码代理也许更适合 **工程经理**；或转 **设计师** 更接近构建。归根结底是 **兴趣**：AGI 时代 **兴趣和能动性** 是人类最重要的基本品质。

你 fundamentally 更爱写代码、只是有人得干 PM 活——现在该 **删掉自己** 当工程师。若最爱 **跟用户泡在一起**、预见市场，且团队已有足够工程师，PM 空间还在。但 **每个问题仍要有人对领域负责**——不一定是「产品经理」头衔。

**Romain Huet：** 也看产品性质。Codex 是 **纯 builder、开发者产品**——我们就是最好的用户，开源社区紧密。但十年前我在 Stripe——**250 人、零 PM**，因为 Stripe 就是 API，工程师知道好 API 长什么样。垂直领域陌生、要保持客户痴迷时，可能需要更多 **PM 时间跟客户泡**。

**Alex：** 那种情况下「PM」只是标签——代表 **能设计能编码、对用户极感兴趣的人**；也可以是 **对用户极感兴趣的工程师**。标签正在失去意义，有点乱，但 OK——我团队也这样。

**Peter Yang：** 最好工程师不问我「接下来建什么」——他们自己找用户、找方向。Codex 应用很多功能 **工程师自下而上** 提的，因为他们自己想要。

**Alex：** 有两种强工程师：一种 **爱跟用户聊、想构建什么**；一种 **建系统极快、对跟用户聊零兴趣**——后者空间也够。AI 世界我们都可以更 **固执己见**：做你自己，AI 和团队 **填你不想干的那块**。

**Peter Yang：** 很多 PM 想当 **领导者**——升到 VP 就没时间构建，整天评审偶尔给反馈。PM 不该是领导职位？

**Alex：** 我 **不认为 PM 是领导职位**，是 **填补空白的职位**。偶尔要领导力，也是 **帮人对齐**，不是天才想出唯一正确策略。OpenAI 最好 PM 都 **极深入细节**——高级领导加入很有挑战，因为 **细节仍至关重要**。直接深入细节总是更好。

**Peter Yang：** 你们新招了 Rohan——除了是 Codex 高级用户，还看什么？

**Alex：** **能动性**——能 **自发做事**，最重要。Codex 团队 **故意不是**「加入给 12 个任务按难度做」——更像 **欢迎你自己发现**。理想队友：**自发、有想法、敢跟现有想法分歧**（现有想法很可能错、只是偶然决定）、**主动吸收增量职责、对未被拥有的事负责**。角色上要 **技术背景**，比如工程。

**Romain Huet：** DevEx 找 **高能动性、技术硬、精通 Codex** 的人，还要 **爱跟开发者聊、爱分享**——本周宣布 **Codex Monitor** 开源作者 Thomas 加入。我们需要把 **数百万开发者** 带入 Codex 未来；**代理编码正在改变构建软件的方式**——潜力是向全世界展示 **谁都能构建任何东西并教别人**。

**Alex：** DevEx 职位描述是不是：**超强工程师 + 超会玩 Twitter**？

**Romain Huet：** 全球不止 Twitter——欧洲有人更用 LinkedIn，要 **全球社交 + 爱教学**。

**Peter Yang：** **能动性** 面试前就能看出来——**网上发东西吗？有副业吗？**

**Alex：** 有人私信合作兴趣，我问：**有链接吗？** 有作品链接我 **一定点**。长篇想法我会读；只是 **为什么对这个职位感兴趣** 或 **简历**——读的概率 **小得多**。我才意识到 **根本不知道人们哪所大学毕业**——谁在乎呢？

> **金句 · Alex（封底）**
> **中文：** 谁在乎哪所大学？直接给我看你建造了什么。
> **原文：** Who cares what university you went to? Just show me what you built.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 能动性 | agency | 自发行动、有作品、敢担未归属职责 |
| PM 补位 | PM as gap-filler | 非领导职位，帮对齐、填空白 |
| 自下而上功能 | bottom-up features | 工程师因自己想要而推动的产品能力 |
| 建设者 | builder | 跨职能标签塌缩后的统一身份 |

**本章小结**

- **<20 工程师雇 PM = 危险信号**——不是反 PM 学科，是反过早分工
- PM 理想态：**补位、深入细节、对齐**；不是 VP 式纯评审
- 招聘：**作品链接 > 简历**；大学背景 ** irrelevant**

---

## 总结：十要点规范、八周冲刺、委托像玩游戏

| 维度 | 要点 |
|------|------|
| 团队怎么用 Codex | 规范极少且 **≤10 要点**；计划模式探索；设计师代码量 **> 六个月前工程师** |
| 规划哲学 | **八周内具体冲刺 + 长期模型直觉**；无中期路线图；黑客周原型 → 规范从构建长出 |
| 产品 UX | 应用 = **多代理委托** 的人体工程学；技能连 Linear/Figma/部署；**像玩游戏发现功能** |
| 组织形态 | **海盗船**、社区驱动发布；DevEx 把 Codex 当 **全平台构建入口** |
| PM 与未来 | **人才堆栈崩溃**；PM = **补位非领导**；\<20 人雇 PM 警惕；兴趣与能动性 > 头衔 |
| 招聘 | **作品与副业** > 简历学历；自发、敢分歧、吸收未归属职责 |

### 对构建者的启示

- 别写长 PRD——**十个要点 + 离金属最近的人决策**；复杂域用 **计划模式** 摸模型再交给 owner，与 [[Codex负责人-现场演示Codex]] 里 Thibault 的「智能体成熟度」同向，本篇补 **OpenAI 内部 dogfood** 细节。
- 路线图：**只 commit 八周内能动员团队的事**；中期规划在 AI 编码速度下易失效——可参考 [[OpenAI研究员-Harness工程软件开发新范式]] 的 harness 迭代节奏。
- 多代理不必 **18 终端 tmux**——应用侧栏、技能、子代理是 **渐进披露**；高级用户 fork 开源核心，产品从 **1% 行为** 学习再简化。

### 仍待验证

- Alex 全名专栏未写全——外源为 Alex Embirico（@embirico），frontmatter 已链 [[Alex Embirico]]，若 vault 无作者页需补。
- Peter × OpenClaw **融入 ChatGPT** 细节 Alex 称暂不能分享。
- 「设计师代码量 > 工程师」为 **团队内相对比较**，非全行业统计。

> **金句 · Alex（封底）**
> **中文：** 一个房间里需要的人越少，每个决定越纯粹——兴趣和能动性才是 AGI 时代留给人间的硬通货。
> **原文：** The fewer people you need in a room to get anything done, the purer each decision—and interest and agency are what remain uniquely human.

---

## 附录

### 章节时间戳（B 站简介 / 专栏导读）

| 章节 | 时间 | 主题 |
|------|------|------|
| 01 | [00:00] | Codex Spark 现场 demo、十要点规范、计划模式 |
| 02 | [08:09] / [10:30] | 设计师代码量超工程师、职能边界模糊 |
| 03 | [15:30] / [16:45] | 八周冲刺、拒绝中期路线图、Codex 应用起源 |
| 04 | [19:12] | 技能生态、子代理、委托 UX 像玩游戏 |
| 05 | [22:11] | Alex 两套模式、社区、Peter/OpenClaw |
| 06 | [32:06] / [35:20] / [39:20] | PM 补位论、人才堆栈崩溃、能动性招聘 |

### Ingest 路径

| 字段 | 路径 |
|------|------|
| ingest_dir | `Recastory/workspace/bilibili-retranscribe/BV1iKdvBhEYJ/ingest` |
| column_source | `.../ingest/column_article.md` |
| column_url | https://www.bilibili.com/read/cv47878914/ |
| BV | https://www.bilibili.com/video/BV1iKdvBhEYJ/ |
| YouTube 原片 | https://www.youtube.com/watch?v=9qXc-THAvc0 |

### 相关阅读

- [[Codex负责人-现场演示Codex]] — Thibault × Marina：智能体成熟度与 elder review；本篇 Alex × Romain：**内部如何 dogfood 建 Codex**
- [[Codex 负责人-所有人都是 builder 是个很糟糕的主意 - Founder Park]] — Ambrosino 反「人人 builder」；本篇 Alex 谈 **人才堆栈崩溃** 与 PM 补位，可对照读
- [[OpenClaw创始人-我是如何使用OpenClaw的]] — Peter Steinberger 终端军队；本篇 **Peter 转 Codex 应用** 与 OpenClaw 反馈闭环
- [[Alchemy CPO-从代码审查到自动代理]] — Romain Huet 作 Host 的另一场；可对照 DevEx 视角
- [[MOC - Agent Theory and Design]] — Codex 实战索引
