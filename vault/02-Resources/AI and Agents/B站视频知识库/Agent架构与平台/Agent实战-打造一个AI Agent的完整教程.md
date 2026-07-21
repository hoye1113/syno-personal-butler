---
title: "Agent实战：打造一个AI Agent的完整教程"
tags: ["ai_agent", "video_transcript", "bilibili", "skills", "mcp", "harness_engineering", "context_engineering", "claude_code", "codex"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "skills", "mcp", "harness_engineering", "context_engineering", "claude_code", "codex"]
created: "2026-06-09"
source: "B站视频 - Easonlee的AI笔记"
description: "Remi 用 ~59 分钟从零讲清 chat vs agent、Observe-Think-Act 循环、harness、agents.md、memory.md、MCP 与 Skills，现场搭 Executive Assistant 并演示跨 Claude Code/Codex/Antigravity 同一套本地 markdown 栈。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Agent实战-打造一个AI Agent的完整教程.md"
source_sha256: "325b1c526c234040fbd891a18df84b24439fe2f096e89d29443d25ca0e2a9a06"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1PnQfBvEs3/"
speaker: "Remi Gasiglia（AI Agent 教育者）/ Greg Eisenberg（主持人）"
duration: 58:54
saved: 2026-07-02
updated: 2026-07-03
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1PnQfBvEs3/ingest"
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1PnQfBvEs3/article.md"
curate_method: "vskill-vault-curate v3-ingest（讲义 v3）"
spot_check: 2026-07-02
asr_version: v2
---

# Agent 实战：打造一个 AI Agent 的完整教程

## 先搞懂这一期

**这是什么节目？**  
Greg Eisenberg 播客上的 **~59 分钟 Agent 入门 crash course**。嘉宾 **Remi Gasiglia** 面向完全新手，用「公司部门 + 本地文件夹 + .md 文件」把 agent 概念拆到能动手搭。

**这期在回答哪三个问题？**

1. **Agent 和 Chat 到底差在哪？** 为什么 founders 用 agent 号称日常 **10–20×** 产出？  
2. **Agent 里面在转什么？** Loop、harness、LLM、工具、上下文各是什么关系？  
3. **初学者今天能搭什么？** 如何用 **agents.md + memory.md + MCP + Skills** 做出一个 Executive Assistant，并扩到整家公司？

**用一条线串起来：**

AI 进入 **stage two：从 chat 到 agent**。Chat = **question → answer**（乒乓球）；Agent = **goal → result**（你给任务，它 plan → execute → 交付）。  
内核是 **Observe → Think → Act** 循环（~04:15），跑在 **agent harness**（Claude Code / Codex / Cowork / Manus 都是不同「车」）。  
搭 agent = ** onboard 员工**：先 **agents.md**（角色 + 业务上下文，~13:42），再 **memory.md**（跨 session 偏好），**MCP**（~23:10）接 Gmail / Calendar / Notion / Stripe，**Skills**（~32:45）把重复 SOP 封成 `.skill`。  
Remi 的工作区 = 每家公司一个文件夹，下面 **Executive Assistant / Head of Marketing** 等子目录，各自 **CLAUDE.md + skills + MCP + context**；未来（~45:20）是人人一套 **AIOS**，人不再进 SaaS，只坐在 harness 里指挥。

---

## 背景：这期在 AI Agent 大图里的位置

| 你可能已有的认识 | 这期补上的那一块 |
|----------------|-----------------|
| Agent = 会调工具的 LLM | **Chat vs Agent 范式** + **Observe-Think-Act** 可观察循环 |
| Harness = 外壳框架 | **学车比喻**：会开一辆就能换 Claude Code / Codex / Antigravity |
| Prompt 工程 | **Context 工程**：prompt 可以极短（「写 cold email」），靠 agents.md 撑质量 |
| MCP 是连接器 | **翻译器比喻**（Ross Mikita）：LLM 说英语，Notion / Gmail 各说各语，MCP 居中翻译 |
| Skills 是 Claude 功能 | **SOP for AI**：讲一次流程，永不重复解释；与 memory.md 分工不同 |

