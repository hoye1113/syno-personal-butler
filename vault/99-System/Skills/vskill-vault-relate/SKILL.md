---
title: vskill-vault-relate
name: vskill-vault-relate
description: 为新笔记或孤岛笔记寻找可解释的知识关系；先用标题、tag 和描述预筛，再按主张、机制、限制与应用匹配类型化连接。
created: 2026-07-01
updated: 2026-07-01
status: available
version: 0.2
tags:
  - skills
  - vskill
inputs:
  - name: note_path
    type: string
    required: true
    description: 目标笔记路径（绝对或相对 vault 根）
  - name: max_candidates
    type: integer
    required: false
    default: 5
    description: 候选上限（AGENTS.md §7 警告 >3；建议 3-5）
  - name: min_score
    type: float
    required: false
    default: 0.2
    description: 最低分（0-1，低于此分数不进候选，控制 false positive）
  - name: include_moc_links
    type: boolean
    required: false
    default: true
    description: 是否含 MOC 入口破孤（被相关 MOC 链入也算候选）
  - name: exclude_existing
    type: boolean
    required: false
    default: true
    description: 排除已在笔记"相关阅读"段内已列出的反向链（避免重复）
outputs:
  - name: candidates
    type: list
    description: 候选列表 [{note_path, title, score, reason}]
  - name: warnings
    type: list
    description: 反模式警告（如反向链凑数 / dead wikilink）

---

# vskill-vault-relate

> **核心一句话**：先用元数据找候选，再判断两篇笔记究竟是支持、补充、反驳、限制、依赖、应用还是示例关系。
>
> **借鉴来源**：
> - `kb-retriever` 的"分层索引 + 多轮迭代"（5 步检索骨架的轻量版）
> - `wiki-ingest` 的"实体候选评估"原则（"只有当它会被新笔记引用时才链"）
> - `vskill-vault-discuss` 的"评分公式"（tags × 3 + title × 5 + description × 2 + MOC 链入 × 1）
> - `neat-freak` 的"毕业机制"思路（被多个 MOC 链入 = 候选权重↑）

## 何时使用

✅ **使用**：
- `vskill-vault-curate` 跑完 Step 5 打 tag 后 → 自动调 `vskill-vault-relate` 给反向链候选
- 用户写完新笔记想补反向链 → 跑 `relate` 校对
- vault 内某笔记被识别为孤立 → 跑 `relate` 看是否有遗漏的反向链
- 季度审计（搭配 `vskill-vault-audit`）→ 批量检查 orphan

❌ **不使用**：
- 跨笔记对比（用 `vskill-vault-discuss`）
- 找主题衍生的写作素材（用 `vskill-vault-discuss` 给 anchor_notes，再喂 `vskill-vault-write`）
- vault 内完全没有相关笔记——直接告诉用户"无候选，反向链需自填或 status: orphan"

## 评分公式

```
score = (tags_jaccard × 3) + (title_keywords × 5) + (description_keywords × 2) + (moc_link × 1)
       - decay(now_inactive) - decay(recently_added)
```

各维度归一化到 `[0, 1]`。最终 score 也在 `[0, 1]`。

该分数只用于预筛，不能直接决定写入。入选候选还必须通过正文语义检查：主张、机制、限制或应用至少命中一项，并能给出关系类型和两端章节。

### 维度定义

| 维度 | 计算 | 权重 | 理由 |
|---|---|---|---|
| **tags_jaccard** | `\|A ∩ B\| / \|A ∪ B\|` | × 3 | tag 是 vault 主题分类的核心信号（§4 字典严格） |
| **title_keywords** | 关键词集合交集 / 关键词并集 | × 5 | 标题是最高密度的主题信号 |
| **description_keywords** | description 中关键词命中 | × 2 | description 是摘要，次于标题 |
| **moc_link** | 候选是否在 MOC 索引内 + MOC 是否与新笔记主题相关 | × 1 | MOC 入口破孤（§7） |

