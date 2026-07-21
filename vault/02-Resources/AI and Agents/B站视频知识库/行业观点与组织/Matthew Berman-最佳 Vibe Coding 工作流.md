---
title: "Matthew Berman-最佳 Vibe Coding 工作流"
tags: ["ai_coding", "skills", "column", "lecture"]
legacy_tags: ["ai_coding", "vibe_coding", "agents_md", "skills", "automation", "loop", "cloud_agent", "column", "lecture"]
created: "2026-07-13"
source: "B站图文专栏 - Easonlee的AI笔记"
description: "AI 开发者 Matthew Berman 分享从新手到专家的 Vibe Coding 进阶工作流：用 agents.md/claude.md 规则文件规范智能体、把重复两次以上的操作封装成技能、用自动化+循环构建以终极目标为终点的自主运行、以测试/文档/日志三件套构成自动修复飞轮，并讨论云端并行智能体的合并冲突瓶颈与工作树/多模型策略。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Matthew Berman-最佳 Vibe Coding 工作流.md"
source_sha256: "ef86c7c3e194826e069db70d6d375d24182cdb231640296822153a08f34d1529"
migration_id: "migration-20260720-64e79771"
ingest_workflow: bilibili_opus_ingest_v2
aliases: [Matthew Berman Vibe Coding, agents.md 规则, 技能封装, 自动化循环, 修复飞轮]
source_original_date: 2026-07-04
author: "Matthew Berman（AI 开发者）"
uploader: "Easonlee的AI笔记"
source_type: bilibili_opus
source_url: "https://www.bilibili.com/opus/1221006820893523977"
opus_id: "1221006820893523977"
column_id: "cv51067237"
video_url: "https://www.bilibili.com/video/BV1MrTi6iEvh/"
bv: "BV1MrTi6iEvh"
source_tier: C1
primary_source: column
material_tier: A
source_form: lecture
content_form: lecture
dialogue_fidelity: none
question_source: none
voice_basis: attributed_paraphrase
factual_status: partial
factual_reviewed: 2026-07-13
verification_scope: column_only
verification_basis:
  - column
---

# Matthew Berman-最佳 Vibe Coding 工作流

> 来源：B 站专栏（Easonlee 的 AI 笔记转述 Matthew Berman 的英文技术分享）。`source_form: lecture`（单人技术分享，无对谈嘉宾），`voice_basis: attributed_paraphrase`，`dialogue_fidelity: none`，`question_source: none`，`verification_scope: column_only`，未回核原视频，故 `factual_reviewed: partial`。

## 摘要

Matthew Berman 把 AI 编程分为等级：新手写提示词→等结果→审查→再写；专家则自动化整个工作流。核心做法：

1. **规则文件规范行为**：用 `agents.md`（Claude Code 用专有 `claude.md`）定义工作流、commit 风格、模型性格与编码偏好，避免生成垃圾代码或冗长回复。几乎所有工具都支持 `agents.md`。
2. **重复操作封装为技能**：任何重复两次以上的操作都该变成斜杠技能（skill），免去反复粘贴提示词；智能体还能在运行时自动发现并调用技能。技能可用于特定领域规则、工具指令（API/CLI 调用）、质量门禁（提交前跑全测试、100% 通过才修）。
3. **自动化与循环**：自动化=按触发条件自动发提示词；循环=智能体无限期运行直到达成终极目标。两者是顶级开发者的核心模式。
4. **自动修复飞轮**：夜间文档扫除、性能优化（如"50 毫秒内页面加载"循环）、生产环境错误扫除等循环，构成"完美测试 + 完美文档 + 完美日志"的飞轮，确保代码库长期高质量。
5. **云端 vs 本地智能体**：云端无限并行、随处可用、隔离环境、自动截图/视频；本地更快、控制更强、新功能先到。作者倾向把工作流迁到云端。
6. **工作树与多模型**：为每个并行智能体建 work tree 避免写同一文件互相污染；多模型按阶段分工（Fable 规划→Composer 编码→GPT-5.5 审查）以降速降本。
7. **合并瓶颈（未解难题）**：十几个智能体并行向 main 合并会触发 CI/部署互相锁死、反复 rebase 重跑；暂无完美解，Cursor 正研发面向智能体规模化的 Git 替代方案。

## 实践要点

- 工具偏好：Cursor（多模型、最早推云端智能体）、Codex（解释简洁）；Claude Code/Devin/Factory 亦可。
- 代码审查接 Greptile：PR 开启即审，给 0-5 置信度与修复提示词。
- 现成技能库（如 Agent Skills，GitHub 6.1 万星）可直接"安装这个技能"复用。

## 相关笔记

- [[2026 年 Agent 最重要的工程概念 Harness Engineering]]：规则文件 + 技能 + 自动化循环，正是 harness 的配置三件套；自动修复飞轮是 harness 把验证闭环内建的体现。
- [[WorkOS-创建和使用Skills方法论]]：把重复操作封装为技能、运行时自动发现，与该篇 Skills 方法论直接呼应。
- [[Cursor实战-零代码构建语音助手Jarvis]]：本篇以 Cursor 为首选工具之一，Jarvis 实战即 Cursor 云端智能体的具体落地。
- [[Manus创始人-深度干货-上下文工程的最佳实践]]：并行智能体需工作树隔离、上下文互不污染，与 Manus 的 context 隔离/offload 思路同构。

## 来源声明

- 专栏原文：`source_url`（B 站 opus 1221006820893523977），`bv: BV1MrTi6iEvh`，`column_id: cv51067237`，发布于 2026-07-04。
- `material_tier: A`，`source_form: lecture`，`content_form: lecture`，`dialogue_fidelity: none`，`question_source: none`，`voice_basis: attributed_paraphrase`，`factual_status: partial`，`verification_scope: column_only`。未读取图片、未使用 ASR/Recastory/transcript。
