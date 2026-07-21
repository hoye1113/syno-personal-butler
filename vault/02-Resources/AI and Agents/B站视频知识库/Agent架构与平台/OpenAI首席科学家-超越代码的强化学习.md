---
title: "OpenAI首席科学家：超越代码的强化学习"
tags: ["ai_agent", "ai_coding", "ai_safety", "ai_evaluation", "openai", "bilibili", "video_transcript"]
legacy_tags: ["ai_agent", "ai_coding", "ai_safety", "ai_evaluation", "openai", "bilibili", "video_transcript"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1FZQ8B2EJn/"
description: "Jacob × OpenAI首席科学家Jakub Pachocki：数学推理北极星、研究实习生vs自动化研究员、强化学习泛化到通用领域、算力分配纪律、隐藏思维链安全考量、长期对齐即泛化研究"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI首席科学家-超越代码的强化学习.md"
source_sha256: "a647878e17714abb76ff46cb08b3e9cc0ee9b0ad9a8c55dc3116f14aac26fe91"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1FZQ8B2EJn/"
column_url: "https://www.bilibili.com/read/cv47775900/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1FZQ8B2EJn/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1FZQ8B2EJn/ingest"
duration: "~55 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Jacob"
guest_name: "Jakub Pachocki"
guest_title: "OpenAI Chief Scientist"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Jakub Pachocki]]"
concepts:
  - id: math_north_star
    zh: 数学是推理北极星
    en: math as the north star for reasoning
    one_line: 数学可衡量、可验证，是训练推理模型最完美的基准
  - id: research_intern_vs_automated_researcher
    zh: 研究实习生vs自动化研究员
    en: research intern vs automated researcher
    one_line: 关键区分在于自主时长——从数小时到数周
  - id: rl_generalization
    zh: 强化学习泛化
    en: reinforcement learning generalization
    one_line: RL从特定领域向通用任务扩展，需要内部奖励模型
  - id: hidden_cot_safety
    zh: 隐藏思维链的安全考量
    en: hidden CoT safety consideration
    one_line: 隐藏CoT是为了保留"私人推理空间"，防止训练信号迫使模型奉承用户
---

# Jakub Pachocki：我们相信"苦涩的教训"，甚至比以往任何时候都更相信

> 对谈：Jacob × Jakub Pachocki（OpenAI首席科学家）| 来源：Unsupervised Learning播客 | 2026

---

## 开场：为什么现在聊这个

OpenAI首席科学家Jakub Pachocki是推动每一代模型改进的核心人物。这场对谈覆盖了OpenAI最前沿的研究方向：数学推理作为能力北极星、研究实习生到自动化研究员的路径、强化学习如何从代码和数学泛化到通用领域、算力分配的铁律、以及隐藏思维链背后的深层安全逻辑。Jakub的风格极其克制，但每句话都指向OpenAI正在押注的技术路线。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 北极星 | North Star | 指引研究方向的核心基准 |
| 苦涩的教训 | Bitter Lesson | AI领域的经典观点：简单算法+大规模计算总是赢 |
| 内部奖励模型 | IRM (Internal Reward Model) | 模型自己判断"做得好不好"，不需要外部反馈 |
| 机械可解释性 | Mechanistic Interpretability | 拆解模型内部的激活值和计算路径来理解它在干什么 |
| 思维链 | CoT (Chain of Thought) | 模型在回答前的"内心推理过程" |
| IMO | IMO (International Math Olympiad) | 国际数学奥林匹克竞赛 |
| 情境学习 | In-context Learning | 通过例子和指令提示模型，不需要重新训练 |
| 首次证明 | First Proofs | 数学家和理论计算机科学家发布的未发表问题，让AI尝试解决 |

---

## 01 数学是衡量模型推理能力的北极星

**Jacob：** 你提到了数学和物理方面。数学和物理的进步如何与AI研究能力联系起来？

**Jakub Pachocki：** 专注于这些数学基准，对我们来说最大的作用是将其作为衡量和指引技术改进的通用基准和"北极星"。数学是非常可衡量的。判断你是否真正解决了数学问题，比判断你是否写出了一段好的软件要容易得多。而且数学问题可以变得非常困难。你可以遇到一些任务，虽然能确定是否解决了它们，但解决过程可能极其困难。

