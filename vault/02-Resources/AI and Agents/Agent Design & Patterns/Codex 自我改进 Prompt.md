---
title: "Codex「自我改进」Prompt 曝光！Greg Brockman 让 Coding Agent 反过来优化自己的使用方式，15万人围观"
tags: ["ai_agent", "prompting"]
legacy_tags: ["ai_agent", "prompting"]
created: "2026-06-09"
source: "https://mp.weixin.qq.com/s/pSnYuU1C5v5ufOm0U-lbHQ"
description: "Codex「自我改进」Prompt 曝光！Greg Brockman 让 Coding Agent 反过来优化自己的使用方式，15万人围观"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/Codex 自我改进 Prompt.md"
source_sha256: "a84a062200b80263f0e92445449f80bb63ebb3321b63a9abe15467f538871548"
migration_id: "migration-20260720-64e79771"
author:
  - "[[智能沿界]]"
published: 2026年5月26日 03:29
---

导读OpenAI 联合创始人 Greg Brockman 在 X 上放出了一段 Codex 的"自我改进 Prompt"——让 Coding Agent 回顾过去 30 天的工作记录，从中找到重复劳动，自动把高频流程打包成可复用的技能、子智能体或自动化任务。配合 OpenAI 官方的 Skills、Memories、Chronicle 等机制，coding agent 正在从"帮你写一次代码"进化成"帮你优化整套工作方式"。
## 一张截图，藏着 Codex 的"元操作手册"
2024 年 5 月 24 日，Greg Brockman（@gdb）发了一条极简帖子：

> "self improvement prompt for codex"

配图是一段完整的 Prompt 指令。

<img src="../../../99-System/Attachments/WeChat Articles/article1-img1.jpg" onerror="this.src='https://mmbiz.qpic.cn/mmbiz_jpg/Ih8y3aeWB4UuBwNcN49g86VD2YeQYg7K5GFCb725tw616U1Nwpb3qPBCcY7iaibG8P2FZqnibtYLaXKOJSKPTlcqg2VkVNavuaickgXBQqstWEc/640?wx_fmt=jpeg&from=appmsg&watermark=1#imgIndex=0'" alt="Greg Brockman 发布 Codex 自我改进 Prompt▲ Greg Brockman 在 X 上分享 Codex 自我改进 Prompt，获得超过 2400 次转发" width="100%">

帖子本身只有六个单词。但图片里的内容，直接把 Coding Agent 的用法推到了一个新层面。

这段 Prompt 的核心指令：

**让 Codex 回看最近 30 天的工作历史，找出重复性人工流程，把值得固化的部分打包成 Skill、Custom Subagent 或 Automation。**

换句话说——不再只是"给 agent 一个任务让它执行"，而是"让 agent 审视自己过去做了什么，主动提出哪些工作可以自动化"。

## Prompt 拆解：四层筛选 + 三种输出形态
Brockman 这段 Prompt 写得相当克制。它没有让 Codex 看到什么就自动造一堆工具，而是设了严格的准入门槛。

**第一层：证据来源优先级**

Prompt 要求 Codex 按顺序查看四类信息：

1. 最近的 Codex sessions 和 task summaries 2. Codex Memories 和 rollout summaries，用来发现跨会话重复模式 3. Chronicle（如果开启），用于发现 Codex 之外的重复工作——但只作为线索，关键细节要回到源系统确认 4. 已有的 skills、custom agents 和 automations，避免重复造轮子

**第二层：候选流程的筛选条件**

Prompt 原文给出了四个硬指标：

> "occurred at least twice, or is clearly likely to recur and costly to repeat; has stable inputs, a repeatable procedure, and a clear output or stopping condition; would materially improve speed, quality, consistency, or reliability; is not already adequately covered."

「至少发生过两次，或明显可能复发且重复成本高；有稳定输入、可重复过程和明确的输出或停止条件；能实质提升速度、质量、一致性或可靠性；且尚未被现有资产覆盖。」

**第三层：选最小合适形态**

通过筛选的流程，Prompt 要求选择最精简的包装方式：

- **Skill**：可复用的工作流或 Playbook

- **Custom Subagent**：可委派的专项调查角色

- **Automation**：定时或周期性的检查、报告、提醒、监控

- **Skip**：证据不足、过于一次性或边界模糊的，直接跳过

**第四层：输出要求**

先产出一份 shortlist——列出重复工作流、证据与日期、频率/置信度、推荐形态、以及为什么值得或不值得创建。然后只创建高置信的缺失项，保持 narrow、practical、source-aware、easy to validate。

最后还要交代三件事：创建或扩展了什么；刻意跳过了什么；还需要更多证据才能打包什么。

这套逻辑读下来，更像是一份**工程管理清单**，而非"让 AI 随便折腾"的万能 Prompt。

