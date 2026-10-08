---
title: "SUBDOC - B站视频转写收录"
parent: vskill-vault-curate
created: 2026-07-02
updated: 2026-07-03
status: legacy
version: 1.2
---

# SUBDOC - B站视频转写收录

> **Legacy：仅用于历史 ASR 笔记核验，不用于新收录。**

> **v4 总工作流**：[ASR双轴决策](./SUBDOC%20-%20ASR内容分轨与收录决策.md)（入口）· [B站视频 v4 工作流](./SUBDOC%20-%20B站视频%20v3%20工作流.md)。
> **本 SUBDOC 适用形态**：`content_form: lecture`。单人或多人不是判定条件；知识依赖、解释或操作步骤主导时使用讲义。
> **适用**：Recastory `workspace/knowledge/` 英文 ASR 转写 → vault `02-Resources/AI and Agents/B站视频知识库/`  
> **父 skill**：[[vskill-vault-curate/SKILL.md]]  
> **样板笔记**：`DeepMind团队-当数百万Agent相遇.md`（v2 读者向讲义）

---

## 流水线（两 Pass）

```
Recastory article.md（ASR 英文口语）
        ↓ Pass 1（读者向大纲，写入 distill/knowledge.md 或内联草稿）
        ↓ Pass 2（vault 正文，严格本节模板）
vault 笔记 + MOC 更新 + vskill-vault-relate 反向链
```

**Pass 1 产出**（不进 vault 或仅作中间稿）：

- 这期在回答哪 **3 个问题**
- **5–8 步故事线**（白话，非 ASR 顺序）
- 谁是谁（嘉宾 / 主持 / 节目形态）
- 章节地图（按论点，不按转写顺序）

**Pass 2**：按知识依赖或操作步骤写 vault 笔记。下方九段是成熟样式，不是固定章数或强制顺序。

---

## Step 0：B 站页面简介（kimi-webbridge 优先）

收录前先抓 **真实视频简介**（UP 写的 `desc`，不是 a11y 树碎片、也不是推荐区标题）。

### DOM 锚点（2026 视频页）

| 元素 | 选择器 | 用途 |
|------|--------|------|
| 简介容器 | `.basic-desc-info` | 外层 `div`，父级常为 `.video-desc-container` |
| **简介正文** | `.basic-desc-info .desc-info-text` 或 `.desc-info-text` | **真实简介全文**（优先读这个） |
| 展开/收起 | `.basic-desc-info .toggle-btn` | 文案「展开」时需先 click；「收起」= 已展开 |

### kimi 三步（evaluate 读 DOM）

```bash
SESSION="vault-bilibili-$(date +%Y%m%d)-{bv}"

# 1. navigate 到 BV 页
curl -s -X POST http://127.0.0.1:10086/command -H 'Content-Type: application/json' \
  -d "{\"action\":\"navigate\",\"args\":{\"url\":\"$BV_URL\",\"newTab\":true},\"session\":\"$SESSION\"}"

# 2. 若 toggle 为「展开」，先 click（可用 evaluate 点 .toggle-btn）
# 3. 读简介正文
curl -s -X POST http://127.0.0.1:10086/command -H 'Content-Type: application/json' \
  -d '{"action":"evaluate","args":{"code":"document.querySelector(\".desc-info-text\")?.innerText || document.querySelector(\".basic-desc-info\")?.innerText"},"session":"'"$SESSION"'"}'
```

**evaluate 推荐 payload**（一次拿齐）：

```javascript
JSON.stringify({
  desc: document.querySelector('.desc-info-text')?.innerText,
  expanded: document.querySelector('.basic-desc-info .toggle-btn')?.innerText,
  title: document.querySelector('.video-info-title, h1')?.innerText,
  up: document.querySelector('.up-name, .up-name__text')?.innerText,
  pub: document.querySelector('.pubdate-ip, .pubdate')?.innerText,
  links: [...document.querySelectorAll('.basic-desc-info a')].map(a => ({href: a.href, text: a.innerText}))
})
```

### 降级

| 条件 | 降级 |
|------|------|
| kimi 不可用 | `api.bilibili.com/x/web-interface/view?bvid=` → 字段 `data.desc`（与 DOM 一致） |
| 仍失败 | WebFetch 页面 markdown（噪声多，需人工剔推荐区） |

