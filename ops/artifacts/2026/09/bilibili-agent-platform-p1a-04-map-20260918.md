---
title: "B站历史桶 P1-A-04 分类迁移映射"
created: 2026-09-18
updated: 2026-09-18
status: verified
batch: P1-A-04
scope: "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台"
sourceCount: 19
movedCount: 19
sourcePathRepaired: 19
connectedCount: 19
oldPathReferencesRepaired: 6
verifiedAt: 2026-09-18
---

# B站历史桶 P1-A-04 分类迁移映射

## 批次说明

本批次处理 `Agent架构与平台` 剩余的全部 19 篇。判断依据为摘要、章节和正文主线，按主要问题/机制归类；不以作者、平台或旧目录作为长期主题依据。

## 映射表

| 当前路径 | 标题 | 来源 ID | 主要问题/机制 | 目标领域 | 目标 MOC | 置信度 | 迁移动作 | 链接影响 | 迁移理由 | 状态 |
|---|---|---|---|---|---|---|---|---|---|---|
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Notius创始人-AI研究工具与检索.md` | AI 研究工具与检索 | BV1nWLA6EEv2 | 垂直 AI 的组织角色、领域专家、评估者与架构师 | AI Native Organization Product & Career | [[MOC - AI 时代个人发展与组织]] | high | move + source_path + MOC | 从历史桶入口转入组织/产品机制入口 | 正文主线是垂直 AI 产品如何由组织能力落地 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI播客-用Codex处理日常工作.md` | 用 Codex 处理日常工作 | BV1UqGd6BEzj | Codex、知识工作代理、目标、沙盒与 Referee Agent | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Codex 工作流入口 | 主要问题是具体 Codex 工具如何承载知识工作 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI官方-Codex新手教程.md` | Codex 新手教程 | BV19MzXBNESV | CLI/IDE、AGENTS.md、沙盒审批、MCP 与多 Agent 编排 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Codex 使用入口 | 正文是 Codex 的具体工具和配置工作流 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI研究员-Harness工程软件开发新范式.md` | Harness 工程软件开发新范式 | BV161o1BBERH | 非功能性需求、角色化审查、上下文预算与可靠交付 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入 Harness 工程入口 | 正文直接讨论 Harness 如何控制软件代理 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI员工-上下文工程和Agent记忆.md` | 上下文工程和 Agent 记忆 | BV14nrMBKENb | Context reshape、failure mode、trim/compact/summarize 与记忆护栏 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入上下文/记忆入口 | 主要机制是上下文生命周期和跨会话可靠性 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenClaw创始人-我是如何使用OpenClaw的.md` | 我是如何使用 OpenClaw 的 | BV1WnctziEac | WhatsApp、CLI、上下文、编排与长程循环的使用边界 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 OpenClaw 工具入口 | 主要是具体 OpenClaw 工作流与工具取舍 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenClaw创始人-Claw现状与安全治理.md` | Claw 现状与安全治理 | BV1NiooB5ESW | 安全公告、攻击面、基金会治理、并发与记忆边界 | AI Evaluation & Safety | [[MOC - AI 评估与研究]] | high | move + source_path + MOC | 从历史桶入口转入安全/治理入口 | 正文主线是 Agent 安全和生态治理 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenClaw实战-从本地到K8S部署.md` | OpenClaw 从本地到 K8S 部署 | BV18LV66aEG9 | 容器隔离、密钥管理、K8S 扩展与运行时基线 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入部署/安全运行时入口 | 主要问题是 Agent 的受控部署和规模化运行 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenCode创始人-研发内幕.md` | OpenCode 研发内幕 | BV1xC7R6VEWv | 开源编码代理、产品交付、技术债与工程判断 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Coding 工具入口 | 正文聚焦开源编码代理及其研发方式 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Peter Yang-Agent未来与职场内耗.md` | Agent 未来与职场内耗 | BV15moTBXEmk | 代理界面、任务型 App、超级个体与组织对齐 | AI Native Organization Product & Career | [[MOC - AI 时代个人发展与组织]] | high | move + source_path + MOC | 从历史桶入口转入职业/组织机制入口 | 主要问题是 Agent 如何改变组织协调与个人工作方式 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/PlanetScale-Agent时代的基础设施.md` | Agent 时代的基础设施 | BV1ZWTL64Erg | 安全默认、窄工具、平台 veto、Rewind 与数据状态 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入安全运行时入口 | 正文核心是基础设施如何约束非确定性 Agent | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Qodo研究员-长上下文越多Agent越笨.md` | 长上下文越多 Agent 越笨 | BV1TwjN6NEuA | 上下文 U 形曲线、分层摘要、检索与裁判代理 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入上下文工程入口 | 主要机制是上下文架构与评估反馈 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Raindrop CEO-打造Agent可观测性.md` | 打造 Agent 可观测性 | BV1kt5266EyW | 隐式语义信号、生产 A/B、轨迹巡检与自我诊断 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入可观测性入口 | 正文集中讨论 Agent 运行时反馈和监控 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Shopify CTO-AI时代CI范式重构.md` | AI 时代 CI 范式重构 | BV1dC5268Ei1 | 代理批评循环、PR 互斥、客户模拟与自动研究 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入验证/反馈入口 | 主要问题是 AI 时代持续集成和反馈闭环 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Taven创始人-将OpenClaw嵌入产品的实战经验.md` | 将 OpenClaw 嵌入产品 | BV1dZLS66E3m | Agent=Goals+Context+Tools、产品嵌入与客户专属 Agent | AI Native Organization Product & Career | [[MOC - AI 时代个人发展与组织]] | high | move + source_path + MOC | 从历史桶入口转入产品落地入口 | 正文重点是 Agent 产品化和客户交付模式 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Together AI-语音Agent延迟质量与规模.md` | 语音 Agent 延迟、质量与规模 | BV1U4Tz6CEzu | 实时语音流水线、延迟预算、端到端/级联与扩缩 | Agent Architecture & Runtime | [[MOC - Agent 架构与工程]] | high | move + source_path + MOC | 从历史桶入口转入 Agent 运行时架构入口 | 主要问题是语音 Agent 的系统组件与运行时权衡 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Turbopuffer CEO-Agent时代RAG与检索.md` | Agent 时代 RAG 与检索 | BV1mDDzBEEWH | 高并发检索、分层存储、P99 与搜索成本 | Agent Architecture & Runtime | [[MOC - Agent 架构与工程]] | high | move + source_path + MOC | 从历史桶入口转入 RAG/检索架构入口 | 正文主线是 Agent 的检索基础设施和查询负载 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/TypeScript专家-AI编程生产级代码.md` | AI 编程生产级代码 | BV11s526kEAk | 技能对齐、垂直切片、TDD、深层模块与并行代理 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 AI Coding 工程入口 | 主要问题是如何用工程方法约束编码代理 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/WorkOS-创建和使用Skills方法论.md` | 创建和使用 Skills 方法论 | BV18bjG6fEi7 | Skill 路由、渐进披露、置信度门控、Eval 与团队治理 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入 Skills/Harness 入口 | 主要机制是让技能成为可治理的运行时能力 | mapped |

## 处理边界

- 本批次不升级 legacy v1/v2，不新增标签，不复制笔记。
- 若目标文件已存在、来源 ID 冲突或发现主人未提交改动，该条目标记为 `needs_decision`，其余条目继续。

## 验证结果

- 处理状态：`verified`；19/19 篇完成物理迁移、`source_path` 修复和目标 MOC 接入；无 `needs_decision`。
- `agent-contract-check.py vault`：`errors=0`，`warnings=0`。
- `vault-audit.py vault`：579 files / 332 unmatched wikilinks / 63 orphan / 25 no frontmatter / 20 incomplete frontmatter / bad tags 0 / bad filenames 0。
- P1-A-04 专项校验：19/19 `source_path` 与物理路径一致；19/19 目标 MOC 可达；v2 笔记 0；来源 ID 重复 0。
- 旧路径修复：2 篇活动笔记交叉 wikilink、4 份审计 spot-check，共 6 处文件级修复。
- `git diff --check`：通过。
