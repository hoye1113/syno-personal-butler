---
title: "React Hook  与导航 — Loock AI 全栈应用开发"
tags: ["loock_ai", "nextjs", "ai_agent", "hooks"]
legacy_tags: ["loock_ai", "nextjs", "ai_agent", "hooks"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/nextjs/08-react-hooks-and-navigation"
description: "掌握 React Hook  在 Next.js 中的应用及页面导航的最佳实践。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/3-Next.js 基础/3-8 React Hooks 与导航.md"
source_sha256: "94abcbbee80946daeaad5ee8c4eefcf504361ecc0ca8b48c55760d765e69d0fc"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

# React Hooks 与导航

掌握 React Hooks 在 Next.js 中的应用及页面导航的最佳实践。

## [📚 学习目标](#-学习目标)

学完这篇文章后，你将能够：

-   掌握 Next.js 内置 Hooks 的使用
-   学会自定义 Hooks 封装可复用逻辑
-   掌握编程式导航的方法
-   了解本项目的 Hooks 使用模式
-   学会状态管理最佳实践

* * *

## [前置知识](#前置知识)

在开始学习之前，建议先阅读：

-   [文章5：Server vs Client Components](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/content/docs/05-server-client-components.md)

你需要了解：

-   React Hooks 基础（useState、useEffect）
-   路由基础概念

* * *

## [1️⃣ Next.js 内置 Hooks](#1️⃣-nextjs-内置-hooks)

### [1.1 useRouter - 编程式导航](#11-userouter---编程式导航)

`useRouter` 用于在 Client Components 中进行编程式导航。

**基本用法**：

```
'use client';
import { useRouter } from 'next/navigation';
export default function NavigationExample() {
  const router = useRouter();
  const handleClick = () => {
    // 导航到首页
    router.push('/');
    // 替换当前页面（不添加历史记录）
    router.replace('/login');
    // 返回上一页
    router.back();
    // 前进
    router.forward();
    // 刷新当前页面
    router.refresh();
  };
  return <button onClick={handleClick}>导航</button>;
}
```

**查看本项目的使用**：[app/login/page.tsx](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/login/page.tsx)

```
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  // 如果已登录，跳转到首页
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);
  // ... 登录逻辑
}
```

### [1.2 usePathname - 获取当前路径](#12-usepathname---获取当前路径)

`usePathname` 获取当前 URL 的路径部分。

**基本用法**：

```
'use client';
import { usePathname } from 'next/navigation';
export default function CurrentPath() {
  const pathname = usePathname();
  return <div>当前路径: {pathname}</div>;
}
```

**查看本项目的使用**：[app/components/ProtectedRoute.tsx](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/components/ProtectedRoute.tsx)

```
'use client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  // 公开路由
  const publicRoutes = ['/login', '/register'];
  if (loading) return <div>加载中...</div>;
  if (!user && !publicRoutes.includes(pathname)) {
    // 未登录，跳转到登录页
    return <div>请先登录</div>;
  }
  return <>{children}</>;
}
```

### [1.3 useSearchParams - 获取查询参数](#13-usesearchparams---获取查询参数)

`useSearchParams` 获取 URL 的查询参数。

**基本用法**：

```
'use client';
import { useSearchParams } from 'next/navigation';
export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q'); // ?q=hello
  const page = searchParams.get('page'); // ?page=1
  const sort = searchParams.get('sort'); // ?sort=date
  return (
    <div>
      <p>搜索词: {query}</p>
      <p>页码: {page}</p>
      <p>排序: {sort}</p>
    </div>
  );
}
```

**设置查询参数**：

```
'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
export default function SortControl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setSort = (sort: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set('sort', sort);
    router.push(`${pathname}?${current.toString()}`);
  };
  return (
    <div>
      <button onClick={() => setSort('date')}>按日期排序</button>
      <button onClick={() => setSort('name')}>按名称排序</button>
    </div>
  );
}
```

* * *

## [2️⃣ 自定义 Hooks](#2️⃣-自定义-hooks)

### [2.1 为什么需要自定义 Hooks？](#21-为什么需要自定义-hooks)

自定义 Hooks 用于封装可复用的逻辑，避免代码重复。

**优势**：

-   📦 逻辑复用
-   🧪 易于测试
-   🔄 状态管理集中
-   📖 代码更清晰

### [2.2 基本语法](#22-基本语法)

```
'use client';
import { useState, useEffect } from 'react';
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  const reset = () => setCount(initialValue);
  return { count, increment, decrement, reset };
}
// 使用
export default function Counter() {
  const { count, increment, decrement, reset } = useCounter(0);
  return (
    <div>
      <p>计数: {count}</p>
      <button onClick={increment}>+1</button>
      <button onClick={decrement}>-1</button>
      <button onClick={reset}>重置</button>
    </div>
  );
}
```

### [2.3 本项目的自定义 Hooks](#23-本项目的自定义-hooks)

#### [useSessionManager - 会话管理](#usesessionmanager---会话管理)

查看实现：[app/hooks/useSessionManager.ts](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/hooks/useSessionManager.ts)

```
'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Session } from '@/app/database/sessions';
export function useSessionManager() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  // 加载会话列表
  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/chat/sessions');
      const data = await response.json();
      setSessions(data.sessions);
      // 如果有当前会话 ID，加载它
      const currentSessionId = searchParams.get('session');
      if (currentSessionId) {
        const session = data.sessions.find(
          (s: Session) => s.id === currentSessionId,
        );
        if (session) setCurrentSession(session);
      }
    } catch (e) {
      console.error('加载会话失败:', e);
    } finally {
      setLoading(false);
    }
  };
  // 创建会话
  const createSession = async (name: string, type: 'chat' | 'deepresearch') => {
    const response = await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type }),
    });
    const data = await response.json();
    await loadSessions();
    return data;
  };
  // 删除会话
  const deleteSession = async (id: string) => {
    const response = await fetch('/api/chat/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await loadSessions();
  };
  // 重命名会话
  const renameSession = async (id: string, name: string) => {
    const response = await fetch('/api/chat/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    });
    await loadSessions();
  };
  // 切换会话
  const switchSession = (session: Session) => {
    setCurrentSession(session);
    router.push(
      `/${session.type === 'deepresearch' ? 'deepresearch' : ''}?session=${session.id}`,
    );
  };
  useEffect(() => {
    loadSessions();
  }, []);
  return {
    sessions,
    currentSession,
    loading,
    loadSessions,
    createSession,
    deleteSession,
    renameSession,
    switchSession,
  };
}
```

#### [useChatMessages - 消息管理](#usechatmessages---消息管理)

查看实现：[app/hooks/useChatMessages.ts](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/hooks/useChatMessages.ts)

```
'use client';
import { useState } from 'react';
import type { Message } from '@/app/database/messages';
export function useChatMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  // 添加消息
  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };
  // 更新消息
  const updateMessage = (messageId: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg)),
    );
  };
  // 删除消息
  const deleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  };
  // 清空消息
  const clearMessages = () => {
    setMessages([]);
  };
  return {
    messages,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
  };
}
```

* * *

## [3️⃣ 导航方式对比](#3️⃣-导航方式对比)

### [3.1 Link 组件 vs useRouter](#31-link-组件-vs-userouter)

特性

Link 组件

useRouter

**使用场景**

静态导航链接

动态编程导航

**声明式**

✅ 是

❌ 否

**性能**

✅ 预加载

⚠️ 需要手动

**简单性**

✅ 简单

⚠️ 需要逻辑

### [3.2 Link 组件](#32-link-组件)

```
'use client';
import Link from 'next/link';
export default function Navigation() {
  return (
    <nav>
      <Link href="/">首页</Link>
      <Link href="/about">关于</Link>
      <Link href="/artifact/123">工件详情</Link>
      {/* 带查询参数 */}
      <Link href="/search?q=hello">搜索</Link>
      {/* 替换当前页面 */}
      <Link href="/login" replace>登录</Link>
      {/* 编程式导航 */}
      <Link href={{ pathname: '/post', query: { id: '123' } }}>
        文章详情
      </Link>
    </nav>
  );
}
```

### [3.3 useRouter Hook](#33-userouter-hook)

```
'use client';
import { useRouter } from 'next/navigation';
export default function LoginButton() {
  const router = useRouter();
  const handleLogin = async () => {
    // 登录逻辑
    const success = await login();
    if (success) {
      // 登录成功后跳转
      router.push('/dashboard');
    }
  };
  return <button onClick={handleLogin}>登录</button>;
}
```

* * *

## [4️⃣ 本项目的导航模式](#4️⃣-本项目的导航模式)

### [4.1 路由保护](#41-路由保护)

查看实现：[app/components/ProtectedRoute.tsx](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/components/ProtectedRoute.tsx)

```
'use client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  // 公开路由
  const publicRoutes = ['/login'];
  if (loading) return <div>加载中...</div>;
  if (!user && !publicRoutes.includes(pathname)) {
    // 未登录，不渲染子组件
    return null;
  }
  return <>{children}</>;
}
```

### [4.2 会话切换](#42-会话切换)

```
// 在 useSessionManager 中
const switchSession = (session: Session) => {
  setCurrentSession(session);
  // 根据会话类型跳转
  if (session.type === 'deepresearch') {
    router.push('/deepresearch');
  } else {
    router.push('/');
  }
};
```

* * *

## [5️⃣ 最佳实践](#5️⃣-最佳实践)

### [5.1 Hook 命名规范](#51-hook-命名规范)

```
// ✅ 好的命名
useCounter();
useFetch();
useAuth();
useSessionManager();
// ❌ 不好的命名
counter();
fetchData();
auth();
getSession();
```

### [5.2 Hook 使用规则](#52-hook-使用规则)

**必须遵循的规则**：

1.  ✅ 只在组件顶层调用 Hook
2.  ✅ 只在 React 函数中调用 Hook
3.  ✅ 自定义 Hook 也以 `use` 开头

**示例**：

```
// ✅ 正确
export default function Component() {
  const [count, setCount] = useState(0);
  const { user } = useAuth();
  useEffect(() => {
    // ...
  }, []);
}
// ❌ 错误
export default function Component() {
  if (condition) {
    const [count, setCount] = useState(0); // 不能在条件中调用
  }
}
// ❌ 错误
function notAComponent() {
  const [count, setCount] = useState(0); // 不能在非 React 函数中调用
}
```

### [5.3 性能优化](#53-性能优化)

```
'use client';
import { useState, useCallback, useMemo } from 'react';
export function useOptimizedHook() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState([]);
  // 使用 useCallback 缓存函数
  const increment = useCallback(() => {
    setCount((c) => c + 1);
  }, []);
  // 使用 useMemo 缓存计算结果
  const doubled = useMemo(() => count * 2, [count]);
  return { count, increment, doubled, data };
}
```

* * *

## [💡 练习题](#-练习题)

1.  **选择题**：以下哪个 Hook 用于编程式导航？
    
    -   A. usePathname
    -   B. useRouter
    -   C. useSearchParams
    -   D. useLink
2.  **代码题**：创建一个自定义 Hook `useWindowSize()`，返回当前窗口大小。
    
3.  **分析题**：查看本项目的 [app/hooks/useSessionManager.ts](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/hooks/useSessionManager.ts)，说明它如何管理会话状态。
    
4.  **实践题**：创建一个自定义 Hook `useFetch(url)`，封装数据获取逻辑。
    

* * *

## [📚 参考资源](#-参考资源)

### [官方文档](#官方文档)

-   [useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router)
-   [usePathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname)
-   [useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
-   [Link Component](https://nextjs.org/docs/app/api-reference/components/link)

### [本项目相关文件](#本项目相关文件)

-   [app/hooks/useSessionManager.ts](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/hooks/useSessionManager.ts)
-   [app/hooks/useChatMessages.ts](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/hooks/useChatMessages.ts)
-   [app/hooks/useSendMessage.ts](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/hooks/useSendMessage.ts)
-   [app/components/ProtectedRoute.tsx](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/components/ProtectedRoute.tsx)

* * *

## [✅ 总结](#-总结)

**Next.js 内置 Hooks**：

-   `useRouter` - 编程式导航
-   `usePathname` - 获取当前路径
-   `useSearchParams` - 获取查询参数

**自定义 Hooks**：

-   封装可复用逻辑
-   以 `use` 开头
-   只在组件顶层调用

**导航方式**：

-   `Link` 组件 - 声明式导航
-   `useRouter` - 编程式导航

**本项目的 Hooks**：

-   `useSessionManager` - 会话管理
-   `useChatMessages` - 消息管理
-   `useSendMessage` - 消息发送
-   `useAuth` - 认证状态

**下一步**：阅读下一篇文章《中间件与认证模式》，学习 Next.js 的认证实现。

-   [文章9：中间件与认证模式](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/content/docs/09-middleware-auth.md)

## 相关笔记

- [[2-3 Agent Loop 保险丝]]
- [[4-4 Cache 全解与成本控制]]
- [[MOC - Next.js 基础|Next.js 基础 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
