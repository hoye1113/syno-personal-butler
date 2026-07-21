---
title: "WorkOS：创建和使用 Skills 方法论"
tags: ["ai_agent", "video_transcript", "bilibili", "skills", "harness_engineering", "context_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "skills", "harness_engineering", "context_engineering"]
created: "2026-07-02"
source: "B站视频 - WorkOS Skills at Scale Workshop"
description: "Nick × Zack 工作坊：Skill = agentic 时代 DRY；description 路由、bang 脚本、渐进披露、置信度门控、eval 防帮倒忙与团队治理。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/WorkOS-创建和使用Skills方法论.md"
source_sha256: "6b7af030435d510b117ac1d49a78992c931ac621f23d2ce5526a3f486c625400"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV18bjG6fEi7/"
source_original_date: 2026-05-07
duration: 1:21:03
saved: 2026-07-03
updated: 2026-07-03
material_tier: A
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV18bjG6fEi7/ingest"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: "Editorially reconstructed workshop dialogue (description primary)"
host_name: "Nick Nisi"
guest_name: "Zack Proser"
guest_title: "WorkOS Applied AI / DX Engineer"
speaker_inference: "asr_workshop co-presenter Nick=primary_host Zack=guest + video_description"
speaker_confidence: medium
factual_status: unverified
factual_reviewed: 2026-07-13
verification_basis:
  - description
unresolved_facts:
  - "当前 Recastory BV 目录未发现 ASR 或专栏；人物映射、数字与直接引语不能作为已核验引用。"
spot_check: 2026-07-02
concepts:
  - id: skill_unit
    zh: 技能单元
    en: skill
    one_line: 文件夹 + SKILL.md，可路由的工作流模块
  - id: description_routing
    zh: 路由描述
    en: description (frontmatter)
    one_line: 给模型看的「何时加载我」
  - id: bang_script
    zh: 脚本插值
    en: bang / script interpolation
    one_line: Markdown 里跑 shell，确定性输出塞进 context
  - id: progressive_disclosure
    zh: 渐进式披露
    en: progressive disclosure
    one_line: 主 Skill 薄，细节 md 用时再读
  - id: skill_eval
    zh: 技能评估
    en: skill eval
    one_line: 有 Skill 不能比没有更差
---

# WorkOS：创建和使用 Skills 方法论

**Host：** Nick Nisi（WorkOS Developer Experience Engineer）  
**Guest：** Zack Proser（WorkOS Applied AI / DX Engineer）  
**形态：** Skills at Scale 互动工作坊 · 编辑重构对谈（当前缺 ASR）
**B 站：** [BV18bjG6fEi7](https://www.bilibili.com/video/BV18bjG6fEi7/) · **时长** ~81 min · **原片** 2026-05-07

---

## 开场

WorkOS Applied AI 团队 **Skills at Scale** 工作坊：现场一起写 **repo-roast** Skill，最后 `dot/share.sh` 互跑。Nick 和 Zack 自称 **6–8 个月没手写代码**——日常工作就是跟 agent 协作。

核心矛盾：每次对话从**零**开始。Claude 不记得上周聊过什么；CLAUDE.md / agents.md 能缓解，但**每次 kickoff 全塞进 context**，模型还可能**跳过中间步骤**——「你让我做，我就是不想做」——你知道这是真工程师了。

五章预告：**Skill 是什么、为什么比全局 memory 文件强** → **description 路由 + bang 脚本** → **CLAUDE.md vs Skill + 团队共享** → **渐进披露 + 置信度门控** → **eval 与编辑器之外**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 技能单元 | skill | 文件夹 + SKILL.md，封装一段 workflow |
| 路由描述 | description | frontmatter 里给**模型**看的触发条件 |
| 约束式写法 | constraints | 写「别做什么」往往比 500 行步骤管用 |
| 脚本插值 | bang (`!`) | 执行脚本，把 git log 等确定性结果插进对话 |
| 渐进式披露 | progressive disclosure | 主文件薄，testing.md 等用时再读 |
| 置信度门控 | confidence gating | 理解不够就先问你，别盲干 |
| Agent 时代 DRY | DRY in agentic era | 不想重复交代 → solidify 成 Skill |

---

## 01 Skill = agentic 时代的 DRY：三十行 Markdown 就够

**Nick：** 听众得带走一个 mental model——为什么 CLAUDE.md 不够，还要 Skill？

**Zack：** 跟 Claude 说话，**没有跨 session 持久记忆**。每个 tab、每个 repo 都要重新说：这项目 care 什么、用 pnpm 还是 npm、测试怎么跑。agents.md 放 repo 或 home 目录——repo 绑定要队友 pull；放 global 又**污染所有项目**。还没法优雅地把**确定性结果**插进非确定性对话里。

**Skill** 把 DRY 带进 agent 时代：一小包**可组合、可移植**的工作 intelligence——**只有相关时才加载**（靠 description 路由）。里面写 **constraints**（别含糊、引用代码必须带 line + git commit），比长篇菜谱强。常见失败模式：把 Skill 写成**小说**。

**对比 repo-roast**：
- 无 Skill：generic 建议，每次格式不同
- 三十行 markdown + 几条 constraints → **hyper-specific**、可重复：routing 惯例、semantic commit、README drift 不可接受

结构：单文件 `SKILL.md` 或**文件夹 + frontmatter**（name、description）。description **不是给人读的摘要**，是给模型做 **routing**。文件夹里还能放 references、scripts、图片。

加载：`.claude/skills/{name}/SKILL.md`（repo 或 `~/.claude` 全局）；Cursor、Codex、Dust、`npx skills` 类似。招聘团队用 Dust 做候选人报告——**非技术岗也在用**。

> **金句 · Zack**
> **中文：** Skills 把 DRY 带进 agent 时代。
> **原文：** Skills are like carrying the DRY pattern into the agentic era.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 技能单元 | skill | 可路由、可移植的工作流模块 |
| 路由描述 | description | 模型运行时判断是否加载 |
| 约束式写法 | constraints | 「never be vague」类否定约束 |
| 可组合单元 | composable unit of work | 小 footprint、按需加载 |

**本章小结**

- 每对话从零 + 全局 memory 文件 bloating → Skill 按需加载
- 三十行 + constraints 就能从 generic 变 hyper-specific
- description 给模型路由，不是给人写摘要

---

## 02 Description 路由 + bang 脚本：确定性插进非确定性对话

**Nick：** description 怎么写模型才会自动加载？bang 语法现场怎么用？

**Zack：** description 示例思路：「用户想 roast 这个 repo，要 fun analysis」——模型据此决定何时加载。多个 image-gen Skill 并存时，在 description 里限定：个人 blog domain 用 A，公司 domain 从 S3 拉图用 B。

不确定够不够好？**直接问 Claude**：「我什么条件下会加载这个 Skill？只想在 X 场景跑，description 该怎么改？」

**Bang 语法**（`!` + 反引号脚本）：Claude **执行脚本并把输出插进 context**——不是让模型「去猜 latest 10 commits」，而是「**这就是 10 条 commit，拿去分析**」。省 token，省在三个 terminal tab 里 spin 读 git docs。

早会报告、git status——凡是你想**确定性输出**的，都适合 bang。没脚本时模型只是在**猜**你说的「去拿最新 commit」是什么意思。

多个 Skill 描述冲突时：公开 Skill 保持**足够泛**、触发清晰；已知要用某个 Skill 就 **slash 点名**（`work ls`、按名调用 image-gen Skill）。

> **金句 · Zack**
> **中文：** Description 不是给人看的，是给模型做路由。
> **原文：** Description is not for humans — it's for the LM to do routing.

> **金句 · Nick**
> **中文：** 每条发现要有脚本或 git 数据撑着，别含糊。
> **原文：** Never present a finding without script or git data backing.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 脚本插值 | bang / `!` interpolation | Markdown 内执行 shell，输出替换占位 |
| 确定性基底 | deterministic base | 先给真实数据，再让模型推理 |
| 按名调用 | invoke by name | slash 或显式点名绕过路由歧义 |
| 令牌节省 | token saving | 脚本一次跑完，别三轮 tab 猜命令 |

**本章小结**

- description = 模型路由表；不确定就问模型自己
- bang 把 git log 等确定性结果插进对话，非猜测
- 冲突 Skill 靠泛化描述 + 显式按名调用

---

## 03 CLAUDE.md vs Skill：kickoff 全载 vs 按需，团队怎么共享

**Nick：** 现场有人问：规则和 Skill 的线画在哪？六十个工程师各写各的，Slack 晒 Skill——EM 想统一 library 又怕 MR 审十个 UX roast Skill。你们怎么治？

**Zack：** **一号规则**：CLAUDE.md / agents.md **每次 kickoff 都加载**——塞只偶尔用的东西就是在浪费 context。我的 CLAUDE.md **极小**： terse、别 glob、ideation 插件配置一行。repo 专用如「这项目用 pnpm」——**一行**；测试规范、repo roast → **Skill 按需**。

干一周后问 Claude：「分析我这周工作，该拆成哪些 Skills？」——让系统帮你切。

**团队共享**（现场痛点）：
- 公开 repo：`npx skills add`（github.com/workos/skills）
- 内部 marketplace：odd / dx / ag 等 specialist 桶
- 个人 marketplace + monorepo 里放 repo-specific Skill
- fork 本地改、plugin **版本 pinning**

别因怕乱就**全员禁共享**——先做起来再治理。plugin 接口像 npm 版本：master skill 在 repo，你 pin 自己 fork 的版本。eval 新模型上线后 re-run；Skill 原作者当 reviewer——还没 formal 到那步，但方向如此。

**Subagent vs Skill**（Q&A）：要**独立 context 干一大坨再摘要回来**（ideation 里的 review loop）→ subagent；**可重复、可路由的一包流程** → Skill。Skill 可被 subagent 调，**Skill 调 Skill 链**通常不推荐。

> **金句 · Nick**
> **中文：** 你说了要做，我就是不想做——你知道这是真工程师了。
> **原文：** You told me to do it. I didn't feel like it.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 启动全载 | kickoff full load | CLAUDE.md 每次对话都进 context |
| 技能市场 | skills marketplace | 公开 / 内部 / 个人多层分发 |
| 版本钉扎 | version pinning | plugin 像 npm 一样锁 Skill 版本 |
| 子智能体 | subagent | 独立 context 干重活，摘要回主线程 |

**本章小结**

- CLAUDE.md 只放每次 kickoff 都 relevant 的；其余拆 Skill
- 团队：公开 repo + 内部桶 + fork/pin；别因治理恐惧禁共享
- 大坨独立 context → subagent；可路由流程 → Skill

---

## 04 渐进披露 + 置信度门控：主文件薄，不够自信就先问

**Nick：** 第二节让 repo-roast 变聪明——不靠把 migration 全文塞进主文件。渐进披露和 confidence scoring 怎么写进 Skill？

**Zack：** **渐进披露**：主 Skill 别堆 migration 全文——写「要做 testing → 读 `testing.md`」「要做 scoring → 读 scoring rubric」。WorkOS Auth0→Next.js migration Skill 就是 **reference map**：只有命中 Next.js 才加载对应 md。skill-writer 里字面叫 reference map——装 AuthKit 进 Next.js 才 load `workos-authkit-nextjs.md`。

**置信度门控**（ideation plugin 示范）：用户说「加个 fun slash buddy 命令」→ Skill 打 confidence 分（problem clarity、criteria、scope…）。**90/100 不够**就追问（常给多选题），到 **96** 才出 **contract** 让你审，再分 phase 执行。

目的：信息不足时别幻觉开干；**clarifying loop 写进 Skill**，不靠你反复补上下文。问「你多自信」模型会说「很自信」——要它**展示推理**才会暴露「其实不够」。

迭代 loop：初版 Skill → 用几天 → 看 JSONL 对话 log → 找 edge case → 加 bang 或 progressive doc → 再 eval。失败和摩擦的 context 是 **Skill 金矿**——周六以前会 wipe 的键盘流，现在全是 skill-creator 的矿。

> **金句 · Zack**
> **中文：** 理解没到 95%，就别动手——先把我问清楚。
> **原文：** (pattern) Below 95% confidence, force clarifying questions before execution.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 渐进式披露 | progressive disclosure | 主 Skill 薄，路径引用细节 md |
| 参考地图 | reference map | 按技术栈路由到不同 reference 文件 |
| 置信度门控 | confidence gating | 分数阈值 + 强制追问 |
| 执行契约 | contract | 高分后才输出的范围/成功标准文档 |

**本章小结**

- progressive disclosure 防 context bloat；reference map 按栈加载
- confidence gating：低分追问、高分出 contract 再执行
- JSONL / 失败摩擦 → skill-creator 迭代输入

---

## 05 Eval、CI 与非技术场景：有 Skill 不能帮倒忙

**Nick：** 公开 Skills 的 eval framework 长什么样？Next.js installer 教训？编辑器之外还能干啥？

**Zack：** **公开 Skills 有正式 eval**：
- 多轮：无 Skill vs 有 Skill 同一任务
- 评分 / rubber band confidence；**有 Skill 不能比没有更差**
- 目标：有 Skill 时 **80–90%+** 正确，Skill 至少 **+1–2%** 边际

**真实教训**：Next.js installer Skill **写太死**，和模型本身能力**打架** → eval 显示 **~30% accuracy drop**。Eval 像 Apple Watch——数字未必精确，看**趋势向量**。

**Beyond editor**：
- 招聘 Skill（Slack + Notion + ATS → 统一报告）
- `workos install` CLI 的「大脑」全是 Skills——CI 里跑通即证明
- Skill 文件夹 zip → 拖进 Claude Desktop（版本管理仍痛，别塞 credentials）
- **Slack→Linear loop**：监听 @你 → 查 Linear 有没有 ticket → 没有就 dedupe 建 ticket——把 **context switch** Skill 化

博客写作统一 tone、销售 reject 模板、动画/Remotion skill——**跨模型、跨技术层级**。meta-skill：分析 transcript 提议该 solidify 成哪些 Skills。

收尾建议：装 **skill creator / skill builder**——「我这 Skill 行吗？」「跑 eval」。把以前当 disposable 的周末 wipe 掉的对话——尤其是**失败和烦**的部分——当金矿喂给 skill-creator。

> **金句 · Zack（封底）**
> **中文：** 失败和摩擦的 context，是 Skill 金矿。
> **原文：** All of that context is gold — rich context for a skill creator to mine.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 技能评估 | skill eval | 有/无 Skill 对比，新模型 re-run |
| 过度规定 | over-prescriptive | 写死步骤反而害模型发挥 |
| 技能驱动 CI | skills-driven CI | workos install 用 Skills 当大脑 |
| 元技能 | meta-skill | 分析 transcript 提议新 Skill |

**本章小结**

- eval：有 Skill ≥ 无 Skill；防 over-prescriptive 帮倒忙
- CI、Desktop、招聘、Slack→Linear——Skill 跨场景
- skill-creator + 失败 transcript = 迭代闭环

---

## 总结

| 维度 | 要点 |
|------|------|
| 定位 | Skill = agentic DRY；按需加载 vs CLAUDE.md 全量 kickoff |
| 写法 | description 路由 + constraints > 长篇步骤；bang 给确定性 |
| 进阶 | progressive disclosure + confidence gating（ideation 示范） |
| 团队 | 公开/内部 marketplace + fork/pin；别禁共享，先治理演化 |
| Eval | 有 Skill 不能更差；Next.js installer -30% 教训 |
| 与 vault | 接 [[3-5 Skills - Agent 时代的知识分发系统]]、[[Codex负责人-现场演示Codex]] |

> **金句 · Zack（封底）**
> **中文：** Skills 把 DRY 带进 agent 时代。
> **原文：** Skills are like carrying the DRY pattern into the agentic era.

---

## 概念索引

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| skill_unit | 技能单元 | skill | 文件夹 + SKILL.md 可路由模块 |
| description_routing | 路由描述 | description | 模型判断何时加载 |
| bang_script | 脚本插值 | bang | `!` 执行脚本插确定性输出 |
| progressive_disclosure | 渐进式披露 | progressive disclosure | 主薄、细节用时再读 |
| skill_eval | 技能评估 | skill eval | 有 Skill 不能比没有更差 |
| confidence_gating | 置信度门控 | confidence gating | 低分追问、高分执行 |

---

## 附录

### 章节时间戳（B 站简介）

| 时间 | 主题 |
|------|------|
| 05:40 | Skill = 非确定性的确定性入口；description 路由 |
| 22:15 | 渐进式披露优化 context window |
| 26:42 | 置信度评分强制自我评估 |
| 34:10 | bang 脚本插值与非技术自动化 |
| 45:20 | skill eval 应对模型迭代 |

### 素材路径

- **ingest**：`Recastory/workspace/knowledge/A6-workos-skills/ingest`
- **来源限制**：当前 Recastory BV 目录未发现 ASR；正文只可作为理解线索
- **video_description**：`{ingest}/video_description.md`
- **B 站**：[BV18bjG6fEi7](https://www.bilibili.com/video/BV18bjG6fEi7/)（*Easonlee的AI笔记* 转载）
- **嘉宾**：Nick Nisi & Zack Proser，WorkOS Applied AI / DX Engineers
- **工作坊 repo**：repo-roast skill、`dot/share.sh`
- **时长**：1:21:03

### 相关阅读

- [[3-5 Skills - Agent 时代的知识分发系统]] — Skills 原理与 MCP 对比  
- [[Codex负责人-现场演示Codex]] — Codex 侧 Skills 与 multi-agent  
- [[Cursor-128个Agent团队协作]] — 大规模 agent 协作另一路径  
- [[IBM团队-Harness工程详解]] — Skills 是 harness 内知识单元  
- [[MOC - Agent Theory and Design]] — Agent 架构横切索引  

### 收录说明

- **speaker_inference**：`asr_workshop co-presenter Nick=primary_host Zack=guest + video_description`  
- **版本**：canonical Host-Guest v3.2-asr（2026-07-03；原 v3 九段讲义已替换）
