---
title: "Codex实战：30分钟掌握 Codex 95% 的核心功能"
tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "skills"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "skills"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Riley Brown 七功能 walkthrough：本地文件优先、Agents.md 双层记忆、@ 插件与 / 技能 SOP、GPT-Image、计算机/浏览器使用、周五自动化与 Chronicle 屏幕感知。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-30分钟掌握95%核心功能.md"
source_sha256: "e31896b2fa96de4e514a47717c557b4c74c1afb38cb387527438a0caf257cb4e"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1bpdAB8Ejp/"
column_url: "https://www.bilibili.com/read/cv48718006/"
duration: "28:57"
saved: 2026-07-06
updated: 2026-07-06
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1bpdAB8Ejp/ingest"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1bpdAB8Ejp/ingest/column_article.md"
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1bpdAB8Ejp/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
host_name: "Host"
guest_name: "Riley Brown"
guest_title: "AI 创作者 / Codex 实战讲师"
speaker_inference: "column_monologue_repackaged"
speaker_confidence: high
author:
  - "[[Riley Brown]]"
concepts:
  - id: local_first
    zh: 本地优先
    en: local-first file access
    one_line: 文件落盘在你电脑，不是 ChatGPT 云端沙盒
  - id: dual_memory
    zh: 双层记忆
    en: manual + auto memory
    one_line: Agents.md 你下令，自动记忆它观察
  - id: skill_sop
    zh: 技能 SOP
    en: skill as SOP
    one_line: 满意的一次对话逆向工程成斜杠指令
  - id: computer_use
    zh: 计算机使用
    en: computer use
    one_line: 代理真动鼠标键盘，接管 Canva 等 GUI
  - id: chronicle
    zh: Chronicle
    en: Chronicle screen awareness
    one_line: 截屏感知当前屏幕，主动给上下文建议
---

# Codex 实战：30 分钟掌握 95% 核心功能

