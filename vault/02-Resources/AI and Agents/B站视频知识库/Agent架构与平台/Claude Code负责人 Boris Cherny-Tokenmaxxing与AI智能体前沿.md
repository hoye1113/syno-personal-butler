---
title: "Claude Code负责人 Boris Cherny：Tokenmaxxing与AI智能体前沿"
tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "claude", "anthropic", "ai_career"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "claude_code", "claude", "anthropic", "ai_career"]
created: "2026-06-09"
source: "B站视频 - Easonlee的AI笔记"
description: "Boris Cherny × Alex Kantrowitz：Claude Code 指数增长、工具调用范式、Tokenmaxxing 与流程再造、Auto 模式双 Claude 审计、Seven Powers 下 switching cost 变薄、2028 自我改进拐点。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Claude Code负责人 Boris Cherny-Tokenmaxxing与AI智能体前沿.md"
source_sha256: "4421b37619f1209830f797809dfb107c076b475955b5ccfc3c49f82df074d009"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1NuGU6yE1b/"
speakers:
  - "Alex Kantrowitz（Big Technology Podcast 主持人）"
  - "Boris Cherny（Claude Code 负责人，Anthropic）"
duration: "57:08"
saved: 2026-07-02
spot_check: 2026-07-02
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1NuGU6yE1b/article.md"
asr_version: v2
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1NuGU6yE1b/ingest"
column_url: "https://www.bilibili.com/read/cv49801637/"
source_original_date: "2026-05-21"
host_name: "Alex Kantrowitz"
guest_name: "Boris Cherny"
guest_title: "Anthropic Claude Code 负责人"
speaker_inference: "column_article 明确标注 Host/Guest"
speaker_confidence: "high"
author:
  - "[[Alex Kantrowitz]]"
  - "[[Boris Cherny]]"
concepts:
  - id: tool_calling
    zh: 工具调用
    en: tool calling
    one_line: 智能体与聊天机器人的分水岭——能改文件、开浏览器、控电脑
  - id: token_maxing
    zh: 代币最大化
    en: token maxing
    one_line: 公司为刷 AI 用量 KPI 而跑无意义任务，Boris 认为非主因
  - id: auto_mode
    zh: 自动模式
    en: Auto Mode
    one_line: 第二个 Claude 实时审计第一个 Claude 的工具调用安全性
  - id: seven_powers
    zh: 七种力量
    en: 7 Powers
    one_line: 商业护城河框架；网络效应升值，转换成本贬值
column_source: "Recastory/workspace/bilibili-retranscribe/BV1NuGU6yE1b/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
updated: 2026-07-03
---
# Claude Code 负责人 Boris Cherny：增长曲线从未这么陡

> 对谈：Alex Kantrowitz × Boris Cherny（Anthropic Claude Code 负责人）| 来源：Big Technology Podcast / B 站 Easonlee 专栏 | 2026

---

## 开场：为什么现在聊这个

Anthropic 需求同比涨了约 **80 倍**，ARR 叙事从约 **40 亿美元**跳到约 **450 亿**；**Claude Code** 对很多人是第一次碰 Anthropic 的入口。Boris Cherny 带队的产品，**100% 由 Claude Code 自己写**——Cowork 也一样。

这期要压测四件事：增长是真需求还是刷量？**工具调用**为什么比聊天机器人狠一个量级？**自动模式**怎么解决「点允许点到烦」？软件 **护城河** 还剩什么？

**Alex：** 先抛个引子——Claude Code 负责人 Boris Cherny 就在对面。咱们聊增长、路线图，还有它到底能不能持续。

**Boris：** 好，开聊。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 智能体 | agent | 能多步执行、调工具、操控电脑的助手，不是纯聊天 |
| 工具调用 | tool calling | 智能体登录浏览器、改文件、连云服务的能力 |
| 代币最大化 | token maxing | 公司为刷 AI 用量 KPI 而跑无意义任务 |
| 自动模式 | Auto Mode | 第二个 Claude 替你对第一个 Claude 的工具调用做安全审计 |
| 努力程度 | Effort | Opus 4.7 的档位：超高/最大 vs 中等/低，控制 token 消耗 |
| 转换成本 | switching cost | 从 A 软件迁到 B 的摩擦；AI 代理正在把它打薄 |
| 网络效应 | network effect | 用户越多产品越值钱；消息 App 典型例子 |
| 七种力量 | 7 Powers | 经济学护城河框架，Boris 用来分析 SaaS 未来 |