### 衰减项

| 衰减 | 条件 | 扣分 |
|---|---|---|
| **now_inactive** | 候选 frontmatter `status: archived` 或在 `03-Archive/` | -0.3 |
| **recently_added** | 候选 7 天内被收录（避免新内容扎堆互相链接造成"小圈子"）| -0.05 |

### 排除规则（强制）

- ❌ 排除自己（`note_path` 自身）
- ❌ 排除完全不命中（`score < min_score`）
- ❌ 排除死链 wikilink（候选文件不存在）
- ❌ 排除已在笔记"相关阅读"段的反向链（`exclude_existing = true`）

## 工作流（5 步）

### Step 1：读新笔记 frontmatter

读 `note_path` 的 frontmatter，提取：
- `title`（标题）
- `tags`（YAML 列表 → Python list）
- `description`（一句话摘要）
- `author` / `source`（其他可用信号）

**注意**：如果 frontmatter 缺失或字段空，回到 `vskill-vault-curate` 步骤 4-5 补齐 frontmatter 再来。

### Step 2：构建查询向量

基于新笔记构建"查询向量"：
- **关键词集合**：从 title + description + tags 提取（去停用词）
- **MOC 候选清单**：扫 vault 内所有 `MOC - *.md`，按 tags/title 与新笔记相似度排，预筛 top 3 MOC

### Step 3：扫 vault 候选池

扫描 vault 内所有 .md：
- 排除 `99-System/` 下纯元数据笔记（`AGENTS.md` `CLAUDE.md` `audit-report.md` `INDEX.md` 等）
- 排除 `99-System/Skills/vskill-*`（自我引用）
- 排除 `03-Archive/`（除非用户显式要求）
- 排除 `.git/` 等非内容目录

**性能门**：
- vault ≤ 500 篇笔记：全量扫
- vault > 500 篇：用 MOC 索引预筛（只扫 MOC 列出的笔记）—— kb-retriever 的分层索引发扬

### Step 4：评分 + 排序

按评分公式预筛，再读取高分候选的相关章节，生成 `(path, score, relation_type, source_section, target_section, reason)`。

### Step 5：Top-N 输出

按 score 降序取前 `max_candidates`（默认 5）。

**每条 candidate 输出**：
```json
{
  "path": "相对 vault 根路径",
  "title": "wikilink 形式 [[笔记标题]]",
  "score": "0.00 - 1.00",
  "relation_type": "supports | extends | contradicts | limits | depends_on | applies_to | example_of",
  "source_section": "目标笔记中的命题章节",
  "target_section": "候选笔记中的对应章节",
  "reason": "一句话说明具体知识关系，而不是只列共享词",
  "moc_linked": "如已链入某 MOC，标出；否则空"
}
```

## 输出格式

```json
{
  "note_path": "目标笔记路径",
  "candidates": [
    {
      "path": "02-Resources/.../某笔记.md",
      "title": "[[某笔记]]",
      "score": 0.87,
      "reason": "tags 共享 4/5 (ai_agent/ai_philosophy/article/wechat) + description 共享『流畅性』『苏格拉底』",
      "moc_linked": "[[MOC - AI 时代个人发展与组织]]"
    }
  ],
  "warnings": [
    "候选 [[某笔记]] 是死链——考虑建作者笔记"
  ],
  "stats": {
    "scanned": 226,
    "eligible": 198,
    "above_threshold": 12,
    "returned": 5
  }
}
```

**用户行为**：
- 接受全部 → 直接写入 `note_path` 的"相关阅读"段
- 接受部分 → 写入选中的
- 全部拒绝 → 笔记加 `status: orphan` 标记

## 何时加 warnings

