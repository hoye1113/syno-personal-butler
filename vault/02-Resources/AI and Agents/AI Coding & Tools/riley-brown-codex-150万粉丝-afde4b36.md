---
title: "Riley Brown：使用 Codex，运营150万粉丝的账号"
tags: ["ai_agent", "bilibili", "article", "codex", "content_creation", "skills", "youtube"]
created: 2026-09-17
source: "https://www.bilibili.com/opus/1243271914160390145"
description: "Riley Brown 分享如何用 YouTube 研究、Codex、插件和 Skills 搭建内容生产系统，并把质量控制、缩略图实验和团队智能体协作纳入长期创作者业务。"
knowledge_state: captured
link_status: connected
collection_priority: P1
source_original_date: "2026-09-02"
source_published_at: "2026-09-02 08:50"
ingest_workflow: bilibili_opus_ingest_v2
source_type: bilibili_opus
opus_id: "1243271914160390145"
column_id: "cv52727523"
uploader: "Easonlee的AI笔记"
primary_source: column
source_tier: C2
material_tier: A
source_form: dialogue
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
voice_basis: attributed_paraphrase
factual_status: partial
factual_reviewed: 2026-09-17
verification_scope: column_only
verification_basis: ["column"]
source_kind: url
source_reliability: unverified
source_verification: unverified
source_url: "https://www.bilibili.com/opus/1243271914160390145"
source_content_sha256: afde4b36491858f2c705f514bf5db4bbde3c77b2520ea310ff44898b136c4246
---

# Riley Brown：使用 Codex，运营150万粉丝的账号

> 这篇专栏整理 Riley Brown 如何把 YouTube 研究、Codex、插件、Skills 和内容实验组合成创作者工作流。
>
> **核心主张：** 创作者的长期优势不在于批量生成，而在于把重复动作沉淀成技能，并用研究、实验和质量门槛持续改进内容。

> 真正的护城河是长期保持质量，而不是批量生产。
> ——Riley Brown（专栏整理）

## 开场

专栏把内容账号描述为一套研究、写作、包装、发布和复盘系统。下文按工作流重构问题与回答；所有人物观点均是专栏整理，不是逐字访谈记录。

## 01 把 YouTube 当作研究中心

**核心判断：** 内容生产的第一步不是打开写作软件，而是建立可检索、可并行和可复用的研究流程。

**编者问：** 为什么要让多个智能体同时分析视频，而不是自己逐个观看？

**Riley Brown（专栏整理）：** 研究阶段可以把视频转录、摘要、观点抽取、竞品比较和引用整理拆给不同智能体，再由人汇总。Supadata 等工具负责把视频变成可处理的材料，Codex 则负责把这些材料放入项目目录、技能和后续脚本中。并行的价值不是少看内容，而是更快暴露观点冲突和研究空白。

## 02 Skills 来自重复且低风险的动作

**核心判断：** Skill 不应该是一次性提示词，而应是对重复工作进行固化、测试和复用的操作规范。

**编者问：** 哪些工作最值得先封装成 Skill？

**Riley Brown（专栏整理）：** 适合封装的是频繁、步骤相对稳定、失败代价可控的动作，例如转录、提取资料、生成 Excalidraw 草图、调用 Paper 或整理研究引用。第一次可以手工完成，第二次观察差异，第三次把稳定步骤写成 Skill。Skill 的价值在于下次能直接复用，并能随着失败案例更新，而不是让每次对话都重新解释同一套流程。

## 03 先完成内容，再写开场钩子

**核心判断：** 开场和包装应当承诺真实内容，而不是用一个脱离正文的噱头争取点击。

**编者问：** BRENS 一类的钩子方法怎样避免标题党？

**Riley Brown（专栏整理）：** 先把视频主体做完，再从真正能改变观众判断的结果中提炼开场、标题和结构。钩子需要清楚说明观众会得到什么，并且在正文中兑现。研究和脚本完成后，再用缩略图与标题测试不同包装，才能区分“承诺更清楚”与“承诺过度”之间的差别。

