---
title: "OpenClaw教程：终极新手指南"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "harness_engineering", "memory"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "harness_engineering", "openclaw", "memory"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1rdAVzAEdS/"
description: "从零部署OpenClaw的完整教程：VPS选择、安全防护、Telegram连接、Google Workspace集成、模型路由成本优化、心跳自动化与子代理。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenClaw教程-终极新手指南.md"
source_sha256: "2218004c4fe90a2439f9b02d42a3c389978577a7d46801b764cff8691f77e4e7"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1rdAVzAEdS/"
column_url: "https://www.bilibili.com/read/cv42698811/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1rdAVzAEdS/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1rdAVzAEdS/ingest"
duration: "~45 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Matt（教程主讲）"
guest_name: "OpenClaw AI"
guest_title: "AI助手"
speaker_inference: "column_article S-tier"
speaker_confidence: high
concepts:
  - id: vps_deployment
    zh: VPS部署
    en: VPS deployment
    one_line: 在云端服务器24/7运行AI助手，比本地电脑更安全可靠
  - id: workspace_files
    zh: 工作区三文件
    en: workspace files (Agents.md / Soul.md / User.md)
    one_line: AI的行为规则、人格特质、你的个人信息，全用Markdown存储
  - id: model_routing
    zh: 模型路由
    en: model routing
    one_line: 根据任务复杂度分配不同模型，复杂推理用贵模型，日常任务用便宜模型
  - id: heartbeat_vs_cron
    zh: 心跳 vs 定时任务
    en: heartbeat vs cron jobs
    one_line: 定时任务在特定时间执行，心跳持续监控——用错会烧钱
  - id: minimum_permission
    zh: 最小权限原则
    en: minimum permission principle
    one_line: 只给AI它实际需要的权限，删除文件前先问，发邮件前先确认
author:
  - "[[Matt]]"
---

# OpenClaw教程：终极新手指南

