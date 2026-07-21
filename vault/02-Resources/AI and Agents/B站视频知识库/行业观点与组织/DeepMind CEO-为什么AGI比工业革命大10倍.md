---
title: "DeepMind CEO：为什么AGI比工业革命大10倍"
tags: ["ai_agent", "ai_philosophy", "ai_career", "bilibili", "video_transcript"]
legacy_tags: ["ai_agent", "ai_philosophy", "ai_career", "bilibili", "video_transcript"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV1CnDXBjEmH/"
description: "Demis Hassabis × 20VC：AGI=人类全认知、五年概率极高；算力工作台与规模定律；持续学习与锯齿状智能；算法发明拉开差距；Isomorphic 药物引擎；工业革命×10 速度×10 与主权基金。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/DeepMind CEO-为什么AGI比工业革命大10倍.md"
source_sha256: "38ae2511524db547f702097a77e8962bb4246d1e70b0e9cb11786d7729f55a2e"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1CnDXBjEmH/"
column_url: "https://www.bilibili.com/read/cv47749431/"
source_original_date: 2026-04-07
host_name: "Harry Stebbings"
guest_name: "Demis Hassabis"
guest_title: "Google DeepMind 联合创始人兼 CEO"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1CnDXBjEmH/ingest"
speaker: "Harry Stebbings / Demis Hassabis"
duration: "32:23"
saved: 2026-07-06
updated: 2026-07-06
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1CnDXBjEmH/article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1CnDXBjEmH/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article（S 级专栏图稿，Host/Guest 已标注）+ ASR 外源核对 20VC"
speaker_confidence: high
uploader: Easonlee的AI笔记
author:
  - "[[Demis Hassabis]]"
concepts:
  - id: agi_bar
    zh: AGI 标准
    en: AGI bar
    one_line: 展现人类心智全部认知能力，大脑是通用智能唯一存在证明
  - id: scaling_laws
    zh: 规模定律
    en: scaling laws
    one_line: 更大参数与算力仍带来可观智能回报，增速放缓不等于到头
  - id: continual_learning
    zh: 持续学习
    en: continual learning
    one_line: 训练后仍能吸收新知识，需类似睡眠巩固的机制
  - id: jagged_intelligence
    zh: 锯齿状智能
    en: jagged intelligence
    one_line: 换种问法就在基础题上翻车，通用智能不该如此
  - id: industrial_revolution_10x
    zh: 工业革命十倍
    en: 10× industrial revolution
    one_line: 影响规模为工业革命十倍、速度快十倍、十年内展开
---

# DeepMind CEO：为什么AGI比工业革命大10倍

**Host：** Harry Stebbings（20VC · *The Twenty Minute VC*）  
**Guest：** Demis Hassabis（Google DeepMind 联合创始人兼 CEO）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `BV1CnDXBjEmH/ingest/column_article.md`  
**B 站：** [BV1CnDXBjEmH](https://www.bilibili.com/video/BV1CnDXBjEmH/) · **专栏：** [cv47749431](https://www.bilibili.com/read/cv47749431/) · **时长** 32:23

---

## 开场

Harry Stebbings 把 Demis Hassabis 请进 20VC 时，开场就定调：嘉宾里能跟图灵、爱因斯坦并列的名字不多，Demis 算一个。Harry 刚看完 DeepMind 纪录片，想从 **AGI 到底什么意思** 聊起——别各说各话，先对齐标准。

这场对谈六条线：**AGI 定义与五年时间线** → **算力工作台与规模定律** → **持续学习与锯齿状智能** → **算法发明拉开前沿差距** → **Isomorphic 药物引擎与 AI 安全** → **工业革命×10、速度×10 与社会分配**。Demis 的判断跟 [[Anthropic联创-AI影响比工业革命大10倍快10倍]] 同频——Jack Clark 从政策侧讲 10×/÷10 与计算税，Demis 从实验室外推讲 **十年内展开** 与 **主权基金分蛋糕**；跟 [[DeepMind CEO-AGI倒计时2030年见分晓]] 则是同一嘉宾、不同切面的姊妹篇。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 通用人工智能 | AGI | 像人一样具备全套认知能力的系统 |
| 规模定律 | scaling laws | 模型更大、算力更多，智能仍往上走 |
| 持续学习 | continual learning | 部署后还能学新东西，不像训完就冻住 |
| 锯齿状智能 | jagged intelligence | 某些问法神，换种问法在小学题上挂 |
| 分层规划 | hierarchical planning | 把长远目标拆成可执行的层级步骤 |
| 存在证明 | existence proof | 大脑证明「通用智能」在宇宙里做得到 |
| 双重用途 | dual-use | 同一技术既能治病也能被滥用 |
| 主权财富基金 | sovereign wealth fund | 国家层面投资 AI 公司，全民分红利 |

---

## 01 AGI = 人类全认知，五年概率极高

**Harry：** 定义满天飞。你怎么定义 AGI？我们好有个讨论的锚。

**Demis：** 我们 DeepMind 从创办第一天起定义就没变过：**AGI 是一个展现人类心智全部认知能力的系统**。为啥这么定？大脑是我们所知、也许也是宇宙里 **唯一能证明通用智能做得到** 的东西——它是我们的 **存在证明**。AGI 的杠就该对齐这个。

**Harry：** 那离它还有多远？有人喊 2026、2027，听着像科幻。

**Demis：** 我对时间线有个概率分布。说实话，**未来五年内实现的可能性非常大**——并不遥远。

**Harry：** 比你早些年想的更近吗？看法变过吗？

**Demis：** 没有。挺有意思——我联合创始人、首席科学家 Shane Legg，2010 年我们刚起步时就写博客预测 AGI 何时到来。那年几乎没人干 AI，大家都觉得 AI 是死胡同。博客还在网上，谁都能查。我们当时对 **算力增长** 和 **算法进展** 做外推，预测从起点算起大约 **20 年**。我觉得 **基本按计划走**。

> **金句 · Demis Hassabis**
> **中文：** 大脑是通用智能唯一存在证明——AGI 的杠，就是人类心智的全套认知能力。
> **原文：** The brain is the only existence proof we have that general intelligence is possible—that for me is the bar for what AGI should be.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 存在证明 | existence proof | 宇宙里已有一个通用智能样本：人脑 |
| 概率分布 | probability distribution | 不是单点预测，而是一簇可能时间 |
| 外推 | extrapolation | 用算力与算法曲线往前推时间表 |
| 认知能力全集 | full cognitive capabilities | 推理、规划、学习、创造等打包齐全 |

**本章小结**

- AGI 标准 **不随 hype 摇摆**：对齐人类心智全集，不是某个 benchmark 刷分
- **五年窗口** 是 Demis 当前主判断，且与 2010 年 20 年外推 **一致**
- 与 Clark 的 10×/÷10 叙事互补：一个讲 **何时**，一个讲 **多猛**

---

## 02 算力瓶颈在实验，不在规模尽头

**Harry：** 纪录片里你说永远算力不够。今天最大瓶颈还是这个吗？

**Demis：** 我认为 **算力仍是最大问题**。一层原因大家都能想到：按 **规模定律** 把架构做大、参数做多，系统更聪明。另一层更关键——**算力是研究员的工作台**。你有个新算法想法，得在 **合理规模** 上试；小规模过了，进主系统可能完全站不住。研究人员多、想法多，就得 **相当可观的算力** 做实验。

**Harry：** 很多人喊规模定律到头了、增长平台期了。你信吗？

**Demis：** 我不这么看，情况更细。领先公司做一代代大语言模型，每代 **性能几乎翻倍**——这种跳不可能永远指数级，增速 **必然放缓**。但这 **不等于** 继续扩展没大回报。我们和其他前沿实验室在算力扩展上 **仍收获丰厚**。回报依然 **非常可观**，只是比规模化刚起步时 **略慢一点**。

**Harry：** 那整体进度呢？比你自己预期的落后吗？

**Demis：** 大多数领域 **其实超前于我的预期**。视频模型、我们最新的 **Genie** 交互式世界模型——回头看简直不可思议。五到十年前给我看这些，我会惊掉下巴。多数方向 **跑在预期前面**。但 **持续学习** 这类大块还缺——系统训完上线就不再学，新东西吸收不好，得靠关键突破补上。

> **金句 · Demis Hassabis**
> **中文：** 云和集群不是电费账单，是工作台——没规模，新算法进不了主系统。
> **原文：** The computers, the cloud, is our workbench—if you test at too small a scale, it won't hold when you put it into the main system.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 规模定律 | scaling laws | 更大模型+更多算力→更高智能，回报仍在 |
| 工作台 | workbench | 研究员试算法的中等规模实验环境 |
| 平台期 | plateau | 增速放缓；Demis 认为不等于没回报 |
| 交互式世界模型 | interactive world model | 像 Genie：可交互、可推演的虚拟环境 |

**本章小结**

- 算力瓶颈 **双层**：扩展主模型 + **验证新想法** 的实验规模
- 规模定律 **减速 ≠ 撞墙**；前沿实验室仍从扩展中拿大回报
- 整体 **多数领域超前**，但 **训完即停学** 是明显短板

---

## 03 持续学习未解，智能仍锯齿状

**Harry：** 为啥到现在还没有持续学习？我问得很直白。

**Demis：** 还没人完全搞定，所有领先实验室都在攻。难点是：怎么把 **新学的东西** 融进你 **花了几个月训出来的系统**。大脑做得特别优雅——大概靠 **睡眠、强化学习** 做 **巩固**：白天记忆重放，一部分 **顺滑地并进** 现有知识库。我想过，也许我们也得搞类似机制，把新信息和旧库 **优雅地合在一起**。

**Harry：** 视频模型 DeepMind 追得飞快，甚至反超。两三年前还不是这样，发生了什么？

**Demis：** 我们做了组织变革。Google 和 DeepMind 一直拥有 **最深最广** 的研究阵容。过去 15 年，支撑现代 AI 产业的大约 **90% 突破** 来自 Google Brain、Google Research 或 DeepMind——AlphaGo、强化学习、Transformer 都在这儿。未来若还要新突破，我 **押我们能做出来**。基本上把公司人才 **拧到一个方向**；算力也 **合并成一套最大模型**，不在内部同时养两三个版本。把已有要素 **拼齐**，然后 **像初创公司一样** 专注、高速，回到前沿并在多领域领先。

**Harry：** 持续学习是你最期待的下一跳吗？

**Demis：** 缺的不止这一项。**记忆系统** 也有大量空间——现在有长上下文窗口，但有点 **粗暴**，什么都往里塞，很多 **新架构** 等着被发明。**长期规划、分层规划** 也弱：系统不擅长 **很多年尺度** 的规划，人脑可以。也许最大问题之一是 **一致性**。我管这叫 **锯齿状智能**——某种问法下强得惊人，换种问法在 **很基础的题** 上仍翻车。通用智能 **不该这么锯齿**。你重排文件、设好 agent 任务，文件一掉出上下文，配置 **整段崩掉**——那是灾难。人脑工作方式不该有这种洞。

> **金句 · Demis Hassabis**
> **中文：** 我把它们叫锯齿状智能——换种问法，就在小学题上挂。
> **原文：** I sometimes call these systems jagged intelligences—they're amazing one way you ask, but fail at elementary things if you ask slightly differently.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 持续学习 | continual learning | 部署后继续吸收、整合新知识 |
| 巩固 | consolidation | 睡眠等机制把新记忆并进旧知识 |
| 锯齿状智能 | jagged intelligence | 能力分布极不均匀，通用性存疑 |
| 分层规划 | hierarchical planning | 长远目标拆层、逐步执行 |

**本章小结**

- **持续学习** 是架构级难题，方向是模仿大脑 **巩固** 机制
- DeepMind 加速 = **人才合并 + 算力合并 + 初创节奏**，不是单点魔法
- **一致性** 与 **长期规划** 跟持续学习并列，决定能否真 AGI

---

## 04 算法发明拉开前沿差距

**Harry：** 大家还在聊规模化见顶、模型 **能力商品化**。你会看到差距拉大，还是大家都趋同？

**Demis：** 我觉得现在 **三四个领先实验室**——我们是其中之一——跟其他人的差距 **正在拉大**。编码工具、数学工具这些 **也在帮你造下一代模型**。光靠 **旧想法** 挤出同样收益， **越来越难**。**能发明新算法思想** 的实验室，未来几年会 **优势更大**——上一批思想的潜力 **快被榨干了**。

**Harry：** 你们多年很开放，开放模型质量也很高。开放的未来长什么样？我投资组合里很多公司用前沿模型定 benchmark，再用开放模型 **逼近性能、压成本**。

**Demis：** 未来可能跟今天差不多。我们 **坚定支持开放科学和开放模型**——从 Transformer 到 AlphaFold，很多都 **交给世界** 帮研究社区；科学应用会继续。但 **开源模型大概永远比绝对前沿慢半步**——开源社区通常要 **六个月左右** 才能复现、吃透新想法。我们也在推 **Gemma** 开源系列，决心在各自体量上 **做到最好**，给小型开发者、学者、初创起步和 **边缘计算** 用——对某些场景，开源模型 **非常合适**。

**Harry：** LLM 之后的世界呢？Yann LeCun 看法很不一样。

**Demis：** 我跟 Yann 在几点上 **不完全同路**。也许还缺东西、还需要突破——**世界模型** 这类方向。但我 **非常看好基础模型** 这条路：它们能做的事 **令人难以置信**，这点 **不会消失**；规模定律 **仍有回报**。真正的问题是：未来 AGI 系统里，LLM 基础模型是 **唯一关键组件**，还是 **整体之一**？我不认为会被 **取代**，而是 **建在这些基础模型之上**——就像我们叠加世界模型那样。

> **金句 · Demis Hassabis**
> **中文：** 上一批算法思想的汁快榨干了——接下来拼谁还能发明新架构。
> **原文：** Those labs that can invent new algorithmic ideas will start having a bigger advantage as the last set of ideas has been rung out of them.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 能力商品化 | commoditisation | 模型性能趋同、价差靠成本竞争 |
| 算法思想 | algorithmic ideas | 新架构/新训练范式，非纯堆算力 |
| 基础模型 | foundation models | LLM 等可堆叠、可扩展的底座 |
| 世界模型 | world models | 模拟环境 dynamics，可能是 AGI 组件 |

**本章小结**

- 前沿 vs 追随者：**算法发明能力** 将比纯扩展更分化
- 开源 **慢半步** 是结构性节奏，Gemma 填 **体量与场景** 空白
- Demis 押 **LLM 底座长留**，AGI = 底座 + 记忆/规划/世界模型等 **叠加**

---

## 05 药物设计引擎与监管革命

**Harry：** 你说五年左右可能有 AGI。那个世界长什么样？大家担心各不同。

**Demis：** 宏观上，我一生都在朝 AGI 走，因为它会是 **科学与医学的终极工具**——推科学发现、找疾病疗法， **我们需要这种技术**。希望五年或更久后，进入 **科学发现的新黄金时代**。

**Harry：** 我妈有多发性硬化症。药物发现往往 **十年** 才走完试验——她等不了那么久。怎么解？

**Demis：** 我觉得 **快能到那一步**。AlphaFold 之后我们分拆 **Isomorphic Labs**，发展很好——专攻药物发现 **后半程**：化学、化合物设计、毒性检查、安全属性等。我认为 **五到十年内** 能备好整套 **药物设计引擎**。下一关是临床试验仍要很多年——AI 可以帮 **模拟部分人体代谢**、 **按基因分层患者**，让药更贴个体。真正革命是：当 **十几个左右 AI 设计的药** 走完全流程，政府与监管有足够数据 **回溯验证模型预测**——也许 **十年内** 能 **信任模型预测**， **跳过一些步骤**，比如动物试验，或靠模型 **更快提剂量**。得 **两步走**：先解决设计，再 **缩短监管时间**。

**Harry：** 监管与 AI 安全是大话题。我昨晚又看《侏罗纪公园》——霍金说必须一次做对，可能没有第二次机会。你同意吗？

**Demis：** 同意。这是我们 **必须面对的风险**。两件事最挂心：**坏人滥用**——双重用途，能治病也能害人；**技术护栏**——不是今天的系统，而是一两年后 **更自主、更有代理性** 的系统，得 **锁在我们想要的边界里**。正确监管能帮上忙，领先提供商至少 **最低标准**，最好是 **国际标准**。

**Harry：** 什么叫正确监管？你说过需要更多 **全球协调**，我们这方面 **越来越糟**。

**Demis：** 这个时代有点疯——可能从未有过 **如此重要的技术**，国际体系却 **如此碎片化**。不理想，但得 **尽力**。至少 **最低标准**，加上测 **欺骗** 等坏特性的 benchmark—— **没人该造会欺骗的系统**，不然可能 **绕过其他安全措施**。理想方向：**认证流程**，像质量标志，表明模型有 **安全保障**，消费者和公司敢往上建——但必须是 **国际的**，系统 **跨国界、跨地域**。

**Harry：** 谁来做最终验证？媒体公司刷平台，真假难分——仲裁者是谁？

**Demis：** 最终得 **政府**。执行靠 **技术机构**——英国在苏纳克领导下设的 **AI 安全研究所** 做得不错，美国也有。顶尖研究国家都该有 **同级机构**，用高质量研究员 **按 benchmark 审计**。我倾向 **独立机构** 检查是否达标。

**Harry：** 若只有一根魔杖专用于 AI 安全，你会施什么？

**Demis：** 某种 **国际机构**，也许类似 **国际原子能机构**——各国 AI 安全研究所向它报信息；研究界一起定 **正确 benchmark**，查哪些能力 **安全**。也许还要禁止 AI 输出 **人类读不懂的加密令牌**——系统用 **机器语言** 我们不懂，会 **新漏洞**。领先实验室大多同意 **别这么干**。机构测这些，公众、学界、公民社会才有 **信心**：极强大系统 **经独立审计**。魔杖用完了——也许我用错地方了。

> **金句 · Demis Hassabis**
> **中文：** 双重用途——同一套 AI 能 curing 癌症，也能被坏人拿去干坏事。
> **原文：** These are dual-use technologies—they can have enormous positive uses in science and health, but also harmful purposes.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 药物设计引擎 | drug design engine | 从靶点到化合物到安全属性的 AI 流水线 |
| 双重用途 | dual-use | 民用与滥用潜力并存 |
| AI 安全研究所 | AI Safety Institute | 政府下属独立技术审计机构 |
| 欺骗性对齐 | deceptive alignment | 模型表面合规、实则绕过护栏 |

**本章小结**

- **Isomorphic** = AlphaFold 之后攻 **设计+安全属性**；监管信任后或 **跳过动物试验**
- 安全 worry **双轨**：滥用 + **自主系统** 越界；要 **国际最低标准** 与 **独立审计**
- 魔杖答案：**IAEA 式国际机构** + 可测 benchmark，不是单靠企业自律

---

## 06 工业革命×10，十年内展开

**Harry：** 科学很兴奋。劳动力流失是最大担忧之一。我采访 Marc Andreessen，他说我是马克思主义者——他觉得这种担心 **胡说**。历史每次技术革命都有岗位颠覆，你怎么看？

**Demis：** 旧工作消失或 **不再可行**，这 **正在发生**。历史也表明会 **冒出一整套以前想不到的新工作**，质量更高、薪水更好——这是 **正常过程**。得小心说「这次不同」。Marc 认为跟互联网、移动 **一样**。我 **确实认为这次更大**。我有时量化：**AGI 的到来像工业革命的 10 倍，速度也是 10 倍，十年内展开，不是一个世纪**。我在读工业革命史——动荡巨大，也带来进步；没有工业革命就没有现代医学。工业革命前 **儿童死亡率 40%**。有些事你不会希望它没发生，但理想情况下，这次我们得 **更好地减轻负面影响**。

**Harry：** 我们总 **高估一年、低估十年**——这次更快还是更慢？

**Demis：** 我觉得 **仍然成立**。也许短期长期都比别的技术 **更近**。但 **今天和明年 AI 有点被过度炒作**——热度已经 **高不可能再高**。另一方面， **十年尺度上** 这项技术的革命性 **仍被严重低估**。AI 就有这种 **二元性**，劳动力市场的担心也在这儿。

**Harry：** 收入不平等、财富集中呢？

**Demis：** 有不同应对。比如 **养老基金或主权基金** 投资所有大型 AI 公司，确保 **人人分一杯羹**——也许每个国家都该有 **主权财富基金** 这么干。还得想：巨大生产力提升若 **收益集中在少数领域**，怎么 **再分配** 让 **人人受益**——基础设施、资源等 **各种办法**。五到十年内可能发生 **难以置信的事**：可再生 **免费能源** 突破、也许 **核聚变**——我们也在跟 Commonwealth Fusion 等伙伴推。AI 会 **带来这些突破**：新型超导体、更好电池、材料科学。经济性质 **会完全变样**。

**Harry：** AI 的 **能源危机** 呢？需求前所未有。

**Demis：** 中长期看 AI 在能源上 **物超所值**。我们优化电网——大概能从 **国家电网多抠 30%–40% 效率**。气候与天气建模我们 **世界最好**，帮找 **受影响地区** 减损。最兴奋的是 **核聚变、新电池、超导体** 等突破——AI **对实现这些至关重要**。人类会进入 **完全不同的能源状况**，帮气候与环境，最终以更低成本 **进太空**。有核聚变级能源，你 **几乎有无限火箭燃料**——可以直接 **催化海水**。

**Harry：** 最后一个哲学问题——你在想什么，而 **没看到别人谈**？

**Demis：** 更多是 **哲学**。很多人担心 AI 经济问题，我也担心——但更挂心 **背后的哲学挑战**。假设技术问题、经济问题都解决了—— **都很难**——就会冒 **哲学问题**： **意义是什么？目的是什么？** 我们会发现 **意识是什么、做人意味着什么**。 **未来需要伟大的新哲学家** 帮人类驾驭。

**Harry：** 你希望被记住的遗产是什么？

**Demis：** 推动 **科学进步**，构建 **为世界带来巨大益处** 的技术——比如 **治愈可怕疾病**。

> **金句 · Demis Hassabis（封底）**
> **中文：** AGI 像工业革命的十倍、速度的十倍——十年内展开，不是一个世纪。
> **原文：** I sometimes quantify AGI as 10 times the industrial revolution at 10 times the speed—unfolding over a decade instead of a century.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 工业革命十倍 | 10× industrial revolution | 社会影响量级为工业革命十倍 |
| 主权财富基金 | sovereign wealth fund | 国家投资 AI 巨头，全民分享上行 |
| 锯齿状 vs 通用 | jagged vs general | 真 AGI 不应能力分布极不均匀 |
| 后稀缺经济 | post-scarcity economics | 生产力暴涨后分配规则需重写 |

**本章小结**

- **10× 规模、10× 速度、十年窗口**——与 Clark 的 10×/÷10 **同构**，Demis 从 **历史量化** 出发
- 岗位：**颠覆+新工作** 仍会发生，但 **节奏更快**，需 **主权基金** 等 **再分配工具**
- 能源：**短期耗电**，中长期 AI **帮聚变、电网、材料**；哲学层 **意义与意识** 是终极题

---

## 总结：实验室外推的 AGI 时间表与社会冲击

| 维度 | 要点 |
|------|------|
| AGI 定义 | **人类心智全集**；大脑是唯一 **存在证明** |
| 时间线 | **五年内概率极高**；与 2010 年 **20 年外推** 一致 |
| 算力 | **工作台** 逻辑；规模定律 **减速非撞墙** |
| 架构缺口 | **持续学习、记忆、长期规划、一致性**；**锯齿状** 必须抹平 |
| 竞争 | **算法发明** 拉开差距；开源 **慢半步** |
| 科学应用 | **Isomorphic** 药物引擎；监管信任后 **缩短试验** |
| 安全 | **双重用途** + **自主系统**；**IAEA 式国际机构** + 独立审计 |
| 社会 | **工业革命×10、速度×10**；**主权基金** 分红利；**意义哲学** 待答 |

### 对企业的启示

- 跟 [[Anthropic联创-AI影响比工业革命大10倍快10倍]] 对照：Clark 给 **计算税、经济指数** 菜单，Demis 给 **主权基金投资 AI 巨头**——政策工具不同， **10× 判断同根**。
- 产品侧：**锯齿状智能** 说明 agent 任务别赌 **单一路径问法**；文件掉上下文就崩，是 **一致性** 工程债。

### 对政策与个人的启示

- **AISI 模式** 应国际化；Demis 的魔杖 = **IAEA 式协调**，不是各国各测各的。
- 职业假设 **十年尺度剧变** 仍被 **低估**——读 [[LCA-60分钟变成AI-Native]] 的组织改造，是个人/团队层的 **对冲**。
- 哲学层：技术+经济解了， **意义** 才登场——跟 [[人不自信的最根本原因是什么]] 的「允许犯错、积累成功次数」是不同维度，但同属 **人怎么活** 的议程。

### 仍待验证

- **五年内 AGI** 是 Demis 概率判断，非承诺； **持续学习** 尚无公认解。
- **跳过动物试验** 依赖监管 **回溯信任**，时间表 **五到十年** 仍不确定。
- **主权基金全民分红利** 在多国 **立法与资本结构** 上尚无模板。

---

## 概念索引（agent）

| id | 中文 | 英文 | 一句话 |
|----|------|------|--------|
| agi_bar | AGI 标准 | AGI bar | 人类心智全集；大脑为存在证明 |
| scaling_laws | 规模定律 | scaling laws | 扩展仍有厚回报，增速放缓≠尽头 |
| continual_learning | 持续学习 | continual learning | 训后继续学；需巩固类机制 |
| jagged_intelligence | 锯齿状智能 | jagged intelligence | 问法稍变即在基础题翻车 |
| industrial_revolution_10x | 工业革命十倍 | 10× industrial revolution | 规模×10、速度×10、十年展开 |

---

## 附录

### 章节时间戳（B 站简介 · 重点速览）

| 时间 | 主题 |
|------|------|
| 02:15 | AGI 定义应回归人类全认知能力 |
| 04:30 | 算力瓶颈不仅在扩展更在实验效率 |
| 07:12 | 现有 AI 架构缺失持续学习能力 |
| 11:45 | 算法创新将成为下一阶段的竞争核心 |
| 16:20 | AI 将开启科学与药物发现的黄金时代 |
| 22:40 | AGI 对社会的冲击是工业革命的 10 倍 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1CnDXBjEmH/ingest`
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV1CnDXBjEmH/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv47749431/
- **B 站**：https://www.bilibili.com/video/BV1CnDXBjEmH/
- **原播客**：20VC · *The Twenty Minute VC*（主持人 Harry Stebbings）
- **时长**：32:23

### 相关阅读

- [[Anthropic联创-AI影响比工业革命大10倍快10倍]] — 同主题 10×/÷10；Clark 侧政策与经济指数  
- [[DeepMind CEO-AGI倒计时2030年见分晓]] — 同嘉宾姊妹篇；AGI 倒计时与时间表  
- [[微软CEO-AI竞争终局与企业私有评估]] — 企业私有评估 vs 社会级 AGI 冲击  
- [[LCA-60分钟变成AI-Native]] — 组织层 People + Agents + Context 改造  
- [[MOC - AI 时代个人发展与组织]] — 职业与组织横切索引  

### 收录说明

- **视频**：[BV1CnDXBjEmH](https://www.bilibili.com/video/BV1CnDXBjEmH/)（B 站转载 · Easonlee《AI Builder》专栏）  
- **嘉宾**：Demis Hassabis，Google DeepMind 联合创始人兼 CEO  
- **节目**：20VC · *The Twenty Minute VC*（主持人 Harry Stebbings）  
- **版本**：canonical Host-Guest v3.2（S 级 · column 主源 · 2026-07-06）
