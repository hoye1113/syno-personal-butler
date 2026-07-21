---
title: "OpenAI播客：用 Codex 处理日常工作"
tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "ai_coding"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "ai_coding"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV1UqGd6BEzj/"
description: "OpenAI Codex 负责人 Thibault × Chris：从编码工具到知识工作代理、组织瓶颈转移、家常定制软件、/goal 长程目标、信任沙盒与 Referee Agent。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI播客-用Codex处理日常工作.md"
source_sha256: "19c96de9e1e2b876a826a838d9a50836a320b67da5c459a7f8dd3a4598392c63"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1UqGd6BEzj/"
column_url: "https://www.bilibili.com/read/cv49625007/"
source_original_date: "2026-05-15"
host_name: "Chris Nicholson"
guest_name: "Thibault Sottiaux"
guest_title: "OpenAI Codex 负责人"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1UqGd6BEzj/ingest"
speaker: "Chris Nicholson / Thibault Sottiaux"
duration: "43:03"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1UqGd6BEzj/article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1UqGd6BEzj/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
author:
  - "[[Chris Nicholson]]"
  - "[[Thibault Sottiaux]]"
concepts:
  - id: codex_general_purpose
    zh: 通用任务代理
    en: general-purpose task agent
    one_line: Codex 多数任务已是非编码——追查、协调、总结、自动化
  - id: bespoke_software
    zh: 家常定制软件
    en: bespoke / personal software
    one_line: 语音描述偏好，十分钟生成表格、地图站、个人工具
  - id: slash_goal
    zh: 斜杠目标
    en: /goal
    one_line: 定义成功标准与输出格式，代理数小时至数周不懈 pursuit
  - id: chief_of_staff_agent
    zh: 幕僚长代理
    en: chief of staff agent
    one_line: 24/7 后台跑百项小任务，屏蔽噪音、只推关键决策
  - id: referee_agent
    zh: 自动审查代理
    en: Referee Agent / auto-review
    one_line: 监督主代理每一步行动，高风险时拦截
  - id: agent_sandbox
    zh: 代理沙盒
    en: agent sandbox
    one_line: 文件夹级读写网权限，企业把代理锁在允许的信息孤岛内
---

# OpenAI播客：用 Codex 处理日常工作

