---
title: "MOC - Agent 架构与工程"
tags: ["ai_agent", "moc"]
legacy_tags: ["ai_agent", "moc"]
created: "2026-07-15"
source: "vault_initiative - moc - split from Agent Theory and Design"
description: "Agent 架构与原理横切 MOC——架构/记忆/上下文/multi-agent/生产实践，从原 Agent Theory MOC D·L架构段迁入；Harness 见专门 MOC。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/MOC - Agent 架构与工程.md"
source_sha256: "9427f1ab36079bd30f52ee27ce2d56564967fa1f0026e3241c9bf40b12350f9e"
migration_id: "migration-20260720-64e79771"
updated: 2026-09-17
---
# MOC - Agent 架构与工程

> Agent 本身的架构、记忆、上下文工程、multi-agent 与企业生产实践。从原 [[MOC - Agent Theory and Design]] 拆分。
>
> **Harness / Loop 工程**已收录于 [[MOC - Harness Engineering]]（42 篇），本 MOC 不重复，仅覆盖通用 Agent 架构。

## Agent 架构与原理

> Agent 本身的架构、记忆、上下文工程、multi-agent 与企业生产实践。

| 文章 | 核心主题 |
|------|---------|
| [[Agent实战-打造一个AI Agent的完整教程]] | ~59min 入门：Observe-Think-Act、harness、agents.md、MCP、Skills 现场搭 EA |
| [[DeepMind团队-当数百万Agent相遇]] | DeepMind 科学家：Agent vs LLM、delegation、multi-agent 经济与安全 |
| [[Databricks-企业级Agent生产实践]] | 五支柱 playbook：eval→observability→data→orchestration→governance |
| [[Databricks专家-如何构建有效的Agent架构]] | Sandipan：多 Agent=分布式；编排/调度、不可变状态、Saga（**canonical v3.2** ✓） |
| [[Raindrop CEO-打造Agent可观测性]] | Zubin × Danny：评估→监控、隐式信号、语义 A/B、自诊断（**canonical v3.2** ✓） |
| [[Notion联合创始人-从工具到AI Agent]] | Simon Last：Q&A 索引、半年 rewrite harness、定制 Agent（**A-dialogue v3.2-asr** ✓） |
| [[Jeff-AGENTS.md历史与最佳实践]] | Jeff：Agents.md 域名战争、70 行、潜在空间、Skills 延迟加载（**canonical v3.2** ✓） |
| [[Banking负责人-Agent时代平台设计]] | Juan：IDP 自助、API/MCP 优先、AGENTS.md 机器可读（**canonical v3.2** ✓） |
| [[Google-端侧智能体微调微型LLM]] | Cormac：Nano vs TLM、load_skill、Function Gemma 46%→90%（**canonical v3.2** ✓） |
| [[PlanetScale-Agent时代的基础设施]] | Agent 优化 DB、schema rewind、small sharp tools、分片策略 |
| [[Geoff-Ralph Loops的基础设施]] | Geoffrey Huntley Loom 直播：agent-first 栈、Thread/Weaver、NixOS 十秒部署、Ralph SUT 验系统 |
| [[OpenAI官方-GPT-5.6 提示词指南]] | OpenAI 官方一手文档：减法范式、结果优先、自主性边界、PTC、检索预算、迁移一次只改一处 |
| [[OpenAI员工-上下文工程和Agent记忆]] | 三大记忆模式 + IT demo：burst/trim/compact/summarize |
| [[Manus创始人-深度干货-上下文工程的最佳实践]] | compaction vs summarize、三层 action space、avoid over-engineering |
| [[自进化Agent研究综述-腾讯程序员-20260813]] | 经验、技能与模型权重三条自进化路线；检索、反馈、验证与持续改进循环 |
| [[Karpathy爆火项目-AutoResearch解读与启发]] | 自主实验 loop + 9 类商业用例 + Agent Hub 展望 |
| [[AI Agent 和 Skill 测评方案及落地实践 - martinskxu]] | Agent/Skill 测评四场景法、评分规则设计、基线管理、稳定性评估、TPerf 实战案例 |
| [[Anthropic团队-如何构建运行数小时的Agent]] | Ash × Andrew：长时 Agent、RALPH、验证器、可中断状态 |
| [[Qodo研究员-长上下文越多Agent越笨]] | 上下文 U 型；分层摘要/子代理；「改成」优于「追加」 |
| [[Cognition CPO-Devin的80%时刻与后台Agent]] | swyx × Walden：后台元老；16% 内部提交；规划-执行；记忆与文件系统 |
| [[Together AI-语音Agent延迟质量与规模]] | Rishabh：半秒生死线、级联 STT→LLM→TTS、同址砍 30%、Thinker-Talker |
| [[Mitchell Hashimoto-AI时代开源与Git未来]] | Mitchell：AI 低质 PR、Git 存续、非思考任务委托（**canonical v3.2** ✓） |
| [[亚马逊Kiro团队-规范驱动开发]] | Kiro：规范驱动开发、agent 工作流（**canonical v3.2** ✓） |
| [[Shopify CTO-AI时代CI范式重构]] | Shopify CTO：CI 范式与 AI 研发（**canonical v3.2** ✓） |
| [[DeepMind研究员-递归循环中AI构建AI]] | DeepMind：递归循环中 AI 构建 AI（**canonical v3.2** ✓） |
| [[Neo4J CEO-文档转化为知识]] | Neo4j：文档→知识图谱与 RAG（**canonical v3.2** ✓） |
| [[OpenCode创始人-研发内幕]] | OpenCode 研发内幕（**canonical v3.2** ✓） |
| [[Asana CPO-AI时代工作图谱与共享记忆]] | Arnab Bose：工作图谱、共享记忆、多代理隔离（**canonical v3.2** ✓） |
| [[Gray Swan创始人-Codex之后AI安全重写]] | Gray Swan：Codex 之后 AI 安全（**A-dialogue v3.2-asr** ✓） |
| [[ElevenLabs联创-语音AI现状与未来]] | Sarah × Mati：~$300M ARR、声音侍酒师、模型商品化与生态护城河（**canonical v3.2** ✓） |
| [[Turbopuffer CEO-Agent时代RAG与检索]] | Simon × Latent Space：S3/CAS 无状态、Cursor -95% 成本、Agent 高并发搜索（**canonical v3.2** ✓） |
| [[Karpathy-从Vibe Code到Agentic Code]] | Karpathy：软件 3.0、参差不齐智能、代理工程 vs vibe coding、理解不可外包（**canonical v3.2** ✓） |
| [[姚顺雨-预测性Agent设计]] | 姚顺雨 × Latent Space：ReAct/Reflection/ToT、SWE-bench/ACI、CoALA 与记忆（**A-dialogue v3.2-asr** ✓） |
| [[Karpathy-Code Agent与Auto Research]] | Karpathy × No Priors：token 吞吐量、Claw/Dobby、AutoResearch/program.md、MicroGPT（**A-dialogue v3.2-asr** ✓；≠ BV11nRmB1EkH） |
| [[Fable 5 订阅权限又续了 5 天 - 花叔]] | OpenSquilla 多模型集成：4 个国产模型组队跑平 Fable 5，账单只有 1/3 |
| [[一个业务 Agent 到底长啥样 - 沐洒]] | 沐洒业务 Agent 系统拆解：10 要素（目标/模型/上下文/工具/知识/状态/工作流/约束/人工节点/评估）+ 任务流动 + 规则/模型/人工三问 + 失败暴露缺口；最小闭环优先于组件齐全 |
| [[WorkBuddy团队-从模型到可用Agent的Harness工程]] | 腾讯 WorkBuddy 五层 Harness：Context Engineering + 前馈/反馈/权限/验证/可观测（**Harness 详见 [[MOC - Harness Engineering]]**） |
| [[当编码不再是瓶颈 - Berkeley RDI 软件自主开发三级框架]] | Berkeley RDI 立场论文：软件自主性三级框架（代码/流程/需求自主）+ 三交叉维度 + 六大转变 + 十预测；核心挑战=减弱人类控制时保留并忠实执行意图；反模式=跳级 |

