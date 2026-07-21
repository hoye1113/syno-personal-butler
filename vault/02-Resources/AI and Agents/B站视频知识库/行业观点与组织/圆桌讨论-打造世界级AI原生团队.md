---
title: "圆桌讨论：打造世界级 AI 原生团队"
tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering", "ai_career"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering", "ai_career"]
created: "2026-07-07"
source: "B站视频 - Easonlee的AI笔记"
description: "Atlassian CTO Rajiv 与 Thomas Dohmke：AI 原生心态、RoboDev 与 SDLC 全链智能体、远程协作、角色融合与代币成本、编程重拾乐趣。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/圆桌讨论-打造世界级AI原生团队.md"
source_sha256: "d96be6992d53fe4eaed61354a68b0721a1e3587f28540cceef319a0b4d290584"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV19GAqzSE9K/"
column_url: "https://www.bilibili.com/read/cv46334590/"
host_name: "Greg"
guest_name: "Rajiv / Thomas Dohmke"
guest_title: "Atlassian CTO · 前 GitHub CEO"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV19GAqzSE9K/ingest"
speaker: "Greg / Rajiv / Thomas"
duration: "33:36"
saved: 2026-07-07
updated: 2026-07-07
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV19GAqzSE9K/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV19GAqzSE9K/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article Host/Guest labels"
speaker_confidence: high
concepts:
  - id: ai_native_mindset
    zh: AI 原生心态
    en: AI-native mindset
    one_line: 相信智能体编排，而非人人手写每一行
  - id: sdlc_agents
    zh: AI 原生 SDLC
    en: AI-native SDLC
    one_line: 规划在 Confluence，编码与 CI/CD 用智能体贯穿
  - id: artifact_ownership
    zh: 产物所有权
    en: artifact ownership
    one_line: 责任从代码行转向验证护栏与输入输出
  - id: token_opex
    zh: 代币可变成本
    en: flexible token OPEX
    one_line: 生产力越高代币越贵，财务模型要重算
  - id: coding_fun_again
    zh: 编程重拾乐趣
    en: coding fun again
    one_line: 代理吃掉构建错误与单测，人回到创造
author:
  - "[[Rajiv]]"
  - "[[Thomas Dohmke]]"
---

# 圆桌讨论：打造世界级 AI 原生团队

