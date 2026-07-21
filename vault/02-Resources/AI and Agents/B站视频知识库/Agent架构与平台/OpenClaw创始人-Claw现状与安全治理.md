---
title: "OpenClaw 创始人：Claw 现状与安全治理"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_safety", "harness_engineering", "memory", "openai"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_safety", "harness_engineering", "memory", "openai"]
created: "2026-07-07"
source: "B站视频 - Easonlee的AI笔记"
description: "Peter Steinberger：GitHub 最快增长与 1142 条安全公告；致命三重奏；AI CVE 噪声与 sudo 研究员；基金会治理；OpenAI 未收购；10 并发会话与做梦记忆；品味、说不与反黑暗工厂。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenClaw创始人-Claw现状与安全治理.md"
source_sha256: "f407b599fc58b239c4f612a979559e0e26948a6ebcd4bbb967808fa93b719998"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1NiooB5ESW/"
column_url: "https://www.bilibili.com/read/cv48198183/"
host_name: "swyx"
guest_name: "Peter Steinberger"
guest_title: "OpenClaw 创始人 · OpenAI"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1NiooB5ESW/ingest"
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1NiooB5ESW/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1NiooB5ESW/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article S-tier + AI Engineer 现场 Q&A"
speaker_confidence: high
duration: "44:12"
saved: 2026-07-07
updated: 2026-07-07
concepts:
  - id: lethal_triad
    zh: 致命三重奏
    en: lethal triad
    one_line: 访问数据 + 不可信内容 + 通信能力 → 风险指数级
  - id: ai_cve_noise
    zh: AI 安全报告噪声
    en: AI-generated security advisory noise
    one_line: 每天十余条「关键」建议，99% 需人脑筛，客气道歉像 AI 写的
  - id: openclaw_foundation
    zh: OpenClaw 基金会
    en: OpenClaw foundation governance
    one_line: 多方大厂贡献者降巴士因子，保持开放与多模型
  - id: dreaming_memory
    zh: 做梦记忆
    en: dreaming / session GC
    one_line: 后台遍历会话日志，短期记忆转长期维基
  - id: taste_and_no
    zh: 品味与说不
    en: taste and saying no
    one_line: 防局部最优代码堆；疯狂想法一个 prompt 就能做，协调才是难
author:
  - "[[Peter Steinberger]]"
  - "[[swyx]]"
---

# OpenClaw 创始人：Claw 现状与安全治理

