---
id: ingest-26b7f4ef
candidateId: candidate-fc1b574d
status: applied
suggestedPath: "vault/00-Inbox/每家公司即将构建的ai智能体-vercel首席执行官guillermo-ra-哔哩-c9dc516b.md"
risk: merge
created: 2026-09-16T17:57:19.207Z
---

# Ingest proposal: 每家公司即将构建的AI智能体 | Vercel首席执行官Guillermo Ra - 哔哩哔哩

<!-- syno:json:start -->
```json
{
  "id": "ingest-26b7f4ef",
  "candidateId": "candidate-fc1b574d",
  "status": "applied",
  "suggestedPath": "vault/00-Inbox/每家公司即将构建的ai智能体-vercel首席执行官guillermo-ra-哔哩-c9dc516b.md",
  "suggestedTags": [
    "ai_agent",
    "bilibili",
    "agent_architecture",
    "harness_engineering",
    "context_engineering",
    "ai_safety",
    "multi_agent"
  ],
  "suggestedLinks": [
    "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/5次创业者-AI智能体独自经营初创公司.md",
    "vault/00-Inbox/braintrust-cto-你的智能体进化了-但评测没有-哔哩哔哩-059be32d.md",
    "vault/00-Inbox/recursive-ceo-让ai自己构建-更强的ai-哔哩哔哩-72d3ad0c.md"
  ],
  "risk": "merge",
  "created": "2026-09-16T17:57:19.207Z",
  "sourceDescriptor": {
    "kind": "url",
    "originalUrl": "https://www.bilibili.com/opus/1238642862831173684",
    "canonicalUrl": "https://www.bilibili.com/opus/1238642862831173684",
    "publisher": "www.bilibili.com",
    "observedAt": "2026-09-16T17:57:09.966Z",
    "capturedAt": "2026-09-16T17:57:09.966Z",
    "captureChannel": "web",
    "platformMessageId": "goal:p1:retry5:1238642862831173684",
    "sourceTier": "secondary",
    "reliability": "unverified",
    "userSuppliedSource": true,
    "verificationStatus": "unverified"
  },
  "sourceType": "bilibili-opus",
  "sourceProfile": {
    "ingestWorkflow": "bilibili_opus_ingest_v2",
    "primarySource": "column",
    "opusId": "1238642862831173684",
    "columnId": "cv52522725",
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
      "专栏正文覆盖企业智能体的知识、技能、工具、权限、连接器、事件和评估闭环，且明确 column-only 来源范围"
    ]
  },
  "materialTier": "A",
  "canonicalTags": [
    "ai_agent",
    "bilibili",
    "agent_architecture",
    "harness_engineering",
    "context_engineering",
    "ai_safety",
    "multi_agent"
  ],
  "duplicateAssessment": {
    "matches": [
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/5次创业者-AI智能体独自经营初创公司.md",
      "vault/00-Inbox/braintrust-cto-你的智能体进化了-但评测没有-哔哩哔哩-059be32d.md",
      "vault/00-Inbox/recursive-ceo-让ai自己构建-更强的ai-哔哩哔哩-72d3ad0c.md",
      "vault/00-Inbox/langchain-ceo-何时构建自己的agent框架-哔哩哔哩-1e149996.md",
      "vault/00-Inbox/linear团队-构建生产级别agent的5条规则-哔哩哔哩-72c13f86.md"
    ],
    "sameSource": false,
    "updateStatus": "new"
  },
  "relations": [
    {
      "type": "extends",
      "target": "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/5次创业者-AI智能体独自经营初创公司.md",
      "reason": "在已有企业智能体独立运营实践上补充统一入口、子智能体路由、权限治理、事件驱动和技能维护的组织视角。"
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
  "sourceDigest": "62505e529883962d4de140ff5d728edccb39480406f9eff040676b44dc0cf847",
  "existingNoteRef": "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/5次创业者-AI智能体独自经营初创公司.md",
  "canonicalBody": "> 本篇整理 Vercel CEO Guillermo Rauch 与 Agent Native 主持人 Riley Brown 关于企业智能体的对谈，重点是如何把智能体从“会聊天的工具”变成拥有知识、工具、权限、反馈和后台任务的企业操作层。\n>\n> **核心主张：** 企业智能体的竞争力不只来自模型，而来自可持续维护的内部知识、技能与连接器，以及围绕身份、权限、审计和评估建立的运营系统。\n\n## 开场\n\n**编者问：** 企业如何把知识、工具、权限和业务事件组织成可持续运营的内部智能体？\n\n**专栏整理：** 专栏围绕 Vercel 内部智能体 V 与正在构建的 Eve 展开。对谈讨论企业如何把客户信息、知识库、数据仓库、内容流程和业务事件接入智能体，并让团队成员通过统一入口完成工作。本文只保留专栏正文中的方法与判断；Vercel 的内部规模、产品能力和未来预测均按受访者自述记录。\n\n## 01 企业智能体的杀手级场景是运营公司\n\n**专栏整理：** Guillermo Rauch 认为，编程只是智能体的一个高价值场景，另一个重要场景是运营公司：回答客户历史、查找组织专家、导航内部知识、汇总产品指标，并把多个后台步骤串成可执行流程。\n\n**可迁移判断：** 企业大脑不是把所有数据无差别喂给模型，而是让信息在正确身份、正确权限和正确任务上下文中可被调用。真正的价值来自减少查找和协调成本，而不是增加一个聊天入口。\n\n## 02 用一个协调入口路由到专门智能体\n\n**专栏整理：** Vercel 内部智能体 V 可以从 Slack 进入，负责把内容、数据分析、客户支持和软件开发任务分派给对应子智能体或工具。对谈把它比作企业手机：用户面对统一入口，后台按身份和任务连接不同能力。\n\n**工程含义：** 协调器不等于万能管理员。路由层应知道消息来源、用户身份和任务类型，再决定可用的子智能体、工具与数据范围。\n\n## 03 把 Soul、Skills 和 Tools 做成可维护文件\n\n**专栏整理：** Eve 从指令文件开始，随后通过 tools、skills 等目录逐步获得工具和行为约束。内容风格、禁用表达、WordPress 操作方式等都可以写进文件；当产出变成“AI 垃圾”时，应修订内容技能和反馈循环，而不是简单责怪使用者。\n\n**可迁移判断：** 文件化不是把治理问题隐藏起来。每个 Skill 仍需有明确输入、权限、完成标准、回滚方式和维护责任，工具文件也必须对应真实的授权边界。\n\n## 04 子智能体与权限治理必须一起设计\n\n**专栏整理：** 对谈反复讨论营销、财务和支持团队的访问差异。企业智能体需要管理身份、工具、护栏和审计记录；实习生可以起草内容，但是否能直接写入 WordPress 生产环境，应由部门身份和额外认证决定。\n\n**安全边界：** 智能体只是协调者并不意味着风险消失。读写客户数据、发布内容、执行生产操作都应有最小权限、来源识别、人工审批或可追溯的授权记录。\n\n## 05 从提示驱动走向事件驱动和主动工作\n\n**专栏整理：** 高价值智能体不只等待用户提问，还可以订阅支付失败、邮件、Slack 或产品数据等事件，定期汇总并主动发送报告。对谈举例说明，Eve 可以按日程读取社交媒体反馈、起草内容，或每周向负责人报告产品动态与关键指标。\n\n**工程含义：** 主动工作需要事件去重、幂等、频率限制、失败重试和人工停止入口。没有这些控制面，自动化提示会变成不可预测的后台噪声。\n\n## 06 连接器是规模化的主要难点\n\n**专栏整理：** 受访者认为构建概念验证并不难，难点在于安全地把智能体连接到真实系统。Vercel Connect 被描述为连接多种系统的能力，但默认不把所有读写权限一次性开放给智能体，而是让开发者控制订阅的事件和可用动作。\n\n**可迁移判断：** 连接器的价值不只在 API 数量，还在于权限模型、事件边界、数据最小化和审计是否一致。接入更多系统会扩大攻击面与治理成本。\n\n## 07 反馈、评估与模型路由形成改进闭环\n\n**专栏整理：** 点赞点踩、夜间复盘、测试用例和用户反馈可以帮助发现技能缺陷。实时 Slack 任务可以偏向速度，夜间分析可以偏向准确率；如果保留技能和数据的所有权，就可以按任务选择模型和成本档位。\n\n**工程含义：** 反馈应落到可比较的评估集、技能版本和变更记录上。模型路由不能只追求低成本，还要保留质量、安全、延迟和失败类型的证据。\n\n## 08 从小问题开始构建企业智能体\n\n**专栏整理：** 对谈建议先从一个真实痛点开始，例如客服、内容、数据查询或内部知识导航，再逐步增加工具、技能、子智能体和事件触发器。先让团队在真实工作中反馈，再决定哪些能力应沉淀为共享基础设施。\n\n**可迁移判断：** 企业智能体的边界应由任务和权限驱动，而不是由“一个全能 Agent”这一想象驱动；共享入口与分层执行可以同时存在。\n\n## 限制与边界\n\n- 本笔记只读取 Bilibili 图文专栏正文和页面元数据，未读取原始视频音频、图片、ASR、transcript 或 Vercel 官方文档。\n- Vercel 内部智能体名称、员工规模、连接器能力、使用方式和运营数据均为专栏对谈中的自述，未经独立核验。\n- Eve、V、Vercel Connect、Soul.md、Skills 和 Tools 的具体实现可能随产品版本变化；本文不把对谈描述当作当前 API 契约。\n- “每家公司即将构建企业智能体”等判断属于受访者的趋势观点，不是事实承诺或时间预测。\n\n## 知识连接\n\n- **补充** [[02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/5次创业者-AI智能体独自经营初创公司]]：在已有企业智能体独立运营实践上补充统一入口、子智能体路由、权限治理、事件驱动和技能维护的组织视角。\n\n## 来源说明\n\n- 来源形态：Bilibili 图文专栏（opus 1238642862831173684，column cv52522725），对谈整理。\n- 读取范围：column only；source_tier: C2；material_tier: A；source_form: dialogue；content_form: dialogue；dialogue_fidelity: reconstructed；question_source: editorial；voice_basis: direct_speech。\n- factual_status: partial；verification_scope: column_only；verification_basis: [column]。正文通过 Kimi 登录页获取，未读取图片、原始视频或外部资料复核。",
  "rulesDigest": "bilibili_opus_ingest_v2",
  "sourceReport": {
    "workflow": "bilibili_opus_ingest_v2",
    "sourceId": {
      "opus": "1238642862831173684",
      "column": "cv52522725",
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
    "targetPath": "vault/00-Inbox/每家公司即将构建的ai智能体-vercel首席执行官guillermo-ra-哔哩-c9dc516b.md",
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
      "totalUnits": 21894,
      "retained": 2859,
      "removed": 19035,
      "unresolved": 0
    },
    "relatedNotes": [
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/5次创业者-AI智能体独自经营初创公司.md"
    ],
    "conceptCandidates": [
      "ai_agent",
      "bilibili",
      "agent_architecture",
      "harness_engineering",
      "context_engineering",
      "ai_safety",
      "multi_agent"
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
  "proposalDigest": "e2b7c2e572146f5a7c5e6f70a91b851b5a3357440343a5879603f00db6e35292"
}
```
<!-- syno:json:end -->
