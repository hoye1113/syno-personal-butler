---
title: "Harness 实践：将任何文字编辑成精美的文章"
tags: ["ai_agent", "article", "harness_engineering", "skills", "wechat"]
legacy_tags: ["ai_agent", "article", "harness_engineering", "skills", "wechat"]
created: "2026-06-17"
source: "https://mp.weixin.qq.com/s/t0-HbOj-Z2_RcZZJRPpM9A"
description: "ConardLi 开发 Beautiful Article Skill 的完整教程——用 Reacticle 组件协议 + 8 Phase 流程将任意文字编辑成精美网页文章，验证'好的 Harness 是可以迁移的'这一核心观点"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/Harness 实践 - 将任何文字编辑成精美的文章 - ConardLi.md"
source_sha256: "abea2cead98c0dede5918916a8744a9fbf36fbf5dbd67236d380465401a4f39e"
migration_id: "migration-20260720-64e79771"
author:
  - "[[ConardLi]]"
---

# Harness 实践：将任何文字编辑成精美的文章

> 原文发布于「code秘密花园」公众号
> 作者：ConardLi（花园老师）

---

## 核心观点

**好的 Harness 是可以迁移的。** 上一篇视频 Skill 用分阶段编排 + 文件化状态记忆 + 强制人工检查点 + Reviewer 质检 + 最小切片修复稳定产出视频；这次用几乎同一套骨架，做一件完全不同的事——把任何文字编辑成精美的网页文章。

---

## 一、为什么需要 Beautiful Article Skill

### 1.1 HTML 的优势（来自 Claude 官方博客）

Claude 官方文章《The unreasonable effectiveness of HTML》核心观点：Markdown 写文章很简单，但面对复杂报告、图表、交互、视觉结构时不够用。HTML 的优势：
- **信息密度高** — 表格、SVG、代码片段、公式可以混排
- **视觉结构化** — 标题层级、颜色、间距精确控制
- **可交互** — 折叠、Tab、复制按钮、可调控件
- **易分享** — 单文件，不需要装任何东西

### 1.2 但 HTML 很强 ≠ 该让 AI 裸写 HTML

问题：单文件巨大难维护、效果不可控、文字失去"文章"感。和视频 Skill 的痛点相同——模型有能力，但需要一套系统来驾驭。

---

## 二、Reacticle 组件协议

**Reacticle = React + Article**

一句话定位：Markdown 让人轻松写文章；Reacticle 让 AI 可控地生成长文 HTML。

### 三个关键设计

**1. 语义组件词汇表**

提供专门用于编写"文章"的组件，平替 Markdown 所有语法：`Article / Hero / Lead / Section / Subsection / Table / Quote / Formula / CodeBlock / Image / TOC / Conclusion`

AI 只负责"组合"这些组件，结构和排版由库保证。不需要 AI 去想"这里用 div 还是 section"。

**2. Raw 自由层（受契约约束）**

逃生舱：任意 HTML/SVG/CSS/React 都能塞进 Raw。硬约束：Raw 里的所有样式必须消费约束好的主题 token。

**3. 11 套编辑级主题**

每套主题同时是两份东西：
- 一份 CSS token 包 — 定义颜色、字体、间距、阴影等所有视觉变量
- 一份给 AI 读的 Markdown — 告诉 AI 这套主题该用什么配图风格、什么代码高亮、什么 Raw 惯用法、什么是反模式

示例主题：Tufte（数据墨水风格）、Sottsass（Memphis 撞色风格）、Bayer（包豪斯三原色几何感）、Freddie（交互式学习体验）

GitHub：https://github.com/ConardLi/reacticle

---

## 三、8 Phase 执行流程

