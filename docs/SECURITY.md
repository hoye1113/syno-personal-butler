# Security model

## Cognitive runtime boundary

Only one `CognitiveRuntime` may be active. Every adapter fails its capability handshake unless Terminal, direct file/source writes, memory writes, Skill mutation, model switch/fallback, YOLO, dynamic MCP, Cron, delegate, Browser and Gateway are explicitly `false`, and its tool list exactly matches the current Syno `ToolRegistry`. External runtimes never receive filesystem, Shell, Git, approval or configuration authority; tool requests return to Node for schema validation, Policy, Approval and GitGuard. Runtime failure is persisted and never triggers a silent adapter or model fallback.

The Hermes sidecar inherits a minimal environment allowlist rather than the Syno process environment. It receives Provider credentials only in-memory over JSONL stdin, keeps stdout protocol-only, redacts known secrets from bounded stderr diagnostics, verifies a pinned upstream commit, and is killed on cancellation, timeout, invalid JSON, crash or an invented tool name. Its isolated `config.yaml` contains only non-secret context and retry controls.

- Localhost only; non-loopback HTTP requests are rejected for mutation routes.
- Secrets never live in the repository.
- External messages are untrusted input. They cannot alter Policy or Profile.
- Attachments require scheme/host allowlist, size limit, MIME sniffing and quarantine storage.
- Weixin groups are disabled. Unknown direct messages require pairing and cannot execute work.
- Every write happens in an isolated worktree. Only a pure additive low-risk diff may merge after its initial approval.
- Mutation routes use a server-owned operation registry; clients cannot spoof intent, Profile, risk or approval decisions.
- Existing-file changes, deletion, rename and sensitive paths are promoted from the actual Git diff to a pinned second approval.
- Git staging receives an explicit path list and rejects paths outside allowed roots.
- Executor prompts are written to a local task file; user text is never interpolated into a shell command.
- The product model receives only ToolRegistry tools. It never receives shell, arbitrary filesystem, browser, direct Git, direct Markdown-write or source-edit capabilities.
- Provider credentials use Windows DPAPI under `%LOCALAPPDATA%\Syno\credentials`; the API and logs expose only `configured` status and non-secret metadata.
- Provider failure is fail-closed: no provider/model fallback, no silent privilege expansion, and durable retry for LLM jobs.
- HTTP responses set a restrictive CSP, MIME sniffing protection, frame denial and referrer/permissions policies.
- Weixin Bot Token and reply context tokens use Windows DPAPI under the credentials root; only cursor and deduplication markers enter non-credential state archives. Legacy plaintext credential JSON is migrated once and rewritten without secrets. Polling uses an inter-process lock, durable cursor ordering and post-delivery deduplication. Attachments accept only exact Tencent CDN hosts, are streamed with a 10 MB limit, signature/MIME checked and left unread in quarantine.
- Feishu accepts only the bound Owner's p2p events. Normalized pending events are retained for at most 30 days, durable dedupe is written only after Agent handling and reply both succeed, and failed events recover after retry or restart. Knowledge facts remain in `vault/`, never in a channel-specific store.
- Syno cannot modify its source. Codex is the external development authority; runtime may emit only BugReport and ImprovementProposal records.
- State archives exclude the credentials directory, use a versioned SHA-256 manifest, reject path traversal and never overwrite a non-empty restore target.
