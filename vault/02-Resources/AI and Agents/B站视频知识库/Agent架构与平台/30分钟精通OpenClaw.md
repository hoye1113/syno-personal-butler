---
title: "30分钟精通OpenClaw（5个真实用例+设置+内存）"
tags: ["ai_agent", "video_transcript", "bilibili", "skills", "memory", "hooks"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "skills", "memory", "hooks"]
created: "2026-06-09"
source: "B站视频 - Easonlee的AI笔记"
description: "Peter 用 Zoe 演示 OpenClaw 安全五步法、日历/文档/语音/日报/创作者周报五用例、Google Workspace OAuth 配置，以及 SOUL/USER/MEMORY 等 MD 人格与记忆文件。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/30分钟精通OpenClaw.md"
source_sha256: "2e284a1b8853a508df2a82984b7a092fd70a49ff9fd3a59738889e62bed9f0cf"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1kWctzeEYK/"
speaker: "Peter（OpenClaw 早期用户，Bot 名 Zoe）"
duration: 28:51
saved: 2026-07-02
updated: 2026-07-03
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1kWctzeEYK/ingest"
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1kWctzeEYK/article.md"
curate_method: "vskill-vault-curate v3-ingest（讲义 v3）"
asr_version: v2
---

# 30 分钟精通 OpenClaw（5 个真实用例 + 设置 + 内存）

## 先搞懂这一期

**这是什么节目？**  
Peter（频道主，Bot **Zoe**）的 **~29 分钟实操教程**。在 **Mac mini** 上现场 demo：**安全 setup → 5 个真实用例 → Google Workspace OAuth → memory/人格 MD 文件**。全程 Telegram texto，录制机就是 Zoe 所在的那台 mini。

**这期在回答哪三个问题？**

1. **OpenClaw 怎么设才相对安全？** Dedicated 机器、独立账号、audit、权限最小化？  
2. **日常到底能干什么？** 五个他真在用的 task 是什么？  
3. **怎么让 Bot 「像懂你的朋友」？** memory 存在哪、怎么编辑？

**用一条线串起来：**

Peter 养 Bot **Zoe**——OpenClaw 是他用过最好的 personal assistant，但仍是早期软件。**安全五步**：Mac mini 24/7 + Bot 独立 Gmail/Apple + `openclaw security audit --fix` + 按文件/日历最小共享 + **Bot 只服务你一人**（有人 vibe-coded app 漏过机密）。  
五用例：**Caltrain 查班次 → 日历 invite**、共享 Doc 写出行计划、**Edge TTS 语音** dad joke、**cron 日报**（天气/排期/Twitter + memory 催 shipping）、**周报邮件**（yt-dlp 抓 YouTube、Substack 无 API 用 browser admin 抓数）。  
Google Workspace：**GCP 建项目 → 逐个 enable API → OAuth consent → Desktop client 下载 JSON → Telegram 贴给 Zoe**。人格在本地 **IDENTITY/SOUL/USER/MEMORY/HEARTBEAT** + `memory/日期.md`——open loops、tensions、patterns 让 Bot 像朋友而不只是工具。

---

## 背景：这期在 AI Agent 大图里的位置

| 你可能已有的认识 | 这期补上的那一块 |
|----------------|-----------------|
| OpenClaw = 聊天 Bot | **cron + 工具链 + Workspace OAuth** 的 personal OS |
| AI 助理 = ChatGPT App | **Telegram texto + 语音 + 邮件周报**，24/7 在 dedicated 硬件 |
| Memory = 向量库黑盒 | **本地 MD 文件**（SOUL/USER/MEMORY/daily notes）可读可改 |
| 安全 = 别用 | **最小权限 + 独立账号 + audit** 的可操作清单 |

---

## 分话题讲

### 1. 安全五步（必做）

**说法（~00:22–03:33）：**

| 步 | 做法 | 现场细节 |
|----|------|----------|
| 1 | **Dedicated 电脑** 24/7 | Mac mini；免费 **keep-awake** app（描述区有链） |
| 2 | Bot **独立凭证** | Zoe 自有 **Apple ID + Gmail**，不碰主 Gmail（除你共享的文件） |
| 3 | Terminal 跑 audit | `openclaw security audit --fix` |
| 4 | **读**个人日历；**写**仅共享 Doc/Sheet | 不碰整个 Drive |
| 5 | **Bot 只服务你一人** | 不加群、不上公开站 |

