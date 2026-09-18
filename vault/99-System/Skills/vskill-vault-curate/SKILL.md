---
title: vskill-vault-curate
name: vskill-vault-curate
description: 收录外部内容到 vault；B站默认把用户提供的单篇专栏编译为对谈式、可追溯、可串联的第二大脑上下文。
created: 2026-06-27
updated: 2026-07-13
status: available
version: 0.8
tags:
  - skills
  - vskill
inputs:
  - name: source
    type: string
    required: true
    description: 内容来源（URL / 文件路径 / 文本片段）
  - name: hint_topic
    type: string
    required: false
    description: 主题提示（加速 PARA 决策 + 反向链检索）
  - name: target_para
    type: enum
    values: ["auto", "01-Areas", "02-Resources", "00-Inbox"]
    required: false
    default: "auto"
    description: 输出 PARA 位置（auto = 由内容判断；其他 = 用户指定）
  - name: skip_moc_update
    type: boolean
    required: false
    default: false
    description: 是否跳过 MOC 更新（默认 false，会自动更新）
outputs:
  - name: note
    type: markdown
    description: 完整 vault 笔记（含 §3 frontmatter / §4 tag 字典 / §6 文件名 / §7 反向链）
  - name: report
    type: text
    description: 收录报告（路径 / frontmatter 字段 / 反向链 / MOC 更新）
---

# vskill-vault-curate

> **核心一句话**：把任何外部内容（URL / PDF / 视频 / 公众号 / 截图 / 文本）变成符合 vault 规范的笔记——从"看过的内容"到"vault 内可检索可链接可讨论的资产"。
>
> **借鉴来源**：wiki-ingest 8 步工作流 + kimi-webbridge 浏览器抓取（工具链引用）+ AGENTS.md §8 SOP 7 步
>
> **IRON LAW**：**One source = one canonical context note.** 来源笔记保留完整语境；跨来源概念进入候选，不自动制造碎片卡片。

## 何时使用

✅ **使用**：
- 用户说"收录这篇到 vault" + 链接
- 用户给一段文字 / 截图 / PDF，要求转笔记
- 用户粘贴一段微信 / 知乎文章，要求收录
- 平时看到值得留的内容（agent 主动建议："要收录吗？"）

❌ **不使用**：
- vault 内已有相关笔记——用 `vskill-vault-relate`（计划中）找反向链，或用 `vskill-vault-discuss` 跨笔记讨论
- 用户要"基于知识库写文章"——用 `vskill-vault-write`
- 用户要"对比已有笔记"——用 `vskill-vault-discuss`
- 内容质量太低 / 已过期 / 与 vault 主题不符——拒绝收录并说明理由

## 工具链（Step 2 抓内容用）

按可用性优先级排序，**自动降级**：

### Tier 1：kimi-webbridge（首选，**带登录态**）

**适用场景**：公众号、知乎、X、LinkedIn 等需登录站 + 任何 JS-heavy 站

```bash
# 健康检查（必须先做）
~/.kimi-webbridge/bin/kimi-webbridge status

# 三步走
SESSION="vault-curate-$(date +%Y%m%d)-{topic-slug}"

# 1. 导航
curl -s -X POST http://127.0.0.1:10086/command \
  -H 'Content-Type: application/json' \
  -d "{\"action\":\"navigate\",\"args\":{\"url\":\"$URL\",\"newTab\":true,\"group_title\":\"vault 收录 $TOPIC\"},\"session\":\"$SESSION\"}"

# 2. 拿 a11y 树
curl -s -X POST http://127.0.0.1:10086/command \
  -d "{\"action\":\"snapshot\",\"args\":{},\"session\":\"$SESSION\"}"

# 3. 留档 PDF
curl -s -X POST http://127.0.0.1:10086/command \
  -d "{\"action\":\"save_as_pdf\",\"args\":{\"path\":\"00-Inbox/raw-$TOPIC-$DATE.pdf\",\"paper_format\":\"a4\"},\"session\":\"$SESSION\"}"

# 4. 完成后 close_session
curl -s -X POST http://127.0.0.1:10086/command \
  -d "{\"action\":\"close_session\",\"args\":{},\"session\":\"$SESSION\"}"
```

