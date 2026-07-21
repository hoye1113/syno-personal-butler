---
title: "Claude Code 实战：鲜为人知的 Claude Code 工作流"
tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "mcp"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "mcp"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV1HwdjBHENb/"
description: "Greg × Amir：IdeaBrowser MCP 抽项目上下文 → Paper 反塑料感设计 → 终端接 Humbletics 跑无部署 A/B——代理即 CMS，自定义代码栈 + cron 自动化营销闭环，99% 企业还没用上这套套利。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code实战-鲜为人知的Claude Code工作流.md"
source_sha256: "09f8197e6e1d183c40bfeffc2d9382e7d70319806a40846789bb6e5ecf9825fb"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1HwdjBHENb/"
column_url: "https://www.bilibili.com/read/cv47912700/"
source_original_date: "2026-04-14"
host_name: "Greg Isenberg"
guest_name: "Amir"
guest_title: "Humbletics 联创 · 终端增长栈实践者"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1HwdjBHENb/ingest"
speaker: "Greg Isenberg / Amir"
duration: "35:23"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1HwdjBHENb/article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1HwdjBHENb/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article 对话标注 Host/Guest"
speaker_confidence: high
author:
  - "Amir"
concepts:
  - id: idea_browser_mcp
    zh: IdeaBrowser MCP
    en: IdeaBrowser MCP
    one_line: 把产品定义、ICP、增长策略抽成文件上下文，供 Claude Code 复用
  - id: paper_design_bridge
    zh: Paper 设计桥
    en: Paper
    one_line: 设计与代码双向同步的中间层，避免直接在代码里瞎迭代
  - id: agent_as_cms
    zh: 代理即 CMS
    en: agent as CMS
    one_line: 自定义代码站 + 云代码直推，让代理像管理员更新内容与实验
  - id: humbletics_ab
    zh: Humbletics 动态 A/B
    en: Humbletics dynamic A/B
    one_line: API 读滚动深度/跳出率，前端脚本注入变体，无需重新部署
  - id: keep_it_subtle
    zh: 保持微妙
    en: keep it subtle
    one_line: 约束动画与视觉改动的护栏词，比「改进设计」管用
  - id: terminal_work_surface
    zh: 终端工作界面
    en: terminal as work surface
    one_line: MCP 把 SaaS 接进命令行，操作密度高于 IDE 切 tab
---

# Claude Code 实战：鲜为人知的 Claude Code 工作流