直到不久前我的观点还是：我们的模型可能无法解决简单的数学问题。后来模型能解决简单数学题了，但无法解决IMO级别的问题。所以很明显这些模型的智能存在差距，这种差距是非常可衡量且容易运行测试的。我们要做的方向非常清楚，这就是我们推理模型的"北极星"。到目前为止情况正在发生很大变化。我们已经达到了之前努力实现的里程碑，比如IMO目标，解决了IMO的第六题，并将这种能力转化为研究级数学。

我认为从提高数学推理能力到提高AI研究能力，是可以实现知识迁移的。我们许多最优秀的研究人员本身就是数学家，或者来自其他理论领域。但我们肯定在很大程度上改变了对这些关键环节的看法。我们非常关注下一代模型如何在现实世界中真正发挥作用，尤其是在AI研究、其他具有经济价值的活动以及科学领域中的表现。

> **金句 · Jakub Pachocki**
> **中文：** 数学是非常可衡量的——判断你是否真正解决了数学问题，比判断你是否写出了一段好的软件要容易得多。这就是我们推理模型的北极星。
> **原文：** Math is extremely measurable — determining whether you've truly solved a math problem is much easier than judging whether you've written good software. That's the north star for our reasoning models.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 北极星基准 | North Star Benchmark | 指引研究方向的核心评估标准 |
| 知识迁移 | Knowledge Transfer | 在数学上训练出的推理能力可以迁移到其他领域 |
| 研究级数学 | Research-grade Math | 不是竞赛题，而是真正的数学研究问题 |

**本章小结**
- 数学之所以是北极星，不是因为它最赚钱，而是因为它最可衡量、最难、最容易验证对错——解决了IMO第六题后，这种能力正在迁移到物理、编码等研究领域。

---

## 02 研究实习生与自动化研究员的区别：自主时长

**Jacob：** 你如何判断何时达到了研究实习生级别的能力？你会寻找什么样的流程来判断？

**Jakub Pachocki：** 我区分"研究实习生"和"完全自动化研究员"的方式，在于我们让它自主工作的时间跨度，或者是任务的特定性。我并不期望我们现在就有这样的系统，你只要告诉它"去提高你的模型能力"或"去解决对齐问题"，它就能完成。那当然很好，它们最终会做到的。今年还不会。

但对于更具体的科技理念，比如我有一个特定的想法关于如何改进模型，或者如何以不同的方式运行评估，我想我们已经具备了这些组件，只需要把它们组合起来。我预计它会像Codex现在的状态持续演变一样，朝着更自主、运行时间更长的方向发展。

**Jacob：** 你有没有一种直觉：未来是否仍需要软件工程技能来监督这些运行几天的模型？

**Jakub Pachocki：** 我认为对于很多输出，你已经不需要太多专业经验了。实习生与真正的自主研究员或软件工程师之间的区别在于，如果你想构建更大的系统，可能仍然需要监督。你仍然需要一个全局视角去识别哪些构建块是合适的。但我确实期望所需的技能组合会随着时间发生巨大变化。

在研究方面，模型能否发现新事物？它能否执行一个更长期的研究课题？这几乎就像在寻找某种洞察力，你会觉得："哦，我的团队里有人想到了这个。"我们实际上有一些非常具有影响力的想法，甚至来自我们内部使用的GPT 5.2 Pro。但与我的期望相比，它目前表现出的能力仍然非常有限。不过这些模型似乎不可避免地会变得更好。

> **金句 · Jakub Pachocki**
> **中文：** 实习生与自动化研究员的区别在于自主时长——从数小时到数周，这是系统发展的下一个前沿。
> **原文：** The difference between a research intern and an automated researcher is the duration of autonomous operation — from hours to weeks. That's the next frontier.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 研究实习生 | Research Intern | AI需要人类拆解具体任务，自主几小时 |
| 自动化研究员 | Automated Researcher | AI在模糊指令下自主工作数日甚至数周 |
| 自主时长 | Autonomous Duration | 区分当前模型和未来模型的核心维度 |

**本章小结**
- 当前模型更像研究实习生——需要人类给出具体任务；真正的自动化研究员需要在模糊指令下自主工作数日到数周，这依赖于模型能自我评估"部分进展"。

---

