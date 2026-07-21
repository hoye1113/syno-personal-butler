---
title: "Logical CEO：解决LLM不能解决的问题"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_philosophy", "ai_safety"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_philosophy", "ai_safety", "ebm", "llm_limitations", "formal_verification"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1kTo4BQE43/"
description: "Logical Intelligence 创始人 Eve Bodnia：基于能量的模型（EBM）通过能量最小化原理弥补 LLM 在逻辑正确性与空间推理上的先天缺陷，AI 的下一场相变不在于参数规模。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Logical CEO-解决LLM不能解决的问题.md"
source_sha256: "b9242a14cff6e5ba5613e8f940a3d9060556534659dcddde02dee613ca9ee9d1"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1kTo4BQE43/"
column_url: "https://www.bilibili.com/read/cv46444125/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1kTo4BQE43/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1kTo4BQE43/ingest"
duration: "~35 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Dan Shipper"
guest_name: "Eve Bodnia"
guest_title: "Logical Intelligence 创始人兼 CEO"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Eve Bodnia]]"
concepts:
  - id: ebm
    zh: 基于能量的模型
    en: energy-based model / EBM
    one_line: 通过能量最小化原理进行非自回归推理
  - id: autoregressive_limit
    zh: 自回归架构缺陷
    en: autoregressive limitation
    one_line: LLM 逐 token 预测，无法内部验证，像隧道视野导航
  - id: energy_landscape
    zh: 能量景观
    en: energy landscape
    one_line: 所有可能状态映射成有高低点的地图，最低点是最可能状态
  - id: latent_variables
    zh: 潜在变量
    en: latent variables
    one_line: 存储数据背后规则的知识库，不依赖语言
  - id: formal_verification
    zh: 形式化验证
    en: formal verification
    one_line: 用数学证明确保代码逻辑正确，机器可验证
  - id: vibe_coding_limit
    zh: 氛围感编程的逻辑崩坏
    en: vibe coding logical breakdown
    one_line: 局部正确但全局不一致，LLM 容易被上下文干扰
---

# Logical CEO：解决LLM不能解决的问题

