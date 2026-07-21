---
title: "Cognition CPO：Devin 的 80% 时刻与后台 Agent"
tags: ["ai_agent", "multi_agent", "bilibili", "harness_engineering"]
legacy_tags: ["ai_agent", "multi_agent", "bilibili", "harness_engineering"]
created: "2026-07-06"
source: "https://www.bilibili.com/video/BV1itEh6FEUW/"
description: "swyx × Walden Yan × Cole Murray：2025 后台代理元年——Devin 内部提交 16%→80%、大脑-机器分离、测试即编排、记忆最后一公里、块差异文件系统、SRE 首响应与 Slack 驱动 PR。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Cognition CPO-Devin的80%时刻与后台Agent.md"
source_sha256: "345feebf7d6845e640e097836b1ff4d92668b62c35f8a7c8fee9a4c6a379a470"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1itEh6FEUW/"
column_url: "https://www.bilibili.com/read/cv50190493/"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1itEh6FEUW/ingest/column_article.md"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1itEh6FEUW/ingest"
duration: "~70 min"
saved: 2026-07-06
spot_check: 2026-07-06
updated: 2026-07-06
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical"
host_name: "swyx"
guest_name: "Walden Yan"
co_guest_name: "Cole Murray"
guest_title: "Cognition CPO · Context Engineering 提出者"
co_guest_title: "OpenInspect 作者"
speakers:
  - "swyx（Latent Space 主持人）"
  - "Walden Yan（Cognition CPO）"
  - "Cole Murray（OpenInspect 作者）"
speaker_inference: "column_article S-tier Host/Guest 标注 + Latent Space 节目结构"
speaker_confidence: high
source_original_date: "2026-05-29"
author:
  - "[[Walden Yan]]"
  - "[[Cole Murray]]"
concepts:
  - id: background_agent
    zh: 后台代理
    en: background agent
    one_line: 跑在云端、自主驱动开发流程，Spec 够好直接收 PR
  - id: brain_machine_split
    zh: 大脑与机器分离
    en: brain-machine separation
    one_line: 推理控制面与沙盒执行环境物理隔离，秘密不进盒子
  - id: out_of_the_box
    zh: 盒外线束
    en: out-of-the-box harness
    one_line: 代理大脑在工作控制面，沙盒只当「手」
  - id: repo_setup
    zh: 仓库设置
    en: repo setup
    one_line: 让代理开箱能跑应用、测代码的全套环境配置
  - id: block_diff_storage
    zh: 块差异文件存储
    en: block-diff file storage
    one_line: 按写入差异增量快照，缩短代理冷启动
  - id: knowledge_memory
    zh: 知识记忆
    en: knowledge system
    one_line: 用户纠正时自动提议写入、人工批准后跨会话复用
---

# Cognition CPO：Devin 的 80% 时刻与后台 Agent

