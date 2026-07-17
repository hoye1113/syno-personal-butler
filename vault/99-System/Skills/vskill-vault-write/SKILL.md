---
title: vskill-vault-write
name: vskill-vault-write
description: 基于 vault 已有笔记或访谈素材写观点文、真实对谈或明确标注的编辑重构对谈；保留声音归属、限制和类型化知识连接。
created: 2026-06-27
updated: 2026-07-13
status: available
version: 0.6
tags:
  - skills
  - vskill
inputs:
  - name: viewpoint
    type: string
    required: false
    description: blade 模式必填——一个观点（判断 / 断言 / 反直觉洞察）；dialogue 模式不需要
  - name: target_para
    type: enum
    values: ["01-Areas", "02-Resources", "00-Inbox"]
    required: false
    default: "01-Areas"
    description: 输出 PARA 位置（blade 默认 Areas；dialogue 收录访谈通常 02-Resources）
  - name: anchor_notes
    type: list
    required: false
    description: vault 内 2-5 篇相关笔记（已检索好的源材料），可由 vskill-vault-discuss 输出
  - name: style
    type: enum
    values: [oral, concise, academic, mixed]
    required: false
    default: mixed
    description: 风格（oral 公众号 / concise 古文 / academic 学术 / mixed 混合——默认按 vault 现有风格画像）
  - name: mode
    type: enum
    values: [blade, dialogue]
    required: false
    default: blade
    description: blade=5步切刀观点文；dialogue=Host/Guest 对谈稿（读 SUBDOC - Host-Guest 对谈稿.md）
  - name: host_name
    type: string
    required: false
    description: 对谈稿模式：提问者名（如 Lenny）
  - name: guest_name
    type: string
    required: false
    description: 对谈稿模式：受访者名
  - name: guest_title
    type: string
    required: false
    description: 对谈稿模式：受访者一句话身份
  - name: raw_transcript
    type: string
    required: false
    description: 对谈稿模式：访谈全文/转写（可与 source URL 二选一）
  - name: chapter_count
    type: number
    required: false
    default: 4
    description: 对谈稿模式：章节数（默认 4）
outputs:
  - name: note
    type: markdown
    description: 完整 vault 笔记（含 §3 frontmatter 5 字段、§4 tag 字典、§6 文件名、§7 反向链、§5 MOC 更新）
---

# vskill-vault-write

> **核心一句话**：两种模式——**blade** 对准一个观点下刀；**dialogue** 用 3–6 个独立问题保留人物声音、机制、案例和边界。
>
> **借鉴来源**：ljg-writes 写作引擎 + Founder Park 式对谈稿形态（见 SUBDOC）

## 何时使用

✅ **blade 模式**：
- 用户说"基于知识库写一篇关于 X 的笔记"
- 用户给一个观点 / 一句断言 / 一个反直觉洞察，要 vault 出产一篇
- `vskill-vault-discuss` 输出后，用户说"把这份讨论写成笔记"

✅ **dialogue 模式**（`mode: dialogue`）：
- **无专栏 B 站 ASR / Recastory 访谈** → 先读 [ASR 分轨决策 SUBDOC](../vskill-vault-curate/SUBDOC%20-%20ASR内容分轨与收录决策.md) §无专栏 SOP，再读 [Host-Guest 对谈稿](./SUBDOC%20-%20Host-Guest%20对谈稿.md)
- 用户要 **Founder Park / Lenny 式** 对话体，不要第三人称摘要
- 素材是播客转写、访谈译稿、Host-Guest 公众号
- `vskill-vault-curate` 双轴分类为 `content_form: dialogue`，且用户要保留真实问答或明确标注的编辑重构

❌ **不使用**：
- 用户要"搜索 X 笔记"——用 `vskill-vault-discuss` 或 grep
- 用户要"收录"且未要求对谈体——用 `vskill-vault-curate`（讲义/默认 article）
- 用户要"对比 A 和 B"——用 `vskill-vault-discuss`
- blade：笔记无观点、纯描述型

## 模式选择

| mode | 输入 | 输出 | 文档 |
|------|------|------|------|
| `blade`（默认） | `viewpoint` + `anchor_notes` | 1000–1500 字观点文 | 下文「5 步切刀」 |
| `dialogue` | 专栏、访谈或转写 + 人物元数据 | 3–6 个独立问题 + 限制 + 知识连接 | [Host-Guest](./SUBDOC%20-%20Host-Guest%20对谈稿.md) |

**dialogue 执行顺序**：读 SUBDOC → Pass 1 声音与保留清单 → 规划 3–6 个独立问题 → 写对谈 → 保留限制 → 建类型化知识连接 → 质量门。

**IRON LAW（dialogue）**：Guest 正文禁止「他表示 / 她认为」式摘要；数字与原话金句保留，英译中须口语化。

真实专栏问答写 `source/column`；历史转写问答写 `source/transcript`；编辑重构写 `reconstructed/editorial`。不得把“编者问”描述成现场主持人，也不得把 `editorial_summary` 写成真实人物直接引语。

