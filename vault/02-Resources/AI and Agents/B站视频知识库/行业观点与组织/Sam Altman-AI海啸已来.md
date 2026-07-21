---
title: "Sam Altman：AI海啸已来，社会如何准备"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_safety", "ai_philosophy", "ai_career", "openai"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_safety", "ai_philosophy", "ai_career", "openai", "superintelligence", "economic_transition"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1WPo4B9EyZ/"
description: "OpenAI核心团队集体亮相：新冠时刻类比、韧性分层防御、基础设施民主化、经济范式转移、2028自动化研究员拐点"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Sam Altman-AI海啸已来.md"
source_sha256: "5bd0a3e6790ff7fa96cb5b9f0ccd2b09b810eb027f227b38a51b48612c498e44"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1WPo4B9EyZ/"
column_url: "https://www.bilibili.com/read/cv48074413/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1WPo4B9EyZ/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1WPo4B9EyZ/ingest"
duration: "~35 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Chris Nicholson"
guest_name: "Sam Altman"
guest_title: "CEO of OpenAI"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Sam Altman]]"
concepts:
  - id: covid_moment
    zh: 新冠时刻类比
    en: COVID Moment Analogy
    one_line: 社会对AI能力跨越的反应滞后，类似2020年初对疫情爆发的感知前夜
  - id: layered_resilience
    zh: 韧性分层防御
    en: Layered Resilience
    one_line: AI安全不应只靠公司自律，而应建立社会级分层防御体系
  - id: infrastructure_democratization
    zh: 基础设施民主化
    en: Infrastructure Democratization
    one_line: 通过大规模建设计算基础设施，使智能成本降低到"过剩"，防止权力集中
  - id: tax_base_modernization
    zh: 税基现代化
    en: Tax Base Modernization
    one_line: AI完成大部分智力劳动后，需要新的征税方式和福利分配机制
---

# Sam Altman：这感觉就像新冠疫情爆发前的那个夜晚，我们已经看到了，世界还没看到

> 对谈：Chris Nicholson × Sam Altman / Josh Achiam / Adrien Ecoffet（OpenAI核心团队）| 来源：OpenAI论坛 | 2026

---

## 开场：为什么现在聊这个

OpenAI发布了一份关于超级智能的蓝图文件，核心团队集体亮相讨论AI飞速进化对科学、工作和社会治理的冲击。Sam Altman用了一个精准的类比：这就像2020年初那个寒冷的夜晚——模型已经达到了某个临界点，但社会还没有消化它。他们想在技术全面爆发前开启公共辩论，因为越早讨论，越有可能做出好的决策。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 新冠时刻 | COVID Moment | 指数增长前夜，少数人已经感知到危机，大众还没反应过来 |
| 韧性分层 | Layered Resilience | 不只靠公司自律，要建社会级多层防御体系 |
| 超级智能 | Superintelligence | 远超人类的AI系统 |
| 可移植福利 | Portable Benefits | 福利跟人走而不是跟雇主走 |
| 逆周期措施 | Counter-cyclical Measures | 在AI造成颠覆时自动触发的缓冲政策 |
| 税基现代化 | Tax Base Modernization | 对AI/资本而非人类劳动征税 |
| 全民基本计算 | Universal Basic Compute | 让每个人都能获得AI算力资源 |
| 苦差事盲症 | Schlep Blindness | 保罗·格雷厄姆的概念——人们因习惯而忽视显而易见的改进机会 |

---

## 01 新冠时刻：少数人已经看到了，世界还没反应过来

**Chris Nicholson：** Sam，我们今天早上发布的蓝图提到了很多关于超级智能的内容。我们为什么现在要做这件事？从内部视角来看，你希望大家了解些什么？

**Sam Altman：** 最大的原因在于进步的速度仍在持续加快。我们相信现在已经非常接近了。这不会是一次性的事件，在未来几年这些强大的模型将以重要的方式影响世界。我们预计很快就会进入一个拥有极其强大模型的世界，随后能力提升的速度将继续加快。我认为这将对经济、我们的生活方式以及我们能做的事情产生巨大影响。

从以往世界经历的一些转变中我发现，在真正做出决定之前，如果公众、我们的领导人和政治系统有更多时间讨论想法，就越有可能做出好的决定。鉴于我们所预见的未来，现在就开始讨论非常重要。