**Host：** Greg（活动主持）  
**Guest：** Rajiv（Atlassian CTO）· Thomas Dohmke（Entire 创始人 · 前 GitHub CEO）  
**形态：** Host-Guest canonical v3.2（**专栏主源**）  
**B 站：** [BV19GAqzSE9K](https://www.bilibili.com/video/BV19GAqzSE9K/) · **时长** ~33:36

---

## 开场

五个月前办这场圆桌，本想碰几个难题，结果 AI 成了全场主线。两位嘉宾都在管过大组织、也在做开发者品牌。Thomas 刚宣布新公司，Rajiv 在 Atlassian 推 RoboDev。核心问题：**什么叫 AI 原生团队？** 不是减人，是用 AI 做出以前做不出的东西，并把编程的乐趣找回来。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| AI 原生 | AI-native | 像「云原生」一样事后命名，形态还会变 |
| RoboDev | RoboDev | Atlassian 编码智能体 + SDLC 品牌 |
| 代码左侧 | left of code | 规划、规范、意图表达 |
| 产物所有权 | artifact ownership | 拥有的是 Jira/Confluence/Loom 里的意图与交付物 |
| 代币成本 | token OPEX | 工资之外突然多了一条弹性账单 |

---

## 01 心态与「云原生」类比

**Greg：** AI 优先团队长什么样？

**Rajiv：** 先信。我们有传统写码团队，也有 AI 原生团队——工程师**基本不写一行代码**，全是智能体编排。PM、设计也在写代码；产出常是 2×、5×，团队未必变小，但东西更敢做、UX 更现代。争论「减员」抓错重点：重点是**以前做不出的，现在能做**。

**Thomas：** 「AI 原生」会像 2008 年的「云原生」——事后才命名。我孩子用 Firefly 做壁纸，那就是 AI 原生一代。但别夸大：我仍是创始人，HR、董事会表格没有智能体能替。全公司用 Markdown 协作、多语言口头描述功能，仍是噩梦。

> **金句：** 重点不是团队变小，是你现在能创造以前创造不了的东西。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 心态先行 | mindset first | 不信就不会改工作流 |
| 事后命名 | retrospective label | 今天的 AI 原生 ≠ 三年后 |

**小结：** AI 原生是信念 + 工作方式，不是口号；日常仍有大量非编码杂务。

---

## 02 工作流：少看代码，智能体贯穿 SDLC

**Thomas：** 新人逼自己**少看代码**，用提示和意图解决问题；代码审查也尽量不逐行读，等审查机器人与编码智能体协同——**会编排智能体的人，就是新技能**。

**Rajiv：** 瓶颈移到代码左右两侧：左侧 Confluence 写意图，智能体读评论进 RALPH 循环；右侧用智能体做 CI/CD、部署、SEV。RoboDev 用 Anthropic 模型，在 SWE 基准上打过竞品——**智能体和你给的上下文一样聪明**；团队协作图谱（谁在哪个 PR/Jira 上合作）让分布式团队生成的 PR 更好。

**Greg：** RoboDev 是什么？

**Rajiv：** 编码智能体，也是贯穿 SDLC 的品牌：代码审查、CI/CD、事件解决都在内。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 上下文图谱 | collaboration graph | Jira/PR 关系喂给智能体 |
| 编排技能 | agent orchestration | 人不写行，但会设规则与意图 |

**小结：** 最 AI 原生的开发者，是学会让智能体写、审、部署，人盯意图与护栏。

---

## 03 远程、角色融合与领导者的代码

**Thomas：** 远程孤独；智能体是 24/7 思考伙伴——周末发布缺 Cookie 政策，Composer 三秒搞定。跨时区反而有优势：旧金山晚上六点，墨尔本还在干活。

**Rajiv：** 所有权从**代码**转向 **Confluence/Jira/Loom 里的产物**；责任是验证护栏与 I/O，确认 AI 代码可信。团队结构未必立刻大改，目标是**释放创造力**。试过「一行手写都不写」的项目，生产力极高；遗留单体则仍难。

**Thomas：** 待办全推给代理 → 瓶颈变成审查不过来的 PR；没有 PM/设计会变成「霍默·辛普森的车」。角色大融合：PM→产品工程师，设计→设计工程师，工程师当智能体主人。

**Rajiv：** 领导者能写更多代码了；管理幅度可能变大（有人 33–40 个直接下属），经理更少、但更贴近代码。给创始人的梗：**Atlassian CTO 自掏腰包买笔记本写码**——大厂的 CTO 也在重新亲自动手。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 角色融合 | role convergence | PM/设计/工程文氏图重叠 |
| 验证责任 | verification duty | 信 AI 前先定义护栏 |

**小结：** 远程 + 智能体补协作缺口；领导与 IC 都更贴代码，职业阶梯在变。

---

## 04 代币成本与编程乐趣

**Rajiv：** 全员 RoboDev；PR 量 +89%，周期 -42%，51% 安全漏洞经代理修复。远期：零手写、只信代理审查、验证系统行为而非读每一行；再远或许没有 IDE，只有意图层。

**Thomas：** **成本飙升**——工资是固定 OPEX，突然多了弹性代币；生产力越高账单越高，甚至要让部分人慢下来。积极面：**编程又好玩了**——构建错误、NPM、单测丢给 Codex；OpenAI 演示里用 SwiftUI 做三个菜单栏 App，全程不看代码。

**Greg：** 肯特·贝克除外，没人爱写单测。

**Thomas：** 现在可以说「给我写单测」——像 1990 年代 Commodore 64 卡住睡觉，现在三秒有代理。CFO 看生产力，工程师看乐趣，**百分之百重要**。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代币倒置 | token inversion | 越快越贵，财务要新模型 |
| 乐趣回归 | joy of coding | 琐碎自动化，创造回流 |

**小结：** DORA 指标在涨，同时代币与审查是新约束；乐趣是 adoption 的隐藏燃料。

---

## 总结

| 维度 | 要点 |
|------|------|
| 定义 | 心态 + 智能体编排；像云原生一样仍在演化 |
| 工作流 | 左侧意图、右侧 CI/CD；少看代码、多验证 |
| 组织 | 角色融合；领导写码；远程靠智能体补位 |
| 指标 | PR/安全/周期大幅改善；非单纯减人 |
| 成本 | 代币弹性 OPEX，与生产力挂钩 |
| 文化 | 编程乐趣回归，创造 > 维护琐事 |

---

## 附录

### 章节锚点（专栏结构）

| 章 | 主题 |
|----|------|
| 01 | AI 原生定义与云原生类比 |
| 02 | 工具与工作流、RoboDev |
| 03 | 分布式团队 |
| 04 | 工程师与领导角色 |
| 05–06 | 职业路径与管理诚实 |
| 07–08 | 指标、代币、乐趣 |

### Ingest

- BV：`BV19GAqzSE9K`
- ingest：`Recastory/workspace/bilibili-retranscribe/BV19GAqzSE9K/ingest`
- 专栏：`.../ingest/column_article.md`

### 相关阅读

- [[微软CEO-AI竞争终局与企业私有评估]] — 大企业 AI 转型与评估资产
- [[IBM团队-Harness工程详解]] — SDLC 与 harness 横切
- [[MOC - AI 时代个人发展与组织]] — 职业与组织 MOC
- [[MOC - Harness Engineering]] — 智能体编排与工程链路
- [[MOC - Agent Theory and Design]] — 入口
