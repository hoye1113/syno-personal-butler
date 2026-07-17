---
title: "B站收录工作流五篇实测"
tags: [notes, bilibili, ai_agent]
created: 2026-07-13
source:
  - "D:/workSpace/git_clone_test/hoye-git/Recastory/workspace"
  - "vault existing canonical notes"
description: "用五类真实 Recastory 素材复盘路由、来源职责、信息保留与现有成稿，验证双轴收录模型。"
---

# B站收录工作流五篇实测

## 结论

全量发现器识别 249 个 BV 条目：226 complete、7 partial、16 insufficient；185 条有专栏，19 条有明确 Speaker 标签，203 条简介含时间戳，122 条在 manifest 中映射到 vault。44 条警告中，15 条缺 ASR、12 条 manifest 路径与实际 BV 目录不一致、8 条缺简介、8 条缺 metadata、1 条 manifest 找不到 BV 目录。

实测支持双轴模型。素材等级回答“证据够不够”，正文形态回答“信息靠什么推进”；两者不能互相代替。Speaker 数量也不能直接决定 dialogue。主题演讲默认 lecture，编辑重构的问题必须显式标记。

## 1. BV12qTu6WETP - Codex 负责人现场演示

```yaml
material_tier: S
content_form: dialogue
dialogue_fidelity: source
question_source: transcript
route_reason: "真实主持人与嘉宾问答推进判断、案例和现场演示；专栏与ASR均完整。"
source_roles:
  metadata: 身份和BV
  description: 章节时间戳
  transcript: 真实问答、数字、限定条件
  column: 中文章节骨架和术语
retention:
  claims:
    - 智能体可靠性提升正在消除技术门槛
    - 提示词技巧会让位于提出好问题和组织上下文
  mechanisms:
    - 主执行Agent加审查Agent延长安全运行时间
    - 定时任务、插件和电脑操作把一次问答变成持续工作流
  numbers:
    - Google代码中AI生成比例的现场引用
    - 每12小时执行市场研究的例子
  examples:
    - Slack新闻摘要自动打印
    - Codex现场工作流演示
  constraints:
    - 长期自主运行仍需责任边界与审查
  quotes:
    - 未来每个人都会有自己的个人助手
added_by_editor: []
uncertain_facts:
  - ASR无Speaker标签，主持人与嘉宾身份需原节目页核验
existing_note_findings:
  - 现有四章对谈比专栏九章更贴近论点结构
  - manifest仍指向legacy knowledge/A8路径，实际素材位于bilibili-retranscribe/BV目录
recommended_changes:
  - 保留为S source dialogue
  - 后续编辑时补content_form、dialogue_fidelity、question_source
```

## 2. BV14nrMBKENb - OpenAI 上下文工程和 Agent 记忆

```yaml
material_tier: A
content_form: dialogue
dialogue_fidelity: source
question_source: transcript
route_reason: "无专栏，但58分钟ASR含稳定Speaker标签；主持、主讲和Q&A共同推进内容。"
source_roles:
  description: 主题与要点，无可用章节时间戳
  transcript: Speaker映射、demo、failure mode和Q&A
  transcript_json: 时间与说话人复核
retention:
  claims:
    - 上下文工程的North Star是最小高信号上下文
    - 长期记忆不是权威事实源
  mechanisms:
    - trim、compact、summarize处理不同上下文压力
    - isolate、route、extract、retrieve拆分记忆职责
  numbers: []
  examples:
    - Build Hour现场demo
    - 跨会话summary注入system prompt
  constraints:
    - 摘要会丢信息，记忆会污染后续会话
  quotes: []
added_by_editor: []
uncertain_facts:
  - metadata人物字段不统一，需用开场自我介绍核验姓名拼写
existing_note_findings:
  - 五章结构来自话题转折而非机械时间切片
  - 现有对谈形态能保留主持引导和主讲解释
recommended_changes:
  - 作为A source dialogue样板
  - 无简介时间戳时允许ASR话题转折作为章锚
```

## 3. BV1NpAHzZEcc - AutoResearch 解读

