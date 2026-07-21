---
title: "a16z前合伙人-关于AI最理性简介"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_career", "ai_philosophy"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_career", "ai_philosophy"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1ToE56KE7E/"
description: "a16z前合伙人Benedict Evans深度剖析AI浪潮本质：AI堪比互联网但非工业革命，正处于1997年早期阶段，基础模型将商品化，分发才是更深护城河，应对焦虑的唯一策略是沉浸。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/a16z前合伙人-关于AI最理性简介.md"
source_sha256: "1cf2b355fe243f2f7f68e51d9cd554b9531fbec387100e851a10cfe44b5b198b"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1ToE56KE7E/"
column_url: "https://www.bilibili.com/read/cv50257049/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1ToE56KE7E/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1ToE56KE7E/ingest"
duration: "~85 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Lenny Rachitsky"
guest_name: "Benedict Evans"
guest_title: "a16z前合伙人、独立科技分析师"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Easonlee的AI笔记]]"
concepts:
  - id: ai_as_internet
    zh: AI堪比互联网但非工业革命
    en: AI comparable to internet, not industrial revolution
    one_line: AI是继移动互联网后的平台级转变，但目前正处于1997年早期阶段
  - id: task_vs_job
    zh: 任务vs工作
    en: task vs job
    one_line: 自动化任务不等于自动化工作，Excel出现后会计师反而更多了
  - id: commoditized_models
    zh: 基础模型商品化
    en: commoditized foundation models
    one_line: 模型将像电力一样成为无差异化的公用事业，价值沉淀在应用层
  - id: distribution_moat
    zh: 分发护城河
    en: distribution moat
    one_line: 在AI时代，分发是比技术更深的护城河
  - id: radical_uncertainty
    zh: 激进的不确定性
    en: radical uncertainty
    one_line: 我们缺乏关于AI智能的底层理论，所有预测本质上都是凭感觉
---

# 不要把头埋在沙子里说讨厌AI——那是道德优越感，不是策略

> 对谈：Lenny Rachitsky × Benedict Evans（a16z前合伙人）| 来源：Lenny's Podcast

---

## 开场：为什么现在聊这个

Benedict Evans 是a16z的长期合伙人和内部分析师，现在是独立科技分析师。他刚发布了80页的《AI正在吞噬世界》幻灯片，核心结论让很多人意外：AI很重要，但它的影响力"仅限于"堪比互联网——不是工业革命级别。目前我们正处于1997年的早期阶段。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 平台级转变 | platform shift | 类似移动互联网的底层技术范式更替 |
| 任务vs工作 | task vs job | 自动化一个任务≠消灭整个职业 |
| 杰文斯悖论 | Jevons paradox | 工具变便宜后需求反而激增，会计师越用Excel越多 |
| 商品化 | commoditization | 产品变得无差异化，利润流向应用层 |
| 分发 | distribution | 把产品送到用户手里的能力，比技术本身更难复制 |
| 激进的不确定性 | radical uncertainty | 缺乏底层理论，无法预判AI走向 |
| 劳动总量谬误 | lump of labor fallacy | 认为工作总量固定的错误观念 |

---

## 01 AI影响力堪比互联网，但不是工业革命

**Lenny：** 你认为人们在思考AI将如何改变生活和工作时，仍然没有完全考虑到什么？

**Benedict：** 我最具争议的观点是，AI的影响力堪比互联网或移动技术，但也仅限于此。科技界有一群人认为这更像是工业革命。但我说：智能手机可是个大事件，互联网也是个大事件。如果我们深入挖掘，拿互联网做比较，那我们现在就像身处1997年。

大多数东西都还不能用。人们将要做的大部分事情都还没有建成。那些已经接受它的人想象世界上所有人都已经接受了，但事实是：即使13到18岁的年轻人，也只有15%到20%是日活跃用户，另外20%是周活跃用户。其他60%根本没在用。

