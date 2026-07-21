---
title: "Codex 实战：Notion 第二大脑与技能封装"
tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "skills", "context_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "skills", "context_engineering"]
created: "2026-07-07"
source: "B站视频 - Easonlee的AI笔记"
description: "Riley Brown 八步：Notion 插件、Codex 内嵌浏览器、Key docs 代理指令、自定义 Notion 技能、斜杠标签研究、App Shots 传上下文、代理笔记本与每晚自动化、高质量示例库。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-Notion第二大脑与技能封装.md"
source_sha256: "e4ab8545f499e06c6c7135165324a6e27360d1eb676b61105b3e40d8e24b5f1b"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1r4Ju65EJT/"
column_url: "https://www.bilibili.com/read/cv50565806/"
host_name: "Riley Brown"
guest_name: "Riley Brown"
guest_title: "AI 创作者 · chorus.com"
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1r4Ju65EJT/ingest"
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1r4Ju65EJT/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1r4Ju65EJT/ingest/column_article.md"
curate_method: "vskill-vault-curate v3-ingest（讲义 v3）"
genre: A-lecture
speaker_inference: "solo tutorial monologue"
speaker_confidence: high
duration: "25:51"
saved: 2026-07-07
updated: 2026-07-07
concepts:
  - id: notion_plugin_skills
    zh: Notion 插件技能包
    en: Notion plugin as skill bundle
    one_line: "@Notion 即一整套 API 操作技能"
  - id: codex_embedded_browser
    zh: Codex 内嵌浏览器
    en: Codex embedded browser
    one_line: 不离开 Codex 实时改 Notion 库表结构
  - id: agent_instructions_top
    zh: 顶层代理指令
    en: agent instructions on Key docs
    one_line: 页面顶部标签区定义品牌格式，换代理也一致
  - id: notion_custom_skill
    zh: Notion 自定义技能
    en: custom Notion skill
    one_line: 对话打磨工作流后「把它变成技能」
  - id: slash_tabs_research
    zh: 斜杠标签研究
    en: slash tabs for research injection
    one_line: 顶部 tabs 塞研究，不破坏正文排版
author:
  - "[[Riley Brown]]"
---

# Codex 实战：Notion 第二大脑与技能封装