**Chris Nicholson：** Adrien，我想问你。让这么多研究人员与经常思考政策的人紧密合作，这对你和整个研究团队来说是怎样的体验？

**Adrien Ecoffet：** 这是一次非常有趣的经历。作为研究人员，我们有时会有一些抽象的想法，比如我们应该考虑某方面的经济影响或安全政策。但思考这些是一回事，真正动笔提出具体的政策建议并由同行进行辩论，又是另一回事。

我记得在过去几个月的工作过程中，很多研究人员经历了一个转变：从大部分代码由自己编写，变为大部分代码由AI编写。我认为这在某种程度上让他们感受到这项技术的紧迫性是真实而迫切的。它正在快速发展，而这可能是外界并非所有人都能看到的。

**Sam Altman：** 我能讲个小故事吗？大概是2020年1月底、2月初的一个晚上，OpenAI的研究人员在世界其他地方反应过来之前，就对新冠病毒产生了危机感。我们一直在谈论它，每天关注数字，觉得这一定会发生。当时我们已经在计划居家办公了。那时甚至有一篇文章出来嘲笑我们，说我们是疯子。在OpenAI，我们甚至在门把手上安装了一些铜质配件。

然后就是那个晚上。那是一个非常寒冷的夜晚。我当时住在Mission区，我想我很快就要被关在家里一段时间了，我要出去走走。我穿过城市走了很长一段路，走了几个小时。在那寒冷的夜晚，我看着人们在餐馆和酒吧里，隔着窗户对着彼此呼吸。我戴着口罩，看起来很怪异。外面还有另一个戴着口罩的家伙，我们互相点了点头。但除此之外，生活感觉完全正常。我从未像现在这样强烈地感受到这一点。

变化实际上已经发生了，模型已经达到了某种程度，只是社会还没有消化它们。我们觉得自己看得非常清楚，正努力告诉世界它将会发生。这很难让人理解，但这感觉就像新冠疫情刚开始的那个夜晚，再次走在街上的感觉。

> **金句 · Sam Altman**
> **中文：** 变化实际上已经发生了，模型已经达到了某种程度，只是社会还没有消化它们。这感觉就像新冠疫情刚开始的那个夜晚。
> **原文：** The change has actually happened. The models have reached a certain level, and society just hasn't digested it yet. It feels like the night COVID was just starting.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 新冠时刻 | COVID Moment | 少数人已感知到危机，大众还在正常生活 |
| 指数增长感知 | Exponential Growth Perception | 研究指数增长的人更容易提前感知危机 |
| 认知滞后 | Cognitive Lag | 技术已经变化，但社会观念还没跟上 |

**本章小结**
- AI能力的跨越已经发生，但社会的认知还停在原地；OpenAI提前发布蓝图，是为了在技术全面爆发前给公众和决策者留出讨论窗口。

---

## 02 韧性不是发布前的事，是发布后的事

**Chris Nicholson：** 这听起来像是一个韧性问题。你们认为韧性是分层的，而且很多时候韧性并不是体现在AI发布之前，而是在发布之后——体现在我们对AI的反应。Adrien，你如何看待韧性？

**Adrien Ecoffet：** 传统观点认为安全就是确保我们进行安全评估、对模型进行红队测试并实施缓解措施。但你所说的韧性是一个非常重要的层面。你希望社会能为另一种可能性做好准备，即可能会有一些行为者不怎么做安全测试。那会发生什么呢？在这种情况下社会如何应对AI带来的风险？

在蓝图中我们谈到了事故报告，这有点类似于航空业的做法。每当发生险情或任何事故，无论多么轻微，都会被报告到一个数据库，这样所有公司都能知道某处存在风险。另一件事是防御风险。我们正在谈论能够更好地编写代码的模型，这也意味着网络能力。韧性的一部分是确保我们的软件系统更安全，并利用AI来做这些防御工作。

**Chris Nicholson：** Sam，你觉得韧性可以是涌现的吗？