```yaml
material_tier: A
content_form: lecture
dialogue_fidelity: none
question_source: none
route_reason: "单人连续解读；价值由实验循环、商业用例和上手步骤推进。"
source_roles:
  description: 用例与时间戳
  transcript: 原始解释、类比、商业用例和命令步骤
retention:
  claims:
    - AutoResearch把实验循环交给持续运行的Agent
    - 同类循环能迁移到营销、研究和运营优化
  mechanisms:
    - plan、改代码、短训、读metrics、保留winner
    - Research boss以目标、实验、评估、迭代组织任务
  numbers:
    - 24小时持续运行语境
  examples:
    - A/B优化
    - Research-as-a-service
    - AutoQuant与CRM lead评分
  constraints:
    - GPU和评估指标决定能否可靠自动优化
  quotes: []
added_by_editor: []
uncertain_facts:
  - ASR中的人名拼写需外部来源核验
existing_note_findings:
  - 现有讲义按机制和用例组织，比虚构问答更自然
  - 九段并非关键；关键是知识依赖和可回溯时间点
recommended_changes:
  - 作为A lecture样板
  - 长度比例只作异常预警，改用保留清单验收
```

## 4. BV1PnQfBvEs3 - Agent 完整教程

```yaml
material_tier: A
content_form: lecture
dialogue_fidelity: none
question_source: none
route_reason: "虽然有两个Speaker，主持人主要递话；核心价值是一条从Agent Loop到Skills和文件系统AIOS的知识依赖链。"
source_roles:
  description: 教程纲要和时间点
  transcript: 问答中的完整解释、现场示范和术语关系
  transcript_json: Speaker与时间核验
retention:
  claims:
    - Agent从chat的来回答转向goal到result
    - agents.md、memory.md、MCP、Skills共同构成可持续工作的Harness
  mechanisms:
    - Observe、Think、Act循环
    - 文件系统让不同Agent工具共享同一套上下文和SOP
  numbers:
    - 10到20倍生产力属于说话人判断，不能改写成已证实事实
  examples:
    - Executive Assistant搭建
    - 跨Claude Code、Codex和其他工具复用Markdown栈
  constraints:
    - MCP只解决工具协议，不自动解决工作流和记忆质量
  quotes: []
added_by_editor: []
uncertain_facts:
  - 嘉宾姓名在ASR和现有笔记中存在拼写风险
existing_note_findings:
  - 现有八个主题段保留了知识依赖，lecture选择正确
  - 旧规则若按Speaker数量会误路由为dialogue
recommended_changes:
  - 固化为“双Speaker也可能是lecture”的边界样板
  - 路由先问信息如何推进，再看Speaker数量
```

## 5. BV1o4TL6sExw - Databricks 企业级 Agent 生产实践

```yaml
material_tier: B
content_form: lecture
dialogue_fidelity: none
question_source: none
route_reason: "发现目录只有专栏和简介，当前BV目录缺ASR；主题演讲的知识由五支柱和银行案例推进。"
source_roles:
  description: 时间戳与重点
  column: 中文编辑骨架、五支柱和案例
  transcript: 当前发现结果缺失
retention:
  claims:
    - 企业投产不应先纠结模型
    - evaluation、observability、data、orchestration、governance构成生产基础
  mechanisms:
    - 确定性、语义、行为三层评估
    - 可观测性回放决策链
  numbers:
    - 数据工作占比和银行项目时间线需回到原视频核验
  examples:
    - 零售银行Agent案例
    - 重复工具调用导致的成本问题
  constraints:
    - 缺ASR时不能把专栏二次摘要当作完整事实源
  quotes: []
added_by_editor:
  - 现有成稿加入Moderator过渡问
uncertain_facts:
  - Speaker身份、原问题、数字和现场措辞缺ASR核验
existing_note_findings:
  - 现有Host-Guest阅读顺畅，但重构问题容易被未来Agent误认成现场原话
  - 当前frontmatter称ASR primary，实际发现目录没有article.md，来源声明与素材状态冲突
recommended_changes:
  - 新规则下默认B lecture；补齐ASR后可升A或S
  - 若保留现有重构对谈，渐进补dialogue_fidelity reconstructed与question_source editorial
```

## 反哺规则

1. 素材质量与正文形态拆成两个字段。
2. 路由先判断信息推进方式，不按Speaker数量套模板。
3. 主题演讲默认lecture；编辑提问必须标重构。
4. 收录前动态发现实际文件位置，不拼`ingest/article.md`。
5. 专栏负责中文骨架，ASR和原页负责事实核验。
6. 密度以主张、机制、证据、限制的保留率验收，长度只报警。
7. `transcript_source`必须真实存在；缺ASR时不能声明ASR primary。

## 相关阅读

- [[MOC - Agent Theory and Design]]
- [[Codex负责人-现场演示Codex]]
- [[OpenAI员工-上下文工程和Agent记忆]]
- [[Karpathy爆火项目-AutoResearch解读与启发]]

