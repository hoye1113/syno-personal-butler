---
title: MOC - Harness Engineering
description: Harness Engineering 主题横切 MOC——跨课程、公众号、B站视频的 Harness 相关笔记，42 篇核心 + 跨 MOC 链接
created: 2026-06-11
updated: 2026-07-09
tags:
  - ai_agent
  - harness_engineering
  - moc
source: vault_initiative - moc - ai_agent - harness_engineering
---

# MOC - Harness Engineering

> **横切 MOC**：跨 `02-Resources/AI and Agents/` 子目录、`01-Areas/AI Agent Development/` 子目录的 Harness 主题笔记汇总。
>
> **核心定义**（来自 [[2026 年 Agent 最重要的工程概念 Harness Engineering]]）：harness = 围绕 Agent 的工程系统（工具、约束、反馈、安全、记忆），让 AI 从"能力强但不可预测"变成"稳定可靠能交付"。
>
> 42 篇核心笔记 + 跨 MOC 链接 = 完整的 Harness 主题地图。

---

## 核心笔记（按权威来源排序）

| # | 笔记 | 来源 | 视角 | 一句话 |
|---|------|------|------|--------|
| 1 | [[2026 年 Agent 最重要的工程概念 Harness Engineering]] | 公众号（特工宇宙翻译 OpenAI 官方）| **OpenAI 5 个月实验** | harness = docs/ 当 source of truth + linter 强制不变量 + 黄金原则 |
| 2 | [[祝贺Claude Code成功越狱，获得永生]] | 公众号（花叔）| **Anthropic 源码逆向** | harness 内部 6 大模块：system prompt / 四层权限 / 记忆 / 9 段式压缩 / swarm / grep |
| 3 | [[Anthropic Agent 工程实战指南 - 从入门到生产落地]] | 公众号（Anthropic 官方汇编）| **Anthropic 完整方法论** | 15 篇博客按"入门-进阶-核心-高级-生产"5 模块系统化 |
| 4 | [[IBM团队-Harness工程详解]] | B站视频 | **工程可靠性视角** | 现场 demo：guardrails→verify→login handler；不改 prompt 完成任务 |
| 5 | [[别再搭 Harness 了，先把你的痛点解决，用最笨的方式]] | 公众号（三元同学）| **反规范视角** | 马斯克五步法：先痛点后系统，不先搭系统 |
| 6 | [[Loop Engineering 橙皮书 - 花叔]] | GitHub 橙皮书系列（花叔）| **Loop = Harness 上一层** | 别再自己一句句指挥 agent；五动作循环 + 六零件 + 四笔代价 |
| 7 | [[Harness 实践 - 将任何文字编辑成精美的文章 - ConardLi]] | 公众号（ConardLi）| **Harness 迁移实战** | 用同一套骨架（8 Phase + 3 Checkpoint + Reacticle）将任意文字编辑成精美网页文章 |
| 8 | [[遇事留痕 - Loop Engineering 的基础 - 魔术师卡颂]] | 公众号（AI 机会 / 魔术师卡颂）| **Loop Engineering 基础** | 遇事留痕 = Session Log + GitHub issue/PR 都是项目自我优化的燃料 |
| 9 | [[驾驭 AI - 把不确定问题转化为可控实验 - 魔术师卡颂]] | 公众号（AI 机会 / 魔术师卡颂）| **可控实验** | 不确定问题 → 客观标准 + 反馈闭环；Vibe Coding 用 token 换线性精力 |
| 10 | [[想锻炼 AI 能力 - AI Native CLI - 魔术师卡颂]] | 公众号（AI 机会 / 魔术师卡颂）| **Agent 接口** | CLI AI Native 改造：结构化 stdout、hint 自恢复、dry-run 权限、内置 Skill |
| 11 | [[AI Coding 时间管理 - 50% 工作法 - 魔术师卡颂]] | 公众号（Harness Engineering 专栏）| **时间分配** | 50% 业务 / 50% Harness；减并行换自治时长，AI 知识 3～6 月半衰期 |
| 12 | [[如何为项目定制 Harness 环境 - 魔术师卡颂]] | 公众号（魔术师卡颂）| **定制心法** | 减框架增基建；superpowers/gstack → 文档/测试/lint 基建 → 轻编排 |
| 13 | [[AI框架与 Harness 的关系 - 魔术师卡颂]] | 公众号（魔术师卡颂）| **三层模型** | 环境约束 / 路由 / 流程编排；框架≠Harness |
| 14 | [[AI 主导的项目和人主导的区别 - 魔术师卡颂]] | 公众号（魔术师卡颂）| **项目架构** | monorepo；统一 dev 流程与 CLI；UI 识图+走查 |
| 15 | [[如何让 Skill 自动优化 - 魔术师卡颂]] | 公众号（魔术师卡颂）| **Skill 自优化** | 定时任务 + PR 反馈 → 只改规则集；warp common-skills |
| 16 | [[未来的 AI 编程就是 Loop 套 Loop - 魔术师卡颂]] | 公众号（魔术师卡颂）| **Loop 嵌套** | 三层 Loop；Session Log → gate issue → 规则反馈 |
| 17 | [[DeepMind-模型将吞噬Harness]] | B站视频（Logan Kilpatrick）| **模型吞噬 harness** | Antigravity 主线；模型=expanding system；约 12 个月内 harness alpha upstream |
| 18 | [[Loop-Agent Loop到底是什么]] | B站视频（Ross Mikita）| **Loop 反 hype** | HITL vs Agent Loop；开放式 loop=token 焚烧；code review closed loop 才合理 |
| 19 | [[Geoff-Ralph Loops的基础设施]] | B站视频（Geoffrey Huntley）| **Loop 基础设施** | Loom agent-first 栈；Thread/Weaver/SPIFFE；NixOS 十秒部署；Ralph SUT 或取代 CI |
| 20 | [[Cowork负责人-揭秘Cowork与Mythos]] | B站视频（Felix Rieseberg）| **Cowork harness** | VM 沙盒、技能/记忆即 Markdown、本地 computer use、小任务建信任 |
| 21 | [[Claude设计主管-Cowork揭秘40分钟教程]] | B站视频（Jenny Wen）| **Cowork 设计工作流** | 垃圾进宝藏出、周一计划任务、内部 dogfooding、3–6 月愿景原型 |
| 22 | [[Claude Code实战-Gstack把AI变成团队]] | B站视频（Garry Tan）| **GStack 角色编排** | 轻薄脚手架；Office Hours/对抗性审查/设计散弹枪/Playwright QA；7 级软件工厂 |
| 23 | [[Anthropic团队-如何构建运行数小时的Agent]] | B站视频（Ash × Andrew）| **长时 Agent** | RALPH 循环、验证器、文件系统当状态、可中断 |
| 24 | [[Qodo研究员-长上下文越多Agent越笨]] | B站视频（Nupur Sharma）| **上下文 U 型** | 分层摘要/子代理/80-20；「改成」优于「追加」 |
| 25 | [[Claude Code实战-鲜为人知的Claude Code工作流]] | B站视频（Greg × Amir）| **自动化全栈** | IdeaBrowser→细稿→A/B→自建 CMS |
| 26 | [[Claude Code实战-用AI实现生活自动化]] | B站视频（Peter × Moritz）| **个人 OS** | Claudia 文件夹骨架；MCP/CLI；心跳 vs 例程 |
| 27 | [[Cognition CPO-Devin的80%时刻与后台Agent]] | B站视频（Walden Yan）| **后台 Agent** | 80% 后台；规划-执行；记忆与文件系统 |
| 28 | [[Together AI-语音Agent延迟质量与规模]] | B站视频（Rishabh）| **实时语音 Agent** | 半秒生死线、级联流水线、同址、Thinker-Talker |
| 29 | [[Superpowers Evals 在测什么 - Fly]] | 公众号（Fly的AI研习社）| **工作流行为评测** | Quorum + Gauntlet 测 skill/TDD/review 合规；支撑 Superpowers 6 提速降本 |
| 30 | [[Spec Kit vs OpenSpec vs Superpowers - CCC]] | 公众号（深入浅出AI）| **框架对比与组合** | 三框架精华搭三层架构（Harness+Skill+Spec），棕地项目四个月实测 |

