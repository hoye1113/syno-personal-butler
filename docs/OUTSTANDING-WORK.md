# Syno 待办与断点（快照 2026-07-24）

> 重启后 / 新会话找回用的交接文档。**所有内容基于本会话可验证的事实**（commit SHA、文件路径、行号、复核命令）。
> 状态会漂移——以本文 + 下方「快速复核命令」的实跑结果为准。若与 `NEXT_SESSION.md` 冲突，以 git log + 实跑为准。

---

## 0. 一句话现状

M1 上下文管理 + host 端口修复 + **Phase 1 收尾** + **M2a 记忆保真**（摘要护栏 + factualStatus + Layer3 注入死代码修复）+ **M2b 跨 rotate summary 前传**（实测 depth≥2 存活 0%→100%）均已实现、本地提交（未 push）。分支 `codex/round3-remediation`。
在途：**M2c COST**（per-feature token 归因，见 §3）；**Phase 1 端到端手动验收**（浏览器，主人）。Windows 常驻验收已通过 2026-07-24（见 §2）。

---

## 1. 已完成并落库（不要重做）

| 项 | commit | 验证证据 |
|---|---|---|
| M1 上下文管理（HANDOFF / STORE / OBS） | `ddd28b9`（code+tests）+ `6071aec`（docs） | `pnpm test` 298/298；线上 `GET /api/syno/context/stats` 可达（M1 新增端点） |
| host 端口 4317→8888（`DEFAULT_WEB_PORT` 单一来源） | `eabbbe6` | `pnpm windows:restart` exit=0；`windows:status` running=true、webUrl=`…:8888` |
| **M2a 记忆保真**（Layer3 摘要注入死代码修复 + 摘要护栏 + factualStatus 标记） | `787656f` | `pnpm test` 306/306；`tests/context-fidelity.test.mjs` +6。核查发现 M1 的「记忆压缩」此前根本不保记忆（摘要只写不读）。设计/执行见 `docs/M2-MEMORY-FIDELITY-PLAN.md` |
| **M2b 跨 rotate summary 前传**（修 handoffContext 只写不读 → 跨段 depth≥2 全遗忘） | `057433d` | `pnpm test` 310/310（+4）；`tests/eval/handoff-drift.eval.mjs` 重写走真前传路径 → depth 1/2/3/5 全存活（depth≥2 0%→100%）。设计/执行见 `docs/M2-MEMORY-FIDELITY-PLAN.md` |
| **M2b review 收尾**（cap 外置 + re-injection 锁定） | `d63908d` | `pnpm test` 312/312（+2）。`HANDOFF_CONTEXT_CAP` 收进 `RETENTION.handoffContextCharsMax`（`accumulateDigest` 参数化）；探活证实 `digest=handoff` 的 re-injection 是承载性的（改精简 digest 在 depth≥3 回退存活）→ 补注释 + eval depth≥3 断言锁定。见 `docs/M2-MEMORY-FIDELITY-PLAN.md` §10 |

> 三个 SHA 均经 `git cat-file -t` 确认为 commit 对象（syno-job 的 churn 提交夹在中间，但未覆盖上述提交）。

**已上线的关键文件：**
- `apps/syno/syno/context-manager.mjs` — M1 核心：内存 `#stats` + `stats()`；`extractValuable` 跳过 `_syno.kind==="handoff"`/`"summary"`；M2a `#splitForSummary`+`SummaryGuard`（Layer3 真注入）；M2b `HandoffGen.#preamble` + `compress({handoffContext})`
- `apps/syno/syno/conversation-store.mjs` — STORE：`compactionLogMax`/`summariesMax`/`handoffContextCharsMax`(M2b) cap、`archiveExternalThreshold` 外置 + 懒加载 `getArchive()`、prune 30 天；`handoffContext` 整对象往返持久化（`create`/`save`/`get`→`#normalize`，跨重启不丢——M2b 前传的前提）
- `apps/syno/syno/runtime.mjs` — `GET /api/syno/context/stats`（L355）；`options.contextThresholds` 注入 seam（L188-192）；`contextManager` 进 runtime（L313）
- `apps/syno/syno/settings-registry.mjs` — `context.thresholds`（confirmationRequired 组，校验 light/moderate/heavy/overflow ∈ (0,1) 或 null）
- `apps/syno/syno/tool-loop-executor.mjs` — handoff 正名 `{role:"system",_syno:{kind:"handoff"}}`；M2b `accumulateDigest(prev,digest,cap)`（滚动窗口，上限外置自 `RETENTION.handoffContextCharsMax`）+ `rotateConversation` 前传 `old.summaries[-1]?.summary || handoff` 累积进 `fresh.handoffContext`
- `apps/syno/syno/paths.mjs` — `DEFAULT_WEB_PORT = 8888`（JS 单一来源）

