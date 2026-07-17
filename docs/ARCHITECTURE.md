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
 Validator / GitGuard ── exact changed paths / local commit
        │
        ▼
  vault + ops + immutable events
```

## Deep modules

- `SynoCore.execute/snapshot` is the application interface. Callers do not learn storage, index or Git details.
- `AgentHost.receive/inspect/cancel/approve` owns the Job lifecycle but delegates all model loops to an Executor Adapter.
- `Policy.evaluate` is in-process and pure. Model output never changes Profile, approval count or escalation rules.
- `Executor.submit/inspect/cancel` has OpenCode, Claude and Fake Adapters at a real seam.
- `ChannelAdapter.start/stop/send/status` has Web, Windows, Weixin and Fake Adapters.
- `CalendarAdapter` has Markdown, Lark and Fake Adapters. macOS is deliberately absent.

External integrations are true external dependencies. Their transports are injected, and contract tests use Fake Adapters.

## Runtime locations

- Repository truth: `vault/`, `ops/`, `config/`, `contracts/`.
- Rebuildable cache: `.runtime/`.
- Secrets and iLink session state: `%LOCALAPPDATA%\Syno\credentials` and `%LOCALAPPDATA%\Syno\state`.
- High-risk worktrees: `.worktrees/syno-job-<id>`.

