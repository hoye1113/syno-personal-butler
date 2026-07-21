---
title: "Claude Design 实战：1 小时从创意到高保真"
tags: ["ai_agent", "video_transcript", "bilibili", "claude", "anthropic", "ai_coding"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "claude", "anthropic", "ai_coding"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1YX9CB5ETB/"
description: "Greg Isenberg 直播实测 Claude Design：内置问卷像 PM 思考、线框图是杀手锏、PPT 生成天花板——但视频生成仅 5 分、多任务处理会崩溃。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/AI编程实战/Claude Design实战-从创意到高保真.md"
source_sha256: "b9d5803da8b42ce528ab9a7987361898da2456f0eb4ddab9e3b9c2c09502a75e"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1YX9CB5ETB/"
column_url: "https://www.bilibili.com/read/cv48296923/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1YX9CB5ETB/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1YX9CB5ETB/ingest"
duration: "58:00"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Greg Isenberg"
guest_name: "Greg Isenberg"
guest_title: "创业者 · Late Checkout 创始人"
author:
  - "[[Greg Isenberg]]"
concepts:
  - id: pm_questionnaire
    zh: PM 式问卷系统
    en: PM-style questionnaire
    one_line: Claude Design 像产品经理一样追问细节，帮你理清产品逻辑
  - id: wireframe_killer_feature
    zh: 线框图是杀手锏
    en: wireframe as killer feature
    one_line: Claude Design 的线框图能力足以替代初级 UI 设计师
  - id: ppt_generation_ceiling
    zh: PPT 生成天花板
    en: PPT generation ceiling
    one_line: Claude 生成的融资 PPT 含科学依据、市场数据、财务模型——当前 AI 天花板
  - id: concurrent_task_crash
    zh: 并发任务崩溃
    en: concurrent task crash
    one_line: Claude Design 同时处理多个任务容易丢失上下文或崩溃
  - id: token_value_equation
    zh: 代币价值方程
    en: token value equation
    one_line: 关键不是消耗多少代币，而是从中获得了多少价值
---

# Claude Design 实战：1 小时从创意到高保真

**Host：** Greg Isenberg（Late Checkout 创始人）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 直播实录 · 讲义适配对话体）  
**B 站：** [BV1YX9CB5ETB](https://www.bilibili.com/video/BV1YX9CB5ETB/) · **专栏** [cv48296923](https://www.bilibili.com/read/cv48296923/) · **时长** ~58 min

---

## 开场

Greg Isenberg 是个创业者，联合创办了代理公司 Late Checkout。他在周末开了个直播，第一次上手 Claude Design——Anthropic 新推出的在线设计工具。他选了一个「为老年人设计的脑力训练应用」的想法，从问卷开始，经历线框图、高保真设计、融资 PPT，一路走到视频广告。结论：**线框图和 PPT 是天花板，视频是地板，多任务处理会崩。**

六章：**PM 式问卷帮你理清产品** → **线框图是杀手锏** → **PPT 生成超越主流 LLM** → **高保真设计与局部修改** → **视频生成仅 5 分** → **避坑：别同时跑多个任务**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 线框图 | wireframe | 产品布局的草图骨架，不带精细样式 |
| 高保真 | high-fidelity | 接近最终产品的视觉设计稿 |
| 问卷系统 | questionnaire | Claude Design 的内置追问机制 |
| JSX | JSX | React 组件的代码格式，Claude Design 生成可运行的 |
| 代币 | tokens | 使用 Claude 消耗的计量单位 |
| 演示文稿 | presentation | PPT/幻灯片 |
| Cowork | Cowork | Claude 的协作工作空间 |

---

## 01 PM 式问卷：像产品经理一样帮你理清想法

**Greg Isenberg：** 我从 ideabrowser.com 选了一个想法——「为老年人设计的脑力训练应用」。我输入：「这是一个应用想法，受 Duolingo 和 Brain Rot 启发。能根据这个想法制作一个清晰简洁的线框图吗？」

**Greg Isenberg：** **我为什么要先做线框图？因为我不想浪费代币。** 如果直接开做，会花大量代币。先做线框图能帮我弄清楚想要什么功能，为会成功的产品设定限制。但它先开始提问了。

**Greg Isenberg：** 「线框图的主要设备是什么？」「iPhone。」「Duolingo 的猫头鹰既霸道又可爱，Brain Rot 很混乱，什么感觉适合老年人？」「温和、有趣、平静，从不慌乱。」「要线框图的屏幕有哪些？」「每日主页、新手引导、奖励与进度、练习模块。」它接着问游戏化元素、视觉风格、家庭看护者的角色……**我对这些问题的质量感到震惊。** 它像产品经理一样审视想法并进行推断。

**Greg Isenberg：** 我的信念是，**中等保真度的线框图很糟糕——你要么从低保真开始，要么直接上高保真**。所以我选最低保真度。它又问：「家庭看护者在主应用中的突出程度如何？」这太疯狂了，它能考虑到所有这些细节。它还主动建议了产品名称——「老年大脑」「思维心智」。**它做了 90% 的思考工作。**

> **金句 · Greg Isenberg**
> **中文：** 先做线框图不是浪费时间——是帮你理清产品逻辑，省下大量代币。
> **原文：** Starting with wireframes isn't wasting time — it's clarifying your product logic and saving a ton of tokens.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| PM 式问卷 | PM-style questionnaire | Claude Design 像产品经理一样追问细节 |
| 线框图优先 | wireframe-first | 先定骨架再填肉，避免浪费代币 |
| 低保真 vs 高保真 | low-fi vs high-fi | 要么草图要么成品，不要中不溜 |
| 产品命名建议 | product name suggestion | AI 主动建议产品名称和方向 |

**本章小结**

- Claude Design 的问卷像资深 PM 追问：目标用户、风格、屏幕、游戏化元素
- 线框图优先 = 省代币 + 理清逻辑，不要一上来就做高保真
- 它做了 90% 的思考工作——你只需要回答问题

---

## 02 线框图：Claude Design 的杀手锏

**Greg Isenberg：** 它给了我三个方向。方向 A「温暖友好型」——卡片式主页，吉祥物是「小助手」而非主角，安全且熟悉。方向 B「吉祥物优先型」——聊天吉祥物作为导航员，「早上好，露丝。今天玩记忆配对？」方向 C「日历习惯型」——主页显示今天的路径，更像早晨咖啡和填字游戏的感觉。

**Greg Isenberg：** 这给了你代理公司的专业感。我自己就是代理公司的联合创始人——我们确实会做方向 A、B、C，每个方向都有背后的故事。**我还没在代币上花一分钱，就已经拿到了三个方向。**

**Greg Isenberg：** 我让观众投票，大家选了 A。然后我要求高保真版本。它开始研究 Duolingo 和 Brain Rot 的设计语言，构建高保真方向。**入职流程：Bean 在第一步介绍了自己。问题来了，大点击目标，每屏一个想法，欢快的插图。** 你得到了「每日家庭」页面——来自你的家人，这个社交功能太棒了。你也可以向下滚动看会话结果。

**Greg Isenberg：** 我觉得缺少分享功能——「把这个分享到 Facebook」。我加了一个注释，它准确放置了 Facebook 图标，还自动优化了文案：「**把这个胜利分享到 Facebook 上**」——我没有让它说「分享这个胜利」，但它自己加了。作为做过数百万用户社交产品的人，我知道「分享这个胜利」比「分享到 Facebook」转化率高得多。

> **金句 · Greg Isenberg**
> **中文：** 它做了代理公司 90% 的工作——三个方向、每个都有故事，而我还没花一分代币。
> **原文：** It did 90% of what an agency does — three directions, each with a story, and I haven't spent a single token yet.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 三方向探索 | three-direction exploration | AI 同时生成多个设计方案供选择 |
| 代理公司感 | agency-like delivery | AI 输出达到专业代理公司的交付水平 |
| 注释反馈 | annotation feedback | 在画布上直接标注修改需求 |
| 文案优化 | copy optimization | AI 主动改进按钮文案提升转化率 |

**本章小结**

- 三个方向同时生成，每个都有故事和设计逻辑——代理公司级别的交付
- 注释功能可以在画布上直接标注需求，AI 准确理解并执行
- AI 还自动优化了文案（「分享这个胜利」），提升社交转化率

---

## 03 PPT 生成：超越当前所有 AI 工具

**Greg Isenberg：** 趁等高保真设计的时间，我要做个融资 PPT。我说：「制作一个 VC 风格的 PPT，帮红杉资本筹集 200 万美元。产品名称'长者大脑'，种子轮，我的背景是资深行业老兵。风格：红杉资本风格，温暖且人性化。」

**Greg Isenberg：** 它开始生成。**「让 5800 万人的思维保持更长时间的敏锐」——这个标题就值 100 万。** 「美国有 5800 万 65 岁以上的老年人，但他们使用的软件中，几乎没有一个是专门为他们设计的。」这洞察太真实了。

**Greg Isenberg：** 它做了竞争分析：选项 A 是玩那些为年轻人设计的脑力游戏，界面杂乱，缺乏临床证据。选项 B 是去记忆诊所，等待六个月，自费诊断 400 美元。**对比做得非常酷。** 然后是产品定义：「每天早晨 15 分钟，持续一生。比诊所更平静，比 Lumosity 更像 Noom。」

**Greg Isenberg：** 最让我震惊的是财务模型——「混合获客成本 62 美元，第一年终身价值 228 美元，回收期 3.3 个月。LTV/CAC 比率非常理想。」**它甚至还研究了科学依据——三项里程碑式的试验将认知训练从简单的健康疗法提升到了标准护理的高度。**

**Greg Isenberg：** 这可能是我见过的由大模型创建的最好的演示文稿，没有之一。它不只是生成了幻灯片——它做了市场研究、竞品分析、财务建模、科学论证，全部在一个 PPT 里。

> **金句 · Greg Isenberg**
> **中文：** 这可能是我见过的由大模型创建的最好的演示文稿——没有之一。
> **原文：** This might be the best presentation I've ever seen created by a large model — bar none.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| VC 风格 PPT | VC-style pitch deck | 面向投资人的融资演示文稿 |
| LTV/CAC | lifetime value / customer acquisition cost | 终身价值与获客成本的比率 |
| 科学依据 | scientific backing | AI 主动研究学术论文支撑产品逻辑 |
| 财务建模 | financial modeling | AI 自动生成获客成本、回收期等数据 |

**本章小结**

- PPT 不只是幻灯片——AI 做了市场研究、竞品分析、财务建模、科学论证
- 财务模型精准：CAC $62、LTV $228、回收期 3.3 个月
- 被评为「当前 AI 生成 PPT 的天花板」

---

## 04 高保真设计与局部修改

**Greg Isenberg：** 高保真设计出来了。入职流程非常贴心——Bean 吉祥物自我介绍，每屏一个想法，大点击目标适合老年人。进度页显示本周连胜，会话结果显示得分提升。**超出了我的预期。**

**Greg Isenberg：** 我试了绘图功能——在画布上加注释。我说：「加一个分享到 Facebook 的按钮。」它准确放置了图标，文案是「把这个胜利分享到 Facebook 上」——这个文案是它自己优化的，我没有让它这么说。

**Greg Isenberg：** 但我也遇到了问题。我离开文件夹再回去，问卷就没了——它丢失了上下文。**Claude Design 目前不支持很好的上下文保持**，每次切换可能丢失之前的信息。这是一个需要改进的地方。

**Greg Isenberg：** 另一个发现——**同时处理两个任务时，一个会卡住**。我一边做高保真设计一边做 PPT，切换时另一个就停了。系统应该提醒用户「一次只能处理一个任务」，否则我们怎么会知道呢？这是我学到的新知识：**你可能无法同时创建两个任务，建议一次只专注于一件。**

> **金句 · Greg Isenberg**
> **中文：** 系统应该提醒「一次只能处理一个任务」——否则我们怎么会知道呢？
> **原文：** The system should warn you 'only one task at a time' — otherwise how would we know?

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 上下文丢失 | context loss | 切换任务/文件夹后丢失之前的对话 |
| 并发限制 | concurrency limit | 同时只能处理一个设计任务 |
| 绘图注释 | drawing annotation | 在画布上直接画/标注修改需求 |
| 进度连胜 | streak display | 连续使用天数的游戏化展示 |

**本章小结**

- 高保真设计超出预期——Bean 吉祥物、社交功能、进度展示都很完整
- 绘图注释功能可用，AI 还自动优化了文案
- 并发限制：同时跑两个任务会卡住——一次只做一件事

---

## 05 视频生成：仅 5 分（满分 10 分）

**Greg Isenberg：** 我们来试试视频。我说：「为'老年人大脑'制作一个 30 秒的广告。目标受众 35-50 岁——购买者的子女。创意方向：可爱、有趣、温馨。」

**Greg Isenberg：** 它生成了一个以角色为主导的生活片段：露丝是妈妈，莎拉是女儿。莎拉送出应用，露丝使用它，她们通过它联系。基调温馨有趣。**作为 X 广告可以，但不够「电影感」。**

**Greg Isenberg：** 我要求更像电视广告——它改了，但还是很糟糕。**Claude Design 不适合视频。** 它能理解故事板和角色关系，但最终生成的动画效果较为生硬，缺乏电影感和视觉冲击力。目前尚无法与 Luma 或 Runway 等专业视频 AI 竞争。

**Greg Isenberg：** 有人推荐了其他工具——Dance 2、Opus 4.7 跑超现实版本。Claude Design 的视频和这些比起来差距太大。**视频生成是它的短板，5 分不能再多了。**

> **金句 · Greg Isenberg**
> **中文：** Claude Design 的线框图和 PPT 是天花板——但视频？5 分，不能再多了。
> **原文：** Claude Design's wireframes and PPTs are ceiling-level — but video? 5 out of 10, max.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 视频广告 | video ad | 30 秒产品推广短片 |
| 故事板 | storyboard | 视频分镜脚本 |
| 电影感 | cinematic feel | 专业视频的视觉冲击力和叙事节奏 |
| 专业视频 AI | professional video AI | Luma、Runway 等专门做视频的工具 |

**本章小结**

- 视频能理解故事板和角色关系，但动画生硬、缺乏电影感
- 无法与 Luma/Runway 等专业视频 AI 竞争
- 短板明确：线框图和 PPT 天花板，视频地板

---

## 06 避坑指南：一次只做一件事

**Greg Isenberg：** 总结一下使用 Claude Design 的关键教训。

**Greg Isenberg：** 第一，**不要同时运行多个任务**。实测发现并发任务容易崩溃或丢失上下文。在一个项目中保持线性操作——完成线框图再开高保真，完成高保真再开 PPT。

**Greg Isenberg：** 第二，**代币消耗不是关键，价值才是**。有人用完 75% 的额度很心疼。但想想——你从中获得了多少价值？那个 PPT 市场研究、竞品分析、财务建模、科学论证，如果请人做要多少钱？**这才是正确的思考方式。**

**Greg Isenberg：** 第三，**遇到问题就问**。找不到问卷？问它。不知道怎么操作？问它。Claude Design 会告诉你去哪里找、怎么调整。

**Greg Isenberg：** 第四，**视频暂时别指望**。Claude Design 的视频能力充其量 5 分。如果要做视频广告，用 Luma、Runway 或其他专业工具。

**Greg Isenberg：** 我的最终评价——**绝对值得尝试**。线框图是迄今为止我见过的最好的。PPT 生成不可思议。视觉设计非常好。但要有耐心，一次只做一件事。

> **金句 · Greg Isenberg**
> **中文：** 值得尝试吗？绝对值得。它是迄今为止我见过的最好的线框图工具。
> **原文：** Is it worth trying? Absolutely. It's the best wireframing tool I've ever seen, period.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 线性操作 | linear operation | 一个任务完成后再开下一个 |
| 代币价值方程 | token value equation | 关键不是消耗多少代币，而是获得多少价值 |
| 工具选型 | tool selection | 线框图/PPT 用 Claude Design，视频用专业工具 |
| 耐心使用 | patient usage | 并发限制需要耐心，一次专注一件事 |

**本章小结**

- 并发限制是硬伤：一次只做一件事，完成一个阶段再开下一个
- 代币价值方程：不要心疼消耗，要看获得的市场研究/竞品分析/财务建模价值
- 视频用专业工具（Luma/Runway），Claude Design 聚焦设计和 PPT

---

## 大总结

| 维度 | 要点 |
|------|------|
| **PM 式问卷** | 像产品经理一样追问：目标用户、风格、屏幕、游戏化元素 |
| **线框图杀手锏** | 三方向同时生成，代理公司级交付，还没花一分代币 |
| **PPT 天花板** | 市场研究 + 竞品分析 + 财务建模 + 科学论证 = 当前 AI 最强 |
| **高保真** | 超出预期，绘图注释可用，AI 还自动优化文案 |
| **视频地板** | 5 分——能理解故事板但动画生硬，无法与专业工具比 |
| **并发限制** | 同时跑两个任务会崩——一次只做一件事 |
| **代币价值** | 不心疼消耗，要看获得了多少价值 |

> **封底金句**
> **中文：** 值得尝试吗？绝对值得。它是迄今为止我见过的最好的线框图工具——亲自动手试试吧。
> **原文：** Is it worth trying? Absolutely. It's the best wireframing tool I've ever seen, period — just try it yourself.

---

**相关阅读**
- [[GPT Image2深度测评-AI生图进化]] — 同期 AI 图像生成测评
- [[MOC - Harness Engineering]] — AI 时代的设计工具与工程实践
