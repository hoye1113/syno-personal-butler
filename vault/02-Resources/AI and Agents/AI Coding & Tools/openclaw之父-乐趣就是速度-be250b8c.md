---
title: "OpenClaw之父：“乐趣就是速度”"
tags: ["ai_agent","bilibili","interview","dialogue","skills","memory","ai_safety"]
created: 2026-09-17
source: "https://www.bilibili.com/opus/1243643007898484738"
description: "OpenClaw 创始人 Peter Steinberger 回顾从 WhatsApp 中继到开源爆发、配置膨胀、安全压力和模型依赖，强调先解决自己真正厌烦的问题，并用乐趣维持产品判断。"
knowledge_state: captured
link_status: connected
collection_priority: P0
source_original_date: "2026-09-03"
source_published_at: "2026-09-03 08:50"
ingest_workflow: bilibili_opus_ingest_v2
source_type: bilibili_opus
opus_id: "1243643007898484738"
column_id: "cv52792040"
uploader: "Easonlee的AI笔记"
primary_source: column
source_tier: C2
material_tier: A
source_form: dialogue
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
voice_basis: attributed_paraphrase
factual_status: partial
factual_reviewed: 2026-09-17
verification_scope: column_only
verification_basis: ["column"]
source_kind: url
source_reliability: unverified
source_verification: unverified
source_url: "https://www.bilibili.com/opus/1243643007898484738"
source_content_sha256: be250b8c1e7a409ae5f891f1a3df2e7e164e4d0642c9341a1008d8f310c300ba
bv: "BV1r44C6ZEvM"
---

# OpenClaw之父：“乐趣就是速度”

> 这篇专栏整理 OpenClaw 创始人 Peter Steinberger 对项目八个月演进的回顾：从一个解决个人摩擦的 WhatsApp 中继，到被开源社区、媒体、安全报告和模型供应商同时拉扯的基础设施。
>
> **核心主张：** 早期产品速度来自创始人持续解决自己真正厌烦的问题；规模化之后，真正限制速度的却是配置复杂度、依赖风险、权限治理和失去自用感。

> 乐趣不是情绪装饰，而是持续判断的燃料。
> ——Peter Steinberger（专栏整理）

## 开场

专栏以五个问题回顾 OpenClaw 从早期原型、公开运行到开源项目治理的过程。下文保留创始人的经验判断和相互牵制的张力；关于下载量、用户规模、安全比例和模型供应的说法均按专栏口径呈现。

## 01 先让自己离不开产品

**核心判断：** 个人产品最可靠的需求信号，不是预先想象的用户画像，而是创始人自己是否反复使用并愿意继续修复它。

**编者问：** OpenClaw 为什么从一个 WhatsApp 中继开始？

**Peter Steinberger（专栏整理）：** 起点是他想从手机查看电脑里的智能体，并让代理像一个会主动回应的朋友，而不是一条需要持续盯着的终端命令。把复杂性藏在消息入口后，他自己先体验到“这就是未来”的感觉，再把它给朋友使用；朋友产生强烈反应，才进一步证明这不是只有作者自嗨的工具。

## 02 公开运行让产品跨过临界点

**核心判断：** 公开构建的价值不只是曝光，而是让陌生人亲手感受产品的行动能力、边界和失控可能。

**编者问：** Discord 首夜为什么成为 OpenClaw 的转折点？

**Peter Steinberger（专栏整理）：** 他把早期 Claw 放进公开 Discord，让人们围观、聊天和尝试攻击。第二天醒来时，数百条消息证明大家已经把它当作一个能行动的对象，而不是宣传页面。这个临界点带来仓库贡献、媒体关注和硬件需求，也同时把安全响应、维护责任和个人隐私推到台前。

## 03 功能一行就能加，维护成本从此开始

**核心判断：** 在已有用户的开源软件里，新增功能的短期实现成本远低于长期组合测试、兼容和治理成本。

