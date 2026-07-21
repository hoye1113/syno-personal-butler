---
title: "DeepMind CEO：AGI倒计时 2030年见分晓"
tags: ["ai_agent", "ai_philosophy", "bilibili", "video_transcript"]
legacy_tags: ["ai_agent", "ai_philosophy", "bilibili", "video_transcript"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV1yWRmBCEDc/"
description: "Garry Tan × Demis Hassabis：预训练+RLHF 已是 AGI 架构九成，持续学习/长期推理仍缺拼图；MCTS 回归 Gemini；云端前沿+边缘 Flash 层级；智能体 6–12 月爆发；AI for Science 根节点与爱因斯坦测试；创业须拦截 2030 AGI 时间线。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/DeepMind CEO-AGI倒计时2030年见分晓.md"
source_sha256: "0582d3e40b937ba7872e0b3c30ecfa40a92ed13c67616d04f53594e5d92d4711"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1yWRmBCEDc/"
column_url: "https://www.bilibili.com/read/cv48761414/"
host_name: "Garry Tan"
guest_name: "Demis Hassabis"
guest_title: "Google DeepMind 创始人 · CEO · 2024 诺贝尔化学奖（AlphaFold）"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1yWRmBCEDc/ingest"
speaker: "Garry Tan / Demis Hassabis"
duration: "~45 min"
saved: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1yWRmBCEDc/article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1yWRmBCEDc/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article_host_guest"
speaker_confidence: high
author:
  - "[[Demis Hassabis]]"
  - "[[Garry Tan]]"
concepts:
  - id: agi_architecture_90
    zh: AGI 架构九成
    en: AGI architecture ~90% done
    one_line: 预训练+RLHF+思维链已是骨架，缺一两块拼图
  - id: continual_learning
    zh: 持续学习
    en: continual learning
    one_line: 非破坏性整合新知识，不靠暴力塞上下文
  - id: mcts_rl_return
    zh: 搜索推理回归
    en: MCTS / RL return to foundation models
    one_line: AlphaGo 式规划搜索重新嵌入通用模型
  - id: model_hierarchy
    zh: 模型层级
    en: cloud frontier + edge Flash hierarchy
    one_line: 云端超大规模 + 边缘高效小模型协同
  - id: einstein_test
    zh: 爱因斯坦测试
    en: Einstein test
    one_line: 用 1901 年前知识能否复现 1905 奇迹年原创
  - id: agi_2030_timeline
    zh: AGI 2030 时间线
    en: AGI ~2030 timeline
    one_line: 十年深度科技创业须预设 AGI 中途介入
---

# DeepMind CEO：AGI倒计时 2030年见分晓

**Host：** Garry Tan（Y Combinator CEO）  
**Guest：** Demis Hassabis（Google DeepMind 创始人 · CEO）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 中文口语化 · 术语表带英文 · 双语金句）  
**B 站：** [BV1yWRmBCEDc](https://www.bilibili.com/video/BV1yWRmBCEDc/) · **专栏：** [cv48761414](https://www.bilibili.com/read/cv48761414/)

---

## 开场

Garry Tan 把 Demis Hassabis 请进 YC 大厅：国际象棋神童、17 岁做《主题公园》、认知神经科学博士、2010 年创办 DeepMind 只为「解决智能」。AlphaGo 赢李世石，AlphaFold 免费开源拿诺贝尔化学奖，现在在 Google 带队做 Gemini，目标仍是 AGI。

这期六章：**AGI 架构九成，缺持续学习拼图** → **记忆巩固别靠胶带** → **强化学习与 MCTS 回归基础模型** → **云端前沿 + 边缘 Flash 层级** → **智能体还在玩具到生产力的关口** → **AI for Science 根节点与创业拦截 2030**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 通用人工智能 | AGI | 能自主规划、跨域解决问题的系统 |
| 持续学习 | continual learning | 学新东西不毁旧知识 |
| 强化学习 | RL | 靠奖惩试错学策略 |
| 蒙特卡洛树搜索 | MCTS | AlphaGo 那套分支搜索+估值 |
| 思维链 | chain-of-thought | 模型把推理步骤写出来再答 |
| 模型蒸馏 | distillation | 大模型能力压进小模型 |
| 智能体 | agent | 能定目标、做计划、主动执行的系统 |
| 根节点问题 | root-node problem | 一开就整门新学科的科学难题 |

---

## 01 AGI 架构九成，还缺持续学习拼图

**Garry Tan：** 你比几乎任何人都更早想 AGI。看现在的范式——大规模预训练、人类反馈强化学习、思维链——你觉得 AGI 最终架构已经有多少了？还缺什么根本性的东西？

**Demis Hassabis：** 谢谢介绍，很高兴来。这地方真鼓舞人，我得常来。

你刚说的那些组件，我敢打赌都会留在 AGI 最终架构里。它们已经跑很远，证明能干事。我很难想象几年后回头看，发现整条路是死胡同——说不通。

但在已知有效的技术之上，可能还缺一两样东西。持续学习、长期推理、记忆某些方面——都还没解决。系统各维度还要更一致。这些都是 AGI 必需的。现有技术也许靠增量创新就能撑到那个程度，也可能还得攻克一两个大想法。真有的话，我觉得不会超过一两个。五五开吧。在 Google DeepMind，我们两条路同时在走。

我的 AGI 时间线大概在 **2030 年**。你今天开一段深度科技之旅，就得算 AGI 可能在半路冒出来。不一定是坏事，但你得算进去。AGI 必须是一个能主动解决问题的活跃系统——智能体就是这条路，我们才刚起步。

> **金句 · Demis Hassabis**
> **中文：** 预训练、人类反馈、思维链都会留下；缺的可能就一两块拼图，不会超过两个大想法。
> **原文：** Those components will be part of the final AGI architecture—we may still be missing one or two big ideas, not more.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 人类反馈强化学习 | RLHF | 人标好坏，模型对齐偏好 |
| 增量创新 | incremental innovation | 在现有栈上修修补补往上堆 |
| 活跃系统 | active system | 自己定目标、自己规划，不是被动问答 |
| AGI 时间线 | AGI timeline | Demis 押 ~2030，创业要按此排期 |

**本章小结**

- 当前范式不是死胡同，而是 AGI 骨架的大头（Demis 估 **~90%**）
- 持续学习 + 长期推理 + 记忆一致性是核心缺口，大突破 **0–2 个**
- 智能体 = AGI 路径；2030 时间线要求今天起的十年项目预设中途 AGI 介入

---

## 02 持续学习与记忆——别靠上下文窗口硬撑

**Garry Tan：** 跟智能体系统合作时，最疯的是同一套权重反复干不同活。持续学习特别有意思——现在我们像用胶带粘：夜间梦境周期什么的。

**Demis Hassabis：** 对，梦境周期很酷。我们以前把它跟情景记忆巩固连在一起。我博士研究的就是海马体怎么工作——怎么把新知识优雅地并进旧知识库。大脑太会了：睡眠里，尤其快速眼动期，重播重要片段再学一遍。我第一个 Atari 程序 DQN，靠「经验回放」掌握游戏——从神经科学借来的，多次重放成功轨迹。2013 年，AI 还在「黑暗时代」，这很重要。

我同意，我们现在像在贴胶带——把所有东西塞进上下文窗口。感觉不对。理论上机器可以有千万级上下文，存储完美，但**找到跟当前决策相关的信息仍有成本**，不小。就算能存一切，记忆领域还有很大创新空间。

**Garry Tan：** 一百万 token 的上下文其实够大了，老实说很多活能做好。

**Demis Hassabis：** 大多数用途确实够。如果把上下文当工作记忆，人类工作记忆平均也就七个左右数字；我们现在有百万、千万级窗口。问题是我们在里面塞一切——重要的、不重要的、错的。处理方式相当粗暴，感觉不对。

你要是 naive 地录实时视频 token，一百万 token 大约 **20 分钟**。想要一个理解你生活一两个月事情的系统，远远不够。得借鉴神经科学的记忆巩固——非破坏性整合，不是暴力扩容。

**Garry Tan：** 无状态模型对开发者体验意味着什么？你怎么引导它？

**Demis Hassabis：** 缺持续学习，是智能体完不成整活的原因之一。某些方面很有用，组合起来也能做酷事，但适应不了特定上下文。这是「即发即忘、让它自己搞定」的缺失环节。智能体得能学你这套上下文——不攻克这个，拿不到完整通用智能。

> **金句 · Demis Hassabis**
> **中文：** 百万 token 当工作记忆够大，但我们把垃圾也塞进去——粗暴，也不对。
> **原文：** A million-token context is huge as working memory—but we're stuffing everything in, including junk. It's crude.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 情景记忆巩固 | episodic memory consolidation | 睡眠重播重要经历，写入长期记忆 |
| 经验回放 | experience replay | DQN 反复播放成功轨迹学策略 |
| 工作记忆 | working memory | 当下决策用的短期信息槽 |
| 非破坏性整合 | non-destructive integration | 学新的不冲掉旧的——AGI 记忆瓶颈 |

**本章小结**

- 上下文窗口 ≠ 记忆系统；暴力扩容成本高、检索贵、塞了太多噪声
- 神经科学路线（巩固、回放）比「更大窗口」更可能补上拼图
- 持续学习是智能体从片段工具走向完整任务的硬门槛

---

## 03 强化学习与 MCTS 回归基础模型

**Garry Tan：** DeepMind 历来偏强化学习和搜索——AlphaGo、AlphaZero、MuZero。这套理念进 Gemini 多少？强化学习是不是还被低估？

**Demis Hassabis：** 可能被低估了。潮起潮落。DeepMind 从第一天就在做智能体——我们当时就这么叫自己的方向。Atari、AlphaGo 都是智能体：自主完成目标、主动决策、制定计划。先在游戏领域，因为好处理，再挑战越来越复杂的游戏——AlphaStar 打《星际争霸》，基本上现有游戏玩遍了。

下一个问题：能不能泛化成世界模型或语言模型，而不只是游戏模型——这就是近几年在做的。你今天看到的思维链、思维模式，很多是 AlphaGo 开创工作的延续，它们又回来了。我们正以更通用的方式重审旧想法——蒙特卡洛树搜索和其他增强强化学习的方法。AlphaGo、AlphaZero 许多想法跟今天基础模型直接相关。未来几年会看到大量这类进展。

**Garry Tan：** 推理进展如何？思维链已经很强，但还会犯聪明大学生不会犯的错。要改什么？

**Demis Hassabis：** 思维范式还有很大创新空间。现在的做法还是偏粗暴。思维链里做监控、中途干预——空间很大。我们的系统和竞争对手的系统有时「想太多」，甚至循环。我喜欢跟 Gemini 下棋——所有领先基础模型下棋其实都相当烂。看思维轨迹很酷，过程可读。我很快能判断它是否跑题、思路有没有用。有时考虑一步，意识到是失误，又找不到更好的，回到那步最终还走——精确推理系统不该这样。

差距仍然巨大。可能只要一两个调整就能补上。这种「不稳定的智能」很明显：一边解国际数学奥林匹克金牌题，一边用某种问法还会犯初等数学错。缺的是某种关于自身思维过程的**内省**能力。

> **金句 · Demis Hassabis**
> **中文：** 思维链是 AlphaGo 的续集——MCTS 和强化学习正在回到通用模型核心里。
> **原文：** Chain-of-thought is a continuation of AlphaGo—MCTS and RL are coming back into foundation models.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 蒙特卡洛树搜索 | MCTS | 模拟走子、估值、选最优分支 |
| 思维链推理 | chain-of-thought reasoning | 先展开推理步骤再给出答案 |
| 内省 | introspection | 模型监控、修正自己的思考过程 |
| 不稳定智能 | brittle intelligence | 难题能对、简单题会翻车 |

**本章小结**

- DeepMind 的 agent 基因（RL + 搜索）正在重新嵌入 Gemini 等基础模型
- 推理不稳定 ≠ 缺大模型，更缺思维过程监控与内省
- MCTS/RL 回归是补逻辑推理短板的主线之一

---

## 04 模型层级：云端前沿 + 边缘 Flash

**Garry Tan：** 模型越大越聪明，但蒸馏让小模型快很多。你们 Flash 模型据说 **95% 性能、十分之一价格**——对吗？蒸馏有上限吗？50B 或 400B 能跟今天旗舰一样聪明？

**Demis Hassabis：** 建最大模型才有前沿能力——这是我们的核心优势之一：极快把能力提炼、封装进越来越小的模型。我们发明蒸馏，Jeff、Oriol 他们仍是世界顶尖。巨大动力来自要支撑最大规模的 AI 服务：搜索 AI 概览、Gemini App、地图、YouTube——Google 每个产品都在接。数十亿用户，十多个产品各超十亿用户。必须极快、极省、低延迟——逼我们把 Flash 乃至更小模型做到极其高效。

我目前没看到信息密度的理论上限。也许某天会撞墙，但假设是：前沿专业模型发布 **半年到一年后**，同样能力能进非常小、接近边缘侧的模型。Gemma 也是——以尺寸论力量惊人，大量蒸馏和小模型效率技巧。我们离理论极限还远。

**Garry Tan：** 工程师工作量比六个月前多了 **500 到 1000 倍**——这房间里的人干的是 2000 年代谷歌工程师的 **1000 倍**。

**Demis Hassabis：** 小模型用途很多。一是成本，二是速度——编码或其他协作时迭代更快。很多场景要快速响应，性能 **90–95%** 就够，迭代速度的收益盖过那 **10%** 损失。另一件大事是**边缘侧**：效率、隐私、安全。手机、眼镜、家里机器人——处理极个人化的视听信息，本地跑，数据不出设备。理想终态：本地高效强模型处理日常感知，复杂任务才委托云端前沿模型——分层协调，不是一个大脑包一切。

> **金句 · Demis Hassabis**
> **中文：** 前沿在云端，隐私和毫秒响应在边缘——Flash 不是阉割版，是战略层级。
> **原文：** Frontier in the cloud, privacy and millisecond response at the edge—Flash isn't a crippled model, it's a strategic tier.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 模型蒸馏 | distillation | 大模型教小模型，压缩能力 |
| 边缘侧模型 | edge model | 手机/眼镜/机器人本地推理 |
| Flash 模型 | Flash model | Google 高效小模型线，低延迟低成本 |
| 模型层级 | model hierarchy | 云端前沿 + 边缘专用 + 工具专用系统 |

**本章小结**

- 蒸馏暂无理论上限；前沿能力 **~6–12 个月** 下沉到边缘尺寸
- 95% 性能 + 10× 速度 often 比 100% 性能更值（工程迭代场景）
- 隐私驱动边缘本地；复杂推理上云——层级架构优于单一巨型模型

---

## 05 智能体：从玩具演示到生产力

**Garry Tan：** 智能体很重要。有人说是炒作，我觉得才刚开始。DeepMind 内部研究告诉你，能力现在什么水平？跟外界 hype 比呢？

**Demis Hassabis：** 我同意才刚开始。必须有一个能主动解决问题的活跃系统，才能实现 AGI——对我们来说一直很清楚。智能体就是通往 AGI 的路。大家都在适应怎么协作；你可能在过去几个月才找到真正有价值的地方，技术也刚成熟到够用。不再是漂亮 demo 的玩具，开始给时间效率加值。

我的印象：很多人启动几十个智能体干 **40 小时**，产出是否值投入——还不太确定。但那一天会来。我们还在实验阶段。应用商店排行榜上还没有靠「氛围编码」做出的 **3A 级游戏**。我做过很棒的 demo——半小时做出主题公园原型，17 岁时要花六个月——震惊。但还需要技巧、人类的灵魂和品味；你得把这些带进作品里。否则为什么还没看到一个孩子做出销量 **1000 万份**的热门游戏？门槛已经够低了。缺什么？过程？工具？我不确定。你们实验比我多。

我预期一旦发挥全部价值——**未来 6 到 12 个月**——会出现完全由 AI 辅助生成的现象级产品。

**Garry Tan：** 自主性不会先来。先是这个房间的人以 **1000 倍速度**操作——人当主脑，AI 当工具。然后畅销应用、畅销游戏。再往后才更多自动化。

**Demis Hassabis：** 创造力可能是关键。AlphaGo 第二盘 **第 37 手**——我等的就是那种时刻，才启动 AlphaFold 这类科学项目。提出第 37 手很酷，但能**发明围棋**吗？我给高级描述：五分钟学会规则、一生去掌握、美学上美、一下午能玩——我要反馈是围棋这样的东西。今天系统还做不到。也许不是缺能力，是缺会用的人——足够聪明、有创造力，跟工具几乎融为一体，日夜试验，把深度创造力拧进去。更不可思议的事就会发生。

> **金句 · Demis Hassabis**
> **中文：** 智能体不是下一步——是 AGI 本体；我们还在实验，6–12 个月内会有现象级产品。
> **原文：** Agents aren't the next step—they're the path to AGI. We're still experimenting; breakout products in 6–12 months.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 环境适应性 | environmental adaptability | 智能体缺的对特定上下文的学习 |
| 人类灵魂与品味 | human taste / soul | 创造力与审美，AI 暂不能完全替代 |
| 1000 倍操作 | 1000× operator leverage | 人主导、AI 加速，先于完全自主 |
| 氛围编码 | vibe coding | 快速原型 demo，离 3A 产品仍有距离 |

**本章小结**

- 智能体 hype 多，但能力曲线刚越过「玩具 demo」
- 第一波是 **1000× 人+工具**，不是无人自主
- 缺品味/创造力/过程——6–12 月是 Demis 押的爆发窗口

---

## 06 AI for Science 根节点与创业拦截 2030

**Garry Tan：** AlphaFold 3 扩到更广生物分子。离完整细胞模拟还有多远？你在推材料、数学、药物、气候——未来五年哪个领域变天最猛？AI for science 创业，怎么区分真前沿和 API 封装？

**Demis Hassabis：** Isomorphic Labs（从 DeepMind 剥离）在 AlphaFold 2 后发展很好——不只折叠，做相邻生物化学设计化合物。很快有重大公告。终极目标是**完整虚拟细胞**。我在很多讲座里谈过：模拟到做扰动实验输出够接近真实，跳过搜索步骤、生成合成数据训练其他模型。完整虚拟细胞——大概还要 **~10 年**。我们从虚拟细胞核开始，它相对独立。诀窍是选对复杂性切片：能否独立建模输入输出，只聚焦这一层。

数据还不够。活细胞纳米级动态成像不杀细胞——还没技术。可能是硬件+数据驱动，或更好的动态模拟器。

AI 是我 **30 多年**的主线——科学研究的终极工具。使命两步：一，解决智能、建 AGI；二，用它解决其他问题。人们问「所有问题？」——是。具体指科学里的**根节点问题**——能开全新分支的。AlphaFold 后全球 **300 万+** 生物研究者几乎都在用；制药高管说今后几乎所有新药研发某阶段都会用 AlphaFold。才刚开始。材料科学到数学，都在「AlphaFold 1 时刻」——有希望，巨大挑战未完全解决。

**Garry Tan：** AlphaFold 式突破有什么模式？AI 离「真正科学推理」而非模式匹配还有多远？

**Demis Hassabis：** AlphaGo、AlphaFold 的教训：问题若是**巨大组合搜索空间**，我们的技术就强——空间越大越好，没有暴力或特例算法能解。围棋走法、蛋白质构型，可能性比宇宙原子还多。再加明确目标函数（最小化自由能、赢棋），加足够数据或能生成分布内数据的模拟器——「大海捞针」能走很远。药物发现同理。

通用系统我们在做——co-scientist、AlphaVolve 等，超越基本 Gemini。还没看到真正巨大发现；大家在修修补补，解比 IMO 更难的数学题。即将到来。难点是**超越已知边界**——不是模式匹配，比外推更进一步，是类比推理。系统能提出真正有趣的假设吗？「仅仅」解黎曼假设或千年大奖之一——也许几年内。更难的是**提出一套新的千年大奖问题**，被顶尖数学家认为深刻、值得毕生研究——我们还没到。我用**爱因斯坦测试**：用 **1901 年前**的知识训练系统，能否复现 **1905 奇迹年**包括狭义相对论？能——就接近系统发明真正新颖事物的边缘。

**Garry Tan：** 最后一个问题。25 岁时你希望知道什么？

**Demis Hassabis：** 解决难题不比解决肤浅问题更难——只是难点不同。生命短，把力气投到没人推、真能改变世界的事上。深度科技、跨学科——机器学习 + 材料/生物双重专家，或组这样的创始团队，能建巨大价值也巨大影响。这些领域碰原子世界，**相当安全**，不容易被下一次基础模型更新淹没。

若 AGI 时间线跟我差不多 **~2030**，今天开始的十年深度科技，AGI 会在中途出现——不一定是坏事。你的项目能否利用 AGI？Gemini、Claude 这类通用系统，会把 AlphaFold 这样的专业系统当**工具**用——不会把所有功能塞进一个巨型大脑，性能会退化；把蛋白质数据全灌进 Gemini 没意义。更好的架构：**通用工具使用模型** + **独立专业系统**层级。你今天建的工厂、金融系统，得认真想 AGI 中途出现时什么仍然有用。

> **金句 · Demis Hassabis**
> **中文：** 爱因斯坦测试：只用 1901 年前的知识，能否复现 1905 年的相对论——过了才算真发明。
> **原文：** The Einstein test: train on pre-1901 knowledge—can it reproduce Einstein's 1905 miracle year, including special relativity?

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 根节点问题 | root-node problem | 一开新学科分支的科学难题 |
| 组合搜索空间 | combinatorial search space | 可能性爆炸、无暴力解的问题形态 |
| 爱因斯坦测试 | Einstein test | 原创科学发现 vs 模式匹配的分水岭 |
| 专业工具层级 | specialist tool hierarchy | 通用模型调用 AlphaFold 类独立系统 |
| 深度科技防御性 | deep tech moat | 跨学科+原子世界，难被 API 层替代 |

**本章小结**

- AlphaFold 模式 = 巨大组合空间 + 明确目标函数 + 数据/模拟器
- 科学 AI 下一关：类比推理、提出假设、「爱因斯坦测试」
- 创业：**拦截 2030 AGI 时间线**，做有防御性的深度科技，别做 API 封装

---

## 总结：2030 见分晓，层级架构而非单一大脑

| 维度 | 要点 |
|------|------|
| AGI 架构 | 预训练+RLHF+思维链 ≈ **90%**；缺持续学习/长期推理/记忆，0–2 个大突破 |
| 记忆 | 别靠暴力上下文；借鉴巩固与回放，非破坏性整合 |
| 推理 | MCTS/RL 回归基础模型；补内省，治「不稳定智能」 |
| 模型层级 | 云端前沿 + 边缘 Flash/Gemma；蒸馏暂无理论上限 |
| 智能体 | AGI 路径本身；6–12 月现象级产品；先 **1000× 人+工具** |
| AI for Science | 根节点问题 + 组合搜索；爱因斯坦测试量真原创 |
| 创业 | 十年项目预设 **2030 AGI** 介入；深度科技 + 跨学科，避开 API 封装 |

### 对个人的启示

- 别只追更大上下文——持续学习与记忆巩固才是 AGI 拼图
- 学 RL/搜索思维：规划+验证，不只看单次生成
- 用 Flash/边缘模型做隐私敏感、低延迟场景；复杂任务上云

### 对团队 / 产品的启示

- 产品架构按 **通用层 + 专业工具层** 设计，别把一切塞进一个模型
- 智能体路线：先做人机协作 **1000×**，再谈完全自主
- 科学/深度科技创业：找组合搜索空间 + 明确目标函数的问题

### 仍待验证

- AGI **2030** 是 Demis 个人时间线，非 Google 官方承诺
- 完整虚拟细胞 **~10 年** 为估计值，依赖成像与数据突破
- 「6–12 月智能体现象级产品」为判断，非 guaranteed

> **金句 · Demis Hassabis（封底）**
> **中文：** 若 AGI 2030 年到，你今天起的十年创业，必须算它会在半路插进来——利用它，别被它淹没。
> **原文：** If AGI arrives around 2030, a decade-long deep tech journey starting today must account for it showing up midway—leverage it, don't get drowned by it.

---

## 概念索引（agent）

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| agi_architecture_90 | AGI 架构九成 | AGI architecture ~90% done | 预训练栈是骨架，缺 1–2 拼图 |
| continual_learning | 持续学习 | continual learning | 非破坏性学新知，智能体完整任务门槛 |
| mcts_rl_return | 搜索推理回归 | MCTS/RL return | AlphaGo 思想重新嵌入 Gemini |
| model_hierarchy | 模型层级 | cloud + edge hierarchy | 前沿云端、Flash 边缘、专业工具独立 |
| einstein_test | 爱因斯坦测试 | Einstein test | 1901 前知识能否复现 1905 原创 |
| agi_2030_timeline | AGI 2030 时间线 | AGI ~2030 timeline | 十年创业须预设 AGI 中途介入 |

---

## 附录

### 章节时间戳（B 站专栏）

| 时间 | 主题 |
|------|------|
| 03:15 | AGI 架构九成 · 持续学习瓶颈 |
| 07:42 | 强化学习与 MCTS 回归基础模型 |
| 11:05 | 模型蒸馏 · 边缘 Flash 层级 |
| 18:20 | 智能体：玩具到生产力 |
| 31:10 | AI for Science · 根节点问题 |
| 38:45 | 创业拦截 2030 AGI 时间线 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1yWRmBCEDc/ingest`
- **专栏主源**：`Recastory/workspace/bilibili-retranscribe/BV1yWRmBCEDc/ingest/column_article.md`
- **专栏 URL**：https://www.bilibili.com/read/cv48761414/
- **B 站**：https://www.bilibili.com/video/BV1yWRmBCEDc/
- **原节目**：Garry Tan × Demis Hassabis（YC 访谈）

### 相关阅读

- [[DeepMind团队-AI评估规划化与民主化]] — DeepMind × Kaggle 评估民主化，与 AGI 能力边界测量交叉
- [[MOC - AI 时代个人发展与组织]] — 组织与个人如何应对 AGI 时间线
- [[OpenAI员工-上下文工程和Agent记忆]] — 上下文 vs 记忆工程，对照持续学习瓶颈
- [[Rely AI 创始人-智能体可验证持续学习 不用微调]] — Demis 所谈"持续学习 / 长期推理"的 Agent 落地：可验证持续学习把回归感知优化内建进循环
- [[OpenAI总裁-聊天与Agent的融合计划]] — 聊天与 Agent 融合的另一权威视角
- [[2026 年 Agent 最重要的工程概念 Harness Engineering]] — "Agent 直接持有电脑与权限"与 harness 被模型内化同源
- [[Anthropic联创-AI影响比工业革命大10倍快10倍]] — 行业领袖对 AGI 节奏的另一视角

---

### 收录说明

- **视频**：[BV1yWRmBCEDc](https://www.bilibili.com/video/BV1yWRmBCEDc/)（B 站转载 · Easonlee的AI笔记 · 专栏 cv48761414）
- **讲者**：Garry Tan（Host · Y Combinator CEO）、Demis Hassabis（Guest · Google DeepMind CEO）
- **主源**：Recastory `column_article.md`（专栏完整图稿 · Quill Delta → Markdown）
- **版本**：canonical Host-Guest v3.2 · material_tier S · curate_method canonical-dialogue v3.2
