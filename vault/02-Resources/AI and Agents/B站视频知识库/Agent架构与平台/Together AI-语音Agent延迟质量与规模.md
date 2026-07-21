---
title: "Together AI：语音 Agent 延迟、质量与规模"
tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering", "ai_evaluation"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering", "ai_evaluation"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Together AI 语音负责人 Rishabh：实时语音 Agent 的流水线架构；半秒延迟生死线、8–30B 模型预算、同址部署砍 30% 延迟、端到端 vs 级联、Thinker-Talker 兼顾安全与体验。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Together AI-语音Agent延迟质量与规模.md"
source_sha256: "f5b80f0ec8d5653ae819dfde503b41db363aae713e532fd1cfd15aad75e357ea"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1U4Tz6CEzu/"
host_name: "Moderator"
guest_name: "Rishabh"
guest_title: "Together AI Voice AI 负责人 · 前 Refuel 联合创始人/CEO"
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1U4Tz6CEzu/ingest"
speaker: "Moderator / Rishabh"
duration: "24:36"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1U4Tz6CEzu/article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2-asr"
dialogue_version: v3.2
genre: Host-Guest canonical (ASR primary)
speaker_inference: "solo_keynote_reframed_as_host_qa + video_description Guest=Rishabh + Q&A"
speaker_confidence: high
asr_version: v2
concepts:
  - id: half_second_deadline
    zh: 半秒生死线
    en: half-second latency deadline
    one_line: 超 500ms 拖沓，超 1–2s 用户挂断
  - id: cascading_pipeline
    zh: 级联流水线
    en: cascading / pipeline architecture
    one_line: STT → LLM → TTS，生产主流
  - id: colocation
    zh: "物理同址"
    en: colocation
    one_line: 模型与编排器同机房，网络延迟 75ms→5ms
  - id: thinker_talker
    zh: "思考者-表达者"
    en: thinker-talker pattern
    one_line: 小模型先缓冲口语，大模型带护栏做工具调用
  - id: speech_to_speech
    zh: "端到端语音"
    en: speech-to-speech
    one_line: 单模型保语气，但工具调用仍弱
author:
  - "[[Rishabh]]"
---

# Together AI：语音 Agent 延迟、质量与规模

