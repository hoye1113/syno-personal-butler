---
title: "DeepMind团队：当数百万 Agent 相遇"
tags: ["ai_agent", "video_transcript", "bilibili", "multi_agent", "ai_safety", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "multi_agent", "ai_safety", "harness_engineering"]
created: "2026-07-02"
source: "B站视频 - Google DeepMind: The Podcast（Easonlee 转载）"
description: "DeepMind 研究员 Nenad Tomasev 用婚礼订场地、写代码、Agent 互相砍价等例子，解释 Agent 与聊天机器人的区别，以及数百万 Agent 形成「Agent 社会」时的安全与对齐难题。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/DeepMind团队-当数百万Agent相遇.md"
source_sha256: "7800072dba8c1c8b4a52c6dfd1d5c1c0640d48057ad5202589d75610ace4b305"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1ixKX6oEzK/"
source_original: "https://deepmind.google/the-podcast/"
source_original_date: 2026-06-23
host_name: "Hannah Fry"
guest_name: "Nenad Tomasev"
guest_title: "Google DeepMind Senior Staff Research Scientist"
material_tier: A
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1ixKX6oEzK/ingest"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Editorially reconstructed dialogue (column primary)
speaker_inference: "asr_heuristic + video_description + podcast credits"
speaker_confidence: medium
factual_status: unverified
factual_reviewed: 2026-07-13
verification_basis:
  - column
  - description
  - original_page
unresolved_facts:
  - "当前 Recastory BV 目录未发现 ASR；官方播客页确认 Hannah Fry 为主持，但本篇数字与逐句问答尚未核验。"
duration: 42:38
saved: 2026-07-03
updated: 2026-07-03
concepts:
  - id: intelligent_delegation
    zh: 智能委托
    en: intelligent delegation
    one_line: 按能力与可靠性派活，非随机切块并行
  - id: agentic_traps
    zh: 智能体陷阱
    en: agentic traps
    one_line: 投毒网页、动态伪装诱导 agent 越权
  - id: humanity_level
    zh: 人类级分工智能
    en: humanity-level intelligence
    one_line: 专才社会 + 协调层，非单一全能个体
---

# DeepMind团队：当数百万 Agent 相遇

