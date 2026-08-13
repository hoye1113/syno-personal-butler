---
title: "Scripts - 运行入口"
tags: [notes, skills]
created: 2026-07-06
source: vault_initiative - scripts_readme
description: "99-System/scripts 下脚本的统一入口，包含用途、常用命令和环境准备。"
---

# Scripts - 运行入口

这个目录放的是 vault 的本地自动化脚本。它们分成两类：

- `vault-audit.py`
  - 全库审计：frontmatter、tag、wikilink、孤岛、文件名规则
- `bilibili-*.py`
  - B 站视频 v3 工作流：对账、补字段、批处理、合并 canonical、spot check

## 运行前准备

### 1. Python

- 建议版本：`Python 3.11+`
- 根目录已声明：[pyproject.toml](../../pyproject.toml)

### 2. Vault 访问方式

Agent 直接读写本仓库的 Markdown 文件，不依赖 Obsidian MCP、REST API、端口或 token。Obsidian 只负责人工阅读、编辑和链接呈现。

## 常用命令

### B 站图文专栏验证（默认新流程）

```powershell
python 99-System/scripts/bilibili-opus-validate.py <笔记> --vault-root <vault> --sources-read column
```

验证用户提供的单篇 opus/cv v2 笔记，包括来源查重、来源/成稿形态、声音依据、对谈忠实度、事实范围、限制边界、类型化知识关系和图片跳过。缺少 `ingest_workflow` 的 v1 笔记继续兼容；新流程不要求 Recastory、transcript 或 Spot Check。

Recastory inventory、ASR reconcile/batch/gap-check、Spot Check 与 trust audit 已冻结为 Legacy，只用于历史笔记核验。

### 1. 全库审计

```powershell
python 99-System/scripts/vault-audit.py
```

输出：

- 审计报告写入 `99-System/audit-report.md`

### 知识库混合检索（vault-search）

```powershell
# 关键词检索（默认只搜 01-Areas + 02-Resources，章节级命中）
python 99-System/scripts/vault-search.py "agent 记忆 不遗忘" --top 5

# tag 分面过滤（多个 --tag 为 AND，逗号内为 OR）
python 99-System/scripts/vault-search.py "loop" --tag loop_engineering

# agent 消费：JSON + 命中解释
python 99-System/scripts/vault-search.py "上下文 压缩" --json --top 5
python 99-System/scripts/vault-search.py "prompt 减法" --explain

# 全库 tag 分面总览（看检索轴）
python 99-System/scripts/vault-search.py --tags
```

用途：**不靠人维护索引**的实时检索。BM25 关键词轴 + tag 过滤，章节级返回 `文件 § 章节 [tags] + 分数 + 命中片段`；纯标准库零依赖，只读不写。向量轴为预留扩展点（`score_vector` stub，未来接 bge-m3 只填该函数 + `fuse` 权重）。供 `vskill-vault-discuss` Step 1 调用。

### 2. B 站素材动态发现

```powershell
python 99-System/scripts/bilibili-source-inventory.py --workspace <Recastory/workspace> --json-out <inventory.json> --md-out <inventory.md>
```

用途：发现 BV 根目录和 `ingest/` 中的真实文件位置，不假定 `article.md` 路径。

### 3. B 站单篇 v2 校验

```powershell
python 99-System/scripts/bilibili-note-validate.py <笔记> --source-root <Recastory/workspace>
```

检查双轴字段、来源路径、重构对谈标记、长视频 spot check 和反向链。

### 4. B 站 ingest 对账

### B 站存量可信度审计

```powershell
python 99-System/scripts/bilibili-trust-audit.py --vault <B站视频知识库> --inventory <source-inventory.json> --json-out <trust-audit.json> --md-out <trust-audit.md>
```

用途：关联 canonical、Recastory inventory 与 manifest，按来源缺失、编辑重构、Speaker、长视频和数字密度生成 P0–P3 队列。扫描阶段只读，不修改笔记。

```powershell
python 99-System/scripts/bilibili-ingest-reconcile.py
```

用途：

- 对齐 ingest 和 vault
- 判定 `material_tier`

Legacy 参考：

- [SUBDOC - ASR内容分轨与收录决策.md](../Skills/vskill-vault-curate/SUBDOC%20-%20ASR%E5%86%85%E5%AE%B9%E5%88%86%E8%BD%A8%E4%B8%8E%E6%94%B6%E5%BD%95%E5%86%B3%E7%AD%96.md)
- [SUBDOC - B站视频 v3 工作流.md](../Skills/vskill-vault-curate/SUBDOC%20-%20B%E7%AB%99%E8%A7%86%E9%A2%91%20v3%20%E5%B7%A5%E4%BD%9C%E6%B5%81.md)

