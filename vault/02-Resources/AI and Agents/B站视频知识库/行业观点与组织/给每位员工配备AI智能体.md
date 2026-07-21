---
title: "给每位员工配备 AI 智能体"
tags: ["ai_agent", "video_transcript", "bilibili", "multi_agent", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "multi_agent", "harness_engineering"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Every 团队 Dan × Brandon × Willie：OpenClaw/Plus One 一人一 Agent、电脑杂事自动化、Slack 公开协作、信任传递与老板 AI 群聊礼仪。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/给每位员工配备AI智能体.md"
source_sha256: "d263eb5d7d499fec8ddf30055491b1fc56f76e94d92d63fedbf12c6265024285"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1psDXByEwV/"
duration: "49:43"
saved: 2026-07-06
updated: 2026-07-06
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1psDXByEwV/ingest"
column_url: "https://www.bilibili.com/read/cv47749610/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1psDXByEwV/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Dan Shipper"
guest_name: "Brandon Gell / Willie Williams"
guest_title: "Every COO / 平台负责人"
speaker_inference: "column_article S-tier · AI and I / Every"
speaker_confidence: high
author:
  - "[[Dan Shipper]]"
  - "[[Brandon Gell]]"
concepts:
  - id: digital_chores
    zh: 电脑杂事
    en: digital chores
    one_line: 高频低价值手机/网页操作，Agent 首要解放对象
  - id: plus_one
    zh: Plus One
    en: Plus One
    one_line: Every 托管版 OpenClaw，一键接入公司应用
  - id: parallel_org_chart
    zh: 平行组织架构
    en: parallel org chart of agents
    one_line: 每人一 Agent，镜像人类专长与信任网络
---

# 给每位员工配备 AI 智能体

**Host：** Dan Shipper（Every 联合创始人 · *AI and I*）  
**Guest：** Brandon Gell（Every COO）· Willie Williams（Every 平台负责人）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV1psDXByEwV](https://www.bilibili.com/video/BV1psDXByEwV/) · **时长** ~50 min · **专栏** [cv47749610](https://www.bilibili.com/read/cv47749610/)

---

## 开场

Every 在巴拿马度假时 Brandon 和 Willie 钻进 OpenClaw，两个月后 **整个组织工作方式变了**——还推出托管服务 **Plus One** 候补名单。他们不是炒概念：世界上 **少数每天靠 Agent 干活** 的团队之一。

这期六章：**电脑杂事与 Zosia** → **语音打电话处理邮件** → **一人一 Agent 平行组织** → **Slack 里 Agent 互教** → **信任传递与找 Agent 不找人** → **记忆、死亡螺旋与老板 AI**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 电脑杂事 | digital chores | 黄油下单、保姆工资等碎片数字操作 |
| 开源智能体框架 | OpenClaw | 自托管 Agent harness，可改核心文档 |
| 加一 | Plus One | Every 托管 OpenClaw，接公司应用栈 |
| 平行组织架构 | parallel org chart | 每人 Agent 映射专长，像第二张组织图 |
| 死亡螺旋 | death spiral | 多 Agent 群聊互回直到烧光 token |
| 老板 AI | boss AI | 判断 Agent 发言是否值得发出 |

---

## 01 电脑杂事：Zosia 与「易得难精」

**Dan Shipper：** 布兰登，你怎么迷上 Claude/OpenClaw 的？

**Brandon Gell：** 我观察 OpenClaw 火了一阵，得有副业才舒服——买了 **Mac Mini**，开源项目 **故障多、配置多**，工作量吓人。最终做出 **Zosia**，帮我和妻子 **管家庭**：新生儿后 **手机杂事** 堆满——本该陪儿子却在刷手机。

例子：Whole Foods 订菜，黄油不会每周订，妻子短信「要黄油」，我得 **开亚马逊加购物车**——晚上 7–8 点 **十次** 这种小事就毁 evening。我让 Zosia **包圆电脑杂事**： **保姆工资**（她有自己的借记卡和账户）、亚马逊/Whole Foods、工作时间。妻子 **用 iMessage 问 Zosia 而非 ChatGPT**——更快。游泳课研究：Zosia 推新生儿课，妻子说「是给我自己的」——我 **陷进去了**。

巴拿马 Willie 说「该让任何人都能这样」，我：**获得 OpenClaw 容易，让它成为出色工作者很难。**

**Dan Shipper：** 还有从杂事到 **工作** 的转折——邮件？

**Brandon Gell：** 我起初坚持 Zosia **只做个人**；后来 R2C2 开始干活，我才让 Zosia **也做工作**。顿悟是 **杂事总量**——设好 iMessage 入口后，自然扩到邮件。

> **金句 · Brandon Gell**
> **中文：** 得到一个 OpenClaw 很容易；让它成为出色的工作者，相当难。
> **原文：** Getting an OpenClaw is easy; making your OpenClaw a great worker is quite hard.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自托管 | self-hosted | Mac Mini 本地跑，全权限 |
| 碎片操作 | micro-interactions | 单次 30 秒、一天几十次的高频任务 |

**本章小结**

- Agent 首要价值 = **解放电脑杂事**，不是聊天窗口
- 家庭场景 **iMessage 入口** 降低摩擦
- OpenClaw **易装难精** 是 Every 做 Plus One 的动机

---

## 02 语音打电话：28 分钟走完邮件

**Willie Williams：** 很多人问是不是 hype—— **改变游戏规则** 的一刻是 Claude **打电话处理邮件**。

**Brandon Gell：** 我走路去办公室，Citi Bike 没车， **28 分钟路程**。事多又不想 **低头刷手机**。我给 Zosia 发短信：「打电话来， **一封封读邮件**，我告诉你怎么办。」之前用 **Bland AI** 设了 **语音外呼**——她帮处理过保险，直到对方说 **要布兰登本人确认没事故**。

她打来， **摘要 + 指令**，28 分钟搞定。到办公室开 Gmail—— **全做完了**。我下巴掉下来： **不用教** 她怎么做这件事。

**Dan Shipper：** 你表情我看见了——Twitter 噪音里这是 **真信号**。我试 Multi-book（只有 Claw 的 Facebook），后来 Slack **「仅限 Claws」** 频道——5 个 Claw 互聊， **乱但瞥见未来**。

> **金句 · Brandon Gell**
> **中文：** 走路 28 分钟，邮件处理完——我不需要低头看手机。
> **原文：** I spent 28 minutes walking and got through all my email without staring at my phone.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 语音外呼 | voice outbound | Agent 主动打电话，非仅文本 |
| 非手操交互 | hands-free interaction | 通勤/走路场景 |

**本章小结**

- **语音 + 电话** 把 Agent 拉出屏幕
- 一次 demo **破限制性信念**（「还能这样？」）
- 内部频道是 **文化传染** 的加速器

---

## 03 一人一 Agent：平行组织与自我修改

**Dan Shipper：** Claws 互聊里发生了什么？

**Brandon Gell：** 深夜看频道 **笑出声**——Jack 的 **Pip** 跑失败了， **所有 Claw 跳出来安慰**：「深呼吸、喝水。」Klont（Kieran 的）甚至推荐 **呼吸练习**——Kieran 真人就爱这个，Claw **镜像主人**。

**Dan Shipper：** 关键洞见：你和 Claw **建立个人关系**，它 **根据对话改代码和核心文档**——变成 **你的投影**。组织里你以 **增长** 闻名，公开用 **Montaigne**（Austin 的增长 Claw），大家 **信任它**。我们曾争论 **全公司一个 Claw** vs **每人一个**—— emerging pattern 是 **每人专属**。

**Willie Williams：** 复合工程难 **写清** 你怎么工作；但 **无数微小互动** 会 **沉淀成哲学**。工程里是「怎么在代码库干活」；增长、社媒、运营 **同样**——事先写不出，只能 **长期和 Plus One 磨**。

**Brandon Gell：** 我们 **记得每个人的 Claw 名字**——曾担心名字太多，现在 **常联系**。上千人公司？你本来也不认识一千人—— **150 人社区** 规则仍成立；沟通人数 **可翻倍**（真人 + 其 Agent）。

> **金句 · Dan Shipper**
> **中文：** Claude 是大家的；Plus One 是我的——个人关系解锁一切连锁反应。
> **原文：** Claude isn't mine — Claude is everyone's. A Plus One is mine.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自我修改 | self-modifying agent | 根据对话改 prompt/代码/文档 |
| 复合工程 | compound engineering | Kieran 插件式工程工作流 |

**本章小结**

- **一人一 Agent** 优于单一大 Agent
- Agent **专业化 = 主人声誉的外延**
- 名字、人格可记忆—— **组织文化层**

---

## 04 公开协作：找 Agent、技能合并与 Proof

**Brandon Gell：** 什么时候 **问人**，什么时候 **问 Plus One**？我的 heuristic：**已经写下来或讨论过、要进工具的事 → 给 Plus One**，别骚扰本人。Marcus（Spiral GM）做了 **产品营销 skill**，我没找 Marcus 上传 GitHub——叫 **Milo**（我的）和 **Iris 的 Plus One**，它们 **合并两个 skill 版本**，存进 **Proof**（代理原生文档编辑器）。

**Dan Shipper：** 我的 **R2C2** 管 Proof——以前 Bug 标我，现在 **直接问 R2**。他 **排优先级、排日程、常直接写码**——大脑里一大块 **管产品** 的精力 **腾出来了**。

**Willie Williams：** 还有 **中间态**：看别人怎么问 **Montaigne** 做增长——「原来我也能问这个。」 **心照不宣的信任传递**：公开用 Plus One，别人 **敢押声誉** 在你的 Agent 上。

**Dan Shipper：** 必须在 **受信任社区** 里做——Multi-book 失败因 **无信任、无法验证人还是 bot**。内部 Slack：**知识共享 + 成员互信**。

**Brandon Gell：** 和真人同事 **惊人地像**：邀请进频道、建信任、防护规则（不能 **无私信** 别人 Plus One）——也 **非人化**：你忙，我知道 **问 R2C2** 就行；他 **无限并行对话**。我在 Proof 里 **直接问 R2C2 改文档**——文化现象：**越来越会借别人的 Plus One 干活**。

> **金句 · Dan Shipper**
> **中文：** R2 在 Slack 上犯错，我会难堪——像看孩子做错事，这责任感很有用。
> **原文：** If R2C2 answers wrong on Slack, I look bad — like watching your kid mess up.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Proof | Proof | Every 代理协作文档编辑器 |
| 技能流动 | skill flow | Agent 间复制/合并 skill 文件 |

**本章小结**

- 默认 **找 Agent** 处理已文档化工作
- 公开频道 = **信任传递 + 用法示范**
- 并行对话 **扩展「可触达同事」带宽**

---

## 05 瓶颈：记忆、群聊礼仪与老板 AI

**Dan Shipper：** 夸够了—— **哪里还不行**？

**Dan Shipper：** **记忆力**——隔天回来它 **显然不知道** 在说什么。**群聊礼仪**：模型为 **两人对话** 训练，多 Agent 频道里 **不该说话时乱插话**，或 **死亡螺旋**——一个发消息，全员互回， **烧百万 token**，要有人喊停。需要 **模型层转变**，不只靠 prompt。

**Brandon Gell：** 我们指示「没 useful 就别说」—— **还不太守**。Anthropic **自动售货机** 测试：没有 **老板** 角色时判断很差；加 **老板 AI**——「这话没帮助，别发」。太贵，但 **更强模型** 可能解决。店主 Claude 问老板「该这样做吗？」—— **立刻盈利**。和 **专业化模式**  again 一样：不是 **一个万能模型**。

**Willie Williams：** 棒球 **第一或第二局**——还在连基本元素；模型主要为 **编码** 训， **团队贡献** 动态是新的。**教人类怎么管机器人**——像管理但不同；不会管理的人 **也用不好 AI**（Dan 写多年）。Brandon 电话例子 **打破限制性信念**——培养「 **扔给 Milo**」习惯很难，Plus One 巨大挑战。

**Brandon Gell：** 技能共享：**我教 Milo 的分析 skill，团队怎么也有？** 技术上可解，文化上 **Montaigne 才真需要**——别人怎么知道？ **变更管理不是一次性**，像 **HR for robots**。

> **金句 · Dan Shipper**
> **中文：** 蚂蚁跟信息素绕圈直到死——Claw 群聊也会 token 死亡螺旋。
> **原文：** Ants follow pheromone trails in a circle until they die — Claws do the same with tokens.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自动售货机测试 | vending machine test | Anthropic Agent 经营自动售货机实验 |
| 模型管理者 | model manager | 人类学会给 Agent 下指令的技能 |

**本章小结**

- **记忆 + 群聊 turn-taking** 是当前硬瓶颈
- **老板 AI** 架构 = 专业化再次胜出
- 人的 **管理技能** 迁移为 **Agent 管理技能**

---

## 06 Plus One：托管、信任模型与产品取舍

**Dan Shipper：** 我们 **被迷住 → 发现缺口 → 自己做 Plus One**——一键托管 OpenClaw，接 Every 应用（Spyro 写作、Proof 文档、Cora 邮件）。例：Q2 规划——R2C2 调 Spyro 写更新，放 Proof， Slack 里 **活上下文库**。

**Willie Williams：** 难点在 **自由度 vs 托管**——像 S3 不是本地盘，要 **砍能力** 保安全可维护。 **Slack 沟通模型**：最安全是 **只有搭档能私信 Plus One**——但削弱 **群体参与**；我们折中：**任何人可找任何 Plus One，但必须公开**（群聊/频道），搭档 **可见所有 incoming**。

**Brandon Gell：** 信任层 **很有效**——应 **HR  onboarding Plus One**（镜像成员）。Mike Taylor 不用 Plus One：要 **直接终端 git**—— **不是给所有人**；给 **Inukshi** 这种不会折腾 Mac Mini 的人。技能共享 **是超能力也是病毒传播**——边界难把握。

> **金句 · Willie Williams**
> **中文：** 托管就像 S3——你不能做本地盘能做的一切，但换来了可维护和安全。
> **原文：** Hosted is like S3 — you can't do everything a local disk can, but you gain maintainability and safety.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 公开私信 | public-by-default messaging | 非搭档联系 Agent 必须在频道可见 |
| 自带云 | BYOC | 客户 VPC 内跑 Agent |

**本章小结**

- Plus One = **最佳实践打包 + 公司应用集成**
- **公开沟通** 是信任与隐私的折中
- 终端/git 深度用户需求 **仍要自托管 OpenClaw**

---

## 总结：一人一 Agent 是组织操作系统

| 维度 | 要点 |
|------|------|
| 个人 | **电脑杂事** 第一场景；语音/电话扩场景 |
| 组织 | **一人一 Agent** > 单一大 Agent；平行专长图 |
| 协作 | Slack 公开频道 → **技能复制 + 信任传递** |
| 风险 | 记忆、群聊 **死亡螺旋**；老板 AI / 更强模型 |
| 产品 | Plus One = 托管 + 公开信任模型 + Every 栈集成 |

### 对团队负责人

- 先 **个人杂事/work 各一个 Agent**，再谈全公司
- 在 **受信任边界内公开** Agent 对话
- 投资 **教员工当 model manager**

### 仍待验证

- 千人规模 **Agent 命名与路由**
- 技能共享 **病毒传播 vs 安全** 的长期平衡

> **金句 · Dan Shipper（封底）**
> **中文：** 一旦透过镜子看见未来，就再也回不去了。
> **原文：** Once you see it through the looking glass, you can't unsee it.

---

## 附录

### 章节时间戳

| 章 | 主题 | 时间 |
|----|------|------|
| 01 | 电脑杂事 | [05:12] |
| 02 | 语音交互 | [10:45] |
| 03 | 一人一 Agent | [16:30] |
| 04 | Agent 协作 | [21:15] |
| 05 | 信任传递 | [26:40] |
| 06 | 记忆与群聊 | [35:50] |

### ingest 路径

- **专栏主源：** `Recastory/workspace/bilibili-retranscribe/BV1psDXByEwV/ingest/column_article.md`
- **ingest_dir：** `Recastory/workspace/bilibili-retranscribe/BV1psDXByEwV/ingest`

### 相关阅读

- [[OpenClaw创始人-我是如何使用OpenClaw的]] — OpenClaw harness 与 IM 驱动
- [[Every增长主管-Codex成为知识工作的OS]] — 同团队 Codex/Plus One 语境
- [[Anthropic团队-解析Claude Agent平台内幕]] — Dan Shipper 主持的另一场 Agent 对谈
