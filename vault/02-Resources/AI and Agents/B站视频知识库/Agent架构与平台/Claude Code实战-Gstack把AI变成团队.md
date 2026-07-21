---
title: "Claude Code 实战：Gstack 把 AI 变成团队"
tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "harness_engineering", "skills"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "harness_engineering", "skills"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV1tR9zB4Ezv/"
description: "Garry Tan × GStack：轻薄脚手架把 Claude Code 变 AI 工程团队——Office Hours 六问、对抗性审查、设计散弹枪、Playwright CLI QA、10–15 并行会话的 7 级软件工厂。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code实战-Gstack把AI变成团队.md"
source_sha256: "8ae3972c3d960a93548d651a8b3d85a6c057ea6fef00e7e0fd95e8a9271d3c41"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1tR9zB4Ezv/"
column_url: "https://www.bilibili.com/read/cv48269287/"
source_original_date: "2026-04-01"
host_name: "Moderator（GStack 演示场）"
guest_name: "Garry Tan"
guest_title: "Y Combinator 总裁兼 CEO · GStack 作者"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1tR9zB4Ezv/ingest"
speaker: "Garry Tan"
duration: "22:00"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1tR9zB4Ezv/article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1tR9zB4Ezv/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article 单人演示；Host 为话题过渡提问"
speaker_confidence: high
author:
  - "Garry Tan"
concepts:
  - id: gstack
    zh: GStack
    en: GStack
    one_line: Garry Tan 开源轻薄脚手架，把 Claude Code 变成带角色与审查的 AI 工程团队
  - id: office_hours
    zh: 办公时间
    en: Office Hours skill
    one_line: 编码前强制六问，模拟 YC 合伙人与创始人产品对话
  - id: adversarial_review
    zh: 对抗性审查
    en: adversarial review
    one_line: 多轮自动挑隐私/安全/逻辑漏洞并尝试修复设计文档
  - id: design_shotgun
    zh: 设计散弹枪
    en: Design Shotgun
    one_line: 并行生成多版 UI 方案，人类选方向而非自己画稿
  - id: thin_scaffolding
    zh: 轻薄脚手架
    en: thin scaffolding
    one_line: 模型已够聪明，瓶颈在流程与审查，脚手架应极薄
  - id: software_factory
    zh: 软件工厂
    en: software factory (level 7–8)
    one_line: 多 Conductor 并行会话，PR 持续落地，待办清单消失
---

# Claude Code 实战：Gstack 把 AI 变成团队

