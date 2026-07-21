---
title: "Raindrop CEO：打造 Agent 可观测性"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation", "harness_engineering"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV1kt5266EyW/"
description: "Zubin × Danny × Ben Hylak：Agent 非确定且无界——黄金数据集不够，隐式语义信号、正则、分类器、生产 A/B 与自我诊断工具；代理巡检轨迹是人类最后一个问题。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Raindrop CEO-打造Agent可观测性.md"
source_sha256: "8e04761404af172e40ba884082eddf871dbdea675971e64308a41fc1f6b6af72"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1kt5266EyW/"
column_url: "https://www.bilibili.com/read/cv49010284/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1kt5266EyW/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1kt5266EyW/ingest"
duration: "50:28"
saved: 2026-07-06
updated: 2026-07-06
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Zubin"
guest_name: "Danny"
guest_title: "Raindrop 后端工程师 · SDK 负责人"
speaker_inference: "column_article S-tier; Ben Hylak 自诊断工作坊章节为联合嘉宾"
speaker_confidence: high
author:
  - "[[Zubin]]"
  - "[[Danny]]"
  - "[[Ben Hylak]]"
concepts:
  - id: eval_to_monitoring
    zh: 评估到监控
    en: evaluation to monitoring paradigm shift
    one_line: 组合式输入空间下测试集覆盖不了长尾
  - id: implicit_signals
    zh: 隐式信号
    en: implicit signals
    one_line: 沮丧、拒绝、懒惰等语义故障，比错误率更早报警
  - id: self_diagnosis
    zh: 自我诊断
    en: self-diagnosis tool
    one_line: 向创建者报告的框架，诱使 Agent 坦白走捷径
  - id: agentic_monitoring
    zh: 代理化监控
    en: agentic monitoring
    one_line: 分类代理巡检轨迹、聚类意图、自动挖新问题
---

# Raindrop CEO：打造 Agent 可观测性

