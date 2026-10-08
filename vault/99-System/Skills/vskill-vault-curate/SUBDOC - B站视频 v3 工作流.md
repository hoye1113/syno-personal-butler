---
title: "SUBDOC - B站视频收录工作流 v4"
parent: vskill-vault-curate
created: 2026-07-02
updated: 2026-07-13
status: legacy
version: 4.0
description: "B站素材从动态发现、双轴分类、Pass 1、成稿到校验的执行流程。"
---

# B站视频收录工作流 v4

> **Legacy：仅用于历史 Recastory/ASR 笔记核验，不用于新收录。**

唯一分类入口是 [ASR 内容双轴分类与收录决策](./SUBDOC%20-%20ASR内容分轨与收录决策.md)。本文件不再维护 S/A 与正文形态绑定的旧三轨表。

## Phase 0 - Admission

读取 BV、URL 或 Recastory 路径；查 vault 是否已有相同 BV、`source_url` 或 manifest `vault_path`；纯新闻、素材不足且无法保真时拒收。

## Phase 1 - Inventory

动态寻找 metadata、description、article、transcript JSON、column、uploader comment 和 legacy knowledge。记录真实路径、长度、Speaker、时长、时间戳和缺失项。不得假定 `article.md` 位于 `ingest/`。

## Phase 2 - 双轴分类

```yaml
material_tier: S | A | B
content_form: dialogue | lecture | roundtable
dialogue_fidelity: source | reconstructed | none
question_source: transcript | editorial | none
route_reason: "..."
```

先判断信息靠问答、知识依赖还是多方立场推进，再看 Speaker 标签辅助核验。主题演讲默认 lecture。

## Phase 3 - Pass 1

按 Ingest Contract 生成保留清单、章节地图和待核事实。Pass 1 不进正式知识目录，可写入 `99-System/audit/` 或保留在 Agent 工作上下文。

## Phase 4 - 成稿

- dialogue：加载 Host-Guest SUBDOC，保留真实追问；编辑问题显式标重构。
- lecture：加载 B站视频转写收录 SUBDOC，按知识依赖或操作步骤组织；九段只是可选样式。
- roundtable：按议题保留每位说话人的立场、回应和分歧。

统一要求：1 BV 只写一个 `{主题}.md`；frontmatter 写双轴字段和真实 source 路径；正文保留主张、机制、数字、案例、限制和不确定项。

## Phase 5 - Relate 与 Integrate

运行 relate 给 top 5，选择 1–3 个真正会被正文引用的链接。更新已有 MOC；新 MOC、新 tag 或覆盖已有 canonical 前向用户确认。

## Phase 6 - Validate

```powershell
python 99-System/scripts/bilibili-note-validate.py <note> --source-root <workspace>
python 99-System/scripts/bilibili-v3-gap-check.py
```

≥45 分钟再跑 Spot Check。任一检查失败时输出 `status: incomplete`。

## 质量门

- 双轴和忠实度字段合法。
- `transcript_source` 真实存在。
- 不凭 UP 主推断 Host。
- 不把 editorial 问题冒充现场原话。
- Pass 1 保留项在成稿可追踪。
- 反向链或 orphan 合法。
- 无双文件、死链和重复 BV。