**Host：** Host（观众视角）  
**Guest：** Riley Brown（AI 创作者 / Codex 实战讲师）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · solo 教程重排 · 中文口语化）  
**B 站：** [BV1bpdAB8Ejp](https://www.bilibili.com/video/BV1bpdAB8Ejp/) · **时长** ~29 min

---

## 开场

你在用 ChatGPT、Claude、Cursor 或 Codex，但搞不清哪个适合知识工作、怎么嵌进日常——这期 Riley Brown 用 **~30 分钟** 把 OpenAI **Codex 超级应用** 的七大能力跑一遍：每个功能都带 live demo，不是幻灯片。

Codex 像 Claude Code，但界面更面向知识工作与编程。跟 ChatGPT/Claude 聊天上传文件存云端不同，Codex **所有产出直接落本地磁盘**——代理对你电脑有完整读写权。Riley 说，搞懂这七块，日常 **95% 用法** 就覆盖了。

六章预告：**本地文件与项目化** → **双层持久记忆** → **@ 插件接 Gmail/Notion** → **/ 技能当 SOP** → **GPT-Image + 计算机/浏览器使用** → **自动化与 Chronicle**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 超级应用 | super app | 聊天 + 本地文件 + 预览 + 控电脑，一窗搞定 |
| 本地优先 | local-first | 创建/上传的文件在你磁盘，不进云端沙盒 |
| 项目化 | project from folder | 聊天绑到本地文件夹，产出自动落盘 |
| 手动记忆 | manual memory | 你明确要求记住的偏好，写进 Agents.md |
| 自动记忆 | auto memory | 代理静默观察习惯，本地文件维护 |
| 插件 | plugin | 艾特 `@` 调用的连接器（Gmail、Notion 等） |
| 技能 | skill | 斜杠 `/` 调用的可复用 SOP 指令文件 |
| 计算机使用 | computer use | 代理模拟鼠标键盘操作本机 App |
| 浏览器使用 | browser use | 代理在 Codex 内控浏览器测 UI |
| Chronicle | Chronicle | 屏幕截屏感知，理解你正在看什么 |

---

## 01 本地文件系统：Agent 的真正底座

**Host：** Codex 跟 ChatGPT 最硬的一条差别是什么？能现场秀一个「真文件」例子吗？

**Riley：** 第一眼像 ChatGPT 或 Claude——能建聊天。但 ChatGPT/Claude 上传的文件在**云端**；Codex 上传或创建的一切都在**你本地电脑**。代理有完整文件访问权，目标是帮你完成电脑上任何知识类或编程类任务：动态图形、着陆页、图像生成并嵌进网站、小游戏和 3D 模拟、前后端移动 App、桌面 App、GPT-5.5 研究后出 Excel、多页幻灯片、Word 带图表、演示稿导出 Canva——还没算它能**完全控制电脑和浏览器**，后面细讲。

第一个核心功能：**完全的文件访问权限**。ChatGPT 给你的和它生成的多在云端；Codex 全在本地，Agent 对你电脑有完整访问。我演示：下载文件夹里有个「待处理收据」，大约 **60 张**收据照片。我对 Codex 说：「在下载文件夹有一批收据，用 Excel 分析并做图表，展示交易类型和你发现的其他模式。」选 GPT-5.5 High 跑。

Agent 能访问电脑上任何文件，自动找到路径——你看它定位到 `Users/Riley Brown/Downloads/待处理收据`，数了 **53 张**，OCR 提取文本、分类每笔交易，在本地建 Excel 工作簿。大约 **七分钟** 完成。打开后是真 Excel：总支出 **$25,982**，有收据明细、类别摘要、支付摘要、按支付方式的趋势、月度趋势。点「在文件夹中打开」——文件就在 Finder 里，不是云链接。

怎么保持整洁？**项目化管理**。两种建聊天：侧边栏「新建聊天」——不属于特定项目；或建**项目**并选「从现有文件夹开始」。我习惯项目都放在「文档」文件夹。新建「七个功能」文件夹当项目，左侧面板出现；项目里加聊天，多任务可同时开多个 Agent。

我在项目里让 Agent 建 Word 文档——完成会自动存进对应文件夹。「在 Finder 中打开」进「七个功能」，文档标题「在两分钟内学习 90% 的 OpenAI Codex」已经落盘，在「输出/文档」子文件夹里能摸到。同一项目开新聊天，自动带项目上下文；输入 `@学习` 引用文件夹里任何文件。我说：「把这个文档变成着陆页，当观众的学习资源。」它读本地文档，生成着陆页代码，同样存本地。打开就是完整 landing page。

> **金句 · Riley**
> **中文：** 文件在你磁盘上，Agent 才像在真实办公室跟你协作——不是困在聊天沙盒里。
> **原文：** All files live on your computer — the agent collaborates in your real filesystem, not a sandbox.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 本地优先 | local-first | 产出进 Finder，可 `@` 引用项目内文件 |
| 项目化 | project from folder | 聊天绑文件夹，上下文 + 落盘路径一致 |
| 光学字符识别 | OCR | 收据照片抽文字再分类入账 |
| 多任务 | multitasking | 同一项目并行多个 Agent 聊天 |

**本章小结**

- Codex ≠ 云端聊天：读写本地磁盘是 Agent 底座
- 收据 demo：53 张 → 七分钟 → 真 Excel 仪表盘 $25,982
- 「从现有文件夹开始」+ `@` 引用 = 项目内文档互转（Word → 着陆页）

---

## 02 双层持久记忆：Agents.md 与自动观察

**Host：** 每次重讲偏好很烦——Codex 记忆怎么分？我该碰哪个文件？

**Riley：** 第三个要讲的功能其实是第二个：**持久记忆**，分两类——**手动记忆**和**自动记忆**。

手动记忆：你主动说「记住这个，以后都用」。我对着陆页改完格式很满意，说：「从现在开始沿用这种格式；以后做学习类着陆页没指定样式就默认这套；内容多务必带目录。」Agent 把它写进 **Agents.md**——侧边栏能搜到这个文件，是 Agent 存手动偏好之处。点进去是我过去要求记住的一切，包括刚加的学习页格式和风格描述。Agents.md 是**不断更新的活文档**，你的手动控制台；你可以让 Agent 更新，也可以自己改。

自动记忆：你通常不用碰。跟 Agents.md 一样存在本地文件里。新建聊天问：「告诉我 Codex 记忆文件夹里记录了什么，我想知道你都知道什么，请打开那个文件。」它给路径——**不建议用户手动改**，只观察 Agent 对你的记录，我通常几周一查。文件总结了我让 Agent 完成过的任务类型，帮别人搭类似工作流时很有用。让 Agent 按自己的方式存；用得越久越准。Agents.md 才是你下命令的地方。

> **金句 · Riley**
> **中文：** 手动记忆你掌舵，自动记忆它观察——别混成一个文件乱改。
> **原文：** Agents.md is your manual console; auto memory is what the agent observes — don't edit that one by hand.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 手动记忆 | manual memory | 你明确要求的偏好 → Agents.md |
| 自动记忆 | auto memory | 静默记录习惯，本地文件，勿手改 |
| 活文档 | living document | Agents.md 随使用持续追加规则 |

**本章小结**

- 双层：Agents.md（你下令）vs 自动记忆（它观察）
- 着陆页格式/目录这类偏好 → 说一次，写进 Agents.md
- 自动记忆文件只读观察，几周一查即可

---

## 03 插件：@ 把 Agent 接到 Gmail 和 Notion

**Host：** 第三个核心功能是插件——跟技能什么关系？能演示读邮件吗？

**Riley：** 插件是 Codex 的**连接器**：可安装、可重用的捆绑包，把 Agent 接到外部工具、App 和工作流——让代理能创建其他能力，连上你日常用的所有工具。进插件标签，点两下就能加 Slack、Gmail。Gmail 插件自带技能：Gmail 技能 + 收件箱分类技能。目前 **100+ 插件**，把 Codex 接到日常工具。

我建了新项目「品牌合作」——电脑上的文件夹。指令：查过去两周邮件，找出提供付费推广的品牌，做研究，汇总成表格带备注。输入 `@Gmail`，插件菜单里选——我超爱用这个菜单点发送。Codex 通过插件搜近期邮件，大约 **五分钟** 完成。

同时可以点「新消息」开第二个 Agent：「查 Notion（`@Notion` 插件），找我的高质量长篇脚本，围绕这个主题写脚本；用 Excalidraw 图表技能。」两个 Agent 并行，都用插件。「品牌合作」任务完成——打开 Markdown，列了所有视频赞助公司，对方要求、研究笔记都有。还能让它回复邮件——能读就能从你的账户发。

Notion 插件那边：它查 Notion、读我历史脚本，开头写「你有没有觉得 AI 编码工具每周更强也更 confusing？」——语气像我，因为参考了全部脚本，用 Notion 插件创建文档。插件是 **`@` 入口**；技能是 **`/` 入口**，下一章细讲。

> **金句 · Riley**
> **中文：** 插件是 `@`，技能是 `/`——两个命令别混。
> **原文：** Plugins are `@`; skills are `/` — two different entry points.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 连接器 | connector / plugin | `@` 调用，接 Gmail/Notion/Slack 等 |
| 并行 Agent | parallel agents | 新消息开第二窗口，各跑各的插件任务 |
| 收件箱分类 | inbox triage | Gmail 插件内置，筛赞助/推广类邮件 |

**本章小结**

- 100+ 插件：`@` 提及，Gmail 读信 + Notion 写稿可并行
- 品牌合作 demo：两周邮件 → 五分钟 → Markdown 优先级表
- 插件给「接外部世界」；技能给「复用成功路径」（下章）

---

## 04 技能：满意输出逆向工程成 SOP

**Host：** 你说技能是标准作业程序——怎么从一次成功对话变成 `/` 能反复调用的东西？

**Riley：** 第四个功能：**技能（Skills）**——可重复使用的工作流配方或 **SOP**，Agent 可反复调用。插件标签下有子标签「技能」——像指令文件，Agent 每次按文件执行。所有技能在插件文件夹的「技能」子目录。

创建方式一：**提示词转技能**——「创建一个名为某某的技能，功能是……」——生成可复用指令文件，效果可能不如方法二。

方法二我更喜欢：**手动工作流法**。先让 Agent 干活，来回调整直到输出满意；然后逆向工程：「我对这个输出很满意，把它变成一个技能。」

回到品牌合作表格——按优先级颜色编码，质量很高。我说满意，请变成技能。Agent 理解：用户要能随时分析 Gmail 拿品牌赞助——转成 **「品牌交易研究员」** 技能 MD，可打开读全流程指令。新建聊天，输入 `/` 选「品牌交易研究员」——它会调 Gmail 等插件；**一个技能可以包含用特定插件的指令**，本质是一串执行特定任务的步骤。

这期视频我还用 Excalidraw 技能：「查看着陆页文档，在 Excalidraw 里做大量实用图形，用 Excalidraw 图表技能。」思考工作 **4 分 23 秒**，生成完整大纲图——介绍、摘要、内存/插件/技能、技能创建等。我说：「很喜欢这种背景格式，更新技能，以后总把内容放在这种容器里，多图时给包含所有图表的链接。」**即使用某技能一段时间，意外的好输出也能说「以后总是这样格式化」**——每次用技能都是改进机会。

> **金句 · Riley**
> **中文：** 偶然成功不算——满意了就固化成 `/`，才是可规模化的生产力。
> **原文：** Turn accidental wins into slash-command SOPs — that's scalable productivity.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 标准作业程序 | SOP / skill | 斜杠 `/` 调用的指令文件 |
| 手动工作流法 | manual workflow method | 迭代满意 → 「变成技能」 |
| 提示词转技能 | prompt-to-skill | 直接描述功能建技能，快但可能弱于迭代法 |

**本章小结**

- `/` 技能 vs `@` 插件：SOP 可内嵌插件调用指令
- 最佳实践：跑通 → 迭代 → 「满意，变成技能」
- 技能可随优质输出持续更新格式规则

---

## 05 GPT-Image、计算机使用与浏览器使用

**Host：** 图像生成之后你说 Agent 能真控电脑——Canva 和浏览器测试怎么做的？

**Riley：** 第五个功能：**内置 GPT 图像访问**——Codex 内直接用顶尖图像模型。新建「内容」项目：「为毛衣公司生成产品照片。」粘贴第一款针织毛衣图，要求用 **GPT-Image 2** 创建五张图——不同国籍模特穿这件毛衣；三张单人、一张三人、一张五人。跑任务，文件夹里开始落图；用内置 **ImageGen** 技能（技能标签里可见系统预置，默认最新最好模型）。五张依次生成完毕。

这就引出第六、七个功能：**浏览器使用**和**计算机使用**。计算机控制靠插件——输入「计算机使用」即可调用。我下令：在电脑上打开 **Canva**，新建演示文稿，把五张图逐张放幻灯片上——每张一页，共五页。Codex 控制电脑，Mac 应用列表里看到 Canva，鼠标在动，我没碰键盘。它创建演示稿，五张图全放进去——屏幕上有 computer use 的鼠标轮廓。

Codex 里还有浏览器——打开 index HTML 会在浏览器里跑。我说：「把它变成应用程序，测试界面，确保按钮和导航在浏览器功能下正常工作。」Agent 把项目变 App，用**浏览器使用**控 Codex 内浏览器测试——颜色略不同，能看到 AI 鼠标在点。测开始按钮、滚动、测验流程、侧面板——**任何能在浏览器打开的东西都能让 browser use 测**。GUI 不需要专门 API——人类能点的，Agent  increasingly 能点。

> **金句 · Riley**
> **中文：** 键盘、鼠标、屏幕——人类的交互界面，现在 Agent 也能用了，而且进步是指数级的。
> **原文：** The human interface — keyboard, mouse, screen — agents can use it now, and it's improving exponentially.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 图像生成技能 | ImageGen skill | Codex 预置，GPT-Image 系列 |
| 计算机使用 | computer use | 控本机 App（Canva 排稿 demo） |
| 浏览器使用 | browser use | Codex 内浏览器点测 UI/测验流 |
| 无 API 接管 | GUI without API | 不靠集成，靠屏幕级操作 |

**本章小结**

- GPT-Image 2：五张模特图落本地「内容」文件夹
- Computer use：Canva 五页幻灯片全自动排版
- Browser use：HTML App 内测按钮/导航/测验——免专门 API

---

## 06 自动化与 Chronicle：从被动响应到主动协作

**Host：** 第七个功能是自动化——品牌表能定时跑吗？Chronicle 又是什么？

**Riley：** 第七个功能：**自动化**——跟 Codex 对话就能建自动化流。品牌合作聊天里，邮件分析后做了 Excel 表格，又转成「品牌交易研究员」技能。现在可以说：**每周五早上 9 点**执行这个任务并更新表格——创建循环自动化。界面里出现「每周品牌交易表已更新」，详情：周五 9:00 活跃，上次运行为空（还没到点），系统用品牌交易研究员技能扫 Gmail 里付费推广、赞助、品牌交易、网红营销等关键词。

进「自动化」标签能看到条目，可编辑。还有一个叫 **Chronicle** 的新功能——设置 → 个性化 → 「使用 Chronicle 研究预览」，打开后显示运行中。有点侵入性：基本**持续记录屏幕**，了解你在处理什么。我打开演示稿、在浏览器滚动，问 Chronicle：「告诉我该在 Codex 视觉演示里加什么。」它用 Chronicle 技能做实时屏幕分析，拉最新截图，结合旧图和刚打开的内容——跟踪我在做的所有事。调用方式就说「使用 Chronicle」。

它建议：加 Codex 超级应用地图、提示文件完整控制循环图、Chronicle 演示页、可重用技能页、为什么 Codex 优于其他工具——**我没给额外信息，它就知道幻灯片组里有什么**，因为 Chronicle 一直在截屏。

收束一下七大能力：**完整文件控制**（创建/编辑/删除本地任意文件）；**持久记忆**（Agents.md 手动 + 自动）；**插件**接所有工具；**技能**扩展任何成功任务；**GPT-Image** 世界顶尖图像模型；**浏览器 + 计算机使用**像人类一样控电脑；**自动化**——日/周/月重复 Agent 做过的有用事。Chronicle 是额外：**屏幕感知 → 主动建议**，从被动响应跨到主动协作。

> **金句 · Riley**
> **中文：** 把 Agent 干过的有用事设成周五 9 点——偶然成功变成无感闭环。
> **原文：** Take anything useful the agent did and say: do this every Friday at 9am — accidental wins become ambient loops.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 循环自动化 | recurring automation | 自然语言设定日/周/月定时 |
| Chronicle | Chronicle | 屏幕截屏 + 上下文，主动补全演示/文档 |
| 无感协作 | ambient collaboration | 不必复制粘贴屏幕内容，它「看见」 |

**本章小结**

- 品牌交易技能 → 周五 9:00 自动更新表格
- Chronicle：开预览后截屏感知，「该加什么幻灯片」无需手述上下文
- 七功能 + Chronicle = 本地文件 + 记忆 + 连接 + SOP + 图像 + 控机 + 定时 + 屏幕智能

---

## 总结：Codex 是本地优先的超级 Agent，不是云端聊天

| 维度 | 要点 |
|------|------|
| 定位 | OpenAI Agent 超级应用：知识工作 + 编程，界面比 Claude Code 更易上手 |
| 底座 | 本地文件优先；ChatGPT 云存 vs Codex 落盘 Finder |
| 记忆 | Agents.md 手动 + 自动观察；别手改自动记忆文件 |
| 语法 | `@` 插件（100+）接 Gmail/Notion；`/` 技能固化 SOP |
| 技能 | 满意输出 → 「变成技能」；可迭代更新格式 |
| 控机 | GPT-Image 5 张 demo；computer use 排 Canva；browser use 测 App |
| 闭环 | 周五自动化 + Chronicle 屏幕感知 → 主动协作 |

> **金句 · Riley（封底）**
> **中文：** 搞懂这七块，你就掌握了 Codex 95% 的核心——剩下 5% 是你自己的 Skill 栈。
> **原文：** Master these seven and you've got ninety-five percent of Codex — the last five is your personal skill stack.

### 对个人的启示

- 从**一个本地项目文件夹**开始：收据 Excel 或 Word → 着陆页，感受 `@` 引用
- 满意格式立刻写进 Agents.md，别下次重讲
- 第一次跑通品牌/邮件类任务就 `/` 固化，再挂周五自动化

### 对团队/产品的启示

- **本地优先**是 enterprise 知识工作的信任前提——产出可审计、可进现有文件夹结构
- 插件 + 技能分层：`@` 接系统，`/` 接流程，避免把所有逻辑塞进一个 mega prompt
- Computer/browser use 降低「无 API 软件」集成成本——长期看是 Agent OS 的关键能力

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 01:15 | 本地文件系统是 Agent 底座 |
| 05:02 | 手动 + 自动持久记忆 |
| ~08:00 | 插件 `@` 连接 Gmail / Notion |
| 10:05 | 技能 `/` 与 SOP 固化 |
| 18:42 | 计算机使用 / 浏览器使用 |
| 22:15 | 自动化与 Chronicle |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1bpdAB8Ejp/ingest`
- **专栏主源**：https://www.bilibili.com/read/cv48718006/
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV1bpdAB8Ejp/article.md`
- **B 站**：https://www.bilibili.com/video/BV1bpdAB8Ejp/
- **时长**：28:57

### 相关阅读

- [[Codex实战-100分钟完整教程]] — 更长版 Codex 系统教程  
- [[OpenAI播客-用Codex处理日常工作]] — OpenAI 内部用 Codex 处理日常任务  
- [[Codex实战-构建全能AI营销团队]] — Riley 另一期：7 Skills 跑通营销全流程  
- [[Codex负责人-现场演示Codex]] — OpenAI 官方 knowledge work 演示  
- [[OpenAI官方-Codex新手教程]] — CLI / AGENTS.md / MCP 入门  

---

### 收录说明

- **视频**：[BV1bpdAB8Ejp](https://www.bilibili.com/video/BV1bpdAB8Ejp/)（B 站 *Easonlee的AI笔记*）  
- **讲者**：Riley Brown（视频主持人 / 演示者）  
- **原始发布**：2026-04-29  
- **版本**：Host-Guest canonical v3.2（S 级 · 专栏主源 · 2026-07-06）
