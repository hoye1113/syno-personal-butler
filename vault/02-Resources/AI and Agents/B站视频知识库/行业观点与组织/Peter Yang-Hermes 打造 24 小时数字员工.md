---
title: "Peter Yang-Hermes 打造 24 小时数字员工"
tags: ["ai_agent", "column", "lecture"]
legacy_tags: ["ai_agent", "personal_agent", "hermes", "chief_of_staff", "telegram", "google_workspace", "automation", "column", "lecture"]
created: "2026-07-13"
source: "B站图文专栏 - Easonlee的AI笔记"
description: "YouTuber Peter Yang 拆解将 Hermes Agent 部署为个人 24 小时幕僚长的完整流程：在常开 Mac Mini 上独立用户+受限邮箱隔离、Telegram 作为移动交互界面、user.md/soul.md 塑造个性与边界、Edge TTS 语音、Google Workspace OAuth 集成、以及\"建技能→测试→设定时任务\"的主动例行程序（早间简报/业务回顾/健康回顾）。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Peter Yang-Hermes 打造 24 小时数字员工.md"
source_sha256: "8bd4523758a12990d2cb199ba3ecda2f04b173ae8c07ad507cf56560335788a9"
migration_id: "migration-20260720-64e79771"
ingest_workflow: bilibili_opus_ingest_v2
aliases: [Hermes 幕僚长, 24小时数字员工, Hermes Mac Mini 部署, soul.md user.md, Hermes 定时任务]
source_original_date: 2026-07-02
author: "Peter Yang（YouTuber）"
uploader: "Easonlee的AI笔记"
source_type: bilibili_opus
source_url: "https://www.bilibili.com/opus/1220419260720873510"
opus_id: "1220419260720873510"
column_id: "cv51066580"
video_url: "https://www.bilibili.com/video/BV1TyTi6eEni/"
bv: "BV1TyTi6eEni"
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

# Peter Yang-Hermes 打造 24 小时数字员工

> 来源：B 站专栏（Easonlee 的 AI 笔记转述 Peter Yang 的英文部署教程）。`source_form: lecture`（单人部署教程，无对谈嘉宾），`voice_basis: attributed_paraphrase`，`dialogue_fidelity: none`，`question_source: none`，`verification_scope: column_only`，未回核原视频，故 `factual_reviewed: partial`。

## 摘要

Peter Yang 把 Hermes Agent 配置为全天候"AI 幕僚长"，核心经验：

1. **专属硬件部署**：首选 24 小时在线的 Mac Mini（或 5-10 美元/月的 VPS）。创建独立 Mac 用户名 + 独立受限 Gmail，仅授予邮件/日历只读、特定 Drive 文件夹读写，隔离敏感数据并避免智能体擅自代发邮件。
2. **移动交互界面**：用 Telegram 作为随时随地的沟通入口；`/sethome` 设默认频道，定时消息精准送达。Hermes 后台由网关接收消息、模型（如 GPT-5.5）调用工具、更新记忆与技能。
3. **个性化灵魂文件**：本地编辑 `user.md`（偏好/目标/工作流）与 `soul.md`（性格信条与行为边界）。让智能体访谈你后自动写入，使其主动提出有主见的行动建议。
4. **语音集成**：Telegram 开启语音技能 + Edge TTS（300+ 语音），并可命令"关闭流式传输""别显示系统消息"让交互更像人。
5. **工作区集成**：Google Cloud 控制台建项目、启用 Gmail/Calendar/Drive/Docs/Sheets API、配 OAuth 桌面应用与测试用户，上传 JSON 凭据完成授权，赋予读写邮件/排会/编辑文档的权限——这是分担工作的关键。
6. **主动例行程序**：遵循"建技能→手动测试改进→设定时任务（Cron）"三步。已设周末计划、早间简报（汇总待办/会议/邮件）、业务回顾（Mercury 收支、YouTube 分析、Substack、Granola 会议）、健康回顾（体重秤/Apple Health）。从被动响应转为**主动代理**。

## 实践要点

- 模型选择：默认 GPT（ChatGPT $20/月够用），Claude 拟人但 API 费用涨得快；把 effort 设 high + 快速模式。
- 故障排查：`hermes doctor fix` 自动修复、`hermes gateway restart` 重启网关；严重可把配置文件夹丢给 Codex/Claude 参考文档修。
- 安全：智能体配置文件夹自动备份到私有 GitHub 仓库；集成 WhatsApp 需第二个手机号。

## 相关笔记

- [[2026 年 Agent 最重要的工程概念 Harness Engineering]]：Mac Mini 常开设备 + skills + 工具 + Cron，正是 harness 的"持续运行环境"；user.md/soul.md 是 harness 的 Agent 配置层。
- [[OpenAI播客-用Codex处理日常工作]]：两者都讲"AI 作个人幕僚长"；Peter 明确对比 Hermes 比 Codex/Claude 更适合持久化日常代理，互为参照。
- [[Manus创始人-深度干货-上下文工程的最佳实践]]：user.md/soul.md 把个性化上下文持久化，与 Manus 的 context 工程（个性化、offload）同构。
- [[OpenAI员工-上下文工程和Agent记忆]]：Hermes "持久性记忆 + 自动创建技能"是上下文/记忆工程在个人助理上的产品化。

## 来源声明

- 专栏原文：`source_url`（B 站 opus 1220419260720873510），`bv: BV1TyTi6eEni`，`column_id: cv51066580`，发布于 2026-07-02。
- `material_tier: A`，`source_form: lecture`，`content_form: lecture`，`dialogue_fidelity: none`，`question_source: none`，`voice_basis: attributed_paraphrase`，`factual_status: partial`，`verification_scope: column_only`。未读取图片、未使用 ASR/Recastory/transcript（专栏内 "Ermis" 为原文拼写不一致，统一作 Hermes）。
