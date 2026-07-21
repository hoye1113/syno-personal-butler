---
title: "Hyperframes-HeyGen 用 HTML 代码做 AI 视频"
tags: ["skills", "column", "dialogue"]
legacy_tags: ["ai_video", "hyperframes", "heygen", "video_agent", "html", "skills", "column", "dialogue"]
created: "2026-07-13"
source: "B站图文专栏 - Easonlee的AI笔记"
description: "HeyGen 的 Bin Liu 与 Hyperframes PMM Jake Moran 对话 Peter Yang：用免费工具 Hyperframes 以 HTML/CSS/JS 生成专业 AI 视频。核心是\"网站转视频\"开源技能（抓素材→故事板→代码→渲染）、design.md→frame.md 视觉规范、50+ 开源组件复用、Studio 的 UI 修改转代码 diff 供智能体协同、以及\"时间美学\"自评闭环。Hyperframes 已与 Hermes 整合把智能体汇报转成 30 秒视频。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Hyperframes-HeyGen 用 HTML 代码做 AI 视频.md"
source_sha256: "bf32e7372528998b82999b682a605df0b6644949f68e7bc8e51a6daec59e5ff7"
migration_id: "migration-20260720-64e79771"
ingest_workflow: bilibili_opus_ingest_v2
aliases: [Hyperframes 教程, HeyGen 视频智能体, website-to-video, frame.md, HTML 是 LLM 母语]
source_original_date: 2026-07-02
author: "Bin Liu（HeyGen 产品工程 VP）/ Jake Moran（Hyperframes PMM）/ Peter Yang（主持人）"
uploader: "Easonlee的AI笔记"
source_type: bilibili_opus
source_url: "https://www.bilibili.com/opus/1220311027565985864"
opus_id: "1220311027565985864"
column_id: "cv51066299"
video_url: "https://www.bilibili.com/video/BV1vtTi6LEhx/"
bv: "BV1vtTi6LEhx"
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

# Hyperframes-HeyGen 用 HTML 代码做 AI 视频

> 来源：B 站专栏（Easonlee 的 AI 笔记转述 Bin Liu、Jake Moran 与 Peter Yang 的英文对谈）。`source_form: dialogue`（主持人 Peter Yang + 嘉宾 Bin Liu、Jake Moran 真实对谈），`dialogue_fidelity: source`，`question_source: column`，`voice_basis: direct_speech`，`verification_scope: column_only`，未回核原视频，故 `factual_reviewed: partial`。

## 核心对话

**Peter Yang（主持人）：** 今天请到 HeyGen 产品工程 VP Bin 和 Hyperframes PMM Jake。Hyperframes 完全免费、能用 HTML 直接做出惊人 AI 视频。Bin，怎么在 Codex 或 Claude Code 里配置它？

**Bin Liu（嘉宾）：** 访问 hyperframes.heygen.com 的 Quick Start，复制命令在终端运行就会拉取技能并自动执行；或在 Codex 插件商店 Creativity 分类安装；没有这些工具也能在 Claude 的"自定义连接器"里装 Hyperframes，然后直接说"帮我做个视频"。

**Peter Yang（主持人）：** 不会写代码能用吗？

**Bin Liu（嘉宾）：** 我们有完全开源的"网站转视频（website-to-video）"技能，教助手分 7 步把网站变视频：捕获网站内容→制作故事板→规划流程→输出代码→渲染。比如一个 Spotify 宣传片，就是 Fable 5 配合 Claude Code，输入 Spotify.com 说"做个宣传视频"自动生成的——它自动抓素材、写故事板、连音频都做好了。默认用本地模型做 TTS，也支持 HeyGen、ElevenLabs。

**Jake Moran（嘉宾）：** 我从零做全新内容时，会先建项目文件夹放背景上下文（如 Readme）和素材（UI 截图），再补视觉风格。除了 design.md，我们新发了 frame.md：上传 design.md 它会重排成更适合视频的格式——视频要最大化利用画面、放大元素加动效，不像网页讲究空间布局。

**Peter Yang（主持人）：** design.md 是字体颜色品牌指南吧？

**Jake Moran（嘉宾）：** 对，是视觉方向指导，不写死在 HTML 里，给模型更大自由度。frame.md 更进一步告诉助手"视频要放大、动态"。

