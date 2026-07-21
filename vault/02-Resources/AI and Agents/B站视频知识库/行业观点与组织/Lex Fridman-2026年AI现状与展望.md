---
title: "Lex Fridman-2026年AI现状与展望"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "ai_safety", "ai_evaluation"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "ai_safety", "ai_evaluation"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1ArFCz5EjX/"
description: "DeepSeek时刻后AI竞争格局、开源模型策略、文本扩散模型、强化学习与持续学习、AGI时间线、AI产业整合"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Lex Fridman-2026年AI现状与展望.md"
source_sha256: "f121476b5d1164cacb579420e431985ff4733bb71a43ba40aa8e57be93479d6d"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1ArFCz5EjX/"
column_url: "https://www.bilibili.com/read/cv45480286/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1ArFCz5EjX/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1ArFCz5EjX/ingest"
duration: "~3 hours"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Lex Fridman"
guest_name: "Sebastian Raschke, Nathan Lambert"
guest_title: "ML researcher & engineer, AI2 post-training lead"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Sebastian Raschke]]"
  - "[[Nathan Lambert]]"
concepts:
  - id: deepseek_moment
    zh: DeepSeek时刻
    en: DeepSeek moment
    one_line: 2025年1月中国开源公司DeepSeek以更低成本发布R1，打破美国AI垄断叙事
  - id: scaling_three_stages
    zh: 三阶段训练
    en: Pre-mid-post training
    one_line: 预训练（大规模语料）、中训练（特定任务专业化）、后训练（微调/RLVR/RLHF解锁能力）
  - id: rlvr
    zh: 强化学习验证奖励
    en: RLVR
    one_line: 通过可验证奖励的强化学习解锁模型技能，在数学和编程上取得突破
  - id: text_diffusion
    zh: 文本扩散模型
    en: Text diffusion model
    one_line: 并行生成多个token的非自回归模型，可能用于快速廉价大规模任务
  - id: recursive_lm
    zh: 递归语言模型
    en: Recursive language model
    one_line: 将长上下文任务分解为子任务递归调用LLM解决，提升长上下文准确性
  - id: continuous_learning
    zh: 持续学习
    en: Continuous learning
    one_line: 模型根据新信息不断更新权重进行适应，区别于上下文学习
  - id: atom_project
    zh: Atom项目
    en: Atom Project
    one_line: 美国构建高质量开放权重AI模型的倡议，对抗中国开源模型的影响力
---

# 2026年AI现状：思想流动，没有赢家通吃

> 对谈：Lex Fridman × Sebastian Raschke & Nathan Lambert（ML研究者 / AI2训练后负责人）| 来源：Lex Fridman Podcast | 2026年

---

## 开场：为什么现在聊这个

DeepSeek R1 在 2025 年 1 月以更低成本达到接近领先的性能，震动整个AI行业。一年过去，竞争从研究到产品层面全面加速。Claude Opus 4.5 引发社交媒体狂热，Gemini 3 高调发布又迅速冷却，中国开源模型如智谱AI、Minimax、Kimi 月之暗面接连涌现。这场对话发生在2026年初，两位嘉宾从开源策略、模型架构、AGI时间线三个维度拆解AI的下一步。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| DeepSeek时刻 | DeepSeek moment | 中国开源模型以更低成本挑战美国领先 |
| 三阶段训练 | Pre/mid/post training | 先学语言，再学专业技能，最后精炼能力 |
| 强化学习验证奖励 | RLVR | 用可验证的正确答案来训练模型做数学/编程 |
| 文本扩散模型 | Text diffusion | 像图像去噪一样并行生成文本，速度更快 |
| 递归语言模型 | Recursive LM | 把大任务拆小，反复调用LLM子任务 |
| 持续学习 | Continuous learning | 模型不断更新权重适应新信息 |
| 上下文学习 | In-context learning | 把信息塞进对话窗口，靠提示完成任务 |
| 规范驱动设计 | Spec-driven design | 用自然语言精确描述需求让AI执行 |
| Atom项目 | Atom Project | 美国构建高质量开放AI模型的政策倡议 |

---

## 01 DeepSeek时刻：中国开源AI的崛起

**Lex：** 从2025年1月DeepSeek R1发布到今天，竞争已经全面加速。在国际层面，谁是赢家？中国公司还是美国公司？

