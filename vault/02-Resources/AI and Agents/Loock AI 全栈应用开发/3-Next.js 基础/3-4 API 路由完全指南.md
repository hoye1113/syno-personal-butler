---
title: "API 路由完全指南 — Loock AI 全栈应用开发"
tags: ["loock_ai", "nextjs", "ai_agent"]
legacy_tags: ["loock_ai", "nextjs", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/nextjs/04-api-routes-guide"
description: "全面掌握 Next.js API Route  的创建、请求处理及响应格式。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/3-Next.js 基础/3-4 API 路由完全指南.md"
source_sha256: "4fb76f9cca8e111798fb1174237655fed6acb4b6eb9b9035e4504c789aec2efb"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

# API 路由完全指南

全面掌握 Next.js API Routes 的创建、请求处理及响应格式。

## [📚 学习目标](#-学习目标)

学完这篇文章后，你将能够：

-   理解 Next.js API Routes 的工作原理
-   掌握创建、使用 HTTP 方法（GET、POST、PUT、DELETE、PATCH）
-   学会处理请求和响应（Request、NextResponse）
-   掌握路由参数和查询参数的使用
-   了解本项目中的 API 实现模式

* * *

## [前置知识](#前置知识)

在开始学习之前，建议先阅读：

-   [文章2：项目结构与配置详解](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/content/docs/02-project-structure-and-configuration.md)
-   [文章3：路由系统基础](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/content/docs/03-routing-system-basics.md)

你需要了解：

-   HTTP 方法（GET、POST、PUT、DELETE 等）
-   JSON 数据格式
-   异步编程（async/await）

* * *

## [1️⃣ API Routes 概述](#1️⃣-api-routes-概述)

### [1.1 什么是 API Routes？](#11-什么是-api-routes)

API Routes 允许你在 Next.js 中创建 API 端点，就像使用 Express 或 Fastify 一样，但无需额外的后端服务。

**优势**：

-   📦 内置于 Next.js，无需单独部署后端
-   🚀 使用 Web 标准（Request、Response）
-   🔌 支持所有 HTTP 方法
-   🛡️ 可以使用中间件进行认证
-   🔄 支持流式响应（Streaming）

### [1.2 API Routes vs 传统后端](#12-api-routes-vs-传统后端)

特性

Next.js API Routes

Express/Fastify

部署方式

内置于 Next.js

需要单独部署

Request 对象

Web Standard Request

Express/Fastify Request

Response 对象

NextResponse

res.send/res.json

中间件

Next.js Middleware

Express/Fastify Middleware

使用场景

全栈应用、SSR 应用

大型后端服务

**本项目选择 API Routes 的原因**：

-   全栈应用，前后端在同一个项目
-   与 Next.js 深度集成
-   部署简单（一个应用）

* * *

## [2️⃣ 创建 API Routes](#2️⃣-创建-api-routes)

### [2.1 基本结构](#21-基本结构)

API Routes 定义在 `app/api/` 目录下，文件名为 `route.ts`。

```
https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/
└── api/
    └── hello/
        └── route.ts    → GET/POST /api/hello
```

### [2.2 基本示例](#22-基本示例)

```
import { NextRequest, NextResponse } from 'next/server';
/**
 * GET /api/hello
 * 获取问候信息
 */
export async function GET(request: Request) {
  return NextResponse.json({ message: 'Hello, World!' });
}
/**
 * POST /api/hello
 * 创建问候信息
 */
export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({
    message: `Hello, ${body.name}!`,
  });
}
```

**说明**：

-   导出命名的 async 函数（GET、POST、PUT、DELETE、PATCH）
-   使用 `NextRequest` 和 `NextResponse` 类型（可选）
-   使用 `NextResponse.json()` 返回 JSON 数据

* * *

## [3️⃣ HTTP 方法详解](#3️⃣-http-方法详解)

### [3.1 支持的 HTTP 方法](#31-支持的-http-方法)

Next.js API Routes 支持以下 HTTP 方法：

方法

用途

幂等性

请求体

**GET**

获取资源

✅ 是

❌ 否

**POST**

创建资源

❌ 否

✅ 是

**PUT**

更新整个资源

✅ 是

✅ 是

**PATCH**

更新部分资源

❌ 否

✅ 是

**DELETE**

删除资源

✅ 是

❌ 否

### [3.2 GET - 获取资源](#32-get---获取资源)

**示例：获取会话列表**

查看本项目的实现：[app/api/chat/sessions/route.ts](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/api/chat/sessions/route.ts)

```
import { NextRequest, NextResponse } from 'next/server';
import { sessionService } from '@/app/services';
import { withAuth } from '@/app/middleware/auth';
import type { SessionType } from '@/app/database/sessions';
/**
 * GET /api/chat/sessions
 * 获取当前用户的所有会话列表
 * 支持按 type 过滤: ?type=chat|deepresearch
 */
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as SessionType | undefined;
    // 使用认证客户端获取会话列表
    const sessions = await sessionService.getAllSessions(auth.client, type);
    return NextResponse.json({ sessions });
  } catch (e) {
    return NextResponse.json(
      { error: '获取会话列表失败', detail: String(e) },
      { status: 500 },
    );
  }
});
```

**代码解析**：

1.  `withAuth()` 包装器：认证用户
2.  `new URL(request.url)`：解析 URL 获取查询参数
3.  `searchParams.get('type')`：获取 `?type=xxx` 参数
4.  `sessionService.getAllSessions()`：调用服务层获取数据
5.  `NextResponse.json()`：返回 JSON 响应

### [3.3 POST - 创建资源](#33-post---创建资源)

**示例：创建新会话**

```
/**
 * POST /api/chat/sessions
 * 创建新会话
 */
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    // 解析请求体
    const { name, type = 'chat' } = await request.json();
    // 调用服务层创建会话
    const result = await sessionService.createSession(
      { name, type },
      auth.user.id,
      auth.client,
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: '新建会话失败', detail: String(e) },
      { status: 500 },
    );
  }
});
```

**代码解析**：

1.  `request.json()`：解析 JSON 请求体
2.  `sessionService.createSession()`：创建新会话
3.  返回创建结果

### [3.4 DELETE - 删除资源](#34-delete---删除资源)

**示例：删除会话**

```
/**
 * DELETE /api/chat/sessions
 * 删除会话
 */
export const DELETE = withAuth(async (request: NextRequest, auth) => {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 });
    }
    await sessionService.deleteSession({ id });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: '删除会话失败', detail: String(e) },
      { status: 500 },
    );
  }
});
```

**代码解析**：

1.  参数验证：检查是否提供 `id`
2.  `sessionService.deleteSession()`：删除会话
3.  返回成功响应

### [3.5 PATCH - 更新部分资源](#35-patch---更新部分资源)

**示例：重命名会话**

```
/**
 * PATCH /api/chat/sessions
 * 重命名会话
 */
export const PATCH = withAuth(async (request: NextRequest, auth) => {
  try {
    const { id, name } = await request.json();
    if (!id || !name) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }
    await sessionService.updateSessionName({ id, name });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: '更新会话失败', detail: String(e) },
      { status: 500 },
    );
  }
});
```

* * *

## [4️⃣ 请求与响应处理](#4️⃣-请求与响应处理)

### [4.1 处理请求（Request）](#41-处理请求request)

**获取请求体**：

```
export async function POST(request: Request) {
  // 解析 JSON
  const body = await request.json();
  // 解析表单数据
  const formData = await request.formData();
  // 获取文本
  const text = await request.text();
  // 获取 JSON 文本
  const jsonText = await request.text();
  const data = JSON.parse(jsonText);
}
```

**获取请求头**：

```
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const contentType = request.headers.get('content-type');
  return NextResponse.json({
    auth: authHeader,
    contentType,
  });
}
```

### [4.2 处理响应（NextResponse）](#42-处理响应nextresponse)

**返回 JSON**：

```
return NextResponse.json({
  message: 'Success',
  data: { id: 1, name: 'Test' },
});
```

**设置状态码**：

```
// 成功响应
return NextResponse.json({ message: 'Success' }, { status: 200 });
// 未授权
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// 未找到
return NextResponse.json({ error: 'Not Found' }, { status: 404 });
// 服务器错误
return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
```

**设置响应头**：

```
return NextResponse.json(
  { message: 'Success' },
  {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache',
      'X-Custom-Header': 'Custom-Value',
    },
  },
);
```

**重定向**：

```
// 重定向到首页
return NextResponse.redirect(new URL('/', request.url));
// 重定向到登录页
return NextResponse.redirect(new URL('/login', request.url));
```

**示例：OAuth 回调重定向**

查看本项目的实现：[app/api/auth/callback/route.ts](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/api/auth/callback/route.ts)

```
import { NextRequest, NextResponse } from 'next/server';
/**
 * POST /api/auth/callback
 * OAuth 认证回调处理
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    if (!code) {
      return NextResponse.json({ error: '缺少授权码' }, { status: 400 });
    }
    // 处理 OAuth 认证逻辑...
    // 认证成功，重定向到首页
    return NextResponse.redirect(new URL('/', request.url));
  } catch (e) {
    return NextResponse.redirect(
      new URL('/login?error=auth_failed', request.url),
    );
  }
}
```

* * *

## [5️⃣ 路由参数与查询参数](#5️⃣-路由参数与查询参数)

### [5.1 动态路由参数](#51-动态路由参数)

**文件结构**：

```
app/api/
└── artifacts/
    └── [id]/
        └── route.ts    → GET/DELETE /api/artifacts/123
```

**示例：获取/删除指定 ID 的工件**

查看实现：[app/api/artifacts/\[id\]/route.ts](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/api/artifacts/%5Bid%5D/route.ts)

```
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/middleware/auth';
import { artifactService } from '@/app/services';
/**
 * GET /api/artifacts/[id]
 * 获取指定 ID 的工件
 */
export const GET = withAuth(
  async (
    request: NextRequest,
    auth,
    { params }: { params: { id: string } },
  ) => {
    try {
      const id = params.id; // 获取动态参数 [id]
      const artifact = await artifactService.getArtifactById(auth.client, id);
      if (!artifact) {
        return NextResponse.json({ error: '工件不存在' }, { status: 404 });
      }
      return NextResponse.json({ artifact });
    } catch (e) {
      return NextResponse.json(
        { error: '获取工件失败', detail: String(e) },
        { status: 500 },
      );
    }
  },
);
/**
 * DELETE /api/artifacts/[id]
 * 删除指定 ID 的工件
 */
export const DELETE = withAuth(
  async (
    request: NextRequest,
    auth,
    { params }: { params: { id: string } },
  ) => {
    try {
      const id = params.id;
      await artifactService.deleteArtifact(auth.client, id);
      return NextResponse.json({ success: true });
    } catch (e) {
      return NextResponse.json(
        { error: '删除工件失败', detail: String(e) },
        { status: 500 },
      );
    }
  },
);
```

**说明**：

-   `params.id` 获取动态路由参数 `[id]`
-   参数类型在第三个参数中定义

### [5.2 查询参数](#52-查询参数)

**获取查询参数**：

```
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page'); // ?page=1
  const limit = searchParams.get('limit'); // ?limit=10
  const query = searchParams.get('q'); // ?q=hello
  // 获取多个同名参数
  const tags = searchParams.getAll('tags'); // ?tags=a&tags=b
  return NextResponse.json({ page, limit, query, tags });
}
```

**示例：带过滤的会话列表**

```
export const GET = withAuth(async (request: NextRequest, auth) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as SessionType | undefined;
  // 根据查询参数过滤
  const sessions = await sessionService.getAllSessions(auth.client, type);
  return NextResponse.json({ sessions });
});
```

**使用示例**：

-   `GET /api/chat/sessions` - 获取所有会话
-   `GET /api/chat/sessions?type=chat` - 只获取聊天会话
-   `GET /api/chat/sessions?type=deepresearch` - 只获取深度研究会话

* * *

## [6️⃣ 错误处理](#6️⃣-错误处理)

### [6.1 基本错误处理](#61-基本错误处理)

```
export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    // 参数验证
    if (!name) {
      return NextResponse.json({ error: '缺少 name 参数' }, { status: 400 });
    }
    // 业务逻辑
    const result = await createSomething(name);
    return NextResponse.json(result);
  } catch (e) {
    // 错误处理
    return NextResponse.json(
      {
        error: '操作失败',
        detail: String(e),
      },
      { status: 500 },
    );
  }
}
```

### [6.2 自定义错误类](#62-自定义错误类)

```
// https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/utils/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad Request') {
    super(message, 400);
  }
}
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}
export class NotFoundError extends ApiError {
  constructor(message: string = 'Not Found') {
    super(message, 404);
  }
}
```

**使用自定义错误**：

```
import { BadRequestError, NotFoundError } from '@/app/utils/errors';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    if (!id) {
      throw new BadRequestError('缺少 id 参数');
    }
    const item = await getItemById(id);
    if (!item) {
      throw new NotFoundError('资源不存在');
    }
    return NextResponse.json({ item });
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
```

* * *

## [7️⃣ 本项目的 API 实现模式](#7️⃣-本项目的-api-实现模式)

### [7.1 完整的 CRUD API](#71-完整的-crud-api)

**文件：[app/api/chat/sessions/route.ts](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/api/chat/sessions/route.ts)**

```
import { NextRequest, NextResponse } from 'next/server';
import { sessionService } from '@/app/services';
import { withAuth } from '@/app/middleware/auth';
import type { SessionType } from '@/app/database/sessions';
/**
 * GET /api/chat/sessions
 * 获取当前用户的所有会话列表
 * 支持按 type 过滤: ?type=chat|deepresearch
 */
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as SessionType | undefined;
    const sessions = await sessionService.getAllSessions(auth.client, type);
    return NextResponse.json({ sessions });
  } catch (e) {
    return NextResponse.json(
      { error: '获取会话列表失败', detail: String(e) },
      { status: 500 },
    );
  }
});
/**
 * POST /api/chat/sessions
 * 创建新会话
 */
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const { name, type = 'chat' } = await request.json();
    const result = await sessionService.createSession(
      { name, type },
      auth.user.id,
      auth.client,
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: '新建会话失败', detail: String(e) },
      { status: 500 },
    );
  }
});
/**
 * DELETE /api/chat/sessions
 * 删除会话
 */
export const DELETE = withAuth(async (request: NextRequest, auth) => {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 });
    }
    await sessionService.deleteSession({ id });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: '删除会话失败', detail: String(e) },
      { status: 500 },
    );
  }
});
/**
 * PATCH /api/chat/sessions
 * 重命名会话
 */
export const PATCH = withAuth(async (request: NextRequest, auth) => {
  try {
    const { id, name } = await request.json();
    if (!id || !name) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }
    await sessionService.updateSessionName({ id, name });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: '更新会话失败', detail: String(e) },
      { status: 500 },
    );
  }
});
```

**模式总结**：

1.  ✅ 使用 `withAuth` 包装器进行认证
2.  ✅ 使用 `try-catch` 捕获错误
3.  ✅ 参数验证后调用服务层
4.  ✅ 统一的错误响应格式
5.  ✅ 完整的 CRUD 操作

### [7.2 动态路由 API](#72-动态路由-api)

**文件：[app/api/artifacts/\[id\]/route.ts](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/api/artifacts/%5Bid%5D/route.ts)**

```
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/middleware/auth';
import { artifactService } from '@/app/services';
/**
 * GET /api/artifacts/[id]
 * 获取指定 ID 的工件
 */
export const GET = withAuth(
  async (
    request: NextRequest,
    auth,
    { params }: { params: { id: string } },
  ) => {
    try {
      const id = params.id;
      const artifact = await artifactService.getArtifactById(auth.client, id);
      if (!artifact) {
        return NextResponse.json({ error: '工件不存在' }, { status: 404 });
      }
      return NextResponse.json({ artifact });
    } catch (e) {
      return NextResponse.json(
        { error: '获取工件失败', detail: String(e) },
        { status: 500 },
      );
    }
  },
);
/**
 * DELETE /api/artifacts/[id]
 * 删除指定 ID 的工件
 */
export const DELETE = withAuth(
  async (
    request: NextRequest,
    auth,
    { params }: { params: { id: string } },
  ) => {
    try {
      const id = params.id;
      await artifactService.deleteArtifact(auth.client, id);
      return NextResponse.json({ success: true });
    } catch (e) {
      return NextResponse.json(
        { error: '删除工件失败', detail: String(e) },
        { status: 500 },
      );
    }
  },
);
```

**模式总结**：

1.  ✅ 使用 `params.id` 获取动态参数
2.  ✅ 认证后访问资源
3.  ✅ 返回 404 当资源不存在
4.  ✅ 统一的错误处理

* * *

## [8️⃣ 调用 API Routes](#8️⃣-调用-api-routes)

### [8.1 在客户端调用](#81-在客户端调用)

**使用 fetch**：

```
'use client';
import { useState, useEffect } from 'react';
export default function UserList() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    // GET 请求
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data));
  }, []);
  const createUser = async () => {
    // POST 请求
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'John' }),
    });
    const data = await response.json();
    console.log(data);
  };
  return (
    <div>
      <button onClick={createUser}>创建用户</button>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### [8.2 本项目的调用示例](#82-本项目的调用示例)

**使用自定义 Hook 调用 API**

查看实现：[app/hooks/useSessionManager.ts](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/hooks/useSessionManager.ts)

```
import { useState, useEffect } from 'react';
import type { Session } from '@/app/database/sessions';
export function useSessionManager() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/chat/sessions');
      const data = await response.json();
      setSessions(data.sessions);
    } catch (e) {
      console.error('加载会话失败:', e);
    } finally {
      setLoading(false);
    }
  };
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
  const deleteSession = async (id: string) => {
    const response = await fetch('/api/chat/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await loadSessions();
  };
  const renameSession = async (id: string, name: string) => {
    const response = await fetch('/api/chat/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    });
    await loadSessions();
  };
  useEffect(() => {
    loadSessions();
  }, []);
  return {
    sessions,
    loading,
    loadSessions,
    createSession,
    deleteSession,
    renameSession,
  };
}
```

**说明**：

-   使用 `fetch` 调用 API Routes
-   封装成自定义 Hook 供组件使用
-   自动加载和刷新数据

* * *

## [9️⃣ 实战案例：创建完整 API](#9️⃣-实战案例创建完整-api)

### [9.1 需求](#91-需求)

创建一个任务管理 API，支持：

-   GET `/api/tasks` - 获取任务列表
-   POST `/api/tasks` - 创建任务
-   PUT `/api/tasks/[id]` - 更新任务
-   DELETE `/api/tasks/[id]` - 删除任务

### [9.2 实现](#92-实现)

**文件结构**：

```
https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/
└── api/
    └── tasks/
        ├── route.ts      → GET/POST
        └── [id]/
            └── route.ts  → PUT/DELETE
```

**代码实现**：

`app/api/tasks/route.ts`：

```
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/middleware/auth';
import { taskService } from '@/app/services';
/**
 * GET /api/tasks
 * 获取任务列表
 */
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const tasks = await taskService.getAllTasks(auth.client);
    return NextResponse.json({ tasks });
  } catch (e) {
    return NextResponse.json(
      { error: '获取任务失败', detail: String(e) },
      { status: 500 },
    );
  }
});
/**
 * POST /api/tasks
 * 创建任务
 */
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const { title, description } = await request.json();
    if (!title) {
      return NextResponse.json({ error: '缺少 title 参数' }, { status: 400 });
    }
    const task = await taskService.createTask(
      { title, description },
      auth.user.id,
      auth.client,
    );
    return NextResponse.json({ task });
  } catch (e) {
    return NextResponse.json(
      { error: '创建任务失败', detail: String(e) },
      { status: 500 },
    );
  }
});
```

`app/api/tasks/[id]/route.ts`：

```
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/middleware/auth';
import { taskService } from '@/app/services';
/**
 * PUT /api/tasks/[id]
 * 更新任务
 */
