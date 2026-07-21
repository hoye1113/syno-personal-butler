---
title: "Anthropic 3亿收购开发工具初创创始人访谈"
tags: ["ai_agent", "mcp", "anthropic", "bilibili", "harness_engineering"]
legacy_tags: ["ai_agent", "mcp", "anthropic", "bilibili", "harness_engineering"]
created: "2026-07-06"
source: "B站专栏 - Easonlee的AI笔记"
description: "Dan Shipper × Alex Rattray（Stainless CEO）：Anthropic 收购后谈 MCP 瓶颈——工具爆炸吃光上下文，赛博格路径用代码执行换工具链，安全归 API OAuth，工程收敛到提示词。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Anthropic-3亿收购开发工具初创创始人访谈.md"
source_sha256: "1b387e38996df85d6e2f8e107841742a43e09c06797fefd63370fb568c1f3c46"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1G9Gm6REdy/"
column_url: "https://www.bilibili.com/read/cv49801632/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1G9Gm6REdy/ingest/column_article.md"
duration: "~45 min"
saved: 2026-07-06
updated: 2026-07-06
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1G9Gm6REdy/ingest"
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1G9Gm6REdy/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Dan Shipper"
guest_name: "Alex Rattray"
guest_title: "Stainless 创始人兼 CEO · 前 Stripe API 负责人"
speaker_inference: "column_article S-tier + video_description"
speaker_confidence: high
author:
  - "[[Alex Rattray]]"
concepts:
  - id: api_dendrite
    zh: 互联网树突
    en: API as dendrites
    one_line: 程序间通信是互联网思考的神经连接
  - id: mcp_native_interface
    zh: 模型原生接口
    en: MCP native interface
    one_line: 把网站/服务变成 LLM 可直接调用的工具集
  - id: tool_explosion
    zh: 工具爆炸
    en: tool explosion
    one_line: 大型 API 全量映射 MCP 吃光上下文
  - id: cyborg_mode
    zh: 赛博格模式
    en: cyborg mode
    one_line: 一半 LLM 推理、一半 CPU 跑代码，只回最终结果
  - id: api_layer_security
    zh: API 层安全
    en: API-layer security
    one_line: OAuth 细粒度 Scope，不靠裁剪 MCP 暴露面
  - id: prompt_as_tool_build
    zh: 提示词即工具构建
    en: prompt engineering replaces tool wrapping
    one_line: 代码执行成熟后，工程工作只剩写好文档和提示
---

# Anthropic 3亿收购开发工具初创创始人访谈

