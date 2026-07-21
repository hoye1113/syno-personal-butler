---
title: "DeepMind 团队：AI 评估应走向规划化和民主化"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV1Qh7R6HEf5/"
description: "Kaggle × DeepMind 的 Nicholas Kang 与 Michael Aaron：评估碎片化与不透明、黑客马拉松民主化 AGI 基准、SAE 智能体考试、Game Arena PvP 抗饱和、Benchmarks 开放平台与工具/模型混淆。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/AI评估与研究/DeepMind团队-AI评估规划化与民主化.md"
source_sha256: "c35d45be633b6822308bca522edae144467a3cf151e7fc3bdb3d710ad6cdd333"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1Qh7R6HEf5/"
column_url: "https://www.bilibili.com/read/cv50041992/"
source_original_date: "2026-05-26"
host_name: "Nicholas Kang"
guest_name: "Michael Aaron"
guest_title: "Kaggle 软件工程师（评估与基准测试）"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1Qh7R6HEf5/ingest"
speaker: "Nicholas Kang / Michael Aaron"
duration: "20:03"
saved: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1Qh7R6HEf5/article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1Qh7R6HEf5/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
author:
  - "[[Nicholas Kang]]"
  - "[[Michael Aaron]]"
concepts:
  - id: eval_democratization
    zh: 评估民主化
    en: eval democratization
    one_line: 让行业专家与社区参与定义 AI 能力边界
  - id: benchmark_saturation
    zh: 基准饱和
    en: benchmark saturation
    one_line: 静态测试集被刷榜后失去分辨力
  - id: standardized_agent_exam
    zh: 标准化智能体考试
    en: Standardized Agent Exam (SAE)
    one_line: 一行提示词上考场，消费者 Agent 安全基线
  - id: game_arena
    zh: 游戏竞技场
    en: Game Arena
    one_line: PvP 狼人杀/扑克/国际象棋，Elo 抗饱和
  - id: tool_model_ambiguity
    zh: 工具与模型混淆
    en: tool vs model ambiguity
    one_line: Agent 评测差 22% 可能来自工具链而非模型
---


# DeepMind 团队：AI 评估应走向规划化和民主化

