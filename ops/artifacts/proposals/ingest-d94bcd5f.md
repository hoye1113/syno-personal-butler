---
id: ingest-d94bcd5f
candidateId: candidate-fbb3c357
status: applied
suggestedPath: "vault/02-Resources/AI and Agents/Agent Design & Patterns/自进化Agent研究综述-腾讯程序员-20260813.md"
risk: high
created: 2026-08-13T04:14:14.721Z
---

# Ingest proposal: 自进化 Agent（Self-Evolving Agent）研究综述

<!-- syno:json:start -->
```json
{
  "id": "ingest-d94bcd5f",
  "candidateId": "candidate-fbb3c357",
  "status": "applied",
  "suggestedPath": "vault/02-Resources/AI and Agents/Agent Design & Patterns/自进化Agent研究综述-腾讯程序员-20260813.md",
  "suggestedTags": [
    "ai_agent",
    "article",
    "wechat",
    "skills",
    "loop_engineering"
  ],
  "suggestedLinks": [
    "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Qodo研究员-长上下文越多Agent越笨.md",
    "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Agent工程-从第一性原理讲解Ralph Loop.md",
    "vault/01-Areas/AI Agent Development/06-Harness Engineering/6-1 Harness-模型外面的这层壳.md"
  ],
  "risk": "high",
  "created": "2026-08-13T04:14:14.721Z",
  "sourceDescriptor": {
    "kind": "unknown",
    "observedAt": "2026-08-13T04:14:14.667Z",
    "capturedAt": "2026-08-13T04:14:14.667Z",
    "captureChannel": "web",
    "sourceTier": "unknown",
    "reliability": "unverified",
    "userSuppliedSource": false,
    "verificationStatus": "needs_source"
  },
  "sourceType": "text",
  "quality": {
    "status": "accepted",
    "reasons": [
      "来源可追溯：公众号链接、作者、机构齐全",
      "内容为系统性的研究综述，覆盖三大技术路线、14 篇论文、横向对比与关键洞察，信息密度高",
      "与 vault 主题（AI Agent 时代）高度相关，属于长期知识价值高的参考资料",
      "来源正文为第三方综述，事实状态标记为 unverified，需在收录时披露"
    ]
  },
  "materialTier": "A",
  "canonicalTags": [
    "ai_agent",
    "article",
    "wechat",
    "skills",
    "loop_engineering"
  ],
  "duplicateAssessment": {
    "matches": [
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Qodo研究员-长上下文越多Agent越笨.md",
      "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Agent工程-从第一性原理讲解Ralph Loop.md",
      "vault/01-Areas/AI Agent Development/06-Harness Engineering/6-1 Harness-模型外面的这层壳.md",
      "vault/01-Areas/AI Agent Development/04-Context Engineering/4-8 LLM 编译知识库.md",
      "vault/02-Resources/AI and Agents/MOC - AI 评估与研究.md"
    ],
    "sameSource": false,
    "updateStatus": "new"
  },
  "relations": [],
  "mocChanges": [
    {
      "action": "update",
      "target": "vault/02-Resources/AI and Agents/MOC - AI 评估与研究.md",
      "description": "建议将本综述加入 MOC - AI 评估与研究 的文章索引，补充自进化 Agent 研究方向条目。"
    }
  ],
  "claimCandidates": [
    {
      "claim": "自进化 Agent 的核心诉求是能存、能用、能进化，让经验成为模型能力的延伸或更新通道",
      "sourceLocation": "01 自进化 Agent 介绍 / 1.1",
      "factualStatus": "unverified",
      "note": "来源为作者综述性定义，非原始论文表述"
    },
    {
      "claim": "第一类（Skill 存储型）看似不训练，实际仍依赖训练数据或交互反馈，未做到零数据",
      "sourceLocation": "02 第一类总结 / 核心点 1",
      "factualStatus": "unverified",
      "note": "作者对第一类工作的归纳判断"
    },
    {
      "claim": "Skill 总结者是被严重低估的关键模块，针对总结者本身做训练的工作屈指可数",
      "sourceLocation": "06 关键洞察 / 6.1",
      "factualStatus": "unverified",
      "note": "作者基于 11 篇工作对比得出的观察"
    },
    {
      "claim": "SkillOS 实验表明训练过的小模型总结者（Qwen3-8B Curator）优于冻结的大模型总结者（Gemini-2.5-Pro）",
      "sourceLocation": "03 第二类 / 3.5 SkillOS 结论 1",
      "factualStatus": "unverified",
      "note": "来源为综述转述论文结论，未核验原始论文"
    },
    {
      "claim": "既自动生成题目又训练总结者的象限目前没有工作覆盖，是当前最显眼的研究空白",
      "sourceLocation": "06 关键洞察 / 6.2",
      "factualStatus": "unverified",
      "note": "作者基于四篇代表工作对比得出的判断"
    },
    {
      "claim": "CoEvoSkills 实验表明 self-evo 优于 cross-model transfer，Skill 与模型风格耦合",
      "sourceLocation": "02 第一类 / 2.4 CoEvoSkills 亮点结论",
      "factualStatus": "unverified",
      "note": "来源为综述转述论文对照实验结果，具体数字需回原始论文核验"
    }
  ],
  "evidenceCandidates": [
    {
      "evidence": "EvoSkill 在 OfficeQA 上基线 60.6% 提升到 67.9%（+7.3pp），跨任务迁移到 BrowseComp 带来 +5.3pp 提升",
      "sourceLocation": "02 第一类 / 2.2 EvoSkill 评估亮点",
      "factualStatus": "unverified",
      "note": "数字来自综述转述，未核验原始论文"
    },
    {
      "evidence": "CoEvoSkills self-evo：Opus 4.6 从 30.6% 到 71.1%（+40.5），GPT-5.2 从 29.6% 到 69.8%（+40.2）；cross-model transfer 绝对值低于 self-evo（Mistral Large 3 仅 43.1%）",
      "sourceLocation": "02 第一类 / 2.4 CoEvoSkills 亮点结论",
      "factualStatus": "unverified",
      "note": "数字来自综述转述，未核验原始论文"
    },
    {
      "evidence": "SE-Agent 在 SWE-Bench Verified 上实现最高 +55% 相对改善，与底层模型选择正交",
      "sourceLocation": "02 第一类 / 2.5 SE-Agent 评估",
      "factualStatus": "unverified",
      "note": "数字来自综述转述，未核验原始论文"
    },
    {
      "evidence": "SkillRL 在 ALFWorld 89.9% vs GRPO 基线 77.6%（+12.3%），WebShop SR 72.7% vs 66.1%（+6.6%），Search-QA avg 47.1% vs ~38.5%（+8.6%）",
      "sourceLocation": "03 第二类 / 3.3 SkillRL 主要实验结果",
      "factualStatus": "unverified",
      "note": "数字来自综述转述，未核验原始论文"
    },
    {
      "evidence": "SKILL0 三阶段渐进课程：Stage 1 用 6 条 Skill 学会调用，Stage 2 用 3 条减少依赖，Stage 3 用 0 条完全内化，实现每步 < 0.5K tokens 的零样本执行",
      "sourceLocation": "03 第二类 / 3.4 SKILL0",
      "factualStatus": "unverified",
      "note": "机制描述来自综述，未核验原始论文"
    },
    {
      "evidence": "Absolute Zero 用代码执行器作为唯一验证来源，题目为 [输入, 代码, 输出] 三元组随机删除一个让答题 Agent 猜测",
      "sourceLocation": "04 第三类 / 4.3 Absolute Zero",
      "factualStatus": "unverified",
      "note": "机制描述来自综述，未核验原始论文"
    }
  ],
  "unresolved": [
    "14 篇论文的 arXiv 编号与实验数字均来自综述转述，未核验原始论文，factual_status 保持 unverified",
    "综述中部分论文（如 Hermes、GEPA）仅提及未展开，未纳入正文细节",
    "第三类工作中 sliver answer 的可靠性问题被作者指出但未给出解决方案",
    "横向 vs 纵向总结的融合空间被作者提出为开放问题，无结论",
    "新标签候选（需双审批）：self_evolving_agent"
  ],
  "validators": [
    "vault/99-System/Agent/INGEST-CONTRACT.md",
    "vault/99-System/Agent/DENSITY-PROFILE.md",
    "vault/99-System/Skills/vskill-vault-curate/SKILL.md"
  ],
  "sourceDigest": "c5340298d38bd4a7a554ccaf2416d963c37bba03abaeaef73a228c558c3de9e2",
  "existingNoteRef": "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Qodo研究员-长上下文越多Agent越笨.md",
  "rulesDigest": "599e0c50d0a1166ff4be65b0d29bbb7a1a29038df5dc2ea3038aa3b50df37c31",
  "proposalDigest": "3b8e3783f9f21b7c261990454a77483bb643f0da8dc2d052277d2956fa35bfd3"
}
```
<!-- syno:json:end -->
