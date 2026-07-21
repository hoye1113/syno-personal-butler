---
title: "AI编程工具：2026年如何Code"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "claude_code", "codex", "cursor", "harness_engineering", "context_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "claude_code", "codex", "cursor", "harness_engineering", "context_engineering"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1tF5m6UEGf/"
description: "Riley Brown 深度解析 AI 编程工具趋同趋势：模型优势与生态集成是核心筛选指标，文档化知识库 + 远程控制 + 定时任务让 Agent 始终在线。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/AI编程工具-2026年如何Code.md"
source_sha256: "dc087b2d829669d415594f2ba259f7e63722585a1cc4b358d9339d1efdd03d3a"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1tF5m6UEGf/"
column_url: "https://www.bilibili.com/read/cv48976124/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1tF5m6UEGf/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1tF5m6UEGf/ingest"
duration: "~30 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Moderator（AI编程工具讨论）"
guest_name: "Riley Brown"
guest_title: "AI 内容创作者 & 前沿观察者"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Riley Brown]]"
concepts:
  - id: super_app_convergence
    zh: 超级应用趋同
    en: super app convergence
    one_line: 所有 AI 编程工具都在往同一个界面形态收敛
  - id: model_advantage
    zh: 模型优势
    en: model advantage
    one_line: 自研模型厂商能补贴 Token，第三方集成商做不到
  - id: ecosystem_integration
    zh: 生态集成
    en: ecosystem integration
    one_line: 接入 Gmail/Slack/日历等高频工具，Agent 才能干活
  - id: risk_modes
    zh: 风险模式分级
    en: risk mode levels
    openai_code_mode: 低/中/高风险对应聊天/协作/代码三种权限
  - id: remote_control
    zh: 远程控制
    en: remote control / dispatch
    one_line: 手机发消息让家中电脑执行 Agent 任务
  - id: heartbeat
    zh: 心跳机制
    en: heartbeat / cron job
    one_line: Agent 定期自动醒来检查邮件、总结信息
  - id: single_source_of_truth
    zh: 单一事实来源
    en: single source of truth
    one_line: 结构化文档库让 Agent 模仿你的思考逻辑
  - id: dreaming
    zh: 梦想机制
    en: dreaming
    one_line: Agent 每天自动总结当日工作写入知识库，为长期记忆铺路
---

# AI编程工具：2026年如何Code

