---
title: "DeepMind CEO：AI 未来 10 年科学与技术发展"
tags: ["ai_agent", "ai_philosophy", "bilibili", "video_transcript"]
legacy_tags: ["ai_agent", "ai_philosophy", "bilibili", "video_transcript"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV1QSzzBfELB/"
description: "Demis Hassabis × Hannah Fry：智能体 AI 元年、根节点科学（AlphaFold→核聚变→量子纠错）、锯齿状智能、AlphaGo 式推理与持续学习缺口、扩展×创新各半、合成数据与幻觉置信度。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/DeepMind CEO-AI未来10年科学与技术发展.md"
source_sha256: "13b9201619324d058d759016ceb1004fc5cc195224acd06653086204a59703b9"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1QSzzBfELB/"
column_url: "https://www.bilibili.com/read/cv44988152/"
source_original: "Google DeepMind Podcast"
host_name: "Hannah Fry"
guest_name: "Demis Hassabis"
guest_title: "Google DeepMind CEO 兼联合创始人"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1QSzzBfELB/ingest"
speaker: "Hannah Fry / Demis Hassabis"
duration: "~68 min"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1QSzzBfELB/article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1QSzzBfELB/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article（S 级专栏图稿，Host/Guest 已标注）"
speaker_confidence: high
uploader: Easonlee的AI笔记
author:
  - "[[Demis Hassabis]]"
concepts:
  - id: jagged_intelligence
    zh: 锯齿状智能
    en: jagged intelligence
    one_line: 奥数金牌级与高中级失误并存，缺全面一致性
  - id: root_node_problems
    zh: 根节点问题
    en: root node problems
    one_line: 解一个基础科学难题，解锁整条下游效益链
  - id: online_learning
    zh: 在线持续学习
    en: online / continual learning
    one_line: 部署后像人一样在现实世界里持续更新，而非只预训练一次
  - id: synthetic_data
    zh: 合成数据
    en: synthetic data
    one_line: 在可验证领域自生成无限训练数据，缓解数据耗尽
  - id: confidence_score
    zh: 置信度分数
    en: confidence score
    one_line: 像 AlphaFold 那样告诉用户答案有多可靠，该拒答就拒答
---

# DeepMind CEO：AI 未来 10 年科学与技术发展

**Host：** Hannah Fry（Google DeepMind 播客 · 伦敦大学学院数学教授）  
**Guest：** Demis Hassabis（Google DeepMind CEO 兼联合创始人）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `BV1QSzzBfELB/ingest/column_article.md`  
**B 站：** [BV1QSzzBfELB](https://www.bilibili.com/video/BV1QSzzBfELB/) · **专栏：** [cv44988152](https://www.bilibili.com/read/cv44988152/) · **时长** ~68 min

---

## 开场

Google DeepMind 播客年度收官，Hannah Fry 把 Demis Hassabis 请回来，问题比产品发布大一圈：**AI 下一程往哪走？哪些科学和技术问题会定调未来十年？**

2025 对 AI 是疯的一年——重心从大型语言模型滑向 **智能体 AI**，药物发现、机器人、自动驾驶都在吃多模态红利。Hassabis 的判断更狠：**感觉我们把十年的进展挤进了一年**。Gemini 3 刚发，世界模型这个夏天也让他兴奋。

这场对谈五条线：**根节点科学**（AlphaFold 五年后的材料、核聚变、量子纠错）→ **锯齿状智能**（奥数金牌却数错字母）→ **还在 AlphaGo 阶段**（缺搜索式推理与持续学习）→ **科学理想与聊天机器人现实** → **扩展没撞墙，创新不能停**。和 [[DeepMind CEO-AGI倒计时2030年见分晓]]、[[DeepMind CEO-为什么AGI比工业革命大10倍]] 是同一人物的三张切片：倒计时讲时间表，工业革命讲规模，这篇讲 **下一十年该押哪些硬问题**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 智能体 AI | agentic AI | 不只聊天，能规划、调工具、长程执行任务 |
| 世界模型 | world model | 让 AI 在脑子里模拟物理/环境，再行动 |
| 根节点问题 | root node problems | 攻克一个基础难题，下游应用成片解锁 |
| 锯齿状智能 | jagged intelligence | 顶尖任务超强，基础逻辑却露馅，表现极不均衡 |
| 在线持续学习 | online / continual learning | 上线后还在现实里学，不是训完就冻结 |
| 合成数据 | synthetic data | 系统自己造训练数据，尤其在可验答案的领域 |
| 边际效益递减 | diminishing returns | 每次迭代仍涨，只是涨幅不像早期那么陡 |
| 置信度分数 | confidence score | 像 AlphaFold 告诉你结构预测有多靠谱 |

---

## 01 十年挤进一年：从语言模型到智能体与世界模型

**Hannah：** 欢迎回到播客。今年 AI 到底发生了什么？如果只能抓一个变化，你会选什么？

**Demis：** 很高兴回来。就像你说的，事太多了——**感觉我们把十年的进展挤进了一年**。

模型进步是肉眼可见的。**Gemini 3 刚发布**，多模态各方面都往前走了一大步。今年夏天我特别兴奋的是 **世界模型** 的进展——让 AI 不只「说」，还能在内部模拟环境、推演后果。这跟智能体 AI 是连着的：重心已经从「大型语言模型」明显转向 **智能体**——能规划、能调用工具、能在真实任务里跑长程。

你也在节目里聊过药物发现加速、多模态进机器人和自动驾驶。这些不是孤立产品，是同一条曲线上的不同切面。我们站在年度最后一期，我想退后一步看：** headlines 之外，科学和技术哪些问题会定义下一阶段？** 那就是今天想聊的。

**Hannah：** 观众常觉得「又发布一个模型」——跟「定义未来十年」之间，差在哪？

**Demis：** 差在 **根节点** 和 **系统能力** 两条线。模型发布是能力快照；未来十年要看我们能不能用 AI 解开一批 **基础科学难题**，同时把 **推理一致性、持续学习** 这些 AGI 拼图补上。前者改变能源、材料、生命；后者决定这些能力可不可靠、能不能托付给社会。两条线缠在一起，才谈得上真正的下一阶段。

> **金句 · Demis Hassabis**
> **中文：** 感觉我们把十年的进展挤进了一年——模型和世界模型都在抬升，智能体 AI 才是新的重心。
> **原文：** It feels like we've compressed a decade of progress into a year—the shift from large language models to agentic AI, plus world models, is defining the next phase.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 智能体 AI | agentic AI | 能规划、调工具、跑长程，不只生成文本 |
| 世界模型 | world model | 内部模拟环境再决策，机器人/自动驾驶的关键 |
| 多模态 | multimodal | 同一模型处理文本、图像、视频等 |

**本章小结**

- 2025 的主线不是「又一个聊天模型」，而是 **智能体 + 世界模型** 落地
- Hassabis 用「十年挤进一年」描述节奏——与 [[DeepMind CEO-为什么AGI比工业革命大10倍]] 的变局叙事同频，本篇偏 **技术路线图**

---

## 02 根节点兑现：AlphaFold 五年后，轮到材料、核聚变与量子

**Hannah：** 第一次采访你，你讲过 **根节点问题**——用 AI 解一个基础难题，下游效益成片释放。五年过去了，AlphaFold 已是标杆。还有哪些在路上，哪些快成了？

**Demis：** 当然。**AlphaFold 2 向世界发布快五年了**——时间真快。它证明了一件事：**根节点型问题是可以被 AI 解开的**。

我们现在在铺所有其他方向。**材料科学** 是重点——室温超导体、更好的电池，各种更优材料都在计划里。**核聚变** 是刚宣布的深度合作：我们跟 Commonwealth Fusion 绑得更紧，他们在传统托卡马克路线上可能是离可行最近的一批初创。我们想帮他们 **用磁体约束等离子体**，也可能参与 **材料设计**，把进程往前推。

还有 **量子**：Google 量子 AI 团队在做纠错码，我们用机器学习帮他们啃 **纠错码** 这块硬骨头——也许有一天量子侧也能反哺我们。

**Hannah：** 核聚变为什么在你心里仍是「圣杯」？跟太阳能不冲突吗？

**Demis：** 核聚变一直是圣杯。太阳能也很有前景——说白了，是在用天空里现成的 **核聚变反应堆**。但如果我们能做出 **模块化核聚变堆**，那才是真正的圣杯，也是应对气候的一条路。

一旦能源 **真正可再生、清洁、超级便宜——几乎免费**，很多今天够不着的事会突然变得可行。**海水淡化** 可以在更多地方建；海里有大量氢氧，拆出来就是火箭燃料，只是极耗能——能源便宜又干净，就可以 **24 小时不停** 地造。能源这条根节点，直接打气候和污染；间接解锁的是 **水资源、航天燃料** 一整串下游。

> **金句 · Demis Hassabis**
> **中文：** AlphaFold 证明根节点能解开；材料、核聚变、量子纠错，是下一批要赌的硬问题。
> **原文：** AlphaFold proved root-node problems can be cracked; materials, fusion, and quantum error correction are the next bets.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 根节点问题 | root node problems | 解一个基础科学卡点，下游应用连锁解锁 |
| 托卡马克 | tokamak | 磁约束核聚变的主流装置路线 |
| 纠错码 | error correction codes | 量子计算里对抗噪声、保真计算的关键 |

**本章小结**

- AlphaFold 是 **根节点战略** 的已兑现样本；材料 / 核聚变 / 量子是同一 playbook 的延伸
- 能源若「几乎免费且清洁」，改变的不只是发电，而是 **水、燃料、气候** 整条链

---

## 03 奥数金牌却数错字母：锯齿状智能与推理核对

**Hannah：** 你们在国际数学奥林匹克拿奖牌，可同一套模型在高中数学、日常逻辑上会犯很基础的错。这悖论怎么解？

**Demis：** 对，这太迷人了——可能是 **还没到 AGI 之前必须解决的关键问题之一**。

我们和其他团队在 **IMO 拿金牌**，那些题只有世界顶尖学生才解得动。可你自己用聊天机器人也会看到：逻辑题上犯 **微不足道** 的错；国际象棋也还下不好——挺让人意外的。缺的是 **全面的一致性**。

大家叫 **锯齿状智能**：某些维度博士级，另一些维度连高中都不到。表现极不均衡——这边超强，那边还很基础。必须把坑填平。

原因不止一个。有时是 **感知和标注**——比如你让它数单词里的字母，它可能漏看单个字母。有时是 **推理和思考** 本身。我们现在有「思考系统」，会花更多时间推，输出更好——但在一致性上还不够：有没有 **有效利用思考时间去核对**？会不会 **调工具验输出**？我觉得在路上，大概 **只完成了 50%**。

**Hannah：** 所以「会思考」不等于「思考完会自查」？

**Demis：** 正是。长思考链只是第一步；**核对、拒答、置信度** 才是把锯齿磨平的关键。这跟后面要聊的幻觉、AlphaFold 式置信度是同一族问题——模型得知道自己什么时候 **不该硬答**。

> **金句 · Demis Hassabis**
> **中文：** 锯齿状智能：奥数金牌和数错字母可以同时出现在一个系统里——缺的是全面一致，以及思考后的核对。
> **原文：** Jagged intelligence—IMO gold and trivial logic errors in one system—means we lack holistic consistency and verification after reasoning.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 锯齿状智能 | jagged intelligence | 能力分布极不平，顶尖与低级失误并存 |
| 思考系统 | thinking / reasoning systems | 推理时花更多 compute 换更好答案 |
| 核对 | verification | 用工具或二次推理检验输出是否自洽 |

**本章小结**

- 「强 benchmark + 弱日常逻辑」不是偶发 bug，是 **一致性架构** 未完工的信号
- 思考链进度 Hassabis 自估约 **50%**——后半程是 **核对、工具验、该拒则拒**

---

## 04 还在 AlphaGo 阶段：搜索、AlphaZero 与持续学习

**Hannah：** 我会想起 AlphaGo 和 AlphaZero——去掉人类棋谱，模型反而更强。今天的大模型，有「科学或数学版 AlphaZero」吗？

**Demis：** 我觉得 **今天建的更像 AlphaGo，还不是 AlphaZero**。

这些大型语言模型、基础模型，起点是 **人类知识**——互联网上几乎所有上传的东西，压成可查询、可泛化的表示。但我们 **还没能像 AlphaGo 那样，在模型之上做搜索或思考**——去 **引导有用的推理路径、规划想法、选出当时问题的最优解**。所以我不认为我们被互联网人类知识 **卡死了**；主要问题是 **还不知道怎么像 AlphaGo 那样可靠地用这些系统**。AlphaGo 简单，毕竟只是一个游戏。

有了 AlphaGo，才能走 AlphaZero 那条路—— **自己发现知识**。那是下一步，显然更难。所以 sensible 的顺序是：先搭 **AlphaGo 式** 系统（模型 + 搜索 + 规划），再谈 **AlphaZero 式** 自发现。

还有一块：**在线学习和持续学习**。我们训完、对齐、后期训练，部署出去—— **不会像人一样在现实世界里持续学**。这是 AGI 之前 **还缺的关键部件**。

**Hannah：** 这跟智能体 AI 的 hype 有什么关系？大家以为「能调工具」就等于 AGI 了。

**Demis：** 调工具是 **AlphaGo 式** 的一步，不是终点。没有持续学习，智能体再炫也是 **冻结快照**；没有可靠搜索，长程任务会在某一步 **锯齿状** 翻车。AGI 拼图里，这几块是绑在一起的。

> **金句 · Demis Hassabis**
> **中文：** 我们还在 AlphaGo 阶段——缺的是在模型之上可靠的搜索与规划，以及部署后的持续学习。
> **原文：** We're still in the AlphaGo phase—missing reliable search/planning on top of models, and continual learning after deployment.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| AlphaGo 式系统 | AlphaGo-style stack | 基础模型 + 搜索/规划，在人类知识上优化 |
| AlphaZero 式自发现 | AlphaZero-style discovery | 去掉人类示范，系统自生成策略与知识 |
| 持续学习 | continual learning | 上线后仍从新经验更新，非一次训完 |

**本章小结**

- 路径是 **AlphaGo → AlphaZero**，不是跳过搜索直接「更大预训练」
- **持续学习** 与 [[OpenAI员工-上下文工程和Agent记忆]] 里的记忆/上下文议题同场——Hassabis 把它标为 AGI **硬前提**

---

## 05 扩展与创新各半：科学、商业、合成数据与幻觉置信度

**Hannah：** 你说过要是能做主，会让 AI 在实验室多待一阵，多做 AlphaFold 式的事——我们没走那条更慢的路，失去了什么？

**Demis：** 有得也有失。那会是 **更纯粹的科学路径**——我十五、二十年前的设想：几乎没人做 AI，我们刚要创立 DeepMind，大家觉得疯狂，但我们信。

原计划是 **谨慎地** 一步步走向 AGI，同时安全也要跟得上；你 **不必等 AGI** 才造福社会——可以 **分支出去** 做 AlphaFold 这种事：不是通用基础模型，但用同样技术（Transformer 等）加领域方法， **向世界发布**，甚至治愈癌症一类成果，实验室里继续攻 AGI。

后来 **聊天机器人** 证明能规模化——人们觉得有用，演化成 **基础模型**，Gemini 能处理图像、视频等等；商业和产品也大成功。我也一直想要 **终极助手**：日常生活提效、保护大脑空间、帮你进心流——今天社交媒体噪音太多，AI 可以 **替你挡一部分**。

代价是 **竞争极疯**——商业机构、国家都在抢。 **严谨科学研究更难**；我们在 **努力两者兼顾**，找平衡点。好处也明显：**资源涌入** 加速进展；大众用起来只比前沿 **慢几个月**，政府也更好理解这项技术。

**Hannah：** 去年很多人喊 **扩展撞墙、数据耗尽**——Gemini 3 又领跑各 benchmark，怎么回事？

**Demis：** 我觉得 **从没真正撞墙**。可能有 **边际效益递减**——不是「要么指数爆炸要么归零」，中间还有很大空间；我们就在中间。不是每次发布 benchmark 都翻倍，早期也许那样，但现在 **每次仍显著改进**，Gemini 3 的投资回报仍然很高， **没看到放缓**。

数据耗尽？有办法—— **合成数据**。系统够好，可以在 **编码、数学** 等 **可验证答案** 的领域 **自己造无限数据**。当然，这些都是研究问题；DeepMind 的优势一直是 **研究优先、团队又广又深**——Transformer、AlphaGo、AlphaZero 都来自 Google/DeepMind 这条线。挑战变难时，光工程不够，得把 **世界级研究** 和 **TPU 等基础设施** 拧在一起。

**Hannah：** 实现 AGI，扩展和创新怎么分精力？Gemini 3 还有幻觉——能像 AlphaFold 那样给 **置信度** 吗？

**Demis：** 你可以认为 **50% 精力扩展，50% 创新**—— **实现 AGI，两者缺一不可**。

就算 Gemini 3 这么强， **幻觉** 仍在：该拒答时还硬答。可以建系统，让模型像 AlphaFold 一样给出 **置信度分数**——用户知道答案多可靠，系统也能 **把思考时间花在核对输出** 上。这是已知问题，也有已知方向。

再扯远一点：若 AGI 真是 **思维模拟**，跟真实思维对照，也许能发现 **人还剩什么独特**——创造力？情感？梦？意识、可计算性，都回到 **图灵机极限**：计算范畴内有没有做不到的事？没人这么说，也没发现宇宙里有 **不可计算** 的东西——至少到目前为止。

> **金句 · Demis Hassabis**
> **中文：** 扩展和创新各一半——缺任何一边都到不了 AGI；幻觉要靠置信度和核对，像 AlphaFold 那样让人敢用。
> **原文：** Fifty percent scaling, fifty percent innovation—both are necessary for AGI; hallucinations need confidence scores and verification, like AlphaFold.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 扩展 | scaling | 更大模型、更多算力与数据换能力 |
| 合成数据 | synthetic data | 自生成训练数据，缓解真实数据枯竭 |
| 幻觉 | hallucination | 模型自信地给出错误或不该答的内容 |
| 置信度分数 | confidence score | 量化预测可靠度，支撑拒答与人工复核 |

**本章小结**

- **科学理想**（AlphaFold 链）与 **聊天机器人商业化** 不必二选一，但竞争让「实验室慢路」更难走
- **扩展未撞墙** + **合成数据** 回应数据论；**50/50 扩展/创新** 是 Hassabis 的 AGI 配方
- 幻觉解法是 **置信度 + 思考时间用于核对**——与锯齿状智能章节的「自查」闭环

---

## 总结：根节点、一致性、扩展×创新

| 维度 | 要点 |
|------|------|
| 节奏 | 「十年挤进一年」；重心从 LLM 转向智能体与世界模型 |
| 科学 | AlphaFold 已兑现；材料、核聚变、量子纠错是下一批根节点 |
| 能力缺口 | 锯齿状智能、AlphaGo 式搜索、持续学习、幻觉置信度 |
| 组织 | 科学发布与商业竞争并行；资源与公众体验加速，严谨研究更难但必须留位 |
| AGI 配方 | 扩展 50% + 创新 50%；合成数据缓解数据论；研究×工程×基础设施 |

### 对科学研究者与开发者

- 押 **根节点型问题**（材料、能源、生命），别只追应用层 wrapper
- 设计系统时假设 **锯齿状智能**——强 benchmark 不保证日常逻辑；留 **核对与拒答** 接口

### 对政策与行业

- 商业化抢跑时，给 **基础科学** 留预算和时间；AlphaFold 式开放发布仍是 Hassabis 心中的「慢路标杆」
- 与 [[DeepMind CEO-AGI倒计时2030年见分晓]] 对照：时间表之外，本篇给出 **十年技术栈** 该补哪些件

### 仍待验证

- 「50% 扩展 / 50% 创新」是战略口号还是可审计的资源分配 [待核实]
- 合成数据在 **不可自动验真** 的领域能否规模化 [待核实]

> **金句 · Demis Hassabis（封底）**
> **中文：** 若 AGI 是思维模拟，对照真实思维，也许最后剩下的是创造力、情感、梦——图灵机极限之内，我们还没看见不可计算之物。
> **原文：** If AGI is a simulation of thinking, comparing it to real minds may reveal what's uniquely human—creativity, emotion, dreams—within what seems computable so far.

---

## 相关阅读

- [[DeepMind CEO-AGI倒计时2030年见分晓]] — AGI 时间表与见分晓标准
- [[DeepMind CEO-为什么AGI比工业革命大10倍]] — 变局规模与速度
- [[OpenAI员工-上下文工程和Agent记忆]] — 持续学习与记忆架构的另一视角
- [[Anthropic联创-AI影响比工业革命大10倍快10倍]] — 社会侧 10×/÷10 与监管
- [[MOC - AI 时代个人发展与组织]] — 横切索引

---

## 附录

| 字段 | 值 |
|------|-----|
| BV | BV1QSzzBfELB |
| 专栏 | [cv44988152](https://www.bilibili.com/read/cv44988152/) |
| 原节目 | Google DeepMind Podcast（年度收官） |
| ingest | `Recastory/workspace/bilibili-retranscribe/BV1QSzzBfELB/ingest/` |
| 主源 | `column_article.md`（附文稿，短于完整转写） |
| 收录日 | saved 2026-07-06 |

**章节时间戳**（专栏结构，非精确 AV 轴）

| 章 | 专栏节 | 话题 |
|----|--------|------|
| 01 | §02–03 | 年度回顾、Gemini 3、世界模型、智能体转向 |
| 02 | §04–05 | 根节点、AlphaFold、材料、核聚变、量子 |
| 03 | §06 | 锯齿状智能、IMO vs 基础逻辑 |
| 04 | §07 | AlphaGo/AlphaZero、持续学习 |
| 05 | §01/§08–10 | 科学 vs 商业、扩展、合成数据、幻觉置信度 |
