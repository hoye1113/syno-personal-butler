---
title: "Brex CEO用AI代理运营公司，虚拟员工吉姆能识别假简历"
tags: ["ai_agent", "ai_coding", "article", "bilibili", "harness_engineering", "ai_career"]
legacy_tags: ["ai_agent", "ai_coding", "article", "bilibili", "harness_engineering", "ai_career"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1dg5t6gEJ8/"
description: "Brex CEO Pedro Franceschi分享如何用AI Agent重构CEO工作流，以及AI时代公司竞争的终点是精神而非技术"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Brex CEO-打造首位全职AI CEO.md"
source_sha256: "7c64f97134fab83c34d6aa2d372bbf942ec3471861dd8e270aaab42ce57e8068"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1dg5t6gEJ8/"
column_url: "https://www.bilibili.com/read/cv47822198/"
column_source: "https://www.bilibili.com/read/cv47822198/"
ingest_dir: "D:/workSpace/git_clone_test/hoye-git/Recastory/workspace/bilibili-retranscribe/BV1dg5t6gEJ8/ingest"
duration: 60min
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: vskill-vault-write canonical-dialogue v3.2
dialogue_version: v3.2
genre: podcast
host_name: "Ashlee Vance"
guest_name: "Pedro Franceschi"
guest_title: "Brex联合创始人兼CEO"
speaker_inference: "column_article_qa_structure"
speaker_confidence: high
author:
  - "[[Easonlee的AI笔记]]"
concepts:
  - id: ai_virtual_employee
    zh: AI虚拟员工
    en: AI virtual employee
    one_line: 在Slack和邮件中拥有真实身份的AI代理，能自主执行招聘等任务
  - id: crabtrap
    zh: Crabtrap安全架构
    en: Crabtrap architecture
    one_line: 用一个LLM监控另一个LLM的行为，在网络层拦截不合规请求
  - id: signal_ingestion
    zh: 信号摄取
    en: signal ingestion
    one_line: 从Slack、邮件等数千个数据源中筛选CEO需要关注的信息
  - id: programming_purity
    zh: 编程纯粹性
    en: programming purity
    one_line: 不为金钱、只为对手艺的热爱，是创造力最纯粹的形式
  - id: spirit_over_tech
    zh: 精神高于技术
    en: spirit over technology
    one_line: AI时代公司差异化源于判断力和精神，技术将成为标配
---

# Brex CEO用AI代理运营公司，虚拟员工吉姆能识别假简历

> 对谈：Ashlee Vance × Pedro Franceschi（Brex联合创始人兼CEO）| 来源：Core Memory Podcast | 2026

---

## 术语速查（后文对话用中文；英文原文在此统一对照解读）

| 中文 | 英文 | 白话 |
|------|------|------|
| AI虚拟员工 | AI virtual employee | 在Slack和邮件中有真实身份的AI代理 |
| Crabtrap | Crabtrap architecture | 用一个LLM监控另一个LLM的安全架构 |
| 信号摄取 | signal ingestion | 从海量数据源中筛选关键信息 |
| 自动解决器 | auto-solver | 根据会议上下文自动执行任务的工具 |
| 垂直整合 | vertical integration | 控制从底层到应用的整个技术栈 |
| 程序（自动化语境） | program | CEO关心的项目或领域，如财务、AI战略 |
| 模型上下文协议 | MCP (Model Context Protocol) | 让AI代理访问外部服务的标准协议 |
| 建造者精神 | builder spirit | 无功利目的、纯粹出于热爱的创造冲动 |

---

## 开场：为什么现在聊这个

Pedro Franceschi 的人生像一部快进的创业电影。8岁自学编程，12岁破解iPhone，14岁赚了30万美元。从巴西到斯坦福，从Pagar.me到Brex，再到被Capital One以51亿美元收购。

但最炸裂的部分是他怎么当CEO——用AI代理自动化自己的全部工作流。他有一个叫"吉姆"的虚拟招聘人员，在Slack里有真实身份，能判断简历是不是伪造的。他用OpenClaw构建了一整套CEO自动驾驶系统：信号摄取、自动解决、技能构建。他说这是在"解构CEO的工作"。

更深层的是他对AI时代竞争的理解：当技术成为标配，公司差异化靠的是"精神"——那些在无利害关系时依然热爱创造的人。

---

## 01 12岁破解iPhone，编程的纯粹热爱是创造力最纯粹的形式

**Ashlee：** 你8岁自学编程，12岁破解iPhone，14岁赚了30万。很多小孩都编程，你为什么能在那个年纪脱颖而出？

**Pedro：** 我想这可以用保罗·格雷厄姆关于"天才的公交车票"理论来解释，即那种对看似无趣的事物的执着。当你一生中不断积累这种执着，你会到达一个非常有趣的地方。

对我来说，我只是对"让电脑做它们原本不该做的事"有着强烈的好奇心。我最大的优势是开始得非常早。当你12或14岁时，创造力是最纯粹的。因为除了对这件事本身的热爱，没有其他杂念。我不需要赚钱，我当时对这门手艺本身非常感兴趣，重点始终在于：当你有一个想法时，如何将它变为现实？

12岁左右，iPhone只能与AT&T合作，想在国外使用就必须越狱。我最终找到了越狱iPhone 3G的方法，那是2009年最早的越狱方案之一。我在iPhone越狱社区里小有名气，就这样开始了职业生涯。

14岁时，我逆向工程了Siri让它支持葡萄牙语，苹果公司非常不满意。第二件事是我为iPad开发了一款名为Quasar的应用，让你能在iPad上运行窗口化应用。那是2012年，我把这款应用放在Cydia上，每次下载收费10美元。我14岁的时候就赚了30万美元。我不得不向妈妈解释这笔钱的来源，她一度以为我在网上做非法勾当。

我8岁时失去了父亲，他是个"大书呆子"，过去常花很多时间摆弄电脑。你如何将自己置于一个可以控制所有变量的地方？因为外部世界是不可控的，但代码世界可以。我想这之间是有联系的。

我告诉我的团队，现在有了人工智能，作为一家拥有1300名员工的公司负责人，我反而比以前更亲力亲为。这让我回到了最初那种纯粹的能量。好奇心、精力和时间都来自一个极具创造性的地方，而不是传统意义上的"工作"。

> **金句 · Pedro**
> **中文：** 外部世界不可控，但代码世界可以。你如何将自己置于一个可以控制所有变量的地方？
> **原文：** The external world is uncontrollable, but the world of code is controllable. How do you put yourself in a place where you can control all the variables?

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 编程纯粹性 | programming purity | 不为金钱、只为对手艺的热爱 |
| 建造者精神 | builder spirit | 无功利目的、纯粹出于热爱的创造冲动 |
| 垂直控制 | vertical control | 控制从底层到应用的整个技术栈 |
| 天才的公交车票 | bus ticket to genius | 对看似无趣事物的持续执着，最终通向非凡 |

**本章小结**
- 12岁破解iPhone不是天赋，是对"让电脑做不该做的事"的纯粹好奇
- 外部世界不可控，代码世界可以——这种控制感是建造者精神的根源
- AI让CEO比以前更亲力亲为，因为自动化释放了回归纯粹创造的能量

---

## 02 垂直整合整个支付堆栈，才是Brex成功的关键原因

**Ashlee：** 你们从巴西的Pagar.me到美国的Brex，为什么选择深耕支付这个古老又无聊的领域？

**Pedro：** 我进入这个领域的方式比较奇特。我当时去了一家开发类似Square移动支付产品的巴西公司，很快就意识到支付系统有多么老旧和过时。2012年底我遇到了联合创始人Enrique，他当时想在线接受支付，但那是一件极具挑战性的事。

从一开始，对我们来说非常重要的一点就是"从底层向上构建"。作为工程师，我有一个近乎宗教般的观点：除非你控制整个堆栈，一直延伸到底层，否则你永远无法从根本上改善客户体验。就像史蒂夫·乔布斯说的，如果你关心软件，就应该自己制造硬件，垂直控制一切。

美国金融系统有一个有趣的悖论：与巴西等拥有实时结算系统的国家相比，美国金融系统因过于稳定和分散而导致技术滞后。巴西在90年代有恶性通货膨胀，每月30%，所以必须快速清算——两天内不清算就损失5%到7%的货币价值。因此巴西对支付系统进行了非常深入的投资。而美国因为货币稳定了几百年，支付系统反而没有那么发达。

Brex的最初洞察是：美国93%的餐馆不提供外卖——这个比例显然应该高于7%。同样，所有初创公司都需要一张公司卡，但他们去银行会被拒绝，因为没有收入历史。银行说"你们没有收入历史"，创业者说"是的，这就是我创业的原因"。Brex根据现金流为公司提供承保，打造了一个更好的"美国运通"。

我认为这是我们取得成功的关键原因——我们能够真正创新，并吸引大型企业和人工智能公司，因为我们垂直整合了整个产品。

> **金句 · Pedro**
> **中文：** 除非你控制整个堆栈，一直延伸到底层，否则你永远无法从根本上改善客户体验。
> **原文：** Unless you control the entire stack, all the way down, you can never fundamentally improve the customer experience.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 垂直整合 | vertical integration | 控制从底层到应用的整个技术栈 |
| 现金流承保 | cash flow underwriting | 根据公司现金流而非信用记录授信 |
| 支付堆栈 | payment stack | 从发卡到清算的完整支付技术链 |
| 金融基建滞后 | financial infra lag | 美国支付系统因稳定和分散反而落后于发展中国家 |

**本章小结**
- 美国金融系统因"太稳定"反而技术滞后，这催生了金融科技的机会窗口
- 垂直整合整个支付堆栈是Brex成功的关键——只有控制底层才能根本改善体验
- 97%的美国公司卡市场仍被传统银行占据，技术颠覆才刚开始

---

## 03 艰难决定通往轻松生活，主动挤泡沫比被动破裂好一百倍

**Ashlee：** Brex估值从123亿跌到以51.5亿出售。你怎么看待这个落差？

**Pedro：** 这有两方面。首先，我们在2023年意识到，公司所处的位置与过去截然不同。我们决定积极扭转局面。在23年底、24年初，我们做了一件当时在外部非常不受欢迎的事——对内部估值进行了大幅下调。

我们曾以120亿美元的估值融资，这是事实。但问题变成了：你如何为员工创造足够的上升空间，让50亿美元的成果也成为一场胜利？我们去了董事会，以一个非常不同的价格重新评估了所有员工的股权。那些以120亿美元投资的投资者，当然拿回了优先股。所以最终对每个人来说都是一个非常好的结果。

我常说："艰难的决定，轻松的生活；轻松的决定，艰难的生活。"那个艰难的决定是：我们裁掉了近30%的员工，重新定价了股权，改变了许多运营方式。我们提拔了许多内部员工，裁掉了两层管理人员。

关键在于，在三年前最艰难的时刻，我们审视了自己。不管你喜不喜欢，公开市场的价格是唯一重要的价格信号。如果是一家上市公司，你今天会如何看待它？无论多么痛苦，我们都要立足于这个现实，因为2021年的童话故事就只是童话而已。

我们现在的增速甚至比一月份签署协议时还要快。最好的思考方式是，我们在两三年前做出了许多深思熟虑的决定，这使得员工获得了胜利，因为我们决定面对现实。

> **金句 · Pedro**
> **中文：** 艰难的决定，轻松的生活；轻松的决定，艰难的生活。
> **原文：** Hard decisions, easy life. Easy decisions, hard life.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 内部估值下调 | internal valuation reset | 主动调低员工股权价格，留出上升空间 |
| 公开市场价格信号 | public market price signal | 上市公司真实估值，唯一重要的定价锚 |
| 挤泡沫 | deflating the bubble | 主动去除估值中的水分 |
| 人才密度提升 | talent density upgrade | 裁员+内部提拔，提升单位面积的人才浓度 |

**本章小结**
- 主动下调内部估值让50亿也变成胜利，而不是让员工觉得"输了"
- 2021年的估值是童话，公开市场的真实价格才是唯一锚点
- 艰难决定（裁员30%、重新定价股权）换来的是两三年后的增速反弹

---

## 04 用AI代理解构CEO工作，信号摄取+自动解决=自动驾驶

**Ashlee：** 你说你在用AI代理运营整个公司。具体是怎么做到的？

**Pedro：** 过去三个月我迷上了OpenClaw，它自动化了我整个生活。我们在Brex内部部署了一套CEO自动驾驶系统，从信号摄取管道开始。

我面对的是数千个Slack频道和成千上万的人，每天收到数百封电子邮件。问题在于：什么重要，什么值得关注？我围绕两个概念构建了生活自动化：人和程序。"程序"就像是我希望得到更新的项目，比如公司的财务业绩、Capital One整合、内部AI战略。"人"是我声明了公司里大约25个我真正关心的人。

信号摄取会以这些人的视角进行过滤，去规范化信号并处理，最后生成一个非常清晰的摘要，包含我应该关心的所有事情和行动项目。还有一部分是"自动解决器"——比如我结束了客户对话，需要更新交易团队，或者会议后需要发介绍信。系统会根据会议上下文自动起草短信、Slack或邮件。我所要做的就是点击一个按钮。

我还构建了特定技能，比如"以Pedro的身份审查文档"。我在审查产品或演示文稿时总会问那三五个问题，比如"瓶颈是什么"、"为什么不行动得更快"。我把这些变成技能构建到管道中。它就像你可以组合在一起的逻辑模块，用来完成复杂的任务。

我有一个虚拟招聘人员叫吉姆。吉姆是一个Slack实体，有自己的电子邮件，并与内部招聘人员互动交谈。整个挑战是：如何在不编写一行代码的情况下构建吉姆？一位招聘人员问吉姆，"你能看看这个人的申请吗？我感觉这份简历是伪造的。"然后代理查看了简历，并实际构建了筛选简历并判断其是否伪造的能力。这种能力从未被任何人编码过。

> **金句 · Pedro**
> **中文：** 解锁的最有趣的特性是模型自我引导的能力。从未被编码过的能力，它自己学会了。
> **原文：** The most interesting capability unlocked is the model's ability to self-direct. Capabilities that were never coded, it learned on its own.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 信号摄取 | signal ingestion | 从海量数据源中筛选CEO需要关注的信息 |
| 自动解决器 | auto-solver | 根据会议上下文自动执行后续任务 |
| 技能构建 | skill building | 把CEO的习惯性问题变成可复用的AI模块 |
| 虚拟招聘人员 | virtual recruiter | 在Slack中有真实身份的AI招聘代理 |

**本章小结**
- CEO工作可以拆解为：信号摄取→判断优先级→建立摘要→确定任务→推动执行→监控
- 吉姆不需要人类编码就能学会筛选假简历——模型自我引导是最大的能力飞跃
- 把CEO的习惯性问题变成技能模块，组合起来就是完整的CEO工作流

---

## 05 AI时代公司竞争的终点是精神，不是技术

**Ashlee：** 当AI能提供统一的高水平技术输出时，公司靠什么差异化？

**Pedro：** 我认为AI时代公司竞争的终点是精神而非技术。当技术成为标配，差异化将源于"判断力"和"精神"。

我们真正看重的一个因素是：那些在生命中除了对技艺的热爱之外，没有任何其他理由去做某事的人是谁？比如那些在高中时没有任何功利目的就开始编程的人，你可以从他们建造的东西中看出他们与技艺的关系。或者一个从事金融工作的人，出于纯粹的驱动力，深入研究AI并构建了庞大的系统来自动化自己的工作。

这是我们非常关心的。我们想教我们的招聘代理去识别这种精神，但这只是我们的标准，未必适用于所有公司。理解你所关心的"精神"并将其与技术卓越区分开来，是非常重要的，因为技术卓越未来会成为标配。

当你必须告诉招聘人员，"这个人需要在哪些方面表现出色？你如何为此招聘？"而不是追求那种缺乏弱点的平庸完美——这是模型容易泛化的地方——这才是真正困难的问题。在哪里突出、在哪里与众不同至关重要。

这就是你想建立什么样的公司所体现的判断力，这是一个内在的人类决定。把所有与精神无关的重复性工作交给模型，剩下的就是更难、更需要判断力的问题。这才是人们应该花更多时间的地方。

> **金句 · Pedro**
> **中文：** 技术卓越未来会成为标配。公司差异化的终点是精神——那些在无利害关系时依然热爱创造的人。
> **原文：** Technical excellence will become table stakes. The endgame of company differentiation is spirit—people who love to create even when there's nothing in it for them.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 精神高于技术 | spirit over technology | AI时代差异化源于内在驱动力而非技术能力 |
| 建造者精神 | builder spirit | 无功利目的、纯粹出于热爱的创造冲动 |
| 判断力 | judgment | 在哪里突出、在哪里与众不同的决策能力 |
| 平庸完美 | mediocre perfection | 没有弱点但也没有突出点的标准化人才 |

**本章小结**
- 技术卓越将成为标配，AI模型对"好"有统一标准
- 真正的差异化来自"精神"——无利害关系时依然热爱创造的人
- AI能筛选技能，但筛选不了"你为什么做这件事"——这是人类判断力的最后堡垒

---

## 总结：AI时代CEO的解构与重建

| 维度 | 要点 |
|------|------|
| CEO自动化 | 信号摄取→判断→摘要→任务→执行→监控，六步皆可模块化 |
| 虚拟员工 | AI代理在Slack有真实身份，能自主学习新能力（如识别假简历） |
| 安全架构 | Crabtrap用一个LLM监控另一个LLM，在网络层拦截不合规请求 |
| 竞争终局 | 技术成为标配，差异化靠精神和判断力 |
| 建造者精神 | 无功利目的的热爱是最纯粹的创造力来源 |
| 艰难决定 | 主动挤泡沫比被动破裂好，艰难决定换来轻松生活 |

### 对CEO/管理者的启示
- CEO工作可以拆解为六个可自动化模块，不是所有环节都需要人类判断
- 习惯性问题变成技能模块，组合起来就是完整的管理者工作流
- 安全问题不是阻碍AI部署的理由，而是系统工程挑战——用代理监控代理

### 对组织的启示
- 虚拟员工不是未来，是现在——在Slack有名字、能自主学习的AI代理已经能工作
- 招聘时看"精神"比看技能更重要，因为技能未来会成为标配
- Crabtrap架构值得借鉴：一个LLM监控另一个LLM，解决AI安全的信任问题

> **金句 · Pedro（封底）**
> **中文：** 我们塑造工具，工具也塑造我们。未来公司在做出财务决策时，会有更高层次的思考。
> **原文：** We shape our tools, and then our tools shape us. In the future, companies will think at a higher level when making financial decisions.

---

## 相关阅读

- [[MOC - Agent Theory and Design]] — AI Agent时代的组织理论全景索引
- [[MOC - Harness Engineering]] — Crabtrap安全架构与Harness工程的交叉
- [[MOC - AI 时代个人发展与组织]] — 建造者精神与职业发展的横切MOC

---

## 附录

- **来源**：Core Memory Podcast（Ashlee Vance主持），完整专栏稿（Quill Delta → Markdown）
- **原文时间戳**：[08:45] 编程纯粹性 | [21:12] 美国金融基建 | [32:50] 艰难决定 | [45:15] 虚拟员工吉姆 | [48:30] CEO工作流自动化 | [55:20] 精神高于技术
- **ingest 路径**：`BV1dg5t6gEJ8/ingest/column_article.md`
