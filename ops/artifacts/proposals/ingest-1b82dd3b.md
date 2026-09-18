---
id: ingest-1b82dd3b
candidateId: candidate-e8d96fea
status: applied
suggestedPath: "vault/00-Inbox/linear团队-构建生产级别agent的5条规则-哔哩哔哩-72c13f86.md"
risk: high
created: 2026-09-16T15:22:24.258Z
---

# Ingest proposal: Linear团队：构建生产级别Agent的5条规则 - 哔哩哔哩

<!-- syno:json:start -->
```json
{
  "id": "ingest-1b82dd3b",
  "candidateId": "candidate-e8d96fea",
  "status": "applied",
  "suggestedPath": "vault/00-Inbox/linear团队-构建生产级别agent的5条规则-哔哩哔哩-72c13f86.md",
  "suggestedTags": [
    "ai_agent",
    "article",
    "bilibili",
    "context_engineering",
    "skills",
    "harness_engineering",
    "multi_agent"
  ],
  "suggestedLinks": [
    "vault/01-Areas/AI Agent Development/03-Tool System/3-6 生产级权限系统的四层防线.md",
    "vault/02-Resources/AI and Agents/Agent Design & Patterns/WorkBuddy团队-从模型到可用Agent的Harness工程.md",
    "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Anthropic团队-如何构建运行数小时的Agent.md"
  ],
  "risk": "high",
  "created": "2026-09-16T15:22:24.258Z",
  "sourceDescriptor": {
    "kind": "url",
    "originalUrl": "https://www.bilibili.com/opus/1241615577214091273",
    "canonicalUrl": "https://www.bilibili.com/opus/1241615577214091273",
    "publisher": "www.bilibili.com",
    "observedAt": "2026-09-16T15:22:24.132Z",
    "capturedAt": "2026-09-16T15:22:24.132Z",
    "captureChannel": "web",
    "sourceTier": "secondary",
    "reliability": "unverified",
    "userSuppliedSource": true,
    "verificationStatus": "unverified"
  },
  "sourceType": "bilibili-opus",
  "sourceProfile": {
    "ingestWorkflow": "bilibili_opus_ingest_v2",
    "primarySource": "column",
    "opusId": "1241615577214091273",
    "sourceTier": "C2",
    "sourceForm": "dialogue",
    "contentForm": "dialogue",
    "dialogueFidelity": "source",
    "questionSource": "column",
    "voiceBasis": "direct_speech",
    "factualStatus": "partial",
    "factualReviewed": "2026-09-17",
    "verificationScope": "column_only",
    "verificationBasis": [
      "column"
    ]
  },
  "quality": {
    "status": "accepted",
    "reasons": [
      "来源为 Linear 团队成员 Nan Yu 与 Jacob Shumway 在播客中的完整问答记录，含可归属的直接发言与主持人提问",
      "包含可复用的机制判断（循环式 Agent、技能按需加载、评测聚焦意图、入口在工作发生处）与具体案例（Slack 中仅发表情即创建工单、六分钟内提交 PR）",
      "对话中包含可识别的时间线节点（2025 下半年备忘录、隐秘上线、早期原型）与明确限制条件（评测刻意少做约束、成本权衡）",
      "内容为演讲/对谈形态，可编译为对谈式 canonical 上下文"
    ]
  },
  "materialTier": "A",
  "canonicalTags": [
    "ai_agent",
    "article",
    "bilibili",
    "context_engineering",
    "skills",
    "harness_engineering",
    "multi_agent"
  ],
  "duplicateAssessment": {
    "matches": [
      "vault/01-Areas/AI Agent Development/03-Tool System/3-6 生产级权限系统的四层防线.md",
      "vault/02-Resources/AI and Agents/Agent Design & Patterns/WorkBuddy团队-从模型到可用Agent的Harness工程.md",
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Anthropic团队-如何构建运行数小时的Agent.md",
      "vault/00-Inbox/linkedin-工程师-领英的ai-agent-开发和部署实践-哔哩哔哩-b84b419d.md",
      "vault/02-Resources/AI and Agents/Agent Design & Patterns/Anthropic Agent 工程实战指南 - 从入门到生产落地.md"
    ],
    "sameSource": false,
    "updateStatus": "new"
  },
  "relations": [
    {
      "type": "supports",
      "target": "vault/02-Resources/AI and Agents/Agent Design & Patterns/WorkBuddy团队-从模型到可用Agent的Harness工程.md",
      "reason": "两篇都主张模型决定能力上限，而上下文与 Harness 决定能否稳定落地；本篇用 Linear 原生 Agent 的评测实践与技能按需加载提供了新证据，支持'把产品方法写进技能'这一判断。"
    },
    {
      "type": "limits",
      "target": "vault/01-Areas/AI Agent Development/03-Tool System/3-6 生产级权限系统的四层防线.md",
      "reason": "该篇以权限分层与审批疲劳为核心防线，本篇则给出边界条件：当入口在 Slack 讨论串、由 Agent 自行推断待办时，每个 Agent 仍需与一个人绑定（如任务归属 Jacob），否则任务会消失在聊天记录里。"
    },
    {
      "type": "extends",
      "target": "vault/02-Resources/AI and Agents/Agent Design & Patterns/Anthropic Agent 工程实战指南 - 从入门到生产落地.md",
      "reason": "在通用的 Agent 工程流程之上，补充了'评测应盯住用户意图而非输出一致性'与'原生 Agent 的护城河是默认工作方式'两个产品侧判断。"
    }
  ],
  "mocChanges": [],
  "claimCandidates": [
    {
      "statement": "Agent 的价值在于围绕目标反复调用工具、补齐信息并判断是否完成的循环，而非单次问答。",
      "stability": "model",
      "reviewAfter": "2027-09-16"
    },
    {
      "statement": "原生 Agent 应在运行时按需加载技能，每个技能携带有限工具与操作原则；一次性塞入全部 API 或 GraphQL schema 会造成上下文膨胀与幻觉。",
      "stability": "practice",
      "reviewAfter": "2027-03-16"
    },
    {
      "statement": "评测应主要盯住用户意图（是否识别出用户想完成任务），而非要求输出一致；过度约束性评测会产生误导信号。",
      "stability": "principle",
      "reviewAfter": "2027-03-16"
    },
    {
      "statement": "原生 Agent 相对只提供 MCP/工具的差异在于把产品对工作方式的判断写进技能与默认流程，形成竞争者难以复制的默认行为。",
      "stability": "model",
      "reviewAfter": "2027-03-16"
    },
    {
      "statement": "领域 Agent 的入口应在用户实际发生工作的地方（Slack 讨论、会议纪要、项目更新），聊天界面只负责后续追问。",
      "stability": "practice",
      "reviewAfter": "2027-03-16"
    },
    {
      "statement": "Agent 通过 Slack 集成公开后，用户学会只发一个指向上方的表情即可让模型从讨论串推断待办并创建工单，这种涌现行为超出团队预期。",
      "stability": "fact",
      "reviewAfter": "2027-09-16"
    },
    {
      "statement": "Linear Agent 曾在一次设计讨论中，依据'直接做吧'梳理结论、创建问题、指定负责人，并于六分钟后提交可查看的 PR。",
      "stability": "fact",
      "reviewAfter": "2027-09-16"
    },
    {
      "statement": "截至本对谈，Linear Agent 后续方向是加入主动性与更持久的记忆，使其在项目全周期内推进协调与文档更新。",
      "stability": "volatile",
      "reviewAfter": "2026-12-16"
    }
  ],
  "evidenceCandidates": [
    {
      "claimRef": 1,
      "sourceRef": "https://www.bilibili.com/opus/1241615577214091273",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "从高层次来说，智能体其实就是让大语言模型不断循环调用……先定义一个目标，再给它一些工具，让它自行构建上下文，然后让它循环运行。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": 2,
      "sourceRef": "https://www.bilibili.com/opus/1241615577214091273",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "我们一开始试图把Linear里所有能做的事情都交给它……结果遇到了上下文问题和幻觉问题。后来我们采用了类似技能的架构：给它一个加载技能的工具，然后根据请求动态加载所需的技能。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": 3,
      "sourceRef": "https://www.bilibili.com/opus/1241615577214091273",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "一致性很重要，但对于智能体来说，一致性并不总是重要……你不希望围绕这些方面设置太多评测，否则只会产生误导性的信号。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": 4,
      "sourceRef": "https://www.bilibili.com/opus/1241615577214091273",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "拥有一个原生 Agent，就能把我们对于优秀产品管理的理解融入进去……我们可以确定，在理想情况下，流程应该如何运行。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": 5,
      "sourceRef": "https://www.bilibili.com/opus/1241615577214091273",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "入口可能在你和 Slack 上的讨论里、会议总结里，或者你撰写项目更新并进行调研的时候。这些才是调用智能能力的入口。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": 6,
      "sourceRef": "https://www.bilibili.com/opus/1241615577214091273",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "有人会说：我只要@Linear，再加一个指向上方的手指表情。这样做之后，Linear会自己推理刚才发生了什么……然后告诉用户已经完成了。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": 7,
      "sourceRef": "https://www.bilibili.com/opus/1241615577214091273",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "Linear创建了这个问题。结论已经确定，负责人是Jacob，而且它还把任务委派给了自己。那是18分钟前的事，它用了六分钟，然后给了我们一个可以点击查看的PR。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": 8,
      "sourceRef": "https://www.bilibili.com/opus/1241615577214091273",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "接下来，我们肯定会加入一些主动性功能，以及更持久的记忆能力。这就是我们目前重点关注的两个方向。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": 7,
      "sourceRef": "https://www.bilibili.com/opus/1241615577214091273",
      "sourceTier": "primary",
      "stance": "context",
      "excerpt": "虽然实际上是Linear完成了工作，但任务还是分配给Jacob……有个原则：每个智能体都必须和一个人绑定。",
      "observedAt": "2026-09-16"
    }
  ],
  "unresolved": [
    "专栏标注的'5条规则'未在正文中出现明确编号清单，正文实际按 8 个话题组织，规则条目对应关系无法确认。",
    "多数回答的说话人仅标为 unknown，除主持人 Peter Yang 与提及的 Jacob、Nan 外，具体哪句由 Nan 或 Jacob 说出无法逐句确认。",
    "未读取官方播客原页，仅以专栏文字为依据，无法交叉核验 Numeric 细节。",
    "对谈中未给出 Linear Agent 的发布日期、可用范围与版本号。",
    "主持人多次称呼对方为 Kari 或 Kakari（疑为 Linear CEO Karri Saarinen 的转写差异），该人名写法无法确认。",
    "开场前出现的赞助段落（Oceanz）属于广告，已按契约删除，不计入知识保留。"
  ],
  "validators": [
    "source_traceability",
    "duplicate",
    "retention",
    "frontmatter",
    "relation_quality",
    "factual_status",
    "unresolved",
    "voice_integrity",
    "numeric_context",
    "constraints_preserved",
    "dialogue_plan"
  ],
  "sourceDigest": "3338bbebe38a65add2c9ae129b187a2a64bbd605ea98b9e55dbb61b400c9b06a",
  "existingNoteRef": "vault/01-Areas/AI Agent Development/03-Tool System/3-6 生产级权限系统的四层防线.md",
  "canonicalBody": "# Linear团队：构建生产级 Agent 的 5 条规则\n\n> 人物：主持人 Peter Yang；嘉宾 Nan、Jacob（Linear 团队，参与 Linear Agent 从原型到生产）。\n> 主题：Linear 原生 Agent 如何从内部 Slack 机器人长成可创建 PR 的生产系统。\n>\n> **核心主张：** 让 Agent 有价值的不是一套提示词技巧，而是把模型放进围绕目标的循环里、把产品方法写进可加载的技能，并把它放在工作真正发生的地方。\n\n> 模型确实很聪明，但我们还没有充分利用它们。\n> ——Linear 团队\n\n## 开场\n\nLinear 团队复盘了自家 Agent 的演进：从一份 2025 年下半年的内部备忘录，到悄悄接入 Slack 的机器人，再到能读讨论串、建工单、写代码并提交 PR 的系统。下面按他们实际讨论的八个话题整理，判断与案例都保留原话依据。\n\n## 01 Agent 的价值在循环，而不在单次回答\n\n**核心判断：** Agent 不是聊天框里的一次模型调用，而是围绕目标反复调用工具、补齐信息、判断是否完成的循环。\n\n**Peter Yang（主持人）：** 用通俗的方式讲，Agent 到底是什么？\n\n**Nan / Jacob（讲者）：** 从高层看，Agent 就是让大模型不断循环调用。\n\n- 平时调用大模型是给一个问题、拿一个答案。\n- Agent 要先定义一个目标，也就是要达成的里程碑。\n- 再给它一些工具，让它自行构建上下文，然后循环运行。\n- 问题、答案、问题、答案，每一轮调用工具、获取上下文，信息足够时判断目标完成，综合出最终回复。\n\n但要区分技术定义和产品定义。去问工程师，基本都会给出上面这个答案。\n\n**Nan（讲者）：** 我们平时谈 Agent 时，通常把它看成一种产品——把某种 AI 循环和其他东西打包在一起，最终由许多子系统协作，外面再套一个统一外壳。这个外壳可以是聊天机器人，负责呈现所有功能。桌面 Agent 里还集成调度器和其他周边功能，这些都属于产品形态的 Agent。\n\n## 02 先把不想做的工作交给计算机，但野心不止于此\n\n**核心判断：** 起点是自动化琐事，实际使用后才发现 Agent 也能进入从讨论、决策到实现的创造性链路。\n\n**Peter Yang（主持人）：** 最初的想法和规格是什么？\n\n**Nan（讲者）：** 我翻出了一份写于 2025 年下半年的备忘录。从人类时间看不久，按 AI 的时间尺度已经是远古历史了。\n\n- 当时最关注的一点是：计算机能替我们完成很多工作，把所有不想做的事都交给计算机。\n- 在技术构想成形之前，已经有结构化思考：先有触发事件，再产生上下文，接着给指令，围绕一系列行动循环，最后得到结果。\n- 当时给它的定位是“机器人项目经理”，把无聊的工作交出去。\n\n**Peter Yang（主持人）：** 技术项目经理可能是最无聊的工作之一，不就是管理电子表格、跟踪工单？\n\n**Nan（讲者）：** 那就是最初的定位。但现在想法变了。严格说也才过了一年，我们已经不再认为它只能做无聊的工作。无聊的工作还是可以交，但除此之外，它打开了大量创造性的可能——你可以和它互动，让它成为完成有趣工作的增幅器。\n\n## 03 隐秘上线暴露了真正的自然语言入口\n\n**核心判断：** 不做固定表单、直接接入日常通讯渠道，用户会涌现出团队完全没预料到的极简用法。\n\n**Peter Yang（主持人）：** 第一版是怎么做出来的？\n\n**Nan / Jacob（讲者）：** 第一个版本非常像原型。直接从前端调用大模型，只在内部测试。我们有一个命令菜单，把所有操作作为工具提供给它，然后看它能做什么。当时真的很粗糙。\n\n- 最早凸显价值的用例是创建问题，这本身很简单。\n- 真正让大家想用的是：把销售电话的手写笔记丢进去，让它提取需要开发的问题、用户反馈的 Bug。这是用户直接提过的需求，也是我们工作流里的真实痛点。\n- 当时方向很开放，甚至不确定要不要聊天界面，也许只是一个大的文本框加一个提交按钮。\n\n**Peter Yang（主持人）：** 所以是在 Slack 之类的平台上发布，让大家内部使用？\n\n**Nan / Jacob（讲者）：** 第一个生产版本发布得很隐秘，没有正式通知任何人。我们本来就有 Slack 集成，在 Slack 里总能提及机器人。\n\n- 大家熟悉的 Donut 之类工具通常按固定流程运行，你在 Slack 里提到 Linear，原本会得到表单。\n- 我们只是悄悄把它接到这个 Agent 上，有人通过提及 Linear 发现它，就能开始对话。\n\n结果出现了很多没预料到的用法。最明显的是“Linear，创建一个问题”，然后用自然语言描述需求。但人们很快发现它能读上下文，于是只需说“做该做的事”，或者“看看我们刚才做了什么”。\n\n更极端的是：有人只发一句“@Linear”，再加一个指向上方的手指表情。Linear 会自己推理刚才发生了什么，判断这里提到了几个问题，于是创建几个问题，然后告诉用户已经完成。\n\n**Jacob（讲者）：** 这种行为是非常明显的涌现能力，我们没想到它能做到。\n\n## 04 全量 API 会压垮上下文，技能应按需加载\n\n**核心判断：** 一次性交出所有界面操作与 schema 会带来上下文膨胀和幻觉，改为按请求加载携带有限工具与操作原则的技能。\n\n**Peter Yang（主持人）：** 你们让它了解 Linear 的所有内部 API，然后放手让大家试用？\n\n**Nan / Jacob（讲者）：** 一开始试图把 Linear 里所有能做的事情都交给它，也就是各个界面上的大量操作。结果遇到了上下文问题和幻觉问题。还试过把 GraphQL 模式交给它，让它自己写查询，效果也不好。\n\n后来采用类似技能的架构：\n\n- 给它一个加载技能的工具。\n- 根据请求动态加载所需技能。\n- 每个技能附带一组工具和相应的操作说明。\n\n**Peter Yang（主持人）：** 技能由你们定义，比如“创建工单”，因为你们对操作方式有自己的看法？\n\n**Nan / Jacob（讲者）：** 比如写问题时，如何设置优先级、如何撰写描述，这些规则全部编码进技能里。\n\n很多人会说，自己做了一个 CLI 或 MCP，并附带一堆使用它的技能。但如果你构建的是原生 Agent，就可以大胆发挥——可以有数百个这样的技能。因为你能动态加载，也能控制一切运行方式，可以让它以非常流畅、符合产品理念的方式使用你的应用。这就是原生 Agent 的一大优势：可以把它当成一个超级熟练的高级用户，执行方式不会有明显偏差。\n\n它可以不断循环运行，自行决定调用哪些工具，那些“只要提及它、它自己判断该做什么”的涌现行为也就自然出现。\n\n## 05 好的 Agent 要把讨论变成可追踪的结果\n\n**核心判断：** 关键不只是生成代码，而是把 Slack 里的共识落入项目和个人的待办，避免决定消失在聊天记录里。\n\n**Peter Yang（主持人）：** 能不能演示几个例子？\n\n**Nan / Jacob（讲者）：** 这是刚才的一段对话。我们在 Slack 里聊天，提到设计师 Jan 和 Jacob，讨论可以采取的方案。当时没有明确决定做什么，只是觉得“这里不太对劲”。设计师提出看法，我进一步澄清，Jacob 提出异议，我回应异议——可以说是在不断接近真相。\n\n最后一条消息就是：“直接做吧。”比如：“Linear，替我创建一个问题，我想保留它。”而现在 Linear 已经可以写代码了。\n\n- 以前只是让它替我创建一个问题。\n- 现在所有上下文都在这里，让它自己判断该做什么：我们围绕很多事情讨论，最后达成了结论，那就找出结论、写成问题、创建并着手处理。\n\n于是 Linear 创建了这个问题，结论已经确定，负责人是 Jacob，它还把任务委派给了自己。那是 18 分钟前的事，它用了六分钟，然后给了我们一个可以点击查看的 PR。\n\n**Peter Yang（主持人）：** 现在你可以直接进去试用，看这到底是不是个好主意。\n\n**Nan（讲者）：** 更重要的是，因为它属于 Linear 系统，所以它会进入 Jacob 的待办列表，也会出现在他的待处理状态里。他不会把这件事忘掉。如果它只是卡在 Slack 里，聊天会越来越多，最后突然找不到这件事，只能靠搜索碰运气，或者希望有人还记得。\n\n实际的跟踪仍然重要：任务被放在有组织的待办列表里，归入正确的项目。这才是最终结果。\n\n**Peter Yang（主持人）：** 虽然实际是 Linear 完成了工作，但任务还是分配给 Jacob，有个原则是每个 Agent 都必须和一个人绑定？\n\n**Nan（讲者）：** 绝大多数情况下确实如此。当然也有系统自行触发后续流程的情况。\n\n- 比如接入 Datadog 之类工具，某个警报触发，在系统里创建了一个 Bug，Linear 尝试解决它，这种情况下直到最后都不会有人真正介入。\n- 这时就得依靠 Agent 判断该由谁审查代码。\n- 但总得有人做决定，比如决定要完成这项工作。这个例子里就是 Jacob 说“好，我们现在掌握的信息够多了，来处理这件事”，这样他能负责跟进，任务也归在他名下。\n\n**Peter Yang（主持人）：** 这个 Agent 可以访问哪些信息和上下文？\n\n**Nan（讲者）：** 这次的上下文来自 Slack，来自那个讨论串。它可以读取 Slack。很多价值来自把信息串联起来。\n\n- 单靠 Slack 不够。\n- 把 Slack、读取代码库的能力、读取项目描述和其他任务的能力结合起来，突然之间它就能做很多事。\n- 在这个例子里，本来可能是我们创建了问题，然后发现已经有人完成过这件事，系统里其实已有一个进行中的 PR。它因为能访问所有这些信息，所以不会不管不顾地往前冲。\n\n**Peter Yang（主持人）：** 最早在 Slack 悄悄上线时，产品是简单的基础提示词加工具，还是已经很复杂？\n\n**Nan / Jacob（讲者）：** 那时还没有技能架构，而技能架构解锁了很多能力。大家主要用它创建任务，所以我们围绕这个场景做了大量优化。\n\n- 做了一个小型路由器，把 80% 的使用场景路由到专门用于创建任务的子提示词上，并针对它高度优化。\n- 更准确地说，是一个运行路由器的小模型，把请求发给两类目标：一个功能强大的主提示词，什么都能做、也能访问所有工具；另一个是针对特定场景的提示词，比如创建任务。\n\n**Peter Yang（主持人）：** 做原型时应该用当时最强的模型，但你们实际上会针对不同任务混用不同模型？\n\n**Nan / Jacob（讲者）：** 总体上还是遵循这个最佳实践。在确认运行良好、建立评测、明确成功标准之前，通常先用最大的模型。之后有了完善框架来保证效果不变，再逐步换更小的模型优化。理想情况下，应该为每项任务使用能胜任它的最小模型，这样可以节省成本。\n\n## 06 评测盯住用户意图，不要把行为管得过死\n\n**核心判断：** 确定性任务检查状态是否正确，主观质量交给模型评判；刻意少做约束性评测，因为 Agent 输出本可以不一致。\n\n**Peter Yang（主持人）：** 你们是怎么评估它做得好不好的？\n\n**Nan / Jacob（讲者）：** 我们有评测，很多内容来自不断迭代和实际使用。用户会以出乎预期的方式使用它，我们就把它加入评测数据集。尽量兼顾客观指标和主观指标：\n\n- 客观指标判断它是否确定性地完成了某件事，比如用户说“进行中”，就要确保任务状态被设置为“进行中”。\n- 主观指标看描述是否组织得足够好、有没有把应作标题的信息填进标题字段。\n\n**Peter Yang（主持人）：** 怎么评估这些？通过或不通过，还是打分？\n\n**Nan / Jacob（讲者）：** 让大语言模型来做评判。随着时间推移构建数据集，然后使用评分型大语言模型，判断它有没有提取出正确的信息。\n\n**Peter Yang（主持人）：** 还得加入“评判器”环节，再检查评判器是否评判正确，这相当手动。\n\n**Nan / Jacob（讲者）：** 所以实际上，出于这个原因，我们会尽量少用这类评测。评测最有效的情况，是用来确保某个方面的一致性。\n\n一致性很重要，但对智能体来说，一致性并不总是重要。它们对同一件事的回答方式可以有很大差异。你不希望围绕这些方面设置太多评测，否则只会产生误导性的信号。\n\n**Peter Yang（主持人）：** 你们发布时并不是先挑出通过所有评测的场景再专注其中，营销宣传也是如此。\n\n**Nan（讲者）：** 可以这样理解。现在应用人工智能最大的难题不是智能体不够聪明，也不是模型不够先进，而是人们所说的“能力过剩”——模型其实非常聪明，但我们还没充分利用它们。\n\n所以我们现有的评测主要关注：当用户说了某句话时，用户其实是想完成一项任务，你有没有识别出这一点？\n\n- 这是一个机会，你完全可以帮用户完成某件事。\n- 你有没有理解用户真正想让你做什么？\n- 还是说你太急于行动，在用户并不需要的情况下，做了成本很高、又很烦人的事？\n\n在 Slack 集成里，当你提出后续问题、而智能体认为自己能回答时，内部会经过一整套流程：它应该能回答这个问题，那该不该插话？评测主要关注的就是这类体验上的关键时刻。\n\n**Peter Yang（主持人）：** 智能体回复之后有没有形成反馈闭环？\n\n**Nan / Jacob（讲者）：** 完全是。很多评测其实来自这些时刻：有人觉得“它刚才的表现很奇怪，或者很蠢”，然后解释原因，这件事本身就会变成一项评测。\n\n**Jacob（讲者）：** 这种情况太多了。有一次一位用户直接叫智能体“老兄”，结果智能体说：“好吧，我不回答你了，因为你的语气太不正式。”我们遇到过很多有意思的使用场景，不得不把这些行为严格收敛到一个非常窄的范围内。\n\n### 07 从原则出发，而不是把指令塞满\n\n**核心判断：** 少给指令、多给加载上下文的工具，让模型自己搜索、构建上下文；束得太死会带来过拟合和沮丧感。\n\n**Peter Yang（主持人）：** 编写提示词和技能时，更应该围绕原则和如何思考，而不是规定“内容正好 140 个字符”这种具体要求？\n\n**Nan（讲者）：** 完全正确。而且说实话，你也应该尽可能少给它指令，给它加载上下文所需的工具，不要直接把上下文塞进它。我觉得这是一个很重要的原则。\n\n**Peter Yang（主持人）：** 因为给太多指令，它就会在软件层面过拟合。\n\n**Nan（讲者）：** 对，那些指令可能根本不需要。它还可能过度强调某些事情，而这些事情对当前任务并不重要。\n\n只要你给它一个定义清晰的目标，它们已经足够聪明，能自行找到所需信息。它们可以自己搜索，然后找到答案。给它加载技能的工具、加载指导信息的工具，以及其他类似的工具，它就能自己构建上下文。\n\n**Peter Yang（主持人）：** 你们会收到大量反馈，几乎像智能体在自我改进。\n\n**Nan（讲者）：** 像一个循环。我们有一套机制，可以让智能体报告它无法实现的功能。如果用户要求它做某件事而没有相应工具，它就会调用一个工具，把这类需求报告给我们。\n\n- 我们会自动把它录入系统，检查是否已经存在相关问题。\n- 如果有，就把它添加到那个问题里；如果没有，就创建一个新问题。\n- 这样我们持续收到一批关于智能体能力边界的问题。\n\n**Peter Yang（主持人）：** 用户让智能体做过最疯狂的事情是什么？\n\n**Nan（讲者）：** 总体来说，只要没有安全风险之类的问题，我们其实不介意用户提出各种要求。如果你想让智能体给你写首诗，完全没问题。在这方面我们给了它相当大的自由度。试图把它限制得太死，最后可能会让人很沮丧。\n\n**Nan（讲者）：** 说到使用范围，这很有意思，因为它明确是用于工作的，和你的工作区、开发团队绑定，人们通常不会拿它去冒险，但还是会有一些让我们意外的用法。\n\n- 很多人用它来翻译。收到不会说的语言写成的客户反馈，直接让它翻译。\n- 甚至设置自动化规则：如果在法国有很多客户，今后只要收到一张法语 Intercom 工单，就先帮我翻译，再据此创建问题。\n\n会出现很多有创意、又很符合主题的用法，但我们以前确实没想到人们会这么用。\n\n### 08 原生 Agent 的护城河是默认工作方式\n\n**核心判断：** 只提供 MCP 和工具，用户可能得到冗长无人读的 Markdown；原生 Agent 能把 Linear 对产品管理的判断写进技能和默认流程，端到端承接软件开发生命周期。\n\n**Nan（讲者）：** 发布 Linear Agent 之前，Linear 本身是一个可以给 Cursor Agent 和其他 Agent 分配任务的平台——把问题分配给 Agent，还可以在评论里提及它们。\n\n我们希望能端到端支持完整的软件开发生命周期。我们认为自己的专业优势在于：对团队应该采用什么做法有非常明确而且高质量的判断。让系统具备智能、能由 AI 采取行动，就是把这些理念真正执行起来的一种方式。\n\n以前我们会写指南，比如一份 Linear 方法，告诉你应该如何思考软件开发流程。从模型能力中看到的很大机会是：你不必只是读完这套方法再照着流程手册执行，你可以直接让 Linear 自己执行这套流程。\n\n我们因此在系统里加入了一些专门的 Agent，它们可以完成其中一部分工作，比如写代码，或者为 Bug 报告做根因分析。但它们都没有像我们希望的那样，真正端到端地接管整个流程。\n\n**Peter Yang（主持人）：** 我一直觉得，AI 负责中间的 80%，人类负责前 10% 和后 10%。\n\n**Nan（讲者）：** 你说的这个，我听有人这样描述：AI 不是端到端解决方案，而是“中间到中间”的解决方案。这其实正是你现在在做的事。\n\n- 现在可能还是人类负责前 10% 和后 10%。\n- 未来也许只需要人类完成最开始的 0.01%，再做最后的收尾。\n- 中间部分会不断扩大，直到基本触及两端的边界。\n\n这也是我们看到的趋势。我们相信最终会这样发展，所以想构建一个能促成这种变化的系统。\n\n**Peter Yang（主持人）：** 你们内部也在做长时间运行、目标循环这些实验吗？\n\n**Nan（讲者）：** 确实在内部实验。不过一旦涉及这类长时间运行的 Agent，就必须考虑成本方面的权衡。但我觉得模型已经非常接近那个阶段了，这会变成一件很有意思的事。\n\n**Peter Yang（主持人）：** 另一方面，把 Linear 方法放进 Markdown 文件，Agent 确实会读完并尝试执行……但它自己生成 Markdown 文件的能力太强，篇幅都很长，有时候我已经不再读了。\n\n**Peter Yang（主持人）：** 你做好计划就去执行，我只看最终结果，同时又很担心：仓库里会堆满越来越多 Agent 生成的 Markdown 文件，而我一个都没读，整份报告最后都会变成垃圾内容。\n\n**Nan（讲者）：** 是啊。人们使用 AI 系统之后，也会逐渐感受到这些问题。但很多时候，别人会说这是你的能力问题——“那你就把生成的内容读一遍”，“你应该告诉它不要生成垃圾”。这话没错，但问题最终回到了一个核心：默认行为到底是什么？\n\n我们把 AI 引入 Linear 时看到了一个机会。因为还存在另一种可能：我们只提供一个 MCP 服务器，让用户随便用什么工具连接 Linear，然后就结束了，并不需要原生 Agent 做任何事。\n\n但拥有一个原生 Agent，就能把我们对于优秀产品管理的理解融入进去。而优秀的产品管理，不是生成没完没了、难以阅读、充斥着无关细节的 Markdown 文档。我们可以确定，在理想情况下流程应该如何运行。\n\n**Peter Yang（主持人）：** 因为如果只构建 MCP、只提供一堆工具，用户可能会偏离方向；但 Agent 本身拥有一套技能和指令，可以把 Linear 的价值观和产品流程融入其中。\n\n**Nan（讲者）：** 对，完全正确。\n\n**Peter Yang（主持人）：** 你们是什么时候决定这东西已经可以发布的？\n\n**Jacob（讲者）：** 从后端看，我们的感觉是发布得比较早，但也没有早到不合适。我们基本倾向于认为：它已经做得相当不错了，就先发布出去，收集更多数据，再继续改进。\n\n如果想把这种主观性很强的东西做到完美，我们可以永远在内部打磨下去，很难真正达到所谓的完美状态。所以最终觉得：该发布了。\n\n**Nan（讲者）：** 从产品角度说，如果你发布一个有 UI 的产品，UI 实际上会限制用户能用它做什么，它会变成一个高度由 UI 驱动的功能。这样一来，你可以通过排除一开始就没打算支持的功能来定义质量。\n\n- 对于这种产品，我们会先确定一些核心的标志性用例，这些就是我们要演示的功能。\n- 我们认为这些功能能带来很大价值，也是用户使用 Agent 的良好起点。\n- 只要把这些功能做得足够可靠，其他方面就会存在一定的可靠性差异，而这是可以接受的。\n\n只要重点推荐的核心路径足够稳定，而且我们真正认可它们，这就是我们对质量的要求。\n\n**Peter Yang（主持人）：** 处理工单、管理工单、创建 PR，这些就是营销中重点展示的功能。\n\n**Nan（讲者）：** 只要这些功能表现良好就行，因为它们是我们明确承诺支持的，也可以说是产品的“保修范围”。\n\n**Peter Yang（主持人）：** 对开发者或公司来说，决定是否要构建自己的 Agent 时，你有什么建议？\n\n**Nan（讲者）：** 首要的是真正拆解清楚：用户到底想完成什么工作流。\n\n- 很多时候这些工作流包含非常多步骤。没人会坐到办公桌前一次性把整个工作全部完成，这种情况不会发生。\n- 然后要找出其中哪些地方适合自然地接入。\n\n这正是我们说的：Linear Agent 是一组子系统，其中很多子系统是为了找出合适的入口。\n\n最直观的做法是做一个应用内聊天机器人，然后人们指着它说“哦，这就是 Agent”。但那只是与 Agent 交互的一种方式。它是必要的，因为你要进行后续追问、执行多轮流程，就必须有交互界面。但它并不是入口所在。\n\n入口可能在你和 Slack 上的讨论里、会议总结里，或者你撰写项目更新并进行调研的时候。这些才是调用智能能力的入口。只要为用户提供好的入口，交互式聊天负责后续跟进，就能覆盖用户想完成的各种长尾任务。构建领域专属 Agent 时，就应该这么做。\n\n否则你就会遇到一个问题：我为什么不用 Claude 或 ChatGPT 来做这件事，而要使用你们的原生 Agent？\n\n**Peter Yang（主持人）：** Agent 很像一名员工，而员工不会只在一个应用里工作。\n\n**Nan（讲者）：** 是的，现在大家都在朝这个方向发展，尤其是随着最近陆续发布的新产品。\n\n**Peter Yang（主持人）：** 如果大家都通过 Agent 或 MCP 使用 Linear，而不是用现有的按钮和 UI，Kari 会不会介意？\n\n**Nan（讲者）：** 说实话不会，我觉得他完全不介意。Linear 天生就是一个多人协作系统，不同角色会以不同方式使用它。\n\n比如我们有很多客户支持人员，他们会把 Zendesk 或 Intercom 中的问题升级到 Linear，这就是他们使用 Linear 的全部方式。他们可以在 Intercom 插件里升级问题、选择模板，或者描述问题，就这些。但这非常有价值，因为这会成为其他人开展工作的输入流。\n\n**Peter Yang（主持人）：** 这是很好的观点。Kari 经常说产品要有明确的理念，但还是得允许用户从他们想用的任何工作流或服务中使用它。\n\n**Nan（讲者）：** 是的。\n\n## 限制与边界\n\n**核心判断：** 这套做法成立有前提——入口贴在工作现场、Agent 与人绑定、评测只做关键一致性，且长时运行仍受成本约束。\n\n- 入口设计脱离用户真实工作流时，产品会退化成又一个需要主动打开的聊天工具，用户会问“我为什么不用 Claude 或 ChatGPT”。\n- 放开自由度需要安全边界：团队明确表示“只要没有安全风险之类的问题”才不介意用户的各种要求。\n- 长时运行、目标循环类 Agent 必须权衡成本，模型能力“非常接近”但尚未完全就位。\n- 主观性强，团队自己承认可以永远在内部打磨下去，发布是主动接受部分可靠性差异的选择。\n- Agent 自行决定“该不该插话”这类判断仍是评测的难点，评判器本身也需要人工复核。\n\n## 知识连接\n\n- **支持** [[WorkBuddy团队-从模型到可用Agent的Harness工程]]：两篇都主张模型决定能力上限、上下文与 Harness 决定能否稳定落地；本篇用技能按需加载与“把产品方法写进技能”提供了产品侧的新证据。\n- **限制** [[3-6 生产级权限系统的四层防线]]：该篇以权限分层与审批疲劳作为核心防线，本篇给出边界条件——入口在 Slack 讨论串、由 Agent 自行推断待办时，必须让每个 Agent 与人绑定，否则任务会消失在聊天记录里。\n- **补充** [[Anthropic Agent 工程实战指南 - 从入门到生产落地]]：在通用 Agent 工程流程之上，补上“评测盯住用户意图而非输出一致性”和“原生 Agent 的护城河是默认工作方式”两条产品侧判断。\n\n## 来源说明\n\n- 来源：B站专栏 https://www.bilibili.com/opus/1241615577214091273（标题标注“Linear团队：构建生产级Agent的5条规则”）。\n- 形态判断：source_form 为 dialogue，含主持人 Peter Yang 与两位嘉宾的真实问答，故 dialogue_fidelity 取 source、question_source 取 column、content_form 取 dialogue。\n- 声音依据：主持人提问为栏目现场发言，两位嘉宾为直接发言；但专栏多处将嘉宾标为 unknown，无法逐句确认哪句属于 Nan、哪句属于 Jacob，正文以“Nan / Jacob（讲者）”合并标注。\n- 事实状态：partial。仅读取专栏文字与页面元数据，未读取官方播客原页，未使用图片、ASR 与 transcript，故 verification_scope 为 column_only。\n- 已删除：摘要与重点速览的重复条目、赞助广告段落（Oceanz）、章节预告、平台 UI 与关注提示。\n- 图片均未读取、未识别、未保存；未扫描 UP 主空间。",
  "rulesDigest": "67591166536f7a62288f7b77759be8155d0543f4871a90a692f340f0e3c61f86",
  "sourceReport": {
    "workflow": "bilibili_opus_ingest_v2",
    "sourceId": {
      "opus": "1241615577214091273",
      "column": "",
      "bv": ""
    },
    "route": {
      "sourceTier": "C2",
      "materialTier": "A",
      "sourceForm": "dialogue",
      "contentForm": "dialogue",
      "dialogueFidelity": "source",
      "questionSource": "column",
      "voiceBasis": "direct_speech"
    },
    "targetPath": "vault/00-Inbox/linear团队-构建生产级别agent的5条规则-哔哩哔哩-72c13f86.md",
    "sourcesRead": [
      "column"
    ],
    "sourcesSkipped": [
      "images",
      "transcript",
      "recastory",
      "original_page"
    ],
    "retention": {
      "totalUnits": 15031,
      "retained": 11181,
      "removed": 3850,
      "unresolved": 6
    },
    "relatedNotes": [
      "vault/02-Resources/AI and Agents/Agent Design & Patterns/WorkBuddy团队-从模型到可用Agent的Harness工程.md",
      "vault/01-Areas/AI Agent Development/03-Tool System/3-6 生产级权限系统的四层防线.md",
      "vault/02-Resources/AI and Agents/Agent Design & Patterns/Anthropic Agent 工程实战指南 - 从入门到生产落地.md"
    ],
    "conceptCandidates": [
      "ai_agent",
      "article",
      "bilibili",
      "context_engineering",
      "skills",
      "harness_engineering",
      "multi_agent"
    ],
    "mocUpdates": [],
    "checks": {
      "duplicate": true,
      "sourceCompleteness": true,
      "provenance": true,
      "retentionCoverage": true,
      "dialoguePlan": true,
      "voiceIntegrity": true,
      "numericContext": true,
      "constraintsPreserved": true,
      "relationQuality": true,
      "discussionReadiness": true,
      "frontmatter": true,
      "wikilinks": true,
      "semanticReview": false
    },
    "unresolved": [
      "专栏标注的'5条规则'未在正文中出现明确编号清单，正文实际按 8 个话题组织，规则条目对应关系无法确认。",
      "多数回答的说话人仅标为 unknown，除主持人 Peter Yang 与提及的 Jacob、Nan 外，具体哪句由 Nan 或 Jacob 说出无法逐句确认。",
      "未读取官方播客原页，仅以专栏文字为依据，无法交叉核验 Numeric 细节。",
      "对谈中未给出 Linear Agent 的发布日期、可用范围与版本号。",
      "主持人多次称呼对方为 Kari 或 Kakari（疑为 Linear CEO Karri Saarinen 的转写差异），该人名写法无法确认。",
      "开场前出现的赞助段落（Oceanz）属于广告，已按契约删除，不计入知识保留。"
    ],
    "status": "incomplete"
  },
  "proposalDigest": "f42e4873994496c977ba3cb20e63d2d779a1f3441041d679223cb00131e4e1a0"
}
```
<!-- syno:json:end -->