**完整 12 个工具**（navigate / find_tab / snapshot / click / fill / evaluate / screenshot / network / upload / save_as_pdf / list_tabs / close_*）+ 健康检查降级表：见 kimi-webbridge SKILL 原文（不进 vault）。

### Tier 2：webfetch（备选，无登录）

**适用场景**：公开可访问的网页（不需登录 + 无 JS-heavy 渲染）

```bash
# 直接拉 markdown
# webfetch 工具，URL → markdown
```

**降级触发**：kimi-webbridge 不可用（`running: false` 或 `extension_connected: false`）→ 自动切 webfetch。

### Tier 3：pdftotext（本地 PDF 处理）

**适用场景**：用户给的 PDF 文件

```bash
pdftotext input.pdf output.txt
# 然后清理 UI 噪声（页眉 / 页脚 / 页码）
```

### Tier 4：用户粘贴（兜底）

**适用场景**：所有自动抓取失败 / 内容已离线

直接用用户粘贴的文本作为 source。

## 工作流（7 步 = AGENTS.md §8 SOP）

> 本节受 `99-System/Agent/INGEST-CONTRACT.md` 约束。用户提供 B站 opus/cv 时必须先读 `SUBDOC - B站图文专栏精华收录.md`，使用 `bilibili_opus_ingest_v2`；不扫描空间、不读图片、不进入 ASR。历史 Recastory/ASR 核验按 Legacy 索引加载。

### Step 1：收素材

- 确认输入：`source`（URL / 文件路径 / 文本片段）
- 评估内容质量（用 v0.2 后加的"质量门"前判）：
  - ❌ 太短（< 500 字）→ 不收录，建议进 Inbox 待观察
  - ❌ 纯新闻 / 教程截图 / 纯代码片段——AGENTS.md §1 已明确**不收录**
  - ❌ 与 vault 主题（AI Agent 时代 ≥ 80%）不符 → 拒绝并说明
  - ✅ 否则进入 Step 2

### Step 2：抓内容

按 Tier 1-4 自动降级：

1. 试 kimi-webbridge（首选）
2. 失败 → webfetch（公开网页）
3. 失败 → pdftotext（PDF）
4. 失败 → 用户粘贴兜底

**清理 UI 噪声**（必经步骤）：
- 删页眉 / 页脚 / 页码
- 删"相关推荐" / "评论区" / "关注我们"
- 删广告 / 弹窗 / 浮窗
  - 保留：标题 / 作者 / 发布时间 / 正文
  - B站专栏图片全部跳过，不读取、不识别、不下载

### Step 3：选位置（PARA 决策）

按 AGENTS.md §2 PARA 目录：

| 内容类型 | 选位置 | 理由 |
|---|---|---|
| 长期主题笔记 / 跨笔记共用的核心概念 | `01-Areas/{主题}/` | §1 主题定位：长期关注 |
| 参考资料 / 公众号 / 视频 / 论文 / 培训课程章节 | `02-Resources/{主题}/{形态}/` | §2 PARA 定义：参考资料 |
| 一过性 / 待处理 / 临时归档 | `00-Inbox/` | §9 维护原则 |
| 已不关注 / > 1 年未更新 | `03-Archive/` | §9 归档触发 |

**自动判断**（按 `hint_topic` + 内容关键词）：
- 命中"AI Agent 时代"主 tag → `02-Resources/AI and Agents/` 子目录
- 命中"哲学 / 自我认知" → `02-Resources/哲学与自我认知/`
- 否则 → `00-Inbox/`（让用户后续决策）

### Step 4：写 frontmatter（§3 5 字段）

```yaml
---
title: "{原文标题（≤ 50 字符，按 §6）}"
tags:
  - {主 tag from §4}
  - {形态 tag: article / video_transcript / podcast / course / notes}
  - {来源 tag: wechat / zhihu / bilibili / youtube / podcast_rss / pdf}
  - {细分 tag from §4，如 harness_engineering / loop_engineering}
created: {YYYY-MM-DD 收录日期}
source: "{URL 或文件路径；多源用 YAML 列表}"
description: "{一句话摘要，≤ 100 字}"
author:
  - "[[{作者}]]"  # 多作者用 YAML 列表
---
```

**强制项**：
- ✅ `title` / `tags` / `created` / `source` / `description`（5 字段齐）
- ✅ `tags` 全从 §4 字典选
- ✅ 新 tag 必须登记 `tags_pending`（3 个月未审核自动失效）

