---
title: "Loop：Agent Loop 到底是什么？"
tags: ["ai_agent", "video_transcript", "bilibili", "loop_engineering", "harness_engineering", "ai_coding"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "loop_engineering", "harness_engineering", "ai_coding"]
created: "2026-07-02"
source: "B站视频 - Startup Ideas Podcast（Easonlee 转载）"
description: "Greg × Ross Mikita：HITL 与 Agent Loop 图解、开放式 autoloop 的 token 陷阱、Greptile 评分驱动的 code review 闭环——Human-in-the-loop is the best loop。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Loop-Agent Loop到底是什么.md"
source_sha256: "19335a22135318b42fb63b4d3bcc1be28a84950c705b764c8c9e9e9a60376389"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1cVjN6oEwx/"
source_original_date: 2026-06-10
host_name: "Greg"
guest_name: "Ross Mikita"
guest_title: "YouTube @Ross Mikita · agentic loop 实践者"
material_tier: A
content_form: dialogue
dialogue_fidelity: source
question_source: transcript
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1cVjN6oEwx/ingest"
speaker: "Greg / Ross Mikita"
duration: 22:33
saved: 2026-07-02
updated: 2026-07-03
transcript_source: "bilibili-retranscribe/BV1cVjN6oEwx/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Host-Guest canonical (ASR primary)
speaker_inference: "asr_heuristic + video_description"
speaker_confidence: medium
factual_status: partial
factual_reviewed: 2026-07-13
verification_basis:
  - transcript
  - transcript_json
unresolved_facts:
  - "人物映射与 Greptile 评分细节尚未由原节目页逐项确认。"
concepts:
  - id: hitl
    zh: 人在回路
    en: human-in-the-loop
    one_line: 人每步 prompt、测试、审批
  - id: agent_loop
    zh: 智能体循环
    en: agent loop / agentic loop
    one_line: 人 fire 一次，产出喂回 agent 自迭代
  - id: closed_loop
    zh: 受限反馈循环
    en: closed loop
    one_line: 固定 scorer + 明确 stop 条件
  - id: grep_loop
    zh: Greptile 审查循环
    en: grep loop
    one_line: 读 review 分 → fix → push 直到 ≥4/5
---

# Loop：Agent Loop 到底是什么？