**线上运行模型（已验证）：** host = `node apps/syno/server.mjs`，**从源码运行，无 build 步骤**，监听 `127.0.0.1:8888`（`server.mjs` `PORT || DEFAULT_WEB_PORT`）。改了源码必须 kill 8888 上的 host + 重拉才生效（详见 memory `syno-host-deploy-runbook`）。微信路由 = `conversation-ec193dc2-f1bc-48be-9fe5-18903ef50fd6`（持久在 `%LOCALAPPDATA%\Syno\state\conversation-routing.json`）。

---

## 2. ✅ 已完成（2026-07-24）— Windows 常驻验收

搁置已久的 P5 gap，本轮重启后通过。端口修复后**才第一次能被诚实评估**（之前 `windows:status` 的 `running` 因探 4317 永远报 false）。

**验收过程与证据：**
1. 重启 → 登录：at_logon 任务确实拉起——task `LastRunTime 10:53:43` → node 起于 `10:53:58`（ownership `.runtime/syno-host.pid` mode=owned）。
2. 但登录时 wrapper（`start-syno.ps1`）以 `0xC000013A`（STATUS_CONTROL_C_EXIT）一次性中断，node 成孤儿（父进程已退）但健康，故 `health ok` 而 `windows:status running=false`（定义见 `manage-windows-task.ps1:58`：`task.State -eq "Running" -and $healthy`）。
3. `pnpm windows:restart` 恢复 → `running=true`、`lastTaskResult=267009`（= `0x41301` 运行中态，**非失败**）。
4. 60s 轮询稳定：`State=Running`、wrapper 进程始终 1 个存活、health ok。自愈链确认工作。

**残留风险与已应用加固（2026-07-24）：** 登录时 wrapper 偶发收到 `0xC000013A`（STATUS_CONTROL_C_EXIT）被一次性终止、node 变孤儿；根因（登录会话初始化竞态 / 启动期软件干扰）未完全定位。**预防加固已应用**：LogonTrigger 现带 `Delay=PT30S`（登录后延迟 30s 启动 wrapper，避开会话初始化窗口）。
- **代码**：`scripts/manage-windows-task.ps1` Install 流程在 `Register-ScheduledTask` 之后用 CIM `Set-ScheduledTask -InputObject` 注入 Delay——`New-ScheduledTaskTrigger -RandomDelay` 与后赋 `$trigger.Delay` 经 Register 对象 API 均会丢失（已实测），只有注册后 CIM Set 持久化。注意：注册后 `Set` 会把任务态置 `Ready`，故脚本紧接 `Start-ScheduledTask` 复启（已验证恢复 `Running`）。
- **已验证**：AST 语法 0 错；对线上任务 clear→re-inject 复现 `PT30S` 并跨 `Start` 持久化；任务回到 `Running` / 1 wrapper / health ok。
- **验证边界**：Delay 对登录触发的实际效果只能在下次重启/重新登录时确认（本会话无法触发登录事件）。
- **任务历史日志**（`Microsoft-Windows-TaskScheduler/Operational`）启用需管理员：`wevtutil sl Microsoft-Windows-TaskScheduler/Operational /e:true`（本会话未执行，待主人提权运行）；启用后若再复现可定位 RestartOnFailure 是否触发。

**若需复验：** 重启电脑 → 登录 → `pnpm windows:status`（期望 `running=true`）。若又报 `running=false` 但 `health ok`，即登录一次性 wrapper 中断复发，跑 `pnpm windows:restart` 恢复（kill 8888 host + 重拉）。

---

## 3. 下一里程碑（每个都大，需新会话）

