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
updated: 2026-07-27
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
| 微软Agent-多模态对齐与组合（待收录） | 微软：多模态对齐和组合（对话 Amy Boyd & Nitya Narasimhan）|
| OpenClaw教程-实战完整指南（待收录） | OpenClaw 教程：实战完整指南 |
| [[OpenClaw实战-Every团队使用Case]] | OpenClaw 实战：Every 团队演示使用 Case |
| OpenClaw养虾指南-打造数字员工（待收录） | OpenClaw 实战：养虾指南！打造你的数字员工 |
| [[OpenClaw实战-从零完成全套配置]] | OpenClaw 实战：从零开始完成 OpenClaw 全套配置 |
| [[Polsia-一人AI Agent月入百万]] | Polsia CEO：1 个人用 AI Agent，1 个月百万美金 ARR |
| [[Hermes实战-新手配置真实案例]] | Hermes 实战：新手配置、真实使用案例 |
| AI编程工具-2026年趋势与Vibe Code（待收录） | AI 编程工具：2026 年趋势与 Vibe Code |
| [[Arise-AI新交互方式无限画布]] | Arise 首席：AI 新交互方式，无限画布！ |
| Brex CEO-打造全公司共用AI型CEO（待收录） | Brex CEO：打造全公司共用的 AI 型 CEO |
| Logical CEO-用好LLM的关键方法论（待收录） | Logical CEO：用好 LLM 的关键方法论 |
| [[Arise-AI新交互方式无限画布]] | Arise：AI 新交互方式，无限画布 |
| [[Hermes实战-新手配置真实案例]] | Hermes 实战：新手配置、真实使用案例 |
| [[Logical CEO-解决LLM不能解决的问题]] | Logical CEO：解决 LLM 不能解决的问题 |
| [[Notius创始人-AI研究工具与检索]] | Notius 创始人：AI 研究工具与检索 |
| [[Peter Yang-Agent未来与职场内耗]] | Peter Yang：Agent 未来与职场内耗 |
| [[Polsia-一人AI Agent月入百万]] | Polsia：一人 AI Agent 月入百万 |
| [[微软Agent观测实践]] | 微软：Agent 观测实践 |
| [[AI设计实战-6个AI共同设计App]] | AI 设计实战：6 个 AI 共同设计 App |

## 跨 MOC

| 横切主题 | MOC |
|---|---|
| 全库导航 | [[MOC - 知识库导航]] |
| Agent 理论总览 | [[MOC - Agent Theory and Design]] |
| Harness 工程 | [[MOC - Harness Engineering]] |
| Prompt/上下文工程 | [[MOC - Prompt 工程]] |
| 职业与组织 | [[MOC - AI 时代个人发展与组织]] |
| Loock 全栈课程 | [[MOC - Loock AI 全栈课程]] |