**Sam Altman：** 我认为我们最初的人工智能安全思维，是假设世界上将只有极少数人工智能。唯一重要的是确保这些人工智能做正确的事情，只要它们保持对齐且不做不安全的事情，世界就会安好。但现在的情况实际上更稳定但也更复杂：世界上将会有很多人工智能。仅仅靠一家公司确保人工智能永远不做不该做的事情是不够的，而是需要整个社会做出紧急响应。

如果我们举几个预期的威胁为例，网络安全肯定会成为一个巨大的问题。人工智能将非常擅长发现软件中的漏洞，我认为世界会发现现有的软件比我们想象的要脆弱得多。即便我们所有厂商都能阻止自己的模型被用于攻击，很快也会有擅长代码的开源模型出现。所以必须发生的是，世界必须使用这些模型，你可以先把它交给已知的、值得信赖的防御者。你必须赋能那些负责软件防御的公司，因为可能会有一些运行了20年的发电厂，没人理解它的软件，一旦出现大问题你必须对此采取行动。韧性方法是：既然AI擅长利用计算机系统，那我们就用AI来防御它。

如果我们再深入一点，我认为会出现生物领域的版本。总有一天会有人利用某个模型开发出病原体，世界需要针对此的防御盾牌：检测系统、快速响应治疗以及其他一系列措施。

> **金句 · Sam Altman**
> **中文：** 仅仅靠一家公司确保AI永远不做该做的事情是不够的，而是需要整个社会做出紧急响应。
> **原文：** It's not enough for one company to ensure AI never does what it shouldn't. It requires an urgent response from society as a whole.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 韧性分层 | Layered Resilience | 多层防御：公司自律+行业事故报告+社会应急+AI自身当防御盾 |
| 事故报告机制 | Incident Reporting | 航空业模式——任何AI险情都上报共享 |
| 涌现韧性 | Emergent Resilience | 不是预先设计的，而是大量防御者共同行动自然形成的 |

**本章小结**
- AI安全不是发布前公司做完就够了；未来世界上会有很多AI，需要社会级的分层防御——像航空业的事故报告系统，用AI来防御AI。

---

## 03 建数据中心是最平等的举措

**Chris Nicholson：** 基础设施建设是最大的民主化。思考如何让更多人参与进来的最佳框架是什么？

**Sam Altman：** 我认为当人们谈论AI的民主化时，指的是两件不同的事情。一是共享访问，确保每个人都能利用AI改善生活、创造价值；二是对AI的未来发展方向拥有发言权。这两点都非常重要。

另一方面，我们不仅需要像ChatGPT这样的服务，还需要将真正的高算力、有价值的服务广泛普及到更多人手中。

OpenAI过去几年一直在讨论什么时候才能度过计算危机。但我认为我们永远也摆脱不了它。如果我们不断降低智能的成本、提高智能的能力，需求将是无限的。如果我们不建设足够的基础设施，就会看到权力和计算资源的疯狂集中，因为人们会不断抬高价格。

所以我真正相信的长期民主化策略是提供充足的人工智能基础设施，并使模型足够强大。我希望达到一个境界，人们会说"我需要帮助来想出如何使用这么多计算资源"。如果资源非常有限，世界上最富有的人和公司就会把价格抬高到极端的程度，这将变成另一种被垄断的稀缺资源。

参考历史，我们为提高生活质量所做的最好的事情之一，就是大幅降低电价。能源价格下降与生活质量高度相关。通过使能源变得丰富且廉价，我们为提升整个世界做出了巨大贡献。我认为对AI也需要这样做，这意味着你需要大量的资源，并创新方法使其更加经济实惠。

建设更多的数据中心实际上是一个非常平等的举措，因为它们能让访问更加广泛。

> **金句 · Sam Altman**
> **中文：** 建设更多的数据中心实际上是一个非常平等的举措——如果资源有限，最富有的人会把价格抬高到极端；只有基础设施充足，智能才能真正普及。
> **原文：** Building more data centers is actually a very egalitarian move — if resources are limited, the richest people will drive prices to extremes; only with abundant infrastructure can intelligence truly democratize.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 基础设施民主化 | Infrastructure Democratization | 让算力丰富到"过剩"，价格降下来 |
| 计算危机 | Compute Crisis | 算力供不应求导致价格高企 |
| 全民基本计算 | Universal Basic Compute | 让每个人都能获得AI算力资源 |

