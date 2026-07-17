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

The pinned Hermes release streams by default. Syno's non-streaming contract currently requires setting the upstream private `_disable_streaming` flag. This is an explicit pinned-version coupling: any commit change invalidates the result and requires a new audit.

## Remaining adoption gates

- production JSON protocol and subprocess boundary, including stdout isolation and log redaction;
- cancel, timeout, crash, restart and invalid JSON recovery;
- malicious tool names, prompt injection and configuration/control-command tests;
- real token-cloud fixed-model probe without credential persistence in Hermes;
- full knowledge-loop, approval and GitGuard regressions at or above the native baseline.

Until all of these pass, Hermes must not be selected in runtime configuration.
