---
id: ingest-a05439eb
candidateId: candidate-58d94021
status: applied
suggestedPath: "vault/00-Inbox/deepmind团队-如何大规模-运行agent-哔哩哔哩-4cc3d8de.md"
risk: merge
created: 2026-09-16T18:09:34.919Z
---

# Ingest proposal: DeepMind团队：如何大规模 运行Agent - 哔哩哔哩

<!-- syno:json:start -->
```json
{
  "id": "ingest-a05439eb",
  "candidateId": "candidate-58d94021",
  "status": "applied",
  "suggestedPath": "vault/00-Inbox/deepmind团队-如何大规模-运行agent-哔哩哔哩-4cc3d8de.md",
  "suggestedTags": [
    "ai_agent",
    "bilibili",
    "harness_engineering",
    "context_engineering",
    "multi_agent",
    "ai_evaluation",
    "ai_safety",
    "ai_coding"
  ],
  "suggestedLinks": [
    "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI Build Hours-用API和Codex构建Agent-20260916.md",
    "vault/00-Inbox/linear团队-构建生产级别agent的5条规则-哔哩哔哩-72c13f86.md",
    "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Anthropic团队-如何构建运行数小时的Agent.md"
  ],
  "risk": "merge",
  "created": "2026-09-16T18:09:34.919Z",
  "sourceDescriptor": {
    "kind": "url",
    "originalUrl": "https://www.bilibili.com/opus/1209874252741738503",
    "canonicalUrl": "https://www.bilibili.com/opus/1209874252741738503",
    "publisher": "www.bilibili.com",
    "observedAt": "2026-09-16T18:09:27.972Z",
    "capturedAt": "2026-09-16T18:09:27.972Z",
    "captureChannel": "web",
    "platformMessageId": "goal:p1:deepmind:retry:1209874252741738503",
    "sourceTier": "secondary",
    "reliability": "unverified",
    "userSuppliedSource": true,
    "verificationStatus": "unverified"
  },
  "sourceType": "bilibili-opus",
  "sourceProfile": {
    "ingestWorkflow": "bilibili_opus_ingest_v2",
    "primarySource": "column",
    "opusId": "1209874252741738503",
    "columnId": "cv50041593",
    "uploader": "Easonlee的AI笔记",
    "sourceTier": "C2",
    "sourceForm": "dialogue",
    "contentForm": "dialogue",
    "dialogueFidelity": "reconstructed",
    "questionSource": "editorial",
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
      "专栏正文覆盖 Agent 运行环境、技能治理、配额与模型路由、共享工作区、可观测性、评估和代码审查，且明确 column-only 来源范围"
    ]
  },
  "materialTier": "A",
  "canonicalTags": [
    "ai_agent",
    "bilibili",
    "harness_engineering",
    "context_engineering",
    "multi_agent",
    "ai_evaluation",
    "ai_safety",
    "ai_coding"
  ],
  "duplicateAssessment": {
    "matches": [
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI Build Hours-用API和Codex构建Agent-20260916.md",
      "vault/00-Inbox/linear团队-构建生产级别agent的5条规则-哔哩哔哩-72c13f86.md",
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Anthropic团队-如何构建运行数小时的Agent.md",
      "vault/00-Inbox/openai产品负责人-codex如何-被开发出来的-哔哩哔哩-c8546496.md",
      "vault/00-Inbox/vals-联创-前沿ai模型-如何评估-哔哩哔哩-d914331d.md"
    ],
    "sameSource": false,
    "updateStatus": "new"
  },
  "relations": [
    {
      "type": "extends",
      "target": "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI Build Hours-用API和Codex构建Agent-20260916.md",
      "reason": "在已有 Agent 架构/Harness 语境上补充技能治理、配额路由、共享工作区、轨迹可观测性和自动 PR 审查。"
    }
  ],
  "mocChanges": [],
  "claimCandidates": [],
  "evidenceCandidates": [],
  "unresolved": [],
  "validators": [
    "source-traceability",
    "duplicate",
    "frontmatter",
    "vault-contract",
    "bilibili-opus-validate"
  ],
  "sourceDigest": "20b58d075d82c304609d686cdd98d8bfde0509846dbb9b9aa56b0880715ca911",
  "existingNoteRef": "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI Build Hours-用API和Codex构建Agent-20260916.md",
  "canonicalBody": "> 本篇整理 Google DeepMind 工程师 Ian Ballantyne 与 KP Sawhney 对 Anti-Gravity 代理框架的介绍，重点是把 Agent 从单次对话扩展为可规划、可观察、可配额、可评估的组织级软件系统。\n>\n> **核心主张：** 大规模 Agent 的瓶颈不只是模型能力，还包括技能治理、Token 配额、共享工作区、轨迹可观测性和自动化评估；人需要从逐个执行任务转向设计和监督这条数字装配线。\n\n## 开场\n\n**编者问：** Agent 在大型组织中如何从演示工具变成可持续运行的工程基础设施？\n\n**专栏整理：** 专栏介绍 DeepMind 的 Anti-Gravity 工具和内部 Agent 工作方式，涵盖 IDE 集成、浏览器与 DOM 检查、实施计划、共享工作区、技能库、混合模型、配额管理、轨迹存储和代码审查。本文只保留专栏正文中的方法与判断，不把 Google/DeepMind 的内部自述当作外部核验事实。\n\n## 01 Agent Manager 把执行环境纳入任务闭环\n\n**专栏整理：** Anti-Gravity 不只是聊天插件，而是包含 Agent Manager 的 IDE 集成框架。Agent 可以读取规范、生成实施计划、编辑项目文件、调用浏览器检查 DOM，并在关键节点让人审查后继续执行。\n\n**可迁移判断：** 把执行环境纳入 Agent 任务，能缩短“生成—运行—观察—修正”的反馈环，但也要求把权限、停止条件和人类确认点设计成系统能力。\n\n## 02 浏览器验证和 Scratchpad 提供可审查证据\n\n**专栏整理：** 演示中的 Agent 会启动浏览器检查应用状态和 DOM，捕获截图或视频，并在 Scratchpad 中记录执行过程中形成的思路和待办。人可以查看实施计划、修改目标，再批准继续执行。\n\n**边界：** 这是专栏对演示行为的整理，不代表所有 Agent 都具备同等浏览器控制能力；真实系统仍需独立验证 DOM 结果、截图和运行日志。\n\n## 03 技能库需要类似“达尔文选择”的治理\n\n**专栏整理：** DeepMind 关注建立大规模技能库，让领域专家贡献的调试、编码和日志分析经验可以复用。受访者认为技能数量快速增长后，必须通过使用效果和下游影响筛选，只有更有效的技能才能长期保留。\n\n**工程含义：** 技能市场不能只做上传和搜索，还要有版本、作者、测试集、失败案例、使用反馈和淘汰机制。组织经验的质量取决于可验证的结果，而不是技能数量。\n\n## 04 混合模型和配额管理是规模化前提\n\n**专栏整理：** 当每个用户都能启动多个 Agent 时，Token、GPU 和并发资源会成为主要约束。受访者讨论用 Gemma 等轻量模型处理常规步骤，把高级模型留给复杂决策，并在达到限额时平滑切换到其他模型或本地模型。\n\n**可迁移判断：** 模型路由应同时考虑任务质量、成本、延迟、上下文状态和失败恢复；无缝切换不能掩盖额度耗尽、权限变化或结果质量下降。\n\n## 05 共享工作区让 Agent 像数字装配线协作\n\n**专栏整理：** 对谈提出，与其在深度研究管道中传递大量文本块，不如让不同环节的 Agent 在共享文件系统或工作区中协作。子 Agent 可以并行处理不同轨道，人类则负责塑造通信逻辑和验收产物。\n\n**工程含义：** 共享工作区需要文件所有权、版本、并发写入、生命周期和敏感数据边界；父子层级不是唯一协作模式，关键是让中间产物可追踪、可复用、可清理。\n\n## 06 轨迹存储把 Agent 可观测性落到步骤级\n\n**专栏整理：** DeepMind 内部使用定制 Web 应用观察 Agent 后端系统的请求，并可下钻到各个层级，必要时追溯到模型预测请求。编码场景还需要 Agent 轨迹存储，帮助定位诊断循环何时开始偏离。\n\n**可迁移判断：** 可观测性不应只记录最终答案，还应覆盖工具调用、计划、重试、文件变更、模型路由、配额和人工干预；只有保留这些证据，才可能区分模型错误、工具错误和流程错误。\n\n## 07 技能评估比技能创建更难\n\n**专栏整理：** 受访者认为，为特定技能设计数据集和沙盒环境很难。外部基准可以评估通用能力，但技能作者仍需提供与真实下游任务对应的测试；让元 Agent 自动生成评估也仍处于探索阶段。\n\n**工程含义：** 技能上线前至少需要代表性任务、失败分类、回归样例和停止标准；不能把“调用成功”当作技能有效的充分证据。\n\n## 08 自动化代码审查成为 Agent 生产闭环\n\n**专栏整理：** Google 内部针对不同语言和风格指南训练或配置自动审查模型，并在 PR 阶段给出建议。随着 Agent 生成代码的数量增长，自动审查、风格约束和人工验收共同构成开发流水线的质量控制。\n\n**边界：** 专栏中的内部实践和效果是受访者自述，本文不把它们当作 Google 当前公开产品承诺；实际采用时仍需以本地代码库、合规边界和真实误报率评估。\n\n## 限制与边界\n\n- 本笔记只读取 Bilibili 图文专栏正文和页面元数据，未读取原始视频音频、图片、ASR、transcript 或 DeepMind 官方资料。\n- 技能库、Anti-Gravity、内部配额、轨迹存储和代码审查模型均按专栏对谈自述记录，未经独立核验。\n- 专栏中包含现场提问和第三方整理；本文重新组织为方法笔记，不把它升级为原始视频逐字稿。\n- 模型名称、产品能力、资源配额和内部工作流可能变化；复现时应回到当前官方文档和实际环境。\n\n## 知识连接\n\n- **补充** [[02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI Build Hours-用API和Codex构建Agent-20260916]]：在已有 Agent 架构/Harness 语境上补充技能治理、配额路由、共享工作区、轨迹可观测性和自动 PR 审查。\n\n## 来源说明\n\n- 来源形态：Bilibili 图文专栏（opus 1209874252741738503，column cv50041593），对谈整理。\n- 读取范围：column only；source_tier: C2；material_tier: A；source_form: dialogue；content_form: dialogue；dialogue_fidelity: reconstructed；question_source: editorial；voice_basis: direct_speech。\n- factual_status: partial；verification_scope: column_only；verification_basis: [column]。正文通过 Kimi 登录页获取，未读取图片、原始视频或外部资料复核。",
  "rulesDigest": "bilibili_opus_ingest_v2",
  "sourceReport": {
    "workflow": "bilibili_opus_ingest_v2",
    "sourceId": {
      "opus": "1209874252741738503",
      "column": "cv50041593",
      "bv": ""
    },
    "route": {
      "sourceTier": "C2",
      "materialTier": "A",
      "sourceForm": "dialogue",
      "contentForm": "dialogue",
      "dialogueFidelity": "reconstructed",
      "questionSource": "editorial",
      "voiceBasis": "direct_speech"
    },
    "targetPath": "vault/00-Inbox/deepmind团队-如何大规模-运行agent-哔哩哔哩-4cc3d8de.md",
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
      "totalUnits": 9026,
      "retained": 2904,
      "removed": 6122,
      "unresolved": 0
    },
    "relatedNotes": [
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI Build Hours-用API和Codex构建Agent-20260916.md"
    ],
    "conceptCandidates": [
      "ai_agent",
      "bilibili",
      "harness_engineering",
      "context_engineering",
      "multi_agent",
      "ai_evaluation",
      "ai_safety",
      "ai_coding"
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
    "unresolved": [],
    "status": "incomplete"
  },
  "proposalDigest": "16e2e1edafe22fd75596bfb745208d8c0a7740c25292dcd99ba3d7ea587e01ce"
}
```
<!-- syno:json:end -->
