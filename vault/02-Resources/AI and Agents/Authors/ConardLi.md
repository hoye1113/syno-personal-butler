---
title: "ConardLi"
tags:
  - ai_agent
  - author
  - harness_engineering
  - skills
created: 2026-07-01
source: "https://mp.weixin.qq.com/s/t0-HbOj-Z2_RcZZJRPpM9A"
description: "Harness 工程实践者，ConardLi 开发 Beautiful Article Skill 验证'好的 Harness 是可以迁移的'，提出 7 条 Harness 设计原则"
author:
  - "[[ConardLi]]"
---

# ConardLi

> **身份**：Harness 工程实践者
> **公众号**：ConardLi
> **核心方法论**：好的 Harness 是可以迁移的 + 7 条 Harness 设计原则
> **vault 收录**：1 篇公众号文章
> **开源项目**：[reacticle](https://github.com/ConardLi/reacticle)（Reacticle 组件协议）、[garden-skills](https://github.com/ConardLi/garden-skills)

---

## 简介

ConardLi 是 vault 内**最聚焦 Harness 工程实践**的作者。与花叔（源码逆向）和三元同学（产品哲学）不同，ConardLi 的视角是"怎么把 Harness 从一个项目迁移到另一个项目"——他的核心判断：

> "好的 Harness 是可以迁移的。同一个骨架（分阶段编排 + 文件状态 + 必须人工 Checkpoint + 审阅者 QA + 最小切片修复），换一个任务照样能用。"

vault 内对他的引用 3 处，分布在 3 篇笔记。

---

## vault 已收录的 1 篇笔记

| # | 笔记 | 主题 | 收录日期 |
|---|------|------|---------|
| 1 | [[Harness 实践 - 将任何文字编辑成精美的文章 - ConardLi]] | Reacticle 协议 + 8 Phase 流程 + 7 条设计原则 | 2026-06-17 |

---

## ConardLi 的核心方法论

### 1. 好的 Harness 是可以迁移的

同一个 Harness 骨架可以服务完全不同的任务（视频 → 文章）。关键骨架：分阶段编排 + 文件状态 + 必须人工 Checkpoint + 审阅者 QA + 最小切片修复。

### 2. 7 条 Harness 设计原则

1. **渐进式上下文加载**——不一次灌入全部信息，按阶段加载
2. **Checkpoint 不替用户做决定**——只呈现选项，决策权留给人
3. **基于文件的工作记忆**——中间状态写文件，不靠上下文窗口
4. **一段一文件**——每个章节独立文件，降低耦合
5. **关键节点审阅**——在关键节点插入人工审阅
6. **最小切片修复**——发现问题只改最小范围，不重写整段
7. **从审计日志自进化**——历史运行记录反哺下一次执行

### 3. Reacticle 组件协议

"React + Article"——AI 只负责组合组件，结构和排版由组件库保证。把 AI 能力和输出质量解耦。

出自 [[Harness 实践 - 将任何文字编辑成精美的文章 - ConardLi]]。

---

## 在 vault 内的横切位置

| 横切视角 | 涉及笔记 | 核心判断 |
|---------|---------|---------|
| **Harness 迁移** | Harness 实践 | 好的 Harness = 可复用骨架 |
| **组件协议** | Harness 实践 | Reacticle 解耦 AI 能力和输出质量 |
| **设计原则** | Harness 实践 | 7 条原则（渐进/Checkpoint/文件状态/最小切片）|

---

## 关联入口

### 主题入口
- [[MOC - Harness Engineering]]（含 ConardLi 1 篇）
- [[MOC - Agent Theory and Design]]
