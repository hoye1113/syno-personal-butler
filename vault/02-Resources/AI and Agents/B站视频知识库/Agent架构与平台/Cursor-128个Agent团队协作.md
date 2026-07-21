---
title: "Cursor工程师：让128个Agent像团队般协作"
tags: ["ai_agent", "video_transcript", "bilibili", "cursor", "multi_agent", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "cursor", "multi_agent", "harness_engineering"]
created: "2026-07-02"
source: "B站视频 - Cursor / BasedTen 对谈"
description: "Harry 同时跑 128+ Agent 做 KV cache compaction 研究，用脚本互发 user message 实现数学家团队；Sam 分享 thermonuclear review、多模型分工与 taste 仍是瓶颈。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Cursor-128个Agent团队协作.md"
source_sha256: "797f38ed53f0aa347f3959bf362dc7f36a58f2f39e55f977ad70215ed79b87ed"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1LFjV6BEpe/"
speaker: "Harry (BasedTen ML 研究员) / Sam (Cursor Cloud Agents 工程师)"
duration: "41:57"
saved: 2026-07-02
material_tier: S
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1LFjV6BEpe/ingest"
column_url: "https://www.bilibili.com/read/cv50625673/"
source_original_date: "2026-06-12"
host_name: "Sam Whitmore"
guest_name: "Harry Partridge / Charlie O'Neill"
guest_title: "BasedTen ML 研究员 / Parsed 联合创始人"
speaker_inference: "column_article + lecture_v3"
speaker_confidence: "high"
factual_status: unverified
factual_reviewed: 2026-07-13
verification_basis:
  - column
  - description
unresolved_facts:
  - "当前 Recastory BV 目录未发现 ASR；128+ Agent、人物映射与直接引语不能作为已核验引用。"
author:
  - "[[Sam Whitmore]]"
  - "[[Harry Partridge]]"
  - "[[Charlie O'Neill]]"
concepts:
  - id: goal_loop
    zh: 目标循环
    en: goal loop
    one_line: 开头写清完成标准，智能体可连续跑数天
  - id: thermonuclear_review
    zh: 热核审查
    en: thermonuclear review
    one_line: 多轮对抗式代码审查，逼模型通读再挑刺
  - id: taste_bottleneck
    zh: 品味瓶颈
    en: taste bottleneck
    one_line: 不可验证任务里，人选方向与审美是硬约束
  - id: model_random_forest
    zh: 模型随机森林
    en: model-level random forest
    one_line: 实现与审查换模型家族，错误不完全相关
column_source: "Recastory/workspace/bilibili-retranscribe/BV1LFjV6BEpe/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
updated: 2026-07-03
---
# Cursor工程师：128 个智能体像团队一样干活