### Step 5：打 tag（§4 字典）

按优先级选 tag：

1. **主 tag（一级）**：必含至少 1 个
   - `ai_agent` / `ai_coding` / `ai_evaluation` / `ai_safety` / `ai_career` / `ai_philosophy`
2. **形态 tag（二级）**：必含 1 个
   - `article` / `video_transcript` / `podcast` / `course` / `moc` / `notes`
3. **来源 tag（三级）**：如有可见来源
   - `wechat` / `zhihu` / `bilibili` / `youtube` / `podcast_rss` / `pdf`
4. **细分 tag**：按内容关键词命中
   - `harness_engineering` / `memory` / `multi_agent` / `context_engineering` / `skills` / `hooks` / `mcp` / `prompting` / `fde` / `loop_engineering` ...

**新 tag 申请**：
- 若无字典命中，写 `tags_pending` 区登记（如 `loop_engineering` 登记示例）
- **不要直接创造新 tag**，先走登记流程

### Step 6：找反向链（§7 强制 ≥ 1）

B站 S级来源笔记不能只放裸链接。候选必须归入“支持、补充、反驳、限制、依赖、应用于、示例”之一，并用一句话解释具体关系；找不到则标 orphan。

两条路并行：

#### 路 A：主题检索（vault 内已有哪些相关笔记）

```bash
grep -ril "{topic}" 01-Areas 02-Resources 99-System
glob "**/*{topic}*.md"
```

#### 路 B：MOC 入口破孤

若 vault 内已有相关 MOC（如 `MOC - Harness Engineering`），把新笔记加入该 MOC 索引。

**评估候选反向链**（按 wiki-ingest 风格）：
- 候选笔记将作为反向链的，**只有当它会被新笔记引用时**才选
- 不引用 = 不链（避免凑数，AGENTS.md §7 反模式）

**强制项**：
- ✅ ≥ 1 个相关反向链（被 MOC 链入也算破孤）
- ❌ 找不到 → frontmatter 加 `status: orphan` + 在笔记文末说明

### Step 7：更新 MOC

**判断是否新建 MOC**（AGENTS.md §5）：
- 同主题 ≥ 3 篇笔记 + 跨子目录 → 触发 `vskill-vault-moc-builder` 评估（**不自动建**，需用户确认）

**已存在 MOC**：自动更新索引
- 加新笔记条目（带 1 行说明）
- 更新"总笔记数" + "最后更新"日期
- 更新版本号（按 §5 维护原则）

**没有 MOC**：跳过（避免擅自创建结构）

### Step 8：报告

向用户报告：

```
✅ 收录完成

📄 路径：{相对路径}
📅 日期：{YYYY-MM-DD}

frontmatter：
  title: {title}
  tags: {N} 个（{tag1, tag2, ...}）
  source: {URL 或文件路径}
  description: {desc}

反向链：{N} 个
  - [[笔记 1]] — {一句话}
  - [[笔记 2]] — {一句话}

MOC 更新：{已加入 MOC} 或 {无相关 MOC}

附件：{raw PDF 路径或无}

⚠️ {任何未解决的项}
```

机器可读报告必须使用 `workflow: vault_ingest_v2`，并包含 `checks`、`unresolved` 与 `status`。`unresolved` 非空默认不得标记 complete。

## ASCII 约束（图表用）

所有图用纯 ASCII。允许字符集：字母、数字、中文、空格、`- = | + * / \ < > ^ v [ ] ( ) { } . , : ; _ #`。禁止 Unicode 绘图符号（→ ← ┌─┐ ● ◆ 等）。

## 约束

- ❌ **不杜撰**：笔记内容严格基于 source，不补不删关键信息
- ❌ **不创建 MOC**：自动收录不擅自建 MOC（≥ 3 篇触发 `vskill-vault-moc-builder`）
- ❌ **不凑 tag**：tags 必须有内容支撑
- ❌ **不凑反向链**：无相关 → `status: orphan`，不强凑
- ❌ **不重复收录**：检测 vault 是否已有同 source 的笔记
- ✅ **必填 frontmatter 5 字段**
- ✅ **必填反向链 ≥ 1** 或 `status: orphan`
- ✅ **必从 §4 字典选 tag**，新 tag 走 `tags_pending` 登记
- ✅ **中文母语化**：应用 `99-System/Agent/DENSITY-PROFILE.md`（信息保留 + 反翻译腔 + 朗读关）