**Host：** Moderator（AI 编程工具讨论）  
**Guest：** Riley Brown（AI 内容创作者 & 前沿观察者）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `BV1tF5m6UEGf/ingest/column_article.md`  
**B 站：** [BV1tF5m6UEGf](https://www.bilibili.com/video/BV1tF5m6UEGf/)

---

## 开场

Riley Brown 花了三个半小时深度测试 Anthropic 刚发布的桌面应用更新，得出一个结论：所有主要 AI 公司都在造同一个东西。从 OpenAI 的 Codex 到 Claude Desktop，从 Manus 到 Genspark，界面越来越像——左侧项目、下方聊天、右侧预览。这种趋同不是巧合，而是一种功能需求的必然：开发者需要在等待 Agent 干活时无缝切换任务，多任务处理才是关键。那么面对这场趋同竞争，个人和团队该怎么选工具、怎么用、怎么准备？

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 超级应用 | super app | 把聊天、代理、浏览器、代码执行全塞进一个界面 |
| 模型优势 | model advantage | 自研大模型的公司能补贴 Token，用起来更便宜 |
| 生态集成 | ecosystem integration | 能连 Gmail、Slack、日历、手机等高频工具 |
| 氛围感编程 | vibe coding | 不懂代码也能靠聊搭出能跑的原型 |
| 远程控制 | remote control / dispatch | 手机发消息让电脑里的 Agent 帮你干活 |
| 心跳机制 | heartbeat / cron job | Agent 每隔一段时间自动醒来执行检查 |
| 单一事实来源 | single source of truth | 一份结构化文档，Agent 所有决策都从这里取信息 |
| 梦想机制 | dreaming | Agent 夜间自动总结当日工作，为长期记忆铺路 |

---

## 01 所有AI公司都在造同一个产品

**Moderator：** 你花了三个半小时测试 Claude Desktop 的新更新，然后说了一句话——所有主要 AI 公司都在构建完全相同的东西。这话听着夸张，能展开说说吗？

**Riley：** 一点都不夸张。你打开 Claude Desktop，左边是项目列表，下面是聊天线程，右边是预览窗口。你再打开 OpenAI 刚泄露的新 Codex 应用——他们叫它「超级应用」——左边还是项目，下面是聊天，右边还是预览。甚至 Perplexity Computer、Manus、Genspark 这些通用智能体构建器，界面也开始趋同。

为什么会这样？因为这种设计解决了一个核心痛点：当你的智能体在执行一个长任务——可能要跑十分钟、二十分钟——你在等的时候干什么？答案是切换到另一个聊天，同时处理别的事。我在旧金山跟很多顶级开发者聊过，他们通常同时推进五到十个任务，跟不同的智能体对话，并行处理代码库的不同部分。多任务处理变得比以前重要得多。

这些公司都想明白了同一件事：左侧项目面板是切换聊天最快的方式，右侧预览让你能实时看到智能体在做什么。这就是为什么所有产品都在往同一个方向走。谁先把这个体验做到位，谁就能留住用户。所以我的判断是，这种范式下，**多任务处理能力决定了你的产出上限**。

**Moderator：** 所以与其说是在比谁的界面更好看，不如说是在比谁能让用户同时干更多事？

**Riley：** 完全正确。界面本身只是载体，真正比的是底层能力。但这个载体必须支持并行工作流，否则你会浪费大量时间在等待上。你想想，一个优秀的开发者如果能同时跑五个智能体任务，一天的产出可能相当于以前一周。这就是为什么「超级应用」这个方向是对的——它不是一个功能，而是一种工作方式的基础设施。

> **金句 · Riley Brown**
> **中文：** 你把大量工作委托给智能体之后，你需要给自己找点事情做——同时处理五到十件事，才是真正的高产出。
> **原文：** If you are very good at agentic coding, you can do more work in less time by having five to ten things going in parallel.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 超级应用 | super app | 把所有 AI 能力塞进一个统一界面 |
| 多任务处理 | multitasking | 同时推进多个 Agent 任务，不让时间浪费在等待上 |
| 趋同 | convergence | 不同公司产品越来越像，因为解决的是同一个问题 |

**本章小结**

- 所有主要 AI 编程工具都在往「左侧项目+下方聊天+右侧预览」的超级应用形态收敛
- 趋同的本质是功能需求：开发者需要在等待长任务时无缝切换并行工作
- 多任务处理能力决定产出上限，同时推进五到十个 Agent 任务是顶级开发者常态

---

## 02 模型优势与生态集成是筛选工具的核心指标

**Moderator：** 市面上工具这么多，Claude、Codex、Cursor、Manus、Replit、Lovable……你建议怎么选？有什么判断框架？

**Riley：** 我觉得主要有两种优势：一种是模型，另一种是集成。思考一下谁拥有这两样东西，答案就很清楚了。

Claude 有自己的模型，所以它显然拥有模型优势。OpenAI 的 Codex 也拥有模型优势。Cursor 训练了一个叫 Composer 2 的模型，但目前还不确定他们能不能持续训练出顶级编码模型。Conductor 获得了很多关注，但没有自研模型，所以模型这块是负分。Google 的 Anti Gravity 肯定有模型优势，毕竟 Google 有最强的基础研究团队。

关键在于：模型优势意味着补贴。如果你在 Claude 桌面应用上买 200 美元的积分，能拿到最高 4000 美元的 Token 使用量。他们在补贴平台使用，就是要把你锁在生态里。在 Cursor 上用 Claude 3.5 Sonnet，200 美元很快烧完——这就是为什么 Cursor 拼命推自己的便宜模型。但问题是，他们的模型目前还跟 OpenAI 或 Claude 差一截。

再看集成。Manus 刚被 Meta 收购，Meta 拥有 Facebook、Instagram、WhatsApp，现在正在把广告管理器开放给 Manus。你想用 AI 代理投放 Facebook 广告？Manus 是目前最好的选择。你还能通过 Manus 自动联系 Instagram 上的影响者，这在其他平台上做不到。Meta 以前是个非常封闭的公司，但他们允许 Manus 接入，这就是生态集成的力量。

Google 拥有一整套工具——Gmail、Docs、Sheets、日历、Drive，用户数据积累了几十年。如果 Google 把这些都开放给 Anti Gravity，那集成优势就太大了。所以我说最大的两个赢家可能是 Manus 和 Anti Gravity。

> **金句 · Riley Brown**
> **中文：** 原生模型厂商能在自己的平台上用比任何人都便宜的价格提供模型——这就是平台补贴的逻辑。
> **原文：** They can offer these models on their own platform cheaper than anyone else because they are subsidizing the usage.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 模型优势 | model advantage | 自研大模型的公司能补贴 Token，用起来更便宜 |
| 生态集成 | ecosystem integration | 能连 Gmail、Slack、日历等高频工具的深度绑定 |
| Token 补贴 | token subsidy | 模型厂商在自家平台打折甚至亏本让你用自家模型 |
| Vibe 编码平台 | vibe coding platform | Replit、Lovable 这类靠聊天生成应用的工具 |

**本章小结**

- 筛选 AI 编程工具的核心指标是模型优势和生态集成两个维度
- 有自研模型的厂商能补贴 Token，用起来比第三方便宜得多
- Meta 的 Manus 接入广告管理器、Google 的全套工具开放给 Anti Gravity，集成优势正在重新定义竞争格局

---

## 03 高风险模式换高回报：给Agent完全控制权

**Moderator：** Claude Desktop 有聊天、协作、代码三种模式，你特别推崇代码模式，甚至建议开启「绕过权限」。这听起来有点激进，不担心安全问题吗？

**Riley：** 担心，但我更担心效率。你看这三种模式：聊天是低风险，协作是中风险，代码是高风险。Claude Code 属于高风险但高回报的模式——通过开启「绕过权限」设置，智能体可以完全控制你的电脑文件系统。

我确实开了这个选项。我宁愿追求速度，接受风险，而不是花时间去琐碎地设置每个权限。如果它做错了，我直接告诉它「别再那样做了」，下次它就知道了。这就是我喜欢的工作方式——无限制，完全访问计算机和集成功能，让它帮我自主完成工作。

当然，这不是所有人都适合的。如果你处理敏感数据、金融信息，或者你是企业用户，可能需要更谨慎。但如果你像我一样是个人创作者和创业者，你需要的是速度。我宁愿让智能体全速跑，出了问题再纠正，也不愿让它每一步都停下来等我批准。

Claude Desktop 的协作模式现在像个沙盒，用起来有点麻烦。我个人只用聊天和代码两种模式。但有些人喜欢协作模式——比如做法律工作的人，或者需要反复创建文档的岗位。未来的方向是：代码模式会成为默认，因为每个人都会使用像 Claude Code 或 Codex 这样的产品。

**Moderator：** 那 Codex 呢？它跟 Claude Code 的区别在哪里？

**Riley：** Codex 和 Claude Code 看起来非常相似，但有一个关键区别：如果你让 Codex 制作演示文稿、电子表格或文档，它会直接完成——它能识别出这是通用智能体任务，而不是纯编码任务。它会打开正确的窗口去操作，然后可能把结果标记在协作标签下。这种智能识别任务类型的能力，让它在通用场景下更方便。

> **金句 · Riley Brown**
> **中文：** 我宁愿追求速度，接受风险，也不愿花时间去琐碎地设置每个权限——做错了就告诉它别再那样做。
> **原文：** I would rather go after speed and accept a range of requests and give it special permissions than spend my time being meticulous about setting it up.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 风险模式分级 | risk mode levels | 低/中/高对应聊天/协作/代码三种权限 |
| 绕过权限 | bypass permissions | 允许智能体完全访问电脑文件系统，不需逐个批准 |
| 沙盒 | sandbox | 协作模式下的隔离环境，只允许访问特定文件夹 |

**本章小结**

- 聊天/协作/代码三种模式对应低/中/高风险，高风险换高回报
- 开启「绕过权限」后智能体能完全控制电脑，适合追求极致效率的个人用户
- Codex 能自动识别任务类型——编码任务用代码模式，文档任务自动切换到正确窗口

---

## 04 利用远程控制与定时任务让Agent始终在线

**Moderator：** 你说过通过远程控制功能，可以从手机端指挥家中的电脑执行任务。这听起来像是科幻片，能具体说说怎么操作吗？

**Riley：** 打开终端，输入 Claude，然后输入 /remote-control，远程控制就激活了。当远程控制开启时，你可以从手机发指令——比如 Telegram 或 iMessage——让你的电脑上的智能体干活。

举个例子：我让它查看下载文件夹里的 PDF 并总结一下。它说下载文件夹里有很多 PDF，正在搜索关于 AI 代理的那一个。找到了，正在阅读——这是一个我从 Canva 下载的 PDF，为上周的播客准备的。只要我的电脑开着，我就可以去任何地方，它有权访问电脑上的所有文件。

更进一步是心跳机制。OpenClaw 有一个功能叫 Heartbeat——智能体每三十分钟自动醒来一次，查看心跳文件，根据文件内容执行检查。你可以设置让它每三十分钟检查一次邮件，有需要回复的就自动处理。为了模仿这个功能，你可以在 Claude 中设置一个集成，告诉它每三十分钟检查邮件，发现重要事项就回复。

关键是要给它充足的上下文——你的目标、你的背景、你的工作方式。我每天收到五十到一百封关于内容赞助的邮件，需要一个过滤器，只想和符合特定类别、有特定预算的公司合作。你需要提供详细的文档，说明智能体应该如何思考。**如果我花两三个小时做好这些指示，就能创建一个完全自主的 AI 代理来帮我协商品牌交易。**

还有一种方式是定时任务。在 Claude Code 中输入 /plan，要求它每天中午执行某个操作——比如每次寻找关于 AI 代理的新公司。这会创建一个计划任务，每天自动执行。这是提升智能体自主性的重要手段。

> **金句 · Riley Brown**
> **中文：** 花两三个小时写好指示文档，就能拥有一个完全自主的 AI 代理帮你协商品牌交易。
> **原文：** If I spend two to three hours putting together these instructions, I can create a fully autonomous AI agent to help me negotiate brand deals.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 远程控制 | remote control / dispatch | 手机发消息让家中电脑里的 Agent 干活 |
| 心跳机制 | heartbeat | Agent 每隔一段时间自动醒来执行检查 |
| 定时任务 | cron / scheduled task | 到点自己跑，不用你手点 |
| 通道 | channel | Telegram、iMessage、Claude iOS 应用等连接方式 |

**本章小结**

- 远程控制让手机可以指挥家中电脑上的 Agent，只要电脑开着就能随时执行任务
- 心跳机制让 Agent 每隔一段时间自动检查邮件、执行任务，从被动响应变为主动工作
- 定时任务让 Agent 定期自动执行特定操作，提升自主性

---

## 05 建立单一事实来源的知识库是Agent进化的关键

**Moderator：** 你提到 Agent 的表现上限取决于你提供的文档质量。这个「单一事实来源」具体怎么做？听起来很花时间。

**Riley：** 确实花时间，但回报巨大。在深入使用任何工具之前，你应该先花三个小时审视自己的工作。哪些事情最占用时间？对于每一项任务，你都应该创建一个一页纸的标准操作程序。

拿我举例。作为内容创作者和首席营销官，我有大约三百五十项不同的工作要做。对于每一项，我都写了文档。我有一个团队空间，里面有一个「主数据库」，定义了 Riley 作为不同角色的信息——公司背景、受众、信息传递。这些都是文档。

更重要的是「典范模板」库。我用 API 获取我喜欢的创作者的视频字幕，创建了一个技能，精确说明如何像我的好朋友 Callaway 那样制作精彩的开场白。这些典范模板就是高质量工作的实例。当智能体被指示查看这个知识库时，它会阅读相关文件，理解任务要求。

我把它组织在 Notion 上，包含了关于 Riley 是谁、他的两个角色等所有信息。每当我需要智能体获取上下文时，只需说「检查 Notion」。它首先查看的就是知识库页面。**创建文档最重要的部分是提供非常优质的例子——这些典范模板决定了智能体的输出质量上限。**

你创建的文档越多，智能体就越能像你一样思考。然后专注于插件和技能——比如你可以创建一个「脚本编写器」技能，让它总是在特定文档中编写。作为技能的一部分，它应该参考你的知识文档，这样你就拥有了单一的事实来源。

**Moderator：** 如果我从一个平台换到另一个平台，这些文档还能用吗？

**Riley：** 这就是为什么我会把它们保存在 Notion 之类的地方——不与特定平台绑定。假设 Claude Code 现在是最好的，但两个月后 Codex 显然更胜一筹，你肯定希望能够将技能转移到新平台。把文档存在 Notion，所有代理工具都集成了 Notion，迁移成本几乎为零。

> **金句 · Riley Brown**
> **中文：** 你创建的文档越多，智能体就越能像你一样思考——典范模板决定了输出质量的上限。
> **原文：** The more documentation you create, the more the agent can think like you. The exemplar templates set the ceiling for output quality.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 单一事实来源 | single source of truth | 一份结构化文档，所有决策都从这里取信息 |
| 典范模板 | exemplar templates | 高质量工作实例，让 Agent 学你的标准 |
| 标准操作程序 | SOP / standard operating procedure | 每项任务的一页纸操作指南 |
| 知识库 | knowledge base | Agent 随时访问的维基百科式文档库 |

**本章小结**

- Agent 的表现上限取决于你提供的文档质量——花三小时写好文档，胜过花三小时调试
- 典范模板（高质量工作实例）比 SOP 更重要，它决定 Agent 输出的天花板
- 文档存在 Notion 等不绑定平台的地方，迁移到新工具时零成本

---

## 06 应对未来记忆瓶颈：建立自动化的数字日记

**Moderator：** 你提到 AI 最大的瓶颈在于长期记忆，这个问题现在有解吗？

**Riley：** 还没有完美方案，但我们现在能做的是为未来铺路。记忆问题之所以重要，是因为如果你的智能体记不住你是谁、你的目标是什么，它每次都要从头了解你，效率极低。

我现在做的是设置一个定时任务——每天晚上九点，让 OpenClaw 在 Notion 文档中写日记，记录当天的内容。这不是什么高深技术，就是一个自动化脚本。但它的价值在于：当 Anthropic 或 OpenAI 最终把记忆功能直接融入模型时，这些结构化的日记就是最好的索引数据。

Anthropic 最近泄露了一个信息——他们正在开发一个叫「梦想」的功能。原理类似：每天在你不使用智能体的时候，它会自动整理你当天做的事情，写成小笔记。这样当你将来向智能体提问时，如果它需要更好地理解你的意图，就可以参考这些笔记。

我认为记忆是未来一年最大的改进方向。模型在纯编码能力上的提升已经进入平台期，但在记忆方面会有质的飞跃。你现在能做的最好的事情，就是整理好所有的笔记和文档。**在记忆技术取得重大突破之前，这是你目前的最优解。**

你想想，这本身就是一个价值数十亿甚至数万亿美元的产业——仅仅是为了弄清楚如何让智能体拥有更好的记忆力。我们现在做的日记、文档、典范模板，都是在为那个未来准备基础设施。

> **金句 · Riley Brown**
> **中文：** 在记忆技术取得重大突破之前，整理好所有笔记和文档就是你目前的最优解。
> **原文：** Until there is a major breakthrough in memory technology, organizing all your notes and documents is your best bet right now.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 长期记忆 | long-term memory | 智能体跨会话记住你是谁、你的目标 |
| 梦想机制 | dreaming | Agent 夜间自动总结当日工作，为长期记忆铺路 |
| 数字日记 | digital journal | Agent 每天自动记录当天工作内容 |

**本章小结**

- 长期记忆是当前 AI 最大瓶颈——智能体记不住你是谁，每次都要从头了解
- 设置定时任务让 Agent 每天写数字日记，为未来模型记忆升级准备高质量索引
- 记忆功能是未来一年最大的改进方向，现在整理文档就是为那个未来铺路

---

## 总结：文档先行，工具其次

| 维度 | 要点 |
|------|------|
| 工具选择 | 优先选有自研模型或深度生态集成的平台（Claude、Codex、Manus） |
| 权限策略 | 高风险换高回报——个人用户开「绕过权限」，企业用户分级控制 |
| 自主化 | 远程控制 + 心跳机制 + 定时任务 = 始终在线的 Agent |
| 知识库 | 花三小时写文档 > 花三小时调参数；典范模板决定输出上限 |
| 记忆 | 现在就开始写数字日记，为未来模型记忆升级准备基础设施 |
| 迁移 | 文档不绑定平台，Notion 是最安全的选择 |

> **金句 · Riley Brown（封底）**
> **中文：** 如果你生活中遇到任何问题，为什么不用 AI 来解决？从这里开始。
> **原文：** Any problem you encounter in life, why can't you use AI to solve it? Start there.

---

## 相关阅读

- [[Karpathy-从Vibe Code到Agentic Code]]
- [[Claude Code负责人-AI原生团队如何使用AI]]
- [[OpenAI员工-上下文工程和Agent记忆]]
