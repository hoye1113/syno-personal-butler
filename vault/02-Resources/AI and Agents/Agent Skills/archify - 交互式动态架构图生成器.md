---
title: archify - 交互式动态架构图生成器
tags:
  - Skill/Engineering
  - Architecture
  - Visualization
  - SystemDesign
date: 2026-10-11
status: canonical
category: Agent Skills
source_url: https://github.com/tt-a1i/archify
summary: 将复杂代码库、系统架构或调用链路一键转换为美观的高保真交互式架构图，告别 Mermaid 混乱排版，支持缩放折叠与独立 HTML/SVG 导出。
---

# archify — 交互式动态架构图生成器

> **核心哲学**：*“一图胜千言，但前提是图本身必须可呼吸、可交互。拒绝混乱拥挤的传统图表，把系统架构变成可以探索的动态沙盘。”*



---

## 一、What：它能做什么

`archify` 是一个为 AI 编码助手量身打造的**系统架构高保真可视化工具**。它打破了传统纯静态图表的局限，能将任何复杂的系统拓扑、模块依赖关系或 API 数据流，直接编译为单文件动态 Web 组件：

1. **多层级拓扑穿透**：支持架构节点的展开与收起（如从“全局宏观服务”下钻到“具体模块方法”）；
2. **交互式路径高亮**：点击任意节点或请求事件，自动高亮其全链路上下游调用路径（Trace Highlighting）；
3. **报刊级视觉排版**：无杂乱阴影，无默认粗糙连线，采用专业系统架构刊物级别的网格与字体对齐；
4. **单文件自包含交付**：输出为 100% 离线可用的 HTML 页面或矢量 SVG，双击即开，无需任何外部服务器支持。

---

## 二、Why：为什么它能解决痛点

### 1. 痛点：传统图表工具在复杂系统下的崩溃
在向 AI 询问复杂项目架构时，常用的 Mermaid 图表在节点超过 15 个后，连线交叉错乱、文字重叠严重，彻底失去可读性；而 PlantUML 风格陈旧、排版死板，缺乏现代 Web 沉浸感。

### 2. 核心价值：探索式架构学习
优秀的架构图不仅是“展示完成的设计”，更是“帮助人类理解系统的交互载体”。通过可缩放、可高亮链路的动态图表，技术负责人和新成员可以在 3 分钟内摸清数十个模块的耦合边界。

---

## 三、How：工作流与核心提示词模具

### 1. 执行工作流
1. **静态扫描与依赖提取**：读取目标目录的入口文件、包清单（`package.json` / `Cargo.toml`）与核心类调用；
2. **抽象分层（Layering）**：划分为 3-4 个逻辑层（如：接入层 / 控制面 / 领域核心 / 持久层）；
3. **生成独立单文件**：输出自包含 HTML，内联轻量级 SVG/Canvas 渲染器与交互脚本。

### 2. 核心提示词模具

```markdown
Analyze the codebase structure and produce an interactive architecture diagram using Archify conventions:

1. COMPONENT DECOMPOSITION: Identify core modules, boundary adapters, and data stores. Group by architectural layer.
2. CONNECTION SEMANTICS: Every edge must represent a concrete invocation or event stream (labeled with protocol/method).
3. INTERACTIVITY: Generate a standalone HTML artifact where clicking any node highlights its upstream and downstream callers.
4. CLEAN AESTHETICS: No messy crossed lines; use generous grid gutters; color-code by responsibility.
```

---

## 四、管家实战借鉴场景

1. **复杂代码库全景梳理**：管家在接手外部新开源项目或重构大模块时，先输出一张全局交互架构图供主人审阅；
2. **方案设计与技术汇报**：撰写技术方案或 ADR 时，替代静态 ASCII 图，附带一份自包含的交互动态架构 HTML。
