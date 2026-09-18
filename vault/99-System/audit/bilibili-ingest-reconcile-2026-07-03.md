---
title: "B站 ingest 对账审计"
created: 2026-07-03
tags: [audit, bilibili]
---

# B站 ingest × vault 对账（Phase 0）

> Recastory workspace · manifest 225 条 · 生成 2026-07-03

## 汇总

- **素材等级**：S=129 · S-=39 · A=42 · B=15
- **enrich**：ok=190 · partial=32 · skipped=0
- **column_article**：168/32
- **vault 文件存在**：88/32

## 分级说明

| 等级 | 条件 | Phase 3 策略 |
|------|------|--------------|
| **S** | column ≥3k 字 + 含主持人/嘉宾 | 对谈稿或 v3 重写 |
| **S-** | column ≥1k 字 | 优先读 column |
| **A** | 仅有 video_description | 轻量 v3 |
| **B** | 仅 ASR | 补来源 |

## 全量清单

| BV | 等级 | enrich | column | 字 | 对话体 | column_url | Host×Guest | vault | 备注 |
|----|------|--------|--------|-----|--------|------------|------------|-------|------|
| BV11YTz6BEMz | A | complete | — | — | — | — | — | **缺失** | — |
| BV11mTi6aEiP | A | ok | — | — | — | — | — | **缺失** | — |
| BV128Tz66Eim | A | complete | — | — | — | — | — | **缺失** | — |
| BV12x1xB8E7b | A | partial | — | — | — | — | — | ✓ | UP 主评论中未解析出 http 链接 |
| BV14nrMBKENb | A | partial | — | — | — | — | — | ✓ | UP 主评论中未解析出 http 链接 |
| BV174GU6AEZY | A | partial | — | — | — | — | — | ✓ | UP 主评论中未解析出 http 链接 |
| BV18bjG6fEi7 | A | partial | — | — | — | — | — | ✓ | UP 主评论中未解析出 http 链接 |
| BV18qTi6uEDX | A | ok | — | — | — | — | — | ✓ | — |
| BV19MzXBNESV | A | partial | — | — | — | — | — | ✓ | UP 主评论中未解析出 http 链接 |
| BV19uzXBeEMp | A | ok | — | — | — | — | — | ✓ | — |
| BV1BHKX68Ee5 | A | ok | — | — | — | — | — | ✓ | — |
| BV1EwK96AEyU | A | partial | — | — | — | — | — | ✓ | UP 主评论中未解析出 http 链接 |
| BV1FEAVzbEWq | A | ok | — | — | — | — | — | ✓ | — |
| BV1HcifBWEAE | A | ok | — | — | — | — | — | **缺失** | — |
| BV1KQPyzcEwj | A | ok | — | — | — | — | — | **缺失** | — |
| BV1Ltw8zYErt | A | ok | — | — | — | — | — | **缺失** | — |
| BV1Mpf9B5Egk | A | partial | — | — | — | — | — | ✓ | 未找到 UP 主评论 |
| BV1NpAHzZEcc | A | partial | — | — | — | — | — | ✓ | UP 主评论中未解析出 http 链接 |
| BV1PnQfBvEs3 | A | partial | — | — | — | — | — | ✓ | UP 主评论中未解析出 http 链接 |
| BV1SJ93B2EBo | A | ok | — | — | — | — | — | ✓ | — |
| BV1TyTi6eEni | A | ok | — | — | — | — | — | **缺失** | — |
| BV1U4Tz6CEzu | A | ok | — | — | — | — | — | ✓ | — |
| BV1UajG6oEvj | A | partial | — | — | — | — | — | ✓ | UP 主评论中未解析出 http 链接 |
| BV1WnctziEac | A | partial | — | — | — | — | — | ✓ | opus 链接无效或已失效（404/API 500）: https://www.bilibili.com/opus/45649506 |
| BV1ZWTL64Erg | A | partial | — | — | — | — | — | ✓ | UP 主评论中未解析出 http 链接 |
| BV1a9zXBeEKc | A | ok | — | — | — | — | — | **缺失** | — |
| BV1cVjN6oEwx | A | partial | — | — | — | — | — | ✓ | UP 主评论中未解析出 http 链接 |
| BV1dwAczDEXY | A | ok | — | — | — | — | — | ✓ | — |
| BV1eyBgB2EbX | A | partial | — | — | — | — | — | ✓ | UP 主评论中未解析出 http 链接 |
| BV1hkFkz9E6N | A | ok | — | — | — | — | — | **缺失** | — |
| BV1iUZBBjEUo | A | ok | — | — | — | — | — | **缺失** | — |
| BV1ixKX6oEzK | A | partial | — | — | — | — | — | ✓ | UP 主评论中未解析出 http 链接 |
| BV1kWctzeEYK | A | partial | — | — | — | — | — | ✓ | UP 主评论中未解析出 http 链接 |
| BV1o4TL6sExw | A | partial | — | — | — | — | — | ✓ | UP 主评论中未解析出 http 链接 |
| BV1paf9BTEBk | A | ok | — | — | — | — | — | **缺失** | — |
| BV1qeitB8EAk | A | ok | — | — | — | — | — | **缺失** | — |
| BV1rQf8BKEdA | A | ok | — | — | — | — | — | **缺失** | — |
| BV1sFibBkEcT | A | ok | — | — | — | — | — | **缺失** | — |
| BV1tZw4zLEX8 | A | ok | — | — | — | — | — | ✓ | — |
| BV1uBTi6BEfd | A | ok | — | — | — | — | — | **缺失** | — |
| BV1wzTz6vEVm | A | complete | — | — | — | — | — | **缺失** | — |
| BV1xEzqBVEeb | A | ok | — | — | — | — | — | ✓ | — |
| BV152jP6LEEA | B | partial | — | — | — | — | — | **缺失** | — |
| BV19jTz6JELc | B | partial | — | — | — | — | — | **缺失** | — |
| BV1CiTz6iEYZ | B | partial | — | — | — | — | — | **缺失** | — |
| BV1EAK96aEVL | B | partial | — | — | — | — | — | **缺失** | — |
| BV1HGjN6tE6V | B | partial | — | — | — | — | — | **缺失** | — |
| BV1MrTi6iEvh | B | partial | — | — | — | — | — | **缺失** | — |
| BV1SWTz6yEBA | B | partial | — | — | — | — | — | **缺失** | — |
| BV1ZpKX6fEuo | B | partial | — | — | — | — | — | **缺失** | — |
| BV1gtTu6hEDD | B | partial | — | — | — | — | — | **缺失** | — |
| BV1oHjN6nE6g | B | partial | — | — | — | — | — | **缺失** | — |
| BV1opjN6SEnb | B | partial | — | — | — | — | — | **缺失** | — |
| BV1rLjN6xEc6 | B | partial | — | — | — | — | — | **缺失** | — |
| BV1rfKX6NEAY | B | partial | — | — | — | — | — | **缺失** | — |
| BV1vtTi6LEhx | B | partial | — | — | — | — | — | **缺失** | — |
| BV1zEKX6aEiG | B | partial | — | — | — | — | — | **缺失** | — |
| BV11H526yEiB | S | ok | ✓ | 10265 | ✓ | ✓ | Quill Delta → Markdown）

