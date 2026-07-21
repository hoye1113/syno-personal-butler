---
title: "未来的 AI 编程就是 Loop 套 Loop"
tags: ["ai_agent", "ai_coding", "article", "wechat", "loop_engineering", "harness_engineering"]
legacy_tags: ["ai_agent", "ai_coding", "article", "wechat", "loop_engineering", "harness_engineering"]
created: "2026-07-02"
source: "https://mp.weixin.qq.com/s/wsuOcx1db7ydin7w1np6mA"
description: "魔术师卡颂：Loop Engineering=人设计循环、AI 跑至门禁通过；三层 Loop 压缩信息——代码→门禁→门禁质量→规则质量"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/未来的 AI 编程就是 Loop 套 Loop - 魔术师卡颂.md"
source_sha256: "48abfcb7ec2a8dc70174924c60b42879765ba6725f8750b1ba500886bd08f115"
migration_id: "migration-20260720-64e79771"
author:
  - "[[魔术师卡颂]]"
date: 2026-06-24
---

# 未来的 AI 编程就是 Loop 套 Loop

> 作者：@魔术师卡颂 | 2026-06-24

---

## 核心命题

**Loop Engineering** = 人不介入具体执行，**设计循环让 AI 自动工作**，人只验收产出。

卡颂判断：未来 AI 编程的趋势是 **Loop 套 Loop**——层数越多，人需关注的信息越少。

---

## Loop Engineering 是什么

例：所有编码交给 AI，如何保证质量？

人肉 Review 太低效 → 设计**门禁**作验收端：

- 静态检查：lint、ts check  
- 测试金字塔（单测 / 集成 / e2e）  
- CI  
- 基于 Agent 的 PR Review  

此时 **「开发需求」= 一个 Loop**：

- **触发端**：准备开发需求  
- **验收端**：上述门禁全部通过  
- **中间**：Agent 不断循环直到过门  

和 [[驾驭 AI - 把不确定问题转化为可控实验 - 魔术师卡颂]] 同构：门禁 = 客观标准，Agent 跑 = 反馈闭环。

---

## 解决什么问题：信息压缩

以前评估代码质量，人要盯**具体代码逻辑**。  
Loop 模式下，人只需盯**门禁设计是否完善**。

例：TODO App——以前看增删改查实现；现在盯一条 e2e：「点新增 → 输入 → 确认新增；点删除 → 确认删除」。测试过，代码逻辑大概率 OK。

**关注的信息被压缩了**——和 [[AI框架与 Harness 的关系 - 魔术师卡颂]] 里「底层环境约束宜厚」一致：质量判断下沉到基建。

---

## 新问题：门禁本身也要 Loop

一次让 Agent 实现大量需求 → **门禁代码**也会暴涨。门禁也有质量、覆盖不全问题。

**答案：为门禁再套一层 Loop。**

卡颂做法：定时任务**每天扫描压缩后的 Agent Session Log**，找预设的**模式偏差**，例如：

> lint / 类型问题是在 Agent 执行中才发现的 → 说明缺对应 gate  

→ 基于偏差提 **「新增 gate 的 issue」**。

信息从「Review 每个需求产生的大量门禁」→ 压缩到 **「关注每天 Agent 提的改进 issue」**。

这就是 **第 2 层 Loop**。和 [[遇事留痕 - Loop Engineering 的基础 - 魔术师卡颂]]、[[如何让 Skill 自动优化 - 魔术师卡颂]] 同脉：Session Log / PR 反馈 → 驱动下一层改进。

---

## 第 3 层：为什么用 issue 而不是本地 md

「发现改进意见」当前基于**预设的模式规则**。  
为何让 Agent 提 **issue**，而非写本地 md？

因为 issue 的**处理方式**（完成关闭 / 不处理关闭）、**人类评论**都是正/负反馈 → 驱使 Loop **改进模式规则本身**。

→ 第三层关注：**「能持续提升门禁质量的规则」的质量**。

---

## 三层总结（卡颂预测）

| 层 | 人关注什么 |
|----|------------|
| **无 Loop** | 代码 |
| **一层** | 约束代码质量的**门禁** |
| **二层** | **持续提升门禁质量**（Log → issue） |
| **三层** | **持续提升「发现门禁缺口」的规则** |

Loop 套得越多，人盯的信息越少——这是卡颂眼中的 **AI 编程趋势**。

与 [[Loop Engineering 橙皮书 - 花叔]] 五动作循环互补：橙皮书给框架，本篇给**嵌套层数 + 信息压缩**直觉。

---

## 相关阅读

- [[Loop Engineering 橙皮书 - 花叔]] — Loop = Harness 上一层；五动作 + 六零件
- [[遇事留痕 - Loop Engineering 的基础 - 魔术师卡颂]] — Session Log 是二层 Loop 的输入
- [[如何让 Skill 自动优化 - 魔术师卡颂]] — 三层：PR 反馈 → 规则集迭代
- [[如何为项目定制 Harness 环境 - 魔术师卡颂]] — 加厚测试/lint 等「门禁」基建
- [[AI Coding 时间管理 - 50% 工作法 - 魔术师卡颂]] — 50% 时间投 Harness / 门禁
- [[MOC - Harness Engineering]] — 横切入口