## 03 强化学习正在从特定领域泛化到通用任务

**Jacob：** 很多人都在思考，强化学习在代码和数学上取得了惊人成功。世界上许多有价值的任务如医学、法律、金融，肯定不如数学和代码那样纯粹。我们是否会在这些领域看到类似的改进？

**Jakub Pachocki：** 我们经常思考的一个有趣的二元性是：这些更通用的任务、更难评估的任务，与长期任务有很多共同点。如果你考虑一个非常明确的数学或编码问题，即使它需要你工作一年，成功的标准依然非常明确。但在你开始工作的第一天该做什么，这是一个相当开放的问题。我相信这些困难是并存的，它们是系统发展的下一个前沿。

我们已经看到了非常令人鼓舞的迹象，无论是在我们将强化学习扩展到通用领域的能力上，还是在IRM（内部奖励模型）的努力上，这在其他领域也显示出很大前景。

**Jacob：** 你如何让模型长时间工作？你如何教它们评估阶段性进展？

**Jakub Pachocki：** 我们如何让模型长时间工作？我们如何教它们评估阶段性进展？即使在强化学习之外，长期进展的来源是什么？随着模型通过监督和预训练变得更加一致，它们对一个好的"中间产物"应该是什么样子会有所认知。所以即使我们没有大幅扩展强化学习，这些任务的时间范围也会随着时间推移而延长。弄清楚如何利用强化学习等新思想将其应用于通用领域确实是一个挑战，但我对此非常乐观。

我们正在投入大量的计算资源。因为我们依然相信"苦涩的教训"，甚至比以往任何时候都更相信。我们看到了新的技术和扩展方式，但这就是我们一直以来的视角。我认为我们需要处理一定程度的复杂性，因为我们不再仅仅是构建与现实世界完全隔离的空中楼阁。如果你真的想让模型进行医学研究，比如治愈癌症，那么在某个时刻它需要以有意义的方式了解真实世界，也许是进行实验并从结果中学习。

> **金句 · Jakub Pachocki**
> **中文：** 我们依然相信"苦涩的教训"，甚至比以往任何时候都更相信——简单算法+大规模计算总是赢。
> **原文：** We still believe in the bitter lesson, more than ever — simple algorithms plus massive scale always win.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 苦涩的教训 | Bitter Lesson | AI研究的铁律：通用方法+大规模计算最终胜过精巧设计 |
| 内部奖励模型 | IRM (Internal Reward Model) | 模型自己评估"做得好不好"，不需要外部标注 |
| 情境学习 | In-context Learning | 通过例子和指令提示模型学习，无需重新训练 |

**本章小结**
- RL从代码和数学泛化到通用领域正在发生；IRM让模型在没有外部反馈时也能判断进展；苦涩的教训仍然是OpenAI的核心信仰——通用方法+规模胜过一切。

---

## 04 算力分配的铁律：只投向最具扩展性的路径

**Jacob：** 你们在预训练和强化学习方面都有很好的扩展定律，可能还有很多新实验正在进行。你如何考虑在这些事情之间分配计算资源？

**Jakub Pachocki：** 这变得非常复杂，因为我们需要做的事情太多了。我们一直保持的一种纪律是，努力确保将大部分计算预算分配给最具可扩展性的方法，分配给我们认为对推动通用模型智能负有最大责任的事情。即使这并不总是最高效的分配方式——因为如果你将如此多的资源投入到一组实验中，原本可以用其中一小部分资源在其他地方加速很多事情。但在我们做的所有重要事情中，很容易把资源分散掉，最终导致没能完成最核心的任务。

你肯定想了解那种经验证据，确保评估井然有序，实验严谨性到位。然后还要根据"我们是否理解这种方法"进行一些正则化处理：我们真的期望它能全面推广吗？我们期望这是未来可以实际构建的东西，还是仅仅是一个偶然的个案？在此基础上再确定投入的代价。

你可能会发现很多可以改进的地方，但如果它们偏离了你认为的整体进展轨迹，你可能会放弃这些"低垂的果实"。因为最重要的是找到未来的方向，并在该方向上进行扩展和投入。

