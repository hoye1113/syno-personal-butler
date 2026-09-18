---
title: "AI Coding 时间管理 - 50% 工作法"
tags: ["ai_agent", "ai_coding", "ai_career", "article", "wechat", "harness_engineering"]
legacy_tags: ["ai_agent", "ai_coding", "ai_career", "article", "wechat", "harness_engineering"]
created: "2026-07-02"
source: "https://mp.weixin.qq.com/s/BqKWvdIfDUemU5vCwLPDlw"
description: "魔术师卡颂短文：AI Coding 时间分配 50% 业务 / 50% Harness 优化；少并行、拉长 Agent 自治时长，避免摸鱼导致能力退化"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/AI Coding 时间管理 - 50% 工作法 - 魔术师卡颂.md"
source_sha256: "455ac38aa938bac5244337cde3e61feef18d4cf4c90b394f4ab7dd4caf9c2fa2"
migration_id: "migration-20260720-64e79771"
author:
  - "[[魔术师卡颂]]"
date: 2026-04-10
---

# AI Coding 时如何做时间管理：50% 工作法

> 作者：@魔术师卡颂 | 收录于「Harness Engineering」| 2026-04-10

---

## 核心命题

**50% 精力写业务，50% 精力优化 Harness 环境。**

不是口号——是并行 Agent 任务数、自治时长、以及你是否会「指挥 Agent」之间的杠杆。

---

## 情况一：时间被业务占满

典型场景：并行 **4 个** Agent 任务，每个随时问你问题，你不断切上下文回答 → 身心疲惫。

**卡颂建议：先把并行数降到 2**，空出来的精力去解：

> 「如何让 Agent 长时间运行，不要老问我？」

Agent 反复来问，常见三类根因：

| 类型 | 含义 | Harness 侧对策 |
|------|------|----------------|
| 环境 | 配置不对，执行总报错 | 修 dev env、脚本、CI、沙箱 |
| 业务知识 | 缺领域上下文 | AGENTS.md、Skill、文档 feedforward |
| 方向 | 不知道下一步做什么 | 计划门控、任务拆解、明确验收标准 |

Harness 问题解得越多 → **单次自治时间越长** → 问你的次数越少 → 可安全拉高的并行数越多。

终态可能是：仍并行 4 个任务，但**每个能独立跑 2+ 小时**，你仍有约 50% 时间空出来——和 [[驾驭 AI - 把不确定问题转化为可控实验 - 魔术师卡颂]] 里「用 token 换线性注意力」同向。

---

## 情况二：时间都拿去摸鱼

Agent 在跑，你把另一半精力全摸掉 → 能力退化，直到**既不会手写代码，也不会指挥 Agent**。

另一半 Harness 时间不是闲着，而是持续投资：

- 环境、Skill、权限、错误 hint（见 [[想锻炼 AI 能力 - AI Native CLI - 魔术师卡颂]]）
- 留痕与复盘（见 [[遇事留痕 - Loop Engineering 的基础 - 魔术师卡颂]]）

---

## AI 知识的半衰期

未来几年：**新 AI 知识大约 3～6 个月过期**——过了就不用死磕旧版细节。

但用 **1 个月**掌握当期最佳实践，可在接下来 **2～5 个月**比没学的同行效率高 N 倍。

**业务程序员赚的，就是这个效率窗口的钱**——和 [[AI 时代如何面试工程师]] 里「从 Coder 到 Engineer」、投资元能力（好奇心）不矛盾。

---

## 实操口诀

1. Agent 老问你 → **减并行**，别硬扛切上下文  
2. 空出的时间 → **修 Harness**，别默认摸鱼  
3. Harness 变强 → **再加并行**，盯自治时长而非任务数  
4. 新工具新范式 → **按月学**，吃 2～5 个月效率红利

---

## 相关阅读

- [[想锻炼 AI 能力 - AI Native CLI - 魔术师卡颂]] — Harness 在 CLI 接口层的具体化
- [[驾驭 AI - 把不确定问题转化为可控实验 - 魔术师卡颂]] — 可控实验拉长 Agent 自治
- [[遇事留痕 - Loop Engineering 的基础 - 魔术师卡颂]] — Harness 优化素材来自执行留痕
- [[Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿]] — 多会话并行与 Tokenmaxxing 实践
- [[MOC - Harness Engineering]] — Harness 横切入口
