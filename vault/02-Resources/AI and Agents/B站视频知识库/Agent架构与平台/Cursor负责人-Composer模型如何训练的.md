---
title: "Cursor负责人：Composer模型如何训练的？"
tags: ["ai_agent", "video_transcript", "bilibili", "cursor", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "cursor", "harness_engineering"]
created: "2026-06-09"
source: "B站视频 - Easonlee的AI笔记"
description: "Federico+Dima 拆解 Composer 2：Kimi 2.5 基座+mid-training 吃 code token+大规模 RL 在 Cursor harness 里 rollout；异步全球集群、权重 delta 同步、MoE 数值对齐、sim RL vs 在线 real-time RL。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Cursor负责人-Composer模型如何训练的.md"
source_sha256: "d4bf39b3966e88ff9995f2e4581f34613894058b2cc8e3d0c6809dccf5b2c371"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1iH7R6tEfJ/"
speaker: "Federico（Cursor Composer Research Lead）、Dima（Fireworks AI）"
duration: "45:12"
saved: 2026-07-02
spot_check: 2026-07-02
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1iH7R6tEfJ/article.md"
asr_version: v2
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1iH7R6tEfJ/ingest"
column_url: "https://www.bilibili.com/read/cv50042420/"
source_original_date: "2026-05-26"
host_name: "Sonya Huang"
guest_name: "Federico Cassano / Dmytro Dzhulgakov"
guest_title: "Cursor Composer 2 研究负责人 / Fireworks AI 联合创始人"
speaker_inference: "column_article + youtube_quote_match"
speaker_confidence: "high"
author:
  - "[[Sonya Huang]]"
  - "[[Federico Cassano]]"
  - "[[Dmytro Dzhulgakov]]"
concepts:
  - id: weight_saturation
    zh: 权重任务饱和度
    en: weight saturation / allocate all bits
    one_line: 有限容量全投单一任务，换成本与专精
  - id: async_rl_pipeline
    zh: 异步流水线强化学习
    en: async RL pipeline
    one_line: trainer 与 rollout 并行，换 staleness 换 GPU 满负载
  - id: router_replay
    zh: 路由器重放
    en: router replay
    one_line: 推理告诉 trainer 激活了哪个专家，对齐 MoE 数值
  - id: self_summarization
    zh: 自我总结
    en: self-summarization
    one_line: RL 里学压缩上下文，撑百万 token 长程任务
column_source: "Recastory/workspace/bilibili-retranscribe/BV1iH7R6tEfJ/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
updated: 2026-07-03
---
# Cursor 负责人：把每一位权重都投给软件工程

