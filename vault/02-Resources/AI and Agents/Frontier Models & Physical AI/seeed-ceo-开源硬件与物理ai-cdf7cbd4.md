---
title: "Seeed CEO：物理AI的未来 不是人形机器人 - 哔哩哔哩"
tags: ["ai_agent","ai_safety","bilibili","article","harness_engineering"]
created: 2026-09-17
source: "https://www.bilibili.com/opus/1213299991655743491"
description: "摘要 导读：Seeed Studio 创始人 Eric Pan 与机器人负责人 Elaine Wu 讨论开源硬件、低成本机器人、示范学习和本地 Agent。文章的核心不是追逐通用人形机器人，而是让不同社区用模块化硬件和本地模型构建适合具体场景的物理智能体。"
knowledge_state: captured
link_status: connected
collection_priority: P1
source_original_date: "2026-06-13"
source_published_at: "2026-06-13 14:23"
ingest_workflow: bilibili_opus_ingest_v2
source_type: bilibili_opus
opus_id: "1213299991655743491"
column_id: "cv50500168"
bv: "BV1bq7R67EqG"
primary_source: column
source_tier: C2
material_tier: A
source_form: dialogue
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
voice_basis: editorial_summary
factual_status: partial
factual_reviewed: 2026-09-17
verification_scope: column_only
verification_basis: ["column"]
source_kind: url
source_reliability: unverified
source_verification: unverified
source_url: "https://www.bilibili.com/opus/1213299991655743491"
---

# Seeed CEO：物理AI的未来 不是人形机器人 - 哔哩哔哩

# Seeed CEO：开源硬件与物理 AI 的未来

> 形态：第三方专栏整理，内容来自 Seeed Studio 创始人 Eric Pan、机器人负责人 Elaine Wu 与主持人的对谈。本文关注低成本硬件、示范学习、本地 Agent 和安全权限；价格、产品规模与未来时间表均按专栏口径记录。
>
> **核心主张：** 物理 AI 的普及不必等待一个通用人形机器人；开源硬件、模块化身体、示范数据和本地 Agent 可以让不同社区针对具体任务构建可用系统，但身体动作、权限和紧急停止必须成为 Agent 的一等约束。

> 现在，我真的可以让物体“对话”，为我的创造物注入灵魂。
> ——Eric Pan（专栏整理）

## 开场

Seeed 的路线把“物理 AI”从单一机器人形态拆开：开发者可以组合头部、躯干、手臂、轮子、摄像头和计算模块，再用自己的数据训练或配置 Agent。文章最值得保留的是“场景优先”的思路——不同地区、行业和使用者会需要不同身体，而不是所有任务都由一台昂贵的通用人形机器人完成。

## 01 开源硬件让物理智能体获得更多真实反馈

核心判断：降低硬件、工具链和资料的进入门槛，能让更多开发者把机器人放进具体环境，从而产生比实验室演示更丰富的任务数据。

**编者问：** 为什么开源硬件对物理 AI 特别重要？

**专栏整理：** 开源减少了设备结构和控制接口的不透明，让开发者可以拆解、改装并把机器人放到自己的工作环境。不同社区会提出不同的动作、尺寸、成本和可靠性要求，这种多样性反过来帮助系统发现“一个模型并不适合所有身体和任务”。

开源并不消除责任。硬件的电机、供电、机械强度、固件和网络访问都可能产生风险；可复用的开放接口需要同时定义权限、日志和安全停止方式。

## 02 低成本和模块化改变机器人的经济性

核心判断：当机器人部件价格和改装难度下降，小企业、学校和个人才有机会承担试错成本，物理 Agent 才可能从少数大型实验室扩散到真实场景。

**专栏整理：** 文章以约 200 美元的 SO-ARM、约 1000 美元级别的 Raybot 等产品举例，说明低成本手臂、轮式底盘、摄像头和 Jetson 类计算模块可以被组合成不同设备。具体售价、配置和供货状态随时间变化，本笔记只保留“低成本改变试错半径”的判断。

模块化的另一个收益是替换局部组件：不同任务可以选择更强的夹爪、更大的电池或更稳定的底盘，不必每次重造完整身体。代价是接口兼容、标定、动力学和软件适配会成为新的工程工作。

## 03 示范学习把人变成高质量的动作教师

核心判断：对于复杂空间动作，手把手示范可以比为每个物体编写规则更快获得任务数据，但示范质量和覆盖范围决定模型是否能泛化。

**专栏整理：** 文章把训练机器人比作训练一只狗：人直接带着机械臂完成动作，系统记录轨迹、视觉和环境状态，再用扩散模型等方法生成下一次动作。训练流程把人的技能转化为可重复的数据，而不是要求工程师穷举所有空间规划规则。

示范学习仍有明显边界：如果物体、光照、摩擦、重量或障碍物变化，模型可能遇到分布外情况。真实部署需要失败检测、重新示范、低速试运行和人工接管，不能把一次成功演示当成通用能力。

