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
 SynoCore / AgentHost ── Policy / Job lifecycle / approval
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
- `CognitiveRuntime` is the only model-loop seam: `run(request)`, `cancel(runId)`, `health()` and `capabilities()`. The active native adapter wraps `ToolLoopAgent`. The pinned Hermes adapter remains inactive test/spike code after failing the Provider single-endpoint gate and cannot be selected.
- A runtime uses one fixed OpenAI-compatible model and cannot select providers, permissions or approval levels. Runtime selection is explicit, mutually exclusive and has no automatic fallback.
- `ToolRegistry.resolve` exposes only schema-validated Syno capabilities; shell, arbitrary files, browser, Git and source editing are never tools.
- `ProviderClient.complete` owns non-streaming `chat/completions`, authentication, timeout, cancellation and structured errors.
- `ConversationStore` keeps recoverable local conversation and retry state with explicit, separately enforced chat/raw-voice/failed-payload retention.
- `ConversationRouter.resolve` maps the single Owner and an optional explicit thread key to one canonical Conversation ID across Web, Weixin and Feishu. `ConversationStore.runExclusive` serializes each routed conversation so concurrent channel messages cannot lose context.
- `SignalSourceRegistry.collect` is the deterministic seam for due volatile Claims, pending ingestion, output opportunities and knowledge-maintenance events. The model cannot invent or self-schedule a signal.
- `IngestService` keeps unapproved source payloads and proposals in rebuildable local state. Only an approved Job writes the Artifact, InboxCandidate, IngestProposal and resulting Note into `ops/`/`vault/` in one isolated diff.
- `LearningService.record` requires the Owner's actual raw output and creates its Artifact in the same approved diff as LearningEvidence; a caller-supplied reference alone cannot increase mastery.
- `OutputService.progress` owns the suggested → accepted → drafting/practiced → published/dismissed lifecycle and retains the Owner's draft Artifact plus feedback.
- `StateArchive` exports only non-credential local state, records a versioned SHA-256 manifest and restores only into an empty target.
- `SynoCore.execute/snapshot` is the application interface. Callers do not learn storage, index or Git details.
- `AgentHost.receive/inspect/cancel/approve` owns the Job lifecycle but delegates all model loops to an Executor Adapter.
- `Policy.evaluate` is in-process and pure. Model output never changes Profile, approval count or escalation rules.
- `OperationRegistry` binds every writable HTTP/API operation to a canonical intent. Public callers cannot supply Profile, risk, approval or executor decisions.
- Legacy OpenCode/Claude executors remain only while V1 operations are migrated. They are not the product Agent runtime and are removed from user-facing code operations.
- `ChannelAdapter.start/stop/send/status` has Web, Windows, Weixin and Fake Adapters.
- `CalendarAdapter` has Markdown, Lark and Fake Adapters. macOS is deliberately absent.

External integrations are true external dependencies. Their transports are injected, and contract tests use Fake Adapters.

## Transaction boundary

Every write runs in a dedicated `syno/job/<job-id>` branch and worktree. After execution, Syno classifies the real Git diff instead of trusting the request label:

1. Pure additive, non-sensitive diffs may merge after the initial approval.
2. Modification, deletion, rename or sensitive-path diffs pause with a Markdown preview and require a second Web approval.
3. The approval records both the candidate commit SHA and diff hash. GitGuard refuses a changed branch and merges only that pinned SHA.
4. Deferred effects such as Feishu calendar calls run only after the approved Markdown merge; their result is reconciled back into Markdown.

Job files and immutable events are the recovery log. Per-job locks serialize state transitions, and request keys make retried channel messages idempotent.

## Runtime locations

- Repository truth: `vault/`, `ops/`, `config/`, `contracts/`.
- Rebuildable cache: `.runtime/`.
- Secrets and iLink session state: `%LOCALAPPDATA%\Syno\credentials` and `%LOCALAPPDATA%\Syno\state`.
- All write worktrees: `.worktrees/syno-job-<id>`.

Conversation defaults are 30 days for completed chat, 7 days for confirmed raw voice, 30 days for failed payloads, and until terminal state for unfinished work. Provider outage never changes provider or model: deterministic local features continue and LLM jobs remain durable for retry.

The Worker product path is `SignalEngine → PriorityEngine → ProactiveOrchestrator → CognitiveRuntime`. The historical `Scheduler` remains only for legacy regression coverage and is not used to wake the product Agent.
