---
title: "Stripe 设计主管：用 AI 设计新网站"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "ai_philosophy"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "ai_philosophy"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1eS9CBjESZ/"
description: "Stripe 设计主管 Katie Dill 复盘新主页打磨：AI 将探索效率提升 10 倍但从 7 分到 10 分仍需人工；便当盒布局解决产品线扩张叙事；对抗平庸的引力是卓越公司的分水岭。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/AI编程实战/Stripe设计主管-用AI设计新网站.md"
source_sha256: "4806646c89bdede0ea21c0dfa7047608ef8efb1ed275362721d31b068337e17a"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1eS9CBjESZ/"
column_url: "https://www.bilibili.com/read/cv48802227/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1eS9CBjESZ/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1eS9CBjESZ/ingest"
duration: "35:00"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Aaron Epstein"
guest_name: "Katie Dill"
guest_title: "Stripe 设计主管 · VP Design"
author:
  - "[[Katie Dill]]"
concepts:
  - id: website_as_manifesto
    zh: 网站是公司的宣言
    en: website as company manifesto
    one_line: 网站不是产品目录，而是品牌价值观的宣言
  - id: progressive_disclosure
    zh: 渐进式披露
    en: progressive disclosure
    one_line: 不让用户被信息淹没，先给概览再给细节
  - id: ai_baseline_7_of_10
    zh: AI 交付 7 分基线
    en: AI delivers 7/10 baseline
    one_line: AI 把底线拉到 7 分，但从 7 到 10 仍需人工打磨
  - id: anti_mediocrity_gravity
    zh: 对抗平庸的引力
    en: anti-mediocrity gravity
    one_line: 接受「足够好」太容易了，卓越公司选择对抗这种引力
  - id: bento_box_layout
    zh: 便当盒布局
    en: bento box layout
    one_line: 网格化卡片展示产品矩阵，兼顾信息量与浏览轻盈感
---

# Stripe 设计主管：用 AI 设计新网站