### 简介里常能解析什么

- `原始视频发布时间：YYYY-MM-DD` → `source_original_date`
- `导读：` / 带 `[MM:SS]` 的条目 → **划章锚点**（对谈稿 SUBDOC）
- `OpenAI…负责人 {Name}` → **Guest 线索**（Host 名通常仍须外源核对）
- `gzh(视频文稿):` → 公众号文稿来源

**简介通常没有**：原 YouTube/播客 URL、Host 真名、英文字幕——需 `__INITIAL_STATE__`（`subtitle` ai-zh）+ ASR + 外源金句搜索补全。

---

## Step 0.5：ingest 契约（v3 起必填对照）

Recastory 每条 BV 在 `{workspace_dir}/ingest/` 下应有：

| 文件 | 用途 | vault 怎么用 |
|------|------|--------------|
| `metadata.json` | BV/UP/duration/column_url/enrichment | frontmatter 元数据 |
| `video_description.md` | `.desc-info-text` 全文 | 划章时间戳、Guest 线索 |
| `column_article.md` | UP 专栏图稿（若有） | **S 级 canonical 主源**；含「主持人/嘉宾」 |
| `uploader_comment.md` | UP 置顶评论 | 专栏/opus 链接入口 |
| `comment_summary.md` | 评论区摘要 | 可选，不进正文 |

**分类**见 [ASR双轴决策](./SUBDOC%20-%20ASR内容分轨与收录决策.md)：`material_tier` 只描述素材质量，`content_form: lecture` 描述正文形态。即使有专栏或两个 Speaker，只要知识依赖、解释或操作步骤主导，就使用本 SUBDOC。

**来源职责**：description 给章节线索，ASR 给原始论述和限制，transcript JSON 核时间与 Speaker，column 只辅助中文骨架和术语。任何来源都不能单独替代其余事实核验。

**frontmatter v3 扩展**（在 §3 五字段之外）：

```yaml
material_tier: S | A | B
content_form: lecture
dialogue_fidelity: none
question_source: none
host_name: "Marina Mogilko"
guest_name: "Thibault Sottiaux"
guest_title: "OpenAI ChatGPT & Codex 负责人"
source_original_date: 2026-05-22
column_url: "https://www.bilibili.com/read/cv50969766/"
ingest_dir: "Recastory/workspace/knowledge/A8-codex-demo/ingest"
curate_method: "vskill-vault-curate v3-ingest"
```

---

## 正文九段（可选骨架）

| # | 章节 | 回答的问题 | 与相邻节的区别 |
|---|------|-----------|---------------|
| 1 | `## 先搞懂这一期` | 读**前**：讲啥、怎么串 | 不是小结；含 3 问 + 故事线 |
| 2 | `## 背景` | 在 vault 大图里占哪块 | 表格：已有认识 vs 这期补上 |
| 3 | `## 分话题讲` | 正文：说法 / 例子 / 和你何干 | 按论点分节，非 ASR 顺序 |
| 4 | `## 关键概念` | 术语译解（中文 ↔ 英文 ↔ 白话） | 三列表，不是论断 |
| 5 | `## 值得记住的原话` | 嘉宾原话 + 中文 | 引用，不是改写 |
| 6 | `## 小结` | 读**后**：信什么、记住什么 | **论断**；见 §小结写法 |
| 7 | `## 行动启示` | 读**后**：**做**什么 | **动作**；不写重复论断 |
| 8 | `## 相关阅读` | vault 内 ≥1 反向链 | 用 `vskill-vault-relate` 候选 |
| 9 | `## 来源` | URL / 转写路径 / 版本 | 溯源 |

**禁止**：IBM v1 式「一句话总结 + 思维导图」堆在开头替代「先搞懂」；ASR 顺序逐段摘要。

---

**读完应能解释** — 表格 **三列固定**：

```markdown
## 关键概念（读完应能解释）

| 中文 | 英文 | 白话 |
|------|------|------|
| 安全框架 | Harness / AI agent harness | 模型外让 agent 锚定在可控环境的工程层 |
| 可靠性 | reliability | 黑盒模型怎么变，行为仍可预期 |
```