## 例子

**输入**：
```yaml
source: "https://mp.weixin.qq.com/s/xxxxx"
hint_topic: "Agent Loop Engineering"
target_para: "auto"
```

**预期行为**：

1. **收素材**：URL 形式，公众号
2. **抓内容**：
   - kimi-webbridge 优先（公众号需登录）
   - 降级 webfetch 备选
   - 留档 PDF：`00-Inbox/raw-agent-loop-engineering-20260701.pdf`
3. **选位置**：`02-Resources/AI and Agents/Agent Design & Patterns/Agent Loop Engineering 公众号-{作者或匿名}-20260701.md`
   - 主 tag 命中 `ai_agent` + 细分 `loop_engineering`
   - 形态 `article` + 来源 `wechat`
4. **frontmatter**：5 字段齐
5. **反向链**（vault 内已有）：
   1. [[Loop Engineering 橙皮书 - 花叔]]
   2. [[遇事留痕 - Loop Engineering 的基础 - 魔术师卡颂]]
   3. [[MOC - Harness Engineering]]
6. **MOC**：自动加入 `MOC - Harness Engineering`
7. **报告**：路径 + frontmatter + 反向链 + MOC 更新

## 子文档（按内容形态）

| 文档 | 适用 |
|------|------|
| **[SUBDOC - B站图文专栏精华收录.md](./SUBDOC%20-%20B站图文专栏精华收录.md)** | **新 B 站收录唯一入口**：用户给单篇 opus/cv · 精华提炼 · 图片跳过 |
| [LEGACY - B站 ASR 与 Recastory.md](./LEGACY%20-%20B站%20ASR%20与%20Recastory.md) | 历史笔记核验；不用于新收录 |
| [SUBDOC - ASR内容分轨与收录决策.md](./SUBDOC%20-%20ASR内容分轨与收录决策.md) | Legacy ASR 双轴入口 |
| [SUBDOC - B站视频 v3 工作流.md](./SUBDOC%20-%20B站视频%20v3%20工作流.md) | v4 执行细节：动态发现 + 双轴分类 + 校验 |
| [SUBDOC - B站视频转写收录.md](./SUBDOC%20-%20B站视频转写收录.md) | **lecture 形态**：知识依赖讲义 + 概念三列 + 简介抓取 |
| [SUBDOC - ASR后处理与manifest.md](./SUBDOC%20-%20ASR后处理与manifest.md) | Recastory 侧：manifest、asr v2 后处理 |
| [SUBDOC - Spot check（长视频 factual）.md](./SUBDOC%20-%20Spot%20check（长视频%20factual）.md) | ≥45 min factual 对读 |
| [SUBDOC - Host-Guest 对谈稿.md](../vskill-vault-write/SUBDOC%20-%20Host-Guest%20对谈稿.md) | **dialogue 形态**：真实或明确标注重构的 canonical 对谈 |

B站新收录：**先读图文专栏 SUBDOC v2** → 查重 → Pass 1 → 声音归属 → 对谈规划 → 类型化知识连接 → 专栏验证器。图片、transcript 与 Recastory 跳过；ASR 只用于历史核验。

**访谈 / 对谈公众号**：Step 2 抓内容后，若用户要 Founder Park 式对话体 → 转 `vskill-vault-write mode=dialogue`（读 Host-Guest SUBDOC），勿默认压成第三人称讲义。

## 关联

- 上游：用户原始素材（URL / 文件 / 粘贴）
- 下游：
  - `vskill-vault-write`（基于新笔记写衍生）
  - `vskill-vault-discuss`（基于新笔记讨论）
  - `vskill-vault-moc-builder`（≥ 3 篇同名主题触发）
  - `vskill-vault-relate`（available，自动反向链建议）
- 索引：[INDEX.md](../INDEX.md)
- 协议：[AGENTS.md](../../../AGENTS.md) §3 / §4 / §5 / §6 / §7 / §8 / §10
- 借鉴：
  - [wiki-ingest](https://github.com/hoye-skills/skill-collection/learning/wiki-ingest) 知识库编译
  - [kimi-webbridge](https://github.com/hoye-skills/skill-collection/agent/kimi-webbridge) 浏览器抓取（工具链引用，不复制 SKILL.md）