**Host：** Greg Isenberg（Startup Ideas Podcast）  
**Guest：** Amir（Humbletics 联创 · 终端增长栈实践者）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `bilibili-retranscribe/BV1HwdjBHENb/ingest/column_article.md`  
**B 站转载：** [BV1HwdjBHENb](https://www.bilibili.com/video/BV1HwdjBHENb/) · **专栏：** [cv47912700](https://www.bilibili.com/read/cv47912700/)

---

## 开场：从想法到转化，别再做紫色随意编码页

Greg 再次请来 Amir。这集不是又一个「输入提示词一二三就赚钱」的教程——Amir 现场走通 **IdeaBrowser → Claude Code → Paper → Humbletics** 全链：B2B 销售陪练想法，货运软件垂直的潜在客户磁铁，Tailor Arc 组件，动态 A/B 标题，全程 mostly 在终端。

五章：**IdeaBrowser MCP 抽上下文** → **Paper 反 AI 塑料感** → **终端才是工作界面** → **代理即 CMS 与 cron 营销栈** → **Humbletics 无部署 A/B 与套利**。

**Greg Isenberg：** 到这集结束，听众会带走什么？

**Amir：** 三块：用新工具真做着陆页；用 Humbletics 做高转化实验；用 IdeaBrowser 攒够背景和规划，再验证、用 Paper  polish 设计、跑实验、看数据回来继续优化。到最后你会知道怎么把一个想法落地——设计要好看，不是随意编码那种紫页面——再用对的数据赚钱。

**Greg Isenberg：** 很多教程都承诺这个，最后给你一块紫得发慌的页。你没让我降级吧？

**Amir：** 没有。我们就开干。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 模型上下文协议 | MCP | 让 Claude Code 在终端里调外部工具/API |
| IdeaBrowser | IdeaBrowser | 管想法、ICP、增长策略的产品上下文库 |
| Paper | Paper | 设计↔代码双向同步的可视中间层 |
| Tailor Arc | Tailor Arc | 高品质 UI 组件库，可截图当风格参考 |
| Humbletics | Humbletics | 分析 + 热图 + A/B；Amir 自家，有 MCP/API |
| 潜在客户磁铁 | lead magnet | 换邮箱的干货 PDF/指南类着陆页 |
| 代理即 CMS | agent as CMS | 代理直接改代码库当内容管理员 |
| 保持微妙 | keep it subtle | 改 UI/动画时的约束词，防过度动效 |
| 转化优化代理 | CRO agent | 读数据、提假设、跑实验的自主营销代理 |

---

## 01 IdeaBrowser MCP：B2B 陪练想法到「五个扼杀交易的异议」

**Greg Isenberg：** IdeaBrowser 新出的 MCP 接 Claude Code——你现场怎么从想法走到潜在客户磁铁？

**Amir：** IdeaBrowser 刚加的功能我很爱：直接把 IdeaBrowser 接到 Claude Code 当 MCP。你们一直强调找对口想法再去做，缺的是跟踪业务怎么演化——把上下文和文档存好，日后回来能看：「对，这就是我当初的想法；ICP 是这么定的；现在帮我推什么、找哪些客户。」

今天早些时候我跟乔丹直播，挖到一个酷想法：**B2B 销售团队的 AI 陪练**——帮销售代表跟模拟客户练电话，实时反馈哪里讲得不好。我们快速搭了着陆页，塞了点数据开始跟踪。这集就在此基础上继续：完善信息、改文案和设计、用 Paper，再跑实验。

我们手上有产品定义和销售话术文件——目标客户、转型、产品价值、竞争定位。IdeaBrowser 里还有技能可以接着发展想法。我想用 **「潜在客户磁铁传奇」** 技能，做一个让人注册并完成流程的着陆页。

开终端，MCP 都连好了——IdeaBrowser、Paper 等等。我对 Claude Code 说：连 IdeaBrowser MCP，看我的 AI B2B 陪练项目，抽对上下文，用潜在客户磁铁技能做一个。

**Greg Isenberg：** 评论里会有人吐槽你打字不用语音——录播客怎么用 Whisper？

**Amir：** 我有 Whisper Flow，录播客没法用，忍一下。平时项目或会话开头我会用语音，而且很长；看要在终端敲多少上下文。工具我跟得上。

现在我们已经抽出项目上下文，文件里还有之前的增长策略。专门为这个想法做磁铁。项目是 **AI B2B 销售陪练**——你们有 **「活动连胜」**，业务可以持续演化。现在最大空白是：人人能建着陆页、人人都有想法，但**客户从哪来、怎么真的长大**？我们都试过随意编码那套。

**Greg Isenberg：** 我们都建过东西。想法和对的利基重要，但客户怎么给你信心继续？

**Amir：** 对。你们在这块做得很好——我不是硬广，我自己也在用 IdeaBrowser。用 Humbletics 时我最大痛点是想法很多，靠试错摸客户；早该有这套技能理解增长策略。它还会采访你问问题，我那天跟乔丹说太 impress 了——希望 Humbletics 也能针对某领域营销总监用某种话术。

回到 Claude Code。MCP 已连，磁铁建好了：**「五个扼杀货运软件交易的异议」**——我们把范围收窄到货运软件 vertical。它建议做 PDF 指南把干货给人。文件存好了，想法上下文也挂进项目。接着用 **着陆页架构师** 技能往下走。

> **金句 · Amir**
> **中文：** 人人能建着陆页，下一关是客户从哪来、业务怎么持续长大。
> **原文：** Everyone can create landing pages… the next blank is how do you actually get customers and grow it.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 模型上下文协议 | MCP | Claude Code 调 IdeaBrowser/Paper 等外部工具的桥 |
| 活动连胜 | campaign streak | IdeaBrowser 里跟踪业务迭代的连续上下文 |
| 潜在客户磁铁传奇 | Lead Magnet Legend skill | IdeaBrowser 内置技能，从项目上下文生成磁铁页 |
| 理想客户画像 | ICP | 目标客户是谁、痛点与定位 |

**本章小结**

- IdeaBrowser MCP 把 **产品定义 + 增长策略** 抽成文件，Claude Code 不再从零猜
- 垂直收窄（货运软件 × 销售异议）比泛 B2B 陪练更易做磁铁
- 想法对了不够，**获客与演化** 才是 IdeaBrowser「连胜」要解决的下一层

---

## 02 Paper + Tailor Arc：设计中间层，拒绝 AI 塑料感

**Greg Isenberg：** 很多人直接在 Claude Code 里建页就完事——你为什么非要 Paper？

**Amir：** 设计师以前在 Figma 做静态稿给工程。现在缺的一环是：很多人直接在代码里用 Claude Code 建着陆页、改来改去，**忘了在迭代什么**，也没法好好 polish。Paper 连 Claude Code，你在设计界面里构思、迭代，定方向再变成代码——以前大家跳过这步，直接在代码里硬怼。

Figma 最近也有双向 MCP，能设计转代码、代码转设计。Paper 我更喜欢——工具和界面体验对我更顺，效果也更好。

我们已捕获磁铁内容，加了着陆页架构师和产品说明。用 Paper 真建页面。跑起来时我说下怎么 polish：**别做出随意编码那种塑料感**。

我惯常给 Claude **现有设计的参考截图**——进喜欢的站，截屏，说：从这些页提取关键设计元素，帮我建设计系统。你现在看到的是我按参考图让 Claude 建的风格指南，以后新 section 或组件就说「参考设计风格指南」保持一致。

很多人觉得随意编码设计很烂——**我们演示这些全是 Claude 建的**，动画、组件都不糙。要做到，得通过 Paper polish，再给 **其他站或组件库的示例**。我常用 **Tailor Pro / Tailor Arc**，模块和插图质量高，装进来当参考。

Claude Code 正在 Paper 里一节一节建磁铁——Greg 你说这太酷了。我们让它建完着陆页，再用 Tailor Arc 把某块内容区改得更定制。

**Greg Isenberg：** Tailor Arc 我第一次听说。

**Amir：** 就是一个 UI 库，背后像独立开发者，风格很干净。向作者致敬——我是粉丝。装 Tailor 后可以直接用那些组件：截内容区那块图，说安装这个组件，回 Paper 界面用到这一部分。

Paper 的价值是 **试不同 layout 变体**——设计师可以直接改，不用每次再喊 Claude Code。我 polish 完的例子全在 Paper 里设计，再导入代码，或导出静态素材做广告缩略图。

改动画时我 copy Humbletics 站上一个 **微妙动画** 的组件，回终端说：加这个 section，**动画保持微妙**——永远不要 over-animate。代理对 **约束和护栏** 很敏感：你说「改进设计」太宽；说「完善设计，布局主题一致，**保持足够微妙**，整页要有凝聚力」——效果好一个量级。

**Greg Isenberg：** 保持微妙，笨蛋。

**Amir：** 对。完成后我让它改代码、推送，告诉我 URL 路由，在主页加潜在客户磁铁 section。今天早些时候跟乔丹直播做了 hero，现在做磁铁页推上去，再看分析什么带来转化。推送完去指南页——section 都上线了。

我 copy Humbletics 里一张 **分析查询卡片** 组件，说：基于这个改，加实体动画切换。很多人有一个组件就能变出整页风格——关键是 **基于现有组件修改**，不是从零描述「要现代感」。

**Greg Isenberg：** 大家别指望提示词一二三就完事——你说可能要花 **几个小时**？观众会觉得「为什么 Amir 做就好看」？

**Amir：** 要很多时间。2017 年的我可能要一个月；现在你说「很多时间」他还会愣。有组件库帮很大忙，但 ** polish 每个 block** 仍得回来用 Tailor Arc 这类参考逐个改。仍要 **时间、品味、技巧**——知道该做什么、怎么给代理方向。品味是我们一直在谈的核心。这集我们只用了大约 **30 分钟** demo；有对组件和方向，你可以研究最好组件当样式参考再改进。

> **金句 · Amir**
> **中文：** 别说「改进设计」——说「保持微妙」，页面才有凝聚力。
> **原文：** Keep it subtle — that's the constraint that makes the whole page cohesive.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Paper | Paper | 设计↔代码双向 MCP 中间层 |
| Tailor Arc | Tailor Arc | 可安装的高质量 UI 模块库 |
| 设计系统 | design system | 从参考站提取的字体/间距/组件规则 |
| 保持微妙 | keep it subtle | 动画/UI 改动的刻意约束词 |

**本章小结**

- Paper = **缺失的设计步**，不是多此一举；变体/layout 在设计层试更快
- 参考截图 + Tailor Arc 组件 + 风格指南 →  beat 99% 随意编码页
- **「保持微妙」** 是比「改进设计」更有效的代理护栏

---

## 03 终端才是工作界面，代理将比人类更常访问网站

**Greg Isenberg：** Tailor Arc、IdeaBrowser、MCP 连在一起——像软件未来的缩影。工作就在终端里？

**Amir：** 你说对了。**终端正在成为工作的界面，一切的界面。** 第一集我们聊过这个——我那时说 Cursor 是工作界面，是错的。**现在是终端。** 我们早说 Markdown 会成为主流，工作都在终端里完成——当时别人觉得我们疯了。

今天还是可能觉得疯。另一个信号：网站开始建 **Markdown 页** 方便代理读；有人给代理 **钱包、邮箱、收件箱**——演变快得离谱。

我有一个判断：**未来访问网站的代理会比人类多。**

**Greg Isenberg：** 我百分之百信。Gartner 说到 2030 年互联网 **20% 商业活动由代理完成**——代理在买东西。一个人可以跑多个终端、多个代理，代表同一个人——乘数效应。还有人说该对 AI/代理 **征税**，像雇人要工资税。

**Amir：** 个体现在可以有一支 **代理大军** 干活，收入和产出都被放大。税单里哪天出现「代理税」、要你列拥有多少代理，我都不会意外。

网站越来越多做成 **对代理友好**。Cloudflare 有 Firecrawl 端点让代理抓数据。我们最初用 Webflow 建站，迁到 Framer，现在 **全自定义代码**。为什么？我们要 **用代理当 CMS**——云代码直接更新 CMS，别的工具快速发布改动、跑测试，代理和 MCP 都能访问。Webflow、Framer 也能做点，但不像自定义代码那么开放——代理要当管理员，就得能读 repo、推代码、挂 cron。这就是背后的思考过程。

> **金句 · Amir**
> **中文：** 终端是工作的界面——不是 IDE，不是 Cursor tab 切来切去。
> **原文：** The terminal is becoming the interface for work — everything's interface.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 终端工作界面 | terminal as work surface | MCP 把 SaaS 接进 CLI，高密度操作 |
| 代理友好网站 | agent-friendly site | 可抓取、可编程更新，非闭源 CMS 黑盒 |
| Firecrawl | Firecrawl | 供代理抓取站点内容的端点/服务 |
| 代理流量 | agent traffic | 未来访问量中代理占比将超人类 |

**本章小结**

- Amir 修正第一集：**Cursor → 终端** 才是界面赌注
- **代理 > 人类** 访问 Web 是产品架构前提，不是远未来
- 自定义代码 = **对代理开放**，Webflow/Framer 不够可编程

---

## 04 代理即 CMS：cron、付费媒体经理与 CRO 闭环

**Greg Isenberg：** 磁铁页推上去之后，营销栈怎么自动跑？

**Amir：** 等设计 polish 完，装分析——点跟踪、表单提交、跑实验：改标题会怎样、什么提高表单提交。Humbletics 我们在建 **自主 CRO 代理**，技能 + MCP 直连分析、实验工具和营销站——所以必须迁出自 Webflow。

还有 Google Ads：怎么按现有 campaign **快速建多个个性化着陆子页**？五个 ad group 就五个 personalized 页，每个还要 A/B 标题和 layout。**自定义代码 + 云代码** 极快；Framer/Webflow 要手动建页、建 section、再回来改——核心论点：**网站未来是自定义代码，代理就是 CMS。** 可以 cron 自动化——云代码支持 scheduled task，我们 **每周** 跑固定任务。

Google Ads API 直连云端；三个 **付费媒体经理** 代理从 Meta/Google 拉数据；一个 **CRO 优化器** 跑 A/B；**漏斗报告** 连 Stripe、ChartMogul 等。Humbletics 访问端点给建议，用 Firecrawl 抓页、Claude 跑实验、管结果——我们活在能做到这点的世界。

**Greg Isenberg：** IdeaBrowser 可以把 weekly 报告上下文存回去——乔丹说现在能做到了。有复合上下文，增长才 compound，才能在竞争里拉开。

**Amir：** 对。我们也在 Obsidian 记 **主性能日志**：A/B 结果、赚了多少钱、该改什么——回到这个上下文继续。主页上 maybe 再跑 A/B 提高点击率。磁铁页 polish 完会装点击跟踪、表单提交分析；Google Ads 痛点 campaign 下五个 ad group 就五个 personalized 子页——这在 Webflow 里要手动 duplicate section，在代码栈里 Claude 几分钟批量生成。

> **金句 · Amir**
> **中文：** 网站的未来是自定义代码；代理就是你的 CMS。
> **原文：** The future of websites is custom code, and the agent is the CMS.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理即 CMS | agent as CMS | 代理改 repo、推部署，替代 Webflow 后台 |
| 定时任务 | cron / scheduled task | 云代码每周自动拉广告数据、更新页 |
| CRO 代理 | CRO agent | 读分析 → 假设 → 实验 → 报告的自主环 |
| 付费媒体经理 | paid media manager agent | 从 Meta/Google 拉 campaign 数据的子代理 |

**本章小结**

- **多子代理分工**（Ads / CRO / 漏斗）+ MCP 工具链 = 营销「软件工厂」
- IdeaBrowser + Obsidian **双写上下文**，weekly 报告 compound 增长判断
- 闭源 CMS 挡在 API/MCP 外，迁自定义代码是结构性选择

---

## 05 Humbletics 无部署 A/B：动态注入标题与套利窗口

**Greg Isenberg：** 现场跑 A/B——你们有专门 skill？

**Amir：** 有，稍后分享链接——组合分析、跑实验、拿建议。端点给代理：抓站、结合 Humbletics 和 IdeaBrowser 数据，出详细报告——该测哪个着陆内容、什么标题。

现场复制 API 指示，让 Claude 建 A/B：**「无需代码」类标题**，看建议变体。分析说平均滚动深度 **40%**，跳出率 **25%**——对照组、变体文案都列出来。回实验界面 **直接跑 A/B**——疯的是 **没部署任何代码**：脚本 **动态更新** 站内容，不用找开发「能不能推新页」。

用 Humbletics 建 API key，拿属性详情和云端访问指示——访问来源、渠道、付费广告 **完整归因**，热图看 **滚动深度、点击分布、首屏体验**，漏斗看从主页到指南每一步。刷新几次看流量分配——变体标题：「每一笔失败的交易都始于销售代表没准备好的异议。」Greg 说还不错。点进变体再回对照组，分配正常。转化率进展实时跟——还早，数据不多，但能看到点哪、测得怎样。我们 demo 里还犯过错：删了表单又补回来——代理栈也要人盯护栏。我不知道还有谁在 **不部署代码** 的情况下这么做。

这套栈——**构思 → Paper polish → 分析 → 优化**——营销人用上会势不可挡。我们大规模跑 Meta/Google，连归因、建个性化页、看哪个赚钱。也可以 **当服务卖**：企业愿意每月 **5 千、1 万、2 万美元** 问能不能帮他们跑——连 Meta/Google 拿完整收入归因，问漏斗顶该投哪，几乎变成 **托管服务**。

**Greg Isenberg：** 从 IdeaBrowser 一个想法到现在有上下文、设计、着陆页、实验——活在这个时代太棒。我从没见过有人这么快走完全链。脑子里全是 **套利**：70 亿人上网、信用卡绑着。像 Facebook 广告刚出 CPC **5 美分** 那种窗口——现在 **99.999% 的人不知道这套栈**。正确工具 + 方法 + 百万上下文令牌的终端，机会无限。

**Amir：** 谢谢邀请。

> **金句 · Amir（封底）**
> **中文：** 掌握构思—设计—分析—优化全栈的人，可以向企业收每月五位数当托管服务。
> **原文：** If you're a marketer on this stack, you'll be unstoppable — clients already pay $5k–$10k/month for us to run it.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 动态 A/B | dynamic A/B injection | 前端脚本改标题/块，无需 redeploy |
| 滚动深度 | scroll depth | 热图/分析指标，CRO 代理读的信号 |
| 托管增长服务 | managed growth service | 用代理栈替企业跑 Ads+CRO 的月费模式 |
| 技术栈套利 | stack arbitrage | 99% 企业仍手工营销，先行者收 productivity delta |

**本章小结**

- Humbletics API + Claude skill → **无部署实验**，缩短营销迭代周期
- 全链 **IdeaBrowser → Paper → 自定义站 → Humbletics** 可产品化为托管服务
- **信息差窗口**类似早期 Facebook Ads——知道栈的人极少

---

## 总结：终端 MCP 栈 = 想法到转化的闭环机器

| 维度 | 要点 |
|------|------|
| 上下文 | IdeaBrowser MCP 抽 ICP/话术/增长策略，技能生成垂直磁铁 |
| 设计 | Paper + 参考截图 + Tailor Arc；**keep it subtle** 约束动画 |
| 界面 | 终端 + MCP 接 SaaS；代理流量将超人类 → 站点要 agent-friendly |
| 架构 | **代理即 CMS**：自定义代码、cron、多子代理分工营销栈 |
| 实验 | Humbletics 动态 A/B，无 redeploy；上下文回写 IdeaBrowser/Obsidian |
| 商业 | 托管服务 $5k–$10k+/月；99%+ 企业尚未采用 → 套利窗口 |

### 对个人的启示

别在对话框里 isolated 建紫页——**先 IdeaBrowser 定上下文**，Paper polish 再推代码。给代理 **窄约束**（保持微妙、参考组件 X）比宽指令有效。终端里串 MCP，一条会话走完设计—部署—实验。

### 对团队/产品的启示

**代理即 CMS** 与 [[Anthropic CPO-Claude团队为什么迭代这么快]] 里「快迭代」同向——闭源 CMS 挡 MCP 就得迁代码库。MCP 工具链（IdeaBrowser / Paper / Humbletics）是 **Harness 上层营销工种**实例，可与 [[Claude Code实战-用AI实现生活自动化]] 里生活自动化栈对照：一个偏 CRO/增长，一个偏个人 workflow。

### 仍待验证

- Gartner **2030 20% 代理商业活动** 为引用口径，非 Amir 一手数据
- Amir 口播 **30 分钟** 出页为 demo 压缩；polish 仍须数小时
- 「代理税」为推演，无现行政策

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 05:12 | 终端 + MCP 为核心工作界面 |
| 08:45 | Paper 反 AI 塑料感、Tailor Arc |
| 14:20 | 代理即 CMS、迁出自 Webflow |
| 22:15 | Humbletics 动态 A/B、无部署实验 |
| 28:30 | 技术栈套利与托管服务 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1HwdjBHENb/ingest`
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV1HwdjBHENb/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv47912700/
- **B 站**：https://www.bilibili.com/video/BV1HwdjBHENb/
- **时长**：35:23（2123s · metadata.json）
- **原视频日期**：2026-04-14

### 相关阅读

- [[Claude Code实战-用AI实现生活自动化]] — Claude Code 个人自动化 workflow，与本篇 **终端 MCP 增长栈** 对照  
- [[Anthropic CPO-Claude团队为什么迭代这么快]] — 组织级快迭代；本篇 **代理即 CMS** 是营销侧同样逻辑  
- [[Claude Code实战-Gstack把AI变成团队]] — 另一套 Claude Code 角色化 Harness（工程 vs 营销）  
- [[OpenClaw创始人-我是如何使用OpenClaw的]] — 终端/CLI 高密度操作与 IM 驱动 agent  
- [[MOC - Harness Engineering]] — Harness 横切索引  

### 收录说明

- **视频**：[BV1HwdjBHENb](https://www.bilibili.com/video/BV1HwdjBHENb/)（B 站 *Easonlee的AI笔记*）  
- **Host / Guest**：Greg Isenberg × Amir  
- **版本**：canonical Host-Guest v3.2（S 级 · 专栏主源 `column_article.md`）
