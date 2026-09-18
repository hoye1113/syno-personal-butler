---
title: "13 · Google 图片生成工具 — Loock AI 全栈应用开发"
tags: ["loock_ai", "chatbot", "ai_agent"]
legacy_tags: ["loock_ai", "chatbot", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/chat-bot-course/06-advanced-features/13-google-image-generation-tool"
description: "在统一工具系统中接入真实图片生成 API，让工具结果以 loading 卡片和最终图片卡片两段式进入聊天界面。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/4-Chat Bot 实战/4-13 13 · Google 图片生成工具.md"
source_sha256: "502e38386d43000ee11666cdaffd9cba09e4a2c64ea235495d3783929c57a997"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第六阶段 · 高级功能

# 13 · Google 图片生成工具

在统一工具系统中接入真实图片生成 API，让工具结果以 loading 卡片和最终图片卡片两段式进入聊天界面。

## [课时资源](#课时资源)

-   [查看本课源码](https://github.com/loock-ai/chat-bot-course-code/tree/main/phase-06-advanced-features/lesson-13-google-image-generation-tool)

## [一、学习目标](#一学习目标)

本课所在阶段：`第六阶段 · 高级功能`。

学完这一课后，你应该能够：

-   说清为什么图片工具仍然应该走统一工具配置，而不是单独开一条特殊 API
-   看懂图片工具的结果为什么不是一次性直接落到消息气泡，而是先经过工具过程态，再进入最终回复
-   理解 `tool.call` 占位事件和完成事件各自负责什么
-   明白为什么最终图片展示是 `markdown -> imagecard -> ImageCard` 这条渲染链，而不是工具卡片里直接塞一张图
-   认识这一课已经接入真实 Google 图片生成 API，并把结果上传到 Supabase Storage

## [二、问题背景](#二问题背景)

到了第十二课，聊天系统已经具备真实数据库边界，但工具结果仍然主要是文本。

这时会出现一个新问题：如果模型调用的不是"查时间"或"算表达式"这种文本工具，而是"生成一张图片"，系统该如何承接？

如果没有这一课，后面的高级输出能力会卡在几个地方：

-   工具只能返回字符串，无法表达更丰富的结果结构
-   前端看不到清晰的"图片生成中"过程态
-   最终回复没办法把图片作为正式内容的一部分渲染出来

所以这一课真正解决的不是"接一个图片 API"这么简单，而是把图片型工具纳入现有 Agent 链路，并让 UI 能稳定地展示过程态和完成态。

## [三、核心概念](#三核心概念)

这一课最重要的概念是：图片工具的结果要分成两层展示。

第一层是工具调用过程：

-   `on_chat_model_end` 先发出占位 `tool.call`
-   前端先展示工具卡片和 loading `ImageCard`

第二层是 assistant 最终回复：

-   工具完成后返回 `output`、`imageUrl`、`markdown`
-   `message.end` 时把 `markdown` 片段拼进 assistant 消息正文
-   `MarkdownRenderer` 再把 `<imagecard>` 解析成真正的 `ImageCard`

这意味着当前代码里，工具卡片和最终消息不是同一件事：

-   `ToolCallDisplay` 负责展示"工具正在做什么"
-   `MarkdownRenderer` 负责展示"assistant 最终回复里真正要呈现什么"

## [四、整体流程](#四整体流程)

#\_r\_1\_{margin:1.5rem auto 0;}#\_r\_1\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_1\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_1\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_1\_ .error-icon{fill:#a44141;}#\_r\_1\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_1\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_1\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_1\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_1\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_1\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_1\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_1\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_1\_ .marker.cross{stroke:lightgrey;}#\_r\_1\_ svg{font-family:inherit;font-size:16px;}#\_r\_1\_ p{margin:0;}#\_r\_1\_ .label{font-family:inherit;color:#ccc;}#\_r\_1\_ .cluster-label text{fill:#F9FFFE;}#\_r\_1\_ .cluster-label span{color:#F9FFFE;}#\_r\_1\_ .cluster-label span p{background-color:transparent;}#\_r\_1\_ .label text,#\_r\_1\_ span{fill:#ccc;color:#ccc;}#\_r\_1\_ .node rect,#\_r\_1\_ .node circle,#\_r\_1\_ .node ellipse,#\_r\_1\_ .node polygon,#\_r\_1\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_1\_ .rough-node .label text,#\_r\_1\_ .node .label text,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-anchor:middle;}#\_r\_1\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_1\_ .rough-node .label,#\_r\_1\_ .node .label,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-align:center;}#\_r\_1\_ .node.clickable{cursor:pointer;}#\_r\_1\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_1\_ .arrowheadPath{fill:lightgrey;}#\_r\_1\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_1\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_1\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_1\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_1\_ .cluster text{fill:#F9FFFE;}#\_r\_1\_ .cluster span{color:#F9FFFE;}#\_r\_1\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_1\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_1\_ rect.text{fill:none;stroke-width:0;}#\_r\_1\_ .icon-shape,#\_r\_1\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .icon-shape p,#\_r\_1\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_1\_ .icon-shape rect,#\_r\_1\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_1\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_1\_ :root{--mermaid-font-family:inherit;}

事件流与前端状态

Agent 与工具执行

输入与工具选择

用户发送图片生成请求

ToolPanel 选择启用工具

page.tsx 提交 modelId / toolIds / message

chatbot.ts 绑定统一工具

模型决定调用 google\_image\_generation

google-image-generation.ts 调 Google API

上传结果到 Supabase Storage

on\_chat\_model\_end 发占位 tool.call

ToolCallDisplay 显示 loading ImageCard

on\_tool\_end 发完成 tool.call

page.tsx 在 message.end 拼接 markdown

MarkdownRenderer 把 imagecard 渲染成 ImageCard

## [五、运行过程](#五运行过程)

### [1\. 图片工具继续走统一工具配置](#1-图片工具继续走统一工具配置)

前端不会为图片生成单独发一个特殊请求，而是和前一课一样，把 `toolIds` 一起发给后端。

这样 `chatbot.ts` 里只需要：

-   根据 `toolIds` 创建 LangChain tools
-   让模型决定是否调用 `google_image_generation`

这一步说明图片工具虽然能力更复杂，但系统结构并没有分叉。

### [2\. 图片生成现在已经是"真实 API + Storage"链路](#2-图片生成现在已经是真实-api--storage链路)

这一课当前代码已经接入真实的 Google 图片生成链路。

`google-image-generation.ts` 里会：

-   读取 `GOOGLE_API_KEY`
-   调用 `gemini-3-pro-image-preview`
-   从响应里取出图片二进制
-   上传到 Supabase Storage
-   返回可公开访问的 `imageUrl`

这里多出来的"上传到 Supabase Storage"不是附带动作，而是这条链路里非常关键的一步。

因为 Google 图片接口返回的是工具执行当下拿到的图片数据，前端消息流本身并不适合一直携带这段二进制内容。先上传到 Supabase Storage，有两个直接好处：

-   后端可以把图片换成一个稳定可访问的公网 URL
-   前端无论是在工具过程卡片里，还是在 assistant 最终消息里的 `<imagecard>` 里，都只需要消费同一个 `imageUrl`

这样图片结果就从"一次请求里的临时产物"变成了"聊天记录中可重复访问的资源"。

如果你想对照 Google 官方 SDK 的调用方式，可以参考 [Gemini API 图片生成文档（JavaScript）](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#javascript)。

也就是说，这一课的重点已经从"本地模拟一张图片结果"升级成"把真实图片结果送回聊天界面"。

### [3\. `tool.call` 不是一次性完成，而是先占位再补全](#3-toolcall-不是一次性完成而是先占位再补全)

`chatbot.ts` 里的事件流有一个很关键的升级：

-   `on_chat_model_end` 先读出模型决定调用的工具，发出只包含 `id`、`name`、`args` 的占位 `tool.call`
-   `on_tool_end` 再把 `output`、`imageUrl`、`markdown` 补回来

这一步非常重要，因为它给了前端明确的"过程态"。

### [4\. 前端会按 `toolCall.id` 合并同一条工具调用](#4-前端会按-toolcallid-合并同一条工具调用)

`page.tsx` 里的 `attachToolCall(...)` 不是简单 `push`，而是：

-   先找有没有同一个 `toolCall.id`
-   有就合并
-   没有才新增

所以同一条图片工具调用会经历：

1.  先出现 loading 卡片
2.  再变成完成态结果

而不是前端列表里插入两条重复工具记录。

### [5\. 最终图片不在工具卡片里直接展示](#5-最终图片不在工具卡片里直接展示)

这是这一课最容易看错的地方。

当前 `ToolCallDisplay.tsx` 的设计是：

-   图片工具未完成时：显示 loading `ImageCard`
-   图片工具完成后：只显示一句"图片已生成，结果会显示在下方回复中"

真正的图片结果会在 `message.end` 时，通过 `finishAssistantMessage(...)` 把 `toolCall.markdown` 追加到 assistant 消息正文。

### [6\. 最终图片展示由 MarkdownRenderer 完成](#6-最终图片展示由-markdownrenderer-完成)

工具返回的 `markdown` 片段形如：

```
<imagecard status="ready" src="..." prompt="..."></imagecard>
```

assistant 气泡不是直接渲染纯文本，而是走 `MarkdownRenderer`：

-   `react-markdown`
-   `rehype-raw`
-   自定义 `imagecard` 组件映射

最后才变成真正的 `ImageCard`。

## [六、关键代码解析](#六关键代码解析)

**[app/agent/config/unified-tools.config.ts](app/agent/config/unified-tools.config.ts)** - 统一工具配置，把图片工具接入统一工具注册表

关键代码：

```
{
  id: 'google_image_generation',
  name: 'google_image_generation',
  description: '生成图片',
  icon: '🖼️',
  enabled: true,
  schema: z.object({
    prompt: z.string().describe('要生成图片的描述'),
    aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional().default('1:1'),
    imageSize: z.enum(['1K', '2K', '4K']).optional().default('1K'),
  }),
  handler: async (input) =>
    generateImageWithGoogle({
      prompt: String(input.prompt || 'Generated image'),
      aspectRatio: input.aspectRatio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | undefined,
      imageSize: input.imageSize as '1K' | '2K' | '4K' | undefined,
    }),
}
```

代码解析：

1.  图片工具和文本工具放在同一张 `toolDefinitions` 表里
2.  模型可以拿到更完整的工具参数约束，而不只是一个 `prompt`
3.  高级工具的接入方式仍然和前面课时保持一致

**[app/agent/tools/google-image-generation.ts](app/agent/tools/google-image-generation.ts)** - 真实图片生成工具实现，调用 Google API 并上传到 Storage

关键代码：

```
return {
  output: '图片已生成，请在最终回复中直接展示图片卡片，不要把标签放进代码块。',
  imageUrl: uploadResult.url,
  markdown: `<imagecard status="ready" src="${uploadResult.url}" download="${uploadResult.url}" prompt="${prompt.replace(/"/g, '&quot;')}" aspectRatio="${aspectRatio}"></imagecard>`,
};
```

代码解析：

1.  `output` 给工具过程态和模型补充说明
2.  `imageUrl` 不是 Google 原始响应直接暴露出来的字段，而是图片上传到 Supabase Storage 之后得到的公开地址
3.  有了这个公开地址，前端过程组件和最终消息渲染都可以复用同一张图片资源
4.  `markdown` 决定最终 assistant 回复里要出现什么内容

**[app/page.tsx](app/page.tsx)** - 在流式事件里挂接工具调用，并在消息结束时拼接 markdown

关键代码：

```
const markdownSnippets = (message.toolCalls ?? [])
  .map((toolCall) => toolCall.markdown)
  .filter((snippet): snippet is string => typeof snippet === 'string' && snippet.length > 0)
  .filter((snippet) => !message.content.includes(snippet));