---

## 01 250% 代码量，工具调用才是分水岭

**Alex：** Dario 说需求 **80 倍** YoY，去年 ARR 还高兴于 **40 亿**，现在可能是 **450 亿**。Claude Code 占了多少？你看到的增长到底是什么样？

**Boris：** 对很多人来说，Claude Code 就是第一次用 Anthropic。我们还没对外发布，内部数据就已经飙了——去年五月 Opus 3.5、Sonnet 3.5 出来，增长直接指数爆发。**我从没见过这么陡的曲线**，然后 3.6、3.7 一路迭代，势头没停。团队里不少人做过独角兽、高速增长产品，内部也都说：没见过这种。我们一边学怎么扩服务，一边想怎么让每个人都体验到这种速度——未来可能还要更陡。

产品和 API 都在加速。一年前 Anthropic 大部分用量走 API——咨询公司接银行，银行用来跑摘要那种。今天还是混合体，**产品角色比一年前大得多**，但哪个更大我不方便说。早期 Anthropic 还激烈争论「要不要做产品」——现在清楚了，产品不光占心智，还帮安全研究；我们人少，不可能什么都自己做，所以 **API + 产品双轨** 都得投。成千上万企业也在平台上自建。

**Alex：** 给没用过的人一句话——Claude Code 是什么？我写的是「用大白话搭网站和软件」，又怕写小了。

**Boris：** 这描述挺好。大家想到 AI 多半是聊天机器人；工程师一年半前也这样。后来模型写代码、用工具都行了，我们赌了一手：**全世界都在用花哨文本编辑器写代码，我们可以做完全不同的事**。Claude Code 和聊天机器人的区别就一条——**它能用你的工具**。就这一条。一年半前这是研究方向，突然有了商业价值，我们推 Claude Code 时像一场赌博——偏离了当时所有人写代码的方式。

**Alex：** 工具具体指什么？

**Boris：** 浏览器、Cloudflare、你电脑上的文件——一年半前没有 AI 产品能真改你桌面文件。Claude Code 第一件能做的事就是整理你桌面。Cowork 还能控整台电脑，你授权就行。**这个 tiny 差异，彻底改了大家怎么用、产品能帮你干什么**。聊天机器人你来回聊；智能体出去干活——连接你所有工具，利用浏览器、利用电脑。

**Alex：** 所以范式从「预测下一段代码」变成了「你 prompt，它出去干活」？工程师是第一波，非工程师是第二波？

**Boris：** 对。我刚用 Cowork 订了 **8 个航班、5 家酒店**——伦敦、东京 Code with Claude 活动，五站行程。我跟它说日期和城市，它查邮件、查日历，找出我漏的两站、记错的几个日期，然后订完。我回去写代码，一小时后全搞定。一家酒店区域不对，我让它改，完事。每次用 Cowork 和 Claude Code，我都有几个固定测试用例——换不同模型重跑，看哪版最好。Opus 3.7 + Cowork 是我得到过的最好结果。

**每月能力都会台阶式跳**——作为用户挺难跟。一年前模型只能写几行，今天完全两码事。跟一年前用过、之后再没碰的人聊，他们会说「哦，它不擅长编码」——因为一年前的模型就是那样。你让这些人试新模型，工程师越来越多发现是完全不同的体验。**这是我用过的第一种每个月能力都质变的技术**——你得保留**新手心态**，老任务反复用新模型试，下一版可能就完美解决。以前用软件，你被界面框住；现在有个智能体，能按你想要的方式塑造在线体验——大家抓住的就是这个。

