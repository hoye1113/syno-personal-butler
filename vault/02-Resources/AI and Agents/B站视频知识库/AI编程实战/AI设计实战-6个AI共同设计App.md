---
title: "AI设计实战：6个AI共同设计App"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "multi_agent", "harness_engineering", "author"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "ai_design", "multi_agent", "harness_engineering", "author"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1gE93BEEUq/"
description: "Peter Yang 对话 Pencil CEO Tom Krcha，现场演示6个AI代理在画布上并行设计App，.pen格式实现设计与代码的单一真理来源。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/AI编程实战/AI设计实战-6个AI共同设计App.md"
source_sha256: "a2eb45702d99258576345fc2ff7f867742f9c2513ae81f04a4077588d2564d93"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1gE93BEEUq/"
column_url: "https://www.bilibili.com/read/cv43697518/"
column_source: "bilibili_column"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1gE93BEEUq/ingest"
duration: ~30 min
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical (column primary)"
host_name: "Peter Yang"
guest_name: "Tom Krcha"
guest_title: "Pencil CEO"
speaker_inference: "column_article明确标注Peter Yang(嘉宾)/Tom Krcha(主持人)角色"
speaker_confidence: high
author:
  - "[[Tom Krcha]]"
  - "[[Peter Yang]]"
concepts:
  - id: swarm_mode
    zh: 蜂群模式
    en: swarm mode
    one_line: 多个AI代理在画布上并行协作设计
  - id: pen_format
    zh: PEN格式
    en: .pen format
    one_line: 基于JSON的平台无关设计描述符，充当设计与代码间的单一真理来源
  - id: visual_planning
    zh: 视觉规划模式
    en: visual planning mode
    one_line: 在画布上同时生成数十种变体进行对比的发散性探索方式
  - id: source_of_truth
    zh: 单一真理来源
    en: source of truth
    one_line: 设计与代码的唯一基准文件，所有工具基于此同步
---

# AI设计实战：6个AI共同设计App

