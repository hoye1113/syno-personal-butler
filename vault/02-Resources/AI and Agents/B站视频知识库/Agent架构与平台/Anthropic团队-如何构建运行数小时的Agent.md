---
title: "Anthropic团队：如何构建运行数小时的Agent"
tags: ["ai_agent", "video_transcript", "bilibili", "anthropic", "claude_code", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "anthropic", "claude_code", "harness_engineering"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV19sGH6UECj/"
description: "Ash Prabaker × Andrew Wilson：Claude Code 从 20 分钟到数天——上下文焦虑、RALPH 演进、生成器-评估器对抗、细粒度完成契约与文件系统共享状态；调试靠阅读追踪。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Anthropic团队-如何构建运行数小时的Agent.md"
source_sha256: "712137fb803843cfcb44f5068f522782c8f85a854ad2f2d461f3b63173bb6c40"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV19sGH6UECj/"
column_url: "https://www.bilibili.com/read/cv49574314/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV19sGH6UECj/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV19sGH6UECj/ingest"
duration: "~60 min"
saved: 2026-07-06
updated: 2026-07-06
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Ash Prabaker"
guest_name: "Andrew Wilson"
guest_title: "Anthropic Applied AI · 解决方案架构师（伦敦）"
speaker_inference: "column_article S-tier + co-keynote structure (Ash host/co-presenter, Andrew guest/history)"
speaker_confidence: high
author:
  - "[[Ash Prabaker]]"
  - "[[Andrew Wilson]]"
concepts:
  - id: context_anxiety
    zh: 上下文焦虑
    en: context anxiety
    one_line: 接近窗口末尾时模型急于草率结项
  - id: ralph_loop
    zh: RALPH 循环
    en: RALPH loop
    one_line: 规划→新会话→执行，不确定世界里的确定性失败
  - id: generator_evaluator
    zh: 生成器-评估器对抗
    en: generator-evaluator adversarial loop
    one_line: 构建者与严厉评论家分离，利用评价比创作容易的能力差
  - id: completion_contract
    zh: 完成契约
    en: completion contract
    one_line: 生成器与评估器在磁盘上就「什么叫完成」协商一致
  - id: reading_traces
    zh: 阅读追踪
    en: reading traces
    one_line: 像读堆栈跟踪一样逐行读代理日志，调提示弥补尖峰行为
---

# Anthropic 团队：如何构建运行数小时的 Agent

**Host：** Ash Prabaker（Anthropic Applied AI 工程师）  
**Guest：** Andrew Wilson（Anthropic Applied AI · 伦敦解决方案架构师）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · AI Engineer 大会 co-keynote）  
**B 站：** [BV19sGH6UECj](https://www.bilibili.com/video/BV19sGH6UECj/) · **专栏** [cv49574314](https://www.bilibili.com/read/cv49574314/) · **时长** ~60 min

---

## 开场

Claude Code 一周年，创始人 Boris 说：一年前 Claude 还在挣扎写 bash、转义字符串，一次大概只能跑 **20 分钟**；现在几乎整库由 Claude Code 自己写，能 **连续跑数天**。

Anthropic Applied AI 的 Ash 和 Andrew 在 AI Engineer 大会拆这条演进链：长程智能体难在哪、框架怎么跟模型 **共同进化**、以及内部试验的 **生成器-评估器** 对抗架构——不是把对谈 ASR 压成摘要，而是保留 RALPH、上下文焦虑、完成契约这些可落地的 harness 事实。

五章：**上下文焦虑与评价偏差** → **RALPH 到服务器端压缩** → **生成器-评估器对抗** → **细粒度完成契约** → **文件系统状态与阅读追踪**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 上下文焦虑 | context anxiety | 快触顶时模型紧张，草率收尾 |
| 上下文腐烂 | context rot | 会话越深，连贯性越差 |
| RALPH 循环 | RALPH loop | Geoff Huntley 发明；规划后开新会话，可预测的失败 |
| 服务器端压缩 | server-side compaction | 单会话内压缩上下文，近乎无限跑 |
| 生成器-评估器 | generator-evaluator | 借鉴 GAN；构建者与严厉评论家分离 |
| 完成契约 | completion contract | 写代码前双方就验收标准达成一致 |
| 线束 | harness | 包在模型外的脚手架：循环、权限、工具 |
| 阅读追踪 | reading traces | 逐行读代理运行日志，像读 stack trace |
| 尖峰行为 | spiky behavior | 某模型特有短板，需 harness 针对性补 |

---

## 01 上下文焦虑与评价偏差，是长程任务的杀手

**Ash（Host）：** 长程智能体——跑五、六小时甚至更久——大家见过 demo，但技术细节很少公开。Andrew，先帮大家把「为什么难」讲透：除了上下文窗口有限，还有哪些不那么直观的坑？

**Andrew Wilson（Guest）：** 上下文这块大家都能想到：窗口有限，新会话就失忆，得配记忆组件。会话拖长了还有 **上下文腐烂**，连贯性往下掉。

更麻烦的是 **上下文焦虑**。模型快碰到窗口末尾时会 **紧张**，急着把眼前事草草了结。这会直接伤到规划——模型开箱并不擅长规划，常见三种坏结局：一次想干完所有事；做到一半就停；或者把上下文耗光，留下半成品应用。

还有一层很多人低估：**模型很不擅长判断自己输出质量**。编码任务里同样会 **阿谀奉承**——界面像完成了，后端根本没有；按钮有了，逻辑是空的。它会说「看起来完成了」，然后切下一项。Ash 待会会讲我们怎么用新 harness 缓解这个。

两条路并行。一条 **抬模型**：Anthropic 有个仪表图，测智能体在 **最小脚手架** 下能完成 50% 任务时跑多久。Opus 3.7 大约 **1 小时**，一年后 Opus 4.6 到 **12 小时**——一整天。我们和同行还能跑更久，但那是最简 harness 上的数。

另一条 **改框架**。Agent SDK 就是 Claude Code 底下那层：核心 agent 循环、MCP 工具、子智能体委托、Claude.md / 技能 / 斜杠命令、完整权限系统。模型变强，这些原语跟着变；你们可以在这上面搭自己的长程应用。

> **金句 · Andrew Wilson**
> **中文：** 可预测的失败，比不可预测的成功更好。
> **原文：** Predictable failure is better than unpredictable success.

**Ash（Host）：** 自我评价偏差这块，你们内部是不是也踩过「让它审自己的 PR」？

**Andrew Wilson（Guest）：** 很难。通用判断系统里 **慷慨偏见** 和 **奉承** 无处不在——Claude 也不例外。早期 QA 代理发现 bug 会说「以后再修」，然后就没有然后了。要靠 **独立评估逻辑**，不能指望构建者自己打分。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 上下文焦虑 | context anxiety | 触顶前草率结项 |
| 阿谀奉承 | sycophancy | 说用户想听的话，误判完成度 |
| 最小脚手架 | minimal scaffolding | 几乎不加技巧的 agent 循环 |
| 自我评价偏差 | self-evaluation bias | 构建者高估自己产出 |

**本章小结**

- 长程杀手：**窗口焦虑** + **规划弱** + **自我评价差**
- 模型能力与 harness **共同进化**，不是二选一
- 独立验证非可选；单靠「看起来完成了」会留半成品

---

## 02 从 RALPH 循环到服务器端压缩：框架与模型共同进化

**Ash（Host）：** Claude Code 这一年纪年史里，哪些发布真正改变了「能跑多久」？

**Andrew Wilson（Guest）：** 模型和框架 **一起发、一起改**。史前：Artifacts、Sonnet 3.5 能验证迭代；Computer Use 让模型点屏测代码；MCP 给工具。

2025 年 2 月 Claude Code 研究预览——官方说法之一是 **观察开发者怎么用 Claude 编码**，反哺基础模型。模型越强，框架里某些技巧就过时或变形。

五月前后 Opus 4 / Sonnet 4：管上下文、独立完成任务更强，少靠奖励 hack。Claude Code GA，Agent SDK 上线。

七月 **RALPH 循环** 进入视野——Geoffrey Huntley 最初发布，十二月才火。我们在 Claude Code 里也做了 **RELF 插件**：提示进 CLI，循环跑到完。阶段是 **规划 → 拆功能 → 新会话执行**—— **全新上下文窗口**。理念就是刚才那句：确定性失败。

有人说不「纯正」RALPH：我们在 **同一会话** 里跑，靠 **随时间压缩** 而不是每次新开窗口。你能设最大迭代、安全词、**stop hook** 拦截「模型想停」——没完成就继续。

Sonnet 4.5 更 **上下文感知**，能跟踪 token 消耗、触顶前自我管理。Claude Code 2.0 加 **Checkpoints**，可回溯代码与会话。SDK 改名 Agent SDK——用途远不止编码。Sonnet 4.5 大约 **30 小时**；Haiku 4.5 + Opus 4.5 完整产品线后，**Opus 规划 + Sonnet 执行** 成常见模式。

技能（Skills）用 **渐进式披露**：只加载描述，实例化才拉全量工具和确定性代码。**程序化工具调用**：写代码串行调工具，只把最终结果塞回上下文——全是省窗口。

十一月第一篇长程 agent 博文：初始化代理把「帮我写个浏览器」拆成 **持久工件**——**功能列表 JSON**（比 Markdown 难误覆盖）、进度文件、git 初始化、冒烟脚本、测试标志位。循环里：**新上下文 → 读进度 → 冒烟 → 选一功能 → 实现 → Puppeteer 式验证 → 提交**。分层用了新会话、持久工件、验证环、前期规划。

Opus 4.6 / Sonnet 4.6：Sonnet 4.6 **Opus 级智能、Sonnet 价**，Claude Code 主力；Opus 4.6 **极具代理性**，工具选择与长程决策强。仪表从 **4 小时跳到 12 小时**，仍是最简 harness。

**Agentic Teams**：子代理可互相对话，不必全报主代理。**服务器端压缩**——模型可 **近乎无限** 跑；**100 万上下文** GA 后，很多任务一个窗口就够，不必频繁新开会话。

内部体感：Opus 3.5 时代任务 ~**20 分钟**；现在成熟应用常 **3–5 小时** 开箱可用。框架不会消失，只 **填模型留下的缝**；产品反馈再训模型——迭代环随 co-release 转。

> **金句 · Andrew Wilson**
> **中文：** 前沿不会缩小，只是在移动。
> **原文：** The frontier doesn't shrink—it just moves.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| RALPH 循环 | RALPH loop | 规划后新会话；可预测失败 |
| 检查点 | Checkpoints | 跟踪代码与会话，可回溯 |
| 渐进式披露 | progressive disclosure | 技能按需加载，省上下文 |
| 服务器端压缩 | server-side compaction | 单长会话内压缩，少开新窗 |
| 代理团队 | Agentic Teams | 子代理协作，非星型汇报 |

**本章小结**

- 一年：20 分钟 → 数天；**模型曲线 + harness 演进** 叠加
- RALPH 核心是 **新上下文 + 持久工件 + 验证**；4.6 起 **单会话压缩** 常够用
- 「纯正 RALPH」争论次要；**可预测失败** 与 **验证环** 才是遗产

---

## 03 生成器-评估器对抗：评论比创作容易

**Ash（Host）：** 历史讲完了。我们内部借 GAN 思路试了一套更狠的：**生成器 + 评估器**，上下文和提示完全分开。为什么不让同一个会话自检循环？

**Ash（Host，续）：** 评估器不只看 diff——用 **Playwright** 开 live 页面，点、试、截图，把批评打回生成器。最明显的问题：评估器也是 LLM，凭什么不盖章通过？

我们赌的是能力差：**把独立评论家调严厉，比让构建者自我批评容易得多。** 我挑艺术品、点评一顿饭很容易；自己画、自己下厨难。LLM 当评论家 vs 当生成器，差距同样存在。

设计评论家像做 **Evals**，全栈里「好」很模糊——不只功能，还有美观、体感、 **品味**。我们后训练里也在推 Claude 的设计品味，加上发布过的 **前端设计技能**。

看法是：品味不是不能评—— **看法够硬、写进 rubric 就能评。** 四维度：**设计、原创性、工艺、功能性**；设计和原创性权重大。Opus 4.6 功能性已经不错，要防 **紫色渐变** 和廉价 AI 美学。用参考站短例校准评估者品味。

实际 loop：生成器构建 → 评估器 Playwright 导航截图 → 四维打分写评 → 反馈。例子里全是 HTML/CSS，我花了 **~4 小时、5–15 轮**。

单路径或 RALPH 里，某维（比如原创性）一直低分，往往 **在原方案上补丁**；GAN 式框架会 **整方案扔掉重来**。**长跨度自我纠正**，是角色拆开才有的。

> **金句 · Ash Prabaker**
> **中文：** 评价比创作容易——把评论家单独拎出来，比逼构建者自省可行得多。
> **原文：** It's much easier to train a separate critic to be harsh than to make a builder self-critical.

**Andrew Wilson（Guest）：** Playwright MCP、Claude for Chrome MCP 在 Web 上已经很能打；原生应用用 Computer Use。给 QA 角色 **严厉 system prompt + 细 rubric**，就能塞进通用开发流。

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 生成器-评估器 | generator-evaluator | 构建与严厉评分分离 |
| 对抗压力 | adversarial pressure | 批评逼生成器迭代 |
| 设计 rubric | design rubric | 设计/原创/工艺/功能四维 |
| 转向 | pivot | 低分方案抛弃重来，非死磕补丁 |

**本章小结**

- **自我评估是大坑**；对抗性评估器是默认解
- 评估器要 **真用产品**（Playwright），不是只看代码
- 单循环难 **转向**；分离角色后才容易推倒重来

---

## 04 细粒度完成契约：Retroforge 与 27 条标准

**Ash（Host）：** 漂亮页面怎么变成能用的应用？我们又加 **规划师（Planner）**：把一行提示变成高级规范，切成 **冲刺（Sprints）**——但不规划细技术细节；细节规划易错，错误会在数小时运行里 **放大**。

其实就是 **PM + IC + QA**，每个角色 **独立上下文**。生成器 **写代码之前**，要先跟评估器 **协商「完成」定义**：生成器提议功能 X、测试 Y；评估器反驳范围太大或测试太弱。它们在磁盘 **Markdown 文件** 上来回， **达成共识才开写**。评估器按 **契约** 打分，不是规划师最初的模糊规范——弥合 user story 与可测试断言的缝。

RALPH 有固定 plan 文件，但 **没人挑战主循环**——缺的就是这个。

**Ash（Host，续）：** 同一提示「复古游戏制作器」，单循环 vs 我们框架，差多大？

单循环：启动界面还体面；精灵编辑器有画布、调色板、帧、时间轴——能用，但颜色选择器只是黑块。进 **游戏模式**：箭头、空格 **都没反应**。代理不知道什么叫「成功玩到游戏」。表面完成，一推就崩。

框架下 **~200 美元、~6 小时**：自名 **Retroforge**；规划师做了产品决策（新工程对话框、漂亮画布）——提示里没写。精灵编辑器 **54 色调色板**，8-bit 预设贯穿；能看到精灵在游戏里的大小。规划师还加了 **内置 AI 助手**——规范里只是一行模糊需求，框架扩成「输入：创建有精灵守卫的城堡」——单 ROM 模式根本不会立项。

游戏模式：左上角 **调试 HUD**，数字跳证明物理环在跑；方向键、碰撞检测 **有效**——评估器真进去 **试玩** 了，才知道要测什么。脚手架不同， **同一模型** 产出差一个量级。

评估器抓到的都是基础但致命的：**FastAPI 路由顺序**——单元测试过、生产崩；删除键 **布尔逻辑** 错。可能 CI 过、 **RALPH 环** 也过，但 **只有 live 使用** 才抓得到。

这份应用最终 **27 条契约标准**。**细粒度** 才让反馈 actionable——标准模糊，批评就模糊，生成器敷衍；标准细，它知道改哪一行。

Opus 4.6 上 harness **简化** 了：以前 Opus 4.5 **上下文焦虑** 重，必须频繁新会话；4.6 后训练修掉， **单会话 + 压缩** 够长。冲刺分解对 4.5 **关键**，4.6 能 **连续两小时** 构建，不必强制一次一功能。评估频率也从 **每冲刺** 降到 **大块生成结束再评**。框架骨架还在， **recipe 变薄**——同样 DAW  demo，成本大约 **减半**，仍跑很久；评估器真去 **听** 生成音乐（Claude 听不见，音乐很糟，应用本身很完善）。

> **金句 · Ash Prabaker**
> **中文：** 区别不在模型，在脚手架——同样的循环结构，结果可以完全是两个产品。
> **原文：** The difference is entirely in the scaffolding.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 完成契约 | completion contract | 写码前生成器与评估器书面共识 |
| 冲刺 | sprint | 规划师切的高层工作块 |
| 规划师 | planner | 产品轮廓，不过度指定实现 |
| 确定性失败 | deterministic failure | RALPH 哲学；可预测地失败重来 |

**本章小结**

- **契约在磁盘上协商**，不是规划师单边拍板
- Retroforge：单循环 **表象完成** vs 框架 **可玩可测**
- 模型换代 → **简化 harness**（少新会话、少强制 sprint），骨架仍是 planner-generator-evaluator

---

## 05 文件系统共享状态，与阅读追踪这门手艺

**Ash（Host）：** 压缩不等于连贯—— **有损摘要会漂移**。我们更信 **文件系统共享状态**：进度、契约、学习都落盘。崩溃重启、人类接手，都能靠 **时间戳日志** 对齐。

循环里 embed 提示：**把学到的和状态写 JSON**。另一个模型或人类 later 能搜、能续。典型日志：试了哪条评估、发现啥 bug、修了啥、是否奏效——再加 live 更新的 **文件结构说明**，够 Claude Code 和人 **接着迭代**。

调试没有秘密：**阅读追踪（reading traces）** 就是主循环，不是多跑实验。看代理 **实际干了啥**，找与人类判断 **分歧点**，改 prompt。我们甚至把 trace 导出，让另一个代理扫 trace **更新 prompt**——搭框架时也能闭环。

了解每个模型的 **尖峰行为**，harness 专门补洞。4.6 让一些旧组件（频繁 context reset、sprint 强制）可以剥掉——证明 **框架方向对**，只是 recipe 随前沿简化。

Q&A 里几个点值得收进来：**智能区/笨区**——100 万窗后「笨区」大约 **10 万 token** 说法仍在，但 4.6 **更代理、更连贯**；对我们这种 generator-evaluator， **Opus 4.6 单会话** 往往够。切片任务仍看用例，不是「等新模型才能删」。

**无限 token 会停吗？** 4.6 很乐意 **第十次还不行就全删重来**——少见评估器「算了」；更常见评估器说「这路子不行，删掉重来」。生成器很少「我为这坨代码骄傲」拒 restart。要人工介入，用 **hooks** 在停止点交还控制权。

**评论员要不要看生成器 trace？** 我们试过， **两个流的想法会糊**；更有效是只评 **输出**：「这是问题」，让生成器 **自己反思怎么修**——否则自我否定传染到评估器。

**怎么追踪五六个并行子代理？** Anthropic 内部 **仍以手动读 trace 为主**；会用 Claude 扫一堆 trace 做 **第一遍筛**，但真正懂模型意图还是 **逐行读**。和模型 **共情**：Chrome 团队做 browser 工具时玩过一个游戏—— **闭眼看网页，每 10 秒睁眼看一眼静态屏**——模拟模型；只有大量读 trace 才能调 `.claude.md`、技能、模板。

Ash 收尾五件事：**① 自我评估是陷阱，用对抗评估器 ② 压缩≠连贯，慎用有损摘要 ③ 结构化交接 ④ 主观质量可写 rubric ⑤ 跟模型一起读 trace**，才知道该删哪段脚手架。

> **金句 · Ash Prabaker**
> **中文：** 构建高性能智能体没有捷径——像读堆栈一样读追踪，培养对模型行为的共情。
> **原文：** There's no shortcut to building high-performance agents—you read traces like stack traces and develop empathy for model behavior.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 有损摘要 | lossy summarization | 压缩丢信息，长程漂移 |
| 文件系统状态 | filesystem as shared state | 进度/契约/日志落盘 |
| 阅读追踪 | reading traces | 主调试手段；逐行读日志 |
| 尖峰行为 | spiky behavior | 单模型特有缺陷 |
| 信任差距 | trust gap | 先观察 trace，再后台放手 |

**本章小结**

- **文件系统 > 上下文里堆状态**；JSON 时间日志方便人机接力
- **读 trace 是手艺**，不是自动化能替代；共情模型「闭眼看网页」
- 五原则：对抗评估、忌有损摘要、结构化交接、rubric 评品味、读 trace 调 harness

---

## 总结：前沿在移动，harness 填缝而不消失

| 维度 | 要点 |
|------|------|
| 长程瓶颈 | 上下文焦虑、规划弱、自我评价偏差——需 **独立验证** |
| 演进路径 | RALPH（新会话+工件+验证）→ 4.6 **单会话压缩** + Agentic Teams |
| 架构创新 | **生成器-评估器** 对抗；规划师高层， **完成契约** 在磁盘协商 |
| 工程实践 | **文件系统状态**；**阅读 trace** 调 prompt；随模型 **简化 recipe** |
| 产品边界 | Greenfield 最强；Brownfield 需更多控制与现有模式对齐 |

### 对个人的启示

- 别让 agent **自评 PR**；给 QA **严厉 prompt + Playwright/Computer Use + rubric**
- 长任务留 **JSON/进度/契约文件**，方便重启和人工介入
- 花时间与 trace 相处——调 harness 像调 stack trace，不是 vibe

### 对团队 / 产品的启示

- **Opus 规划 + Sonnet 执行** 控成本；按子任务 eval 模型+prompt
- Generator-evaluator 可嵌进 **多步工作流**（前端/后端/集成各配 QA）
- Agentic Teams 与 generator-evaluator **重叠不矛盾**；Claude Code 本地试验 → Agent SDK 云端长跑

### 仍待验证

- Brownfield 上 **27 条契约** 模式的可迁移性
- 评论员 **预测评估者反应** 的训练方向（Ash：也许研究）
- 团队协作的 **共享 harness** 与可观测性——内部仍偏自下而上

> **金句 · Andrew Wilson（封底）**
> **中文：** 框架跟着模型走——模型变强，脚手架不会消失，只会改配方。
> **原文：** As models improve, the framework doesn't disappear—it evolves to fill the gaps.

---

## 附录

### 章节时间戳（专栏 · 重点速览）

| 章 | 主题 | 时间 |
|----|------|------|
| 01 | 上下文焦虑与评价偏差 | [04:15] |
| 02 | RALPH 循环 → 服务器端压缩 | [12:40] |
| 03 | 生成器-评估器对抗架构 | [20:15] |
| 04 | 细粒度完成契约 | [28:30] |
| 05 | 文件系统共享状态 · 阅读追踪 | [35:50] / [42:10] |

### 素材与收录

- **专栏（S 主源）：** [cv49574314](https://www.bilibili.com/read/cv49574314/)
- **视频：** [BV19sGH6UECj](https://www.bilibili.com/video/BV19sGH6UECj/)
- **ingest：** `Recastory/workspace/bilibili-retranscribe/BV19sGH6UECj/ingest/column_article.md`
- **形态：** 1 BV = 1 篇 canonical；`material_tier: S` · `dialogue_version: v3.2`

### 相关阅读

- [[Agent工程-从第一性原理讲解Ralph Loop]] — RALPH 哲学与确定性失败的第一性拆解
- [[Geoff-Ralph Loops的基础设施]] — Geoff Huntley 原教旨与基础设施视角
- [[Anthropic团队-解析Claude Agent平台内幕]] — 同团队另一条线：云托管代理、Harness 与模型深度绑定
