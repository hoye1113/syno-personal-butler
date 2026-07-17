---
title: B站排除项全文复核分级
created: 2026-07-07
tags: [audit, bilibili]
description: 对已排除 ASR 就绪条目分级——哪些值得读全文再判
---

# B站排除项 · 全文复核分级（2026-07-07）

> 前提：条目已在 [bilibili-ingest-exclude-2026-07-07.md](./bilibili-ingest-exclude-2026-07-07.md) 标为**不收**
> 方法：排除原因码 + 标题 + `column_article`/`article.md` 体量 → 复核等级

## 等级说明

| 等级 | 含义 | 建议动作 |
|------|------|----------|
| **R1** | 标题/规则可能误判，素材厚 | **读专栏或 ASR 全文**（有专栏优先 column） |
| **R2** | 中等可能，或只需抽样 | **读前 15–20 分钟对应段落** / 专栏摘要段 |
| **R3** | 排除置信度高 | **不读**；除非你有明确兴趣 |

## 汇总

| 等级 | 数量 |
|------|------|
| R1-A 复核完成 | 见 [bilibili-r1a-review-results-2026-07-07.md](./bilibili-r1a-review-results-2026-07-07.md) |

**R1-A 结论速览**：6 升收录 · 4 候补 · 5 维持排除
| R1-B 有余力再读 | **26** |
| R2 抽样复核（待补元数据） | **4** |
| R3 不必读 | **52** |

## R1-A 优先全文（15）

> **与 vault 主题最贴**：Claude/Codex 实战、Agent 商业案例、eval/测试、组织+harness。有专栏优先读 `column_article.md`。