```
Phase 0  Intake           判断是否进入本 Skill + 初步文章类型
    ↓
Phase 1  Source → Markdown  URL/PDF/DOCX/MD/文本 → source.md + extraction-notes.md
    ↓
Phase 2  Editorial Planning  一份 plan.md（Brief / Outline / Theme / Assets 四段）
    ↓
Phase 3  Plan Checkpoint     ★Checkpoint 1 必须停
    ↓
Phase 4  First Spread        首屏 + 第一节 + 一个代表性视觉块
    └ ★Checkpoint 2 必须停
    ↓
Phase 5  Full Article Build  生成完整网页文章
    ↓
Phase 6  Final Review        三视角终审
    ↓
Phase 7  Repair              最小切片修复
    ↓
Phase 8  Delivery            ★Checkpoint 3 必须停 → 交付 article.html
```

### 9 种文章类型

| 类型 | 信息保留 | 适用场景 |
|---|---|---|
| longform | ~100% | 原文质量高、值得完整归档 |
| full-report | ~80% | 调研、技术评估、正式分析 |
| tutorial | 80-100% | 跟着做就能跑通的内容 |
| explainer | ~80% | 把机制/系统/算法讲明白 |
| dialogue | ~80% | 播客、访谈、AMA |
| review | 60-80% | PR、方案、事故、架构设计 |
| essay | 60-80% | 评论、评测、叙事和专栏 |
| briefing | 40-60% | 给忙人看的，结论先行 |
| interactive-explainer | ~25% | 可操作的学习页 |

---

## 四、Harness 六大核心部分对照

| 核心部分 | 解决的问题 | 视频 Skill | 文章 Skill |
|---|---|---|---|
| 上下文管理 | 模型当前应该看到哪些信息 | 渐进加载 | 渐进加载 + 每节回读 |
| 工具系统 | 模型能调用哪些能力 | ffmpeg/whisper | 脚手架 + 标准工作区 |
| 执行编排 | 模型下一步该做什么 | 4 阶段 2 检查点 | 8 Phase 3 检查点 |
| 状态与记忆 | 如何跨步骤保持连续性 | 文件化状态 | plan.md/source.md |
| 评估与观测 | 怎么知道自己做得对不对 | 节点质检 | 三视角 SubAgent 终审 |
| 约束与恢复 | 怎么避免跑偏 | 最小切片修复 | Reacticle + 最小切片修复 |

### 设计原则

1. **渐进加载上下文** — 每个阶段只看该看的东西，不在启动时一次性塞入所有规范
2. **检查点禁止替用户做主** — 每个决策项必须独立列出、独立等用户答复
3. **文件化工作记忆** — source.md / plan.md / extraction-notes.md 是 Agent 的工作记忆
4. **一节一文件** — 多 Agent 并行的前提
5. **审核要放在关键节点** — 用独立 SubAgent 质检
6. **最小切片修复** — 某节信息太薄就补那一节，保护已正确的部分
7. **自进化** — 审核和修复记录落到本地文件，反过来改进下一次流程

---

## 五、实战演示环境

| 工具 | 用途 |
|---|---|
| Claude Code | 核心执行 Agent |
| MiniMax M3 | 模型（1M Context、原生多模态） |
| CC Switch | 桌面配置工具，切换自定义模型 |
| beautiful-article Skill | https://github.com/ConardLi/garden-skills |
| Reacticle | https://github.com/ConardLi/reacticle |
| Showcase / Gallery | https://rearticle.mmh1.top/#/gallery |

---

## 六、升华

真正值得复用的不是某一段提示词，也不是某一个组件，而是这套工作方法：
- 把复杂任务拆成阶段
- 把关键决策变成检查点
- 把上下文写进文件
- 把输出表面收进协议
- 把质量问题交给审核
- 把修复限制在最小切片
- 把审核和修复日志沉淀下来，反过来改进下一次流程

**可迁移场景**：周报、播客 Shownotes、课程讲义、技术文档、产品发布页

---

## 相关阅读

- [[MOC - Harness Engineering]] — Harness 工程横切 MOC，跨课程/公众号/B站
- [[Anthropic Agent 工程实战指南 - 从入门到生产落地]] — 1758 行 Anthropic 官方汇编
- [[2026 年 Agent 最重要的工程概念 Harness Engineering]] — OpenAI harness = docs/ 实验
