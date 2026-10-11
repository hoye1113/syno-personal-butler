---
title: ljg-writes - 汪曾祺与阿城笔调纯正中文写作引擎
tags:
  - Skill/Writing
  - LiJigang
  - ChineseProse
  - AntiAITaste
  - WritingCraft
date: 2026-10-11
status: canonical
category: Agent Skills
source_url: local:skill-collection/dev-workflow/ljg-skills/skills/ljg-writes
summary: 李继刚专治 AI 腔的中文写作引擎，内嵌“五刀 + 三道磨”工序，汲取汪曾祺、阿城、王小波纯正母语笔调，将观点打磨成 1000-1500 字逻辑递进、经得住反例检验的骨感中文。
---

# ljg-writes — 汪曾祺与阿城笔调纯正中文写作引擎

> **核心哲学**：*“中国话有中国话的骨气与筋道。不要写连篇累牍的翻译腔从句，不要堆砌毫无痛痒的四字成语，更不要用‘在当今时代’开篇。学汪曾祺的白描、学阿城的静水深流、学王小波的明澈反讽。五刀剁掉废肉，三道细磨去浮光，把一句话说到骨头里！”*

---

## 一、What：它能做什么

`ljg-writes`（代号：**写作引擎**）是李继刚体系中专治中文大模型“AI 塑料味、假大空与翻译腔”的深度文本锻造模具。它致力于产出 1000~1500 字高密度、可迁移、经得住反例的纯正中文散文/杂文：

1. **核心文风基调（Stylistic Root）**：
   - 彻底摒弃“欧化中文”长从句与公关腔；
   - 借鉴**汪曾祺**（语言极简，充满物候观察与生活真趣）、**阿城**（字字千钧，白描入骨，不动声色）、**王小波**（理性的诚实与智慧的反讽）、**李娟**（粗砺而真实的旷野生命力）；
2. **“五刀”剁除废词工序（The Five Knives）**：
   - **第一刀：砍连词**（删掉所有的“不仅...而且...”、“虽然...但是...”、“毫无疑问”）；
   - **第二刀：砍副词**（删掉所有的“极其”、“非常”、“十分”、“深度”）；
   - **第三刀：砍抽象大词**（把“赋能”、“生态”、“闭环”、“维度”替换为具体人做具体动作）；
   - **第四刀：砍假升华**（删掉结尾空洞无物的“让我们共同期待未来”）；
   - **第五刀：砍长从句**（凡超过 25 个字的句子，强制拆成带逗号或句号的短句）；
3. **“三道磨”反例检验（The Three Whetstones）**：
   - **第一磨（自相矛盾磨）**：观点是否在另一极端情况下自行崩溃？
   - **第二磨（历史反例磨）**：历史上是否出现过反常事件击穿当前逻辑？
   - **第三磨（大声朗读磨）**：大声念出来，气口是否顺畅？有没有绊嘴的假话？

---

## 二、Why：为什么强模型时代必收此技能

### 1. 痛点：大模型中文写作的“均质化与油腻感”
通用 LLM 训练语料充斥着海量的微信营销号、企业公关稿、翻译论文与网文，导致模型一开口就是标准的“AI 腔”：
- 结构套路化：总分总、排比三段论；
- 语言假大空：看似四平八稳，实则毫无信息增量；
- 读完之后像吃了一口毫无味道的塑料泡沫。

### 2. 现代 Harness 范式：纯正母语语感与负向红线
`ljg-writes` 不靠死板的长文模板，而是用极强的**文风负向红线与大师语感**锁死模型的输出分布：
- 强制模型使用干净利落的主谓宾短句；
- 要求用动词和名词推着读者往前走，尽量少用形容词；
- 赋予文字如同汉砖石刻一般的拙朴美感。

---

## 三、How：核心心智模具与提示规范

### 1. 核心文风提示模具

```markdown
Tone: Wang Zengqi (汪曾祺) meets Ah Cheng (阿城).
Language: Native, muscular, bone-clean Chinese. Zero translationese.

Writing Protocol:
1. USE SHORT SENTENCES. Break any sentence longer than 20 characters into rhythmic cadence.
2. KILL THE FLUFF. Purge all: "毫无疑问", "显而易见", "赋能", "闭环", "在这个快速发展的时代".
3. PHYSICAL VERBS OVER ABSTRACT NOUNS. Write what hands do and what eyes see.
4. EMBRACE COUNTEREXAMPLES. A strong statement must withstand at least one brutal edge case.
5. SINCERITY. If something is painful, say it's painful. Don't smooth it over with diplomatic corporate optimism.
```

### 2. 改写对照范例

| 典型 AI 油腻句子 | `ljg-writes` 锻造后的纯正中文 |
|---|---|
| “在当今数字化浪潮下，AI 正全方位赋能知识工作者，实现效率的跨越式跃迁。” | “机器越来越聪明。人在屏幕前坐着，手心出汗。活儿干得快了，心却空了。” |
| “我们必须深刻认识到，这一决策不仅关乎业务成败，更关乎团队未来的长期发展空间。” | “这一步走错，账上的钱撑不过冬天。散伙是迟早的事。” |

---

## 四、管家系统落地与实战转化建议

1. **专治管家对外发文与邮件的 AI 味**：
   - 当主人让管家起草公开博客、朋友圈长文或重要回信时，挂载 `ljg-writes` 心智，确保输出的文章具有极高的人类温度与审美辨识度；
2. **配合 khazix-writer（卡兹克）形成长短双峰**：
   - 公众号深度行业叙事用 `khazix-writer`（活人感与故事质感），精炼思想短文与杂感用 `ljg-writes`（阿城式白描入骨）。

---

## 五、关联卡片

- [[MOC - Agent Skills 武器库]]
- [[ljg-suite - 李继刚认知与思想铸造全景套件]]
- [[ljg-card - 思想铸卡与老宋体视觉排版]]
- [[khazix-writer - 数字生命卡兹克公众号长文写作心智]]