| BV | 原排除码 | 专栏 | 复核看点 |
|-----|----------|------|----------|
| [BV1Tu9xBDEkt](https://www.bilibili.com/video/BV1Tu9xBDEkt/) | low_score | 30k | Obsidian+Claude Code 第二大脑；与 Boris 组织篇是否互补 |
| [BV1r4Ju65EJT](https://www.bilibili.com/video/BV1r4Ju65EJT/) | low_score | 25k | Codex+Notion 落地栈 |
| [BV1YX9CB5ETB](https://www.bilibili.com/video/BV1YX9CB5ETB/) | low_score | 40k | Claude Design 1h 工作流 |
| [BV1pYDiBPEQA](https://www.bilibili.com/video/BV1pYDiBPEQA/) | asr_garbage | 70k | 标题损坏；专栏疑为 Claude 测试/统计 |
| [BV1KXDtBEEbV](https://www.bilibili.com/video/BV1KXDtBEEbV/) | low_arr | 39k | 单人 Agent 百万 ARR 架构 |
| [BV1SsE368Ea8](https://www.bilibili.com/video/BV1SsE368Ea8/) | low_arr | 23k | 法律垂直 Agent |
| [BV1NiooB5ESW](https://www.bilibili.com/video/BV1NiooB5ESW/) | dup_openclaw_founder | 35k | OpenClaw 现状 vs 已收创始人篇 |
| [BV1HDDyB9Emw](https://www.bilibili.com/video/BV1HDDyB9Emw/) | low_org_story | 26k | 裁员 40% 后 AI 运转 |
| [BV1dg5t6gEJ8](https://www.bilibili.com/video/BV1dg5t6gEJ8/) | low_org_story | 65k | Brex「AI CEO」产品形态 |
| [BV1gE93BEEUq](https://www.bilibili.com/video/BV1gE93BEEUq/) | low_app_demo | 33k | 6 工具联调 demo |
| [BV1tF5m6UEGf](https://www.bilibili.com/video/BV1tF5m6UEGf/) | low_trend | 31k | 2026 Vibe Code 趋势 |
| [BV1mncRznEd6](https://www.bilibili.com/video/BV1mncRznEd6/) | low_editor | 14k | Ghostty 创始人谈 AI 写码 |
| [BV1hkFkz9E6N](https://www.bilibili.com/video/BV1hkFkz9E6N/) | low_duplicate_claude | — | Claude 之父直播写码（无专栏，读 ASR） |
| [BV1F8Ju6VEbp](https://www.bilibili.com/video/BV1F8Ju6VEbp/) | low_score | 60k | Nebius 全栈 AI 基建交付 |
| [BV1rh526BEjY](https://www.bilibili.com/video/BV1rh526BEjY/) | offtopic_db | 40k | Postgres+LLM；偏 infra 但可能有 RAG 论点 |

## R1-B 有余力再读（26）

> 多为 **CEO 叙事 / 组织愿景 / ARR 故事**，专栏厚但标题像软文。全文读完再决定升候补或维持排除。

| 代表 | 说明 |
|------|------|
| Every×2、Notion、Replit、Asana、Block、Brex×2 | 组织转型；与已收 Linear/Notion/Every 重叠度需正文判 |
| Polsia/Lovable/Chatbase/Emergent/Harvey/Cerebras | ARR/IPO 故事；若有 Agent 架构段落可单摘 |
| 杨立昆/杨植麟/xAI/Sam Altman/Meta PM | 研究或宏观；非 harness 主菜 |
| AlphaGo 教程、Speechify、Granola、Ulta、Arise 画布 | 偏教程/产品/垂直 |

完整列表见下方 **R1（41）** 表；上表 15 条已标为 R1-A。

## R1（41）

> 标题像软文/重复，但专栏≥3k 或长访谈 ASR；读完再决定升 P3+ 或维持排除

| BV | 原排除码 | 专栏 | ASR | 时长 | 标题 |
|-----|----------|------|-----|------|------|
| [BV19qLA6BEHx](https://www.bilibili.com/video/BV19qLA6BEHx/) | `low_tutorial_alpha` | 139k | — | — | 从零开始构建 AlphaGo – Eric Jang |
| [BV1FX536qEFS](https://www.bilibili.com/video/BV1FX536qEFS/) | `low_product` | 110k | — | — | Speechify CEO：从100位CEO 学到的经验 |
| [BV1ToE56KE7E](https://www.bilibili.com/video/BV1ToE56KE7E/) | `low_score` | 85k | — | — | a16z前合伙人：关于AI今年 最理性的简介 |
| [BV14jrKBcEav](https://www.bilibili.com/video/BV14jrKBcEav/) | `low_score` | 76k | — | — | Vercel&Stripe&Google CPO: 2026年世界级GTM的模样 |
| [BV1gDE56gE7B](https://www.bilibili.com/video/BV1gDE56gE7B/) | `low_score` | 72k | — | — | xAI研究员：xAI从零构建 视频模型的内幕 |
| [BV17x9yBXEug](https://www.bilibili.com/video/BV17x9yBXEug/) | `low_score` | 72k | — | — | Meta前高管：为什么一半的 产品经理陷入困境 |
| [BV1Jo7R6eEGi](https://www.bilibili.com/video/BV1Jo7R6eEGi/) | `low_saas_ceo` | 72k | — | — | Every CEO：AI越强大 工作也越多 |
| [BV1pYDiBPEQA](https://www.bilibili.com/video/BV1pYDiBPEQA/) | `asr_garbage` | 70k | — | — | Claude深度功能：Claude代码的 Claude强制19种测试统计准确性失效 |
| [BV1dg5t6gEJ8](https://www.bilibili.com/video/BV1dg5t6gEJ8/) | `low_org_story` | 65k | — | — | Brex CEO：他打造了首位 全职 AI CEO |
| [BV1CoLA6REyB](https://www.bilibili.com/video/BV1CoLA6REyB/) | `low_score` | 65k | — | — | 杨立昆：继续对LLM开炮，世界模型才是未来 |
| [BV1tw9yBMEUK](https://www.bilibili.com/video/BV1tw9yBMEUK/) | `low_vertical` | 65k | — | — | Snap CEO：面对增长还是 失败的选择 |
| [BV16wGS6MEEn](https://www.bilibili.com/video/BV16wGS6MEEn/) | `low_org_vision` | 61k | — | — | Notion CEO：AI原生组织，应该像爵士乐队 |
| [BV1F8Ju6VEbp](https://www.bilibili.com/video/BV1F8Ju6VEbp/) | `low_score` | 60k | — | — | Nebius联创：AI基建无泡沫 全栈交付是关键 |
| [BV12RVf62Ed2](https://www.bilibili.com/video/BV12RVf62Ed2/) | `low_arr` | 58k | — | — | Harvey CEO：31岁年轻人 如何运营百亿公司 |
| [BV18grKBNEJA](https://www.bilibili.com/video/BV18grKBNEJA/) | `low_score` | 52k | — | — | ElevenLabs&Lovable CEO：坐上AI这艘火箭 |
| [BV1jrjP6UEe3](https://www.bilibili.com/video/BV1jrjP6UEe3/) | `low_org_story` | 48k | — | — | Brex CEO：打造全公司
m共用的AI型CEO |
| [BV1H1FCzrEEF](https://www.bilibili.com/video/BV1H1FCzrEEF/) | `low_score` | 46k | — | — | OpenAI官方博客：AI在各行业 落地现状 |
| [BV1eS9CBjESZ](https://www.bilibili.com/video/BV1eS9CBjESZ/) | `low_score` | 43k | — | — | Stripe设计主管：如何用AI设计 我们的新网站 |
| [BV1WPo4B9EyZ](https://www.bilibili.com/video/BV1WPo4B9EyZ/) | `low_score` | 41k | — | — | Sam Altman：AI海啸已来 社会如何准备 |
| [BV1rh526BEjY](https://www.bilibili.com/video/BV1rh526BEjY/) | `offtopic_db` | 40k | — | — | Postgres之父：LLM 不会 取代关系数据库 |
| [BV1YX9CB5ETB](https://www.bilibili.com/video/BV1YX9CB5ETB/) | `low_score` | 40k | — | — | Claude Design实战：1小时从创意 到高保真原型 |
| [BV1KXDtBEEbV](https://www.bilibili.com/video/BV1KXDtBEEbV/) | `low_arr` | 39k | — | — | Polsia CEO：1个人用AI Agent，1个月百万美金ARR |
| [BV1X1XdBCEqH](https://www.bilibili.com/video/BV1X1XdBCEqH/) | `low_product` | 38k | — | — | Granola联创：AI时代的笔记 软件应该这样 |
| [BV17p9yB9Ef3](https://www.bilibili.com/video/BV17p9yB9Ef3/) | `low_org_vision` | 37k | — | — | Replit CEO：未来公司只剩这两种人，建设者与布道者 |
| [BV1De7R6JELZ](https://www.bilibili.com/video/BV1De7R6JELZ/) | `low_saas_ceo` | 36k | — | — | Every CEO：全员AI后 员工数翻了3倍 |
| [BV1NiooB5ESW](https://www.bilibili.com/video/BV1NiooB5ESW/) | `dup_openclaw_founder` | 35k | — | — | OpenClaw创始人：Claw的现状报告，软件开发的逻辑变了 |
| [BV1nnGU6TEeN](https://www.bilibili.com/video/BV1nnGU6TEeN/) | `low_arr` | 34k | — | — | Cerebras 630 亿美元 IPO 背后的故事：对话创始人兼 CEO Andrew Fel |
| [BV16BQhBEEgH](https://www.bilibili.com/video/BV16BQhBEEgH/) | `low_saas_transform` | 34k | — | — | Asana CPO：AI时代软件 公司如何转型 |
| [BV1gE93BEEUq](https://www.bilibili.com/video/BV1gE93BEEUq/) | `low_app_demo` | 33k | — | — | AI App实战：现场演示6个AI工具 共同开发一个App |
| [BV1aQdHBpEMB](https://www.bilibili.com/video/BV1aQdHBpEMB/) | `low_saas_ceo` | 33k | — | — | Hearth AI创始人：像艺术家一样去创作 |
| [BV1tF5m6UEGf](https://www.bilibili.com/video/BV1tF5m6UEGf/) | `low_trend` | 31k | — | — | AI编程工具：2026年 趋势与Vibe Code |
| [BV1YfE36TEyz](https://www.bilibili.com/video/BV1YfE36TEyz/) | `low_arr` | 30k | — | — | Chatbase CEO：如何117天 实现百万ARR |
| [BV1RnEL6UEdh](https://www.bilibili.com/video/BV1RnEL6UEdh/) | `low_arr` | 30k | — | — | Emergent CEO：9个月 1亿美元ARR |
| [BV1Tu9xBDEkt](https://www.bilibili.com/video/BV1Tu9xBDEkt/) | `low_score` | 30k | — | — | Claude Code实战：用AI打造 第二大脑 |
| [BV1ynJu6EEpC](https://www.bilibili.com/video/BV1ynJu6EEpC/) | `low_vertical` | 28k | — | — | Ulta总裁：AI Agnet革命 美丽行业实践 |
| [BV1AwXCBxEBk](https://www.bilibili.com/video/BV1AwXCBxEBk/) | `low_score` | 27k | — | — | 杨植麟GTC演讲：Kimi K2.5的 研发内幕 |
| [BV1HDDyB9Emw](https://www.bilibili.com/video/BV1HDDyB9Emw/) | `low_org_story` | 26k | — | — | Block业务主管：裁员40%后 公司如何靠AI运转 |
| [BV1r4Ju65EJT](https://www.bilibili.com/video/BV1r4Ju65EJT/) | `low_score` | 25k | — | — | Codex + Notion：AI第二大脑 落地实战 |
| [BV1g5V66AEUL](https://www.bilibili.com/video/BV1g5V66AEUL/) | `low_score` | 24k | — | — | Arise首席：AI新交互方式 无限画布！ |
| [BV1SsE368Ea8](https://www.bilibili.com/video/BV1SsE368Ea8/) | `low_arr` | 23k | — | — | Leyora CEO：法律Agent 1亿ARR |
| [BV1mncRznEd6](https://www.bilibili.com/video/BV1mncRznEd6/) | `low_editor` | 14k | — | — | Ghostty创始人：程序员应该用AI写代码？ |

## R2（4）

> 元数据残缺或仅 ASR、无专栏；**补标题后抽样读 ASR 前 20 分钟**

| BV | 原排除码 | 说明 |
|-----|----------|------|
| [BV11H526yEiB](https://www.bilibili.com/video/BV11H526yEiB/) | 待补元数据 | 有专栏 27k，标题空 |
| [BV11YTz6BEMz](https://www.bilibili.com/video/BV11YTz6BEMz/) | 待补元数据 | 标题空 |
| [BV128Tz66Eim](https://www.bilibili.com/video/BV128Tz66Eim/) | 待补元数据 | 标题空 |
| [BV1wzTz6vEVm](https://www.bilibili.com/video/BV1wzTz6vEVm/) | 待补元数据 | 标题空 |

## R3（52）

> OpenClaw 重复、创业清单、名人新闻、偏题科学等；规则排除可信

| BV | 原排除码 | 专栏 | ASR | 时长 | 标题 |
|-----|----------|------|-----|------|------|
| [BV1ArFCz5EjX](https://www.bilibili.com/video/BV1ArFCz5EjX/) | `low_podcast_generic` | 119k | — | — | Lex Fridman播客：2026年AI 现状与展望 |
| [BV1mG6nBKECW](https://www.bilibili.com/video/BV1mG6nBKECW/) | `dup_openclaw` | 104k | — | — | 深度访谈：ClawdBot创始人：一个人顶一个团队，从0到现在的产品 |
| [BV1QvrCBkEgE](https://www.bilibili.com/video/BV1QvrCBkEgE/) | `low_celeb_news` | 102k | — | — | 【免费文稿】马斯克2026最新访谈：信息量极大，奇点临近，AGI 2026到来 |
| [BV1sM9yBPE6N](https://www.bilibili.com/video/BV1sM9yBPE6N/) | `low_media_gen` | 91k | — | — | GPT Image2深度体验：AI生图领域新突破 |
| [BV1qEdaBdEYi](https://www.bilibili.com/video/BV1qEdaBdEYi/) | `dup_openclaw_hype` | 84k | — | — | a16z创始人：程序员末日将 Pi与OpenClaw |
| [BV1qhDtBYEMK](https://www.bilibili.com/video/BV1qhDtBYEMK/) | `offtopic_robot` | 82k | — | — | Uber CTO：未来在机器人 物流系统 |
| [BV1mx93BkEPg](https://www.bilibili.com/video/BV1mx93BkEPg/) | `offtopic_chips` | 81k | — | — | Semianalysis CEO：AI 训练算力：空间瓶颈 |
| [BV1G2Gn61E9b](https://www.bilibili.com/video/BV1G2Gn61E9b/) | `offtopic_cpp` | 79k | — | — | C++之父：贝尔实验室往事 AI代码的局限性 |
| [BV16JdVBGEyU](https://www.bilibili.com/video/BV16JdVBGEyU/) | `low_celeb_news` | 78k | — | — | 黄仁勋：英伟达的护城河能否持续？ |
| [BV1wwDbBGEsA](https://www.bilibili.com/video/BV1wwDbBGEsA/) | `low_generic_agi` | 71k | — | — | 深度讨论LLM 推动AGI 基础模型不断推进 |
| [BV1yAo4BsEed](https://www.bilibili.com/video/BV1yAo4BsEed/) | `low_hot_take` | 69k | — | — | 前Paypal高管：PM 已经死透 枪毙了所有产品经理 |
| [BV1wxDnB9Eo9](https://www.bilibili.com/video/BV1wxDnB9Eo9/) | `low_openai_pr` | 66k | — | — | OpenAI总裁：AI要让每个人都受益 是AGI之路 |
| [BV1u3Lz6AEb3](https://www.bilibili.com/video/BV1u3Lz6AEb3/) | `offtopic_ms` | 61k | — | — | 多模融合（多模态对齐和组合）：对话 Amy Boyd & Nitya Narasimhan, 微 |
| [BV1aTrKBTEAD](https://www.bilibili.com/video/BV1aTrKBTEAD/) | `low_founder_drama` | 61k | — | — | Roadrunner创始人：从CPO到CEO |
| [BV1c8RmB6E6C](https://www.bilibili.com/video/BV1c8RmB6E6C/) | `low_openai_pr` | 60k | — | — | OpenAI总裁：AI 即将迎来 爆发式增长 |
| [BV1RrLz6rEH2](https://www.bilibili.com/video/BV1RrLz6rEH2/) | `low_health` | 58k | — | — | 走进 Abridge：正在监听 1 亿次医生诊疗的 AI —— Abridge 的 Janie  |
| [BV1fqAHz7EG6](https://www.bilibili.com/video/BV1fqAHz7EG6/) | `offtopic_science` | 57k | — | — | 陶哲轩：当最强大脑 遇上宇宙终极难题 |
| [BV1hoGm6XEdD](https://www.bilibili.com/video/BV1hoGm6XEdD/) | `offtopic_chips` | 57k | — | — | 芯片设计的深度解读 – Reiner Pope |
| [BV1EfGd6WEzK](https://www.bilibili.com/video/BV1EfGd6WEzK/) | `low_exec_gossip` | 55k | — | — | Alex Wang：加入Meta 10个月 幕后故事 |
| [BV1rdAVzAEdS](https://www.bilibili.com/video/BV1rdAVzAEdS/) | `dup_openclaw` | 55k | — | — | OpenClaw教程：实战 完整指南 |
| [BV1T6Gd6qEyS](https://www.bilibili.com/video/BV1T6Gd6qEyS/) | `low_idea_list` | 50k | — | — | AI创业思路：9个最大的 AI创业点子 |
| [BV1FZQ8B2EJn](https://www.bilibili.com/video/BV1FZQ8B2EJn/) | `low_openai_pr` | 50k | — | — | OpenAI首席科学家：超越代码的 强化学习 |
| [BV1GzPyzuEMe](https://www.bilibili.com/video/BV1GzPyzuEMe/) | `offtopic_writing` | 47k | — | — | 写作技巧：2026年最值得学习的技能（AI无法取代） |
| [BV1oGDbBeEjv](https://www.bilibili.com/video/BV1oGDbBeEjv/) | `low_history` | 47k | — | — | DeepMind播客：AlphaGo 10周年：AI的转折点 |
| [BV1Ye9yBjELt](https://www.bilibili.com/video/BV1Ye9yBjELt/) | `offtopic_chips` | 46k | — | — | 谷歌云CEO：TPU比NVIDIA 的核心优势 |
| [BV1tSDtBnE2k](https://www.bilibili.com/video/BV1tSDtBnE2k/) | `low_scaling_debate` | 46k | — | — | arc创始人：只有Scaling Law能到达AGI |
| [BV1Dj93BUEXU](https://www.bilibili.com/video/BV1Dj93BUEXU/) | `dup_openclaw` | 46k | — | — | OpenClaw实战：Every团队演示使用Case |
| [BV1LvZTBREby](https://www.bilibili.com/video/BV1LvZTBREby/) | `low_celeb_news` | 43k | — | — | 马斯克：xAI内部复盘 与规划 |
| [BV1NK5m61ErG](https://www.bilibili.com/video/BV1NK5m61ErG/) | `dup_codex_tutorial` | 42k | — | — | Codex实战：AI编程2026 新手教程 |
| [BV1R25A6BEfX](https://www.bilibili.com/video/BV1R25A6BEfX/) | `low_celeb_news` | 41k | — | — | 黄仁勋最新访谈：从生成到代理计算 需求再翻千倍 |
| [BV1NscRzUEia](https://www.bilibili.com/video/BV1NscRzUEia/) | `dup_openclaw` | 40k | — | — | OpenClaw实战：养虾指南！ 打造你的数字员工 |
| [BV1ka9CBZEGN](https://www.bilibili.com/video/BV1ka9CBZEGN/) | `low_news` | 39k | — | — | 无内容Tibo：5分钟搞懂硅基 |
| [BV1ug7Q6uEhX](https://www.bilibili.com/video/BV1ug7Q6uEhX/) | `low_solo_biz` | 34k | — | — | Orgo创始人：独自构建AI 事业：一人公司 |
| [BV1EJjN6XETy](https://www.bilibili.com/video/BV1EJjN6XETy/) | `low_solo_biz` | 33k | — | — | Dan Koe：把多重兴趣 变成一人公司 |
| [BV1db7V6rEpr](https://www.bilibili.com/video/BV1db7V6rEpr/) | `low_news` | 31k | — | — | 李飞飞：10年后 只有两种工作 |
| [BV1qiE56SE4c](https://www.bilibili.com/video/BV1qiE56SE4c/) | `low_solo_biz` | 31k | — | — | 一人公司：一个人做出5个APP 全部使用AI工具 |
| [BV1VRdABBEnK](https://www.bilibili.com/video/BV1VRdABBEnK/) | `dup_openclaw` | 30k | — | — | OpenClaw实战：从零开始完成 OpenClaw全套配置 |
| [BV1FNDbBgEkn](https://www.bilibili.com/video/BV1FNDbBgEkn/) | `low_idea_list` | 29k | — | — | AI创业思路：23 个让我彻夜 难眠的AI趋势 |
| [BV1bq7R67EqG](https://www.bilibili.com/video/BV1bq7R67EqG/) | `offtopic_robot` | 27k | — | — | Seeed CEO：物理AI的未来 不是人形机器人 |
| [BV1VEooBdEjQ](https://www.bilibili.com/video/BV1VEooBdEjQ/) | `low_media_gen` | 27k | — | — | Seedance实战：AI视频 转向可控编辑 |
| [BV1rEEh6KEVF](https://www.bilibili.com/video/BV1rEEh6KEVF/) | `low_founder_drama` | 27k | — | — | Giga创始人：为什么拒绝孙正义 去做创业 |
| [BV1Va9yBmEaK](https://www.bilibili.com/video/BV1Va9yBmEaK/) | `low_news` | 27k | — | — | 新模型解读：GPT5.5登场 DeepSeek V4发布 |
| [BV1KMGU6LEqd](https://www.bilibili.com/video/BV1KMGU6LEqd/) | `low_news_event` | 22k | — | — | 两场关于通用人工智能（AGI）的对赌：Google I/O 亮点解析 |
| [BV1bv7R6UEfy](https://www.bilibili.com/video/BV1bv7R6UEfy/) | `offtopic_bci` | 22k | — | — | Neuralink联创：脑机接口是 AI的终极形态 |
| [BV1WhoEBPEau](https://www.bilibili.com/video/BV1WhoEBPEau/) | `low_media_gen` | 22k | — | — | OpenAI官方：重磅！GPT Image2.0现场演示 |
| [BV1HcifBWEAE](https://www.bilibili.com/video/BV1HcifBWEAE/) | `low_gimmick` | — | — | — | 她将自己的一生变成了训练数据——为了一个AI宝宝 |
| [BV1KQPyzcEwj](https://www.bilibili.com/video/BV1KQPyzcEwj/) | `dup_a16z_founder` | — | — | — | a16z合伙人：如何成为一名 伟大的创始人? |
| [BV1a9zXBeEKc](https://www.bilibili.com/video/BV1a9zXBeEKc/) | `low_openai_pr` | — | — | — | OpenAI首席研究员：人才大战！OpenAI如何做研究？ |
| [BV1iUZBBjEUo](https://www.bilibili.com/video/BV1iUZBBjEUo/) | `low_celeb_news` | — | — | — | 马斯克：天才工程师：AI需要一个人开挂 |
| [BV1paf9BTEBk](https://www.bilibili.com/video/BV1paf9BTEBk/) | `dup_openclaw` | — | — | — | OpenClaw现场演示如何使用 |
| [BV1qeitB8EAk](https://www.bilibili.com/video/BV1qeitB8EAk/) | `offtopic_science` | — | — | — | 飞飞飞：深度探讨空间世界生成模型 |
| [BV1sFibBkEcT](https://www.bilibili.com/video/BV1sFibBkEcT/) | `low_arr` | — | — | — | Lovable创始人：Lovable是如何1个人实现2亿美元ARR的 |

## skipped_no_link 补链后优先复核（15）

无 ASR 暂不能读；**补链后按 R1 候选**（工程密度可能高于标题）：

| BV | 标题 | 补链后优先级 |
|-----|------|--------------|
| BV1SWTz6yEBA | OpenAI工程师：PR成本降为零 人类审查成瓶颈 | **高**（eval/harness） |
| BV1zEKX6aEiG | Engram联创：将记忆微调进大模型权重 | **高**（memory） |
| BV1MrTi6iEvh | 编程工作流：最佳 Vibe Coding 方式 | **高**（ai_coding） |
| BV1CiTz6iEYZ | Cloudflare CEO：机器人接管 广告模式失效 | 中（agent 社会） |
| BV1ZpKX6fEuo | AMP团队：AI竞赛不仅仅是购买更多GPU | 中（infra） |
| BV1EAK96aEVL | Radical AI：AI科学的瓶颈与解决方案 | 中（research） |
| 其余 9 条 | 见 exclude 文档 | 低–中 |

## 复核口令

```bash
# 单 BV 看素材路径
python 99-System/scripts/bilibili-ingest-reconcile.py  # 定位 ingest_dir
# 有 column_article.md → 先读专栏
# 无专栏 → 读 article.md + video_description.md
```
