# M2 — 记忆保真 执行计划（补强版，2026-07-24）

> **状态**：M2a 已落库（`787656f`）。核查中**推翻了原 finding #2**——发现并修复了 M1 的 Layer3 摘要注入死代码（摘要此前根本不进活跃上下文）。M2b（DRIFT eval）待做。对照 `docs/CONTEXT-MANAGEMENT-ROADMAP.md` §4.1/4.2 + §7-M2。
> **不变约束**：不 push（分支 `codex/round3-remediation`）；原 Obsidian vault 永久只读；知识写入走可审批 Job；不可信内容按 `unverified`/`<untrusted>` 隔离；Provider token 不泄露。

---

## 0. 一句话
守知识管家的「记忆边界」：让**会被当事实复用的 LLM 产出**（压缩摘要、handoff）在低置信时**宁可不压、不可压错**，并量化多轮 rotate 的信息漂移。M1 给「可观测」，M2 守「不污染」（ROADMAP §1 两大锚点之一）。

## 1. 范围（M2 = FIDELITY + DRIFT，COST 跟随）

| 片 | 内容 | 量 | 依赖（均 ✅ M1）|
|---|---|---|---|
| **M2a** | FIDELITY：摘要护栏 + `factualStatus` 标记 + 忠实度 eval | L | OBS、HANDOFF 正名 |
| **M2b** | DRIFT：N 轮漂移 eval + 基线 + 改造决策门 | M | 同源（保真）|
| **M2c** | COST：per-feature token 归因（接 OBS stats） | M | OBS |

序：**M2a → M2b（紧随）→ M2c（后置）**。M2b 紧随 M2a，因其发现可能反向要求改 M2a。

## 2. 探索发现（执行前核查的边界 / 遗漏）

| # | 项 | 结果 | 处置 |
|---|---|---|---|
| 1 | `_syno` 是否泄漏进 provider prompt？ | 全 syno/ 无 strip；但 M1 handoff 早带 `_syno` 发 provider 且线上正常 → provider 容忍 | **安全**，factualStatus 同模式。未来可选卫生：发送前剥 `_syno`（非阻塞，本次不动）|
| 2⚠️ | 物化 summary 真的进下一轮？ | 原判「✅ 进下一轮」**被推翻**：probe 实证 `summary msg injected: false`。根因 `#materializeSummary` 守卫 `messages.length<=tailMessages`，而 Layer2 已裁 working 到 ≤tailMessages → cut 恒 0 → 摘要只写 `conversation.summaries`（全仓只写不读）、永不注入、永不复用。「记忆压缩」此前不保任何记忆，还白花一次 LLM 调用 | **已修（`787656f`）**：Layer3 重构为 `#splitForSummary`(keep<tailMessages)→`#summarize(中段)`→注入 `[summary,...近窗]`。probe 确认注入+`factualStatus:unverified` 生效、矛盾摘要被 guard 拒、规则摘要豁免注入 |
| 3 | summary-of-summary 级联幻觉？ | `#buildSummaryPrompt`(context-manager:404) 只取 user/assistant → 旧 summary(system) 不进摘要 prompt | **良性**：guard「源」= user+assistant 窗口，无放大级联 |
| 4 | handoff 注入点？ | `tool-loop-executor.mjs:19`（+ `fresh.handoffContext=handoff` L16）| 改 ② 锚点 |
| 5 | eval 会被 CI 误跑？ | test glob = `tests/*.test.mjs`；`*.eval.mjs` 不匹配 | ✅ on-demand 语义天然成立 |
| 6 | 时间戳来源？ | 代码库用可注入 `this.clock()` | `generatedAt` 用 `this.clock().toISOString()`，禁 `new Date()` |
| 7⚠️ | **DRIFT 前提是否还成立？** | `HandoffGen`(context-manager:104-105) 只读 user+末3 assistant；handoff 现是 **system 消息**(M1) → **上一轮 handoff 被排除**；`handoffContext`(conversation-store:105) **当前只写不读** | **重大**：roadmap §4.2「handoff-of-handoff 复利」**post-M1 已失效**，当前偏**遗忘**。→ DRIFT eval 必须测**真实**存活曲线；若改造，目标是「把 handoffContext/稳定 summary 前传承接进下次 handoff」，非「防复利」|

## 3. M2a — FIDELITY（执行中）

### 改动 ① 摘要护栏（逃生阀）
- 新增 `SummaryGuard` 类（context-manager.mjs，对称 `ToolTruncator`/`Deduplicator`）。
- **信号**：summary 出现**源(user+assistant 窗口)里没有的 ≥4 位数字 / 年份**（归一化千分位/小数点）→ 判幻觉 → 低置信。ID 样 token 扩展留待 COST 数据后定。
- **规则摘要豁免**：`#ruleBasedSummary`(字面摘录，不会编造) → 跳过幻觉 guard，但仍标 `unverified`。`#summarize` 重构为返回 `{text, origin}`。
- **接线**：Layer3(context-manager:306-312) 拿到 `{text,origin}` 后，`origin==="llm"` 才过 guard；低置信 → 不物化、保留 tail、`action` 降级 `layer3→layer2`。
- **guard 自身失败**：抛错 → 保守不物化，记 `summaryGuardErrors`。
- **级联**：频繁拒绝 → afterTokens 居高 → anti-thrash 冷却 → 终 rotate（rotate 丢更多但保真，预期内）。
- **已知权衡**：faithful 摘要偶尔引入源里无数值对应的大数字（如"约 50000 字"）会被误拒——可接受（保真优先）。