## 为什么能跑起来？Skills、Memories、Chronicle 构成了基础设施
这段 Prompt 之所以有实操价值，前提是 Codex 本身已经具备了一套持久化和模块化机制。

**Skills：把经验变成可调用资产**

根据 OpenAI Developers 文档，Codex 的 Agent Skills 用于扩展 task-specific capabilities。一个 Skill 会把 instructions、resources 和 optional scripts 打包，让 Codex 在后续任务中可靠地遵循某个工作流。

<img src="../../../99-System/Attachments/WeChat Articles/article1-img2.jpg" onerror="this.src='https://mmbiz.qpic.cn/sz_mmbiz_jpg/Ih8y3aeWB4UoxibE4G8034ceia2cNxO0kHIevQa3lBFemy9jefe1Y8A5RacDiafuDeOmE57jcmvyTSXYBhLTmV8AMW51eIOCfQh3rwGU9NFytk/640?wx_fmt=jpeg&from=appmsg&watermark=1#imgIndex=1'" alt="OpenAI Codex Skills 文档页面▲ OpenAI 官方文档：Codex Agent Skills 支持把工作流打包成可复用模块" width="100%">

Skills 有明确的目录结构——一个 Skill 目录包含 `SKILL.md`（说明文件），加上可选的 scripts、references 和 assets。Codex 初始只看到 Skill 的名称和描述，决定使用时才读取完整内容。

这意味着 Prompt 的输出物不再是"一段更好的提示词"，而是 Codex 可以在后续任务中直接调用的结构化资产。

**Memories：跨会话的上下文积累**

Codex 的 Memories 功能（目前默认关闭，部分地区暂不可用）允许 agent 把早期线程中的有用上下文带入未来工作——比如稳定的偏好设置、常用技术栈、项目规范、已知的坑。

<img src="../../../99-System/Attachments/WeChat Articles/article1-img3.jpg" onerror="this.src='https://mmbiz.qpic.cn/mmbiz_jpg/Ih8y3aeWB4Wvib1GERmWtvvd22ib2jShdVSicqk4VAI3Hib13FMGOkXLYk2v1X1fjicOhXXAw0wZ8HInYDRaSzTfZ2W4wCAvTibI04MhsdJrN2iadg/640?wx_fmt=jpeg&from=appmsg&watermark=1#imgIndex=2'" alt="OpenAI Codex Memories 文档页面▲ Codex Memories 可以保留跨会话上下文，包括偏好、工作流和项目惯例" width="100%">

只有 agent 能看到跨会话的模式，它才有可能发现"每次都要手工跑同一套检查""每次都要补同一段上下文"这类重复劳动。如果每个 session 都从零开始，所谓"自我改进"就会退化成当前对话里的即时总结，无法积累。

**Chronicle：屏幕级发现层**

Chronicle 是 Codex 的 opt-in research preview 功能，通过 recent screen context 帮 Codex 建立 memories。它可以帮助 Codex 理解你在看什么页面、用什么工具、形成什么工作习惯。

<img src="../../../99-System/Attachments/WeChat Articles/article1-img4.jpg" onerror="this.src='https://mmbiz.qpic.cn/mmbiz_jpg/Ih8y3aeWB4UV50GxU0IQVJQvJ3b5A7oia4FYdJELuibWld460XFcsuIQc1GAuStb0F5Kvqia1XGY0JPx67eibWawVF0g5Zsia4e3DfZsb3Dfkw2k/640?wx_fmt=jpeg&from=appmsg&watermark=1#imgIndex=3'" alt="OpenAI Codex Chronicle 文档页面▲ Chronicle 可以通过屏幕上下文帮 Codex 发现重复工作——但目前仅限 macOS ChatGPT Pro 用户" width="100%">

值得注意的是，Brockman 的 Prompt 本身对 Chronicle 的态度也很克制——

> "Chronicle, if enabled, to spot repeated work outside Codex. Use Chronicle for discovery only; confirm important details in the relevant source system when possible."

「Chronicle 如果启用，仅用于发现 Codex 外部的重复工作。仅作为发现线索，重要细节仍需回到相关源系统确认。」

Chronicle 当前只面向 macOS 上的 ChatGPT Pro 订阅者，需要 Screen Recording 与 Accessibility 权限，且存在 rate limit 消耗快、prompt injection 风险和本地存储安全等问题。Prompt 把它定位为"线索来源"而非"最终证据"，说明 Brockman 自己也清楚这层限制。

## 这件事的真正意义：从"完成任务"到"改进工作环境"
过去大多数人用 Coding Agent 的方式是：给一个具体任务，拿到结果，下次再给新任务。每次对话基本独立，agent 的能力不会因为用过就变强。

