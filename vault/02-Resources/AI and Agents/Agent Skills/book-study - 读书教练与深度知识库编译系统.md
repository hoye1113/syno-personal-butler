---
title: book-study - 读书教练与深度知识库编译系统
tags:
  - Skill/Learning
  - Agent/Coach
  - SpacedRepetition
  - KnowledgeCompilation
date: 2026-10-11
status: canonical
category: Agent Skills
source_url: local:skill-collection/learning/book-study
summary: 系统化读书教练与外脑编译系统，以“解释+案例+迁移才算掌握”为硬核铁律，支持逐章精读、知识编译入库、间隔重复复习与跨书概念对比。
---

# book-study — 读书教练与深度知识库编译系统

> **核心哲学**：*“走马观花式的阅读只是认知安慰剂。不要以为在书上画了高亮就是自己的知识——理解的唯一证据是：你能用自己的话解释清楚、能举出全新反例、能迁移应用到实际决策中。把一本书当成一个可编译的外脑知识库来读！”*

---

## 一、What：它能做什么

`book-study` 是一个面向**深度阅读与个人终身学习**的系统化读书教练。它彻底颠覆了“AI 自动总结一本书发给我看”的被动学习方式，将书籍学习拆解为严密的编译、掌握度检验与知识关联工程：

1. **结构化外脑编译（Knowledge Compilation）**：
   - 自动在当前工作区生成 Obsidian 兼容的双链知识体系 `book-wiki/<book-slug>/`；
   - 自动沉淀：元数据 `meta.md`、学习计划 `study-plan.md`、掌握度地图 `mastery-map.md`、分章摘要、核心概念库 `concepts/`、案例模型 `models/` 与名言金句；
2. **掌握度非协商铁律（The Iron Law of Mastery）**：
   - **铁律**：绝不因用户回复了一句“我看懂了”或“明白了”就标记为掌握！
   - 必须通过**“用自己的话清晰表述 + 举出自己的真实案例 + 给出业务迁移场景”**三道检验，才更新掌握度地图；
3. **间隔重复复习机制（Spaced Repetition Review）**：
   - 内置艾宾浩斯复习算法，通过 `/book-study review` 自动捞出处于遗忘临界点的概念进行抽测；
4. **跨书概念网状链接（Cross-Book Synthesis）**：
   - 在 `cross-book/` 目录下聚合跨越不同书籍的共享概念（例如塔勒布的“反脆弱”与查理芒格的“逆向思维”对比），自动建立 `[[cross-book/concepts/xxx]]` 双向链接。

---

## 二、Why：为什么强模型时代必收此技能

### 1. 痛点：信息过载时代的“浅阅读通胀”
随着 LLM 能力普及，市面上充斥着“3 分钟读完《思考，快与慢》”、“一文看懂《国富论》”的浅薄总结。这种速成法只提供瞬时多巴胺，读者不仅没有建立长期记忆，更无法在实际工作中调用这些思维模型。

### 2. 现代 Harness 范式：编译型阅读与主动检索（Active Recall）
`book-study` 建立了极佳的学习脚手架：
- **模型当教练（Coach Stance）**：负责出题检验、设卡挑战、记录日志；
- **人类当学生（Active Learner）**：负责费力提取记忆、自我表达；
- **磁盘当外脑**：对话随风而逝，但 `book-wiki/` 的双向链接卡片永久沉淀。

---

## 三、How：核心交互指令与目录规约

### 1. 交互子指令体系

```bash
# 开启或继续一本书的精读
/book-study 思考快与慢

# 指定跳转到第 3 章
/book-study 思考快与慢 --chapter 3

# 将当前章节编译落盘至本地知识库
/book-study ingest

# 触发间隔重复抽测复习
/book-study review

# 跨书籍概念横向对比与综合
/book-study compare 思考快与慢 穷查理宝典

# 查看当前全书掌握度大盘
/book-study status
```

### 2. 本地目录与双向链接契约

```text
book-wiki/
├── index.md                    # 全局书籍总索引
├── log.md                      # 追加式学习日志
├── thinking-fast-and-slow/     # 单书独立体系
│   ├── meta.md
│   ├── study-plan.md
│   ├── mastery-map.md          # 掌握度动态评分表
│   ├── chapters/               # 章节精读
│   ├── concepts/               # 核心概念卡片 (如 [[concepts/system-1]])
│   └── models/                 # 思维模型
└── cross-book/                 # 跨书共享知识网络
    ├── concepts/
    └── comparisons/
```

---

## 四、管家系统落地与实战转化建议

1. **无缝整合进 Syno `vault/` 资源体系**：
   - 将 `book-wiki/` 默认根路径指向 `vault/02-Resources/` 下的书籍研读分类；
   - 自动生成的 `[[concepts/xxx]]` 双向链接与 Syno 已有的全局 MOC、飞书多维表格完全兼容；
2. **微信/飞书端碎片化复习**：
   - 结合管家的定时调度（Cron），每天早晨或晚上向主人微信推送 1 道基于 `book-study review` 的概念抽测，建立长期自律习惯。

---

## 五、关联卡片

- [[MOC - Agent Skills 武器库]]
- [[deep-interview - 苏格拉底自适应深度访谈萃取法]]
- [[sigma - Bloom 2-Sigma 一对一认知导师]]
- [[Harness Engineering]]
