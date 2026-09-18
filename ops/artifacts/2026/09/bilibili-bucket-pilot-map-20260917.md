---
id: bilibili-bucket-pilot-map-20260917
title: "B站历史导入桶主题迁移试点 2026-09-17"
kind: knowledge-taxonomy-pilot
status: applied
scope: "vault/02-Resources/AI and Agents/B站视频知识库/AI评估与研究 + AI编程实战"
created: 2026-09-17
appliedAt: 2026-09-17
bucketMarkdownBefore: 220
movedCount: 18
bucketMarkdownAfter: 202
rule: primary-question-and-mechanism
---

# B站历史导入桶主题迁移试点 2026-09-17

本试点验证“先读摘要/章节/正文主线，再按主要问题迁移”的小批次流程。只移动文件，并同步更新笔记中的 `source_path`；不改正文、标签、来源 ID 或 v1/v2 状态。

## 迁移表

| 原位置 | 主领域 | 目标位置 | 主要问题/机制 |
|---|---|---|---|
| `B站视频知识库/AI评估与研究/前OpenAI研究员-持续学习瓶颈.md` | AI Evaluation & Safety | `AI Evaluation & Safety/` | 持续学习瓶颈、泛化与训练动力学 |
| `B站视频知识库/AI评估与研究/Agenta CEO-构建真正有效的AI评估.md` | AI Evaluation & Safety | `AI Evaluation & Safety/` | LLM-as-judge 校准、业务错误聚类与 GEPA |
| `B站视频知识库/AI评估与研究/DeepMind团队-AI评估规划化与民主化.md` | AI Evaluation & Safety | `AI Evaluation & Safety/` | 评估民主化、开放基准与工具/模型混淆 |
| `B站视频知识库/AI评估与研究/Langfuse-LLM评估与准确训练.md` | AI Evaluation & Safety | `AI Evaluation & Safety/` | tracing、目标函数与准确训练 |
| `B站视频知识库/AI评估与研究/OpenAI评估团队-不再低估模型.md` | AI Evaluation & Safety | `AI Evaluation & Safety/` | frontier eval、benchmark 饱和与真实工作任务 |
| `B站视频知识库/AI评估与研究/OpenAI评估团队-AI编程评估集历史现状与未来.md` | AI Evaluation & Safety | `AI Evaluation & Safety/` | SWE-bench 污染、人工审核与 preparedness eval |
| `B站视频知识库/AI评估与研究/Snorkel-小模型RL超越大模型.md` | AI Evaluation & Safety | `AI Evaluation & Safety/` | 工具纪律、专家数据与小模型 RL |
| `B站视频知识库/AI评估与研究/Transformer作者-AI泛化与类人学习.md` | AI Evaluation & Safety | `AI Evaluation & Safety/` | 少样本泛化、RL 与类人学习 |
| `B站视频知识库/AI评估与研究/YC论文俱乐部-5篇论文揭示AI研究趋势.md` | AI Evaluation & Safety | `AI Evaluation & Safety/` | 蛋白质 scaling、self-play、RAG、形式化验证与 agentic coding |
| `B站视频知识库/AI编程实战/AI设计实战-6个AI共同设计App.md` | AI Coding & Tools | `AI Coding & Tools/` | 多 Agent 设计、画布协作与设计/代码单一事实源 |
| `B站视频知识库/AI编程实战/Claude Design实战-从创意到高保真.md` | AI Coding & Tools | `AI Coding & Tools/` | 需求澄清、线框探索与高保真交付边界 |
| `B站视频知识库/AI编程实战/Codex实战-AI编程2026新手教程.md` | AI Coding & Tools | `AI Coding & Tools/` | Codex Vibe 编程与跨端构建工作流 |
| `B站视频知识库/AI编程实战/Seedance实战-AI视频可控编辑.md` | AI Coding & Tools | `AI Coding & Tools/` | 多输入视频生成、扩展、唇形同步与落地 |
| `B站视频知识库/AI编程实战/一人公司案例-开发5个APP的AI技能.md` | AI Native Organization Product & Career | `AI Native Organization Product & Career/` | 一人公司、技能资产与多产品维护 |
| `B站视频知识库/AI编程实战/Granola联创-AI笔记软件应该这样.md` | AI Native Organization Product & Career | `AI Native Organization Product & Career/` | AI 笔记产品的意图、隐私与体验边界 |
| `B站视频知识库/AI编程实战/Stripe设计主管-用AI设计新网站.md` | AI Native Organization Product & Career | `AI Native Organization Product & Career/` | AI 设计探索、产品叙事与人工判断 |
| `B站视频知识库/AI编程实战/GPT Image2深度测评-AI生图进化.md` | Frontier Models & Physical AI | `Frontier Models & Physical AI/` | 图像模型能力、世界知识与推理式生成 |
| `B站视频知识库/AI编程实战/OpenAI官方-GPT Image2.0演示.md` | Frontier Models & Physical AI | `Frontier Models & Physical AI/` | 视觉智能、思考模式与多语言文本生成 |

## 边界与后续

- 试点后历史桶剩余 202 个 Markdown，其中 201 篇为来源笔记、1 篇为本目录 README。
- `Agent架构与平台` 与 `行业观点与组织` 的剩余内容不按目录名整体搬迁；下一批仍需逐篇检查主要问题和现有关系。
- 不创建新的 BCI/组织 MOC，不新增标签；已有 MOC 入口只放链接，不复制来源笔记。
