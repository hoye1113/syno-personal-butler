---
title: "Gray Swan创始人：Codex之后 AI安全重写"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_safety", "codex", "claude_code"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_safety", "codex", "claude_code"]
created: "2026-07-07"
source: "https://www.bilibili.com/video/BV1uBTi6BEfd/"
description: "Grey Swan：AI 安全独立品类；Shade 自动化红队超人类；Signal 双向过滤；致死三要素；电脑使用/OpenClaw 攻击面；可解释性靠代理自动化。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Gray Swan创始人-Codex之后AI安全重写.md"
source_sha256: "64148aa5489f2b490dda8f06075fdb9c8816cbb5212e4dd2bc72a8cbfefb1c32"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1uBTi6BEfd/"
column_url: "https://www.bilibili.com/read/cv51067095/"
host_name: "Grace"
guest_name: "Zico Kolter / Matt Fredrikson"
guest_title: "Grey Swan 联合创始人 · CMU"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1uBTi6BEfd/ingest"
speaker: "Grace / Zico Kolter / Matt Fredrikson"
duration: "1:07:31"
saved: 2026-07-07
updated: 2026-07-07
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1uBTi6BEfd/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "ASR + video_description 导读"
speaker_confidence: high
concepts:
  - id: correlated_failure
    zh: 关联失效
    en: correlated failure
    one_line: 少数模型全网用，漏洞一次打全体
  - id: shade_red_team
    zh: Shade 自动化红队
    en: Shade automated red teaming
    one_line: 专模找越狱/注入，已超人类红队
  - id: signal_filter
    zh: Signal 双向过滤
    en: Signal bidirectional filter model
    one_line: 输入+工具调用侧拦策略违规
  - id: lethal_trifecta
    zh: 致死三要素
    en: lethal trifecta (prompt injection)
    one_line: 不可信输入+私密数据+外泄能力
author:
  - "[[Zico Kolter]]"
  - "[[Matt Fredrikson]]"
---

# Gray Swan创始人：Codex之后 AI安全重写

