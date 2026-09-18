---
title: "如何为项目定制 Harness 环境"
tags: ["ai_agent", "ai_coding", "article", "wechat", "harness_engineering", "skills"]
legacy_tags: ["ai_agent", "ai_coding", "article", "wechat", "harness_engineering", "skills"]
created: "2026-07-02"
source: "https://mp.weixin.qq.com/s/pe5urflbuXNN5c7UjWBtCg"
description: "魔术师卡颂：Harness 定制心法「减框架、增基建」——从 superpowers/gstack 起步，用文档沉淀与测试/lint/schema 基建替换过重编排"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/如何为项目定制 Harness 环境 - 魔术师卡颂.md"
source_sha256: "b7075780eb358db223857fa32441b7a37cc99c241f88cf302b53b48dee3a75db"
migration_id: "migration-20260720-64e79771"
author:
  - "[[魔术师卡颂]]"
date: 2026-05-28
---

# 如何为自己的项目定制 Harness 环境？

> 作者：@魔术师卡颂 | 2026-05-28

---

## 核心命题

完善的 Harness **不是一蹴而就**。卡颂分享定制路径：

**减框架，增基建**——编排越轻，越靠项目里可复用的硬约束与文档。

---

## 入门：先站在成熟框架上

初次做 Harness Engineering，先用成熟方案，二选一即可：

| 框架 | 约束视角 |
|------|----------|
| **superpowers** | 完成任务**必须遵循的工序** |
| **gstack** | 完成任务**每个工种的最佳实践** |

两者都是 Agent 执行流程的编排框架，差别在「管流程」还是「管工种标准」。

---

## superpowers 用久了的两类痛点

### 1. 太重

superpowers 要求**任何任务**都走完整工序，例如：

1. 一问一答头脑风暴  
2. 创建 worktree  
3. 头脑风暴 → spec（含 review）  
4. spec → plan（含 review）  
5. 大 plan 拆 task，TDD + subAgent 实现  
6. 跑测试  

一个小改动也要跑完全程 → **任何小任务都很长**。和 [[AI Coding 时间管理 - 50% 工作法 - 魔术师卡颂]] 里「Agent 老问你、并行跑不动」是同一类 Harness 债务。

### 2. 头脑风暴太费时间

小任务的细节 Agent 都要和你对清楚 → 开发者大部分时间花在**对话**上，而不是修基建。

---

## 定制心法：减框架，增基建

### 痛点 A：头脑风暴太费时间

**根因**：项目里**没有沉淀最佳实践**。

**改法**：

- **增基建**：加「项目文档沉淀」流程（规范、决策、接口约定写进可检索文档）
- **减框架**：改头脑风暴——**提问前先检索文档**，能复用就不问；只有拿不准再问人

和 [[2026 年 Agent 最重要的工程概念 Harness Engineering]] 里 docs/ 当 source of truth 同向。

### 痛点 B：编排流程太重

**改法**：

- **增基建**：补全开发 / 测试 / 部署 / 上线全流程基建  
- **减框架**：基建到位后，逐步砍掉流程上的重复约束  

基建越完善，框架层约束越可删：

| 基建到位 | 可减掉的框架步骤 |
|----------|------------------|
| 明确的测试金字塔（unit / component / e2e）生成流程 | 框架里强制的「基于 TDD 开发」 |
| 完善的 lint、TS、JSDoc 规则 | 流程里额外的「代码质量」人工门控 |
| 前后端 TS + 后端 OpenAPI → 前端生成请求 | 前后端联调流程上的冗长约束 |

慢慢可以砍掉 superpowers 流程间的 review、砍掉 plan，**最终只留下 Agent 原生的 Plan Mode**。

---

## 终态画像

> **一套很重的基建 + 很轻的流程编排框架**

这就是「为自己的项目定制的 Harness 环境」——不是抄 OpenAI/Anthropic 模板，而是 [[别再搭 Harness 了，先把你的痛点解决，用最笨的方式]] 里「先痛点后系统」在 Harness 层的落地。

---

## 相关阅读

- [[AI Coding 时间管理 - 50% 工作法 - 魔术师卡颂]] — 50% 时间就该投在这类 Harness 定制上
- [[想锻炼 AI 能力 - AI Native CLI - 魔术师卡颂]] — CLI / 接口层也是基建的一部分
- [[WorkOS-创建和使用Skills方法论]] — Skill 作为可移植工作单元，对应「工种最佳实践」
- [[Harness 实践 - 将任何文字编辑成精美的文章 - ConardLi]] — 可迁移 Harness 骨架的另一种形态
- [[MOC - Harness Engineering]] — Harness 横切入口
