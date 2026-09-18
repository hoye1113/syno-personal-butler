---
title: "B站历史桶 P1-A-02 分类迁移映射"
created: 2026-09-18
updated: 2026-09-18
status: verified
batch: P1-A-02
scope: "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台"
sourceCount: 30
movedCount: 30
sourcePathRepaired: 30
connectedCount: 30
oldPathReferencesRepaired: 4
verifiedAt: 2026-09-18
---

# B站历史桶 P1-A-02 分类迁移映射

## 批次说明

本批次按文件名排序选择 `Agent架构与平台` 中的前 30 篇。判断依据为摘要、章节和正文主线，优先采用笔记回答的主要问题/机制；不因作者或平台决定归类。迁移只改变物理主位置、`source_path` 和必要的 MOC 索引，不改正文、来源 ID、事实状态或 legacy/v2 协议。

## 映射表

| 当前路径 | 标题 | 来源 ID | 主要问题/机制 | 目标领域 | 目标 MOC | 置信度 | 迁移动作 | 链接影响 | 迁移理由 | 状态 |
|---|---|---|---|---|---|---|---|---|---|---|
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/30分钟精通OpenClaw.md` | 30分钟精通OpenClaw | BV1kWctzeEYK | OpenClaw 的安全、记忆文件、心跳和工具运行时 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 保留已有关系，补入 Harness 机制索引 | 核心是运行时配置与受保护执行边界，不是作者/平台 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/5次创业者-AI智能体独自经营初创公司.md` | AI智能体独自经营初创公司 | BV174GU6AEZY | 定时任务、代理协作与创业组织系统 | AI Native Organization Product & Career | [[MOC - AI 时代个人发展与组织]] | high | move + source_path + MOC | 从历史桶入口转入组织机制入口 | 正文主线是用 Agent 重构创业公司的工作系统 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/姚顺雨-预测性Agent设计.md` | 预测性 Agent 设计 | BV1tZw4zLEX8 | ReAct、Reflection、ToT、ACI、记忆与 Agent 设计 | Agent Architecture & Runtime | [[MOC - Agent 架构与工程]] | high | move + source_path + MOC | 从历史桶入口转入架构机制入口 | 正文比较 Agent 核心循环和记忆设计取舍 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Agent工程-从第一性原理讲解Ralph Loop.md` | Ralph Loop 第一性原理 | BV1HTXFBAE68 | 确定性上下文、长程循环、状态与人机边界 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入 Loop/Harness 机制入口 | 主要回答如何让长程 Agent 可持续、可控地运行 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Agent实战-打造一个AI Agent的完整教程.md` | 打造一个 AI Agent 的完整教程 | BV1PnQfBvEs3 | Observe-Think-Act、harness、memory、MCP 与 Skills | Agent Architecture & Runtime | [[MOC - Agent 架构与工程]] | high | move + source_path + MOC | 从历史桶入口转入 Agent 架构入口 | 正文覆盖 Agent 的核心组件和端到端循环 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Alchemy CPO-从代码审查到自动代理.md` | 从代码审查到自动代理 | BV1i9E366EAr | 代码审查、离机 Skills、代理平台与自主工作流 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Coding 工作流入口 | 主要问题是编码代理如何改变审查与交付流程 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Anthropic CPO-Claude团队为什么迭代这么快.md` | Claude 团队为什么迭代这么快 | BV18o526DEFr | AI 原生产品、快速反馈、发布节奏与团队角色 | AI Native Organization Product & Career | [[MOC - AI 时代个人发展与组织]] | high | move + source_path + MOC | 从历史桶入口转入组织/产品机制入口 | 正文主线是团队如何用反馈和角色重构加速产品迭代 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Anthropic-3亿收购开发工具初创创始人访谈.md` | Anthropic 收购开发工具初创访谈 | BV1G9Gm6REdy | MCP 工具爆炸、代码执行、上下文与 API 安全 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入工具/上下文机制入口 | 主要讨论 Harness 如何管理工具、上下文和安全边界 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Anthropic团队-解析Claude Agent平台内幕.md` | Claude Agent 平台内幕 | BV1QM5G6xEdB | 云托管 Agent、平台原语、嵌套代理与可验证结果 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入平台运行时入口 | 正文关注托管 Agent 的运行时与结果约束 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Anthropic团队-如何构建运行数小时的Agent.md` | 如何构建运行数小时的 Agent | BV19sGH6UECj | Ralph、压缩、生成器-评估器、完成契约与文件状态 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入长程可靠性入口 | 正文回答长时运行 Agent 的上下文和验证机制 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Anthropic团队-我们如何打造下一代Claude.md` | 如何打造下一代 Claude | BV1uDLz6iEX3 | 反馈聚类、合成评测、记忆再巩固与模型产品化 | AI Evaluation & Safety | [[MOC - AI 评估与研究]] | high | move + source_path + MOC | 从历史桶入口转入评估机制入口 | 核心机制是反馈如何转化为 Eval 和模型迭代 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Banking负责人-Agent时代平台设计.md` | Agent 时代的平台设计 | BV1MM9xBHEsQ | API/MCP 优先、机器可读规范、自助服务与验证闭环 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入平台可靠性入口 | 正文主线是让 Agent 在企业平台内可控地完成任务 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿.md` | Tokenmaxxing 与 AI 智能体前沿 | BV1NuGU6yE1b | 工具调用、流程重构、自动审计与模型切换成本 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Coding 工具机制入口 | 正文围绕 Claude Code 使用方式和工程流程变化 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code负责人-创造内幕.md` | Claude Code 创造内幕 | BV1SJ93B2EBo | AI 编码、权限、安全、上下文与印刷术时刻 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Coding 工具入口 | 主要问题是 Claude Code 如何改变软件工作流 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code负责人-AI原生团队如何使用AI.md` | AI 原生团队如何使用 AI | BV1eyBgB2EbX | E2E 原型、Todo/Plan、反馈循环与团队协作 | AI Native Organization Product & Career | [[MOC - AI 时代个人发展与组织]] | high | move + source_path + MOC | 从历史桶入口转入组织工作流入口 | 正文关注团队如何把 AI 纳入产品与工程协作 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code实战-构建一个AI数据分析师.md` | 用 Claude Code 构建 AI 数据分析师 | BV1Mpf9B5Egk | MCP 数据访问、分析循环、语义层与 Skills 护栏 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入具体 Coding 工作流入口 | 主要是 Claude Code 的数据分析实践 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code实战-结合Obsidian打造第二大脑.md` | 用 Claude Code 与 Obsidian 打造第二大脑 | BV1s2Gd6aEF7 | 文件上下文、检索、子 Agent 与知识工作流 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入具体工具工作流入口 | 主要问题是 Claude Code 如何嵌入个人知识工作流 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code实战-鲜为人知的Claude Code工作流.md` | 鲜为人知的 Claude Code 工作流 | BV1HwdjBHENb | MCP、设计中间层、A/B 测试与自动化营销闭环 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Coding 工作流入口 | 正文是 Claude Code 驱动的端到端工作流 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code实战-用AI实现生活自动化.md` | 用 AI 实现生活自动化 | BV1oZ536AE4T | 文件夹 OS、MCP/CLI、心跳、例程与技能堆叠 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入个人工具工作流入口 | 主要是 Claude Code/OpenClaw 的具体使用方式 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code实战-Gstack把AI变成团队.md` | Gstack 把 AI 变成团队 | BV1tR9zB4Ezv | 角色编排、对抗审查、设计探索与 Playwright QA | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Coding 编排入口 | 主要问题是 Claude Code 脚手架如何承载团队角色 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code之父-编程已被解决接下来发展.md` | 编程已被解决，接下来的发展 | BV19V5t6ME6c | 代理化编码、例程、组织流程与软件民主化 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Coding 工具/工作流入口 | 主要问题是编码自动化如何改变软件生产 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code之父-亲自讲解Cowork.md` | Claude Code 之父讲解 Cowork | BV19uzXBeEMp | Cowork、VM、文件夹边界、技能与可验证输出 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Cowork/Coding 工具入口 | 正文是具体产品和工作方式解析 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Cowork-另一种Claude Code.md` | Claude Cowork：另一种 Claude Code | BV1xEzqBVEeb | 异步任务队列、Chrome/MCP 与 Agent 原生工作方式 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Cowork 工具入口 | 主要问题是具体工具如何支持异步代理工作 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude设计主管-Cowork揭秘40分钟教程.md` | Cowork 设计揭秘 | BV1ohDzBwEJN | 原型驱动设计、内部 dogfooding 与 AI 产品交互 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 AI 工具产品实践入口 | 内容围绕 Cowork 的设计与验证工作流 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Cloudflare专家-Sandbox确保AI代码安全.md` | Sandbox 确保 AI 代码安全 | BV1ADobBcECX | 威胁模型、能力权限、隔离、秘密代理与沙盒清单 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入安全/权限机制入口 | 正文核心是 Agent 执行环境的安全边界 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex产品负责人-Codex团队如何用Codex.md` | Codex 团队如何使用 Codex | BV1iKdvBhEYJ | 规范、多人委托、设计师编码、招聘与产品冲刺 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Codex 工作流入口 | 主要机制是 Codex 如何改变团队交付方式 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex负责人-现场演示Codex.md` | 现场演示 Codex | BV12qTu6WETP | 双 Agent 审查、责任边界、数据上下文与 Codex 使用 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Codex 工具入口 | 正文围绕 Codex 的产品工作流和责任边界 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-100分钟完整教程.md` | Codex 100 分钟完整教程 | BV1j15A6gEcL | 项目边界、插件、技能、自动化与并行编码 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Codex 实战入口 | 主要是 Codex 的具体使用流程 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-30分钟掌握95%核心功能.md` | Codex 95% 核心功能 | BV1bpdAB8Ejp | 本地文件、Agents.md、插件、技能、浏览器与自动化 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Codex 实战入口 | 主要是 Codex 功能与工作流组合 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-构建个人操作系统.md` | 用 Codex 构建个人操作系统 | BV1BHKX68Ee5 | Skills 自我改进、个人 OS、自动化与 AI 采纳 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Codex/Personal OS 入口 | 正文以 Codex 的个人工作流落地为主 | mapped |

## 处理边界

- 本批次不升级 legacy v1/v2，不新增标签，不复制笔记。
- 目标 MOC 只新增机制入口；若目标 MOC 已有同名链接，则保留既有条目并在验证中记录，不重复添加。
- 如果执行前发现目标文件已存在、来源 ID 冲突或正文存在主人未提交改动，该条目改为 `needs_decision`，其余条目继续。

## 验证结果

- 批次完整性：30/30 目标文件存在；30/30 `source_path` 与物理路径一致；30/30 目标 MOC 链接恰好一条；30/30 来源 ID 在本批次内无重复；本批次没有 v2 笔记升级。
- `agent-contract-check.py vault`：`errors=[]`，`warnings=[]`。
- `vault-audit.py vault`：579 个文件；332 个未匹配 wikilink、63 个 orphan、25 个无 frontmatter、20 个不完整 frontmatter；坏标签和坏文件名均为 0，审计指标未恶化。
- `git diff --check`：通过；活动 vault 内 4 个旧路径引用已修复，`vault/99-System/audit` 历史审计记录未改。
