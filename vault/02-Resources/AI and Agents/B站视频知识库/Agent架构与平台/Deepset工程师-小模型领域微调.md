---
title: "Deepset工程师：将小模型训练成特定领域大师"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_evaluation"]
created: "2026-07-07"
source: "https://www.bilibili.com/video/BV1D9ojBzEAd/"
description: "Deepset Stefano：可验证奖励 RL、Verifiers 环境工件、井字棋实战；SFT 热身→GRPO；大 Batch 与分层抽样稳训练。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Deepset工程师-小模型领域微调.md"
source_sha256: "53257f71218cee50b828b345377a95f42a9740767534af834f7398e8465cf208"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1D9ojBzEAd/"
column_url: "https://www.bilibili.com/read/cv48142642/"
host_name: "Moderator（AI Engineer）"
guest_name: "Stefano Fiorucci"
guest_title: "Deepset 工程师 · Haystack 开源框架"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1D9ojBzEAd/ingest"
speaker: "Stefano Fiorucci"
duration: "40:35"
saved: 2026-07-07
updated: 2026-07-07
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1D9ojBzEAd/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1D9ojBzEAd/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column 单人演讲 reframed"
speaker_confidence: high
concepts:
  - id: verifiable_reward_rl
    zh: 可验证奖励强化学习
    en: RL with verifiable rewards
    one_line: 对错可自动判定，模型靠试错超越人类示例
  - id: verifiers_framework
    zh: Verifiers 环境工件
    en: Verifiers RL environment framework
    one_line: 环境打包成 Python 包，专注任务与奖励
  - id: stratified_sampling_rl
    zh: 分层抽样稳训练
    en: stratified sampling for RL batches
    one_line: 每批平衡对手难度，防策略崩溃
  - id: sft_warmup_then_rl
    zh: SFT 热身再上 RL
    en: SFT warmup before RL
    one_line: 先教会格式，再 RL 推推理深度
author:
  - "[[Stefano Fiorucci]]"
---

# Deepset工程师：将小模型训练成特定领域大师