- **中文**：正文用的说法
- **英文**：素材原词 / 行业叫法（必填，B 档技术词不可空）
- **白话**：一句解读

---

## §小结写法

**位置**：`## 值得记住的原话` 之后、`## 行动启示` 之前。

**结构**（三段，可略调但三块都要有）：

```markdown
## 小结

**这期最核心的判断：** …（1 句，嘉宾/节目立场，可带限定语）

**要点：**
- …（论断 / 洞察，不是操作步骤）
- …
- …

**和 vault 的关系：** …（1 句：接哪条主题线，如 harness / eval / multi_agent）
```

**约束**：

- 不重复 `frontmatter.description` 原文
- 不重复「先搞懂」故事线整段复述——小结是**压缩论断**，故事线是**叙事地图**
- 不用「综上所述 / 总而言之 / 一句话总结」
- 「行动启示」写步骤；「小结」写**你信什么**

---

## 多论文单文件（B4 类）

整篇仍走九段；`## 分话题讲` 内每篇论文一节，节末加：

```markdown
#### 本篇小结

…（2–3 句：这篇论文/这场的核心论断）
```

整篇 `## 小结` 收束五讲的**共同主题 + 各讲一句**。

---

## frontmatter（§3 + 扩展）

```yaml
---
title: "笔记标题"
source: "B站视频 - {频道或节目名}"
source_url: "https://www.bilibili.com/video/BV.../"
speaker: "{嘉宾} / {主持}"   # 能识别则填
duration: "MM:SS"            # plan.json 有则填
saved: YYYY-MM-DD
tags:
  - ai_agent                  # 主 tag，按内容选
  - video_transcript
  - bilibili
  - {细分 tag}
created: YYYY-MM-DD
description: "≤100 字，检索用；不是正文小结"
transcript_source: "Recastory/workspace/bilibili-retranscribe/<BV>/article.md"
asr_version: v2
curate_method: "vskill-vault-curate v3-ingest（讲义 v3）"
spot_check: YYYY-MM-DD          # 可选；≥45 min 且 Spot check 通过后填
---
```

---

## PARA 与目录

| 批次 | 典型目录 |
|------|----------|
| A 组（平台 / harness / skills） | `B站视频知识库/Agent架构与平台/` |
| B 组 eval / 论文 | `B站视频知识库/AI评估与研究/` |
| 行业 / 组织 | `B站视频知识库/行业观点与组织/` |

---

## Lecture 加深要点（2026-07-03 实盘）

无 column 的教程轨，九段 `## 分话题讲` 须补 **可操作细节**（来自 ASR），非概念复述：

| 笔记 | 加深方向 |
|------|----------|
| [[Karpathy爆火项目-AutoResearch解读与启发]] | loop 命令、Colab GPU、9 类用例操作流 |
| [[Agent实战-打造一个AI Agent的完整教程]] | demo1/2/3、MCP/Skill 链、cron |
| [[OpenAI官方-Codex新手教程]] | slash 命令表、config.toml、MCP/exec |
| [[Claude Code实战-构建一个AI数据分析师]] | 种子 SQL、Snowflake CLI、Skills 护栏 |
| [[30分钟精通OpenClaw]] | GCP OAuth、Edge TTS、cron、SOUL 摘录 |

---

## 质量门（收录前自检）

- [ ] 没看视频能否用「先搞懂」故事线复述？
- [ ] 「小结」与「行动启示」是否分工（论断 vs 动作）？
- [ ] 反向链 ≥1，且非凑数（§7）
- [ ] tag 全在 AGENTS.md §4 字典
- [ ] `## 关键概念` 为 **中文 | 英文 | 白话** 三列，B 档英文非空
- [ ] 小结用 **要点**，不用「带走」
- [ ] **≥45 min**：跑 [Spot check SUBDOC](./SUBDOC%20-%20Spot%20check（长视频%20factual）.md)
- [ ] **S 级**：`dialogue_version: v3.2` + `canonical-dialogue` 单篇（见 [v3 工作流 Phase 2S](./SUBDOC%20-%20B站视频%20v3%20工作流.md)）

---

## 关联

- 转写源：Recastory `skills/distill/SKILL.md` Phase D
- 反向链：`vskill-vault-relate`
- MOC：`MOC - Agent Theory and Design` 等（Step 7）