**Host：** Moderator（GStack 演示场）  
**Guest：** Garry Tan（Y Combinator 总裁兼 CEO · GStack 作者）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `bilibili-retranscribe/BV1tR9zB4Ezv/ingest/column_article.md`  
**B 站转载：** [BV1tR9zB4Ezv](https://www.bilibili.com/video/BV1tR9zB4Ezv/) · **专栏：** [cv48269287](https://www.bilibili.com/read/cv48269287/)

---

## 开场：为什么现在聊这个

Garry Tan 写代码写了十年——斯坦福系统工程、Palantir 第 10 号员工、Posterous 联创、Bookface 第一版。今年一月 Andrej Karpathy 和 Boris Cherny 说不再手写代码，他也跳进 Claude Code，三周做出 **GStack**，GitHub 星标已超过 Ruby on Rails。

这期五章：**代理时代与轻薄脚手架** → **Office Hours 六问** → **对抗性审查与设计散弹枪** → **Playwright CLI 干掉 QA 瓶颈** → **7 级软件工厂与并行 PR**。

**Moderator：** 你两个月写的代码比 2013 全年还多——先说说 GStack 到底解决什么？

**Garry Tan：** 我基本重新搭了一遍 Posterous——当年 **两年、1000 万美元、10 名工程师**。开箱即用的模型会瞎猜，不了解你的数据，规模一大就写出「看起来对、悄悄错」的代码。瓶颈**不是模型不够聪明**——设置对了，它们已经能在你的代码库上干很猛的活。反常识的是：**脚手架要极薄**。GStack 就是我对这种薄方法的实现，开源仓库，把 Claude Code 变成一支 AI 工程团队，给你专家团队级别的技能。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| GStack | GStack | Garry Tan 开源脚手架，28 个命令/skills 组成 AI 工程团队 |
| 轻薄脚手架 | thin scaffolding | 少框架多流程，让模型在特定代码库发挥专家水平 |
| 办公时间 | Office Hours | 编码前 YC 式六问，对齐商业逻辑与楔子策略 |
| 对抗性审查 | adversarial review | 多轮自动挑设计文档漏洞并尝试修复 |
| 设计散弹枪 | Design Shotgun | 并行生成多版 UI，人类当评审员选方向 |
| 楔子策略 | wedge strategy | 先解决燃眉之急，再扩展到更大商业模式 |
| 指挥家 | Conductor | 跑 GStack 的并行 Claude Code 会话管理器 |
| Gary 模式 | Gary mode | 展示模型完整推理轨迹的调试视图 |
| 软件工厂 | software factory | 多并行分支/PR 持续落地，开发者当编排者 |

---

## 01 代理时代：瓶颈不在模型，在缺团队流程

**Moderator：** 你说我们进了「代理时代」——跟以前单人对着对话框写代码，差在哪？

**Garry Tan：** 让代理干真活的方式，跟人一直一样：**团队、角色、流程、审查**。大家好，我是 Garry，Y Combinator 总裁兼 CEO，也是工程师——职业生涯前十年全职写软件。斯坦福计算机系统工程，Palantir 第 10 号员工，身兼工程师、设计师、产品经理；联创 Posterous，后来被 Twitter 收购；还做了 Bookface 第一版，YC 内部社交和知识库。我写过很多代码，今天可以明确说——我们处在全新的软件构建时代。

今年一月 Andrej Karpathy 和 Boris Cherny 等人说不再手写代码，我开始用 Claude Code，彻底着迷。Posterous 我两个月重建完，当初 **两年、1000 万美元、10 人团队**。开箱即用的模型会漫无目的，不了解你的数据就猜；这种规模下，猜出来的代码 plausible 但 **silent fail**。**瓶颈不是模型智力**——你配置对了，它们够聪明，能在你的代码库上完成非凡工作。反常识的是：**脚手架应该极其轻薄**。GStack 就是我对这种薄方法的实现——开源仓库，把 Claude Code 变成 AI 工程团队，给你像专家团队一样的技能。

GStack **三周前**构建，GitHub 星标已超 **Ruby on Rails**。过去两个月写的代码，比我 **2013 年**——工程师生涯最后一次真拼命那年——还多。这就是代理时代：**模拟人类团队协作**，而不是堆更厚的框架。

> **金句 · Garry Tan**
> **中文：** 让代理完成实际工作的方式，跟人类一直以来的方式相同——作为一个团队，有角色、有流程、有审查。
> **原文：** The way to get agents to do real work is the same way humans have always done it — as a team, with roles, processes, and review.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理时代 | agent era | 开发范式从手写代码转向编排 AI 团队 |
| 轻薄脚手架 | thin scaffolding | 少而精的流程约束，不包一层厚框架 |
| 静默失败 | silent failure | 代码看起来合理但悄悄出错，大规模下最危险 |
| 角色化流程 | role-based workflow | CEO 审查、设计、QA 等分工 skills |

**本章小结**

- AI 编码瓶颈在**结构化流程**，不在模型 IQ
- GStack = 薄脚手架 + 角色/skills + 审查，把 Claude Code 变团队
- Garry 两个月重建 Posterous 量级项目，验证代理时代吞吐

---

## 02 Office Hours：写代码前先过 YC 六问

**Moderator：** 你 demo 了一个报税找 1099 的 app——「办公时间」技能具体怎么卡商业逻辑？

**Garry Tan：** Office Hours 完全模仿 YC 合伙人和初创公司对话。开始前强制 **六个问题**，让你重新审视产品——这是 YC **16 位合伙人**几千上万小时磨出来的精髓，我们每天工作的 **10% 浓缩版**。

最佳入口是 **Conductor** 快速启动，GStack 已内置。今天 demo：税务 app，从 Gmail 找所有 **1099** 表格——报税日刚需。有些银行邮件发税务文件，有些不发，所以要搜收件箱，也接受 URL 下载 PDF。

启动 Office Hours 后开 **Gary 模式**，你能看到模型完整推理轨迹——这是我爱用 GStack 的原因之一。模型先分析上下文：全新项目、初始提交、没有设计文档，创业模式。它会大量思考，有时搜网，核心问题：**你到底想做什么？有什么最强证据表明真有人需要？**

我前几天刚被会计师催 1099，痛苦真实——摩擦和烦恼，不是法律惩罚。账户 **超过五个**，追查文件很烦。它马上指出：TurboTax、H&R Block 有 1099 导入，Plaid 能连银行——为什么它们没帮你搞定？

我的回答引它往深里想：用户想得比文档聚合器远，这是**漏斗**。吸引点——帮你找齐所有 1099，解燃眉之急；扩展点——文件齐了，帮你**报税**；再扩展——给报税员做匹配和潜客开发。经典**楔子策略**：1099 聚合也许每年收 **2–5 美元**，报税员交易抽成可能 **10 倍**。

Office Hours 最好玩的是**对话**，不是死板 checklist。你要是直接扔「帮我找 1099」，它会照做，但不问用户是谁、商业模式、痛点、怎么运作——这些是我们每天在 YC 办公时间跟创始人做的。

讨论中它提出 **GStack 浏览器**方案：用户登录，AI 导航到税务文档、下载 PDF，**不用 Plaid、不存凭证**，全程在用户可见的浏览器里跑——可以在用户自己机器上，不是云端。云只是别人的电脑。有 bug 还能用编解码器技能在家修——今天不 demo，但你自己工作时很有用。

计划模式里它给出三种路径：**A** Gmail 授权搜税务通知，输出发 1099 的银行清单——无浏览器自动化，工作量小；**B** Gmail + AI 浏览器 + CPA 市场——我想要的；**C** 换 GTM，先从 CPA 切入。我选 B，又加一层：用浏览器交互**完全跳过 Google OAuth**——用户打开 Gmail，GStack 浏览器版直接搜 1099；同时问还有哪些银行门户要加。如果你已有 CPA，邮件里可能有一堆催促信。

办公时间尾声，从**半生不熟**的想法走到更成熟设计——不完美创业点子，但进展看得见。我们最初可能从 OAuth 起手，再处理 CPA 催促邮件，最后意识到：**我们有浏览器，浏览器能接自动化**——搜收件箱找要下载的 1099，用大模型问还要加哪些银行门户，登录账户下 PDF，发给 CPA。浏览器自动化是非常出人意料的解法——编码模型最疯狂的是，一年前、两年前、甚至三个月前，我不确定会不会有人试这条路。你现在能产想法并比以往任何时候推得更远；有时办公时间走完三分之一我会发现：这主意没意义，省下了白写代码。

Office Hours 含**可行性评估**——我在 YC 跟初创交流时最自豪的能力之一，对世界运作方式和什么方案可能奏效有强烈看法。看到 Opus 4.6 帮你打磨创业或产品想法时能反映这一点，非常有趣。

> **金句 · Garry Tan**
> **中文：** 办公时间不是一成不变的东西，更像你跟模型之间的对话——YC 合伙人每天跟创始人就是这么干的。
> **原文：** Office Hours isn't a static thing — it's a conversation between you and the model.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 办公时间 | Office Hours | GStack skill：编码前六问，YC 合伙人思维模型 |
| 楔子策略 | wedge strategy | 先解小痛点获客，再扩展到高价值业务 |
| Gary 模式 | Gary mode | Conductor 内展示模型推理链的透明模式 |
| GStack 浏览器 | GStack browser | 用户本地可见浏览器，AI 导航下载文档 |
| 计划模式 | plan mode | 编码前产出多方案设计文档供人类选择 |

**本章小结**

- Office Hours = YC 千小时产品对话浓缩；六问防 AI 盲目开写
- demo 从 1099 聚合 wedge 推到 CPA 匹配，商业模式比功能聚合大 10 倍
- 约 1/3 想法会在办公时间末尾被毙——可行性评估是 feature 不是 bug

---

## 03 对抗性审查与设计散弹枪：从 6 分到 8 分

**Moderator：** 设计文档锁死之后呢？你怎么让 AI 自己找茬、还帮你画 UI？

**Garry Tan：** 办公时间后会进**多步骤对抗性审查**——努力让你的想法经受考验。它会自动发现一堆问题并尝试修复，比如之前缺的**故障处理**和**隐私保护**；**2FA 交接**以前没方案，现在会试着填上。

我们文档经**两轮**对抗性审查，自动发现并修复 **16 个问题**，然后批准设计文档。分数从 **6 分提到 8 分**，剩三个遗留问题稍后再说。

这次我跳过「计划 CEO 审查」，直接上 **设计散弹枪**——我最喜欢的工具之一。它识别这里有很多不同视图，先问：你到底想设计什么？我们先做**主清单仪表板**。

设计散弹枪是我的**视觉头脑风暴**工具——并行生成多个 AI 版本，然后问你选哪个。三个方向，生成大约 **60 秒**。任务分给 **OpenAI Codex**，能调 **ImageGen**。五分钟后回来，三个选项：**指挥中心**、**友好进度**、**分屏视图**。

选项 A **指挥中心**——仪表板展示所有银行、所有 1099、来源和状态，Linux 黑客会爱死，我给 **4 星**；选项 B **友好进度**——卡片式进度条和进度环，普通人更看得懂，**五星**，可能就选它；选项 C **分屏视图**——比需要的复杂得多，不选。选 B 锁定变体——不喜欢可以输任何反馈点重新生成。本例我们选 B 继续：友好卡片方案，进度环直觉很好，**变体 B 已锁定**。

有人用 GStack 时 **80%–90% 时间**花在 Office Hours、计划、CEO 审查、自动计划上——这就是 Sprint 流程实际运作方式。我们已经讨论过办公空间；不想大量来回、不想深陷细节的话，我创建了**自动计划**——按我默认预设过 CEO 工程设计和开发者体验审查，都是我为你设的预设建议。代码完成后跑**审查** skill——员工级 bug 捕获，完整 code review，找计划模式可能漏的 bug。最酷的部分：我围绕 Playwright 和 Chromium 写了 CLI，里面内置完整**有头和无头浏览器**——令人置信的代码量，但这是 QA 自动化基础。

GStack 现在 **28 个命令**，星标 **7 万+**。看 Claude Code 默认用 Claude——**Opus 4.6** 像多动症，无数想法，想一起喝啤酒；事情变难时要请**自闭症 CTO** 出场，那就是 **Codex**。我们 demo 里 Opus 扛大部分，难活换 Codex。

> **金句 · Garry Tan**
> **中文：** 对抗性审查把分数从 6 提到 8——自动发现并修复 16 个问题，开发者从打字员变成评审员。
> **原文：** Adversarial review took the score from 6 to 8 — automatically found and fixed 16 issues.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 对抗性审查 | adversarial review | 多轮自动挑战设计文档，修隐私/安全/逻辑漏洞 |
| 设计散弹枪 | Design Shotgun | Codex+ImageGen 并行出多版 UI，人类选方向 |
| 计划 CEO 审查 | plan CEO review | 从 CEO/产品视角审查计划的 GStack skill |
| 自动计划 | Auto Plan | 跳过大量来回，按 Garry 预设跑完审查链 |
| 审查 skill | Review skill | 代码完成后员工级 bug 捕获与 code review |

**本章小结**

- 对抗性审查两轮 16  fix，设计文档 6→8 分才准开写
- 设计散弹枪 60 秒三版 UI——人类选 B 友好卡片式，角色从画稿变评审
- Opus 发散、Codex 攻坚；80–90% 时间在计划链而非敲代码

---

## 04 Playwright CLI：QA 不用再当打字员

**Moderator：** 代码写完最烦的是 QA——你怎么把浏览器自动化塞进 CLI？

**Garry Tan：** 代理干完规划、设计、编码，我就坐着做 **QA**——软件开发**最无趣**的部分。自动化这一步对我变得极其重要，否则吞吐卡在最后一公里。

我用 Claude in Chrome 时，**MCP 是我用过最糟的软件之一**。每次动作都思考、思考、再思考，**上下文膨胀**厉害；常常啥也不干，就算干活一个动作也要 **2–3 秒**。我很惊讶能用 GStack 其他技能做出 QA 和浏览工具——我 basically 在 **CLI 层面封装 Playwright**，绕开 MCP 那套慢桥。

现在 Claude Code 和任何代理都能**真用浏览器**：截屏、点击、填表、下载媒体、跑完整**回归测试**、改 CSS、评估真实浏览器 bug——JavaScript 还是 CSS 问题都能抓。用户能看到一切发生——比如 GStack 浏览器里登录后 AI 导航找 1099、下载 PDF，全程可见，不在云端存凭证。最后还有**发布工具**，确保 PR 准备好 merge 主分支，是落地前最后一步。

GStack 里围绕 Playwright 和 Chromium 写了 CLI——内置完整**有头和无头浏览器**。这是我真正的 magic moment：用 Claude Code 加速时，曾有个目标是 **8 级软件工厂**——GStack 到不了 8，但能到 **7 级**。我可以在不同项目开多个 **Conductor** 窗口，同一项目有时同时跑**三四个**并行分支和不同功能，它们或多或少**同时落地**——并行 PR，不是串行待办。

> **金句 · Garry Tan**
> **中文：** MCP 每次动作思考半天、上下文膨胀——我在 CLI 层封装 Playwright，代理两秒变两毫秒级交互。
> **原文：** MCP was the worst software I've ever used — I wrapped Playwright at the CLI level so agents can actually use the browser.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Playwright CLI | Playwright CLI wrapper | GStack 在 CLI 层封装，非 MCP 浏览器桥 |
| 回归测试 | regression testing | 代理自动点页面、截屏、验证 UI 行为 |
| 有头/无头浏览器 | headed/headless browser | Chromium 完整实例，可截图可交互 |
| 7 级软件工厂 | level-7 software factory | 多并行 Conductor 会话，近 8 级但未全自动 |
| 发布工具 | ship tool | PR merge 前最后一道检查 skill |

**本章小结**

- MCP 浏览器桥慢且胀上下文；Playwright CLI 封装是 GStack QA 核心
- 代理能点击、填表、回归测试、修 CSS——开发者从 QA 打字员解放
- 7 级软件工厂 = 多 Conductor 并行分支同时落地

---

## 05 7 级软件工厂：10–15 个并行会话，没有待办清单

**Moderator：** 你日常工作流到底长什么样——并行会话、PR 吞吐量怎么说？

**Garry Tan：** 这实际上就是我的工作方式。我同时跑 **10–15 个并行 Claude Code 会话**。一个会话可能全新想法走 Office Hours——我现在有多个开源项目，**数万星**，大概 **400 个 PR 待审**。我几乎总是为每个项目激活一两个会话，用来评估并引入从社区获得的开源修复，通常**分批评估**。

AI 编码里**供应链攻击**非常可怕，我对此高度警惕——有人恶意 PR、依赖投毒，开源维护者压力巨大。好消息是有 **GStack 作为后盾**：审查链、对抗性评审、发布工具，帮我在 merge 前多一道机器+流程防线。我**不再需要待办清单**了——以前是 backlog 驱动，现在是 PR 驱动。

每当有想法、收到用户 bug 报告、在 X 上看到有人对 GStack 或 GBRAIN 沮丧——点 Conductor **加号**，建新 **worktree**，新工作项。我所要做的就是跑 Office Hours、CEO 评审、对抗性评审、正常流程；准备好就落地。我每天能处理 **10、15、20**，有时 **50 个 PR**，看当天会议多少。这就是 **7 级软件工厂**的日常：开发者没有「待办清单」，只有不断落地的 PR，处理社区反馈和修 bug 的吞吐量极大提升。

GStack 现在就能用，**github.com/garytan/gstack**。跑 Office Hours 模式，你拿到 YC 与创始人**真实产品思考**的版本——类似的反对意见、类似的重构。见我们之前先试试，告诉我想法。**这是历史上构建软件最不可思议的时代**——构建障碍刚消失，剩下唯一问题是：**你要构建什么？** 放手一搏，去创造人们想要的东西。

> **金句 · Garry Tan（封底）**
> **中文：** 构建的障碍刚刚消失，剩下的唯一问题是，你要构建什么？
> **原文：** The barrier to building just disappeared — the only question left is, what are you going to build?

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 并行会话 | parallel sessions | 10–15 个 Claude Code 同时跑不同 worktree/功能 |
| 工作树 | worktree | Conductor 为每个任务隔离的 git 工作区 |
| 供应链攻击 | supply chain attack | 开源 PR 恶意代码风险；GStack 审查链作防线 |
| 8 级软件工厂 | level-8 software factory | Garry 愿景：全自动并行交付；GStack 目前约 7 级 |
| 待办清单消失 | no todo list | PR 持续落地取代 backlog 式任务管理 |

**本章小结**

- 10–15 并行会话 + 400 待审 PR：想法/bug/社区反馈 → 新 worktree → 标准 GStack 链
- 供应链攻击警惕 + GStack 审查；开发者角色是编排者与决策者
- github.com/garytan/gstack；Office Hours = YC 产品思维预演

---

## 总结：薄脚手架 + 角色流程 = AI 工程团队

| 维度 | 要点 |
|------|------|
| 范式 | 代理时代 = 模拟团队（角色/流程/审查），非更厚框架 |
| 规划 | Office Hours 六问 + 对抗性审查 + 可选 CEO/自动计划 |
| 设计 | 设计散弹枪并行 UI；人类评审选方向 |
| QA | Playwright CLI 封装，绕开 MCP 慢与上下文膨胀 |
| 吞吐 | 7 级软件工厂：10–15 并行会话，PR 替待办，日处理 10–50 PR |

### 对个人的启示

别跟对话框单打独斗——**编码前先 Office Hours**，让 AI 挑战商业模式再写一行代码。设计阶段用**对抗性审查**和**设计散弹枪**，你的角色是评审员不是画稿员。QA 瓶颈用 **Playwright CLI** 思路：浏览器能力下沉到 agent 工具层，别依赖慢 MCP 桥。

### 对团队/产品的启示

GStack 是 **Harness 顶层编排**实例（见 [[AI框架与 Harness 的关系 - 魔术师卡颂]]）：CEO 视角、设计、审查、QA 分 skill，可裁剪。与 OpenAI **Harness 工程**（[[OpenAI研究员-Harness工程软件开发新范式]]）同向——代码免费，注意力与流程稀缺。并行 Conductor + worktree 是 **Loop/Harness** 吞吐范式，可与 [[Geoff-Ralph Loops的基础设施]] 对照。

### 仍待验证

- 「8 级软件工厂」Garry 自述 GStack 目前约 **7 级**——全自动 8 级边界未 demo
- Opus/Codex 人格比喻为演示修辞，模型版本随 Anthropic/OpenAI 更新变
- 1099 demo 为现场创业推演，非已上线产品

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 00:45 | 代理时代与轻薄脚手架 |
| 03:12 | Office Hours 六问与楔子策略 |
| 11:45 | 对抗性审查与设计散弹枪 |
| 16:20 | Playwright CLI 浏览器 QA |
| 18:40 | 7 级软件工厂与并行 PR |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1tR9zB4Ezv/ingest`
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV1tR9zB4Ezv/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv48269287/
- **B 站**：https://www.bilibili.com/video/BV1tR9zB4Ezv/
- **时长**：~22:00（专栏时间戳推断）

### 相关阅读

- [[如何为项目定制 Harness 环境 - 魔术师卡颂]] — gstack 作工种最佳实践入口，可裁剪 CEO/设计层  
- [[AI框架与 Harness 的关系 - 魔术师卡颂]] — Harness 三层；gstack 属顶层流程编排  
- [[OpenAI研究员-Harness工程软件开发新范式]] — 代码免费、角色化审查、代币亿万富翁  
- [[OpenClaw创始人-我是如何使用OpenClaw的]] — 并行 CLI 会话与 IM 驱动 agent  
- [[MOC - Harness Engineering]] — Harness 主题横切索引  

### 收录说明

- **视频**：[BV1tR9zB4Ezv](https://www.bilibili.com/video/BV1tR9zB4Ezv/)（B 站 *Easonlee的AI笔记*）  
- **嘉宾**：Garry Tan（Y Combinator CEO · GStack 作者）  
- **版本**：canonical Host-Guest v3.2（S 级 · 专栏主源 `column_article.md`）
