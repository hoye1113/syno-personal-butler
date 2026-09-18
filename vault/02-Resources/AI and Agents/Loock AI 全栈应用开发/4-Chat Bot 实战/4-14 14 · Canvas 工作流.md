---
title: "14 · Canva  工作流 — Loock AI 全栈应用开发"
tags: ["loock_ai", "chatbot", "ai_agent"]
legacy_tags: ["loock_ai", "chatbot", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/chat-bot-course/06-advanced-features/14-canvas-workflow"
description: "让模型在消息正文里输出 `canva Artifact`，再把结构化 React 结果接到右侧只读 Canva  面板。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/4-Chat Bot 实战/4-14 14 · Canvas 工作流.md"
source_sha256: "a6df140f949264571148b75f1f18bece55f93239df8c111bace04c2637601b27"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第六阶段 · 高级功能

# 14 · Canvas 工作流

让模型在消息正文里输出 \`canvasArtifact\`，再把结构化 React 结果接到右侧只读 Canvas 面板。

## [课时资源](#课时资源)

-   [查看本课源码](https://github.com/loock-ai/chat-bot-course-code/tree/main/phase-06-advanced-features/lesson-14-canvas-workflow)
-   建议先读 [`app/agent/chatbot.ts`](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-06-advanced-features/lesson-14-canvas-workflow/app/agent/chatbot.ts)
-   建议先读 [`app/page.tsx`](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-06-advanced-features/lesson-14-canvas-workflow/app/page.tsx)
-   建议先读 [`app/canvas/parse-canvas-artifacts.ts`](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-06-advanced-features/lesson-14-canvas-workflow/app/canvas/parse-canvas-artifacts.ts)
-   建议先读 [`app/hooks/useCanvasArtifacts.ts`](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-06-advanced-features/lesson-14-canvas-workflow/app/hooks/useCanvasArtifacts.ts)

## [一、学习目标](#一学习目标)

本课所在阶段：`第六阶段 · 高级功能`。

学完这一课后，你应该能够：

-   解释为什么 `canvas` 会出现在工具面板里，但它本身不是一个真正的 LangChain Tool
-   看懂 `toolIds`、Canvas 系统提示、`canvasArtifact` XML、右侧 Canvas 面板之间的关系
-   理解 `app/page.tsx` 为什么��在 `messages` 变化后统一解析 assistant 正文
-   明白 `app/hooks/useCanvasArtifacts.ts` 为什么使用 `messageId -> artifactId` 的双层 `Map`
-   知道这一课只打通“生成并打开”的最小链路，还没有进入编辑、保存和分享

## [二、问题背景](#二问题背景)

第 13 课已经证明了一件事：聊天系统不只会输出纯文本，它也可以把图片工具的结果做成结构化卡片，稳定地回到消息区。

但当你开始让模型“生成一个 React 组件”时，上一课的做法就不够用了。因为组件和图片不一样，它不是一次性的附件结果，而是后续还可能继续预览、编辑、保存、分享的工作区对象。

如果继续把 JSX 当普通文本塞进气泡里，你会马上遇到三个问题：

1.  代码只能堆在消息正文里，既不方便阅读，也没有独立工作区。
2.  前端分不清这到底只是模型说的话，还是一个要被单独消费的结构化结果。
3.  后面想做预览、编辑、持久化时，没有稳定的协议边界可以承接。

所以这一课真正要解决的问题不是“右侧多一个面板”，而是先建立一条新的输出协议：

1.  模型在 assistant 正文里输出 `canvasArtifact`
2.  前端把正文里的结构化标签提取成 artifact
3.  消息区渲染一个可点击入口
4.  右侧 Canvas 先以只读方式打开结果

## [三、核心概念](#三核心概念)

### [1\. `canvas` 是能力开关，不是 LangChain Tool](#1-canvas-是能力开关不是-langchain-tool)

这一课最容易看错的地方，就是把 `canvas` 当成普通工具。

真实代码里，`app/agent/config/unified-tools.config.ts` 把它放在 `capabilityOptions`，而不是 `toolDefinitions`。这意味着：

1.  前端工具面板可以勾选 `canvas`
2.  `createLangChainTools(...)` 不会真的创建一个叫 `canvas` 的 `DynamicStructuredTool`
3.  `app/agent/chatbot.ts` 只会根据 `toolIds.includes('canvas')` 决定是否注入专用系统提示

换句话说，`canvas` 不是“让模型调用一个工具”，而是“允许模型切换到另一套正文输出协议”。

### [2\. `canvasArtifact` 同时服务消息历史和结构化渲染](#2-canvasartifact-同时服务消息历史和结构化渲染)

assistant 在这一课输出的正文，形态类似：

```
<canvasArtifact id="canvas-xxx" type="react" title="用户资料卡片">
  <canvasCode language="jsx">
    export default function UserCard() {
      return <div>...</div>;
    }
  </canvasCode>
</canvasArtifact>
```

这段内容有两层含义：

1.  对聊天历史来说，它仍然是 assistant 消息正文的一部分
2.  对前端来说，它又是一段需要被提取成 `CanvasArtifact` 的结构化协议

这就是为什么第 14 课的关键不是“再生成一段 JSX”，而是让文本流第一次长出结构化分支。

### [3\. artifact 状态按消息归档，而不是全局平铺](#3-artifact-状态按消息归档而不是全局平铺)

`app/hooks/useCanvasArtifacts.ts` 维护的是：

```
Map<string, Map<string, CanvasArtifact>>
```

这里的两层 key 分别是：

1.  外层 `messageId`
2.  内层 `artifactId`

这样设计有两个直接好处：

1.  `MarkdownRenderer` 能根据当前消息的 `messageId` 只拿到属于这条消息的 artifact
2.  当消息重新流式更新时，`page.tsx` 可以整批重算该消息的结构化结果，而不会把不同消息的 artifact 混在一起

### [4\. 本课的增量集中在渲染层，聊天主链路刻意没改](#4-本课的增量集中在渲染层聊天主链路刻意没改)

对比第 13 课，真正新增的是：

维度

第 13 课

第 14 课

高级输出类型

`<imagecard>`

`<canvasArtifact>`

触发方式

真实工具调用

`canvas` 能力开关 + 系统提示

前端状态

只管理消息与工具调用

新增 `canvasStore` 管理 artifact

右侧面板

没有

新增只读 `CanvasPanel`

同时有几条链路刻意没改：

1.  `app/api/chat/route.ts` 的 SSE 主链路仍然沿用上一课
2.  图片工具、时间工具、计算器的注册方式不变
3.  `tool.call` 事件仍然只服务真实工具，不服务 `canvas`

这说明第 14 课的目标很克制：先把 Canvas 作为“新输出协议”插进去，而不是重做整个聊天系统。

## [四、关键文件](#四关键文件)

相对第 13 课，本课真正新增的源码集中在 Canvas 子系统：

-   `app/canvas/canvas-prompt.ts`
-   `app/canvas/canvas-types.ts`
-   `app/canvas/parse-canvas-artifacts.ts`
-   `app/components/canvas/CanvasPanel.tsx`
-   `app/components/canvas/CanvasTitleCard.tsx`
-   `app/hooks/useCanvasArtifacts.ts`

最值得你先读的文件如下。

**[`app/agent/config/unified-tools.config.ts`](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-06-advanced-features/lesson-14-canvas-workflow/app/agent/config/unified-tools.config.ts)**

这里定义了 `canvas` 为什么会出现在工具面板里，同时又不会被创建成真实工具实例。

**[`app/agent/chatbot.ts`](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-06-advanced-features/lesson-14-canvas-workflow/app/agent/chatbot.ts)**

这是 Canvas 协议真正生效的入口。它根据 `toolIds` 决定是否注入 `getCanvasSystemPrompt(...)`。

**[`app/canvas/canvas-prompt.ts`](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-06-advanced-features/lesson-14-canvas-workflow/app/canvas/canvas-prompt.ts)**

这里规定了模型输出 `canvasArtifact` 时必须遵守的格式，是协议边界最硬的一层约束。

**[`app/canvas/parse-canvas-artifacts.ts`](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-06-advanced-features/lesson-14-canvas-workflow/app/canvas/parse-canvas-artifacts.ts)**

它把 assistant 正文里的 XML 标签提取成 `CanvasArtifact[]`，是“文本流进入结构化状态”的关键一跳。

**[`app/hooks/useCanvasArtifacts.ts`](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-06-advanced-features/lesson-14-canvas-workflow/app/hooks/useCanvasArtifacts.ts)**

这是本课的最小 store，实现了 artifact 归档、激活项切换和右侧 Canvas 开关。

**[`app/page.tsx`](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-06-advanced-features/lesson-14-canvas-workflow/app/page.tsx)**

它负责在消息变化时重算 artifact，并把当前激活结果传给 `CanvasPanel`。

**[`app/components/MarkdownRenderer.tsx`](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-06-advanced-features/lesson-14-canvas-workflow/app/components/MarkdownRenderer.tsx)**

这里把 `<canvasartifact>` 自定义标签映射成 `CanvasTitleCard`，让消息气泡里出现“打开 Canvas”的入口。

**[`app/components/canvas/CanvasPanel.tsx`](https://github.com/loock-ai/chat-bot-course-code/blob/main/phase-06-advanced-features/lesson-14-canvas-workflow/app/components/canvas/CanvasPanel.tsx)**

右侧只读工作区。它现在只提供 `预览` 和 `代码` 两个标签页，没有编辑器、保存和分享。

## [五、整体流程](#五整体流程)

#\_r\_2\_{margin:1.5rem auto 0;}#\_r\_2\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_2\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_2\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_2\_ .error-icon{fill:#a44141;}#\_r\_2\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_2\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_2\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_2\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_2\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_2\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_2\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_2\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_2\_ .marker.cross{stroke:lightgrey;}#\_r\_2\_ svg{font-family:inherit;font-size:16px;}#\_r\_2\_ p{margin:0;}#\_r\_2\_ .label{font-family:inherit;color:#ccc;}#\_r\_2\_ .cluster-label text{fill:#F9FFFE;}#\_r\_2\_ .cluster-label span{color:#F9FFFE;}#\_r\_2\_ .cluster-label span p{background-color:transparent;}#\_r\_2\_ .label text,#\_r\_2\_ span{fill:#ccc;color:#ccc;}#\_r\_2\_ .node rect,#\_r\_2\_ .node circle,#\_r\_2\_ .node ellipse,#\_r\_2\_ .node polygon,#\_r\_2\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_2\_ .rough-node .label text,#\_r\_2\_ .node .label text,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-anchor:middle;}#\_r\_2\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_2\_ .rough-node .label,#\_r\_2\_ .node .label,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-align:center;}#\_r\_2\_ .node.clickable{cursor:pointer;}#\_r\_2\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_2\_ .arrowheadPath{fill:lightgrey;}#\_r\_2\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_2\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_2\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_2\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_2\_ .cluster text{fill:#F9FFFE;}#\_r\_2\_ .cluster span{color:#F9FFFE;}#\_r\_2\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_2\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_2\_ rect.text{fill:none;stroke-width:0;}#\_r\_2\_ .icon-shape,#\_r\_2\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .icon-shape p,#\_r\_2\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_2\_ .icon-shape rect,#\_r\_2\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_2\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_2\_ :root{--mermaid-font-family:inherit;}

正文解析与状态归档

模型提示与正文协议

前端输入与渲染

ToolPanel 勾选 canvas

app/page.tsx 提交 toolIds

app/components/MarkdownRenderer.tsx 渲染入口卡片

app/components/canvas/CanvasPanel.tsx 打开只读 Canvas

app/agent/chatbot.ts 判断 canvasEnabled

app/canvas/canvas-prompt.ts 约束 canvasArtifact

assistant 正文输出 canvasArtifact

app/canvas/parse-canvas-artifacts.ts 提取 artifact

app/hooks/useCanvasArtifacts.ts 按 messageId 归档

这张图里最值得你记住的一点是：Canvas 没有新开一条独立 API，它仍然从原有聊天流里长出来，只是 assistant 正文多了一种结构化协议。

## [六、运行过程](#六运行过程)

### [1\. 前端把 `canvas` 当成一种可选能力提交](#1-前端把-canvas-当成一种可选能力提交)

勾选 Canvas 之后，`app/page.tsx` 仍然像前几课一样把 `toolIds` 一起发给 `api/chat`。区别只在于：

1.  `canvas` 会出现在 `toolIds` 里
2.  但后端不会把它转成真实工具
3.  它只负责告诉模型“这一轮允许输出 Canvas 协议”

### [2\. `app/agent/chatbot.ts` 根据 `toolIds` 决定提示词](#2-appagentchatbotts-根据-toolids-决定提示词)

这一课的协议切换点很集中：

1.  如果启用了 `canvas`，优先注入 `getCanvasSystemPrompt(generateArtifactId())`
2.  否则如果只是启用了普通工具，再注入 `getToolUsagePrompt()`

这说明 Canvas 的本质是“改变正文输出格式”，不是“多执行一个工具函数”。

### [3\. assistant 在正文里输出 `canvasArtifact`](#3-assistant-在正文里输出-canvasartifact)

模型命中 Canvas 场景后，会在消息正文里输出：

1.  `<canvasArtifact>`
2.  `id`、`title`
3.  `<canvasCode language="jsx">`
4.  一段完整的 `export default function`

只要这个格式漂掉，后面的解析和渲染就会断，所以 `app/canvas/canvas-prompt.ts` 把规则写得非常死。

### [4\. `app/page.tsx` 每次消息变化都会重新解析 artifact](#4-apppagetsx-每次消息变化都会重新解析-artifact)

这一步没有额外事件流，做法非常直接：

1.  遍历所有 assistant 消息
2.  调用 `parseCanvasArtifactsFromContent(message.id, message.content)`
3.  再统一交给 `canvasStore.replaceArtifacts(...)`

这样设计的好处是：你不需要再学一套新的 Canvas 流式协议，只要理解“结构化结果先依附在正文里，再从正文里提取”。

### [5\. `MarkdownRenderer` 负责把 XML 入口换成可点击卡片](#5-markdownrenderer-负责把-xml-入口换成可点击卡片)

`app/components/MessageBubble.tsx` 会把 `message.id` 继续传给 `MarkdownRenderer`。后者识别 `<canvasartifact>` 后，会：

1.  根据 `messageId + artifactId` 从 store 里找到对应 artifact
2.  把原始 XML 替换成 `CanvasTitleCard`
3.  点击卡片后打开右侧 Canvas

### [6\. `CanvasPanel` 目前仍然是只读查看器](#6-canvaspanel-目前仍然是只读查看器)

本课的右侧面板只做两件事：

1.  预览 JSX 结果
2.  查看原始代码

它还没有编辑器、保存按钮、分享页或数据库持久化。这些能力会留到下一课继续补齐。

## [七、关键代码解析](#七关键代码解析)

**关键代码 1：`app/agent/chatbot.ts` 用系统提示切换 Canvas 协议**

```
const tools = createLangChainTools(toolIds);
const canvasEnabled = toolIds?.includes('canvas') ?? false;
const hasSelectedTools = tools.length > 0;
if (canvasEnabled) {
  modelMessages = [new SystemMessage(getCanvasSystemPrompt(generateArtifactId())), ...modelMessages];
} else if (hasSelectedTools) {
  modelMessages = [new SystemMessage(getToolUsagePrompt()), ...modelMessages];
}
```

**代码解析：**

1.  `canvasEnabled` 的来源只是 `toolIds`，而不是一个真实工具实例。
2.  这里做的事情不是“绑定一个新工具”，而是“改写模型本轮必须遵守的正文协议”。
3.  如果没有这段分支，模型就不知道要输出 `canvasArtifact`，后面的解析器和右侧面板都无从谈起。

**关键代码 2：`app/page.tsx` 在消息层统一提取 artifact**

```
useEffect(() => {
  const artifacts = messages.flatMap((message) =>
    message.role === 'assistant' ? parseCanvasArtifactsFromContent(message.id, message.content) : [],
  );
  canvasStore.replaceArtifacts(artifacts);
}, [messages]);
```

**代码解析：**

1.  这段代码把“消息流”和“结构化工作区状态”连接起来了。
2.  解析动作放在页面层，而不是放进 API 或 store 内部，意味着 artifact 永远是��从当前消息重新计算出来”的派生数据。
3.  如果没有这一步，`MarkdownRenderer` 找不到对应 artifact，右侧 Canvas 也拿不到当前激活项。

**关键代码 3：`app/components/MarkdownRenderer.tsx` 把 XML 节点变成 Canvas 入口卡片**

```
function handleOpenArtifact(artifactId: string) {
  canvasStore.setActiveArtifactId(artifactId);
  canvasStore.setIsCanvasVisible(true);
}
canvasartifact: ({ node, ...props }: any) => (
  <CanvasTitleCard
    key={props.id || 'canvas-artifact'}
    artifact={getArtifact(props.id || 'canvas-artifact')}
    onOpen={handleOpenArtifact}
  />
),
```

**代码解析：**

1.  这段映射告诉你：消息气泡里看到的不是 XML 原文，而是一个组件化入口。
2.  点击行为只做两件事，设置激活 artifact 和打开右侧面板，职责边界非常清楚。
3.  如果没有这个映射，Canvas 协议虽然已经写进正文，但学习者只能看到一堆标签，体验会直接断掉。

## [八、常见问题](#八常见问题)

### [1\. 为什么这一课不用 `tool.call` 事件来承接 Canvas？](#1-为什么这一课不用-toolcall-事件来承接-canvas)

因为这一课要解决的是“正文协议扩展”，不是“新工具执行流程”。`tool.call` 适合承接真实工具，而 `canvasArtifact` 需要随着 assistant 正文一起进入消息历史。

### [2\. 为什么 store 要按 `messageId` 分组，而不是只用 `artifactId`？](#2-为什么-store-要按-messageid-分组而不是只用-artifactid)

因为一条 assistant 消息可能包含多个 artifact，而且消息流会被重新计算。按消息归档后，`MarkdownRenderer` 才能稳定拿到“属于当前消息”的结构化结果。

### [3\. 为什么右侧 Canvas 先只做只读？](#3-为什么右侧-canvas-先只做只读)

因为本课优先解决“协议是否跑通”。如果这一层都还没稳定，后面加编辑、保存、分享只会把问题叠得更乱。

### [4\. 如果模型没有严格输出 XML，会发生什么？](#4-如果模型没有严格输出-xml会发生什么)

`app/canvas/parse-canvas-artifacts.ts` 解析不到合法结构，消息区就不会出现 `CanvasTitleCard`，右侧 Canvas 也不会有对应 artifact。这正是系统提示必须严格约束格式的原因。

## [九、练习题](#九练习题)

1.  给 `canvasArtifact` 增加一个 `subtitle` 属性，并把它展示在 `CanvasTitleCard` 里。
2.  让 `CanvasPanel` 默认打开“代码”标签页，再思考这会不会影响本课的教学节奏。
3.  把 `parseCanvasArtifactsFromContent(...)` 改成支持多个 `canvasCode` 片段，思考 store 结构是否还够用。

## [十、总结](#十总结)

第 14 课真正新增的不是一个 UI 面板，而是一条新的正文协议。

你现在已经有了三个关键能力：

1.  用 `canvas` 能力开关告诉模型“这一轮允许输出结构化组件”
2.  把 assistant 正文里的 `canvasArtifact` 解析成前端状态
3.  在消息区给出入口，并在右侧 Canvas 打开只读结果

这条链路一旦跑通，下一课就可以在不重做协议的前提下，继续把右侧 Canvas 升级成真正可编辑、可保存、可分享的工作区。

## 相关笔记

- [[3-1 Function Calling 与 Structured Output]]
- [[2-3 Agent Loop 保险丝]]
- [[2-1 流式响应工程真相]]
- [[MOC - Chat Bot 实战|Chat Bot 实战 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
