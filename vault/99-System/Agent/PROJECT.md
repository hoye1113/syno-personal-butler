---
title: "Vault 项目身份与内容协议"
tags: [notes, skills, ai_agent]
created: 2026-07-13
source: vault_initiative - agent_control_plane
description: "定义 vault 的主题边界、PARA、frontmatter、tag、命名、链接和 MOC 规则。"
---

# Vault 项目身份与内容协议

## 项目身份

这是面向 AI Agent 时代的长期知识库：AI Agent 理论、工具、Harness、Loop、上下文、记忆、多 Agent、AI Coding、FDE 与职业变化占 80% 以上。编程实践和相关哲学各不超过 10%。纯新闻、临时任务、教程截图和孤立代码片段不收录。

Markdown 是唯一事实源。Agent 读写文件；Obsidian 负责呈现；Git 负责审查、恢复和同步。

## PARA

- `00-Inbox/`：暂时无法判断或待处理，最多 10 个文件。
- `01-Areas/`：长期维护的 AI Agent 核心知识。
- `02-Resources/`：文章、课程、视频、播客、Prompt 等参考资料，按主题而非来源分类。
- `03-Archive/`：不再关注、超过一年无更新或长期孤立的内容。
- `99-System/`：Agent 协议、Skills、模板、脚本、附件和审计。

## Frontmatter

新笔记必填：`title`、`tags`、`created`、`source`、`description`。推荐 `author`。B站图文专栏 v2 另填 `ingest_workflow`、来源标识、`source_tier`、`material_tier`、`source_form`、`content_form`、`dialogue_fidelity`、`question_source`、`voice_basis`、`factual_status`、`factual_reviewed`、`verification_scope` 与实际读取的 `verification_basis`。不要求 `ingest_dir`、`transcript_source` 或 `spot_check`。

## Tag 字典

- 主题：`ai_agent`、`ai_coding`、`ai_evaluation`、`ai_safety`、`ai_career`、`ai_philosophy`
- 形态：`article`、`video_transcript`、`podcast`、`course`、`moc`、`notes`
- 来源：`zhihu`、`wechat`、`bilibili`、`youtube`、`podcast_rss`
- 工具：`claude_code`、`codex`、`cursor`、`devin`、`chatgpt`、`claude`、`openai`、`anthropic`
- 细分：`harness_engineering`、`loop_engineering`、`memory`、`multi_agent`、`context_engineering`、`skills`、`hooks`、`mcp`、`prompting`、`fde`
- 已批准扩展：`web_clipping`、`content_creation`、`text_refinement`、`author`
- 原库迁移保留的高价值标签：`loock_ai`、`coding_agent`、`chatbot`、`column`、`interview`、`nextjs`、`frontend_agent_interview`、`dialogue`、`langgraphjs_tutorial`、`langgraphjs_quickstart`、`ai_native`、`lecture`、`agent_architecture`、`s_tier`、`taste`

历史低频或非规范标签迁移到 `legacy_tags`，只参与全文检索，不进入主筛选器；中文、连字符和同义标签按固定映射归并，不由 Agent 在运行时扩充字典。

Tag 只用小写英文和下划线。新 tag 先提议并取得用户确认，不直接创造。禁止中文 tag、连字符风格和旧名。

## 命名与链接

- 文件名使用空格或 `-`，不超过 50 字；不用全角冒号和 Windows 特殊字符。
- 每篇笔记必须有至少一个语义相关 wikilink；S级来源笔记还必须说明支持、补充、反驳、限制、依赖、应用或示例关系。无候选时用 `status: orphan` 说明原因。
- 来源笔记保留完整语境；跨来源概念只进入候选。概念被两个独立来源支撑后可提议创建，但仍需用户确认。
- 同主题达到 3 篇时评估 MOC；新建 MOC 需确认。
- MOC 包含主题简介、带说明的核心笔记、关联笔记或横切 MOC。

## 相关阅读

- [[MOC - Agent Theory and Design]]
