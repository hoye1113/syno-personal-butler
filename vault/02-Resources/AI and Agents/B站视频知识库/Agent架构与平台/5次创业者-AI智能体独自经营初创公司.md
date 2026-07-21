---
title: "5次创业者：AI智能体独自经营初创公司"
tags: ["ai_agent", "video_transcript", "bilibili", "codex", "skills", "ai_career"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "codex", "skills", "ai_career"]
created: "2026-06-09"
source: "B站视频 - Easonlee的AI笔记"
description: "Peter × Ryan Carson：ClawChief 幕僚长 R2、cron 确定性、Codex 修 OpenClaw、Devin 云工程与日 merge 10+ PR——创业哲学从「别写文档」翻转为「先建系统再放量」。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/5次创业者-AI智能体独自经营初创公司.md"
source_sha256: "bf5c99068ac72cdb7849168f77bfc8af6f1712b1b71d6bca2f3ab13e542ffe17"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV174GU6AEZY/"
source_original_date: 2026-05-24
host_name: "Peter"
guest_name: "Ryan Carson"
guest_title: "5 次创业者 · Untangled 创始人"
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV174GU6AEZY/ingest"
speaker: "Peter / Ryan Carson"
duration: 39:26
saved: 2026-07-02
updated: 2026-07-03
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV174GU6AEZY/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Host-Guest canonical (ASR primary)
speaker_inference: "asr_v2 Speaker1=Ryan Speaker2=Peter + video_description"
speaker_confidence: high
asr_version: v2
concepts:
  - id: claw_chief
    zh: 幕僚长配置
    en: ClawChief
    one_line: cron + markdown 把 OpenClaw 养成 EA/CoS
  - id: cron_vs_heartbeat
    zh: 定时任务 vs 心跳
    en: cron vs heartbeat
    one_line: 生产级 recurring 任务用 cron 不用不可靠 heartbeat
  - id: land_pr
    zh: 合并 PR 剧本
    en: land PR playbook
    one_line: agent 自 review、resolve、merge 的 Devin skill
---

# 5次创业者：AI 智能体独自经营初创公司

