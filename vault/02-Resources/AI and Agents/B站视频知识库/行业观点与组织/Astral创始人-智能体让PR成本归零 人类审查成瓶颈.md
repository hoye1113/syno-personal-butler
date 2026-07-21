---
title: "Astral创始人-智能体让PR成本归零 人类审查成瓶颈"
tags: ["ai_agent", "codex", "column", "dialogue"]
legacy_tags: ["ai_agent", "ai_engineering", "codex", "harness", "devtools", "column", "dialogue"]
created: "2026-07-13"
source: "B站图文专栏 - Easonlee的AI笔记"
description: "Ryan Peterman 对 Astral 创始人 Charlie Marsh（Ruff/uv/Ty，被 OpenAI 收购）的对话——智能体让提交一个看似合理的 PR 成本降到零，但人类审查成本不变，代码评审成为新瓶颈；应对之道是把自动化校验与 Codex Review 前置成 harness 不变量，并坚持用第一性原理引导系统级重设计。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Astral创始人-智能体让PR成本归零 人类审查成瓶颈.md"
source_sha256: "c6600d0c3ef5a68a43335c9208813fecac09765514400b40353fe95c18022632"
migration_id: "migration-20260720-64e79771"
ingest_workflow: bilibili_opus_ingest_v2
aliases: [Charlie Marsh AI软件工程, Astral PR成本归零, Ruff创始人 智能体]
source_original_date: 2026-07-12
author: "Charlie Marsh（Astral 创始人，Ruff/uv/Ty）；Ryan Peterman（主持）"
uploader: "Easonlee的AI笔记"
source_type: bilibili_opus
source_url: "https://www.bilibili.com/opus/1224198789037817860"
opus_id: "1224198789037817860"
column_id: "cv51417402"
video_url: "https://www.bilibili.com/video/BV1SWTz6yEBA/"
bv: "BV1SWTz6yEBA"
source_tier: C1
primary_source: column
material_tier: S
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

# Astral创始人-智能体让PR成本归零 人类审查成瓶颈

> 来源：B 站专栏（Easonlee 的 AI 笔记转述 Ryan Peterman 对 Charlie Marsh 的英文对谈）。`source_form: dialogue`，声音依据为专栏直引（`direct_speech`），仅复核专栏本身（`column_only`），未回核原始视频，故 `factual_reviewed: partial`。

## 摘要

Charlie Marsh（Astral 创始人，Ruff/uv/Ty 背后团队，已被 OpenAI 收购）认为，智能体把"提交一个看似合理的 PR"的成本降到了零，但人类理解并审查这些代码的开销没变——**代码评审成为新瓶颈**。应对不是反对 AI，而是：把自动化校验（基准测试、生态 diff、内存分析）与 Codex Review 默认前置成 harness 不变量；用第一性原理引导系统级重设计（Agent 擅长局部微优化，但不擅宏观重构）；坚持"理解你提交的每一行"。Rust 的工具链与内存安全让高性能产品近乎零妥协，Ty 借 Salsa 框架做增量分析以扛住大型项目。

## 对话实录

### Ruff 的诞生与快速迭代的工具哲学

**Ryan Peterman（主持）**：你刚开始构建这些开发工具时，这个领域什么样？为什么你觉得能做得更好？

**Charlie Marsh（嘉宾）**：创立 Astral 前我在一家计算生物公司当二号工程师，没生物也没 ML 背景，所有跑机器学习的软件都用 Python 写，我是那时学的 Python。作为小团队，我们要服务研究员和科学家，却总被类型检查器、Linter、包管理器的局限卡住。我看 Python 生态里没有 Web 生态（esBuild→SWC→Bun→Deno）那种"原生工具链"的探索精神，就问："为什么我们不能也拥有这些？"于是写了篇《Python 工具链其实可以快得多》的假设文，九天后发原型验证：是的，确实可以。

**Charlie**：我从 Linter（Ruff）起步而不是类型检查器（Ty），因为 Linter 核心简单、规则海量、极易扩展，能用更小体量验证想法、快速把可用东西交到用户手里迭代。类型检查器做到 75% 没用，必须完整——这类工具很难边迭代边对用户有用。这正是建立势头的关窍。

