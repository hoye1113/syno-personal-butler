---
title: "Vercel 团队-Nico Albanese 给智能体一台电脑"
tags: ["ai_agent", "memory", "column", "lecture"]
legacy_tags: ["ai_agent", "agent_runtime", "ai_sdk", "sandbox", "memory", "tool_loop", "column", "lecture"]
created: "2026-07-13"
source: "B站图文专栏 - Easonlee的AI笔记"
description: "Vercel AI SDK 团队 Nico Albanese 讲解 2026 年构建 Agent 的核心范式：用工具循环代理（tool-loop agent）把 Agent 行为与 UI 流式逻辑解耦；代理运行时三支柱为指令、工具与持久化沙盒；用子代理模式与 Token 压缩应对上下文膨胀；用文件系统 memories.md 取代向量数据库做记忆；Agent 终极形态是自我编写并复用工具。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Vercel 团队-Nico Albanese 给智能体一台电脑.md"
source_sha256: "8fc2d04a1f8fe3ebf022d48c58efc4f950dd2ef28d92b8b6a990ff9d9d10ec76"
migration_id: "migration-20260720-64e79771"
ingest_workflow: bilibili_opus_ingest_v2
aliases: [Nico Albanese AI SDK, Vercel 代理运行时, 持久化沙盒, 文件系统记忆, Agent 三支柱]
source_original_date: 2026-07-06
author: "Nico Albanese（Vercel AI SDK 团队）"
uploader: "Easonlee的AI笔记"
source_type: bilibili_opus
source_url: "https://www.bilibili.com/opus/1221903592888205347"
opus_id: "1221903592888205347"
column_id: "cv51192563"
video_url: "https://www.bilibili.com/video/BV189Ty68EFp/"
bv: "BV189Ty68EFp"
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

# Vercel 团队-Nico Albanese 给智能体一台电脑

> 来源：B 站专栏（Easonlee 的 AI 笔记转述 Nico Albanese 的英文技术工作坊）。`source_form: lecture`（单人技术演示，无对谈嘉宾），`voice_basis: attributed_paraphrase`，`dialogue_fidelity: none`，`question_source: none`，`verification_scope: column_only`，未回核原视频，故 `factual_reviewed: partial`。

## 摘要

Nico Albanese 提出 2026 年构建 Agent 的核心是给智能体"一台电脑"——一个持久化、可执行代码的沙盒。要点：
1. **工具循环代理（tool-loop agent）**：把 Agent 行为定义与 UI 流式传输逻辑解耦，代码更轻量可复用（AI SDK 6 的 `createAgentRuntime().streamResponse()`）。
2. **代理运行时三支柱**：指令（instructions）、工具（tools）、沙盒（sandbox filesystem）。很多人轻视系统提示，但它与另两个组件结合才能真正塑造行为。
3. **持久化沙盒**：传统沙盒任务结束即销毁；Vercel 持久化沙盒通过命名实例 + 自动快照保留文件系统状态，让 Agent 拥有真正的"工作区"，解决瞬时性痛点。
4. **应对上下文膨胀**：超长任务直接发全量历史会导致成本激增、缓存失效；用**子代理（sub-agents）**分发独立任务，仅把压缩总结返回主线程，可在高缓存命中下处理百万级 Token。
5. **文件系统记忆优于向量库**：与其搭复杂 RAG，不如给 Agent 一个 `memories.md` 文件，用 BASH 自主读写事实与生成的脚本，确定性反馈循环比模糊向量检索更可靠。
6. **Agent 自我进化**：终极形态是根据需求写 Python 脚本存入环境，类似需求再次出现时优先调用自建工具而非重新生成——REPL 循环中的自我迭代是 Agent 真正可用的关键。

## 实践要点

- 工具分三类：**自定义工具**（自定描述/模式/执行函数）、**提供者定义工具**（如 Anthropic 的 bash、computer use，提供者已对模型后训练优化）、**提供者执行工具**（直接在 LLM 侧运行）。
- "全局提供者"概念：把 AI 网关作为默认 provider，用纯字符串即可访问网关内任意模型，降低入门成本。
- 沙盒集成与工具定义、代理指令与记忆管理是落地闭环的三块。

## 相关笔记

- [[2026 年 Agent 最重要的工程概念 Harness Engineering]]：代理运行时"指令+工具+沙盒"正是 harness 三件套；持久化沙盒=给 Agent 一个可读写的工作区，与 harness 不变量一致。
- [[OpenAI员工-上下文工程和Agent记忆]]：子代理压缩 + `memories.md` 文件记忆，是上下文工程在 Agent 运行时的具体落地；文件系统记忆 vs RAG 直接对照。
- [[Manus创始人-深度干货-上下文工程的最佳实践]]：子代理分发 + 压缩总结回主线程，与 Manus 的 context offload/compact 同构。
- [[AI Agent 记忆系统 从会话缓存到持久记忆]]：Nico 主张用确定性文件记忆取代向量库，是该记忆架构谱系中"持久记忆"一端的工程佐证。

## 来源声明

- 专栏原文：`source_url`（B 站 opus 1221903592888205347），`bv: BV189Ty68EFp`，`column_id: cv51192563`，发布于 2026-07-06。
- `material_tier: A`，`source_form: lecture`，`content_form: lecture`，`dialogue_fidelity: none`，`question_source: none`，`voice_basis: attributed_paraphrase`，`factual_status: partial`，`verification_scope: column_only`。未读取图片、未使用 ASR/Recastory/transcript。
