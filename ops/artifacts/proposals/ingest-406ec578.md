---
id: ingest-406ec578
candidateId: candidate-684a3d48
status: applied
suggestedPath: "vault/02-Resources/AI and Agents/AI Research & Trends/Anthropic 调查揭示公众与员工对 AI 影响的预期鸿沟.md"
risk: merge
created: 2026-10-18T13:45:04.092Z
---

# Ingest proposal: The AI Expectations Gap — Anthropic

<!-- syno:json:start -->
```json
{
  "id": "ingest-406ec578",
  "candidateId": "candidate-684a3d48",
  "status": "applied",
  "suggestedPath": "vault/02-Resources/AI and Agents/AI Research & Trends/Anthropic 调查揭示公众与员工对 AI 影响的预期鸿沟.md",
  "suggestedTags": [
    "article",
    "anthropic"
  ],
  "suggestedLinks": [
    "vault/02-Resources/AI and Agents/AI Research & Trends/Anthropic 调查揭示公众与员工对 AI 影响的预期鸿沟.md",
    "vault/02-Resources/AI and Agents/Agent Design & Patterns/Anthropic Agent 工程实战指南 - 从入门到生产落地.md",
    "vault/02-Resources/AI and Agents/Agent Design & Patterns/The Founders Playbook - 打造 AI 原生创业公司.md"
  ],
  "risk": "merge",
  "created": "2026-10-18T13:45:04.092Z",
  "sourceDescriptor": {
    "kind": "url",
    "originalUrl": "https://www.anthropic.com/research/ai-expectations-gap",
    "canonicalUrl": "https://www.anthropic.com/research/ai-expectations-gap",
    "publisher": "www.anthropic.com",
    "observedAt": "2026-10-18T13:45:00.429Z",
    "capturedAt": "2026-10-18T13:45:00.429Z",
    "captureChannel": "feishu",
    "platformMessageId": "om_x100b62789a190cb0b08ae4c17e81cee:<none>:capture_submit:c9c94a45c4ba126d",
    "sourceTier": "secondary",
    "reliability": "unverified",
    "userSuppliedSource": true,
    "verificationStatus": "unverified"
  },
  "captureFormat": "full_body_v1",
  "sourceType": "url",
  "quality": {
    "status": "limited",
    "reasons": [
      "来源为 Anthropic 官方研究页面，作者、机构、日期、调查方法与参考文献信息完整，主题聚焦且可追溯。",
      "artifact 元数据标记 risk=merge，且已有同主题、同来源内容的 canonical 笔记，符合一来源一篇原则。",
      "当前输入为待分析正文，未通过浏览器或网络工具独立复核原始 URL 与图片资源完整性，因此状态保留为 limited。"
    ]
  },
  "materialTier": "S",
  "canonicalTags": [
    "article",
    "anthropic"
  ],
  "duplicateAssessment": {
    "matches": [
      "vault/02-Resources/AI and Agents/AI Research & Trends/Anthropic 调查揭示公众与员工对 AI 影响的预期鸿沟.md",
      "vault/02-Resources/AI and Agents/Agent Design & Patterns/Anthropic Agent 工程实战指南 - 从入门到生产落地.md",
      "vault/02-Resources/AI and Agents/Agent Design & Patterns/The Founders Playbook - 打造 AI 原生创业公司.md",
      "vault/02-Resources/AI and Agents/AI Native Organization Product & Career/Anthropic Labs负责人Mike Krieger-构建AI原生产品的两个思想实验.md",
      "vault/01-Areas/AI Agent Development/01-Cognitive Calibration/1-4 Agent 架构演进.md"
    ],
    "sameSource": false,
    "updateStatus": "new"
  },
  "relations": [],
  "mocChanges": [],
  "claimCandidates": [
    {
      "id": "claim-1",
      "statement": "美国公众与 Anthropic 员工对 AI 当前能力判断相近，但对未来进步速度、扩散范围和节省时间幅度的预期明显不同。",
      "status": "partial",
      "evidenceRefs": [
        "source-body/key-findings",
        "source-body/what-people-expect-ai-to-do"
      ]
    },
    {
      "id": "claim-2",
      "statement": "39% 的美国成年受访者和 91% 的 Anthropic 员工预计 AI 到 2030 年能够做出诺贝尔奖级别的发现。",
      "status": "partial",
      "evidenceRefs": [
        "source-body/key-findings",
        "source-body/capabilities"
      ]
    },
    {
      "id": "claim-3",
      "statement": "Anthropic 员工平均预计 AI 到 2030 年可完成其当前 75% 的工作，而美国工人平均预计为 28%。",
      "status": "partial",
      "evidenceRefs": [
        "source-body/introduction",
        "source-body/own-work-and-jobs"
      ]
    },
    {
      "id": "claim-4",
      "statement": "在预期 AI 替代自身工作比例更高的人群中，两组受访者都预期更高的 2030 年失业率。",
      "status": "partial",
      "evidenceRefs": [
        "source-body/own-job-exposure-and-unemployment-forecasts",
        "source-body/figure-6"
      ]
    },
    {
      "id": "claim-5",
      "statement": "按 Anthropic 经济情景模型映射，美国成年人中位回答隐含 2030 年 GDP 增长 5.4%，Anthropic 员工中位回答隐含 17.1%。",
      "status": "partial",
      "evidenceRefs": [
        "source-body/mapping-survey-responses-to-model-implied-economic-scenarios",
        "source-body/figure-7"
      ]
    }
  ],
  "evidenceCandidates": [
    {
      "id": "evidence-1",
      "kind": "survey_result",
      "source": "untrusted-source",
      "excerpt": "91% of staff expect AI to be able to make a Nobel-level discovery by 2030, compared to 39% of US adults.",
      "supportsClaims": [
        "claim-2"
      ],
      "status": "partial"
    },
    {
      "id": "evidence-2",
      "kind": "survey_result",
      "source": "untrusted-source",
      "excerpt": "On average, staff members expect AI to be able to do 75% of their current work by 2030, compared to 28% for US workers overall.",
      "supportsClaims": [
        "claim-3"
      ],
      "status": "partial"
    },
    {
      "id": "evidence-3",
      "kind": "survey_result",
      "source": "untrusted-source",
      "excerpt": "Across US workers, ten more percentage points of work affected is associated with 0.4 points more forecasted unemployment.",
      "supportsClaims": [
        "claim-4"
      ],
      "status": "partial"
    },
    {
      "id": "evidence-4",
      "kind": "model_result",
      "source": "untrusted-source",
      "excerpt": "The median US adult's answers imply GDP growth of 5.4% in 2030. The median staff member's answers imply GDP growth accelerating to 17.1% by 2030.",
      "supportsClaims": [
        "claim-5"
      ],
      "status": "partial"
    },
    {
      "id": "evidence-5",
      "kind": "method_note",
      "source": "untrusted-source",
      "excerpt": "The US adults sample is restricted to employed respondents only. Staff answered on a slider while US adults choose a range and we use range midpoints.",
      "supportsClaims": [
        "claim-3"
      ],
      "status": "partial"
    }
  ],
  "unresolved": [
    "需要通过浏览器或 Host 授权流程核验原始 URL 当前页面、正文完整性与图片资源状态。",
    "需要确认是否将既有笔记的来源统一更新为官方 Anthropic URL，以及是否合并重复内容。",
    "既有笔记来自第三方聚合页，若合并，应保留官方来源字段并说明聚合页仅为历史收录来源。",
    "调查数据、模型映射和图示均来自来源正文，当前未独立复核原始附录或数据文件。"
  ],
  "validators": [
    "source_traceability",
    "duplicate",
    "retention",
    "frontmatter",
    "relation_quality",
    "factual_status",
    "unresolved"
  ],
  "sourceDigest": "5e9da3b16dec16529d0db9087a35119dacb9a5f818f835ffc0a02ec12a0cf280",
  "existingNoteRef": "vault/02-Resources/AI and Agents/AI Research & Trends/Anthropic 调查揭示公众与员工对 AI 影响的预期鸿沟.md",
  "existingNoteVersion": "78ad4c52aee444e5244cf5faf0b05906bd5594a4c7c067664b91f370bdd682d0",
  "guide": "官方研究页面，主题是公众与 Anthropic 员工对 AI 能力、采用、生产率、岗位替代与失业预期的差异。检测到高度疑似重复内容，建议合并进既有 canonical 笔记，而不是新建第二篇。",
  "rulesDigest": "d116ca5b375e9d914e4647e98f32ef02cdad2f01b961e4481fcdd0030adde5be",
  "proposalDigest": "c62c668b6b7fa6b0a469c0e7bb2946f0c2c7d6da1b5802bea10893a274b95cc5"
}
```
<!-- syno:json:end -->