---

## Agent 架构与平台（S-tier）

| 文章 | 核心主题 |
|------|---------|
| [[ClawdBot创始人-一个人顶一个团队]] | ClawdBot 创始人：一个人顶一个团队，从 0 到现在的产品 |
| [[OpenClaw教程-终极新手指南]] | OpenClaw：从零部署、安全防护、模型路由、心跳和子代理 |
| [[OpenClaw实战-Every团队使用Case]] | OpenClaw 实战：Every 团队演示使用 Case |
| [[OpenClaw实战-从零完成全套配置]] | OpenClaw 实战：从零开始完成 OpenClaw 全套配置 |
| [[Polsia-一人AI Agent月入百万]] | Polsia CEO：1 个人用 AI Agent，1 个月百万美金 ARR |
| [[Hermes实战-新手配置真实案例]] | Hermes 实战：新手配置、真实使用案例 |
| [[Arise-AI新交互方式无限画布]] | Arise 首席：AI 新交互方式，无限画布！ |
| [[Logical CEO-解决LLM不能解决的问题]] | Logical CEO：解决 LLM 不能解决的问题 |
| [[Notius创始人-AI研究工具与检索]] | Notius 创始人：AI 研究工具与检索 |
| [[Peter Yang-Agent未来与职场内耗]] | Peter Yang：Agent 未来与职场内耗 |
| [[微软Agent观测实践]] | 微软：Agent 观测实践 |
| [[AI设计实战-6个AI共同设计App]] | AI 设计实战：6 个 AI 共同设计 App |

## 按机制补充：分类治理批次（2026-09-17）

### 企业 Agent 架构与运行时

