---
title: "Spec Kit vs OpenSpec vs Superpowers：我为什么最后自己搭了一套"
tags:
  - ai_coding
  - harness_engineering
  - wechat
  - article
  - skills
created: 2026-07-07
source: https://mp.weixin.qq.com/s/ZlTW-D0PIS0dQKhnb1_ldA
description: "CCC 对比三个 AI Coding 框架（Spec Kit / OpenSpec / Superpowers），取各家精华搭出三层架构（Harness + Skill + Spec），在十万行棕地项目上跑了四个月"
author:
  - "[[CCC]]"
---

# Spec Kit vs OpenSpec vs Superpowers：我为什么最后自己搭了一套

> 作者：CCC（深入浅出AI） · 2026-07-07

---

## 三个框架各留什么、丢什么

### Spec Kit：宪法思维留下，阶段门控丢了

- **留下**：Constitution（宪法）思维——写给 AI 看的约束协议，每条可量化验证（"骨架屏必须用 CustomSkeleton，禁止直接用 antd Skeleton"）
- **丢掉**：阶段门控。棕地项目（十万行已有代码做增量改造）走完全流程 1.5 小时，改的代码可能就 50 行，流程开销倒挂。且按功能分片管理规范，没有 Delta Spec 机制，结构性不匹配

### Superpowers：铁律纪律留下，14 个 Skill 全链丢了

- **留下**：
  - "LLM 的乐观偏见"洞察——Claude 倾向于声称完成、跳过验证、绕过流程
  - 铁律工程化——MUST / ABSOLUTELY / HARD-GATE 三层叠加，"违反就有后果"的闭环设计
- **丢掉**：
  - 14 个 Skill 全链太重，Token 消耗成倍放大
  - 纯 brainstorming 方向校准导致 2 次返工——brainstorming 适合绿地项目从零探索，不适合棕地项目在约束中生长
  - 无规范累积机制，每次新对话 AI 忘光之前的决策

### OpenSpec：Delta Spec 留下，apply 阶段无纪律丢了

- **留下**：
  - Delta Spec：只写变化部分（ADDED / MODIFIED / REMOVED / RENAMED），40 分钟走完同一段需求（Spec Kit 的 1/3）
  - 单目录收拢：一个需求的所有产出收进同一个目录
- **丢掉**：apply 阶段缺少 TDD、强制代码审查、验证机制，实现质量靠 AI "自觉性"，企业场景不够

| 框架 | 拿走了什么 | 丢了什么 | 为什么丢 |
|------|-----------|---------|---------|
| Spec Kit | 宪法思维 | 阶段门控、按功能分片 | 太重，棕地不友好 |
| Superpowers | 铁律纪律 | 14 个 Skill 全链、brainstorming | 成本高，方向易偏，无规范累积 |
| OpenSpec | Delta Spec + 单目录收拢 | apply 阶段无纪律 | 靠 AI 自觉，企业场景不够 |

---

## 三层叠加架构

CCC 的最终方案是三层结构：

```
Harness 层（CLAUDE.md 约束 + 决策点 + 常见坑表）
    │
Skill 层（8 个 Skill，借鉴 Superpowers 的铁律纪律）
    │
Spec 层（OpenSpec 的 Delta Spec + 单目录收拢）
```

- **Spec 层（管"做什么"）**：借鉴 OpenSpec Delta Spec，每次改动只写增量，全部产出收进 `spec/changes/<feature>/`
- **Skill 层（管"怎么做"）**：8 个 Skill 带硬门控，AI 遇到不确定就停下来等人
- **Harness 层（管"按什么标准"）**：CLAUDE.md 里写可验证约束，每次 review 发现的规范漏洞自动回流

### 关键设计

**WORKFLOW.md**（放在 `spec/` 下）：
- Skill 调用链：8 个 Skill 的依赖和流转顺序
- 三种裁剪模式：full（新功能）/ light（小改动）/ bugfix（独立修复）
- 核心原则：先搜代码再写代码、先读 CLAUDE.md 再动手

**组件分层对照表**（Harness 层核心表）：
- L0 原始层（禁止直接使用）→ L1 封装层（优先使用）→ L2 业务层（搜到即用）→ L3 页面层（只在对应页面内使用）
- 跑了四个月从十来行长到四十多行，AI 误用原始组件降八成以上
- 本质是 AI 和代码库之间的"通用语言"

### brainstorming vs grill-me

Superpowers 的 brainstorming（开放式讨论，适合绿地项目）vs Matt Pocock 的 grill-me（逐层审问，适合棕地项目）：

> brainstorming 适合从零探索，grill-me 适合在约束中生长。

CCC 借鉴 grill-me 封装成自己的 `product` Skill——不是开放式讨论，是拿着已有代码和需求文档做交叉审问。

---

## 真实案例

需求：给用户管理列表加"按角色筛选"

1. **Spec 层**：Delta Spec 只写增量（ADDED 筛选栏、MODIFIED 接口和 URL query）
2. **Skill 层**：`api` 读 product.md 和 CLAUDE.md → 生成接口定义 → 发现接口文档不清楚标 `[待确认]` 停下等人 → `ui` 读 FilterBar 封装约束 → `page` 组装
3. **Harness 层**：`review` 三步检查法（查意图→查质量→查边界）抓到 2 个问题：1 个规范缺失（补进 CLAUDE.md）+ 1 个实现缺失（退回 page）

全程约 50 分钟，2 个问题在代码合入前拦住。

---

## 适用边界

- **适合**：棕地增量改动、中大型团队、有 PRD/代码库可做"主干"的场景
- **不适合**：绿地探索、一个人的个人项目、一次性脚本
- **Spec Kit + Superpowers 直接组合不行**：流程开销叠在一起只有超大规模团队扛得住，且两套系统中间的胶水成本太高

---

## 相关阅读

- [[如何为项目定制 Harness 环境 - 魔术师卡颂]] — "减框架、增基建"的定制心法
- [[AI框架与 Harness 的关系 - 魔术师卡颂]] — Harness 三层模型（约束/路由/编排）
- [[Loop Engineering 橙皮书 - 花叔]] — Loop = Harness 上一层
- [[Superpowers Evals 在测什么 - Fly]] — Superpowers 工作流行为评测
- [[MOC - Harness Engineering]] — Harness 工程主题索引
