---
title: open-design - 本地优先全能设计引擎
tags:
  - Skill/Design
  - DeepSeekHarness
  - Frontend
  - Visual
date: 2026-10-11
status: canonical
category: Agent Skills
source_url: https://github.com/nexu-io/open-design
summary: 本地优先的开源 Claude Design 平替与全能视觉引擎，深度适配 DeepSeek Harness，将 Agent 化身为专业设计团队，一键交付落地页、原型、PPT 与演示视频。
---

# open-design — 本地优先全能设计引擎

> **核心哲学**：*“设计不应该被锁在闭源 SaaS 的黑盒里。让你的本地编码 Agent 成为设计引擎本身，直接在工作区中孕育真实、高保真、可交互的原生资产。”*



---

## 一、What：它能做什么

`open-design` 是目前开源社区规模最大、深度适配 **DeepSeek Harness、Claude Code 与 Codex** 的本地优先视觉设计引擎。它把 AI Agent 的能力从“写代码”升维为“交付成套产品级设计制品”：

1. **多载体交付全覆盖**：
   - 网页落地页（Landing Page，响应式、高转换率设计）；
   - 交互原型（可点击、带状态机的高保真 UI）；
   - 商业演示幻灯片（HTML / PPTX 双格式，支持键盘控制与优雅动画）；
   - 动态宣传与演示视频（基于代码渲染导出 1080P MP4）；
2. **本地文件级产物输出**：不依赖外部云端画布，直接在项目本地目录生成标准的 HTML/CSS/JS/SVG 文件；
3. **消除 AI 默认设计塑料感**：内置抗俗套美学规范（避免无意义的蓝紫渐变、避免 Inter 字体通吃、避免嵌套卡片）。

---

## 二、Why：为什么选择开源本地化方案

### 1. 痛点：商业闭源设计工具的枷锁
许多商业设计产品（如闭源的 Claude Design 或某些云端订阅服务）需要支付高昂的外部订阅费，且生成物保存在云端封闭平台中，难以直接与本地代码库或离线知识资产无缝集成。

### 2. 核心价值：DeepSeek Harness 原生契合
`open-design` 针对 `DeepSeekHarnessCognitiveRuntime` 进行了第一方插件适配（BYOK 机制），直接复用本地沙箱与环境变量，零数据外泄，生成的设计资产就是项目工作区中的原生文件。

---

## 三、How：核心设计约束与调用契约

### 1. 设计三戒律
- **戒律 1：先立品牌气质，后动笔**。在生成界面前，先确定产品的核心调性（例如：极简工业风 / 活泼手绘风 / 严谨金融感），锁定 3 个核心品牌色与 1 套主字体；
- **戒律 2：呼吸留白优于信息堆积**。段落间距与卡片内边距放大 1.5 倍，宁缺毋滥；
- **戒律 3：单文件自包含（Single Self-contained Artifact）**。导出的原型或页面保证在无网络环境下双击浏览器即可完美运行。

### 2. 核心提示词模具

```markdown
Role: Production-Grade Design Engineer (open-design engine)
Objective: Create a high-fidelity [Landing Page / Dashboard / Slides] for [Product Idea].

Design Guidelines:
1. DESIGN SYSTEM: Define a restrained palette (1 neutral background, 1 text hierarchy, 1 sharp accent).
2. TYPOGRAPHY: Pair a distinctive display font with a clean body font. No generic AI defaults.
3. INTERACTIVITY: Include purposeful micro-interactions (hover states, focus rings, subtle transitions).
4. OUTPUT: Generate a single self-contained HTML file in the project directory, zero external runtime dependency.
```

---

## 四、管家实战借鉴场景

1. **新产品与独立项目 Demo 原型**：主人萌生新的技术构想时，管家在 5 分钟内交付可点击的高保真 HTML 原型；
2. **方案答辩与技术分享 PPT**：一键将 Markdown 知识笔记编译为大厂设计水平的 HTML/PPTX 幻灯片。
