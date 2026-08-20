# Security model

## Cognitive runtime boundary

Only one `CognitiveRuntime` may be active: `DeepSeekHarnessCognitiveRuntime`. Chat may use sandboxed `workspace-write` tools plus the static `syno_*` bridge; capture/ingest analysis uses a second sidecar with no bash/fs/web. `sourceWrite`, dynamic MCP, model self-selection and silent runtime fallback remain forbidden. Tool requests that hit `syno_*` return to Node for schema validation, Policy, Approval and GitGuard via `POST /api/syno/bridge/mcp`. Runtime failure is persisted and never triggers a silent fallback.

The supervised Harness sidecar is launched from `SYNO_DSH_ROOT`, receives `DEEPSEEK_API_KEY` only through the child environment, and is terminated only through its owned PID tree. Credentials never appear in arguments, repository state or API output.

Conversation migration admits only a redacted summary and recent Owner messages; tool/system/assistant turns, private/sensitive markers and credential-like patterns are excluded. Model fallback aborts the current request first and is disabled if abort cannot be confirmed or any validated write attempt occurred.

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
- Provider failure is fail-closed: the provider and runtime never change. Syno may try the next member of the fixed DeepSeek chain only for enumerated transient/contract errors before side effects; otherwise the LLM job waits durably.
- Background and manual recovery of a `waiting_provider` Job share one process/file lock and atomically transition it to `running`; a second caller cannot execute the same Job.
- HTTP responses set a restrictive CSP, MIME sniffing protection, frame denial and referrer/permissions policies.
- Weixin Bot Token and reply context tokens use Windows DPAPI under the credentials root; only cursor and deduplication markers enter non-credential state archives. Legacy plaintext credential JSON is migrated once and rewritten without secrets. Polling uses an inter-process lock, durable cursor ordering and post-delivery deduplication. Attachments accept only exact Tencent CDN hosts, are streamed with a 10 MB plaintext limit, decrypt the protocol's validated AES-128-ECB key when present, then pass signature/MIME checks and remain unread in quarantine. Missing `full_url` may only fall back to the fixed official Tencent CDN path.
- Feishu accepts only the bound Owner's p2p events. Normalized pending events are retained for at most 30 days, durable dedupe is written only after Agent handling and reply both succeed, and failed events recover after retry or restart. The SDK receives a no-output logger so network error objects cannot persist request bodies or App Secret. Knowledge facts remain in `vault/`, never in a channel-specific store.
- A Feishu reply returning `delivered: false` is treated as a retryable failure and remains pending; a resolved Promise alone is not delivery evidence.
- Conversation routing uses the canonical single-Owner identity, not a channel-supplied identity claim. Each routed conversation executes under an exclusive local lock to avoid lost context across Web and channel processes.
- Syno cannot modify its source. Codex is the external development authority; runtime may emit only BugReport and ImprovementProposal records.
- State archives exclude the credentials directory, use a versioned SHA-256 manifest, reject path traversal and never overwrite a non-empty restore target.
