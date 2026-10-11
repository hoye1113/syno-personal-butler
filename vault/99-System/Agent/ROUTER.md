---
title: "Agent 任务路由与武器库网关 v4"
tags:
  - notes
  - skills
  - ai_agent
  - router
  - weapon_arsenal
created: 2026-07-13
updated: 2026-10-11
source: vault_initiative - agent_control_plane
description: "把用户意图路由到唯一 canonical Skill 或 31 大 S 级神级武器库，避免平台入口复制业务规则，实现一跳按需唤醒。"
---

# Agent 任务路由与武器库网关 v4

> **理论基石**：参见 [[从过度规训到大松绑——强模型时代的 Agent Skills 演进与重构]] 与 [[MOC - Agent Skills 武器库]]。  
> **核心原则**：管家不凭空发明低效临时提示词。遇到明确工程、研报、写作、思辨或生活需求时，**直接一跳唤醒对应的 S 级武器库卡片或 canonical Skill**。

---

## 一、基础知识库任务路由（Canonical Skills）

| 用户意图 | canonical Skill / 必读 | 负向红线（不做） |
|---|---|---|
| **收录外部内容** | `vskill-vault-curate/SKILL.md` + [[INGEST-CONTRACT]] | 不直接开始写正文，先查重与评级 |
| **B 站图文专栏** | curate + `B站图文专栏精华收录.md` | 不扫描空间、不读纯表情图、不转入 ASR |
| **写观点文/对谈** | `vskill-vault-write` blade + Host-Guest SUBDOC | 不把编辑性提问冒充原话，不当作资料收录 |
| **找反向链/知识关联** | `vskill-vault-relate` | 不凑无实质关系的死链，标明关系类型 |
| **跨笔记探讨** | `vskill-vault-discuss` | 不擅自修改 vault 事实源 |
| **MOC 设计与重构** | `vskill-vault-moc-builder` | 未经用户确认不擅自新建 MOC |

---

## 二、31 大 S 级神级武器库场景唤醒网关（按需路由）

当任务超越常规收录，进入深度攻坚、架构设计、深度写作或认知思辨时，直接检索并唤醒以下对应卡片：

### 1. 工程攻坚与研发心智
- ❓ **需求存在未解假设 / 功能初审** ➔ [[grilling - 交互式需求深度拷问与反向对齐|grilling]]（决策树 Frontier 推进，提问查环境不问人，附带推荐项）
- 🔍 **遇到反常/怪异遗留代码** ➔ [[wait-what - 历史代码考古学与防御性治理|wait-what]]（强制刹车，Git Blame 考古，特征测试先行，严禁盲目重构）
- ⚖️ **重大架构设计 / 技术方案选型** ➔ [[design-it-twice - 深度模块设计与强制双对立方案裁决|design-it-twice]]（小接口大实现，强制双轨对立方案权衡比对）
- 📝 **编写 Agent 规范 / SKILL.md** ➔ [[writing-for-agents - 高确定性高密度 Agent 契约指令写作法|writing-for-agents]]（两项负荷核算，信息天梯，抗早熟完成防线）
- ✂️ **代码排错 / 代码瘦身 / 方案初审** ➔ [[ponytail - 最懒资深架构师心智|ponytail]]（最懒资深架构师，能不写就不写，专注减法审计）
- 🗺️ **复杂系统梳理 / 全景架构展示** ➔ [[archify - 交互式动态架构图生成器|archify]]（交互动态单文件 HTML 架构全景）
- 🕵️ **代码合并前 / 发布前诚实度审计** ➔ [[reality-check - 代码诚实度无情审计|reality-check]]（专查假测试、Mock 滥用与假健康检查）
- 🔓 **逆向工程 / 私有协议 / 二进制审计** ➔ [[reverse-skill - 逆向工程与安全研究技能路由包|reverse-skill]]（自举 IDA/Frida/Jadx/Burp 安全路由）

### 2. 深度研究、投研与严谨数据
- 📊 **复杂产品 / 技术 / 竞品深度调研** ➔ [[hv-analysis - 横纵深度研究分析法|hv-analysis]]（索绪尔历时-共时融合研报）
- 📈 **二级市场上市公司深度研报** ➔ [[equity-researcher - 机构级上市公司投研研报生成器|equity-researcher]]（含 DCF 估值模型与敏感性分析）
- 💣 **上市公司财报深度排雷** ➔ [[financial-report-reader - 财报三表联动与暴雷排查|financial-report-reader]]（Python 确定性排雷 CLI）
- 🏢 **商业模式本质 / 早期创业项目评判** ➔ [[ljg-invest - 秩序创造机器与创生公式投资法|ljg-invest]]（热力学负熵流视角穿透）
- 📑 **个人账单 / 投资对账 / 脏表治理** ➔ [[huashu-excel - 数据全流程与严格对账|huashu-excel]]（严格勾稽关系与口径定义）
- 🌐 **知识库文章对外发布 SEO 优化** ➔ [[geo-content-optimizer - 生成式引擎引用优化|geo-content-optimizer]]（生成式引擎引用优化 GEO）