### 开发者营销与 Rust 语言的选择

**Charlie**：Ruff 上 HN 首页后我极主动地响应每个 Issue、当日修当日发，把势头滚起来；FastAPI 作者 Sebastian 说想试用，我就去把拦路的事全搞定。**开发者营销**不是贬义——GitHub 上无数极好的项目因不会营销而永不被发现。你只有 **10 秒**让人明白"这为什么与我有关"，所以要放一张无歧义的基准图 + 有力标语（"兼容你现有工具链，且快得多"），坦诚真实、不标题党。

**Ryan**：你为什么选 Rust？

**Charlie**：起初很大程度是跟风——看哪都提 Rust、门槛低、快。事后看是极佳决定。Rust 被低估的优势是 **Cargo 开箱即用**：克隆即 `cargo run/build/test`，新人不必搞懂 C 工具链。内存安全让我能构建不崩溃、飞快、零妥协的产品。除非有具体底层原因或维护存量 C/C++，我现在想不出为什么要新开 C/C++ 项目。

### 智能体时代下的自动化代码重写与软件工程变革

**Charlie**：去年圣诞前我还没试过用智能体编程，现在很久没手动改过代码了，一切靠代码模型。如果人人重度依赖智能体，**他们在多大程度上还需要理解代码**？这是个真问题。把整个代码库转译到另一种语言，人类可能彻底看不懂——而且根据**海勒姆定律**（任何实现细节最终都会被人依赖），合并改动关掉 50 个 issue，却可能引入 15 个你不知道的新问题。

**Charlie**：现在构建软件的方式光谱极宽：从 Karpathy 的纯 vibe coding（完全不看代码）到坚持不用 LLM。我上周写了个私人 Rust linter，**一行代码没读，全 GPT 5.5 搞定**——因为它是我独用的个人工具，对错易判。但 **uv 被数百万工程师信赖**，发布须极谨慎。责任取决于"你在做什么项目、对用户负什么责"。

**Ryan**：如果别人在你们仓库直接提纯智能体内容，你们拦截吗？

**Charlie**：会拦截，但我们出台了 **AI 政策**——不是反对 AI（我们重度依赖 LLM），而是过滤"纯负面交互"。如果一个贡献者发一条 agent 写的评论，我们问他问题，他直接把 agent 回答粘回来，毫无价值。政策核心是：**你需要理解你粘贴或提交的内容**。最明显破绽是"以人类不会用的方式在不需要处过度投入"——过于周密、堆砌术语与链接。

**Charlie**：更深的隐患是开源"贡献者成长契约"失效：新人从反馈中学会成长，未来成为维护者；但 agent 写的 PR，你把评审意见输回 agent、它更新合并，**中间没有人的成长累积**。而提交看似合理的 PR 成本已归零，评审把关成本不变——**这是我们正在开发的项目（Ty）最大的痛点**：一个 PR 他花两分钟，我们要花一小时读懂。

### 系统性能极致追求与 Rust 架构设计优化

**Ryan**：你所有产品都比同类快一个数量级，Rust 影响多大？

**Charlie**：Ruff 快很大程度只因用了 Rust；即便全 Rust，写法不同性能可差十倍——Rust 是**性能下限**，深入设计还能再榨 10 倍。**uv** 更多是架构创新：包管理器海量 I/O，缓存布局精心设计，重复安装近乎瞬间。版本号用**单个 U64 整数**表示 90% 以上情况，省下海量分配开销。

**Charlie**：**Ty** 基于 **Salsa 框架**（Rust Analyzer 同款）做增量分析——编辑器里你不想为改一个文件而对整个 PyTorch 重做类型检查。系统是围绕"查询"构建的惰性依赖图：改某处只让相关数据流回相关部分。增量是最难的部分。

### 人机协作下的性能优化边界与智能体开发实践

