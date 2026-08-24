# Syno operational truth

All directories below are durable Markdown records. Terminal states are retained under their creation year/month and are not deleted.

- `jobs/`: stateful work requests and approvals
- `actions/`: deterministic side effects
- `content/`: ContentIdea and ContentBrief records
- `memory/`: MemoryProposal records
- `artifacts/`: intake snapshots and quarantined attachments
- `events/`: immutable lifecycle events
- `projects/`: durable Project records at `ops/projects/<projectRef>.md`; terminal records are retained and there is no physical delete

