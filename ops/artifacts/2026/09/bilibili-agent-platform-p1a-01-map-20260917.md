---
title: "B站历史桶 P1-A-01 分类迁移映射"
created: 2026-09-17
updated: 2026-09-17
status: verified
batch: P1-A-01
scope: "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台"
sourceCount: 30
movedCount: 30
sourcePathRepaired: 30
connectedCount: 30
oldPathReferencesRepaired: 4
verifiedAt: 2026-09-17
---

# B站历史桶 P1-A-01 分类迁移映射

## 批次说明

本批次从 `Agent架构与平台` 中选择 30 篇高置信度来源笔记。判断依据是笔记的描述、章节和正文主线，不以作者、平台或旧目录作为主题归类依据。迁移只改变物理主位置和必要索引路径；保留正文、来源 ID、事实状态以及 legacy/v2 状态。

## 映射表

| 当前路径 | 来源 ID | 目标领域 | 目标位置 | 目标 MOC | 主要问题/机制 | 置信度 | MOC 动作 | 状态 |
|---|---|---|---|---|---|---|---|---|
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/杨立昆-LLM到不了AGI世界模型才能.md` | `BV1wwDbBGEsA` | Frontier Models & Physical AI | `02-Resources/AI and Agents/Frontier Models & Physical AI/杨立昆-LLM到不了AGI世界模型才能.md` | [[MOC - Agent 架构与工程]] | 世界模型、JEPA、莫拉维克悖论与 LLM 路线边界 | high | add to frontier/mechanism section | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Abridge-监听1亿次医生诊疗的AI.md` | `BV1RrLz6rEH2` | Frontier Models & Physical AI | `02-Resources/AI and Agents/Frontier Models & Physical AI/Abridge-监听1亿次医生诊疗的AI.md` | [[MOC - Agent 架构与工程]] | 环境式语音监听、临床决策层与医疗数据闭环 | high | add to frontier/mechanism section | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/DeepMind播客-AlphaGo10周年AI转折点.md` | `BV1oGDbBeEjv` | Frontier Models & Physical AI | `02-Resources/AI and Agents/Frontier Models & Physical AI/DeepMind播客-AlphaGo10周年AI转折点.md` | [[MOC - Agent 架构与工程]] | 直觉与搜索在蛋白质、矩阵乘法等科学问题中的迁移 | high | add to frontier/mechanism section | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Ulta副总裁-AI Agent落地零售行业实践.md` | `BV1ynJu6EEpC` | AI Native Organization Product & Career | `02-Resources/AI and Agents/AI Native Organization Product & Career/Ulta副总裁-AI Agent落地零售行业实践.md` | [[MOC - AI 时代个人发展与组织]] | 企业 AI 转型、自动化边界、数据基础与结果倒推 | high | retain existing target link | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/xAI研究员-从零构建视频模型的内幕.md` | `BV1gDE56gE7B` | Frontier Models & Physical AI | `02-Resources/AI and Agents/Frontier Models & Physical AI/xAI研究员-从零构建视频模型的内幕.md` | [[MOC - Agent 架构与工程]] | 视频生成模型、语言模型推理与代理能力的耦合 | high | add to frontier/mechanism section | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/微软Agent观测实践.md` | `BV1u3Lz6AEb3` | Harness Context & Reliability | `02-Resources/AI and Agents/Harness Context & Reliability/微软Agent观测实践.md` | [[MOC - Harness Engineering]] | OTEL、任务依从性、多代理红队与观察技能闭环 | high | add to observability section | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/杨立昆-世界模型才是未来.md` | `BV1CoLA6REyB` | Frontier Models & Physical AI | `02-Resources/AI and Agents/Frontier Models & Physical AI/杨立昆-世界模型才是未来.md` | [[MOC - Agent 架构与工程]] | JEPA、抽象表征、世界模型与 LLM 的架构边界 | high | add to frontier/mechanism section | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/杨植麟-Kimi K2.5研发内幕.md` | `BV1AwXCBxEBk` | Frontier Models & Physical AI | `02-Resources/AI and Agents/Frontier Models & Physical AI/杨植麟-Kimi K2.5研发内幕.md` | [[MOC - Agent 架构与工程]] | Muon、线性注意力、上下文效率与 Agent Swarms | high | add to frontier/mechanism section | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/AI编程工具-2026年如何Code.md` | `BV1tF5m6UEGf` | AI Coding & Tools | `02-Resources/AI and Agents/AI Coding & Tools/AI编程工具-2026年如何Code.md` | [[MOC - AI Coding 与工具]] | 工具趋同、生态集成、远程控制、定时任务与知识库 | high | retain existing target link | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Arise-AI新交互方式无限画布.md` | `BV1g5V66AEUL` | Agent Architecture & Runtime | `02-Resources/AI and Agents/Agent Architecture & Runtime/Arise-AI新交互方式无限画布.md` | [[MOC - Agent 架构与工程]] | MCP/WebMCP、浏览器运行时与聊天框之外的 Agent 交互 | high | retain existing target link | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Asana CPO-AI时代工作图谱与共享记忆.md` | `BV16BQhBEEgH` | Agent Architecture & Runtime | `02-Resources/AI and Agents/Agent Architecture & Runtime/Asana CPO-AI时代工作图谱与共享记忆.md` | [[MOC - Agent 架构与工程]] | 工作图谱、共享记忆、多代理隔离与业务上下文 | high | retain existing target link | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/ClawdBot创始人-一个人顶一个团队.md` | `BV1mG6nBKECW` | AI Coding & Tools | `02-Resources/AI and Agents/AI Coding & Tools/ClawdBot创始人-一个人顶一个团队.md` | [[MOC - AI Coding 与工具]] | 代理优先编程、闭环验证、多代理并行与超级个体 | high | add to coding/workflow section; retain existing Harness view | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Eric Jang-从零构建AlphaGo.md` | `BV19qLA6BEHx` | Frontier Models & Physical AI | `02-Resources/AI and Agents/Frontier Models & Physical AI/Eric Jang-从零构建AlphaGo.md` | [[MOC - Agent 架构与工程]] | MCTS、自我对弈、搜索蒸馏与自动化研究 | high | add to frontier/mechanism section | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Hermes实战-新手配置真实案例.md` | `BV1dJEL6JEeR` | Harness Context & Reliability | `02-Resources/AI and Agents/Harness Context & Reliability/Hermes实战-新手配置真实案例.md` | [[MOC - Harness Engineering]] | 上下文管理、模型路由、工件、桌面运行时与自动化 | high | retain existing target link | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Logical CEO-解决LLM不能解决的问题.md` | `BV1kTo4BQE43` | Frontier Models & Physical AI | `02-Resources/AI and Agents/Frontier Models & Physical AI/Logical CEO-解决LLM不能解决的问题.md` | [[MOC - Agent 架构与工程]] | 能量模型、潜在变量、逻辑正确性与空间推理 | high | retain existing target link | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI首席科学家-超越代码的强化学习.md` | `BV1FZQ8B2EJn` | Frontier Models & Physical AI | `02-Resources/AI and Agents/Frontier Models & Physical AI/OpenAI首席科学家-超越代码的强化学习.md` | [[MOC - Agent 架构与工程]] | 强化学习泛化、自动化研究员、算力分配与长期对齐 | high | add to frontier/mechanism section | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenClaw教程-终极新手指南.md` | `BV1rdAVzAEdS` | Harness Context & Reliability | `02-Resources/AI and Agents/Harness Context & Reliability/OpenClaw教程-终极新手指南.md` | [[MOC - Harness Engineering]] | VPS 隔离、安全、模型路由、心跳、定时任务与子代理 | high | add to runtime/operations section | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenClaw实战-从零完成全套配置.md` | `BV1VRdABBEnK` | Harness Context & Reliability | `02-Resources/AI and Agents/Harness Context & Reliability/OpenClaw实战-从零完成全套配置.md` | [[MOC - Harness Engineering]] | 硬件隔离、灵魂文件、多智能体、记忆退化与版本控制 | high | retain existing target link | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenClaw实战-养虾指南.md` | `BV1NscRzUEia` | Harness Context & Reliability | `02-Resources/AI and Agents/Harness Context & Reliability/OpenClaw实战-养虾指南.md` | [[MOC - Harness Engineering]] | 文件结构、提示词版本、端到端自动化、安全与成本 | high | add to runtime/operations section | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenClaw实战-Every团队使用Case.md` | `BV1Dj93BUEXU` | AI Native Organization Product & Career | `02-Resources/AI and Agents/AI Native Organization Product & Career/OpenClaw实战-Every团队使用Case.md` | [[MOC - AI 时代个人发展与组织]] | 一人一 Agent、代理社交、信任阶梯与团队涌现 | high | add to organization section; retain existing Agent view | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Polsia-一人AI Agent月入百万.md` | `BV1KXDtBEEbV` | AI Native Organization Product & Career | `02-Resources/AI and Agents/AI Native Organization Product & Career/Polsia-一人AI Agent月入百万.md` | [[MOC - AI 时代个人发展与组织]] | 一人公司、结果抽成、代理原生基础设施与自证式开发 | high | add to organization/individual leverage section | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/YC合伙人-YC内部AI代理基础设施.md` | `BV1467R6LEzm` | Harness Context & Reliability | `02-Resources/AI and Agents/Harness Context & Reliability/YC合伙人-YC内部AI代理基础设施.md` | [[MOC - Harness Engineering]] | 统一上下文、工具注册表、透明协作与自我改进循环 | high | add to context/feedback section | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/亚马逊Kiro团队-规范驱动开发.md` | `BV1VczqBREQ8` | Harness Context & Reliability | `02-Resources/AI and Agents/Harness Context & Reliability/亚马逊Kiro团队-规范驱动开发.md` | [[MOC - Harness Engineering]] | 规范驱动开发、EARS、属性测试、MCP 与活文档 | high | add to validation/specification section | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Boris Cherny-Claude Code任务管理与Compound工程.md` | `BV1hkFkz9E6N` | AI Coding & Tools | `02-Resources/AI and Agents/AI Coding & Tools/Boris Cherny-Claude Code任务管理与Compound工程.md` | [[MOC - AI Coding 与工具]] | 任务账本、跨会话编排、planner/worker/tester 与复利工程 | high | retain existing target link | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-Notion第二大脑与技能封装.md` | `BV1r4Ju65EJT` | AI Coding & Tools | `02-Resources/AI and Agents/AI Coding & Tools/Codex实战-Notion第二大脑与技能封装.md` | [[MOC - AI Coding 与工具]] | Codex 浏览器、Key docs、技能封装、上下文传递与自动化 | high | retain existing target link | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/DeepMind研究员-递归循环中AI构建AI.md` | `BV1xXDjBUE8S` | Frontier Models & Physical AI | `02-Resources/AI and Agents/Frontier Models & Physical AI/DeepMind研究员-递归循环中AI构建AI.md` | [[MOC - Agent 架构与工程]] | 递归自我改进、形式验证、持续学习与长周期可靠性 | high | retain existing target link | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Deepset工程师-小模型领域微调.md` | `BV1D9ojBzEAd` | AI Evaluation & Safety | `02-Resources/AI and Agents/AI Evaluation & Safety/Deepset工程师-小模型领域微调.md` | [[MOC - AI 评估与研究]] | 可验证奖励、Verifiers、SFT→RL 与小模型评估 | high | add to eval/verification section | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/DHH-编写代码的新方式.md` | `BV1FzQhBUETs` | AI Coding & Tools | `02-Resources/AI and Agents/AI Coding & Tools/DHH-编写代码的新方式.md` | [[MOC - AI Coding 与工具]] | 代理优先编码、资深监督、工艺判断与探索成本 | high | retain existing target link | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/GitHub COO-为什么程序员还没被替代.md` | `BV11mTi6aEiP` | AI Native Organization Product & Career | `02-Resources/AI and Agents/AI Native Organization Product & Career/GitHub COO-为什么程序员还没被替代.md` | [[MOC - AI 时代个人发展与组织]] | 开发者身份、代理 PR、模型路由与个人 Agent 反馈 | high | add to career/work model section | verified |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/GitHub COO-GitHub的AI革命与14倍PR增长.md` | `BV1AGJx6fE3A` | Harness Context & Reliability | `02-Resources/AI and Agents/Harness Context & Reliability/GitHub COO-GitHub的AI革命与14倍PR增长.md` | [[MOC - Harness Engineering]] | 原子技能、权限重写、队列、Actions 与环境式 AI | high | add to workflow/feedback section | verified |

