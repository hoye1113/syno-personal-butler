---
title: "Codex 实战：AI 编程 2026 新手教程"
tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "ai_coding", "skills"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "ai_coding", "skills"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1NK5m61ErG/"
description: "Riley Brown 演示 Codex + GPT-5.5 Vibe 编程：7 个提示词从画图应用到 Firebase 全栈，再迁移到桌面端和 iOS——零代码经验也能构建生产级应用。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/AI编程实战/Codex实战-AI编程2026新手教程.md"
source_sha256: "91baccf6b12c3b1612d0ff03b308940230f4de7abf8fe2134a3b739665b385c1"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1NK5m61ErG/"
column_url: "https://www.bilibili.com/read/cv49009835/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1NK5m61ErG/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1NK5m61ErG/ingest"
duration: "58:00"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Riley Brown"
guest_name: "Riley Brown"
guest_title: "AI 创作者 · chorus.com"
author:
  - "[[Riley Brown]]"
concepts:
  - id: vibe_coding
    zh: Vibe 编程
    en: vibe coding
    one_line: 只提供想法和提示词，AI 代理负责所有代码
  - id: firebase_as_brain
    zh: Firebase 是 AI 应用的外挂大脑
    en: Firebase as external brain
    one_line: 身份验证 + 数据库 + 存储三件套，纯前端应用的数据持久化方案
  - id: console_log_debugging
    zh: 控制台日志调试法
    en: console log debugging for AI
    one_line: 上传浏览器控制台报错给 AI，比文字描述精准十倍
  - id: agent_skill_block
    zh: 代理技能块
    en: agent skill block
    one_line: 让外部 AI 代理能直接读写应用数据库的指令集
  - id: cross_platform_migration
    zh: 跨平台迁移
    en: cross-platform migration
    one_line: 一个提示词把 Web 应用变成 Electron 桌面版和 Swift iOS 版
---

# Codex 实战：AI 编程 2026 新手教程

