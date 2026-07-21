---
title: "Codex 实战：100 分钟完整教程"
tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "ai_coding", "skills", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "ai_coding", "skills", "harness_engineering"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Riley Brown 完整拆解 Codex 桌面端：项目文件夹边界、插件/技能/自动化、Steer 实时纠偏、六线并行 vibe coding Chorus App，并用 Claude Code/Remotion 补设计短板。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-100分钟完整教程.md"
source_sha256: "7f7de02098a40c83b0fdc9ce779181a84b5f44b2455a979ae0f6ad1d31fe9202"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1j15A6gEcL/"
duration: "67:09"
saved: 2026-07-06
updated: 2026-07-06
material_tier: S
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1j15A6gEcL/ingest"
column_url: "https://www.bilibili.com/read/cv48903377/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1j15A6gEcL/ingest/column_article.md"
transcript_source: "bilibili-retranscribe/BV1j15A6gEcL/article.md"
source_original_date: "2026-04-20"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "编者问"
guest_name: "Riley Brown"
guest_title: "资深 AI 开发者 · YouTube 创作者"
speaker_inference: "ASR + column；单人教程由编者重构问答"
speaker_confidence: high
factual_status: partial
factual_reviewed: 2026-07-13
spot_check: 2026-07-13
verification_basis:
  - transcript
  - transcript_json
  - column
unresolved_facts:
  - "长视频的全部产品细节与数字尚未逐条核验；本轮仅完成四点抽样。"
author:
  - "[[Riley Brown]]"
concepts:
  - id: codex_super_app
    zh: Codex 超级应用
    en: Codex super app
    one_line: 编码+浏览器+计算机控制合一的通用代理界面
  - id: project_folder
    zh: 项目文件夹
    en: project folder
    one_line: 给代理明确的本地读写边界与输出目录
  - id: steer
    zh: 转向
    en: Steer
    one_line: 代理运行中插队纠偏，不必等任务结束
  - id: serial_parallel
    zh: 串行指令并行执行
    en: serial prompts / parallel execution
    one_line: 一条提示发出即切下一聊天，多窗口同时跑
  - id: skill_creator
    zh: 技能创建者
    en: skill creator
    one_line: Codex 内置工具，把 API 工作流封装成可复用技能
---

# Codex 实战：100 分钟完整教程

