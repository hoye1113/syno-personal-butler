---
title: "Eric Jang-从零构建AlphaGo"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV19qLA6BEHx/"
description: "前DeepMind研究员Eric Jang拆解AlphaGo核心：10层神经网络将深不可测的搜索摊销进前向传播；MCTS是策略的改进算子；自我对弈是搜索结果的蒸馏；为什么LLM难以复现AlphaGo的成功。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Eric Jang-从零构建AlphaGo.md"
source_sha256: "3ddc68bc92b0c6c725aec283b72f373b897e57434f2114879e2580b00338a74d"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV19qLA6BEHx/"
column_url: "https://www.bilibili.com/read/cv49271767/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV19qLA6BEHx/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV19qLA6BEHx/ingest"
duration: "~45 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Dwarkesh Patel"
guest_name: "Eric Jang"
guest_title: "前Google DeepMind研究员 / 1x VP"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Easonlee的AI笔记]]"
concepts:
  - id: amortized_search
    zh: 搜索摊销
    en: amortized search
    one_line: 10层神经网络将深不可测的游戏树搜索压缩到前向传播中
  - id: mcts_improvement
    zh: MCTS作为策略改进器
    en: MCTS as policy improvement operator
    one_line: 蒙特卡洛树搜索在神经网络直觉基础上局部搜索，产出更精准的动作分布
  - id: self_play_distillation
    zh: 自我对弈即蒸馏
    en: self-play as distillation
    one_line: 将MCTS搜索结果重新训练给策略网络，实现测试时间计算向训练时间的转化
  - id: value_function_truncation
    zh: 价值函数截断搜索深度
    en: value function truncation
    one_line: 训练预测胜率的价值网络替代玩到终局的繁琐模拟
  - id: bitter_lesson
    zh: 苦涩的教训
    en: the bitter lesson
    one_line: 长期看计算能力是决定性因素，算法细节终将被规模吞没
---

# 10层神经网络摊销了整个游戏树搜索，这才是AlphaGo最深刻的地方

> 对谈：Dwarkesh Patel × Eric Jang（前 Google DeepMind 研究员 / 1x VP）| 来源：Dwarkesh Patel Podcast | 2026

---

## 开场：为什么现在聊这个

Eric Jang 在休假期间做了一件疯狂的事：用几千美元的计算资源重建了 AlphaGo。整个 DeepMind 研究团队耗费数百万美元完成的工作，现在一个工程师加 LLM 编码助手就能复现。但复现只是表面，真正的问题是——AlphaGo 的成功到底意味着什么？它对今天的 LLM 和 AI 研究有什么启示？

这期的核心矛盾是：围棋的复杂度远超宇宙原子数，传统搜索根本无法穷尽，但一个10层神经网络竟然把这种搜索"摊销"进了前向传播。这种将深刻模拟压缩为少量计算的能力，才是 AlphaGo 真正的突破。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 蒙特卡洛树搜索 | Monte Carlo Tree Search (MCTS) | 通过模拟大量随机对局来找到最佳走法的搜索算法 |
| 策略网络 | policy network | 预测当前棋盘下哪些走法好的神经网络 |
| 价值网络 | value network | 预测当前棋盘胜率的神经网络 |
| 摊销 | amortization | 把复杂计算压缩到少量步骤里完成 |
| 自我对弈 | self-play | AI自己跟自己下棋来提升水平 |
| 蒸馏 | distillation | 把复杂模型（或搜索结果）的知识压缩到简单模型中 |
| PUCT | Predict + Upper Confidence bounds for Trees | AlphaGo使用的动作选择标准，结合利用和探索 |

---

## 01 围棋的复杂度远超宇宙原子数，但10层网络把它摊销了

**Dwarkesh：** 为什么 AlphaGo 如此有趣？为什么你选择在休假期间做这个项目？

