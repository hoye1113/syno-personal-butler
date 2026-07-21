---
title: "AI框架与 Harness 的关系"
tags: ["ai_agent", "ai_coding", "article", "wechat", "harness_engineering", "skills"]
legacy_tags: ["ai_agent", "ai_coding", "article", "wechat", "harness_engineering", "skills"]
created: "2026-07-02"
source: "https://mp.weixin.qq.com/s/Guo8r48RuydDolutIsc2vg"
description: "魔术师卡颂：Harness=Agent 完整运行环境（环境约束/路由/流程编排三层）；superpowers/gstack 属顶层编排，与底层基建通过 Skill、AGENTS.md 路由串联"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/AI框架与 Harness 的关系 - 魔术师卡颂.md"
source_sha256: "6560fa17264455714727214119c367439e07dd7aa5b89a92e94c17a5ee4fe332"
migration_id: "migration-20260720-64e79771"
author:
  - "[[魔术师卡颂]]"
date: 2026-05-14
---

# AI 框架与 Harness 的关系

> 作者：@魔术师卡颂 | 2026-05-14

---

## 核心命题

用 Claude Code、Codex 编程时，常会叠 **superpowers**、**gstack** 这类「AI 框架」。  
同时又在谈 **Harness**。

**关系一句话**：AI 框架主要落在 Harness 的**顶层**；Harness 是 Agent 的**完整运行环境**，比框架大一圈。

---

## Harness 是什么

> **Agent 运行的完整环境**

卡颂拆成 **3 层**（自下而上）：

| 层 | 名称 | 作用 |
|----|------|------|
| 底 | **环境约束** | 约束生成代码质量的基建 |
| 中 | **路由** | 决定 Agent 在什么情况下做什么 |
| 顶 | **Agent 流程编排** | 约束 Agent 的执行流程 |

**为什么没有「统一开源 Harness 框架」？**  
Harness 指的是**环境**——项目千差万别，没法用一套框架概括。这和 [[如何为项目定制 Harness 环境 - 魔术师卡颂]] 里「减框架、增基建」一致：抄模板不如加厚自己项目的底。

---

## 底层：环境约束

项目里**与 Agent 无关、但人人需要**的质量基建，例如：

- lint、prettier、TS check、build check  
- 测试金字塔（单测 / 集成 / e2e）  
- 跨边界契约（后端 DTO → OpenAPI → 前端 fetch）  
- 上线后监控、告警、业务信号、回滚判断  

Harness 的愿景是「人不写一行代码，编码交给 AI」。  
**人怎么约束代码？** → 约束**环境**，间接约束代码。

例：lint 规定「函数超 200 行且 10+ 分支 → 必须详尽注释」。AI 写了复杂代码 → lint 报错 → Agent 按提示补注释才能过检。

和 OpenAI harness 实验里的 **linter 强制不变量**（[[2026 年 Agent 最重要的工程概念 Harness Engineering]]）同一逻辑。

---

## 顶层：Agent 流程编排

**superpowers**、**gstack** 属于这一层——约束**执行流程**，视角不同：

| 框架 | 视角 | 典型约束 |
|------|------|----------|
| **superpowers** | 过程 | 头脑风暴 → spec → plan → TDD |
| **gstack** | 角色 | CEO / 设计 / 测试… 按任务启不同角色 |

Codex + superpowers 开发时，修 bug 也会走 superpowers 编排好的 **debug 流程**。

---

## 中间层：路由

**路由** = Agent **行为**的路由，常见两种形态：

1. **Skill** — `Description` 定义「什么情况下做什么」；superpowers / gstack 的流程靠 Skill 串联  
2. **AGENTS.md**（CC 侧 CLAUDE.md）— 显式路由规则，例如：  
   - 动 Admin 入口 → 先读 `packages/admin/README.md`  
   - 动 API 入口 → 先读 `packages/api/README.md`

**底与顶怎么接上？** 靠路由。

例：superpowers 要求 TDD；AGENTS.md 写「改代码要补测试时，先读 `update-test-cases.md`」→ Agent 做 TDD 时被路由到该 Skill/文档，按测试金字塔写用例 → **夯实底层环境约束**。

和 [[WorkOS-创建和使用Skills方法论]] 里 Skill 作可移植工作单元、[[OpenAI官方-Codex新手教程]] 里 AGENTS.md 入口一致。

---

## 三层原则

| 层 | 厚度 | 理由 |
|----|------|------|
| **顶** 流程编排 | **可厚可薄，按需** | gstack 删 CEO 视角 = 变薄；superpowers 删 TDD = 变薄 |
| **底** 环境约束 | **尽可能厚** | 1000 条 lint / 1000 条测试 vs 零条，对 Agent **执行耗时**差别不大，但对质量差别大 |
| **中** 路由 | **尽可能薄** | Skill、AGENTS.md 堆太多占上下文 → 渐进式披露 |

后记：Agent 再进化，这三层分工**不会变**。

---

## 入门建议（卡颂）

1. superpowers / gstack **二选一**即可  
2. 编码过程中**持续加厚环境约束**  
3. **警惕路由变厚**  
4. **逐渐删掉**流程编排里不需要的工序  

→ 与 [[AI Coding 时间管理 - 50% 工作法 - 魔术师卡颂]]「50% 投 Harness」、[[如何为项目定制 Harness 环境 - 魔术师卡颂]]「减框架增基建」形成同一条实践链。

- [[未来的 AI 编程就是 Loop 套 Loop - 魔术师卡颂]] — 同一系列；三层 Loop 嵌套与信息压缩

---

## 相关阅读

- [[如何为项目定制 Harness 环境 - 魔术师卡颂]] — 同一作者；在 superpowers 上「减顶、增底」的操作手册
- [[AI Coding 时间管理 - 50% 工作法 - 魔术师卡颂]] — 时间为何应投在加厚 Harness
- [[2026 年 Agent 最重要的工程概念 Harness Engineering]] — OpenAI 侧 harness = 约束 + 反馈 + docs
- [[祝贺Claude Code成功越狱，获得永生]] — Claude Code harness 六模块对照
- [[MOC - Harness Engineering]] — 横切入口
