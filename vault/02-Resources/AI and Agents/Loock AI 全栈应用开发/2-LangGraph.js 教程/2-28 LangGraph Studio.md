---
title: "LangGraph Studio — Loock AI 全栈应用开发"
tags: ["loock_ai", "langgraphjs_tutorial", "ai_agent"]
legacy_tags: ["loock_ai", "langgraphjs-tutorial", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/langgraphjs/09-deployment/03-langgraph-studio"
description: "使用官方可视化 IDE 进行即时调试、追踪和状态检查"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/2-LangGraph.js 教程/2-28 LangGraph Studio.md"
source_sha256: "e41841b54ef42f6158a1e18228a69fc5580bb640bb136178382ad439aa2ebfd4"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

部署和平台

# LangGraph Studio

使用官方可视化 IDE 进行即时调试、追踪和状态检查

## [📚 学习目标](#-学习目标)

学完这篇文章后，你将能够：

-   使用 Studio 可视化查看图结构
-   在 Studio 中进行断点调试和修改状态
-   利用 Studio 分析 Token 消耗和性能瓶颈

## [前置知识](#前置知识)

在开始学习之前，建议先阅读：

-   [01-langgraph-platform](./01-langgraph-platform)

* * *

## [1 什么是 Studio?](#1-什么是-studio)

LangGraph Studio 是一个**专用的可视化 IDE**。它不是用来写代码的（代码还是在 VS Code 里写），而是用来**运行和调试** Agent 的。

想象一下 Chrome DevTools Network 面板 + Redux DevTools，但专门为 AI Agent 设计。

它能展示：

-   **实时图结构**：看到哪个节点正在亮起（运行）。
-   **消息流**：右侧聊天窗口实时显示交互。
-   **状态快照**：左侧面板显示每一步的 State 变化。

#\_r\_8\_{margin:1.5rem auto 0;}#\_r\_8\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_8\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_8\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_8\_ .error-icon{fill:#a44141;}#\_r\_8\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_8\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_8\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_8\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_8\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_8\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_8\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_8\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_8\_ .marker.cross{stroke:lightgrey;}#\_r\_8\_ svg{font-family:inherit;font-size:16px;}#\_r\_8\_ p{margin:0;}#\_r\_8\_ .label{font-family:inherit;color:#ccc;}#\_r\_8\_ .cluster-label text{fill:#F9FFFE;}#\_r\_8\_ .cluster-label span{color:#F9FFFE;}#\_r\_8\_ .cluster-label span p{background-color:transparent;}#\_r\_8\_ .label text,#\_r\_8\_ span{fill:#ccc;color:#ccc;}#\_r\_8\_ .node rect,#\_r\_8\_ .node circle,#\_r\_8\_ .node ellipse,#\_r\_8\_ .node polygon,#\_r\_8\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_8\_ .rough-node .label text,#\_r\_8\_ .node .label text,#\_r\_8\_ .image-shape .label,#\_r\_8\_ .icon-shape .label{text-anchor:middle;}#\_r\_8\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_8\_ .rough-node .label,#\_r\_8\_ .node .label,#\_r\_8\_ .image-shape .label,#\_r\_8\_ .icon-shape .label{text-align:center;}#\_r\_8\_ .node.clickable{cursor:pointer;}#\_r\_8\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_8\_ .arrowheadPath{fill:lightgrey;}#\_r\_8\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_8\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_8\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_8\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_8\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_8\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_8\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_8\_ .cluster text{fill:#F9FFFE;}#\_r\_8\_ .cluster span{color:#F9FFFE;}#\_r\_8\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_8\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_8\_ rect.text{fill:none;stroke-width:0;}#\_r\_8\_ .icon-shape,#\_r\_8\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_8\_ .icon-shape p,#\_r\_8\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_8\_ .icon-shape rect,#\_r\_8\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_8\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_8\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_8\_ :root{--mermaid-font-family:inherit;}

LangGraph Studio

图结构可视化

执行追踪/时间线

状态快照/历史

性能与 token

* * *

## [2 如何使用](#2-如何使用)

### [连接模式](#连接模式)

Studio 提供两种主要连接方式：

#### [本地开发模式](#本地开发模式)

在开发过程中，你可以在本地使用 Studio：

1.  **启动 Studio**：运行 `npx langgraph dev` 或使用 VS Code 扩展
2.  **自动连接**：Studio 自动检测本地 LangGraph 应用
3.  **实时调试**：发送测试消息，观察执行过程
4.  **热重载**：代码修改后自动刷新

**本地模式特点**：

-   ✅ 完全离线，无需网络
-   ✅ 快速响应，无延迟
-   ✅ 支持热重载和快速迭代
-   ❌ 只能在本地使用，无法分享

#### [远程调试模式](#远程调试模式)

Studio 也支持连接到已部署的应用进行远程调试：

**远程连接配置**：

远程连接配置

```
// Studio 连接配置
const studioConfig = {
  // 连接到 LangGraph Platform 部署的应用
  endpoint: 'https://your-app.langgraph.app',
  // 认证信息
  apiKey: 'your-api-key',
  // 调试选项
  debugMode: true,
  captureState: true,
  enableBreakpoints: true,
};
```

**使用步骤**：

1.  在 Studio 中输入应用 URL
2.  输入 API Key 进行认证
3.  连接成功后，可以像本地一样调试
4.  所有操作都会同步到生产环境

**远程模式特点**：

-   ✅ 调试生产环境问题
-   ✅ 团队协作（共享调试会话）
-   ✅ 实时观察真实用户交互
-   ❌ 需要稳定的网络连接

* * *

## [3 Studio 核心功能](#3-studio-核心功能)

### [可视化图编辑器](#可视化图编辑器)

Studio 的图编辑器提供了直观的节点和边管理：

#\_r\_a\_{margin:1.5rem auto 0;}#\_r\_a\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_a\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_a\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_a\_ .error-icon{fill:#a44141;}#\_r\_a\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_a\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_a\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_a\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_a\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_a\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_a\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_a\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_a\_ .marker.cross{stroke:lightgrey;}#\_r\_a\_ svg{font-family:inherit;font-size:16px;}#\_r\_a\_ p{margin:0;}#\_r\_a\_ .label{font-family:inherit;color:#ccc;}#\_r\_a\_ .cluster-label text{fill:#F9FFFE;}#\_r\_a\_ .cluster-label span{color:#F9FFFE;}#\_r\_a\_ .cluster-label span p{background-color:transparent;}#\_r\_a\_ .label text,#\_r\_a\_ span{fill:#ccc;color:#ccc;}#\_r\_a\_ .node rect,#\_r\_a\_ .node circle,#\_r\_a\_ .node ellipse,#\_r\_a\_ .node polygon,#\_r\_a\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_a\_ .rough-node .label text,#\_r\_a\_ .node .label text,#\_r\_a\_ .image-shape .label,#\_r\_a\_ .icon-shape .label{text-anchor:middle;}#\_r\_a\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_a\_ .rough-node .label,#\_r\_a\_ .node .label,#\_r\_a\_ .image-shape .label,#\_r\_a\_ .icon-shape .label{text-align:center;}#\_r\_a\_ .node.clickable{cursor:pointer;}#\_r\_a\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_a\_ .arrowheadPath{fill:lightgrey;}#\_r\_a\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_a\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_a\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_a\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_a\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_a\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_a\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_a\_ .cluster text{fill:#F9FFFE;}#\_r\_a\_ .cluster span{color:#F9FFFE;}#\_r\_a\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_a\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_a\_ rect.text{fill:none;stroke-width:0;}#\_r\_a\_ .icon-shape,#\_r\_a\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_a\_ .icon-shape p,#\_r\_a\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_a\_ .icon-shape rect,#\_r\_a\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_a\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_a\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_a\_ :root{--mermaid-font-family:inherit;}

图编辑器

节点管理

边管理

布局优化

拖拽创建节点

批量选择编辑

节点属性配置

自动连接识别

条件边配置

边样式自定义

自动布局算法

手动位置调整

节点对齐工具

**编辑器功能**：

-   **节点拖拽**：拖动节点重新组织图结构
-   **自动连接**：识别节点间的逻辑连接
-   **属性面板**：配置节点参数、描述和标签
-   **实时验证**：检查图的完整性和可达性
-   **缩放导航**：放大缩小查看复杂图结构

### [实时执行追踪](#实时执行追踪)

追踪功能帮助你理解图的执行过程：

节点3节点2节点1LangGraph 图LangGraph Studio用户节点3节点2节点1LangGraph 图LangGraph Studio用户#\_r\_d\_{margin:1.5rem auto 0;}#\_r\_d\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_d\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_d\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_d\_ .error-icon{fill:#a44141;}#\_r\_d\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_d\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_d\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_d\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_d\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_d\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_d\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_d\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_d\_ .marker.cross{stroke:lightgrey;}#\_r\_d\_ svg{font-family:inherit;font-size:16px;}#\_r\_d\_ p{margin:0;}#\_r\_d\_ .actor{stroke:#ccc;fill:#1f2020;}#\_r\_d\_ text.actor>tspan{fill:lightgrey;stroke:none;}#\_r\_d\_ .actor-line{stroke:#ccc;}#\_r\_d\_ .innerArc{stroke-width:1.5;stroke-dasharray:none;}#\_r\_d\_ .messageLine0{stroke-width:1.5;stroke-dasharray:none;stroke:lightgrey;}#\_r\_d\_ .messageLine1{stroke-width:1.5;stroke-dasharray:2,2;stroke:lightgrey;}#\_r\_d\_ #arrowhead path{fill:lightgrey;stroke:lightgrey;}#\_r\_d\_ .sequenceNumber{fill:black;}#\_r\_d\_ #sequencenumber{fill:lightgrey;}#\_r\_d\_ #crosshead path{fill:lightgrey;stroke:lightgrey;}#\_r\_d\_ .messageText{fill:lightgrey;stroke:none;}#\_r\_d\_ .labelBox{stroke:#ccc;fill:#1f2020;}#\_r\_d\_ .labelText,#\_r\_d\_ .labelText>tspan{fill:lightgrey;stroke:none;}#\_r\_d\_ .loopText,#\_r\_d\_ .loopText>tspan{fill:lightgrey;stroke:none;}#\_r\_d\_ .loopLine{stroke-width:2px;stroke-dasharray:2,2;stroke:#ccc;fill:#ccc;}#\_r\_d\_ .note{stroke:hsl(180, 0%, 18.3529411765%);fill:hsl(180, 1.5873015873%, 28.3529411765%);}#\_r\_d\_ .noteText,#\_r\_d\_ .noteText>tspan{fill:rgb(183.8476190475, 181.5523809523, 181.5523809523);stroke:none;}#\_r\_d\_ .activation0{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:#ccc;}#\_r\_d\_ .activation1{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:#ccc;}#\_r\_d\_ .activation2{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:#ccc;}#\_r\_d\_ .actorPopupMenu{position:absolute;}#\_r\_d\_ .actorPopupMenuPanel{position:absolute;fill:#1f2020;box-shadow:0px 8px 16px 0px rgba(0,0,0,0.2);filter:drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4));}#\_r\_d\_ .actor-man line{stroke:#ccc;fill:#1f2020;}#\_r\_d\_ .actor-man circle,#\_r\_d\_ line{stroke:#ccc;fill:#1f2020;stroke-width:2px;}#\_r\_d\_ :root{--mermaid-font-family:inherit;}实时显示每个节点的执行状态触发执行开始执行执行节点1显示节点1激活节点1完成执行节点2显示节点2激活节点2完成执行节点3显示节点3激活节点3完成

**追踪功能**：

-   **执行时间线**：显示每个节点的开始和结束时间
-   **节点状态**：用颜色区分执行中、成功、失败状态
-   **消息流**：右侧面板实时显示节点间的消息传递
-   **步骤导航**：点击任意节点跳转到该时刻的状态

### [状态检查器](#状态检查器)

状态检查器让你深入理解状态变化：

```
interface StateSnapshot {
  timestamp: number;
  messages: BaseMessage[];
  currentStep: string;
  executionPath: string[];
  metadata: Record<string, any>;
}
// Studio 中的状态历史
const stateHistory: StateSnapshot[] = [
  {
    timestamp: Date.now(),
    messages: [],
    currentStep: 'start',
    executionPath: ['start'],
    metadata: {}
  },
  {
    timestamp: Date.now() + 500,
    messages: [{ role: 'assistant', content: 'Hello' }],
    currentStep: 'greeting',
    executionPath: ['start', 'greeting'],
    metadata: { node: 'greeting_node' }
  }
];
```

**状态检查器功能**：

-   **时间导航**：点击历史记录回到任意时间点
-   **状态对比**：并排比较两个状态快照的差异
-   **差异高亮**：自动标记状态变化的部分
-   **导出功能**：导出特定状态用于复现问题

### [性能与 Token 分析](#性能与-token-分析)

Studio 内置的性能分析工具：

#\_r\_h\_{margin:1.5rem auto 0;}#\_r\_h\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_h\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_h\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_h\_ .error-icon{fill:#a44141;}#\_r\_h\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_h\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_h\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_h\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_h\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_h\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_h\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_h\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_h\_ .marker.cross{stroke:lightgrey;}#\_r\_h\_ svg{font-family:inherit;font-size:16px;}#\_r\_h\_ p{margin:0;}#\_r\_h\_ .label{font-family:inherit;color:#ccc;}#\_r\_h\_ .cluster-label text{fill:#F9FFFE;}#\_r\_h\_ .cluster-label span{color:#F9FFFE;}#\_r\_h\_ .cluster-label span p{background-color:transparent;}#\_r\_h\_ .label text,#\_r\_h\_ span{fill:#ccc;color:#ccc;}#\_r\_h\_ .node rect,#\_r\_h\_ .node circle,#\_r\_h\_ .node ellipse,#\_r\_h\_ .node polygon,#\_r\_h\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_h\_ .rough-node .label text,#\_r\_h\_ .node .label text,#\_r\_h\_ .image-shape .label,#\_r\_h\_ .icon-shape .label{text-anchor:middle;}#\_r\_h\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_h\_ .rough-node .label,#\_r\_h\_ .node .label,#\_r\_h\_ .image-shape .label,#\_r\_h\_ .icon-shape .label{text-align:center;}#\_r\_h\_ .node.clickable{cursor:pointer;}#\_r\_h\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_h\_ .arrowheadPath{fill:lightgrey;}#\_r\_h\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_h\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_h\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_h\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_h\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_h\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_h\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_h\_ .cluster text{fill:#F9FFFE;}#\_r\_h\_ .cluster span{color:#F9FFFE;}#\_r\_h\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_h\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_h\_ rect.text{fill:none;stroke-width:0;}#\_r\_h\_ .icon-shape,#\_r\_h\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_h\_ .icon-shape p,#\_r\_h\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_h\_ .icon-shape rect,#\_r\_h\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_h\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_h\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_h\_ :root{--mermaid-font-family:inherit;}

性能分析面板

执行指标

Token 使用

成本估算

瓶颈识别

总体执行时间

节点耗时分布

调用频率统计

总 Token 数

节点级 Token

成本估算

LLM 调用成本

总体项目成本

优化建议

慢节点识别

串行化机会

缓存建议

**性能分析功能**：

-   **执行时间**：显示总体和每个节点的执行时间
-   **Token 监控**：追踪 LLM 调用的 token 消耗
-   **成本估算**：基于 token 数估算运行成本
-   **瓶颈识别**：自动标记执行时间超过阈值的节点
-   **优化建议**：基于数据分析提供性能改进建议

* * *

## [4 调试功能详解](#4-调试功能详解)

### [断点调试](#断点调试)

Studio 支持在图的任意节点设置断点：

断点使用示例

```
// 在代码中设置断点标记
export async function debuggableNode(state: State) {
  // Studio 会在此处暂停执行
  debugger; // 或使用 Studio 的可视化断点
  
  const result = await processLogic(state);
  
  // 可以检查中间结果
  console.log('中间结果:', result);
  
  return { processedData: result };
}
```

**断点功能**：

-   **可视化断点**：在 Studio 界面中直接设置断点
-   **条件断点**：根据状态或消息内容设置断点
-   **单步执行**：一步步执行节点，观察状态变化
-   **变量检查**：在断点处检查节点状态和输入
-   **继续/跳过**：控制执行流程，跳过不需要调试的部分

### [状态时间旅行](#状态时间旅行)

Studio 提供了强大的状态历史功能：

时间旅行配置

```
// Studio 自动收集的状态快照
interface ExecutionSnapshot {
  executionId: string;
  timestamp: number;
  nodeResults: Record<string, any>;
  stateChanges: Array<{
    nodeId: string;
    before: any;
    after: any;
  }>;
}
// 时间旅行功能
class TimeTravelDebugger {
  snapshots: ExecutionSnapshot[] = [];
  
  captureSnapshot(snapshot: ExecutionSnapshot) {
    this.snapshots.push(snapshot);
  }
  
  navigateTo(executionId: string) {
    return this.snapshots.find(s => s.executionId === executionId);
  }
  
  compareSnapshots(id1: string, id2: string) {
    const s1 = this.navigate(id1);
    const s2 = this.navigate(id2);
    
    // Studio 会可视化差异
    return this.diff(s1.stateChanges, s2.stateChanges);
  }
}
```

**时间旅行功能**：

-   **状态快照**：每个执行步骤的完整状态快照
-   **回溯功能**：可以回到任意历史状态
-   **状态对比**：比较不同时间点的状态差异
-   **分支探索**：探索不同的执行路径

### [多代理协作调试](#多代理协作调试)

在多代理系统中，Studio 显示代理间的交互：

#\_r\_m\_{margin:1.5rem auto 0;}#\_r\_m\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_m\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_m\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_m\_ .error-icon{fill:#a44141;}#\_r\_m\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_m\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_m\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_m\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_m\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_m\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_m\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_m\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_m\_ .marker.cross{stroke:lightgrey;}#\_r\_m\_ svg{font-family:inherit;font-size:16px;}#\_r\_m\_ p{margin:0;}#\_r\_m\_ .label{font-family:inherit;color:#ccc;}#\_r\_m\_ .cluster-label text{fill:#F9FFFE;}#\_r\_m\_ .cluster-label span{color:#F9FFFE;}#\_r\_m\_ .cluster-label span p{background-color:transparent;}#\_r\_m\_ .label text,#\_r\_m\_ span{fill:#ccc;color:#ccc;}#\_r\_m\_ .node rect,#\_r\_m\_ .node circle,#\_r\_m\_ .node ellipse,#\_r\_m\_ .node polygon,#\_r\_m\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_m\_ .rough-node .label text,#\_r\_m\_ .node .label text,#\_r\_m\_ .image-shape .label,#\_r\_m\_ .icon-shape .label{text-anchor:middle;}#\_r\_m\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_m\_ .rough-node .label,#\_r\_m\_ .node .label,#\_r\_m\_ .image-shape .label,#\_r\_m\_ .icon-shape .label{text-align:center;}#\_r\_m\_ .node.clickable{cursor:pointer;}#\_r\_m\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_m\_ .arrowheadPath{fill:lightgrey;}#\_r\_m\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_m\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_m\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_m\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_m\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_m\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_m\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_m\_ .cluster text{fill:#F9FFFE;}#\_r\_m\_ .cluster span{color:#F9FFFE;}#\_r\_m\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_m\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_m\_ rect.text{fill:none;stroke-width:0;}#\_r\_m\_ .icon-shape,#\_r\_m\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_m\_ .icon-shape p,#\_r\_m\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_m\_ .icon-shape rect,#\_r\_m\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_m\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_m\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_m\_ :root{--mermaid-font-family:inherit;}

发起任务

传递上下文

返回结果

处理完成

监控交互

监控交互

监控交互

代理A

代理B

代理C

Studio

**多代理调试功能**：

-   **代理间消息传递**：可视化显示代理间的消息流
-   **执行上下文跟踪**：跟踪每个代理的执行上下文
-   **并行执行监控**：观察并行运行的代理
-   **协调问题识别**：发现代理协调中的问题

* * *

## [5 实际使用场景](#5-实际使用场景)

### [场景 1：调试复杂推理链](#场景-1调试复杂推理链)

当代理的推理过程出现问题时，Studio 帮助你：

推理链调试

```
// 问题：代理在多步推理中迷失方向
// 解决方案：使用 Studio 追踪每一步的状态变化
async function complexReasoningNode(state: State) {
  // 步骤 1：分析问题
  const analysis = await analyzeQuery(state.messages);
  
  // 在 Studio 中检查分析结果
  console.log('分析结果:', analysis);
  
  // 步骤 2：制定计划
  const plan = await createPlan(analysis);
  
  // 检查计划是否合理
  console.log('执行计划:', plan);
  
  // 步骤 3：执行计划
  const result = await executePlan(plan);
  
  return { analysis, plan, result };
}
```

**Studio 调试技巧**：

1.  **设置断点**：在关键节点设置断点，观察状态
2.  **查看消息流**：右侧面板实时显示节点间的消息传递
3.  **检查执行路径**：时间线显示完整执行流程
4.  **分析 Token 消耗**：性能面板显示每个节点的 token 使用
5.  **使用时间旅行**：回到问题发生前的状态重新触发

### [场景 2：优化工具调用](#场景-2优化工具调用)

Studio 帮助你理解工具调用的模式和效率：

#\_r\_s\_{margin:1.5rem auto 0;}#\_r\_s\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_s\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_s\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_s\_ .error-icon{fill:#a44141;}#\_r\_s\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_s\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_s\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_s\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_s\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_s\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_s\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_s\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_s\_ .marker.cross{stroke:lightgrey;}#\_r\_s\_ svg{font-family:inherit;font-size:16px;}#\_r\_s\_ p{margin:0;}#\_r\_s\_ .label{font-family:inherit;color:#ccc;}#\_r\_s\_ .cluster-label text{fill:#F9FFFE;}#\_r\_s\_ .cluster-label span{color:#F9FFFE;}#\_r\_s\_ .cluster-label span p{background-color:transparent;}#\_r\_s\_ .label text,#\_r\_s\_ span{fill:#ccc;color:#ccc;}#\_r\_s\_ .node rect,#\_r\_s\_ .node circle,#\_r\_s\_ .node ellipse,#\_r\_s\_ .node polygon,#\_r\_s\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_s\_ .rough-node .label text,#\_r\_s\_ .node .label text,#\_r\_s\_ .image-shape .label,#\_r\_s\_ .icon-shape .label{text-anchor:middle;}#\_r\_s\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_s\_ .rough-node .label,#\_r\_s\_ .node .label,#\_r\_s\_ .image-shape .label,#\_r\_s\_ .icon-shape .label{text-align:center;}#\_r\_s\_ .node.clickable{cursor:pointer;}#\_r\_s\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_s\_ .arrowheadPath{fill:lightgrey;}#\_r\_s\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_s\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_s\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_s\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_s\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_s\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_s\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_s\_ .cluster text{fill:#F9FFFE;}#\_r\_s\_ .cluster span{color:#F9FFFE;}#\_r\_s\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_s\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_s\_ rect.text{fill:none;stroke-width:0;}#\_r\_s\_ .icon-shape,#\_r\_s\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_s\_ .icon-shape p,#\_r\_s\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_s\_ .icon-shape rect,#\_r\_s\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_s\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_s\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_s\_ :root{--mermaid-font-family:inherit;}

是

否

是

否

用户查询

需要工具?

选择工具

直接回答

调用工具

处理结果

需要更多工具?

生成最终回答

返回用户

**优化建议**：

-   **减少不必要的工具调用**：通过状态检查避免重复调用
-   **并行执行**：识别可以并行执行的工具调用
-   **缓存策略**：对重复结果实施缓存
-   **批处理**：批量执行相似的工具调用

### [场景 3：多代理协作调试](#场景-3多代理协作调试)

在多代理系统中，Studio 显示代理间的交互：

多代理调试

```
// 在 Studio 中可以看到代理间的消息传递
interface AgentInteraction {
  fromAgent: string;
  toAgent: string;
  message: BaseMessage;
  timestamp: number;
  context: Record<string, any>;
}
// Studio 会可视化这些交互
const agentFlow = [
  { from: 'supervisor', to: 'researcher', action: 'search_task' },
  { from: 'researcher', to: 'supervisor', action: 'search_results' },
  { from: 'supervisor', to: 'writer', action: 'write_task' },
  { from: 'writer', to: 'supervisor', action: 'draft_content' },
];
```

**调试技巧**：

1.  **监控代理协调**：观察代理间的任务分配和结果返回
2.  **检查消息传递**：确保上下文正确传递
3.  **分析执行顺序**：查看代理执行的顺序是否符合预期
4.  **识别死锁**：发现代理循环等待的情况
5.  **优化协调逻辑**：减少不必要的代理切换

* * *

## [6 最佳实践](#6-最佳实践)

### [调试策略](#调试策略)

调试最佳实践

```
// 1. 添加有意义的日志
export async function wellLoggedNode(state: State) {
  console.log('节点开始执行:', {
    nodeId: 'wellLoggedNode',
    inputState: state,
    timestamp: new Date().toISOString(),
  });
  
  try {
    const result = await processData(state);
    
    console.log('节点执行成功:', {
      nodeId: 'wellLoggedNode',
      result,
      executionTime: Date.now() - startTime,
    });
    
    return result;
  } catch (error) {
    console.error('节点执行失败:', {
      nodeId: 'wellLoggedNode',
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
// 2. 使用结构化的状态
const StructuredState = Annotation.Root({
  // 核心数据
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  
  // 调试信息
  debug: Annotation<{
    currentStep: string;
    executionPath: string[];
    startTime: number;
  }>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({
      currentStep: '',
      executionPath: [],
      startTime: Date.now(),
    }),
  }),
});
```

**调试策略**：

1.  **添加有意义的日志**：记录关键节点和状态变化
2.  **使用结构化的状态**：便于调试工具解析和可视化
3.  **设置断点**：在复杂逻辑处设置断点
4.  **使用时间旅行**：快速回到问题发生前的状态
5.  **分析执行路径**：理解代理的决策过程

### [性能优化指导](#性能优化指导)

Studio 的性能分析帮助你识别瓶颈：

-   **慢节点识别**：找出执行时间最长的节点
-   **Token 使用优化**：监控 LLM 调用的 token 消耗
-   **并行机会发现**：识别可以并行执行的操作
-   **缓存策略**：发现重复计算的机会

**性能优化代码示例**：

```
// 缓存策略
const cache = new Map<string, any>();
export async function cachedNode(state: State) {
  const key = generateCacheKey(state);
  
  if (cache.has(key)) {
    console.log('缓存命中:', key);
    return cache.get(key);
  }
  
  const result = await expensiveOperation(state);
  cache.set(key, result);
  
  console.log('缓存未命中，执行耗时:', result.executionTime);
  return result;
}
```

### [团队协作](#团队协作)

Studio 支持团队协作功能：

-   **会话分享**：分享调试会话给团队成员
-   **状态导出**：导出特定状态用于复现问题
-   **注释功能**：在图上添加注释和说明
-   **版本对比**：比较不同版本的执行差异
-   **权限管理**：控制团队成员对调试会话的访问权限

* * *

## [7 高级功能](#7-高级功能)

### [自定义可视化](#自定义可视化)

Studio 支持自定义节点和边的可视化：

```
interface CustomNodeStyle {
  backgroundColor: string;
  borderColor: string;
  icon: string;
  label: string;
  size: 'small' | 'medium' | 'large';
}
// 自定义节点样式
const customNode: CustomNodeStyle = {
  backgroundColor: '#4CAF50',
  borderColor: '#1B5E20',
  icon: '🤖',
  label: 'Custom Node',
  size: 'medium',
};
```

### [插件系统](#插件系统)

Studio 插件系统允许扩展功能：

-   **自定义面板**：添加新的分析和工具面板
-   **集成外部工具**：连接到外部监控和日志系统
-   **自定义导出**：导出执行数据到自定义格式
-   **自动化测试**：集成自动化测试工具

* * *

## [8 故障排查](#8-故障排查)

### [常见问题](#常见问题)

问题

原因

解决方案

Studio 无法连接本地应用

应用未启动或端口冲突

检查应用是否运行，确认端口配置

远程连接失败

API Key 无效或网络问题

检查 API Key 和网络连接

断点不触发

调试模式未启用

确保在 Studio 中启用调试模式

状态历史缺失

Checkpointer 配置错误

检查持久化配置是否正确

性能数据不准确

图结构过于简单

确保有足够的复杂度以生成有意义的指标

### [调试技巧](#调试技巧)

1.  **查看实时日志**：使用 Studio 查看实时应用日志
2.  **追踪执行流程**：使用时间旅行功能重现问题
3.  **检查依赖状态**：确认数据库、Redis 服务正常运行
4.  **性能分析**：使用内置指标工具分析瓶颈
5.  **版本对比**：比较不同版本的配置和表现

### [本地使用](#本地使用)

如果你安装了 LangGraph CLI 和 Docker：

```
langgraph dev
```

这会启动一个本地服务，并自动打开 Studio 界面（通常在 `http://localhost:2024`）。当你修改代码（VS Code）并保存时，Studio 会自动热重载。

> \[!NOTE\] 如果你跑不起来，最常见的原因是：Docker 没启动、端口被占用、CLI 未安装或 Node 版本不匹配。

### [远程使用](#远程使用)

部署到 LangGraph Cloud 后，每个部署都有一个对应的 Studio 链接。你可以用它来调试线上（或 Staging）环境的 Session。

* * *

## [9 主要界面组件（你会高频用到）](#9-主要界面组件你会高频用到)

你可以把 Studio 拆成 4 个面板来理解：

面板

你用它做什么

常见问题

图结构（Graph）

看节点/边、当前执行到哪

节点命名不清导致读不懂

Trace/时间线

看每一步耗时、工具调用、模型 token 流

不知道哪里慢

State Inspector

看 state 快照、字段变化

reducer 写错导致数据丢失

对话窗口

直接交互与复现问题

输入无法稳定复现

* * *

## [10 最推荐的调试流程（从 0 到定位问题）](#10-最推荐的调试流程从-0-到定位问题)

#\_r\_13\_{margin:1.5rem auto 0;}#\_r\_13\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_13\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_13\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_13\_ .error-icon{fill:#a44141;}#\_r\_13\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_13\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_13\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_13\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_13\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_13\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_13\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_13\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_13\_ .marker.cross{stroke:lightgrey;}#\_r\_13\_ svg{font-family:inherit;font-size:16px;}#\_r\_13\_ p{margin:0;}#\_r\_13\_ .label{font-family:inherit;color:#ccc;}#\_r\_13\_ .cluster-label text{fill:#F9FFFE;}#\_r\_13\_ .cluster-label span{color:#F9FFFE;}#\_r\_13\_ .cluster-label span p{background-color:transparent;}#\_r\_13\_ .label text,#\_r\_13\_ span{fill:#ccc;color:#ccc;}#\_r\_13\_ .node rect,#\_r\_13\_ .node circle,#\_r\_13\_ .node ellipse,#\_r\_13\_ .node polygon,#\_r\_13\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_13\_ .rough-node .label text,#\_r\_13\_ .node .label text,#\_r\_13\_ .image-shape .label,#\_r\_13\_ .icon-shape .label{text-anchor:middle;}#\_r\_13\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_13\_ .rough-node .label,#\_r\_13\_ .node .label,#\_r\_13\_ .image-shape .label,#\_r\_13\_ .icon-shape .label{text-align:center;}#\_r\_13\_ .node.clickable{cursor:pointer;}#\_r\_13\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_13\_ .arrowheadPath{fill:lightgrey;}#\_r\_13\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_13\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_13\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_13\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_13\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_13\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_13\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_13\_ .cluster text{fill:#F9FFFE;}#\_r\_13\_ .cluster span{color:#F9FFFE;}#\_r\_13\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_13\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_13\_ rect.text{fill:none;stroke-width:0;}#\_r\_13\_ .icon-shape,#\_r\_13\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_13\_ .icon-shape p,#\_r\_13\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_13\_ .icon-shape rect,#\_r\_13\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_13\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_13\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_13\_ :root{--mermaid-font-family:inherit;}

复现问题输入

在 Studio 里运行

看 Trace 找慢点/错误点

看 State 确认字段变化

修改节点/路由/reducer

关键点：你要学会把“感性的坏体验”转成“可观测的指标”，例如：

-   哪个节点耗时最高
-   工具调用花了多少时间
-   messages 是否膨胀导致模型输入变长

* * *

## [11 核心功能](#11-核心功能)

### [可视化追踪 (Visual Trace)](#可视化追踪-visual-trace)

不用再盯着 `console.log` 看了。Studio 会把每一步（Token 生成、工具调用、HTTP 请求）画在时间轴上。

### [交互修改 (Interactive Editing)](#交互修改-interactive-editing)

你可以：

1.  运行到一半暂停（比如在 `human-in-the-loop` 断点）。
2.  在 Studio 界面修改 State（比如改掉 LLM 生成的一句话）。
3.  点击 "Continue"，Agent 会带着你修改后的状态继续跑。

这是调试 Prompt 和逻辑的神器。

* * *

## [12 线上调试建议（不踩坑版）](#12-线上调试建议不踩坑版)

1.  **先有 thread\_id**：线上调试必须能复现同一个会话。
2.  **别把敏感信息写进 state**：Studio/追踪可能会记录状态。
3.  **把工具超时当成常态**：工具调用慢/失败是最常见故障源。
4.  **优先看 reducer**：并行/多节点写同字段时，最容易丢数据。

* * *

## [13 常见排障清单](#13-常见排障清单)

1.  **看不到图结构**：检查应用是否真的启动、是否导出了 graph/entry。
2.  **状态不更新**：确认你的节点返回的是“增量更新”，且 reducer 没写错。
3.  **无法时间旅行/恢复**：确认编译时传入了 `checkpointer`，并且每次调用都带 `thread_id`。
4.  **工具调用卡死**：给工具加超时，或者在 Studio 的 trace 里定位是哪一步耗时。

* * *

## [14 一个实用练习：定位“为什么它一直在调用工具”](#14-一个实用练习定位为什么它一直在调用工具)

如果你的 ReAct agent 陷入循环（不停调用 tools），Studio 常用定位方式：

1.  在 Trace 里看最后一次 `tools` 的输入输出
2.  在 State Inspector 里看 messages 最后一条是否包含 tool\_calls
3.  回到 agent 节点：检查 System Prompt 是否让模型“必须调用工具”
4.  加 `recursionLimit` 做硬上限（避免线上失控）

* * *

## [💡 练习题](#-练习题)

1.  **操作题**：如果在本地跑不起来 Docker，尝试访问 LangGraph 官网的 Demo Studio，体验一下可视化调试流程。尝试找到 "Thread History" 面板。
    
    点击查看答案
    
    进入 Demo Studio 后先运行一次示例线程，再切到左侧/顶部的线程列表即可看到 `Thread History`。 重点观察每一步的状态快照和事件顺序，理解“同一线程如何逐步演化”。
    

* * *

## [✅ 总结](#-总结)

**本章要点**：

-   **Studio** 是 Agent 开发者的 "IDE"。
-   **Local Dev**：`langgraph dev` 提供了极致的开发体验。
-   **Debugging**：可视化追踪比日志更直观。

**恭喜！** 你已经了解了部署相关的所有知识。

## 相关笔记

- [[4-9 Agent 的记忆系统]]
- [[3-1 Function Calling 与 Structured Output]]
- [[2-3 Agent Loop 保险丝]]
- [[3-6 生产级权限系统的四层防线]]
- [[1-8 人机交互|人机交互（参见 Loock AI 1-8）]]
- [[4-4 Cache 全解与成本控制]]