**Host：** Peter Yang（科技评论人）  
**Guest：** Tom Krcha（Pencil CEO）  
**形态：** 访谈 · Host-Guest canonical v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV1gE93BEEUq](https://www.bilibili.com/video/BV1gE93BEEUq/) · **专栏** [cv43697518](https://www.bilibili.com/read/cv43697518/) · **时长** ~30 min

---

## 开场

Pencil 是一个能让多个AI代理在画布上像人类设计师一样协同工作的工具。Tom Krcha 七岁开始用Photoshop，在Adobe干了十年，做过视频会议应用Around（后被Miro收购），现在做Pencil——他说这是他第一次看到AI被"人性化"。

五章预告：**蜂群模式与多代理协作** → **PEN格式：为AI打造的代理式PDF** → **视觉规划模式替代线性生成** → **职业边界模糊与人人都是创造者** → **重拾Flash时代的设计编码一体化**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 蜂群模式 | swarm mode | 多个AI代理同时在画布上分工协作 |
| PEN格式 | .pen format | 基于JSON的设计描述符，AI能读写，可转Swift/Kotlin/React |
| 视觉规划模式 | visual planning mode | 在画布上同时生成几十种变体供人对比选择 |
| 单一真理来源 | source of truth | 设计与代码的唯一基准，所有人基于此同步 |
| 代理式PDF | agentic PDF | 如果PDF为AI时代重新设计，就是这种AI可读写的格式 |
| 平台无关 | platform independent | 文件格式不绑定任何编程语言或运行环境 |
| 风格指南 | style guide | 预设的品牌视觉规范，AI代理据此生成设计 |

---

## 01 蜂群模式：6个AI光标同时干活，像魔法一样

**Peter：** 那些光标看起来只是个小细节，但这是我第一次看到AI被赋予如此人性化的表现。你能不能现场演示一下蜂群模式——6个代理一起设计一个App是什么感觉？

**Tom：** 蜱群模式是这周刚发布的功能，已经火了。你看我现在打开Pencil，它可以在Windows、Linux、Mac上运行，也为VS Code、Cursor、Windsurf这些IDE做了插件。你可以接入Claude Code、Codex，或者任何你自己的代理。

Peter说他想做一个旅行日志App，那我们就让6个代理来设计三个屏幕，每个屏幕分配两个代理。你可以选择风格指南，也可以让代理自己决定——我们就让它给个惊喜。

现在六个子代理启动了，它们开始相互通信并分配工作。你看到屏幕上那些彩色光标了吗？那就是代理在工作。我给它们起了名字，比如Amber。很多人问能不能自定义名字——这个功能正在开发中，以后你可以把它们命名为任何人，也许是你朋友的名字。

**Peter：** 光是看到这些光标在画布上操作就相当令人惊叹了。以前界面上只有一个光标，甚至根本没有光标，只是一个代理在输入东西。现在这六个光标同时在动，感觉就像真的有六个人在那里工作。

**Tom：** 对。这个光标最初其实是为了调试——我们构建了并行机制，但我不知道每个代理具体在做什么。我想，为什么不把光标放上去，这样我们就能看到谁在做什么，出问题也方便调试。当我们把它构建出来后，我感觉这就像魔法一样。它非常人性化，不像通常的AI那样冷冰冰。这些光标在画布上工作，真的感觉背后有人在做这些修改。

> **金句 · Tom Krcha**
> **中文：** 这看起来只是个小细节，但这是我第一次看到AI被人性化。感觉那里有人，这太疯狂了。它只是一个光标，但它让你觉得工艺和关怀仍然很重要。
> **原文：** This looks like a small detail, but this is the first time I've seen AI humanized. It feels like there's someone there. It's crazy. It's just a cursor, but it makes you feel that craft and care still matter.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 蜂群模式 | swarm mode | 多个AI代理同时在画布上分工协作 |
| 子代理 | sub-agent | 由主代理启动的专门处理子任务的独立AI |
| 并行协作 | parallel collaboration | 多个代理同时工作、互不冲突地修改同一画布 |

**本章小结**
- 蜂群模式让6个AI代理同时在画布上设计，每个代理有自己的彩色光标
- 光标最初是为了调试而加的，结果意外带来了"人性化"的工艺感
- 代理之间可以相互通信、分配工作，用户能实时看到每一步进展

---

## 02 PEN格式：AI时代的设计需要一种新文件

**Peter：** 你是怎么处理输出的？它只是生成代码，还是在做其他事情？

**Tom：** 它基本上是为设计生成一个描述符。我们想确保它是平台无关的，所以直接用HTML和CSS生成没有太大意义——因为最终可能要变成Swift或其他语言。因此我们开发了一种平台无关的文件格式，叫PEN。

它本质上是基于JSON的格式。我们从头构建了这种适配代理的格式，网站上有文档，你可以围绕它构建插件。人们已经开始构建各种转换器了，我见过能将PEN文件转换为Figma、Lovable以及其他各种工具的插件。

**Peter：** 所以你可以把它转换成Swift、iOS，或者Kotlin，或者React Native——因为它是移动应用。

**Tom：** 没错。这个JSON文件可以放进Git，无论是在云端还是与同事协作，任何人都可以使用它。你可以创建组件库。你可以把它想象成一个"代理式PDF"——如果PDF是在AI代理的新时代被重新设计或构建的，它可能就是这个样子。

**Peter：** 你是怎么得到这个想法的？我真的很惊讶它只是JSON，但包含了很多像填充之类的数值。

**Tom：** 对，本质上它就是一个完整的描述。这是一个全新的、为代理从头构建的设计格式。这个文件会进入Git，任何人可以基于它创建组件库。当它运行的时候，我想再给你看几样东西——我们这里有很多设计组件，比如Shadcn，你也可以改成暗模式或者不同的色调。

> **金句 · Tom Krcha**
> **中文：** 本质上它就是一个完整的描述。把它想象成一个"代理式PDF"——如果PDF是在AI代理的新时代被重新设计的，它可能就是这个样子。
> **原文：** It's essentially a complete description. Think of it as an "agentic PDF" — if PDF were redesigned in this new era of AI agents, this is what it might look like.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| PEN格式 | .pen format | 基于JSON的设计描述符，AI能读写，可转多种语言代码 |
| 代理式PDF | agentic PDF | AI可读写的格式，替代传统PDF成为设计交付物 |
| 单一真理来源 | source of truth | 设计与代码的唯一基准文件，所有工具基于此同步 |

**本章小结**
- PEN格式是基于JSON的平台无关设计描述符，专门为AI代理读写而设计
- 它充当设计与代码之间的"单一真理来源"，可转换为Swift/Kotlin/React等任何代码
- 社区已经开始构建PEN到Figma、Lovable等工具的转换器插件

---

## 03 视觉规划模式：发散探索比线性生成更接近真实设计

**Peter：** 很多代码生成平台都非常线性和串行——你做一件事，然后点击下一步。但Pencil提倡"视觉规划"，这有什么不同？

**Tom：** 对，这是我从其他人那里一直听到的反馈。实际上你可能想要20种不同的变体，并排比较它们，或者进行分叉尝试。我这辈子见过无数的设计文件，所有设计师的文件里都是一团糟，因为那是探索模式。你在构思，尝试不同的东西，比较，在大量复制粘贴。一旦你决定了，你才会说"就是它了"，然后围绕它制定规范和PRD。

Pencil做的就是把这个过程搬到AI时代。你不需要一次性写对提示词——在画布上让多个AI并行生成数十种变体进行对比。这种发散性探索更符合人类设计师的直觉。

**Peter：** 所以它就像一个可视化的计划模式？Claude Code和Cursor里都有计划模式，而这就像视觉化的版本。

**Tom：** 没错。一旦你决定"这就是我想要的"，当然就可以让它为你建造出来。但我们真正想做的是让具有相同角色的代理实现并行，以一种互不冲突的方式进行更改。让它们在我面前找出如何并行分配工作，同时使用像Opus这样强大的模型，但速度快三倍，因为它们能有效地分工。

**Peter：** 如果我使用Claude Code，我可以启动三个不同的终端让它们工作，但在它们完成之前，我不知道到底发生了什么。但在这里，我能实时看到进展。

**Tom：** 没错。然后你会说：好的，酷，就帮我建造这个吧。现在我们可以去喝杯咖啡，稍后再回来。因为你知道它们有计划，知道要建造什么。这是一个巨大的区别，天壤之别。

> **金句 · Peter Yang**
> **中文：** 如果我使用Claude Code，理论上我也能做到这些，但它只是生成一堆我看不懂的代码。而能够亲眼看到这一切发生，这简直是颠覆性的。
> **原文：** If I use Claude Code, theoretically I can do all this, but it just generates a bunch of code I can't read. Being able to see it all happen in front of me — that's revolutionary.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 视觉规划模式 | visual planning mode | 在画布上同时生成几十种变体供人对比选择 |
| 发散性探索 | divergent exploration | 不一次性定方案，而是先大量尝试再收敛 |
| 并行分工 | parallel division of labor | 多个代理各自负责不同部分，互不干扰 |

**本章小结**
- 视觉规划模式让设计师在画布上同时生成数十种变体，符合发散探索的工作直觉
- 传统线性生成要求用户一次写对提示词，而Pencil允许迭代式探索
- 用户能实时看到每个代理的工作进展，而不是等终端跑完才知道结果

---

## 04 职业边界模糊：营销人员用Pencil重建了整个网站

**Peter：** 你的用户群体是怎样的？主要是设计师、独立创业者还是公司？

**Tom：** 这对我来说也很惊讶。马克·安德森最近谈到产品经理、设计师和工程师之间的"墨西哥僵局"。我认为我们基本上都成为了创造者——设计师正在向设计工程师发展，工程师现在想处理比代码更多的事情，基本上就是管理和运行完整的项目。现在产品经理们感到非常有能力去创造，而且远不止于此。

我一个朋友最近给我打电话，他说他非常喜欢Pencil。他是个营销人员，在公司工作。他立刻就学会了Claude Code——Claude Code在桌面应用程序中，甚至不在终端里。他配合Pencil一起使用，完全重建了网站、营销材料、广告、PDF，还有他们为销售人员准备的技术规范。

我当时想，哇。本质上，Pencil就是这个位于所有事物中心的AI设计画布，你真的可以把它变成你自己的。越来越多以前没有编码概念的人，现在也因为Pencil而开始学习编码。

**Peter：** 这比手动编写代码有趣得多，甚至作为设计师，这比制作所有这些图层和绘制方框要有趣得多。

**Tom：** 现在多亏了Pencil，我终于把那些抽屉里的项目完成了，因为它太有趣了。只是想看看它会是什么样子。而使用许多其他工具时，你会遇到各种错误，无法编译某些东西。很多人因此望而却步，然后就放弃了。但在Pencil中，你只需看到它。有道理？酷，让我们进一步完善它。没道理？好吧，把它刮掉重来。但至少现在你知道了。

> **金句 · Tom Krcha**
> **中文：** 越来越多以前没有编码概念的人，现在也因为Pencil而开始学习编码。Pencil就是这个位于所有事物中心的AI设计画布。
> **原文：** More and more people who previously had no concept of coding are now learning to code because of Pencil. It's the AI design canvas at the center of everything.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 设计即代码 | design as code | 设计产出直接就是可运行的代码，无需文档移交 |
| 墨西哥僵局 | Mexican standoff | PM、设计师、工程师三方互不相让的职业边界困局 |
| 创造者 | creator | AI时代下模糊了设计/开发/产品边界的新角色 |

**本章小结**
- Pencil的用户中有大量非技术背景的营销人员，他们用它重建了网站、广告、技术规范
- AI正在模糊产品经理、设计师、工程师之间的职业边界，"创造者"成为新角色
- 以前不会编码的人现在通过Pencil开始学习编码，构建门槛大幅降低

---

## 05 重拾Flash时代的乐趣：AI屏蔽了复杂度，创作回归工艺本身

**Tom：** 我七岁就开始使用Photoshop，然后是CorelDraw、Illustrator、InDesign、PageMaker。最终我爱上了Flash，因为它是第一个可以同时进行设计和编码的应用程序。我认为对于很多人来说，它确实让他们能够发挥创造力。自从Flash之后，我们还没有看到一个类似的范式，能让你在一个地方同时进行设计和编码。

**Peter：** 但现在有了AI编码，这种范式又开始出现了？

**Tom：** 对。AI编码带回了我们在所有这些复杂性发生之前所拥有的许多最初的乐趣——避开了不同的平台、屏幕、响应式、移动设备等带来的繁琐。现在任何人都可以构建一个移动应用程序。并不是说它会是世界上最好的应用程序，或者说它是绝对安全、可发布的，但是他们可以构建出东西来，而这在以前是不可能实现的。

**Peter：** 你如何建立这家公司？因为你正处于事情的中心。利用AI，人类接触哪些部分？AI又在做哪些部分？

**Tom：** 老实说，很多想法都源于我过去在构建这类体验、工具和产品方面的长期积累。所以这几乎是一种个人爱好。我认为对于团队中的许多人来说也是如此——我们中的一些人过去从事过类似的工作，或者做过2D和3D工具。这对我们很多人来说都是一种个人爱好。

**Peter：** 你如何让他们透明地展示自己在做什么，并赋予他们一些个性？这会带来巨大的不同。

**Tom：** 就像我说的，很多人问我：我可以重命名这些代理吗？当然可以。或者他们可以互相飞过去，击个掌什么的。他们可以从特定的地方飞过来。有很多可能性。我希望世界上越来越多的人会开始以这种方式思考LLM——我们可以真正赋予它们面貌。现在这个面貌就是这个小光标，但我们可以做更多的事情。

> **金句 · Tom Krcha**
> **中文：** 我认为自从Flash之后，我们还没有看到一个类似的范式，能让你在一个地方同时进行设计和编码。现在有了AI编码，这种范式又开始出现了。
> **原文：** I think since Flash, we haven't seen a similar paradigm that lets you do design and coding in one place. Now with AI coding, that paradigm is emerging again.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 设计编码一体化 | design-code integration | 在同一个工具里同时处理视觉和逻辑 |
| 代理个性化 | agent personalization | 为AI代理设定名字、性格、行为模式 |
| 工艺感 | craft | 不只是功能实现，还有创作过程中的审美和关怀 |

**本章小结**
- Tom从Flash时代走来，认为AI正在带回"设计与编码一体化"的创作乐趣
- AI屏蔽了现代框架的复杂度，让创作者重新关注工艺本身
- 未来AI工具将更强调个性化，允许用户为不同代理设定名字和性格

---

## 总结：AI不应只是后台的黑盒，它应该被看见

| 维度 | 要点 |
|------|------|
| 多代理协作 | 蜂群模式让6个AI代理在画布上并行工作，彩色光标让协作过程可见 |
| 文件格式 | PEN格式是为AI设计的"代理式PDF"，JSON结构，平台无关 |
| 工作范式 | 视觉规划模式替代线性生成，发散探索→收敛决策 |
| 职业影响 | 设计师、工程师、PM边界模糊，"创造者"成为新角色 |
| 创作乐趣 | AI屏蔽复杂度，回归Flash时代设计编码一体化的工艺感 |

### 对个人的启示
AI不只是后台生成代码的黑盒——让它被看见、被交互、被实时调整，这本身就是一种产品创新。光标从调试工具变成"人性化"体验，说明技术的温度往往藏在细节里。

### 仍待验证
多人实时协作功能尚未上线，目前用户主要通过Git协作。PEN格式的生态能否像Figma那样壮大，取决于社区转换器的丰富程度。

> **金句 · Tom Krcha（封底）**
> **中文：** 所有这些小细节都非常重要，它们带来了天壤之别。我希望世界上越来越多的人会开始以这种方式思考LLM——我们可以真正赋予它们面貌。
> **原文：** All these small details really matter, they make a world of difference. I hope more and more people start thinking about LLMs this way — we can truly give them a face.

---

## 附录

- **时间戳**：[02:30] AI协同设计的核心在于视觉存在感 · [07:15] PEN格式：为AI时代打造的代理式PDF · [12:40] 从线性生成转向视觉规划模式 · [18:50] 打破产品经理、设计师与工程师的职业僵局 · [25:10] 重拾Flash时代的设计与编码一体化乐趣
- **ingest 路径**：`Recastory/workspace/bilibili-retranscribe/BV1gE93BEEUq/ingest`
- **专栏路径**：`https://www.bilibili.com/read/cv43697518/`
- **相关阅读**：[[MOC - Harness Engineering]] · [[Karpathy-从Vibe Code到Agentic Code]] · [[IBM团队-Harness工程详解]]
