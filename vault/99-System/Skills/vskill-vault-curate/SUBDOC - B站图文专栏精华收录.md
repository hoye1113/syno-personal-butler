---
title: "SUBDOC - B站图文专栏精华收录"
parent: vskill-vault-curate
created: 2026-07-13
updated: 2026-08-13
status: active
version: 2.1
description: "把用户提供的单篇 B站专栏编译为对谈式、可追溯、可串联的第二大脑上下文。"
---

# B站图文专栏精华收录 v2

## 适用边界

只处理用户明确提供的单篇 opus/cv。读取专栏文字和页面元数据；图片、Recastory、ASR、transcript 与 Spot Check 全部跳过。不得扫描 UP 主空间、维护增量游标或自动创建概念笔记。

## 状态机

```text
PREFLIGHT -> DISCOVER -> MATCH -> ADMISSION -> EXTRACT -> PROVENANCE
          -> CLASSIFY -> DIALOGUE_PLAN -> TRANSFORM -> TRACE
          -> RELATE -> INTEGRATE -> VALIDATE/REPORT
```

- `DISCOVER`：提取标题、作者、日期、opus、cv、BV 和内嵌视频元数据。
- `MATCH`：按 BV、opus、cv、source URL 查重。
- `ADMISSION`：拒收纯新闻、重复观点、低价值教程、越界主题和无法归属的碎片。
- `EXTRACT`：生成 Pass 1 保留单元。
- `PROVENANCE`：确定问题、人物和回答的声音依据。
- `CLASSIFY`：分别判断 C1/C2、S/A/B、source_form 与 content_form。
- `DIALOGUE_PLAN`：先规划问题与回答单元，再写正文。
- `TRACE`：所有关键单元必须有保留位置、删除理由或未决标记。
- `RELATE`：选择 1–3 个带类型的真实关系，或标 orphan。
- `INTEGRATE`：写 canonical 并更新已有 MOC；受控变更先确认。
- `VALIDATE/REPORT`：运行 v2 验证器和语义自检。

## Pass 1

```yaml
core_question:
core_claims: []
mechanisms: []
numbers: []
examples: []
constraints_and_counterexamples: []
knowledge_units:
  concepts: []
  methods: []
  decisions: []
  failure_modes: []
  open_questions: []
voice_map:
  - unit_id:
    speaker:
    voice_basis:
    source_location:
relation_candidates:
  supports: []
  extends: []
  contradicts: []
  limits: []
  depends_on: []
  applies_to: []
  example_of: []
uncertain_facts: []
```

每个单元记录 `id/type/content/source_location/speaker/voice_basis/decision/reason/target_section`。Pass 1 是临时执行产物，不进入正式知识目录。

## 声音与路由

```text
S + source dialogue   -> dialogue + source/column
S + source lecture    -> dialogue + reconstructed/editorial
S + source roundtable -> roundtable + source/column
A                     -> 优先保留 source_form
B                     -> 有限讲义、Inbox 或 rejected；禁止人物化重构
```

- 真实 Host/Guest 使用真实姓名；无真实主持人只使用“编者问”。
- 提问者身份不明时写“现场提问”或“观众提问”。
- 专栏是第三方总结时，回答角色写“专栏整理”，不得冒充讲者第一人称。
- 纯技术步骤型 S级仍用对谈框架，连续步骤留在回答内的列表或代码块中。
- `question_source` 描述整篇最终形态；A/B lecture 即使保留末尾现场问答，note-level 仍写 `dialogue_fidelity: none`、`question_source: none`。
- 人物不完整但内容可用时标 `partial`；核心观点无法归属时降级或拒收。

## Dialogue Plan

```yaml
chapters:
  - chapter_claim:
    question:
    question_type: source | editorial
    answer_units: []
    tension:
    related_concepts: []
```

问题必须打开机制、选择、冲突、实践或边界；不得加入专栏没有的事实前提，也不得用同义问题凑章节。回答至少保留判断和机制，关键章节再加入案例、数字或限制。

## Frontmatter

```yaml
ingest_workflow: bilibili_opus_ingest_v2
source_type: bilibili_opus
source_url: "https://www.bilibili.com/opus/..."
opus_id: "..."
column_id: "cv..."
video_url: "https://www.bilibili.com/video/BV.../"
bv: "BV..."
uploader: "Easonlee的AI笔记"
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
verification_basis:
  - column
```

`column_only` 只表示笔记忠实于专栏，不表示外部事实已独立核验。只有实际读取官方原页后才能使用 `column_plus_original`。v2 禁止写入 `transcript_source`、`ingest_dir`、`asr_version` 和 `spot_check`。

## S级正文

```markdown
# 标题

> 人物、主题、核心问题和阅读导航。
>
> **核心主张：** 一句话浓缩全篇中心论断。

> 全篇仅此一条的金句原文。
> ——讲者姓名

## 开场

## 01 具体问题或判断

**核心判断：** 一句话陈述本章主张，独立成行、置于本节最前。

**真实主持人 / 编者问：** 问题。

**讲者 / 专栏整理：** 判断、机制、案例和限制；原文枚举内容转 bullet 列表。

## 限制与边界

## 知识连接

## 来源说明
```

**排版规范（locked，2026-08-13 固化；所有 opus 收录强制叠加于上述骨架之上）：**

- ① 每章正文最前一行加粗 **核心判断**，一句话陈述该章主张。
- ② 原文中的枚举/并列内容一律转为 `-` bullet 列表。
- ④ 导读 blockquote 内增加一行加粗 **核心主张**，浓缩全篇。
- ⑤ 全篇固定一条 pull-quote blockquote：金句 + `——人名` 出处。
- ③ 不加时间戳/时间轴（图文专栏无信息量，明确跳过）。

使用 3–6 个主要问题，但不得用重复问题补数量。不强制概念表、本章小结、中英对照金句或固定字数（⑤ 指定的单条金句除外）。删除重复摘要、章节预告、寒暄、宣传、评论、UI 和无知识增量的例子。

## 知识连接

允许关系：`supports/extends/contradicts/limits/depends_on/applies_to/example_of`，正文分别写“支持、补充、反驳、限制、依赖、应用于、示例”。

```markdown
- **支持** [[MOC - Agent Theory and Design]]：说明新增了什么证据。
- **限制** [[Agent实战-打造一个AI Agent的完整教程]]：说明哪项结论只在特定条件下成立。
```

S级必须有 `知识连接`；不得只放裸 wikilink。没有真实关系时写 `status: orphan` 并说明缺口。新概念只进入报告的 `concept_candidates`；至少两个独立来源后可标 `eligible`，仍需用户确认才能创建。

## 报告接口

报告使用 `workflow: bilibili_opus_ingest_v2`，包含 route、retention、related_notes、concept_candidates、moc_updates、checks、unresolved 和 status。`checks` 至少覆盖来源、声音、保留率、问题独立性、数字语境、限制、关系质量和讨论就绪。

## 完成门

```powershell
python 99-System/scripts/bilibili-opus-validate.py <note> --vault-root <vault> --sources-read column
```

确定性验证通过后，Agent 还必须确认保留覆盖、声音安全、问题独立、数字语境、限制保留、关系质量和讨论就绪。任一关键项失败或 unresolved 非空时报告 `incomplete`。S 级正文的 locked 排版（①核心判断前置、④导读核心主张、⑤唯一金句）由 validator 强制：①④缺失及⑤缺失均为 error（⑤重复为 warning），META 节（开场/摘要/限制与边界/知识连接/来源说明/来源声明）豁免①。