### M2 — 记忆保真（`docs/CONTEXT-MANAGEMENT-ROADMAP.md` §4 + §7-M2）
> **进度（2026-07-24）**：**M2a 已落库（`787656f`）**——Layer3 摘要注入死代码修复 + 摘要护栏（幻觉强实体→不物化）+ factualStatus 标记。**M2b 已落库（`057433d`）**——DRIFT eval（`6f0e9f0`）实测跨 rotate depth≥2 存活 0%（HandoffGen 不读 summary/handoff、rotate 存 system 消息被下次过滤），据此改造 summary 前传（`accumulateDigest` 滚动累积 `handoffContext` + `HandoffGen.#preamble` 折成「前情（未经核实）」段）；重写 eval 走真前传路径验证 0%→100%。详见 `docs/M2-MEMORY-FIDELITY-PLAN.md`。剩 **M2c（COST）**。

- **FIDELITY（§4.1）**：✅ 已做（注入修复 + 护栏 + 标记 + compose e2e 持久化测试）。
- **DRIFT（§4.2）**：✅ 已做（`6f0e9f0` 测量 + `057433d` 改造）。实测 post-M1 偏遗忘（depth≥2 0%）→ summary 前传后 depth≥2 100%。
- **为什么优先**：压缩 = 知识 butler 的「记忆边界」。「永不污染记忆」与「持续可改进」是 ROADMAP §1 的两大并列锚点——M1 解决了后者（可观测），M2 守前者（不污染）。
- 需新会话：设计 + 多文件 + 测试，单个上下文窗口放不下。

### 审批即时反馈 + 多格式收录（✅ Phase 1 已实现，2026-07-24 核实）
- **Phase 1 已落库**：commit `2dc77b8`（2026-07-22）实现了方案一（审批即时反馈：`decide()` 点即置灰 + `is-resolving` + 「执行中…」、`loadJobs({silent})` 静默刷新不清屏）+ 方案二（docx/html/markdown 收录：`fileKindFromName` 精确映射、intake docx/html 分支、artifact enum 扩 docx/html、mammoth）。测试 298/298 绿。设计/变更说明见 `docs/APPROVAL-AND-MULTIFORMAT-INTAKE-PLAN.md`（该文档曾误标「未实现」，已纠正）。
- **Phase 1 收尾待办（非阻塞）**：
  - ✅ **两个边界 bug 已修（`3199e62`，2026-07-24）**：① 审批 POST 成功后静默 `loadJobs` 若 GET 失败不再吞错——silent 模式抛给 `decide` 兜底（解除 `is-resolving` 灰态 + alert 提示手动刷新，此前卡片卡灰态零反馈）；② 主表单「Markdown」现支持粘贴与 .md 文件双路径（change handler 同显文件框+textarea，submitIntake 在 markdown+文件 时走 base64，前后端不再错位）。**已在线**——serveStatic 逐请求读盘 + `Cache-Control: no-store`，浏览器刷新即生效，无需重启 host。
  - ✅ **mammoth 真实路径集成测试已补（`d3c2b29`，2026-07-24）**：`tests/helpers/minimal-docx.mjs`（STORE-method ZIP 生成器，Node 内建 `zlib.crc32`，无二进制 fixture）+ 真实 `extractDocxText` happy/空文本两例。此前 docx 测试全注入 fake extractor、真实 `convertToHtml`（`{buffer}` 互操作 + convertImage 丢图）零覆盖。
  - **端到端手动验收缺口（仍待主人，浏览器）**：DOM 交互测不了，需手动点审批（看即时反馈 + 不清屏 + GET 失败时 alert）、分别传 `.md/.docx/.html/.pdf/未知` 验 approve 写入且标题为真文件名。**重点 DOCX**（mammoth 真实解析现已补单测，但仍建议真人点一遍端到端）。P5 验收门未列此项，等于没验过。
- **Phase 2（方案三大文件精华提取）**：Phase 1 既已落地、可启动；见下方「更长期路线图」。

### 更长期路线图（M2 之后，登记用，避免下次「发现漏了」）

> 以下项在 `docs/CONTEXT-MANAGEMENT-ROADMAP.md` 和 `docs/APPROVAL-AND-MULTIFORMAT-INTAKE-PLAN.md` 原文档里有完整设计，这里只登记进交接视野。全部「计划未落地」、非阻塞。

