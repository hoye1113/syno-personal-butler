---
title: "Claude Code负责人：AI原生团队如何使用AI"
tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "harness_engineering", "ai_evaluation"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "harness_engineering", "ai_evaluation"]
created: "2026-06-09"
source: "B站视频 - Easonlee的AI笔记"
description: "Cat 讲 Claude Code 从 Boris 20% 项目到千人流传：终端极简+可扩展、工程师 E2E 原型 dogfood、Todo/Plan 从内部痛点长出来；PM 用 Claude Code 合 Slack/GitHub 反馈，Eval 分 E2E 与 triggering 两类。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code负责人-AI原生团队如何使用AI.md"
source_sha256: "b49969c672284dee258c7e17f8f3881a1770c8993c7febd9bf3e2bb246d14d57"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1eyBgB2EbX/"
host_name: "Peter"
guest_name: "Cat Wu"
guest_title: "Anthropic Claude Code 产品负责人"
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1eyBgB2EbX/ingest"
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1eyBgB2EbX/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Host-Guest canonical (ASR primary)
speaker_inference: "asr_v2 Speaker1=Peter Speaker2=Cat + video_description"
speaker_confidence: high
asr_version: v2
duration: 40:31
saved: 2026-07-02
updated: 2026-07-03
concepts:
  - id: dogfood_loop
    zh: 内部试用闭环
    en: dogfood loop
    one_line: 工程师原型 → 上千员工试用 → 爱就 fast track 公开
  - id: triggering_eval
    zh: 触发评估
    en: triggering eval
    one_line: 测该不该调用 tool，非只测最终答案
  - id: claude_md
    zh: 项目记忆文件
    en: CLAUDE.md
    one_line: 每 session 注入的 repo/个人 onboarding 记忆
---

# Claude Code 负责人：AI 原生团队如何使用 AI

