---
title: "YC 合伙人：YC 内部 AI 代理基础设施"
tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering", "skills", "mcp"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering", "skills", "mcp"]
created: "2026-07-08"
source: "B站视频 - Easonlee的AI笔记"
description: "Pete Koomen：YC 自研代理基础设施——Postgres 统一上下文、350+ 工具注册表、梦想周期自我改进、默认透明 Slack 广播、AI 作构建层非副驾驶；批判 Gmail 式无马车 AI。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/YC合伙人-YC内部AI代理基础设施.md"
source_sha256: "544202aca0cd4a94f62c0f021d423e792ad0609bd86a8d3eb4a6b6196b590506"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1467R6LEzm/"
column_url: "https://www.bilibili.com/read/cv50043197/"
host_name: "Jared / Gary (Lightcone)"
guest_name: "Pete Koomen"
guest_title: "YC 特邀普通合伙人 · Optimizely 创始人"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1467R6LEzm/ingest"
speaker: "Pete Koomen"
duration: "~40:00"
saved: 2026-07-08
updated: 2026-07-08
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1467R6LEzm/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1467R6LEzm/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical (Lightcone podcast)
speaker_inference: "column keynote"
speaker_confidence: high
concepts:
  - id: org_superintelligence
    zh: 组织超智能
    en: organizational superintelligence
    one_line: 记录产物 + 元提示，技能优于任何个人
  - id: tool_registry
    zh: 工具注册表
    en: internal tool registry
    one_line: 350+ YC 特有工具，代理循环可调用
  - id: dream_cycle
    zh: 梦想周期
    en: dream cycle
    one_line: 夜间读全员代理对话，自动改提示
  - id: default_transparency
    zh: 默认透明
    en: default transparency
    one_line: 代理对话全员可见 + Slack 广播
  - id: agent_enclosed_software
    zh: 代理封装软件
    en: agent-enclosed software
    one_line: AI 为核心，确定性 UI 为辅
author:
  - "[[Pete Koomen]]"
---

# YC 合伙人：YC 内部 AI 代理基础设施

