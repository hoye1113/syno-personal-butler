---
note_id: note-artifact-20261022-edf7da05
title: "不要迷信 AI 大厂的 Coding 实践"
tags: ["article","wechat"]
created: 2026-10-22
source: "unknown"
description: "来源：微信公众号文章 https://mp.weixin.qq.com/s/D6HWL_dhpYE5VmrHFt9rEw （发布于 10月20日，IP 属地四川；经浏览器人工验证后读取正文，三次读取内容一致） 完整性说明：正文至结尾结论句完整；文末营销区（扫码加微信、点赞在看等固定板块）未抓取到，无知识价值缺失。 不要迷信 AI 大厂的 Coding 实践 "
knowledge_state: captured
link_status: orphan
factual_status: unverified
source_kind: unknown
source_reliability: unverified
source_verification: needs_source
source_content_sha256: 97be25b96d3e860adb9f6f8fa8bc0b26442ccc04367a4ffa636e80ea4f151986
---

# 不要迷信 AI 大厂的 Coding 实践

## 导读

公众号短文，核心论点是：不要把 AI Coding 提效简单外推为"继续提高 AI 使用率即可裁人/继续降本"。文章用 Grok/Lauren 2500 PR 案例引出成本、偏差累积、测试与 Code Review 工程化开销，结论为"每一量级效率提升对应指数量级成本提升"。适合作为 AI Coding 效率叙事与 Harness/Reliability 成本约束的反面参照，具体数据未核验。

## 核验记录（2026-10-22 · web_search 外部核验）

- **Lauren 其人其事** ✅ 基本属实：Lauren Tan（@poteto）确为 SpaceXAI（xAI）工程师，负责 GrokBot 与 Cursor，React 编译器核心团队成员，前 Netflix 工程经理。她在分享中自述运行 10-20 个 GrokBot agent 自动化约 90% 的例行工作（[X 上 tetsuo 的记录](https://x.com/tetsuoai/status/2092515475045707851)）。
- **「一个月 2500 个 PR」** ⚠️ 数字存疑：[AI Socratic 的转述](https://aisocratic.org/news/lauren-tan-20-grokbot-agents-1000-prs-a-month-600-refactors-to-get-there)为「每月约 1000 个 PR」，且提到她在跑 agent 前推了 600+ 重构 PR 打底。文章数字（2500）与公开转述（约 1000）不一致，可能夸大或口径不同（如含 agent 自动 PR）。引用时应注明两种口径。
- **「2500 个 PR 基本都是优化和修复」** ✅ 方向属实：公开资料支持其 PR 以重构/修 bug 为主、agent 用于自动化修复 GrokBot 自身缺陷。
- **「1.5T token / 超 30w 刀」** ❓ 未能独立核验：参考 [2026 年 10 月 Grok 4.7 API 定价](https://usagebox.com/articles/grok-api-pricing-2026)（$2 / $0.5 缓存 / $6 每百万 token），若 1.5T token 属实，按输出占比不同费用会在数十万到数百万美元区间，文章的「30w 刀」口径不明。两个数字均按「文章自称」处理。

## 来源正文

来源：微信公众号文章 https://mp.weixin.qq.com/s/D6HWL_dhpYE5VmrHFt9rEw （发布于 10月20日，IP 属地四川；经浏览器人工验证后读取正文，三次读取内容一致）

完整性说明：正文至结尾结论句完整；文末营销区（扫码加微信、点赞在看等固定板块）未抓取到，无知识价值缺失。

不要迷信 AI 大厂的 Coding 实践

这篇其实是写给你老板看的。

如果你公司几个程序员（甚至不是程序员）通过 AI Coding 快速开发、快速上线了"质感不错的应用"，让你产生一个感觉：是不是继续提高 AI 使用率，就能提效的同时把其他程序员裁了？

恕我直言，之所以使用 AI 后效率大幅提升，是因为「你之前的效率太低了」。

如果想再拔高 AI 效率，成本就会指数级上涨。我先举个实际例子，再告诉你其中原因～

最近 Grok 员工 Lauren 一个人，一个月给 GrokBot 合入 2500 个 PR，很高效是吧？背后有 2 点没人告诉你：

1. 消耗了 1.5T token，即使按一折算，API 费用也超过 30w 刀
2. 2500 PR 不等于 2500 个新功能。这些 PR 基本都是"优化性能、修复 bug"

30w 刀一个月，能雇多少程序员了？为什么提效背后是成本的指数级提升？

问题根源在于 —— 人的精力是有限的，当你大量使用 AI 开发新需求，AI 与人不可能完全对齐需求细节，最终的实现就会产生偏差。

实现越多需求，积累越多偏差，偏差是 bug 的源头。

控制偏差的途径主要有 2 个：

1. 用测试用例固定行为：当新需求引入的偏差导致旧功能被破坏，旧功能的测试用例会失败，进而发现偏差
2. Code Review：Review 能直接发现"没对齐的需求"，对齐后能减少偏差的产生

问题是，测试用例的膨胀会显著拖慢 CI 速度，为了解决这个问题，你开始考虑：
- 按"受影响范围"精准测试
- 缓存测试结果
- 按优先级测试

一段时间后，你发现还缺一套"优化用例（单个执行时间长、并行跑测试机器不够用......）"的机制，于是你开始做测试的基建。

再说回 Code Review，AI 是怎么 Review 的？并行跑几个 agent review，另一组 agent 对 review 意见进行投票，只有得票高的意见才值得修复。

并行跑这么多 agent，得消耗多少 token、多少机器资源？

一句话总结：

AI 提效 -> 需求增加 -> 累积偏差 -> 为了控制偏差，提升工程化难度与 token 消耗

每一个量级的效率提升，都对应一个指数量级的成本提升。

为什么 Lauren 2500 个 PR 聚焦在优化和修复，而不是新需求？如果一个月迭代 2500 个新需求，为了控制偏差，背后的成本得 百万 ～ 千万刀 了

## 相关笔记与 MOC

收录查重给出的 5 个候选，经主人确认（2026-10-22）均为**相关而非重复**，本笔记按新建独立保留处理；结构化关系登记待关系注册修复后补录（见待办 action-20261022-af48e32f）。

本笔记是「AI Coding 成本与组织」三部曲的第 ② 篇（成本约束层）：

- 三部曲① [[agent-写得更快以后-时间花在了哪里-14e8cbd4|Agent 写得更快以后，时间花在了哪里？]] — 工程方法层：等待时间的分阶段拆解与优化
- 三部曲③ [[老板应该招哪类程序员-5fa0932a|老板应该招哪类程序员？]] — 组织破局层：不可能三角 + DORA 指标 + AI 架构师
- 主 MOC：[[MOC - Harness Engineering]] — 专题「AI Coding 成本与组织」挂载于此
- 辅 MOC：[[MOC - AI Coding 与工具]] — AI Coding 效率叙事的反面参照
- 主题相邻：[[AI Coding 时间管理 - 50% 工作法 - 魔术师卡颂]] — 同样讨论 AI Coding 的精力/时间分配与成本视角