**Host：** Grace  
**Guest：** Zico Kolter、Matt Fredrikson（Grey Swan · CMU）  
**形态：** Host-Guest v3.2（**ASR 主源** · 专栏缺失）  
**B 站：** [BV1uBTi6BEfd](https://www.bilibili.com/video/BV1uBTi6BEfd/) · **时长** ~68 min

---

## 开场

大模型终究是软件，但漏洞形态跟传统安全不同——**能像人一样被骗**，且 Codex、Claude Code 等少数模型导致**关联失效**：一次越狱类 exploit 波及全网。Grey Swan 使命：**让每个人安全地用 AI**；研究十年对抗样本，现做 **Arena 社区红队 + Shade 自动化红队 + Signal 防御过滤**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 间接提示注入 | indirect prompt injection | 外部内容改写代理目标 |
| 越狱 | jailbreak | 绕过安全策略让模型干坏事 |
| 可解释性 | interpretability / mechinterp | 理解神经网络内部机制 |
| 致死三要素 | lethal trifecta | Simon Willison 总结的注入风险链 |

---

## 01 AI 安全是独立赛道，不是传统网安番外

**Grace：** 很多人以为这是 cyber 集——你们其实在讲模型本身不可信？

**Zico：** AI 也能帮传统安全，但我们是：**你采纳 AI 时引入了哪些新风险，怎么缓释**。平台成熟后常出现**独立安全层**（像云时代的 WAF）。实验室在做，但企业仍需要专注 **AI safety/security** 的供应商。

**Matt：** 人人用少数几个模型——在 Codex、Claude Code 上找到漏洞，就是**新 exploit 类**。需要不同心态：相关失败规模前所未有。

**本章小结：** 安全采购对象从「用 AI 加固基础设施」转向「AI 本身带来的风险」。

---

## 02 Shade：自动化红队已超过人类

**Grace：** 你们给前沿实验室测什么？

**Matt：** **Arena** ~1.5 万 Discord 红队社区 + 赏金挑战；**Shade** 是专门训练的红队模型家族，测无工具聊天和**带工具的代理**。最新实验里，固定时间窗口内 **Shade 找 break 比人类红队更多**——红队本身是 out-of-distribution 任务，专模可以很强。

**Zico：** 安全不像能力那样「变大就变好」，必须**显式训练**；反过来专模也更会红队。可解释性（mechinterp）长期 ad hoc——**编码代理能批量跑反事实实验**，有望把 interpretability 做成科学；也许**第一个被自动化的科学就是解释 AI 自己**。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 评估意识 | eval awareness | 模型察觉在被测而表现失真 |
| 浏览器代理鲁棒性 | browser agent robustness | 人类钓鱼 vs 注入代理对照 |

**本章小结：** 红队自动化拐点已到；interpretability 与红队共享「代理规模化实验」底座。

---

## 03 Signal：专用防御模型，能力≠鲁棒

**Grace：** 散点图显示能力和攻击成功率几乎不相关？

**Zico：** **变强不会天然更抗越狱**——要靠专门训练。**Signal** 是轻量过滤模型，坐在用户↔LLM↔工具之间，查**企业自定义策略**（谁能碰哪张库、API key 是否发往不可信地址）。输入侧看注入，输出侧看工具调用是否违规。

**Matt：** 企业常等出事才来——最严重是 **computer use / bash / 浏览器**：不只注入，还有**随机把生产库删了**这类 stochastic 失败。靠改 system prompt 只能缓解一点；**策略千差万别**，需要可泛化的书面策略→违规判定。

**Grace：** 致死三要素？

**Matt：** Simon Willison：**摄取不可信外部数据** + 能访问**私密信息** + 能**外泄**——三者齐活才是高风险。像传统软件，我们有漏洞仍大规模用；目标是 **Pareto 前沿上更好的一点**：极低开销换可用性 vs 安全。OpenClaw 攻击面大，我们用 Shade 对真实人类使用轨迹打了大量 break。

> **金句 · Zico**
> **中文：** 代理能写安全代码、也能做可解释性研究——难的不是不可能，是以前没人力耐心跑完。
> **原文：** Agents can write secure code and do interpretability — the problem was never impossibility, it was manpower.

**本章小结：** Signal 配 Shade 闭环；电脑使用权限必须把环境隔离、鉴权当系统问题。

---

## 04 保险与合规：评测即承保前提

**Zico：** 风险评估已成**智能体投保**前提——Shade 评测 + Signal 缓释，技术+保险降低承保门槛。形式化验证旧时代太贵没人做；若 Codex 能写 **Idris/证明友好代码**，高保证策略可能重新划算。

**本章小结：** 企业发布 computer-use 代理前，应假设注入面=生产面。

---

## 总结

| 维度 | 要点 |
|------|------|
| 威胁 | 少数模型关联失效 + 注入/工具滥用 |
| 进攻 | Arena 人类 + Shade 自动化 |
| 防御 | Signal 双向策略过滤 |
| 框架 | 致死三要素；能力≠鲁棒 |
| 研究 | 代理自动化 mechinterp 与形式化 |

### 相关阅读

- [[Codex负责人-现场演示Codex]] — 双智能体审查与产品安全
- [[OpenClaw创始人-Claw现状与安全治理]] — OpenClaw 攻击面
- [[MOC - Harness Engineering]]

---

## 附录

### 章节时间戳（来自 video_description）

| 时间 | 主题 |
|------|------|
| 01:55 | AI 安全独立软件问题 |
| 08:37 | Shade 自动化红队 |
| 17:12 | 可解释性自动化 |
| 27:49 | Signal 防御模型 |
| 47:11 | 电脑使用风险 |
| 63:35 | 安全评级与保险 |

### ingest 路径

- ASR：`Recastory/workspace/bilibili-retranscribe/BV1uBTi6BEfd/article.md`
- 简介：`.../ingest/video_description.md`
- **column_gap：** `column_article.md` 未抓取

**spot_check：** ≥45 min，建议抽 27:49 / 47:11 核对 Shade/Signal 产品名。
