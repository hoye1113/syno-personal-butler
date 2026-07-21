---
title: "Linear CEO：把 AI Agent 当一级员工"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "context_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "context_engineering"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV1sKDdBWETM/"
description: "Dan × Karri Saarinen：拒绝跟风聊天框、零 Bug 政策与编码 Agent 初审、慢决策快执行、组织上下文护城河、多人共享 Agent 沙盒——产品构建仍是手艺。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Linear CEO-把AI Agent当一级员工.md"
source_sha256: "02d1fe5263aa512852883359a1df5cc77bbc30cbd62006d099492daa1914521f"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1sKDdBWETM/"
column_url: "https://www.bilibili.com/read/cv47749875/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1sKDdBWETM/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1sKDdBWETM/ingest"
duration: "52:49"
saved: 2026-07-06
updated: 2026-07-06
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Dan"
guest_name: "Karri Saarinen"
guest_title: "Linear 联合创始人兼 CEO · 设计背景"
speaker_inference: "column_article S-tier; 专栏导读误写 Karpathy，正文为 Karri Saarinen"
speaker_confidence: high
author:
  - "[[Karri Saarinen]]"
concepts:
  - id: zero_bug_policy
    zh: 零 Bug 政策
    en: zero-bug policy
    one_line: 一周内修复；编码 Agent 初审，工程师 Linear 内终审
  - id: slow_think_fast_ship
    zh: 慢思考快执行
    en: slow to decide, fast to execute
    one_line: 找问题要慢，承诺后循环要极快
  - id: org_context_moat
    zh: 组织上下文护城河
    en: organizational context moat
    one_line: Issue/决策/文档已在 Linear，Agent 不必每次手动灌上下文
  - id: shared_agent_sandbox
    zh: 共享 Agent 沙盒
    en: shared agent sandbox
    one_line: PM/设计/工程同窗看编码 Agent 与预览
---

# Linear CEO：把 AI Agent 当一级员工