**本章小结**
- 真正的民主化不是免费提供ChatGPT，而是大规模建设基础设施让算力过剩、成本降下来；数据中心建设本身就是最平等的举措。

---

## 04 当AI替代脑力劳动：税基和福利都要重写

**Chris Nicholson：** 当AI完成大部分智力劳动，资本与劳动的平衡将被打破。社会如何更广泛地抓住这些好处？

**Josh Achiam：** 关于计算资源的分配，弄清楚如何利用计算来帮助人们，可能是未来几年最重要的全社会问题之一。因为资源相对稀缺，我们应该尽快增加全球计算量，以避免面对痛苦的权衡——即我们本可以提供非凡好处，却因为成本太高而无法让工人参与其中。

很多工人对AI感到担忧，他们担心这对自己意味着什么。第一步是我们这些从业者和管理者必须明确我们将倡导哪些政策来确保经济公平。我们应该弄清楚如何赋能工会，让他们明智地选择在哪里以及如何使用AI。如何赋能工人参与关于工作场所AI可接受用途的讨论？此外还要大力推广AI素养。

**Adrien Ecoffet：** 除了AI的广泛应用，我们也考虑了确保普通人——那些不一定会创业的人——不会被技术抛在后面。这涉及到AI如何改变经济构成。我们在蓝图中讨论的一个问题是，如何为这样的经济体实现税基现代化？如何分配这项技术创造的繁荣，确保它惠及所有人而非少数人？

**Sam Altman：** 我认为之前谈到的广泛访问权和提供大量计算资源非常关键。你可能听过"全民基本计算"之类的想法，其核心含义是与其传统地认为每月给人们发钱，不如意识到人们其实很清楚自己需要什么，并且能非常有创意地使用资源。但如果人们被排除在获取这种资源之外，那将是一个挑战。

我确实怀疑我们必须改变税收方式。在一个人工智能完成大部分智力工作的世界里，我们需要探索新的征税方式。与其对人类收入征税，我们可能需要提供新型的过渡援助和失业保险。最终我们需要思考人们如何以新方式成为这些好处的拥有者。资本主义依赖于劳动力和资本之间的平衡，如果这种平衡完全失调，当前的系统将无法运作，必须进行演变。

**Adrien Ecoffet：** 在蓝图中我们有一些关于税基现代化和32小时工作周等方面的建议。重点是试图创建"逆周期措施"，即针对AI造成的干扰。因为AI我们有了额外的失业保险、32小时工作周等措施。从制度上讲我们需要思考：AI可能带来哪些潜在颠覆，以及我们如何在看到颠覆来临时实施措施来应对并广泛分配利益。

> **金句 · Sam Altman**
> **中文：** 资本主义依赖于劳动力和资本之间的平衡，如果这种平衡完全失调，当前的系统将无法运作，必须进行演变。
> **原文：** Capitalism relies on the balance between labor and capital. If that balance completely breaks down, the current system cannot function and must evolve.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 税基现代化 | Tax Base Modernization | 对AI和资本征税，而非对人类劳动征税 |
| 可移植福利 | Portable Benefits | 福利跟人走，不跟雇主走 |
| 逆周期措施 | Counter-cyclical Measures | AI造成颠覆时自动触发的缓冲政策 |
| 32小时工作周 | 32-Hour Work Week | AI接管部分工作后缩短工作时间 |

**本章小结**
- AI完成大部分智力劳动后，劳动力与资本的平衡将被打破；需要税基现代化、可移植福利、逆周期措施来重新分配AI创造的繁荣。

---

## 05 2028年自动化研究员：双重颠覆的倒计时

**Chris Nicholson：** Adrien，从研究机构内部来看，你正在目睹这种加速。你认为适应的窗口期有多长？

**Adrien Ecoffet：** 这很难给出一个确切数字，其中存在很多不确定性。我们讨论过在2028年初拥有一个自动化研究员，2028年3月是官方目标。我认为值得思考的是，一旦你拥有了一个能够进行AI研究的自动化研究员，你可能会面临一种"双重颠覆"。首先你拥有一个能完成高级认知工作的模型，这本身就具有颠覆性；其次它可能会进一步加速AI的发展。所以我无法预言从那时起一年后我们会取得多大的进步，但速度可能比我们迄今为止的经历要快得多。在我们看来这就是我们所说的窗口期。

