---
title: "OpenClaw实战-从零完成全套配置"
tags: ["ai_agent", "video_transcript", "bilibili", "skills", "memory", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "skills", "memory", "harness_engineering"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1VRdABBEnK/"
description: "Tina Huang 演示 OpenClaw 从零搭建：硬件隔离、Markdown 驱动的灵魂文件、多智能体架构、记忆系统和版本控制"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenClaw实战-从零完成全套配置.md"
source_sha256: "3d370073411313ec4c6329035bca7a7f6c9fcc0e7a69024fe246d1b33cc55901"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1VRdABBEnK/"
column_url: "https://www.bilibili.com/read/cv48677271/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1VRdABBEnK/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1VRdABBEnK/ingest"
duration: "~35 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Tina Huang"
guest_name: "Tina Huang"
guest_title: "AI 开发者 / OpenClaw 深度用户"
speaker_inference: "column_article S-tier"
speaker_confidence: high
concepts:
  - id: hardware_isolation
    zh: 硬件隔离
    en: hardware isolation
    one_line: Agent 跑在独立机器上，不碰日常电脑数据
  - id: soul_md
    zh: Markdown 驱动的灵魂文件
    en: soul.md
    one_line: Agent 的身份、个性、长期记忆都存在纯文本文件里
  - id: task_control
    zh: 任务控制中心
    en: task control dashboard
    one_line: 可视化监控多智能体工作流的中央面板
  - id: multi_agent
    zh: 多智能体架构
    en: multi-agent architecture
    one_line: 按职能拆分多个 Agent，各用不同模型，平衡质量和成本
  - id: dreaming
    zh: 梦想功能
    en: dreaming feature
    one_line: 把日常日志提炼为长期记忆的后台整理机制
  - id: prompt_to_code
    zh: 提示词转硬编码
    en: prompt to code
    one_line: 稳定流程从 LLM 提示词链转为固定代码，提高可预测性
author:
  - "[[Tina Huang]]"
---

# OpenClaw实战-从零完成全套配置

**Host：** 主持人  
**Guest：** Tina Huang，AI 开发者  
**形态：** Host-Guest canonical v3.2，**专栏主源**  
**B 站：** [BV1VRdABBEnK](https://www.bilibili.com/video/BV1VRdABBEnK/) | **时长：** ~35 min  
**专栏：** [cv48677271](https://www.bilibili.com/read/cv48677271/)

---

## 开场：为什么现在聊这个

Tina Huang 的 OpenClaw 不是"能用"，是"能用得安心"。她花了数周踩坑，把硬件隔离、灵魂文件、多智能体、记忆系统、版本控制全串成了一条可持续的链路。很多人搭完 OpenClaw 就兴奋地到处发推，三个月后发现 Agent 记性退化、提示词漂移、成本失控。Tina 的方案是反过来的——先解决安全和可持续性，再谈花活。

以下按搭建顺序拆：**硬件隔离** → **灵魂文件体系** → **任务控制中心** → **多智能体分工** → **记忆与安全** → **进阶集成**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 智能体 | agent | 能多步执行、调工具的助手 |
| 灵魂文件 | soul.md | Agent 的身份和个性定义 |
| 任务控制中心 | task control dashboard | 监控多智能体工作流的可视化面板 |
| 梦想功能 | dreaming | 后台自动把日常日志提炼为长期记忆 |
| 卡帕蒂记忆 | Karpathy memory | 把所有记忆变成可搜索的维基百科式系统 |
| 提示词转代码 | prompt to code | 把 LLM 提示词链固化为确定性代码 |
| 多智能体 | multi-agent | 多个 Agent 分工协作，各司其职 |
| 版本控制 | version control | 跟踪 Agent 文件变更，随时可回滚 |

---

## 01 硬件隔离是安全运行的前提，不是可选项

**Host：** OpenClaw 跑在什么硬件上？有没有什么必须注意的？

**Guest：** 这是你要做的第一件事——确定你的 OpenClaw 跑在什么硬件上。对大多数人来说有三种选择。

第一种是闲置的旧笔记本电脑，免费的，你只需清除上面所有内容。你不需要超高级的硬件才能充分利用 OpenClaw。我今天展示的设置就是在我的旧 MacBook Pro 上进行的，只有 16GB 内存。

第二种是专用电脑，比如 Mac Mini 或 Mac Studio。这是始终在线的机器，OpenClaw 官方推荐的方式。Mac Mini 大约 500 到 1000 美元，Mac Studio 大约 2000 到 7000 美元。

第三种是虚拟专用服务器，就像租用别人的硬件，每月大约 5 到 20 美元。很多人用这个选项，但我的个人意见是：只有当你非常熟悉使用终端并能自己管理服务器时，才应该考虑。

最后一点建议：**我强烈不建议你把 OpenClaw 安装在日常使用的个人电脑上。** 那里包含你的所有数据，Agent 理论上可以访问所有这些数据，这可能导致安全风险。最好把它隔离在独立的电脑中。

**Host：** 为什么物理隔离这么重要？软件层面的安全措施不够吗？

**Guest：** 软件安全措施当然重要，但物理隔离是第一道防线。你的 Agent 拥有极高的数据访问权限——它可以读文件、发邮件、调 API。如果它跑在你的日常电脑上，理论上它可以访问你的所有照片、聊天记录、银行信息。模型是不可预测的，它可能误操作。物理隔离意味着即使出问题，它也只能影响那台独立机器上的数据。这是最简单也最有效的安全措施。

> **金句 · Tina Huang**
> **中文：** 你不会让一个实习生同时掌握公司的公章和你的银行卡——对 Agent 也一样。
> **原文：** You wouldn't give an intern the company seal and your bank card at the same time — treat your agent the same way.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 硬件隔离 | hardware isolation | Agent 跑在独立机器，不碰主电脑数据 |
| 专用机器 | dedicated machine | 始终在线跑 Agent 的独立设备 |
| 虚拟专用服务器 | VPS | 租用云服务器跑 Agent，月费低但需运维能力 |

**本章小结**
- 硬件隔离不是偏执，是对 Agent 不可预测性的务实应对
- 旧笔记本就够用，不需要顶级硬件
- 三种方案各有适用场景，关键是选一个然后坚持隔离原则

---

## 02 灵魂文件是 OpenClaw 的操作系统

**Host：** 安装完之后，我看到一堆 Markdown 文件——agents.md、soul.md、memory.md——它们到底是什么？

**Guest：** 这是 OpenClaw 的实际工作原理，理解这个比学会用任何功能都重要。

这些纯文本的 Markdown 文件就是 Agent 的个性和长期记忆。比如你打开 soul.md，它描述"这是谁"。比如我的 Agent："我是 Inky，一个章鱼，核心真理是一名合作者，而非助手。蒂娜不需要一个只会说'是'的机器。要和她一起思考，当她犯错时反驳她，在头脑风暴时挑战她的想法。"soul.md 定义了代理的真实身份，就像它的个性、声音和脾气，好比一张角色表。

agents.md 说明这个文件夹就是"家"，要以此对待。它还会告诉引擎标准操作程序是什么，比如在第一次运行时该做什么，以及在每次会话启动时，在做任何其他事情之前，它都应该阅读 soul.md 来记住自己是谁。

user.md 是你的 OpenClaw 代理所了解的关于你的一切。memory.md 用于存储长期记忆，记录它需要记住的重要事项。

随着你持续与代理合作，会有越来越多的内容进入这些文本文件。这些文件的组合就是你代理的核心精髓。所以如果你想将代理迁移到其他机器上，只要保留这些 Markdown 文件，就可以重新创建你原有的代理。

**Host：** 这些文件会自动更新还是需要手动编辑？

**Guest：** 两者都有。Agent 会自己往 memory.md 和日志里写内容，但核心的 soul.md 和 agents.md 通常是你手动定义的。关键是你要理解这些文件的角色——soul.md 定义身份，agents.md 定义行为规则，user.md 定义用户信息，memory.md 存长期记忆。如果你搞混了，Agent 的行为就会出问题。

比如你把一段操作规则写进了 soul.md，它可能会把规则当成身份去执行。你把身份写进了 agents.md，它可能在每次会话都重复加载那些身份信息。每条信息都应该有一个存放的地方，这个分工必须清楚。

> **金句 · Tina Huang**
> **中文：** 这些文件就是你的 Agent 的操作系统——搞混了文件角色，就像在 Linux 上跑 Windows 程序，能跑但迟早出事。
> **原文：** These files are your agent's operating system — mix up the roles and it's like running Windows programs on Linux. It works until it doesn't.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 灵魂文件 | soul.md | Agent 的身份定义：叫什么、是什么、怎么思考 |
| 操作规则 | agents.md | Agent 的行为准则和标准操作程序 |
| 用户文件 | user.md | Agent 对你的了解：业务、偏好、联系方式 |

**本章小结**
- 灵魂文件不是可选装饰，是 Agent 能一致运行的基础
- 四个文件各有分工，搞混会导致行为异常
- 文件可迁移 = Agent 可复刻，这是 OpenClaw 的核心卖点之一

---

## 03 任务控制中心让多智能体协作变得可见

**Host：** 你提到了任务控制中心，这到底是什么？为什么你说它是改变者？

**Guest：** 任务控制就像你的中心枢纽。你可以在这里监控代理正在做什么、分配任务，并全面了解系统状态。把它想象成监控 OpenClaw 发生的一切的中央监控系统。

在我的任务控制中，我们看到的是"代理办公室"。你可以看到小代理正在这里工作。我运行的是一个有多代理的系统。它有一个任务选项卡，显示所有待执行的任务、任务负责人以及连续的活动日志，所以我能清楚知道 Inky 一直在做什么。还有一个内容选项卡，这是我核心的工作流程——因为我非常关注内容创作。日历选项卡显示我安排的任务和正在进行的各种项目。还有一个记忆系统，在这里我可以看到 memory.md 中的长期记忆，以及代理每天记录的日志。还有一个文档选项卡，存放着 OpenClaw 编写的所有文档。我喜欢直观地看到它们，这样它们就是真实存在的。

**Host：** 为什么不能只用终端对话？为什么需要一个可视化的界面？

**Guest：** 终端对话对于简单任务够用，但当你的 Agent 开始同时做多件事——比如一个在写代码，一个在扫描邮件，一个在做研究——你需要一个地方看到所有东西的状态。终端是线性的，你只能看到最近的对话。任务控制中心让你一眼看到所有 Agent 在做什么、进度如何、有没有出错。

另外，随着你加入更多工作流程和项目，它也会随之不断进化。我恳请大家花点时间来构建它，因为它将是你们与 OpenClaw 合作的核心。

> **金句 · Tina Huang**
> **中文：** 终端是和 Agent 聊天，任务控制中心是看着 Agent 干活。
> **原文：** Terminal is talking to your agent. Task control is watching your agent work.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 任务控制中心 | task control dashboard | 多智能体工作流的可视化监控面板 |
| 活动日志 | activity log | 实时记录所有 Agent 的操作和状态 |
| 代理办公室 | agent office | 任务控制中心里显示多个 Agent 工作状态的界面 |

**本章小结**
- 任务控制中心是从"单 Agent 对话"到"多 Agent 协作"的桥梁
- 可视化不是花哨功能，是管理复杂度的必要手段
- 随着系统增长，任务控制中心本身也在进化

---

## 04 多智能体分工是质量和成本的平衡点

**Host：** 你有 Inky、Blinky、Pinky、Dinky 这么多代理，它们分别做什么？为什么要拆这么多？

**Guest：** 将项目拆分为多个代理而不是仅由一个代理负责，主要有两个原因。

第一个原因：如果你的项目规模越来越大，最好将其拆分，让多个代理协同工作，确保项目的每个部分都能执行得更好。这有点像如果你只有一个员工，却让他负责公司里所有的事务，他会开始感到困惑。

在我的案例中，这个"每日摘要到内容"的工作流程变得越来越庞大，所以我把它拆分了。Blinky 是"早晨侦察兵"，每天早上扫描 Reddit、Hacker News 和 GitHub 上的 AI 新闻，对主题进行评分并提供视频创意。Pinky 是"研究分析师"，每天晚上会选择一个概念进行深入研究。Dinky 是"内容制作人"，当我决定内容方向时，Dinky 就会为我提供视频大纲和脚本。

第二个原因与成本有关。我花在 Inky 上的代币数量巨大，因为它主要使用 Opus 模型，费用要几百美元。我设置了多个代理，让不同的代理使用不同类型的模型来帮我省钱。

**Host：** 具体怎么分配模型？

**Guest：** 因为我只有 16GB RAM，我无法在本地运行真正庞大的开源模型来完全取代 Opus。但我可以做的是——比如我的构建代理 Linky，它使用 Claude Opus 进行规划部分，因为构建时的规划非常重要。但在实际编写代码时，它会切换到 DeepSeek Coder 这种开源模型。我在本地下载了 8B 参数的版本，足以编写大部分代码。由于使用本地模型是免费的，这为我节省了很多钱。

我的系统监视器每天进行两次健康检查，使用的是 Ministral 3B，一个非常小的本地模型，运行效果非常好。

> **金句 · Tina Huang**
> **中文：** 多智能体不是为了看起来酷，是因为一个 Agent 同时干所有事，质量会掉、成本会爆。
> **原文：** Multi-agent isn't about looking cool — one agent doing everything tanks quality and explodes cost.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 早晨侦察兵 | morning scout | 每天早上扫描新闻、评分主题、提供创意的 Agent |
| 研究分析师 | research analyst | 深入研究单一概念的研究型 Agent |
| 内容制作人 | content producer | 根据方向产出大纲和脚本的 Agent |
| 模型分层 | model tiering | 按任务复杂度选不同模型，控制成本 |

**本章小结**
- 多智能体拆分的核心是专业分工和成本控制
- 高复杂度任务用顶级模型，低复杂度任务用本地小模型
- 每个 Agent 的职责边界要清晰，否则会互相干扰

---

## 05 记忆退化和安全是 OpenClaw 最大的两个坑

**Host：** 很多人抱怨 OpenClaw 的记忆会退化，你怎么解决的？

**Guest：** 这在整个 OpenClaw 社区仍然是一个未解决的问题，但你可以通过几件事来大大改善。

第一件事是告诉你的 OpenClaw 成为一个积极的记录者，将其写入 agents.md 和 tasks.md。字面上理解，就是让"积极记笔记"成为它个性的一部分。我的日志会记录它每天所做的一切，它还会为自己的操作编写文档。每当 OpenClaw 遗忘任何事情时，它可以通过阅读记录来找回记忆。

第二件事是启用"梦想"功能。进入仪表板，点击 Dreams 选项卡并将开关打开。梦想是一个测试版功能，它有助于整合日常日志和不同会话中记录的碎片化记忆。它会将它们放入 dreams.md，并将最重要的记忆提升到 memory.md 中，成为代理的永久长期记忆。

第三件事是"卡帕蒂记忆"，以安德烈·卡帕蒂命名。它能将你所有的记忆变成一个维基百科，OpenClaw 可以通过搜索它来获取所需信息。

**Host：** 安全方面呢？你之前提过有很多可怕的故事。

**Guest：** 有人丢失了所有电子邮件，有人泄露了密码，有人因为使用不当浪费了大量金钱。好消息是 OpenClaw 官方有一个专门的页面介绍如何保护你的系统。你可以直接复制那个链接发给你的 OpenClaw，要求它每天运行两次安全检查。

在我的设置中，我有一个警报频道，它每天会向我汇报两次发现的情况。比如它曾提醒我 OpenClaw 有更新需要处理，并发现了三个关键的安全隐患。

另外，版本控制也是安全的一部分。你希望跟踪 OpenClaw 在其文件中所做的更改，这样即使出了问题，你也可以随时恢复到旧版本。最简单的方法就是把所有东西放到 GitHub 上。

> **金句 · Tina Huang**
> **中文：** Agent 的记忆不是硬盘，是人的记忆——它会忘，所以你得帮它记。
> **原文：** An agent's memory isn't a hard drive — it's human memory. It forgets, so you have to help it remember.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 梦想功能 | dreaming | 后台把碎片日志整合为长期记忆 |
| 卡帕蒂记忆 | Karpathy memory | 把所有记忆变成可搜索的维基百科 |
| 安全检查 | security audit | 定时扫描系统漏洞和配置问题 |

**本章小结**
- 记忆退化是社区共性问题，积极记录 + 梦想功能 + 卡帕蒂记忆是三层缓解
- 安全检查不能只做一次，要自动化定时运行
- 版本控制是最后的安全网，丢了好歹能恢复

---

## 06 进阶：提示词转代码和跨代理协作

**Host：** 你说进阶工作流包括把提示词转成代码，这是什么意思？

**Guest：** 当项目变得越来越大时，它会变得越来越不稳定。因为许多 OpenClaw 的流程是基于你提供给代理的文本提示构建的，你只是将不同代理的结果串联起来。鉴于大语言模型本质上是不可预测的，故障点会随之累积。

解决办法是：在你让这个神奇的工作流程跑通之后，尽可能将其转换为代码。代码虽然不如 AI 灵活，但它非常稳定。这就像是一个计划任务——虽然工作流程中仍会有基于模型输入输出的部分，但很多环节可以通过代码来固化和稳定。我实际上每天都有一个计划任务，专门负责将尽可能多的提示词和文本逻辑转换为代码。

**Host：** 你还在用 Claude Coworker 和 OpenClaw 配合，为什么？

**Guest：** 我非常喜欢 Claude Coworker 与 OpenClaw 的组合。Anthropic 开发的 Claude Coworker 也是一个本地 AI 代理，但它更稳定、更安全。我绝不会允许 OpenClaw 访问我的主要电子邮箱，因为谁知道它会不会哪天发疯把邮件全删了。但我让 Claude Coworker 访问邮箱会觉得更安全，因为我知道 Anthropic 有更严格的防护措施。虽然这意味着 Anthropic 能看到我的信息，但这是一种我可以接受的妥协。基本上，OpenClaw 和 Claude Coworker 各司其职，在一天结束时，它们会给我一份合并报告。

> **金句 · Tina Huang**
> **中文：** 提示词是胶水，代码是钢筋——项目大了，胶水撑不住。
> **原文：** Prompts are glue, code is rebar — when the project grows, glue doesn't hold.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 提示词转代码 | prompt to code | 把稳定的 LLM 提示词链固化为确定性代码 |
| 跨代理协作 | cross-agent collaboration | 不同 Agent 平台分工协作，各司其职 |
| 合并报告 | merged report | 多个 Agent 汇总工作成果到统一报告 |

**本章小结**
- 提示词转代码是系统从"能用"到"稳定"的关键一步
- 不同 Agent 平台各有安全和能力边界，组合使用比单押一个更稳健
- 进阶不等于复杂，是在正确的时候做正确的加固

---

## 总结：可持续的 OpenClaw 是设计出来的，不是搭出来的

| 维度 | 要点 |
|------|------|
| 硬件 | 物理隔离是第一道防线，旧笔记本就够 |
| 文件体系 | 四个 Markdown 文件各有分工，搞混会出事 |
| 任务控制 | 可视化是管理多智能体复杂度的必要手段 |
| 多智能体 | 按职能拆分 + 按模型分层 = 质量和成本的平衡 |
| 记忆 | 三层缓解：积极记录 + 梦想功能 + 卡帕蒂记忆 |
| 安全 | 自动化安全检查 + 版本控制 = 最后安全网 |
| 进阶 | 提示词转代码 + 跨平台协作 = 稳定性飞跃 |

### 对个人的启示

搭建 OpenClaw 不是终点，维护它才是。硬件隔离、文件分工、版本控制——这些看起来不酷的事情，才是让系统跑三个月、六个月、一年的基础。先做减法，再做加法。

### 仍待验证

- 梦想功能和卡帕蒂记忆在大规模使用后的实际效果
- 提示词转代码的边界在哪里——哪些环节值得固化，哪些保持灵活
- 跨平台协作（OpenClaw + Claude Coworker）的长期稳定性

> **金句 · Tina Huang（封底）**
> **中文：** 大多数人搭完 OpenClaw 就去发推了。三个月后他们回来问为什么 Agent 记性变差了。答案是：你搭完就走了，但系统需要你陪着长大。
> **原文：** Most people build their OpenClaw and go tweet about it. Three months later they come back asking why the agent's memory degraded. The answer: you left after building, but the system needs you to grow with it.

---

## 相关阅读

- [[OpenClaw实战-养虾指南]] — Easonlee 的 OpenClaw 端到端实战，侧重赞助邮件评分和安全防护
- [[Hermes Agent-比 OpenClaw 更好]] — Hermes 桌面端对 OpenClaw 的体验升级对比
- [[OpenClaw创始人-如何安全使用OpenClaw]] — OpenClaw 创始人谈安全最佳实践
- [[MOC - Harness Engineering]] — Agent 行为空间设计的系统视角
