---
title: "YC 论文俱乐部：5 篇论文揭示 AI 研究趋势"
tags: ["ai_agent", "ai_evaluation", "video_transcript", "bilibili", "harness_engineering", "multi_agent"]
legacy_tags: ["ai_agent", "ai_evaluation", "video_transcript", "bilibili", "harness_engineering", "multi_agent"]
created: "2026-07-02"
source: "B站视频 - Easonlee的AI笔记"
description: "YC Paper Club 五讲：ESM3 蛋白质 scaling、LLM self-play RL、Stream RAG 语音 Agent、Lean 形式化验证、Channel AI RTS 式 agentic 编程；Host 论 memory、f−h、intelligence per sample。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/AI评估与研究/YC论文俱乐部-5篇论文揭示AI研究趋势.md"
source_sha256: "892d9581d6b74bbb3bd372345a9edee5a8607594f725e3cab883c83cda217532"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV14AjN6eEcg/"
uploader: "Easonlee的AI笔记"
saved: 2026-07-02
transcript_source: "Recastory/workspace/knowledge/B4-yc-paper-club/article.md"
material_tier: S
ingest_dir: "Recastory/workspace/knowledge/B4-yc-paper-club/ingest"
column_url: "https://www.bilibili.com/read/cv50624521/"
source_original_date: "2026-06-12"
author:
  - "[[François Chollet]]"
  - "[[Yasa Baig]]"
  - "[[Luke Bailey]]"
  - "[[Arnab Maiti]]"
  - "[[Robert George]]"
  - "[[Lukens Orthwein]]"
concepts:
  - id: bitter_lesson_biology
    zh: 生物学苦涩教训
    en: Bitter Lesson in biology
    one_line: 蛋白质 masked LM 靠 scale 胜手工 MSA，抗体设计已单序列 win
  - id: junk_task_trap
    zh: 垃圾题陷阱
    en: junk task trap
    one_line: 自博弈 reward「越难越好」→ 猜想者出恶心复杂题，求解者不提升
  - id: stream_rag
    zh: 流式检索增强
    en: Stream RAG
    one_line: 用户还在说时就触发检索，语音 latency 降约 1.5 秒
  - id: verified_intelligence
    zh: 验证智能
    en: verified intelligence
    one_line: Lean 等形式证明把「能生成」推向「能证明」
  - id: rts_agentic_coding
    zh: 即时战略式代理编程
    en: RTS agentic coding
    one_line: 并行 worktree、协调器派工、宏观默认微观按需
column_source: "Recastory/workspace/knowledge/B4-yc-paper-club/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
updated: 2026-07-03
---
# YC 论文俱乐部：Scale 还在赢，但垃圾题和 f−h 会先把路堵死

> 对谈：François Chaubard（Host）× Yasa Baig / Luke Bailey / Arnab Maiti / Robert George / Lukens Orthwein | 来源：YC Paper Club 线下分享 | B 站专栏 Easonlee 的 AI 笔记

---

## 开场：为什么现在聊这五篇

YC **Paper Club** 这期偏 applied——不是纯理论沙龙，是五篇论文加一场工程实践，每条线都能单独跟进。François 在论文讲之前先定了 club 的品味：memory 热了一年半，但他更押 **Office-Zero** 式无人类偏置，强烈怀疑 Noam Brown 那条「人类解空间 + 测试时计算 + 递归自改进」能推到接近通用智能。

