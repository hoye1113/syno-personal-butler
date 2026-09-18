---
id: ingest-292d1f7a
candidateId: candidate-faaa69da
status: applied
suggestedPath: "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Kelo Code负责人-Agent工程方法论.md"
risk: high
created: 2026-09-16T15:22:43.451Z
---

# Ingest proposal: Kelo Code负责人：Agent工程方法论 - 哔哩哔哩

<!-- syno:json:start -->
```json
{
  "id": "ingest-292d1f7a",
  "candidateId": "candidate-faaa69da",
  "status": "applied",
  "suggestedPath": "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Kelo Code负责人-Agent工程方法论.md",
  "suggestedTags": [
    "ai_agent",
    "ai_coding",
    "article",
    "bilibili",
    "context_engineering",
    "harness_engineering",
    "prompting"
  ],
  "suggestedLinks": [
    "vault/00-Inbox/linkedin-工程师-领英的ai-agent-开发和部署实践-哔哩哔哩-b84b419d.md",
    "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿.md",
    "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code负责人-创造内幕.md"
  ],
  "risk": "high",
  "created": "2026-09-16T15:22:43.451Z",
  "sourceDescriptor": {
    "kind": "url",
    "originalUrl": "https://www.bilibili.com/opus/1193592886437871625",
    "canonicalUrl": "https://www.bilibili.com/opus/1193592886437871625",
    "publisher": "www.bilibili.com",
    "observedAt": "2026-09-16T15:22:43.369Z",
    "capturedAt": "2026-09-16T15:22:43.369Z",
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
    "opusId": "1193592886437871625",
    "sourceTier": "C2",
    "sourceForm": "lecture",
    "contentForm": "lecture",
    "dialogueFidelity": "none",
    "questionSource": "none",
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
      "来源为单篇 B站 opus 专栏，含完整文字稿与页面元数据，可追溯",
      "主题与 vault 主主题 AI Agent 高度相关，属代理工程方法论范畴",
      "正文含明确主张、机制、实践流程与限制条件，非纯新闻或纯教程截图",
      "专栏以第一人称现场演讲整理，声音归属可判定"
    ]
  },
  "materialTier": "A",
  "canonicalTags": [
    "ai_agent",
    "ai_coding",
    "article",
    "bilibili",
    "context_engineering",
    "harness_engineering",
    "prompting"
  ],
  "duplicateAssessment": {
    "matches": [
      "vault/00-Inbox/linkedin-工程师-领英的ai-agent-开发和部署实践-哔哩哔哩-b84b419d.md",
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿.md",
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code负责人-创造内幕.md",
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code负责人-AI原生团队如何使用AI.md",
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Banking负责人-Agent时代平台设计.md"
    ],
    "sameSource": false,
    "updateStatus": "new"
  },
  "relations": [],
  "mocChanges": [],
  "claimCandidates": [
    {
      "statement": "AI 编码代理的心智模型应是「精力充沛、知识广博但缺乏判断力的初级开发者」：速度快、不疲倦、无代码自负，但不理解业务背景与历史架构决策，会写出技术上正确而在情境上错误的代码",
      "stability": "model",
      "reviewAfter": "2027-09-16"
    },
    {
      "statement": "上下文并非越多越好：当上下文窗口填充度超过约 50% 时输出质量可能下降，冗余信息会干扰推理，糟糕或过时的上下文会持续「毒害」后续会话",
      "stability": "practice",
      "reviewAfter": "2027-03-16"
    },
    {
      "statement": "直接让 AI 写代码是低效根源，应走「研究-计划-实施」三段式循环：先用只读的询问模式产出研究文档，再在架构师模式产出含测试与范围边界的计划，最后在新会话中按计划实施并频繁提交审查",
      "stability": "practice",
      "reviewAfter": "2027-03-16"
    },
    {
      "statement": "agents.md 承载项目级常驻规则（编码约定、构建与测试命令、提交前检查），skills 承载按需调用的可复用工作流，两者层级不同、加载时机不同",
      "stability": "practice",
      "reviewAfter": "2027-03-16"
    },
    {
      "statement": "不必要的 MCP 服务器会通过系统提示词占用上下文并稀释注意力，可能诱导代理执行与当前任务无关的操作，未使用的服务器应当禁用",
      "stability": "practice",
      "reviewAfter": "2027-03-16"
    },
    {
      "statement": "上下文一旦明显偏离轨道，正确做法是开启新会话并由当前代理生成总结，而非在原会话中反复纠偏",
      "stability": "practice",
      "reviewAfter": "2027-03-16"
    },
    {
      "statement": "Brendan O'Leary 称 Armand（Flask 创建者）每日节省 30% 以上时间",
      "stability": "fact",
      "reviewAfter": "2027-03-16"
    },
    {
      "statement": "Dex Horthy：一条糟糕的研究路线会导致数百行糟糕的代码；AI 无法取代思考，只能放大已经完成的思考或放大没有彻底思考的事实",
      "stability": "principle",
      "reviewAfter": "2028-09-16"
    }
  ],
  "evidenceCandidates": [
    {
      "claimRef": "AI 编码代理是缺乏判断力的初级开发者",
      "sourceRef": "https://www.bilibili.com/opus/1193592886437871625",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "你必须把你的 AI 代理看作是一个精力充沛、热情洋溢、博览群书，但常常自信地犯错的初级开发者。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": "上下文填充过半导致质量下降",
      "sourceRef": "https://www.bilibili.com/opus/1193592886437871625",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "当上下文填充度超过 50% 时，输出质量可能会下降。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": "研究-计划-实施循环",
      "sourceRef": "https://www.bilibili.com/opus/1193592886437871625",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "我最终总会回到一个更简单的模式，那就是“研究-计划-实现（Research-Plan-Implement）”循环。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": "MCP 冗余会干扰推理",
      "sourceRef": "https://www.bilibili.com/opus/1193592886437871625",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "这些冗余信息可能会干扰代理，让它误以为现在需要操作数据库。所以我们要非常小心，不要过度堆砌 MCP。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": "每日节省 30% 时间的第三方数字",
      "sourceRef": "https://www.bilibili.com/opus/1193592886437871625",
      "sourceTier": "primary",
      "stance": "context",
      "excerpt": "Armand 还说，他每天节省了 30% 以上的时间，因为机器正在完成大部分工作。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": "agents.md 正在成为默认标准",
      "sourceRef": "https://www.bilibili.com/opus/1193592886437871625",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "agents.md 正在迅速成为各类代理的默认标准，用于存放自述文件以及关于项目的长期规则和细节。",
      "observedAt": "2026-09-16"
    }
  ],
  "unresolved": [
    "「上下文填充超过 50% 质量下降」是讲者经验判断，未给出基准测试、模型版本或测量方法，不可作为普适阈值",
    "30% 时间节省为转述的第三方说法，无原始出处与统计口径",
    "讲者为 Kilo Code 员工，agents.md / skills / MCP 相关建议与自家产品能力存在利益关联，需按厂商观点阅读",
    "摘要层的时间戳（如 [03:45]）来自平台生成，未与正文逐段核对，不作为事实依据",
    "「2025 年模型开始执行任务、2026 年处于当前时代」的年份表述依专栏原文保留，未经独立核验",
    "Karpathy 关于上下文工程的定义与 Dex Horthy 的两句引用均为专栏转述，未回溯原始出处",
    "未识别到 opus 对应的 cv 号与 BV 号，内嵌视频元数据缺失，无法做跨形态查重",
    "未读取专栏图片与任何 ASR/转写内容，图片中可能存在的架构图信息未纳入"
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
    "discussion_readiness"
  ],
  "sourceDigest": "faff6faf4897d00e177dc733798bed78507c571eec3313a82a1931089f04df5d",
  "existingNoteRef": "vault/00-Inbox/linkedin-工程师-领英的ai-agent-开发和部署实践-哔哩哔哩-b84b419d.md",
  "canonicalBody": "# Kelo Code 负责人：Agent 工程方法论\n\n> 讲者：Brendan O'Leary（Kilo Code，开发者关系；此前长期任工程经理与产品经理，曾在 GitLab 工作）。\n> 主题：从「使用 AI 工具」到「代理工程」的范式转变——角色定位、上下文工程、研究-计划-实施循环与代理配置。\n> 形态：单人演讲整理（source_form: lecture，直接发言）。\n> 阅读导航：01 讲角色定位，02 讲上下文为什么是核心技能，03-04 讲具体管法，05 讲三段式循环，06 讲代理配置，07 讲 MCP 与内部 API。\n>\n> **核心主张：** 决定交付质量的不是模型能力，而是开发者能否像带初级工程师一样，把研究、计划与上下文管理做在写代码之前。\n\n> AI 无法取代思考。它只能放大你已经完成的思考，或者放大你没有完成思考、没有彻底思考的事实。\n> ——Dex Horthy（专栏转述）\n\n## 开场\n\n大多数工程师说不清自己到底怎么用 AI 工作——不只会说「它让我写代码更快」，而是能讲出交付了什么、保留了什么、如何在这两者间做决定。现状是约 90% 的工程师用过 AI 工具，经常使用的可能只有一半。问题已经不是团队用不用 AI，而是把它当成协作伙伴，还是当成高级自动补全。\n\n## 01 把 AI 代理定位成缺判断力的初级开发者\n\n**核心判断：** 把 AI 代理当作精力充沛、博览群书但常常自信犯错的初级开发者来管理，是代理工程的起点。\n\nAI 与软件工程协作的历史很短：21 世纪初是补全代码行，2022 年是补全整个函数（GitHub Copilot 的突破点），到 2025—2026 年模型开始能执行任务——拆解任务、找到要改的文件、作出修改、自行运行测试、提交拉取请求。它不只是更快的马，而更像一位合作者。\n\n- 能力面：知识广度惊人，读过大量语言、框架与模式，无代码自负，要求重写六次也乐意照做，速度快、不易疲倦。\n- 缺口面：缺乏判断力，不知道业务背景，不明白三个月前某个架构决策的原因，会自信地写出技术上正确、情境上错误的代码。\n\n讲者引用 Flask 创建者 Armand 的判断：不再只是使用机器，而是在与机器合作；他因此每天节省 30% 以上时间，但前提是知道哪些工作可以外派、哪些必须自己做，不是盲目接受每个建议。\n\n## 02 上下文工程：不仅贵，而且会变笨\n\n**核心判断：** 上下文是昂贵资源，也是稀缺资源；更多的上下文不总是更好，超过临界点反而降低质量。\n\n之所以关键，有两层原因。\n\n- 成本：每个加入上下文的 Token 都增加开销，全部聊天历史在每次请求中作为输入 Token 重新计费，累积很快。\n- 质量：填充度超过约 50% 的上下文窗口时，输出质量可能下降，讲者称之为「愚蠢区域」。多出来的信息不是帮助，而是干扰。\n\n糟糕的上下文比过多上下文更麻烦。\n\n- 把两个不重叠的任务混在一个会话里，或让代码、注释中的过时信息留在上下文中，都会污染推理。\n- 代理不像人那样真正推理，它每次都拿全部历史上下文。当路线走错、错误决定堆积后试图「拉回来」，它可能在中间迷失，甚至把先前的负面信息当作参考，让错误模式反复出现。\n\n由此得出操作结论：一旦意识到偏离轨道，不要在原会话里挣扎，直接开新会话。\n\n## 03 上下文管理的具体做法\n\n**核心判断：** 把大量信息持久化在上下文窗口之外，按需精确引入，及时总结压缩。\n\n- 外置载体：草稿文件、内存文件、代理的 .md 文件，让代理知道当前工作重点。\n- 精确引入：用 @提及 指向具体文件，只取与当前步骤相关的内容，不做「一锅端」。\n- 精简开关：确认没有启用不必要的 MCP 服务器；确认喂给代理的数据是经过人类预先整理的。\n- 总结压缩：一次深入调试找到问题与解法后，正是压缩上下文、让代理重新聚焦的时机——告诉它「问题已经理解，接下来去解决」。\n- 隔离并行：把工作分散到多个代理或多个会话，避免信息过度积累，同时强制任务分离。这也是过去六到八个月并行代理明显增长的原因。\n\n这套做法和工程经理带初级工程师的方式高度重合。讲者讲了自己第一份工程经理岗位的经历：在医疗软件公司，他想让患者在 iPad 上填病史表，用 Balsamiq 画了线框原型，工具自带 Comic Sans 字体和滑稽笑脸占位符，他把线框直接交给暑期实习生。几周后拿到可运行原型，字体就是 Comic Sans，还带着笑脸——因为他的规范就是这么画的。错不在实习生，在于他没给出正确的上下文，没告诉对方什么重要、什么不重要、真正要解决的核心问题是什么。\n\n归纳成一句习惯：每个会话只完成一个任务；盯住上下文计量器；怀疑偏离时通常是对的，此时开新会话，并让当前代理为新会话生成总结（AI 很擅长为 AI 写提示词），人读过并确认符合理解后，再带着恰当上下文开始新会话。\n\n## 04 研究-计划-实施循环\n\n**核心判断：** 直接跳进代码阶段会制造错误假设、浪费时间并催生「AI 没用」的错觉；正确顺序是先理解问题，再定步骤，最后才写码。\n\n- 常见错误：开口就说「帮我实现 X 和 Y」。模型确实擅长输出大段代码，但演示友好不等于交付可靠；输入垃圾就得到垃圾，这也是部分人反 AI 的来源。\n- 判断依据：讲者引用 Dex Horthy——一条糟糕的研究路线可能会导致数百行糟糕的代码。\n\n**研究阶段（询问模式）**\n\n- 询问模式只聊天、可读文件、不写文件，因此不会被诱导直接给方案。\n- 目标是把系统摸清：现在如何运作、涉及哪些文件、遵循哪些范式、与现有功能的差异、在代码库中的位置、数据流向、以及需要顾及的边缘情况。\n- 产出是一份研究文档，人读过并确认它符合自己对问题的理解后才继续。\n\n**计划阶段（架构师模式）**\n\n- 明确要创建或修改哪些文件，如何验证改动正确、需要哪些测试。\n- 明确范围边界：哪些在范围内、哪些不在、哪些改变、哪些保持原样。\n- 产出是一份计划文件（很多仓库已有 plans 文件夹），包含分步说明、具体改动、验证用的测试命令、对系统的影响评估。计划要清晰到可以交给更小、更快、更便宜的模型去执行，因为最难的思考已经在研究和计划阶段完成。\n- 计划中夹带代码片段并不总是好主意。\n\n**实施阶段（代码模式）**\n\n- 重新开一个会话，只提供计划好的执行步骤，让该会话上下文保持在极低水平。\n- 逐项审查每个改动并频繁提交。讲者曾在 GitLab 工作多年，把本地 Git 提交当作与代理的第一轮 PR 审查，通过后再交给同事。\n\n人力和时间应重点押在研究和计划阶段。进入实施时，艰巨的思考应该已经完成。Dex Horthy 的另一句判断：AI 无法取代思考，它只能放大你已经完成的思考，或放大你没有彻底思考的事实。\n\n## 05 代理配置：模式、agents.md 与 skills\n\n**核心判断：** 用角色化模式约束行为，用 agents.md 承载常驻项目规则，用 skills 承载按需调用的可复用工作流。\n\n- 模式（按角色）：架构师模式用于规划，询问模式用于研究，代码模式用于实施。\n- 规则（按作用域）：可为工作区、特定仓库甚至本机全局建立始终遵守的标准。代理善于加载和理解规则，但规则必须写下来才能进入上下文。\n- 权限（需自行设定）：同时调用多少个代理、是否使用工作树以便合并回本地仓库再提 PR、自动批准的权限范围有多大。具体到它能独立完成什么、能自主使用哪些工具、能否读取文件、能否读取工作区以外的文件、能否运行测试、哪些操作必须人工批准。刚开始就要设到自己舒适的程度，之后随熟悉度调整。\n\nagents.md 与 skills 的区别是本节的落点。\n\n- agents.md 正在迅速成为各类代理的默认标准，用于存放项目自述与长期规则细节，内容应是代理必须了解的最低限度信息：编码约定、构建或测试命令、测试要求、提交前必查事项。它几乎总是被加载进上下文。\n- skills 是特定工作流程，可理解为可重用的代理「剧本」，适合反复执行的任务，例如制作动态图形、每日/每周/月度 changelog 编译。它按需使用，由人指示代理调用。\n\n## 06 MCP 与内部系统接入\n\n**核心判断：** MCP 扩展了工具能力，但每个启用的服务器都会把自身描述写进系统提示词并在每次交互时发送，未使用的服务器应当关闭。\n\n- MCP 的定位：模型最初只能收输入 Token、产输出 Token，后来获得工具调用能力去影响环境（例如跑测试）；MCP 进一步让代理接入外部工具，例如通过 GitHub MCP 查找 PR、评论或 issue，或通过 Context.ai 拉取最新框架文档，弥补 LLM 知识截止日期之后的空白。\n- 代价：目前已有成千上万个 MCP 服务器，每一个的详细信息都进入系统提示词。做前端工作却挂着 Postgres MCP，既浪费 Token，也可能干扰代理，让它误以为现在需要操作数据库。\n\n接入企业内部平台 API 的四条路径：\n\n- 已有 OpenAPI / Swagger 规范，直接用。\n- 没有规范就转成 Markdown，放进 agents.md 或仓库其他位置供引用。\n- 变化频繁的内容给一个参考 URL，让代理每次拉最新版本。\n- 拥有复杂多步骤、跨系统工作流的团队，构建专属 MCP 服务器可能是正确选择。\n\n无论哪条路径，都要把你的工作与代理的工作隔离开，并把代理产出当作 PR 来审查，像审初级工程师的代码那样看。\n\n## 07 高级用户习惯与工具面\n\n**核心判断：** 在基础范式之上，用低成本交互手段持续供给精确上下文，并接受代理能力正在离开 IDE。\n\n- 提及上下文：直接提及文件、提交记录或终端输出，把相关内容快速引入上下文。\n- 斜杠命令：用于启动新任务或在上下文过载时压缩。\n- 编辑器集成：选中一段代码右键加入代理上下文，即可就这段代码讨论或要求修改；提示词输入过程本身也有自动补全。\n- 超越 IDE：代理能力延伸到命令行、手机端、云端代理甚至 Slack，随时随地可用正成为用户对代理产品的普遍期待。\n\n收尾建议是把这套东西当手艺来练：选一个工具大量练习，通过练习摸清哪些环节可以信任模型，再试「研究、计划、实施」的反馈循环。讲者说，不少资深工程师反馈现在编程比过去多年更有趣，因为繁琐重复劳动交给了代理，大脑腾出来解决更难的工程问题。\n\n## 限制与边界\n\n- 「上下文填充超过 50% 质量下降」是讲者的经验判断，没有给出基准测试、模型版本与测量方法，不应作为通用阈值使用。\n- 「每天节省 30% 以上时间」是转述 Armand 的第三方说法，无原始出处与统计口径。\n- 讲者就职于 Kilo Code，文中 agents.md/skills/MCP 的配置建议与该产品的能力边界高度重合，阅读时应视为厂商视角。\n- 四条内部 API 接入路径来自「企业客户反馈」的归纳，没有给出案例细节与失败情况。\n- 关于 21 世纪初到 2025—2026 年的能力演进叙述是讲者的时间线概括，具体年份未经独立核验。\n\n## 知识连接\n\n- **补充** [[LinkedIn 工程师：领英的AI Agent 开发和部署实践]]：LinkedIn 笔记从企业侧讲可发现、可执行、可持续更新的上下文基础设施；本文从个人开发者侧补充同一条命题的落地件——agents.md 承载常驻规则、skills 承载可复用剧本、上下文按会话隔离。\n- **支持** [[Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿]]：本文的「研究-计划-实施」循环与「代理是合作者而非工具」的定位，为该笔记中 AI 原生工作方式的论断提供了实践侧的流程证据。\n- **限制** [[Banking负责人-Agent时代平台设计]]：该笔记面向受监管金融机构的平台抽象与治理；本文的上下文管理与 MCP 精简建议来自工具厂商与个人开发者场景，未覆盖合规、审计与多人协作边界，其结论在强监管平台中需附加条件。\n\n## 来源说明\n\n- 来源形态：B站单篇图文专栏（opus 1193592886437871625），页面标题「Kelo Code负责人：Agent工程方法论」。\n- 读取范围：仅专栏文字与页面元数据；图片、ASR、转写与 Recastory 一律跳过，未扫描 UP 主空间。\n- 声音依据：专栏为讲者现场发言的直接整理，使用第一人称 direct_speech；文中 Armand、Karpathy、Dex Horthy 的引语均为专栏转述，已在相应位置标注转述关系。\n- 事实状态：partial（部分）。`verification_scope: column_only`，只表示本笔记忠实于专栏，不代表外部事实已独立核验；引用的数字与年份按 unresolved 对待。\n- 已删除内容：平台生成的摘要与「重点速览」（与正文重复）、时间戳与时间轴（图文专栏无信息量）、产品引流片段（Kilo 与 Open Claw 介绍、官网与反馈邀请）。\n- 未决项见报告 unresolved 列表。",
  "rulesDigest": "67591166536f7a62288f7b77759be8155d0543f4871a90a692f340f0e3c61f86",
  "sourceReport": {
    "workflow": "bilibili_opus_ingest_v2",
    "sourceId": {
      "opus": "1193592886437871625",
      "column": "",
      "bv": ""
    },
    "route": {
      "sourceTier": "C2",
      "materialTier": "A",
      "sourceForm": "lecture",
      "contentForm": "lecture",
      "dialogueFidelity": "none",
      "questionSource": "none",
      "voiceBasis": "direct_speech"
    },
    "targetPath": "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Kelo Code负责人-Agent工程方法论.md",
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
      "totalUnits": 9902,
      "retained": 5486,
      "removed": 4416,
      "unresolved": 8
    },
    "relatedNotes": [],
    "conceptCandidates": [
      "ai_agent",
      "ai_coding",
      "article",
      "bilibili",
      "context_engineering",
      "harness_engineering",
      "prompting"
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
      "「上下文填充超过 50% 质量下降」是讲者经验判断，未给出基准测试、模型版本或测量方法，不可作为普适阈值",
      "30% 时间节省为转述的第三方说法，无原始出处与统计口径",
      "讲者为 Kilo Code 员工，agents.md / skills / MCP 相关建议与自家产品能力存在利益关联，需按厂商观点阅读",
      "摘要层的时间戳（如 [03:45]）来自平台生成，未与正文逐段核对，不作为事实依据",
      "「2025 年模型开始执行任务、2026 年处于当前时代」的年份表述依专栏原文保留，未经独立核验",
      "Karpathy 关于上下文工程的定义与 Dex Horthy 的两句引用均为专栏转述，未回溯原始出处",
      "未识别到 opus 对应的 cv 号与 BV 号，内嵌视频元数据缺失，无法做跨形态查重",
      "未读取专栏图片与任何 ASR/转写内容，图片中可能存在的架构图信息未纳入"
    ],
    "status": "incomplete"
  },
  "proposalDigest": "e956f873e7a5cef80dd9927e27eae592e75beb60b5e1b361dd2b240d99ad2e20"
}
```
<!-- syno:json:end -->
