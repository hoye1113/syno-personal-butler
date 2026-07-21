---
title: "姚顺雨：预测性 Agent 设计"
tags: ["ai_agent", "video_transcript", "bilibili", "context_engineering", "ai_evaluation", "multi_agent"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "context_engineering", "ai_evaluation", "multi_agent"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV1tZw4zLEX8/"
description: "姚顺雨 × Latent Space（Alessio + Harrison）：ReAct 从文本游戏到通用工具调用、Reflection/ToT 取舍、Benchmark 滞后、ACI 比规划更重要、CoALA 与记忆未解、应用 UX。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/姚顺雨-预测性Agent设计.md"
source_sha256: "d00d429e881155e0d774bcf1178fd5430ad3ee104ad1f7e36dae84bd53b453bf"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1tZw4zLEX8/"
source_original: "https://www.youtube.com/watch?v=8t65bss7U74"
source_original_date: "2024-09-28"
host_name: "Alessio Fanelli"
guest_name: "姚顺雨"
guest_title: "OpenAI 研究员 · ReAct / SWE-bench / CoALA 作者"
co_host_name: "Harrison Chase"
co_host_title: "LangChain / LangGraph 创始人"
material_tier: A
content_form: dialogue
dialogue_fidelity: source
question_source: transcript
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1tZw4zLEX8/ingest"
speaker: "Alessio / Harrison Chase / 姚顺雨"
duration: "86:33"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "bilibili-retranscribe/BV1tZw4zLEX8/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Host-Guest canonical (ASR primary)
speaker_inference: "asr_heuristic + latent.space show notes + youtube_quote_match"
speaker_confidence: high
factual_status: partial
factual_reviewed: 2026-07-13
spot_check: 2026-07-13
verification_basis:
  - transcript
  - transcript_json
  - original_page
unresolved_facts:
  - "长视频的全部 benchmark、论文时间线和直接引语尚未逐条核验；本轮仅完成四点抽样。"
asr_version: v2
author:
  - "[[姚顺雨]]"
  - "[[Harrison Chase]]"
concepts:
  - id: react
    zh: 推理与行动交织
    en: ReAct (reasoning and acting)
    one_line: 思考可当作一种「内部动作」，改上下文而非改环境
  - id: aci
    zh: 智能体-计算机交互
    en: Agent-Computer Interface (ACI)
    one_line: 把 agent 当客户设计工具与环境，比堆规划算法更关键
  - id: coala
    zh: 语言智能体认知架构
    en: CoALA
    one_line: 记忆存储 × 动作空间 × 决策循环三维描述 agent
---

# 姚顺雨：预测性 Agent 设计

**Host：** Alessio Fanelli（Latent Space 联合创始人）  
**联合主持：** Harrison Chase（LangChain / LangGraph）  
**Guest：** 姚顺雨（Shunyu Yao，OpenAI · ReAct / SWE-bench / CoALA）  
**形态：** Host-Guest canonical v3.2（**ASR 主源**）  
**原节目：** [Language Agents: From Reasoning to Acting](https://www.latent.space/p/shunyu) · **YouTube：** [8t65bss7U74](https://www.youtube.com/watch?v=8t65bss7U74)  
**B 站：** [BV1tZw4zLEX8](https://www.bilibili.com/video/BV1tZw4zLEX8/) · **时长** ~86 min

---

## 开场

2024 年 9 月，OpenAI 刚招进姚顺雨——ReAct、Reflexion、Tree of Thoughts、SWE-bench、CoALA 一串「每篇都是 banger」的 agent 方法论，几乎预言了此后两年的 industry 走向。Latent Space 把 Harrison Chase 拉来做联合主持：一边是论文作者，一边是 LangChain 生态里每天看用户怎么拼 agent 的人。

这期六章：**ReAct 从 Zork 文本游戏到 Wikipedia** → **Reflection / ToT 与 prompting 极简主义** → **Benchmark 为什么总慢方法半拍** → **SWE-agent 与 ACI：工具比规划重要** → **记忆未解 + CoALA + 智能与知识** → **应用落地与 Agent UX**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 推理与行动交织 | ReAct | 交替输出思考 trace 与工具调用 |
| 自我反思 | Reflexion / Reflection | 用语言反馈改 prompt，替代梯度回传 |
| 思维树 | Tree of Thoughts (ToT) | 多分支推理 + 自评估，高延迟换质量 |
| 智能体-计算机交互 | Agent-Computer Interface (ACI) | 为 agent 设计终端/浏览器等接口，类比 HCI |
| 认知架构 | CoALA | 记忆 × 动作 × 决策三维框架 |
| 语义/情景/程序记忆 | semantic / episodic / procedural memory | 知识、轨迹、技能三类存储抽象 |
| 搜索型 vs 反应型任务 | search-type vs reactive tasks | 百次采样求一解 vs 实时可靠完成 |

---

## 01 ReAct：文本游戏里先「想」再「动」

**Alessio：** 你怎么走上用语言模型做 agent 这条路？ReAct 对你和 Harrison 各自意味着什么？

**姚顺雨：** 本科做视觉，拼 GAN、3D 感知，渐渐觉得不够兴奋。读到 Transformer 很酷，但真正进语言模型是 PhD 跟 Karpathy 做 advisor——他是 GPT-1 第二作者，当时在 OpenAI 访学，跟 Alex Radford 做 GPT-1。Karpathy 去 Princeton 当教授后收了我，尽管我零 NLP 背景。第一次见面他问想做什么，我说：你那些 Atari 游戏 demo 很酷，能不能用语言模型重做一遍？2019 年，GPT-2  deemed too dangerous to release 的年代， journey 就这么开始了。

ReAct 之前我花了两年做**文本冒险游戏**——Zork 那种：文字观察、kill the grue、拿 sword。主流解法是 RL 百万步 trial-and-error，零语言理解。人类能通关是因为会**想**：看到 guru、看到 sword、要过木门——为什么不让 text agent 也 think？2021 年 11 月原型就出来了，甚至早于 ChatGPT 式对话。文本游戏太难，Google 实习时把同一套想法搬到 Wikipedia、HotpotQA 等更 practical 的环境，才跑通。

**Harrison：** 我早年在玩 LM 调 API，大家总在问怎么更可靠地 function calling。ReAct 是重要一步，而且**极其 general**——简单到反而是优点。

**姚顺雨：** ReAct 有两层贡献。第一层：应用**通用方法**调各种环境里的 tool——现在看已是 trivial blessing。第二层：**inner monologue**——思考 paired with tool use——仍然 non-trivial。默认 function calling 没有内心独白；当 tool 分布偏离预训练时，思考很重要。OpenAI 甚至在 tool schema 里加 `thought` 字段先填，就是这个思路。

Defense 里我说过一句：**ReAct 不改外部环境，只改 context window 里的 insight**——思考本身可以是一种 action，一种 zero-gradient 的 agent 路径。当时 RL 圈做 agent 是主流，NLP 各任务各 track，我们在 rethink：环境不只是 Atari，还有 language games；方法也不该每个 NLP task 一套 pipeline。

> **金句 · 姚顺雨**
> **中文：** 思考可以是一种工具——你不改周围的工具，你改的是上下文里装什么。
> **原文：** Thinking can be an extra tool that's useful… ReAct doesn't change the outside environment, but it does change the insight through the context.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 文本冒险游戏 | text adventure games (e.g. Zork) | ReAct 思想的原型环境 |
| 零梯度路径 | zero-gradient approach | 不靠 RL 梯度，靠 prompting 交织推理与行动 |
| 内心独白 | inner monologue | 工具调用前的显式思考 trace |
| 通用工具调用 | general tool use | 同一套方法接 Wikipedia、搜索、计算器等 |

**本章小结**

- ReAct 从「人类解 Zork 会想什么」出发，不是从 benchmark 反推
- 今天 tool calling loop 是 ReAct 的 implicit 继承；inner monologue 仍值得显式保留
- Harrison 侧验证：生产里 browser / search / code interpreter 三件套 + 长尾 custom tools

---

## 02 Reflection、ToT 与 prompting 极简主义

**Alessio：** Reflection 和 ReAct 怎么衔接？Tree of Thoughts 又该用在哪？

**姚顺雨：** Reflection 主要是 Noah 的工作。我们看到 arXiv preprint 很火，Noah 联系合作做成正式 submission——他大二、一篇 paper 就被 OpenAI 盯上。核心直觉：**人类很少拿 scalar reward**，而是老板给语言反馈「A 做好、B 要改」。Reflection 用 text reasoning pipeline 替代 policy gradient——改 prompt 再跑一遍。算法本身 general，但**需要好 evaluator**：纯数学 chain-of-thought 很难 reflect，因为判断推理对不对跟解题一样难；coding 有 test error 就好 reflect 得多。latency 敏感场景更适合把 Reflection 当**训练期**技术，测试期仍用简单 ReAct。

Tree of Thoughts 是**搜索型**任务：数学证明、找一段好 code——试 100 次有一次解就行。Customer service、订票是**反应型**：要快、要 99% 可靠。Harrison 的用户数据：ReAct 最流行，Reflection 局部用，ToT 最少。Jason Wei 那套轴——实现难度、算力、任务覆盖、下一代模型是否还 relevant——ReAct 在前两维碾压 ToT。

**Harrison：** 我们也没有 off-the-shelf 的 general Reflection implementation；不是概念不 general，是 evaluator + 多轮成本。

**姚顺雨：** 做 research 和做 product 要分开。Research 看 principle 是否 unblock 方向；落地 prompting method 则**极简主义**：chain-of-thought 够用就别加 Reflection；instruction 写清楚往往比加一步 reflection 便宜。我写的 prompt 都像跟同事说话——「你奶奶快死了所以你必须 solve」那种 trick 我不做。早期 LM 是 perplexity generator，奇怪 trick 多；现在模型针对 agent / tool use 优化过，**prompt engineering** 这个词本身有点过时——你应该像跟 coworker 沟通。

**Harrison：** 完全同意。大 lab 的目标就是把 prompt engineer 干掉；好的 human communicator 才是长期技能。

> **金句 · Harrison Chase**
> **中文：** 你不该当 prompt 工程师——大 lab 的使命就是让你这份工消失。
> **原文：** You should not be a prompt engineer because it is the goal of the big labs to put you out of a job.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 语言反馈 | language feedback | Reflection 用的非标量监督信号 |
| 评估器瓶颈 | evaluator bottleneck | 没可靠评判就难 self-reflect |
| 搜索型任务 | search-type tasks | 高延迟可接受、多次采样 |
| 反应型任务 | reactive tasks | 低延迟、高成功率 |
| 极简 prompting | minimalist prompting | 能少则少，别堆 cognitive architecture |

**本章小结**

- Reflection general 但不 universal；evaluator 质量决定上限
- ToT 属于搜索型；多数产品场景 ReAct 足够
- Prompt 从 trick 走向正常沟通，是模型能力进步的果不是因

---

## 03 Benchmark 滞后：方法跑太快，任务跟不上

**Alessio：** 引用量最高的往往是 ReAct、Reflection、ToT——但你说 benchmark 和环境同样重要，甚至更重要？

**姚顺雨：** AI 圈坏习惯：拿 ALFWorld 这种简单 task，堆复杂 method 涨 2%。**任务复杂度应匹配方法复杂度**。我们有很好的 test-time approaches——ReAct、Reflection、ToT 及更复杂的——但 benchmark 进步慢。Citation 上 method paper 比 task paper 多两个数量级；做 good benchmark 要 product manager 思维：为什么难、为什么有用、为什么有人用——不是 PhD 默认技能。WebShop 是我第一次认真做 balance：可自动评分、可 scale，但 practicality 不如真实 GitHub issues。SWE-bench 火是因为在**可评估、够 practical、可 scale** 三维间找到 sweet spot。

**Harrison：** MCTS + LM 该多认真看？任务不对，方法再炫也没用。

**姚顺雨：** 取决于 task——MCTS 对围棋 magical，对 robotics 未必。我 citation 最高的是 methodology，但**同等或更重要**的是 WebShop、SWE-bench 这类环境。Coding 是 agent 最佳应用：全可自动评分、超重要、一切可 API 化——2023 年我还奇怪怎么没更多人做。Princeton 学生跟我做 **InterCode**：coding 应像 Jupyter 一样**交互式** solve，不是 sample 一整段 program 就停。然后 Carlos、John 提出 **SWE-bench**：直接 script GitHub 上人类工程师在修的 issue——idea 一周就有 prototype，engineering 极痛。OpenAI 合作后我们改进 filtering，typical pattern：**大 lab  adopt benchmark 就会 fix benchmark**。

AlphaProof 这类工作更多是 **confidence boost**——证明方向 exciting，鼓励更多人往 verifiable reasoning 走，不必纠结每个技术细节。

> **金句 · 姚顺雨**
> **中文：** 激励结构错了——好 benchmark 比超级复杂的 test-time method 难被人抄作业，但影响面可以更大。
> **原文：** If you have a really good benchmark, a lot of people are going to use it… a super complicated test-time method, it's very hard for people to use.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 交互式 coding | interactive coding (InterCode) | 像人类一样逐步执行、改、再跑 |
| 软件工程基准 | SWE-bench | 真实 GitHub issue 上的 agent 评测 |
| 三维平衡 | gradable × practical × scalable | 好 benchmark 的权衡 |
| 测试时方法 | test-time approaches | 推理阶段用的 ReAct/ToT 等，相对训练方法 |

**本章小结**

- Method 论文好发不好用；benchmark 论文难发但塑造生态
- SWE-bench 三连击：InterCode 交互范式 → SWE-bench 任务 → SWE-agent 接口
- 除 coding / 数学外，仍缺足够 autogradable 又 practical 的领域

---

## 04 ACI：Devin 的 90% 在工具，不在规划 breakthrough

**Alessio：** SWE-agent 核心 insight 是什么？跟 Devin 比你怎么看？

**姚顺雨：** 在谈 agent 之前先谈 **environment**。Off-the-shelf 文本终端给 LM 用问题很大：edit 没 feedback、syntax error 不自知——prompt engineering 很难救。**SWE-agent** 改终端：edit 有 feedback、参数格式适配 LM 习惯。类比 HCI：为人设计桌面、浏览器；现在要为 **agent 做 ACI**，把 agent 当 customer 做 A/B test、行为实验——既做出更好接口，也更好理解 agent。

Devin 我学到的：**没有 foundational planning breakthrough**，planner 相当简单；**~90% 在 ACI**——工具可靠了，agent loop 可以极简。工具烂，堆再多 planning / search 也是 trash。Harrison 在 LangChain 做 memory module：thread 消息进 semantic store + 用户定义 extraction——接近 generative agents / Smallville 的合成记忆，但 semantic vs procedural 是实现选择，认知科学分类更多是**思考框架**，不必 rigid 绑定实现。

**Harrison：** 我把 memory 看成 log 的 materialized view——可 debug、用户可手改，也是 context compression。

**Alessio：** 设计 API 时，为人还是为 agent 优化？Mal Uo 说 Vercel API 简单到人类易懂，LM 也更懂。

**姚顺雨：** 大方向同意：function calling 对人 systematic、对模型用现有 encoding。但 structured output 里我会把字段命名成 `candidate_topics`、`topic_summaries` 来 hint LLM——**为人优化 vs 为 agent 优化**可能 diverge。Cursor  meetup 上有人问：为什么 search 必须用 Exa 不能 Bing？因为 error message 要写成给 LM self-correct 的 prompt——对人 verbose 会紧张，对 agent 越长越好。人类 working memory 小，界面一次一块信息；机器相反——一次给 10 条结果、用 context 换 time steps 更划算。

**Harrison：** 我们 highlight browser / search / code interpreter，但 production 几乎全是 custom tools——长尾才是常态。

> **金句 · 姚顺雨**
> **中文：** 把 agent 当客户，做智能体-计算机交互——这是被忽视的 agent design 大半边。
> **原文：** We should treat agents as our customers… Agent-Computer Interaction (ACI).

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 编辑反馈 | edit feedback | SWE-agent 终端里改代码后立即告知语法错误等 |
| 人机-智能体双优化 | co-optimize human + agent UX | 先找共同 ground，必要时 diverge |
| 工作记忆差异 | working memory limits | 人类 vs 机器决定信息密度与步数权衡 |
| 物质化视图 | materialized view (of logs) | Harrison 对 memory 的工程类比 |

**本章小结**

- Interface / tool design 优先于 agent cognitive architecture
- Devin 胜在 multi-panel ACI + 可靠工具，非 planner 论文级创新
- API、error message、I/O 形状都在为 agent 重写（ACI 产业萌芽）

---

## 05 CoALA、记忆未解，与智能/知识能否分离

**Alessio：** CoALA 想解决什么？memory 为什么还这么糊？

**姚顺雨：** Agent 社区把架构搞得太 complex。CoALA 用三个 first-principle 维度：**信息存哪**（权重、代码、vector store、context window）、**能做什么动作**（外部 tool + **内部 thinking**——ReAct 点名的贡献）、**如何决策**。传统 Atari agent 只有外部 action；语言 agent 还有 internal actions。LangGraph 里 code 本身也是 decision-making 的一部分——prompt 是沟通，code 也是沟通。

Memory 仍是大坑。Semantic / episodic / procedural 是认知科学抽象，实现正交——Voyager skills、generative agents synthesis 都可映射不同类。Harrison 说 LangGraph 会 **persist state across threads**（user / assistant / org scope），但不预设 memory shape——早期，要 control。FireAct： diverse tasks × diverse agent methods，filter 正确 trajectory 训模型——瓶颈是 **high-quality diverse tasks**。Internet 上只有 final result 没有 step-by-step trajectory，agent data 天然难采。

**Alessio：** 智能和知识能分开吗？Apple Intelligence 热插 LoRA 算不算？

**姚顺雨：** 符号 AI 老路是 write down all knowledge；Hinton 说两条路——先 reasoning 后 learning，或先 learning 后 reasoning——后者赢了。完全分离很难：知识像 intelligence 的 cache，reflection 也是把经验存回 memory。Omni model、100× scale 之后呢？CoALA 仍有用——像对 GPT-10 做 neuroscience，得先有框架 dissect  episodic vs decision module。认知科学不必 copy human path；**compare** human 与 machine 更有 insight（bitter lesson vs sour lesson）。

**Harrison：** Memory service 还没找到 PMF——procedural（怎么做）vs personalization（喜欢意大利菜）是不同类型；application-specific 导致难 generic answer。

> **金句 · 姚顺雨**
> **中文：** 别 copy 人脑；把人类智能当参照点来比较，比「像不像人」更有用。
> **原文：** Compare is the way to go… not just copy that or opposing that.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 动作空间 | action space | 外部 tool + 内部思考/检索/写入 |
| 跨线程状态 | cross-thread state persistence | LangGraph 将 graph state 按 user 等维度持久化 |
| 交互轨迹数据 | agent trajectories | 训 agentic LM 的核心稀缺数据 |
| 热插能力 | hot-swappable capabilities | Apple Intelligence 式 base model + 任务 LoRA |

**本章小结**

- CoALA 是理解复杂 agent 系统的压缩语言，不是又一堆 buzzword
- Memory 无 single best——像人选 Notion/Google Doc/纸笔，agent 也需工具箱 + 学习选用
- 智能/知识完全解耦不现实；context 与 weight 两层仍要一起设计

---

## 06 应用与 UX：客服已赢，研究型 Agent 与 ambient 交互

**Harrison：** 从你看到的 builder 里，哪些 application 已经 work、哪些被低估？

**姚顺雨：** **Customer support** 明显已成功——要 simple things reliably，不是 sample 100 次。Coding 兴奋但还不算 success。Research-style agents、AISDR（sales development rep）数据 enrichment 最近冒头。UX 创新空间最大：batch spreadsheet view 跑 hundred companies × attributes；**ambient agents** 后台跑，需要 input 时才 reach out——我 email assistant 开源在 LangGraph，要确认 podcast 才 ping 我。

LangGraph Studio：指向 code 里的 graph 定义，可视化、测试、time travel——Devin time travel UX 是亮点。Low-code 不是不要 code——**cognitive architecture 应在 code 里**，prompt/config 给 PM 调。Building with AI 含义在变：developer 仍要 control，但组件边界在移动。

**Alessio：** τ-bench 呢？simulated user agent。

**姚顺雨：** 跟 Sierra（Bret Taylor）合作。**Customer service agent 有 asymmetric information**——agent 能访问 API/政策，user simulator 可以「笨」一点，只要 need 表达清楚，evaluation 更 clean。Top 48% 平均，room to go。Benchmark landscape 缺 reliability-focused task，τ-bench 补这一角。

> **金句 · 姚顺雨**
> **中文：** 最大问题也许是 application——有好 application 才有 infra 飞轮；UX 是最 Exciting 的创新面。
> **原文：** Perhaps the biggest question is application… UX is one of the most exciting spaces to be innovating in.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 销售开发代表 | Sales Development Rep (SDR) | B2B 找线索、 enrichment 的典型角色 |
| 环境式智能体 | ambient-style agents | 后台运行，需确认时才打扰用户 |
| 模拟用户基准 | τ-bench / simulated user | LM 扮用户测客服 agent 鲁棒性 |
| 时间旅行调试 | time travel (in agent IDE) | 回放 agent 运行状态，Devin/Studio 共性 UX |

**本章小结**

- 已验证：客服；进行中：coding、research agents、AISDR
- Agent UX ≠ chat——batch UI、ambient reach-out、Studio 可视化是新界面
- Benchmark 也要覆盖「simple but reliable」而不只是 code/web

---

## 总结：从推理到行动，再到为 Agent 设计世界

| 维度 | 要点 |
|------|------|
| 方法论 | ReAct 双贡献（general tool + inner monologue）仍指导 today’s loops |
| 取舍 | Reflection/ToT 看 evaluator 与 latency；默认极简 ReAct |
| 生态 | Benchmark / ACI 滞后是瓶颈；SWE-bench 与 SWE-agent 示范完整链条 |
| 未解 | Memory shape、trajectory data、智能-知识边界 |
| 产品 | 客服已赢；UX（ambient、batch、Studio）是下一波差异化 |

### 对 builder

- 先修 **tool / terminal / browser** 接口，再堆 planner
- Error message、API 返回值按 **LM 可 self-correct** 设计
- 能 verified 的任务才适合 Reflection / auto research 式 loop

### 对研究者

- 做 benchmark 与做 method 同等「impactful」——激励结构正在慢慢变
- CoALA 三维 + ACI 行为实验是跨 HCI 的交叉机会
- Agent data = trajectory，不是 internet 上现成的 final answers

> **金句 · 姚顺雨（封底）**
> **中文：** 我们定义 agent 了吗？信息存储、动作空间、决策——三块够用了；剩下是在真实任务里把工具和环境设计对。
> **原文：** Three parts should just fully describe agent… the code associated with agent that calls neural network.

---

## 附录

### 章节导读（按 video_description 要点映射）

| 章 | 主题锚点 |
|----|----------|
| 01 | ReAct + 思考提升推理 |
| 02 | Reflection 局限（搜索 vs 反应） |
| 03 | 任务/基准滞后于方法 |
| 04 | ACI 关键；工具优化 > 复杂规划 |
| 05 | 记忆类型 + 智能/知识 + 轨迹数据 |
| 06 | 应用与 UX（研究型 / ambient / Studio） |

### Ingest 路径

- **ingest_dir：** `Recastory/workspace/bilibili-retranscribe/BV1tZw4zLEX8/ingest`
- **ASR：** `Recastory/workspace/bilibili-retranscribe/BV1tZw4zLEX8/article.md`
- **节目笔记：** https://latent.space/p/shunyu

### 相关阅读

- [[OpenAI研究员-Harness工程软件开发新范式]] — Harness / 上下文工程与 agent loop 产品化
- [[Karpathy爆火项目-AutoResearch解读与启发]] — 可验证 metric 驱动的自主 research loop（第三方解读）
- [[Cognition CPO-Devin的80%时刻与后台Agent]] — Devin 类 coding agent 产品视角
- [[MOC - Agent Theory and Design]] — Agent 设计横切索引
