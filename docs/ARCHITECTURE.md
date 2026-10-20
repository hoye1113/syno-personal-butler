# Syno architecture

## Data flow

```text
Feishu (chat) / DSH Web 3088 (authenticated, shared session)
        │
        ▼
   Channel Gateway ── allowlist / dedupe / normalization
        │
        ▼
 ChannelConversationHandler ── quarantine inputs / explicit /new and /stop controls
        │
        ▼
 CognitiveRuntime (DeepSeek Harness) ── one session per Owner/thread / bounded turns / native tool calls
        │
        ▼
 ToolRegistry ── schema / risk / permission / retry / version
        │
        ▼
   SynoCore / AgentHost ── Policy / Job lifecycle / ambiguity decision
        │
        ▼
 Validator / GitGuard ── isolated diff / exact commit / pinned merge
        │
        ▼
  vault + ops + immutable events
```

## Deep modules

- `work.overview` is the current chat overview: actual Owner actions, pending decisions, ingestion workflows and running Jobs. It does not invoke the daily planner. `TodayService`, `SignalSourceRegistry` and `PriorityEngine` remain internal/legacy services, not current public chat tools or allowlisted HTTP routes.
- `CognitiveRuntime` is the only model-loop seam: `run(request)`, `cancel(runId)`, `health()` and `capabilities()`. The only product implementation is `DeepSeekHarnessCognitiveRuntime` (`adapter: deepseek-harness-sdk`, v3). Production chat talks to a supervised `dsh --profile syno` Web process over loopback HTTP RPC plus one multiplexed WebSocket (`/api/remote.mux`; per-session `session/follow` logical streams carry durable events; 0.1.7 requires the launch-token cookie exchange first). Capture/ingest analysis uses the official DSH `sdk-minimal` profile over stdio JSON-RPC; its Syno overlay disables both persistent shell tools and adds only the Syno Tool Bridge. The explicit JSON-RPC chat fallback uses DSH's `sdk` profile. Tests and `SYNO_DSH_FAKE_AGENT` keep the JSON-RPC fake. The DSH clone at `vendor/deepseek-harness` (or external `SYNO_DSH_ROOT`) must be built (`pnpm run build`); `dsh web` boots the stock `web` profile, not production `syno`.
- DSH owns the conversational session and official compaction. Syno does not maintain a second active transcript or a second general-purpose memory provider. With the current Harness checkout, `@deepseek-ai/dsh-base` supplies the host token meter/session services, `@deepseek-ai/dsh-web-app` supplies the Web bundle, and `@deepseek-ai/dsh-schedule` is disabled by the `@syno/dsh-plugin` overlay (2026-10-17: no proactive scheduler; controlled ingestion/publication retries remain); the production `syno` profile pins those bundles. Syno generates a controlled `syno` agent preset under the Host-owned DSH home and the Web client explicitly creates Syno sessions with `agentPreset: syno`, so the stock `standard` coding persona is not selected for production Syno sessions. The JSON-RPC chat composition mounts the same official token-meter, tool-result-pruner, compaction-basic and compact-command stack. `syno-lab` keeps the base/web bundle and preserves DSH CLI-installed experimental dependencies without mounting the Syno Bridge.
- Syno deterministically selects one model attempt from the fixed Kimi Code chain (`kimi-coding/kimi-for-coding` → `kimi-coding/k3-256k`, through the DSH pi-ai `kimi-coding` catalog route; the key resolves from host env `KIMI_API_KEY` or the repo-root `.env`). The Agent cannot select providers, models, permissions or approval levels, and a retry is forbidden after an irreversible effect. Harness chat has no terminal, filesystem or generic fetch tools: the model sees Host-authenticated business tools (work overview, capture, actions, memory proposals, decisions), the governed knowledge trio (`knowledge.search` / `read_snippet` / `fetch_url`), `web_search` (Syno search chain doubao → tavily → exa → parallel per ADR 0009) and `skill` (2026-10-17 toolbar redesign); capture/ingest analysis uses a second sidecar with no bash/fs/web. Knowledge writes to `vault/` and `ops/` still go through Job / Proposal, Policy and GitGuard; product source writes remain forbidden. Owner-sent images are delivered straight into the session as image content blocks (the Kimi Code chain declares image input; 3MB raw cap per image, 2026-10-16), and the Host `image.read` tool was removed. Model-directed image capture additionally transcribes the picture through the same Kimi chain (capture sidecar, no tools) to produce the text that enters the vault. The production permission table contains only `workspace-write` + `never`; do not add `danger-full-access`.
- `DeepSeekHarnessSupervisor` owns the chat Web PID tree (or JSON-RPC process) and capture JSON-RPC process, isolated home/session/workspace roots, the Host-generated `syno` / `syno-lab` profiles (production `syno` links `@syno/dsh-plugin` into the profile `node_modules`), and the two SDK overlays (`syno-chat.cordis.yml`, `syno-capture.cordis.yml`). `SYNO_DSH_ROOT` is optional and defaults to the in-tree `vendor/deepseek-harness` submodule; there is no hard-coded personal clone path. Production profile forbids marketplace `dsh plugin add`; `syno-lab` is the only place for `dsh-mnemon`, and its data is not canonical Syno memory. Loopback DSH Web is a privileged same-session surface (`approval: never`), not the control-plane UI. Pitfalls: `docs/OPERATIONS.md`.
- `DeepSeekHarnessSessionBindingStore` persists only Owner/thread/Harness Session metadata. The Harness process owns full conversational context; Syno does not maintain a second active transcript. Feishu chat and DSH Web inject the same chat session. Port 8888 exposes only the explicit control API allowlist (health/readiness, Harness, channels, settings, Bridge and publishing controls); its root and old workbench routes return 404.
- `ChannelConversationHandler` passes natural language to the same model loop. Only `/new` and `/stop` bypass it. Files are quarantined and presented as temporary IDs plus untrusted text; images stay native image blocks. Neither links nor attachments trigger automatic capture. Temporary attachment references are owner/channel/thread scoped, encrypted at rest, and expire after 24 hours.
- `SynoToolBridge` is the static Host adapter at `POST /api/syno/bridge/mcp`. In-process plugins serve knowledge reads; the bridge serves controlled business operations by default. Host-routed calls bind Owner, thread, message, DSH session and isolated attachment references outside model arguments. Direct privileged DSH Web calls use the plugin's DSH-owned human-message identity, not model-provided identity fields. Mechanical browser tools remain capture-only. Writes retain durable effect receipts, argument-sensitive invocation identities and conservative post-write fallback prevention, including replayed writes.
- `business-tools` exposes 25 controlled tools for work overview, temporary attachments, explicit capture, actions, independent memory, knowledge maintenance/changes, publication and structured decisions. Work overview reads actual action records and running jobs separately, without invoking the daily planner. Decisions use exact IDs and version digests; memory promotion additionally requires a later Owner message. The domain operations run through the existing isolated Job transaction and validators. Failed provider-only chat Jobs retain the trusted private-conversation flag for recovery; legacy Jobs without that flag cannot acquire write-tool authority.
- `ToolRegistry.resolve` exposes only schema-validated Syno capabilities; shell, arbitrary files, browser, Git and source editing are never tools.
- `ApprovalAdvisor` is deterministic and reads only the local ingest artifact. `ProviderClient`, `ConversationStore`, `ConversationRouter`, `ContextManager` and `ToolLoopAgent` remain only on legacy local paths until the R6 real-acceptance gate; they are not fallbacks when Harness is unavailable and are not part of the DSH chat contract.
- `IngestService` keeps unapproved source payloads and proposals in rebuildable local state. A controlled Job writes the Artifact, InboxCandidate, IngestProposal and resulting Note into `ops/`/`vault/` in one isolated diff; clear requests do not require routine approval, while ambiguous capture decisions retain their own confirmation boundary.
- `OutputService.progress` owns the suggested → accepted → drafting/practiced → published/dismissed lifecycle and retains the Owner's draft Artifact plus feedback.
- `StateArchive` exports only non-credential local state, records a versioned SHA-256 manifest and restores only into an empty target.
- `SynoCore.execute/snapshot` is the application interface. Callers do not learn storage, index or Git details.
- `AgentHost.receive/inspect/cancel/approve` owns the Job lifecycle but delegates all model loops to an Executor Adapter.
- `Policy.evaluate` is in-process and pure. Model output never changes Profile, approval count or escalation rules.
- `OperationRegistry` binds every writable HTTP/API operation to a canonical intent. Public callers cannot supply Profile, risk, approval or executor decisions.
- Dead OpenCode/Claude/Hermes executors have been deleted. The product Agent runtime is Harness only.
- `ChannelAdapter.start/stop/send/status` has Feishu and Fake adapters.
- `CalendarAdapter` retains Markdown, Lark and Fake implementations for legacy paths. The current chat action tools only record schedules; they do not expose calendar CRUD or proactive reminders.

