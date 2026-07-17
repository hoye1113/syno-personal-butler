# Deterministic policy

| Intent | Profile | Approval | Workspace | Executor |
|---|---|---:|---|---|
| read/search/chat | syno-read | none | repository | OpenCode |
| create ops/content | syno-ops | single | repository | OpenCode |
| create canonical note | syno-curate | single | repository | OpenCode |
| overwrite/move/delete/new MOC/new tag | syno-curate | double | worktree | Claude Code |
| code change | syno-code | double | worktree | Claude Code |

OpenCode only falls back for `timeout`, `unavailable`, `invalid_json` or `schema_failure`. All other failures remain visible and do not silently change models.

微信只能批准 `single` 且风险为 `low` 的 Job。双审批、代码和 destructive Job 必须在 Web UI 完成。