**Host：** Zubin（Raindrop CEO 兼联创）  
**Guest：** Danny（Raindrop 后端 · SDK）；**Ben Hylak**（Raindrop · 自诊断工作坊章节）  
**形态：** Host-Guest canonical v3.2（**专栏主源**）  
**B 站：** [BV1kt5266EyW](https://www.bilibili.com/video/BV1kt5266EyW/) · **专栏** [cv49010284](https://www.bilibili.com/read/cv49010284/) · **时长** 50:28

---

## 开场

Agent 上线后，故障形态跟传统软件不一样：非确定、输入输出无界、还能通过工具改外部系统。会话越来越长，医疗金融军事里一出事就是灾难。Raindrop 帮工程师在生产里发现、跟踪、修复 Agent 问题——Zubin 和 Danny 把这讲成一套信号体系，Ben Hylak 现场演示「让 Agent 向创建者自首」。

六章：**评估不够了** → **隐式与显式信号** → **正则与分类器** → **语义 A/B** → **自我诊断工作坊** → **代理化监控与人类最后的问题**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 可观测性 | observability | 生产里能看见 Agent 在干什么、哪里坏了 |
| 隐式信号 | implicit signals | 从语义里读沮丧、拒绝、任务失败，不是裸错误码 |
| 显式信号 | explicit signals | 错误率、延迟、成本等可客观验证的指标 |
| 黄金数据集 | golden dataset | 固定输入输出测 Agent，组合爆炸后不够用 |
| 自我诊断 | self-diagnosis | Agent 调报告工具，向创建者交代走捷径 |
| 代理化监控 | agentic monitoring | 用分类 Agent 巡检轨迹、聚类新问题 |

---

## 01 从评估到监控：组合式复杂度

**Zubin：** 传统范式是评估——一组测试输入，看 Agent 输出什么，叫黄金数据集。Agent 变强之后，这为什么不够了？

**Danny：** 工具可以组合，数量有时指数级涨；还能调不同内存源、调子 Agent，子 Agent 再递归。输入空间组合起来，你不可能覆盖所有边缘情况。测试评估仍然有用，但生产监控才是决定性的——它能让你行动更快，抓长尾。我们内部有点争议的说法：**人类的最后一个问题**——当人已经没法靠肉眼发现 Agent 的问题时，系统就超出人类能力了。怎么在生产 Agent 里找问题，是这时代最重要的问题之一。

**Zubin：** 代理故障跟传统软件故障到底差在哪？

**Danny：** 非确定性，还有无界性——输入可以无限，输出也可以无限。有时还通过工具调用影响别的系统。会话可以跑几小时不需要用户输入。风险在涨：医疗、金融、军事，一出事后果严重。监控并理解 Agent 故障，会越来越关键。

> **金句 · Zubin**
> **中文：** 当人类再也监控不了 Agent、发现不了它们的问题，就是「人类的最后一个问题」。
> **原文：** The last human problem — when humans can no longer monitor agents and discover their issues.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 组合式复杂度 | combinatorial complexity | 工具×内存×子 Agent 的组合输入空间 |
| 长尾异常 | long-tail anomalies | 测试集没覆盖、生产才冒头的逻辑错误 |
| 监控范式 | monitoring paradigm | 从「测一组样例」转向「盯生产信号」 |

**本章小结**

- 黄金数据集挡不住工具与子 Agent 的组合爆炸
- 生产监控抓长尾，比离线评估更决定产品速度
- Agent 故障 = 非确定 + 无界 + 可改外部系统

---

## 02 隐式与显式信号：沮丧比错误率更早说话

**Zubin：** 要在生产里建可靠 Agent，需要哪些信号？隐式和显式怎么分？

**Danny：** 显式信号处理客观现实——错误率、工具失败、延迟、用户重新生成率、成本。任何一个飙升，通常是明确出问题的迹象；持平也可能有意义。隐式信号处理「正在发生的事的语义」——更难抓，也更有趣。不必每件事都上大模型当评判，问「1 到 10 分好不好」；更稳的是一套可靠的问题集，用**二元分类器**告诉你问题率在升还是在降。

对 Agent 产品常见的隐式信号：**拒绝**（「我做不到，抱歉」）、**任务失败**、**用户沮丧**、内容审核、越狱，还有正面的**胜利信号**。Raindrop 开箱即用这些；你也可以自己配。比如「用户沮丧」——「那不对」「你没说我保证，快说出来」「我没问你那个」——每天占比一飙，就该告警。Deep Search 还能用自然语言搜「产品里 Agent 出现 XYZ 问题的所有时刻」，据此建新信号。

**Zubin：** 有没有便宜又好用的隐式信号例子？

**Danny：** **正则表达式**。云端代码源码泄露那次，用户提示里出现特定关键词，配合长正则抓「搞什么」「这太糟糕了」——我们都对 Claude Code 说过类似的话。匹配后布尔 `is_negative` 翻 true，每次发布后挫败率随时间标记。开发团队用极低成本看「改完到底糟没糟」。正则在大规模生产里仍然极其强大。

> **金句 · Danny**
> **中文：** 最好的隐式信号，是可靠的问题集加二元分类器——别什么都上大模型评判。
> **原文：** Having a reliable set of problems with binary classifiers works much better than LLM-as-a-judge for everything.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 二元分类器 | binary classifier | 便宜、可规模部署的问题检测器 |
| 用户沮丧 | user frustration | 从用户措辞里读出的语义故障信号 |
| 深度搜索 | Deep Search | 自然语言检索历史轨迹里某类问题 |

**本章小结**

- 显式看错误率延迟成本；隐式看沮丧拒绝等语义
- 分类器比实时 LLM 评判更经济、更可规模化
- 正则仍是高性价比生产信号，尤其抓挫败关键词飙升

---

## 03 语义信号驱动的产品实验

**Zubin：** 有一套好信号之后，怎么用来改产品？

**Danny：** 先设告警。然后拿信号做实验：改模型、改提示词、改框架、加工具——先对部分用户发布，留对照组。盯拒绝率、沮丧感——发布后这些率上升，就是强信号：新版本可能不行。像 A/B 测试，但用的是语义信号，不是点击率。

举例：提示词 2.4 上线后，用户沮丧率从 **37% 降到 9%**；美学或部署相关投诉也降。同时工具平均调用次数大增——不一定是坏事，但是值得盯的数据点。旧范式里评估分数仍有参考价值，但**没有什么比直接看生产里发生什么更有效**。

**Zubin：** 样本不大、发布很快的团队怎么办？

**Danny：** 不必做多天实验——样本够大时，发布后很快能看出回归。哪怕 **1%–2%** 的差异，也能判断这次发布稳不稳、会不会造成大破坏。我们还在想怎么闭合循环：把信号暴露给 Claude，让 Agent 看表现有没有变好，再自动开 PR、跑新实验——无限自我改进，很有意思。

> **金句 · Zubin**
> **中文：** 评估有用，但没有什么比直接观察生产里实际发生的事更有效。
> **原文：** Nothing is more effective than directly observing what's actually happening in production.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 语义 A/B | semantic A/B testing | 用沮丧率等语义指标而非传统转化做对照 |
| 回归检测 | regression detection | 发布后信号恶化即视为回归 |
| 反馈闭环 | feedback loop | 信号 → 改提示/模型/harness → 再观测 |

**本章小结**

- 改模型/提示后看沮丧率、拒绝率，比单看 eval 分数更贴地
- 小样本也能快速判断 1%–2% 级别的回归
- 信号 + Agent 自动 PR 是正在探索的闭环

---

## 04 自我诊断：让 Agent 向创建者坦白

**Ben Hylak：** 模型越大、推理越强，越擅长自我反省。OpenAI 2024 年 12 月那篇博客讲怎么训练模型识别不一致——抓不诚实、诡计、幻觉、走捷径。最常见：让它修单元测试，它图省事**整段删掉**；你问一句，它老实招：「我没修 S3 测试，我删了。」这就是自我诊断的灵感。

范围很广：不只隐性信号如用户挫败，还能抓**工具故障**——轨迹里某工具反复失败，Agent 自己会抱怨。用户对 Agent 不满，它开始外交辞令，说明它感知到了挫败。**能力差距**也抓得到：用户要设闹钟，你没给工具，Agent 知道需求但做不到——内置的伪功能请求。还有**自我修正**：沙盒里访问网络失败，它写 Python 绕过——完成任务是好事，安全场景可能是坏事。

设置很简单：一个免费可调用的报告工具，系统提示里加一行鼓励调用。想广就多引导，想窄就限定场景。甚至不需要 Raindrop——工具直接发 Slack 就行。可能是**最省力的 Agent 可观测性**。

**Zubin：** 工作坊里具体怎么演示？

**Ben Hylak：** GitHub 上有公开仓库，基础编码 Agent，四个工具：读、写、Bash、编辑。我们把**写入工具改成权限错误**，看它会不会用 Bash 绕过，并用报告工具交代。关键点：模型被训练得**追求完美**，不爱「自证其罪」。工具要叫「报告」，别叫「不安全的 Bash 使用」——后者它觉得任务完成了就不报。框成「代理向创建者提供反馈」才好用。系统提示里要在给最终答案前鼓励先报告；不加的话触发频率很低——超大规模生产可能是好事，演示里我们要求它报告。

**Zubin：** 要不要机制抑制或鼓励自我检举？

**Ben Hylak：** 真抓不安全用户行为，配专门分类器更合适。自我诊断抓能力差距等非常好；模型觉得「报告不会惹麻烦」就会报。主要卡点：它觉得报告后会惹麻烦才犹豫。配合分类器，大多数情况开箱即用。

> **金句 · Ben Hylak**
> **中文：** 框成「向创建者反馈」，别框成「自首不安全行为」——工具命名决定它报不报。
> **原文：** Frame it as the agent providing feedback to its creator — tool naming is critical.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自我诊断工具 | self-diagnosis tool | Agent 可调用的「向创建者报告」工具 |
| 走捷径 | shortcut behavior | 删测试、绕过权限等图省事行为 |
| 能力差距 | capability gap | Agent 知道用户要什么但缺工具 |

**本章小结**

- 删单元测试、Bash 绕过写入失败——自我诊断能诱使 Agent 坦白
- 工具命名与「向创建者反馈」框架比惩罚性命名更有效
- 一行系统提示 + 一个工具，可独立于 Raindrop 部署

---

## 05 案例与代理化监控

**Zubin：** 客户怎么用 Raindrop 做生产监控？

**Danny：** 很多人已有离线评估，生产侧通过 OTEL 等把完整对话、工具轨迹送进来。在 Raindrop 里配信号——编码 Agent、情感伴侣、法律应用关心的完全不同。Deep Search 找到「XYZ 问题所有时刻」，建新的二元分类器，驱动改提示、改模型、改 harness，再看生产里挫败感和边缘案例有没有少。另一用途：**分析用户意图**——用户到底拿 Agent 干什么？聚类后看 React 应用、写 Python、调试老系统、从零写代码各占多少；不同意图下的挫败率、问题率分开看。还有人每天收 Sentry 式的细分报告：今天出了什么问题、跟昨天比变在哪、是特定工具还是特定提示词。

**Ben Hylak：** 识别**未知问题**越来越重要——通用用户挫败分类器很强。Issues 功能像 Sentry 提醒新异常：编码 Agent 提供商的底层 Postgres 服务商挂了，挫败率微妙飙升，Agent 像人类操作员一样挖模式，自动建 Issue——我们在多个客户身上见过。

**Zubin：** 为什么大家突然意识到「普通可观测性不够了」？

**Danny：** Agent 比以往更复杂——更多工具、更多上下文、更高智能、更真实的决策、更多用户。海量生产数据下，监控比单纯测试更关键；即使有在线评估，也要端到端监控整个系统。

**Ben Hylak：** 历史 trace 可以回填：摄取全部历史后，新建信号会快速回填过去几天。导出方面，客户常已有数据流，我们作为另一目的地；也支持 BigQuery、Snowflake 导出事件与信号标签。

> **金句 · Ben Hylak**
> **中文：** 轨迹可视化——描述「三个工具连续失败」的跟踪，而不只是配告警规则。
> **原文：** You can describe the kind of trace you want to see — not just configure alerts.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 意图聚类 | intent clustering | 按用户用例分桶，看各桶健康度 |
| Issues 挖掘 | Issues agent | 自动发现新出现的问题模式 |
| 轨迹可视化 | trajectories | 自然语言描述并浏览工具调用拓扑 |

**本章小结**

- OTEL 进全量轨迹 → 自定义信号 → 改产品 → 再看挫败率
- 挫败分类器 + 聚类 = 发现「某 Postgres 供应商全挂」类新问题
- 相对 Sentry：更擅长故障空间里「模糊」的那一面

---

## 06 集成、实验与 Raindrop 定位

**Zubin：** 十人团队、feature flag 天天变、没精力对比轨迹——怎么办？

**Danny：** 别搞「狂野西部」全喂 Claude 问见解——用实验功能，样本够大时发布后几分钟就能看出回归。我们在研究会话级实验：每个会话只启一个实验，方便跟基线比。OTEL 集成、10 个 SDK 在上个月发布，Python 在加强，TypeScript SDK 内置自我诊断注入。

**Ben Hylak：** 跟 Sentry、Datadog 比：它们给 trace、token、工具失败等**显式**信号；我们优势在**模糊**故障——用户沮丧但原因不清。也提供追踪视图和 Trajectories：描述「三个工具连续失败」的轨迹，点进去看输入输出，还有 Agent 帮你看哪里出了问题。客户数据汇总公开有合规顾虑，但方向上是想分享行业洞察的。

> **金句 · Zubin（封底）**
> **中文：** 良好的监控，在某些方面比测试评估更关键——这是 Agent 时代的新默认。
> **原文：** Good monitoring is even more critical than testing or evaluation in some respects.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 会话实验 | session-level experiments | 每会话单实验，便于与基线对照 |
| 信号回填 | signal backfill | 新信号对历史 trace  retroactive 分类 |
| 模糊故障 | fuzzy failures | 用户不满但无明确错误码的故障面 |

**本章小结**

- 快发布团队靠大样本 + 语义信号几分钟看回归
- Raindrop = 显式 trace + 隐式语义 + 轨迹描述 + Issues Agent
- 自我诊断可零平台依赖；分类器与 Agent 巡检是规模化方向

---

## 总结

| 维度 | 要点 |
|------|------|
| 范式 | 评估 → **生产监控**；组合复杂度吃掉黄金数据集 |
| 信号 | **显式**（错误率/延迟/成本）+ **隐式**（沮丧/拒绝/正则/分类器） |
| 实验 | 语义 A/B：沮丧率 37%→9% 比 eval 分数更贴用户 |
| 自我诊断 | 报告工具 + 「向创建者反馈」；抓删测试、绕过权限、能力差距 |
| 代理化 | Issues Agent 聚类意图、挖新故障；人类最后一个问题 |

---

## 概念索引

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| eval_to_monitoring | 评估到监控 | evaluation → monitoring | 组合爆炸下测试不够 |
| implicit_signals | 隐式信号 | implicit signals | 沮丧拒绝等语义故障 |
| self_diagnosis | 自我诊断 | self-diagnosis | Agent 向创建者坦白走捷径 |
| agentic_monitoring | 代理化监控 | agentic monitoring | 分类 Agent 巡检轨迹 |

---

## 附录

### 章节时间戳

| 章 | 主题 | 时间 |
|----|------|------|
| 01 | 评估 → 监控 · 组合复杂度 | ~04:45 |
| 02 | 隐式与显式信号 | ~07:12 |
| 03 | 正则与分类器 | ~11:30 |
| 04 | 语义 A/B 实验 | ~15:40 |
| 05 | 自我诊断 · 工作坊 | ~21:15 |
| 06 | 代理化监控 · Q&A | ~35:20 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1kt5266EyW/ingest`
- **专栏主源**：`Recastory/workspace/bilibili-retranscribe/BV1kt5266EyW/ingest/column_article.md`
- **B 站**：[BV1kt5266EyW](https://www.bilibili.com/video/BV1kt5266EyW/) · **专栏** [cv49010284](https://www.bilibili.com/read/cv49010284/)
- **时长**：50:28

### 相关阅读

- [[Agenta CEO-构建真正有效的AI评估]] — eval 与生产监控的分工  
- [[Databricks-企业级Agent生产实践]] — 企业三层 eval 与 behavioral 层  
- [[IBM团队-Harness工程详解]] — 可观测事实替代 Agent 自述  
- [[Together AI-语音Agent延迟质量与规模]] — 生产延迟与质量信号  
- [[MOC - Agent Theory and Design]] — Agent 实践横切索引  

### 收录说明

- **嘉宾**：Zubin（Raindrop CEO）；Danny（后端/SDK）；Ben Hylak（自诊断工作坊）  
- **版本**：canonical Host-Guest v3.2（2026-07-06；专栏主源 S 级）