今天四章：蛋白质上 **Bitter Lesson** 是否继续赢；**自博弈** 能不能突破人类演示数据天花板；语音 **流式检索** 和 **Lean 验证** 怎么把可靠性落地；Channel AI 怎么用 **即时战略** 式编排把 token 和 PR 产量打上去。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 苦涩教训 | Bitter Lesson | Sutton：通用方法 + 算力/数据扩展，终胜手工领域知识 |
| 扩展定律 | scaling laws | 算力/数据上去，性能可预测地涨，常是对数线性 |
| 掩码语言模型 | masked language model / MLM | 遮住一部分 token 再预测，BERT 那路子 |
| 多序列比对 | MSA | AlphaFold 用的进化「表亲」堆叠，手工归纳偏置 |
| 自博弈 | self-play | 模型自己出题又解题，理论上任务无限 |
| 流式检索增强 | Stream RAG | 用户还在说话时就跑检索，不等问完 |
| 形式化验证 | formal verification | 机器 100% 检查证明/规范，骗不过检查器 |
| 即时战略式编程 | RTS agentic coding | 像打魔兽：并行多线、宏观调度、允许犯错再纠 |
| 人类解天花板 | f−h | 在人类演示解上训练，锁在人类解的典型集合里 |
| 每样本智能 | intelligence per sample | 每多一个样本怎么学；ICL 非单调 vs 人脑单调变好 |

---

## 01 进化四十亿年的训练集，Bitter Lesson 在蛋白质上又赢了

**François：** 咱们 club 一直聊 scaling 和 **Office-Zero**——左边 AlphaGo 有人类棋谱偏置，右边 AlphaZero 不受人类漫无目的行为影响。生物学这边，Yasa 你刚发的 ESM 论文，是不是同一套剧本在蛋白质上重演？

**Yasa：** 差不多。在座大多机器学习背景，我尽量不讲深奥生物学。这篇 work 的高层问题就一句：**语言建模里推动 AI 进展的那套想法，最近怎么转到生物学上了？** 特别是蛋白质——规模是不是还是社区默认的「怎么做得更好」？

Richard Sutton 那篇 **苦涩教训** 大家都读过：过去七十年 AI，赢的往往是靠算力和数据扩展的通用方法，不是手工塞人类领域知识。AlphaGo 先被专家系统压着打，不成比例地堆算力之后指数级反超。知识系统起步快，大型「笨」模型长期赢。生物学现在也在赌同一模式。

论文问：扩展定律那套曲线——左边 NLP 里漂亮的对数线性——右边蛋白质会不会 **分布外**？我分享三个小故事。生物学知识就一句：蛋白质是 20 种氨基酸串成的链，序列唯一决定三维形状，形状决定它在细胞里干啥。训练 **ESMC**：数亿年进化序列当语料，大型 **掩码语言模型**，只给字符串，从不告诉结构先验。模型得自己从氨基酸共现里学「语法」——NLP 老话「通过环境认识词」，这里是通过环境认识蛋白质。

第一个问题：**扩展定律在蛋白质语境成立吗？** 无监督代理指标叫 **P@L**——预测序列上很远、空间里却接触的点。远程接触难， nearby 容易。ESM Cambrian 家族：3 亿、6 亿、60 亿参数，低算力 run 外推的计算最优曲线，跟真实大训练吻合得很干净。答案：**成立**，跟 LLM 一样的对数线性。

有个转折。上一代 **ESM2** 加参数收益递减，曲线平了；新 **ESMC** 绿线继续爬。解法不是花哨架构偏置，是 **数据扩展**——ESM2 约五千万序列，新模型加 **宏基因组** 到 **28 亿** 条，土壤、海洋、肠道里很多从未培养过的物种。进化这套训练数据跑了 **四十亿年**；人类文本才几十年量级。我们采样的蛋白质多样性不到已知总量 **1%**。这就是蛋白质版的「数据墙」对话——更多数据 justify 更多算力。

**François：** 那跟 AlphaFold 那种手工 **多序列比对** 比呢？苦涩教训说人为偏置该被淘汰。

**Yasa：** 第二个问题就在这。AlphaFold 很强， Nobel 级，但大量靠 MSA——找几百个进化表亲堆一起，共同变化模式编码结构信息。精妙的领域工程，在苦涩教训视角里终该让路。计算机视觉里 HOG 特征也是这么被干掉的。 **ESMFold** 直接扔 MSA：序列进模型，嵌入喂结构预测头，还能用循环层在 **推理时** 加计算，像扩散步骤或测试时采样。