**反面案例：** OpenClaw contributor 推文——有人把 Bot 接 **vibe-coded 公开 app**，**机密漏到公网**。Peter：** inevitably 会分享个人信息给 Bot，所以绝不共享 Bot**。

**和你何干：** Personal agent **权限越大，隔离越狠**——独立账号是底线，不是矫情。

---

### 2. 用例一：日历（最小权限版）

**前置（~03:33）：**  
Zoe 有 **自己的 Google Calendar**；Peter 把 **个人日历以 read-only 共享**给 Zoe。

**Telegram 演示原文（~03:33）：**

```
Today is Sunday, I'm thinking of going to the city with my family.
Can you look up Caltrain schedules this morning around 10am?
```

Zoe 浏览网页返回班次：**9:44、10:14、10:44…**

```
Send me a calendar invite for 10:14am Caltrain to the city.
Three hours. Call it "family trip to the ferry building".
```

**机制：** Zoe 在 **自己的日历** 建 event，把 Peter 主 Gmail 加为 **attendee** → Peter accept/decline。不如直接给主日历 API 强大，但 **安全**；比手开 Google Calendar 快。

**配置清单：**
1. Zoe 自有 Gmail + Google Calendar  
2. 你的日历 → **view only** 共享给 Zoe  
3. Zoe 可经自己的日历向你发 invite

**和你何干：** **Share read + Bot 发 invite** 是日历自动化的 pragmatic 折中。

---

### 3. 用例二：文档与表格

**Google Doc（~04:45）：**  
共享空白 Doc **「Peter-Zoe」**（Zoe 有 edit 权限）。

```
Why don't you put a plan for our trip in that doc,
including Caltrain, ferry building visit, and lunch after?
```

~2 分钟后 Doc 含：Burlingame Station 10:14 出发、ferry building 步行、午餐选项（Hog Island Oyster）、返程 tips。

**Google Sheet（~04:45–07:30）：**  
共享 **内容排期 Sheet**。

```
Add the title "Master OpenClaw in 20 minutes — 5 actual use cases"
to the cell next to 2/4.
```

Zoe **精确改指定 cell**——移动场景 texto 改 Sheet 比 ChatGPT 复制粘贴省太多。

**和你何干：** **按文件共享** 而非全盘 Drive，是 Workspace 集成模板。

---

### 4. 用例三：语音（Edge TTS）

**探索（~07:30）：**  
先问 Zoe TTS 选项 → 免费 **Microsoft Edge TTS**（300+ 声音：Jenny、Guy、Sonia…）vs 付费 ElevenLabs。

**配置口令：**

```
Set up edge TTS.
```

Zoe 会 **自己配 gateway**——「问 Bot 配 Bot」是 first-class 用法。

**演示：**

```
Send me a voice note telling me a funny dad joke.
```

（第一次可能只回文字，需强调 **through voice**。）  
笑话：*"Why don't scientists trust atoms? Because they make up everything."*

**双向：** Whisper 输入 + 语音回复——问候、口述摘要都行。

**和你何干：** 别自己啃 TTS config；**让 Bot 配 Bot**。

---

### 5. 用例四 & 五：Cron 简报

**Daily briefing（~10:12，cron job）：**

```
Give me my daily briefing.
(Avoid super sensitive info — I'm recording a tutorial.)
```

Zoe 汇总：**天气、日历、内容排期、Twitter 只读、memory**。  
个性化例句：*"You've been infrastructure mode all week… time to shift from building to shipping."*（Peter 整周末搭 infra，该发内容了。）

**链过的服务：** Google Calendar、内容排期 Sheet、Twitter **read-only**（无 write）。

**Weekly Inside Report（~11:43，邮件）：**  
发到 Peter 收件箱，含：

| 块 | 数据源 |
|----|--------|
| **选题建议** | 竞品频道研究（例：coworker、Ralph Wiggum pattern、Claude Code PM 类视频） |
| **YouTube 公数** | **yt-dlp** 拉自己 + 竞品频道 |
| **Substack 公数** | **无公开 API** → Zoe 作 **admin**，用 **browser** 抓 stats（Peter 核对过准确） |

**机制：** Cron = OpenClaw **定时任务**， texto 让 Zoe 配即可，不必手搓 dashboard。

**和你何干：** **Cron + 多数据源** 是 personal agent killer feature；Substack 案说明 **browser tool** 补 API 缺口。

---

### 6. Google Workspace 接入（痛苦但值得）