**Host：** swyx（AI Engineer 现场 Q&A；前半为 Peter 主题演讲）  
**Guest：** Peter Steinberger（OpenClaw 创始人）  
**形态：** Host-Guest v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV1NiooB5ESW](https://www.bilibili.com/video/BV1NiooB5ESW/) · **时长** ~44 min · **专栏** [cv48198183](https://www.bilibili.com/read/cv48198183/)

---

## 开场

OpenClaw 五个月长成 GitHub 增长最快的软件项目——Peter 叫它「脱衣舞娘杆式」直线上升：约 3 万 commit、近 2000 贡献者、快 3 万 PR。现场三四成听众在跑 OpenClaw。这期核心不是功能清单，而是 **AI 时代 Agent 安全**、**开源治理**、**并发编码工作流** 和 **工程师还剩什么护城河**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 致命三重奏 | lethal triad | 数据访问 + 不可信输入 + 对外通信 |
| 做梦 | dreaming | 像睡眠 GC，会话日志转长期记忆 |
| Prompt Request | prompt request vs PR | 用提示迭代而非瀑布式定稿 |
| 巴士因子 | bus factor | 个人英雄主义项目的单点风险 |

---

## 01 爆发增长与基金会：从个人到「军队」

**Peter Steinberger：** 五个月了，星标最多、提交斜率还在涨。我加入 OpenAI，同时打 **OpenClaw 基金会** 两份工——基金会像困难模式开公司，志愿者没法指挥。目标：**降巴士因子**，让英伟达、微软、红帽、腾讯、字节等进来写代码；中国大陆用户群最大。文森特等人上台会继续讲治理进展。

**小结：** 速度保留，治理必须跟上 Linux 式多方协作。

---

## 02 安全海啸：1142 条建议与 AI 挖洞

**Peter Steinberger：** 我被 Security Advisories **DDoS** 了：累计 **1142** 条，日均约 **16.6** 条，**99% 标关键**，发了约 **469** 个补丁。对比 Linux 内核每天八九条、curl 历史共 600 条——我们两倍还多。规律：**叫得越凶、标得越关键，越像针对 Agent 项目的表演性漏洞**。

AI 找洞极强：英伟达 Nemo Claw 周日邀我测，接 Codec Security，**半小时四五种破沙箱**。网络安全模型比公众模型聪明得多——危险。

举例 CVSS 10 分：未发布 iPhone 同步 App 只读权限可写——典型场景是 **自己机器上的个人网关**，99% 只访问自己的网关。我错在想做宽松权限模型，但 **CVSS 不看真实用例**。

还有供应链（Teams/Slack 间接依赖 Axios）、国家背景「幽灵爪」假 NBN 包、比利时把「恶意网站链接触发本地网关 token」当灾难——**默认推荐设置下外部网站碰不到 token**，除非你故意对抗文档用 Claude Code 乱配。

> **金句：** 任何能访问你的数据、接触不可信内容、还能通信的系统都有风险——越强大，你越得知道它在干什么。

**小结：** 真风险在「三重奏」组合，不在标题党 CVE 分数。

---

## 03 声望研究与 AI 垃圾报告

**Peter Steinberger：** 大量建议是 **AI 代理生成**的，你还得用脑读——不能完全交给代理修。信号：**太客气、会道歉** 的多半是 AI；安全圈的人通常不道歉。大学论文《混乱的代理人》四页解剖 OpenClaw，**不提我们的安全安装页**——提了故事就不好讲。

有人承认在 **sudo 模式** 跑 Agent「要最大权限」——对抗自己的安全设计，报告里却不写。维护负担：ffmpeg 等老牌项目也在骂低质量修复。仓促合并 AI 补丁会 **毁掉产品**。

**小结：** 开源维护的新工种 = 辨伪 + 拒合并劣质修复。

---

## 04 OpenAI、开源与数据所有权

**swyx：** 「CloseClaw」担忧？OpenAI 会闭源吗？

**Peter Steinberger：** 我没想过这词。OpenAI 在变好——Codex 开源、Symfony 编排层。他们懂：**OpenClaw 必须开放、多模型**；人家里玩了 OpenClaw 回公司会问「为啥上班没 AI」。大厂要的是托管服务，不是吞掉项目。我从英伟达、微软、Telegram、Salesforce、腾讯、字节、阿里、Minimax、Kimi 拉人；OpenAI 也给资源，但我不想被单一接管。

**Peter Steinberger：** 建 OpenClaw  partly 因为大厂 Gmail 插件 = 他们读你全部邮件。个人代理可 **绕开信息孤岛**——消费者点网页就能自动化，初创接 Gmail 可能要半年。

**小结：** 开放 + 自托管 = 数据所有权；商业化在托管层。

---

## 05 十窗并发、黑暗工厂与做梦

**swyx：** 那张十会话截图？黑暗工厂不审代码行吗？

**Peter Steinberger：** Codex 5.0/5.1 慢时我开近 **10 个会话**；现在快模式大概 **五六个**。这是权宜之计，等 token 更快就不需要。我 **不信黑暗工厂**——上山的路是弯的，瀑布模型定死做不出好软件；PR 也不能自动合并，AI 不知道产品该往哪拉。

**做梦（Dreaming）：** 像人睡觉做 GC——遍历会话日志，短期记忆转长期，丢垃圾。Anthropic 源码泄露显示他们也在研究。OpenClaw 正把意大利面代码改成 **全插件架构**：可换内存、加维基、加做梦，不必什么都 PR 进主线。

**小结：** 高并发是等速度的中间态；记忆需要离线整理层。

---

## 06 品味、灵魂 MD 与工程师该练什么

**swyx：** 什么是品味？

**Peter Steinberger：** 最低级是 **「AI 味」**——左边彩条、紫色渐变、一股生成感。高级是 WhatsApp 上 Claw  **像人发短信**（少句号、会嘲讽），这些高级 prompt 给不出。2023 我们按搜索框重做 ChatGPT；代理时代要 **灵魂 System Prompt**，我开源了写法。

**Peter Steinberger：** 护城河是 **品味 + 系统设计 + 说不**。疯狂想法一个 prompt 就能做，难的是无数想法 **如何协调**；局部 patch 堆成不可维护系统——要给代理宏观提示：「去看看那边怎么相互作用。」

**Peter Steinberger：** 工程师技能：**系统设计**仍关键；**说不**越来越重要；别当提示词搬运工。

**小结：** 代码便宜了，判断什么不该做变贵。

---

## 概念表

| 概念 | 一句话 |
|------|--------|
| 致命三重奏 | 数据 + 不可信内容 + 通信 → Agent 系统性风险 |
| AI CVE 噪声 | 海量「关键」公告，维护者时间被吞噬 |
| 基金会治理 | 降巴士因子，多厂贡献，保持开放 |
| 做梦记忆 | 会话日志后台 GC → 长期维基 |
| 品味 | 反 AI 味 + 场景化个性 + 宏观一致 |
| 说不 | 拒绝破坏系统一致性的「一个 prompt 就能做」 |

---

## 金句

- **Peter：** 默认不安全不可接受，但读安全文档的人可以用得很好。
- **Peter：** 上山没有直线；你对产品的最初想法很少是最终样子。
- **Peter：** 疯狂中带一点科幻——这项目不可能出自美国大厂法务过关之前。
- **Peter：** 信任要随时间建立——Tobi 式声誉系统可能是提示注入解法之一。

---

## 行动启示

- 个人 Agent：**别扔群聊**；团队 Agent 只持团队权限数据；个人 Agent 只和你对话。
- 维护者：把 **真实部署场景** 写进文档；对 AI 生成的 Security Advisory 设 **吞吐上限与自动关闭规则**。
- 工作流：并发会话是 **等模型变快** 的临时方案；保留人审与品味闸门，别迷信黑暗工厂。
- 记忆：考虑 **离线「做梦」任务** 整理会话，而非无限堆上下文。

---

## 相关阅读

- [[OpenClaw创始人-我是如何使用OpenClaw的]] — 个人日常使用与反 orchestrator
- [[Cloudflare专家-Sandbox确保AI代码安全]] — Agent 沙箱与供应链
- [[30分钟精通OpenClaw]] — 安装与基础配置
- [[MOC - Harness Engineering]]

---

## 来源

- B 站：[BV1NiooB5ESW](https://www.bilibili.com/video/BV1NiooB5ESW/)
- 专栏：[cv48198183](https://www.bilibili.com/read/cv48198183/)
- 主源：`Recastory/workspace/bilibili-retranscribe/BV1NiooB5ESW/ingest/column_article.md`
