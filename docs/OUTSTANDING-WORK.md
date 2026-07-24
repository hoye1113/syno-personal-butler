# Syno 待办与断点（快照 2026-07-24）

> 重启后 / 新会话找回用的交接文档。**所有内容基于本会话可验证的事实**（commit SHA、文件路径、行号、复核命令）。
> 状态会漂移——以本文 + 下方「快速复核命令」的实跑结果为准。若与 `NEXT_SESSION.md` 冲突，以 git log + 实跑为准。

---

## 0. 一句话现状

M1 上下文管理 + host 端口修复**均已实现、上线、验证、本地提交（未 push）**。分支 `codex/round3-remediation`，工作树 clean。
唯一在途动作：**无**（Windows 常驻验收已通过 2026-07-24，见 §2）。下一个里程碑是 M2（需新会话）。

---

## 1. 已完成并落库（不要重做）

| 项 | commit | 验证证据 |
|---|---|---|
| M1 上下文管理（HANDOFF / STORE / OBS） | `ddd28b9`（code+tests）+ `6071aec`（docs） | `pnpm test` 298/298；线上 `GET /api/syno/context/stats` 可达（M1 新增端点） |
| host 端口 4317→8888（`DEFAULT_WEB_PORT` 单一来源） | `eabbbe6` | `pnpm windows:restart` exit=0；`windows:status` running=true、webUrl=`…:8888` |

> 三个 SHA 均经 `git cat-file -t` 确认为 commit 对象（syno-job 的 churn 提交夹在中间，但未覆盖上述提交）。

**已上线的关键文件：**
- `apps/syno/syno/context-manager.mjs` — M1 核心：内存 `#stats` + `stats()`；`extractValuable` 跳过 `_syno.kind==="handoff"`
- `apps/syno/syno/conversation-store.mjs` — STORE：`compactionLogMax`/`summariesMax` cap、`archiveExternalThreshold` 外置 + 懒加载 `getArchive()`、prune 30 天
- `apps/syno/syno/runtime.mjs` — `GET /api/syno/context/stats`（L355）；`options.contextThresholds` 注入 seam（L188-192）；`contextManager` 进 runtime（L313）
- `apps/syno/syno/settings-registry.mjs` — `context.thresholds`（confirmationRequired 组，校验 light/moderate/heavy/overflow ∈ (0,1) 或 null）
- `apps/syno/syno/tool-loop-executor.mjs` — handoff 正名为 `{role:"system", _syno:{kind:"handoff"}}`
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

**残留风险（非阻塞）：** 登录时 wrapper 被 Ctrl+C 是一次性事件，根因（登录会话初始化竞态 / 启动期软件干扰）未完全定位；若将来某次登录复现 `0xC000013A`，node 会再变孤儿丢自愈。可选加固：给 wrapper 跑 PowerShell 自身加 `-WindowStyle Hidden`/分离控制台，或加一个轻量 watchdog 任务周期确认 wrapper 存在。非必须。

**若需复验：** 重启电脑 → 登录 → `pnpm windows:status`（期望 `running=true`）。若又报 `running=false` 但 `health ok`，即登录一次性 wrapper 中断复发，跑 `pnpm windows:restart` 恢复（kill 8888 host + 重拉）。

---

## 3. 下一里程碑（每个都大，需新会话）

### M2 — 记忆保真（`docs/CONTEXT-MANAGEMENT-ROADMAP.md` §4 + §7-M2）
- **FIDELITY（§4.1）**：持久化 LLM 产出完整性治理（压缩摘要的幻觉 / 关键内容缺失防护）。
- **DRIFT（§4.2）**：跨轮转上下文漂移测量（多轮压缩后语义偏移量化）。
- **为什么优先**：压缩 = 知识 butler 的「记忆边界」。「永不污染记忆」与「持续可改进」是 ROADMAP §1 的两大并列锚点——M1 解决了后者（可观测），M2 守前者（不污染）。
- 需新会话：设计 + 多文件 + 测试，单个上下文窗口放不下。

### 审批即时反馈 + 多格式收录（独立工作流，与上下文管理无关）
- 计划文档**已落盘**：`docs/APPROVAL-AND-MULTIFORMAT-INTAKE-PLAN.md`（Phase 1 代码**未实现**）。
- 原始 plan：`C:\Users\38788\.claude\plans\wild-nibbling-thunder.md`。
- 解决真实痛点：① 审批点「收录/丢弃」看似无反应（前端零反馈）；② pdf/md/docx/html 收录报「缺少内容」或乱码。
- 状态：**本次会话未触碰**；是否继续由用户定（与 M2 是两条独立线）。

### 更长期路线图（M2 之后，登记用，避免下次「发现漏了」）

> 以下项在 `docs/CONTEXT-MANAGEMENT-ROADMAP.md` 和 `docs/APPROVAL-AND-MULTIFORMAT-INTAKE-PLAN.md` 原文档里有完整设计，这里只登记进交接视野。全部「计划未落地」、非阻塞。

- **上下文 M3**（`ROADMAP §7`）：DISTILL（提取结构化升级，LLM 分类 decision/fact/preference/todo/resource + 图谱链接 + 语义去重）+ COST（per-feature token 归因，接 OBS stats 端点）+ UNIFY（Native/Hermes 上下文收敛契约）。
- **上下文 M4**（`ROADMAP §7`）：RECOVER（`GET /api/syno/conversations/:id/compaction-log` + `POST .../restore-compaction` 恢复工具，让 v1 §7.9 压缩可恢复从存储层到运维层）+ CONCUR（per-routeKey 序列化契约，retiredIds 降级为 defense-in-depth）。
- **ROADMAP §8 五个开放设计问题**：在对应里程碑决策时定——OBS 阈值与 frozen runConfig 接缝、摘要护栏选型、DRIFT 改造必要性、UNIFY 收敛 vs 契约、archive 外置存量迁移。
- **审批 Phase 2 — 大文件精华提取**（`APPROVAL…PLAN §方案三`）：`prepared.content > 3 万字`阈值、Skill 模板式摘要、`prepared.fullText`（原文供 RAG）+ `prepared.largeDocDigest`。**Phase 1 落地后启动**，需先固化 Large Document Digest Skill 模板。
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
git log --oneline -6              # 顶应是 eabbbe6；往下能找到 6071aec / ddd28b9
git status --short                # 期望 clean
git branch --show-current         # codex/round3-remediation
pnpm test                         # 期望 298/298
```
```powershell
pnpm windows:status               # 期望 running=true, webUrl=…:8888
Invoke-RestMethod http://127.0.0.1:8888/api/syno/context/stats
```
