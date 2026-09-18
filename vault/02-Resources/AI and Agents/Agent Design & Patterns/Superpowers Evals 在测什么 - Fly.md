---
title: "Superpowers Evals 在测什么"
tags: ["ai_agent", "ai_evaluation", "article", "wechat", "harness_engineering", "skills"]
legacy_tags: ["ai_agent", "ai_evaluation", "article", "wechat", "harness_engineering", "skills"]
created: "2026-07-07"
source: "obsidian_repository_snapshot"
description: "Fly 解读 Superpowers Evals：workflow 行为合规评测（Gauntlet + post-checks 双层判定）；三场景举例；Superpowers 6 eval 驱动优化与 reviewer 上下文风险"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/Superpowers Evals 在测什么 - Fly.md"
source_sha256: "131fbf2676acef3a3c38070e3547a83a5e9fa9fbba93eb23ffa4a26a104bbb32"
migration_id: "migration-20260720-64e79771"
author:
  - Fly
date: 2026-07-07
---

# Superpowers Evals 在测什么

> 作者：@Fly的AI研习社 | 2026-07-07  
> 一手来源：Jesse Vincent [Superpowers 6](https://blog.fsck.com/2026/06/15/Superpowers-6/) · [superpowers-evals](https://github.com/prime-radiant-inc/superpowers-evals) · [obra/superpowers](https://github.com/obra/superpowers)

---

## 核心命题

Superpowers 6 发布时，数字很亮眼：构建最多快 **50%**，token 最多省 **60%**。  
但更值得关注的是背后的方法论转向——**开始认真评测 AI 编程工作流本身**。

测的不是模型会不会解算法题，也不是 prompt 写得好不好，而是：

> coding agent 被放进一套完整软件工程流程后，能不能稳定、守规矩、可验证地交付？

这个项目叫 **Superpowers Evals**。如果说 [obra/superpowers](https://github.com/obra/superpowers) 是给 agent 用的软件开发方法论，Evals 就是背后的质检实验室。

---

## Superpowers 在约束什么

[[AI框架与 Harness 的关系 - 魔术师卡颂]] 把 superpowers 放在 Harness **顶层流程编排**：头脑风暴 → spec → plan → TDD → subagent 实现 → review。

Jesse Vincent 在官方 README 里把基本工作流写得更细：

| 阶段 | Skill | 干什么 |
|------|-------|--------|
| 设计 | `brainstorming` | 先问清你要什么，分块展示 spec 等你签字 |
| 隔离 | `using-git-worktrees` | 新分支 + 独立 worktree，确认测试基线干净 |
| 计划 | `writing-plans` | 拆成 2–5 分钟小任务，带文件路径、验证步骤 |
| 执行 | `subagent-driven-development` | 每任务派 fresh subagent，两阶段 review |
| 实现 | `test-driven-development` | 强制 RED-GREEN-REFACTOR，先写失败测试 |
| 审查 | `requesting-code-review` | 对照 plan 查 spec 符合性 + 代码质量 |
| 收尾 | `finishing-a-development-branch` | 验测试、选 merge/PR/保留/丢弃 |

哲学四条：**TDD 先行**、**系统化而非拍脑袋**、**减复杂度**、**证据先于宣称**。

卡颂说的痛点在这里也成立：AI 写代码很快，**做偏也很快**。没有流程约束，速度只会放大不确定性。

---

## Evals 测什么：现场质检，不是考试

普通代码 benchmark 像考试——给一道题，看能不能做出来。

Superpowers Evals 更像**现场质检**，关心 agent **行为**是否符合工程流程：

- 该触发 skill 时有没有触发？
- 需要写 plan 时有没有写？
- 该用独立 worktree 时有没有隔离？
- 有没有按 TDD 先写测试？
- 实现后有没有真的跑验证？
- reviewer 有没有抓到关键问题？
- 流程改动后，token、耗时、质量有没有一起变？

模型可能很强，但不按流程走，复杂项目照样埋雷。反过来，流程设计得好，产出更稳定、更好查、更好迭代。

官方 README 的定位更硬：**不是通用 benchmark，是 workflow compliance 的 eval lab**——skill 触发、worktree 行为、subagent 协作、验证反射、review 质量、成本塑形模式。

仓库里约有 **60 个场景**（`scenarios/`），按行为类型分组。举三个 sentinel 级代表：

| 场景 | 测什么 | 典型验收 |
|------|--------|----------|
| `triggering-writing-plans` | 多步功能需求来时，**先触发** `writing-plans` skill | transcript 里 skill 调用出现在任何 `Edit`/`Write` 之前 |
| `triggering-test-driven-development` | 用户只说「实现邮箱校验」，**不提 TDD** | 写实现代码前先加载 `test-driven-development` skill |
| `worktree-creation-from-main` | 在 `main` 上开工时，**主动建隔离 worktree** | `git worktree list` 从 1 变 2；此轮不写实现代码 |

此外还有 `sdd-*`（subagent-driven-development 全流程）、`cost-*`（token/审查成本塑形）、`user-pref-*`（用户偏好是否被遵守）等族。场景不是考「能不能写出功能」，而是考**流程纪律有没有被触发**。

---

## 架构：三个角色

### 1. 被测对象（Coding-Agent）

真实 CLI，不是 mock。支持 Claude、Codex、Antigravity、Gemini、Kimi、OpenCode、Pi、Copilot 等。

每个 agent 在 **throwaway per-run home** 里跑——`HOME`、XDG 目录、`TMPDIR` 都 pin 到 `<run>/home`，避免读到宿主 `~/.claude` 等真实配置。配置和 OAuth 在 launch 前 seed 进去，无需运行时登录。

### 2. 测试官（Gauntlet-Agent）

自动化 QA：给 coding agent 一个场景任务，观察它怎么做，按验收条件判 pass / fail / indeterminate。

默认用 `ANTHROPIC_API_KEY`；也可用 `CLAUDE_CODE_OAUTH_TOKEN`（订阅有交互用量上限，高并发 batch 更适合 API key）。

### 3. 编排器（Quorum）

准备隔离环境、启动 agent、收集日志、记录文件变化、统计 token、跑确定性 post-check。

一次 eval 的完整链路：

```
1. 给 agent 一个场景任务
2. 观察是否按 Superpowers 流程行动
3. 收集创建的文件、工具调用、执行的命令
4. 检查最终状态是否符合预期
5. 输出 pass / fail / indeterminate
```

失败常常藏在中间步骤：没写测试但功能能跑、没 review 但代码提交了、没隔离 worktree 但任务完成了——Evals 要把这些「看起来没事」的缺口揪出来。

### 双层判定：Gauntlet 主观 + deterministic post-checks

一次 eval 的 pass/fail 不是 Gauntlet-Agent 一个人说了算，而是两层叠加：

| 层 | 谁做 | 看什么 |
|----|------|--------|
| **Gauntlet-Agent** | LLM 驱动的 QA driver | 场景 story 里的 Acceptance Criteria——agent 行为是否符合工程流程预期 |
| **deterministic post-checks** | `checks.sh` 脚本（`pre`/`post`） | transcript、git 状态、文件系统——可复现、无模型方差 |

以 `triggering-writing-plans` 为例，post-check 硬查三件事：

```
check-transcript skill-called superpowers:writing-plans
check-transcript skill-before-tool superpowers:writing-plans Edit
check-transcript skill-before-tool superpowers:writing-plans Write
```

`worktree-creation-from-main` 则硬查 `git-count worktrees eq 2` + `worktree-created`，并确认此轮没调 `Write`。

这层分工很关键：**Gauntlet 看语义合规，post-checks 看可观测事实**。优化流程时，两层一起盯，才能分清「token 降了」和「关键步骤被跳过」。

---

## 安全边界：静态检查 vs Live Eval

| 模式 | 做什么 | 谁能跑 |
|------|--------|--------|
| **静态/unit** | biome、tsc、bun test | 公开 CI，不调模型 API |
| **Live eval** | 真启动 agent CLI，收集 transcript、tool call、文件系统状态 | 仅可信本地环境 |

Live eval 风险不低：Claude 用 `--dangerously-skip-permissions`，Codex 用 `--dangerously-bypass-approvals-and-sandbox`，Kimi 用 `--yolo`……隔离 home 能收窄爆炸半径，**不是沙箱**。

---

## Superpowers 6：Evals 如何支撑优化

Jesse Vincent 在 Superpowers 6 博文里交代了 eval 驱动的迭代故事。

### 用户痛点

最常见抱怨：token 贵、Superpowers 慢。慢和贵 partly 来自它做对的事——大量 upfront planning、严格 red-green TDD、每个改动双轴 review（spec 符合性 + 代码质量）。

### 用 Fable + autoresearch 做实验

借助 Fable 分析数千次 Subagent Driven Development session，发现 reviewer 常跑大量 git 命令理解 diff。改成**预生成 review packet**（格式化 diff + 元数据），token 和墙钟时间各降约 **10%**。

overnight autoresearch loop 跑了 **25+ 实验**，预注册假设、记录预测，花费约 $165。关键发现：

| 实验结论 | 数据 |
|----------|------|
| **合并 spec + code reviewer** | 在 eval suite 上再省约 15% |
| **terse reviewer contract** | reviewer 输出 −41%，verdict 不变 |
| **narration recipe** | −54%，零方差 |
| **conditional haiku implementer** | 每 run 省 ~$0.5–1；prose plan 上正确拒绝 haiku |
| **cap controller thinking** | **反效果**——turn 92→138，输出翻倍 |
| **plan word budget** | 测试内容 −62%，即使代码豁免 |
| **reviewer 只看 diff package** | 0/5 标出缺失 brief——**自信地错判 spec** |

最后一条是 eval 挖出来的**反面教材**，和「合并 reviewer、预生成 review packet」同一脉络：把 reviewer 上下文压到只剩 diff，token 确实省了，但 reviewer 会**静默把 spec 重定义成全局约束**——看起来 verdict 很自信，该抓的 brief 缺口一个没标。优化流程时，这类风险只能靠 eval 回归才能发现，不能凭感觉砍上下文。

跨约 36 小时、$650 未补贴 token，Anthropic eval benchmark 显示 **50% 墙钟提速 + 60% token 降幅**。  
在 Codex 上初跑**零改进**——后来查明 eval 未充分隔离宿主 OS，一直在测 Superpowers 5.1.0。修隔离后，改进全部成立。

> **没有 evals，这些优化很危险**——你不知道 token 降了是因为更高效，还是因为少做了关键检查。

Superpowers 6 已发布（v6.1.1），支持 Claude Code、Codex、Cursor、Kimi Code、OpenCode、Pi、Copilot 等 harness 的 marketplace 安装。

---

## 从 prompt engineering 到 agent process engineering

早期大家聊 prompt engineering：怎么写提示词让模型答得更好。

AI 进入真实软件工程后，问题变成：

- **角色设计**：谁规划、谁实现、谁 review、谁验证
- **上下文边界**：每个 agent 该看到什么、不该看到什么
- **交接物**：plan 怎么写、diff 怎么给、review 怎么记
- **评测体系**：什么算成功、失败、不确定

这已经不只是 prompt engineering，而是 **workflow engineering**——更准确说，**agent process engineering**。

与 [[AI Agent 和 Skill 测评方案及落地实践 - martinskxu]] 的四维测评（触发准确性、步骤合规性、产物质量、异常容错）高度同构；与 [[Codex 自我改进 Prompt]] 里 OpenAI Cookbook 的 traces → feedback → evals → harness changes 闭环也是同一条路。

---

## 对开发者的四条启发

1. **别只问哪个模型最强**——更重要的问题是：我有没有一套让模型稳定工作的流程？
2. **别把 AI 当万能实习生**——更好是当成可分工、可约束、可审查的工程团队成员。
3. **工作流也要有回归测试**——改了 prompt、角色、review 流程，要能回答「质量有没有下降」。
4. **成本优化不能只看 token**——好的优化是减无效上下文、减重复劳动、减无用输出，**同时保留关键判断和验证**。省 token 容易，省完质量还在才难。

---

## 若要自己跑 eval

静态门禁（不调模型 API，可进公开 CI）：

```bash
bun install && bun run check && bun run quorum check
```

本地 live eval（需 API key + 可信环境）：

```bash
export SUPERPOWERS_ROOT=/path/to/superpowers
export ANTHROPIC_API_KEY=...
bun run quorum run scenarios/triggering-writing-plans --coding-agent claude
bun run quorum show <run-dir>
```

多 agent 回归用 **sentinel tier** batch：`quorum run-all --tier sentinel --coding-agents claude,codex,kimi --jobs 4`。Docker 容器跑法、eval appliance 远程批跑见 [superpowers-evals README](https://github.com/prime-radiant-inc/superpowers-evals)。

---

## 相关阅读

- [[AI框架与 Harness 的关系 - 魔术师卡颂]] — superpowers 在 Harness 三层模型里占顶层编排
- [[如何为项目定制 Harness 环境 - 魔术师卡颂]] — 从 superpowers 起步后「减顶、增底」的定制心法
- [[AI Agent 和 Skill 测评方案及落地实践 - martinskxu]] — Agent/Skill 测评体系设计与落地
- [[Codex 自我改进 Prompt]] — traces → evals → harness 改动的官方 improvement loop
- [[MOC - Harness Engineering]] — Harness 横切入口