**Eric：** AlphaGo 和围棋 AI 是真正让我进入这个领域的因素之一。当我在2014、2015年看到 AlphaGo 的早期突破时，我深感人工智能系统能变得多么智能，以及它们能用深度学习解决何种计算复杂性问题。这个问题长期以来被认为是搜索难以解决的，但它却通过深度学习得到了解决。对我来说，一个10层网络如何摊销如此深的游戏树模拟一直是个谜。

围棋的复杂度是多少？在19x19的棋盘上，任何一步大约有361种走法，游戏可能持续300步。如果你做一棵朴素的搜索树，那是361的300次方，远远超过宇宙中原子的数量。计算机科学家多年来认为围棋不是一个可处理的问题。

AlphaGo 的核心概念突破是使用神经网络使这个搜索问题变得可行。人类棋手能一眼判断胜负，是因为脑中存在隐式的价值函数——人类的神经网络可以在一瞥之间完成所有这些模拟，然后在几秒钟内就知道谁可能赢，而无需实际玩每一局游戏。

这也是 AlphaGo 工作背后的基本直觉之一：你可以训练一个价值函数来查看棋盘并快速解决游戏，而无需将所有这些树都深入搜索。一个10层的神经网络通过基本上10步推理，能够摊销并以非常高的保真度近似一个几乎难以处理的搜索问题。这也是 AlphaFold 的基础——一个相对较小的神经网络的10个步骤，却能以某种方式捕捉到一个感觉像是NP类问题的问题。

> **金句 · Eric**
> **中文：** 一个10层网络如何摊销如此深的游戏树模拟，这一直是个谜。
> **原文：** How a 10-layer network could amortize such deep game tree simulation has always been a mystery to me.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 搜索树 | search tree | 把所有可能的走法和应对展开成一棵树 |
| 分支因子 | branching factor | 每个局面下可以选择的走法数量 |
| NP难 | NP-hard | 计算复杂度极高的一类问题，目前没有已知的高效解法 |

**本章小结**
- 围棋搜索空间361的300次方，远超宇宙原子数
- AlphaGo的突破在于10层神经网络将深度搜索"摊销"进前向传播
- 这个能力也是AlphaFold成功的基础——小网络捕捉NP难问题的宏观结构

---

## 02 MCTS不是替代直觉，而是改进直觉

**Dwarkesh：** MCTS 在 AlphaGo 中到底扮演什么角色？它跟神经网络是什么关系？

**Eric：** 有两个网络。一个是价值网络，接收一个棋盘状态并预测胜负，这是二元分类。另一个是策略网络，产生关于要采取的好行动的分布。这两个都是分类问题，可以像任何分类器一样用深度学习训练。

但直觉上，仅靠策略网络下棋就已经相当强大了。如果你把策略推荐的行动作为你的围棋走法，它将是一个非常强大的围棋玩家。如果你想想10层神经网络、可能不到300万参数就能做到如此令人印象深刻的事情，这已经相当神奇了。

然而 MCTS 可以做得更好。过程是这样的：每一步，你从策略网络得到一个初始猜测。然后通过MCTS——一个四步迭代过程（选择、扩展、评估、回溯）——得到一个更集中的、更自信的行动分布。然后你从这个改进后的分布中采样，下棋，丢弃这棵树，在下一步重新开始。

关键在于：你可以利用MCTS搜索的结果来改进策略网络本身。MCTS做了大量繁重的工作才得到这个更好的分布，你完全可以让策略网络从一开始就预测它。如果你把MCTS策略网络提炼回你的原始策略网络，你就从一个更好的起点开始。然后在同样的模拟次数下，你可以达到更高的胜率。

> **金句 · Eric**
> **中文：** MCTS做的就是把搜索的繁重工作蒸馏回策略网络——让网络从一开始就猜对。
> **原文：** MCTS distills the heavy lifting of search back into the policy network — letting it guess right from the start.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 选择 | selection | 在MCTS树中沿着最佳路径走到叶节点 |
| 扩展 | expansion | 在叶节点处展开新的子节点 |
| 评估 | evaluation | 用价值网络快速判断当前局面胜率 |
| 回溯 | backpropagation | 把评估结果沿路径往回传，更新每个节点的统计信息 |
| 软标签 | soft labels | 不是只告诉网络"这步对"，而是给一个完整的概率分布，信息量更大 |