结果狠。一般蛋白复合物，无 MSA 单序列 **ESMFold 2** 跟有 MSA 的 **AlphaFold 3** 差 **3 个百分点** 以内——几乎不用拐杖到同级。 **抗体设计** 更夸张：单序列 ESMFold 2 得分 **50**，AlphaFold 3 **47**，我们领先。抗体空间多样性大、结构采样变异小，手工特征在药物设计者真正要的地方常常乏力。标题不是说 MSA 死了——**只在数据丰富处还有用**。

第三个问题：模型到底学到了啥？稀疏自编码器那套，跟 Anthropic 在语言模型里做的一样。无监督填空预训练，潜在空间分解出清晰特征，对应真实生物学概念——从单个氨基酸到结构基序、结构域、功能位点。举个例子「亲核肘」催化基序，四种结构迥异、进化距离远的蛋白里都能识别——不是记相似序列，是抓深层 recurring pattern。他们用这个模型折叠分析规模到了 **70 亿** 蛋白级别，预测约 **10 亿** 结构，SAE 空间排成蛋白质「谷歌地图」，CRISPR Cas9 家族一眼能认。

**逆向设计** 也验证了：PD-L1 结合剂等免疫疗法靶点，纯序列空间设计治疗分子，湿实验过。数据规模没说服你，社会影响也该让你兴奋。软件生物学对 ML 人是极佳窗口——模型还年轻，测序数据每年指数涨，还没撞墙。现在是进场好时机。

> **金句 · Yasa**
> **中文：** 进化跑了四十亿年训练集；我们采样的多样性还不到 1%。
> **原文：** Evolution has been generating this training data for four billion years — we've sampled less than 1% of known diversity.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 远程接触精度 | P@L | 序列上远、空间里近的接触点对，无监督结构理解代理 |
| 宏基因组序列 | metagenomic sequences | 环境 DNA 测出来的蛋白序列，物种常未培养 |
| 单序列折叠 | single-sequence folding | 不做 MSA 比对，只靠模型表示预测三维结构 |
| 稀疏自编码器 | sparse autoencoder / SAE | 把模型激活拆成人类可解释的单语义特征方向 |
| 逆向设计 | inverse design | 在序列空间里设计有治疗效果的蛋白，再湿实验验 |

**本章小结**

- 蛋白质 masked LM 的 scaling 曲线与 NLP 同型；28 亿宏基因组序列破 ESM2 数据墙
- 单序列无 MSA 逼近 AlphaFold3，抗体设计已 win——Bitter Lesson 在 biology 大体成立
- SAE 可解释性 + 十亿级结构图谱 + 逆向药物设计，把 scale 接到真实社会影响

---

## 02 自博弈要能突破人类数据天花板，先得驯服垃圾题

**François：** Luke，你刚从英国回来，一直在 Tatsu 实验室做训练后 **自博弈**。post-training 的 RL 算力已经逼近预训练了——任务从哪来？人类演示的天花板怎么破？

**Luke：** 当前大语言模型训练栈就两块：网络文本预训练，然后越来越长的 **后期训练** 强化学习。DeepMind Gemini 技术报告里那张图很漂亮：海量 RL 任务，每个任务训练只看一次，x 轴每步都是新任务 + 新算力，左侧评估集、右侧编码基准，平滑往上爬。逻辑简单：**任务和算力一直加，模型一直强。** 问题是任务得人手收集，x 轴是对数刻度——瓶颈在这。愿景是模型超越人类能给的任何问题。

**自博弈** 的核心：模型双重角色——既 **生成** RL 任务，又 **求解**。训练两边都变好：更会出题，也更会在题里拿高奖励。围棋里 **对称自博弈**：旧版自己当对手，棋盘变环境。大语言模型里 **非对称自博弈** 兴起：**猜想者** 出整道题（比如 Lean 数学题加单元测试），**求解者** 进环境跑轨迹拿奖励。