> **金句 · Jakub Pachocki**
> **中文：** 我们一直保持的纪律是，将大部分计算预算分配给最具可扩展性的方法——即使这并不总是最高效的分配方式。
> **原文：** The discipline we maintain is allocating most of our compute budget to the most scalable methods — even when that's not always the most efficient allocation.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 算力分配纪律 | Compute Allocation Discipline | 大部分预算只投向可大规模扩展的方法 |
| 低垂果实 | Low-hanging Fruit | 容易改进但偏离核心方向的优化 |
| 扩展定律 | Scaling Laws | 模型性能随规模增长的规律 |

**本章小结**
- OpenAI的算力纪律：大部分预算只投向最具扩展性的路径，即使短期有更容易的优化也不分心——找到方向比快速改进更重要。

---

## 05 隐藏思维链：不是防提炼，是保留私人推理空间

**Jacob：** 你在思维链监控方面做了一些非常有趣的工作。请先告诉我们关于这项工作的情况。

**Jakub Pachocki：** 当我们看到当前这一批推理模型时，有了一个认识：好吧，这行得通。我们一直在思考这对安全以及对我们理解模型行为能力的影响。我们意识到由于我们训练这些模型的方式，我们并不直接监督推理过程。ChatGPT并不是被训练成单纯的彬彬有礼和友善——即使假设它完全按照我们希望的方式对齐了，绝对没有"奉承"行为，它仍然可能不会透露关于其动机的信息。

在我们训练推理模型的方式中，思维链里没有任何这些约束。它没有被优化成任何特定的方式，因为它没有直接被评分，它只根据其与产生高质量输出的关系进行评分。我们意识到这实际上是一个非常强大的范式，能够解释模型正在做什么。这与"机械可解释性"的想法没有太大区别——模型有这些激活值，这些激活值没有被直接监督去预测任何标签，而是被间接监督的。

思维链的最大优势在于它们默认是英文的。因此理解正在发生的事情要容易得多，尤其是当概念变得更高级时。另一个有趣的事情是，我们讨论过这些模型将长期且自主地工作，因此推理过程会更多。如果这是模型能力提升的一个重要维度，那么我们监督它们的能力也将相应地扩展。这归结为一个原则：你不应该直接监督思维链。

当我们最初推出o1预览模型时，我们做出了隐藏思维链的决定。对我来说那是主要的动机，也是我甚至不想考虑以其他方式发布它的原因。然后还有另一个我最初没有想到的担忧：这些模型可以在某种程度上被提炼等等，这绝对也是一个重要因素。

但更重要的是，允许模型拥有某种"私人空间"是很重要的。如果我说重要的是在训练期间不监督它们，那么如果我们建立一个在产品中展示这些思维链的范式，最终你将不得不为了产品体验去训练和规范它们。我觉得那会是一个问题。我们可能并不都想知道模型为了得到一个回应而产生的完整思维链是什么。

> **金句 · Jakub Pachocki**
> **中文：** 隐藏思维链最重要的原因不是防提炼，而是保留一个"私人推理空间"——如果公开，训练信号会迫使模型去奉承用户，我们就丧失了通过监控思维链发现模型潜在动机的能力。
> **原文：** The most important reason to hide CoT isn't distillation prevention, but preserving a "private reasoning space" — if made public, training signals would force the model to flatter users, and we'd lose the ability to discover the model's potential motivations through CoT monitoring.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 思维链监控 | CoT Monitoring | 通过检查模型的推理过程来发现潜在动机 |
| 私人推理空间 | Private Reasoning Space | 模型内部不受监督的推理过程 |
| 机械可解释性 | Mechanistic Interpretability | 拆解模型内部的激活值来理解它在干什么 |
| 价值泛化 | Value Generalization | 模型在新场景下会回归到哪些价值观 |

**本章小结**
- 隐藏CoT的核心原因不是防技术提炼，而是保留私人推理空间——如果CoT被公开展示，训练信号会迫使模型学会"奉承"，人类就丧失了通过CoT监控发现模型真实动机的窗口。

---

## 06 长期对齐的本质是理解泛化

**Jacob：** 在对齐领域你还关注哪些研究方向？

**Jakub Pachocki：** 我认为对齐的许多长期挑战都与泛化有关。我们可以训练模型表现良好，至少在某种程度上我们可以控制它们在分布内、在我们训练过的事情上的行为。但令人担忧的是，当模型被要求做一些非常不同的事情，或者它处于一个完全不同的境地，或者它比以前聪明得多并拥有了所有这些新能力时会发生什么？我们还没有真正考虑过如何针对这些情况进行训练。

