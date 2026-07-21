---
title: "Block 业务主管：裁员 40% 后与 Goose 代理运转"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_career", "harness_engineering", "multi_agent"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_career", "harness_engineering", "multi_agent"]
created: "2026-07-07"
source: "B站视频 - Easonlee的AI笔记"
description: "Owen Jennings：12 月 Opus/Codex 拐点后人头与产出脱钩；裁员 40% 非纯财务；Goose/G2 模型无关代理层；1 人指挥 14 代理；Builder Bot 90%+ 自主合并；生成式 UI；认知深度护城河。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Block业务主管-裁员40%后与Goose代理运转.md"
source_sha256: "5c6f3d2b2d671557c27cf7af21940920c319eb50d8553ea1cd1401025eda2c5b"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1HDDyB9Emw/"
column_url: "https://www.bilibili.com/read/cv47724642/"
host_name: "播客主持人"
guest_name: "Owen Jennings"
guest_title: "Block 业务主管 · 前 Cash App CEO"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1HDDyB9Emw/ingest"
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1HDDyB9Emw/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1HDDyB9Emw/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article S-tier interview labels"
speaker_confidence: high
duration: "27:17"
saved: 2026-07-07
updated: 2026-07-07
concepts:
  - id: headcount_output_decouple
    zh: 人头与产出脱钩
    en: headcount-output decoupling
    one_line: 1–2 人用工具 10–100× 产出，千人团队冗余
  - id: goose_framework
    zh: Goose 代理框架
    en: Goose agent framework
    one_line: 2024 年初自研，模型无关，120 模型按任务切换
  - id: builder_bot
    zh: Builder Bot
    en: Builder Bot
    one_line: 深度集成基础设施，自主合并 PR，复杂功能 85–100% 自动
  - id: generative_ui
    zh: 生成式 UI
    en: generative UI
    one_line: Cash App 界面因用户行为即时生成，非千人一面
  - id: cognitive_moat
    zh: 认知深度护城河
    en: cognitive depth moat
    one_line: 信号-世界模型-代理构建闭环，Vibe Code 复制不了 5000 万用户网
author:
  - "[[Owen Jennings]]"
---

# Block 业务主管：裁员 40% 后与 Goose 代理运转