## 04 本地 Agent 让机器人从动作执行器变成任务执行者

核心判断：把自然语言规划、工具调用、自检和库更新放到本地计算设备，能让机器人理解更高层任务，但同时扩大了权限和误操作的风险面。

**专栏整理：** 文章描述在 Jetson 上运行 OpenClaw 一类本地 Agent：用户用自然语言说明目标，Agent 再把任务拆成动作、调用机器人控制接口、检查失败并尝试更新动作库。这样机器人不只是执行固定脚本，而是可以围绕角色和 SOP 组织多步工作。

“自我调试”在物理世界不能等同于改代码后重新运行。Agent 需要知道哪些动作可以自动重试，哪些动作必须请求许可，如何限制速度、力量和活动范围，以及发生异常时如何切断动力。自然语言是入口，不应成为绕过控制权限的通道。

## 05 反向人形和仿真到现实扩展了身体选择

核心判断：先根据任务选择身体，再用统一软件和模块接口连接它们，可能比先制造一台完整人形机器人更接近早期物理 AI 的扩散路径。

**专栏整理：** “反向人形”的想法是把头部、躯干、手臂和轮子当作可组合模块：某些任务需要轮式移动，某些任务需要双臂操作，某些任务只需要视觉和语音接口。专栏还提到 Isaac Sim、数字孪生和仿真到现实，用来在真实硬件上测试前先收集动作和环境反馈。

仿真减少了成本和危险，但真实摩擦、延迟、遮挡、材料形变和人类行为仍会造成差异。仿真结果应当进入受控实机测试，而不是直接获得生产权限。

## 06 物理 Agent 的安全边界必须前置

核心判断：机器人越像一个能理解任务的 Agent，越需要把控制权限、动作范围、人工接管和紧急断电设计成系统默认能力。

**专栏整理：** 文章提到基础机器人安全指南、控制权限和紧急电源开关。这些措施看似基础，却决定了 Agent 在误解目标、模型失控、网络中断或机械故障时能否被及时制止。早期产品还应明确实验性质、适用环境和不支持的动作。

对知识库而言，OpenClaw 的本地运行与物理身体结合，提供了一个具体的 Agent 安全案例：权限不是只保护文件和 API，也要限制扭矩、速度、空间范围、工具状态和人与机器人之间的距离。

## 限制与边界

- 本篇为第三方专栏对谈整理，`source_tier: C2`、`material_tier: A`；本轮只核对 B 站专栏正文、页面元数据和 BV 映射，未独立核验 Seeed 的产品规格、价格、销量、固件能力或安全认证。
- 约 200 美元 SO-ARM、约 1000 美元 Raybot、未来一到三年等数字和时间表均是专栏口径，不能作为当前采购或交付承诺。
- OpenClaw 本地 Agent、自我调试、动作库更新和仿真到现实属于工程演示/方向性描述；真实部署需要逐项验证硬件、软件和权限边界。
- 本篇讨论的是物理 Agent 的应用路径，不证明“非人形”一定优于人形，也不替具体机器人产品做安全或性能认证。

## 知识连接

- **应用于** [[为什么-harness-比模型更重要-3a8f81a0]]：Harness 的核心是给模型提供可靠边界，本篇把这一原则扩展到动作、动力和紧急停止。
- **补充** [[openclaw之父-乐趣就是速度-be250b8c|OpenClaw之父-乐趣就是速度]]：该笔记强调 OpenClaw 的快速迭代，本篇补充快速迭代进入物理世界后必须增加的硬件安全门。
- **补充** [[neuralink联创-bci与ai接口-0ed4fe4f|Neuralink联创-bci与ai接口]]：Neuralink 讨论人体接口与神经带宽，本篇讨论机器人身体与本地 Agent 的接口。
- **支持** [[MOC - Agent 架构与工程]]：低成本硬件、工具调用、长时任务和安全权限构成 Agent 进入物理世界的工程分支。

## 来源说明

- 来源：B 站 opus 专栏《Seeed CEO：物理AI的未来 不是人形机器人》，`source_url` 为 `https://www.bilibili.com/opus/1213299991655743491`。
- 来源标识：`opus_id: 1213299991655743491`，`column_id: cv50500168`，`bv: BV1bq7R67EqG`，发布于 2026-06-13 14:23。
- 收录形态：`ingest_workflow: bilibili_opus_ingest_v2`，`source_form: dialogue`，`content_form: dialogue`，`dialogue_fidelity: reconstructed`，`question_source: editorial`。
- 声音依据：`voice_basis: editorial_summary`；正文使用“编者问 / 专栏整理”，保留产品自述和未来判断的来源归属。
- 核验范围：`verification_scope: column_only`、`verification_basis: ["column"]`，`factual_status: partial`。图片、ASR、transcript、Recastory 与 Spot Check 均未作为本轮来源。

## 关系状态

当前标记为 connected；关联均使用现有或本批新建笔记，未修改 MOC、tag 或其他既有 canonical。
