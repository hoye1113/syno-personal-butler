# V1 code review log

Each round reviewed both repository standards and the accepted Syno execution plan.

## Round 1

The first review found unsafe trust in requested write paths and incomplete executor/channel boundaries. The fixes established precise-path Git staging, deterministic policy routing, safer process invocation, channel restrictions and initial security regression coverage. Result committed as `fix: enforce Syno V1 safety boundaries`.

## Round 2

The second review stress-tested bypasses and crash/concurrency behavior. It identified client-spoofable intent, write paths that did not always use worktrees, approval races, unpinned merges, executor shell edge cases, deferred calendar side effects, scheduler lifetime, Weixin cursor/lock/attachment weaknesses, permissive Markdown parsing, stored XSS and hard-coded local paths.

The remediation introduced the canonical operation registry, all-write worktrees, actual-diff risk promotion, commit/diff pinning, per-job locks and idempotence, Windows-safe executor invocation, delayed Feishu effects, durable scheduling, process-locked Weixin polling, streamed/signature-checked quarantine, strict frontmatter/schema validation, DOM-safe rendering and repository-wide personal-path verification.

## Round 3

The third review found no P0 issue, but found release-blocking P1 issues in transaction consistency, crash/concurrency behavior, process cancellation, persisted request privacy, OpenCode Schema fallback and ContentBrief contracts.

Spec findings:

- An external side-effect failure could leave Markdown merged while the Job was reported failed.
- OpenCode fallback did not cover the intended Schema-validation path.
- ContentBrief output did not fully satisfy or validate its contract.
- PDF intake retained a binary artifact without useful extracted content and could expose an absolute local path.
- Windows Task Scheduler could terminate the worker after seven days.
- Deterministic complex-to-Claude routing, Weixin task routing, ACP and MemoryProposal promotion were incomplete.

Standards findings:

- The server and worker lacked a shared cross-process Git/Job lock.
- Cancellation, rejection or a crash could leave worktrees behind.
- Windows cancellation did not reliably terminate the whole process tree.
- Raw request payloads could be committed and expose tokens or local paths.
- Startup recovery and durable external-side-effect retry semantics were incomplete.
- `syno-code` could expose more host-code execution capability than required.

Remediation is in progress. The last green release candidate remains `a75502c` (66/66 tests). Branch `codex/round3-remediation` contains checkpoint `5540bd8` and most recently passed 53/66 tests, so Round 3 is not closed. Continue from `docs/HANDOFF-EXECUTION-PLAN.md` and do not tag V1 until all P1 findings are closed and the full suite is green.

> **Closure (2026-07-24):** The Round 3 *code-review* remediation above is complete — all listed P1 findings were resolved and the full suite went green (see `FINAL-ACCEPTANCE.md`, baseline `a4ec17d`; also `KNOWN-LIMITATIONS.md` confirms `a4ec17d` final regression). The "in progress / 53/66" status above is the **07-17 checkpoint record**, superseded by the final green result. This closes the V1 *code review*; the broader product Goal (P5 backup / real-channel / browser acceptance) remains open per `docs/OUTSTANDING-WORK.md`.
