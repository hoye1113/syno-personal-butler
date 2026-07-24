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
git log --oneline -4     # 顶 d63908d(M2b review)；往下 057433d(M2b)/1b5cefa(docs)；再下 787656f(M2a)
pnpm test                # 312/312（calendar-sync 全量并发下偶发 45s 超时，单跑 11s 通过，非回归）
node --test tests/eval/  # on-demand 跑 eval（M2b 重写走真前传路径）
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

---

## 9. 执行结果（2026-07-24 落库，`057433d`）

**先测后改（对 finding #7「post-M1 偏遗忘」不再靠读码断言——本会话已栽过一次于 finding #2）：**
`tests/eval/handoff-drift.eval.mjs`（`6f0e9f0`）实测跨 rotate 锚点存活曲线 → **depth1=存活、depth2/3/5=丢失（depth≥2 0%）**，低于 §4 决策门 80%。根因经读码核实（HandoffGen L131-144 + rotate L313-318）：`generateHandoff` 只读 `role==="user"`(全部)+末 3 assistant、不读 system/summary/上轮 handoff；`rotateConversation` 把 handoff 存为 system 消息 → 下一轮 `generateHandoff` 过滤掉它 → 锚点丢失。

**改造（稳定摘要载体 `handoffContext` 从「只写」变「累积+前传」）：**
- **`tool-loop-executor.mjs`**：`accumulateDigest(prev, digest)` 滚动窗口（`HANDOFF_CONTEXT_CAP=8000` 字符，新摘要前置 + 旧载体续接、超上限截头部保最新）；`rotateConversation` 把 `old.summaries[-1]?.summary || handoff` 作 digest，与 `old.handoffContext` 累积进 `fresh.handoffContext`（此前 `fresh.handoffContext = handoff` 直接覆盖、且全仓只写不读）。（注：签名与上限后于 §10 外置为 `accumulateDigest(prev,digest,cap)` + `RETENTION.handoffContextCharsMax`。）
- **`context-manager.mjs`**：`compress({handoffContext})` 透传到 Layer4 rotate 的 `generateHandoff`；`HandoffGen.#preamble` 把上轮载体折成 `## 前情（上一段对话延续，未经核实）`前置，占 `charCap` ≤40%（留余量给近期内容），截断路径仍保留 preamble（防跨 rotate 遗忘）。
- **`tool-loop-agent.mjs`**：compress 调用传入 `conversation.handoffContext`。
- **验证**：`tests/context-fidelity.test.mjs` +4（compose e2e 持久化 summary、HandoffGen preamble、rotateConversation 前传 latest summary+累积旧 handoffContext、accumulateDigest 上限）；重写 `handoff-drift.eval.mjs` 走真前传路径（传 `handoffContext` 进 `compress` + `accumulateDigest` 累积）→ **depth 1/2/3/5 全存活（depth≥2 0%→100%）**。**310/310 绿**。前情一律 `factualStatus:"unverified"`（FIDELITY 不变式）。

**未做（留待 M2c）**：per-feature token 归因（COST）。

---

## 10. Review 收尾（2026-07-24 落库，`d63908d`）

M2b 落库后做了一轮结构化 review（`/code-review`），5 项 finding 逐一核查后落地：

- **[Optional] cap 外置**：`HANDOFF_CONTEXT_CAP`（`tool-loop-executor` 局部魔法常量）→ `RETENTION.handoffContextCharsMax`（`conversation-store`，与 `summariesMax` 同源）；`accumulateDigest(prev, digest, cap=DEFAULT)` 参数化、非法/缺省退回默认；`rotateConversation` 从 `store.retention` 读上限。
- **[FYI#2 → 探活推翻审查结论]**：审查曾把 `digest = ... || handoff` 的「re-injection」标为冗余、拟改 preamble-free 精简 digest。**实跑探活推翻**：精简 digest 在 depth≥3 回退存活（d3/d5 ✗ vs 当前 d1–d5 全 ✓）——re-injection 是**承载性**的（把累积前情再渲染进新 digest 头部，使滚动窗口「保头部」时旧决策始终位于头端而存活）。故保持行为、补注释固化语义 + 用 eval depth≥3 断言当回归锁。
- **[FYI#3/#4/#5 doc]**：`#preamble` 的 40% charCap 上限默认不咬合（防御性，仅 tokenCap<~2500 时生效）；信任边界（既往用户派生内容持续带入未来轮次）已用 `未经核实` 标记 + system prompt 区分缓解，无代码改动；eval 刻意压测最坏（无 layer3 summary）路径，summary 在场路径由 CI 单测覆盖。

**验证**：`pnpm test` 312/312（+2：cap 参数生效、`store.retention` 注入上限）；drift eval depth 1/2/3/5 全存活；repo verify 1287 通过。

**教训（已入 memory `syno-context-probe-before-change`）**：本子系统（compress/rotate/handoff）行为反直觉，读码断言已多次出错（finding #2、本处 lean-digest 险些回归）——改这类行为前先跑 eval/探活，勿凭 trace 下结论。