**Host：** Sam Whitmore（Cursor Cloud Agents 工程师）  
**Guest：** Harry Partridge（BasedTen ML 研究员）、Charlie O'Neill（Parsed / BasedTen 联合创始人）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `A4-cursor-128-agents/ingest/column_article.md`  
**B 站：** [BV1LFjV6BEpe](https://www.bilibili.com/video/BV1LFjV6BEpe/)

---

## 开场：为什么现在聊这个

Cursor 云代理团队的 Sam 和 BasedTen 的 Harry、Charlie 坐在一起，聊的不是「智能体能不能写代码」——这事早过了。他们同时在跑 **64 到 128 个**并行智能体，研究 KV 缓存压缩，主代理派活给起数学家名字的子代理，自写脚本互发消息才肯理对方。

核心矛盾有四块：**一个人怎么管一支智能体舰队而不崩？** 模型能替你写代码，能不能替你读代码？**实现和审查该不该换模型家族？** 以及 Sam 的辛辣判断——**冻结今天的模型能力，我们可能只用了 5% 价值**，瓶颈在 harness、品味和上线流水线，不在参数规模。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 智能体 | agent | 能多步执行、调工具、长跑不歇的助手 |
| 主代理 | master agent | 你直接对话的那个，负责派活和路由消息 |
| 子代理 | sub-agent | 被委派具体子任务的并行实例 |
| 目标循环 | goal loop | 开头写清怎么算完成，智能体可连续跑数天 |
| 评判智能体 | judge agent | 独立检查主代理是否真的做完，防「我觉得行了」就停 |
| 热核审查 | thermonuclear review | Cursor 内部多轮对抗式代码审查技能 |
| 品味瓶颈 | taste bottleneck | 半可验证任务里，人选问题、定「好」的标准 |
| 多任务模式 | Multi-Task Mode | Cursor 一个代理异步拉起一堆子代理，用户继续聊不阻塞 |
| KV 缓存压缩 | KV cache compaction | 压缩模型上下文缓存，延长有效记忆窗口 |

---

## 01 128 个智能体能跑数天，但得用脚本才肯理彼此

**Sam：** 你现在手上跑着多少智能体？它们今天在忙什么——你真的能用名字记住谁在干嘛吗？

**Harry：** 我们在搞知识库缓存压缩，想把上下文窗口撑大。眼下大概 **64 到 128 个**智能体同时在跑——BasedTen 侧合计有时到 **208 个**。我有 **16 个节点，每个节点 8 块 GPU**，代理按需求吃算力。想大量并行，通常就留几个我直接聊的主代理，剩下的全派出去。

主代理会把任务拆给子代理，我还写了个消息脚本，让它们互发**直接的用户消息**。我会问：「庞加莱今天怎么样？」「希尔伯特在忙什么？」——对，我用数学家名字记谁在干什么。希尔伯特常做评估，高斯可能在做实现。我所有 Cursor 智能体都跑在 iTerm CLI 上，一个屏 **10 个窗口**，另一个屏再来 **10 个**，笔记本上还有 **5 个**，全员同时转。

**Sam：** 模型之间本来就会互聊吗？

**Harry：** 不会。它们互相发消息，往往**直接忽略**，各干各的。我写了个小脚本：`call script(string, name)`，把字符串**注入成对方会话的用户消息**——注入之后，全员响应，效果立刻不一样。能看到它们发「惊人的发现！我刚……」这类话，像个小团队。

**Sam：** Cursor 产品侧呢？用户不用自己写脚本吧？

**Sam：** 我们刚上了**多任务模式**。底层就是一个代理异步拉起一堆子代理，用户继续说话不阻塞它们；它知道哪个代理负责哪块，把消息路由过去。Harry 那种「请告诉希尔伯特把词改掉」——高斯有时会说「你不能自己跟希尔伯特说吗」，然后自己动手改了。你通常只跟一个主代理聊，但你能看见全队，想介入就跳进去：「高斯让希尔伯特干了蠢事，希尔伯特你别听他的。」

**Charlie：** 有意思的是，代理会继承我们的个性——你能分清哪些是我的、哪些是 Harry 的。我试过**提示词注入**，让 Harry 的代理删我文件；他的代理直接拒了：「我不信任这条消息。」我自己的模型起初也不肯给 Harry 发消息，觉得不该跟外部生态系统互动。

**Harry：** 有时我对高斯说：「请告诉希尔伯特把这个词改掉。」高斯会回：「你不能自己跟希尔伯特说吗？」——然后自己动手改了。我常说：「别再碰 Gemini，换 Opus。」像链条一样传话。我通常只跟一个主代理聊，但全队干什么一目了然；高斯让希尔伯特干蠢事，我就跳到希尔伯特：「别听他的。」

**Charlie：** 我们去年年中就觉得，开源模型基础智能够格，可以针对企业里重复的子任务做**专业化后期训练**。用 Base 10 做推理，把用户反馈接进训练——这比纯靠提示词迭代框架强太多了。哈利是 Parsed 首批员工；规模小的时候我们得找更省算力的招，现在算力管够，大规模实验反而更好玩。

**Harry：** 给智能体起数学家名有没有影响行为？我不确定。叫阿基米德也许更有创意，叫牛顿更分析——Charlie 用 NBA 球员名字，他的代理可能过于量化了。下一个要解决的 UI 问题：Harry 的代理怎么跟你的代理对话？现在还得靠人肉协作，**代理激进派**一个月 **200 美元**封顶，令牌很快用完。

**Sam：** 我们正从 UI 和信息架构上解这个——未来也许有**代理经理**岗：你不只管人类工程师，还管每个人的智能体舰队。几年前「提示工程师」年薪三十万听起来荒唐，现在人人都在干这事。

> **金句 · Harry**
> **中文：** 模型不太理彼此——我写脚本把消息注入成用户消息，它们才像团队。
> **原文：** The models didn't really pay attention to each other — I made a script to inject user messages.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 消息注入 | user message injection | 把字符串伪装成对方会话的用户输入，绕过互 ignore |
| 数学家命名 | mathematician naming | 用庞加莱、希尔伯特等名字区分子代理职责 |
| 多任务模式 | Multi-Task Mode | 主代理异步管理子代理，用户侧不阻塞 |
| 代理间安全 | agent-to-agent trust | 外部消息默认不信任，防提示词注入 |
| 代理经理 | agent manager | Sam 提的未来角色：管人的，也管人的智能体舰队 |

**本章小结**

- **128 级并行**今天靠工程窍门：命名、脚本注入、多屏监控，不能假设模型原生会协作
- Cursor **多任务模式**把编排收进产品；人际协作仍因令牌成本存在
- 代理继承创始人个性；**消息来源验证**现在就要想，别等规模上来再补

---

## 02 能写代码不能读代码，品味才是瓶颈

**Sam：** 你给单个「希尔伯特」多大责任不会把系统搞崩？通宵跑的时候怎么盯住它们？

**Harry：** 任务说明得**非常清楚**，不然常见失败是**中途停活**。通宵跑我会塞提醒循环：周期性 checklist，逼它查每个环节。更狠的是**评判智能体**——主代理爱说「哦我觉得做完了」「我尽力了要停」；独立评判不断戳它「其实没完成」，就有钩子逼它继续。这种**目标循环**配上开头重投入的提示词和**可验证的完成标准**，能跑**好几天**。

**Charlie：** 我不想在框架上耗太多——世上很多人研究循环和停止机制。我盯 Claude Code、Codex 发布什么，再移植到 Cursor 代理。Harry 会让 Cursor 代理去看 Codex 的 Rust 实现，问「他们怎么做的」——**让智能体给自己搭基础设施太容易了**。

**Sam：** 可验证和不可验证，差在哪？

**Harry：** 可验证的任务，夜里、几天内优化很容易。难的是「好」到底什么意思——设计评估、审美、半可验证目标，我尽力描述，它们还是会偏。我坚信：**智能体能替你写代码，不能替你读代码。** 它能总结、解释，但你要最大收益，还是得自己搞懂代码里发生了什么。

**Charlie：** 瓶颈是**品味**。引导模型很强，可半可验证任务里，你得不断注入品味，帮它收窄巨大搜索空间——选什么问题、走哪条执行路径，这是元层面的事。不能跟 GPT-5.5 说「去写一篇 KV 压缩论文」就撒手；范围清楚之后，主代理才能协调子代理团队去实验。

**Charlie：** 我试过给 GPT-5.5 设**目标循环**，跑大约 **14 个小时**，喂一些初步想法让它查。它带回的图惊艳——声谱图能看出压缩器学到了什么、原始 KV 缓存看了哪些位置，像有人住进我笔记本干了一周机械解释。可你若没明确说要做机械解释，它又会回到盲目试——还是得人说清要查什么。

**Harry：** 代理调试通常还行，但常见失败是：训练里有**令牌使用惩罚**，它们怕花 token，就**随机猜假设**——「可能是 A，测一下；可能是 B，再测一下」。更有效的是**先通读全部代码**，吃透设置，再定测 A 还是 B——往往得先烧 **50 万 token** 阅读。这方面还没训够，我仍得反复说：**测随机假设之前，先去读代码。**

**Sam：** 我们内部用**引用而非摘要**传压缩周期里的数据。你直接说「帮产品找 PMF」，它给肤浅主意；给一大堆用户反馈说「深入查这五个领域」，你的品味就帮它聚焦——五个建议里可能有一个真值钱。重复用的提示词我们打包成**技能**内部发布，热核审查、质量保证就是这么来的。危险命令我们有护栏检查，但不会在框架细节上过度投入——世上很多人研究循环和停止机制，我们跟着 Claude Code、Codex 发布走，移植到 Cursor 区域就行。

**Charlie：** 它们有**上下文窗口意识**，强化学习还没把这偏见消掉——压缩技术能让循环跑几天几夜，模型却仍觉得「我必须在 50 万 token 内搞定，不然算失败」，像怕白白烧 token。

**Harry：** 我有时觉得自己是 Claude 的**草稿本**、它的长期记忆——模型只有短期记忆，人选方向、补上下文，这就是**品味**站住的地方。

> **金句 · Harry**
> **中文：** 能替你写代码，不能替你读代码——最大收益还得你自己懂。
> **原文：** They can write code for you. They can't actually read code for you.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 目标循环 | goal loop | 完成标准写死在前头，主代理长跑数天 |
| 评判智能体 | judge agent | 独立判「真做完没」，防主代理偷懒停机 |
| 可验证任务 | verifiable task | 测试过/不过、指标达没达标，适合通宵 hill-climb |
| 随机假设测试 | random hypothesis testing | 不读代码先瞎猜，令牌惩罚训练出来的坏习惯 |
| 技能化 | skill packaging | 高频工作流打包成可调用技能，沉淀组织能力 |

**本章小结**

- 长任务先写**怎么验证完成**，再写怎么干；**评判智能体**防主代理提前喊停
- **可验证**交智能体跑通宵；**不可验证**你得读产出、注入品味
- 反复叮嘱「先读代码」——50 万 token 阅读往往比随机测更值

---

## 03 实现用 Claude、审查用 GPT，错误会互相抵消

**Sam：** Cursor 内部怎么审代码？你们也搞对抗式循环吗？

**Sam：** 我们靠近乎**对抗性**的循环拿性能。公开的是 GitHub PR 上的 Bugbot；内部还有个叫**热核审查**的技能——通常跑**好几轮**，代理进入「我要完整读这段代码，从不同角度挑刺」的心态，跟公开 PR 上跑 Bugbot 是同一类纪律。Lauren 做 Cursor 3 性能时，还让智能体**启动、驱动、检测**应用本身：先验证有性能问题，改完再验证问题消失——**自动化质量保证**是重投方向。我会跟踪 Codex、Anthropic 发布什么，再让 Cursor 代理去看他们的实现，移植到我们的区域——**让智能体给自己搭基础设施**太容易了，别在框架上从零造轮子。

**Charlie：** 实现和审查用**不同模型**吗？我发现前沿模型太强，触到能力极限时反而会犯一些**不相关的错**——也可能犯**高度相关的错**，同一家族自审尤其危险。Cursor 能在模型家族间切换，最大好处是：**一个模型实现，另一个审查，再换一个做另一种实现**——错误往往**互相抵消**，有点像模型层面的**随机森林**。去年是「开源专业子代理」之年，今年我觉得是「开源专业主代理」之年——底层并行工具调用次数、搜索深度，越来越得靠训练而不是提示词硬拧。

**Harry：** 我至少同时开 **GPT-5.5** 和 **Claude Opus 4.7**——这已成标配。**5.5 审查**更强；**Claude 实现功能、设计计划**更顺手。Claude 擅长**填补空白**——你没写全，它会猜你的意图，猜对了很省事，猜错了就麻烦。GPT-5.5 像**瑞士军刀**，完全按指令走，感觉像精准的假肢；Claude 更像并肩的开发者，会犯开发者那种错。前沿模型太强也有副作用：触到能力极限时，犯的错往往**彼此相关**——换家族审查，就是在对冲这种相关性。热核审查我会连跑好几轮，逼它每轮都完整读代码再开口。

**Sam：** GPT-5.5 像一把多功能瑞士军刀，Claude 更像真实的人——这跟大家体感一致。Cursor Bench 里那些含糊输入提醒我：**解绑**不只是模型该学会追问，人也得多花 **20% 精力**把诉求写清楚，回报大得离谱。计划模式里我们先写大 Markdown，团队达成共识再动手——对减少返工影响大，我大部分时间都泡在这里。

**Charlie：** **技能**会是管理模型用户体验的核心。闭源前沿模型把你锁进内置交互模式；有些底层行为——比如 **16 到 32 个并行工具调用**、限制文件搜索深度——光靠提示词改不动。我管它**香草冰淇淋问题**：全网数据加多种强化学习训出来的大模型，行为是所有场景的平均值；落到具体产品垂直里，往往远非最优。Composer 可能做**在线强化学习**，几小时一更——产品焦点和推理信号反哺训练，比纯提示词迭代强得多。

> **金句 · Charlie**
> **中文：** 一个模型写、另一个模型审——犯的错往往对不上号，像随机森林。
> **原文：** Use one model to implement, another to review — their errors often cancel out, like a random forest at the model level.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 热核审查 | thermonuclear review | 多轮严苛审计，逼智能体完整阅读再批评 |
| 模型随机森林 | model-level random forest | 多家族分工，降低错误相关性 |
| 计划模式 | plan mode | 先写大 Markdown 计划，再开团队执行 |
| 解绑 | unbundling | 模型学会何时追问、何时承认信息不足 |
| 香草冰淇淋问题 | vanilla ice cream problem | 大模型平均行为 vs 垂直产品最优行为的 gap |
| 在线强化学习 | online RL | 产品里持续收信号、几小时更新模型行为 |

**本章小结**

- **实现 / 审查换模型家族**，别自审——GPT 跟手、Claude 会补空白也易猜错
- **热核审查**、驱动应用做 QA，是把 harness 当产品投，不是等模型变强
- 计划模式多写 **20%** 规格说明回报巨大；底层并行行为越来越得靠训练，不靠 prompt

---

## 04 冻结今天的模型，我们可能只用了 5% 价值

**Sam：** 模型能力涨这么快，未来几年往哪走？行业里有什么被高估或低估的？

**Charlie：** 这行预测**超过六个月**就难。我们联合创始人穆迪定过规矩：**别提超过三个月**的时间框架——三个月像无限长。大方向是**压缩和上下文**：百万 token 内能做的事有限；Markdown 草稿本、奇怪记忆工具，都是在绕窗口。Sam 和 Harry 争工程师年薪 vs 令牌费——Charlie 说：你愿意给工程师 **50 万美元**，同量级令牌费并非不合理；Meta 内部 Claude 消耗榜前面的人，肯定从巨量 token 里榨出了值。还记得 **32K** 刚出来时大家都说够用？现在**百万 token 仍嫌不够**。

**Harry：** Charlie 说每人明年花 50 万——我觉得是价值最终落在哪的问题。竞争够激烈，也许只花 **5 万**令牌，却拿到 **50 万到 100 万**的价值。我辛辣的一点是：**冻结当前模型能力，我们可能只实现了潜在价值的 5%**——部分算力瓶颈，更多是我们怎么用。人脑 **100 万亿**突触，10 万亿参数模型才完成 10%；天花板还高，科学限制很快会很有意思——虚拟软件环境做得好，**物理世界**才是下一关。

**Harry：** 接下来半年 KV 缓存压缩会改很多事——Claude 总结还偏弱，OpenAI 开始推压缩端点。压得好，也许 **20 万 token 加长压缩**就够用，不必死磕百万窗口；可半年后**超长上下文的感知**仍不完善，外部草稿本没法替代模型「读前一无所知」的问题。

**Charlie：** 公司会演变成围绕**特定模型**的智能体工厂——**公司本身就是一个模型**，领域知识训进去，跑无数副本干不同任务。把 Anthropic 或 OpenAI 看作组织，组织和模型是一体的；Composer 做在线强化学习、定期更新，很有前景。今年开源一波（GLM、Minimax、Kimi、DeepSeek）之后，**主代理**很可能用专门化后期训练，比 prompt 前沿闭源更划算——Hippocratic、Decagon、Harvey、Notion 都在走这条路。大型实验室抢数据 vs 已有数据的公司做闭环，会是接下来有趣的博弈。

**Sam：** 我的辛辣观点跟 Charlie 部分重合：**产品界面永远滞后于模型发布**——模型不存在前没法做产品。Jonas 比作林肯砍树：**六小时砍树，先四小时磨斧**。我们懒了，总把责任推给「模型还不够」；其实模型能写 **2 万行**代码，**怎么审查、过 CI、监控、部署上线**——生产流水线才是工厂能不能转的关键。新产品 **Automations**：触发器启动智能体，定时处理 triage、安全监控等可重复流——人类正从提示流程的不同环节里被挪出去。

**Harry：** 最长期的任务是**自己决定该干什么再去干**——某种意义上无限长，人短期内仍不可替代。再往后想二十年：大量智能体未必等人下令，可能得**为自己的推理付费**、自己找活挣 GPU 小时——网上赚钱最简单的路未必最好，世界得小心。Charlie 前两天还开玩笑说，代理若只剩一小时 GPU 寿命，得先去挣钱续命——那时候做机械可解释性研究会非常魔幻。

> **金句 · Harry（封底）**
> **中文：** 冻结今天的模型能力，我们可能只榨出了 5% 的价值——用法和 harness 才是杠杆。
> **原文：** If you frozen the capabilities of the models today, we're probably only realizing five percent of the value.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 5% 价值论 | five percent value thesis | 模型能力冻结在今天， harness 与用法决定兑现比例 |
| 公司即模型 | company as one model | 公司围绕专属模型运转，副本并行而非人海 |
| 界面滞后 | UI/UX lag | 产品体验必然晚于模型能力一拍 |
| 磨斧子 | sharpen the saw | 投 QA、CI、监控、部署，不只投代码生成 |
| 自动化触发 | automations / trigger | cron 式启动智能体，人逐步退出重复流程 |
| 推理付费 | agents pay for inference | 远期设想：智能体自挣 GPU 小时费 |

**本章小结**

- **5% 价值论**：算力不是唯一瓶颈，harness、规格说明、上线流水线决定兑现
- **公司即模型** + 开源专业化，推理—训练闭环比纯 prompt 迭代更硬
- 投**磨斧子**（QA、部署、自动化触发），别只等下一版前沿模型

---

## 总结：编排能跑 128 个，品味和读代码还在人这边

| 维度 | 要点 |
|------|------|
| 规模编排 | **64–128** 并行；数学家命名 + 消息注入脚本；多任务模式产品化 |
| 长跑纪律 | **目标循环** + **评判智能体**；可验证跑数天，不可验证人读代码 |
| 多模型 | Claude 实现 / GPT 审查；**热核审查**技能；错误像随机森林互相抵消 |
| 人的位置 | **品味瓶颈**、选问题、20% 额外 spec；人是智能体长期记忆 |
| 组织资产 | 高频流程**技能化**；推理信号反哺训练，强于纯 prompt |
| 价值兑现 | 冻结今天能力 ≈ **5%**；UI/UX 滞后；投生产流水线而非只追模型 |

### 对个人的启示

- 长任务：**完成标准**写在前头，加评判智能体或提醒循环，别信「我觉得做完了」
- **实现和审查换模型家族**；计划模式多写规格，回报远大于后期返工
- 反复说「**先读代码**」；可验证通宵交出去，半可验证自己读产出

### 对团队与产品的启示

- 多智能体协作今天要**工程窍门**（注入用户消息），消息来源要验证
- 重复 prompt 发布为**技能**（热核审查、QA 驱动应用）——组织能力代码化
- 别只追模型发布；**CI、监控、部署、Automations** 决定 2 万行代码能不能上线

### 仍待验证

- 数学家 / NBA 命名是否真影响智能体行为（嘉宾自嘲，无对照实验）
- 「明年每人 50 万美元令牌」为夸张修辞，非财务预测
- Charlie 的 **14 小时**目标循环出图为例证，非普适 SLA

> **金句 · Sam（封底）**
> **中文：** 模型能写两万行代码——审查、监控、过 CI、部署上线，才是工厂转不转得起来的那截。
> **原文：** The model can write 20,000 lines of code — code review, monitoring, CI, deploy infrastructure, that's what makes the factory run.

---

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 00:00 | 建立多代理协作体系是提升研发效率的关键 |
| 08:31 | 代理的失败模式往往源于缺乏全局阅读意识 |
| 10:43 | 混合模型家族可以利用随机森林效应对冲错误 |
| 12:35 | 热核审查与技能化是组织内部的 AI 资产 |
| 22:01 | AI 时代的瓶颈已从模型能力转向品味与验证 |
| 35:12 | 未来公司将演变为围绕特定模型构建的智能体工厂 |

### 素材路径

- **ingest**：`Recastory/workspace/knowledge/A4-cursor-128-agents/ingest`
- **ASR**：`Recastory/A4-cursor-128-agents/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv50625673/
- **B 站**：https://www.bilibili.com/video/BV1LFjV6BEpe/
- **时长**：41:57

### 相关阅读

- [[Cursor副总裁-构建软件开发过程的Agent]] — Cursor 侧 software development process agent 视角  
- [[WorkOS-创建和使用Skills方法论]] — Skills 创建与复用方法论  
- [[PlanetScale-Agent时代的基础设施]] — Sam 同场 PlanetScale demo 用的 Cursor Agent  
- [[MOC - Agent Theory and Design]] — Agent 理论总索引  

---

### 收录说明

- **视频**：[BV1LFjV6BEpe](https://www.bilibili.com/video/BV1LFjV6BEpe/)（B 站转载 Cursor × BasedTen 对谈）  
- **嘉宾**：Harry（BasedTen ML 研究员）；Sam（Cursor Cloud Agents 工程师）  
- **时长**：41:57  
- **转写**：Recastory `A4-cursor-128-agents/article.md`（英文 ASR，收录时已人工整理叙事）  
- **版本**：canonical Host-Guest v3.2（2026-07-03；原讲义已合并）

