---
title: "Karpathy：从 Vibe Code 到 Agentic Code"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "harness_engineering"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Stephanie Zhan × Andrej Karpathy：软件 3.0、参差不齐智能、代理工程 vs 氛围编程、大项目招聘、实习生式 Agent 与人类理解瓶颈。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Karpathy-从Vibe Code到Agentic Code.md"
source_sha256: "bce93be954ee607087a9b9d2621ea52467e506101d106b7c55000e57eacf9183"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV11nRmB1EkH/"
duration: "29:58"
saved: 2026-07-06
updated: 2026-07-06
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV11nRmB1EkH/ingest"
column_url: "https://www.bilibili.com/read/cv48761141/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV11nRmB1EkH/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "Stephanie Zhan"
guest_name: "Andrej Karpathy"
guest_title: "前 OpenAI/Tesla AI 负责人 · Vibe coding  coined"
speaker_inference: "column_article S-tier · AI Ascent / Sequoia"
speaker_confidence: high
author:
  - "[[Andrej Karpathy]]"
concepts:
  - id: software_3_0
    zh: 软件 3.0
    en: Software 3.0
    one_line: 用 prompt/上下文编程 LLM，非写死规则或训权重
  - id: vibe_coding
    zh: 氛围编程
    en: vibe coding
    one_line: 信任模型生成代码，少纠错，拉高能力下限
  - id: agentic_engineering
    zh: 代理工程
    en: agentic engineering
    one_line: 协调易错 Agent 仍保持专业软件质量上限
  - id: verifiability
    zh: 可验证性
    en: verifiability
    one_line: RL 奖励来自可验证输出，塑造模型能力分布
---

# Karpathy：从 Vibe Code 到 Agentic Code

