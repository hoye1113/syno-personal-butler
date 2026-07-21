---
title: "Replit CEO：建设者与布道者两种人"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "skills"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "skills"]
created: "2026-07-08"
source: "B站视频 - Easonlee的AI笔记"
description: "Amjad Massad：活代码抽象配置；领域专家 > 职业开发者；企业从买 SaaS 到自建；Agent 4 并行/画布异步心流；后提示时代；未来公司只剩建设者与布道者。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Replit CEO-建设者与布道者两种人.md"
source_sha256: "612ee5e3c4909d5e2939ec718b2138e5c34e495524c4c9396145351609f06b5c"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV17p9yB9Ef3/"
column_url: "https://www.bilibili.com/read/cv48296505/"
host_name: "Andrew Miklas"
guest_name: "Amjad Masad"
guest_title: "Replit 联合创始人兼 CEO"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV17p9yB9Ef3/ingest"
speaker: "Amjad Masad"
duration: "~39:00"
saved: 2026-07-08
updated: 2026-07-08
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV17p9yB9Ef3/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV17p9yB9Ef3/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical (interview)
speaker_inference: "column interview"
speaker_confidence: high
author:
  - "[[Amjad Masad]]"
concepts:
  - id: living_code
    zh: 活代码
    en: living code
    one_line: 自然语言+画布，代理写可扩展真软件
  - id: domain_expert_builder
    zh: 领域专家构建
    en: domain expert builder
    one_line: 最接近痛点的人亲手做产品
  - id: saas_to_build
    zh: 从买 SaaS 到自建
    en: SaaS to self-build
    one_line: RevOps 用 MCP 做 CPQ，破数据孤岛
  - id: agent4_async
    zh: Agent 4 异步心流
    en: Agent 4 async flow
    one_line: 并行代理+画布，后台构建前台设计
  - id: post_prompt_era
    zh: 后提示时代
    en: post-prompt era
    one_line: 高层目标指令，非逐句 prompt
  - id: builders_evangelists
    zh: 建设者与布道者
    en: builders and evangelists
    one_line: 商业通才授权代理 + 销售做教育转型
  - id: champion_plg
    zh: 内部冠军 PLG
    en: internal champion PLG
    one_line: 周末个人项目带来工作倡导者
  - id: generative_mindset
    zh: 生成性思维
    en: generative mindset
    one_line: 今天不行下周再试，保持创意生成
---

# Replit CEO：建设者与布道者两种人