**Sebastian：** "赢"这个词太宽泛了。DeepSeek确实赢得了所有做开源模型开发的人的心，因为他们把这些模型作为开源分享。但"赢"有多个时间尺度——今天、明年、十年后。在2020年代的今天，我不认为会有任何一家公司拥有其他公司无法获得的独家技术。原因很简单：研究人员经常跳槽、更换实验室，他们是流动的。技术获取不是壁垒，区分因素是预算和硬件限制。想法不会是专有的，实现想法所需的资源才是。所以我目前看不到赢家通吃的局面。

**Nathan：** 各个实验室在不同方向投入的精力不同。Anthropic的Claude Opus 4.5引发的热潮令人难以置信，这种热度已经到了有点像网络迷因的程度。Gemini 3在几个月前发布，所有人一开始都认为这是Google重夺AI结构性优势的时刻，但现在人们谈论它不多了。Claude的代码策略目前对Anthropic很奏效，即使想法自由流动，很多事情仍受限于人力投入和组织文化。

中国那边有很多令人瞩目的技术，实验室比DeepSeek多得多。智谱AI的GLM模型、Minimax、Kimi月之暗面在过去几个月表现出色。DeepSeek正在失去其作为中国最杰出开源模型制造商的桂冠，但更重要的是，2025年DeepSeek的出现为更多中国公司开启了一种新型运营模式。

> **金句 · Sebastian**
> **中文：** 想法不会是专有的，实现想法所需的资源才是。
> **原文：** Ideas won't be proprietary. What will be proprietary is the means to realize those ideas.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| DeepSeek时刻 | DeepSeek moment | 中国开源模型以更低成本挑战美国领先 |
| 赢家通吃 | Winner-take-all | 一家公司垄断市场的局面 |
| 人才流动 | Talent mobility | 研究人员在实验室间跳槽使技术无法被垄断 |

**本章小结**
- DeepSeek赢得开源社区的心，但技术不会被任何公司独占
- 中国涌现大量开源模型实验室，DeepSeek不再是唯一标杆
- 预算和硬件是真正区分因素，想法本身会快速传播

---

## 02 中国开源模型的持续动力

**Lex：** 你认为中国公司会继续发布开源模型多久？

**Nathan：** 会持续几年。目前还没有明确的商业模式。这些中国公司很聪明，他们意识到许多美国科技公司出于安全考虑不会为中国公司的API订阅付费。所以他们把开源模型视为一种能力——影响并参与美国庞大AI支出市场的能力。政府也会看到这在技术采纳方面正在国际上建立很大影响力，所以会有很多激励措施维持下去。但构建这些模型非常昂贵，到某个时候会出现整合。不过2026年不会比2025年出现更多开源模型构建者，许多知名公司将继续来自中国。

**Sebastian：** 虽然DeepSeek在失去桂冠，但它们仍然略微领先。其他公司并不是DeepSeek变差了，而是它们在借鉴DeepSeek的想法。例如Kimi，用同样的架构训练，然后可能出现跳跃式发展。这又回到不会有明确赢家——某一家公司发布什么，另一家就跟进，最新的模型总是暂时最好的。

> **金句 · Nathan**
> **中文：** 开源模型是中国公司进入美国庞大AI支出市场的一张门票。
> **原文：** Open-source models are a ticket for Chinese companies to participate in the massive US AI spending market.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 开放权重模型 | Open-weight models | 公开模型权重供下载使用 |
| 模型定制化 | Model customization | 根据特定场景微调模型能力 |
| 整合 | Consolidation | 行业竞争导致小公司被收购或淘汰 |

**本章小结**
- 中国开源模型策略是进入美国市场的门票，政府也有动力支持
- 但模型构建成本高昂，未来会出现整合
- 竞争格局是"你发布我跟进"，没有永恒的领先者

---

## 03 模型用户体验与个性化需求

**Lex：** 你认为哪个模型赢得了2025年，哪个会赢得2026年？

**Sebastian：** 很多使用模式是品牌知名度和肌肉记忆。ChatGPT存在很长时间了，人们已经习惯使用它，形成了飞轮效应。但有趣的趋势是大型语言模型的定制化。ChatGPT有记忆功能，你可能用它处理个人事务，但不想在工作中使用同样的东西。公司可能不允许，或者你不想那样做。未来你可能需要多个订阅——一个纯粹的代码工作专用，另一个是个人专用。这不是只能有一个，未来会是多重选择。