---

## 摘要

导读： × 主持人）：欢迎收听《大科技播客》。今天我们有一期紧急节目，邀请到 OpenAI  | **缺失** | — |
| BV11nRmB1EkH | S | ok | ✓ | 11947 | ✓ | ✓ | Quill Delta → Markdown）

---

## 摘要

导读： × 主持人）：他有一种罕见的天赋，能让最复杂的技术变革变得既易于理解又势不可挡。你们 | ✓ | — |
| BV11s526kEAk | S | ok | ✓ | 22601 | ✓ | ✓ | — | **缺失** | — |
| BV12RVf62Ed2 | S | ok | ✓ | 22151 | ✓ | ✓ | 嘉宾）：接下来的这一两年，基本上将决定未来十年甚至更长时间内，哪些公司能够获得成 × 如合同审查）彻底商品化，从而放大顶层决策和沟通的价值。就像体育比赛中快 0.1  | **缺失** | — |
| BV12qTu6WETP | S | ok | ✓ | 13023 | ✓ | ✓ | 嘉宾）：一场剧变即将到来。每个人都将在电脑上拥有属于自己的专属个人助理，它能让你 × Quill Delta → Markdown）

---

## 摘要

导读： | ✓ | — |
| BV13fGm6HETj | S | ok | ✓ | 8244 | ✓ | ✓ | — | ✓ | — |
| BV1467R6LEzm | S | ok | ✓ | 15434 | ✓ | ✓ | — | **缺失** | — |
| BV14AjN6eEcg | S | ok | ✓ | 21501 | ✓ | ✓ | 每分钟工具调用数）来提升产出。

1. 知识库是 Agent 廉价且高效的真相来 × rank）和较小的样本量下表现出色，但它有一个性能弧线。随着样本数量增加，它们很 | ✓ | — |
| BV15moTBXEmk | S | ok | ✓ | 17751 | ✓ | ✓ | 如订票、查账）而存在的 App 将消亡，因为用户不再需要亲自操作 UI。未来产品 × Agent Stack）正在兴起。

Peter Yang | **缺失** | — |
| BV161o1BBERH | S | ok | ✓ | 15419 | ✓ | ✓ | Quill Delta → Markdown）

---

## 摘要

导读： × 主持人）：我们的下一位演讲者将谈论“驾驭工程学”：当人类驾驶，智能体执行时，如何 | ✓ | — |
| BV16JdVBGEyU | S | ok | ✓ | 29289 | ✓ | ✓ | Token）的价值因应用场景而异。英伟达正在调整策略，不仅追求高吞吐量，还针对高 × 主持人）：我们看到许多软件公司的估值暴跌，因为人们预期人工智能将使软件商品化。有 | **缺失** | — |
| BV16e526iENH | S | ok | ✓ | 11014 | ✓ | ✓ | — | ✓ | — |
| BV16wGS6MEEn | S | ok | ✓ | 22775 | ✓ | ✓ | — | **缺失** | — |
| BV17AQhBVEje | S | ok | ✓ | 12584 | ✓ | ✓ | — | ✓ | — |
| BV17p9yB9Ef3 | S | ok | ✓ | 14219 | ✓ | ✓ | 销售）。

## 重点速览