**主讲：** Riley Brown（AI 创作者）  
**形态：** 九段讲义 v3（**专栏主源** · A-lecture 单人教程）  
**B 站：** [BV1r4Ju65EJT](https://www.bilibili.com/video/BV1r4Ju65EJT/) · **时长** ~26 min · **专栏** [cv50565806](https://www.bilibili.com/read/cv50565806/)

---

## 先搞懂这一期

**这是什么？**  
Riley 演示如何把 **Notion** 接进 **Codex**（Claude Code 同理），30 分钟搭一套团队/个人可用的 **AI 第二大脑**——不是偶尔 @ 一下 Notion，而是插件、浏览器、指令、技能、自动化一条龙。

**三个核心问题**

1. **怎么让代理「会操作」Notion，而不只是读字？** → Notion 插件 + 内嵌浏览器。  
2. **多代理、多同事共用时怎么不乱？** → Key docs 顶层 **代理指令** + **技能文件**。  
3. **研究、日记、高质量产出怎么沉淀？** → 斜杠标签、独立代理笔记本、每晚自动化、示例库。

**一条线串起来：** 装插件 → Codex 里开 Notion → 页面顶部写死格式规则 → 成功路径变 `/技能` → 研究用 tabs 非侵入插入 → App Shots 秒传页面上下文 → AI 专用笔记本 + 22:00 摘要邮件 → 高质量示例当风格锚点。

---

## 背景：在知识工作栈里的位置

| 你已有的认识 | 这期补上的一块 |
|--------------|----------------|
| Notion = 人写笔记 | Notion = **代理可写、可改 schema 的操作面** |
| Codex = 写代码 | Codex = **带登录态浏览器的知识工作超级应用** |
| Skills = 仓库里 SKILL.md | Skills = **对话里「把它变成技能」**，专管 Notion 格式化 |
| 第二大脑 = 向量库 | 第二大脑 = **结构化 DB + 指令 + 自动化摘要** |

---

## 分话题讲

### 1. 零步与一步：安装与 Notion 插件（~00:00–05:20）

**准备：** [notion.com/desktop](https://www.notion.com/desktop) + [chatgpt.com/codex](https://chatgpt.com/codex)（付费 ChatGPT 可用 Codex）。

**插件：** Codex 左上角 Plugins → 装 **Notion** → 对话里 `@Notion` 出现。演示：在 Key docs 下建「Codex 新数据库」，10 条关于 Codex/Claude Code 新闻的条目（甚至写诗），带新闻日期与来源链接。

**要点：** 插件 = **预置 API 技能集合**，装完即用，不必手写 MCP 配置。

---

### 2. Codex 内嵌浏览器：边看边改（~05:20–07:45）

右键任务 → **在浏览器中打开** → Notion 在 Codex 右侧跑，保持登录态（也可开 Google Docs、Twitter）。

现场指令：删最差 5 条、删「新闻日期」列、加多选「类别」列——**实时看 AI 改表**。

**要点：** 浏览器集成比 Claude Code 侧更强，是 Riley **几乎全在 Codex 里干活** 的原因。

---

### 3. Key docs 顶层代理指令（~07:45–09:30）

「Key docs」页顶：**「如果你是 AI 代理，请阅读以下标签」**——自我介绍、视频库、快速笔记、Chorus 文档、广告脚本格式（粉色脚本/绿色 CTA）。

**要点：** 指令放在 **最重要页面顶部**，所有 DB 同页，换未来新代理也能读同一套标准。

---

### 4. 自定义 Notion 技能（~09:30–12:10）

流程：先让 Codex **反复做对**「往 Codex 快速笔记库加一条」→ 纠正格式 → 「**变成 Notion Quick Note 技能**」→ 以后 `/Notion Quick Note` 或自然语言即可。

演示：「总结今天 Codex 任务」→ 2 分 14 秒后正确落入「Codex 快速笔记」库。

**要点：** **AI 写技能强于人**；先完美单次，再固化技能。

---

### 5. 斜杠标签（/tabs）做非侵入研究（~12:10–15:00）

Notion 区块 **`/tabs`**：让代理把研究、原始来源、遗漏点放在 **文档顶部 tab**，不滚长页。

满意后：「变成 **Notion 研究** 技能，默认用这种格式。」

**要点：** 研究注入与正文 **物理隔离**；可 Command+B 收起侧栏全屏 Notion 仍连着 Codex。

---

### 6. App Shots：任意 App 秒传上下文（~15:00–18:40）

Notion 桌面端 **双 Command** → 自动截屏 + 粘贴当前页面链接进 Codex。可对视频想法库说「加三个长篇想法」；可叠 `/Notion 研究` 在指定卡片上跑研究。

**要点：** App Shots 适用于 **任何 Mac 应用**——Finder 文件夹也能当上下文。

---

### 7. 代理笔记本 + 每晚自动化（~18:40–22:00）

**人类笔记 vs AI 笔记分开**：Notion Quick Note 技能写入 **Codex 代理专用笔记本**。

自动化示例：「每晚 22:00 写每日摘要 → 快速笔记本一篇日记 + 发邮件给自己；顶部列 **待办推断**。」创建 **Daily Codex Summary** 定时任务。

**要点：** 多线程聊天（一天 7–8 个）需要 **日终合并记忆**。

---

### 8. 高质量示例库（~22:00–结尾）

「高质量示例」页：爆款 YouTube、Twitter、Instagram 短视频、脚本——代理写 Chorus 短脚本时 **@高质量示例** 对齐风格。iMessage 里的「詹姆斯·邦德」代理 + App Shots 可拉 Chorus 文档与示例。

**要点：** 无论内容、营销还是工程，**示例库 = 风格 SSOT**。

---

## 关键概念表

| 中文 | 英文 | 白话 |
|------|------|------|
| Notion 插件 | Notion plugin | @Notion 触发的一整套写库技能 |
| 内嵌浏览器 | embedded browser | Codex 内登录态操作 SaaS |
| 代理指令区 | agent instructions block | 页面顶「代理请读」标签 |
| 自定义技能 | custom Notion skill | 对话成功路径固化成 `/命令` |
| 斜杠标签 | slash tabs (/tabs) | 顶部 tab 塞研究不弄脏正文 |
| App Shots | App Shots | 双 Command 截屏+链接触发上下文 |
| 代理笔记本 | agent-only notebook | 人与 AI 写入空间分离 |
| 高质量示例 | high-quality examples | 风格与格式的锚点库 |

---

## 原话

- **Riley：** 大多数人的 Notion 接法完全错了——没可靠设置会在多代理下乱套。
- **Riley：** 插件基本上就是一系列技能，让代理知道怎么用 Notion。
- **Riley：** 先让它完美做成一次，再说「把它变成一个技能」——你在把完美成果模块化。
- **Riley：** 斜杠标签在顶部开一小块，不用滚几千字才能看到研究。

---

## 行动启示

- **30 分钟 onboarding：** 插件 + Key docs 指令 + 一个 Quick Note 技能，比堆长 prompt 稳。
- **研究别改正文：** 用 `/tabs` 或独立 DB，避免代理把页面结构搅乱。
- **技能生产路径：** 对话迭代 → 「变成技能」→ `/调用`；别手写技能初稿。
- **日终自动化：** 多会话时代用定时摘要 + 邮件，把聊天变资产。
- **Obsidian 用户：** 概念可迁移——顶层 README/AGENTS、技能文件、示例库三分法同样适用。

---

## 相关阅读

- [[Every增长主管-Codex成为知识工作的OS]] — Codex 当知识工作 OS、Notion KPI
- [[Codex实战-构建个人操作系统]] — 个人 OS 文件夹与 skills 目录
- [[WorkOS-创建和使用Skills方法论]] — 技能封装方法论
- [[OpenAI官方-Codex新手教程]] — Codex 安装、AGENTS.md、MCP 入门

---

## 来源

- B 站：[BV1r4Ju65EJT](https://www.bilibili.com/video/BV1r4Ju65EJT/)
- 专栏：[cv50565806](https://www.bilibili.com/read/cv50565806/)
- 主源：`Recastory/workspace/bilibili-retranscribe/BV1r4Ju65EJT/ingest/column_article.md`