**Nathan：** 在消费者聊天机器人背景下，问题是是否愿意押注Gemini而非ChatGPT？感觉有点冒险。OpenAI一直是行业先行者，在科技领域这有很多好处。但Google也做了很多了不起的事。GPT-5的主要功能是路由器，让大多数用户不再承担那么多GPU成本，这为他们省了大量资金。很难将个人喜欢的模型特性与真正能成为大众区分点的特性区分开来。

> **金句 · Sebastian**
> **中文：** 未来你可能需要多个订阅——工作专用和个人专用。
> **原文：** You might need multiple subscriptions — one purely for code work, another for personal use.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 肌肉记忆 | Muscle memory | 用户习惯性使用同一产品 |
| 模型定制化 | Model customization | 针对不同场景微调模型 |
| 路由器 | Router | GPT-5根据任务分配到不同大小的模型 |

**本章小结**
- 用户粘性来自品牌和习惯，不完全取决于模型质量
- 模型定制化是趋势，工作和个人可能需要不同订阅
- GPT-5通过路由器设计降低推理成本

---

## 04 文本扩散模型：并行生成的可能

**Lex：** 2026年会有什么技术突破？

**Sebastian：** 文本扩散模型是一个有趣方向。图像扩散模型如Stable Diffusion通过迭代去噪产生高质量图像，人们想把这个思路用于文本。文本是离散的，不像像素连续，但原理类似——从随机文本开始迭代填补缺失部分，关键是能同时处理多个token，理论上更高效。但权衡是：质量如何？去噪步骤越多质量越好，最终可能花费和自回归模型相同的计算量。另一个缺点是推理任务需要中间结果，扩散模型处理这个有点棘手。谷歌推出了Gemini Diffusion，声称以相同质量更快生成内容。我不认为它会取代自回归LLM，但可能用于快速、廉价的大规模任务，未来免费层可能是这样的。

**Nathan：** 当GPT-5需要30分钟才能响应时，扩散模型在批次中生成所有完成的token，所以快得多。我听说的初创公司用扩散模型生成非常长的代码差异，因为自回归模型需要数分钟，用户流失严重。但工具使用是阻止扩散模型成为最通用模型的原因——Claude Code和ChatGPT的自回归链会被外部工具打断，我不知道如何在扩散设置中做到这一点。

> **金句 · Sebastian**
> **中文：** 文本扩散模型可能成为未来免费层的基础设施——快速、廉价、大规模。
> **原文：** Text diffusion models might become the infrastructure for free tiers — fast, cheap, at scale.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 文本扩散模型 | Text diffusion model | 像图像去噪一样并行生成文本 |
| 自回归 | Autoregressive | 一次生成一个token的逐步生成方式 |
| 去噪步骤 | Denoising steps | 扩散模型迭代精炼的次数 |

**本章小结**
- 文本扩散模型能并行生成，速度优势明显
- 但质量需要更多去噪步骤抵消效率优势，工具使用也有局限
- 更可能作为免费层或快速任务的补充，而非替代自回归模型

---

## 05 工具使用与AI的使用方式进化

**Lex：** 工具使用的前景如何？

**Sebastian：** 工具使用是巨大突破，能把某些任务从记忆外包给实际操作。与其让LLM记住23加5是多少，不如直接用计算器。这能减少幻觉但不能完全解决——LLM仍需知道何时调用工具，互联网也不总是正确的。递归语言模型论文把概念推得更远：对于长上下文任务，不一次性解决，而是分解成子任务，让LLM决定什么是好的子任务，递归调用另一个LLM解决。每个子任务都去网上收集信息，最后汇总。不需要改进LLM本身，而是改进LLM的使用方式。

**Nathan：** 开放模型和封闭模型使用工具的方式非常不同。开放模型是用户去Hugging Face下载，然后自己选择工具，但发布时需要对多种工具有用，这很难。封闭模型把特定工具深度整合到体验中。开放模型在工具使用方面处于劣势，但当它们解决这个问题时，需要一个更灵活的模型，结合递归思想成为协调器和工具使用模型。这种必要性可能推动有趣的创新。

