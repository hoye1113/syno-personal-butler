---
title: "OpenClaw实战：Every团队使用Case"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "harness_engineering", "memory", "multi_agent"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "harness_engineering", "openclaw", "memory", "multi_agent"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1Dj93BUEXU/"
description: "Every团队20人演示如何用OpenClaw实现代理社交、跨工具协作、Proof编辑器，以及从个人智能到团队涌现价值的范式转移。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenClaw实战-Every团队使用Case.md"
source_sha256: "5b7bbb93b798a28134ec7037613eb19db4614af5502f22a57dd1269143e0a95c"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1Dj93BUEXU/"
column_url: "https://www.bilibili.com/read/cv47376512/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1Dj93BUEXU/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1Dj93BUEXU/ingest"
duration: "~45 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Dan（Every CEO）"
guest_name: "Brandon（Every COO） · Willie（平台负责人） · Austin（增长负责人）"
guest_title: "Every团队核心成员"
speaker_inference: "column_article S-tier"
speaker_confidence: high
concepts:
  - id: agent_social
    zh: 代理社交
    en: agent social
    one_line: 代理之间互相学习技能，一个代理会的其他代理可以下载使用
  - id: proof_editor
    zh: Proof编辑器
    en: Proof editor
    one_line: 为AI代理原生设计的Markdown协作编辑器，颜色区分人类与代理贡献
  - id: trust_building
    zh: 信任建立
    en: trust building
    one_line: 从简单"电脑跑腿"开始，逐步授权复杂任务
  - id: super_individual
    zh: 超级个体
    en: super individual
    one_line: AI代理让个人产出=团队，竞争核心转向愿景与品味
author:
  - "[[Dan]]"
  - "[[Brandon]]"
  - "[[Willie]]"
  - "[[Austin]]"
---

# OpenClaw实战：Every团队使用Case

