---
title: "Ulta副总裁：AI Agent落地零售行业实践"
tags: ["ai_agent", "article", "bilibili", "harness_engineering", "multi_agent"]
legacy_tags: ["ai_agent", "article", "bilibili", "harness_engineering", "multi_agent"]
created: "2026-07-09"
source: "B站视频 - Easonlee的AI笔记"
description: "Ulta Beauty（1300+门店/6.5万员工）用 ServiceNow + Now Assist 解决 HR/IT 信息孤岛：政策个性化响应、自动化边界划定（行政归AI/情感归人）、数据基础迁移、从预期结果倒推 AI 转型。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Ulta副总裁-AI Agent落地零售行业实践.md"
source_sha256: "f08f9e167f53b6828b99b5cd13cbf1dcc5b2faad4ddc6b9cff0d1d5d82b1d03b"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1ynJu6EEpC/"
column_url: "https://www.bilibili.com/read/cv50566145/"
host_name: "Alex Kantrowitz"
guest_name:
  - "Rachel Williamson"
  - "Josh Siebert"
guest_title:
  - "Ulta Beauty 人力资源副总裁"
  - "Ulta Beauty AI/数据/企业平台副总裁"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1ynJu6EEpC/ingest"
duration: "27:31"
saved: 2026-07-09
updated: 2026-07-09
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1ynJu6EEpC/ingest/column_article.md"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1ynJu6EEpC/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical (podcast)
speaker_inference: "column keynote"
speaker_confidence: high
concepts:
  - id: info_silo_elimination
    zh: 信息孤岛消除
    en: info silo elimination
    one_line: 分散内网信息整合进 AI 搜索/聊天，政策个性化实时响应
  - id: automation_boundary
    zh: 自动化边界
    en: automation boundary
    one_line: 行政事务交 AI，情感/法律判断保留人工干预
  - id: busywork_to_value
    zh: 消除忙碌假象
    en: busywork elimination
    one_line: 自动化非裁员，是释放人力从行政转创造性增值
  - id: data_foundation
    zh: 数据基础迁移
    en: data foundation for AI migration
    one_line: 第三方数据导入+LLM 内容审查/规则校验，确保一致性
  - id: outcome_driven_ai
    zh: 结果倒推 AI 转型
    en: outcome-driven AI transformation
    one_line: 先定业务问题和利益相关者，再上 AI，非自上而下命令
author:
  - "[[Rachel Williamson]]"
  - "[[Josh Siebert]]"
  - "[[Alex Kantrowitz]]"
moc: "[[MOC - Agent Theory and Design]]"
---

# Ulta副总裁：AI Agent落地零售行业实践

**Host：** Alex Kantrowitz（Big Technology）  
**Guest：** Rachel Williamson（Ulta HR VP）· Josh Siebert（Ulta AI/Data VP）  
**形态：** Host-Guest canonical v3.2（**专栏主源**）  
**B 站：** [BV1ynJu6EEpC](https://www.bilibili.com/video/BV1ynJu6EEpC/) · **时长** 27:31  
**公司：** Ulta Beauty — 1300+门店，6.5万员工，美妆零售巨头

---

## 概念

| 概念 | 一句话 |
|------|--------|
| 信息孤岛消除 | 万页手册+排队咨询 → AI 搜索/聊天机器人实时个性化响应 |
| 自动化边界 | 更新地址/W2查询等行政事务 → AI；职场骚扰/员工关怀 → 人 |
| 消除忙碌假象 | 自动化不裁员，是让 HR 从行政堆积邮件中解脱，转向员工体验管理 |
| 数据基础迁移 | 第三方数据导入是难点；LLM 审查内容不一致+品牌语调校验 |
| 结果倒推 AI 转型 | 先明确业务问题、锁定利益相关者、变革管理引导，非"为用AI而用AI" |

---

## 金句

> 「人工智能不是一个结果，它是一个促成因素。」 ——Rachel Williamson

> 「员工像刘易斯和克拉克那样进行'探险'来寻找内容。」 ——Rachel Williamson

> 「加州的就业法律有时因县、市而异。一刀切的政策会过时，维护起来太难了。」 ——Rachel Williamson

> 「重置密码是一回事，'在工作中受到骚扰'是完全不同性质的联系。」 ——Rachel Williamson

> 「IT 专业人员是业务成果的促成者。」 ——Josh Siebert

> 「忙碌有时会给人一种安全感——但那最终并不是你真正想做的工作。」 ——Alex Kantrowitz

---

## 章节

### 01 项目背景 [00:00]
Ulta Beauty 与 ServiceNow 合作的 HR 服务交付平台于 4 月 8 日上线。6.5万员工（门店+配送中心+总部），此前内网信息分散，搜索效率极低。

### 02 员工信息获取痛点 [04:15]
员工需翻阅万页手册或排队咨询 HR。加州法律因县市而异，"一刀切"政策失效。65,000人规模下不能靠加人解决，预算也不允许。

### 03 ServiceNow 解决方案 [09:42]
选择 ServiceNow 作为"行动系统"——集成度高，HR + IT 统一入口。Now Assist 聊天+搜索，识别员工身份/地点/角色，个性化返回适用政策。品牌定制 UI（橙+粉）。

### 04 AI 与人工协作边界 [13:10]
自动化边界划定：地址更新、W2查询、费用报销等行政事务 → AI；员工关怀、骚扰举报 → 人工。法律合规部门参与审查用例设计。

### 05 自动化提升工作价值 [18:50]
HR 团队从行政文书（电话+邮件堆积）中解脱，转向员工体验管理。Rachel 带着亚马逊十年经验推动自动化，Josh 来自埃森哲，双方协作推进四阶段方法。

### 06 团队接受度 [23:15]
65,000人支撑压力下，团队已到崩溃边缘。引入自动化时团队反应积极："太好了，请问什么时候能实现？"——因为他们能看到自动化减负而非替代的价值。

### 07 数据迁移与未来 [23:15]
最大难点是第三方数据导入。下一步：搬迁内网（HR+门店运营），转向员工生命周期管理（入职/晋升/调岗），用 AI Agent 支持流程。

### 08 实施建议 [23:15]
- 从预期结果倒推，不为用 AI 而用 AI
- 锁定关键利益相关者，获得早期支持
- 强有力变革管理引导员工适应
- AI 是促成因素，不是结果本身

---

## 附录

**相关阅读：** [[MOC - Agent Theory and Design]]

**关联笔记：**
- [[IBM团队-Harness工程详解]] — Agent 工程框架视角
- [[Anthropic团队-如何构建运行数小时的Agent]] — 长运行 Agent 架构
- [[Databricks-企业级Agent生产实践]] — 企业级 Agent 落地

**技术栈：** ServiceNow Now Assist · LLM 内容审查 · HR 服务交付（HRSD）

**公司背景：** Ulta Beauty，美国最大美妆零售商，1300+门店，65,000+员工，涵盖门店/配送中心/总部三类场景。
