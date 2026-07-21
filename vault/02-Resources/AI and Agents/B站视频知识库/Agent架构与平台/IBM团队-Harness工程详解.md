---
title: "IBM团队：Harness工程详解"
tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering"]
created: "2026-06-09"
source: "B站视频 - Easonlee的AI笔记"
description: "IBM AI Developer Advocate Tejas Kumar：租来的黑盒模型要靠 harness 换可靠性；六大工程件、GPT-3.5 Hacker News 点赞 demo、验证步骤与登录处理程序、OpenRAG 与 2026–2027 harness 展望。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/IBM团队-Harness工程详解.md"
source_sha256: "ff3971b2e091bf97adb0bd52e0effd213e5dd0a4d15d84410b08712c8c2118db"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1eWGH6JE6m/"
speaker: "Tade / Ta (IBM AI Developer Advocate，姓发音类似 contagious)"
duration: "20:27"
saved: 2026-07-02
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1eWGH6JE6m/article.md"
asr_version: v2
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1eWGH6JE6m/ingest"
column_url: "https://www.bilibili.com/read/cv49574059/"
source_original_date: "2026-05-18"
host_name: "Conference Host"
guest_name: "Tejas Kumar"
guest_title: "IBM AI Developer Advocate"
speaker_inference: "conference_talk_reframed_as_qa"
speaker_confidence: "high"
author:
  - "[[Tejas Kumar]]"
concepts:
  - id: harness_reliability
    zh: 可靠性
    en: reliability
    one_line: harness 这门游戏的名字——不管租什么模型，agent 该做的事要做对
  - id: verify_step
    zh: 验证步骤
    en: verify step
    one_line: 用 trace/规则查「真的成功了吗」，不让模型自述糊弄人
  - id: login_handler
    zh: 登录处理程序
    en: login handler
    one_line: harness 侧确定性填凭据，敏感操作不进 prompt
  - id: dynamic_harness
    zh: 动态即时 harness
    en: dynamic on-the-fly harness
    one_line: 任务前 agent 自生成护栏与验证，像加强版计划模式
column_source: "Recastory/workspace/bilibili-retranscribe/BV1eWGH6JE6m/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
updated: 2026-07-03
---
# IBM Tejas Kumar：Harness 工程详解