**Host：** Jared / Gary（Lightcone 播客）  
**Guest：** Pete Koomen（YC GP · Optimizely 创始人）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 对谈）  
**B 站：** [BV1467R6LEzm](https://www.bilibili.com/video/BV1467R6LEzm/) · **时长** ~40 min

---

## 开场

**Gary：** YC 对外投 AI 公司，对内怎么把自己变成 AI 原生？Pete，你从哪一刻开始带这条线？

**Pete：** 大约一年前，我和几位工程师开始一个项目，后来滚雪球成为整个基础设施层。最初动力和财务团队有关：YC 自成立以来大部分时间跑**自研软件**——这在当下是巨大优势。我们和财务团队坐下来，讨论帮他们处理日记账、定价轮次等流程的专用工具。

**Gary：** 你同时看到什么？

**Pete：** 两条线：内部「需求→工程师写 Ruby 确定性流程→交还」，循环低效；个人电脑上 Cursor / Claude Code 像超能力。**最初动力：让财务用英语 prompt 自己的工作流**，把工程师从翻译官里解放出来——不是 Ruby，是英语。第一版用 LLM 写 SQL，像很多已失败的初创；在 YC 却跑得极好，非技术财务也能问真实问题。

**Jared：** 我偷偷给代理只读 SQL + 读模型文件，像打破规则——少担心安全，威力惊人。

**Pete：** 阻碍世界的是对隐私安全的过度恐惧；**统一 Postgres** 存创始人、投资、CRM 笔记——外包 SaaS 的公司没有这层。问「过去四批投太空公司的投资者有谁？」——上下文在一处，加 schema 提示，代理就能答。神奇之处：**问题数量与复杂度暴涨**，杰文斯悖论 again。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理循环 | agent loop | 模型 + 工具注册表 + 路由 |
| 技能化 | skillify | 元技能：把做法收成可调用技能 |
| MECE | mutually exclusive, collectively exhaustive | 工具/技能不重复不遗漏 |
| 梦想周期 | dream cycle | 夜间批处理改进提示与技能 |
| 即时软件 | just-in-time software | 聊天驱动，按需生成 UI/逻辑 |

---

## 01 摆脱确定性工作流陷阱

**Gary：** 为什么 SQL 只读这么关键？

**Pete：** YC 的优势是**所有业务数据在一个 Postgres**——投资公司、创始人、财务交易、CRM 笔记。很多公司外包给第三方 SaaS，没有这层。当所有上下文集中，稍微增加 schema 信息，代理就能问任意业务问题。最酷的不只是答得更容易——**我们敢问的问题数量和复杂度都上去了**。以前用 BI 工具写 SQL 要几小时，除非真重要否则懒得问。

**Jared：** 为了问复杂问题得敲数据科学团队门、等排期——大多数人 2026 年还活在那模式里。

**Pete：** 还有很长的路要走，这很 exciting。旧世界公司怎么追？**建尽可能多内部上下文的 data warehouse**；magic 在于所有东西在一处。BigTable 不是关于模式连接，是大表 MapReduce——**Karpathy 风格 LLM wiki、gbrain 正在重演**。

**Gary：** 我的 OpenClaw + gbrain：数据 everywhere → 反规范化 → 问一个问题，它解释问题背后是什么。CLI 比 MCP 散连更好用。

**Pete：** 我们仍处于代理「单人游戏」时代——Claude Code、PI、OpenClaw、Hermes 都是一个人一台机器。**多人 agent 超能力**还没被很好解决；YC 在探组织层 primitives。legacy 公司两步：**统一上下文 + 内部工具注册表**——集中比 MCP 散连更高效；像 monorepo 对 coding agent。

**Jared：** 成立超过两年的组织，今晚就能做什么？

**Pete：** 今晚就可以开始记录产物——会议、Slack、决策。明天建 data warehouse  ingest 计划；下周起内部工具注册表，哪怕从 20 个工具开始。别等完美架构——**所有上下文集中一处**的价值，第一天就能在小范围验证（比如只读 SQL 一个神奇工具）。单人 OpenClaw 经验要升级成组织 MECE 技能体系，那是第二阶段。

> **金句 · Pete**
> **中文：** 把软件控制权从开发者转移到用户手里。
> **原文：** The potential of AI is transferring control of software from developers to users.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 英语编码 | prompt-as-code | 业务方直接描述流程 |
| 单体上下文 | monolithic context | 自研软件 → 单库全数据 |
| 摩擦→需求 | friction drives demand | 问问题变便宜则问更多 |
| 反规范化 | denormalization for agents | 为检索优化而非 OLTP |

**本章小结**

- 起点：财务英语 workflow；SQL 只读解锁非技术方问真实问题
- YC 优势 = 自研软件 + 单 Postgres 全上下文
- 杰文斯悖论：问问题变易 → 问题数量与复杂度激增
- legacy 追：data warehouse + 工具注册表；单人 OpenClaw ≠ 组织超智能

---

## 02 工具注册表与 Skillify

**Gary：** 工具注册表怎么涨起来的？

**Pete：** 从 ~20 个（SQL 查询是第一个魔法）涨到 **350+**：管办公时间、财务分录、活动——YC 重要工作都有工具。集中注册表可喂内部代理，也可给个人 Claude Code。每遇到可通过代理改进的 YC 工作，就加工具。

**Jared：** 我的 **Skillify** 元技能：新做法不错就说「技能化」→ 工具调用；再跑 **检查可解析性**——DRY？MECE？10 个重复技能不如 1 个带参数。像 Unix 时代同时发现「堆栈」——代理循环、工具表、技能表、解析器 MD 在各处重现。

**Pete：** 技能是工具的薄抽象；演进：手写 system prompt → 写技能 → **元提示**。我们已有**通用代理每晚读全员代理对话**，找可改进点——Karpathy 自动研究、Codex slash commands 同路。例：**两句话描述**技能——Tom 手写提示；合伙人 batch 会议教创始人 pitch，录音反馈给代理，**现在代理写得比人好**。

**Gary：** 两句话描述是什么？为什么难？

**Pete：** 用任何人都能懂的自然语言解释公司做什么、为什么有趣——对创始人出奇地难。YC 本质是**上下文工程**：你脑中有完美上下文，良好沟通是在别人脑中复制相同上下文。第一部分：我能听懂这到底是什么吗？第二部分：它有趣到值得我花时间吗？Tom 写技能教代理获取背景、浓缩成两句话；合伙人会议产物反馈给代理改进技能——**组织超智能**就是这样叠出来的：记录 → 元提示 → 每天自动改进。

**Jared：** 具体机制呢——从 Tom 手写提示到比人强？

**Pete：** Tom（合伙人之一）编写技能，教代理获取公司背景、浓缩成两句话——那是手写的提示或技能。过去一两个月：其他几位合伙人与春季批次公司开会，逐一让创始人尝试写两句话、给反馈——合伙人脑海中关于如何有效表达的知识充分交流，存在于**会议记录上下文**里。我们将其反馈给代理：「根据你阅读这些上下文所学，改进两句话描述技能。」之后代理生成的描述明显更好——坦白说，**现在比我更擅长**。这就是组织内部超智能的微观机制：从有人写提示 → 他人使用 → 产生记录 → 元提示 → 自动化每天改进 → 技能变得比任何一个人都出色。

**Gary：** Jack Dorsey 的 Block 迷你 AGI——和 YC 两句话 pitch 同构？

**Pete：** 你可以把任何组织运作都这样处理——两句话 pitch 只是我们为创始人做的数千件事之一。关键突破是：任何人做的任何事，以这种方式组合，你就会拥有超级组织。人们会被困在资源多但领导者**不相信我们刚才所说的**的组织里——因为他们把所有上下文锁起来了，觉得不安全。

> **金句 · Pete**
> **中文：** 共享的组织大脑，是目前最接近大脑联网的方式。
> **原文：** A shared organizational brain — the closest thing we have to brains being networked.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 两句话描述 | two-sentence pitch | YC 核心上下文工程 |
| 解析器表 | parser manifest | 代理能做什么的清单 |
| 自动学徒制 | AI apprenticeship | 新人看 Slack 学明星用法 |
| MECE 纪律 | MECE discipline | 10 个重复技能 → 1 个带参数 |

**本章小结**

- 350+ 工具注册表；YC 特有逻辑集中在工具层
- Skillify + MECE：技能化 → 检查可解析性，DRY/MECE 最优
- 两句话 pitch：会议产物 → 元提示 → nightly 进化到超人类
- 组织超智能 = 每件事都这样叠：记录产物 → 自动改进

---

## 03 默认透明与 AI 原生文化

**Gary：** 代理对话默认全员可见——你们怎么决定的？

**Pete：** 当初也不确定，感觉像生活在未来，决定来之不易。有过很多「每个人都看到一切，可以吗？」的对话。Glad 我们选开放——人们观察 Gary 的创意用法，「原来还能这样」。**每个代理对话同步 Slack 频道**；透明度换安全：权力来自不受限上下文，广播建立社会规范——**高度信任环境**里隐私反而可控。

**Jared：** 1000 倍超智能组织两特征：**相对平等 + 默认信任**——大多数公司没有。初创小团队最 fit；愿意年花 **1–10 万刀 token** + 开放协作，像活在 2028。

**Pete：** 像 90 年代给员工买电脑——贵但竞争对手没有时就是超能力。新员工 onboarding 从六个月 → 自动获得**明星怎么做事**的上下文；可模拟 Pete 教销售、Gary 给建议，**不必占合伙人时间**。编码代理里敢问蠢问题；组织里新员工不敢打扰 Harj——代理层降低提问成本，**更多问题被提出和回答**。

**Gary：** Dario 说过 AI 障碍不全是技术，还有社会文化——两年前录会议很奇怪，今天 Zoom 上几乎默认录制。

**Pete：** AI 不是 2023 的副驾驶；是 **2026 的一切构建层**。你需要**记录所有工作产出**——会议记录不只是存档，是改进邮件、沟通、计划的上下文。规范的两句话技能，也是帮我理解「什么才是有效的创始人沟通」——Diana、Harj 多年经验通过对话融入技能。

**Jared：** 默认透明会不会泄露敏感信息？

**Pete：** 我们当初对「全员可见」有过很多对话——什么不可以公开？但 Glad 选开放：每个对话**广播到 Slack 频道**，任何人可加入学习。Gary 的创意用法成为突破——「哦，原来还能这样用」。当代理有不受限访问大量上下文时力量最大，这与大多数组织运作方式背道而驰；**通过默认广播**，你在人们如何使用上建立社会共识——在高度信任环境里，保护私人信息一直相当有效。

**Gary：** 1000 倍组织还需要什么？

**Pete：** 两特征：**相对平等 + 默认信任**——世界上大多数组织不具备。初创小团队最 fit；愿意每年 **1–10 万刀 token** + 技能投资 + 开放协作，你就活在 2028——现在花十万或一百万的东西，两年后司空见惯，可能变一万、几百。像 90 年代给员工买电脑：竞争对手没有时，拥有电脑是超能力。新员工 onboarding 从六个月 → 自动获得明星怎么做事的上下文——**AI 自动学徒制**，不占合伙人昂贵时间。

> **金句 · Pete**
> **中文：** AI 不是 2023 的副驾驶；是 2026 的一切构建层。
> **原文：** AI is not the 2023 copilot — it's the 2026 building layer for everything.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 产物记录 | artifact logging | 会议/对话喂元改进 |
| Slack 广播 | Slack broadcast | 代理用法可观察 |
| 时间扭曲 | time warp | 早投 token 换组织领先 |
| 默认透明 | default transparency | 对话全员可见换学习与安全 |

**本章小结**

- 代理对话默认 YC 全职员工全球可见 + Slack 广播
- 透明是安全与学习的杠杆；高度信任环境里隐私可控
- AI 原生 = 平等 + 信任 + 记录一切产物
- 自动学徒制：新人获明星上下文，不占合伙人时间

---

## 04 无马车与即时软件

**Gary：** 《Horseless Carriage》批评什么？现在还 relevant 吗？

**Pete：** 很多产品仍属这种情况——在现有软件里**插一点 AI**，Gmail 撰写器是典型例子。核心思想：**AI 潜力是把软件控制权给用户**。「AI 小功能」把 prompt 锁在开发者手里，是开发者中心论。对比：编码代理感觉像超能力——结论是 **代理封装软件**：AI 核心，确定性工具辅助，不是反过来。

**Gary：** 聊天界面够好吗？

**Pete：** 深度体验后会改主意。聊天最接近思维的语言路径，是通向清晰智能的**最短路径**；装进死板盒子限制太多。进入**即时软件**时代——需要某视图时代理现做。Gary 50 万行 Rails → GBrain **4 万行** Markdown+TS，「第二段要政治家传记」无需 redeploy；评估技能主编可改，不动代码。

**Gary：** Gary's List 50 万行 Rails → GBrain 4 万行——即时软件什么意思？

**Pete：** 我用过的最好 AI 软件往往非常小巧，只添加最少代码让模型发挥作用。OpenClaw 做得非常好——要一些能力赋予个性、持久记忆；不完美但对目前用例足够。Boris 每次来演讲都痴迷于简洁、把产品做得尽可能小。**PI** 是最小化 coding agent，用 PI 修改扩展 PI——自引用扩展软件；OpenClaw 在此基础上构建。未来很多商业软件都会自带这种能力：最小起点 + 代理随时间扩展。

**Jared：** 一月份 50 万行 Rails 博客 + 代理框架；过去三天 GBrain 4 万行——差在哪？

**Pete：** 我是以 2013 年方式构建软件的——Web 2.0 思维。GBrain 是 Gary's List 2.0，完全开源；代理检索、语音提取、事实核查都在里面。昨天交给团队作 OpenClaw 实例——他们进步飞速。之前庞大的作家聊天界面 bug 多，因为我重新实现了 OpenClaw 和 Telegram 已做好的事；现在直接用 OpenClaw + Telegram + 检索系统，运行非常好。下一次重写：50 万行 Rails 可轻松变成一万行 TypeScript + 两千行 Markdown——更具动态性。「第二段要政治家传记」不需要写 Ruby、不需要复杂 eval 基础设施；OpenClaw 知道怎么做，**评估技能**主编可改，我不动代码。这是**即时软件的黎明**。

**Gary：** 2034 会像 1984——只有几个「国王」拥有 AI？

**Pete：** 真正推动计算机革命的是人们开始拥有**可以自己实验**的个人电脑。60–70 年代你不能去商店买 iPhone 或 Mac，必须获得访问权限才能用价值数百万美元的东西，且被公司政策严格锁定——一小群「技术神职人员」控制生产资料。替代方案在「自制电脑俱乐部」、Jobs 和 Woz 在车库里焊接电路板——我们现在在「Apple I」时刻。ChatGPT 给十亿用户一点访问，但 MCP 被锁定；**OpenClaw/Hermes** 路线：运行自己软件、改自己提示、私有仓库、选模型——AI 的「白色药丸」。要么公司命令与控制，要么十亿人真正为自己编程。

> **金句 · Pete**
> **中文：** 无马车式 AI：在旧软件里插一点智能，却锁死上下文。
> **原文：** Horseless-carriage AI — bolting intelligence onto old software while locking away context.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理封装 | agent-enclosed | 模型 orchestrate，UI 按需 |
| 无马车 | horseless carriage | 把 AI 当马车上的马 |
| 个人 AI 时刻 | personal AI moment | 十亿人能为自己编程 |
| PI 自引用 | self-referential PI | 最小 agent 用自身扩展 |

**本章小结**

- 别做 Gmail 式 feature-flag AI；prompt 应用户可见、可改
- 代理封装软件：AI 核心，确定性 UI 按需生成
- 聊天 + 最小代码 = 即时软件；50 万行 Rails → 4 万行动态栈
- 个人 AI（OpenClaw/Hermes）vs 集中控制（Gmail 式）是路线选择

---

## 05 旧世界如何追赶

**Gary：** 成立超过两年的公司，第一步做什么？

**Pete：** **data warehouse 尽可能多内部上下文**；**内部工具注册表**——集中比 MCP 散连更高效。数据科学史 BigTable → 现在 gbrain/LLM wiki：**反规范化**成 agent 友好格式。多人 agent 超能力还没被很好解决；YC 在探组织 primitives。

**Gary：** gbrain：数据 everywhere → 反规范化 → 问一个问题，它解释问题背后是什么。

**Pete：** 路还很长，2026 年大多数人仍活在「敲数据科学门等排期」—— exciting 也 daunting。观看者将是构建这些东西的人——**最好做出明智选择**。

> **金句 · Pete**
> **中文：** 把所有上下文集中到一个地方，价值巨大。
> **原文：** Consolidating all context in one place has enormous value.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 反规范化 | denormalization for agents | 为检索优化而非 OLTP |
| 多人 agent | team-scale agents | 单人 OpenClaw ≠ 组织超智能 |
| gbrain / 共享大脑 | shared org brain | 反规范化 + 梦想周期 |
| legacy 起步 | legacy first steps | 统一上下文 + 工具注册表 |

**本章小结**

- legacy：统一上下文 + 工具注册表；CLI 常优于 MCP 散连
- 单人 OpenClaw 经验需升级成组织 MECE 技能体系
- 记录产物 = 组织大脑；梦想周期 nightly 改进
- 2026 仍大量「等数据科学排期」——窗口期在收窄

---

## 专栏硬核摘录

> 摘自 `column_article.md` 摘要/速览/Q&A，对话正文未展开的细节。

- 摆脱确定性工作流的效率陷阱 [05:12]
- 传统软件开发中，工程师根据业务需求构建确定性流程，效率极低。YC 转向让非技术团队（如财务）直接通过英语提示词驱动 AI 代理，将软件控制权从开发者转移到用户手中，极大缩短了反馈循环。
- 统一数据库是 AI 代理发挥威力的基石 [09:45]
- YC 的核心优势在于所有业务数据（创始人、投资、笔记）都存储在自有的 Postgres 数据库中。通过赋予代理只读 SQL 查询权限，员工可以随时询问复杂的业务问题，这种低门槛的上下文访问显著增加了组织内部的高质量决策频率。
- 建立内部工具与技能注册表实现能力复用 [15:30]
- YC 构建了包含 350 多个工具的内部注册表，涵盖从管理办公时间到记录财务分录的所有环节。通过“技能化”（Skillify）元技能，AI 能自动生成并优化工具调用逻辑，确保组织内部的 AI 能力是相互独立且完全穷尽的（MECE）。
- 组织超智能源于梦想周期的自我进化 [22:15]
- YC 运行着一个通用代理，每晚阅读所有员工的代理对话记录，寻找改进点并自动优化提示词。这种“自动学徒制”让 AI 能够吸收资深合伙人的直觉与经验，最终在特定任务（如撰写公司描述）上表现得比人类更出色。
- 默认透明与高度信任是 AI 组织的文化前提 [28:40]
- YC 规定所有代理对话默认对全员公开并同步至 Slack。这种透明度不仅解决了安全审计问题，更让员工能通过观察他人的 AI 使用方式快速学习。AI 原生组织必须是扁平且默认信任的，这与传统科层制组织背道而驰。
- 警惕无马车式的平庸 AI 产品设计 [35:50]
- Pete 批评将 AI 仅作为软件小功能的做法（如 Gmail 撰写器），认为这锁死了提示词上下文。真正的 AI 原生软件应是“即时软件”（Just-in-time Software），以聊天为界面，根据用户需求动态生成逻辑，而非预设死板的 UI。

## 总结

| 维度 | 要点 |
|------|------|
| 起点 | 财务英语 workflow；SQL 只读解锁 |
| 数据 | 自研 Postgres 全上下文 |
| 工具 | 350+ 注册表；Skillify + MECE |
| 进化 | 梦想周期；两句话 pitch 超人类 |
| 文化 | 默认透明；平等 + 信任 |
| 产品观 | 代理封装；即时软件；反无马车 |
| 启示 | 记录产物 = 组织大脑 |

---

## 附录

### 章节时间戳（视频简介）

| 时间 | 主题 |
|------|------|
| 05:12 | 摆脱确定性工作流陷阱 |
| 09:45 | 统一 Postgres · SQL 代理 |
| 15:30 | 350+ 工具注册表 · Skillify |
| 22:15 | 梦想周期 · 组织超智能 |
| 28:40 | 默认透明与信任文化 |
| 35:50 | 无马车 · 即时软件 |

### Ingest

- BV：`BV1467R6LEzm`
- ingest：`Recastory/workspace/bilibili-retranscribe/BV1467R6LEzm/ingest`
- 专栏：`.../ingest/column_article.md`

### 相关阅读

- [[Intercom首席-全员AI转型实践]] — 企业单平台 + 内部技能
- [[IBM团队-Harness工程详解]] — Harness 与企业对照
- [[Claude Code实战-Gstack把AI变成团队]] — 团队代理基础设施
- [[MOC - Harness Engineering]] — 横切
