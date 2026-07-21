---
title: "C++之父-AI代码的局限性"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1G2Gn61E9b/"
description: "C++创造者Bjarne Stroustrup：贝尔实验室的无政府主义如何催生创新；零开销抽象甚至负开销抽象；99%计算机是嵌入式系统必须用静态类型；AI生成代码无法胜任安全关键型任务。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/C++之父-AI代码的局限性.md"
source_sha256: "387b28f87efac3ce3a64f54d555c8e3b0f3fcd3b6dea3afb44ce8128a79ed10d"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1G2Gn61E9b/"
column_url: "https://www.bilibili.com/read/cv49576101/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1G2Gn61E9b/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1G2Gn61E9b/ingest"
duration: "~50 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Ryan Peterman"
guest_name: "Bjarne Stroustrup"
guest_title: "C++ 创造者"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Easonlee的AI笔记]]"
concepts:
  - id: zero_overhead_abstraction
    zh: 零开销抽象
    en: zero-overhead abstraction
    one_line: 抽象被编译器完全消除，甚至能比手写代码更快
  - id: raii
    zh: 资源获取即初始化
    en: resource acquisition is initialization (RAII)
    one_line: 用对象生命周期自动管理资源，构造时获取析构时释放
  - id: static_typing
    zh: 静态类型
    en: static typing
    one_line: 编译期检查类型错误，避免运行时崩溃
  - id: ai_code_limitation
    zh: AI代码的局限性
    en: limitations of AI-generated code
    one_line: AI模仿旧代码中的旧Bug，无法验证局部更改的影响
  - id: consensus_standard
    zh: 标准委员会共识机制
    en: ISO committee consensus
    one_line: 500多名成员通过共识驱动，确保语言不被单一公司控制
---

# AI写的代码在模仿旧Bug，安全关键型任务还是得靠人

> 对谈：Ryan Peterman × Bjarne Stroustrup（C++ 创造者）| 来源：Ryan Peterman Podcast | 2026

---

## 开场：为什么现在聊这个

Bjarne Stroustrup 在贝尔实验室创造了 C++，一个改变了整个软件行业的语言。但这位70多岁的老人对AI生成代码持谨慎态度。他认为LLM的本质是模仿带有旧Bug的旧代码，对于需要严苛验证的20%核心系统代码，人类利用高级抽象进行的精确工程设计仍不可替代。

这期的核心矛盾是：所有人都在用AI写代码，但世界上99%的计算机是嵌入式系统——内存受限、不容崩溃。AI生成的代码臃肿、难以验证，而且一旦你改变了提示词，代码就变了，你又得重新检查一遍。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 零开销抽象 | zero-overhead abstraction | 用高级抽象写代码，但编译后性能跟手写底层代码一样好 |
| RAII | resource acquisition is initialization | 对象创建时获取资源、销毁时释放，自动管理内存和文件句柄等 |
| 静态类型 | static typing | 编译器在运行前就检查类型错误，不让Bug进入生产环境 |
| 泛型编程 | generic programming | 写一次代码适用于多种数据类型 |
| 模板 | template | C++实现泛型编程的机制，编译时生成特定类型的代码 |
| 核心准则 | Core Guidelines | Bjarne推动的C++安全编程实践规范 |
| 配置文件 | Profiles | 编译器级别的安全检查规则，强制执行编码准则 |

---

## 01 C++诞生于"世界上没有一种语言能满足我的需求"

**Ryan：** C++ 的起源故事是什么？

**Bjarne：** 我在贝尔实验室找到了一份工作。我意识到我必须做一些重要的事情，否则我就不属于这里。我决定构建一个分布式Unix，因为我意识到计算机性能越来越强，网络也越来越好。

但我首先意识到的是，世界上没有一种语言能满足我的需求。它需要两样东西：首先是对硬件的底层访问能力——内存管理器、进程实现、网络驱动程序等；其次是高级抽象能力——计算机间的通信协议等。有很多语言可以做到其中之一，但没有一种可以同时兼顾。

对于底层开发，最明显的选择是C语言，因为Dennis Ritchie和Brian Kernighan就在隔壁。至于高级语言，虽然有很多，但它们都太慢了，而且无法操作硬件。但我学会了使用Simula。我认识发明了面向对象编程的人，所以我决定必须将这两者融合起来。

实际的做法是，将Simula的类概念引入C语言，使其运行速度更快，并可用于系统编程。同时，我使类型系统更加规范，让用户定义的类型与内置类型以相同的方式处理。这基本上就是C和Simula都做不到的事情的开端。

