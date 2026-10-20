# Syno operational truth

`ops/` is the repository's durable operational fact store. Records use their declared Markdown/JSON contracts; local caches and encrypted execution payloads are separate. Historical records do not imply their original product surface is still available.

- `jobs/`: stateful work requests and approvals
- `actions/`: Owner to-do actions, schedules, completion and archive state; not a proactive reminder service
- `content/`: retained ContentIdea, ContentBrief and OutputOpportunity records; daily inspiration and its stored cards were removed on 2026-10-17
- `memory/`: personal memory proposals and confirmed/replaced/revoked facts, isolated from ordinary knowledge search and publishing
- `artifacts/`: intake snapshots and quarantined attachments
- `events/`: immutable lifecycle events
- `knowledge/`: source/resource manifests, publish maps and knowledge lifecycle records
- `acceptance/`: dated validation evidence, with its runtime and coverage limits
- `projects/`: read-only historical Project records; the Project subsystem was removed on 2026-09-01

Domain changes pass through controlled Jobs and exact-path Git transactions. Forgetting personal memory cleans current readable content while preserving metadata and Git/chat/backup history. Production cloud publishing is enabled as of 2026-10-19; inspect per-target versions before claiming synchronization complete.