**密度铁律**：先建立 Pass 1 保留清单，逐项保住主张、机制、数字、案例、限制和关键原话。成稿显著短于来源只触发复核，不以固定字数比例代替内容验收。

## 姿态

外科医生的手，朋友的口。下刀时冷静、精准、不抖；讲话时平常、直接、不绕。

- 心里放一个具体的人，写给他，不写给"读者们"
- 先亮自己的弯路，再给方向——说服力来自你先错过
- 不确定就说不确定。"大概 70%" 比 "可能" 诚实
- 不借势：不用群体代言（"程序员都知道"），不编造经历，不用元评论（"接下来我们讨论"）
- **不自标深度**：禁用"再深入一层""最深的一层是""更深地说"这类宣告。深入是思考行为本身——下一句的内容让读者自己感到"原来不止这样"。说"我要深入了"反而把深入戳破了

## 语言

简洁、直白、质朴。

- 能两个字说的不用四个字。"进行讨论"→"聊"，"实现功能"→"做到"
- 每个动词是一次判断。"放""搁""摆"不是一回事
- 砍：机械连词（"此外""另外"）、形容词通胀（"非常重要的关键"→"关键"）、软化词（"某种程度上""值得注意的是"）
- 翻译腔免疫：这句翻回英文再翻回中文，还是原样吗？是→八成翻译腔，重写
- 计算机体系是母语。缓存、调度、编译、虚址——需要时用，像呼吸，不像引用
- 同一种句式全文最多一次

## ASCII 约束

所有图表用纯 ASCII 字符。允许：`+ - | / \ > < v ^ * = ~ . : # [ ] ( ) _ , ; ! ' "` 和空格。禁止 Unicode 绘图符号（→ ← ┌─┐ ● ◆ 等）。

## 过程

### blade：5 步切刀

边想边写。每一步既是思考，也是段落。

### 一、把观点放到台面上

一句话写清它。不模糊、不铺垫、不"自古以来"。

写不清 → 还没想清。回去想，再下刀。

### 二、切第一刀

问：它说的是什么？它底下是什么？

三种切法：
- **反问**：这个观点成立的前提是什么？前提塌了它还在吗？
- **追问**：它为什么是这样？机制在哪？
- **翻转**：大家以为是 A——如果其实是 B 呢？

这一刀要切出一个读者没看见的层。读者的感受：小小的"原来不止这样"。

**vault 锚定**：第一刀必须能 wikilink 到至少 1 篇 `anchor_notes` 的具体观点。引用形式：`> [[笔记标题]] §小节说："..."`

### 三、切第二刀

刚剖出的那层，再往下一层。

- 不重复第一刀——那样是绕圈，不是深入
- 这层通常更抽象——用一个具体画面扳回来，别飘
- 应该有反直觉——读者心里说"等等，这意味着……"

### 四、切到底

再问，再剖，直到切不动。

切不动有两种：
- 挖到一个不能再分的事实 → 这就是底
- 挖到自己也不确定 → 诚实说不确定，这也是一种底

底那里常有一个反直觉的收获。读者到这里如果"原来如此"，这篇就值了。

### 五、合起来看

从底回看第一步那句话。

它还站着吗？——站着但变硬了、或变形了、或透了。说清楚这个变化。

结尾 **不总结**。最后一句是最后一个发现，或一扇门——短，有节奏，能留在脑子里。

总量：1000-1500 字。少于 1000 → 没挖够；多于 1500 → 没砍够。

### dialogue：对谈稿

**不执行切刀**。完整规范见 [SUBDOC - Host-Guest 对谈稿.md](./SUBDOC%20-%20Host-Guest%20对谈稿.md)。摘要：

1. 开场（人物、主题与核心问题）
2. 3–6 个独立问题：Host/编者问 → Guest/专栏整理答
3. 限制与边界 + 类型化知识连接 + 来源说明
4. 过 SUBDOC 质量门 + §10 朗读关
5. **B 站 S 级**：落盘 **`{主题}.md` 单篇 canonical**（正文对谈 + `## 附录`）；勿另建 `- 对谈稿.md`
6. 概念表、小结、金句和讲义索引均按知识增量选用，不作为固定模板

## 写作手法（blade 随时可用）

- **场景代替论证**：不说"这是错的"，造一个场景让读者自己看到它错
- **让步弯道**：最强势的判断之后踩一脚刹车。"话说回来""别误会"——承认对面有道理，然后再断言
- **反问入链**：遇到隐含前提，用一个问题打开。"但等一下——如果真是这样，为什么……？"然后回答它
- **探索性语气**："X 看起来是一回事，但如果你……等等，这意味着 Y。"读者跟你走到结论，不是被你告知
- **短句做锤子**："就这样。""没了。"整篇最多两三处，不能连敲

## 磨（5 步自查清单）

初稿出来后，**强制过**：