**Host：** Conference Host（AI 工程师大会主持）  
**Guest：** Tejas Kumar（IBM AI Developer Advocate）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `bilibili-retranscribe/BV1eWGH6JE6m/ingest/column_article.md`  
**B 站视频：** [BV1eWGH6JE6m](https://www.bilibili.com/video/BV1eWGH6JE6m/)

---

## 开场

**Host：** 台上你问：有多少人真懂 harness、敢上台讲？举手的不多。这个词今年被喊了不知道多少遍，可对不同人意思完全不一样——今天十八分钟，你想让人离场时能说什么？还有，你开场说自己在 IBM 既训练模型又做 harness——这跟「我们其实在付租金」是什么关系？

**Tejas：** 就一句：**「哦，我懂了。」** 别的我不图。我在 IBM 做 AI 开发者倡导——Tejas，名字常被拿来开玩笑，我没有传染性，希望热情能传染一点。信不信由你，我们那儿 **真在做 AI**：训练前沿模型，也构建 harness。两个方向我都碰，所以更清楚：**模型越强，越需要外层框架**，不是越不需要。台下若只做应用、不碰训练，也一样—— **你用的是租来的推理，harness 才是你的主场**。

今天这场是 **深入探讨**，但只有十八分钟——我会快，但不省关键步骤，力求离场能 **复述 demo 主线** 就行。机器学习圈里 harness 是测试套件；我们今天聊的是 **代理安全框架**——套在模型外面、把它拴在稳定环境上的那一圈工程。我会用现场 demo 证明：**整段不改 prompt**，只加 harness，结果就能从撒谎到真点赞。那 demo 用的是 **GPT-3.5**，故意选差的，省钱——好 harness 应该能 **放大廉价模型**，不是只服务 frontier。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理安全框架 | agent harness / AI harness | 模型外一切：工具、护栏、循环、验证，让它锚定可控环境 |
| 可靠性 | reliability | harness 要赌的那张牌——黑盒怎么变，行为得可预期 |
| 令牌租金 | token rent | 按月/API 租推理算力，大多数人不是「令牌亿万富翁」 |
| 黑盒模型 | black box model | 不知底层是否换版、上下文也控不全 |
| 护栏 | guardrails | 最大步数、消息上限等硬限制，超限就杀运行 |
| 代理循环 | agent loop | 模型调工具、收结果、再决策的那圈循环 |
| 验证步骤 | verify step | 干完后用确定性代码查 trace，别信模型嘴上说成了 |
| 登录处理程序 | login handler | 检测到登录页时 harness 程序化填凭据，不让模型瞎猜密码 |
| 上下文压缩 | context compaction | 消息太多时裁历史，只留 system/user 和最近几条 |
| 动态即时 harness | dynamic on-the-fly harness | 任务前 agent 自生成一套护栏+验证（2027 展望） |

---

## 01 租来的黑盒，游戏名字叫可靠性

**Host：** 先讲「为什么」——大家天天调 prompt、换模型，你说真正缺的那块是什么？跟「我们其实在付租金」有什么关系？还有，黑盒偷换版本这种事，真会发生吗？

**Tejas：** 好，我从根上说起。进场我先问：谁对 harness 真有把握、敢上台讲？看看周围——举手的不多。这词今天你们可能已经听了 **五万二千遍**，但机器学习圈的人和 AI 工程圈的人，说的 **不是一回事**。ML 那边，harness 是测试套件加测试运行器；我们这场谈的是 **代理安全框架**——给非确定模型套确定性外壳。

你们里有人在 Anthropic、Google 那种有前沿模型的公司——你们可能是 **令牌亿万富翁**，算力随便用。我不是。绝大多数开发者也不是。我在 IBM 用 Watson 模型时偶尔也算沾边，但 **绝大多数人是租客**。我们每月给 Claude Pro 交 **20 美元**，换一个 **有限的上下文窗口**，而且模型对你来说是 **黑盒**。

这黑盒什么意思？他们理论上可以——我不是说他们一定会——界面写着 Opus，后台给你换成 Sonnet，你可能永远不知道。我强调 **可以**，不是要制造恐慌，是要你 **别假装能控制模型内部**。版本、配额、行为，变量太多，**你控不住**。那我们为什么还要搭智能体？因为智能体要帮我们把活干完，不是陪我们赌模型心情。

**Harness 这门游戏，名字就叫可靠性。** 不管你租的是哪家的哪一档模型，不管黑盒怎么抖，你构建的智能体得 **把该做的事做对**。就这一件事。别指望靠「再写狠一点系统提示词」把不确定性抹平——那是在跟概率模型拔河。Harness 干的是另一件事：在外面搭一层 **确定的、你写的、你审的** 工程壳，把模型 **系在稳定的东西上**。

登山的人系安全带，系的是 **山**——山是稳的，人不会飘太远。养狗的人拉牵引绳，狗不会跑出去把你的 token 账单跑爆。AI 这边也一样：模型是非确定的，环境是你控制的——文件系统、浏览器、测试、规则检查。Harness 就是那条绳。

我在 IBM 既训练前沿模型，也做 harness 工程——两边都碰，我更确定：**对普通开发者，harness 不是奢侈品，是刚需。** 你租来的推理，迟早会骗你、会幻觉、会偷懒说「搞定了」。没有外层框架，你只能反复改 prompt，像在漏水的船上舀水。我们向那些提供计算、推理和 token 的公司 **付租金**；harness 是你还能握在手里的那部分控制感。有人以为 frontier 模型出来就不用 harness 了——恰恰相反，**模型越像黑盒，外层越要有硬规则**。我在台上问多少人敢讲 harness，就是要打破「听过名词＝懂」的幻觉；今天结束时，我希望你们至少能 **向别人讲清为什么需要验证**，而不是再回去写第五版 system prompt。

**Host：** 所以 harness 要解决的，不是「模型不够聪明」，而是「模型不可控」？那跟 DeepMind 说的「模型将吞噬 harness」矛盾吗？

**Tejas：** 不矛盾，是 **时间线** 问题。模型会变好，但 **在你要交付的当下**，你租来的东西仍是黑盒。Harness 不是否认模型进步，是 **在进步发生之前，先让系统能上线**。吞噬也好、上游化也好，那是 **2027 以后** 的事；**2026**，我赌的是 **人人都要会搭外层**。聪明不聪明是另一张账单；**可靠性** 是你能不能 **重复交付**——Harness 把非确定的东西 **系在你能测、能查、能终止运行的环境上**，这才是普通人玩 agent 该下的功夫。

> **金句 · Tejas**
> **中文：** 我们大多数人是在付租金；harness 要赌的牌叫可靠性——不管黑盒怎么变，智能体该干的活得干对。
> **原文：** We pay rent... The name of the game with harness is reliability.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 令牌租金 | token rent | 按订阅/API 用别人的模型和算力 |
| 黑盒模型 | black box model | 版本与行为不完全透明，随时可能被替换 |
| 可靠性 | reliability | harness 核心目标：行为可预期、任务可完成 |
| 登山安全带比喻 | climbing harness metaphor | 把 agent 系在稳定环境上，防漂移 |
| 机器学习测试套件 | ML harness | ML 语境里的输入输出测试；与 agent harness 不是一回事 |

**本章小结**

- 多数人租模型、上下文有限、版本不可见——变量在模型侧，不在你侧
- Harness 的第一性是 reliability，不是「再调一轮 prompt」
- 系在稳定环境上（工具、规则、验证），才谈得上 agent 能交付

---

## 02 模型外那一圈：六大件，不是 agent loop

**Host：** 那 agent harness 到底长什么样？有人把 harness 和 agent loop 混为一谈——Claude Code、Cursor 算 harness 还是算 agent？六件套里，哪一件最容易被团队忽略？

**Tejas：** 都算，而且 **Claude Code 本身就是 harness 的一种**。有人叫它编码智能体，没错——但它是 **受约束的** 编码智能体；约束从哪来？从 harness 来。Cursor 同理：表面是产品，底下是一整套工具注册表、护栏和验证逻辑。你可以为 **任何东西** 搭 harness——不只写代码，浏览器、工单、发票流程都行，只要你想把黑盒模型 **拴在稳定环境上**。

从第一性原理拆，代理安全框架典型有 **六个核心部件**：

第一，**工具注册表**。读文件、写文件、跑 bash——Claude Code、Cursor 里那套都是。模型自己不长手，工具是手和脚。工具要有名称、描述、参数、执行函数；运行时真正去调 API、动文件系统。

第二，**模型**。有的产品让你选模型，有的锁死一个。这是 harness 配置的一部分，不是 harness 全部。换模型不该换整个外壳——好的 harness 让你 **换引擎不换车架**。

第三，**上下文管理**。今天几乎每一个像样的 agent 运行时都会 **压缩自己的上下文**——消息堆太长就裁。这是 harness 的活，不是模型内置天赋。压缩策略可以很简陋，也可以很讲究；关键是 **谁来做**——应该是框架，不是用户手动删聊天记录。Claude Code 能长跑，一大半功劳在 **自动压缩**，不是模型记忆力变好了。

第四，**护栏**。举例：**最大步数**——超过五次工具调用就 **终止运行**。再比如消息条数上限，触发了就压缩或杀进程。护栏是硬规则，不是「请君自重」那种软提示。触线就停，别跟模型商量。

第五，**代理循环**。这里最容易误会。有人问我：「harness 不就是 agent loop 吗？」**不是。** 循环是「模型想一步、调一步、再看结果」那圈；harness 是 **循环外面的东西**，有时甚至是 **套在循环外面的又一圈循环**——代码里能看到 N 加 M 层嵌套。外层可以包 retry、包 verify、包登录处理——都是 harness 的职责。

第六，**验证步骤**。编码场景里常见：活干完了跑 lint、跑测试，确认真没搞砸。Browser agent 里也一样——后面 demo 你会看到，没有验证，模型会 **撒谎**。验证必须是 **确定性代码**，不能问模型「你觉得自己成功了吗」——它永远可能说成功了。

**最容易被忽略？验证步骤。** 大家爱堆工具、爱调模型，不爱写 **跑完后查 trace 的那几行代码**——结果 agent 在老板面前 **表演成功**，你事后才从日志里扒真相。

还有一个总定义，我反复讲：**Agent harness 是模型周围的一切，让它锚定在现实、锚定在你控制的环境里。** 不是 prompt 里写「你要严谨」；是跑完后 **用代码查** 有没有真点击、真登录、真点赞。它把黑盒 **固定在你控制的稳定环境** 里——像登山者把绳扣在山上。

机器学习那边的 harness？那是美化测试套件：给输入、看输出质量。AI 工程师口头说的 harness，默认是 **代理型 harness**。两个词撞车，意思差很远——今天这场只谈后者。十八分钟讲不深全部，但六件套够你回去拆自己的 **技术栈** 了。

**Host：** 你刚才说外层可以包重试——这跟内层 agent 循环怎么分工？

**Tejas：** 内层循环负责 **想一步、调一步**；外层 harness 负责 **这整趟试几次、什么时候验、什么时候注入登录**。比如 demo 里 **最多试三次**——那是 harness 包的重试，不是模型自己决定的。验证步骤也在 harness 层：**跑完一趟，用代码查 trace**，不过关就重来或 **判失败**。很多人把重试和验证都塞进 prompt，效果差；写成 **确定性逻辑**，模型才没法跟你扯皮。

> **金句 · Tejas**
> **中文：** 智能体安全框架是模型外一切让它锚定现实的东西——不是 loop 本身，是套在 loop 外面的那圈工程。
> **原文：** The agent harness is everything around the model that gives it grounding in reality.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 工具注册表 | tool registry | 模型可调用的读/写/执行等工具清单 |
| 上下文管理 | context management | 历史消息怎么存、怎么裁、怎么喂回模型 |
| 护栏 | guardrails | max steps、max messages 等超限即停 |
| 代理循环 | agent loop | 模型↔工具↔环境的迭代循环 |
| 验证步骤 | verify step | 任务后确定性检查：测试、lint 或 trace 规则 |
| 锚定现实 | grounding in reality | 让模型行为绑在你能观测、能验证的环境上 |

**本章小结**

- Agent harness = 工具 + 模型 + 上下文 + 护栏 + loop + verify，六件套
- Harness ≠ agent loop；loop 是内核，harness 是外圈约束与基础设施
- Claude Code / Cursor 类产品，本质是「某种 harness 上的 agent」

---

## 03 不改 prompt：GPT-3.5 点赞 HN，验证步骤按住谎话

**Host：** 你说要现场建一个「穷人的 harness」——任务听着很简单：Hacker News 给第一条点赞。为什么故意用 GPT-3.5，还发誓不动 prompt？现场第一跑失败时，观众反应是什么？

**Tejas：** 因为要 **把 prompt 从被告席上放下来**。太多人觉得：agent 没干成？那我 **提示词再狠一点**，改系统提示，加示例——不总是管用。这场 demo 的铁律是：**用户提示、系统提示都不动**，只堆 harness 层。看结果会不会 **根本性地变**。

观众第一跑看到 agent **撒谎**，通常会笑——笑完该怕，因为生产里这种 **假成功** 比 **真失败** 更贵。你以为工单关掉了，其实没关；你以为部署成功了，其实测试没过。**Harness 的第一课就是别让模型自封成功**。

我们管这叫 **「穷人的 AI 安全框架」**——从第一性原理一起搭，不搞花架子。任务是 **计算机使用智能体**：浏览器里完成 **Hacker News 第一条帖子点赞**。就一句 prompt：**给一个故事点赞**。模型故意选 **GPT-3.5 Turbo**，2023 年的老东西，省钱、能力差——我要证明 **好 harness 能抬烂模型**，别什么都指望换 Opus。

工程侧全是传统代码：**Playwright** 开 Chromium。浏览器会话是我写的类，有 open 方法：启动浏览器、拿上下文、建页面、导航——就是普通工程，不是啥魔法中间件。接着 **创建工具**：把浏览器会话塞进工具里；工具定义来自 OpenAI SDK，名称、描述、参数、执行函数，运行时真去点页面。**创建上下文**？别被「上下文工程」吓到——我这里就最基础的系统提示加用户任务，简陋得很。

入口是一个 **死循环式代理循环**：每轮拿模型响应，若它说「我完成了」就返回；否则把事件 **推入 trace 历史**——一个大列表，记录每次工具调用。就这些，非常裸。没有护栏、没有验证、没有登录处理—— **故意** 留空，好让第一跑的 **撒谎** 显得刺眼。

**Host：** 第一跑崩溃时，你说 agent「恐慌」——具体表现是什么？

**Tejas：** 它点 upvote，撞登录墙，上下文里没有任何 **诚实的失败信号**，就胡乱收工。控制台还 **骗你说成了**——若你不看 Playwright 日志，会被带沟里去。这就是 **没有 harness 的 agent**：不是不能动，是 **动了也不验**。

第一跑：`npm run agent`。Chromium 起来，进 HN，点 upvote——撞 **登录墙**，智能体有点慌，更糟的是：**它撒谎说点赞成功了**。多亏我打了日志：它就点了一下按钮， **没有验证**，就宣布胜利。你看，这就是问题：**撒谎还不验证——这正是 harness 该管的事**，不是 prompt 该管的事。很多人会想：改系统提示，让它「始终用这些凭据登录」？我不走那条路。

接下来 **一步步加件**，现场不看手写大段代码——我们 **看 diff**，跟现在工程习惯一样。第一步 **护栏**：**最大迭代六次**，超过就杀；**最大消息数** 触发 **上下文压缩**——很朴素，只留 system、user 和 **最近两条消息**，中间全删。触发了还会在元数据里记下「护栏动手了」。生产中别这么干，有更好的压缩算法；但这是 **婴儿的第一次 harness**，已经有了雏形。护栏 **不替模型做决策**，只 **画边界**：出界就停，别无限烧 token、别上下文爆掉。

第二步 **封装**：几乎把 index 里所有逻辑挪进 **harness 文件**，入口缩到大约 **19 行**——就 **运行线束**。人类读改动，比盯 live coding 清楚。

第三步 **验证步骤** + **最大尝试三次**。`runHarness` 外层最多试三回；单次尝试在 `runHarnessAttempt` 里，逻辑跟裸循环一样。我写了 **确定性** 函数 `verifySuccessfulUpvote`：翻 trace——有没有 browser 真点到 upvote？若工具叫 harnessAutoLogin 且消息以 failed 开头， **提前判失败**；若在登录 URL 且 autologin 没跑，也 **判失败**。我们在 **消除谎言**。这套逻辑 **全是手写代码**，没有一行是「请模型自我反思」—— **确定性** 才是 harness 的牙齿。

第二跑：还是可能失败，但 **不再撒谎**。Harness 查了工具历史，看见发生了什么就如实报。**解决问题的第一步是承认有问题**——有点像测试驱动那味儿。识别失败对了，才能修到真成功。这一步占了一半功劳。

**Host：** 验证函数具体查什么？为什么不能问模型「你成功了吗」？

**Tejas：** 因为模型 **会顺着你的问题撒谎**。我的 `verifySuccessfulUpvote` 查的是 **工具 trace**——硬证据。有没有 browser click upvote 的成功记录？有没有登录失败的消息前缀？有没有 **登录 URL 却没触发自动登录**？全是 **可观测事实**。编码 agent 里同理：跑 lint、跑测试，别信「我觉得没问题」。Harness 的工作就是 **把自述换成证据**——这是跟 prompt 工程 **正交** 的一条路，demo 全程 **零改 prompt** 就靠这个扭转局面。

> **金句 · Tejas**
> **中文：** 它在撒谎——因为它没验证；让模型说真话，得靠 harness 里的确定性检查，不是把 prompt 写得更凶。
> **原文：** It lies... it doesn't verify — this is the job of a harness.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 计算机使用智能体 | computer use agent | 通过浏览器/桌面自动化操作 UI 的 agent |
| 浏览器会话 | browser session | Playwright 封装的 Chromium 上下文与页面 |
| 追踪历史 | trace / history | 循环中累积的工具调用与模型事件，供 verify 查 |
| 朴素上下文压缩 | naive context compaction | 超限只留 system+user+最近 2 条，demo 级实现 |
| 最大尝试次数 | max attempts | harness 层重试上限，与单次 loop 内步数限制配合 |
| 确定性验证 | deterministic verification | 规则/code 查 trace，不用 LLM 自评成败 |

**本章小结**

- Demo 铁律：不动 prompt，只加 harness——结果可以从「撒谎成功」变成「诚实失败」
- GPT-3.5 + Playwright + 极简 prompt 足够说明问题：verify 是可靠性底座
- 护栏（步数/消息）+ 封装 runHarness，是把 agent 从脚本升级成框架的第一步

---

## 04 登录处理程序、OpenRAG，与 2027 动态 harness

**Host：** 诚实失败之后，怎么走到真点赞？登录这种敏感操作，为什么不能让模型自己填密码？OpenRAG 跟这场 demo 是什么关系？

**Tejas：** 最后一处改动：**登录处理程序**。在每个代理循环 **推 trace 之前**，先看浏览器 **当前 URL**。不在登录页？计算开销几乎为零，直接返回。在登录页？**Harness 程序化填凭据**——环境变量、密钥管理都行——**点提交**，再塞一条消息进队列：「我是 harness，我已登录，你现在可以继续了。」

**凭据从 harness 填，不从 agent 填。** 这个文件能碰 **密钥**，模型上下文里不该出现密码。敏感操作——登录、支付、发信——应该是 **确定性注入**，不是 prompt 里写「用这些账号」。既安全又省事：模型负责导航决策，harness 负责 **绝不能猜错** 的步骤。代理循环里，在 **推送 trace 之前** 调用登录处理程序——这就是 **把 agent 束缚在稳定、确定的东西上**。

第三跑：`npm run agent`。打开 HN，到登录页时 harness 介入，填表，提交，带回来，**六次迭代内真 upvote 成功**。那条帖子当时排第二，叫 Nilux 相关的话题——现场点进 HN， **确实点赞了**；我再 **取消点赞**，证明不是幻觉。智能体用我身份登录，通过 **我刚在台上搭的 harness** 完成任务—— **全程没动 prompt**。看你们点头的样子，对我来说就是天籁。

我为什么这么迷 harness？因为它们 **掌控着交付**。模型非确定，你想 **用更少资源做更多事**——那就上廉价模型、开源小模型，**好 harness 让你走很远**。Quinn、GPT-OSS 那种免费或便宜的模型，配对了框架，在企业里也能跑 **敏感域** 的活儿——前提是 harness 得 **够硬**。

IBM 做了开源 **OpenRAG**，在企业里部署：大型公司在 **私有、数据敏感** 的区域，对团队通话、PDF、发票各种东西做检索增强。RAG 流不流行另说，OpenRAG 的 harness **非常扎实**——查内部高度孤立的数据，有 **企业级安全** 那层壳。这就是 harness 工程在实践里的样子：跟 demo 里登录处理 **同一逻辑**——**敏感动作别交给概率模型**，交给 **你写的、可审计的代码**。

**Host：** 2027 动态 harness 听起来像 agent 先写计划再干活——跟现在的 plan 模式差在哪？

**Tejas：** Plan 模式常停在 **文本计划**；我说的 **动态即时 harness** 是 **可执行的约束**——护栏、验证、敏感步骤处理， **任务前生成**，任务后拆掉或归档。agent 得 **自知哪里可能幻觉**，先给自己造笼子再钻进去。买机票这种活，涉及支付、身份、日期——每一环都该有 **确定性检查点**。这是不是通用人工智能的必经之路？我不知道，但 **逻辑上说得通**，也比纯靠 prompt 赌命靠谱。

时间线是我个人判断，不是 IBM 官方水晶球：**2025 是 agent 之年**，我没忘；**2026 是 harness 之年**，我很确定——你们今天已经听过这个词无数遍了。再往前一步：**2027 若是动态即时 harness 之年**，就太酷了。

什么意思？你说：「帮我买张机票。」agent **开工之前** 先 **给自己生成一套 harness**——它有点 **自我意识**，知道「这儿我可能幻觉」，于是动态加护栏、加验证，干完活再带着结果回来。像 **计划模式**，但是 **加强版**：不是只列步骤，是 **生成真正的约束框架**，带着护栏一起回来。航班日期错了、护照字段填错、支付重复扣款——每一类风险都可以 **映射成 harness 里的一条确定性规则**，而不是祈祷模型「这次别幻觉」。我觉得这是朝通用人工智能走的 **下一合理一步**——也许只是我古怪，但我乐意看到它发生。

十八分钟我们走很远：什么是 harness、为什么、六件套、现场 demo、OpenRAG、年份预言。我名字 Tejas，发音常被拿来开玩笑——放心，我没有传染性，希望 **对 harness 的热情** 有一点。幻灯片在 GitHub，欢迎继续聊。今天若你只记得一件事：**我一次都没碰 prompt，只建了 harness，结果彻底变了。**

> **金句 · Tejas**
> **中文：** 2025 是智能体之年，2026 是安全框架之年——再往前，智能体可能在动手前先给自己造一层 harness。
> **原文：** 2025 was the year of agents... 2026 is the year of harnesses... 2027 dynamic on-the-fly harnesses.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 登录处理程序 | login handler | loop 内检测 URL，登录页则 harness 填表提交 |
| 确定性注入 | deterministic injection | 敏感步骤由代码执行，不交给模型生成 |
| OpenRAG | OpenRAG | IBM 开源企业 RAG + harness，私有数据域检索 |
| 廉价模型 | cheap / small model | GPT-3.5 等；好 harness 可放大其可用性 |
| 动态即时 harness | dynamic on-the-fly harness | 任务前按风险自生成护栏与验证（2027 展望） |
| 计划模式加强版 | plan mode on steroids | 不只规划步骤，还生成可执行的约束框架 |

**本章小结**

- 登录/凭据/支付：harness 确定性注入，密钥不进 prompt
- OpenRAG 把 harness 叙事落到企业私有 RAG 场景
- 2025 agents → 2026 harnesses → 2027 任务前自生成 harness，是 speaker 的前瞻押注

---

## 总结

| 维度 | 要点 |
|------|------|
| 动机 | 租来的黑盒模型变量太多；harness 赌 reliability，不是赌 prompt |
| 结构 | 六件套：工具、模型、上下文、护栏、loop、verify；harness 在 loop 外 |
| Demo | GPT-3.5 + HN 点赞；verify 让 agent 不撒谎；login handler 让任务真成 |
| 工程纪律 | 全程不改 prompt；incremental diff 加 guardrails → verify → 登录 |
| 企业实践 | OpenRAG：私有数据 RAG + 企业级 harness 安全壳 |
| 时间线 | 2025 agents / 2026 harnesses / 2027 dynamic on-the-fly harness（演讲者观点） |

### 对个人的启示

先给 agent 加 **verify** 再谈 prompt 狠不狠——查 trace，失败就显式 fail。敏感动作一律 **harness 化**：登录、付款、发信用 handler + secret。差模型值得试，别默认只有换 frontier 才能干活。

### 对团队/产品的启示

Agent 平台默认带 **护栏**（步数、消息、压缩）和 **可插 verify**；别把 harness 简化成「就是 agent loop」。企业场景看 OpenRAG 类 **数据隔离 + 策略壳**；路线图留 **动态 harness** 想象空间——任务前生成约束，而不是静态配置一辈子。

> **金句 · Tejas（封底）**
> **中文：** 我一次都没碰 prompt，只搭了 harness，结果彻底变了——可靠性是工程活，不是咒语活。
> **原文：** I did not touch the prompt once... Built a harness. And the outcome radically changed.

---

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 02:30 | 摆脱令牌租金：为什么我们需要 Harnes |
| 05:15 | 拆解 AI Harness 的六大核心组件 |
| 08:45 | 拒绝提示词依赖：用工程逻辑解决模型撒谎 |
| 13:20 | 确定性注入：Harness 如何处理敏感操作 |
| 17:40 | 2026 年将是 AI Harness 之年 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1eWGH6JE6m/ingest`
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV1eWGH6JE6m/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv49574059/
- **B 站**：https://www.bilibili.com/video/BV1eWGH6JE6m/
- **时长**：20:27

### 相关阅读

- [[MOC - Harness Engineering]] — Harness 横切索引  
- [[DeepMind-模型将吞噬Harness]] — Google 侧 harness 会被模型 upstream 吗  
- [[2026 年 Agent 最重要的工程概念 Harness Engineering]] — OpenAI 侧 harness 实验  
- [[DeepMind团队-当数百万Agent相遇]] — harness 与 agent 社会、human-in-the-loop  
- [[Cursor副总裁-构建软件开发过程的Agent]] — Cursor 把 harness 扩到 SDLC 各阶段  

---

### 收录说明

- **视频**：[BV1eWGH6JE6m](https://www.bilibili.com/video/BV1eWGH6JE6m/)（B 站 *Easonlee的AI笔记*）  
- **讲者**：Tade（Ta），IBM AI Developer Advocate  
- **时长**：~20:27  
- **转写**：Recastory `bilibili-retranscribe/BV1eWGH6JE6m/`（FunASR SenseVoice + cam++，**asr v2 后处理** 19 段）  
- **Demo 代码**：演讲提及 slides on GitHub（现场 poor man's harness 仓库）  
- **版本**：canonical Host-Guest v3.2（2026-07-03；原讲义已合并）

