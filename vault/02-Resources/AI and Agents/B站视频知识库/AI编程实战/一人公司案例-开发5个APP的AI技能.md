---
title: "一人公司案例：开发5个APP的AI技能"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "harness_engineering", "skills", "memory"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "harness_engineering", "skills", "memory", "ai_product"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1qiE56SE4c/"
description: "Baremetrics创始人Josh Pigford分享如何用AI代理同时开发维护5款产品：研究-规划-实施三阶段流、对抗性审查、学习技能、But Seriously指令。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/AI编程实战/一人公司案例-开发5个APP的AI技能.md"
source_sha256: "44e96518753a4f3bb906cde5d34bb6b9af95cece4f4ebf206e6f9c77289688d1"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1qiE56SE4c/"
column_url: "https://www.bilibili.com/read/cv48962467/"
column_source: "bilibili_column"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1qiE56SE4c/ingest"
duration: ~30 min
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical (column primary)"
host_name: "Peter Yang"
guest_name: "Josh Pigford"
guest_title: "Baremetrics创始人"
speaker_inference: "column_article明确标注Peter Yang(主持人)/Josh Pigford(嘉宾)角色"
speaker_confidence: high
author:
  - "[[Josh Pigford]]"
  - "[[Peter Yang]]"
concepts:
  - id: research_plan_implement
    zh: 研究-规划-实施三阶段流
    en: research-plan-implement pipeline
    one_line: 把开发任务拆成独立阶段，每阶段有专门指令集
  - id: adversarial_review
    zh: 对抗性审查
    en: adversarial review
    one_line: 用GPT-4审查Opus的代码，找出3-5个遗漏Bug
  - id: learning_skill
    zh: 学习技能
    en: learning skill
    one_line: 自动分析对话记录，将经验提炼写入项目配置文件
  - id: but_seriously
    zh: 但说真的指令
    en: but seriously instruction
    one_line: 质疑AI让它重新检查逻辑，发现深层漏洞
  - id: worktree_checkpoint
    zh: 工作树存档点
    en: worktree checkpoint
    one_line: 每个阶段用独立工作树，方便回滚避免上下文腐烂
---

# 一人公司案例：开发5个APP的AI技能

