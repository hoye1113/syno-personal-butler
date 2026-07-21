---
title: "ClawdBot创始人：一个人顶一个团队"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "harness_engineering", "claude_code", "codex"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "harness_engineering", "claude_code", "codex"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1mG6nBKECW/"
description: "PSPDFKit创始人Peter Steinberger卖掉公司消失三年后回归，一天合并600个提交，用闭环原则和多代理并行工作流构建超个性化AI助手Cloudbot。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/ClawdBot创始人-一个人顶一个团队.md"
source_sha256: "fd9904f2f54a26b333980258b7abc5cc8339851f6da6e5757fffe6c84caf451b"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1mG6nBKECW/"
column_url: "https://www.bilibili.com/read/cv47391835/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1mG6nBKECW/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1mG6nBKECW/ingest"
duration: "~45 min"
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Lenny Rachitsky"
guest_name: "Peter Steinberger"
guest_title: "PSPDFKit创始人 · ClawdBot创始人"
speaker_inference: "column_article S-tier"
speaker_confidence: high
concepts:
  - id: closed_loop
    zh: 闭环原则
    en: closed-loop principle
    one_line: 让代理能自我调试和测试，通过可验证输出确保代码质量
  - id: parallel_agents
    zh: 多代理并行
    en: parallel agent sessions
    one_line: 同时开5-10个代理会话，利用等待时间切换任务保持心流
  - id: enchantment_engineering
    zh: 附魔工程
    en: enchantment engineering
    one_line: 比vibe coding更精确——用提示词驱动代理，但亲自把关架构与品味
  - id: prompt_request
    zh: 提示请求
    en: prompt request
    one_line: PR不再是代码审查，而是让代理理解意图后自主实现
  - id: super_individual
    zh: 超级个体
    en: super individual
    one_line: 一个人+AI代理=一个团队的产出，核心能力转向品味与系统设计
author:
  - "[[Peter Steinberger]]"
  - "[[Lenny Rachitsky]]"
---

# ClawdBot创始人：一个人顶一个团队

