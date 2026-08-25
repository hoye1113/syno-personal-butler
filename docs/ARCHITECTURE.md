# Syno architecture

## Data flow

```text
Web / Weixin / Feishu / Scheduler
        │
        ▼
   Channel Gateway ── allowlist / dedupe / normalization
        │
        ▼
 SignalEngine ── deterministic wake-up and notification budget
        │
        ▼
 PriorityEngine ── goals → commitments → reviews → news → exploration
        │
        ▼
 CognitiveRuntime ── exactly one active adapter / bounded turns / native tool calls
        │
        ▼
 ToolRegistry ── schema / risk / permission / retry / version
        │
        ▼
   SynoCore / AgentHost ── Policy / Job lifecycle / ambiguity decision
        │
        ▼
 Validator / GitGuard ── isolated diff / exact commit / pinned merge
        │
        ▼
  vault + ops + immutable events
```

## Deep modules

- `SignalEngine.collect` deterministically decides when active work is due. The model cannot wake itself.
- `PriorityEngine.rank` applies the fixed goal/commitment/review/news/exploration order and the 60/25/15 digest/ingest/maintenance budget.
- `CognitiveRuntime` is the only model-loop seam: `run(request)`, `cancel(runId)`, `health()` and `capabilities()`. The only product implementation is `DeepSeekHarnessCognitiveRuntime` (`adapter: deepseek-harness-sdk`, v3). Production chat talks to a supervised `dsh --profile syno` Web process over loopback HTTP plus WebSocket event streams (`/api/events.host` and `/api/events.mux`; GET returns 426). Capture/ingest analysis stays on `dsh-jsonrpc-agent` stdio. Tests and `SYNO_DSH_FAKE_AGENT` keep the jsonrpc fake. The DSH clone at `SYNO_DSH_ROOT` must be built (`pnpm run build`); `dsh web` boots the stock `web` profile, not production `syno`.
- DSH owns the conversational session, official compaction and same-session ordinary scheduling. Syno does not maintain a second active transcript or a second general-purpose memory provider. With the current Harness checkout, `@deepseek-ai/dsh-base` supplies the host token meter/session services, `@deepseek-ai/dsh-web-app` supplies the Web bundle, and `@deepseek-ai/dsh-schedule` is mounted as an official function plugin by the `@syno/dsh-plugin` overlay; the production `syno` profile pins those bundles. Syno generates a controlled `syno` agent preset under the Host-owned DSH home and the Web client explicitly creates Syno sessions with `agentPreset: syno`, so the stock `standard` coding persona is not selected for production Syno sessions. The JSON-RPC chat composition mounts the same official token-meter, tool-result-pruner, compaction-basic and compact-command stack. `syno-lab` keeps the base/web bundle and preserves DSH CLI-installed experimental dependencies without mounting the Syno Bridge.
- Syno deterministically selects one model attempt from the fixed DeepSeek chain. The Agent cannot select providers, models, permissions or approval levels, and a retry is forbidden after an irreversible effect. Harness chat may use sandboxed `workspace-write` tools (including official `web_search` / `web_fetch`) only inside an isolated profile directory under the Host local data root; capture/ingest analysis uses a second sidecar with no bash/fs/web. Repository `vault/` / `apps/` writes still go through `syno_*`, Policy and GitGuard. Image understanding is a Host tool (`syno_image_read` → Zen HTTP `mimo-v2.5-free`), not a model-chain member. The production permission table contains only `workspace-write` + `never`; do not add `danger-full-access`.
- `DeepSeekHarnessSupervisor` owns the chat web PID tree (or jsonrpc fake) plus the capture jsonrpc sidecar, isolated home/session/workspace roots, the Host-generated `syno` / `syno-lab` profiles (production `syno` links `@syno/dsh-plugin` into the profile `node_modules`), and the two cordis leaves (`syno-chat.cordis.yml`, `syno-capture.cordis.yml`). `SYNO_DSH_ROOT` is required; there is no hard-coded clone path. Production profile forbids marketplace `dsh plugin add`; `syno-lab` is the only place for `dsh-mnemon`, and its data is not canonical Syno memory. Loopback DSH Web is a privileged same-session shell (`approval: never`), not the control-plane UI. Pitfalls: `docs/OPERATIONS.md`.
- `DeepSeekHarnessSessionBindingStore` persists only Owner/thread/Harness Session metadata. The Harness process owns full conversational context; Syno does not maintain a second active transcript. WeChat and DSH Web inject the same chat session. Port 8888 is the Syno control plane (credentials, channels, Policy, diagnostics), not the daily chat UI.
- `ChannelConversationHandler` unifies Weixin and Feishu routing and resolves deterministic commands and `PendingDecision` before invoking the cognitive runtime.
- `SynoToolBridge` is the sole static MCP adapter at `POST /api/syno/bridge/mcp`. Its `exposedToolNames` seam and the shared `core` tool set expose `workflow.context`, `knowledge.search`, `knowledge.read_snippet`, `knowledge.fetch_url`, `today.read`, `learning.due`, `learning.teach_back`, `learning.submit`, `capture.start`, `capture.status`, `capture.list_pending`, `projects.list`, `projects.create`, `projects.update_status`, `jobs.list`, `jobs.submit` and `image.read` to ordinary DSH chat. URL fetching and the due/teach-back tools are governed read-only capabilities; `learning.submit` only creates an approval-bound `learning.evidence.record` Job from the Owner's raw output and cannot directly write knowledge or mastery. Project tools receive server-owned Owner/context; `projects.create` never accepts an identity, and `projects.update_status` binds its Job to the target Project after Owner validation. Hidden goal/claim/evidence/settings and mechanical browser tools remain in `ToolRegistry`; capture receives its explicit browser allowlist. `tools/list` filtering in the DSH plugin and `tools/call` filtering in the Harness runtime are both defense-in-depth. The Bridge never exposes arbitrary HTTP, filesystem, Shell or Git.
- `ToolRegistry.resolve` exposes only schema-validated Syno capabilities; shell, arbitrary files, browser, Git and source editing are never tools.
- `ApprovalAdvisor` is deterministic and reads only the local ingest artifact. `ProviderClient`, `ConversationStore`, `ConversationRouter`, `ContextManager` and `ToolLoopAgent` remain only on legacy local paths until the R6 real-acceptance gate; they are not fallbacks when Harness is unavailable and are not part of the DSH chat contract.
- `SignalSourceRegistry.collect` is the deterministic seam for due volatile Claims, pending ingestion, output opportunities and knowledge-maintenance events. The model cannot invent or self-schedule a signal.
- `IngestService` keeps unapproved source payloads and proposals in rebuildable local state. Only an approved Job writes the Artifact, InboxCandidate, IngestProposal and resulting Note into `ops/`/`vault/` in one isolated diff.
- `LearningService.record` requires the Owner's actual raw output and creates its Artifact in the same approved diff as LearningEvidence; a caller-supplied reference alone cannot increase mastery.
- `OutputService.progress` owns the suggested → accepted → drafting/practiced → published/dismissed lifecycle and retains the Owner's draft Artifact plus feedback.
- `StateArchive` exports only non-credential local state, records a versioned SHA-256 manifest and restores only into an empty target.
- `SynoCore.execute/snapshot` is the application interface. Callers do not learn storage, index or Git details.
- `AgentHost.receive/inspect/cancel/approve` owns the Job lifecycle but delegates all model loops to an Executor Adapter.
- `Policy.evaluate` is in-process and pure. Model output never changes Profile, approval count or escalation rules.
- `OperationRegistry` binds every writable HTTP/API operation to a canonical intent. Public callers cannot supply Profile, risk, approval or executor decisions.
- Dead OpenCode/Claude/Hermes executors have been deleted. The product Agent runtime is Harness only.
- `ChannelAdapter.start/stop/send/status` has Web, Windows, Weixin and Fake Adapters.
- `CalendarAdapter` has Markdown, Lark and Fake Adapters. macOS is deliberately absent.

