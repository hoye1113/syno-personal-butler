---
title: "Boris Cherny：Claude Code 任务管理与 Compound 工程"
tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "harness_engineering", "loop_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "harness_engineering", "loop_engineering"]
created: "2026-07-07"
source: "B站视频 - Easonlee的AI笔记"
description: "Boris Cherny × Trevin 直播：Claude Code 新任务管理系统 vs Beads；跨会话任务账本、planner/worker/tester 多代理；上下文智能（Unblocked MCP）与任务账本勿混；compound engineering 分叉与 live demo 源码反查。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Boris Cherny-Claude Code任务管理与Compound工程.md"
source_sha256: "7badc7752464aeb46ad60eb5a06f69f6984d87d01f1641d3c9e4d5c4ff74df4b"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1hkFkz9E6N/"
host_name: "Boris Cherny"
guest_name: "Trevin"
guest_title: "Compound Engineering 贡献者"
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1hkFkz9E6N/ingest"
speaker: "Boris Cherny / Trevin"
duration: "45:06"
saved: 2026-07-07
updated: 2026-07-07
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1hkFkz9E6N/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Host-Guest canonical (ASR primary)
speaker_inference: "asr_host_welcome_Trevin + demo_host=Boris + compound_engineering_PR_guest=Trevin"
speaker_confidence: high
asr_version: v2
spot_check: 2026-07-07
concepts:
  - id: cross_session_task_ledger
    zh: 跨会话任务账本
    en: cross-session task ledger
    one_line: 任务存 ~/.claude/tasks，多实例共享，脱离单 session 上下文
  - id: contextual_intelligence
    zh: 上下文智能
    en: contextual intelligence
    one_line: 机器查询 Slack/Notion/Repo，而非强迫一切变 markdown artifact
  - id: compound_plugin_split
    zh: 复合插件分叉
    en: compound plugin split
    one_line: 规划/写作/产品/marketing 拆插件，价值在上层品味与审阅循环
  - id: planner_worker_tester
    zh: 规划者-执行者-测试者
    en: planner / worker / tester pattern
    one_line: 三 Claude 实例分工：规划、领任务、跑浏览器验收
  - id: task_context_separation
    zh: 任务与上下文分离
    en: task vs context separation
    one_line: 任务账本管状态；上下文智能管知识检索——混用会烂
author:
  - "[[Boris Cherny]]"
---

# Boris Cherny：Claude Code 任务管理与 Compound 工程

