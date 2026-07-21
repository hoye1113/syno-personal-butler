---
title: "Claude Code之父：编程已被解决 接下来的发展"
tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "claude", "anthropic", "loop_engineering", "ai_career"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "claude", "anthropic", "loop_engineering", "ai_career"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Lauren Reeder × Boris Cherny：Claude Code 从 Product Overhang 到 Opus 4 指数增长；编码 100% 代理化、闪电循环/例程、七种力量下 switching cost 变薄、印刷术类比软件民主化、Anthropic 组织流程领先于模型差距。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code之父-编程已被解决接下来发展.md"
source_sha256: "f3249d9e74fd67571b1c9841a97382bb8a742a47446fe94302aa1b296f364f83"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV19V5t6ME6c/"
duration: "24:39"
saved: 2026-07-06
updated: 2026-07-06
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV19V5t6ME6c/ingest"
column_url: "https://www.bilibili.com/read/cv48902706/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV19V5t6ME6c/ingest/column_article.md"
source_original_date: "2026-05-05"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Lauren Reeder"
guest_name: "Boris Cherny"
guest_title: "Anthropic Claude Code 创始人"
speaker_inference: "column_article S-tier 明确标注 Host/Guest"
speaker_confidence: high
author:
  - "[[Lauren Reeder]]"
  - "[[Boris Cherny]]"
concepts:
  - id: product_overhang
    zh: 产品悬置
    en: Product Overhang
    one_line: 模型能做但产品还没接住的能力缺口
  - id: lightning_loops
    zh: 闪电循环
    en: Lightning Loops
    one_line: Cron 驱动的重复代理任务，CI 修复、反馈分类等
  - id: seven_powers
    zh: 七种力量
    en: 7 Powers
    one_line: 商业护城河框架；转换成本贬值，网络效应仍硬
  - id: cross_disciplinary_generalist
    zh: 跨学科通才
    en: cross-disciplinary generalist
    one_line: PM/设计/财务都写代码，领域专家 + 代理杠杆
  - id: org_process_moat
    zh: 组织流程护城河
    en: organizational process moat
    one_line: 领先不在秘密模型，在全员 AI 原生流程重构
---

# Claude Code 之父：编程已被解决，接下来拼什么

