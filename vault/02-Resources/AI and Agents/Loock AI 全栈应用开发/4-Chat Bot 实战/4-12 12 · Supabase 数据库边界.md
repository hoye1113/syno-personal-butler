---
title: "12 · Supabase 数据库边界 — Loock AI 全栈应用开发"
tags: ["loock_ai", "chatbot", "ai_agent"]
legacy_tags: ["loock_ai", "chatbot", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/chat-bot-course/05-product-foundation/12-supabase-database"
description: "把线程元数据接入 Supabase repo itory，把消息历史交给 LangGraph Supabase checkpointer，建立真实数据库边界。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/4-Chat Bot 实战/4-12 12 · Supabase 数据库边界.md"
source_sha256: "7a1233aa8dfdaf95046d78d0f93d7e92d0de22fd2ce0b294bd5191ca38c5d342"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第五阶段 · 真实产品基础能力

# 12 · Supabase 数据库边界

把线程元数据接入 Supabase repository，把消息历史交给 LangGraph Supabase checkpointer，建立真实数据库边界。

## [课时资源](#课时资源)

-   [查看本课源码](https://github.com/loock-ai/chat-bot-course-code/tree/main/phase-05-product-foundation/lesson-12-supabase-database)

## [一、学习目标](#一学习目标)

本课所在阶段：`第五阶段 · 真实产品基础能力`。

学完这一课后，你应该能够：

-   理解为什么聊天系统进入产品阶段后，必须先抽出数据库边界，而不是把查询写进服务层
-   看懂为什么这一课里"消息历史"和"线程元数据"被拆给了两套不同机制
-   明白 `chat.repository.ts` 为什么只保存线程元数据，而不再保存消息正文
-   说清 `SupabaseSaver`、`memory.service.ts`、`chat.repository.ts` 三者分别负责什么

## [二、问题背景](#二问题背景)

到了第十一课，应用已经有了真实用户状态和受保护���页，但数据层还没有真正进入"产品模式"。

如果继续把线程信息和历史消息混在一起处理，会很快遇到两个问题：

-   服务重启后，数据边界不稳定
-   以后要接更严格的权限、RLS 或用户级查询时，很难知道该改哪一层

所以这一课真正要解决的，不是"把数据库 SDK 接进来"这么简单，而是先把两类数据职责拆开：

-   消息历史由 LangGraph checkpointer 负责
-   线程元数据由 repository 负责

## [三、核心概念](#三核心概念)

这一课最重要的概念是：`Supabase checkpointer` 管消息，`repository` 管线程元数据。

当前代码里的职责分工是这样的：

1.  `app/agent/chatbot.ts` 负责真实模型、工具调用和 LangGraph workflow
2.  `SupabaseSaver` 负责把同一 `thread_id` 下的工作流消息状态存进 Supabase
3.  `app/database/chat.repository.ts` 负责 `sessions` 表，也就是线程标题、创建时间、类型这些业务元数据
4.  `app/services/memory.service.ts` 不再自己存数据，而是变成仓储层的业务门面

这条边界非常关键，因为它回答了一个常见误区：

-   不是"接了数据库，就应该所有聊天数据都放进一个 repository"
-   而是"谁适合由工作流状态管理，谁适合由业务仓储管理"

## [四、整体流程](#四整体流程)

#\_r\_1\_{margin:1.5rem auto 0;}#\_r\_1\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_1\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_1\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_1\_ .error-icon{fill:#a44141;}#\_r\_1\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_1\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_1\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_1\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_1\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_1\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_1\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_1\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_1\_ .marker.cross{stroke:lightgrey;}#\_r\_1\_ svg{font-family:inherit;font-size:16px;}#\_r\_1\_ p{margin:0;}#\_r\_1\_ .label{font-family:inherit;color:#ccc;}#\_r\_1\_ .cluster-label text{fill:#F9FFFE;}#\_r\_1\_ .cluster-label span{color:#F9FFFE;}#\_r\_1\_ .cluster-label span p{background-color:transparent;}#\_r\_1\_ .label text,#\_r\_1\_ span{fill:#ccc;color:#ccc;}#\_r\_1\_ .node rect,#\_r\_1\_ .node circle,#\_r\_1\_ .node ellipse,#\_r\_1\_ .node polygon,#\_r\_1\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_1\_ .rough-node .label text,#\_r\_1\_ .node .label text,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-anchor:middle;}#\_r\_1\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_1\_ .rough-node .label,#\_r\_1\_ .node .label,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-align:center;}#\_r\_1\_ .node.clickable{cursor:pointer;}#\_r\_1\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_1\_ .arrowheadPath{fill:lightgrey;}#\_r\_1\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_1\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_1\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_1\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_1\_ .cluster text{fill:#F9FFFE;}#\_r\_1\_ .cluster span{color:#F9FFFE;}#\_r\_1\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_1\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_1\_ rect.text{fill:none;stroke-width:0;}#\_r\_1\_ .icon-shape,#\_r\_1\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .icon-shape p,#\_r\_1\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_1\_ .icon-shape rect,#\_r\_1\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_1\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_1\_ :root{--mermaid-font-family:inherit;}

消息历史

线程元数据

请求链路

前端发送消息

chat.service.ts

getOrCreateThread / listThreads / touchThread

memory.service.ts

chat.repository.ts

Supabase sessions 表

agent/chatbot.ts

SupabaseSaver

LangGraph checkpoint 表

## [五、Supabase 配置与数据库操作](#五supabase-配置与数据库操作)

这一课如果只看代码，很容易以为"已经 import 了 Supabase，就算接好了数据库"。实际上要让这一课真的跑起来，你还需要在 Supabase 控制台和 SQL Editor 里完成几步明确操作。

### [1\. 先确认项目环境变量](#1-先确认项目环境变量)

当前代码会直接读取：

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key
```

这两个变量和第 11 课保持一致，分别对应：

-   Supabase 项目的 `Project URL`
-   Supabase 项目的 `Publishable key`

本课新增的重点不是换新变量，而是让这套 Supabase 配置同时服务于：

-   repository
-   `SupabaseSaver`

### [2\. 在 SQL Editor 先执行课程自己的 `sessions` 表脚本](#2-在-sql-editor-先执行课程自己的-sessions-表脚本)

打开 Supabase 控制台：

`SQL Editor -> New query`

先执行课程仓库里的：

[`supabase-schema.sql`](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-05-product-foundation/lesson-12-supabase-database/supabase-schema.sql)

这一步会创建当前课程真正关心的业务表：

-   `public.sessions`

以及相关索引：

-   `idx_sessions_type`
-   `idx_sessions_created_at`

这张表只负责线程元数据，不负责消息正文。

### [3\. 再执行 checkpointer 官方迁移脚本](#3-再执行-checkpointer-官方迁移脚本)

这一课一个很容易漏掉的点是：只执行 `supabase-schema.sql` 还不够。

因为消息历史并不是保存在 `sessions` 表里，而是由 `@skroyc/langgraph-supabase-checkpointer` 负责。所以你还需要再执行包里的官方迁移脚本：

```
node_modules/@skroyc/langgraph-supabase-checkpointer/migrations.sql
```

也就是说，SQL 的执行顺序应该是：

1.  先执行课程自己的 `supabase-schema.sql`
2.  再执行 checkpointer 包自带的 `migrations.sql`

这样职责是清楚的：

-   课程仓库维护业务表
-   依赖包维护 checkpoint 相关表、索引、RLS 和 RPC

### [4\. 当前课为什么暂时关闭 `sessions` 表的 RLS](#4-当前课为什么暂时关闭-sessions-表的-rls)

`supabase-schema.sql` 里现在有一行：

```
alter table public.sessions disable row level security;
```

这不是最终产品配置，而是当前教学阶段的刻意放宽。

原因是：

1.  第 12 课重点是先让数据库边界跑通
2.  用户级隔离和更严格权限控制，后面还会继续收紧
3.  如果这一课一开始就把 RLS、用户映射、策略全部拉满，学员会同时卡在太多层

所以这里是一个"先跑通，再收紧"的课程取舍。

### [5\. 在 Table Editor 里验证到底写进了什么](#5-在-table-editor-里验证到底写进了什么)

配置完之后，最值得做的不是盲信代码，而是去 Supabase 控制台验证：

`Table Editor -> sessions`

你应该能看到：

-   新建对话后，`sessions` 表里出现一条新记录
-   `id` 是线程 id
-   `name` 会从"新对话"逐步更新成首条问题摘要

但你不会在这里看到完整聊天正文。因为正文不在 `sessions` 表里，而是在 checkpointer 那套表里。

这一步验证很重要，因为它能帮你真正建立这节课最核心的边界感。

### [6\. 这一课完成后，怎么判断数据库接入真的生效了](#6-这一课完成后怎么判断数据库接入真的生效了)

你至少可以做三组检查：

1.  发送一条新消息后，`sessions` 表里出现新线程
2.  刷新应用或重启 dev server 后，再次打开同一线程还能恢复历史
3.  侧边栏列表和历史消息恢复都还能正常工作

如果这三件事同时成立，基本就说明：

-   repository 在工作
-   `SupabaseSaver` 在工作
-   聊天主链路没有被数据库接入破坏

## [六、运行过程](#六运行过程)

### [1\. Supabase 成为正式依赖，而不是可选扩展](#1-supabase-成为正式依赖而不是可选扩展)

`app/database/supabase.ts` 在模块初始化时就直接检查：

-   `NEXT_PUBLIC_SUPABASE_URL`
-   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

这说明从这一课开始，数据库不是"以后再接"的预留，而是课程默认环境的一部分。

### [2\. 创建线程时先保证 `sessions` 表里有元数据](#2-创建线程时先保证-sessions-表里有元数据)

`memory.service.ts` 现在的 `getOrCreateThread(...)` 不再只是生成 id，而是会调用：

```
await ensureThread(id, firstPrompt?.slice(0, 24) || '新对话');
```

也就是说，从请求一开始，线程元数据就已经进入了 repository 边界。

### [3\. 消息历史恢复不走 repository，而走 checkpoint](#3-消息历史恢复不走-repository而走-checkpoint)

当前 `getChatHistory(threadId)` 的核心是：

```
const state = await getChatApp().getState({
  configurable: { thread_id: threadId },
});
```

这一步直接说明：

-   历史消息由 LangGraph 状态恢复
-   repository 不负责返回整段聊天正文

这正是这一课最重要的边界变化。

### [4\. `MemorySaver` 升级成 `SupabaseSaver`](#4-memorysaver-升级成-supabasesaver)

`app/agent/chatbot.ts` 里最核心的替换不是工作流本身，而是 checkpointer：

```
checkpointer = new SupabaseSaver(supabase);
```

从这一行开始，工作流的线程状态不再保存在进程内存，而是进入 Supabase。

### [5\. 线程标题和时间仍然单独由 repository 维护](#5-线程标题和时间仍然单独由-repository-维护)

`chat.repository.ts` 并不会去碰消息正文。它关心的是：

-   `id`
-   `name`
-   `created_at`
-   `type`

这正是侧边栏列表真正需要的业务元数据。

### [6\. 数据库边界升级后，聊天主链路仍然保持稳定](#6-数据库边界升级后聊天主链路仍然保持稳定)

这一课虽然讲数据库，但前端的：

-   模型选择
-   工具选择
-   多模态附件
-   流式事件

都继续保留。也就是说，这一课升级的是"数据落在哪里"，不是"聊天怎么玩"。

## [七、关键代码解析](#七关键代码解析)

**[app/database/supabase.ts](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-05-product-foundation/lesson-12-supabase-database/app/database/supabase.ts)** - 统一创建 Supabase 客户端。`SupabaseSaver` 和 repository 都共用这套配置。

**[app/agent/chatbot.ts](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-05-product-foundation/lesson-12-supabase-database/app/agent/chatbot.ts)** - 本课最关键的工作流文件。这里把 `MemorySaver` 升级成 `SupabaseSaver`，让消息历史进入真实数据库。

关键代码：为什么 `SupabaseSaver` 是这一课真正的消息存储入口

```
function getCheckpointer() {
  if (!checkpointer) {
    checkpointer = new SupabaseSaver(supabase);
  }
  return checkpointer;
}
```

代码解析：

这里的意义不只是"换了一个类"，而是消息历史的管理权发生了转移：

1.  之前消息历史更多依赖进程内存 checkpointer
2.  这一课开始，消息状态进入 Supabase
3.  这样服务重启后，线程上下文仍然能恢复

**[app/database/chat.repository.ts](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-05-product-foundation/lesson-12-supabase-database/app/database/chat.repository.ts)** - 负责 `sessions` 表的读写，只管理线程元数据。

关键代码：为什么 repository 只管 `sessions` 表

```
export async function listThreadSummaries(): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, name, created_at, user_id, type')
    .eq('type', 'chat')
    .order('created_at', { ascending: false });
```

代码解析：

这个查询直接说明 repository 的职责边界：

1.  它只返回侧边栏需要的线程摘要
2.  它不试图拼出完整消息历史
3.  这样"业务元数据"和"工作流状态"就不会重新混在一起

**[app/services/memory.service.ts](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-05-product-foundation/lesson-12-supabase-database/app/services/memory.service.ts)** - 从"内存持有者"变成"仓储门面"，统一暴露 `getOrCreateThread`、`touchThread`、`listThreads`。

**[app/services/chat.service.ts](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-05-product-foundation/lesson-12-supabase-database/app/services/chat.service.ts)** - 继续负责流式事件编排，但这里已经开始等待异步仓储和数据库返回。

**[supabase-schema.sql](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-05-product-foundation/lesson-12-supabase-database/supabase-schema.sql)** - 课程自己的业务表脚本。当前只维护 `sessions` 表，checkpoint 迁移继续交给依赖包官方脚本。

关键说明：

```
-- 1. 课程仓库只维护业务表 sessions
-- 2. LangGraph Supabase checkpointer 相关表、索引、RLS 和 RPC
--    请直接执行 node_modules/@skroyc/langgraph-supabase-checkpointer/migrations.sql
```

代码解析：

这个做法很务实：

1.  课程自己的业务表由课程仓库维护
2.  checkpoint 的底层表结构交给官方迁移脚本
3.  这样可以减少"依赖升级后，课程仓库里的 SQL 漂移失真"这种维护成本

## [八、常见问题](#八常见问题)

### [为什么这一课不把所有数据都放进 repository？](#为什么这一课不把所有数据都放进-repository)

因为消息历史本质上是 LangGraph 工作流状态，更适合交给 checkpointer；线程列表则是业务元数据，更适合交给 repository。

### [为什么 `memory.service.ts` 还保留这个名字？](#为什么-memoryservicets-还保留这个名字)

因为它对上层暴露的仍然是"线程管理能力"，只是底层实现已经从内存结构切换成了仓储调用。

### [为什么 `sessions` 表的 SQL 现在还比较宽松？](#为什么-sessions-表的-sql-现在还比较宽松)

因为这节课重点是先打通数据库边界。更严格的用户隔离和权限控制，会在认证和后续权限设计里继续收紧。

### [为什么执行了 `supabase-schema.sql` 之后还不够？](#为什么执行了-supabase-schemasql-之后还不够)

因为这份脚本只创建课程自己的 `sessions` 表。LangGraph checkpoint 依赖的表和 RPC 还需要包里的官方 `migrations.sql`。

## [九、练习题](#九练习题)

1.  解释为什么"消息历史"和"线程元数据"不应该由同一个层统一负责。
2.  如果后面要增加 `favorites`、`folders` 之类业务字段，你会优先改 `SupabaseSaver` 还是 `chat.repository.ts`？为什么？
3.  说一说 `SupabaseSaver` 和 `sessions` 表在这一课里分别解决什么问题。

## [十、总结](#十总结)

这一课真正完成的是：把聊天系统的数据职责拆开了。

从这一课开始，线程元数据进入 repository，消息历史进入 `SupabaseSaver`，聊天应用才真正具备继续往"真实产品数据库结构"演进的基础。

## 相关笔记

- [[4-9 Agent 的记忆系统]]
- [[3-1 Function Calling 与 Structured Output]]
- [[2-1 流式响应工程真相]]
- [[3-6 生产级权限系统的四层防线]]
- [[MOC - Chat Bot 实战|Chat Bot 实战 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
