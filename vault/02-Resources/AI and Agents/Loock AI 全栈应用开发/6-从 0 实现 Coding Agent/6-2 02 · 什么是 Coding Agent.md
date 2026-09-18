---
title: "02 · 什么是 Coding Agent — Loock AI 全栈应用开发"
tags: ["loock_ai", "coding_agent", "ai_agent"]
legacy_tags: ["loock_ai", "coding_agent", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/mini-coding-agent/00-intro/02-what-is-coding-agent"
description: "理解 Coding Agent 的精确定义、能力边界和核心闭环，为后续实现建立统一认知。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/6-从 0 实现 Coding Agent/6-2 02 · 什么是 Coding Agent.md"
source_sha256: "e96d8b09f4fcc44c1b9d5195bbcc9dcdc37d858c5c2f470ccf54d98e262c92eb"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

第 0 章 · 建立全局认知

# 02 · 什么是 Coding Agent

理解 Coding Agent 的精确定义、能力边界和核心闭环，为后续实现建立统一认知。

## ["Coding Agent" 到底在说什么](#coding-agent-到底在说什么)

GitHub Copilot 说自己是 Coding Agent，Claude Code 说自己是 Coding Agent，Cursor 也说自己是 Coding Agent。甚至一些只能在你打字时预测下一行的插件，也开始用这个词做宣传。

但如果你去看这些产品的实际能力，会发现它们做的事情差别很大。有的只能在你当前光标位置补全几行代码，有的能读项目、改文件、跑测试、甚至自己决定下一步该干什么。如果不把这中间的能力层级区分清楚，后面实现的时候就会遇到两个问题：你不知道自己的 agent 做到什么程度才算"完成了"，或者你把不同层级的能力混在一起实现，导致架构边界模糊。

所以这一课要做的事情不是介绍某个具体产品，而是建立一个分类框架，让你知道 Coding Agent 在这个框架里处于什么位置，以及它需要具备哪些核心能力。

## [从补全到自主：编程助手的四个层级](#从补全到自主编程助手的四个层级)

按照自主行动能力从弱到强，现有的编程助手可以分成四层。

### [第一层：补全助手](#第一层补全助手)

早期 GitHub Copilot、IDE 内置补全都属于这一层。你写了一行代码，它根据上下文预测接下来的几行，你按 Tab 接受，或者继续自己写。

它的能力边界很明确：只能在你当前的光标位置生成文本。它不会主动搜索项目里的其他文件，不会帮你运行命令，也不会自己决定"这段代码需要改三个地方"。

### [第二层：聊天助手](#第二层聊天助手)

ChatGPT 网页版、IDE 里的侧边栏聊天属于这一层。你提一个问题，它给你一段回答。你可以把代码贴进去问"这段有什么问题"，它会分析并给出建议。

比补全助手强的地方在于：它能处理更复杂的推理任务。但它仍然有一个硬限制——它只能回答，不能动手。它能告诉你"你应该把这个函数的参数类型改成 string"，但它不会帮你打开文件、定位到那一行、改完之后跑一遍测试。

### [第三层：工作流 Agent](#第三层工作流-agent)

GitHub Actions 里的 AI 步骤、一些预定义的代码审查流水线属于这一层。流程是预先定义好的，LLM 只在流程的某些节点上参与决策。比如一个代码审查工作流可能是：拉取 PR 的 diff，交给 LLM 分析代码质量，根据 LLM 输出自动生成 review comment。

比聊天助手强的地方在于：它能真正执行动作（拉代码、发评论）。但它的行动路径是写死的，每一步做什么、先做什么后做什么，都是人提前设计好的。如果遇到预设流程没覆盖到的情况，它不会自己调整策略。

### [第四层：Coding Agent](#第四层coding-agent)

Claude Code、Codex CLI、Gemini CLI、OpenCode 属于这一层。你给它一个任务，它自己决定怎么做。它会读代码、搜索文件、修改文件、运行命令、查看结果，然后根据结果决定下一步。整个过程中没有人提前告诉它"先做 A 再做 B"。

这一层和前三层的根本区别在于：它有一个自主决策的循环。它不是被动的工具，而是一个能根据中间结果不断调整策略的执行者。

### [四层能力对比](#四层能力对比)

维度

补全助手

聊天助手

工作流 Agent

Coding Agent

能否理解任务意图

有限

能

能

能

能否搜索项目上下文

否

有限（靠人工粘贴）

预定义范围

自主搜索

能否修改文件

否

否

预定义步骤

自主决定

能否执行命令

否

否

预定义步骤

自主决定

能否根据结果调整策略

否

否

否

能

行动路径

无

无

预定义流程

自主决策

## ["能回答"和"能执行"之间的鸿沟](#能回答和能执行之间的鸿沟)

看完四层分类，一个自然的问题是：聊天助手已经能回答大多数编程问题了，为什么还需要能自主执行的 Agent？

答案在于：真实的开发任务通常不是"回答一个问题"，而是"完成一个改动"。

用一个具体例子来说明。假设你的任务是："给这个 Express 项目加一个 `/api/health` 健康检查端点"。

用聊天助手，对话大概是这样的：

> 你：帮我给这个项目加一个健康检查端点
> 
> 助手：好的，你可以在 `app.js` 里加这样一段代码...
> 
> （你手动打开 app.js，找到合适的位置，粘贴代码）
> 
> 你：加好了，但是启动报错了，错误是...
> 
> 助手：这是因为缺少依赖，你需要先安装 express...
> 
> （你手动运行 npm install）
> 
> 你：装好了，但是返回 404...
> 
> 助手：你的路由可能挂载在了错误的路径上...

来回好几轮，每一步都需要你手动操作、手动反馈结果。

换成 Coding Agent，过程是这样的：

> 你：给这个项目加一个 `/api/health` 健康检查端点
> 
> Agent：我先看一下项目结构... 找到了 `src/app.ts`，当前用的是 Express... 我在路由注册区域加上这个端点... 我运行一下测试... 测试通过了。改动在 `src/app.ts` 第 42 行。

你只需要说一句话，Agent 自己完成了搜索、理解、修改、验证的全过程。差异不在于"谁更聪明"，而在于谁能把回答变成行动。聊天助手能给出正确的方案，但它无法把这个方案落地到你的代码仓库里。Coding Agent 可以。

## [Agent 闭环：一个自己转起来的轮子](#agent-闭环一个自己转起来的轮子)

Coding Agent 的核心是一个不断循环的决策过程：

#\_r\_2\_{margin:1.5rem auto 0;}#\_r\_2\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_2\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_2\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_2\_ .error-icon{fill:#a44141;}#\_r\_2\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_2\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_2\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_2\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_2\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_2\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_2\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_2\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_2\_ .marker.cross{stroke:lightgrey;}#\_r\_2\_ svg{font-family:inherit;font-size:16px;}#\_r\_2\_ p{margin:0;}#\_r\_2\_ .label{font-family:inherit;color:#ccc;}#\_r\_2\_ .cluster-label text{fill:#F9FFFE;}#\_r\_2\_ .cluster-label span{color:#F9FFFE;}#\_r\_2\_ .cluster-label span p{background-color:transparent;}#\_r\_2\_ .label text,#\_r\_2\_ span{fill:#ccc;color:#ccc;}#\_r\_2\_ .node rect,#\_r\_2\_ .node circle,#\_r\_2\_ .node ellipse,#\_r\_2\_ .node polygon,#\_r\_2\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_2\_ .rough-node .label text,#\_r\_2\_ .node .label text,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-anchor:middle;}#\_r\_2\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_2\_ .rough-node .label,#\_r\_2\_ .node .label,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-align:center;}#\_r\_2\_ .node.clickable{cursor:pointer;}#\_r\_2\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_2\_ .arrowheadPath{fill:lightgrey;}#\_r\_2\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_2\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_2\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_2\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_2\_ .cluster text{fill:#F9FFFE;}#\_r\_2\_ .cluster span{color:#F9FFFE;}#\_r\_2\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_2\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_2\_ rect.text{fill:none;stroke-width:0;}#\_r\_2\_ .icon-shape,#\_r\_2\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .icon-shape p,#\_r\_2\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_2\_ .icon-shape rect,#\_r\_2\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_2\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_2\_ :root{--mermaid-font-family:inherit;}

否

是

理解任务

搜索上下文

采取动作

观察结果

任务完成了吗？

输出最终结果

每个环节做的事情如下。

**理解任务**——把用户输入的自然语言描述转化成具体的执行计划。用户说"修一下那个登录的 bug"，Agent 需要判断：是哪个文件？什么表现？是前端问题还是后端问题？需要先看什么？

**搜索上下文**——在项目里找到和当前任务相关的信息。可能读某个文件的源码，可能搜索包含某个关键词的文件，可能查看目录结构，可能跑一个命令看输出。这一步的目的是让 Agent 有足够的背景信息来做决策。

**采取动作**——基于当前的理解和上下文，执行一个具体操作。可能是修改文件内容，可能是创建新文件，可能是运行测试或构建命令，也可能是调用 Git 操作。

**观察结果**——看动作执行完之后发生了什么。编译有没有报错？测试有没有通过？文件内容是不是变成了预期的样子？

**再决策**——根据观察结果判断：任务完成了，还是需要继续？如果还没完成，当前信息和上次有什么不同，下一步应该做什么？

这个闭环会一直转下去，直到 Agent 判断任务已经完成，或者遇到无法解决的问题主动停下来。这就是 Coding Agent 和前三层助手的本质区别：它有一个自己驱动的循环，而不是等着人告诉它下一步做什么。

## [走一遍：给 Express 项目加健康检查端点](#走一遍给-express-项目加健康检查端点)

上一节讲了闭环的抽象结构。这一节用一个具体场景走一遍，看看这个闭环在实际中是怎么运作的。

场景：你有一个 TypeScript + Express 项目，你告诉 Coding Agent"给项目加一个 `/api/health` 健康检查端点"。

### [理解任务](#理解任务)

Agent 收到指令后，先确认任务目标：需要在现有 Express 应用中添加一个 GET `/api/health` 端点，返回一个表示服务状态正常的 JSON。这一步看似简单，但 Agent 实际上在做一件事：把一句模糊的自然语言指令，拆解成一个可执行的内部计划。

### [搜索上下文](#搜索上下文)

Agent 开始在项目里找相关信息：

-   先看项目根目录结构，了解文件组织方式
-   找到主入口文件（比如 `src/index.ts` 或 `src/app.ts`）
-   读取该文件，了解路由是怎么注册的、中间件是怎么挂载的
-   检查是否已有类似的健康检查端点

这一步的结果直接影响下一步的质量。如果 Agent 看错了入口文件，或者没注意到项目中已有路由注册的约定，后面的动作就会出错。

### [采取动作](#采取动作)

Agent 根据搜索到的信息执行操作：在路由注册区域添加 `app.get('/api/health', ...)` 端点，返回 `{ status: 'ok', timestamp: new Date().toISOString() }`。

注意，这一步的动作不是凭空生成的，而是基于上一步搜索到的上下文。Agent 看到项目里其他路由是怎么写的，就会用同样的风格来写新端点。

### [观察结果](#观察结果)

Agent 验证改动是否正确：

-   运行 TypeScript 编译，检查有没有类型错误
-   如果项目有测试，跑一下测试套件
-   或者启动服务，自己发一个请求看看响应

这一步是闭环的关键。Agent 不是改完文件就结束，而是主动检查自己的改动是否正确。

### [再决策](#再决策)

根据验证结果：

-   如果编译通过、测试通过——任务完成，输出总结
-   如果编译报错——回到搜索上下文，分析错误信息，修复问题后重新验证
-   如果测试失败——回到搜索上下文，查看失败原因，调整改动后重新跑测试

整个过程可能经历两三次循环，直到一切正常。你作为用户，只说了一句话，Agent 自己完成了从分析到验证的全部工作。

## [Coding Agent 不能替代什么](#coding-agent-不能替代什么)

读到这，可能会产生一个疑问：既然 Coding Agent 能自己做决策、自己验证结果，那它是不是快要替代程序员了？

答案是不能。Coding Agent 擅长的是执行具体的、定义明确的编码任务，但有几件事它做不了：

-   决定产品应该做成什么样（需求定义）
-   在多个技术方案之间做取舍（架构决策）
-   理解业务上下文中那些没有写在代码里的隐性知识
-   判断一个改动是否会影响其他团队或系统

Coding Agent 是一个很强的执行者，但它仍然需要人来告诉它"做什么"和"为什么做"。

编程助手有四层能力等级，Coding Agent 处在最顶层，它的核心标志是拥有一个自主驱动的"理解 -> 搜索 -> 动作 -> 观察 -> 决策"闭环。后续课程要做的所有实现工作，都是围绕这个闭环展开的。

## 相关笔记

- [[Codex 自我改进 Prompt]]
- [[MOC - 从 0 实现 Coding Agent|从 0 实现 Coding Agent 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
