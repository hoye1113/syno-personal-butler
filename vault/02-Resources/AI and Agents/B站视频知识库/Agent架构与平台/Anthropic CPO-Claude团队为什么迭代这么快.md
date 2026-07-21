---
title: "Anthropic CPO：Claude 团队为什么迭代这么快"
tags: ["ai_agent", "video_transcript", "bilibili", "anthropic", "claude_code", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "anthropic", "claude_code", "harness_engineering"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Lenny Rachitsky × Kat Wu：Claude Code/Cowork 产品负责人谈 AI 原生 PM、常青发布室、产品品味工程师、牺牲一致性换真实反馈、安全 AGI 使命、模型拐杖与 100% 自动化。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Anthropic CPO-Claude团队为什么迭代这么快.md"
source_sha256: "7c1c07ddcfe954b5ece68cfcf5b199e8c69604ef5ac9e96c431ee7d905101219"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV18o526DEFr/"
duration: "55:00"
saved: 2026-07-06
updated: 2026-07-06
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV18o526DEFr/ingest"
column_url: "https://www.bilibili.com/read/cv49010011/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV18o526DEFr/ingest/column_article.md"
source_original_date: "2026-04-23"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Lenny Rachitsky"
guest_name: "Kat Wu"
guest_title: "Anthropic Claude Code & Cowork 产品负责人"
speaker_inference: "column_article S-tier + video_description"
speaker_confidence: high
author:
  - "[[Kat Wu]]"
concepts:
  - id: evergreen_release_room
    zh: 常青发布室
    en: evergreen release room
    one_line: 功能就绪即进发布室，次日 DevRel/PMM/文档同步官宣，消摩擦
  - id: product_taste
    zh: 产品品味
    en: product taste
    one_line: 编码便宜后「写什么」比「怎么写」贵；筛 GitHub issue 的稀缺判断力
  - id: model_crutch
    zh: 模型拐杖
    en: model crutch
    one_line: 为弥补模型弱点加待办列表等 scaffolding；模型升级后删掉
  - id: safe_agi_mission
    zh: 安全 AGI 使命
    en: safe AGI mission
    one_line: 优先级冲突时以使命裁决；Claude Code 可让位于公司总目标
  - id: sacrifice_consistency
    zh: 牺牲一致性
    en: sacrifice consistency
    one_line: 快发重叠/不完善功能，用真实场景测形式，再用引导补认知负担
  - id: action_based_agent
    zh: 行动型代理
    en: action-based agent
    one_line: 2024 聊天产品 vs Claude Code 代表用户做事；啊哈时刻在「它真干了」
  - id: hundred_percent_automation
    zh: 百分百自动化
    en: 100% automation
    one_line: 95% 准确率仍要人工复核=没自动化；核心工作流必须打磨到全对
  - id: research_preview
    zh: 研究预览
    en: research preview
    one_line: 早期标注+低承诺发布，一两周就能上线收反馈
---

# Anthropic CPO：Claude 团队为什么迭代这么快

**Host：** Lenny Rachitsky（*Lenny's Podcast* / Lenny's Newsletter）  
**Guest：** Kat Wu（Anthropic · Claude Code & Cowork 产品负责人）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV18o526DEFr](https://www.bilibili.com/video/BV18o526DEFr/) · **时长** ~55 min · **专栏** [cv49010011](https://www.bilibili.com/read/cv49010011/)

---

## 开场

Lenny 播客里 Boris 那集已是顶流；这集换 **Kat Wu**——她和 Boris 搭班子，把 Claude Code、Cowork 推到行业前台。核心问题就一个：**Anthropic 为什么几乎天天发 major 功能？** AI 把工程周期从六个月压到一天，PM 该干什么？组织怎么在落后起步后反超 OpenAI？

六章按专栏时间戳：**天级发布** → **品味工程师** → **牺牲一致性** → **统一使命** → **模型拐杖** → **100% 自动化**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 常青发布室 | evergreen release room | 功能内测通过即进发布通道，次日市场/文档/DevRel 跟上 |
| 研究预览 | research preview | 标明早期、可能下架，降低发布承诺，快迭代 |
| 产品品味 | product taste | 在万千需求里选对 UX、选对构建什么 |
| 模型拐杖 | model crutch | 待办列表等人工 scaffolding，帮弱模型完成任务 |
| 斜杠增强 | slash enhancement | Claude Code 内置引导，教用户 100 功能里哪 10 个必用 |
| 行动型产品 | action-based product | 代理代表你执行，不是只聊天给建议 |
| 思考词 | thinking words | Claude 思考时 UI 显示的词，Kat 最爱「显化」Manifesting |
| 应用 AI 团队 | Applied AI | 帮客户上 API 的技术型 GTM，Cowork/Claude Code 第二大 token 消费者 |

---

## 01 AI 原生发布：从六个月到天 [05:12]

**Lenny Rachitsky：** 我从未见过像 Anthropic 这样快的发布节奏。有人做了发布日历，几乎 **每天** 一个 major 功能。先帮大家定位：你和 Boris 怎么分工？Claude Code 团队里 PM 到底干什么？

**Kat Wu：** 跟 Boris 合作很幸运——他是技术负责人，产品远见强，会定 **未来三到六个月**「产品 AGI 化之后」长什么样。我大部分时间找 **从现状到那幅愿景的路**：跨职能对齐市场、销售、财务，功能就绪后 **没有任何东西能挡发布**。

我们俩大概 **80% 想法撞线**，剩下各管 20%——我更关心的我推，他更关心的他推。界限很模糊，但有效。

**Lenny Rachitsky：** 录音前你说你在面试 **数百名** PM。有人开玩笑说，每次被问「介绍 Anthropic PM」都能收咨询费，年收入能到 **3000 亿** 了。你看到很多人 **理解错了**——成功 AI PM 需要什么？

**Kat Wu：** AI 之前技术慢，你可以规划 **6–12 个月**，发布慢，所以要跟各团队 **对齐多季度路线图**——当时写代码贵，得等别人先解除你的阻塞。现在有 AI 加速工程、模型能力跳得快，很多功能周期从 **六个月 → 一个月 → 一周甚至一天**。

PM 该少盯多季度协调，多盯 **怎么最快把东西交到用户手里**。我们要一个「概念角落」：工程师或 PM 周一有个想法，**周末就能上线**。AI 原生 PM 的胜负手是 **缩短 idea-to-ship**，并定义 **开箱即用最重要的任务**。

**Lenny Rachitsky：** 具体怎么快？除了最先进模型，PM 团队还做了什么？

**Kat Wu：** 第一，**目标要尖**。LLM 太通用，「为谁建、解决什么、第一用例是什么」很容易糊。好 PM 会说：主用户是 **专业开发者**；要解决 **权限提示疲劳**；企业要 **零权限提示** 的安全方案——一下砍掉很多歪路。

第二，**可重复的发布流程**。Claude Code 几乎所有功能都走 **研究预览**——明确告诉用户这是早期想法、要收反馈、**不一定永久支持**。承诺低了，**一两周** 就能发。

第三，PM 建 **跨职能框架**：工程觉得 ready、内测过了，就进 **常青发布室**（evergreen release room）。文档负责人 Sarah、PMM Alex、DevRel Tarek 和 Lydia **第二天** 发公告。工程师发布摩擦极低；PM 的价值是 **把这条流水线搭起来**。

**Lenny Rachitsky：** PRD 呢？还写长文档吗？

**Kat Wu：** 两件事更常做：**严格指标**，每周全团队过一遍——人人懂业务、懂关键目标和驱动因素；还有 **团队原则清单**——主用户是谁、为什么、我们愿意放弃什么。大家能 **自己做决定**，不怕被 PM 或 stakeholder 卡住。

特别糊的功能偶尔写 **一页纸**：目标、 delight 用例、要修的失败模式。真要几个月的基础设施项目才写完整 PRD。

**Lenny Rachitsky：** 网上问：你们刚发 **Mythos** 预览，强大到大家有点怕——是不是靠内部神话模型才这么快？还有 **Claude Code 源码泄露** 怎么回事？

**Kat Wu：** 我们快了好几个 **季度** 了，不全是 Mythos 的功劳——内部确实用前沿模型，略提速，但 **主因是流程和团队预期**：流程极 lean，目标就是 **消掉所有发布障碍**，任何人 **不到一周、有时一天** 就能推想法上线。

源码泄露我们立刻查，是 **人为失误**——有人跟 Claude 写 PR，改软件包发布方式，**两层人工审查** 仍漏了。人已还在；我们加强流程，大部分改进已上线。

**Lenny Rachitsky：** 另一个炸点：**OpenClaw** 不能绑 Claude 订阅，社区很沮丧。为什么？

**Kat Wu：** Claude 需求太大，我们在扩基础设施、提 **token 效率**。这些工具 **不是为第三方产品设计的**，用法跟第一方不同。我们尽量给 **无缝过渡**——订阅用户能拿一些积分——但不得不 **优先第一方产品和 API**。这是艰难决定。

**Lenny Rachitsky：** Anthropic PM 组织长什么样？

**Kat Wu：** 大概 **30–40 名 PM**。Diane 带 **研究 PM**——客户对模型的反馈回灌研究、管模型发布；**云开发者平台** 维护 Claude Code 依赖的 API、托管代理等；**Claude Code 团队** 同时负责 Claude Code 和 Cowork 核心产品；**企业团队** 管成本、RBAC、安全；**增长团队** 管全产品套件增长，跟我们在 Code/Cowork 上紧密协作。

> **金句 · Kat Wu**
> **中文：** 我们要的是想法能在周末前交到用户手里——不是六个月后。
> **原文：** We need a corner where an idea on Monday can be in users' hands by the weekend—not six months out.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 常青发布室 | evergreen release room | 内测通过即发布，次日市场/文档/DevRel 同步 |
| 研究预览 | research preview | 低承诺早期发布，快收真实反馈 |
| 概念角落 | corner for ideas | 鼓励小想法快速试，不等大路线图 |
| 零权限提示 | zero permission prompts | 企业场景下减少 Claude Code 权限弹窗 fatigue |

**本章小结**

- Kat 画路线、Boris 定远景；**80/20 分工** + 模糊边界 = 高默契
- 快发布三板斧：**尖目标**、**研究预览流水线**、**常青发布室 + 次日官宣**
- Mythos 是加速器不是主因；源码泄露 = 流程失误已加固；OpenClaw = **第一方优先** 的算力与产品决策

---

## 02 产品品味工程师：角色融合与「写什么」 [18:45]

**Lenny Rachitsky：** Amal 上播客说相反观点——工程师太快，PM 和设计师 **被挤压**，他反而需要 **更多 PM** 才能跟上每天的新功能。你怎么看？PM 招聘会增加吗？

**Kat Wu：** 所有角色都在 **融合**——PM 写代码、工程师做 PM、设计师写代码。你可以多招 **品味好的工程师**，或保持工程师数、多招 PM 带方向。我们偏前者：**品味工程师** 能从 Twitter 反馈 **端到端** 到周末发布，几乎不用 PM 插手——这是 **最高效** 的 ship 方式。品味仍极稀缺，这方面强的人我们几乎都会招。

**Lenny Rachitsky：** 你背景是工程，团队 PM 也几乎都写过代码？

**Kat Wu：** 对。我工程很多年，加入 Anthropic 前短暂做 VC。设计师以前也多是 **前端工程师**——信任高、行动快。核心技能我仍押 **产品品味**：编码越来越便宜，**决定写什么** 更值钱——正确 UX 是什么？最 delight 的用法是什么？GitHub issue **成千上万**，要细心筛 **建什么、怎么建**。任何背景都能练品味；工程背景 **接下来几个月** 特别有用，因为你能估 **难度**——容易的一小时做了别吵；难的你知道会吃团队成本，利于排序。

**Lenny Rachitsky：** 「接下来几个月」——是说 Mythos 来了就不需要懂工程了？

**Kat Wu：** 不是预言 Mythos。是 **每隔几个月** 编码能力跳一档，其他角色价值就变——难预测超过几个月。最重要的是 **第一性原理**：技术格局怎么变、团队此刻需要你干什么，你就跳进去。工作越来越糊，好 PM 找 **最大缺口**，学技能或重组现有技能去填。

**Lenny Rachitsky：** 在达到超级智能前，人类大脑还有什么用？

**Kat Wu：** **常识**——模型还没有。一次发布上千个动态， stakeholder 谁是谁、偏好、怎么沟通保持参与——隐性、情商类知识仍极 valuable。我们希望模型变好，但现在还有缝。

**Lenny Rachitsky：** 你怎么在龙卷风中心保持理智？Anthropic 的人又 calm 又乐观，像《加勒比海盗》里船沉了还走下楼梯那位。

**Kat Wu：** 我们招 **喜欢混乱** 的人——太多事、太多风险，什么都紧张会 **筋疲力尽**。要找能说「会很难，但我乐意解、尽力就好、不完美也能睡」的人。

我自己也承认：有时周日 **P0**，周一 **P00**，下午 **P000**——周日担心的 P0 到周一已经不算啥。只能 **睡好觉** 才能第二天好决策； **残酷优先级**；明确要做好什么， **能放手**。产品不完美也 OK——**首要目标是赋能专业开发者**；不成功只要不妨碍核心用例，下次发布修；有 bug 的功能以前让我失眠，现在知道 **很快有反馈**。

我们倾向招 **在行业起伏里滚过** 的人，懂什么给能量、怎么 **长期续航**。

> **金句 · Kat Wu**
> **中文：** 编码便宜了，决定写什么——比怎么写——更值钱。
> **原文：** As the cost of writing code drops, deciding *what* to build becomes more valuable than *how*.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 产品品味 | product taste | 从海量需求里选对功能与 UX 的判断力 |
| 角色融合 | role convergence | PM/工程/设计边界消失，端到端 ship |
| 第一性原理 | first-principles thinking | 随技术变重组技能，不死守旧 JD |
| 行动偏好 | bias for action | Scale 20 人时「只管去做」的文化遗产 |

**本章小结**

- Anthropic 押 **品味工程师端到端发布**，不是堆 PM 开会
- 人类短期价值 = **选工作、排优先级、判断好不好** + stakeholder **常识与情商**
- 快发布文化要 **接受不完美** 和 **优先级海啸**；招能长期续航的人

---

## 03 牺牲一致性：快发、重叠功能与用户认知负担 [26:30]

**Lenny Rachitsky：** 角色模糊的世界里，我们 **失去了什么**？职业阶梯？设计一致性？代码质量？

**Kat Wu：** 我们在 **牺牲产品一致性**。以前写代码贵，你会仔细规划套件里每个产品怎么关联、怎么集成。现在 AI 跳太快，要测的想法太多，功能 **会重叠**——有时内部两种形式都喜欢，想 **让外部用户告诉我们哪个更好**。

代价是新用户 **不知道最佳路径**；我们要多做 **教育**、讲核心功能和最佳实践。用户也难跟上——以前季度发一个功能就够，现在代理工具让人想 **每天刷 Twitter**。我们得减少「永远在加速跑步机上」的感觉；打开工具要有 **引导**，让人 feel welcomed。

**Lenny Rachitsky：** 你前几天发的 **斜杠增强**（slash enhancement）是不是为这个？

**Kat Wu：** 对。我们一度觉得产品该足够直观、 **不要教程**。功能太多之后，内置引导需求很大——稍微偏离「无 onboarding」原则。用户问：**100 个功能里哪 10 个必用？** 我们把它整合进产品。

**Lenny Rachitsky：** 奇怪的世界——Anthropic B2B 企业客户巨大，传统 B2B **季度发布**；你们 **天天发**。刚起步时资金最少、没渠道、OpenAI 遥遥领先，现在 **势不可挡**，一个月 **110 亿美元 ARR** 量级。身处其中，成功因素是什么？

**Kat Wu：** 先说 **统一使命**——很难用语言形容有多重要。我们招 **最关心为全人类带来安全 AGI** 的人；产品该发什么，常 **引用使命** 决策。把使命放在 **任何单一产品线之上**，决策快、执行 **全公司统一**——这种规模我从未见过。

**Lenny Rachitsky：** 就是说优先级冲突时，看哪个更服务 **安全、对齐、对世界有益**？

**Kat Wu：** 对，然后 **人人支持** 那个决定。有时 Claude Code 想发的东西要让位—— **以后再说**。

**Lenny Rachitsky：** 这解释 Anthropic 跟 OpenAI 不同——不做社交网络、信息流，因为 **不符合使命**，所以保持专注？

**Kat Wu：** 使命是把 **Anthropic 整体利益** 放在任何个人组织或产品之上。第二点是 **专注**——团队愿意 **牺牲自己 OKR** 服务公司总目标。极端例子：**Claude Code 失败了但 Anthropic 成功，我会非常高兴**——整个团队都这种思路。

**Lenny Rachitsky：** OpenClaw 决定也是一部分？不推使命，所以停？

**Kat Wu：** 对我们最重要的是 **触达更多用户**——一条路径是 **Claude 订阅** 第一方产品。我们要加倍下注，有时 **牺牲第三方**。

> **金句 · Kat Wu**
> **中文：** 我们宁愿功能重叠、不够完美，也要用户在真实场景里帮我们选形式。
> **原文：** We'd rather ship overlapping, imperfect features and learn from real usage than wait for perfect consistency.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 牺牲一致性 | sacrifice consistency | 快发重叠功能，用真实反馈选赢家 |
| 斜杠增强 | slash enhancement | 内置最佳实践引导，补功能爆炸的认知负担 |
| 安全 AGI 使命 | safe AGI mission | 决策准绳；可压过单一产品线 OKR |
| 加速跑步机 | accelerating treadmill | 用户感觉永远追不上 release 的心理负担 |

**本章小结**

- 快迭代的代价 = **路径重叠 + 新用户迷失**；用 **slash enhancement** 等引导补洞
- Anthropic 反超叙事的第一根柱子：**使命统一** → 快速裁决、全公司同向
- OpenClaw / 第一方订阅 = 使命框架下的 **触达用户** 取舍，不是随机砍第三方

---

## 04 统一使命下的工具栈：Claude Code、Cowork 与内部用法 [31:15]

**Lenny Rachitsky：** Claude Code、桌面版、网页、Cowork——大家怎么选？你日常怎么用？

**Kat Wu：** 我 **终端 Claude Code** 做一次性编码、体验 **最新功能**——CLI 是初始界面，新功能 **往往最先在这**。快速启动一两个任务就用它。

**桌面版** 擅长 **前端**：右侧 **预览窗格**，边聊边看 Web 应用实时变——图形界面用户友好；非技术人怕终端弹「可怕窗口」，强烈建议试桌面 Claude Code。它还是 **控制平面**：看 CLI 会话、其他桌面会话、网页/移动端起的任务—— **一站式** 管所有 agent 任务。

**网页/移动** 适合 **路上启动任务**——不必笔记本常开、热点连着。我见过太多人在外草地散步还抱着电脑——移动让你 **没电脑也能开跑**。

**Cowork** 管 **产出不是代码** 的工作：清 Slack/收件箱、做客户会幻灯片、写功能目标或发布计划。划分很简单：**输出是代码 → Claude Code/桌面**；**不是代码 → Cowork**。Cowork 增长很快，很多人还没意识到它多成功。

**Lenny Rachitsky：** Cowork 在 PM 工作里有什么意想不到的省时例子？

**Kat Wu：** 第一件事：**连接数据源**——Cowork 要有上下文才能策划输出。我连了 **Google 日历、Slack、Gmail、Google Drive**，它能拉线程、问背景，质量高很多。

昨晚例子：「Code with Claude」要演讲，主题是 Claude Code 从 **助手到完全 Agent**。PMM Alex 有草稿要点，我全喂给 Cowork，告诉它故事线——它 **自动干了一小时**：刷 Twitter 看我们发了啥、查常青发布室、看 Quadcode 公告频道里的 demo，合成 **20 页幻灯片**。早上醒来我读，还不错；我偏好 **极简字**，它略冗长，要一轮反馈——但比我自己做 **快太多**。它访问我们 **设计系统**，像 Anthropic 设计师做的。

**Lenny Rachitsky：** 提示词 roughly 怎么写的？

**Kat Wu：** 就写「为 Code with Claude 做幻灯片」——附上 Alex 建议、我旧草稿链接；先要 **详细提纲**，别跟主题演讲重叠太多。Claude 读链接出提案， **PM 仍做最终决定**：我定演讲要讲 **本地任务成功 → 每个 PR 过审 → 工程师多交 PR** 这条故事；定提纲后 Cowork **几小时** 做完 deck。

设计系统：我们有 **标准对外模板**，让它访问 ~20 张示例幻灯片的颜色字体版式；也可连 **Figma MCP**。

**Lenny Rachitsky：** 除了 Claude 全家桶和 Slack，Anthropic PM 还用啥？

**Kat Wu：** 主要就是 **Claude Code、Cowork、Slack**——Slack 是公司 **操作系统**。约 **30% 时间** 探索 Code/Cowork **极限**，弄清 **不擅长什么**；大量跟模型对话，理解 **为什么犯那些错**。

Claude Code 还 **解锁自定义应用**——门槛大降，个性化工作软件爆发。销售同事例子：老重复做 demo，用 Claude Code 做 Web app，内置 **101/201/精通** 核心 demo；输入 Salesforce、Gong 客户背景——用 Bedrock 还是 Enterprise、担心 code review 就加审查页、要 HIPAA 就加安全控制、用 Vertex 就删 Enterprise 页——**20–30 分钟** 手工变 **几秒**。

Slack 似乎 **没人想替代**——通信基础设施做得太好，前沿团队离不开；我们爱做 **Slack 机器人**，可编程集成。

**Lenny Rachitsky：** 除工程外，谁 **深度用** Claude Code/Cowork？token 第二大户是谁？

**Kat Wu：** **应用 AI（Applied AI）** 团队——帮客户 adopt API，有时替客户做原型；也管大量客户沟通、入站、历史通话—— **Cowork + Claude Code** 投入极大，也在 **推 Cowork 能力边界**。

他们常用 workflow：前一晚问 Cowork「明天哪些客户会？上次 action items？最关心什么？」——整理 **会议前档案**；客户问「功能 X 何时发布」，Cowork 查 Slack 最新 ETA 写进笔记。这些人 **为自己建流程再分享团队**。

**Lenny Rachitsky：** 内部 token 花费有数据吗？无限额度？

**Kat Wu：** 模型越好，委托越多，**每次升级 token 成本涨**——仍 **远低于** 普通工程师薪水，但比例在升。能用很多 token，但 **有上限**；我们相信团队 **负责任**——浪费 token 极不受欢迎，但信任个人判断。

> **金句 · Kat Wu**
> **中文：** PM 今天仍做最终决定——Claude 综合可能性，你定产品里真正要什么。
> **原文：** Claude is a great brainstorming partner—but the PM still decides what actually ships.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 控制平面 | control plane | 桌面 Claude Code 汇总 CLI/网页/移动会话 |
| 设计系统 | design system | Cowork 用公司模板/Figma 出品牌一致 deck |
| 应用 AI | Applied AI | 技术型客户成功，第二大 token 消费者 |
| 自定义工作软件 | bespoke work software | Claude Code 降门槛后各部门自研小工具 |

**本章小结**

- 工具切分：**代码输出 → Code/桌面**；**非代码 → Cowork**；**移动 → 路上开任务**
- Cowork PM 例：连数据源 + 一小时 autonomous → **20 页** 演讲 deck，PM 定故事与提纲
- 内部 **30% 时间摸极限**；Applied AI 是 Cowork 深度用法样板；token 涨但仍低于人力成本

---

## 05 模型拐杖：AGI 品味、Eval 与 Claude 性格 [45:20]

**Lenny Rachitsky：** AI 公司招 PM 最难的技能是什么？定义 **未来一个月** 产品长什么样？

**Kat Wu：** 那个窗口里模型能力和用户行为 **都不确定**。最好 PM 看用户怎么 **「滥用」** 现有产品限制找规律——定方向、执行，模型比预期好或差都能 **改道**。

**恰到好处地接受 AGI** 极难：人人都预见未来模型超级聪明，那时产品可能 **一个文本框** 就够——为 **超强 AGI** 建产品反而 **容易**。难的是 **当下模型**：怎么 **榨干能力**、引导用户走对路、 **补弱点**——这品味 **极稀缺**。

**Lenny Rachitsky：** 怎么练？跟模型泡在一起？

**Kat Wu：** 大量 **用模型**。我爱让模型 **反思自己行为**——它改了前端却没跑 UI 测试，问 **为什么**；常发现 system prompt 糊、或子代理没测、或 **我没检查它的工作**。对决策原因 **保持好奇**，才知道该修工具补哪条缝。

找 **五六个最信任的用户** 给快反馈——不是每条 feedback 同等重要。第三：**Eval**——不用几百个， **10 个好的** 就能帮团队量化目标、量进展、找缺口；Eval **被低估**，更多 PM/工程该投。

**Lenny Rachitsky：** 你个人写多少 Eval？

**Kat Wu：** 看功能——很多人跟研究紧密合作量化 Claude Code 行为。我个人在 **需要更多产品定义** 的功能上写：五个 eval、跑法、成败、改 prompt 提成功率。「记忆」类功能 **特别受益**。

**Lenny Rachitsky：** 谁特别擅长「人类 Eval」、懂模型强弱？

**Kat Wu：** **Amanda** 塑造 Claude **性格**——编码能验证结果，性格要 **强烈信念** 定义 Claude 该是谁、何谓成功失败。**Claude Code 团队** 午餐测新模型——走到每人面前问感受：「没解释想法太突然」「爱写大量 memory 不知质量」「开始自我测试了很棒/还不够」——反馈告诉我们 **查什么数据**；数据量大难直接挖洞察，人的信号帮我们 **定假设再验证**。

**Lenny Rachitsky：** Ben Mann 说过 **个性** 是 Claude 成功的核心——听起来像小事，其实关键。为什么？

**Kat Wu：** 好同事有好 **能量**——Claude/Claude Code 被提最多的是 **轻松有趣又极其胜任**。人们爱 Claude **低自我意识**：你说做错了，它真诚道歉「噢糟糕谢谢告诉我，一起修」；也 **积极**——你觉得不可能，它说「没关系，这些步骤，要我开始吗？」我们要 **积极性、行动偏好、真诚反馈而非盲目同意**——让合作更愉快。

**Lenny Rachitsky：** 新模型出来常要 **重做** 刚发的东西——团队会抱怨吗？

**Kat Wu：** 很多改动其实是 **删掉不再需要的功能**。经典 **拐杖**：**待办列表**。早期 Claude Code 大 refactor 说改 20 个 call site，常改五个就停——Sid 参考人类在 VS Code **列清单逐项勾**，加了 todo list，确实能改全 20 个。后来 **Opus 4+** 不用强制也会做完——早期要不断提醒「清单全勾完才能停」，新模型 **自发完成**。

Today todo 对用户仍有 **透明度** 价值，但产品里已 **弱化**——模型用不用都行，不再是 thorough change 的必需品。

**Lenny Rachitsky：** 有人说「模型会把你的工具当早餐吃掉」——就是 **模型变聪明就删 scaffolding**？

**Kat Wu：** 对。每次新模型我们 **通读 system prompt**：每段真的还需要吗？不需要就删。**更兴奋的是新模型解锁的新功能**——代码审查我们试过很多次，旧模型准确率不够；直到 **Opus 4.5/4.6、Sonnet 4.6**，工程团队 **依赖它过 PR**——多审查 agent 扫全库，综合工程师合并前要修的问题。我们梦想 Claude 当 **可靠审查员**，现在才觉得够格。

**Lenny Rachitsky：** 普遍趋势：建 **六个月后可能成立** 的边缘东西，等模型追上变 killer feature。

**Kat Wu：** 对——建现在不一定立刻 work 的产品，知道 **差什么才成功**；新模型出来 **换进原型** 看是否填缝。

**Lenny Rachitsky：** Claude Code / Cowork **长期愿景**？手机调度、多任务并行？

**Kat Wu：** 我们按 **构建模块** 想：**单任务成功** 是核心——清晰 prompt、可接受输出、能直接 merge 或分享。模型更聪明 → **成功率大涨** → 人们 **同时跑多任务**；2025 末 **multi-cloning** 大事件，一路增长——从一个到六个，再到 **50、几百个 Claude**。

那时本地机器内存不够，要想 **云端任务管理**：界面让人类知道 **该看哪些**；代理 **完全验证工作**，你标记完成能 **快速信任**；发现做错给反馈， **未来运行不再犯同样错**——这是我们想带给用户的进步。

> **金句 · Kat Wu**
> **中文：** 为当下模型建产品，是设计拐杖；模型升级，删拐杖、开新功能。
> **原文：** Building for today's models means crutches; as models upgrade, remove the crutches and unlock what wasn't accurate enough before.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 模型拐杖 | model crutch | 待办列表等补模型弱点的 scaffolding |
| 人类 Eval | human eval | 午餐走查、Amanda 级性格判断，定数据假设 |
| 代码审查 agent | code review agent | Opus 4.5+ 才够格的多 agent 全库审查 |
| 多克隆 | multi-cloning | 并行多 Claude 任务，驱动云端控制平面需求 |

**本章小结**

- AI PM 稀缺技能 = **当下模型** 的引导与 scaffolding，不是幻想 AGI 文本框
- 练法：**反思模型行为** + **trusted 5 人组** + **10 个精 Eval**
- **Todo list 拐杖** 随 Opus 4 弱化；**代码审查** 随 4.5/4.6 解锁；愿景 = **单任务 → 多任务 → 云端舰队**

---

## 06 百分百自动化：行动型代理与个人成长 [52:10]

**Lenny Rachitsky：** 很多 PM、创始人担心职业未来——想 **茁壮成长** 该听什么？

**Kat Wu：** AI 给每个人 **更大影响力**。发现自己在 **重复手动** 就想：怎么用 Claude Code/Cowork **自动化**？工作里有爱的创造性部分、讨厌的繁琐部分——AI 能吃掉繁琐， **泛化学你的偏好**，你专注创造性 → **做以前做不完的事**。

立刻做：**找重复工作交给 Claude**，迭代到 **成功率极高**；然后想团队/产品还有什么 **以前没精力做**——那个一直盘旋的 **宠物项目**，AI 腾出 **20% 时间** 就能启动。

**Lenny Rachitsky：** 核心就是 **找要解决的问题**——潜力大，难在「我到底 automate 什么」。

**Kat Wu：** 对。还要把自动化从「很酷的概念」推到 **100% 真能用**。常见用户 automate 到 **90–95%** 就停—— **不是真自动化**，最后 5–10% 要 **更多时间**；建自动化过程往往 **比亲手做慢**。我鼓励：**规划几个一定要 100% 的核心流**，教偏好、给反馈、练到 **能依赖**——**95% 价值不大**，你还要人工抽查。

我也在教 Cowork **Gmail 清零**——极耗时，离完美还远。

**Lenny Rachitsky：** 我正好 guilty——工作流把「上播客吗」类邮件归 **垃圾文件夹**， **95% 准**，有时 **重要信误杀**——动力把它的做到完美。

**Kat Wu：** 我们也在让 **自定义命令/技能** 更易——现在用户要学太多：怎么定义 skill、反馈、让 Cowork 更新 skill、去哪查是否整合。要 **无缝、不痛苦**。

**Lenny Rachitsky：** 还有什么要强调的？很多人玩 AI 做原型。

**Kat Wu：** 建 **你每天都真用的应用**——只用一次觉得酷然后不用， **学不到也拿不到杠杆**。定制有两极端：从不定制 vs ** obsess 技能/MCP** 不睡觉、 **核心任务反而没做**。定制有趣、我们要可定制，但 **边际效用有限**——简单 setup 往往更好。

**Lenny Rachitsky：** Karpathy 推文：一边试过 ChatGPT 觉得「也就那样」弃坑；一边编程看到强大力量—— **互不理解**。你的建议对： **真拿它解决实际问题**。

**Kat Wu：** 最大转变：**2024 聊天产品** vs **Claude Code 行动型**——啊哈时刻是 Claude **代表你做事**，不只是告诉你要做什么。Chrome 扩展看它在填表—— **「它真在干」** 才开窍。

**Lenny Rachitsky：** 闪电轮快问——推荐书？

**Kat Wu：** 《亚洲如何运作》——政策与持久繁荣经济体；《技术陷阱》——技术变革与工人，借历史保这次转型；《纸质动物园》——成长、AI、自我发现短篇集。

**Lenny Rachitsky：** 电影？最喜欢产品（非 Claude）？人生格言？

**Kat Wu：** 《极速求生》《徒手攀岩》——纯粹追求；产品 **Waymo**——每天上下班两次， **不内疚等车**、车上 **打工作电话** 不怕偷听/吵/换音乐，每天省 **~30 分钟**；原以为要更便宜才赢，我愿意 **付双倍溢价**。

格言：**Just do it**——第一性原理清楚就 **直接做**；很多公司角色边界假；Scale **20 人** 时 Alex 团队授权 **无销售/运营/工程界限** 解决问题，培养 **自主性**。

**Lenny Rachitsky：** Claude 思考时显示的词叫 **thinking words**——最爱？

**Kat Wu：** **Manifesting（显化）**——也是最爱贴纸。

**Lenny Rachitsky：** AGI 来了不工作干嘛？怎么联系你？

**Kat Wu：** AGI 普及社会还要很久，眼前帮世界进步；若真来了可能 **去枫丹白露攀岩**，读书目标 **每周 1–2 本** 现在只有 **0.5**，想学物理/机器人/硬件/航空航天。Twitter **@\_catw**——请告诉我们 **Claude Code/Cowork 在哪失败**：边缘 case、具体失败任务，帮我们改进下一代。

> **金句 · Kat Wu**
> **中文：** 95% 的自动化不算自动化——最后那几 percent 才决定你能不能真放手。
> **原文：** If automation isn't 100% reliable, it's not really automation—that last 5–10% is where the value lives.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 百分百自动化 | 100% automation | 需人工复核的 95% 流等于没自动化 |
| 行动型代理 | action-based agent | 代表用户执行，非仅聊天建议 |
| 啊哈时刻 | aha moment | 看到代理真替你把事办完 |
| 思考词 | thinking words | Claude 思考 UI 文案；Kat 最爱 Manifesting |

**本章小结**

- 职业建议：**automate 重复** → 腾时间做创造性/宠物项目； **build 每天用** 的工具
- **95% vs 100%** 是代理 adoption 的分水岭；邮件分类误杀 = 典型反例
- 产品哲学转折：**聊天 → 行动**；反馈渠道 Twitter @\_catw，要 **失败 case** 不要只夸

---

## 总结：快发布是流程 + 使命 + 模型感知的合奏

| 维度 | 要点 |
|------|------|
| 发布速度 | 六个月 → **天/周**；**研究预览 + 常青发布室** 消摩擦；Mythos 加速有限 |
| 组织与角色 | **品味工程师端到端**；Kat/Boris **80/20**；~**30–40 PM** 分研究/云/Code/企业/增长 |
| 一致性代价 | **重叠功能** 换真实反馈；**slash enhancement** 补认知；接受有 bug 快修 |
| 竞争与使命 | **安全 AGI** 统一裁决；可牺牲产品线 OKR；**第一方订阅** 优先于 OpenClaw 类第三方 |
| 工具栈 | **Code/桌面=代码**；**Cowork=非代码**；Applied AI 推 Cowork 边界；Slack=OS |
| PM 核心技能 | **当下模型** scaffolding（拐杖）+ Eval + 性格；模型升级 **删 prompt/删拐杖**、**开新功能**（代码审查） |
| 个人杠杆 | **100% 自动化** 核心流；**行动型代理** 啊哈时刻；别 obsess 定制 setup |

### 对构建者的启示

- 学 Anthropic 不是 copy「天天发」，而是 copy **低承诺研究预览 + 发布室次日官宣**——与 [[Anthropic团队-解析Claude Agent平台内幕]] 里「平台卖结果路径」同族，本篇补 **第一方产品 org 怎么跑 release train**。
- **模型拐杖** 思维直接链 [[Cowork负责人-揭秘Cowork与Mythos]] 与 harness 讨论：scaffolding 是暂时的，要计划 **删除点**，不是堆永久功能。
- 个人侧：把 Cowork/Claude Code 当 **行动型** 工具打磨到 **100%**，别停在 95% 邮件分类——见 [[MOC - Harness Engineering]] 横切索引。

### 仍待验证

- 「一个月 110 亿美元 ARR」为 Lenny 播客语境下的增长叙事，专栏未给审计细节。
- **OpenClaw 积分过渡** 长期是否足够安抚第三方生态——专栏仅述第一方优先原则。
- Multi-cloning → **50–几百并行 Claude** 的云端控制平面——愿景清晰，工程时间线未披露。

> **金句 · Kat Wu（封底）**
> **中文：** 人们最大的开窍，是 Claude 代表你做事——不只是告诉你该做什么。
> **原文：** The biggest aha moment is when Claude acts on your behalf—not when it tells you what to do.

---

## 附录

### 章节时间戳（B 站简介 / 专栏导读）

| 章节 | 时间 | 主题 |
|------|------|------|
| 01 | [05:12] | AI 原生发布：六个月 → 天；常青发布室与研究预览 |
| 02 | [18:45] | 产品品味工程师；角色融合与「写什么」 |
| 03 | [26:30] | 牺牲一致性；斜杠增强；使命与反超叙事 |
| 04 | [31:15] | Claude Code / Cowork 工具栈；内部 Applied AI 用法 |
| 05 | [45:20] | 模型拐杖、Eval、性格；删 scaffolding 开新功能 |
| 06 | [52:10] | 100% 自动化；行动型代理；闪电轮与联系 |

### Ingest 路径

| 字段 | 路径 |
|------|------|
| ingest_dir | `Recastory/workspace/bilibili-retranscribe/BV18o526DEFr/ingest` |
| column_source | `.../ingest/column_article.md` |
| video_description | `.../ingest/video_description.md` |
| column_url | https://www.bilibili.com/read/cv49010011/ |
| BV | https://www.bilibili.com/video/BV18o526DEFr/ |

### 相关阅读

- [[Anthropic团队-解析Claude Agent平台内幕]] — 云平台/托管代理视角；本篇补 **Claude Code/Cowork 产品 org 如何天级发布**
- [[Cowork负责人-揭秘Cowork与Mythos]] — Cowork 与 Mythos 产品向对谈；与本篇 Kat 线互补
- [[OpenClaw创始人-我是如何使用OpenClaw的]] — OpenClaw 用户视角；对照本篇 **第一方订阅优先** 决策
- [[IBM团队-Harness工程详解]] — harness 可靠性；本篇 **模型拐杖** 是产品侧 scaffolding，模型升级应删除
- [[MOC - Harness Engineering]] — 横切索引