**Host：** Boris Cherny（Anthropic Claude Code 创始人）  
**Guest：** Trevin（Compound Engineering 插件贡献者）  
**形态：** Host-Guest canonical v3.2（**ASR 主源** · 直播对谈 + 现场 demo）  
**B 站：** [BV1hkFkz9E6N](https://www.bilibili.com/video/BV1hkFkz9E6N/) · **时长** ~45:06

---

## 开场

两天前 Boris 在 X 上偶遇 Trevin——后者给 **Compound Engineering** 提的 PR「像读心」，补的全是 Boris 脑子里想做、一直没推的事。昨天 Eric 预告的 **Claude Code 新任务管理** 今天落地；这场直播就是边聊边试。

议程三块：**新 Task 系统意味着什么** → **和 Beads / markdown 待办怎么取舍** → **Compound 工程怎么接任务账本而不把规划文档当流水账**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 跨会话任务账本 | cross-session task ledger | 任务写在 `~/.claude/tasks`，不跟单个 chat 走 |
| 复合工程 | compound engineering | Kieran 系插件：brainstorm → 审阅 → 迭代沉淀 |
| 上下文智能 | contextual intelligence | 按需查 Slack/Repo，而非全塞进 markdown |
| 规划者-执行者-测试者 | planner / worker / tester | 三个 Claude 实例分工协作 |
| Beads | Beads | 带 git hooks 的外部任务/依赖追踪工具 |

---

## 01 Beads、markdown 与 Compound 分叉

**Boris：** 大家好像都收敛到 **markdown 任务清单** 了——Claude 甚至不用你嘱咐就会回去改。Beads 很火，我装过又卸过十几次：git hooks 太重，Rust 轻量版又要自己管数据库同步。最后我还是回到 **纯 markdown**。

**Trevin：** 我最近在 compound 上挖更深。你那个 **compound writing** PR 也戳中我——我觉得 **compound planning** 才是超集：从产品侧 brainstorm 功能，比纯工程向有价值。我加了 brainstorm workflow，昨晚跑 **文档审阅循环**：模型自评 brainstorm → 自动改 → 再跟你 Q&A，效果不错。

但任务一多就出问题：agent 花大量时间 **改 markdown 计划本身**，把 brainstorm 当流水账更新——浪费。brainstorm 应是 **时间点快照**，不该当 ledger。

**Boris：** 昨天 Ryan Carson 也在聊 **compound product**——规划一端、营销一端，compound engineering 现在什么都包，确实该 **往外长**。

**Trevin：** 新任务系统一出来，我第一反应：Anthropic 迟早会把 **依赖、优先级、分组** 全做进原生 task——像内置版 Beads。那我们 compound 侧的价值不该是「教它怎么记任务」，而是上层：**品味、判断、审阅脚手架**。我甚至觉得该 **拆成多个插件**——engineering / planning / writing 各走各的。

> **金句 · Trevin**  
> 复合循环的价值不在任务追踪，而在 **用判断和品味把事越做越厚**。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 复合插件分叉 | compound plugin split | 规划/产品/工程拆插件，别一个包打天下 |
| 快照 vs 流水账 | snapshot vs ledger | brainstorm 定格，任务另记账本 |

**小结：** Beads 太重、markdown 太散；原生 Task 在路上，compound 应专注上层审阅与规划循环。

---

## 02 上下文管理：复合工件与任务后置

**Boris：** 我更大的痛是 **上下文管理**——token 爆、compact 丢教训。以前「复合」难在 **工件放哪**；有了任务系统，也许能在 **任务完成后** 做 compounding step，让下一阶段带着上一阶段的理解开工。

**Trevin：** 对。plan 现在还是 markdown 文件——我觉得还行，但 **任务** 能不能和 plan **互相引用**？任务有点像 **子代理**：各自有上下文，信息可以传来传去。

**Boris：** 你试过新系统了吗？我这边也没有成熟例子——要不现场试？

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 复合工件 | compounding artifacts | 任务结束后的沉淀步骤，补 compact 丢掉的教训 |
| 任务即子上下文 | task as sub-context | 每个 task 可隔离上下文，类似 subagent |

**小结：** 任务账本若真能跨阶段，compounding 不必全挤在一个 markdown 里。

---

## 03 上下文智能：别让任务账本当 RAG

**Trevin：** 我觉得下一前沿是 **上下文智能**。工程师爱把一切写进 repo markdown——但现实里上下文在 **Slack、Notion、Google Docs**。十人团队里，关键信息常在 thread 里，「搬出 thread」就是因为 thread 会丢。

**Boris：** 我们 Cora 人少，这块痛感轻；大公司这是真问题。

**Trevin：** 我在用 **Unblocked**（getunblocked.com）：接 repo、Slack 等，还提供 **MCP**。我写了个 skill——问问题时同时调 Unblocked MCP 和 compound 知识，像 **Context7 但打内部栈**。想象 Every 的 Discord 里吵一个具体 bug，上下文引擎能 **引用那段对话** 而不强迫人先整理成 markdown。

危险在于：别把 **任务管理** 和 **上下文智能** 混成一件事。任务管状态；上下文管 **检索与关联**——混了俩都烂。

**Boris：** 同意。任务这边灵感来自 Beads 的强项：**跨 session 持久化**。不同 Claude 实例可以各干各的。

**Trevin：** 我常用的模式是三个 Claude 并排：**planner** 听我说要做什么并排任务；**worker** 领任务写代码；**tester** 跑浏览器验收。新 task 系统让这套 **原生可行** 了。

> **金句 · Trevin**  
> 别忙着给机器造脚手架——让 **上下文系统** 去查，人专心做产品。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 上下文智能 | contextual intelligence | 多源查询式上下文，非全 markdown 化 |
| 任务与上下文分离 | task vs context separation | 账本管状态，MCP 管知识——勿混 |

**小结：** Unblocked 式「可查上下文」和任务账本是两条线；compound 的价值在审阅循环，不在替 Anthropic 做 PM。

---

## 04 跨会话任务账本与多标签编排

**Boris：** 你有多少次在一个 Claude session 里想起 **完全另一件事** 该做？现在有 **session 外的任务账本**，这很猛。接下来会看到大量 skill/tooling，最终 Claude 自己判断：这事该 **开独立 task**，还是太小我直接帮你做完。

**Trevin：** 大多数人还没 **全自主**，但 **多 tab 多 session** 已经在排队干活了——本质就是 **用任务做多代理编排**。感觉 Anthropic 走到这一步不可避免。

**Boris：** Beads 的跨 session 持久化是我唯一真想念它的点；hooks 和自动同步把我吓退了。新系统若是 **文件型、home 目录级**，小团队是合理第一步——再大就得回 **Beads 那类多团队 PM 问题**。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 跨会话任务账本 | cross-session task ledger | `~/.claude/tasks` 级持久化，多实例共享 |
| 多标签编排 | multi-tab orchestration | 人脑排队 + 任务账本 = 轻量多代理 |

**小结：** 任务账本解决「别的事忘了」；多团队还得上组织级 PM，home 目录只是第一站。

---

## 05 Live demo：术语、session 边界与源码反查

**Boris：** 现场试。Claude 说有 `task create` / `list` / `update`——但文档写 **session level progress tracking**，我原以为全局共享。右边 session 问「有没有 open tasks」→ 没有；左边刚 create 的也看不到。

**Trevin：** 你 compound 里还有个 **todo skill** 在影响行为——可能跟原生 task 抢路由。OpenCode / Codex 又没有这套，skill 得 **按运行时分支**，不能一刀切删。

**Boris：** 去 `~/.claude` 翻——有 **按 session ID 分的目录**，也有 `tasks` 文件夹。resume 错 session 就「失忆」；`claude task list` CLI 能列出来。环境变量 `CLAUDE_CODE_TASK_LIST` 可绑共享列表，但本质是 **硬塞一个 global ID**，没有项目级 taxonomy——Linear/Jira 那套复杂度迟早回来。

**Trevin：** 依赖字段在 task JSON 里有了（`blockedBy` 引 ID），但 **跨 conversation / 跨项目** 还弱。大家会先 **写 skill 补元数据**，用 `compound_engineering:` 前缀自定义字段，等官方字段稳定。

两人让 Claude **反查 Claude Code 源码**：`task create/update/list/get` 走 JSON 文件；状态流 pending → in_progress → completed；**没有 delete**（Trevin 习惯在 Beads 里删垃圾任务）。Trevin 想要多一档 **ready**（backlog vs 可开干）和 **blocked**。

最戏剧的一幕：模型「发现」**teammate tool / multi-agent swarm**——兴奋半天，再查源码 **不存在**，典型幻觉。结论：早期功能 **交叉验证源码**，别信直播口嗨。

**Boris：** 最坏情况：这就是个更清楚的 **文件型 todo**，替换 markdown checkbox——下一步才是 **争用、认领、依赖图**。我们可以 hack：让 agent 直接读 `~/.claude/tasks` 目录捡 open task，在官方 API 成熟前先写 skill。

**Trevin：** Compound Engineering 2 的第一步 probably 就是 **更好的 task skill**——跟官方 tool 对齐 workflow，文件系统兜底。

> **金句 · Boris**  
> 大多数人得先 **卸掉自己堆的 todo 触手**，才能用上原生 task。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 规划者-执行者-测试者 | planner / worker / tester | 三实例分工，任务账本串联 |
| 术语冲突 | task vs subagent vs background task | 官方把 subagent 改过名，slash task 易混淆 |
| 源码反查 | source reverse-engineering | 幻觉功能必须用代码验 |

**小结：** 早期、session 边界糊、术语乱；文件兜底 + skill 补丁是过渡，别跟 Beads 全量对标。

---

## 总结

| 维度 | 要点 |
|------|------|
| Beads vs 原生 | hooks/同步太重；跨 session 持久化是 Beads 唯一真亮点 |
| Compound | 分叉 planning/product/engineering；价值在审阅循环，不在任务记账 |
| 上下文 | Unblocked MCP 式 **查询** vs 强迫 markdown artifact |
| 多代理 | planner / worker / tester 三实例 + 任务账本 = 轻编排 |
| 新 Task 系统 | `~/.claude/tasks` 文件型；session/global 仍糊；依赖字段在，跨项目弱 |
| 过渡策略 | 写 skill 对齐官方 tool + 文件系统 hack；自定义字段加命名空间前缀 |
| 风险 | 幻觉未发布功能（swarm/teammate）；旧 todo skill 与原生 task 行为冲突 |

---

## 附录

### Ingest

- BV：`BV1hkFkz9E6N`
- ingest：`Recastory/workspace/bilibili-retranscribe/BV1hkFkz9E6N/ingest`
- ASR：`Recastory/workspace/bilibili-retranscribe/BV1hkFkz9E6N/article.md`
- 专栏：无（A-dialogue · ASR 主源）
- 说话人：ASR 明确 **Boris 主持 + Trevin 嘉宾**；B 站简介误写 Kieran Klaassen，以 ASR 为准

### 相关阅读

- [[Claude Code之父-编程已被解决接下来发展]] — 同 Host Boris：代理写码、循环与组织 dogfood
- [[Claude Code负责人-AI原生团队如何使用AI]] — Anthropic 侧 Todo/Plan 如何从 eager 模型长出来
- [[Every增长主管-Codex成为知识工作的OS]] — Compound Engineering / Trevin 审阅分叉语境
- [[Loop-Agent Loop到底是什么]] — 复合审阅循环与 agent loop 的对照
- [[MOC - Harness Engineering]] — 任务编排、上下文与工具层同属 harness 问题