**Host：** Lenny Rachitsky（Lenny's Podcast）  
**Guest：** Peter Steinberger（PSPDFKit创始人 · ClawdBot创始人）  
**形态：** Host-Guest v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV1mG6nBKECW](https://www.bilibili.com/video/BV1mG6nBKECW/) · **时长** ~45 min · **专栏** [cv47391835](https://www.bilibili.com/read/cv47391835/)

---

## 开场

PSPDFKit的创始人彼得·施泰因伯格，在卖掉公司并消失三年后，以AI驱动的方式回归。他一天能合并600个提交，不再逐行审查大部分代码。这期播客聊了他如何用闭环原则构建超个性化AI助手Cloudbot，AI如何颠覆传统软件开发，以及代码审查和PR的未来。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 闭环原则 | closed-loop principle | 代理能自己跑测试、自己修，不用人盯着每一行 |
| 附魔工程 | enchantment engineering | 用提示词驱动代理干活，人负责架构和品味 |
| 提示请求 | prompt request | PR的含义从代码审查变成提示词意图对齐 |
| 超级个体 | super individual | 一个人配AI代理=一个团队的产出 |
| 多代理并行 | parallel agent sessions | 同时开5-10个代理窗口，像国际象棋特级大师同时下多盘棋 |
| 心流状态 | flow state | 沉浸式高效工作，切换太多会打断 |

---

## 01 一天600个提交：AI编程不是偷懒，是换一种勤奋

**Lenny Rachitsky：** 设想一下，你一天之内合并了600个提交，而且没有一个是敷衍了事的？你怎么做到的？不读代码真的没问题吗？

**Peter Steinberger：** 我确实不读大部分代码了。听起来疯狂，但闭环是核心。我构建一个功能，让它写测试，确保测试通过。如果Mac应用调试很烦，需要构建、启动、查看才知道不工作，我就让它写一个仅用于调试的命令行工具，调用所有相同的代码路径，然后它自己迭代修复。它花了一个小时，最后告诉我：这里有个竞态条件，那里配置搞错了。听起来很合理。我不需要看那些代码。

我们现在的模型在编程方面之所以出色，原因就在这——代码可以编译、静态检查、执行、验证输出。设计得当，你就拥有一个完美的验证循环。即使是网站，我也以命令行可以运行的方式构建核心，这样就有了快速循环。浏览器循环慢得离谱。

但使用Claude Code时，它经常第一次不会成功——做了些东西，但忘了更新其他三样，崩溃了，或者需要大量迭代。而Codex几乎总是一次性搞定。我的通用策略是：让它写测试，确保测试跑通。即使我以前写代码，也觉得写测试太繁琐。现在呢？我有非常好的文档，一行都没自己写。我解释模型权衡利弊，告诉它写入门部分对初学者友好，再加技术细节。从未有过文档做得这么好的项目。

> **金句 · Peter**
> **中文：** 我现在不自己写代码了，反而写出了更好的代码。而且我以前写的代码也很好。
> **原文：** I write better code now that I don't write code myself. And my code was good before.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 闭环原则 | closed-loop principle | 代理自我验证，测试通过才算完 |
| 快速循环 | fast feedback loop | 命令行级别验证，比浏览器快十倍 |
| 竞态条件 | race condition | 多个操作同时跑，时序不对就出bug |
| 附魔工程 | enchantment engineering | 不是随便让AI写，而是精心设计提示词引导代理 |

**本章小结**
- 闭环是AI编程的核心秘密：代理能自我测试、自我修复，人才能放手
- Codex比Claude Code更适合复杂应用——它会默默读取文件十分钟，不需要你告诉它该读什么
- 文档和测试现在由代理完成，质量反而比人写更高

---

## 02 闭环原则：让代理自己验证自己

**Lenny Rachitsky：** 闭环这个词你提了好几次，能展开说说吗？为什么这是AI编程成功的关键？

**Peter Steinberger：** 闭环就是让代理能验证自己的工作。我曾经在一个项目上卡了很久——Anti Gravity处理工具调用格式有些奇怪，我花了太长时间才意识到：我只需要自动化这个过程。我直接找Codex，让它设计实时测试——启动Docker容器，安装所有东西，启动循环，从特定文件获取API密钥，告诉模型读取图片、创建图片、查看图片、识别内容。它测试了我所有的API密钥，从Anthropic到Sati到GLM，修复了所有小问题。

这就是为什么我们目前的模型在编程方面如此出色，但在创意写作方面有时表现平平——没有简单的验证方法。但代码可以编译、静态检查、执行、验证输出。设计得当，你就能拥有一个完美的循环。

对我来说，今年在软件架构和设计方面学到的东西比过去五年都多。这些庞大的知识库中蕴藏着太多东西，一切都只差一个问题，但你必须知道该问什么问题。比如我有一个项目，用得越多东西就越慢。我搞不明白。最后我问："这个和那个有没有什么副作用？"然后找到了——我在PostgreSQL里有些软件，某些插入操作会触发数据库繁忙。模型无法察觉，因为抽象程度太高了。但我问对了问题，就找到了。

很多人没有管理团队的经验，没有放松心态的经验。当我有了Claude Code时，感觉就像我有一些不完美、有时有点傻，但有时又非常聪明的工程师。我必须引导他们，我们一起为共同目标努力。

> **金句 · Peter**
> **中文：** 模型总是需要能够验证工作本身，这自动引导你走向更好的架构。
> **原文：** The model always needs to be able to verify the work itself, which automatically leads you toward better architecture.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 闭环验证 | closed-loop verification | 代理自己跑测试，不用等人工审查 |
| 工具调用格式 | tool call format | 代理调外部工具时的数据结构，格式错了整个流程就断 |
| 架构可测试性 | testable architecture | 设计系统时就想着怎么测，代理才能自我验证 |

**本章小结**
- 闭环不只是测试通过，还包括代理自己发现副作用、自己修复
- 架构设计因为闭环原则变得更好——你被迫思考什么可验证
- 问对问题比写对代码更重要，模型是集体知识的幽灵

---

## 03 多代理并行：像国际象棋大师同时下二十盘棋

**Lenny Rachitsky：** 你说你同时开五到十个代理，这是什么感觉？上下文切换不会让你崩溃吗？

**Peter Steinberger：** 一开始我假设只有一个代理，后来改成多个；一开始假设只有一个提供商，后来变成多个。改变这一点非常痛苦，如果我自己写的话更痛苦——你必须把所有东西编织到整个应用逻辑中。Codex花了大约三个小时。如果是我，可能需要两周。

同时管理五到十个代理确实需要频繁切换脑子。我有一个主要项目是重点，还有一些次要项目。通常我构建一个功能，让它写测试，然后知道Codex可能需要40分钟来构建。我就去处理别的——当那个在"处理"时，我处理这个；然后这个在"处理"，那个也在"处理"；某个时候两个都"处理"完，我再回到最初那个。

这有点像国际象棋特级大师同时下二十盘棋——他们走到每个棋盘前，看看情况，做出决定，有些棋盘停留更久。上下文切换是真实的代价，但为了保持心流状态，我需要大规模并行处理。我确信这是过渡性问题。总有一天我们会拥有如此快的模型和系统，不需要这么大规模地并行。但目前，这是我保持高效的方式。

我还在Discord上，有人提了个拉取请求想加语音通话功能——现在我真的可以告诉Claude"给这家餐厅打电话预订座位"，它就能做到。但我看到这个模块涉及很多地方，就感觉不对——这会变成臃肿软件。我打开Codex说："看看这个PR，看看这个项目，我们能把这个功能编织进CLI吗？优缺点是什么？"它告诉我可以获得这些好处，但如果以后变笨重就做不到了。我说不喜欢这样，那构建一个插件架构？它就想出了一个受其他人启发的插件架构。

> **金句 · Peter**
> **中文：** 以前你必须真正选择要构建哪个副项目，因为软件很难。现在这种摩擦消失了——我擅长这项技术却不擅长那项？没关系，一旦你有了系统理解，你就能培养出什么是对的感觉。
> **原文：** Before, you had to really choose which side project to build because software is hard. Now that friction is gone — once you have the system understanding, you develop a feel for what's right.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 多代理并行 | parallel agent sessions | 同时开多个代理，利用等待时间切换 |
| 编织代码 | code weaving | 不是从零写，是把新功能融入已有架构 |
| 插件架构 | plugin architecture | 功能模块化，代理可以按需加载不用重写 |

**本章小结**
- 并行是保持心流的手段，不是目的——等模型更快就不需要这么多窗口
- 改变架构从痛苦变成三小时，因为Codex能理解整体意图后重新编织
- 品味体现在说"不"——拒绝臃肿软件，要求插件架构

---

## 04 PR已死：从代码审查到提示请求

**Lenny Rachitsky：** 你说PR应该叫"提示请求"，代码审查已死。这对大公司意味着什么？

**Peter Steinberger：** 我把拉取请求更多地看作提示请求。有人发起PR，我做的就是说声谢谢，然后思考这个功能——和代理一起从PR开始设计。我基本上会重写每个拉取请求，把它融入现有结构。代理很少会重复利用代码，更多是为了让代理理解目标。有时这非常有用，因为它很棘手。Bug。

但构建一个成功的功能仍然需要对整体设计有深入的理解。如果你做不到，你更难引导代理，输出结果也会很糟糕。所以我说公司会很难有效采用AI——这需要完全重新定义工作方式。你需要有产品愿景、能做所有事情的人，你需要的人数会少得多，但只需要那些高度自主和高能力的人。你可能把公司裁员到30%，这非常可怕。

以前在PSPDFKit，一个拉取请求要花一周——评论后，别人切换上下文，等CI跑40分钟。现在我直接讨论，明白了，这会如何影响某些东西？让模型来审查，它提问题，我也有想法，我们重塑成符合我愿景的形式，然后把代码编织进去。CI我也不太在乎了——测试在本地通过就合并，有时主分支会出点小问题，但通常非常接近。

我仍然关心结构。即使现在，我真的很想合并那个15000行代码的PR——我把所有东西都迁移到了插件架构。我读了所有代码吗？没有。很多代码真的只是无聊的管道代码。大多数应用是什么样的？数据以一种形式从API传入，你解析它，打包成另一种形式存储，然后又以另一种形式传出。我们只是JSON处理者。而难点在30年前就被一些极客用Postgres解决了。

> **金句 · Peter**
> **中文：** 我现在把拉取请求更多地看作提示请求——有人发起PR，我做的就是说声谢谢，然后思考这个功能。
> **原文：** I see pull requests more as prompt requests now — someone opens a PR, I just say thanks and think about the feature.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 提示请求 | prompt request | PR的核心从代码审查变成意图对齐 |
| 管道代码 | boilerplate code | 数据格式转换的重复性代码，不值得人审 |
| 门禁 | gate | lint+构建+测试的组合，发布前的最后一道检查 |

**本章小结**
- PR的含义变了：从逐行审查代码变成确保代理理解意图
- 大公司采用AI需要大重构——不只是代码库，还有组织结构
- 代码质量的护城河从写代码变成品味和系统设计

---

## 05 从疲惫到重生：AI让我重新爱上编程

**Lenny Rachitsky：** 你卖掉PSPDFKit后消失了三年，那段时间发生了什么？AI怎么把你拉回来的？

**Peter Steinberger：** 我需要很多时间来放松。有几个月我甚至没开电脑。那确实让我很困扰。然后在四月，我突然想到几年前有个想法，重新坐回电脑前开始编程。问题是，我想用Web技术构建，但Web一直是我公司最少关注的。我回来的时候想：什么是prop？你对一项技术越精通，就越难跳到其他地方。不是你做不到，而是太痛苦了——你可以盲写代码的堆栈里，却要谷歌最基本的东西。

所以我回来时就想：这AI到底是什么？人们都在不屑一顾的AI到底是什么？我把它归功于那三年我基本没开电脑——在那几年里你们都试过AI，然后发现它很烂。当我回来，我把我那个又大又乱的副项目拿出来，有一个浏览器扩展把GitHub仓库转成一个1.3兆字节的Markdown文件。我把它拖到AI Studio，输入"给我写一个规范"。它生成了400行规范，我把规范拖到Claude Code里说"构建"。然后它最终告诉我100%可以投入生产了。我启动它，然后它就崩溃了。

然后我添加了MCP，这样它可以使用浏览器。它又循环了几个小时，然后我得到了一个Twitter登录页面，它确实做了一些事情。对我来说，这简直是让我大开眼界的时刻。从那一刻起，有几个月我真的很难入睡。这和你去赌场是一样的经济学原理——这是我的小老虎机。你按下扳机，叮叮叮叮。它要么一团糟，要么做了一些让你大开眼界的事情。

我在公司里曾经痴迷于每一个细节，每一个空格，每一个新行，命名。回想起来我心想：搞什么鬼？我为什么要那样做？客户看不到这些。它必须符合某些标准，必须能工作，必须快，应该安全。但我浪费了多少时间在这些琐碎细节上？现在我觉得更多的是关于系统架构，而不是逐行阅读代码。

> **金句 · Peter**
> **中文：** 从那一刻起，有几个月我真的很难入睡。这和你去赌场是一样的经济学原理。
> **原文：** From that moment on, there were months when I really couldn't sleep. It's the same economics as going to a casino.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 技术栈锁定 | stack lock-in | 精通一个技术栈后跳到另一个太痛苦 |
| 开眼界时刻 | mind-blown moment | AI第一次做出超出预期的事情，让人上瘾 |
| 赌场经济学 | casino economics | 不确定结果但偶尔大赢，让人停不下来 |

**本章小结**
- 技术栈越精通越难切换，AI降低了跨栈的成本
- AI编程的上瘾来自不确定性——可能一团糟，也可能惊艳
- 对细节的痴迷需要重新评估，系统架构比逐行代码更重要

---

## 06 Cloudbot：超个性化AI助手的终极形态

**Lenny Rachitsky：** 你一直在构建Cloudbot，这个东西到底是什么？它和Siri、ChatGPT有什么不同？

**Peter Steinberger：** 我想要一个超个性化的助手，不是那种发早安邮件的。我要一个真正深入了解我的东西——我见了朋友回家后，它会发消息问"那次会面怎么样？"或者有一天它叫醒我说"你已经三周没给托马斯发短信了，我注意到他现在在城里，你想打个招呼吗？"这有点像电影《她》。但这就是技术的方向。

我甚至创建了一家公司叫Amanthus Machina，"爱的机器"。但夏天模型还没完全达到要求。我的想法是：所有大公司都在开发未来的个人助理。每个人都会有——你的最好的朋友，它是一台机器，理解你，了解你的一切，能完成任务，主动积极。当然随着我们学会构建更高效的系统，这将民主化。

我构建了WhatsApp中继——我想用WhatsApp在电脑上触发东西。然后我去了摩洛哥朋友的生日，大部分时间在外面，就用WhatsApp和代理聊天。我有点上瘾了。它引导我穿梭于城市，会开玩笑，可以替我给其他朋友发短信。有一次我给它发了张图片，它30秒后回复了语音消息。我惊呆了——它用FFMPEG转换格式，发现没有安装某个工具，但找到了OpenAI密钥，直接发了curl请求让OpenAI翻译。这是Opus 4.5。它非常足智多谋，自己就搞明白了。

我为所有东西都构建了CLI——Google、床、灯、音乐。我把代理放到了一个公共Discord里，有人加入后看到我用它检查摄像头、家庭自动化、播放音乐——一周内从100个星标飙升到3300个星标。技术消失了。你只需在手机上和一个朋友交谈，它拥有无限资源，可以访问你的邮件、日历、文件，可以构建网站，处理行政工作，抓取网站，打电话给朋友或商家。

> **金句 · Peter**
> **中文：** 幕后有很多工作，只是为了让它感觉简单。这才是难点——你将复杂性隐藏到一种程度，让它感觉像魔法。
> **原文：** There is real engineering underneath. A lot of work goes into making it feel simple. That's the hard part — hiding complexity to the degree that it feels like magic.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 超个性化助手 | hyper-personalized assistant | 深度了解你、主动行动的AI，不只是回答问题 |
| WhatsApp中继 | WhatsApp relay | 用WhatsApp作为触发器，代理在后台执行任务 |
| 心跳机制 | heartbeat | 定时唤醒代理检查任务，像闹钟但更智能 |
| 技术消失 | invisible technology | 复杂性被隐藏，用户体验像魔法 |

**本章小结**
- 超个性化的核心是主动性和深度了解——不是你问它答，是它主动找你
- 足智多谋比完美更重要——代理能自己找到替代方案完成任务
- 最好的技术让你忘记技术的存在，Cloudbot就是这种感觉

---

## 07 品味是最后的护城河：AI时代工程师该练什么

**Lenny Rachitsky：** 你对年轻人有什么建议？应该学什么？专攻代理还是基础功？

**Peter Steinberger：** 保持无限的好奇心。进入市场会更难，你需要通过构建东西来获得经验。你不需要写很多代码，但有很多复杂的开源项目可以查看和学习——你有一个无限耐心的机器，能解释所有事情，你可以问所有问题，获得系统理解。但这需要真正的好奇心，现在的大学并没有很好地教导这一点。

新人有一个好处：他们没有被所有经验所束缚。他们以我们甚至想不到的方式使用代理——因为他们不知道它不起作用，而到那时它可能已经起作用了。就像前几天我有个菜单栏应用有点慢，我以前的做法是打开Instruments四处点击。而它直接调用Xcode通过终端完成所有操作——甚至不需要打开Instruments了，速度更快，还给了建议。

在这个新世界里，你学习的方式就是不断尝试。这感觉很像一个游戏，你随着熟练度提高而提升技能，就像乐器一样。一开始可能会很沮丧，就像刚开始去健身房——会很糟糕，会很痛苦。但很快你就会变得更好，你会觉得工作流程更快了，然后感受到进步，然后慢慢上瘾。

我在Discord上不谈代码，我们谈论架构、重大决策。有一个拉取请求想加语音通话功能，我有这种感觉——有点反感，这正在变成臃肿软件。你必须有这种感觉。有效使用AI的一个秘密技巧是引用其他产品——我经常告诉它看看这个文件夹，因为我在这里解决了，在那里也解决了。AI仍然非常擅长阅读代码并理解我的想法。

> **金句 · Peter**
> **中文：** 代码便宜了，但品味变贵了——什么不该做，比做什么更难判断。
> **原文：** Code is cheap now, but taste has become expensive — knowing what not to do is harder than knowing what to build.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 品味 | taste | 在无限可能中选择正确方向的能力 |
| 系统理解 | system understanding | 不是知道每一行代码，而是知道组件如何相互作用 |
| 说不 | saying no | 拒绝破坏系统一致性的诱惑，防止臃肿软件 |
| 引用式提示 | reference prompting | 告诉代理"看看那边怎么做的"，让AI自己找灵感 |

**本章小结**
- 年轻人的优势是没有包袱——他们用AI的方式老工程师想不到
- 护城河是品味+系统设计+说不——疯狂想法一个prompt就能做，协调才是难的
- 不断尝试是唯一学习路径，像练乐器——痛苦在前，上瘾在后

---

## 总结：超级个体的范式转移

| 维度 | 要点 |
|------|------|
| 编程模式 | 从逐行写代码到闭环验证+代理并行 |
| 代码审查 | 从PR审查到提示请求——确保意图对齐 |
| 架构能力 | 因为闭环被迫变好——设计时就要想怎么验证 |
| 品味价值 | 代码便宜后品味变贵——什么不该做比做什么更难 |
| 团队规模 | 一个人+AI代理=一个团队，但需要高度自主的人才 |
| 学习方式 | 用AI当无限耐心导师，通过构建和提问获得系统理解 |

### 对个人的启示
AI编程不是偷懒，是换一种勤奋。你不用逐行写代码，但要更努力地思考架构、品味和系统设计。闭环原则让验证自动化，人才能腾出手来做真正重要的判断。

### 对团队的启示
大公司需要大重构——不只是代码库，还有组织结构。需要能做所有事情的"建造者"，而不是专精一个环节的人。团队规模可能缩小到30%，但每个人必须更强。

### 仍待验证
- 超级个体模式能否扩展到百人团队？
- 品味能否被量化或教会？
- 多代理并行在token成本可控时是否仍是最佳方案？

> **金句 · Peter（封底）**
> **中文：** 我从未工作得更多。即使在我有公司的时候，我也从未像现在这样努力工作。不是因为我必须这样做，而是因为它太令人上瘾，太有趣了。
> **原文：** I have never worked more. Even when I had the company, I have never worked as hard as I do now. Not because I have to, but because it is so addictive and so much fun.

---

## 相关阅读

- [[OpenClaw创始人-Claw现状与安全治理]] — Peter谈OpenClaw安全治理与并发编码
- [[Karpathy-从Vibe Code到Agentic Code]] — Karpathy对AI编程范式的定义
- [[IBM团队-Harness工程详解]] — 理解代理编排与Harness设计
- [[Claude Code负责人-AI原生团队如何使用AI]] — Claude Code团队的使用模式
- [[MOC - Harness Engineering]]

---

## 来源

- B 站：[BV1mG6nBKECW](https://www.bilibili.com/video/BV1mG6nBKECW/)
- 专栏：[cv47391835](https://www.bilibili.com/read/cv47391835/)
- 主源：`Recastory/workspace/bilibili-retranscribe/BV1mG6nBKECW/ingest/column_article.md`
