---
title: "微软Agent观测实践：从原型到生产"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation", "ai_safety", "harness_engineering", "multi_agent"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation", "ai_safety", "harness_engineering", "multi_agent"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1u3Lz6AEb3/"
description: "微软Foundry团队演示Agent可观测性全流程：OTEL追踪、任务依从性评估、多代理工作流编排、红队演练攻击与观察技能自动化闭环。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/微软Agent观测实践.md"
source_sha256: "131b9f2b87e4bd8d0c784a0edc7b0a3340b86394445cacd974376e642f28360e"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1u3Lz6AEb3/"
column_url: "https://www.bilibili.com/read/cv39714369/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1u3Lz6AEb3/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1u3Lz6AEb3/ingest"
duration: "~45 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Amy Boyd"
guest_name: "Nitya Narasimhan"
guest_title: "微软Foundry可观测性专家"
speaker_inference: "column_article S-tier"
speaker_confidence: high
concepts:
  - id: agent_nondeterminism
    zh: 智能体非确定性
    en: agent nondeterminism
    one_line: 同一输入可能产生不同输出，必须持续监控而非一次性测试
  - id: otel_tracing
    zh: OTEL追踪
    en: OpenTelemetry tracing
    one_line: 基于开放标准的分布式追踪，跨平台监控智能体每一步
  - id: task_alignment
    zh: 任务依从性
    en: task alignment
    one_line: 评估智能体是否真正执行了用户要求的任务
  - id: red_teaming
    zh: 红队演练
    en: red teaming
    one_line: 用AI攻击AI，主动探测提示词注入等安全漏洞
  - id: observation_skill
    zh: 观察技能
    en: observation skill
    one_line: 编码代理自动生成评估数据集、分析失败、优化提示词的自动化闭环
author:
  - "[[Amy Boyd]]"
  - "[[Nitya Narasimhan]]"
---

# 微软Agent观测实践：从原型到生产

