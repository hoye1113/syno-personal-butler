---
title: "a16z创始人-浏览器末日与OpenClaw"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1qEdaBdEYi/"
description: "Marc Andreessen深度复盘AI演进史：80年厚积薄发的爆发期、推理与编码突破是转折点、Agent本质是LLM+Unix Shell架构复兴、编程语言将消失、社会管理主义是AI普及最大阻碍。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/a16z创始人-浏览器末日与OpenClaw.md"
source_sha256: "e735efcb185e53612fa88d0c4db571d70aa0af3a8ecd7a6db5c73cefa240870b"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1qEdaBdEYi/"
column_url: "https://www.bilibili.com/read/cv47878730/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1qEdaBdEYi/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1qEdaBdEYi/ingest"
duration: "~95 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Alassio"
guest_name: "Marc Andreessen"
guest_title: "a16z联合创始人"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Easonlee的AI笔记]]"
concepts:
  - id: eighty_year_overnight
    zh: 80年的一夜成功
    en: 80-year overnight success
    one_line: ChatGPT看似一夜爆发，实则是1943年以来神经网络研究的厚积薄发
  - id: llm_plus_unix_shell
    zh: LLM+Unix Shell
    en: LLM plus Unix Shell
    one_line: Agent本质是语言模型+Shell+文件系统+Cron的经典架构复兴
  - id: software_abundance
    zh: 软件无限供应
    en: software abundance
    one_line: 高质量软件从稀缺资源变成无限供应的廉价商品
  - id: anti_depreciation_chips
    zh: 逆折旧芯片
    en: anti-depreciation chips
    one_line: 旧GPU因软件优化反而更值钱，与传统硬件折旧规律相反
  - id: managementism_barrier
    zh: 管理主义壁垒
    en: managementism barrier
    one_line: 工会、职业准入制度等存量利益是AI普及的最大社会阻碍
---

# 我们用的都是阉割版技术——算力降10倍模型性能将有质的飞跃

> 对谈：Alassio × Marc Andreessen（a16z联合创始人）| 来源：Lydian Space Podcast

---

## 开场：为什么现在聊这个

Marc Andreessen 是a16z联合创始人、网景浏览器发明者、硅谷顶级投资人。他从80年代末就开始研究AI，这次深度复盘了AI从神经网络到代理的完整演进史，核心判断：当前爆发是80年研究的厚积薄发，LLM+Unix Shell是真正的架构突破，编程语言将消失，但社会管理主义会拖慢一切。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 80年一夜成功 | 80-year overnight success | ChatGPT看似一夜爆发，实则1943年以来的厚积薄发 |
| 逆折旧 | anti-depreciation | 旧GPU因软件进步反而更值钱，与传统折旧相反 |
| LLM+Unix Shell | LLM + Unix Shell | Agent的本质架构：语言模型+命令行+文件系统 |
| 递归自我改进 | recursive self-improvement (RSI) | AI能自动改进自己的代码和能力 |
| 管理主义 | managementism | 职业经理人阶层接管组织，扼杀创新的社会结构 |
| 人类证明 | proof of personhood | 加密验证确认对方是真人而非机器人 |
| 选择性披露 | selective disclosure | 只证明需要证明的部分身份信息，不泄露全部 |

---

## 01 AI行业处于80年的一夜成功爆发期

**Marc：** 关于人工智能，我认为现在所处的时期可以称之为"80年的一夜成功"。之所以说它是一夜成功，是因为ChatGPT横空出世，然后o1来了，接着Claude也来了——这些都是一夜之间发生的、激进且颠覆性的成功。但它们都源于80年来积累的思想和理念。

最初的神经网络论文是1943年的。1955年在达特茅斯大学举行了一次AGI会议，他们获得了NSF的资助，让所有AI专家一起度过夏天。他们认为如果在一起待10周就能实现AGI。1955年并没有出现AGI。

但回想起来，这些科学家是对的。他们可能搞错了时机，但从根本上说，几十年来从事这项工作的科学家们完全正确。他们所有工作的回报正在当下发生。如果我只有18岁，这绝对是我会投入全部时间去做的事情。