## Project-aware Knowledge MVP

Project is Syno domain state, stored as durable Markdown records under `ops/projects/<projectRef>.md`. It is a bounded work context with an explicit outcome and done condition, not a PARA folder, Area, Goal parent, task tree, UI entity or DSH Session feature.

The only MVP entry is the server-parsed `/project <projectRef>` directive. The validated `projectRef` travels through the request execution context, Tool Bridge, ToolRegistry, AgentHost, Job, Capture/Ingest Workflow, Proposal and new canonical Note. Project creation and status changes remain Job-bound writes; only `active` Projects can bind new ordinary Jobs, while every lifecycle state may remain referenced by historical Notes. A queued or already-created historical Workflow may finish against a non-active Project only after Owner, Workflow and Job Project identity checks; this does not reopen the Project for new ordinary work.

`DeepSeekHarnessSessionBindingStore` does not inherit Project state. The next message, Session or channel must explicitly provide the directive again. Retrieval receives Project context internally and applies only the fixed same-Project `PROJECT_BOOST = 3`; it does not hard-filter, penalize other Projects or change no-Project search behavior. Read-side listings and durable PendingDecision/AcceptedRequest/Unknown Case/Reconciliation views are filtered by server-owned Owner and, when explicitly selected, Project. A bare follow-up cannot inherit a Project from Job or Session history. Existing Notes are not batch-migrated, and existing append/link operations do not rewrite their Project relations in this MVP.

