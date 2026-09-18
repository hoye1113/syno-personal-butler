---
title: "MOC - AI 评估与研究"
tags: ["ai_agent", "ai_evaluation", "moc"]
legacy_tags: ["ai_agent", "ai_evaluation", "moc"]
created: "2026-07-15"
source: "vault_initiative - moc - split from Agent Theory and Design"
description: "AI 评估与研究横切 MOC——frontier eval/benchmark 饱和/LLM-as-judge/RL 小模型/论文，从原 Agent Theory MOC J 段迁入。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/MOC - AI 评估与研究.md"
source_sha256: "351bad684f6a11e39a2e4c7879d7ccde85f5ac5d79e0e19a5c4c07a97bf55471"
migration_id: "migration-20260720-64e79771"
updated: 2026-09-17
---
# MOC - AI 评估与研究

> 前沿 eval、benchmark 饱和、LLM-as-judge 校准、RL 小模型、论文俱乐部。从原 [[MOC - Agent Theory and Design]] 拆分。

## AI 评估与研究

> 前沿 eval、benchmark 饱和、LLM-as-judge 校准、RL 小模型、论文俱乐部。

| 文章 | 核心主题 |
|------|---------|
| [[Superpowers Evals 在测什么 - Fly]] | 工作流行为评测：Quorum 编排 + Gauntlet QA 测 skill/TDD/review 合规，非算法 benchmark |
| [[OpenAI评估团队-不再低估模型]] | Frontier eval、benchmark 饱和、bench gaming、SWE-bench Verified→真实工作 task |
| [[OpenAI评估团队-AI编程评估集历史现状与未来]] | OpenAI 评估团队：编程评估集历史与未来（**A-dialogue v3.2-asr** ✓） |
| [[前OpenAI研究员-持续学习瓶颈]] | 持续学习瓶颈（**canonical v3.2** ✓） |
| [[Transformer作者-AI泛化与类人学习]] | Transformer 作者：泛化与类人学习（**canonical v3.2** ✓） |
| [[Agenta CEO-构建真正有效的AI评估]] | LLM-as-judge 校准、GEPA 提示词优化、业务 error analysis、二元评判、TauBench |
| [[DeepMind团队-AI评估规划化与民主化]] | Kaggle 评估民主化、SAE 智能体考试、Game Arena PvP、工具/模型混淆 |
| [[Snorkel-小模型RL超越大模型]] | 4B + GRPO beat 235B；tool discipline > reasoning；rubrics 定位 behavior gap |
| [[YC论文俱乐部-5篇论文揭示AI研究趋势]] | Bio scaling、Self-play RL、Stream RAG、Lean 验证、RTS 式 agentic coding |
| [[Langfuse-LLM评估与准确训练]] | Marc：Skills 捷径、无主见 tracing、trace 80%、目标函数陷阱（**canonical v3.2** ✓） |

## 按问题空间补充：分类治理批次（2026-09-17）

### 评测、基准与可靠性分离

| 笔记 | 关联机制 |
|---|---|
| [[braintrust-cto-你的智能体进化了-但评测没有-哔哩哔哩-059be32d]] | 模型升级、系统架构变化、步骤级评测与可靠性分离 |
| [[vals-联创-前沿ai模型-如何评估-哔哩哔哩-d914331d]] | 独立评测、私有基准、成本与企业决策 |
| [[Deepset工程师-小模型领域微调]] | 可验证奖励、Verifiers、SFT→RL 与小模型评估 |

### 安全、评分器博弈与公共治理

| 笔记 | 关联机制 |
|---|---|
| [[redwood-ceo-ai安全-2367ade9]] | 评分器博弈、监督规避、多智能体协作与外部评估 |
| [[白宫科技主任-ai战略-f1d58fb9]] | 公共 AI 战略、开放/封闭模型、监管与治理边界 |

---

### P1-A-02（2026-09-18）

| 笔记 | 关联机制 |
|---|---|
| [[Anthropic团队-我们如何打造下一代Claude]] | 反馈聚类、合成评测、记忆再巩固与模型产品化 |

### P1-A-03（2026-09-18）

| 笔记 | 关联机制 |
|---|---|
| [[Gray Swan创始人-Codex之后AI安全重写]] | 自动化红队、过滤模型、电脑使用攻击面与可解释性 |

### P1-A-04（2026-09-18）

| 笔记 | 关联机制 |
|---|---|
| [[OpenClaw创始人-Claw现状与安全治理]] | 安全公告、攻击面、基金会治理、并发与记忆边界 |


### P1-B-01（2026-09-18）

| 笔记 | 关联机制 |
|---|---|
| [[微软CEO-AI竞争终局与企业私有评估]] | 私有评估、Harness 与企业数据工具绑定 |
| [[Anthropic联创-AI影响比工业革命大10倍快10倍]] | 第三方验证、监管、教育与 AI 社会影响 |
| [[C++之父-AI代码的局限性]] | 安全关键代码、静态类型与事实核验 |



### P1-B-03（2026-09-18）

| 笔记 | 关联机制 |
|---|---|
| [[OpenAI健康团队-AI在医疗领域的进展]] | Healthbench、临床副驾驶、数据和医疗评估 |
| [[OpenAI研究员Noam Brown-测试时算力让评估与安全失效]] | 测试时算力、评测横坐标、RSP 与长任务安全 |
| [[OpenAI研究主管Mark Chen-研究品味是人类的终极壁垒]] | 独立评测、强化学习、研究品味与失败反馈 |

## 跨 MOC

| 横切主题 | MOC |
|---|---|
| 全库导航 | [[MOC - 知识库导航]] |
| Agent 理论总览 | [[MOC - Agent Theory and Design]] |
| Harness 工程 | [[MOC - Harness Engineering]] |
| Prompt/上下文工程 | [[MOC - Prompt 工程]] |
| 职业与组织 | [[MOC - AI 时代个人发展与组织]] |
| Loock 全栈课程 | [[MOC - Loock AI 全栈课程]] |