export const PUT = withAuth(
  async (
    request: NextRequest,
    auth,
    { params }: { params: { id: string } },
  ) => {
    try {
      const id = params.id;
      const { title, description, status } = await request.json();
      const task = await taskService.updateTask(
        { id, title, description, status },
        auth.client,
      );
      if (!task) {
        return NextResponse.json({ error: '任务不存在' }, { status: 404 });
      }
      return NextResponse.json({ task });
    } catch (e) {
      return NextResponse.json(
        { error: '更新任务失败', detail: String(e) },
        { status: 500 },
      );
    }
  },
);
/**
 * DELETE /api/tasks/[id]
 * 删除任务
 */
export const DELETE = withAuth(
  async (
    request: NextRequest,
    auth,
    { params }: { params: { id: string } },
  ) => {
    try {
      const id = params.id;
      await taskService.deleteTask(id, auth.client);
      return NextResponse.json({ success: true });
    } catch (e) {
      return NextResponse.json(
        { error: '删除任务失败', detail: String(e) },
        { status: 500 },
      );
    }
  },
);
```

* * *

## [💡 练习题](#-练习题)

1.  **选择题**：以下哪个是创建资源的 HTTP 方法？
    
    -   A. GET
    -   B. POST
    -   C. PUT
    -   D. DELETE
2.  **代码题**：创建一个 API Route `GET /api/products`，返回产品列表。
    
3.  **分析题**：查看本项目的 [app/api/chat/sessions/route.ts](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/api/chat/sessions/route.ts)，说明它如何处理不同的 HTTP 方法。
    
4.  **实践题**：创建一个完整的博客 API，包含：
    
    -   GET `/api/posts` - 获取文章列表
    -   GET `/api/posts/[id]` - 获取单篇文章
    -   POST `/api/posts` - 创建文章
    -   DELETE `/api/posts/[id]` - 删除文章

* * *

## [📚 参考资源](#-参考资源)

### [官方文档](#官方文档)

-   [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
-   [Route Handler Convention](https://nextjs.org/docs/app/api-reference/file-conventions/route)
-   [NextRequest & NextResponse](https://nextjs.org/docs/app/api-reference/next-request)

### [本项目相关文件](#本项目相关文件)

-   [app/api/chat/sessions/route.ts - 会话管理 API](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/api/chat/sessions/route.ts)
-   [app/api/artifacts/\[id\]/route.ts - 工件管理 API](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/api/artifacts/%5Bid%5D/route.ts)
-   [app/hooks/useSessionManager.ts - 会话管理 Hook](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/hooks/useSessionManager.ts)
-   [app/middleware/auth.ts - 认证中间件](https://github.com/loock-ai/langgraphjs-chat-app/blob/main/app/middleware/auth.ts)

* * *

## [✅ 总结](#-总结)

**API Routes 核心概念**：

-   文件名 `route.ts` 定义 API 端点
-   导出命名的 async 函数（GET、POST、PUT、PATCH、DELETE）
-   使用 `NextRequest` 和 `NextResponse` 处理请求和响应

**HTTP 方法**：

-   GET - 获取资源
-   POST - 创建资源
-   PUT - 更新整个资源
-   PATCH - 更新部分资源
-   DELETE - 删除资源

**参数处理**：

-   动态路由参数：`[id]` → `params.id`
-   查询参数：`?type=xxx` → `searchParams.get('type')`

**本项目的 API 模式**：

-   使用 `withAuth` 包装器进行认证
-   统一的错误处理格式
-   完整的 CRUD 操作
-   三层架构：Route → Service → Database

**下一步**：阅读下一篇文章《Server vs Client Components》，理解 Next.js 的组件类型。

## 相关笔记

- [[2-3 Agent Loop 保险丝]]
- [[2-1 流式响应工程真相]]
- [[4-4 Cache 全解与成本控制]]
- [[MOC - Next.js 基础|Next.js 基础 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
