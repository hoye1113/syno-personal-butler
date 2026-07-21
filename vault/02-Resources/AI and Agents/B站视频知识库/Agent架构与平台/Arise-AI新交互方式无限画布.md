---
title: "Arise首席：AI新交互方式 无限画布"
tags: ["ai_agent", "video_transcript", "bilibili", "mcp", "agent_architecture"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "mcp", "agent_architecture", "web_agent", "browser_automation", "ui_ux"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1g5V66AEUL/"
description: "Arise 首席 DX 工程师 Rachel Lee Nabors：聊天框是 Agent 交互的最低公分母，MCP 应用 + WebMCP 让每个网页成为微型 MCP 服务器，浏览器 API 是无限画布。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Arise-AI新交互方式无限画布.md"
source_sha256: "da86a86d468bfcbdfcbdbe00785b2a4d3d82c2ca76c694a556f15523a884c0f5"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1g5V66AEUL/"
column_url: "https://www.bilibili.com/read/cv46236143/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1g5V66AEUL/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1g5V66AEUL/ingest"
duration: "~25 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Moderator（Agent 交互设计讨论）"
guest_name: "Rachel Lee Nabors"
guest_title: "Arise 首席开发者体验工程师"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Rachel Lee Nabors]]"
concepts:
  - id: infinite_canvas
    zh: 无限画布
    en: infinite canvas
    one_line: 浏览器不只是文档阅读器，能渲染任何交互式体验
  - id: mcp_transport
    zh: MCP 传输协议
    en: MCP transport
    one_line: STDIO 适合本地，HTTP 适合云端，决定 Agent 部署灵活性
  - id: mcp_resources
    zh: MCP 资源
    en: MCP resources
    one_line: 框架预填充上下文的机制，比工具调用更高效
  - id: mcp_apps
    zh: MCP 应用
    en: MCP apps
    one_line: HTML+CSS+JS 打包成单文件，沙盒化渲染富媒体体验
  - id: webmcp
    zh: WebMCP
    en: WebMCP
    one_line: 让每个网页向浏览器内置 Agent 暴露工具，无需截图或解析 DOM
  - id: starfish_design
    zh: 海星设计
    en: starfish design
    one_line: 把所有工作丢给用户去探索的懒惰交互模式
  - id: browser_apis
    zh: 浏览器 API
    en: browser APIs
    one_line: Web Speech、Web Animations 等零依赖功能，Agent 直接调用
---

# Arise首席：AI新交互方式 无限画布