**Host：** Chris Nicholson（OpenAI 全球事务团队）  
**Guest：** Thibault Sottiaux（OpenAI Codex 负责人）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `bilibili-retranscribe/BV1UqGd6BEzj/ingest/column_article.md`  
**B 站转载：** [BV1UqGd6BEzj](https://www.bilibili.com/video/BV1UqGd6BEzj/) · **专栏：** [cv49625007](https://www.bilibili.com/read/cv49625007/)

---

## 开场

**Chris：** 欢迎来到 OpenAI 论坛。我是 Chris Nicholson，全球事务团队的。这个论坛是我们跟专家聊 AI 怎么落地的地方。今天聊 **Codex**——以及它为什么在软件工程之外同样重要。

越来越多人用 Codex 做知识工作和个人琐事：减摩擦、跑重复活、理清问题、组织信息、写能分享的文档。研究人员、老师、运营、小企业主、管理者——凡是跟信息打交道的人，都能用上。今天 Thibault Sottiaux 来了，Codex 负责人，他会讲 Codex 从哪来、团队从非技术用户身上学到什么、以及编码之外怎么上手。

**Thibault：** 很高兴来。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| Codex | Codex | OpenAI 面向开发者与知识工作者的智能体产品（古义「法典」，非仅「代码」） |
| Codex Web | Codex Web | 约一年前首版：云端隔离环境，任务结束在 GitHub 开 PR |
| 通用任务 | general-purpose tasks | 协调、追查、研究、做 deck、管文件——不限于写代码 |
| 斜杠目标 | /goal | Codex 斜杠命令：给长期目标，代理不懈 pursuit 直至自评达标 |
| 幕僚长 | chief of staff | Thibault 自喻：百项并行小任务、晨间简报、优先级过滤 |
| 自动审查 | auto-review / Referee Agent | 副代理审查主代理每一步，高风险行动拦截 |
| 沙盒 | sandbox | 代理只能碰指定文件夹/权限集，模拟企业信息边界 |
| 吃自己的狗粮 | dogfooding | OpenAI 内部先用自家工具完成真实工作流 |

---

## 01 Codex 从云端隔离到本地深度集成

**Chris：** 先打底——Codex 最初是给开发者的。什么时候第一次发布？你们当时想解决什么？

**Thibault：** 这事很久以前就开始了。在 OpenAI，我们一直想造出真能帮上忙的模型，加速我们自己的开发。编码一直是块硬骨头：怎么让模型达到高产软件工程师的水平。

大约两年前起步，第一个公开版就是现在的 **Codex Web**。思路是：云端跑一个实体，网页里丢任务，它翻你的代码库、算出该改什么、在 GitHub 提 PR。完全隔离、完全封装——你只表达意图，最后收到代码 diff。那大概是一年前的事。

后来我们发现太笨重：云环境要复刻每个人本机那套完美配置，摩擦力太大。更关键的是，当时模型还扛不住**长期任务**——跟它迭代很痛苦。于是我们换路子：让模型直接在用户**本地机器**上跑，吃用户现成的工具链。

**Chris：** 所以先是给自己造工具，后来发现应该在每个人的电脑上跑。

**Thibault：** 对。云里逼大家重配一遍，不现实；模型也还没稳到能可靠处理长跨度活。本地集成才是正路。

**Chris：** 你什么时候第一次看见有人拿它干编码以外的事？

**Thibault：** 最近六个月的事。GPT-5 出来之后，通用任务的**可靠性**跳了一档；到 **5.2** 左右，长期任务尤其稳。再加上一个事实：就算工程师，一天里也就 **20%–30%** 在真写代码——其余时间在工单、排优先级、架构扯皮、查 bug、值班、摸系统。已经用上 Codex 的人，自然拿它处理这些琐事。我们手里技术更强了，就想让它惠及更广的人群。

> **金句 · Thibault**
> **中文：** 软件工程师一天里可能只有两成到三成时间在写代码——其余全是协调和信息活。
> **原文：** Software engineers might only spend 20% to 30% of their time actually coding.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Codex Web | Codex Web | 首版云端封装：意图进、PR 出，配置成本高 |
| 本地深度集成 | local deep integration | 模型在用户本机环境跑，复用现有配置与工具 |
| GPT-5.2 拐点 | GPT-5.2 inflection | 长期、复杂任务可靠性质变，解锁非编码场景 |
| 长期任务 | long-horizon tasks | 跨多步、需持续上下文的任务，早期云版扛不住 |

**本章小结**

- 首版 Codex Web：云端隔离 + PR，配置重、模型未稳，路线受阻
- 转向本地：吃用户真实环境，降低摩擦
- GPT-5 / 5.2 后通用任务可靠性上来，非编码用法在最近六个月爆发

---

## 02 工程师的真实画像：追查、总结、协调

**Chris：** 要当软件工程师，得干一大堆跟编码无关的事。

**Thibault：** 内部叫**吃自己的狗粮**——用自家工具干这些活。要让编码更有用，得接更多上下文：Notion、文档、Slack……代理解决任务的能力明显上去。现在 Codex 里执行的**大多数任务其实是非编码的**，这挺有意思。

**Chris：** 先是搜代码，后来发现搜文档、吐信息也超强——知识工作者天天干这个。你什么时候觉得「这会适用于所有人」？

**Thibault：** 做 Codex 发布那会儿，首席 PM **Alexander Americus** 用 Codex 跟踪发布前所有改动状态。我从没见过谁像他那么猛——像有一群小 Codex 替他催进度、更文档、记「这功能还差什么」。用户反馈、开发信息全汇进计划，保持干净最新。跟他聊的时候我就想：**我们改的不只是软件工程。**

**Chris：** 以前亚历山大得自己翻 Slack、文档、GitHub PR，跟你我一样耗在协调上。后来他把耗时活委托出去，跟你开会时后台还在跑？

**Thibault：** 模型极擅长**捞对上下文 + 总结**，这是杀手级用例。他还拿它**追查信息**——接 Slack 后能发消息问「这事进展怎样」。追查通常是极耗时的，代理替他干了。

> **金句 · Thibault**
> **中文：** 模型很擅长收集正确上下文并总结——追查进度这种活，代理可以替你做。
> **原文：** Our models are very good at gathering the right context and summarizing — Codex agents can message people and chase things down.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 上下文接入 | context connectors | Notion、Slack、文档等插件，让代理看见工作全貌 |
| 追查 | chase-down / follow-up | 跨频道问进度、催反馈，传统极耗人力的协调 |
| 非编码多数 | majority non-coding tasks | Codex 执行面已从「写代码」翻转为通用任务 |
| 狗粮 | dogfooding | 内部真实工作流验证产品价值 |

**本章小结**

- 工程师日常大头是协调与信息，不是敲键盘
- 接 Notion/Slack 等上下文后，追查、总结、同步成为核心用例
- Alexander 式「多代理并行催发布」是「适用于所有人」的顿悟时刻

---

## 03 组织瓶颈转移：构建加速，沟通成新卡点

**Chris：** 亚历山大这么用 Codex，对团队和产品有什么涟漪？

**Thibault：** 工程师产出猛增，构建速度史上最快。设计师、产品经理的角色也在变——我们给他们加速手段之后，**瓶颈挪到了沟通和营销**：产出太多，怎么对外讲连贯故事成了挑战。卡点往公司其他部门移。

**Chris：** OpenAI 发布这么快，没有 Codex 可能吗？

**Thibault：** 以现状看，**不可能**。Codex 对我们至关重要。

**Chris：** 别的公司——工程师多十倍的——能走类似路子吗？

**Thibault：** 能。代理已经能胜任很通用的工作：**凡是你用电脑能做的事，代理几乎都能帮**。做 deck、协调利益相关方、收集用户对新功能的看法、市场研究——财务那边也用很多。**Sara Frias** 聊过，最新一轮募资 Codex 帮了大忙。它早就不只是生成代码，而是**执行通用任务**。

**Chris：** 角色具体怎么变？

**Thibault：** 每个人都得适应**更快的发展节奏**。以前几天的难题，现在几小时；深度市场研究、公众反馈分析，过去要大量搜源、浓缩成不同背景的人都能懂的表述，现在几小时自动化就压缩掉。一切突然变快，你得跟上。

更妙的是**赋能**：以前想「我得找谁聊」「我不确定怎么做」。现在直接动手。公司内部一堆数据问题——「某市场多成功？」「印度怎么样？」「韩国怎么了？」——每个人都能问 Codex 调仪表盘，不必排队麻烦数据分析团队，让分析同学干更有趣的事。

**Chris：** 数据分析团队队列历来很长。有问题的人、做方案的人曾经是两拨人，对话拖很久，最后凑合上线没人再迭代。现在有问题的人可以极快搭方案、改方案。

**Thibault：** 设计师身上也明显。他们开始推代码、跟工程师一起塑产品体验，不必再说服工程排那些工程师觉得鸡毛蒜皮、却能提升数百万用户体验的改动。

> **金句 · Thibault**
> **中文：** 瓶颈正在往公司其他部门转移——当我们产出大量工作时，对外讲故事并保持连贯成了挑战。
> **原文：** The bottleneck is shifting to other parts of the company — telling coherent stories at scale becomes the challenge.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 瓶颈转移 | bottleneck shift | 构建加速后，沟通/营销/叙事成新约束 |
| 问题即构建者 | problem owner as builder | 提需求的人可直接迭代方案，缩短跨职能循环 |
| 设计师推代码 | designers shipping code | 角色边界模糊，工艺级改动不必等工程排期 |
| 代理驱动协作 | agent-driven collaboration | 追查、同步、研究由代理承担，人聚焦决策 |

**本章小结**

- OpenAI 内部：Codex 是高频发布的基础设施，非可有可无
- 构建加速 → 沟通/营销成瓶颈；代理承担追查与信息同步
- 设计师、PM、业务同学被赋能，数据分析队列压力下降

---

## 04 家常定制软件：语音十分钟，面包地图上线

**Chris：** 感觉我们进了**家常定制软件**的时代。

**Thibault：** 下一波浪潮：每人都能拥有、维护自己的**个人软件**，完全贴合你的需求。你之前说你给自己搭了数据可视化——要展示吗？

**Chris：** 请。

**Thibault：** 我住旧金山。欧洲搬来，觉得这边面包贵得离谱。我就跟 Codex 说：找城里最好的面包，做张表——店在哪、去哪买、多少钱。**五分钟**出表：Jane the Bakery、Ariscault、Tartine……想找好酸面包就去 Dogpatch 的 Neighbor Bakehouse。

表有了，我还想直观地看。我说：做个网页，标在地图上。**四分钟**搞定——个人软件，点店名能看详情，还能要低价面包的图片。全程大概 **十分钟**，我几乎没盯着。

**Chris：** 关心某类数据、能访问数据的人，都能做网站、分析、可视化，分享给朋友同事。以前说「写代码」，现在更像**说代码**。

**Thibault：** 底层当然还是代码，但它是代理的**工具**，你不必感知。它替你编辑表格、文档、幻灯片、网站——代码只是手段，所以才有这种美妙的通用性。

**Chris：** 有这技能以前，得花一个周末。

**Thibault：** 远比搜集信息本身更久。现在瞬间完成，不满意还能改。

**Chris：** 不满意就让它改，对吧？

**Thibault：** 我说对咖啡做同样分析——「嘿，对咖啡做跟面包一样的事。」它跑八分钟，我得到旧金山咖啡网站。你可以表达偏好——比找便宜面包复杂——Codex 会照着努力。

**Chris：** 拿数据、可视化、帮你洞察世界，再做适合自己的决定——生活里一直在重复的循环。

**Thibault：** 对，为了达成我的目标。最简单是面包表，最复杂可以像 OpenAI 最近融资分析那种体量。Codex 两头都能吃。

> **金句 · Thibault**
> **中文：** 你甚至不需要感知代码——它只是代理用来编辑表格、文档和网站的工具。
> **原文：** You don't need to perceive it — code is just a tool the agent uses to edit spreadsheets, documents, and websites.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 家常定制软件 | bespoke / personal software | 按个人偏好快速生成、迭代的一次性工具 |
| 语音驱动 | voice-driven interaction | Thibault 全程语音下指令，无需全程盯屏 |
| 代码作工具 | code as agent tool | 用户面对结果（表/站/deck），不面对源码 |
| 偏好表达 | preference expression | 「性价比面包」「咖啡质量」等主观约束可编码进任务 |

**本章小结**

- Demo：面包表 5 分钟 → 地图站 4 分钟，语音指令、后台执行
- 「写代码」→「说代码」：代码退居代理工具层
- 同一套能力覆盖个人琐事到复杂研究分析

---

## 05 幕僚长代理与斜杠目标：从回合制到不懈 pursuit

**Chris：** 你现在像亚历山大那样协调一切？我能在侧边栏看见你的操作。

**Thibault：** 谈话前就在跑。我每天交给 Codex **超过 100 个**不同小任务：整理桌面、管计算集群、查值班轮换、梳发布计划、标我有风险的事项。我把它当**小幕僚长**。每天早上 9 点自动化扫 Gmail 和 Notion 日历，收件箱里一份**风险提示 + 总结**——安排好就不用管。

**Chris：** 还帮你排优先级。

**Thibault：** 对，把注意力钉在最重要的事上。很多琐事以前要么不做（觉得不值得亲自搞），要么不好意思麻烦别人——现在随时能要信息和小报告，搭以前没时间做的个人软件。高兴的是：电脑上繁琐手工活都外包了，我只待在 Codex 里想真正该想的事。

**Chris：** 常说「几周的活几秒搞定」，其实很多事**以前根本不会发生**。

**Thibault：** 而现在它发生了——很多这样的情况。我确实更喜欢工作了：以前掌握不了的信息，现在每天早上有**个性化新闻简报**；Twitter 上的用户 bug 报告，以前常标低优先级「可能影响极小」，现在丢给 Codex，不怕漏，**认知负担**下来。

**Chris：** 像对付倦怠和信息过载——很多工具本该帮忙，却把人困住。这是解放？

**Thibault：** 这就是承诺：**可信任的伙伴**，把工作委托出去，保质保量；不满意会报告。还能**屏蔽噪音**，只提醒重要的——不用在七个 App 里翻。我设想的未来：甚至不必读邮件——个人代理读收件箱，只在要紧事上叫我或征求意见。针从干草堆里挑出来，整理成简报；我定目标，它管其余。

**Chris：** 可信范围在过去几个月一直在扩。复杂任务能跑的时间也在变。

**Thibault：** 我们刚推 **斜杠目标（/goal）**——斜杠命令进不同模式。给一个长期目标，它会**不懈 pursuit**。比如极难的数学问题，能跑**数小时、数天、数周**，直到自认达标。程序性能优化、语言重写、科学问题都有酷突破。几个月前「跑十分钟」就很兴奋，现在谈的是代理跑几周啃最难的任务。

**Chris：** 有时我觉得天才就是能更长时间想同一件事。

**Thibault：** 对。时间无限、人够聪明，也许能推出人类至今一切——这感觉没错。

**Chris：** `/goal` 在命令行有了，这个 Codex 应用里也能用吗？

**Thibault：** 还没正式发布，很快。跑几天在后台，回来报告完成或卡住。

**Thibault：** 未来方向是**不停止**——**24/7 代理**替你干有用的事，途中接受指导。现在是回合制：「去旧金山找面包」这种目标导向任务已是巨大突破。下一步是持续运行：不管你下不下指令，都做有用的事；也许某刻说「我认为有用的都做完了，歇会儿等你说话」——不再只是响应明确指令才动。

**Chris：** 怎么把目标定清楚，更容易成功？

**Thibault：** 新手可以先探索，直接问它能力边界。好技巧是帮它**自评成功**：描述什么叫「好」、什么叫「解决」、完成时希望看见什么。比如「要 10 张幻灯片的 deck：前两张某类信息，中间六张技术拆解，最后两张开放问题」——输出说清楚，成功率大得多。跟你带新助理一个路子。

> **金句 · Thibault**
> **中文：** 几个月前跑十分钟就很兴奋，现在我们谈代理跑几周处理最难的任务。
> **原文：** A few months ago, ten minutes was exciting — now we're talking about agents working for weeks on the hardest tasks.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 幕僚长代理 | chief of staff agent | 百项并行、晨间简报、风险与优先级过滤 |
| 斜杠目标 | /goal | 长期目标模式，代理自驱 pursuit 直至自评完成 |
| 24/7 代理 | always-on agent | 从回合制任务进化为持续后台有用劳动 |
| 成功标准外化 | explicit success criteria | 输出格式与「完成」定义写清，代理才能自评 |
| 认知负担 | cognitive load | 追查、分类、防遗漏外包，减轻心理 overhead |

**本章小结**

- Thibault 日委托 100+ 任务：幕僚长式晨间简报 + 风险标红
- 从「几周变几秒」到「以前不会发生的事现在发生」
- `/goal`：数周级 pursuit；未来走向 24/7 持续代理
- 定目标像带新助理：成功标准与输出结构要写死

---

## 06 信任沙盒、Referee Agent 与上手习惯

**Chris：** 社区问题——**Gagan Karia**（金融首席工程师）：什么会让非程序员从 ChatGPT 转向 Codex？

**Thibault：** 会是渐变，也在发生。不指望人人都换，但 Codex 是 ChatGPT 的**很好补充**——让代理**替你在电脑上做事**：管文件、跑自动化、几小时后台跑一圈。ChatGPT 仍是我**快速问答**首选。

**Chris：** 以前从 ChatGPT 复制粘贴代码到终端——复制粘贴时代结束了。

**Thibault：** Codex 直接碰你机器上的文件和图片。「用这个文件，读它」——不用你点来点去。

**Chris：** **Anastasia Ch**：企业采用 AI 最大瓶颈？能力、信任还是组织流程？

**Thibault：** 不是能力，能力在了。**是信任**——得安全可靠。公司里代理乱跑，删敏感文件、乱上传、发不该发的邮件，没人敢用。所以我们默认**严格沙盒**：只碰文件系统特定部分，可限一个文件夹、可关网络，企业级控制很多。

还有**自动审查（Referee Agent）**——对齐博客写过：一个代理审查主 Codex 的**每一步行动**，风险高就标记、拦住。未来还要更多这类创新。像**裁判**：「停，太冒险，换个风险小的做法。」

**Chris：** 帮非工程师理解——沙盒就是一个文件夹？

**Thibault：** 对。公司里你可能只能看本部门信息——人之间的信息孤岛，就是代理沙盒的等价物。限制能访问什么、能采取哪些行动。比如**只读**：能读分析，不能写回、不能删。

**Chris：** **Jason DeLuca**：非开发怎么做才让 Codex 好用？习惯和困惑的人差在哪？

**Thibault：** 三样：**第一**，带创意，跟已经玩明白的人聊，加入社区。**第二**，指令要**精确**，别含糊——「这就是我要的精确结果」。把代理当**刚入职、对你一无所知**的新人：告诉它东西在哪、怎么想、读哪些文档。人们常忘这点。**第三**，**多接插件**——日历、Notion、你喜欢的工具，100+ 插件了；访问你世界的信息越多，越有用。

**Chris：** 更好上下文 → 更好结果；有些上下文在你脑子里，得当好老板分享出来。

**Thibault：** 我现在习惯**什么都写下来**——想法、目标放文件里，Codex 能读，才能对齐。它读不了你的脑子，总得在某刻说出来。

**Chris：** **Daniel Green**：最喜欢的计算机现实世界用途？（非传统编码）

**Thibault：** 我个人：**膳食计划**，然后**真的下单买菜**。还有人用来找 Windows/Mac 设置项——「我想改这个，带我去点哪里」，它带你点。技术人员拿它做 **QA**：打开 App 点一圈测是否正常。

**Chris：** **Sai Sri Hamsini N**：用 Codex 提示词最大错误？

**Thibault：** 委托诱惑太大，把**理解也外包**——到头来不懂发生了什么，脱离实际，生产力反而掉。要多花时间让它**解释**、画图（GPT-4V 渲染文本很强）——读发布计划、市场材料、代码片段，生成图帮你学。错误是**委托过度、理解不足**。

**Chris：** 谁干活谁学习。我给自己做了个「导师技能」，让它反问我、逼我主动回忆。

**Thibault：** 完全同意。

**Chris：** 软件之外为什么重要？用例往哪走？

**Thibault：** 我们在造**极通用、极强大**的代理。接对信息源、给行动权，几乎能做你允许的一切——价值创造会惊人。很多以前没时间做、做不了、对人太难的事，都会成为可能。我们会**尽可能广地分发**，让全世界都能用——提升人们敢梦想去完成的事的数量。

**Chris：** 跟物理学家到项目经理都聊过——「一堆主意以前实现不了，现在能动手了。」黄金时代？

**Thibault：** 感觉就是。

**Chris：** 最后补一句：Thibault 说社区能帮你学好 Codex——**OpenAI 论坛**就是社区。今天的问题是：不编码的人为什么该关心 Codex？尽管名字里有 Code，Codex 古义是**法典、古书**——手里拿的那本书，比「代码」更宽。**开发有用，普通人也有用**——知识工作者、找针的人、做数据分析可视化的人、排优先级、执行生活里复杂任务的人。想想你生活或组织里哪一个流程可以让 Codex 试：研究简报、计划、入职、报告、决策备忘录。亲自动手，比听我们讲更清楚。

> **金句 · Thibault**
> **中文：** 企业采用的最大障碍不是能力——是信任；代理必须在安全可靠的沙盒里跑。
> **原文：** The biggest bottleneck for enterprise adoption isn't capability — it's trust; agents must run in a safe, reliable sandbox.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| ChatGPT 互补 | ChatGPT complement | 问答用 ChatGPT；电脑上代劳用 Codex |
| Referee Agent | Referee Agent / auto-review | 副代理逐步审查主代理，高风险拦截 |
| 文件夹沙盒 | folder sandbox | 代理权限限在指定目录与动作集 |
| 精确委托 | precise delegation | 像带新人：路径、偏好、成功标准写清 |
| 委托过度 | over-delegation without understanding | 全外包理解会导致脱离实际、生产力反降 |
| 插件上下文 | plugin context | 100+ 连接器，日历/Notion/Slack 等喂给代理 |

**本章小结**

- 企业瓶颈在信任：沙盒 + Referee Agent 双轨降风险
- 上手三板斧：混社区、指令精确、多接插件；想法写下来
- Codex 古义「法典」——通用知识工作代理，非程序员同样该关心

---

## 总结

| 维度 | 要点 |
|------|------|
| 产品演进 | Codex Web 云端 PR → 本地集成；GPT-5.2 解锁长期通用任务 |
| 真实工作 | 工程师仅 20%–30% 编码；追查、总结、协调是主战场 |
| 组织效应 | 构建加速 → 沟通/营销成瓶颈；代理承担追查与同步 |
| 个人软件 | 语音十分钟：表格 → 地图站；代码退居代理工具 |
| 幕僚长 | 日 100+ 任务、晨间简报；从「不会发生」到「天天发生」 |
| /goal | 数小时至数周 pursuit；未来 24/7 持续代理 |
| 企业落地 | 信任 > 能力；沙盒 + Referee Agent |
| 上手 | 社区、精确指令、多插件；委托但保持理解 |

> **金句 · Thibault（封底）**
> **中文：** 我们在提升人们甚至敢梦想去完成的事情的数量——很多以前做不了的事，现在会成为可能。
> **原文：** We're increasing the number of things people even dare to dream of completing — much that was impossible becomes possible.

---

## 关键概念（读完应能解释）

| 中文 | 英文 | 白话 |
|------|------|------|
| Codex Web | Codex Web | 首版云端隔离开发流程，配置重、已被本地路线取代 |
| 本地深度集成 | local integration | 模型在用户本机跑，复用真实工具链与配置 |
| 通用任务代理 | general-purpose agent | 非编码任务已成 Codex 执行面多数 |
| 狗粮 | dogfooding | OpenAI 内部用 Codex 完成发布、募资、协调等真实流 |
| 瓶颈转移 | bottleneck shift | 构建加速后叙事与沟通成组织新卡点 |
| 家常定制软件 | bespoke software | 按个人偏好语音生成表、站、工具，十分钟级 |
| 幕僚长代理 | chief of staff agent | 并行百项小任务 + 晨间风险简报 |
| 斜杠目标 | /goal | 长期目标模式，代理不懈 pursuit 直至自评达标 |
| 24/7 代理 | always-on agent | 从回合制进化为持续后台劳动 |
| Referee Agent | Referee Agent | 审查主代理每一步，高风险行动拦截 |
| 沙盒 | sandbox | 文件夹/权限级隔离，模拟企业信息边界 |
| 委托过度 | over-delegation | 外包理解会导致脱离实际，需用代理辅助学习 |

---

## 附录

### 章节时间戳（B 站简介）

| 时间 | 主题 |
|------|------|
| 02:15 | Codex 演进：云端隔离 → 本地深度集成 |
| 04:40 | 工程师真实画像：仅 20%–30% 在写代码 |
| 07:10 | 组织瓶颈转移：构建加速，沟通成卡点 |
| 11:30 | 家常定制软件：语音十分钟面包地图 |
| 21:45 | 回合制 → /goal 长程代理 → 24/7 幕僚长 |
| 27:30 | 企业信任：沙盒 + Referee Agent + 上手习惯 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1UqGd6BEzj/ingest`
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV1UqGd6BEzj/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv49625007/
- **B 站**：https://www.bilibili.com/video/BV1UqGd6BEzj/
- **原片发布**：2026-05-15
- **时长**：43:03

### 相关阅读

- [[Codex负责人-现场演示Codex]] — 同嘉宾 Thibault：产品 demo、双智能体审查、无感智能、定时任务  
- [[OpenAI研究员-Harness工程软件开发新范式]] — Ryan Lopopolo：Harness 工程、代码免费、智能体原生代码库；与本篇「构建加速 + 角色转变」对读  
- [[OpenAI员工-上下文工程和Agent记忆]] — 上下文分页与长期任务记忆，补全 /goal 与幕僚长代理的上下文需求  
- [[MOC - Harness Engineering]] — Harness 横切索引  

---

### 收录说明

- **视频**：[BV1UqGd6BEzj](https://www.bilibili.com/video/BV1UqGd6BEzj/)（B 站 *Easonlee的AI笔记*）  
- **嘉宾**：Thibault Sottiaux，OpenAI Codex 负责人；Host Chris Nicholson（OpenAI 全球事务）  
- **形态**：S 轨 · 专栏主源 Host-Guest canonical v3.2  
- **版本**：2026-07-06 首版收录