1. **口语检验**：逐段读。你会这样跟聪明朋友说吗？不会 → 改
2. **AI 痕迹过滤**：拐杖词、宣传腔、夸大象征（"标志着""见证了""充满活力"）全删
3. **反风格**：
   - 在解释？→ 换一个看得见的场景
   - 在罗列？→ 砍到只留最狠的一个
   - 在全面覆盖？→ 一篇只说一个点
   - 同一论点出现两次？→ 改第一次，删第二次
   - 在宣告深度（"再深入一层""最深的一层是""更深地说"）？→ 删掉宣告，让下一句内容自己显出深度
   - 任何助手都写得出的句子？→ 改或删
4. **意外检验**：写这篇时你发现了什么自己之前没想到的？有 → 它在文中够显眼吗？没有 → 回去切，切得不够狠
5. **vault 协议门**：
   - [ ] frontmatter 5 字段（§3）：title / tags / created / source / description
   - [ ] tags 全从 §4 字典选；新 tag 走 `tags_pending` 登记
   - [ ] 文件名按 §6（中英混排 + `-` 或空格分隔，≤ 50 字符）
   - [ ] 反向链 ≥ 1（§7）—— 必含至少 1 个 `anchor_notes` wikilink
   - [ ] 已被相关 MOC 链入（§5）

## 最高法则

你会这样跟一个聪明的朋友说话吗？不会 → 改到会。

这条覆盖一切。过不了这关，回退。

## 中文重写

初稿完成后，合上它，用中文读者的眼睛再写一遍——不是翻译，是重写。

- 从句拆开，嵌套展平
- 主语不必逐句给，汉语靠意合
- 节奏、对仗、四字短语：该用就用，不要回避
- 一个意思，挑中文里最自然的那种说法

两稿并看，挑更好的那句。

## 输出格式

按 AGENTS.md §3 frontmatter 模板 + §6 文件名规范 + §7 反向链强制：

```markdown
---
title: "{观点凝练 6-15 字}"
tags:
  - {主 tag from §4}
  - {细分 tag from §4}
  - article  # 或 notes
created: {YYYY-MM-DD}
source:
  - "[[{anchor_note_1}]]"
  - "[[{anchor_note_2}]]"
description: "{一句话摘要，不超过 100 字}"
author:
  - "[[{作者}]]"
---

# {观点凝练}

> 一句话核心（与 §3 title 呼应）

## {小节 1（按"五件活"自然命名，不预设固定标题）}

{正文，1000-1500 字}

## {小节 2}

{正文}

...

## 相关阅读

- [[{anchor_note_1}]] — {一句话说明它如何支持本文观点}
- [[{anchor_note_2}]] — {一句话}
- [[MOC - {相关主题}]] — {MOC 入口，破孤}
```

## 例子

**输入**：
```yaml
viewpoint: "Harness 的本质不是工具集，而是约束的可见性"
anchor_notes:
  - "[[2026 年 Agent 最重要的工程概念 Harness Engineering]]"
  - "[[IBM团队-Harness工程详解]]"
  - "[[祝贺Claude Code成功越狱，获得永生]]"
style: mixed
target_para: "01-Areas"
```

**预期行为**：
1. 观点上台："Harness ≠ 工具集，Harness = 约束的可见性"
2. 第一刀（反问）：如果 Harness 只是工具集，OpenAI 实验为啥要 5 个月 0 人工？——那不是工具集，是约束工程
3. 第二刀（追问）：约束如何"可见"？→ doc-gardening（文档是约束的镜子）+ linter（约束的强制执行）+ 黄金原则（约束的元规则）
4. 切到底：到底层是"人不再相信 AI 会自动变好，要靠人持续维护约束"——这是 Loop Engineering 的根源（"系统需要被持续维护，不能一次性造好"）
5. 合起来：Harness 不是给 AI 加能力，是给 AI 加边界。能力 = AI 自己的事；边界 = Harness 的事
6. 反向链：3 篇 anchor + 1 个 MOC
7. 报告路径

## 约束

- ❌ 不引用 vault 外的笔记（除非 anchor_notes 明确包含）
- ❌ 不用未来时态描述已发生的事（"将要改变"→"正在改变"）
- ❌ 不用群体代言（"大家都知道"→"我看到的"）
- ✅ 所有"引述"必须 wikilink 追溯
- ✅ 1000-1500 字是硬约束
- ✅ 反向链必填，缺则加 `status: orphan`

## 关联

- 子文档：[SUBDOC - Host-Guest 对谈稿.md](./SUBDOC%20-%20Host-Guest%20对谈稿.md)（dialogue 模式）
- 上游：`vskill-vault-discuss` 的输出；`vskill-vault-curate` 的访谈转写
- 下游：`vskill-vault-curate`（自动把新笔记加入 MOC）
- 索引：[INDEX.md](../INDEX.md)
- 协议：[AGENTS.md](../../../AGENTS.md) §3 / §4 / §6 / §7 / §10
- 借鉴：[ljg-writes](https://github.com/ljg-skill-collection) 写作引擎