为什么兴奋？原则上 **学习无上界**。人类演示有天花板；固定环境 RL 要么满分没法进步，要么太难零奖励；自博弈不断造带新学习信号的任务，理论上永无止境。围棋已超越人类还在涨。LLM 愿景：人类数据训到人类水平，再靠大规模自博弈远超人类。

现实打脸。跑久了 **平台期**，跟普通 RL 一样。基线算法极简：猜想者抽合成任务（跟求解者同模型不同帽子），求解者做对才更新；猜想者奖励是 **1 减解决率**——越难越好，让题停在能力前沿。听起来合理。

我们在约 **3000** 道 **Lean 4** 形式化数学题上测。Y 轴 solved 数量，普通 RL 基线渐近 **60%** 左右；标准自博弈，猜想者确实越来越强、不断出 frontier 题——**但求解者跟 baseline 一样，这些题完全没用。** 训练后期猜想者出的 Lean 结论，蓝色高亮那坨，极其复杂、冗余、混乱。奖励「刁题」的最省事路子：** messy、人为复杂、不优雅**——像给你三页高中微积分，你总会在某处算错，对数学能力零帮助，纯语法陷阱。

**François：** 那你们 **自引导自博弈** 怎么修？

**Luke：** 算法叫 **SGS**，两刀。第一，从 3000 道未解目标题出发，让猜想者生成 **相关** 合成题，分布锚在高质量原始题上。第二，加第三个角色 **引导者**：判断合成题跟目标是否真相关、复杂度是否适中。更新猜想者时用 **双重奖励**：挑战性 × **引导分数**。求解者仍按做对更新。

主结果：标准自博弈跟 RL baseline 几乎一条线；我们的 **SGS** 明显更好。**70 亿参数** 模型，投入 **八倍** 自博弈算力，在 Lean 4 级测试里达到约 **670 亿参数** 大模型 pass 水平——小模型用算力换能力，证明潜力。远没到 100%，路还长，博士学制也够长。核心教训：**reward 设计比堆算力要紧**； naive「越难越好」先养出一窝垃圾题生成器。

> **金句 · Luke**
> **中文：** 原则上学习无上界；实践中自博弈会先平台期——垃圾题会把路堵死。
> **原文：** In principle, nothing bounds learning… In practice, self-play plateaus when the conjecturer learns to produce messy, artificially complex problems.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 猜想者 / 求解者 | Conjecturer / Solver | 非对称自博弈：一个出题，一个做题，常是同模型两角色 |
| 垃圾题陷阱 | junk task trap | 奖励 Solver 做错 → 最优策略是出恶心复杂题 |
| 引导者 | Guider | 第三角色，判合成题是否相关且复杂度适中 |
| 自引导自博弈 | Self-Guided Self-Play / SGS | ground 于未解 Lean 题 + 引导分数过滤垃圾分布 |
| 后期训练 | post-training | 预训练后的 RL / 对齐阶段，算力已逼近预训练 |

**本章小结**

- Post-training RL 任务人手收集不可持续；自博弈理论上可无限造 frontier task
- Vanilla reward 学成 junk generator，Solver 与 baseline 一样——题分布无用
- SGS + 引导者：7B 八倍 compute 换约 67B pass@，仍 plateau；reward 设计是核心

---

## 03 语音不能等说完，验证才是下一代可靠智能

**François：** 一条线打 production——Arnab 你在 Giga 做语音 Agent，Stream RAG 解决啥痛点？另一条 Robert 你讲 Lean——跟 Luke 那堆 junk Lean 语句对照，验证智能长什么样？

**Arnab：** 语音 AI 初创公司起来一大片，用户期望流畅对话：问天气，答 22 度，再追问。幻觉在 **听** 的时候比 **读** 难抓——你很难像扫文本那样主动纠错。经典 **检索增强生成** 等用户 **问完** 再 retrieve，延迟 **5 到 15 秒** 才回，不像对话。