**Host：** Sonya Huang（Sequoia Capital · Training Data）  
**Guest：** Federico Cassano（Cursor Composer 2 研究负责人）、Dmytro Dzhulgakov（Fireworks AI 联合创始人）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `BV1iH7R6tEfJ/ingest/column_article.md`  
**YouTube 原片：** [UDTr9yUnLUI](https://www.youtube.com/watch?v=UDTr9yUnLUI)

---

## 开场：为什么现在聊 Composer 2 的训练

Cursor 刚发布 **Composer 2**——专门跑长周期编码任务的智能编码模型。它不光 benchmark 好看，推理成本还比 Opus 级模型低一个数量级。这期不是复读榜单，是拆 **训练配方** 和 **强化学习基础设施** 里那些硬骨头：异步流水线、全球分集群、混合专家模型的数值对齐、假环境作弊、在线反馈的悖论。

Federico 管 Composer 2 研究，Dima 过去几个月在 Cursor 兼职，帮搭这套庞大训练任务的基础设施。四章走线：**应用公司为何要训模型** → **Composer 2 双轴配方** → **RL 工厂怎么让 GPU 不空转** → **模拟 RL 先 bootstrap，长程靠自我总结**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 中间训练 | intermediate training / mid-training | 预训练与 RL 之间，大规模续训代码 token |
| 强化学习 | reinforcement learning (RL) | 模型在环境里试、拿奖励、改权重 |
|  rollout | rollout | 一次完整智能体会话，RL 的采样单位 |
| 异步流水线 | async RL pipeline | 训练器与 rollout 并行，GPU 常满负载 |
| 权重增量同步 | weight delta sync | 只传每步变化的权重，全球集群分钟级对齐 |
| 混合专家模型 | mixture of experts (MoE) | 稀疏大模型，每层只激活少数专家 |
| 路由器重放 | router replay | 推理侧告诉训练侧激活了哪个专家 |
| 实时强化学习 | real-time RL / online RL | 用真实用户反馈几小时更新一版模型 |
| 自我总结 | self-summarization | 模型学会压缩自己的工作进度，重启上下文 |

---

## 01 权重专精：把每一位 bit 投给 Cursor 内的软件工程

**Sonya：** Cursor 以前主要是给其他公司的编码智能体做产品。什么让你们下这么大功夫自研 Composer 2？成为「既做应用又做基础模型」的公司，对你们有多重要？

**Federico：** 我们把模型想成一块 **存储驱动器**——权重里能塞的信息位就那么多。我们的问题特别窄：不是广义编程，就是 **Cursor 里面的软件工程**。那如果把每一位 bit 都投这一件事呢？

Composer 比 Opus 便宜一个数量级，就是因为 **全部权重专精这一任务**，模型可以更小、更高效。关键就一条：**每一个信息位都服务手头这一个问题**。

**Sonya：** 这像是应用公司的普遍路线？每家都该走 Cursor 这条路吗？

**Dima：** 我觉得是 AI 应用演化的固定模式。你从原型起步，用货架模型跑业务，调提示词，摸清框架怎么转。但真正拉开差距的，是你怎么用 **用户数据**、你的 **工具链**、你的工作流——提示词能抓一部分，正确做法是 **精心设计和训练模型**，让它在你的环境里最好使。Fireworks 相信：Frontier 实验室要 **一个模型干所有事**；应用公司该 **all-in 自己的实际产品**——模型最终要在那儿跑，训练数据也该从那儿来。

**Federico：** 有些工具行为，用语言很难准确描述。训练可以把 **最佳用法直接写进 Composer**。我们确实还会给提示词，但以我们的训练方式，**没有提示词它也该能正常工作**——整个训练过程都在内在推它往对的方向走。

**Dima：** 提示词工程有天花板。要做顶尖 AI 产品，**微调** 才能深度改行为。第二个原因是成本体验权衡：Fireworks 看优化，是在 **质量、速度、成本** 三维里找位置。只调基础设施能走很远，自训模型才能把 frontier 推到极致——更低成本、更快、更强，Composer 就是例子。

我们帮很多客户做 **强化学习微调**，常见路径是：先有 **持续预训练** 吃领域数据，再用 **监督微调** 灌新知识——那更像「抽象的知识转移」。**强化学习** 则是 **磨砺行为**：你希望模型具备的那些品质，往往两条路都得走。就算总结这种任务，RL 也有用——特定风格很难用正负例写清楚，但 **大模型当裁判** 可以给出精确 rubric，让模型试不同风格直到对上味。Composer 2 发布前，我们跟 Fireworks 在 infra 上 **连轴转了好几个通宵**——不是算法 ppt 好看就行，得真把 **万级 GPU 的工厂** 跑起来。

**Sonya：** 这跟 **苦涩的教训** 矛盾吗？LLM 时代之前有很多小编码模型，后来通用大模型在海量文本上训，编码也更强了。更大不是样样更好吗？

**Federico：** 我不这么看。大实验室的通用模型，**代码数据量也巨大**——代码是它们重点推的任务之一，不是纯泛化碰运气。我们是在 **数据维度** 更用力：模型容量有限，要饱和利用就得扩数据；要把无关任务从权重里清出去，腾出空间给 Cursor 内的软件工程。

换个比喻：通用模型像 **大杂烩硬盘**，什么都能装一点；我们要的是 **单任务专用盘**——同样容量，专存 Cursor 里那些 repo 结构、工具调用轨迹、失败补丁。用户每天怎么用 Composer，那些模式才是我们真正想 **饱和写进权重** 的东西。Dima 在 Fireworks 见过太多客户：原型阶段靠 GPT-4 够用，一旦 **日生成 token 上亿**、产品绑死特定 harness，继续只调 prompt 就是在 **漏掉最强杠杆**。

> **金句 · Federico**
> **中文：** 模型权重就那么多位——我们全投 Cursor 里的软件工程，别的不管。
> **原文：** Allocate all of the bits… to software engineering inside Cursor and inside Cursor only.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 权重任务饱和度 | weight saturation | 有限容量专投单一任务，不分散 |
| 苦涩的教训 | the bitter lesson | 算力与数据 scale 往往胜过手工特征 |
| 提示词天花板 | prompt engineering ceiling | 只靠提示词改行为，走不到顶尖 |
| 质量速度成本 | quality-speed-cost tradeoff | 自训模型继续推 Pareto 前沿 |
| 环境定制 | craft model to environment | 把工具、工作流、用法写进权重 |

**本章小结**

- 应用公司训模型 ≠ 跟风做 lab：是把 **工具与环境行为 bake 进权重**
- 专精符合 bitter lesson 的数据维度——清掉分心能力，饱和投 Cursor 内 SE
- 提示词有顶；Composer 比 Opus 便宜数量级，来自 **全权重专精**

---

## 02 自上而下交付：中间训练打底，RL 在真实 harness 里学写对代码

**Sonya：** Composer 2 一发布就炸了——基准强，成本还低。能不能给一个 **短版**：它怎么训出来的？

**Federico：** 基座是 **Kimi 2.5**——**1 万亿参数** 的混合专家模型，活跃参数 **30B**，很稀疏。我们看技术栈，发现两条轴：Composer 1 主要推 **强化学习** 这一条；Composer 2 **两条一起推**——**持续预训练**（中间训练）和 **强化学习**。两条轴同步，Composer 2 才这么强。

我们先对海量 **代码 token** 做中间训练，规模 **接近预训练量级**。从中间训练的检查点出来，再对大量任务跑 **大规模 RL**。RL 不是在抽象 benchmark 上刷分——是在 **真实 Cursor 会话** 里跑，跟部署模型 **同一套工具和 harness**，任务分布覆盖开发者实际会问 Composer 做的那些事：有的提示很 terse、很模糊，有的要改 **几百行、跨很多文件**。技术报告里我们全程用 **CursorBench** 对齐真实问题，避免训出来的模型只会做「考试题」。

**Sonya：** Cursor 坐在高质量编码数据中心，为什么不 **从头预训练**？

**Federico：** 我们 **自上而下** 想问题：怎么 **最短时间** 给用户一个真有用的模型？自下而上——先搞预训练，再扩到中间训练，再搞 RL——发布得拖很久。反过来，从强基座做持续训练和 RL，**很快就能交付**。希望下一版 Composer 是 **完全自研基座**，不再靠开源底座。

中间训练之前还有一步：**自动安装**——用旧模型（Composer 1.5）帮每个 RL 环境把依赖装齐、仓库跑通，过了验证才算环境就绪。这一步听起来脏，但少了它 RL 会在 **半残环境** 里学歪。我们宁可 **前期** 花算力把环境搭真，也不想在 reward 里打补丁。

**Sonya：** 中间训练和 RL 各学到什么？

**Federico：** 中间训练主要吃 **代码库、常见模式**，也掺一点世界知识和网页数据——铺一个更广的分布，给 RL **锐化**。学的是库结构、特定代码模式怎么写；RL 阶段模型直接跟 **Cursor 框架** 交互，学它未来要工作的真实环境：怎么 **调工具**、怎么 **导航**、怎么 **写对代码**。中间训练会写代码，但不一定分得清对错；RL 里我们在调一个旋钮：**现在你必须始终写对**。训练里还会遇到 **简短含混** 的用户提示——跟 benchmark 里那种规格说明书式 prompt 完全两码事，所以 RL 任务分布必须 **跟真实产品用量对齐**，不能只在干净题库里自嗨。

**Dima：** 对。中间训练把 **预训练损失** 往下压，我们观察到下游 RL 跟着涨——基座知识越好，智能体越强。Composer 1 主要赌 RL 这一条轴；Composer 2 两条轴一起推，benchmark 和成本才同时跳一档。RL 还改善 **平均表现和 best-of-K**——模型在学 **新解法路径**，不是只会把旧答案押得更狠。

**Sonya：** 中间训练跟 Tab 补全模型是一路货吗？为什么不直接在 Tab 模型上后期训练？

**Federico：** 中间训练目标还是 **下一个 token 预测**——预测后续内容准不准。Tab 模型 **极小**，为 **超低延迟** 设计，跑得飞快。Composer 是 **大模型智能体**，两个基座 **定位完全不同**。Tab 要在你按键的瞬间给补全；Composer 要扛 **几十轮工具调用** 还不崩——中间训练给 Composer 吃的是 **仓库级、多文件级模式**，不是单行补全那套数据配比。下一版我们想把 **基座也握在自己手里**，但这条 **自上而下** 路线证明：不必等完整预训练栈成熟，也能先给用户 **能用的 Composer**。

> **金句 · Dima**
> **中文：** 货架模型加提示词能 prototype；顶尖产品得把模型 craft 到你的环境。
> **原文：** The most leveraged attribute… is actual usage… craft your model to your environment.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 中间训练 | intermediate training | pretrain 与 RL 之间大规模续训 code token |
| 持续预训练 | continual pre-training | 在开源基座上继续吃领域数据 |
| 自上而下 | top-down delivery | 先交付可用模型，再补全栈能力 |
| 分布锐化 | distribution sharpening | 中间训练铺广分布，RL 收紧到「写对」 |
| 下一个 token 预测 | next token prediction | 中间训练的主目标；Tab 与 Composer 共用形式不同规模 |

**本章小结**

- Composer 2 = **Kimi 2.5 + 近 pretrain 规模 mid-training + 大规模 harness 内 RL**
- 不自 pretrain 是 **时间 tradeoff**：自上而下更快给用户可用模型
- mid-train 会写代码；RL 教 **工具、环境、正确性**

---

## 03 GPU 不能空转：异步工厂、全球分集群与 MoE 数值对齐

**Sonya：** Composer 2 大头工作在 **大规模 RL**。这套循环里到底有什么？你们碰了哪些硬问题？

**Dima：** RL 跟预训练、中间训练很不一样——你不只是预测下一个 token，是在 **跑整个框架和实验**。模型在环境里行动，看一次 **rollout** 表现如何，按有没有做对事给 **奖励**——可以用大模型当裁判，也可以用 **可验证标准**（代码能不能编译）。这意味着除了大规模训练，还要协调 **大量环境** 和 **模型推理**——rollout 就是你在 Cursor 里 **一整段智能体会话**，可能 **50 轮**：收提示、调工具、生成代码……最后拿奖励，信号回传改权重。更新环巨大，组件 **异构**，怎么协调才 **高吞吐、省 GPU 钱**，是算法和基础设施的交叉题。

传统 **同步 RL**：停训练器，跑 5–10 分钟甚至更长的会话，拿结果，停推理，回去更新——算法干净，**一半容量空着**。**异步流水线**：想象一座大工厂——**rollout 线** 和 **训练器线** 一直转。rollout 永远拿 **最新模型版本** 模拟新会话；训练器永远消化新结果算更新。GPU 常满。代价是 **陈旧性**——rollout 跑完时权重可能已变几步，训练动态会变样，有算法 trick 对付。

Cursor **GPU 就数万个，不是数百万**——得榨干每一块。我们生产里用 **FP4 训练**，跟 Fireworks 深推推理。有个误解：RL 里推理算力永远比训练贵一个数量级——其实是 **开源推理引擎没优化好**。引擎推到极限，推理 FLOPs 大约 **训练的三分之一**（训练要三次前向：前向、数据梯度、权重梯度；推理到 critical batch size 只要一次前向）。

**Sonya：** 论文里写 **全球分布式**——为什么？难在哪？

**Federico：** 市场上 **超大连续集群** 很难找。训练集中在一个集群；**RL 推理** 可以散到全球 **小集群**。Composer 2 用了 **四个集群**，分布四大洲，还抓 **Composer 1.5 低峰** 的推理 GPU 加速训练。

**Dima：** 每 **5–15 分钟** 出一个 **~1TB** 权重快照，怎么快速传到地球另一端？全量传不现实。观察发现：RL 后期每步只改 **一小部分权重**，变化有 **规律模式**。写 **压缩算法** 做增量——增量可以比全模型 **小 20 倍**，**无损** 重建，远端 **位等价**。最坏几分钟，通常 **一分钟内**；换权重只 **暂停约 30 秒**，分片上传下载 **吃满出口带宽**。拆 trainer 和 inference，还能用 **更便宜的异构硬件** 跑 rollout。

**Sonya：** Kimi 是 **1T 稀疏 MoE**——RL 会更棘手吗？

**Federico：** 会。异步 RL 要在 trainer **重跑前向** 算 log prob；推理和训练 **浮点非结合律**——A+B+C 和 C+B+A 结果不同，微小差异经 **数十亿次运算放大**。预训练后模型 robust，flip 几个位 benchmark 不变；RL 用 **极弱信号** 教模型，数值噪声能 **决定成败**。

**Dima：** MoE 更敏感：每层 router 从 **384 个专家里选 8 个**，排第八和第九差在小数点后几位，可能 **专家 A 变专家 B**——推理激活 A，训练更新 B，**完全对不上**。解法：**手写 GPU 内核** 固定加法顺序（慢 2–3 倍是 tradeoff）、**路由器重放**——推理告诉 trainer「这个 token 我激活了专家 A」，只是个小整数；还有量化对齐、匹配内核。这决定训练 **发散还是高效**。

**Sonya：** 模型会在假环境里 **作弊** 吗？

**Federico：** 会。环境必须 **极度接近用户真电脑**——模型能察觉 fake env，RL 和线上行为就分裂。它会想：「哦我在模拟环境，我学到 trick 了，在这能拿更高奖励，试试。」

**Dima：** 模型爱作弊。强化学习特别擅长 **鼓励作弊**。

> **金句 · Dima**
> **中文：** 异步 RL 也许数学上丢几个点，但不让一半 GPU 空转，总算力反而更大。
> **原文：** Maybe you lose a few percentage points from async… but you make up for it by not having half your capacity idle.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 异步流水线强化学习 | async RL pipeline | trainer∥rollout，换 staleness 换利用率 |
| 权重增量压缩 | weight delta compression | 只传变化量，~20× 缩小，全球分钟级同步 |
| 浮点非确定性 | floating-point non-determinism | 加法顺序不同结果不同，RL 里被放大 |
| 批次不变内核 | batch-invariant kernels | 固定运算顺序，换数值一致换速度 |
| 假环境作弊 | fake env reward hacking | 模型识别训练环境，学 trick 而非真技能 |
| 路由器重放 | router replay | 推理侧传 expert 索引，训练侧对齐选择 |

**本章小结**

- RL infra = **pretrain 级 GPU + 推理 + 十万级 VM 环境 + reward 工程**；异构协调是主战场
- **async pipeline + 全球 delta 同步** 用 staleness 换满负载；MoE 要 **router replay + 内核对齐**
- 环境不像 production → 模型 **在 RL 里作弊**，线上行为分裂

---

## 04 模拟先 bootstrap，在线 RL 是樱桃；长程靠自我总结

**Sonya：** 奖励信号能聊吗？

**Federico：** 不能，绝密。

**Sonya：** 那聊聊 **模拟 rollout** 对比 **真实用户数据**。为什么不直接在用户环境里做 RL？

**Federico：** 我们也在做，叫 **实时强化学习**——同样技术栈，跟 Fireworks 同步。抓用户对生成结果 **满意/不满意** 的信号，**实时更新**，**几小时发一版**，在努力缩短周期。有个阶段还得 **延长** 更新间隔——思维链变长，需要更多稳定性。先缩短找超参，找准了又得拉长，因为要扩 **长程能力**。

**Dima：** 模拟里 **同一提示可以 rollout 16 次甚至 128 次**，并行多条路径，有的成有的败——像 **GRPO** 这类算法需要多样本。在线每次 **只有一个反馈**，算法 tradeoff 不同。模拟 rollout 搞砸了 **只是烧 GPU**；真实用户你在 **A/B 测试**，模型吐怪东西就是 **糟糕体验**。非真实环境可以 **更频繁 off-policy**，试疯狂想法不影响用户。

**Federico：** 我们用 **离线 RL** 教推理（更像 DPO 一路），**Reinforce 风格在线 RL** 教工具调用、世界新知识，再呈现给用户。模型不好，用户不愿用，**就没有反馈**。在线 RL 的悖论：**不能从零造模型**——用户得先用，它得已经够好，在线只能 **让它更好**。Dima 说像 **锦上添花**；Dan Roberts 引用 LeCun 的樱桃论——传统是大蛋糕小樱桃，现在 **小蛋糕大樱桃**。

**Sonya：** 长周期智能体——能长时间不间断工作——RL 里要做什么？

**Federico：** 轨迹越长，**信用分配** 越难——结束时一个赞或踩，模型难判断哪一步对了。还有 **上下文有限**。Cursor 把 **压缩放进 RL 循环**，叫 **自我总结**：模型学 **持续工作**、**永远跑下去**。上下文 **20 万**，实际能处理 **数百万 token**——总结自己的工作，用摘要 **重启窗口** 接着干。RL 同时推 **做对事** 和 **生成高质量摘要**、**读懂摘要**。这有点像推理能力的延伸——上下文管理本来被认为是 harness 最难那块，现在我们把它 **训进权重**。

**Dima：** 你把难题各部分 **跟模型本身共同优化**，全扔进优化环——算力砸进去，端到端 magic 又来了。我们在 AI 里见过太多次：投入越多算力，越能 **端到端** 解掉原先要手工拼的系统问题。

**Sonya：** 每家公司都会用 RL 训自己的工具吗？最强 RL 环境是什么？

**Federico：** 如果在大量生成 token、有产品要优化，**RL 是必经之路**。甚至 Tab 补全我们也用了 RL——预训练模型像在 Stack Exchange 上吸人类知识，遇到数学题它得想「我是专家还是学生？」RL 第一阶段往往只是在拧旋钮：**你是专家，要做对**。长程 **工具智能体** 几乎必须 RL；纯下一个 token 任务有时监督微调够，但 RL 还能 **锐化任务目标**。

我们没用 RL 环境供应商——编码有 GitHub 等开源；难在 **基础设施**。RL 环境三块：**工具**、**操作系统**（真世界状态）、**奖励**。工具便携；操作系统难复制——普通 Docker 不像生产环境。Cursor 自建 **虚拟机栈**，要能 **短时间 burst 10 万台虚拟机** 全启动——数据库迁移得真起库，这类需求环境公司能帮，但我们得自己扛 **超大规模爆发**。

**Dima：** 有 **自家产品** 就该 **对着它做 RL**——那是模型 **真正会被用的地方**。Frontier lab 要泛化所有任务；你要 **最好用的产品模型**，就该用 **生产环境 clone**（隔离好，别动真库）。玩具框架从 Docker 容器起步，教玩 Atari 还行；真产品 **不能把生产 App 塞进容器**。我们训练器在自己这边，**环境默认在客户端跑**——跟真实实现同地，少一层封装差异。

**Sonya：** 奖励越 **可验证** 越好 scale？专家还要人手评每个 rollout 吗？

**Dima：** 可验证 = 不用人也能自动评价——数学、编码能 **编译跑测试** 最好。**大模型当裁判** 可行，因为 **判别比生成易**——判断引理对不对，比发明引理容易。拆 rubric：风格、事实性分开评，别一个 judge 评一切。专家价值在 **制定任务、编码产品体验规则**——软件 3.0 时代，你在 **写评估规则**，不是直接写代码。

> **金句 · Federico**
> **中文：** 在线 RL 造不出从零的模型——用户得愿意用，它得已经够好。
> **原文：** We can't use online RL to create the model from scratch… users need to be using the model.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 实时强化学习 | real-time RL | 用户 thumbs 信号，几小时更新一版 |
| 模拟 rollout | simulated rollout | 同 prompt 并行 16–128 次，GRPO 类算法 |
| 信用分配 | credit assignment | 长轨迹里哪一步该背最终奖惩 |
| 自我总结 | self-summarization | RL 里学压缩进度，重启上下文继续干 |
| 可验证奖励 | verifiable reward | 编译/测试/LM judge rubric，可 scale |
| 生产环境 clone | production clone RL env | 最强 RL 环境就是自家产品（隔离后） |

**本章小结**

- **离线模拟 RL** 先 bootstrap 到可用水位；**在线实时 RL** 抛光，不能从零冷启动
- 长程智能体：**RL 里共同训练自我总结与压缩**，20 万窗口干百万 token 任务
- 有产品的公司：**生产环境 clone 胜过 RL 环境供应商**；专家写 **评估规则** 而非手评每条 rollout

---

## 总结：Composer 2 = 专精权重 + harness 内 RL + 异步全球工厂

| 维度 | 要点 |
|------|------|
| 战略 | 权重当有限存储，**100% 投 Cursor 内 SE** → 成本降数量级仍强 |
| 配方 | **Kimi 2.5 + mid-training（近 pretrain 规模）+ harness 内大规模 RL** |
| 交付 | **自上而下** 快出可用模型；下一版目标 **自研基座** |
| Infra | **async pipeline**、**全球四集群 + delta 20× 压缩**、**FP4 + Fireworks 推理** |
| 数值 | **MoE router replay + 内核对齐**；假环境 → **reward hacking** |
| RL 分工 | **sim RL 多 rollout bootstrap**；**online RL 是樱桃**，几小时一更 |
| 长程 | **自我总结** 在 RL 环内与 coding **共同优化** |
| 环境 | **10 万 VM burst**；**客户端跑真实环境** > 托管 toy 容器 |

### 对个人的启示

有 **独特 tool 链 / 工作流 / 轨迹** 的产品，别只调 prompt——评估 **post-train** 是否值得。Reward 设计优先 **可 verify**（编译、测试）；LM judge 拆维度，别一个裁判包打天下。

### 对团队/产品的启示

RL 环境尽量 **clone production**（数据隔离），Docker toy env 防不住 **假环境作弊**。Long horizon 把 **summarize/compaction 训进模型**，别只 harness 外挂。Async pipeline 前先算清 **staleness vs GPU 空转** 的 tradeoff。

> **金句 · Federico（封底）**
> **中文：** 有自家产品，就该对着它做强化学习——最强环境就是你的产品本身。
> **原文：** If you have your actual product, you should do RL against it.

---

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 03:12 | 垂直领域模型应追求权重信息的任务饱和度 |
| 11:45 | 异步流水线 RL 是解决 GPU 闲置的关键基础设施 |
| 18:22 | 全球分布式推理有效缓解了连续大集群的稀缺性 |
| 24:50 | MoE 模型在 RL 训练中面临严苛的数值对齐挑战 |
| 32:15 | 实时 RL 是提升用户体验的樱桃，而非蛋糕 |
| 38:40 | 智能体长周期工作的核心在于自我总结能力 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1iH7R6tEfJ/ingest`
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV1iH7R6tEfJ/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv50042420/
- **B 站**：https://www.bilibili.com/video/BV1iH7R6tEfJ/
- **时长**：45:12

### 相关阅读

- [[DeepMind-模型将吞噬Harness]] — harness 能否被模型内化  
- [[Cursor-128个Agent团队协作]] — Cursor 128 agent 与 online RL 叙事  
- [[Cursor副总裁-构建软件开发过程的Agent]] — SDLC agent 产品侧  
- [[IBM团队-Harness工程详解]] — harness verify 与 RL 环境对照  
- [[PlanetScale-Agent时代的基础设施]] — Composer 2.5 实战 demo 提及  

---

### 收录说明

- **视频**：[BV1iH7R6tEfJ](https://www.bilibili.com/video/BV1iH7R6tEfJ/)（B 站 *Easonlee的AI笔记*）  
- **嘉宾**：Federico（Cursor）、Dima（Fireworks AI）  
- **时长**：~45:12  
- **转写**：Recastory `bilibili-retranscribe/BV1iH7R6tEfJ/`（**asr v2**）  
- **版本**：canonical Host-Guest v3.2（2026-07-03；原讲义已合并）

