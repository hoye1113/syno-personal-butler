---
title: vskill-vault-moc-builder
name: vskill-vault-moc-builder
description: 给一个 vault 主题，找出背后真正撑着的几根独立"取景框"——是 MOC（Map of Content）合并 / 新建 / 拆解 / 升级的方法论。借鉴 ljg-rank 降秩分析 + 9 种取景框家族。
created: 2026-06-27
updated: 2026-06-27
status: available
version: 0.2
tags:
  - skills
  - vskill
  - moc
inputs:
  - name: topic
    type: string
    required: true
    description: 一个主题（如"Harness Engineering""AI 时代职业"）
  - name: existing_mocs
    type: list
    required: false
    description: 已有相关 MOC（默认扫描 vault 全部 MOC 找相关）
  - name: candidate_notes
    type: list
    required: false
    description: 候选笔记列表（默认 grep + glob 找相关笔记）
  - name: max_notes
    type: integer
    required: false
    default: 30
    description: 候选笔记上限（控制 token 预算）
  - name: output_mode
    type: enum
    values: [new_moc, merge_mocs, split_moc, audit_only]
    required: false
    default: audit_only
    description: 输出模式——新建 MOC / 合并已有 MOC / 拆分大 MOC / 仅审计
outputs:
  - name: moc
    type: markdown
    description: MOC 笔记（含 §3 frontmatter + §5 三段式：主题简介 / 核心笔记列表 / 关联笔记）
  - name: rank_summary
    type: markdown
    description: 降秩报告（基本假设 + root rank + 形状自检 + 9 种取景框选择）
---

# vskill-vault-moc-builder

> **核心一句话**：MOC 不是笔记清单，是"用哪副取景框看这个主题"——找 root rank，9 种形状里选最贴的，画 ASCII 结构图。
>
> **借鉴来源**：ljg-rank 降秩引擎（Deutsch《无穷的开始》方法论）+ 9 种取景框家族

## 何时使用

✅ **使用**：
- AGENTS.md §5 "同主题 ≥ 3 篇笔记时建 MOC"——本 skill 决定怎么建
- 附录 B 已知未解决："MOC - AI Agent 参考资料 + MOC - B站视频知识库 → 建议合并"
- 季度审计（§9）：MOC 是否结构健康（笔记数 / 反向链 / 主题漂移）
- MOC 升级：3 篇笔记的 MOC 长到 10+ 篇，结构变糊，需要重新"降秩"

❌ **不使用**：
- 单篇笔记收录（用 `vskill-vault-curate`）
- 写新观点笔记（用 `vskill-vault-write`）
- 跨笔记讨论（用 `vskill-vault-discuss`）

## 核心方法论

### 0. 先看基本假设（往上看，看到天花板）

每个领域都立在几条"不证自明"的假设上。降秩之前，先挖出来。

**操作问句**：
- 这里什么是不许问的？
- 什么是靠相信才成立的？

**vault 主题常见假设**（AI Agent 时代）：
- "AI 持续变强是不可逆的方向"
- "工具会重塑工作流，不是反过来"
- "开源 / 闭源的某种分布是健康的"
- "人的判断力比 AI 的判断力更稀缺"

把假设写明，不展开论证。

### 1-7. 往下挖：穿透工序（心里走完，不写进 MOC）

1. **铺现象**——主题下 10+ 个有代表性的现象（笔记名 / 核心观点）
2. **列候选**——每个现象问"为什么会这样"，候选生成器全列
3. **递归下沉**——**先找第一层，站稳了，再下沉。** 这一步是命门
4. **合并同源**——两根候选是同一生成器在两面上露脸，合掉
5. **砍**——拿掉一根，剩下的能不能反生成全部现象？
6. **反生成**——从头把现象清单走一遍
7. **预测 + 变更双测**——
   - **预测清单外**（reach）：能不能推出清单外的现象？
   - **变更测试**（hard to vary）：改一根细节，预测还对吗？动一处就垮才是真根

### 9 种取景框家族（root rank 长成什么样，画法就跟）

| Root rank 形态 | 关系本质 | ASCII 图样式 |
|---|---|---|
| 几根并排独立、可滑动 | 正交 | 二轴 / 多轴坐标系 |
| 一层托一层（最深一根是元命题）| 嵌套穿透 | 钻井剖面 |
| 一根线两端拉扯 | 张力对立 | 光谱 / 滑标 |
| 互相正负推动 | 反馈循环 | 环路图（标 `+` / `-`） |
| 一段接一段 | 阶段递进 | 链式 / 台阶 |
| 一根分多根，多根再分 | 层级分叉 | 树形图 |
| 多对多互勾 | 耦合网络 | 网状图 |
| 涨涨落落、节奏交替 | 振荡 | 波形 / 振荡曲线 |
| 多维分类（抽象度 × 远近度 × 时间）| 多维分类 | N 轴 / 多切片 |

### 两道反坍缩闸（强制自检）

#### 反坍缩闸 1：反"钻井剖面"懒惰

**AI 一上手就爱想到"钻井剖面"——这是懒惰锚点**。任何概念都能拆三层（表层/中层/底层），拆完看着齐整，但很多东西的真实结构根本不是垂直往下钻的。