> **金句 · Marc**
> **中文：** 这是80年工作的结晶。现在是它变为现实的时候了，我完全相信这一点。
> **原文：** This is 80 years of work coming to fruition. Now is when it becomes real, and I completely believe it.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 80年一夜成功 | 80-year overnight success | 长期研究积累在短时间内集中释放 |
| 催化时刻 | catalytic moment | 技术积累到临界点后的爆发性突破 |
| 波浪叠加 | wave stacking | 不同技术层以不同速度出现但持续积累 |

**本章小结**
- ChatGPT看似一夜爆发，实则是1943年以来神经网络研究的厚积薄发
- 科学家们可能搞错了时机但完全正确，他们的回报正在当下发生
- 这是"80年的一夜成功"，是长期核心研究的大规模释放

---

## 02 推理与编码突破是AI进入现实世界的转折点

**Marc：** 从ChatGPT出现到2025年春天，善意且消息灵通的怀疑论者会说：这只是模式补全；幻觉率太高了。我们无法利用它在编码、医学、法律或真正重要的领域发挥作用。

但o1和R1带来的推理突破基本上回答了这个问题：不，我们真的能够把它变成在现实世界中发挥作用的东西。然后是编码的突破。如果连Linus Torvalds都说AI编码现在比他更好了，这在以前从未发生过。

所以现在我们知道它将席卷编码领域。如果它在编码领域有效，它在其他所有领域也会有效，因为编码是最难的例子。其他一切都将是它的衍生品。我们刚刚通过Claude实现了代理突破，然后又获得了自动研究和自我改进的能力。我们在功能上取得了四项根本性突破：LLM、推理、代理、递归自我改进，它们都实际在发挥作用。

> **金句 · Marc**
> **中文：** 如果它在编码领域有效，它在其他所有领域也会有效。编码是最难的基准测试。
> **原文：** If it works in coding, it works everywhere else. Coding is the hardest benchmark.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 推理突破 | reasoning breakthrough | o1/R1证明AI能做逻辑推理而不只是模式匹配 |
| 编码胜出 | coding victory | AI攻克最难的基准测试——编码，其他都是衍生品 |
| 四项突破 | four breakthroughs | LLM+推理+代理+递归自我改进=完整的智能栈 |

**本章小结**
- 推理突破回答了"AI只是模式匹配"的质疑
- 编码是最难的基准测试——攻克编码意味着其他领域都会被攻破
- 四项功能突破（LLM/推理/代理/RSI）都已实际可用

---

## 03 算力短缺导致我们用的是阉割版技术

**Marc：** 因为GPU供应极端受限，实验室被迫对模型进行量化和削减。如果算力成本降低10倍，模型性能将有质的飞跃。我们实际使用的是技术被削弱后的版本。

有一个非常有趣的现象：旧款芯片因软件优化反而更值钱。现在用三年前的英伟达推理芯片，你今天用它赚的钱比三年前更多，因为软件改进的速度快于芯片的折旧周期。谷歌正在运行一些非常老的TPU，而且非常有利可图。旧型号芯片变得更有价值而不是贬值——这在以前从未发生过。

未来五到十年内，一旦GPU制造能力和内存有了更大的建设，即使是现有技术也会变得更好。供应链基本上已经卖光了，未来几年我们都会面临长期的供应短缺。每一美元投入到GPU运行上的资金，都在立即转化为收入。

> **金句 · Marc**
> **中文：** 我们甚至还没用到真正的好东西。算力降10倍，模型性能将有质的飞跃。
> **原文：** We haven't even gotten to the good stuff yet. Cut compute costs by 10x and model performance jumps dramatically.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 逆折旧 | anti-depreciation | 旧GPU因软件进步反而更值钱，与传统折旧相反 |
| 量化削减 | quantization & pruning | 为节省算力对模型进行压缩，损失性能 |
| 供给短缺 | supply shortage | GPU/内存/数据中心全面供不应求 |

