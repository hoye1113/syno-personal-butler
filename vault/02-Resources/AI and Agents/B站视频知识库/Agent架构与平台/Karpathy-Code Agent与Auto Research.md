---
title: "Karpathy：Code Agent 与 Auto Research"
tags: ["ai_agent", "video_transcript", "bilibili", "loop_engineering", "ai_coding", "claude_code"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "loop_engineering", "ai_coding", "claude_code"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV1dwAczDEXY/"
description: "Karpathy × No Priors（非 BV11nRmB1EkH 主题演讲）：AI psychosis、token 吞吐量、Claw/Dobby 全屋、AutoResearch/program.md、锯齿智能与 RL、开源滞后 8 月、MicroGPT 面向代理的教育。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Karpathy-Code Agent与Auto Research.md"
source_sha256: "b3eda2fa43a8b2dafa076924984b1609b192589ccb7b96f8c4463927ca23855a"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1dwAczDEXY/"
source_original: "https://www.nopriors.com/"
source_original_date: "2026-03"
host_name: "No Priors"
guest_name: "Andrej Karpathy"
guest_title: "前 OpenAI / Tesla Autopilot · Eureka Labs"
material_tier: A
content_form: dialogue
dialogue_fidelity: source
question_source: transcript
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1dwAczDEXY/ingest"
speaker: "No Priors / Andrej Karpathy"
duration: "66:32"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "bilibili-retranscribe/BV1dwAczDEXY/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Host-Guest canonical (ASR primary)
speaker_inference: "asr_heuristic + video_description timestamps + No Priors intro"
speaker_confidence: high
factual_status: partial
factual_reviewed: 2026-07-13
spot_check: 2026-07-13
verification_basis:
  - transcript
  - transcript_json
  - original_page
unresolved_facts:
  - "长视频中的时间、开源滞后月份和直接引语尚未逐条核验；本轮仅完成四点抽样。"
asr_version: v2
duplicate_note: "与 BV11nRmB1EkH（AI SF 主题演讲：Software 3.0 / Vibe vs Agentic Code）不同源；本篇聚焦 No Priors 播客：Code Agent 工作流、AutoResearch、Claw、开源与教育。"
author:
  - "[[Andrej Karpathy]]"
concepts:
  - id: token_throughput
    zh: Token 吞吐量
    en: token throughput
    one_line: 个人瓶颈从 GPU flops 变成能指挥多少 agent token
  - id: auto_research
    zh: 自动研究
    en: AutoResearch
    one_line: 定 metric 后让 agent 改 train.py、短训、留 winner，人退出 loop
  - id: program_md
    zh: 研究组织 Markdown
    en: program.md
    one_line: 用 Markdown 描述研究流程，meta 层优化「研究组织代码」
  - id: jagged_intelligence
    zh: 锯齿状智能
    en: jagged intelligence
    one_line: RL 可验证域超强，笑话/微妙意图等域停滞
---

# Karpathy：Code Agent 与 Auto Research

**Host：** No Priors（播客）  
**Guest：** Andrej Karpathy（Andrej Karpathy）  
**形态：** Host-Guest canonical v3.2（**ASR 主源**）  
**B 站：** [BV1dwAczDEXY](https://www.bilibili.com/video/BV1dwAczDEXY/) · **时长** ~66 min  

> **去重说明：** 同 UP 主 [BV11nRmB1EkH](https://www.bilibili.com/video/BV11nRmB1EkH/) 为 **AI SF 现场主题演讲**（Software 3.0、Vibe Coding vs Agent Engineering、招聘、动物 vs 幽灵）。**本篇**为 **No Priors 播客**，重心在 **2025 年 12 月后的 code agent 工作流、Claw、AutoResearch、开源与教育**——可并存，标题已区分焦点。

---

## 开场

Karpathy 说自己在 perpetual **AI psychosis**：12 月能力 jump 之后，他几乎不再手写代码，转而「16 小时/day 向 agent 表达 will」。Conviction 团队里工程师 whisper 给 agent——曾经觉得疯，现在承认那是 ahead of curve。这期按 B 站导读六段：**意愿表达与 token 吞吐量** → **Claw / 多比管家** → **AutoResearch 与 program.md** → **RL 边界与锯齿智能** → **开源滞后 ~8 月** → **MicroGPT 与面向代理的教育**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| AI 精神错乱期 | AI psychosis | 能力 unlock 后持续探索 agent 上限的状态 |
| Token 吞吐量 | token throughput | 单位时间消耗/指挥的 model tokens，新瓶颈 |
| 爪子实体 | Claw | 高持久性、记忆、后台自主运行的 agent 层 |
| 自动研究 | AutoResearch | nanoGPT 式 repo：agent 改训练代码、5 分钟短训、metric 留优 |
| 研究程序文档 | program.md | Markdown 写研究 SOP，优化「研究组织」而非手改 Python |
| 锯齿状智能 | jagged intelligence | 可验证域超强 vs 非 RL 域（笑话等）停滞 |
| 可验证域 | verifiable domains | 有客观反馈、适合 RL 的任务（code、math、kernel） |

---

## 01 [01:10] 编程范式转向意愿表达：Token 吞吐量

**Host：** 你说 locked in、一天 16 小时「向 agent 表达 will」——到底发生了什么？

**Karpathy：** 12 月 **capability jump** 是 stark transition。之前 80/20 手写 vs 委托；现在 **2080 甚至更高**——自 12 月起几乎没 typed a line。Random software engineer 的 default workflow 已 fundamentally different，普通人还没意识到有多 dramatic。

瓶颈从 typing speed 变成：**怎么不只开一个 Claude Code/Codex session？怎么 parallelize？怎么 appropriately 指挥多个 agent？** Peter Steinberger 那张图——一排 monitor 上多个 Codex，各 ~20 分钟 high effort，checkout 不同 repo——你在 **macro actions** 层移动：这个功能给 agent 1，不冲突的功能给 agent 2，再 review。另一个 agent 做 research、写 plan。Conviction 团队全员 whisper 给 agent——我一度觉得 crazy，现在 fully accept。

**Skill issue framing：** 失败时多半不是 capability 不够，是你 **instructions / memory tool / harness** 没配好。GPU 时代 nervous 当 flops 没跑满；现在是 **token throughput**——subscription 用不完说明没 maximize。Interesting flip：十年里 engineer 不 compute-bound，现在 **human is binding constraint**—— empowering，因为有 unlock path。

**Host：** 一年后 mastery 长什么样？

**Karpathy：** 往上走 stack：单 session → 多 agent 协作 → **Claw** 层把 persistence 推到新 level——后台 loop、sandbox、不在场也替你干活、更 sophisticated memory（OpenClaw 默认 memory compaction 之上）。Agent part 已是 taken for granted；接下来是 **entities、instructions、对 instructions 的 optimization**——infinite，everything skill issue，所以 psychosis。

> **金句 · Karpathy**
> **中文：** 瓶颈从「算力跑满了吗」变成「你的 token 吞吐量是多少」——人成了系统里卡脖子的那一环。
> **原文：** It used to be about GPU capability… now it's about tokens. What is your token throughput?

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 宏观动作 | macro actions | 委托整块功能/研究，而非逐行改 code |
| 并行会话 | parallel agent sessions | 多 repo / 多任务同时跑 |
| 技能问题框架 | skill issue | 失败归因于 harness 配置而非模型不行 |
| 高投入模式 | high effort (Codex) | 单次 ~20 分钟深度 agent run |

**本章小结**

- 12 月后 default：表达 will → 多 agent 并行 → 最大化 token 使用
- Mastery = macro-action muscle + 多 harness 切换（Codex/Claude 等）
- Human bottleneck 是 feature：可训练、可进步

---

## 02 [08:45] Claw 模式：多比管家与 App Store 失效

**Host：** OpenClaw 火在哪？你 personally 用 Claw 做了什么？

**Karpathy：** Peter 同时在 **五处创新**：SOUL.md personality（Codex dry vs ChatGPT upbeat）、memory、WhatsApp 单入口、fun factor。Personality matters——Claude 的 praise 要「略 deserve」才 weirdly motivating。我 1 月 **Claw psychosis week**，造 **Dobby Delphini** 管全屋：agent **LAN IP scan** 找 Sonos——无密码直接 API；reverse engineer endpoint，三 prompt 就播放音乐。同样 hack Philips Hue、HVAC、shade、pool/spa、**security camera + Quinn 视觉**——FedEx 车到门口 WhatsApp 推图+文字。

以前 **六个 app** 控智能家居，现在 **Dobby 自然语言**——印证：**App Store 里很多 bespoke app 不该存在**，应是 API + agent glue。Treadmill app 记录 cardio 也要走 web UI flow——应 expose API，**customer 是 agent 不是 human**。Industry 大 refactor：error message 给 LM 自修正、search API 返回小清晰字段非 giant JSON——**ACI** 创业潮刚起。

我 week of claw 后 distracted 去 auto research；email/calendar **还没给 full access**——security/privacy 仍 cautious。Peter 五维创新同时做对，humility 但 impact 巨大。

> **金句 · Karpathy**
> **中文：** LLM 太 raw，不够格当普通人心里的「AI」——要 persona、记忆、WhatsApp 后面那个实体。
> **原文：** LLMs are too raw of a primitive to typecheck as AI for most people.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 灵魂文档 | SOUL.md / personality crafting | agent 可感知的人设与语气 |
| 本地网扫描 | LAN IP scan | agent 自建智能家居 API 的发现步骤 |
| 智能体优先工具 | agent-first tools | API 为 agent 可读可调用而设计 |
| 碎片化 App 融化 | app crumble / glue | agent 用自然语言统一多厂商设备 |

**本章小结**

- Claw = persistence + memory + personality + 单 messaging 入口
- 家居自动化是「table stakes will be free in 1–2 years」的 preview
- 安全边界：full digital life access 仍需谨慎

---

## 03 [18:30] AutoResearch：退出 loop 的递归改进

**Host：** AutoResearch 动机？你 surprised 它有效？

**Karpathy：** Tweet 核心：**remove yourself as bottleneck**——maximize token throughput **not in the loop**。AutoResearch 是 implication：不想当 researcher in loop 看结果；**refactor abstractions 一次，hit go**。

nanoGPT / nanochat 是 **playpen for recursive self-improvement**——frontier labs 都在做类似事。我 hand-tuned 两 decade 的 hyperparam，以为已经 well tuned；**overnight auto research** 仍找到 weight decay on value embeddings、Adam betas 等 joint interaction——我不该当 bottleneck。

**program.md** 是我 crappy 的「研究组织代码」——markdown 写：先试 architecture、再 optimizer… 未来 **meta 层**是不同 program.md 竞赛（my contest idea：同 hardware 谁 val 提升最多→用数据写 better program.md）。Layer onion：LLM taken for granted → agent → **Claw entities** → instructions → **optimize instructions**——psychosis 来源。

Caveats：**(1)** 只适用于 **objective metrics easy to evaluate**（kernel 优化 perfect fit）；**(2)** 整体仍 bursting at seams——brilliant PhD student + 10-year-old jaggedness，agent 浪费 compute 仍 annoy。

> **金句 · Karpathy**
> **中文：** 研究组织就是一堆 Markdown 文件——描述角色与连接；更好的 org chart 可以 meta 优化。
> **原文：** Every research organization is described by program.md… you can imagine tuning the code.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 验证比特/字节 | val_bpb (bits per byte) | AutoResearch 默认优化目标 |
| 5 分钟训练预算 | fixed 5-min training budget | 公平比较、一夜 ~100 experiments |
| 递归自我改进 | recursive self-improvement | LLM 改 LLM 训练栈的闭环 |
| 研究组织代码 | research org code (program.md) | 人的产出从改 Python 转向改 agent 指令 |

**本章小结**

- AutoResearch = 可验证 metric + 自主 loop + 人只写边界
- program.md 是下一层 optimize 对象；contest 式 meta 竞争可想象
- 非 verifiable 任务不能 auto research；整体系统仍 jagged

---

## 04 [26:15] 锯齿智能：RL 只优化有轨道的回路

**Host：** 模型 code 超强却讲旧笑话——generalization 假说成立吗？

**Karpathy：** **Jaggedness**：同时像 brilliant systems programmer 与 10-year-old。**Verifiable + RL** 的轨道里 fly——code agent 跑 hours；**off rails**（joke、nuance、clarifying questions）meander。ChatGPT 笑话仍是 **「Why don't scientists trust atoms? Because they make up everything」**——三四年前的 joke，因 **outside RL** 没改进。

Labs 推 **monoculture oracle**——参数里塞一切；应 expect **speciation**：更小 model 有 cognitive core + domain specialize（Lean 数学等）。Touch **weights** 比 context 难——continual learning / fine-tune without catastrophic forgetting 仍 developing；context window cheap 故先靠它 customization。

**Open-ended research（open-garden 延伸）：** untrusted worker pool + cheap verify——像 folding@home：commit 链、proof-of-work 是搜 experiment、verify 是跑一轮 train。Swarm 或 circle frontier labs——**compute 贡献**替代纯 dollar（flop 稀缺时）。

> **金句 · Karpathy**
> **中文：** 你在 RL 轨道上就以光速飞；不在轨道上，就像五年前的笑话一样停滞。
> **原文：** If you're on the rails… you fly at speed of light. If you're not, you're outside of what's being improved.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 强化学习轨道 | RL rails | 有 reward 反馈的能力回路 |
| 模型物种分化 | model speciation | 专精小模型 vs 全能 oracle |
| 廉价验证 | cheap verification | 难找 commit、易跑实验验证（auto research 扩展） |
| 权重 touch | touching weights vs context | 深改模型比改 context 难且贵 |

**本章小结**

- Jaggedness 是 RL 训练分布的果，非「变聪明一切等比变聪明」
- Speciation 会来，但 science of manipulating brains 未成熟
- Auto research 可扩展到 untrusted compute swarm（verify-heavy）

---

## 05 [45:20] 开源与闭源：八个月滞后的健康动态

**Host：** 开源追近 frontier 有多 surprise？长期预测？

**Karpathy：** Closed ahead；开源 **~8 months behind**（从 18 月 convergence）。**Linux analogy**：行业需要 common open platform 安全感——consumer use case 开源已够好；**frontier intelligence** 像 Nobel Prize / 把 Linux C→Rust 级大工程。Today’s frontier 年底或变 open source 干活的 tier——dynamic **continue** 是 pretty good setup。

**Systemic risk：** 全 closed oracle centralization 历史 track record 差（Eastern European precedents…）。Want **ensemble of labs/people** in the room——ML 里 ensemble beats single model；**two people in closed room** not good feature。Open source slightly behind **actually good**——power balance。

Robotics / atoms：**lag digital**——self-driving 十年教训：大量 capex、多数 startup 没 long-term make it。Digital 先 **100× unhobbling**（bits easy）；然后 **sensor/actuator 接口**公司（Periodic Labs、paid human training data）；physical TAM 更大但 **million times harder**。当前 main interest：digital → digital-physical interface → 更晚 physical mass。

> **金句 · Karpathy**
> **中文：** 开源落后闭源几个月， accident 上可能是生态最优——前沿闭源、底座开源。
> **原文：** Open source slightly behind… actually kind of a good thing. Pretty decent power balance.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 收敛滞后 | convergence lag (~8 months) | 开源相对闭源能力差距的 industry 观测 |
| 数字解绑 | digital unhobbling | 已有数字信息被 AI 重写的效率爆发 |
| 比特 vs 原子 | bits vs atoms | 软件/agent 快；物理世界慢一个数量级以上 |
| 信息市场缺失 | information markets | agent 愿付费获取 Tehran 照片等仍无机制 |

**本章小结**

- 8-month lag + frontier closed ≈ 可接受的 industry equilibrium
- 工作机会：digital refactor 先爆发；healthcare 等 physical 滞后
- Jobs 数据可视化：digital manipulation 职业先变；Ge's paradox 或增 software demand

---

## 06 [58:10] MicroGPT：教育面向代理，而非面向人

**Host：** microGPT 是什么？教育怎么变？

**Karpathy：** 十年 obsession：**boil LLM to essence**。microGPT **~200 行 Python**（含注释）——data、50 行 arch、autograd ~100 行、Adam ~10 行、training loop；其余 complexity 都是 **efficiency 代码**，slow 无所谓则 algorithm 就这点。

以前我会做 **video 逐步讲给人**——现在停手：200 行任何人让 agent explain 更好。**Education redirect：** 我 explain to **agents**；写 **skill** 描述 curriculum progression（先读哪函数再读哪）。Agent 无限耐心、多语言、按水平讲——human 从 agent 学，不是从我学。

**Agents can't write microGPT**——我 prompt「 boil down simplest」失败；200 行是我的 value add，**trust me can't simpler**。Documentation 目标：**Markdown for agents** not HTML for humans——library docs 应是 agent-ingestible，agent 再 redirect human。Eureka Labs 方向：**experts distill essence → teach agents → agents teach everyone**。

Frontier lab 内 vs 外：ecosystem role impact 可很大；frontier 内 alignment/financial pressure 限制 **free agent** 发言——Noam 类人内外都可 amazing impact；ideal **go back and forth**。

> **金句 · Karpathy**
> **中文：** 别再直接教人了——把东西教给 agent；agent 会比你更好地教人类。
> **原文：** I'm explaining things to agents… if the agent gets it, they'll do the explanation.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 微型 GPT | microGPT (~200 LOC) | 去效率代码后的 LLM 训练算法本质 |
| 教学技能 | skill (curriculum) | 给 agent 的进度提示，替代人类课程视频 |
| 代理可读文档 | markdown for agents | API/docs 优先让 agent 解析再转述人 |
| 内外往返 | go back and forth (lab ↔ ecosystem) | 保持 frontier 感知与独立发言的平衡 |

**本章小结**

- microGPT = 人类仍擅长的「不可再简」算法蒸馏
- 教育链：专家 → agent（skill/docs）→ 个性化 human
- 写 docs 默认 audience 从 developer 换成 agent

---

## 总结：Loopy 时代的人机分工

| 维度 | 要点 |
|------|------|
| 工作方式 | 意愿表达 + 多 agent 并行；token throughput 是新 KPI |
| Claw | Personality + memory + messaging 入口；家居是 preview |
| AutoResearch | Verifiable metric → 人写 program.md → 永久 loop |
| 能力形状 | Jagged；笑话 off-rails，code on-rails |
| 生态 | 开源 -8mo 健康；digital 先 rewrite，atoms 后 |
| 教育 | Teach agents first；microGPT 是人类压缩知识的上限示范 |

### 与 BV11nRmB1EkH 分工

| 篇 | 形态 | 重心 |
|----|------|------|
| **本篇 BV1dwAczDEXY** | No Priors 播客 | Psychosis、Claw/Dobby、AutoResearch、开源、MicroGPT |
| BV11nRmB1EkH | AI SF 主题演讲 | Software 3.0、Vibe vs Agent Engineering、招聘、理解不可外包 |

### 对 builder

- 订阅用不完 = skill issue；并行 macro actions 练 muscle memory
- 可验证 metric 的任务优先 auto loop；soft intent 仍要 human in loop
- Docs/API 按 **agent legibility** 重写

> **金句 · Karpathy（封底）**
> **中文：** LLM、agent、Claw、指令、指令优化——一层层剥洋葱；每层都 infinite，所以叫 psychosis。
> **原文：** The LLM part is taken for granted… now optimization over the instructions… this is infinite and everything is skill issue.

---

## 附录

### 章节时间戳（video_description）

| 时间 | 章 |
|------|-----|
| [01:10] | 意愿表达 / token 吞吐量 |
| [08:45] | Claw / 多比管家 |
| [18:30] | AutoResearch / program.md |
| [26:15] | RL 边界 / 锯齿智能 |
| [45:20] | 开源闭源 ~8 月 |
| [58:10] | MicroGPT / 代理教育 |

### Ingest 路径

- **ingest_dir：** `Recastory/workspace/bilibili-retranscribe/BV1dwAczDEXY/ingest`
- **ASR：** `Recastory/workspace/bilibili-retranscribe/BV1dwAczDEXY/article.md`

### 相关阅读

- [[Karpathy爆火项目-AutoResearch解读与启发]] — AutoResearch loop 第三方解读与商业用例
- [[OpenClaw创始人-我是如何使用OpenClaw的]] — Peter Steinberger Claw 实践（与本篇 Dobby 呼应）
- [[MOC - Harness Engineering]] — Harness / agent 编排横切
- [[MOC - Agent Theory and Design]] — Agent 设计索引
