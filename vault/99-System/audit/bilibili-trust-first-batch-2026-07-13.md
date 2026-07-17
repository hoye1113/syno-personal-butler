---
title: "B站可信度首批修复报告"
tags: [notes, bilibili, ai_agent]
created: 2026-07-13
source:
  - "vault canonical notes"
  - "Recastory source inventory"
  - "official original pages"
description: "记录首批15篇高风险B站笔记的来源链、忠实度字段、人物修复和长视频抽样结果。"
---

# B站可信度首批修复报告

## 结果

- 修复：15 篇。
- `verified`：0。没有一篇在本轮完成逐条事实核验，不虚升等级。
- `partial`：10。ASR 可用，完成来源链与必要的身份/忠实度核验；仍保留明确未解决项。
- `unverified`：5。当前 Recastory 发现不到 ASR，只能作为检索与理解线索。
- 长视频 spot check：6 篇，均为无时间戳长文本四锚点对读；P0 = 0，ASR 噪声记为 P1。
- 评分校准后 backlog：P0 34、P1 24、P2 115、P3 9。下一批固定取报告中的 top 15，不自动处理。

原评分公式会让“长视频 + 数字密集 + 旧字段”叠加成大量 P0。本轮保持风险分不变，但首批上限固定为 15；P0 backlog 不等于已经发现事实错误，只表示需要核验或显式降级。

## 关键修复

### 直接来源矛盾

| 笔记 | 状态 | 修复 |
|---|---|---|
| [[Databricks-企业级Agent生产实践]] | unverified | 删除不存在的 ASR 声明；改为 column/description 主源；Moderator 改“编者问”；标 reconstructed/editorial |
| [[PlanetScale-Agent时代的基础设施]] | unverified | 删除不存在的 ASR 声明；Sam Shank 更正为 **Sam Lambert**；主题演讲问答标编辑重构 |
| [[DeepMind团队-当数百万Agent相遇]] | unverified | 删除不存在的 ASR 声明；保留官方播客主持身份，但逐句问答降级为未核验 |
| [[Cursor-128个Agent团队协作]] | unverified | 删除不存在的 ASR 路径；修正 column/ingest 路径；人物、128+ Agent 与引语保留待核 |
| [[WorkOS-创建和使用Skills方法论]] | unverified | 删除不存在的 ASR 声明；只保留 description 证据；工作坊问答标编辑重构 |

官方来源核验：

- Cursor Compile 官方议程列出 **Sam Lambert — PlanetScale / Agents and Infrastructure**，并列出 Michael Truell 的 Cursor CEO keynote：`https://cursor.com/compile`
- PlanetScale 官方公告确认 Sam Lambert 自 2021 年起担任 CEO：`https://planetscale.com/blog/new-ceo-of-planetscale`
- Google DeepMind 官方播客页确认 Hannah Fry 是节目主持：`https://deepmind.google/the-podcast/`

### 编辑重构边界

以下笔记保留现有问答结构，但补 `dialogue_fidelity: reconstructed`、`question_source: editorial`，并将合成 Moderator 改成“编者问”：

- [[Cursor CEO-云端智能体上线]]
- [[Geoff-Ralph Loops的基础设施]]
- [[Codex实战-100分钟完整教程]]
- [[亚马逊Kiro团队-规范驱动开发]]
- [[Snorkel-小模型RL超越大模型]]

### 真实来源对谈与路径修复

- [[Neo4J CEO-文档转化为知识]]：`transcript_source` 从 column 修正为 BV 根目录 ASR；保留 source dialogue，状态 partial。
- [[姚顺雨-预测性Agent设计]]：来源路径标准化；真实播客对谈，状态 partial。
- [[Karpathy-Code Agent与Auto Research]]：来源路径标准化；真实 No Priors 对谈，状态 partial。
- [[OpenAI评估团队-不再低估模型]]：legacy knowledge 路径迁到 BV 根目录；主持身份仍待官方页复核，状态 partial。
- [[Loop-Agent Loop到底是什么]]：legacy knowledge 路径迁到 BV 根目录；人物与 Greptile 细节仍待原节目页复核，状态 partial。

## 长视频 spot check

| BV | 笔记 | 结果 |
|---|---|---|
| BV1H59yBFECR | [[Geoff-Ralph Loops的基础设施]] | Loom、Thread/Weaver、192核、NixOS/SOPS、WireGuard语义命中；数字与专名有ASR噪声 |
| BV1j15A6gEcL | [[Codex实战-100分钟完整教程]] | 项目文件夹、Steer、Chorus、设计工具分工命中；“100分钟”是标题口径，素材时长67:09 |
| BV1Dd9CBGEmK | [[Neo4J CEO-文档转化为知识]] | Emil/Neo4j、向量可解释性、Cypher、NER/ER命中；品类终结是嘉宾判断 |
| BV1VczqBREQ8 | [[亚马逊Kiro团队-规范驱动开发]] | Al Harris、EARS、属性测试、准确性取舍命中；专名噪声较重 |
| BV1tZw4zLEX8 | [[姚顺雨-预测性Agent设计]] | Latent Space、ReAct、benchmark、Agent接口命中；人物和论文名ASR较差 |
| BV1dwAczDEXY | [[Karpathy-Code Agent与Auto Research]] | No Priors、80/20、token throughput、AutoResearch、约8个月开源滞后命中；月份是估计 |

详细工作表位于同目录 `spot-check-<BV>-2026-07-13.md`。

## 未处理队列

- P0 34：主要是未标注的编辑重构、heuristic speaker 与来源声明冲突。
- P1 24：主要是长视频、人物或数字核验缺口。
- P2 115：主要是 legacy 路径、双轴字段和证据链维护问题。
- P3 9：当前无显著残余风险或已明确降级。

本轮不自动进入第二批。下一批以 `bilibili-trust-audit-2026-07-13.md` 的首批15条为冻结名单。

## 相关阅读

- [[MOC - Agent Theory and Design]]
- [[B站收录工作流五篇实测]]