**Host：** swyx（Latent Space）  
**Guest：** Walden Yan（Cognition CPO）· Cole Murray（OpenInspect 作者）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · 三人圆桌）  
**B 站：** [BV1itEh6FEUW](https://www.bilibili.com/video/BV1itEh6FEUW/) · **专栏** [cv50190493](https://www.bilibili.com/read/cv50190493/) · **时长** ~70 min

---

## 开场

2025 年底，工程界集体感到一件事：**不用再手把手教模型写代码了**。Opus 4.5、GPT 5.2 一类模型把「规范写清楚 → 云端代理自主跑 → 回来一个 PR」从 demo 推成了日常。

Cognition 内部数字更狠：Devin 在自己仓库的合并提交占比，**1 月 16%，3 月 80%**；PR 量约 **7 倍** 涨，工程人头只多了 **10%** 左右。Walden Yan 是「上下文工程」这个词的推手之一；Cole Murray 开源了 OpenInspect——RAMP 博客一出，他按同样思路几小时搭完一套可 fork 的后台代理骨架。

这期六章：**后台代理取代 IDE 插件** → **大脑与机器为什么要分开** → **测试难在编排不在点按钮** → **记忆是资深员工的最后一公里** → **grep 慢往往是网络文件系统** → **SRE 和非工程师谁先吃到红利**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 后台代理 | background agent | 云端跑、少打断你、自主推进到 PR |
| 上下文工程 | context engineering | 比堆提示词更系统地搭代理输入 |
| 盒内线束 | in-the-box harness | 代理和秘密都在沙盒里跑 |
| 盒外线束 | out-of-the-box harness | 大脑在控制面，沙盒只执行工具 |
| 仓库设置 | repo setup | 代理能 build、能测的一整套环境 |
| 计算机使用 | computer use | 模型点屏、发坐标——测试里只是一小块 |
| 知识记忆 | knowledge system | 纠正时自动提议「要不要记住」 |
| 块差异存储 | block-diff file storage | 只快照改动块，不用搬整盘 1TB |
| 管理者-子代理 | manager-subagent | 一个主代理派活，子代理各守各的盒子 |

---

## 01 后台代理取代 IDE：Devin 提交从 16% 到 80%

**swyx（Host）：** 现在人人都在造自己的 Devin。Walden，2025 对你和 Cognition 到底是什么感觉？Cole，你 clients 那边又看到什么？

**Walden Yan（Guest）：** 回头看，我们老觉得在加速——**过去三四个月更快**。聊 Sonnet 3.7 有多大飞跃，现在听起来都有点好笑。模型变聪明，Devin 里一堆旧技巧可以直接剥掉。

Opus、最新 GPT 到一种自主度：以前争「要不要盯每一行」，那是 IDE 助手时代的争论；现在严肃讨论的是 **能不能整包扔云端**。内部图表很直观：**合并 PR 量大约 7 倍**，工程编制大概 **+10%**。我们一度不敢发数——Devin 在 Devin 相关仓库的提交占比，**1 月 16%，3 月 80%**。

**Cole Murray（Guest）：** 工程界在认 **后台代理、云代理** 这套词。我 clients 的体感是 **2025 年 12 月前后** 有个拐点：Opus 4.5、GPT 5.2 到了「Spec 够好就能 **摩擦极小地** 从规范直接出 PR」的水平。不用手把手教了——范式一变，后台代理突然实用。

Sonnet 3.7 那波 Cognition 是不是几乎 **一夜重写** Devin？

**Walden Yan（Guest）：** 对，很大一块进步就是 **智能跳档**，把 harness 里不再需要的层剥掉。

**Cole Murray（Guest）：** OpenInspect 来自客户 friction：PM 在 Slack 里用 Claude Web 开 session，**会话绑在人身上**——工程要接手？看不见上下文，只能复制粘贴最后一条。我内部先搭了一套 **localhost → 云端** 的试验台。RAMP 发那篇「你也可以这样搭」的博客时，我手头已有组件，就在 X 上 **直播 GPT vs Claude 谁能按博客复现**。开源社区里本地工具很多，**真正跑在云上的** 几乎没有——所以开源、让人 fork 混配。

**Walden Yan（Guest）：** Devin 之后 OpenDevin 一堆跟风的。Cole 有意思在 **没把它变成 VC 故事**。

**Cole Murray（Guest）：** 客户眼里，后台代理会是 **公司关键基础设施**——得能 fork、加自定义。常被问融不融资、做不做 SaaS。我不想为 **每席 20 美元** 去卷；核心复制太快；堆栈也不全在你手里——**Daytona、E2B 赚沙盒，模型厂赚钱**，中间这层卖什么？基础设施还是集成？很尴尬。

> **金句 · Walden Yan**
> **中文：** 我们一度不敢发——Devin 在自己仓库的提交已经八成。
> **原文：** We were even afraid to publish this — Devin is now 80% of commits in Devin repos.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 后台代理 | background agent | 云端 autonomous，少同步打断 |
| 规范驱动 | spec-driven | 写清需求，代理自己跑到 PR |
| 开源 fork | fork | 企业内网改自己的集成与策略 |

**本章小结**

- **2025 末** 是体感拐点：从 IDE 助手到 **Spec → PR** 的后台代理
- Cognition 内部 **16%→80%** 提交 + **7× PR** 是硬指标，不是营销句
- 自建 vs 买 Devin：开源骨架（OpenInspect）与 **全栈 infra**（Cognition）是不同生意

---

## 02 大脑与机器分离：盒外线束、秘密与仓库设置

**swyx（Host）：** 架构永远是这类对话的主题。Cole 你先画一张后台系统的组件图——**代理到底跑在盒子里还是盒子外**？

**Cole Murray（Guest）：** 先得定 **代理跑哪**。常说 **in-the-box / out-of-the-box** 线束。

**盒内**：代理在沙盒里跑——默认 **秘密也要进盒子**。AI 不可预测，秘密泄露风险高。

**盒外**：**大脑在工作控制面**，沙盒是 **手**，只接工具调用。安全上好：秘密不必跟大脑绑死。代价是 **状态管理难很多**——盒内状态全在本地，盒外要同步大脑和机器。

**Walden Yan（Guest）：** 这正是 Devin 从 Day 1 的 **大脑-机器分离**。还能 **复用现有开发机 infra**，不用为「大脑」单独造一种 fat dev image。大脑仍要碰秘密——但方式不同。

客户常踩坑：**GitHub App** 统一入口，不同用户权限不同。若 **决定行为的系统** 和 **机器上的 secret** 没有物理隔离，权限隔离做不动。Devin 规矩简单：**机器上有的，就是用户+代理能动的范围**——最受限 secret 只放机器，**大脑从机器端读不到**。用户乱搞机器，碰不到大脑里最安全那层。

OpenAI、Anthropic 托管代理图表，也是 **盒外** 变体——实现更重，维护量更小。

**Cole Murray（Guest）：** 我长期看 **最终会回到盒外**。新工具已经在 **回调控制面**，秘密不进沙盒。

**Walden Yan（Guest）：** 更少人做好的是：**盒子里装什么**。大 repo、依赖常变、凭据常换——怎么保证代理环境 **始终最新、能跑 app、能测**？Cognition 内部叫 **仓库设置（repo setup）**，从创立就在啃。

**Cole Murray（Guest）：** 咨询里一半时间在帮团队 **把 dev 环境理顺**——很多公司根本没有，流程是 **找 Bob 要 secret**，代理没法用。Docker Compose / 微服务在非生产里常见；OpenInspect 用 **setup.sh 钩子 + 快照**，沙盒回来 **restore 钩子** 把微服务拉起来——尽量 **跟你本机一样**。

**Walden Yan（Guest）：** 早期有人用 **Docker 容器当模型抽象**——容器 **不是安全边界**；真 app 里还有 Docker，变成 **Docker in Docker**；要跑 app、点 UI、录屏，**完整 VM** 往往省不掉。Android 支持还要 **嵌套虚拟化**（Firecracker 里再跑模拟器）——所以还在 beta。

> **金句 · Cole Murray**
> **中文：** 盒外更好，但复杂度高一个数量级——状态全得你管。
> **原文：** Out-of-the-box is the better architecture — it just adds a lot of complexity because you have to manage state.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 盒外线束 | out-of-the-box harness | 控制面推理 + 沙盒执行分离 |
| 权限隔离 | permission isolation | 多用户 GitHub App 不串权 |
| 仓库设置 | repo setup | 代理可 build/test 的环境契约 |
| 嵌套虚拟化 | nested virtualization | VM 里再跑 Android 模拟器等 |

**本章小结**

- **盒外** 是安全与权限隔离的默认优解；**盒内** 状态简单但 secret 风险大
- **Repo setup** 和架构同等重要——没 dev 环境就没有可自治的代理
- VM vs Docker：要真跑 app + 录屏 + 多 OS，VM 仍是 Cognition  bet

---

## 03 测试不是点按钮：推理编排与多模型协作

**swyx（Host）：** Walden，Devin 为什么叫「测试」不叫「计算机使用」？业界是不是 hype 错了重点？

**Walden Yan（Guest）：** 大家一想到 AI 测 app，就盯着 **computer use**——字面意思：**知道点哪、坐标对不对**。那只是一层。

**测试真正难的是编排**。你改了跨 **前端+后端+深层微服务** 的东西——先得 **推理怎么把这些 app 用对版本跑起来**；再 **推理怎么触发那条业务路径**：可能要 admin 权限、开两个 session、发特定消息……这需要 **大量代码上下文**，有时 **没有一个前沿模型能端到端搞定**——我们得 **多个前沿模型协作**。时间主要花在这，不是点按钮。

Computer use 最近模型变强（比如 4.7 视觉）确实帮倒忙—— **eval 也要跟着建**，还要防退步。

**Cole Murray（Guest）：** 同意——computer use 是 **大测试问题的子集**。跟 **代码库强绑定**，不是开箱方案；后台代理至少 **本地有 repo**，知道改了什么，能驱动测试。

**Walden Yan（Guest）：** PR 完成后点「测试通过」回 **带标注的录屏**——光标、测什么，标在小角落。我加 **底部注释** 后 merge 速度明显上去：「我到底在看啥？」

GitHub 体验也调了很久：不只 **开 PR**，还要 **在 GitHub 里 @Devin 继续改**。Devin Review 会在自己 PR 上评论，Devin 还得 **回自己的评论**——循环控制很费工：高信号评论、哪些立刻修、哪些回「我觉得你错了」。我最喜欢 **Devin 反驳我** 的时刻——说明对话 maturity 到了。

**Cole Murray（Guest）：** **AI 审阅者** 是后台系统关键件。OpenInspect 有 GitHub reviewer，提示词可控，会评论，**全自动闭环还在路上**——得 @ 机器名才跟进。

**Walden Yan（Guest）：** 客户整合最难的往往是 **进公司生态**：只读生产库、日志、Confluence、内网 wiki。MCP 爆发，但要 **体验对** 常得 **自建一层**——Slack 例子：给 MCP 能发消息不够；Devin 是 **Slack 同事**，要 webhook、别刷屏、多轮对话 **不能靠裸 MCP**。

> **金句 · Walden Yan**
> **中文：** 测试花时间的地方，是编排和代码上下文，不是点那个按钮。
> **原文：** That's where we spend most of our time thinking about testing — not the computer use part.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 计算机使用 | computer use | 点屏、坐标——测试子技能 |
| 推理编排 | reasoning orchestration | 多服务跑起来并触发业务路径 |
| 高信号评论 | high-signal comments | GitHub 上值得立刻动手 vs 回怼 |

**本章小结**

- **测试 = 编排 + 代码理解**；computer use 是子集，不是主战场
- **录屏+标注+GitHub 内对话** 直接影响 merge 速度（N 指标）
- MCP 够连不够爽；Slack/生产集成常要 **第一方体验层**

---

## 04 记忆最后一公里：知识系统、文件系统与管理者-子代理

**swyx（Host）：** 记忆——Ramp 博客没写，DeepWiki 也没索引。Devin 怎么做的？多代理呢，Walden 你那篇《别构建多代理》还成立吗？

**Cole Murray（Guest）：** **没完全解**。客户用 **技能**、改 Claude.md 补洞；整体记忆还是 **开放检索问题**——所以我犹豫要不要加「记忆」模块。

**Walden Yan（Guest）：** Devin 第一代持久记忆叫 **知识（Knowledge）**：希望 **用户不用主动写文档**。你纠正「git 不能那样用」——Devin 问 **要不要记住**，批准就进库。**95% 记忆来自这种自动生成**；很少有人坐下来写长篇规范。

难在 **生成别过度泛化**（一次要 draft PR ≠ 永远 draft PR）和 **检索别炸上下文**——记忆上千条，怎么 **在对的时机捞对的**？模型换代还要 **大量 eval** 保可靠。系统能 **编辑记忆**：「Cole 喜欢 draft PR」→ 你说不要了 → 「要更新成 open PR 吗？」

我们在想：**代理很会用文件系统了**——记忆要不要 **做成可导航的文件树**？OpenClaw 那种 **daily memory log** 吵但可审计。更激进：**记忆 md + 永久 PM Devin**——某 Slack 频道绑 DeepWiki 产品，Devin **自己维护优先级文档**，甚至 **建 ticket 给人或其他 Devin**。

**子代理 / 多代理**：给了 Devin **MCP 互发消息、spawn Devin**——结果 **太乱**。日常最实用仍是 **管理者-子代理**：派活到 **隔离盒子**，少共享机器，冲突面小。Cursor Wilson Lin 那篇 **单代理→多代理** 的实验，结论和我们一样。

一年前 **真·多代理互聊** 不现实；今天有实验，但很多是 **折叠回主代理的工具调用**（比如 DeepWiki 式子搜索）——像工具不像同事。

让我看多代理的理由，反而是 **Devin 会反驳我**——两个代理看到不同信息，能 **回来对齐谁对**，不再只会「你说得对」。Codex 主题色彩蛋那种 **对抗性** 也是信号。

**Walden Yan（Guest）：** 别搞蜂群—— **一个 Devin、长上下文、长任务** 更靠谱。我们曾让它 **重建 Windows OS**，跑够久真成了——demo 发太多就停了。多代理魅力在 **能力上限**，日常还是 **manager-subagent**。

**Cole Murray（Guest）：** 盒外架构下 **spawn 子会话** 理论一样——多一个 **控制面上的会话**，顶级代理协调即可；架构难，但解过一次就复用。

> **金句 · Walden Yan**
> **中文：** 代理反驳我，说明沟通成熟到可以多代理对齐了。
> **原文：** My favorite moments are when Devin tells me I'm wrong — that communication maturity makes a multi-agent world possible.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 知识记忆 | knowledge system | 纠正→提议记忆→人工批准 |
| 记忆 md | memory markdown | 代理自维护的项目经理式文档 |
| 管理者-子代理 | manager-subagent | 主代理派活，子代理隔离执行 |
| 工具式子代理 | tool-like subagent | 上下文折叠回主会话，非真同事 |

**本章小结**

- 记忆 **生成+检索** 都难；Devin 靠 **纠正触发+批准** 降低写作负担
- 方向：**文件系统式记忆** + **频道常驻 PM Devin**
- 多代理：**manager-subagent** 日常实用；蜂群仍偏 demo

---

## 05 grep 慢是网络文件系统：块差异存储与代码卫生

**swyx（Host）：** Ryan Lopopolo 那套「散弹枪并行 1000 倍」你俩怎么看？还有自建代理老说 grep 慢——根因是啥？

**Walden Yan（Guest）：** 我们内部试过 **纯 vibe coding、零 review 自动 merge** 能撑几周——**去年 12 月大约两周** 就会烂：改个按钮颜色，发现 **十个地方十种实现**。还得 **review + 可扩展地清理**。

**Cole Murray（Guest）：** **「不必看代码」** 在未来一段时间仍是坏主意。团队常见退化：** enthusiastic 但不 audit 的工程师** 把模式写进 repo，AI 又 **引用那些模式指数级复制**——20 层 if-else 变「标准」。要定期 **垃圾回收**：重复 helper、semgrep、lint。

**Walden Yan（Guest）：** 自建编码代理的朋友 **反复撞同一墙**：**grep 巨慢**。缺 infra 背景的人会去 **自建 grep 索引**——Devin 早期也踩过。根因 **细但简单**：很多 VM 底层不是本地盘，是 **网络文件系统（S3 挂载等）**——grep 其实在 **狂打网络**。

换文件系统 + **块差异存储格式**：1TB 盘只改 100 行，旧方案 **存整盘重启**；我们 **工作量跟 diff 成正比**——冷启动从 **~10 分钟** 砍下来。**卖代理 = 卖代理 + 代理 infra**；私有云、VPC、政府云都能自己铺。

**Cole Murray（Guest）：** OpenInspect 控制面在 **Cloudflare**；沙盒 **Modal** 客户多——快照重要；Daytona、E2B 在路线图上。

AI 写 Python 爱 **hasattr / getattr**——我们客户直接 **lint：getattr 就 fail PR**。新模型还爱在函数头写 **段落式 PRD 注释**——信息量大，个人我会删；也有人赌 **git 元数据存 prompt** 给未来 agent 读（Gitai 思路）。

**Walden Yan（Guest）：** 回归 **本地测试** 是大趋势——代理要跑完任务得 **能测**；老代码库缺 local DB、Compose。Devin 很会做 **mock server**；我 dream 一个 **Little Snitch 式** 流量观察 → 本地模拟全部依赖。

> **金句 · Walden Yan**
> **中文：** 你卖的不只是模型调用，是能让 grep 不卡死的那套机器。
> **原文：** When you sell an agent, you're selling the agent plus the agent infrastructure.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 块差异存储 | block-diff file storage | 按改动块快照，重启 proportional to diff |
| 网络文件系统 | network file system | S3 挂载等——grep 变网络瓶颈 |
| 奖励黑客 | reward hacking | 模型为避免失败写 getattr、冗余 re-export |
| 本地测试路径 | local test path | 不给生产 secret 也能跑完 agent 任务 |

**本章小结**

- **零 review 自动 merge** 约 **两周** 触顶（2025.12 技术水平）
- 代理 infra：**NFS 是 grep 慢常见根因**；块 diff 决定冷启动 economics
- 代码卫生靠 **lint + 定期 GC**；模块边界仍要人定硬约定

---

## 06 SRE 与「非工程师」：Slack 首响应、Windsurf 2.0 与定价

**swyx（Host）：** 客户今天最想上云代理的理由是什么？花多少钱算 sane？

**Cole Murray（Guest）：** 最常见 **SRE 首响应**：警报在 Slack、Datadog、Sentry——代理 **先收集上下文**，不一定立刻修，但 **轨迹+日志+库可见性** 齐活，常常 **直接出 fix PR**。OpenInspect 支持 **Datadog/Sentry/webhook 触发**。

第二 **非开发改代码**：PM **Slack 一句** 小 bug → PR，不再只开 Issue。支持 **标记一下** 就有完整 repro 上下文给工程。

**Walden Yan（Guest）：** 我们叫 **自动分类（auto-triage）**——每条警报/报告 **Devin 先动手**，尽量 **别离开 Slack**。CLI 对非技术人难；**聊天 UI** 直观又能碰全库——销售、支持都能问代码库问题。

还有 **安全扫描/审查** 管线。Windsurf 2.0 补 **前台指挥中心**：后台代理测完发视频很 magic，但 **硬活还得本地**——把 agent **拉下来审、推回去、点批准继续修**，尽量 **一个窗口搞定**（理想情况少刷 Slack）。

**Cole Murray（Guest）：** 预算看怎么用——常见 **每工程师每年 1000–5000 美元**；还没听到 **5 万/人/年** 成常态，但会涨。

**Walden Yan（Guest）：** **Smart Friend** 思路回归：混合 **前沿 + 次前沿**——快的用便宜模型，关键步调 frontier。Anthropic 已正式采用类似分层。

招聘画像？**品味极高的 product engineer**——标准是你 **端到端 ship 过让自己骄傲的东西**。

> **金句 · Cole Murray**
> **中文：** 部署后台代理只是开始，进公司生态才是真活。
> **原文：** Deploying a background agent system is one thing — if it's not integrated into your larger ecosystem, it's not that useful.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 自动分类 | auto-triage | 警报进来代理先收集/归类/尝试修 |
| 触发器 | trigger | Datadog/Sentry/webhook 无人值守启动代理 |
| Smart Friend | Smart Friend | 前沿+次前沿混合，快处省钱关键处用强模型 |

**本章小结**

- **SRE 首响应 + Slack 驱动 PR** 是最快 ROI；支持/销售用聊天触达代码库
- **Windsurf 2.0** 补本地↔云切换；前台要快、后台要 autonomous 测完
- 预算 **~1k–5k USD/工程师/年** 常见；集成成本 >> 席位费

---

## 总结：2025 是后台 Agent 元年，卖的是 harness + infra

| 维度 | 要点 |
|------|------|
| 范式 | IDE 插件 → **Spec 驱动后台代理**；Cognition 内部 **80% 提交** |
| 架构 | **盒外大脑-机器分离** + **repo setup**；秘密与权限物理隔离 |
| 测试 | **编排与代码上下文** >> computer use；多模型协作常见 |
| 记忆 | **纠正触发知识库** → 文件系统/PM 式 **memory md** |
| Infra | **NFS 杀 grep**；**块 diff** 杀冷启动；代理产品 = 模型 + 机器 |
| 落地 | **SRE triage**、PM/支持 **Slack→PR**；集成比席位更贵 |
| 多代理 | 日常 **manager-subagent**；反驳能力是多代理前提 |

### 对个人的启示

- 自建代理先查 **沙盒是本地盘还是 NFS**——别急着造 grep 索引
- **Spec 质量** 决定 2025 末的「摩擦极小 PR」体验；记忆靠 **纠正时批准** 积累
- 多代理：**隔离盒子** 比蜂群聊天先落地

### 对团队 / 产品的启示

- **盒外 + repo setup** 是企业权限与合规的默认架构题
- 测试 invest 在 **eval 与编排**，别只追 computer use 演示
- 预算按 **集成与 triage 工作流** 估，不只 API 席位

### 仍待验证

- **memory md / 文件系统记忆**  vs 向量检索的长期 ROI
- **零 review 自动 merge** 窗口是否随 4.7+ 模型拉长
- MCP **双向表现力**（sampling）能否避免第一方集成爆炸

> **金句 · Walden Yan（封底）**
> **中文：** 人们低估了「品味极高的产品工程师」——你 ship 过什么，比你会调模型更重要。
> **原文：** People underestimate the role of extremely taste-driven product engineers — what have you shipped end-to-end that you're proud of?

---

## 附录

### 章节时间戳（专栏 · 重点速览）

| 章 | 主题 | 时间 |
|----|------|------|
| 01 | 后台代理取代 IDE · 80% 提交 | [05:12] |
| 02 | 大脑与机器物理分离 | [12:45] |
| 03 | 测试 = 推理编排 | [21:30] |
| 04 | 记忆最后一公里 | [35:15] |
| 05 | 网络文件系统与块 diff | [48:20] |
| 06 | SRE 与非研发受益 | [58:40] |

### 素材与收录

- **专栏（S 主源）：** [cv50190493](https://www.bilibili.com/read/cv50190493/)
- **视频：** [BV1itEh6FEUW](https://www.bilibili.com/video/BV1itEh6FEUW/)
- **ingest：** `Recastory/workspace/bilibili-retranscribe/BV1itEh6FEUW/ingest/column_article.md`
- **形态：** 1 BV = 1 篇 canonical；`material_tier: S` · `dialogue_version: v3.2`
- **时长：** ~70 min（4173 s）→ 建议 spot check 数字

### 相关阅读

- [[MOC - Harness Engineering]] — Harness 横切索引（盒外线束、infra、记忆模块）
- [[OpenAI研究员-Harness工程软件开发新范式]] — OpenAI 侧 harness 范式：代码免费、注意力稀缺、角色化审查
- [[OpenClaw创始人-我是如何使用OpenClaw的]] — 文件系统式记忆、IM 驱动 agent 的平行路线
- [[Anthropic团队-如何构建运行数小时的Agent]] — 长程 agent 与 harness 共同进化