**Host：** Moderator（Agent 交互设计讨论）  
**Guest：** Rachel Lee Nabors（Arise 首席开发者体验工程师）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `BV1g5V66AEUL/ingest/column_article.md`  
**B 站：** [BV1g5V66AEUL](https://www.bilibili.com/video/BV1g5V66AEUL/)

---

## 开场

Rachel Lee Nabors 曾在 Mozilla 开发 Firefox 开发者工具，与 W3C 合作制定 Web 动画 API 标准，还在微软 Edge 浏览器团队做过产品经理。过去三年她为 AI 初创公司提供咨询，最近加入 Arise 担任首席开发者体验工程师。她一直相信一件事：浏览器不只是一个文档阅读器，而是一块无限的画布。现在，这块画布要为 Agent 服务了。MCP 传输协议、MCP 应用、WebMCP，这些技术正在把传统网站变成 Agent 可用的交互式应用。但当前的聊天框交互就像当年的命令行——功能强大，体验却差。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 无限画布 | infinite canvas | 浏览器能渲染任何东西，不只是文档 |
| 传输协议 | transport | Agent 和 MCP 服务器之间的通信方式 |
| 标准输入输出 | STDIO | 本地进程通信，适合开发者自用 |
| 资源 | resources | 框架预填充上下文的机制，比工具调用更高效 |
| MCP 应用 | MCP apps | HTML+CSS+JS 打包成单文件，在 Agent 界面内渲染 |
| 海星设计 | starfish design | 把所有工作丢给用户探索的懒惰交互 |
| WebMCP | WebMCP | 让网页向浏览器内置 Agent 暴露工具 |
| 沙盒 | sandbox | 隔离的 iframe 环境，无法访问本地存储 |

---

## 01 浏览器不是文档阅读器，是无限画布

**Moderator：** 你从做网络漫画开始，到做 Web 标准，再到做 AI 咨询——这条线串起来，你一直在说什么？

**Rachel：** 我在 iVillage 网站上为青少年女孩创作网络漫画，每周有四十万读者。那时候是二零零六年，网上每个人都很前卫，我们在 MySpace 上，十四岁的孩子跟四十二岁的人聊音乐。我从那时候就相信：浏览器不仅仅是一个文档阅读器。

那些 CSS 拥趸们会试图让你相信浏览器只能读文档，但它是无限的画布，可以渲染任何东西——视频、音频，任何你需要的东西都有相应的 API。我后来跟 W3C 合作开发了 Web 动画 API，创造了交互式《爱丽丝梦游仙境》之类的疯狂演示，就是为了让浏览器做到它本不该做到的事情。

现在我在思考一个更大的问题：如果每个人都在用智能体，那我们就去他们所在的地方。我的漫画存档网站开始出现四百零四错误和损坏图片——不要只是修复它，要让它面向未来。一个服务器，对应三种客户端：浏览器中的人类，智能体中的人类，以及代表人类使用网络的浏览器智能体。

**Moderator：** 代表人类使用网络——这句话信息量很大。

**Rachel：** 是的，听起来很复杂，但本质很简单。浏览器智能体不是替你浏览网页，而是替你调用网页上已有的功能。以前智能体要操作网页，要么截图然后猜怎么点击，要么遍历 DOM 树找链接——两种方式都消耗大量 Token，还容易出错。如果网页能直接暴露自己的工具给智能体，那问题就解决了。

> **金句 · Rachel Lee Nabors**
> **中文：** 浏览器从来不只是文档阅读器，它是一块无限的画布，能渲染任何你需要的东西。
> **原文：** The browser is not just a document reader. It is an infinite canvas that can render anything you need.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 无限画布 | infinite canvas | 浏览器能渲染视频、音频、交互式应用，不只是文档 |
| DOM 树 | DOM tree | 网页的结构化数据，智能体解析它消耗大量 Token |
| 三种客户端 | three clients | 人类浏览器、智能体中的人类、浏览器智能体 |

**本章小结**

- 浏览器是无限画布，能渲染视频、音频、交互式应用，不只是文档阅读器
- 智能体操作网页的两种旧方式（截图猜、DOM 解析）都太浪费 Token
- 一个服务器对三种客户端：人类浏览器、智能体中的人类、代表人类的浏览器智能体

---

## 02 MCP传输协议决定Agent部署灵活性

**Moderator：** 你在现场做了一个调查，问多少人在网络上托管 MCP 服务器、做过 MCP 应用、玩过 WebMCP——结果呢？

**Rachel：** 网络上托管 MCP 服务器的人很少，大部分人还在用本地方式。做过 MCP 应用的人更少，想尝试的人倒是很多。WebMCP 呢？几乎没人碰过。所以今天这场演讲来对了。

我们先从传输协议说起。如果你做过网络开发，你熟悉 HTTP，但可能不熟悉「传输」这个概念。传输是 MCP 服务器和智能体通信的方式，有几种不同的协议，各有适用场景。

STDIO 是「标准输入输出」——你可以把它叫做 Studio，像菲尔·柯林斯那首歌。服务器作为本地进程运行，由客户端生成。这就是为什么连接基于 STDIO 的 MCP 应用时，总是一堆命令行输入的 JSON。大多数用户并不想直接使用或配置这种通信。它在整个会话期间保持活动状态。

HTTP 不同，它运行在网络上。服务器作为 Web 服务运行，监听特定的 HTTP 端点，通信通过 HTTP POST 请求进行，能很好地适配无服务器架构。Vercel 和 Cloudflare 一直在推销边缘函数，现在终于有东西可以放进去了。

用 STDIO 时你必须更新配置文件，包含启动本地服务器的命令。但用 HTTP，用户体验变得非常简单——给它起个名字，输入 URL，这就完成了。它变成了一个连接器，然后你就能进去了。

**Moderator：** 所以 HTTP 模式是让 MCP 普及的关键？

**Rachel：** 对。STDIO 适合开发者自用，但普通用户不可能去编辑配置文件。HTTP 模式让任何人都能输入一个 URL 就连上 MCP 服务器，这才是规模化的前提。想想你平时怎么添加一个网站 bookmark——输入地址，点击添加，搞定。MCP 的 HTTP 传输也应该这么简单。

> **金句 · Rachel Lee Nabors**
> **中文：** 用 HTTP 时用户体验变得非常简单——给它起个名字，输入 URL，这就完成了。
> **原文：** With HTTP, the user experience becomes very simple — give it a name, enter the URL, and you are done.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 传输协议 | transport | Agent 和 MCP 服务器之间的通信协议 |
| 标准输入输出 | STDIO | 本地进程通信，需要编辑配置文件 |
| 边缘函数 | edge functions | 在离用户最近的服务器上运行的代码 |
| 无服务器架构 | serverless | 按需运行，不用管服务器运维 |

**本章小结**

- MCP 传输协议有两种：STDIO（本地进程）和 HTTP（网络服务），各有适用场景
- STDIO 适合开发者自用，HTTP 适合普通用户——输入 URL 就能连接
- HTTP 传输是 MCP 规模化普及的关键，能适配 Vercel、Cloudflare 等无服务器架构

---

## 03 聊天框是用户体验的最低公分母

**Moderator：** 你说聊天框是智能体交互的「最低公分母」，这个说法挺尖锐的。聊天框不是最自然的交互方式吗？

**Rachel：** 聊天框是用户体验的最低公分母——就像当年的命令行界面。我妈妈以前用 COBOL 编程，当我小时候想双击图标玩游戏时，她说：「我们家不那样做，我们要打开 DOS，输入命令。」程序员确实是这样操作的，但在 iPhone 上你会通过点击和直观交互来操作，不用打字。

现在的聊天界面可能只是开发者经历的一个阶段。我称之为「聊天框登录页」或「海星设计」——它就摆在那里，让用户承担所有工作。当你进入界面时，你必须在脑海中储备大量背景知识，并且清楚地知道它能做什么。如果你熟悉系统那没问题；否则，在没有任何视觉提示或指导的情况下，这种交互非常有挑战性。

这有点像以前流行的文字冒险游戏。但我不想通过「检查邮箱，有邮件吗？」这种对话方式来报税。让客户进行过多的盲目探索并不是好的体验。智能体的未来不应该像命令行，而应该像 iPhone——通过视觉提示和富媒体组件引导用户，而不是让用户在脑海中预设所有上下文。

**Moderator：** 那解决方案是什么？抛弃聊天框吗？

**Rachel：** 不是抛弃，是超越。聊天框作为底层通信协议没问题，但用户看到的界面不应该只是一个输入框。MCP 应用就是解决方案——它把 HTML、CSS 和 JavaScript 打包成一个文件，在智能体界面内渲染出完整的交互式应用。你看我的漫画阅读器：有图片、有导航、有评论、有文本模式——这才是在智能体里看漫画的正确方式，而不是读一大段文字描述。

> **金句 · Rachel Lee Nabors**
> **中文：** 聊天框是用户体验的最低公分母，就像当年的命令行界面——功能强大，体验却差。
> **原文：** The chat interface is the lowest common denominator of user experience, like the command line interface of the old days.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 海星设计 | starfish design | 把所有工作丢给用户探索的懒惰交互模式 |
| 最低公分母 | lowest common denominator | 聊天框是所有交互方式里最基础但也最弱的 |
| 富媒体组件 | rich media components | 图片、视频、交互式应用等比纯文本更丰富的元素 |

**本章小结**

- 聊天框是用户体验的最低公分母，就像命令行——用户承担所有探索工作
- 海星设计的问题在于没有任何视觉提示，用户必须在脑海中预设所有上下文
- 解决方案是超越聊天框，用 MCP 应用渲染富媒体交互式体验

---

## 04 MCP应用：沙盒化的富媒体体验

**Moderator：** 你做了一个漫画阅读器的 MCP 应用演示，能在 Agent 界面里直接看漫画。这是怎么实现的？有什么限制？

**Rachel：** 我把工具定义为「获取页面」，输入漫画 ID、故事情节 ID 和页码。最关键的是工具返回的元数据中有一个 UI 属性，指向一个 HTML 文件。砰，就在那里——一个完整的漫画阅读器，在 Claude 的聊天框里渲染出来。

你可以向前向后导航，点击「文本模式」切换到纯文字阅读。它利用了网站上的所有资源，看起来和网站一样好。但 MCP 应用有点特殊——它们不是普通网站，它们是孤岛，是单个 HTML 文件。所以你需要的一切都必须是嵌入式的 Base64 编码。

限制很多：你无法获得本地存储，不能跨 iframe 跟踪状态，没有网络访问权限。你只能通过调用服务器工具来让服务器做事——这变成了真正的「妈妈，我可以吗？」的情况。外部资源需要 CORS 策略，字体、图片默认被阻止。如果你看到页面空白，先检查内容安全策略。

但好处是：如果你已经有一个设计系统，构建 MCP 应用会非常有用。我共享了来自同一服务器的字体、CSS 和所有内容，CORS 策略也设置好了。HTML 和 JavaScript 组件可以打包，我用了 Vite 单文件插件。

**Moderator：** 所以 MCP 应用虽然受限，但在自己的设计系统内是非常强大的？

**Rachel：** 完全正确。它就像一个微型网站漫画阅读器，但运行在沙盒化的 iframe 里。你不能随便加载外部资源，但你可以把所有需要的东西都打包进去。这是一种权衡：牺牲灵活性换取安全性和集成度。对于 Agent 来说，这种权衡是值得的——它不需要你的电脑权限，只需要一个能渲染的界面。

> **金句 · Rachel Lee Nabors**
> **中文：** MCP 应用把 HTML、CSS 和 JavaScript 打包成一个文件，创建了智能体的富媒体体验——听起来很熟悉，让我想起了当年的 DHTML。
> **原文：** MCP apps bundle HTML, CSS, and JavaScript into a single file to create agent rich media experiences — it sounds very familiar, reminds me of the old DHTML days.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| MCP 应用 | MCP apps | HTML+CSS+JS 打包成单文件，沙盒化渲染 |
| 沙盒 | sandbox | 隔离的 iframe 环境，不能访问本地存储 |
| 内容安全策略 | CSP / content security policy | 阻止加载未授权的外部资源 |
| 跨域资源共享 | CORS | 控制哪些外部资源可以被加载 |

**本章小结**

- MCP 应用把 HTML+CSS+JS 打包成单文件，在 Agent 界面内渲染交互式应用
- 限制包括：无本地存储、无网络访问、外部资源需 CORS 策略
- 如果你已有设计系统，构建 MCP 应用会非常高效——字体、CSS、组件都能复用

---

## 05 WebMCP让每个网页都成为微型MCP服务器

**Moderator：** WebMCP 是什么？它跟标准 MCP 有什么区别？

**Rachel：** 人们还在使用浏览器，更智能、更易用的浏览器不断涌现，大大小小的浏览器都内置了智能体。但它们在导航网站时仍然很吃力——要么依赖截图猜测如何操作，要么遍历 DOM 树，这两种方式都消耗大量 Token。

WebMCP 让每个 HTML 页面都成为一个微型 MCP 工具服务器。智能体不再需要截图或解析 DOM，而是直接从正在访问的页面调用 JavaScript 中已有的函数和链接。这就像给网页装了一个智能体专用的工具接口。

它有两种形式：声明式和命令式。声明式非常简单——你只需向表单添加工具名称和工具描述属性，搞定。如果你的网站有很多表单，这种方式非常棒。命令式通过 JavaScript API 传递参数，适合 API 调用、工作流和数据转换。

规范可能跟标准 MCP 不完全一致——就像 JavaScript 之于 Java，虽然受到启发，但并非完全兼容。不过核心思路一样：网页暴露工具，智能体调用工具。我用了一个调试扩展可以看到所有暴露的工具，然后在浏览器内的智能体窗口中演示了操作——说「读给我听」，它返回文字记录；说「转到下一页」，它就导航到下一页。

**Moderator：** 这意味着未来每个网站都能自带智能体接口？

**Rachel：** 对。每个网站都可以声明「我能做什么」，智能体直接调用，不需要猜测。这比截图识别快得多，也准确得多。你想想，如果每个电商网站都暴露了「搜索商品」「加入购物车」「结账」这些工具，智能体可以直接帮你比价、下单，不需要打开页面、滚动、点击。

> **金句 · Rachel Lee Nabors**
> **中文：** 如果它们能直接从正在访问的页面调用 JavaScript 中已有的函数和链接，那不是很好吗？
> **原文：** What if they could call the same functions and links already in your JavaScript from the page they are visiting?

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| WebMCP | WebMCP | 让网页向浏览器内置 Agent 暴露工具的规范 |
| 声明式 | declarative | 通过 HTML 属性暴露工具，无需写代码 |
| 命令式 | imperative | 通过 JavaScript API 注册工具，适合复杂工作流 |
| 工具暴露 | tool exposure | 网页告诉智能体「我能做什么」的机制 |

**本章小结**

- WebMCP 让每个网页成为微型 MCP 服务器，智能体直接调用页面已有的 JavaScript 函数
- 两种形式：声明式（表单属性）适合表单多的网站，命令式（JS API）适合复杂工作流
- WebMCP 比截图识别快得多、准确得多，是 Agent 浏览网页的正确方向

---

## 总结：从聊天框到无限画布

| 维度 | 要点 |
|------|------|
| 交互演进 | 聊天框是最低公分母，就像命令行——需要被超越而不是抛弃 |
| MCP 传输 | HTTP 模式是规模化关键，输入 URL 就能连接 |
| MCP 应用 | 沙盒化的富媒体体验，限制多但安全，适合设计系统内使用 |
| WebMCP | 每个网页都能向 Agent 暴露工具，无需截图或解析 DOM |
| 浏览器 API | Web Speech、Web Animations 等零依赖功能，Agent 直接调用 |
| 无限画布 | 浏览器是 Agent 交互体验的宝库，所有 API 都在等着被用 |

> **金句 · Rachel Lee Nabors（封底）**
> **中文：** 所有这些 API——网络语音、动画、音频画布、WebAssembly、CSS——都在那里等着你用它们来创造一些东西。
> **原文：** All of these APIs — web speech, animations, audio canvas, Wasm, CSS — are all there waiting for you to create something with them.

---

## 相关阅读

- [[MCP服务器模式实战]]
- [[Claude Code负责人-创造内幕]]
- [[Karpathy-从Vibe Code到Agentic Code]]