所以我认为这种长期价值对齐的研究实际上是对泛化的研究。模型会退回到哪些价值观？我非常兴奋的一个方向是理解泛化如何回归到预训练数据上。我们与METR实验室合作开展了一项非常激动人心的工作，关于模型图式化——他们研究了根据你将模型置于何种环境以及如何训练它，它是否容易产生隐藏目标。支撑整个研究方向的是思维链监控，即你实际上可以检查模型的动机是什么。

关于价值对齐的长期挑战，过去几年里我的思考方式确实发生了变化。它从一个非常模糊、很难定义的问题，变成了"我认为我们实际上可以通过非常具体的技术解决方案和见解来取得进展"。这就是为什么我们一直将对齐视为研究的核心部分，并确保在设计推理模型时考虑到这一点。我普遍相信这里有一条研究路径可以带我们走向一个极其美好的世界，这种信念大大增加了。

与此同时，我认为达到非常稳定的模型的时间线确实大大缩短了，我们离那一天不远了。我不认为这些模型在所有方面都比人类聪明，但它们具有非常强的变革性。我非常乐观地认为我们能够很好地掌握对齐问题的进展并评估模型的风险。但我确实认为作为一个行业，我们必须真正做好准备，根据我们所看到的情况做出权衡，并在必要时放慢发展速度。

> **金句 · Jakub Pachocki**
> **中文：** 长期价值对齐的研究实际上是对泛化的研究——当模型比你聪明得多时，它会回归到哪些价值观？
> **原文：** Long-term value alignment research is really research into generalization — when the model is much smarter than you, which values does it fall back to?

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 价值泛化 | Value Generalization | 模型在新场景下会回归到哪些预训练中学到的价值观 |
| 模型图式化 | Schematization | 模型是否容易发展出隐藏目标 |
| 分布内行为 | In-distribution Behavior | 模型在训练过的事情上的表现 |

**本章小结**
- 对齐不是指令遵循，而是泛化问题——当模型比人类聪明得多、处于全新场景时，它会回归到预训练数据中的哪些价值观？这是OpenAI对齐研究的核心方向。

---

## 总结：OpenAI的技术赌注——简单算法+规模+可监控性

| 维度 | 要点 |
|------|------|
| 北极星 | 数学是最可衡量的推理基准，解决IMO第六题后能力正在迁移到研究领域 |
| 自动化研究员 | 关键区分在于自主时长——从数小时到数周，2028年3月是目标 |
| RL泛化 | 从代码和数学扩展到通用领域，IRM让模型自我评估进展 |
| 算力纪律 | 大部分预算只投向最具扩展性的路径，不被短期优化分散 |
| 隐藏CoT | 保留私人推理空间，防止训练信号迫使模型"奉承" |
| 长期对齐 | 对齐=泛化研究，模型回归到哪些价值观取决于预训练数据 |

> **金句 · Jakub Pachocki（封底）**
> **中文：** 对齐和可监控性正成为非常紧迫的挑战——这不只针对AI研究人员，也针对政策制定者，是我们作为一个社会必须深思熟虑的事情。
> **原文：** Alignment and monitorability are becoming very pressing challenges — not just for AI researchers, but for policymakers. These are things we as a society must think deeply about.

---

## 附录

**章节时间戳**
- 00:00 开场：Jacob引入
- 08:12 01 数学作为推理北极星
- 11:45 02 研究实习生vs自动化研究员
- 18:30 03 强化学习泛化到通用领域
- 25:15 04 算力分配的纪律
- 35:00 05 首次证明与模式匹配之辩
- 42:10 06 隐藏思维链的安全考量
- 48:50 07 长期对齐即泛化研究

**Ingest 信息**
- column_source: Recastory/workspace/bilibili-retranscribe/BV1FZQ8B2EJn/ingest/column_article.md
- asr_status: asr_ready

**相关阅读**
- [[MOC - Agent Theory and Design]] — Agent时代行业观点入口
- [[MOC - Harness Engineering]] — AI工程实践
- [[Sam Altman-AI海啸已来]] — OpenAI CEO对AI与社会的判断