### 改动 ② factualStatus 标记
- `#materializeSummary`(context-manager:379)：summary 消息加 `_syno:{kind:"summary", factualStatus:"unverified", generatedAt:this.clock().toISOString()}`。
- `tool-loop-executor.mjs:19`：handoff `_syno` 加 `factualStatus:"unverified"`。
- 下游 DISTILL/M3 据此降权——本次只打标。

### 改动 ③ 忠实度 eval
- `tests/eval/summary-faithfulness.eval.mjs`：mock provider 返回**含源里没有的数字**的矛盾摘要 → 断言降级 + tail 保留 + `summaryGuardRejections+1`。on-demand（不进 CI gate）。

### 改动 ④ stats 扩展
- `#stats` 加 `summaryGuardRejections` / `summaryGuardErrors`（仅计数器，经 `stats()`→`/api/syno/context/stats` 暴露，无 token 泄漏）。

### 测试（≈ +6，`tests/context-fidelity.test.mjs`，进 CI）
矛盾摘要降级+tail 保留 / 正常摘要物化 / 规则摘要豁免 guard / summary 带 `factualStatus` / handoff 带 `factualStatus` / guard 抛错安全降级。

## 4. M2b — DRIFT
- `tests/eval/handoff-drift.eval.mjs`：注入**确定性锚点**（如 `决策锚-A7X9-2026`，handoff 是 user 字面摘录 → 应逐字存活）→ 模拟 N 次 rotate → 测第 N 次 handoff 存活率，出 depth 1/2/3/5 曲线。
- **决策门**：depth≥2 存活率 ≥80% → 不改策略；否则改造（见 #7：把 handoffContext/稳定 summary 前传承接）。
- 开放问题 Q3：**先测后定**。

## 5. M2c — COST（后置）
per-feature token 归因（summary/judge/guard 各自开销），账本只暴露聚合，接 OBS `/api/syno/context/stats`。用于回答「护栏该不该上 LLM 自检」。

## 6. 提交结构（精确路径，本地不 push）
1. `feat(context): 摘要护栏 + factualStatus 标记` — `apps/syno/syno/context-manager.mjs` + `apps/syno/syno/tool-loop-executor.mjs` + `tests/context-fidelity.test.mjs`。
2. `test(eval): 摘要忠实度 + handoff 漂移 eval` — `tests/eval/*.eval.mjs`（on-demand）。

## 7. 快速复核
```bash
git log --oneline -3     # 顶 787656f(M2a)；往下 d3c2b29/3199e62
pnpm test                # 306/306（calendar-sync 全量并发下偶发 45s 超时，单跑 11s 通过，非回归）
node --test tests/eval/  # on-demand 跑 eval（M2b 落库后）
```

---

## 8. 执行结果（2026-07-24 落库，`787656f`）

**核查推翻了原 finding #2 并顺带修了 M1 一个真 bug**：Layer3 摘要注入此前是死代码（见 finding #2 修正行）。这把 M2a 的重心从「护栏+标记」前移到「让记忆压缩真正生效」。

**改动（`apps/syno/syno/context-manager.mjs` + `tool-loop-executor.mjs` + `tests/context-fidelity.test.mjs`）：**
- **Layer3 injection 修复（FIDELITY 核心）**：新增 `keepAfterSummary`（默认 `floor(tailMessages/2)`，刻意 < tailMessages）；Layer3 改为 `#splitForSummary` 切中段 → `#summarize(中段)` → 注入 `[summaryMessage, ...近窗]`。删掉旧 `#materializeSummary`（守卫致 cut 恒 0）。摘要现随 `compressed.messages` 进下一轮。
- **摘要护栏 `SummaryGuard`**：LLM 摘要引入源(user+assistant)里没有的 ≥4 位数字/年份 → 判幻觉 → 不物化、保留近窗、action 降级；`#summarize` 返回 `{text,origin}`，规则摘要(origin:rule)豁免。`#stats` 加 `summaryGuardRejections/Errors`。
- **factualStatus 标记**：summary/handoff 物化消息带 `_syno:{kind,factualStatus:"unverified",generatedAt}`；`extractValuable` 跳过 `kind==="summary"`（对齐 handoff，防自污染）。
- **测试 +6**（`tests/context-fidelity.test.mjs`）：guard 单元 / 矛盾摘要降级+tail 保留 / 忠实摘要注入+标记 / 规则摘要豁免 / handoff 标记 / 防自污染。**306/306 绿**。

**未做（留待 M2b/M2c）**：忠实度+漂移 on-demand eval（改动③、M2b）；per-feature token 归因（M2c）。
