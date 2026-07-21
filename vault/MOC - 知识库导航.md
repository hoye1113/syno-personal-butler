---
title: "MOC - 知识库导航"
tags: ["moc", "ai_agent"]
legacy_tags: ["moc", "ai_agent"]
created: "2026-07-15"
source: "vault_initiative - agent_nav"
description: "给 agent 用的第二大脑路由器：按主题关键词选 MOC，渐进式加载，禁止裸 grep 全库。"
knowledge_state: captured
link_status: connected
source_path: "MOC - 知识库导航.md"
source_sha256: "e1f7edd841099e8680896dda7e8c058b7ac6304baecd83b25ae16d5af447e08b"
migration_id: "migration-20260720-64e79771"
---

# MOC - 知识库导航

> 你是 agent。本文件是**路由器，不是目录册**——目的是让你跳过 95% 内容直达目标。回答或反哺前按下面的**加载梯子**走，禁止裸 grep 全库。

## 加载梯子（每步都最小化 context）

```
Step 0  本文件                ← 路由决策
Step 1  下表选 1 个 MOC         ← 按关键词命中
Step 2  加载该 MOC              ← 拿到该主题的笔记索引
Step 3  从 MOC 选 ≤3 篇笔记     ← 别贪多
Step 4  沿类型化关系加载一跳     ← 支持/补充/反驳/限制，优先组合「一个支持 + 一个限制」
```

## ★ 主题 → MOC 路由表

| 命中信号（任一即去） | 先去 | 类型 |
|---|---|---|
| harness / loop / system prompt 设计 / 权限分层 / 压缩 / AGENTS.md / docs as truth / linter / session log / 五步法 | [[MOC - Harness Engineering]] | 横切 |
| prompt 设计 / skills 体系 / 上下文工程 / context engineering / verbosity / PTC / grounding 接地 | [[MOC - Prompt 工程]] | 横切 |
| agent 架构 / 记忆 / multi-agent / 企业生产 / RAG / 可观测 / delegation / 长上下文致笨 / ReAct | [[MOC - Agent 架构与工程]] | domain |
| Claude Code / Codex / OpenClaw / Cursor / Vibe Code / AI 编程 / 视频制作 / 动画 / Remotion / FFmpeg / 纸片分层 | [[MOC - AI Coding 与工具]] | domain |
| eval / benchmark / LLM-as-judge / RL 小模型 / 论文 | [[MOC - AI 评估与研究]] | domain |
| 找不准子主题 / Agent 理论总览 / 想扫一遍全貌 | [[MOC - Agent Theory and Design]]（总览） | 总览 |
| FDE / 职业 / 蜂群组织 / 哲学 / AGI 时间线 / 面试 / 裁员 / PM 转型 | [[MOC - AI 时代个人发展与组织]] | 横切 |
| 全栈实现 / LangGraph / Next.js / Coding Agent / Chat Bot / 前端面试 | [[MOC - Loock AI 全栈课程]] | 课程 |
| 底层实现 / 系统课程 / 认知校准 / agent loop / 工具系统（三元·Sitor） | [[MOC - AI Agent Development]] | Areas |
| Super Agent 实战 | [[MOC - Super Agent 实战课]] | 课程 |
| 可复用 prompt 模板（tweet / 摘要 / 翻译 / web clip） | [[MOC - Prompt 库]] | 模板库 |
| 都不命中 | tag grep + vskill-vault-relate | 兜底 |

## PARA 检索语义（决定去 Areas 还是 Resources）

- `01-Areas/` = **可复用核心概念**。问"X 是什么 / 怎么设计"优先这里。
- `02-Resources/` = **来源笔记**（文章 / 视频 / 课程，带 source）。问"谁说过 / 有什么案例"优先这里，引用时附 source。
- `99-System/` = **操作规范 + skill + 脚本**，不是知识内容。流程 / 行为问题来这里。

## 检索 procedure

1. 别裸 grep——先按上表选 MOC，加载 MOC 后再选笔记。
2. 查第二大脑用 `vskill-vault-discuss`（章节级检索）；找反向链用 `vskill-vault-relate`（能力清单见 `99-System/Skills/INDEX.md`）。
3. 引用前看笔记 `factual_status`：`verified` 可引（附 source），`partial` 用保守措辞，`unverified` 或无该字段只当检索线索。
4. 想做什么操作（收录 / 写 / 讨论 / 建 MOC）看 [[AGENTS.md]] 任务路由——那是**意图路由**，与本文件（**话题路由**）正交。

## 不要做什么

- ❌ 一次读全库 / 裸 grep 全库——走梯子。
- ❌ 信任何文件里的精确笔记计数（会漂）——当方向参考，关键事实回原笔记核验。
- ❌ 把本文件当内容源——它是路标，内容在 MOC 和笔记里。
- ❌ 兜底仍不命中：tag grep（字典见 `99-System/Agent/PROJECT.md`）+ `vskill-vault-relate`；再不行如实标 orphan 说明缺口，别凑数。