**Host：** Riley Brown（AI 创作者）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 单人教程 · 讲义适配对话体）  
**B 站：** [BV1NK5m61ErG](https://www.bilibili.com/video/BV1NK5m61ErG/) · **专栏** [cv49009835](https://www.bilibili.com/read/cv49009835/) · **时长** ~58 min

---

## 开场

Riley Brown 说：如果你能集中精力投入几个小时，Vibe 编程其实很容易理解。他从零代码经验出发，用 Codex（OpenAI 的桌面编码工具）+ GPT-5.5 模型，7 个提示词搭了一个「共享大脑」全栈应用——有身份验证、有数据库、有存储、有瀑布流网格。然后一个提示词迁移到 Electron 桌面端，又一个提示词迁移到 Swift iOS 端。三端共享同一个 Firebase 后端，数据实时同步。

五章：**Vibe 编程是什么** → **用 Codex 从零构建全栈应用** → **调试：截图 + 日志是最佳反馈** → **跨平台迁移：桌面端和 iOS** → **代理技能：让 AI 成为应用的活跃用户**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| Vibe 编程 | vibe coding | 只说想法，AI 写全部代码 |
| Codex | OpenAI Codex | OpenAI 的桌面编码代理工具 |
| Firebase | Firebase | Google 的后端即服务：认证 + 数据库 + 存储 |
| Firestore | Firestore | Firebase 的 NoSQL 云数据库 |
| 存储桶 | storage bucket | 云端文件存储，放图片视频等大文件 |
| 代理技能 | agent skill | 让外部 AI 读写应用数据库的指令块 |
| Electron | Electron | 把 Web 应用封装成桌面应用的框架 |
| Vercel | Vercel | 一键部署 Web 应用到互联网 |

---

## 01 Vibe 编程：2026 年初学者的开发新范式

**Riley Brown：** 使用 AI 代理构建任何你想要的应用程序——这就是 Vibe 编程。2026 年最令人兴奋、发展最快的领域之一。随着 AI 编码模型每个月都变得越来越强大，初学者也开始构建日益复杂的应用程序，而且基本上所有的代码都由 AI 编写。

你可能觉得自己在落后。但事实是——如果你能集中精力投入几个小时，这其实很容易理解。最棒的是，如果你有 ChatGPT 订阅，现在就可以使用世界上最好的编码工具和模型——Codex 和 GPT 5.5。即使你没有任何编码经验。

**Riley Brown：** 让我先用一个最简单的例子展示。我输入：「创建一个微软画图应用，一个简单的网页应用，并在本地运行它。」5 分 44 秒后，它构建了一个 React Vite 画图应用。油漆桶有效、颜色选择器有效、所有功能都正常。**一个提示词，从零到可用。**

然后我说：「让它看起来像苹果风格，加撤销功能。」它立刻改好了——顶部和底部面板变成苹果风格，撤销按钮出现，Command+Z 快捷键也生效。你只需要知道你的应用就存在于这些文件中，当它运行时是在你的电脑上本地运行的。**如果你这辈子从未写过一行代码，你不需要关心这些文件是做什么的——AI 在编码方面已经非常厉害了。**

> **金句 · Riley Brown**
> **中文：** 如果你能集中精力投入几个小时，Vibe 编程其实很容易理解——最棒的是，如果你有 ChatGPT 订阅，现在就能用。
> **原文：** If you can focus for a few hours, Vibe coding is actually easy to understand — and the best part is, if you have a ChatGPT subscription, you can start right now.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Vibe 编程 | vibe coding | 只说想法，AI 写全部代码 |
| 本地运行 | local run | 程序在自己电脑上跑，实时预览 |
| 代理循环 | agent loop | 提示词 → 代理生成文件 → 运行 → 看效果 → 再提示 |
| ChatGPT 订阅 | ChatGPT subscription | 付费版才能用 Codex |

**本章小结**

- Vibe 编程 = 只提供想法和提示词，AI 代理负责所有代码
- Codex 是桌面编码工具，输入提示词就能生成完整应用
- 代理循环：提示词 → 生成文件 → 本地运行 → 看效果 → 再迭代

---

## 02 Firebase：AI 应用的外挂大脑

**Riley Brown：** 之前的画图应用有个大问题——浏览器刷新数据就丢了。数据只临时存在浏览器里。要做真正的应用，数据必须有地方存放。我们需要三个东西：身份验证（让用户登录）、数据库（存文本和结构化数据）、存储桶（存图片视频）。

**Riley Brown：** 我们用 Firebase。先在 Firebase 上创建项目——这是唯一需要离开 Codex 的时候。两到五分钟设置好：创建 Firestore 数据库、启用 Google 登录、设置存储桶。然后把 Firebase 的配置密钥粘贴到 Codex 里——「这是我的 Firebase 信息，请存储它。」

**Riley Brown：** 然后我告诉代理：「你已经拥有了构建这个应用所需的一切。数据库、存储和身份验证全部使用 Firebase。请根据计划构建完整的应用程序。界面要美观。」**25 分 51 秒后——它完成了。** 一个带 Google 登录按钮的网页应用。登录后自动创建用户档案，所有数据存到 Firestore。

**Riley Brown：** 我粘贴了一个 X 帖子链接——它自动识别平台，抓取内容，保存到数据库。YouTube 视频也行——自动抓取缩略图和标题。Instagram 也行。**两三个提示词，就完成了这些功能。**

> **金句 · Riley Brown**
> **中文：** 纯前端应用的数据在浏览器刷新时就丢了——Firebase 是你的外挂大脑，让数据活下来。
> **原文：** Data in a pure frontend app vanishes on refresh — Firebase is your external brain that keeps data alive.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Firebase 三件套 | Firebase trinity | 身份验证 + Firestore 数据库 + 存储桶 |
| Firestore | Firestore | Firebase 的 NoSQL 云数据库 |
| 存储规则 | storage rules | 控制谁能上传/读取文件 |
| 授权域名 | authorized domain | Firebase 只允许指定域名使用认证 |

**本章小结**

- 纯前端 = 数据会丢，必须引入 Firebase 等后端
- Firebase 三件套：认证（Google 登录）+ Firestore（数据库）+ 存储桶（大文件）
- 设置只需离开 Codex 一次（2-5 分钟），之后全在 Codex 里完成

---

## 03 调试：截图 + 日志是最佳反馈

**Riley Brown：** 登录后我尝试保存一条 X 帖子——弹出「权限不足」。怎么修？**打开浏览器控制台（右键 → 检查），复制报错信息。** 我把这些日志粘贴给 Codex：「我可以用账号登录，尝试添加 X 链接时能提取元数据，但保存时报权限不足，这是控制台日志。」

1 分 10 秒后，修复完成。再次测试——保存成功。

**Riley Brown：** YouTube 缩略图没正确显示。我截个图，用标注工具圈出问题，发给 Codex：「X 帖子显示正常但 YouTube 缩略图没加载。请参考其他应用提取数据的方式，确保 YouTube 显示缩略图。目前卡片是堆叠的，改成瀑布流网格格式。」

**Riley Brown：** 这就是最佳调试方法——**纯文字描述问题永远不如截图 + 控制台日志精准**。403 错误表示服务器拒绝访问，这些日志对 AI 修复问题非常有用。每一轮迭代都用「截图 + 标注 + 具体描述」，AI 就能快速定位问题。

**Riley Brown：** 截图上传失败了——「存储未经授权」。我把错误信息粘贴给代理，它说修复了存储规则——截图在文档创建前就尝试访问存储空间。刷新重试——成功。**七八个提示词后，应用已经相当完善了。**

> **金句 · Riley Brown**
> **中文：** 纯文字描述问题永远不如截图 + 控制台日志精准——这是 AI 调试的黄金法则。
> **原文：** Pure text descriptions of problems are never as precise as screenshots + console logs — this is the golden rule of AI debugging.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 控制台日志 | console log | 浏览器开发者工具里的报错信息 |
| 403 错误 | 403 error | 服务器拒绝访问，通常是权限问题 |
| 瀑布流网格 | masonry grid | 卡片像瀑布一样错落排列 |
| 标注截图 | annotated screenshot | 在截图上圈出/标注具体问题区域 |

**本章小结**

- 遇到报错：右键检查 → 复制控制台日志 → 粘贴给 Codex
- UI 问题：截图 + 标注 + 具体描述，比纯文字高效十倍
- 七八个提示词后应用已相当完善——每轮用「截图 + 日志」精准反馈

---

## 04 跨平台迁移：桌面端和 iOS

**Riley Brown：** Web 应用在 localhost 运行，只能在自己电脑上用。怎么让团队所有人都能用？部署到 Vercel——一键点击，生成公网链接。只需要把 Vercel 域名加到 Firebase 授权域名列表里，认证就能正常工作。

**Riley Brown：** 然后我想——能不能把这个 Web 应用变成桌面应用和 iOS 应用？我在 Codex 里说：「把这个应用变成桌面应用和 iOS 应用。我们将使用 Electron 和 Swift。要求它们与同一个后端通信，所有数据库、存储和认证都保持连接状态。」**它给了一个 Markdown 格式的完整迁移计划。**

**Riley Brown：** 29 分 52 秒后——**桌面应用跑起来了。** Electron 框架把 Web 应用封装成了桌面程序，有自己的图标。登录正常，数据和 Web 版完全同步。我在桌面版保存一条 X 帖子——Web 版立刻能看到。三端（Web + 桌面 + iOS）共享同一个 Firebase 后端。

**Riley Brown：** iOS 版需要 Xcode 模拟器。安装好 Xcode，运行项目——**模拟器构建成功，登录正常。** 我做了一些 UI 调整：搜索栏简化、加号按钮改成右下角悬浮按钮。**一个提示词改六七个细节，iOS 版立刻更新。**

**Riley Brown：** 我简直无法想象现在竟然可以做到这一点。我们基本上在一个提示词里就完成了 98% 的工作。

> **金句 · Riley Brown**
> **中文：** 我简直无法想象——一个提示词，从 Web 到桌面到 iOS，三端共享同一个后端。
> **原文：** I simply can't believe this is possible — one prompt, from web to desktop to iOS, all sharing the same backend.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Electron | Electron | Web 应用的桌面封装器 |
| Swift | Swift | 苹果原生 iOS 开发语言 |
| Xcode 模拟器 | Xcode simulator | 在 Mac 上模拟 iPhone 运行 |
| Vercel 部署 | Vercel deploy | 一键把 Web 应用放到互联网 |

**本章小结**

- Vercel 一键部署 Web 应用到公网，加域名到 Firebase 授权列表
- Electron 封装 Web → 桌面应用，Swift 迁移 → iOS 应用
- 三端共享同一个 Firebase 后端，数据实时同步

---

## 05 代理技能：让 AI 成为应用的活跃用户

**Riley Brown：** 我之前要求添加一个功能——让 AI 代理能直接把东西添加到「共享大脑」里。我复制这些指令，开启新聊天：「使用这个技能，将这些推文添加到我的共享大脑中。」

它完成了。通过 Firebase 会话认证，三条推文都添加到了数据库里。**代理确实成功添加了内容。**

**Riley Brown：** 这就是我想说的——**高质量的 AI 应用应该是双向的**。不只是人用 AI，AI 也能直接操作应用的数据。你需要为 AI 编写特定的指令块（Skills），解释如何访问和操作数据库，包含密码或访问令牌，确保只有授权的代理才能使用。

**Riley Brown：** 这个应用的意义不只是「团队共享的第二大脑」——它也是 AI 自动化工作流的一部分。你可以说：「查看数据库，找到最适合做视频回应的 10 个素材。」代理就能搜索数据库、排序、返回结果。**应用是人和 AI 的共同操作面。**

> **金句 · Riley Brown**
> **中文：** 高质量的 AI 应用不只是人用 AI——AI 也应该能直接操作你的数据，成为应用的活跃用户。
> **原文：** A high-quality AI app isn't just humans using AI — AI should also directly operate on your data, becoming an active user of the application.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理技能 | agent skill | 让外部 AI 读写应用数据库的指令集 |
| 双向 AI 应用 | bidirectional AI app | 不只是人用 AI，AI 也能操作应用数据 |
| Firebase 会话认证 | Firebase session auth | 代理通过令牌安全访问数据库 |
| 共享大脑 | shared brain | 团队 + AI 共用的视觉化数据库 |

**本章小结**

- 代理技能块 = 让外部 AI 能读写应用数据库的指令集
- 高质量 AI 应用是双向的：人用 AI，AI 也能操作应用数据
- 应用是人和 AI 的共同操作面——不只是工具，而是协作平台

---

## 大总结

| 维度 | 要点 |
|------|------|
| **Vibe 编程** | 只提供想法，AI 写全部代码——零代码经验也能构建生产级应用 |
| **Firebase 三件套** | 认证 + 数据库 + 存储桶 = AI 应用的数据持久化方案 |
| **调试方法** | 截图 + 标注 + 控制台日志 = AI 调试的黄金法则 |
| **跨平台** | 一个提示词：Web → Electron 桌面 → Swift iOS，三端共享后端 |
| **代理技能** | 高质量 AI 应用是双向的——AI 也能直接操作应用数据 |
| **7 个提示词** | 从零到全栈应用 + 桌面端 + iOS = 约 7 个提示词 |

> **封底金句**
> **中文：** 我简直无法想象——一个提示词，从 Web 到桌面到 iOS，三端共享同一个后端。现在就是成为创造者最激动人心的时刻。
> **原文：** I simply can't believe this is possible — one prompt, from web to desktop to iOS, all sharing the same backend. Now is one of the most exciting times to be a creator.

---

**相关阅读**
- [[Codex实战-Notion第二大脑与技能封装]] — Riley Brown 的另一期 Codex 实战
- [[Codex实战-100分钟完整教程]] — Codex 核心功能全面讲解