论文 framing 聪明：**用户还在说时就开始跑 RAG。** 例句——「嘿，今天天气怎么样？我想决定要不要出门」——核心检索需求在第一半，后半不影响检索。问题变成：**partial speech 何时足够触发检索？**

两种思路。**固定间隔流式 RAG**：音频分块，每块到就触发；挑战是考虑哪一块——不能等到最后，也不能盲目每块全 pipeline。可以先跑 RAG 管道里快的部分，看中间查询的 top 文档跟「假设完整句」是否匹配，匹配就提前跑完。**学习型触发器**：微调模型判断当前块是否已含关键新信息，避免每块浪费算力。后训练里用部分口语问题生成伪查询，双路 retrieve，比 retrieval quality 决定停或继续。

结果（一年前较小开源模型）：合成音频 latency **减 0.5 秒**，真人口语 **减近 1.5 秒**，准确率跟问完再检索 **持平**。我要强调的不是某一种 fixed-interval 技巧——**问题 framing** 比具体 block 策略重要：哪个点停、确认这块相关，是活跃研究空间，解决一点 production 收益巨大。

**Robert：** Luke 的 Lean 题展示 **形式语言** 如何界定「题」；我这边 Lean 是 **验证基础设施**。过去几周突破一串：OpenAI、DeepMind 在 IMO、埃尔德什问题上的进展，共同点是用 **形式化验证**。非形式化数学灵活，教授「显而易见」「恐吓证明」；**形式化世界你必须完全明确**，证明检查器 **骗不过去**。Lean 之前也有形式化数学，Lean 设计让它起飞：检查容易、可扩展。

证明器光谱：左边 SMT/自动定理证明器，人类 effort 低、表达有限；右边 **Lean**、Coq、Isabelle，依赖类型理论，表达强、写证明 effort 高。**Mathlib** 超 **一百万行** 高质量形式化数学。大语言模型 把写证明成本打下来，生态爆发：GPTF、MiniF2F、AlphaProof、DeepSeek-Prover、Harmonic……

三个 bubble 共享 **验证智能**：**(1) 数学** 最热闹；**(2) 程序验证**——Bug 万亿美元级产业，vibe coding 时代要 **有保证的代码**，Bridge、cslib 从「广泛编码」转向 **精确编码**；**(3) AI for 科学**——可重复性，输出能否 prove correct。

**TorchLean** 例子：在 Lean 里写神经网络，PyTorch 风格张量，能证 Flash Attention **等于** 标准 Attention，不用操心 IO 细节；还能证无位置编码时注意力 **置换不变**。Thinking Machine Lab 去年研究：即使推理温度设零，浮点误差也可能翻转 batch argmax——我在 TorchLean 里形式化整套系统，连小型 CUDA 内核都验。科学和代码未来都可以靠形式化验证保可靠——跟 Channel AI 那场 **token 最大化** 形成对照：一个拼命花 token 并行 push，一个拼命 **证正确**。

> **金句 · Robert**
> **中文：** 证明检查器骗不过去——敷衍不了，必须百分之百确定。
> **原文：** You cannot fool the proof checker — you have to be one hundred percent sure.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 部分查询充分性 | partial query sufficiency | 用户还没说完，当前片段是否已够触发检索 |
| 检索增强生成 | retrieval-augmented generation / RAG | 先检索再生成，减幻觉 |
| 交互式定理证明器 | interactive theorem prover / ITP | Lean 这类：人写策略，机器逐步检查 |
| 程序验证 | program verification | 规范 + 代码 + 证明三者：代码满足人类意图 |
| 验证智能 | verified intelligence | 从「能生成」到「能形式证明正确」 |

**本章小结**

- Voice Agent 关键 framing：partial speech 何时够触发 RAG；latency 可降 0.5–1.5s 而 accuracy 持平
- Lean 把数学/代码/科学推向可机器检查；与 junk Lean 题对照，形式语言既可以是陷阱也可以是基础设施
- Production 收益在「小问题」：检索触发时机、证明检查——比 naive scale 更贴地

---

## 04 写代码像打 RTS，知识库是比代码更便宜的真相

