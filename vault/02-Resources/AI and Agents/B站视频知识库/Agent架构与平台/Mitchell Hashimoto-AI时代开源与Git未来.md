---
title: "Mitchell Hashimoto：AI 时代开源与 Git 未来"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "harness_engineering"]
created: "2026-07-07"
source: "B站视频 - Easonlee的AI笔记"
description: "Mitchell：12 岁 PHP 手册启蒙与 HashiCorp 笔记本起源；AWS 傲慢 vs Azure 共赢 vs GCP 技术强不谈生意；AI 低质量 PR 与 Lobsters 式担保；Git 五年问号；永远留一个 agent 跑慢任务；非思考任务委托。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Mitchell Hashimoto-AI时代开源与Git未来.md"
source_sha256: "d939b7ec138d47a831541fbf2c0b0578d7db42cda4d1b6da2d09eb14eabd984e"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1mncRznEd6/"
column_url: "https://www.bilibili.com/read/cv46693180/"
host_name: "播客主持人"
guest_name: "Mitchell Hashimoto"
guest_title: "HashiCorp 联合创始人 · Ghostty 作者"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1mncRznEd6/ingest"
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1mncRznEd6/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1mncRznEd6/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_article partial + summary/ASR supplement for truncated column"
speaker_confidence: medium
duration: "1:58:24"
saved: 2026-07-07
updated: 2026-07-07
concepts:
  - id: default_deny_oss
    zh: 开源默认拒绝
    en: default deny open source
    one_line: AI 让似是而非的 PR  trivial，需社区担保才能贡献
  - id: git_future_question
    zh: Git 五年之问
    en: will Git exist in five years
    one_line: Agent 海量分支与 merge queue 让现有 GitHub 工作流撑不住
  - id: always_on_agent
    zh: 永远留一个 agent
    en: always have an agent running
    one_line: 出门前派慢研究任务；关通知，人打断 agent 而非反过来
  - id: delegate_non_thinking
    zh: 委托非思考任务
    en: delegate non-thinking work
    one_line: 选自己想深度思考的事，样板研究交给代理
  - id: cloud_partner_triad
    zh: 三大云合作气质
    en: AWS vs Azure vs GCP partnership
    one_line: AWS 傲慢；Azure 先问如何双赢；GCP 技术极致少谈商业
author:
  - "[[Mitchell Hashimoto]]"
---

# Mitchell Hashimoto：AI 时代开源与 Git 未来