**本章小结**
- 我们用的都是阉割版模型，算力降10倍性能将质变
- 旧GPU因软件优化反而增值——与传统硬件折旧规律完全相反
- 未来几年全球算力供给持续短缺，每一美元GPU投入立即转化为收入

---

## 04 AI代理的本质是LLM+Unix Shell的架构复兴

**Marc：** 我对AI代理的看法是，它基本上是将语言模型思维与UNIX的Shell提示符思维结合了起来。

代理到底是什么？许多聪明人几十年来一直在努力定义代理，构建了许多复杂的架构。结果发现：代理就是一个语言模型，上面挂着一个Bash Shell。它就是"模型+Shell+文件系统"。状态存储在文件中，文件本身采用Markdown格式。然后利用Cron作业形成一个循环，有一个"心跳"——它会定期醒来。

除了模型之外，所有这些组件都是我们已经完全掌握和理解的。你的代理现在独立于它所运行的模型，因为你可以在底层替换不同的LLM。你还可以更换Shell、文件系统、Cron框架甚至代理框架本身。所以归根结底，你的代理就是那些文件。

代理拥有完整的自省能力——它了解自己的文件，并且可以重写这些文件。你可以告诉代理为自己添加新的功能，而它真的能做到。这赋予了你一种让我震惊的能力：你可以在不亲自动手的情况下让它自我升级。

> **金句 · Marc**
> **中文：** 代理就是LLM+Shell+文件系统+Cron。除了模型，所有组件我们都已完全掌握。
> **原文：** An agent is just LLM + Shell + filesystem + Cron. Everything except the model is fully understood technology.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| LLM+Unix Shell | LLM + Shell | Agent本质是语言模型驱动的命令行系统 |
| 自省能力 | introspection | 代理能理解并修改自己的文件和代码 |
| 自我迁移 | self-migration | 代理能把自己迁移到不同的运行环境 |
| 心跳机制 | heartbeat | Cron定时任务让代理定期"醒来"执行任务 |

**本章小结**
- Agent本质是经典Unix架构的复兴：LLM+Shell+文件系统+Cron
- 代理独立于底层模型，可以更换模型/Shell/框架而不丢失状态
- 代理拥有自省和自我升级能力——告诉它给自己加功能，它真的能做到

---

## 05 编程语言将消失，AI将直接生成二进制或权重

**Marc：** 我们一直生活在一个软件极其珍贵的世界里，你必须非常仔细地思考它。生成高质量软件很难，只有少数人能做到。我认为所有这些假设现在都被推翻了。

新世界是：高质量的软件实际上是无限可用的。如果你需要新软件来做某事，只需挥挥手就能得到。如果你不喜欢它所用的语言，只需告诉它。曾经困难重重、甚至看似难以逾越的事情，突然间变得非常容易。

未来你还会拥有编程语言吗？还是AI只会直接生成二进制文件？假设人类不再编码了，全是机器人——机器人真的需要这么多中间抽象层吗？还是它们会直接编写二进制代码？从概念上讲，它们没有理由不能同时做这两件事。

我们描述的一切，理论上人类以前也能做到，只是成本极高。人类构建的系统在很大程度上是为了弥补人类自身的局限性。如果你不再有这些局限，情况就会完全不同。并不是说不再有抽象，而是你会拥有一种不同类型的抽象。

> **金句 · Marc**
> **中文：** 高质量软件将从稀缺资源变成无限供应的廉价商品。编程语言作为中间抽象层将失去意义。
> **原文：** High-quality software goes from a scarce resource to an infinitely available cheap commodity. Programming languages as intermediate abstractions will lose meaning.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 软件无限供应 | software abundance | 高质量软件从稀缺变成按需生成 |
| 中间抽象层 | intermediate abstraction | 编程语言是人类与机器之间的桥梁，AI不需要 |
| 可解释性 | interpretability | 未来工作转向理解AI为什么这样构建代码 |

**本章小结**
- 高质量软件从稀缺资源变成无限供应的廉价商品
- 编程语言作为人类与机器的中间抽象层将失去意义
- AI可能直接生成二进制甚至模型权重，人类工作转向可解释性研究

