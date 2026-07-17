# Syno architecture

## Data flow

```text
Web / Weixin / Scheduler
        │
        ▼
   Channel Gateway ── allowlist / dedupe / normalization
        │
        ▼
     AgentHost ── Session / Job lifecycle / approval
        │
        ▼
      Policy ── pure deterministic decision
        │
        ▼
 Executor Router ── OpenCode → fallback → Claude Code
        │
        ▼
 Validator / GitGuard ── isolated diff / exact commit / pinned merge
        │
        ▼
  vault + ops + immutable events
```

## Deep modules

- `SynoCore.execute/snapshot` is the application interface. Callers do not learn storage, index or Git details.
- `AgentHost.receive/inspect/cancel/approve` owns the Job lifecycle but delegates all model loops to an Executor Adapter.
- `Policy.evaluate` is in-process and pure. Model output never changes Profile, approval count or escalation rules.
- `OperationRegistry` binds every writable HTTP/API operation to a canonical intent. Public callers cannot supply Profile, risk, approval or executor decisions.
- `Executor.submit/inspect/cancel` has OpenCode, Claude and Fake Adapters at a real seam.
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
