---
title: "WorkBuddy团队-从模型到可用Agent的Harness工程"
tags: ["ai_agent", "harness_engineering", "context_engineering", "agent_architecture", "article"]
legacy_tags: ["ai_agent", "harness_engineering", "context_engineering", "agent_architecture", "article"]
created: "2026-07-15"
source: "https://mp.weixin.qq.com/s/GkhemHUAhKWV-3Uxaa1Mqg"
description: "腾讯 WorkBuddy 团队策略产品经理 Anne 从产品视角拆解 Agent 运行机制：Context Engineering、Harness Engineering、Loop Engineering 三层工程实践。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/WorkBuddy团队-从模型到可用Agent的Harness工程.md"
source_sha256: "bbe981cfb020be865f309b11c605c51e768c72199bd33444865353d0f65d1422"
migration_id: "migration-20260720-64e79771"
author: "[[Anne]]"
---

# WorkBuddy团队-从模型到可用Agent的Harness工程

> 来自腾讯 WorkBuddy 团队策略产品经理 Anne 的万字长文（Founder Park，2026-07-15）。从产品视角拆解 Agent 的运行机制，重点讨论 Context Engineering 和 Harness Engineering：如何选择和组织上下文，如何通过前馈、反馈、权限、验证、编排和可观测性，让 Agent 不只是能执行任务，而是能更稳定、更可控地完成任务。
>
> 全文一句话主线：**模型决定能力上限；上下文和 Harness 决定这个上限能否稳定落地。**

## 核心抽象：模型是一个无状态函数

```
输出 = 模型 (系统提示词 + 工具 + 会话历史 + 其他上下文 + 用户指令)
```

两条约束决定了上层所有工程的存在理由：

1. **模型是无状态的**：不会自动保留上一次调用的内容。对话历史、Memory、数据库由产品在模型外部保存，需要时再放进本次输入。
2. **模型的知识截止到训练日期**：训练之后发生的事，模型默认不掌握，需要先用工具查询再放进上下文。

## 三层工程体系

### 1. Context Engineering：模型这一刻该看到什么

定义：在一次模型决策前，设计哪些信息进入上下文、以什么形式进入、放在什么位置、何时更新或移出，以提高模型做出正确下一步决策的概率。

核心原则：
- **相关、准确、及时**，不是单纯堆 token
- **渐进式加载**：先看名称和描述，确认适用后再读完整内容
- **前缀稳定**：System Prompt、基础工具定义、长期规则放前面，保持内容与顺序稳定
- **动态追加**：当前文件、任务进度、时间、工具结果、新加载的 Skill 等追加到后面

WorkBuddy 的分层：
- 所有任务都适用的角色与安全要求 → System Prompt
- 项目规范 → Workspace 规则文件
- 某类任务的步骤 → Skill
- 当前请求和进度 → 动态上下文按需加入

### 2. Harness Engineering：控制系统

Harness 一词原指套在马身上的整套装备。从词源出发可以拆出三类能力：

1. **约束层（Control）**：防止执行超出安全范围
   - 权限边界（误删文件需要被拦截）
   - Sandbox（隔离环境，执行出错也不影响本机）
   - Approval Gate（危险操作需要人工确认）
   - 审计日志

2. **引导层（Feedforward）**：Agent 开始前掌握什么
   - 项目上下文（项目概况、目录层级、关键依赖）
   - 环境上下文（操作系统、Shell、时间、时区、IDE 主题）
   - 规则与风格
   - 工具使用规则（独立的搜索/读取可并行、改文件前先读、路径不明先搜）
   - Skills 和规则文件

3. **反馈层（Feedback）**：Agent 执行后如何获知错误
   - 验证执行结果并把错误及修正信息返回给 Agent
   - 工具结果包含可纠正信息（文件未找到提示搜索路径、编辑失败提示重新读取）
   - 将外部验证信号返回 Agent：lint、类型检查、测试、构建等确定性信号

### 3. Loop Engineering：长期任务循环

Loop 关注 Agent 如何被触发、连续执行、验证结果、记录进度并再次运行。

一个可用的 Loop 至少需要：
- 触发器（Trigger / Automation）
- 独立执行环境（Isolated Workspace / Worktree）
- Skills、Tools / Connectors / MCP
- Sub-agents
- Memory / Durable Artifacts
- Sensors / Evals
- Stop Conditions / Budget

## 用户感知的四层能力

