---
title: "如何让 Skill 自动优化"
tags: ["ai_agent", "article", "wechat", "skills", "loop_engineering", "harness_engineering"]
legacy_tags: ["ai_agent", "article", "wechat", "skills", "loop_engineering", "harness_engineering"]
created: "2026-07-02"
source: "obsidian_repository_snapshot"
description: "魔术师卡颂解读 Zach Lloyd 的 Skill 自优化循环：定时任务收集 PR Review 反馈→归因规则→只改规则集；须满足规则可聚焦、正负反馈明确、可归因"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/如何让 Skill 自动优化 - 魔术师卡颂.md"
source_sha256: "307ec017cbe765e23a034bdacee027cfda79ded46b886a6db76eef54646adccd"
migration_id: "migration-20260720-64e79771"
author:
  - "[[魔术师卡颂]]"
date: 2026-06-18
---

# 如何让 Skill 自动优化？

> 作者：@魔术师卡颂 | 解读 @zachlloydtweets | 2026-06-18  
> 源码：[warpdotdev/common-skills](https://github.com/warpdotdev/common-skills)

---

## 核心命题

@zachlloydtweets 提出 **「让 Skill 自动优化的循环」**——不是所有 Skill 都能自进化，但符合条件的可以借鉴。

卡颂用 **自动 PR Review Skill** 讲清设计与边界。

---

## 场景：自动 PR Review Skill

有人提 PR → Skill 读 diff + 描述 → 检查问题 → 生成报告。

**如何让它越用越好？** 作者设计 **每周定时任务**：

1. 拉取本周 PR Review 数据 → 整理成 JSON  
2. 从 JSON 找**可复用模式**，例如：  
   - 人类是否多次指出 bot 判错？  
   - bot 对问题轻重是否常误判？  
   - bot 建议是否经常无法落地？  
3. 从模式**总结规则**  

   例：开发者总说「别建议删 session link，排查失败要靠它」→ 沉淀规则：  
   `Do not suggest removing session links, workflow URLs, or other debugging context from error paths.`

4. **不修改整个 Skill**，只改 Skill 里「诊断 PR 的规则」片段  
5. **提 PR**，等开发者审核规则变更  

→ 和 [[遇事留痕 - Loop Engineering 的基础 - 魔术师卡颂]] 一脉：PR 评论、推翻意见都是**可分析的留痕**；这里把留痕喂回 Skill 规则集。

---

## 自动优化三条件

| # | 条件 | 说明 |
|---|------|------|
| 1 | **优化规则，不是流程** | 改「诊断 PR 的规则」可评估；改「完整诊断流程」太发散，易越改越坏 |
| 2 | **明确的正/负反馈** | 正：bot 意见被采纳；负：评论里直接反驳 bot |
| 3 | **反馈可归因到规则** | 只处理：bot 错了 / 开发者反复推翻 / 开发者明确教 bot 怎么做 |

**总结流程**：

```text
定时任务收集反馈 → 反馈归因到规则 → 优化 Skill 的规则集
```

并不是所有 Skill 都能自动进化。

---

## 与 vault 其他笔记的对照

| 视角 | 笔记 | 关系 |
|------|------|------|
| Loop 燃料 | [[遇事留痕 - Loop Engineering 的基础 - 魔术师卡颂]] | PR/issue 留痕 → 本条的反馈源 |
| Loop 框架 | [[Loop Engineering 橙皮书 - 花叔]] | 五动作循环；本条是 Skill 维度的窄循环 |
| Skill 规模化 | [[WorkOS-创建和使用Skills方法论]] | Skill 作工作单元；本条讲**规则子集**如何迭代 |
| Agent 自改进 | [[Codex 自我改进 Prompt]] | OpenAI traces → Skill；本条是 PR 反馈 → 规则 |
| 代码审查自动化 | [[Alchemy CPO-从代码审查到自动代理]] | 审查场景落地；本条补**自优化闭环** |

---

## 相关阅读

- [[遇事留痕 - Loop Engineering 的基础 - 魔术师卡颂]] — 留痕是 Loop / Skill 优化的燃料
- [[Loop Engineering 橙皮书 - 花叔]] — Loop = Harness 上一层
- [[WorkOS-创建和使用Skills方法论]] — Skills at scale
- [[Codex 自我改进 Prompt]] — traces 固化成 Skill/Automation
- [[MOC - Harness Engineering]] — 横切入口
