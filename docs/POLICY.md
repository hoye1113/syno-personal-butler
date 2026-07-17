# Deterministic policy

| Intent | Profile | Initial approval | Workspace | Executor |
|---|---|---:|---|---|
| read/search/chat | syno-read | none | repository | OpenCode |
| create ops/content | syno-ops | single | worktree | OpenCode |
| create canonical note | syno-curate | single | worktree | OpenCode |
| overwrite/move/delete/new MOC/new tag | syno-curate | double | worktree | Claude Code |
| code change | syno-code | double | worktree | Claude Code |

OpenCode only falls back for `timeout`, `unavailable`, `invalid_json` or `schema_failure`. All other failures remain visible and do not silently change models.

请求中的 `intent`、Profile、风险或审批字段都不是 Policy 输入。HTTP 入口只能选择公开的 `mode`，由 `OperationRegistry` 映射为固定操作。写入执行后再按真实 Git diff 升级审批：只要修改、删除、重命名或触及敏感路径，就必须停在合并阶段等待第二次 Web 批准。

微信只能批准 `single` 且风险为 `low` 的 Job。双审批、代码和 destructive Job 必须在 Web UI 完成。
