---
note_id: note-f17c365fa3c7fc2f583c5d49
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
| 2 | [[祝贺Claude Code成功越狱]] | 公众号（花叔）| **Anthropic 源码逆向** | harness 内部 6 大模块：system prompt / 四层权限 / 记忆 / 9 段式压缩 / swarm / grep |
| 3 | [[Anthropic Agent 工程实战指南 - 从入门到生产落地]] | 公众号（Anthropic 官方汇编）| **Anthropic 完整方法论** | 15 篇博客按"入门-进阶-核心-高级-生产"5 模块系统化 |
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
| 29 | [[Superpowers Evals 在测什么 - Fly]] | 公众号（Fly的AI研习社）| **工作流行为评测** | Quorum + Gauntlet 测 skill/TDD/review 合规；支撑 Superpowers 6 提速降本 |
| 30 | [[Spec Kit vs OpenSpec vs Superpowers - CCC]] | 公众号（深入浅出AI）| **框架对比与组合** | 三框架精华搭三层架构（Harness+Skill+Spec），棕地项目四个月实测 |

### 新增 S-tier 8 篇（2026-07-09 收录）

| # | 笔记 | 来源 | 视角 | 一句话 |
|---|------|------|------|--------|
| 39 | [[WorkBuddy团队-从模型到可用Agent的Harness工程]] | 公众号（Founder Park）| **产品实践** | 腾讯 WorkBuddy 五层 Harness：Context Engineering + 前馈/反馈/权限/验证/可观测 |

---

## 专题：AI Coding 成本与组织（2026-10-22 策展）

> 论证三部曲（同一作者，公众号，IP 属地四川）：从工程方法到成本约束再到组织破局，关键数字已经外部核验。本专题另有**观点层**一篇（主人个人判断），构成「观点 + 工程证据」结构。

| 序 | 笔记 | 角色 | 一句话 |
|---|------|------|--------|
| ① | [[agent-写得更快以后-时间花在了哪里-14e8cbd4]] | 工程方法层 | Agent 流水线等待时间的分阶段拆解与优化（基于 Anthropic Scion 复盘） |
| ② | [[不要迷信 AI 大厂的 Coding 实践]] | 成本约束层 | 偏差累积 → 测试/Review 工程化 → 每一量级提效对应指数量级成本（Lauren 2500 PR 数字与公开转述约 1000 不一致，引用注意） |
| ③ | [[老板应该招哪类程序员-5fa0932a]] | 组织破局层 | 软件开发不可能三角 + DORA 五指标预警；答案是招 AI 架构师守住架构健康（DORA 五维已核实；「38 刀时薪」实为每卡每小时收入） |
| ★ | [[ai-agent-的两极分化-自动化取代人-vs-产品帮助人-9ea50d75]] | **观点层（主人）** | Agent 路线两极分化：自动化取代人 vs 产品帮助人，两线交点已过；偏好「Personal AI」命名——三部曲是该观点的工程证据 |

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

### 关联 Areas
- [[AI Agent Development]] — sanyuan 的系统课程（Context Engineering / Memory 等模块有 Harness 理论对应）

---

## 迁移收录（2026-10-08 · 知识库合并）

> 以下为 2026-10-08 两库合并时按来源管道成组挂载的笔记，保证 MOC 可达，后续策展融入上方结构。

- [[Arize创始人Jason-如何开发自我改进的Agent|Arize创始人Jason-如何开发自我改进的Agent]]
- [[Databricks主管-企业级Agent生产实践框架-20260916|Databricks主管：企业级Agent 生产实践 - 哔哩哔哩]]
- [[Kelo Code负责人-Agent工程方法论|Kelo Code负责人：Agent工程方法论 - 哔哩哔哩]]
- [[OpenAI Build Hours-用API和Codex构建Agent-20260916|OpenAI 团队：用API和Codex,构建Agent教程 - 哔哩哔哩]]
- [[arize-ai团队-skill到底-应该写多长-哔哩哔哩-1fa0932a|Arize AI团队：Skill到底 应该写多长？ - 哔哩哔哩]]
- [[deepmind团队-如何大规模-运行agent-哔哩哔哩-4cc3d8de|DeepMind团队：如何大规模 运行Agent - 哔哩哔哩]]
- [[deepseek-harness橙皮书-花叔-v260814-a00322c4|DeepSeek-Harness橙皮书（花叔，v260814）]]
- [[exo开发者-让agent自进化的方法-哔哩哔哩-bf4bdc38|Exo开发者：让agent自进化的方法 - 哔哩哔哩]]
- [[galileo联创-ai时代的可观测性-哔哩哔哩-66b5ff96|Galileo联创：AI时代的可观测性 - 哔哩哔哩]]
- [[hermes-自我改进-ai智能体-27405226|Hermes 联合创始人谈如何构建自我改进的 AI 智能体 | Karan Ma]]
- [[linkedin-工程师-领英的ai-agent-开发和部署实践-哔哩哔哩-b84b419d|LinkedIn 工程师：领英的AI Agent 开发和部署实践 - 哔哩哔哩]]
- [[nvidiafu-zong-c-构建agent的-正确方式-哔哩哔哩-5adab385|NVIDIAfu'zong'c：构建Agent的 正确方式 - 哔哩哔哩]]
- [[openai团队-openai的-harness工程实践-哔哩哔哩-0145f85f|OpenAI团队：OpenAI的 Harness工程实践 - 哔哩哔哩]]
- [[为什么-harness-比模型更重要-3a8f81a0|为什么 Harness 比模型更重要]]
- [[微软专家-agent可观测性-生产实践-哔哩哔哩-2ac0f227|微软专家：Agent可观测性 生产实践 - 哔哩哔哩]]
- [[GEPA项目负责人-文本反思优化胜过强化学习|GEPA项目负责人-文本反思优化胜过强化学习]]
- [[Restate CEO-每一步每次调用都可靠的Agent系统|Restate CEO-每一步每次调用都可靠的Agent系统]]
- [[OpenAI研究员Noam Brown-多智能体协作能否递归自我改进|OpenAI研究员Noam Brown-多智能体协作能否递归自我改进]]

- **总笔记数**：45 核心 + 3 跨 MOC 链接
- **最后更新**：2026-10-23（专题新增观点层：主人「AI Agent 两极分化」个人判断）
- **入选标准**：笔记主题必须直接讨论"围绕 Agent 的工程系统"（不是单纯的"Agent 本身"或"Agent 怎么用"）
