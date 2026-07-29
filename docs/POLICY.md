# Deterministic policy

Syno enables exactly one product `CognitiveRuntime`. The default implementation is `OpenCodeCognitiveRuntime`; the native implementation remains inactive only until the R6 evidence gate and is never an automatic fallback. Syno owns the fixed model chain and may advance only for an enumerated transient/contract failure before any irreversible effect. The model never chooses a provider, model, permission, risk level, approval count, wake-up time or retry escalation.

| Action | Execution | Workspace | Notes |
|---|---|---|---|
| read/search/chat/review | auto | repository | no fact-source writes |
| whitelisted reminder or display preference | auto | local settings | reversible low risk |
| create ops record / new note / overwrite / move / delete / new MOC / new tag | auto | worktree | trust-but-clarify: default execute; schema + exact-path validation; audit on high-risk/MOC diffs |
| ingest with no conflict | auto | worktree | additive + no unresolved → write immediately, diff-hash audit event |
| ingest with conflict (duplicate / multi-option / missing info) | paused for clarification | worktree | system ambiguity only; four-option clarification; diff-digest anti-forgery preserved |
| source-code change (`code_change`) | switch-gated | worktree | `policy.allowSelfModify`, default off → denied; on → execute |
| system control (`system_control`) | switch-gated | audit-only | `policy.allowSystemControl`, default off → denied |
| non-`code_change` diff touching source roots | hard reject | — | model scope creep; the only remaining hard reject |

`ops/jobs` is a durable, mutable recovery snapshot; `ops/events` is the append-only immutable canonical audit sequence. JobStore writes both directly before a worktree exists, updating the Job snapshot for recovery while emitting an event for every transition. This is not domain-write authority: requested `vault/` and non-audit `ops/` changes still use the declared worktree, validators, and an audited merge. `system_control` uses this audit-only boundary and receives no writable repository root.

Public requests cannot supply intent, Profile, risk, approval, executor or ToolRegistry data. The operation registry maps public modes to canonical operations. The `approval` field is now a constant (`none`); the actual Git diff no longer pushes a job back to a second approval — it is either audited and merged or hard-rejected at the source-root boundary.

Agent-adjustable settings are limited to reminders, notification cadence, quiet hours, review counts, display ordering and interface preferences. Model ID, budget, channels, calendar, owner allowlist, retention and action allowlist require user confirmation. The two safety switches `policy.allowSelfModify` / `policy.allowSystemControl` are also user-confirmation-gated and never Agent-modifiable; both default to off. Provider endpoint/token, Policy, allowed roots, ToolRegistry, approval/security rules, source and schemas are never Agent-modifiable.

Learning mastery requires an approved `LearningEvidence` carrying an actual Owner-authored raw output Artifact. A caller-supplied Artifact reference, AI draft or unapproved intake payload cannot increase mastery. Ingest payloads and proposals remain rebuildable local state until conflict is resolved; an additive, unambiguous ingest writes `ops/` or `vault/` directly, while a conflicting one pauses for a four-option clarification before the isolated Job writes.

Web, Weixin iLink and Feishu share one bound Owner and the same permissions. Any channel may command the butler directly; only a system-detected ambiguity (duplicate, multi-option, missing info) pauses for clarification, and the bound Owner resolves it from any channel without a six-digit code. Where a clarification is bound to a diff digest, the authoritative digest is re-checked before confirmation so a changed diff cannot be silently applied. Groups and unknown senders cannot resolve decisions. Web remains an optional full-diff console. Low-risk automation is bounded by a deterministic whitelist and a default budget of three proactive notifications per day.
