---
title: "Cursor实战-零代码构建语音助手Jarvis"
tags: ["ai_agent", "cursor", "codex", "column", "dialogue"]
legacy_tags: ["ai_agent", "cursor", "codex", "agentic_coding", "tutorial", "column", "dialogue"]
created: "2026-07-13"
source: "B站图文专栏 - Easonlee的AI笔记"
description: "开发者 Riley Brown 用 Cursor Agent 窗口 + GPT Realtime 2，零编程经验现场构建可语音交互、能搜索/生图/控电脑的桌面助手 Jarvis，并给出企业向智能体原生工作流转型的路径。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Cursor实战-零代码构建语音助手Jarvis.md"
source_sha256: "dba18673542c190e5333318e651bda458eb887f6a15febdb9f49aab4fa5fc84e"
migration_id: "migration-20260720-64e79771"
ingest_workflow: bilibili_opus_ingest_v2
aliases: [Riley Brown Cursor Jarvis, GPT Realtime 2 语音助手, 零代码智能体]
source_original_date: 2026-07-09
author: "Riley Brown（开发者/演示者）"
uploader: "Easonlee的AI笔记"
source_type: bilibili_opus
source_url: "https://www.bilibili.com/opus/1222908619516805124"
opus_id: "1222908619516805124"
column_id: "cv51255993"
video_url: "https://www.bilibili.com/video/BV198Mh6aEtz/"
bv: "BV198Mh6aEtz"
source_tier: C1
primary_source: column
material_tier: A
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

# Cursor实战-零代码构建语音助手Jarvis

> 来源：B 站专栏（Easonlee 的 AI 笔记转述 Riley Brown 的英文实战视频）。`source_form: dialogue`（演示者 Riley 与语音助手 Jarvis 的双声），`voice_basis: direct_speech`，仅复核专栏（`column_only`），未回核原视频，故 `factual_reviewed: partial`。

## 摘要

Riley Brown 用 **Cursor 的 Agent 窗口**配 **GPT Realtime 2**（OpenAI 实时语音模型），**零编程经验**现场构建出桌面语音助手 Jarvis：能自然对话、用 Exa 搜索、用 GPT 生图/编辑、画 Mermaid 图，并进入"电脑控制模式"操作桌面与 Codex。关键经验：实时语音模型天然适合挂载工具链；补充 API 密钥 + 细化 UI 提示词可快速修 Bug 并重构界面；电脑控制需关闭"敏感模式"并缩小窗口实现后台人机协同；图片网格编号可语音微调。结尾给出企业"智能体原生"转型愿景——把正确上下文/工具/权限装进可在 Slack/iMessage 中使用的共享智能体。

## 实战要点

### 零代码也能落地语音助手
基于 Cursor Agent + GPT Realtime 2，用户无需编程即可开发实时响应的桌面 AI 伴侣，大幅降低智能体开发门槛。Riley 仅用 **三次提示词** 创建出迷你 Jarvis：定义名为 Ricky 的桌面伴侣，具备实时语音、视觉界面、工具调用（Exa 搜索、GPT 生图、Mermaid 图）。运行提示词后 Cursor 约 **10–15 分钟** 构建出 Electron 桌面应用。

### 实时语音模型更适合作工具载体
GPT Realtime 2 作为语音交互媒介，能无缝挂载 Exa 网页搜索、DALL·E 图像生成等外部工具，让助手在保持自然对话的同时具备解决复杂任务的能力。

### 提示词优化显著提升稳定性
初版出现 Mermaid 解析错误、搜索 API 缺失。Riley 补上 **Exa 密钥**并细化界面布局提示词，将界面重构为左右分栏（左半脸 + 右 Artifact 面板），修掉第 8 行解析错误并渲染干净的 Markdown 流式搜索结果。

### 电脑控制需精细安全授权
助手操作桌面/输入文本时，默认"敏感模式"会频繁请求确认。关闭该模式并限制窗口尺寸（半透明、左下角小窗），可在不遮挡屏幕的前提下顺畅执行后台指令——实现高效人机协同。

### 图片网格编号实现语音微调
界面引入三列网格并为生成图片编号，用户仅凭语音"编辑 2 号，把它改成……"即可精准指定某图二次编辑；最新版本始终置顶，适合缩略图多版本持续迭代。

### 企业应向智能体原生转型
未来企业协作将深度依赖集成于 Slack/iMessage 的定制智能体；针对营销、文档、广告管理等流程构建专属 AI 技能，能为团队带来效率飞跃。核心是把**正确的上下文、工具与权限**装进共享智能体。

## 相关笔记

- [[Cursor-128个Agent团队协作]]：同属 Cursor 实战，展示 Agent 窗口如何零代码构建桌面智能体，并指向团队级多 Agent 协同。
- [[2026 年 Agent 最重要的工程概念 Harness Engineering]]：把"正确上下文/工具/权限"前置成企业共享智能体的 harness 思路，与 Riley 的智能体原生愿景同源。
- [[Claude Code实战-鲜为人知的Claude Code工作流]]：对比另一套 Agent 工作流；电脑控制模式的"明确批准"机制与 harness 权限设计同源。

## 来源声明

- 专栏原文：`source_url`（B 站 opus 1222908619516805124），`bv: BV198Mh6aEtz`，`column_id: cv51255993`，发布于 2026-07-09。
- 本笔记为专栏转述实战视频的中文整理，`voice_basis: direct_speech`，`dialogue_fidelity: source`，`question_source: column`，`verification_scope: column_only`。未读取图片、未使用 ASR/Recastory/transcript。
