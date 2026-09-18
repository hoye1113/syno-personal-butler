---
id: ingest-f4d27f72
candidateId: candidate-5f4c2415
status: applied
suggestedPath: "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Every-Kieran-复利工程与单人杠杆.md"
risk: high
created: 2026-09-16T15:22:19.406Z
---

# Ingest proposal: Every团队：复利工程时代，把一半时间用来教会系统 - 哔哩哔哩

<!-- syno:json:start -->
```json
{
  "id": "ingest-f4d27f72",
  "candidateId": "candidate-5f4c2415",
  "status": "applied",
  "suggestedPath": "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Every-Kieran-复利工程与单人杠杆.md",
  "suggestedTags": [
    "ai_agent",
    "article",
    "bilibili",
    "context_engineering",
    "loop_engineering"
  ],
  "suggestedLinks": [
    "vault/00-Inbox/linkedin-工程师-领英的ai-agent-开发和部署实践-哔哩哔哩-b84b419d.md",
    "vault/02-Resources/AI and Agents/Agent Design & Patterns/AI 时代如何面试工程师.md",
    "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenClaw实战-Every团队使用Case.md"
  ],
  "risk": "high",
  "created": "2026-09-16T15:22:19.406Z",
  "sourceDescriptor": {
    "kind": "url",
    "originalUrl": "https://www.bilibili.com/opus/1241942192296034341",
    "canonicalUrl": "https://www.bilibili.com/opus/1241942192296034341",
    "publisher": "www.bilibili.com",
    "observedAt": "2026-09-16T15:22:19.277Z",
    "capturedAt": "2026-09-16T15:22:19.277Z",
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
    "opusId": "1241942192296034341",
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
      "来源为单篇 B站 opus 专栏，含完整标题、讲者姓名（Kieran Klaassen）、机构（Every）、产品（Cora）与结构化章节，可追溯。",
      "内容主题为 AI 辅助工程实践与知识复利，属 AI Agent 时代范畴，与 vault 主题一致。",
      "正文含明确核心判断、机制、规则与限制，具备信息密度，非纯新闻或低价值教程。",
      "存在多条已存在的相关笔记候选（OpenClaw实战-Every团队使用Case、IBM团队-Harness工程详解等），可建立真实关系。",
      "专栏为讲者第一人称分享整理稿，声音依据可归属为讲者直接发言。"
    ]
  },
  "materialTier": "A",
  "canonicalTags": [
    "ai_agent",
    "article",
    "bilibili",
    "context_engineering",
    "loop_engineering"
  ],
  "duplicateAssessment": {
    "matches": [
      "vault/00-Inbox/linkedin-工程师-领英的ai-agent-开发和部署实践-哔哩哔哩-b84b419d.md",
      "vault/02-Resources/AI and Agents/Agent Design & Patterns/AI 时代如何面试工程师.md",
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenClaw实战-Every团队使用Case.md",
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Cursor-128个Agent团队协作.md",
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/IBM团队-Harness工程详解.md"
    ],
    "sameSource": false,
    "updateStatus": "new"
  },
  "relations": [],
  "mocChanges": [],
  "claimCandidates": [
    {
      "statement": "代码实现成本持续下降，而人的判断力与品味不会随之下降，因此判断力成为新的稀缺瓶颈。",
      "stability": "model",
      "evidence": "讲者原话：糟糕的是，实现成本只会越来越低，但判断力不会。",
      "reviewAfter": "2027-01-01"
    },
    {
      "statement": "可复利工程的硬规则是一半时间交付功能，另一半时间教系统改正它犯过的错误。",
      "stability": "practice",
      "evidence": "讲者规则：50%的时间用于创建功能……另外50%的时间，要用来教会系统改正它犯下的错误。",
      "reviewAfter": "2027-01-01"
    },
    {
      "statement": "把人—AI 协作看作三明治：人在头脑风暴与品味判断两端介入，AI 负责规划、执行、审查的中段。",
      "stability": "model",
      "evidence": "讲者原话：这有点像人类-AI 三明治：人类在两端，AI 位于中间。",
      "reviewAfter": "2027-01-01"
    },
    {
      "statement": "把解决方案文档留在代码仓库长期反而更省 token，因为正确答案已在上下文中，省去重复研究、审查与返工。",
      "stability": "practice",
      "evidence": "讲者原话：根据我的研究，这实际上更节省 token……研究更少，找到东西更快。",
      "reviewAfter": "2027-01-01"
    },
    {
      "statement": "沉淀的对象应是决策推理而非代码：记录谁或哪个代理做了什么判断、为何导致该结果。",
      "stability": "principle",
      "evidence": "讲者原话：重要的是记录思考过程，而不是记录代码……记录为什么要这样做背后的推理。",
      "reviewAfter": "2027-01-01"
    },
    {
      "statement": "新功能的标准是让下一个功能更容易实现，而不是增加系统复杂性。",
      "stability": "principle",
      "evidence": "讲者原话：下一个功能应该因为交付了这一个而更容易构建。",
      "reviewAfter": "2027-01-01"
    },
    {
      "statement": "Kieran Klaassen 单人主导 Every 的 Cora AI 邮箱客户端，生产环境有成千上万用户，仅配设计、数据库等支持人员。",
      "stability": "fact",
      "evidence": "讲者原话：整个项目只有我一个工程师，但我有支持人员，包括设计支持，以及数据库和底层工程问题方面的支持。",
      "reviewAfter": "2027-01-01"
    },
    {
      "statement": "Compound Engineering 插件由讲者在构建 Cora 过程中做出并开源，作者称每日有数十万人在使用。",
      "stability": "volatile",
      "evidence": "讲者原话：现在每天有数十万人在使用它。",
      "reviewAfter": "2026-12-16"
    }
  ],
  "evidenceCandidates": [
    {
      "claimId": "claim-4-token-saving",
      "sourceRef": "https://www.bilibili.com/opus/1241942192296034341",
      "sourceTier": "personal",
      "stance": "supports",
      "excerpt": "但根据我的研究，这实际上更节省 token。因为如果正确答案和解决方案已经存在于上下文中，你就不需要再次审查、纠正，也不需要在互联网上进行深度研究。",
      "observedAt": "2026-09-16"
    },
    {
      "claimId": "claim-2-50-50-rule",
      "sourceRef": "https://www.bilibili.com/opus/1241942192296034341",
      "sourceTier": "personal",
      "stance": "supports",
      "excerpt": "我的规则是：50%的时间用于创建功能……另外50%的时间，要用来教会系统改正它犯下的错误。",
      "observedAt": "2026-09-16"
    },
    {
      "claimId": "claim-3-human-ai-sandwich",
      "sourceRef": "https://www.bilibili.com/opus/1241942192296034341",
      "sourceTier": "personal",
      "stance": "supports",
      "excerpt": "真正的诀窍在两端。这有点像人类—AI 三明治：人类在两端，AI 位于中间，大脑负责两端的工作。",
      "observedAt": "2026-09-16"
    },
    {
      "claimId": "claim-5-decision-rationale",
      "sourceRef": "https://www.bilibili.com/opus/1241942192296034341",
      "sourceTier": "personal",
      "stance": "supports",
      "excerpt": "写一份复盘报告，记录是谁，或哪个代理，做出了什么决定，最终导致了这个结果。",
      "observedAt": "2026-09-16"
    },
    {
      "claimId": "claim-8-plugin-usage",
      "sourceRef": "https://www.bilibili.com/opus/1241942192296034341",
      "sourceTier": "personal",
      "stance": "limits",
      "excerpt": "现在每天有数十万人在使用它。",
      "observedAt": "2026-09-16"
    }
  ],
  "unresolved": [
    "“每天数十万人在使用”为讲者自述使用量，专栏内无第三方数据佐证，未独立核验。",
    "Cora 产品用户规模“成千上万人”仅为讲者表述，无外部来源确认。",
    "专题中提及的 CE Ideate / CE Doc Review / CE Brainstorm / /lfg / C Compound 等具体命令名依赖专栏文字转写，未读取官方原页核对拼写与功能范围。",
    "讲者提到“根据我的研究，这实际上更节省 token”，未给出研究出处、样本或测量方式。",
    "专栏未标注发布时间与本场分享的具体场合，时间信息缺失。",
    "分享中未涉及失败案例的量化细节，反例主要停留在原则层面。",
    "示例演示截图为图片内容，按收录边界未读取，demo 具体输入输出无法逐项核验。"
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
    "discussion_readiness",
    "question_independence"
  ],
  "sourceDigest": "cacce79b2130468d94f844681b5fa0da879002a0cdbe636244b5163d753fc59c",
  "existingNoteRef": "vault/00-Inbox/linkedin-工程师-领英的ai-agent-开发和部署实践-哔哩哔哩-b84b419d.md",
  "canonicalBody": "# Every 团队：复利工程时代，把一半时间用来教会系统\n\n> 讲者 Kieran Klaassen，Every 的工程师，用单人加少量支持的方式主导 Cora AI 邮箱客户端。全篇围绕一个判断展开：代码实现正在变便宜，稀缺的是把人的判断和品味持续写进工作流，让每一轮交付都为下一轮降低门槛。\n>\n> **核心主张：** 把人的判断与品味沉淀成可复利的系统，比扩大团队更能推高个人杠杆——代价是每次交互都要拿出一半时间去教系统不重犯错误。\n\n> 50%的时间用于创建功能，确保它真的完成了功能，并交付了预期价值。另外50%的时间，要用来教会系统改正它犯下的错误。\n> ——Kieran Klaassen\n\n## 开场\n\nKieran 在 Every 工作，Every 是一家面向未来工作方式的 AI 实验室，有一个主要由单人工程团队组成的工作室。Cora 是他发明复合工程的地方——一款原生支持智能代理的完整 AI 邮箱客户端，能跑在桌面端、手机端和命令行，也支持类似 MCP 的连接器，目前正在重构第二版。整个项目只有他一个工程师，另有设计、数据库和底层工程问题的支持人员。他此前做过工程副总裁，也创过业，这次刻意反其道而行：看看在真正需要扩编之前，AI 能把个人杠杆推到多远。\n\n## 01 单人加上支持，责任仍在一个人身上\n\n**核心判断：** 复利式工作方式让一个人能扛住完整产品，但前提是责任不外包。\n\nKieran 不否认协作，他只是把团队有意缩到很小，测试 AI 在需要扩编前的上限。项目一月才开始构建重构版本，后端用 Rails，前端用 Ruby 和 React。他完全负责这个产品，出了问题用户直接找到他。\n\n- 团队构成：一个工程师（本人）+ 设计支持 + 数据库和底层工程支持。\n- 责任归属：他是最终负责人，这种设置是有意为之。\n- 起点判断：Sonnet 3.5 出现后，他感觉解锁了某种全新可能，于是想看看 AI 究竟能走多远。\n\n## 02 瓶颈会从代码一路上移到判断力\n\n**核心判断：** 模型先缓解写代码的瓶颈，随后把计划、选题和理解用户依次推到前台，决定“该做什么”比“怎么做”更关键。\n\n瓶颈的迁移路径很具体：\n\n- 起点是代码——糟糕的代码、幻觉、各种跑不起来的东西。他加入代理和技能负责审查代码，代码质量上来了。\n- 接着瓶颈变成计划。能做的事情变多之后，只要计划制定好，就能完成超出简单代码修改的大型任务。\n- 下一个瓶颈是决定该构建什么：与用户交流，真正理解要解决的问题。他的办法是持续使用自己做的产品。\n- 项目范围继续变大，他开始反复说明同样的事情，于是需要记忆系统，这就是复合工程真正的起点。\n\n**编者问：** 为什么瓶颈会一路从代码上移？\n\n**讲者：** 因为实现层面基本已经解决了。真正还没有解决的是我们的判断力和品味——什么时候该启动自己的大脑，什么时候该借助模型，在哪里做判断、加入品味，在哪里思考、迭代、即兴发挥和头脑风暴。他的观察是：随着流程推进，打字越来越少，判断和品味越来越多。\n\n## 03 复合工程的循环：人在两端，AI 在中间\n\n**核心判断：** 循环的诀窍在两端，开始要动脑界定问题，结束要用品味提高标准，中间的规划、执行、审查应当是无需干预的自动环节。\n\nKieran 把这个循环概括为：头脑风暴、规划、工作、审查、打磨、积累，然后重复。他称之为人类—AI 三明治。\n\n- 前端：决定做什么、问题是什么，真正理解想完成的事情。\n- 中段：规划、执行、审查，应能被机器并行、长时间运行。\n- 后端：发挥品味判断“这看起来很棒，让我很满意”，或要求提高标准、做得更利落、更令人愉悦。\n- 全程：尤其是大脑参与的环节，都要提炼经验让它复利。\n\n他的硬规则是 50/50：一半时间交付功能，另一半时间教系统改正它犯过的错误。他还强调必须学会放手，让机器在夜间连续跑数小时、并行处理多个任务——想做到这一点，唯一的方法是投入时间建设这套系统。他的判断是：一个拥有复利系统的工程师，能够击败那些使用 AI 却没有这种系统的完整团队。\n\n## 04 知识沉淀在仓库里，长期反而更省 token\n\n**核心判断：** 把解决方案文档存进代码仓库长期更节省 token，因为正确答案已在上下文中，省去重复研究、审查和返工。\n\nKieran 把所有知识以解决方案文档的形式存进代码仓库。常见的反驳是“这样很耗 token”，他的回应是：如果正确答案和解决方案已经在上下文里，就不需要再次审查、纠正，也不需要在互联网上深度研究。\n\n- 长期收益：研究更少，找到东西更快。\n- 成立条件：他的大脑相对固定，而 AI 不是——所以固定的一方负责沉淀，可变的一方负责执行.\n- 目标状态：不断提炼，直到中间环节能完全自动运行，而且好到让你惊讶。\n\n他做的 Compound Engineering 插件是在构建 Cora 时顺手做出来的，可以装进 Codex、Claude Code、Cursor 等十多个工具，后来与共同贡献者 Trevin Chow 一起发展成复合产品。他强调这套概念适用于工程师、产品经理、设计师，以及 Every 内部做知识工作的人，不必局限于工程。\n\n## 05 工具链：从创意生成到夜间自动执行\n\n**核心判断：** 每个命令负责循环里的一个环节，真正的价值不在单个工具，而在于它们把结果不断喂回可复用的知识库。\n\n**CE Ideate** 负责激活大脑。演示里他把命令指向所有未解决的工单，让它遍历问题、连接 Linear、GitHub 开源 issue、Slack 和 Intercom，从杂乱信息中生成结构，推理哪些事值得做、哪些不值得，最后输出一个整洁的 HTML 页面分享给团队。把它指向 OKR，创意就能与战略对齐；如果仓库里有过去的实验、经验或 CE Strategy 文档，它还会基于已有知识给创意打分。\n\n**CE Doc Review** 处理别人给的 PRD 或其他文档，返回尖锐的问题。他会把这些问题转给同事或让对方直接回答，回答之后再用 C Compound 把知识积累下来，下次系统内置答案，不再重复提问。这是他使用最多的一个工具，用于问题大到难以描述的场景。\n\n**CE Brainstorm** 让大脑重新启动。他会专门留出专注时间，运行后它会调取复合知识，查看 Cora 1 与 Cora 2 的差异，也会查看用户画像，发现不同的人需要不同的东西。然后它提问——但经过刻意调校，只问完成工作所需的恰到好处的问题。他的判断是：问上三十个问题容易让人感觉做了很多工作，但最终目标不是回答问题，而是产出最好的成果，一些库问得太多，这里需要平衡。最后产出经过存储和积累的头脑风暴文档。\n\n**/lfg** 是自动化循环。它会连续运行数小时，规划、执行、审查、测试，然后创建 PR，还会做狗粮测试，发现问题尝试修复，并在拉取请求里附上前后对比视频和截图。它可以夜间运行，也可以并行多个任务。\n\n**打磨** 是又一次大脑介入。他把拉取请求交给它，它会展示结果；他喜欢在 Cursor 里左边跑这个功能、右边展示产品效果。有时他甚至不知道具体构建了什么，因为他会把视频录制丢进 LFG 让它分析哪里出了问题，所以先了解背景很有帮助。他明确指出：这一步不是 QA 测试，而是提高标准，确保它应该真正正常工作。\n\n## 06 反馈闭环：合并代码的同时学到东西\n\n**核心判断：** 复利发生在合并代码的那一刻，但同时要从这次交付里抽出一条可复用的规则。\n\n他给的例子很小：页面里出现了两次 logo 标记，技术上不算错，但他不希望一页里出现两个。于是他说“这里有两个标记，能不能确保以后始终只保留一个”，再运行 C Compound，让它提取并积累这条知识。下次做设计时，它会找到那份文件，知道不能再这样做。\n\n**编者问：** 为什么复合工程会引起共鸣？\n\n**讲者：** 这不是一个非常新的概念，只是软件工程的一种方式，只不过现在不再完全依靠团队，而是使用 AI 并发挥它的杠杆。AI 擅长处理特定类型的任务，尤其是面对大量知识、在特定模型上执行正确的操作时。\n\n## 限制与边界\n\n- 这套方法依赖持续投入：50/50 规则本身就承认有一半工作量不产出直接功能，讲者也说对自己而言做起来确实很难，明明已经能用、效果也不错，很容易想继续往前走。\n- 中间环节必须真的“无聊”且自动。如果循环里仍然需要人，就要先手动运行、感受哪里不对、不断迭代，直到能真正放手。他给出的成功信号是：启动一个任务让它跑三小时，而且结果总是很好。\n- 沉淀对象是决策推理而非代码。写复盘报告要记录是谁或哪个代理做了什么决定、怎样导致这个结果，再把它转化为改变下次行为的经验。\n- 判断力不会随实现成本一起下降。未来的模型和系统需要被设计成能调用人的判断力和品味，否则杠杆无法真正放大。\n- 新功能的验收标准是让下一个功能更容易构建。如果下一个功能因为这次增加了复杂性而更难实现——他说这通常是工程开发的惯性——就要反过来做。\n\n## 知识连接\n\n- **补充** [[OpenClaw实战-Every团队使用Case]]：同属 Every 的组织实践，那篇讲人手一个代理的团队用法，这篇把它推进为单人工程师用复利系统替代团队扩编的方法论。\n- **补充** [[IBM团队-Harness工程详解]]：Harness 工程讲怎么把模型能力包成可靠执行环境，这篇补上时间维度——把每次交付的决策推理沉淀进上下文，使 harness 随使用持续变强。\n- **限制** [[Cursor-128个Agent团队协作]]：那篇以大规模并行 Agent 团队为主张，这篇给出前提——只有当中间环节足够自动，放手并行才成立。\n\n## 来源说明\n\n- 来源：B站 opus 专栏 https://www.bilibili.com/opus/1241942192296034341，讲者 Kieran Klaassen（Every），标题《Every团队：复利工程时代，把一半时间用来教会系统》。\n- 形态：单人分享型讲义（source_form: lecture），正文以讲者第一人称组织（voice_basis: direct_speech），无真实主持人，因此全文使用“编者问”标注提问来源（question_source: none，dialogue_fidelity: none）。\n- 只读取了专栏文字与页面元数据；图片、ASR、transcript、Recastory 与 Spot Check 均跳过，未扫描 UP 主空间。\n- 事实状态未核验（factual_status: unverified，factual_reviewed: 2026-09-16，verification_scope: column_only）：笔记忠实于专栏，但文中用户规模、插件使用量、“更省 token 的研究”等均为讲者自述，未独立核验，引用时请回到原始来源。\n- 未决项见报告 unresolved：使用量为讲者自述、命令名依赖专栏转写、token 研究无出处、专栏未标注发布时间与场合、演示截图按边界未读取。\n- 新概念（复利工程 / Compound Engineering、CE Ideate、CE Doc Review、CE Brainstorm、CE Strategy）仅进入报告 concept_candidates，未创建概念笔记。",
  "rulesDigest": "67591166536f7a62288f7b77759be8155d0543f4871a90a692f340f0e3c61f86",
  "sourceReport": {
    "workflow": "bilibili_opus_ingest_v2",
    "sourceId": {
      "opus": "1241942192296034341",
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
    "targetPath": "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Every-Kieran-复利工程与单人杠杆.md",
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
      "totalUnits": 8675,
      "retained": 4764,
      "removed": 3911,
      "unresolved": 7
    },
    "relatedNotes": [],
    "conceptCandidates": [
      "ai_agent",
      "article",
      "bilibili",
      "context_engineering",
      "loop_engineering"
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
      "“每天数十万人在使用”为讲者自述使用量，专栏内无第三方数据佐证，未独立核验。",
      "Cora 产品用户规模“成千上万人”仅为讲者表述，无外部来源确认。",
      "专题中提及的 CE Ideate / CE Doc Review / CE Brainstorm / /lfg / C Compound 等具体命令名依赖专栏文字转写，未读取官方原页核对拼写与功能范围。",
      "讲者提到“根据我的研究，这实际上更节省 token”，未给出研究出处、样本或测量方式。",
      "专栏未标注发布时间与本场分享的具体场合，时间信息缺失。",
      "分享中未涉及失败案例的量化细节，反例主要停留在原则层面。",
      "示例演示截图为图片内容，按收录边界未读取，demo 具体输入输出无法逐项核验。"
    ],
    "status": "incomplete"
  },
  "proposalDigest": "5225b202bef18994a24eb87feab42d45d0374c764c0d9303504d2bc86762931c"
}
```
<!-- syno:json:end -->