> **金句 · Boris**
> **中文：** 我从未见过如此陡峭的增长，而且还在指数往上走。
> **原文：** I've never seen growth this steep, and it's still growing exponentially.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 工具调用 | tool calling | 智能体连浏览器、改文件、登录云服务——和 chatbot 的分水岭 |
| 范式转移 | paradigm shift | 从预测文本到执行动作 |
| 指数增长 | exponential growth | 内部未外发已爆；Opus 迭代反复 inflect |
| 双轨战略 | product + API | Anthropic 既做产品占入口，也做平台让企业自建 |
| 新手心态 | beginner mindset | 模型每月变强，旧任务值得用新模型重试 |

**本章小结**

- Claude Code 增长是真曲线，不是单一客户刷出来的；对很多人是 Anthropic 第一入口
- 核心差异不是更聪明的 autocomplete，而是**工具调用**——能改文件、控浏览器、跑 Cowork
- 用户要跟得上模型迭代：每月能力台阶式变，老任务值得重试

---

## 02 刷 token 不是主因，重组流程才是

**Alex：** 咱们现实一点。硅谷流行 **token maxing**——公司规定员工尽量多烧 token，排行榜奖励用量最多的人。Amazon 被曝 **80% 以上开发者每周必须用 AI**，有人每天跑几小时自动化任务再删掉，只为刷分。这占 Claude Code 需求多大一块？你凭什么说不重要？

**Boris：** 我不觉得 token maxing 占大头。加入 Anthropic 前我在 Facebook，Meta 也在搞这套——我管 Facebook、Instagram、WhatsApp 的代码健康。模型出来之前，你要花一整年才能把每个工程师生产力提高 **1% 到 3%**，那已经很难得了。你基本上得试很多想法，最后才碰上一个能涨 1% 的点。

Claude 来了以后，我们内部自引入 Claude Code 起，**每个工程师代码量涨了约 250%**——质量、可靠性、所有那些指标没退步。很多大客户也报几百个百分点的增长。大家还在摸：怎么复制这种效果？很多公司看到了，有些还在摸索。

我的建议几乎每次都一样：第一，**给每个人 token 去试**，别每个 token 都申请批准——我不推荐 token maxing，但推荐大胆试。第二，给**心理安全感**——创新会改工作量，很多想法会失败，得允许实验，找到新流程。第三，**别提前优化**——等出现可扩展的用例再谈效率。你没法提前知道谁是那个搞出突破的人。

**Alex：** 那 Amazon 那种刷分呢？

**Boris：** 我不清楚有多少公司在干这个，听说成了趋势。但 Claude Code 客户面很广，不是某一家在撑用量。我想退一步：这些公司要的可能是**组织变革**——怎么从 AI 里受益，每家公司答案不同，取决于业务、文化、组织方式。

90 年代有篇 HBR 文章，大意《电脑来了，为何没看到生产力》——当时 PC 普及，公司买了电脑，生产力却没涨。文章说：你得**围绕电脑重组整个业务流程**，电脑放核心，扔掉文件柜、纸笔流程，才受益；电脑放边缘、文件柜还在，就不受益。公司分两类：有的在痛苦变革里受益，有的没有。现在 AI 也一样——很多公司在大量实验，每人试不同方法。**没有唯一正确答案**。如果以竞争方式做 token maxing 对某家公司文化有效，fine；如果像 Anthropic 一样给工程师安全空间去实验，也 fine——取决于公司。

**Alex：** 那模型效率呢？我用 Cowork 做 PPT，说「导出 PDF」，它循环调工具、出不来，最后道歉说陷进死胡同——增长里有没有这种「烧 token 没干成事」？

**Boris：** 模型看三样：智能、速度、效率。我们**先优化智能**，再优化效率——稍低效但更聪明、能干更多事，就有用。效率优化是之后的事——先让它更聪明，再让它更高效。我们也在实验怎么让你精确控制，因为我们不总知道正确默认值——有时你比我们更清楚需求。

你可以选 Opus / Sonnet / Haiku，还有 **Effort 档位**：Opus 4.7 要最大智能用「超高」或「最大」，想省 token 选「中等」或「低」。Opus 最大，Sonnet 中等，Haiku 最小——那是模型大小；Effort 是你想投多少力气。