| 层次 | 模型驱动 | 用户驱动 |
|------|---------|---------|
| Function Call | ✅ 模型决定是否调用 | ❌ |
| Tool | ✅ 模型驱动 | ❌ |
| MCP | ❌ | ❌（标准化连接） |
| Skill | ❌ | ✅ 用户点选触发 |
| Plugin | ❌ | ✅ 用户安装 |

### Function Call
模型与外部系统之间的结构化协议。模型在推理时自己决定是否调用。结果通常以 text 回流进上下文供模型继续推理。

### MCP（Model Context Protocol）
统一连接协议，Agent 不需要分别适配每个系统的调用方式。MCP Server 向 Agent 提供三种原语：
- **Resource**：只读内容（文件、数据库记录、实时数据）
- **Tool**：模型驱动的动作/函数
- **Prompt Template**：用户驱动的可复用消息模板

### Skill
一类任务的执行流程。Skill 把经过验证的工作方法保存下来，通常包含说明、步骤、脚本、命令和判断标准。

### Plugin
把连接、流程、规则和模板组合成可安装的能力包。支持按团队、项目或个人作用域安装。

## 记忆系统

WorkBuddy 的长期 Memory 分五类记忆：

1. **用户特征**：用户是谁、了解什么
2. **知识背景**：历史交互、偏好
3. **项目上下文**：当前工作环境
4. **工作方法**：经过验证的流程
5. **行为信号**：从历史交互中提取的可信信息

记忆的注入分阶段进行：
- 冷启动时只注入少量高置信、高相关的人与项目摘要
- 请求理解时根据 query 激活候选 memory cards
- 执行中需要证据时再回查原始会话或文件
- 任务收尾时从结果和用户纠正中提取候选记忆

## WorkBuddy 的五层 Harness（构建者视角）

1. **System Prompt**：定义当前产品和本次运行的高优先级工作契约
2. **引导层**：执行前提供必要信息和约束，提高首次正确率
3. **反馈层**：验证执行结果并把错误及修正信息返回给 Agent
4. **权限层**：防止执行超出安全范围
5. **可观测层**：Audit log 让所有动作留痕、可追溯回放

## 团队作为使用者的 Harness

选技术栈时，团队除了考虑性能、效率和生态，还会考虑它是否便于 AI 理解、修改和验证。即使两个方案都满足业务需求，团队也可能优先选已配好 Harness、结构统一的那个，因为 Agent 在其中工作更稳定。

## 代码库的 Harnessability

明确边界、统一命名、稳定模块和有效测试，能让 Agent 更容易理解代码。老系统未必具备这些条件：

- 老系统如果缺少埋点、指标口径不一致、链路追踪不完整，Agent 就只能依赖代码检查和自我评估，反馈层会明显变弱
- 老 monorepo 一次可能产生数千个违例，全量修复成本高，大量白名单又会形成新的维护成本

更可实现的做法：
1. 老系统先处理循环依赖和模块边界
2. 补齐关键链路的测试、日志、指标和看板
3. 优先在一个结构清晰、修改频繁、价值高且可观测性较好的子模块验证方案
4. 先约束新增和修改部分，再逐步处理存量

## 限制与边界

- **不会自动产生正确目标**：目标错误时，循环只会更快地朝错误方向执行
- **不会自动产生可信的验收标准**：Generator 和 Evaluator 若共享同一个误解，仍可能出现"错的实现 + 全部通过的测试"
- **不会承担责任**：发布、用户数据、支付、风控必须有明确的人类责任人和审批边界
- **不会替代工程师形成判断**：Harness 是工程基础设施，不是一次性配置

## 知识连接

- **支持** [[Anthropic Agent 工程实战指南 - 从入门到生产落地]] — 同为 Harness Engineering 实践；Anthropic 偏理论框架，WorkBuddy 偏产品落地
- **支持** [[2026 年 Agent 最重要的工程概念 Harness Engineering]] — 同为 Harness 工程讨论；那篇偏概念定义，本篇偏产品实现
- **补充** [[MOC - Harness Engineering]] — WorkBuddy 的五层 Harness 是 Harness 工程的具体产品实现
- 被 [[MOC - Agent 架构与工程]] § Harness 工程 索引

## 来源说明

- 来源：Founder Park（微信公众号），Anne（腾讯 WorkBuddy 团队策略产品经理）
- 事实状态：verified。verification_scope 为 column_only——已通过 kimi-webbridge（带登录态）读取文章全文（2026-07-15），非二手转述
- 本笔记为忠实整理，保留核心观点、框架和实践案例；图片未读取