## 04 缩略图实验服从质量，而不是服从数量

**核心判断：** 视觉包装是可实验的，但实验结果不能替代内容本身的可信度和完成度。

**编者问：** 为什么要用 Paper 管理缩略图和视觉参考？

**Riley Brown（专栏整理）：** Paper 之类的画布可以集中保存参考图、可编辑资产和不同版本，方便团队讨论与 A/B 测试。缩略图应当让主题一眼可辨、层级清楚，并与视频的实际价值一致。若包装实验带来点击，却带来低留存或低信任，就应该回到内容承诺和受众匹配重新检查，而不是只追逐一个指标。

## 05 技能组合会形成创作者的操作系统

**核心判断：** 多个小 Skill 组合起来，才能覆盖从研究到发布的完整链路；每次失败都应成为下一版技能的测试样例。

**编者问：** Skill 变多后，如何避免形成一堆互不相干的脚本？

**Riley Brown（专栏整理）：** 先按工作流定义输入、输出和验收条件，再让研究、脚本、视觉、发布和复盘技能互相传递明确产物。某个步骤失败时，应该记录触发条件、失败结果和修正方式，更新 Skill 后重新运行。模型可以变化，质量标准不能跟着模型能力波动；高影响的发布动作仍需要人工检查。

## 06 团队智能体需要新的协作界面

**核心判断：** 当创作者从个人工具走向团队，问题会从“能否调用智能体”变成“如何分配任务、审阅结果并共享上下文”。

**编者问：** 为什么云端智能体和团队工作流会成为下一步？

**Riley Brown（专栏整理）：** 云端运行可以减少本地机器持续在线的负担，并让研究、剪辑准备、内容分析等任务并行推进。但团队需要看到任务状态、来源、产物和审核点，不能只接收一个不可追踪的最终答案。内容创作者最终可能同时经营媒体和软件产品，智能体的协作体验会成为业务基础设施的一部分。

## 限制与边界

- 本笔记只读取 B 站专栏正文和页面元数据，没有读取原始视频、音频、图片、ASR、Recastory 或项目原始代码。
- 专栏中的粉丝规模、工具名称、案例效果和平台数据均按专栏口径整理，未独立核验；不能据此推导稳定的增长因果。
- 页面提供 opus 与专栏 ID，但未发现关联 BV 号；本笔记使用 opus 作为去重与来源主键。

## 知识连接

- **补充** [[Codex实战-构建全能AI营销团队]]：把内容生产技能连接到营销团队的多智能体分工与自动化。
- **补充** [[Riley Brown-Fable 5与Paper的智能体原生设计流]]：补充 Paper、设计资产和智能体原生团队协作的上下文。
- **补充** [[MOC - AI Coding 与工具]]：将 Codex、插件和 Skill 放回可复用的开发与交付工具链。

## 来源说明

- 来源：B 站专栏《Riley Brown：使用 Codex，运营150万粉丝的账号》；专栏地址：https://www.bilibili.com/opus/1243271914160390145。
- 专栏 ID：cv52727523；关联视频：页面未提供 BV；上传者：Easonlee的AI笔记；页面发布时间：2026-09-02 08:50。
- 收录工作流：bilibili_opus_ingest_v2；来源等级 C2；事实状态 partial；仅以 column 为核验范围。图片、ASR、Recastory、transcript 与 Spot Check 均跳过。

## 关系状态

- 补充：[[Codex实战-构建全能AI营销团队]] — 连接内容业务、营销分工与多智能体流水线。
- 补充：[[Riley Brown-Fable 5与Paper的智能体原生设计流]] — 连接 Paper 画布、资产管理和智能体原生协作。
- 补充：[[MOC - AI Coding 与工具]] — 将 Codex 与 Skills 纳入已有工具地图。
