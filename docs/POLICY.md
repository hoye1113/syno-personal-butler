# Deterministic policy

Syno enables exactly one `CognitiveRuntime` and one configured model ID. The active implementation is `NativeCognitiveRuntime` around `ToolLoopAgent`; pinned Hermes `0.18.2` failed the Provider-surface hard gate and is not selectable. Runtimes never run in parallel and never silently fall back to each other. The model never chooses a provider, permission, risk level, approval count, wake-up time or retry escalation.

| Action | Initial approval | Workspace | Notes |
|---|---:|---|---|
| read/search/chat/review | none | repository | no fact-source writes |
| whitelisted reminder or display preference | none | local settings | reversible low risk |
| create ops record or new ordinary note | single | worktree | schema and exact-path validation |
| overwrite/move/delete/new MOC/new tag | double | worktree | pinned diff and Web approval |
| source-code change | denied | none | Syno may only create BugReport/ImprovementProposal |

`ops/jobs` is a durable, mutable recovery snapshot; `ops/events` is the append-only immutable canonical audit sequence. JobStore writes both directly before a worktree exists, updating the Job snapshot for recovery while emitting an event for every transition. This is not domain-write authority: requested `vault/` and non-audit `ops/` changes still use the declared worktree, validators and merge approval. `system_control` uses this audit-only boundary and receives no writable repository root.

Public requests cannot supply intent, Profile, risk, approval, executor or ToolRegistry data. The operation registry maps public modes to canonical operations. After execution, the actual Git diff may only increase risk.

Agent-adjustable settings are limited to reminders, notification cadence, quiet hours, review counts, display ordering and interface preferences. Model ID, budget, channels, calendar, owner allowlist, retention and action allowlist require user confirmation. Provider endpoint/token, Policy, allowed roots, ToolRegistry, approval/security rules, source and schemas are never Agent-modifiable.

Learning mastery requires an approved `LearningEvidence` carrying an actual Owner-authored raw output Artifact. A caller-supplied Artifact reference, AI draft or unapproved intake payload cannot increase mastery. Ingest payloads and proposals remain rebuildable local state until an explicit `IngestDecision` is approved; only then may the isolated Job write `ops/` or `vault/`.

Weixin may approve only a low-risk single-approval Job. Double approval and destructive operations require Web. Low-risk automation is bounded by a deterministic whitelist and a default budget of three proactive notifications per day.