> **金句 · Bjarne**
> **中文：** 世界上没有一种语言能满足我的需求——既要有底层硬件控制，又要有高级抽象。
> **原文：** There was no language in the world that met my needs — I needed both low-level hardware control and high-level abstractions.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Simula | Simula | 第一个支持面向对象编程的语言，1960年代在挪威开发 |
| 泛型编程 | generic programming | 写一份代码，编译器自动适配多种数据类型 |
| 重载 | overloading | 同一个函数名可以接受不同类型的参数 |

**本章小结**
- C++诞生于一个真实问题：需要在同一种语言中同时拥有底层和高级能力
- 将Simula的类引入C语言，同时强化类型系统，实现了两者都做不到的事情
- 泛型编程和重载是自然演化出来的需求，不是预先设计的

---

## 02 贝尔实验室的无政府主义是创新的温床

**Ryan：** 贝尔实验室在当时以什么闻名？

**Bjarne：** 如果你想进行大规模的世界级实践工程，贝尔实验室就是首选之地。关于如何进行良好研究有两种哲学。一种是精心设计、管理层仔细选择的项目。另一种是，你雇佣你能找到的最优秀的人才，然后不告诉他们该做什么。

我的工作被描述为：在一年内做一些有趣的事情，告诉我们你做了什么，如果我们喜欢，我们会延长合同。你写一页纸告诉我们，字体要大于九磅，因为如果你不能相当简要地说明你做了什么，你可能就没有做足够有趣的事情。这非常不寻常。

平均而言，这种相当无政府主义的组织比那些组织良好的组织做得更好。你听说过的大多数贝尔实验室的成果都出自那里。计算机科学的人倾向于和做其他事情的人交流。我记得当我做模拟的时候，我正在帮助某人构建一个用于网络方面的模拟器。早期的C++很多都与处理网络过载时会发生什么有关。

我和Dennis Ritchie每周共进午餐，持续了大约16年。他从未说过任何关于C++的粗鲁或负面言论。他担心重载，因为你必须查看函数的声明才能知道调用的含义。但这是一种非常合理的思考方式，它只是碰巧有效。

> **金句 · Bjarne**
> **中文：** 雇佣最优秀的人才，然后不告诉他们该做什么——这种无政府主义比精心组织做得更好。
> **原文：** Hire the best people you can find, then don't tell them what to do — this anarchy works better than organized management.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 穿梭外交 | shuttle diplomacy | 在两个僵持的派系之间来回沟通促成妥协 |
| 自举 | bootstrapping | 用语言的早期版本来编译该语言的更新版本 |
| CCD | charge-coupled device | 电荷耦合器件，所有数码相机的核心传感器 |

**本章小结**
- 贝尔实验室的"雇佣最优秀的人，不告诉他们做什么"模式催生了Unix、C语言等划时代成果
- 跨学科交流（计算机科学家跟硬件、网络、物理学家聊天）是创新的关键
- Dennis Ritchie的帮助（如const的设计）直接影响了C++的演进

---

## 03 静态类型是99%嵌入式系统的唯一选择

**Ryan：** 你为什么选择静态类型？动态语言不是更灵活吗？

**Bjarne：** 这取决于我想解决的问题。当你在Smalltalk这样的语言中遇到运行时错误时，你会进入调试器，这在开发时很有意义。但如果是一个程序员不在场的情况，比如电话交换机发现了运行时错误，那报错就没有任何意义了。

我认为99%的计算机都是嵌入式系统，它们往往内存受限。我希望程序能适应小内存——120k、250k或1MB。你可以制造一台相机，它可能有几MB内存，但如果你放入大量内存，它会变得更大、成本更高、电池耗尽更快。手机和相机等设备仍然受内存限制。静态类型语言在针对内存消耗优化方面表现更好。

纯Python的运行速度比纯C++慢70倍左右。它之所以可行，是因为许多关键的Python库都是用C或C++编写的。在动态语言中，你需要更多的单元测试，因为编译器不会帮你做这些。如果你想让事情得到保证——电话交换机、汽车、飞机不能崩溃——你需要这种确定性。

**Ryan：** C++有一个臭名昭著的内存安全问题。

**Bjarne：** 我受够了那个话题。有人对缓冲区溢出和黑客攻击等明显问题进行了研究。在几乎所有这些案例中，当人们编写真正的C++风格代码时——这类问题中超过90%是由于那些不编写现代C++的人造成的。他们使用原始指针来传递东西，而不指定元素的数量。没有胖指针，没有span。C++中其实有这些，你可以使用它们。

