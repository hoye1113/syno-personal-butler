# Deterministic policy

Syno enables exactly one product `CognitiveRuntime`. The default implementation is `OpenCodeCognitiveRuntime`; the native implementation remains inactive only until the R6 evidence gate and is never an automatic fallback. Syno owns the fixed model chain and may advance only for an enumerated transient/contract failure before any irreversible effect. The model never chooses a provider, model, permission, risk level, approval count, wake-up time or retry escalation.

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

The bound Owner may approve through a Weixin or Feishu private conversation. A single unambiguous low-risk decision accepts a natural confirmation; multiple decisions require an index or code. Existing-file changes, deletion, rename and other high-risk changes require a real isolated diff followed by `确认应用 <六位码>`, bound to the same Owner/thread, expiry and diff digest. Groups and unknown senders cannot approve. Web remains an optional full-diff console. Low-risk automation is bounded by a deterministic whitelist and a default budget of three proactive notifications per day.