## Project subsystem (removed)

The Project-aware Knowledge MVP was physically removed on 2026-09-01 under product-slimming decision D6: `projects.*` tools, the `/project <projectRef>` directive, `ProjectService`, retrieval `PROJECT_BOOST` and active `projectRef` propagation no longer exist. Historical `ops/projects/*.md` records and the `projectRef`/`project_refs` fields on old Job/Workflow/Note records are retained read-only; readers tolerate and ignore them. The authoritative history is `docs/project-aware-knowledge-execution-plan.md`.

External integrations are true external dependencies. Their transports are injected, and contract tests use Fake Adapters.

## Transaction boundary

Every repository write runs in a dedicated `syno/job/<job-id>` branch and worktree. After execution, Syno classifies the real Git diff instead of trusting the request label:

1. Explicit, policy-allowed writes execute automatically in an isolated worktree.
2. Duplicate content, multiple valid destinations or insufficient information pause as a `PendingDecision`; risk alone does not recreate an approval gate.
3. Source-root writes and product system control are unconditionally rejected; there is no enabling switch.
4. GitGuard records the candidate commit SHA and diff hash, refuses a changed branch and merges only the validated SHA.
5. Deferred effects such as knowledge publication run only after the validated Markdown merge; their result is reconciled back into Markdown.