### 新增 S-tier 8 篇（2026-07-09 收录）

| # | 笔记 | 来源 | 视角 | 一句话 |
|---|------|------|------|--------|
| 31 | [[ClawdBot创始人-一个人顶一个团队]] | B站视频 | **Agent 创业** | 一人公司如何用 Agent 工具链构建产品 |
| 32 | [[OpenClaw教程-实战完整指南]] | B站视频 | **OpenClaw harness** | OpenClaw 全套配置与实战 |
| 33 | [[OpenClaw实战-Every团队使用Case]] | B站视频 | **团队 Agent 实践** | Every 团队 OpenClaw 使用 Case 演示 |
| 34 | [[OpenClaw养虾指南-打造数字员工]] | B站视频 | **Agent 养成** | 养虾 = 数字员工养成方法论 |
| 35 | [[OpenClaw实战-从零完成全套配置]] | B站视频 | **OpenClaw harness** | 从零到完整 OpenClaw 配置 |
| 36 | [[Hermes实战-新手配置真实案例]] | B站视频 | **Agent harness** | Hermes 新手配置与真实使用案例 |
| 37 | [[AI编程工具-2026年趋势与Vibe Code]] | B站视频 | **Coding harness** | 2026 年 AI 编程工具趋势与 Vibe Code |
| 38 | [[Brex CEO-打造全公司共用AI型CEO]] | B站视频 | **组织 Agent** | 全公司共用 AI CEO 的组织实践 |
| 39 | [[WorkBuddy团队-从模型到可用Agent的Harness工程]] | 公众号（Founder Park）| **产品实践** | 腾讯 WorkBuddy 五层 Harness：Context Engineering + 前馈/反馈/权限/验证/可观测 |

