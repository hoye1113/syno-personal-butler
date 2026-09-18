---
id: ingest-4fafd357
candidateId: candidate-f57e095b
status: rejected
suggestedPath: "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI Build Hours-用API和Codex构建Agent-20260916.md"
risk: high
created: 2026-09-16T15:22:53.085Z
---

# Ingest proposal: OpenAI 团队：用API和Codex,构建Agent教程 - 哔哩哔哩

<!-- syno:json:start -->
```json
{
  "id": "ingest-4fafd357",
  "candidateId": "candidate-f57e095b",
  "status": "rejected",
  "suggestedPath": "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI Build Hours-用API和Codex构建Agent-20260916.md",
  "suggestedTags": [
    "ai_agent",
    "article",
    "bilibili",
    "harness_engineering",
    "context_engineering",
    "multi_agent",
    "skills",
    "mcp"
  ],
  "suggestedLinks": [
    "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-构建全能AI营销团队.md",
    "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI官方-Codex新手教程.md",
    "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI播客-用Codex处理日常工作.md"
  ],
  "risk": "high",
  "created": "2026-09-16T15:22:53.085Z",
  "sourceDescriptor": {
    "kind": "url",
    "originalUrl": "https://www.bilibili.com/opus/1187021590734307333",
    "canonicalUrl": "https://www.bilibili.com/opus/1187021590734307333",
    "publisher": "www.bilibili.com",
    "observedAt": "2026-09-16T15:22:53.024Z",
    "capturedAt": "2026-09-16T15:22:53.024Z",
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
    "opusId": "1187021590734307333",
    "sourceTier": "C2",
    "sourceForm": "dialogue",
    "contentForm": "dialogue",
    "dialogueFidelity": "source",
    "questionSource": "column",
    "voiceBasis": "direct_speech",
    "factualStatus": "partial",
    "factualReviewed": "2026-09-16",
    "verificationScope": "column_only",
    "verificationBasis": [
      "column"
    ]
  },
  "quality": {
    "status": "accepted",
    "reasons": [
      "单篇用户提供的 B站 opus 专栏，含完整标题、说话人署名与时间戳章节结构，属 OpenAI Build Hours 直播对谈的文字专栏整理",
      "内容围绕 Codex/API 的智能体委派、脚手架工程与公司级上下文，与 vault 主题（AI Agent 时代）高度一致",
      "正文含明确主张、机制、案例、数字与限制，密度足以支撑 canonical 对谈",
      "存在可追溯的说话人（Christine/Charlie Guo/Ryan Lopopolo/Mitch），来源形态判断可执行",
      "篇幅与知识增量均超过最低质量门"
    ]
  },
  "materialTier": "A",
  "canonicalTags": [
    "ai_agent",
    "article",
    "bilibili",
    "harness_engineering",
    "context_engineering",
    "multi_agent",
    "skills",
    "mcp"
  ],
  "duplicateAssessment": {
    "matches": [
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-构建全能AI营销团队.md",
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI官方-Codex新手教程.md",
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI播客-用Codex处理日常工作.md",
      "vault/02-Resources/AI and Agents/B站视频知识库/行业观点与组织/OpenAI PM-Rohan Varma 用Codex 研发产品.md",
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex产品负责人-Codex团队如何用Codex.md"
    ],
    "sameSource": false,
    "updateStatus": "new"
  },
  "relations": [
    {
      "type": "extends",
      "target": "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex产品负责人-Codex团队如何用Codex.md",
      "reason": "该笔记记录 Codex 团队自用工作流；本文在同一判断上补充了 agent legibility 七指标与 Symphony 工单队列编排器，把“团队自己用”推进到“如何用约束让智能体产出可合并 PR”这一层。"
    },
    {
      "type": "supports",
      "target": "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI官方-Codex新手教程.md",
      "reason": "该教程给出 AGENTS.md / config.toml / MCP 的操作路径；本文给出这些动作的目的判断——非功能性需求要写进仓库才能在源头禁止 AI 废料，为教程中的操作提供机制解释。"
    }
  ],
  "mocChanges": [],
  "claimCandidates": [
    {
      "statement": "软件开发已从自动补全、结对编程进入第三阶段——智能体委派，开发者的角色从执行者转为编排管理者。",
      "stability": "model",
      "evidenceRefs": [
        "column:02 Codex 应用与 API 更新"
      ],
      "notes": "Charlie Guo 的框架性阶段划分，非可实验验证命题"
    },
    {
      "statement": "对智能体调用成百上千个工具造成的上下文冗余，可用渐进式披露（Progressive Disclosure）解决：不预先注入全部工具描述，由模型按需逐步调取。",
      "stability": "practice",
      "evidenceRefs": [
        "column:02 Codex 应用与 API 更新"
      ],
      "notes": "GPT 5.4 工具搜索功能所依据的机制；条款中提及的性能数字属未核验厂商口径"
    },
    {
      "statement": "代码库对智能体的可读性可用固定指标衡量：自给自足的引导配置、清晰任务入口点、验证框架、可见的 lint 与格式化、内容地图、易读文档结构、决策记录。",
      "stability": "model",
      "evidenceRefs": [
        "column:03 智能体易读性评分与自动化"
      ],
      "notes": "现场演示中列出的七项指标；演示结果为一次性示例，Symphony 仓库评分为 B"
    },
    {
      "statement": "把人类的工程品味与安全约束编码成 agents.md、lint 规则和代码审查子智能体，可让智能体生成的百万行代码保持可维护性。",
      "stability": "practice",
      "evidenceRefs": [
        "column:04 框架工程与 AI 废料"
      ],
      "notes": "来自五个月、人类不写一行代码的百万行内部项目；单团队经验，样本为 1"
    },
    {
      "statement": "当所有公司上下文（经营原则、招聘流程等非代码信息）都对智能体可见时，Codex 可承接早间例行程序等非工程任务。",
      "stability": "practice",
      "evidenceRefs": [
        "column:05 客户聚焦：Basis",
        "column:07 上下文与效率提升"
      ],
      "notes": "Basis 的单公司案例，非普适结论"
    },
    {
      "statement": "随着开发节奏加快，决策而非代码编写会成为速度瓶颈，把决策过程记录在仓库中的 dot notes 可缓解这一瓶颈。",
      "stability": "practice",
      "evidenceRefs": [
        "column:06 智能体驱动的开发实践"
      ],
      "notes": "Basis 内部工具实践，属未独立核验的单点经验"
    }
  ],
  "evidenceCandidates": [
    {
      "claimRef": "claim:智能体委派第三阶段",
      "sourceRef": "https://www.bilibili.com/opus/1187021590734307333",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "我们已经真正进入了利用 AI 进行软件开发的第三阶段。第一阶段是“自动补全”……第二阶段是“结对编程”……但我们现在已经进入了“智能体委派”（Agentic Delegation）的新时代。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": "claim:渐进式披露与工具搜索",
      "sourceRef": "https://www.bilibili.com/opus/1187021590734307333",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "这里的专业术语是“渐进式披露”（Progressive Disclosure），即智能体执行任务时，并非所有工具描述都需要时刻处于上下文中……让智能体能够进行更自然的探索，并智能地选择将哪些部分拉入上下文。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": "claim:智能体易读性七指标",
      "sourceRef": "https://www.bilibili.com/opus/1187021590734307333",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "首先是引导启动和自给自足……任务入口点……验证框架……代码检查（Linting）和格式化……是否有地图供智能体查看各项内容的位置？文档结构是否易于理解？应用中是否有决策记录？",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": "claim:脚手架工程消除 AI 废料",
      "sourceRef": "https://www.bilibili.com/opus/1187021590734307333",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "我们有一个 lint 规则，基本上禁止在我们的规范 asyncutils 包之外定义任何形式的这种函数……这就是深入思考代码库系统思维的意义：观察智能体犯下的错误或错误行为类别，并采取必要措施从静态层面禁止它们。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": "claim:公司级上下文单体仓库",
      "sourceRef": "https://www.bilibili.com/opus/1187021590734307333",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "我们认为在代码库中保留上下文的心态，不仅仅是一个生产代码的问题……我们公司有两个仓库。一个是 Arnold，我们的单体代码仓库；另一个叫 Atlas。Atlas 是所有不在生产仓库中的公司上下文的单体仓库。",
      "observedAt": "2026-09-16"
    },
    {
      "claimRef": "claim:决策成为瓶颈与 dot notes",
      "sourceRef": "https://www.bilibili.com/opus/1187021590734307333",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "我认为一旦你让 Codex 编写所有代码并能很好地执行任务，决策就会开始成为你开发速度的主要瓶颈……Codex 会将整个会话中发生的决策记录在 dot notes 中，这是仓库的一部分。",
      "observedAt": "2026-09-16"
    }
  ],
  "unresolved": [
    "专栏中出现多组具体数字（GPT 5.4 百万 token 上下文、token 消耗与延迟降至 5.2/5.3 的一小部分、WebSocket 模式延迟降低 20%–30%、五个月项目约 100 万行、吞吐从 0.25–0.5 提升到 3–10 倍工程师当量）均为厂商与嘉宾自述口径，未独立核验。",
    "GPT 5.4 / GPT 5.3 / GPT 5.2 版本号与 KUA（Computer Use Agent）命名无法在独立公开来源核对，按 unverified 处理。",
    "Symphony 仓库的开源说明在直播中表述重复且含糊，仓库归属与开源时间未确认。",
    "Basis 的 Paper、Atlas、dot notes、Satellite 均为内部工具，无公开可核对材料。",
    "专栏未给出原视频 / BV 号，仅提供 opus，无法据 BV 完成额外查重。",
    "现场问答中‘应用商店’‘旧有应用工程治理引导程序’两处表述依赖上下文，本文未核实相关问题与回答的完整对应关系。"
  ],
  "validators": [
    "vault_ingest_v2.frontmatter",
    "vault_ingest_v2.bilibili_opus.duplicate_check",
    "vault_ingest_v2.bilibili_opus.voice_integrity",
    "vault_ingest_v2.bilibili_opus.numeric_context",
    "vault_ingest_v2.bilibili_opus.constraints_preserved",
    "vault_ingest_v2.bilibili_opus.relation_quality",
    "vault_ingest_v2.bilibili_opus.layout_locked(核心判断前置/导读核心主张/唯一金句)",
    "bilibili-opus-validate.py --sources-read column"
  ],
  "sourceDigest": "1a64ee07f1ac52f710442bf300855d4f607705141e714e7f26dad7a7556e92d5",
  "existingNoteRef": "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-构建全能AI营销团队.md",
  "canonicalBody": "# OpenAI 团队：用 API 和 Codex 构建 Agent\n\n> 来源：OpenAI Build Hours 直播的文字专栏整理。主持人 Christine（OpenAI 初创企业营销团队）与 Charlie Guo（DevX 团队）串场，Ryan Lopopolo（OpenAI 工程师，脚手架工程）主讲，客户环节由 Basis 联合创始人 Mitch 分享。主题是把 Codex 从代码补全推到哪里去、以及为了做到这一点代码库要改成什么样子。\n>\n> **核心主张：** 让智能体可靠交付的关键不在提示词，而在代码库——把工程品味、安全约束和验收条件的非功能性需求写进仓库，智能体才能从补全工具变成可委派的执行者。\n\n> 如果你能清晰地表达出你不喜欢代码的哪一点，下一步就是将其写进文档，或者写进专门的代码审查智能体、测试或 lint 规则中。\n> ——Ryan Lopopolo\n\n## 开场\n\nChristine 交代了整场的顺序：先讲 Codex 与 API 的新功能，再演示智能体易读性评分，然后 Ryan 讲脚手架工程，接着是 Basis 的客户案例，最后留 15 分钟问答。Charlie Guo 负责主持，Ryan 从西雅图到演播室现场。\n\n## 01 开发到了智能体委派阶段\n\n**核心判断：** 软件开发已从自动补全、结对编程进入第三阶段——智能体委派，开发者的位置从写代码变成编排管理。\n\n**Charlie Guo：**\n\n- 第一阶段是自动补全，也就是幽灵文本提示。\n- 第二阶段是结对编程，模型在 IDE 里辅助生成代码并合入现有代码。\n- 第三阶段是智能体委派，用 Codex 桌面应用这类工具同时管理多个智能体，处理越来越大、越来越复杂的工作流。\n\n**Ryan Lopopolo：** Codex 应用现在的核心是管理智能体，而不是非得待在终端或 IDE 里。对他个人来说，应用已经很大程度取代了 IDE。同时 Codex 应用支持了 Windows，并且是原生沙箱化，不依赖 WSL。\n\n应用层新增的两块能力：\n\n- 技能（Skills）：把使用工具的目的和方法作为上下文交给智能体，许多技能与 Codex 应用捆绑，相当于直接拿到团队内部高效用法的精华。\n- 应用（Apps，此前叫连接器）：可在 ChatGPT 和 Codex 之间共享，把 Codex 接到日常工具上。\n\n## 02 上下文管理：渐进式披露与工具搜索\n\n**核心判断：** 智能体调用成百上千个工具会把上下文撑爆，解法不是塞更多描述，而是让模型按需逐步调取。\n\n**Charlie Guo：** GPT 5.4 支持最高 100 万 token 上下文，并新增工具搜索（Tool Search）。前沿开发者常使用成百上千个工具，这会带来上下文管理问题；工具搜索做命名空间管理，让智能体智能地、逐步地调取所需工具。\n\n**Ryan Lopopolo：** 专业术语是渐进式披露（Progressive Disclosure）——执行任务时并非所有工具描述都需要常驻上下文。不预先提供全部内容，而是把工具描述和单次调用隐藏起来，让智能体自然探索、自行决定把哪些部分拉进上下文。\n\n同一场直播还提到的 API 侧变化：\n\n- GPT 5.4 具备原生计算机操作能力（KUA，Computer Use Agent）。\n- 代码模式：模型生成 JavaScript 在 REPL 中运行，把以前“点击、截图、找坐标”的流程压缩成一条执行语句。\n- 托管 Shell：模型随时可启动的容器环境，在容器内执行 bash 命令。Ryan 认为这是把编程智能体的核心能力以可定制方式放进 API。\n- 技能 ID：上传技能并创建 ID 供模型引用。\n- WebSocket 模式：用于工具密集型用例。\n- Agent SDK 提供 Codex Harness 适配器，可直接把 Codex 能力接进自建智能体。\n\n需要提醒的是，本段涉及的版本号、上下文长度与性能倍数均为直播自述口径，本文未独立核验。\n\n## 03 Agent Legibility Score：让代码库对智能体可读\n\n**核心判断：** 代码库对智能体是否友好可以被量化成一份清单，逐项补齐就能减少智能体来回试错。\n\n**Charlie Guo：** 他现场用 Codex 应用做了一个评分应用：输入 GitHub 仓库地址与自定义指令，应用分析仓库后按预定义指标打分。演示中使用托管 Shell 运行，并对 Symphony 仓库的 elixir 目录评分，结果是 B，随后给出了逐项建议。\n\n演示里同时暴露了几种可复用的用法：\n\n- 计划模式：让智能体先探索工作区、确定文件与仓库状态，再产出待办路线图。\n- 应用底部的任务列表不是人工指定的，是模型内部路线图的可视化，用来判断该打断引导还是放手。\n- 情景记忆：给模型指向之前执行轨迹的指针，作为廉价方式让它在类似任务上进步。演示中模型主动去翻存档文件夹里的旧版本代码学习。\n- 工作树（Work Tree）：本质是 Git 沙箱，在同一文件夹并行处理多个任务而不互相覆盖。Ryan 把它列为迈向脚手架工程心态的步骤之一——同时维护多份代码副本的成本变得极低。\n- 自动化（Automations）：按固定计划运行命令。Ryan 用来审查所有打开的 PR，确认可合并、无冲突；Charlie 用来做 Slack 管理，比如基于 Slack 消息更新待办，或汇总过去 24 小时的 Git 历史为站会做快速总结。\n\n七项智能体易读性指标：\n\n- 引导启动与自给自足：仓库能否从零直接配置好，是否需要外部知识或额外命令。\n- 任务入口点：智能体能否轻松跑 make、build、lint 这类操作。\n- 验证框架：智能体检查自己所做更改的难易程度。Ryan 的补充是，如果你无法准确衡量工作是否完成，就很难知道任务是否完成。\n- 代码检查与格式化：仓库有 lint，但要考虑模型在哪里找到它、如何实际应用；补齐 lint 规则是给代码库加杠杆最省力的方式之一，模型可以非常廉价地检查自己的工作。\n- 内容地图：是否有地图告诉智能体各项内容在哪里。\n- 文档结构是否易于理解。\n- 决策记录：是否有 ADR 之类的记录。\n\n演示的一个限制：这是一次性（one-shot）例子，单份计划一次完成，应用本身也是通过氛围编程做出来的。真正的问题是，怎么把这种过程扩展到更大项目。\n\n## 04 脚手架工程：把非功能性需求写进代码库\n\n**核心判断：** 要让智能体产出的代码可合并，必须把“什么算好代码”的判断编码成 lint、文档与审查子智能体，从源头禁止 AI 废料。\n\n**Ryan Lopopolo：** 他负责的项目有一条硬性限制——人类不写任何一行代码。五个月后交付了一个约 100 万行、100% 由 Codex 编写的内部产品。因为他实际上不能敲键盘，只能退后一步从系统层面思考如何赋能这支智能体团队。\n\n关于 AI 废料（AI slop）：\n\n- 现在代码生产成本低得多，你可以直接说不容忍 AI 废料；这个词对他而言只是“我不喜欢的代码”的俚语。\n- 一旦你能量化不喜欢代码的哪一点，就可以写进文档、专门代码审查智能体、测试或 lint 规则，把非功能性需求编码进代码库，从源头禁止这类代码产生。\n- 具体例子：编程智能体偏好局部易用性，容易在代码库里留下同一例程的多个副本——他们有非常多份有界并发助手，只有一份接了 OpenTelemetry 监测。于是加了一条 lint 规则，禁止在规范 asyncutils 包之外定义这类函数。\n- 这条 ESLint 规则本身就是氛围编程生成的，并断言 100% 覆盖，因为 Codex 会详尽地写正向和负向测试用例。\n\n上下文规模化带来的难题：\n\n- 代码库里的上下文多到塞不进一个 agents.md。仅安全最佳实践就是一个 250 行的 markdown 文件，如何写可靠代码的说明同理。\n- 做法是在 agents.md 里给智能体指向可靠性最佳实践的指针，再通过一个专注可靠性的代码审查智能体把反馈回给智能体；该审查智能体会在 PR 上留评论，主编写智能体被迫阅读。\n- Ryan 的评价是：智能体非常有耐心，愿意接受任意次数的代码审查，而人可能已经不耐烦到直接强行合并，所以这种收敛方式在可靠性上反而高于人工。\n\n团队协作带来的飞轮：\n\n- 新工程师加入会带来不同经验和对高质量代码的判断，每个人都能以独特方式减少废料；因为这些知识都进了代码库，团队里每个人的编程智能体都拿到了所有人的经验。\n- 后端背景的 Ryan 原本不足以让 Codex 输出高质量 React 代码，招到资深前端工程师并把知识反映进代码库后，Hook 开始被拆成单一配置文件，组件变小、可用快照测试，更容易被装入上下文。\n- 一位产品思维强的新工程师因 Codex 无法有效做关键用户旅程的冒烟测试，就让 Codex 扫描代码库、爬取所有面向用户的功能，写产品规格说明书和手动 QA 计划，再推给专门的审查智能体，对每个 PR 生成手动 QA 计划。\n\n一个失败案例：应用要升级到官方加密库，但这个决定两个月前埋在团队频道的一条 Slack 线程里。新工程师为了某个功能引入了一个新的 NPM 包，不怪工程师也不怪 Codex——那条信息没有被编码进系统约束。Ryan 回到 Slack 线程，让 Codex 把这段知识变成代码库护栏，再重做更改，输出才符合要求。\n\n关于吞吐的观察：项目刚开始速度非常慢，因为 Codex 不清楚验收标准，Ryan 常常得深入某个任务去搭基础组件，才能拿到想要的精细输出；基础组件到位后，产出从每个工程师约四分之一到二分之一吞吐，提升到每个工程师相当于三到十个工程师。\n\n## 05 Symphony：把工单到合并的流程交给编排器\n\n**核心判断：** 当护栏足够多，就可以把智能体从终端解放出来，让人在 Linear 里定义工作、只在最后决定是否合并。\n\n**Ryan Lopopolo：** Symphony 是脚手架工程仓库的下一步演进，已经开源。理念是：如果对 Codex 设了足够护栏，让它可靠地生成可被团队里所有人类工程师和智能体审查者接受的代码，那就把人从繁琐终端操作里解放出来，让人在更高层级工作。\n\nSymphony 是一个编排器，负责管理任务在工单队列中的推进：确保 Codex 在工作树中启动、写代码、提交审查、与 CI 和智能体代码审查员反复沟通，只有在满足全部预设约束后才让渡给人类。这让 Ryan 能把时间花在确定工作优先级、审查工作、确保工作为真正要构建的产品积累价值上。\n\n## 06 客户聚焦 Basis：把公司上下文也放进仓库\n\n**核心判断：** 代码库之外的公司上下文同样值得放进单体仓库，这样智能体才能参与决策而不只是写代码。\n\n**Mitch（Basis 联合创始人，面向会计师的智能体平台，已完成 B 轮）：**\n\n他的出发点是：考虑到短期内需要达到的规模，靠招人是不符合物理定律的，所以必须设计公司和代码库，让它能产生相当于十倍规模公司的产出。\n\n**思维转变：** 组织里不同的人从执行者转为管理者的速度不同，而这种转变很难推动——如果智能体本身工作得不好，就很难说服工程师、销售或售后的人去委派。\n\n**代码库层面的四个前提：**\n\n- 代码编写方式要有良好标准。\n- 标准要转化为良好上下文。\n- 建立流程保证上下文保持最新。\n- 有易于操作的内部设置；如果开发工具都不支持 MCP、无法与智能体集成，智能体就无法验证工作，也无法使用开发者那套工具。Basis 为此做了 Satellite——一个封装所有其他 MCP 的单一 MCP，开发者只需集成一个而不是五十个。\n\n**为什么 Codex 适配这套做法：** 在生产代码库上要让智能体表现出色，必须非常擅长指令遵循；Codex 在指令遵循上强到会反过来逼你把文档和上下文写得更精确。它也擅长提前收集上下文，并能在渐进式披露下完成任务所需上下文的收集，在模糊领域做决策。\n\n**Agents.md 与技能的分工：**\n\n- 根目录有 Agents.md，各代码模块也有自己的 Agents.md。\n- 原则是：模块特定的信息进该模块的 Agents.md，跨模块通用的进技能（Skill）。\n- 技能视为权威准则，并在 front matter 里直接标注负责人（Owner），这样可以通过 Slack 找到人；还可以跑一个智能体专门检查不同技能之间描述是否冲突。\n- 他们甚至做过一个子智能体，专门派生测试版子智能体来验证技能元数据描述是否触发技能，作为伪测试。\n\n**Paper 与两个单体仓库：** Paper 是管理所有上下文的方式，让仓库上下文集中可见。Basis 有两个仓库：Arnold 是单体代码仓库（名字来自 2023 年 ChatGPT 说 Arnold 是美国会计师中最受欢迎的名字），Atlas 承载所有不在生产仓库中的公司上下文，例如经营原则、招聘流程。这样 Codex 能读到公司信息，帮助就不同事务做决策。Mitch 现场演示了用个人技能“开启我的一天”跑早间例行程序，抓过去 24 小时的上下文。\n\n**决策记录：** 当 Codex 承担全部编码后，决策成为开发速度的主要瓶颈。他们引入 dot notes：与 Codex 协作时做出的决定由 Codex 记录在仓库的 notes 里，类似随时可写的 commit message，不必等到提交，为每次提交留下完整决策历史，可当历史调试器用。规格说明也放进仓库，并在 Paper 里支持直接对规格留评论，让评论、解决、规划和交互都发生在代码库内部。\n\n**子智能体：** Codex 最近开始支持子智能体，Basis 重度使用。一个是“标准执行”子智能体，Codex 先过一遍，再调用它检查是否有遗漏的标准符合项；另一个负责协助跟进 PR。Ryan 补充，把流程包进专门子智能体让 Codex 调用，是让人更放心的做法。\n\n## 07 实践问答：并行、检查点与技能元数据\n\n**核心判断：** 具体落地问题集中在并行开发、回滚审查和技能描述质量三处，答案都指向同一件事——把约定写进仓库和元数据。\n\n**关于工作树演示：** Charlie 现场新建工作树并让 Codex 改短 plan.md。默认情况下工作树采用干净的主分支检出，本地已有改动与之分开，需要时可以手动引入；产生差异后再决定是否创建分支或把改动移回本地。Ryan 的说明是，可以在文件系统上同时拥有多个工作目录对应多个分支，而不必多次克隆仓库。\n\n**关于检查点与回滚：** Charlie 说应用里所有内容都显示为暂存/未暂存文件，点击即可暂存，也可以直接告诉 Codex，或在 Agents.md 里写明“随做随提交”。Ryan 说自己会让 Codex 提交它自己的工作，并给它一套关于提交信息期望的技能，这样提交进度和粒度控制得很好。共享对话线程的问题现场未给出确定答复。\n\n**关于浏览器自动化：** 已有 Playwright 技能，并新发布了交互式版本。Charlie 做前端时会让 Codex 用 Playwright 反复迭代并截图，直到他确认正确。\n\n**关于启用全部技能：** Ryan 认为值得启用，但要花心思写短而高质量的元数据描述——那相当于给模型的预告，模型据此决定是否调用该技能；从描述可用能力的短片段，过渡到模型遵循的详细指令。\n\n**关于智能体委派下的可靠性设计模式：** Ryan 主张采用在千人、万人规模公司里会用的严谨架构模式——关注点分离、合理的包分层、业务域高内聚、封装与边界分离。这让智能体可以把一组业务逻辑当作可依赖其不变性的不透明接口，从而限制需要调入内存的上下文，和文档中的渐进式披露是同一种模式。Mitch 补充，正因为这样，他们做的重构比五年前多得多。\n\n**关于团队如何维护指令：** Ryan 的团队几乎所有内容都在代码库里，很少有个人化的 Agents.md 或个人技能，把它当作给“代表团队运作的所有智能体”编码杠杆的方式。技能只保留少数几个通用的：创建 PR、落地变更并部署、提交代码、代码审查、分析提议架构。额外杠杆要么进入技能随附的参考文档和脚本，要么进入仓库文档与测试。Mitch 的做法略有差别：文档主要是给人看的，大量前后端标准放在技能里，比如前端技能会在接触任何前端代码时被查看。Ryan 的选择是把特定任务的专业知识放进文档层级，技能只负责高层操作模式。除此之外，两人都强调高频面对面站会——代码产出太快，工程师与代码脱节可能几周才被发现，同步时间对人是必要的。\n\n**关于旧有代码库（brownfield）：** Ryan 坦言仍在探索。目前的做法是把仓库部分切分为孤立的业务逻辑域、添加接口、在被修改代码附近建独立文档子树、尽可能开启所有代码检查。\n\n**关于资源：** 演示中的技能、评分指标和示例应用代码会放在 Build Hours 的 GitHub 仓库。Ryan 建议直接克隆 Codex 仓库，让 Codex 解释它如何构成、教团队用的最佳实践；也有人在 X 上把脚手架工程博客链接直接丢给仓库里的 Codex，让它“让我的代码库对智能体更具可读性”。Mitch 的建议更朴素：团队坐下来在白板上列出你们认为“优秀”的标准，比如“安全的代码具有不可能被误用的安全接口”，先放几个种子文件进去，再逐步增加。\n\n## 限制与边界\n\n- 本文所有性能数字、版本号与吞吐倍数均来自直播自述，未独立核验，引用时需披露 verification_scope 为 column_only。\n- Agent Legibility Score 的演示是一次性例子，Symphony 仓库的 B 评分与建议不构成通用基准。\n- 百万行、人类不写代码的项目是单一团队、单一项目的经验，不构成因果结论。\n- Basis 的 Paper、Atlas、dot notes、Satellite 均为内部工具，外部无法核对。\n- 专栏只提供 opus 地址，未给出 BV 号，无法据原视频做进一步核对。\n- 问答环节中“应用商店”“旧有应用治理引导程序”等提问与回答的完整对应关系在专栏中不完整。\n\n## 知识连接\n\n- **补充** [[Codex产品负责人-Codex团队如何用Codex]]：那篇记录 Codex 团队自己怎么用 Codex；本文在同一判断上补上了 agent legibility 七指标与 Symphony 编排器，把“团队自用”推进到“如何用约束让智能体产出可合并的 PR”。\n- **支持** [[OpenAI官方-Codex新手教程]]：教程给的是 AGENTS.md、config.toml、MCP 的操作路径；本文给的是这些动作背后的判断——非功能性需求写进仓库才能在源头禁止 AI 废料，两者叠起来才是完整链条。\n- **应用于** [[MOC - Agent Theory and Design]]：脚手架工程与公司级单体仓库是 Agent 理论在真实生产组织中的落地样本，可作为智能体委派分支的应用证据。\n\n## 来源说明\n\ningest_workflow: bilibili_opus_ingest_v2\nsource_type: bilibili_opus\nsource_url: https://www.bilibili.com/opus/1187021590734307333\nprimary_source: column\nsource_tier: C1\nmaterial_tier: A\nsource_form: dialogue\ncontent_form: dialogue\ndialogue_fidelity: source\nquestion_source: column\nvoice_basis: direct_speech\nfactual_status: partial\nfactual_reviewed: 2026-09-16\nverification_scope: column_only\nverification_basis: [column]\nsources_read: [column]\nsources_skipped: [images, transcript, recastory, asr, up-space-scan]\n\n本笔记依据用户提供的单篇 B站 opus 专栏文字整理，未读取图片、未进入 ASR、未扫描 UP 主空间。人物与说话人来自专栏署名；正文中的现场问答顺序与串场段落已按知识依赖重排，未增补专栏之外的事实。所有对话均为专栏所载的讲者直接发言，未经独立核验。\n\n## 相关阅读\n\n- [[MOC - Agent Theory and Design]]",
  "rulesDigest": "67591166536f7a62288f7b77759be8155d0543f4871a90a692f340f0e3c61f86",
  "sourceReport": {
    "workflow": "bilibili_opus_ingest_v2",
    "sourceId": {
      "opus": "1187021590734307333",
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
    "targetPath": "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI Build Hours-用API和Codex构建Agent-20260916.md",
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
      "totalUnits": 21179,
      "retained": 8684,
      "removed": 12495,
      "unresolved": 6
    },
    "relatedNotes": [
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex产品负责人-Codex团队如何用Codex.md",
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI官方-Codex新手教程.md"
    ],
    "conceptCandidates": [
      "ai_agent",
      "article",
      "bilibili",
      "harness_engineering",
      "context_engineering",
      "multi_agent",
      "skills",
      "mcp"
    ],
    "mocUpdates": [],
    "checks": {
      "duplicate": true,
      "sourceCompleteness": true,
      "provenance": true,
      "retentionCoverage": true,
      "dialoguePlan": false,
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
      "专栏中出现多组具体数字（GPT 5.4 百万 token 上下文、token 消耗与延迟降至 5.2/5.3 的一小部分、WebSocket 模式延迟降低 20%–30%、五个月项目约 100 万行、吞吐从 0.25–0.5 提升到 3–10 倍工程师当量）均为厂商与嘉宾自述口径，未独立核验。",
      "GPT 5.4 / GPT 5.3 / GPT 5.2 版本号与 KUA（Computer Use Agent）命名无法在独立公开来源核对，按 unverified 处理。",
      "Symphony 仓库的开源说明在直播中表述重复且含糊，仓库归属与开源时间未确认。",
      "Basis 的 Paper、Atlas、dot notes、Satellite 均为内部工具，无公开可核对材料。",
      "专栏未给出原视频 / BV 号，仅提供 opus，无法据 BV 完成额外查重。",
      "现场问答中‘应用商店’‘旧有应用工程治理引导程序’两处表述依赖上下文，本文未核实相关问题与回答的完整对应关系。"
    ],
    "status": "incomplete"
  },
  "proposalDigest": "dbc448776f32d00c1803785fb9c6e324a5a9004a90c3a1e09020758b3b6663e0"
}
```
<!-- syno:json:end -->
