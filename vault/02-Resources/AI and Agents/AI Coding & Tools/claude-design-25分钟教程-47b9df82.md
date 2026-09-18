---
title: "Claude Design：25分钟教程"
tags: ["ai_agent","article","bilibili","claude","anthropic","ai_coding","context_engineering"]
created: 2026-09-16
source: "https://www.bilibili.com/opus/1244168707607887910"
description: "首页 番剧 直播 游戏中心 会员购 漫画 赛事 下载客户端 大会员 消息 1 动态 收藏 历史 创作中心 投稿 目录 Claude Design：25分钟教程 摘要 重点速览 01 定义产品问题 02 寻找灵感与创建 Design.md 03 在 Cloud Design 中探索原型 04 迭代核心页面 05 制作 HTML 规格文档 06 设计所有核心页面"
knowledge_state: captured
link_status: connected
ingest_workflow: bilibili_opus_ingest_v2
source_type: bilibili_opus
opus_id: "1244168707607887910"
column_id: "cv52811677"
uploader: "Easonlee的AI笔记"
primary_source: column
source_tier: C2
material_tier: A
source_form: lecture
content_form: lecture
dialogue_fidelity: none
question_source: none
voice_basis: direct_speech
factual_status: partial
factual_reviewed: 2026-09-17
verification_scope: column_only
verification_basis: ["column"]
source_kind: url
source_reliability: unverified
source_verification: unverified
source_url: "https://www.bilibili.com/opus/1244168707607887910"
source_content_sha256: 080ddf32b1cfcf7fccd0b0642076db89174ff85adf9fde313275824a78f8e941
---

# Claude Design：25分钟教程

> 讲者：Peter Yang（Behind the Craft）。主题：用 Claude Design 与 Claude Code，把一个个人产品从问题定义、视觉方向和原型，推进到规格文档、全页面设计与应用构建。
>
> **核心主张：** AI 原生产品开发的关键不在一条“万能提示词”，而在写代码前建立可审阅、可反馈、可同步的设计与规格事实来源；先把歧义和边界消掉，再让模型进入实现阶段。

> 先做规划，再让 AI 构建；前期设计与规格文档是后续实现的双重事实来源。
> ——Peter Yang（专栏整理）

## 开场

**核心判断：** Tastemaker 的示例说明，个人项目可以缩小前期研究，但不能跳过“为谁解决什么问题”的定义。

Peter Yang 以自己想整理电影、电视节目和电子游戏品味的需求为例，演示如何用 AI 设计一个可分享的个人页面。产品起点不是“做一个媒体收藏站”，而是把分散在不同网站的品味集中到一个页面；如果目标是商业化，还需要另外验证需求、获客与收入机会，自用项目则可以先控制研究成本。

## 01 先定义用户问题，再谈功能

**核心判断：** AI 构建的第一步应是澄清问题、目标用户和证据范围，而不是直接索要一套界面。

**Peter Yang（讲者）：** 他先让 Claude Code 围绕产品想法定义客户问题和目标用户，并查找网上是否存在问题证据。这样做的目的不是让模型替代产品判断，而是把“我想做什么”变成一个可以继续讨论的产品问题。

- 用户希望在一页中展示自己在电影、电视和游戏上的品味，而不是维护三份彼此分离的清单。
- 自用产品可以先基于个人需求推进；一旦变成商业产品，就必须单独研究是否有人愿意使用、付费或分享。
- 这一步先确定问题边界，后续视觉和技术决策才有明确对象。

## 02 用 Design.md 约束默认审美

**核心判断：** Design.md 的价值不是增加一份装饰性文档，而是把参考视觉转成模型可持续遵守的颜色、字体、间距和设计原则。

**Peter Yang（讲者）：** AI 默认容易生成千篇一律的紫色渐变和通用组件，因此他先从 Monogram 等产品中寻找视觉灵感，再把截图和目标产品描述交给 Claude Code，生成 Tastemaker 的 Design.md。原则是保持界面安静，把视觉重点交给内容图片；参考灵感不等于照搬另一个产品。

- Design.md 记录颜色、字体、间距和整体视觉方向。
- 参考产品的做法要迁移到不同品类，不能把原产品的页面和品牌直接复制过来。
- 设计系统文件成为后续 Claude Design 原型和代码实现的共同约束，减少每个页面重新发明一套审美。

## 03 先让原型发散，再由人收敛

**核心判断：** Claude Design 更适合先并行探索多个方向，再由人依据品味和产品约束做选择与反馈。

**Peter Yang（讲者）：** 有了 Design.md 后，他在 Claude Design 中为公开品味主页和未登录落地页各生成多个版本，并明确要求网页而非移动端。Claude Design 会提出澄清问题，帮助确定示例用户、布局方向、明暗主题、真实文案和页面内容。

- 同一页面先比较重排版与网格布局、浅色与深色版本，再确定主方向。
- 直接编辑可以删掉未实现的按钮、无意义说明和过度压缩的卡片；聊天反馈则把卡片数量、导航、评论布局和预览位置说清楚。
- 模型不会一次生成完美设计，人的品味负责收敛：选择版本、指出不一致、修改文案，并让模型继续迭代。

## 04 核心页面先于完整规格成形

**核心判断：** 先做少数关键页面，再编写完整规格，更容易发现默认状态、边界条件和产品规则。

