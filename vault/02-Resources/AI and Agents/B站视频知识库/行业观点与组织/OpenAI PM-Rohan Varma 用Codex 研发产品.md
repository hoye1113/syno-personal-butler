---
title: "OpenAI PM-Rohan Varma 用Codex 研发产品"
tags: ["ai_agent", "codex", "openai", "column", "dialogue", "s_tier"]
legacy_tags: ["ai_agent", "codex", "openai", "pm_workflow", "agent_workflow", "column", "dialogue", "s_tier"]
created: "2026-07-13"
source: "B站图文专栏 - Easonlee的AI笔记"
description: "OpenAI PM Rohan Varma 对话 Peter Yang：Codex 如何重塑产品经理工作流——效率提升 3-4 倍、倒置产品开发生命周期（先建 MVP 再决策）、自配置并自删的触发器自动化、Imagegen 极速原型、一次性软件、以及 Goal 模式让智能体自主完成 PR 合并。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/OpenAI PM-Rohan Varma 用Codex 研发产品.md"
source_sha256: "0ffe0dcb01e00ed52894e65081fb3264774e451197b456639b3b2f705aa27c38"
migration_id: "migration-20260720-64e79771"
ingest_workflow: bilibili_opus_ingest_v2
aliases: [Rohan Varma Codex, OpenAI PM 如何用Codex, Codex 倒置开发流程, Goal 模式]
source_original_date: 2026-07-07
author: "Rohan Varma（OpenAI PM）/ Peter Yang（主持人）"
uploader: "Easonlee的AI笔记"
source_type: bilibili_opus
source_url: "https://www.bilibili.com/opus/1222346069005828103"
opus_id: "1222346069005828103"
column_id: "cv51254707"
video_url: "https://www.bilibili.com/video/BV1HXMh62Eo6/"
bv: "BV1HXMh62Eo6"
source_tier: C1
primary_source: column
material_tier: S
source_form: dialogue
content_form: dialogue
dialogue_fidelity: source
question_source: column
voice_basis: direct_speech
factual_status: partial
factual_reviewed: 2026-07-13
verification_scope: column_only
verification_basis:
  - column
---

# OpenAI PM-Rohan Varma 用Codex 研发产品

> 来源：B 站专栏（Easonlee 的 AI 笔记转述 Rohan Varma 与 Peter Yang 的英文对谈）。`source_form: dialogue`（嘉宾 Rohan Varma + 主持人 Peter Yang 真实对谈），`dialogue_fidelity: source`，`question_source: column`，`voice_basis: direct_speech`，`verification_scope: column_only`，含未独立核验的量化表述（见限制与边界）。未读取图片、未使用 ASR/Recastory/transcript。
>
> **核心主张：Codex 正倒置产品开发生命周期——先做出 MVP 再决定发什么，PM 退到前期战略与后期推向市场两端；自配置自删的触发器自动化、Imagegen 极速原型与 Goal 模式，让职业生涯几乎所有事都能立刻托付执行。**

> 把目标设定在比你想象中还要夸张十倍、看似不可能的事情上——它大概能帮你完成其中的 90%。
> ——Rohan Varma

## 核心对话

**核心判断：Codex 从执行与协作两个维度重塑 PM 工作流——海量信息 20 分钟掌握、产出物大量自动化、开发周期被倒置为「先建 MVP 再决策」；PM 的价值收敛到梳理核心问题、设定护栏与推向市场。**

**Peter Yang（主持人）：** 我做了十多年 PM，以前大量时间花在改 Google 文档、做规划、开对齐会。Codex 是怎么从根本上改变你作为 PM 的工作方式的？

**Rohan Varma（嘉宾）：** 它从两个维度改变 PM：具体工作的执行方式，以及整个团队（工程、产品、设计）现在都用 Codex，每个人角色都微妙变了。在 OpenAI，Codex 项目上只有几位 PM 负责很多领域，靠的就是 Codex。每天从企业客户、Twitter 等渠道涌来数百个问题/数据点/Bug，Codex 在前端整合海量信息价值极大——即便最后一刻加入全新项目，我也能在 20 分钟内掌握之前所有背景，因为它接入了 Slack、Notion、Linear、邮件、Google 云端硬盘。产出方式也根本变了：幻灯片、原型、文档、PRD 大量可自动化。

**Peter Yang（主持人）：** 那我们把更多时间花在决策、思考和客户交流上。

**Rohan Varma（嘉宾）：** 对，重复手工琐事时间大减。

**Peter Yang（主持人）：** 现在有个梗说规划文档是写给智能体看的。你们做多少规划？Codex 怎么参与？

**Rohan Varma（嘉宾）：** OpenAI 运作仍像研究实验室，不会提前规划六个月，我们更想要"未来四到八周"的计划，四周后看新优先级。Codex 的深远影响是让我们几乎瞬间把东西做出来，所以大量时间花在评估现成方案、决定要不要发布。产品生命周期被**倒置**了：以前花大量前期规划确保工程师只做最重要的事，现在变成"先把所有东西做出来"，再决定哪些上线、怎么上线。因为工程师已做出 MVP，我们直接在内部快速反馈迭代，而不是对着文档指手画脚。每个项目甚至整条产品线常常只有一两个工程师负责——协作成本是大瓶颈，工程师能极快推进时，微小决策自己就搞定，不用跟我对齐。我做的是梳理核心问题、设"护栏"，工程师和设计师相当自主，PM 负责两端：前期战略与后期推向市场。

