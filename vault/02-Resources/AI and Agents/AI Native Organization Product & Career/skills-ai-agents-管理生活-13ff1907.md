---
title: "我如何利用 Skills + AI Agents 管理生活"
tags: ["ai_agent","bilibili","interview","dialogue","skills","context_engineering","harness_engineering","ai_career"]
created: 2026-09-17
source: "https://www.bilibili.com/opus/1242760108686966784"
description: "Remy 分享把个人提示经验沉淀为可复用 Skill，再通过 GitHub、插件和自动更新分发给团队；重点是唯一来源、版本控制、技能链和持续改进。"
knowledge_state: captured
link_status: connected
collection_priority: P0
source_original_date: "2026-08-31"
source_published_at: "2026-08-31 23:43"
ingest_workflow: bilibili_opus_ingest_v2
source_type: bilibili_opus
opus_id: "1242760108686966784"
column_id: "cv52771735"
uploader: "Easonlee的AI笔记"
primary_source: column
source_tier: C2
material_tier: A
source_form: dialogue
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
voice_basis: attributed_paraphrase
factual_status: partial
factual_reviewed: 2026-09-17
verification_scope: column_only
verification_basis: ["column"]
source_kind: url
source_reliability: unverified
source_verification: unverified
source_url: "https://www.bilibili.com/opus/1242760108686966784"
source_content_sha256: 13ff19077f3f8c427494d12d6b9c9ea72d9ed50dad08daec73ac5151865a02c5
bv: "BV1MStP6YE8e"
---

# 我如何利用 Skills + AI Agents 管理生活

> 这篇专栏记录 Remy 如何把日常提示经验变成团队可以安装、更新和复用的 Skill，并把个人技能仓库、团队仓库和可视化管理串成一套工作系统。
>
> **核心主张：** Skill 不是一条更长的提示词，而是有唯一来源、可按需加载、能持续迭代的工作标准；代理应保持薄，具体策略和质量门槛应沉淀在厚技能里。

> 代理要薄，技能要厚。
> ——Remy Gaskell（专栏整理）

## 开场

专栏以 AI with Remy 的对谈为主，围绕团队共享技能、插件分发、个人备份和技能自我改进展开。下文把原对谈压缩成方法论章节；人物观点均按专栏整理稿归属，不把演示中的产品功能当作独立验证结果。

## 01 Skill 是 agentic 时代的可复用工作标准

**核心判断：** 高频任务只有被写成可路由、可复用的工作标准，才会从“每次重新解释”变成组织能力。

**编者问：** 为什么全局提示、记忆文件或复制一份 `.skill` 不够？

**Remy Gaskell（专栏整理）：** Skill 应同时包含步骤、品牌偏好、上下文要求和检查标准，而不是只写一句任务描述。把文件直接发给同事会制造副本：原作者更新后无法同步，成员的修订也回不到权威来源。真正的收益不是“装了更多工具”，而是把重复出现的判断从对话中抽出来，变成代理可以按需加载的 SOP。

## 02 GitHub 与插件把技能变成组织资产

**核心判断：** 团队技能需要一个所有人都能安装、回滚和更新的权威仓库，不能长期依赖个人电脑上的文件夹。

**编者问：** 如何让不同部门共享技能，又不让每个人都维护一套分叉？

**Remy Gaskell（专栏整理）：** 按部门把技能集中到 GitHub，再封装为 Claude Code、Codex 等工具可安装的插件。插件负责按岗位分发，仓库负责版本、审阅和回退；成员打开自动更新后，新的排版、研究或邮件技能就能抵达所有环境。组织名下的仓库还把技能所有权从个人电脑转为公司可以持续维护的资产。

## 03 技能链要保留可单独复用的边界

**核心判断：** 大流程应由多个能独立运行的技能组成，边界应由未来的复用方式决定，而不是只按流程长度切割。

**编者问：** 为什么 YouTube 发布流程不直接写成一个巨型技能？

**Remy Gaskell（专栏整理）：** YouTube 发布可以由一个编排技能依次调用标题、缩略图和描述技能，但这些子流程仍应保留独立入口，因为用户常常只需要其中一步。这样既能复用单个能力，也能在更大的流程中组合它们；技能的组合关系本身还可以被可视化，帮助新成员理解输入、输出和调用链。

## 04 个人技能仓库首先解决备份与迁移

**核心判断：** 个人技能是长期积累的认知资产，独立仓库能同时解决备份、版本回退和跨设备运行问题。

**编者问：** 个人技能不共享给团队，为什么仍值得放进仓库？

**Remy Gaskell（专栏整理）：** 个人仓库把收件箱分拣、晨间简报等高度个性化流程放在唯一可信来源中，也让云端代理能够访问同一套技能。专栏用一次丢失大量技能的经历强调，快速构建时最容易漏掉的不是新功能，而是备份、回滚和恢复路径；这些基础设施决定积累能否跨设备继续复利。

## 05 厚技能、薄代理与持续改进循环

**核心判断：** 代理的全局指令保持简洁，任务策略和验收标准写进技能；每次真实运行产生的纠正，才是技能变好的主要反馈。

**编者问：** 技能怎样避免越积越多却越来越不可靠？

**Remy Gaskell（专栏整理）：** 每次技能运行结束时，检查是否出现失败步骤、变通方案、用户纠正或新信息；只有改动足够有意义时，才提出更新建议。团队成员的修订可回流仓库，使用统计则帮助识别从未使用或重复的技能。这个循环把技能当作会随工作生长的标准，而不是一次写完就永久正确的文档。

## 限制与边界

- 本笔记只读取 B 站专栏正文和页面元数据，没有读取原始视频、音频、图片、ASR、Recastory 或 GitHub 技能仓库。
- GitHub 插件、自动更新、使用统计和组织级安装均为专栏演示口径，具体产品能力、权限和计费会随版本变化，未独立核验。
- 原文是主持人与 Remy 的访谈整理稿；本笔记用“编者问”和“专栏整理”重构，不把访谈中的产品演示改写成普遍适用的工程规范。

## 知识连接

- **补充** [[WorkOS-创建和使用Skills方法论]]：WorkOS 从路由、渐进披露和评估解释 Skill 的基础结构；本篇补充团队分发、所有权和自我改进。
- **补充** [[Codex实战-Notion第二大脑与技能封装]]：从个人工作流落地补充技能封装、跨工具安装和自动化使用。
- **补充** [[MOC - Harness Engineering]]：技能仓库、上下文按需加载和反馈循环是 Harness 的可维护状态层。

## 来源说明

- 来源：B 站专栏《我如何利用 Skills + AI Agents 管理生活》；专栏地址：https://www.bilibili.com/opus/1242760108686966784。
- 专栏 ID：cv52771735；关联视频：BV1MStP6YE8e；上传者：Easonlee的AI笔记；页面发布时间：2026-08-31 23:43。
- 收录工作流：bilibili_opus_ingest_v2；来源等级 C2；事实状态 partial；仅以 column 为核验范围。图片、ASR、Recastory、transcript 与 Spot Check 均跳过。

## 关系状态

- 补充：[[WorkOS-创建和使用Skills方法论]] — 将 Skill 的路由与结构基础连接到本篇的仓库、分发和持续维护。
- 补充：[[Codex实战-Notion第二大脑与技能封装]] — 连接个人技能、跨工具使用和自动化工作流。
- 补充：[[MOC - Harness Engineering]] — 将技能视为上下文与反馈系统的可维护状态层。