有人评论说 PDF 这种问题 LLM 天生修不了，循环是固有特征——**我不认同**。一年半前 Claude Code 也会循环、代码很烂、构建出来跑不了；快进到今天，**Claude Code 100% 由 Claude Code 写**，Cowork 也是，Anthropic 产品里越来越多功能完全由 Claude Code 写。昨天 YC 演讲，几百人里约**一半举手**说代码 100% AI 写；只有**一个人**举手说 0% AI 写——在几百人面前，向那个人致敬。其他人大多在中间：大部分 AI 写，不是全部。Cowork 还在早期，几个月前才发，会跟 Claude Code 一样迭代变好——**今天所有用 AI 的人都是早期采用者**，世界上大多数人还没真正试过 AI。

> **金句 · Boris**
> **中文：** 要从计算机里受益，得扔掉文件柜，让电脑成为业务流程的核心——AI 今天也一样。
> **原文：** To benefit from computers, you had to reorganize business processes around them — throw out the filing cabinets. It's the same with AI now.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代币最大化 | token maxing | 为 KPI 刷 AI 用量；Boris 认为非 Claude Code 需求主因 |
| 流程再造 | business process reorganization | 90 年代 PC 教训：技术放核心才涨生产力 |
| 心理安全感 | psychological safety | 允许实验失败，创新常来自意想不到的人 |
| 先智能后效率 | intelligence before efficiency | 模型优化顺序：能干更多事优先于少烧 token |
| 努力程度 | Effort | 用户可控的 token/推理深度档位 |

**本章小结**

- Token maxing 是组织学习期的噪声，不是 Anthropic 增长叙事的主因；客户面很广
- 250% 代码量来自真生产力，不是刷榜；创新常来自会计、市场、新 grad 等「想不到的人」
- 效率担忧合理但会迭代；组织层面要学 90 年代 PC：**重组流程**比加 token 预算重要

---

## 03 先智能后效率，第二个 Claude 替你点「允许」

**Alex：** 速率限制是最大槽点——有人用完配额等 4 小时就走。对 Claude Code 发展伤害多大？你怎么解？

**Boris：** 我们在积极搞。现实是：**真正触顶的是极少数人**，挺意外。Max 用户里比例也低。几件事在发生——我们曾降过峰值限制，现已恢复并**翻倍**；还宣布加 weekly cap、上 **Colossus** 容量，增长超出我们最疯的预测。Claude Code 可扩展性强，有些**插件**很费 token，我们现在展示每个插件占多少百分比，让你自己决定开不开。

**Alex：** 你说极少数——你自己呢？

**Boris：** 我电脑上可能同时跑 **5 个** Claude，大多数晚上**数百个**并行，有时**数千个**——一年前不可想象。这接近 Max 计划极限，所以 power user 可以走 **API 按量付费**，很多企业这么选。很多人已经成了高级用户——刚发布时你可能一次只跑一个，现在并行是常态。

**Alex：** 竞争呢？OpenAI Codex 也在做同样的事，他们数据中心砸得更狠。Rate limit 会不会把用户推给 Codex？

**Boris：** Claude Code 增长还在加速；大多数人并不常触顶，对触顶的人来说也不是过不去的坎。我们把五小时限制翻倍了，今天还加 weekly 限制。Codex 有模仿者正常，**竞争逼大家做得更好**——我最关心的是团队每天跟用户聊、产品每天进步一点。Dario 谈过控制开支，但对我们最重要的是服务好用户，确保用户非常满意。

**Alex：** 聊路线图。Cowork 能订航班、做营销材料、接 QuickBooks 记账——Coding 之外往哪走？

**Boris：** 几个大方向。一是模型更聪明——编码从写一行到构建整个功能或产品；Cowork 从做文档到订航班、接 QuickBooks，前沿跑得很快。二是**更长任务**——我们上了 **Auto 模式**，替代一个个点「允许」。以前每个工具调用都问你，人疲劳了就机械点「总是允许」，反而不安全——你其实应该对每个提示深思熟虑，但对话太多，人疲惫后只会点 yes。

