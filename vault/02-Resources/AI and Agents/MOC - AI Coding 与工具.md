---
title: "MOC - AI Coding 与工具"
tags: ["ai_agent", "ai_coding", "moc"]
legacy_tags: ["ai_agent", "ai_coding", "moc"]
created: "2026-07-15"
source: "vault_initiative - moc - split from Agent Theory and Design"
description: "AI 编码工具实战横切 MOC——Claude Code / Codex / OpenClaw / Cursor / Vibe Code，从原 Agent Theory MOC B·C·E·L编程段迁入。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/MOC - AI Coding 与工具.md"
source_sha256: "4da8406d47ff985594d3ef641f7efbd2f2ff2af794e5cf34bc359de1b447bd6b"
migration_id: "migration-20260720-64e79771"
updated: 2026-07-15
---
# MOC - AI Coding 与工具

> AI 编码工具（Claude Code / Codex / OpenClaw / Cursor）的团队实践与用户实战。从原 [[MOC - Agent Theory and Design]] 拆分而来，避免巨型 MOC。

## Claude Code 实战

> Anthropic Claude Code 团队的内部实践 + 用户实战案例。

| 文章 | 核心主题 |
|------|---------|
| [[Claude Code负责人-AI原生团队如何使用AI]] | Boris 20% side project→千人流传；Todo/Plan 从痛点长出；Eval 分 E2E 与 triggering |
| [[Claude Code负责人-创造内幕]] | Pragmatic Engineer × Boris：100% AI 写码、瑞士奶酪安全、agentic search、印刷机类比（**A-dialogue v3.2-asr** ✓） |
| [[Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿]] | 指数增长、Tokenmaxxing、Auto 模式路由、rate limit 与 switching cost 变薄 |
| [[Claude Code之父-亲自讲解Cowork]] | Greg × Boris：Cowork=同一 agent UI；文件夹 opt-in、反向征求、CLAUDE.md（**A-dialogue v3.2-asr** ✓） |
| [[Claude Cowork-另一种Claude Code]] | Every vibe check：异步任务队列、agent-native 原则、执行黄理念绿（**A-dialogue v3.2-asr** ✓） |
| [[Claude Code之父-编程已被解决接下来发展]] | Lauren × Boris：编码 100% 代理化、闪电循环/例程、7 Powers、印刷术类比、组织流程 moat |
| [[Anthropic CPO-Claude团队为什么迭代这么快]] | Lenny × Kat：AI 原生 PM、多发少赌、产品品味、工程师当第一用户、一致性幻觉 |
| [[Anthropic团队-我们如何打造下一代Claude]] | Peter × Alex Albert：模型到产品、Eval、有用 Agent、记忆、Cowork vs 双订阅 |
| [[Anthropic-3亿收购开发工具初创创始人访谈]] | Dan × Alex Rattray（Stainless）：MCP 瓶颈、工具爆炸、模型路由、执行环境、API OAuth |
| [[Cowork负责人-揭秘Cowork与Mythos]] | Felix：Mythos 阶跃、Cowork 十天+VM、技能/记忆 Markdown、本地信任、执行免费与品味 |
| [[Claude设计主管-Cowork揭秘40分钟教程]] | Jenny Wen：松散设计流程、可工作原型、内部 dogfooding、Cowork 洞察自动化、3–6 月愿景原型 |
| [[Claude Code实战-结合Obsidian打造第二大脑]] | Obsidian+Git+Tailscale；thinking 模式、Interviewer 子 agent；AI 读强于写 |
| [[Claude Code实战-构建一个AI数据分析师]] | Brex：监控-调查-故事-决策四循环 + Snowflake MCP + token 护栏 |
| [[Claude Code实战-Gstack把AI变成团队]] | Garry Tan：GStack 轻薄脚手架；Office Hours 六问、对抗性审查、设计散弹枪、Playwright QA、并行 PR |
| [[Claude Code实战-鲜为人知的Claude Code工作流]] | Greg × Amir：IdeaBrowser→Paper 细稿→Humbletics A/B→自建 CMS；自动化全栈 |
| [[Claude Code实战-用AI实现生活自动化]] | Peter × Moritz：OpenClaw vs Claude Code；Claudia 文件夹 OS；MCP/CLI；内容机器 |
| [[Boris Cherny-Claude Code任务管理与Compound工程]] | Boris × Trevin：Claude Code 任务账本、compound 分叉、planner/worker/tester（**A-dialogue v3.2-asr** ✓） |
| [[Mercury产品VP-Claude Code第二大脑与MCP]] | Ryan Wiggins：Mercury MCP、500 万字知识库、多代理分析、会议教练（**canonical v3.2** ✓） |