我们回到1997年的那种时刻：好吧，这是什么？你可以说一些看法，但必须保持谦逊。

> **金句 · Benedict**
> **中文：** 如果我们拿互联网做比较，那我们现在就像身处1997年——大多数东西都还不能用。
> **原文：** If you use the internet as a comparison, we're basically in 1997 — most stuff doesn't work yet.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 1997年时间线 | 1997 timeline | 类比互联网发展早期，一切刚刚开始 |
| 锯齿状前沿 | jagged frontier | AI能力边界参差不齐，有些地方很强有些不行 |
| 技术成熟度差异 | maturity gap | 科技圈内外对AI的理解差距巨大 |

**本章小结**
- AI堪比互联网或移动技术，但不是工业革命级别
- 目前处于1997年早期阶段：大多数东西不能用，赢家尚未浮现
- 科技圈和普通公众之间存在巨大的理解和采纳鸿沟

---

## 02 自动化不会消灭会计师，只会增加其数量

**Benedict：** 每次我们有新技术，它都会自动化掉一批工作。然后这种自动化，无论是价格弹性还是自动化带来的便利，都会解锁一批新工作。你总是能看到即将消失的工作，但你不知道新的工作会是什么，因为它还不存在。

回到1800年，我们90%的人都是农民。从那时起，我们一直在自动化旧工作并创造新工作。任何一年级经济学学生都会告诉你这一点。

经典的例子是电梯服务员。按按钮本身就是一项工作。自动化之后发生了什么？更多的工作。这就是杰文斯悖论——如果你让做某事变得更便宜，你是用更少的钱做同样的事情，还是用同样的钱做更多的事情？还是你用更多的钱做更多的事情？

看看会计史：在Excel出现之前，初级投资银行家的工作时间很长。现在多亏了Excel，高盛的同事们周五午餐时间就能完成所有工作了吗？并没有。20世纪会计师的就业人数一直在增加——加法机、打孔卡、大型机、数据库、ERP和云——而会计师的数量一直在增加。

> **金句 · Benedict**
> **中文：** 你总是能看到即将消失的工作，但你不知道新的工作会是什么，因为它还不存在。
> **原文：** You can always see the jobs that are about to disappear, but you don't know what the new jobs will be because they don't exist yet.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 任务vs工作 | task vs job | Excel自动化了算账的任务，但没有消灭会计师这个职业 |
| 杰文斯悖论 | Jevons paradox | 工具变便宜后需求激增，而不是从业者减少 |
| 劳动总量谬误 | lump of labor fallacy | 认为工作总量固定是错误的，新技术总是创造新需求 |

**本章小结**
- 自动化任务不等于自动化工作——Excel出现后会计师反而更多了
- 杰文斯悖论：工具变便宜后，社会对该服务的需求因价格弹性而激增
- 新技术总是创造新工作，但新工作的形态当下无法预见

---

## 03 基础模型将走向商品化与低利润

**Benedict：** 模型实验室目前缺乏网络效应和定价权。如果你考虑：三到五家公司销售本质上相同的东西，那为什么会有定价权？价值应该会流向堆栈的更上层。

萨姆·奥特曼有一句很棒的话："我们将像卖水或电一样，按计量销售人工智能智能。"但当你收看电视时，电视公司不会将你每月账单的一部分支付给电力公司。当你洗衣服时，博世也不会支付洗衣机价格的百分比给电厂。

如果你看看电信业——全球移动行业的年收入约一万亿美元，每年资本支出约2000亿。但这些股票在25年里几乎没有上涨，因为它是一个增长停滞、利润率低、商品化的公用事业。所有酷炫的东西都是由应用层制造的。

如果模型是无差异化的商品基础设施提供商，那谁会有定价权？答案是：应该没有。价值应该流向应用层。