从根本上说，理论上这个问题多年前就解决了，只是人们还在沿用旧的做法。这也是我致力于编码指南、强制配置文件和教育的原因之一。

> **金句 · Bjarne**
> **中文：** 99%的计算机是嵌入式系统，内存受限、不容崩溃——静态类型是唯一选择。
> **原文：** 99% of computers are embedded systems, memory-constrained and crash-intolerant — static typing is the only option.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 嵌入式系统 | embedded system | 嵌入在设备中的专用计算机，如手机、汽车、相机 |
| 胖指针 | fat pointer | 指针附带指向的元素数量，防止缓冲区溢出 |
| span | std::span | C++20引入的非拥有视图，安全地引用连续内存区域 |
| 核心准则 | Core Guidelines | Bjarne推动的C++安全编码实践规范 |

**本章小结**
- 99%的计算机是嵌入式系统，内存受限且不容崩溃，静态类型是唯一选择
- C++内存安全问题90%源于开发者不使用现代特性，不是语言本身的问题
- span和核心准则是解决方案，但需要编译器强制执行而非依赖开发者自觉

---

## 04 标准委员会共识机制：慢但必要

**Ryan：** C++标准委员会是如何运作的？500多人怎么达成共识？

**Bjarne：** 我从未拥有过完全的控制权。有一天，IBM和惠普的人来到我的办公室说："Bjarne，你愿意帮助我们根据ISO规则标准化C++吗？"我说不。他们说："我们的组织不能使用未经标准化的语言，也不能使用由竞争对手拥有的语言。我们信任你，但我们不信任你的雇主。"

我后来的老板Sandy Fraser告诉我我来得不是时候，他们没有任何职位。第二天我给一个开发团队做了一次演讲。然后他们改变了主意。面试过程就是和一些人交谈——我记得我曾和Dennis Ritchie进行过一次长时间的交谈。并没有所谓的标准面试流程。

标准委员会有527名成员。我们通过共识来工作，因为如果没有共识，就会出现方言。我们不希望一个特性以60比40甚至52比48的微弱优势被采纳。虽然过程痛苦乏味，但结果很好。

一个有趣的例子是"穿梭外交"——IBM推广PowerPC架构，英特尔在做x86，他们对底层硬件有不同的模型。他们在那个大房间的不同角落僵持了好几天。我走到英特尔代表那里问："问题是什么？"然后我再走下去向另一方解释。我花了几个小时在房间两头跑，最终我们达成了协议。

> **金句 · Bjarne**
> **中文：** 我们不需要一致同意，我们需要绝大多数——通常90%支持率，我们通常能做到80%。
> **原文：** We don't need unanimity, we need a supermajority — ideally 90% support, and we usually get 80%.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| ISO标准 | ISO standard | 国际标准化组织制定的技术规范，确保不同实现兼容 |
| 向后兼容 | backward compatibility | 新版本能运行旧版本写的代码，不破坏现有系统 |
| auto关键字 | auto keyword | C++11引入的类型推导，编译器自动推断变量类型 |
| constexpr | constexpr | 在编译时就能求值的函数或变量，提升性能 |

**本章小结**
- 标准化确保C++不被任何单一公司控制，这是它长盛不衰的基石
- 共识机制虽然慢，但防止了方言分裂和不兼容的实现
- 穿梭外交的例子说明：技术分歧有时需要翻译者和提问者来打破僵局

---

## 05 AI生成代码：模仿旧Bug，无法验证局部更改

**Ryan：** 如果越来越多的代码由模型编写，编程语言设计会改变吗？

**Bjarne：** 我认为在我最感兴趣的领域，代码仍将由人类编写。我所看到的AI尝试在这个领域生成代码的例子都没有成功。它们会产生更多的Bug，更多的安全漏洞。它们生成的代码臃肿，这又会降低性能。

此外，我思考的很多事情都涉及到监管和验证。你必须能够验证你所做的更改。但当你做出更改时，AI工具生成的代码也会随之改变。即使你对提示词做了一点点改动，很多代码也会随之改变，你现在又得重新检查一遍。所有生成的代码都比人类编写的代码量更多。当人类做出改变时，通常是局部性的，你可以寻找这种局部性改变的影响。但如果由AI编写代码，你实际上不知道它在哪里发生了变化。

LLM在输入训练数据时，必须用旧代码进行训练。而我的工作是确保人们编写新事物，使用比旧代码更好的新技术。所以我发现基于LLM的代码正在模仿旧代码，并且再次出现旧的性能问题和旧的Bug。

