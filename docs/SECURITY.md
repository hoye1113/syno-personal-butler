# Security model

Current boundary: 2026-10-20. Policy authority is [AGENTS.md](../AGENTS.md) and [POLICY.md](POLICY.md); this document describes the implementation boundary, not an additional permission grant.

## Cognitive runtime and tools

The only product runtime is `DeepSeekHarnessCognitiveRuntime`. Syno owns the fixed Kimi Code chain `kimi-coding/kimi-for-coding` → `kimi-coding/k3-256k`. The model cannot choose providers, fallback targets or permissions. Only enumerated transient/contract failures before irreversible effects allow another attempt; an unconfirmed abort or validated write attempt prevents unsafe fallback. Exhaustion leaves model-dependent Jobs in `waiting_provider`.

Production runs supervised `dsh --profile syno --host 127.0.0.1 --port 3088 --no-open`. `dsh web` is the stock web profile and is not the production entrypoint. The controlled preset exposes the governed knowledge trio, `web_search`, `skill` and 25 Host-controlled business tools. It exposes no shell, filesystem, general fetch, Git, source editing, session scheduler or sub-Agent capability. Capture/ingest analysis uses a separate JSON-RPC sidecar with no bash/fs/web; mechanical browser tools are issued only through the capture allowlist.

Search uses the in-repository Syno chain (doubao → tavily → exa → parallel, routed by query language). Specific webpage reads use `syno_knowledge_fetch_url` with SSRF, source-quality and sensitive-content checks. Webpages, search results, attachments and forwarded messages are untrusted data; their embedded instructions cannot change identity, Policy or the next action's authority.

The DSH permission table contains only `workspace-write` plus `approval: never`. This does not expose terminal/filesystem tools or authorize repository source changes. Do not add `danger-full-access`, invisible approval prompts, dynamic MCP or marketplace plugins. `syno-lab` remains isolated from production Bridge, channels and canonical facts; Mnemon data is experimental context and must contain no credentials or raw sensitive logs.

## Owner and mutation authority

- Host HTTP is loopback-only and validates the Host header. Port 8888 exposes only the explicit API allowlist, with no old workbench UI; port 3088 is a privileged authenticated DSH surface. Launch/Bridge credentials must not enter logs, arguments or repository files. DSH events use WebSocket, not SSE.
- Feishu accepts only the bound Owner's p2p events. Group authorization and the Weixin stack are absent. SDK logging suppresses request bodies and secrets.
- Host-routed tools bind Owner, thread, original message, Harness session and temporary attachment IDs outside model arguments. The model cannot supply its own trusted identity, risk level, Profile or approval decision.
- Clear knowledge and task requests execute through canonical operations, Jobs, isolated worktrees, validators and GitGuard without routine approval prompts. Memory activation and correction require a later Owner confirmation. Knowledge deletion/merge and cloud conflict overwrite require a version-bound preview and a later authenticated Owner message; an independent tool-free confirmation profile cannot grant itself authority.
- Execution and pre-merge checks revalidate Owner, target versions, grant scope and the pinned commit. Product D9 rejects source edits and system control unconditionally. Owner-authorized development remains a separate process.
- JobStore recovery snapshots and immutable lifecycle events persist control-plane state; they cannot apply a knowledge diff. Domain writes use the isolated transaction. Staging receives only declared precise `vault/**` and `ops/**` paths; automatic push is forbidden.
- HTTP responses set a restrictive CSP, MIME sniffing protection, frame denial and a referrer policy. User text is never interpolated into a shell command.
- Per-job and session locks serialize execution and retries. Effect receipts and argument-sensitive invocation IDs prevent replay from silently repeating a known write. Unknown external effects require reconciliation.

## Attachments, memory and publishing

Files pass size, MIME and quarantine checks before model access. Temporary attachment IDs are scoped to Owner/channel/thread, encrypted at rest and expire after 24 hours. The model cannot use an attachment ID to read an arbitrary path. Owner images are delivered as native image blocks; explicit image capture additionally uses the same Kimi chain for tool-free transcription. The removed Zen/image.read path is not a fallback.

Personal memory is canonical only in `ops/memory/`; it is excluded from ordinary knowledge search and Wiki/catalog publishing. Forgetting clears current readable payloads without rewriting Git, chat or backup history. Sensitive, excluded, quarantined and invalid-source notes cannot enter ordinary remote-model knowledge reads.

Production publishing was activated with Owner authorization on 2026-10-19. Development remains disabled by default; sandbox requires confirmed isolated targets. Persistent publish maps, per-note writer leases, content/resource versions, remote fingerprints and recovery journals protect against duplicate creation or overwriting human edits. Completion requires Wiki, required native images and catalog to match the same source version. Unknown outcomes reconcile read-only; unresolved identity remains unknown. See [P1 acceptance](KNOWLEDGE-FEISHU-P1.md).

## Credentials and recovery

Secrets never live in tracked repository content. Windows uses current-user DPAPI; macOS uses a login-Keychain master key and AES-256-GCM envelopes. API/log output includes only safe status and metadata. Kimi/search keys come from Host environment or gitignored `.env`, never command arguments. State archives exclude credentials, verify a versioned SHA-256 manifest, reject path traversal and restore only to an empty target.

Syno does not proactively push or replay historical chat replies after restart. User-requested ingestion/publication can still recover and return workflow results; provider acceptance of a result does not prove the Owner read it. Retention must not erase unfinished or unknown effects. External text must cross child-process stdio as ASCII/Base64 or explicit UTF-8, following the encoding contract in AGENTS.md.