> **金句 · Benedict**
> **中文：** 模型将像电力一样成为公用事业——所有酷炫的东西都由应用层制造。
> **原文：** Models will become utilities like electricity — all the cool stuff gets built at the application layer.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 无差异化商品 | undifferentiated commodity | 多家公司卖本质相同的东西，没有定价权 |
| 堆栈价值 | stack value | 商业价值在技术栈的哪一层沉淀 |
| 公用事业利润结构 | utility profit structure | 电力公司利润率低，利润留给应用层 |

**本章小结**
- 基础模型缺乏网络效应和定价权，可能变成无差异化商品
- 类比电信业：技术极其复杂但利润低，价值在应用层
- 真正的商业价值沉淀在解决具体业务问题的应用层

---

## 04 分发是比技术更深的护城河

**Benedict：** 现有企业总是试图将新事物变成一个功能。a16z的Stephen Sinofsky曾负责Windows业务，他总是说这句话。

在AI时代，分发是比技术更深的护城河。因为软件现在更容易构建，每个人都在发布产品，争夺注意力的竞争变得疯狂。这意味着现有企业会更加成功，因为它们已经拥有分发渠道。

谷歌正在利用其分发渠道来推动Gemini。Meta也被喷洒在每个表面上，到处都是。它没那么糟，甚至还不错。当领域基本上商品化时，一个"足够好"的产品加上强大的分发和品牌，就变得非常重要。

你可以看看谷歌、苹果、Facebook、亚马逊，很难看出它们目前有什么大问题。移动化对谷歌没改变什么，对亚马逊也没改变什么——它们的分发渠道太强了。关键在于，AI是新的功能层，被整合进现有分发渠道。

> **金句 · Benedict**
> **中文：** 当产品本身成了商品，分发才是最重要的。现有巨头正在把AI变成产品的一个功能。
> **原文：** When the product itself becomes a commodity, distribution is what matters most. Existing giants are turning AI into a feature.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 功能化 | feature-ification | 现有巨头把新技术变成产品功能而非新产品 |
| 分发护城河 | distribution moat | 把产品送到用户手里的能力比技术本身更难复制 |
| 品牌溢价 | brand premium | "足够好"+强品牌胜过技术最优但无分发 |

**本章小结**
- 现有企业把AI变成产品功能，而不是新产品——这是它们最擅长的事
- 分发渠道是比技术更深的护城河，谷歌/Meta/苹果的分发优势AI无法撼动
- "足够好"+强分发 胜过 技术最优但无分发

---

## 05 应对AI焦虑的最佳策略是完全沉浸

**Lenny：** 面对AI焦虑，你建议人们做什么？

**Benedict：** 不要把头埋在沙子里说"我讨厌所有这些东西"。那会给你极大的道德优越感，你可以在Blue Sky上向所有人大喊AI有多邪恶。这很好，我为你高兴，但这并没有什么帮助。

有帮助的是你深入研究它，完全沉浸其中，了解你能用它做什么。这如何改变事物，你如何能成为一个优秀的雇员。

你去一家律师事务所，他们说去年雇佣了100名助理，今年只雇50名。你去面试时说你认为AI是胡说八道，永远不会使用它——这不是正确的态度。你必须深入研究它，吸收它，内化它，思考它意味着什么。

这可能仍然没有帮助，但没有替代方案。就像我们当初在移动互联网上所做的那样——去做事情，去建造它，不要只是坐着空谈。

> **金句 · Benedict**
> **中文：** 把头埋在沙子里说讨厌AI，那是道德优越感，不是策略。唯一有用的策略是沉浸其中。
> **原文：** Burying your head in the sand saying you hate AI gives you moral superiority, not a strategy. The only useful strategy is to immerse yourself in it.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 沉浸策略 | immersion strategy | 深入研究AI边界和用法，而非拒绝 |
| 道德优越感陷阱 | moral superiority trap | 在社交媒体批判AI获得认同感，但不解决实际问题 |
| 理解边界 | understanding boundaries | 知道AI在哪里有效、在哪里无效，是最核心的竞争力 |