---

## 分话题讲

### 1. Chat vs Agent：从乒乓球到 goal → result

Chat model = **question → answer**，你问它答，活还是你干。Agent = **goal → result**：你给任务（「给 Greg 建极简 portfolio 站并 preview」），它自己规划、执行、交付。

Remi 称很多 founder / 员工用 agent 后 **10–20×** 日常产出；堆到周、月、年，和仍只用 chat 的人差距会拉开。

**和你何干：**  
别被「AI agent」营销词糊住——判断标准就一个：**你给的是问题还是可验收的目标？**

---

### 2. Agent Loop：Observe → Think → Act（~03:00–04:15）

Prompt 进去后 agent 反复：**观察**（读 workspace 文件、工具结果）→ **想**（下一步做什么）→ **行动**（写代码、搜 web、调 MCP）→ 再观察，直到任务完成。

**三平台同 prompt 现场 demo：**

| 平台 | 工作目录 | 可见性 |
|------|----------|--------|
| Claude Code | `demo1/` | **loop 步骤最可见**（research → plan → code → server → screenshot 自检） |
| Codex | `demo2/` | 同逻辑，展示较弱 |
| Antigravity | `demo3/` | **最快出 localhost preview** |

**示例 prompt：**

```
Build a minimalist portfolio site for Greg Eisenberg.
Spin it up in preview mode so we can see what you've done.
```

**Greg portfolio loop 逐步（Claude Code）：**

1. **Observe**：空 workspace，无 Greg 信息  
2. **Think**：「Who is Greg Eisenberg?」  
3. **Act**：调 **Perplexity MCP** 做 research（Remi 预连，非手动临时接）  
4. **Observe**：research 结果回灌  
5. **Think**：写 plan → 写 HTML → 起 local server  
6. **Act**：**截图网站**，对照 prompt 自检是否完成  
7. 结论 task complete → 输出 preview URL

**完成条件由 prompt 定**，例：research 任务要求 `compile 10 sources` + `create report as PowerPoint`，满足才停。

**和你何干：**  
设计 agent 任务时，**写清「什么叫 done」**；否则 loop 不知道何时停。

---

### 3. Agent 四组件 + Harness = facilitating loop 的平台

Agent = **LLM（脑）** + **Loop（不停直到完成）** + **Tools** + **Context**。  
**Agent harness** = 让上述 loop 跑起来的应用（Claude Code、Codex、Cowork、Manus、OpenClaw 等）。

**学车比喻（~08:06）：** 先学「开车」（Observe-Think-Act、context、MCP、skills），再换 Toyota / Range Rover（不同 harness）；差在 seat warmer、cruise control，**踏板一样**。

**安全与权限（~07:36）：**

- Claude Code / Codex / Antigravity：大厂背书，默认较安全  
- **OpenClaw = Wild West**  
- Meta 广告预算等高风险任务：**scoped tool 权限**——只读、限额、最坏情况可接受

**和你何干：**  
**投资学概念，不是押宝单一产品**；本地 markdown 栈可跨 harness 迁移。

---

### 4. agents.md：像 onboard 新员工的 system prompt（~12:40–16:25）

Chat 有 **自动 cloud memory**（ChatGPT / Claude 会偷偷记你）；**Agent 没有**——必须显式给上下文。

**文件名因 harness 而异，概念相同：**

| Harness | 文件名 |
|---------|--------|
| Claude Code | `CLAUDE.md` |
| Codex / OpenClaw | `AGENTS.md` |
| Gemini | `GEMINI.md` |

**agents.md 放什么：** 角色、你是谁、业务、客户、工具偏好（Notion / Stripe 等）、语气。**每次 session 的 Observe 步自动加载**。

**空文件夹 vs 有 agents.md：**

- 空文件夹 + `Write me a cold email` → agent 反问：卖什么？给谁？什么 tone？  
- 拖入预填 agents.md 后，同一句 prompt → 直接产出带 Notion/Stripe 语境的邮件

**生成 agents.md：** 用 chat 访谈——「问我问题，帮我写 agents.md 文件」。

**大 context 模式：**

