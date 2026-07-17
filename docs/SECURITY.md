# Security model

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
- Claude runs without session persistence, Chrome, slash commands or inherited MCP servers, with a fixed allowed-tool list and no model argument.
- HTTP responses set a restrictive CSP, MIME sniffing protection, frame denial and referrer/permissions policies.
- Weixin polling uses an inter-process lock, durable cursor ordering and post-delivery deduplication. Attachments accept only exact Tencent CDN hosts, are streamed with a 10 MB limit, signature/MIME checked and left unread in quarantine.