## 验证结果

- 批次完整性：30/30 目标文件存在；30/30 `source_path` 与物理路径一致；30/30 `link_status: connected`；30/30 目标 MOC 链接恰好一条；30 个旧源路径均已移除。
- `agent-contract-check.py vault`：`errors=[]`，`warnings=[]`。
- `vault-audit.py vault`：578 个文件；334 个未匹配 wikilink、64 个 orphan、25 个无 frontmatter、20 个不完整 frontmatter；坏标签和坏文件名均为 0。上述历史指标未因本批次增加。
- B 站 v2 专项校验：前一 P0 的 6 篇 v2 笔记均为 `status: complete`，仅保留 C2 无 BV 映射的既有警告；本批次 30 篇均为 legacy 笔记，不升级 v1/v2。
- 本批次 BV/CV/opus ID 重复组：0；全库仍有 9 组历史重复来源标识（作者来源别名及 1 组不在本批次内的 Karpathy BV 冲突），未在本批次扩大或改动。
- 专项测试：`54 passed, 6 subtests passed`；`git diff --check fix/bilibili-p1-claude-design-20260917..HEAD` 通过。

## 执行边界

- 本批次不创建新 MOC、不新增标签、不升级 legacy v1/v2。
- 对已有目标 MOC 的条目只保留一行，不重复添加；必要时把旧的作者/行业清单入口改为机制说明。
- 迁移后只更新准确的 `source_path` 和受影响的旧路径链接。
- 若执行前发现 source/BV ID 冲突，暂停该笔记并将其状态改为 `needs_decision`，其余笔记继续按批次处理。