**Host：** Greg（Startup Ideas Podcast）  
**Guest：** Ross Mikita（YouTube 同名）  
**形态：** Host-Guest canonical v3.2（**ASR 主源** · 中文口语化）  
**辅源：** B 站简介导读时间戳 · 无专栏主源  
**B 站：** [BV1cVjN6oEwx](https://www.bilibili.com/video/BV1cVjN6oEwx/)

---

## 开场

人人都在聊 agentic loop，但 Ross 认为多数人**要么不懂，要么 hype 过头**。这期他要讲三件事：loop 是什么、为什么 Boris/Peter 那套对普通人可能是**可怕错误**、以及他**唯一 daily 在用的** concrete 用例。

四章预告：**HITL vs Agent Loop 一张图** → **开放式 App Loop 为何像老虎机** → **slash goal 适用边界** → **Greptile + grep loop 的 closed loop**。

---

## 01 HITL 与 Agent Loop：一张图讲清差别

**Greg：** 听众听完要能搞懂 loop 是什么、大佬们为何狂热、以及为什么对大多数人可能是 mistake——除非你有钱可烧。最后你还会秀一个今天就能用的例子。先画个图？

**Ross：** 左边是你我这种**普通 builder**——用 Cursor、Claude、Codex 都行。你 **prompt** → agent **出结果** → 你**看、测、再 prompt**。做 todo app：先做 landing，满意再做 auth，再做 backend。**每一步都是你 govern**。这叫 **human-in-the-loop**——agent 在干，但**导演是你**。

右边是 Boris、Peter 那帮人讲的 **agent loop**：人只在环里**出现一次**——fire 一份 `spec.md` / `PRD.md`——之后 agent 产出 → **结果喂回给自己** → 继续改，**人不在中间**。像雇了个从不问你的超级 dev，闷头做到「done」。

**Greg：** 听起来很 future。错在哪？

**Ross：** 理论酷，实践对 meaningful product **很容易 terrible wrong**。后面细说。

> **金句 · Ross**
> **中文：** 人在环里，是目前最好的 loop。
> **原文：** Human in the loop is the best loop.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 人在回路 | human-in-the-loop (HITL) | 你每步 prompt、测试、审批 |
| 智能体循环 | agent loop / agentic loop | 你只启动一次，agent 自反馈迭代 |
| 开环 | open loop | 目标模糊、反馈靠 agent 自己猜（建整个 app） |
| 闭环 | closed loop | 固定 feedback engine + 明确 stop 条件 |

**本章小结**

- HITL = 你是导演；Agent Loop hype 版 = 你只点火，后面人不插手
- 差别不在工具名，在**中途有没有人审批**

---

## 02 开放式 App Loop：token 老虎机与「计划盖不全」

**Greg：** 给 agent 一份 markdown，让它 loop 到完——像 Full Self-Driving， Miami 一路 GO 到 Charleston，中途不能下车吃 fried chicken。Startup 得**给人看半成品换反馈**，open loop 缺这一环。你 basically 说这就是 slot machine？

**Ross：** **Basically。** 几个硬理由：

**① Token**——不是 $200/月 tier 就别想。Boris/Peter 可以 unlimited tickets 做 research；你烧完额度等于**给即将万亿市值的公司捐钱**。Peter 推文：一个月 **130 万美元 token**。我有 unlimited 吗？没有。

**② Plan 永远不够**——雇个聪明 dev **不 consult 你**闷头做完，架构、UI、edge case 全错假设。做 agency 的都懂：「你还漏了这个。」人类互相都 extract 不全需求，何况一份 `.md`。

**③ 老虎机**——Ralph loop、slash goal 各工具名字不同，本质一样：高层 prompt + attach markdown +「build entire thing, don't stop」。适合 **experiment**（他做过 Among Us AI benchmark simulator，1.5 小时，细节错无所谓）；不适合**有品味的 SaaS**。

**④ 大佬背后有 meta-harness**——我猜 Boris/Peter 有 **test suite、browser screenshot、insane harness**，不是 slash goal 三个字。普通人没有。

**Greg：** 不是说他们恶意——他们必须 experiment self-healing agents。问题是 content 教普通人 copy。

**Ross：** 「Oh this is marshmallow crispy」——除非你想捐 token。**现在不对普通 startup builder 推荐 open app loop**。将来 maybe，**不是 2026 年 6 月**。

> **金句 · Ross**
> **中文：** （开放式 app loop） basically 老虎机。
> **原文：** It's basically a slot machine.

> **金句 · Ross**
> **中文：** 你以为 plan 盖全了——永远不会。
> **原文：** You think your plan doc covers everything — it never does.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代币黑洞 | token burn | 开放式 loop 预算失控 |
| 元.harness | meta-harness | 测试、浏览器截图等让 loop 能跑的外层 |
| 老虎机效应 | slot machine effect | 烧 token 赌一次「能不能成」 |

**本章小结**

- Open loop 缺 mid-flight 用户反馈——与 startup 迭代方式冲突
- Plan doc 盖不全 + 无 fixed feedback → loop 不收敛，只烧钱
- 大佬 narrative 背后常有**你没有的 harness 预算**

---

## 03 Slash goal 与 hype 叙事的边界

**Greg：** Slash goal 也在 trending——跟 loop 一回事吗？

**Ross：** **同一模式**。Cursor 叫 `/loop`，别的叫 `/goal`：slash → 给 prompt → 可选 attach markdown →「don't stop until done, no mistakes」。

**适用：**
- ✅ Experimentation、throwaway prototype、不在乎审美
- ❌ 有意义的产品 + 有限 budget + 要品味

教 listener「用 loop 做百万美元 App」——**misleading**。Output **binary**（SEO 300 页同模板、code review 过/不过）才有 room for loop；**creative product 不是**。

**Greg：** Boris/Peter 将来 maybe 行？

**Ross：** **不否认**将来 meta-harness 成熟后 open loop 可能 work——**不是现在**。我不 fault 他们；我 fault 的是**教所有人 copy**。

**本章小结**

- Slash goal = slash loop = 一键 autoloop，名字不同而已
- Binary 任务可 loop；creative SaaS 默认 HITL
- 内容创作者别把 research budget 包装成 universal playbook

---

## 04 Greptile + grep loop：唯一 daily 用的 closed loop

**Greg：** 你 said 有一个 side 你 actually use——code review？

**Ross：** 栈：**Cursor**（harness）+ **GitHub** + **Greptile**（code review agent；CodeRabbit 同类）。每次 push feature → Greptile **自动 review AI 生成的 code** → 问题列表 + **1–5 分**。我的规则：**≥4 才上 production**。

分数不够 → 在 Cursor 里跑 **grep loop** Skill：读 GitHub 上 Greptile 的 review → fix → push → Greptile **新 review**。循环直到 **≥4/5** 或 **最多 5 轮**。

**为何这算「真 loop」：**
- **Fixed feedback engine**（评分 + 具体 comment）
- **Goal 明确**（分数门槛）
- **范围 closed**（只改 review 指的）

**仍会 break：**
- 单次 push **>1000 行** → 很难 5/5 → **拆 PR**，小步快跑
- Loop **不 perfect**——但比 open-ended app loop **现实得多**

**Greg：** 输出 binary 的地方 loop 合理——code review、SEO 批量页。做 startup App 的人若以为「AI loop 帮我做百万美元产品」——?

**Ross：** **Misleading。** 唯一 sensible 的 daily loop：**窄流程 + 固定 scorer**。Full self-driving 式「一条 PRD 建 App」缺 halfway 分享——train 已经开了，你下不了车。

> **金句 · Ross**
> **中文：** Loop 只在该窄、反馈固定的地方合理——code review。
> **原文：** The only place a loop makes sense is in a very confined process with a very fixed feedback loop — code review.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Greptile 审查循环 | grep loop | Greptile review → fix skill → push 循环 |
| 固定反馈 | fixed feedback loop | 评分 rubric，输出可验证 |
| PR 粒度 | small PR | <1k 行 diff review loop 才收敛 |

**本章小结**

- Greptile 1–5 分 + merge 门槛 = binary-ish feedback
- grep loop Skill 把 review 变成可自动迭代的 closed loop
- 控制 diff 大小是 loop 能否收敛的关键操作细节

---

## 总结

| 维度 | 要点 |
|------|------|
| 默认策略 | **HITL** 做 product；open loop 限 experiment / throwaway |
| Hype 叙事 | Boris/Peter 式 loop 对普通人 = token 老虎机 + 错误假设 |
| 唯一 daily loop | **Greptile 评分 → grep loop fix → push**，≥4/5 才 merge |
| 工程细节 | 单次 push <1k 行；无 fixed scorer 不要 autoloop |
| 与 vault | 接 [[Loop Engineering 橙皮书 - 花叔]]——本期是**哪种 loop 现在别盲目上**的刹车片 |

> **金句 · Ross（封底）**
> **中文：** 人在环里，是目前最好的 loop。
> **原文：** Human in the loop is the best loop.

---

## 概念索引

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| hitl | 人在回路 | human-in-the-loop | 人每步 govern |
| agent_loop | 智能体循环 | agent loop | fire once 自迭代 |
| closed_loop | 受限反馈循环 | closed loop | 固定 scorer + stop 条件 |
| grep_loop | Greptile 审查循环 | grep loop | review 分驱动 fix 循环 |

---

## 附录

### 章节时间戳（B 站简介）

| 时间 | 主题 |
|------|------|
| 03:15 | 警惕全自动驾驶陷阱 |
| 06:42 | AI 无法在缺乏沟通下创造「灵魂」 |
| 09:50 | 适用场景：实验 vs SaaS |
| 12:18 | Greptile code review 受限反馈循环 |
| 15:40 | >1000 行 push 导致 loop 失效 |

### 素材路径

- **ingest**：`Recastory/workspace/knowledge/A7-loop-agent-loop/ingest`
- **ASR 主源**：`Recastory/workspace/knowledge/A7-loop-agent-loop/article.md`
- **video_description**：`{ingest}/video_description.md`
- **B 站**：[BV1cVjN6oEwx](https://www.bilibili.com/video/BV1cVjN6oEwx/)
- **时长**：22:33
- **专栏主源**：无（A 级 partial enrich）

### 相关阅读

- [[Loop Engineering 橙皮书 - 花叔]] — Loop = Harness 上一层  
- [[遇事留痕 - Loop Engineering 的基础 - 魔术师卡颂]] — 失败日志优化 loop  
- [[Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿]] — Boris 侧 loop 叙事  
- [[Karpathy爆火项目-AutoResearch解读与启发]] — metric 驱动 overnight loop 对照  
- [[Alchemy CPO-从代码审查到自动代理]] — 审查 → 自动代理链  
- [[MOC - Harness Engineering]] — Harness / Loop 横切索引  

### 收录说明

- **嘉宾**：Ross Mikita（YouTube @Ross Mikita）  
- **主源**：英文 ASR（Startup Ideas Podcast）；无 UP 专栏图稿  
- **版本**：canonical Host-Guest v3.2-asr（2026-07-03；原 v3 九段讲义已替换）