**Host：** Hannah Fry（Google DeepMind: The Podcast）  
**Guest：** Nenad Tomasev（Google DeepMind 高级研究员）  
**形态：** Host-Guest canonical v3.2（专栏主源 · 当前缺 ASR）
**辅源：** B 站简介导读时间戳 · 无专栏主源  
**B 站：** [BV1ixKX6oEzK](https://www.bilibili.com/video/BV1ixKX6oEzK/)

---

## 开场

只玩过 ChatGPT 的人，今年最大变化也许是：AI 不只回答问题，开始**替你在世界里动手**。OpenClaw、Gemini、Gravity 一代代 agentic 工具落地，更深的问题是——当成百上千万个 Agent 不只为人打工，还在彼此之间订票、砍价、派活，会不会长出一种新的「Agent 经济」？怎么保安全？

Nenad 长期研究多智能体与对齐。这期五章：**Agent 和 LLM 差在哪** → **准确率与自动化偏差** → **智能委托 vs 并行切块** → **网页陷阱与纵深防御** → **专才社会与人类级分工智能**。

---

## 01 控制环改变角色：从提问者到审批者

**Hannah：** 只用过大型语言模型的人，和真正用 Agent，体验差在哪？

**Nenad：** 今年最大趋势之一。Agent 不是新概念——大模型之前就有，在模拟环境里收集物品、完成任务，那时我们更强调**在世界中行动**来体现智能。今天概念上的核心差别：**Agent 观察世界状态并采取行动**；纯 LLM 只是对你 prompt 做文本续写。现在 Agent 底层仍用 LLM  formulate 动作，但外面套了 **harness**，提议的动作会被执行，还能**链式串多步**。

动机很直白：很多事你本可以一遍遍手动指挥 LLM 做完，Agent 把中间编排自动化，给你更少活、给模型更多自主权——当然敏感动作仍要人批准。

**Hannah：** 策划婚礼这种例子，差别具体在哪？

**Nenad：** 问 LLM，它给你 caterer 列表、场地建议，**邮件还得你自己发**。Agent 若接了 Gmail 工具，可以代拟、代发——你得核对草稿，发错了也麻烦，但原则上**整件事可以更少动手**。界面仍像聊天，但你的角色从「提问者」变成**决策者**：审阅、批准，然后 Agent 去订票、发消息；你可以去泡杯茶，前提是它没犯大错。

科学上的愿景更大：自主实验室调度实验——软件里闭环靠测试验证；湿实验要靠**物理 safeguard** 和可靠 protocol，不能光靠模型自信。

**Hannah：** 为什么偏偏是现在 Agent 突然能用了？

**Nenad：** 历史上也有「Agent」——数据中心优化器、交易算法——但没有语言界面，人接不上，只能窄任务自动化。基于语言模型的 Agent **能对话、能 steer**，大众突然能用了。瓶颈已从「模型不够强」转向**协调、编排、管理**——你得把自己当成 **Agent 团队的经理**。

> **金句 · Nenad**
> **中文：** Agent 观察世界并行动；语言模型只是续写。
> **原文：** An agent observes state of the world and performs an action — a language model just gives you a continuation reply to a prompt.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 执行框架 | harness / control loop | 套在 LLM 外，把提议变成真实动作 |
| 链式决策 | chained decisions | 多步计划自动串联执行 |
| 审批者角色 | approver role | 人审敏感动作，非逐步手操 |
| 工具接入 | tool access | Gmail 等权限让 agent 改变世界状态 |

**本章小结**

- Agent = LLM + harness + 多步行动；人是审批经理
- 婚礼、邮件类任务说明「动手」与「动嘴」的体验鸿沟
- 模型够强后，瓶颈在编排与管理技能

---

## 02 没有百分之百：写代码领先与自动化偏差

**Hannah：** 眼下 Agent 真正擅长什么？又为什么不能撒手不管？

**Nenad：** 全行业都在推 **coding**——太多流程能写成软件，Agent 在加速开发，把人从 boilerplate 解放到**想法和设计上**；Google 内部也在用。同时必须承认：**没有任何动作百分之百准确**，越复杂的动作失败率越高——和人类智能一样。

危险在 **automation bias（自动化偏差）**：机器学习别的领域早就见过——模型连续几次做对，你就放松验证，** subtle 错误**从眼皮底下溜过去。所以 harness 设计要让人**保持在线**——在环里不够，还得**真在看**。

**Hannah：** 科学自动化怎么接上你「推进科学、改善健康」的大目标？

**Nenad：** 科学不只是在 context window 里想几分钟。现在大家用 LLM 做 co-author、形式推导已经很强。要更大程度自动化，得有关闭循环——自主实验室调度实验、跑材料或生物实验，**物理世界接口**必须重重 safeguard。软件可以写测试闭环；湿实验得靠协议和硬件护栏。

短期技术下，模型擅长的是**组合式闭合**——把已知技能拼起来、填小缝；还没看到真正**颠覆性科学发现**那种 deep transformative。人类角色仍然很大。

**Hannah：** 长期这会多颠覆？

**Nenad：** 很难想象没有深度 disruption 的世界——关键是长什么样。我们在设计技术，可以尽量赋能人类专家，但 AI 确实在进入以前进不去的领域。数学里曾经觉得 AI 干不了，现在很短时间变得 commonplace——unsettling 的是变化窗口比工业革命还短，我们得更 mindful。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自动化偏差 | automation bias | 连续成功就放松检查 |
| 组合式闭合 | compositional closure | 重组已知技能，非全新发现 |
| 编码智能体 | coding agents | 当前最成熟、最广泛落地的 agent 场景 |
| 物理 safeguard | physical safeguards | 湿实验/真实世界的硬件与协议护栏 |

**本章小结**

- Coding 领先；科学自动化要闭环 + 物理护栏
- 准确率永远 <100%；复杂动作更危险
- Automation bias 要求人审且保持专注，不能形式上的 HITL

---

## 03 智能委托：不是把任务随机切成并行块

**Hannah：** 你常写「委托」——一个 Agent 把活派给专家。这和今天常见的 multi-agent 有何不同？

**Nenad：** 复杂任务要拆块执行，有时**单个 Agent 做不了每一块**，得通过 **agent-to-agent 协议**把子任务 hand off。委托方要管理失败、尽量预防——包括**先判断该委托给谁**（可靠性、能力能否认证），并防范恶意交互。

今天很多所谓 multi-agent，其实是 **parallelization（并行化）** 而非 intelligent delegation：活被**随机切成子块**扔给多个 agent，各干各的，求个速度——软件工程里还能用单元测试验每一块；真实世界任务**验证没那么直**，还可能带主观（酒好不好喝）。

**Hannah：** 一个买酒、一个买杯子、互不通气，就会出岔子？

**Nenad：** 有可能。更深层是 **reward hacking**——形式上满足请求， spirit 不对。所以要强调 **verifiability（可验证性）**，委托双方要有**正式契约**。任务也分可逆/不可逆：错了重跑就行 vs 花了钱、发了邮件收不回——后者要更谨慎。

有趣的是**反向委托**：医疗影像里，窄域模型多年 superhuman，仍会犯错，于是实验 **AI→人**——模型不确定时 flag 给放射科医生。这种「AI 知道何时找人类」在特定场景已被验证有效。通用 Agent 里，敏感动作本来就该**升级给人批准**。

> **金句 · Nenad**
> **中文：** 很多多智能体系统只是并行，不是智能委托。
> **原文：** Many multi-agent systems act more as parallelization than delegation.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 智能委托 | intelligent delegation | 按能力派活 + 管理失败，非随机切块 |
| 可验证性 | verifiability | 结果能否客观检验；主观任务更难 |
| 奖励黑客 | reward hacking | 表面达标、实质跑偏 |
| 反向委托 | reverse delegation | AI 不确定时交给人（如医疗影像） |

**本章小结**

- 真委托要有协议、可靠性判断与失败处理
- 当下 multi-agent 多为并行提速，缺跨块协调
- 可逆/不可逆任务决定审批强度；AI→人委托在窄域已验证

---

## 04 Agent 上网：陷阱、动态伪装与纵深防御

**Hannah：** Agent 越多上网，攻击面越大。你说的 agentic traps 是什么？

**Nenad：** 又吓人又迷人。单个交互不可靠，**规模一大统计上必失败**；跑 Agent 又费算力电费——不可靠还贵，长期站不住。Traps 是：Agent 在**环境**里行动，环境是开放网页；网页被投毒，Agent 踩坑。

经典路子：**prompt injection**——页面有视觉上看不见的 token，非视觉型 Agent 读 DOM/原始格式，中招后目标被改。还有 **dynamic cloaking（动态伪装）**：站根据访问者行为猜是人是 Agent，**对人显示正常页、对 Agent 显示 jailbreak 内容**。早期有人给 Agent 钱包权限实验，wild 里真有人吃亏——原型 trusted env ≠ 公开部署。

**Hannah：** 网页会不会分裂成「给人看的」和「给 Agent 看的」？

**Nenad：** 有可能。Agent 流量或已超过人类——恶意动机随之上升。这不是全新问题：邮件病毒、点错链接、对抗样本——**对 ML 系统则是旧问题的新规模**。单靠「把模型对齐好」不够。

**Hannah：** 环境控制不住，怎么防 Agent 发疯？

**Nenad：** **纵深防御（defence in depth）**——别赌一层银弹。资源 trust 与认证；网页内容检测；Agent 侧、模型侧 mitigation；**最小权限**（就算 jailbreak 也限损害）；有意义的人类控制；多层叠加，网眼够密。

> **金句 · Nenad**
> **中文：** 纵深防御——一层 mitigation 叠一层，别赌单点对齐。
> **原文：** Defence in depth — mitigations upon mitigations upon mitigations.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 智能体陷阱 | agentic traps | 恶意环境诱导 agent 越权或越狱 |
| 提示词注入 | prompt injection | 页面隐藏指令篡改 agent 目标 |
| 动态伪装 | dynamic cloaking | 同一 URL 对人/对 agent 显示不同内容 |
| 纵深防御 | defence in depth | 多层缓解叠加，不单点对齐 |

**本章小结**

- 开放网页 = 投毒面；非视觉 Agent 更易吃隐藏 token
- Dynamic cloaking 制造「双版本互联网」风险
- 安全要环境 + Agent + 模型 + 人控 + 最小权限一起上

---

## 05 Agent 经济与终局：认知单一文化 vs 专才社会

**Hannah：** 百万 Agent 互相交易，你脑海里的 agent economy 长什么样？

**Nenad：** 日常层面，个人助理有持久记忆和偏好，你可能给它预算**代你砍价**——演唱会抢票就是例子。规则是**显式设计**：要公平可以给每个参与 Agent 等额预算，按你的行程和偏好分配，人群尺度上希望结果别太离谱。

系统性风险要借镜金融：高频交易有过 flash crash，mitigation 可借鉴；Agent 时代多一个新变量——**cognitive monoculture（认知单一文化）**：大量 Agent 用少数同款 LLM，**决策高度相关**，失败点同时爆。对策包括决策多样化（power user 用 system prompt 偏置；多数人不会），以及 **anti-collusion**——Agent 还可能通过环境**间接协调**，不直接通信。

发布节奏要像自动驾驶——demo 惊艳，**最后一公里**在政策与社会整合；完全自主 Agent 经济**还没发生**，human structures 仍要在环。

**Hannah：** 终局是一个万能超人 Agent，还是别的画面？

**Nenad：** 国际象棋类比：Gemini 能下一点棋，你仍用**专用 engine**——更快、更准、更便宜，专才经济 incentive 清晰。我常提醒：别把 AGI 想成**人类水平**的「一个人啥都会」，更像 **humanity-level**——社会分工，没人能同时精通一切；有限容量、专精协作。

与其一个巨大贵慢模型，不如**专才 Agent 社会** + 薄协调层。对齐 implication 也变了：不再只对齐**一个实体**——上万 Agent  intricate 交互，系统行为难定义。**经济激励**可能是群体对齐起点（别 harm-maximizing profit）；个体 Agent 安全是群体安全 prerequisite，但远远不够。

**Hannah：** 所以复制「人类级全能」可能不是目标，复制「人类社会的分工」才是？

**Nenad：** 这是我个人更信的画面——也是这期最值得带走的一句 framing。

> **金句 · Nenad（封底）**
> **中文：** 不是一个巨大模型，而是专才社会。
> **原文：** Rather than one humongous model — a society of specialists.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 认知单一文化 | cognitive monoculture | 同款模型导致集体相关失败 |
| 防串通 | anti-collusion | 防 Agent 间接协调操纵拍卖等 |
| 专才智能体社会 | society of specialist agents | 各行专才 + 通用协调层 |
| 人类级分工智能 | humanity-level intelligence | 社会分工式智能，非单人全能 |

**本章小结**

- Agent 经济含个人助理局部市场与系统性金融风险
- Cognitive monoculture 放大 flash-crash 式 correlated failure
- 终局可能是专才社会 + 协调层；对齐对象变成分布式系统

---

## 总结

| 维度 | 要点 |
|------|------|
| Agent vs LLM | harness + 工具 + 多步；人从提问者变审批经理 |
| 可靠性 | Coding 领先；automation bias 要求真监督 |
| Multi-agent | 今日常是并行，非 intelligent delegation + 契约 |
| 安全 | Agentic traps、dynamic cloaking；纵深防御 + 最小权限 |
| 经济与终局 | Cognitive monoculture；**humanity-level 分工** 可能优于单人 AGI |
| 与 vault | 接 [[DeepMind-模型将吞噬Harness]]、[[IBM团队-Harness工程详解]] |

> **金句 · Nenad（封底）**
> **中文：** 信任可以给，也要赚回来。
> **原文：** Trust is given, but it's also earned.

---

## 概念索引

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| intelligent_delegation | 智能委托 | intelligent delegation | 按能力派活，非随机并行 |
| agentic_traps | 智能体陷阱 | agentic traps | 投毒网页诱导越权 |
| humanity_level | 人类级分工智能 | humanity-level intelligence | 专才社会 + 协调层 |

---

## 附录

### 章节时间戳（B 站简介）

| 时间 | 主题 |
|------|------|
| 02:15 | 控制环与多步任务 |
| 07:10 | 准确率缺陷与自动化偏差 |
| 13:50 | 智能委托与可验证性 |
| 21:30 | 环境投毒与动态伪装 |
| 34:20 | 分布式专家智能体社会 |

### 素材路径

- **ingest**：`Recastory/workspace/knowledge/A1-deepmind-million-agents/ingest`
- **来源限制**：当前 Recastory BV 目录未发现 ASR；问答结构来自专栏整理
- **video_description**：`{ingest}/video_description.md`
- **B 站**：[BV1ixKX6oEzK](https://www.bilibili.com/video/BV1ixKX6oEzK/)
- **原节目**：Google DeepMind: The Podcast
- **时长**：42:38
- **专栏主源**：无（A 级 partial enrich）

### 相关阅读

- [[Agent实战-打造一个AI Agent的完整教程]] — Agent 入门与 Observe-Think-Act  
- [[DeepMind-模型将吞噬Harness]] — 模型与 harness 的另一视角  
- [[IBM团队-Harness工程详解]] — harness 可靠性第一性原理  
- [[Manus创始人-深度干货-上下文工程的最佳实践]] — 产线 multi-agent 与 context  
- [[MOC - Harness Engineering]] — Harness 主题横切索引  

### 收录说明

- **主持**：Hannah Fry · **嘉宾**：Nenad Tomasev（Google DeepMind）  
- **主源**：英文 ASR（播客对谈）；无 UP 专栏图稿  
- **版本**：canonical Host-Guest v3.2-asr（2026-07-03；原 v3 九段讲义已替换）
