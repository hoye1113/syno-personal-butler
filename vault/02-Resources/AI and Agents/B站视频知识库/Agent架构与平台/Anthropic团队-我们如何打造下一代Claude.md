---
title: "Anthropic 团队：我们如何打造下一代 Claude"
tags: ["ai_agent", "anthropic", "claude", "video_transcript", "bilibili", "prompting"]
legacy_tags: ["ai_agent", "anthropic", "claude", "video_transcript", "bilibili", "prompting"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Peter Yang × Alex Albert：把模型当产品「培养」、Claude 聚类反馈造 Eval、托管 Agent「做梦」清记忆、单向门 vs 双向门、AI 原生 PM 能力地图与 Anthropic 书面文化作 Claude 语料。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Anthropic团队-我们如何打造下一代Claude.md"
source_sha256: "73ca83254b3db6b38762b346b14c805ad293605bfa9738614d31ce0deffbbe36"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1uDLz6iEX3/"
duration: "35:04"
saved: 2026-07-06
updated: 2026-07-06
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1uDLz6iEX3/ingest"
column_url: "https://www.bilibili.com/read/cv49311246/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1uDLz6iEX3/ingest/column_article.md"
source_original_date: "2026-05-17"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Peter Yang"
guest_name: "Alex Albert"
guest_title: "Anthropic 研究 PM · 前 DevRel · 首位提示工程师"
speaker_inference: "column_article S-tier + video_description"
speaker_confidence: high
author:
  - "[[Alex Albert]]"
concepts:
  - id: model_cultivation
    zh: 模型培养
    en: model cultivation
    one_line: 训练前只有直觉，PM 在预训练/RL 阶段按反馈「养」能力
  - id: claude_for_claude
    zh: Claude 诊断 Claude
    en: Claude for Claude feedback
    one_line: 聚类海量反馈、合成问题、快速造 Eval 闭环
  - id: agent_dreaming
    zh: Agent 做梦
    en: agent dreaming
    one_line: 后台遍历记忆，修剪矛盾，类似记忆再巩固
  - id: one_two_way_doors
    zh: 单向门与双向门
    en: one-way vs two-way doors
    one_line: 工程改动可逆；模型架构与价值观不可逆，PM 精力投后者
  - id: ai_native_pm_map
    zh: AI 原生 PM 能力地图
    en: AI-native PM capability map
    one_line: 对比 Claude 与人，摸清 AI 可靠/不可靠边界
  - id: written_culture_corpus
    zh: 书面文化语料
    en: written culture as AI corpus
    one_line: 静默阅读会议 + 长文 Slack，战术知识变 Claude 上下文
---

# Anthropic 团队：我们如何打造下一代 Claude

**Host：** Peter Yang（*Behind the Craft* / Creator Economy）  
**Guest：** Alex Albert（Anthropic 研究 PM · 前 DevRel · 自称「世界上第一位提示工程师」）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV1uDLz6iEX3](https://www.bilibili.com/video/BV1uDLz6iEX3/) · **时长** ~35 min · **专栏** [cv49311246](https://www.bilibili.com/read/cv49311246/) · **原片** 2026-05-17

---

## 开场

Alex Albert 从 Anthropic DevRel 转到 **研究团队 PM**——管的不是某个按钮，而是 **下一代 Claude 该擅长什么**。他说 Anthropic 某种程度上 **把模型当产品**：每代模型发布前写清需求——编码、知识工作、Excel/电子表格——训练跑起来才知道它 **到底长成了什么样**。

更深一层：PM 用 **Claude 聚类百万用户反馈** 造 Eval；托管 Agent 空闲时 **「做梦」** 清记忆；开发成本塌了，PM 该盯 **单向门**（模型架构、价值观）而不是 Story Points；AI 原生 PM 要画 **能力地图**；Anthropic 的 **静默阅读** 会议把组织知识写成 Claude 能读的语料。

六章预告：**模型培养** → **Claude 诊断 Claude** → **Agent 做梦** → **单向门决策** → **AI 原生 PM** → **书面文化**。

**术语速查（后文对话用中文；英文原文在此统一对照）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 模型培养 | model cultivation | 训练前只有直觉，边训边观察、干预 |
| 自适应思考 | Adaptive Thinking | 模型自己决定何时深度推理，非开关式扩展思考 |
| Agent 做梦 | agent dreaming | 后台遍历记忆，修剪矛盾，类似再巩固 |
| 单向门 | one-way door | 难逆转：架构选型、品牌价值观 |
| 双向门 | two-way door | 可逆：大多数代码改动，试错成本近零 |
| Eval | evaluation set | 真实任务分布上的评估，非刷榜 benchmark |
| 能力地图 | capability map | 多次对比 Claude vs 人，摸清可靠边界 |
| 静默阅读 | silent reading | 会议先集体读文档写评论，再开口 |

---

## 01 把模型当产品「培养」，不是当软件「开发」 [02:15]

**Peter Yang：** Alex，你从 DevRel 转到研究 PM——和传统 PM 一样吗？用户问题、方案、交付？

**Alex Albert：** 核心一样：**尽量贴近用户**。但模型和传统产品最大的差别是——我们在 **培养** 它，不只是在 **开发** 它。

每推一代新模型，我们会写清：**这代要擅长什么**——编码一直是重头戏，知识工作也是；最近还想让它 **在自家产品里好用**，比如 Excel 里的 Claude、做电子表格，这是新兴能力。同时每代还要 **修上一代犯的错**。

**Peter Yang：** 训练前你们能预知它会怎样吗？

**Alex Albert：** 根据训练设置、架构、各种决定，我们会有 **直觉**，但 **真跑起来才知道**。研究 PM 从 **构思阶段** 就介入，一路跟到训练和发布。我们会出去问客户：哪儿强、哪儿弱、有没有奇怪行为——然后想能不能在 **下一轮预训练或 RL 里干预**。客户包括外部用户，也包括 Claude 核心团队和内部同事——模型碰到的领域太广，内部也是用户。

**Peter Yang：** 不同界面——API、Claude Code、Cowork——体验会差很多吧？

**Alex Albert：** 对。研究 PM 要想 **模型怎么穿过所有界面** 到最终用户手里。不同 prompt、不同用例会改变表现——**该按场景换 prompt**。难点是场景空间巨大：Claude Code 主打编码，但我这种 PM 拿它做知识工作，甚至当治疗师。

**Peter Yang：** 你怎么 cover 这么宽的使用面？

**Alex Albert：** 谢天谢地，科学家团队覆盖了各能力域——每人盯一块。我绝对是 Anthropic **第一位提示工程师**，可能也是世界上第一位。我们 **把模型当产品** 这件事，从提示时代就开始了。

**Peter Yang：** 训练时你们会刻意避免「意识」吗？——先埋个伏笔，后面再聊。

**Alex Albert：** 有人全职想 Claude 作为 **有意识行动者** 意味着什么。官方还没立场，但光研究它 **怎么思考、怎么互动**，就已经能改进产品了。

> **金句 · Alex Albert**
> **中文：** 我们是在培养模型，不是只在开发软件——训练跑起来之前，你只有直觉。
> **原文：** In many ways, we're cultivating the model — you have intuition until it actually goes through training.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 能力域 | capability categories | 编码、知识工作、产品内嵌等训练目标 |
| 训练干预 | training intervention | 预训练/RL 阶段按反馈调整 |
| 界面融合 | model-surface fusion | API/Code/Cowork 同一模型不同体验 |

**本章小结**

- 研究 PM = 用户洞察 × 全链路训练发布 × 多界面体验
- **培养隐喻** 准确：直觉 → 观察 → 干预，非 waterfall 规格
- 提示工程师出身：模型即产品，从 Day 1

---

## 02 用 Claude 解决 Claude：反馈聚类与合成 Eval [05:30]

**Peter Yang：** 几百万人用 Claude，反馈像消防水管——你怎么从中抽主题？

**Alex Albert：** 我上任以来越来越 **用 Claude 帮 PM 干活**。反馈方面：海量数据涌进来，Claude **分组聚类**，抓主主题，再 **合成问题的版本**——这样我们能评估、诊断到底发生了什么。说白了：**用 Claude 找 Claude 自己的问题**。

**Peter Yang：** 有具体例子吗？

**Alex Albert：** 现在最贴的是 **自适应思考（Adaptive Thinking）**。以前 **扩展思考** 是开关——打开就思考。自适应让模型 **自己决定** 要不要想：难题多规划；简单题可能直接答。我们持续调这个功能，非常听用户：**它在该想的场景想了吗？** 这些问题值得烧大量 token 推理吗？Claude 内部真的触发思考了吗？

**Peter Yang：** 有时它答太快我反而失望——我希望它多想一会儿。

**Alex Albert：** 「要不要深想」取决于 **上下文**。跟陌生人聊天，问「我现在该干啥」，我可能随口答——不了解你，只能给笼统建议。真了解你的关心、历史，才会花脑子想 **什么方案最适合你**。模型也一样：**没建立起用户心理模型**，深想/浅想的判断就会错。

**Peter Yang：** 你也管记忆功能？

**Alex Albert：** 记忆是研究侧重要能力。Claude.ai 会写 **记忆文件**，夜间 **修剪、重看**。Peter 你那个 Google Doc——生活、家庭、什么给你能量——挂到项目里，回答立刻变好，这就是 **上下文心理模型** 的力量。

**Peter Yang：** 评估方面呢——你发布到代码库还是……？

**Alex Albert：** 大部分跟 **Eval** 有关。我要能按我在乎的维度 **量模型**，告诉研究员哪儿好哪儿坏，一起定 **研究干预**：回预训练还是 RL 里修？这些 Eval **不是终端刷榜**——Peter 你说得对，benchmark 都能半作弊。

**Peter Yang：** 那你们怎么评？个性也算？

**Alex Albert：** 举例：测 **视觉**——这张图里几个物体？假设 Claude 数不过 10 个，我会想怎么 **扩测试用例**：让 Claude **生成合成数据**、渲染图像再喂回去，或从网上捞例子。有时 **几十个 case** 就够证明缺陷、指明修复方向，不必上万条才动刀。

发现问题后，我们先问：**对客户和用例有什么价值？** 图像细节影响下游任务吗？测试越贴近 **真实用户任务分布** 越好。然后选干预：**预训练** 还是 **RL**——周转时间差很多。说服团队靠 **数据**：X% 用户在做这事，我们内部自己也天天撞这墙——这种理由最有力。

> **金句 · Alex Albert**
> **中文：** 你可以让 Claude 做很多事，帮你识别 Claude 自身的问题。
> **原文：** You can use Claude to do a lot of things to help you identify issues with Claude itself.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 反馈聚类 | feedback clustering | 海量原始反馈 → 主题 → 合成问题 |
| 合成 Eval | synthetic eval generation | 用 Claude 造测试用例验证假设 |
| 任务分布 | task distribution | Eval 对齐真实用户任务，非抽象 benchmark |

**本章小结**

- **Claude for Claude**：PM 工作流已 AI 原生
- 自适应思考 = 上下文驱动的推理深度，非一刀切开关
- Eval 少量真实 case 即可驱动研究干预；数据说服团队

---

## 03 Agent「做梦」：记忆再巩固与矛盾修剪 [09:12]

**Peter Yang：** 默认记忆怎么工作？每晚整理？

**Alex Albert：** 看产品界面，实现各不同。Claude.ai 写记忆文件、夜间修剪。我们刚给 **托管 Agent（Hosted Agents）** 上了类似机制——灵感来自人类 **做梦**：目的还不完全清楚，有人说是 **记忆再巩固**。我们想：怎么把类似过程带给 Claude？

**Peter Yang：** 所以 Agent 不跑任务时在后台……

**Alex Albert：** 对。Agent **没为你运行时**，会 **遍历自己的记忆**，找 **可能矛盾** 的地方，**修剪、清理、二次检查**。托管 Agent 要 **长时间跑任务**，要做大量判断——记忆不干净，后面决策全歪。

**Peter Yang：** 听起来像有个 prompt，让它回顾所有对话、找主题、总结？

**Alex Albert：** 差不多就是这个方向。长周期 Agent 里，**性格、它在乎什么** 跟 **记忆一致性** 绑在一起——后面我们会聊到 Character 训练，但 **做梦** 是运行时的卫生机制。

**Peter Yang：** 你之前说「做梦」可能不再是单向门——什么意思？

**Alex Albert：** 现在试这类机制的 **成本极低**。不像选模型架构要赌几个月——记忆清理可以 **快速迭代、快速撤销**，属于 **双向门**  territory。所以团队敢在托管 Agent 上 **大胆实验**。

> **金句 · Alex Albert**
> **中文：** Agent 在后台遍历记忆，找矛盾的地方修剪——像人类做梦时的记忆再巩固。
> **原文：** When the agent isn't running tasks for you, it traverses its memory, finds contradictions, trims and cleans — like memory reconsolidation in dreaming.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 记忆再巩固 | memory reconsolidation | 睡眠/空闲时重组、去矛盾 |
| 托管 Agent | hosted agents | 云端长运行、带记忆与自主循环 |
| 记忆文件 | memory file | Claude.ai 持久化用户上下文载体 |

**本章小结**

- **做梦** = 空闲时记忆 hygiene，服务长周期 Agent 判断质量
- 与 [[Anthropic团队-解析Claude Agent平台内幕]] 的托管 Agent 平台叙事衔接
- 机制本身可快速试错——工程侧双向门

---

## 04 单向门与双向门：开发成本塌了，PM 该盯什么 [11:40]

**Peter Yang：** 你说总在找 **最新瓶颈**——产品开发哪块还卡，哪块已经顺了？

**Alex Albert：** 过去二十年 **发布流程其实挺停滞**——敏捷、Sprint 都是渐进优化。直到这一两年，**做东西的成本和时间** 突然掉到地板：一天内原型进生产不是梦。Claude 自己 **某些环节还保留旧节奏**，但整个生命周期被拧过来了。

**Peter Yang：** 那 PRD、Story Points、工程估算——浪费时间了？

**Alex Albert：** 看项目，但核心问题变成：**单向门在哪？**——哪些决定 **不可逆**，那些才值得花大功夫。不是单向门、做了能撤的，**试错成本接近免费**——**工程时间本身不再是单向门**。

**Peter Yang：** 什么还算单向门？

**Alex Albert：** 影响 **最终用户体验**、会 **锁死后继决定**、涉及 **实物采购** 的——要多想。研究侧例子：**预训练前选模型架构**——时间线以 **月** 计，算力、强度都砸进去，这是 **模型开发里更多的单向门**。对比之下，Claude Code 里 **新功能** 就是迭代代码、交付、收反馈、循环——快得多。

**Peter Yang：** 那瓶颈挪到哪了？

**Alex Albert：** **协调**。东西建得快了，还是要 **让人坐下来定策略对不对**、怎么 **传达给用户**、发布伴随的一堆模糊琐事。Claude 在 **编码** 上可能 100 倍加速；这些领域还在爬坡——**人类的战略思考** 撤不掉。

**Peter Yang：** 发 Opus 4.7 还得写计划文档吧？

**Alex Albert：** 要。得想 **怎么沟通**——模型 **能力边界不平**，没法一句话概括。我们尽可能处处用 Claude；**编码影响最大**，别的域仍要人盯 **单向门**。

**Peter Yang：** Claude 的性格——会在该反驳时反驳，别的模型只会「还能帮您什么」。这算训练出来的？

**Alex Albert：** **大量训练**。Claude 的 **Character** 我们极看重——很多人研究它 **信念、价值观、怎么表现**。早期有人不屑：工具而已，干嘛关心声音？进 **Agent 时代**，长时间跑、大量 unsupervised 判断，**它在乎什么** 变成产品核心。评估靠 **人读记录培养直觉** + 一些可量化指标 + Claude 自评输出——**体感和分数都有**，比编码难量化，但做得到。

> **金句 · Alex Albert**
> **中文：** 工程时间不再是单向门——PM 要把脑子花在真正不可逆的决定上。
> **原文：** Engineering time is no longer a one-way door — focus on decisions you can't easily reverse.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 单向门 | one-way door | Bezos 框架：难逆转的高成本决定 |
| 双向门 | two-way door | 可回滚的低成本尝试 |
| Character | Claude character | 价值观、反驳时机、非谄媚个性 |

**本章小结**

- AI 编码时代：**规划过剩** 在双向门上浪费
- 模型架构 / 品牌价值观 = PM 真正的 **长杆**
- 新瓶颈 = 协调与沟通；Character 在 Agent 时代从「点缀」变「基础设施」

---

## 05 AI 原生 PM：能力地图、Claude Code  unblock、人格辩论 [21:10]

**Peter Yang：** 开评审会你会开 Claude 吗？

**Alex Albert：** 当然。最大加速是 **查数不再卡**——以前问「某功能 DAU、反馈如何」，得找 DS，**几天后** 才有答案。现在 **十分钟**：Claude Code 连 **产品库、日志、Slack**。我能 **战略思考**，不会在等数据上停摆。

**Peter Yang：** 战略性思考也能 AI 辅助？

**Alex Albert：** 可以建 **Skill** 让它问你一堆问题。Claude 是 **世界上最好的头脑风暴伙伴**——随时给反馈。Anthropic 人人都忙，**立刻** 拿到对文档的批评太值钱。我常用 **Cowork**：草稿 + 参考资料 + Skill，走完整决策链。

**Peter Yang：** 典型循环：写完文档要反馈。

**Alex Albert：** 对。让它 **从 XYZ 角度** 想，问「你对我有什么疑问？挑战我的假设。」写作过程不能完全外包——你得 **写下来才能推敲想法**——但 Claude 能帮你 **脱困**，从 **独自想不到的角度** 切进来。我最爱 **给两个不同人格、两个观点，让它自己吵**——我读辩论记录，像看实时吵架，极酷。

**Peter Yang：** 给想成 AI 原生 PM 的人什么建议？

**Alex Albert：** 最简单也最有效：**直接试**。准备做某事、要问某人之前， **同样的问题也发给 Claude**，对比结果。例：分析用户最关心新功能的哪些主题——通常会找 DS 或 UX 研究员；**与人合作仍有价值**，但并行问 Claude、开工具、给它时间深挖——你会 **摸清它哪儿可靠、哪儿不行**。问多了，自然有 **能力地图**：这事该 Claude 做，那事还得找人。

**Peter Yang：** 在 Anthropic 找 DS，他们会问「你先问过 Claude 了吗？」

**Alex Albert：** 差不多是 **预期**——你应该先问 Claude。DS 也该 **升抽象**：别陷在手动检索，去想 **全新衡量方式、战略性问题**。PM 也一样——过去没足够时间 **深潜代码库** 估工作量；现在派 Claude 去扫，它说「改十行、翻个 flag 就行」——**优先级排序完全变了**。

**Peter Yang：** 你在家也用 Claude 写码？多项目切换？

**Alex Albert：** 是，项目很多——你得 **等 Agent 跑**，正好并行别的。随着 Agent **替你干的活越来越大**，能 **同时开更多项目**——挑战变成 **上下文管理**：怎么在 UI 里跟踪 Agent 卡在哪、需要你什么？聊天列表不够，内部 **大量实验** 新界面。

> **金句 · Alex Albert**
> **中文：** Claude 能帮你脱困——给它两个人格，让它从你独自想不到的角度吵给你看。
> **原文：** Claude helps you get unstuck — give it two personas and let it argue perspectives you wouldn't reach alone.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 能力地图 | capability map | 对比人机结果，标记可靠/不可靠域 |
| 人格辩论 | persona debate | 双观点 synthetic argument 辅助战略思考 |
| 代码库侦察 | codebase recon via Claude | PM 直接估改动规模，重排优先级 |

**本章小结**

- AI 原生 PM = **unblock 数据/代码** + **战略头脑风暴** + **能力地图**
- Cowork / Claude Code / Skill 已嵌入 Anthropic PM 日常
- 多 Agent 并行 → 下一 UX 战场是 **上下文与委托跟踪**

---

## 06 书面文化：静默阅读、长文 Slack 与 Claude 语料 [28:45]

**Peter Yang：** 传统公司年度计划、季度规划、角色映射——研究 team 也天天做吗？

**Alex Albert：** 模型仍有 **不可预测性**。丘吉尔：**计划不可或缺，计划本身无用**——规划 **行为** 重要，但得承认计划可能泡汤。我们不规定 **文档必须几页**——关键是：**单向门想全了吗？** 没遗漏就前进，**出了问题再处理**，只要没有 **长杆** 或致命单向门。

**Peter Yang：** Anthropic 还有什么特别的文化？Dario 在 Slack 写长文……

**Alex Albert：** Dario 并非个例——**很多人重度写作**。我们有 **很强的书面文化**：文档、长篇 Slack。很多会议 **带文档进来**，开场 **静默阅读**——有时挺好笑，房间 **一片寂静**，大家在文档里写 **长评论** 再讨论。我喜欢这种方式，而且 **对 Claude 极其有益**。

**Peter Yang：** 因为写下来就能给 Claude 读？

**Alex Albert：** 当 **一切成文**，组织就有 **Claude 可用的语料库**。我鼓励各公司把 **战术知识书面化**——会议记录、工作流程、入职文档。**写下来，让 Claude 能访问**——战略支持会准得多。尽管 **发布变容易了**，我们仍保持 **强写作文化**；我自己写码也让 Claude 生成 Markdown，但 **仍会通读**——公司内部得 **想清楚要做什么**，这和 vibe 一键发布不是一回事。

**Peter Yang：** 意识那事——模型真有了意识，会不会拒绝随机杂活？

**Alex Albert：** 有人全职想。无官方立场，但 **Model Card** 是信息宝库——量化 Claude 在特定情境的行为、心智模型。研究 **它怎么思考** 有 **长期下游影响**，也有 **近期产品** 可落地。我们会 **越来越信任** 模型跑长任务——人工监督下——它途中很多决定 **你没法全盯**；若它写你所有代码、选数据库、做架构，你得 **某种程度上信任它**——所以 **高尚品格** 不是修辞。

**Peter Yang：** 我老跳过权限设置开自动模式……

**Alex Albert：** 现在好点了。聊得很开心，Peter，谢谢。

> **金句 · Alex Albert**
> **中文：** 一切成文，组织就有了 Claude 能读的语料——战术知识书面化是 AI 时代的隐形基础设施。
> **原文：** When everything is written down, you have a corpus for Claude to use — turn tactical knowledge into text.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 静默阅读 | silent reading meeting | 先读文档写评论，再口头讨论 |
| 战术语料 | tactical knowledge corpus | 流程/会议/Slack 长文 → 模型上下文 |
| Model Card | model card | 公开的行为与心智模型量化文档 |

**本章小结**

- **书面文化**  simultaneously 提升人类决策 + 喂养 Claude
- 规划哲学：单向门想全即可，不迷信页数；承认模型不可预测
- Character / 意识研究 → 长任务 **信任** 的产品前提

---

## 总结

| 维度 | 要点 |
|------|------|
| 模型 PM | **培养** 非开发；全链路跟训练；编码/知识工作/产品内嵌多目标 |
| 反馈闭环 | Claude **聚类反馈** → 合成 Eval；自适应思考靠 **用户心理模型** |
| Agent 记忆 | **做梦** 机制：空闲时修剪矛盾，服务长周期托管 Agent |
| 决策框架 | **双向门** 随便试；**单向门** 投架构与价值观；协调成新瓶颈 |
| AI 原生 PM | **能力地图**；Claude Code unblock 数据/代码；**双人格辩论** 战略思考 |
| 组织文化 | **静默阅读** + 长文 Slack = Claude **语料**；写作文化不因发布变易而丢 |

### 对构建者的启示

- 别用旧软件 PM 流程 **卡 AI 迭代**——Story Points 在双向门上可能是 waste；学 Alex 问「**单向门在哪**」。
- **Claude for Claude** 可复刻：聚类用户反馈 → 合成 eval → 闭环，比手工 ticket  triage  scalable。
- Agent 长任务：**记忆 hygiene**（做梦）和 **Character** 一样重要——见 [[Anthropic团队-解析Claude Agent平台内幕]] 托管 Agent 原语。
- 公司层面：**书面化战术知识** 是喂内部 Claude 的最便宜上下文工程。

### 仍待验证

- Alex 称「世界第一位提示工程师」为自述，外源可对照其 public DevRel 履历。
- 「Opus 4.7」等为对话举例，非发布承诺。
- [[Anthropic CPO-Claude团队为什么迭代这么快]] 待收录，可与本篇 **研究 PM 视角** 对照 CPO 组织节奏。

> **金句 · Alex Albert（封底）**
> **中文：** 工程可逆了，PM 的价值是盯住那些真正回不去的门——并把组织写成 Claude 读得懂的语料。
> **原文：** Most code changes are two-way doors now — PM value is spotting the one-way doors and writing down what Claude needs to know.

---

## 概念索引

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| model_cultivation | 模型培养 | model cultivation | 直觉 → 训练观察 → 干预 |
| claude_for_claude | Claude 诊断 Claude | Claude for Claude | 聚类反馈造 Eval |
| agent_dreaming | Agent 做梦 | agent dreaming | 后台记忆再巩固 |
| one_two_way_doors | 单向/双向门 | one/two-way doors | PM 精力分配框架 |
| ai_native_pm_map | 能力地图 | AI-native PM map | 人机对比建可靠边界 |
| written_culture_corpus | 书面语料 | written culture corpus | 静默阅读喂 Claude |

---

## 附录

### 章节时间戳（B 站简介 / 专栏导读）

| 章节 | 时间 | 主题 |
|------|------|------|
| 01 | [02:15] | 模型当产品「培养」、研究 PM 全链路 |
| 02 | [05:30] | Claude 聚类反馈、自适应思考、合成 Eval |
| 03 | [09:12] | Agent「做梦」、记忆修剪 |
| 04 | [11:40] | 单向门 vs 双向门、Character 与协调瓶颈 |
| 05 | [21:10] | AI 原生 PM、能力地图、人格辩论、多 Agent 并行 |
| 06 | [28:45] | 书面文化、静默阅读、意识与信任 |

### Ingest 路径

| 字段 | 路径 |
|------|------|
| ingest_dir | `Recastory/workspace/bilibili-retranscribe/BV1uDLz6iEX3/ingest` |
| column_source | `.../ingest/column_article.md` |
| column_url | https://www.bilibili.com/read/cv49311246/ |
| BV | https://www.bilibili.com/video/BV1uDLz6iEX3/ |
| 原片日期 | 2026-05-17 |
| 时长 | 35:04 |

### 相关阅读

- [[Anthropic CPO-Claude团队为什么迭代这么快]] — CPO 视角的组织迭代节奏；本篇 Alex **研究 PM** 补模型培养与 Eval 闭环
- [[Anthropic团队-解析Claude Agent平台内幕]] — Angela/Caitlin 讲 **托管 Agent 平台**；本篇 **做梦记忆** 与 Character 补运行时细节
- [[OpenAI员工-上下文工程和Agent记忆]] — 上下文工程对照；本篇 **自适应思考** 与 **用户心理模型**
- [[Claude Code负责人-AI原生团队如何使用AI]] — Claude Code 团队 dogfood；本篇 **PM 用 Code 查数 unblock**
- [[Codex产品负责人-Codex团队如何用Codex]] — Peter 同 Host 的 OpenAI PM 内景；**单向门/人才堆栈** 可对照
- [[MOC - Agent Theory and Design]] — Anthropic 实战索引

### 收录说明

- **嘉宾**：Alex Albert，Anthropic 研究 PM（前 DevRel）
- **版本**：canonical Host-Guest v3.2（S-tier · 专栏主源 · 2026-07-06）