**Host：** Moderator（AI Engineer 现场）  
**Guest：** Stefano Fiorucci（Deepset · Haystack）  
**形态：** Host-Guest v3.2（专栏主源 · 技术演讲 reframed）  
**B 站：** [BV1D9ojBzEAd](https://www.bilibili.com/video/BV1D9ojBzEAd/) · **时长** ~41 min

---

## 开场

预训练+SFT 模仿人类分布，红利见顶。o1、DeepSeek R1 说明：**加训练/推理算力做 RL，模型能自己发现比示范更好的推理策略**。Stefano 用开源 **Verifiers** 把 RL 环境做成可分发工件，并把弱开源模型训成**井字棋大师**——小模型在可验证任务上可以碾压大模型。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 可验证奖励 | verifiable reward | 胜负/单元测试/数学答案等自动打分 |
| GRPO | GRPO | 群组相对策略优化，比 PPO 轻 |
| 轨迹 | rollout / trajectory | 一局交互的状态-动作-奖励序列 |
| 分层抽样 | stratified sampling | 每批固定难度配比 |
| 格式奖励 | format reward | 奖励遵守输出格式 |

---

## 01 预训练见顶：RL 是新扩展轴

**Moderator：** Ilya 在 NeurIPS 说旧范式到顶了——你怎么映射到 LLM？

**Stefano：** 三步：海量预训练→SFT 学指令→RL 对齐偏好。SFT 本质是**统计模仿**，被示例分布锁死。o1 博客强调：**RL 训练算力 + 测试时思考算力**持续涨，性能跟着涨。DeepSeek R1 用**可验证奖励的 RL**和 GRPO——任何结果能自动验证的任务（正确解、赢棋、工具调用成功）都能当训练信号。模型在预训练轨迹里探索，偏爱高奖励路径，**不再被人类示例质量上限卡住**。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 思维链 | chain-of-thought | 推理中间步骤 |
| 近端策略优化 | PPO | 经典 RL 对齐算法 |
| 环境 | RL environment | 模型交互的动态评分世界 |

**本章小结：** 可验证领域是 RL 甜点；SFT 是模仿，RL 是探索+筛选。

---

## 02 Verifiers：把环境当软件工件

**Moderator：** 环境碎片化怎么解？

**Stefano：** **Verifiers**（PrimeIntellect 开源）把环境做成可 `pip install` 的 Python 包：单轮、多轮、工具调用、MCP 连接都有基类。抽象模型服务层（OpenAI 兼容端点 + vLLM），异步并行轨迹，自带训练器，接 Prime RL、SkyRL 等。开发者只写**任务逻辑+奖励函数**。

单轮例：文本反转——解析 XML 标签、最长公共子序列算分。多轮例：数学题答完环境追问「你确定吗？」工具环境：模型调 Python 函数直到给出最终答案。

**本章小结：** 环境应像库一样版本化、共享；Environment Hub 对抗闭源环境市场锁死开源模型。

---

## 03 井字棋实战：对手难度与 Batch 是命门

**Moderator：** 为什么用井字棋？

**Stefano：** 状态空间小但**多轮动态**，小模型常连随机都打不过。v1：模型执 X、对手随机；无效走子直接判负——惩罚太重，学不到信号。改进：

- 随机/最优对手按概率混合，训练初期别让对手完美到永远见不到胜利
- 无效走子 **-0.1** 继续下，上限 8 轮
- **固定种子**：同棋盘位置对手响应一致，GRPO 比的是模型决策不是环境噪声
- **分层抽样**：每批 Batch 含平衡难度，防「这批全是超强对手」导致崩溃

**Moderator：** 训练参数踩过什么坑？

**Stefano：** **Batch Size 是关键**。低于 256 时模型从极少数对局学偏见，训练不稳定甚至崩溃。Batch 大则慢但稳。隐藏偏见例：Minimax 在同等分数时总选前三个位置——模型死记硬背模式，实战却不行。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 极大极小 | minimax | 最优对手算法 |
| 群组基线 | group baseline | GRPO 里与同起点多次 rollout 比 |
| 温度探索 | temperature for exploration | 略升温逼模型试新策略 |

**本章小结：** RL 环境设计=奖励塑形+对手课程+批次统计稳定；开始训练后别盯图表，去散散步。

---

## 04 SFT 热身 → RL：小模型击败教师

**Moderator：** 从哪起步？

**Stefano：** 评估 **LFM-2** 等指令小模型：格式差、无效走多。用 **GPT-5 mini** 生成 200 条合成对局（过滤输局）做 SFT 几分钟——格式几乎完美。再上 GRPO（Cispo），对手随机概率 20%–70%。结果：**对最优对手 85% 平局，整体胜过用作教师的 GPT-5 mini**。建议从**指令模型**转任务推理模型，别直接用冗长 CoT 预训练模型浪费 GPU。

> **金句 · Stefano**
> **中文：** 别只展示怎么玩——给模型一个能玩耍的空间，用奖励引导它。
> **原文：** Don't just show how to play — give it a space to play and guide it with rewards.

**本章小结：** 在家也能做：清晰奖励→环境→小专模在窄任务超封闭大模型。

---

## 总结

| 维度 | 要点 |
|------|------|
| 范式 | 可验证 RL 补 SFT 模仿上限 |
| 工具 | Verifiers 环境即工件 |
| 实战 | 井字棋：分层抽样+大 Batch+对手课程 |
| 路径 | SFT 格式热身 → GRPO 推能力 |
| 心态 | 训练慢，别过早改参 |

### 相关阅读

- [[前OpenAI研究员-持续学习瓶颈]] — RL 泛化与奖励难域
- [[Transformer作者-AI泛化与类人学习]] — 数据效率与后 Transformer
- [[MOC - Agent Theory and Design]]

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 04:15 | 预训练见顶，RL 新引擎 |
| 06:42 | 可验证奖励 |
| 09:50 | Verifiers 框架 |
| 18:30 | 井字棋分层抽样 |
| 28:15 | SFT 热身再上 RL |
| 32:40 | 大 Batch Size |

### ingest 路径

`Recastory/workspace/bilibili-retranscribe/BV1D9ojBzEAd/ingest/column_article.md`