**前提：** Zoe 自有 Gmail；你已 **按文件/日历共享**（见用例一、二）。

**让 Zoe 向导（~13:14，Peter 口述 ~30 分钟搞定）：**

```
Pretend you don't have Google Workspace access yet.
I've given you a dedicated Gmail and shared my calendar and select files.
How do I set up a Google Cloud project so you can view and edit my stuff?
```

**逐步清单（GCP Console）：**

| 步 | 操作 |
|----|------|
| 1 | [Google Cloud Console](https://console.cloud.google.com/) → **New Project**（demo 名：`Zoe Demo`） |
| 2 | **APIs & Services → Library** → **逐个 Enable**：Gmail、Calendar、Drive、Docs、Sheets、Slides… |
| 3 | **OAuth consent screen** → External → App name `Zoe Demo` → test user 填 Zoe 邮箱 |
| 4 | **Credentials → Create OAuth client → Desktop application** → 下载 **JSON** |
| 5 | Telegram **粘贴 JSON 给 Zoe** → `Set up the remaining OAuth process` |
| 6 | （易漏）**Scopes**：Gmail modify、Calendar 等；**把你的邮箱加为 test user**——卡住就 **截图问 Zoe** |

Peter 承认 GCP UI **很难用**；**截图 + Zoe 指路** 是正常 workflow。描述区有 **完整图文 post** 可逐步跟。

**和你何干：** 预算 **30 分钟 + Bot 向导**；第二次部署写进 runbook。

---

### 7. Memory 与人格：本地 MD

**目录（~18:02，演讲示 `clawdbot` 文件夹，以 OpenClaw 实际路径为准）：**

| 文件 | 作用 | 现场内容摘录 |
|------|------|-------------|
| **IDENTITY.md** | 名字、emoji、语气 | Zoe；warm, sharp, funny；wave emoji |
| **SOUL.md** | 价值观、voice rules | 「你不是 chatbot，你在成为 someone」；禁 AI 腔、slo words、question-answer 格式、「isn't about X it's about Y」；**主动语态**、少 hedge、**不用 emoji** |
| **USER.md** | 关于你的信息 | 目标、能量来源/消耗等（Peter 也在 Google Doc plan 里有一份） |
| **MEMORY.md** | 长期 curated 记忆 | 工具清单（Workspace、GitHub、Twitter、Brave search、Telegram…）；**open loops / tensions / patterns** |
| **HEARTBEAT.md** | 每 **30 分钟**检查 ongoing tasks | — |
| **memory/YYYY-MM-DD.md** | 每日对话 recap | 例：吐槽 Wicked Part 2 不如 Part 1 |

**MEMORY 高级块（~21:18）：**

| 块 | 含义 | 用途 |
|----|------|------|
| **Open loops** | 提过但未闭环的承诺/目标 | daily briefing 催大目标 |
| **Tensions** | 公开自我 vs 私聊矛盾 | 帮你发现 discrepancy |
| **Patterns** | Bot 观察到的行为模式 | 例：「building energizes you」 |

**维护方式：** 直接 **编辑 MD**，或 chat 让 Zoe 更新；可让 briefing **读近几日 memory/日期.md** 找 patterns。

**和你何干：** Personal agent 差异化在 **SOUL/MEMORY 策展**，不在模型名；**保持文件干净、及时更新**。

---

## 关键概念（读完应能解释）

| 中文 | 英文 | 白话 |
|------|------|------|
| Zoe | Zoe | Peter 的 OpenClaw Bot 实例 |
| security audit --fix | `openclaw security audit --fix` | OpenClaw 内置安全加固命令 |
| Dedicated credentials | Dedicated credentials | Bot 独立 Gmail/Apple，与主账号隔离 |
| Edge TTS | Edge TTS | 免费 Microsoft 语音合成，300+ 声音 |
| Cron jobs | Cron jobs | OpenClaw 定时任务（日报/周报） |
| yt-dlp | yt-dlp | 拉 YouTube 公开视频数据 |
| SOUL / USER / MEMORY | SOUL / USER / MEMORY | 人格、用户、长期记忆 MD 文件 |
| Open loops | Open loops | 未闭环承诺/目标，供 Bot 提醒 |
| OAuth Desktop client | Desktop OAuth client | GCP 下载 JSON 给 Bot 完成 Workspace 授权 |
| HEARTBEAT | HEARTBEAT.md | 每 30 分钟扫一眼有没有进行中的任务 |

---

## 值得记住的原话

> **"OpenClaw is generally the best personal AI assistant that I've ever used... still really early software."**  
> 是我用过最好的 personal AI；但仍是很早期的软件。

> **"Run it on a dedicated computer... its own credentials... security audit... never share your bot."**  
> 专用机、独立账号、安全审计、绝不共享 Bot。

> **"Someone's vibe coded app started leaking confidential stuff to the public."**  
> 有人把 Bot 接公开 app，机密漏了。

> **"It's not as powerful as full calendar access, but this is the safe way."**  
> 没全权日历强，但这是安全做法。

> **"Just ask Zoe to set up edge TTS — it will do the whole thing for you."**  
> 让 Zoe 配 TTS，它全包。

> **"Substack has no public API... added Zoe as admin... uses the browser."**  
> Substack 无 API；Zoe 当 admin 用浏览器抓数。

> **"Memory and personality is managed through a bunch of local MD files."**  
> 记忆和人格就是一堆本地 MD 文件。

> **"Not just something that gets stuff done — make a friend that guides you."**  
> 不只是干活，要做成会引导你的朋友。

---

## 小结

**这期最核心的判断：** OpenClaw 的个人助理价值 = **安全 isolated setup + Telegram/voice/cron 日常链 + Workspace 最小共享 + MD memory 策展**；早期但 **「问 Bot 配 Bot」** 把 GCP OAuth 等摩擦压到可接受。

**要点：**
- **安全五步** + **五用例** 可直接抄作 personal agent checklist。  
- 日历：**read-only 共享 + Zoe 日历发 invite**；Doc/Sheet：**按文件共享**。  
- Cron：**daily briefing** 链 calendar + Sheet + Twitter read；**weekly report** 用 yt-dlp + browser admin。  
- GCP：**Zoe Demo 项目 → 逐个 enable API → Desktop JSON → Telegram 贴给 Zoe**。  
- **SOUL 禁 AI 腔 + MEMORY open loops** 是「像朋友」的关键。

**和 vault 的关系：** OpenClaw 入门线，接 [[OpenClaw创始人-我是如何使用OpenClaw的]]、[[OpenClaw实战-从本地到K8S部署]]、[[Taven创始人-将OpenClaw嵌入产品的实战经验]]。

---

## 行动启示

1. **Mac mini/旧机 + 独立 Gmail** 起 OpenClaw，跑 **`openclaw security audit --fix`**。  
2. **日历 read-only 共享**，跑通 Caltrain 式 texto → invite。  
3. **单 Doc + 内容 Sheet 共享**， texto 改 Doc / 改指定 cell。  
4. **`Set up edge TTS`**，测 voice note dad joke。  
5. **加 daily cron briefing**，链 calendar + 一个 Sheet + Twitter read-only。  
6. **Weekly report**：yt-dlp（YouTube）+ browser admin（Substack 无 API 时）。  
7. **GCP OAuth 让 Zoe 向导**；JSON paste Telegram；scopes / test user 卡住就截图问。  
8. **编辑 SOUL.md**：禁 AI 腔、主动语态、你的偏好写死。  
9. **MEMORY 加 open loops**，让 daily briefing 催闭环大目标。  
10. **Bot 永不进群、不接公开站**。

---

## 相关阅读

- [[OpenClaw创始人-我是如何使用OpenClaw的]] — Peter Steinberger 创始人视角  
- [[OpenClaw实战-从本地到K8S部署]] — 容器化与团队部署  
- [[Taven创始人-将OpenClaw嵌入产品的实战经验]] — Pi/OpenClaw 企业嵌入  
- [[WorkOS-创建和使用Skills方法论]] — Skills 与扩展  
- [[IBM团队-Harness工程详解]] — harness、安全与 verify  

---

## 来源

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1kWctzeEYK/ingest`
- **video_description**：`{ingest}/video_description.md`
- **视频**：[BV1kWctzeEYK](https://www.bilibili.com/video/BV1kWctzeEYK/)（B 站 *Easonlee的AI笔记*）  
- **讲者**：Peter（OpenClaw 早期用户，Bot：Zoe）  
- **时长**：~28:51  
- **转写**：Recastory `bilibili-retranscribe/BV1kWctzeEYK/`（FunASR SenseVoice + cam++，**asr v2** 48 段）  
- **版本**：v3 读者向讲义加深（2026-07-03）
