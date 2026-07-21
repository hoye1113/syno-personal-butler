---
title: "LangGraph Platform — Loock AI 全栈应用开发"
tags: ["loock_ai", "langgraphjs_tutorial", "ai_agent"]
legacy_tags: ["loock_ai", "langgraphjs-tutorial", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/langgraphjs/09-deployment/01-langgraph-platform"
description: "了解 LangGraph 的生产级部署平台：架构、核心组件与部署选项"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/2-LangGraph.js 教程/2-26 LangGraph Platform.md"
source_sha256: "374e462583b5f3a20e54e7fb42d566e830fd5cdf58ac68ffd0c67cb8af15cefa"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

部署和平台

# LangGraph Platform

了解 LangGraph 的生产级部署平台：架构、核心组件与部署选项

## [📚 学习目标](#-学习目标)

学完这篇文章后，你将能够：

-   理解 LangGraph Platform 的核心价值与架构
-   区分四种不同的部署选项（SaaS vs Self-Hosted）
-   掌握从本地开发到生产部署的完整流程

## [前置知识](#前置知识)

在开始学习之前，建议先阅读：

-   [01-introduction](../01-introduction/01-ai-apps-and-langgraphjs)

* * *

## [1 什么是 LangGraph Platform?](#1-什么是-langgraph-platform)

你已经在本地跑通了 Agent，现在如何上线？自己搭建服务器（FastAPI/Express）处理流式、持久化、并发、重试是一件非常痛苦的事。

**LangGraph Platform** 是官方提供的基础设施，专门用于托管 LangGraph 应用。它为你解决了：

-   **自动持久化**：内置 Postgres Checkpointer。
-   **任务队列**：处理高并发请求。
-   **流式 API**：开箱即用的 SSE/Streaming 支持。
-   **后台任务**：支持长时间运行的任务。

对于前端开发者，它就像是 **Vercel 之于 Next.js**。

换句话说：

-   你只关心“graph 怎么写”，平台帮你解决“怎么跑得稳、跑得久、跑得快”。

* * *

## [2 我真的需要 Platform 吗？（先做判断）](#2-我真的需要-platform-吗先做判断)

✅ 你更可能需要 Platform：

-   你的应用需要 **持久化**（thread\_id 会话、时间旅行、HITL）
-   你需要 **并发与队列**（高 QPS、长任务）
-   你需要 **可观测性**（追踪每次运行、定位哪一步慢）

❌ 你可能暂时不需要：

-   只是一个本地 demo
-   只做一次性脚本（跑完就退出）

一个简单决策树：

#\_r\_1\_{margin:1.5rem auto 0;}#\_r\_1\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_1\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_1\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_1\_ .error-icon{fill:#a44141;}#\_r\_1\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_1\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_1\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_1\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_1\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_1\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_1\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_1\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_1\_ .marker.cross{stroke:lightgrey;}#\_r\_1\_ svg{font-family:inherit;font-size:16px;}#\_r\_1\_ p{margin:0;}#\_r\_1\_ .label{font-family:inherit;color:#ccc;}#\_r\_1\_ .cluster-label text{fill:#F9FFFE;}#\_r\_1\_ .cluster-label span{color:#F9FFFE;}#\_r\_1\_ .cluster-label span p{background-color:transparent;}#\_r\_1\_ .label text,#\_r\_1\_ span{fill:#ccc;color:#ccc;}#\_r\_1\_ .node rect,#\_r\_1\_ .node circle,#\_r\_1\_ .node ellipse,#\_r\_1\_ .node polygon,#\_r\_1\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_1\_ .rough-node .label text,#\_r\_1\_ .node .label text,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-anchor:middle;}#\_r\_1\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_1\_ .rough-node .label,#\_r\_1\_ .node .label,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-align:center;}#\_r\_1\_ .node.clickable{cursor:pointer;}#\_r\_1\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_1\_ .arrowheadPath{fill:lightgrey;}#\_r\_1\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_1\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_1\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_1\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_1\_ .cluster text{fill:#F9FFFE;}#\_r\_1\_ .cluster span{color:#F9FFFE;}#\_r\_1\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_1\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_1\_ rect.text{fill:none;stroke-width:0;}#\_r\_1\_ .icon-shape,#\_r\_1\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .icon-shape p,#\_r\_1\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_1\_ .icon-shape rect,#\_r\_1\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_1\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_1\_ :root{--mermaid-font-family:inherit;}

是

否

是

否

我要部署 LangGraph 应用

需要持久化/历史/恢复?

优先用 Platform

并发/长任务/队列?

先用自建服务即可

* * *

## [3 核心组件](#3-核心组件)

#\_r\_2\_{margin:1.5rem auto 0;}#\_r\_2\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_2\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_2\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_2\_ .error-icon{fill:#a44141;}#\_r\_2\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_2\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_2\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_2\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_2\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_2\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_2\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_2\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_2\_ .marker.cross{stroke:lightgrey;}#\_r\_2\_ svg{font-family:inherit;font-size:16px;}#\_r\_2\_ p{margin:0;}#\_r\_2\_ .label{font-family:inherit;color:#ccc;}#\_r\_2\_ .cluster-label text{fill:#F9FFFE;}#\_r\_2\_ .cluster-label span{color:#F9FFFE;}#\_r\_2\_ .cluster-label span p{background-color:transparent;}#\_r\_2\_ .label text,#\_r\_2\_ span{fill:#ccc;color:#ccc;}#\_r\_2\_ .node rect,#\_r\_2\_ .node circle,#\_r\_2\_ .node ellipse,#\_r\_2\_ .node polygon,#\_r\_2\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_2\_ .rough-node .label text,#\_r\_2\_ .node .label text,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-anchor:middle;}#\_r\_2\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_2\_ .rough-node .label,#\_r\_2\_ .node .label,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-align:center;}#\_r\_2\_ .node.clickable{cursor:pointer;}#\_r\_2\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_2\_ .arrowheadPath{fill:lightgrey;}#\_r\_2\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_2\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_2\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_2\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_2\_ .cluster text{fill:#F9FFFE;}#\_r\_2\_ .cluster span{color:#F9FFFE;}#\_r\_2\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_2\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_2\_ rect.text{fill:none;stroke-width:0;}#\_r\_2\_ .icon-shape,#\_r\_2\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .icon-shape p,#\_r\_2\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_2\_ .icon-shape rect,#\_r\_2\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_2\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_2\_ :root{--mermaid-font-family:inherit;}

开发者

LangGraph Server

可扩展 API

LangGraph Studio

Database / Checkpointer

-   **LangGraph Server**: 定义了 API 标准。
-   **LangGraph Studio**: 生产环境的可视化调试台。
-   **LangGraph CLI**: 命令行部署工具。

如果你把它类比成 Web 架构：

-   Server：你的运行时
-   Studio：你的 DevTools
-   CLI：你的部署工具链

* * *

## [4 部署选项](#4-部署选项)

LangGraph Platform 提供四种主要的部署选项，每种都适合不同的使用场景：

### [部署选项对比总览](#部署选项对比总览)

#\_r\_7\_{margin:1.5rem auto 0;}#\_r\_7\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_7\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_7\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_7\_ .error-icon{fill:#a44141;}#\_r\_7\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_7\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_7\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_7\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_7\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_7\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_7\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_7\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_7\_ .marker.cross{stroke:lightgrey;}#\_r\_7\_ svg{font-family:inherit;font-size:16px;}#\_r\_7\_ p{margin:0;}#\_r\_7\_ .label{font-family:inherit;color:#ccc;}#\_r\_7\_ .cluster-label text{fill:#F9FFFE;}#\_r\_7\_ .cluster-label span{color:#F9FFFE;}#\_r\_7\_ .cluster-label span p{background-color:transparent;}#\_r\_7\_ .label text,#\_r\_7\_ span{fill:#ccc;color:#ccc;}#\_r\_7\_ .node rect,#\_r\_7\_ .node circle,#\_r\_7\_ .node ellipse,#\_r\_7\_ .node polygon,#\_r\_7\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_7\_ .rough-node .label text,#\_r\_7\_ .node .label text,#\_r\_7\_ .image-shape .label,#\_r\_7\_ .icon-shape .label{text-anchor:middle;}#\_r\_7\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_7\_ .rough-node .label,#\_r\_7\_ .node .label,#\_r\_7\_ .image-shape .label,#\_r\_7\_ .icon-shape .label{text-align:center;}#\_r\_7\_ .node.clickable{cursor:pointer;}#\_r\_7\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_7\_ .arrowheadPath{fill:lightgrey;}#\_r\_7\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_7\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_7\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_7\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_7\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_7\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_7\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_7\_ .cluster text{fill:#F9FFFE;}#\_r\_7\_ .cluster span{color:#F9FFFE;}#\_r\_7\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_7\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_7\_ rect.text{fill:none;stroke-width:0;}#\_r\_7\_ .icon-shape,#\_r\_7\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_7\_ .icon-shape p,#\_r\_7\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_7\_ .icon-shape rect,#\_r\_7\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_7\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_7\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_7\_ :root{--mermaid-font-family:inherit;}

选择部署方式

Self-Hosted Lite

Self-Hosted Enterprise

Cloud SaaS

Bring Your Own Cloud

✅ 免费使用  
✅ 本地控制  
❌ 功能限制  
❌ 自行运维

✅ 完整功能  
✅ 本地控制  
❌ 需要企业版  
❌ 自行运维

✅ 托管服务  
✅ 零运维  
❌ 需要付费计划  
❌ 数据在云端

✅ 托管服务  
✅ 数据隔离  
❌ 仅限企业版  
❌ 仅支持 AWS

### [1\. Self-Hosted Lite（自托管轻量版）](#1-self-hosted-lite自托管轻量版)

**适用场景**：学习、原型开发、小型项目

**特点**：

-   ✅ 免费使用（每月 100 万节点执行额度）
-   ✅ 完全本地控制
-   ✅ 适合学习和实验

**限制**：

-   ❌ 功能受限（无高级特性）
-   ❌ 需要自行管理基础设施（服务器、Redis、PostgreSQL）
-   ❌ 需要运维监控和备份

**何时选择**：

-   还在学习 LangGraph 的基础概念
-   开发个人工具或 side project
-   对数据隐私要求不高
-   预算有限（不想付费）

### [2\. Self-Hosted Enterprise（自托管企业版）](#2-self-hosted-enterprise自托管企业版)

**适用场景**：大型企业、对数据安全有严格要求、需要完全控制

**特点**：

-   ✅ 完整功能（所有平台特性）
-   ✅ 完全本地控制（数据不出机房）
-   ✅ 可定制化部署配置
-   ✅ 支持高并发和大规模部署

**要求**：

-   ❌ 企业版订阅（付费）
-   ❌ 需要自行管理数据库和 Redis
-   ❌ 需要团队负责运维

**何时选择**：

-   对数据安全有严格合规要求（金融、医疗）
-   需要完全控制基础设施
-   有专业运维团队
-   预算充足

### [3\. Cloud SaaS（云托管服务）](#3-cloud-saas云托管服务)

**适用场景**：快速上线、专注业务逻辑、不想管理服务器

**特点**：

-   ✅ 官方托管，零运维
-   ✅ 与 GitHub 集成，一键部署
-   ✅ 自动扩展和负载均衡
-   ✅ 内置监控和日志

**要求**：

-   ❌ 需要 Plus 或 Enterprise 付费计划
-   ❌ 数据存储在 LangChain 官方云服务

**何时选择**：

-   创业公司或小团队
-   需要快速上线（MVP 阶段）
-   对数据驻留要求不高
-   没有专业运维团队

### [4\. Bring Your Own Cloud（专属云部署）](#4-bring-your-own-cloud专属云部署)

**适用场景**：企业级、需要数据隔离但不想自行运维、有合规要求

**特点**：

-   ✅ 托管服务（由 LangChain 管理）
-   ✅ 数据隔离（在你的 AWS 环境运行）
-   ✅ 零运维负担

**要求**：

-   ❌ 仅限企业版订阅
-   ❌ 目前只支持 AWS（未来可能扩展到 GCP、Azure）

**何时选择**：

-   对数据安全有合规要求但不想自行运维
-   已有 AWS 基础设施
-   需要云厂商审计和认证

* * *

## [简单部署 vs 平台部署](#简单部署-vs-平台部署)

### [适用场景对比](#适用场景对比)

特性

简单部署

平台部署

**开发体验**

需要自己配置一切

开箱即用，专注业务

**持久化**

需要自己实现 Checkpointer

内置 Postgres Checkpointer

**任务队列**

需要自己实现

内置任务队列

**流式支持**

需要自己实现 SSE

开箱即用的流式 API

**长时间运行**

需要处理超时和重试

自动管理任务生命周期

**可观测性**

需要自己添加日志和监控

内置追踪和指标

**人机交互**

需要自己实现中断/恢复

原生支持

**部署复杂度**

高（需配置服务器、DB、Redis）

低（配置 langgraph.json 即可）

**运维成本**

高（需持续监控）

低（官方托管理）

**上手速度**

慢（配置时间）

��（一键部署）

### [简单部署方式](#简单部署方式)

对于基础应用，你可以使用自定义服务器逻辑。这种方式的流程：

1.  **实现 LangGraph 图**：定义节点和边
2.  **包装 HTTP 服务**：使用 Express/FastAPI 提供 API
3.  **处理持久化**：自己实现 Checkpointer（Postgres）
4.  **实现任务队列**：自己实现并发控制
5.  **处理流式响应**：自己实现 SSE
6.  **部署到服务器**：Docker 或云服务

**示例场景**：

-   单一助手应用（无需持久化）
-   短期任务（一次性脚本）
-   内部工具（不对外暴露）

**何时选择简单部署**：

-   需要完全控制服务器配置
-   对延迟有严格要求
-   需要定制化的基础设施
-   不需要平台提供的功能

### [平台部署的优势](#平台部署的优势)

当应用变得复杂时，LangGraph Platform 解决了许多挑战：

#### [平台解决的核心问题](#平台解决的核心问题)

-   **流式支持**：多种流式模式，优化用户体验
-   **后台运行**：支持长时间运行的任务
-   **长时间运行支持**：防止超时和连接中断
-   **突发流量处理**：任务队列确保请求不丢失
-   **双重发送处理**：智能处理用户的快速连续消息
-   **检查点和内存管理**：优化的状态持久化
-   **人机交互支持**：专用的人工干预端点

#### [开发到部署工作流](#开发到部署工作流)

生产环境LangGraph PlatformLangGraph Studio本地环境开发者生产环境LangGraph PlatformLangGraph Studio本地环境开发者#\_r\_b\_{margin:1.5rem auto 0;}#\_r\_b\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_b\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_b\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_b\_ .error-icon{fill:#a44141;}#\_r\_b\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_b\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_b\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_b\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_b\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_b\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_b\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_b\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_b\_ .marker.cross{stroke:lightgrey;}#\_r\_b\_ svg{font-family:inherit;font-size:16px;}#\_r\_b\_ p{margin:0;}#\_r\_b\_ .actor{stroke:#ccc;fill:#1f2020;}#\_r\_b\_ text.actor>tspan{fill:lightgrey;stroke:none;}#\_r\_b\_ .actor-line{stroke:#ccc;}#\_r\_b\_ .innerArc{stroke-width:1.5;stroke-dasharray:none;}#\_r\_b\_ .messageLine0{stroke-width:1.5;stroke-dasharray:none;stroke:lightgrey;}#\_r\_b\_ .messageLine1{stroke-width:1.5;stroke-dasharray:2,2;stroke:lightgrey;}#\_r\_b\_ #arrowhead path{fill:lightgrey;stroke:lightgrey;}#\_r\_b\_ .sequenceNumber{fill:black;}#\_r\_b\_ #sequencenumber{fill:lightgrey;}#\_r\_b\_ #crosshead path{fill:lightgrey;stroke:lightgrey;}#\_r\_b\_ .messageText{fill:lightgrey;stroke:none;}#\_r\_b\_ .labelBox{stroke:#ccc;fill:#1f2020;}#\_r\_b\_ .labelText,#\_r\_b\_ .labelText>tspan{fill:lightgrey;stroke:none;}#\_r\_b\_ .loopText,#\_r\_b\_ .loopText>tspan{fill:lightgrey;stroke:none;}#\_r\_b\_ .loopLine{stroke-width:2px;stroke-dasharray:2,2;stroke:#ccc;fill:#ccc;}#\_r\_b\_ .note{stroke:hsl(180, 0%, 18.3529411765%);fill:hsl(180, 1.5873015873%, 28.3529411765%);}#\_r\_b\_ .noteText,#\_r\_b\_ .noteText>tspan{fill:rgb(183.8476190475, 181.5523809523, 181.5523809523);stroke:none;}#\_r\_b\_ .activation0{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:#ccc;}#\_r\_b\_ .activation1{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:#ccc;}#\_r\_b\_ .activation2{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:#ccc;}#\_r\_b\_ .actorPopupMenu{position:absolute;}#\_r\_b\_ .actorPopupMenuPanel{position:absolute;fill:#1f2020;box-shadow:0px 8px 16px 0px rgba(0,0,0,0.2);filter:drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4));}#\_r\_b\_ .actor-man line{stroke:#ccc;fill:#1f2020;}#\_r\_b\_ .actor-man circle,#\_r\_b\_ line{stroke:#ccc;fill:#1f2020;stroke-width:2px;}#\_r\_b\_ :root{--mermaid-font-family:inherit;}持续迭代和优化编写 LangGraph 应用可视化调试实时反馈创建 langgraph.json部署到平台自动构建和部署部署状态反馈连接生产环境调试

**工作流说明**：

1.  **本地开发**：在本地编写图逻辑，使用 Studio 调试
2.  **配置准备**：创建 `langgraph.json` 配置文件
3.  **平台部署**：推送到平台，自动构建和部署
4.  **生产验证**：连接到生产环境，用 Studio 调试
5.  **持续优化**：根据生产数据迭代优化

* * *

## [5 配置文件 (langgraph.json)](#5-配置文件-langgraphjson)

要部署应用，你需要在根目录创建一个 `langgraph.json`。

```
{
  "dependencies": ["."],
  "graphs": {
    "my-agent": "./src/agent.ts:graph"
  },
  "env": "./.env"
}
```

-   **dependencies**: 依赖项。
-   **graphs**: 导出 Graph 的路径。格式为 `文件路径:导出变量名`。

### [多图部署（chat + rag）示例](#多图部署chat--rag示例)

```
{
  "dependencies": ["."],
  "graphs": {
    "chat": "./src/graphs/chat.ts:graph",
    "rag": "./src/graphs/rag.ts:graph"
  },
  "env": "./.env"
}
```

> \[!TIP\] `graphs` 的 key 会成为"对外暴露的图名称"。建议用语义化名称（chat/rag/codegen），不要用临时名。

* * *

## [6 环境配置](#6-环境配置)

### [`.env` 环境变量](#env-环境变量)

```
# LangGraph Server 配置
LANGGRAPH_API_KEY=your_api_key_here
LANGGRAPH_ENV=production
# 数据库配置
POSTGRES_URI=postgresql://user:password@localhost:5432/langgraph
REDIS_URI=redis://localhost:6379
# 应用配置
NODE_ENV=production
PORT=8080
# 监控和日志
LOG_LEVEL=info
METRICS_ENABLED=true
```

### [Docker 部署配置](#docker-部署配置)

#### [Dockerfile 示例](#dockerfile-示例)

```
# Dockerfile
FROM node:18-alpine
WORKDIR /app
# 依赖文件
COPY package*.json ./
RUN npm ci --only=production
# 应用代码
COPY . .
# 构建应用
RUN npm run build
# 暴露端口
EXPOSE 8080
# 启动应用
CMD ["npm", "start"]
```

#### [Docker Compose 配置](#docker-compose-配置)

```
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - POSTGRES_URI=postgresql://user:password@postgres:5432/langgraph
      - REDIS_URI=redis://redis:6379
    restart: unless-stopped
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=langgraph
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
volumes:
  postgres_data:
```

**Docker Compose 使用说明**：

1.  创建 `docker-compose.yml` 文件
2.  运行 `docker-compose up -d` 启动所有服务
3.  运行 `docker-compose logs app` 查看应用日志
4.  运行 `docker-compose down` 停止所有服务

### [部署命令参考](#部署命令参考)

#### [使用 LangGraph CLI 部署](#使用-langgraph-cli-部署)

```
# 安装 LangGraph CLI
npm install -g @langchain/langgraph-cli
# 登录到平台
langgraph login
# 部署应用
langgraph deploy
# 查看部署状态
langgraph status
# 查看应用日志
langgraph logs
# 回滚到上一个版本
langgraph rollback
```

#### [GitHub 集成部署](#github-集成部署)

如果你使用 Cloud SaaS 或 BYOC，可以通过 GitHub 集成自动部署：

1.  在 GitHub 仓库中添加 `langgraph.json`
2.  在 LangGraph Platform 控制台连接你的 GitHub 仓库
3.  推送代码到 GitHub main 分支
4.  平台自动检测变化并触发部署

* * *

## [7 迁移指南](#7-迁移指南)

### [选择合适的部署方式](#选择合适的部署方式)

部署决策检查

```
// 评估当前应用复杂度
const needsPlatform = {
  hasLongRunningTasks: true,      // 需要后台任务
  requiresStreaming: true,        // 需要流式输出
  hasMemoryRequirements: true,    // 需要持久化
  expectsHighTraffic: true,       // 预期高流量
  needsHumanInLoop: true         // 需要人工干预
};
// 准备迁移
if (Object.values(needsPlatform).some(Boolean)) {
  console.log('建议使用 LangGraph Platform');
}
```

**决策树**：

场景

推荐选项

原因

学习/原型

Self-Hosted Lite

免费、无需配置

快速 MVP

Cloud SaaS

快速上线、零运维

中小生产

Self-Hosted Enterprise

成本可控、完全控制

大企业合规

BYOC

数据隔离、专业托管理

高 QPS 应用

Platform 任意选项

内置任务队列

### [迁移步骤](#迁移步骤)

**步骤 1：评估现有架构**

-   列出当前使用的所有外部依赖（数据库、缓存、队列）
-   评估持久化需求（是否需要 thread\_id、时间旅行）
-   评估流量模式（QPS、并发数）
-   评估特殊功能需求（人机交互、流式输出）

**步骤 2：准备迁移**

-   导出当前配置（环境变量、依赖关系）
-   备份现有数据（如果有）
-   创建 `langgraph.json` 配置文件
-   准备 GitHub 仓库（如果使用 Cloud SaaS/BYOC）

**步骤 3：部署到平台**

-   使用 CLI 或 GitHub 集成部署
-   在 Studio 中连接到新环境
-   运行基本功能测试
-   监控部署状态和日志

**步骤 4：验证和优化**

-   使用 Studio 调试生产环境问题
-   监控性能指标（响应时间、错误率）
-   根据生产数据调整配置
-   准备回滚计划（如果需要）

### [常见迁移问题](#常见迁移问题)

问题

原因

解决方案

数据库连接失败

环境变量未正确配置

检查 `.env` 文件中的连接字符串

任务队列不工作

Redis 未启动或配置错误

确保 Redis 服务运行且可访问

流式输出中断

SSE 端口被防火墙阻止

开放 8080 端口或配置反向代理

权限错误

GitHub 仓库权限不足

确保 Platform 应用有仓库写入权限

版本冲突

graph 文件导出格式不兼容

使用 `:graph` 后缀并检查导出变量名

* * *

## [8 实践建议](#8-实践建议)

### [开发流程优化](#开发流程优化)

**最佳实践**：

1.  **本地充分测试**：在本地使用 Studio 调试所有功能
2.  **渐进式部署**：先部署到 Cloud SaaS（快速回滚），再迁移到 BYOC
3.  **监控优先**：在生产环境立即启用日志和监控
4.  **文档完善**：维护清晰的部署文档和变更日志
5.  **自动化测试**：为关键功能编写自动化测试

### [性能优化](#性能优化)

```
// 性能监控示例
import { metrics } from '@langchain/langgraph';
// 监控关键指标
metrics.track('node_execution_time', (duration) => {
  if (duration > 5000) {
    console.warn(`Slow node: ${duration}ms`);
  }
});
metrics.track('graph_invocation_count', (count) => {
  console.log(`Invocations today: ${count}`);
});
// 设置性能阈值
const PERFORMANCE_THRESHOLDS = {
  nodeExecution: 5000,    // 5 秒
  graphInvocations: 10000,  // 每天 10000 次调用
  errorRate: 0.05,         // 5% 错误率
};
// 警告配置
if (metrics.errorRate > PERFORMANCE_THRESHOLDS.errorRate) {
  alert('High error rate detected!');
}
```

### [安全建议](#安全建议)

-   **API Key 保护**：不要将 API Key 提交到版本控制
-   **环境变量管理**：使用 `.env` 文件或密钥管理服务
-   **网络安全**：配置 CORS 策略和速率限制
-   **数据备份**：定期备份生产数据库
-   **访问控制**：为 Studio 配置访问令牌和 IP 白名单

* * *

## [9 故障排查](#9-故障排查)

### [常见问题](#常见问题)

问题

原因

解决方案

部署失败

langgraph.json 格式错误

使用 `langgraph validate` 命令检查配置

无法访问

网络策略限制

检查防火墙和安全组配置

应用崩溃

依赖版本不兼容

检查 `package.json` 中的依赖版本

性能缓慢

缺少索引或配置不当

优化数据库查询，调整连接池

权限错误

API Key 无效或过期

重新生成并更新 API Key

### [调试技巧](#调试技巧)

1.  **查看实时日志**：使用 Studio 查看实时应用日志
2.  **追踪执行流程**：使用时间旅行功能重现问题
3.  **检查依赖状态**：确认数据库、Redis 服务正常运行
4.  **性能分析**：使用内置指标工具分析瓶颈
5.  **版本对比**：比较不同版本的配置和表现

* * *

## [10 从本地到上线：一个最小工作流](#10-从本地到上线一个最小工作流)

#\_r\_g\_{margin:1.5rem auto 0;}#\_r\_g\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_g\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_g\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_g\_ .error-icon{fill:#a44141;}#\_r\_g\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_g\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_g\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_g\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_g\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_g\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_g\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_g\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_g\_ .marker.cross{stroke:lightgrey;}#\_r\_g\_ svg{font-family:inherit;font-size:16px;}#\_r\_g\_ p{margin:0;}#\_r\_g\_ .label{font-family:inherit;color:#ccc;}#\_r\_g\_ .cluster-label text{fill:#F9FFFE;}#\_r\_g\_ .cluster-label span{color:#F9FFFE;}#\_r\_g\_ .cluster-label span p{background-color:transparent;}#\_r\_g\_ .label text,#\_r\_g\_ span{fill:#ccc;color:#ccc;}#\_r\_g\_ .node rect,#\_r\_g\_ .node circle,#\_r\_g\_ .node ellipse,#\_r\_g\_ .node polygon,#\_r\_g\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_g\_ .rough-node .label text,#\_r\_g\_ .node .label text,#\_r\_g\_ .image-shape .label,#\_r\_g\_ .icon-shape .label{text-anchor:middle;}#\_r\_g\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_g\_ .rough-node .label,#\_r\_g\_ .node .label,#\_r\_g\_ .image-shape .label,#\_r\_g\_ .icon-shape .label{text-align:center;}#\_r\_g\_ .node.clickable{cursor:pointer;}#\_r\_g\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_g\_ .arrowheadPath{fill:lightgrey;}#\_r\_g\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_g\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_g\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_g\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_g\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_g\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_g\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_g\_ .cluster text{fill:#F9FFFE;}#\_r\_g\_ .cluster span{color:#F9FFFE;}#\_r\_g\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_g\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_g\_ rect.text{fill:none;stroke-width:0;}#\_r\_g\_ .icon-shape,#\_r\_g\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_g\_ .icon-shape p,#\_r\_g\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_g\_ .icon-shape rect,#\_r\_g\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_g\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_g\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_g\_ :root{--mermaid-font-family:inherit;}

本地开发

本地验证

配置 langgraph.json

部署/发布

用 Studio 调试

上线监控/回归

对前端同学来说，这个流程和“本地跑 Next.js → Vercel 部署 → 线上调试”非常像。

* * *

## [💡 练习题](#-练习题)

1.  **思考题**：如果你的公司要求数据绝对不能出内网，你应该选择哪种部署方案？
    
    点击查看答案
    
    优先选择自托管私有部署（VPC/内网环境）方案，所有推理与数据存储都在企业边界内完成。 同时需配套访问控制、审计日志和密钥管理，满足合规要求。
    
2.  **操作题**：为你的项目创建一个 `langgraph.json` 文件，并尝试使用 LangGraph CLI (如果有) 或 Docker 运行本地 Server。
    
    点击查看答案
    
    最小可用做法是先写好入口图、依赖与运行命令，再通过 CLI 或 Docker 启动本地服务验证 health endpoint。 能成功启动并接收一次请求，就说明部署描述文件已基本正确。
    
3.  **设计题**：你的应用需要哪些“平台能力”？从下面选 3 个并说明理由：持久化/队列/流式/重试/可观测性。
    
    点击查看答案
    
    常见优先级是：`持久化`（支持线程记忆和恢复）、`重试`（提升稳定性）、`可观测性`（便于排障与优化）。 若是强交互产品，再把 `流式` 作为体验增强项加入首批能力。
    

* * *

## [✅ 总结](#-总结)

**本章要点**：

-   **Platform** 让你专注于业务逻辑，而非基础设施。
-   **langgraph.json** 是部署的核心配置文件。
-   **Studio** 在生产环境中依然可用，是排查线上问题的利器。

**下一步**：如何组织一个复杂的 LangGraph 项目结构？继续学习：[应用结构](./02-application-structure)。

## 相关笔记

- [[4-6 RAG 全流程]]
- [[4-9 Agent 的记忆系统]]
- [[2-1 流式响应工程真相]]
- [[3-6 生产级权限系统的四层防线]]
- [[1-8 人机交互|人机交互（参见 Loock AI 1-8）]]
- [[4-4 Cache 全解与成本控制]]
