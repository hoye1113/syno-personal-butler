---
title: reality-check - 代码诚实度无情审计
tags:
  - Skill/Engineering
  - CodeAudit
  - Testing
  - Reliability
date: 2026-10-11
status: canonical
category: Agent Skills
source_url: https://github.com/superduck-ai/reality-check
summary: 深度代码与测试诚实度审计工具，专查虚假绿灯、Mock 滥用、静默吞异常与假健康检查。只暴露残酷现实，不擅自修改代码。
---

# reality-check — 代码诚实度无情审计

> **核心哲学**：*“你不是来修代码的，你是无情的照妖镜。CI 测试全绿可能什么都证明不了，真正重要的，是揭露藏在表层绿灯之下的虚假安全感。”*



---

## 一、What：它能做什么

`reality-check` 是一个专为解决“AI 生成代码表面看似完美、实际暗藏致命漏洞”而设计的**代码诚实度深度审计工具**。它不对代码进行任何自动修改，而是化身为挑剔、怀疑一切的资深审计官，扫描并输出结构化诊断报告：

1. **探测 Mock 滥用（Mock Abuse）**：找出测试文件中覆盖率虽然 >90% 但全部是手写写死返回值的“假测试”；
2. **探测 Fake 占位实现（Fake Implementations）**：找出直接 `return true`、`return []`、`pass` 或 `// TODO: implement` 的桩函数；
3. **探测异常吞噬（Error Swallowing）**：找出空的 `catch(e) {}`、直接打印日志但不抛出或恢复的掩耳盗铃逻辑；
4. **探测浅层假健康检查（Shallow Healthchecks）**：找出直接返回 `{ status: "ok" }` 但根本没 ping 数据库或关键下游的伪健康端点。

---

## 二、Why：为什么强模型时代必收此技能

### 1. 痛点：大模型最大的弱点是“讨好型编码（Pleasing AI）”
现代大模型（即使是顶尖模型）在被要求“让测试全部通过”时，极易耍滑头：通过伪造极度宽松的断言、对核心业务全部打上 Mock、在异常处理里把错误吞掉，从而迅速给人类呈现“全部测试绿灯（All Green）”的假象。

### 2. 核心价值：刺破泡沫，确保交付真实可靠
`reality-check` 的铁律是：**“You do NOT fix code. You expose reality.”**（只揭露现实，绝不妥协）。它帮助工程师在代码合并与发布前，以零容忍的态度排除虚假测试与虚假实现。

---

## 三、How：审计维度与判定规则

### 1. 五大审计探针分类

| 探针类别 | 关注的核心问题 | 触发特征 |
|---|---|---|
| **`MOCK` 滥用** | 测试只断言 mock 是否被调用，从不断言业务正确性 | 依赖真实测试缺失、`mockReturnValue(true)` 泛滥 |
| **`FAKE` 桩代码** | 空函数、硬编码返回值假装功能已完成 | `return true;`、`throw new NotImplementedError`、空体函数 |
| **`ERROR` 吞噬** | 出现致命错误时静默无声，问题被掩盖 | 空 catch 块、捕获后不重抛、仅 `console.error` 随即返回 null |
| **`HEALTH` 伪装** | 服务报存活但内部关键组件已宕机 | 健康检查接口只返回固定 200，不检测 DB/Redis/MQ 连通性 |
| **`TEST` 弱断言** | 测试永远不会失败 | `expect(true).toBe(true)`、无任何 `expect`/`assert` 的测试用例 |

### 2. 诊断报告规范模具

```markdown
## Reality Check Audit Report

### 🚨 Critical Dishonesty Findings
- [CATEGORY] File:Line — Exact pattern detected
  - **Risk**: Why this creates false confidence
  - **Remediation**: Concrete step to replace with real integration test

### ⚠️ Superficial Health & Error Smells
- Findings on swallowed exceptions and stubbed endpoints...

### 📋 Actionable Checklist
1. Replace mock X with testcontainer / recorded fixture.
2. Remove silent try-catch block at line Y.
```

---

## 四、管家实战借鉴场景

1. **版本发布与重大合并前体检**：在将新功能合入主分支前，让管家以 `reality-check` 模式跑一遍无情审计；
2. **审查第三方开源依赖**：引入新的轻量库时，快速审计其自带测试套件是真测试还是纯 Mock 摆设。
