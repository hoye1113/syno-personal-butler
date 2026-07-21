---
title: "Mercury 产品 VP：Claude Code 第二大脑与 MCP"
tags: ["ai_agent", "video_transcript", "bilibili", "mcp", "claude", "harness_engineering", "context_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "mcp", "claude", "harness_engineering", "context_engineering"]
created: "2026-07-07"
source: "B站视频 - Easonlee的AI笔记"
description: "Ryan Wiggins：Mercury MCP 只读银行接入 Claude；500 万字本地知识库 + QMD 概念检索；多代理分析；Granola 会议教练；Anthropic 在初创首选模型反超 OpenAI；PM 从写 PRD 转向原型。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Mercury产品VP-Claude Code第二大脑与MCP.md"
source_sha256: "7d44827d6bcf0981009b0e15292de10c56115dd36fd5bd8ea168f227e9e44792"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1Tu9xBDEkt/"
column_url: "https://www.bilibili.com/read/cv48335142/"
host_name: "Peter Yang"
guest_name: "Ryan Wiggins"
guest_title: "Mercury 产品副总裁"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1Tu9xBDEkt/ingest"
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1Tu9xBDEkt/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1Tu9xBDEkt/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article S-tier dialogue labels"
speaker_confidence: high
duration: "26:13"
saved: 2026-07-07
updated: 2026-07-07
concepts:
  - id: banking_mcp
    zh: 银行 MCP 只读接入
    en: read-only banking MCP
    one_line: OAuth 一键连 Claude，自然语言查账，读写 API 与 MCP 分层
  - id: five_million_context
    zh: 500 万字上下文层
    en: five-million-char context layer
    one_line: 五年战略/会议/规范本地库，QMD 概念索引 + hooks 注入
  - id: ai_coach_granola
    zh: Granola 会议教练
    en: AI coach from meeting transcripts
    one_line: 绩效反馈（如别太快跳方案）日终复盘，比半年面谈管用
  - id: anthropic_workflow_lock
    zh: 工作流锁定效应
    en: workflow lock-in to Anthropic
    one_line: 第二大脑绑 Claude Code，初创首选模型趋势转向 Anthropic
  - id: pm_prototype_shift
    zh: PM 原型替代长文规范
    en: PM shift from specs to prototypes
    one_line: demo.mercury.com 一次性前端，AI 数据分析师答 80–90% 跨职能问题
author:
  - "[[Peter Yang]]"
  - "[[Ryan Wiggins]]"
---

# Mercury 产品 VP：Claude Code 第二大脑与 MCP

**Host：** Peter Yang  
**Guest：** Ryan Wiggins（Mercury 产品副总裁）  
**形态：** Host-Guest v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV1Tu9xBDEkt](https://www.bilibili.com/video/BV1Tu9xBDEkt/) · **时长** ~26 min · **专栏** [cv48335142](https://www.bilibili.com/read/cv48335142/)

---

## 开场

Mercury 给美国三分之一初创公司做银行。Ryan 管约 20 条产品线，在数据/增长/产品岗待了五年。这期两条线：**Mercury MCP** 怎么把财务接进 Claude 工作流；他自己用 **Claude Code** 搭的「第二大脑」——本地 500 万字知识库、多代理分析、会议教练，以及 Mercury 内部看到的 **Anthropic vs OpenAI** 选型变化。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| MCP | Model Context Protocol | AI 应用商店式第三方接入层 |
| 上下文层 | context layer | 公司五年文档 + 会议 + 查询的本地库 |
| QMD | QMD local index | 概念检索，不是纯关键词匹配 |
| 只读 MCP | read-only MCP | 查账安全；完整读写走 Mercury API |

---

## 01 银行界面：分行 → App → API → 对话

**Ryan Wiggins：** 客户在哪，服务就在哪。50 年代是分行，70 年代 ATM，90 年代网站，2010 年代手机 App；2020 年代及以后是 **API + 对话式界面**——财务数据要能便携地进任何工作流。

**小结：** 界面代际换的是触达方式，不是银行本质。

---

## 02 Mercury MCP：OAuth 查账与「MCP 没死」

**Peter Yang：** 演示一下 MCP？

**Ryan Wiggins：** Claude 连接器里装 Mercury 应用。自然语言问「过去几个月花在哪、怎么省钱」——后台调 API，Claude 新 UI 还能表格可视化。**MCP 目前是 API 的只读版**，六个月前上线；完整 API 与网页端一样可读写，MCP 故意只读保安全。沙盒账户演示，非个人真账。

**Peter Yang：** 用户最爱什么？「MCP 已死」你怎么看？

**Ryan Wiggins：** 惊喜案例很多：洛杉矶动画工作室连上后挖出不知道的 **税收优惠**，有人省超 1000 美元，我们有实时「节省记分牌」。常见两问：**主要开支**、**哪里省钱/省税**；EIN、公司地址也能当权威身份源塞进工作流。

建 MCP 前 Mercury 已有成熟 Web/App 和 **高覆盖率 API**；痛点是别的 MCP 登录像改配置文件——我们做成 **OAuth 一键**，和登网页一样。成功看漏斗：发现 → 设置成功 → 重复用 → 留存；很多人变成 **每周/每月** 固定流程。

**Peter Yang：** 漂亮 App  vs 通过 Claude 看账，DAU 会掉吗？

**Ryan Wiggins：** 不会。职责是随时随地服务客户。Chase、Schwab 拉数据太难——我们要省用户时间，少盯仪表板是好事。

**Peter Yang：** MCP 是 OpenAI 和 Anthropic **唯一能共识**的东西吧？

**Ryan Wiggins：** 对。MCP 是消费者产品里接 Mercury 这类服务的 **第三方应用层**；高级用户我们还要出 **Mercury CLI**（几周后）。CLI 给开发者深度，MCP 给大众分发——两者都要。

> **金句：** MCP 像应用商店，不是 API 的简单封装。

**小结：** 只读 MCP + 即将 CLI；便携性 > 绑死在 mercury.com。

---

## 03 第二大脑：500 万字库、QMD 与多代理

**Peter Yang：** 高管里我见过最狠的个人系统——你怎么搭的？

**Ryan Wiggins：** 本地 **上下文层**：五年战略文档、规范、跑过的查询、会议材料（演示版删减敏感信息），约 **500 万字**。每天开 Claude Code，**QMD + Toby 本地索引** 经 **hooks 注入** 每个问题——问「激活趋势」是带着全公司背景在问。

连上 **Metabase、Omni**，能触发完整分析；还有 **多代理团队**：一条指令理解数据、讨论、出报告。早晚简报：日程、GitHub、Slack/Linear、会议转录 → 日终行动项。Notion 转录进系统，开会时更专注。

**Peter Yang：** 安全模式演示 MCP 牵引？

**Ryan Wiggins：** 问知识库「MCP 产品牵引如何」——从约 20 份文档抽上下文（战略背景、增长签到、团队章程），回答完全增强。内部 **自动化数据分析师** 原型验证后全公司发布，答 XFN **80–90%** 基础数据问题。

**小结：** 第二大脑 = 本地概念检索 + 工具链 + 多代理，不是聊天检索。

---

## 04 AI 教练：Granola 转录改管理习惯

**Peter Yang：** 最自豪能分享的技能？

**Ryan Wiggins：** **教练**能力意外好用。绩效里常被说「跳向解决方案太快」——Granola 等会议笔记日终进系统，它会提醒「你今天又在干绩效里那条」。比半年一次面谈 **频率高得多**，经理和 HR 都喜欢。

**Peter Yang：** 全天从 Slack、Linear、Notion 拉一遍再复盘？

**Ryan Wiggins：** 对。我主动在日终 prompt：遗漏待办？今天哪些表现要反思？**问责机制**比人盯人稳。

**小结：** 把抽象反馈绑到每日会议证据上。

---

## 05 Anthropic 锁定与 PM 工作方式变样

**Peter Yang：** Mercury Insights——初创首选模型？

**Ryan Wiggins：** 过去三四年 OpenAI 主导，**最近季度批次明显转向 Anthropic**。用户忠诚度不高，但 **工作流深度集成** 带来锁定——我的第二大脑不好一键换 o1；早期选哪家模型会连锁影响企业许可。各家都在加速扩这种锁定。

**Peter Yang：** 产品团队构建方式变了吗？

**Ryan Wiggins：** 过去六个月研发速度明显加快。杠杆一：**原型**——`demo.mercury.com` 任何 PM/设计可改一次性前端，长 PRD 让位给可点 demo。杠杆二：**人人有 AI 数据分析师**。杠杆三：PM 有代码库权限，小 UI bug 自己改，找工程师时问题更具体。

**Peter Yang：** PM 会更有趣吗？

**Ryan Wiggins：** 总要有人对齐方向、保证交付；角色在变，从协调者更像创作者，但 **把事做完** 仍是核心。

**小结：** 原型 + 自助数据 + 少阻塞 = 新 PM 日常。

---

## 概念表

| 概念 | 一句话 |
|------|--------|
| 只读银行 MCP | Claude 里 OAuth 查账，安全与便携兼得 |
| 500 万字上下文层 | 五年公司知识本地索引，hooks 每问注入 |
| QMD 概念检索 | 搜「MCP 增长」命中战略文档而非字面匹配 |
| 多代理分析 | 一条指令跑讨论链出报告 |
| 工作流锁定 | 记忆+工具绑深，换模型成本高 |
| PM 原型优先 | demo 环境替代长篇书面规范 |

---

## 金句

- **Ryan：** 客户在哪，银行服务就在哪——2020 年代是 API 和对话界面。
- **Ryan：** MCP 是第三方应用生态，OpenAI 和 Anthropic 都押这条分发路。
- **Peter：** 你给它的上下文越多，流失可能性越小。
- **Ryan：** 产品经理不会消失，但从写文档变成更快原型、更少等人。

---

## 行动启示

- 金融产品：先 **API 覆盖率 + OAuth 体验**，再谈 MCP；只读 MCP 降低财务风险。
- 个人/高管：把 **战略文档 + 会议转录** 落成本地库，用概念索引而非全文塞上下文。
- 管理反馈：把绩效里的抽象项（「别太快给方案」）绑到 **日终会议复盘**。
- PM：用 **可点原型** 替代长 spec；用内部 **数据问答代理** 吃掉重复问数。

---

## 相关阅读

- [[Every增长主管-Codex成为知识工作的OS]] — 知识工作 OS、Notion KPI、复合审阅流
- [[Claude Code实战-构建一个AI数据分析师]] — 内部数据分析师原型路径
- [[Cowork负责人-揭秘Cowork与Mythos]] — MCP 与 Claude 连接器生态
- [[MOC - Harness Engineering]]

---

## 来源

- B 站：[BV1Tu9xBDEkt](https://www.bilibili.com/video/BV1Tu9xBDEkt/)
- 专栏：[cv48335142](https://www.bilibili.com/read/cv48335142/)
- 主源：`Recastory/workspace/bilibili-retranscribe/BV1Tu9xBDEkt/ingest/column_article.md`
