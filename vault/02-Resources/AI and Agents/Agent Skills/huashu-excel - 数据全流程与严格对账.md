---
title: huashu-excel - 数据全流程与严格对账
tags:
  - Skill/Productivity
  - DataAnalysis
  - Excel
  - Reconciliation
date: 2026-10-11
status: canonical
category: Agent Skills
source_url: https://github.com/alchaincyf/huashu-excel
summary: 花叔 Excel/CSV 数据分析全流程技能：体检脏表、清洗、定口径、算指标、勾稽对账、出审计报告。核心原则是让算出来的每一个数字都经得起跨表交叉追问。
---

# huashu-excel — 数据全流程与严格对账

> **核心哲学**：*“拿到数据表千万别急着算。先体检脏表，再咬死口径，算完必须双向对账。算得快不算本事，算出来的每一个数字经得起交叉追问才叫专业。”*



---

## 一、What：它能做什么

`huashu-excel` 是面向真实业务数据与报表分析的**严谨数据工程技能**。无论是处理日常财务账单、业务导出的脏 CSV、还是涉及多表汇总的复杂 Excel：

1. **脏表体检（Healthcheck）**：在动任何计算前，先扫描空值、隐形空格、格式混用、重复记录、异常极值等常见数据毒瘤；
2. **口径白纸黑字锁定（Metric Definitions）**：在计算前先把每个指标的计算公式、包含范围与排除条件明确定义（例如：GMV 是否包含退款？净额是否扣除手续费？）；
3. **闭环双向对账（Reconciliation）**：强制核验勾稽关系（如“分项之和必须等于总计”、“期初 + 发生额必须等于期末”），对不上哪怕 1 分钱也必须报警排查；
4. **可审计报告交付**：输出带清晰推导逻辑、数据来源与验证证据的报表。

---

## 二、Why：为什么它能解决痛点

### 1. 痛点：AI 算数据的“一本正经胡说八道”
许多开发者直接把 CSV 扔给 AI 让它“帮我算一下本月利润”，AI 会毫不犹豫地直接加总，却完全忽视了：
- 同一列里有文本型数字和数值型数字；
- 含有未去重的重复订单；
- 汇率口径混乱，导致算出的总额看起来头头是道，实际差了十万八千里。

### 2. 核心价值：将资深财务与数据分析师的防御性纪律代码化
该技能把资深财务“永远不相信第一眼看到的数据”、“必须留出对账底稿”的职业习惯固化为 Agent 执行守则。

---

## 三、How：六步标准作业法

```
1. 体检脏表 (扫描空值/格式/脏数据) 
      ▼
2. 规范清洗 (类型统一/去重/修补) 
      ▼
3. 咬死口径 (书面确认指标公式与边界) 
      ▼
4. 精确计算 (透视/公式计算) 
      ▼
5. 勾稽对账 (横纵向对账，误差归零) 
      ▼
6. 交付报告 (附带推导底稿与异常说明)
```

### 核心对账防线模具
```markdown
Before reporting final numbers to user, verify reconciliation invariants:
- SUM(sub_items) == total_reported (Delta must be exactly 0.00)
- Count of unique IDs matches raw row expectations
- Any excluded rows must be explicitly listed with exclusion reason
If delta != 0, DO NOT GUESS. Halt and report the mismatch row.
```

---

## 四、管家实战借鉴场景

1. **个人投资记账与资产对账**：处理股票、基金、银行卡等多源导出账单，自动清洗并对账净资产；
2. **业务开销与发票报销审计**：核算项目开销时，自动揪出重复发票与口径不一的金额。