**Host：** Andrew Miklas  
**Guest：** Amjad Masad（Replit 联合创始人兼 CEO）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 访谈）  
**B 站：** [BV17p9yB9Ef3](https://www.bilibili.com/video/BV17p9yB9Ef3/) · **时长** ~39 min

---

## 开场

Replit D 轮 4 亿美元、估值 90 亿。Amjad 十年目标：**会读写的人带着想法进来，出去是已部署、可扩展、有流量的真应用**——2024 年 9 月成首个「活代码」产品，Agent 4 再加画布与并行代理。核心判断：未来公司只剩**建设者**和**布道者（销售/教育者）**两类人。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 活代码 | living code | 用户不见代码，代理在幕后写 |
| 领域专家 | domain expert | 物理治疗师、泳池维护商等 |
| 后提示 | post-prompt | 「帮我建 SaaS 并营销」级目标 |
| 冠军用户 | champion | 组织内兴奋传播 Replit 的通才 |
| MCP/Skills | agent skills | 代理下载 Stripe 等技能即用 |

---

## 01 活代码：从配置痛苦到创意表达

**Andrew：** Replit 是什么？和工程师向的 IDE 有何不同？

**Amjad：** 任何人，只要能读会写，带着想法进来，出去是**已部署、已托管、有流量、可扩展**的应用——不用碰技术细节。我们先解 dev env，再解 deploy，最后解编码；2024 年 9 月**完全抽象代码**，幕后是编码 agent，自然语言 + 画布拖放，未来多模态。要的是**真实、安全、可扩展**，不是玩具。

**Andrew：** 为何不完全面向工程师？

**Amjad：** 我从小更关心**创造**而非工具本身。Basic 时代很愉悦，大学毕业配 Web 栈像噩梦——Replit 先解环境，再解部署，最后解编码。很多开发者**享受配置痛苦**（像工匠自制工具），但最大价值往往在**离业务更近的人**——写过代码的 PM、被工程排期挡住的设计师、有热情被技术挡住的企业家。2023 起明确：**为创作者建工具**，AI 原生开发者不需要懂每个底层组件。

**Andrew：** VB6 那种简单感？

**Amjad：** VB6 比 React+Webpack 好 100 倍——编程变得更复杂了， uncommon in tech evolution。我要把编程带回**简单且伟大**。

**Andrew：** 人们在 Replit 上做什么？

**Amjad：** 三类——个人软件、企业产品、创业者垂直 SaaS。物理治疗师自建 3D 运动范围追踪（外包 tens of 万仍沮丧）；泳池维护、体育俱乐部、MS-DOS 级遗留系统替换。**领域专家**做他们真正需要的东西。个人侧：罕见病管理、家务排名 iPad 墙。

**Amjad（续）：** 硅谷常觉得没什么可建——但生活里大量领域被视而不见。任何人能做软件时，经济许多部分都会改善，财富和生产力会上来。韩国妈妈为孩子罕见病做管理软件；可穿戴数据提取处理；家务英雄 iPad 墙排名——都是个人软件的真实形态。

**Andrew：** 企业侧呢？

**Amjad：** **产品加速**（Whoop 可试想法 5→50）；**内部工具**（RevOps 在 CRM/Gong 交汇点自建 CPQ，省数十万 SaaS + 破孤岛）。每加一个 SaaS 就多一个**数据孤岛**，无法编程——现在自己动手。

> **金句 · Amjad**
> **中文：** 最接近问题的人，才能构建他们真正需要的产品。
> **原文：** The people closest to the problem can build what they actually need.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 活代码 | living code | 抽象代码，保留生产级质量 |
| 创作者工具 | creator tools | 非传统 IDE 心智 |
| AI 原生开发者 | AI-native developer | 不碰底层也能出货 |
| 神经学转变 | neurological shift | 看见代码能解决问题后世界观变 |

**本章小结**

- Replit 桥接 dev/non-dev；价值在业务侧创作者
- 十年路线：环境 → 部署 → 编码抽象（活代码）
- 领域专家垂直 SaaS + 企业 CPQ/自动化是两类高价值场景

---

## 02 企业：从买 SaaS 到自建，PLG 冠军

**Andrew：** 怎么找到用户、怎么卖？

**Amjad：** 世界变了——PM/设计/运营也被授权引入软件。**PLG 仍是黄金标准**；销售很多是 **sales-assisted**：周末个人项目 → 上班带来 → 我们帮说服老板、办黑客马拉松、做 AI 教育。自上而下企业销售也有，Replit 在**安全/合规**上有十年信任。

**Andrew：** 构建边界在哪？什么还要传统工程？

**Amjad：** 企业家可轻松做 SaaS/消费/自动化；全新云平台或 ML 系统不是今天重点。有技术知识可用 VM + 通用 agent 做复杂系统；纯活代码路径上，案例已够多——甚至有 **Replit 原生机构**，比传统机构便宜 60–70%。集成靠 MCP/Skills：说「集成 Stripe」，agent 像 Neo 下载「开直升机」。

**Andrew：** 社区和非开发者 DevRel 有何不同？

**Amjad：** 要**展示可能性**——传统开发者读 HN、读文档；对 Replit 要做大量**教育**：文档更简单、视频更多、agent 本身要会头脑风暴。企业侧：先别评判、别急着付费——召集最 excited 的团队，**办黑客马拉松**。

**Andrew：** 「冠军」长什么样？

**Amjad：** 不一定科班——**创业心态**，主动学集成、不被 block；会在组织内**构建、教育、传播**。像 PG 写的那种：有资源、会找出该集成什么 AI 工具的人。

**Andrew：** YC 怎么影响 Replit？

**Amjad：** 三个月能完成多少——Demo Day 倒计时白板；进 YC 时只有 CLI，出来已有 Web IDE、托管、智能感知。现在发 Agent 是**四周 sprint**，24 小时餐饮。复合增长 7%/周——PG 的数字对新产品线仍好用。

> **金句 · Amjad**
> **中文：** 一旦明白可以用代码解决问题，你的世界观就变了——这种转变正在大规模发生。
> **原文：** Once you realize you can solve things with code, it's almost a neurological shift in how you see the world.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 数据孤岛 | SaaS silos | 每加一个 SaaS 多一个岛 |
| 销售辅助 | sales-assisted PLG | 教育+黑客马拉松，非纯 top-down |
| Skills 革命 | skills revolution | 公司出 MCP，审查后集成 |
| 教育型 DevRel | educator DevRel | 非传统开发者需要展示可能 |

**本章小结**

- 企业从买工具转向自建；PLG + 内部冠军 + 合规底座
- 黑客马拉松 + sales-assisted：帮 champion 说服组织
- MCP/Skills 让 agent 即下即用；文档和视频比传统 DevTool 更重要

---

## 03 Agent 4：并行、画布与后提示时代

**Andrew：** Agent 4 是什么？

**Amjad：** 我们赌 AI **每年两次大跃迁**——2024 中 Claude 大量代码；2024 末长程推理；2025 vibe coding → 自主代理。每 ~6 个月一版 Agent；Agent 3 最自主（2–4 小时后台容器）；**Agent 4**：**并行代理**、**异步设计画布**、**团队协作**（每人 VM + 可见光标）。

**Amjad（续）：** Agent 3 时我们重写后端，让长时间容器在用户离开时后台跑——自主性 11、12 月才真正爆发，但 9 月 Agent 4 已展示方向。并行要解决合并冲突；画布让你在 agent 构建时探索下一页 UI，好了再扔进新线程。团队协作：每人新 VM，协调器拆分任务，画布上看别人光标——产品变「活」了。

**Andrew：** 并行解决什么问题？

**Amjad：** 自主性令人讨厌之处：输入大 prompt 只能坐着看。你应该能**设计下一页**、开别的线程、跟 agent 聊计划——所以我们做多 agent + 合并冲突处理。画布让你在 agent 构建时探索 UI；准备好了再扔进另一个线程。

**Andrew：** 移动/Web 一体？

**Amjad：** 在 Replit 建 Web 应用，说「做移动应用」——部署时 Web + TestFlight/Android 同发。**在 Replit 上运营整个公司**。

**Andrew：** 用户该练 prompt 吗？

**Amjad：** 走向**后提示时代**——OpenClaw 式高层目标：「优化营销漏斗」。Agent 5 可能：**「给我建 SaaS、营销、看啥有效、带收入回来」**。关键技能：**知道什么是可能的**（多玩、保持连接、今天不行下周再试）、**创意生成**（Peter Levels 式持续出产品）。

**Amjad（续）：** 过去刷新闻像分心，现在了解正在发生什么很重要。告诉用户：今天做不了，几周后再试——AI 每几个月跃迁一次。**保持生成性**：产品会过时，要像 Peter Levels 持续出新产品；在 Replit 上这样赚几百万完全可能。

**Andrew：** 还在等什么技术？

**Amjad：** **Computer use** 仍慢于预期——语言比视频好压缩；编码成了变通路径（Excel 代理因编码变好）。真正 **in-context 在职学习**仍远——现在靠写 skill.md，不是组织内持续进化。

> **金句 · Amjad**
> **中文：** 后提示时代：给代理高层目标，而非逐句打磨提示词。
> **原文：** We're moving to a post-prompt era — give your agent high-level goals, not line-by-line prompts.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 并行代理 | parallel agents | 后台跑，前台做别的事 |
| 画布 | canvas | 可视化探索，非纯文本 |
| 后提示 | post-prompt era | 目标级指令 |
| 心流 | flow state | 代理慢没关系，异步即可 |

**本章小结**

- Agent 4 = 并行 + 画布 + 团队协作 + 一键移动部署
- 技能从 prompt 转向可能性感知 + 生成性 + 不放弃重试
- Computer use 未成熟；编码/agent 是当下的变通路径

---

## 04 未来公司：建设者、布道者、Vibe 驻场队

**Andrew：** 若代理能「建一家赚钱的公司」，人类还剩什么？

**Amjad：** **建设者 + 销售/布道者**。销售变**帮企业转型**——人仍想跟人学、信任人；销售最难被 AI 取代。建设者 = **商业通才**：懂客户、经济、AI、愿景；早上想怎么让公司更成功，找问题、**授权代理**解决。

**Andrew：** Replit 内部怎么示范？

**Amjad：** **Vibe Coding 驻场队**：任务模糊，深入支持队做 Zendesk 优先级可视化 → 再去 HR 做 onboarding 平台——**通才企业家**让公司更好。

**Andrew：** 重来会改什么？

**Amjad：** 少犯错；更早诚实看 PMF——有用户≠PMF，要**爆炸式增长**才算；文化曾搞砸需 reset。PMF 诚实 + 文化第一。

**Andrew：** 完整愿景？

**Amjad：** 工作持续变高级——计算机字面是「人力替代」；现在有 agent 操作计算机，抽象再升一层。未来公司几乎人人都是创始人：找问题、授权 agent；职能部门收缩，剩洞察+授权 vs 信任+教育。

> **金句 · Amjad**
> **中文：** 未来公司只有建设者和布道者——通才授权代理，销售教人转型。
> **原文：** The company of the future is builders and evangelists — generalists who delegate to agents, and sales who help organizations transform.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 建设者 | builder generalist | 授权代理的商业通才 |
| 布道者 | evangelist sales | 教育、信任、转型 |
| Vibe 驻场 | vibe coding embed | 跨团队模糊任务改进 |
| PMF 诚实 | honest PMF | 有收入 ≠ 产品市场契合 |

**本章小结**

- 职能部门收缩；剩建设者（授权 agent）+ 布道者（信任/教育）
- 驻场队示范通才 + agent 改内部工具
- 文化、PMF 诚实、等 computer use 是 Amjad 的三条教训

---

## 专栏硬核摘录

> 摘自 `column_article.md` 摘要/速览/Q&A，对话正文未展开的细节。

- 软件开发正从配置痛苦转向创意表达 [01:45]
- 传统开发环境配置极其繁琐，甚至让资深工程师也感到沮丧。Replit 的目标是实现“活代码”（Living Code），通过自然语言和画布交互完全抽象掉底层代码，让任何有想法的人都能直接生成可扩展的真实应用，而非玩具软件。
- 领域专家比程序员更懂如何定义好产品 [07:12]
- 最能发挥 AI 编程价值的不是职业开发者，而是物理治疗师、泳池维护商等领域专家。他们最接近真实痛点，当技术不再是瓶颈，这些“非技术”创始人能构建出比外包团队更精准、更具商业价值的垂直领域 SaaS。
- 企业内部正经历从 SaaS 购买到自主构建的转型 [13:40]
- 过去企业通过购买 SaaS 解决问题，却造成了数据孤岛。现在，产品经理和运营人员开始利用 AI 代理自行构建内部工具（如报价配置器、自动化流），这不仅节省了巨额软件费用，更让公司尝试新想法的频率提升了一个数量级。
- Agent 4 开启了并行代理与异步设计的新心流 [22:15]
- AI 代理的自主性意味着用户可以输入高层指令后“离场”。Agent 4 引入了多代理架构和画布功能，允许用户在代理后台构建代码的同时进行前端设计。这种异步协作模式让开发者进入一种无需等待、持续产出的“心流状态”。
- 提示词工程只是过渡，未来属于后提示时代 [28:30]
- 技能的重心正在从精准编写提示词转向定义高层次目标。未来用户只需下达“帮我建立并营销一家公司”的指令。在这种环境下，保持“生成性”思维、不断尝试 AI 的边界并具备敏锐的创意生成能力，将是核心竞争力。
- 未来公司将由建设者和销售布道者组成 [35:50]
- 当 AI 承担了所有执行层面的计算和编码，公司将不再需要庞大的职能部门。剩下的只有两类人：负责洞察需求、授权代理解决问题的“商业通才”（建设者），以及负责建立信任、推动组织转型的“教育者”（销售）。

## 总结

| 维度 | 要点 |
|------|------|
| 产品 | 活代码；自然语言+画布；真软件非玩具 |
| 用户 | 领域专家 > 纯开发者；创作者 PLG |
| 企业 | 自建破 SaaS 孤岛；安全合规 |
| Agent 4 | 并行+画布+异步心流 |
| 技能 | 后提示；可能性感知；生成性 |
| 组织 | 建设者 + 布道者 |

---

## 附录

### 章节时间戳（视频简介）

| 时间 | 主题 |
|------|------|
| 01:45 | 活代码与配置抽象 |
| 07:12 | 领域专家构建 |
| 13:40 | 企业自建 vs SaaS |
| 22:15 | Agent 4 并行与画布 |
| 28:30 | 后提示时代 |
| 35:50 | 建设者与布道者 |

### Ingest

- BV：`BV17p9yB9Ef3`
- ingest：`Recastory/workspace/bilibili-retranscribe/BV17p9yB9Ef3/ingest`
- 专栏：`.../ingest/column_article.md`

### 相关阅读

- [[OpenAI团队-FDE工程师的未来]] — 通才嵌入客户
- [[给每位员工配备AI智能体]] — 组织内代理化
- [[Intercom首席-全员AI转型实践]] — 企业 AI 采纳
- [[MOC - Harness Engineering]] — 代理环境工程
- [[MOC - Agent Theory and Design]] — 入口