**François：** 最后 Luke Orthwein——Channel AI 跟 Lean 那条 **证正确** 路线唱反调。你说 agentic 编程该像 **即时战略**，不像国际象棋？

**Lukens：** Channel AI 做消费娱乐 AI，目标是端到端纯 AI 系统让人付费并保持参与——我们在 software 和 **内容** 开发上尽可能自动化。很多「好编程」的旧假设，现在 **反过来** 才对。

**国际象棋 vs 即时战略**：旧编程线性、一次设计做对、单线程周到；用 **代理** 系统像打 **魔兽/星际**——经济、生产、侦察、战斗同时跑，地图逐步揭开，没有单维完美，要 **持续纠偏**。高水平 RTS 没有哪一条线完美就能赢，你得同时平衡很多事。

工程栈我们这么搭：**Git 工作树** 多仓库并行，互不干扰编译；**协调代理**（Claude 或 Codex）最少按键，从「有个想法要修」跳到「工人开工」——像地图上点单位指目标，晚点再回来微调；**工人代理** 尽量推到底出 PR 和总结， **错也行** 你后面改，用 token 换人的时间。可移植性关键：本地卡住 → 带回家隔夜跑 → 换机器加内存，TMUX 会话整包迁。

**代码不是代理的便宜真相来源**——结构化、链接化的 **知识库** 文件便宜得多。这场 PPT 我就这么做的：François 丢主题 → Claude 读 KB 里我们怎么做事 → 迭代十五次 → **全部反馈回 KB** 让它学纠正。链接文档 LLM 处理更快，业务知识也能编码进去；Claude 和 Codex 足够懂业务时，非常擅长 **自动提功能建议**。

原则几条：**默认宏观，关键时微观**——只微操单个单位赢不了，得持续 **造兵** 推小任务；**满意化** 就够，不必完美，搞砸了改很便宜；Claude 估工期永远按人类两周来——告诉它别信自己的 timeline。**高可见性**：多代理流不藏进度，像 RTS 小地图一点跳转；我个人把 TMUX 会话映射成魔兽/星际单位音效，「基地受攻击」那种 **音频提示** 省得盯屏。**APM 追踪** 统计的是 **工具调用/分钟**，不是点击次数——APM 低说明没在满负荷花 token。

并行跑很多事，同一代理或多代理，复杂任务常比你自己做更好——别让 Claude token 闲置，那是极低效经济。我们工程师每月 PR **3.5 倍** 于 adopt 前；全员推广这套 RTS 工作法后上个月又 **+60%**——人没突然变聪明，是学会了像职业 RTS 选手那样调度。

> **金句 · Lukens**
> **中文：** 用代理写代码，体感就是打即时战略——默认宏观，关键时刻再微操。
> **原文：** Coding with agents feels exactly like playing real-time strategy games — macro by default, micro when it counts.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Git 工作树 | Git worktree | 同一 repo 多目录并行开发，互不干扰编译 |
| 协调代理 | orchestrator agent | 派工、跟状态，最少 keystroke 从 idea 到开工 |
| 每分钟操作数 | APM / actions per minute | 这里指代理 tool calls/min，衡量并行调度强度 |
| 知识库驱动 | KB-driven agents | 链接 markdown/wiki 作便宜 context，优于扫全库 code |
| 满意化 | satisficing | 够好就 push，不必完美，错了再改 |

**本章小结**

- Agentic 编程像 RTS 不是 chess：worktree 并行、协调器派工、工人 satisficing push
- KB 比 code 作 context 便宜；演示/PR 反馈回写 KB，形成 compound 优势
- Channel AI：3.5× PR/engineer/month，RTS 工作法再 +60% MoM；与 Lean 验证路线形成 product vs proof 对照

---

## 总结：Scale 与 Verification 并行，但别 naive scale