Auto 模式的做法：**一个 Claude 要用工具，问另一个 Claude「这安全吗？」** 第二个 Claude 有部分上下文，还有多层安全检查。我们花了几个月、跑了几千条 eval——实验室和实际都比人工点 yes **更安全**。任务里藏了危险命令，人可能误点，第二个 Claude 不会批。对用户是巨大好处——不用坐那儿一遍遍点 yes，结果还更好。

第三是**更多并行 Claude**。Claude Code 用户很少只跑一个——Cowork 也开始这样：启动一个任务，再启动第二个，并行处理。Chatbot 未来也更 proactive：聊印度行程，直接提议帮你订票，不需要中间步骤。

我有个朋友非工程师，学 Cowork。电脑语言输入选项出问题，以前她会 Google；这次直接问 Cowork，它说「我能用你的电脑吗？」——屏幕橙光，打开设置，诊断修复，她坐在驾驶座看着全过程。跟 Waymo 一样：前几次转弯手心出汗，五分钟后 AI 干活你已经在刷手机了。Claude 浏览器扩展也是——只有让它接管浏览器，才得到最大好处。

**Alex：** 你说你不写代码，只 prompt Claude——现在甚至是一个 Claude prompt 其他 Claude？

**Boris：** 对，**我甚至不直接跟 Claude 说话，我有一个 Claude 在跟我的 Claude 说话**。工程领域个人杠杆已经爆炸——一个工程师能撑多大业务、多少产品，在 Anthropic 简直疯狂。营销人员开始用 Claude，前线部署工程师用 Claude Code 构建实现，销售团队也是——市场团队一半 Claude Code、一半 Cowork。杠杆大了，**优秀人才仍是瓶颈**——需求太疯，东西太多要建，你雇不到足够多好人。

**Alex：** 那为何还招 Salesforce 管理员、前线部署工程师？Ethan Mollick 说，只要还需要人搞组织变革和系统集成，人类工作就安全。

**Boris：** 已经有人用 Claude **报税**了——我不特别推荐，但我报了，跟会计师对比，非常接近。关键点是：**总得有人跟 Claude 说去做什么**。就算 Salesforce 是 Claude 在配，「要求 Claude 做事」本身可能就是全职——多种配置方式，「下指令」就是一份工作。某个时点 Claude 会很擅长让另一个 Claude 干活，链会越来越深——Claude 让 Claude 让 Claude——但**最终还要有人驾驶**。问对一个问题，杠杆有多大——想象一下就知道了。

> **金句 · Boris**
> **中文：** 我甚至不直接跟 Claude 说话——我有一个 Claude 在跟我的其他 Claude 交流。
> **原文：** I don't even talk to Claude directly — I have a Claude talking to my other Claudes.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自动模式 | Auto Mode | 第二个 Claude 审计第一个的工具调用；比人疲劳点「允许」更安全 |
| 并行智能体 | parallel agents | 同时跑多个 Claude，从几个到数百、数千 |
| 速率限制 | rate limit | 触顶主要是 power user；已翻倍 + weekly cap + Colossus |
| 个人杠杆 | individual leverage | 一人 via Claude 支撑更大业务；人才仍是瓶颈 |
| 主动式助手 | proactive assistant | Chatbot 从问答走向「我来帮你订」 |

**本章小结**

- Rate limit 是 power user 边缘问题，解法：翻倍限制、weekly cap、Colossus、API 按量、透明插件 token 占比
- Auto 模式是「AI 监督 AI」，不是无脑全开权限——安全 subagent 架构
- 人不写代码了，但「提问、编排、验结果」仍是全职；链可以很深，驾驶座还得有人

---

## 04 网络效应升值，2028 或进自我强化循环

**Alex：** 聊聊 SaaS 末日。自动化编程普及后，哪些软件公司安全、哪些麻烦？你说 switching cost 会变薄——展开讲讲。

