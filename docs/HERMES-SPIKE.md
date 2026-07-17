# Hermes CognitiveRuntime Spike

## Decision

Hermes is a viable **candidate cognitive kernel**, not an active Syno runtime. Syno keeps `NativeCognitiveRuntime` as the single enabled implementation until every hard gate passes. There is no automatic fallback and no parallel runtime.

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

The production-shaped JSONL sidecar now passes the credential-free gate:

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

Run `pnpm probe:hermes-sidecar -- --source <pinned-hermes-root> --python <python-3.13> --deps <isolated-deps>` to reproduce the full Fake Provider test.

## Remaining adoption gates

- real token-cloud fixed-model probe without credential persistence in Hermes;
- full knowledge-loop, approval and GitGuard regressions at or above the native baseline.

All slash-prefixed runtime control commands are rejected before Hermes, and invented tool names are rejected at the process seam. The real Provider gate is intentionally not bypassed with another endpoint or model.

Until all of these pass, Hermes must not be selected in runtime configuration.
