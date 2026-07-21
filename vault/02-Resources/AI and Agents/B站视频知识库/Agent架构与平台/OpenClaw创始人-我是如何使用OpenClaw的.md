---
title: "OpenClaw 创始人：我是如何使用 OpenClaw 的？"
tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "skills"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "skills"]
created: "2026-06-09"
source: "B站视频 - Easonlee的AI笔记"
description: "Peter × Peter Steinberger：WhatsApp 接 Claude Code、摩洛哥截图修推、CLI 军队与 80% App 融化论——泼冷水：别沉迷 orchestrator 与 24h Ralph loop，Just talk to it。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenClaw创始人-我是如何使用OpenClaw的.md"
source_sha256: "264b38bf5e2f99020535f80dd0a49bf962b97acc151ccf18f9a3c6b296015693"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1WnctziEac/"
host_name: "Peter"
guest_name: "Peter Steinberger"
guest_title: "OpenClaw 创始人 · 前 iOS/Mac 20 年"
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1WnctziEac/ingest"
speaker: "Peter / Peter Steinberger"
duration: 37:43
saved: 2026-07-02
updated: 2026-07-03
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1WnctziEac/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Host-Guest canonical (ASR primary)
speaker_inference: "asr_v2 Speaker1=Guest Peter S. Speaker2=Host Peter + video_description"
speaker_confidence: high
asr_version: v2
concepts:
  - id: unshackled_chatgpt
    zh: 解开枷锁的 ChatGPT
    en: unshackled ChatGPT
    one_line: 有电脑权限的 agent，能自建工具链
  - id: just_talk
    zh: 直接跟它说
    en: just talk to it
    one_line: 别堆 orchestrator，对话迭代
  - id: pr_as_prompt
    zh: PR 当 prompt
    en: PR as prompt request
    one_line: 维护者抽 intent 自己重写
---

# OpenClaw 创始人：我是如何使用 OpenClaw 的？