> **金句 · Nathan**
> **中文：** 开放模型和封闭模型在工具使用上的差异，可能定义本地开放与封闭的利基市场。
> **原文：** The difference in how open and closed models use tools might define local open vs closed niches.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 工具使用 | Tool use | LLM调用外部工具完成任务 |
| 递归语言模型 | Recursive LM | 把长任务拆成子任务递归调用 |
| 协调器 | Coordinator | 在多个子任务和工具间调度的模型 |

**本章小结**
- 工具使用减少幻觉但需解决"何时调用"和"信息正确性"
- 递归语言模型通过分解任务提升长上下文准确性
- 开放模型在工具整合上落后，但可能因此推动架构创新

---

## 06 持续学习：权重更新 vs 上下文学习

**Lex：** 持续学习是什么？为什么它越来越重要？

**Nathan：** 这与AGI/ASI的定义密切相关。语言模型不能像员工那样从反馈中学习——编辑犯错后你告诉他，好编辑就不会再犯，但LLM不具备这种快速学习能力。持续学习的目标是让AI能适应任何远程工作场景并从在职学习中快速学习。但有另一种观点：我们只需要向模型提供更多信息和上下文，它们就能通过大量上下文表现出快速学习的样子。这是通过更新权重学习，还是靠更多上下文的权衡。

**Sebastian：** 持续学习我们已经有不同形式了——GPT-5到5.1和5.2的更新就是精心策划的快速更新。更细粒度的例子是RLHF，运行它就更新。问题是你不能为每个人都更新权重，因为太昂贵。即使在OpenAI的规模下建造数据中心也太贵。这只有在设备上、成本由消费者承担时才可行，比如苹果试图用Apple基础模型放在手机上让设备从经验中学习。LoRA适配器是另一种方式——不是更新整个权重矩阵，而是两个较小的权重矩阵并行叠加。但论文表明LoRA学得少忘得也少，需要找到金发姑娘区。

> **金句 · Sebastian**
> **中文：** 持续学习的经济学问题：为每个人更新权重太贵了，只有设备端才可能。
> **原文：** The economics of continuous learning: updating weights for everyone is too expensive. Only on-device is feasible.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 持续学习 | Continuous learning | 不断更新权重适应新信息 |
| 上下文学习 | In-context learning | 通过对话窗口加载信息完成任务 |
| LoRA适配器 | LoRA adapter | 用小矩阵叠加更新部分权重 |
| 金发姑娘区 | Goldilocks zone | 找到学得够多又忘得够少的平衡点 |

**本章小结**
- 持续学习是AGI的关键能力，但更新权重的经济学是瓶颈
- 两条路线：全局模型更新（昂贵）vs 设备端学习（可行但有限）
- LoRA是折中方案，需在学习量和遗忘率间找到平衡

---

## 07 AGI时间线与AI的参差不齐

**Lex：** AGI的时间线是什么？

**Nathan：** AGI和ASI的门槛不是特别有用的定义。很多分歧在于"一个能完成大多数数字经济工作的东西"，但AI在某些方面非常出色，在另一些方面非常糟糕——它是"参差不齐"的。擅长传统ML系统和前端代码，但对大规模分布式学习的训练数据太少。我认为超人程序员几乎是无法实现的，因为能力上总会有差距。这是一种人机协作，人类弥补模型无法做到的事情。我不认为AI能自动化AI研究，至少在这个时间框架内不会。大型科技公司投入千亿美元的速度，会比得到一个能实现AI研究奇点的自动化AI研究员快得多。

**Sebastian：** 有些论文表明，如果你想获得相同质量，必须增加去噪步骤，最终花费和自回归模型相同的计算量。工具使用需要授权模型访问你的系统，这需要信任——我不确定今天会允许LLM访问我的邮件。问题还在于规范方面：对于任意任务，你仍需指定LLM做什么，如何在什么环境中做到。如何将信息输入到一个为你预订旅行的系统中？作为用户，你如何在模型甚至尝试之前就引导它？界面真的很难。

> **金句 · Nathan**
> **中文：** AI是参差不齐的——在某些方面非常出色，在另一些方面非常糟糕。
> **原文：** AI is jagged — incredibly good at some things, terrible at others.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 参差不齐 | Jagged | AI能力不均匀，某些任务极强某些极弱 |
| 人机协作 | Human-AI collaboration | 人类弥补模型弱点，模型放大人类能力 |
| 规范驱动设计 | Spec-driven design | 用精确自然语言描述需求 |

