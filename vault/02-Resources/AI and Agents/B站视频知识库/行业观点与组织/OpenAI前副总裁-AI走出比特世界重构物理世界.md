---
title: "OpenAI前副总裁：AI走出比特世界 重构物理世界"
tags: ["ai_agent", "openai", "ai_philosophy", "bilibili"]
legacy_tags: ["ai_agent", "openai", "ai_philosophy", "bilibili"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV1zKDbBzEeT/"
description: "Liam Fedus × No Priors：物理学家涌入 AI、ChatGPT 通用界面赌注、物理世界数据闭环、编排层+原子专业模型、半导体/农业式加速、智能非标量与递归自我改进的领域墙。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/OpenAI前副总裁-AI走出比特世界重构物理世界.md"
source_sha256: "ee0514d041fc7aaf6a20ba8d55fcb0000d40e4242a4053b8d3443fefdb44ccec"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1zKDbBzEeT/"
column_url: "https://www.bilibili.com/read/cv47657441/"
host_name: "Elad Gil"
guest_name: "Liam Fedus"
guest_title: "ChatGPT 共同创造者、前 OpenAI 后训练副总裁、Periodic Labs 创始人"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1zKDbBzEeT/ingest"
speaker: "Elad Gil / Liam Fedus"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1zKDbBzEeT/article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1zKDbBzEeT/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article（S 级专栏图稿，Host/Guest 已标注）"
speaker_confidence: high
uploader: Easonlee的AI笔记
author:
  - "[[Liam Fedus]]"
concepts:
  - id: experimental_closed_loop
    zh: 实验闭环
    en: experimental closed loop
    one_line: 主动学习产生可验证原子级数据，而非静态堆文献
  - id: orchestration_layer
    zh: 编排层
    en: orchestration layer
    one_line: 用语言模型读文献、调实验，底层接对称性感知的原子网络
  - id: scaling_laws
    zh: 扩展定律
    en: scaling laws
    one_line: 算力/数据/参数规模与性能的可预测关系，驱动工业级投入
  - id: recursive_self_improvement
    zh: 递归自我改进
    en: recursive self-improvement
    one_line: 系统在可验证环境里自己改自己；软件快，湿实验慢
  - id: intelligence_not_scalar
    zh: 智能非标量
    en: intelligence is not a scalar
    one_line: 某域天才、邻域高中生——能力呈尖锐分布而非一条数轴
---

# OpenAI前副总裁：AI走出比特世界 重构物理世界

**Host：** Elad Gil（No Priors · 投资人 / 创业者）  
**Guest：** Liam Fedus（ChatGPT 共同创造者、前 OpenAI 后训练副总裁、Periodic Labs 创始人）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `BV1zKDbBzEeT/ingest/column_article.md`  
**B 站：** [BV1zKDbBzEeT](https://www.bilibili.com/video/BV1zKDbBzEeT/) · **专栏：** [cv47657441](https://www.bilibili.com/read/cv47657441/)

---

## 开场

Elad Gil 把 Liam Fedus 请进 No Priors 时，话题已经从比特世界切到原子：Fedus 离开 OpenAI 后办 Periodic Labs，要给「原子」建一座 AI 基础实验室——材料、化学、先进制造，全在射程里。

Fedus 的身份叠了三层：大学做暗物质、Google Brain 跟过 Transformer 和稀疏 MoE 那一代、OpenAI 把 GPT-4 产品化成 ChatGPT。他现在的判断很硬：**AI 不接到物理世界，科学就不会像软件那样加速。** 互联网语料能教常识，教不了精确的材料常数；文献里的数值跨好几个数量级，噪声大得没法当训练集。Periodic 的路是 **实验闭环**：自己跑实验、自己验、自己决定下一枪打哪。

这场对谈六条线：**物理学家为何扎堆 AI** → **ChatGPT 通用界面赌注** → **真实世界数据缺口** → **编排层 + 原子专业模型** → **半导体/农业式生产力跃迁** → **智能非标量与递归自我改进的墙**。和 [[DeepMind团队-AI评估规划化与民主化]] 里「评估要接真实任务、不能只看榜单」同频——一个讲民主化评测，一个讲民主化 **做实验**；跟 [[MOC - AI 时代个人发展与组织]] 里「比特岗位爆炸、原子岗位短缺」也是同一张地图的两面。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 扩展定律 | scaling laws | 堆算力、数据、参数，性能怎么涨——可预测，敢砸钱 |
| 实验闭环 | experimental closed loop | 做实验→看异常→设计下一批；不是把论文下下来就完 |
| 编排层 | orchestration layer | 大模型当副驾驶：读文献、排流程、叫下面的专业模型 |
| 替代模型 | surrogate model | 用神经网络近似物理模拟，快但要对齐真实验 |
| 测试时推理 | test-time compute / reasoning | 推理阶段多算几步，纠错、调工具更稳 |
| 递归自我改进 | recursive self-improvement | 系统在自己能验的环境里改自己；软件快，湿实验慢 |
| 智能非标量 | intelligence is not a scalar | 不是「智商 180」一条线；某域天才、邻域可能很菜 |
| 主动学习 | active learning | 模型挑最有信息量的实验先做，省样本 |

---

## 01 物理学家涌入 AI：第一性原理是扩展定律的底牌

**Elad：** 达里奥、Adam Brown、你以前的老板 John Schulman——AI 圈怎么这么多物理出身？弦论、黑洞那帮人也在转，像换了一种「曼哈顿计划」，只不过追的是智能。你怎么看？

**Liam：** 物理学教你怎么 **从第一性原理想问题**。要当严谨科学家，细节不能糊。计算机科学和 AI 现在影响力这么大，高能物理那边希格斯发现之后，下一档加速器遥遥无期——很多人审视自己的技能，看别的领域在发生什么，然后想：我在这儿也能有大贡献。

我本科就是物理，花很多时间做 **暗物质**。我们有过一台对暗物质运动 **方向敏感** 的设备，那段经历特别野。读研究生时我老往机器学习上靠，做粒子重建，其实是在找 ML 能落地的地方。后来我觉得，真想推 ML 前沿，得进 CS 圈，2016、2017 年去了 Google Brain，跟第一批 residency 重叠。

那是 Brain 的 **寒武纪**：分布式训练、专家混合、Transformer 都在那儿冒头。人不多，GPU 也不多，但协作紧，随机性大，多样性高——研究还没被一条流水线锁死。我在谷歌很多年做 **架构**，一直推 **稀疏性**，让大规模推理更省，模型能再往上长一截。2022 年末我对 **做产品** 上了头，跟几个同事去了 OpenAI。

**Elad：** 所以物理训练的不是公式，是 **尺度感**——万亿参数、复杂系统，跟高能物理那套「大装置、大协作」是同构的？

**Liam：** 可以这么讲。物理学习惯问：约束是什么、什么能测量、什么不能。AI 扩展定律给的是另一种 **可预测性**——你知道加算力、加数据，性能会往哪走。这让工业级投入有了理由。Brain 早期是几个人几块卡；现在是成百上千研究员对着百万级 GPU。材料科学、物理工程，Fedus 认为也会走同一条路——前提是你得把 AI **插进实验室**，不是只在 Slack 里聊。

**Elad：** 暗物质那套「方向敏感」，跟现在做材料表征有没有回声？

**Liam：** 有。做科学就是跟 **信号和噪声** 搏斗。暗物质信号极弱，材料文献里的常数也弱——弱到跨数量级。物理出身的人不怕「数据很脏但结构里有信息」，怕的是 **没有闭环**。Brain 时代我们改架构；Periodic 时代我们改 **实验吞吐量**。思维习惯是同一挂的。

> **金句 · Liam Fedus**
> **中文：** 物理学教的是第一性原理和尺度感；扩展定律让 AI 像大科学装置一样可预测地砸资源。
> **原文：** Physics trains you to think from first principles; scaling laws give AI the predictability that lets you invest at industrial scale—much like pushing the next energy frontier in high-energy physics.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 第一性原理 | first principles | 从基本约束推，不靠类比糊弄 |
| 稀疏性 | sparsity | 模型里大量参数不参与每次计算，推理更省 |
| 专家混合 | mixture of experts (MoE) | 不同子网络分管不同任务，扩容量不线性涨算力 |
| 扩展定律 | scaling laws | 规模上去，性能怎么涨——经验规律，敢规划 |

**本章小结**

- 物理背景扎堆 AI，不只因「数学好」，更因 **严谨 + 尺度 + 大协作** 的训练。
- Brain 寒武纪的 **架构创新**（Transformer、MoE、稀疏）与 Periodic 的 **实验创新** 是同一类「推前沿」冲动。
- 扩展定律是 **资本可进入** 的理由——材料科学若也有闭环数据，会复制 LLM 的工业化曲线。

---

## 02 从 Brain 到 OpenAI：ChatGPT 是通用界面的产品赌注

**Elad：** 你在 OpenAI 具体干什么？GPT-4 已经预训练完了，怎么变成产品？

**Liam：** 目标是 **产品化 GPT-4**。预训练和一轮 RLHF 后训练都完成了，剩下是：这玩意儿怎么交到人手里？我们 brainstorm 过 **写作机器人**、**编码机器人**——很自然。最没劲的是 **会议机器人**：坐 Google Meet 里记笔记、发待办。John Schulman 很有主见：**保持通用，做聊天机器人。** 接下来几个月，全团队围着这个转。

**Elad：** 当时内部有没有「必须垂直切一块」的压力？

**Liam：** 有。写作、编码都是显学。但 John 的判断是：**通用对话界面** 才是释放模型能力的最佳载体。事后看，他对了。ChatGPT 2022 年末出来，公众认知整个翻页——之前圈内人知道很强，外面的人觉得还远；一夜之间 **触手可及**。

我深度参与了 ChatGPT 那条线。OpenAI 的后训练 VP，就是把 **极强大的预训练模型** 打磨成 **每天被几亿人用的产品**。这不是小修小补，是 **界面哲学**：别过早把模型锁进一个 workflow，让人用自然语言 **编排** 任务。John 自己也是物理出身，他的「通用性」跟物理里「少假设、多测量」是一脉的。

**Elad：** 这跟 Periodic 有什么关系？听起来像两个星球。

**Liam：** **同一逻辑。** 材料实验室里，科学家也要 **用自然语言** 问系统：文献里这个常数靠谱吗？下一组实验该扫哪个化学空间？通用聊天界面不是 consumer gimmick，是 **编排复杂物理流程** 的入口。ChatGPT 证明了 **对话即产品**；Periodic 要证明 **对话即实验台**。

**Elad：** 如果当时选了会议机器人，会怎样？

**Liam：** 可能会做出一个不错的 SaaS，但 **不会** 把「AI 能干什么」这个公共心智打开。通用界面让 **能力发现** 发生在用户侧——人自己摸索边界。垂直工具把边界 **写死在 PRD 里**。对 GPT-4 那种 general capability，后者是浪费。

> **金句 · Liam Fedus**
> **中文：** John 坚持通用聊天机器人——通用对话界面才是释放模型能力的最佳载体。
> **原文：** John Schulman was adamant: stay general, build a chatbot—the universal conversational interface is the best carrier to unlock what the model can do.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 后训练 | post-training | 预训练之后：对齐、产品化、RLHF 等 |
| 强化学习人类反馈 | RLHF | 用人偏好微调模型，让它更像「助手」 |
| 通用界面 | universal interface | 不绑单一场景，用户用对话探索能力 |
| 产品化 | productization | 从实验室 checkpoint 到可日常使用的服务 |

**本章小结**

- GPT-4 产品化的核心分歧：**垂直 workflow vs 通用 chat**——后者赢下公众心智。
- ChatGPT 是 **界面赌注**，不是「模型已经够好所以随便包一层」；后训练 VP 的工作是把能力 **交给对话**。
- 材料科学复制同一逻辑：**自然语言编排实验**，而非一堆互不相通的专用 GUI。

---

## 03 互联网喂不饱原子：实验闭环才是真数据

**Elad：** 语言模型吃互联网；物理世界 **没这份便宜数据**。Periodic 怎么建数据？要跑多少次实验？多样性怎么定？

**Liam：** 2022 年末的 AI **做不了** Periodic 现在在做的事——不是一点都做不了，是 **不可靠**：推理弱、工具弱、纠错弱。ChatGPT 是突破，但 **物理任务** 仍太软。接下来几年，推理、**测试时推理**、编码智能体起来，才把「AI 接物理世界」变成工程题。

机器学习的老话：**在训练数据和任务上表现好。** AGI、ASI、递归自我改进（RSI）讲很多，系统再强，**碰不到原始数据** 也白搭。Periodic 两边都做：**物理模拟 + 真实验**。

我们 **开源和闭源模型都用**。改进编码？零投入——**Claude 写代码** 已经让公司快一截。ML 精力全砸在 **前沿模型还不够好** 的地方：化学空间、材料常数、实验设计。

**Elad：** 先验从哪来？论文、互联网够吗？

**Liam：** 我们吃到了开源模型里 **数万亿 token** 训练出来的 **世界先验**——不用从随机初始化重造「懂英语、懂代码」的系统。一进 **具体发现**（比如某个化学子空间），**样本效率极高**——不是白纸，是 strong prior 上微调。

但文献数值 **很坑**。同事从论文里抽材料特性，报告值 **跨多个数量级**。你拿这个训 ML，最好情况 **拟合这个烂分布**，离真值更近？不会。**实验数据** 给的是 **锚**。

更要命的是：数据不能是 **静态池**。得是 **交互闭环**——拿到实验结果，找异常、找模式，跟模拟和文献对照，再推 **下一组实验**。主动学习。不是「下载 10 万条 CSV 开训」，是 **实验室当数据引擎**。

**Elad：** AlphaFold 靠几十年蛋白质结构库；材料是不是每个子领域都要从零攒？

**Liam：** 内部看，**数据-rich 的子域** 进展最快、加速最明显。泛化要分层：强 **量子力学** 支配的系统，模拟准了，对流体力学那种抽象层 **帮助有限**——泛化在 **第一性原理层** 挺好，跨抽象层会断。你可以做合成基本步骤、范德华、原子相互作用——但别幻想一个模型通吃所有材料问题。

**Elad：** 需要多少数据点？有没有规模律？

**Liam：** 没有「互联网级 token 数」那种简单答案。闭环里 **每个点都贵**，所以靠 **主动学习 + 高先验** 压样本量。关键是 **多样性**：不是均匀撒，是 **在不确定性高的地方打**。**可验证** 比 **多** 更重要——一条烂数据不如没有。

> **金句 · Liam Fedus**
> **中文：** 文献常数跨数量级；实验闭环不是堆数据，是主动找下一枪该打哪。
> **原文：** Reported values span orders of magnitude; the closed loop isn't a static pool—it's an active cycle that tells you where to experiment next.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 样本效率 | sample efficiency | 同样实验次数，学到更多——靠先验和主动学习 |
| 化学空间 | chemical space | 可能的分子/材料组合宇宙；不可能 brute-force |
| 主动学习 | active learning | 模型挑下一批最有信息量的实验 |
| 先验 | prior | 模型进 lab 前已经「懂世界」——来自 LLM 预训练 |

**本章小结**

- 互联网语料给 **常识**；原子级决策要 **可验证实验数据**，文献只能当弱信号。
- Periodic 策略：**LLM 先验 + 高样本效率 + 闭环**——不做从零造「懂材料」的 GPT。
- AlphaFold 式 **单一大数据集** 在材料里不通用；**分域闭环 + 第一性原理层泛化** 更现实。

---

## 04 编排层调专业模型：不搞一个模型通吃

**Elad：** 架构上 Periodic 有什么不一样？一个大模型端到端，还是混搭？

**Liam：** 语言模型 **非常强**，也是 **最自然的界面**。我们继续用，但角色是 **编排层**——副驾驶，也是 **指导实验的系统**。它 **编排专业模型**：我们为 **原子系统** 训的神经网络，**对称性感知**、**低延迟**、针对任务微调。

想象成整体：**编排层** 读文献、翻实验数据、吃多模态；需要算力或精度时，**调用专业网络当工具或奖励函数**。不是「一个 Transformer 预测所有材料性质」，是 **系统**。

**Elad：** 这跟企业里「大模型 + 小模型 + 工具」是不是同一架构？

**Liam：** 对，客户支持、运维都在走类似路。Periodic 的差异在 **底层专业模型** 必须懂 **旋转对称、晶体群** 那类 inductive bias——通用 LLM 没有。延迟也要低：实验台不能等分钟级 token 流。

Transformer 作为 **通用序列引擎** 依然能打；我们 **没有** 抛弃它，是 **分层**。编码交给 Claude；原子交给 **专用 net**；中间 **LLM 当 conductor**。

**Elad：** 替代模型和真实验怎么对齐？

**Liam：** 替代模型快，用来 **筛** 和 **提议**；真实验 **校准** 和 **打脸**。编排层的工作之一，就是当模拟和实验 **不一致** 时，决定信谁、下一步补哪类数据。这是 **闭环** 的 brain，不是单次 inference。

**Elad：** 客户侧会看到什么？一个 chat 框后面接一堆机器人？

**Liam：** 科学家看到 **对话 + 记录平面**：问问题、下指令、看实验日志。Periodic 把自己当 **零号客户**——先改 **科学工作方式**，再外溢到先进制造。定位是 **智能层**：实验的记录与控制平面，加 **解决方案**，不是先卖一瓶新材料。

> **金句 · Liam Fedus**
> **中文：** 大模型当编排层，对称性原子网络当工具——语言推理和专业精度分开扛。
> **原文：** We use language models as an orchestration layer—they ingest literature and orchestrate specialized, symmetry-aware neural nets for atoms.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 对称性感知 | symmetry-aware | 网络结构尊重旋转、置换等物理对称，少浪费参数 |
| 奖励函数 | reward function | 强化学习里「好不好」的打分；也可挂专业模型输出 |
| 多模态 | multimodal | 文本、谱图、显微图像等一起进系统 |
| 控制平面 | control plane | 实验记录、调度、权限——像 K8s 管容器那样管 lab |

**本章小结**

- **混合架构**：LLM 编排 + 原子专用 net，不是 scale 一个模型到「懂一切材料」。
- 与企业 **LLM + 工具 + 小模型** 同构，但底层 net 的 **物理 inductive bias** 是护城河。
- 商业化先做 **智能层 / 软件**，高价值发现留 optionality——类似 biotech 的 platform vs asset。

---

## 05 半导体与农业：物理世界也能跳一级

**Elad：** 语言切进 **人类存在的基本面**——企业软件、消费——所以 OpenAI、Anthropic 涨这么快。材料、机器人 footprint 还小。Periodic 先在哪商业化？《钻石时代》里物质管道进每家每户，你读过吗？

**Liam：** 没读过 Neal Stephenson 那本。Elad 说的 **AI 导师** 和 **家用物质打印机**——我们方向是 **从写文章、写软件，到生成物质**。半导体、航空航天、能源，全吃 **材料与工艺瓶颈**。数字世界 **六个月变一次**（软件工程）；物理世界 **原子难挪**，但不代表没有 **一两个数量级** 的加速空间。

**Elad：** 你刚才说像 **材料领域的农业革命**？

**Liam：** 对。健康、生产力最近也跳过一截——总有一堵墙，墙倒了后面是平原。我们干的是让人类更有 **原子重排与合成** 的能力。物理世界若 **某种程度上跟上数字世界**，生活质感完全不同。这是 **革命**，不是渐进优化。

**Elad：** 瓶颈在材料工程、工艺工程的人——他们怎么提问、找异常、调配方？

**Liam：** 需求 **相当普遍**：任何跟物理世界打交道的行业，都有 **面向数据的提问**——调试机器、改配方、发现 anomaly。我们内部建了 **小型测试场**，技术成熟到想 **外溢先进制造**。跟科学家 **紧密合作**；Periodic Labs 自己是 **零号客户**。

**Elad：** 资本呢？LLM lab 是 GPU + 数据 + 钱；实验室是不是也烧？

**Liam：** **GPU 贵得惊人**——相对物理基础设施，**计算占比反而更高**，这点很多人意外。湿实验设备交付慢、校准难，但 ** dollar 的大头仍在算力**。物理科学会像 ML 一样 **工业化**：扩展特性、大规模实验、自动化——否则 **智能** 会先碰到天花板，wet lab 吞吐量跟不上。

**Elad：** 团队怎么拆？

**Liam：** 官网把世界分成 **比特** 和 **原子**。比特侧：中长期训练、预训练、infra。原子侧：控制工程、系统工程、产品工程扩展。**跨学科** 是卖点也是痛苦——物理学家、化学家跟顶尖 AI 研究员、工程师 **同屋迭代**。老一辈科学家看 **智能系统改工作方式**，冲击很大；他们不习惯 **那种吞吐量**，也 **看不懂** 那种数据量——跟当年 Brain 寒武纪一模一样，只是仪器从 GPU 换成 **自动化 lab**。

> **金句 · Liam Fedus**
> **中文：** 原子难处理，仍有一两个数量级的加速；物理跟上数字，是革命不是微调。
> **原文：** Atoms are hard—but there's room for one or two orders of magnitude of acceleration; if the physical world keeps pace with the digital, it feels like a revolution.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 工艺工程 | process engineering | 从配方到产线，让材料 **造得出来** |
| 先进制造 | advanced manufacturing | 半导体、航空等 **材料约束** 重的行业 |
| 吞吐量 | throughput | 单位时间跑多少实验；闭环速度的硬指标 |
| 自动化 lab | lab automation | 液体处理、合成、表征 **少人手** |

**本章小结**

- 材料 AI 的 **TAM** 不如「语言=全人类界面」直观，但 **瓶颈行业** 付费意愿与 **失败成本** 极高。
- **农业革命** 隐喻：突破 **材料/工艺墙** → 下游半导体、能源 **指数级变快**。
- **资本结构**：算力仍是大头；自动化是 **智能不被 wet lab 卡住** 的前提。

---

## 06 智能不是标量：递归自我改进有领域墙

**Elad：** 人人聊 AGI、ASI。你亲手做过 GPT-4 产品化，怎么看 **递归自我改进**？软件会不会 **突然** 不需要人，biology 呢？

**Liam：** 第一个坑：**把智能当标量**。这些系统 **很尖**——某数学域 **世界一流**，问题 **扰动一点**，表现掉到 **差高中生**。你能造 **单域天才、多域废柴** 的系统。相邻域 **未必** 泛化，别用直觉画一条「智商曲线」。

递归自我改进，我部分类比 **十年前的神经架构搜索**。软件工程有一条 **极清晰的路**：数据多，**验证环境极便宜**——单元测试，几个 CPU，失败变通过，**近乎瞬时**。AI 研究员和软件工程师 **没有领域鸿沟**；下一代系统 **更大贡献** 会来自这里。**正在发生。**

**Elad：** AI 研究本身呢？

**Liam：** 也有，但是 **更慢的外循环**。不是看 unit test pass，是看 **扩展律、收敛、泛化**——要 GPU，要 **小时级实验**。会到，但 **晚于** 软件闭环。

**关键**：两条闭环都 **绑领域**——软件一条，AI 研究一条。Periodic 的 premise：**科学和工程需要第三条**——真做实验、真做工程的闭环。这两块 **先突破**；世界其他地方 **延迟跟进**。这是我们盯的 **基础技术**。

**Elad：** 要不要 Physical Intelligence 那种机器人才能 **逃逸速度**？

**Liam：** 闭环 **不必须** 通用人形机器人，但机器人是 **巨大加速器**。Periodic 目标是 **高质量、多样化数据**；自动化是手段。现在 **人 + 可靠自主子系统** 混合，已经能产 **大量可靠数据**。灵巧人形机器人进 **非结构化 lab**、听懂指令——会 **猛加速**；现成 **商品化** 机器人我们也在用，创新不多，等 **可靠性阈值** 到了，新 lab 搭起来更快。

**Elad：** 我做过 Color，液体处理机器人 **固件烂、要 3D 打印减震、摄像头 + ML 监控**——高通量不是买一个盒子就完。

**Liam：** 懂。我们 **尽量 commodity**；定制创新留到 **通用机器人够可靠** 之后。劳动力短缺在 **物理世界** 到处存在——软件工程师才多少， **摸原子** 的人更少。机器人 + AI 接口层，这十年 **会非常有趣**。除了 Periodic，我最兴奋的就是 **AI 接物理世界**——不只科学， **掌控、操作** 物理环境。

> **金句 · Liam Fedus**
> **中文：** 智能不是一条数轴；软件能递归自改，因为单元测试便宜——湿实验的墙还在。
> **原文：** Intelligence isn't a scalar; recursive self-improvement runs fast in software because verification is cheap—biology and materials hit the wall of experiment cycles.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 尖锐性 | sharp capabilities | 能力分布尖刺状，非平滑全才 |
| 可验证环境 | verifiable environment | 能 cheap 判对错——代码测试 vs 湿实验 |
| 外循环 | outer loop | 慢反馈：训大模型、看扩展指标，小时到天 |
| 领域鸿沟 | domain gap | 会写代码 ≠ 懂 biology；RSI 不自动跨沟 |

**本章小结**

- **智能非标量** → 别用单一 AGI 时间表覆盖所有行业。
- **软件 RSI 已起步**（便宜验证）；**AI 研究 RSI 进行中**（GPU 外循环）；**科学/材料最慢**（Periodic 要建的闭环）。
- 机器人 **非必要但强加速**；现有人机混合 lab 已能产数据——与 [[DeepMind团队-AI评估规划化与民主化]] 强调 **真实环境评估** 同构。

---

## 总结：比特跑得快，原子必须接上闭环

| 维度 | 要点 |
|------|------|
| 人才 | 物理第一性原理 + 扩展定律思维，从 Brain 寒武纪涌向 OpenAI、Periodic |
| 产品 | ChatGPT = **通用对话界面赌注**；Periodic = **对话编排实验** |
| 数据 | 互联网先验不够；**实验闭环 + 主动学习** 产可验证原子数据 |
| 架构 | **编排层 LLM + 对称性原子 net**；编码用 Claude，材料用专用模型 |
| 产业 | 半导体/能源/航空 **材料瓶颈**；农业革命式 **1–2 数量级加速** 可能 |
| AGI | **智能非标量**；RSI 软件最快，湿实验最慢；机器人加速但不阻塞 MVP |

### 对个人的启示

- **跨域迁移**：物理/化学 + ML 产品化（Fedus 路径）在 **原子 AI** 阶段比纯 CS 更稀缺——见 [[MOC - AI 时代个人发展与组织]]。
- **别只练比特**：会 prompt 不够；理解 **数据从哪来、怎么验** 决定你在材料/ bio 闭环里的位置。
- ChatGPT lesson：**通用界面** 比 premature vertical 更能释放模型——个人工具栈也可 **少 app、多对话编排**。

### 对团队与公司的启示

- **混合架构** 是默认：LLM conductor + domain net + 工具；Periodic 与 enterprise agent 同构，物理 bias 在底层。
- **零号客户**：Periodic 先改自家科学 workflow，再卖 **智能层**——platform before asset。
- **资本规划**：算力仍是大头；自动化与 **吞吐量** 跟 GPU 同等战略。

### 仍待验证

- 材料子域 **扩展律** 能否像 LLM 一样 publicly predictable——尚无公开曲线。
- **1–2 数量级加速** 是 Fedus 判断，非已兑现指标；半导体周期能否吸收仍看产线。
- **递归自我改进** 时间表：软件近、材料远——边界会随机器人可靠性移动。

> **金句 · Liam Fedus（封底）**
> **中文：** 不把 AI 接到物理世界，科学就不会像软件那样加速——闭环实验才是原子时代的预训练。
> **原文：** Unless you connect AI to the physical world, you won't see science accelerate the same way—you need closed-loop experiments as the pretraining of the atomic age.

---

## 概念索引（agent）

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| experimental_closed_loop | 实验闭环 | experimental closed loop | 主动学习 + 验证，非静态文献池 |
| orchestration_layer | 编排层 | orchestration layer | LLM 读文献排实验，调原子专用 net |
| scaling_laws | 扩展定律 | scaling laws | 规模投入可预测，驱动工业化 |
| recursive_self_improvement | 递归自我改进 | recursive self-improvement | 便宜验证的领域先自改；湿实验滞后 |
| intelligence_not_scalar | 智能非标量 | intelligence is not a scalar | 尖刺能力分布，非单一 AGI 分数 |

---

## 附录

### 章节时间戳（B 站专栏 · 重点速览）

| 时间 | 主题 |
|------|------|
| 03:15 | 物理学背景与 AI 扩展定律 |
| 07:42 | ChatGPT 通用聊天界面产品赌注 |
| 11:05 | 缺乏高质量实验数据与闭环 |
| 16:20 | 编排层 + 专业原子模型 |
| 21:45 | 物理世界加速与农业革命隐喻 |
| 26:30 | 智能非标量与递归自我改进领域墙 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1zKDbBzEeT/ingest`
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV1zKDbBzEeT/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv47657441/
- **B 站**：https://www.bilibili.com/video/BV1zKDbBzEeT/
- **原播客**：No Priors（Elad Gil）
- **UP**：Easonlee的AI笔记

### 相关阅读

- [[DeepMind团队-AI评估规划化与民主化]] — 评估接真实任务；Periodic 接真实实验  
- [[MOC - AI 时代个人发展与组织]] — 比特岗位与跨域人才横切索引  
- [[Anthropic联创-AI影响比工业革命大10倍快10倍]] — 社会尺度变革 vs 原子尺度加速  
- [[OpenAI员工-上下文工程和Agent记忆]] — 比特世界 agent 记忆；本文补物理数据面  
- [[微软CEO-AI竞争终局与企业私有评估]] — 企业评估闭环 vs 科学实验闭环  

### 收录说明

- **视频**：[BV1zKDbBzEeT](https://www.bilibili.com/video/BV1zKDbBzEeT/)（B 站转载 · Easonlee 专栏）  
- **嘉宾**：Liam Fedus，Periodic Labs 创始人，ChatGPT 共同创造者  
- **节目**：No Priors（主持人 Elad Gil）  
- **版本**：canonical Host-Guest v3.2（S 级 · column 主源 · 2026-07-06）