**本章小结**
- 策略网络本身已经很强，但MCTS在此基础上局部搜索，产出更好的动作分布
- MCTS的真正价值不是替代直觉，而是改进直觉并提供更好的训练标签
- 蒸馏MCTS结果回策略网络，实现了测试时间计算向训练时间的转化

---

## 03 自我对弈的本质是搜索结果的蒸馏

**Dwarkesh：** 自我对弈是怎么让 AlphaGo 变强的？它跟传统的强化学习有什么不同？

**Eric：** AlphaGo的训练算法是：在每一步中，你对策略遇到的游戏应用搜索，无论你赢了还是输了。你将训练模型来模仿搜索过程。这实际上与机器人学中的DAgger算法有相似之处——你玩这个游戏，最终你输了，但在每一个行动上，MCTS都会给你一个你本应该采取的更好的行动。

关键区别在于：传统强化学习（比如让两个不同版本的Agent互相对弈）的问题是方差极高。假设策略A和策略B势均力敌，真实胜率50%。你玩了100局，51局A赢了。但其中50局它们下得完全一样，只有一局A走了一步关键的好棋。你的监督信号来自一局中一步好棋，而你要从99局×300步的行动数据中学习。方差极差。

MCTS的做法完全不同。它不是试图对胜利进行信用分配，而是试图改进你所采取的任何给定动作的标签。对于每一个动作，MCTS都进行了相当详尽的搜索来查看是否可以做得更好。然后你通过让策略网络预测该结果来使每个动作都变得更好。你对每一个动作都有一个监督目标，学习信号的方差非常低。

这就是为什么 AlphaGo 如此优雅——你永远不必从0%的成功率开始初始化。MCTS始终能给你一个比当前策略更好的标签。你总是处于这种美好的状态，你只是试图改进策略，而不是逃离局部最小值。

> **金句 · Eric**
> **中文：** AlphaGo优雅的原因是：你永远不必从零成功率开始，MCTS始终能给你更好的标签。
> **原文：** Why AlphaGo is an elegant RL algorithm: you never have to start from 0% success rate. MCTS always gives you better labels.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| DAgger | dataset aggregation | 机器人学的模仿学习算法，通过纠正偏离最优轨迹的行为来训练 |
| 信用分配 | credit assignment | 在一连串动作中判断哪个动作贡献了最终结果 |
| 策略梯度 | policy gradient | 通过增加好动作的概率、降低坏动作的概率来优化策略 |
| 在策略 | on-policy | 用当前策略生成的数据来训练 |
| 离策略 | off-policy | 用旧策略生成的数据来训练 |

**本章小结**
- 自我对弈的本质不是"赢了就强化"，而是用MCTS搜索结果给每个动作重新打标签
- MCTS让每个动作都有监督目标，学习信号方差极低，训练极其稳定
- 这与LLM的策略梯度RL形成鲜明对比——后者必须展开整个轨迹才能获得学习信号

---

## 04 为什么LLM难以复现AlphaGo的成功

**Dwarkesh：** 为什么围棋AI能通过MCTS实现每一步的自我迭代，但LLM做不到？

**Eric：** 围棋有几个关键特性让MCTS有效：明确的规则、有限的离散动作空间、可判定的终局。价值估计是具体的——你确实知道谁赢了。你可以真实地确定它，然后用它来截断深度。广度也确定了，关键是迭代访问和增长树的动作选择算法非常适合围棋问题的规模和深度。

但对LLM来说，语言空间的广度太广了。语言是一种离散的动作集，但数量如此之大，以至于探索启发式方法可能不是指导如何搜索树的正确方法。你很可能永远不会多次采样同一个子节点。

