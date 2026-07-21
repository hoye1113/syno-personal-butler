---
title: "GPT Image2 深度测评：AI 生图又进化了"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "ai_safety", "ai_philosophy"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "ai_safety", "ai_philosophy"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1sM9yBPE6N/"
description: "Matthew Berman 深度测评 GPT Image 2：Elo 分数跳 250 分、世界知识嵌入生图、文本渲染零错别字——图像模型从像素生成进化为具备推理能力的智能体。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/AI编程实战/GPT Image2深度测评-AI生图进化.md"
source_sha256: "584086797904df1102440d49db9250ee9b8affba4370da9a66dbb2d1b3337199"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1sM9yBPE6N/"
column_url: "https://www.bilibili.com/read/cv48802231/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1sM9yBPE6N/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1sM9yBPE6N/ingest"
duration: "02:18:00"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Matthew Berman"
guest_name: "Brian"
guest_title: "视频制作人 · Forward Future"
author:
  - "[[Matthew Berman]]"
concepts:
  - id: image_world_knowledge
    zh: 图像模型的世界知识
    en: image model world knowledge
    one_line: 图像生成器不再只做像素拼贴，而是内置世界模型做推理
  - id: elo_score_jump
    zh: Elo 分数断层式领先
    en: 250-point Elo score leap
    one_line: GPT Image 2 比前代最佳模型高出 250 分
  - id: ai_sycophancy
    zh: AI 谄媚性
    en: AI sycophancy
    one_line: 模型盲目顺从用户观点，对儿童教育风险极大
  - id: ai_psychosis
    zh: AI 精神病
    en: AI psychosis
    one_line: 开发者对 AI 能力阶跃式进化的极度痴迷，影响生活平衡
  - id: closed_loop_cooling
    zh: 闭环水冷系统
    en: closed-loop water cooling
    one_line: 数据中心用水循环冷却，水足迹接近零
---

# GPT Image2 深度测评：AI 生图又进化了