### 5. B 站 canonical 合并

单篇：

```powershell
python 99-System/scripts/bilibili-canonical-merge.py --stem "{主题}" --apply
```

批量：

```powershell
python 99-System/scripts/bilibili-canonical-merge.py --all-s --apply
python 99-System/scripts/bilibili-canonical-merge.py --fix-wikilinks --apply
```

### 6. B 站遗漏检查

```powershell
python 99-System/scripts/bilibili-v3-gap-check.py
```

用途：

- 检查 v3 rollout 是否还有漏项
- 仅校验 manifest 中带 `vault_path` 的条目；`B站视频知识库/README.md` 不计入 32 篇计数

### 7. 长视频 factual spot check

先看 backlog：

```powershell
python 99-System/scripts/bilibili-spot-check.py --list-long
```

生成单篇检查表：

```powershell
python 99-System/scripts/bilibili-spot-check.py "<笔记路径>" -o 99-System/audit/spot-check-<BV>.md
```

## 推荐执行顺序

以下顺序只用于 Legacy B站 v3/ASR 历史核验，不用于新专栏收录：

```text
ingest reconcile
-> 读 ASR 分轨决策 SUBDOC（定 S / A-dialogue / A-lecture）
-> enrich / 写正文（dialogue 或九段）
-> canonical merge（仅存量双文件）
-> gap check
-> long-video spot check
```

对应命令见上面四组入口。

## 脚本索引

| 脚本 | 用途 |
|---|---|
| `vault-audit.py` | 全库审计 |
| `vault-search.py` | 知识库混合检索（BM25 + tag 分面，向量预留） |
| `bilibili-source-inventory.py` | Recastory 素材动态发现与全量统计 |
| `bilibili-opus-validate.py` | B站图文专栏 v2 字段、声音、类型化关系、S 级 locked 排版（①④⑤）、v1 兼容与完成门 |
| `bilibili-note-validate.py` | 单篇双轴收录契约校验 |
| `bilibili-trust-audit.py` | 存量来源可信度风险评分与首批队列 |
| `agent-contract-check.py` | Agent 控制面与平台适配检查 |
| `bilibili-ingest-reconcile.py` | ingest × vault 对账 |
| `bilibili-concept-cn-fill.py` | 补中文概念字段 |
| `bilibili-vault-v3-light.py` | 轻量生成/整理 v3 内容 |
| `bilibili-vault-v3-batch.py` | 批量处理 v3 内容 |
| `bilibili-vault-s-tier-fm.py` | 处理 S 级 frontmatter |
| `bilibili-canonical-merge.py` | 合并 canonical |
| `bilibili-v3-gap-check.py` | 漏项审计 |
| `bilibili-spot-check.py` | 长视频 factual spot check |
| `bilibili-partial-enrich-run.py` | 局部 enrich 执行入口 |
| `bilibili-lecture-colloquial-pass.py` | 讲义口语化修订 |

## 相关文档

- [README.md](../../README.md)
- [AGENTS.md](../../AGENTS.md)
- [vskill Index](../Skills/INDEX.md)
- **[SUBDOC - B站图文专栏精华收录.md](../Skills/vskill-vault-curate/SUBDOC%20-%20B%E7%AB%99%E5%9B%BE%E6%96%87%E4%B8%93%E6%A0%8F%E7%B2%BE%E5%8D%8E%E6%94%B6%E5%BD%95.md)**（新 B 站收录入口）
- [LEGACY - B站 ASR 与 Recastory.md](../Skills/vskill-vault-curate/LEGACY%20-%20B%E7%AB%99%20ASR%20%E4%B8%8E%20Recastory.md)
- [SUBDOC - B站视频 v3 工作流.md](../Skills/vskill-vault-curate/SUBDOC%20-%20B%E7%AB%99%E8%A7%86%E9%A2%91%20v3%20%E5%B7%A5%E4%BD%9C%E6%B5%81.md)
- [SUBDOC - Spot check（长视频 factual）.md](../Skills/vskill-vault-curate/SUBDOC%20-%20Spot%20check%EF%BC%88%E9%95%BF%E8%A7%86%E9%A2%91%20factual%EF%BC%89.md)
