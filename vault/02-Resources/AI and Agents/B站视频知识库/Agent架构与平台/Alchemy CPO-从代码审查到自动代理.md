---
title: "Alchemy CPO：从代码审查到自动代理"
tags: ["ai_agent", "video_transcript", "bilibili", "codex", "skills"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "codex", "skills"]
created: "2026-06-09"
source: "B站视频 - Easonlee的AI笔记"
description: "Alchemy CPO Matias Castello × OpenAI Romain Huet：代码审查是企业 adoption 拐点、平台服务人类与自主代理、离机 Skills 工作流、Apple Watch 语音触发 Codex、视觉驱动 UI 与三条 builder 假设。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Alchemy CPO-从代码审查到自动代理.md"
source_sha256: "9873771099515eb8f54e7023573901cc5ab8e0bacf85d510be8ed300b8eb46cd"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1i9E366EAr/"
speaker: "Matthias（Alchemy CPO，前 Facebook 开发者平台）"
duration: "29:45"
saved: 2026-07-02
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1i9E366EAr/article.md"
asr_version: v2
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1i9E366EAr/ingest"
column_url: "https://www.bilibili.com/read/cv50233159/"
source_original_date: "2026-05-30"
host_name: "Romain Huet"
guest_name: "Matias Castello"
guest_title: "Alchemy 产品负责人（CPO）"
speaker_inference: "column_article_speaker_labels"
speaker_confidence: "high"
author:
  - "[[Romain Huet]]"
  - "[[Matias Castello]]"
concepts:
  - id: code_review_adoption
    zh: 代码审查拐点
    en: code review adoption inflection
    one_line: 追溯性审查抓到真实 race condition，团队跨过「LLM 不够专业」门槛
  - id: agent_developer
    zh: 代理型开发者
    en: agent developer
    one_line: 消费基础设施的自主代理，与人类开发者需求不同、长期可能收敛
  - id: offline_harness
    zh: 离机工作流
    en: offline agent workflow
    one_line: Agents.md + 技能库 + Linear，人走开 Codex 仍计划、实施、测试
  - id: visual_ui_loop
    zh: 视觉驱动 UI
    en: visual-first UI loop
    one_line: 先生成 UI 图再让 Codex 实现，黑客马拉松级项目一夜 one-shot
column_source: "Recastory/workspace/bilibili-retranscribe/BV1i9E366EAr/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
updated: 2026-07-03
---
# Alchemy CPO Matias：从代码审查到自动代理

