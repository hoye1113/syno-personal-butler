---
title: "Rely AI 创始人-智能体可验证持续学习 不用微调"
tags: ["ai_agent", "column", "dialogue", "s_tier"]
legacy_tags: ["ai_agent", "agent_learning", "continual_learning", "verification", "regression", "column", "dialogue", "s_tier"]
created: "2026-07-13"
source: "B站图文专栏 - Easonlee的AI笔记"
description: "Rely AI 创始人 Soheil Feizi 阐述智能体「可验证持续学习（VCL）」：避免昂贵的权重微调，把生产日志升格为含评估器的可重现环境，在系统框架层与记忆层做最小持久性修改，并以回归感知优化实现不遗忘的持续改进。S 级，reconstructed/editorial 对话，含未核验事实。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Rely AI 创始人-智能体可验证持续学习 不用微调.md"
source_sha256: "d79055d462192c42bc6b187ff1f182d2c5a0b2fb467b304d645e60709b4b8146"
migration_id: "migration-20260720-64e79771"
ingest_workflow: bilibili_opus_ingest_v2
aliases: [Soheil Feizi 持续学习, Rely AI VCL, 可验证持续学习, 不用微调的智能体学习]
source_original_date: 2026-07-08
author: "Soheil Feizi（Rely AI 创始人 / 马里兰大学计算机科学系副教授）"
uploader: "Easonlee的AI笔记"
source_type: bilibili_opus
source_url: "https://www.bilibili.com/opus/1222491144375500806"
opus_id: "1222491144375500806"
column_id: "cv51255399"
video_url: "https://www.bilibili.com/video/BV1f7Mh66Ejm/"
bv: "BV1f7Mh66Ejm"
source_tier: C1
primary_source: column
material_tier: S
source_form: lecture
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
voice_basis: attributed_paraphrase
factual_status: partial
factual_reviewed: 2026-07-13
verification_scope: column_only
verification_basis:
  - column
unresolved_facts:
  - "姓名拼写：专栏内自报 'Sohail Faizi' 与标题/行文 'Soheil Feizi' 不一致；真实姓名为 Soheil Feizi（马里兰大学副教授），属转录拼写差异，未回核原视频。"
  - "品牌：Rely AI / relyoptimize 产品名与命令行未独立核验。"
  - "数字：单次优化循环平均得分 +10%（87%→97%）来自 Rely 自建虚构客服基准，未独立核验。"
---

# Rely AI 创始人-智能体可验证持续学习 不用微调

> 来源：B 站专栏（Easonlee 的 AI 笔记转述 Soheil Feizi 的英文演讲）。`source_form: lecture`（单人演讲，无对谈嘉宾），按 S 级以 `reconstructed/editorial` 对话出版：含 `编者问` 编辑性提问，非现场原话，亦未伪造主持人。`voice_basis: attributed_paraphrase`，`verification_scope: column_only`，含未核验事实（见 `unresolved_facts` 与限制与边界）。
>
> **核心主张：智能体的持续学习可以不改权重——把生产日志升格为含评估器的可重现环境，在系统框架层与记忆层做最小持久性修改，并以回归感知优化实现「持续改而不遗忘」的可验证持续学习（VCL）。**

> 一个优秀的学习引擎不应仅专注于单一组件，而应该在智能体的正确层级上寻求最小的持久性改变。
> ——Soheil Feizi

## 核心观点

**核心判断：持续学习的两个根本挑战是获取反馈与根据反馈行动；在缺乏可重现环境前不应首选微调——把日志升格为可重现学习环境，在框架层/记忆层做最小持久性修改并内置回归测试，即可实现可验证、不遗忘的持续改进（VCL）。**

**编者问：**智能体的「持续学习」到底要解决什么问题？为什么不能直接微调模型权重？

**Soheil Feizi（Rely AI 创始人）：**人类靠与世界互动、获取反馈来从经验中学习；持续学习的目的是在智能体上模拟这一过程——从行动、反馈中不断改进且不遗忘。但它有两个根本挑战：如何**获取反馈**，以及如何**根据反馈行动**。最直觉的"改模型权重"（SFT、DPO、GRPO、RLVR、LoRA）非常昂贵，且通常需要基准与显式评估器；在缺乏可重现环境前，它并不是首选。

**编者问：**那反馈从哪里来？生产环境有现成基准吗？

**Soheil Feizi**：反馈分两阶段。开发期用**基准测试 + 评估器**（通过/失败/奖励）。生产期没有现成基准，只有**会话日志**：一是用其他模型/LLM/代码自动分析日志做自我评估（可扩展），二是由人类专家抽查少量日志给领域反馈（保证行为符合预期）。但拿到日志不等于可测试——我们真正需要的是**可重现的学习环境**。

**编者问：**「可重现的学习环境」具体指什么？为什么它关键？

**Soheil Feizi**：它不是一个单次实例加孤立反馈，而是一个可重新运行的模拟环境，定义了衡量成功的评分标准。你要从单次观察推断出一个分布：推断工具该如何运行（真实还是模拟）、如何从数据合成用户、需要哪些评估器。一旦建成，就能在其中模拟运行不同候选智能体，验证行为、让修复**可测试、可验证**。