---

## Harness 的 6 大核心模块

> 把 8 篇笔记的"harness 是什么"汇总成 6 大模块，每个模块对应至少 2 篇笔记的具体实现：

| 模块 | 花叔（Claude Code）| OpenAI 实验 | Anthropic 官方 |
|------|-------------------|------------|----------------|
| **System Prompt 工程** | 静态/动态分界 + 缓存 | "地图而非说明书" 100 行 AGENTS.md | 第 15 章 system prompt 设计 |
| **权限 / 安全** | 四层流水线 + 熔断 | 用户类型 `ant` 内部版 | 第 13 章 沙箱隔离 |
| **记忆系统** | auto memory + autoDream（只记偏好不记代码）| 上下文评分 + 渐进披露 | 第 7 章 + 第 9 章 5 种失效模式 |
| **上下文压缩** | 9 段式结构化提取 | 任务树评分 + 关键信息 | 第 4 章 缓存 + 成本 |
| **多 Agent 协作** | utils/swarm + 邮箱文件 + 权限冒泡 | 团队级 swarm 编排 | 第 10 章 Anthropic 实战 |
| **可观测性 / 反馈** | 内部 git worktree + DevTools + PromQL/LogQL | doc-gardening + 黄金原则 + 熵治理 | 第 12 章 评测体系 |

> **对比建议**：先读 [[祝贺Claude Code成功越狱]]（最具体可看源码）→ 再读 [[2026 年 Agent 最重要的工程概念 Harness Engineering]]（最系统的搭建方法论）→ 最后用 [[Anthropic Agent 工程实战指南 - 从入门到生产落地]] 查具体模块的实现。

---

## 跨 MOC 链接

| 横切主题 | MOC |
|----------|-----|
| Claude Code 实践 | [[MOC - AI Coding 与工具]] |
| Coding Agent 体系 | [[MOC - Loock AI 全栈课程]] — 包含 LangGraph.js Coding Agent 实现 |

### 关联 Areas
- [[AI Agent Development]] — sanyuan 的系统课程（Context Engineering / Memory 等模块有 Harness 理论对应）

- **总笔记数**：42 核心 + 3 跨 MOC 链接
- **最后更新**：2026-07-09（新增 S-tier 8 篇视频转录：ClawdBot、OpenClaw 教程/Every/养虾/配置、Hermes、AI 编程工具、Brex CEO）
- **入选标准**：笔记主题必须直接讨论"围绕 Agent 的工程系统"（不是单纯的"Agent 本身"或"Agent 怎么用"）