**编者问：** 为什么项目会被约九千五百个配置选项拖慢？

**Peter Steinberger（专栏整理）：** 社区希望功能更多，维护者又想保护旧配置，于是每项功能都获得开关，组合数迅速超过可穷举测试的范围。功能、兼容层和安全修复叠加后，创始人不能再像早期那样快速改变系统；“只需要一个提示词”只描述了第一次实现，没有描述每次后续修改都要承担的责任。

## 04 规模化带来安全与依赖的双重风险

**核心判断：** 开源代理的安全边界不能靠一句免责声明维持，还必须考虑权限、沙箱、模型依赖和社区报告的处理方式。

**编者问：** OpenClaw 的安全压力和模型供应商依赖，分别暴露了什么？

**Peter Steinberger（专栏整理）：** 项目经历了安全报告、恶意技能争议和大量自动生成报告的噪声，后来补充沙箱、允许列表、原子写入和权限控制，但这些保护会牺牲速度和兼容性。与此同时，工具链长期偏向某一模型，订阅突然停用时，开放权重模型尚未足够好，产品路线也被供应条款牵动。安全治理与多模型可替换性因此都是架构问题，而不是发布后的补丁。

## 05 从责任回到乐趣：保持方向而不是堆叠编排

**核心判断：** 当创始人从解决自己的问题转为满足所有人的想象时，产品判断会被责任和功能请求稀释；恢复自用感，才能继续做出有方向的取舍。

**编者问：** 维护者怎样在长任务、自动化和社区期待之间找回速度？

**Peter Steinberger（专栏整理）：** 他不把“能运行 24 小时”视为价值本身，也警惕没有上下文延续的 Ralph 式循环和复杂 orchestrator。更有用的自动化是接收触发信号、完成明确工作、提交经过审查的结果，再让创始人体验成品。未来需要更好的可靠性工具、环境迁移、成本管理和多模态入口，但方向仍应由真实问题、个人直觉和愿意持续构建的乐趣决定。

## 限制与边界

- 本笔记只读取 B 站专栏正文和页面元数据，没有读取原始视频、音频、图片、ASR、Recastory 或 OpenClaw 仓库。
- 下载量、安全比例、配置项数量、模型供应变化和未来产品判断均为访谈/专栏口径，未独立核验；不能据此替代安全审计或项目状态报告。
- 原文为创始人访谈的专栏整理稿；本笔记把问题重构为“编者问”，所有回答使用“专栏整理”归属，不声称逐字还原。

## 知识连接

- **补充** [[OpenClaw创始人-我是如何使用OpenClaw的]]：从个人使用、CLI 工具链和“Just talk to it”补充本篇的创始人产品判断。
- **补充** [[OpenClaw创始人-Claw现状与安全治理]]：从项目爆发后的安全治理与开源责任补充本篇的规模化代价。
- **补充** [[MOC - Harness Engineering]]：把配置复杂度、可靠性工具、环境迁移和模型依赖纳入 Harness 的治理问题。

## 来源说明

- 来源：B 站专栏《OpenClaw之父：“乐趣就是速度”》；专栏地址：https://www.bilibili.com/opus/1243643007898484738。
- 专栏 ID：cv52792040；关联视频：BV1r44C6ZEvM；上传者：Easonlee的AI笔记；页面发布时间：2026-09-03 08:50。
- 收录工作流：bilibili_opus_ingest_v2；来源等级 C2；事实状态 partial；仅以 column 为核验范围。图片、ASR、Recastory、transcript 与 Spot Check 均跳过。

## 关系状态

- 补充：[[OpenClaw创始人-我是如何使用OpenClaw的]] — 连接同一创始人的个人使用经验与本篇的规模化复盘。
- 补充：[[OpenClaw创始人-Claw现状与安全治理]] — 连接安全报告、权限治理与开源项目责任。
- 补充：[[MOC - Harness Engineering]] — 将配置组合、可靠性、环境和依赖视为 Harness 治理的一部分。