---

## Codex & OpenClaw 实战

> OpenAI Codex 团队 + OpenClaw（开源 AI Agent）生态的实战。

| 文章 | 核心主题 |
|------|---------|
| [[Codex 自我改进 Prompt]] | OpenAI agent improvement loop，从 traces 到 Skill/Automation 的固化 |
| [[OpenAI官方-Codex新手教程]] | AGENTS.md、config.toml 沙箱、MCP、Codex Exec + Agents SDK 编排 |
| [[Codex负责人-现场演示Codex]] | Codex 负责人 live demo（**canonical v3.2** ✓） |
| [[Codex产品负责人-Codex团队如何用Codex]] | Alex × Romain：Spark demo、十要点规范、八周规划、PM 补位与能动性招聘（**canonical v3.2** ✓） |
| [[Codex 负责人-所有人都是 builder 是个很糟糕的主意 - Founder Park]] | Lenny 对谈 Ambrosino：taste 最贵、PM 不消失、晚发 3 月会死、会删代码 |
| [[Codex实战-构建个人操作系统]] | Marina × Peter Yang：自我改进 skills、五层采纳、原则 Doc、Hermes 参谋长（**A-dialogue v3.2-asr** ✓） |
| [[Hermes Agent-新OpenClaw体验]] | Greg × Imran：SQLite 记忆、OpenRouter 砍 90% 成本、Termux、Obsidian（**canonical v3.2** ✓） |
| [[Codex实战-构建全能AI营销团队]] | Riley：7 Skills 营销全流程 + YouTube/Readwise 接地 + Gen Media |
| [[Codex实战-100分钟完整教程]] | Riley：项目文件当边界、规划/构建/自动化、Steer 纠偏、Chorus App |
| [[Codex实战-30分钟掌握95%核心功能]] | Riley walkthrough：Agents.md 双层、@ 引用、/ 命令 SOP、Chronicler |
| [[Codex实战-演示开发一个手机App]] | Riley：Codex + Xcode 搭 Jerry；Claude Agent SDK + Vibe Code CLI |
| [[Codex实战-用AI颠覆视频剪辑流程]] | Riley：Remotion 动态图、竞品拆解、帧级转场、八 prompt 成片 |
| [[Codex实战-Notion第二大脑与技能封装]] | Riley 八步：Notion 插件、内嵌浏览器、自定义技能、每晚自动化（**A-lecture v3** ✓） |
| [[OpenClaw创始人-我是如何使用OpenClaw的]] | WhatsApp→Claude Code；CLI Army；Just talk to it，别沉迷 24h loop |
| [[OpenClaw创始人-Claw现状与安全治理]] | Peter S.：基金会、安全三重奏、做梦记忆、AI CVE 噪音（**canonical v3.2** ✓） |
| [[30分钟精通OpenClaw]] | 安全五步、五用例 demo、SOUL/USER/MEMORY 本地 MD 人格 |
| [[Taven创始人-将OpenClaw嵌入产品的实战经验]] | Pi 内核企业嵌入：Excel Skill 小 CLI、一客户一 Agent + AGENTS.md |
| [[OpenClaw实战-从本地到K8S部署]] | Podman/K8s 四好处、Secret ref 双层、baseline 镜像愿景 |
| [[给每位员工配备AI智能体]] | Every × OpenClaw/Plus One：一人一 Agent、Slack 公开协作、信任传递（**canonical v3.2** ✓） |

---

## Cursor 与工具链

> Cursor 团队的内部故事 + 多 Agent 协作 + AI 工具产品视角。