另一个问题是，他们想淘汰初级程序员，因为初级程序员很多。但如果你那样做，你从哪里获得未来的高级程序员呢？

> **金句 · Bjarne**
> **中文：** AI生成的代码在模仿旧代码中的旧Bug——它不会使用你辛苦发明的新技术。
> **原文：** AI-generated code imitates old code with old bugs — it doesn't use the new techniques you worked hard to invent.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 局部性 | locality | 人类改代码通常是小范围修改，容易验证影响范围 |
| 安全关键型 | safety-critical | 出错会危及生命的系统，如飞机、汽车、核电站 |
| 性能关键型 | performance-critical | 对速度和内存有严苛要求的系统 |
| 初级程序员 | junior developer | 刚入行的程序员，是未来高级程序员的储备 |

**本章小结**
- AI代码的核心问题不是"写得不好"，而是"改了之后你不知道哪里变了"
- 改提示词就导致代码全变，验证工作量反而增加
- 淘汰初级程序员会导致未来高级程序员断层，这是系统性风险

---

## 06 抽象被编译掉：零开销甚至负开销

**Ryan：** 更多的抽象不会让你付出代价吗？

**Bjarne：** 事实并非如此。我们可以实现负开销抽象。抽象被编译掉了。这就是为什么我谈论"零开销抽象"，人们开始因此批评我，因为那低估了C++编译器的能力。

如果你非常聪明，并且拥有无限的时间，你可以做得更好。但总的来说，我们不再像优化器那样聪明，而且我们没有无限的时间。我去年给Slack做了一次演讲，标题是"不要耍小聪明"。C++对于你98%以上的代码来说已经足够好了。

问题是，如今巧妙的优化往往是依赖于特定机器的。如果你换了一台新电脑，或者编译器有了新版本，你原本巧妙的代码性能反而可能会变差。我曾和一个朋友写过一篇关于流体动力学的论文。我们抛弃了那些巧妙的东西，将代码量减少到原来的80%左右，反而获得了20%的性能改进。

高德纳说不要过早优化，但他也指出，2%到3%的关键部分才是你应该优化的地方。首先使用高级工具构建东西，看看它是否足够好；如果不够好，你必须进行计时测试，不要靠猜测，要找出时间花在哪里。

> **金句 · Bjarne**
> **中文：** 抽象被编译掉了——我们甚至可以实现负开销抽象。
> **原文：** Abstractions get compiled away — we can even achieve negative-overhead abstractions.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 负开销抽象 | negative-overhead abstraction | 高级抽象代码编译后比手写底层代码更快 |
| 缓存友好 | cache-friendly | 代码访问内存的方式能让CPU缓存发挥作用 |
| 过早优化 | premature optimization | 在没测量前就优化代码，往往浪费时间还可能变慢 |

**本章小结**
- 1990年代的"巧妙优化"在现代硬件上往往性能更差，因为架构变了
- 代码量减少20%反而性能提升20%——简洁代码给编译器更多优化空间
- 先用高级抽象写，不够快再针对性优化2-3%的关键路径

---

## 总结：认真的人用高级抽象写代码，AI还差得远

| 维度 | 要点 |
|------|------|
| 语言哲学 | C++是给认真程序员的工具，不是让人人都能编程 |
| 安全方案 | 90%内存安全问题源于不使用现代特性，配置文件可强制执行 |
| AI局限 | AI代码模仿旧Bug，改变提示词就全变，无法验证局部影响 |
| 人才断层 | 淘汰初级程序员会导致未来高级程序员断层 |
| 抽象性能 | 零开销甚至负开销抽象，简洁代码给编译器更多优化空间 |
| 标准化 | 500人共识机制虽慢，但确保语言不被单一公司控制 |

> **金句 · Bjarne（封底）**
> **中文：** 如果一个人只懂一门语言，就不应该称自己为专业人士。
> **原文：** If a person only knows one language, they should not call themselves a professional.

---

## 附录

**章节时间戳**
- 00:00 开场
- 01:10 C++诞生于高低兼顾语言的匮乏
- 11:45 贝尔实验室的无政府主义文化
- 33:20 静态类型与嵌入式系统
- 41:15 现代C++的安全问题
- 47:50 标准委员会共识机制
- 61:30 AI生成代码的局限性

**Ingest 信息**
- column_source: Recastory/workspace/bilibili-retranscribe/BV1G2Gn61E9b/ingest/column_article.md
- asr_status: asr_ready

**相关阅读**
- [[MOC - Agent Theory and Design]] — 入口
- [[MOC - Harness Engineering]] — AI编码实践