**Host：** Romain Huet（OpenAI）  
**Guest：** Matias Castello（Alchemy 产品负责人）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `BV1i9E366EAr/ingest/column_article.md`  
**B站专栏：** [cv50233159](https://www.bilibili.com/read/cv50233159/)

---

## 开场

Matias 不是工程师出身，却管过消费产品、Facebook 早期开发者平台，现在在 Alchemy 带 crypto 基础设施产品——他搭出来的 **副业项目**，比很多全职工程师还多。这期前半讲 **Alchemy 里 Codex 怎么落地**，后半 **屏幕共享** 他的个人构建流水线：Linear 当待办列表、睡觉派活、Apple Watch 语音改仓库。

核心问题就四个：**企业什么时候真信 AI 编码？** 基础设施公司怎么同时服务人类和自主代理？**人不在电脑前，Codex 怎么还能干几小时？** 实现细节离「对着手表说十秒就完事」还有多远？下面按四个结论展开——每章一个 Host 主问，Guest 第一人称答。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代码审查 | code review | 对 PR/变更做质量与安全检查；本期的企业 adoption 拐点 |
| 竞争条件 | race condition | 并发时序 bug；Alchemy 大迁移事故的核心 |
| 自主代理 | autonomous agent | 能自行注册、集成、执行链上任务的程序化开发者 |
| 技能库 | skills repo | 把 PM/编码流程封装成可复用指令包 |
| 功能开关 | feature flag | 模块化上线实验功能，醒来可逐个 toggle |
| 追溯性审查 | retroactive review | 对已合并代码回溯跑审查，验证能否抓到历史 bug |
| 应用服务器 | Codex App Server | 开源组件，把 Codex 嵌进 Mac/iOS/手表等自定义界面 |
| 视觉驱动 UI | visual-first UI | 先生成界面图，再让模型按图写代码 |

---

## 01 代码审查抓到真 bug，团队才信 AI

**Romain：** 你在 Alchemy 引入 AI 时，第一个让你「啊哈」的瞬间是什么？有没有那种一改团队态度的转折点？

**Matias：** 大概一年前，我们第一次在 Slack 里用 Codex。场景很土：改开发者文档。以前得本地跑整个站，流程又重又烦——拉代码、起服务、找页面、提 PR，改两行文案半天没了。后来在文档频道 @Codex，直接改，改完就能看。小步，但 **工作流从「开 IDE」变成「聊天里改文档」**——这是我们第一次在公司里正经用 Codex。OpenAI 内部也这么干，我们现在还在用，只是 harness 更复杂了。

更大的转折是 **代码审查**。我们出过一起小事故，根子要追到几个月前的一次大迁移——这种量级，bug 几乎躲不掉，代码面太大，边角情况总有一两个漏网。事后分析锁定了 **竞争条件**，团队修完、复盘完，有人提了个主意：**追溯性跑一遍 Codex 审查**，看它能不能抓到那个 bug——不是测新代码，是对已经合并的历史变更做回放。

**它抓到了。**

我们后来又试了几轮，就为了看大家会不会好奇、会不会自己上手。不是开大会宣传，就是小范围证明「这玩意儿在专业代码库上真管用」。几天后我在 Slack 里点开一位工程师的 PR：他 `@codex review`，按 comment 改，再 review，来回好几轮——作为队友，你点进去能看见完整对话，像多了一位永不疲倦的审查者。我作为 CPO 在 Slack 里围观这种来回，比任何内部培训都有说服力——**不是幻灯片里吹能力，是 PR 评论串里看见能力**。那一刻很清楚——人们正在跨过一道坎：不再默认「大语言模型搞不定专业级、服务海量用户的复杂代码库」，也不再怀疑它能不能扛生产流量。

**Romain：** 我跟很多公司聊过，代码审查往往是他们第一次摸 Codex 的入口。过去不少事故，回放发现 Codex 本可以拦住。Datadog 一月份说过，**超过五分之一的事故**本可避免；以现在 GPT 这一代的能力，我觉得一半不难，十分之九也不是梦。你平时在 Alchemy 还怎么用 Codex？

**Matias：** 审查之后用法就铺开了——写代码、改基础设施、跑内部分析，但 **心理门槛是在审查里被拆掉的**。很多团队卡在「模型会不会瞎改生产代码」；当你拿一起真实事故证明它抓得到 **竞争条件**，讨论就从「能不能用」变成「怎么嵌入流程」。我们后来也把审查嵌进 PR 常规动作，而不是单独搞 AI 实验室。再往后才是文档、小工具、内部分析脚本——顺序不能反，**信任是先于扩张的**。

> **金句 · Matias**
> **中文：** 不是模型突然会写代码了，是审查抓到了我们刚修过的那个竞争条件。
> **原文：** We retroactively ran Codex code review — and it did find the bug.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 追溯性审查 | retroactive code review | 对历史 PR 回溯跑审查，验证能否抓到已知 bug |
| 竞争条件 | race condition | 并发时序导致的隐蔽 bug；大迁移里常见 |
| 拉取请求 | pull request (PR) | 代码变更评审单元；工程师与 Codex 来回改的战场 |
| 大迁移 | large migration | 代码量巨大的一次性改造，事故温床 |
| adoption 拐点 | adoption inflection | 从试点到团队默认使用的转折 |

**本章小结**

- Slack 改文档是暖场；**审查抓到竞争条件** 才是信任拐点
- 工程师在 PR 里与 Codex 循环改，跨过「LLM 不够专业」心理门槛
- 推企业 AI coding：先找 **可回放的历史事故 + 审查**，比泛泛 **演示** 管用

---

## 02 平台要同时服务人类开发者与自主代理

**Romain：** 审查之后，你在 Alchemy 日常工作里怎么用 Codex？跟「开发者平台」这条线怎么连起来？

**Matias：** 用途很杂。典型 PM 活——写 PRD、分析客户反馈、整理 roadmap 争论——我都用 Codex，还配合公司内部建的 **技能库**。几个同事也在复用同一套技能；**跨职能共享 repo**，让不一定是 PM 的人也能跑得一样快。以前写 PRD 是「谁有空谁写」，现在是「谁有想法谁跑 skill」——输出格式统一，评审也省口舌。

更深一层：我们现在看「开发者」，**不只有人类**——还有消费我们平台和基础设施的 **自主代理**。Codex 这类工具得能快速接 OpenAI API、接 Alchemy 基础设施；几件事同时在变，不能各改各的。

Alchemy 本质是基础设施公司，内部工程师的工作方式已经全变了——这点团队里人人清楚，从写 smart contract 封装到内部工具，大家都在问「这段能不能交给 Codex 先起草」。对外呢？我们非常确定：**100% 的开发者都在 AI 帮助下构建软件**。平台得适应这个新现实——文档、SDK 示例、错误信息，都得按「人类 + AI 共读」来写。

还有更新兴的一类「开发者」：**自主代理**。它们不一定需要跟人一样的控制台——要能自己注册 API key、自己读文档、自己集成、用区块链执行任务。如果一个代理出现在 Alchemy 上，从决策到执行都是自主的，我们得给它 **可机器读、可自动走通** 的路径。我们得 **为人类开发者和代理开发者同时造工具**；眼下需求还不一样——人要可视化控制台，代理要稳定 API 和权限模型——长期可能会收敛。我的工作，就是搞清楚怎么两边都服务到位，别赌错边。

**Romain：** 跳出 Alchemy 聊创业。你以前也创过业——没有 AI 的那会儿，跟今天比有多难？

**Matias：** 难太多了。六七年前常见路径：先搓原型，融点钱，雇一个小团队，再建真产品。我自己搭第一个原型，基本就是左右复制粘贴 Stack Overflow，直到能跑——非工程师的笨办法，但那就是当时的天花板。后来融到钱，**三四名工程师** 干了几个月才出第一个 MVP——钱、人、时间都砸进去，中间还有无数次「这功能砍不砍」的拉扯。

我偶尔会想：今天用 AI，当年那个应用 **我一个人做第一版要多久？** 我猜 **不到一周**——不是打磨到上市，是「能演示、能验证想法」那版。你那边呢？

**Romain：** 我花了一年半，**15 名工程师** 才到第一个里程碑，V1 面向大量客户发布。

**Matias：** 进步大得离谱。做事从未如此简单——现在任何有想法的人，都有工具可以去试。对 **创始人** 来说，这可能是 **最好的入场时机**：验证想法的固定成本掉了一个数量级，你可以把省下的几个月花在找产品市场契合上，而不是跟打包配置较劲。

> **金句 · Matias**
> **中文：** 我们服务的开发者里，已经有一类是自主代理——它们要的是另一套工具。
> **原文：** The developer is an agent — sometimes an autonomous agent. They need different things.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自主代理 | autonomous agent | 自行决策、注册、集成的程序化「开发者」 |
| 技能库 | skills repo | 封装 PM/编码流程，跨职能复用 |
| 开发者平台 | developer platform | Alchemy 对外基础设施；要适配 AI 时代用法 |
| 人机需求收敛 | human/agent convergence | 两类开发者工具长期可能趋同，眼下仍分叉 |
| 一人 MVP | solo MVP | 非工程师用 AI 一周内出第一版，对比当年数月小团队 |

**本章小结**

- 公司内部：PM 技能共享 + 工程师全面 AI 化
- 平台层：100% 客户在 AI 辅助下写软件，还要接 **代理型开发者**
- 创业成本断崖：Matias 估 **<1 周 solo** vs 当年 **3–4 工程师 × 数月**；Romain **15 人 × 1.5 年**

---

## 03 离机工作流：睡前派活，醒来切换功能开关

**Romain：** 工作之外你在构建什么？听说你几乎 **每天一个项目**——怎么做到的？

**Matias：** 构建从未如此简单，我却长期焦虑，老觉得做得不够。现在稍微松口气了，靠的是一套 **离机设置**：我在电脑前花很少时间，Codex 能在我干别的时 **连续跑几小时**。

几个月前我出门都有负罪感——这项技术太猛，老想时刻构建。我不喜欢那种状态。于是投入精力做 **技能 + 流程 + 环境**：描述一个新想法，Codex 去 **制定计划、实施、测试**，完了通知我。午休用个人笔记本派活，周末出门前、睡觉前也是——我管这些叫 **「Codex 时刻」**，批量分派，让它在我没盯着的时候干。

现有产品想探索新功能？我让它 **研究该建什么**：看竞争对手、对齐我的目标和个人偏好。技能会 **模块化构建**，打 **功能开关**，在主应用里当实验项。睡前一句提示：研究某个 app，**构建能想到的前 10 个功能**。醒来看到 10 个 flag，逐个切换——**产生想法时我不当瓶颈**，留不留仍我说了算。

**Romain：** 我很想看看你的设置——Linear、Codex 应用，怎么串起来的？

**Matias：** Linear 里同时有 **12 个项目** 在进行。拿写作助手举例：Mac 应用，后来也做了 iOS 版，背后是 **Codex App Server**，走我的 ChatGPT 订阅。全局快捷键 Command+Shift+空格弹出小窗——在 Slack 里口述一句糙话，选「专业模式」，Command+Enter 重写，比手打快得多。

这个项目 Linear 里 **159 个问题已完成**，审查中、进行中的还有不少——**没有一个是我手写的**，全是 Codex。我只通过 **技能** 告诉它要什么；它建计划、拆里程碑、建任务，按 **Agents.md** 里我写好的偏好处理。那个文件总结了我喜欢的工作方式，新项目用它初始化，然后「执行计划」。

大语言模型编码最常翻车在哪？输出让你 **负面惊讶**——通常是模型做了你没说清的假设。我的流程要求 **提前把事说清楚**，信息对齐了，它就能直接去构建。

迭代现有产品时，另一套技能：告诉 Codex 高层目标，让它 **网上研究** 该建什么功能、对手在做什么，提建议，用功能开关 modular 实现——**睡一觉全部建好**，醒来逐个试。Codex 做研究比我强，不会搜烦；步骤小，但编进技能里，一口气跑完。

> **金句 · Matias**
> **中文：** 产生新想法时我不当瓶颈——十个功能开关，醒来我自己挑留哪个。
> **原文：** I won't be the bottleneck when generating new ideas — but I still control which features are good enough to stay.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 离机工作流 | offline / unattended workflow | 人走开，Codex 仍计划、实施、测试数小时 |
| Agents.md | Agents.md | 项目级偏好与协作约定，初始化新 repo |
| 里程碑分解 | milestone breakdown | Codex 把计划拆成 Linear 里程碑与 issue |
| 假设对齐 | assumption alignment | 输出 surprise 多因模型假设与预期不符；先澄清 |
| 实验性功能 | experimental features | 功能开关模块化上线，便于 toggle 决策 |
| 应用服务器 | Codex App Server | 把 Codex 嵌进 Mac/iOS 等非 IDE 界面 |

**本章小结**

- 焦虑解法：**Agents.md + 技能库 + 批量派活**，人不在电脑旁仍连续产出
- Linear 当界面：**159 个 issue 由 Codex 创建并执行**，人只管意图与验收
- 睡前 research+build 10 功能；研究、计划、实施一条龙编进技能

---

## 04 实现细节正在消失：从手表语音到视觉 UI

**Romain：** Codex App Server 之上你还做了什么？编码入口有没有更野的玩法？

**Matias：** 有 OpenClaw，助手叫 Lou——一个在朋友群讲笑话（不实用但好玩），一个帮我编码。跑在家里的专用机器上，接 Codex；Discord 频道绑定不同仓库，手机上跟 Lou 聊，任务在家里的 Codex 跑。

我还做了 **Apple Watch 复杂功能**：录一段短语音，触发 Codex 任务。网站登录页有个错别字？对着手表说十秒：「修这个错别字。」手表把备忘录发到 iPhone 应用，**转录 + 意图识别**，路由到对的 GitHub 仓库——几分钟后通知成功。后台可以是 API 密钥，也可以是 **Codex App Server 远程会话**。小任务特别顺手；**整个实现过程** 越来越像 **实现细节**。

**Romain：** 最近 GPT 5.5 和 Computer Use 有没有让你愣一下的时刻？

**Matias：** Computer Use 比记忆里强太多。上周末树莓派上要填一堆域名 URL 进管理面板，我懒得手抄，让 Codex SSH 进去干——我盯着电视看它在浏览器里找准页面、复制粘贴， **全程自己搞定**。本想省时间，结果时间全花在看它操作上。

GPT 5.5 那边，我有个十多年前的黑客马拉松项目 **Snapcat** 当个人评测基准——猫咪追激光点，点屏幕就调前置摄像头自拍，图库里是「猫视角」的倒置照片。当年 **五个人熬 24 小时** 才做出来；昨晚为了演示，**基本一次性** 重建了整个 app。

UI 更野：我先描述风格——轻快、色彩丰富、有趣——**生成 UI 图片**，再让 Codex **按图实现**。相机胶卷视图做完，我让它用同一风格重做设置页、主屏。这是 **非常不同且新颖的 UI 构建方式**；比我几个月前试的版本好太多，也比当年黑客马拉松产物强一截。

**Romain：** 最后给想掌握 Codex 的 **创始人** 和开发者一句建议？

**Matias：** 我起步时有三个假设，一直管用。第一，**假设它是可能的**——有想法，大概率能实现。第二，**假设你能做到**——很多人有能力，真障碍是「我不行」这个念头；哪怕怀疑自己，也先当能行，往往会成真。

第三，从模型拿结果失败时 **别急着怪工具**——**假设是你的错**：还没找到对的沟通方式。放下自尊，换表达、换流程，多试几次。我能构建这么多，靠的就是这个。

> **金句 · Matias（封底）**
> **中文：** 模型没给你要的，先假设是你还没说对——别急着怪工具不行。
> **原文：** When you don't get the result you want, assume it's your fault — not that the tool isn't capable.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 电脑操控 | computer use | Codex 通过 SSH/浏览器操作设备完成繁琐填表 |
| 视觉驱动 UI | visual-first UI loop | 文生 UI 图 → Codex 按图写界面代码 |
| 个人评估基准 | personal eval benchmark | Snapcat 等项目，每代新模型复跑测实现质量 |
| 开源应用服务器 | Codex App Server (OSS) | 手表→手机→GitHub 链路的底层；OpenAI 开源促生态 |
| 实现细节化 | implementation as detail | 口述意图即可，编码过程对用户透明 |

**本章小结**

- OpenClaw + Discord + **Apple Watch 语音** → 意图路由 GitHub，小任务 ten-second 闭环
- Computer Use 填表、Snapcat **5 人×24h → 一次性搞定**；UI 走 **图先行再实现**
- 三条假设：可能、你能行、失败先怪自己的表达方式

---

## 总结

| 维度 | 要点 |
|------|------|
| 企业落地 | **追溯性代码审查** 抓到竞争条件，PR 里人机循环改，比演示更能说服团队 |
| 平台思维 | **100% 客户在 AI 下写软件**；基础设施要同时服务 **人类开发者 + 自主代理** |
| 离机工作流 | **Agents.md + 技能库 + Linear**；159 个工单全自动；睡前派 10 个功能开关 |
| 入口实验 | **Codex App Server** 写作助手；OpenClaw；**Apple Watch 语音** 触发仓库任务 |
| 模型能力 | 电脑操控填表；**Snapcat** 当评测基准；**视觉驱动 UI** 一次性超越黑客马拉松 |
| builder 心态 | 假设可能、假设你能行、失败 **先假设是自己没说对** |

### 对个人的启示

- 把反复做的事写进 **技能**，把偏好写进 **Agents.md**——新项目复制粘贴即可开跑
- **不当想法瓶颈、仍握验收权**：研究+构建自动化，决策留给自己切换
- 非工程师出身不是障碍；Matias 的路径是 **广兴趣 + 模型变强 + 假设你能做到**

### 对团队/产品的启示

- 推 AI coding 先备 **可回放事故 + 审查**，Datadog 级数据（**>1/5 事故本可拦**）能加速共识
- 开发者平台要预设 **代理型客户**：注册、集成、链上执行，与人类 UX 分叉、长期或收敛
- 开源 **Codex App Server / CLI / Harness**，就是为了让你从 IDE 之外扩展编码代理

### 仍待验证

- Datadog「**>1/5**」与 Matias「**十分之九**」为 Host 侧判断，非 Alchemy 内部审计数字
- 专栏写作助手模型写 **GPT-4o**，Snapcat 演示指 **GPT 5.5**；以当期产品页为准

---

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 02:15 | 代码审查是团队采纳 AI 的关键转折点 |
| 06:42 | 将开发者平台的使用者视为自主代理 |
| 10:05 | 建立离机工作流摆脱构建焦虑 |
| 18:50 | 利用 Apple Watch 打造随时随地的编码入口 |
| 25:30 | 视觉驱动的 UI 开发新范式 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1i9E366EAr/ingest`
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV1i9E366EAr/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv50233159/
- **B 站**：https://www.bilibili.com/video/BV1i9E366EAr/
- **时长**：29:45

### 相关阅读

- [[Codex负责人-现场演示Codex]] — Codex 官方 multi-agent、Skills 演示  
- [[WorkOS-创建和使用Skills方法论]] — Skills 跨 Claude/Codex/Cursor 方法论  
- [[OpenClaw创始人-我是如何使用OpenClaw的]] — OpenClaw + Codex 移动端 dispatch  
- [[Loop-Agent Loop到底是什么]] — code review 闭环 vs 开放式 loop  
- [[MOC - Agent Theory and Design]] — Agent 主题横切索引  

---

### 收录说明

- **视频**：[BV1i9E366EAr](https://www.bilibili.com/video/BV1i9E366EAr/)（B 站 *Easonlee的AI笔记*）  
- **嘉宾**：Matthias，Alchemy CPO  
- **时长**：~29:45  
- **转写**：Recastory `bilibili-retranscribe/BV1i9E366EAr/`（FunASR SenseVoice + cam++，**asr v2**）  
- **版本**：canonical Host-Guest v3.2（2026-07-03；原讲义已合并）