- **上下文 M3**（`ROADMAP §7`）：DISTILL（提取结构化升级，LLM 分类 decision/fact/preference/todo/resource + 图谱链接 + 语义去重）+ COST（per-feature token 归因，接 OBS stats 端点）+ UNIFY（Native/Hermes 上下文收敛契约）。
- **上下文 M4**（`ROADMAP §7`）：RECOVER（`GET /api/syno/conversations/:id/compaction-log` + `POST .../restore-compaction` 恢复工具，让 v1 §7.9 压缩可恢复从存储层到运维层）+ CONCUR（per-routeKey 序列化契约，retiredIds 降级为 defense-in-depth）。
- **ROADMAP §8 五个开放设计问题**：在对应里程碑决策时定——OBS 阈值与 frozen runConfig 接缝、摘要护栏选型、DRIFT 改造必要性、UNIFY 收敛 vs 契约、archive 外置存量迁移。
- **审批 Phase 2 — 大文件精华提取**（`APPROVAL…PLAN §方案三`）：`prepared.content > 3 万字`阈值、Skill 模板式摘要、`prepared.fullText`（原文供 RAG）+ `prepared.largeDocDigest`。**Phase 1 已落地（`2dc77b8`）、可启动**；需先固化 Large Document Digest Skill 模板。
- **小颗粒 deferred**（跟随对应主线顺手处理）：`CONTEXT-MANAGEMENT-PLAN:655` F15（cognitive-runtime 对 rotate 展开会标 `completed+undefined`，应独立 run 状态）、扫描 PDF 的 OCR 支持、微信附件白名单未扩展 docx/html（`weixin-message-handler.mjs` 第二入口）、方案一前端即时反馈缺 DOM 自动测试、decide 进行中手动 refresh 会清屏（可选禁用 refresh 按钮）。

---

## 4. 小项 / 可选（低优先）

- **证明 compress 真触发**：现有 `tests/context-manager.test.mjs`（27 例，顶层 `test(...)`）只测 context-manager **孤立逻辑**，未测 `tool-loop-agent → compress` 的真实接线。可加一个集成测试（stub provider 返回超限上下文，断言 compress 触发 + stats 计数 + rotate）。价值边际，当前窗口偏紧。
- **Deferred — `context.thresholds` bootstrap**：想在构造时从 `settingsRegistry` 读 `context.thresholds` 注入 `createSynoRuntime`。**阻塞点已核实**：`createSynoRuntime` 是 **sync**（`apps/syno/syno/runtime.mjs:62` `function createSynoRuntime(options = {})`，非 async），无法 `await settingsRegistry.get()`。已留 `options.contextThresholds` seam（L188-192）待用。要做需把 builder 改 async 或改调用点（`apps/syno/worker.mjs` / `apps/syno/server.mjs`）。
- **Deferred — stats 落盘**：`context-manager` `#stats` 是内存态（重启清零，与 anti-thrash 状态一致，故有意如此）。如需跨重启保留，落 `context-stats.json`。

---

## 5. 其他 P5 验收（以 `NEXT_SESSION.md` 为准）

全局 Goal 的剩余验收门（NEXT_SESSION「尚未完成」/「当前待主人裁决」）：备份恢复验收、真实渠道、浏览器。~~Windows 常驻验收~~ 已通过（本文 §2）。

---

## 6. 既有约束（务必遵守）

- **不 Push**（分支 `codex/round3-remediation`，全部本地）。
- 原 Obsidian 库 `D:\workSpace\obsidian_repository` **永久只读**。
- 知识写入走可审批 Job；不绕过 Policy、不 reset、不预创建 LearningState。
- Provider token 不泄露。

---

## 7. 快速复核命令（重启后 / 新会话第一件事）

```bash
git log --oneline -6              # 顶 d63908d(M2b review 收尾)；往下 1b5cefa(docs)/057433d(M2b)；再下 787656f(M2a)
git status --short                # 期望 clean
git branch --show-current         # codex/round3-remediation
pnpm test                         # 期望 312/312（calendar-sync 全量并发下偶发 45s 超时，单跑通过，非回归）
node --test tests/eval/handoff-drift.eval.mjs  # on-demand：depth 1/2/3/5 全存活（前传路径）
```
```powershell
pnpm windows:status               # 期望 running=true, webUrl=…:8888
Invoke-RestMethod http://127.0.0.1:8888/api/syno/context/stats
```