Brockman 这个 Prompt 推动的转变在于——**让 agent 把"做过什么"变成"下次能更快做什么"**。

OpenAI Cookbook 在 2026 年 5 月发布了一篇相关指南——《Build an Agent Improvement Loop with Traces, Evals, and Codex》，作者 Wesley Pasfield。

<img src="../../../99-System/Attachments/WeChat Articles/article1-img5.jpg" onerror="this.src='https://mmbiz.qpic.cn/sz_mmbiz_jpg/Ih8y3aeWB4Xic9mlFK0fkB2fudgCiaBRyB3ChPT9mdU27u2gNiccshhDExFda2gnugQWzKewPicF79icgajXPc4lSzibUKBIDFRicXicXRjWJw4A314/640?wx_fmt=jpeg&from=appmsg&watermark=1#imgIndex=4'" alt="OpenAI Cookbook agent improvement loop▲ OpenAI Cookbook：从 traces 到 feedback 到 evals，再到 Codex 执行 harness 改动" width="100%">

这篇官方 Notebook 展示了一个更正式的 agent improvement loop：从真实 traces 开始，加入 human 和 model feedback，把 feedback 变成 evals，再用这些证据提出下一步 harness changes，交给 Codex 实施。

文档定义了一个关键概念——**harness**：围绕模型的完整 contract，包括 instructions、tools、routing、output requirements 和 validation checks。

Brockman 的 Prompt 和 Cookbook 的 improvement loop 思路高度一致，只是层级不同。Cookbook 走的是 traces → feedback → evals → harness changes 的工程路线；Brockman 的 Prompt 更轻量，直接从用户的 Codex sessions、memories 和 existing skills 中发现重复流程，然后选择 skill / subagent / automation / skip。

共同点只有一个：**优化的对象始终是模型外面的 harness——指令、工具、流程、校验规则——模型本身没有变。**

## 社区的第一反应：没有记忆，一切白搭
帖子发出后，社区讨论迅速聚焦到一个问题：**这个循环能不能真正跑起来，取决于 agent 有没有持久记忆。**

@SynabunAI 在回复中指出：如果 Codex 每个 session 都重新开始，整个 self-improvement loop 就会失效；这种循环只有在 memory layer 真正持久时才成立。

@manan 用电影《50 First Dates》做比喻：没有记忆插件的时候，每次都要重新建立上下文。

还有用户 @PatrickJS 分享了自己的类似实践——他称之为 "codex dreaming"：每晚自动运行，在 GitHub 里记录过去表现、评估历史、决定应该改变什么。

这些回复指向同一个判断：**agent 自我改进的前提条件，是跨会话的上下文持续存在。**Skills 解决"怎么存储和调用可复用流程"，Memories 和 Chronicle 解决"怎么发现重复模式"，AGENTS.md 解决"怎么可靠继承强规则"。Prompt 的工作是把这些组件串成一个周期性复盘流程。

## 冷静看：这里有什么风险？
在兴奋之余，也要看到几个明确的风险边界。

**记忆可能过期。**Codex 的 Memories 不会自动验证内容是否仍然准确。一个三周前形成的记忆——比如"这个项目用 pytest 跑测试"——可能在团队切换到 Jest 之后就过时了。自动化基于过期记忆运行，后果比手动犯错更难排查。

**错误的 Skill 会固化坏习惯。**如果一个重复流程本身就有问题，把它打包成 Skill 只会让错误更高效地复制。Prompt 里的"easy to validate"要求正是对这个风险的防线，但实际执行中是否真的每次都验证，取决于用户。

**Chronicle 的隐私和安全边界。**它需要 macOS 的 Screen Recording 和 Accessibility 权限，memories 未加密存储在本机，且会快速消耗 rate limits、增加 prompt injection 风险。把屏幕级上下文交给 agent，意味着你要信任它不会把敏感信息错误地打包进 Skill 或 Automation。

**不是所有流程都适合自动化。**Prompt 里有一个关键设计：Skip——"work that is too one-off, ambiguous, sensitive, or poorly evidenced to package"。有些工作流需要人工判断，提前自动化反而会引入更大的风险。承认"这个不该包装"，本身就是自我改进的一部分。

## 最后看回这件事
Coding Agent 的竞争已经不只是"谁生成代码更快"。

Brockman 这个 Prompt 代表了一种趋势：**agent 每完成一次任务，留下的产物应该不止是代码 diff。**重复流程能变成 Skill，跨会话模式能沉淀为 Memory，周期性检查能固化为 Automation。

一次任务结束后，真正的交付物可能是——让下一次同类任务的起点更高。

这才是"自我改进"的实际含义：模型权重没变，变的是围绕模型的整套工作环境。

— END —

— END —