**Host：** Peter（Startup Ideas Podcast）  
**Guest：** Ryan Carson（5 次创业者 · Untangled 创始人）  
**形态：** Host-Guest canonical v3.2（**ASR 主源** · 中文口语化）  
**B 站：** [BV174GU6AEZY](https://www.bilibili.com/video/BV174GU6AEZY/) · **时长** ~39 min

---

## 开场

Ryan 融了 **200 万美元 seed**，做离婚科技产品 Untangled，**有钱却故意不雇人**。他把 OpenClaw 养成幕僚长 **R2**，工程全扔 **Devin 云 VM**，自己日 **merge 10+ PR**。他有一句狠话：**智能体就是定时任务加 markdown 文件。**

Peter 这期要拆五块：**ClawChief 怎么搭** → **R2 日常 EA/BD** → **Codex 当上层 agent 修 OpenClaw** → **Devin 代码工厂与营销机器** → **创业哲学为什么完全反过来**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 幕僚长配置 | ClawChief | Ryan 开源的 cron+md，把 OpenClaw 变成 EA |
| 优先级地图 | priority map | 季度业务 + 人生重要的人，供 agent 决策 |
| 定时任务 | cron job | 每 15 分钟确定性触发，不靠「想起来才跑」 |
| 技能文件 | skill (markdown) | 长指令放 md，cron 只写「用这条 skill」 |
| 合并 PR 剧本 | land PR playbook | Devin 自 review+merge，人几乎不看 diff |
| 代码工厂 | code factory | agent 写、审、ship 接近 100% 的 SDLC |
| 剧本 | playbook | Devin 版 skill，描述 signup→结案等长流程 |
| 上层修下层 | agent-on-agent | Codex SSH 进 closet Mac 修崩掉的 OpenClaw |

---

## 01 智能体 = 定时任务 + markdown

**Peter：** 你说 agent 本质就两样东西——能展开讲讲吗？OpenClaw 现在还挺 janky 吧？

**Ryan：** 谁跟你说挥一下魔杖人生就变了，那是在骗你。我跑过好几家公司，雇过真·行政助理。目标是把 OpenClaw **R2** 养成首席幕僚。我开源了 **ClawChief**——说白了就 **一堆 markdown + 几条 cron**。

R2 帮我约 Calendly、每 **15 分钟** 扫 inbox/日历/优先级、在 Slack ping 我。他会主动 follow up 没回信的约会议邮件。还有 BD：每天出去找潜在客户、填 spreadsheet、**以我身份 cold email 约会议**。

记住：**智能体 = 定时任务 + 技能 markdown**。cron 靠谱、skill 写对，能干很多活。ClawChief 里最关键是 **priority map**——季度业务优先级，加上家人、关键联系人这种「超长期优先级」。agents.md 加载它进 context。cron 里 **executive assistant sweep** 每 15 分钟跑一次，消息极短，就「用 executive assistant 这条 skill」，细节全在 skill 文件里。

OpenClaw 自带 **heartbeat** 不靠谱——不是真·定时，是「想起来才跑」。我用 **cron** 才 bulletproof。cron 消息要 **DRY**：别在 cron 和 skill 里重复大段指令。

> **金句 · Ryan**
> **中文：** 智能体就是定时任务加 markdown 文件。
> **原文：** Agents are cron jobs and markdown files.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 心跳 | heartbeat | OpenClaw 非确定性触发，Ryan 不用 |
| 优先级地图 | priority map | 季度 + 人生重要的人 |
| 自动消解规则 | auto resolver | R2 能自己搞定的任务写进 md |
| 确定性扫描 | deterministic sweep | 15 分钟 cron 扫邮件日历 |

**本章小结**

- 生产级 recurring 任务：**cron > heartbeat**
- 长指令放 skill，cron 一行触发
- priority map 是 EA 的「决策灵魂」

---

## 02 R2 日常：Slack 线程、Todoist、夜间拓客

**Peter：** Slack 怎么接的？拓客 cron 具体干什么？

**Ryan：** 很 fiddly——得自建 **Slack app**、写 manifest。我开 **Ryan-R2** 频道而不是 DM，**thread** 好整理。Peter 刚才还想 prompt inject R2，还行，没吐出信用卡。

R2 有 **Todoist API** 权限（不用 md 任务表）。Gmail 走 **Google CLI**。R2 有 **自己的邮箱、GitHub 账号**——当真人雇员养：读我邮件日历，**以 R2 身份** 发 invite，我当 attendee。这通 podcast 就是 R2 查档期订的。

**Prospecting skill** 每天跑：Firecrawl 搜 Connecticut 家庭法律师/调解员 → Google Sheet CRM → 代发 cold email（**ryan@** 老域名，deliverability 好）。Firecrawl 月 **~20 美元**，比 Brave 默认搜索强太多——**给 agent 配好工具** 是 unlock。

防重复：spreadsheet 查是否已联系——对人不用说，对 agent 要写死。坑：skill 里写「CC 另一邮箱」→ R2 **线程里回复却另开新邮件**——agent **字面执行** md，得 pedantic 一次写对。

我融了钱却不雇人：创始人要先 **亲历每个岗位的痛苦**，用 agent 学会怎么跑，知识 **写进 markdown 不随人走**。培训 agent 比人快 **「百万倍」**——人走了训练带走，agent 一直留着。

> **金句 · Ryan**
> **中文：**  onboard  agent 有时比培训团队还容易，快百万倍。
> **原文：** It's almost easier to onboard and train agents… a million times easier.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 夜间拓客 | prospecting cron | 每日 Firecrawl+CRM+cold email |
| 线程沟通 | Slack threads | 专业 thread 优于 Telegram 乱聊 |
| 字面执行 | literal instruction following | md 写错 agent 照做，要 pedantic |

**本章小结**

- EA 权限模型：读你的、写它自己的 calendar invite
- BD 自动化 = 好搜索 API + CRM 去重规则写死
- 先 AI 亲历流程，再雇「被 AI 增强的人」

---

## 03 Closet Mac + Codex：上层 agent 修 OpenClaw

**Peter：** 你在日本，OpenClaw 崩了怎么办？

**Ryan：** MacBook Pro 在 **closet**，**Tailscale SSH**。VS Code 连上去，旁边开着 **Codex**（ChatGPT Pro **200 美元/月**，token 补贴狠，我当 frugal 创始人能薅就薅）。我 mostly **跟 Codex 说话** 改 R2 配置，少手搓 dashboard。

Workspace 是 **OpenClaw 源码 clone**——pro tip：让 Codex **pull latest、读 harness 源码**，告诉你怎么 upgrade 做 X。OpenClaw 常 **自己搞崩自己、修不了自己**——上层 **Codex agent 修下层 OpenClaw**，不用飞回去摸 closet 里的机器。

开箱 **memory** 我没折腾 QMD 自研 harness—— temptation 是「我自己写个更简单的 harness」，结果你在 **维护工具而不是干活**。尽量 **out-of-the-box OpenClaw + 自定义 skill/cron** 就收工。换 Hermes、优化 agent 链——能拍 YouTube，**不是 real work**。

每周 priority 我改 **纸笔/白板最多 3 条**——agent 强在 today 和 quarter，**本周分辨率** 人要用物理列表（学自我老婆）。memory 开箱够用，别为工具放弃产出。

> **金句 · Ryan**
> **中文：** 让 Codex 或 OpenClaw 能读自己的源码。
> **原文：** You want to allow Codex or your OpenClaw to inspect its own code.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 远程运维 | Tailscale SSH | closet Mac 远程修 agent |
| 自读源码 | harness self-inspection | clone 官方 repo 让 agent 读实现 |
| 定制与收手 | customization vs shelf tools | 买现成工具+自定义 drill，别造整机 |

**本章小结**

- Agent-on-agent：Codex 当 OpenClaw 的 SRE
- 专用机器 + Tailscale = solo 创始人远程 resilience
- 本周任务纸笔补 agent 看不清的「中间尺度」

---

## 04 Devin 代码工厂：零本地、Schedules、日 10+ PR

**Peter：** 工程栈呢？Solo 还做 PR 吗？

**Ryan：** **Devin，只做云开发**。VM 配好一次，`npm run dev` 永远能跑——本地 Homebrew 端口地狱没了。 serious 的人都在用 **Schedules + Playbooks**。

例：**weekly full case coverage**——signup 到完成离婚案件 **整条 UX**，Playwright 浏览器测，**每周自动跑**。Playbook = skill：告诉 Devin **怎么做一整条流程**。还有 nightly smoke：signup 某功能、**录屏**，坏了报告。

Solo 也要 **PR**——agent 像人一样需要 **可复现流程**。我有 **land PR** playbook：review、resolve、merge **不用我**。一天 **10–20 次**，我 mostly 读 agent 写的 **markdown 摘要**，不是 diff。

Feature 流程：Devin 里 **WhisperFlow brain dump** → skill 引导 **PRD 问答** → PRD.md → **build it**；单线程，harness **auto compaction**；Devin **浏览器测+录屏**，常自发现并修 PR → **land PR** → ship。并行 **1–2 个 feature**，脑子在 GTM。

**Google Ads：** 让 Devin 建 **Google Ads API CLI**，我只 chat「campaign 怎样、怎么 optimize」——不用 Ads UI。内容机器：Descript 剪访谈 60s → Drive mp4 → nightly playbook：Gemini 看视频写文案 → **GPT Image** 封面（**design.md + Design Joy 首单参考图**）→ Publer API 发社媒。首单设计 **~6000 美元/月** 拿品牌，之后 AI 无限延展。

> **金句 · Ryan**
> **中文：** 我每天至少 merge 10 个 PR。
> **原文：** I'm probably shipping at least 10 PRs a day.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 云工程环境 | cloud VM (Devin) | 零本地，依赖配一次反复用 |
| 定时自动化 | schedules | 每周全链路 UX、 nightly smoke |
| 参考图工作流 | reference images + design.md | 品牌一致性交给 image 模型 |

**本章小结**

- Devin = 云 VM + 浏览器反馈环 built-in
- land PR 让「代码工厂」可 scale 到 solo
- 营销同样 playbook 化：Ads CLI +  nightly 社媒 pipeline

---

## 05 创业哲学反转：先建系统，再一人十人

**Peter：** 这期 takeaway 是不是——大量工作其实在 **搭系统**？

**Ryan：** 对。**花时间搭系统**，你才懂活怎么干、流程怎么 refine。然后加 agent 或 **agent 增强的人**。

我们以前说：**MVP 别写系统、别写文档**。现在 **完全反过来**——先搭 **SDLC、documentation、reference images**，写进 **cron + skill**，然后 suddenly 你在干 **十个人的活**。setup brutal，但我 ** freed 去见人、销售**。

Untangled MVP 融钱前就 built 好了，现在全是 **go-to-market**。产品人、营销人不能再分家——**哪个 feature 解锁 revenue、怎么快速 ship** 几乎 trivial，难在 adoption。竞争在 **系统化 GTM**，不在能不能做出来。

> **金句 · Ryan**
> **中文：** 以前 MVP 别写系统——现在完全反过来。
> **原文：** Do not spend time on systems… that's literally reverse now.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 软件开发生命周期 | SDLC | agent 团队也要「大公司级」流程 |
| 系统先于放量 | systems before scale | 文档/剧本是杠杆不是浪费时间 |
| Go-to-market | GTM | 构建 trivial 后，竞争在获客与收入 |

**本章小结**

- AI-native solo：**系统设置 = 主工作**，执行交给 agent
- OpenClaw 管办公/BD，Devin 管工程/测试/Ads/内容
- 人保留品味、关系、本周焦点

---

## 总结

| 维度 | 要点 |
|------|------|
| Agent 形态 | **cron + markdown skill**；heartbeat 不可靠 |
| OpenClaw | ClawChief、priority map、Slack thread、上层 Codex 修下层 |
| 工程 | Devin 云 VM、playbook 自动化、land PR 日 10+ merge |
| 营销 | Google Ads CLI、nightly 内容 pipeline、reference image 品牌 |
| 哲学 | **先 SDLC/文档/剧本**，再 unlock 一人十人；weekly 纸笔补盲区 |

> **金句 · Ryan（封底）**
> **中文：** 智能体就是定时任务加 markdown 文件。
> **原文：** Agents are cron jobs and markdown files.

---

## 概念索引

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| claw_chief | 幕僚长配置 | ClawChief | cron+md EA 模板 |
| cron_vs_heartbeat | 定时 vs 心跳 | cron vs heartbeat | 生产 recurring 用 cron |
| land_pr | 合并 PR 剧本 | land PR playbook | agent 自 merge |

---

## 附录

### 章节时间戳（B 站简介）

| 时间 | 主题 |
|------|------|
| 01:00 | Cron 确定性 vs 心跳 |
| 05:30 | priority map |
| 12:15 | 先 AI 亲历再招聘 |
| 20:45 | Devin 云工程 |
| 28:30 | Google Ads + 内容机器 |
| 35:00 | 系统设置重于 MVP |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV174GU6AEZY/ingest`
- **ASR 主源**：`Recastory/workspace/bilibili-retranscribe/BV174GU6AEZY/article.md`（FunASR v2 · Speaker1=Ryan / Speaker2=Peter）
- **B 站**：[BV174GU6AEZY](https://www.bilibili.com/video/BV174GU6AEZY/)
- **时长**：39:26
- **专栏主源**：无

### 相关阅读

- [[OpenClaw创始人-我是如何使用OpenClaw的]] — Peter 侧 IM+CLI 哲学  
- [[Codex负责人-现场演示Codex]] — Codex 官方 automation  
- [[WorkOS-创建和使用Skills方法论]] — Skills 设计  
- [[Cursor副总裁-构建软件开发过程的Agent]] — SDLC agent 化  
- [[MOC - Agent Theory and Design]] — Agent 实践横切索引  

### 收录说明

- **嘉宾**：Ryan Carson（[@Ryan Carson](https://twitter.com/ryancarson)）  
- **开源**：ClawChief（访谈提及）  
- **版本**：canonical Host-Guest v3.2-asr（2026-07-03；原 v3 九段讲义已替换）