**Host：** Dan（AI and I 主持）  
**Guest：** Karri Saarinen（Linear 联合创始人兼 CEO）  
**形态：** Host-Guest canonical v3.2（**专栏主源**）  
**B 站：** [BV1sKDdBWETM](https://www.bilibili.com/video/BV1sKDdBWETM/) · **专栏** [cv47749875](https://www.bilibili.com/read/cv47749875/) · **时长** 52:49

---

## 开场

Linear 以工艺和耐心著称：2020 年神秘难申请，却是很多团队愿意等的 issue 工具。GPT-3 时代它没急着贴聊天框；现在 OpenAI Symphony 挂 Linear，Coinbase/Ramp 自建编码 Agent 也接进来。Karri 讲：**AI 不是多一个聊天入口，而是带组织上下文的数字成员**——零 Bug、慢决策快执行、共享 Agent 会话。

六章：**拒绝盲目集成** → **零 Bug 与编码 Agent** → **慢思考快执行** → **上下文护城河** → **共享 Agent 沙盒演示** → **产品构建仍是手艺**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 组织上下文 | organizational context | 项目记忆、客户请求、决策历史 |
| 零 Bug 政策 | zero-bug policy | 所有 Bug 进专门团队，一周内修 |
| 技能 | skills | 注入博客/文档，让 Agent「按 Linear 方式」思考 |
| 产品记忆 | product memory | 现状与未来状态的多人协作上下文 |
| 表面积 | product surface area | 自建编码 Agent 增加的功能面 |

---

## 01 拒绝盲目集成：先理解工作流

**Dan：** GPT-3 刚出来时 Linear 上什么都没有。从「封闭耐心做最好 issue 工具」到「代理原生」，情感上是什么体验？

**Karri Saarinen：** 使命没变——帮公司推进工作、构建软件，AI 甚至让使命更好：承担更多「管产品团队负担」，让人专注构建和技艺。但我个人习惯先**理解**再动手。科技圈常跳过这步，直接「我能做所以现在做」。早期每家公司抢聊天机器人，我们也试了，发现**没那么有用**——到底在什么流程里需要它？

我们花两年理解工作流：人们到底想怎么用。同时发布了**代理平台**——文档完善，Agent 可读文档自建集成；市面上多数编码 Agent 已接 Linear，OpenAI Codex 云也是因为这个平台。

我不认为未来只有一个 Agent——每人多个，每公司也会建自己的。Coinbase、Ramp 建内部编码 Agent 接 Linear；Linear 是**指导 Agent、构建上下文**的系统，不试图占满整个市场，也与其他公司合作。

聊天界面现在才加进 Linear，基于已有工具、技能和对用户需求的理解——比如综合客户请求：Linear 本就是收客户问题和请求的地方，Agent 原生处理并发现模式。AI 承担更多构建执行后，真正的问题是：**一百万个 Agent 该做什么？** 不加思考的活不一定有用。Linear 建立意图和上下文，再引导 Agent 去构建。

> **金句 · Karri Saarinen**
> **中文：** 先理解工作流里什么真正有价值，别因为别人都在做聊天机器人就跟风。
> **原文：** How do we understand the workflows and what's actually valuable — rather than jumping in because everyone else is doing it.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理平台 | agent platform | 开放 API/文档，外部 Agent 可读可集成 |
| 组织清晰度 | organizational clarity | 从海量请求里提炼模式，而非多一个聊天框 |
| 意图建立 | intent establishment | 决定什么值得做，再交给 Agent 执行 |

**本章小结**

- 2020–2022 试聊天机器人后收手，先理解流程再 ship
- Linear = 上下文 + 意图，不是「又一家 AI 公司」
- 每人多 Agent、公司自建 Agent 是默认未来

---

## 02 零 Bug 政策：Agent 抬高质量标准

**Dan：** 「SaaS 已死」的叙事里，上市公司 CEO 压力巨大。你们怎么扛「必须上个 Agent 平台」？

**Karri Saarinen：** 投资者没逼我们——选对投资者的好处。内部压力肯定有。市场每周变，噪音很多：这周推崇某种 loop，几周后又说 loop 是坏主意。当信号读，但要知道很多**没在大型组织里测过**。

SaaS 方向可能对：未来现金流不确定性更高。但「人人自己写 CRM」过于简化——会有新公司，上市公司护城河在消失。我们要回到**第一天心态**，问 Agent 进产品开发会产生什么新问题。

团队约 **120 人**，产品侧约 **60 人**。工程师、部分设计/产品都在用编码 Agent。我不追「代码百分之多少是 Agent 写的」——那是虚荣指标，衡量产出不衡量价值。大模型公司激励你**多烧 token**，但构建产品从来不是靠多烧 token 变好；活动有时也是负资产。

该追什么？利润、收入、用户喜爱度——滞后但正确。也可以看各团队 token 用量作信号：我们在动吗？产品真的变好了吗？新功能有正面反馈吗？**Bug 变少了吗？** 有诚实 Bug 流程就能追踪。有了 Agent，产品里为什么还有 Bug？没借口了。

内部**零 Bug 政策**：专门 Linear 团队分类，任何 Bug 提交进去，**一周内修复**。编码 Agent 先处理、修完通知工程师；工程师在 Linear 内审查代码，不喜欢再改。这始于「我们关心质量」的选择——你是要产出质量，还是只要更多产出？

> **金句 · Karri Saarinen**
> **中文：** 有了代理和 AI，产品里为什么还有 Bug？再也没有借口了。
> **原文：** With agents and AI, why would there still be bugs in the product? There's no excuse anymore.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 虚荣指标 | vanity metrics | Agent 写码比例、PR 数量 ≠ 价值 |
| 零 Bug SLA | one-week bug SLA | 所有 Bug 七天内必须处理 |
| 质量选择 | quality as choice | 标准是先于工具的文化决策 |

**本章小结**

- 不追 token/Agent 代码占比；追 Bug 数、喜爱度、收入
- 零 Bug + Agent 初审 = 「无 Bug 软件」成本上可行
- 上市公司需「第一天心态」，别被旧产品形态绑死

---

## 03 慢思考快执行：别加速「发现问题」

**Dan：** 这些工具怎么改你们的产品构建流程？有没有反直觉的结果？

**Karri Saarinen：** 产品侧体验明显变好。我有 Linear Analytics **技能**——灌内部文档和「Linear 方式」博客，综合功能请求。比如「每个 issue 多个经办人」，数百人请求；AI 先解释**人们为什么要的不同原因**，帮我决定现在做还是永远不做。开始构建之前，极快建立认知，不用到处问人。

设计侧我个人仍爱 **Figma 手动画**——探索性问题，速度帮不上忙；手画迫使你问「为什么这样画」。设计团队更多做**可运行原型**：建 PR、跑构建、出预览链接，在产品里体验。但我仍说：大项目先在 Figma 自由探索，别直接跳进去做。

工程侧：一旦决定做，处理更快。Slack 代理讨论 → 「根据这次对话建 issue」→ 立刻执行。门槛极低，不必等下周开会立项——模式本质是**缩短循环**，但不是缩短「该不该做」的循环。

**Dan：** 有人说不该做得更快，该慢一点——你怎么看？

**Karri Saarinen：** 我同意：**不要在决策上求快**。现在有人产生想法就直接做出来，大家看一个不知为何存在的功能。每个原型看起来都有用，却缺机制衡量「跟别的想法比值不值得、现在该不该投入」。危险在于缺决策机制。

Linear 流程不复杂，但非常明确「想要致力于此」。**一旦承诺某修复/项目，我希望循环极快、真正解决问题；但不想让「发现问题」变快。** 花时间找正确问题和正确解法，决定后再加速。

「思考」可以包括构建——不是为了第二天发布，而是为了理解；输出可以是内部认知：我们对问题理解更好了，再变成可发布的东西。每个阶段目标要明确：进测试版是为了理解工作流和用户怎么用，不是尽快发布。

> **金句 · Karri Saarinen**
> **中文：** 一旦我们致力于某件事，希望循环极快；但不想让「发现问题」的过程变快。
> **原文：** Once we're committed, I want the loop to be fast — but I don't want finding the problem to be fast.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 功能综合 | feature synthesis | 从数百条请求提炼不同诉求原因 |
| 概念车 | concept car | 探索性输出，不必投产，影响方向 |
| 阶段目标 | stage goals | 测试版 = 理解用法，不是赶发布 |

**本章小结**

- AI 加速「理解请求」和「承诺后执行」，不加速「值不值得做」
- Karri 设计仍手动画；团队用预览原型验证
- 思考可含构建，但输出可以是认知而非 ship

---

## 04 上下文护城河：Linear Agent 与产品策略

**Dan：** AI 怎么改产品策略？该做集成还是内置 Agent？

**Karri Saarinen：** 我们在加 **Linear Agent**——带工作上下文、组织背景、产品上下文，PM/设计各用各的方式；还有**编码 Agent**，云端协作，可见变化并引导。策略变化：历史上 issue tracking 像厨房出票——订单来了做鱼；我们从来把 Linear 当**骨干**，收信号、问题、决策。有 Agent 后「票务系统」感会淡，但**收集上下文、让工作可操作、给 Agent 好环境**仍然关键。

我们学到一个教训：Agent 不在我们控制内时很难做好。所以自研编码 Agent——更流畅的端到端：在 Linear 问「这东西存在吗？」→ 建 issue → 写代码 → 看 diff → 审查合并/看原型。用 Claude/ChatGPT 时我得明确告诉它带什么上下文；Linear 里上下文**本来就在**，巧妙注入更自然，也不滥用 context window。

Linear 是产品现状与未来状态的**多人游戏/组织上下文**。你可能仍跑本地 Agent，但小任务、错误修复可在 Linear 后台沙盒自动化，你在电脑上干别的。

**Dan：** 听起来你要为 token 付费了——商业模式怎么想？

**Karri Saarinen：** 编码 Agent 必须**按量计费**，可能很贵。基础 Linear Agent（回答问题）更多包在系统里，得看实际用量。Linear 仍是专注平台——不该在这里跑随机任务；做什么、跑什么流要清晰。不是通用 Agent 平台，是**产品上下文/产品记忆**平台——「产品思维的 API」，普通工具不懂你的日常习惯和已有背景。

> **金句 · Karri Saarinen**
> **中文：** 上下文本来就在 Linear 里——不必每次像用通用聊天工具那样手动灌。
> **原文：** The value of Linear is the context already exists there — we inject it naturally into the workflow.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 产品思维 API | product-thinking API | 围绕产品工作流而非通用任务 |
| 上游杠杆 | upstream leverage | 从工作请求/错误报告来源处自动化 |
| 按量计费 | usage-based billing | 编码 Agent token 成本需单独定价 |

**本章小结**

- 自研 Agent 因「端到端 + 上下文已在库」比纯集成更顺
- 不做大杂烩；聚焦「请求进来 → Agent 修 → 人审」
- SaaS 粘性在界面与记忆，编码 Agent 引入 token 成本需单独算

---

## 05 共享 Agent 沙盒：多人同窗看编码

**Dan：** 能演示一下吗？

**Karri Saarinen：** 这是我真实的 Linear。新标签页有经典「你想做什么」框；在项目上下文里也能工作。**技能**分组织指导和个人指导——比如「多重指派」技能，我从博客灌材料，格式从潜在需求开始，像 Linear PM 同事一样综合。

问底层模型？目前用 **Claude**（Sonnet/Opus 视任务）。它会跑起来：确实有需求，但比听起来复杂——公司要多个工作区的原因不同，它解释缺什么、利弊、产品方向建议。

更微观的例子：**新深色主题**，纯黑版。当作编码 Agent：查代码库 → 变 issue → 委托给 Linear → 启动沙盒。**团队知道我在做**——Anand 可以进来看。代理会话**对所有人可见**，共享上下文来自我或客户讨论。

两个人可以在同一聊天里；PM Anand 和设计负责人 Connor 在收件箱调整，来回「不对，修这个」，一起看预览链接。有 PR、diff、活动流；觉得不对直接让 Agent 修，不必转述给另一个工程师。面向客户端的改动能开预览链接看实时环境——大大缩短协作循环，**多人共用 Agent 处理一件事**。

> **金句 · Karri Saarinen**
> **中文：** 代理会话对全队可见——像多人游戏，而不是工程师黑盒里写代码。
> **原文：** The agent session is visible to everyone — it's happening in a shared environment with more context.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 委托 Agent | delegate to agent | Issue 指派给 Linear 编码 Agent 沙盒 |
| 共享预览 | shared preview link | 设计/PM 不看 mock，看部署原型 |
| 技能注入 | skill injection | 博客/文档 → 组织级 Agent 行为 |

**本章小结**

- 新 UI：方框入口 + 项目内上下文 + 组织/个人技能
- 编码 Agent 会话公开：PM/设计/工程同窗改需求、看 diff/预览
- 缩短「说不对 → 别人修」的传话链

---

## 06 表面积、聚焦与未来五年

**Dan：** 这大大增加了产品表面积——很多别处已有的东西要重做，权衡是什么？

**Karri Saarinen：** 我们不断问：**我们的独特优势在哪？** 不会解决所有编码需求，也不必。价值在**工作来源的上游**——请求和错误报告进来，自动生成、委托 Agent，工程师见到时修复已在路上。不是「嘿给我做一个全新产品」，而是大公司大量请求/错误如何自动简化。其他编码 Agent 做别的类型工作。

我们不想成大杂烩——企业清单打勾造不出好体验。产品方式一直是感受工作流**自然的下一步**：从 issue 到「谁来解决」→ 云 Agent 修 → 你怎么知道好不好 → 看代码、diff、跑构建。专注改进流程，不占领每个表面。

**Dan：** 预测未来五年产品开发会怎样？

**Karri Saarinen：** 更多**自动驾驶**环节——项目记忆、规则指导，进行中的项目收反馈，Agent 识模式、建版本、发给客户、收反馈，部分自动跑。但人仍要思考：更明确表达意图、什么值得做、哪些领域做。读文档、理解策略，仍要人参与——**不能把思考纯粹外包给 AI**。策略越清晰，对团队和 Agent 越好，可编纂成自主运行的规则。

我不认为 AI 取代人类；工程角色会变，但**产品构建仍是手艺/艺术**。我们靠直觉和对问题的理解决策；数据是信号，不是唯一依据。不信纯 A/B、纯数据驱动的一切产品——最好产品不总这么建。仍要人类触觉：什么有趣、什么更好。

> **金句 · Karri Saarinen（封底）**
> **中文：** 产品构建仍是手艺——直觉和品味没法被 A/B 测试整包取代。
> **原文：** Product building is still a craft or art — intuition and taste can't be replaced by A/B testing alone.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自动驾驶环节 | autopilot workflows | 项目记忆 + 规则下 Agent 部分自跑 |
| 策略编纂 | strategy codification | 人类澄清意图 → 写成 Agent 可执行规则 |
| 第一天心态 | day-one mindset | 不依赖旧护城河，按未来产品重想 |

**本章小结**

- 自建 Agent 聚焦上游 issue→修复，不跟通用编码工具全面竞争
- 五年后更多 autopilot，但思考/策略/品味仍在人
- 表面积增大是为主流程服务，不为 checklist 扩功能

---

## 总结

| 维度 | 要点 |
|------|------|
| 转型 | 两年理解工作流；代理平台先行，聊天后加 |
| 质量 | **零 Bug 一周 SLA**；Agent 初审，人终审 |
| 节奏 | **慢决策、快执行**；测试版目标是学用法 |
| 护城河 | **组织上下文**已在 Linear；技能灌「Linear 方式」 |
| 协作 | **共享 Agent 沙盒**；PM/设计/工程同窗 |
| 未来 | 更多 autopilot；**产品构建仍是手艺** |

---

## 概念索引

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| zero_bug_policy | 零 Bug 政策 | zero-bug policy | 一周修复 + Agent 初审 |
| slow_think_fast_ship | 慢思考快执行 | slow decide, fast ship | 找问题慢，承诺后快 |
| org_context_moat | 组织上下文护城河 | org context moat | 上下文已在库，不必手灌 |
| shared_agent_sandbox | 共享 Agent 沙盒 | shared agent sandbox | 全队可见 Agent 编码会话 |

---

## 附录

### 章节时间戳

| 章 | 主题 | 时间 |
|----|------|------|
| 01 | 拒绝盲目集成 | ~05:12 |
| 02 | 零 Bug 政策 | ~14:45 |
| 03 | 慢思考快执行 | ~20:30 |
| 04 | 上下文护城河 | ~32:15 |
| 05 | Linear Agent 演示 | ~38:50 |
| 06 | 未来与手艺 | ~48:20 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1sKDdBWETM/ingest`
- **专栏主源**：`Recastory/workspace/bilibili-retranscribe/BV1sKDdBWETM/ingest/column_article.md`
- **B 站**：[BV1sKDdBWETM](https://www.bilibili.com/video/BV1sKDdBWETM/) · **专栏** [cv47749875](https://www.bilibili.com/read/cv47749875/)
- **时长**：52:49

### 相关阅读

- [[Alchemy CPO-从代码审查到自动代理]] — Linear + Codex 个人工作流  
- [[OpenClaw创始人-我是如何使用OpenClaw的]] — IM × 上下文 assistant 对比  
- [[Claude Code负责人-AI原生团队如何使用AI]] — 团队侧编码 Agent 实践  
- [[WorkOS-创建和使用Skills方法论]] — Slack→Linear 技能化  
- [[MOC - Agent Theory and Design]] — Agent 实践横切索引  

### 收录说明

- **嘉宾**：Karri Saarinen（Linear 联创兼 CEO）；专栏导读误写 Karpathy，以正文为准  
- **版本**：canonical Host-Guest v3.2（2026-07-06；专栏主源 S 级）