**Host：** Peter Yang（科技评论人）  
**Guest：** Josh Pigford（Baremetrics创始人）  
**形态：** 访谈 · Host-Guest canonical v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV1qiE56SE4c](https://www.bilibili.com/video/BV1qiE56SE4c/) · **专栏** [cv48962467](https://www.bilibili.com/read/cv48962467/) · **时长** ~30 min

---

## 开场

Josh Pigford以400万美元卖掉了Baremetrics，现在同时开发至少5款AI产品——Proxy User、Rumored、Reply Social，还有一个帮癌症患者家属追踪医疗资料的工具。他说自己是典型的ADHD，大脑天生四处跳跃，而AI代理正好满足了这种多线程需求。核心判断是：AI时代，一个人可以同时维护多个产品，关键在于建立结构化的AI开发流和对抗性审查机制。

五章预告：**研究-规划-实施三阶段AI开发流** → **对抗性审查：用GPT-4纠正Opus** → **学习技能防止AI重复犯错** → **"但说真的"指令施压找漏洞** → **抛弃着陆页直接发布MVP**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 研究-规划-实施 | research-plan-implement | 把开发任务拆成独立阶段，每阶段有专门指令 |
| 对抗性审查 | adversarial review | 用另一个模型审查代码，找出遗漏Bug |
| 学习技能 | learning skill | 自动分析对话记录，将经验写入项目配置文件 |
| 但说真的指令 | but seriously instruction | 质疑AI让它重新检查逻辑 |
| 工作树存档点 | worktree checkpoint | 每个阶段用独立工作树，方便回滚 |
| 上下文腐烂 | context rot | 长会话中AI逐渐偏离原始目标 |
| 单体仓库 | monorepo | 多个应用共用一个代码仓库 |

---

## 01 三阶段AI开发流：研究、规划、实施各走各的

**Peter：** 你同时处理这么多产品，是怎么做到的？能不能展示一下你用Conductor构建功能的完整流程？

**Josh：** 当然。我有一个构建技能，它是开源的。它就像一个GitHub仓库，里面包含研究阶段、规划阶段和实施阶段，每个阶段都有一套不同的指令。

当你第一次构建时，以这个案例为例——我想把机器人拦截功能集成到Reply Social中——最初的输出是一个研究文档。它提取了我之前为一个已停用的机器人拦截产品构建的代码库，将其与Reply Social代码库合并，然后针对高层技术问题、不同的API调用进行了大量研究。你需要权衡利弊，比如哪些可以忽略原始的Chrome扩展，哪些需要引入，以及这些系统将如何交互。这些都是高层设计。

**Peter：** 所以首先生成的是研究文档，然后呢？

**Josh：** 接着我会运行构建技能中的"实现"命令，它会进入不同阶段。在这个案例中，它分四个阶段来实现功能，对应四个拉取请求——Git中的四个独立分支。这样它就不会试图一次性完成大规模工作，而是拆分成我可以审查的独立模块。

我设置构建技能的方式是，让它创建可供用户测试的阶段。有时实现文档会有30多个阶段，因为我希望在每一步都能亲自测试。归根结底，我需要作为最终把关的人——它需要感觉是对的。

**Peter：** 每个阶段为什么要启动新的工作树？

**Josh：** 我把工作树看作是一个可交付的成果，是要推送到生产环境的东西。对我来说，它必须是自包含的。部分原因是为了管理上下文，但更多是为了方便回滚。如果我搞砸了，这些工作树就是我的检查点，可以随时回滚。每次都是全新的环境，这样可以避免"上下文腐烂"，产生幻觉的情况也会少得多。

> **金句 · Josh Pigford**
> **中文：** 我把工作树看作是可交付的成果。每次都是全新的环境，这样可以避免上下文腐烂，产生幻觉的情况也会少得多。
> **原文：** I treat worktrees as deliverables. Each time it's a fresh environment, which prevents context rot and significantly reduces hallucinations.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 研究-规划-实施 | research-plan-implement | 把开发任务拆成独立阶段，每阶段有专门指令 |
| 工作树存档点 | worktree checkpoint | 每个阶段用独立工作树，方便回滚 |
| 上下文腐烂 | context rot | 长会话中AI逐渐偏离原始目标 |

**本章小结**
- 开发流程拆成研究、规划、实施三个独立阶段，每阶段有专门的指令集
- 每个阶段对应一个独立的工作树和PR，方便测试和回滚
- 独立工作树避免了长会话中的上下文腐烂，减少AI幻觉

---

## 02 对抗性审查：让Opus写初稿，GPT-4o找Bug

**Peter：** 你的流程是主要用Claude Opus，然后用GPT-4o审查？

**Josh：** 没错。我的流程是：主要使用Claude Opus处理所有事情，包括规划和初稿；代码在工作树中构建好后，我再用GPT-4o进行审查。它会对内容进行对抗性审查，总能发现Opus遗漏的3到5个Bug，修复后才会合并。

**Peter：** 这是另一个独立的技能，还是构建技能的一部分？

**Josh：** 这其实集成在Conductor内部。它有一个审查按钮，你可以设置一个审查模型。除了默认模型，你也可以选择任何你想要用的模型。让Opus进行第一轮大规模处理，再让GPT找出遗漏的漏洞，最后推送到拉取请求中。

**Peter：** 你提到它有时会看竞争对手的做法，它会亲自去浏览网站吗？

**Josh：** 是的，它会进行实际的网络搜索，浏览页面，必要时还会截屏。以Clearly为例，它是开源的，人们在GitHub上提了很多功能请求。对于一些零散的任务，比如有人想给Mermaid图表添加缩放功能，我会把请求关联起来，然后运行"研究技能"。这个技能会抓取GitHub信息，进行网络搜索、UI处理和文档搜索。接着它会研究如何集成并给出一个计划，我只需审批即可。

> **金句 · Josh Pigford**
> **中文：** 让Opus进行第一轮大规模处理，再让GPT找出遗漏的漏洞。这就像团队里的代码评审——换一双眼睛看，总能发现一些问题。
> **原文：** Let Opus do the first heavy lifting, then have GPT find the missed vulnerabilities. It's like code review in a team — a fresh set of eyes always catches something.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 对抗性审查 | adversarial review | 用另一个模型审查代码，找出遗漏Bug |
| 审查模型 | review model | 专门用于代码审查的AI模型 |
| 功能请求 | feature request | 用户在GitHub上提出的新功能需求 |

**本章小结**
- Opus负责规划和初稿，GPT-4o负责对抗性审查，总能发现3-5个遗漏Bug
- 审查集成在Conductor内部，可以自由切换审查模型
- 研究技能会实际浏览竞争对手网站、截屏、搜索最新文档，给出集成方案

---

## 03 学习技能：让AI不再犯同样的错

**Peter：** 你有没有类似.claudefile或指令文件，里面列出了最佳实践？

**Josh：** 有的。它非常专注于Rails，因为我的技术栈通常是Rails加上Inertia和Postgres。它涵盖了很多Rails的最佳实践，包括我喜欢的测试方式，比如使用代理浏览器。它还特别提到了Conductor的一些独特变量。这些都是我这些年积累下来的经验。

**Peter：** 这些不是你手动输入的吧？

**Josh：** 是它自己生成的。我告诉它文档的结构，让它帮我填写。内容非常详尽，涵盖了各种操作流程。

我刚才提到的"学习技能"很有用：每当我完成并发布一个阶段后，我会针对当前的工作树运行这个技能。它会回顾工作树中的改动以及我们的对话记录。比如我曾多次纠正它"那样行不通，试试这个"，它会审查这些反馈，将其提炼并添加到.claudefile中，这样它以后就不会再犯同样的错误了。

**Peter：** 所以.claudefile是一直在更新的？

**Josh：** 对。它的副产品是，每一步完成后都会更新进度文件，记录该阶段完成的所有工作和做出的决定。这不是一蹴而就的，我需要不断迭代。系统在运行中学习到的东西也会被添加到进度文件中。进度文件的作用就是确保它不会犯同样的错误。

> **金句 · Josh Pigford**
> **中文：** 每当我纠正它"那样行不通，试试这个"，学习技能会审查这些反馈，提炼并写入.claudefile，这样它以后就不会再犯同样的错误。
> **原文：** Every time I correct it with "that won't work, try this," the learning skill reviews that feedback, distills it, and writes it into the .claudefile so it won't make the same mistake again.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 学习技能 | learning skill | 自动分析对话记录，将经验写入项目配置文件 |
| 进度文件 | progress file | 记录每阶段完成的工作和做出的决定 |
| 经验提炼 | experience distillation | 从纠错对话中提取通用规则写入配置 |

**本章小结**
- 学习技能在每个阶段完成后自动分析对话记录和报错信息
- 它把用户纠错的经验提炼并更新到.claudefile中，作为AI的长期记忆
- 进度文件确保AI不会在同一阶段犯同样的错误，每个新工作树都能参考历史决策

---

## 04 "但说真的"指令：对AI刻薄一点，它反而更靠谱

**Peter：** 你提到还有一个叫"但说真的"的对抗性技能，能不能展开说说？

**Josh：** 在制定并实施计划后，我会运行它。这个技能本质上是去"欺负"一下AI，告诉它："嘿，伙计，你肯定搞砸了什么，再检查一遍。"这通常能发现3到5个Bug。这与之前的GPT审查是分开的，重点是强迫它重新审视一遍。

**Peter：** 人类审查大量代码很费时间，但对AI来说很快。

**Josh：** 我的想法是，在典型的团队环境中，当你发起PR时，总会有另一个开发人员来审查。换一双眼睛看代码，总能发现一些问题，或者提出不同的实现方式。我只是让AI扮演了这个审查者的角色。

**Peter：** 这个技能是让AI写的吗？

**Josh：** 我迭代了很多次。Chops内置了AI迭代器，我只需给它指导，比如"语气再刻薄一点"，它就会自动更新整个技能描述。它的效果好得惊人。当你因为AI总是搞砸而感到沮丧时，虽然它只是台机器，但有时确实需要对它"刻薄"一点。

**Peter：** 我对它通常很客气，会说"请做这个"。但如果它一直卡在某个地方，我也快崩溃了。

**Josh：** 我最后甚至会用全大写字母打字，搞得好像它真的会在乎一样。

> **金句 · Josh Pigford**
> **中文：** 当你因为AI总是搞砸而感到沮丧时，虽然它只是台机器，但有时确实需要对它"刻薄"一点。它的效果好得惊人。
> **原文：** When you're frustrated because AI keeps messing up — even though it's just a machine — sometimes you do need to be a bit "mean" to it. The results are surprisingly good.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 但说真的指令 | but seriously instruction | 质疑AI让它重新检查逻辑 |
| 心理暗示 | psychological nudge | 用压力迫使AI更仔细地审视自己的输出 |
| 技能迭代 | skill iteration | 通过AI迭代器不断调整技能描述 |

**本章小结**
- "但说真的"指令本质上是施加压力，强迫AI重新检查逻辑漏洞
- 这和GPT审查是分开的两道防线，通常各能发现3-5个Bug
- 技能文件本身可以通过AI迭代器迭代——告诉它"语气再刻薄一点"，它会自动更新

---

## 05 快速发布：着陆页验证是逃避发布的干扰项

**Peter：** 你如何验证需求？你如何做MVP？

**Josh：** 虽然并非总是如此，但我认为人们仍然倾向于犹豫，因为发布任何东西都是令人恐惧的。我做了25年，发布了数百种不同的产品，但每次发布时还是会想："天哪，如果没人关心怎么办？那太糟糕了。"

作为人类，我们倾向于通过建立一个着陆页来收集电子邮件地址，试图以此验证需求，从而推迟发布。但这其实只是一种干扰。所以我选择忍受那种恐惧，把东西做出来，推向市场，看看会发生什么。

**Peter：** 你会担心一件事吗？如果你发布了一些没人关心的糟糕东西，你的声誉就会受到影响。你如何克服这种心理？

**Josh：** 我觉得我构建东西已经很久了，所以我不再担心有人会觉得它很蠢。每个人都是不同的，我可能有一个痛点，虽然我可能是唯一一个有这个痛点的人，但这并不能否定这个痛点的存在。

对我来说，关键在于：**它能支付服务器费用吗？** 如果它不能覆盖成本，它就不是慈善机构，它必须能覆盖自身的成本。这往往是我的底线。

**Peter：** 对于没有15年经验的人，你有什么建议？

**Josh：** 我认为就是多犯错。人们有时会把"凭感觉编程"当作一个贬义词，但现实是，任何人能构建出任何东西都是很棒的。他们唯一能弄清楚什么不该做的方法，就是先做错事。我认为就是要尽可能快地犯错，并认识到错误是什么，这样你就不会重复犯错。

那种花几个月时间开发一个东西才发布给别人使用的想法，我认为是一个非常糟糕的主意。现在就把它扔出去看看会发生什么，没有理由不这样做。

> **金句 · Josh Pigford**
> **中文：** 通过建立着陆页收集邮箱来验证需求，这其实只是一种干扰。把东西做出来，推向市场，看看会发生什么。
> **原文：** Building a landing page to collect emails to validate demand — that's just a distraction. Build the thing, push it to market, and see what happens.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 最小可行产品 | MVP (minimum viable product) | 能验证需求的最简版本 |
| 着陆页验证 | landing page validation | 通过静态页面收集邮箱来验证需求 |
| 凭感觉编程 | vibe coding | 不靠系统学习而是靠直觉和尝试来编程 |

**本章小结**
- 着陆页收集邮箱是逃避发布的干扰项——构建成本已经低到可以直接做MVP
- 判断产品是否值得继续的底线是"能不能支付服务器费用"
- "凭感觉编程"不是贬义词，多犯错、尽快犯错、不重复犯错才是正道

---

## 总结：AI拉平了竞争环境，但25年经验让你知道什么不该做

| 维度 | 要点 |
|------|------|
| 三阶段流 | 研究→规划→实施各走各的，每阶段独立指令和工作树 |
| 对抗性审查 | Opus写初稿，GPT-4o找Bug，两道防线各发现3-5个漏洞 |
| 学习技能 | 自动从纠错对话中提炼经验写入配置，防止重复犯错 |
| 但说真的 | 施压让AI重新检查，是第三道防线 |
| 快速发布 | 着陆页验证是干扰项，直接做MVP推向市场 |

### 对个人的启示
AI让一个人同时维护多个产品成为可能，但"知道什么不该做"仍然需要实战经验。三阶段流+对抗性审查+学习技能形成了一个自我改进的闭环——AI负责执行，人负责把关和方向判断。

### 仍待验证
多产品同时维护的长期可持续性——ADHD驱动的多线程工作是否会在某个临界点崩溃？对抗性审查的有效性是否会随着模型进步而递减？

> **金句 · Josh Pigford（封底）**
> **中文：** 尽可能快地犯错，并认识到错误是什么，这样你就不会重复犯错。没有什么能真正取代直接投入并动手去做。
> **原文：** Make mistakes as fast as possible, recognize what the mistakes are, so you don't repeat them. Nothing truly replaces just diving in and doing it.

---

## 附录

- **时间戳**：[07:12] 建立研究-规划-实施的三阶段AI开发流 · [11:45] 引入对抗性审查：用GPT-4纠正Opus的错误 · [16:32] 建立学习技能防止AI在同一个坑里跌倒 · [18:15] 但说真的指令：通过施压让AI承认错误 · [24:10] 抛弃着陆页验证，直接发布MVP才是正经事
- **ingest 路径**：`Recastory/workspace/bilibili-retranscribe/BV1qiE56SE4c/ingest`
- **专栏路径**：`https://www.bilibili.com/read/cv48962467/`
- **相关阅读**：[[MOC - Harness Engineering]] · [[OpenAI员工-上下文工程和Agent记忆]] · [[IBM团队-Harness工程详解]]