强制反问：
- 这几根之间，真有先后或嵌套关系吗？（钻井 vs 并排）
- 还是其实在互相推？（钻井 vs 反馈环）
- 还是其实有时间或逻辑顺序？（钻井 vs 阶段链）
- 还是其实只是一根光谱？（钻井 vs 光谱）

把另外 8 种逐一排除掉，才能落到"钻井剖面"。

#### 反坍缩闸 2：反"2x2 矩阵"懒惰

**AI 的另一个懒惰锚点是 2x2 矩阵**。咨询和战略框架的训练数据里 2x2 极多，任何两个变量都能切四象限。

强制反问：
- 这两根维度真的独立吗？（独立 vs 同一根线的两面）
- 真的可滑动吗？（连续可调 vs 离散阶段）
- 四象限里每一格都对得上现实吗？（三格都空着，就根本不该用 2x2）

## 工作流（4 步）

### Step 1：扫描 vault 找相关笔记

- 用 `glob` 找 `MOC - *.md`（已有 MOC）
- 用 `grep` 找包含主题关键词的笔记
- 用 MOC 链入关系找隐式相关

**输出**：候选笔记列表（带 score）

### Step 2：降秩

按 0-7 步工序走完，得到：
- 基本假设（3-5 条）
- root rank（几根生成器 + 关系）
- 形状（9 种取景框选一种）

### Step 3：合并 / 拆分 / 升级决策

根据扫描结果：
- **new_moc**：主题 ≥ 3 篇笔记 + 无现有 MOC → 建新 MOC
- **merge_mocs**：2+ MOC 主题重合（≥ 50% 笔记重叠）→ 合并
- **split_moc**：单 MOC 笔记 > 30 篇 + 主题漂移 → 拆分
- **audit_only**：MOC 健康但需补反向链

### Step 4：写 MOC

按 AGENTS.md §5 "MOC 规范"：

优先按问题空间、机制、争议、边界或应用组织，不按来源平台堆列表。每条笔记必须有一句关系说明；同一笔记不要因多个关系在同一分组重复出现，横切关系放到关联区。

```markdown
# MOC - {主题名}

> **主题简介**（2-3 句，含该主题的边界 + 取景框选择）

## 核心笔记列表

按 root rank 的"几根"分组，每组带 1 行说明：

### A. {第一根生成器}（N 篇）
- [[笔记 1]] — 一句话
- [[笔记 2]] — 一句话

### B. {第二根生成器}（N 篇）
- ...

## 关联笔记 / 横切 MOC 链接

- [[MOC - 横切主题]] — 一句话
- [[笔记（孤儿但相关）]] — 一句话
```

**文件命名**：`MOC - {主题名}.md`（AGENTS.md §6，≤ 50 字符）
**frontmatter**：tags 必含 `moc` + 主 tag

## ASCII 约束

所有图表用纯 ASCII 字符。允许字符集：字母、数字、中文汉字、空格，以及 `- = | + * / \ < > ^ v [ ] ( ) { } . , : ; _ #`。

对照表：
- `┌ ┐ └ ┘ ├ ┤` → `+`
- `─ ━` → `-`
- `│ ┃` → `|`
- `→ ▶` → `->`
- `← ◀` → `<-`
- `↑` → `^`
- `↓` → `v`
- `●` → `*` 或 `o`
- `×` → `x`

## 例子

**输入**：
```yaml
topic: "Harness Engineering"
output_mode: merge_mocs
```

**预期行为**：
1. 扫描 vault 发现两个相关 MOC：
   - `MOC - AI Agent 参考资料`（12 篇）
   - `MOC - B站视频知识库`（已合并入 `MOC - Agent Theory and Design`，32 篇 B 站 v3）
   - 实际主题：Harness 笔记 7 篇，散落在两个 MOC
2. 降秩：root rank 是 3 根生成器
   - A. **Anthropic 官方视角**（Claude Code / 汇编本）
   - B. **OpenAI 实验视角**（5 个月 0 人工）
   - C. **反规范 / 反思视角**（IBM 登山绳 / 三元同学马斯克法 / Loop Engineering）
3. 形状：并排（正交，3 根可滑动）→ 二轴坐标系
4. 合并决策：把两个 MOC 合并为 `MOC - Harness Engineering`
5. 输出 MOC + ASCII 结构图 + 降秩报告

## 约束

- ❌ 不在 MOC 里写笔记内容（只列引用）
- ❌ 不在 MOC 里夹带个人观点
- ❌ 不创建 < 3 篇笔记的 MOC（AGENTS.md §5）
- ✅ 必须做"反坍缩闸 1"和"反坍缩闸 2"自检
- ✅ 主题边界必须明确（什么算这个 MOC，什么不算）
- ✅ 关联 MOC 链接必填（横切关系）

## 关联

- 上游：用户审计需求 / `vskill-vault-audit`（计划中）
- 下游：`vskill-vault-curate`（自动把新笔记链入 MOC）
- 索引：[INDEX.md](../INDEX.md)
- 协议：[AGENTS.md](../../../AGENTS.md) §5 / §9
- 借鉴：[ljg-rank](https://github.com/ljg-skill-collection) 降秩引擎