**编者问：** 以下问题用于重组单人教程，并非原视频问答。
**Guest：** Riley Brown（资深 AI 开发者）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 单人教程 reframed 为 Moderator Q&A）  
**B 站：** [BV1j15A6gEcL](https://www.bilibili.com/video/BV1j15A6gEcL/) · **时长** ~67 min · **专栏** [cv48903377](https://www.bilibili.com/read/cv48903377/)

---

## 开场

Riley Brown 用一条视频把 OpenAI Codex 桌面端从「像 ChatGPT 的聊天窗」讲到「六条代理线同时搭一家初创公司」。核心判断：**Codex 不是代码补全插件，而是能控文件、控浏览器、控键鼠的通用代理超级应用**；会用的人差别不在 prompt 技巧，而在 **项目边界、技能扩展、Steer 纠偏、串行下指令并行等结果**。

六章按视频 **重点速览** 时间戳：**统一界面与项目空间** → **插件/技能/自动化** → **Steer 与设计工具链** → **六线并行 Chorus App** → **Claude Code 补 UI + Remotion 视频** → **TestFlight/Vercel/Typefully 收尾**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| Codex 超级应用 | Codex super app | 编码、协同、浏览器、计算机使用合一界面 |
| 计算机使用 | Computer Use | 代理直接操控本机键鼠，OpenAI 版 Riley 称最强 |
| 项目文件夹 | project folder | 指定本地目录，代理读写与 `output/` 落盘有界 |
| 插件 | plugin | 预装能力单元（Google 日历、Figma、Gmail 等） |
| 技能 | skill | 用户自定义可重用工作流，像「食谱」 |
| 转向 | Steer | 代理运行中插队改方向，不等队列排空 |
| 技能创建者 | skill creator | 内置工具，研究 API 并生成新技能 |
| 串行指令并行执行 | serial prompts / parallel execution | 发一条任务立刻开新聊天，多代理同时跑 |
| 分叉聊天 | fork chat | 复制上下文到新聊天，衍生子任务（如融资 deck） |
| 氛围编码 | vibe coding | 用自然语言迭代产品，少手写语法 |

---

## 01 Codex 是统一编码与计算机控制的超级应用 [01:15]

**编者问：** 很多人把 Codex 当「桌面版 ChatGPT」。你视频开头说它是 **唯一统一的通用代理**——和 Claude Code 比，差在哪？

**Riley Brown：** 表面确实像 ChatGPT：中间聊天框、能网页搜索。但 Codex 里塞的是 **编码 + 协同 + 浏览器 + 计算机使用** 一整条链。代理能 **创建/编辑/删除本地文件**，后面还会 **完全控制键鼠**——OpenAI 的 Computer Use 我试过，比别家强一截。

视频分两半：前半 **线性打基础**（权限、模型、Effort、预览里直接评论纠错、做 Excel/PowerPoint/文档、技能插件、自动化）；后半 **六件事并行**——移动 App、网站、发布视频、投资者 deck、X 自动化、设计稿。代理单次任务已经能跑 **一两个小时**，不会多任务处理的人会被拖死。

下载 Mac 版后，左侧五栏：聊天、搜索、插件、技能、自动化。关键习惯：**永远给代理一个项目起始文件夹**。我建 `Codex Projects/Riley 的 Codex 项目/`，再建子项目如 `Codex 桌面研究`。点「新建文件夹 → 打开」后，该项目下的聊天才挂到正确路径；代理生成的 xlsx、doc 进 **`output/`**，聊天本身不进文件夹，但 `@文件名` 可跨聊天引用。

演示：同一项目开两个聊天——一个查新功能，一个爬 x.com 看舆论；侧边栏 **旋转圈** 表示在跑，**蓝点** 表示未读完成。再让代理「把功能列表做成 spreadsheet」→ 侧边打开 xlsx，全屏编辑，口述「删掉源页面列」即时改。这就是 **文件即上下文**：Finder 里能看见、聊天里能 @、预览里能改。

权限我设 **Full（完全）**，模型用 **GPT 5.4 + Ultra Effort**。预览功能允许 **在渲染界面上圈注评论**，代理读截图继续改——对任何非纯代码任务都值。

> **金句 · Riley Brown**
> **中文：** 到视频结束，你在用代理完成真实工作这件事上会领先 99% 的人。
> **原文：** By the end you'll be ahead of 99% of people actually using AI agents to get work done.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 输出文件夹 | output folder | 代理在该项目下写文件的默认子目录 |
| 预览评论 | preview annotation | 在渲染 UI 上标注，代理读图改 |
| 工作量 | Effort | 模型推理深度档位，默认 Ultra |
| @ 提及 | @ file mention | 跨聊天引用项目内已生成文件 |

**本章小结**

- Codex ≠ 聊天壳；**文件 + 浏览器 + 键鼠** 才是代理形态
- **先绑文件夹再聊天**，否则上下文与落盘都飘
- 多聊天同项目 + 侧边栏状态，是后面并行的前置操作

---

## 02 建立项目空间与插件/技能/自动化边界 [05:42–12:30]

**编者问：** 项目文件夹讲清了。插件和技能很多人混——还有人说自动化就是 cron。你怎么切这三层？

**Riley Brown：** 我三十多个项目，**Command+G 搜索** 能把已从侧栏移除的文件夹拖回来——删侧栏不删磁盘。插件 vs 技能：边界故意模糊。插件是 **可安装单元**（Google 日历、Figma、Gmail）；技能是 **针对任务的可重用工作流包**，像食谱。OpenAI 把 tab 拆开，Claude 叫「自定义/连接器」——我归为一类：**扩展模型碰不到的东西**。

Google 日历插件：浏览器 OAuth 一次，聊天说「列本周活动」→ 斜杠不必打，代理识别。接着「发 weekly recap 邮件给自己」→ Gmail 插件发 Superhuman 收件箱。然后 **「每周五 16:00 跑这个」** → 自动化 tab 出现 **活跃** 任务，图标旁数字 +1。测试、编辑、补「记得用 Gmail 技能」都行——**自动化就是跟代理说「把这个变成定时任务」**。

Figma 插件：新聊天问「你能对 Figma 做什么？」→ 三种能力：查文件、生成视觉、连代码库。我开 Figma 画板测 Computer Use 写 Hello World，再语音（Wis，按住 FN）让代理为虚构鞋牌 New Shoe 做 landing——**ImageGen 无背景产品图 + 本地 Figma 操作**。但 Figma 集成逻辑是 **人在 Figma 画 → 转代码**，不是 AI 出码再回 Figma；设计师朋友转 **Paper**——专门接 Codex/Claude Code 的画板工具。

**技能创建** 是后半场高频：找 Supadata API 拉 YouTube 字幕 → 粘贴 API Key（镜头外）→ 输入 **「技能创建者」** 触发专用工具 → 生成 **YouTube 研究员** 技能。新会话调用：「看 Riley Brown 最新 10 条视频，做 hook 分析 + 缩略图 + Word 报告」。再 **「每月最后一天自动跑」** → 第二个自动化。第一部分结束时我已有 **每周日历回顾 + 月度 YouTube 报告** 两个 cron。

> **金句 · Riley Brown**
> **中文：** 遇到反复做的烦事，先找有没有 API——这就是 vibe coding 的供应链。
> **原文：** If I have a tedious process I do repeatedly, I look for an API—that's the supply chain of vibe coding.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自动化 | Automation | Codex 内对话创建的定时/周期任务 |
| MCP | Model Context Protocol | 连 Paper/Notion 等外部系统的协议层 |
| Supadata | Supadata Transcript API | 第三方 YouTube 字幕 API，免费额度约百条/月 |
| 斜杠命令 | slash command | `/插件名` 显式调用，多数时候可省略 |

**本章小结**

- **插件 = 官方连接器，技能 = 你写的 workflow**；自动化 = 把任一聊天任务 cron 化
- API Key + **技能创建者** 是扩展边界最快路径
- Figma 适合「人画 AI 转码」；**Paper** 适合「AI 在画板里直接改设计」

---

## 03 实时 Steer 与设计工具链 [12:30–18:45]

**编者问：** Paper 演示里按钮重叠——很多工具只能等跑完再排队。Codex 的 **Steer** 怎么改协作节奏？

**Riley Brown：** 传统队列：代理跑着，你输入只能 **等当前任务结束**。Codex 有 **Steer（转向）**——像打方向盘。我截图重叠的 CTA，粘贴说「顺便修一下」，默认回车是排队，点 **Steer** 则在 **当前 tool call 结束后立刻插队**。代理回复：「已开始下移按钮并重查 Hero 文案」——不必等整页生成完。

Paper 里我让它 **再出四个变体、换背景并行**——专门给 agent 集成的工具会越来越多；GitHub、Linear、Neon Postgres 都想挤进插件列表首位。相比 Figma 集成，Paper **为现有 agent 工作流而生**，动画编辑过程可实时看。

同一节还埋了 **迷你窗口**：右键聊天 →「在迷你窗口中打开」，主界面最小化，旁边继续 Figma/Paper/Xcode——**物理多任务的前置 UI**。

Steer + 语音输入 + 截图，是我日常 triad：**说想法、指问题、不等队列**。

> **金句 · Riley Brown**
> **中文：** Steer 让你在人机协作里实时对齐，而不是批处理式改需求。
> **原文：** Steer lets you align in real time—you don't wait for the whole task to finish.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 转向 | Steer | 运行中插队指令，非队列等待 |
| Paper | Paper design tool | AI-native 画板，接 Codex/Claude Code MCP |
| 迷你窗口 | mini window | 聊天 detach，边跑代理边操作别的 App |
| 消息队列 | message queue | 默认新输入排队；Steer 绕过 |

**本章小结**

- **Steer = 长任务中的实时纠偏**，比「Stop 再重发」省上下文
- 设计链：**Figma（人画）vs Paper（AI 画）**；插件列表会指数膨胀
- 迷你窗口 + 语音，为后面六线并行做 UI 准备

---

## 04 串行指令、六线并行 Chorus App [28:15]

**编者问：** 第二部分你说最高效的人不是真·多线程，而是 **串行下指令、并行等结果**。Chorus 角色扮演具体怎么排？

**Riley Brown：** 代理越来越慢——**一条 prompt 就是一项任务**。顶尖操作者：把精力砸进 **一条提示**，回车，**立刻换聊天**做下一件。我们同时推进六样：iOS App **Chorus**（代理知识库 + 可复制技能）、landing + Tally 候补名单、Remotion 发布视频、投资者 PPT、X/Typefully 自动化、移动 UI 设计。

新建项目 **「我的新业务」** → 聊天 1：截图 + Markdown **六件事 checklist**（Chorus 定位：学代理、比平台、抄技能）。聊天 2：**/移动设计** 技能（我从 Claude 新设计工具 reverse-engineer 进 Codex）→ 极简 Apple 风多 Tab 原型。聊天 3：Swift **Hello World** 开 Xcode + 模拟器（要 Mac、~20GB、iOS 模拟器）。午饭 **25 分钟**，三条线都跑完——设计原型链接、Xcode 工程可跑。

集成：「把设计屏塞进 Swift App」→ 并行开 **Tally 嵌入 React landing**（`@` 复制 embed code）。滚动 UX 微调（顶栏 sticky、列表在 tab bar 下淡出）每次改完 **Xcode Play** 真机/模拟器验证。数据库：问代理「数千技能怎么存、用户不能改我只用 AI 灌内容？」→ **Supabase + Postgres**；插件里没有官方 Supabase → 网上搜技能 + **Supabase MCP**（有时需 **重启 Codex** 才识别新 MCP）。**YouTube 研究员** 技能再上场，灌 **Learning** 五节课（代理 101、记忆、技能团队…）。

> **金句 · Riley Brown**
> **中文：** 严格说不是多任务，是串行发令、并行等代理——Trust then switch。
> **原文：** It's not really multitasking—serial prompts, parallel execution. Trust the agent and switch.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Chorus | Chorus app | 虚构产品：代理教程 + 平台对比 + 技能库 |
| Tally | Tally forms | 嵌入 landing 的候补名单表单 SaaS |
| Supabase MCP | Supabase MCP | 通过 MCP 建表灌数据，常需重启会话 |
| 分叉聊天 | fork to local | 复制聊天上下文做投资者 deck 等分支 |

**本章小结**

- **六窗口 = 六份 checklist 子任务**，不是一条聊天里堆 prompt
- 不懂就问代理选型（DB、Auth）——**边做边学** 是教程后半主旋律
- MCP 加完可能要 **重启 Codex**，会话才能用新服务器

---

## 05 外部工具补设计：Claude Code + Remotion [52:10]

**编者问：** Codex 逻辑强，但你说 **网页设计不行**——怎么拆工具？

**Riley Brown：** Landing 第一版 Codex 做丑了——渐变、组件过重。我 **终端开 Claude Code**（`claude --dangerously-skip-permissions` = 全权限），给 **「我的新业务」文件夹上下文**，指令：「忘掉旧样式，读 Chorus App Swift/React 字体，极简白底，嵌 Tally，高转化。」Claude **实时改 React**，比 Codex 默认「笨重设计风」干净得多。

Remotion 插件做 **动态图形发布视频**：localhost 时间线，**30fps 帧级 Steer**（「2 秒 20 帧处改鼠标坐标到 x1000 y610」）。测试四场景 iPhone mock → 加「代理正在接管世界」+ 鼠标拨 Learn 开关 → 滚屏展示课程。Codex 生成 rough cut；**精细 motion 再 fork 到 Claude + Remotion 技能**——7 分 24 秒 Claude 把 slide 视觉拉满。

投资者 PPT：Codex **PowerPoint 技能 + fork「投资者演示文稿」** → Canva 可开；仍文字多 → 再 Claude 打磨。叙事 pivot：少讲 Supabase 技术，多讲 **「策展是切入点，代理是业务」**、iMessage 轻量付费代理、查 TAM。CleanShot Pro 截图去 Canva 顶栏黑条——**最后 5–10% 人工在 Canva 修**。

> **金句 · Riley Brown**
> **中文：** Codex 界面最好指挥；Claude Code 在设计密集型任务上明显更强——今天我才在 Codex 里试这组合。
> **原文：** Codex has the better interface to orchestrate; Claude Code is clearly better for design-heavy work—I only tried this combo today.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Remotion | Remotion | 代码化视频时间线，帧精确改 motion |
| Claude Code | Claude Code | 终端 agent，本教程用于 UI/PPT 精修 |
| Canva 导出 | Canva export | PPTX 进 Canva 做投资者 deck 最后一公里 |
| 帧级指令 | frame-accurate prompt | 按 fps 指定第几秒第几帧改元素 |

**本章小结**

- **Codex 编排 + Claude 审美 + Remotion 动效** 是 Riley 的三角分工
- 发布视频 **10 分钟专注可出初稿**，几小时可精修——Steer 按帧改
- 融资叙事用 **fork + 外模改 deck**，别死磕 Codex 默认美学

---

## 06 TestFlight、Vercel 与 Typefully 自动化收尾 [52:10+]

**编者问：** 六件事最后怎么收束？Auth、上线、社媒自动化各用什么招？

**Riley Brown：** Supabase **Email/Password Auth**（Google OAuth 中途放弃改 Apple/Email）→ 关邮件确认先跑通 → Profile 显示已保存平台/技能。真机 Riley iPhone + 触觉反馈；**App Store Connect → TestFlight** 构建链接可分享。

Web：**deploy Vercel** 公链，Tally 提交回后台验证——「Chorus Beta 2」已可注册 early access。Typefully：**V2/V3 API** 搜文档 → 技能创建 → 水果 emoji 测试推文 → 自动化 **「每天早研究并草拟三条 X 稿」**——Automation tab 变 **3 个活跃任务**（日历、YouTube 月报、Typefully 早间草稿）。

发布视频 Remotion 终版：加 BGM《追逐地平线》50% 音量；Claude 补「复制技能进 Claude Code」结尾镜头。计划表逐项勾：iOS ✓、landing ✓、deck ✓、X 自动化 ✓、视频初稿 ✓。

收尾建议：**列出业务里所有重复事，能 API 就技能化，能 cron 就自动化**——Canva、Typefully、Supabase、Remotion 全进同一 harness。Chorus App 上架 App Store 当 **他测过的技能/平台笔记**。

> **金句 · Riley Brown**
> **中文：** 卡住就问代理；想要能力就问能不能建技能——插件列表只会越来越长。
> **原文：** If you get stuck, ask the agent; if you want a capability, ask it to build a skill—the plugin list will only grow.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| TestFlight | TestFlight | Apple 内测分发，Xcode 构建上传 |
| Vercel | Vercel deploy | 一键把 React landing 上线公网 |
| Typefully | Typefully API | 多账号 X 发帖/scheduling，Riley 6 号共 27.5 万粉 |
| App Store Connect | App Store Connect | 提审与 TestFlight 管理后台 |

**本章小结**

- **Auth/DB/Deploy** 仍可在 Codex 内问路径，MCP 搞不定就重启
- 三个自动化 = **日历 + YouTube 月报 + X 草稿**，Typefully 技能可测 emoji
- 100 分钟体感来自 **六线并行 + 外模补设计**，不是单聊天从头写到尾

---

## 总结：Codex 是操作系统，不是功能列表

| 维度 | 要点 |
|------|------|
| 产品形态 | 文件+浏览器+Computer Use 合一；**先文件夹后聊天** |
| 扩展层 | 插件连接器 + **技能创建者** + 对话式 **Automation** |
| 协作 UX | **Steer** 插队、迷你窗、@ 文件、预览圈注 |
| 吞吐 | **串行 prompt、并行窗口**；单任务可达 1–2 小时 |
| 工具组合 | Codex 指挥；**Claude Code** 设计/PPT；**Remotion** 视频 |
| 落地 | Supabase + Vercel + TestFlight + Typefully API 全可在教程内跑通 |

### 对个人的启示

- 列一张 **你工作中重复流程表**，逐条问「有 API 吗 → 能技能化吗 → 能自动化吗」
- 长任务默认 **Steer + 截图**，别等跑完再改
- 美学短板 **立刻外呼 Claude**，别和 Codex 默认 UI 较劲

### 对团队/产品的启示

- **插件/MCP 生态** 会是平台战争：谁进 Codex 列表谁拿分发
- 教程证明 **单人 + 多代理窗口** 可覆盖产品/设计/增长/融资素材——组织边界继续塌缩
- **Restart after MCP**、Auth edge case 仍是 harness 粗糙点，产品化空间大

> **金句 · Riley Brown（封底）**
> **中文：** 把这些 AI 超级应用里能做的事列出来，然后尽可能自动化——它们只会越来越好。
> **原文：** List everything in your work or business and automate as much as you can—these super apps will only get better.

---

## 附录

### 章节时间戳（重点速览）

| 章 | 主题 | 时间 |
|----|------|------|
| 01 | Codex 统一界面与 Computer Use | [01:15] |
| 02 | 项目文件夹 + 插件/技能/自动化 | [05:42] / [12:30] |
| 03 | Steer + Paper/Figma 设计链 | [18:45] |
| 04 | 六线并行 Chorus App | [28:15] |
| 05 | Claude Code + Remotion 补设计 | [52:10] |
| 06 | TestFlight / Vercel / Typefully 收尾 | [52:10+] |

### Ingest

- **BV：** BV1j15A6gEcL
- **ingest：** `Recastory/workspace/bilibili-retranscribe/BV1j15A6gEcL/ingest`
- **专栏主源：** `column_article.md`（~30k 字）
- **原片日期：** 2026-04-20

### 相关阅读

- [[Codex产品负责人-Codex团队如何用Codex]] — OpenAI 团队内景：Spark、十要点规范、八周冲刺
- [[Every增长主管-Codex成为知识工作的OS]] — Codex 作为知识工作 OS 的产品叙事
- [[Codex负责人-现场演示Codex]] — 官方负责人现场 demo 对照
- [[Codex实战-构建全能AI营销团队]] — 同 UP 专栏，偏营销团队场景
