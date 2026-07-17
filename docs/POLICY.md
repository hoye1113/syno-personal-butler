# Deterministic policy

Syno uses one `ToolLoopAgent` and one configured model ID. The model never chooses a provider, permission, risk level, approval count, wake-up time or retry escalation.

| Action | Initial approval | Workspace | Notes |
|---|---:|---|---|
| read/search/chat/review | none | repository | no fact-source writes |
| whitelisted reminder or display preference | none | local settings | reversible low risk |
| create ops record or new ordinary note | single | worktree | schema and exact-path validation |
| overwrite/move/delete/new MOC/new tag | double | worktree | pinned diff and Web approval |
| source-code change | denied | none | Syno may only create BugReport/ImprovementProposal |

Public requests cannot supply intent, Profile, risk, approval, executor or ToolRegistry data. The operation registry maps public modes to canonical operations. After execution, the actual Git diff may only increase risk.

Agent-adjustable settings are limited to reminders, notification cadence, quiet hours, review counts, display ordering and interface preferences. Model ID, budget, channels, calendar, owner allowlist, retention and action allowlist require user confirmation. Provider endpoint/token, Policy, allowed roots, ToolRegistry, approval/security rules, source and schemas are never Agent-modifiable.

Weixin may approve only a low-risk single-approval Job. Double approval and destructive operations require Web. Low-risk automation is bounded by a deterministic whitelist and a default budget of three proactive notifications per day.
