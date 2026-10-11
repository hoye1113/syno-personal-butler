---
title: "MOC - 知识库导航"
tags:
  - moc
  - ai_agent
created: 2026-07-15
source: vault_initiative - agent_nav
description: "给 agent 用的第二大脑路由器：按主题关键词选 MOC，渐进式加载，禁止裸 grep 全库。"
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
| agent 架构 / 记忆 / multi-agent / 企业生产 / RAG / 可观测 / delegation / 长上下文致笨 / ReAct | [[MOC - Agent 架构与工程]] | domain |
| Claude Code / Codex / OpenClaw / Cursor / Vibe Code / AI 编程 / 视频制作 / 动画 / Remotion / FFmpeg / 纸片分层 | [[MOC - AI Coding 与工具]] | domain |
| eval / benchmark / LLM-as-judge / RL 小模型 / 论文 | [[MOC - AI 评估与研究]] | domain |
| 找不准子主题 / Agent 理论总览 / 想扫一遍全貌 | [[MOC - Agent Theory and Design]]（总览） | 总览 |
| FDE / 职业 / 蜂群组织 / 哲学 / AGI 时间线 / 面试 / 裁员 / PM 转型 | [[MOC - AI 时代个人发展与组织]] | 横切 |
| 具身智能 / 脑机接口 / BCI / 物理 AI / 前沿模型 / 机器人 / GPU 算力 | [[MOC - 具身智能与脑机接口]] | domain |
| 底层实现 / 系统课程 / 认知校准 / agent loop / 工具系统（三元·Sitor） | [[MOC - AI Agent Development]] | Areas |
| Super Agent 实战 | [[MOC - Super Agent 实战课]] | 课程 |
| Agent 技能武器库 / 实战姿态 / 架构图 / 视觉设计 / 旅行手帐 / 概念寓言 / 对账 | [[MOC - Agent Skills 武器库]] | 工具 |
| 都不命中 | tag grep + vskill-vault-relate | 兜底 |

## ★ 35 篇核心长文与端云对齐总揽

全库 35 篇核心高信噪比万字长文已全量升级为 **V4 美感排版标准**（含 3 行呼吸留白、大章提权与原生分割线、流程图等宽代码块封装与原图离线防盗链落盘），并三端一体对齐至本地 Vault、飞书 Wiki（13 大全景分类，共 228 篇）及多维表格大盘（Table 2: 208+ 篇）。

| 深度研读方向 | 核心代表长文 | 对应导航 MOC | 飞书 Wiki 分类 |
|---|---|---|---|
| **Harness Engineering 与运行缰绳** | 《Harness 实践：将任何文字编辑成精美的文章》(ConardLi)、《先解决痛点再搞系统》 | [[MOC - Harness Engineering]] | 05 - Harness 工程 |
| **Agent Loop 与系统架构** | 《自进化 Agent 研究综述》(腾讯)、《如何让 Skill 自动优化》(魔术师卡颂)、《从零构建生产级 Agent》 | [[MOC - Agent 架构与工程]] | 04 - Agent 设计模式 |
| **AI 原生组织与个人杠杆** | 《A16Z 这两份 AI 报告以及反常识真相》(卡兹克)、《80%的App未来会消失吗》、《AI 主导的项目和人主导的区别》 | [[MOC - AI 时代个人发展与组织]] | 06 - AI 原生组织 |
| **评测基准与对齐安全** | 《Superpowers Evals 在测什么》(Fly)、《AI Agent 和 Skill 测评方案及落地实践》(martinskxu) | [[MOC - AI 评估与研究]] | 08 - AI 评估基准 |
| **AI Coding 与人机协同范式** | 《AI Native CLI》(魔术师卡颂)、《smart-draw 手绘风可编辑 AI 图表》(极客公园)、《OpenSquilla MetaSkill 第三块拼图》 | [[MOC - AI Coding 与工具]] | 09 - AI 编程范式 |
| **哲学与元认知** | 《AI 让数学再也回不去那个旧世界了》(卡兹克)、《孟岩对话李继刚：人何以自处》 | [[MOC - AI 时代个人发展与组织]] | 10 - 哲学与元认知 |
| **Super Agent 实战体系** | 23 篇 Super Agent 完整渐进式工程实战体系 | [[MOC - Super Agent 实战课]] | 02 - Super Agent 实战体系 |

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