### 3. 思想铸造、认知跃迁与纯正中文
- 🪓 **母语写作 / 散文杂感 / 彻底去 AI 腔** ➔ [[ljg-writes - 汪曾祺与阿城笔调纯正中文写作引擎|ljg-writes]]（五刀三磨，干净动词短句白描）
- 🎯 **观念重构 / 战略决断 / 第一性原理** ➔ [[ljg-think-rank - 追本之箭与认知降秩生成器|ljg-think-rank]]（垂直下潜追本 + 降秩生成器）
- 🧭 **李继刚 15 大心智模型全景按需调用** ➔ [[ljg-suite - 李继刚认知与思想铸造全景套件|ljg-suite]]（认知全景套件主枢纽）
- 🎙️ **深度复盘 / 个人隐性经验萃取** ➔ [[deep-interview - 苏格拉底自适应深度访谈萃取法|deep-interview]]（苏格拉底自适应访谈）
- 🎓 **攻坚硬核新技术 / 跨会话学习** ➔ [[sigma - Bloom 2-Sigma 一对一认知导师|sigma]]（不给现成答案，80% 掌握度门禁）
- 📚 **经典大部头精读 / 知识库深度编译** ➔ [[book-study - 读书教练与深度知识库编译系统|book-study]]（编译生成 Obsidian `book-wiki/` 双链）
- 💡 **向外行生动科普抽象概念** ➔ [[concept-fable - 零术语抽象概念寓言|concept-fable]]（≤1000字零术语寓言）
- 📰 **科技公众号深度长文出稿** ➔ [[khazix-writer - 数字生命卡兹克公众号长文写作心智|khazix-writer]]（活人感故事，HKR 质检驱动）

### 4. 视听呈现、多模态与生活赋能
- 🖼️ **经典文章 / 观点金句出高清长图** ➔ [[ljg-card - 思想铸卡与老宋体视觉排版|ljg-card]]（金陵老宋体 + SVG 几何文人排版）
- 🎬 **视频音画智能笔记与截图沉淀** ➔ [[BiliNote - 视频音画智能笔记与截图沉淀助手|BiliNote]]（Fast-Whisper 本地转写 + 论点自动抽帧截图）
- 🎥 **纯代码程序化渲染视频** ➔ [[remotion-best-practices - Remotion 纯代码视频构建标准|remotion-best-practices]]（React + Spring 物理动效）
- 💻 **16:9 网页伪视频与口播演说** ➔ [[web-video-presentation - 16比9点击驱动网页伪视频生成器|web-video-presentation]]（点击驱动网页伪视频生成）
- 📱 **X/推文自动化切片图集与视频** ➔ [[yichen-x-slicer - X推文切片与多模态视频引擎|yichen-x-slicer]]（3:4 琥珀色卡片 + 原声 MP4）
- 🎨 **项目原型 / 落地页 / PPT 开源设计** ➔ [[open-design - 本地优先全能设计引擎|open-design]]（本地优先全能设计系统）
- 🛑 **待办积压 / 防疲惫启动微行动** ➔ [[product-behavioral-nudge-engine - 行为心理学与防疲惫助推引擎|product-behavioral-nudge-engine]]（5分钟微冲刺无痛启动）
- 📷 **随手拍旅行照片转水粉剪纸艺术卡** ➔ [[travel-memory-sticker-card - 水粉剪纸旅行贴纸卡|travel-memory-sticker-card]]（3:2 横版艺术卡 + 6枚贴纸）
- ✂️ **儿童定格动画短片制作** ➔ [[kid-papercraft - 儿童折纸定格动画短片|kid-papercraft]]（三段式温暖定格短片）

---

## 三、相关阅读

- [[MOC - Agent Skills 武器库]]
- [[从过度规训到大松绑——强模型时代的 Agent Skills 演进与重构]]
- [[AI 产品上下文压缩方法论与三板斧实践]]
- [[原位自演化智能体 In-situ Self-evolving Agent 架构]]
- [[MOC - 知识库导航]]