---

## 06 管理主义与工会是AI普及的最大阻碍

**Marc：** 技术乐观派忽略了现实社会的复杂性。80亿人、机构、政府、公司、经济系统和社会系统组成的外部世界非常复杂。80亿人在地球上做出集体决策，这不是一个简单的过程。

很多AI公司的CEO都有这种想法，觉得事情理应如此，社会需要做这些显而易见的事情。但社会并没有做。答案是，首先并没有一个单一的"社会"，而是有80亿人，他们都有发言权，最终都有权投票决定如何应对变化。

美国码头工人工会只有25000人，但他们赢得了罢工，获得了不再实施更多自动化的承诺。在加利福尼亚州，成为一名理发师需要900小时的专业认证培训。整个医疗保健系统、法律行业、住房行业、教育系统都是这样。

美国K-12学校是名副其实的政府垄断。我们如何在教育中应用AI？答案是：不会。因为它是名副其实的政府垄断，永远不会改变。现有经济的运作方式有太多的惯性，它就像被固定住了。

乐观主义者和悲观主义者都过于乐观了。他们相信仅仅因为技术使某事成为可能，80亿人就会突然改变他们的行为方式。事实并非如此。

> **金句 · Marc**
> **中文：** 技术乐观派和悲观派都过于乐观——他们以为80亿人会因技术可行就突然改变行为方式。
> **原文：** Both the optimists and pessimists about AI are too optimistic — they think 8 billion people will suddenly change behavior just because the technology makes it possible.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 管理主义 | managementism | 职业经理人阶层接管组织，用规则扼杀变革 |
| 存量利益 | incumbent interests | 工会、准入制度等既得利益者阻碍自动化 |
| 人类证明 | proof of personhood | 加密验证确认真人身份，对抗机器人泛滥 |

**本章小结**
- 技术可行≠社会采纳——80亿人的集体决策过程极其缓慢
- 工会、职业准入、教育垄断等存量利益是AI普及的最大阻碍
- 乐观派和悲观派都过于乐观，现实比两者想象的都更混乱更慢

---

## 总结：80年厚积薄发的爆发期，但社会采纳远比想象中慢

| 维度 | 要点 |
|------|------|
| 技术节奏 | 80年研究积累在短时间内集中释放，四项功能突破都已可用 |
| 算力现实 | 我们用的是阉割版模型，旧GPU因软件优化反而增值 |
| 架构突破 | Agent本质是LLM+Unix Shell的经典架构复兴 |
| 软件未来 | 高质量软件从稀缺变成无限供应，编程语言将失去意义 |
| 社会阻碍 | 管理主义和存量利益是AI普及的最大障碍 |
| 认知框架 | 技术乐观派和悲观派都过于乐观，现实更混乱更慢 |

> **金句 · Marc（封底）**
> **中文：** 如果我只有18岁，这绝对是我会投入全部时间去做的事情。这是一个令人难以置信的概念性突破。
> **原文：** If I were only 18, this is absolutely what I would dedicate all my time to. This is an incredible conceptual breakthrough.

---

## 附录

**章节时间戳**
- 05:40 AI行业处于80年的一夜成功爆发期
- 12:15 推理与编码突破是AI进入现实世界的转折点
- 21:30 算力短缺导致我们使用的是阉割版技术
- 42:10 AI代理的本质是LLM+Unix Shell架构复兴
- 55:20 编程语言将消失
- 72:45 现实世界的管理主义与工会是AI普及的最大阻碍

**Ingest 信息**
- column_source: Recastory/workspace/bilibili-retranscribe/BV1qEdaBdEYi/ingest/column_article.md
- asr_status: column_s_tier

**相关阅读**
- [[a16z前合伙人-关于AI最理性简介]] — 另一个a16z视角：AI堪比互联网但非工业革命
- [[Every CEO-全员AI后员工数翻3倍]] — AI时代的组织变革与职业影响
- [[Speechify CEO-从100位CEO学到经验]] — 增长套利与AI时代的创业哲学