```
Executive Assistant/
├── CLAUDE.md          # ≤200 行；底部写：每次任务前先读 context/
└── context/
    ├── brand_voice.md
    ├── ideal_customer.md
    └── ...
```

默认不会自动加载 `context/` 下全部文件——须在 **CLAUDE.md 里显式指向**（Obsidian 第二大脑同理：CLAUDE.md 写「去 vault 查 context」）。

**和你何干：**  
**context 工程 > prompt 工程**——prompt 可以 stupidly simple。

---

### 5. memory.md：跨 session 的自改进循环（~16:25–25:31）

Session 内说「favorite color is lavender」→ agent 口头「got it noted」→ **新 session 全忘**。不是坏了，是设计如此。

**Remi 加在 CLAUDE.md 底部的规则模板（ASR 原意）：**

```markdown
Read memory.md for preferences learned over time.
When I correct you or you learn something new, update the relevant section in memory.md.
Keep memory.md current — update in place, replace outdated info (don't stack contradictions).
Optional: only save substantial corrections, not silly trivia.
```

**配套文件：** 同目录新建 `memory.md`（可从 CLAUDE.md duplicate 后清空业务 context，只留 preference 结构）。

**演示：**

1. Session A：`My favorite color is lavender` → agent 写进 memory.md  
2. Session B（同文件夹）：`What is my favorite color?` → 正确回答 lavender  
3. 纠正落款：`Never sign off with Cheers, use Warm regards` → memory 更新 → 后续 session 自动遵守

**OpenClaw / Manus** 有内置 memory，底层仍是同一思路。

**最佳实践：**

- **CLAUDE.md ≤200 行**；memory 可要求只存 substantial 修正  
- **memory = 偏好与纠正**；**agents.md = 稳定身份与业务事实**——别混  
- **skills = 流程 SOP**——proposal 格式、referral 步骤等不进 memory

**和你何干：**  
Cowork 效果差，常见原因是 **没配 CLAUDE.md + memory.md**。

---

### 6. MCP：工具层的标准翻译器（~25:31–31:45）

Harness 默认只有 web search；Gmail、Calendar、Notion、Granola、Stripe 等走 **MCP（Model Context Protocol）**。

**Ross Mikita 比喻：** Claude 说英语；Notion 西班牙语、Gmail 法语、Slack 中文——MCP 是 **translator**，agent 仍说「英语」。

**连接方式：**

- **Cowork**：Settings → **Browse connectors** → OAuth 一键（Gmail、Calendar 等）  
- Codex / Manus / Perplexity Computer：同类 connectors 面板  
- Claude Code：MCP 配置后，在 Executive Assistant 文件夹里演示

**Remi 预连：** Gmail、Google Calendar、Granola（会议笔记）、Notion、Stripe。

**Executive Assistant 一条龙 demo（Claude Code + VS Code）：**

Remi 事先：给自己发 fake prospect 邮件 + 在 Granola 录 fake 会议。

**一句 prompt：**

```
Summarize my inbox from today.
Review my meeting notes with [prospect] from today.
Draft an email sending the proposal and creating a Stripe payment link.
Set up the project in Notion.
```

**Agent 实际步骤：** Granola 读会议 → Stripe 建 product/link → Notion 建项目 → Gmail 起草邮件（可再 `send this email` 发出）。

**和你何干：**  
Executive Assistant 的价值在 **MCP 串联**，不是「总结邮件」本身。

---

### 7. Skills：AI 的 SOP，讲一次永不重复（~31:45–43:49）

Skill = **Standard Operating Procedure for AI**。无 skill 时写 proposal 要来回改格式 **15–30 分钟**；这些细节 **不该 clog memory**。

**存储位置（Claude Code）：** 隐藏目录 `.claude/skills/`，每个 skill 含 `.skill` 文件（markdown 流程）+ 可选 `references/`。

**创建两法：**

| 方法 | 操作 |
|------|------|
| 1. 有素材 | 上传课程 transcript →  invoke **skill creator skill**：`Based on this course on viral hooks, build me a viral hook skill` → 自动打包 references（如 hook formulas） |
| 2. 手动跑通 | 完整走一遍流程（2 小时 ads 分析等）→ `Use your skill creator skill to package what we just did as a skill` |