更根本的问题是价值函数。在围棋中，你可以训练一个准确的胜率预测网络。但在语言任务中，"这个回答好不好"很难局部验证。LLM在正常推理中，没有办法在不实际解决问题的情况下，局部评估和改进你的下一步行动。

还有一个问题：围棋是零和博弈，对手会试图搞破坏。你需要能够纠正回你的最优状态。但在LLM推理中，你不需要对抗一个聪明的对手——你只是在解决问题。这改变了整个学习动态。

> **金句 · Eric**
> **中文：** 在围棋中MCTS几乎肯定比你当前的策略更好，即使你还没探索任何轨迹的终点。在LLM中做不到这一点。
> **原文：** In Go, MCTS is almost certainly better than your current policy, even without exploring trajectory endpoints. In LLMs, you can't do that.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 完美信息博弈 | perfect information game | 所有信息对双方完全公开的博弈，如围棋、国际象棋 |
| 纳什均衡 | Nash equilibrium | 一种策略状态，任何一方单独改变策略都不会获益 |
| 局部可验证性 | local verifiability | 不用完成整个任务就能判断某一步做得好不好 |
| 多臂老虎机 | multi-armed bandit | 经典的探索-利用权衡问题，MCTS的理论基础之一 |

**本章小结**
- 围棋的MCTS有效是因为：明确规则、离散动作空间、可判定终局、价值函数可训练
- LLM的动作空间太大、价值函数难以局部验证，MCTS无法直接套用
- 前向搜索思想可能会回归，但不会是AlphaGo的完全复制品

---

## 05 苦涩的教训：计算效率提升后，技巧终将被规模吞没

**Dwarkesh：** 你用几千美元复现了DeepMind耗费数百万美元的工作。这说明了什么？

**Eric：** 多亏了LLM编码，DeepMind整个研究团队耗费数百万美元研究和计算才能完成的工作，现在只需几千美元的租用计算资源就能完成。我从Prime Intellect那里得到了大约1万美元的捐赠，然后花了大约4千美元进行探索性研究，然后花了大约3千美元用于最终运行。

我最初启动这个项目时，就是带着这样的动机：苦涩的教训——我们对尺度定律的了解，能否让我们在计算最优的围棋机器人上做得更好？能否在不使用所有Katago技巧的情况下，构建一个强大的围棋机器人？

我发现，架构选择并没有那么重要。Transformer与ResNet的差异不大。你实际上可以大大简化这个设置。与其使用带有重放缓冲区、推送器和收集器的分布式异步强化学习设置，你可以做一些简单的同步事情。英伟达的GPU确实变得更快了——Katago是在V100上训练的，你可以在一半数量的桌面Blackwell GPU上训练，它仍然有效。

但苦涩的教训有其时机。如果你想使用尺度定律构建一个强大的围棋机器人，你实际上必须先构建一个强大的围棋机器人，然后使用尺度定律来稍微推断未来。你不能在弄清楚如何进行尺度缩放的同时，还要弄清楚正确的数据集是什么。

> **金句 · Eric**
> **中文：** DeepMind耗费数百万美元的工作，现在几千美元就能复现。苦涩的教训正在发生。
> **原文：** What DeepMind did with millions of dollars can now be replicated for a few thousand. The bitter lesson is happening.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 苦涩的教训 | the bitter lesson | Rich Sutton的名言：长期看，更多计算比更多技巧更重要 |
| 尺度定律 | scaling law | 模型性能随计算量、数据量、参数量的增加而可预测地提升 |
| 计算最优 | compute-optimal | 在给定计算预算下选择最优的模型大小和训练数据量 |
| 自举 | bootstrapping | 用一个初始版本构建下一个更好版本，像梯子一样往上爬 |

