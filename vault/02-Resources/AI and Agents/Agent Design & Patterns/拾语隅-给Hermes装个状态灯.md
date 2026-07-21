---
title: "拾语隅-给Hermes装个状态灯"
tags: ["ai_agent", "article"]
legacy_tags: ["ai_agent", "hermes", "agent_usage", "practical_experience", "article"]
created: "2026-07-15"
source: "https://mp.weixin.qq.com/s/fHmKgu504dM1WWwP3iJdOg"
description: "用 Hermes Agent 当个人助手时，如何通过 macOS 菜单栏状态灯实时显示 Agent 工作状态（工作中/待机/掉线），以及迭代过程中的方案选择。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/拾语隅-给Hermes装个状态灯.md"
source_sha256: "a225afd29f86d90d9f0e731e8b63eeb7476128c88c4aa2f1ff5d93e6196239da"
migration_id: "migration-20260720-64e79771"
author: "[[拾语隅]]"
---

# 拾语隅-给Hermes装个状态灯

> 来自「拾语隅」公众号（2026-07-10）的一篇实战分享。作者用 Hermes Agent 当个人助手（连微信消息渠道），解决了"不知道 Agent 在不在干活"的痛点——通过 macOS 菜单栏状态灯实时显示工作状态。
>
> 全文一句话主线：**技术已经不是门槛了，门槛是你的想法。你不需要知道它怎么实现的，只需要知道自己想要什么，然后把问题描述清楚。**

## 问题：不知道 Agent 在不在干活

用 Hermes Agent 当个人助手时，发完复杂指令后看着对话框等回复——5 秒、10 秒、20 秒……不知道它是还在后台跑，还是已经干完了单纯没理我，还是网关掉了。

微信 claw bot 能显示"对方正在输入…"，但切换窗口干别的事之后就看不到了。

## 迭代过程：三种方案的尝试

### 方案一：CPU 监测（失败）

最初用 CPU 使用率判断——AI 干活时 CPU 会升高。

**问题**：
- CPU 阈值不好定，高了反映慢，低了容易误触
- 每秒查一次 CPU 本身也在消耗资源，等于空跑

### 方案二：HTTP 连接检测（失败）

检测 HTTPS 网络连接——干活时会发请求到 DeepSeek、智谱等云端 API。

**问题**：
- 阿里云百炼 MCP 等服务有固定长连接，一直在后台连着
- 长连接会导致误判成"工作中"

### 方案三：标记文件 + 日志监控（成功）

最终方案：让 Agent 干活时持续往日志里写内容，脚本每秒看一眼日志文件的上次修改时间：

- 最近几秒有改动 → 工作中
- 没有改动 → 待机
- 网关不在 → 掉线

**优势**：
- 不需要猜阈值
- 不会空转消耗 CPU
- 不会被后台长连接干扰

## 最终效果

状态栏上直接看到三个状态：
- 🟢 工作中
- ⚪ 待机
- ⛔ 掉线

不用切回微信窗口去看、不用猜它在不在干活，瞄一眼菜单栏就知道了。

## 核心洞察

> 技术已经不是门槛了，门槛是你的想法。

作者不懂 shell 脚本，也不知道那些工具怎么配。但清楚自己想要什么效果：干活的时候亮个灯，闲着的时候灭掉。剩下的全是 Agent 干的——找方案、试错、调整、教我配。

**全程只做两件事**：提需求、给反馈。

## AI 使用思路

- Agent 是很好的执行工具，是一个资源整合了的万能工具
- 但具体怎么用还是要靠用户自己
- **想象力是 Agent 没有的**，所以用户需要给 Agent 配上意识
- 你跟 AI 的关系不是"用工具"，是**合作干活**——你出想法，它出技术
- 方法不一定是唯一的，但思路是通用的

## 知识连接

- **示例** [[Hermes Agent-新OpenClaw体验]] — 同为 Hermes Agent 实战；那篇偏 OpenRouter 降本与 Obsidian 集成，本篇偏状态监控与用户协作思路
- **补充** [[Claude Code实战-结合Obsidian打造第二大脑]] — 都是 Agent 个人助手实战；那篇偏知识库集成，本篇偏状态可视化
- 被 [[MOC - AI Coding 与工具]] § 工程踩坑 索引

## 来源说明

- 来源：拾语隅（微信公众号），2026-07-10
- 事实状态：verified。verification_scope 为 column_only——已通过 kimi-webbridge（带登录态）读取文章全文（2026-07-15），非二手转述
- 本笔记为忠实整理，保留完整的方案迭代过程和核心观点；图片未读取