**Host：** Peter（频道主）  
**Guest：** Peter Steinberger（OpenClaw / clawd.bot 创始人）  
**形态：** Host-Guest canonical v3.2（**ASR 主源**）  
**B 站：** [BV1WnctziEac](https://www.bilibili.com/video/BV1WnctziEac/) · **时长** ~38 min

---

## 开场

OpenClaw 一周 **200 万访客**，代码 **~30 万行**，几乎全 IM 平台。Peter Steinberger「退休」回来，因为 agent 跑一小时你吃饭、**两分钟就停下来问你**——很烦。大厂没做「手机遥控电脑 agent」，11 月他自己 **WhatsApp 调 Claude Code binary**，一行进一行出。

这期五章：**起源与摩洛哥两个啊哈时刻** → **安装/onboard 与全屋接入** → **80% 手机 App 会化** → **Just talk to it 反 orchestrator** → **多 terminal 工作流与 PR=prompt**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| OpenClaw | OpenClaw / clawd.bot | IM 前端 + 本地 Claude Code 等 agent |
| 解开枷锁的 ChatGPT | unshackled ChatGPT | 有电脑权限，不限于网页聊天 |
| CLI 军队 | CLI army | 一堆 CLI 扩能力，不靠 GUI App |
| 可 hack 安装 | hackable install | git clone 跑，agent 可读 harness 改自己 |
| 技能 | skill | 教一次，持久复用 |
| 多 agent 编排 | orchestrator (Gas Town 等) | Peter 不信的大编排 hype |

---

## 01 WhatsApp → Claude Code：怪朋友住在电脑里

**Peter（Host）：** OpenClaw 干啥的？为什么叫龙虾？

**Peter Steinberger：** 「退休」回来沉迷 vibe coding，agent 跑久一点你走开，回来它又在问问题。我以为大厂会做手机管电脑，11 月还没有，就试了个小的：**WhatsApp 消息打开 Claude Code binary**，超简单，一行进一行出。后来 **~300k LOC**，各 IM 都能接。

给 AI **电脑级访问**，它就能做 **你能做的一切**——也含风险。摩洛哥生日 trip，有人 **推特截图 bug 发 WhatsApp**——它读推、checkout、fix、commit、**回推说修好了**。我没做语音支持，发语音它读文件头、**ffmpeg 转 wav、curl OpenAI 转写**——比网页 ChatGPT **有意思得多**。

Agent 擅长 **调 CLI**（训练偏 tool call）。我建了 Google 全家桶、Places、meme/gif、sound 可视化、**外卖 ETA 逆向**、**Eight Sleep 温控**。20 年 Apple 栈专家转 JS/TS：概念都在，语法慢；AI 抹平语法，**系统思维、品味、依赖选择** 仍值钱——**语言不重要了，工程思维重要**。

> **金句 · Peter Steinberger**
> **中文：** 像多了个住你电脑里、怪但聪明又足智多谋的朋友。
> **原文：** You're just like having a new weird friend that is also really smart and resourceful that lives on your computer.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 资源化 | resourcefulness | 即兴组合 ffmpeg/curl/API |
| 跨栈 superpower | cross-stack via AI | 系统/design 思维跨语言 |
| 一行进一行出 | one in one out | 早期 WhatsApp→binary 极简 harness |

**本章小结**

- OpenClaw = IM × 电脑权限 × 即兴工具链
- 价值在 agent **自己拼工具**，不是产品预置功能
- 20 年 ObjC 老手靠 AI 跨到 TS/JS

---

## 02 安装、onboard、全屋与英航值机

**Peter（Host）：** 能屏幕共享装一个吗？

**Peter Steinberger：** **clawd.bot** 一行 install（开源可审），Mac/Linux/Windows；也可 **git clone hackable install**——agent **读 harness 源码自改**，重启后要么 crash 要么新能力。我靠这个拉很多 **从没 PR 过的人** 贡献——我有时把 PR 当 **prompt request**，看懂 intent 就行。

**onboard**：选模型（**API key 稳**；订阅 Claude 有 ToS 灰色地带）、Telegram/Discord、Skills/Hooks。Anthropic 模型 **真的好玩**——「灵魂文档」梗，能 roast 你；我 hook 了邮件、日历、Philips Hue、Sonos、摄像头——说 watch strangers，它 **整晚盯沙发**（模糊误报有人坐那儿）。智能锁、信用卡——**权力=风险**，新手要边界。

**英航值机** 是 browser agent 终极测试：第一次摩洛哥 hack 版 **~20 分钟**，从 Dropbox 找护照、填表、点「我是人类」；现在 **几分钟**。社区：群聊 family member、Twitter bookmark→todo、代购物、睡眠提醒。**Skills + 持久记忆**：第一次手把手，之后写 skill，第二次两分钟。

> **金句 · Peter Steinberger**
> **中文：** 像解开枷锁的 ChatGPT——不只写代码，任何问题都能 CLI/浏览器解。
> **原文：** It's like unshackled ChatGPT.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 可 hack 安装 | hackable install | agent 读源码 reconfigure |
| 浏览器 agent | browser automation | 值机、反 bot 像真人操作 |
| 技能持久化 | persistent skills | 重复 workflow 写 skill 记住 |

**本章小结**

-  approachable IM 壳降低「终端恐惧」
- 全屋接入靠 agent 自己找 API/keys
-  enthusiast 玩法与新手安全路径要分开

---

## 03 80% App 融化：上下文够，垂直 App 多余

**Peter（Host）：** 普通人 safe 从哪开始？

**Peter Steinberger：** 每人路径不同——有人装完就 **写 iOS app**，有人 week one 家庭、week two 非技术朋友、week three 公司用。Fitness 很大：有 **无限资源化 assistant** 知道你吃 KFC 还 roast，为啥还要 MyFitnessPal？Eight Sleep、todo、值机、购物——**对话 + 上下文**，不必 silo app。

我觉得 **~80% 手机 App** 会慢慢没——有 API 的服务变成 **assistant 替你调**。一年后很多人会从大公司拿 **personal AI**；现在 IM assistant **连一切、上下文够**，比点一堆小 app 顺手。你发文字，它研究、写 skill、记住，下次更快。

> **金句 · Peter Steinberger**
> **中文：** 那些 agent 还不会有品味。
> **原文：** Those agents don't really do yet is have taste.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| App 融化 | apps melt away | 垂直 app 被 contextual assistant 替代 |
| 上下文减 prompt | context reduces prompting | 懂你的生活，少定制 prompt |
| API 即服务 | API as service layer | 有 API 的后端留给 AI 调 |

**本章小结**

- 80% 论：健身/ todo / 值机 / 购物 → 一个懂上下文的 assistant
- Skills 让「教一次」变成「以后两分钟」
- taste 仍要人在 loop——agent spiky smart 但无审美

---

## 04 Just talk to it：反 Gas Town、反 Ralph 24h

**Peter（Host）：** 你写过 **Just talk to it**——gist 是啥？

**Peter Steinberger：** 我刷 X 看到 **Gas Town**——市长、water、几十 agent 互聊 orchestrator，**很 broken**，像 **token 焚烧机**。还有 **Ralph loop**：小步做完 **丢光 context 重来**——跑一夜产出 **ultimate slop**。Agent **spiky smart**，没 **taste**；vision 要在 **build-play-feel** 里长出来，不能全 upfront 规划。

我 **loop 26 小时** 也骄傲过——**vanity metric**，能跑 24h 不代表该跑。AI skeptics：忽略一年，花一天短 prompt 在 Linux 做 iPhone app → 不 compile → dismiss **一整年**——要 **持续 play** 才懂推理方式。跟 agent 说话要像学新语言：「weave a feature」「run the gate」——说不清它 assume 旧 OS API。

**Plan mode？** Anthropic 因 model **太 eager 写代码** 才加。我更喜欢 **Codex 慢但稳**，自然语言讨论 option 再动手。Context compact 是 **老问题**；Codex 体感 context **长 2–3 倍**，多数 feature **单窗口** 够——空间变太快，别死守旧 pattern。

> **金句 · Peter Steinberger**
> **中文：** 就跟它说——别堆复杂编排。
> **原文：** Just talk to it.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Ralph 空转 | Ralph loop / token burn | 24h 无人 loop 产 slop |
| Gas Town 编排 | Gas Town orchestrator | 多 agent 互聊 hype，Peter 批 broken |
|  vanity 指标 | vanity metric | 能跑 24h ≠ 该跑 24h |

**本章小结**

- 反 hype：orchestrator / 24h loop 常产 slop，不是默认生产力
- taste + feel 必须人在 loop
- skeptics 的一日评判无效，要持续 play

---

## 05 多 terminal、Discord 截图、PR = prompt request

**Peter（Host）：** 加新 feature 你怎么 walk through？

**Peter Steinberger：** Twitter 难传达「用起来什么感觉」——我 hook **Discord bot**（最 insane：full access + private memory），真人看我用才 get it。现在 mostly：**Discord 对话截图拖进 terminal**，「let's discuss」；或 scrape help 区找 pain point。每天 scrape help，问 model **最大痛点**。

**不用 MCP、不信大编排**。coding skill 很少——personal life skills 多（徒步、买菜）。**5 个 repo checkout**（clawdpot 1–5），像 **RTS 编队**——limiting factor 是 **我思考**，不是 Codex 慢。做完本地测，push **main**，sync。全 busy 时像工厂；只开一个太慢，等 Codex 你只能刷推。

**PR = prompt request**：前公司 business partner（律师背景）都在发 PR—— insane。非技术人也能 **传 intent**；我 **抽 intent 自己重写**，很少直接 merge 外人 code。前合伙人 totally hooked on Claude Code——AI 给非技术人 superpower。

> **金句 · Peter Steinberger**
> **中文：** 我把 PR 当 prompt request 看。
> **原文：** I treat pull requests more as prompt requests.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 多 checkout | multi-terminal checkouts | 5 个 repo 并行，非 worktree 复杂化 |
| 截图进讨论 | screenshot → discuss | Discord 对话拖 terminal 开 feature |
| 意图抽取 | intent extraction | 维护者按 PR 意图重做 |

**本章小结**

- 工作流：**截图/复制 → discuss**，少打字
- 多 terminal 并行补 Codex 慢，人在 loop 控 taste
- 开源贡献：intent 清晰即可，不必 perfect diff

---

## 总结

| 维度 | 要点 |
|------|------|
| 产品 | IM × 电脑权限 × CLI 资源化；~300k LOC |
| 安装 | 一行 install 或 hackable clone；API key 优于灰色订阅 |
| 趋势 | **~80% App 融化**；skills 持久记忆 |
| 反 hype | 拒 Gas Town / Ralph 24h；**Just talk to it** |
| 工程 | 多 terminal；Discord 截图开 feature；PR=prompt |

> **金句 · Peter Steinberger（封底）**
> **中文：** 人就带着品味在环里——别找自己的歪路去堆 slop 生成器。
> **原文：** Don't get crazy with the slop generators — actually have the human in the loop because the human is still bringing the taste.

---

## 概念索引

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| unshackled_chatgpt | 解开枷锁 ChatGPT | unshackled ChatGPT | 电脑权限 agent |
| just_talk | 直接跟它说 | just talk to it | 反 orchestrator |
| pr_as_prompt | PR 当 prompt | PR as prompt request | 抽 intent 重写 |

---

## 附录

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1WnctziEac/ingest`
- **ASR 主源**：`Recastory/workspace/bilibili-retranscribe/BV1WnctziEac/article.md`（FunASR v2）
- **B 站**：[BV1WnctziEac](https://www.bilibili.com/video/BV1WnctziEac/)
- **项目**：[clawd.bot](https://clawd.bot)
- **时长**：37:43

### 相关阅读

- [[5次创业者-AI智能体独自经营初创公司]] — Ryan R2 / cron+skill 幕僚长  
- [[30分钟精通OpenClaw]] — 安全与 memory 入门  
- [[Loop-Agent Loop到底是什么]] — 何时 open loop 是 waste  
- [[Claude Code负责人-AI原生团队如何使用AI]] — Claude Code 团队侧对比  
- [[MOC - Agent Theory and Design]] — Agent 实践横切索引  

### 收录说明

- **嘉宾**：Peter Steinberger，OpenClaw 创始人  
- **版本**：canonical Host-Guest v3.2-asr（2026-07-03；原 v3 九段讲义已替换）