**Host：** Matt（教程主讲）  
**Guest：** OpenClaw AI（AI助手演示）  
**形态：** Host-Guest v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV1rdAVzAEdS](https://www.bilibili.com/video/BV1rdAVzAEdS/) · **时长** ~45 min · **专栏** [cv42698811](https://www.bilibili.com/read/cv42698811/)

---

## 开场

大多数AI工具是你需要时才打开的。OpenClaw不同——它全天候运行在服务器上，连接你的应用程序，甚至无需你指示就能采取行动。这期从零开始搭建完整工作环境：部署、安全、消息技能、记忆自动化、模型路由。学完后你将拥有自己的AI助手，全天候运行，在Telegram上给你发消息并实际完成任务。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| VPS | virtual private server | 云端虚拟服务器，每月几美元，24/7在线 |
| 工作区三文件 | workspace files | Agents.md（规则）、Soul.md（人格）、User.md（你是谁） |
| 模型路由 | model routing | 不同任务用不同模型，省钱 |
| 心跳 | heartbeat | 定时唤醒AI检查任务 |
| 定时任务 | cron jobs | 在指定时间自动执行的任务 |
| 最小权限 | minimum permission | 只给AI它需要的权限 |
| 子代理 | sub-agents | 主代理派出多个小代理并行完成任务 |

---

## 01 为什么选VPS而不是你的电脑

**Matt：** 运行OpenClaw有三种方式。第一种是你的个人电脑——免费且易于上手，但笔记本一关机它就停止运行。你的个人文件、密码、浏览器历史记录，代理都可以访问。出了问题那是在你的个人电脑上发生的。

第二种是Mac Mini或专用备用硬件——良好的隔离，只要插电就能一直运行，但前期可能需要500美元，还有端口转发、停电、互联网可靠性问题。

第三种是VPS——云端的独立计算机，每月只需几美元，全天候在线。如果OpenClaw出现故障或情况真的很糟，你可以销毁服务器重新开始。对大多数人来说，VPS是正确的选择。

Hostinger提供一键式OpenClaw模板——你不需要终端，不需要了解Docker，点击部署就能工作。网关会获得随机端口和预配置的身份验证，已经比市面上大多数设置先进了。选KVM 1计划就够基本设置，但开始添加大量技能或同时运行多个代理就需要升级。想运行本地模型则需要KVM 4。

每日自动备份每月3美元——OpenClaw可以重新配置自己的环境，如果出现问题，每日自动备份就像非常强大的撤销按钮。服务器位置选延迟最低的就行。

> **金句 · Matt**
> **中文：** 对大多数人来说，VPS是正确的选择——每月几美元，全天候在线，出了问题销毁重来。
> **原文：** For most people, VPS is the right choice — a few dollars a month, online 24/7, and you can destroy and restart if things go wrong.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| VPS部署 | VPS deployment | 在云端服务器运行AI，不依赖本地电脑 |
| 一键部署 | one-click deploy | 服务商预配置好，点击就能用 |
| 环境隔离 | environment isolation | AI运行在独立服务器上，不影响你的电脑 |

**本章小结**
- 个人电脑最大的问题是关机就停、安全隔离差
- VPS的优势是24/7在线、独立环境、崩溃可销毁重来
- 每日自动备份是物超所值的保险

---

## 02 安全防护：先锁再用

**Matt：** 在连接Telegram、安装技能、做任何其他事情之前，我们需要将其锁定。OpenClaw功能强大——它可以运行终端命令、访问文件、发送消息、浏览网页。这种强大正是其核心，但安全并非可选项。

最近有人发帖说他们的OpenClaw机器人在网上进行研究时，获取了一个嵌入隐藏文本的页面。这些隐藏文本对人类不可见，但AI可读，试图欺骗机器人读取虚假文件系统并执行指令。机器人发现了它——知道该文件不存在于其工作区中并将其标记为可疑。但这向你展示了为什么防护措施很重要。

好消息是设置它们只需大约两分钟。OpenClaw在文档中有专门的安全页面。你可以复制URL粘贴到聊天中，要求机器人"实施并验证此页面上的所有内容"。机器人会查看安全文档并强化自己的设置。

接下来设定行为基本规则：代表我发送消息时，总是先起草并获得批准；删除文件前总是先询问；发出网络请求前总是先询问。这就是最小权限原则——只赋予代理实际需要的权限。再设置防护措施：如果一个任务失败三次就停止，不要让任何任务无限期运行，运行时间限制在10分钟。这防止一夜之间花几百美元的灾难。

最重要的是从小处着手。先从Telegram开始，也许加一两个技能，但不要立即连接主邮箱、银行或密码管理器。通过实验了解其工作原理，信任后再逐步扩展。

> **金句 · Matt**
> **中文：** 小处着手——先连Telegram，加一两个技能，信任后再扩展到邮箱和银行。
> **原文：** Start small — connect Telegram first, add one or two skills, and expand to email and banking only after you've built trust.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 最小权限 | minimum permission | 只给AI它需要的权限 |
| 提示词注入 | prompt injection | 恶意网页通过隐藏文本欺骗AI执行指令 |
| 安全审计 | security audit | 让AI自己检查并修复安全配置 |

**本章小结**
- OpenClaw能做的事太多，安全不是可选项
- 提示词注入是真实威胁——恶意网页可以隐藏AI能读但人看不到的指令
- 从小处着手，逐步建立信任后再扩展权限

---

## 03 工作区三文件：让AI成为你

**Matt：** OpenClaw的真正力量来自它的工作区。这些文件让你的机器人成为你。与大多数AI工具不同，你可以实际阅读和编辑你的机器人了解你的所有信息。它们都只是文件夹中的Markdown文件。

三个文件最重要——每个会话中都会加载，塑造机器人所做的一切。Agents.md是规则：发送邮件前总是确认，偏好简短回答。Soul.md是机器人的个性——很多人只使用基本设置，错过了OpenClaw 80%的价值。默认是"乐于助人"，但这没告诉机器人任何有用信息。弱的提示是"乐于助人且友好"；强的提示是"直接，跳过填充词，有自己的观点，如果有什么不对劲就说出来"。你越具体，它就越像私人助理。由于这个文件每次响应前都会被读取，也是设置安全规则的好地方。User.md是关于你的文件——姓名、时区、工作偏好。

机器人行为由Agents决定，身份由Soul决定，你的身份由User决定。长期重要事实存储在Memory中——每日更新的交互日志。

阅读或编辑这些文件最简单的方法是直接询问机器人。你可以说"显示Soul.md的内容"，它就会返回。你可以说"在Agents.md中添加一条规则"，它会读取、编辑并保存。这不需要任何终端知识。

还有两个快速更新的设置：启用压缩、内存刷新和会话记忆。内存刷新是安全网——当长对话达到上下文限制时，机器人会在压缩之前将重要细节保存到磁盘。会话记忆允许上下文在对话之间传递，机器人能随着时间真正学习。

> **金句 · Matt**
> **中文：** 很多人只使用基本的"灵魂"设置，错过了OpenClaw 80%的价值——越具体，它就越像你的私人助理。
> **原文：** Most people only use the basic "soul" setup and miss 80% of OpenClaw's value — the more specific you are, the more it becomes your personal assistant.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 工作区三文件 | workspace files | Agents.md（规则）、Soul.md（人格）、User.md（你是谁） |
| 内存刷新 | memory flush | 上下文满了先保存重要细节到磁盘再压缩 |
| 会话记忆 | session memory | 上下文在对话之间传递，AI能真正学习 |

**本章小结**
- 三个Markdown文件构成AI的全部大脑，没有数据库也没有黑盒
- Soul.md是最被低估的——写得越具体，AI越像你的私人助理
- 内存刷新是安全网，防止长对话丢失重要信息

---

## 04 模型路由：用贵模型思考，用便宜模型干活

**Matt：** 这既是成本决策也是安全决策。简单来说：用强大的模型进行思考，用便宜的模型执行任务。

第一层是最贵但最强大的——Claude Opus或GPT 5.2 Pro。第二层是日常任务——Claude Sonnet或GPT 5.2普通版。第三层是最便宜的——Claude Haiku或GPT 5.2 mini，速度快且便宜，Haiku比Opus便宜25倍。还有免费选项：通过Nvidia提供的Kimi 2.5，通过Ollama的本地模型。

实际数字：经济型LLM每月大约5到20美元，标准LLM每月30到80美元，顶级旗舰每月100到300美元甚至更多。如果让Claude Opus执行大量操作，单个提示可能花费2到6美元——因为OpenClaw在每条消息中都会加载整个工作区身份文件、内存工具和对话历史。一个简单问题在模型开始思考之前就可能使用5万到10万个token。

三个成本陷阱：不要对所有任务都用第一层LLM；避免重试循环——任务卡住没有上限一夜能烧光额度；避免昂贵的心跳——不要在Opus上每30分钟跑一次心跳，那每天约50次API调用。

智能路由能节省40%到60%的费用。设置方法是：在Docker管理器的环境变量中添加新API密钥，保存并部署。然后告诉机器人路由规则：默认用Sonnet，编码任务用Opus，日常任务用Haiku。机器人会更新配置并保存规则。

至少设置一个免费模型作为最终备用——如果付费LLM额度用完或出现故障，没有备用模型机器人会默默失败，不给任何错误消息。有免费备用至少能告诉你出了问题。

> **金句 · Matt**
> **中文：** 一个简单问题在模型开始思考之前就可能使用5万到10万个token——你不是在为答案付费，你是在为上下文付费。
> **原文：** A simple question can use 50,000 to 100,000 tokens before the model even starts thinking — you're paying for context, not answers.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 模型路由 | model routing | 不同任务分配不同模型 |
| 上下文成本 | context cost | 每条消息都要加载工作区文件，上下文越长越贵 |
| 备用模型 | fallback model | 主模型挂了自动切换到备用 |

**本章小结**
- 模型路由能省40-60%费用——复杂推理用贵模型，日常任务用便宜模型
- 上下文是隐形成本——工作区文件+对话历史让简单问题也烧token
- 免费备用模型是保险——没有它，主模型出问题你都不知道

---

## 05 心跳与定时任务：别把所有东西都塞进心跳

**Matt：** 心跳和定时任务让OpenClaw不再像聊天机器人，而更像真正助理。

定时任务是计划好的任务——在设定的时间自动执行。比如每天早上7点检查天气、查看日历、扫描邮件、发送当日重点摘要。它会确认任务然后问你是否想立即运行测试。明天早上7点它会自动显示在手机上——你没有要求，它只是自动执行。这就是你访问的AI和为你24小时工作的AI之间的区别。

心跳机制类似但不同——不是在特定时间运行，而是在更短的固定间隔内唤醒并检查。这里几乎所有人都会犯一个错误：把所有东西都放在Heartbeat文件里。检查邮件、查看日历、更新记忆、研究昨天提到的事——这会疯狂消耗token，因为心跳每30分钟运行一次，每次都会加载完整上下文窗口。

指南是：如果在特定时间运行，就设为定时任务；如果需要持续监控某事，就用心跳。每日简报、每周回顾、提醒都应该是定时任务。如果有紧急事项提醒我，那是心跳。

> **金句 · Matt**
> **中文：** 把所有东西塞进心跳是几乎所有人都会犯的错——每30分钟加载一次完整上下文，token烧得飞快。
> **原文：** Putting everything in the heartbeat is a mistake almost everyone makes — loading the full context every 30 minutes burns tokens fast.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 心跳 | heartbeat | 定时唤醒AI但不执行特定任务 |
| 定时任务 | cron jobs | 在指定时间执行特定任务 |
| 上下文窗口 | context window | 每次对话AI能"看到"的信息量 |

**本章小结**
- 定时任务用在特定时间运行的事，心跳用在持续监控的事
- 心跳每30分钟加载完整上下文，用贵模型跑会烧钱
- 分清这两种机制是省钱的关键

---

## 06 子代理：同时完成大量工作

**Matt：** 当你需要同时完成大量工作，或者需要按特定顺序完成一系列任务并获得精确结果时，可以启动多个子代理。

比如同时研究三个AI助手平台并整理比较报告。告诉主代理用子代理同时研究这三个平台。它回复说现在无法启动子代理，因为还没有访问网络的权限——需要启用Brave Search API。

设置好后，主代理启动三个子代理同时研究。你可以去网关看实际发生了什么——几个子代理正在运行：N8N研究、Zapier研究、Make研究。每个子代理独立完成研究并将结果传回给主代理。主代理最后整理一份报告。

子代理实际上可以变得更加复杂——一个子代理做市场研究，把信息传递给另一个做财务分析，最后第三个整理报告交给投资者。可能性是无限的。这就是并行工作的魔力——你不用等一个完成再做下一个。

> **金句 · Matt**
> **中文：** 子代理的真正价值不是省时间，是并行——你不用等一个完成再做下一个。
> **原文：** The real value of sub-agents isn't saving time — it's parallelism. You don't wait for one to finish before starting the next.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 子代理 | sub-agents | 主代理派出的专门任务小代理 |
| 并行执行 | parallel execution | 多个任务同时跑，不用排队 |
| 结果聚合 | result aggregation | 子代理完成后主代理整合报告 |

**本章小结**
- 子代理让一个代理变成多个，同时处理不同任务
- 并行是核心价值——不是更快，是同时做更多
- 复杂的多步骤流程可以串起来：市场研究→财务分析→报告

---

## 总结：OpenClaw的核心哲学

| 维度 | 要点 |
|------|------|
| 部署 | VPS比个人电脑更安全可靠，24/7在线 |
| 安全 | 最小权限+从小处着手，信任后再扩展 |
| 记忆 | 三文件Markdown结构，透明可编辑 |
| 成本 | 模型路由省40-60%，心跳别用贵模型 |
| 自动化 | 定时任务管时间，心跳管监控 |
| 扩展 | 子代理实现并行，技能实现功能 |

### 对个人的启示
OpenClaw是"为你工作"而非"你需要时才用"的AI。它记住你、了解你、主动找你。关键是从简单开始，逐步建立信任，让AI真正成为你的数字分身。

### 对团队的启示
每个人都可以有自己的OpenClaw，团队成员的代理可以互相协作。上下文是关键——拥有一个全天候在线的代理，连接你所在的每个地方，才能最大限度发挥AI的智能。

### 仍待验证
- OpenClaw的长期记忆机制能否真正代替人类的判断？
- 多代理协作在团队规模扩大时是否会出现混乱？
- 免费模型的性能能否满足日常使用？

> **金句 · Matt（封底）**
> **中文：** ChatGPT、Claude、Gemini是你需要帮助时才打开的工具。OpenClaw不同——它全天候运行在服务器上，连接你的应用程序，甚至无需你指示就能采取行动。
> **原文：** ChatGPT, Claude, Gemini are tools you open when you need help. OpenClaw is different — it runs 24/7 on a server, connects to your apps, and can even take action without you asking.

---

## 相关阅读

- [[OpenClaw实战-Every团队使用Case]] — Every团队如何用OpenClaw协作
- [[OpenClaw创始人-Claw现状与安全治理]] — OpenClaw创始人谈安全治理
- [[Taven创始人-将OpenClaw嵌入产品的实战经验]] — OpenClaw在产品中的集成
- [[30分钟精通OpenClaw]] — 更快的入门教程
- [[MOC - Harness Engineering]]

---

## 来源

- B 站：[BV1rdAVzAEdS](https://www.bilibili.com/video/BV1rdAVzAEdS/)
- 专栏：[cv42698811](https://www.bilibili.com/read/cv42698811/)
- 主源：`Recastory/workspace/bilibili-retranscribe/BV1rdAVzAEdS/ingest/column_article.md`