Job files and immutable events are the recovery log. Per-job locks serialize state transitions and atomically lease `waiting_provider` retries, while request keys make retried channel messages idempotent.

## Runtime locations

- One repository holds canonical `vault/`, `ops/`, `config/`, `contracts/`, source and docs. Production must leave `SYNO_KNOWLEDGE_ROOT` unset; it is only a rollback compatibility input.
- Rebuildable cache: `.runtime/`.
- Local credentials and durable execution state are under `PATHS.localDataRoot` (`credentials/` and `state/`), resolved from `SYNO_LOCAL_DATA` or the platform default. Windows uses DPAPI; macOS uses a login-Keychain master key plus AES-256-GCM envelopes. Neither belongs in Git.
- All write worktrees (job checkouts of the knowledge repo): `.worktrees/syno-job-<id>`.

Harness conversation bindings expire after 30 days, terminal encrypted payloads after 30 days, and verified terminal recovery journals after 90 days; unfinished Jobs and unknown effects remain for reconciliation. Model outage never switches provider or runtime; local facts remain available to internal services, while model-dependent chat and Jobs require provider recovery.


飞书是当前唯一日常入口（微信通道栈已于 2026-10-16 删除）。用户可见 ACK 只表示消息已收到并开始处理；最终结果默认回到原始渠道。系统不发主动消息，也不在重启后补发历史回复。8888 仅提供白名单控制 API，没有旧工作台或完整审计页面；3088 是需认证的受控会话入口，飞书处理普通对话、写入和歧义决策无需打开浏览器。完整边界见 ADR 0003–0005。

## 知识与记忆 v0.2（已合入，生产发布已启用）

MemoryStore 独立读取 ops/memory，按 Owner、有效状态、范围和触发词筛选，稳定排序后最多五条／3000 字符。受控 Web 与飞书通过同一 Host 的 turn/prepare 上下文接缝注入；旧快照失效，素材不参与删除合并确认。KnowledgeChanges 负责稳定 ID、版本、变更预览与一次性授权，OperationExecutor 执行后在合并前再次校验规范版本。

Source validity 在读取、浏览器、分析前和写入前共用；SourceResources 维护图片摘要与持久引用清单。KnowledgePublisher 通过受控 Job 投影 publish-map，外部效果前后写恢复 journal，使用单写者租约、未知结果对账和远端指纹冲突阻断。FeishuPublisher 只使用经确认的 Host 配置与 SDK 凭据机制。隔离开发验收默认 disabled；生产已于 2026-10-19 经主人授权启用，具体目标和真实验收见 `docs/KNOWLEDGE-FEISHU-P1.md`。

JobStore 的中间状态保存在 fsync 快照与按 Job 分片的恢复 journal。Git 仅记录内容与初始审计、固定 SHA 合并、终态投影；投影在 Git 提交后才标为已验证。