| 警告 | 触发条件 | 用户动作 |
|---|---|---|
| `dead_wikilink` | 候选文件不存在于 vault | 检查文件名 / 建作者笔记 / 删 wikilink |
| `self_loop` | note_path 自身作为候选 | 自动排除 |
| `crowded_topic` | 同主题候选 ≥ 8 篇（同质化太高）| 提示用户精选 |
| `low_diversity` | top 5 候选全在 1 个 MOC | 提示跨主题 |
| `tag_pending` | 候选有新 tag 但未登记 §4 | 提示登记 |

## 反模式（绝不）

按 AGENTS.md §10 + vskill 自约束：

- ❌ **不凑数**：候选 < 3 也只输出实际命中，不补"看起来相关"的
- ❌ **不忽略 orphan 检查**：score 全 < min_score 时**强制**输出 `orphan_candidate: None` 警告，提示加 `status: orphan`
- ✅ 普通收录可从 top 5 自动选择 1–3 个真实关系写入，并在收录报告中披露；新概念、新 MOC、新 tag 仍需用户确认。
- ❌ **不杜撰 score**：score 是真实计算，不是"看起来高"
- ❌ **不忽略 vault 协议**：找到的候选必须符合 §3 / §4 / §6 / §7；候选本身不合规的，必须先标 warning

## 例子

**输入**：
```yaml
note_path: "02-Resources/AI and Agents/Agent Design & Patterns/Sitor AI - 解决人的信息幻觉 - 三元同学.md"
max_candidates: 5
min_score: 0.2
```

**预期行为**：

1. 读 frontmatter：
   - title: "Sitor AI - 解决人的信息幻觉"
   - tags: `[ai_agent, ai_philosophy, article, wechat]`
   - description: "三元同学介绍 Sitor AI..."
   - author: "三元同学"
2. 查询向量：
   - 关键词：`{Sitor, AI, 信息, 幻觉, 流畅性, 三元, 同学, 角色, 工具, 学习, 苏格拉底, 追问}`
   - MOC 候选：`AI 时代个人发展与组织`（命中 tags ai_philosophy + ai_agent）
3. 扫 vault 226 篇 → eligible 198
4. 评分 top 5：
   - [[Agent 越用越翻车，怎么破局？答案藏在经典管理学里]] — score 0.82（tags 全共享 + description 共享『苏格拉底/追问』）
   - [[先解决痛点再搞系统]] — score 0.78（tags 部分共享 + 同一作者 + description 共享『痛点』）
   - [[80% 的 App 未来会消失吗？我不这么认为]] — score 0.74（同作者 + tags 共享）
   - [[MOC - AI 时代个人发展与组织]] — score 0.71（MOC 链入 + tags 共享）
   - [[用AI的这三年，想跟你分享这9条心得]] — score 0.65（description 共享『AI 幻觉/苏格拉底』）
5. warnings：1 条（dead_wikilink: `[[三元同学]]` —— vault 无此笔记）

## 约束

- ❌ 不读 vault 外的笔记 / 不联网
- ❌ 独立 relate 请求不修改目标笔记；作为 curate 子流程时可写入已选关系。
- ❌ 不忽略 §10 反模式（凑数 / 死链 / 低质反向链）
- ✅ 候选必须能在 wikilink 后真正打开 vault 文件
- ✅ 评分透明可追溯（reason 字段必须可解释）

## 关联

- 上游：用户 / `vskill-vault-curate`（Step 6 自动调）
- 下游：
  - 用户手动选候选 → 写入笔记"相关阅读"段
  - 或配对 `vskill-vault-audit`（计划中）做季度检查
- 索引：[INDEX.md](../INDEX.md)
- 协议：[AGENTS.md](../../../AGENTS.md) §3 / §4 / §6 / §7 / §10
- 借鉴：
  - `kb-retriever`（分层索引导航的轻量版）
  - `wiki-ingest`（"如果它会被引用就链"原则）
  - `vskill-vault-discuss`（评分公式基础）
  - `neat-freak`（毕业机制权重思路）