**Host：** Lauren Reeder  
**Guest：** Boris Cherny（Anthropic Claude Code 创始人）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV19V5t6ME6c](https://www.bilibili.com/video/BV19V5t6ME6c/) · **时长** ~25 min · **专栏** [cv48902706](https://www.bilibili.com/read/cv48902706/)

---

## 开场

现场一半人举手在用 Claude Code，另一半可能被团队调侃有「Claude Code 精神病」——Boris Cherny 就是把这个产品从 Anthropic Labs 孵化器里推出来的人。他去年基本没亲手写过一行代码，却创下 **一天 150 个 PR** 的记录；Claude Code 代码库 **100% 由 Claude Code 自己写**。

这期要压五件事：**编码算不算已解决**？**循环和例程**怎么把代理变成数字员工？**七种力量**下 SaaS 护城河还剩什么？软件会不会像 **发短信** 一样人人会写？以及 Anthropic 跟外界的真正差距，到底在 **模型** 还是 **组织**？

**Lauren Reeder：** 谢谢你抽时间，Boris。整个软件开发领域都盯着你在做什么。我想从 Claude Code 怎么开始的聊起，再开放观众提问——大家现在开始想问题。

**Boris Cherny：** 好。先问一句：在座 mainly 用 CLI 还是桌面版？IDE 插件？——哦，不少人最近用 iOS。Cool。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 产品悬置 | Product Overhang | 模型能力超前，产品还没接住的空档 |
| 预 PMF | pre-PMF | 为下一代模型提前 six 个月造产品 |
| 闪电循环 | Lightning Loops | Cron 定时重复跑代理：修 CI、抓 Twitter 反馈 |
| 例程 | routines | 服务器端循环，关电脑也继续跑 |
| 子代理 | sub-agents | 主会话派出去并行干活的代理 |
| 七种力量 | 7 Powers | 汉密尔顿商业护城河框架 |
| 转换成本 | switching cost | 换平台/迁代码的摩擦；AI 正在打薄 |
| 流程能力 | process power | 以复杂工作流为护城河；Claude 4.7 在削弱 |
| 通才 | generalist | 跨 iOS/Web/后端；未来跨工程/设计/产品 |

---

## 01 从 Tab 补全到「编码已解决」[04:15]

**Lauren Reeder：** 你公开说过 **编码问题已经解决了**。Anthropic 最好的三个问题之一——你具体指什么？还有什么没解决？

**Boris Cherny：** 先摸底：谁 **100% 手写** 代码？谁 **100% 代理写**？谁中间态？

（约一半举手中间态。）

对我来说，**Claude Code 仓库 100% 是代理写的**——已经泄露了，没什么秘密：就是 TypeScript + React。我们选这套栈，因为 **符合模型的训练分布**。2024 年末开工时模型还没今天这么聪明，语言框架选型很重要；现在它能学新语言新框架，但当时得押在分布内的栈上。我们 **去年 10、11 月** 左右就达到模型能写满整个 repo 的程度。今天我 **100% 代码是 Claude Code 写的**，每天几十个 PR；上周有一天试了试极限——**150 个 PR**，创个人记录。

但这 **不是普遍情况**。庞大复杂代码库、冷门语言，模型还吃力。老答案：**等下一个模型**。

**Lauren Reeder：** Claude Code 怎么从 0 到 1 的？你 2024 年末加入，之前在 YC、写过 TypeScript 教材——去年一整年几乎没手写代码，变化很大。

**Boris Cherny：** 很多是 **偶然**。2024 年末我加入 **Anthropic Labs** 孵化器——同一批人做了 Claude Code、MCP、桌面 App，几个人像创新小队，想建什么建什么。后来团队解散又重组，Mike Krieger（Instagram 联创，现 CPO）在带第二轮。

我开始做编码产品，是因为我们感到 **Product Overhang**：模型能做很多事，但 **没有产品接住**。当时最先进的是 **Type Ahead**——IDE 里 Tab 补全 **一行**。Sonnet 3.5 首次做到。我们觉得可以更远：**让代理写所有代码**。

我造了它，但 **头六个月几乎不好用**——我自己大概只用它写 **10%** 代码。最初发布也没爆。真正 **指数增长从 Opus 4 开始**（大约 2025 年 5 月），之后每个模型版本一换，曲线又抬一档：4 → 4.5 → 4.6 → 4.7。

整个过程是 **预 PMF** 的——我们知道 **六个月内不会有 PMF**，因为我们在 **为下一个模型** 构建。Anthropic 一直聚焦商业、企业、安全、编码；某个时间点我们知道要做编码产品，只是不知道何时——Claude Code 就是答案，而且 **故事本身像意外**。

> **金句 · Boris**
> **中文：** 我们是在为六个月后的模型造产品——编码问题对我们是去年秋天就解决了，对很多人还在路上。
> **原文：** We were building for the next model — for us coding was solved around last fall; for many it's still on the way.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 产品悬置 | Product Overhang | 能力在模型侧，产品侧还没落地 |
| 分布内栈 | in-distribution stack | 选 TS/React 因训练数据里够多，模型更稳 |
| 预 PMF | pre-PMF | 接受短期不好用，赌模型迭代 |
| Type Ahead | Type Ahead | Tab 补全一行，代理时代前的 SOTA |

**本章小结**

- 「编码已解决」= **特定栈 + 特定团队** 可达 100% 代理编写，非全行业普适
- Claude Code 拐点在 **Opus 4**，不是首发——产品领先模型半步是设计选择
- 冷门语言与巨型 legacy repo 仍是「等下一版模型」区

---

## 02 闪电循环、例程与跨学科通才 [06:42]

**Lauren Reeder：** 讲讲你的 **个人设置**——你之前在 Twitter 分享过，听起来已经很疯了，而且又变了。

**Boris Cherny：** 六个月前我在 Twitter 晒设置，当时没意识到大家会惊——那对我只是平常编码方式。现在 **大部分工作用手机**：Claude App 里有个 **Code** 标签，同时开 **5–10 个会话**，每个会话里很多 **子代理**——此刻大概 **几百个代理在跑**，每晚 **几千个** 处理更深层任务。

管理方式两种：一是让 Claude **调一堆子代理**；二是 **循环（loops）**——我越来越多用 **闪电循环**。超酷，简单有效：用 **Cron** 安排 **重复任务**——每分钟、五分钟、每天。我现在跑着 **几十个循环**：一个盯 PR、**自动 rebase、修 CI**；一个维持 CI 健康、修 flaky test；一个 **每 30 分钟** 从 Twitter 拉反馈并分类。我觉得 **循环是未来**，强烈推荐。我们最近还推了 **例程（routines）**——原理一样，但在 **服务器** 跑，**合上电脑也继续**。

**Lauren Reeder：** 那 **未来团队** 长什么样？大家怎么协作、共享上下文？要释放更多代理吗？

**Boris Cherny：** 预测很难，我试试。大趋势：**通才会比现在多得多**。今天说通才，多半指工程师——iOS、Web、后端都能搞。未来会有 **跨学科通才**：工程强，**设计、数据科学、产品规划** 同样行。我们 Claude Code 团队就是这样——**工程经理、PM、设计师、数据科学家、财务、用户研究** 每个人都写代码。他们是各自领域专家，但现在 **人人 coding**。我看到有人在点头——你们也看到同样趋势了吧。

> **金句 · Boris**
> **中文：** 循环是最酷的东西——简单、有效，让 Claude 自己 Cron 未来该干的事。
> **原文：** Loops are the coolest thing — simple, effective, let Claude cron its own future work.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 闪电循环 | Lightning Loops | 用户侧 Cron 重复代理任务 |
| 例程 | routines | 云端持久循环，不依赖本机在线 |
| 子代理 | sub-agents | 主会话 fork 出去并行执行 |
| 跨学科通才 | cross-disciplinary generalist | 领域专家 + 人人会写代码 |

**本章小结**

- Boris 工作流：**手机多会话 × 数百并行代理 × 几十个 Cron 循环**
- **例程** 把「数字员工」从本机解放到服务器——关盖继续跑
- 团队形态：职能边界模糊，**编码成为全员基础动作** 而非工程师专利

---

## 03 七种力量、SaaS 叙事与 10 倍创业潮 [09:55]

**Lauren Reeder：** 编码成本降 **10 倍甚至 100 倍**，软件产品价值怎么变？我们在 **SaaS 末日** 吗？

**Boris Cherny：** 「SaaS 末日」是我最爱的话题。会发生 **两件事**，都不是网上常聊的那种。

第一，**《Acquired》** 听众？（不少举手。）上周刚录 Unplugged，见到偶像了。他们聊 **7 Powers**——汉密尔顿那本书，商业 **七种护城河**。AI 会让 **一些更重要、一些更弱**。例如 **转换成本** 变弱——模型能帮你 **从一个平台迁到另一个**。**流程能力** 也在被削弱——以复杂工作流为护城河的公司，Claude **4.7** 特别强：给目标让它迭代， **第一个我觉得真能这样的模型**。但 **网络效应、规模经济、垄断资源** 这些 **传统护城河不变**。

第二，回顾过去十年创业潮——我认为 **未来十年能颠覆行业的创业公司数量会多 10 倍**。小公司现在能做出和大公司一样有价值的产品、 **正面竞争**。大公司要改流程、重训员工、动组织—— **内部阻力巨大**。初创 **从零 AI 原生**，没有包袱。所以 **现在是最好建设、最好创业的时候**，颠覆会很多。

**Lauren Reeder：** 还有希望。开放观众提问——丹，请讲。

**Dan（观众）：** 你们 **PMF 前开发了六个月**。现在模型够强了——Claude Code 成功靠 **模型** 还是 **产品决策**？

**Boris Cherny：** **两者结合**。一年前问我可能是 **50/50**；两年后？不好说——我们通常只计划 **一周到六个月**。

50/50 的原因：我在 **YC** 待过，做过第一号员工、创过业。YC 反复强调：**创造人们喜欢的东西**。产品细节、模型能力，终点都是 **用户爱用**。模型变强后，一些 **安全带** 功能重要性会降——我们在想怎么改，比如让 **循环** 更核心、 **跑大量代理** 更简单、 **子代理** 更好用。我预测 **一年后** 模型更完善，今天很多机制—— **提示注入防护、命令静态验证、权限模式、人工在环**——可能 **没那么重要**，因为模型本身会做对决策。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 七种力量 | 7 Powers | 护城河类型学；AI 重新定价各条权重 |
| 转换成本 | switching cost | 迁平台 friction；代理迁移在变薄 |
| 流程能力 | process power | 复杂 workflow 锁定；4.7 在攻 |
| AI 原生 | AI-native | 从零按代理流程设计，无 legacy 改造痛 |

**本章小结**

- **SaaS 末日** ≠ 所有软件死——是 **护城河重排**：UI 锁定让位，网络/规模仍硬
- 产品 vs 模型：**50/50  today**，但安全 harness 随模型变强可能 **自行退居二线**
- 创业窗口： **10 倍颠覆机会**，大公司的组织惯性是初创的结构性礼物

---

## 04 像发短信一样写软件：印刷术类比 [13:18]

**观众：** Claude Code 几个月前引发 **文化变革**——店主给自己写软件，有人用微控制器控灯。软件开发会成为 **人人会的通用技能** 吗？像会用 Office？

**Boris Cherny：** 会，而且 **比 Office 更进一步**——像 **发短信** 一样基础。我主要读科幻和科技史。最贴切的类比是 **15 世纪欧洲印刷术**。

印刷术前，欧洲大约 **10% 识字**——他们受雇于不识字的国王领主，专门 **读写**。印刷机出现后 **50 年**，欧洲文学作品出版量 **超过此前一千年**；书价降约 **100 倍**。识字普及又花几百年——要教育、政府，很多人离不开农场——但最终全球识字率到 **70% 左右**。今天读写不用学位，仍有 **专业作家**。

**软件完全民主化** 会来得 **比 50 年快得多**。推论：写 **会计软件**，最佳人选 **不是工程师**，是 **优秀会计师**——他们懂领域。**编码是容易部分，懂领域才是难的**。显然就是未来。

> **金句 · Boris**
> **中文：** 编码是容易的部分，了解领域才是困难的部分。
> **原文：** Coding is the easy part; understanding the domain is the hard part.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 软件民主化 | software democratization | 非工程师也能构建可用软件 |
| 领域护城河 | domain moat | 编码廉价后，深度行业知识成唯一壁垒 |
| 印刷术类比 | printing press analogy | 成本骤降 → 能力普及的历史模板 |

**本章小结**

- 目标不是「人人会编程」，是 **人人能构建**——门槛低于 Office，接近发短信
- **领域专家 + 代理**  beat **纯工程师 + 代理** 在 vertical software 上
- 时间尺度：印刷术用了数百年，软件民主化 **压缩在一代人内**

---

## 05 组织流程领先于模型差距 [15:24]

**观众：** 你们活在「未来」——内部工具先发布。工程能力上，你们和世界差 **一个月、三个月还是六个月**？差距在拉大还是缩小？

**Boris Cherny：** 内部用的模型和大家 **一样**——dogfooding 极重要，我们用 **Opus 4.7** 写大部分代码，会试一点 Mythos，某个版本最终会开放。**模型侧没有真正差距**。

**产品侧可能有更大差距**——因为我们 **改了所有流程**。跟 Anthropic 的人聊：几乎 **什么事API 用 Claude**。我编码时 Claude 在 **循环里写**；它们通过 **Slack** 跟别人 Claude 聊，那些代理也在循环里找未知数。公司 **已经没有手动写的代码**——**所有 SQL、业务逻辑都是模型生成**。

我们领先的地方 **不是技术**——开发者用的工具我们也发布、也 dogfood。是 **组织结构和组织流程**——希望能在这种场合讨论，大家都能学。

**Lauren Reeder：** 初创 **从头建** 确实容易得多。

> **金句 · Boris**
> **中文：** 公司已经没有手动写的代码了——所有 SQL、所有东西都是模型构建的。
> **原文：** There's no manually written code in the company anymore — all SQL, everything is built by the model.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 组织流程护城河 | org process moat | 全员 AI 原生工作流，非秘密模型 |
| Dogfooding | dogfooding | 内部与外部同模型同产品，逼真反馈 |
| 模型差距神话 | model gap myth | 可用模型基本一致，流程分化才是落差 |

**本章小结**

- **模型不是 moat**——Anthropic 对外发布的与内部 dogfood 同源
- 真正领先：**Slack 里 Claude 互聊、循环写代码、非工程职能全员构建**
- 初创优势：**零 legacy 流程**，不必先拆再建

---

## 06 多代理并行、MCP 与产品悬置的下一批 [~18:00]

**观众：** 上次红杉活动你说 **多代理** 还很早期——现在有 `/batch`、`/loop`、子团队。你们怎么 **注入先验**？目标函数怎么变，让模型 **自己决定并行 10 个子代理**？

**Boris Cherny：** 产品侧 **归根结底是提示**。我们调 prompt 帮模型多并行——但老实说，模型变好 **它自然就这么干**。**循环** 在 **4.7** 里它自己就开始做了：我让它拉数据查询，它说「数据在变，我 **启动循环每 30 分钟报告**」；我说 Slack 发我，它就 **用 Slack MCP**。用户不该想「怎么更好用工具」——若需要想，是 **我产品设计不好**。靠 **模型变强 + 我们怎么 prompt**。

**观众：** 很多人用 **云端** Claude/Codex，也有人主张 **本地 AI**。未来几年还是云端集中，还是人人 **本地代理**？

**Boris Cherny：** 根本回答：**不重要**。模型已经能自己解决问题；再过几年 **模型写完所有代码、启动代理、搭环境**——它若决定用本地模型就会用。**工程师不必再选**。

**观众：** Claude Code 吃准 **开发者工具本地** 这一事实。知识工作用云工具——你们怎么让 **Cowork** 像 Claude Code 对开发者那样强？

**Boris Cherny：** 好问题。我以前在大公司 **花五年** 把环境迁远程——知识工作不一样，**Salesforce、Docs** 本来就在云上。答案总是最简单的：**MCP**。Claude AI 里连 Salesforce、Google Docs/Calendar，Cowork 就能用；CLI、Claude Code 也能用。没 MCP 的系统，才轮到 **率。

**观众：** 那就是 **计算机使用（computer use）** 的大机会？

**Boris Cherny：** Computer use 是 **大包大揽的词**。Anthropic 这里 **遥遥领先**——Cowork 里用，几乎能操作你电脑上任何软件；还慢，但 **4.7 之后已经很好**。除此之外 **MCP 就是答案**——MCP、API、任何编程访问都行，模型只处理 **token**。

**观众：** 你曾看到 **产品悬置** 就动手建产品——用模糊说法，**今天在建什么**，六到十二个月后模型更好会更有趣？

**Boris Cherny：** Claude 本身就是。 **设计** 今天已经不错，会更好。Claude Code 还有东西 **几周内发布**——你们会看到 **循环、批处理、大规模并行代理** 更好。**Computer use** 是另一个好例子。

**Lauren Reeder：** Boris，非常感谢。

**Boris Cherny：** 谢谢大家。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 多代理并行 | multi-agent parallelism | 子代理/batch/loop 同时推进任务 |
| MCP | Model Context Protocol | 连 Salesforce/Docs 等云工具的统一接口 |
| 计算机使用 | computer use | 代理操作本机 GUI 软件的能力 |
| 产品悬置 | Product Overhang | 为下一档模型能力预建的产品形态 |

**本章小结**

- 并行不靠用户操心—— **4.7 自发 loop + MCP**；产品设计目标是无感
- 本地 vs 云端：长期由 **模型自选**，非工程师战略抉择
- 下一波产品悬置：**循环/批处理规模化 + computer use + 设计能力**

---

## 总结：编码廉价之后，拼领域与组织

| 维度 | 要点 |
|------|------|
| 编码状态 | Claude Code repo **100% 代理编写**；Boris **150 PR/天**；全行业仍分「已解决 / 中间 / 手写」三档 |
| 个人工作流 | **手机多会话 + 子代理 + 闪电循环/例程**；Cron 修 CI、分类 Twitter 反馈 |
| 商业护城河 | **7 Powers**：switching cost、流程能力 **变薄**；网络效应、规模、垄断资源 **仍硬** |
| 软件民主化 | **印刷术类比**——像发短信一样普遍；**领域 > 编码** |
| 组织领先 | **无手动代码**；差距在 **流程重构**，不在秘密模型 |
| 产品前瞻 | **循环/批处理/computer use** 将随 4.7+ 模型 **自发变强** |

### 对个人的启示

- 别等「全行业编码已解决」——在你 **栈足够标准** 的 repo 上先试 **100% 代理**
- 学 Boris：**开几个循环** 处理重复运维（CI、反馈分类），比手动盯 PR 省注意力
- 投资 **领域深度**；编码交给代理后， **懂业务的人** 构建 vertical software

### 对团队/产品的启示

- 产品 vs 模型 **50/50**，但 **安全 harness** 应设计为可随模型变强 **逐步退场**
- SaaS 战略：少赌 **UI 锁定**，多投 **网络与数据**；流程型 moat 正在被 4.7 侵蚀
- **MCP 优先** 接知识工作工具；computer use 补 **无 API 的旧系统**

### 仍待验证

- 「一天 150 PR」的 **质量与 review 负担**——专栏未展开 merge 策略 [待核实]
- **Mythos** 开放时间表——Boris 仅称「某版本最终会开放」
- 非工程职能全员 coding 的 **合规与权限** 边界——现场未深聊

> **金句 · Boris（封底）**
> **中文：** 未来十年能颠覆行业的创业公司会是现在的十倍——现在是最好建设、最好创业的时候。
> **原文：** The number of startups that can disrupt industries will be 10x — it's the best time to build and the best time to start a company.

---

## 附录

### 章节时间戳（B 站简介 / 专栏导读）

| 章节 | 时间 | 主题 |
|------|------|------|
| 01 | [04:15] | 编码从 Tab 补全到 100% 代理编写 |
| 02 | [06:42] | 闪电循环、例程与跨学科通才 |
| 03 | [09:55] | 七种力量、SaaS 叙事与创业 10 倍潮 |
| 04 | [13:18] | 印刷术类比与软件民主化 |
| 05 | [15:24] | 组织流程领先于模型差距 |
| 06 | [~18:00] | 多代理、MCP、Cowork 与产品悬置 |

### Ingest 路径

| 字段 | 路径 |
|------|------|
| ingest_dir | `Recastory/workspace/bilibili-retranscribe/BV19V5t6ME6c/ingest` |
| column_source | `.../ingest/column_article.md` |
| column_url | https://www.bilibili.com/read/cv48902706/ |
| BV | https://www.bilibili.com/video/BV19V5t6ME6c/ |
| 时长 | 24:39 |

### 相关阅读

- [[Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿]] — 同 Guest 深聊增长、Auto 模式、Token 政治与 7 Powers
- [[Claude Code负责人-AI原生团队如何使用AI]] — Cat Wu 侧：Dogfooding、Todo/Plan、Eval 分 E2E 与 triggering
- [[Anthropic团队-解析Claude Agent平台内幕]] — 云托管代理与 Harness 解脱；组织多代理 Slack 互聊对照
- [[OpenClaw创始人-我是如何使用OpenClaw的]] — 另一套「循环 + 多 CLI」个人 harness；可与 Boris 闪电循环对照
- [[MOC - AI Coding 与工具]] — Claude Code 主题索引

### 收录说明

- **视频**：[BV19V5t6ME6c](https://www.bilibili.com/video/BV19V5t6ME6c/)（B 站 *Easonlee的AI笔记* · P0 batch wave 4）
- **讲者**：Boris Cherny、Lauren Reeder
- **原始发布**：2026-05-05（简介标注）
- **主源**：Recastory `column_article.md`（S 级专栏 ≥3k + Host/Guest）
- **版本**：canonical Host-Guest v3.2（2026-07-06）