**Host：** Nicholas Kang（Kaggle 基准测试产品经理，智能体评估）  
**Guest：** Michael Aaron（Kaggle 软件工程师，评估与基准测试）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `BV1Qh7R6HEf5/ingest/column_article.md`  
**B 站：** [BV1Qh7R6HEf5](https://www.bilibili.com/video/BV1Qh7R6HEf5/) · **专栏：** [cv50041992](https://www.bilibili.com/read/cv50041992/)

---

## 开场

**Nicholas：** 我是 Nick，Kaggle 基准测试的产品经理，跟工程师团队一起运营评估平台，重点做**智能体评估**。新加坡人，现居湾区，这次飞来开会分享我们在 Kaggle 上的工作。

**Michael：** 我是 Michael，Kaggle 软件工程师，主要做评估和基准测试这块。

**Nicholas：** Kaggle 是全球最大的 AI/ML 社区，**3000 万用户**。过去两年我们在生成式 AI 评估上砸了不少力气——行业里有很多有意思的难题，鲜有人碰，而我们正好有能力接。今天想分享进展，也欢迎大家一起来贡献。

五章：**评估现状的三重困境** → **黑客马拉松民主化 AGI 基准** → **SAE 标准化智能体考试** → **Game Arena PvP 抗饱和** → **Benchmarks 开放平台与工具/模型边界**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 基准测试 | benchmark | 固定任务集 + 排行榜，用来比模型能力 |
| 基准饱和 | benchmark saturation | 模型刷到接近满分，榜单再也分不出高下 |
| 评估民主化 | eval democratization | 不只 AI 研究员定义「智能」，行业专家也能出题 |
| 标准化智能体考试 | Standardized Agent Exam (SAE) | 像 SAT，粘贴一行提示词就上考场拿分 |
| 游戏竞技场 | Game Arena | 模型 PvP 玩狼人杀、扑克，用 Elo 排名 |
| 工具与模型混淆 | tool vs model ambiguity | 测的是外部工具还是模型本身，常常分不清 |
| LLM 评判 | LLM-as-a-judge | 用另一个大模型当裁判打分 |
| Bradley-Terry 配对 | Bradley-Terry pairing | 尽量少打场次还能估出 Elo 的配对算法 |

---

## 01 评估的三重困境：分散、不透明、认知盲区

**Nicholas：** 先说问题。当前 AI 评估**分散、去中心化，还很快过时**。每天大量新基准冒出来，要了解它们，得在 Arxiv 上啃几小时论文——不合理。即便这是我的全职工作，我也跟不上。论文一出，排行榜很快失效：作者转向新基准发更多论文，旧榜没人看了。

第二，评估**不总是透明、可访问、可验证**。模型发布商贴出来的图表，你看不到基准怎么设的、模型什么配置、测试怎么组织和执行的——**实际测了什么，外人不知道**。

我们跟一家 AI 实验室发过基准，竞争对手实验室跑出了更好的数。后来才发现，他们针对自家模型做了优化，用了 API 里的压缩技术；我们对所有模型一视同仁。所以你看到的分数，**不一定反映真实情况**。

第三，**AI 研究员的数量，跟全世界知识的广度不成比例**。全球大约 **3 万名 AI 研究员**，软件工程师、数据科学家这类技术人员有 **3000 万**。我们指望 AI 帮绝大部分人，却只有极少数人在出评估题。某个领域没人测，你就不知道模型在那儿表现如何——模型会在一些领域超人，另一些领域平平，**不公平**。

举个真例子：一位**废水处理厂工程师**用行业经验做了专有数据集，在 Kaggle 上建基准，测 AI 能不能帮他避免事故。这数据网上没有，也不在 AI 实验室的重点清单里——对他们暂时没有直接经济效益。**开源贡献评估**，我们认为非常重要。

> **金句 · Nicholas**
> **中文：** 全世界 3 万人出考题，3000 万人等着被服务——认知盲区是结构性的。
> **原文：** Only ~30k AI researchers vs ~30M technical professionals creating evals for the world.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 排行榜过时 | leaderboard staleness | 新模型一出，旧榜迅速失去参考意义 |
| 认知盲区 | cognitive blind spot | 没人测的领域，模型表现是黑箱 |
| 垂直领域基准 | domain-specific benchmark | 废水处理这类实验室不会主动做的题 |
| 可验证性 | verifiability | 外人能复现设置、核对结论 |

**本章小结**

- 基准太多太散，全职做 eval 的人也追不完
- 发布商图表常缺透明度，竞争对手「优化跑分」扭曲对比
- 评估权集中在少数研究员手里，垂直行业需求被系统性忽略

---

## 02 黑客马拉松：把全球专业知识拧成 AGI 评估

**Nicholas：** 我们在推几条路，工作很难，我快速过前两条，Michael 后面深讲另外两条。

左上：**黑客马拉松**——任何人都能在我们平台办，跟评估问题天然合拍。右上：**智能体考试**，把评估过程民主化。左下：**游戏竞技场**，常青 PvP 基准，Elo 评级，持续提升、不易饱和。右下：**Benchmarks**，开放社区平台，任何人构建、运行、分享评估。

黑客马拉松是**汇聚精力和领域知识**的好办法。过去三年全球生成式 AI 的投入就是例子——适当精力、投资和时间，很少资源也能干很多事。我们要给问题设**护栏**，避免失控，但也要留空间让人发挥创造力。结果**全部开源**，造福所有人，不是只服务一小撮人。

右侧截图是我们正跟 **Google DeepMind AGI 团队**合办的黑客马拉松。DeepMind 几周前发了篇论文，讲怎么衡量 AGI 认知能力；我们据此启动马拉松，聚焦论文 **10 项能力里的 5 项**，让大家在这些领域建基准——**给每个人贡献 AI 研究的机会**，不只实验室里那几个人。每个人都有独特贡献，这是 AI 实验室单独做不完的。

但运营黑客马拉松平台也不简单。要给参与者**对的工具**。听起来小事，怎么给全球几千人提供工具——托管数据集、访问 AI 模型？我从前没想过。很多贫困背景的人**付不起 API 密钥**去碰最先进模型。怎么让他们用**书面报告**分享工作，让别人能看、能学、能接着做？

还有一点：AI 智能体在很多方面很强，**判断创新和创造力**却不太行。很多工作仍要人类专家，专家之间的协调也极难——这是平台方必须促进的事。

> **金句 · Nicholas**
> **中文：** 设护栏，留创意，结果开源——评估不该是大厂私有定义「智能」的垄断。
> **原文：** Set guardrails, allow creativity, open-source results for everyone—not a small group.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| AGI 认知能力拆解 | AGI cognitive capability decomposition | 把「通用智能」拆成可测的具体任务 |
| 护栏 | guardrails | 黑客马拉松的规则边界，防跑题也防失控 |
| API 访问公平 | equitable model access | 让付不起密钥的参与者也能跑最先进模型 |
| 人类专家协调 | human expert coordination | 创造力评判仍靠人，平台要降低协作摩擦 |

**本章小结**

- DeepMind AGI 论文 × Kaggle 马拉松：10 项能力里先攻 5 项
- 开源 + 全球参与，打破「只有大厂定义智能」
- 平台难点：工具普惠、报告可读、人类专家仍不可替代

---

## 03 SAE 标准化智能体考试：消费者 Agent 的安全空白

**Nicholas：** 第二件事叫**标准化智能体考试**（SAE）。用法很简单：**粘贴一行提示词或智能体**，它去考试，排行榜返回分数，你可以跟别人比。

这是上周刚推出的**实验性 MVP**，我觉得很重要。看现在的 AI 评估，光谱两端：一端是研究实验室和企业，用 BrainTrust 这类最先进工具测智能体和模型；另一端是消费者智能体——开放式框架、OpenClaw 这类——今天早会还听说提交了 **1100 条安全建议**，但大多数在把智能体丢进现实世界之前**并没有真正测试**。这是大问题，而且会越来越严重。

本周讨论的一个重点是：**怎么做更多以安全为重点的考试？** 这样你在把智能体放出去处理收件箱、操作亚马逊账户、替你办事之前，能快速做**基线测试**。

工具可访问，难度也要够。平衡点在这儿：太难，没人考完，运行时间太长；太易，又测不出你要的信号。底部图表显示，**智能体消费者市场或许真存在**——才推出一周，**500 多个智能体**来考了，我们几乎没推广。

我们在 Moatbook 发布后，开始出现衍生帖：分享智能体、分享考试结果，Notebook 上甚至出现 **SAE 备考课程**——像 SAT 备考生态一样自发长出来。

> **金句 · Nicholas**
> **中文：** OpenClaw 安全建议上千条，上线前却几乎没人给它考试——这缺口会越来越大。
> **原文：** Most consumer agents aren't really tested before hitting the real world—a growing problem.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 标准化智能体考试 | SAE | 一行 prompt 上考场，排行榜横向对比 |
| 安全基线 | safety baseline | 部署前最低限度的可靠性与风险筛查 |
| 消费者智能体 | consumer agent | OpenClaw 等面向个人、操作真实账户的 agent |
| 备考生态 | exam prep ecosystem | 社区自发分享技巧、刷题、比分的衍生文化 |

**本章小结**

- 企业端 eval 成熟，消费者 Agent 端几乎空白
- SAE 一周 500+ 智能体参考，难度要在「可完成」与「有信号」间找平衡
- 意外产物：社区「智能体备考课程」，评估开始民主化自生长

---

## 04 Game Arena：PvP 游戏对抗基准饱和

**Michael：** 我来讲**游戏竞技场**和后面的 Benchmarks。

基准的一个问题是**很快饱和**——社区基准和研究基准都这样。**Game Arena** 用 **PvP（玩家对战）** 对抗饱和：模型互打，你永远不会真正饱和，总有一个能赢另一个，饱和至多是暂时的。

选游戏时，我们想分析模型的**独立能力**，所以游戏要多样。目前投入最多的是**狼人杀**——看模型怎么处理欺骗；**扑克**——看随机性的影响。有些模型（比如 Grok）在扑克里**极爱全押**；另一些保守得多。有意思的是，一些**新一代模型扑克反而更差**，因为它们**更厌恶风险**——个性会随着时间显现。**国际象棋**也上了，分析 ML 相关内容时几乎是必测项。

流程概览：先设计迭代游戏，找出适合测的好玩法，确保模型能跑；花大量时间迭代 **Prompt**，保证公平。全程**开源透明**，GitHub 链接在幻灯片上——我们谈到的很多内容在 Kaggle 上**实时可见**，不少已开源，欢迎来玩、给反馈。

构建工具主要用 **OpenSpiel**（强化学习框架）。测模型随机玩是否更好——有时有提升，有时差不多。还有其他有趣特性吗？最后跑模拟：用 **LLM 模型代理**在 Colab 上可用，以一致方式跟所有目标模型对话。系统跑在 Kaggle **模拟平台**上——LLM 流行之前为 RL 建的。安排对局，用 **Bradley-Terry 模型**配对，尽量少打还能估分。发布结果，把所有 LLM 对话整理成 Kaggle 数据集供学习；放进 Benchmarks 显示 **Elo 分数**，并提供**游戏可视化**——你可以去看 Grok 在扑克里怎么全押的。

**挑战也真大。** 成本会爆——扑克为了统计显著性，我们打了大约 **40 万手牌**，每手多回合，账单可想而知。Bradley-Terry 是省场次的一招，但任何能在**不跑数百万局**的情况下仍显著的方法，都极有帮助。

还要确保模型在**声称擅长的领域**表现最佳，又要尽可能快跑——眼看 LLM 互打游戏，最初几局有趣，建系统时很快重复。我们在想怎么让 Kaggle 社区参与进来：比如**提示词黑客马拉松**，社区成员提供 prompt 作为比赛一部分，看谁 prompt 最好、登榜。

跨时间比模型也难：旧模型消失，新模型出现；跟模型端点对话时，后台跑的版本**不总透明**——小难题，但值得跟。

> **金句 · Michael**
> **中文：** 静态榜单会被刷到饱和；PvP 里总有一个能赢另一个，评估永远有张力。
> **原文：** Static benchmarks saturate; PvP means there's always a model that can beat another.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 游戏竞技场 | Game Arena | 狼人杀/扑克/象棋 PvP，Elo 排名 |
| Elo 等级分 | Elo rating | 对战胜负换算成可比的强度分数 |
| OpenSpiel | OpenSpiel | Google 开源 RL 游戏框架，承载对局逻辑 |
| 模型个性 | model personality | 全押型 vs 保守型、风险厌恶等对战风格差异 |
| 统计显著性 | statistical significance | 扑克需 ~40 万手才够稳，成本是硬约束 |

**本章小结**

- PvP + Elo 是抗饱和的常青基准，模型「性格」在对战中暴露
- 开源全流程：游戏设计、prompt 公平性、对话数据集、可视化
- 成本与跨版本可比性是开放难题，社区 prompt 马拉松是探索方向

---

## 05 Benchmarks 开放平台：可验证评估与工具/模型边界

**Michael：** 最后讲 **Benchmarks** 平台。它**不是**生产环境评估平台——很多人谈 production eval，那很酷，但你为生产代码跑断言是另一回事。我们这儿侧重**社区参与**：任何人以**开放、可验证**的方式构建、运行、分享评估。

模式跟生产评估平台很像：写**断言**——比如测某个东西是否奏效。「什么东西越干越湿？」你可以断言：回答里是否包含「毛巾」？也引入了 **LLM-as-a-judge**，类似生产平台。这些归到一个**任务**里，再对用户选的一系列模型跑。任务汇总成**基准**——比如 Nick 提的废水处理基准。

刚在这个房间演讲的 Paige 给我们做了个小任务：解析 **xkcd 漫画里的 SVG**，目标是能**重新创建这个 SVG**吗？左边是代码，一个模型有点过时，Sonnet 3.5 在下面做了很好的复制品。Paige 设了断言：能生成 SVG 吗？文本对吗？还有其他检查——很容易并排比模型。

当然也有挑战。**灵感和激励**难建：生产平台不难，你在给消费者发他们关心的产品，模型行不行一目了然；但要激励社区成员出**别人觉得有趣**的基准，就难。黑客马拉松我们做得不错，Kaggle 有积分和奖牌，平台内置一些动力——即便如此，给 Agent 写一个好 eval 并执行，仍要大量工作。

更棘手的是：项目开始时大家热衷**分析模型**；当我们更多关注 **Agent 在做什么**，**实际测的是什么**就变得很难。Morph Labs 3 月 16 日的博客指出：某些测试里，六个前沿模型差距只有**几个百分点**——我不太信。对编码性能来说，真正重要的是**内部跑的工具**；换工具链，性能能差 **22%**。你是在测工具，还是在测模型？**测试里的模糊性**就在这里。再加上模型快速发布和弃用，跨时间对比会更复杂。

> **金句 · Michael**
> **中文：** 六个前沿模型差几个点？更可能是工具链差了 22%，不是模型差几个点。
> **原文：** A few percentage points between frontier models may reflect tools, not the model—up to 22% swing.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 开放可验证评估 | open verifiable eval | 社区写任务/断言，他人可复跑核对 |
| 断言 | assertion | 规则检查，如回答是否含关键词 |
| LLM 评判 | LLM-as-a-judge | 用模型当裁判，适合开放式输出 |
| 工具链波动 | toolchain variance | 同一模型换工具，分数可差 ~22% |
| 跨时间可比 | cross-temporal comparability | 模型版本更迭让 longitudinal 对比变难 |

**本章小结**

- Benchmarks = 社区版 eval：任务 + 断言 + LLM judge + 多模型并排
- xkcd SVG 复刻类任务展示「创意 + 可验证断言」的组合
- Agent eval 核心难题：分清模型逻辑 vs 工具执行，避免假精细的榜单

---

## 总结

| 维度 | 要点 |
|------|------|
| 现状 | 基准分散、不透明、快速过时；评估权集中在 ~3 万研究员 |
| 民主化 | 黑客马拉松 + 开放 Benchmarks，让垂直行业与全球社区出题 |
| 消费者 Agent | SAE 一行 prompt 上考场，补 OpenClaw 类部署前安全空白 |
| 抗饱和 | Game Arena PvP + Elo，静态刷榜之外的常青评估 |
| 公平性 | Agent 评测必须剥离工具链干扰（~22% 波动），否则比的是栈不是脑 |
| 平台 | Kaggle 3000 万用户、开源透明、API 普惠是基础设施 |

> **金句 · Nicholas & Michael（封底）**
> **中文：** 评估不该是少数人的专利——规划化平台 + 民主化参与，才能看见 AI 在真实世界里的边界。
> **原文：** Eval shouldn't be a monopoly—planned platforms and democratized participation define where AI actually works.

---

## 概念索引（eval）

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| eval_democratization | 评估民主化 | eval democratization | 行业专家与社区共同定义能力边界 |
| benchmark_saturation | 基准饱和 | benchmark saturation | 静态集被刷满，榜单失效 |
| standardized_agent_exam | 标准化智能体考试 | SAE | 消费者 Agent 部署前的一行 prompt 考试 |
| game_arena | 游戏竞技场 | Game Arena | PvP 狼人杀/扑克，Elo 抗饱和 |
| tool_model_ambiguity | 工具与模型混淆 | tool vs model ambiguity | 22% 差距可能来自工具而非模型 |

---

## 附录

### 章节时间戳（B 站简介）

| 时间 | 主题 |
|------|------|
| 03:15 | 现有基准的认知盲区与不透明性 |
| 07:42 | 黑客马拉松民主化 AGI 评估 |
| 10:55 | SAE 标准化智能体考试 |
| 13:20 | Game Arena PvP 抗饱和 |
| 18:10 | Agent 评估：工具 vs 模型 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1Qh7R6HEf5/ingest`
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV1Qh7R6HEf5/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv50041992/
- **B 站**：https://www.bilibili.com/video/BV1Qh7R6HEf5/
- **时长**：20:03

### 相关阅读

- [[YC论文俱乐部-5篇论文揭示AI研究趋势]] — Self-play RL、Lean 验证等研究趋势，与 PvP eval / 抗饱和思路交叉  
- [[OpenAI员工-上下文工程和Agent记忆]] — Agent 能力边界与上下文设计，对照 eval 该测什么  
- [[OpenAI评估团队-不再低估模型]] — OpenAI frontier eval、benchmark 饱和与 bench maxing 对照  
- [[MOC - Agent Theory and Design]] — Agent 理论总索引

---

### 收录说明

- **视频**：[BV1Qh7R6HEf5](https://www.bilibili.com/video/BV1Qh7R6HEf5/)（B 站转载 · Kaggle × DeepMind 会议分享）  
- **讲者**：Nicholas Kang（Kaggle 基准测试 PM）、Michael Aaron（Kaggle SWE）  
- **主源**：Recastory `column_article.md`（专栏完整图稿）  
- **版本**：canonical Host-Guest v3.2 · material_tier S · curate_method canonical-dialogue v3.2
