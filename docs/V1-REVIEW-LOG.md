# V1 code review log

Each round reviewed both repository standards and the accepted Syno execution plan.

## Round 1

The first review found unsafe trust in requested write paths and incomplete executor/channel boundaries. The fixes established precise-path Git staging, deterministic policy routing, safer process invocation, channel restrictions and initial security regression coverage. Result committed as `fix: enforce Syno V1 safety boundaries`.

## Round 2

The second review stress-tested bypasses and crash/concurrency behavior. It identified client-spoofable intent, write paths that did not always use worktrees, approval races, unpinned merges, executor shell edge cases, deferred calendar side effects, scheduler lifetime, Weixin cursor/lock/attachment weaknesses, permissive Markdown parsing, stored XSS and hard-coded local paths.

The remediation introduced the canonical operation registry, all-write worktrees, actual-diff risk promotion, commit/diff pinning, per-job locks and idempotence, Windows-safe executor invocation, delayed Feishu effects, durable scheduling, process-locked Weixin polling, streamed/signature-checked quarantine, strict frontmatter/schema validation, DOM-safe rendering and repository-wide personal-path verification.

## Round 3

Pending final post-remediation review.
