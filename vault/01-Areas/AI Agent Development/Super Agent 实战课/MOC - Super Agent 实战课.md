---
title: "MOC - Super Agent 实战课"
tags: ["ai_agent", "moc"]
legacy_tags: ["ai_agent", "moc"]
created: "2026-07-13"
source: "vault_initiative - moc - sitor-ai - super-agent"
description: "三元（Sitor AI）Super Agent 实战课总索引 — 23 篇渐进式实战，最终产物对标 OpenClaw 的生产级 Agent"
knowledge_state: captured
link_status: connected
source_path: "01-Areas/AI Agent Development/Super Agent 实战课/MOC - Super Agent 实战课.md"
source_sha256: "c7249c1a5f0bd6a8d6cf89319d95126a31db06e8a45b6213d0ae88386fdee576"
migration_id: "migration-20260720-64e79771"
---

# Super Agent 实战课

本 MOC 汇总 [三元（Sitor AI）](https://sitor.cc/courses/super-agent)「Super Agent 实战课」全部 23 篇实战内容。课程用 TypeScript + Vercel AI SDK 从零搭建一个能接飞书、有记忆、有 RAG、有工具系统、能装插件、能派子 Agent 的生产级 Super Agent，核心能力对齐 OpenClaw。

> 与 [[MOC - AI Agent Development|吃透 AI Agent 开发（知识体系课）]] 的关系：本课是知识体系课的**实战落地版**，主题一一对应（Agent Loop / Tool / Context / Memory / Skills / 权限 / Multi-Agent），两课互为前置与印证。

> 免责声明：本笔记仅供个人学习使用，版权归原作者 [[Sitor AI]] 所有。

## 技术栈

TypeScript + Node.js (ESM) · Vercel AI SDK · Hono (HTTP + WebSocket) · JSONL (Session 持久化)

## 课程章节

### 01-起步与 Agent Loop（3 篇）

- [[1-1 10 分钟，让你的 AI 开口说话]]
- [[1-2 从“能聊天”到“能干活”——给 Agent 装上 while 循环]]
- [[1-3 Agent 不能这么脆——循环检测、API 容错与 Token 预算]]

### 02-Tool System（6 篇）

- [[2-1 给 Agent 一双手——Tool 注册、执行、截断与并发]]
- [[2-2 补齐装备——edit_file、grep、glob 与 bash]]
- [[2-3 小试牛刀——把工具组装成应用-代码分析、Research Agent、Vibe Coding]]
- [[2-4 加餐-Agent 的 Search 工具究竟是如何来实现的？]]
- [[2-5 MCP 接入实战——给 Agent 接上 GitHub]]
- [[2-6 工具太多模型选不准——实现 ToolSearch]]

### 03-Context Engineering（4 篇）

- [[3-1 Session 持久化 + Prompt Pipe——对话存档与模块化 Prompt 组装]]
- [[3-2 对话太长了怎么办——Microcompact + LLM 摘要压缩]]
- [[3-3 三层即时防线——Token 估算、工具截断与 TTL 修剪]]
- [[3-4 让对话越来越便宜——Prompt Cache 与成本追踪]]

### 04-Memory and RAG（3 篇）

- [[4-1 关掉终端再打开，Agent 还记得你是谁——持久化记忆系统]]
- [[4-2 RAG 实战——sqlite-vec + BM25 混合检索]]
- [[4-3 记忆会变坏——给 Agent 的记忆库做体检]]

### 05-Skills Plugins Channel（3 篇）

- [[5-1 Skills——给 Agent 注入领域知识]]
- [[5-2 Plugin 架构——让别人给你的 Agent 写功能]]
- [[5-3 Channel 抽象——让 Agent 活在飞书群里]]

### 06-权限 + Cron + Multi-Agent（3 篇）

- [[6-1 权限系统 + Hook 管线——让 Agent 安全地被别人使用]]
- [[6-2 让 Agent 自己动起来——Cron 定时任务系统]]
- [[6-3 一个不够就拆成多个——实现 Sub-Agent 机制]]

### 07-部署（1 篇）

- [[7-1 收官——配置系统、CLI 入口与部署上线]]

## 快速导航

| 章节 | 篇数 | 状态 |
|------|------|------|
| 01-起步与 Agent Loop | 3 | ✅ 已完成 |
| 02-Tool System | 6 | ✅ 已完成 |
| 03-Context Engineering | 4 | ✅ 已完成 |
| 04-Memory and RAG | 3 | ✅ 已完成 |
| 05-Skills Plugins Channel | 3 | ✅ 已完成 |
| 06-权限 + Cron + Multi-Agent | 3 | ✅ 已完成 |
| 07-部署 | 1 | ✅ 已完成 |

**已收录**：23 / 23 篇（全课程完成）

## 关联笔记

- [[MOC - AI Agent Development|吃透 AI Agent 开发（知识体系课）]] — 同作者，本课是其实战落地版
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程]] — 另一门 Agent 实战课程，可对照