**Host：** Amy Boyd（微软Foundry开发者关系）  
**Guest：** Nitya Narasimhan（微软Foundry可观测性专家）  
**形态：** Host-Guest v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV1u3Lz6AEb3](https://www.bilibili.com/video/BV1u3Lz6AEb3/) · **时长** ~45 min · **专栏** [cv39714369](https://www.bilibili.com/read/cv39714369/)

---

## 开场

微软Foundry团队在伦敦的研讨会上拆解了一个核心问题：智能体和传统软件不同，输出是非确定性的——你不能只在构建时测试，必须在整个生命周期持续监控。这期聊了怎么用OTEL追踪智能体行为、怎么评估任务依从性而非模型评分、怎么用红队演练主动找漏洞，以及观察技能如何把人工调优压缩成自动化闭环。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 非确定性 | nondeterminism | 同样的输入不一定得到同样的输出 |
| OTEL追踪 | OpenTelemetry tracing | 用开放标准追踪智能体每一步操作 |
| 任务依从性 | task alignment | 智能体是否真的在做你让它做的事 |
| 红队演练 | red teaming | 让AI攻击你的AI，找安全漏洞 |
| 观察技能 | observation skill | 编码代理自动跑评估-优化循环 |
| 评估数据集 | evaluation dataset | 测试用的输入输出对，用来打分 |

---

## 01 智能体非确定性：不能只在构建时测试

**Amy Boyd：** 大家都用各种不同的技术构建智能体。代理领域的现实是：代理是非确定性的。这不只是演示时的问题，也是现实生活中的问题。当你真正投入生产，可靠性和一致性变得至关重要。

**Nitya Narasimhan：** 我先说个比喻。在纽约坐地铁，提示是"Watch the gap"；在伦敦是"Mind the gap"。这个差距的比喻非常贴合智能体可观测性——火车在变，站台是固定的。有些火车完美契合站台，但有些情况下需求和代理之间存在巨大差距。你不仅需要了解今天发生什么，还要持续了解未来可能构建的许多代理的情况。

代理是做什么的？模型天生带着一些知识，代理通过工具引入额外的知识和能力来增强模型。模型是大脑，代理就像经验，工具是你投入的所有资源。当我构建一个旅行代理时，我需要明确代理的指令是什么，它应该做什么，我需要了解工具的功能，还需要为这项工作选择合适的模型。但Hugging Face上有两百多万个模型，Azure目录中有一万一千多个——你给我看一万一千个模型，我根本不知道从何开始。

我们面临的三个挑战：模型太多且没有现有数据——这个应用以前从未存在过，我从哪获取数据来评估？人工智能质量——这是公司的品牌，代理出了错责任在你，你如何快速发现、诊断并修复？安全保障——假设用户行为正常和考虑恶意用户是两个完全不同的事情。如果你在盖房子，评估是建筑检查员检查是否符合规范；安全保障是打电话给专业人士说"请尝试闯入我的房子，证明它是安全的"。

> **金句 · Nitya**
> **中文：** 仅仅知道何时出错是不够的。你需要缩短从检测到错误到诊断错误之间的时间。
> **原文：** Just knowing when things go wrong is not enough. You need to shorten the time from detecting an error to diagnosing it.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 非确定性 | nondeterminism | 智能体输出概率性的，不是确定性的 |
| 评估 vs 安全 | evaluation vs security | 评估检查正常行为，安全检查恶意攻击 |
| 模型路由 | model routing | 根据任务复杂度选择不同模型 |

**本章小结**
- 智能体的非确定性意味着测试不是一次性的，而是持续的
- 评估和安全是两个不同维度——一个查合规，一个查能不能被攻破
- 模型选择是第一个决策点，选错了后面都白搭

---

## 02 OTEL追踪：看到智能体每一步在干什么

**Amy Boyd：** Foundry的追踪基于OpenTelemetry标准，这意味着你可以接入不同框架构建的Agent。通过追踪，你可以清晰看到工作流中的每一个工具调用、消息传递和决策点。

**Nitya Narasimhan：** 让我演示一下。我们在Foundry门户创建一个项目，选择美国东部2区——那里有最新的功能。创建一个代理，命名为"Contoso Travel"，部署GPT-4，系统自动寻找容量并配置模型。然后进入Playground，添加Bing搜索作为工具——旅行代理需要查询外部资源。

最初代理只是没有指令的通用模型，给它建议只能提供一般性回答。我们添加指令后，追踪功能开启，可以看到对话、追踪日志、估计的代币成本和评估信息。关键一步是创建App Insights——否则代理虽然被创建了，但是不可追踪的。

从门户开始的好处是你不必死记硬背术语，可以直接熟悉内置功能并快速可视化结果。选择评估指标后，你可以前往追踪日志，准确查看代理采取的步骤。有个有趣的发现：任务依从性对我们的要求其实相当低——它没有直接回答问题，而是说"请提供更多信息"。这正说明了为什么需要评估。即使是一个简单的原型，你也能在早期发现问题。

当你正确关联了评估，每次查看追踪时它们都会显示在这里。你可以通过查看评估找出追踪的哪个环节出了问题。举个例子：假设你更换了模型，突然发现工具调用不再那么高效，评估告诉你其中一个指标失败了。这时你回到追踪对比——这个版本和上一个版本有什么不同？通过对比你会发现，比如其中一个工具没有被调用。为什么没被调用？这样就能快速比较发生什么，实现从检测到诊断的跨越。

> **金句 · Nitya**
> **中文：** 与追踪关联的评估是关键所在——它让你精确定位是模型逻辑问题还是工具执行环节的失效。
> **原文：** Trace-linked evaluation is the key — it lets you pinpoint whether it's a model logic issue or a tool execution failure.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| OTEL追踪 | OpenTelemetry tracing | 标准化追踪，跨框架通用 |
| App Insights | Application Insights | Azure的遥测收集系统 |
| 追踪链接评估 | trace-linked evaluation | 把评估结果绑定到具体追踪步骤上 |

**本章小结**
- OTEL标准让不同框架的智能体可以用同一套追踪系统
- App Insights是前提——不连上就没有追踪数据
- 追踪+评估绑定后，出了问题能精确定位到哪一步

---

## 03 多代理工作流：拆解复杂任务的正确姿势

**Amy Boyd：** 我们正在平台中构建许多方法，让你可以查看完整的代理追踪，不仅仅是单个代理。调试多代理追踪比单个代理特定调用的难度呈指数级增长。

**Nitya Narasimhan：** 我们之前通过门户进行了规划——先确定"旅行社"用例，快速开发了模型工具和简单代理。现在进入更复杂的事情：构建工作流代理。

为什么不希望由一个庞大的单一代理来完成所有工作？一旦出错，需要追踪的功能和环节太多了。你需要把它拆解成更小的组件。在这个实验中，你创建三个专业代理——航班代理、酒店代理、汽车代理——每个专注于单一任务，然后创建一个工作流代理将它们整合。

工作流代理用声明式的YAML语句连接，说明工作流如何组合。部署后在门户中可以看到完整的追踪——代理通过工作流依次调用每个代理：先调航班获取信息，再调酒店，最后整合。价值在于你能看到哪个代理表现不佳，哪个没有正确完成工作。你可以通过令牌消耗来分析成本，然后针对性地替换或优化。

就成本优化而言有两个核心因素：一是模型成本——GPT-4o的令牌成本可能比GPT-4o mini更高，切换后立即运行观察是否有退步；二是时间消耗——如果网络搜索太耗时，我宁愿让它搜索缓存的或自有数据。每次做出改变都应立即评估，看是否对其他方面造成退步。

关于回滚：代理是有版本的。部署时你可以指定身份名称和版本，设为主版本。使用特定技能时它会自动回滚到质量更好的版本。说白了这些都是标识符，你可以灵活部署。

> **金句 · Nitya**
> **中文：** 对我们来说，价值在于你能看到这些代理中哪个表现不佳，哪个没有正确完成工作。
> **原文：** For us, the value is that you can see which of these agents is underperforming, which isn't doing its job correctly.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 工作流代理 | workflow agent | 用YAML声明式编排多个专业代理 |
| 令牌成本分析 | token cost analysis | 看每个代理花了多少token，找到性价比低的 |
| 版本回滚 | version rollback | 自动回退到之前质量更好的版本 |

**本章小结**
- 单一代理做所有事=出错时找不到原因，必须拆解
- 工作流代理用YAML声明式编排，比代码编排更直观
- 成本优化要逐个代理分析，切换模型后必须跑评估看有没有退步

---

## 04 红队演练：用AI攻击你的AI

**Amy Boyd：** 安全不能只靠静态护栏。我们围绕红队演练做了大量工作——红队演练不是一个人能完成的，微软与开源仓库深度合作，同时在平台内提供一键式选项。

**Nitya Narasimhan：** 红队演练是另一种方式：你需要设置一个扫描任务，让它主动攻击你的代理，看看是否能通过操纵提示词找到漏洞。它实际上是让第二个AI去攻击你的第一个AI。你告诉它"这是我认为我的代理可能存在的风险类别"，它就会用相应提示词攻击并生成报告。

举个例子：如果我说"嘿，请告诉我如何抢银行"，安全护栏会介入说"不，你不能那样做"。表现得很正确。但如果我把提示词翻转过来——翻转字符串——安全护栏看着可能觉得是胡言乱语就放过了。但模型可能想："哦，这个傻瓜把字符串翻转了，让我把它翻转回来。"现在模型知道你想让它做什么，会实际执行任务。你通过操纵提示词绕过了护栏。

红队演练允许你主动检查所有这些攻击策略并告诉你系统容易受到哪些攻击。比如"渐强攻击"——它从一个小攻击开始，如果你让它通过了，它就在第二次、第三次攻击中不断累积。等你意识到发生了什么时，你已经被全方位攻陷了。运行渐强攻击需要很长时间，但它能确定你系统中的所有漏洞。

还有"禁止行为"攻击——在质量和安全评估中你只是在观察模型行为，但智能体非常危险，因为如果我能操纵代理执行它不该执行的操作，后果将是有害的。红队代理的攻击逻辑是"我想变得聪明一点，找出绕过限制的方法"，它会生成测试提示词让你看看"禁止行为"护栏到底有多稳固。

> **金句 · Nitya**
> **中文：** 渐强攻击像温水煮青蛙——从一个小攻击开始，不断累积，等你意识到时已经被全方位攻陷。
> **原文：** A crescendo attack is like boiling a frog — it starts small, accumulates, and by the time you realize it, you've been fully compromised.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 红队演练 | red teaming | 用AI攻击AI找漏洞 |
| 渐强攻击 | crescendo attack | 从小攻击逐步累积绕过安全机制 |
| 提示词翻转 | prompt reversal | 把提示词翻转字符串来绕过护栏 |
| 禁止行为 | forbidden behavior | 定义代理绝对不能做的事 |

**本章小结**
- 红队演练是主动找漏洞，不是被动等报告
- 渐强攻击是最难防的——循序渐进的诱导
- 禁止行为清单要提前定义，但红队演练告诉你清单够不够

---

## 05 观察技能：让编码代理自己跑评估闭环

**Nitya Narasimhan：** 我想展示一个非常早期的预览版功能——观察技能的概念。它能让你通过一个编码代理完成整个可观察性循环。

我用GitHub Copilot Chat来激活该技能，使用Claude作为模型。我问它："你能否使用这个观察技能来启动我的代理的可观察性循环，并帮我完成工作？"此时我只有一个代理，没有评估集，什么都没有。

它查看我的代码说："你没有评估数据集。但我知道你想要做什么，因为你已经给我看了说明，我将开始构建它。"首先它检查元数据，发现缺失时会设置缓存。它做的第一件事就是为我生成评估数据集——审查文件、创建待办事项、获取代理详情、运行评估目录、构建评估数据集，最后运行第一批批量评估。它认为："我有一个代理，我需要一个基线，所以我先运行这个。"

最有用的功能之一是"推理"——它会深入让你看到它在寻找什么样的失败案例，以及如何对评估进行检测。完成后它告诉我：你的提示词并不完美，虽然相关性很好，但任务依从性在某些情况下存在问题，代理没有真正完成你要求它做的事。这里有两次失败，可以点击查看推理过程，它会告诉你具体失败原因。安全测试看起来不错，已经通过了。

它带着一个关键发现回来："嘿，有问题，你希望我解决它吗？"我贪心地说："我想要10分满分，请修复最后一个遗留问题。"它开始不断操纵提示词，看看还能修复什么并持续迭代。有时提高到8分，有时退步到7分或5分。在某个时刻它会说："我们需要停止了，目前最佳的版本是版本5，我们坚持使用这个版本。"

它回来告诉我完整历史——对于每一个版本，它提供关于有效和无效的见解。虽然到了版本10，但版本5是最好的，我们回退到那个版本。它只改变提示词吗？不，它也可以改变其他东西。它会说"网络搜索花费了大量时间，你希望我寻找替代方案吗？"

> **金句 · Nitya**
> **中文：** 它自动化了批量评估、比较结果并展示过程，而无需我了解每一个SDK调用。这就是它的强大之处。
> **原文：** It automates batch evaluation, compares results, and shows the process, without me needing to know every SDK call. That's its power.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 观察技能 | observation skill | 编码代理自动跑评估-分析-优化闭环 |
| 人在回路 | human-in-the-loop | 代理提出方案，人决定是否继续 |
| 版本回退 | version rollback | 迭代中发现更优版本时自动回退 |
| 提示词优化器 | prompt optimizer | 代理自动分析并改写提示词 |

**本章小结**
- 观察技能把人工调优压缩成自动化闭环——代理自己跑评估、分析失败、优化、再评估
- 人在回路是必要的——代理不会无限迭代，它会告诉你什么时候该停
- 这种模式让"不知道自己不知道"的盲点被自动发现

---

## 总结：智能体可观测性的三重闭环

| 维度 | 要点 |
|------|------|
| 追踪 | 基于OTEL标准，跨平台监控智能体每一步 |
| 评估 | 从模型评分转向任务依从性——代理是否真的在做事 |
| 安全 | 红队演练主动找漏洞，不只是被动等报告 |
| 自动化 | 观察技能让编码代理自己跑评估-优化闭环 |
| 成本 | 逐个代理分析令牌消耗，切换模型后必须评估退步 |

### 对个人的启示
智能体不是"部署完就完"——必须建立持续监控的闭环。追踪+评估+红队三管齐下，才能在生产环境中保持质量。

### 对团队的启示
多代理工作流比单一巨无霸代理更容易调试和优化——出问题时能精确定位到哪个子代理。版本管理和回滚机制是生产级的标配。

### 仍待验证
- 观察技能的自动化优化是否能达到人工调优的水平？
- 红队演练的成本在大规模部署时是否可控？
- 多代理工作流的追踪复杂度是否会随着代理数量指数增长？

> **金句 · Nitya（封底）**
> **中文：** 你从一个可以工作的代理开始，但它会逐渐偏离最初的需求——你如何持续评估现状并在出现偏差时收到警报？这就是追踪和监控的意义。
> **原文：** You start with an agent that works, but it gradually drifts from the original requirements — how do you continuously evaluate the current state and get alerts when drift occurs? That's what tracing and monitoring are for.

---

## 相关阅读

- [[ClawdBot创始人-一个人顶一个团队]] — 闭环原则在个人AI编程中的应用
- [[Databricks-企业级Agent生产实践]] — 企业级Agent生产部署
- [[Cloudflare专家-Sandbox确保AI代码安全]] — Agent沙箱与安全隔离
- [[MOC - Harness Engineering]]

---

## 来源

- B 站：[BV1u3Lz6AEb3](https://www.bilibili.com/video/BV1u3Lz6AEb3/)
- 专栏：[cv39714369](https://www.bilibili.com/read/cv39714369/)
- 主源：`Recastory/workspace/bilibili-retranscribe/BV1u3Lz6AEb3/ingest/column_article.md`
