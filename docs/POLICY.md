# Deterministic policy

Syno enables exactly one product `CognitiveRuntime`: `DeepSeekHarnessCognitiveRuntime`. There is no OpenCode, Claude or native rollback path. Syno owns the fixed model chain and may advance only for an enumerated transient/contract failure before any irreversible effect. The model never chooses a provider, model, permission, risk level, approval count, wake-up time or retry escalation.

## DSH Hub boundary

DSH owns the active conversation session and context compaction (the overlay disables `@deepseek-ai/dsh-schedule`; the Host runs no scheduler either). Syno remains the domain kernel for `vault/`, `ops/`, `contracts/`, Owner, Policy, Job, Proposal, GitGuard and EffectReceipt. DSH Runtime Memory, Documents and any Hub plugin data are convenience context, not Syno canonical facts.

The production profile pins the current official DSH base and web-app bundles plus `@syno/dsh-plugin`; the base supplies token meter/session services, the Syno overlay disables the official `@deepseek-ai/dsh-schedule` plugin (2026-10-17: the Host runs no scheduler), and Syno generates a controlled `syno` agent preset. The Supervisor explicitly sends `agentPreset: syno` when creating production Web sessions, so a user-level default cannot select the stock `standard` coding persona. The JSON-RPC chat surface mounts the same official token-meter, tool-result-pruner, compaction-basic and compact-command stack. It forbids marketplace `dsh plugin add`, dynamic MCP and `danger-full-access`. The `syno-lab` profile is isolated from the production Host: it may retain DSH CLI-installed experimental bundles such as `dsh-mnemon@0.2.13`, but has no Syno Bridge, Vault/ops write path or Feishu channel. Mnemon is lab-only until a separate security review and explicit policy change.

Ordinary chat receives the three governed knowledge reads, web_search, skill and the controlled business tools in `packages/syno-core/business-tools.mjs`. Natural-language business intent is handled in the same model loop; only explicit /new and /stop bypass it. No fixed business commands or knowledge.save alias exist. Queries and flow control do not create empty Jobs. Capture browser tools use a separate Host-issued allowlist.

Personal memory is canonical only in ops/memory. Proposal, later Owner confirmation, correction/replacement and forgetting use versioned records and owner isolation. Memory never becomes a vault note or a Wiki/catalog publication. Personal legacy references are excluded by typed provenance, not the generic memory topic tag.

Knowledge updates and moves execute clear requests. Deletion and merging require a concrete preview and a later authenticated Owner message. An independent, tool-free Kimi confirmation profile reads only the raw Owner message and persisted preview; the main model cannot mint authorization. Execution and pre-merge checks revalidate the grant, Owner, targets, versions and scope. Product D9 still rejects source changes; Owner-authorized development is separate.

Publishing is disabled during development. Sandbox requires explicitly confirmed isolated targets; production activation follows real acceptance and Owner release authorization. Persistent mappings, a single writer, content/resource versions, remote fingerprints and a metadata-only recovery journal prevent blind duplicate creation or overwriting human edits. Unknown effects only reconcile read-only. Source verification/login/error pages never complete or publish. Full graph completion requires every required image and all targets at the same version.

The Bridge and DSH plugin share the same tool-set names. DSH plugin data must not directly access `vault/`, `ops/`, source code, channel credentials or the delivery Outbox. `dsh-mnemon` external Memory Providers remain disabled; its current upstream package has no deterministic secret scanner, so tokens, cookies, private keys and raw sensitive logs must never be sent to it. Mnemon data is disposable experimental context and must not be promoted as a canonical fact without a Syno Proposal/Job.

## Owner isolation

- `ownerKey` is the isolation boundary for Goal/Job/Workflow/Note references and all durable clarification/recovery views. Read-side listings (`jobs.list`, `goals.list`) are Owner-scoped.
- Job ID 直达的 advice、approve、reject、cancel、retry 等操作必须在服务端重新校验 Owner；历史会话或旧渠道消息不能提供隐式授权。
- The Project subsystem (server-owned `projectRef`, `/project` directive, `projects.*` tools) was removed on 2026-09-01 (product-slimming D6). Historical `ops/projects/*.md` records stay read-only; no Project authorization path remains.

| Action | Execution | Workspace | Notes |
|---|---|---|---|
| Reads and overview | Direct | None | No empty Jobs |
| Memory and clear knowledge updates/moves | Controlled operation | Isolated worktree | Precise paths, version checked |
| Knowledge delete/merge | Preview then later Owner confirmation | Isolated worktree | One-message grant and executor validation |
| Product code/system changes | Rejected | None | D9 cannot be switched on |

Normal content writes retain three commit classes: content plus initial audit in the isolated tree, merge of the pinned SHA, and terminal Job/audit projection. Fsynced snapshots and a recovery journal hold intermediate states; unknown effects and unfinished recovery records cannot expire. Synchronization follow-up commits are counted separately. Encrypted terminal payloads expire after 30 days, verified terminal recovery journals after 90 days; identity metadata and tombstones remain.

All business dates and displayed times use Asia/Shanghai. Ordinary forgetting/deletion does not rewrite Git, chat, cloud history or backups. No automatic push, proactive reminders, historical reply replay or dynamic MCP is introduced.