**Sam Altman：** 我有一个最喜欢的例子。这里有很多选择，但我最喜欢的是看那些受过编码训练的父母，看他们第一次观察自己的孩子使用Codex。孩子有很多想法，却不知道传统的限制是什么，也不知道什么是难什么是易。他们只是开始描述一个视频游戏，然后让Codex制作出来，孩子会经历一段奇妙的创造性旅程。你经常看到孩子主要是通过语音来操作，而父母只是觉得"那行不通"。然后它就成功了。父母会感叹：哇，我的孩子将会在一个"期望这种事情发生"的世界中长大。

**Josh Achiam：** 关于能力过剩以及人们发现新能力的速度，存在一个有趣的时间尺度不匹配。那些对AI不太了解的人对正在发生的事情只有一种模糊的意识。他们通常不会将其设置为"思考模式"。他们会产生一种误解，认为事情并没有发展得像实际那样快。你会听到人们抱怨：它有幻觉，它很糟糕，它在犯错误。我认为当他们看到其他个人和机构在最强大的推理设置下，以令他们震惊的方式成功使用AI时，这种根深蒂固的信念差距就会被克服。AI预测的时间尺度是几周和几个月，而人们目前回访的时间尺度大约是每半年一次。当人们意识到今天能力的极限时，将会发生一些巨大的变化。

> **金句 · Adrien Ecoffet**
> **中文：** 一旦你拥有了自动化研究员，你可能会面临"双重颠覆"——AI本身完成高级认知工作，同时它又加速AI自身的进化。
> **原文：** Once you have an automated researcher, you may face a "double disruption" — the AI itself performs advanced cognitive work while simultaneously accelerating AI's own evolution.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自动化研究员 | Automated Researcher | AI能自主进行AI研究，不再需要人类拆解任务 |
| 双重颠覆 | Double Disruption | AI替代脑力劳动 + AI加速自身进化 |
| 能力过剩 | Capability Overhang | AI实际能力远超人们的使用程度 |
| 苦差事盲症 | Schlep Blindness | 人们因习惯旧方式而看不见AI带来的可能性 |

**本章小结**
- 2028年3月是自动化研究员的内部目标；一旦实现，技术进步将进入自我加速的双重颠覆闭环，社会适应窗口期非常有限。

---

## 总结：AI海啸已经到来，社会需要在浪头落地前建好防御

| 维度 | 要点 |
|------|------|
| 新冠类比 | 模型能力已达临界点，社会认知还停在原地 |
| 韧性分层 | 公司自律+行业事故报告+AI当防御盾=社会级多层防御 |
| 基础设施 | 建数据中心是最平等的举措——算力过剩才能防止垄断 |
| 经济转型 | 劳动力与资本平衡将被打破，税基和福利都需要重写 |
| 2028倒计时 | 自动化研究员将触发双重颠覆，适应窗口期有限 |
| 人类品质 | 创造力、同理心、品格——机器无法替代的东西 |

> **金句 · Sam Altman（封底）**
> **中文：** 我们提出这些想法不是作为最终计划，而是作为与政策制定者和社会各界进行公开对话的起点。
> **原文：** We're putting these ideas out not as a final plan, but as a starting point for open dialogue with policymakers and society.

---

## 附录

**章节时间戳**
- 00:00 开场：Chris Nicholson引入
- 04:50 01 新冠时刻类比
- 10:15 02 韧性分层防御
- 18:30 03 基础设施民主化
- 23:15 04 经济范式转移与税基现代化
- 26:40 05 2028自动化研究员拐点
- 32:00 06 人类品质与AI

**Ingest 信息**
- column_source: Recastory/workspace/bilibili-retranscribe/BV1WPo4B9EyZ/ingest/column_article.md
- asr_status: asr_ready

**相关阅读**
- [[MOC - Agent Theory and Design]] — Agent时代行业观点入口
- [[黄仁勋-从生成到代理计算]] — 另一位CEO对AI产业的判断
- [[马斯克-xAI内部复盘与规划]] — xAI的内部视角：速度与执行力