**编者问：**有了反馈，优化应该发生在哪一层？

**Soheil Feizi**：智能体优化可在三个层面进行，越往下越贵：
- **模型层**：改权重/类型（SFT、RL 后训练、LoRA），最贵；
- **系统框架层（Harness Layer）**：重写提示词、学技能、改工具或代码，灵活且成本低；
- **记忆层**：存事实、蒸馏技能，避免重复失败，最便宜最快。

优秀的学习引擎不应只盯单一组件，而应在**正确的层级**寻求**最小的持久性改变**——这极大降低维护成本。

**编者问：**现有框架层/记忆层的优化方法有什么坑？

**Soheil Feizi**：框架层有两条路：Trace to Harness（让编码智能体分析日志改智能体）往往是"凭感觉（vibe-based）"、不可测试、易隐性回归；提示词搜索/变异（如 GEPA）虽可测试，仍依赖基准与显式评估器。记忆层（Letta、Mem0 存事实，或技能蒸馏压成可复用指南）最便宜最快，但结果**通常未经验证**——你无法确认写入的记忆真能解决问题、或是否对其他案例退化。

**编者问：**于是你提出了「可验证持续学习（VCL）」？

**Soheil Feizi**：是的，这是持续学习的新子领域：通过智能体自身经验改进它，并证明每次修复**既有帮助、又没有破坏任何已正常工作的功能**。三个核心步骤——①把失败转化为可重现、可执行的测试任务；②对比更新前后测试得分衡量变化；③做**回归测试**，确保先前的测试仍通过。

**编者问：**实用的 VCL 有哪些原则？

**Soheil Feizi**：四大原则——**可重现性**（一次性失败→可重跑的测试）、**整体性**（一次失败可能由记忆/提示词/工具/工作流/模型多重原因引起，须定位到正确层级做最小持久性修改）、**终身性**（回归感知：把回归作为优化过程本身的机制，修复新失败时不让过去环境退化，且复杂度不能随历史环境数量线性增长）、**高效性**（循环频繁运行，回归在循环内部处理而非事后补救）。

**编者问：**Rely 怎么落地这套引擎？

**Soheil Feizi**：Rely 的学习循环从日志/反馈/指令等信号开始，升格为可重现学习环境→根本原因分析并把修复路由到正确层级→回归感知优化→高效运行；输出是针对智能体的**可审查版本更新**（解释哪些变化在不引发回归的前提下改进了智能体）。实践上只需两行命令：在智能体里建学习框架，再调用 `relyoptimize`，由全局终身优化器产出可审查的拉取请求（PR）。

**编者问：**有实测效果吗？

**Soheil Feizi**：在一个虚构客服智能体基准（含确定性评估器与回归陷阱）上，首次模拟仅 78%；调用一次 `relyoptimize`，平均得分从 87% 提升到 97%（+10%），且不破坏已有功能，因而具有**性能复利**——持续改而不遗忘。

## 限制与边界

- 本笔记为专栏转述的**重构编辑对话**，非现场逐字记录；`dialogue_fidelity: reconstructed`，未回核原视频。
- 存在未核验事实（详见 `unresolved_facts`）：姓名拼写 `Sohail`/`Soheil` 不一致；Rely AI / `relyoptimize` 产品名未独立核验；+10%（87%→97%）来自 Rely 自建**虚构**客服基准，外部可复现性未验证。
- 持续学习引擎为第三方商业产品，落地依赖其服务；两行命令的"零成本"描述需以接入 Rely 为前提。
- "计算复杂度不随历史测试集线性增长"是 Rely 声称的效率原则，具体实现未公开验证。

## 知识连接

- **支持** [[2026 年 Agent 最重要的工程概念 Harness Engineering]]：嘉宾明确将"系统框架层（Harness Layer）的提示词/技能/工具/代码重写"列为比微调更灵活低成本的优化层，与 harness 把控制权/上下文交给外壳的不变量一致。
- **依赖** [[AI Agent 记忆系统 从会话缓存到持久记忆]]：记忆层写入（Letta/Mem0、技能蒸馏）被定位为成本最低的持久性修改路径，依赖持久记忆基础设施才能落地。
- **补充** [[AI反思与自我纠错机制]]：可验证持续学习的"回归感知优化"把自我纠错内建为不遗忘的持续改进，补充了该机制在生产闭环中的具体实现。
- **应用于** [[Agent 评估应该关注什么]]：将生产日志升格为含评估器的可重现环境并内置回归测试，是评估集从开发期延伸到生产期的应用。
- **限制** [[AI Agent 微调与后训练]]：嘉宾主张在缺乏可重现环境前不宜首选权重微调（SFT/DPO/GRPO/RLVR/LoRA），微调成本高且需显式评估器——见上方限制与边界。

## 来源声明

- 专栏原文：`source_url`（B 站 opus 1222491144375500806），`bv: BV1f7Mh66Ejm`，`column_id: cv51255399`，发布于 2026-07-08。
- `material_tier: S`，`source_form: lecture`，`content_form: dialogue`，`dialogue_fidelity: reconstructed`，`question_source: editorial`，`voice_basis: attributed_paraphrase`，`factual_status: partial`，`verification_scope: column_only`。未读取图片、未使用 ASR/Recastory/transcript。