**Boris：** 有个框架叫 **七种力量（7 Powers）**，谈商业护城河——类似的框架很多，这是我最喜欢的。我学的是经济学不是计算机，习惯用这些框架想问题。规模经济、**网络效应**、**转换成本**、处理能力等等。大多数仍重要，但相对权重会变——**网络效应会更值钱**：不管代码谁写、核心是 agent 还是别的，用户网络本身就有价值。

**转换成本**会弱化——从供应商 A 切 B，让 Claude 帮你做，而且会越来越顺。消息 App 就是例子：我今天用 Claude Code 几小时能搭个很棒的 App，**但它没用**，因为朋友不在上面——我得用朋友都在的那个。代码不重要，**关系网**重要。Signal 用特定协议通信——你可以建个用相同协议的应用，但没法直接给 Signal 用户发消息；你可以有个 agent 调用现有 App 来完成消息传递。未来演变路径还不清楚，今天人们混合用 App 和 agent。

台积电那种**规模经济**也还在——制造业里很多公司优化流程、随规模扩大成本降低；科技公司的基础设施也一样。你建了很好的 infra，支持更多用户、边际成本随时间下降——不管你我能不能写 App，这条护城河都硬。大公司往往有多重护城河，不是单靠一条；达到规模、建立可防御业务，就是不断积累这些护城河。我会想：一年后什么更值钱，什么贬值。

**Alex：** Jack Clark 说 **2028 年**模型有 **60% 可能**开始自我改进。Claude Code 已经 100% 自己写自己——你同意吗？这是不是快起飞了？

**Boris：** 看起来对。自 **2025 年 11 月 Opus 4.5** 起，Claude Code 100% 由 Claude Code 写。Anthropic 存在就是为了 **AI 安全**——自我改进是可能结果之一，得确保进展顺利，为后代做对的事。现在还不是完全形态：仍是人 prompt，Claude 开始给 Claude Code **提功能 idea**，但质量参差，大部分 idea 还是我出。某个时点情况会变，随着模型改进，会变成**自我强化循环**——这就是 Anthropic 存在的原因，每个加入的工程师和研究员都会告诉你这一点。

**Alex：** Yann LeCun 说没有**世界模型**就建不了可靠 agent——LLM 不懂后果。Greg Brockman 不同意，认为文本模型就是通向 AGI 的路。你站哪边？

**Boris：** 我站产品这边，没有定论。Anthropic 研究显示，只预测下一个 token 的模型**实际上会规划、会推理**——有很多令人惊讶的行为，你不会期望一个只预测下一个 token 的模型能做到。写诗时第一行就在想下一行——我写诗也这样。你订八程航班、把信用卡给它，说明你愿意赌它懂后果。我邀请 Yann 来用一小时 Claude Code——也许他会改主意，也许不会，我很想听他的想法。

**Alex：** 最后一问：会不会只是开发者狂欢？普通用户想要简单按钮，不想对着终端说话。

**Boris：** Opus 4.7 黑客马拉松，**获奖者是医生**——还有电工、木匠，很多人零编程经验，用 Claude Code 搭出有用的东西，有人还卖了初创。Cowork 出来之前，非工程师就在终端里装 Claude Code——**第一次开终端**，很多人人生第一次。现在有了桌面、iOS、Slack，互动方式很多。人们愿意克服障碍，因为**太好用了**——对我这个产品经理，终极市场考验就是：有没有很多人**每天用、持续用**？有，而且还在涨。用法每次都让我惊讶。刚接触的人常做我想都没想过的事——非常有创意，每次都能学到。伴随产品成长、见过早期版本的人，有时反而不如新人有雄心。

> **金句 · Boris（封底）**
> **中文：** 问对一个问题，能带来多大的杠杆——这才是人剩下的工作。
> **原文：** Imagine how much leverage asking the right question gives you — that's what remains for humans.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 七种力量 | 7 Powers | 护城河框架；网络效应 up，switching cost down |
| 自我改进 | self-improvement | Jack Clark 2028 60% 可能；Claude Code 已 100% 自写 |
| 世界模型 | world model | LeCun 论点：需理解后果；Boris 偏产品实证 |
| 自我强化循环 | self-reinforcing loop | 模型提 idea → 写代码 → 更强模型，人仍 prompt |
| 终极市场考验 | ultimate market test | 很多人每天用、持续用，且愿意克服使用障碍 |