**本章小结**
- AGI定义模糊，更实际的衡量是"远程工作者替代"
- AI能力参差不齐，短期内更可能是增强而非替代人类
- 规范和界面仍是工具使用的核心瓶颈

---

## 08 开源AI的未来与人类角色

**Lex：** AI产业会如何整合？开源模型的未来怎样？

**Nathan：** 2025年故事之一是美国感受到了Llama的空白，中国开放权重模型崛起。我投入大量精力推动Atom项目——美国构建高质量开放权重AI模型的倡议。开放模型将成为AI研究的引擎，因为人们都从它们开始，所以拥有它们很重要。美国应该构建最好的模型，让最好的研究发生在美国。最好的情况是多个组织构建模型，因为它们可以交流思想构建生态系统。成本约1亿美元，对这些公司不多。现在文化潮流正在转变——Reflection AI宣布20亿美元融资专门构建美国开放模型。

**Sebastian：** 我认为作为普通人使用LLM，接下来立即感受到的可能与图表制作有关。目前LLM在制作图表方面表现糟糕，因为推理计算能力远低于幕后。还有一些更即时的价值——比如计划去迪士尼乐园时，LLM能根据你的限制条件定制行程。这是成千上万个例子之一：从稀疏互联网上提取信息，练习个性化。非信息密集型的东西没有更好的版本存在，你几乎从零开始创建它。

> **金句 · Sebastian**
> **中文：** 我们会对AI生成的"垃圾"感到厌倦，实物和面对面交流的价值会增加。
> **原文：** We'll get tired of AI slop. The value of physical things and face-to-face interaction will increase.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Atom项目 | Atom Project | 美国构建开放AI模型的政策倡议 |
| AI垃圾 | AI slop | AI生成的低质量内容泛滥 |
| 个性化 | Personalization | 根据用户特定条件定制输出 |

**本章小结**
- 开源模型对研究和教育至关重要，美国需要集中力量构建
- AI即时价值在于从稀疏信息中提取个性化方案
- AI垃圾泛滥会推高实物和人类体验的价值

---

## 总结：思想流动，放大而非转变

| 维度 | 要点 |
|------|------|
| 竞争格局 | 没有赢家通吃，想法会流动，区分因素是资源 |
| 开源模型 | 中国开源策略可持续几年，美国需集中投资 |
| 架构方向 | 文本扩散模型可能成为免费层，递归LM解决长上下文 |
| 工具使用 | 减少幻觉但界面是瓶颈，开放模型落后但有创新空间 |
| 持续学习 | 经济学是瓶颈，LoRA是折中方案 |
| AGI时间线 | 参差不齐，短期内人机协作而非替代 |
| 人类角色 | AI放大能力但自主权在人类，我们对问题相伴更久 |

> **金句 · Sebastian（封底）**
> **中文：** 一百年后，历史学家会记住的是计算本身，不是AI或Transformer——我们只是更好地利用了计算机。
> **原文：** A hundred years from now, what history will remember is computing itself — not AI or Transformers. We just got better at using computers.

---

## 附录

**章节时间戳**
- 00:00 开场介绍嘉宾
- 04:00 DeepSeek时刻与国际竞争
- 25:00 模型用户体验与个性化
- 40:00 文本扩散模型技术探讨
- 55:00 工具使用与递归语言模型
- 75:00 持续学习与权重更新
- 95:00 AGI时间线与参差不齐
- 115:00 AI产业整合与开源未来
- 135:00 人类角色与历史影响
- 155:00 收尾与爱因斯坦引言

**Ingest 信息**
- column_source: Recastory/workspace/bilibili-retranscribe/BV1ArFCz5EjX/ingest/column_article.md
- asr_status: asr_ready

**相关阅读**
- [[MOC - Agent Theory and Design]] — Agent时代总入口
- [[MOC - Harness Engineering]] — 模型工程实践相关
- [[杨植麟-Kimi K2.5研发内幕]] — 中国开源模型技术细节
- [[杨立昆-世界模型才是未来]] — 对LLM路线的批判视角
