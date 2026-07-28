# Security model

## Cognitive runtime boundary

Only one `CognitiveRuntime` may be active. `OpenCodeCognitiveRuntime` fails closed unless Terminal, direct file/source writes, model selection, sharing, dynamic MCP and delegation are disabled, and its visible Syno tool list matches the static bridge allowlist. OpenCode runs in an isolated empty workspace and receives explicit per-message tool denials in addition to global configuration denial. It never receives filesystem, Shell, Git, approval or configuration authority; tool requests return to Node for schema validation, Policy, Approval and GitGuard. Runtime failure is persisted and never triggers a silent runtime or provider fallback.

The supervised OpenCode child is version-locked to 1.18.2, listens only on `127.0.0.1:4318`, requires a random per-process Basic Auth password and is terminated only through its owned PID tree. The mise shim is never a valid launch target. Zen credentials are independently DPAPI-protected; the decrypted token is referenced through child-process environment-backed inline configuration and never appears in arguments, repository state, OpenCode auth files or API output.

Interactive CLI credential entry uses a no-echo Windows secure prompt. Legacy conversation migration admits only a redacted summary and recent Owner messages; tool/system/assistant turns, private/sensitive markers and credential-like patterns are excluded. Model fallback aborts the current OpenCode request first and is disabled if abort cannot be confirmed or any validated write attempt occurred.

- Localhost only; non-loopback HTTP requests are rejected for mutation routes.
- Secrets never live in the repository.
- External messages are untrusted input. They cannot alter Policy or Profile.
- Attachments require scheme/host allowlist, size limit, MIME sniffing and quarantine storage.
- Weixin groups are disabled. Unknown direct messages require pairing and cannot execute work.
- Every domain-fact write happens in an isolated worktree. Only a pure additive low-risk diff may merge after its initial approval.
- The durable, mutable `ops/jobs` recovery snapshot and append-only immutable `ops/events` audit sequence are the sole control-plane persistence exception: JobStore updates the Job snapshot for recovery and emits an immutable event for every transition before execution, so approvals, failures and cancellation remain durable. They may describe an operation but never contain or apply its knowledge/action diff; all non-audit `ops/` and `vault/` writes still use a worktree and validators.
- Mutation routes use a server-owned operation registry; clients cannot spoof intent, Profile, risk or approval decisions.
- Existing-file changes, deletion, rename and sensitive paths are promoted from the actual Git diff to a pinned second approval.
- Git staging receives an explicit path list and rejects paths outside allowed roots.
- Executor prompts are written to a local task file; user text is never interpolated into a shell command.
- The product model receives only ToolRegistry tools. It never receives shell, arbitrary filesystem, browser, direct Git, direct Markdown-write or source-edit capabilities.
- Provider credentials use Windows DPAPI under `%LOCALAPPDATA%\Syno\credentials`; the API and logs expose only `configured` status and non-secret metadata.
- Provider failure is fail-closed: the provider and runtime never change. Syno may try the next member of the fixed three-model OpenCode chain only for enumerated transient/contract errors before side effects; otherwise the LLM job waits durably.
- Background and manual recovery of a `waiting_provider` Job share one process/file lock and atomically transition it to `running`; a second caller cannot execute the same Job.
- HTTP responses set a restrictive CSP, MIME sniffing protection, frame denial and referrer/permissions policies.
- Weixin Bot Token and reply context tokens use Windows DPAPI under the credentials root; only cursor and deduplication markers enter non-credential state archives. Legacy plaintext credential JSON is migrated once and rewritten without secrets. Polling uses an inter-process lock, durable cursor ordering and post-delivery deduplication. Attachments accept only exact Tencent CDN hosts, are streamed with a 10 MB plaintext limit, decrypt the protocol's validated AES-128-ECB key when present, then pass signature/MIME checks and remain unread in quarantine. Missing `full_url` may only fall back to the fixed official Tencent CDN path.
- Feishu accepts only the bound Owner's p2p events. Normalized pending events are retained for at most 30 days, durable dedupe is written only after Agent handling and reply both succeed, and failed events recover after retry or restart. The SDK receives a no-output logger so network error objects cannot persist request bodies or App Secret. Knowledge facts remain in `vault/`, never in a channel-specific store.
- A Feishu reply returning `delivered: false` is treated as a retryable failure and remains pending; a resolved Promise alone is not delivery evidence.
- Conversation routing uses the canonical single-Owner identity, not a channel-supplied identity claim. Each routed conversation executes under an exclusive local lock to avoid lost context across Web and channel processes.
- Syno cannot modify its source. Codex is the external development authority; runtime may emit only BugReport and ImprovementProposal records.
- State archives exclude the credentials directory, use a versioned SHA-256 manifest, reject path traversal and never overwrite a non-empty restore target.
