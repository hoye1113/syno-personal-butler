---
title: "Every 增长主管：Codex 成为知识工作的 OS"
tags: ["ai_agent", "codex", "openai", "ai_coding", "bilibili", "video_transcript"]
legacy_tags: ["ai_agent", "codex", "openai", "ai_coding", "bilibili", "video_transcript"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Dan Shipper × Austin Tedesco：从 Claude Code 全面转向 Codex；代理管理界面即知识工作 OS；Every Growth OS、Compound Knowledge 审阅流、代理文档常态化、Notion KPI 真实来源与「玩乐」文化。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Every增长主管-Codex成为知识工作的OS.md"
source_sha256: "d393b0ea57776c19bafc3f6f363edd008e4d31b9090edfa44be5548fffe078fc"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV18QE56zEVr/"
duration: "60:00"
saved: 2026-07-06
updated: 2026-07-06
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV18QE56zEVr/ingest"
column_url: "https://www.bilibili.com/read/cv50256690/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV18QE56zEVr/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Dan Shipper"
guest_name: "Austin Tedesco"
guest_title: "Every 增长主管"
speaker_inference: "column_article S-tier + Codex Bootcamp live"
speaker_confidence: high
author:
  - "[[Dan Shipper]]"
  - "[[Austin Tedesco]]"
concepts:
  - id: agent_management_os
    zh: 代理管理界面
    en: agent management interface
    one_line: 桌面 Codex / Claude Code 成知识工作新 OS，代理是软件与互联网的主入口
  - id: compound_knowledge
    zh: 复合知识工作流
    en: Compound Knowledge
    one_line: 分叉 Compound Engineering，为 GTM/招聘加战略对齐与数据准确性审阅
  - id: clumsy_vs_smart_agent
    zh: 笨拙代理与智能代理
    en: clumsy agent vs smart agent
    one_line: 前者把小事做对（邮件草稿）；后者是来回协作的战略伙伴
  - id: agent_authored_doc
    zh: 代理文档常态化
    en: agent-authored document normalization
    one_line: 团队默认读 AI 整理的 Markdown，发送者须对内容负责
  - id: kpi_single_source
    zh: KPI 真实来源
    en: single source of truth (SSOT)
    one_line: Codex 写脚本调 Notion API，每六小时刷新全业务指标
  - id: play_culture
    zh: 玩乐文化
    en: play culture
    one_line: 思考周 + 会议间隙折腾工具——看似浪费，实为换范式
---

# Every 增长主管：Codex 成为知识工作的 OS

**Host：** Dan Shipper（Every 联合创始人）  
**Guest：** Austin Tedesco（Every 增长主管）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 中文口语化 · Codex 训练营直播）  
**B 站：** [BV18QE56zEVr](https://www.bilibili.com/video/BV18QE56zEVr/) · **时长** ~60 min · **专栏** [cv50256690](https://www.bilibili.com/read/cv50256690/)

---

## 开场

三个月前 Dan 还说 Codex「一无是处」——情商低、爱跟你抬杠，像只给资深工程师用的结对编程工具。GPT 5.5 发布后的这场 Codex 训练营里，他改口了：**Codex 已从工程工具变成自己的日常工作驱动**，写深度代码、写稿、招聘都在里面。

更深一层变化：Anthropic 先证明 **电脑上有一个快、聪明、能访问文件系统的通用编码代理**，对程序员极好；接着发现——**能自己写软件的代理，就能做几乎一切知识工作**。世界正从「程序员在云端代码里委托任务」，滑向「任何知识工作都在代理桌面应用里委托」。OpenAI 过去三个月对 Codex 做了彻底转向：文件系统、浏览器、沙盒，包进桌面应用——Dan 认为这是目前最好的版本。

Austin 是 Every 增长主管，经历过两次「代理顿悟」：先是 Claude Code 周末狂用 12 小时；近几周在 Dan 催促下 **全面迁移到 Codex 5.5**。他 **约 80% 工作时间** 泡在 Codex 里，Gmail、Slack、Notion、Stripe、数据库一条龙。这期他现场演示 **Every Growth OS** 工作流，并聊代理文档、KPI 真实来源与 Every 的「玩乐」文化。

六章预告：**编码代理 → 知识工作桥梁** → **桌面应用决定上限** → **复合审阅工作流** → **代理文档常态化** → **动态 KPI 跟踪器** → **从执行任务到玩转 AI**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理管理界面 | agent management interface | Codex / Claude Code 桌面端——模型公司的知识工作 OS 竞赛场 |
| 复合工程 | Compound Engineering | Kieran Classen 插件：分步 brainstorm + 工程向审阅 |
| 复合知识 | Compound Knowledge | Austin 分叉版：战略对齐 + 数据准确性审阅 |
| 笨拙代理 | clumsy agent | 每次把正确小事做对的自动化（如邮件草稿汇总） |
| 智能代理 | smart agent | OpenClaw / Plus One 式来回协作的战略伙伴 |
| 真实来源 | single source of truth (SSOT) | 人类与代理共同信赖的 KPI 单一数据源 |
| 后续雷达 | follow-up radar | Codex 建议的信息分类与待办追踪自动化 |
| 代理友好 Markdown | agent-friendly Markdown | Evidence 等工具：人读也读、代理也能解析的协作文档 |

---

## 01 编码代理是通往通用知识工作自动化的桥梁 [05:12]

**Dan Shipper：** 欢迎来到 Codex 训练营。GPT 5.5 刚发布，正好聊这件事。三个月、六个月前我还说 Codex 一无是处——OpenAI 的人如果在听，我坚持。它最初给资深工程师结对编程：爱争论、让你觉得自己笨，零情商。

OpenAI 一度觉得 **氛围编码** 在 ChatGPT 里做，资深工程师用受限沙盒里的 Codex。Anthropic 发现另一件事：**电脑上好用的通用编码代理，对任何知识工作都极好**——能写软件，就能做知识工作。我们从「程序员委托云端代码」，转向「知识工作者在 Codex / Claude Code 桌面里委托一切」。

Codex 已经变成我的日常驱动：深度工程、写作、招聘——招聘尤其猛。在他们看来，**通用代理 + 文件系统 + 浏览器 + 桌面应用** 是知识工作的下一步；我认为他们建了目前最好的版本。

还有一层：**新的操作系统正在成形**——决定你怎么、在哪完成工作。就是 **代理管理界面**：Anthropic 有 Claude Code 和 Cowork，OpenAI 有 Codex，xAI 收了 Cursor，谷歌有 Anti-gravity 但还没人认真用。每家模型公司都在赛这个：**以编程代理为核心的桌面应用**。

一旦你加上代理，它就成你访问软件、互联网、日常事务的 **主接口**——能跟别的软件交互再回来，以前不可能的事都开了。这就是我们正在进入的世界：**代理是你与大部分工作、大部分软件的接口**。

Austin，你三四个月前的顿悟是 Claude Code——整个周末 12 小时粘在电脑前。最近几周我催你试 Codex 5.5，看来你已经全迁过去了。聊聊你看到了什么，再演示你的工作流。

**Austin Tedesco：** 我的第一次顿悟是 12 月到 1 月，一周深挖 Claude Code CLI，接到工作和生活里所有东西。用 Warp 当系统终端，发现它能自动化、能当思想伙伴——战略思考、数据分析、发营销文案那种 **分散在十几个 App 里** 的活，全整合了。

二月 Dan 一直说：「你真该试 Codex。」团队里有人强烈推荐我就会试。我还在 Codex 里做了个个人视频编码 App——构建可能更好，但 Codex 太爱让我觉得自己蠢了。

那时我几乎Everything 都用 Kieran 的 **复合工程** 插件，包括知识工作和提 PR。它会问三个发展方向，我完全听不懂，每个都回「请详细解释」——它基本在说「为什么你不按我说的做」。我找到折中：**工程留在 Codex**（喜欢结果，不太喜欢在里面干活），**80% 知识工作走 Claude Code CLI**。

一个月前拿到新 GPT 模型，感觉 Opus 和 GPT **对等**了——设计之外仍信任 Opus，但 Codex 有些东西更具体、更喜欢。

> **金句 · Dan Shipper**
> **中文：** 能自己写软件的代理，就能完成几乎一切知识工作——代理管理界面就是新的 OS。
> **原文：** If it can write software for itself, it can do any knowledge work—and the agent management interface is becoming the new operating system.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理管理界面 | agent management interface | 桌面 Codex/Claude Code——知识工作的主入口 |
| 通用编码代理 | general-purpose coding agent | 写码能力外溢到招聘、写作、数据等 |
| 氛围编码 | vibe coding | 非工程师在 ChatGPT 里轻量构建；与专业 Codex 分流 |
| 知识工作委托 | knowledge work delegation | 从云端代码委托扩展到全职能桌面代理 |

**本章小结**

- Codex 定位 **三个月内急转弯**：工程师结对工具 → 知识工作 OS
- 模型公司竞赛场：**桌面代理应用** 决定用户日常入口，不只是模型分数
- Austin 路径：Claude Code 顿悟 → 工程偏 Codex、知识工作曾偏 CLI → 即将全面 Codex 化

---

## 02 桌面端应用的性能与集成度决定了工作流上限 [12:45]

**Dan Shipper：** 很多人还在问：我们聊的是应用还是 CLI？——**桌面应用**。两家公司都看到终局，目前是赛马：每隔几周一家领先，另一家几周后追上，长期会成独立生态；切换不难，你可以让 Codex 去搬 Claude 的资料。

你在 LA，知识工作者朋友几乎都沉迷 Claude Code 或 Claude 桌面。你说自己 **完全转向 Codex** 时，他们一脸惊恐：「我真的必须迁吗？」——像心理负担。其实很像，主要是情感抵触。

**Austin Tedesco：** 真正的分水岭是 **Codex 桌面应用的速度和强大程度，跟 Claude 桌面比简直是天壤之别**。我从没让 Cowork 真正跑起来——大概已经被 Codex 惯坏了。太快，**子代理** 太棒，自动建议并实现自动化的方式——无法想象没有它。Cowork 某周赶上我不意外，但我现在 **白天登录第一个打开的就是 Codex**。

它会从 **Gmail、Slack、Notion、Stripe、所有数据库** 拉我要的东西。今早要为训练营做流程表，我说「做流程表」——它知道去哪找（我们聊过今天讲什么），推到 Notion、发到 Slack，完美。**大约 80% 工作时间在那里**，绝大部分因为 **应用本身太好用**；模型也足够好，成了日常驱动。

我演示一下。Codex 比 Claude 桌面 **组织得更好**：带 **持久一致聊天** 的文件夹。适合工程——偶尔给产品发 PR，不用在 Claude CLI、Claude 桌面、Codex 之间跳。同一窗口里处理 KPI 表，转头去 Plus One 发 PR。

压力测试：给新产品做 **市场推广计划** + 向 Sparkle 提 PR。Claude 桌面上周的更新 **又笨又慢**；Codex 里 **快且顺**——这种体验一旦尝到就很难回去。我有「氛围编码」 side project 文件夹、个人 OpenClaw 文件夹；核心在 **Every Growth OS**——连了所有系统的密钥和项目说明，还有 **审阅代理**。

复合工程原版审安全性、前端——对 GTM 计划用处不大。我分叉了 **Compound Knowledge**（GitHub 公开）：审 **战略对齐**、**数据准确性**。文件夹里带着这些，做计划时模型能给 **针对性审查**。

**Dan Shipper：** 赞助插播略——回到正题。你推荐的入门提示词是什么？

**Austin Tedesco：** 通过 Codex 插件手动连了 Gmail、Slack、Notion。项目在 Claude Code 里搭的 **Every Growth OS**，本地有 Claude.md，同步 GitHub；在 Codex 打开同一项目，跑 **复合工程 brainstorm**：「去看我最常用的 Notion、Slack、Gmail，想一些能帮我工作的自动化。」

让前沿模型 **告诉我该怎么用它**——比自己想规则更好。Codex 看完我和公司情况，建议都很好，还有 **后续雷达**：信息源分散是知识工作者大痛——能不能分类、当指挥中心？活动/招聘的琐碎流程（我们用 Notion 同步招聘，不用 Ashby）都能自动化。

它生成方案问我要不要——我只说「看起来不错」。印象最深的是：「太好了，我为你创建了这个自动化」—— **几乎不用调就能每天用**。比如 **每天下班整理未回复消息、起草回复**；我点赞或改一句它就发。这是 **笨拙代理**：每次把正确小事做对。另一类是 **智能代理**（OpenClaw、Plus One）——来回协作的战略伙伴。Codex 两种都能搭；知识工作入门建议 **从 brainstorm 自动化开始**，见效快。

> **金句 · Austin Tedesco**
> **中文：** 约 80% 工作时间在 Codex——不是模型崇拜，是桌面应用本身成了驱动引擎。
> **原文：** I spend about 80% of my work time there—mostly because the app itself is so good, and the model is now good enough to be my daily driver.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 子代理 | sub-agent | Codex 并行子任务调度，桌面端体验关键差异 |
| Every Growth OS | Every Growth OS | 增长职能的 Codex 项目文件夹 + 密钥 + 审阅代理 |
| Compound Knowledge | Compound Knowledge | 知识工作向复合工程分叉：战略对齐 + 数据准确性 |
| 笨拙代理 | clumsy agent | 高频低错自动化（邮件草稿、待办雷达） |
| 后续雷达 | follow-up radar | 跨渠道信息分类与跟进的代理化 |

**本章小结**

- **应用层 > 模型层** 成为 Austin 迁移理由：速度、子代理、自动化建议
- **Growth OS** = 业务上下文 + 工具连接 + 知识向审阅代理，一套文件夹跑增长全栈
- 入门路径：让模型 **采访你、提议自动化**，而非手写规则——笨拙代理先见效

---

## 03 建立复合知识工作流，让 AI 成为战略审阅者 [22:10]

**Dan Shipper：** 现场问答。Margaret 问：审查步骤怎么运作？「未经明确批准不发送」——要特意触发还是手机推送？

**Austin Tedesco：** 我昨晚跟朋友聊过同样问题。 **起草和设置在 Codex 里完成**；**最终审查在外部 App**——帮大脑切换模式。Slack 消息进 **草稿回复** 标签，我在 Slack 里过一遍；邮件进 Gmail 草稿。有人直接在 Codex 里点发送，我更喜欢 **战略规划也推到校对文档或 Notion**，人类接触前 **离开代理空间** 做最后一关——那是我唯一离开应用的时候。

**Dan Shipper：** Alex 问：音乐家，邮件里混着客户询价和通讯——怎么不让自动化漏掉赚钱机会？

**Austin Tedesco：** 我靠 Every 的 **Quora**（订阅邮件助手）——现在有 CLI/API，在 Codex 里告诉 Quora 要什么、重视什么。通用做法：**让代理采访你** 定规则，比你自己列规则好。用 **Monologue** 语音 brainstorm：「邮件一团糟，想想怎么分类。」

设硬规则：「永远不替我发送，只起草」「工作日下午 3 点批量看邮件」。让它出 **子代理计划**，你读计划——会不会误删/自动存档重要线索？再加 **Todoist 提醒**：72 小时后审计新自动化，让模型看它一直在存档什么。

**Dan Shipper：** 补充——Austin 用 Codex/Claude Code 配 **Plus One**（托管 OpenClaw）。早期 Plus One 要填一堆仪表板； **CLI 暴露给 Codex** 后，对话里所有关于你的上下文自动灌进设置—— **假设每用户都有这种代理，就不需要复杂 onboarding**。

**Austin Tedesco：** 受 Claire Vo 在 Lenny 播客启发：别把一个 OpenClaw 当超级代理，要 **六个专用代理**。我去 Codex，把采访记录丢进去：「想做同样的事，结合你对我的工作了解，建议在 Slack 配哪六个代理。」计划稍作调整就上了——每天在 Slack 跑。会出小错，接受；修复时 **截图或 @Slack 让 Codex 去找对话、改架构**——不用跟代理吵架。

**Dan Shipper：** 审查步骤、邮件规则、多代理编排——都指向同一件事：**复合工作流** 不只是工程里的「写完代码跑 linter」，而是 **知识产出也要分步：brainstorm → 起草 → 战略/数据审阅 → 人类终审**。

**Austin Tedesco：** 对。复合工程开箱对知识工作已经很强；我分叉 Compound Knowledge 是因为看 Kieran/Trevin 的工程审阅员说「过安全审查」——换 GTM 计划就 **自动改路径** 审别的。分叉是 **学习插件怎么做** 的好方式；做社媒营销也可以 fork 成审 **风格指南符合度**。

Every Notion 里有 **复合数据库**：会话结束问要不要 **compound 学习**、要不要把流程 **转成 skill** 下次自动跑——团队共享的真实来源。

> **金句 · Austin Tedesco**
> **中文：** 人类最后一关要在代理空间外做——草稿在 Gmail/Slack，大脑才确信这是要发给真人的东西。
> **原文：** The final review step happens in the external app—that helps my brain switch modes and be sure this is what I want to send to a human.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 外部终审 | external final review | 起草在 Codex，发送前在 Gmail/Slack/Notion 人类过一遍 |
| 代理采访 | agent interview | 让模型问规则，而非人手写过滤条件 |
| 六代理架构 | six-agent setup | 专用代理分工，优于单一超级代理 |
| 会话复合 | session compounding | 把本次学习写入团队 Notion + 可复用 skill |

**本章小结**

- **人机边界**：代理做 80–90% 预处理 + 集成；人类在 **熟悉界面** 做发送前终审
- Compound Knowledge 把工程向「安全审查」换成 **战略对齐 + 数据准确**——知识工作的 harness
- 多代理：从采访/计划起步，小错用 Codex **改架构** 而非人工调 prompt 到死

---

## 04 代理文档常态化：用 AI 撰写的 Markdown 进行团队协作 [35:50]

**Dan Shipper：** 继续知识工作——你最喜欢的一种用法？

**Austin Tedesco：** Plus One 正式市场发布前，内部会议和 Slack 讨论了一堆 GTM 战略——人类该做的营销案、商业案、叙事都有了，散落在各处。周二会议间隙我提示 Codex：

「Notion 里会议记录在一处，Slack 也聊了很多，我有喜欢的 GTM 模板——能直接帮我做计划吗？」本以为 6–7 分再自己磨，结果 **接近可用**。流程：先跑 **复合 brainstorm**，出 **校对文档**；我提醒它别忘看 **已排期的帖子和日历**——它生成校对版计划，五分钟间隙读完：「真的很好。」再小改，转 Notion—— **大约 80–90% 完成**。

不是让模型替我想战略，而是让它 **整合我们已经讨论过的一切并审查**——加载 ICP、目标、叙事定位等上下文。以前要么花一整天，要么晚上六七点熬夜写。现在 **会议间隙** 就能推进。

更关键的是：计划不只给人看，也给 **代理** 看。发给市场团队，人类可读；COO Brandon 可以问他的 Plus One：「奥斯汀的计划是什么？总结商业案例。」他要定定价，可以 **针对同一份计划跟代理协作**。我不用再纠结「两页预算表排版 CEO 会不会挑刺」——计划够好、Dan 的代理能读懂审过，我就省心。

**Dan Shipper：** 这叫 **代理文档常态化**——我们用 **Evidence** 互发 AI 生成的 Markdown 一起审。一拨讨论是「让 AI 用你的声音写」；另一拨是 **让 AI 写常态化**——很多时候我宁愿读你 **代理写的文档**，因为你更容易把想法整理成可读结构。我关心的是：**你认可吗？经得起追问吗？**

人类的新问题：**电脑替你干活时你干什么？** Every 的一个答案是 **Claude Walk**——出去走一圈思考。

**Austin Tedesco：** 完全同意。朋友 Rachel Karten 写社媒从业者挫折——一切都得跑 AI，质量下降；二元对立是经理不知道 AI 写了啥。Every 的规则相反：**会前发 AI 文档，预期你支持全文**——被问到「这啥意思」不能说「我不知道里面有这句」。

我们在项目文件里设规则：「不要加我没说过的话」「建议放聊天里别直接写进文档」——模型不一定遵守，所以 **终审前回到人类协作界面**。Dan 说得对：大量时间其实是把 **已经想过的东西** 整理成别人能读的格式；真正重要的是 **思考**——战略常在会议里大声想出来，写作难， **口述容易**。录 Monologue，让 Codex 访问素材吐战略文档，你再确认——碎片时间就能写大文档。

**Dan Shipper：** 招聘也是知识工作大变脸。我们在招 L&D 负责人——我对 General Assembly 校友有理论。对 Codex 说：「给我 GA 校友名单，筛后来做 AI 的人并排序。」第一份名单里 **第一个人完美**，还关注了我的 Twitter——直接私信。外展找「沧海遗珠」极强。

> **金句 · Dan Shipper**
> **中文：** 我宁愿读你代理写的文档——只要你认可内容、经得起追问。
> **原文：** In many cases I'd rather read your agent-written doc—if you stand behind it and can discuss the thinking.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理文档常态化 | agent doc normalization | 默认发 AI 整理的结构化 Markdown，人负责背书 |
| 人机共读计划 | human+agent readable plan | GTM 文档同时服务同事和他们的 Plus One/Codex |
| Evidence | Evidence | Every 内部互发代理友好 Markdown 的轻量工具 |
| Claude Walk | Claude Walk | 电脑干活时人走开思考的工作方式 |

**本章小结**

- GTM 计划案例：**整合分散上下文 + 战略审阅** → 会议间隙出 80–90% 稿
- 信任模型：**发送者背书** > 是否手写；Every 用规则防「甩锅给 AI」
- 招聘：Codex 做 **校友挖掘与外展排序**——知识工作不仅是写文档

---

## 05 解决数据哲学问题：利用 AI 构建动态 KPI 跟踪器 [48:15]

**Austin Tedesco：** 再展示一件——没有这些工具不可能的事。我 **每周在 Codex 里重建 KPI 跟踪器**。Every 多业务板块，PostHog 很好用，但很难把所有数据点汇成 **一个真实来源**——既要给人看仪表板，也要给 **代理** 看：试用转化、页面浏览、Monologue iOS MRR、对比计划。代理自动化（比如 SEO 落后就批量着陆页）前提是 **数字准**。

目标：KPI 表在 **Notion 数据库**，任何代理人都能查。Codex 有 API 密钥和衡量口径上下文——**一次性生成** 总有 5–10% 格式/数字偏差；**MRR 不能偏 5%**，不能带着 3% 误差运营，也不能让代理在错数上行动。

我强迫自己 **逐列检查**——听起来蠢，但是 **可靠运营和让代理信数据的唯一方式**。模型用 Notion worker 工具、写 Stripe/社交的持续调用脚本——我不懂脚本，懂 **输出**：每六小时更新的 Notion 库，全指标。不用雇顾问，不占工程师时间—— **提示模型 + 理解指标该怎么算**。

**Dan Shipper：** 周一能 ready 吗？

**Austin Tedesco：** 周一。

**Dan Shipper：** 我们为这个纠结很久。弄清楚 **你赚多少钱、增长多少** 确实是 **哲学问题**——框架得你进去定。旧表在抽数，但 **数字本身对吗？** MRR **没有统一量法**，你只能 **选一种每次一致**。几乎不可能客观知道赚多少——你得做决定。AI 之外也一样疯。

> **金句 · Austin Tedesco**
> **中文：** MRR 不能偏 5%——逐列核对是唯一能让代理信这张表的方式。
> **原文：** Our MRR numbers can't be 5% off—the only way to run the business and let agents act on the KPI table is column-by-column verification.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| KPI 真实来源 | KPI single source of truth | Notion 库每 6h 刷新，人眼与代理共用 |
| 数据哲学 | data philosophy | MRR 等指标定义无客观统一，必须显式选口径 |
| 逐列验证 | column-by-column verification | 非工程师用 Codex 搭数据管道时的质量门槛 |
| Notion worker 工具 | Notion worker tools | Codex 调 API 写持续更新脚本的开发向能力 |

**本章小结**

- **非技术人员 + Codex** 可搭企业级数据管道——但 **准确性不能全信一次性生成**
- KPI 表双重消费者：**人类决策 + 代理自动化**——错数代价对称放大
- 「赚多少」是 **定义问题** 不是纯技术问题；AI 加速实现，不替你做哲学选择

---

## 06 组织文化的转向：从执行任务到玩转 AI [55:30]

**Dan Shipper：** 里奇问：复合工程用现成插件还是自己 fork？知识工作哪有效哪无效？

**Austin Tedesco：** 不必 fork 也能很强；我看工程审阅回复才做了 Compound Knowledge。开箱复合工程对知识工作 **非常有效**；复合步骤本身极有价值——会话结束问是否 **compound 到团队库**、是否变 **skill**。

**Dan Shipper：** 罗里问：会议间隙折腾这些——给团队的实践建议？

**Austin Tedesco：** 没有完美答案。「**玩乐**」是 Every 核心——Dan 鼓励，也是我在这工作的原因。最好学习方式，也让任何事做得更好。我给自个儿的纪律：**Codex 自动化让我按时交付**——我沉迷做社交自动化工具时，Brandon 仍拿得到他要的业务发展计划。模型太兴奋，得不断拉回 **当日必需任务**。

**Dan Shipper：** 工具和工作流 **变得太快**。只专注现有打法，跑得再快也会被 **用新范式的人默认击败**。给自己 **玩乐时间** 感觉浪费，其实是在 **升维**。组织实践：**思考周**（Think Week）——一年两次，一整周不跑日常，一起玩新东西、构建、学习；至少 **每季度一天** 也好。

今天先到这。Every 是你保持在 AI 前沿需要的订阅——告诉朋友一起来。训练营链接里还有 **ChatGPT Pro 一个月**（约 $100）兑换码给参与者。

**Austin Tedesco：** 各位点赞订阅 AI and I——Dan 的船长的未来之旅，系好安全带。

> **金句 · Dan Shipper（封底）**
> **中文：** 玩乐感觉像在浪费时间，却是换到别人追不上的游戏层的唯一办法。
> **原文：** Play feels like wasting time—but it's the only way to level up into a game others can't catch you in.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 玩乐文化 | play culture | 鼓励会议间隙折腾工具，与交付纪律并存 |
| 思考周 | Think Week | 停日常、全团队探索新工具与构建 |
| 复合入库 | compounding to team DB | 会话学习写入 Notion，转可复用 skill |
| 范式焦虑 | paradigm anxiety | 知识工作者对「又要迁移一次」的情感抵触 |

**本章小结**

- **文化 > 工具清单**：思考周 + 玩乐许可，对抗「只忙当前 OKR」的隐性淘汰
- Austin 自律：**自动化保障交付**，才腾出手玩更长线的工具链
- 迁移 Codex 的心理成本真实——但 **30–40% 体验差** 累积成日常驱动差异

---

## 总结：Codex 是增长负责人的日常 OS，不是程序员的专属终端

| 维度 | 要点 |
|------|------|
| 范式 | **编码代理 → 知识工作通用代理**；代理管理界面 = 新 OS |
| 产品 | Austin **80% 时间在 Codex 桌面**——速度、子代理、集成胜过纯模型对比 |
| 工作流 | **Every Growth OS** + Compound Knowledge 审阅；笨拙代理先自动化小事 |
| 协作 | **代理文档常态化**；人背书 + 外部 App 终审；计划 **人机代理共读** |
| 数据 | Notion KPI **每 6h 刷新**；MRR 等须 **逐列验证** + 显式数据哲学 |
| 文化 | **思考周 + 玩乐**；工具变太快，不探索 = 默认落后 |
| 招聘 | Codex 挖 GA 校友等 **外展知识工作** 已实战 |

### 对个人的启示

- 别在 CLI vs 应用里站队——**桌面应用的调度、文件夹、子代理** 可能决定你是否「住」在代理里；对照 [[Codex负责人-现场演示Codex]] 的产品视角，本篇是 **增长职能 dogfood**。
- 入门：**让模型提议自动化**（brainstorm 提示），先笨拙代理（邮件草稿、待办雷达），再叠 Compound Knowledge 式 **战略/数据审阅**。
- 发文档：默认 AI 整理可以，但 **你背书**；终审在 Gmail/Slack/Notion，别在代理里一键发出——与 [[OpenAI播客-用Codex处理日常工作]] 的信任沙盒论互补。

### 对团队的启示

- **Growth OS** 模式：一个密钥文件夹 + 业务说明 + 审阅代理 + 工具插件——非工程职能也能复制。
- KPI 表要当 **代理可读的 SSOT** 设计；数字口径团队先定，Codex 负责 **管道与刷新**。
- 组织上给 **思考周/季度玩乐日**——否则全员会被「当日发帖」挤掉范式升级；harness 迭代节奏见 [[OpenAI研究员-Harness工程软件开发新范式]]。

### 仍待验证

- 直播含赞助口播（Bilt 等）与训练营福利码细节——与核心论点无关，收录时略。
- 「80% 工作时间」为 Austin 个人体感，非 Every 全公司统计。
- Compound Knowledge 仓库链接在训练营 follow-up 邮件——vault 可后续补 wikilink。

---

## 关键概念

| 概念 | 一句话 |
|------|--------|
| **代理管理界面** | Codex/Claude Code 桌面端成知识工作 OS；代理是软件与互联网主入口 |
| **Every Growth OS** | 增长职能统一 Codex 项目：工具连接 + 业务上下文 + 审阅代理 |
| **Compound Knowledge** | 复合工程的知识工作分叉：战略对齐 + 数据准确性审阅步骤 |
| **笨拙代理 vs 智能代理** | 前者高频小事自动化；后者（OpenClaw/Plus One）战略协作 |
| **代理文档常态化** | 默认读 AI 整理 Markdown；发送者须对内容负责并经得起追问 |
| **KPI 真实来源** | Notion 每 6h 刷新；人眼与代理共用；MRR 须逐列验证 |
| **外部终审** | 起草在 Codex，发送前在 Gmail/Slack/Notion 人类界面过最后一关 |
| **玩乐文化** | 思考周 + 会议间隙探索；与「自动化保障按时交付」纪律并存 |

---

## 附录

### 章节时间戳（专栏导读）

| 章节 | 时间 | 主题 |
|------|------|------|
| 01 | [05:12] | 编码代理 → 知识工作桥梁；代理管理界面即 OS |
| 02 | [12:45] | Codex 桌面速度/子代理；80% 工作时间；Growth OS 导览 |
| 03 | [22:10] | Compound Knowledge；自动化 brainstorm；审查与多代理 Q&A |
| 04 | [35:50] | GTM 计划代理化；代理文档常态化；招聘外展 |
| 05 | [48:15] | Notion KPI 跟踪器；数据哲学与逐列验证 |
| 06 | [55:30] | 复合工程 Q&A；玩乐文化；思考周 |

### Ingest 路径

| 字段 | 路径 |
|------|------|
| ingest_dir | `Recastory/workspace/bilibili-retranscribe/BV18QE56zEVr/ingest` |
| column_source | `.../ingest/column_article.md` |
| column_url | https://www.bilibili.com/read/cv50256690/ |
| BV | https://www.bilibili.com/video/BV18QE56zEVr/ |

### 相关阅读

- [[Codex负责人-现场演示Codex]] — Thibault 产品演示与智能体成熟度；本篇 Austin **增长职能全流程 dogfood**，互补视角
- [[OpenAI播客-用Codex处理日常工作]] — Thibault × Chris：Codex 作通用任务代理与信任沙盒；本篇补 **非工程岗位桌面工作流与组织文化**
- [[OpenAI研究员-Harness工程软件开发新范式]] — Harness 迭代与软件开发新范式；对照本篇 **Compound Knowledge 审阅 harness** 与 KPI 管道搭建
- [[Codex产品负责人-Codex团队如何用Codex]] — OpenAI 内部如何用 Codex 建产品；本篇 Every 侧 **知识工作 OS** 用户画像
- [[OpenClaw创始人-我是如何使用OpenClaw的]] — 个人代理与 CLI 军队；本篇 Slack 六代理与 Plus One 编排与之呼应
- [[MOC - Harness Engineering]] — Codex 桌面、harness、复合工作流横切索引