**Host：** 播客主持人  
**Guest：** Mitchell Hashimoto（HashiCorp / Terraform 联合创始人，Ghostty 终端作者）  
**形态：** Host-Guest v3.2（**专栏主源**；专栏正文在 §03 处截断，§04–06 据专栏摘要/问答精选与 ASR 补全）  
**B 站：** [BV1mncRznEd6](https://www.bilibili.com/video/BV1mncRznEd6/) · **时长** ~118 min · **专栏** [cv46693180](https://www.bilibili.com/read/cv46693180/)

---

## 开场

Mitchell 12 岁靠网上 PHP 代码入门，华盛顿大学「西雅图项目」失败后在笔记本写下 HashiCorp 缺什么；联合创始人 Arman 两分钟回邮件。这期长谈：**三大云合作真实体验**、**Ghostty 与终端文艺复兴**、**AI 把开源信任系统压垮**、**Git 会不会五年内消失**，以及他给自己定的规则——**永远有一个 agent 在后台跑**。

**术语速查**

| 中文 | 英文 | 白话 |
|------|------|------|
| 担保制 | vouching system | 社区成员背书才能开 PR |
| Libghostty | Libghostty | 可嵌入的最小终端库，修遍地烂伪终端 |
| Harness 工程 | harness engineering | AI 犯错就加工具/测试防再犯 |
| 默认拒绝 | default deny | 开源从默认信任 PR 变默认关门 |

---

## 01 编程启蒙与 HashiCorp 萌芽

**Mitchell Hashimoto：** 12、13 岁打游戏自学编程，只能读网上公布的代码——父母不肯买 50 美元专业书。我每天走路上学揣着打印的 PHP 手册前几十页，几周后某天突然懂了 `$` 是变量，之后进展飞快。做作弊站、仿 PayPal、论坛——大学才算「认真」。

华盛顿大学「西雅图项目」一季度失败，笔记本记下缺什么：调度、节点启动……后来 Arman 两分钟内回复「来聊聊」——HashiCorp 的起点。早期老板拔掉我鼠标逼我用键盘、装 `screen`——严酷但把我拽进基础设施。

**小结：** 约束塑造软件；失败项目 + 笔记本 = 产品路线图种子。

---

## 02 三大云：AWS 傲慢、Azure 共赢、GCP 不谈钱

**Mitchell Hashimoto：** 在 HashiCorp 时对各云得客气；离职后说实话（约 2019 年前后印象）：

- **AWS：** 傲慢。每次合作像赏脸；隐隐「我们会做个服务干掉你」。领导层两年怕 Vault 服务突然出现。Terraform AWS provider 我们雇 **~5 名全职工程师**（约百万美元/年）维护开源集成，AWS **最后才帮忙**——直到我们威胁 **公开弃用 provider** 他们才动。
- **Azure：** 技术上名词地狱，但商务侧专业。开会第一句常是 **「我们俩怎么一起赢？」** 最早全力支持 Terraform。
- **Google Cloud：** 技术、架构最强，自动 provider 生成很优雅；一谈到销售配额归因就 **聊两小时边缘 case，生意谈不下去**。

开源许可 MIT/ML——Amazon 可以 fork 任何服务；Elastic 被 AWS 伤害是开源 **可被武器化** 的公开课。

**小结：** 云合作差异在商务文化，不只技术好坏。

---

## 03 Ghostty：终端复兴与 AI 意外带火 CLI

**Mitchell Hashimoto：** 离开 HashiCorp 后想练桌面系统编程——反向选题：先选 **Zig + GPU**，再问能做什么；终端是「用了十年却不懂」的玩具，挖下去发现 **30% 终端 + 70% 字体渲染**。多线程：UI 线程、IO 线程、渲染线程；大文件 `cat` 速度是口碑点（Redis 生产日志不必先落盘）。

**AI 意外：** Cloud Code 等让 **终端使用时间上升**——2023 年我会说终端要完，结果 CLI 工具反而更多。我做 **Libghostty**（MIT）让人别再造半截烂终端。Codex/Claude/Amp 每天用；**非思考性样板** 交给 AI，省下的两小时做真想思考的事。

工作流：**尽量始终有一个 agent 在干活**——我写代码时它规划，它写时我审；通常不超过两个，难任务会让 Claude vs Codex **赛马**。Ghostty 本体 **逐行审**；亲戚婚礼站 **能渲染就行直接 ship**。

**小结：** Agent 时代终端没死，反而因 CLI 工具回流。

---

## 04 AI 低质量 PR：披露 → 禁止 → 担保制

**Mitchell Hashimoto：** 一年前要求披露 AI 贡献——不是歧视 AI，是 **投入不对等**：你花几分钟扔墙外，我没义务花几小时帮你改。开源以前也有烂代码，但多是 **真心尽力** 的初级贡献者，值得教。

拐点：代理开始 **自己开 PR**，草稿空 body、一分钟内填完再 reopen——**一天三次，不像人类**。Ghostty 政策升级：**AI 写的 PR 一律不收**，除非关联已接受的 feature request；drive-by 每天两三份，**看都不看直接关**。

下一步（受 Lobsters + Pi 启发）：**任何人不能自行开 PR**——须社区成员 **担保**；你行为恶劣，担保人及整棵邀请树 **永久封禁**；也可 **谴责（denounce）** 坏演员。AI 让「看起来对其实错」的贡献 trivial，开源从 **默认信任** 变 **默认拒绝，须赢得信任**。

**小结：** 维护者时间比合并按钮贵——信任机制要重写。

---

## 05 Git 与未来：海量变更、prompt 历史

**Mitchell Hashimoto：** 大厂 mono repo 因 Agent **产出量斜率变陡** 在重新架构——clone 全库、merge queue、rebase 地狱。Agent 实验分支大量丢弃，Git 却丢信息；我想要 **Gmail 时刻**：别删邮件，全 archive，靠更好检索。

**「Git 几年后还在吗？」**——这是 **12–15 年来第一次** 问这话没人笑。Agent 写代码开 PR 交付功能，**Git + GitHub 现有形态协同不了**；PR diff 无意义时，**prompt 历史** 更重要。我顾问一家 stealth 公司做这块——全真押 Agent 的公司在 merge、权限、性能上挣扎。

还有 **CI/CD、测试、编辑器、可观测性** 全在桌上；容器因 **Agent 沙盒** 需求 **斜率级增长**，压 Kubernetes/Docker。Amp 说 **everything is changing**——我 20 年生涯里第一次见这么多范式同时松动。

**小结：** 版本控制可能要围绕 **agent 产出 + 验证 harness** 重设计。

---

## 06 工作法：慢任务、关通知、雇人看 AI 素养

**Mitchell Hashimoto：** 出门上车前问：**什么慢任务能让 agent 跑一小时？** 深度调研、边界 case 分析（如担保系统）——我关 **所有桌面通知**，**我打断 agent，不让它打断我**。把任务分成 **要思考 / 不要思考**，后者尽量委托。

招聘：**必须会用 AI 工具**（不必事事用）；原型可以 **故意 slop** 一天证伪，但 **开源 PR 不是 slop 的地方**。最好工程师往往是 **9–5、无 GitHub 曝光、上下文切换最少**——社交媒体零和，换走 flow 恢复时间。创业建议：按 **10 年** 想，要有点 **傲慢** 相信你能做得更好，但别盲到看不见变化。

**小结：** AI 放大的是 **你选择思考什么**，不是替你思考。

---

## 概念表

| 概念 | 一句话 |
|------|--------|
| 默认拒绝贡献 | AI PR 洪水逼开源改信任模型 |
| 担保制 | 社区背书才能 PR，坏行为连坐邀请树 |
| Git 五年之问 | Agent 变更量让 Git/GitHub 工作流濒临失效 |
| 永远留一个 agent | 慢研究后台跑，人专注高价值思考 |
| Harness 工程 | AI 犯错 → 加测试/工具防再犯 |
| 三大云气质 | AWS 傲慢 / Azure 共赢 / GCP 技术强 |

---

## 金句

- **Mitchell：** 开源一直是信任系统——以前是默认允许，现在是默认拒绝，须有人担保。
- **Mitchell：** 合并按钮是最简单的一步；维护几年才是难的——该 fork 就 fork。
- **Mitchell：** 用 AI 错的方式会让人少思考；用对的方式是 **选择思考什么**。
- **Mitchell：** 这是 12–15 年来第一次问「Git 五年后还在吗」不会被人笑。

---

## 行动启示

- 维护者：对 AI drive-by PR **设硬政策**；考虑担保/邀请制，保护审阅带宽。
- 个人工作流：出门前派 **≥30 分钟慢任务** 给 agent；关通知，保持人主导节奏。
- 工程组织：为 Agent **sandbox 与 CI 扩容** 做预算；开始记录 prompt/验证链，别只盯 diff。
- 招聘：测 **AI 工具边界感**——敢 slop 原型，不敢 slop 生产库。

---

## 相关阅读

- [[Jeff-AGENTS.md历史与最佳实践]] — AGENTS.md 槽位与 harness 轻量化
- [[2026 年 Agent 最重要的工程概念 Harness Engineering]] — harness 工程范式
- [[Cloudflare专家-Sandbox确保AI代码安全]] — Agent 沙盒与隔离
- [[MOC - Harness Engineering]]

---

## 来源

- B 站：[BV1mncRznEd6](https://www.bilibili.com/video/BV1mncRznEd6/)
- 专栏：[cv46693180](https://www.bilibili.com/read/cv46693180/)（正文 **不完整**，约至 HashiCorp 萌芽）
- 主源：`Recastory/workspace/bilibili-retranscribe/BV1mncRznEd6/ingest/column_article.md`
- 补源：专栏摘要/问答精选；`Recastory/workspace/bilibili-retranscribe/BV1mncRznEd6/article.md`（ASR）