**Host：** 播客主持人（现场对谈）  
**Guest：** Owen Jennings（Block 业务主管，Square / Cash App / Afterpay）  
**形态：** Host-Guest v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV1HDDyB9Emw](https://www.bilibili.com/video/BV1HDDyB9Emw/) · **时长** ~27 min · **专栏** [cv47724642](https://www.bilibili.com/read/cv47724642/)

---

## 开场

Block 是少数公开承认 **AI 是裁员 40% 关键组成** 的上市公司。Owen 管 Square、Cash App、Afterpay 产品与运营，在 Cash App 扩张期当过 CEO。这期讲：**2024 年底二元拐点** 怎么让人头与产出脱钩、**Goose** 代理栈如何撑住重组、以及 **Builder Bot** 与 **生成式 UI** 把工程和组织压成什么样。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| Goose | Goose agent framework | Block 自研模型无关代理层 |
| G2 | G2 agent OS | 员工自动化确定性工作流 |
| Builder Bot | Builder Bot | 类 Claude Code，深度接 CI/合并 |
| 生成式 UI | generative UI | 界面按用户数据即时生成 |
| 杰文斯悖论 | Jevons paradox | 单公司变小，可构建事物总量变大 |

---

## 01 拐点：12 月第一周人头公式失效

**Owen Jennings：** 两三年前 Jack 就对代理很早——**2024 年初上线 Goose**。24–25 年稳步进步；**11 月底 12 月第一周** 二元变化：**Opus 4.6 + Codex 5.3**，写新项目和啃复杂存量库都突然很强。几十年「人多 = 产出多」的关联 **在那周失效**——一两个工程师或设计+工程「用工具」可 **10×–100×**。我们花一季度想：这对公司运营意味着什么？执行团队与 Jack 决定裁 **40% 多一点**；**开发裁得远多于销售/客户管理**——不是 2021 过度招聘主导，是 **不再手写代码** 了。

**小结：** 裁员逻辑是生产力范式，不是纯 CFO 砍人。

---

## 02 执行原则：可靠、合规、小团队重建

**Owen Jennings：** 好在盈利和营收健康，不是为达财务目标砍 16%。原则：**可靠性**（不能宕机）、**客户信任与合规**（合规技术团队几乎没动）、**可持续增长**（三人小组继续做原路线图大押注）。开发组织 **从零重画**：1–6 人小队，流动接产品；管理层级砍 **50–60%**，产品侧 often 两层汇报。周四全公司透明沟通，慷慨遣散，**不立刻断技术访问**；会议减 **70–80%**，回到构建状态。

**小结：** 一次性大刀比多轮 15% 裁员少文化阴影。

---

## 03 Goose、G2 与「1 人 14 代理」

**Owen Jennings：** 周一上班最大变化：**AI 工具使用量强制飙升**。以前 Moneybot 推 50% 用户要 15 人团队；现在 **4 人 + 2000 美元 token 预算**（Claude Code 快速模式无限用），开 **八个 Goose 实例**，从顺序 PR 变 **14 个代理并行出 PR**，人做上下文切换和验收。PM、增长营销同样——后台 **10–20 个代理** 跑任务，我负责查进度、调方向、推进 GitHub。

**Goose** 模型无关，约 **120 个模型** 按任务切换；**G2** 让任何人自动化确定性流程。Moneybot（Cash App 口袋 CFO）、Square **Manager Bot** 都建在 Goose 之上。

**小结：** 工作从线性流水线变成 **并发代理编排**。

---

## 04 Builder Bot：85–100% 自主，人做最后 10%

**Owen Jennings：** 设计师、PM 都在提交 PR——不新鲜。内部 **Builder Bot** 像 Claude Code 但更深接基础设施：**自主合并 PR**，复杂功能 **100% 它建**，通常 **85–90%** 自动，懂上下文的人收尾 **最后 10%**。客户支持、风险、合规等任务队列大量自动化；模型+代理在规模化决策上 often 优于千人队列——**human-in-the-loop** 对监管和伙伴仍关键。

想法到 **10 万–100 万用户** 交付周期自 12 月以来大幅压缩。Twitter 上 CEO 绿点是真的——大家在 merge。

**小结：** 工程师从写代码变成 **验收与补复杂上下文**。

---

## 05 生成式 UI 与主动智能

**Owen Jennings：** 未来 **6 个月** 告别十年静态 UI——你的 Cash App 和我的应完全不同（工资、比特币 vs Afterpay 习惯）。问 Moneybot「最近怎么花钱」→ **即时生成图表**，代码里没有预设 viz。Square 侧：对 Manager Bot 说「给我两店排班 App，WhatsApp 发短信给员工」→ **生成不在应用商店源码里的管理 App**。

难点：**QA 数千万用户的非确定性 UI**；用户不会 prompt——我们押 **主动智能**，尤其涉及钱时主动推有意义的信息。

**小结：** UI 从产品设计变成 **运行时生成**；价值在懂何时主动说。

---

## 06 护城河：分销、监管与「你懂什么别人不懂」

**Owen Jennings：** 短期：分销与网络（没人 Vibe Code 出 5000–6000 万 P2P 用户）、牌照、Square 硬件。长期：Block 当 **智能系统**——对世界模型 Markdown（价值观、指标、取舍）与 **信号反馈** 闭环，用 Builder Bot / Claude Code 快速迭代「我们懂卖家买家怎么参与经济」。**最大护城河 = 你深刻理解而别人很难理解的东西**；答不出「我懂什么」可能被 Vibe Code 洗掉。

股价多年横盘但 **人均毛利润** 已进第二梯队（仅次英伟达、Meta 等）——市场短期投票，长期称重。

**小结：** 代码可复制， **领域认知 + 闭环速度** 难复制。

---

## 概念表

| 概念 | 一句话 |
|------|--------|
| 人头产出脱钩 | AI 工具让小团队替代大编制 |
| Goose | 模型无关公司级代理底座 |
| 14 代理并发 | 人从顺序 PR 变编排与验收 |
| Builder Bot | 90%+ 功能自主构建与合并 |
| 生成式 UI | 界面按用户实时生成 |
| 认知护城河 | 独特洞察 + 信号反馈迭代 |

---

## 金句

- **Owen：** 我们不再手写代码了——外界很多说法不真实。
- **Owen：** 创始人敢一次性 40%，比连年 15% 阴影好。
- **Owen：** 工作不是线性的，像后台 10–20 个代理在跑，你查作业。
- **Owen：** 最大护城河是你懂一些别人极难懂的东西——答不出就可能被淘汰。

---

## 行动启示

- 上市公司重组：用 **盈利缓冲 + 透明全员会** 换信任；合规团队慎动。
- 基建：早建 **模型无关代理层**（Goose）+ **确定性自动化 OS**（G2），拐点来了才能砍编制而不宕机。
- 工程：投资 **深度集成 CI 的内部编码代理**（Builder Bot），明确 **人只守最后 10%**。
- 产品：开始想 **生成式 UI 的 QA 与主动智能**，别让用户自己 prompt 金融场景。

---

## 相关阅读

- [[给每位员工配备AI智能体]] — 全员 Agent 组织实验
- [[LCA-60分钟变成AI-Native]] — 组织 AI-Native 转型节奏
- [[Cursor-128个Agent团队协作]] — 多代理并行工程编排
- [[MOC - AI 时代个人发展与组织]]

---

## 来源

- B 站：[BV1HDDyB9Emw](https://www.bilibili.com/video/BV1HDDyB9Emw/)
- 专栏：[cv47724642](https://www.bilibili.com/read/cv47724642/)
- 主源：`Recastory/workspace/bilibili-retranscribe/BV1HDDyB9Emw/ingest/column_article.md`
