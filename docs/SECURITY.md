# Security model

## Cognitive runtime boundary

Only one `CognitiveRuntime` may be active. Every adapter fails its capability handshake unless Terminal, direct file/source writes, memory writes, Skill mutation, model switch/fallback, YOLO, dynamic MCP, Cron, delegate, Browser and Gateway are explicitly `false`, and its tool list exactly matches the current Syno `ToolRegistry`. External runtimes never receive filesystem, Shell, Git, approval or configuration authority; tool requests return to Node for schema validation, Policy, Approval and GitGuard. Runtime failure is persisted and never triggers a silent adapter or model fallback.

The Hermes sidecar inherits a minimal environment allowlist rather than the Syno process environment. It receives Provider credentials only in-memory over JSONL stdin, keeps stdout protocol-only, redacts known secrets from bounded stderr diagnostics, verifies a pinned upstream commit, and is killed on cancellation, timeout, invalid JSON, crash or an invented tool name. Its isolated `config.yaml` contains only non-secret context and retry controls.

- Localhost only; non-loopback HTTP requests are rejected for mutation routes.
- Secrets never live in the repository.
- External messages are untrusted input. They cannot alter Policy or Profile.
- Attachments require scheme/host allowlist, size limit, MIME sniffing and quarantine storage.
- Weixin groups are disabled. Unknown direct messages require pairing and cannot execute work.
- Every domain-fact write happens in an isolated worktree. Only a pure additive low-risk diff may merge after its initial approval.
- Append-only `ops/jobs` and `ops/events` are the sole control-plane audit exception: JobStore writes them before execution so approvals, failures and cancellation remain durable. They may describe an operation but never contain or apply its knowledge/action diff; all non-audit `ops/` and `vault/` writes still use a worktree and validators.
- Mutation routes use a server-owned operation registry; clients cannot spoof intent, Profile, risk or approval decisions.
- Existing-file changes, deletion, rename and sensitive paths are promoted from the actual Git diff to a pinned second approval.
- Git staging receives an explicit path list and rejects paths outside allowed roots.
- Executor prompts are written to a local task file; user text is never interpolated into a shell command.
- The product model receives only ToolRegistry tools. It never receives shell, arbitrary filesystem, browser, direct Git, direct Markdown-write or source-edit capabilities.
- Provider credentials use Windows DPAPI under `%LOCALAPPDATA%\Syno\credentials`; the API and logs expose only `configured` status and non-secret metadata.
- Provider failure is fail-closed: no provider/model fallback, no silent privilege expansion, and durable retry for LLM jobs.
- HTTP responses set a restrictive CSP, MIME sniffing protection, frame denial and referrer/permissions policies.
- Weixin Bot Token and reply context tokens use Windows DPAPI under the credentials root; only cursor and deduplication markers enter non-credential state archives. Legacy plaintext credential JSON is migrated once and rewritten without secrets. Polling uses an inter-process lock, durable cursor ordering and post-delivery deduplication. Attachments accept only exact Tencent CDN hosts, are streamed with a 10 MB plaintext limit, decrypt the protocol's validated AES-128-ECB key when present, then pass signature/MIME checks and remain unread in quarantine. Missing `full_url` may only fall back to the fixed official Tencent CDN path.
- Feishu accepts only the bound Owner's p2p events. Normalized pending events are retained for at most 30 days, durable dedupe is written only after Agent handling and reply both succeed, and failed events recover after retry or restart. The SDK receives a no-output logger so network error objects cannot persist request bodies or App Secret. Knowledge facts remain in `vault/`, never in a channel-specific store.
- A Feishu reply returning `delivered: false` is treated as a retryable failure and remains pending; a resolved Promise alone is not delivery evidence.
- Conversation routing uses the canonical single-Owner identity, not a channel-supplied identity claim. Each routed conversation executes under an exclusive local lock to avoid lost context across Web and channel processes.
- Syno cannot modify its source. Codex is the external development authority; runtime may emit only BugReport and ImprovementProposal records.
- State archives exclude the credentials directory, use a versioned SHA-256 manifest, reject path traversal and never overwrite a non-empty restore target.
