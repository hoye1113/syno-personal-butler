---
title: "Codex 负责人 - 所有人都是 builder 是个很糟糕的主意"
tags: ["ai_agent", "ai_career", "ai_coding", "article", "wechat", "codex", "openai"]
legacy_tags: ["ai_agent", "ai_career", "ai_coding", "article", "wechat", "codex", "openai"]
created: "2026-07-03"
source: "https://mp.weixin.qq.com/s/wJrUsBSs0owDascwDZBd-w"
description: "Founder Park 译 Lenny 对谈 OpenAI Codex 负责人 Andrew Ambrosino：实现廉价后 taste 最贵；PM 不消失；Codex 晚发 3 月会死；会删代码比会写更重要"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/Codex 负责人-所有人都是 builder 是个很糟糕的主意 - Founder Park.md"
source_sha256: "0f1bbb85b50fec333d79b0cb446569fab0430fc8fdad6c1a6e203fe640953623"
migration_id: "migration-20260720-64e79771"
author:
  - "Founder Park"
date: 2026-07-02
---

# Codex 负责人：「所有人都是 builder」是个很糟糕的主意

> 来源：Founder Park（极客公园）| 对谈：Lenny × **Andrew Ambrosino**（OpenAI Codex 团队负责人，设计师/工程师/产品/创业者背景，Codex 周活 500 万+）| 2026-07-02

---

## 核心命题

当公司里几乎每个人都能快速搭出功能原型，难题不再是**能不能做**，而是**该不该做**。

Andrew 的判断：**流程倒过来了**——实现不再稀缺，**品味（taste）** 成为最贵资源。

---

## 一、实现廉价 → taste 变贵

**旧假设**：实现贵 → 先调研、文档、原型排风险，再开发。

**现在**：任何人都能跟模型对话搭出功能；OpenAI 内部常出现 **90 个未协调的小团队**同时做同一需求 → 问题变成：哪些好？怎么合并？开关几个选项？

- **「PRD 已死，原型当道」**——Andrew **不同意**：实现各媒介都便宜后，**跳过思考直接做原型**很诱人；工程师也会写**大量不值得读的文档**。关键是**选对表达媒介**：模糊领域写文档，交互模式压力测试做原型。
- **Primal mark 风险**：原型视觉上像已上线产品，但可能方向全错——**外观与流程阶段脱钩**。
- **品味拆解**：审美 + 系统思维 + 方向 + 表达 + 交互语义；核心是 **「什么都能做时，目标是什么、怎么到达？」**
- **AI 设计为何还弱**：设计难评分、不在研究飞轮里；设计要**新颖性**（软件要模式复用）；品牌换肤需要**抽象层**（263 个组件 vs 一种列表样式）——技术还够不到。
- **Jenny Wen「设计流程死了」**：Andrew 部分同意——绑定特定工具/日常操作的流程死了；但 **「我们现在处于流程哪一阶段」** 比以往更重要。新工具：baby Codex、A/B、把实现拉到流程最前——需配合阶段认知。

---

## 二、角色融合，但 PM 不会消失

- **「取消产品角色、人人都是 builder」**——Andrew 认为是**很糟糕的主意**：PM 学科里的最佳实践被直接抛弃。
- 欢迎「这不是你的领域不能碰」边界消失，但**不是每个人都能做所有事**；Excel 会用 ≠ 能去财务团队。
- **Codex 团队**：面向工程师的产品 → 设计师说工程语言、PM 写代码；角色重叠大，定义人看**工作内容的平均分布**而非设计/工程切线。
- **Zone defense（区域防守）**：两个 PM 贴太紧不是好信号；像力导向图铺开——**策展、引导、对齐**最重要；招「产品思维强的工程师」，避免先堆代码再整队校准。
- **招人硬标准：品味**——无限 tokens 世界里**不能生产垃圾**；从海量内容分辨信号与噪音。
- **团队规模**：「10 到几千人」——模型研究、浏览器、人格、前端、UX 都汇入产品；实际两位数工程师 + 约一半设计师 + 几位 PM，**dogfooding** 驱动：宁可不改内部流程，让产品自己变好。

---

## 三、Codex 晚发 3 月会死——变量是模型

**规划**：越远越模糊；11 月计划的精度到 2 月常全错。旧流程崩溃后 → 列方向、做原型、能上的现在上，**搁置的等模型跃升再试**。

> **一个功能够不够好，往往不取决于形态，而取决于模型够不够聪明。**

- **Codex 应用**：若 **11 月发**（2 月实际发）会**市场彻底失败**——同形态，差在 **11 月→2 月模型进步**。
- **教训**：不要轻易判「功能坏」，可能只是**还没到时候**；同一形态可能需**发布六次**才成功（Operator → Atlas → Codex 浏览器是一条演进线）。
- **文化**：保留**自下而上探索**——Codex 曾颠覆 ChatGPT，Codex 也可能被新尝试颠覆；**不能指望同一团队既颠覆又打磨细节**。

**愿景**：开发者工具与通用知识工作的共通形态——**大本营**：在此开始/结束工作、管自动化，调用所需工具（super app，Andrew 嫌这词被用滥）。Dan Shipper：**由内而外用 SaaS**——Notion/Linear 由 agent 在 Codex 里操作，不必开浏览器。例：视频制作人用 Codex 剪 Premiere——写扩展跟 Premiere 对话，而非 Codex 变成视频编辑器。

---

## 四、会写代码不重要，会删代码才重要

- **100% AI 写代码**（去年标准）→ 新问题：**监督 vs 无监督**；大量 harness engineering、夜里自动垃圾回收。
- **模型通病：只增复杂度**——Andrew 呼吁：**让模型学会删代码**；还有判断哪些 feature 该做/忽略/合并、建正确抽象。
- **Andrew 工作流**：Codex 写 Codex → 角色变后做发现/对齐；5 月发布用 **vibe coordination**（Notion + Codex 扫 PR/Slack 更新状态）；**每日 Slack 日报**（3000 频道筛选）→ 对话调偏好。
- **个人自动化**：连接器边界模糊——「我不管你有没有连接器，我直接开始点击」（computer use）。
- **建议**：不要与当前工作流**绑定终身**；坚持**只有你独特交付的成果**；若最骄傲的技能是「最懂 Figma auto layout」，AI 会超过你——**找到值得做的事并去做**。

---

## 相关阅读

- [[OpenAI官方-Codex新手教程]] — AGENTS.md、沙箱、MCP 产品形态
- [[Codex负责人-现场演示Codex]] — 同负责人 live demo
- [[Codex 自我改进 Prompt]] — traces → Skill 固化
- [[Claude Code负责人-AI原生团队如何使用AI]] — 对照 Anthropic dogfooding
- [[AI 时代如何面试工程师]] — Coder → Engineer，元能力
- [[80% 的 App 未来会消失吗？我不这么认为]] — 品味与「做得好」
- [[AI Coding 时间管理 - 50% 工作法 - 魔术师卡颂]] — Harness 时间分配（对照 OpenAI 内部 90 路原型）
- [[MOC - Agent Theory and Design]] — 横切入口
