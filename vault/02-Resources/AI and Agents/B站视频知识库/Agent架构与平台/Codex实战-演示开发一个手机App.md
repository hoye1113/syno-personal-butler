---
title: "Codex实战：演示开发一个手机App"
tags: ["codex", "ai_coding", "bilibili", "video_transcript", "ai_agent", "claude"]
legacy_tags: ["codex", "ai_coding", "bilibili", "video_transcript", "ai_agent", "claude"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV16e526iENH/"
description: "Riley Brown 用 Codex + Xcode 零代码构建 Jerry：iMessage 式 Vibe 编程、Claude Agent SDK + Vibe Code CLI 沙盒出链、计划模式并行 Paper 设计、截图迭代 UI、Twitter 式全屏预览 + Whisper 语音改 App。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-演示开发一个手机App.md"
source_sha256: "8331db85f8b8386323d35e2a8064ff76fc7c02a3967a12452f06f89b97f9b35b"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV16e526iENH/"
column_url: "https://www.bilibili.com/read/cv49269958/"
source_original_date: "2026-06-01"
host_name: "Host"
guest_name: "Riley Brown"
guest_title: "OpenClaw 联合创始人 · Vibe Code 创作者"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV16e526iENH/ingest"
speaker: "Host / Riley Brown"
duration: "~25 min"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV16e526iENH/article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV16e526iENH/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_monologue_repackaged; video presenter Riley Brown"
speaker_confidence: high
author:
  - "[[Riley Brown]]"
concepts:
  - id: vibe_coding
    zh: 氛围感编程
    en: vibe coding
    one_line: 自然语言 + 视觉反馈迭代，不写代码也能出 App
  - id: plan_mode
    zh: 计划模式
    en: plan mode
    one_line: Shift+Tab 让 Codex 先出结构再动手，减少返工
  - id: parallel_workflow
    zh: 并行工作流
    en: parallel workflow
    one_line: Codex 写代码同时 Paper 出 UI，别线性干等
  - id: jerry_app
    zh: Jerry 应用
    en: Jerry app
    one_line: iMessage 式聊天界面 + 内嵌预览，替代 Replit 移动体验
  - id: vibe_code_cli
    zh: 氛围代码命令行
    en: Vibe Code CLI
    one_line: 沙盒里生成并托管 Web/iOS 应用，回链给聊天
  - id: steering
    zh: 转向
    en: steering
    one_line: Codex 运行时持续注入反馈，改计划或改 UI
---

# Codex实战：演示开发一个手机App

**Host：** Host（观众视角）  
**Guest：** Riley Brown（OpenClaw 联合创始人 · Vibe Code 创作者）  
**形态：** Host-Guest 对谈稿 v3.2（solo 演示重排 · 中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `BV16e526iENH/ingest/column_article.md`  
**B 站：** [BV16e526iENH](https://www.bilibili.com/video/BV16e526iENH/)

---

## 开场：能 vibe 出一个「能 vibe 出 App 的 App」吗

OpenClaw 联合创始人 **Riley Brown** 整个周末泡在 Replit 移动版里，越用越烦：按钮小、界面杂、主屏像迷宫。他换思路——**不写一行 Swift**，用桌面 **Codex** 搭一个 Replit 克隆，取名叫 **Jerry**，交互像 **iMessage 给朋友发短信**，后端接 **Claude Agent SDK** 和 **Vibe Code CLI**，聊天就能在沙盒里生成 Web / 移动应用并把链接弹回预览。

这期五章：**Jerry 为什么要像发短信** → **计划模式 + Paper 并行** → **Agent SDK 接 CLI 出链** → **截图迭代修 UI** → **全屏预览 + Whisper 语音改 App**。

**Host：** 你开头说能 vibe 出一个「能 vibe 出 App 的 App」——Replit 移动版到底哪儿让你受不了？

**Riley：** 元素太小，堆得太满，主屏又闷又绕。我不是说 Replit 烂——我用了一整个周末——就是**用着不顺、也不好玩**。我想要更简单：功能像 Replit，手感像 **iMessage**。你跟一个叫 Jerry 的聪明 vibe 程序员发消息，它问你颜色、功能，你答完，它在云端沙盒里生成应用，把 **URL 丢回聊天**，最后一条链接自动在预览里打开。用户接着聊，App 跟着改。到视频结束，我们要有一个能拿得出手的 vibe 编码平台——**Swift 壳 + 代理后端 + 内嵌浏览器预览**，全在 iPhone 上跑。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 氛围感编程 | vibe coding | 用自然语言描述 + 截图反馈迭代，不靠手写代码 |
| Codex | Codex | OpenAI 桌面编程智能体，控本地项目文件夹 |
| 计划模式 | plan mode | Shift+Tab 先让 AI 出实施计划，确认后再写代码 |
| 转向 | steering | Codex 干活时你持续打字注入新约束 |
| Claude Agent SDK | Claude Agent SDK | 把 Claude 代理能力嵌进自有 App 的官方 SDK |
| Vibe Code CLI | Vibe Code CLI | 沙盒生成/托管 Web 与移动 App，返回可预览链接 |
| Paper | Paper / paper.design | 给 AI 代理用的设计画布，类似 Figma |
| Jerry | Jerry | 本视频里的 Swift 聊天 + 预览 App 代号 |

---

## 01 Replit 太杂，Jerry 要像 iMessage 发短信编程

**Host：** Jerry 的技术栈你怎么想的？用户发一句「给我做个健身追踪器」之后，背后发生什么？

**Riley：** 用户发消息，比如「给我构建一个健身追踪器」。你跟 Jerry 聊，后端是 **Agent SDK**。它会来回问：要什么颜色、要什么功能。你补答案，它调 **Vibe Code CLI**——CLI 管沙盒，真正创建应用，把链接送回 Claude。消息里**最后一条链接**自动在浏览器预览打开，你直接看到成品。接着还能聊，持续改 App。

技术选型：**Swift** 写 iOS 壳，消息**本地存手机**。核心是 **Claude Agent SDK** 全称那个——把 Claude 代码能力塞进 App，再跟全新的 **Vibe Code CLI** 说话；CLI 处理沙盒，创建应用，链接回传。我整个周末测 Replit，越测越确定：移动 vibe 编码不该是小型 IDE 迷宫，该是**像给朋友发短信**。Jerry 就是那个朋友——黑色「J」头像，主页写「用 Jerry 构建」，聊天页只显示项目名和小图标，别堆满控件。

**Host：** 所以 Jerry 不是 Replit 的功能超集，是交互模型换轨？

**Riley：** 对。Replit 移动版像把桌面 IDE 塞进小屏；我要的是**对话即工作流**。Web 和移动 App 在 CLI 眼里一样——都在 Web 预览里打开，第一个里程碑两个都做。用户零编程经验也能 vibe；我这期还要证明：**你可以 vibe 出一个能替别人 vibe 的 App**——这就是 meta 那层意思。

> **金句 · Riley**
> **中文：** 整个过程该像给朋友发短信，不是一个名叫 Jerry 的超聪明 vibe 程序员。
> **原文：** It should feel like you're texting a friend — or a really smart vibe programmer named Jerry.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 聊天即工作流 | chat-as-workflow | 需求、澄清、出链、迭代全在对话里完成 |
| 本地消息存储 | local message storage | Swift 端把聊天记录存设备，不依赖网页会话 |
| 托管桥 | hosted bridge | Agent 运行时走云端桥接，首版选托管而非 Mac 伴侣 |
| 自动打开预览 | auto-open preview | 最新消息里的链接自动内嵌浏览器打开 |
| Replit 克隆 | Replit clone | 功能对标在线构建，交互对标 IM |

**本章小结**

- Jerry = iMessage 手感 + Replit 能力：对话澄清 → CLI 沙盒 → 链接回聊天
- Swift 壳 + Agent SDK + Vibe Code CLI 三层；消息本地存
- 目标不是复刻 Replit UI，是把 vibe 编码变成「发短信给 Jerry」

---

## 02 计划模式开线程，Paper 设计别干等 Codex

**Host：** 你说视频里不会线性操作——Codex 和 Xcode 怎么同时开？

**Riley：** 我习惯**先手动进 Xcode** 建项目：App 类型，命名 **Jerry**，下一步创建。第一次打开就是 Hello World 白屏，右边是 starter 模板文件——任何 Swift 项目的起点。然后回 **Codex** 新建项目，也叫 Jerry。关键：选**最高层项目文件夹**——Jerry 里面还有同名子文件夹，别选错；我们要顶层目录，一个文件夹一条专用线程。

Codex 里可以开很多线程，**并行**跑研究、设计、构建。你越会用，越该并行——我节奏快，是因为这就是我现在的干法。接下来在 Jerry 线程粘贴 Notion 里的长提示词，再附上流程图图片。按 **Shift+Tab** 进**计划模式**，让 Codex 先出计划，别直接开写。

计划跑着，我**不傻等**。打开 **Paper**——给 AI 代理用的 Figma——新开画板，同样粘贴简报：「在 paper.design 设计四个主屏，用 MCP 工具。」MCP 能「看见」我打开的应用，直接在画布上出稿。你可以**转向** Codex：比如「把大部分注意力放在聊天和预览页，保持简单。」线程工作时，你打的字会当**实时提示**灌进去，想加多少条引导都行。界面显示「等待响应」时，切回去看计划——它已经在设计 Jerry 收件箱、对话、预览、构建结果四屏。

计划还问：Agent 运行时首版用**托管桥**还是 Mac 伴侣？我选托管桥，具体细节当时也没完全懂。里程碑？我补上下文：**Vibe Code CLI 对移动和 Web 一样，都在 Web 预览打开**，两个都做。提交计划，Codex 开建；Paper 那边「告诉我你想构建什么，我就会构建它」——Web 优先——设计也推进。我把手机模拟器挪开，设计图放旁边对照。

Paper 里还能**选元素复制链接**，贴回 Codex：「预览页别显示链接文字和『从 Jerry 最新链接自动打开』；Safari 图标放右上角，『返回 Jerry』也放那儿省空间；预览要占满屏。」主页顶部别堆消息，右侧放 Jerry 大头像黑色 **J**，标题「用 Jerry 构建」。聊天页只显示**项目名**——用 AI 根据首条提示命名——小图标像 App 图标，别只有一个 J。这些都写进转向里。

> **金句 · Riley**
> **中文：** 用 Codex 时别线性傻等——计划、设计、构建能同时开好几条线。
> **原文：** When I use Codex, I parallelize research, design, and building — the more skilled you get, the more you parallelize.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 计划模式 | plan mode | Shift+Tab；先结构后代码，减少 blind build |
| 并行工作流 | parallel workflow | Codex 线程 + Paper 设计 + Xcode 模拟器同步推进 |
| 转向 | steering | 计划/构建过程中持续注入 UI 与架构约束 |
| MCP 设计工具 | MCP design tool | Paper 通过 MCP 读上下文并在画布生成界面 |
| 项目线程 | project thread | 一个代码文件夹对应 Codex 里一条独立对话 |

**本章小结**

- Xcode 手动建仓 + Codex 绑顶层文件夹开线程，是基础姿势
- Shift+Tab 计划模式；Paper 并行出四屏，转向微调聊天/预览优先级
- 并行不是炫技——缩短首版从「Hello World」到「能聊的 Jerry」的 wall time

---

## 03 Agent SDK 接 Vibe Code CLI：聊天出沙盒链接

**Host：** 计划提交后要 API 密钥——Jerry 怎么连上 Claude 和 Vibe Code？

**Riley：** 确认计划后，我去拿密钥：**platform.claude.com** 建 Claude API key；**vibe code.dev** 再拿 CLI 密钥。回 Codex 说「这是 API 密钥」，粘贴（视频里打码）。**初始大 prompt 通常最耗时**——这轮回合跑了大约七分钟还没完，我出去散了 **30 分钟**步。回来点 Xcode 播放，真机 iPhone 跑——小模拟器不好用。

第一次打开：空聊天，点「新聊天」，输入「你好，怎么了？」——**报错**：「数据无法读，因为丢失」。Xcode 底部日志一堆红字。我**复制日志**扔给 Codex：「收到这条消息，请修复。」构建成功，再试。新聊天：「嗨，我是 Riley。」界面卡「Jerry 正在思考构建」——没回复。我**截图**拖进 Codex：「现在显示 thinking，但我想先正常聊天；Vibe Code CLI 技能以后再加，先像 Claude Agent SDK 纯聊天。」

又一轮：「你好」——Jerry 回「嘿，我是 Jerry，你今天想构建什么？」好。问「你能访问 Vibe Code CLI 吗？」——「不在你机器上」。再截图：布局**全乱**，像不像 iMessage？要**多行聊天、对齐、AI 回复时三个点**。修完，三个点有了，「嘿，怎么了？我们今天要做什么？」——还是访问不了 CLI。

我去 **vibecode.dev** 复制安装说明，确保 Agent SDK 也有 API key，贴给 Codex。再跑：「你能访问 Vibe Code CLI 吗？」——仍不行。问题是**新开的 Agent SDK 聊天不知道 CLI 已装**。我让 Codex 查：**新项目里没看到 skill 文件**。Codex 修完，我删 App 重装。再问：「你能访问 Vibe Code CLI 吗？」——**「是的，我可以访问。」**

测构建：「为 Joe and the Juice 冰沙做个简单着陆页，简单点。」Vibe Code CLI 跑起来——我偏见啊，Vibe Code 联合创始人——我觉得比 Replit 好上手多了。项目创建要等，理想是**链接在 App 内打开**，别跳外部 Safari。第一次**超时错误**，复制错误给 Codex 查要改哪儿。再试着陆页——我下楼拿酸奶，上来看到**真预览**：Start、Learn More，完整页，能关。

> **金句 · Riley**
> **中文：** 先把 Agent SDK 聊通，再叠 Vibe Code——别一上来就让它只会「正在构建」。
> **原文：** Focus on getting it to chat like the Claude Agent SDK first — then we add Vibe Code CLI and test that apps really open on the phone.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Claude Agent SDK | Claude Agent SDK | Swift App 内嵌 Claude 代理的官方集成层 |
| Vibe Code CLI | Vibe Code CLI | 云端沙盒生成/托管 App，返回预览 URL |
| 技能文件 | skill file | 告诉新会话 CLI 已安装、可调用的持久配置 |
| 真机调试 | on-device debug | Xcode 部署 iPhone，比模拟器更贴近用户 |
| 日志驱动修复 | log-driven fix | 复制 Xcode 报错回 Codex，闭环 debug |

**本章小结**

- 两密钥：Claude platform + vibe code.dev；首 prompt 轮次最吃时间（~30 min 散步级）
- 先纯聊天 UX（iMessage 三点），再挂 CLI；skill 文件让新会话知道 CLI 可用
- 着陆页预览跑通 = Jerry 核心闭环：聊 → CLI 沙盒 → 链回 App 内预览

---

## 04 截图喂 Codex：氛围感编程修 UI 和链接行为

**Host：** 预览能开了，还有哪些「vibe 式」迭代？

**Riley：** 链接**自动打开**了，但点消息里的链接还会**跳出 App**——每次得删 App 重装，**聊天记录全没**，像新数据库。我测：「请给我看这个链接」——输入框链接颜色还得改白，次要。粘贴链接，自动打开小预览——好。但点链接仍像新菜单打开，不是内嵌预览。我要：**任何含链接的消息都应在 App 内打开预览**。Codex 修完——砰，对了。

接着：**「请创建一个 Notion 风格待办移动 App，酷一点。」** 加载时我开 Paper 新线程：「重设计主页，保留设置菜单；加项目页、列表底『查看更多』；别加附件按钮。」并行代理改 UI。真机测：基本笔记 App，小组件、加项目——**Web 预览里渲染 iOS App**。我想预览**更大**：接近全屏，去掉顶部白条；截图拖 Codex——关闭按钮做叠加层，别占「应用预览」标题栏，底部也别浪费空间。

有一轮我**拖错截图**，Codex 没收到图——「抱歉，刚没给你图片，要像我刚给的那张。」修完跑「修复网页预览版」。列表页还丑——打开 Web App 移动端更难看。我说：**底部空白太多，尽量修。** 然后灵感：**Twitter 打开链接**——底部还露着 App 一截。我截图：「看到没？聊天做成底部气泡，高度固定，预览时也能打字改 App；加**语音录制按钮**，稍后接 Whisper。」

Voice 按钮：没输入时显示**黑色小声波图标**；按下说话有 subtle 动画，**Whisper** 转文字进输入框——预览开着也能发指令，不用弹键盘挡画面。生活质量更新后，这是**接近最终版**：Notion 待办在预览里，点链接内嵌打开，iOS App 预览加载，**语音可用**。我对着预览说：「改成浅色模式，很浅的灰接近白；换字体；再加个你觉得酷的功能。」大概 **30 秒到一分钟**改完。最后补：**粗体、项目符号在 App 里渲染不对**——修。说「发送预览链接」，改完送达。

> **金句 · Riley**
> **中文：** 界面乱了？截图拖进去，说「像 iMessage」——比写十段 spec 快。
> **原文：** Screenshot it, drag it in, say make it look like iMessage — that's the vibe iteration loop.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 氛围感迭代 | vibe iteration | 截图 + 自然语言修 UI/逻辑，非手写 Swift |
| 内嵌预览 | in-app preview | 链接在 Jerry 内 WebView 打开，不跳 Safari |
| 并行 UI 线程 | parallel UI thread | Paper/Codex 第二条线改主页，不阻塞 CLI 构建 |
| Twitter 式叠加 | Twitter-style overlay | 全屏预览 + 底部聊天气泡输入 |
| Whisper 语音 | OpenAI Whisper | 预览态语音指令转文字，免键盘 |

**本章小结**

- 链接行为、全屏预览、列表丑态——都靠截图 + 短指令闭环
- 多 Codex 线程：一条跑 Notion 待办，一条 Paper  redesign 主页
- 语音 + 预览同屏 = vibe 编码终点：用着 App 边说话边改

---

## 05 全屏预览 + 语音：Jerry 是可发布的 vibe 平台

**Host：** 第一版 Jerry 你总结成什么？普通人能学到啥？

**Riley：** 我们做了一个 **Swift App**：聊天构建 Web / 移动 App，**App 内直接打开预览**，还能**用声音改**。第一次做这种「App 构建 App」的结构，过程确实乱——但我难按脚本走，因为是头一回。成品是：**Jerry 聊天 → Agent SDK → Vibe Code CLI → 沙盒 URL → 内嵌预览 → 语音/文字继续改**。可以疯狂加三十个功能，查看、改、提交 prompt，全在聊天体验里。这 Swift App **能上架 App Store**——路径是通的。

对 **Codex** 本身：我桌面打开频率越来越高，真爱上了。这期是 **vibe 演示**，不是完整 Codex 教程——以后会做更深指南。核心 takeaway：**并行**（计划 + Paper + 构建）、**计划模式**、**转向**、**截图 debug**、**别把 Replit 移动 UX 当标准**——vibe 编码该是发短信给 Jerry，不是在小屏 IDE 里找按钮。

Replit 周末测试让我确定：移动 builder 需要**更简单、更好玩**的壳。Codex 让「零 Swift」成为可能；Agent SDK + CLI 让壳里装的是**会建 App 的代理**；Whisper 让预览态改动像发语音消息。你可以 fork 这思路——加功能、换皮肤、接别的 CLI——但 workflow 就这五步。

> **金句 · Riley**
> **中文：** 一个 Swift App，让你聊天造 App，App 里打开 App，还能用嗓子改——我觉得这体验挺疯的。
> **原文：** A Swift app that lets you build apps, open them inside the app, and change them with your voice — I think that's a pretty wild experience.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| App 构建 App | app that builds apps | meta 层：移动壳 + 代理 + CLI 替用户 vibe |
| 可上架路径 | App Store path | Xcode 真机构建，非只能 demo 的网页玩具 |
| 生活质量更新 | quality-of-life pass | 语音、排版、预览叠加等 UX 收束轮 |
| 零代码 Swift | zero-code Swift | 作者不写 Swift，Codex 生成全部实现 |
| vibe 平台 | vibe platform | 产品目标是 vibe 编码体验，不是 IDE 功能表 |

**本章小结**

- Jerry = iMessage × Replit 能力 × 内嵌预览 × Whisper——可继续叠功能
- Codex 价值在并行线程 + 计划 + 转向 + 日志/截图 debug，不是单次 prompt 魔法
- 移动 vibe 编码的产品形：聊天即 IDE，预览即交付，语音即 prompt

---

## 总结：发短信给 Jerry，比在小屏 Replit 里找按钮快

| 维度 | 要点 |
|------|------|
| 动机 | Replit 移动版杂、小、不好玩 → Jerry 用 iMessage 模型重做 vibe 编码 |
| 栈 | Swift 壳 + Claude Agent SDK + Vibe Code CLI + Codex 桌面构建 |
| 工作流 | Shift+Tab 计划模式；Paper 并行设计；转向持续约束 |
| 调试 | Xcode 日志 + 截图拖 Codex；先聊天 UX 再挂 CLI skill |
| 预览 | 链内嵌打开；Twitter 式全屏 + 底栏输入；Whisper 预览态改 App |
| 边界 | 首 prompt 轮次耗时长；删 App 重装会丢聊天记录（迭代中仍存痛点） |

> **金句 · Riley（封底）**
> **中文：** 你可以 vibe 出一个能替别人 vibe 的 App——编程像给 Jerry 发短信。
> **原文：** You can use vibe coding to build an app that vibe-codes apps for you — it should feel like texting Jerry.

### 对个人的启示

- **并行**不是炫技：Codex 写代码时 Paper 出 UI，别线性干等
- UI 乱了别写长 spec——**截图 + 「像 iMessage」** 往往一轮就见效
- 先让 Agent **纯聊天**跑通，再叠 CLI；skill 文件记得让新会话知道工具已装

### 对团队/产品的启示

- 移动 vibe 编码的竞品轴不是功能表，是**对话 + 内嵌预览 + 语音**闭环
- Agent SDK + 专用 CLI = 可替换后端；Swift 壳可品牌化（Jerry 只是 demo 皮）
- Codex 桌面 + 真机 Xcode 是 realistic 路径：比纯 Web builder 更接近 App Store

### 仍待验证

- 托管桥 vs Mac 伴侣长期成本与延迟（视频首版选托管，细节未展开）
- 聊天记录持久化：删 App 重装丢会话——生产需本地 DB 策略
- Vibe Code CLI 构建 ~5 min 超时阈值，需产品层进度 UI

---

## 概念索引（agent）

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| vibe_coding | 氛围感编程 | vibe coding | 自然语言 + 截图迭代，零手写代码出 App |
| plan_mode | 计划模式 | plan mode | Shift+Tab 先计划后构建 |
| parallel_workflow | 并行工作流 | parallel workflow | Codex + Paper + 模拟器同步 |
| jerry_app | Jerry 应用 | Jerry app | iMessage 式 vibe 移动 builder |
| vibe_code_cli | 氛围代码命令行 | Vibe Code CLI | 沙盒生成 App 并回链 |
| steering | 转向 | steering | 构建中实时注入约束 |

---

## 附录

### 章节时间戳（B 站简介）

| 时间 | 主题 |
|------|------|
| 01:15 | 重新定义移动端开发体验（Jerry / iMessage 模型） |
| 05:42 | Codex 并行开发流与计划模式 |
| 08:30 | 集成 Claude Agent SDK + Vibe Code CLI |
| 12:15 | 实时调试与 UI 迭代的 vibe 模式 |
| 20:45 | 全屏预览与 Whisper 语音驱动闭环 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV16e526iENH/ingest`
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV16e526iENH/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv49269958/
- **B 站**：https://www.bilibili.com/video/BV16e526iENH/

### 相关阅读

- [[Codex实战-30分钟掌握95%核心功能]] — Codex 桌面核心操作速览  
- [[Codex产品负责人-Codex团队如何用Codex]] — OpenAI 团队内部如何用 Codex  
- [[Codex实战-构建全能AI营销团队]] — 同作者 Riley Brown 的 Skills 并行栈  
- [[Codex负责人-现场演示Codex]] — Codex 计划模式与 agent 成熟度对照  
- [[MOC - Agent Theory and Design]] — Agent 理论横切索引  

---

### 收录说明

- **视频**：[BV16e526iENH](https://www.bilibili.com/video/BV16e526iENH/)（B 站 *Easonlee的AI笔记*）  
- **讲者**：Riley Brown（OpenClaw 联合创始人 · Vibe Code）  
- **主源**：专栏 `cv49269958`（Quill Delta 完整图稿）  
- **版本**：canonical Host-Guest v3.2（2026-07-06）
