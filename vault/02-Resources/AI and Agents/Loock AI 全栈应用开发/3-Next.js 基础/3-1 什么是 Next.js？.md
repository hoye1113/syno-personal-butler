---
title: "什么是 Next.js？ — Loock AI 全栈应用开发"
tags: ["loock_ai", "nextjs", "ai_agent"]
legacy_tags: ["loock_ai", "nextjs", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/nextjs/01-introduction-to-nextjs"
description: "本文介绍 Next.js 的核心概念、与 React 的关系以及其主要优势。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/3-Next.js 基础/3-1 什么是 Next.js？.md"
source_sha256: "153bafca5c0a5ee840b696d511b14dbc8c437f1ef34656e6256945b25e2ae14f"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

# 什么是 Next.js？

本文介绍 Next.js 的核心概念、与 React 的关系以及其主要优势。

## [📚 学习目标](#-学习目标)

学完这篇文章后，你将能够：

-   理解 Next.js 是什么，它与 React 的关系
-   了解 Next.js 的核心优势
-   知道为什么企业级应用首选 Next.js
-   了解本项目的技术栈
-   掌握 Next.js 的学习路径

* * *

## [前置知识](#前置知识)

在开始学习 Next.js 之前，你需要了解：

-   HTML、CSS、JavaScript 基础
-   React 基础（组件、Props、State）

如果你还没有掌握这些知识，建议先学习 React 基础。

* * *

## [1️⃣ Next.js 是什么？](#1️⃣-nextjs-是什么)

### [1.1 简单理解](#11-简单理解)

想象一下：

-   **React** 像是一套乐高积木（组件），让你可以拼出各种 UI
-   **Next.js** 像是一个完整的乐高套装，包含了积木、说明书、展示台等一切你需要的东西

**Next.js** 是一个基于 React 的全栈框架，它帮你解决了 React 开发中的很多复杂问题，让你可以专注于业务逻辑。

### [1.2 技术定义](#12-技术定义)

Next.js 是由 Vercel 公司开发的 React 框架，提供了：

-   📁 文件系统路由
-   🌐 服务端渲染 (SSR)
-   ⚡ 静态生成 (SSG)
-   🔄 增量静态再生 (ISR)
-   🔌 内置 API Routes
-   📦 自动代码分割
-   🖼️ 图片优化
-   🔍 SEO 友好

* * *

## [2️⃣ Next.js vs React：有什么区别？](#2️⃣-nextjs-vs-react有什么区别)

### [2.1 核心区别对比表](#21-核心区别对比表)

特性

React

Next.js

**定位**

UI 库

全栈框架

**路由**

需要额外配置（如 React Router）

内置文件系统路由

**数据获取**

手动管理

内置数据获取、缓存、重验证

**渲染方式**

客户端渲染 (CSR)

支持服务端渲染、静态生成等多种方式

**API**

需要后端服务

内置 API Routes

**SEO**

较差

优秀（支持服务端渲染）

**构建优化**

需要手动配置

自动代码分割、懒加载

**适用场景**

小型应用、SPA

企业级应用、博客、电商等

### [2.2 为什么企业级应用选择 Next.js？](#22-为什么企业级应用选择-nextjs)

1.  **开箱即用**：不需要配置路由、数据获取、优化等
2.  **SEO 友好**：搜索引擎可以抓取内容（因为支持服务端渲染）
3.  **性能优秀**：自动优化图片、代码分割、懒加载
4.  **开发效率高**：文件系统路由、内置 API、TypeScript 支持
5.  **生态成熟**：丰富的插件和工具

* * *

## [3️⃣ 本项目的技术栈](#3️⃣-本项目的技术栈)

### [3.1 完整技术栈](#31-完整技术栈)

本项目使用了以下技术栈：

#\_r\_3\_{margin:1.5rem auto 0;}#\_r\_3\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_3\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_3\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_3\_ .error-icon{fill:#a44141;}#\_r\_3\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_3\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_3\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_3\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_3\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_3\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_3\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_3\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_3\_ .marker.cross{stroke:lightgrey;}#\_r\_3\_ svg{font-family:inherit;font-size:16px;}#\_r\_3\_ p{margin:0;}#\_r\_3\_ .label{font-family:inherit;color:#ccc;}#\_r\_3\_ .cluster-label text{fill:#F9FFFE;}#\_r\_3\_ .cluster-label span{color:#F9FFFE;}#\_r\_3\_ .cluster-label span p{background-color:transparent;}#\_r\_3\_ .label text,#\_r\_3\_ span{fill:#ccc;color:#ccc;}#\_r\_3\_ .node rect,#\_r\_3\_ .node circle,#\_r\_3\_ .node ellipse,#\_r\_3\_ .node polygon,#\_r\_3\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_3\_ .rough-node .label text,#\_r\_3\_ .node .label text,#\_r\_3\_ .image-shape .label,#\_r\_3\_ .icon-shape .label{text-anchor:middle;}#\_r\_3\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_3\_ .rough-node .label,#\_r\_3\_ .node .label,#\_r\_3\_ .image-shape .label,#\_r\_3\_ .icon-shape .label{text-align:center;}#\_r\_3\_ .node.clickable{cursor:pointer;}#\_r\_3\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_3\_ .arrowheadPath{fill:lightgrey;}#\_r\_3\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_3\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_3\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_3\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_3\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_3\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_3\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_3\_ .cluster text{fill:#F9FFFE;}#\_r\_3\_ .cluster span{color:#F9FFFE;}#\_r\_3\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_3\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_3\_ rect.text{fill:none;stroke-width:0;}#\_r\_3\_ .icon-shape,#\_r\_3\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_3\_ .icon-shape p,#\_r\_3\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_3\_ .icon-shape rect,#\_r\_3\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_3\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_3\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_3\_ :root{--mermaid-font-family:inherit;}

Next.js 16 + React 19

Tailwind CSS 4

TypeScript 5

Google Gemini 3 Pro

Supabase

LangGraphJS

LangChain

### [3.2 技术栈说明](#32-技术栈说明)

技术

版本

作用

**Next.js**

16.1.1

全栈框架，提供路由、API、渲染等功能

**React**

19.2.0

UI 库，构建用户界面

**TypeScript**

5.9.3

类型安全的 JavaScript 超集

**Tailwind CSS**

4.1.17

实用优先的 CSS 框架

**Google Gemini**

3 Pro

AI 模型，提供智能对话能力

**LangGraphJS**

1.0.2

AI 状态图框架，管理复杂对话逻辑

**LangChain**

1.1.5+

AI 应用开发框架，提供工具集成

**Supabase**

2.89.0

后端服务，提供数据库、认证等功能

* * *

## [4️⃣ Next.js 的核心优势](#4️⃣-nextjs-的核心优势)

### [4.1 文件系统路由](#41-文件系统路由)

在 Next.js 中，你只需要在 `app` 目录下创建文件夹和文件，路由会自动生成。

```
app/
├── page.tsx              → /
├── about/
│   └── page.tsx          → /about
├── artifact/
│   └── [id]/
│       └── page.tsx      → /artifact/123
└── api/
    └── chat/
        └── route.ts      → /api/chat
```

### [4.2 服务端渲染 (SSR)](#42-服务端渲染-ssr)

服务端渲染意味着 HTML 在服务器上生成，然后发送给浏览器。

**优势**：

-   ⚡ 更快的首屏加载速度
-   🔍 更好的 SEO（搜索引擎可以抓取内容）
-   📱 更好的用户体验（无需等待 JavaScript 加载）

### [4.3 内置 API Routes](#43-内置-api-routes)

Next.js 允许你在同一个项目中创建 API 端点，无需单独的后端服务。

例如：[app/api/chat/route.ts](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/api/chat/route.ts)

```
import { NextResponse } from 'next/server';
export async function POST(request: Request) {
  const body = await request.json();
  // 处理逻辑...
  return NextResponse.json({ success: true });
}
```

### [4.4 自动代码分割](#44-自动代码分割)

Next.js 会自动将代码分割成小块，只加载用户当前需要的代码。

这意味着：

-   🚀 更快的页面加载速度
-   💾 更小的初始 bundle 大小

* * *

## [5️⃣ 实战案例：本项目的页面结构](#5️⃣-实战案例本项目的页面结构)

### [5.1 主页组件](#51-主页组件)

让我们看看本项目的首页代码：[app/page.tsx](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/page.tsx)

```
'use client';
import { useRef, useMemo, useState, useEffect } from 'react';
// 导入组件
import { ProtectedRoute } from './components/ProtectedRoute';
import SessionSidebar from './components/SessionSidebar';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { ChatInput, type ChatInputHandle } from './components/ChatInput';
// 导入自定义 Hooks
import { useChatMessages } from './hooks/useChatMessages';
import { useSessionManager } from './hooks/useSessionManager';
import { useChatHistory } from './hooks/useChatHistory';
import { useSendMessage } from './hooks/useSendMessage';
/**
 * 聊天页面主组件
 *
 * 该组件是聊天应用的主页面,负责:
 * 1. 整合所有子组件(头部、侧边栏、消息列表、输入框)
 * 2. 管理聊天消息状态
 * 3. 管理会话(session)状态
 * 4. 处理消息发送和历史记录加载
 *
 * 架构说明:
 * - 使用自定义 hooks 分离业务逻辑
 * - 组件只负责 UI 渲染和状态组合
 * - 所有复杂逻辑都封装在 hooks 中
 */
export default function ChatPage() {
  // 组件逻辑...
}
```

### [5.2 全局布局](#52-全局布局)

让我们看看全局布局：[app/layout.tsx](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/layout.tsx)

```
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
export const metadata: Metadata = {
  title: "LangGraph Chat App",
  description: "Chat application powered by LangGraph",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#050509] text-slate-200 antialiased selection:bg-blue-500/30 overflow-hidden">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

**代码解析**：

-   这是 Next.js 的**Server Component**（默认不写 `'use client'`）
-   `metadata` 导出用于设置页面的 SEO 信息
-   `AuthProvider` 包裹所有子组件，提供全局认证状态
-   `children` 是所有子页面组件的占位符

### [5.3 配置文件](#53-配置文件)

Next.js 配置：[next.config.ts](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/next.config.ts)

```
import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: false, // 禁用 React 严格模式
  typescript: {
    // 在构建时忽略 TypeScript 类型错误
    ignoreBuildErrors: true,
  },
  experimental: {
    // 使用系统 TLS 证书以解决网络问题
    turbopackUseSystemTlsCerts: true,
  },
};
export default nextConfig;
```

**代码解析**：

-   `reactStrictMode: false` - 开发模式下禁用 React 的严格检查
-   `ignoreBuildErrors: true` - 构建时忽略 TypeScript 错误（开发阶段使用）
-   `turbopackUseSystemTlsCerts: true` - 使用系统 TLS 证书（解决某些网络问题）

* * *

## [6️⃣ Next.js 学习路径](#6️⃣-nextjs-学习路径)

### [6.1 学习阶段规划](#61-学习阶段规划)

#\_r\_5\_{margin:1.5rem auto 0;}#\_r\_5\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_5\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_5\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_5\_ .error-icon{fill:#a44141;}#\_r\_5\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_5\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_5\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_5\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_5\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_5\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_5\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_5\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_5\_ .marker.cross{stroke:lightgrey;}#\_r\_5\_ svg{font-family:inherit;font-size:16px;}#\_r\_5\_ p{margin:0;}#\_r\_5\_ .label{font-family:inherit;color:#ccc;}#\_r\_5\_ .cluster-label text{fill:#F9FFFE;}#\_r\_5\_ .cluster-label span{color:#F9FFFE;}#\_r\_5\_ .cluster-label span p{background-color:transparent;}#\_r\_5\_ .label text,#\_r\_5\_ span{fill:#ccc;color:#ccc;}#\_r\_5\_ .node rect,#\_r\_5\_ .node circle,#\_r\_5\_ .node ellipse,#\_r\_5\_ .node polygon,#\_r\_5\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_5\_ .rough-node .label text,#\_r\_5\_ .node .label text,#\_r\_5\_ .image-shape .label,#\_r\_5\_ .icon-shape .label{text-anchor:middle;}#\_r\_5\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_5\_ .rough-node .label,#\_r\_5\_ .node .label,#\_r\_5\_ .image-shape .label,#\_r\_5\_ .icon-shape .label{text-align:center;}#\_r\_5\_ .node.clickable{cursor:pointer;}#\_r\_5\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_5\_ .arrowheadPath{fill:lightgrey;}#\_r\_5\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_5\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_5\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_5\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_5\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_5\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_5\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_5\_ .cluster text{fill:#F9FFFE;}#\_r\_5\_ .cluster span{color:#F9FFFE;}#\_r\_5\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_5\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_5\_ rect.text{fill:none;stroke-width:0;}#\_r\_5\_ .icon-shape,#\_r\_5\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_5\_ .icon-shape p,#\_r\_5\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_5\_ .icon-shape rect,#\_r\_5\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_5\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_5\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_5\_ :root{--mermaid-font-family:inherit;}

第四阶段：实战项目总结

文章 11  
项目总结与扩展

第三阶段：高级特性与架构

文章 8  
Hooks 与导航

文章 9  
中间件与认证

文章 10  
分层架构

第二阶段：核心功能

文章 4  
API Routes

文章 5  
Server/Client 组件

文章 6  
数据获取模式

文章 7  
流式响应 ⭐

第一阶段：基础入门

文章 1  
什么是 Next.js

文章 2  
项目结构与配置

文章 3  
路由系统基础

🎯 开始学习

### [6.2 阅读顺序建议](#62-阅读顺序建议)

**第一阶段：打好基础**

1.  什么是 Next.js？（本文）
2.  项目结构与配置详解
3.  路由系统基础

**第二阶段：核心功能**

4.  API Routes 完全指南
5.  Server vs Client Components
6.  数据获取模式
7.  流式响应实现（重点！）

**第三阶段：进阶知识**

8.  React Hooks 与导航
9.  中间件与认证模式
10.  企业级分层架构

**第四阶段：综合应用**

11.  完整项目功能复盘

* * *

## [7️⃣ 练习题](#7️⃣-练习题)

1.  **选择题**：Next.js 与 React 的主要区别是什么？
    
    -   A. React 是框架，Next.js 是库
    -   B. Next.js 包含路由、API 等功能，React 只是 UI 库
    -   C. 它们完全相同
    -   D. React 比 Next.js 功能更多
2.  **简答题**：为什么企业级应用通常选择 Next.js 而不是纯 React？
    
3.  **代码题**：根据 Next.js 的文件系统路由规则，以下文件会生成什么路由？
    
    ```
    app/
    ├── page.tsx
    ├── about/
    │   └── page.tsx
    └── product/
        └── [id]/
            └── page.tsx
    ```
    
4.  **思考题**：查看本项目的 [app/layout.tsx](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/layout.tsx)，它为什么不需要 `'use client'` 指令？
    

* * *

## [📚 参考资源](#-参考资源)

### [官方文档](#官方文档)

-   [Next.js 官方文档](https://nextjs.org/docs)
-   [Next.js App Router 概览](https://nextjs.org/docs/app)
-   [Getting Started 教程](https://nextjs.org/docs/app/getting-started)
-   [Next.js 与 React 的区别](https://nextjs.org/learn)

### [本项目相关文件](#本项目相关文件)

-   [app/page.tsx - 主页面组件](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/page.tsx)
-   [app/layout.tsx - 全局布局](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/layout.tsx)
-   [next.config.ts - Next.js 配置](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/next.config.ts)
-   [package.json - 项目依赖](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/package.json)

* * *

## [✅ 总结](#-总结)

**Next.js** 是一个功能强大的 React 全栈框架，它提供了：

-   📁 文件系统路由
-   🌐 服务端渲染
-   🔌 内置 API Routes
-   ⚡ 自动优化
-   📦 丰富的生态系统

**企业级应用选择 Next.js 的原因**：

-   开箱即用，无需繁琐配置
-   SEO 友好，利于搜索引擎抓取
-   性能优秀，自动优化
-   开发效率高，生态成熟

**本项目的技术栈**：

-   Next.js 16 + React 19 + TypeScript 5
-   Tailwind CSS 4
-   Google Gemini 3 Pro + LangGraphJS + LangChain
-   Supabase

**下一步**：阅读下一篇文章《项目结构与配置详解》，深入了解 Next.js 的项目结构。

## 相关笔记

- [[2-3 Agent Loop 保险丝]]
- [[2-1 流式响应工程真相]]
- [[3-6 生产级权限系统的四层防线]]
- [[4-4 Cache 全解与成本控制]]
- [[MOC - Next.js 基础|Next.js 基础 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