**Host：** Dan Shipper（*AI and I* / Every）  
**Guest：** Alex Rattray（Stainless 创始人兼 CEO · 前 Stripe API 负责人）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV1G9Gm6REdy](https://www.bilibili.com/video/BV1G9Gm6REdy/) · **专栏** [cv49801632](https://www.bilibili.com/read/cv49801632/)（原标题：Stainless CEO：为什么 Anthropic 收购了我们）

---

## 开场

Anthropic 收购 **Stainless**——这家给 OpenAI、Anthropic 等大厂做 API 与 SDK 的「计算机之间怎么说话」公司，创始人 Alex Rattray 曾在 Stripe 管 API。收购后这期 *AI and I* 不聊并购细节，聊 **MCP（模型上下文协议）** 为什么火、为什么难、下一步往哪走。

Dan 和 Alex 大学就是朋友；Dan 还是 Stainless 小股东。核心矛盾：**MCP 的愿景**是把 Gmail、Stripe、Salesforce 变成 LLM 的原生工具——像人类点按钮，模型直接调接口；**现实**是 Stripe  alone 就有数百个端点，全塞进上下文，模型还没动手 token 就爆了。Alex 押注的出路：**赛博格模式**——模型只写 TypeScript、CPU 在沙箱里跑 SDK 分页循环，十行结果回上下文；安全回到 **API OAuth Scope**；开发者从「包 MCP 工具」变成 **提示工程**。

五章预告：**MCP 是 AI 原生接口** → **工具爆炸与上下文疲劳** → **好 MCP 的工效学** → **赛博格：代码执行取代工具链** → **安全归 API 层，工程只剩提示词**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 应用程序编程接口 | API | 程序跟程序说话的方式 |
| 模型上下文协议 | MCP | 把网站/服务暴露成 LLM 可调工具 |
| 软件开发工具包 | SDK | 如 `pip install stripe`，封装 HTTP 调用 |
| 工具爆炸 | tool explosion | 大 API 全量映射成 MCP 工具 |
| 动态模式 | dynamic schema | 只给「列端点 / 查端点 / 执行端点」三工具 |
| 赛博格模式 | cyborg mode | LLM 写代码 + CPU 执行，非 GPU 推理 |
| 代码执行工具 | code execution tool | 沙箱里跑 TypeScript/Python 调 SDK |
| 权限范围 | OAuth scope | API 层细粒度授权，非 MCP 裁剪 |

---

## 01 MCP 是 AI 时代的原生接口

**Dan Shipper：** 互联网是为「没有 AI 的世界」建的——计算机之间靠 API 通信，人类靠 UI 点。现在我们要用 MCP 把 AI 接上去。为什么请 Stainless 的 CEO 来聊？

**Alex Rattray：** API 是 **应用程序编程接口**——一个程序跟另一个程序说话。像神经元上的 **树突**：两个神经元不连，就没法想；云端服务器不通过 API 互连，就没有互联网。Stripe、OpenAI、Anthropic 你摸过的 API，Stainless 很多都在幕后做过 SDK——`stripe.customers.create` 这种，比裸 HTTP 省事。

AI 来了，对话里多了第三个角色：以前是 **人↔UI↔计算机**，或 **计算机↔API↔计算机**；现在是 **大语言模型↔？↔计算机**。大家押 MCP——把 LLM 接到软件上。愿景很亮：Gmail MCP 有发信、读信、归档；模型像操作员一样 **原生登录**，不用扒网页 DOM。

Stainless 从第一天使命就是 **让计算机更容易互连**。SDK 帮人类开发者；MCP 本该帮 LLM——但我们全球 rollout 下来，**效果并不理想，实现极难**。LLM 通过 MCP 交互时往往被限死：你不敢给模型太多工具，通常就停在小功能上。

**Dan Shipper：** 你的意思是，网站给人点按钮，MCP 给模型一套原生工具——像 Gmail 的发送、撰写、读取。但你说现在效果不好，具体坏在哪？

**Alex Rattray：** 先讲代理 AI 最平淡的例子。Dan 来我店买条纹袜子，第二天说货有问题。我对团队成员说：退 Dan 昨天的袜子钱，发个折扣码，附感谢信。人工操作：开内部后台 → Stripe 仪表板找 Dan 的付款（可能好几个 Dan）→ 确认订单里有条纹袜 → 退款界面核对金额 → 建折扣码 → 另一个 SaaS 发邮件 → 大企业还要动 Salesforce、Slack 通知客户经理。**五个应用、十五次点击、多次页面加载**。

代理 AI 的承诺：同样一句话丢给 ChatGPT 或 Claude，它穿五个应用、十五块屏幕，回来说「搞定了」。今天模型能调的工具数量有限，只能跑 **精确线性链条**——某种程度上可行。若要 LLM 像人类操作员处理 **任何事**，且不等网站 JavaScript 加载，你不只要「创建退款」工具，还要「列出交易」「列出产品」「查找客户」「创建折扣」——Stripe 仪表板里能做的 **全部** 都要 API 化，而 Stripe 开放 API **数百端点**，仪表板功能极其庞大。

今天把 Stripe 全量 MCP 定义——每个工具的描述、请求属性、响应属性、完整文档——交给 LLM，听众都应该意识到：**上下文预算已经用完了**。仅把 Stripe OpenAPI 译成 MCP，可能就要 **几十万个 token**。模型不仅吃不下，这也是 **糟糕的信息密度**——一次性记这么多细节，模型会晕。理想状态：企业 **每一个 SaaS** 的细节和边缘情况都暴露给 AI 操作员——愿景在此，挑战巨大。还有安全：Refund Dan 的同时不能把 **所有客户** 都退了，或把钱转进 AI 自己的银行账户。

> **金句 · Alex Rattray**
> **中文：** API 是互联网的树突——没有连接，就没有思考，也没有互联网。
> **原文：** APIs are like the dendrites of the internet.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 树突隐喻 | dendrite metaphor | API = 程序间信息交换的突触 |
| 原生接口 | native interface | LLM 不经过人类 UI 直接调能力 |
| 线性工具链 | linear tool chain | 有限工具数下的多步调用 |
| 代理承诺 | agentic promise | 自然语言 → 跨应用自动化 |

**本章小结**

- MCP 愿景：把 SaaS 能力暴露成 LLM 工具，跳过 UI
- API/SDK 是 Stainless 老本行；MCP 是同一使命的新 front
- 全量端点映射在 token 和认知上 **不可扩展**

---

## 02 工具爆炸撑爆上下文，好 MCP 得为模型工效学定制

**Dan Shipper：** 你说「现在不起作用」——就是因为上下文和安全这些？

**Alex Rattray：** 今天大家做 MCP，常见做法是 **REST 端点一对一封装成工具**。要真能用，得 **专门为 LLM 设计工具**——比如「按描述找客户并退款」一个工具搞定，而不是暴露原始 `list_charges`。

**Dan Shipper：** 得考虑模型的工效学——怎么思考，才能大多数时候做对？

**Alex Rattray：** 很难。SDK 类比：人类花了很多年才学会给 Python 开发者做 **真正好用** 的库——Stainless 站在巨人肩膀上。我们还没找到同样符合 **LLM 工效学** 的方式，像给开发者公开 API 那样公开给模型。新研究课题——我可以学当 Python 开发者，我学不了 **当 LLM 思考**；能学会就太强了，也确实棘手。

LLM 对 **重复、长行动链** 吃力。就算「列出所有交易」返回一页 JSON，数据量也可能巨大——翻很多页才找到那双条纹袜。**干草堆里一两粒针**，模型擅长但不完美；干草太多就懵。

**Dan Shipper：** 你们在帮别人建 MCP 服务器——实用又高效，有什么原则？

**Alex Rattray：** 老实说，我很少看到做得特别好的；我们在酝酿新方案。以今天水平，你得做 **产品管理**：进市场看客户怎么操作软件，想 AI 能解锁哪些繁琐任务，再大量工程包装成模型吃得下的形态。必须建 **评估体系**——用户在 Cursor、Claude Code 还是别的客户端？背后不同模型，矩阵很复杂。反馈回服务器也难：用户聊天里骂「垃圾」，MCP 服务器能不能感知？我们想过做「发送反馈」工具。

更具体的：**工具数量保持相对少**；名称和描述 **极度精确**。听起来和「功能要强」矛盾——写好东西就是难。你可以做一个狠工具：「按姓名+产品描述找人并退款」。输入 schema 属性尽量少，参数描述简洁；返回体也要 **极小**，只含模型真要的信息——但你往往 **事先不知道** 它要什么。我们用过 **JQ 过滤器**（过滤 JSON），某些场景好使，算技巧。

**Dan Shipper：** 是不是还要再加一层——比如搜索工具，先搜 relevant 工具列表？

**Alex Rattray：** **工具浏览** 是严重问题，搜索是一种解。Stainless 今天给 API 生成 MCP：小 API 可以 **每端点一工具**，也可过滤子集。大 API 用 **动态模式**——永远只有三个工具：列端点、查某个端点文档、执行端点。上下文扩展性好，但 **一件事要三轮**，慢、贵、有损耗，执行失败率还在。通常不错，离完美差一截。

我自己用 MCP——主要不在编码，在 **业务**：Notion、HubSpot、Gong，还有连 **PostgreSQL 只读副本** 的 MCP。我问「上周有哪些 interesting 客户注册 Stainless？」它查库、交叉 HubSpot、翻 Notion 笔记、看 Gong 录音，汇总给我。偶尔 **断连要重连**——新技术的小麻烦，阻碍一部分体验。

**Dan Shipper：** Claude Code 写进 Git 知识库那套，能展开吗？

**Alex Rattray：** 元层面很有用——AI 收集笔记，**你来编辑**。专用 Git 仓库，笔记/研究文件夹；告诉它：找到 interesting 客户引语就存 Markdown，带完整引用——下次类似问题不必再搜 MCP，磁盘上有缓存。我用 **Claude Code**：新推荐信来说「存进公司 Git 知识库」；以后要引语就说「去主仓库搜最适合这个场景的客户引语」。结构现在还乱、有机密——没关系，**Claude Code 处理非结构化数据** 很好，不必提前结构化；个人、一位业务同事、两个支持工程师在用，还没全公司 rollout。

还有 **SQL**：「过去三个月 XYZ 指标月环比？」董事会 prep 时很快给出 decent 答案；我再加业务过滤、迭代查询，满意后 **转储到分析文件夹**——下次董事会问「上次那个查询是什么」就能找回。支持侧也试 Claude Code 直接啃客户 Bug——不会百分百，也没有 50%，但能 **抬一点整体效率**，还在实验。

> **金句 · Alex Rattray**
> **中文：** 我们还没找到像给 Python 开发者那样、符合 LLM 工效学的公开 API 方式。
> **原文：** We haven't found an ergonomically equivalent way to expose APIs to LLMs the way we do for developers.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 模型工效学 | model ergonomics | 工具/schema 贴合 LLM 推理习惯 |
| 动态三工具 | dynamic schema (3 tools) | list / describe / invoke endpoint |
| 工具浏览 | tool browsing | 工具太多时模型找不到对的 |
| Git 知识缓存 | Git knowledge cache | MCP 结果落盘 Markdown 减重复检索 |

**本章小结**

- 端点 1:1 映射不够；要 **任务级工具** + 小返回体
- 大 API 用动态模式换上下文，牺牲延迟和轮次
- Alex 真实用法：跨 MCP 业务问答 + Claude Code 笔记/SQL 缓存

---

## 03 赛博格模式：一个代码执行工具，换掉五十个 MCP 调用

**Dan Shipper：** 预录电话里你提过 AI 未来的大愿景——「赛博格」？展开讲讲。

**Alex Rattray：** 代理 AI 让操作员日常任务轻松——行业在边缘了。再往前想一步，我喜欢叫 **「AI 的未来是赛博格」**。赛博格是半人半机器——这里不是机器人，是：你跟代理聊，得到的是 **一部分 GPT（神经网络）+ 一部分代码**。我说的「机器」是 **传统 CPU 软件**，不是 GPU 上的模型。

两种展开：**一次性操作**（刚才退款例子）和 **生产软件**。一次性场景里，人类点十五次，我们希望 AI 用工具链完成——我看到的方向，以及 Stainless 在做的，是 **代码执行**。

别给模型无数个零散工具——给它 **两个**：**执行代码**（文本框里写 TypeScript，用 API 的 TS SDK：`stripe.transactions.list()`、`stripe.refunds.create()`…）+ **搜文档提问**。给简短 README、示例请求、可用 API 列表——SDK 和 API 格式良好可预测，模型 **极擅长从 schema 推断**。不确定或第一次错了，文档工具兜底。

Stripe 退款场景：上下文初始占用 **约一千 token 甚至更少**。大量分页 list 对上下文 **几乎零成本**——模型写三个嵌套 for 循环找 Dan 和条纹袜，只在找到时 `console.log` 客户 ID、交易 ID，创建退款输出 refund ID；**回给模型的上下文大约十行文本**。全在云端 CPU 跑，可能 AWS 里挨着 Stripe API，**极快**——不必每步都往返模型。

**Dan Shipper：** 我理解了——模型写代码，Stripe（或别的 MCP 提供商）执行、调 API、返回结果。取代五十种工具调用。为什么不我自己本地跑代码，非要 API 提供商执行？

**Alex Rattray：** 代码执行工具会变成 **最常用工具**——个人本地跑会更多。但今天 **代码执行 + 库** 配合不理想：LLM 很难完美调用库、难确知版本；不能开箱即用 NPM/PyPI 就会幻觉，出错难迭代。不用库就得裸 HTTP——又要完整 OpenAPI，**回到文档太大**。

更棘手：没有 **静态类型** 的库，计算机判不出你调错了——LLM 一定比例会发错 API 请求。好的代码执行工具跑 **类型检查器** 反馈：「你在查 Stripe transactions list，那个 API 不存在——你可能要 payment intents、orders 或 balance transactions。」API 提供商做得够好，还会返回相关文档，甚至 **专职 AI 子代理**——职责窄、常更新、不被整段对话长上下文污染，根据模型目标给建议。

> **金句 · Alex Rattray**
> **中文：** 别给模型五十个工具——给它写 TypeScript、让 CPU 分页跑完，只回十行结果。
> **原文：** Instead of countless scattered tools, give it code execution — pagination runs on CPU, ~10 lines back to the model.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 赛博格模式 | cyborg mode | LLM 推理 + CPU 传统代码各干一半 |
| 代码执行工具 | code execution tool | 沙箱跑 SDK 调用，非逐步 tool call |
| 类型检查反馈 | type-check feedback | 错 API 名时静态类型拦下来 |
| 文档子代理 | documentation sub-agent | 窄职责、短上下文的辅助 LLM |

**本章小结**

- 核心工具从 **N 个 MCP** 收敛到 **代码执行 + 文档**
- 分页/循环在 CPU，上下文只收 **最终结果**
- 库+类型检查是 API 提供商比本地跑的价值点

---

## 04 安全必须在 API 层，沙箱只连允许的域名

**Dan Shipper：** 这套安全模型你怎么想？

**Alex Rattray：** 安全模型 **非常有意思**——Stainless 在认真想，欢迎听众联系。要紧的是：**安全必须在 API 层本身实现**。现在有人靠 **限制 MCP 暴露面**——有一定道理，但底层 API 你都能操作。正确做法是 **OAuth + 细粒度权限 + 适当 Scope**——安全发生在 **对的位置**。OAuth Scope 有局限、构建复杂——有人把它做简单就赢了。这才是 **正确的方向和层次**。

**Dan Shipper：** 你会做给开发者的「工具使用的工具」吗？Quora 邮件助手一堆 Gmail 工具——我需要能控环境、装库、有网络、随时调 API 的 **计算机使用环境**。OpenAI 有类似的，但不适合自定义库。你们应该建那个。

**Alex Rattray：** 我们在努力。先从 **提供 MCP 服务器的人** 做起——最终模型要有代码执行环境，能访问 Stripe 也能访问 Salesforce，**权限不能过度**。API 提供商的优势：沙箱里跑的代码 **只允许连特定 API 域名**（如 `api.stripe.com`）——对安全至关重要。可以 **逐步扩展仍保持安全**，需要时间。

还有一点：代码执行是 **强大通用模型**，但不是唯一模型。有时 AI 某次做的事 **有持久价值**——客户信说袜子破了就自动退款，人手动做三次后该自动化。软件团队每天干这个；AI 里也会：**同一套代码搜索工具、同一套提示**，在沙箱里跟 API 交互像在「大脑里跑」——然后意识到「这代码持久有用，提交进仓库」。

**Dan Shipper：** 聊天是好探索界面，但有时你只要仪表板——Stripe MRR 每天看，不想每天问。我 push 你一下：大企业谨慎，但真正被采纳的往往是 **早 YOLO 的人**。Stable Diffusion 全开放开了图像生成浪；Claude Code **YOLO 模式** 勤奋、沙箱可跳权限快速动；Codex 一度锁浏览器里偏结对编程。个人开发者、像我这种规模 builder，才是 **AI 优先采纳** 的人——比大公司更追效率。能不能 soon 给个人开发者一版？我会立刻用。

**Alex Rattray：** 我很乐意交到你手上。Quora 邮件助手用 Gmail API——归档、起草、发送、分类一堆工具；换成代码执行方式，**创建新工具更灵活、不破坏旧工具**。我预测：一旦代码执行「超级工具」成熟，所谓 **构建工具** 只剩 **指令、提示词、API 全力**——Gmail 全功能在一个工具里；特定任务用特定描述帮 LLM 高效执行。到那时 **唯一工程工作就是提示工程**。是否真这么简单——提示工程 ** notoriously 棘手**，但这是愿景一部分。我们也有生成 MCP 帮开发者 **混合搭配** 各工具部分的巧法。

> **金句 · Alex Rattray**
> **中文：** 靠裁剪 MCP 暴露面保安全是治标——OAuth Scope 在 API 层才是正解。
> **原文：** Security has to happen at the API layer itself — limiting MCP exposure is treating the symptom.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| API 层安全 | API-layer security | OAuth scope 约束能调什么 |
| 域名白名单沙箱 | domain-allowlist sandbox | 执行环境只连 api.stripe.com 等 |
| 持久自动化 | durable automation | 一次性 AI 操作 → 提交仓库 |
| 提示词即工具构建 | prompt-as-tool-build | 工程从包 MCP 转向写指令 |

**本章小结**

- MCP 裁剪 ≠ 安全；**OAuth + Scope** 在 API 授权
- 沙箱 **网络白名单** 是 API 提供商可控杠杆
- 成熟路径：**代码执行 + 提示工程**，MCP 生成作混合过渡

---

## 总结：从工具爆炸到赛博格 harness

| 维度 | 要点 |
|------|------|
| **接口层** | MCP = LLM 原生接口；API 仍是互联网树突 |
| **瓶颈** | 大 API 全量工具化 → 上下文爆炸 + 模型疲劳 |
| **工效学** | 任务级工具、小返回、动态三工具、eval 矩阵 |
| **赛博格** | 代码执行 + SDK + 类型检查；CPU 分页，十行回模 |
| **安全** | OAuth Scope @ API 层；沙箱域名白名单 |
| **工程未来** | 提示工程取代逐个包 MCP；Anthropic × Stainless 方向一致 |

### 对 harness  builder 的启示

- **别跟上下文窗口硬刚**：Stripe 级 API 不可能「全工具进 prompt」——要么任务工具、要么代码执行。
- **Eval 要按客户端×模型矩阵测**：Cursor / Claude Code / 自研 agent 行为不同。
- **缓存层**：MCP 查出来的东西落 Git/Markdown，减重复检索——Alex 已在业务里这么做。
- **安全跟 Cloudflare 沙箱思路同频**：执行环境网络面要比 MCP 暴露面更硬——见相关阅读。

### 对 API / 平台方的启示

- **SDK 质量 = LLM 代码执行成功率**：可预测 schema、静态类型、好文档子代理。
- **动态 MCP 是过渡**，不是终局；终局是 **一个执行环境 + 权限 Scope**。
- **个人开发者 YOLO 采纳** 往往早于企业——产品节奏要兼顾。

### 仍待验证

- 提示工程是否真能 **唯一** 取代工具封装（Alex 自己说「 notoriously 棘手」）
- 代码执行工具 **跨 SaaS 组合** 时的 Scope 组合 UX
- MCP 断连、三轮动态模式的 **生产 SLA**

> **金句 · Alex Rattray（封底）**
> **中文：** 超级工具成熟后，构建工具只剩提示工程——我们拭目以待它有没有看起来那么简单。
> **原文：** The only engineering work left will be prompt engineering — we'll see if it's really that simple.

---

## 相关阅读

- [[Anthropic团队-解析Claude Agent平台内幕]] — Anthropic 云托管代理、Harness 与平台原语
- [[Cloudflare专家-Sandbox确保AI代码安全]] — 代码执行沙箱、网络隔离与 AI 安全
- [[MOC - Harness Engineering]] — Harness 横切索引

---

## 附录

| 章节 | 专栏时间戳 | 主题 |
|------|------------|------|
| 01 | [05:12] | API 树突 · MCP 原生接口 |
| 02 | [10:45] | 上下文限制 · 工具爆炸 |
| 03 | [25:30] | 赛博格 · 代码执行 |
| 04 | [35:15] | API 层安全 · OAuth |
| 05 | [42:10] | 提示工程取代工具开发 |

**ingest：** `Recastory/workspace/bilibili-retranscribe/BV1G9Gm6REdy/ingest/`  
**主源：** `column_article.md`（Quill Delta → Markdown 专栏完整稿）  
**原节目：** *AI and I* · Dan Shipper × Alex Rattray · Stainless.com