**Charlie**：我大量用 **Codex** 做微优化（如把 Ty 的 Salsa 内存占降 1%），它很在行。但**系统级重设计它做不到**——Mitchell Hashimoto 的 Ghostty：LLM 优化后快 10 倍，他手写版却快 100 倍。结论：若不用第一性原理想清"系统该如何运作"，你只是在交付堆砌的代码，本应快 100 倍却只快 10 倍。需在提示词里引导宏大架构构想（先性能剖析→定位耗时→再问如何更紧凑表示）。

**Charlie**：对抗 AI 代码的灰色地带（勉强可接受、未达本人水平），我的打法：① 理想状态是 PR 测试通过即高概率可合并——靠**前置自动化校验**：Ty 每个 PR 用 CodSpeed 在 Valgrind 下跑基准+内存分析，并跑庞大生态测试套件生成诊断 diff 报告；② 团队默认提交 PR 前先跑 **Codex Review**；③ 持续完善 **AGENTS.md**，把评审反馈沉淀成技能；④ 我自己**在 GitHub UI 通读每一个 PR 的每一行**——本地看 diff 常漏，像审查人一样读才发现问题。

**Charlie**：与 Agent 协作让我做实验的成本降到近零。曾想验证"把内联快照移出测试源文件能否加快编译"，人工转极痛苦，交给 Agent 后台跑，结论是不显著但迭代快照不再需重编译。价值更多来自对数据结构布局的深思，而非敲码本身。

### 新人、乐趣与工程判断

**Charlie**：我发过推特："若我在没有丰富软件工程经验时就用这些工具，挺担心自己会制造多少垃圾代码。" 现在做工程师**比以往更难也更重要**——新人易被 agent 生成的大量代码淹没而不懂。AI 提升生产力却可能让编程变无聊，但我现在更积极：Agent 更聪明、做实验成本近零，深入思考与"合并一个解决用户问题的 PR"的成就感仍在。关键是亲手审查、用第一性原理引导，而不是把判断外包给模型。

## 限制与边界

- "PR 成本归零"指**看似合理的 PR**可由 agent 大量产出；但对 Ty 这类正确性要求极高的核心项目，agent PR 仍需人类约 1 小时审查对应 2 分钟产出，瓶颈短期无解。
- "Rust 优于 C/C++"是 Charlie 的偏好与生态判断，非普适；特殊底层需求或维护存量 C/C++ 仍合理。
- "智能体不擅系统级重设计"基于**当前**经验；随模型能力演进可能变化。
- 自动化校验（基准/生态 diff）能捕获回归，但覆盖不到"是否达到本人一贯水平"的**灰色地带**——仍需人类细审。
- 增量分析依赖 Salsa/依赖图，对强副作用或动态派发代码未必同等适用。

## 知识连接

- **支持** [[2026 年 Agent 最重要的工程概念 Harness Engineering]]：Charlie 把 "PR 合并前自动化校验 + Codex Review 默认前置 + AGENTS.md 沉淀评审反馈" 前置成系统不变量，正是 harness 思路——用工程系统而非个人纪律保证正确性。
- **补充** [[Loop-Agent Loop到底是什么]]：评审/基准闭环对应 "带 code review 评分的 loop 才合理"；Charlie 用 CodSpeed/Valgrind/生态测试 diff 构成评分闭环，避免开放式 token 焚烧。
- **限制** [[Anthropic团队-如何构建运行数小时的Agent]]：长时 Agent 依赖验证器门禁；Charlie 同样强调验证器-gated 合并，但指出灰色地带代码（勉强可接受但未达本人水平）仍需人类细审，验证器当前覆盖不到这一层。
- **应用于** [[Codex实战-用Codex处理日常工作]]：Charlie 用 Codex 做微优化与 /review，既印证 "Agent 擅长局部优化、不擅系统级重设计" 的边界，也示范了把实验成本压到近零的人机协作节奏。

## 来源声明

- 专栏原文：`source_url`（B 站 opus 1224198789037817860），`bv: BV1SWTz6yEBA`，`column_id: cv51417402`，发布于 2026-07-12。
- 本笔记为专栏转述英文对谈的中文直引整理，`voice_basis: direct_speech`，`dialogue_fidelity: source/column` 表述为 `source`，`question_source: column`，`verification_scope: column_only`。未读取图片、未使用 ASR/Recastory/transcript。