**本章小结**
- 反AI情绪是道德优越感，不是策略——沉浸其中才是唯一解
- 理解"什么是任务，什么是工作"是保持竞争力的核心
- AI的边界在哪里：它擅长计算机不擅长的事，不擅长计算机擅长的事

---

## 06 激进的不确定性是当前的主旋律

**Benedict：** 我们没有关于人类智能是什么的理论，没有关于这些模型为何如此有效的理论，也没有关于它们能变得多好的理论。所以我们都只是凭感觉预测会发生什么。

这种"激进的不确定性"意味着我们无法预判哪些职业会被重塑。就像1997年的人无法预见Uber会如何改变交通一样。你可以争辩说这将快得多，但互联网当时也很快——它只是站在巨人的肩膀上。

即使模型明天停止改进，如果我们明天就撞墙了，这仍然是一项令人难以置信的有用技术，它将在未来十年改变世界并推广开来。所以你不需要相信科幻的东西，就能相信这是一个巨大的变化。

AI就像"技术"这个词——如果是新的，那就是技术；但在60年代，喷气式客机就是技术，现在喷气式客机不是技术了。AI是一个移动的目标，它指的是那些刚刚开始工作的东西。

> **金句 · Benedict**
> **中文：** 我们没有关于AI智能的底层理论，所有预测本质上都是凭感觉。激进的不确定性是唯一诚实的立场。
> **原文：** We have no underlying theory of AI intelligence. All predictions are essentially gut feel. Radical uncertainty is the only honest position.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 激进的不确定性 | radical uncertainty | 缺乏底层理论，无法预判AI会走向何方 |
| 站在巨人肩膀上 | standing on shoulders of giants | AI发展快是因为站在互联网/移动互联网的基础上 |
| 移动的目标 | moving target | AI定义不断变化，今天"AI做的事"明天就叫"软件" |

**本章小结**
- 缺乏AI智能的底层理论，所有预测都是凭感觉
- 即使模型停止改进，当前能力已足以改变世界十年
- 激进的不确定性要求我们保持谦逊，同时积极行动

---

## 总结：理性看待AI——很大但不确定，唯一策略是沉浸

| 维度 | 要点 |
|------|------|
| 技术定位 | AI堪比互联网但非工业革命，处于1997年早期 |
| 就业影响 | 自动化任务≠自动化工作，新工作当下无法预见 |
| 商业价值 | 基础模型商品化，价值沉淀在应用层 |
| 竞争格局 | 分发是比技术更深的护城河，巨头占优 |
| 个人策略 | 沉浸其中了解边界，别在道德优越感上浪费时间 |
| 认知框架 | 激进的不确定性是唯一诚实立场 |

> **金句 · Benedict（封底）**
> **中文：** 每次我们有新技术，它都会自动化掉一批工作。然后这种自动化又会催生一批新工作，而你不知道这些新工作是什么，因为它们目前还不存在。
> **原文：** Every time we get a new technology, it automates away a batch of jobs. Then that automation creates a new batch of jobs that you don't know about because they don't exist yet.

---

## 附录

**章节时间戳**
- 01:10 AI影响力堪比互联网但并非工业革命
- 14:20 自动化不会消灭会计师，只会增加其数量
- 32:45 基础模型将走向商品化与低利润
- 41:15 分发是比技术更深的护城河
- 65:10 应对AI焦虑的最佳策略是完全沉浸
- 72:30 激进的不确定性是当前的主旋律

**Ingest 信息**
- column_source: Recastory/workspace/bilibili-retranscribe/BV1ToE56KE7E/ingest/column_article.md
- asr_status: column_s_tier

**相关阅读**
- [[a16z创始人-浏览器末日与OpenClaw]] — a16z创始人的AI技术乐观视角
- [[Every CEO-全员AI后员工数翻3倍]] — AI时代组织与职业的实际变化
- [[Speechify CEO-从100位CEO学到经验]] — AI时代的增长方法论与人才观
