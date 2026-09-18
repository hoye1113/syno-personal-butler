---
title: B站明确排除清单
created: 2026-07-07
tags: [audit, bilibili]
description: 未收录池中不打算收录的 BV 及原因，供查漏补缺
---

# B站明确排除清单（2026-07-07）

> 共 **94** 条（ASR 就绪池内）+ **15** 条 skipped_no_link + **4** 条待补元数据

## 排除原因统计

| 原因码 | 数量 | 说明 |
|--------|------|------|
| `low_score` | 15 | 评分不足 |
| `low_arr` | 7 | ARR/增长叙事 |
| `dup_openclaw` | 6 | OpenClaw 重复 |
| `low_celeb_news` | 5 | 名人/新闻 |
| `low_openai_pr` | 4 | OpenAI PR 饱和 |
| `low_saas_ceo` | 3 | SaaS CEO 故事 |
| `low_solo_biz` | 3 | 一人公司/副业叙事 |
| `low_org_story` | 3 | 组织/裁员叙事 |
| `low_media_gen` | 3 | 多模态生成 demo，非 Agent 工 |
| `low_news` | 3 | 快讯/科普，非深度 |
| `offtopic_chips` | 3 | 算力/芯片产业，非 Harness |
| `low_org_vision` | 2 | 组织愿景，已有 Linear/Every |
| `low_idea_list` | 2 | 创业清单 |
| `low_product` | 2 | 单品产品访谈 |
| `low_founder_drama` | 2 | 创业戏剧，非技术 |
| `offtopic_robot` | 2 | 机器人物流，非软件 Agent |
| `offtopic_science` | 2 | 科学/数学，非 Agent |
| `low_vertical` | 2 | 垂直行业商业访谈 |
| `low_saas_transform` | 1 | SaaS 转型泛谈 |
| `low_tutorial_alpha` | 1 | 教程/回顾 |
| `low_podcast_generic` | 1 | 泛 AI 展望播客 |
| `low_exec_gossip` | 1 | 人事/八卦向 |
| `offtopic_cpp` | 1 | 非 Agent 主题 |
| `offtopic_writing` | 1 | 非 AI Agent |
| `low_gimmick` | 1 | 话题性故事，非工程 |
| `low_news_event` | 1 | 活动新闻 |
| `dup_a16z_founder` | 1 | 与 vault 职业/组织向重叠 |
| `dup_codex_tutorial` | 1 | 已有 [[OpenAI官方-Codex新 |
| `dup_openclaw_founder` | 1 | 与 [[OpenClaw创始人-我是如何 |
| `low_health` | 1 | 医疗垂直（已有 OpenAI 健康团队） |
| `offtopic_bci` | 1 | 脑机接口，非本 vault 主题 |
| `low_app_demo` | 1 | 工具拼盘 demo |
| `low_duplicate_claude` | 1 | 与 Boris/Cowork 多篇重叠 |
| `low_editor` | 1 | 编辑器观点 |
| `low_history` | 1 | 历史回顾 |
| `asr_garbage` | 1 | 标题 ASR 损坏/不可读 |
| `dup_openclaw_hype` | 1 | OpenClaw 生态重复 + 标题党 |
| `offtopic_db` | 1 | 数据库观点 |
| `low_trend` | 1 | 趋势综述，易过时 |
| `low_scaling_debate` | 1 | Scaling 争论，非工程 |
| `offtopic_ms` | 1 | 微软多模态课程 |
| `low_generic_agi` | 1 | 泛 AGI 讨论 |
| `low_hot_take` | 1 | 标题党观点文 |

## 完整排除列表（按原因码分组）

### `low_score`（15）

> 工程向评分不足（0），暂不收

| BV | 标题 |
|-----|------|
| BV1g5V66AEUL | Arise首席：AI新交互方式 无限画布！ |
| BV1Tu9xBDEkt | Claude Code实战：用AI打造 第二大脑 |
| BV1YX9CB5ETB | Claude Design实战：1小时从创意 到高保真原型 |
| BV1r4Ju65EJT | Codex + Notion：AI第二大脑 落地实战 |
| BV18grKBNEJA | ElevenLabs&Lovable CEO：坐上AI这艘火箭 |
| BV17x9yBXEug | Meta前高管：为什么一半的 产品经理陷入困境 |
| BV1F8Ju6VEbp | Nebius联创：AI基建无泡沫 全栈交付是关键 |
| BV1H1FCzrEEF | OpenAI官方博客：AI在各行业 落地现状 |
| BV1WPo4B9EyZ | Sam Altman：AI海啸已来 社会如何准备 |
| BV1eS9CBjESZ | Stripe设计主管：如何用AI设计 我们的新网站 |
| BV14jrKBcEav | Vercel&Stripe&Google CPO: 2026年世界级GTM的模样 |
| BV1ToE56KE7E | a16z前合伙人：关于AI今年 最理性的简介 |
| BV1gDE56gE7B | xAI研究员：xAI从零构建 视频模型的内幕 |
| BV1AwXCBxEBk | 杨植麟GTC演讲：Kimi K2.5的 研发内幕 |
| BV1CoLA6REyB | 杨立昆：继续对LLM开炮，世界模型才是未来 |

### `low_arr`（7）

> 增长/ARR 叙事，工程干货少

| BV | 标题 |
|-----|------|
| BV1nnGU6TEeN | Cerebras 630 亿美元 IPO 背后的故事：对话创始人兼 CEO Andrew Feldman |
| BV1YfE36TEyz | Chatbase CEO：如何117天 实现百万ARR |
| BV1RnEL6UEdh | Emergent CEO：9个月 1亿美元ARR |
| BV12RVf62Ed2 | Harvey CEO：31岁年轻人 如何运营百亿公司 |
| BV1SsE368Ea8 | Leyora CEO：法律Agent 1亿ARR |
| BV1sFibBkEcT | Lovable创始人：Lovable是如何1个人实现2亿美元ARR的 |
| BV1KXDtBEEbV | Polsia CEO：1个人用AI Agent，1个月百万美金ARR |

### `dup_openclaw`（6）

> OpenClaw 已收 4 篇，配置/教程/demo 角度重叠

| BV | 标题 |
|-----|------|
| BV1Dj93BUEXU | OpenClaw实战：Every团队演示使用Case |
| BV1VRdABBEnK | OpenClaw实战：从零开始完成 OpenClaw全套配置 |
| BV1NscRzUEia | OpenClaw实战：养虾指南！ 打造你的数字员工 |
| BV1rdAVzAEdS | OpenClaw教程：实战 完整指南 |
| BV1paf9BTEBk | OpenClaw现场演示如何使用 |
| BV1mG6nBKECW | 深度访谈：ClawdBot创始人：一个人顶一个团队，从0到现在的产品 |

### `low_celeb_news`（5）

> 名人访谈/新闻向，工程密度低

| BV | 标题 |
|-----|------|
| BV1QvrCBkEgE | 【免费文稿】马斯克2026最新访谈：信息量极大，奇点临近，AGI 2026到来 |
| BV1LvZTBREby | 马斯克：xAI内部复盘 与规划 |
| BV1iUZBBjEUo | 马斯克：天才工程师：AI需要一个人开挂 |
| BV1R25A6BEfX | 黄仁勋最新访谈：从生成到代理计算 需求再翻千倍 |
| BV16JdVBGEyU | 黄仁勋：英伟达的护城河能否持续？ |

### `low_openai_pr`（4）

> OpenAI PR/研究宣传，P0-P2 已饱和

| BV | 标题 |
|-----|------|
| BV1c8RmB6E6C | OpenAI总裁：AI 即将迎来 爆发式增长 |
| BV1wxDnB9Eo9 | OpenAI总裁：AI要让每个人都受益 是AGI之路 |
| BV1a9zXBeEKc | OpenAI首席研究员：人才大战！OpenAI如何做研究？ |
| BV1FZQ8B2EJn | OpenAI首席科学家：超越代码的 强化学习 |

### `low_saas_ceo`（3）

> SaaS CEO 增长故事

| BV | 标题 |
|-----|------|
| BV1Jo7R6eEGi | Every CEO：AI越强大 工作也越多 |
| BV1De7R6JELZ | Every CEO：全员AI后 员工数翻了3倍 |
| BV1aQdHBpEMB | Hearth AI创始人：像艺术家一样去创作 |

### `low_solo_biz`（3）

> 一人公司/副业叙事

| BV | 标题 |
|-----|------|
| BV1EJjN6XETy | Dan Koe：把多重兴趣 变成一人公司 |
| BV1ug7Q6uEhX | Orgo创始人：独自构建AI 事业：一人公司 |
| BV1qiE56SE4c | 一人公司：一个人做出5个APP 全部使用AI工具 |

### `low_org_story`（3）

> 组织/裁员叙事

| BV | 标题 |
|-----|------|
| BV1HDDyB9Emw | Block业务主管：裁员40%后 公司如何靠AI运转 |
| BV1dg5t6gEJ8 | Brex CEO：他打造了首位 全职 AI CEO |
| BV1jrjP6UEe3 | Brex CEO：打造全公司
m共用的AI型CEO |

### `low_media_gen`（3）

> 多模态生成 demo，非 Agent 工程

| BV | 标题 |
|-----|------|
| BV1sM9yBPE6N | GPT Image2深度体验：AI生图领域新突破 |
| BV1WhoEBPEau | OpenAI官方：重磅！GPT Image2.0现场演示 |
| BV1VEooBdEjQ | Seedance实战：AI视频 转向可控编辑 |

### `low_news`（3）

> 快讯/科普，非深度

| BV | 标题 |
|-----|------|
| BV1Va9yBmEaK | 新模型解读：GPT5.5登场 DeepSeek V4发布 |
| BV1ka9CBZEGN | 无内容Tibo：5分钟搞懂硅基 |
| BV1db7V6rEpr | 李飞飞：10年后 只有两种工作 |

### `offtopic_chips`（3）

> 算力/芯片产业，非 Harness

| BV | 标题 |
|-----|------|
| BV1mx93BkEPg | Semianalysis CEO：AI 训练算力：空间瓶颈 |
| BV1hoGm6XEdD | 芯片设计的深度解读 – Reiner Pope |
| BV1Ye9yBjELt | 谷歌云CEO：TPU比NVIDIA 的核心优势 |

### `low_org_vision`（2）

> 组织愿景，已有 Linear/Every 类

| BV | 标题 |
|-----|------|
| BV16wGS6MEEn | Notion CEO：AI原生组织，应该像爵士乐队 |
| BV17p9yB9Ef3 | Replit CEO：未来公司只剩这两种人，建设者与布道者 |

### `low_idea_list`（2）

> 创业点子清单类，非长期知识

| BV | 标题 |
|-----|------|
| BV1FNDbBgEkn | AI创业思路：23 个让我彻夜 难眠的AI趋势 |
| BV1T6Gd6qEyS | AI创业思路：9个最大的 AI创业点子 |

### `low_product`（2）

> 单品产品访谈

| BV | 标题 |
|-----|------|
| BV1X1XdBCEqH | Granola联创：AI时代的笔记 软件应该这样 |
| BV1FX536qEFS | Speechify CEO：从100位CEO 学到的经验 |

### `low_founder_drama`（2）

> 创业戏剧，非技术

| BV | 标题 |
|-----|------|
| BV1rEEh6KEVF | Giga创始人：为什么拒绝孙正义 去做创业 |
| BV1aTrKBTEAD | Roadrunner创始人：从CPO到CEO |

### `offtopic_robot`（2）

> 机器人物流，非软件 Agent

| BV | 标题 |
|-----|------|
| BV1bq7R67EqG | Seeed CEO：物理AI的未来 不是人形机器人 |
| BV1qhDtBYEMK | Uber CTO：未来在机器人 物流系统 |

### `offtopic_science`（2）

> 科学/数学，非 Agent

| BV | 标题 |
|-----|------|
| BV1fqAHz7EG6 | 陶哲轩：当最强大脑 遇上宇宙终极难题 |
| BV1qeitB8EAk | 飞飞飞：深度探讨空间世界生成模型 |

### `low_vertical`（2）

> 垂直行业商业访谈

| BV | 标题 |
|-----|------|
| BV1tw9yBMEUK | Snap CEO：面对增长还是 失败的选择 |
| BV1ynJu6EEpC | Ulta总裁：AI Agnet革命 美丽行业实践 |

### `low_saas_transform`（1）

> SaaS 转型泛谈

| BV | 标题 |
|-----|------|
| BV16BQhBEEgH | Asana CPO：AI时代软件 公司如何转型 |

### `low_tutorial_alpha`（1）

> 教程/回顾

| BV | 标题 |
|-----|------|
| BV19qLA6BEHx | 从零开始构建 AlphaGo – Eric Jang |

### `low_podcast_generic`（1）

> 泛 AI 展望播客

| BV | 标题 |
|-----|------|
| BV1ArFCz5EjX | Lex Fridman播客：2026年AI 现状与展望 |

### `low_exec_gossip`（1）

> 人事/八卦向

| BV | 标题 |
|-----|------|
| BV1EfGd6WEzK | Alex Wang：加入Meta 10个月 幕后故事 |

### `offtopic_cpp`（1）

> 非 Agent 主题

| BV | 标题 |
|-----|------|
| BV1G2Gn61E9b | C++之父：贝尔实验室往事 AI代码的局限性 |

### `offtopic_writing`（1）

> 非 AI Agent

| BV | 标题 |
|-----|------|
| BV1GzPyzuEMe | 写作技巧：2026年最值得学习的技能（AI无法取代） |

### `low_gimmick`（1）

> 话题性故事，非工程

| BV | 标题 |
|-----|------|
| BV1HcifBWEAE | 她将自己的一生变成了训练数据——为了一个AI宝宝 |

### `low_news_event`（1）

> 活动新闻

| BV | 标题 |
|-----|------|
| BV1KMGU6LEqd | 两场关于通用人工智能（AGI）的对赌：Google I/O 亮点解析 |

### `dup_a16z_founder`（1）

> 与 vault 职业/组织向重叠

| BV | 标题 |
|-----|------|
| BV1KQPyzcEwj | a16z合伙人：如何成为一名 伟大的创始人? |

### `dup_codex_tutorial`（1）

> 已有 [[OpenAI官方-Codex新手教程]]

| BV | 标题 |
|-----|------|
| BV1NK5m61ErG | Codex实战：AI编程2026 新手教程 |

### `dup_openclaw_founder`（1）

> 与 [[OpenClaw创始人-我是如何使用OpenClaw的]] 角度重叠

| BV | 标题 |
|-----|------|
| BV1NiooB5ESW | OpenClaw创始人：Claw的现状报告，软件开发的逻辑变了 |

### `low_health`（1）

> 医疗垂直（已有 OpenAI 健康团队）

| BV | 标题 |
|-----|------|
| BV1RrLz6rEH2 | 走进 Abridge：正在监听 1 亿次医生诊疗的 AI —— Abridge 的 Janie Lee 与 Chai Asawa 访谈录 |

### `offtopic_bci`（1）

> 脑机接口，非本 vault 主题

| BV | 标题 |
|-----|------|
| BV1bv7R6UEfy | Neuralink联创：脑机接口是 AI的终极形态 |

### `low_app_demo`（1）

> 工具拼盘 demo

| BV | 标题 |
|-----|------|
| BV1gE93BEEUq | AI App实战：现场演示6个AI工具 共同开发一个App |

### `low_duplicate_claude`（1）

> 与 Boris/Cowork 多篇重叠

| BV | 标题 |
|-----|------|
| BV1hkFkz9E6N | Claude之父：AI 直播写代码仓库 |

### `low_editor`（1）

> 编辑器观点

| BV | 标题 |
|-----|------|
| BV1mncRznEd6 | Ghostty创始人：程序员应该用AI写代码？ |

### `low_history`（1）

> 历史回顾

| BV | 标题 |
|-----|------|
| BV1oGDbBeEjv | DeepMind播客：AlphaGo 10周年：AI的转折点 |

### `asr_garbage`（1）

> 标题 ASR 损坏/不可读

| BV | 标题 |
|-----|------|
| BV1pYDiBPEQA | Claude深度功能：Claude代码的 Claude强制19种测试统计准确性失效 |

### `dup_openclaw_hype`（1）

> OpenClaw 生态重复 + 标题党

| BV | 标题 |
|-----|------|
| BV1qEdaBdEYi | a16z创始人：程序员末日将 Pi与OpenClaw |

### `offtopic_db`（1）

> 数据库观点

| BV | 标题 |
|-----|------|
| BV1rh526BEjY | Postgres之父：LLM 不会 取代关系数据库 |

### `low_trend`（1）

> 趋势综述，易过时

| BV | 标题 |
|-----|------|
| BV1tF5m6UEGf | AI编程工具：2026年 趋势与Vibe Code |

### `low_scaling_debate`（1）

> Scaling 争论，非工程

| BV | 标题 |
|-----|------|
| BV1tSDtBnE2k | arc创始人：只有Scaling Law能到达AGI |

### `offtopic_ms`（1）

> 微软多模态课程

| BV | 标题 |
|-----|------|
| BV1u3Lz6AEb3 | 多模融合（多模态对齐和组合）：对话 Amy Boyd & Nitya Narasimhan, 微软 |

### `low_generic_agi`（1）

> 泛 AGI 讨论

| BV | 标题 |
|-----|------|
| BV1wwDbBGEsA | 深度讨论LLM 推动AGI 基础模型不断推进 |

### `low_hot_take`（1）

> 标题党观点文

| BV | 标题 |
|-----|------|
| BV1yAo4BsEed | 前Paypal高管：PM 已经死透 枪毙了所有产品经理 |

## 待补元数据（暂不收）

| BV |
|-----|
| BV11H526yEiB |
| BV11YTz6BEMz |
| BV128Tz66Eim |
| BV1wzTz6vEVm |

## skipped_no_link（无 ASR，暂不可收）

需 Recastory 补链/转写后再评估。

| BV | 标题 |
|-----|------|
| BV1opjN6SEnb | AI教父Hinton：AI已具备意识 超智能即将到来 |
| BV1ZpKX6fEuo | AMP团队：AI竞赛不仅仅 是购买更多GPU |
| BV1CiTz6iEYZ | Cloudflare CEO：机器人接管 广告模式失效 |
| BV1zEKX6aEiG | Engram联创：将记忆微调 进大模型权重 |
| BV1vtTi6LEhx | Hyperframes教程：用AI免费 制作专业视频 |
| BV1rfKX6NEAY | Lambda联创：GPU神话 2026AI算力现状 |
| BV1oHjN6nE6g | OpenAI CFO：AI如何重塑 财务行业 |
| BV1SWTz6yEBA | OpenAI工程师：PR成本降为零 人类审查成瓶颈 |
| BV1EAK96aEVL | Radical AI：AI科学的瓶颈 与解决方案 |
| BV19jTz6JELc | SaaS投资人：开源AI崛起 闭源巨头承压 |
| BV1gtTu6hEDD | Zynga创始人：C端应用的机会就要来了 |
| BV1rLjN6xEc6 | 扎克伯格：AI重塑生物学 人类攻克疾病？ |
| BV1MrTi6iEvh | 编程工作流：我找到了最佳 Vibe Coding 方式 |
| BV152jP6LEEA | 非侵入式脑机接口的未来 / AXION 创始人在 South Park Commons 的对话 |
| BV1HGjN6tE6V | 黄仁勋：AI工厂 智能革命的核心 |

## 历史排除（P0 文档，仍有效）

| BV | 原因 |
|-----|------|
| BV1Dj93BUEXU | OpenClaw Every demo 重复 |
| BV1EJjN6XETy | Dan Koe 一人公司 |
| BV1FNDbBgEkn | 23 个 AI 趋势清单 |
| BV1G2Gn61E9b | C++ 之父 |
| BV1KQPyzcEwj | a16z 伟大创始人 |
| BV1NK5m61ErG | Codex 新手教程重复 |
| BV1NiooB5ESW | OpenClaw 创始人现状重复 |
| BV1NscRzUEia | OpenClaw 养虾指南 |
| BV1T6Gd6qEyS | 9 个创业点子 |
