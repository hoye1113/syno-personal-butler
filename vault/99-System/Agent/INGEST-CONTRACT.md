---
title: "Vault 收录执行契约 v2"
tags: [notes, skills, ai_agent]
created: 2026-07-13
source: vault_initiative - agent_control_plane
description: "定义通用收录契约与 B站专栏上下文编译 v2 的状态、接口和完成条件。"
---

# Vault 收录执行契约 v2

## 通用状态机

1. `PREFLIGHT`：读取 AGENTS、Router、Contract、Density 和适用 Skill。
2. `ADMISSION`：判断主题相关性并查重来源。
3. `INVENTORY`：发现实际输入，记录缺失，不拼固定路径。
4. `CLASSIFY`：独立判断素材质量与正文形态。
5. `TRANSFORM`：先生成保留清单，再按形态成稿。
6. `RELATE`：选择真实关系或标 orphan。
7. `INTEGRATE`：写 canonical 并更新已有 MOC；受控变更先确认。
8. `VALIDATE/REPORT`：验证失败则报告 incomplete。

## B站专栏上下文编译 v2

用户提供单篇 opus/cv 时使用：

```text
PREFLIGHT -> DISCOVER -> MATCH -> ADMISSION -> EXTRACT -> PROVENANCE
          -> CLASSIFY -> DIALOGUE_PLAN -> TRANSFORM -> TRACE
          -> RELATE -> INTEGRATE -> VALIDATE/REPORT
```

- 只读取专栏文字和页面元数据；图片、ASR、Recastory、transcript 与 Spot Check 跳过。
- 按 BV、opus、cv、source URL 查重；同一来源只有一篇 canonical。
- Pass 1 提取主张、机制、数字、案例、限制、知识单元、声音依据和关系候选。
- S级默认对谈或圆桌出版；A优先保留来源形态；B有限收录或拒收。
- Pass 1、Dialogue Plan 是临时执行产物，不进入正式知识目录。
- Agent 不扫描 UP 主空间、不维护增量游标、不自动创建概念笔记。

## 字段接口

```yaml
ingest_workflow: bilibili_opus_ingest_v2
source_type: bilibili_opus
primary_source: column
source_tier: C1 | C2
material_tier: S | A | B
source_form: lecture | dialogue | roundtable
content_form: lecture | dialogue | roundtable
dialogue_fidelity: source | reconstructed | none
question_source: column | editorial | none
voice_basis: direct_speech | attributed_paraphrase | editorial_summary | mixed
factual_status: verified | partial | unverified
factual_reviewed: YYYY-MM-DD
verification_scope: column_only | column_plus_original
verification_basis: [column]
```

- C1/C2 衡量来源完整度；S/A/B 衡量长期知识价值。
- `source_form` 是专栏原始组织方式；`content_form` 是 canonical 呈现方式。
- 真实问答使用 `source/column`；S级演讲使用 `reconstructed/editorial`。
- `question_source` 描述整篇 canonical 的最终问答形态；`content_form: lecture` 一律使用 `none/none`。lecture 末尾的现场问答可在正文保留，但不改变 note-level 字段。
- 第三方总结使用 `voice_basis: editorial_summary` 和正文角色“专栏整理”。
- `column_only` 只确认笔记忠实于专栏；`column_plus_original` 表示还实际读取了官方原页。
- 新专栏不写 `transcript_source`、`ingest_dir`、`asr_version` 或 `spot_check`。

## 固定路由

```text
S + source dialogue   -> dialogue + source/column
S + source lecture    -> dialogue + reconstructed/editorial
S + source roundtable -> roundtable + source/column
A                     -> 优先保留 source_form
B                     -> 有限讲义、Inbox 或 rejected；禁止人物化重构
```

技术步骤型 S级使用对谈外壳，连续步骤保留为回答内列表或代码块。无真实主持人只写“编者问”；未知提问者写“现场提问”或“观众提问”。人物不完整时标 partial，观点无法归属时降级或拒收。

## Pass 1 与 Dialogue Plan

Pass 1 至少包含：核心问题、主张、机制、数字、案例、限制反例、概念、方法、决策、失败模式、开放问题、声音映射、关系候选和未决事实。每个单元记录来源位置、说话人、声音依据、保留决策和目标章节。

Dialogue Plan 每章记录：`chapter_claim`、`question`、`question_type`、`answer_units`、`tension` 与 `related_concepts`。问题不得带入专栏没有的事实前提，也不得同义重复。

## 知识关系

关系枚举：`supports`、`extends`、`contradicts`、`limits`、`depends_on`、`applies_to`、`example_of`；正文写“支持、补充、反驳、限制、依赖、应用于、示例”。

S级选择 1–3 个真实关系并解释，不能只放裸链接。无候选时标 orphan。新概念只进入报告；至少两个独立来源后可标 eligible，但创建仍需用户确认。

## 事实与引用

- verified：可以引用，但必须同时披露 source 和 verification_scope。
- partial：使用保守措辞并披露 unresolved_facts。
- unverified 或旧笔记无 factual 字段：只作检索线索。
- `verification_basis` 只列实际读取来源。

## B站专栏报告

```yaml
workflow: bilibili_opus_ingest_v2
source_id: {opus: "", column: "", bv: ""}
route:
  source_tier:
  material_tier:
  source_form:
  content_form:
  dialogue_fidelity:
  question_source:
  voice_basis:
target_path:
sources_read: [column]
sources_skipped: [images, transcript, recastory]
retention: {total_units: null, retained: null, removed: null, unresolved: null}
related_notes: []
concept_candidates: []
moc_updates: []
checks:
  duplicate:
  source_completeness:
  provenance:
  retention_coverage:
  dialogue_plan:
  voice_integrity:
  numeric_context:
  constraints_preserved:
  relation_quality:
  discussion_readiness:
  frontmatter:
  wikilinks:
unresolved: []
status: complete | incomplete | rejected
```

确定性验证通过后仍须完成语义检查。关键检查失败或 unresolved 非空时不能标 complete。

## v1 与 Legacy

- 缺少 `ingest_workflow` 的现有 `bilibili_opus` 笔记按 v1 兼容读取，只产生渐进迁移提示。
- `question_source: transcript` 只服务历史 ASR 笔记。
- 旧审计、Recastory inventory 与 Spot Check 只用于历史核验，不参与新收录。
- 不批量迁移存量正文，今后触达时渐进升级。

## 受控变更

新建 MOC、新 tag、概念笔记和覆盖已有 canonical 必须先确认。更新已有 MOC 属于普通收录动作，但必须在报告中披露。

## 相关阅读

- [[MOC - Agent Theory and Design]]