**Sebastian refer skill（live demo）：**

```
Can you draft an email referring [prospect] to Sebastian?
Sebastian's email is [address] — he runs an AI automation agency.
→ Then: Use skill creator to create a Sebastian refer skill.
```

**Ads analyst skill（~39:13–40:20）：**

- Invoke：`Ads analyst` + 粘贴 **Meta Ad Library URL**  
- 行为：爬 **~220 条广告** + landing page **截图** → visual/copy/landing 分析 → **master report**  
- Remi 称 agency 时代手工要 **3–4 小时**；skill 化后一键

**Skill 链式（~40:54）：**

- `morning brief skill` 里写：若有 podcast 会议 → 调用 `podcast research skill`  
- **定时任务**：Cowork / Claude Code → New task → `Run my morning briefing skill` → **每天 9:00**

**其他 scheduled 例子：** 每 3 小时 scrape Carmax/Cars.com/Autotrader，有车匹配通知（买车 skill）。

**OpenClaw Meta ads bot（~42:04–43:49）：**

- 后端：`agents.md` + `memory.md` + `soul`（personality）+ `identity`  
- **~15 skills**（ad creative、copywriting 等）+ **cron jobs** + MCP  
- Remi 建议：**先在 Claude Code 跑稳 Executive Assistant + skills，再迁 OpenClaw** 自治 harness

**Global vs Project（~45:20–46:11）：**

| 作用域 | 例子 |
|--------|------|
| **Global** | `Truncate` skill（删冗余句，每 session 可用）；global MCP |
| **Project** | `Sebastian refer` 只在 Executive Assistant；marketing 文件夹不需要 |

同理：**global vs project 的 CLAUDE.md、MCP**。

**和你何干：**  
**每周 skill 化 3–5 个小流程** → compound 成 life/work 自动化；OpenClaw 放第二步。

---

### 8. 文件夹 AIOS 与未来工作方式（~11:41–12:40, ~28:47–29:29）

**Remi 工作区结构：**

```
workspaces/
└── [Company]/
    ├── Executive Assistant/   ← 本期重点
    │   ├── CLAUDE.md
    │   ├── memory.md
    │   ├── context/
    │   ├── skills/ (project)
    │   └── MCP (project)
    ├── Head of Marketing/
    ├── Content Team/          ← viral hooks skill、ads analyst、newsletter research
    └── orchestrator/          ← 顶层 CLAUDE.md 管全局
```

**AIOS 愿景：** Markdown on disk = future-proof；LLM 吃 md 比 PDF/Docs 顺。Remi **不再打开 Gmail/Notion 界面**，只坐 Claude Code + VS Code 中枢。Cody Schneider：**未来员工自带 AIOS + skills = 100× employee**。

**Harness 入门顺序：**

1. **Cowork**（最易 UI）或 Perplexity Computer / Manus  
2. **Claude Code / Codex** 学概念 + 建 processes  
3. **OpenClaw**（最难）—— processes 在 Claude Code 跑稳后再迁

**和你何干：**  
从 **一个 Executive Assistant 文件夹** 开始：interview 生成 CLAUDE.md → 连 2–3 MCP → 每周封 skill。

---

## 关键概念（读完应能解释）

| 中文 | 英文 | 白话 |
|------|------|------|
| 聊天 vs 代理 | Chat vs Agent | 问答 vs 目标到结果 |
| 观察-思考-行动 | Observe-Think-Act | Agent 单圈：观察→思考→行动 |
| 代理安全框架 | Agent harness | 跑 agent loop 的平台（Claude Code 等） |
| 角色文档 | agents.md / CLAUDE.md | 始终加载的岗位与业务上下文 |
| 上下文工程 | Context engineering | 把业务装进 agent，prompt 可极简 |
| 记忆文件 | memory.md | 跨 session 偏好与纠正，需规则驱动更新 |
| 模型上下文协议 | MCP | 工具与 LLM 之间的标准协议 |
| 技能包 | Skill | 可复用流程包（SOP），非 memory |
| 全局 vs 项目 | Global vs Project | skill / MCP / CLAUDE.md 作用域 |
| 个人 AI 操作系统 | AIOS | 个人 / 公司 markdown + agent 操作系统 |