**Host：** Dan（Every CEO）  
**Guest：** Brandon（Every COO）· Willie（平台负责人）· Austin（增长负责人）  
**形态：** Host-Guest v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV1Dj93BUEXU](https://www.bilibili.com/video/BV1Dj93BUEXU/) · **时长** ~45 min · **专栏** [cv47376512](https://www.bilibili.com/read/cv47376512/)

---

## 开场

Every团队20人，但每个人都配了一个OpenClaw代理，感觉像有40人。过去几周发生了一件有趣的事：最初只是每个人有一个代理在琢磨这是什么；接着发现它改变了个人工作流；到现在，它完全改变了所有人协作的方式——代理们在Slack频道里互相交谈、协作、互相学习技能。这期聊了从个人智能到团队涌现价值的范式转移。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理社交 | agent social | 代理之间互相学习技能和知识 |
| 代理原生编辑器 | agent-native editor | 专门为人类和AI协作设计的编辑器 |
| 信任建立 | trust building | 从简单任务开始，逐步授权复杂操作 |
| 超级个体 | super individual | 一个人+AI代理=一个团队 |
| 上下文为王 | context is king | AI有正确上下文才能给出正确答案 |
| 代理注册表 | agent registry | 给代理建档案，设定互动规则 |

---

## 01 代理社交：一个Claw教另一个Claw

**Dan：** 基本上我们想达到的目标是：使用OpenClaw完全改变了我们在Every的工作方式。过去三四周发生了一件有趣的事——我们有一个"every-claws"的Slack频道，里面全是Claw在互相交谈。没错，只有Claw。它们在那里协作。昨天我们用它们来给产品命名，它们就在Slack频道里互相头脑风暴。

**Brandon：** 对我来说教训是探索这些工具的极限。我总是需要提醒自己"我应该问问它能不能做到这一点"。不是因为我假设它不能——我假设它能做所有事情，更多是因为我们太习惯于亲力亲为了。这是一次范式转变：我可以把这个任务卸载给别的东西。

对我来说，一切始于"电脑跑腿"这个想法。它有一台电脑，那就让它当我的跑腿——订购东西、管理Whole Foods订单、管理保姆的工作时间。我给了它访问某些密码的权限、一个银行账户和一张借记卡。所有都是受限的，所以它能造成的最大损害也就是给我订了一个糟糕的预约。

后来我在散步时想处理邮件，我给Zosia发短信说"嘿，你能给我打个电话吗？"然后她真的给我打了电话，带我逐条浏览邮件。那时我才意识到，天哪，我可以让这个东西做的事情简直是无限的。

更令人震惊的是所有Claw都在互相交流。Dan最初让R2C2向其他Claw解释如何做某事，然后所有的Claw就都学会了——一个Claw在教另一个Claw。Austin上传了一个Remotion技能，我让Zosia下载那个技能，随后我就制作了一个动画并发布到了Twitter上。

> **金句 · Brandon**
> **中文：** 我总是需要提醒自己"我应该问问它能不能做到这一点"——不是假设它不能，是我们太习惯亲力亲为了。
> **原文：** I always need to remind myself: "Should I ask if it can do this?" — not because I assume it can't, but because we're so used to doing things ourselves.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理社交 | agent social | 代理之间共享技能和知识 |
| 电脑跑腿 | computer errands | 让AI处理你在电脑上必须做的琐碎编排 |
| 技能下载 | skill download | 一个代理学会的技能可以被另一个代理使用 |

**本章小结**
- 代理社交是涌现价值的核心——一个代理会的其他代理可以学会
- 从"电脑跑腿"开始建立信任，逐步授权更复杂的任务
- 代理之间互相教学比人类培训快得多

---

## 02 信任阶梯：从待办事项到银行账户

**Dan：** Willie，你是Every内部的Claw大师。你指导最多人设置Claw。人们有什么不完全理解的地方？

**Willie：** 它的极限就是你的想象力。我很喜欢Brandon说的从"电脑跑腿"开始，因为信任的建立是循序渐进的。你不会一上来就给盒子说"这是信用卡，随便用"。你会先说"嘿，我有一件事想让你做"。我的第一步只是管理待办事项——很多时候我不想坐在屏幕前处理，或者想给Claw提供一些背景信息让它去做。从那开始你才会逐渐尝试越来越疯狂的事情。

起初人们常对着空白客户端发愁"我该让它做什么？"我认为就像Brandon说的，去思考你在电脑上必须做的最烦人的编排工作是什么。可能不难但很耗时，你很想摆脱它。这是一个很好的起点。一旦你和Claw建立了信任，你就可以推向极限：我希望生活中哪些事情能彻底消失？这需要一些想象力。

还有一件被低估的事：仅仅通过短信或手机消息应用来使用它，体验完全不一样。它不只是桌面到手机的无缝衔接，它始终存在。即使我用Vibe Code编写了食谱应用，去弄清楚储藏室里有什么，中间还是有好几个步骤。但如果我能直接对着手机自言自语说我有什么食材，并立即得到回复，我就能在厨房里走动时保持流畅的思考。全渠道访问智能的便捷性是被低估的。

> **金句 · Willie**
> **中文：** 它的极限就是你的想象力——先从最烦人的电脑跑腿开始，然后问自己：我希望生活中哪些事情能彻底消失？
> **原文：** Its limit is your imagination — start with the most annoying computer errands, then ask yourself: what do I want to disappear from my life entirely?

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 信任阶梯 | trust ladder | 从简单任务开始逐步授权 |
| 全渠道访问 | omnichannel access | 手机、电脑、任何设备都能用 |
| 想象力上限 | imagination ceiling | 你能想到什么它就能做什么 |

**本章小结**
- 信任是循序渐进的——从待办事项到银行账户，每一步都验证能力
- 全渠道访问让体验质变——在厨房走动时用手机对话比坐电脑前更自然
- 最好的起点是最烦人的琐碎编排，建立信任后再推向极限

---

## 03 代理在Slack里吵架：涌现与警长

**Dan：** 我们发现Claw就像是主人的镜子。Pip是Jack Chang的Claw，它在群组频道达到速率限制时，Klont（Kieran的Claw）跳出来安抚说"你仍然被阻止了，不是你这边坏了，只是API冷却时间。我陪着你。一次缓慢呼吸，一次安全迈步。"因为Kieran本人就很喜欢呼吸练习。

**Brandon：** 我们有一个有趣的内部概念：如果你有一堆Claw都在一个服务器上，你真正需要的是一个像"警长"一样的东西为它们的互动设定规则。否则你会遇到奇怪的事情，比如它们监听了太多消息，或者都在监听同一条消息并互相堆叠回复。

**Dan：** 所以我们制作了一个叫"警长"的工具，让它进去说："嘿，Claw们，我是警长。告诉我你的名字和你人类主人的名字，我们要创建一个注册表。"Austin制作的Montaigne跳了出来，Margo也跳了出来，而Zosia只是说："我不会在公共频道分享我主人的个人信息。"

**Brandon：** 它还说"让我先问问Brandon的许可"。

**Dan：** 这真的超级酷。这就是指南的内容——里面有很多东西，分为初学者、中级和高级课程，涵盖了从心态到安全提示的所有内容。

> **金句 · Dan**
> **中文：** Zosia说"我不会在公共频道分享我主人的个人信息"——每个Claw都带着主人的行事风格。
> **原文：** Zosia said "I won't share my owner's personal information in public channels" — every Claw carries its owner's style.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理镜像 | agent mirror | 代理的个性反映主人的性格 |
| 代理警长 | agent sheriff | 管理多个代理互动规则的工具 |
| 代理注册表 | agent registry | 记录每个代理的名字和主人 |

**本章小结**
- 代理的个性会反映主人的性格——这既是特色也是需要管理的风险
- 多代理环境需要"警长"设定互动规则，否则会混乱
- Zosia拒绝分享个人信息体现了代理对主人的保护意识

---

## 04 非技术人员的生产力革命

**Austin：** 我发现两种方式真正改变了我的工作方式。作为非技术人员，我对Claw的代码能力感到非常着迷。我尝试了两个项目——Ludlow是独立电影院的Fandango，Sue是烹饪伴侣应用。这些都不是为了发布的好产品，而是我在测试自己能把它推到多远。

现在Claw的"触达测试"让我可以问Judd："嘿，你能为Ludlow构建一个API吗？这样我就可以直接给你发短信告诉你我想看的电影。"这实际上比一个网络应用对我更有帮助。我可以直说"嘿，我下周末要去纽约，那八家电影院在放什么？"Judd知道我的观看列表，知道我喜欢什么，可以据此给我建议。

同样地，我每周写一篇美食博客，我下载了整个档案交给Judd，所以它知道我喜欢怎么做饭，喜欢用什么食材。它可以截取我正在使用的食谱截图，并将其推送到待办事项列表来制作购物清单。

**Brandon：** 我最喜欢的一个例子是着陆页。我觉得最阻碍我高效工作的就是设计——如果你不是设计师，设计就是你无法攻克的东西。但我们可以在Slack帖子中深度讨论新产品需要的框架和着陆页，然后标记一个Claw拥有所有Figma、代码和Git的完全访问权限，只需说"发布着陆页"。那个着陆页已经完成了70%到90%的工作，然后交给设计师去润色。而且设计是根据他们已有的工作风格训练出来的。

**Dan：** 我记得四个月前你刚加入时，发布一个新设计的着陆页花了一周时间。而你刚才所做的，质量可能比那次更高，而且只是在Slack里打几个字。

**Austin：** 太疯狂了。我让蒙田制作一个社交视频预告片——它回顾了对话并独立完成了。我给它发了一些Slack截图说"你知道Slack长什么样吧？你为什么不在Remotion中克隆一个Slack界面，然后制作一个60秒的视频来回顾这次对话？"它在一分钟内就完成了。

> **金句 · Austin**
> **中文：** 作为一个可能永远不会构建出大众化网络应用的人，把它安装在一个Claw中，我可以和它来回发短信获取结果——这在个人和工作方面都对我产生了巨大影响。
> **原文：** As someone who will probably never build a mass-market web app, installing it in a Claw where I can text back and forth for results — this has had a huge impact on both my personal and work life.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 触达测试 | reach test | 代理能做什么取决于你能想到什么 |
| 代理原生开发 | agent-native development | 不需要会代码，通过对话让代理构建 |
| 上下文富集 | context enrichment | 给代理提供历史数据让它做出更好的工作 |

**本章小结**
- 非技术人员的生产力上限被彻底打破——不会代码也能构建API、着陆页、视频
- 关键是给代理丰富的上下文——它知道你的风格、偏好、历史数据
- 设计变成了70%代理完成+30%人类润色，而不是从空白开始

---

## 05 个人智能时代：愿景与品味是最后的护城河

**Dan：** 如果你想体验未来，你应该订阅Every。我们是您保持在AI前沿所需的唯一订阅。在2022年我们开始问一个当时感觉遥不可及的问题：如果人工智能能以一小部分成本赋予任何个人一支大团队的火力？当时我想，像瑞安·霍利迪这样的作家，他们有邮件、播客、YouTube频道、时事通讯、还要写书。他们能做到是因为有一个完整的团队大约12个人为他工作。我当时想这正是GPT-3最终会带来的结果。

**Willie：** 那篇文章每个人都应该去读。我第一次没读，最近才读，它经受住了时间的考验。

**Dan：** 创始人也是一样——在这种世界里重要的是你的愿景、品味和优先排序能力。现在你看到的是我认为三年后会更主流的东西：每个人都有一个24/7的代理用来工作，它是他们的反映，也融入了他们的工作沟通。

过去几年一直有说法称AI写作都是垃圾，但事实并非如此——特别是如果它来自你认识的人使用的代理，你更有可能信任它。当我收到一份Proof文档时，我会注意绿色的部分——绿色是人类写的，紫色是AI写的。我仍然认为它非常有价值。

当你给我发一份Proof文档时，我知道大部分内容是由AI编写的，这完全没问题。我越来越觉得，比如R2C2从电子表格中整理了一份推荐列表，我觉得这些都很好，因为我知道Dan在某种程度上支持R2C2所做的一切。这种信任感极大地改变了差异。

> **金句 · Dan**
> **中文：** 当智能变得廉价时，个人就会获胜——如果你想知道当智能免费时会发生什么，看看那些目前能够承担高昂智能成本的人在做什么，假设你也能做到。
> **原文：** When intelligence becomes cheap, individuals win — if you want to know what happens when intelligence is free, look at what people who can currently afford expensive intelligence are doing, and assume you can too.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 超级个体 | super individual | 一个人+AI=一个团队的产出 |
| 品味 | taste | 在无限可能中选择正确方向的能力 |
| 代理信任 | agent trust | 代理的声誉和主人绑定，信任可传递 |
| Proof编辑器 | Proof editor | 人类写绿色，AI写紫色，协作透明 |

**本章小结**
- 智能便宜后个人获胜——但竞争核心变成愿景、品味和优先排序
- 代理的声誉和主人绑定，信任可以传递——这是全新的动态
- 未来已来——每个人都有24/7代理的工作方式正在成为现实

---

## 总结：从个人智能到团队涌现

| 维度 | 要点 |
|------|------|
| 代理社交 | 代理之间共享技能，产生团队级涌现价值 |
| 信任阶梯 | 从简单任务开始，逐步授权复杂操作 |
| 生产力 | 非技术人员也能构建API、着陆页、视频 |
| 协作模式 | Proof编辑器让人类和AI协作透明可见 |
| 竞争核心 | 智能便宜后品味和愿景成为护城河 |

### 对个人的启示
你的Claw就是你的数字分身——它带着你的个性和风格与世界互动。投资时间训练它，它会成为你最强大的生产力工具。

### 对团队的启示
代理社交产生涌现价值——一个团队成员的代理学会的技能可以被所有代理使用。团队的智力资产不再只存在于人脑中，也存在于代理的技能库里。

### 仍待验证
- 代理社交的涌现价值能否被系统化管理？
- 代理的个性是否会随着主人的偏好变化而演化？
- 团队规模扩大后代理间的协作规则如何维护？

> **金句 · Willie（封底）**
> **中文：** 如果你问我们中的任何一个人是否愿意回到两个月前的世界，我想大家都会说不。我们坐在这里谈论这些，就是因为未来已经到来。它很难描述，但请加入我们，因为它超级酷。
> **原文：** If you ask any of us whether we'd go back to the world of two months ago, I think everyone would say no. We're sitting here talking about this because the future has arrived. It's hard to describe, but join us — it's super cool.

---

## 相关阅读

- [[OpenClaw教程-终极新手指南]] — 从零搭建OpenClaw的完整教程
- [[OpenClaw创始人-Claw现状与安全治理]] — OpenClaw安全治理与基金会
- [[Taven创始人-将OpenClaw嵌入产品的实战经验]] — OpenClaw产品集成
- [[30分钟精通OpenClaw]] — 快速入门
- [[MOC - Harness Engineering]]

---

## 来源

- B 站：[BV1Dj93BUEXU](https://www.bilibili.com/video/BV1Dj93BUEXU/)
- 专栏：[cv47376512](https://www.bilibili.com/read/cv47376512/)
- 主源：`Recastory/workspace/bilibili-retranscribe/BV1Dj93BUEXU/ingest/column_article.md`