| 维度 | 要点 |
|------|------|
| Bitter Lesson | 蛋白质 masked LM + 28 亿序列，scaling 曲线与 NLP 同型；抗体设计单序列已 win |
| Self-play | 理论上无上界，vanilla reward 先养 junk task；SGS + 引导者，7B 八倍 compute ≈ 67B pass@ |
| Voice / RAG | partial speech 何时够触发检索，比 fixed block 策略重要；latency −0.5~1.5s |
| Verified intelligence | Lean 证 Flash Attention、浮点非确定性；math / code / science 三 bubble |
| Agentic 工程 | RTS 并行 + KB 驱动；3.5× PR 再 +60%；与 token maxxing 对照 Friends 的 f−h 怀疑 |
| Host 开放题 | memory 热但 ICL 非单调撞 context cliff；每样本智能、每瓦特智能仍无定论 |

### 对做 research 的人

- Bio-AI 窗口：宏基因组数据指数涨，ML 背景转 biology leverage 高
- Self-play 别 naive「越难越好」——必须 ground + quality judge，否则 junk 分布
- Voice 先 framing「何时够检索」，再调 block 间隔；Lean 从小证明/Marklib 试点 verifiable coding

### 对做 product / 团队的人

- Voice Agent 延迟是体验生死线；Stream RAG 类 partial trigger 值得投入
- Agentic 团队当 RTS 打：worktree、协调器、工人 push、音频/可见性降监控成本
- KB 投资 > 注释堆砌；presentation 和 PR 纠正 **回写 KB**

### 仍待验证

- Friends 的 **f−h** 辩论：human demonstration + test-time compute 能否采样 F−H 空间
- Self-play SGS 能否突破当前 plateau 到接近 100% Lean pass
- KB-driven 功能建议在 Channel AI 外是否可复现 3.5× / +60% 量级

> **金句 · François（封底）**
> **中文：** 在人类解上训练，你会被困在某个人类解的典型集合里——Office-Zero 才是我更押的路。
> **原文：** Full solutions based on training on human solutions will limit you to some typical set — AlphaZero without human mandering is the path I bet on.

---

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 07:20 | 蛋白质研究正经历 AI 的苦涩教训 |
| 23:45 | 自博弈是突破人类数据瓶颈的关键 |
| 33:10 | 语音交互需要流式 RAG解决延迟痛点 |
| 38:50 | 形式化验证开启零 Bug代码与科学发现时代 |
| 43:15 | 像玩 RTS 游戏一样进行 AI 辅助编程 |
| 45:30 | 知识库是 Agent 廉价且高效的真相来源 |

### 素材路径

- **ingest**：`Recastory/workspace/knowledge/B4-yc-paper-club/ingest`
- **ASR**：`Recastory/workspace/knowledge/B4-yc-paper-club/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv50624521/
- **B 站**：https://www.bilibili.com/video/BV14AjN6eEcg/

### 相关阅读

- [[OpenAI评估团队-不再低估模型]] — eval、湿实验与 capability 测量
- [[Snorkel-小模型RL超越大模型]] — 小模型 RL beat 大模型；与 self-play 7B beat 67B 同脉
- [[DeepMind团队-当数百万Agent相遇]] — multi-agent scaling 与协调
- [[Cursor-128个Agent团队协作]] — 大规模并行 agent 工程
- [[IBM团队-Harness工程详解]] — harness 可靠性；RTS orchestration 是 harness 操作层
- [[Loop-Agent Loop到底是什么]] — agent loop 与 self-play / 长 horizon RL 对照
- [[MOC - Agent Theory and Design]] — 主题 MOC 入口

---

### 收录说明

- **视频**：[BV14AjN6oEcg](https://www.bilibili.com/video/BV14AjN6oEcg/)（B 站转载 YC Paper Club）
- **活动**：Friends 主持；Yash Big / Luke / Arnab Mitty / Ruben George / Luc Warthine
- **转写**：Recastory `B4-yc-paper-club/article.md`（英文 ASR，收录时已人工整理叙事）
- **版本**：canonical Host-Guest v3.2（2026-07-03；原讲义已合并）