**Peter Yang（讲者）：** 他先把落地页和个人主页做出来，再把它们导出为 HTML，制作包含产品、设计和技术要求的规格文档。与传统的“先写 PRD、再交给设计、最后交给工程”不同，这套流程先用可见的核心页面帮助产品定义具体化。

- 规格 HTML 集中 PRD、视觉原则、组件库、技术栈和数据架构，成为产品的一个事实来源。
- 组件库用于防止新增页面时 AI 随意创造互不一致的控件，并应随页面增加持续更新。
- 数据架构要在上线前审阅；数据库一旦投入生产，修改成本会迅速升高。
- 先看见关键页面，再补齐默认、空状态和边界情况，能减少“文档看似完整、实际无法实现”的歧义。

## 05 从规格生成全页面，并持续检查状态

**核心判断：** 规格文档不能只描述理想状态，还要约束所有核心页面、空状态、编辑状态、引导和分享路径。

**Peter Yang（讲者）：** 他把规格 HTML 交回 Claude Design，让模型据此生成所有核心页面，包括创作者版本、编辑操作、空的品味档案、条目详情、认领用户名和新手引导等状态。生成后仍需逐页检查并提供反馈，不能把“根据规格生成”理解成自动完成。

- 关键页面先确定规则，后续页面再遵循同一组件与视觉体系。
- 空状态需要给出明确行动号召；编辑、保存、分享和 onboarding 都是产品流程的一部分。
- 设计 HTML 展示实际页面效果，规格 HTML 解释产品和技术要求；两者共同约束实现。

## 06 构建阶段仍需要双向反馈

**核心判断：** AI 让实现变快，但不会消除产品判断；规格和设计必须与代码一起迭代，直到真实页面符合意图。

**Peter Yang（讲者）：** 最终他把规格 HTML 与设计 HTML 一起交给 Claude Code，要求模型先检查两份事实来源并主动提出歧义，再开始构建应用。即使模型声称完成，也要运行 localhost、对照设计逐轮反馈，并同步更新规划文件和设计文件。

- 前期规划至少应占据整个项目的重要部分；直接让模型“做一个电影、电视和游戏应用”会留下大量未定义选择。
- 数据库和技术栈一旦开始落地，返工成本会上升，所以应尽量把问题解决在原型和规格阶段。
- 真实构建仍包含多轮沟通、截图反馈、视觉修正和功能补缺，不是一次提示就能完成。
- 这套流程可以迁移到 Figma、纸笔或其他 AI 原生设计工具；Claude Design 只是演示所用的一个工具。

## 限制与边界

- 本笔记只读取 B 站专栏正文和页面元数据，没有读取原始视频、图片、ASR、Recastory 或 Peter Yang 提供的外部资源。
- 页面正文同时使用“Claude Design”和“Cloud Design”等称呼；本文按专栏原文保留其产品与步骤口径，不据此推断官方产品命名或当前功能状态。
- Tastemaker 是演示项目；页面数量、三周估时、约几小时完成、Supabase 与身份验证等均为讲者在演示中的说法，不是通用交付承诺。
- Design.md、HTML 规格和双事实来源是该讲者的工作方法，不等于所有团队都应采用的唯一流程；实际效果仍取决于人的审阅、反馈质量、代码验证和数据设计。
- 付费技能、资源链接和订阅推广属于原文导流，已删除，不把它们当作知识结论。

## 知识连接

- **补充** [[Claude Design实战-从创意到高保真]]：既有笔记聚焦 Claude Design 的问卷、线框图、高保真、PPT 与工具局限；本篇补充从 Design.md、原型发散到 HTML 规格、全页面状态和代码构建的完整前置流程。
- **补充** [[02-Resources/AI and Agents/AI Coding & Tools/Claude设计主管-Cowork揭秘40分钟教程]]：既有笔记说明可工作原型、松散协作与内部 dogfooding 如何改变设计流程；本篇把“先做可审阅产物、再和模型往返”具体化为产品问题、设计系统、规格和实现之间的闭环。

## 来源说明

- 来源：B 站图文专栏《Claude Design：25分钟教程》，opus `1244168707607887910`，column `cv52811677`。
- 上传者：Easonlee的AI笔记；页面日期：2026-09-04 18:50；讲者：Peter Yang（Behind the Craft）。
- 来源形态与成稿形态：单人产品设计教程，`source_form: lecture`、`content_form: lecture`；没有把编者问题伪装成现场问答。
- 收录工作流：`bilibili_opus_ingest_v2`；来源等级 C2；素材等级 A；`factual_status: partial`；核验范围 `column_only`，仅以专栏文字和页面元数据为依据。
- 已跳过：图片、原始视频、transcript、ASR、Recastory、Spot Check、官方产品页和外部资源页。

## 关系状态

- 补充：[[Claude Design实战-从创意到高保真]] — 既有笔记聚焦 Claude Design 的问卷、线框图、高保真、PPT 与工具局限；本篇补充从 Design.md、原型发散到 HTML 规格、全页面状态和代码构建的完整前置流程。
- 补充：[[02-Resources/AI and Agents/AI Coding & Tools/Claude设计主管-Cowork揭秘40分钟教程]] — 既有笔记说明可工作原型、松散协作与内部 dogfooding 如何改变设计流程；本篇把先做可审阅产物、再和模型往返具体化为产品问题、设计系统、规格和实现之间的闭环。