---

## 值得记住的原话

> **"A chat model is question to answer. But then an agent is goal to result."**  
> Chat 是问答；Agent 是目标到结果。

> **"Chat is ping pong back and forth. An agent is you give it a goal."**  
> Chat 像乒乓球；Agent 是你给一个目标。

> **"The agent harness is just applications where this loop is facilitated."**  
> Harness 就是让 loop 跑起来的应用。

> **"Learn to drive… jump in any car."**  
> 学会开车，换什么 harness 都能开。

> **"Now it's all about context engineering… your prompts can be stupidly simple."**  
> 现在是上下文工程，prompt 可以傻简单。

> **"Skills are SOPs for AI — explain something once, never explain again."**  
> Skill 是 AI 的 SOP，讲一次就够。

> **"MCP sits as a translator… Claude speaks English, Notion Spanish, Gmail French."**  
> MCP 是翻译器，工具各说各语。

> **"Build skills for tiny manual processes each week… automate your entire life."**  
> 每周 skill 化小流程，compound 成全自动。

---

## 小结

**这期最核心的判断：** Agent 时代的关键不是更长的 prompt，而是 **harness + 本地 markdown 栈（agents.md / memory.md / skills / MCP）**；同一套文件夹可在 Claude Code、Codex、Cowork 间切换，像换车不换驾照。

**要点：**
- **Loop + 四组件 + harness** 是 universal 语法；产品名会变，结构不变。  
- **memory 不会自动持久**——须写 CLAUDE.md 规则驱动更新；与 **skills（流程）** 分工。  
- 从 **Executive Assistant + 1–2 MCP + 每周几个 skill** 起步；OpenClaw 放第二步。

**和 vault 的关系：** Agent 入门主入口，接 [[IBM团队-Harness工程详解]]、[[WorkOS-创建和使用Skills方法论]]、[[Manus创始人-深度干货-上下文工程的最佳实践]]。

---

## 行动启示

1. **写 CLAUDE.md**：用 chat 访谈生成角色、业务、工具偏好；大 context 放 `context/` 并在 md 里指向。  
2. **加 memory 规则**：纠正语气、落款、工具习惯 → 更新 memory.md，别指望 session 记忆。  
3. **连 2–3 个 MCP**：从 inbox + calendar 或 Notion 开始，练一句多工具任务。  
4. **每周封 1 个 skill**：手动跑通的流程（proposal、referral、daily brief）→ skill creator。  
5. **权限最小化**：广告、支付、发信类 agent 先只读或 draft，再逐步放权。

---

## 相关阅读

- [[IBM团队-Harness工程详解]] — harness 可靠性、verify、guardrails  
- [[WorkOS-创建和使用Skills方法论]] — Skills 工程化与 eval  
- [[3-5 Skills - Agent 时代的知识分发系统]] — Skills 原理与 MCP 对比  
- [[Manus创始人-深度干货-上下文工程的最佳实践]] — context 爆炸与 offload / reduce  
- [[Claude Code实战-结合Obsidian打造第二大脑]] — 同一 markdown 栈 + Obsidian 深度用法  
- [[MOC - Agent Theory and Design]] — Agent 理论总索引  

---

## 来源

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1PnQfBvEs3/ingest`
- **video_description**：`{ingest}/video_description.md`
- **视频**：[BV1PnQfBvEs3](https://www.bilibili.com/video/BV1PnQfBvEs3/)（B 站 *Easonlee的AI笔记*）  
- **嘉宾**：Remi Gasiglia；主持人 Greg Eisenberg  
- **时长**：~58:54  
- **转写**：Recastory `bilibili-retranscribe/BV1PnQfBvEs3/`（FunASR SenseVoice + cam++，**asr v2** 57 段）  
- **版本**：v3 读者向讲义加深（2026-07-03）