**Host：** Aaron Epstein（Design Review 主持）  
**Guest：** Katie Dill（Stripe 设计主管 · VP Design）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 访谈实录）  
**B 站：** [BV1eS9CBjESZ](https://www.bilibili.com/video/BV1eS9CBjESZ/) · **专栏** [cv48802227](https://www.bilibili.com/read/cv48802227/) · **时长** ~35 min

---

## 开场

Stripe 的主页六年没换过——不是因为它差，而是它经受住了时间考验。但当业务从支付延伸到计费、税收、AI 订阅，旧网站「不断加版块、无限滚动」的方式已经讲不清 Stripe 的故事了。设计主管 Katie Dill 带队用了一年多打磨全新主页。AI 把原型探索效率提升了 10 倍，但从 7 分到 10 分的跨越，仍然需要人来扛。

六章：**网站是宣言不是目录** → **便当盒布局与渐进式披露** → **动画的意图性** → **AI 提升底线但无法取代品味** → **对抗平庸的引力** → **逛商店文化与产品腐化检测**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 便当盒 | bento box | 网格化卡片布局，像便当格子一样分隔内容 |
| 渐进式披露 | progressive disclosure | 先给概览，用户想深入再展开，不一次倒完 |
| 逛商店 | shop the store | 跨职能团队像真实用户一样走一遍产品流程 |
| 产品腐化 | product rot | 各部门独立迭代导致体验不连贯 |
| MVQP | minimum viable quality product | 最小可行质量产品——质量是底线不是可选项 |
| 设计系统 | design system | 组件库 + 使用规范，帮团队规模化保持一致 |

---

## 01 网站是宣言：不是产品目录

**Aaron Epstein：** 新主页上线了。先回顾一下旧网站——那是六年前的版本。

**Katie Dill：** 六年了，向团队致敬。旧网站实际上运行得相当不错，我们并没有觉得「必须改变它」。改变是因为业务的发展已经超出了这个网站所能讲述的故事范围。我们最初以支付为核心，现在我们服务订阅、基于使用量的计费、税收、稳定币、平台业务……在旧网站上，这些都只是页面上的一个瓷砖。故事缺失了。

**Aaron Epstein：** Patrick（Collison）问过「网站的意义到底是什么？」这个问题。

**Katie Dill：** 我认为其中一部分是——**它是你的宣言**。无论你是否明确地这样称呼它，你都在展示你是谁，你在做什么，你为什么这样做。你选择什么颜色、什么字体、关注哪些细节、忽略哪些细节——这些都在表达你的价值观。所以我们着手确保故事对服务对象、服务方式和关心什么都清晰。

**Aaron Epstein：** 你们花了多长时间？

**Katie Dill：** 一年多。我们并没有急于推出。就像为用户构建产品时必须尽快，但网站在很多方面是为了我们自己——我们可以花时间找出正确的设计。我们经历了许多周、许多月的设计探索。有些方案我们很喜欢，但最终会想：「不，不是那个。我们还没准备好让公司『穿那件衬衫再穿六年』。」

> **金句 · Katie Dill**
> **中文：** 网站是你的宣言——你选择什么颜色、关注什么细节、忽略什么，都在表达你是谁。
> **原文：** Your website is your manifesto — the colors you choose, the details you attend to, and the ones you ignore, all express who you are.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 宣言 | manifesto | 价值观的外化，不是功能列表 |
| 业务叙事 | business narrative | 网站要讲清楚你是谁、服务谁、为什么 |
| 设计探索期 | design exploration phase | 花时间找到对的方向，不急着 ship |
| 穿六年衬衫 | dress for six years | 主页是长期品牌决策，不是临时方案 |

**本章小结**

- 旧网站没问题，但业务扩张让叙事跟不上
- 网站 = 宣言，不是产品目录；每个设计选择都在表达价值观
- 一年探索期不急——主页是「穿六年」的决定

---

## 02 便当盒与渐进式披露：产品线扩张的叙事解法

**Aaron Epstein：** 你们的产品套件很复杂——支付、计费、税收、AI 订阅、稳定币……怎么在一页里讲清楚？

**Katie Dill：** 我们称之为「便当盒」。最大的区域试图解决产品规模的表达问题。你看到了支付、终端计费、基于使用量的计费、AI 角色、发行产品、稳定币、平台业务……但文字很少。我们只想把重点表达清楚，让你大致了解「这可能适合我」。

**Aaron Epstein：** 然后你加了模态框。

**Katie Dill：** 对。我们想「展示而非陈述」——用图片、动画呈现，而不是密密麻麻的文字。然后通过叠加层这种更大的模态框快速获得更多信息，**这样你就不必离开主页**。我们还没有把你带离，但你可以深入探索。这些产品有几十种，不能在一个页面全部展示。

**Aaron Epstein：** 我之前见过手风琴折叠件的方案——用户要点击才能展开。

**Katie Dill：** 我们做了用户研究，结果并不意外：它并不是让人快速消化大量信息的好方法。需要用户付出努力——点击标签，大多数人根本不会点击。**便当盒布局最终胜出，因为它更具视觉冲击力，而且对用户更友好**——他们可以保持放松的浏览状态，而不是被迫做决定。

> **金句 · Katie Dill**
> **中文：** 如果把最重要的信息藏在点击之后，你就是在强迫用户做决定——他们还没准备好。
> **原文：** If you hide the most important information behind a click, you're forcing users to make a decision they're not ready for.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 便当盒 | bento box | 网格卡片，像便当格子一样分隔内容 |
| 渐进式披露 | progressive disclosure | 先给概览，想深入再展开 |
| 模态框 | modal overlay | 在当前页弹出详情，不跳转 |
| 展示而非陈述 | show, don't tell | 用图像/动画传递，不用文字堆砌 |

**本章小结**

- 产品线太多，无限滚动讲不清故事——便当盒网格解决信息过载
- 模态框让用户不离开主页就能深入探索
- 手风琴折叠件用户研究失败：点击成本太高，没人愿意点

---

## 03 动画的意图性：拒绝为了动画而动画

**Aaron Epstein：** 每张卡片里都有动画。怎么在不过度和不分散注意力之间找平衡？

**Katie Dill：** 这就是原型设计和实验发挥作用的地方。一开始线条太多，然后又太少，球移动得太快。你确实需要非常精细地调整。**我们试图表达的是对工作的用心**——如果你看到这里的用心，你就更有理由认为我们在幕后也同样用心，无论是转移资金还是保护信息。

**Aaron Epstein：** 你说的「用心」怎么理解？

**Katie Dill：** 动画必须具备功能意图——作为交互反馈，或传达全球资金流动的实时感。如果动画无法体现对细节的爱与关怀，就会沦为干扰用户的噪音。有些版本我们只是把数字放在那里，但我们这样做是为了增加一点趣味——它大致传达了指标的意图。它还根据一天中的时间变化。

**Aaron Epstein：** 你们推迟了 12 月上线，因为动画不够流畅。

**Katie Dill：** 对。我们已经有不错的东西了，四个动画都有了，但它们之间的过渡细节感觉有点笨拙，没有达到应有的流畅度。这是集体决定——**我们觉得应该等待，应该把它做好**。我们本可以只做三个，或者只做一个，或者根本不动手。但这是一个值得的决定。从长远来看，它在整体构图中的感觉非常好。

> **金句 · Katie Dill**
> **中文：** 动画必须有功能意图——如果你看不到背后对细节的爱与关怀，它就是噪音。
> **原文：** Animation must have functional intent — if you can't see the love and care behind the details, it's just noise.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 功能意图 | functional intent | 每个动画都服务于交互反馈或信息传达 |
| 微调 | fine-tuning | 线条速度、球体轨迹的像素级调整 |
| 延迟发布 | delayed launch | 为了质量推迟上线，不是无限期拖延 |
| 设计工具 | design tooling | 工程团队自建波浪实验工具 |

**本章小结**

- 动画不是装饰——每个动画都必须有交互反馈或信息传达的功能
- 团队自建波浪实验工具，实时调整模糊感、颗粒度、颜色、动态
- 为动画流畅度推迟 12 月上线，集体决定值得等待

---

## 04 AI 提升底线：7 分到 10 分仍需人扛

**Aaron Epstein：** 谈谈 AI 在这个过程中的角色。

**Katie Dill：** AI 非常擅长制作看起来超级真实的图片——这正是我们追求的效果。我们想用 AI 做合作伙伴插图。但现实是，**细微之处和细节对我们来说真的很重要**。你不能只放一些「差不多就行」的东西，它必须让人感觉与网站其他部分一样充满了爱和关怀。

**Aaron Epstein：** 所以 AI 生成的初稿需要大量修正？

**Katie Dill：** 每一个细节都是对「感觉不太真实」的地方的批评。整体城市布局感觉对吗？很多地方是对的，但当你仔细看时，手臂的线条不太对，或者没有手，或者影子和实际情况不符。**AI 能帮我们加快流程，我们可以在通常看两个想法的时间里看 20 个想法。但它不能取代技艺，不能取代品味，也不能取代对细节的关注。**

**Aaron Epstein：** 设计师的角色在 AI 时代变了？

**Katie Dill：** AI 可以快速交付 7 分的基线产品。但我们想做的是——利用省下来的额外时间，不是直接发布更多 7 分的产品，而是思考新的交互范式。比如人们正在用 AI 代理建立业务，那「代理体验」是什么样的？设计师现在投入更多精力的地方，是探索明天的优秀体验会是什么样子。

> **金句 · Katie Dill**
> **中文：** AI 把底线拉到 7 分——但我们想做的不是多产 7 分的东西，而是用省下的时间去想新的交互范式。
> **原文：** AI brings the baseline to 7 — but the point isn't to produce more 7s, it's to use the saved time to imagine new interaction paradigms.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 7 分基线 | 7/10 baseline | AI 快速交付尚可的产品，不惊艳但能用 |
| 像素级修正 | pixel-level refinement | 从 7 分到 10 分需要人逐像素打磨 |
| 代理体验 | agent experience | AI 代理作为用户时的产品交互方式 |
| 探索效率 | exploration velocity | AI 让 2 个想法的时间看 20 个想法 |

**本章小结**

- AI 把探索效率提升 10 倍（2 个想法 → 20 个想法）
- 但每个 AI 生成的初稿都有「感觉不对」的细节——手臂、影子、比例
- 设计师的新角色：用 AI 省下的时间探索「代理体验」等新范式

---

## 05 对抗平庸的引力：卓越公司的分水岭

**Aaron Epstein：** 你提到「平庸的引力」——这个说法很精准。

**Katie Dill：** 现实是——**引力总是倾向于平庸。接受「足够好」实在太容易了。** 你权衡所有成本：团队付出这么多努力，如果我不继续推进，我就让团队不高兴。但如果产品只是平平无奇，团队真的会高兴吗？

**Aaron Epstein：** 很多公司接受「足够好」之后会怎样？

**Katie Dill：** 想想如果你每天都做出「足够好」的决定，再想想有多少公司这样做？有多少公司在我们看来是卓越和非凡的，它们真正地保持了那个标准？这会让你想起，如果不去对抗那种「如果我放任不管，我会放任什么」的倾向，斗争是多么艰难。

**Aaron Epstein：** 你说的 MVQP——最小可行质量产品。

**Katie Dill：** 你不想通过在世界上试验一些东西来失去信任，但你当然想从用户经验中学习。**质量保证似乎变得越来越重要——还有测试。** 进步可能比完美更重要，但质量是底线。你必须有一个标准，关于一个成功产品必不可少的部分是什么。

**Aaron Epstein：** 逛商店——你们怎么做的？

**Katie Dill：** 每个人都应该探索「商店」的不同部分，将自己想象成不同类型的用户。我们每周五在全公司面前「逛商店」——创始人主持，灌输这有多重要。我喜欢和工程师、产品负责人、数据科学家一起逛——**我们都以非常不同的方式看待它，都会指出不同的东西**。这正是让我们接近真正理解用户感受的关键。

> **金句 · Katie Dill**
> **中文：** 接受「足够好」太容易了——但如果你每天都做这个决定，公司就会变得平庸。
> **原文：** It's so easy to accept 'good enough' — but if you make that decision every day, your company becomes mediocre.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 平庸的引力 | mediocrity gravity | 系统性地倾向于接受「够用了」 |
| MVQP | minimum viable quality product | 最小可行质量产品——质量是底线 |
| 逛商店 | shop the store | 跨职能团队像用户一样走一遍产品 |
| 产品腐化 | product rot | 各部门独立迭代导致体验断裂 |

**本章小结**

- 平庸的引力是系统的默认方向——不刻意对抗就会滑向平庸
- MVQP 替代 MVP：质量是底线，不是可选项
- 逛商店 = 跨职能团队用用户视角找「电灯开关不匹配」问题

---

## 大总结

| 维度 | 要点 |
|------|------|
| **品牌宣言** | 网站不是产品目录，是价值观的外化——每个设计选择都在表达 |
| **便当盒布局** | 产品线扩张后，网格卡片 + 模态框 = 信息量与轻盈感并存 |
| **动画意图** | 每个动画必须有功能意图，否则就是噪音 |
| **AI 定位** | AI 把探索效率提 10 倍、底线拉到 7 分，但从 7→10 仍需人 |
| **对抗平庸** | 接受「足够好」太容易了，卓越是刻意选择 |
| **逛商店** | 跨职能团队每周五像用户一样走产品，发现体验断裂 |

> **封底金句**
> **中文：** 引力总是倾向于平庸——接受「足够好」太容易了。卓越不是天赋，是每天的选择。
> **原文：** Gravity always pulls toward mediocrity — accepting 'good enough' is too easy. Excellence isn't talent; it's a daily choice.

---

**相关阅读**
- [[MOC - Harness Engineering]] — AI 时代的设计与工程交叉
- [[GPT Image2深度测评-AI生图进化]] — 同期 AI 图像生成测评
