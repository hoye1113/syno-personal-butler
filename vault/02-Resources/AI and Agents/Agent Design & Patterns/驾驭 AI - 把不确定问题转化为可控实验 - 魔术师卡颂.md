---
title: "驾驭 AI - 把不确定问题转化为可控实验"
tags: ["ai_agent", "ai_coding", "article", "wechat", "harness_engineering", "loop_engineering"]
legacy_tags: ["ai_agent", "ai_coding", "article", "wechat", "harness_engineering", "loop_engineering"]
created: "2026-07-02"
source: "https://mp.weixin.qq.com/s/hsA6ZqJB6HlWIZ-rMnVZyA"
description: "魔术师卡颂短文：Vibe Coding 里报点式协作让注意力线性增长；把修 bug 等不确定问题拆成客观标准 + 反馈闭环的可控实验，用 token 换精力"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/驾驭 AI - 把不确定问题转化为可控实验 - 魔术师卡颂.md"
source_sha256: "b77a267f1416acc0552aa495005a4e60be200b74f979f947fb206f16ffac2647"
migration_id: "migration-20260720-64e79771"
author:
  - "[[魔术师卡颂]]"
---

# 驾驭 AI：把不确定问题转化为可控实验

> 作者：@魔术师卡颂  
> 收录于「AI 机会」公众号 | 2026-07-02 | 四川

---

## 核心命题

Vibe Coding 里，你和 AI 像观察员配狙击手：你报点，AI 开枪。报点越多，击杀越多——**你的注意力投入近似线性**。

卡颂问：能不能在线性投入下，一次做完更多事？  
他的答案：**把不确定问题变成可控实验。**

---

## 狙击手隐喻

- **AI** = 狙击手（执行）
- **你** = 拿望远镜的观察员（判断与校准）
- **目标** = 击毙敌人（完成任务）

观察员每多报一个点，就多耗一份精力。这是 Vibe Coding 的隐性成本。

---

## 不确定 vs 可控：修 bug 为例

**常见做法（不确定）**  
「有个 xx bug，帮我修。」  
能不能修、怎么修——全是黑箱。

**可控实验（两步）**

### 1. 模糊目标 → 客观标准

先定义什么叫「击杀敌人」。  
修 bug 场景：**先写能稳定复现 bug 的测试**——

- bug 还在 → 测试失败
- bug 修好 → 测试通过

「修好」从主观感受变成可判定结果。

### 2. 执行过程 → 反馈闭环

类比：开一枪 → 看偏离 → 校准。

修 bug 闭环：

1. 跑测试 → 失败
2. 提假设 → 做修复
3. 再跑测试 → 看变化
4. 按结果决定下一步

---

## 递归拆解

场景复杂时不止两步。  
有些 bug **连复现测试都难写**——那就先把「写出复现测试」本身当成可控实验，再进入修 bug 闭环。

不确定问题可以一层层往下拆，直到某一层有客观标准和可跑通的反馈。

---

## 本质：用 token 换精力

这套思维的本质：**多烧 token（多轮测试 / 多轮 Agent 跑），少烧你的线性注意力。**

当前主流模型 token 仍贵，多数人还不会这么干；卡颂判断，国产模型迭代下去，**可控实验会变成 Vibe Coding 的最佳实践**——和 [[遇事留痕 - Loop Engineering 的基础 - 魔术师卡颂]] 里「留痕喂给下一轮」是同一脉：过程不是消耗品，是燃料。

---

## 相关阅读

- [[遇事留痕 - Loop Engineering 的基础 - 魔术师卡颂]] — 同一作者；Session Log / issue / PR 是 Loop 燃料
- [[Loop-Agent Loop到底是什么]] — 开放式 loop 烧 token；closed loop（如 code review）才合理
- [[别再搭 Harness 了，先把你的痛点解决，用最笨的方式]] — 先痛点、后系统；可控实验是「最笨」里可验证的那一步
- [[MOC - Harness Engineering]] — Harness 主题横切入口