**Host：** Stephanie Zhan（Sequoia Capital 合伙人）  
**Guest：** Andrej Karpathy（前 OpenAI 联创 · Tesla Autopilot · 「Vibe coding」命名者）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV11nRmB1EkH](https://www.bilibili.com/video/BV11nRmB1EkH/) · **时长** ~30 min · **专栏** [cv48761141](https://www.bilibili.com/read/cv48761141/)

---

## 开场

Karpathy 说 **作为程序员从未如此落后**——不是丧气，是 **2024 年 12 月** 代理式代码工作流 **质变**：他记不清上次改模型输出是什么时候，副业项目文件夹 **塞满 vibe-coded 产物**。同时他区分 **Vibe coding**（抬高下限）与 **代理工程**（守住专业质量上限）。

这期六章：**软件 3.0 新计算机** → **参差不齐智能与可验证性** → **代理工程 vs 氛围编程** → **大项目招聘** → **人类负责品味与规范** → **理解不可外包**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 软件 3.0 | Software 3.0 | 用上下文窗口「编程」LLM 解释器 |
| 氛围编程 | vibe coding | 信任生成、少干预，人人能写 app |
| 代理工程 | agentic engineering | 工程化协调 Agent，质量不降速升 |
| 可验证性 | verifiability | 输出对错可判，RL 才训得动 |
| 参差不齐智能 | jagged intelligence | 代码强、常识弱并存 |
| 上下文窗口 | context window | 塞进 prompt 的控制杆 |

---

## 01 从未如此落后：12 月转折与软件 3.0

**Stephanie Zhan：** 「从未如此落后」——兴奋还是不安？

**Andrej Karpathy：** 两者都有。去年代理工具就在用，处理代码块 **有帮助但要改**。 **12 月休假** 时间多——最新模型 **块块都对**，要求越提越高 **仍对**，我 **越来越信**，进入 **Vibe coding**。很多人去年 AI 体验 = ChatGPT； **12 月起代理连贯工作流** 根本变了，我试图在 X 上强调这点。

结果：**无尽副业项目**，文件夹爆满，一直在 vibe code——审视 **影响** 中。

**Stephanie Zhan：** LLM 是 **新计算机**——软件 1.0 规则、2.0 权重、3.0 现在。团队真信这个， **构建方式** 怎么变？

**Andrej Karpathy：** 1.0 我写代码；2.0 我 **排数据集、定目标、选架构** 训网络。GPT 在足够大任务集上训完，变成 **可编程计算机**—— **3.0 核心：编程 = 写 Prompt**； **上下文窗口 = 对解释器的控制杆**；LLM 解释上下文，在 **数字信息空间执行计算**。

**OpenClaw 安装** 例子：传统以为要 **臃肿 bash 脚本**（软件 1.0 死代码）。其实 **复制粘贴文本给 Agent** 就行——它 **看环境、打包、调试循环**。 **Menugen** 更极端：我字节码版 **OCR + 图像生成 + Vercel**；3.0 版 **拍照给 Gemini：「用 nanobanana 把菜渲染到菜单像素上」**——一图进一图出， **中间 app 逻辑多余**。神经网络干越来越多的活， **别只当旧事物加速器**——有 **以前不可能的新东西**（LLM 知识库 = 自动维基，非传统程序）。

> **金句 · Andrej Karpathy**
> **中文：** 软件 3.0 里，该复制粘贴给 Agent 的文本，就是新程序。
> **原文：** What you copy-paste to your agent — that's the new program.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 解释器 | interpreter | LLM 读上下文逐步「执行」 |
| 传感器/执行器 | sensors / actuators | Agent 读世界、改世界的接口 |

**本章小结**

- **2024-12** = 代理代码 **信任拐点**
- 3.0 = **prompt 即程序**，环境智能 **补全细节**
- 新机会 > 旧流程 **加速**

---

## 02 参差不齐：可验证性、洗车场与数据分布

**Andrej Karpathy：** 我写过 **可验证性**：传统计算机自动化 **代码 能指定的**；LLM 自动化 **你能验证的**——前沿实验室 **RL 环境给验证奖励**，模型成 **参差不齐实体**： **数学/代码峰值**，常识 **粗糙**。

谜题：**「strawberry 几个字母」** 曾翻车；新问题：**洗车场离 50 米，开车还是走路？** 最新 Opus 说 **走路**——同时能 **重构 10 万行库 / 找 0-day**。 **你得保持介入**，当工具用， **别脱钩**。

GPT-3.5→4 **国际象棋暴涨**——不全是通用能力，是 **预训练加了大量棋谱**；OpenAI 某人 **决定加数据**，峰值就上去。**我们受制于实验室混了什么**—— **没手册**，得 **自己探边界**。在 **RL 回路里** 飞速进步； **回路外** 得 **微调/自建**。

**Stephanie Zhan：** 创始人选 **可验证领域** 创业，但实验室在 **数学/编程** 已逃逸速度——建议？

**Andrej Karpathy：** 可验证 = 你能 **自建 RL 环境**，即使实验室没盯也能 **拉微调杠杆**。有 **高价值 RL 环境** 的领域——我不在舞台上泄底，但 **存在**。

**Stephanie Zhan：** 什么 **仍只能从远处自动化**？

**Andrej Karpathy：** 最终 **几乎都可验证**——写作也能 **LLM 法官委员会**。差别在 **难易**；长远 **一切可自动化**。

> **金句 · Andrej Karpathy**
> **中文：** 能重构十万行代码，却让你步行去五十米外的洗车场——这太疯了。
> **原文：** It can refactor 100k lines but tells you to walk 50m to the car wash — that's insane.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 强化学习回路 | RL loop | 可验证奖励 → 模型快速变强 |
| 数据分布 | data distribution | 预训练/RL 里有什么决定峰值能力 |

**本章小结**

- 参差不齐 = **可验证性 × 实验室重点 × 数据分布**
- 应用方必须 **探针自己的任务在不在 RL 回路里**
- 可验证创业 **仍能微调**，别只等基础模型

---

## 03 代理工程：下限 vs 上限，10x 不够用了

**Stephanie Zhan：** **Vibe coding** 你命名的；今天更像 **代理工程**——区别？这时代怎么称呼？

**Andrej Karpathy：** **Vibe coding** = 提高 **每人软件能力下限**——人人都能 vibe 一个 app，太棒。**代理工程** = 保持 **专业软件以前的质量标准**——不能 vibe 出漏洞， **责任仍在**；但能 **更快**，且 **要方法**。

像 **工程学科**：Agent 是 **锋利、随机、易错但极强** 的实体—— **如何协调加速且不降质？** 这是代理工程。两者不同：一个 **抬底**，一个 **外推上限**。

代理工程师 **上限极高**——以前说 **10x 工程师**，现在 **远不止 10x**；非常擅长的人 **效率倍数大得多**。

> **金句 · Andrej Karpathy**
> **中文：** 氛围编程抬下限；代理工程守上限——专业软件不能 vibe 出洞。
> **原文：** Vibe coding raises the floor; agentic engineering preserves the ceiling.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 质量上限 | quality ceiling | 专业级安全/可维护标准 |
| 能力下限 | capability floor | 非程序员也能 ship 原型 |

**本章小结**

- **Vibe coding ≠ 专业开发**——后者要 **代理工程纪律**
- 顶尖人 **>>10x**；招聘/流程要 **按新上限** 设计

---

## 04 招聘与 AI 原生：Twitter 克隆 + 十模型攻击

**Stephanie Zhan：** 山姆说 **代际用法不同**——编程里 **平庸 vs AI 原生** 差别？

**Andrej Karpathy：** **榨干工具**——像当年 Vim/VS Code，现在 Claude/Cursor； **投入自己的 setup**，用全功能。

招聘：**大多数人流程没重构**——还出 **谜题算法题**，旧范式。我会：**给超大项目，看怎么实现**——例：**代理写一个 Twitter 克隆，非常好、非常安全**；再 **10 个 Claude 3.5 Sonnet 攻击 deployed 站点**， **攻不破**—— **观察大项目 + 工具**，这是我主要看的。

> **金句 · Andrej Karpathy**
> **中文：** 还在考算法谜题？让候选人用 Agent 做一个攻不破的 Twitter 克隆。
> **原文：** Still doing puzzle interviews? Give them a huge project — a Twitter clone agents can't break.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| AI 原生工程师 | AI-native engineer | setup、委托、验证流围绕 Agent 重建 |
| 红队代理 | red-team agents | 多模型协同尝试攻破候选作品 |

**本章小结**

- 面试从 **leetcode** → **端到端大项目 + Agent 攻防**
- AI 原生 = **工具链投入深度**，非仅「会用 ChatGPT」

---

## 05 实习生 Agent：品味、规范与 API 细节移交

**Stephanie Zhan：** Agent 做更多， **什么人类技能更值钱**？

**Andrej Karpathy：** Agent 像 **实习生**—— **审美、判断、品味、监督** 仍在你。Menugen 怪例：Google 账户注册、Stripe 买积分—— **不同邮箱**，Agent **用 email 交叉关联资金**， **常识 bug**。

人类负责 **规范/计划**——甚至不只「计划模式」，要 **和 Agent 共写详细 spec（也许即文档）**，Agent 填实现，你 **监督顶层**。 **API 细节** 交给「实习生」——我忘了 PyTorch `keepdims` vs `dim` vs `axis`， **不需要记**；但你得懂 **底层张量、view、共享存储 vs 复制**——否则 **内存乱复制**。

你负责 **设计、要求**——「 **唯一 user ID 关联一切**」——工程师（Agent） **填空白**。代码 **有时臃肿、复制粘贴、抽象笨拙**—— **能跑但很糟**； **美学 RL 还没进训练**，我 prompt **再简化** 像 **拔牙**—— **人仍负责品味**，实验室 **还没训这块**。

**Stephanie Zhan：** 品味会 **越来越不重要** 吗？

**Andrej Karpathy：** 希望改进—— **还没进 RL 回路**；没有 **美学/cost 奖励**。microgpt 项目：**模型讨厌极简**——一直 prompt 简化 **做不到**。 **无根本障碍**，只是 **还没做**。

> **金句 · Andrej Karpathy**
> **中文：** Agent 会用 Stripe 邮箱去关联 Google 账户——这种常识还得人管规范。
> **原文：** It tried to match Stripe email to Google email for funds — you still own the spec.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 规范 | spec | 人类写的约束文档，Agent 实现源 |
| 计划模式 | plan mode | 先方案后代码的 Agent 交互模式 |

**本章小结**

- 人类核心价值：**spec + 监督 + 底层原理 + 品味**
- Agent 接 **API 细节记忆**；人接 **架构与常识护栏**
- 代码美学 **暂缺 RL**，短期 **人不能松**

---

## 06 幽灵非动物：代理原生基础设施与理解瓶颈

**Stephanie Zhan：** 你写 **动物 vs 幽灵**——非进化动机，是 **数据+奖励塑造**——怎么改变 **构建/信任**？

**Andrej Karpathy：** 帮我想清 **它们是什么**——对它们 **大喊** 不会更好， **统计电路 + 预训练 + RL 附属物**； **心态**：什么有效什么无效。 **非动物智能**。

**代理权限世界**：文档仍 **为人类写**——我最爱抱怨：**为啥还教我怎么点 URL？** 应问 **复制粘贴什么给 Agent**。**传感器/执行器** 分解工作；要 **代理原生 infra**——Menugen **麻烦在 Vercel/DNS 配置**，理想：**一句 prompt 部署上线**。

趋势：**你的 Agent 和我的 Agent 谈会议细节**—— **传感器/执行器** 类比我喜欢。

**Stephanie Zhan：** 教育——智能廉价后 **什么值得深学**？

**Andrej Karpathy：** 推文：**你可以外包思考，不能外包理解。** 我仍是 **瓶颈**——不知道建什么、为啥值得、 **怎么指导 Agent**。信息得 **进我脑子**； **LLM 知识库** 是我处理信息方式—— **读文章就建 wiki**， **合成数据式提问**。

工具应 **增强理解**—— **理解是导演能力**；LLM **不擅长理解**， **你仍是唯一负责理解的人**。

> **金句 · Andrej Karpathy（封底）**
> **中文：** 思考可以外包，理解不能——你是导演，不是观众。
> **原文：** You can outsource your thinking, but you can't outsource your understanding.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代理原生 | agent-native | 文档/infra 先给 Agent 读，非人类菜单 |
| LLM 知识库 | LLM wiki / knowledge base | 个人/组织事实的结构化再编译 |

**本章小结**

- 信任 Agent = 接受 **幽灵统计学**，非 **动物动机**
- **代理原生** 部署/文档是 **下一 infra 战场**
- 教育重心：**理解** > **思考外包**

---

## 总结：从 Vibe 到 Agentic 是 floor 与 ceiling 的分工

| 维度 | 要点 |
|------|------|
| 范式 | **软件 3.0** — prompt/上下文即程序；新 app 形态 |
| 能力 | **参差不齐** — 探针任务是否在 **可验证/RL 回路** |
| 实践 | **Vibe coding** 抬底；**代理工程** 守专业上限 |
| 人才 | 招聘 **大项目**；人类保 **spec/品味/理解** |
| infra | **代理原生** 传感器/执行器；部署应 Agent 一键 |

### 对开发者

- 12 月后 **重测** 代理工具——可能已换赛道
- 别 **只加速旧代码**——问 **3.0 下不该存在的 app**
- 投资 **理解**（wiki/提问），不只 **思考外包**

### 仍待验证

- 美学/品味 **何时进 RL**
- **神经网络主机 + CPU 协处理器** 时间线

---

## 附录

### 章节时间戳

| 章 | 主题 | 时间 |
|----|------|------|
| 01 | 软件 3.0 | [04:15] |
| 02 | 参差不齐智能 | [08:20] |
| 03 | 代理工程 | [11:42] |
| 04 | 招聘 | [13:55] |
| 05 | 品味与规范 | [15:40] |
| 06 | 理解不可外包 | [25:12] |

### ingest 路径

- **专栏主源：** `Recastory/workspace/bilibili-retranscribe/BV11nRmB1EkH/ingest/column_article.md`
- **ingest_dir：** `Recastory/workspace/bilibili-retranscribe/BV11nRmB1EkH/ingest`

### 相关阅读

- [[Claude Code实战-Gstack把AI变成团队]] — Karpathy「不再手写代码」同语境
- [[Geoff-Ralph Loops的基础设施]] — Agent 环 vs 单次 vibe 的对照
- [[OpenClaw创始人-我是如何使用OpenClaw的]] — 软件 3.0 安装范式实例