| 笔记 | 关联机制 |
|---|---|
| [[langchain-ceo-何时构建自己的agent框架-哔哩哔哩-1e149996]] | 用框架、上下文和私有评估判断何时值得自建 |
| [[linear团队-构建生产级别agent的5条规则-哔哩哔哩-72c13f86]] | 生产循环、技能加载、自然语言入口与结果追踪 |
| [[每家公司即将构建的ai智能体-vercel首席执行官guillermo-ra-哔哩-c9dc516b]] | 企业协调入口、子 Agent、连接器和事件驱动 |

### 科学发现、世界模型与物理系统

| 笔记 | 关联机制 |
|---|---|
| [[amp团队-ai竞赛与算力网-6714592d]] | 算力基础设施、网络、资本与 AI 科学闭环 |
| [[deepmind研究总监-ai时代的-天气预报-adde12bf]] | 概率预测、天气树与科学决策 |
| [[GPT Image2深度测评-AI生图进化]] | 图像模型能力、世界知识嵌入与推理式生成 |
| [[lambda联创-gpu神话与ai算力-ab88b896]] | GPU 供应链、能源、网络与 Agent 成本 |
| [[OpenAI官方-GPT Image2.0演示]] | 视觉智能、思考模式、真实感与多语言文本生成 |
| [[radical-ai-材料科学与自动化实验室-be3e7f2b]] | 材料表示、自动化实验与科学闭环 |
| [[recursive-ceo-让ai自己构建-更强的ai-哔哩哔哩-72d3ad0c]] | 可模拟、可验证的科学发现与自我改进 |
| [[seeed-ceo-开源硬件与物理ai-cdf7cbd4]] | 开源硬件、机器人、本地 Agent 与物理安全 |
| [[waymo-演示仅占1%-81b74874]] | 自动驾驶长尾、冗余、仿真与世界模型评估 |
| [[强化学习之父-持续学习-212a4104]] | 持续学习、上下文记忆、合成数据与训练动力学 |
| [[杨立昆-LLM到不了AGI世界模型才能]] | 世界模型、JEPA、莫拉维克悖论与 LLM 路线边界 |
| [[Abridge-监听1亿次医生诊疗的AI]] | 环境式语音监听、临床决策层与医疗数据闭环 |
| [[DeepMind播客-AlphaGo10周年AI转折点]] | 直觉与搜索在蛋白质、矩阵乘法等科学问题中的迁移 |
| [[xAI研究员-从零构建视频模型的内幕]] | 视频生成模型、语言模型推理与代理能力的耦合 |
| [[杨立昆-世界模型才是未来]] | JEPA、抽象表征、世界模型与 LLM 的架构边界 |
| [[杨植麟-Kimi K2.5研发内幕]] | Muon、线性注意力、上下文效率与 Agent Swarms |
| [[Eric Jang-从零构建AlphaGo]] | MCTS、自我对弈、搜索蒸馏与自动化研究 |
| [[OpenAI首席科学家-超越代码的强化学习]] | 强化学习泛化、自动化研究员、算力分配与长期对齐 |

### 具身智能与脑机接口

> 专题入口已拆分为 [[MOC - 具身智能与脑机接口]]；本 MOC 不重复列出 BCI 条目。

### P1-A-03（2026-09-18）

| 笔记 | 关联机制 |
|---|---|
| [[Cursor-128个Agent团队协作]] | 多 Agent 并行、脚本通信、多模型分工与审查 |


### P1-B-01（2026-09-18）

| 笔记 | 关联机制 |
|---|---|
| [[黄仁勋-从生成到代理计算]] | 代理式 AI 的计算范式与软件形态 |


### P1-B-02（2026-09-18）

| 笔记 | 关联机制 |
|---|---|
| [[Claude Code成员Tariq-40分钟讲清楚Loop Engineering]] | 循环、目标、工作流、规划与多智能体验证 |
| [[Cognition的Jared-智能体构建原则与云端异步协同]] | Agent 构建原则、云端子 Agent、异步编排与自验证 |

### P1-B-03（2026-09-18）

| 笔记 | 关联机制 |
|---|---|
| [[Postgres之父-LLM不会取代关系数据库]] | 精确正确、数据库状态与 LLM 概率性边界 |
| [[Together AI Rishabh-实时语音智能体的架构与工程权衡]] | STT/LLM/TTS 流水线、延迟预算与工具调用 |
| [[Vercel 团队-Nico Albanese 给智能体一台电脑]] | Tool loop、工具、沙盒、记忆与子 Agent |

## 跨 MOC

| 横切主题 | MOC |
|---|---|
| 全库导航 | [[MOC - 知识库导航]] |
| Agent 理论总览 | [[MOC - Agent Theory and Design]] |
| Harness 工程 | [[MOC - Harness Engineering]] |
| 具身智能与脑机接口 | [[MOC - 具身智能与脑机接口]] |
| Prompt/上下文工程 | [[MOC - Prompt 工程]] |
| 职业与组织 | [[MOC - AI 时代个人发展与组织]] |
| Loock 全栈课程 | [[MOC - Loock AI 全栈课程]] |