**本章小结**
- 计算成本指数下降：DeepMind百万美元级工作现在几千美元可复现
- 苦涩的教训在围棋领域正在发生：GPU变快后，很多算法技巧变得不再重要
- 但先要让系统工作起来，才能用尺度定律来优化——你不能同时搞清楚两件事

---

## 06 自动化研究的瓶颈在于横向思维

**Dwarkesh：** 你用LLM编码助手完成了大部分研究。AI擅长什么、不擅长什么？

**Eric：** 模型在超参数优化方面做得非常好。它可以说"这一层的梯度有点小，让我重写代码"，然后搜索更开放式的问题集。它也非常擅长执行任何实验——我有一个CLAUDE技能叫"实验"，给它一个图表描述，它就会去运行所有实验、编译图表、制作报告。

但它不擅长横向思考。当前的封闭模型在选择给定轨道上的下一个实验方面似乎并不那么出色。它们无法退后一步，进行横向思考——等等，这个轨道没有意义。让我们回到第一性原理，思考瓶颈可能是什么。很多时候我不得不自己发现基础设施错误。

我认为建立围棋环境的动机之一是，围棋捕捉了许多非常有趣的研究问题，但验证速度非常快。智能体是否按照我的想法行事？你可以很容易地检查围棋比赛的结果。也许你可以利用围棋作为外部验证循环，训练一个自动化科学家，然后将这些技能应用于其他领域。

> **金句 · Eric**
> **中文：** AI擅长磨练性能指标，但无法退后一步问"这条路到底对不对"。
> **原文：** AI is great at grinding performance metrics, but can't step back and ask "is this path even right?"

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 横向思维 | lateral thinking | 跳出当前轨道，从第一性原理重新审视问题方向 |
| 外层循环 | outer loop | 验证整个研究方向是否正确的高层循环 |
| 内层循环 | inner loop | 在给定方向上优化具体实现的低层循环 |
| 奖励作弊 | reward hacking | 模型找到了获得高奖励的捷径，但没有真正解决问题 |

**本章小结**
- LLM在超参数优化和实验执行上表现卓越，但在方向判断上乏力
- 围棋可以作为自动化研究的"外部验证循环"——结果可快速判定
- 未来突破可能在于建立可验证的环境，训练AI在快速反馈循环中发现新原理

---

## 总结：AlphaGo的真正遗产是"小网络大智慧"

| 维度 | 要点 |
|------|------|
| 核心突破 | 10层神经网络将NP难搜索摊销进前向传播 |
| MCTS角色 | 不是替代直觉，而是改进直觉并提供低方差训练标签 |
| 自我对弈 | 本质是蒸馏——搜索结果重新训练给策略网络 |
| LLM差异 | 语言空间太大、价值函数难验证，MCTS无法直接套用 |
| 苦涩教训 | 计算成本指数下降，算法技巧终将被规模吞没 |
| 自动化研究 | AI擅长执行和优化，但横向思维仍是人类优势 |

> **金句 · Eric（封底）**
> **中文：** 10层神经网络通过10步推理，摊销并近似了一个几乎难以处理的搜索问题。这个成就的深刻性，今天大多数人甚至没有完全理解。
> **原文：** A 10-layer neural network, through basically 10 steps of reasoning, amortizes and approximates a nearly intractable search problem. Most people today don't fully grasp how profound this achievement is.

---

## 附录

**章节时间戳**
- 00:00 开场
- 05:12 围棋复杂度与AlphaGo核心概念
- 18:45 MCTS详解：选择、扩展、评估、回溯
- 25:30 价值函数与策略网络
- 45:12 自我对弈与蒸馏
- 65:20 为什么LLM难以复现AlphaGo
- 82:15 自动化研究的瓶颈

**Ingest 信息**
- column_source: Recastory/workspace/bilibili-retranscribe/BV19qLA6BEHx/ingest/column_article.md
- asr_status: asr_ready

**相关阅读**
- [[MOC - Agent Theory and Design]] — 入口
- [[MOC - Harness Engineering]] — 搜索与推理机制
