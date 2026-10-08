---
title: "SUBDOC - ASR 内容双轴分类与收录决策"
parent: vskill-vault-curate
created: 2026-07-06
updated: 2026-07-13
status: legacy
version: 2.0
description: "B站、Recastory和视频ASR收录唯一入口：动态发现素材，独立判断素材质量和正文形态。"
---

# ASR 内容双轴分类与收录决策

> **Legacy：仅用于历史笔记核验，不用于新收录。** 新 opus/cv 读取 `SUBDOC - B站图文专栏精华收录.md`。

## 先发现，后分类

真实 Recastory 产物不保证固定布局。常见结构是 BV 根目录放 `article.md`、`transcript.json`，`ingest/` 放 metadata、简介和专栏。先运行素材发现器或等价扫描：

```powershell
python 99-System/scripts/bilibili-source-inventory.py `
  --workspace D:\workSpace\git_clone_test\hoye-git\Recastory\workspace `
  --json-out 99-System/audit/bilibili-source-inventory-YYYY-MM-DD.json `
  --md-out 99-System/audit/bilibili-source-inventory-YYYY-MM-DD.md
```

不得拼接假定的 `ingest/article.md`。`transcript_source` 必须指向真实存在的文件。

## 双轴分类

### 轴一：素材质量

| 等级 | 判定 |
|---|---|
| S | metadata、简介、正文和核验来源完整；人物、数字和结构可回溯 |
| A | 足以成稿，但缺专栏、人物线索或部分结构信息 |
| B | 只能有限收录；缺ASR、关键身份或事实核验时必须披露，无法保真则拒收 |

### 轴二：正文形态

| 形态 | 信息如何推进 | 正文 |
|---|---|---|
| dialogue | 追问改变答案方向，问答承载经历、条件、冲突 | 3–6章真实或标注重构的对谈 |
| lecture | 知识依赖、解释或操作步骤推进 | 结构化讲义；不要求机械九段 |
| roundtable | 多个说话人的独立立场和回应构成价值 | 按议题保留各方立场 |

禁止凭 Speaker 数量分轨。双 Speaker 教程仍可能是 lecture；主题演讲默认 lecture。

## 忠实度字段

```yaml
material_tier: S | A | B
content_form: dialogue | lecture | roundtable
dialogue_fidelity: source | reconstructed | none
question_source: transcript | editorial | none
```

- 真实问答：`source` + `transcript`。
- 编辑重构：`reconstructed` + `editorial`，问题不得冒充现场原话。
- 非对谈：两个字段均为 `none`。

旧 `dialogue_version`、`genre`、`curate_method` 只做兼容读取。新收录必须写双轴字段。

## 来源职责

```text
metadata          BV、身份、日期、时长
description       导读、时间戳、人物线索
article.md        原始论述、问答、数字、限制
transcript.json   时间与Speaker核验
column_article    中文骨架、重点、术语辅助
原节目页           人名、职位、节目名核实
```

专栏不是唯一事实源。S 级采用专栏辅助编排、ASR或原页核验。

## Pass 1（不进正式知识目录）

```yaml
core_questions: []
story_or_dependency_map: []
chapter_map: []
claims: []
mechanisms: []
numbers: []
examples_or_demos: []
constraints_and_counterexamples: []
quotes: []
entities: []
uncertain_facts: []
```

dialogue 额外记录 Host/Guest 映射及依据；roundtable 记录每位说话人的立场；lecture 记录知识依赖或操作顺序。

## Speaker 与编辑问题

1. 有 Speaker 标签：读前 5–10 段判断谁问、谁答，不能只看编号。
2. 无标签：用开场身份句、问句密度、简介和原节目页核验。
3. UP 主通常是转载层，不得当作 Host。
4. 人名无法核实时写 `speaker_confidence: 待核实`。
5. 主题演讲不得默认伪造现场 Moderator。若用户明确需要出版式重构，角色写“编者问”或等价标识，并使用 `reconstructed/editorial`。

## 按形态加载

- dialogue：读 `vskill-vault-write/SUBDOC - Host-Guest 对谈稿.md`。
- lecture：读 `SUBDOC - B站视频转写收录.md`，把九段视为可选骨架，不是强制形态。
- roundtable：复用真实对话的来源规则，按议题组织，不合并说话人立场。
- ≥45分钟：再读 `SUBDOC - Spot check（长视频 factual）.md`。

## 完成门

```powershell
python 99-System/scripts/bilibili-note-validate.py <note> --source-root <Recastory-workspace>
python 99-System/scripts/bilibili-v3-gap-check.py
```

必须满足：双轴字段合法、来源存在、反向链或 orphan、长视频 spot check、无 `- 对谈稿.md`、无伪装的编辑问题。失败时报告 incomplete。

## 样板

- S source dialogue：[[Codex负责人-现场演示Codex]]
- A source dialogue：[[OpenAI员工-上下文工程和Agent记忆]]
- A lecture：[[Karpathy爆火项目-AutoResearch解读与启发]]
- 双 Speaker lecture：[[Agent实战-打造一个AI Agent的完整教程]]
- 重构边界：[[Databricks-企业级Agent生产实践]]（未来同类默认 lecture）

## 反模式

- 按 Speaker 数量或素材等级套正文模板。
- 假定 ASR 一定在 `ingest/`。
- 专栏存在就跳过事实核验。
- 把主题演讲伪装成真实主持人问答。
- 只按长度判断信息密度。
- ASR 时间顺序逐段复述。
- 同一 BV 生成双文件。
- 校验失败仍报告完成。