**Jake Moran（嘉宾）：** 我会让助手读这些文件生成 storyboard.md（关键事件表格，逐场景拆分），先微调核心文案；再让助手参考开源仓库复用组件——我们开源了至少 50 个常用组件和所有发布视频的完整代码库。最近三个视频我复用同一个提示词框组件、只换 frame.md，视觉就完全不同。先让助手为每场景生成静态帧做美学审核，确认后再生成完整视频，比直接想整个动态视频快得多。

**Bin Liu（嘉宾）：** Studio 会把视频按代码结构拆成场景，不懂代码的人也能在 UI 直接改文本/位置/动效，修改会自动转成代码。因为智能体能做 code diff、且 LLM 极擅长 HTML/CSS/JS，它能理解改动对视觉的影响，与人类协同完成"最后一公里"精修。可导出 MP4/WebM，甚至透明背景层进 Premiere。

**Peter Yang（主持人）：** 既然全是 HTML，能导出交互式网站吗？

**Bin Liu（嘉宾）：** 能。正因是 HTML，我们做交互式视频。HeyGen 不跟 Sora/Veo 卷电影级，而是解决商业沟通——视频比五页文档更有效。数字分身（avatar）是第一步，搞定 A-roll 后我们发现绝大多数人不会剪 B-roll/动效，于是转向用代码做视频：HTML 是 LLM 的母语，Gemini 3、GPT-5、Opus 出现后模型已能用代码表达视觉美学。

**Peter Yang（主持人）：** 怎么保证生成的场景美观？

**Bin Liu（嘉宾）：** LLM 在 HTML/CSS 上掌握的是"空间美学"，但视频需要"时间美学"——观看时视线被主动推送、引入时间维度，目前模型没受过这方面训练。我们内部建了评估、基准与自我检查闭环提升时间美学，并把想法开源进 skills，正与前沿实验室合作训练模型处理时间维度。

**Bin Liu（嘉宾）：** 场景很多样：产品发布视频是终极目标；房地产、教育、内部培训也在用；我们甚至把 PR/Commit 记录转成视频展示进展。我们还与 **Hermes** 深度整合——智能体汇报常啰嗦返回大段文字，我们把它转成 30 秒 Hyperframes 视频展示成果。

**Peter Yang（主持人）：** 不用 Fable 5 这种顶级模型，次优推荐什么？

**Bin Liu（嘉宾）：** Gemini 在性价比上平衡极佳，我们内部智能体也基于 Gemini 构建。Fable 5/GPT-5 代表顶尖质量。

**Jake Moran（嘉宾）：** 我两月前也不会 HTML 视频剪辑，从 5 秒小动效起步，做出满意的特效就转成"技能"复用。两三月里我包揽了 20-25 次发布，现在团队很多工程师也能自己做了，无需学 After Effects 或剪映。

## 实践要点

- 安装：终端跑 Quick Start 脚本，或 Claude 自定义连接器，或 Codex 插件商店。
- 视觉规范：design.md（品牌指南）→ hyperframes.dev/design 转 frame.md（视频向）。
- 复用：开源 50+ 组件与完整代码库；静态分镜帧先审美学，再生成动态。

## 相关笔记

- [[Peter Yang-Hermes 打造 24 小时数字员工]]：本篇明确 Hyperframes 与 Hermes 深度整合，把智能体长篇汇报转成 30 秒视频——同一作者的工具链闭环（Hermes 主动代理 → Hyperframes 可视化汇报）。
- [[2026 年 Agent 最重要的工程概念 Harness Engineering]]："HTML 是 LLM 母语"，Studio 的 UI 修改→代码 diff→智能体协同"最后一公里"，正是 harness 把人类控制与代码层结合的范式。
- [[Manus创始人-深度干货-上下文工程的最佳实践]]：design.md/frame.md 把品牌视觉规范作为视频生成的上下文输入，与 context 工程同源。
- [[季白羽-Codex 与 Remotion 纸片分层动画流水线]]：都用代码（React/HTML）生成 AI 视频；Hyperframes 偏 website-to-video 技能，那篇偏多工具编排的纸片分层动画。

## 来源声明

- 专栏原文：`source_url`（B 站 opus 1220311027565985864），`bv: BV1vtTi6LEhx`，`column_id: cv51066299`，发布于 2026-07-02。
- `material_tier: A`，`source_form: dialogue`，`content_form: dialogue`，`dialogue_fidelity: source`，`question_source: column`，`voice_basis: direct_speech`，`factual_status: partial`，`verification_scope: column_only`。未读取图片、未使用 ASR/Recastory/transcript。