**本章小结**

- Moat 重组：网络效应和规模经济更硬，转换成本被 AI 迁移打薄
- 2028 自我改进趋势 Boris 认同，但今天仍是「人 prompt + AI 写」；安全是 Anthropic 存在理由
- 非工程师已在用：医生、木匠黑客马拉松获奖——产品有用，人就会跳 hoops

---

## 总结：真需求在工具，瓶颈在 infra，人在驾驶座

| 维度 | 要点 |
|------|------|
| 增长 | 80x YoY 需求、250% 内部代码量；Claude Code 是许多人第一入口，曲线团队没见过 |
| Token 政治 | Token maxing 是组织噪声；90 年代 PC 教训——**流程再造**比刷榜重要 |
| 产品形态 | 工具调用是分水岭；Cowork 订 8 航班；Auto 模式 = 双 Claude 安全审计 |
| Infra | Rate limit 边缘 power user 问题；翻倍 + Colossus + API；并行数百～数千 Claude |
| Moat | 7 Powers：网络效应升值，switching cost 贬值；代码可复制，关系网和基础设施不行 |
| 未来 | 2028 或进自我强化循环；人角色变「问对问题」；非工程师已在建经济价值 |

### 对个人的启示

- 保留**新手心态**：每月用新模型重试一年前失败的任务
- Power user 走 **API**；审计插件 token 占比，别 unknowingly 烧配额
- 杠杆在个人：一个 Claude prompt 其他 Claude——但「问什么」仍是你的活

### 对团队/产品的启示

- 给 token **sandbox + 心理安全**，别先 leaderboard；等用例出现再优化
- **Auto 模式**上线前跑自己的 tool 风险 eval，别假设比人点 yes 更松
- SaaS 战略：投资**网络/数据 moat**，别赌 UI 锁定

### 仍待验证

- Token maxing 在各公司占比无精确数据 [待核实]
- Jack Clark **2028 / 60%** 为概率判断，非 Boris 本人预测

> **金句 · Boris（封底）**
> **中文：** Claude Code 百分之百由 Claude Code 编写——Cowork 也是。这不是演示，是日常。
> **原文：** Claude Code is 100% written by Claude Code — Cowork too. That's not a demo, that's daily life.

---

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 09:45 | 生产力提升已从百分比跨越到倍数级 |
| 12:30 | AI 代理的本质区别在于工具调用能力 |
| 18:15 | 警惕代币最大化陷阱，重组业务流程才是核心 |
| 35:20 | 自动模式是解决 AI 安全与疲劳的关键 |
| 42:10 | 软件行业的护城河正在从转换成本转向网络效应 |
| 48:30 | 2028 年或是 AI 自我改进的转折点 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1NuGU6yE1b/ingest`
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV1NuGU6yE1b/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv49801637/
- **B 站**：https://www.bilibili.com/video/BV1NuGU6yE1b/
- **时长**：57:08

### 相关阅读

- [[Claude Code负责人-AI原生团队如何使用AI]] — Anthropic 内部 Dogfooding 工作流  
- [[Codex负责人-现场演示Codex]] — OpenAI 侧竞品与 knowledge work  
- [[DeepMind-模型将吞噬Harness]] — harness 会被模型吞吗  
- [[a16z-AI并非泡沫]] — 需求与 infra 宏观叙事  
- [[MOC - Agent Theory and Design]] — Agent 理论横切索引  

---

### 收录说明

- **视频**：[BV1NuGU6yE1b](https://www.bilibili.com/video/BV1NuGU6yE1b/)（B 站 *Easonlee的AI笔记*）  
- **讲者**：Boris Cherny、Alex Kantrowitz（Big Technology Podcast）  
- **时长**：~57:08  
- **转写**：Recastory `bilibili-retranscribe/BV1NuGU6yE1b/`（FunASR SenseVoice + cam++，**asr v2 后处理** 58 段）  
- **版本**：canonical Host-Guest v3.2（2026-07-03；原讲义已合并）

