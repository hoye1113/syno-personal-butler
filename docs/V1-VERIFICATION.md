# V1 verification

Verification date: 2026-07-17 (Asia/Shanghai)

## Automated checks

- `node --test apps/syno/tests/*.test.mjs tests/*.test.mjs`: 66/66 Node tests passed.
- `node scripts/verify-repository.mjs`: repository structure, JSON parsing, credential patterns, personal absolute paths and removed macOS implementation checks passed.
- `git diff --check`: passed.
- Real OpenCode CLI smoke: `opencode/mimo-v2.5-free` returned valid structured JSON through the production adapter command shape; `--auto` was not used.
- Executor, ChannelAdapter and CalendarAdapter seams include Fake contract coverage. Windows `.cmd` argument handling and Claude isolation flags have regression tests.

The suite covers Policy/operation spoofing, approval promotion from real diffs, pinned-branch merging, precise staging, concurrent cancellation and idempotence, schema/frontmatter validation, report scheduling and recovery, deferred Feishu effects, Weixin locking/cursor/attachment handling, SSRF and stored-XSS boundaries.

## Browser check

Local Chrome was driven headlessly against the running Syno server:

- Home rendered at 1440×1100 with the original Syno mascot.
- Knowledge search returned results; a note opened in the built-in reader.
- “编辑原文” remained visually secondary and opened an editor that explicitly states diff + two approvals.
- Task/approval, notification/Weixin and chat panes opened successfully.
- No browser console or page errors were observed.

## External capability status

- Feishu calendar behavior is contract/integration tested with a Windows-safe Fake CLI. Live use requires the user's existing Feishu configuration.
- Weixin QR acquisition succeeded. Android scan confirmation, Bot identity and a real private-message round trip remain a device/account acceptance step and do not block core V1; see `WEIXIN-ANDROID-PROBE.md`.
- Claude CLI flags were verified against the installed CLI and tested at the adapter boundary. No paid live model call was made.

## Repository boundary

- Afu and the source vault were imported as snapshots; their original repositories were not modified.
- No Git history was imported, no secrets or runtime state are tracked, and no remote Push is performed automatically.