**Host：** Moderator（会议主持 + 现场提问）  
**Guest：** Rishabh（Together AI Voice AI Lead · 前 Refuel 联合创始人/CEO）  
**形态：** Host-Guest canonical v3.2（**ASR 主源** · 主题演讲 reframed）  
**B 站：** [BV1U4Tz6CEzu](https://www.bilibili.com/video/BV1U4Tz6CEzu/) · **时长** ~24:36

---

## 开场

语音不是科幻，是工程题。每年仍有海量电话由人接：客服查单、改预约、挂号——人人都排过队。更有意思的方向是：语音成了新界面，人先会说话再会读写；ChatGPT 高级语音、对着 Cursor / Claude Code 口述干活，都只是开头。

Rishabh 在 Together AI 带语音团队（Refuel 被收购前是联合创始人）。议程五块：**为什么语音难** → **级联流水线拆件** → **同址与扩缩** → **端到端 vs 级联** → **护栏、Thinker-Talker 与评估**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 级联流水线 | cascading pipeline | STT→LLM→TTS，生产主流 |
| 首字延迟 | TTFT / time to first token | LLM 吐出第一个 token 的时间 |
| 首音频延迟 | TTFA | TTS 吐出第一段音频的时间 |
| 实时因子 | RTF | 生成 1 秒音频要多少秒算力，宜 <1 |
| 词错误率 | WER | 转写错词占比；关键词错了后面全错 |
| 轮次检测 | turn detection | 停顿是「说完了」还是「还在想」 |
| 物理共址 | colocation | 模型与编排器同数据中心 |
| 思考者-表达器 | thinker-talker | 小模型先垫话，大模型再干重活 |
| 全双工 | full duplex | 边听边回，可 backchannel |

---

## 01 半秒生死线：实时、智能、自然、可靠要同时成立

**Moderator：** 为什么现在聊语音 Agent？难在哪？

**Rishabh：** 人类对话大约 **300ms** 就接上。跟 AI 聊，**超过 500ms** 你会觉得拖；**一两秒**，人直接挂。延迟必须压下去。

第二，电话要办成事：指令复杂、歧义多，**工具调用** 是 agent 碰真实世界的入口——智能有底线。第三，声音要自然：语言口音、念对人名、情绪对得上。第四，demo 一人打通不难；**百、千、万路并发** 时可靠性才露馅。

这四件事 **必须同时解**。少一块，生产就麻烦。

> **金句：** 高品质、低延迟、可规模的语音对话，已不是科幻，主要是工程问题。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 半秒生死线 | half-second deadline | 500ms 体感边界，1s+ 挂断 |
| 工具调用 | tool calling | agent 改预约、查订单的通道 |

**小结：** 实时、办成事、听着像人、扛并发——四条一起过关，才叫生产级语音 Agent。

---

## 02 级联流水线：耳朵、脑子、嘴巴

**Moderator：** 生产里主流怎么搭？

**Rishabh：** 今天主导的是 **级联 / 管道架构**。用户音频流进编排器（Pipecat、LiveKit 或自研）→ **语音转文字** → **LLM**（是否工具调用、出文本）→ **文字转语音** → 音频流回用户。

**STT（耳朵）。** 质量看 **WER**——开源基准上 SOTA 大约 **6%** 量级；人名、药名等关键词错了，LLM 和 TTS 只会把错传下去。延迟看 **说完到转写就绪**；Together 上部分模型 **P90 ~100ms**。**轮次检测** 仍半开：停一秒是结束还是继续？Agent 抢话，人受不了。语言覆盖要广。架构上从 Whisper 式 **30 秒 batch** 往 **流式原生** 走：NVIDIA 一类模型用短 look-ahead（约 80ms–1s）+ 激活缓存，避免为 Whisper 硬做切块与静音填充。

**LLM（脑子）。** 首要指标是 **流式延迟 / TTFT**——大约 **200–300ms** 才够快喂 TTS。这把模型锁在大约 **80 亿到 300 亿** 参数：再大烧光预算，再小工具调用与复杂指令扛不住。

**TTS（嘴巴）。** 看 **首音频时间** 和 **RTF（宜 <1，否则要缓冲）**。质量没有单一客观分，**听样本** 仍最靠谱。还要多音色自然、念准客户/产品名、情绪标签（happy/angry/sad）与语言覆盖。

**预算粗排：** 延迟与成本上，**LLM 占大头，其次 TTS，再 STT**。

> 金句：关键词转写错了，后面没有「修」——错误会一路传到 TTS。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 级联流水线 | cascading architecture | 多模型编排，不是单黑盒 |
| 流式原生 STT | streaming-native ASR | 短 look-ahead + cache，告别 30s 批处理 hack |

**小结：** 三件套各有指标；LLM 吃掉大半延迟预算，模型尺寸被 TTFT 钉死。

---

## 03 同址、扩缩与全球部署

**Moderator：** 引擎延迟已经压到 100–200ms，为什么整体还是慢？

**Rishabh：** 因为还有 **网络延迟**。编排器在伦敦、LLM 在美国，跨大西洋一来一回；**75ms** 网络延迟在实时系统里已经很贵。把 STT、LLM、TTS 和编排器 **放进同一栋楼 / 同一数据中心**，网络可从 ~75ms 掉到 **~5ms**——在已经优化过的系统上，大约再砍 **30%**。实时系统里 **每 10ms 都值得观测**。

扩缩也别按异步服务那套：扩容要更激进，请求一积压用户就挂；缩容要小心 **有状态长连接**，不能随便杀 pod，得等会话结束。全球部署：模型尽量靠近用户；欧洲等有 residency 要求的区域还要能就地部署。

> 一句：同址不是「云厂商营销词」，是伦敦跑 agent、LLM 却在美国时，跨大西洋往返的物理账。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 物理同址 | colocation | 同数据中心，砍网络跳数 |
| 有状态连接 | stateful long-lived connections | 缩容要等通话结束 |

**小结：** 引擎优化到头，下一刀砍网络；同址是 30% 量级的杠杆。

---

## 04 端到端语音：诱人，但工具调用还没过关

**Moderator：** 能不能一个 speech-to-speech 模型全包？

**Rishabh：** 方向很诱人：少编排、语气情绪不丢、更易 **全双工**（边听边说、嗯嗯 backchannel）、打断更好处理。OpenAI Realtime、NVIDIA Voice Chat 一类都在走单模型。

生产里用得少，是因为 **指令遵循和工具调用仍弱**。常见路径：试一下 → 狂调 prompt → 最后还是退回级联。模型会变好；到那时，转写丢语气的问题会消失，打断与全双工工程量也会小很多。眼下大量语音界面，工程债还在。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 端到端语音 | speech-to-speech | 单模型；保韵律，工具调用仍弱 |
| 全双工 | full duplex | 边收边播，像真人插话 |

**小结：** 未来可能是端到端；今天商业确定性仍押在级联。

---

## 05 评估、护栏与 Thinker-Talker

**Moderator：** 上线前 eval 怎么设？分数多少算够？

**Rishabh：** 经典答案：看场景。级联下可 **分件评估**——STT/TTS 过关后，LLM 侧工具调用 eval 跟通用 tool-calling 类似：结构是否近 100%、参数是否可执行、结果是否对。结构正确率要极高；语义正确率看业务。

因为 LLM 必须偏小，客户常 **用场景数据微调小模型**，把工具调用质量拉上去，同时守住延迟预算。

**Moderator：** 中间再塞分类器、护栏呢？

**Rishabh：** 参考架构最简；生产常在主 LLM 前加分类器（退款 vs 查单），生成后再加 **guardrail**。每加一层就挤 latency，要给每层 **明确 SLA 预算**，并独立扩缩。没有银弹。

**Moderator：** 又要安全又要半秒，怎么办？

**Rishabh：** 一种模式是 **Thinker-Talker**：小 LLM 先接 STT，吐「让我想想 / 稍等」这类缓冲，并 **工具调用** 到更大、指令更全、护栏更重的模型；干净回复再进 TTS。组件可叠，但可靠性与 **逐组件可观测** 压力更大。

端到端路径上，可并行跑转写做审计；eval 会从分件变成 **整段全双工对话** 指标。

> **金句：** 组件你只会越加越多——所以每个组件都要有清晰预算和观测。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 思考者-表达器 | thinker-talker | 小模型垫场，大模型干重活 |
| 分件评估 | component-wise evals | STT/LLM/TTS 分开过关 |

**小结：** 护栏与路由会挤延迟；Thinker-Talker 用「先开口、后算清」换体验与安全。

---

## 总结

| 维度 | 要点 |
|------|------|
| 死线 | 人类 ~300ms；AI >500ms 拖沓，1–2s 挂断 |
| 架构 | 生产主流：STT→LLM→TTS 级联；编排器 + 可观测 |
| 尺寸 | TTFT ~200–300ms → LLM 约 8–30B；小模型 + 微调抬工具调用 |
| 同址 | 网络 75ms→5ms 量级，整体可再砍 ~30% |
| 端到端 | 保语气、全双工好；指令与工具调用未过关前难上生产 |
| 模式 | Thinker-Talker：缓冲口语 + 大模型护栏工具调用 |

---

## 附录

### 章节时间戳（视频简介）

| 时间 | 主题 |
|------|------|
| 01:35 | 延迟超半秒 → 用户挂断 |
| 07:22 | 首字延迟限制模型规模（约 8–30B） |
| 11:15 | 物理同址降约三成网络延迟 |
| 12:35 | 端到端受限于工具调用；生产偏级联 |
| 19:40 | 思考者-表达者模式 |

### Ingest

- BV：`BV1U4Tz6CEzu`
- ingest：`Recastory/workspace/bilibili-retranscribe/BV1U4Tz6CEzu/ingest`
- ASR：`.../BV1U4Tz6CEzu/article.md`
- 专栏：无（A-dialogue · ASR 主源）
- Guest 名：导读与身份句为 **Rishabh**（ASR 听成 Rshop）

### 相关阅读

- [[Cloudflare专家-Sandbox确保AI代码安全]] — Agent 跑代码的另一条实时约束：沙盒与能力边界
- [[Anthropic团队-如何构建运行数小时的Agent]] — 长时 Agent；本篇是实时语音的另一极
- [[Qodo研究员-长上下文越多Agent越笨]] — 上下文与智能的工程权衡
- [[Cursor实战-零代码构建语音助手Jarvis]] — 用 Cursor + 实时语音搭语音助手，印证本篇"半秒生死线 / 级联流水线"
- [[Vercel 团队-Nico Albanese 给智能体一台电脑]] — Agent 生产化另一极：agent runtime 三支柱（指令 / 工具 / 沙盒）
- [[2026 年 Agent 最重要的工程概念 Harness Engineering]] — 逐组件预算 / SLA / 同址 = harness 在实时语音场景的硬约束
- [[MOC - Agent Theory and Design]] — 入口
- [[MOC - Harness Engineering]] — 编排、可观测、预算同属 harness 问题