const extraContent = markdownSnippets.length > 0 ? `\n\n${markdownSnippets.join('\n\n')}` : '';
```

代码解析：

1.  工具调用过程和最终回复正文是分开的
2.  只有在 assistant 这一轮回复结束时，才把图片卡片正式并入消息内容
3.  这样 UI 才能同时保留过程态和结果态，不会互相打架

**[app/agent/chatbot.ts](app/agent/chatbot.ts)** - 负责两段式 `tool.call` 事件和图片工具结果解析

代码解析：

1.  `on_chat_model_end` 发出占位 `tool.call` 事件（只包含 `id`、`name`、`args`）
2.  `on_tool_end` 补充完整的工具结果（包含 `output`、`imageUrl`、`markdown`）
3.  使用 `SupabaseSaver` 保持线程状态持久化
4.  注意：代码日志使用 `[lesson-13]` 前缀，后续课程复用此文件时未更新日志标记

**[app/components/ToolCallDisplay.tsx](app/components/ToolCallDisplay.tsx)** - 展示工具过程态，图片工具完成后提示结果在下方

代码解析：

1.  未完成时显示 loading `ImageCard`
2.  完成后只提示"结果会显示在下方回复中"
3.  保持工具卡片作为"过程信息"的职责边界

**[app/components/MarkdownRenderer.tsx](app/components/MarkdownRenderer.tsx)** - 把 assistant 消息里的 `<imagecard>` 渲染成真正的图片卡片组件

代码解析：

1.  使用 `react-markdown` 和 `rehype-raw` 解析自定义标签
2.  把 `imagecard` 标签映射到 `ImageCard` 组件
3.  形成最终的图片展示渲染链

## [七、和旧实现说明的差别](#七和旧实现说明的差别)

如果你看过这一课较早的 README，会发现现在的代码已经发生了几个关键变化：

-   不再是本地 SVG 预览方案，而是接入真实 Google 图片生成 API
-   不再是工具卡片里直接把图片渲染完就结束
-   `ToolCallRecord` 现在除了 `output`、`imageUrl`，还新增了 `markdown`
-   图片结果最终进入 assistant 回复，而不是停留在工具过程区

所以这一课现在更准确的主线应该是：

-   统一工具配置扩展到高级工具
-   工具事件升级成占位态和完成态两段式
-   消息渲染升级成"过程展示 + 最终展示"两层

## [八、常见问题](#八常见问题)

### [这一课还沿用第十二课的数据库边界吗？](#这一课还沿用第十二课的数据库边界吗)

沿用。当前 `chatbot.ts` 继续使用 `SupabaseSaver`，线程元数据边界也还在 Supabase 那条链路上。

### [为什么图片完成后，工具卡片里反而不直接显示图片？](#为什么图片完成后工具卡片里反而不直接显示图片)

因为工具卡片负责的是"过程信息"，最终内容应该作为 assistant 回复的一部分出现。这样聊天记录在回放时语义更稳定。

### [为什么还要引入 `markdown`，不能只靠 `imageUrl` 吗？](#为什么还要引入-markdown不能只靠-imageurl-吗)

只靠 `imageUrl` 只能说明"有一张图"。加入 `markdown` 之后，最终渲染协议就能继续扩展到更多自定义组件，而不只是图片。

### [这一课真正升级的点是什么？](#这一课真正升级的点是什么)

不是单纯加了一个图片工具，而是让高级工具第一次具备了完整的事件流、结构化结果和最终消息渲染链。

## [九、练习题](#九练习题)

1.  解释为什么同一条图片工具调用要分成占位 `tool.call` 和完成 `tool.call` 两个阶段。
2.  如果要增加"下载图片"或"提示词"能力，你会优先改 `ImageCard` 还是 `ToolCallDisplay`？为什么？
3.  说清 `imageUrl` 和 `markdown` 在这一课里分别承担什么职责。

## [十、总结](#十总结)

这一课真正完成的是：让高级工具第一次以"真实图片 API + 两段式事件流 + 最终消息渲染协议"的方式进入聊天系统。

从这一课开始，工具已经不只是给 assistant 补一句文本，而是可以生成真正的多媒体结果，并以课程后续还能继续扩展的结构进入 UI。

## 相关笔记

- [[4-6 RAG 全流程]]
- [[3-1 Function Calling 与 Structured Output]]
- [[2-3 Agent Loop 保险丝]]
- [[2-1 流式响应工程真相]]
- [[MOC - Chat Bot 实战|Chat Bot 实战 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