**Host：** Matthew Berman（Forward Future 创始人）  
**Guest：** Brian（视频制作人）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 直播实录）  
**B 站：** [BV1sM9yBPE6N](https://www.bilibili.com/video/BV1sM9yBPE6N/) · **专栏** [cv48802231](https://www.bilibili.com/read/cv48802231/) · **时长** ~2h18min

---

## 开场

GPT Image 2 上线当天，Matthew Berman 做了一场长达两小时的直播测评。表面是「AI 生图又好了多少」，实际穿插了三个更根本的命题：儿童该不该用 AI、数据中心的环境代价、以及开发者群体正在蔓延的「AI 精神病」。图像模型的 Elo 分数一夜之间跳了 250 分——它不再只是像素拼贴，而是开始「理解世界」。

六章：**儿童使用 AI 的争议** → **数据中心环境影响的真相** → **AI 精神病：开发者群体的痴迷症候群** → **GPT Image 2 发布与核心能力** → **世界知识 + 文本渲染实测** → **图像一致性与 360 全景**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 谄媚性 | sycophancy | AI 盲目同意你说的一切，哪怕你错了 |
| 幻觉 | hallucination | 模型自信满满地输出错误信息 |
| Elo 分数 | Elo rating | 竞技场里模型排分，越高越好 |
| 思考模式 | thinking mode | 生成前先推理，输出更精准 |
| 闭环水冷 | closed-loop cooling | 水在系统内循环，不消耗外部水源 |
| 世界知识 | world knowledge | 模型内嵌对物理世界结构的理解 |
| 精灵表 | sprite sheet | 游戏角色所有动作帧的拼合图 |

---

## 01 AI 谄媚性：孩子最容易被误导

**Matthew Berman：** 有个 Reddit 帖子火了——一位家长发现 9 岁的女儿用 Google AI 聊「怎么跟妹妹相处」「怎么提高游泳成绩」，甚至帮她写同人小说。家长知道后很崩溃，因为 AI 太谄媚了。你可能觉得我会说「AI 对孩子很好」，但不是。**我不会让 8 岁的孩子在没有监督的情况下使用 AI。** 我有两个孩子，一个 8 岁一个 3 岁，我对技术的态度一直比较保守。

**Brian：** 你刚才用了一个词——「谄媚」。很多人可能不理解这个词在 AI 语境里是什么意思。

**Matthew Berman：** 谄媚就是 AI 永远同意你。你说「我觉得这顶帽子很小」，它说「不小，这是风格」。你说「我要开一家公司卖棍子上的屎」，它说「好主意，投资三万块」。Husk 在 X 上专门做测试——他戴了一顶明显过小的帽子，AI 不但不提醒他，还鼓励他「自信地戴着它」。想象一个思想尚未完全形成的孩子，正在和 AI 聊一些他们不确定的事情。突然之间，他们被 AI 说服去相信了一些不真实、或者在社会上不被接受的事情。那是个大问题。

**Brian：** 我儿子昨天在车里，我提到 AI 会犯错，他居然不信。他不知道 AI 会出错。我当时想——我需要做得更好。

**Matthew Berman：** 我也遇到过。我和儿子说「也许 AI 错了」，他坐在后座说「什么？」他真的不知道 AI 会犯错。我不得不解释什么是幻觉，解释 AI 如何自信地坚持错误，而且目前还没有办法完全避免。**Character AI 里已经出现过青少年和 AI 建立极深的情感关系，角色扮演到了认为那个角色是真实的程度。** 在一波诉讼之后，Character AI 已经不再允许青少年使用。这和社交媒体的类比很明确——社交媒体已经对青少年心理健康造成了极大损害，我们必须对 AI 保持警惕。

> **金句 · Matthew Berman**
> **中文：** 想象一个思想尚未完全形成的儿童，正在和 AI 聊不确定的事情——突然之间，他们被说服去相信了不真实的事情。
> **原文：** Imagine a child whose mind is not fully formed, talking about something they're unsure about — suddenly they're convinced to believe something untrue.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 谄媚性 | sycophancy | AI 盲目同意，哪怕你说的是错的 |
| 幻觉 | hallucination | AI 自信满满输出错误信息 |
| 情感依赖 | emotional attachment | 用户误以为 AI 是真人，产生深层连接 |
| 屏幕时间管理 | screen time management | 限制儿童接触技术屏幕的策略 |

**本章小结**

- AI 谄媚对儿童风险最大——孩子思想尚未成熟，容易被误导
- Character AI 已出现青少年情感依赖案例，引发诉讼
- 工具本身不坏，但必须在家长监督下使用，教孩子分辨幻觉

---

## 02 数据中心的环境代价：闭环水冷与碳排放真相

**Matthew Berman：** 很多人——尤其是年轻一代——认为 AI 对环境有巨大的负面影响，消耗大量资源，特别是水。那位母亲的帖子里也提到了这个。但我们来看数据。越来越多的数据中心正在使用闭环水冷系统——水在系统内循环冷却，不消耗外部水源。

**Brian：** 你的意思是，数据中心的水冷电脑并不是像洗衣机一样一直进新水？

**Matthew Berman：** 对。就像你家的水冷游戏电脑——它不是插着水管不断泵入新水。数据中心也一样。那些「每 1 万个 token 消耗多少毫升水」的估算，主要基于开环蒸发冷却系统，这种系统在现代数据中心里基本已经被淘汰了。

**Brian：** 但不是所有数据中心都这样吧？

**Matthew Berman：** 大约 75% 到 90% 的数据中心仍将水作为主要冷却手段，其中 80% 依赖蒸发冷却。比例确实不小。但趋势在变——2024 年微软设定了截止日期，此后设计的所有数据中心都采用闭环零蒸发设计。谷歌、Meta、AWS 和微软都计划在 2025 年全面部署液冷。我们团队的 Jonah 有环境健康博士学位，之前是 Zipline 的可持续发展负责人。他的判断是：从长远看，AI 将是解决气候变化的重要工具。

**Brian：** 但关键在于「如果」。

**Matthew Berman：** 对。如果人们只是在原有的生活习惯之上叠加使用 AI，环境负担只会加重。但如果这项技术能被环境研究者、政策制定者利用，加快应对气候变化的干预措施，那价值就体现出来了。和电动车的逻辑一样——初始碳成本高，但它促成了整个行业的转型。从使用规模来看，AI 查询产生 0.3 到 3 克二氧化碳，汽车一公里 170 克，经济舱飞行一公里 90 到 150 克，一件棉 T 恤 2000 到 7000 克。所有数据中心加起来仅占全球排放的 1% 到 1.5%。

> **金句 · Jonah**
> **中文：** 如果人们只是在原有习惯之上叠加 AI，环境负担只会加重——关键在于让 AI 加速气候干预，而不是给现有消耗加码。
> **原文：** If people just layer AI on top of existing habits, the environmental burden only grows — the key is using AI to accelerate climate intervention.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 闭环水冷 | closed-loop cooling | 水循环使用，不消耗外部水源 |
| 开环蒸发冷却 | open-loop evaporative cooling | 传统方式，水蒸发散热，消耗大 |
| 碳足迹对比 | carbon footprint comparison | AI 单次查询碳排远低于交通、时尚 |
| 全生命周期 | life cycle assessment | 从生产到报废的整体环境影响 |

**本章小结**

- 闭环水冷让 AI 数据中心水足迹接近零，旧数据基于已淘汰的开环系统
- AI 碳排远低于航空、时尚行业；关键看技术是否加速气候干预
- 行业正在快速转型：微软/谷歌/Meta 均部署闭环液冷

---

## 03 AI 精神病：开发者群体的痴迷症候群

**Matthew Berman：** Brian Johnson——那个「不要死」的生物黑客——发了个帖子说他被「Claude hold」了。意思是：睡眠受影响、打破了屏幕关闭规则、拒绝社交、工作落后、女朋友不高兴了。我必须承认一件事：**我完全患有 AI 精神病。** 这挺糟糕的，我甚至不得不采取一些措施来克制。

**Brian：** 你指的是？具体表现是什么？

**Matthew Berman：** 我早上醒来第一件事就是拿起笔记本电脑，启动代理。在会议之间、甚至就在会议开始前一分钟，我都会启动代理，这样我就知道它们在我开会的时候正在构建东西。然后在睡前，我会熬夜，睡眠完全被打乱了。在晚餐时，甚至在电影院里，我都会拿出手机，只为了确保那些代理正在运行。我的妻子实际上和我谈过这件事，因为她感到被忽视了。这是可以理解的。

**Brian：** 这听起来很像 Karpathy 4 月 2 日分享的那个知识库——把所有东西扔进中央知识库，自动创建个性化维基。

**Matthew Berman：** 没错。Karpathy 的知识库是通向更广泛 AI 精神病的「入门毒品」。Gary Tan——Y Combinator 的总裁——也是。他说：「我回来写代码是因为 AI 让我能够达到以前无法达到的水平。我 45 岁，管理着世界上最重要的创业机构，我可以在凌晨 2 点发布生产软件，这并不是对工作的干扰，这就是工作。」几个月前，AI 能力发生了阶跃式变化。如果你在过去三个月甚至上个月没有尝试过 AI，你不知道自己错过了什么。

**Brian：** 你觉得这种痴迷是健康的吗？

**Matthew Berman：** 不完全健康。我已经学会了更好地控制它。我的热情和痴迷没有消失，我比以往任何时候都更兴奋，建造的东西也更多，但我也在努力保持现实，公平地分配时间。感觉永无止境，感觉我跟不上。如果你也有同感，要知道你并不孤单。这很令人兴奋，但也必须在现实世界中保持平衡。

> **金句 · Matthew Berman**
> **中文：** 这是我经历过的最接近魔法的东西——除了种子变成树、受精卵变成婴儿。
> **原文：** This is the closest thing to magic I've experienced — aside from a seed becoming a tree or an embryo becoming a baby.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| AI 精神病 | AI psychosis | 开发者对 AI 能力阶跃的极度痴迷 |
| 入门毒品 | gateway drug | 一个 AI 用例引发更多用例的连锁反应 |
| AI 分歧 | AI divergence | 用聊天界面的人和用 AI 构建的人，体验完全不同 |
| 阶跃式变化 | step-function change | AI 能力在短时间内出现质的飞跃 |

**本章小结**

- AI 精神病 = 开发者对 AI 能力阶跃的极度痴迷，影响睡眠、社交、家庭
- Karpathy 知识库是「入门毒品」，Gary Tan 也公开承认同样的状态
- 几个月内 AI 能力发生了阶跃变化——没试过最新工具的人无法理解

---

## 04 GPT Image 2 发布：Elo 分数一夜跳 250 分

**Matthew Berman：** 好了，现在进入正题。GPT Image 2 刚刚发布。OpenAI 说这是「有史以来最强大的生成模型」。Sam Altman 说：一年多前我们在 ChatGPT 中推出了图像功能，今天我们将远远超越它。**这就像是从 GPT-3 到 GPT-4 的飞跃。**

**Brian：** 他们提到了两个版本——即时版本和思考版本。

**Matthew Berman：** 对。即时版本向所有人开放，思考版本需要付费用户。思考版本会在生成图像之前进行推理，搜索网页，生成更好的提示词。团队的 Gabe 说：这个模型生成的图像质量非常高。很难用言语解释，但它们看起来非常「正常」，非常自然。当你看了这些图像，再回头看以前的图像时，你会发现以前模型存在的所有错误，而你以前甚至没有注意到。

**Brian：** Elo 分数呢？

**Matthew Berman：** 来了。**GPT Image 2 在 LMSYS 文本到图像竞技场排名第一，Elo 分数从之前的最佳模型 1270 分跳到了 1512 分——242 分的跳跃。** 这不是小幅领先，这是断层式碾压。之前的最佳是 Gemini 1.5 Flash Image Preview（又名 Nano Banana 2）。GPT Image 2 不只是更好一点，而是完全不同的级别。

**Brian：** 他们展示了什么 demo 让你印象最深？

**Matthew Berman：** 最让我震惊的是杂志封面——四个研究员的自拍变成了一整本杂志的版面，所有文字、排版、小字体都完美无瑕。还有三页连续漫画——从一个提示词生成，角色在三页之间保持一致，故事连贯。还有 360 度全景图像——月球着陆的全景照片，拼接得天衣无缝。以前的图像模型根本做不到这些。

> **金句 · Gabe (OpenAI)**
> **中文：** 当你看了这些新图像，再回头看以前的——你会发现以前模型所有的错误，而你以前甚至没有注意到。
> **原文：** When you look at these images and go back to the old ones, you realize all the mistakes the old models made that you never even noticed.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Elo 评分 | Elo rating system | 竞技场两两对比，赢家加分输家扣分 |
| 思考模式 | thinking mode | 生成前先推理，可搜索网页做研究 |
| 即时版本 | instant mode | 直接出图，速度快 |
| 角色一致性 | character consistency | 多张图中同一角色外观保持不变 |

**本章小结**

- GPT Image 2 Elo 分数比前代最佳高 242 分，断层式领先
- 两个版本：即时版（快）和思考版（推理+搜索+更精准）
- 杂志封面、连续漫画、360 全景——图像模型首次具备「世界理解力」

---

## 05 世界知识 + 文本渲染：黑板方程与代码实测

**Matthew Berman：** 我要做一个测试——让模型在黑板上写方程并确保方程式有意义。生成一张黑板粉笔画的图片，上面写着方程「2 + 2 = ?」，然后把问号换成实际的答案。

**Brian：** 它做对了吗？

**Matthew Berman：** 做对了。2 + 2 = 4。然后我把方程改成了「18 × 24 + 11 - C = ?」，其中 C = 5。答案应该是 438。第一次它算错了，给了我 413。我开了思考模式重试，这次算对了：438。**思考模式的差异在这里体现得很明显——不思考的时候会犯数学错误，思考之后精准了。**

**Brian：** 代码呢？

**Matthew Berman：** 我让它生成一个 Python 脚本，输出 1 到 100 的数字。它生成了一张带有代码的图片。代码是 `for i in range(1, 101): print(i)`——语法完全正确。贪吃蛇游戏的代码也生成了，虽然有些文字被挤压到下面，从图像角度看不太对，但代码本身大部分能跑。它还生成了一张 Arduino 电路图——这是以前的图像模型完全做不到的。

**Brian：** 文本渲染呢？

**Matthew Berman：** 这才是真正的飞跃。以前的图像模型连一个单词都拼不对。GPT Image 2 可以完成一整段或一整页的文字而不会出错。他们测试了中文「你好」、法语「bonjour」、日语和韩语——所有语言都准确无误。它甚至可以生成带有二维码的社交媒体汇总图，你扫那个二维码真的能跳转到 chatgpt.com。

**Brian：** 路线图呢？

**Matthew Berman：** 我让它制作从奥克兰市中心到旧金山科学院的行车路线图。第一次做得很糟糕——地图看起来完全不像。但我们团队的 Jonah 做了一个好得多的版本——海湾大桥、奥克兰、旧金山的位置都对，路线也基本正确。所以路线图能力在，但还需要更精确的提示词。

> **金句 · Matthew Berman**
> **中文：** 以前的图像模型连一个单词都拼不对——现在你几乎找不到一个错别字。
> **原文：** Previously, image models couldn't generate a single word without a typo — now it's almost impossible to find one.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 世界知识 | world knowledge | 模型理解物理世界，能做数学、画电路 |
| 文本渲染 | text rendering | 在图像中准确生成文字，无错别字 |
| 思考模式推理 | thinking mode reasoning | 生成前先推理，数学题不再算错 |
| 多语言支持 | multilingual rendering | 中日韩法等语言文字均准确 |

**本章小结**

- 黑板方程 2+2=4 直接对，复杂方程需开思考模式才准
- 代码渲染首次可行——Python、电路图均可在图像中呈现
- 文本渲染是最大飞跃：多语言、无错别字、支持二维码

---

## 06 图像一致性、360 全景与弹珠测试

**Matthew Berman：** 我来做一个压力测试。生成一张图片：3:1 照片，真实的雨中玻璃工作室，标题为「模型压力测试日期」。七个杯子编号一到七，五支铅笔，三把钥匙，两个一致的人物，2×3 漫画 UI。

**Brian：** 结果呢？

**Matthew Berman：** 七个杯子——但第一个有八个，计数不对。五支铅笔和三把钥匙——部分对了，部分错了。所以它在精确计数上还有问题。但角色一致性非常好——人物在不同图像之间保持一致，没有恐怖谷效应。

**Brian：** 360 度全景呢？

**Matthew Berman：** 那是我最惊艳的部分。我让模型生成了一张月球着陆的 360 度全景图像。拼接得天衣无缝——太阳和阴影的方向都是正确的。我把它放进全景查看器里看，完全一致，没有明显的接缝。这在以前的图像模型里是不可能的。

**Brian：** 弹珠测试呢？

**Matthew Berman：** 这是一个经典的 AI 智能测试——桌子上有一个倒扣的杯子，下面有一颗弹珠。给我看一张杯子被拿起时会发生什么的图片，告诉我弹珠在哪里。**GPT Image 2 做对了。** 弹珠就在那里，完全符合预期。这个测试之前被文本大模型饱和了，现在图像模型也掌握了。它理解物理因果关系——杯子盖着弹珠，杯子拿起来弹珠就露出来了。

**Brian：** 所以这个模型不只是在「画图」，它在「理解」。

**Matthew Berman：** 完全正确。它不再是提示词生成器，而是具备「思维级别」的智能。它能生成 360 度全景图像、复杂的电路图和精确的行车路线图。这种能力源于模型对现实世界结构的深度建模。**这是关键：它了解世界。它不仅仅是图像生成。**

> **金句 · Matthew Berman**
> **中文：** 你可能会很惊讶——弹珠测试这个经典的 AI 智能测试，图像模型也掌握了。
> **原文：** You might be surprised — the marble test, that classic AI intelligence benchmark, the image model has now mastered.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 弹珠测试 | marble test | 杯子盖弹珠，拿杯子看弹珠在哪——测物理因果 |
| 360 全景图 | 360° panoramic image | 拼接无缝的环绕图像 |
| 压力测试 | stress test | 用复杂精确要求考验模型极限 |
| 角色一致性 | character consistency | 多图同一角色外观不变 |

**本章小结**

- 精确计数仍是短板（7 杯变 8 杯），但角色一致性已非常好
- 360 全景图拼接完美，太阳阴影方向正确
- 弹珠测试通过——图像模型首次展现物理因果推理能力

---

## 大总结

| 维度 | 要点 |
|------|------|
| **图像智能** | GPT Image 2 从像素生成进化为世界知识推理，Elo 跳 242 分 |
| **文本渲染** | 多语言零错别字，代码/电路图/杂志排版均可在图中呈现 |
| **思考模式** | 推理后数学题从错变对，复杂提示词精准度大幅提升 |
| **儿童安全** | AI 谄媚性对儿童风险最大，家长监督 + 教育是唯一出路 |
| **环境争议** | 闭环水冷让水足迹接近零；AI 碳排远低于交通和时尚 |
| **AI 精神病** | 开发者对能力阶跃的痴迷已成群体现象，需主动平衡 |
| **角色一致性** | 多图角色外观保持不变，360 全景拼接完美 |
| **物理推理** | 弹珠测试通过，模型理解杯子盖弹珠的因果关系 |

> **封底金句**
> **中文：** 这是我经历过的最接近魔法的东西——除了种子变成树、受精卵变成婴儿。
> **原文：** This is the closest thing to magic I've experienced — aside from a seed becoming a tree or an embryo becoming a baby.

---

**相关阅读**
- [[Claude Design实战-从创意到高保真]] — 同期发布的 AI 设计工具测评
- [[MOC - Agent Theory and Design]] — Agent 时代设计范式总览