- 软件开发正从配置痛苦转向创意表达 [01:45 × 主持人）：今天，我邀请到了 Replit 的首席执行官兼联合创始人 Amjad  | **缺失** | — |
| BV17x9yBXEug | S | ok | ✓ | 26230 | ✓ | ✓ | 品味制造者）以及负责决策的“成年人”。PM 应利用沟通优势成为企业的“变革推动者 × 主持人）： 产品经理过去非常看重的技能正在发生巨大变化，这将是一片混乱。

Ni | **缺失** | — |
| BV18LV66aEG9 | S | ok | ✓ | 6928 | ✓ | ✓ | — | ✓ | — |
| BV18QE56zEVr | S | ok | ✓ | 20044 | ✓ | ✓ | Play）”文化。通过设立“思考周”和鼓励员工在会议间隙折腾新工具，团队能够从旧 × 主持人）：Codex 在三到六个月前还一无是处。如果 OpenAI 的任何人正在 | ✓ | — |
| BV18hjG6bE6t | S | ok | ✓ | 18122 | ✓ | ✓ | 如园艺管理、特定金融需求）即时编写并运行软件，操作系统的原生功能将被 AI 彻底 × 主持人）：我们可以编辑一下这个场景，让它看起来像我们预想的那样。是的。

Log | ✓ | — |
| BV18o526DEFr | S | ok | ✓ | 28175 | ✓ | ✓ | AGI）是非常困难的。为超强 AGI 模型构建产品其实非常容易，难点在于，对于现 × 如邮件处理）打磨至 100% 成功，只有真正代表用户采取行动而非仅仅聊天，AI  | ✓ | — |
| BV19V5t6ME6c | S | ok | ✓ | 10367 | ✓ | ✓ | PM、财务、设计）都能通过 AI 直接参与构建。

## 重点速览

- 编码已 × 主持人）：好的，我很高兴介绍我们的下一位演讲者。请举手，这里有谁在使用 Clau | ✓ | — |
| BV19qLA6BEHx | S | ok | ✓ | 51540 | ✓ | ✓ | MCTS）在 AlphaGo 中扮演了策略改进器的角色。它通过选择、扩展、评估、 × 主持人）：今天我请来了 Eric Jiang，他最近担任 1x Technolo | **缺失** | — |
| BV19sGH6UECj | S | ok | ✓ | 21149 | ✓ | ✓ | Quill Delta → Markdown）

---

## 摘要

导读： × Agents）——我们指的是运行五、六个小时甚至更长时间。我想大家可能都见过这类 | ✓ | — |
| BV1ADobBcECX | S | ok | ✓ | 7762 | ✓ | ✓ | — | ✓ | — |
| BV1AGJx6fE3A | S | ok | ✓ | 27724 | ✓ | ✓ | 嘉宾）：我发现那些拥有不同职业背景的人，比如他们为了其他专业去上学，做过一些不相 × 别叫我，我会叫你）将使 AI 真正融入 SDLC 的每一个环节，而非简单的代码补 | **缺失** | — |
| BV1BLGH6REyX | S | ok | ✓ | 15756 | ✓ | ✓ | — | ✓ | — |
| BV1CdGU6GE6m | S | ok | ✓ | 20903 | ✓ | ✓ | Biomimicry）是最后一公里。

在不同的垂直领域，总会有很多空间留给这最 × T0）最强，但无法像人类一样随时间积累公司特定知识。真正的 AGI 需要具备持续 | ✓ | — |
| BV1CoLA6REyB | S | ok | ✓ | 25326 | ✓ | ✓ | 嘉宾）：我觉得几年前我开始做这个播客的时候，我真的希望有一天能请到像您这样的人。 × 如机器人和高级智能）被边缘化。他强调突破性创新需要雇佣顶尖人才并“别碍事”，而当 | **缺失** | — |
| BV1D9ojBzEAd | S | ok | ✓ | 12355 | ✓ | ✓ | — | **缺失** | — |
| BV1Dd9CBGEmK | S | ok | ✓ | 15519 | ✓ | ✓ | — | **缺失** | — |
| BV1De7R6JELZ | S | ok | ✓ | 13913 | ✓ | ✓ | Agent）虽然能自主执行任务，但缺乏内在动机和拒绝指令的能动性。AI 总是会回 × 主持人）：你提示 AI 做某事，它让你大吃一惊，让你感到力不从心。你觉得，天哪， | **缺失** | — |
| BV1Dj93BUEXU | S | ok | ✓ | 17716 | ✓ | ✓ | 嘉宾）： 也许我们应该轮流介绍一下自己，然后再深入探讨。我是 Dan，Every × 紫色）的贡献。这种 Markdown 原生的协作环境让代理能更精准地参与文档编写 | **缺失** | — |
| BV1E4DtBKEUN | S | ok | ✓ | 19013 | ✓ | ✓ | 嘉宾）：当客户使用这种现成的封闭模型时，非常遗憾的是，他们没有利用好已经收集了四 × FDE）的闭环反馈 [65:10]
[图片]

## 01 Voxtral TT | **缺失** | — |
| BV1EJjN6XETy | S | ok | ✓ | 11777 | ✓ | ✓ | — | **缺失** | — |
| BV1EfGd6WEzK | S | ok | ✓ | 21426 | ✓ | ✓ | BCI）是与 AGI、机器人并列的三个关键领域，Meta 正在研究能预测大脑反应 × 主持人）：好的，凯莉，这周我们又请到了一位重磅嘉宾。

Alex Wang | **缺失** | — |
| BV1F8Ju6VEbp | S | ok | ✓ | 23747 | ✓ | ✓ | 嘉宾）：我们身处资本密集型行业，正与全球资本最雄厚的公司竞争。我们今年的资本支出 × 托管推理），堆栈越高，能服务的客户群体就越广，从十几家超大规模厂商扩展到成千上万 | **缺失** | — |
| BV1FNDbBgEkn | S | ok | ✓ | 11608 | ✓ | ✓ | — | **缺失** | — |
| BV1FX536qEFS | S | ok | ✓ | 43099 | ✓ | ✓ | 嘉宾）：在 Meta 上的月消费达到 **10 万美元之前，不要在 Meta 以 × AQ）而非单纯的智商 [45:20]
- 废除冗长会议，推行 60 秒响应的异步 | **缺失** | — |
| BV1FZQ8B2EJn | S | ok | ✓ | 18619 | ✓ | ✓ | generalization）有关。模型最终会回归到哪些价值观？你需要弄清楚哪些 × CoT）是出于安全与对齐的深层考量 [42:10]
- 长期对齐的本质是对泛化问 | **缺失** | — |
| BV1FzQhBUETs | S | ok | ✓ | 35840 | ✓ | ✓ | — | **缺失** | — |
| BV1G2Gn61E9b | S | ok | ✓ | 30753 | ✓ | ✓ | 嘉宾）：世界上没有一种语言能满足我的需求。

Ryan Peterman × Core Guidelines），旨在通过编译器配置文件强制执行安全实践，而非仅 | **缺失** | — |
| BV1G9Gm6REdy | S | ok | ✓ | 15507 | ✓ | ✓ | Scopes）来实现。在代码执行沙箱中，应严格限制网络连接，仅允许访问特定的 A × 主持人）：Alex，欢迎来到节目。

Alex Rattray | ✓ | — |
| BV1HwdjBHENb | S | ok | ✓ | 13796 | ✓ | ✓ | 如滚动深度、跳出率）自动生成优化建议，并直接在前端动态注入变体标题。这种无需开发 × 主持人）：阿米尔又来播客了，谢谢。到这集结束时，大家会学到什么？

Amir | ✓ | — |
| BV1Jo7R6eEGi | S | ok | ✓ | 27097 | ✓ | ✓ | 如Shopify的River），由专门的驻场工程师维护，员工通过Slack等界面 × 主持人）： 你上次来播客的时候，曾有一个惊人的观点，认为大家都在忽视 Claud | **缺失** | — |
| BV1JvjP6XE1k | S | ok | ✓ | 7186 | ✓ | ✓ | — | ✓ | — |
| BV1LFjV6BEpe | S | ok | ✓ | 15872 | ✓ | ✓ | Skills）”，如“热核审查”能让代理进入极端严苛的审计模式。这种将工作流代码 × 主持人）：你现在有正在运行的代理吗？我知道你已经设置好了。你的代理今天在忙什么？ | ✓ | — |
| BV1MFjN6iEFU | S | ok | ✓ | 18629 | ✓ | ✓ | 如商业地产、餐饮）。通过针对高频、利基的工作流程提供AI加速服务，初创公司可以快 × 主持人）：如何成为一家AI原生公司？在本期节目中，我们将用不到60分钟的时间，为 | ✓ | — |
| BV1MM9xBHEsQ | S | ok | ✓ | 7174 | ✓ | ✓ | — | ✓ | — |
| BV1MQVf6SEST | S | ok | ✓ | 8469 | ✓ | ✓ | — | ✓ | — |
| BV1NK5m61ErG | S | ok | ✓ | 16826 | ✓ | ✓ | — | **缺失** | — |
| BV1NMJx6aEci | S | ok | ✓ | 13564 | ✓ | ✓ | Agents）处理的任务复杂度增加，单一的聊天界面已无法承载巨大的认知负荷。开发 × Latent Space）与萨蒂亚·纳德拉的交叉集。祝贺你取得了不起的成就。

 | ✓ | — |
| BV1NiooB5ESW | S | ok | ✓ | 13843 | ✓ | ✓ | 嘉宾）：好的。实际上我们可以一起出来。

你们可以一起出来，没什么秘密。彼得，欢 × PR）与做梦记忆机制 [23:45]
- 工程师的核心护城河：品味与说不的能力  | **缺失** | — |
| BV1NuGU6yE1b | S | ok | ✓ | 22957 | ✓ | ✓ | 嘉宾）：我从未见过如此陡峭的增长，而且它还在不断地呈指数级增长。Claude C × 如社交连接）上，因为 AI 可以写出任何代码，但无法瞬间复制用户关系网。

1. | ✓ | — |
| BV1QM5G6xEdB | S | ok | ✓ | 15885 | ✓ | ✓ | Primitives），让用户以最少的工作量获得结果，而非仅仅是消耗 Token × 主持人）：一年后，你认为这个平台会发展到什么程度？我们希望尝试这样的方向：Cla | ✓ | — |
| BV1Qh7R6HEf5 | S | ok | ✓ | 7188 | ✓ | ✓ | — | ✓ | — |
| BV1R25A6BEfX | S | ok | ✓ | 15144 | ✓ | ✓ | 如核能）提供了市场化的投资动力，是推动全球电网现代化的最佳契机。

1. 对抗  × 主持人）：下午好，晚上好。我很高兴能和大家在一起，尤其高兴能和黄仁勋先生在一起。 | **缺失** | — |
| BV1RnEL6UEdh | S | ok | ✓ | 11452 | ✓ | ✓ | 嘉宾）：如果你回顾过去 30 年，会发现世界上大部分的经济增长都来自软件公司。如 × 如 JSON 解析），而应跳过它们，去攻克更本质的架构难题。

1. 后发优势源 | **缺失** | — |
| BV1RrLz6rEH2 | S | ok | ✓ | 21547 | ✓ | ✓ | 嘉宾）：正如 Chai 所说，最重要的一点是：情境决定一切。我一直在思考，我们如 × 看数据）流程，确保个性化风格偏好不干扰临床准确性。

1. 纯粹性已死：在嘈杂世 | **缺失** | — |
| BV1SsE368Ea8 | S | ok | ✓ | 8740 | ✓ | ✓ | 嘉宾）：好的，你想聊些什么？

Gustaf Alströmer × Agent）实现端到端工作流自动化的最佳实验场。

1. 品牌破圈：用顶级创意打 | **缺失** | — |
| BV1T6Gd6qEyS | S | ok | ✓ | 19338 | ✓ | ✓ | Longevity Tech）是被低估的蓝海 [21:15]
- 垂直领域的AI × 主持人）：今天我只有一个目标，那就是回顾 12 个重大的创业机会。前几天我发了一 | **缺失** | — |
| BV1ToE56KE7E | S | ok | ✓ | 32561 | ✓ | ✓ | 嘉宾）：你只是在谈论即将到来的工作末日。每次出现新技术，它都会自动化掉一批工作， × Distribution）是比技术更深的护城河。现有巨头如 Google、Met | **缺失** | — |
| BV1Tu9xBDEkt | S | ok | ✓ | 11977 | ✓ | ✓ | 嘉宾）：我们的工作是客户在哪里，我们就在哪里提供服务。在20世纪50年代，这意味 × 如“不要过快跳向解决方案”）进行实时反馈。这种高频的问责机制比半年的绩效面谈更能 | **缺失** | — |
| BV1TwjN6NEuA | S | ok | ✓ | 8740 | ✓ | ✓ | — | ✓ | — |
| BV1UqGd6BEzj | S | ok | ✓ | 15753 | ✓ | ✓ | Referee Agent）”机制来解决这一问题。通过让一个代理专门监督主代理的 × 主持人）：欢迎来到 OpenAI 论坛。我叫克里斯·尼科尔森，来自全球事务团队， | ✓ | — |
| BV1VEooBdEjQ | S | ok | ✓ | 10490 | ✓ | ✓ | Extension）不仅能延长片尾，还能通过“填补空白”连接两个不同的视频片段。 × 主持人）：在本期节目中，西里奥将带你了解这些用例，展示具体的操作方法，包括提示词 | **缺失** | — |
| BV1VRdABBEnK | S | ok | ✓ | 12227 | ✓ | ✓ | — | **缺失** | — |
| BV1WPo4B9EyZ | S | ok | ✓ | 15147 | ✓ | ✓ | Quill Delta → Markdown）

---

## 摘要

导读： × 主持人）：大家下午好，欢迎来到 OpenAI 论坛。我是 Chris Nicho | **缺失** | — |
| BV1WhoEBPEau | S | ok | ✓ | 9062 | ✓ | ✓ | Quill Delta → Markdown）

---

## 摘要

导读： × 主持人）：今天我们发布 ImageGen 2.0。

Kenji Hata | **缺失** | — |
| BV1YX9CB5ETB | S | ok | ✓ | 15168 | ✓ | ✓ | — | **缺失** | — |
| BV1Ye9yBjELt | S | ok | ✓ | 17289 | ✓ | ✓ | 嘉宾）： 我们不只是其他公司知识产权的分销商，我们拥有自己的知识产权。

Mat × Agent）演进改变芯片设计，KV 缓存成为关键 [21:10]
- 解决 AI | **缺失** | — |
| BV1YfE36TEyz | S | ok | ✓ | 11350 | ✓ | ✓ | — | **缺失** | — |
| BV1aQdHBpEMB | S | ok | ✓ | 12749 | ✓ | ✓ | 如特定肢体动作）来确认信息记录，在减少屏幕时间的同时，利用环境智能引导我们发现人 × 主持人）：嘿，艾什。很高兴见到你，谢谢你来做客。

Ashe Magalhaes | **缺失** | — |
| BV1bpdAB8Ejp | S | ok | ✓ | 10490 | ✓ | ✓ | — | ✓ | — |
| BV1bq7R67EqG | S | ok | ✓ | 10695 | ✓ | ✓ | 如折叠衣服或喂狗）自由组合，在未来 1-3 年内，这种定制化的物理 AI 将比昂 × Eric Pan）。潘昊是首席执行官，吴伊莲是机器人部门负责人。如果你目前是在收 | **缺失** | — |
| BV1bv7R6UEfy | S | ok | ✓ | 8550 | ✓ | ✓ | Quill Delta → Markdown）

---

## 摘要

导读： × Telepathy），它能让失去身体活动能力的人与电脑进行交流。

DJ Seo | **缺失** | — |
| BV1c8RmB6E6C | S | ok | ✓ | 22724 | ✓ | ✓ | Agency）和自我意识，学会管理由 AI 组成的“十万人规模”虚拟公司，而非仅 × 主持人）：那么 OpenAI 是如何诞生的？

Greg Brockman | **缺失** | — |
| BV1dC5268Ei1 | S | ok | ✓ | 27039 | ✓ | ✓ | Jensen Huang）受到了很多负面评价。

swyx × 如图片大小对转化率的负面影响），帮助无法进行 A/B 测试的小商家通过反事实分析 | **缺失** | — |
| BV1dJEL6JEeR | S | ok | ✓ | 14910 | ✓ | ✓ | 如 Qwen）的零成本优势，设置每 20 分钟扫描 Reddit 和 X 上的用 × 主持人）：Alex Finn，我需要你在本集结束时向我解释，为什么我需要使用He | **缺失** | — |
| BV1dZLS66E3m | S | ok | ✓ | 7293 | ✓ | ✓ | — | ✓ | — |
| BV1db7V6rEpr | S | ok | ✓ | 11747 | ✓ | ✓ | Quill Delta → Markdown）

---

## 摘要

导读： × 主持人）：这就是为什么我认为很多人在害怕。我原以为大学是通往职业生涯的必经之路。 | **缺失** | — |
| BV1dg5t6gEJ8 | S | ok | ✓ | 25282 | ✓ | ✓ | Quill Delta → Markdown）

---

## 摘要

导读： × 主持人）：今天的嘉宾是一位编程和创业天才，他就是 Brex 的首席执行官兼联合创 | **缺失** | — |
| BV1eS9CBjESZ | S | ok | ✓ | 15990 | ✓ | ✓ | Quill Delta → Markdown）

---

## 摘要

导读： × 主持人）：今天，我很高兴能邀请到 Stripe 的设计主管 Katie Dill | **缺失** | — |
| BV1eWGH6JE6m | S | ok | ✓ | 9345 | ✓ | ✓ | — | ✓ | — |
| BV1g5V66AEUL | S | ok | ✓ | 9587 | ✓ | ✓ | — | **缺失** | — |
| BV1gDE56gE7B | S | ok | ✓ | 27674 | ✓ | ✓ | 嘉宾）： 我有一个相当大胆的观点：**视觉智能实际上主要来自语言。** 比如现在 × Video Agents）是生产力的转折点 [52:10]
- 语言模型将进化出 | **缺失** | — |
| BV1gE93BEEUq | S | ok | ✓ | 13480 | ✓ | ✓ | 嘉宾）：那些光标看起来只是个小细节，但这是我第一次看到 AI 被赋予如此人性化的 × 对话到生成），而 Pencil 提倡“视觉规划”。设计师不需要一次性写对提示词， | **缺失** | — |
| BV1gFGU6DEkW | S | ok | ✓ | 9591 | ✓ | ✓ | — | ✓ | — |
| BV1hoGm6XEdD | S | ok | ✓ | 22326 | ✓ | ✓ | Scratchpad）。这种设计将内存调度权交给编译器，从而获得可预测的执行时间 × 主持人）：我再次请到了 MatX 公司的 CEO Reiner Pope，这是一 | **缺失** | — |
| BV1i9E366EAr | S | ok | ✓ | 13633 | ✓ | ✓ | Quill Delta → Markdown）

---

## 摘要

导读： × 主持人）：马蒂亚斯，感谢您的加入。

Matias Castello | ✓ | — |
| BV1iH7R6tEfJ | S | ok | ✓ | 18084 | ✓ | ✓ | RL）阶段的表现和在生产环境中的行为就会有所不同。

Sonya Huang × 基于用户反馈）作为持续优化的手段。Federico 指出，在线 RL 存在悖论： | ✓ | — |
| BV1iKdvBhEYJ | S | ok | ✓ | 16498 | ✓ | ✓ | — | ✓ | — |
| BV1ik526cEsp | S | ok | ✓ | 10132 | ✓ | ✓ | — | ✓ | — |
| BV1itEh6FEUW | S | ok | ✓ | 24448 | ✓ | ✓ | 嘉宾）：我认为测试对这些 AI 来说，实际上是一个非常有趣的解决问题的挑战。如果 × 如 S3 挂载）。Cognition 通过构建自定义的块差异文件存储格式，实现了 | ✓ | — |
| BV1j15A6gEcL | S | ok | ✓ | 30828 | ✓ | ✓ | — | ✓ | — |
| BV1jhogBwEzo | S | ok | ✓ | 10491 | ✓ | ✓ | — | ✓ | — |
| BV1jrjP6UEe3 | S | ok | ✓ | 18282 | ✓ | ✓ | — | **缺失** | — |
| BV1kTo4BQE43 | S | ok | ✓ | 16462 | ✓ | ✓ | LLM）在逻辑正确性与空间推理上的先天缺陷。Eve 提出，AI 的下一场相变不在 × 主持人）：你能为我们定义一下 EBM 吗？EBM 本质上是非自回归的。

Eve | **缺失** | — |
| BV1ka9CBZEGN | S | ok | ✓ | 15486 | ✓ | ✓ | 嘉宾）：欺骗自己太容易了。你会因为一些微小的验证时刻，就相信自己的产品很成功。但 × Quill Delta → Markdown）

---

## 摘要

导读： | **缺失** | — |
| BV1kt5266EyW | S | ok | ✓ | 11437 | ✓ | ✓ | 如特定数据库供应商故障），并自动生成修复建议，实现自我改进的闭环。

## 重点 × Prompt）、优化代理框架，或者添加一个新工具。

无论你改变了什么，都可以先 | ✓ | — |
| BV1nWLA6EEv2 | S | ok | ✓ | 9232 | ✓ | ✓ | — | **缺失** | — |
| BV1nnGU6TEeN | S | ok | ✓ | 13583 | ✓ | ✓ | Quill Delta → Markdown）

---

## 摘要

导读： × 主持人）：Cerebras 最近上市，目前在股市上的市值约为 630 亿美元。A | **缺失** | — |
| BV1nyo1BuEd9 | S | ok | ✓ | 13954 | ✓ | ✓ | 如财务报表分析、冰箱食材配菜），并将其封装成 Agent 技能，从而释放大脑的认 × 主持人）：我恳求他很久，伊姆兰终于来了。谢谢你，谢谢你的到来。伊姆兰，到这集结束 | ✓ | — |
| BV1oGDbBeEjv | S | ok | ✓ | 17889 | ✓ | ✓ | 搜索）”：通过策略网络过滤无效走法，通过价值网络评估局面，这种对组合空间的优雅驾 × 主持人）：欢迎回到Google DeepMind播客。 我是汉娜·弗莱教授。 想 | **缺失** | — |
| BV1oZ536AE4T | S | ok | ✓ | 15472 | ✓ | ✓ | — | ✓ | — |
| BV1ohDzBwEJN | S | ok | ✓ | 11722 | ✓ | ✓ | 嘉宾）：大家好。今天我非常高兴能邀请到 Anthropic 的设计主管 Jenn × Agentic Tools）的激增需求。

1. 愿景不再是五年计划，而是三至六 | ✓ | — |
| BV1psDXByEwV | S | ok | ✓ | 18024 | ✓ | ✓ | 多个 AI 互相无意义回复）。解决办法是引入“老板 AI”架构，由一个专门的模型 × 主持人）：威利，你好吗？布兰登，欢迎来到节目。

Brandon Gell | ✓ | — |
| BV1qiE56SE4c | S | ok | ✓ | 12434 | ✓ | ✓ | 嘉宾）：那种花几个月时间开发一个东西，然后才发布给别人使用的想法，我觉得是个非常 × PR），确保每个功能模块都是可测试且自包含的。

1. 引入对抗性审查：用 GP | **缺失** | — |
| BV1r4Ju65EJT | S | ok | ✓ | 10608 | ✓ | ✓ | — | **缺失** | — |
| BV1rEEh6KEVF | S | ok | ✓ | 10636 | ✓ | ✓ | Harj）完全没问这些问题。我当时真心觉得面试表现糟透了，我们肯定进不去。

哈 × Time to Value）是核心。只要产品能在极短时间内证明其自动化价值，客户 | **缺失** | — |
| BV1rh526BEjY | S | ok | ✓ | 15744 | ✓ | ✓ | 嘉宾）：计算机科学很可能不再是一个增长型行业。

Ryan Peterman × Schema）极其混乱、查询逻辑长达百行且包含非公开的业务逻辑，这与 LLM 训 | **缺失** | — |
| BV1s2Gd6aEF7 | S | ok | ✓ | 20702 | ✓ | ✓ | 如判断 AI 幻觉、内化知识）将超越基础技能；他主张通过“代码即论文”等方式，鼓 × 主持人）： 诺亚·布莱尔的 Claude Code 设置可能是我见过最酷的。他在 | ✓ | — |
| BV1sKDdBWETM | S | ok | ✓ | 15507 | ✓ | ✓ | Context）是 Agent 的护城河 [32:15]
- 协作新范式：Age × 主持人）： 每个人都会有很多代理，公司也会建立自己的代理。Linear 就像一个 | ✓ | — |
| BV1sM9yBPE6N | S | ok | ✓ | 34571 | ✓ | ✓ | — | **缺失** | — |
| BV1tF5m6UEGf | S | ok | ✓ | 12641 | ✓ | ✓ | — | **缺失** | — |
| BV1tR9zB4Ezv | S | ok | ✓ | 9014 | ✓ | ✓ | — | ✓ | — |
| BV1tV7Q6TEcf | S | ok | ✓ | 16703 | ✓ | ✓ | 如 Codex）的普及，一个人就能掌握从客户关系到代码实现的全部背景。这种“激进 × Forward Deployed Engineering）的许多不同定义。所以， | ✓ | — |
| BV1tw9yBMEUK | S | ok | ✓ | 24157 | ✓ | ✓ | Stories）和滑动导航，但迅速被竞对抄袭。Evan 意识到软件代码本身没有护 × 主持人）： 你们拥有十亿月活跃用户，为什么建立一个持久、耐用的社交消费产品会如此 | **缺失** | — |
| BV1txdABtEWF | S | ok | ✓ | 20036 | ✓ | ✓ | 嘉宾）：我们正在开发一项技术，它可能具有某种特性，能够启动一个比工业革命规模大1 × Quill Delta → Markdown）

---

## 摘要

导读： | ✓ | — |
| BV1tzJc6PE82 | S | ok | ✓ | 20940 | ✓ | ✓ | 嘉宾）：推理是否足以实现泛化，还是需要其他方法？感觉确实有其他方法可能能更好地实 × Quill Delta → Markdown）

---

## 摘要

导读： | **缺失** | — |
| BV1u3Lz6AEb3 | S | ok | ✓ | 23111 | ✓ | ✓ | — | **缺失** | — |
| BV1uDLz6iEX3 | S | ok | ✓ | 15528 | ✓ | ✓ | Agent）没有为你运行任务，或者它在后台运行时，它实际上会遍历自己的记忆，找出 × Agent）的做梦机制与记忆清理 [09:12]
- 区分单向门与双向门决策 [ | ✓ | — |
| BV1ug7Q6uEhX | S | ok | ✓ | 13332 | ✓ | ✓ | 如 GPT-5.5 或开源的 GLM）。配合 Composio 处理数千个应用的 × 主持人）：有人每月向每个客户收取 5000 美元，专门为他们构建和管理 AI 代 | **缺失** | — |
| BV1uiGd6gECC | S | ok | ✓ | 8633 | ✓ | ✓ | — | **缺失** | — |
| BV1wxDnB9Eo9 | S | ok | ✓ | 23854 | ✓ | ✓ | super app）的全部内容。格雷格今天和我们一起在演播室。格雷格，很高兴见到 × post-training），明确告诉它：好吧，现在你知道如何解决问题了，请在所 | **缺失** | — |
| BV1xC7R6VEWv | S | ok | ✓ | 28523 | ✓ | ✓ | — | **缺失** | — |
| BV1yAo4BsEed | S | ok | ✓ | 25762 | ✓ | ✓ | Tokens）的最大消费者竟然是CMO，因为他们不再需要依赖层层下属来完成实际工 × 能独立将构想推向成功的领导者）。一家公司的并行任务数由枪管数量决定，盲目增加弹药 | **缺失** | — |
| BV1yWRmBCEDc | S | ok | ✓ | 15373 | ✓ | ✓ | AGI）所必需的。这取决于你对 AGI 时间线的预期，我的预期大概是在 2030 × 手机、眼镜、机器人）运行高效的 Flash 模型处理视听信息，这既能保证毫秒级响 | ✓ | — |
| BV1ynJu6EEpC | S | ok | ✓ | 11748 | ✓ | ✓ | Quill Delta → Markdown）

---

## 摘要

导读： × 主持人）：当一家公司启动一个大型自动化项目时，会发生什么？让我们与 Ulta B | **缺失** | — |
| BV1zKDbBzEeT | S | ok | ✓ | 12374 | ✓ | ✓ | 如机器人）建立闭环，才能实现真正的跨领域突破。

## 重点速览

- 物理学背 × 主持人）：利亚姆，非常感谢你今天参加我们的“无先验”节目。

Liam Fedu | ✓ | — |
| BV12irNBtE7D | S- | ok | ✓ | 15109 | — | ✓ | — | ✓ | — |
| BV14jrKBcEav | S- | ok | ✓ | 26865 | — | ✓ | — | **缺失** | — |
| BV16BQhBEEgH | S- | ok | ✓ | 12642 | — | ✓ | — | **缺失** | — |
| BV18grKBNEJA | S- | ok | ✓ | 18781 | — | ✓ | — | **缺失** | — |
| BV19GAqzSE9K | S- | ok | ✓ | 13840 | — | ✓ | — | **缺失** | — |
| BV1ArFCz5EjX | S- | ok | ✓ | 42781 | — | ✓ | — | **缺失** | — |
| BV1AwXCBxEBk | S- | ok | ✓ | 10391 | — | ✓ | — | **缺失** | — |
| BV1CnDXBjEmH | S- | ok | ✓ | 11203 | — | ✓ | — | ✓ | — |
| BV1CpQfBAE5N | S- | ok | ✓ | 4126 | — | ✓ | — | ✓ | — |
| BV1GzPyzuEMe | S- | ok | ✓ | 16538 | — | ✓ | — | **缺失** | — |
| BV1H1FCzrEEF | S- | ok | ✓ | 16404 | — | ✓ | — | **缺失** | — |
| BV1H59yBFECR | S- | ok | ✓ | 18133 | — | ✓ | — | ✓ | — |
| BV1HDDyB9Emw | S- | ok | ✓ | 9986 | — | ✓ | — | **缺失** | — |
| BV1HTXFBAE68 | S- | ok | ✓ | 7573 | — | ✓ | — | ✓ | — |
| BV1KMGU6LEqd | S- | ok | ✓ | 8960 | — | ✓ | — | **缺失** | — |
| BV1KXDtBEEbV | S- | ok | ✓ | 14763 | — | ✓ | — | **缺失** | — |
| BV1LvZTBREby | S- | ok | ✓ | 15838 | — | ✓ | — | **缺失** | — |
| BV1NscRzUEia | S- | ok | ✓ | 15190 | — | ✓ | — | **缺失** | — |
| BV1QSzzBfELB | S- | ok | ✓ | 7143 | — | ✓ | — | ✓ | — |
| BV1QvrCBkEgE | S- | ok | ✓ | 37076 | — | ✓ | — | **缺失** | — |
| BV1SfXxBpExT | S- | ok | ✓ | 18999 | — | ✓ | — | **缺失** | — |
| BV1Va9yBmEaK | S- | ok | ✓ | 11073 | — | ✓ | — | **缺失** | — |
| BV1VczqBREQ8 | S- | ok | ✓ | 21998 | — | ✓ | — | **缺失** | — |
| BV1W39yBwEhp | S- | ok | ✓ | 7548 | — | ✓ | — | ✓ | — |
| BV1X1XdBCEqH | S- | ok | ✓ | 13989 | — | ✓ | — | **缺失** | — |
| BV1aTrKBTEAD | S- | ok | ✓ | 22219 | — | ✓ | — | **缺失** | — |
| BV1fqAHz7EG6 | S- | ok | ✓ | 20411 | — | ✓ | — | **缺失** | — |
| BV1jPQhBkEvz | S- | ok | ✓ | 21106 | — | ✓ | — | ✓ | — |
| BV1mDDzBEEWH | S- | ok | ✓ | 22380 | — | ✓ | — | ✓ | — |
| BV1mG6nBKECW | S- | ok | ✓ | 37058 | — | ✓ | — | **缺失** | — |
| BV1mncRznEd6 | S- | ok | ✓ | 5369 | — | ✓ | — | **缺失** | — |
| BV1mx93BkEPg | S- | ok | ✓ | 31366 | — | ✓ | — | **缺失** | — |
| BV1pYDiBPEQA | S- | ok | ✓ | 26068 | — | ✓ | — | **缺失** | — |
| BV1qEdaBdEYi | S- | ok | ✓ | 31989 | — | ✓ | — | **缺失** | — |
| BV1qhDtBYEMK | S- | ok | ✓ | 29752 | — | ✓ | — | **缺失** | — |
| BV1rdAVzAEdS | S- | ok | ✓ | 21090 | — | ✓ | — | **缺失** | — |
| BV1tSDtBnE2k | S- | ok | ✓ | 16942 | — | ✓ | — | **缺失** | — |
| BV1wwDbBGEsA | S- | ok | ✓ | 26121 | — | ✓ | — | **缺失** | — |
| BV1xXDjBUE8S | S- | ok | ✓ | 19616 | — | ✓ | — | **缺失** | — |

## Phase 1 待补 column（partial 且无 column）

- BV1NpAHzZEcc → `Agent架构与平台/Karpathy爆火项目-AutoResearch解读与启发.md`
- BV1kWctzeEYK → `Agent架构与平台/30分钟精通OpenClaw.md`
- BV1WnctziEac → `Agent架构与平台/OpenClaw创始人-我是如何使用OpenClaw的.md`
- BV174GU6AEZY → `Agent架构与平台/5次创业者-AI智能体独自经营初创公司.md`
- BV1eyBgB2EbX → `Agent架构与平台/Claude Code负责人-AI原生团队如何使用AI.md`
- BV1Mpf9B5Egk → `Agent架构与平台/Claude Code实战-构建一个AI数据分析师.md`
- BV19MzXBNESV → `Agent架构与平台/OpenAI官方-Codex新手教程.md`
- BV14nrMBKENb → `Agent架构与平台/OpenAI员工-上下文工程和Agent记忆.md`
- BV1PnQfBvEs3 → `Agent架构与平台/Agent实战-打造一个AI Agent的完整教程.md`
- BV12x1xB8E7b → `Agent架构与平台/Manus创始人-深度干货-上下文工程的最佳实践.md`
- BV1ixKX6oEzK → `Agent架构与平台/DeepMind团队-当数百万Agent相遇.md`
- BV1o4TL6sExw → `Agent架构与平台/Databricks-企业级Agent生产实践.md`
- BV1ZWTL64Erg → `Agent架构与平台/PlanetScale-Agent时代的基础设施.md`
- BV18bjG6fEi7 → `Agent架构与平台/WorkOS-创建和使用Skills方法论.md`
- BV1cVjN6oEwx → `Agent架构与平台/Loop-Agent Loop到底是什么.md`
- BV1EwK96AEyU → `AI评估与研究/OpenAI评估团队-不再低估模型.md`
- BV1UajG6oEvj → `行业观点与组织/a16z-AI并非泡沫.md`
- BV152jP6LEEA → ``
- BV19jTz6JELc → ``
- BV1CiTz6iEYZ → ``
- BV1EAK96aEVL → ``
- BV1gtTu6hEDD → ``
- BV1HGjN6tE6V → ``
- BV1MrTi6iEvh → ``
- BV1oHjN6nE6g → ``
- BV1opjN6SEnb → ``
- BV1rfKX6NEAY → ``
- BV1rLjN6xEc6 → ``
- BV1SWTz6yEBA → ``
- BV1vtTi6LEhx → ``
- BV1zEKX6aEiG → ``
- BV1ZpKX6fEuo → ``

## 已知 vault 与 ingest 冲突

- **A8 BV12qTu6WETP**：vault「Deep Dive Podcast」→ column **Marina Mogilko × Thibault Sottiaux**