**Host：** Peter  
**Guest：** Cat Wu（Anthropic Claude Code 产品负责人）  
**形态：** Host-Guest canonical v3.2（**ASR 主源** · FunASR v2 · 中文口语化）  
**B 站：** [BV1eyBgB2EbX](https://www.bilibili.com/video/BV1eyBgB2EbX/) · **时长** ~40 min

---

## 开场

Claude Code 可能是过去一年 viral 最快的开发者 Agent 之一——但很少人看清 **Anthropic 内部怎么 ship**。Cat Wu 从 Boris 的 API 玩具项目切入，讲终端为何是刻意选择、上千人 dogfood 如何每十分钟吐一条反馈、Todo/Plan 如何从「模型太 eager」长出来，以及 **Eval 的两条赛道**为何都不完美。

四章预告：**起源与终端哲学** → **工程师 E2E + dogfood** → **Todo/Plan 对抗 eager 模型** → **Eval、个人技巧与几个月路线图**。

---

## 01 从 Boris 的玩具到全 org viral：终端极简与可扩展

**Peter：** Claude Code 怎么开始的？听起来不像宏大战略。

**Cat：** Boris 起初是为了更好理解自家 API、看能把多少软件工程自动化而做的 side project。我当时花 **20% 时间**配环境，发现 Claude Code 让我效率高一大截，而且能和内部各种工具集成——我狂给他发 product feedback。决定对外发布时，我全职扑上来。

传播路径很 viral：Boris 团队 → 全组织 → research → **DS、PM、design** 这些技术邻接角色。对外发布后外部 adoption 也很快。没有三年蓝图，就是**工具好用 → 人传人**。

**Peter：** 我第一次装终端版 Claude Code 心想「就这？」——后来像打游戏一样越挖越深。这是刻意的吗？

**Cat：** 终端的美在于：开发者本来就会用 CLI——GitHub CI、Datadog、任何命令行工具，你一看到就知道 Claude Code 也能接。**Onboarding 极轻**。终端又只有 ASCII，屏幕寸土寸金，**不能堆按钮**——我们对自己很狠，决定 showcase 什么、不 showcase 什么。入门轻，但通过 hooks、custom slash、subagents **深度任意扩展**。

设计哲学两条：**新功能零 onboarding UX**——靠功能名 + 一行描述就该能上手；**CLI 必须可组合**，因为每家开发环境不同，要让每个 DPE 团队能定制。像打游戏——power user 自己挖深度。

我作为 developer product PM，定**可定制性边界**和 aspirational bar；AI 时代 PM 很大一块是 **pricing & packaging**，让工程专注体验。

> **金句 · Cat**
> **中文：** 终端逼你把功能砍到名字 + 一行说清就能用。
> **原文：** The terminal forces you to be brutal about what features you showcase.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 内部试用 | dogfood | 功能先给内部自愿试用再决定公开 |
| 可组合 CLI | composable CLI | hooks / slash / subagents 扩展深度 |
| 零上手流程 | no onboarding UX | 新功能靠命名自解释，不靠向导 |
| 开发者效率团队 | DPE team | 各公司定制 Claude Code 的运维/平台组 |

**本章小结**

- 起源 = API 理解项目 + Cat 反馈 → 非预设战略
- 终端 = 开发者肌肉记忆 + 极简逼出的克制 UI
- 浅入门、深扩展；PM 管边界与 packaging

---

## 02 Ship 节奏：产品工程师 E2E 与十分钟一条反馈

**Peter：** 你们发功能这么快——一周里工程师和 PM 怎么协作？

**Cat：** 团队里**产品工程师**很强，喜欢端到端拥有功能。常态：**工程师原型 → 内部 dogfood → 听反馈**——立刻懂？confusing？bug？还是**爱死了**？爱的 **fast track 公开**；不爱或 confuse 的**内部死掉**。

大项目有 product review——比如 VS Code、IntelliJ 集成，「meet people where they work」，决策后做几个月。小功能像 **todo、plan** 常常**没有 PRD**——难在 form factor 和 prompt，不是集成。

**Peter：** 反馈从哪来？只有内部吗？

**Cat：** Anthropic 员工极其 vocal。有个 **~1000+ 人 opt-in** 的内部 chat——默认不进，自愿加入。大概**每 10 分钟一条**高质量反馈，产品在出门前就被人扒一遍。对外看 early enterprise（约 **10 家**密切合作）和偶尔 Twitter。优先级往往很明显：GitHub issue **上百 thumbs up** + sales 说三客户 broken——同时出现就不用争论。

我们**坚持要负反馈**：「别夸我们，告诉我们什么不行。」决定修的 issue，**1–2 周** turnaround。作为 developer product PM 很 tricky——终端用户就是开发者，我管方向、packaging、把功能 shepherd 过流程。

**Peter：** 还要维护一堆 Google Doc 路线图吗？

**Cat：** Claude Code 这边**几乎不用 Google Docs**。反馈太多，该做啥往往**重复听十遍就清楚**——不够 Satisfying，但是真。我确实用 Claude Code：接 Slack  synthesize「还有谁要 subagent 自定义模型」；GitHub **dedupe** 重复 issue；**docs 第一稿 agent 写，人清最后 10%**。小 codebase 里「为什么做 todo」往往在 **PR 里**，问 Claude Code 搜 GitHub 比读可能过时的 doc 更快更准。

**Peter：** 你自己也直接改代码？

**Cat：** 刚当 PM 时更多——比如 Rick Rubin vibe coding 合作，加 `/vibe` slash 引用他文章，**我自己改比排工程师更快**。设计师 Megan 以前从不 commit，现在用 Claude Code **给 console、Claude Code 本体提 PR**。分支逻辑审计也行：「你是 max plan 还是 enterprise？rate limit 警告走哪条？」——让 Claude Code trace 代码，比人工翻靠谱。

> **金句 · Cat**
> **中文：** 我们要负反馈——听什么不行，别只要夸。
> **原文：** We love negative feedback — we want to hear what doesn't work.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 产品工程师端到端 | product engineer E2E | 工程师从原型做到发布 |
| 快速公开通道 | fast track | 内部「爱上了」的功能加速对外 |
| 反馈合成 | feedback synthesis | 用 Claude Code 汇总 Slack/GitHub 诉求 |
| 源码即文档 | codebase as source of truth | 小 repo 里 PR 比 Doc 更准 |

**本章小结**

- 默认路径：工程师原型 → ~1000 人 dogfood → 爱就 ship
- 大功能 formal review；小功能靠 form factor 迭代
- PM 用 Claude Code 合反馈、写 docs、dedupe issue；设计师也能 PR

---

## 03 Todo 与 Plan：和「太爱写码的模型」妥协

**Peter：** Boris 的 todo 故事我听说了——从 refactor 早停长出来的？

**Cat：** Sid 先发现：大家用大任务 refactor/rename，模型改 **30 处只做 5 处**就停。他的招——**逼模型写下任务清单，提醒没做完不能停**——效果炸裂。起初 todo 在 transcript 里飞过；很多人拿它**盯进度**，于是 Boris 试 **持久 `/todo`**，随时 slash 查看。

我们试过很多 form factor——thinking 词旁边塞 todo，用户不买账。**迭代式**找形态。Plan mode 是另一条线：用户一直说「先讲计划别写码」；团队**本想教用户用自然语言就要 plan**，模型其实会在 plan mode 外也规划。一两个月后足够多人要**显式快捷键**，我们才加 **/plan**——maybe 未来模型更听话会弱化。即使用 plan，模型还会说「我可以现在开始写码」——**trigger-happy** 是 Anthropic 模型性格；我个人有时更爱 **Codex 慢但稳**。

**Peter：** 这种误触发能用 Eval 卡吗？

**Cat：** 能。Todo 对**单项任务**也建清单、勾掉——明显不该触发；可以把这类 trajectory 放进 eval suite，确保要么不写 todo，要么至少三五项。我们花了不少时间调 **todo triggering**——社区负反馈也是 eval。

> **金句 · Cat**
> **中文：** Plan mode 是 hack——模型太爱立刻写码。
> **原文：** Plan mode was a hack — the model is so trigger-happy.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 任务清单强制 | todo forcing | 写下全量任务，未完成不许停 |
| 计划模式 | plan mode | 显式「先计划后写码」的妥协快捷键 |
| 过早停止 | early stopping | 大 refactor 只做前几项就停 |
| 触发过快 | trigger-happy | 模型倾向于立刻调用工具/写码 |

**本章小结**

- Todo 来自 refactor 早停痛点，持久化因用户要盯进度
- Plan mode 是用户要显式计划 + 团队抵抗后的妥协
- Triggering 行为值得单独 eval，不只测最终答案

---

## 04 Eval 两类、个人三技巧与几个月愿景

**Peter：** 推特上 Eval 吵很凶——你们怎么看待？

**Cat：** Eval 很难。我们关心**两类**，都不完美。**端到端 Eval**——如新 harness 跑 **SWE-bench**，看有没有退化；分数变了**难归因**，得读大量 gnarly transcript 找主题。**Triggering Eval**——工具该不该调用：web search 不能 100% 乱搜，问 React 最新 release 该搜。黑白边界 codify 成 eval，灰区后处理。能力类 Eval（数据科学 harness 是否更好）更难——要大数据集 + 无歧义金标准。

社区也是 eval：明显重复 GitHub issue、用户骂什么，和分数一样驱动优先级。贴纸 Easter egg：聊天提 swag 跳转贴纸 portal，有人反查 source map，**~500 地址**；12 人估 1 小时贴邮票，实际 **8 小时**——最后 cap 在 ~500。

**Peter：** 给听众三条个人使用技巧？

**Cat：** 一，**Demo is not docs**——想不想做某功能，让 Claude Code **原型**一下再写 pitch，别只写 spec。二，把 Claude Code 当**过度积极的新毕业生**——给大 prompt 它猜错就别放弃，像带人一样纠正，它很听反馈。三，投 **CLAUDE.md**——每次 session 注入，写架构、测试偏好、gotcha；可 repo 级 + **global personal**（Megan 写「我是 proud designer，请过度解释」）。`/init` 自动扫 repo 也行，她更爱手写 persona。

**Peter：** 一两年后的 Claude Code 长什么样？

**Cat：** 一两年太久，我说**几个月**。支柱一：**CLI 继续是最强 coding agent**，极度可定制、接满工具链，并长 **customization hub** 分享 hooks/slash。支柱二：**SDK**——希望世界上更多 agent（legal、EA、health、finance），Claude Code SDK 让 general agent 公司快速原型到产线。支柱三：**走出终端**——PM、design、marketing、sales 也要价值，但 terminal 对从没用过的人仍难 explain；我们给 marketing 同事 onboarding 就说「问它建个 app」——她不会跑，再问 Claude Code，**任何疑问都能问**。

**AI PM 建议：** 最难也最重要的是**模型能力直觉**——feature 靠 prompt 补 20% 还是模型只有 10% 得三个月后再看；失败时分辨 context、model 选错、还是任务本身超出能力。保持好奇，**推模型边界**。

> **金句 · Cat（封底）**
> **中文：** 一两年太久——为下一代模型建产品，别写三年蓝图。
> **原文：** A year or two is a really long time — build for the next generation of models.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 端到端评估 | E2E eval | SWE-bench 类整任务成败 |
| 触发评估 | triggering eval | 测 tool 是否该被调用 |
| 项目记忆文件 | CLAUDE.md | session 级 repo/个人 onboarding |
| 原型不是文档 | demo is not docs | 用原型感受 feature，别只写 spec |

**本章小结**

- E2E eval 防退化但难归因；triggering eval 管「该不该搜/该不该 todo」
- 三技巧：先原型、当新毕业生纠正、投 CLAUDE.md
- 路线图只看几个月：CLI + SDK 生态 + 非终端形态

---

## 总结

| 维度 | 要点 |
|------|------|
| 产品形态 | 终端极简 × hooks 深度；零 onboarding UX |
| Ship | 工程师 E2E 原型 → ~1000 人 dogfood → 爱就 fast track |
| 功能起源 | Todo/Plan 对抗 **eager 模型**，非最初蓝图 |
| Eval | E2E + triggering 都不银弹；社区负反馈同等重要 |
| AI PM | **模型能力直觉** 比堆 artifact 稀缺 |
| 与 vault | 接 [[Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿]]、[[IBM团队-Harness工程详解]] |

> **金句 · Cat（封底）**
> **中文：** 原型不是文档——先让 Claude Code 做给你看。
> **原文：** Demo is not docs.

---

## 概念索引

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| dogfood_loop | 内部试用闭环 | dogfood loop | 原型 → 千人流传 → 公开 |
| triggering_eval | 触发评估 | triggering eval | 测 tool 触发对不对 |
| claude_md | 项目记忆文件 | CLAUDE.md | session 注入的 onboarding |

---

## 附录

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1eyBgB2EbX/ingest`
- **ASR 主源**：`Recastory/workspace/bilibili-retranscribe/BV1eyBgB2EbX/article.md`（FunASR SenseVoice + cam++ · v2 · 45 段 · Speaker1=Peter / Speaker2=Cat）
- **video_description**：`{ingest}/video_description.md`（导读较薄，无专栏链）
- **B 站**：[BV1eyBgB2EbX](https://www.bilibili.com/video/BV1eyBgB2EbX/)
- **嘉宾反馈**：Twitter @_caw · GitHub issues
- **时长**：40:31

### 相关阅读

- [[Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿]] — Boris 增长与 token 叙事  
- [[IBM团队-Harness工程详解]] — harness verify / guardrails 对照  
- [[Loop-Agent Loop到底是什么]] — closed loop eval 与评分门槛  
- [[Manus创始人-深度干货-上下文工程的最佳实践]] — context 与 triggering 对照  
- [[OpenClaw创始人-我是如何使用OpenClaw的]] — 用户侧 harness 定制  
- [[MOC - Harness Engineering]] — Harness 横切索引  

### 收录说明

- **主持**：Peter · **嘉宾**：Cat Wu（Claude Code PM）  
- **主源**：英文 ASR v2；无 UP 专栏图稿（A 级 partial）  
- **版本**：canonical Host-Guest v3.2-asr（2026-07-03；原 v3 九段讲义已替换）
