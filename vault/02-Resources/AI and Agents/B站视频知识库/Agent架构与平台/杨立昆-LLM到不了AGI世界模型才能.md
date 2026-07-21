---
title: "杨立昆-LLM到不了AGI世界模型才能"
tags: ["ai_agent", "article", "bilibili"]
legacy_tags: ["ai_agent", "article", "bilibili"]
created: "2026-07-09"
source: "https://www.bilibili.com/video/BV1wwDbBGEsA/"
description: "LeCun创办AMI，系统批判LLM路线：纯文本训练无法通向人类水平AI，世界模型+JEPA才是正确方向；莫拉维克悖论仍是核心障碍；目标驱动架构比LLM微调更安全"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/杨立昆-LLM到不了AGI世界模型才能.md"
source_sha256: "aa839904294652e1f5c88f4c78c3af58a5392a7c1aa2ca47ad7ef34c68631d09"
migration_id: "migration-20260720-64e79771"
column_url: "https://www.bilibili.com/read/cv47657283/"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1wwDbBGEsA/ingest"
transcript_source: column_article
duration: "1:50:07"
moc: "[[MOC - Agent Theory and Design]]"
dialogue_version: v3.2
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
genre: "Host-Guest canonical"
host_name: "信息瓶颈播客主持人"
guest_name: "Yann LeCun"
guest_title: "图灵奖得主，FAIR首席AI科学家，AMI创始人"
speaker_inference: "column_article S-tier"
speaker_confidence: high
author:
  - "[[Yann LeCun]]"
---

# LLM到不了AGI，世界模型才能

> 对谈：信息瓶颈播客主持人 × Yann LeCun | 时长 1:50:07 | 来源：Easonlee的AI笔记专栏

---

## 概念

| 中文 | 英文 | 一句话 |
|------|------|--------|
| 世界模型 | World model | 预测行为后果的内部模拟器，规划的基础 |
| JEPA | Joint-Embedding Predictive Architecture | 在抽象表征空间预测，不预测像素 |
| 目标驱动型AI | Objective-driven AI | 目标+约束→优化→行动序列，结构上保证安全 |
| 莫拉维克悖论 | Moravec's Paradox | 人类觉得难的（下棋）机器简单，人类觉得简单的（猫的灵活性）机器极难 |
| 信息瓶颈 | Information bottleneck | 自编码器需限制信息量防止恒等映射 |
| 崩溃问题 | Representation collapse | 联合嵌入架构中编码器退化为常量输出 |

---

## 金句

> **1.** "认为堆算力加合成数据就能实现超级智能，完全是胡说八道。"
> **2.** "智能与支配欲是两回事。人类的支配欲是社会性进化的结果，AI没有这种生物本能。"
> **3.** "在达到狗或猫的智能水平之前，谈论AGI都是妄想。"

---

## 章节

### 01 创业与研究（00:00）
LeCun离开Meta创办AMI（Advanced Machine Intelligence），专注世界模型和JEPA。核心观点：投资者现在允许创业公司在前几年做纯研究，这是新现象。AMI的上游研究必须公开发表——"不发表就不是研究，你很容易被自己愚弄"。目标：成为未来智能系统的主要供应商之一。

### 02 世界模型与抽象表示（08:30）
系统阐述JEPA技术演进史。从90年代孪生网络→2005年对比学习→2020年Barlow Twins→VICReg→SigReg。核心论点：10^14字节文本=15000小时视频=一个4岁孩子清醒时的视觉输入。纯文本训练不可能达到人类水平，冗余的视频数据才是学习的切入点。世界模型不是像素级模拟器——物理学家用PV=nRT而不是模拟每个分子碰撞，AI也应在抽象表征空间预测。

### 03 游戏AI与莫拉维克悖论（28:00）
Nethack等游戏需要在不确定性下规划：树搜索+价值函数，这个思想可追溯到1964年Samuel的跳棋程序。AlphaGo展示了这套方法的力量，但下棋是人类很弱的领域。莫拉维克悖论仍然有效：几十年过去，机器人灵活性仍远不如猫。AI代理在游戏中的表现仍然很差。

### 04 AGI与AI安全（40:00）
"通用智能"概念本身没有意义——人类智能是高度专业化的。达到狗的水平比从狗到人类更难。LLM通过微调防范风险容易被越狱；目标驱动架构通过世界模型预测后果+硬性约束（不伤害人类），从结构上保证安全。斯图尔特·罗素的咖啡机器人例子：目标驱动系统可以在优化目标的同时强制满足安全约束。

### 05 AI研究领域与行业发展（50:00）
硅谷的LLM单一文化：OpenAI、Google、Anthropic、Meta都在做同样的事，羊群效应阻碍创新。DeepSeek的突破让硅谷惊讶——"硅谷之外的人也能提出原创想法？"。中国公司反而更开放，最好的开源系统很多是中国制造的。FAIR正在被推向更短期的LLM项目，减少论文发表。

### 06 个人选择与AI发展（01:05:00）
LeCun的人生使命：增加世界上的智能总量。智能与支配欲无关——最聪明的人往往不想支配他人。航海需要在脑中运行抽象CFD（计算流体动力学），这正是世界模型的直觉体现。给年轻人的建议：学"保质期长"的东西，数学、建模、控制理论、信号处理——往往不是计算机科学。AI实时编程会很酷，未来很多代码只用一次。

---

## 附录

**章节时间戳**
- 00:00 创业与研究：AMI成立背景
- 08:30 世界模型与抽象表示：JEPA技术演进
- 20:15 纯文本训练的局限
- 28:00 游戏AI与莫拉维克悖论
- 38:50 目标驱动架构 vs LLM微调
- 46:30 硅谷LLM单一文化批判
- 55:15 智能不等于支配欲
- 01:05:00 个人选择与给年轻人的建议
- 01:25:00 神经科学与AI的互相启发

**Ingest 信息**
- column_source: Recastory/workspace/bilibili-retranscribe/BV1wwDbBGEsA/ingest/column_article.md
- asr_status: column_ready

**相关阅读**
- [[MOC - Agent Theory and Design]] — Agent时代总入口
- [[杨立昆-世界模型才是未来]] — 同一人不同对谈，更聚焦JEPA与Tapestry
- [[姚顺雨-预测性Agent设计]] — 世界模型在Agent设计中的应用
