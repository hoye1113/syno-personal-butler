---
title: vskill Index
description: vault 自带 agent 能力索引——任何 agent 进入 vault 应先查本文件，按需加载 vskill-*
created: 2026-06-27
updated: 2026-07-13
tags:
  - moc
  - skills
source: vault_initiative - skills_index
---

# vskill Index

> **vskill-** = vault 内部约定的 agent 能力（区别于平台原生 skill，如 Claude Code 的 `.claude/skills/`）。
> **任何 agent 接触本 vault 时的发现顺序**：
> 1. 读 `AGENTS.md`（vault 协议）
> 2. 读本 `INDEX.md`（vskill 列表）
> 3. **B 站图文专栏收录** → [专栏精华收录 SUBDOC](./vskill-vault-curate/SUBDOC%20-%20B站图文专栏精华收录.md)；历史 ASR 核验才读 Legacy 索引
> 4. 其他任务 → 按需加载 `vskill-*/SKILL.md`
>
> **命名规范**：`vskill-{能力域}-{具体能力}`（如 `vskill-vault-discuss`、`vskill-vault-write`）

---

## 可用 vskill

| 名称 | 状态 | 一句话描述 | 借鉴 | SKILL.md |
|---|---|---|---|---|
| `vskill-vault-discuss` | ✅ v0.3 可用（3 模式）| 章节级检索 + 类型化一跳上下文讨论 | `kb-retriever` + `ljg-roundtable` + `ljg-read` | [SKILL.md](./vskill-vault-discuss/SKILL.md) |
| `vskill-vault-write` | ✅ v0.6 可用 | blade 观点文，或带声音/来源忠实度标记的对谈 | `ljg-writes` | [SKILL.md](./vskill-vault-write/SKILL.md) · [对谈稿 SUBDOC](./vskill-vault-write/SUBDOC%20-%20Host-Guest%20对谈稿.md) |
| `vskill-vault-curate` | ✅ v0.8 可用 | 通用收录；B站专栏 v2 编译为对谈式第二大脑上下文 | `wiki-ingest` + filesystem | [SKILL.md](./vskill-vault-curate/SKILL.md) · **[专栏入口](./vskill-vault-curate/SUBDOC%20-%20B站图文专栏精华收录.md)** · [Legacy ASR](./vskill-vault-curate/LEGACY%20-%20B站%20ASR%20与%20Recastory.md) |
| `vskill-vault-relate` | ✅ v0.2 可用 | 元数据预筛 + 主张/机制/边界的类型化关系候选 | `kb-retriever` + `vskill-vault-discuss` | [SKILL.md](./vskill-vault-relate/SKILL.md) |
| `vskill-vault-moc-builder` | ✅ v0.2 可用 | 按问题空间、机制、争议与应用组织 MOC | `ljg-rank` + `wiki-ingest` | [SKILL.md](./vskill-vault-moc-builder/SKILL.md) |

## 计划中 vskill（未实现）

| 名称 | 计划能力 | 优先级 | 借鉴来源 |
|---|---|---|---|
| `vskill-vault-audit` | 季度审计：孤岛 / 死链 / tag 一致性 / frontmatter 完整性 | P2 | `neat-freak` + `reality-check` |
| `vskill-vault-concept-anatomy` | 8 刀解剖一个 AI 时代术语（含"元反思"第八刀）| P3 | `ljg-learn` |
| `vskill-vault-lineage` | 递归 5 层找 vault 内主题溯源链 + 问题为轴叙事 | P3 | `ljg-paper-river` |

---

## vskill 工作流（闭环）

```
[用户需求]
    ↓
vskill-vault-discuss  ← 检索 + 跨笔记对比
    ↓
vskill-vault-write    ← blade 观点文 | dialogue 对谈稿（见 SUBDOC）
    ↓
vskill-vault-curate   ← 收录 + 加 MOC（访谈可先 curate 再 write dialogue）
    ↓
vault-audit.py        ← 季度结构质量审计（已实现脚本）
    ↓
vskill-vault-moc-builder  ← MOC 重构 / 升级
    ↓
loop
```

**B 站图文专栏收录（先读 [专栏精华收录 SUBDOC](./vskill-vault-curate/SUBDOC%20-%20B站图文专栏精华收录.md)）**：

```
用户提供 opus/cv → 查重 → Pass 1 + 声音归属 → source_form
                 → S级对谈/圆桌 + 类型化知识连接
                 → v2 validator → 已有 MOC → 报告
```

---

## 与平台 skill 的关系

- **不冲突**：vskill- 是 vault 私有约定，平台 skill 是平台能力。两者可以并存。
- **不替代**：vskill-vault-discuss 等不替代 Claude Code 的 Read / Grep 工具，而是规范"何时用 + 怎么用"。
- **不绑定**：vskill-* 是 markdown 文件，理论上任何能读文件的 agent 都能加载。

## 添加新 vskill 的流程

1. 在 `99-System/Skills/` 下创建 `vskill-{name}/` 目录
2. 写 `SKILL.md`（含 frontmatter + 触发条件 + 工作流 + 输入输出契约 + 例子）
3. 在本 `INDEX.md` 添加条目
4. 提交并推送（vault 是 Git 仓库）
