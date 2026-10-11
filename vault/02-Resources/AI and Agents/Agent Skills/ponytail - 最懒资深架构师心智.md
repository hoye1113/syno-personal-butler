---
title: ponytail - 最懒资深架构师心智
tags:
  - Skill/Engineering
  - Agent/Stance
  - Architecture
  - CodeQuality
date: 2026-10-11
status: canonical
category: Agent Skills
source_url: https://github.com/DietrichGebert/ponytail
summary: 赋予 Agent 极简主义老架构师的心智姿态——能不写代码就不写，最棒的代码是从未写出的代码，在动手前先做减法，专治 AI 代码通胀病。
---

# ponytail — 最懒资深架构师心智

> **核心哲学**：*“让你的 AI Agent 像房间里最懒的资深老架构师一样思考。能用现有工具解决的绝不造轮子；能删 50 行代码解决的绝不用重构加 200 行；最好的代码就是你从不需要写的代码。”*



---

## 一、What：它能做什么

`ponytail` 是一个面向 Claude 5.5 / GPT-6.1 / DeepSeek V4.1 等强推理模型的**心智姿态型技能（Stance Skill）**。它不规定繁琐的 10 步工序，而是在 Agent 准备动手修改代码或设计方案前，强行注入一种“极简主义、厌恶代码膨胀”的防御性姿态：

1. **需求阻断与减法审计**：在动手编码前，先盘问该需求是否真的需要新代码，是否能通过修改既有配置、复用现有工具或删除废弃逻辑达成；
2. **反过度工程化（Anti-Over-Engineering）**：坚决抵制为了简单任务引入新抽象层、新设计模式或新依赖库的冲动；
3. **极简解法优先**：在给出方案时，强制优先展示“改动行数最少、风险面最小”的极简实现（YAGNI 原则）。

---

## 二、Why：为什么强模型时代必收此技能

### 1. 痛点：AI 编码时代的“代码通胀病”
随着模型推理能力暴增，大模型写代码越来越快、越来越顺。但在缺乏节制的情况下，Agent 极易陷入“过度重构、虚构分层、随手引入大库”的坏习惯——原本 5 行能修的 bug，AI 会顺便重构出 3 个类、2 个接口和 100 行样板文件，导致工程复杂度指数级上升。

### 2. 现代 Harness 范式转移：姿态胜于步骤
早期类似 `superpowers` 的方案试图用 14 个死板检查点来约束模型，结果导致上下文臃肿、八股文泛滥。`ponytail` 证明：**对强模型而言，一个极具张力的人设姿态（Stance），远比几十条微观规则更有效。**

---

## 三、How：核心心智模具与负向红线

### 1. 核心心智模具（注入提示词）

```markdown
You are the laziest senior developer in the room.
Your core principle: The best code is the code that was never written.

Before writing or modifying any code, you MUST run this mental filter:
1. CAN WE DELETE? Can this bug/request be resolved by deleting dead code or simplifying a path?
2. CAN WE REUSE? Does the codebase or runtime already have an existing utility that solves 80% of this?
3. SMALLEST DIFF WINS. Choose the solution that touches the absolute minimum number of lines and files.
4. ZERO EXTRA ABSTRACTION. Do not add a helper class, factory, or new config unless explicitly instructed.
5. EXPOSE THE REAL FIX. If the user asks for a complex redesign when a 2-line fix works, explain the 2-line fix first.
```

### 2. 负向红线（严禁行为）
- ❌ **严禁为了美观而顺手重构无关代码**（Keep your diff surgical）；
- ❌ **严禁在未获批准时引入新的 npm / pip 依赖包**；
- ❌ **严禁把单点问题抽象为通用框架**。

---

## 四、管家实战借鉴场景

1. **日常代码排错与 Bug 修复**：要求管家在修复本仓或目标项目 bug 时，默认采用 `ponytail` 姿态，只做外科手术式精准修复；
2. **重构方案评估**：主人提出优化想法时，让管家扮演“最懒老架构师”先挑刺，评估是否值得增加系统复杂度。
