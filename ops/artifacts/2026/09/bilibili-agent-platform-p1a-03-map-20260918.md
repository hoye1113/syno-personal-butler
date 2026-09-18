---
title: "B站历史桶 P1-A-03 分类迁移映射"
created: 2026-09-18
updated: 2026-09-18
status: verified
batch: P1-A-03
scope: "vault/02-Resources/AI and Agents/B站视频知识库/Agent架构与平台"
sourceCount: 30
movedCount: 30
sourcePathRepaired: 30
connectedCount: 30
oldPathReferencesRepaired: 6
verifiedAt: 2026-09-18
---

# B站历史桶 P1-A-03 分类迁移映射

## 批次说明

本批次按文件名排序选择 `Agent架构与平台` 当前剩余内容的前 30 篇。分类依据为摘要、章节和正文主线，优先判断笔记回答的主要问题/机制；不以作者、平台或产品名称直接决定目录。

## 映射表

| 当前路径 | 标题 | 来源 ID | 主要问题/机制 | 目标领域 | 目标 MOC | 置信度 | 迁移动作 | 链接影响 | 迁移理由 | 状态 |
|---|---|---|---|---|---|---|---|---|---|---|
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-构建全能AI营销团队.md` | 构建全能 AI 营销团队 | BV1BLGH6REyX | Codex Skills、插件、子代理与营销自动化工作流 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Codex 工作流入口 | 正文主线是具体 Codex/Skills 工作流 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-演示开发一个手机App.md` | 演示开发一个手机 App | BV16e526iENH | Codex、计划模式、沙盒、设计迭代与 App 构建 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Coding 工具入口 | 主要回答如何用 Codex 完成端到端开发 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-用AI颠覆视频剪辑流程.md` | 用 AI 颠覆视频剪辑流程 | BV1ik526cEsp | Codex、Remotion、品牌资产与提示词驱动动效 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Coding/创作工具入口 | 核心是 AI 编程工具驱动的视频生产流程 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Cognition CPO-Devin的80%时刻与后台Agent.md` | Devin 的 80% 时刻与后台 Agent | BV1itEh6FEUW | 后台 Agent、测试编排、记忆、文件状态与异步 PR | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入长程运行时入口 | 主要问题是后台 Agent 的可靠执行和状态管理 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Cowork负责人-揭秘Cowork与Mythos.md` | Cowork 与 Mythos | BV1jPQhBkEvz | VM 沙盒、Markdown 技能/记忆与本地信任边界 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 保留既有 Harness 视角，新增 Coding 工具主入口 | 内容围绕 Cowork 这一具体 AI 工作工具及其使用边界 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Cursor CEO-云端智能体上线.md` | Cursor 云端智能体上线 | BV18qTi6uEDX | 云端多 Agent、移动端、原生 Git 与 Agent-first 产品 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Cursor 工具入口 | 正文主线是 Cursor 的具体 Agent 产品形态 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Cursor-128个Agent团队协作.md` | 128 个 Agent 团队协作 | BV1LFjV6BEpe | 多 Agent 并行、脚本通信、多模型分工与审查 | Agent Architecture & Runtime | [[MOC - Agent 架构与工程]] | high | move + source_path + MOC | 从历史桶入口转入多 Agent 机制入口 | 主要回答多 Agent 如何协作和相互校验 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Cursor负责人-Composer模型如何训练的.md` | Composer 模型训练 | BV1iH7R6tEfJ | 代码模型 mid-training、RL、harness rollout 与异步训练工厂 | Frontier Models & Physical AI | [[MOC - 具身智能与脑机接口]] | high | move + source_path + MOC | 从历史桶入口转入模型/硬件部署视角入口 | 正文核心是专用模型训练与真实运行环境反馈 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Cursor副总裁-构建软件开发过程的Agent.md` | 构建软件开发过程的 Agent | BV1MQVf6SEST | STLC Agent 团队、Skills 原子单元与软件交付自治 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 AI Coding 组织工作流入口 | 主要问题是 Agent 如何覆盖完整软件开发流程 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Databricks-企业级Agent生产实践.md` | 企业级 Agent 生产实践 | BV1o4TL6sExw | Eval、Trace、数据基础、编排与治理五支柱 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入生产可靠性入口 | 正文主线是企业 Agent 上线的控制面与反馈闭环 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Databricks专家-如何构建有效的Agent架构.md` | 如何构建有效的 Agent 架构 | BV1jhogBwEzo | 多 Agent 分布式架构、状态快照、契约、断路器与 Saga | Agent Architecture & Runtime | [[MOC - Agent 架构与工程]] | high | move + source_path + MOC | 从历史桶入口转入架构机制入口 | 主要回答 Agent 系统的架构和状态设计 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/DeepMind-模型将吞噬Harness.md` | 模型将吞噬 Harness | BV18hjG6bE6t | Harness 与模型边界、代理原生系统和扩展能力 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入 Harness 边界入口 | 讨论重点是模型与 Harness 的职责迁移 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/DeepMind团队-当数百万Agent相遇.md` | 当数百万 Agent 相遇 | BV1ixKX6oEzK | Agent 社会、智能委托、协作与对齐安全 | Agent Architecture & Runtime | [[MOC - Agent 架构与工程]] | high | move + source_path + MOC | 从历史桶入口转入多 Agent/社会机制入口 | 主要问题是大规模 Agent 交互和控制 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/ElevenLabs联创-语音AI现状与未来.md` | 语音 AI 现状与未来 | BV12irNBtE7D | 语音模型商品化、产品形态、生态与企业增长 | AI Native Organization Product & Career | [[MOC - AI 时代个人发展与组织]] | high | move + source_path + MOC | 从历史桶入口转入产品/生态机制入口 | 正文重点是产品与生态护城河，而非底层语音架构 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Every增长主管-Codex成为知识工作的OS.md` | Codex 成为知识工作的 OS | BV18QE56zEVr | Codex 管理界面、复合知识、审阅流与知识工作组织 | AI Native Organization Product & Career | [[MOC - AI 时代个人发展与组织]] | high | move + source_path + MOC | 从历史桶入口转入知识工作组织入口 | 主要问题是代理如何重构知识工作系统 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Geoff-Ralph Loops的基础设施.md` | Ralph Loops 的基础设施 | BV1H59yBFECR | 嵌套循环、Thread/Weaver、审计原语与系统级验证 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入 Loop/Harness 基础设施入口 | 正文核心是长程 Agent 的运行时和验证基础设施 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Google-端侧智能体微调微型LLM.md` | 端侧智能体与微型 LLM | BV13fGm6HETj | 端侧模型、窄域微调、函数调用与离线运行 | Frontier Models & Physical AI | [[MOC - 具身智能与脑机接口]] | high | move + source_path + MOC | 从历史桶入口转入端侧模型/物理部署入口 | 主要机制是小模型在设备侧的能力与约束 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Gray Swan创始人-Codex之后AI安全重写.md` | Codex 之后 AI 安全重写 | BV1uBTi6BEfd | 自动化红队、过滤模型、电脑使用攻击面与可解释性 | AI Evaluation & Safety | [[MOC - AI 评估与研究]] | high | move + source_path + MOC | 从历史桶入口转入安全/红队机制入口 | 正文核心是 AI 安全评估和自动化防御 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Hermes Agent-新OpenClaw体验.md` | Hermes Agent 新 OpenClaw 体验 | BV1nyo1BuEd9 | SQLite 记忆、成本路由、常在线运行与 Skills | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入 Agent 运行时入口 | 主要问题是记忆、成本和持续运行的 Harness 取舍 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/IBM团队-Harness工程详解.md` | Harness 工程详解 | BV1eWGH6JE6m | 验证步骤、登录处理、六大工程件与可靠性 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入 Harness 核心入口 | 正文直接定义 Harness 的可靠性工程方法 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Jeff-AGENTS.md历史与最佳实践.md` | AGENTS.md 历史与最佳实践 | BV1W39yBwEhp | 机器可读项目规则、提示槽位与 Skills 延迟加载 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入上下文/规则入口 | 主要机制是 Harness 如何注入项目约束 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Karpathy-从Vibe Code到Agentic Code.md` | 从 Vibe Code 到 Agentic Code | BV11nRmB1Ek | 软件 3.0、代理工程、可验证性与人类理解边界 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Coding 范式入口 | 正文讨论软件开发方式和编码代理的变化 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Karpathy-Code Agent与Auto Research.md` | Code Agent 与 Auto Research | BV1dwAczDEXY | Token 吞吐量、Claw、AutoResearch、RL 与代理教育 | Agent Architecture & Runtime | [[MOC - Agent 架构与工程]] | high | move + source_path + MOC | 从历史桶入口转入 Agent/研究循环入口 | 核心是 Agent 循环与自主研究机制 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Karpathy爆火项目-AutoResearch解读与启发.md` | AutoResearch 解读与启发 | BV1NpAHzZEcc | plan→改代码→训练→指标→保留 winner 的自主实验循环 | Agent Architecture & Runtime | [[MOC - Agent 架构与工程]] | high | move + source_path + MOC | 从历史桶入口转入自主实验循环入口 | 正文主线是可复用的 Agent 研究循环 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Loop-Agent Loop到底是什么.md` | Agent Loop 到底是什么 | BV1cVjN6oEwx | HITL、开放式 loop、token 预算与代码审查闭环 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入 Loop/反馈入口 | 主要回答 Agent 循环如何受控并获得反馈 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Manus创始人-深度干货-上下文工程的最佳实践.md` | 上下文工程最佳实践 | BV12x1xB8E7b | Compaction、summarization、隔离、Action Space 与模型切换评测 | Harness Context & Reliability | [[MOC - Harness Engineering]] | high | move + source_path + MOC | 从历史桶入口转入上下文可靠性入口 | 正文集中讨论上下文生命周期和动作边界 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Mercury产品VP-Claude Code第二大脑与MCP.md` | Claude Code 第二大脑与 MCP | BV1Tu9xBDEkt | MCP、OAuth、知识检索、多代理与个人上下文 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入 Claude/Coding 工具入口 | 主要是具体工具与知识工作流集成 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Mitchell Hashimoto-AI时代开源与Git未来.md` | AI 时代开源与 Git 未来 | BV1mncRznEd6 | 代理 PR、Git 工作流、非思考任务委托与开源协作 | AI Coding & Tools | [[MOC - AI Coding 与工具]] | high | move + source_path + MOC | 从历史桶入口转入开发工具/协作入口 | 正文聚焦开发者工具和软件协作方式 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Neo4J CEO-文档转化为知识.md` | 文档转化为知识 | BV1Dd9CBGEmK | Graph RAG、知识图谱、文本到 Cypher 与 Agent 上下文 | Agent Architecture & Runtime | [[MOC - Agent 架构与工程]] | high | move + source_path + MOC | 从历史桶入口转入 RAG/知识架构入口 | 主要问题是 Agent 如何组织和检索知识 | mapped |
| `02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Notion联合创始人-从工具到AI Agent.md` | 从工具到 AI Agent | BV1FEAVzbEWq | Harness 演进、Markdown/SQLite Agent API、定制 Agent 与委托 | Agent Architecture & Runtime | [[MOC - Agent 架构与工程]] | high | move + source_path + MOC | 从历史桶入口转入 Agent 平台架构入口 | 正文主线是产品如何从工具演进为 Agent 系统 | mapped |

## 处理边界

- 本批次不升级 legacy v1/v2，不新增标签，不复制笔记。
- 若目标文件已存在、来源 ID 冲突或发现主人未提交改动，该条目标记为 `needs_decision`，其余条目继续。

## 验证结果

- 批次完整性：30/30 目标文件存在；30/30 `source_path` 与物理路径一致；30/30 目标 MOC 链接恰好一条；30/30 来源 ID 在本批次内无重复；本批次没有 v2 笔记升级。
- `agent-contract-check.py vault`：`errors=[]`，`warnings=[]`。
- `vault-audit.py vault`：579 个文件；332 个未匹配 wikilink、63 个 orphan、25 个无 frontmatter、20 个不完整 frontmatter；坏标签和坏文件名均为 0，审计指标恢复并未恶化。
- `git diff --check`：通过；活动与历史 audit 中 6 个旧路径引用已修复，另将 1 个全路径 `.md` wikilink 标准化为 basename wikilink。
