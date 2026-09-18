---
id: ingest-e4f3f556
candidateId: candidate-b4d45075
status: applied
suggestedPath: "vault/00-Inbox/openai团队-openai的-harness工程实践-哔哩哔哩-0145f85f.md"
risk: merge
created: 2026-09-16T15:22:38.614Z
---

# Ingest proposal: OpenAI团队：OpenAI的 Harness工程实践 - 哔哩哔哩

<!-- syno:json:start -->
```json
{
  "id": "ingest-e4f3f556",
  "candidateId": "candidate-b4d45075",
  "status": "applied",
  "suggestedPath": "vault/00-Inbox/openai团队-openai的-harness工程实践-哔哩哔哩-0145f85f.md",
  "suggestedTags": [
    "ai_agent",
    "bilibili",
    "video_transcript",
    "harness_engineering",
    "context_engineering",
    "multi_agent",
    "loop_engineering",
    "skills"
  ],
  "suggestedLinks": [
    "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI研究员-Harness工程软件开发新范式.md",
    "vault/02-Resources/AI and Agents/B站视频知识库/行业观点与组织/OpenAI团队-FDE工程师的未来.md",
    "vault/00-Inbox/linkedin-工程师-领英的ai-agent-开发和部署实践-哔哩哔哩-b84b419d.md"
  ],
  "risk": "merge",
  "created": "2026-09-16T15:22:38.614Z",
  "sourceDescriptor": {
    "kind": "url",
    "originalUrl": "https://www.bilibili.com/opus/1192958949259739139",
    "canonicalUrl": "https://www.bilibili.com/opus/1192958949259739139",
    "publisher": "www.bilibili.com",
    "observedAt": "2026-09-16T15:22:38.429Z",
    "capturedAt": "2026-09-16T15:22:38.429Z",
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
    "opusId": "1192958949259739139",
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
      "来源为用户提供的单篇 B站 opus 专栏，正文为 Host-Guest 播客中文对谈稿，人物、团队、时间线、机制与数字均可归属",
      "内容围绕 OpenAI Frontier 的 Harness/组装站工程实践，与 vault 主线（AI Agent 时代）高度一致，超过收录阈值",
      "专栏为对谈转写形态，含明确主持人、嘉宾和可追溯的章节锚点（时间戳为原创栏目结构，非本笔记排版元素）",
      "存在与已收录笔记的同源/近源重叠（同一嘉宾 Ryan Lopopolo 的 Harness 工程话题），按 merge 风险处理，仅形成一篇 canonical 并标注近重复关系"
    ]
  },
  "materialTier": "A",
  "canonicalTags": [
    "ai_agent",
    "bilibili",
    "video_transcript",
    "harness_engineering",
    "context_engineering",
    "multi_agent",
    "loop_engineering",
    "skills"
  ],
  "duplicateAssessment": {
    "matches": [
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI研究员-Harness工程软件开发新范式.md",
      "vault/02-Resources/AI and Agents/B站视频知识库/行业观点与组织/OpenAI团队-FDE工程师的未来.md",
      "vault/00-Inbox/linkedin-工程师-领英的ai-agent-开发和部署实践-哔哩哔哩-b84b419d.md",
      "vault/02-Resources/AI and Agents/Agent Design & Patterns/WorkBuddy团队-从模型到可用Agent的Harness工程.md",
      "vault/02-Resources/AI and Agents/Agent Design & Patterns/2026 年 Agent 最重要的工程概念 Harness Engineering.md"
    ],
    "sameSource": false,
    "updateStatus": "new"
  },
  "relations": [],
  "mocChanges": [],
  "claimCandidates": [
    {
      "statement": "当模型无法直接完成任务时，正确的做法是构建更小的构建块（组装站、CLI、脚本），再组合成更广的目标，而不是替代理手写代码。",
      "stability": "practice"
    },
    {
      "statement": "模型是极易并行化的，团队同步的人工注意力才是唯一根本稀缺资源，因此评审应异步化甚至后置到合并之后。",
      "stability": "principle"
    },
    {
      "statement": "内部循环需要一分钟内的构建速度；当构建变慢时让代理去重构构建图（Makefile→Bazel→Turbo→NX），而不是人工优化。",
      "stability": "practice"
    },
    {
      "statement": "把编码代理作为入口点（以 Codex 启动本地堆栈）比为人预先搭好环境再启动代理更有效，代理有了足够上下文就能自主选择工具。",
      "stability": "practice"
    },
    {
      "statement": "软件以规范（Spec）而非二进制或源码分发，代理按高保真规范在本地重新组装系统，可显著降低分发与适配成本。",
      "stability": "model",
      "reviewAfter": "2026-12-31"
    },
    {
      "statement": "不要给代理太多通用 MCP 工具，因为会强制注入大量 token 并干扰自动压缩；暴露少量精炼 CLI（shim）对代理更友好。",
      "stability": "practice"
    },
    {
      "statement": "人类仍应负责难且新的问题（空白领域、界面形态未知的深层重构），其余象限在正确脚手架下基本已解决。",
      "stability": "model",
      "reviewAfter": "2026-12-31"
    },
    {
      "statement": "编码代理会盲目遵循指令，因此提示中必须显式允许它们推迟、提出异议或不执行审查反馈。",
      "stability": "practice"
    }
  ],
  "evidenceCandidates": [
    {
      "claimRef": 0,
      "sourceRef": "https://www.bilibili.com/opus/1192958949259739139",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "当模型无法直接完成任务时，你就需要双击进入，构建更小的构建块，然后再将它们重新组合成更广泛的目标。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": 1,
      "sourceRef": "https://www.bilibili.com/opus/1192958949259739139",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "唯一根本稀缺的资源是我们团队同步的人工注意力。一天只有那么多小时，我们需要吃饭、睡觉。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": 2,
      "sourceRef": "https://www.bilibili.com/opus/1192958949259739139",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "我们从定制的 Makefile 构建转向了 Bazel，再到 Turbo，最后转向了 NX...一分钟只是一个我们能够达到的、不错的整数目标。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": 3,
      "sourceRef": "https://www.bilibili.com/opus/1192958949259739139",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "我们不是设置一个环境来启动编码代理，而是直接启动编码代理作为入口点，也就是 Codex。然后我们通过技能（Skills）和脚本赋予 Codex 启动堆栈的能力。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": 4,
      "sourceRef": "https://www.bilibili.com/opus/1192958949259739139",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "你定义了一个规范，说明如何构建自己的系统，尽可能详细地说明一个编码代理在本地重新组装它所需的一切。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": 5,
      "sourceRef": "https://www.bilibili.com/opus/1192958949259739139",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "我对 MCP 持悲观态度，因为它强制将所有这些 token 注入上下文中，我对此没有发言权。它们会干扰自动压缩。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": 6,
      "sourceRef": "https://www.bilibili.com/opus/1192958949259739139",
      "sourceTier": "primary",
      "stance": "limits",
      "excerpt": "那些又难又新的东西仍然需要人类驱动。但我觉得其他象限在给定正确的脚手架和能够驱动代理完成任务的正确工具的情况下，基本上已经解决了。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": 7,
      "sourceRef": "https://www.bilibili.com/opus/1192958949259739139",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "如果没有这种允许\"不执行\"的上下文，编码代理就会倾向于它们最擅长的事：盲目遵循指令。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": 4,
      "sourceRef": "vault/02-Resources/AI and Agents/Agent Design & Patterns/2026 年 Agent 最重要的工程概念 Harness Engineering.md",
      "sourceTier": "secondary",
      "stance": "context",
      "excerpt": "官方文章对 Harness Engineering 概念的定义与一般化描述，与讲者所述具体实现互为语境。",
      "observedAt": "2026-09-16"
    }
  ],
  "unresolved": [
    "专栏标注时间戳（07:12 等）无法与官方播客原始音频对位核验，本笔记按发布结构保留，未做时轴校验。",
    "讲者提到的模型版本号（5.2/5.3/5.4、Spark、X4）与发布日期无法在本次收录中独立核验，属发布时点时效信息。",
    "\"5 个月 100 万行代码 / 1500 个 PR / 每个工程师每天 3.5→5-10 个 PR\" 等数字仅来自专栏转写，未读取原始视频或官方材料，仅作检索线索。",
    "Symphony 是否已对外发布、幽灵库命名来源仅为播客中口述，缺少官方链接。",
    "专栏为中文译文转写，个别术语（组装站、爪子/Model-View-Claw、美元土地技能）为译者用词，原文英文原名未核验。"
  ],
  "validators": [
    "bilibili-opus-validate.py --sources-read column",
    "source_completeness: column_only（忠实于专栏，未读原视频）",
    "voice_integrity: Host-Guest 真实姓名均来自专栏，未做人物化重构",
    "retention_coverage: 保留核心主张、机制、数字、限制与反例；删摘要/重点速览重复、章节预告、寒暄与办公室闲聊",
    "dialogue_plan: 5 章问题独立，无同义重复",
    "numeric_context: 所有数字保留原始上下文（时间线、团队规模、构建时长）",
    "relation_quality: 4 条带类型关系，均说明判断/机制层面的关联",
    "discussion_readiness: 正文足以支撑\"Harness 工程如何落地\"的检索与讨论"
  ],
  "sourceDigest": "d39b73641e40d42e423ec9b0659ef06a5d451d53beb478b66102647e11ca7e83",
  "existingNoteRef": "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI研究员-Harness工程软件开发新范式.md",
  "canonicalBody": "# OpenAI 团队：Harness 工程实践 —— 零人工代码与 Symphony\n\n> 本笔记收录自 B站 opus 专栏（对谈稿转写）。讲者是 OpenAI Frontier 团队的 Ryan Lopopolo，主持为播客主持人；话题是他在 5 个月里用编码代理构建一个百万行代码内部产品的完整工程方法。\n>\n> 全篇沿着一条线展开：当代理足够强、Token 足够便宜时，工程的主战场从\"写代码\"转移到\"搭建让代理能持续写对的脚手架\"，而人类唯一真正稀缺的资源是同步注意力。\n>\n> **核心主张：** 模型已经和工程师同构，唯一稀缺的是人类同步注意力；因此要构建高密度自动化脚手架（组装站、CLI、技能、规范），把人类从循环里移出去，只留在\"又难又新\"的问题上。\n\n> 别把代理关在盒子里。让代理完全掌控其领域。\n> ——Ryan Lopopolo\n\n## 开场\n\n讲者在 OpenAI Frontier 部门做前沿产品探索：把模型部署成可售卖给企业的打包终端产品。他此前在 Snowflake、Brex、Stripe、Citadel 做工程。\n\n项目起点是一个看似不可能的限制：团队不亲手写一行代码。理由是——如果我们要造能部署给企业的代理，它们就应该能完成我所做的一切。经过与编码模型和工具合作六到八个月，讲者判断模型在能力和完成任务效率上已经与工程师同构。于是\"我不能写代码\"这个约束，反过来成了整个方法的前提：完成工作的唯一方式就是让代理替我完成。\n\n结果是五个月、三个人、超过一百万行代码、约 1500 个 PR，速度比手写快约 10 倍。\n\n## 01 零人工代码的极端约束\n\n**核心判断：** 强制\"不写一行代码\"的意义不在成果，而在它逼着团队从\"写代码\"转向\"构建工具和系统思维\"。\n\n**主持人：** 你们花了五个月做这个内部工具，没写一行代码，代码库超过一百万行，开发速度快 10 倍。这就是当时的心态吗？\n\n**Ryan Lopopolo：** 对。最早用 CLI 配 Codex 迷你模型，那个模型能力比今天差得多，但这反而是个很好的限制。要求模型给你构建产品功能是很直观的，但如果它无法把各部分组合起来，就定义了我们的心态：当模型无法直接完成任务时，你就需要双击进入，构建更小的构建块，再重新组合成更广泛的目标。\n\n前一个半月我的进度比平时慢 10 倍，相当痛苦。但因为这个代价，我们得到了比任何单个工程师都更高效的东西——我们为代理构建了叫\"组装站\"的工具，让它完成所有工作。随着 GPT 系列模型不断更迭，我们也得跟着调整代码库。\n\n有一个很具体的细节：5.2 版本时 Codex 没有后台 shell，我们可以靠阻塞脚本执行长任务。5.3 版本出现后台 shell 后，模型变得不那么耐心，不再愿意等阻塞，我们不得不重调整个构建系统，让它必须一分钟内完成。于是构建从定制 Makefile 到 Bazel，到 Turbo，最后停在 NX。\n\n- 约束：不写一行代码\n- 拐点：模型能力不足时，往下拆成更小的构建块\n- 代价：前 1.5 个月慢 10 倍\n- 收益：为代理构建\"组装站\"，长期效率高于任何单个工程师\n\n## 02 一分钟反馈循环与异步评审\n\n**核心判断：** 内部循环必须足够快，且评审必须异步化——因为人类同步注意力是唯一稀缺资源，跟不上代理的产出速度。\n\n**主持人：** 为什么构建必须在一分钟内？不是五分钟？\n\n**Ryan Lopopolo：** 因为我们希望内部循环尽可能快。一分钟只是一个能达到的整数目标。如果构建没在一分钟内完成，我们不杀进程，而是把它当作信号：停止当前操作，通过\"双击\"分解构建图，让 CI 和后台恢复正常。这几乎像棘轮效应——不这样，构建时间会一直涨。\n\n由于 Token 便宜、模型并行度极高，我们可以不断修剪代码以维持这些不变性：代码和 SDLC 中的分散性大幅减少，流程更简单，可以依赖更多不变性。\n\n**主持人：** 人类反而是瓶颈了。三个人、一百万行代码、1500 个 PR。你们怎么处理\"人类只做 PR 评审\"这件事？\n\n**Ryan Lopopolo：** 目前大部分人工审查发生在合并之后。本质上，模型极易并行化；只要愿意投 GPU 和 Token，我就有能力处理代码库。唯一根本稀缺的资源是我们团队同步的人工注意力——一天只有那么多小时，要吃饭、睡觉。\n\n所以必须退后一步用系统思维问：代理在哪里犯了错？我把时间花在哪了？我如何以后省下这些时间、并对自动化建立信心？我们投入精力让模型具备可观察性：从向量数据库到所有登录指标 API，只花了我半个下午。\n\n评审机制的调整：\n\n- 评审代理被指示\"偏向合并\"，除非发现优先级高于 P2 的问题（P2 未严格定义，只给了大致框架）\n- 编码代理被赋予灵活性：可以推迟或反对审查反馈，把参考性意见归档到待办、留待修复周处理\n- 没有\"允许不执行\"的上下文，编码代理就会倾向于它最擅长的事：盲目遵循指令；最初它常被评审代理\"欺负\"，导致事情无法收敛\n\n## 03 模型-视图-爪子：把 Codex 当测试框架\n\n**核心判断：** 不是为人写代码，而是为代理写代码——把 Codex 直接作为测试框架和入口点，并给它 CLI 与技能去自主驱动全栈。\n\n**主持人：** 你们的工作方式似乎就是按模型喜欢的方式写软件：对人类可读性更低，对代理可读性更好。\n\n**Ryan Lopopolo：** 这种心态强调\"把我排除在流程之外\"。就像领导一个 500 人组织的技术负责人，不可能深入每个 PR。所以我推行基于命令的类处理重复业务逻辑块，自动带跟踪、指标和可观察性；我关注的不是业务逻辑结构，而是它是否用了这些基本元素，因为我知道这会默认带来杠杆。\n\n我们在 Electron 内部以 MVC 方式做了严格分解。MVC 是模型-视图-控制器，我的人工智能原生版本是模型-视图-爪子（Model-View-Claw）——\"爪子\"指测试框架。把 Codex 作为测试框架，把产品、用户旅程压缩成代码，然后只用提示与模型沟通，这件事非常自然。\n\n一个关键操作细节是颠倒逻辑：\n\n- 不是先设置环境再启动编码代理，而是直接以 Codex 作为入口点\n- 通过技能和脚本赋予 Codex 启动堆栈的能力；它选择启动，就知道怎么设环境变量\n- 本地应用指向它选择启动的堆栈\n\n这与把模型放进\"预定义状态转换的盒子\"的旧做法根本不同：现在是让模型和工具成为整个盒子，给大量选项，让它在有足够上下文时自己做判断。\n\n## 04 幽灵库：以规范分发软件\n\n**核心判断：** 软件可以不再以二进制或源码分发，而以高保真规范分发，代理在本地按规范重新组装系统，从而大幅降低共享与适配成本。\n\n**主持人：** 你在 Symphony 里把规范当作分发形态，Twitter 上有人称之为\"幽灵库\"。\n\n**Ryan Lopopolo：** 这意味着与世界分享软件的成本大大降低。你定义一份规范，尽可能详细地说明编码代理在本地重新组装它所需的一切。把专有仓库里已有的脚手架拿出来，让 Codex 以我们仓库为参考写规范，然后循环：\n\n- 启动 tmux，生成一个断开的 Codex 去实施规范\n- 等它完成，再生成另一个 Codex 和另一个 tmux，对比实施结果与上游并更新规范，使分歧更小\n- 反复循环，直到得到能重现系统的高保真规范\n\nSymphony 选 Elixir 是模型选的：进程监督和通用服务器非常适合这里的进程编排——为每个任务启动小型守护进程并驱动它完成，模型通过 Elixir 和 BEAM 免费获得了大量能力。\n\nSymphony 里还有一个\"返工\"状态：PR 被提给人类审查后应该是一次廉价判断；不行就移到返工区，Elixir 服务把整个工作树和 PR 清掉、从头开始，并复盘为什么被废弃、在把工单移回\"进行中\"前修掉。\n\n## 05 CLI、技能蒸馏与不把代理关在盒子里\n\n**核心判断：** CLI 比 MCP 更省 token 也更可控；团队的杠杆来自对齐一组少量技能；代理能看到自己的轨迹并开票，才能真正把人类从运维里解放出来。\n\n**Ryan Lopopolo：** 我对 MCP 持悲观态度，它强制把大量 token 注入上下文，我对此没有发言权，它们会干扰自动压缩，代理可能忘记怎么用工具。Playwright 里我真正想用的调用可能只有三四个，却为很多不必要的东西付了代价。后来有人做了本地守护进程，启动 Playwright 并暴露一个极小的 shim CLI 来驱动，我完全不知道这件事发生了。\n\nCLI 好，因为 token 效率高、也容易优化：\n\n- 给 Prettier 传静默模式，代理不关心每个文件是否格式化，只想知道整体是否格式化\n- 把 pnpm 递归脚本的大量输出封装起来，只输出测试失败的部分\n- 给 Codex GitHub CLI，附上\"CI 必须通过\"的指令，这本身就是机构知识，不需要为此写大量代码\n\n知识回灌的机制：当我们因缺少超时设置收到告警，我可以在 Slack 里把 Codex 拉进来，让它修的同时更新可靠性文档，要求所有网络调用必须设置超时。这不只是即时修复，而是把\"什么是好实践\"固化成过程知识。\n\n技能蒸馏：\n\n- 仓库里只有大约六种技能；软件开发循环里某部分没被覆盖时，第一尝试是把它编码进已有技能\n- 让 Codex 查看自己的会话日志，问它如何更好地使用这个工具——这是内省\n- 每天把团队所有代理轨迹吸收进 Blob 存储，跑代理循环找出团队可以在哪些方面做得更好，并反映回仓库，让每个人免费受益于他人的经验\n\n讲者反复强调的一句话是：不要把代理关在盒子里。让代理完全掌控其领域——包括监控指标、日志和 Slack。当它能看到自己的调用轨迹并具备内省能力，就能自主修复非功能性需求（如超时处理）。有一次发生没有触发告警的故障，它用现有仪表板、指标和日志找出监控空白并一次性修复。\n\n## 限制与边界\n\n- 这套做法建立在一个新仓库上；讲者承认它也适用于要交付客户的生产产品，但发布分支剪切仍有人工参与，推广给用户前需人工批准的冒烟测试。\n- 没有持续部署：因为是原生应用，不是要求九个九可靠性的基础设施。\n- 多数人不会这样工作：团队每天 45 分钟站会用来同步对当前状态的理解；讲者说\"单人多代理\"模式很好，\"多人多代理\"则会全面爆炸。\n- 依赖内部化的边界：中低复杂度（几千行代码量级）的依赖可以一个下午内部化；像 Linux、MySQL、Datadog、Temporal 这种级别仍有规模测试与安全门槛，讲者承认此时\"你必须重新组合所有这些零碎的部分\"才能建立信心。\n- 讲者承认自己经常搞不清代码的实际状态，因为很多事不是他做的，这是这种操作方式的混乱面。\n- 关于 Spark 这类小模型，讲者还没找到用法：它更快，但用来做高级推理任务时\"在写一行代码之前就进行了三次压缩\"。\n\n## 知识连接\n\n- **补充** [[OpenAI研究员-Harness工程软件开发新范式]]：同一位讲者讨论 Harness 工程的续篇，本篇补充了 5 个月 100 万行代码、零人工代码约束、一分钟构建、合并后评审、Symphony 与幽灵库等具体机制与数字。\n- **应用于** [[2026 年 Agent 最重要的工程概念 Harness Engineering]]：官方文章给出的概念在本篇有了可核验的落地实例——on-policy Harness 与自动化装配线如何在一个真实团队中运作。\n- **限制** [[WorkBuddy团队-从模型到可用Agent的Harness工程]]：产品视角给出的是通用框架；本篇限定了它的适用前提——\"人类同步注意力是唯一稀缺资源\"与\"外部独立的 Harness 会被弃用\"只在极端自动化团队中成立。\n- **支持** [[OpenAI团队-FDE工程师的未来]]：同属 OpenAI 团队的播客对谈，本篇用 CLI 与技能蒸馏的实践例证，补充了该篇关于企业部署与工程角色转变的判断。\n\n## 来源说明\n\n- 来源形态：B站 opus 专栏，Host-Guest 对谈稿转写（中文），非讲者本人撰写。\n- source_tier: C1；material_tier: A；source_form/content_form 均为 dialogue；dialogue_fidelity: source；question_source: column；voice_basis: direct_speech。\n- factual_status: partial，verification_scope: column_only。本笔记忠实于所读专栏文字，未读取原始视频音频或官方材料；文中模型版本号、发布日期、代码行数与 PR 数仅来自专栏转写，未独立核验，引用时请附来源并披露此范围。另参考 vault 内官方文章译本作为概念语境，其核对范围不覆盖本专栏事实。\n- 未决项见收录报告 unresolved；图文专栏的图片、transcript、Recastory 与 ASR 按 v2 契约跳过。",
  "rulesDigest": "67591166536f7a62288f7b77759be8155d0543f4871a90a692f340f0e3c61f86",
  "sourceReport": {
    "workflow": "bilibili_opus_ingest_v2",
    "sourceId": {
      "opus": "1192958949259739139",
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
    "targetPath": "vault/00-Inbox/openai团队-openai的-harness工程实践-哔哩哔哩-0145f85f.md",
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
      "totalUnits": 29044,
      "retained": 5479,
      "removed": 23565,
      "unresolved": 5
    },
    "relatedNotes": [],
    "conceptCandidates": [
      "ai_agent",
      "bilibili",
      "video_transcript",
      "harness_engineering",
      "context_engineering",
      "multi_agent",
      "loop_engineering",
      "skills"
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
      "专栏标注时间戳（07:12 等）无法与官方播客原始音频对位核验，本笔记按发布结构保留，未做时轴校验。",
      "讲者提到的模型版本号（5.2/5.3/5.4、Spark、X4）与发布日期无法在本次收录中独立核验，属发布时点时效信息。",
      "\"5 个月 100 万行代码 / 1500 个 PR / 每个工程师每天 3.5→5-10 个 PR\" 等数字仅来自专栏转写，未读取原始视频或官方材料，仅作检索线索。",
      "Symphony 是否已对外发布、幽灵库命名来源仅为播客中口述，缺少官方链接。",
      "专栏为中文译文转写，个别术语（组装站、爪子/Model-View-Claw、美元土地技能）为译者用词，原文英文原名未核验。"
    ],
    "status": "incomplete"
  },
  "proposalDigest": "011cc130cb294c8421185a1c92a4bfc09f92e1b21b7280d57a989ddbc28df6f0"
}
```
<!-- syno:json:end -->