**Peter Yang（主持人）：** 你怎么引导普通人更大胆地用 Codex，而不只是结对编程？

**Rohan Varma（嘉宾）：** 即使开发者里也只有前 5%-10% 在最大化利用 Codex，长尾还停留在结对编程、很少任务托管。非开发者过去三年基本只接触 ChatGPT，提问类型和可托付给 Codex 的工作差很多。机遇在于引导人们更大胆地提请求——职业生涯几乎所有事都能立刻让 Codex 执行。最神奇的是"目标（Goal）"功能：以前不断下指令，现在它会一直自动执行，直到完全符合设定标准。

**Peter Yang（主持人）：** 你常用的 PM 工作流有哪些？

**Rohan Varma（嘉宾）：** 我在 OpenAI 重度用 Slack，常让 Codex 提炼反馈重点并直接录入 Linear 看板，然后让它建一个自动化任务持续运行。最棒的是 **Codex 知道怎么给自己配置自动化**：它会设定每天/每周运行，完成后发 Slack 消息给我——这种自动化我可能配了五六个。还有更具创意的触发式玩法：让 Codex 在某条消息被回复后去向同事提问、或据上一条私信起草客户回复邮件；后台检测 Slack，触发起草后**自动删除这个临时自动化**。它甚至能调用自己，做没有明确说明的随机事。不过目前没有原生云端自动化，需本地常开电脑，已在规划中。

**Rohan Varma（嘉宾）：** 另一件根本改变工作流的是 **Imagegen**：在 Codex 里标 imagegen 技能就触发，比写 React 代码做原型快得多。我截一张图让它生成四五个数字化设计方案，选中后再做成网站原型。内部还构建了技能让 Codex 生成设计资产时访问设计规范、集成 Figma 插件取设计 token。还有"技能创建器"——让 Codex 浏览讨论串创建技能以便模板化。但技能反复改可能污染 Prompt，我也在想是否要对技能修改建评估机制。

**Peter Yang（主持人）：** 我也做技能，但担心一直改会改乱。

**Rohan Varma（嘉宾）：** 是的，技能/插件确实往 Prompt 引入很多细节。

**Peter Yang（主持人）：** "一次性软件"是什么？

**Rohan Varma（嘉宾）：** 创建软件太轻松，我经常做**一次性、不复用**的东西。比如让 Codex 实时看我所有 Slack 消息，找出最需回复的重要消息并在本地网页可视化展示；有用的就设自动化每小时更新。以往觉得开发小工具要投入大量精力，现在一切极易，你完全可针对自己习惯定制——这里存在大量"能力残留（overhang of capabilities）"。

**Rohan Varma（嘉宾）：** 浏览器使用也很酷：有次我想把 Notion 文档转成 Sites 网站，Notion MCP 没暴露真实图片，Codex 竟自己打开浏览器深入 DOM 提取真实图片文件用到网站上。它比人有毅力，会不断尝试解决问题。这就是 Goal 模式的价值——处理更高难度、更长跨度任务时越来越好。

## 限制与边界

- 本笔记为专栏转述真实对谈，`voice_basis: direct_speech`，`verification_scope: column_only`，未回核原视频；含未独立核验的量化表述：效率"3-4 倍"、长尾开发者"前 5%-10%"、Skill 技能模板化等。
- 节目由 Oceans 赞助，含招募助理的广告内容，不影响方法论主体。
- 当前 Codex **无原生云端自动化**，依赖本地常开电脑；"Goal 模式自主合并 PR"为产品方向描述，具体可靠性未验证。
- 技能/插件反复修改可能污染 Prompt，Rohan 本人亦未给出确定解。

## 知识连接

- **支持** [[Every咨询主管-每天用Codex 重塑工作流]]：Natalia 同样"每天用 Codex"重塑工作流，与本篇 PM 视角互为佐证——Codex 已成知识工作者的日常杠杆。
- **补充** [[2026 年 Agent 最重要的工程概念 Harness Engineering]]：Codex 控制中心、技能与工具集成（Slack/Notion/Linear）即 harness——把控制权、上下文与护栏交给外壳，人类退到战略端。
- **依赖** [[OpenAI员工-上下文工程和Agent记忆]]：Codex 接入 Slack/Notion/Linear/邮件/GDrive，20 分钟掌握新项目背景，是上下文工程在 PM 工作流的产品化落地。
- **应用于** [[Manus创始人-深度干货-上下文工程的最佳实践]]：Rohan 的"倒置开发（先建 MVP 再决策）"与 Manus 的 context offload/compact 同属"让模型看全貌、再筛选"的思路。
- **限制** [[OpenAI总裁-聊天与Agent的融合计划]]：本篇 Goal 模式（自主监控 CI、处理审查、合并 PR）与 Greg Brockman 所述"聊天与 Agent 融合、后台长任务"方向一致，但本篇无云端自动化、技能易污染 Prompt——见上方限制与边界。

## 来源声明

- 专栏原文：`source_url`（B 站 opus 1222346069005828103），`bv: BV1HXMh62Eo6`，`column_id: cv51254707`，发布于 2026-07-07。
- `material_tier: S`，`source_form: dialogue`，`content_form: dialogue`，`dialogue_fidelity: source`，`question_source: column`，`voice_basis: direct_speech`，`factual_status: partial`，`verification_scope: column_only`。未读取图片、未使用 ASR/Recastory/transcript。