**Host：** Dan Shipper（Every CEO）  
**Guest：** Eve Bodnia（Logical Intelligence 创始人兼 CEO）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `BV1kTo4BQE43/ingest/column_article.md`  
**B 站：** [BV1kTo4BQE43](https://www.bilibili.com/video/BV1kTo4BQE43/)

---

## 开场

Eve Bodnia 创立了 Logical Intelligence，做一件事——把「正确性」当产品卖。她同时使用 EBM 和 LLM，但认为 EBM 才是长期方向。核心论点很直接：LLM 是黑盒，你无法在它处理过程中进行干预；即使附加外部验证器，也无法解决 Token 昂贵且缺乏逻辑确定性的底层问题。EBM 不同——它没有 Token 序列，借鉴物理学中的拉格朗日量，通过构建「能量景观」来寻找系统的最优状态。这种「鸟瞰视角」让模型能直接在状态空间中导航，避免了 LLM 容易陷入局部错误且无法回头的「幻觉」困境。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 基于能量的模型 | energy-based model / EBM | 通过能量最小化原理进行非自回归推理的架构 |
| 自回归 | autoregressive | LLM 逐 token 预测，一次只能选一个方向 |
| 能量景观 | energy landscape | 所有可能状态映射成有高低点的地图 |
| 潜在变量 | latent variables | 存储数据背后规则的知识库，不依赖语言 |
| 形式化验证 | formal verification | 用数学证明确保代码逻辑正确 |
| 拉格朗日量 | Lagrangian | 物理学中描述系统能量的数学表达 |
| 扩散模型 | diffusion models | 通过注入噪声和改变导航策略来重建能量景观 |
| 知识诅咒 | curse of knowledge | 专家不知道自己知道什么，导致盲区 |

---

## 01 LLM的自回归架构导致其无法实现内部验证

**Dan：** 你做了一个很直接的对比——如果一辆自动驾驶汽车用的是 LLM，有 20% 的时间会幻觉，你敢坐吗？这个类比想说明什么？

**Eve：** 想象一下，你有一辆由 AI 驾驶的汽车，你坐在那辆车里，而那个 AI 是一个 LLM。如果有人告诉你它有 20% 的时间会产生幻觉，你可能会被带到错误的地方。你对此有何感受？你乘坐飞机从旧金山到纽约，有人说 20% 的时间它可能会像预测下一个词一样出现不匹配，然后就会坠落——飞机目前由确定性系统运行得非常好。

LLM 的问题在于它的架构不允许内部验证。它是一个黑盒子——你无法访问内部运行过程，直到它处理完毕，你只能看到输出。许多人将 LLM 用于特定任务，如果需要逻辑，他们会附加外部验证器，比如 Lean 4 这种可机器验证的证明语言。然而这并不能解决成本过于昂贵的问题，因为昂贵的是架构本身——它仍然在玩猜谜游戏。

即使你附加了外部验证器，即使你专门为任务微调了 LLM，你仍然没有解决 Token 昂贵的问题。玩猜谜游戏需要巨大的计算资源。我们面临的情况是：内部缺乏验证器，但有外部验证器。

**Dan：** 所以你的观点是，LLM 的问题不是模型不够好，而是架构本身决定了它无法做到确定性？

**Eve：** 对。你总有机会看到 EBM 的内部，因为你控制着训练过程。对于 LLM，你需要等到训练完成才能真正查看内部。而在 EBM 这里，你可以实时进行。而且你还可以附加与 LLM 兼容的外部验证器，拥有双重验证机制。

> **金句 · Eve Bodnia**
> **中文：** LLM 是黑盒子，你无法访问内部运行过程——它在玩猜谜游戏，而且 Token 很贵。
> **原文：** LLM is a black box — you cannot access the internal workings. It is playing a guessing game, and tokens are expensive.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自回归 | autoregressive | LLM 逐 token 预测，一次只能选一个方向 |
| 内部验证 | internal verification | 在模型处理过程中检查是否正确 |
| 外部验证器 | external verifier | 用另一个系统（如 Lean 4）检查输出 |
| 黑盒 | black box | 无法看到模型内部如何得出答案 |

**本章小结**

- LLM 的自回归架构决定了它无法内部验证——只能等输出完才能检查
- 附加外部验证器（如 Lean 4）可以检查，但不能解决 Token 昂贵的根本问题
- EBM 可以实时查看内部过程，拥有内外双重验证机制

---

## 02 EBM通过能量最小化原理实现非自回归推理

**Dan：** 能为听众定义一下 EBM 吗？你说它「没有 token 序列」，这跟 LLM 到底有什么本质区别？

**Eve：** EBM 简单来说是「基于能量的模型」。能量这个概念来自物理学——你的全职工作就是编写拉格朗日量，它对应于系统中与能量相关的项。这是我的动能，这是我的势能。然后你推导出运动方程。推导的方式就是进行最小化。理论物理学几乎都是这样运作的：从能量项开始，最小化能量，然后推导出运动方程。运动方程会给你守恒定律。

我们在高层次上使用这个能量最小化原理，作为人工智能处理信息的方式。所以它只是一个整体概念：让我们获取一些能量，尝试最小化它，然后发现其中的规律。

想象你正在地图中导航，你有一个左脑来指引方向。你一次只能选择一个方向，有时你会走错路，仅仅因为你产生了幻觉。比如路上可能有个坑，你就掉进去了。你可能看到了这个坑，但你不能回头，因为你是自回归的 LLM。而 EBM 会一直拥有鸟瞰视角——所以如果你看到前面有个坑，你会选择不同的路线。

**Dan：** 你说的鸟瞰视角，能再具体一些吗？它是怎么看到全局的？

**Eve：** 假设丹很累，录了几千个播客刚回到家。如果丹是这里的变量，我们要找出他在家里的运动方程，以及他最有可能在哪里结束。你很可能会躺在沙发上，看个不错的节目，再喝点东西。所以当丹累了，他就会去沙发上放松。

为了得出这个结论，我们会查看你所有可能的状态——你在洗碗、在房子里走动、在沙发上。这些是不同的状态，但你最可能出现的情况是在沙发上。所有这些画面都可以映射到我们称之为「能量景观」的东西上。它就像一张地图，有最高点和最低点。最高点对应于不太可能的场景——如果你很累，你可能不会去跳舞。最低点对应的是你躺在沙发上的状态。

LLM 会怎么做？它将依赖于海量训练数据来找出你最终会去哪里，它将预测与你下一个标记的概率相关联。LLM 让我困扰的一点是，它的智能是依赖于语言的。我们在家里走动时，是在试图预测下一个词吗？可能不是。你只是使用视觉数据和身体状态，然后移动身体，不需要说话。

> **金句 · Eve Bodnia**
> **中文：** EBM 拥有鸟瞰视角——如果你看到前面有个坑，你会选择不同的路线，而不是像 LLM 那样掉进去。
> **原文：** EBM always has a bird's eye view — if you see a pit ahead, you choose a different route instead of falling in like an LLM.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 能量最小化 | energy minimization | 物理学原理：系统倾向于找到能量最低的状态 |
| 能量景观 | energy landscape | 所有可能状态映射成有高低点的地图 |
| 鸟瞰视角 | bird's eye view | 能看到全局状态空间，不像 LLM 只有隧道视野 |
| 非自回归 | non-autoregressive | 不逐 token 预测，能同时考虑所有可能状态 |

**本章小结**

- EBM 借鉴物理学能量最小化原理，通过构建能量景观来寻找系统最优状态
- LLM 是隧道视野——只能看到当前 token，像在迷宫里一次只能选一个方向
- EBM 是鸟瞰视角——能看到所有可能状态，避开坑洞选择最优路线
- 人类在家中走动时不预测下一个词——非语言任务用 LLM 是把东西强行映射到语言空间

---

## 03 潜在变量是存储世界规则的非语言知识库

**Dan：** 你提到 EBM 引入了「潜在变量」来理解数据——它跟传统机器学习的特征工程有什么区别？

**Eve：** LLM 并不真正理解数据。你向它输入大量数据，它表现得好像明白了，知道这里最可能的情况是什么。然而对于 EBM，你可以输入大量数据，它不只是寻找最大的模式，还会尝试理解这个模式。这种理解和知识将进入潜在变量。

什么是对数据的理解？它关于世界的基本知识和基本规则。比如，如果 Dan 后面有一张沙发，那很可能是因为他喜欢坐在上面。所以你可以针对你作为一个数据点、沙发作为一个数据点，去猜测一些小规则。你可以尝试创建那种适用于所有事物的规则。

对于你在公寓里导航，也存在一些规则——厨房是用来做饭的，还有浴室、沙发、床。这种理解让你拥有自己的心理世界模型，帮助你理解周围的环境。如果环境发生变化，你也能理解这些规则。比如如果有人给你换了一张不同形状的沙发，你仍然会知道该怎么做。

**Dan：** 所以潜在变量本质上是一个规则存储库？

**Eve：** 它不等于一个规则，但它等于某种包含你数据规则知识的东西。它就像一个知识存储库。它以能量景观的形式存在——它本身就是另一个需要导航的能量景观。本质上，我们获取并查看数据，为人工智能构建某种结构来处理数据，这样它就可以开始学习关于数据的规则。一旦它理解了这些规则，就会以能量景观的形式将知识存储在潜在变量中。

这就是 EBM 在数据分析方面表现强大的原因。因为数据分析的核心就是寻找数据中的模式和规则。如果你试图将关于数据的规则附加到语言上，语言反而没有帮助。这些数据——数字、关系和函数——如果与英语单词关联，然后你试图寻找下一个词，那样会丢失很多信息。

> **金句 · Eve Bodnia**
> **中文：** 潜在变量是关于数据的知识存储库——它不等于一条规则，而是包含你所有数据背后规则知识的东西。
> **原文：** Latent variables are a knowledge store for your data — not equal to a single rule, but containing knowledge of all the rules behind your data.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 潜在变量 | latent variables | 存储数据背后规则的知识库 |
| 心理世界模型 | mental world model | 对周围环境规则的内化理解 |
| 规则提取 | rule extraction | 从数据中发现底层规律和约束 |
| 模式匹配 | pattern matching | LLM 做的事——找最可能的模式，不理解为什么 |

**本章小结**

- 潜在变量是关于数据的知识存储库，存储数据背后的基本规则和规律
- EBM 不只是匹配模式，而是尝试理解模式——这是跟 LLM 的本质区别
- 潜在变量以能量景观形式存在，本身就是另一个需要导航的结构
- 数据分析的核心是寻找规则，语言反而会丢失信息——非语言处理更有优势

---

## 04 解决Vibe Coding带来的系统性逻辑崩坏

**Dan：** 你最近用 LLM 做了很多编码，发现一个问题——局部代码都对，但放大看整体一团糟。你认为 EBM 能解决这个问题吗？

**Eve：** 你描述的涉及很多问题。是的，解决 Vibe 编码的问题是我们的用例之一。我们梦想着生成经过形式验证的代码，并完全自动化编码过程。我们的目标是让你从用特定语言编写代码，转变为用自然语言编写代码。你可以用自然的英语编写代码，不再需要 C 语言或 Python。

就目前的编码状态而言，我们向 LLM 发出提示，它会给我们一些反馈。但作为工程师，你仍然需要判断什么是对的，什么是错的。即使它有一个外部验证器，它也会检查你 GitHub 空间中的旧逻辑是否与你试图创建的内容兼容，以及新逻辑是否与旧逻辑兼容。这些外部验证器可以进行检查——它们可以说：嘿，我们知道旧逻辑，也知道新逻辑，我们将看看它们如何合并，并编写数学证明，确保这个逻辑与你已有的代码兼容。

一旦你理解了这一点，这就是我们试图解决的第一个问题：它仅仅是逻辑，并且与你已有的东西兼容。第二个问题是，这段代码是否真的在做你想要它做的事情？这是人工智能目前无法为你解决的，因为人工智能无法看穿你的大脑知道你想要什么。

**Dan：** 所以你设想的未来是，人写规范，EBM 自动生成逻辑严密的代码？

**Eve：** 是的。我们现在正在将你从「编写代码」转变为「编写代码规范」。想象你正在编写自动驾驶的代码。你从硬件角度有规范，从逻辑角度也有规范，比如指令、汽车应该如何表现等。代码能够被编译是一个问题。第二个问题是，这段代码是否在做你想要它做的事情？例如，它在硬件上的运行速度有多快等等。

如果你将 LLM 作为一种人工智能形式来驱动一些重要的事情——比如人们托付生命的汽车、飞机——LLM 可能会行为不端，因为你无法约束它，它会产生幻觉。而 EBM 是可以被约束的。你可以提出一套约束条件，EBM 就会被迫遵守。所以作为人类，你需要确保你知道自己希望人工智能做什么。然后从我们的技术角度，我们确保人工智能始终遵守人类给出的规则。

> **金句 · Eve Bodnia**
> **中文：** Vibe 编码的代码局部都对，但放大看一团糟——EBM 能通过形式化验证解决这个全局一致性问题。
> **原文：** With vibe coding, every piece of code is locally correct, but zoom out and it is a mess — EBM can solve this global consistency problem through formal verification.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 形式化验证 | formal verification | 用数学证明确保代码逻辑正确，机器可验证 |
| 代码规范 | code specification | 用自然语言描述代码应该做什么，而非怎么写 |
| 全局一致性 | global consistency | 所有代码逻辑统一，不是局部正确的拼凑 |
| 约束条件 | constraints | 人类给出的规则，EBM 被迫遵守 |

**本章小结**

- Vibe 编码的代码局部都对但全局不一致——LLM 容易被上下文干扰，无法缩小看整体
- EBM 结合形式化验证，可以把编程从「写代码」转向「写规范」
- EBM 可以被约束——人类给出规则，EBM 被迫遵守，适合安全关键场景
- LLM 无法约束自己——它会幻觉，不适合托付生命的系统

---

## 05 EBM不是LLM的终结者而是确定性插件

**Dan：** 现在整个行业投入数千亿美元建设 LLM 数据中心。EBM 跟这个生态是什么关系——是竞争还是补充？

**Eve：** 这是一个生态系统。LLM 在历史上是第一种产生影响的人工智能形式，它在 2021 年、2023 年给我们带来了「啊哈」效应。当它们刚开始出现时，人们觉得这就是新的未来。所以人们开始相信，如果它真的擅长与我交谈，最终它也会擅长进行数据分析、处理我的税务和其他事情。因此整个投资界都开始向 LLM 投入资金。

现在人们看到，增加了计算能力，稍微改变了架构，但它似乎达到了一个平台期，而且已经投入了这么多钱。你该怎么办？这可是数十亿美元。你不能就这样忘记它。数十亿美元投入到这里，数十亿美元投入到那里。所以投资界很难迈出那一步去理解：也许我应该投资一些全新的东西。

当我们提出替代架构时，我们想：不要把它当作一个完全不同的、让你必须放弃 LLM 的东西。我们与 LLM 非常兼容，你可以把 LLM 放在我们之上。EBM 与 Transformer 兼容，Transformer 可以与任何 LLM 一起工作。我们可以成为那一层，让你所有的 LLM 投资仍然保有价值。

**Dan：** 所以你的策略是「兼容」而不是「替代」？

**Eve：** 对。每个人都想让模型更便宜，你可以把与空间推理相关的任务外包给我们。比如如果有人来找大型科技公司的 LLM 说：嘿，你能帮我报税吗？LLM 无法直接解决这个问题，但如果它连接到 EBM，我们可以处理——而你可以继续处理任何与语言相关的事情。所以我们实际上可以尝试实验，以降低你 LLM 投资组合的成本，并成为现有生态系统的一部分。

同时我们正在为其他形式的人工智能创建一个新的生态系统。我认为这非常聪明——不跟数千亿美元的存量投资正面对抗，而是成为它的补充层。

> **金句 · Eve Bodnia**
> **中文：** 我们不是要终结 LLM，而是成为它的确定性层——LLM 处理语言，EBM 处理需要正确性的任务。
> **原文：** We are not here to end LLM — we are its deterministic layer. LLM handles language, EBM handles tasks that require correctness.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 确定性层 | deterministic layer | EBM 作为 LLM 的补充，处理需要正确性的任务 |
| 兼容策略 | compatibility strategy | 不替代 LLM，而是成为 LLM 生态的一部分 |
| 边际效用递减 | diminishing marginal returns | LLM 堆算力堆数据的渐进改进已难发生相变 |
| 相变 | phase change | 从量变到质变的突破，不是渐进式改进 |

**本章小结**

- LLM 投入数千亿美元已进入边际效用递减平台期，渐进式改进难发生相变
- EBM 策略是成为 LLM 的确定性层——兼容 Transformer，不替代存量投资
- LLM 处理语言交互，EBM 处理逻辑推理、电网调度等需要极高正确性的任务
- 投资界很难从 LLM 转向全新架构——兼容策略比替代策略更聪明

---

## 总结：AI的下一场相变不在于参数规模

| 维度 | 要点 |
|------|------|
| 架构缺陷 | LLM 自回归架构决定无法内部验证，像隧道视野导航 |
| EBM 原理 | 能量最小化 + 鸟瞰视角，能同时考虑所有可能状态 |
| 潜在变量 | 存储数据背后规则的知识库，不依赖语言 |
| 编程未来 | 从写代码转向写规范，形式化验证确保全局正确性 |
| 商业策略 | 成为 LLM 的确定性层，不替代存量投资 |
| LLM 现状 | 已进入边际效用递减平台期，渐进改进难发生相变 |

> **金句 · Eve Bodnia（封底）**
> **中文：** AI 的下一场相变不在于参数规模——当电力刚发明时，它表现很糟，但没有人会因此放弃电力。
> **原文：** The next phase change in AI is not about parameter scale — when electricity was first invented, it performed terribly, but no one would give up electricity because of that.

---

## 相关阅读

- [[杨立昆-世界模型才是未来]]
- [[DeepMind研究员-递归循环中AI构建AI]]
- [[OpenAI首席科学家-超越代码的强化学习]]