Job ID 直达的 advice、approve、reject、cancel、retry 等操作在服务端重新校验 Owner；Project-bound 的 approve/reject/cancel/retry 还必须匹配正文首行的显式 Project，客户端不能直接提交 `projectRef`。旧微信批准命令遵循同一边界。当前 Web 页面即将重构，不定义本 MVP 的 UI/DOM 验收契约，测试文件、Schema 和服务端运行时隔离测试才是 Project MVP 的验收事实源。

External integrations are true external dependencies. Their transports are injected, and contract tests use Fake Adapters.

## Transaction boundary

Every repository write runs in a dedicated `syno/job/<job-id>` branch and worktree. After execution, Syno classifies the real Git diff instead of trusting the request label:

1. Explicit, policy-allowed writes execute automatically in an isolated worktree.
2. Duplicate content, multiple valid destinations or insufficient information pause as a `PendingDecision`; risk alone does not recreate an approval gate.
3. Source-root scope creep, disabled self-modification and disabled system control fail closed.
4. GitGuard records the candidate commit SHA and diff hash, refuses a changed branch and merges only the validated SHA.
5. Deferred effects such as Feishu calendar calls run only after the validated Markdown merge; their result is reconciled back into Markdown.

Job files and immutable events are the recovery log. Per-job locks serialize state transitions and atomically lease `waiting_provider` retries, while request keys make retried channel messages idempotent.

## Runtime locations

- Repository truth: `vault/`, `ops/`, `config/`, `contracts/`.
- Rebuildable cache: `.runtime/`.
- Secrets: `%LOCALAPPDATA%\Syno\credentials`.
- Durable local execution state, channel delivery and encrypted recovery payloads: `%LOCALAPPDATA%\Syno\state`.
- All write worktrees: `.worktrees/syno-job-<id>`.

Harness conversation bindings expire after 30 days; confirmed raw voice remains 7 days, failed payloads 30 days, and unfinished jobs remain until terminal state. Model outage never switches provider or runtime: deterministic local features continue and LLM jobs remain durable for retry.

The single-Host proactive path is `SignalEngine → PriorityEngine → ProactiveOrchestrator → CognitiveRuntime`.

微信与飞书是主要日常入口。用户可见 ACK 只能在请求进入可恢复事实源后发送；最终结果默认回到原始渠道。Web 是配置、诊断、桌面接管和完整审计入口，不是普通对话、写入或歧义决策的必经界面。完整边界见 ADR 0003–0005。
