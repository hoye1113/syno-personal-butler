---
title: "smart-draw 手绘风可编辑 AI 图表 - 极客公园"
tags: ["ai_agent", "ai_coding", "article", "wechat", "prompting"]
legacy_tags: ["ai_agent", "ai_coding", "article", "wechat", "prompting"]
created: "2026-07-02"
source: "obsidian_repository_snapshot"
description: "极客公园「AI 上新」：smart-draw（Smart Excalidraw）用自然语言生成手绘风 Excalidraw 可编辑图表，补 AI 生图不可改与 Mermaid 工业味之间的缺口"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/smart-draw 手绘风可编辑 AI 图表 - 极客公园.md"
source_sha256: "43e16d14a88e90f8d64c9709c09ed71c2143cb114e027614c85e34d5f9205751"
migration_id: "migration-20260720-64e79771"
author:
  - "金光浩"
date: 2026-01-20
---

# 一句话让 AI 生成手绘风可编辑图表（smart-draw）

> 原文：极客公园「AI 上新」| 作者：金光浩 | 2026-01-20  
> 开源项目： [smart-excalidraw-next](https://github.com/liujuntao123/smart-excalidraw-next)（文中称 smart-draw；后续有 [ai-draw-nexus](https://github.com/liujuntao123/ai-draw-nexus) 升级版）

---

## 核心命题

AI 能画画，但多数方案要么**改不了**（PNG/JPG），要么**太工业**（Mermaid 蓝紫灰）。  
smart-draw 的定位：**你只管说话，它出 Excalidraw 源文件**——手绘松弛感 + 100% 可编辑。

---

## 两类旧方案的痛点

| 方案 | 优点 | 死穴 |
|------|------|------|
| **AI 生图**（如 Nanobanana-pro） | 配色排版专业 | 输出是压平的位图；改一个字、挪一个节点都要重抽 |
| **Mermaid 流程图**（豆包 / DeepSeek 等） | 可导出 SVG / 代码二次编辑 | 横平竖直、工业味重，社媒和演讲 PPT 缺「人味」 |

smart-draw 填的缝：**Excalidraw 原生格式 + 手绘风**。AI 做 95%，剩下 5% 你在画布里拖改。

本质：封装了一套**面向绘图的提示词工程**——自然语言 → Excalidraw 能执行的结构化指令。

---

## 四种典型玩法

1. **一句话概念图**  
   例：「什么是审美」→ 暖色思维导图，节点可拖。思考可视化门槛从「会画图」降到「会说想法」。

2. **技术描述 → 架构图**  
   喂 Cursor 分析出的模块与数据流，生成带箭头标签的架构图；布局均衡，技术分享可直接用。

3. **长文 → 知识卡片**  
   粘贴文章 / 播客稿，提炼核心观点成一张可编辑配图——改不准的观点不用整图重生成。

4. **与 Nanobanana 组合**  
   smart-draw 定结构 → 导出 SVG → Nanobanana「美颜」：结构可控 + 视觉精致。

---

## 为什么「套壳」也有价值

技术上不训练新模型，是 **Wrapper**：Excalidraw 会画、LLM 会理解，中间缺**翻译层**。

作者把 Prompt + 渲染粘合后，不懂快捷键的普通人也能出架构图——能力都在，**接口**才是瓶颈。

和 vault 里其他判断同频：

- 断裂的工作流（写完文要配图、读完长文要总结、有想法要上 PPT）比「造大模型」更接近真实痛点
- [[Harness 实践 - 将任何文字编辑成精美的文章 - ConardLi]] 用 Harness 把文字变网页；smart-draw 把文字变**可改**的图——都是「现有工具 + 顺滑接口」

---

## 使用侧提示（来自项目 README）

- 配置 OpenAI 或 Anthropic API Key（本地浏览器存）
- 模型推荐 Claude Sonnet 系列
- 支持流程图、架构图、时序图、ER 图、思维导图等 20+ 类型

---

## 相关阅读

- [[Codex实战-构建全能AI营销团队]] — Excalidraw diagram skill；Agent 侧「少字多图」可视化
- [[Harness 实践 - 将任何文字编辑成精美的文章 - ConardLi]] — 同一类「接口层」产品思路
- [[驾驭 AI - 把不确定问题转化为可控实验 - 魔术师卡颂]] — AI 生图不可微调 = 不确定；Excalidraw 可编辑 = 客观标准 + 人工闭环
- [[万人大厂宣布裁员 40% 利润在涨人却多余了]] — 同来源极客公园公众号
