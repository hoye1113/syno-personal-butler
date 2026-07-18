# Hermes CognitiveRuntime Spike

## Decision

The pinned Hermes `0.18.2` candidate is **not adopted**. `NativeCognitiveRuntime` remains the single enabled implementation. There is no automatic fallback and no parallel runtime.

## Pinned provenance

- Repository: `nousresearch/hermes-agent`
- Commit: `0f102fa4dc04b7dfdab048169aaaa640d09d7523`
- Version: `0.18.2`
- License: MIT
- Source handling: read-only local checkout; the probe uses an isolated `HERMES_HOME`, fake credentials and a local Fake OpenAI server.

## Reproducible probe

Run `pnpm probe:hermes -- --source <pinned-hermes-root> --python <python-3.13> --deps <isolated-deps>`.

The credential-free probe verifies:

- `enabled_toolsets=[]` exposes zero tools;
- the Syno probe toolset exposes exactly one proxy tool;
- two Chat Completions calls keep the same fixed model and finish a native tool loop;
- fallback, memory, context files, Gateway and CLI are disabled;
- no real token, vault or `%LOCALAPPDATA%\Syno` state is used.

The pinned Hermes release streams and persists sessions by default, and builds a host-specific system prompt. Syno's contract currently depends on the upstream private `_disable_streaming`, `_persist_disabled`, `_cached_system_prompt` and `_dump_api_request_debug` hooks. These avoid a fork while preserving the Syno seam, but they are an explicit pinned-version coupling: any commit change invalidates the result and requires a complete new audit.

## Production sidecar result

The production-shaped JSONL sidecar passes the capability, isolation and recovery portions of the credential-free gate:

- stdout is protocol-only and stderr is bounded and token-redacted;
- the child inherits only a minimal environment allowlist;
- startup verifies the exact upstream commit before importing Hermes;
- Provider URL, token and fixed model travel in memory over stdin and are not written to Hermes config;
- Hermes session persistence and request debug dumps are disabled; Syno remains the only conversation and failed-payload fact source;
- the upstream default prompt is replaced with a minimal Syno prompt, so local paths and nonexistent Terminal/Skill controls are not sent to the Provider;
- the isolated config stores only context length and disables hidden API retries;
- unknown tool names terminate the sidecar before Node invokes any callback;
- invalid protocol JSON, crashes and timeouts fail closed and the next request starts a clean process;
- cancellation terminates the single-run sidecar process and returns non-retryable `AGENT_CANCELED`;
- Provider 429 and malformed responses remain retryable failures rather than successful assistant text.

It fails the Provider-surface hard gate. Before every Chat Completions request, the pinned upstream probes some combination of `/api/v1/models`, `/api/tags`, `/v1/props`, `/props`, `/version`, `/v1/models` and `/models`. Supplying an explicit context length does not suppress these requests. Syno's fixed Provider contract allows only `POST {baseUrl}/chat/completions`; a 404 response does not make an attempted request compliant.

Run `pnpm probe:hermes-sidecar -- --source <pinned-hermes-root> --python <python-3.13> --deps <isolated-deps>` to reproduce the result. The probe now records method and path, sets `providerSurfaceSafe: false`, and exits non-zero when any extra endpoint is attempted.

## Adoption decision

- The Hermes hard gate failed before real credentials were needed.
- Syno does not send the owner's token-cloud credential to this Hermes version and does not perform a live A/B comparison that would violate the Provider contract.
- Fixing the behavior would require another undocumented upstream hook, a broad network monkey-patch, a filtering proxy maintained solely for Hermes, or an upstream/fork change. That exceeds the accepted no-security-fork boundary.
- The native `ToolLoopAgent` therefore remains the only active `CognitiveRuntime`. Hermes code remains read-only and inactive; only already-validated design ideas may be carried over.

The remaining live Provider acceptance is native-only. First save Base URL, Token, fixed Model ID and context length through Syno Settings so Windows DPAPI owns the secret. Then run:

```powershell
pnpm probe:provider-real -- --confirm-live --trials 5
```

The command rejects Token/API-key arguments and any Base URL other than `https://server.flowyaipc.cn/claw/v1`. It uses one synthetic read-only tool and a temporary conversation store. The report contains model metadata, success/latency, tool-call counts and sanitized error codes only; it never prints response content or credentials. The live gate passes only when every requested trial completes the tool loop on the fixed model.

All slash-prefixed runtime control commands are rejected before Hermes, and invented tool names are rejected at the process seam. Hermes-specific regression verifies that `jobs.submit` creates an `awaiting_approval` Job while a direct write remains `TOOL_APPROVAL_REQUIRED`; the shared full suite continues to cover knowledge-loop and GitGuard semantics. The real Provider gate is intentionally not bypassed with another endpoint or model.

Hermes must not be selected in runtime configuration for this pinned version.

## Current verification snapshot

- main worktree after the decision patch: Node `112/112`, vault `57/57`, repository verification passed;
- fresh clone at commit `f015921`: Node `112/112`, vault `57/57`, repository verification passed;
- browser acceptance is unchanged from the prior desktop/mobile Playwright pass because this phase has no Web changes;
- no Push was performed and the native runtime remains active.