| 文章 | 核心主题 |
|------|---------|
| [[Cursor CEO-云端智能体上线]] | Compile 26：Agent-first 95%、云端多智能体、Mobile、Origin Git、Composer 算力（**A-dialogue v3.2-asr** ✓） |
| [[Cursor副总裁-构建软件开发过程的Agent]] | STLC 全链 Agent 团队：98% AI merge 但 40% plateau；Skills 原子单元 |
| [[Cursor-128个Agent团队协作]] | 208 Agent 并行、脚本互通信、Judge 校验、Claude 写/GPT 审 |
| [[Cursor负责人-Composer模型如何训练的]] | Kimi 2.5→mid-training→Cursor harness RL；async 全球集群 + sim/online RL |
| [[Alchemy CPO-从代码审查到自动代理]] | 三转折点：Slack 文档→事故 retro review→PR 协作；Linear+Skills 离线干活 |
| [[smart-draw 手绘风可编辑 AI 图表 - 极客公园]] | 自然语言→Excalidraw 手绘风可编辑图；补 AI 生图不可改与 Mermaid 工业味缺口 |

---

## AI 编程实战（S-tier）

| 文章 | 核心主题 |
|------|---------|
| Codex实战-用Codex处理日常工作（待收录） | OpenAI 播客：用 Codex 处理日常工作 |
| [[Codex实战-Notion第二大脑与技能封装]] | Codex + Notion：AI 第二大脑落地实战 |
| AI编程工具-2026年趋势与Vibe Code（待收录） | AI 编程工具：2026 年趋势与 Vibe Code |
| AI编程工具-2026年趋势与Vibe Code（待收录） | AI 编程工具：2026 年趋势与 Vibe Code |
| Claude Code实战-40分钟浏览器自动化（待收录） | Claude Code 实战：40 分钟用 AI 实战浏览器自动化 |
| [[Claude Code实战-鲜为人知的Claude Code工作流]] | Claude Code 实战：鲜为人知的 Claude Code 工作流 |
| AI App实战-6个AI工具共同开发App（待收录） | AI App 实战：现场演示 6 个 AI 工具共同开发一个 App |
| OpenAI总裁-AI要让每个人都受益（待收录） | OpenAI 总裁：AI 要让每个人都受益，是 AGI 之路 |
| Codex实战-用AI高效完成视频脚本（待收录） | Codex 实战：用 AI 高效完成视频脚本 |
| [[AI编程工具-2026年如何Code]] | AI 编程工具：2026 年如何 Code |
| [[TypeScript专家-AI编程生产级代码]] | TypeScript 专家：AI 编程如何写出生产级代码 |
| [[Codex实战-AI编程2026新手教程]] | Codex 实战：AI 编程 2026 新手教程 |
| [[DHH-编写代码的新方式]] | DHH：编写代码的新方式 |

---

## 工程踩坑

| 笔记 | 核心主题 |
|------|---------|
| [[ACP集成问题与踩坑经验]] | ACP（Hermes × FlowyClaw/AI_Router）协议集成踩坑：通信、责任边界、Agent Server 问题、连接排障 |
| [[季白羽-Codex 与 Remotion 纸片分层动画流水线]] | Codex 当指挥家串 Imagegen/F5-TTS/Remotion/FFmpeg 的纸片分层动画流水线：先定镜头、拆四层、独立 PNG、错峰入场、遮挡造纵深 |
| [[拾语隅-给Hermes装个状态灯]] | 用 Hermes Agent 当个人助手时，通过 macOS 菜单栏状态灯实时显示 Agent 工作状态（工作中/待机/掉线）；迭代方案：CPU 监测→标记文件→日志监控 |

## 跨 MOC

| 横切主题 | MOC |
|---|---|
| 全库导航 | [[MOC - 知识库导航]] |
| Agent 理论总览 | [[MOC - Agent Theory and Design]] |
| Harness 工程 | [[MOC - Harness Engineering]] |
| Prompt/上下文工程 | [[MOC - Prompt 工程]] |
| 职业与组织 | [[MOC - AI 时代个人发展与组织]] |
| Loock 全栈课程 | [[MOC - Loock AI 全栈课程]] |

